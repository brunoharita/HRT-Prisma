import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersonCenterViewModel,
  derivePersonPendingActions,
  PERSON_ACTION_CENTER_VERSION,
} from "../web/src/domain/personActionCenter.js";
import type {
  PersonDocumentTimelineItem,
  PersonIngestionWorkspace,
  ProcessingAttemptView,
  ProfileVersionView,
} from "../web/src/domain/personIngestion.js";

test("derives one direct human action without contaminating the current profile", () => {
  const document = makeDocument();
  const actions = derivePersonPendingActions([document]);

  assert.equal(PERSON_ACTION_CENTER_VERSION, "1.0.0");
  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.type, "review_document");
  assert.equal(actions[0]?.title, "Nova importação requer revisão");
  assert.equal(actions[0]?.primaryAction?.label, "Revisar documento agora");
  assert.equal(actions[0]?.primaryAction?.available, true);
  assert.equal(actions[0]?.document.id, document.id);
});

test("sorts real pending documents by operational priority instead of date alone", () => {
  const review = makeDocument({ id: "review", createdAt: "2026-09-02T12:00:00.000Z" });
  const failureAttempt = makeAttempt("failed_extraction");
  failureAttempt.pagesNative = 1;
  const failure = makeDocument({
    id: "failure",
    createdAt: "2026-09-01T12:00:00.000Z",
    status: "failed",
    reviewState: "not_ready",
    latestAttempt: failureAttempt,
    reviewAttempt: null,
  });

  const actions = derivePersonPendingActions([review, failure]);

  assert.deepEqual(actions.map((action) => action.type), ["reprocess_document", "review_document"]);
  assert.equal(actions[0]?.primaryAction?.label, "Reprocessar documento");
});

test("does not invent pending actions for processing, published, or discarded documents", () => {
  const processing = makeDocument({ status: "processing", reviewState: "not_ready", latestAttempt: makeAttempt("extracting_native"), reviewAttempt: null });
  const published = makeDocument({ status: "approved", reviewState: "approved", profileVersion: 2, reviewAttempt: null });
  const discarded = makeDocument({ status: "failed", reviewState: "invalidated", reviewAttempt: null });

  assert.deepEqual(derivePersonPendingActions([processing, published, discarded]), []);
});

test("fails closed when a technical failure has no recoverable source", () => {
  const failed = makeDocument({
    status: "failed",
    reviewState: "not_ready",
    latestAttempt: makeAttempt("failed_extraction"),
    reviewAttempt: null,
  });

  const [action] = derivePersonPendingActions([failed]);

  assert.equal(action?.type, "reprocess_document");
  assert.equal(action?.primaryAction, null);
  assert.equal(action?.secondaryActions.some((item) => item.kind === "open_details"), false);
  assert.equal(action?.secondaryActions.some((item) => item.kind === "open_document"), true);
});

test("builds the Person Center from current facts without opaque metrics", () => {
  const workspace = makeWorkspace();
  const version = makeProfileVersion();
  const model = buildPersonCenterViewModel(workspace, version);

  assert.equal(model.identity.fullName, "Bruno Harita");
  assert.equal(model.identity.professionalTitle, "Diretor de Operações");
  assert.equal(model.identity.location, "Bauru, BR");
  assert.equal(model.currentProfile?.version, 1);
  assert.equal(model.currentProfile?.sourceDocumentName, "curriculo-v1.pdf");
  assert.deepEqual(model.summary, {
    documents: { total: 2, published: 1, awaitingReview: 1, processing: 0 },
    experiences: 1,
    education: 1,
    competencies: 2,
  });
  assert.equal(model.recentActivity.length, 3);
});

test("keeps the Center useful when no Profile has been published", () => {
  const workspace = makeWorkspace();
  workspace.person.currentProfile = null;
  const model = buildPersonCenterViewModel(workspace, null);

  assert.equal(model.currentProfile, null);
  assert.equal(model.professionalKnowledge, null);
  assert.equal(model.summary.experiences, 0);
  assert.equal(model.pendingActions.length, 1);
});

