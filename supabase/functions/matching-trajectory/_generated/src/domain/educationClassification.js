// Generated from src/domain/educationClassification.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
export const EDUCATION_CLASSIFIER_VERSION = "1.2.0";
export const EDUCATION_LEVELS = ["secondary", "technical", "undergraduate", "postgraduate", "complementary", "unknown"];
export const EDUCATION_QUALIFICATIONS = [
    "technical_course", "technologist", "bachelor", "licentiate", "specialization", "mba",
    "master", "doctorate", "postdoctorate", "other", "unknown",
];
export const EDUCATION_STATUSES = ["completed", "in_progress", "interrupted", "suspended", "unknown"];
export const EDUCATION_CLASSIFICATION_ORIGINS = ["explicit", "inferred", "human", "unknown"];
export const EDUCATION_LEVEL_LABELS = {
    secondary: "Ensino médio",
    technical: "Técnico",
    undergraduate: "Graduação",
    postgraduate: "Pós-graduação",
    complementary: "Formação complementar",
    unknown: "Não identificado",
};
export const EDUCATION_QUALIFICATION_LABELS = {
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
export function educationQualificationLabel(level, qualification) {
    if (level === "secondary" || level === "technical" || level === "complementary")
        return "Não se aplica";
    return EDUCATION_QUALIFICATION_LABELS[qualification];
}
export const EDUCATION_STATUS_LABELS = {
    completed: "Concluído",
    in_progress: "Em andamento",
    interrupted: "Interrompido",
    suspended: "Trancado",
    unknown: "Não identificado",
};
export const EDUCATION_ORIGIN_LABELS = {
    explicit: "Explícita",
    inferred: "Inferida",
    human: "Validada por pessoa",
    unknown: "Não identificada",
};
const QUALIFICATIONS_BY_LEVEL = {
    secondary: ["other", "unknown"],
    technical: ["technical_course", "unknown"],
    undergraduate: ["technologist", "bachelor", "licentiate", "other", "unknown"],
    postgraduate: ["specialization", "mba", "master", "doctorate", "postdoctorate", "other", "unknown"],
    complementary: ["other", "unknown"],
    unknown: ["unknown"],
};
export function classifyEducationRecord(input) {
    const originalText = input.originalText ?? input.course ?? "";
    const sourceText = [originalText, input.course, input.status, input.description, input.period].filter(Boolean).join(" | ");
    const normalized = normalizeEducationText(sourceText);
    const reasons = [];
    let level = "unknown";
    let qualification = "unknown";
    const assign = (nextLevel, nextQualification, reason) => {
        level = nextLevel;
        qualification = nextQualification;
        reasons.push(reason);
    };
    if (/\b(pos doutor(?:ado|amento)|post ?doc(?:toral|torate)?|postdoctoral)\b/.test(normalized)) {
        assign("postgraduate", "postdoctorate", "explicit_postdoctorate_marker");
    }
    else if (/\b(doutor(?:ado|a)?|doctorate|doctoral|ph\.?d\.?)\b/.test(normalized)) {
        assign("postgraduate", "doctorate", "explicit_doctorate_marker");
    }
    else if (/\b(mestrado|master(?:'s)?(?: degree)?|m\.?sc\.?)\b/.test(normalized) && !/\bmba\b/.test(normalized)) {
        assign("postgraduate", "master", "explicit_master_marker");
    }
    else if (/\bm\.?b\.?a\.?\b|master of business administration/.test(normalized)) {
        assign("postgraduate", "mba", "explicit_mba_marker");
    }
    else if (/\b(especializa(?:cao|tion)|lato sensu|postgraduate certificate)\b/.test(normalized)) {
        assign("postgraduate", "specialization", "explicit_specialization_marker");
    }
    else if (/\b(pos graduacao|post ?graduat(?:e|ion))\b/.test(normalized)) {
        level = "postgraduate";
        reasons.push("explicit_postgraduate_level_without_qualification");
    }
    else if (/\b(licenciatura|licentiate|teaching degree)\b/.test(normalized)) {
        assign("undergraduate", "licentiate", "explicit_licentiate_marker");
    }
    else if (/\b(bacharel(?:ado)?|bachelor(?:'s)?(?: degree)?)\b/.test(normalized)) {
        assign("undergraduate", "bachelor", "explicit_bachelor_marker");
    }
    else if (/\b(tecnologia em|tecnologo|technologist|technology degree)\b/.test(normalized)) {
        assign("undergraduate", "technologist", "explicit_technologist_marker");
    }
    else if (/\b(curso tecnico|tecnico em|technical (?:course|diploma|program))\b/.test(normalized)) {
        assign("technical", "technical_course", "explicit_technical_course_marker");
    }
    else if (/\b(curso livre|capacitacao|treinamento|workshop|boot ?camp|extensao|formacao complementar|curso de curta duracao|microcredencial|microcredential|continuing education|professional development)\b/.test(normalized)) {
        assign("complementary", "other", "explicit_complementary_course_marker");
    }
    else if (/\b(graduacao|undergraduate|college degree|associate degree)\b/.test(normalized)) {
        assign("undergraduate", "other", "explicit_undergraduate_level_marker");
    }
    else if (/\b(ensino medio|high school|secondary school)\b/.test(normalized)) {
        assign("secondary", "other", "explicit_secondary_level_marker");
    }
    let status = "unknown";
    let statusOrigin = "unknown";
    if (/\b(trancad[oa]|suspens[oa]|on hold|suspended)\b/.test(normalized)) {
        status = "suspended";
        statusOrigin = "explicit";
        reasons.push("explicit_suspended_status");
    }
    else if (/\b(interrompid[oa]|incomplet[oa]|desistente|abandonad[oa]|cancelad[oa]|nao concluid[oa]|nao finalizad[oa]|sem conclusao|dropped out|interrupted|unfinished|incomplete|not completed|not graduated|discontinued|withdrawn)\b/.test(normalized)) {
        status = "interrupted";
        statusOrigin = "explicit";
        reasons.push("explicit_interrupted_status");
    }
    else if (/\b(cursando|em andamento|em curso|conclusao prevista|previsao de conclusao|previsao de termino|a concluir|in progress|currently studying|ongoing|expected|anticipated|pursuing)\b/.test(normalized)) {
        status = "in_progress";
        statusOrigin = "explicit";
        reasons.push("explicit_in_progress_status");
    }
    else if (/\b(concluid[oa]|conclusao|complet(?:ed|e)|graduated|finalizad[oa])\b/.test(normalized)) {
        status = "completed";
        statusOrigin = "explicit";
        reasons.push("explicit_completed_status");
    }
    else if (/\b(atual|presente|present|current)\b/.test(normalizeEducationText(input.period ?? ""))) {
        status = "in_progress";
        statusOrigin = "inferred";
        reasons.push("current_period_suggests_in_progress");
    }
    else if (input.course?.trim()) {
        status = "completed";
        statusOrigin = "inferred";
        reasons.push("completion_assumed_for_declared_education");
    }
    const classificationSources = {
        level: level === "unknown" ? "unknown" : "explicit",
        qualification: qualification === "unknown" ? "unknown" : "explicit",
        status: statusOrigin,
    };
    const classificationOrigin = overallOrigin(classificationSources);
    const classificationMethodVersion = EDUCATION_CLASSIFIER_VERSION;
    const course = cleanCourseName(input.course ?? originalText);
    const snapshot = {
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
export function qualificationOptionsForLevel(level) {
    return QUALIFICATIONS_BY_LEVEL[level];
}
export function educationFieldVisibility(level) {
    if (level === "secondary")
        return { showCourse: true, showInstitution: false, showPeriod: false, showQualification: false };
    if (level === "technical" || level === "complementary")
        return { showCourse: true, showInstitution: true, showPeriod: true, showQualification: false };
    if (level === "unknown")
        return { showCourse: true, showInstitution: true, showPeriod: true, showQualification: false };
    return { showCourse: true, showInstitution: true, showPeriod: true, showQualification: true };
}
export function resolveEducationClassification(input) {
    const originalText = typeof input.originalText === "string" ? input.originalText : input.evidenceText ?? input.course ?? "";
    const level = isEducationLevel(input.level) ? input.level : "unknown";
    const qualification = isEducationQualification(input.qualification) ? input.qualification : "unknown";
    const status = isEducationStatus(input.status) ? input.status : "unknown";
    const classificationOrigin = isEducationOrigin(input.classificationOrigin) ? input.classificationOrigin : "unknown";
    const classificationSources = validSources(input.classificationSources) ? input.classificationSources : {
        level: "unknown", qualification: "unknown", status: "unknown",
    };
    return {
        originalText,
        level,
        qualification,
        status,
        classificationOrigin,
        classificationSources,
        classificationReasons: Array.isArray(input.classificationReasons) ? input.classificationReasons.filter((item) => typeof item === "string") : ["historical_record_without_classification"],
        classificationMethodVersion: typeof input.classificationMethodVersion === "string" ? input.classificationMethodVersion : "legacy-unclassified",
        classificationReviewed: input.classificationReviewed === true,
        ...(validSnapshot(input.classifierSnapshot) ? { classifierSnapshot: input.classifierSnapshot } : {}),
    };
}
/**
 * Removes a stale qualification left behind when a review changes its level.
 * The reset is deliberately reviewable: it never invents a compatible degree
 * and marks the qualification as unknown until a person confirms the record.
 */
export function repairEducationClassificationCompatibility(input) {
    const current = resolveEducationClassification(input);
    if (isEducationLevelQualificationCompatible(current.level, current.qualification))
        return current;
    const classificationSources = { ...current.classificationSources, qualification: "unknown" };
    return {
        ...current,
        qualification: "unknown",
        classificationSources,
        classificationOrigin: overallOrigin(classificationSources),
        classificationReviewed: false,
        classificationReasons: appendClassificationReason(current.classificationReasons, "incompatible_qualification_reset"),
    };
}
export function withHumanEducationClassification(input, patch) {
    const current = resolveEducationClassification(input);
    const nextLevel = patch.level ?? current.level;
    const requestedQualification = patch.qualification ?? current.qualification;
    const derivedQualification = nextLevel === "secondary" ? "other" : nextLevel === "technical" ? "technical_course" : null;
    const qualification = derivedQualification ?? (isEducationLevelQualificationCompatible(nextLevel, requestedQualification) ? requestedQualification : "unknown");
    const changedSources = {
        level: patch.level === undefined ? current.classificationSources.level : "human",
        qualification: patch.qualification === undefined && qualification === current.qualification ? current.classificationSources.qualification : "human",
        status: patch.status === undefined ? current.classificationSources.status : "human",
    };
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
export function confirmEducationClassification(input) {
    const current = resolveEducationClassification(input);
    return {
        ...input,
        ...current,
        classificationOrigin: "human",
        classificationReviewed: true,
        classificationReasons: appendClassificationReason(current.classificationReasons, "human_classification_confirmed"),
    };
}
export function isEducationLevelQualificationCompatible(level, qualification) {
    return QUALIFICATIONS_BY_LEVEL[level].includes(qualification);
}
export function educationClassificationNeedsReview(input) {
    return !input.classificationReviewed
        && (input.classificationOrigin === "human" || input.classificationOrigin === "inferred"
            || input.level === "unknown" || input.qualification === "unknown" || input.status === "unknown");
}
export function normalizeEducationText(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-‐‑‒–—−]/g, " ").replace(/[^a-z0-9.+/]+/g, " ").replace(/\s+/g, " ").trim();
}
export function educationCourseIdentity(value) {
    return normalizeEducationText(cleanCourseName(value ?? "") ?? "");
}
function overallOrigin(sources) {
    const values = Object.values(sources);
    if (values.includes("inferred"))
        return "inferred";
    if (values.includes("explicit"))
        return "explicit";
    return "unknown";
}
function isEducationLevel(value) { return EDUCATION_LEVELS.includes(value); }
function isEducationQualification(value) { return EDUCATION_QUALIFICATIONS.includes(value); }
function isEducationStatus(value) { return EDUCATION_STATUSES.includes(value); }
function isEducationOrigin(value) { return EDUCATION_CLASSIFICATION_ORIGINS.includes(value); }
function validSources(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return isEducationOrigin(candidate.level) && isEducationOrigin(candidate.qualification) && isEducationOrigin(candidate.status);
}
function validSnapshot(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return isEducationLevel(candidate.level)
        && isEducationQualification(candidate.qualification)
        && isEducationStatus(candidate.status)
        && isEducationOrigin(candidate.classificationOrigin)
        && validSources(candidate.classificationSources)
        && Array.isArray(candidate.classificationReasons)
        && typeof candidate.classificationMethodVersion === "string";
}
function appendClassificationReason(reasons, reason) {
    return reasons.includes(reason) ? reasons : [...reasons, reason];
}
function cleanCourseName(value) {
    const cleaned = value
        .replace(/^\s*(?:p[oó]s[- ]?doutor(?:ado|amento)|doutorado|mestrado|m\.?b\.?a\.?|p[oó]s[- ]?gradua[cç][aã]o|especializa[cç][aã]o|bacharelado|bacharel|licenciatura|tecnologia|tecn[oó]logo|curso t[eé]cnico|t[eé]cnico|curso livre|capacita[cç][aã]o|treinamento|extens[aã]o|forma[cç][aã]o complementar)\s+(?:em|de|in|of)\s+/i, "")
        .replace(/^\s*(?:bachelor(?:'s)?(?: degree)?|master(?:'s)?(?: degree)?|doctorate|doctoral|postdoctoral|technical (?:course|diploma|program))\s+(?:in|of)\s+/i, "")
        .trim();
    return cleaned || value.trim() || null;
}
