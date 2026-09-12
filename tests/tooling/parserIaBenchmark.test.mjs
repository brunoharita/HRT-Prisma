import assert from "node:assert/strict";
import test from "node:test";
import { compareApprovedReference } from "../../scripts/benchmark-parser-ia.mjs";
const reference = { humanApproved: true, approvedBy: "Human", expectedFacts: [
  { id: "one.organization", field: "experiences.*.organization", value: "Organization One" },
  { id: "one.role", field: "experiences.*.role", value: "Role One" },
  { id: "one.period", field: "experiences.*.period", value: "2020 - 2022" },
] };
const draft = (experiences) => ({ experiences, education: [], certifications: [], languages: [], competencies: [] });
test("M5.7 benchmark pairs unique company/period anchors and exposes wrong role", () => {
  const comparison = compareApprovedReference(reference, draft([{ id: "different-id", organization: "Organization One", role: "Typo Role", period: "2020 - 2022" }]));
  assert.equal(comparison.exactMatches, 2); assert.equal(comparison.valueDifferences, 1); assert.equal(comparison.semanticApproval, false);
});
test("M5.7 benchmark cannot resolve identical duplicate records by position", () => {
  const record = { organization: "Organization One", role: "Role One", period: "2020 - 2022" };
  const comparison = compareApprovedReference(reference, draft([{ id: "a", ...record }, { id: "b", ...record }]));
  assert.equal(comparison.unmatchedOrAmbiguous, 3); assert.equal(comparison.exactMatches, 0);
});
test("M5.7 benchmark never promotes an unapproved reference", () => {
  assert.throws(() => compareApprovedReference({ ...reference, humanApproved: false }, draft([])), /APPROVED_REFERENCE_REQUIRED/);
});
