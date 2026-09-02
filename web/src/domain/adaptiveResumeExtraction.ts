import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";
import { reviewEntityFieldPath, stableReviewEntityId } from "./reviewFieldLifecycle.js";
import { extractResumeIdentity } from "../../../src/domain/resumeIdentity.js";
import {
  CUSTOM_PROFILE_SECTION_METHOD_VERSION,
  normalizeCustomSectionName,
  stableCustomSectionKey,
  type LearnedCustomSectionDefinition,
} from "./customProfileSections.js";

export const ADAPTIVE_EXTRACTION_CONTRACT_VERSION = "5.0.0";
export const ADAPTIVE_STRUCTURING_VERSION = "prisma-layout-adaptive-v5";
export const ADAPTIVE_REVIEW_METHOD_VERSION = "prisma-document-learning-v3";
export const ADAPTIVE_SIBLING_ALGORITHM_VERSION = "adaptive-sibling-block-v1";
export const ADAPTIVE_SIBLING_SIGNATURE_VERSION = "experience-sibling-signature-v1";

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
  method: "pdfjs-layout-v1" | "tesseract-layout-v1" | "text-line-v1";
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
  evidences: FieldEvidenceDescriptor[];
  rationaleCode: "same-document-block-pattern";
  explanation: string;
}

export interface AdaptiveExperienceSuggestion {
  candidateId: string;
  experienceIndex: number;
  label: string;
  patternKey: string;
  kind: "correction" | "new";
  classification: "strong" | "possible";
  proposedExperience: StructuredDraft["experiences"][number] | null;
  criteria: Array<"same-section" | "header-geometry" | "period-alignment" | "body-pattern" | "spacing" | "column-continuity">;
  explanation: string;
  fields: AdaptiveFieldSuggestion[];
}

export interface AdaptiveUnresolvedSibling {
  experienceIndex: number;
  label: string;
  reasonCode: "source-block-not-found" | "source-correction-not-confirmed" | "source-incomplete" | "no-safe-change" | "ambiguous-candidate" | "duplicate-candidate" | "column-mismatch";
  explanation: string;
}

export interface AdaptiveSuggestionReport {
  sourceIndex: number;
  sourceField: ExperienceFieldName;
  patternKey: string;
  methodVersion: string;
  algorithmVersion: string;
  signatureVersion: string;
  anchorExperienceId: string | null;
  signatureSummary: Record<string, string | number | boolean | null>;
  candidateSummary: { detected: number; strong: number; possible: number; rejected: number };
  suggestions: AdaptiveExperienceSuggestion[];
  unresolved: AdaptiveUnresolvedSibling[];
}

export interface AdaptiveSourceRegion {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
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

type CandidateLine = LayoutTextLine & { pageNumber: number; sequence: number; origin: ExtractedPage["origin"] };
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

interface StructuredSummaryExtraction {
  identity: StructuredDraft["identity"];
  contact: StructuredDraft["contact"];
  professionalTitle: string | null;
  areasOfExpertise: string[];
  professionalObjective: string | null;
  summary: string | null;
  keyResults: StructuredDraft["keyResults"];
  fieldEvidence: FieldEvidenceDescriptor[];
}

const ROLE_TERMS = /(analista|arquiteto|assistente|chief|consultor|coordenador|customer success|developer|desenvolvedor|diretor|engineer|engenheiro|especialista|executivo|founder|fundador|gerente|head|l[ií]der|manager|mgmt|pm\/po|product owner|project manager|presidente|recruiter|supervisor|system analyst|technician|t[eé]cnico|vice[- ]presidente|coo|ceo|cto|cfo|cio)/i;
const SECTION_HEADING = /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience|forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|resumo|summary|perfil|s[ií]ntese de valor)/i;
const NEXT_SECTION = /^(forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|projetos|projects|cursos|s[ií]ntese de valor)/i;
const PERIOD_TOKEN = /\b(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4}))\b|\b(?:19|20)\d{2}\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:19|20)\d{2})\b/i;
const COMPANY_MARKERS = /\b(solutions?|engenharia|empreendimentos?|consultoria|sistemas?|education|educa[cç][aã]o|comercial|ltda|s\.?a\.?|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade|tecnologia)\b/i;
const SAME_LINE_COMPANY_MARKERS = /\b(solutions?|engenharia|empreendimentos?|sistemas?|education|educa[cç][aã]o|comercial|ltda|s\.?a\.?|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade)\b/i;

