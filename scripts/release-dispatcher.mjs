import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildReleasePlan, parseNameStatus } from "./release-impact.mjs";

function run(command, args, { capture = false, cwd = process.cwd(), env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with ${result.status}${capture ? `: ${result.stderr.trim()}` : ""}`);
  return capture ? result.stdout.trim() : "";
}

export function parseArguments(args) {
  const options = {
    command: args[0] ?? "plan",
    base: "origin/main",
    head: "HEAD",
    json: false,
    full: false,
    execute: false,
    promoteMain: false,
    waitCi: false,
    expectedSha: null,
    receipt: null,
    productionUrl: "https://prisma.hrtsolutions.com.br",
    vpsHost: process.env.PRISMA_VPS_SSH_HOST ?? null,
    vpsPath: process.env.PRISMA_VPS_PATH ?? "/opt/prisma",
  };
  if (!["plan", "validate", "publish", "verify"].includes(options.command)) throw new Error("Usage: release-dispatcher <plan|validate|publish|verify> [options]");
  for (const arg of args.slice(1)) {
    if (arg === "--json") options.json = true;
    else if (arg === "--full") options.full = true;
    else if (arg === "--execute") options.execute = true;
    else if (arg === "--promote-main") options.promoteMain = true;
    else if (arg === "--wait-ci") options.waitCi = true;
    else if (arg.startsWith("--base=")) options.base = arg.slice(7);
    else if (arg.startsWith("--head=")) options.head = arg.slice(7);
    else if (arg.startsWith("--expected-sha=")) options.expectedSha = arg.slice(15);
    else if (arg.startsWith("--receipt=")) options.receipt = arg.slice(10);
    else if (arg.startsWith("--production-url=")) options.productionUrl = arg.slice(17);
    else if (arg.startsWith("--vps-host=")) options.vpsHost = arg.slice(11);
    else if (arg.startsWith("--vps-path=")) options.vpsPath = arg.slice(11);
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

export function loadPlan(base, head, cwd = process.cwd()) {
  const output = run("git", ["diff", "--name-status", "--find-renames", `${base}...${head}`], { capture: true, cwd });
  return buildReleasePlan(parseNameStatus(output));
}

function printPlan(plan, options) {
  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  console.log(`Release plan ${plan.version}: ${plan.files.length} file(s)`);
  console.log(`Surfaces: ${plan.impact.surfaces.join(", ") || "none"}`);
  console.log(`Database: ${plan.deployments.database.join(", ") || "skip"}`);
  console.log(`Functions: ${plan.deployments.edgeFunctions.join(", ") || "skip"}`);
  console.log(`Web/VPS: ${plan.deployments.web ? "publish prisma-web only" : "skip"}`);
  console.log(`Validations: ${plan.validationCommands.join(" -> ")}`);
  if (plan.blockedReasons.length) console.log(`BLOCKED: ${plan.blockedReasons.join("; ")}`);
}

export async function writeReceipt(path, payload) {
  if (!path) return;
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function assertPublishPreconditions({ plan, sha, expectedSha, branch, trackedDirty }) {
  if (!plan.publishable) throw new Error(plan.blockedReasons.join("; ") || "No release changes found");
  if (!expectedSha) throw new Error("publish requires --expected-sha=<full SHA>");
  if (sha !== expectedSha) throw new Error(`Expected SHA ${expectedSha}, found ${sha}`);
  if (branch === "main") throw new Error("Publish must start from an isolated task branch");
  if (trackedDirty) throw new Error("Tracked worktree must be clean before publish");
}

function waitForCi(sha) {
  let run = null;
  for (let attempt = 0; attempt < 10 && !run; attempt += 1) {
    const raw = runCaptureCi(sha);
    const runs = JSON.parse(raw || "[]");
    run = runs.find((item) => item.status !== "completed") ?? runs.find((item) => item.conclusion === "success");
    if (!run && attempt < 9) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3_000);
  }
  if (!run) throw new Error(`No CI run found for ${sha}`);
  if (run.status !== "completed") runCommand("gh", ["run", "watch", String(run.databaseId), "--exit-status"]);
  else if (run.conclusion !== "success") throw new Error(`CI is not successful for ${sha}`);
}

function runCaptureCi(sha) {
  return run("gh", ["run", "list", "--commit", sha, "--workflow", "Prisma foundation CI", "--json", "databaseId,status,conclusion", "--limit", "10"], { capture: true });
}

function runCommand(command, args) {
  run(process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command, args);
}

async function validate(plan, options) {
  if (plan.blockedReasons.length) throw new Error(plan.blockedReasons.join("; "));
  for (const command of plan.validationCommands) {
    const [program, ...args] = command.split(" ");
    runCommand(program, args);
  }
  if (options.full && !plan.validationCommands.includes("pnpm run validate")) runCommand("pnpm", ["run", "validate"]);
}

async function publish(plan, options) {
  const sha = run("git", ["rev-parse", options.head], { capture: true });
  const branch = run("git", ["branch", "--show-current"], { capture: true });
  const trackedDirty = run("git", ["status", "--porcelain", "--untracked-files=no"], { capture: true });
  assertPublishPreconditions({ plan, sha, expectedSha: options.expectedSha, branch, trackedDirty });
  printPlan(plan, options);
  if (!options.execute) return { status: "DRY_RUN", sha, branch, plan };

  runCommand("git", ["push", "--set-upstream", "origin", branch]);
  if (options.waitCi) waitForCi(sha);
  if (options.promoteMain) {
    runCommand("git", ["switch", "main"]);
    runCommand("git", ["pull", "--ff-only", "origin", "main"]);
    runCommand("git", ["merge", "--ff-only", branch]);
    runCommand("git", ["push", "origin", "main"]);
    const promoted = run("git", ["rev-parse", "HEAD"], { capture: true });
    if (promoted !== sha) throw new Error(`Promoted SHA ${promoted} differs from validated SHA ${sha}`);
  }
  let web = plan.deployments.web ? "PENDING_VPS_CONFIGURATION" : "SKIPPED";
  if (plan.deployments.web && options.promoteMain && options.vpsHost) {
    if (!/^[A-Za-z0-9_.@:-]+$/.test(options.vpsHost)) throw new Error("Invalid VPS SSH host");
    if (!/^\/[A-Za-z0-9_./-]+$/.test(options.vpsPath)) throw new Error("Invalid VPS path");
    const remote = `cd -- '${options.vpsPath}' && bash deploy/release-web.sh '${sha}'`;
    runCommand("ssh", [options.vpsHost, remote]);
    web = "PUBLISHED";
  }
  return {
    status: "GIT_PUBLISHED",
    sha,
    branch,
    web,
    remaining: {
      database: plan.deployments.database,
      edgeFunctions: plan.deployments.edgeFunctions,
      web: web === "PENDING_VPS_CONFIGURATION",
    },
  };
}

async function verify(plan, options) {
  const local = run("git", ["rev-parse", options.head], { capture: true });
  const originMain = run("git", ["rev-parse", "origin/main"], { capture: true });
  const result = { local, originMain, gitAligned: local === originMain, site: "SKIPPED", plan };
  if (plan.deployments.web) {
    const response = await fetch(options.productionUrl, { method: "HEAD", redirect: "manual" });
    result.site = { status: response.status, ok: response.ok };
  }
  return result;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const plan = loadPlan(options.base, options.head);
  if (options.command === "plan") {
    printPlan(plan, options);
    await writeReceipt(options.receipt, { command: "plan", plan });
    return plan.blockedReasons.length ? 2 : 0;
  }
  if (options.command === "validate") {
    await validate(plan, options);
    await writeReceipt(options.receipt, { command: "validate", status: "PASS", plan });
    return 0;
  }
  if (options.command === "publish") {
    const result = await publish(plan, options);
    await writeReceipt(options.receipt, { command: "publish", ...result });
    return 0;
  }
  const result = await verify(plan, options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else console.log(`Git aligned: ${result.gitAligned}; site: ${JSON.stringify(result.site)}`);
  await writeReceipt(options.receipt, { command: "verify", ...result });
  return result.gitAligned && (result.site === "SKIPPED" || result.site.ok) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((status) => { process.exitCode = status; }).catch((error) => {
    console.error(error.message); process.exitCode = 1;
  });
}
