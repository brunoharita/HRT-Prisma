import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { NavigationGuards, NavigationViewStore, interfaceText, isDeliveredNavigation, navigationGroup, observedMetric, resolveRequestedItem, safeNavigationPath, toggleComparisonSelection } from "../web/src/shared/uxFoundation.js";

test("unknown observations remain distinct from observed zero", () => {
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(observedMetric(value, "%"), "Ainda sem dados");
  assert.equal(observedMetric(0, "%"), "0%");
  assert.equal(observedMetric(12.5, " s"), "12,5 s");
});

test("unknown or absent entity never resolves another entity", () => {
  const records = [{ id: "a" }, { id: "b" }];
  assert.equal(resolveRequestedItem(records, "invalid"), null);
  assert.equal(resolveRequestedItem(records), null);
  assert.equal(resolveRequestedItem([], "a"), null);
  assert.equal(resolveRequestedItem(records, "b"), records[1]);
});

test("third selection preserves two deliberate choices; removing one permits replacement", () => {
  const selected = ["a", "b"];
  assert.deepEqual(toggleComparisonSelection(selected, "c"), selected);
  assert.deepEqual(toggleComparisonSelection(selected, "a"), ["b"]);
  assert.deepEqual(toggleComparisonSelection(["b"], "c"), ["b", "c"]);
  assert.deepEqual(selected, ["a", "b"]);
});

test("temporary navigation values survive return but never cross session, role or company", () => {
  const scope = "session-a:user-a:admin:company-a";
  const store = new NavigationViewStore(scope);
  store.write(scope, "/profiles:page", 3);
  store.write(scope, "/profiles:filter", null);
  assert.equal(store.read(scope, "/profiles:page", 1), 3);
  assert.equal(store.read(scope, "/profiles:filter", "all"), null);
  for (const other of ["session-b:user-a:admin:company-a", "session-a:user-a:member:company-a", "session-a:user-a:admin:company-b"]) {
    assert.equal(store.read(other, "/profiles:page", 1), 1);
    store.write(other, "/profiles:page", 9);
    assert.equal(store.read(scope, "/profiles:page", 1), 3);
  }
  const nextSession = new NavigationViewStore(scope);
  assert.equal(nextSession.read(scope, "/profiles:page", 1), 1);
  store.clear();
  assert.equal(store.read(scope, "/profiles:page", 1), 1);
});

test("clean navigation never asks; cancel preserves dirty state and disposal removes guard", () => {
  const guards = new NavigationGuards();
  let asks = 0; let dirty = false;
  const unregister = guards.register("form", () => dirty);
  const answer = (accepted: boolean) => () => { asks++; return accepted; };
  assert.equal(guards.allow(answer(false)), true);
  assert.equal(asks, 0);
  dirty = true;
  assert.equal(guards.allow(answer(false)), false);
  assert.equal(guards.dirty, true);
  assert.equal(guards.allow(answer(true)), true);
  dirty = false;
  assert.equal(guards.allow(answer(false)), true);
  assert.equal(asks, 2);
  dirty = true; unregister();
  assert.equal(guards.dirty, false);
});

test("navigation rejects external/protocol-relative/backslash paths", () => {
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/path\nother", "javascript:alert(1)"]) assert.equal(safeNavigationPath(path), null);
  assert.equal(safeNavigationPath("/profiles/abc/"), "/profiles/abc");
  assert.equal(safeNavigationPath("/"), "/");
});

test("navigation groups shipped capabilities and keeps positions in operation", () => {
  assert.equal(navigationGroup("/vacancies"), "Operação");
  assert.equal(navigationGroup("/knowledge"), "Curadoria");
  assert.equal(navigationGroup("/users"), "Administração");
  for (const path of ["/organizations", "/matching"]) assert.equal(isDeliveredNavigation(path), false);
  assert.equal(isDeliveredNavigation("/settings"), true);
  assert.equal(isDeliveredNavigation("/verifications"), true);
  assert.equal(interfaceText("Vagas: editar vaga e buscar vagas"), "Posições: editar posição e buscar posições");
  assert.equal(interfaceText("/vacancies"), "/vacancies");
});

test("shared text and action tokens reach 4.5:1; input boundary reaches 3:1 on white", () => {
  const theme = readFileSync("web/src/ui/theme.ts", "utf8");
  function contrast(color: string): number {
    const channels = color.slice(1).match(/../g)!.map((value) => Number.parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 1.05 / (0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]! + 0.05);
  }
  for (const token of ["primary", "text", "textSecondary", "success", "warning", "danger"]) {
    const color = new RegExp(`${token}: "(#[a-f0-9]{6})"`).exec(theme)?.[1];
    assert.ok(color, `${token} must be declared`);
    assert.ok(contrast(color) >= 4.5, `${token} contrast must remain legible`);
  }
  const border = /controlBorder: "(#[a-f0-9]{6})"/.exec(theme)?.[1];
  assert.ok(border);
  assert.ok(contrast(border) >= 3);
});

test("integration retains legacy routes, explicit missing states and scoped storage", () => {
  const app = readFileSync("web/src/app/PrismaApplication.tsx", "utf8");
  assert.match(app, /path: "\/vacancies"/);
  assert.match(app, /path: "\/matching"/);
  assert.match(app, /path: "\/not-found"/);
  assert.doesNotMatch(app, /return routes\[0\]/);
  const search = readFileSync("web/src/pages/ProfileSearchPage.tsx", "utf8");
  assert.doesNotMatch(search, /sessionStorage\.setItem/);
  assert.match(search, /toggleComparisonSelection/);
  const position = readFileSync("web/src/pages/VacancyPages.tsx", "utf8");
  assert.doesNotMatch(position, /sessionStorage\.(getItem|setItem)\(DRAFT_KEY/);
  const navigation = readFileSync("web/src/ui/PrismaNavigation.tsx", "utf8");
  assert.doesNotMatch(navigation, /(?:local|session)Storage/);
  assert.match(navigation, /beforeunload/);
  assert.match(navigation, /Modal\.confirm/);
  assert.doesNotMatch(navigation, /window\.confirm/);
  const verification = readFileSync("web/src/pages/CompetencyVerificationPage.tsx", "utf8");
  assert.doesNotMatch(verification, /\?\? definitions\[0\]/);
  assert.match(verification, /compatible\.length === 1/);
});

test("sidebar preserves branding, utilities and centralized release in both states", () => {
  const shell = readFileSync("web/src/ui/PrismaAppShell.tsx", "utf8");
  assert.match(shell, /PRISMA_RELEASE\.displayVersion/);
  assert.match(shell, /\/assets\/login\/hrt-logo-light\.png/);
  assert.match(shell, /prisma-sidebar-signature/);
  assert.match(shell, /collapsed \? \(/);
  assert.match(shell, /Empresa ativa:/);
  assert.match(shell, /Menu de \$\{profileName\}/);
  assert.equal((shell.match(/className="prisma-sidebar-collapse"/g) ?? []).length, 1);
  assert.doesNotMatch(shell, />v1\.7\.1</);
});
