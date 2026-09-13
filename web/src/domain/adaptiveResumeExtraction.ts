import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";
import { classifyEducationRecord } from "../../../src/domain/educationClassification.js";
import { normalizeDraftPeriods } from "./resumeDates.js";
import { RESUME_PERIOD_PATTERN } from "../../../src/domain/resumeDates.js";
import { reviewEntityFieldPath, stableReviewEntityId } from "./reviewFieldLifecycle.js";
import { extractResumeIdentity } from "../../../src/domain/resumeIdentity.js";
import {
  CUSTOM_PROFILE_SECTION_METHOD_VERSION,
  normalizeCustomSectionName,
  stableCustomSectionKey,
  type LearnedCustomSectionDefinition,
} from "./customProfileSections.js";
import {
  GENERIC_RECORD_PATTERN_VERSION,
  GENERIC_RECORD_SIGNATURE_VERSION,
  buildRelativeRecordSignature,
  compareRelativeRecordPattern,
  locateRecordAnchor,
  removeRepeatedMarginNoise,
  type RelativeRecordSignature,
} from "./documentRecordPatterns.js";

export const ADAPTIVE_EXTRACTION_CONTRACT_VERSION = "7.2.0";
export const ADAPTIVE_STRUCTURING_VERSION = "prisma-layout-adaptive-v10";
export const ADAPTIVE_REVIEW_METHOD_VERSION = "prisma-document-learning-v4";
export const ADAPTIVE_SIBLING_ALGORITHM_VERSION = GENERIC_RECORD_PATTERN_VERSION;
export const ADAPTIVE_SIBLING_SIGNATURE_VERSION = GENERIC_RECORD_SIGNATURE_VERSION;

export interface LayoutTextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  emphasis: "regular" | "strong";
  blockId?: string | null;
  blockType?: string | null;
  blockReadingOrder?: number | null;
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

export type AdaptiveRecordKind = "experience" | "education" | "certification";
export type ExperienceFieldName = "role" | "organization" | "period" | "description";
export type EducationFieldName = "course" | "institution" | "period" | "description";
export type AdaptiveRecordFieldName = ExperienceFieldName | EducationFieldName | "certification";

export interface AdaptiveFieldSuggestion {
  candidateId: string;
  recordKind: AdaptiveRecordKind;
  fieldPath: string;
  experienceIndex: number;
  field: AdaptiveRecordFieldName;
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
  recordKind: AdaptiveRecordKind;
  experienceIndex: number;
  label: string;
  patternKey: string;
  kind: "correction" | "new";
  classification: "strong" | "possible";
  proposedExperience: StructuredDraft["experiences"][number] | null;
  proposedEducation?: StructuredDraft["education"][number] | null;
  proposedCertification?: string | null;
  criteria: Array<"same-section" | "header-geometry" | "period-alignment" | "body-pattern" | "spacing" | "column-continuity" | "relative-topology" | "typography" | "block-type" | "reading-order">;
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
  recordKind: AdaptiveRecordKind;
  sourceIndex: number;
  sourceField: AdaptiveRecordFieldName;
  patternKey: string;
  methodVersion: string;
  algorithmVersion: typeof ADAPTIVE_SIBLING_ALGORITHM_VERSION;
  signatureVersion: typeof ADAPTIVE_SIBLING_SIGNATURE_VERSION;
  anchorExperienceId: string | null;
  anchorRecordId: string | null;
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

export function isRecordableSiblingScan(report: AdaptiveSuggestionReport): boolean {
  const signature = report.signatureSummary;
  const summary = report.candidateSummary;
  const signatureKeys = Object.keys(signature).sort();
  return Boolean(
    report.anchorExperienceId
      && /^experience_[a-z0-9]{8,64}$/.test(report.anchorExperienceId)
      && signatureKeys.join("|") === "blockTypePattern|hasBullets|headerEmphasis|lineCountBand|periodPlacement|recordKind|relativeIndentBand|secondaryPlacement|spatial"
      && ["same-line", "next-line", "missing", "single-value"].includes(String(signature.secondaryPlacement))
      && ["top", "body", "none"].includes(String(signature.periodPlacement))
      && ["regular", "strong"].includes(String(signature.headerEmphasis))
      && signature.spatial === true
      && typeof signature.hasBullets === "boolean"
      && ["experience", "education", "certification"].includes(String(signature.recordKind))
      && typeof signature.lineCountBand === "number"
      && typeof signature.relativeIndentBand === "number"
      && typeof signature.blockTypePattern === "string"
      && [summary.detected, summary.strong, summary.possible, summary.rejected].every((count) => Number.isInteger(count) && count >= 0 && count <= 1000)
      && summary.detected === summary.strong + summary.possible + summary.rejected
  );
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
  roleLine?: CandidateLine | null;
  periodLine?: CandidateLine | null;
  role: string;
  organization: string;
  period: string | null;
  description: string | null;
  descriptionLines: CandidateLine[];
  patternKey: string;
};

type ParsedEducationBlock = {
  anchor: CandidateLine;
  anchorIndex: number;
  institutionLine: CandidateLine | null;
  course: string;
  institution: string;
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

const ROLE_TERMS = /(analista|arquiteto|assistente|chief|consultor|coordenador|customer success|developer|desenvolvedor|diretor|engineer|engenheir[oa]|especialista|executivo|founder|fundador|gerente|head|l[ií]der|manager|mgmt|pm\/po|product owner|project manager|presidente|recruiter|supervisor|system analyst|technician|t[eé]cnico|vice[- ]presidente|coo|ceo|cto|cfo|cio)/i;
const SECTION_HEADING = /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience|forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|resumo|summary|perfil|s[ií]ntese de valor)/i;
const NEXT_SECTION = /^(forma[cç][aã]o|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|skills|idiomas|languages|certifica[cç][oõ]es|certifications|projetos|projects|cursos|s[ií]ntese de valor|informa[cç][oõ]es adicionais|additional information)/i;
const PROFESSIONAL_SUMMARY_LABEL = "(?:resumo profissional|resumo executivo|perfil profissional|perfil executivo|s[ií]ntese profissional|s[ií]ntese de qualifica[cç][oõ]es|professional summary|professional profile|career summary|executive summary)";
const PROFESSIONAL_SUMMARY_HEADING = new RegExp(`^${PROFESSIONAL_SUMMARY_LABEL}\\s*$`, "i");
const PROFESSIONAL_SUMMARY_INLINE_HEADING = new RegExp(`^${PROFESSIONAL_SUMMARY_LABEL}\\s*(?:[|:]|[-–—])\\s*(.+)$`, "i");
const PROFESSIONAL_SUMMARY_MERGED_HEADING = new RegExp(`^${PROFESSIONAL_SUMMARY_LABEL}\\s+(.{24,})$`, "i");
const RESUME_SECTION_BOUNDARY = /^(?:resumo profissional|resumo executivo|perfil profissional|perfil executivo|s[ií]ntese profissional|s[ií]ntese de qualifica[cç][oõ]es|professional summary|professional profile|career summary|executive summary|objetivo(?: profissional)?|professional objective|posicionamento executivo|principais resultados|resultados(?: e transforma[cç][oõ]es selecionadas)?|principais conquistas|resultados de destaque|selected results|key achievements|problemas empresariais(?: que est[aá] preparado para assumir)?|s[ií]ntese de valor|experi[eê]ncia(?: profissional)?|hist[oó]rico profissional|trajet[oó]ria profissional|professional experience|forma[cç][aã]o(?: acad[eê]mica)?|educa[cç][aã]o|education|compet[eê]ncias(?:-chave)?|habilidades|skills|expertise(?: t[eé]cnica)?|conhecimentos(?: t[eé]cnicos)?|technical skills|core competencies|ferramentas(?: e tecnologias)?|tecnologias|idiomas|languages|certifica[cç][oõ]es|certifications|projetos|projects|cursos|courses|publica[cç][oõ]es|publications|informa[cç][oõ]es adicionais|additional information|voluntariado|volunteer experience|refer[eê]ncias|references)(?:\s*[|:]|$)/i;
const PERIOD_TOKEN = /\b(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:[cç]o|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:tember)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?|0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4}))\b|\b(?:19|20)\d{2}\s*(?:a|at[eé]|to|[-–])\s*(?:atual|presente|present|current|(?:19|20)\d{2})\b/i;
const OCR_DEGRADED_NUMERIC_PERIOD = /\b(?:0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})(?:(?:\s*[-–]\s*)|\s+)(?:0?[1-9]|1[0-2])[\/.\- ](?:\d{2}|\d{4})\b/i;
const COMPANY_MARKERS = /\b(solutions?|engenharia|empreendimentos?|consultoria|sistemas?|education|educa[cç][aã]o|comercial|ltda|s\.?a\.?|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade|tecnologia)\b/i;
const SAME_LINE_COMPANY_MARKERS = /\b(solutions?|engenharia|empreendimentos?|sistemas?|education|educa[cç][aã]o|comercial|ltda|s\.?a\.?|inc\.?|corp\.?|group|company|companhia|banco|universidade|faculdade)\b/i;
const EDUCATION_TERMS = /\b(universidade|faculdade|bacharel(?:ado)?|licenciatura|tecnologia em|tecn[oó]logo|curso t[eé]cnico|t[eé]cnico em|mba|especializa[cç][aã]o|p[oó]s[- ]?gradua[cç][aã]o|mestrado|doutorado|p[oó]s[- ]?doutorado|university|college|bachelor|licentiate|technologist|technical (?:course|diploma|program)|master|doctorate|postdoctoral)\b/i;
const INSTITUTION_TERMS = /\b(universidade|faculdade|centro universit[aá]rio|instituto|escola|academy|university|college|school)\b/i;
const CERTIFICATION_TERMS = /\b(certifica[cç][aã]o|certificado|certified|certificate|certification|credencial|credential)\b/i;
const COURSE_TERMS = /\b(curso|treinamento|forma[cç][aã]o complementar|workshop|bootcamp|training)\b/i;

