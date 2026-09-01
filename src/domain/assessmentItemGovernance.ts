export const M51C_VERSIONS = {
  gapAnalysis: "m51c-gap-analysis-1.0.0",
  itemProposal: "m51c-item-proposal-1.0.0",
  deduplication: "m51c-lexical-deduplication-1.0.0",
  analytics: "m51c-item-analytics-1.0.0",
  calibration: "m51c-item-calibration-1.0.0",
  budget: "m51c-ai-budget-1.0.0",
} as const;

export type ItemLifecycleState = "proposed" | "in_review" | "approved" | "active" | "rejected" | "inactive" | "retired" | "compromised";
export type ItemCalibrationState = "uncalibrated" | "collecting_data" | "calibration_eligible" | "calibrated" | "calibration_review_required";
export type ItemBankScope = "global" | "organization";
export type ItemDifficulty = "low" | "medium" | "high";

export interface GovernedAssessmentItem {
  id: string;
  familyId: string;
  key: string;
  organizationId: string | null;
  scope: ItemBankScope;
  competencyKey: string;
  targetLevel: "basic" | "intermediate" | "advanced";
  dimension: string;
  modality: "multiple_choice";
  language: string;
  lifecycleState: ItemLifecycleState;
  calibrationState: ItemCalibrationState;
  definedDifficulty: ItemDifficulty;
  stem: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
  exposureCount: number;
  compromised: boolean;
}

export interface BlueprintCoverageTarget {
  blueprintId: string;
  competencyKey: string;
  targetLevel: GovernedAssessmentItem["targetLevel"];
  modality: GovernedAssessmentItem["modality"];
  language: string;
  dimension: string;
  requiredItems: number;
  diversityReserve: number;
  maximumExposure: number;
}

export interface ItemBankGap {
  key: string;
  blueprintId: string;
  competencyKey: string;
  targetLevel: GovernedAssessmentItem["targetLevel"];
  dimension: string;
  modality: GovernedAssessmentItem["modality"];
  language: string;
  requiredItems: number;
  eligibleItems: number;
  deficit: number;
  reasonCodes: string[];
  version: string;
}

export interface GenerationRequest {
  id: string;
  scope: ItemBankScope;
  organizationId: string | null;
  gap: ItemBankGap;
  quantity: number;
  directives: string[];
  provider: "fake" | "external";
}

export interface ItemProposal {
  proposalId: string;
  requestId: string;
  item: GovernedAssessmentItem;
  provenance: {
    provider: string;
    model: string;
    promptVersion: string;
    schemaVersion: string;
    generatedAt: string;
    synthetic: boolean;
  };
  validation: { valid: boolean; reasonCodes: string[] };
}

export interface ItemObservation {
  itemId: string;
  correct: boolean;
  elapsedSeconds: number;
  synthetic: boolean;
}

export interface ItemAnalytics {
  itemId: string;
  applicationCount: number;
  realApplicationCount: number;
  correctRate: number | null;
  medianTimeSeconds: number | null;
  observedDifficulty: number | null;
  calibrationState: ItemCalibrationState;
  reasonCodes: string[];
  version: string;
}

export interface BudgetDecision {
  allowed: boolean;
  remainingCents: number;
  state: "disabled" | "available" | "warning" | "exhausted";
  reasonCode: "WITHIN_BUDGET" | "FEATURE_DISABLED" | "BUDGET_NOT_CONFIGURED" | "BUDGET_EXCEEDED" | "UNKNOWN_COST";
  version: string;
}

export function isItemEligible(item: GovernedAssessmentItem, target: BlueprintCoverageTarget): boolean {
  return item.lifecycleState === "active"
    && !item.compromised
    && item.exposureCount < target.maximumExposure
    && item.competencyKey === target.competencyKey
    && item.targetLevel === target.targetLevel
    && item.dimension === target.dimension
    && item.modality === target.modality
    && item.language === target.language;
}

