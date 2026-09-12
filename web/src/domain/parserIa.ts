import type { ExtractedPage, ProcessedDocumentInput, StructuredDraft } from "./personIngestion.js";
import type { FieldEvidenceDescriptor } from "./adaptiveResumeExtraction.js";
import { classifyEducationRecord } from "../../../src/domain/educationClassification.js";
import { stableReviewEntityId } from "./reviewFieldLifecycle.js";
import { normalizeResumeEmail, normalizeResumePhone, type ResumeIdentity } from "../../../src/domain/resumeIdentity.js";

export const PARSER_IA_VERSION = "parser-ia-1.0.0";
export const PARSER_IA_SOURCE_VERSION = "pdfjs-5.4.296/parser-ia-spans-v1";
export const PARSER_IA_MAX_PAGES = 30;
export interface ParserSourceLine { id: string; pageNumber: number; text: string; x: number; y: number; width: number; height: number; }
export interface ParserFact { path: string; value: string; sources: string[]; }
export interface ParserPayload { status: "complete" | "partial"; facts: ParserFact[]; uncertainties: string[]; }
export interface ParserIaResult {
  version: typeof PARSER_IA_VERSION;
  sourceSha256: string;
  organizationId: string;
  status: "structured_for_review" | "partial";
  draft: StructuredDraft;
  fieldEvidence: FieldEvidenceDescriptor[];
  acceptedFacts: ParserFact[];
  rejected: { path: string; reason: string }[];
  provenance: { model: string; promptSha256: string; responseId: string; inputTokens: number; outputTokens: number; costUsd: number; durationMs: number; };
}

const scalarPaths = new Set(["identity.fullName", "contact.city", "contact.state", "contact.email", "contact.phone", "contact.linkedin", "professionalTitle", "summary", "professionalObjective"]);
const recordPath = /^(experiences|education)\.([a-zA-Z][a-zA-Z0-9_-]{0,63})\.(role|organization|period|description|course|institution)$/;
const listPath = /^(competencies|languages|certifications|areasOfExpertise|toolsAndTechnologies|professionalContexts)\.(0|[1-9][0-9]{0,2})$/;
const resultPath = /^keyResults\.([a-zA-Z][a-zA-Z0-9_-]{0,63})\.value$/;
const customPath = /^customSections\.([a-zA-Z][a-zA-Z0-9_-]{0,63})\.(name|items\.(0|[1-9][0-9]{0,2}))$/;
const forbiddenIds = new Set(["__proto__", "prototype", "constructor"]);
const clean = (s: string) => s.normalize("NFKC").replace(/&amp;/g, "&").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const compact = (s: string) => clean(s).replace(/[•▪●]/g, "").replace(/\s/g, "");
const reviewListFieldPath = (path: string) => path.replace(/^(competencies|languages|certifications|areasOfExpertise)\.(0|[1-9][0-9]{0,2})$/, "$1");
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function parserIaSource(pages: readonly ExtractedPage[]): ParserSourceLine[] {
  if (!pages.length || pages.length > PARSER_IA_MAX_PAGES) throw new Error("PARSER_SOURCE_LIMIT");
  const seen = new Set<number>();
  const lines: ParserSourceLine[] = [];
  for (const page of pages) {
    if (!Number.isInteger(page.pageNumber) || page.pageNumber < 1 || page.pageNumber > pages.length || seen.has(page.pageNumber)) throw new Error("PARSER_SOURCE_INVALID");
    seen.add(page.pageNumber);
    for (const [index, line] of (page.layoutLines ?? []).entries()) {
      if (!line.text.trim()) continue;
      if (![line.x, line.y, line.width, line.height].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) || line.x + line.width > 1.000001 || line.y + line.height > 1.000001) throw new Error("PARSER_GEOMETRY_INVALID");
      lines.push({ id: `p${page.pageNumber}l${index + 1}`, pageNumber: page.pageNumber, text: line.text, x: line.x, y: line.y, width: line.width, height: line.height });
    }
  }
  if (!lines.length || lines.length > 12000 || lines.reduce((n, line) => n + line.text.length, 0) > 250000) throw new Error("PARSER_SOURCE_LIMIT");
  return lines;
}