export function buildAdaptiveExtraction(
  pages: ExtractedPage[],
  learnedPatterns: ExtractionPatternSignal[] = [],
  learnedCustomSections: LearnedCustomSectionDefinition[] = [],
): AdaptiveExtractionResult {
  const lines = candidateLines(pages);
  const learnedPatternKeys = new Set(
    learnedPatterns
      .filter((signal) => [ADAPTIVE_REVIEW_METHOD_VERSION, "prisma-document-learning-v3", "prisma-document-learning-v2"].includes(signal.methodVersion) && signal.confirmationCount > 0)
      .map((signal) => signal.patternKey),
  );
  const blocks = detectTopLevelExperienceBlocks(sliceExperienceSection(lines), learnedPatternKeys);
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
    if (block.period) fieldEvidence.push(toEvidence(reviewEntityFieldPath("experience", experience, "period"), evidenceLineForField(block, "period"), block.period));
    if (block.descriptionLines.length) fieldEvidence.push(toCombinedEvidence(reviewEntityFieldPath("experience", experience, "description"), block.descriptionLines));
    if (block.organizationLine) nextLineCompanyCount += 1;
    else sameLineCount += 1;
  }

  const fullText = pages.map((page) => page.text).join("\n");
  const allLines = candidateLines(pages);
  const educationBlocks = detectEducationBlocks(allLines);
  const education = educationBlocks.slice(0, 8).map((block) => {
    const classification = classifyEducationRecord({ course: block.course, originalText: block.anchor.text, period: block.period, description: block.description });
    const educationItem = {
      id: stableReviewEntityId("education", `${block.anchor.pageNumber}:${block.anchor.sequence}:${block.course}:${block.institution}`),
      source: "extracted" as const,
      institution: block.institution,
      period: block.period,
      description: block.description,
      evidenceText: [block.anchor.text, block.institutionLine?.text].filter(Boolean).join("\n"),
      page: block.anchor.pageNumber,
      ...classification,
    };
    fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "course"), block.anchor, educationItem.course ?? block.anchor.text));
    if (block.institutionLine || block.institution) fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "institution"), block.institutionLine ?? block.anchor, block.institution));
    if (block.period) fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "period"), block.anchor, block.period));
    if (block.descriptionLines.length) fieldEvidence.push(toCombinedEvidence(reviewEntityFieldPath("education", educationItem, "description"), block.descriptionLines));
    if (classification.level !== "unknown") fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "level"), block.anchor, classification.level));
    if (classification.qualification !== "unknown") fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "qualification"), block.anchor, classification.qualification));
    if (classification.status !== "unknown") fieldEvidence.push(toEvidence(reviewEntityFieldPath("education", educationItem, "status"), block.anchor, block.anchor.text));
    return educationItem;
  });
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
    certifications: detectCertificationRecords(allLines).slice(0, 16).map((entry) => entry.text),
    languages,
    competencies,
    customSections: learnedCustom.sections,
    uncertainties: [],
    notIdentified: [
      ...(experiences.length ? [] : ["experiências estruturáveis"]),
      ...(education.length ? [] : ["formação acadêmica"]),
      ...(competencies.length ? [] : ["competências explícitas"]),
      ...(languages.length ? [] : ["idiomas"]),
      ...(structuredSummary.summary ? [] : ["resumo profissional"]),
    ],
  };
  return {
    draft: normalizeDraftPeriods(draft),
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
  const summaryLines = professionalSummarySectionContent(lines);
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

function professionalSummarySectionContent(lines: CandidateLine[]): CandidateLine[] {
  const headingIndex = lines.findIndex((line) => professionalSummaryHeading(line) !== undefined);
  if (headingIndex < 0) return [];
  const heading = lines[headingIndex]!;
  const content: CandidateLine[] = [];
  const inlineContent = professionalSummaryHeading(heading);
  if (inlineContent) content.push({ ...heading, text: inlineContent });
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.pageNumber !== heading.pageNumber || isSummarySectionHeading(line.text)) break;
    if (!isPageFooter(line.text)) content.push(line);
  }
  return content.slice(0, 40);
}

function professionalSummaryHeading(line: CandidateLine): string | null | undefined {
  const value = line.text.trim();
  if (PROFESSIONAL_SUMMARY_HEADING.test(value)) return null;
  const delimited = value.match(PROFESSIONAL_SUMMARY_INLINE_HEADING)?.[1]?.trim();
  if (delimited) return delimited;
  const merged = line.emphasis === "strong" ? value.match(PROFESSIONAL_SUMMARY_MERGED_HEADING)?.[1]?.trim() : null;
  return merged || undefined;
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
  return RESUME_SECTION_BOUNDARY.test(value.trim());
}

