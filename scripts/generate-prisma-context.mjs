import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
export const repositoryRoot = resolve(dirname(scriptPath), "..");
export const CONTEXT_BUNDLE_VERSION = "2.0.0";
export const PROMPT_SOURCE_VERSION = "1.0.0";
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
export const promptSourcePath = resolve(repositoryRoot, "FONTE_GPT_PRISMA.md");

export function normalizeLineEndings(content) {
  return content.replace(/\r\n?/g, "\n");
}

function normalizeSourceText(content) {
  return normalizeLineEndings(content).trim();
}

function sourceManifest(sources) {
  const manifest = sources.map(({ path, content }) => `${path}:${createHash("sha256").update(content).digest("hex")}`).join("\n");
  return createHash("sha256").update(manifest).digest("hex");
}

async function loadSources(paths) {
  return Promise.all(paths.map(async (path) => ({
    path,
    content: normalizeSourceText(await readFile(resolve(repositoryRoot, path), "utf8")),
  })));
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  }));
  return nested.flat();
}

export async function listPortableSourcePaths() {
  const docs = await markdownFiles(resolve(repositoryRoot, "docs"));
  const normalized = docs.map((path) => relative(repositoryRoot, path).replaceAll("\\", "/")).sort();
  return ["AGENTS.md", "README.md", ...normalized];
}

async function loadCanonicalSources() {
  return loadSources(canonicalSources);
}

async function loadPortableSources() {
  return loadSources(await listPortableSourcePaths());
}

function extractSection(content, title) {
  const lines = normalizeLineEndings(content).split("\n");
  const heading = `## ${title}`;
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) throw new Error(`Missing compact context section: ${title}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function selectSections(source, titles) {
  return titles.map((title) => extractSection(source, title)).join("\n\n");
}

function compactExcerpt(path, content) {
  const nestedHeadings = content.replace(/^(#{1,4})\s+/gm, (_, hashes) => `${"#".repeat(hashes.length + 2)} `);
  return `### Fonte: \`${path}\`\n\n${nestedHeadings}`;
}

function sourceByPath(sources, path) {
  const source = sources.find((item) => item.path === path);
  if (!source) throw new Error(`Missing canonical source: ${path}`);
  return source.content;
}

function frontmatterValue(content, key) {
  return content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "unknown";
}

function productVersion(currentState) {
  return currentState.match(/Prisma v(\d+\.\d+\.\d+) registra/u)?.[1]
    ?? currentState.match(/Prisma permanece v(\d+\.\d+\.\d+)/u)?.[1]
    ?? "unknown";
}

export async function buildPrismaContext() {
  const sources = await loadPortableSources();
  const manifestHash = sourceManifest(sources);
  const sections = sources.map(({ path, content }) => `\n\n---\n\n## Source: \`${path}\`\n\n${content}`);
  return `<!-- GENERATED FILE. DO NOT EDIT.\nartifact_role: portable-complete-context\ncontext_bundle_version: ${CONTEXT_BUNDLE_VERSION}\ndocumentation_source_count: ${sources.length}\nsource_manifest_sha256: ${manifestHash}\n-->\n\n# Tudo sobre o Prisma\n\nEsta exportação portátil reúne \`AGENTS.md\`, \`README.md\` e toda a documentação especializada em \`docs/**/*.md\`. Corrija as fontes e execute \`pnpm run generate:prisma-context\`; não edite este arquivo manualmente. Para gerar prompts de desenvolvimento com menor ruído, use \`FONTE_GPT_PRISMA.md\`.\n\nPara interpretar esta exportação, comece pelo índice e pelo estado atual. Depois use o owner do domínio afetado. ADRs, AoTs e evidências históricas preservam decisões e provas de sua época; não substituem o estado vigente nem a decisão mais recente do Product Owner.${sections.join("")}\n`;
}

