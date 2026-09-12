import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";
import type { FieldEvidenceDescriptor, LayoutTextLine } from "./adaptiveResumeExtraction.js";
import { classifyEducationRecord } from "../../../src/domain/educationClassification.js";
import { stableReviewEntityId } from "./reviewFieldLifecycle.js";

// Evaluation-only: no import from application ingestion or publication is permitted.
export const LINKEDIN_EVALUATION_VERSION = "linkedin-pdf-evaluation-1.0.2";
type SourceLine = LayoutTextLine & { pageNumber: number };
export interface EvaluationLink {
  pageNumber: number;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LinkedInEvaluation {
  version: typeof LINKEDIN_EVALUATION_VERSION;
  recognized: boolean;
  draft: StructuredDraft;
  fieldEvidence: FieldEvidenceDescriptor[];
  links: EvaluationLink[];
  unassigned: SourceLine[];
}

const SECTION = /^(?:resumo|summary|experience|experi[eê]ncia(?: profissional)?|education|forma[cç][aã]o acad[eê]mica|forma[cç][aã]o|top skills|principais compet[eê]ncias|languages|idiomas|certifications|certifica[cç][oõ]es|contact|contato|contatar|honors-awards|honors & awards|publications|publica[cç][oõ]es)$/i;
const MAIN_SECTION = /^(?:resumo|summary|experience|experi[eê]ncia(?: profissional)?|education|forma[cç][aã]o(?: acad[eê]mica)?)$/i;
const EXPERIENCE_SECTION = /^(?:experience|experi[eê]ncia(?: profissional)?)$/i;
const EDUCATION_SECTION = /^(?:education|forma[cç][aã]o(?: acad[eê]mica)?)$/i;
const DATE = "(?:(?:[\\p{L}.]+)(?: de)? )?(?:19|20)\\d{2}";
const PERIOD = new RegExp(`(?:${DATE})\\s*[-–—]\\s*(?:${DATE}|present|atual|presente|current)`, "iu");
const FOOTER = /^(?:page|p[aá]gina)\s+\d+\s+(?:of|de)\s+\d+$/i;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function linkedInMainColumn(lines: LayoutTextLine[]): number | null {
  const headings = lines.filter((line) => MAIN_SECTION.test(clean(line.text)));
  if (!headings.length) return null;
  const left = Math.min(...headings.map((line) => line.x));
  return left > 0.22 && left < 0.6 ? left : null;
}

export function evaluateLinkedInPdf(pages: ExtractedPage[], links: EvaluationLink[] = []): LinkedInEvaluation {
  const lines: SourceLine[] = pages.flatMap((page) => (page.layoutLines ?? []).map((line) => ({ ...line, text: clean(line.text), pageNumber: page.pageNumber })))
    .filter((line) => line.text && !(line.y > 0.93 && FOOTER.test(line.text)))
    .sort((a, b) => a.pageNumber - b.pageNumber || a.y - b.y || a.x - b.x);
  const draft: StructuredDraft = {
    identity: { fullName: null }, contact: { city: null, state: null, email: null, phone: null, linkedin: null },
    professionalTitle: null, areasOfExpertise: [], professionalObjective: null, summary: null, keyResults: [],
    experiences: [], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const result: LinkedInEvaluation = { version: LINKEDIN_EVALUATION_VERSION, recognized: false, draft, fieldEvidence: [], links: [...links], unassigned: [] };
  const mainX = linkedInMainColumn(lines);
  const sidebarHeadings = lines.filter((line) => SECTION.test(line.text) && !MAIN_SECTION.test(line.text));
  if (mainX === null || !sidebarHeadings.some((line) => line.x < mainX - 0.05)) {
    draft.uncertainties.push("Formato LinkedIn não reconhecido com segurança; preservar revisão manual da fonte.");
    result.unassigned = lines;
    return result;
  }
  result.recognized = true;
  const main = lines.filter((line) => line.x >= mainX - 0.025);
  const side = lines.filter((line) => line.x < mainX - 0.025);
  const used = new Set<SourceLine>();
  function evidence(path: string, sources: SourceLine[]) {
    for (const line of sources) {
      used.add(line);
      result.fieldEvidence.push({ fieldPath: path, pageNumber: line.pageNumber, text: line.text, x: line.x, y: line.y, width: line.width, height: line.height, method: "pdfjs-layout-v1" });
    }
  }
  function value(path: string, sources: SourceLine[], separator = " "): string | null {
    if (!sources.length) return null;
    evidence(path, sources);
    return sources.map((line) => line.text).join(separator);
  }
  const firstSection = main.findIndex((line) => MAIN_SECTION.test(line.text));
  const intro = firstSection >= 0 ? main.slice(0, firstSection) : [];
  if (intro.length) {
    const maximum = Math.max(...intro.map((line) => line.fontSize));
    const names = intro.filter((line) => line.fontSize === maximum);
    if (names.length === 1 && maximum > Math.min(...intro.map((line) => line.fontSize)) * 1.3) {
      draft.identity.fullName = value("identity.fullName", names);
      const rest = intro.slice(intro.indexOf(names[0]!) + 1);
      const location = rest.at(-1);
      const components = location?.text.split(",").map((part) => part.trim()) ?? [];
      if (location && components.length === 3 && components.every(Boolean) && /^(?:Brasil|Brazil|Portugal|United States|Estados Unidos|United Kingdom|Reino Unido|Canada|Canadá)$/i.test(components[2]!)) {
        draft.contact.city = components[0]!; draft.contact.state = components[1]!;
        evidence("contact.city", [location]); evidence("contact.state", [location]);
        rest.pop();
      } else if (location) {
        draft.uncertainties.push("Localização do cabeçalho requer classificação humana; texto preservado.");
        rest.pop();
      }
      draft.professionalTitle = value("professionalTitle", rest);
      if (draft.professionalTitle && !/[\p{L}\p{N}]/u.test(draft.professionalTitle)) {
        draft.professionalTitle = null;
        result.fieldEvidence = result.fieldEvidence.filter((item) => item.fieldPath !== "professionalTitle");
        draft.notIdentified.push("título profissional");
      }
    } else draft.uncertainties.push("Nome e título sem separação tipográfica inequívoca.");
  }

  for (const section of sections(main)) {
    used.add(section.heading);
    const body = section.lines;
    if (/^(resumo|summary)$/i.test(section.heading.text)) draft.summary = value("summary", body);
    else if (EXPERIENCE_SECTION.test(section.heading.text)) {
      // Dates anchor records. Distinct header typography is required for company/role attribution.
      let company: SourceLine[] = [];
      let groupedCompany = false;
      const records: Array<{ start: number; periodIndex: number; role: SourceLine[]; company: SourceLine[] }> = [];
      for (let index = 0; index < body.length; index += 1) {
        const periodLine = body[index]!;
        if (!PERIOD.test(periodLine.text)) continue;
        let start = index;
        while (start > 0 && body[start - 1]!.fontSize > periodLine.fontSize + 0.25) start -= 1;
        const header = body.slice(start, index);
        if (!header.length) {
          draft.uncertainties.push(`Período sem cargo inequívoco na página ${periodLine.pageNumber}.`);
          continue;
        }
        const roleSize = header.at(-1)!.fontSize;
        const organization = header.filter((line) => line.fontSize > roleSize + 0.25);
        const role = header.filter((line) => Math.abs(line.fontSize - roleSize) < 0.2);
        if (organization.length) { company = organization; groupedCompany = false; }
        else {
          // LinkedIn grouped employment uses company -> aggregate duration -> role -> period.
          let cursor = start - 1;
          if (cursor >= 0 && /^\d+\s+(?:anos?|years?|meses?|months?)\b/i.test(body[cursor]!.text)) {
            cursor -= 1;
            const group: SourceLine[] = [];
            while (cursor >= 0 && body[cursor]!.fontSize > roleSize + 0.25) group.unshift(body[cursor--]!);
            if (group.length) { company = group; groupedCompany = true; start = cursor + 1; }
            else { company = []; groupedCompany = false; }
          } else if (!groupedCompany) company = [];
        }
        if (!company.length || !role.length) {
          draft.uncertainties.push(`Associação empresa/cargo pendente na página ${periodLine.pageNumber}.`);
          continue;
        }
        records.push({ start, periodIndex: index, role, company: [...company] });
      }
      records.forEach((record, index) => {
        const role = record.role.map((line) => line.text).join(" ");
        const organization = record.company.map((line) => line.text).join(" ");
        const periodLine = body[record.periodIndex]!;
        const period = periodLine.text.match(PERIOD)?.[0] ?? null;
        const id = stableReviewEntityId("experience", `${periodLine.pageNumber}:${periodLine.y}:${role}:${organization}`);
        const prefix = `experiences.${id}`;
        const description = body.slice(record.periodIndex + 1, records[index + 1]?.start ?? body.length);
        // Unknown larger headers are not silently attached as description to a prior record.
        const boundary = description.findIndex((line) => line.fontSize > periodLine.fontSize + 0.25);
        const safeDescription = boundary < 0 ? description : description.slice(0, boundary);
        draft.experiences.push({ id, source: "extracted", role, organization, period, description: value(`${prefix}.description`, safeDescription, "\n"), evidenceText: [...record.company, ...record.role, periodLine].map((line) => line.text).join("\n"), page: record.role[0]!.pageNumber });
        evidence(`${prefix}.role`, record.role); evidence(`${prefix}.organization`, record.company); evidence(`${prefix}.period`, [periodLine]);
      });
    } else if (EDUCATION_SECTION.test(section.heading.text) && body.length) {
      const headerSize = Math.max(...body.map((line) => line.fontSize));
      const bodySize = Math.min(...body.map((line) => line.fontSize));
      if (headerSize - bodySize < 0.5) { draft.uncertainties.push("Formação sem separação entre instituição e curso."); continue; }
      const records: SourceLine[][] = [];
      for (const line of body) {
        const last = records.at(-1);
        if (line.fontSize >= headerSize - 0.2 && (!last || last.some((item) => item.fontSize < headerSize - 0.2))) records.push([line]);
        else if (last) last.push(line);
      }
      records.forEach((record) => {
        const institutionLines = record.filter((line) => line.fontSize >= headerSize - 0.2);
        const courseLines = record.filter((line) => line.fontSize < headerSize - 0.2);
        const institution = institutionLines.map((line) => line.text).join(" ");
        const rawCourse = courseLines.map((line) => line.text).join(" ");
        const period = rawCourse.match(PERIOD)?.[0] ?? null;
        const course = clean(rawCourse.replace(/\s*[·•]\s*\([^)]*\)\s*$/, "")) || null;
        const anchor = institutionLines[0]!;
        const id = stableReviewEntityId("education", `${anchor.pageNumber}:${anchor.y}:${institution}`);
        const classified = classifyEducationRecord({ course, institution, originalText: course ? rawCourse : "", period });
        // The shared classifier falls back to originalText when course is null. A period-only
        // original is still useful provenance, but must never become the course itself.
        draft.education.push({ ...classified, originalText: rawCourse, id, source: "extracted", institution, period, description: null, evidenceText: record.map((line) => line.text).join("\n"), page: anchor.pageNumber });
        evidence(`education.${id}.institution`, institutionLines);
        if (course) evidence(`education.${id}.course`, courseLines);
        if (period) evidence(`education.${id}.period`, courseLines.filter((line) => PERIOD.test(line.text)));
        if (!course) draft.uncertainties.push(`Curso não identificado na página ${anchor.pageNumber}.`);
      });
    }
  }

  for (const section of sections(side)) {
    used.add(section.heading);
    const field = /^(top skills|principais compet[eê]ncias)$/i.test(section.heading.text) ? "competencies"
      : /^(languages|idiomas)$/i.test(section.heading.text) ? "languages"
        : /^(certifications|certifica[cç][oõ]es)$/i.test(section.heading.text) ? "certifications" : null;
    if (field) {
      for (const group of listGroups(section.lines)) {
        const index = draft[field].length;
        const entry = value(`${field}.${index}`, group);
        if (entry) draft[field].push(entry);
      }
    } else if (/^(contact|contato|contatar)$/i.test(section.heading.text)) {
      const emails = section.lines.flatMap((line, index) => {
        if (!line.text.includes("@")) return [];
        const group = [line];
        for (const next of section.lines.slice(index + 1, index + 4)) {
          const previous = group.at(-1)!;
          if (next.pageNumber !== previous.pageNumber || Math.abs(next.x - previous.x) > 0.02 || next.y - previous.y > Math.max(next.height, previous.height) * 1.3 || !/^[a-z0-9.-]+$/i.test(next.text) || /^(?:www\.|https?)/i.test(next.text)) break;
          group.push(next);
        }
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(group.map((part) => part.text).join("")) ? [group] : [];
      });
      if (emails.length === 1) {
        draft.contact.email = emails[0]!.map((line) => line.text).join("");
        evidence("contact.email", emails[0]!);
      }
      const phones = section.lines.filter((line) => /^\+?[\d\s().-]{8,}(?:\s*\((?:mobile|home|work|celular|residencial|comercial)\))?$/i.test(line.text));
      if (phones.length === 1) {
        draft.contact.phone = phones[0]!.text.replace(/\s*\((?:mobile|home|work|celular|residencial|comercial)\)$/i, "");
        evidence("contact.phone", phones);
      }
      if (emails.length > 1 || phones.length > 1) draft.uncertainties.push("Contatos múltiplos exigem seleção humana.");
      const profileLinks = links.filter((link) => {
        try { const url = new URL(link.url); return url.protocol === "https:" && /^(www\.)?linkedin\.com$/i.test(url.hostname) && /^\/in\/[^/]+\/?$/.test(url.pathname) && section.lines.some((line) => line.pageNumber === link.pageNumber && Math.abs(line.y - link.y) < line.height * 2 && Math.abs(line.x - link.x) < 0.05); } catch { return false; }
      });
      const urls = [...new Set(profileLinks.map((link) => link.url))];
      if (urls.length === 1) {
        draft.contact.linkedin = urls[0]!;
        const link = profileLinks[0]!;
        evidence("contact.linkedin", section.lines.filter((line) => line.pageNumber === link.pageNumber && Math.abs(line.y - link.y) < line.height * 2));
      }
    }
  }
  result.unassigned = lines.filter((line) => !used.has(line));
  if (result.unassigned.length) draft.uncertainties.push(`${result.unassigned.length} linhas preservadas sem associação segura; revisar fonte.`);
  for (const [field, label] of [["experiences", "experiências estruturáveis"], ["education", "formação acadêmica"], ["competencies", "competências explícitas"], ["languages", "idiomas"], ["certifications", "certificações"]] as const) {
    if (!draft[field].length) draft.notIdentified.push(label);
  }
  if (!draft.summary) draft.notIdentified.push("resumo profissional");
  return result;
}

function sections(lines: SourceLine[]): Array<{ heading: SourceLine; lines: SourceLine[] }> {
  const result: Array<{ heading: SourceLine; lines: SourceLine[] }> = [];
  for (const line of lines) {
    if (SECTION.test(line.text)) result.push({ heading: line, lines: [] });
    else result.at(-1)?.lines.push(line);
  }
  return result;
}

function listGroups(lines: SourceLine[]): SourceLine[][] {
  const groups: SourceLine[][] = [];
  for (const line of lines) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    // Tight leading indicates wrapped text, not a separate competency/certificate.
    if (previous && previous.pageNumber === line.pageNumber && Math.abs(previous.x - line.x) < 0.02 && line.y - previous.y <= Math.max(previous.height, line.height) * 1.3) group!.push(line);
    else groups.push([line]);
  }
  return groups;
}