function allowedPath(path: string): boolean {
  if (path.split(".").some((part) => forbiddenIds.has(part))) return false;
  if (scalarPaths.has(path) || listPath.test(path) || resultPath.test(path) || customPath.test(path)) return true;
  const match = path.match(recordPath);
  return Boolean(match && (match[1] === "experiences" ? ["role", "organization", "period", "description"] : ["course", "institution", "period", "description"]).includes(match[3]!));
}

export function validateParserPayload(raw: unknown): ParserPayload {
  if (!isObject(raw) || Object.keys(raw).sort().join() !== "facts,status,uncertainties" || !["complete", "partial"].includes(String(raw.status)) || !Array.isArray(raw.facts) || raw.facts.length > 1500 || !Array.isArray(raw.uncertainties) || raw.uncertainties.length > 100 || raw.uncertainties.some((s) => typeof s !== "string" || s.length > 1000)) throw new Error("PARSER_RESPONSE_INVALID");
  const seen = new Set<string>();
  for (const fact of raw.facts) {
    if (!isObject(fact) || Object.keys(fact).sort().join() !== "path,sources,value" || typeof fact.path !== "string" || !allowedPath(fact.path) || seen.has(fact.path) || typeof fact.value !== "string" || !fact.value.trim() || fact.value.length > 25000 || !Array.isArray(fact.sources) || !fact.sources.length || fact.sources.length > 1000 || new Set(fact.sources).size !== fact.sources.length || fact.sources.some((id) => typeof id !== "string" || !/^p\d+l\d+$/.test(id))) throw new Error("PARSER_RESPONSE_INVALID");
    seen.add(fact.path);
  }
  return raw as unknown as ParserPayload;
}

function supportedValue(fact: ParserFact, selected: ParserSourceLine[], all: ParserSourceLine[]): boolean {
  const text = selected.map((line) => line.text).join("\n");
  if (["contact.city", "contact.state"].includes(fact.path) && /^(brasil|brazil)$/i.test(clean(fact.value))) return false;
  if (!compact(text).includes(compact(fact.value))) return false;
  if (fact.path === "contact.email") {
    const joined = selected.map((line) => line.text.trim()).join("");
    const emails = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    if (!emails.some((email) => email.toLowerCase() === fact.value.toLowerCase())) return false;
    // A suffix visibly continuing immediately below a cited email must not be omitted.
    for (const line of selected.filter((item) => item.text.includes("@"))) {
      const continuation = all.find((other) => other.pageNumber === line.pageNumber && other.y > line.y && other.y - line.y < Math.max(line.height * 2.3, 0.025) && Math.abs(other.x - line.x) < 0.02 && /^[a-z]{1,4}$/.test(other.text.trim()));
      if (continuation && !fact.sources.includes(continuation.id)) return false;
    }
  }
  return true;
}