export function buildAdaptiveExtraction(
  pages: ExtractedPage[],
  learnedPatterns: ExtractionPatternSignal[] = [],
  learnedCustomSections: LearnedCustomSectionDefinition[] = [],
): AdaptiveExtractionResult {
  const lines = sliceExperienceSection(candidateLines(pages));
  const learnedPatternKeys = new Set(
    learnedPatterns
      .filter((signal) => [ADAPTIVE_REVIEW_METHOD_VERSION, "prisma-document-learning-v2"].includes(signal.methodVersion) && signal.confirmationCount > 0)
      .map((signal) => signal.patternKey),
  );
  const blocks = detectTopLevelExperienceBlocks(lines, learnedPatternKeys);
  const experiences: StructuredDraft["experiences"] = [];
  const fieldEvidence: FieldEvidenceDescriptor[] = [];
  let nextLineCompanyCount = 0;
  let sameLineCount = 0;

  for (const block of blocks.slice(0, 16)) {
    const experience = {
      id: stableReviewEntityId("experience", `${block.anchor.pageNumber}:${block.anchor.sequence}:${block.role}:${block.organization}`),
      source: "extracted",
      role: block.role,
      organization: block.organization,
      period: block.period,
      description: block.description,
      evidenceText: [block.anchor.text, block.organizationLine?.text].filter(Boolean).join("\n"),
      page: block.anchor.pageNumber,
    } satisfies StructuredDraft["experiences"][number];
    experiences.push(experience);
    fieldEvidence.push(toEvidence(reviewEntityFieldPath("experience", experience, "role"), block.anchor, block.role));
    fieldEvidence.push(toEvidence(reviewEntityFieldPath("experience", experience, "organization"), block.organizationLine ?? block.anchor, block.organization));
    if (block.period) fieldEvidence.push(toEvidence(reviewEntityFieldPath("experience", experience, "period"), block.anchor, block.period));
    if (block.descriptionLines.length) fieldEvidence.push(toCombinedEvidence(reviewEntityFieldPath("experience", experience, "description"), block.descriptionLines));
    if (block.organizationLine) nextLineCompanyCount += 1;
    else sameLineCount += 1;
  }

  const fullText = pages.map((page) => page.text).join("\n");
  const allLines = candidateLines(pages);
  const educationLines = allLines.filter((entry) => /(universidade|faculdade|bacharel|tecn[oó]logo|mba|p[oó]s-gradua[cç][aã]o|university|college)/i.test(entry.text));
  const education = educationLines.slice(0, 8).map((entry) => ({
    id: stableReviewEntityId("education", `${entry.pageNumber}:${entry.sequence}:${entry.text}`),
    source: "extracted" as const,
    course: entry.text,
    institution: "Não identificada",
    period: extractPeriod(entry.text),
    evidenceText: entry.text,
    page: entry.pageNumber,
  }));
  const competencyCatalog = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "Power BI", "SAP", "Scrum", "Kanban", "Docker", "AWS", "Azure", "Supabase"];
  const competencies = competencyCatalog.filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(fullText));
  const languages = ["Português", "Inglês", "Espanhol", "English", "Spanish"].filter((item) => new RegExp(`\\b${item}\\b`, "i").test(fullText));
  const learnedCustom = extractLearnedCustomSections(allLines, learnedCustomSections);
  const structuredSummary = extractStructuredSummary(pages, allLines);
  fieldEvidence.push(...structuredSummary.fieldEvidence);
  fieldEvidence.push(...learnedCustom.fieldEvidence);
  const draft: StructuredDraft = {
    identity: structuredSummary.identity,
    contact: structuredSummary.contact,
    professionalTitle: structuredSummary.professionalTitle,
    areasOfExpertise: structuredSummary.areasOfExpertise,
    professionalObjective: structuredSummary.professionalObjective,
    summary: structuredSummary.summary,
    keyResults: structuredSummary.keyResults,
    experiences,
    education,
    certifications: allLines.filter((entry) => /(certifica[cç][aã]o|certified|certificate)/i.test(entry.text)).slice(0, 8).map((entry) => entry.text),
    languages,
    competencies,
    customSections: learnedCustom.sections,
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

function extractStructuredSummary(pages: ExtractedPage[], lines: CandidateLine[]): StructuredSummaryExtraction {
  const identity = extractResumeIdentity(pages.map((page) => ({ pageNumber: page.pageNumber, text: page.text })));
  const headerLines = lines.filter((line) => line.pageNumber === pages[0]?.pageNumber).slice(0, 24);
  const fieldEvidence: FieldEvidenceDescriptor[] = [];
  const fullName = identity.fullName;
  const email = identity.email;
  const phone = identity.phone;
  const nameLine = findExplicitLine(headerLines, fullName);
  const emailLine = findExplicitLine(headerLines, email);
  const phoneLine = phone
    ? headerLines.find((line) => digits(line.text).includes(digits(phone).slice(-10))) ?? null
    : null;
  if (nameLine && fullName) fieldEvidence.push(toEvidence("identity.fullName", nameLine, fullName));
  if (emailLine && email) fieldEvidence.push(toEvidence("contact.email", emailLine, email));
  if (phoneLine && phone) fieldEvidence.push(toEvidence("contact.phone", phoneLine, phone));

  const linkedinMatch = headerLines.flatMap((line) => {
    const match = line.text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-z0-9%_.-]+\/?/i)?.[0];
    return match ? [{ line, value: normalizeLinkedinUrl(match) }] : [];
  })[0] ?? null;
  if (linkedinMatch) fieldEvidence.push(toEvidence("contact.linkedin", linkedinMatch.line, linkedinMatch.value));

  const locationMatch = headerLines.flatMap((line) => {
    const match = line.text.match(/(?:^|[|•])\s*([\p{L}][\p{L} .'-]{1,60}),\s*([A-Z]{2})\b/u);
    return match?.[1] && match[2] ? [{ line, city: match[1].trim(), state: match[2] }] : [];
  })[0] ?? null;
  if (locationMatch) {
    fieldEvidence.push(toEvidence("contact.city", locationMatch.line, locationMatch.city));
    fieldEvidence.push(toEvidence("contact.state", locationMatch.line, locationMatch.state));
  }

  const titleLine = headerLines.find((line) => (
    line !== nameLine
    && !line.text.includes("@")
    && !/linkedin\.com|\+?\d[\d\s().-]{8,}/i.test(line.text)
    && (line.text.includes("|") || ROLE_TERMS.test(line.text))
    && !SECTION_HEADING.test(line.text.trim())
  )) ?? null;
  const titleParts = titleLine?.text.split("|").map((item) => item.trim()).filter(Boolean) ?? [];
  const professionalTitle = titleParts[0] ?? null;
  const areasOfExpertise = uniqueText(titleParts.slice(1).filter((item) => !item.includes("@") && !/linkedin|\+?\d/.test(item)));
  if (titleLine && professionalTitle) fieldEvidence.push(toEvidence("professionalTitle", titleLine, professionalTitle));
  if (titleLine && areasOfExpertise.length) fieldEvidence.push(toEvidence("areasOfExpertise", titleLine, areasOfExpertise.join(", ")));

  const objectiveLines = sectionContent(lines, /^(objetivo(?: profissional)?|professional objective|posicionamento executivo)(?:\s*[|:]\s*(.+))?$/i);
  const summaryLines = sectionContent(lines, /^(resumo profissional|perfil profissional|perfil executivo|professional summary)(?:\s*[|:]\s*(.+))?$/i);
  const resultGroups = groupedBulletSection(lines, /^(principais resultados|resultados(?: e transforma[cç][oõ]es selecionadas)?|principais conquistas|resultados de destaque|selected results|key achievements)(?:\s*[|:]\s*(.+))?$/i);
  const professionalObjective = objectiveLines.length ? joinSectionText(objectiveLines) : null;
  const summary = summaryLines.length ? joinSectionText(summaryLines) : null;
  if (objectiveLines.length) fieldEvidence.push(toCombinedEvidence("professionalObjective", objectiveLines));
  if (summaryLines.length) fieldEvidence.push(toCombinedEvidence("summary", summaryLines));

  const keyResults = resultGroups.slice(0, 20).map((group) => {
    const value = group.map((line) => stripBullet(line.text)).join(" ").replace(/\s+/g, " ").trim();
    const id = `result_${stableToken(`${group[0]!.pageNumber}:${group[0]!.sequence}:${value}`)}`;
    fieldEvidence.push(toCombinedEvidence(`keyResults.${id}.value`, group));
    return { id, value };
  }).filter((item) => item.value);

  return {
    identity: { fullName: identity.fullName },
    contact: {
      city: locationMatch?.city ?? null,
      state: locationMatch?.state ?? null,
      phone: identity.phone,
      email: identity.email,
      linkedin: linkedinMatch?.value ?? null,
    },
    professionalTitle,
    areasOfExpertise,
    professionalObjective,
    summary,
    keyResults,
    fieldEvidence,
  };
}

function sectionContent(lines: CandidateLine[], headingPattern: RegExp): CandidateLine[] {
  const headingIndex = lines.findIndex((line) => headingPattern.test(line.text.trim()));
  if (headingIndex < 0) return [];
  const heading = lines[headingIndex]!;
  const content: CandidateLine[] = [];
  const inlineContent = heading.text.trim().match(headingPattern)?.[2]?.trim();
  if (inlineContent) content.push({ ...heading, text: inlineContent });
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.pageNumber !== heading.pageNumber || isSummarySectionHeading(line.text)) break;
    if (!isPageFooter(line.text)) content.push(line);
  }
  return content.slice(0, 40);
}