function joinSectionText(lines: CandidateLine[]): string {
  return lines.map((line) => stripBullet(line.text)).join("\n").trim();
}

function findExplicitLine(lines: CandidateLine[], value: string | null): CandidateLine | null {
  if (!value) return null;
  const normalized = comparable(value);
  return lines.find((line) => comparable(line.text).includes(normalized)) ?? null;
}

export function normalizeLinkedinUrl(value: string): string {
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

function detectEducationBlocks(lines: CandidateLine[]): ParsedEducationBlock[] {
  const courseTerms = /\b(bacharel(?:ado)?|licenciatura|tecnologia em|tecn[oó]logo|curso t[eé]cnico|t[eé]cnico em|mba|especializa[cç][aã]o|p[oó]s[- ]?gradua[cç][aã]o|mestrado|doutorado|p[oó]s[- ]?doutorado|bachelor|licentiate|technologist|technical (?:course|diploma|program)|master|doctorate|postdoctoral)\b/i;
  const seeds = lines.flatMap((line, index) => {
    if (SECTION_HEADING.test(line.text) || !EDUCATION_TERMS.test(line.text)) return [];
    if (!courseTerms.test(line.text)) {
      const previous = lines[index - 1];
      if (previous?.pageNumber === line.pageNumber && courseTerms.test(previous.text)) return [];
    }
    return [{ index }];
  });
  return seeds.flatMap((seed, seedIndex) => {
    const hardEnd = seeds[seedIndex + 1]?.index ?? lines.length;
    const block = parseEducationBlock(lines, seed.index, hardEnd);
    return block ? [block] : [];
  });
}

function parseEducationBlock(lines: CandidateLine[], anchorIndex: number, hardEnd: number): ParsedEducationBlock | null {
  const anchor = lines[anchorIndex];
  if (!anchor) return null;
  const period = extractPeriod(anchor.text)
    ?? extractPeriod(lines[anchorIndex - 1]?.pageNumber === anchor.pageNumber ? lines[anchorIndex - 1]!.text : "")
    ?? extractPeriod(lines[anchorIndex + 1]?.pageNumber === anchor.pageNumber ? lines[anchorIndex + 1]!.text : "");
  const withoutPeriod = period ? removeExact(anchor.text, period) : anchor.text.trim();
  const inline = splitEducationHeader(withoutPeriod);
  let institutionLine = inline.institution ? null : findAdjacentInstitution(lines, anchorIndex);
  const institution = inline.institution || institutionLine?.text.trim() || "Não identificada";
  const course = inline.course.trim();
  if (!course || (!EDUCATION_TERMS.test(course) && !EDUCATION_TERMS.test(anchor.text))) return null;
  const startIndex = institutionLine ? lines.indexOf(institutionLine) + 1 : anchorIndex + 1;
  let endIndex = hardEnd;
  for (let index = startIndex; index < hardEnd; index += 1) {
    const candidate = lines[index]!;
    if (RESUME_SECTION_BOUNDARY.test(candidate.text) || (candidate.pageNumber === anchor.pageNumber && EDUCATION_TERMS.test(candidate.text) && candidate.emphasis === "strong")) {
      endIndex = index;
      break;
    }
  }
  const descriptionLines = lines.slice(startIndex, endIndex).filter((line) => line.pageNumber === anchor.pageNumber && !isPageFooter(line.text) && !SECTION_HEADING.test(line.text));
  const description = descriptionLines.map((line) => stripBullet(line.text)).filter(Boolean).join("\n") || null;
  return {
    anchor,
    anchorIndex,
    institutionLine,
    course,
    institution,
    period,
    description,
    descriptionLines,
    patternKey: `record:education:block-v1:${institutionLine ? "institution-next-line" : inline.institution ? "institution-same-line" : "institution-missing"}`,
  };
}

function splitEducationHeader(value: string): { course: string; institution: string } {
  const separators = value.split(/\s+[|]\s+|\s+[-–]\s+|\s{2,}/).map((part) => part.trim()).filter(Boolean);
  if (separators.length >= 2) {
    const institutionIndex = separators.findIndex((part) => INSTITUTION_TERMS.test(part));
    if (institutionIndex > 0) return { course: separators.slice(0, institutionIndex).join(" - "), institution: separators.slice(institutionIndex).join(" - ") };
  }
  const marker = value.search(INSTITUTION_TERMS);
  if (marker > 2) return { course: value.slice(0, marker).replace(/[|,;:-]+$/, "").trim(), institution: value.slice(marker).trim() };
  return { course: value.trim(), institution: "" };
}

function findAdjacentInstitution(lines: CandidateLine[], anchorIndex: number): CandidateLine | null {
  const anchor = lines[anchorIndex];
  for (const distance of [1, -1, 2]) {
    const candidate = lines[anchorIndex + distance];
    if (!candidate || candidate.pageNumber !== anchor?.pageNumber) continue;
    if (INSTITUTION_TERMS.test(candidate.text) && !SECTION_HEADING.test(candidate.text)) return candidate;
  }
  return null;
}

function detectCertificationRecords(lines: CandidateLine[]): CandidateLine[] {
  const sectionLines = sectionContent(lines, /^(certifica[cç][oõ]es|certifications?|cursos|courses|forma[cç][aã]o complementar|additional training)\s*(?:[|:]|$)/i)
    .filter((line) => !RESUME_SECTION_BOUNDARY.test(line.text));
  const direct = lines.filter((line) => (CERTIFICATION_TERMS.test(line.text) || COURSE_TERMS.test(line.text)) && !SECTION_HEADING.test(line.text));
  return [...new Map([...sectionLines, ...direct].map((line) => [`${line.pageNumber}:${line.sequence}`, line])).values()]
    .filter((line) => stripBullet(line.text).length >= 3)
    .map((line) => ({ ...line, text: stripBullet(line.text) }));
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
    recordKind: "experience",
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: "experience:block-unconfirmed",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: sourceAfter?.id ?? null,
    anchorRecordId: sourceAfter?.id ?? null,
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

  const lines = candidateLines(input.pages);
  const sourceAnchorIndex = locateAnchor(lines, sourceAfter, input.sourceRegion);
  const strictSourceBlock = sourceAnchorIndex >= 0
    ? parseBlock(lines, sourceAnchorIndex, findNextTopLevelBoundary(lines, sourceAnchorIndex + 1, lines.length), true)
    : null;
  const strictSourceConfirmed = strictSourceBlock
    && (["role", "organization", "period"] as const).every((field) => comparable(fieldValue(strictSourceBlock, field)) === comparable(fieldValue(sourceAfter, field)));
  const sourceBlock = strictSourceConfirmed
    ? strictSourceBlock
    : sourceAnchorIndex >= 0
      ? parseGroupedExperienceBlock(lines, sourceAnchorIndex)
        ?? parseParallelExperienceBlock(lines, sourceAnchorIndex)
        ?? parseBlock(lines, sourceAnchorIndex, findNextTopLevelBoundary(lines, sourceAnchorIndex + 1, lines.length, true), true, true)
      : null;
  if (!sourceBlock) return emptyReport("source-block-not-found", "O bloco corrigido não pôde ser reencontrado com segurança na fonte original.");
  // A persisted reviewer region establishes which source block was corrected.
  // Requiring OCR text to equal the corrected value would reject the errors
  // that this learning loop is specifically intended to repair.
  const sourceConfirmedByRegion = Boolean(input.sourceRegion);
  if (!sourceConfirmedByRegion && !(["role", "organization", "period"] as const).every((field) => comparable(fieldValue(sourceBlock, field)) === comparable(fieldValue(sourceAfter, field)))) {
    return emptyReport("source-correction-not-confirmed", "A fonte original não confirmou a mesma transformação aplicada pelo revisor.");
  }

  const signature = buildSiblingSignature(sourceBlock);
  const blocks = detectTopLevelExperienceBlocks(sliceExperienceSection(lines), new Set([sourceBlock.patternKey]));
  const suggestions: AdaptiveExperienceSuggestion[] = [];
  const unresolved: AdaptiveUnresolvedSibling[] = [];
  let rejected = 0;
  for (const block of blocks) {
    if (sameSourceRegion(block, sourceBlock)) continue;
    const existingIndex = findMatchingExperienceIndex(input.draft.experiences, block);
    const classification = existingIndex >= 0 && !signature.relative.spatial
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
        candidateId: candidateId(block), recordKind: "experience", experienceIndex: existingIndex, label: block.role, patternKey: sourceBlock.patternKey,
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
      candidateId: candidateId(block), recordKind: "experience", experienceIndex, label: block.role, patternKey: sourceBlock.patternKey,
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
    recordKind: "experience",
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: sourceBlock.patternKey,
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: sourceAfter.id,
    anchorRecordId: sourceAfter.id,
    signatureSummary: signature.summary,
    // The server contract counts only classified candidates. Existing siblings
    // that produce no safe change remain visible as unresolved context, but are
    // not candidates for application and must not inflate `detected`.
    candidateSummary: { detected: strong + possible + rejected, strong, possible, rejected },
    suggestions,
    unresolved,
  };
}

export function proposeSiblingEducationCorrections(input: {
  pages: ExtractedPage[];
  draft: StructuredDraft;
  sourceIndex: number;
  sourceField: EducationFieldName;
  extracted: StructuredDraft;
  sourceRegion?: AdaptiveSourceRegion | null;
}): AdaptiveSuggestionReport {
  const sourceBefore = input.extracted.education[input.sourceIndex];
  const sourceAfter = input.draft.education[input.sourceIndex];
  const emptyReport = (reason: AdaptiveUnresolvedSibling["reasonCode"], explanation: string): AdaptiveSuggestionReport => ({
    recordKind: "education",
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: "record:education:block-unconfirmed",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: null,
    anchorRecordId: sourceAfter?.id ?? null,
    signatureSummary: {},
    candidateSummary: { detected: 0, strong: 0, possible: 0, rejected: 0 },
    suggestions: [],
    unresolved: sourceAfter ? [{ experienceIndex: input.sourceIndex, label: sourceAfter.course ?? sourceAfter.institution ?? "Formação", reasonCode: reason, explanation }] : [],
  });
  if (!sourceAfter) return emptyReport("source-block-not-found", "A formação revisada não existe mais no rascunho atual.");
  if (!sourceAfter.course?.trim() || !sourceAfter.institution?.trim() || sourceAfter.institution === "Não identificada") {
    return emptyReport("source-incomplete", "Conclua curso e instituição antes de usar esta formação como referência estrutural.");
  }
  if (sourceBefore && comparable(educationFieldValue(sourceBefore, input.sourceField)) === comparable(educationFieldValue(sourceAfter, input.sourceField))) {
    return emptyReport("source-correction-not-confirmed", "A correção de origem não alterou o campo e não confirma um padrão novo.");
  }
  const lines = candidateLines(input.pages);
  const sourceAnchorIndex = locateRecordAnchor(
    lines,
    [sourceAfter.course, sourceAfter.institution, sourceAfter.period, sourceAfter.description, sourceAfter.evidenceText],
    input.sourceRegion ? [input.sourceRegion] : [],
    (line) => EDUCATION_TERMS.test(line.text) || line.emphasis === "strong",
  );
  const sourceBlock = sourceAnchorIndex >= 0 ? parseEducationBlock(lines, sourceAnchorIndex, findNextEducationBoundary(lines, sourceAnchorIndex + 1)) : null;
  if (!sourceBlock) return emptyReport("source-block-not-found", "O bloco de formação não pôde ser reencontrado com segurança na fonte original.");
  if (!educationSourceConfirmed(sourceBlock, sourceAfter)) {
    return emptyReport("source-correction-not-confirmed", "A fonte original não confirmou curso e instituição no mesmo bloco revisado.");
  }

  const sourceSignature = buildRelativeRecordSignature(educationBlockLines(sourceBlock));
  const signatureSummary: AdaptiveSuggestionReport["signatureSummary"] = {
    recordKind: "education",
    secondaryPlacement: sourceBlock.institutionLine ? "next-line" : sourceBlock.institution === "Não identificada" ? "missing" : "same-line",
    periodPlacement: sourceSignature.periodPlacement,
    headerEmphasis: sourceSignature.headerEmphasis,
    spatial: sourceSignature.spatial,
    hasBullets: sourceSignature.hasBullets,
    lineCountBand: sourceSignature.lineCountBand,
    relativeIndentBand: sourceSignature.relativeIndentBand,
    blockTypePattern: sourceSignature.blockTypePattern,
  };
  const suggestions: AdaptiveExperienceSuggestion[] = [];
  const unresolved: AdaptiveUnresolvedSibling[] = [];
  let rejected = 0;
  for (const block of detectEducationBlocks(lines)) {
    if (block.anchor.pageNumber === sourceBlock.anchor.pageNumber && block.anchor.sequence === sourceBlock.anchor.sequence) continue;
    const comparison = compareRelativeRecordPattern(sourceSignature, educationBlockLines(block));
    const existingIndex = findMatchingEducationIndex(input.draft.education, block);
    if (comparison.classification === "rejected") {
      rejected += 1;
      unresolved.push({ experienceIndex: existingIndex >= 0 ? existingIndex : input.draft.education.length + suggestions.length, label: block.course, reasonCode: "ambiguous-candidate", explanation: "O bloco acadêmico não repetiu a topologia confirmada com segurança suficiente." });
      continue;
    }
    if (existingIndex >= 0) {
      const current = input.draft.education[existingIndex]!;
      const extracted = input.extracted.education.find((item) => item.id === current.id) ?? input.extracted.education[existingIndex] ?? null;
      const fields = buildAdaptiveEducationFields(block, current, existingIndex, extracted);
      if (fields.length) suggestions.push({ candidateId: educationCandidateId(block), recordKind: "education", experienceIndex: existingIndex, label: block.course, patternKey: sourceBlock.patternKey, kind: "correction", classification: comparison.classification, proposedExperience: null, proposedEducation: null, criteria: mapRelativeCriteria(comparison.criteria), explanation: "A formação existente foi relida no próprio bloco sem sobrescrever decisões humanas.", fields });
      continue;
    }
    const proposedEducation = toSuggestedEducation(block);
    const recordIndex = input.draft.education.length + suggestions.filter((item) => item.kind === "new").length;
    suggestions.push({ candidateId: educationCandidateId(block), recordKind: "education", experienceIndex: recordIndex, label: block.course, patternKey: sourceBlock.patternKey, kind: "new", classification: comparison.classification, proposedExperience: null, proposedEducation, criteria: mapRelativeCriteria(comparison.criteria), explanation: comparison.classification === "strong" ? "O bloco repete a estrutura acadêmica confirmada e pode ser aplicado após revisão." : "O bloco parece acadêmico, mas exige revisão individual.", fields: buildAdaptiveEducationFields(block, proposedEducation, recordIndex, null, true) });
  }
  const strong = suggestions.filter((item) => item.classification === "strong").length;
  const possible = suggestions.filter((item) => item.classification === "possible").length;
  return {
    recordKind: "education",
    sourceIndex: input.sourceIndex,
    sourceField: input.sourceField,
    patternKey: sourceBlock.patternKey,
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: null,
    anchorRecordId: sourceAfter.id,
    signatureSummary,
    candidateSummary: { detected: strong + possible + rejected, strong, possible, rejected },
    suggestions,
    unresolved,
  };
}

function findNextEducationBoundary(lines: CandidateLine[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (RESUME_SECTION_BOUNDARY.test(line.text) || (EDUCATION_TERMS.test(line.text) && line.emphasis === "strong")) return index;
  }
  return lines.length;
}

function educationSourceConfirmed(block: ParsedEducationBlock, source: StructuredDraft["education"][number]): boolean {
  const course = comparable(block.course);
  const institution = comparable(block.institution);
  const expectedCourse = comparable(source.course);
  const expectedInstitution = comparable(source.institution);
  return Boolean(course && institution && expectedCourse && expectedInstitution
    && (course.includes(expectedCourse) || expectedCourse.includes(course))
    && (institution.includes(expectedInstitution) || expectedInstitution.includes(institution)));
}

function educationFieldValue(value: StructuredDraft["education"][number] | ParsedEducationBlock, field: EducationFieldName): string | null {
  const result = value[field];
  return typeof result === "string" && result.trim() ? result.trim() : null;
}

function educationBlockLines(block: ParsedEducationBlock): CandidateLine[] {
  return [...new Map([block.anchor, block.institutionLine, ...block.descriptionLines].filter((line): line is CandidateLine => Boolean(line)).map((line) => [`${line.pageNumber}:${line.sequence}`, line])).values()];
}

function findMatchingEducationIndex(items: StructuredDraft["education"], block: ParsedEducationBlock): number {
  return items.findIndex((item) => comparable(item.course) === comparable(block.course)
    && (comparable(item.institution) === comparable(block.institution) || comparable(item.period) === comparable(block.period)));
}

function educationCandidateId(block: ParsedEducationBlock): string {
  return `candidate_${stableToken(`education:${block.anchor.pageNumber}:${block.anchor.sequence}:${block.course}:${block.institution}:${block.period}`)}`;
}

function toSuggestedEducation(block: ParsedEducationBlock): StructuredDraft["education"][number] {
  const classification = classifyEducationRecord({ course: block.course, originalText: block.anchor.text, period: block.period, description: block.description });
  return {
    ...classification,
    id: stableReviewEntityId("education", `sibling:${block.anchor.pageNumber}:${block.anchor.sequence}:${block.course}:${block.institution}:${block.period}`),
    source: "extracted",
    institution: block.institution,
    period: block.period,
    description: block.description,
    evidenceText: [block.anchor.text, block.institutionLine?.text].filter(Boolean).join("\n"),
    page: block.anchor.pageNumber,
  };
}

function buildAdaptiveEducationFields(block: ParsedEducationBlock, education: StructuredDraft["education"][number], recordIndex: number, extracted: StructuredDraft["education"][number] | null, isNew = false): AdaptiveFieldSuggestion[] {
  return (["course", "institution", "period", "description"] as const).flatMap((field) => {
    const proposedValue = educationFieldValue(block, field);
    if (!proposedValue) return [];
    const currentValue = isNew ? null : educationFieldValue(education, field);
    if (!isNew && (comparable(proposedValue) === comparable(currentValue) || !extracted || comparable(currentValue) !== comparable(educationFieldValue(extracted, field)))) return [];
    const fieldPath = reviewEntityFieldPath("education", education, field);
    const evidenceLines = field === "description" ? block.descriptionLines : field === "institution" && block.institutionLine ? [block.institutionLine] : [block.anchor];
    const evidences = toEvidenceByPage(fieldPath, evidenceLines, proposedValue);
    return [{ candidateId: education.id, recordKind: "education", fieldPath, experienceIndex: recordIndex, field, currentValue, proposedValue, pageNumber: evidences[0]?.pageNumber ?? block.anchor.pageNumber, evidenceText: evidences[0]?.text ?? proposedValue, evidence: evidences[0] ?? null, evidences, rationaleCode: "same-document-block-pattern" as const, explanation: `O campo ${field === "course" ? "curso" : field === "institution" ? "instituição" : field === "period" ? "período" : "descrição"} foi relido no próprio bloco acadêmico.` }];
  });
}

function mapRelativeCriteria(criteria: Array<"relative-topology" | "typography" | "period-structure" | "body-pattern" | "block-type" | "reading-order">): SiblingCriterion[] {
  return criteria.map((criterion) => criterion === "period-structure" ? "period-alignment" : criterion);
}

export function proposeSiblingCertificationCorrections(input: {
  pages: ExtractedPage[];
  draft: StructuredDraft;
  sourceIndex: number;
  extracted: StructuredDraft;
  sourceRegion?: AdaptiveSourceRegion | null;
}): AdaptiveSuggestionReport {
  const sourceValue = input.draft.certifications[input.sourceIndex];
  const sourceBefore = input.extracted.certifications[input.sourceIndex];
  const anchorId = sourceValue ? `certification_${stableToken(sourceValue)}` : null;
  const emptyReport = (reason: AdaptiveUnresolvedSibling["reasonCode"], explanation: string): AdaptiveSuggestionReport => ({
    recordKind: "certification",
    sourceIndex: input.sourceIndex,
    sourceField: "certification",
    patternKey: "record:certification:block-unconfirmed",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: null,
    anchorRecordId: anchorId,
    signatureSummary: {},
    candidateSummary: { detected: 0, strong: 0, possible: 0, rejected: 0 },
    suggestions: [],
    unresolved: sourceValue ? [{ experienceIndex: input.sourceIndex, label: sourceValue, reasonCode: reason, explanation }] : [],
  });
  if (!sourceValue?.trim()) return emptyReport("source-incomplete", "Confirme ao menos um curso ou certificação para ensinar este padrão.");
  if (sourceBefore && comparable(sourceBefore) === comparable(sourceValue)) return emptyReport("source-correction-not-confirmed", "A revisão não alterou este registro e não confirmou um padrão novo.");
  const lines = candidateLines(input.pages);
  const anchorIndex = locateRecordAnchor(lines, [sourceValue], input.sourceRegion ? [input.sourceRegion] : [], (line) => CERTIFICATION_TERMS.test(line.text) || COURSE_TERMS.test(line.text));
  const sourceLine = lines[anchorIndex];
  if (!sourceLine) return emptyReport("source-block-not-found", "O curso ou certificação não pôde ser reencontrado na fonte original.");
  const sourceSignature = buildRelativeRecordSignature([sourceLine]);
  const suggestions: AdaptiveExperienceSuggestion[] = [];
  let rejected = 0;
  for (const candidate of detectCertificationRecords(lines)) {
    if (candidate.pageNumber === sourceLine.pageNumber && candidate.sequence === sourceLine.sequence) continue;
    if (input.draft.certifications.some((value) => comparable(value) === comparable(candidate.text))) continue;
    const comparison = compareRelativeRecordPattern(sourceSignature, [candidate]);
    if (comparison.classification === "rejected") { rejected += 1; continue; }
    const candidateIdValue = `certification_${stableToken(`${candidate.pageNumber}:${candidate.sequence}:${candidate.text}`)}`;
    const fieldPath = "certifications";
    const evidence = toEvidence(fieldPath, candidate, candidate.text);
    suggestions.push({
      candidateId: candidateIdValue,
      recordKind: "certification",
      experienceIndex: input.draft.certifications.length + suggestions.length,
      label: candidate.text,
      patternKey: "record:certification:block-v1:single-value",
      kind: "new",
      classification: comparison.classification,
      proposedExperience: null,
      proposedCertification: candidate.text,
      criteria: mapRelativeCriteria(comparison.criteria),
      explanation: comparison.classification === "strong" ? "O registro repete a estrutura do curso ou certificação confirmado." : "O registro pode pertencer ao mesmo conjunto e exige revisão individual.",
      fields: [{ candidateId: candidateIdValue, recordKind: "certification", fieldPath, experienceIndex: input.draft.certifications.length + suggestions.length, field: "certification", currentValue: null, proposedValue: candidate.text, pageNumber: candidate.pageNumber, evidenceText: candidate.text, evidence, evidences: [evidence], rationaleCode: "same-document-block-pattern", explanation: "O valor foi lido diretamente no próprio bloco repetido." }],
    });
  }
  const strong = suggestions.filter((item) => item.classification === "strong").length;
  const possible = suggestions.filter((item) => item.classification === "possible").length;
  return {
    recordKind: "certification",
    sourceIndex: input.sourceIndex,
    sourceField: "certification",
    patternKey: "record:certification:block-v1:single-value",
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
    algorithmVersion: ADAPTIVE_SIBLING_ALGORITHM_VERSION,
    signatureVersion: ADAPTIVE_SIBLING_SIGNATURE_VERSION,
    anchorExperienceId: null,
    anchorRecordId: anchorId,
    signatureSummary: {
      recordKind: "certification",
      secondaryPlacement: "single-value",
      periodPlacement: sourceSignature.periodPlacement,
      headerEmphasis: sourceSignature.headerEmphasis,
      spatial: sourceSignature.spatial,
      hasBullets: sourceSignature.hasBullets,
      lineCountBand: sourceSignature.lineCountBand,
      relativeIndentBand: sourceSignature.relativeIndentBand,
      blockTypePattern: sourceSignature.blockTypePattern,
    },
    candidateSummary: { detected: strong + possible + rejected, strong, possible, rejected },
    suggestions,
    unresolved: [],
  };
}

type SiblingCriterion = AdaptiveExperienceSuggestion["criteria"][number];
type SiblingSignature = {
  companyPlacement: "same-line" | "next-line";
  hasPeriodValue: boolean;
  relative: RelativeRecordSignature;
  summary: AdaptiveSuggestionReport["signatureSummary"];
};

function isCompleteExperience(experience: StructuredDraft["experiences"][number]): boolean {
  return Boolean(experience.role?.trim() && experience.organization?.trim() && experience.period?.trim() && experience.description?.trim());
}

function buildSiblingSignature(block: ParsedExperienceBlock): SiblingSignature {
  const companyPlacement = block.organizationLine ? "next-line" : "same-line";
  const relative = buildRelativeRecordSignature(blockLines(block));
  return {
    companyPlacement,
    hasPeriodValue: Boolean(block.period),
    relative,
    summary: {
      recordKind: "experience",
      secondaryPlacement: companyPlacement,
      periodPlacement: relative.periodPlacement,
      headerEmphasis: relative.headerEmphasis,
      spatial: relative.spatial,
      hasBullets: relative.hasBullets,
      lineCountBand: relative.lineCountBand,
      relativeIndentBand: relative.relativeIndentBand,
      blockTypePattern: relative.blockTypePattern,
    },
  };
}

function classifySiblingCandidate(
  signature: SiblingSignature,
  block: ParsedExperienceBlock,
): { kind: "strong" | "possible"; criteria: SiblingCriterion[] } | { kind: "rejected"; reason: AdaptiveUnresolvedSibling["reasonCode"]; explanation: string } {
  const comparison = compareRelativeRecordPattern(signature.relative, blockLines(block));
  if (comparison.reason === "insufficient-geometry") {
    return { kind: "rejected", reason: "ambiguous-candidate", explanation: "A fonte não possui geometria posicionada suficiente para reconhecer um novo bloco com segurança." };
  }
  const criteria = comparison.criteria.map((criterion): SiblingCriterion => criterion === "period-structure" ? "period-alignment" : criterion);
  if ((block.organizationLine ? "next-line" : "same-line") === signature.companyPlacement) criteria.push("spacing");
  if (comparison.classification === "strong" && signature.hasPeriodValue === Boolean(block.period)) return { kind: "strong", criteria };
  if (comparison.classification === "strong") return { kind: "possible", criteria };
  if (comparison.classification === "possible") return { kind: "possible", criteria };
  return { kind: "rejected", reason: "ambiguous-candidate", explanation: "O bloco não repetiu topologia, tipografia e conteúdo suficientes para virar uma sugestão segura." };
}

function blockLines(block: ParsedExperienceBlock): CandidateLine[] {
  const values = [block.anchor, block.organizationLine, block.roleLine, block.periodLine, ...block.descriptionLines].filter((line): line is CandidateLine => Boolean(line));
  return [...new Map(values.map((line) => [`${line.pageNumber}:${line.sequence}`, line])).values()];
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
      candidateId: experience.id, recordKind: "experience", fieldPath, experienceIndex, field, currentValue, proposedValue,
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
    const semanticHeader = ROLE_TERMS.test(line.text) || /^trajet[oó]ria\b/i.test(line.text) || line.emphasis === "strong" || Boolean(learnedSameLine && sameLine);
    if (!sameLine && !nextCompany) return [];
    if (!semanticHeader && !(learnedNextLine && nextCompany)) return [];
    return [{ line, index, period, sameLine, nextCompany }];
  });
  const semanticBlocks = seeds.flatMap((seed, seedIndex) => {
    const nextAnchorIndex = seeds[seedIndex + 1]?.index ?? lines.length;
    const block = parseBlock(lines, seed.index, nextAnchorIndex, false, learnedSameLine);
    return block ? [block] : [];
  });
  const groupedBlocks = detectGroupedExperienceBlocks(lines);
  const parallelBlocks = detectParallelExperienceBlocks(lines);
  return [...new Map([...semanticBlocks, ...parallelBlocks, ...groupedBlocks].map((block) => [block.anchor.blockId ?? `${block.anchor.pageNumber}:${block.anchor.sequence}`, block])).values()];
}

