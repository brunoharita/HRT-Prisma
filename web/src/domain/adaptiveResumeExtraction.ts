import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";

export const ADAPTIVE_EXTRACTION_CONTRACT_VERSION = "1.0.0";
export const ADAPTIVE_STRUCTURING_VERSION = "prisma-layout-adaptive-v1";

export interface LayoutTextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  emphasis: "regular" | "strong";
}

export interface FieldEvidenceDescriptor {
  fieldPath: string;
  pageNumber: number;
  text: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  method: "pdfjs-layout-v1" | "text-line-v1";
}

export interface AdaptiveExtractionResult {
  draft: StructuredDraft;
  fieldEvidence: FieldEvidenceDescriptor[];
  pattern: {
    experienceHeader: "role-period-company-next-line" | "role-company-period-same-line" | "mixed" | "not-observed";
    repeatedExperienceBlocks: number;
  };
}

type CandidateLine = LayoutTextLine & { pageNumber: number; sequence: number };

const ROLE_TERMS = /(analista|arquiteto|assistente|chief|consultor|coordenador|developer|desenvolvedor|diretor|engineer|engenheiro|especialista|executivo|founder|fundador|gerente|head|líder|lider|manager|presidente|recruiter|supervisor|technician|técnico|tecnico|vice[- ]presidente|coo|ceo|cto|cfo|cio)/i;
const SECTION_HEADING = /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience|forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias|skills|idiomas|languages|certifica[cç][oõ]es|certifications|resumo|summary|perfil)/i;
const NEXT_SECTION = /^(forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias|skills|idiomas|languages|certifica[cç][oõ]es|certifications|projetos|projects|cursos)/i;
const PERIOD_TOKEN = /\b(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4}))\b|\b(?:19|20)\d{2}\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:19|20)\d{2})\b/i;

export function buildAdaptiveExtraction(pages: ExtractedPage[]): AdaptiveExtractionResult {
  const lines = candidateLines(pages);
  const experienceLines = sliceExperienceSection(lines);
  const experiences: StructuredDraft["experiences"] = [];
  const fieldEvidence: FieldEvidenceDescriptor[] = [];
  let nextLineCompanyCount = 0;
  let sameLineCount = 0;

  for (let index = 0; index < experienceLines.length && experiences.length < 16; index += 1) {
    const header = experienceLines[index]!;
    if (!ROLE_TERMS.test(header.text) || isBullet(header.text)) continue;
    const period = extractPeriod(header.text);
    const withoutPeriod = period ? removeExact(header.text, period) : header.text;
    const sameLine = splitRoleAndOrganization(withoutPeriod);
    let role = sameLine?.role ?? cleanHeaderRole(withoutPeriod);
    let organization = sameLine?.organization ?? "";
    let organizationLine: CandidateLine | null = null;

    if (!organization || !isPlausibleOrganization(organization)) {
      organization = "";
      const candidate = nextMeaningfulLine(experienceLines, index + 1);
      if (candidate && isPlausibleOrganization(candidate.text) && !ROLE_TERMS.test(candidate.text)) {
        organization = candidate.text.trim();
        organizationLine = candidate;
        nextLineCompanyCount += 1;
      }
    } else {
      sameLineCount += 1;
    }

    if (!role || !organization) continue;
    const descriptionLines: CandidateLine[] = [];
    let cursor = organizationLine ? experienceLines.indexOf(organizationLine) + 1 : index + 1;
    while (cursor < experienceLines.length) {
      const candidate = experienceLines[cursor]!;
      if (candidate !== organizationLine && ROLE_TERMS.test(candidate.text) && !isBullet(candidate.text)) break;
      if (candidate !== organizationLine && !SECTION_HEADING.test(candidate.text)) descriptionLines.push(candidate);
      cursor += 1;
    }
    const description = descriptionLines.map((line) => line.text.replace(/^[•·▪◦*-]\s*/, "").trim()).filter(Boolean).join("\n") || null;
    const itemIndex = experiences.length;
    experiences.push({ role, organization, period, description, evidenceText: [header.text, organizationLine?.text].filter(Boolean).join("\n"), page: header.pageNumber });
    fieldEvidence.push(toEvidence(`experiences.${itemIndex}.role`, header, role));
    fieldEvidence.push(toEvidence(`experiences.${itemIndex}.organization`, organizationLine ?? header, organization));
    if (period) fieldEvidence.push(toEvidence(`experiences.${itemIndex}.period`, header, period));
    if (descriptionLines.length) fieldEvidence.push(toCombinedEvidence(`experiences.${itemIndex}.description`, descriptionLines));
    if (organizationLine) index = Math.max(index, experienceLines.indexOf(organizationLine));
  }

  const fullText = pages.map((page) => page.text).join("\n");
  const educationLines = lines.filter((entry) => /(universidade|faculdade|bacharel|tecn[oó]logo|mba|p[oó]s-gradua[cç][aã]o|university|college)/i.test(entry.text));
  const education = educationLines.slice(0, 8).map((entry) => ({ course: entry.text, institution: "Não identificada", period: extractPeriod(entry.text), evidenceText: entry.text, page: entry.pageNumber }));
  const competencyCatalog = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "Power BI", "SAP", "Scrum", "Kanban", "Docker", "AWS", "Azure", "Supabase"];
  const competencies = competencyCatalog.filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(fullText));
  const languages = ["Português", "Inglês", "Espanhol", "English", "Spanish"].filter((item) => new RegExp(`\\b${item}\\b`, "i").test(fullText));
  const draft: StructuredDraft = {
    summary: experiences[0] ? `${experiences[0].role} com experiência profissional documentada em ${experiences[0].organization}.` : null,
    experiences,
    education,
    certifications: lines.filter((entry) => /(certifica[cç][aã]o|certified|certificate)/i.test(entry.text)).slice(0, 8).map((entry) => entry.text),
    languages,
    competencies,
    uncertainties: [],
    notIdentified: [
      ...(experiences.length ? [] : ["experiências estruturáveis"]),
      ...(education.length ? [] : ["formação acadêmica"]),
      ...(competencies.length ? [] : ["competências explícitas"]),
      ...(languages.length ? [] : ["idiomas"]),
    ],
  };
  return {
    draft,
    fieldEvidence,
    pattern: {
      experienceHeader: nextLineCompanyCount && sameLineCount ? "mixed" : nextLineCompanyCount ? "role-period-company-next-line" : sameLineCount ? "role-company-period-same-line" : "not-observed",
      repeatedExperienceBlocks: experiences.length,
    },
  };
}

