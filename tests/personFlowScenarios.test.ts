import assert from "node:assert/strict";
import test from "node:test";
import { extractResumeIdentity, hasMinimumResumeIdentity } from "../src/domain/resumeIdentity.js";
import { processManualText } from "../web/src/domain/personIngestion.js";
import { deriveResumeProductState } from "../web/src/domain/resumeProductState.js";
import { derivePersonPendingActions } from "../web/src/domain/personActionCenter.js";
import { deriveProfileDelta, isProfileBlockDecisionItem } from "../web/src/domain/profileDelta.js";
import { buildPrismaProfileView } from "../web/src/domain/canonicalProfile.js";
import { attemptFixture, documentFixture, profileFixture, syntheticResumeText } from "./fixtures/personFlow.js";

test("PF-01: synthetic import extracts source and identity without approving a profile", () => {
  const current = profileFixture();
  const before = structuredClone(current);
  const { page, draft } = processManualText(syntheticResumeText);
  const identity = extractResumeIdentity([{ pageNumber: 1, text: syntheticResumeText }]);
  assert.equal(identity.email, "lia.fixture@example.invalid");
  assert.equal(hasMinimumResumeIdentity(identity), true);
  assert.ok(page.text.includes("Empresa Exemplo"));
  assert.ok(draft.competencies.includes("SQL"));
  assert.equal(deriveResumeProductState({ documentStatus: "processing", profilePreserved: true }).publicationPossible, false);
  assert.deepEqual(current, before);
});

test("PF-02: partial review offers the correct document and never silently removes approved knowledge", () => {
  const current = profileFixture();
  const before = structuredClone(current);
  const proposal = profileFixture({ experiences: [], competencies: ["SQL"] });
  const delta = deriveProfileDelta(current, proposal);
  const [action] = derivePersonPendingActions([documentFixture()]);
  assert.equal(action?.document.id, "synthetic-document-2");
  assert.equal(action?.document.reviewAttempt?.id, "synthetic-attempt-2");
  assert.equal(action?.primaryAction?.kind, "review");
  assert.equal(delta.items.find((item) => item.key === "experiences::synthetic-exp-1")?.kind, "not_cited");
  assert.equal(delta.counts.explicit_removal, 0);
  assert.deepEqual(current, before);
});

test("PF-03: publication preparation separates private contact and explicit removal from omission", () => {
  const current = profileFixture();
  const proposal = profileFixture({ competencies: ["SQL"], contact: { ...current.contact, email: "changed.fixture@example.invalid" } });
  const ordinary = deriveProfileDelta(current, proposal, { currentContact: current.contact });
  const explicit = deriveProfileDelta(current, proposal, { currentContact: current.contact, explicitRemovalKeys: new Set(["competencies::power bi"]) });
  assert.equal(ordinary.counts.explicit_removal, 0);
  assert.equal(explicit.counts.explicit_removal, 1);
  assert.ok(ordinary.items.some((item) => item.section === "private_contact"));
  assert.equal(ordinary.items.filter(isProfileBlockDecisionItem).some((item) => item.section === "private_contact"), false);
  const ready = deriveResumeProductState({ reviewState: "in_review", reviewComplete: true, profilePreserved: true });
  assert.equal(ready.state, "ready_to_publish");
});

test("PF-04: approved server snapshot is readable and document version remains independent of profile version", () => {
  // This is projection of an approved input, NOT a simulated database publish.
  const approved = profileFixture({ competencies: ["SQL"] });
  const view = buildPrismaProfileView({ fullName: approved.identity.fullName!, profile: approved });
  const document = documentFixture({ status: "approved", reviewState: "approved", documentVersion: 3, profileVersion: 2, reviewAttempt: null });
  assert.equal(view.experiences[0]?.role, "Analista de Dados");
  assert.deepEqual(view.competencyGroups.flatMap((group) => group.values.map((value) => value.label)), ["SQL"]);
  assert.deepEqual(derivePersonPendingActions([document]), []);
  assert.notEqual(document.documentVersion, document.profileVersion);
  assert.equal(deriveResumeProductState({ documentStatus: document.status }).nextAction, "open_person");
});

test("PF-05: discard and technical failure never become successful publication", () => {
  const discarded = documentFixture({ reviewState: "invalidated", reviewAttempt: null });
  assert.deepEqual(derivePersonPendingActions([discarded]), []);
  const state = deriveResumeProductState({ reviewState: "invalidated", profilePreserved: true });
  assert.equal(state.profilePreserved, true);
  assert.equal(state.publicationPossible, false);
  const failure = deriveResumeProductState({ latestAttempt: attemptFixture({ state: "failed_extraction", pagesNative: 0, usefulCharacterCount: 0 }), profilePreserved: true });
  assert.equal(failure.nextAction, "replace_file");
  assert.equal(failure.publicationPossible, false);
});

test("PF-06: fixtures reset deterministically and do not share mutable review state", () => {
  const first = profileFixture();
  first.competencies.push("should not leak");
  assert.deepEqual(profileFixture().competencies, ["SQL", "Power BI"]);
  const firstDocument = documentFixture();
  firstDocument.latestAttempt!.state = "failed_extraction";
  assert.equal(documentFixture().latestAttempt?.state, "structured");
});