function detectParallelExperienceBlocks(lines: CandidateLine[]): ParsedExperienceBlock[] {
  const periodLines = lines.filter((line) => Boolean(extractPeriod(line.text)) && !isBullet(line.text));
  return periodLines.flatMap((periodLine, periodIndex) => {
    const period = extractPeriod(periodLine.text);
    if (!period) return [];
    const periodCenterY = periodLine.y + periodLine.height / 2;
    const roleLine = lines
      .filter((line) => line.pageNumber === periodLine.pageNumber
        && line.sequence !== periodLine.sequence
        && line.x > periodLine.x + periodLine.width
        && Math.abs((line.y + line.height / 2) - periodCenterY) <= Math.max(0.022, periodLine.height, line.height)
        && !isBullet(line.text)
        && !SECTION_HEADING.test(line.text)
        && !extractPeriod(line.text)
        && (ROLE_TERMS.test(line.text) || line.emphasis === "strong"))
      .sort((left, right) => Number(ROLE_TERMS.test(right.text)) - Number(ROLE_TERMS.test(left.text))
        || Math.abs((left.y + left.height / 2) - periodCenterY) - Math.abs((right.y + right.height / 2) - periodCenterY)
        || left.x - right.x)[0] ?? null;
    if (!roleLine) return [];
    const nextPeriodY = periodLines
      .filter((candidate, index) => index > periodIndex && candidate.pageNumber === periodLine.pageNumber && candidate.y > periodLine.y)
      .map((candidate) => candidate.y)
      .sort((left, right) => left - right)[0] ?? 1;
    const organizationLine = lines
      .filter((line) => line.pageNumber === roleLine.pageNumber
        && line.y > roleLine.y
        && line.y <= roleLine.y + Math.max(0.05, roleLine.height * 3)
        && Math.abs(line.x - roleLine.x) <= 0.06
        && isLikelyOrganizationLine(line))
      .sort((left, right) => left.y - right.y)[0] ?? null;
    if (!organizationLine) return [];
    const descriptionLines = lines.filter((line) => line.pageNumber === roleLine.pageNumber
      && line.sequence !== roleLine.sequence
      && line.sequence !== organizationLine.sequence
      && line.sequence !== periodLine.sequence
      && line.y > organizationLine.y
      && line.y < nextPeriodY
      && line.x >= roleLine.x - 0.04
      && !SECTION_HEADING.test(line.text)
      && !extractPeriod(line.text));
    return [{
      anchor: roleLine,
      anchorIndex: lines.indexOf(roleLine),
      organizationLine,
      roleLine,
      periodLine,
      role: cleanHeaderRole(roleLine.text),
      organization: cleanOrganizationValue(organizationLine.text),
      period,
      description: descriptionLines.map((line) => stripBullet(line.text)).filter(Boolean).join("\n") || null,
      descriptionLines,
      patternKey: "experience:block-v4:parallel-period-role:company-next-line",
    }];
  });
}