function makeWorkspace(): PersonIngestionWorkspace {
  const approved = makeDocument({ id: "document-v1", filename: "curriculo-v1.pdf", status: "approved", reviewState: "approved", profileVersion: 1, reviewAttempt: null, createdAt: "2026-08-30T10:00:00.000Z" });
  const pending = makeDocument();
  return {
    person: {
      id: "person-1",
      organizationId: "organization-1",
      fullName: "Bruno Harita",
      lifecycle: "candidate",
      operationalStatus: "active",
      archivedAt: null,
      mergedIntoPersonId: null,
      profileState: "generated",
      latestSourceType: "resume_pdf",
      latestSourceAt: pending.createdAt,
      updatedAt: pending.createdAt,
      currentProfile: {
        id: "profile-v1",
        profileVersion: 1,
        sourceDocumentId: approved.id,
        approvedAt: "2026-08-30T10:05:00.000Z",
        createdAt: "2026-08-30T10:05:00.000Z",
      },
      latestDocument: pending,
      documentCount: 2,
      pendingReviewCount: 1,
      privateData: {
        fullName: "Bruno Harita",
        email: "",
        phoneCountryIso2: "BR",
        phoneCountryLabel: "Brasil",
        phoneCountryCode: "+55",
        phoneNationalNumber: "",
        phoneE164: "",
        birthDate: null,
        city: "Bauru",
        countryCode: "BR",
        notes: "",
      },
    },
    documents: [pending, approved],
    selectedDocument: pending,
    pages: [],
    draft: null,
  };
}

function makeProfileVersion(): ProfileVersionView {
  return {
    id: "profile-v1",
    profileVersion: 1,
    profileData: {
      identity: { fullName: null },
      contact: { city: null, state: null, phone: null, email: null, linkedin: null },
      professionalTitle: "Diretor de Operações",
      areasOfExpertise: [],
      professionalObjective: null,
      summary: "Estrutura operações complexas.",
      keyResults: [],
      experiences: [{ id: "experience-1", source: "extracted", organization: "HRT", role: "Diretor", period: "2025 - atual", description: "Operações", page: 1, evidenceText: "Diretor" }],
      education: [{ id: "education-1", source: "extracted", institution: "UNESP", course: "Sistemas de Informação", period: "2010 - 2013", description: null, page: 1, evidenceText: "UNESP" }],
      certifications: [],
      languages: [],
      competencies: ["BPM", "SQL"],
      customSections: [],
      uncertainties: [],
      notIdentified: [],
    },
    reviewStatus: "approved",
    sourceDocumentId: "document-v1",
    processingAttemptId: "attempt-v1",
    approvedByAuthUserId: "operator-1",
    approvedAt: "2026-08-30T10:05:00.000Z",
    createdAt: "2026-08-30T10:05:00.000Z",
    supersededAt: null,
  };
}

function makeDocument(overrides: Partial<PersonDocumentTimelineItem> = {}): PersonDocumentTimelineItem {
  return {
    id: "document-v2",
    filename: "curriculo-v2.pdf",
    sourceType: "resume_pdf",
    documentVersion: 2,
    byteSize: 1000,
    pageCount: 2,
    status: "ready_for_review",
    reviewState: "ready_for_review",
    createdAt: "2026-09-02T10:00:00.000Z",
    processedAt: "2026-09-02T10:01:00.000Z",
    profileVersion: null,
    verificationReviewId: "review-v2",
    isLegacyUnstored: false,
    latestAttempt: makeAttempt("structured"),
    reviewAttempt: makeAttempt("structured"),
    ...overrides,
  };
}

function makeAttempt(state: ProcessingAttemptView["state"]): ProcessingAttemptView {
  return {
    id: `attempt-${state}`,
    attemptNumber: 1,
    state,
    currentMethod: "deterministic",
    pagesNative: state.startsWith("failed") ? 0 : 2,
    pagesOcr: 0,
    usefulCharacterCount: state.startsWith("failed") ? 0 : 1000,
    failureCode: state.startsWith("failed") ? "fixture_failure" : null,
    failureMessage: state.startsWith("failed") ? "Falha sintética" : null,
    startedAt: "2026-09-02T10:00:00.000Z",
    completedAt: "2026-09-02T10:01:00.000Z",
  };
}