function groupedBulletSection(lines: CandidateLine[], headingPattern: RegExp): CandidateLine[][] {
  const content = sectionContent(lines, headingPattern);
  const groups: CandidateLine[][] = [];
  for (const line of content) {
    if (isBullet(line.text) || !groups.length) groups.push([line]);
    else groups.at(-1)!.push(line);
  }
  return groups.filter((group) => group.some((line) => stripBullet(line.text)));
}

function isSummarySectionHeading(value: string): boolean {
  return /^(resumo profissional|perfil profissional|perfil executivo|professional summary|objetivo(?: profissional)?|professional objective|posicionamento executivo|principais resultados|resultados(?: e transforma[cç][oõ]es selecionadas)?|principais conquistas|resultados de destaque|selected results|key achievements|problemas empresariais(?: que est[aá] preparado para assumir)?|s[ií]ntese de valor|experi[eê]ncia(?: profissional)?|professional experience|forma[cç][aã]o|educa[cç][aã]o|compet[eê]ncias(?:-chave)?|idiomas|certifica[cç][oõ]es)(?:\s*[|:]|$)/i.test(value.trim());
}

function joinSectionText(lines: CandidateLine[]): string {
  return lines.map((line) => stripBullet(line.text)).join("\n").trim();
}

function findExplicitLine(lines: CandidateLine[], value: string | null): CandidateLine | null {
  if (!value) return null;
  const normalized = comparable(value);
  return lines.find((line) => comparable(line.text).includes(normalized)) ?? null;
}

