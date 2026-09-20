import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrismaContext,
  buildPrismaPromptSource,
  CONTEXT_BUNDLE_VERSION,
  listPortableSourcePaths,
  normalizeLineEndings,
  PROMPT_SOURCE_VERSION,
} from "../../scripts/generate-prisma-context.mjs";

test("gera fonte compacta e exportação completa com o mesmo manifesto", async () => {
  const [complete, compact, portableSources] = await Promise.all([buildPrismaContext(), buildPrismaPromptSource(), listPortableSourcePaths()]);
  const completeManifest = complete.match(/source_manifest_sha256: ([a-f0-9]{64})/)?.[1];
  const compactManifest = compact.match(/source_manifest_sha256: ([a-f0-9]{64})/)?.[1];

  assert.equal(completeManifest, compactManifest);
  assert.match(complete, /artifact_role: portable-complete-context/);
  assert.match(compact, /artifact_role: gpt-prompt-authoring-source/);
  assert.match(complete, new RegExp(`context_bundle_version: ${CONTEXT_BUNDLE_VERSION.replaceAll(".", "\\.")}`));
  assert.match(compact, new RegExp(`prompt_source_version: ${PROMPT_SOURCE_VERSION.replaceAll(".", "\\.")}`));
  assert.equal((complete.match(/^## Source:/gm) ?? []).length, portableSources.length);
  assert.ok(portableSources.length > 150, "portable export must include specialized owner documentation");
  assert.match(complete, new RegExp(`documentation_source_count: ${portableSources.length}`));
  assert.match(compact, new RegExp(`documentation_source_count: ${portableSources.length}`));
  assert.ok(compact.length < 60000, `compact source has ${compact.length} characters`);
  assert.ok(compact.length < complete.length / 2, "compact source must remain materially smaller than the portable export");
});

test("fonte compacta contém contexto vigente e encaminha aprofundamento ao Codex", async () => {
  const compact = await buildPrismaPromptSource();
  const scopeProtocol = "Trabalhe apenas nas partes e nos fluxos claramente envolvidos no movimento. Separe o que é necessário, o que é sugestão opcional e o que é assunto adjacente. Antes de incluir uma sugestão, informe seu valor e custo estimado em superfícies afetadas, tempo, validação e risco; aguarde minha decisão. Para movimentos materiais, produza primeiro o Agreement Contract (D/P/F/A/Q/CA). Só gere o Execution Prompt final após resolver as decisões Q-* materiais. Não trate documentação como prova de implementação ou publicação.";

  assert.ok(compact.includes(scopeProtocol), "missing approved scope and prompt protocol");

  for (const expected of [
    "Prisma v1.8.1",
    "vacancy-matching-explainable-5.0.0",
    "matching-score-1.2.0",
    "FONTE_GPT_PRISMA.md",
    "TUDO_SOBRE_PRISMA.md",
    "docs/qa/agreement-contract-template.md",
    "docs/qa/aot-template.md",
    "mandar o Codex confirmar código, contratos, ADRs e ambiente",
    "Fidelidade a referências visuais",
    "Não significa trocar uma composição",
    "D-UX-*",
    "mesmo estado, dados equivalentes e viewport",
  ]) assert.ok(compact.includes(expected), `missing compact reference: ${expected}`);

  assert.doesNotMatch(compact, /ESCO e O\*NET permanecem catalogadas até a ingestão humana/);
  assert.doesNotMatch(compact, /Não existe LLM externo ativo/);
});

test("comparação normalizada distingue conteúdo e aceita LF ou CRLF", () => {
  const lf = "linha 1\nlinha 2\n";
  const crlf = lf.replaceAll("\n", "\r\n");
  assert.equal(normalizeLineEndings(lf), normalizeLineEndings(crlf));
  assert.notEqual(normalizeLineEndings(lf), normalizeLineEndings("linha 1\nlinha diferente\n"));
});
