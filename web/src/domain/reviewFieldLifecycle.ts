import type {
  StructuredDraft,
  StructuredEducation,
  StructuredExperience,
} from "./personIngestion.js";
import { normalizeDraftPeriods } from "./resumeDates.js";
import { normalizeResumePhone } from "../../../src/domain/resumeIdentity.js";
import { PHONE_CORRECTION_MESSAGE } from "./operatorFeedback.js";
import { PERIOD_FORMAT_MESSAGES, reviewPeriodProblem } from "./reviewPeriodFormat.js";
import {
  EDUCATION_CLASSIFIER_VERSION,
  isEducationLevelQualificationCompatible,
  repairEducationClassificationCompatibility,
  resolveEducationClassification,
  normalizeEducationText,
  type EducationClassificationFields,
} from "../../../src/domain/educationClassification.js";

export type ReviewEntityKind = "experience" | "education";

export interface ReviewDraftIssue {
  fieldPath: string;
  message: string;
}

export interface ReviewDraftValidationContext {
  existingPhone?: string | null;
  existingEmail?: string | null;
}

export interface ReviewDraftChangeState {
  rawChanged: boolean;
  meaningfulChanged: boolean;
  transientOnly: boolean;
}

const EXPERIENCE_ID_PATTERN = /^experience_[a-z0-9]{8,64}$/;
const EDUCATION_ID_PATTERN = /^education_[a-z0-9]{8,64}$/;
const RESULT_ID_PATTERN = /^result_[a-z0-9]{8,64}$/;

