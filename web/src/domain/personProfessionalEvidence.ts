import { POSITION_TAXONOMY_CONTRACT, taxonomyGroups, type ProfessionalConceptType } from "./positionTaxonomy.js";

export const PERSON_PROFESSIONAL_EVIDENCE_CONTRACT = "person-professional-evidence-1.0.0";

export type ProfessionalEvidenceNature = "declared" | "contextual" | "demonstrated";

export interface ProfessionalEvidenceSource {
  kind: "published_profile" | "document" | "demonstrated_evidence";
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
    taxonomyVersion: typeof POSITION_TAXONOMY_CONTRACT;
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
  taxonomyContractVersion: typeof POSITION_TAXONOMY_CONTRACT;
  organizationId: string;
  personId: string;
  profile: {
    id: string;
    version: number;
    publishedAt: string;
    inferenceVersion: string;
  };
  associations: ProfessionalEvidenceAssociation[];
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
  evidences: ProfessionalEvidenceAssociation[];
  natures: ProfessionalEvidenceNature[];
  hasCurrentDemonstratedEvidence: boolean;
}

export interface ProfessionalEvidenceGroupView {
  key: ProfessionalConceptType;
  label: string;
  concepts: ProfessionalConceptEvidenceView[];
}

export function readProfessionalEvidenceProjection(
  value: unknown,
  organizationId: string,
  personId: string,
): ProfessionalEvidenceProjection {
  if (!isRecord(value)
    || value.contractVersion !== PERSON_PROFESSIONAL_EVIDENCE_CONTRACT
    || value.taxonomyContractVersion !== POSITION_TAXONOMY_CONTRACT
    || value.organizationId !== organizationId
    || value.personId !== personId
    || !isRecord(value.profile)
    || typeof value.profile.id !== "string"
    || !Number.isSafeInteger(value.profile.version)
    || typeof value.profile.publishedAt !== "string"
    || typeof value.profile.inferenceVersion !== "string"
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
      if (!existing.natures.includes(association.nature)) existing.natures.push(association.nature);
      existing.hasCurrentDemonstratedEvidence ||= association.nature === "demonstrated"
        && Boolean(association.verification?.qualifiesAsVerified);
      continue;
    }
    concepts.set(association.concept.id, {
      id: association.concept.id,
      label: association.concept.label,
      type: association.concept.type,
      scope: association.concept.scope,
      version: association.concept.version,
      evidences: [association],
      natures: [association.nature],
      hasCurrentDemonstratedEvidence: association.nature === "demonstrated"
        && Boolean(association.verification?.qualifiesAsVerified),
    });
  }
  return (Object.keys(taxonomyGroups) as ProfessionalConceptType[]).flatMap((key) => {
    const grouped = [...concepts.values()]
      .filter((concept) => concept.type === key)
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
    return grouped.length ? [{ key, label: taxonomyGroups[key], concepts: grouped }] : [];
  });
}

export function summarizeProfessionalEvidence(projection: ProfessionalEvidenceProjection) {
  const groups = groupProfessionalEvidence(projection);
  const concepts = groups.flatMap((group) => group.concepts);
  return {
    groupCount: groups.length,
    conceptCount: concepts.length,
    declaredCount: concepts.filter((concept) => concept.natures.includes("declared")).length,
    contextualCount: concepts.filter((concept) => concept.natures.includes("contextual")).length,
    demonstratedCount: concepts.filter((concept) => concept.hasCurrentDemonstratedEvidence).length,
    evidenceCount: projection.associations.length,
  };
}

export function evidenceNatureLabel(nature: ProfessionalEvidenceNature): string {
  if (nature === "declared") return "Declarada";
  if (nature === "contextual") return "Contextual";
  return "Evidência demonstrada";
}

function validAssociation(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== "string"
    || !["declared", "contextual", "demonstrated"].includes(String(value.nature))
    || !isRecord(value.concept) || typeof value.concept.id !== "string" || typeof value.concept.label !== "string"
    || !Object.hasOwn(taxonomyGroups, String(value.concept.type))
    || !["global", "organization"].includes(String(value.concept.scope))
    || !Number.isSafeInteger(value.concept.version)
    || typeof value.observedTerm !== "string"
    || !isRecord(value.evidence) || typeof value.evidence.id !== "string" || typeof value.evidence.title !== "string"
    || typeof value.evidence.fact !== "string" || typeof value.evidence.recordedAt !== "string"
    || !(value.evidence.quote === null || typeof value.evidence.quote === "string")
    || !validSource(value.evidence.source)
    || !isRecord(value.explanation) || typeof value.explanation.method !== "string"
    || typeof value.explanation.methodVersion !== "string"
    || value.explanation.taxonomyVersion !== POSITION_TAXONOMY_CONTRACT
    || !nullableNumber(value.explanation.knowledgeGlobalVersion)
    || !nullableNumber(value.explanation.knowledgeOrganizationVersion)
    || !nullableString(value.explanation.sourceName) || !nullableString(value.explanation.sourceVersion)
    || !nullableString(value.explanation.humanDecision)) return false;
  if (value.nature === "demonstrated") {
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
    && ["published_profile", "document", "demonstrated_evidence"].includes(String(value.kind))
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

function nullableString(value: unknown): boolean { return value === null || typeof value === "string"; }
function nullableNumber(value: unknown): boolean { return value === null || (typeof value === "number" && Number.isFinite(value)); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
