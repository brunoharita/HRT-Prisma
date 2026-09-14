import type {
  VacancyAreaRelation,
  VacancyMatchEvidence,
  VacancyRequirementMatch,
} from "./vacancy.js";

export const MATCHING_SCORE_CONTRACT_VERSION = "matching-score-1.2.0";

export type EvidenceCoverageState = "evaluated_relation" | "evaluated_no_relation" | "insufficient_evidence" | "not_applicable";
export type MatchingScoreStatus = "definitive" | "provisional" | "unavailable";
export type MatchingScoreItemStatus = "direct" | "partial" | "related" | "no_evidence";

export interface VacancyFunctionAssessment {
  relation: "same_function" | "equivalent_function" | "related_function" | "contextual_relation" | "no_relation";
  basePoints: 20 | 17 | 12 | 8 | 0;
  seniorityAdjustment: 0 | -1 | -4;
  seniorityRelation: "aligned" | "adjacent_above" | "adjacent_below" | "materially_above" | "materially_below" | "not_available";
  coverageState: EvidenceCoverageState;
  evidence: VacancyMatchEvidence[];
  explanation: string;
}

export interface MatchingScoreEvidence {
  reference: string;
  label: string;
  source: string;
  sourceVersion?: string;
}

export interface MatchingScoreItem {
  requirementId?: string;
  label: string;
  status: MatchingScoreItemStatus;
  earnedPoints: number;
  applicablePoints: number;
  coverageState: EvidenceCoverageState;
  evidence: MatchingScoreEvidence[];
  explanation: string;
}

export interface MatchingScoreDimension {
  key: "area" | "position" | "required" | "desired";
  earnedPoints: number;
  applicablePoints: number;
  coveragePoints: number;
  coverageState: EvidenceCoverageState;
  explanation: string;
  evidence: MatchingScoreEvidence[];
  items?: MatchingScoreItem[];
}

export interface MatchingScoreResult {
  score: number | null;
  status: MatchingScoreStatus;
  earnedPoints: number;
  applicablePoints: number;
  coveragePoints: number;
  coveragePercent: number;
  provisionalReasons: string[];
  unavailableReason: string | null;
  dimensions: MatchingScoreDimension[];
  positionVersion: string;
  positionVersionNumber: number;
  profileVersion: string;
  profileVersionNumber: number;
  matchingContractVersion: string;
  scoreContractVersion: string;
  knowledgeVersions: string[];
  inputFingerprint: string;
}

export interface MatchingScoreInput {
  areaApplicable: boolean;
  functionApplicable: boolean;
  areaRelation: VacancyAreaRelation;
  functionAssessment: VacancyFunctionAssessment;
  requirements: VacancyRequirementMatch[];
  unclassifiedRequirementCount: number;
  competitiveEligibility?: "eligible" | "contextual_only";
  materialDependencies?: string[];
  positionVersion: string;
  positionVersionNumber: number;
  profileVersion: string;
  profileVersionNumber: number;
  matchingContractVersion: string;
  scoreContractVersion?: string;
}

const WEIGHTS = Object.freeze({ area: 30, position: 20, required: 35, desired: 15 });

