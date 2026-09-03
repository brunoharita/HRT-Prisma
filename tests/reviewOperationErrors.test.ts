import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { operationRecovery, reviewOperationError, reviewOperationErrorMessage, supabaseFunctionOperationError, supabaseOperationError } from "../web/src/domain/reviewOperationErrors.js";

test("review operations turn approval gates into actionable messages", () => {
  assert.match(reviewOperationErrorMessage({ code: "23514", message: "material evidence is required before approval" }, "Falha."), /Vincule ao menos uma evidência/);
  assert.match(reviewOperationErrorMessage({ code: "23514", message: "full name is required to save a resume" }, "Falha."), /Nome completo/);
  assert.match(reviewOperationErrorMessage({ code: "23514", message: "phone or email is required to save a resume" }, "Falha."), /Telefone ou E-mail/);
  assert.match(reviewOperationErrorMessage({ code: "23514", message: "material professional information is required to save a resume" }, "Falha."), /conteúdo profissional/);
  assert.match(reviewOperationErrorMessage({ code: "22023", message: "review reason is required" }, "Falha."), /Justificativa da correção/);
  assert.match(reviewOperationErrorMessage({ code: "P0001", message: "profile_base_conflict" }, "Falha."), /Conflito de revisão/);
  assert.match(reviewOperationErrorMessage({ code: "42501", message: "organization scope is not authorized" }, "Falha."), /não possui autorização/);
  assert.match(reviewOperationErrorMessage({ code: "28000", message: "authenticated user required" }, "Falha."), /sessão expirou/);
  assert.match(reviewOperationErrorMessage({ code: "P0002", message: "active review evidence to replace was not found" }, "Falha."), /evidência já foi alterada/);
  assert.match(reviewOperationErrorMessage({ code: "42501", message: "original extraction evidence cannot be retired" }, "Falha."), /evidência original/);
  assert.equal(reviewOperationError({ code: "23514", message: "full name is required to save a resume" }, "Falha.").fieldPath, "identity.fullName");
  assert.equal(reviewOperationError({ code: "23514", message: "phone or email is required to save a resume" }, "Falha.").fieldPath, "contact.phone");
});

test("review operations never expose unknown database details to the operator", () => {
  const internal = 'column reference "definition_id" is ambiguous';
  const knownMessage = reviewOperationErrorMessage({ code: "42702", message: internal }, "Não foi possível aprovar.");
  assert.match(knownMessage, /inconsistência interna/);
  assert.doesNotMatch(knownMessage, /definition_id|ambiguous/);

  const unknownMessage = reviewOperationErrorMessage({ code: "XX000", message: "internal relation secret_table failed" }, "Não foi possível aprovar.");
  assert.match(unknownMessage, /informações permanecem nesta tela/);
  assert.doesNotMatch(unknownMessage, /secret_table|XX000/);
});

test("review operations distinguish evidence, learning, publication and stale-state recovery", () => {
  const evidence = reviewOperationError({ code: "22023", message: "raw selected evidence text is too long" }, "Falha.");
  assert.match(evidence.message, /apenas o trecho/);
  assert.equal(evidence.recovery, "review-fields");

  assert.match(reviewOperationErrorMessage({ code: "22023", message: "refinement decisions contain duplicate links" }, "Falha."), /vínculos/);
  assert.match(reviewOperationErrorMessage({ code: "22023", message: "evidence page is outside the document" }, "Falha."), /página exibida/);
  assert.match(reviewOperationErrorMessage({ code: "22023", message: "profile contains an unreviewed academic classification" }, "Falha."), /classificação acadêmica/);
  assert.match(reviewOperationErrorMessage({ code: "22023", message: "explicit publication removal is invalid" }, "Falha."), /remoção proposta/);
  assert.match(reviewOperationErrorMessage({ code: "55000", message: "approved document cannot be invalidated" }, "Falha."), /perfil aprovado/);

  const adaptive = reviewOperationError({ code: "22023", message: "adaptive sibling request is invalid" }, "Falha.");
  assert.match(adaptive.message, /Nenhuma sugestão foi aplicada/);
  assert.equal(adaptive.category, "internal");
  assert.equal(operationRecovery(adaptive), "reload");
});