export function analyzeItemBankGaps(targets: BlueprintCoverageTarget[], items: GovernedAssessmentItem[]): ItemBankGap[] {
  return targets.map((target) => {
    const eligibleItems = items.filter((item) => isItemEligible(item, target)).length;
    const requiredItems = target.requiredItems + target.diversityReserve;
    const deficit = Math.max(0, requiredItems - eligibleItems);
    const reasonCodes = deficit === 0 ? ["COVERAGE_SUFFICIENT"] : [
      "ELIGIBLE_ITEM_COVERAGE_GAP",
      ...(items.some((item) => item.dimension === target.dimension && item.compromised) ? ["COMPROMISED_ITEMS_EXCLUDED"] : []),
      ...(items.some((item) => item.dimension === target.dimension && item.exposureCount >= target.maximumExposure) ? ["EXPOSURE_LIMIT_REACHED"] : []),
    ];
    return {
      key: [target.blueprintId, target.competencyKey, target.targetLevel, target.dimension, target.modality, target.language].join(":"),
      blueprintId: target.blueprintId,
      competencyKey: target.competencyKey,
      targetLevel: target.targetLevel,
      dimension: target.dimension,
      modality: target.modality,
      language: target.language,
      requiredItems,
      eligibleItems,
      deficit,
      reasonCodes,
      version: M51C_VERSIONS.gapAnalysis,
    };
  });
}

export function generateWithFakeProvider(request: GenerationRequest, generatedAt = "2026-09-01T00:00:00.000Z"): ItemProposal[] {
  if (request.provider !== "fake") throw new Error("M51C_EXTERNAL_PROVIDER_NOT_AVAILABLE_IN_DOMAIN");
  if (request.gap.deficit < 1 || request.quantity < 1 || request.quantity > request.gap.deficit) throw new Error("M51C_INVALID_GENERATION_QUANTITY");
  return Array.from({ length: request.quantity }, (_, index) => {
    const sequence = index + 1;
    const item: GovernedAssessmentItem = {
      id: `proposal-item-${request.id}-${sequence}`,
      familyId: `proposal-family-${request.id}-${sequence}`,
      key: `M51C-${request.gap.competencyKey.toUpperCase()}-${request.gap.dimension.toUpperCase()}-${sequence}`,
      organizationId: request.organizationId,
      scope: request.scope,
      competencyKey: request.gap.competencyKey,
      targetLevel: request.gap.targetLevel,
      dimension: request.gap.dimension,
      modality: request.gap.modality,
      language: request.gap.language,
      lifecycleState: "proposed",
      calibrationState: "uncalibrated",
      definedDifficulty: request.gap.targetLevel === "advanced" ? "high" : request.gap.targetLevel === "intermediate" ? "medium" : "low",
      stem: `[QA sintético] Cenário ${sequence} de ${request.gap.dimension}: qual alternativa atende ao objetivo com maior consistência?`,
      options: ["A", "B", "C", "D"].map((id) => ({ id, label: `[QA] Alternativa ${id} do cenário ${sequence}` })),
      correctOptionId: "B",
      explanation: `[QA sintético] A alternativa B é a referência determinística para ${request.gap.dimension}.`,
      exposureCount: 0,
      compromised: false,
    };
    return {
      proposalId: `proposal-${request.id}-${sequence}`,
      requestId: request.id,
      item,
      provenance: {
        provider: "fake-deterministic",
        model: "not-applicable-no-llm",
        promptVersion: "m51c-fake-item-generation-1.0.0",
        schemaVersion: M51C_VERSIONS.itemProposal,
        generatedAt,
        synthetic: true,
      },
      validation: validateItemProposal(item),
    };
  });
}

export function validateItemProposal(item: GovernedAssessmentItem): ItemProposal["validation"] {
  const reasons: string[] = [];
  if (!item.stem.trim()) reasons.push("STEM_REQUIRED");
  if (item.options.length < 2) reasons.push("INSUFFICIENT_OPTIONS");
  if (new Set(item.options.map((option) => option.id)).size !== item.options.length) reasons.push("DUPLICATE_OPTION_ID");
  if (!item.options.some((option) => option.id === item.correctOptionId)) reasons.push("ANSWER_KEY_NOT_IN_OPTIONS");
  if (!item.explanation.trim()) reasons.push("EXPLANATION_REQUIRED");
  const participantVisibleText = `${item.stem} ${item.options.map((option) => option.label).join(" ")}`;
  if (containsPotentialPii(participantVisibleText)) reasons.push("POTENTIAL_PII_DETECTED");
  if (/\b(resposta correta|gabarito|correct answer)\b/i.test(participantVisibleText)) reasons.push("ANSWER_LEAKAGE_DETECTED");
  if (item.scope === "global" && item.organizationId !== null) reasons.push("GLOBAL_SCOPE_CANNOT_HAVE_ORGANIZATION");
  if (item.scope === "organization" && !item.organizationId) reasons.push("ORGANIZATION_SCOPE_REQUIRES_ORGANIZATION");
  return { valid: reasons.length === 0, reasonCodes: reasons.length === 0 ? ["SCHEMA_VALID"] : reasons };
}

