import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main as runTests, parseArguments, selectTests } from "../../scripts/run-tests.mjs";
import { main as validate, runPlan, validationPlan } from "../../scripts/validate-person-flow.mjs";
import { testSuites, personFlowGroups } from "../../scripts/test-suites.mjs";

test("runner accepts explicit suite and rejects unknown, duplicate or incomplete arguments", () => {
  assert.deepEqual(parseArguments(["--suite", "person-flow", "--list"]), { suite: "person-flow", list: true });
  assert.deepEqual(parseArguments([]), { suite: null, list: false });
  for (const args of [["--suite"], ["--suite", "unknown"], ["--suite", "__proto__"], ["--list", "--list"], ["--typo"]]) assert.throws(() => parseArguments(args));
});

test("suite retains all security, review and publication boundaries without duplicate test files", async () => {
  const selection = await selectTests(process.cwd(), "person-flow");
  assert.equal(selection.length, testSuites["person-flow"].files.length);
  assert.equal(new Set(selection.map((item) => item.source)).size, selection.length);
  for (const name of [...personFlowGroups.security, ...personFlowGroups.publication]) assert.ok(selection.some((item) => item.source === `tests/${name}.test.ts`));
  // Independent sentinels: accidentally shrinking a manifest group must fail too.
  for (const name of ["isolation", "webProtectedRoutes", "profilePublicationDeltaMigration", "m2DocumentReliabilityReview", "m56MigrationSecurity", "profileDelta"]) {
    assert.ok(selection.some((item) => item.source === `tests/${name}.test.ts`));
  }
  assert.ok(selection.some((item) => item.source.endsWith("personFlowScenarios.test.ts")));
});

test("default discovers all source tests, ignores orphan dist files and fails before missing compiled execution", async () => {
  const root = await mkdtemp(join(tmpdir(), "prisma-runner-test-"));
  try {
    await mkdir(join(root, "tests"));
    await mkdir(join(root, "dist/tests"), { recursive: true });
    await writeFile(join(root, "tests/one.test.ts"), "// source");
    await writeFile(join(root, "dist/tests/orphan.test.js"), "throw Error('must not run');");
    assert.deepEqual(await selectTests(root), [{ source: "tests/one.test.ts", executable: "dist/tests/one.test.js" }]);
    await assert.rejects(runTests([], root), /ENOENT/);
    await assert.rejects(selectTests(root, "person-flow"), /Missing source/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("empty selection and unknown suite fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "prisma-empty-test-"));
  try {
    await mkdir(join(root, "tests"));
    await assert.rejects(selectTests(root), /Empty/);
    await assert.rejects(selectTests(root, "missing"), /Unknown/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("default selection still includes tests outside the focused suite", async () => {
  const all = await selectTests(process.cwd());
  const focused = await selectTests(process.cwd(), "person-flow");
  assert.ok(all.length > focused.length);
  assert.ok(all.some((item) => item.source === "tests/vacancyIntelligence.test.ts"));
  assert.ok(!focused.some((item) => item.source === "tests/vacancyIntelligence.test.ts"));
});

test("real child execution propagates pass and fail exit codes", async () => {
  const root = await mkdtemp(join(tmpdir(), "prisma-exit-test-"));
  try {
    await mkdir(join(root, "tests"));
    const file = join(root, "tests/probe.test.mjs");
    await writeFile(file, "import test from 'node:test'; test('synthetic pass probe', () => {});\n");
    assert.equal(await runTests([], root), 0);
    await writeFile(file, "import test from 'node:test'; test('expected failure probe', () => { throw Error('synthetic intentional failure'); });\n");
    assert.equal(await runTests([], root), 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("successful plan measures every phase and builds only once", () => {
  const called = [];
  let time = 0;
  const result = runPlan((phase) => { called.push(phase.id); return { status: 0 }; }, () => (time += 10));
  assert.equal(result.status, "PASS");
  assert.deepEqual(called, validationPlan.map((phase) => phase.id));
  assert.ok(result.phases.every((phase) => phase.durationMs === 10 && phase.status === "PASS"));
  assert.equal(called.filter((id) => id === "build-tests").length, 1);
});

test("nonzero exit, timeout, signal and spawn failure stop the plan with no false PASS", () => {
  for (const failure of [{ status: 1 }, { status: null, error: { code: "ETIMEDOUT" } }, { status: 0, signal: "SIGTERM" }, { status: null }]) {
    let calls = 0;
    const result = runPlan(() => { calls++; return failure; });
    assert.equal(calls, 1);
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.phases.map((phase) => phase.status), ["FAIL", "NOT TESTED", "NOT TESTED", "NOT TESTED"]);
  }
  assert.equal(runPlan(() => { throw new Error("private detail"); }).status, "FAIL");
});

test("preflight failure produces a unique metadata-only failure report, not successful evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "prisma-report-test-"));
  try {
    await mkdir(join(root, "tests"));
    assert.equal(await validate([], root), 1);
    assert.equal(await validate([], root), 1);
    const reports = await readdir(join(root, "tmp/validation/person-flow"));
    assert.equal(reports.length, 2);
    const report = JSON.parse(await readFile(join(root, "tmp/validation/person-flow", reports[0]), "utf8"));
    assert.equal(report.status, "FAIL");
    assert.ok(report.phases.every((phase) => phase.status === "NOT TESTED"));
    assert.equal(report.environment, "local-synthetic");
    assert.equal(report.stdout, undefined);
    assert.equal(report.env, undefined);
    assert.equal(report.commit, null);
    assert.ok(report.limits.includes("No live database/RLS execution"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