export function createReviewEntityId(kind: ReviewEntityKind): string {
  return `${kind}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function stableReviewEntityId(kind: ReviewEntityKind, seed: string): string {
  return `${kind}_${stableToken(seed)}`;
}

export function legacyReviewEntityId(kind: ReviewEntityKind, index: number): string {
  return `${kind}_legacy${String(index).padStart(8, "0")}`;
}

export function legacyReviewEntityIdFromValue(kind: ReviewEntityKind, index: number, value: unknown): string {
  return `${legacyReviewEntityId(kind, index)}${stableToken(JSON.stringify(value)).slice(0, 12)}`;
}

export function reviewEntityPathSegment(kind: ReviewEntityKind, id: string): string {
  const legacy = new RegExp(`^${kind}_legacy([0-9]{8})(?:[a-z0-9]+)?$`).exec(id);
  return legacy ? String(Number(legacy[1])) : id;
}

export function reviewDraftNeedsContractUpgrade(value: unknown): boolean {
  if (!isRecord(value)) return true;
  const requiredRoots = [
    "identity", "contact", "professionalTitle", "areasOfExpertise", "professionalObjective", "summary",
    "keyResults", "experiences", "education", "certifications", "languages", "competencies",
    "customSections", "uncertainties", "notIdentified",
  ];
  if (requiredRoots.some((key) => !(key in value))) return true;
  if (!isRecord(value.identity) || !isRecord(value.contact)) return true;
  if (!Array.isArray(value.keyResults) || value.keyResults.some((item) => !isRecord(item) || !RESULT_ID_PATTERN.test(stringValue(item.id)))) return true;
  if (!Array.isArray(value.experiences) || value.experiences.some((item) => (
    !isRecord(item)
    || !EXPERIENCE_ID_PATTERN.test(stringValue(item.id))
    || !["extracted", "human"].includes(stringValue(item.source))
  ))) return true;
  if (!Array.isArray(value.education) || value.education.some((item) => (
    !isRecord(item)
    || !EDUCATION_ID_PATTERN.test(stringValue(item.id))
    || !["extracted", "human"].includes(stringValue(item.source))
    || [
      "originalText", "level", "qualification", "status", "classificationOrigin", "classificationSources",
      "classificationReasons", "classificationMethodVersion", "classificationReviewed",
    ].some((key) => !(key in item))
  ))) return true;
  return false;
}

export function reviewEntityFieldPath(
  kind: ReviewEntityKind,
  entity: Pick<StructuredExperience | StructuredEducation, "id">,
  field?: string,
): string {
  const root = kind === "experience" ? "experiences" : "education";
  const base = `${root}.${reviewEntityPathSegment(kind, entity.id)}`;
  return field ? `${base}.${field}` : base;
}

export function isExperienceEmpty(item: StructuredExperience): boolean {
  return [item.role, item.organization, item.period, item.description].every(isBlank);
}

export function isEducationEmpty(item: StructuredEducation): boolean {
  return [item.course, item.institution, item.period, item.description].every(isBlank);
}

export function normalizeReviewDraft(draft: StructuredDraft): StructuredDraft {
  return normalizeDraftPeriods({
    ...draft,
    identity: { fullName: nullableText(draft.identity.fullName) },
    contact: {
      city: nullableText(draft.contact.city),
      state: nullableText(draft.contact.state),
      phone: nullableText(draft.contact.phone),
      email: nullableText(draft.contact.email),
      linkedin: nullableText(draft.contact.linkedin),
    },
    professionalTitle: nullableText(draft.professionalTitle),
    areasOfExpertise: normalizeTags(draft.areasOfExpertise),
    professionalObjective: nullableText(draft.professionalObjective),
    summary: nullableText(draft.summary),
    keyResults: draft.keyResults
      .map((item) => ({ ...item, value: item.value.trim() }))
      .filter((item) => Boolean(item.value)),
    experiences: draft.experiences
      .map((item) => ({
        ...item,
        role: nullableText(item.role),
        organization: nullableText(item.organization),
        period: nullableText(item.period),
        description: nullableText(item.description),
      }))
      .filter((item) => !isExperienceEmpty(item)),
    education: draft.education
      .map((item) => ({
        ...item,
        course: nullableText(item.course),
        institution: nullableText(item.institution),
        period: nullableText(item.period),
        description: nullableText(item.description),
        ...resolveEducationReviewClassification(item),
      }))
      .filter((item) => !isEducationEmpty(item)),
    certifications: normalizeTags(draft.certifications),
    languages: normalizeTags(draft.languages),
    competencies: normalizeTags(draft.competencies),
    customSections: draft.customSections.flatMap((section) => {
      const items = section.items
        .map((item) => ({ ...item, value: item.value.trim() }))
        .filter((item) => Boolean(item.value));
      return items.length ? [{ ...section, name: section.name.trim(), items }] : [];
    }),
    uncertainties: normalizeTags(draft.uncertainties),
    notIdentified: normalizeTags(draft.notIdentified),
  });
}

// Reuse the accepted extraction only when its explicit classification is intact.
// This is system acceptance, never a fabricated human confirmation.
export function resolveEducationReviewClassification(item: StructuredEducation): EducationClassificationFields {
  const current = repairEducationClassificationCompatibility(item);
  const snapshot = current.classifierSnapshot;
  const explicit = current.classificationOrigin === "explicit" && snapshot?.classificationOrigin === "explicit"
    && current.classificationMethodVersion === EDUCATION_CLASSIFIER_VERSION && current.classificationMethodVersion === snapshot.classificationMethodVersion
    && current.level !== "unknown" && current.qualification !== "unknown" && current.status !== "unknown"
    && ["level", "qualification", "status"].every((field) => {
      const key = field as "level" | "qualification" | "status";
      return current.classificationSources[key] === "explicit" && snapshot.classificationSources[key] === "explicit" && current[key] === snapshot[key];
    })
    && Boolean(item.course?.trim() && snapshot.course?.trim())
    && normalizeEducationText(item.course ?? "") === normalizeEducationText(snapshot.course ?? "");
  return explicit && !current.classificationReviewed ? { ...current, classificationReviewed: true } : current;
}

export function reviewEducationAcceptanceNeedsSync(draft: StructuredDraft): boolean {
  return draft.education.some((item) => item.classificationReviewed !== true && resolveEducationReviewClassification(item).classificationReviewed);
}

export function reviewDraftChangeState(
  baseline: StructuredDraft,
  draft: StructuredDraft,
): ReviewDraftChangeState {
  const comparable = (value: StructuredDraft) => ({ ...value, education: value.education.map((item) => {
    const accepted = resolveEducationReviewClassification(item);
    return item.classificationReviewed !== true && accepted.classificationReviewed && accepted.classificationOrigin === "explicit"
      ? { ...item, classificationReviewed: true } : item;
  }) });
  const rawChanged = JSON.stringify(comparable(baseline)) !== JSON.stringify(comparable(draft));
  const meaningfulChanged = JSON.stringify(normalizeReviewDraft(baseline)) !== JSON.stringify(normalizeReviewDraft(draft));
  return { rawChanged, meaningfulChanged, transientOnly: rawChanged && !meaningfulChanged };
}

export function reviewFieldPathExists(draft: StructuredDraft, fieldPath: string): boolean {
  if (!draft || typeof draft !== "object") return false;
  if ([
    "identity.fullName",
    "contact.city",
    "contact.state",
    "contact.phone",
    "contact.email",
    "contact.linkedin",
    "professionalTitle",
    "areasOfExpertise",
    "professionalObjective",
    "summary",
    "certifications",
    "languages",
    "competencies",
    "toolsAndTechnologies",
    "professionalContexts",
    "uncertainties",
    "notIdentified",
  ].includes(fieldPath)) {
    const [root, child] = fieldPath.split(".");
    const value = draft[root as keyof StructuredDraft];
    return child ? Boolean(value && typeof value === "object" && child in value) : root! in draft;
  }

  const segments = fieldPath.split(".");
  if (segments[0] === "customSections" && segments.length === 3 && segments[2] === "name") {
    return draft.customSections.some((section) => section.id === segments[1]);
  }
  if (["experiences", "education"].includes(segments[0] ?? "") && segments.length === 2) {
    const kind = segments[0] === "experiences" ? "experience" : "education";
    return draft[segments[0] as "experiences" | "education"].some((item, index) => item.id === segments[1] || String(index) === segments[1] || reviewEntityPathSegment(kind, item.id) === segments[1]);
  }
  if (segments[0] === "experiences" && segments.length === 3) {
    return ["role", "organization", "period", "description"].includes(segments[2] ?? "")
      && draft.experiences.some((item, index) => item.id === segments[1] || String(index) === segments[1] || reviewEntityPathSegment("experience", item.id) === segments[1]);
  }
  if (segments[0] === "education" && segments.length === 3) {
    return ["course", "institution", "period", "description", "level", "qualification", "status", "classificationOrigin"].includes(segments[2] ?? "")
      && draft.education.some((item, index) => item.id === segments[1] || String(index) === segments[1] || reviewEntityPathSegment("education", item.id) === segments[1]);
  }
  if (segments[0] === "keyResults" && segments.length === 3 && segments[2] === "value") {
    return draft.keyResults.some((item) => item.id === segments[1]);
  }
  if (segments[0] === "customSections" && segments.length === 5 && segments[2] === "items" && segments[4] === "value") {
    return draft.customSections.some((section) => section.id === segments[1] && section.items.some((item) => item.id === segments[3]));
  }
  return false;
}

export function validateReviewDraftForSave(
  draft: StructuredDraft,
  context: ReviewDraftValidationContext = {},
): ReviewDraftIssue[] {
  const issues: ReviewDraftIssue[] = [];
  const name = draft.identity.fullName?.trim() ?? "";
  if (name.length < 2) issues.push({ fieldPath: "identity.fullName", message: "Informe o nome completo para salvar este currículo." });
  else if (name.length > 160) issues.push({ fieldPath: "identity.fullName", message: "Nome completo deve ter no máximo 160 caracteres." });

  const effectivePhone = draft.contact.phone?.trim() || context.existingPhone?.trim() || "";
  const effectiveEmail = draft.contact.email?.trim() || context.existingEmail?.trim() || "";
  if (!effectivePhone && !effectiveEmail) {
    issues.push({ fieldPath: "contact.phone", message: "Informe telefone ou e-mail para salvar este currículo." });
    issues.push({ fieldPath: "contact.email", message: "Informe telefone ou e-mail para salvar este currículo." });
  }
  if (draft.contact.phone?.trim() && !normalizeResumePhone(draft.contact.phone)) {
    issues.push({ fieldPath: "contact.phone", message: PHONE_CORRECTION_MESSAGE });
  }

  const fields: Array<[string, string, string | null, number]> = [
    ["contact.city", "Cidade", draft.contact.city, 120],
    ["contact.state", "Estado", draft.contact.state, 80],
    ["contact.phone", "Telefone", draft.contact.phone, 40],
    ["contact.email", "E-mail", draft.contact.email, 320],
    ["contact.linkedin", "Perfil do LinkedIn", draft.contact.linkedin, 500],
    ["professionalTitle", "Cargo ou título profissional", draft.professionalTitle, 240],
    ["professionalObjective", "Objetivo profissional", draft.professionalObjective, 4_000],
    ["summary", "Resumo profissional", draft.summary, 12_000],
  ];
  for (const [fieldPath, label, value, limit] of fields) {
    if (value && value.trim().length > limit) issues.push({ fieldPath, message: `${label}: reduza o texto para no máximo ${limit.toLocaleString("pt-BR")} caracteres.` });
  }
  if (draft.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contact.email.trim())) {
    issues.push({ fieldPath: "contact.email", message: "Informe um e-mail com nome, @ e domínio, por exemplo nome@empresa.com." });
  }
  if (draft.contact.linkedin && !/^https:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\/in\/[a-z0-9%_.-]+\/?$/i.test(draft.contact.linkedin.trim())) {
    issues.push({ fieldPath: "contact.linkedin", message: "Informe o endereço completo do perfil pessoal do LinkedIn, por exemplo https://www.linkedin.com/in/seu-perfil." });
  }

  if (draft.areasOfExpertise.length > 30 || draft.areasOfExpertise.some((item) => !item.trim() || item.trim().length > 120)) {
    issues.push({ fieldPath: "areasOfExpertise", message: "Áreas de atuação deve conter até 30 itens de no máximo 120 caracteres." });
  }
  if (new Set(draft.areasOfExpertise.map(normalizeComparable)).size !== draft.areasOfExpertise.length) {
    issues.push({ fieldPath: "areasOfExpertise", message: "Áreas de atuação possui itens duplicados." });
  }

  if (draft.keyResults.length > 50) issues.push({ fieldPath: "keyResults", message: "Principais resultados deve conter no máximo 50 itens." });
  draft.keyResults.forEach((item) => {
    if (!RESULT_ID_PATTERN.test(item.id) || !item.value.trim() || item.value.trim().length > 4_000) {
      issues.push({ fieldPath: `keyResults.${item.id}.value`, message: "O resultado deve ter conteúdo válido de até 4.000 caracteres." });
    }
  });
  if (hasDuplicateIds(draft.keyResults)) issues.push({ fieldPath: "keyResults", message: "Principais resultados possui identificadores duplicados." });

  draft.experiences.forEach((item) => {
    const base = reviewEntityFieldPath("experience", item);
    if (!EXPERIENCE_ID_PATTERN.test(item.id)) issues.push({ fieldPath: base, message: "A experiência possui um identificador inválido." });
    if (!item.role?.trim() && !item.organization?.trim()) issues.push({ fieldPath: `${base}.role`, message: "Informe Empresa ou Cargo, ou remova esta experiência." });
    if (item.role && item.role.trim().length > 240) issues.push({ fieldPath: `${base}.role`, message: "Cargo deve ter no máximo 240 caracteres." });
    if (item.organization && item.organization.trim().length > 240) issues.push({ fieldPath: `${base}.organization`, message: "Empresa deve ter no máximo 240 caracteres." });
    if (item.period && item.period.trim().length > 160) issues.push({ fieldPath: `${base}.period`, message: "Período deve ter no máximo 160 caracteres." });
    const periodProblem = reviewPeriodProblem(item.period);
    if (periodProblem === "invalid_date" || periodProblem === "reversed") issues.push({ fieldPath: `${base}.period`, message: PERIOD_FORMAT_MESSAGES[periodProblem] });
    if (item.description && item.description.trim().length > 12_000) issues.push({ fieldPath: `${base}.description`, message: "Descrição deve ter no máximo 12.000 caracteres." });
  });
  if (hasDuplicateIds(draft.experiences)) issues.push({ fieldPath: "experiences", message: "Experiências possui identificadores duplicados." });

  draft.education.forEach((item) => {
    const base = reviewEntityFieldPath("education", item);
    const classification = resolveEducationClassification(item);
    if (!EDUCATION_ID_PATTERN.test(item.id)) issues.push({ fieldPath: base, message: "A formação possui um identificador inválido." });
    if (!item.course?.trim() && !item.institution?.trim()) issues.push({ fieldPath: `${base}.course`, message: "Informe Curso ou Instituição, ou remova esta formação." });
    if (item.course && item.course.trim().length > 500) issues.push({ fieldPath: `${base}.course`, message: "Curso deve ter no máximo 500 caracteres." });
    if (item.institution && item.institution.trim().length > 240) issues.push({ fieldPath: `${base}.institution`, message: "Instituição deve ter no máximo 240 caracteres." });
    if (item.period && item.period.trim().length > 160) issues.push({ fieldPath: `${base}.period`, message: "Período deve ter no máximo 160 caracteres." });
    const periodProblem = reviewPeriodProblem(item.period);
    if (periodProblem === "invalid_date" || periodProblem === "reversed") issues.push({ fieldPath: `${base}.period`, message: PERIOD_FORMAT_MESSAGES[periodProblem] });
    if (!isEducationLevelQualificationCompatible(classification.level, classification.qualification)) issues.push({ fieldPath: `${base}.qualification`, message: "A qualificação não é compatível com o nível acadêmico selecionado." });
  });
  if (hasDuplicateIds(draft.education)) issues.push({ fieldPath: "education", message: "Formações possui identificadores duplicados." });

  draft.customSections.forEach((section) => section.items.forEach((item) => {
    if (item.value.trim().length > 4_000) issues.push({ fieldPath: `customSections.${section.id}.items.${item.id}.value`, message: "Conteúdo deve ter no máximo 4.000 caracteres. Reduza o texto deste item antes de salvar." });
  }));

  if (!hasMaterialProfessionalInformation(draft)) {
    issues.push({ fieldPath: "professionalTitle", message: "Informe ao menos um conteúdo profissional, como resumo, objetivo, experiência, formação ou competência, antes de salvar." });
  }
  return issues;
}

export function reviewDraftFormatWarnings(draft: StructuredDraft): ReviewDraftIssue[] {
  return (["experiences", "education"] as const).flatMap((group) => draft[group].flatMap((item) => {
    const problem = reviewPeriodProblem(item.period);
    if (problem !== "unrecognized" && problem !== "missing_start") return [];
    return [{ fieldPath: `${reviewEntityFieldPath(group === "experiences" ? "experience" : "education", item)}.period`, message: PERIOD_FORMAT_MESSAGES[problem] }];
  }));
}

export function reviewIssueLabel(draft: StructuredDraft, path: string): string {
  const labels: Record<string, string> = { "identity.fullName": "Nome completo", "contact.phone": "Telefone", "contact.email": "E-mail", "contact.linkedin": "Perfil do LinkedIn", "contact.city": "Cidade", "contact.state": "Estado", professionalTitle: "Cargo ou título profissional", professionalObjective: "Objetivo profissional", summary: "Resumo profissional", areasOfExpertise: "Áreas de atuação", keyResults: "Principais resultados", experiences: "Experiências", education: "Formações", certifications: "Certificações", languages: "Idiomas", competencies: "Competências", customSections: "Informações do currículo" };
  if (labels[path]) return labels[path];
  for (const [group, kind, label] of [["experiences", "experience", "Experiência"], ["education", "education", "Formação"]] as const) {
    const index = draft[group].findIndex((item) => path === reviewEntityFieldPath(kind, item) || path.startsWith(`${reviewEntityFieldPath(kind, item)}.`));
    if (index >= 0) {
      const fields: Record<string, string> = { period: "Período", role: "Cargo", organization: "Empresa", course: "Curso", institution: "Instituição", qualification: "Qualificação", classificationOrigin: "Confirmação acadêmica", description: "Descrição" };
      return `${label} ${index + 1}${fields[path.split(".").at(-1) ?? ""] ? ` — ${fields[path.split(".").at(-1)!]}` : ""}`;
    }
  }
  const resultIndex = draft.keyResults.findIndex((item) => path.startsWith(`keyResults.${item.id}.`));
  if (resultIndex >= 0) return `Resultado ${resultIndex + 1}`;
  const sectionIndex = draft.customSections.findIndex((item) => path === `customSections.${item.id}` || path.startsWith(`customSections.${item.id}.`));
  if (sectionIndex >= 0) {
    const section = draft.customSections[sectionIndex]!;
    const itemIndex = section.items.findIndex((item) => path.startsWith(`customSections.${section.id}.items.${item.id}.`));
    return `Seção personalizada ${sectionIndex + 1}${itemIndex >= 0 ? ` — Item ${itemIndex + 1}` : ""}`;
  }
  return "Campo da revisão";
}

export function validateEducationClassificationsForApproval(draft: StructuredDraft): ReviewDraftIssue[] {
  return draft.education.flatMap((item, index) => {
    const classification = resolveEducationReviewClassification(item);
    if (!isEducationLevelQualificationCompatible(classification.level, classification.qualification)) {
      return [{ fieldPath: `${reviewEntityFieldPath("education", item)}.qualification`, message: `Formação ${index + 1}: selecione uma qualificação compatível com o nível acadêmico informado.` }];
    }
    if (!classification.classificationReviewed) {
      const missing = [
        classification.level === "unknown" ? "Nível acadêmico" : null,
        classification.qualification === "unknown" ? "Qualificação" : null,
        classification.status === "unknown" ? "Situação" : null,
      ].filter((value): value is string => Boolean(value));
      const message = missing.length
        ? `Formação ${index + 1}: confirme que ${joinNaturalLanguage(missing)} permanecem como não identificados ou preencha esses campos.`
        : `Formação ${index + 1}: confirme a classificação acadêmica apresentada antes de publicar.`;
      return [{ fieldPath: `${reviewEntityFieldPath("education", item)}.classificationOrigin`, message }];
    }
    return [];
  });
}

export function hasMaterialProfessionalInformation(draft: StructuredDraft): boolean {
  return Boolean(
    draft.professionalTitle?.trim()
    || draft.professionalObjective?.trim()
    || draft.summary?.trim()
    || draft.areasOfExpertise.length
    || draft.keyResults.length
    || draft.experiences.length
    || draft.education.length
    || draft.competencies.length
    || draft.languages.length
    || draft.certifications.length
    || draft.customSections.length,
  );
}

function nullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeTags(values: string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const trimmed = value.trim();
    const comparable = normalizeComparable(trimmed);
    if (!trimmed || seen.has(comparable)) return [];
    seen.add(comparable);
    return [trimmed];
  });
}

function normalizeComparable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function hasDuplicateIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size !== items.length;
}

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

function stableToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(36).padStart(8, "0")}${value.length.toString(36).padStart(4, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function joinNaturalLanguage(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "a classificação";
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}