export function containsPotentialPii(value: string): boolean {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    || /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(value)
    || /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/.test(value);
}

export function normalizeItemText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function itemFingerprint(item: Pick<GovernedAssessmentItem, "stem" | "options">): string {
  const canonical = normalizeItemText(`${item.stem} ${item.options.map((option) => option.label).join(" ")}`);
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `m51c-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function lexicalSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeItemText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeItemText(right).split(" ").filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 1;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return Number((intersection / union.size).toFixed(4));
}

export function findPotentialDuplicates(candidate: GovernedAssessmentItem, existing: GovernedAssessmentItem[], threshold = 0.82) {
  const candidateFingerprint = itemFingerprint(candidate);
  return existing.map((item) => ({
    itemId: item.id,
    exact: itemFingerprint(item) === candidateFingerprint,
    similarity: lexicalSimilarity(candidate.stem, item.stem),
  })).filter((match) => match.exact || match.similarity >= threshold);
}

export function calculateItemAnalytics(itemId: string, observations: ItemObservation[]): ItemAnalytics {
  const itemObservations = observations.filter((observation) => observation.itemId === itemId);
  const real = itemObservations.filter((observation) => !observation.synthetic);
  const correctRate = real.length === 0 ? null : real.filter((observation) => observation.correct).length / real.length;
  const sortedTimes = real.map((observation) => observation.elapsedSeconds).sort((left, right) => left - right);
  const medianTimeSeconds = sortedTimes.length === 0 ? null : median(sortedTimes);
  const reasonCodes = real.length === 0 ? ["SYNTHETIC_OBSERVATIONS_EXCLUDED", "REAL_SAMPLE_REQUIRED"] : [];
  const calibrationState: ItemCalibrationState = real.length === 0
    ? "uncalibrated"
    : real.length < 30
      ? "collecting_data"
      : real.length < 100
        ? "calibration_eligible"
        : "calibrated";
  if (real.length > 0 && real.length < 30) reasonCodes.push("REAL_SAMPLE_BELOW_PROVISIONAL_THRESHOLD");
  if (real.length >= 30 && real.length < 100) reasonCodes.push("PROVISIONAL_SAMPLE_ONLY");
  if (real.length >= 100) reasonCodes.push("REAL_SAMPLE_CALIBRATED");
  return {
    itemId,
    applicationCount: itemObservations.length,
    realApplicationCount: real.length,
    correctRate: correctRate === null ? null : Number(correctRate.toFixed(4)),
    medianTimeSeconds,
    observedDifficulty: correctRate === null ? null : Number((1 - correctRate).toFixed(4)),
    calibrationState,
    reasonCodes,
    version: M51C_VERSIONS.analytics,
  };
}

export function evaluateAiBudget(input: { enabled: boolean; monthlyLimitCents: number | null; spentCents: number; estimatedCostCents: number | null; warningPercent?: number }): BudgetDecision {
  if (!input.enabled) return decision(false, 0, "disabled", "FEATURE_DISABLED");
  if (input.monthlyLimitCents === null || input.monthlyLimitCents <= 0) return decision(false, 0, "disabled", "BUDGET_NOT_CONFIGURED");
  const remaining = Math.max(0, input.monthlyLimitCents - input.spentCents);
  if (input.estimatedCostCents === null || input.estimatedCostCents < 0) return decision(false, remaining, remaining === 0 ? "exhausted" : "warning", "UNKNOWN_COST");
  if (input.estimatedCostCents > remaining) return decision(false, remaining, "exhausted", "BUDGET_EXCEEDED");
  const warningAt = input.monthlyLimitCents * ((input.warningPercent ?? 80) / 100);
  return decision(true, remaining, input.spentCents + input.estimatedCostCents >= warningAt ? "warning" : "available", "WITHIN_BUDGET");
}

function decision(allowed: boolean, remainingCents: number, state: BudgetDecision["state"], reasonCode: BudgetDecision["reasonCode"]): BudgetDecision {
  return { allowed, remainingCents, state, reasonCode, version: M51C_VERSIONS.budget };
}

function median(values: number[]): number {
  const middle = Math.floor(values.length / 2);
  const value = values.length % 2 === 0 ? ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2 : values[middle] ?? 0;
  return Number(value.toFixed(2));
}