function normalizeLinkedinUrl(value: string): string {
  const normalized = value.replace(/\/$/, "");
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

function digits(value: string): string { return value.replace(/\D/g, ""); }
function uniqueText(values: string[]): string[] { return [...new Set(values.map((item) => item.trim()).filter(Boolean))]; }

function extractLearnedCustomSections(
  lines: CandidateLine[],
  definitions: LearnedCustomSectionDefinition[],
): { sections: StructuredDraft["customSections"]; fieldEvidence: FieldEvidenceDescriptor[] } {
  const activeDefinitions = definitions.filter((definition) => (
    definition.methodVersion === CUSTOM_PROFILE_SECTION_METHOD_VERSION
    && definition.confirmationCount > 0
    && definition.sectionKey === stableCustomSectionKey(definition.displayName)
    && normalizeCustomSectionName(definition.displayName) === definition.normalizedName
  ));
  if (!activeDefinitions.length) return { sections: [], fieldEvidence: [] };
  const byHeading = new Map(activeDefinitions.map((definition) => [definition.normalizedName, definition]));
  const sections: StructuredDraft["customSections"] = [];
  const fieldEvidence: FieldEvidenceDescriptor[] = [];

  lines.forEach((heading, headingIndex) => {
    const definition = byHeading.get(normalizeCustomSectionName(heading.text));
    if (!definition || sections.some((section) => section.id === definition.sectionKey)) return;
    const contentLines: CandidateLine[] = [];
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      const candidate = lines[index]!;
      if (candidate.pageNumber !== heading.pageNumber) break;
      if (isLikelyCustomSectionBoundary(candidate, byHeading)) break;
      if (!isPageFooter(candidate.text)) contentLines.push(candidate);
    }
    if (!contentLines.length) return;

    if (definition.format === "text") {
      const value = contentLines.map((line) => stripBullet(line.text)).filter(Boolean).join("\n").trim();
      if (!value) return;
      const itemId = `item_${stableToken(`${definition.sectionKey}:${heading.pageNumber}:${value}`)}`;
      sections.push({ id: definition.sectionKey, name: definition.displayName, format: "text", source: "extracted", items: [{ id: itemId, value }] });
      fieldEvidence.push(toCombinedEvidence(`customSections.${definition.sectionKey}.items.${itemId}.value`, contentLines));
      return;
    }

    const items = contentLines.flatMap((line) => {
      const value = stripBullet(line.text);
      if (!value) return [];
      const itemId = `item_${stableToken(`${definition.sectionKey}:${line.pageNumber}:${line.sequence}:${value}`)}`;
      fieldEvidence.push(toEvidence(`customSections.${definition.sectionKey}.items.${itemId}.value`, line, value));
      return [{ id: itemId, value }];
    });
    if (items.length) sections.push({ id: definition.sectionKey, name: definition.displayName, format: "list", source: "extracted", items });
  });
  return { sections, fieldEvidence };
}

