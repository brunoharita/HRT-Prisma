import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";

export const ADAPTIVE_EXTRACTION_CONTRACT_VERSION = "2.0.0";
export const ADAPTIVE_STRUCTURING_VERSION = "prisma-layout-adaptive-v2";
export const ADAPTIVE_REVIEW_METHOD_VERSION = "prisma-document-learning-v2";

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

export interface ExtractionPatternSignal {
  patternKey: string;
  confirmationCount: number;
  methodVersion: string;
}

export type ExperienceFieldName = "role" | "organization" | "period" | "description";

export interface AdaptiveFieldSuggestion {
  fieldPath: string;
  experienceIndex: number;
  field: ExperienceFieldName;
  currentValue: string | null;
  proposedValue: string;
  pageNumber: number;
  evidenceText: string;
  evidence: FieldEvidenceDescriptor | null;
  rationaleCode: "same-document-block-pattern";
  explanation: string;
}

export interface AdaptiveExperienceSuggestion {
  experienceIndex: number;
  label: string;
  patternKey: string;
  explanation: string;
  fields: AdaptiveFieldSuggestion[];
}

export interface AdaptiveUnresolvedSibling {
  experienceIndex: number;
  label: string;
  reasonCode: "source-block-not-found" | "source-correction-not-confirmed" | "no-safe-change";
  explanation: string;
}

export interface AdaptiveSuggestionReport {
  sourceIndex: number;
  sourceField: ExperienceFieldName;
  patternKey: string;
  methodVersion: string;
  suggestions: AdaptiveExperienceSuggestion[];
  unresolved: AdaptiveUnresolvedSibling[];
}

export interface AdaptiveExtractionResult {
  draft: StructuredDraft;
  fieldEvidence: FieldEvidenceDescriptor[];
  pattern: {
    experienceHeader: "role-period-company-next-line" | "role-company-period-same-line" | "mixed" | "not-observed";
    repeatedExperienceBlocks: number;
    learnedSignalsUsed: string[];
  };
}

type CandidateLine = LayoutTextLine & { pageNumber: number; sequence: number };
type ParsedExperienceBlock = {
  anchor: CandidateLine;
  anchorIndex: number;
  organizationLine: CandidateLine | null;
  role: string;
  organization: string;
  period: string | null;
  description: string | null;
  descriptionLines: CandidateLine[];
  patternKey: string;
};

const ROLE_TERMS = /(analista|arquiteto|assistente|chief|consultor|coordenador|customer success|developer|desenvolvedor|diretor|engineer|engenheiro|especialista|executivo|founder|fundador|gerente|head|l[ií]der|manager|presidente|recruiter|supervisor|system analyst|technician|t[eé]cnico|vice[- ]presidente|coo|ceo|cto|cfo|cio)/i;
const SECTION_HEADING = /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience|forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|resumo|summary|perfil|s[ií]ntese de valor)/i;
const NEXT_SECTION = /^(forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|projetos|projects|cursos|s[ií]ntese de valor)/i;
const PERIOD_TOKEN = /\b(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4}))\b|\b(?:19|20)\d{2}\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:19|20)\d{2})\b/i;
const COMPANY_MARKERS = /\b(solutions?|engenharia|empreendimentos?|consultoria|sistemas?|education|educa[cç][aã]o|comercial|ltda|s\.?a\.?|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade|tecnologia)\b/i;

