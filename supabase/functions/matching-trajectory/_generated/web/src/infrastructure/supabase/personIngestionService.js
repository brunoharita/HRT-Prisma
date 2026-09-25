// Generated from web/src/infrastructure/supabase/personIngestionService.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
import { preserveExplicitItemLineBreaks } from '../../domain/narrativeText.js';
import { resolveEducationClassification } from '../../../../src/domain/educationClassification.js';
import { legacyReviewEntityIdFromValue } from '../../domain/reviewFieldLifecycle.js';
function decodeDraft(identifiedFields, uncertainties, notIdentified) {
    const value = identifiedFields;
    const identity = isRecord(value.identity) ? value.identity : {};
    const contact = isRecord(value.contact) ? value.contact : {};
    return {
        identity: { fullName: typeof identity.fullName === "string" ? identity.fullName : null },
        contact: {
            city: typeof contact.city === "string" ? contact.city : null,
            state: typeof contact.state === "string" ? contact.state : null,
            phone: typeof contact.phone === "string" ? contact.phone : null,
            email: typeof contact.email === "string" ? contact.email : null,
            linkedin: typeof contact.linkedin === "string" ? contact.linkedin : null,
        },
        professionalTitle: typeof value.professionalTitle === "string" ? value.professionalTitle : null,
        areasOfExpertise: Array.isArray(value.areasOfExpertise) ? value.areasOfExpertise.filter((item) => typeof item === "string") : [],
        professionalObjective: typeof value.professionalObjective === "string" ? value.professionalObjective : null,
        summary: typeof value.summary === "string" ? value.summary : null,
        keyResults: Array.isArray(value.keyResults) ? value.keyResults.flatMap((item) => (item && typeof item === "object" && "id" in item && "value" in item
            && typeof item.id === "string" && typeof item.value === "string"
            ? [{ id: item.id, value: item.value }]
            : [])) : [],
        experiences: Array.isArray(value.experiences) ? value.experiences.flatMap((item, index) => {
            if (!item || typeof item !== "object")
                return [];
            const candidate = item;
            return [{
                    id: typeof candidate.id === "string" ? candidate.id : legacyReviewEntityIdFromValue("experience", index, {
                        role: candidate.role, organization: candidate.organization, period: candidate.period,
                    }),
                    source: candidate.source === "human" ? "human" : "extracted",
                    role: typeof candidate.role === "string" ? candidate.role : null,
                    organization: typeof candidate.organization === "string" ? candidate.organization : null,
                    period: typeof candidate.period === "string" ? candidate.period : null,
                    description: typeof candidate.description === "string" ? preserveExplicitItemLineBreaks(candidate.description) : null,
                    evidenceText: typeof candidate.evidenceText === "string" ? candidate.evidenceText : "",
                    page: typeof candidate.page === "number" ? candidate.page : null,
                }];
        }) : [],
        education: Array.isArray(value.education) ? value.education.flatMap((item, index) => {
            if (!item || typeof item !== "object")
                return [];
            const candidate = item;
            const classification = resolveEducationClassification(candidate);
            return [{
                    id: typeof candidate.id === "string" ? candidate.id : legacyReviewEntityIdFromValue("education", index, {
                        course: candidate.course, institution: candidate.institution, period: candidate.period,
                    }),
                    source: candidate.source === "human" ? "human" : "extracted",
                    course: typeof candidate.course === "string" ? candidate.course : null,
                    institution: typeof candidate.institution === "string" ? candidate.institution : null,
                    period: typeof candidate.period === "string" ? candidate.period : null,
                    description: typeof candidate.description === "string" ? preserveExplicitItemLineBreaks(candidate.description) : null,
                    evidenceText: typeof candidate.evidenceText === "string" ? candidate.evidenceText : "",
                    page: typeof candidate.page === "number" ? candidate.page : null,
                    ...classification,
                }];
        }) : [],
        certifications: decodeHistoricalTextList(value.certifications, ["name", "certification", "title", "value"], ["issuer", "institution"]),
        languages: decodeHistoricalTextList(value.languages, ["language", "name", "value"], ["proficiency", "level"]),
        toolsAndTechnologies: decodeHistoricalTextList(value.toolsAndTechnologies, ["name", "tool", "technology", "normalizedName", "value"]),
        competencies: decodeHistoricalTextList(value.competencies, ["name", "competency", "normalizedName", "value"]),
        professionalContexts: decodeHistoricalTextList(value.professionalContexts, ["name", "context", "value"]),
        customSections: Array.isArray(value.customSections) ? value.customSections : [],
        uncertainties: Array.isArray(uncertainties) ? uncertainties.filter((item) => typeof item === "string") : [],
        notIdentified: Array.isArray(notIdentified) ? notIdentified.filter((item) => typeof item === "string") : [],
    };
}
function decodeHistoricalTextList(value, primaryKeys, qualifierKeys = []) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value.flatMap((item) => {
        if (typeof item === "string" && item.trim())
            return [item.trim()];
        if (!item || typeof item !== "object" || Array.isArray(item))
            return [];
        const record = item;
        const primary = primaryKeys
            .map((key) => record[key])
            .find((candidate) => typeof candidate === "string" && Boolean(candidate.trim()));
        if (!primary)
            return [];
        const qualifier = qualifierKeys
            .map((key) => record[key])
            .find((candidate) => typeof candidate === "string" && Boolean(candidate.trim()));
        return [`${primary.trim()}${qualifier ? ` · ${qualifier.trim()}` : ""}`];
    })));
}
function decodeReviewDraft(value, legacyFallback, replaceLegacyGeneratedSummary = false) {
    const record = isRecord(value) ? value : {};
    const decoded = decodeDraft(record, Array.isArray(record.uncertainties) ? record.uncertainties : [], Array.isArray(record.notIdentified) ? record.notIdentified : []);
    if (!legacyFallback || record.identity || record.contact || "professionalTitle" in record)
        return decoded;
    return {
        ...decoded,
        identity: legacyFallback.identity,
        contact: legacyFallback.contact,
        professionalTitle: legacyFallback.professionalTitle,
        areasOfExpertise: legacyFallback.areasOfExpertise,
        professionalObjective: legacyFallback.professionalObjective,
        summary: replaceLegacyGeneratedSummary ? legacyFallback.summary : decoded.summary,
        keyResults: legacyFallback.keyResults,
    };
}
export function decodeProfileDataForPresentation(value) {
    return decodeReviewDraft(value);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
