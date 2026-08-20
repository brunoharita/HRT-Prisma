import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
export const repositoryRoot = resolve(dirname(scriptPath), "..");
export const canonicalSources = [
  "AGENTS.md",
  "README.md",
  "docs/ai-context/PRISMA_CONTEXT_INDEX.md",
  "docs/ai-context/PRISMA_CURRENT_STATE.md",
  "docs/ai-context/PRISMA_AI_REFERENCE.md",
  "docs/ai-context/PRISMA_TECHNICAL_REFERENCE.md",
  "docs/ai-context/PRISMA_WIKI.md",
];
export const outputPath = resolve(repositoryRoot, "TUDO_SOBRE_PRISMA.md");

export async function buildPrismaContext() {
  const sources = await Promise.all(canonicalSources.map(async (path) => ({
    path,
    content: (await readFile(resolve(repositoryRoot, path), "utf8")).trim(),
  })));
  const manifest = sources.map(({ path, content }) => `${path}:${createHash("sha256").update(content).digest("hex")}`).join("\n");
  const manifestHash = createHash("sha256").update(manifest).digest("hex");
  const sections = sources.map(({ path, content }) => `\n\n---\n\n## Source: \`${path}\`\n\n${content}`);
  return `<!-- GENERATED FILE. DO NOT EDIT.\ncontext_bundle_version: 1.0.0\nsource_manifest_sha256: ${manifestHash}\n-->\n\n# Tudo sobre o Prisma\n\nEsta exportação é gerada automaticamente. Corrija as fontes canônicas e execute \`pnpm run generate:prisma-context\`.${sections.join("")}\n`;
}

async function main() {
  const content = await buildPrismaContext();
  await writeFile(outputPath, content, "utf8");
  process.stdout.write(`generated ${relative(repositoryRoot, outputPath)}\n`);
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) await main();