function isLikelyCustomSectionBoundary(line: CandidateLine, learnedHeadings: Map<string, LearnedCustomSectionDefinition>): boolean {
  if (SECTION_HEADING.test(line.text) || learnedHeadings.has(normalizeCustomSectionName(line.text))) return true;
  return line.emphasis === "strong"
    && line.text.length <= 80
    && !isBullet(line.text)
    && !extractPeriod(line.text)
    && !/[.;,]$/.test(line.text.trim());
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
  sourceRegion?: AdaptiveSourceRegion | null;
}): AdaptiveSuggestionReport {
  const sourceBefore = input.extracted.experiences[input.sourceIndex];
  const sourceAfter = input.draft.experiences[input.sourceIndex];
  const emptyReport = (reason: AdaptiveUnresolvedSibling["reasonCode"], explanation: string): AdaptiveSuggestionReport => ({
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: "experience:block-unconfirmed",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: sourceAfter?.id ?? null,
    signatureSummary: {},
    candidateSummary: { detected: 0, strong: 0, possible: 0, rejected: 0 },
    suggestions: [],
    unresolved: sourceAfter ? [{ experienceIndex: input.sourceIndex, label: sourceAfter.role ?? sourceAfter.organization ?? "Experiência", reasonCode: reason, explanation }] : [],
  });
  if (!sourceAfter) return emptyReport("source-block-not-found", "A experiência revisada não existe mais no rascunho atual.");
  if (!isCompleteExperience(sourceAfter)) {
    return emptyReport("source-incomplete", "Conclua cargo, empresa, período e descrição antes de usar esta experiência como referência estrutural.");
  }
  if (sourceBefore && comparable(fieldValue(sourceBefore, input.sourceField)) === comparable(fieldValue(sourceAfter, input.sourceField))) {
    return emptyReport("source-correction-not-confirmed", "A correção de origem não alterou o campo e não confirma um padrão novo.");
  }

  const lines = sliceExperienceSection(candidateLines(input.pages));
  const sourceAnchorIndex = locateAnchor(lines, sourceAfter, input.sourceRegion);
  const strictSourceBlock = sourceAnchorIndex >= 0
    ? parseBlock(lines, sourceAnchorIndex, findNextTopLevelBoundary(lines, sourceAnchorIndex + 1, lines.length), true)
    : null;
  const strictSourceConfirmed = strictSourceBlock
    && (["role", "organization", "period"] as const).every((field) => comparable(fieldValue(strictSourceBlock, field)) === comparable(fieldValue(sourceAfter, field)));
  const sourceBlock = strictSourceConfirmed
    ? strictSourceBlock
    : sourceAnchorIndex >= 0
      ? parseBlock(lines, sourceAnchorIndex, findNextTopLevelBoundary(lines, sourceAnchorIndex + 1, lines.length, true), true, true)
      : null;
  if (!sourceBlock) return emptyReport("source-block-not-found", "O bloco corrigido não pôde ser reencontrado com segurança na fonte original.");
  if (!(["role", "organization", "period"] as const).every((field) => comparable(fieldValue(sourceBlock, field)) === comparable(fieldValue(sourceAfter, field)))) {
    return emptyReport("source-correction-not-confirmed", "A fonte original não confirmou a mesma transformação aplicada pelo revisor.");
  }

  const signature = buildSiblingSignature(sourceBlock);
  const blocks = detectTopLevelExperienceBlocks(lines, new Set([sourceBlock.patternKey]));
  const suggestions: AdaptiveExperienceSuggestion[] = [];
  const unresolved: AdaptiveUnresolvedSibling[] = [];
  let rejected = 0;
  for (const block of blocks) {
    if (sameSourceRegion(block, sourceBlock)) continue;
    const existingIndex = findMatchingExperienceIndex(input.draft.experiences, block);
    const classification = existingIndex >= 0 && !signature.spatial
      ? { kind: "strong" as const, criteria: ["same-section"] as SiblingCriterion[] }
      : classifySiblingCandidate(signature, block);
    if (classification.kind === "rejected") {
      rejected += 1;
      unresolved.push({
        experienceIndex: existingIndex >= 0 ? existingIndex : input.draft.experiences.length + suggestions.length,
        label: block.role,
        reasonCode: classification.reason,
        explanation: classification.explanation,
      });
      continue;
    }
    if (existingIndex >= 0) {
      const experience = input.draft.experiences[existingIndex]!;
      const extractedExperience = input.extracted.experiences.find((candidate) => candidate.id === experience.id)
        ?? input.extracted.experiences[existingIndex];
      const fields = buildAdaptiveFields(block, experience, existingIndex, extractedExperience ?? null);
      if (fields.length) suggestions.push({
        candidateId: candidateId(block), experienceIndex: existingIndex, label: block.role, patternKey: sourceBlock.patternKey,
        kind: "correction", classification: classification.kind, proposedExperience: null, criteria: classification.criteria,
        explanation: "O bloco já existia no rascunho e foi relido sem sobrescrever campos alterados pelo revisor.", fields,
      });
      else unresolved.push({
        experienceIndex: existingIndex, label: experience.role ?? experience.organization ?? `Experiência ${existingIndex + 1}`,
        reasonCode: "no-safe-change", explanation: "O bloco já está revisado ou não contém uma alteração segura.",
      });
      continue;
    }
    if (isDuplicateBlockSuggestion(input.draft.experiences, suggestions, block)) {
      rejected += 1;
      unresolved.push({
        experienceIndex: input.draft.experiences.length + suggestions.length, label: block.role,
        reasonCode: "duplicate-candidate", explanation: "O bloco coincide com uma experiência já identificada e não foi duplicado.",
      });
      continue;
    }
    const experienceIndex = input.draft.experiences.length + suggestions.filter((item) => item.kind === "new").length;
    const proposedExperience = toSuggestedExperience(block);
    suggestions.push({
      candidateId: candidateId(block), experienceIndex, label: block.role, patternKey: sourceBlock.patternKey,
      kind: "new", classification: classification.kind, proposedExperience, criteria: classification.criteria,
      explanation: classification.kind === "strong"
        ? "O bloco ausente repete a estrutura confirmada e pode ser aplicado após sua revisão."
        : "O bloco parece relacionado, mas possui uma diferença estrutural e exige revisão individual.",
      fields: buildAdaptiveFields(block, proposedExperience, experienceIndex, null, true),
    });
  }
  const strong = suggestions.filter((item) => item.classification === "strong").length;
  const possible = suggestions.filter((item) => item.classification === "possible").length;
  return {
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: sourceBlock.patternKey,
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: sourceAfter.id,
    signatureSummary: signature.summary,
    candidateSummary: { detected: blocks.length - 1, strong, possible, rejected },
    suggestions,
    unresolved,
  };
}

type SiblingCriterion = AdaptiveExperienceSuggestion["criteria"][number];
type SiblingSignature = {
  companyPlacement: "same-line" | "next-line";
  x: number;
  width: number;
  fontSize: number;
  emphasis: LayoutTextLine["emphasis"];
  hasBullets: boolean;
  spatial: boolean;
  summary: AdaptiveSuggestionReport["signatureSummary"];
};

function isCompleteExperience(experience: StructuredDraft["experiences"][number]): boolean {
  return Boolean(experience.role?.trim() && experience.organization?.trim() && experience.period?.trim() && experience.description?.trim());
}

function buildSiblingSignature(block: ParsedExperienceBlock): SiblingSignature {
  const companyPlacement = block.organizationLine ? "next-line" : "same-line";
  const hasBullets = block.descriptionLines.some((line) => isBullet(line.text));
  const spatial = block.anchor.fontSize > 0;
  return {
    companyPlacement,
    x: block.anchor.x,
    width: block.anchor.width,
    fontSize: block.anchor.fontSize,
    emphasis: block.anchor.emphasis,
    hasBullets,
    spatial,
    summary: {
      companyPlacement,
      periodPlacement: "header",
      headerEmphasis: block.anchor.emphasis,
      spatial,
      hasBullets,
      columnBand: spatial ? Math.round(block.anchor.x * 10) / 10 : null,
    },
  };
}

