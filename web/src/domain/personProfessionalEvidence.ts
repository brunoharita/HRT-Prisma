import { COMPETENCY_TAXONOMY_CONTRACT, validClassification, type CompetencyClassification } from "./competencyTaxonomy.js";
import { POSITION_TAXONOMY_CONTRACT, taxonomyGroups, type ProfessionalConceptType } from "./positionTaxonomy.js";

export const PERSON_PROFESSIONAL_EVIDENCE_CONTRACT = "person-professional-evidence-4.0.0";

export type ProfessionalEvidenceNature = "declared" | "contextual" | "certified" | "verified_assessment" | "demonstrated_skill" | "assessment_result";

export interface ProfessionalEvidenceSource {
  kind: "published_profile" | "document" | "demonstrated_evidence" | "credential" | "organizational_evidence";
  label: string;
  documentId: string | null;
  filename: string | null;
  pageNumber: number | null;
  fieldPath: string | null;
  reviewId: string | null;
  evidenceLinkId: string | null;
  spatialRegionId: string | null;
}

export interface ProfessionalEvidenceAssociation {
  id: string;
  nature: ProfessionalEvidenceNature;
  concept: {
    id: string;
    label: string;
    type: ProfessionalConceptType;
    scope: "global" | "organization";
    version: number;
    classificationState: "classified" | "pending";
    classification: CompetencyClassification | null;
  };
  observedTerm: string;
  evidence: {
    id: string;
    title: string;
    fact: string;
    quote: string | null;
    recordedAt: string;
    source: ProfessionalEvidenceSource;
  };
  explanation: {
    method: string;
    methodVersion: string;
    taxonomyVersion: typeof COMPETENCY_TAXONOMY_CONTRACT;
    knowledgeGlobalVersion: number | null;
    knowledgeOrganizationVersion: number | null;
    sourceName: string | null;
    sourceVersion: string | null;
    humanDecision: string | null;
  };
  verification: {
    status: string;
    qualifiesAsVerified: boolean;
    demonstratedLevel: string;
    validUntil: string | null;
    evaluationVersion: string;
    integrityRuleVersion: string;
  } | null;
}

export interface ProfessionalEvidenceProjection {
  contractVersion: typeof PERSON_PROFESSIONAL_EVIDENCE_CONTRACT;
  taxonomyVersions: {
    occupation: typeof POSITION_TAXONOMY_CONTRACT;
    competency: typeof COMPETENCY_TAXONOMY_CONTRACT;
  };
  organizationId: string;
  personId: string;
  profile: {
    id: string;
    version: number;
    publishedAt: string;
    inferenceVersion: string;
  };
  associations: ProfessionalEvidenceAssociation[];
  normalization: {
    status: "not_processed" | "queued" | "processing" | "complete" | "failed";
    declaredCount: number;
    methodVersion: "declared-competency-normalization-1.0.0";
    errorCode: string | null;
    items: Array<{ originalIndex: number; originalTerm: string; sourceText: string; normalizedTerm: string;
      searchTerms: string[]; state: "resolved" | "human_preserved" | "ambiguous" | "unresolved" | "source_unavailable"; reason: string }>;
    latestAttempt: {
      runId: string;
      status: "queued" | "processing" | "complete" | "failed";
      errorCode: string | null;
      completedAt: string | null;
      usedAsBasis: boolean;
    } | null;
    coverage: {
      totalItemCount: number;
      associatedItemCount: number;
      uniqueConceptCount: number;
      pendingItemCount: number;
      uniquePendingTermCount: number;
    };
  };
  issues: Array<{
    code: "ambiguous" | "unresolved" | "incompatible" | "source_unavailable";
    observedTerm: string;
    explanation: string;
  }>;
}

export interface ProfessionalConceptEvidenceView {
  id: string;
  label: string;
  type: ProfessionalConceptType;
  scope: "global" | "organization";
  version: number;
  classificationState: "classified" | "pending";
  classification: CompetencyClassification | null;
  evidences: ProfessionalEvidenceAssociation[];
  natures: ProfessionalEvidenceNature[];
  hasCurrentVerifiedAssessment: boolean;
  hasDemonstratedSkill: boolean;
}

export interface ProfessionalEvidenceGroupView {
  key: string;
  label: string;
  macroGroupCode: "hard" | "soft" | "pending";
  macroGroupLabel: string;
  concepts: ProfessionalConceptEvidenceView[];
}

