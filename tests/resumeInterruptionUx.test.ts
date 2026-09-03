import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("resume review validates adaptive data before persistence and distinguishes saved operations from refresh failures", async () => {
  const page = await readFile("web/src/pages/ProfileReviewPage.tsx", "utf8");
  assert.match(page, /const nextDraft = normalizeReviewDraft\(suggestions\.reduce/);
  assert.match(page, /validateReviewDraftForSave\(nextDraft/);
  assert.match(page, /O rascunho foi salvo, mas a tela não conseguiu carregar a confirmação atualizada/);
  assert.match(page, /As sugestões foram aplicadas e preservadas, mas a tela não conseguiu atualizar a confirmação/);
  assert.match(page, /A evidência foi registrada e preservada, mas a tela não conseguiu carregar a confirmação/);
});

test("publication preflight keeps the confirmation open after failure and points back to review", async () => {
  const page = await readFile("web/src/pages/ProfileDeltaPage.tsx", "utf8");
  assert.match(page, /validateEducationClassificationsForApproval\(normalizedDraft\)/);
  assert.match(page, /Antes de publicar, falta concluir/);
  assert.match(page, /Revisar o campo/);
  assert.match(page, /setConfirmOpen\(false\);\s*onNavigate/);
  const finallyBlock = page.match(/finally \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.doesNotMatch(finallyBlock, /setConfirmOpen/);
});

test("processing failures expose a concrete recovery and never display raw persisted backend failures", async () => {
  const importPage = await readFile("web/src/pages/ResumeImportPage.tsx", "utf8");
  const workspacePage = await readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8");
  const detailPage = await readFile("web/src/pages/DocumentDetailPage.tsx", "utf8");
  const service = await readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8");
  assert.match(importPage, /Mantenha esta página aberta durante o processamento/);
  assert.match(importPage, /Tentar novamente/);
  assert.match(importPage, /Substituir arquivo/);
  assert.match(workspacePage, /processingFailureMessage\(attempt\)/);
  assert.doesNotMatch(workspacePage, /message=\{attempt\.failureMessage\}/);
  assert.match(detailPage, /const canReprocess = presentation\.state === "technical_failure" && presentation\.nextAction === "Reprocessar"/);
  assert.match(detailPage, /processingFailureMessage\(document\.latestAttempt\)/);
  assert.match(service, /throw supabaseOperationError\(error, message\)/);
  assert.doesNotMatch(service, /throw new Error\(`\$\{message\} \$\{error\.message\}`\)/);
});