function detectGroupedExperienceBlocks(lines: CandidateLine[]): ParsedExperienceBlock[] {
  const groups = new Map<string, CandidateLine[]>();
  for (const line of lines) {
    if (!line.blockId) continue;
    const group = groups.get(line.blockId) ?? [];
    group.push(line);
    groups.set(line.blockId, group);
  }
  return [...groups.values()].flatMap((group) => {
    const ordered = [...group].sort((left, right) => left.sequence - right.sequence);
    const roleIndex = ordered.findIndex((line) => /^\s*cargo\s*:/i.test(line.text));
    if (roleIndex < 0) return parseUnlabeledGroupedExperience(ordered);
    const labeledPeriodIndex = ordered.findIndex((line) => /^\s*per[ií]odo\s*:/i.test(line.text));
    const periodIndex = labeledPeriodIndex >= 0 ? labeledPeriodIndex : ordered.findIndex((line) => Boolean(extractPeriod(line.text)));
    const organizationIndex = ordered.findIndex((line, index) => index < roleIndex
      && index !== periodIndex
      && !/^\s*(pela\s+)?terceirizad[ao]\s*:/i.test(line.text));
    if (organizationIndex < 0) return [];
    const organizationLine = ordered[organizationIndex]!;
    const roleEndIndex = periodIndex > roleIndex ? periodIndex : roleIndex + 1;
    const roleLines = ordered.slice(roleIndex, roleEndIndex);
    const role = roleLines.map((line, index) => index === 0 ? line.text.replace(/^\s*cargo\s*:\s*/i, "") : line.text).join(" ").trim();
    const periodLine = periodIndex >= 0 ? ordered[periodIndex]! : null;
    const period = periodLine ? (extractPeriod(periodLine.text) ?? periodLine.text.replace(/^\s*per[ií]odo\s*:\s*/i, "").trim()) : null;
    const roleLineSet = new Set(roleLines);
    const descriptionLines = ordered.filter((line, index) => index !== organizationIndex && index !== periodIndex && !roleLineSet.has(line));
    if (!role || !isPlausibleOrganization(organizationLine.text) || (!period && descriptionLines.length === 0)) return [];
    return [{
      anchor: organizationLine,
      anchorIndex: lines.indexOf(organizationLine),
      organizationLine,
      roleLine: roleLines[0] ?? null,
      periodLine,
      role,
      organization: organizationLine.text.trim(),
      period,
      description: descriptionLines.map((line) => line.text.replace(/^\s*cargo\s*:\s*/i, "").trim()).filter(Boolean).join("\n") || null,
      descriptionLines,
      patternKey: `experience:block-v3:grouped-layout:organization-role-${labeledPeriodIndex >= 0 ? "labeled-period" : period ? "period" : "period-missing"}`,
    }];
  });
}

