import { readTrajectoryResponse, SEMANTIC_MATCHING_VERSION, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, SEMANTIC_SCORE_VERSION, type SemanticAssessment, type TrajectoryActivity } from "../../../src/domain/semanticTrajectory.js";
import { calculateMatchingScore, type VacancyFunctionAssessment } from "./matchingScore.js";
import type { VacancyAreaRelation, VacancyCandidateMatch, VacancyDetail, VacancyMatchEvidence } from "./vacancy.js";
import { assessVacancyEvidence } from "./vacancy.js";

const POINTS = { backend_execution: 20, software_execution: 17, software_analysis: 12, software_leadership: 8, software_context: 0, other: 0, unclear: 0 } as const;
const LABELS: Record<TrajectoryActivity, string> = {
  backend_execution: "Execução de desenvolvimento backend explicitamente descrita.",
  software_execution: "Execução de desenvolvimento de software; especialização backend e ferramentas específicas ainda não comprovadas por esta classificação.",
  software_analysis: "Análise de sistemas de software; execução de programação backend não comprovada por esta classificação.",
  software_leadership: "Liderança técnica relacionada; gerir uma equipe não comprova execução pessoal de desenvolvimento backend.",
  software_context: "Menção contextual a software, sem atuação técnica suficiente para comparação competitiva.",
  other: "A atuação descrita não demonstra relação com desenvolvimento de software. Isso não significa incapacidade.",
  unclear: "A trajetória não traz evidência suficiente para determinar a natureza da atuação.",
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
    const message = assessment.status === "indeterminate"
      ? assessment.reasonCode === "INSUFFICIENT_EVIDENCE" ? "A evidência publicada é insuficiente para classificar a trajetória. A comparação permanece pendente, não negativa." : "As leituras da trajetória divergiram. A comparação permanece pendente, sem nota ou prioridade automática."
      : "A interpretação da trajetória está pendente ou indisponível. O Perfil e os requisitos continuam acessíveis; isso não reduz a avaliação da Pessoa.";
    const pendingArea: VacancyAreaRelation = { status: "none", coverageState: "insufficient_evidence", evidence: [], explanation: message };
    const pendingPosition = { status: "none" as const, evidence: [], explanation: message };
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
  const sources = reading.items.map(item => ({ ...item, source: context.entries.find(entry => entry.id === item.id)! }));
  const experience = sources.filter(item => item.source.kind === "experience")
    .sort((a, b) => POINTS[b.activity] - POINTS[a.activity] || a.id.localeCompare(b.id));
  const best = experience[0];
  const activity = best?.activity ?? "unclear";
  const points = POINTS[activity];
  const declared = sources.find(item => item.source.kind === "declaration" && POINTS[item.activity] > 0);
  if (!points && ((!experience.length && !declared) || experience.some(item => item.activity === "unclear"))) {
    return applySemanticAssessment(vacancy, match, { ...assessment, status: "indeterminate", reasonCode: "INSUFFICIENT_EVIDENCE" });
  }
  const evidence: VacancyMatchEvidence[] = experience.filter(item => points > 0 && POINTS[item.activity] === points).map(item => {
    const index = Number(item.source.fieldPath.match(/^experiences\.(\d+)$/)?.[1]);
    const original = match.candidate.profileData.experiences[index];
    const field = original?.role?.includes(item.quote) ? "role" : original?.description?.includes(item.quote) ? "description" : null;
    return { label: item.quote, source: "Experiência publicada · interpretação de trajetória",
      sourceId: original ? `experience:${original.id}${field ? `:${field}` : ""}` : item.source.fieldPath,
      fieldPath: original ? `experiences.${original.id}${field ? `.${field}` : ""}` : item.source.fieldPath,
      sourceVersion: `Perfil ${match.candidate.profileVersion}; ${assessment.methodVersion}; ${assessment.analysisId}` };
  });
  const explanation = `${LABELS[activity]} A classificação considera evidência publicada, inclusive histórica, sem presumir senioridade.`;
  const areaRelation: VacancyAreaRelation = {
    status: points ? "experience_area" : declared ? "profile_area" : "none",
    coverageState: points || declared ? "evaluated_relation" : "insufficient_evidence",
    evidence: points ? evidence : declared ? [{ label: declared.quote, source: "Declaração do Perfil", fieldPath: declared.source.fieldPath, sourceVersion: `Perfil ${match.candidate.profileVersion}` }] : [],
    explanation: points ? "Atuação em software sustentada por experiência publicada, não apenas pela palavra Tecnologia."
      : declared ? "Área de software declarada, sem experiência suficiente para elegibilidade competitiva." : "Área de desenvolvimento não demonstrada pelas evidências disponíveis; não é conclusão de incapacidade.",
  };
  const functionAssessment: VacancyFunctionAssessment = {
    relation: points === 20 ? "same_function" : points === 17 ? "equivalent_function" : points === 12 ? "related_function" : points === 8 ? "contextual_relation" : "no_relation",
    basePoints: points, seniorityAdjustment: 0, seniorityRelation: "not_available", evidence,
    coverageState: points ? "evaluated_relation" : "insufficient_evidence", explanation,
  };
  const discoveryGroup = points === 20 ? "main_area" : points ? "related_area" : "contextual_signals";
  const dependencies = [...match.score.provisionalReasons.filter(reason => !reason.startsWith("Cobertura das evidências")),
    ...(experience.some(item => item.activity === "unclear") ? ["Há experiência cuja natureza permanece indeterminada; diferenças de score não estabelecem prioridade segura."] : [])];
  const score = calculateMatchingScore({
    areaApplicable: Boolean(vacancy.area.trim()), functionApplicable: Boolean(vacancy.title.trim()), areaRelation, functionAssessment,
    requirements: match.requirements, unclassifiedRequirementCount: match.unclassifiedRequirementCount,
    competitiveEligibility: points ? "eligible" : "contextual_only", materialDependencies: dependencies,
    positionVersion: vacancy.versionId, positionVersionNumber: vacancy.version, profileVersion: match.candidate.profileId, profileVersionNumber: match.candidate.profileVersion,
    matchingContractVersion: SEMANTIC_MATCHING_VERSION, scoreContractVersion: SEMANTIC_SCORE_VERSION,
    interpretationReference: `${assessment.methodVersion}:${assessment.promptVersion}:${assessment.modelVersion}:${assessment.inputHash}:${assessment.analysisId}`,
  });
  const positionRelation = { status: points ? "interpreted_function" as const : "none" as const, explanation, evidence };
  return { ...match, semanticAssessment: assessment, areaRelation, functionAssessment, discoveryGroup, score,
    evidenceAssessment: semanticEvidenceAssessment(match, areaRelation, positionRelation),
    trajectoryAssessment: { relation: points === 20 ? "direct" : points ? "related" : "contextual_only", entryLevelVacancy: false, evidence, explanation },
    positionRelation,
    reasons: [explanation, ...match.reasons.filter(reason => reason.includes("requisito"))],
  };
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