function classifySiblingCandidate(
  signature: SiblingSignature,
  block: ParsedExperienceBlock,
): { kind: "strong" | "possible"; criteria: SiblingCriterion[] } | { kind: "rejected"; reason: AdaptiveUnresolvedSibling["reasonCode"]; explanation: string } {
  if (!signature.spatial || block.anchor.fontSize <= 0) {
    return { kind: "rejected", reason: "ambiguous-candidate", explanation: "A fonte não possui geometria posicionada suficiente para reconhecer um novo bloco com segurança." };
  }
  const sameColumn = Math.abs(block.anchor.x - signature.x) <= 0.08;
  if (!sameColumn) return { kind: "rejected", reason: "column-mismatch", explanation: "O cabeçalho pertence a outra coluna visual e foi descartado por segurança." };
  const criteria: SiblingCriterion[] = ["same-section", "column-continuity"];
  const fontRatio = Math.min(block.anchor.fontSize, signature.fontSize) / Math.max(block.anchor.fontSize, signature.fontSize, 0.001);
  if (fontRatio >= 0.82 && block.anchor.emphasis === signature.emphasis && Math.abs(block.anchor.width - signature.width) <= 0.35) criteria.push("header-geometry");
  if (block.period && block.patternKey.includes("period-header")) criteria.push("period-alignment");
  if (Boolean(block.descriptionLines.some((line) => isBullet(line.text))) === signature.hasBullets && block.descriptionLines.length > 0) criteria.push("body-pattern");
  if (block.descriptionLines[0] && block.descriptionLines[0].y >= block.anchor.y) criteria.push("spacing");
  if (criteria.length >= 6 && (block.organizationLine ? "next-line" : "same-line") === signature.companyPlacement) return { kind: "strong", criteria };
  if (criteria.length >= 5) return { kind: "possible", criteria };
  return { kind: "rejected", reason: "ambiguous-candidate", explanation: "O bloco não repetiu critérios estruturais suficientes para virar uma sugestão segura." };
}

function buildAdaptiveFields(
  block: ParsedExperienceBlock,
  experience: StructuredDraft["experiences"][number],
  experienceIndex: number,
  extractedExperience: StructuredDraft["experiences"][number] | null,
  isNew = false,
): AdaptiveFieldSuggestion[] {
  return (["role", "organization", "period", "description"] as const).flatMap((field) => {
    const proposedValue = fieldValue(block, field);
    if (!proposedValue) return [];
    const currentValue = isNew ? null : fieldValue(experience, field);
    if (!isNew) {
      if (comparable(proposedValue) === comparable(currentValue)) return [];
      if (!extractedExperience || comparable(currentValue) !== comparable(fieldValue(extractedExperience, field))) return [];
    }
    const fieldPath = reviewEntityFieldPath("experience", experience, field);
    const evidenceLines = field === "description" ? block.descriptionLines : [evidenceLineForField(block, field)];
    const evidences = toEvidenceByPage(fieldPath, evidenceLines, proposedValue);
    const evidence = evidences[0] ?? null;
    return [{
      fieldPath, experienceIndex, field, currentValue, proposedValue,
      pageNumber: evidence?.pageNumber ?? block.anchor.pageNumber,
      evidenceText: evidence?.text ?? proposedValue,
      evidence, evidences,
      rationaleCode: "same-document-block-pattern" as const,
      explanation: fieldExplanation(field, block.patternKey),
    }];
  });
}

function toEvidenceByPage(fieldPath: string, lines: CandidateLine[], fallbackText: string): FieldEvidenceDescriptor[] {
  if (!lines.length) return [];
  const pageNumbers = [...new Set(lines.map((line) => line.pageNumber))];
  return pageNumbers.map((pageNumber) => {
    const pageLines = lines.filter((line) => line.pageNumber === pageNumber);
    return pageLines.length === 1 ? toEvidence(fieldPath, pageLines[0]!, fallbackText) : toCombinedEvidence(fieldPath, pageLines);
  });
}

function toSuggestedExperience(block: ParsedExperienceBlock): StructuredDraft["experiences"][number] {
  return {
    id: stableReviewEntityId("experience", `sibling:${block.anchor.pageNumber}:${block.anchor.sequence}:${block.role}:${block.organization}:${block.period}`),
    source: "extracted",
    role: block.role,
    organization: block.organization,
    period: block.period,
    description: block.description,
    evidenceText: [block.anchor.text, block.organizationLine?.text].filter(Boolean).join("\n"),
    page: block.anchor.pageNumber,
  };
}

function candidateId(block: ParsedExperienceBlock): string {
  return `candidate_${stableToken(`${block.anchor.pageNumber}:${block.anchor.sequence}:${block.role}:${block.organization}:${block.period}`)}`;
}

function sameSourceRegion(left: ParsedExperienceBlock, right: ParsedExperienceBlock): boolean {
  return left.anchor.pageNumber === right.anchor.pageNumber && left.anchor.sequence === right.anchor.sequence;
}