export function readProfessionalEvidenceProjection(
  value: unknown,
  organizationId: string,
  personId: string,
): ProfessionalEvidenceProjection {
  if (!isRecord(value)
    || value.contractVersion !== PERSON_PROFESSIONAL_EVIDENCE_CONTRACT
    || !isRecord(value.taxonomyVersions)
    || value.taxonomyVersions.occupation !== POSITION_TAXONOMY_CONTRACT
    || value.taxonomyVersions.competency !== COMPETENCY_TAXONOMY_CONTRACT
    || value.organizationId !== organizationId
    || value.personId !== personId
    || !isRecord(value.profile)
    || typeof value.profile.id !== "string"
    || !Number.isSafeInteger(value.profile.version)
    || typeof value.profile.publishedAt !== "string"
    || typeof value.profile.inferenceVersion !== "string"
    || !validNormalization(value.normalization)
    || !Array.isArray(value.associations)
    || !value.associations.every(validAssociation)
    || !Array.isArray(value.issues)
    || !value.issues.every(validIssue)) {
    throw new Error("A projeção profissional possui contrato, versão ou proveniência incompatível.");
  }
  return value as unknown as ProfessionalEvidenceProjection;
}

export function groupProfessionalEvidence(
  projection: ProfessionalEvidenceProjection,
): ProfessionalEvidenceGroupView[] {
  const concepts = new Map<string, ProfessionalConceptEvidenceView>();
  for (const association of projection.associations) {
    const existing = concepts.get(association.concept.id);
    if (existing) {
      existing.evidences.push(association);
      if (association.nature !== "assessment_result" && !existing.natures.includes(association.nature)) existing.natures.push(association.nature);
      existing.hasCurrentVerifiedAssessment ||= association.nature === "verified_assessment";
      existing.hasDemonstratedSkill ||= association.nature === "demonstrated_skill";
      continue;
    }
    concepts.set(association.concept.id, {
      id: association.concept.id,
      label: association.concept.label,
      type: association.concept.type,
      scope: association.concept.scope,
      version: association.concept.version,
      classificationState: association.concept.classificationState,
      classification: association.concept.classification,
      evidences: [association],
      natures: association.nature === "assessment_result" ? [] : [association.nature],
      hasCurrentVerifiedAssessment: association.nature === "verified_assessment",
      hasDemonstratedSkill: association.nature === "demonstrated_skill",
    });
  }
  const groups = new Map<string, ProfessionalEvidenceGroupView>();
  for (const concept of concepts.values()) {
    const classification = concept.classification;
    const key = classification?.subgroupId ?? "pending";
    const group = groups.get(key) ?? {
      key, label: classification?.subgroupLabel ?? "Classificação pendente",
      macroGroupCode: classification?.macroGroupCode ?? "pending",
      macroGroupLabel: classification?.macroGroupLabel ?? "Aguardando curadoria",
      concepts: [],
    };
    group.concepts.push(concept);
    groups.set(key, group);
  }
  const order = { hard: 0, soft: 1, pending: 2 };
  return [...groups.values()].map((group) => ({ ...group,
    concepts: group.concepts.sort((left, right) => left.label.localeCompare(right.label, "pt-BR")),
  })).sort((left, right) => order[left.macroGroupCode] - order[right.macroGroupCode]
    || left.label.localeCompare(right.label, "pt-BR"));
}

export function summarizeProfessionalEvidence(projection: ProfessionalEvidenceProjection) {
  const groups = groupProfessionalEvidence(projection);
  const concepts = groups.flatMap((group) => group.concepts);
  return {
    groupCount: groups.length,
    conceptCount: concepts.length,
    declaredCount: projection.normalization.declaredCount,
    contextualCount: concepts.filter((concept) => concept.natures.includes("contextual")).length,
    verifiedCount: concepts.filter((concept) => concept.hasCurrentVerifiedAssessment).length,
    demonstratedSkillCount: concepts.filter((concept) => concept.hasDemonstratedSkill).length,
    evidenceCount: projection.associations.length,
  };
}

export function evidenceNatureLabel(nature: ProfessionalEvidenceNature): string {
  if (nature === "declared") return "Declarada";
  if (nature === "contextual") return "Contextualizada";
  if (nature === "certified") return "Certificada";
  if (nature === "verified_assessment") return "Verificada por Assessment";
  if (nature === "demonstrated_skill") return "Habilidade Evidenciada";
  return "Assessment sem verificação vigente";
}

