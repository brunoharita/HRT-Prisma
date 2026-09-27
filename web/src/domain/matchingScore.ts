import type {
  VacancyAreaRelation,
  VacancyMatchEvidence,
  VacancyRequirementMatch,
} from "./vacancy.js";
import { parseResumePeriod, RESUME_DATE_METHOD_VERSION } from "../../../src/domain/resumeDates.js";

export const MATCHING_SCORE_CONTRACT_VERSION = "matching-score-1.4.0";

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
  key: "area" | "position" | "required" | "desired" | "duration" | "recency";
  earnedPoints: number;
  applicablePoints: number;
  coveragePoints: number;
  coverageState: EvidenceCoverageState;
  determined: boolean;
  explanation: string;
  evidence: MatchingScoreEvidence[];
  items?: MatchingScoreItem[];
}

export interface MatchingScoreExperience {
  id: string;
  period: string | null;
  evidence: MatchingScoreEvidence[];
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
  referenceDate: string;
  knowledgeVersions: string[];
  inputFingerprint: string;
}

export interface MatchingScoreInput {
  interpretationReference?: string;
  areaApplicable: boolean;
  functionApplicable: boolean;
  areaRelation: VacancyAreaRelation;
  functionAssessment: VacancyFunctionAssessment;
  requirements: VacancyRequirementMatch[];
  unclassifiedRequirementCount: number;
  competitiveEligibility?: "eligible" | "contextual_only";
  materialDependencies?: string[];
  relatedExperiences: MatchingScoreExperience[];
  referenceDate: string;
  positionVersion: string;
  positionVersionNumber: number;
  profileVersion: string;
  profileVersionNumber: number;
  matchingContractVersion: string;
  scoreContractVersion?: string;
}

const WEIGHTS = Object.freeze({ area: 10, position: 25, required: 35, desired: 10, duration: 10, recency: 10 });

export function calculateMatchingScore(input: MatchingScoreInput): MatchingScoreResult {
  const scoreContractVersion = input.scoreContractVersion ?? MATCHING_SCORE_CONTRACT_VERSION;
  const area = scoreArea(input.areaApplicable, input.areaRelation);
  const position = scoreFunction(input.functionApplicable, input.functionAssessment);
  const required = scoreRequirements("required", input.requirements, input.unclassifiedRequirementCount);
  const desired = scoreRequirements("desired", input.requirements, input.unclassifiedRequirementCount);
  const temporal = scoreTemporal(input.relatedExperiences, input.referenceDate, input.competitiveEligibility !== "contextual_only");
  const dimensions = [area, position, required, desired, temporal.duration, temporal.recency];
  const earnedPoints = sum(dimensions.map((item) => item.earnedPoints));
  const applicablePoints = sum(dimensions.map((item) => item.applicablePoints));
  const coveragePoints = sum(dimensions.map((item) => item.coveragePoints));
  const coveragePercent = applicablePoints ? Math.round(100 * coveragePoints / applicablePoints) : 0;
  const versionFailure = validateVersions(input, scoreContractVersion);
  const eligibilityFailure = input.competitiveEligibility === "contextual_only"
    ? "Foram encontrados sinais relacionados, mas não há trajetória profissional suficiente para calcular um Prisma Score comparável."
    : null;
  const temporalFailure = temporal.undetermined.length
    ? `A duração e/ou recência da experiência relacionada não puderam ser determinadas: ${temporal.undetermined.join(" ")}`
    : null;
  const unavailableReason = versionFailure ?? eligibilityFailure ?? temporalFailure ?? (applicablePoints === 0 ? "A Posição não possui critérios aplicáveis suficientes para calcular o score." : null);
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
    resumeDateMethodVersion: RESUME_DATE_METHOD_VERSION,
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
    relatedExperiences: input.relatedExperiences.map((item) => ({ id: item.id, period: item.period, evidence: item.evidence.map(compactEvidence) })),
    referenceDate: input.referenceDate,
    positionVersion: input.positionVersion,
    positionVersionNumber: input.positionVersionNumber,
    profileVersion: input.profileVersion,
    profileVersionNumber: input.profileVersionNumber,
    matchingContractVersion: input.matchingContractVersion,
    scoreContractVersion,
    ...(input.interpretationReference ? { interpretationReference: input.interpretationReference } : {}),
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
    referenceDate: input.referenceDate,
    knowledgeVersions,
    inputFingerprint,
  };
}

function scoreArea(applicable: boolean, relation: VacancyAreaRelation): MatchingScoreDimension {
  if (!applicable) return emptyDimension("area", "A Posição não definiu área profissional; os 10 pontos ficam fora do denominador.");
  const earnedPoints = relation.status === "experience_area" ? 10 : relation.status === "profile_area" ? 8 : 0;
  return {
    key: "area",
    earnedPoints,
    applicablePoints: WEIGHTS.area,
    coveragePoints: isCovered(relation.coverageState) ? WEIGHTS.area : 0,
    coverageState: relation.coverageState,
    determined: true,
    explanation: relation.explanation,
    evidence: relation.evidence.map(scoreEvidence),
  };
}