test("Supabase transport and intake failures expose safe recovery without raw backend text", () => {
  const unavailable = supabaseOperationError({ code: "PGRST000", message: "database connection timeout at internal-host" }, "Falha.");
  assert.equal(unavailable.category, "unavailable");
  assert.equal(unavailable.recovery, "retry");
  assert.doesNotMatch(unavailable.message, /internal-host|PGRST000/);

  const expired = supabaseOperationError({ code: "PGRST301", message: "JWT expired" }, "Falha.");
  assert.equal(expired.recovery, "sign-in");
  assert.match(expired.message, /sessão expirou/);

  const missing = supabaseOperationError({ code: "P0002", message: "reviewable processing attempt not found" }, "Falha.");
  assert.equal(missing.recovery, "return-to-review");
  assert.match(missing.message, /ainda não está pronto/);

  const schemaMismatch = supabaseOperationError({ code: "PGRST202", message: "Could not find private function in schema cache" }, "Falha.");
  assert.equal(schemaMismatch.recovery, "reload");
  assert.doesNotMatch(schemaMismatch.message, /private function|PGRST202/);

  const invalidRelation = supabaseOperationError({ code: "23503", message: "insert violates foreign key private_constraint" }, "Falha.");
  assert.equal(invalidRelation.recovery, "return-to-review");
  assert.doesNotMatch(invalidRelation.message, /private_constraint|23503/);

  const unsupportedFile = supabaseOperationError({ code: "22023", message: "unsupported file type" }, "Falha.");
  assert.match(unsupportedFile.message, /PDF/);
  assert.doesNotMatch(unsupportedFile.message, /DOCX/);

  const genericInvalid = reviewOperationError({ code: "22023", message: "unknown_private_contract leaked" }, "Falha.");
  assert.match(genericInvalid.message, /falha interna/);
  assert.doesNotMatch(genericInvalid.message, /unknown_private_contract/);
});

test("operation-feedback 2.0 identifies the exact field in natural language", () => {
  const classification = reviewOperationError({
    code: "22023",
    message: "prisma_action_required",
    details: JSON.stringify({
      contract: "operation-feedback-2.0.0",
      reason: "education_classification_required",
      fieldPath: "education.education_12345678.classificationOrigin",
      itemNumber: 2,
    }),
  }, "Falha.");
  assert.equal(classification.message, "Formação 2: confirme a classificação acadêmica apresentada antes de publicar.");
  assert.equal(classification.fieldPath, "education.education_12345678.classificationOrigin");
  assert.equal(classification.recovery, "review-fields");

  const legacy = reviewOperationError({ code: "22023", message: "reviewed data has an invalid current contract" }, "Falha.");
  assert.match(legacy.message, /Nenhum campo precisa ser corrigido manualmente/);
  assert.equal(legacy.recovery, "reload");
});

test("verification, item-bank and knowledge failures say what the operator must do", () => {
  assert.match(supabaseOperationError({ message: "M51A_REQUIRES_PERSON_AND_VACANCY" }, "Falha.").message, /Selecione a pessoa e a vaga/);
  assert.match(supabaseOperationError({ message: "M51A_INSUFFICIENT_ITEM_BANK_COVERAGE" }, "Falha.").message, /perguntas suficientes/);
  assert.match(supabaseOperationError({ message: "M51B_INVALID_EXPIRY" }, "Falha.").message, /por quantos dias/);
  assert.match(supabaseOperationError({ message: "M51B_INVALID_OPTION" }, "Falha.").message, /alternativas disponíveis/);
  assert.match(supabaseOperationError({ message: "M51C_QUANTITY_EXCEEDS_GAP" }, "Falha.").message, /Reduza a quantidade/);
  assert.match(supabaseOperationError({ message: "M51C_HUMAN_REVIEW_REQUIRED" }, "Falha.").message, /revisão humana/);
  assert.match(supabaseOperationError({ message: "canonical label is required" }, "Falha.").message, /nome padronizado/);
});

test("Edge Function response bodies are translated without exposing technical payloads", async () => {
  const translated = await supabaseFunctionOperationError({
    message: "Edge Function returned a non-2xx status code",
    context: new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde um minuto." }), {
      status: 429,
      headers: { "content-type": "application/json" },
    }),
  }, "Falha.");
  assert.equal(translated.recovery, "retry");
  assert.match(translated.message, /Aguarde um minuto/);
  assert.doesNotMatch(translated.message, /non-2xx|Edge Function/);
});

test("Supabase service boundaries cannot throw raw backend messages", async () => {
  const baseDirectory = path.resolve("web/src/infrastructure/supabase");
  const entries = await readdir(baseDirectory, { recursive: true });
  const sourceFiles = entries.filter((entry) => entry.endsWith(".ts"));
  const violations: string[] = [];
  for (const entry of sourceFiles) {
    const source = await readFile(path.join(baseDirectory, entry), "utf8");
    if (/throw\s+new\s+Error\([^\n]*(?:error|result\.error)\.message/.test(source) || /throw\s+(?:error|result\.error)\s*;/.test(source)) {
      violations.push(entry);
    }
  }
  assert.deepEqual(violations, [], `Mensagens técnicas expostas em: ${violations.join(", ")}`);
});