function validAssociation(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== "string"
    || !["declared", "contextual", "certified", "verified_assessment", "demonstrated_skill", "assessment_result"].includes(String(value.nature))
    || !isRecord(value.concept) || typeof value.concept.id !== "string" || typeof value.concept.label !== "string"
    || !Object.hasOwn(taxonomyGroups, String(value.concept.type))
    || value.concept.type === "occupation"
    || !["global", "organization"].includes(String(value.concept.scope))
    || !Number.isSafeInteger(value.concept.version)
    || !["classified", "pending"].includes(String(value.concept.classificationState))
    || (value.concept.classificationState === "pending" ? value.concept.classification !== null : !validClassification(value.concept.classification))
    || typeof value.observedTerm !== "string"
    || !isRecord(value.evidence) || typeof value.evidence.id !== "string" || typeof value.evidence.title !== "string"
    || typeof value.evidence.fact !== "string" || typeof value.evidence.recordedAt !== "string"
    || !(value.evidence.quote === null || typeof value.evidence.quote === "string")
    || !validSource(value.evidence.source)
    || !isRecord(value.explanation) || typeof value.explanation.method !== "string"
    || typeof value.explanation.methodVersion !== "string"
    || value.explanation.taxonomyVersion !== COMPETENCY_TAXONOMY_CONTRACT
    || !nullableNumber(value.explanation.knowledgeGlobalVersion)
    || !nullableNumber(value.explanation.knowledgeOrganizationVersion)
    || !nullableString(value.explanation.sourceName) || !nullableString(value.explanation.sourceVersion)
    || !nullableString(value.explanation.humanDecision)) return false;
  if (value.nature === "verified_assessment" || value.nature === "assessment_result") {
    return isRecord(value.verification) && typeof value.verification.status === "string"
      && typeof value.verification.qualifiesAsVerified === "boolean"
      && typeof value.verification.demonstratedLevel === "string"
      && nullableString(value.verification.validUntil)
      && typeof value.verification.evaluationVersion === "string"
      && typeof value.verification.integrityRuleVersion === "string";
  }
  return value.verification === null;
}

function validSource(value: unknown): boolean {
  return isRecord(value)
    && ["published_profile", "document", "demonstrated_evidence", "credential", "organizational_evidence"].includes(String(value.kind))
    && typeof value.label === "string"
    && nullableString(value.documentId) && nullableString(value.filename) && nullableNumber(value.pageNumber)
    && nullableString(value.fieldPath) && nullableString(value.reviewId)
    && nullableString(value.evidenceLinkId) && nullableString(value.spatialRegionId);
}

function validIssue(value: unknown): boolean {
  return isRecord(value)
    && ["ambiguous", "unresolved", "incompatible", "source_unavailable"].includes(String(value.code))
    && typeof value.observedTerm === "string" && typeof value.explanation === "string";
}

function validNormalization(value: unknown): boolean {
  return isRecord(value) && ["not_processed", "queued", "processing", "complete", "failed"].includes(String(value.status))
    && value.methodVersion === "declared-competency-normalization-1.0.0"
    && Number.isSafeInteger(value.declaredCount) && Number(value.declaredCount) >= 0 && nullableString(value.errorCode)
    && validLatestAttempt(value.latestAttempt) && validCoverage(value.coverage)
    && Array.isArray(value.items) && value.items.every((item) => isRecord(item) && Number.isSafeInteger(item.originalIndex)
      && Number(item.originalIndex) >= 0 && typeof item.originalTerm === "string" && typeof item.sourceText === "string"
      && typeof item.normalizedTerm === "string" && typeof item.reason === "string"
      && Array.isArray(item.searchTerms) && item.searchTerms.every((term) => typeof term === "string")
      && ["resolved", "human_preserved", "ambiguous", "unresolved", "source_unavailable"].includes(String(item.state)));
}

function validLatestAttempt(value: unknown): boolean {
  return value === null || (isRecord(value) && typeof value.runId === "string"
    && ["queued", "processing", "complete", "failed"].includes(String(value.status))
    && nullableString(value.errorCode) && nullableString(value.completedAt) && typeof value.usedAsBasis === "boolean");
}

function validCoverage(value: unknown): boolean {
  return isRecord(value) && ["totalItemCount", "associatedItemCount", "uniqueConceptCount", "pendingItemCount", "uniquePendingTermCount"]
    .every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0);
}

function nullableString(value: unknown): boolean { return value === null || typeof value === "string"; }
function nullableNumber(value: unknown): boolean { return value === null || (typeof value === "number" && Number.isFinite(value)); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
