// Generated from web/src/domain/semanticMatching.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
import { readTrajectoryResponse, SEMANTIC_MATCHING_VERSION, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, SEMANTIC_SCORE_VERSION } from "../../../src/domain/semanticTrajectory.js";
import { calculateMatchingScore } from "./matchingScore.js";
import { assessVacancyEvidence, assessVacancySeniority, hasUsableProfessionalContent } from "./vacancy.js";
/** Activation policy only: apply to the deterministic match, never the interpreted result. */
export function isSemanticTriageEligible(match) {
    return match.positionDecision !== "dismissed" && hasUsableProfessionalContent(match.candidate);
}
const POINTS = {
    direct_function: 20, equivalent_function: 17, related_function: 12, entry_potential: 8, context: 0, other: 0, unclear: 0,
    backend_execution: 20, software_execution: 17, software_analysis: 12, software_leadership: 8, software_context: 0,
};
const LABELS = {
    direct_function: "Atuação direta no núcleo de trabalho da Posição.",
    equivalent_function: "Atuação funcionalmente equivalente, apesar da nomenclatura diferente.",
    related_function: "Atuação relacionada ou transferível, sem equivalência integral comprovada.",
    entry_potential: "Formação, prática ou conhecimento que pode sustentar entrada; não equivale a experiência profissional.",
    context: "Sinal contextual sem atividade atribuível suficiente para equivalência.",
    other: "A atuação descrita pertence a outro domínio. Isso não significa incapacidade.",
    unclear: "A trajetória não traz evidência suficiente para determinar a natureza da relação.",
    backend_execution: "Execução de desenvolvimento backend explicitamente descrita.",
    software_execution: "Execução de desenvolvimento de software; especialização backend e ferramentas específicas ainda não comprovadas por esta classificação.",
    software_analysis: "Análise de sistemas de software; execução de programação backend não comprovada por esta classificação.",
    software_leadership: "Liderança técnica relacionada; gerir uma equipe não comprova execução pessoal de desenvolvimento backend.",
    software_context: "Menção contextual a software, sem atuação técnica suficiente para comparação competitiva.",
};
export function unavailableSemantic(vacancy, match) {
    return { status: "unavailable", organizationId: vacancy.organizationId, profileId: match.candidate.profileId, positionVersionId: vacancy.versionId,
        methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION, modelVersion: "unavailable", inputHash: "", analysisId: "", reasonCode: "SERVICE_UNAVAILABLE" };
}
export function applySemanticAssessment(vacancy, match, assessment) {
    const valid = assessment.organizationId === vacancy.organizationId && assessment.profileId === match.candidate.profileId
        && assessment.positionVersionId === vacancy.versionId && assessment.methodVersion === SEMANTIC_METHOD_VERSION
        && assessment.promptVersion === SEMANTIC_PROMPT_VERSION && Boolean(assessment.modelVersion && assessment.analysisId && assessment.inputHash);
    let reading = null;
    if (valid && assessment.status === "complete" && assessment.context && assessment.reading) {
        try {
            reading = readTrajectoryResponse(assessment.reading, assessment.context);
        }
        catch { /* Fail closed, preserve manual access. */ }
    }
    if (!reading || !assessment.context) {
        const message = assessment.status === "indeterminate"
            ? assessment.reasonCode === "INSUFFICIENT_EVIDENCE" ? "A evidência publicada é insuficiente para classificar a trajetória. A comparação permanece pendente, não negativa." : "As leituras da trajetória divergiram. A comparação permanece pendente, sem nota ou prioridade automática."
            : "A interpretação da trajetória está pendente ou indisponível. O Perfil e os requisitos continuam acessíveis; isso não reduz a avaliação da Pessoa.";
        const pendingArea = { status: "none", coverageState: "insufficient_evidence", evidence: [], explanation: message };
        const pendingPosition = { status: "none", evidence: [], explanation: message };
        return { ...match, semanticAssessment: valid && assessment.status !== "complete" ? assessment : unavailableSemantic(vacancy, match),
            areaRelation: pendingArea,
            evidenceAssessment: semanticEvidenceAssessment(match, pendingArea, pendingPosition),
            functionAssessment: { relation: "no_relation", basePoints: 0, seniorityAdjustment: 0, seniorityRelation: "not_available", coverageState: "insufficient_evidence", evidence: [], explanation: message },
            trajectoryAssessment: { relation: "none", entryLevelVacancy: false, evidence: [], explanation: message },
            positionRelation: pendingPosition, reasons: [message],
            score: { ...match.score, score: null, status: "unavailable", dimensions: match.score.dimensions.filter(item => item.key === "required" || item.key === "desired"),
                earnedPoints: 0, coveragePoints: 0, coveragePercent: 0, unavailableReason: message, provisionalReasons: [],
                matchingContractVersion: SEMANTIC_MATCHING_VERSION, scoreContractVersion: SEMANTIC_SCORE_VERSION, inputFingerprint: "unavailable" },
        };
    }
    const context = assessment.context;
    const sources = reading.items.map(item => ({ ...item, source: context.entries.find(entry => entry.id === item.id) }));
    const experience = sources.filter(item => item.source.kind === "experience")
        .sort((a, b) => POINTS[b.activity] - POINTS[a.activity] || a.id.localeCompare(b.id));
    const positiveExperience = experience.filter(item => POINTS[item.activity] > 0);
    const declared = sources.find(item => item.source.kind !== "experience" && POINTS[item.activity] > 0);
    const selected = positiveExperience[0] ?? declared;
    const activity = selected?.activity ?? "unclear";
    const points = (positiveExperience[0]
        ? POINTS[activity]
        : vacancy.experiencePolicy === "not_required" && declared?.activity === "entry_potential"
            ? POINTS.entry_potential : 0);
    if (!points && ((!experience.length && !declared) || experience.some(item => item.activity === "unclear"))) {
        return applySemanticAssessment(vacancy, match, { ...assessment, status: "indeterminate", reasonCode: "INSUFFICIENT_EVIDENCE" });
    }
    const selectedSources = points > 0 ? experience.filter(item => POINTS[item.activity] === points) : [];
    const evidence = selectedSources.map(item => semanticEvidence(match, item.source, item.quote, assessment));
    const explanation = `${LABELS[activity]} A classificação considera evidência publicada, inclusive histórica, sem presumir senioridade.`;
    const areaRelation = {
        status: points ? "experience_area" : declared ? "profile_area" : "none",
        coverageState: points || declared ? "evaluated_relation" : "insufficient_evidence",
        evidence: points ? evidence : declared ? [{ label: declared.quote, source: "Declaração do Perfil", fieldPath: declared.source.fieldPath, sourceVersion: `Perfil ${match.candidate.profileVersion}` }] : [],
        explanation: points ? "Atuação profissional relacionada ao núcleo da Posição, sustentada por experiência publicada."
            : declared ? "A formação ou declaração publicada sugere potencial, sem provar experiência profissional realizada." : "A relação profissional não foi demonstrada pelas evidências disponíveis; não é conclusão de incapacidade.",
    };
    const relation = points > 0 ? semanticFunctionRelation(activity) : semanticFunctionRelation("unclear");
    const seniority = assessVacancySeniority(vacancy.title, semanticObservedTitle(match, selectedSources), points);
    const functionAssessment = {
        relation: relation.functionRelation,
        basePoints: points, seniorityAdjustment: seniority.adjustment, seniorityRelation: seniority.relation, evidence,
        coverageState: points ? "evaluated_relation" : "insufficient_evidence", explanation: `${explanation}${seniority.explanation ? ` ${seniority.explanation}` : ""}`,
    };
    const discoveryGroup = relation.discoveryGroup;
    const dependencies = [...match.score.provisionalReasons.filter(reason => !reason.startsWith("Cobertura das evidências")),
        ...(experience.some(item => item.activity === "unclear") ? ["Há experiência cuja natureza permanece indeterminada; diferenças de score não estabelecem prioridade segura."] : [])];
    const score = calculateMatchingScore({
        areaApplicable: Boolean(vacancy.area.trim()), functionApplicable: Boolean(vacancy.title.trim()), areaRelation, functionAssessment,
        requirements: match.requirements, unclassifiedRequirementCount: match.unclassifiedRequirementCount,
        relatedExperiences: semanticTemporalExperiences(match, experience), referenceDate: match.score.referenceDate,
        competitiveEligibility: points ? "eligible" : "contextual_only", materialDependencies: dependencies,
        temporalApplicable: vacancy.experiencePolicy !== "not_required",
        positionVersion: vacancy.versionId, positionVersionNumber: vacancy.version, profileVersion: match.candidate.profileId, profileVersionNumber: match.candidate.profileVersion,
        matchingContractVersion: SEMANTIC_MATCHING_VERSION, scoreContractVersion: SEMANTIC_SCORE_VERSION,
        interpretationReference: `${assessment.methodVersion}:${assessment.promptVersion}:${assessment.modelVersion}:${assessment.inputHash}:${assessment.analysisId}`,
    });
    const positionRelation = { status: points ? "interpreted_function" : "none", explanation, evidence };
    return { ...match, semanticAssessment: assessment, areaRelation, functionAssessment, discoveryGroup, score,
        evidenceAssessment: semanticEvidenceAssessment(match, areaRelation, positionRelation),
        trajectoryAssessment: { relation: relation.trajectoryRelation, entryLevelVacancy: vacancy.experiencePolicy === "not_required", evidence, explanation },
        positionRelation,
        reasons: [explanation, ...match.reasons.filter(reason => reason.includes("requisito"))],
    };
}
function semanticFunctionRelation(activity) {
    if (["direct_function", "backend_execution"].includes(activity))
        return { functionRelation: "same_function", discoveryGroup: "main_area", trajectoryRelation: "direct" };
    if (activity === "equivalent_function")
        return { functionRelation: "equivalent_function", discoveryGroup: "main_area", trajectoryRelation: "related" };
    if (["related_function", "entry_potential", "software_execution", "software_analysis", "software_leadership"].includes(activity))
        return { functionRelation: "related_function", discoveryGroup: "related_area", trajectoryRelation: activity === "entry_potential" ? "entry_potential" : "related" };
    if (["context", "software_context"].includes(activity))
        return { functionRelation: "contextual_relation", discoveryGroup: "contextual_signals", trajectoryRelation: "contextual_only" };
    return { functionRelation: "no_relation", discoveryGroup: "contextual_signals", trajectoryRelation: "none" };
}
function semanticEvidence(match, source, quote, assessment) {
    const experienceMatch = source.fieldPath.match(/^experiences\.(\d+)$/);
    if (experienceMatch) {
        const original = match.candidate.profileData.experiences[Number(experienceMatch[1])];
        const field = original?.role?.includes(quote) ? "role" : original?.description?.includes(quote) ? "description" : null;
        return { label: quote, source: "Experiência publicada · interpretação de trajetória",
            sourceId: original ? `experience:${original.id}${field ? `:${field}` : ""}` : source.fieldPath,
            fieldPath: original ? `experiences.${original.id}${field ? `.${field}` : ""}` : source.fieldPath,
            sourceVersion: `Perfil ${match.candidate.profileVersion}; ${assessment.methodVersion}; ${assessment.analysisId}` };
    }
    const educationMatch = source.fieldPath.match(/^education\.(\d+)$/);
    if (educationMatch) {
        const original = match.candidate.profileData.education[Number(educationMatch[1])];
        return { label: quote, source: "Formação publicada · potencial de entrada", sourceId: original ? `education:${original.id}` : source.fieldPath,
            fieldPath: source.fieldPath, sourceVersion: `Perfil ${match.candidate.profileVersion}; ${assessment.methodVersion}; ${assessment.analysisId}` };
    }
    return { label: quote, source: "Declaração publicada · interpretação de trajetória", sourceId: `profile:${match.candidate.profileId}:${source.fieldPath}`,
        fieldPath: source.fieldPath, sourceVersion: `Perfil ${match.candidate.profileVersion}; ${assessment.methodVersion}; ${assessment.analysisId}` };
}
function semanticObservedTitle(match, sources) {
    const experience = sources.find((item) => item.source.kind === "experience");
    const index = Number(experience?.source.fieldPath.match(/^experiences\.(\d+)$/)?.[1]);
    return Number.isInteger(index) ? match.candidate.profileData.experiences[index]?.role ?? undefined : match.candidate.profileData.professionalTitle ?? undefined;
}
function semanticTemporalExperiences(match, experiences) {
    return experiences.flatMap((item) => {
        if (!["direct_function", "equivalent_function", "related_function", "backend_execution", "software_execution", "software_analysis"].includes(item.activity))
            return [];
        const index = Number(item.source.fieldPath.match(/^experiences\.(\d+)$/)?.[1]);
        const original = match.candidate.profileData.experiences[index];
        if (!original)
            return [];
        return [{ id: original.id, period: original.period, evidence: [{ reference: `experience:${original.id}:semantic`, label: item.quote, source: "Interpretação de trajetória", sourceVersion: `Perfil ${match.candidate.profileVersion}` }] }];
    });
}
export function semanticComparisonPending(matches) {
    return matches.some(match => Boolean(match.semanticAssessment) && (match.semanticAssessment?.status !== "complete" || match.score.status === "provisional"));
}
function semanticEvidenceAssessment(match, area, position) {
    const base = assessVacancyEvidence(area, position, match.requirements);
    const evidence = [...area.evidence, ...position.evidence, ...match.requirements.flatMap(item => item.evidence)];
    // A second interpretation or another field of the same published Profile is not a new source.
    const sourceCount = new Set(evidence.map(item => item.source === "Evidência Demonstrada" ? item.sourceId ?? item.fieldPath : `profile:${match.candidate.profileId}`)).size;
    return { ...base, independentSourceCount: sourceCount, level: sourceCount >= 2 ? "corroborated" : sourceCount ? "supported" : "limited",
        reasons: [sourceCount ? "O Perfil publicado é contado como uma fonte; a interpretação e as repetições não criam fontes independentes." : "Não há evidência suficiente para corroborar a relação.",
            "As leituras da IA verificam constância de classificação, não constituem evidência independente sobre a Pessoa."] };
}