export function buildAdaptiveExtraction(
  pages: ExtractedPage[],
  learnedPatterns: ExtractionPatternSignal[] = [],
): AdaptiveExtractionResult {
  const lines = sliceExperienceSection(candidateLines(pages));
  const learnedPatternKeys = new Set(
    learnedPatterns
      .filter((signal) => signal.methodVersion === ADAPTIVE_REVIEW_METHOD_VERSION && signal.confirmationCount > 0)
      .map((signal) => signal.patternKey),
  );
  const blocks = detectTopLevelExperienceBlocks(lines, learnedPatternKeys);
  const experiences: StructuredDraft["experiences"] = [];
  const fieldEvidence: FieldEvidenceDescriptor[] = [];
  let nextLineCompanyCount = 0;
  let sameLineCount = 0;

  for (const block of blocks.slice(0, 16)) {
    const itemIndex = experiences.length;
    experiences.push({
      role: block.role,
      organization: block.organization,
      period: block.period,
      description: block.description,
      evidenceText: [block.anchor.text, block.organizationLine?.text].filter(Boolean).join("\n"),
      page: block.anchor.pageNumber,
    });
    fieldEvidence.push(toEvidence(`experiences.${itemIndex}.role`, block.anchor, block.role));
    fieldEvidence.push(toEvidence(`experiences.${itemIndex}.organization`, block.organizationLine ?? block.anchor, block.organization));
    if (block.period) fieldEvidence.push(toEvidence(`experiences.${itemIndex}.period`, block.anchor, block.period));
    if (block.descriptionLines.length) fieldEvidence.push(toCombinedEvidence(`experiences.${itemIndex}.description`, block.descriptionLines));
    if (block.organizationLine) nextLineCompanyCount += 1;
    else sameLineCount += 1;
  }

  const fullText = pages.map((page) => page.text).join("\n");
  const allLines = candidateLines(pages);
  const educationLines = allLines.filter((entry) => /(universidade|faculdade|bacharel|tecn[oó]logo|mba|p[oó]s-gradua[cç][aã]o|university|college)/i.test(entry.text));
  const education = educationLines.slice(0, 8).map((entry) => ({ course: entry.text, institution: "Não identificada", period: extractPeriod(entry.text), evidenceText: entry.text, page: entry.pageNumber }));
  const competencyCatalog = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "Power BI", "SAP", "Scrum", "Kanban", "Docker", "AWS", "Azure", "Supabase"];
  const competencies = competencyCatalog.filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(fullText));
  const languages = ["Português", "Inglês", "Espanhol", "English", "Spanish"].filter((item) => new RegExp(`\\b${item}\\b`, "i").test(fullText));
  const draft: StructuredDraft = {
    summary: experiences[0] ? `${experiences[0].role} com experiência profissional documentada em ${experiences[0].organization}.` : null,
    experiences,
    education,
    certifications: allLines.filter((entry) => /(certifica[cç][aã]o|certified|certificate)/i.test(entry.text)).slice(0, 8).map((entry) => entry.text),
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
      learnedSignalsUsed: [...learnedPatternKeys].filter((key) => blocks.some((block) => block.patternKey === key)),
    },
  };
}

export function attachFieldEvidence(pages: ExtractedPage[], descriptors: FieldEvidenceDescriptor[]): ExtractedPage[] {
  return pages.map((page) => ({ ...page, fieldEvidence: descriptors.filter((item) => item.pageNumber === page.pageNumber) }));
}

