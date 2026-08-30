import assert from "node:assert/strict";
import test from "node:test";
import { reviewOperationErrorMessage } from "../web/src/domain/reviewOperationErrors.js";

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
