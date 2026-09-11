import { readdir, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { testSuites } from "./test-suites.mjs";

export function parseArguments(args) {
  const options = { suite: null, list: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--list" && !options.list) options.list = true;
    else if (arg === "--suite" && !options.suite && Object.hasOwn(testSuites, args[index + 1])) options.suite = args[++index];
    else throw new Error("Usage: node scripts/run-tests.mjs [--suite person-flow] [--list]");
  }
  return options;
}

export async function selectTests(root, suite = null) {
  if (suite !== null && !Object.hasOwn(testSuites, suite)) throw new Error("Unknown test suite");
  const discovered = (await readdir(resolve(root, "tests"), { recursive: true }))
    .map((file) => `tests/${file.replaceAll("\\", "/")}`)
    .filter((file) => /\.test\.(ts|mjs)$/.test(file));
  const selected = suite === null ? discovered.sort() : testSuites[suite].files;
  if (selected.length === 0 || new Set(selected).size !== selected.length) throw new Error("Empty or duplicate test selection");
  for (const file of selected) if (!discovered.includes(file)) throw new Error(`Missing source test: ${file}`);
  return selected.map((source) => ({ source, executable: source.endsWith(".ts") ? `dist/${source.slice(0, -3)}.js` : source }));
}

export async function main(args = process.argv.slice(2), root = process.cwd()) {
  const options = parseArguments(args);
  const selected = await selectTests(root, options.suite);
  if (options.list) {
    console.log(JSON.stringify({ suite: options.suite ?? "all", count: selected.length, files: selected.map((item) => item.source) }, null, 2));
    return 0;
  }
  // Source discovery prevents deleted/stale dist tests from entering a run.
  for (const item of selected) await access(resolve(root, item.executable));
  console.log(`Test suite: ${options.suite ?? "all"}; ${selected.length} files`);
  // A new runner process must not inherit the parent node:test worker marker.
  // Node otherwise skips every child test and may return a misleading exit 0.
  const testEnvironment = { ...process.env };
  delete testEnvironment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", ...selected.map((item) => resolve(root, item.executable))], {
    cwd: root, stdio: "inherit", windowsHide: true, timeout: 300_000, env: testEnvironment,
  });
  if (result.error) console.error(`Test process failed: ${result.error.code ?? "spawn_error"}`);
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    console.error(error.message); process.exitCode = 1;
  });
}