function findMatchingExperienceIndex(experiences: StructuredDraft["experiences"], block: ParsedExperienceBlock): number {
  const evidenceMatch = experiences.findIndex((experience) => experience.page === block.anchor.pageNumber
    && comparable(experience.evidenceText.split(/\r?\n/)[0]) === comparable(block.anchor.text));
  if (evidenceMatch >= 0) return evidenceMatch;
  const regional = experiences.findIndex((experience) => (
    experience.page === block.anchor.pageNumber
    && comparable(experience.role) === comparable(block.role)
    && (comparable(experience.organization) === comparable(block.organization) || comparable(experience.period) === comparable(block.period))
  ));
  if (regional >= 0) return regional;
  return experiences.findIndex((experience) => (
    comparable(experience.role) === comparable(block.role)
    && comparable(experience.organization) === comparable(block.organization)
    && comparable(experience.period) === comparable(block.period)
  ));
}

function isDuplicateBlockSuggestion(
  experiences: StructuredDraft["experiences"],
  suggestions: AdaptiveExperienceSuggestion[],
  block: ParsedExperienceBlock,
): boolean {
  const key = `${comparable(block.role)}|${comparable(block.organization)}|${comparable(block.period)}`;
  return experiences.some((item) => `${comparable(item.role)}|${comparable(item.organization)}|${comparable(item.period)}` === key)
    || suggestions.some((item) => item.proposedExperience
      && `${comparable(item.proposedExperience.role)}|${comparable(item.proposedExperience.organization)}|${comparable(item.proposedExperience.period)}` === key);
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
    return [{ index, fieldPath: reviewEntityFieldPath("experience", experience, input.field), currentValue: experience[input.field] ?? null, proposedValue }];
  });
}

