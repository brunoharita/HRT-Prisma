import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { buildPrismaContext, canonicalSources, outputPath, repositoryRoot } from "./generate-prisma-context.mjs";

const requiredContextFiles = [
  "PRISMA_CONTEXT_INDEX.md",
  "PRISMA_CURRENT_STATE.md",
  "PRISMA_WIKI.md",
  "PRISMA_TECHNICAL_REFERENCE.md",
  "PRISMA_AI_REFERENCE.md",
];
const requiredStructure = [
  "AGENTS.md", "README.md", "docs/product/product-vision.md", "docs/product/product-scope.md",
  "docs/product/pilot-scope.md", "docs/product/domain-model.md", "docs/product/glossary.md",
  "docs/architecture/system-architecture.md", "docs/architecture/data-model.md", "docs/architecture/versioning.md",
  "docs/architecture/contracts.md", "docs/architecture/feature-flags.md", "docs/architecture/capabilities.md",
  "docs/decisions/README.md", "docs/decisions/ADR-000-template.md", "docs/ai/ai-architecture.md",
  "docs/ai/professional-profile-schema.md", "docs/ai/extraction-contract.md", "docs/ai/extraction-validation.md",
  "docs/ai/matching-contract.md", "docs/ai/evaluation-strategy.md", "docs/ai/prompt-registry.md",
  "docs/ai/model-policy.md", "docs/security/privacy-and-lgpd.md", "docs/security/threat-model.md",
  "docs/security/authorization-model.md", "docs/operations/environments.md", "docs/operations/deployment.md",
  "docs/operations/observability.md", "docs/operations/incident-response.md", "docs/qa/test-plan.md",
  "docs/qa/test-matrix.md", "docs/qa/personas.md", "docs/qa/release-checklist.md",
];
const metadataKeys = ["prisma_context_id", "owner", "status", "version", "last_verified"];
const allowedConsolidated = new Set([
  ...requiredContextFiles,
  "TUDO_SOBRE_PRISMA.md",
  "knowledge-sources-setup.md",
]);
const errors = [];

async function exists(path) {
  try { await readFile(path); return true; } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    if ([".git", ".prisma-data", ".pnpm-store", "dist", "node_modules", "tmp"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

for (const path of [...requiredStructure, ...canonicalSources]) {
  if (!await exists(resolve(repositoryRoot, path))) errors.push(`missing required source: ${path}`);
}

const contextDirectory = resolve(repositoryRoot, "docs/ai-context");
const actualContextFiles = (await readdir(contextDirectory)).filter((name) => name.endsWith(".md")).sort();
if (JSON.stringify(actualContextFiles) !== JSON.stringify([...requiredContextFiles].sort())) {
  errors.push(`context directory must contain exactly five canonical files: ${actualContextFiles.join(", ")}`);
}

for (const filename of requiredContextFiles) {
  const path = resolve(contextDirectory, filename);
  const content = await readFile(path, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/i)?.[1] ?? "";
  for (const key of metadataKeys) {
    if (!new RegExp(`^${key}:\\s*\\S+`, "m").test(frontmatter)) errors.push(`${filename}: missing metadata ${key}`);
  }
}

const allFiles = await walk(repositoryRoot);
const textFiles = allFiles.filter((path) => /\.(md|ts|mjs|json|sql|ya?ml)$/i.test(path));
for (const path of textFiles) {
  const content = await readFile(path, "utf8");
  if (/^(<<<<<<<|=======|>>>>>>>)(?: .*)?$/m.test(content)) errors.push(`conflict marker: ${relative(repositoryRoot, path)}`);
  if (path.endsWith(".md")) {
    const name = basename(path);
    const consolidatedPattern = /^(?:PRISMA[_-])?(?:MASTER|OVERVIEW|SNAPSHOT|KNOWLEDGE|WIKI|CONTEXT|CONTEXTO)(?:[_-]|\.)|^TUDO_SOBRE/i;
    if (consolidatedPattern.test(name) && !allowedConsolidated.has(name)) {
      errors.push(`competing consolidated source: ${relative(repositoryRoot, path)}`);
    }
  }
}

const expected = await buildPrismaContext();
if (!await exists(outputPath)) errors.push("missing generated export: TUDO_SOBRE_PRISMA.md");
else {
  const actual = await readFile(outputPath, "utf8");
  if (actual !== expected) errors.push("generated export is stale: run pnpm run generate:prisma-context");
  if (!actual.startsWith("<!-- GENERATED FILE. DO NOT EDIT.")) errors.push("generated export warning is missing");
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`prisma context check passed (${requiredContextFiles.length} canonical sources)\n`);
}