function scoreFunction(applicable: boolean, assessment: VacancyFunctionAssessment): MatchingScoreDimension {
  if (!applicable) return emptyDimension("position", "A Posição não definiu função; os 25 pontos ficam fora do denominador.");
  const earnedPoints = Math.max(0, Math.min(WEIGHTS.position, (assessment.basePoints + assessment.seniorityAdjustment) * 1.25));
  return {
    key: "position",
    earnedPoints,
    applicablePoints: WEIGHTS.position,
    coveragePoints: isCovered(assessment.coverageState) ? WEIGHTS.position : 0,
    coverageState: assessment.coverageState,
    determined: true,
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
    determined: true,
    explanation: `${WEIGHTS[key]} pontos divididos igualmente entre ${matches.length} requisito${matches.length === 1 ? "" : "s"} ${importance === "required" ? "obrigatório" : "desejáveis"}.`,
    evidence: [],
    items,
  };
}

function emptyDimension(key: MatchingScoreDimension["key"], explanation: string): MatchingScoreDimension {
  return { key, earnedPoints: 0, applicablePoints: 0, coveragePoints: 0, coverageState: "not_applicable", determined: true, explanation, evidence: [], ...(key === "required" || key === "desired" ? { items: [] } : {}) };
}

interface TemporalWindow { startMin: number; startMax: number; endMin: number; endMax: number; current: boolean; }

function scoreTemporal(experiences: MatchingScoreExperience[], referenceDate: string, applicable: boolean): {
  duration: MatchingScoreDimension;
  recency: MatchingScoreDimension;
  undetermined: string[];
} {
  const evidence = experiences.flatMap((item) => item.evidence.map((entry) => ({
    ...entry,
    label: `${entry.label} · período ${item.period?.trim() || "não determinado"}`,
    source: "Experiência relacionada",
    reference: `${item.id}:${entry.reference}`,
  })));
  const reference = parseReferenceMonth(referenceDate);
  const unknown = (reason: string): { duration: MatchingScoreDimension; recency: MatchingScoreDimension; undetermined: string[] } => ({
    duration: undeterminedTemporalDimension("duration", WEIGHTS.duration, reason, evidence),
    recency: undeterminedTemporalDimension("recency", WEIGHTS.recency, reason, evidence),
    undetermined: [reason],
  });
  if (!applicable) return {
    duration: emptyDimension("duration", "A trajetória está no Grupo C; os 10 pontos de duração ficam fora do denominador."),
    recency: emptyDimension("recency", "A trajetória está no Grupo C; os 10 pontos de recência ficam fora do denominador."),
    undetermined: [],
  };
  if (!experiences.length || reference === null) return unknown(!experiences.length
    ? "não há experiência relacionada com período determinável"
    : "a data de referência é inválida");
  const periods = experiences.map((item) => ({ item, period: parseResumePeriod(item.period) }));
  const abbreviated = periods.filter(({ period }) => period?.start?.inferred.includes("century") || period?.end?.inferred.includes("century"));
  for (const { item, period } of abbreviated) {
    for (const entry of evidence.filter((entry) => entry.reference.startsWith(`${item.id}:`))) {
      entry.label += ` · interpretado como ${period!.value}; século inferido por ${RESUME_DATE_METHOD_VERSION} (limite 2050)`;
    }
  }
  if (periods.some(({ period }) => !period?.isRange || !period.start || (!period.end && !period.current))) return unknown("o período completo de uma ou mais experiências relacionadas não está determinado");
  const windows = periods.map(({ period }) => monthWindow(period!, reference));
  if (windows.some((window) => window === null)) return unknown("a precisão mensal de uma ou mais experiências relacionadas não está determinada");
  const resolved = windows as TemporalWindow[];
  const durationMonths = totalMonths(resolved);
  const durationPoints = stableBand(durationMonths.min, durationMonths.max, durationBand);
  const latest = latestEnd(resolved);
  const recencyMonths = latest.current
    ? { min: 0, max: 0 }
    : { min: Math.max(0, reference - latest.endMax), max: Math.max(0, reference - latest.endMin) };
  const recencyPoints = stableBand(recencyMonths.min, recencyMonths.max, recencyBand);
  const undetermined: string[] = [];
  if (durationPoints === null) undetermined.push("a duração cruza mais de uma faixa");
  if (recencyPoints === null) undetermined.push("a recência cruza mais de uma faixa");
  return {
    duration: durationPoints === null
      ? undeterminedTemporalDimension("duration", WEIGHTS.duration, "A duração documentada cruza mais de uma faixa; o valor permanece não determinado.", evidence)
      : determinedTemporalDimension("duration", WEIGHTS.duration, durationPoints, `Total acumulado: ${durationMonths.min === durationMonths.max ? durationMonths.min : `${durationMonths.min} a ${durationMonths.max}`} mês${durationMonths.max === 1 ? "" : "es"} em experiência relacionada.`, evidence),
    recency: recencyPoints === null
      ? undeterminedTemporalDimension("recency", WEIGHTS.recency, "A data de encerramento documentada cruza mais de uma faixa; o valor permanece não determinado.", evidence)
      : determinedTemporalDimension("recency", WEIGHTS.recency, recencyPoints, latest.current ? "Atuação atual explicitamente documentada; recência calculada a partir da data de referência." : `Última atuação relacionada: ${recencyMonths.min === recencyMonths.max ? `${recencyMonths.min} mês${recencyMonths.min === 1 ? "" : "es"}` : `${recencyMonths.min} a ${recencyMonths.max} meses`} antes da data de referência.`, evidence),
    undetermined,
  };
}

