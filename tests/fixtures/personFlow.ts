import type { PersonDocumentTimelineItem, ProcessingAttemptView, StructuredDraft } from "../../web/src/domain/personIngestion.js";

// Synthetic and intentionally independent of real people, credentials and databases.
// Published snapshots represent server inputs; they do not implement publication.
export const syntheticResumeText = [
  "Lia Cenário Sintético", "lia.fixture@example.invalid", "EXPERIÊNCIA PROFISSIONAL",
  "Analista de Dados", "Empresa Exemplo", "Jan/2020 - Dez/2024",
  "Análise de dados e elaboração de relatórios.", "COMPETÊNCIAS", "SQL", "Power BI",
].join("\n");

export function profileFixture(overrides: Partial<StructuredDraft> = {}): StructuredDraft {
  return {
    identity: { fullName: "Lia Cenário Sintético" },
    contact: { city: null, state: null, phone: null, email: "lia.fixture@example.invalid", linkedin: null },
    professionalTitle: "Analista de Dados", areasOfExpertise: [], professionalObjective: null,
    summary: null, keyResults: [],
    experiences: [{ id: "synthetic-exp-1", source: "human", organization: "Empresa Exemplo", role: "Analista de Dados",
      period: "2020 - 2024", description: null, evidenceText: "Analista de Dados", page: 1 }],
    education: [], certifications: [], languages: [], competencies: ["SQL", "Power BI"],
    customSections: [], uncertainties: [], notIdentified: [], ...overrides,
  };
}

export function attemptFixture(overrides: Partial<ProcessingAttemptView> = {}): ProcessingAttemptView {
  return { id: "synthetic-attempt-2", attemptNumber: 1, state: "structured", currentMethod: "deterministic",
    pagesNative: 1, pagesOcr: 0, usefulCharacterCount: syntheticResumeText.length, failureCode: null,
    failureMessage: null, startedAt: "2026-09-11T12:00:00Z", completedAt: "2026-09-11T12:00:01Z", ...overrides };
}

export function documentFixture(overrides: Partial<PersonDocumentTimelineItem> = {}): PersonDocumentTimelineItem {
  return { id: "synthetic-document-2", filename: "synthetic-resume.txt", sourceType: "manual_text", documentVersion: 2,
    byteSize: null, pageCount: 1, status: "ready_for_review", reviewState: "ready_for_review",
    createdAt: "2026-09-11T12:00:00Z", processedAt: "2026-09-11T12:00:01Z", profileVersion: null,
    verificationReviewId: "synthetic-review-2", isLegacyUnstored: false,
    latestAttempt: attemptFixture(), reviewAttempt: attemptFixture(), ...overrides };
}
