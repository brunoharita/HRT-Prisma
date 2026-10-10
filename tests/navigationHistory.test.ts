import assert from "node:assert/strict";
import test from "node:test";
import { nextNavigationEntry, operatorHistoryPath, previousNavigationPath, readNavigationHistory, type NavigationHistoryEntry } from "../web/src/shared/navigationHistory.js";

const scope = "session:user:admin:company-a";
const root: NavigationHistoryEntry = { index: 0, path: "/vacancies/position/people", scope };

test("immediate origin remains distinct from a hierarchical parent across the real route graph", () => {
  for (const [origin, destination] of [
    ["/vacancies/p/people", "/profiles/a/profile"], ["/profiles/search", "/profiles/a/profile"],
    ["/profiles/a", "/profiles/a/edit"], ["/profiles/a/documents/d", "/profiles/a/documents/d/review/r"],
    ["/profiles/a/versions", "/profiles/a/reviews/r"], ["/vacancies/p", "/vacancies/p/follow-up"],
    ["/vacancies", "/vacancies/p/edit"], ["/vacancies/p/follow-up/a", "/vacancies/p/follow-up/a/assessment"],
    ["/matching/verification-needs/n/prepare", "/verifications/new/a"],
  ]) {
    const next = nextNavigationEntry({ ...root, path: origin! }, scope, destination!, false);
    assert.equal(previousNavigationPath(next, scope), origin);
  }
});

test("replace preserves predecessor rather than creating a return cycle", () => {
  const profile = nextNavigationEntry(root, scope, "/profiles/a", false);
  const replacement = nextNavigationEntry(profile, scope, "/profiles/a/profile", true);
  assert.equal(replacement.index, profile.index);
  assert.equal(previousNavigationPath(replacement, scope), root.path);
  assert.equal(previousNavigationPath(root, scope), null);
});

test("scope change never creates an eligible previous entry", () => {
  const profile = nextNavigationEntry(root, scope, "/profiles/a", false);
  for (const nextScope of ["new-session:user:admin:company-a", "session:user:member:company-a", "session:user:admin:company-b"]) {
    assert.equal(previousNavigationPath(profile, nextScope), null);
    assert.equal(readNavigationHistory(profile, nextScope, profile.path), null);
    const changed = nextNavigationEntry(profile, nextScope, "/profiles", false);
    assert.equal(changed.index, 0);
    assert.equal(previousNavigationPath(changed, nextScope), null);
  }
});

test("public capability, auth, external, query and malformed URLs never enter operator history", () => {
  for (const path of ["/assessment/secret", "/assessment", "/verify/secret", "/my-data/secret", "/sign-in", "/change-password", "https://evil.invalid", "//evil.invalid", "/profiles?token=secret", "/profiles#secret", "/profiles\\bad"]) {
    assert.equal(operatorHistoryPath(path), null, path);
    assert.equal(previousNavigationPath(nextNavigationEntry({ ...root, path }, scope, "/profiles/a", false), scope), null);
  }
  for (const value of [null, {}, { ...root, index: -1 }, { ...root, index: 1.5 }, { ...root, previousPath: "//evil.invalid" }, { ...root, path: "/verify/secret" }]) {
    assert.equal(readNavigationHistory(value, scope, root.path), null);
  }
  assert.equal(readNavigationHistory(root, scope, "/another-path"), null);
  assert.deepEqual(readNavigationHistory(root, scope, root.path), root);
});