export function proposeSiblingBlockCorrections(input: {
  pages: ExtractedPage[];
  draft: StructuredDraft;
  sourceIndex: number;
  sourceField: ExperienceFieldName;
  extracted: StructuredDraft;
}): AdaptiveSuggestionReport {
  const sourceBefore = input.extracted.experiences[input.sourceIndex];
  const sourceAfter = input.draft.experiences[input.sourceIndex];
  const emptyReport = (reason: AdaptiveUnresolvedSibling["reasonCode"], explanation: string): AdaptiveSuggestionReport => ({
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: "experience:block-unconfirmed",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    suggestions: [],
    unresolved: sourceAfter ? [{ experienceIndex: input.sourceIndex, label: sourceAfter.role, reasonCode: reason, explanation }] : [],
  });
  if (!sourceBefore || !sourceAfter || comparable(fieldValue(sourceBefore, input.sourceField)) === comparable(fieldValue(sourceAfter, input.sourceField))) {
    return emptyReport("source-correction-not-confirmed", "A correção de origem não alterou o campo e não confirma um padrão novo.");
  }

  const lines = sliceExperienceSection(candidateLines(input.pages));
  const located = locateExistingExperienceBlocks(lines, input.extracted.experiences);
  const sourceBlock = located[input.sourceIndex];
  if (!sourceBlock) return emptyReport("source-block-not-found", "O bloco corrigido não pôde ser reencontrado com segurança na fonte original.");
  const interpretedSourceValue = fieldValue(sourceBlock, input.sourceField);
  if (!interpretedSourceValue || comparable(interpretedSourceValue) !== comparable(fieldValue(sourceAfter, input.sourceField))) {
    return emptyReport("source-correction-not-confirmed", "A fonte original não confirmou a mesma transformação aplicada pelo revisor.");
  }

  const suggestions: AdaptiveExperienceSuggestion[] = [];
  const unresolved: AdaptiveUnresolvedSibling[] = [];
  input.draft.experiences.forEach((experience, experienceIndex) => {
    if (experienceIndex === input.sourceIndex) return;
    const extractedExperience = input.extracted.experiences[experienceIndex];
    const block = located[experienceIndex];
    if (!extractedExperience || !block) {
      unresolved.push({
        experienceIndex,
        label: experience.role,
        reasonCode: "source-block-not-found",
        explanation: "O Prisma não encontrou um bloco-fonte inequívoco e, por segurança, não propôs alteração.",
      });
      return;
    }
    const fields = (["role", "organization", "period", "description"] as const).flatMap((field) => {
      const currentValue = fieldValue(experience, field);
      const extractedValue = fieldValue(extractedExperience, field);
      const proposedValue = fieldValue(block, field);
      if (!proposedValue || comparable(proposedValue) === comparable(currentValue)) return [];
      if (comparable(currentValue) !== comparable(extractedValue)) return [];
      const evidenceLine = evidenceLineForField(block, field);
      return [{
        fieldPath: `experiences.${experienceIndex}.${field}`,
        experienceIndex,
        field,
        currentValue,
        proposedValue,
        pageNumber: evidenceLine.pageNumber,
        evidenceText: evidenceLine.text,
        evidence: toEvidence(`experiences.${experienceIndex}.${field}`, evidenceLine, proposedValue),
        rationaleCode: "same-document-block-pattern" as const,
        explanation: fieldExplanation(field, block.patternKey),
      }];
    });
    if (fields.length) {
      suggestions.push({
        experienceIndex,
        label: block.role,
        patternKey: sourceBlock.patternKey,
        explanation: "O bloco foi reinterpretado na fonte original com a estrutura confirmada pela correção humana.",
        fields,
      });
    } else {
      unresolved.push({
        experienceIndex,
        label: experience.role,
        reasonCode: "no-safe-change",
        explanation: "O bloco foi localizado, mas não existe uma alteração segura que ainda não tenha sido revisada.",
      });
    }
  });
  return {
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: sourceBlock.patternKey,
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    suggestions,
    unresolved,
  };
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
    const proposedValue = reinterpretLegacySiblingField(input.field, extracted);
    if (!proposedValue || proposedValue === experience[input.field]) return [];
    return [{ index, fieldPath: `experiences.${index}.${input.field}`, currentValue: experience[input.field] ?? null, proposedValue }];
  });
}

function detectTopLevelExperienceBlocks(lines: CandidateLine[], learnedPatterns: Set<string>): ParsedExperienceBlock[] {
  const seeds = lines.flatMap((line, index) => {
    const period = extractPeriod(line.text);
    if (!period || isBullet(line.text) || SECTION_HEADING.test(line.text)) return [];
    const sameLine = parseSameLineHeader(line.text, period);
    const nextCompany = findAdjacentOrganization(lines, index, 1);
    const learnedNextLine = [...learnedPatterns].some((key) => key.includes("company-next-line"));
    const semanticHeader = ROLE_TERMS.test(line.text) || /^trajet[oó]ria\b/i.test(line.text) || line.emphasis === "strong";
    if (!sameLine && !nextCompany) return [];
    if (!semanticHeader && !(learnedNextLine && nextCompany)) return [];
    return [{ line, index, period, sameLine, nextCompany }];
  });
  return seeds.flatMap((seed, seedIndex) => {
    const nextAnchorIndex = seeds[seedIndex + 1]?.index ?? lines.length;
    const block = parseBlock(lines, seed.index, nextAnchorIndex);
    return block ? [block] : [];
  });
}

function locateExistingExperienceBlocks(lines: CandidateLine[], experiences: StructuredDraft["experiences"]): Array<ParsedExperienceBlock | null> {
  const anchors = experiences.map((experience) => locateAnchor(lines, experience));
  return anchors.map((anchorIndex) => {
    if (anchorIndex < 0) return null;
    const laterAnchors = anchors.filter((candidate) => candidate > anchorIndex);
    const nextAnchorIndex = laterAnchors.length ? Math.min(...laterAnchors) : lines.length;
    return parseBlock(lines, anchorIndex, nextAnchorIndex, true);
  });
}

