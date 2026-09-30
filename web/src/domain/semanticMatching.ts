import { readTrajectoryResponse, SEMANTIC_MATCHING_VERSION, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, SEMANTIC_SCORE_VERSION, type SemanticAssessment, type TrajectoryActivity } from "../../../src/domain/semanticTrajectory.js";
import { calculateMatchingScore, type MatchingScoreExperience, type VacancyFunctionAssessment } from "./matchingScore.js";
import type { VacancyAreaRelation, VacancyCandidateMatch, VacancyDetail, VacancyMatchEvidence } from "./vacancy.js";
import { assessVacancyEvidence, assessVacancySeniority, hasUsableProfessionalContent } from "./vacancy.js";

/** Activation policy only; semantic output and persisted score contracts are unchanged. */
export const SEMANTIC_TRIAGE_VERSION = "semantic-triage-2.0.0";
export type SemanticTriageDisposition = "excluded" | "resolved_internal" | "needs_interpretation" | "contextual_only";

/** Discovery remains broad; only the external interpretation is selective. */
export function isSemanticDiscoveryEligible(match: VacancyCandidateMatch): boolean {
  return match.positionDecision !== "dismissed" && hasUsableProfessionalContent(match.candidate);
}

/** Apply only to the deterministic match, on both browser and authenticated server sources. */
export function semanticTriageDisposition(match: VacancyCandidateMatch): SemanticTriageDisposition {
  if (!isSemanticDiscoveryEligible(match)) return "excluded";
  if (["same_reference", "equivalent_reference", "related_reference"].includes(match.positionRelation.status)
    || match.positionDecision === "confirmed") return "resolved_internal";
  // A possible occupational title relation is attributable to an actual title/experience,
  // unlike a shared area, isolated technology or requirement. It can start in any group.
  if (match.positionRelation.status === "possible_title_relation") return "needs_interpretation";
  // Direct professional experience in the position's named area is a plausible functional
  // relation even when title wording differs. A declared area alone is not.
  if (match.trajectoryAssessment.relation === "direct"
    && match.trajectoryAssessment.evidence.some(item => item.source === "Cargo em experiência profissional")) return "needs_interpretation";
  return "contextual_only";
}

export function isSemanticTriageEligible(match: VacancyCandidateMatch): boolean {
  return semanticTriageDisposition(match) === "needs_interpretation";
}

