import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260914051751_m62_contextual_verification_journey.sql", "utf8");
const retirement = readFileSync("supabase/migrations/20260914051918_m62_demo_need_retirement.sql", "utf8");
const parameterHardening = readFileSync("supabase/migrations/20260914053202_m62_requirement_parameter_hardening.sql", "utf8");
const matchingPage = readFileSync("web/src/pages/VacancyPages.tsx", "utf8");
const preparationPage = readFileSync("web/src/pages/CompetencyVerificationPage.tsx", "utf8");
const operationsPage = readFileSync("web/src/pages/VerificationOperationsPage.tsx", "utf8");

test("M6.2 cria necessidade somente por ação contextual e autorizada", () => {
  assert.match(migration, /create_m62_verification_need/);
  assert.match(migration, /private\.require_document_reviewer\(evaluation\.organization_id\)/);
  assert.match(migration, /M62_REQUIREMENT_CONTEXT_MISMATCH/);
  assert.match(migration, /M62_UNSUPPORTED_MATCHING_VERSION/);
  assert.match(migration, /vacancy_version_id = evaluation\.vacancy_version_id/);
  assert.match(migration, /revoke all on function public\.create_m62_verification_need.*from public, anon/i);
  assert.match(migration, /grant execute on function public\.create_m62_verification_need.*to authenticated/i);
  assert.match(retirement, /revoke all on function public\.ensure_m51a_demo_need\(uuid\) from public, anon, authenticated/i);
  assert.match(parameterHardening, /M62_TARGET_LEVEL_CONTEXT_MISMATCH/);
  assert.match(parameterHardening, /M62_CRITICALITY_CONTEXT_MISMATCH/);
  assert.match(parameterHardening, /effective_target_level := coalesce\(requirement\.target_level, p_target_level\)/);
  assert.match(parameterHardening, /effective_criticality := coalesce\(requirement\.criticality, p_criticality\)/);
});

test("loader do M6.2 é somente leitura e expõe contexto e linha do tempo", () => {
  const loader = migration.slice(migration.indexOf("create or replace function public.load_m51a_verification_workspace"));
  assert.doesNotMatch(loader.split("create or replace function public.load_m51b_operator_workspace")[0]!, /ensure_m51a_demo_need|insert into|update public/i);
  assert.match(loader, /'events'/);
  assert.match(loader, /'requirementLabel'/);
  assert.match(loader, /'vacancyVersion'/);
});

test("jornada visual preserva contexto e remove controles fictícios", () => {
  assert.match(matchingPage, /Verificar este requisito/);
  assert.match(matchingPage, /createNeed/);
  assert.match(preparationPage, /Contexto preservado/);
  assert.match(preparationPage, /Não há instrumento ativo/);
  assert.match(preparationPage, /Visualizar modelo/);
  assert.match(preparationPage, /Preparar e gerar link de convite/);
  assert.doesNotMatch(preparationPage, /<Select value=\{props\.need\.vacancyTitle\}/);
  assert.doesNotMatch(preparationPage, /<Radio checked>\{props\.need\.competencyLabel\}/);
});

test("convite e acompanhamento não simulam delivery ou conclusão", () => {
  assert.match(operationsPage, /Como você pretende compartilhar o link\?/);
  assert.match(operationsPage, /O envio será manual/);
  assert.match(operationsPage, /Não foi possível copiar automaticamente/);
  assert.match(operationsPage, /Abrir página do convite/);
  assert.match(operationsPage, /key: "inconclusive"/);
  assert.match(operationsPage, /Nenhum ponto é acrescentado/);
  assert.match(operationsPage, /fortalece somente este requisito/);
});