function parseBlock(lines: CandidateLine[], anchorIndex: number, nextAnchorIndex: number, allowNearbyCompany = false): ParsedExperienceBlock | null {
  const anchor = lines[anchorIndex];
  if (!anchor) return null;
  const period = extractPeriod(anchor.text) ?? extractPeriod(`${anchor.text} ${lines[anchorIndex + 1]?.text ?? ""}`);
  const sameLine = period ? parseSameLineHeader(anchor.text, period) : null;
  let organizationLine = sameLine ? null : findAdjacentOrganization(lines, anchorIndex, 1);
  if (!organizationLine && allowNearbyCompany) organizationLine = findNearbyOrganization(lines, anchorIndex);
  const organization = sameLine?.organization ?? organizationLine?.text.trim() ?? "";
  const role = sameLine?.role ?? cleanHeaderRole(period ? removeExact(anchor.text, period) : anchor.text);
  if (!role || !organization || !isPlausibleOrganization(organization)) return null;
  const startIndex = organizationLine ? lines.indexOf(organizationLine) + 1 : anchorIndex + 1;
  const detectedBoundary = findNextTopLevelBoundary(lines, startIndex, nextAnchorIndex);
  const endIndex = Math.min(nextAnchorIndex, detectedBoundary);
  const descriptionLines = lines.slice(startIndex, endIndex).filter((line) => !SECTION_HEADING.test(line.text) && !isPageFooter(line.text));
  const sameLineDescription = sameLine?.description ?? null;
  const descriptionParts = [sameLineDescription, ...descriptionLines.map((line) => stripBullet(line.text))].filter((value): value is string => Boolean(value));
  return {
    anchor,
    anchorIndex,
    organizationLine,
    role,
    organization,
    period,
    description: descriptionParts.length ? descriptionParts.join("\n") : null,
    descriptionLines,
    patternKey: `experience:block-v2:${organizationLine ? "company-next-line" : "company-same-line"}:period-${period ? "header" : "missing"}:description-following`,
  };
}

function parseSameLineHeader(value: string, period: string): { role: string; organization: string; description: string | null } | null {
  const periodIndex = value.toLowerCase().indexOf(period.toLowerCase());
  if (periodIndex < 0) return null;
  const before = value.slice(0, periodIndex).replace(/[|,;:\s]+$/, "").trim();
  const after = value.slice(periodIndex + period.length).replace(/^[|,;:\s]+/, "").trim();
  const atMatch = /^(.*?)\s+(?:at|em|@)\s+(.+)$/i.exec(before);
  if (atMatch && ROLE_TERMS.test(atMatch[1] ?? "") && isPlausibleOrganization(atMatch[2] ?? "")) {
    return { role: atMatch[1]!.trim(), organization: atMatch[2]!.trim(), description: after || null };
  }
  const parts = before.split(/\s+[|]\s+|\s+[-–]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && ROLE_TERMS.test(parts[0]!) && isPlausibleOrganization(parts.at(-1)!)) {
    return { role: parts[0]!, organization: parts.at(-1)!, description: after || null };
  }
  return null;
}

function findAdjacentOrganization(lines: CandidateLine[], anchorIndex: number, direction: 1 | -1): CandidateLine | null {
  for (let distance = 1; distance <= 2; distance += 1) {
    const candidate = lines[anchorIndex + (distance * direction)];
    if (!candidate || candidate.pageNumber !== lines[anchorIndex]?.pageNumber) continue;
    if (isLikelyOrganizationLine(candidate)) return candidate;
    if (isBullet(candidate.text) || (extractPeriod(candidate.text) && ROLE_TERMS.test(candidate.text))) break;
  }
  return null;
}

function findNearbyOrganization(lines: CandidateLine[], anchorIndex: number): CandidateLine | null {
  return findAdjacentOrganization(lines, anchorIndex, 1)
    ?? findAdjacentOrganization(lines, anchorIndex, -1)
    ?? (() => {
      for (let distance = 2; distance <= 6; distance += 1) {
        const candidate = lines[anchorIndex - distance];
        if (!candidate || candidate.pageNumber !== lines[anchorIndex]?.pageNumber) continue;
        if (isLikelyOrganizationLine(candidate)) return candidate;
      }
      return null;
    })();
}

function findNextTopLevelBoundary(lines: CandidateLine[], startIndex: number, hardEnd: number): number {
  for (let index = startIndex; index < hardEnd; index += 1) {
    const candidate = lines[index]!;
    if (NEXT_SECTION.test(candidate.text)) return index;
    const period = extractPeriod(candidate.text);
    if (!period || isBullet(candidate.text)) continue;
    const sameLine = parseSameLineHeader(candidate.text, period);
    const nextCompany = findAdjacentOrganization(lines, index, 1);
    if (sameLine || nextCompany) return index;
  }
  return hardEnd;
}

