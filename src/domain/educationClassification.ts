export const EDUCATION_CLASSIFIER_VERSION = "1.0.0";

export const EDUCATION_LEVELS = ["secondary", "technical", "undergraduate", "postgraduate", "unknown"] as const;
export const EDUCATION_QUALIFICATIONS = [
  "technical_course", "technologist", "bachelor", "licentiate", "specialization", "mba",
  "master", "doctorate", "postdoctorate", "other", "unknown",
] as const;
export const EDUCATION_STATUSES = ["completed", "in_progress", "interrupted", "suspended", "unknown"] as const;
export const EDUCATION_CLASSIFICATION_ORIGINS = ["explicit", "inferred", "human", "unknown"] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number];
export type EducationQualification = typeof EDUCATION_QUALIFICATIONS[number];
export type EducationStatus = typeof EDUCATION_STATUSES[number];
export type EducationClassificationOrigin = typeof EDUCATION_CLASSIFICATION_ORIGINS[number];

export interface EducationClassificationSources {
  level: EducationClassificationOrigin;
  qualification: EducationClassificationOrigin;
  status: EducationClassificationOrigin;
}

export interface EducationClassifierSnapshot {
  course: string | null;
  level: EducationLevel;
  qualification: EducationQualification;
  status: EducationStatus;
  classificationOrigin: EducationClassificationOrigin;
  classificationSources: EducationClassificationSources;
  classificationReasons: string[];
  classificationMethodVersion: string;
}

export interface EducationClassificationResult extends EducationClassifierSnapshot {
  originalText: string;
  classificationReviewed: boolean;
  classifierSnapshot: EducationClassifierSnapshot;
}

export interface EducationClassificationInput {
  course?: string | null;
  institution?: string | null;
  period?: string | null;
  status?: string | null;
  originalText?: string | null;
  description?: string | null;
  evidenceText?: string | null;
}

export type EducationClassificationFields = Omit<EducationClassificationResult, "classifierSnapshot" | "course"> & {
  classifierSnapshot?: EducationClassifierSnapshot;
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  secondary: "Ensino médio",
  technical: "Técnico",
  undergraduate: "Graduação",
  postgraduate: "Pós-graduação",
  unknown: "Não identificado",
};

export const EDUCATION_QUALIFICATION_LABELS: Record<EducationQualification, string> = {
  technical_course: "Curso técnico",
  technologist: "Tecnólogo",
  bachelor: "Bacharelado",
  licentiate: "Licenciatura",
  specialization: "Especialização",
  mba: "MBA",
  master: "Mestrado",
  doctorate: "Doutorado",
  postdoctorate: "Pós-doutorado",
  other: "Outra qualificação",
  unknown: "Não identificada",
};

export const EDUCATION_STATUS_LABELS: Record<EducationStatus, string> = {
  completed: "Concluído",
  in_progress: "Em andamento",
  interrupted: "Interrompido",
  suspended: "Trancado",
  unknown: "Não identificado",
};

export const EDUCATION_ORIGIN_LABELS: Record<EducationClassificationOrigin, string> = {
  explicit: "Explícita",
  inferred: "Inferida",
  human: "Validada por pessoa",
  unknown: "Não identificada",
};

const QUALIFICATIONS_BY_LEVEL: Record<EducationLevel, readonly EducationQualification[]> = {
  secondary: ["other", "unknown"],
  technical: ["technical_course", "unknown"],
  undergraduate: ["technologist", "bachelor", "licentiate", "other", "unknown"],
  postgraduate: ["specialization", "mba", "master", "doctorate", "postdoctorate", "other", "unknown"],
  unknown: ["unknown"],
};

