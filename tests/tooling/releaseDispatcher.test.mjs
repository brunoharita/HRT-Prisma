import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReleasePlan, classifyChanges, migrationIdentity, parseNameStatus } from "../../scripts/release-impact.mjs";
import { assertPublishPreconditions, parseArguments, writeReceipt } from "../../scripts/release-dispatcher.mjs";

const change = (status, path) => ({ status, path, previousPath: null });

test("parses git name-status including renames", () => {
  assert.deepEqual(parseNameStatus("A\tweb/src/a.tsx\nR100\told.md\tdocs/new.md"), [
    change("A", "web/src/a.tsx"),
    { status: "R", path: "docs/new.md", previousPath: "old.md" },
  ]);
});

test("routes documentation without Supabase or VPS", () => {
  const plan = buildReleasePlan([change("M", "docs/operations/deployment.md")]);
  assert.equal(plan.deployments.web, false);
  assert.deepEqual(plan.deployments.database, []);
  assert.deepEqual(plan.deployments.edgeFunctions, []);
  assert.ok(plan.validationCommands.includes("pnpm run generate:prisma-context"));
});

test("release tooling does not redeploy the application", () => {
  const plan = buildReleasePlan([change("A", "deploy/release-web.sh"), change("M", "package.json")]);
  assert.equal(plan.deployments.web, false);
  assert.equal(plan.impact.surfaces.includes("dependencies"), false);
  assert.ok(plan.validationCommands.includes("pnpm run test:release-tooling"));
});

test("dispatcher resolves pnpm through the Windows command shim", async () => {
  const dispatcher = await readFile(new URL("../../scripts/release-dispatcher.mjs", import.meta.url), "utf8");
  assert.match(dispatcher, /process\.platform === "win32" && command === "pnpm" \? "pnpm\.cmd" : command/);
});

test("routes web changes only to web and hosting", () => {
  const impact = classifyChanges([change("M", "web/src/app/App.tsx")]);
  assert.ok(impact.surfaces.includes("web"));
  assert.ok(impact.surfaces.includes("hosting"));
  assert.equal(impact.surfaces.includes("database"), false);
});

test("routes only the named Edge Function", () => {
  const plan = buildReleasePlan([change("M", "supabase/functions/knowledge-agent/index.ts")]);
  assert.deepEqual(plan.deployments.edgeFunctions, ["knowledge-agent"]);
  assert.deepEqual(plan.deployments.database, []);
  assert.equal(plan.deployments.web, false);
});

test("new migrations are publishable and historical edits fail closed", () => {
  const added = buildReleasePlan([change("A", "supabase/migrations/20260919010000_example.sql")]);
  assert.equal(added.publishable, true);
  assert.deepEqual(added.deployments.database, ["supabase/migrations/20260919010000_example.sql"]);
  const modified = buildReleasePlan([change("M", "supabase/migrations/20260918220000_m76_curation_description_scope.sql")]);
  assert.equal(modified.publishable, false);
  assert.match(modified.blockedReasons[0], /immutable/);
});

test("unknown paths block publication", () => {
  const plan = buildReleasePlan([change("A", "misc.bin")]);
  assert.equal(plan.publishable, false);
  assert.deepEqual(plan.impact.unknown, ["misc.bin"]);
});

test("validates migration identity and publish guard arguments", () => {
  assert.deepEqual(migrationIdentity("supabase/migrations/20260919010000_example.sql"), { version: "20260919010000", name: "example" });
  assert.throws(() => migrationIdentity("bad.sql"), /Invalid migration/);
  assert.equal(parseArguments(["publish", "--execute", "--expected-sha=abc"]).expectedSha, "abc");
  assert.equal(parseArguments(["publish", "--vps-host=root@example", "--vps-path=/opt/prisma"]).vpsHost, "root@example");
  assert.throws(() => parseArguments(["publish", "--unknown"]), /Unknown option/);
});

test("publication guards fail closed before external mutation", () => {
  const plan = buildReleasePlan([change("M", "README.md")]);
  assert.throws(() => assertPublishPreconditions({ plan, sha: "abc", expectedSha: null, branch: "codex/x", trackedDirty: "" }), /expected-sha/);
  assert.throws(() => assertPublishPreconditions({ plan, sha: "abc", expectedSha: "abc", branch: "main", trackedDirty: "" }), /isolated/);
  assert.throws(() => assertPublishPreconditions({ plan, sha: "abc", expectedSha: "abc", branch: "codex/x", trackedDirty: " M README.md" }), /clean/);
  assert.doesNotThrow(() => assertPublishPreconditions({ plan, sha: "abc", expectedSha: "abc", branch: "codex/x", trackedDirty: "" }));
});

test("writes one structured release receipt", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prisma-release-"));
  const path = join(directory, "nested", "receipt.json");
  try {
    await writeReceipt(path, { command: "plan", status: "PASS" });
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), { command: "plan", status: "PASS" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
