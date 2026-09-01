export type VerificationLevel = "basic" | "intermediate" | "advanced";
export type VerificationCriticality = "low" | "medium" | "high" | "critical";
export type VerificationSufficiencyStatus =
  | "sufficient"
  | "verification_optional"
  | "verification_recommended"
  | "verification_required_by_policy"
  | "insufficient_information";
export type PreparedAssessmentStatus = "draft" | "prepared";

export interface VerificationNeedView {
  id: string;
  personId: string;
  personName: string;
  vacancyId: string;
  vacancyTitle: string;
  requirementId: string | null;
  competencyKey: string;
  competencyLabel: string;
  targetLevel: VerificationLevel;
  criticality: VerificationCriticality;
  status: "open" | "draft" | "prepared" | "cancelled";
  sufficiencyStatus: VerificationSufficiencyStatus;
  sufficiencyRequirement: "none" | "optional" | "recommended" | "required_by_policy";
  reasonCodes: string[];
  explanation: string;
  engineVersion: string;
  policyVersion: string;
  evidenceSnapshot: Record<string, unknown>;
  contextSnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface VerificationDefinitionView {
  id: string;
  organizationId: string | null;
  key: string;
  name: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  domain: string;
  version: string;
  status: "active" | "retired";
  description: string;
  content: Record<string, unknown>;
  usageCount: number;
}

export interface AssessmentBlueprintView {
  id: string;
  definitionId: string;
  key: string;
  version: string;
  itemCount: number;
  estimatedMinutes: number;
  modality: "multiple_choice";
  language: string;
  dimensionDistribution: Array<{ dimension: string; count: number }>;
}

export interface AssessmentRubricView {
  id: string;
  definitionId: string;
  key: string;
  version: string;
  passingRules: Record<string, unknown>;
  correctionDimensions: string[];
}

export interface ItemBankSummaryView {
  competencyKey: string;
  targetLevel: VerificationLevel;
  source: "global" | "organization";
  availableItems: number;
}

export interface PreparedAssessmentView {
  id: string;
  needId: string;
  definitionId: string;
  blueprintId: string;
  rubricId: string;
  status: PreparedAssessmentStatus;
  itemIds: string[];
  versionSnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface VerificationWorkspaceView {
  needs: VerificationNeedView[];
  definitions: VerificationDefinitionView[];
  blueprints: AssessmentBlueprintView[];
  rubrics: AssessmentRubricView[];
  itemBankSummary: ItemBankSummaryView[];
  preparedAssessments: PreparedAssessmentView[];
}

export interface PrepareAssessmentResult {
  preparedAssessmentId: string;
  needId: string;
  status: PreparedAssessmentStatus;
  itemCount: number;
}

export type VerificationRuntimeStatus = "pending" | "opened" | "in_progress" | "paused" | "completed" | "inconclusive" | "expired" | "cancelled" | "revoked";
export type ParticipantResultVisibility = "completion_only" | "summary" | "detailed";

export interface PreparedVerificationOption {
  id: string;
  needId: string;
  personId: string;
  personName: string;
  email: string | null;
  phone: string | null;
  competency: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  criticality: VerificationCriticality;
  context: string | null;
  itemCount: number;
  estimatedMinutes: number;
  createdAt: string;
}

export interface VerificationMonitoringRow {
  invitationId: string;
  preparedAssessmentId: string;
  personId: string;
  personName: string;
  competency: string;
  targetLevel: VerificationLevel;
  status: VerificationRuntimeStatus;
  expiresAt: string;
  lastActivityAt: string;
  progress: number;
  confidenceState: "high" | "adequate" | "reduced" | "inconclusive" | null;
  demonstratedLevel: VerificationLevel | "insufficient_evidence" | "inconclusive" | null;
  rawResult: { totalQuestions: number; correct: number; incorrect: number; unanswered: number; percentage: number } | null;
  integrityState: "adequate" | "reduced" | "inconclusive" | null;
  issuedAt: string;
  completedAt: string | null;
  automaticDeliveryConfigured: false;
}

export interface VerificationOperatorWorkspace {
  preparedAssessments: PreparedVerificationOption[];
  verifications: VerificationMonitoringRow[];
}

export interface IssuedInvitation {
  invitationId: string;
  status: string;
  expiresAt: string;
  deliveryChannel: string;
  automaticDeliveryConfigured: false;
  resultVisibility: ParticipantResultVisibility;
  token: string;
  relativePath: string;
}

export interface ParticipantQuestion {
  id: string;
  sequence: number;
  itemCode: string;
  itemVersion: string;
  stem: string;
  options: Array<{ id: string; label: string }>;
  dimension: string;
  status: "not_presented" | "active" | "answered" | "marked" | "submitted";
  response: { selectedOptionId: string | null; markedForReview: boolean; version: number } | null;
}

export interface ParticipantAttempt {
  id: string;
  status: "not_started" | "in_progress" | "paused" | "submitted" | "evaluated" | "expired" | "cancelled" | "invalidated" | "inconclusive";
  startedAt: string;
  submittedAt: string | null;
  elapsedTotalSeconds: number;
  lockVersion: number;
  currentQuestionInstanceId: string | null;
  questions: ParticipantQuestion[];
  result: {
    completionCode: string;
    completedAt: string;
    rawResult: { totalQuestions: number; correct: number; incorrect: number; unanswered: number; percentage: number } | null;
    dimensionResults: Record<string, { total: number; correct: number; percentage: number }> | null;
    demonstratedLevel: string | null;
  } | null;
}

export interface ParticipantVerificationWorkspace {
  invitationId: string;
  status: string;
  expiresAt: string;
  resultVisibility: ParticipantResultVisibility;
  person: { name: string };
  verification: {
    competency: string;
    competencyKey: string;
    targetLevel: VerificationLevel;
    criticality: VerificationCriticality;
    context: string | null;
    estimatedMinutes: number;
    itemCount: number;
    modality: "multiple_choice";
  };
  attempt: ParticipantAttempt | null;
  privacy: { recorded: string[]; notRecorded: string[] };
  versions: { invitation: string; instructions: string; publicBoundary: string };
}

export function labelLevel(level: VerificationLevel): string {
  return { basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" }[level];
}

export function labelCriticality(criticality: VerificationCriticality): string {
  return { low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" }[criticality];
}

export function labelSufficiency(status: VerificationSufficiencyStatus): string {
  return {
    sufficient: "Suficiente",
    verification_optional: "Verificação opcional",
    verification_recommended: "Verification recommended",
    verification_required_by_policy: "Verification required by policy",
    insufficient_information: "Informação insuficiente",
  }[status];
}