export function calculateMatchingScore(input: MatchingScoreInput): MatchingScoreResult {
  const scoreContractVersion = input.scoreContractVersion ?? MATCHING_SCORE_CONTRACT_VERSION;
  const area = scoreArea(input.areaApplicable, input.areaRelation);
  const position = scoreFunction(input.functionApplicable, input.functionAssessment);
  const required = scoreRequirements("required", input.requirements, input.unclassifiedRequirementCount);
  const desired = scoreRequirements("desired", input.requirements, input.unclassifiedRequirementCount);
  const dimensions = [area, position, required, desired];
  const earnedPoints = sum(dimensions.map((item) => item.earnedPoints));
  const applicablePoints = sum(dimensions.map((item) => item.applicablePoints));
  const coveragePoints = sum(dimensions.map((item) => item.coveragePoints));
  const coveragePercent = applicablePoints ? Math.round(100 * coveragePoints / applicablePoints) : 0;
  const versionFailure = validateVersions(input, scoreContractVersion);
  const eligibilityFailure = input.competitiveEligibility === "contextual_only"
    ? "Foram encontrados sinais relacionados, mas não há trajetória profissional suficiente para calcular um Prisma Score comparável."
    : null;
  const unavailableReason = versionFailure ?? eligibilityFailure ?? (applicablePoints === 0 ? "A Posição não possui critérios aplicáveis suficientes para calcular o score." : null);
  const score = unavailableReason ? null : Math.round(100 * earnedPoints / applicablePoints);
  const provisionalReasons = unavailableReason ? [] : [
    ...(coveragePercent < 60 ? [`Cobertura das evidências abaixo de 60% (${coveragePercent}%).`] : []),
    ...(input.unclassifiedRequirementCount > 0 ? [`${input.unclassifiedRequirementCount} requisito${input.unclassifiedRequirementCount === 1 ? " aguarda" : "s aguardam"} classificação.`] : []),
    ...(input.materialDependencies ?? []),
  ];
  const status: MatchingScoreStatus = unavailableReason ? "unavailable" : provisionalReasons.length ? "provisional" : "definitive";
  const knowledgeVersions = [...new Set(dimensions.flatMap((item) => [
    ...item.evidence.flatMap((evidence) => evidence.sourceVersion ? [evidence.sourceVersion] : []),
    ...(item.items ?? []).flatMap((scoreItem) => scoreItem.evidence.flatMap((evidence) => evidence.sourceVersion ? [evidence.sourceVersion] : [])),
  ]))].sort();
  const inputFingerprint = fingerprint({
    areaApplicable: input.areaApplicable,
    functionApplicable: input.functionApplicable,
    areaRelation: compactRelation(input.areaRelation),
    functionAssessment: input.functionAssessment,
    requirements: input.requirements.map((item) => ({
      stableId: item.requirement.stableId,
      importance: item.requirement.importance,
      status: item.status,
      evidence: item.evidence.map(compactEvidence),
    })),
    unclassifiedRequirementCount: input.unclassifiedRequirementCount,
    competitiveEligibility: input.competitiveEligibility ?? "eligible",
    materialDependencies: input.materialDependencies ?? [],
    positionVersion: input.positionVersion,
    positionVersionNumber: input.positionVersionNumber,
    profileVersion: input.profileVersion,
    profileVersionNumber: input.profileVersionNumber,
    matchingContractVersion: input.matchingContractVersion,
    scoreContractVersion,
  });

  return {
    score,
    status,
    earnedPoints,
    applicablePoints,
    coveragePoints,
    coveragePercent,
    provisionalReasons,
    unavailableReason,
    dimensions,
    positionVersion: input.positionVersion,
    positionVersionNumber: input.positionVersionNumber,
    profileVersion: input.profileVersion,
    profileVersionNumber: input.profileVersionNumber,
    matchingContractVersion: input.matchingContractVersion,
    scoreContractVersion,
    knowledgeVersions,
    inputFingerprint,
  };
}

function scoreArea(applicable: boolean, relation: VacancyAreaRelation): MatchingScoreDimension {
  if (!applicable) return emptyDimension("area", "A Posição não definiu área profissional; os 30 pontos ficam fora do denominador.");
  const earnedPoints = relation.status === "experience_area" ? 30 : relation.status === "profile_area" ? 24 : 0;
  return {
    key: "area",
    earnedPoints,
    applicablePoints: WEIGHTS.area,
    coveragePoints: isCovered(relation.coverageState) ? WEIGHTS.area : 0,
    coverageState: relation.coverageState,
    explanation: relation.explanation,
    evidence: relation.evidence.map(scoreEvidence),
  };
}

function scoreFunction(applicable: boolean, assessment: VacancyFunctionAssessment): MatchingScoreDimension {
  if (!applicable) return emptyDimension("position", "A Posição não definiu função; os 20 pontos ficam fora do denominador.");
  const earnedPoints = Math.max(0, Math.min(WEIGHTS.position, assessment.basePoints + assessment.seniorityAdjustment));
  return {
    key: "position",
    earnedPoints,
    applicablePoints: WEIGHTS.position,
    coveragePoints: isCovered(assessment.coverageState) ? WEIGHTS.position : 0,
    coverageState: assessment.coverageState,
    explanation: assessment.explanation,
    evidence: assessment.evidence.map(scoreEvidence),
  };
}