function parseUnlabeledGroupedExperience(ordered: CandidateLine[]): ParsedExperienceBlock[] {
  const organizationLine = ordered[0];
  if (!organizationLine || !isLikelyOrganizationLine(organizationLine)) return [];
  const contentLines = ordered.slice(1).filter((line) => !RESUME_SECTION_BOUNDARY.test(line.text));
  const durationLines = contentLines.filter((line) => /\b\d+\s*(?:anos?|meses?|years?|months?)\b/i.test(line.text));
  if (durationLines.length === 0 || durationLines.length !== contentLines.length) return [];
  const roles = contentLines.map((line) => line.text
    .replace(/\s*[-–]?\s*(?:trabalho\s+)?aut[oô]nomo.*$/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()).filter(Boolean);
  if (roles.length === 0) return [];
  return [{
    anchor: organizationLine,
    anchorIndex: -1,
    organizationLine,
    roleLine: contentLines[0] ?? null,
    periodLine: null,
    role: roles.join(" / "),
    organization: cleanOrganizationValue(organizationLine.text),
    period: null,
    description: contentLines.map((line) => line.text).join("\n"),
    descriptionLines: contentLines,
    patternKey: "experience:block-v3:grouped-layout:organization-multiple-roles-duration-only",
  }];
}

function parseGroupedExperienceBlock(lines: CandidateLine[], anchorIndex: number): ParsedExperienceBlock | null {
  const blockId = lines[anchorIndex]?.blockId;
  if (!blockId) return null;
  return detectGroupedExperienceBlocks(lines.filter((line) => line.blockId === blockId))[0] ?? null;
}

function parseParallelExperienceBlock(lines: CandidateLine[], anchorIndex: number): ParsedExperienceBlock | null {
  const anchor = lines[anchorIndex];
  if (!anchor) return null;
  return detectParallelExperienceBlocks(lines).find((block) => block.roleLine?.pageNumber === anchor.pageNumber
    && (block.roleLine.sequence === anchor.sequence
      || block.descriptionLines.some((line) => line.sequence === anchor.sequence)
      || block.organizationLine?.sequence === anchor.sequence
      || block.periodLine?.sequence === anchor.sequence)) ?? null;
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
  const organization = cleanOrganizationValue(sameLine?.organization ?? organizationLine?.text.trim() ?? "");
  const role = cleanHeaderRole(sameLine?.role ?? (period ? removeExact(anchor.text, period) : anchor.text));
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
  if (atMatch && isPlausibleRoleHeader(atMatch[1] ?? "", allowUnmarkedOrganization) && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(atMatch[2] ?? "")) && isPlausibleOrganization(atMatch[2] ?? "")) {
    return { role: atMatch[1]!.trim(), organization: atMatch[2]!.trim(), description: after || null };
  }
  const commaIndex = before.lastIndexOf(",");
  if (commaIndex > 0) {
    const role = before.slice(0, commaIndex).trim();
    const organization = before.slice(commaIndex + 1).trim();
    if (isPlausibleRoleHeader(role, allowUnmarkedOrganization) && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(organization)) && isPlausibleOrganization(organization)) return { role, organization, description: after || null };
  }
  const parts = before.split(/\s+[|]\s+|\s+[-–]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && isPlausibleRoleHeader(parts[0]!, allowUnmarkedOrganization) && (allowUnmarkedOrganization || SAME_LINE_COMPANY_MARKERS.test(parts.at(-1)!)) && isPlausibleOrganization(parts.at(-1)!)) {
    return { role: parts[0]!, organization: parts.at(-1)!, description: after || null };
  }
  return null;
}