export function structureParserIa(raw: unknown, pages: ExtractedPage[], binding: { sourceSha256: string; organizationId: string; provenance: ParserIaResult["provenance"] }): ParserIaResult {
  if (!/^[a-f0-9]{64}$/.test(binding.sourceSha256) || !/^[a-zA-Z0-9_-]{1,80}$/.test(binding.organizationId)) throw new Error("PARSER_BINDING_INVALID");
  const payload = validateParserPayload(raw);
  const lines = parserIaSource(pages);
  const indexed = new Map(lines.map((line) => [line.id, line]));
  const acceptedFacts: ParserFact[] = [];
  const rejected: ParserIaResult["rejected"] = [];
  for (const fact of payload.facts) {
    const selected = fact.sources.flatMap((id) => indexed.has(id) ? [indexed.get(id)!] : []);
    if (selected.length !== fact.sources.length || !supportedValue(fact, selected, lines)) rejected.push({ path: fact.path, reason: "source_support_missing" });
    else {
      const joined = selected.map((line) => line.text).join("\n");
      const isContactToken = ["contact.email", "contact.phone", "contact.linkedin"].includes(fact.path);
      // Restore visual word boundaries only when the full cited text matches.
      const value = !isContactToken && compact(joined) === compact(fact.value) ? clean(joined) : clean(fact.value);
      acceptedFacts.push({ ...fact, value });
    }
  }
  if (!acceptedFacts.length) throw new Error("PARSER_NO_SUPPORTED_FACTS");
  const draft: StructuredDraft = { identity: { fullName: null }, contact: { city: null, state: null, email: null, phone: null, linkedin: null }, professionalTitle: null, summary: null, professionalObjective: null, areasOfExpertise: [], keyResults: [], experiences: [], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [...payload.uncertainties], notIdentified: [] };
  const evidence: FieldEvidenceDescriptor[] = [];
  const paths = new Map<string, string>();
  const values = new Map(acceptedFacts.map((fact) => [fact.path, clean(fact.value)]));
  for (const path of scalarPaths) {
    const value = values.get(path);
    if (!value) continue;
    if (path === "identity.fullName") draft.identity.fullName = value;
    else if (path.startsWith("contact.")) draft.contact[path.slice(8) as keyof StructuredDraft["contact"]] = value;
    else draft[path as "summary" | "professionalTitle" | "professionalObjective"] = value;
    paths.set(path, path);
  }
  for (const kind of ["experiences", "education"] as const) {
    const ids = [...new Set(acceptedFacts.filter((fact) => fact.path.startsWith(`${kind}.`)).map((fact) => fact.path.split(".")[1]!))];
    for (const modelId of ids) {
      const prefix = `${kind}.${modelId}.`;
      const related = acceptedFacts.filter((fact) => fact.path.startsWith(prefix));
      const selected = [...new Set(related.flatMap((fact) => fact.sources))].map((id) => indexed.get(id)!);
      const evidenceText = selected.map((line) => line.text).join("\n");
      const first = selected[0]!;
      const id = stableReviewEntityId(kind === "experiences" ? "experience" : "education", `${first.pageNumber}:${first.x}:${first.y}:${modelId}:${evidenceText}`);
      const get = (field: string) => values.get(prefix + field) ?? null;
      if (kind === "experiences") draft.experiences.push({ id, source: "extracted", role: get("role"), organization: get("organization"), period: get("period"), description: get("description"), evidenceText, page: first.pageNumber });
      else {
        const course = get("course");
        const classification = classifyEducationRecord({ course, institution: get("institution"), period: get("period"), description: get("description"), originalText: evidenceText });
        draft.education.push({ ...classification, id, source: "extracted", course, institution: get("institution"), period: get("period"), description: get("description"), evidenceText, page: first.pageNumber, classifierSnapshot: { ...classification.classifierSnapshot, course } });
      }
      for (const fact of related) paths.set(fact.path, `${kind}.${id}.${fact.path.split(".")[2]}`);
    }
  }
  for (const kind of ["competencies", "languages", "certifications", "areasOfExpertise", "toolsAndTechnologies", "professionalContexts"] as const) {
    const list = acceptedFacts.filter((fact) => fact.path.startsWith(`${kind}.`)).sort((a, b) => Number(a.path.split(".")[1]) - Number(b.path.split(".")[1]));
    // The existing review/persistence contract anchors these lists at the field root.
    // Each item's source regions remain separate descriptors; only the field address changes.
    if (list.length) draft[kind] = list.map((fact, index) => { paths.set(fact.path, reviewListFieldPath(`${kind}.${index}`)); return clean(fact.value); });
  }
  for (const fact of acceptedFacts.filter((fact) => resultPath.test(fact.path))) {
    const id = fact.path.split(".")[1]!;
    draft.keyResults.push({ id, value: clean(fact.value) }); paths.set(fact.path, fact.path);
  }
  const customIds = [...new Set(acceptedFacts.filter((fact) => customPath.test(fact.path)).map((fact) => fact.path.split(".")[1]!))];
  for (const id of customIds) {
    const name = values.get(`customSections.${id}.name`);
    const items = acceptedFacts.filter((fact) => fact.path.startsWith(`customSections.${id}.items.`));
    if (!name || !items.length) { draft.uncertainties.push("Uma seção adicional não possui título e conteúdo suportados suficientes."); continue; }
    draft.customSections.push({ id, name, source: "extracted", format: "list", items: items.map((fact, index) => { const itemId = `${id}-${index}`; paths.set(fact.path, `customSections.${id}.items.${itemId}.value`); return { id: itemId, value: clean(fact.value) }; }) });
    paths.set(`customSections.${id}.name`, `customSections.${id}.name`);
  }
  for (const fact of acceptedFacts) {
    const fieldPath = paths.get(fact.path);
    if (!fieldPath) continue;
    for (const sourceId of fact.sources) {
      const line = indexed.get(sourceId)!;
      evidence.push({ fieldPath, pageNumber: line.pageNumber, text: line.text, x: line.x, y: line.y, width: line.width, height: line.height, method: pages.find((p) => p.pageNumber === line.pageNumber)?.origin === "ocr" ? "tesseract-layout-v1" : "pdfjs-layout-v1" });
    }
  }
  for (const item of rejected) draft.uncertainties.push(`Campo não preenchido por falta de suporte verificável: ${item.path}.`);
  const duplicates = draft.education.filter((item, index, list) => list.findIndex((other) => other.course === item.course && other.institution === item.institution && other.period === item.period) !== index);
  if (duplicates.length) draft.uncertainties.push("Há formações possivelmente duplicadas; confirmar a consolidação na revisão.");
  for (const [name, present] of [["nome", draft.identity.fullName], ["e-mail", draft.contact.email], ["telefone", draft.contact.phone], ["experiências", draft.experiences.length], ["formação", draft.education.length], ["idiomas", draft.languages.length]] as const) if (!present) draft.notIdentified.push(name);
  return { version: PARSER_IA_VERSION, sourceSha256: binding.sourceSha256, organizationId: binding.organizationId, status: payload.status === "partial" || draft.uncertainties.length > 0 ? "partial" : "structured_for_review", draft, fieldEvidence: evidence, acceptedFacts, rejected, provenance: binding.provenance };
}