function detectTopLevelExperienceBlocks(lines: CandidateLine[], learnedPatterns: Set<string>): ParsedExperienceBlock[] {
  const learnedSameLine = [...learnedPatterns].some((key) => key.includes("company-same-line"));
  const seeds = lines.flatMap((line, index) => {
    const period = extractPeriod(line.text);
    if (!period || isBullet(line.text) || SECTION_HEADING.test(line.text)) return [];
    const sameLine = parseSameLineHeader(line.text, period, learnedSameLine);
    const nextCompany = findAdjacentOrganization(lines, index, 1);
    const learnedNextLine = [...learnedPatterns].some((key) => key.includes("company-next-line"));
    const semanticHeader = ROLE_TERMS.test(line.text) || /^trajet[oó]ria\b/i.test(line.text) || line.emphasis === "strong";
    if (!sameLine && !nextCompany) return [];
    if (!semanticHeader && !(learnedNextLine && nextCompany)) return [];
    return [{ line, index, period, sameLine, nextCompany }];
  });
  return seeds.flatMap((seed, seedIndex) => {
    const nextAnchorIndex = seeds[seedIndex + 1]?.index ?? lines.length;
    const block = parseBlock(lines, seed.index, nextAnchorIndex, false, learnedSameLine);
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

function parseBlock(lines: CandidateLine[], anchorIndex: number, nextAnchorIndex: number, allowNearbyCompany = false, allowUnmarkedSameLine = false): ParsedExperienceBlock | null {
  const anchor = lines[anchorIndex];
  if (!anchor) return null;
  const period = extractPeriod(anchor.text) ?? extractPeriod(`${anchor.text} ${lines[anchorIndex + 1]?.text ?? ""}`);
  const sameLine = period ? parseSameLineHeader(anchor.text, period, allowUnmarkedSameLine) : null;
  let organizationLine = sameLine ? null : findAdjacentOrganization(lines, anchorIndex, 1);
  if (!organizationLine && allowNearbyCompany) organizationLine = findNearbyOrganization(lines, anchorIndex);
  const organization = sameLine?.organization ?? organizationLine?.text.trim() ?? "";
  const role = sameLine?.role ?? cleanHeaderRole(period ? removeExact(anchor.text, period) : anchor.text);
  if (!role || !organization || !isPlausibleOrganization(organization)) return null;
  const startIndex = organizationLine ? lines.indexOf(organizationLine) + 1 : anchorIndex + 1;
  const detectedBoundary = findNextTopLevelBoundary(lines, startIndex, nextAnchorIndex, allowUnmarkedSameLine);
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

function parseSameLineHeader(value: string, period: string, allowUnmarkedOrganization = false): { role: string; organization: string; description: string | null } | null {
  const periodIndex = value.toLowerCase().indexOf(period.toLowerCase());
  if (periodIndex < 0) return null;
  const before = value.slice(0, periodIndex).replace(/[|,;:\s]+$/, "").trim();
  const after = value.slice(periodIndex + period.length).replace(/^[|,;:\s]+/, "").trim();
  const atMatch = /^(.*?)\s+(?:at|em|@)\s+(.+)$/i.exec(before);
  if (atMatch && ROLE_TERMS.test(atMatch[1] ?? "") && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(atMatch[2] ?? "")) && isPlausibleOrganization(atMatch[2] ?? "")) {
    return { role: atMatch[1]!.trim(), organization: atMatch[2]!.trim(), description: after || null };
  }
  const commaIndex = before.lastIndexOf(",");
  if (commaIndex > 0) {
    const role = before.slice(0, commaIndex).trim();
    const organization = before.slice(commaIndex + 1).trim();
    if (ROLE_TERMS.test(role) && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(organization)) && isPlausibleOrganization(organization)) return { role, organization, description: after || null };
  }
  const parts = before.split(/\s+[|]\s+|\s+[-–]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && ROLE_TERMS.test(parts[0]!) && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(parts.at(-1)!)) && isPlausibleOrganization(parts.at(-1)!)) {
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

function findNextTopLevelBoundary(lines: CandidateLine[], startIndex: number, hardEnd: number, allowUnmarkedSameLine = false): number {
  for (let index = startIndex; index < hardEnd; index += 1) {
    const candidate = lines[index]!;
    if (NEXT_SECTION.test(candidate.text)) return index;
    const period = extractPeriod(candidate.text);
    if (!period || isBullet(candidate.text)) continue;
    const sameLine = parseSameLineHeader(candidate.text, period, allowUnmarkedSameLine);
    const nextCompany = findAdjacentOrganization(lines, index, 1);
    if (sameLine || nextCompany) return index;
  }
  return hardEnd;
}

function locateAnchor(
  lines: CandidateLine[],
  experience: StructuredDraft["experiences"][number],
  sourceRegion?: AdaptiveSourceRegion | null,
): number {
  if (sourceRegion) {
    const regionCenterX = sourceRegion.x + (sourceRegion.width / 2);
    const regionCenterY = sourceRegion.y + (sourceRegion.height / 2);
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    lines.forEach((line, index) => {
      if (line.pageNumber !== sourceRegion.pageNumber) return;
      const lineCenterY = line.y + (line.height / 2);
      const horizontallyAligned = regionCenterX >= line.x - 0.02 && regionCenterX <= line.x + line.width + 0.02;
      const verticallyAligned = regionCenterY >= line.y - 0.02 && regionCenterY <= line.y + line.height + 0.02;
      if (!horizontallyAligned || !verticallyAligned) return;
      const distance = Math.abs(lineCenterY - regionCenterY);
      if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
    });
    if (nearestIndex >= 0) return nearestIndex;
  }
  const evidenceAnchor = experience.evidenceText.split(/\r?\n/)[0]?.trim();
  if (evidenceAnchor) {
    const exact = lines.findIndex((line) => line.pageNumber === experience.page && comparable(line.text) === comparable(evidenceAnchor));
    if (exact >= 0) return exact;
  }
  const normalizedRole = comparable(removePeriodFragments(experience.role ?? ""));
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
    if (page.layoutLines?.length) return page.layoutLines.map((line) => ({ ...line, pageNumber: page.pageNumber, sequence: sequence++, origin: page.origin }));
    return page.text.split(/\r?\n|\s{2,}/).map((text, lineIndex) => ({ text: text.trim(), x: 0, y: Math.min(0.999, lineIndex / 100), width: 1, height: 0.012, fontSize: 0, emphasis: "regular" as const, pageNumber: page.pageNumber, sequence: sequence++, origin: page.origin }));
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
  if (field === "period") return extractPeriod(`${experience.evidenceText} ${experience.role ?? ""} ${experience.organization ?? ""} ${experience.period ?? ""}`);
  if (field === "organization") {
    const organization = experience.organization ?? "";
    const period = extractPeriod(organization);
    const candidate = period ? removeExact(organization, period) : organization;
    return isPlausibleOrganization(candidate) ? candidate.trim() : null;
  }
  return removePeriodFragments(experience.role ?? "").trim() || null;
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

function stableToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(8, "0");
}

function stripBullet(value: string): string { return value.replace(/^[•·▪◦*-]\s*/, "").trim(); }
function isBullet(value: string): boolean { return /^[•·▪◦*-]\s+/.test(value.trim()); }
function isPageFooter(value: string): boolean { return /\b(?:p[aá]gina|page)\s+\d+\b/i.test(value) && /curr[ií]culo|resume/i.test(value); }
function removeExact(value: string, token: string): string { return value.replace(token, " ").replace(/\s+/g, " ").trim().replace(/[|,;:-]+$/, "").trim(); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function toEvidence(fieldPath: string, line: CandidateLine, text: string): FieldEvidenceDescriptor {
  const spatial = line.fontSize > 0;
  return { fieldPath, pageNumber: line.pageNumber, text, x: spatial ? line.x : null, y: spatial ? line.y : null, width: spatial ? line.width : null, height: spatial ? line.height : null, method: spatial ? line.origin === "ocr" ? "tesseract-layout-v1" : "pdfjs-layout-v1" : "text-line-v1" };
}

function toCombinedEvidence(fieldPath: string, lines: CandidateLine[]): FieldEvidenceDescriptor {
  const pageLines = lines.filter((line) => line.pageNumber === lines[0]!.pageNumber);
  const left = Math.min(...pageLines.map((line) => line.x));
  const top = Math.min(...pageLines.map((line) => line.y));
  const right = Math.max(...pageLines.map((line) => line.x + line.width));
  const bottom = Math.max(...pageLines.map((line) => line.y + line.height));
  const spatial = pageLines[0]!.fontSize > 0;
  return { fieldPath, pageNumber: pageLines[0]!.pageNumber, text: pageLines.map((line) => line.text).join("\n"), x: spatial ? left : null, y: spatial ? top : null, width: spatial ? right - left : null, height: spatial ? bottom - top : null, method: spatial ? pageLines[0]!.origin === "ocr" ? "tesseract-layout-v1" : "pdfjs-layout-v1" : "text-line-v1" };
}
