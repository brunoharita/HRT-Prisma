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