const POINTS: Record<TrajectoryActivity, number> = {
  direct_function: 20, equivalent_function: 17, related_function: 12, entry_potential: 8, context: 0, other: 0, unclear: 0,
  backend_execution: 20, software_execution: 17, software_analysis: 12, software_leadership: 8, software_context: 0,
};
const LABELS: Record<TrajectoryActivity, string> = {
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

export function unavailableSemantic(vacancy: VacancyDetail, match: VacancyCandidateMatch): SemanticAssessment {
  return { status: "unavailable", organizationId: vacancy.organizationId, profileId: match.candidate.profileId, positionVersionId: vacancy.versionId,
    methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION, modelVersion: "unavailable", inputHash: "", analysisId: "", reasonCode: "SERVICE_UNAVAILABLE" };
}

export function applySemanticAssessment(vacancy: VacancyDetail, match: VacancyCandidateMatch, assessment: SemanticAssessment): VacancyCandidateMatch {
  const valid = assessment.organizationId === vacancy.organizationId && assessment.profileId === match.candidate.profileId
    && assessment.positionVersionId === vacancy.versionId && assessment.methodVersion === SEMANTIC_METHOD_VERSION
    && assessment.promptVersion === SEMANTIC_PROMPT_VERSION && Boolean(assessment.modelVersion && assessment.analysisId && assessment.inputHash);
  let reading = null;
  if (valid && assessment.status === "complete" && assessment.context && assessment.reading) {
    try { reading = readTrajectoryResponse(assessment.reading, assessment.context); } catch { /* Fail closed, preserve manual access. */ }
  }
  if (!reading || !assessment.context) {
    return { ...match, semanticFallback: {
      status: assessment.status,
      reasonCode: assessment.reasonCode ?? (!valid ? "INVALID_ASSESSMENT" : assessment.status === "complete" ? "INVALID_READING" : "NO_SEMANTIC_RESULT"),
      ...(valid ? { retryAvailable: assessment.retryAvailable === true, retryExhausted: assessment.retryExhausted === true,
        ...(typeof assessment.retryAfter === "string" ? { retryAfter: assessment.retryAfter } : {}) } : {}),
    } };
  }
  const context = assessment.context;
  const sources = reading.items.map(item => ({ ...item, source: context.entries.find(entry => entry.id === item.id)! }));
  const experience = sources.filter(item => item.source.kind === "experience")
    .sort((a, b) => POINTS[b.activity] - POINTS[a.activity] || a.id.localeCompare(b.id));
  const positiveExperience = experience.filter(item => POINTS[item.activity] > 0);
  const declared = sources.find(item => item.source.kind !== "experience" && POINTS[item.activity] > 0);
  const selected = positiveExperience[0] ?? declared;
  const activity = selected?.activity ?? "unclear";
  const points = (positiveExperience[0]
    ? POINTS[activity]
    : vacancy.experiencePolicy === "not_required" && declared?.activity === "entry_potential"
      ? POINTS.entry_potential : 0) as VacancyFunctionAssessment["basePoints"];
  if (!points && ((!experience.length && !declared) || experience.some(item => item.activity === "unclear"))) {
    return applySemanticAssessment(vacancy, match, { ...assessment, status: "indeterminate", reasonCode: "INSUFFICIENT_EVIDENCE" });
  }
  const selectedSources = points > 0 ? experience.filter(item => POINTS[item.activity] === points) : [];
  const evidence: VacancyMatchEvidence[] = selectedSources.map(item => semanticEvidence(match, item.source, item.quote, assessment));
  const explanation = `${LABELS[activity]} A classificação considera evidência publicada, inclusive histórica, sem presumir senioridade.`;
  const areaRelation: VacancyAreaRelation = {
    status: points ? "experience_area" : declared ? "profile_area" : "none",
    coverageState: points || declared ? "evaluated_relation" : "insufficient_evidence",
    evidence: points ? evidence : declared ? [{ label: declared.quote, source: "Declaração do Perfil", fieldPath: declared.source.fieldPath, sourceVersion: `Perfil ${match.candidate.profileVersion}` }] : [],
    explanation: points ? "Atuação profissional relacionada ao núcleo da Posição, sustentada por experiência publicada."
      : declared ? "A formação ou declaração publicada sugere potencial, sem provar experiência profissional realizada." : "A relação profissional não foi demonstrada pelas evidências disponíveis; não é conclusão de incapacidade.",
  };
  const relation = points > 0 ? semanticFunctionRelation(activity) : semanticFunctionRelation("unclear");
  const seniority = assessVacancySeniority(vacancy.title, semanticObservedTitle(match, selectedSources), points);
  const functionAssessment: VacancyFunctionAssessment = {
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
  const positionRelation = { status: points ? "interpreted_function" as const : "none" as const, explanation, evidence };
  return { ...match, semanticAssessment: assessment, semanticFallback: undefined, areaRelation, functionAssessment, discoveryGroup, score,
    evidenceAssessment: semanticEvidenceAssessment(match, areaRelation, positionRelation),
    trajectoryAssessment: { relation: relation.trajectoryRelation, entryLevelVacancy: vacancy.experiencePolicy === "not_required", evidence, explanation },
    positionRelation,
    reasons: [explanation, ...match.reasons.filter(reason => reason.includes("requisito"))],
  };
}

function semanticFunctionRelation(activity: TrajectoryActivity): {
  functionRelation: VacancyFunctionAssessment["relation"];
  discoveryGroup: VacancyCandidateMatch["discoveryGroup"];
  trajectoryRelation: VacancyCandidateMatch["trajectoryAssessment"]["relation"];
} {
  if (["direct_function", "backend_execution"].includes(activity)) return { functionRelation: "same_function", discoveryGroup: "main_area", trajectoryRelation: "direct" };
  if (activity === "equivalent_function") return { functionRelation: "equivalent_function", discoveryGroup: "main_area", trajectoryRelation: "related" };
  if (["related_function", "entry_potential", "software_execution", "software_analysis", "software_leadership"].includes(activity)) return { functionRelation: "related_function", discoveryGroup: "related_area", trajectoryRelation: activity === "entry_potential" ? "entry_potential" : "related" };
  if (["context", "software_context"].includes(activity)) return { functionRelation: "contextual_relation", discoveryGroup: "contextual_signals", trajectoryRelation: "contextual_only" };
  return { functionRelation: "no_relation", discoveryGroup: "contextual_signals", trajectoryRelation: "none" };
}

function semanticEvidence(match: VacancyCandidateMatch, source: { kind: string; fieldPath: string }, quote: string, assessment: SemanticAssessment): VacancyMatchEvidence {
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

function semanticObservedTitle(match: VacancyCandidateMatch, sources: Array<{ source: { kind: string; fieldPath: string } }>): string | undefined {
  const experience = sources.find((item) => item.source.kind === "experience");
  const index = Number(experience?.source.fieldPath.match(/^experiences\.(\d+)$/)?.[1]);
  return Number.isInteger(index) ? match.candidate.profileData.experiences[index]?.role ?? undefined : match.candidate.profileData.professionalTitle ?? undefined;
}

function semanticTemporalExperiences(
  match: VacancyCandidateMatch,
  experiences: Array<{ id: string; activity: TrajectoryActivity; quote: string; source: { kind: string; fieldPath: string } }>,
): MatchingScoreExperience[] {
  return experiences.flatMap((item) => {
    if (!(["direct_function", "equivalent_function", "related_function", "backend_execution", "software_execution", "software_analysis"] as TrajectoryActivity[]).includes(item.activity)) return [];
    const index = Number(item.source.fieldPath.match(/^experiences\.(\d+)$/)?.[1]);
    const original = match.candidate.profileData.experiences[index];
    if (!original) return [];
    return [{ id: original.id, period: original.period, evidence: [{ reference: `experience:${original.id}:semantic`, label: item.quote, source: "Interpretação de trajetória", sourceVersion: `Perfil ${match.candidate.profileVersion}` }] }];
  });
}

export function semanticComparisonPending(matches: VacancyCandidateMatch[]): boolean {
  return matches.some(match => Boolean(match.semanticAssessment) && (match.semanticAssessment?.status !== "complete" || match.score.status === "provisional"));
}

function semanticEvidenceAssessment(match: VacancyCandidateMatch, area: VacancyAreaRelation, position: VacancyCandidateMatch["positionRelation"]): VacancyCandidateMatch["evidenceAssessment"] {
  const base = assessVacancyEvidence(area, position, match.requirements);
  const evidence = [...area.evidence, ...position.evidence, ...match.requirements.flatMap(item => item.evidence)];
  // A second interpretation or another field of the same published Profile is not a new source.
  const sourceCount = new Set(evidence.map(item => item.source === "Evidência Demonstrada" ? item.sourceId ?? item.fieldPath : `profile:${match.candidate.profileId}`)).size;
  return { ...base, independentSourceCount: sourceCount, level: sourceCount >= 2 ? "corroborated" : sourceCount ? "supported" : "limited",
    reasons: [sourceCount ? "O Perfil publicado é contado como uma fonte; a interpretação e as repetições não criam fontes independentes." : "Não há evidência suficiente para corroborar a relação.",
      "As leituras da IA verificam constância de classificação, não constituem evidência independente sobre a Pessoa."] };
}