function isPlausibleRoleHeader(value: string, learnedPattern: boolean): boolean {
  const candidate = value.trim();
  if (!candidate || candidate.length > 120 || isBullet(candidate) || SECTION_HEADING.test(candidate) || extractPeriod(candidate)) return false;
  if (ROLE_TERMS.test(candidate)) return true;
  if (!learnedPattern) return false;
  const words = candidate.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 12 && /^[\p{L}\p{N}][\p{L}\p{N}&.'() /+_-]+$/u.test(candidate);
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
  const evidenceAnchor = experience.evidenceText.split(/\r?\n/)[0]?.trim() ?? null;
  return locateRecordAnchor(
    lines,
    [experience.role, experience.organization, experience.period, evidenceAnchor, experience.description],
    sourceRegion ? [sourceRegion] : [],
    (line) => Boolean(extractPeriod(line.text) && (ROLE_TERMS.test(line.text) || line.emphasis === "strong")),
  );
}

function candidateLines(pages: ExtractedPage[]): CandidateLine[] {
  let sequence = 0;
  const lines = pages.flatMap((page) => {
    if (page.layoutLines?.length) return page.layoutLines.map((line) => ({ ...line, pageNumber: page.pageNumber, sequence: sequence++, origin: page.origin }));
    return page.text.split(/\r?\n|\s{2,}/).map((text, lineIndex) => ({ text: text.trim(), x: 0, y: Math.min(0.999, lineIndex / 100), width: 1, height: 0.012, fontSize: 0, emphasis: "regular" as const, pageNumber: page.pageNumber, sequence: sequence++, origin: page.origin }));
  }).filter((line) => line.text.length > 1);
  return removeRepeatedMarginNoise(lines);
}

function sliceExperienceSection(lines: CandidateLine[]): CandidateLine[] {
  const start = lines.findIndex((line) => /^(experi[eê]ncia(s)?( profissional(is)?)?|trajet[oó]ria profissional|professional experience)$/i.test(line.text.trim()));
  if (start < 0) return lines;
  const heading = lines[start]!;
  const laterSectionHeadings = lines
    .filter((line) => NEXT_SECTION.test(line.text.trim()) && (line.pageNumber > heading.pageNumber || (line.pageNumber === heading.pageNumber && line.y > heading.y)))
    .sort((left, right) => left.pageNumber - right.pageNumber || left.y - right.y);
  const boundary = laterSectionHeadings[0] ?? null;
  return lines.filter((line) => {
    if (line.pageNumber < heading.pageNumber || (line.pageNumber === heading.pageNumber && line.y <= heading.y)) return false;
    if (!boundary) return true;
    if (line.pageNumber > boundary.pageNumber) return false;
    return line.pageNumber < boundary.pageNumber || line.y < boundary.y;
  });
}

function extractPeriod(value: string): string | null {
  return (RESUME_PERIOD_PATTERN.exec(value)?.[0] ?? PERIOD_TOKEN.exec(value)?.[0] ?? OCR_DEGRADED_NUMERIC_PERIOD.exec(value)?.[0])?.replace(/\s+/g, " ").trim() ?? null;
}

function cleanHeaderRole(value: string): string {
  return value.split(/\s+[|]\s+/)[0]?.trim().replace(/^[?•·▪◦*+\-]+\s*/, "").replace(/[|,;:-]+$/, "").trim() ?? "";
}

function cleanOrganizationValue(value: string): string {
  const candidate = value.trim();
  const locationAndOrganization = /^.{2,80}?,\s*(?:[A-Z]{2}\s*,\s*)?(?:Brasil|Brazil)\s+(.+)$/iu.exec(candidate);
  return (locationAndOrganization?.[1] ?? candidate).trim();
}

function isPlausibleOrganization(value: string): boolean {
  const candidate = value.trim().replace(/[|,;:-]+$/, "").trim();
  if (candidate.length < 2 || candidate.length > 120 || PERIOD_TOKEN.test(candidate) || isBullet(candidate) || SECTION_HEADING.test(candidate)) return false;
  if (/\b(transforma[cç][aã]o|produtos digitais|opera[cç][aã]o|atividades|respons[aá]vel|atua[cç][aã]o|gest[aã]o|governan[cç]a)\b/i.test(candidate) && !COMPANY_MARKERS.test(candidate)) return false;
  return /^[\p{L}\p{N}][\p{L}\p{N}&.'() /+_-]+$/u.test(candidate);
}

function isLikelyOrganizationLine(line: CandidateLine): boolean {
  const candidate = cleanOrganizationValue(line.text);
  if (!isPlausibleOrganization(candidate) || ROLE_TERMS.test(candidate) || extractPeriod(line.text)) return false;
  const words = candidate.split(/\s+/).length;
  return COMPANY_MARKERS.test(candidate) || line.emphasis === "strong" || words <= 6;
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
  if (field === "role" && block.roleLine) return block.roleLine;
  if (field === "period" && block.periodLine) return block.periodLine;
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
function isBullet(value: string): boolean { return /^[•·▪◦*+\-]\s+/.test(value.trim()); }
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
