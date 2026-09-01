import { randomUUID } from "node:crypto";

export type VerificationLevel = "basic" | "intermediate" | "advanced";
export type VerificationCriticality = "low" | "medium" | "high" | "critical";
export type VerificationRequirement = "none" | "optional" | "recommended" | "required_by_policy";
export type DocumentaryEvidenceStrength = "none" | "limited" | "strong";
export type EvidenceSufficiencyStatus =
  | "sufficient"
  | "verification_optional"
  | "verification_recommended"
  | "verification_required_by_policy"
  | "insufficient_information";
export type VerificationNeedStatus = "open" | "draft" | "prepared" | "cancelled";
export type PreparedAssessmentStatus = "draft" | "prepared";
export type AssessmentItemState = "active" | "inactive" | "deprecated" | "compromised";

export type EvidenceSufficiencyReasonCode =
  | "DEMONSTRATED_EVIDENCE_CONFIRMS_LEVEL"
  | "DOCUMENTARY_EVIDENCE_STRONG_BUT_NOT_DEMONSTRATED"
  | "DOCUMENTARY_EVIDENCE_LIMITED"
  | "NO_DEMONSTRATED_EVIDENCE"
  | "NO_RELEVANT_EVIDENCE"
  | "POLICY_REQUIRES_VERIFICATION"
  | "POLICY_RECOMMENDS_VERIFICATION"
  | "CRITICAL_NEED_REQUIRES_HUMAN_CONFIRMATION"
  | "ADVANCED_LEVEL_REQUIRES_DEMONSTRATION"
  | "DEFINITION_NOT_AVAILABLE"
  | "UNKNOWN_CONTRACT_VERSION";

export const M51A_VERSIONS = {
  sufficiencyEngine: "m51a-evidence-sufficiency-1.0.0",
  verificationPolicy: "m51a-verification-policy-1.0.0",
  verificationDefinition: "m51a-verification-definition-1.0.0",
  blueprint: "m51a-assessment-blueprint-1.0.0",
  rubric: "m51a-assessment-rubric-1.0.0",
  item: "m51a-assessment-item-1.0.0",
  composer: "m51a-assessment-composer-1.0.0",
  preparedAssessment: "m51a-prepared-assessment-1.0.0",
} as const;

export interface EvidenceSufficiencyInput {
  organizationId: string;
  personId: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  criticality: VerificationCriticality;
  documentaryEvidenceStrength: DocumentaryEvidenceStrength;
  hasContextualEvidence: boolean;
  hasHumanConfirmedEvidence: boolean;
  hasDemonstratedEvidence: boolean;
  demonstratedEvidenceFresh?: boolean;
  policyRequirement: VerificationRequirement;
  definitionAvailable: boolean;
  contractVersion?: string;
}

export interface EvidenceSufficiencyEvaluation {
  status: EvidenceSufficiencyStatus;
  reasonCodes: EvidenceSufficiencyReasonCode[];
  requirement: VerificationRequirement;
  engineVersion: string;
  evaluatedAt: string;
  explanation: string;
}

export interface VerificationNeed {
  id: string;
  organizationId: string;
  personId: string;
  vacancyId: string;
  requirementId: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  criticality: VerificationCriticality;
  status: VerificationNeedStatus;
  sufficiency: EvidenceSufficiencyEvaluation;
}

export interface VerificationDefinition {
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
}

export interface AssessmentBlueprint {
  id: string;
  key: string;
  version: string;
  definitionId: string;
  itemCount: number;
  estimatedMinutes: number;
  modality: "multiple_choice";
  language: "pt-BR";
  dimensionDistribution: Array<{ dimension: string; count: number }>;
}

export interface AssessmentRubric {
  id: string;
  key: string;
  version: string;
  definitionId: string;
  passingRules: {
    minimumCorrectPercentage: number;
    requiredDimensions: string[];
  };
}

export interface AssessmentItem {
  id: string;
  familyId: string;
  key: string;
  version: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  dimension: string;
  state: AssessmentItemState;
  source: "global" | "organization";
  language: "pt-BR";
  modality: "multiple_choice";
  stem: string;
}

