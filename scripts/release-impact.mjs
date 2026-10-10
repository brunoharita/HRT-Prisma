import { basename } from "node:path";

export const RELEASE_PLAN_VERSION = "1.0.5";

const contextSource = (path) => path === "AGENTS.md" || path === "README.md" || path.startsWith("docs/");

export function normalizeRepositoryPath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function parseNameStatus(output) {
  if (!output.trim()) return [];
  return output.trim().split(/\r?\n/).map((line) => {
    const [status, first, second] = line.split("\t");
    if (!status || !first) throw new Error(`Invalid git name-status line: ${line}`);
    return {
      status: status[0],
      path: normalizeRepositoryPath(second ?? first),
      previousPath: second ? normalizeRepositoryPath(first) : null,
    };
  });
}

export function classifyChanges(changes) {
  const surfaces = new Set();
  const edgeFunctions = new Set();
  const migrations = [];
  const modifiedMigrations = [];
  const unknown = [];

  for (const change of changes) {
    const path = normalizeRepositoryPath(change.path);
    let classified = false;
    if (path.startsWith("services/mail-forwarder/") || ["deploy/mail-forwarder.compose.yml", "deploy/release-mail-forwarder.sh"].includes(path)) {
      surfaces.add("mail-forwarder"); classified = true;
    }
    if (["src/domain/profileSynthesis.ts", "scripts/profile-synthesis-worker.mjs", "scripts/position-assessment-email-worker.mjs", "deploy/release-profile-synthesis.sh", "deploy/profile-synthesis.compose.yml"].includes(path) || path.startsWith("services/profile-synthesis/")) {
      surfaces.add("profile-synthesis"); classified = true;
    }
    if (contextSource(path)) {
      surfaces.add("documentation");
      surfaces.add("context-pack");
      classified = true;
    }
    if (path.startsWith("web/")) {
      surfaces.add("web");
      surfaces.add("hosting");
      classified = true;
    }
    // These sources are executed by the hosted Parser, as well as its web consumer.
    // A web-only rollout can leave imported periods on the old normalization rule.
    if (["web/src/domain/parserIa.ts", "web/src/domain/resumeDates.ts", "web/src/domain/reviewPeriodFormat.ts", "src/domain/resumeDates.ts", "scripts/parser-ia-service.mjs", "scripts/start-parser-ia-hosted.mjs", "scripts/check-parser-ia-hosted.mjs"].includes(path)
      || path.startsWith("services/parser-ia/")) {
      surfaces.add("parser-ia");
      if (path === "src/domain/resumeDates.ts") {
        surfaces.add("web");
        surfaces.add("hosting");
      }
      classified = true;
    }
    if (["src/infrastructure/aiHistory.ts","scripts/ai-history-client.mjs"].includes(path)) {surfaces.add("parser-ia");surfaces.add("profile-synthesis");surfaces.add("edge-functions");["position-assessment","matching-trajectory","knowledge-agent","assessment-item-generator"].forEach(name=>edgeFunctions.add(name));}
    if (path.startsWith("src/")) {
      surfaces.add("backend");
      classified = true;
    }
    // M8.3 shares its source contract between the web bundle and this Edge Function.
    if (path === "src/domain/semanticTrajectory.ts") {
      surfaces.add("web");
      surfaces.add("hosting");
      surfaces.add("edge-functions");
      edgeFunctions.add("matching-trajectory");
    }
    if (path.startsWith("tests/")) {
      surfaces.add(["tests/tooling/releaseDispatcher.test.mjs", "tests/tooling/prismaContext.test.mjs"].includes(path) ? "tooling" : "tests");
      classified = true;
    }
    if (path.startsWith("scripts/")) {
      surfaces.add("tooling");
      classified = true;
    }
    if (path === "deploy/release-web.sh") {
      surfaces.add("tooling");
      classified = true;
    } else if (path.startsWith("deploy/") && !path.includes("profile-synthesis") && !path.includes("mail-forwarder")) {
      surfaces.add("hosting");
      classified = true;
    }
    if (path.startsWith(".github/workflows/")) {
      surfaces.add("ci");
      classified = true;
    }
    if (["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"].includes(path)) {
      surfaces.add("tooling");
      if (["pnpm-lock.yaml", "pnpm-workspace.yaml"].includes(path)) surfaces.add("dependencies");
      classified = true;
    }
    if (path === "supabase/config.toml") {
      surfaces.add("supabase-config");
      classified = true;
    }
    if (path.startsWith("supabase/migrations/") && path.endsWith(".sql")) {
      surfaces.add("database");
      migrations.push(path);
      if (change.status !== "A") modifiedMigrations.push(path);
      classified = true;
    }
    const functionMatch = path.match(/^supabase\/functions\/([^/]+)\//);
    if (functionMatch) {
      surfaces.add("edge-functions");
      edgeFunctions.add(functionMatch[1]);
      classified = true;
    }
    if (path.startsWith("supabase/qa/") || path.startsWith("supabase/tests/")) {
      surfaces.add("database-tests");
      classified = true;
    }
    if (path === "supabase/migration-ledger-map.json") {
      surfaces.add("database-ledger");
      classified = true;
    }
    if (["Dockerfile", ".gitignore", "tsconfig.json"].includes(path) || path.startsWith("services/")) {
      surfaces.add("infrastructure");
      classified = true;
    }
    if (["TUDO_SOBRE_PRISMA.md", "FONTE_GPT_PRISMA.md"].includes(path)) {
      surfaces.add("generated-context");
      classified = true;
    }
    if (!classified) unknown.push(path);
  }

  return {
    surfaces: [...surfaces].sort(),
    edgeFunctions: [...edgeFunctions].sort(),
    migrations: migrations.sort(),
    modifiedMigrations: modifiedMigrations.sort(),
    unknown: [...new Set(unknown)].sort(),
  };
}

export function buildReleasePlan(changes) {
  const impact = classifyChanges(changes);
  const commands = ["git diff --check"];
  const add = (command) => { if (!commands.includes(command)) commands.push(command); };

  if (impact.surfaces.includes("tooling") || impact.surfaces.includes("ci") || impact.surfaces.includes("database-ledger")) {
    add("pnpm run test:release-tooling");
  }
  if (impact.surfaces.includes("context-pack")) {
    add("pnpm run generate:prisma-context");
    add("pnpm run check:prisma-context");
  }
  if (impact.surfaces.includes("backend")) add("pnpm run typecheck");
  if (impact.surfaces.includes("web")) {
    add("pnpm run typecheck:web");
    add("pnpm run build:web");
  }
  if (["backend", "web", "database", "database-tests", "edge-functions", "tests", "parser-ia"].some((surface) => impact.surfaces.includes(surface))) {
    add("pnpm run test");
  }
  if (impact.surfaces.includes("parser-ia")) {
    add("node node_modules/typescript/bin/tsc -p services/parser-ia/tsconfig.json --noEmit");
    add("node --test tests/tooling/parserIaService.test.mjs tests/tooling/parserIaRecovery.test.mjs tests/tooling/parserIaHosted.test.mjs tests/tooling/parserIaBenchmark.test.mjs");
  }
  if (impact.surfaces.includes("profile-synthesis")) add("node --test tests/tooling/profileSynthesis.test.mjs");
  if (impact.surfaces.includes("mail-forwarder")) {
    add("pnpm --dir services/mail-forwarder test");
    add("pnpm --dir services/mail-forwarder audit --prod --audit-level high");
  }
  if (["database", "database-ledger", "supabase-config"].some((surface) => impact.surfaces.includes(surface))) {
    add("pnpm run check:supabase-ledger");
  }
  if (impact.surfaces.includes("dependencies")) add("pnpm run audit:dependencies");

  const blockedReasons = [];
  if (impact.unknown.length) blockedReasons.push(`unclassified paths: ${impact.unknown.join(", ")}`);
  if (impact.modifiedMigrations.length) blockedReasons.push(`applied migration history is immutable: ${impact.modifiedMigrations.join(", ")}`);

  const deployments = {
    git: changes.length > 0,
    database: impact.migrations.filter((path) => !impact.modifiedMigrations.includes(path)),
    edgeFunctions: impact.edgeFunctions,
    web: impact.surfaces.includes("web") || impact.surfaces.includes("hosting"),
    parserIa: impact.surfaces.includes("parser-ia"),
    profileSynthesis: impact.surfaces.includes("profile-synthesis"),
    mailForwarder: impact.surfaces.includes("mail-forwarder"),
  };
  return {
    version: RELEASE_PLAN_VERSION,
    files: changes.map((change) => change.path).sort(),
    impact,
    validationCommands: commands,
    deployments,
    blockedReasons,
    publishable: changes.length > 0 && blockedReasons.length === 0,
  };
}

export function migrationIdentity(path) {
  const match = basename(normalizeRepositoryPath(path)).match(/^(\d{14})_(.+)\.sql$/);
  if (!match) throw new Error(`Invalid migration filename: ${path}`);
  return { version: match[1], name: match[2] };
}