function monthWindow(period: NonNullable<ReturnType<typeof parseResumePeriod>>, reference: number): TemporalWindow | null {
  if (!period.start) return null;
  const start = period.start.inferred.includes("month")
    ? { min: period.start.year * 12, max: period.start.year * 12 + 11 }
    : { min: period.start.year * 12 + period.start.month - 1, max: period.start.year * 12 + period.start.month - 1 };
  if (period.current) return reference < start.min ? null : { startMin: start.min, startMax: start.max, endMin: reference, endMax: reference, current: true };
  if (!period.end) return null;
  const end = period.end.inferred.includes("month")
    ? { min: period.end.year * 12, max: period.end.year * 12 + 11 }
    : { min: period.end.year * 12 + period.end.month - 1, max: period.end.year * 12 + period.end.month - 1 };
  if (end.max < start.min) return null;
  return { startMin: start.min, startMax: start.max, endMin: end.min, endMax: end.max, current: false };
}

function totalMonths(windows: TemporalWindow[]): { min: number; max: number } {
  if (windows.some((item) => item.startMin !== item.startMax || item.endMin !== item.endMax)) {
    if (windows.length !== 1) return { min: Number.NaN, max: Number.NaN };
    return { min: Math.max(0, windows[0]!.endMin - windows[0]!.startMax + 1), max: Math.max(0, windows[0]!.endMax - windows[0]!.startMin + 1) };
  }
  const occupied = new Set<number>();
  windows.forEach((item) => { for (let month = item.startMin; month <= item.endMax; month += 1) occupied.add(month); });
  return { min: occupied.size, max: occupied.size };
}

function latestEnd(windows: TemporalWindow[]): TemporalWindow { return windows.reduce((latest, item) => item.endMax > latest.endMax ? item : latest); }
function durationBand(months: number): number { return months < 12 ? 0 : months < 24 ? 3 : months < 36 ? 5 : months < 60 ? 7 : 10; }
function recencyBand(months: number): number { return months < 6 ? 10 : months < 12 ? 7 : months < 18 ? 5 : months < 24 ? 3 : 0; }
function stableBand(min: number, max: number, band: (value: number) => number): number | null { return Number.isFinite(min) && Number.isFinite(max) && band(min) === band(max) ? band(min) : null; }
function determinedTemporalDimension(key: "duration" | "recency", weight: number, points: number, explanation: string, evidence: MatchingScoreEvidence[]): MatchingScoreDimension {
  return { key, earnedPoints: points, applicablePoints: weight, coveragePoints: weight, coverageState: "evaluated_relation", determined: true, explanation, evidence };
}
function undeterminedTemporalDimension(key: "duration" | "recency", weight: number, explanation: string, evidence: MatchingScoreEvidence[]): MatchingScoreDimension {
  return { key, earnedPoints: 0, applicablePoints: weight, coveragePoints: 0, coverageState: "insufficient_evidence", determined: false, explanation: `Não determinado. ${explanation}`, evidence };
}
function parseReferenceMonth(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
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
  const semantic = input.matchingContractVersion === "vacancy-matching-semantic-6.0.0";
  if (!semantic && input.matchingContractVersion !== "vacancy-matching-explainable-5.0.0") return "A versão do contrato de matching não é reconhecida; o score não foi calculado.";
  if (scoreContractVersion !== MATCHING_SCORE_CONTRACT_VERSION) return "A versão do contrato de score não é reconhecida; o score não foi calculado.";
  if (semantic && !input.interpretationReference?.trim()) return "A interpretação versionada da trajetória não está disponível; o score não foi calculado.";
  if (parseReferenceMonth(input.referenceDate) === null) return "A data de referência do score é desconhecida ou inválida; o score não foi calculado.";
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