export function parserIaIdentity(result: ParserIaResult): ResumeIdentity {
  const page = (path: string) => result.fieldEvidence.find((item) => item.fieldPath === path)?.pageNumber ?? null;
  return { fullName: result.draft.identity.fullName, email: result.draft.contact.email ? normalizeResumeEmail(result.draft.contact.email) : null, phone: result.draft.contact.phone ? normalizeResumePhone(result.draft.contact.phone) : null, namePage: page("identity.fullName"), emailPage: page("contact.email"), phonePage: page("contact.phone") };
}

export function parserIaMethodVersion(result: ParserIaResult): string {
  if (result.version !== PARSER_IA_VERSION || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(result.provenance?.model ?? "") || !/^[a-f0-9]{64}$/.test(result.provenance?.promptSha256 ?? "")) throw new Error("PARSER_PROVENANCE_INVALID");
  return `${PARSER_IA_VERSION}/${result.provenance.model}/${result.provenance.promptSha256}`;
}

export function preparedParserIa(input: Pick<ProcessedDocumentInput, "sha256" | "parserIa">, organizationId: string): ParserIaResult | null {
  const result = input.parserIa;
  if (!result) return null;
  if (result.version !== PARSER_IA_VERSION || result.organizationId !== organizationId || result.sourceSha256 !== input.sha256) throw new Error("PARSER_BINDING_INVALID");
  parserIaMethodVersion(result);
  // A retry may still hold the previously prepared result in the open page.
  if (result.fieldEvidence.some((item) => reviewListFieldPath(item.fieldPath) !== item.fieldPath)) {
    return { ...result, fieldEvidence: result.fieldEvidence.map((item) => ({ ...item, fieldPath: reviewListFieldPath(item.fieldPath) })) };
  }
  return result;
}