export interface AssessmentCompositionResult {
  ok: boolean;
  reasonCode?: "INSUFFICIENT_ITEM_BANK_COVERAGE";
  selectedItems: AssessmentItem[];
  composerVersion: string;
}

export interface PreparedAssessment {
  id: string;
  organizationId: string;
  needId: string;
  definitionId: string;
  blueprintId: string;
  rubricId: string;
  status: PreparedAssessmentStatus;
  itemIds: string[];
  versions: {
    definitionVersion: string;
    blueprintVersion: string;
    rubricVersion: string;
    itemVersions: Record<string, string>;
    composerVersion: string;
    preparedAssessmentVersion: string;
  };
  createdAt: string;
}

export function evaluateEvidenceSufficiency(input: EvidenceSufficiencyInput): EvidenceSufficiencyEvaluation {
  const reasonCodes = new Set<EvidenceSufficiencyReasonCode>();
  const evaluatedAt = new Date().toISOString();
  if (input.contractVersion && input.contractVersion !== M51A_VERSIONS.sufficiencyEngine) {
    return buildEvaluation("insufficient_information", "required_by_policy", ["UNKNOWN_CONTRACT_VERSION"], evaluatedAt);
  }
  if (!input.definitionAvailable) {
    return buildEvaluation("insufficient_information", "required_by_policy", ["DEFINITION_NOT_AVAILABLE"], evaluatedAt);
  }
  if (input.hasDemonstratedEvidence && input.demonstratedEvidenceFresh !== false) {
    return buildEvaluation("sufficient", input.policyRequirement, ["DEMONSTRATED_EVIDENCE_CONFIRMS_LEVEL"], evaluatedAt);
  }
  if (input.policyRequirement === "required_by_policy") {
    reasonCodes.add("POLICY_REQUIRES_VERIFICATION");
    reasonCodes.add("NO_DEMONSTRATED_EVIDENCE");
    if (input.criticality === "critical" || input.criticality === "high") reasonCodes.add("CRITICAL_NEED_REQUIRES_HUMAN_CONFIRMATION");
    if (input.targetLevel === "advanced") reasonCodes.add("ADVANCED_LEVEL_REQUIRES_DEMONSTRATION");
    return buildEvaluation("verification_required_by_policy", "required_by_policy", [...reasonCodes], evaluatedAt);
  }
  if (input.policyRequirement === "recommended") {
    reasonCodes.add("POLICY_RECOMMENDS_VERIFICATION");
  }
  if (input.documentaryEvidenceStrength === "strong") {
    reasonCodes.add("DOCUMENTARY_EVIDENCE_STRONG_BUT_NOT_DEMONSTRATED");
  } else if (input.documentaryEvidenceStrength === "limited") {
    reasonCodes.add("DOCUMENTARY_EVIDENCE_LIMITED");
  } else {
    reasonCodes.add("NO_RELEVANT_EVIDENCE");
  }
  if (!input.hasDemonstratedEvidence) reasonCodes.add("NO_DEMONSTRATED_EVIDENCE");
  if (input.criticality === "critical" || input.criticality === "high") reasonCodes.add("CRITICAL_NEED_REQUIRES_HUMAN_CONFIRMATION");
  if (input.targetLevel === "advanced") reasonCodes.add("ADVANCED_LEVEL_REQUIRES_DEMONSTRATION");

  const needsVerification = input.policyRequirement === "recommended"
    || input.targetLevel === "advanced"
    || input.criticality === "critical"
    || input.criticality === "high";
  if (input.documentaryEvidenceStrength === "none" && !input.hasContextualEvidence && !input.hasHumanConfirmedEvidence) {
    return buildEvaluation("insufficient_information", input.policyRequirement, [...reasonCodes], evaluatedAt);
  }
  return buildEvaluation(needsVerification ? "verification_recommended" : "verification_optional", input.policyRequirement, [...reasonCodes], evaluatedAt);
}

export function createVerificationNeed(input: {
  organizationId: string;
  personId: string;
  vacancyId: string;
  requirementId: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  criticality: VerificationCriticality;
  sufficiency: EvidenceSufficiencyEvaluation;
}): VerificationNeed {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    personId: input.personId,
    vacancyId: input.vacancyId,
    requirementId: input.requirementId,
    competencyKey: input.competencyKey,
    targetLevel: input.targetLevel,
    criticality: input.criticality,
    status: "open",
    sufficiency: input.sufficiency,
  };
}