export async function buildPrismaPromptSource() {
  const [sources, portableSources] = await Promise.all([loadCanonicalSources(), loadPortableSources()]);
  const manifestHash = sourceManifest(portableSources);
  const agents = sourceByPath(sources, "AGENTS.md");
  const readme = sourceByPath(sources, "README.md");
  const index = sourceByPath(sources, "docs/ai-context/PRISMA_CONTEXT_INDEX.md");
  const currentState = sourceByPath(sources, "docs/ai-context/PRISMA_CURRENT_STATE.md");
  const aiReference = sourceByPath(sources, "docs/ai-context/PRISMA_AI_REFERENCE.md");
  const technicalReference = sourceByPath(sources, "docs/ai-context/PRISMA_TECHNICAL_REFERENCE.md");
  const wiki = sourceByPath(sources, "docs/ai-context/PRISMA_WIKI.md");

  const compactSections = [
    ["Governança indispensável", compactExcerpt("AGENTS.md", selectSections(agents, [
      "1. Authority and scope",
      "2. Permanent product invariants",
      "3. Documentation ownership and precedence",
      "5. Reuse-first product and engineering decisions",
      "6. Risk classes",
      "11. Material-change rule",
      "12. Numbered requirement contracts",
      "13. Product Agreement and Prompt Fidelity Protocol",
    ]))],
    ["Índice e rotas de aprofundamento", compactExcerpt("docs/ai-context/PRISMA_CONTEXT_INDEX.md", index.replace(/^---[\s\S]*?---\s*/u, "").trim())],
    ["Estado vigente relevante para novos prompts", compactExcerpt("docs/ai-context/PRISMA_CURRENT_STATE.md", selectSections(currentState, [
      "Resumo operacional para prompts",
      "M6.1.2 — descoberta por trajetória em três grupos",
      "Ordenação por Prisma Score",
      "M6.2 — jornada contextual de verificação",
      "M6.1.1 — evidência profissional explícita sem barreira de categoria",
      "Base compartilhada de UX — 2026-09-13",
      "Versão exibida no login",
      "Repositório",
    ]))],
    ["Produto e linguagem de domínio", compactExcerpt("docs/ai-context/PRISMA_WIKI.md", selectSections(wiki, [
      "Produto",
      "Hipótese inicial",
      "Regras funcionais",
      "Usuários do piloto",
      "Escopo atual e futuro",
    ]))],
    ["Referência técnica essencial", compactExcerpt("docs/ai-context/PRISMA_TECHNICAL_REFERENCE.md", selectSections(technicalReference, [
      "M6.1.2 Matching por trajetória antes dos requisitos",
      "M5.4.6 Vagas",
      "Stack",
      "Arquitetura",
      "Segurança",
      "Ambientes",
      "Comandos",
      "Contratos e decisões",
      "Operação",
    ]))],
    ["Referência de IA essencial", compactExcerpt("docs/ai-context/PRISMA_AI_REFERENCE.md", selectSections(aiReference, [
      "Estado",
      "Pipeline",
      "Proveniência",
      "Versões",
      "Avaliação",
      "Confiança",
      "Custo e latência",
      "Guardrails",
      "Limitações",
    ]))],
    ["Entrada operacional do repositório", compactExcerpt("README.md", selectSections(readme, ["Repository map", "Non-negotiable boundaries"]))],
  ];
  const body = compactSections.map(([title, content]) => `## ${title}\n\n${content}`).join("\n\n---\n\n");
  const currentStateVersion = frontmatterValue(currentState, "version");
  const currentStateVerified = frontmatterValue(currentState, "last_verified");

  return `<!-- GENERATED FILE. DO NOT EDIT.\nartifact_role: gpt-prompt-authoring-source\nprompt_source_version: ${PROMPT_SOURCE_VERSION}\ncontext_bundle_version: ${CONTEXT_BUNDLE_VERSION}\nproduct_version: ${productVersion(currentState)}\ncurrent_state_version: ${currentStateVersion}\ncurrent_state_last_verified: ${currentStateVerified}\ndocumentation_source_count: ${portableSources.length}\nsource_manifest_sha256: ${manifestHash}\n-->\n\n# Fonte do GPT para prompts do Prisma\n\nUse este arquivo como a única fonte documental permanente do GPT que prepara prompts para o Codex. Ele é uma projeção compacta das fontes canônicas, não uma fonte de verdade independente.\n\nAo preparar uma mudança, o GPT deve distinguir o pedido atual, o comportamento vigente e o resultado desejado; localizar abaixo os owners e caminhos aplicáveis; mandar o Codex confirmar código, contratos, ADRs e ambiente antes de alterar; estruturar mudanças materiais em DEVE, PROIBIDO, FORA DE ESCOPO, AUTONOMIA, PENDENTE e CRITÉRIO DE ACEITE; e não produzir um prompt final enquanto uma pendência material puder mudar comportamento, autoridade, dados, UX, custo ou arquitetura.\n\nReferências históricas explicam evolução, mas nunca substituem a decisão vigente mais recente. Este arquivo não comprova implementação, rollout ou produção por si só.\n\n${body}\n`;
}

async function main() {
  const [completeContext, promptSource] = await Promise.all([buildPrismaContext(), buildPrismaPromptSource()]);
  await Promise.all([
    writeFile(outputPath, completeContext, "utf8"),
    writeFile(promptSourcePath, promptSource, "utf8"),
  ]);
  process.stdout.write(`generated ${relative(repositoryRoot, outputPath)}\n`);
  process.stdout.write(`generated ${relative(repositoryRoot, promptSourcePath)}\n`);
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) await main();
