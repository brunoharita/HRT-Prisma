import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { selectTests } from "./run-tests.mjs";
import { testSuites } from "./test-suites.mjs";

export const validationPlan = [
  { id: "build-tests", args: ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"] },
  { id: "typecheck-web", args: ["node_modules/typescript/bin/tsc", "-p", "web/tsconfig.json", "--noEmit"] },
  { id: "build-web", args: ["node_modules/vite/bin/vite.js", "build", "--config", "web/vite.config.ts"] },
  { id: "person-flow-tests", args: ["scripts/run-tests.mjs", "--suite", "person-flow"] },
];

export function runPlan(execute, clock = () => performance.now()) {
  const phases = [];
  let failed = false;
  for (const phase of validationPlan) {
    if (failed) { phases.push({ id: phase.id, status: "NOT TESTED", durationMs: 0 }); continue; }
    const start = clock();
    let result;
    try { result = execute(phase); } catch { result = { status: null, error: { code: "spawn_error" } }; }
    failed = Boolean(result.error || result.signal || result.status !== 0);
    phases.push({ id: phase.id, status: failed ? "FAIL" : "PASS", durationMs: Math.round(clock() - start), exitCode: result.status ?? null,
      errorCode: result.error?.code ?? null, signal: result.signal ?? null });
  }
  return { status: failed ? "FAIL" : "PASS", phases };
}

export async function main(args = process.argv.slice(2), root = process.cwd()) {
  if (args.length) throw new Error("Usage: pnpm run validate:person-flow (no arguments)");
  const start = performance.now();
  const suite = testSuites["person-flow"];
  const startedAt = new Date().toISOString();
  const report = { contract: "person-flow-validation-1.0.0", suite: "person-flow", suiteVersion: suite.version,
    startedAt, environment: "local-synthetic", nodeVersion: process.version, platform: process.platform,
    limits: suite.limits, status: "FAIL", phases: [] };
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 10_000 });
  const revision = git(["rev-parse", "HEAD"]);
  const dirty = git(["status", "--porcelain", "--untracked-files=normal"]);
  report.commit = revision.status === 0 ? revision.stdout.trim() : null;
  report.dirty = dirty.status === 0 ? Boolean(dirty.stdout.trim()) : null;
  try {
    const selection = await selectTests(root, "person-flow");
    report.testFiles = selection.map((item) => item.source);
    const hash = createHash("sha256");
    for (const file of ["package.json", "tsconfig.json", "scripts/test-suites.mjs", "scripts/run-tests.mjs", "scripts/validate-person-flow.mjs", "tests/fixtures/personFlow.ts", ...report.testFiles]) {
      hash.update(file).update("\0").update(await readFile(resolve(root, file))).update("\0");
    }
    report.validationInputsSha256 = hash.digest("hex");
    Object.assign(report, runPlan((phase) => {
      console.log(`\n[person-flow] ${phase.id}`);
      return spawnSync(process.execPath, phase.args, { cwd: root, stdio: "inherit", windowsHide: true, timeout: 300_000 });
    }));
  } catch {
    // Never persist raw errors, environment variables, fixture content or test stdout.
    report.preflight = "FAIL: missing/invalid selection or unreadable validation input";
    report.phases = validationPlan.map(({ id }) => ({ id, status: "NOT TESTED", durationMs: 0 }));
  }
  report.durationMs = Math.round(performance.now() - start);
  report.finishedAt = new Date().toISOString();
  const directory = resolve(root, "tmp/validation/person-flow");
  await mkdir(directory, { recursive: true });
  const output = resolve(directory, `${startedAt.replaceAll(/[:.]/g, "-")}-${randomUUID()}.json`);
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(`PERSON_FLOW_${report.status}: ${report.durationMs} ms; report: ${output}`);
  return report.status === "PASS" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    console.error(error.message); process.exitCode = 1;
  });
}
