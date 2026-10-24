import assert from "node:assert/strict";
import test from "node:test";
import { withPublishedClassifications } from "../web/src/domain/knowledgePublishedClassification.js";
import type { KnowledgeProposalView } from "../web/src/domain/knowledgeData.js";

const proposal = (id: string, overrides: Partial<KnowledgeProposalView> = {}): KnowledgeProposalView => ({
  id, inboxId: "inbox", observedTerm: "Transformação operacional", proposedConcept: { concept_type: "competency" },
  sources: [], candidateConcepts: [], originOrganizationId: "company", organizationId: null, scope: "global",
  status: "approved", originalProposal: { proposed_concept: { canonical_label: "Transformação operacional" } }, publishedConceptId: id, ...overrides,
});
test("published classification is current evidence, without changing the historical proposal", async () => {
  const original = proposal("published");
  const result = await withPublishedClassifications([original], async ids => { assert.deepEqual(ids, ["published"]); return [{ concept_id: "published", subgroup_id: "H4", version: 3 }]; });
  assert.deepEqual(result[0]?.publishedClassification, { state: "published", subgroupId: "H4", version: 3 });
  assert.deepEqual(result[0]?.originalProposal, original.originalProposal);
  assert.equal(result[0]?.proposedConcept.subgroup_id, undefined);
  assert.equal(original.publishedClassification, undefined);
});
test("only visible approved non-occupational concepts are requested, deduplicated", async () => {
  const rows = [proposal("same"), proposal("same"), proposal("pending", { status: "awaiting_human_review" }), proposal("rejected", { status: "rejected" }),
    proposal("deferred", { status: "deferred" }), proposal("occupation", { proposedConcept: { concept_type: "occupation" } }),
    proposal("area", { proposedConcept: { concept_type: "professional_area" } }), proposal("rag", { originWorkflow: "occupational-rag-1.0.0" }), proposal("origin", { originTermId: "term" })];
  await withPublishedClassifications(rows, async ids => { assert.deepEqual(ids, ["same"]); return []; });
  await withPublishedClassifications([], async () => { assert.fail("empty dashboard must not query"); });
});
test("bounded reads isolate failures and never use the original subgroup as saved", async () => {
  const rows = Array.from({ length: 205 }, (_, i) => proposal(String(i), { proposedConcept: { concept_type: "competency", subgroup_id: "old" } }));
  const sizes: number[] = [];
  const result = await withPublishedClassifications(rows, async ids => { sizes.push(ids.length); if (ids[0] === "100") throw Error("RLS/network"); return []; });
  assert.deepEqual(sizes, [100, 100, 5]);
  assert.deepEqual(result[0]?.publishedClassification, { state: "missing" });
  assert.deepEqual(result[100]?.publishedClassification, { state: "unavailable" });
  assert.deepEqual(result[204]?.publishedClassification, { state: "missing" });
});
test("duplicate or malformed current evidence is unavailable, missing publication stays explicit", async () => {
  const result = await withPublishedClassifications([proposal("duplicate"), proposal("invalid"), proposal("none", { publishedConceptId: null })], async () => [
    { concept_id: "duplicate", subgroup_id: "H4", version: 1 }, { concept_id: "duplicate", subgroup_id: "H5", version: 2 }, { concept_id: "invalid", subgroup_id: "H4", version: 0 },
  ]);
  assert.deepEqual(result.map(p => p.publishedClassification?.state), ["unavailable", "unavailable", "missing"]);
});
