import type { VerificationLevel } from "./competencyVerificationData";

export interface ItemBankGapView {
  key: string;
  blueprintId: string;
  blueprintKey: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  definedDifficulty: "low" | "medium" | "high";
  dimension: string;
  modality: "multiple_choice";
  language: string;
  requiredItems: number;
  eligibleItems: number;
  deficit: number;
  reasonCodes: string[];
}

export interface GovernedItemView {
  id: string;
  key: string;
  version: string;
  scope: "global" | "organization";
  organizationId: string | null;
  competencyKey: string;
  targetLevel: VerificationLevel;
  dimension: string;
  state: "proposed" | "in_review" | "approved" | "active" | "rejected" | "inactive" | "retired" | "deprecated" | "compromised";
  definedDifficulty: "low" | "medium" | "high";
  calibrationState: "uncalibrated" | "collecting_data" | "calibration_eligible" | "calibrated" | "calibration_review_required";
  stem: string;
  applicationCount: number;
  correctRate: number | null;
  medianTimeSeconds: number | null;
  p25TimeSeconds: number | null;
  p75TimeSeconds: number | null;
  omissionRate: number | null;
  answerChangeRate: number | null;
  excludedTechnicalIncidentCount: number;
  sampleKind: "synthetic_qa" | "real_anonymized" | null;
  analyticsReasonCodes: string[];
  observedDifficulty: number | null;
}

export interface GenerationRequestView {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled" | "budget_blocked";
  provider: "fake-deterministic" | "external";
  quantity: number;
  targetScope: "global" | "organization";
  createdAt: string;
}

export interface GenerationProposalView {
  id: string;
  requestId: string;
  status: "proposed" | "validation_failed" | "duplicate_candidate" | "in_review" | "approved" | "rejected" | "published" | "superseded";
  item: {
    key: string;
    competencyKey: string;
    targetLevel: VerificationLevel;
    dimension: string;
    difficulty: "low" | "medium" | "high";
    language: string;
    modality: "multiple_choice";
    stem: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
  };
  fingerprint: string;
  similarity: number;
  duplicateCandidates?: Array<{ kind: "item" | "proposal"; id: string; code: string; exact: boolean; similarity: number }>;
  validation: { valid: boolean; reasonCodes: string[] };
  provenance: { provider: string; model: string; synthetic: boolean; promptVersion: string; schemaVersion: string };
  createdAt: string;
}

export interface AssessmentAiPolicyView {
  generationEnabled: boolean;
  provider: string | null;
  model: string | null;
  monthlyLimitCents: number | null;
  maximumItemsPerRequest: number;
  maximumRequestsPerDay: number;
  maximumCostPerRequestCents: number | null;
  cooldownSeconds: number;
  budgetAlertPercent: number;
  requireHumanReview: boolean;
  allowPii: false;
  allowWebSearch: false;
  version: string;
  spentCents: number;
}

export interface ItemBankGovernanceWorkspace {
  versions: { gapAnalysis: string; analytics: string; calibration: string; budget: string; proposal: string };
  gaps: ItemBankGapView[];
  items: GovernedItemView[];
  requests: GenerationRequestView[];
  proposals: GenerationProposalView[];
  policy: AssessmentAiPolicyView;
}