export function composePreparedAssessment(input: {
  organizationId: string;
  needId: string;
  definition: VerificationDefinition;
  blueprint: AssessmentBlueprint;
  rubric: AssessmentRubric;
  itemBank: AssessmentItem[];
  status: PreparedAssessmentStatus;
}): AssessmentCompositionResult & { preparedAssessment?: PreparedAssessment } {
  const selectedItems = selectItems(input.blueprint, input.definition, input.itemBank);
  if (selectedItems.length !== input.blueprint.itemCount) {
    return {
      ok: false,
      reasonCode: "INSUFFICIENT_ITEM_BANK_COVERAGE",
      selectedItems,
      composerVersion: M51A_VERSIONS.composer,
    };
  }
  const preparedAssessment: PreparedAssessment = {
    id: randomUUID(),
    organizationId: input.organizationId,
    needId: input.needId,
    definitionId: input.definition.id,
    blueprintId: input.blueprint.id,
    rubricId: input.rubric.id,
    status: input.status,
    itemIds: selectedItems.map((item) => item.id),
    versions: {
      definitionVersion: input.definition.version,
      blueprintVersion: input.blueprint.version,
      rubricVersion: input.rubric.version,
      itemVersions: Object.fromEntries(selectedItems.map((item) => [item.id, item.version])),
      composerVersion: M51A_VERSIONS.composer,
      preparedAssessmentVersion: M51A_VERSIONS.preparedAssessment,
    },
    createdAt: new Date().toISOString(),
  };
  return { ok: true, selectedItems, composerVersion: M51A_VERSIONS.composer, preparedAssessment };
}

export function describeSufficiencyStatus(status: EvidenceSufficiencyStatus): string {
  const labels: Record<EvidenceSufficiencyStatus, string> = {
    sufficient: "Suficiente",
    verification_optional: "Verificação opcional",
    verification_recommended: "Verificação recomendada",
    verification_required_by_policy: "Verificação exigida por política",
    insufficient_information: "Informação insuficiente",
  };
  return labels[status];
}

function selectItems(blueprint: AssessmentBlueprint, definition: VerificationDefinition, itemBank: AssessmentItem[]): AssessmentItem[] {
  const selected: AssessmentItem[] = [];
  const available = itemBank
    .filter((item) =>
      item.state === "active"
      && item.competencyKey === definition.competencyKey
      && item.targetLevel === definition.targetLevel
      && item.modality === blueprint.modality
      && item.language === blueprint.language,
    )
    .sort((left, right) => `${left.dimension}:${left.key}`.localeCompare(`${right.dimension}:${right.key}`));
  for (const rule of blueprint.dimensionDistribution) {
    selected.push(...available.filter((item) => item.dimension === rule.dimension).slice(0, rule.count));
  }
  return selected.slice(0, blueprint.itemCount);
}

function buildEvaluation(
  status: EvidenceSufficiencyStatus,
  requirement: VerificationRequirement,
  reasonCodes: EvidenceSufficiencyReasonCode[],
  evaluatedAt: string,
): EvidenceSufficiencyEvaluation {
  return {
    status,
    reasonCodes,
    requirement,
    engineVersion: M51A_VERSIONS.sufficiencyEngine,
    evaluatedAt,
    explanation: buildExplanation(status, reasonCodes),
  };
}

function buildExplanation(status: EvidenceSufficiencyStatus, reasonCodes: EvidenceSufficiencyReasonCode[]): string {
  if (status === "sufficient") return "Há evidência demonstrada vigente para sustentar o nível requerido.";
  if (status === "verification_required_by_policy") return "A política vigente exige verificação humana antes de tratar a aderência como demonstrada.";
  if (status === "verification_recommended") return "A evidência existente ajuda a indicar aderência, mas não demonstra a competência no nível requerido.";
  if (status === "verification_optional") return "A verificação é possível, mas não é obrigatória para a necessidade atual.";
  if (reasonCodes.includes("DEFINITION_NOT_AVAILABLE")) return "Não há definição de verificação disponível para este recorte.";
  return "A informação disponível não sustenta uma conclusão material sobre a competência.";
}