function scoreRequirements(importance: "required" | "desired", requirements: VacancyRequirementMatch[], unclassifiedRequirementCount: number): MatchingScoreDimension {
  const matches = requirements.filter((item) => item.requirement.importance === importance);
  const key = importance;
  if (!matches.length) {
    const classification = importance === "required" ? "obrigatório" : "desejável";
    const explanation = unclassifiedRequirementCount
      ? `Nenhum requisito está confirmado como ${classification}; ${unclassifiedRequirementCount} requisito${unclassifiedRequirementCount === 1 ? " aguarda" : "s aguardam"} classificação. Os ${WEIGHTS[key]} pontos ficam fora do denominador.`
      : `A Posição não definiu requisitos ${importance === "required" ? "obrigatórios" : "desejáveis"}; os ${WEIGHTS[key]} pontos ficam fora do denominador.`;
    return emptyDimension(key, explanation);
  }
  const itemWeight = WEIGHTS[key] / matches.length;
  const items = matches.map((match): MatchingScoreItem => {
    const status = scoreItemStatus(match.status);
    const earnedPoints = itemWeight * ({ direct: 1, partial: 0.5, related: 0.25, no_evidence: 0 } as const)[status];
    const requirementId = match.requirement.id ?? match.requirement.stableId;
    return {
      ...(requirementId ? { requirementId } : {}),
      label: match.requirement.label,
      status,
      earnedPoints,
      applicablePoints: itemWeight,
      coverageState: status === "no_evidence" ? "insufficient_evidence" : "evaluated_relation",
      evidence: match.evidence.map(scoreEvidence),
      explanation: match.explanation,
    };
  });
  const coveragePoints = sum(items.filter((item) => item.coverageState !== "insufficient_evidence").map((item) => item.applicablePoints));
  return {
    key,
    earnedPoints: sum(items.map((item) => item.earnedPoints)),
    applicablePoints: WEIGHTS[key],
    coveragePoints,
    coverageState: coveragePoints === WEIGHTS[key] ? "evaluated_relation" : coveragePoints ? "insufficient_evidence" : "insufficient_evidence",
    explanation: `${WEIGHTS[key]} pontos divididos igualmente entre ${matches.length} requisito${matches.length === 1 ? "" : "s"} ${importance === "required" ? "obrigatório" : "desejáveis"}.`,
    evidence: [],
    items,
  };
}

function emptyDimension(key: MatchingScoreDimension["key"], explanation: string): MatchingScoreDimension {
  return { key, earnedPoints: 0, applicablePoints: 0, coveragePoints: 0, coverageState: "not_applicable", explanation, evidence: [], ...(key === "required" || key === "desired" ? { items: [] } : {}) };
}

function scoreItemStatus(status: VacancyRequirementMatch["status"]): MatchingScoreItemStatus {
  return ({ met: "direct", partially_met: "partial", related_signal: "related", no_evidence: "no_evidence" } as const)[status];
}

function scoreEvidence(item: VacancyMatchEvidence): MatchingScoreEvidence {
  const reference = item.sourceId ?? item.fieldPath ?? `${item.source}:${item.label}`;
  return { reference, label: item.label, source: item.source, ...(item.sourceVersion ? { sourceVersion: item.sourceVersion } : {}) };
}

function compactEvidence(item: VacancyMatchEvidence): object {
  return { reference: item.sourceId ?? item.fieldPath ?? null, label: item.label, source: item.source, sourceVersion: item.sourceVersion ?? null };
}

function compactRelation(relation: VacancyAreaRelation): object {
  return { status: relation.status, coverageState: relation.coverageState, evidence: relation.evidence.map(compactEvidence) };
}

function validateVersions(input: MatchingScoreInput, scoreContractVersion: string): string | null {
  if (!input.positionVersion.trim() || !Number.isSafeInteger(input.positionVersionNumber) || input.positionVersionNumber < 1) return "A versão da Posição é desconhecida; o score não foi calculado.";
  if (!input.profileVersion.trim() || !Number.isSafeInteger(input.profileVersionNumber) || input.profileVersionNumber < 1) return "A versão do Perfil é desconhecida; o score não foi calculado.";
  if (input.matchingContractVersion !== "vacancy-matching-explainable-5.0.0") return "A versão do contrato de matching não é reconhecida; o score não foi calculado.";
  if (scoreContractVersion !== MATCHING_SCORE_CONTRACT_VERSION) return "A versão do contrato de score não é reconhecida; o score não foi calculado.";
  return null;
}

function isCovered(state: EvidenceCoverageState): boolean {
  return state === "evaluated_relation" || state === "evaluated_no_relation";
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function fingerprint(value: unknown): string {
  const serialized = JSON.stringify(sortValue(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortValue(item)]));
  return value;
}
