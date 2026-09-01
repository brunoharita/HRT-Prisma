import assert from "node:assert/strict";
import test from "node:test";
import { deriveResumeProductState } from "../web/src/domain/resumeProductState.js";
import type { ProcessingAttemptView } from "../web/src/domain/personIngestion.js";

test("derives the seven product states from technical facts without contaminating the Person", () => {
  assert.equal(deriveResumeProductState({ documentStatus: "processing" }).state, "processing");
  assert.equal(deriveResumeProductState({ intakeStatus: "needs_duplicate_resolution" }).state, "requires_identity");
  assert.equal(deriveResumeProductState({ reviewState: "ready_for_review", reviewAttempt: attempt("structured") }).state, "requires_review");
  assert.equal(deriveResumeProductState({ reviewState: "in_review", reviewComplete: true }).state, "ready_to_publish");
  assert.equal(deriveResumeProductState({ reviewState: "approved" }).state, "profile_updated");
  assert.equal(deriveResumeProductState({ latestAttempt: attempt("failed_extraction") }).state, "technical_failure");
  assert.equal(deriveResumeProductState({ reviewState: "invalidated" }).state, "discarded");
});

test("classifies useful partial structuring as review instead of technical failure", () => {
  const partial = attempt("failed_structuring");
  partial.failureCode = "insufficient_structured_facts";
  assert.deepEqual(
    deriveResumeProductState({ latestAttempt: partial, reviewAttempt: partial, profilePreserved: true }),
    {
      state: "requires_review",
      label: "Requer revisão",
      message: "O conteúdo foi recuperado, mas alguns pontos precisam de revisão humana antes da publicação.",
      nextAction: "review_resume",
      nextActionLabel: "Revisar currículo",
      severity: "warning",
      profilePreserved: true,
      documentPreserved: true,
      reviewPossible: true,
      publicationPossible: false,
    },
  );
});

function attempt(state: ProcessingAttemptView["state"]): ProcessingAttemptView {
  return {
    id: "attempt", attemptNumber: 1, state, currentMethod: "deterministic", pagesNative: 2, pagesOcr: 0,
    usefulCharacterCount: 400, failureCode: state.startsWith("failed") ? "fixture" : null,
    failureMessage: state.startsWith("failed") ? "fixture" : null,
    startedAt: "2026-08-31T10:00:00.000Z", completedAt: "2026-08-31T10:01:00.000Z",
  };
}