export function attachFieldEvidence(pages: ExtractedPage[], descriptors: FieldEvidenceDescriptor[]): ExtractedPage[] {
  return pages.map((page) => ({ ...page, fieldEvidence: descriptors.filter((item) => item.pageNumber === page.pageNumber) }));
}

export function proposeSiblingFieldCorrections(input: {
  draft: StructuredDraft;
  sourceIndex: number;
  field: "role" | "organization" | "period";
  extracted: StructuredDraft;
}): Array<{ index: number; fieldPath: string; currentValue: string | null; proposedValue: string | null }> {
  const sourceBefore = input.extracted.experiences[input.sourceIndex];
  const sourceAfter = input.draft.experiences[input.sourceIndex];
  if (!sourceBefore || !sourceAfter || sourceBefore[input.field] === sourceAfter[input.field]) return [];
  return input.draft.experiences.flatMap((experience, index) => {
    if (index === input.sourceIndex) return [];
    const extracted = input.extracted.experiences[index];
    if (!extracted) return [];
    const proposedValue = reinterpretSiblingField(input.field, extracted);
    if (!proposedValue || proposedValue === experience[input.field]) return [];
    return [{ index, fieldPath: `experiences.${index}.${input.field}`, currentValue: experience[input.field] ?? null, proposedValue }];
  });
}

function reinterpretSiblingField(field: "role" | "organization" | "period", experience: StructuredDraft["experiences"][number]): string | null {
  if (field === "period") return extractPeriod(`${experience.role} ${experience.organization} ${experience.period ?? ""}`);
  if (field === "organization") {
    const period = extractPeriod(experience.organization);
    const candidate = period ? removeExact(experience.organization, period) : experience.organization;
    return isPlausibleOrganization(candidate) ? candidate.trim() : null;
  }
  return experience.role.trim() || null;
}

