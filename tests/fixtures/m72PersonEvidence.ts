import {
  PERSON_PROFESSIONAL_EVIDENCE_CONTRACT,
  type ProfessionalEvidenceAssociation,
  type ProfessionalEvidenceProjection,
} from "../../web/src/domain/personProfessionalEvidence.js";
import { COMPETENCY_TAXONOMY_CONTRACT } from "../../web/src/domain/competencyTaxonomy.js";
import { POSITION_TAXONOMY_CONTRACT } from "../../web/src/domain/positionTaxonomy.js";

export const m72DeclaredEvidence: ProfessionalEvidenceAssociation = {
  id: "observation:declared-fixture",
  nature: "declared",
  concept: { id: "concept-java", label: "Java", type: "technology", scope: "global", version: 1 },
  observedTerm: "Java",
  evidence: {
    id: "evidence-declared",
    title: "Java",
    fact: "Java consta no Perfil publicado.",
    quote: "Desenvolvimento de APIs em Java.",
    recordedAt: "2026-09-18T12:00:00Z",
    source: {
      kind: "document",
      label: "curriculo-sintetico.pdf",
      documentId: "document-fixture",
      filename: "curriculo-sintetico.pdf",
      pageNumber: 2,
      fieldPath: "competencies",
      reviewId: "review-fixture",
      evidenceLinkId: "link-fixture",
      spatialRegionId: "region-fixture",
    },
  },
  explanation: {
    method: "Termo explícito associado por alias aprovado.",
    methodVersion: "knowledge-normalization-2.0.0",
    taxonomyVersion: COMPETENCY_TAXONOMY_CONTRACT,
    knowledgeGlobalVersion: 4,
    knowledgeOrganizationVersion: null,
    sourceName: "O*NET",
    sourceVersion: "31.0",
    humanDecision: "Perfil aprovado por operador autorizado.",
  },
  verification: null,
};

export const m72DemonstratedEvidence: ProfessionalEvidenceAssociation = {
  ...m72DeclaredEvidence,
  id: "demonstrated:fixture",
  nature: "demonstrated",
  evidence: {
    ...m72DeclaredEvidence.evidence,
    id: "demonstrated-fixture",
    title: "Evidência Demonstrada: Java",
    quote: null,
    source: {
      kind: "demonstrated_evidence",
      label: "Verificação de Competências",
      documentId: null,
      filename: null,
      pageNumber: null,
      fieldPath: null,
      reviewId: null,
      evidenceLinkId: null,
      spatialRegionId: null,
    },
  },
  verification: {
    status: "active",
    qualifiesAsVerified: true,
    demonstratedLevel: "intermediate",
    validUntil: "2027-09-18T12:00:00Z",
    evaluationVersion: "verification-evaluation-1.0.0",
    integrityRuleVersion: "verification-integrity-1.0.0",
  },
};

export function m72Fixture(overrides: Partial<ProfessionalEvidenceProjection> = {}): ProfessionalEvidenceProjection {
  return {
    contractVersion: PERSON_PROFESSIONAL_EVIDENCE_CONTRACT,
    normalization: {
      status: "complete", declaredCount: 1, methodVersion: "declared-competency-normalization-1.0.0", errorCode: null, items: [],
      latestAttempt: { runId: "run-fixture", status: "complete", errorCode: null, completedAt: "2026-09-18T12:00:00Z", usedAsBasis: true },
      coverage: { totalItemCount: 0, associatedItemCount: 0, uniqueConceptCount: 0, pendingItemCount: 0, uniquePendingTermCount: 0 },
    },
    taxonomyVersions: { occupation: POSITION_TAXONOMY_CONTRACT, competency: COMPETENCY_TAXONOMY_CONTRACT },
    organizationId: "org-fixture",
    personId: "person-fixture",
    profile: { id: "profile-fixture", version: 3, publishedAt: "2026-09-18T12:00:00Z", inferenceVersion: "professional-profile-inference-1.0.0" },
    associations: [m72DeclaredEvidence, m72DemonstratedEvidence],
    issues: [{ code: "ambiguous", observedTerm: "Arquitetura", explanation: "Mais de um conceito publicado é possível." }],
    ...overrides,
  };
}