function locateAnchor(lines: CandidateLine[], experience: StructuredDraft["experiences"][number]): number {
  const evidenceAnchor = experience.evidenceText.split(/\r?\n/)[0]?.trim();
  if (evidenceAnchor) {
    const exact = lines.findIndex((line) => line.pageNumber === experience.page && comparable(line.text) === comparable(evidenceAnchor));
    if (exact >= 0) return exact;
  }
  const normalizedRole = comparable(removePeriodFragments(experience.role));
  let bestIndex = -1;
  let bestScore = 0;
  lines.forEach((line, index) => {
    if (line.pageNumber !== experience.page) return;
    const candidate = comparable(line.text);
    const score = normalizedRole && candidate.includes(normalizedRole) ? normalizedRole.length : sharedTokenScore(normalizedRole, candidate);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestScore >= Math.min(12, Math.max(5, normalizedRole.length * 0.45)) ? bestIndex : -1;
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

function cleanHeaderRole(value: string): string {
  return value.split(/\s+[|]\s+/)[0]?.trim().replace(/[|,;:-]+$/, "").trim() ?? "";
}

function isPlausibleOrganization(value: string): boolean {
  const candidate = value.trim().replace(/[|,;:-]+$/, "").trim();
  if (candidate.length < 2 || candidate.length > 120 || PERIOD_TOKEN.test(candidate) || isBullet(candidate) || SECTION_HEADING.test(candidate)) return false;
  if (/\b(transforma[cç][aã]o|produtos digitais|opera[cç][aã]o|atividades|respons[aá]vel|atua[cç][aã]o|gest[aã]o|governan[cç]a)\b/i.test(candidate) && !COMPANY_MARKERS.test(candidate)) return false;
  return /^[\p{L}\p{N}][\p{L}\p{N}&.'() /+_-]+$/u.test(candidate);
}

function isLikelyOrganizationLine(line: CandidateLine): boolean {
  if (!isPlausibleOrganization(line.text) || ROLE_TERMS.test(line.text) || extractPeriod(line.text)) return false;
  const words = line.text.trim().split(/\s+/).length;
  return COMPANY_MARKERS.test(line.text) || line.emphasis === "strong" || words <= 6;
}

function reinterpretLegacySiblingField(field: "role" | "organization" | "period", experience: StructuredDraft["experiences"][number]): string | null {
  if (field === "period") return extractPeriod(`${experience.evidenceText} ${experience.role} ${experience.organization} ${experience.period ?? ""}`);
  if (field === "organization") {
    const period = extractPeriod(experience.organization);
    const candidate = period ? removeExact(experience.organization, period) : experience.organization;
    return isPlausibleOrganization(candidate) ? candidate.trim() : null;
  }
  return removePeriodFragments(experience.role).trim() || null;
}

function fieldValue(value: StructuredDraft["experiences"][number] | ParsedExperienceBlock, field: ExperienceFieldName): string | null {
  const result = value[field];
  return typeof result === "string" && result.trim() ? result.trim() : null;
}

function evidenceLineForField(block: ParsedExperienceBlock, field: ExperienceFieldName): CandidateLine {
  if (field === "organization" && block.organizationLine) return block.organizationLine;
  if (field === "description" && block.descriptionLines[0]) return block.descriptionLines[0];
  return block.anchor;
}

function fieldExplanation(field: ExperienceFieldName, patternKey: string): string {
  const label = ({ role: "cargo", organization: "empresa", period: "período", description: "descrição" })[field];
  return `O ${label} foi relido diretamente no bloco original usando ${patternKey.includes("company-next-line") ? "a empresa na linha associada" : "a empresa no mesmo cabeçalho"}.`;
}

function sharedTokenScore(left: string, right: string): number {
  const tokens = new Set(left.split(/\s+/).filter((token) => token.length >= 3));
  return [...tokens].filter((token) => right.includes(token)).reduce((score, token) => score + token.length, 0);
}

function comparable(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function removePeriodFragments(value: string): string {
  const period = extractPeriod(value);
  return period ? removeExact(value, period) : value;
}

function stripBullet(value: string): string { return value.replace(/^[•·▪◦*-]\s*/, "").trim(); }
function isBullet(value: string): boolean { return /^[•·▪◦*-]\s+/.test(value.trim()); }
function isPageFooter(value: string): boolean { return /\b(?:p[aá]gina|page)\s+\d+\b/i.test(value) && /curr[ií]culo|resume/i.test(value); }
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
