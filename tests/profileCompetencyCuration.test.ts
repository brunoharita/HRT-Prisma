import assert from "node:assert/strict";
import test from "node:test";
import { competencyKey, curationPage, curationReturnTarget, groupPendingCompetencies, pendingCompetencies, type PendingCompetency } from "../web/src/domain/profileCompetencyCuration.js";
import { m72Fixture } from "./fixtures/m72PersonEvidence.js";
const items = Array.from({ length: 21 }, (_, originalIndex): PendingCompetency => ({ originalIndex, originalTerm: `Original ${originalIndex}`, sourceText: `Original ${originalIndex}`, normalizedTerm: `Conceito ${originalIndex}`, searchTerms: [`Conceito ${originalIndex}`], state: "unresolved", reason: "Pendente" }));

test("M74 cancellation preserves identity/page and duplicates never share a key", () => {
  assert.equal(curationReturnTarget(items, items, competencyKey(items[13]!), false), competencyKey(items[13]!));
  assert.equal(curationPage(items, competencyKey(items[13]!), 2), 2);
  assert.notEqual(competencyKey(items[0]!), competencyKey({ ...items[0]!, originalIndex: 1 }));
  assert.notEqual(competencyKey(items[0]!), competencyKey({ ...items[0]!, sourceText: "Outro trecho" }));
});
test("M74 save focuses next surviving record, falls back to previous and clamps last page", () => {
  const after = items.filter((_, index) => index !== 13 && index !== 14);
  assert.equal(curationReturnTarget(items, after, competencyKey(items[13]!), false), competencyKey(items[15]!));
  const last = items.slice(0, -1);
  assert.equal(curationReturnTarget(items, last, competencyKey(items[20]!), false), competencyKey(items[19]!));
  assert.equal(curationPage(last, competencyKey(items[19]!), 3), 2);
  assert.equal(curationPage(last, null, 3), 2);
  assert.equal(curationReturnTarget(items, [], competencyKey(items[20]!), false), null);
  assert.equal(curationPage([], null, 3), 1);
});
test("M74 save-and-next skips unchanged proposal item and supports filtered order", () => {
  const filtered = [items[20]!, items[13]!, items[4]!];
  assert.equal(curationReturnTarget(filtered, filtered, competencyKey(items[13]!), true), competencyKey(items[4]!));
  assert.equal(curationReturnTarget([items[0]!], [items[0]!], competencyKey(items[0]!), true), null);
});
test("M74 only unresolved/ambiguous/unavailable declarations are curated", () => {
  const projection = m72Fixture();
  projection.normalization.items = [items[0]!, { ...items[1]!, state: "resolved" }, { ...items[2]!, state: "human_preserved" }, { ...items[3]!, state: "ambiguous" }, { ...items[4]!, state: "source_unavailable" }];
  assert.deepEqual(pendingCompetencies(projection).map((item) => item.originalIndex), [0, 3, 4]);
});

test("M74 repeated atoms in the same declaration retain distinct stable identities", () => {
  const projection = m72Fixture();
  projection.normalization.items = [items[0]!, { ...items[0]! }];
  const before = pendingCompetencies(projection);
  assert.notEqual(competencyKey(before[0]!), competencyKey(before[1]!));
  projection.normalization.items[0] = { ...items[0]!, state: "resolved" };
  assert.equal(competencyKey(pendingCompetencies(projection)[0]!), competencyKey(before[1]!));
});

test("M75 groups equivalent pending terms and preserves all versioned search expressions", () => {
  const grouped = groupPendingCompetencies([
    items[0]!,
    { ...items[1]!, normalizedTerm: "conceito 0", searchTerms: ["Alias oficial"] },
    items[2]!,
  ]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0]?.groupCount, 2);
  assert.deepEqual(grouped[0]?.searchTerms, ["Conceito 0", "Original 0", "conceito 0", "Alias oficial", "Original 1"]);
});