export function classifyEducationRecord(input: EducationClassificationInput): EducationClassificationResult {
  const originalText = input.originalText ?? input.course ?? "";
  const sourceText = [originalText, input.course, input.status, input.description, input.period].filter(Boolean).join(" | ");
  const normalized = normalizeEducationText(sourceText);
  const reasons: string[] = [];
  let level: EducationLevel = "unknown";
  let qualification: EducationQualification = "unknown";

  const assign = (nextLevel: EducationLevel, nextQualification: EducationQualification, reason: string) => {
    level = nextLevel;
    qualification = nextQualification;
    reasons.push(reason);
  };

  if (/\b(pos doutor(?:ado|amento)|post ?doc(?:toral|torate)?|postdoctoral)\b/.test(normalized)) {
    assign("postgraduate", "postdoctorate", "explicit_postdoctorate_marker");
  } else if (/\b(doutor(?:ado|a)?|doctorate|doctoral|ph\.?d\.?)\b/.test(normalized)) {
    assign("postgraduate", "doctorate", "explicit_doctorate_marker");
  } else if (/\b(mestrado|master(?:'s)?(?: degree)?|m\.?sc\.?)\b/.test(normalized) && !/\bmba\b/.test(normalized)) {
    assign("postgraduate", "master", "explicit_master_marker");
  } else if (/\bm\.?b\.?a\.?\b|master of business administration/.test(normalized)) {
    assign("postgraduate", "mba", "explicit_mba_marker");
  } else if (/\b(especializa(?:cao|tion)|lato sensu|postgraduate certificate)\b/.test(normalized)) {
    assign("postgraduate", "specialization", "explicit_specialization_marker");
  } else if (/\b(pos graduacao|post ?graduat(?:e|ion))\b/.test(normalized)) {
    level = "postgraduate";
    reasons.push("explicit_postgraduate_level_without_qualification");
  } else if (/\b(licenciatura|licentiate|teaching degree)\b/.test(normalized)) {
    assign("undergraduate", "licentiate", "explicit_licentiate_marker");
  } else if (/\b(bacharel(?:ado)?|bachelor(?:'s)?(?: degree)?)\b/.test(normalized)) {
    assign("undergraduate", "bachelor", "explicit_bachelor_marker");
  } else if (/\b(tecnologia em|tecnologo|technologist|technology degree)\b/.test(normalized)) {
    assign("undergraduate", "technologist", "explicit_technologist_marker");
  } else if (/\b(curso tecnico|tecnico em|technical (?:course|diploma|program))\b/.test(normalized)) {
    assign("technical", "technical_course", "explicit_technical_course_marker");
  } else if (/\b(graduacao|undergraduate|college degree|associate degree)\b/.test(normalized)) {
    assign("undergraduate", "other", "explicit_undergraduate_level_marker");
  } else if (/\b(ensino medio|high school|secondary school)\b/.test(normalized)) {
    assign("secondary", "other", "explicit_secondary_level_marker");
  }

  let status: EducationStatus = "unknown";
  let statusOrigin: EducationClassificationOrigin = "unknown";
  if (/\b(trancad[oa]|suspens[oa]|on hold|suspended)\b/.test(normalized)) {
    status = "suspended"; statusOrigin = "explicit"; reasons.push("explicit_suspended_status");
  } else if (/\b(interrompid[oa]|incomplet[oa]|desistente|dropped out|interrupted|unfinished)\b/.test(normalized)) {
    status = "interrupted"; statusOrigin = "explicit"; reasons.push("explicit_interrupted_status");
  } else if (/\b(concluid[oa]|conclusao|complet(?:ed|e)|graduated|finalizad[oa])\b/.test(normalized)) {
    status = "completed"; statusOrigin = "explicit"; reasons.push("explicit_completed_status");
  } else if (/\b(cursando|em andamento|in progress|currently studying|ongoing)\b/.test(normalized)) {
    status = "in_progress"; statusOrigin = "explicit"; reasons.push("explicit_in_progress_status");
  } else if (/\b(atual|presente|present|current)\b/.test(normalizeEducationText(input.period ?? ""))) {
    status = "in_progress"; statusOrigin = "inferred"; reasons.push("current_period_suggests_in_progress");
  }

  const classificationSources: EducationClassificationSources = {
    level: level === "unknown" ? "unknown" : "explicit",
    qualification: qualification === "unknown" ? "unknown" : "explicit",
    status: statusOrigin,
  };
  const classificationOrigin = overallOrigin(classificationSources);
  const classificationMethodVersion = EDUCATION_CLASSIFIER_VERSION;
  const course = cleanCourseName(input.course ?? originalText);
  const snapshot: EducationClassifierSnapshot = {
    course,
    level,
    qualification,
    status,
    classificationOrigin,
    classificationSources,
    classificationReasons: reasons.length ? reasons : ["insufficient_explicit_academic_evidence"],
    classificationMethodVersion,
  };
  const classificationReviewed = !educationClassificationNeedsReview({ ...snapshot, classificationReviewed: false });
  return { ...snapshot, originalText, classificationReviewed, classifierSnapshot: structuredClone(snapshot) };
}

export function qualificationOptionsForLevel(level: EducationLevel): readonly EducationQualification[] {
  return QUALIFICATIONS_BY_LEVEL[level];
}

export function resolveEducationClassification(input: EducationClassificationInput & Partial<EducationClassificationFields>): EducationClassificationFields {
  const originalText = typeof input.originalText === "string" ? input.originalText : input.evidenceText ?? input.course ?? "";
  const level = isEducationLevel(input.level) ? input.level : "unknown";
  const qualification = isEducationQualification(input.qualification) ? input.qualification : "unknown";
  const status = isEducationStatus(input.status) ? input.status : "unknown";
  const classificationOrigin = isEducationOrigin(input.classificationOrigin) ? input.classificationOrigin : "unknown";
  const classificationSources: EducationClassificationSources = validSources(input.classificationSources) ? input.classificationSources : {
    level: "unknown", qualification: "unknown", status: "unknown",
  };
  return {
    originalText,
    level,
    qualification,
    status,
    classificationOrigin,
    classificationSources,
    classificationReasons: Array.isArray(input.classificationReasons) ? input.classificationReasons.filter((item): item is string => typeof item === "string") : ["historical_record_without_classification"],
    classificationMethodVersion: typeof input.classificationMethodVersion === "string" ? input.classificationMethodVersion : "legacy-unclassified",
    classificationReviewed: input.classificationReviewed === true,
    ...(validSnapshot(input.classifierSnapshot) ? { classifierSnapshot: input.classifierSnapshot } : {}),
  };
}

export function withHumanEducationClassification<T extends EducationClassificationInput & Partial<EducationClassificationFields>>(
  input: T,
  patch: Partial<Pick<EducationClassificationFields, "level" | "qualification" | "status">>,
): T & EducationClassificationFields {
  const current = resolveEducationClassification(input);
  const nextLevel = patch.level ?? current.level;
  const requestedQualification = patch.qualification ?? current.qualification;
  const qualification = isEducationLevelQualificationCompatible(nextLevel, requestedQualification) ? requestedQualification : "unknown";
  const changedSources = {
    level: patch.level === undefined ? current.classificationSources.level : "human",
    qualification: patch.qualification === undefined && qualification === current.qualification ? current.classificationSources.qualification : "human",
    status: patch.status === undefined ? current.classificationSources.status : "human",
  } satisfies EducationClassificationSources;
  return {
    ...input,
    ...current,
    ...patch,
    level: nextLevel,
    qualification,
    classificationOrigin: "human",
    classificationSources: changedSources,
    classificationReviewed: false,
    classificationReasons: appendClassificationReason(current.classificationReasons, "human_classification_changed"),
  };
}

export function confirmEducationClassification<T extends EducationClassificationInput & Partial<EducationClassificationFields>>(input: T): T & EducationClassificationFields {
  const current = resolveEducationClassification(input);
  return {
    ...input,
    ...current,
    classificationOrigin: "human",
    classificationReviewed: true,
    classificationReasons: appendClassificationReason(current.classificationReasons, "human_classification_confirmed"),
  };
}

export function isEducationLevelQualificationCompatible(level: EducationLevel, qualification: EducationQualification): boolean {
  return QUALIFICATIONS_BY_LEVEL[level].includes(qualification);
}

export function educationClassificationNeedsReview(input: Pick<EducationClassificationResult, "level" | "qualification" | "status" | "classificationOrigin" | "classificationReviewed">): boolean {
  return !input.classificationReviewed
    && (input.level === "unknown" || input.qualification === "unknown" || input.status === "unknown" || input.classificationOrigin === "inferred");
}

export function normalizeEducationText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-‐‑‒–—−]/g, " ").replace(/[^a-z0-9.+/]+/g, " ").replace(/\s+/g, " ").trim();
}

export function educationCourseIdentity(value: string | null | undefined): string {
  return normalizeEducationText(cleanCourseName(value ?? "") ?? "");
}

function overallOrigin(sources: EducationClassificationSources): EducationClassificationOrigin {
  const values = Object.values(sources);
  if (values.includes("inferred")) return "inferred";
  if (values.includes("explicit")) return "explicit";
  return "unknown";
}

function isEducationLevel(value: unknown): value is EducationLevel { return EDUCATION_LEVELS.includes(value as EducationLevel); }
function isEducationQualification(value: unknown): value is EducationQualification { return EDUCATION_QUALIFICATIONS.includes(value as EducationQualification); }
function isEducationStatus(value: unknown): value is EducationStatus { return EDUCATION_STATUSES.includes(value as EducationStatus); }
function isEducationOrigin(value: unknown): value is EducationClassificationOrigin { return EDUCATION_CLASSIFICATION_ORIGINS.includes(value as EducationClassificationOrigin); }
function validSources(value: unknown): value is EducationClassificationSources {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EducationClassificationSources>;
  return isEducationOrigin(candidate.level) && isEducationOrigin(candidate.qualification) && isEducationOrigin(candidate.status);
}
function validSnapshot(value: unknown): value is EducationClassifierSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EducationClassifierSnapshot>;
  return isEducationLevel(candidate.level)
    && isEducationQualification(candidate.qualification)
    && isEducationStatus(candidate.status)
    && isEducationOrigin(candidate.classificationOrigin)
    && validSources(candidate.classificationSources)
    && Array.isArray(candidate.classificationReasons)
    && typeof candidate.classificationMethodVersion === "string";
}

function appendClassificationReason(reasons: string[], reason: string): string[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function cleanCourseName(value: string): string | null {
  const cleaned = value
    .replace(/^\s*(?:p[oó]s[- ]?doutor(?:ado|amento)|doutorado|mestrado|m\.?b\.?a\.?|p[oó]s[- ]?gradua[cç][aã]o|especializa[cç][aã]o|bacharelado|bacharel|licenciatura|tecnologia|tecn[oó]logo|curso t[eé]cnico|t[eé]cnico)\s+(?:em|in|of)\s+/i, "")
    .replace(/^\s*(?:bachelor(?:'s)?(?: degree)?|master(?:'s)?(?: degree)?|doctorate|doctoral|postdoctoral|technical (?:course|diploma|program))\s+(?:in|of)\s+/i, "")
    .trim();
  return cleaned || value.trim() || null;
}