function candidateLines(pages: ExtractedPage[]): CandidateLine[] {
  let sequence = 0;
  return pages.flatMap((page) => {
    if (page.layoutLines?.length) return page.layoutLines.map((line) => ({ ...line, pageNumber: page.pageNumber, sequence: sequence++ }));
    return page.text.split(/\r?\n|\s{2,}/).map((text, lineIndex) => ({ text: text.trim(), x: 0, y: Math.min(0.999, lineIndex / 100), width: 1, height: 0.012, fontSize: 0, emphasis: "regular" as const, pageNumber: page.pageNumber, sequence: sequence++ }));
  }).filter((line) => line.text.length > 1);
}

function sliceExperienceSection(lines: CandidateLine[]): CandidateLine[] {
  const start = lines.findIndex((line) => /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience)$/i.test(line.text.trim()));
  if (start < 0) return lines;
  const after = lines.slice(start + 1);
  const end = after.findIndex((line) => NEXT_SECTION.test(line.text.trim()));
  return end < 0 ? after : after.slice(0, end);
}

function extractPeriod(value: string): string | null {
  return PERIOD_TOKEN.exec(value)?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function splitRoleAndOrganization(value: string): { role: string; organization: string } | null {
  const delimiters = [" at ", " em ", " @ "];
  for (const delimiter of delimiters) {
    const index = value.toLowerCase().indexOf(delimiter);
    if (index > 2) return { role: value.slice(0, index).trim(), organization: value.slice(index + delimiter.length).trim() };
  }
  const parts = value.split(/\s+[|]\s+|\s+[-–]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && ROLE_TERMS.test(parts[0]!) && isPlausibleOrganization(parts.at(-1)!)) return { role: parts[0]!, organization: parts.at(-1)! };
  return null;
}

function cleanHeaderRole(value: string): string {
  return value.split(/\s+[|]\s+/)[0]?.trim().replace(/[|,;:-]+$/, "").trim() ?? "";
}

function isPlausibleOrganization(value: string): boolean {
  const candidate = value.trim();
  if (candidate.length < 2 || candidate.length > 100 || PERIOD_TOKEN.test(candidate) || isBullet(candidate) || SECTION_HEADING.test(candidate)) return false;
  if (/\b(transforma[cç][aã]o|tecnologia|produtos digitais|opera[cç][aã]o|atividades|respons[aá]vel|atua[cç][aã]o|gest[aã]o)\b/i.test(candidate) && !/\b(solutions?|engenharia|consultoria|sistemas?|ltda|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade)\b/i.test(candidate)) return false;
  return /^[\p{L}\p{N}][\p{L}\p{N}&.'() /+_-]+$/u.test(candidate);
}

function nextMeaningfulLine(lines: CandidateLine[], start: number): CandidateLine | null {
  for (let index = start; index < Math.min(lines.length, start + 3); index += 1) {
    const line = lines[index]!;
    if (!isBullet(line.text) && !SECTION_HEADING.test(line.text)) return line;
  }
  return null;
}

function isBullet(value: string): boolean { return /^[•·▪◦*-]\s+/.test(value.trim()); }
function removeExact(value: string, token: string): string { return value.replace(token, " ").replace(/\s+/g, " ").trim().replace(/[|,;:-]+$/, "").trim(); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function toEvidence(fieldPath: string, line: CandidateLine, text: string): FieldEvidenceDescriptor {
  const spatial = line.fontSize > 0;
  return { fieldPath, pageNumber: line.pageNumber, text, x: spatial ? line.x : null, y: spatial ? line.y : null, width: spatial ? line.width : null, height: spatial ? line.height : null, method: spatial ? "pdfjs-layout-v1" : "text-line-v1" };
}

function toCombinedEvidence(fieldPath: string, lines: CandidateLine[]): FieldEvidenceDescriptor {
  const pageLines = lines.filter((line) => line.pageNumber === lines[0]!.pageNumber);
  const left = Math.min(...pageLines.map((line) => line.x));
  const top = Math.min(...pageLines.map((line) => line.y));
  const right = Math.max(...pageLines.map((line) => line.x + line.width));
  const bottom = Math.max(...pageLines.map((line) => line.y + line.height));
  const spatial = pageLines[0]!.fontSize > 0;
  return { fieldPath, pageNumber: pageLines[0]!.pageNumber, text: pageLines.map((line) => line.text).join("\n"), x: spatial ? left : null, y: spatial ? top : null, width: spatial ? right - left : null, height: spatial ? bottom - top : null, method: spatial ? "pdfjs-layout-v1" : "text-line-v1" };
}
