import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".prisma-data", "dist", "node_modules", "tmp"]);
const textExtensions = new Set([".ts", ".mjs", ".md", ".sql", ".json", ".yml", ".yaml"]);
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return textExtensions.has(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

async function requireFile(path) {
  try {
    return await readFile(join(root, path), "utf8");
  } catch {
    errors.push(`${path}: required foundation file is missing`);
    return "";
  }
}

const requiredDocuments = [
  "AGENTS.md",
  "README.md",
  "docs/architecture/contracts.md",
  "docs/architecture/versioning.md",
  "docs/ai/extraction-contract.md",
  "docs/ai/matching-contract.md",
  "docs/security/authorization-model.md",
  "docs/security/privacy-and-lgpd.md",
  "docs/security/threat-model.md",
  "docs/operations/deployment.md",
  "docs/operations/incident-response.md",
  "docs/qa/release-checklist.md",
];

await Promise.all(requiredDocuments.map(requireFile));

const versionsSource = await requireFile("src/domain/versions.ts");
const contracts = await requireFile("docs/architecture/contracts.md");
const versionValues = [...versionsSource.matchAll(/\w+Version:\s*"([^"]+)"/g)].map((match) => match[1]);
if (versionValues.length !== 6) {
  errors.push(`src/domain/versions.ts: expected 6 explicit processing versions, found ${versionValues.length}`);
}
for (const version of versionValues) {
  if (!contracts.includes(version)) {
    errors.push(`docs/architecture/contracts.md: runtime version ${version} is not catalogued`);
  }
}

const migration = await requireFile("supabase/migrations/20260820200810_initial_prisma_schema.sql");
const publicTables = [...migration.matchAll(/create table public\.([a-z_]+)\s*\(/g)]
  .map((match) => match[1])
  .filter(Boolean);
if (publicTables.length < 15) {
  errors.push(`initial migration: expected at least 15 public tables, found ${publicTables.length}`);
}
for (const table of publicTables) {
  if (!migration.includes(`alter table public.${table} enable row level security;`)) {
    errors.push(`initial migration: RLS is not enabled for public.${table}`);
  }
}
for (const forbidden of [/auth\.role\s*\(/i, /user_metadata/i]) {
  if (forbidden.test(migration)) errors.push(`initial migration: forbidden authorization source ${forbidden}`);
}
for (const required of [
  /revoke all on all tables in schema public from anon/i,
  /to authenticated/i,
  /private\.has_org_role/i,
]) {
  if (!required.test(migration)) errors.push(`initial migration: required security invariant ${required} is missing`);
}

const files = await walk(root);
const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
for (const file of files) {
  const path = relative(root, file).replaceAll("\\", "/");
  const text = await readFile(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) errors.push(`${path}: possible committed secret matching ${pattern}`);
  }
  if ((path.startsWith("src/") || path.startsWith("supabase/migrations/")) && /\b(?:TODO|FIXME)\b/.test(text)) {
    errors.push(`${path}: unresolved critical marker in executable foundation`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`foundation check passed (${publicTables.length} public tables, ${versionValues.length} processing versions)\n`);
}
