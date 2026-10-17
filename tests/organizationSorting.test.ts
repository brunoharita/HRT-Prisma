import assert from "node:assert/strict";
import test from "node:test";
import { sortOrganizations, organizationTimestamp, type OrganizationSort } from "../web/src/domain/organizationSorting.js";
const records = [
  { id: "b", name: "Zebra 10", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: "a", name: "Árvore", createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "c", name: "Zebra 2", createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
];
for (const [criterion, expected] of [["name", ["a", "c", "b"]], ["createdAt", ["b", "c", "a"]], ["updatedAt", ["a", "c", "b"]]] as const) {
  test(`${criterion} sorts ascending and descending without changing inputs`, () => {
    const before = structuredClone(records);
    assert.deepEqual(sortOrganizations(records, criterion, "asc").map(r => r.id), expected);
    assert.deepEqual(sortOrganizations(records, criterion, "desc").map(r => r.id), [...expected].reverse());
    assert.deepEqual(records, before);
  });
}
test("unknown dates remain last in both directions with deterministic name/id ties", () => {
  for (const criterion of ["createdAt", "updatedAt"] as OrganizationSort[]) for (const direction of ["asc", "desc"] as const) {
    const unknown = [{ id: "x", name: "A", createdAt: null }, { id: "y", name: "B", createdAt: "invalid", updatedAt: "invalid" }];
    const sorted = sortOrganizations([...unknown, ...records], criterion, direction);
    assert.deepEqual(new Set(sorted.slice(-2).map(r => r.id)), new Set(["x", "y"]));
  }
  const tied = [{ id: "b", name: "Árvore" }, { id: "a", name: "arvore" }];
  assert.deepEqual(sortOrganizations(tied, "createdAt", "asc").map(r => r.id), ["a", "b"]);
  assert.equal(organizationTimestamp("invalid"), null);
  assert.equal(organizationTimestamp(null), null);
  assert.equal(organizationTimestamp(undefined), null);
});
