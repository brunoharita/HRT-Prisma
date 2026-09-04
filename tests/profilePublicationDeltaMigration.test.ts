import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publication Delta preserves omissions and records only explicit removals", async () => {
  const sql = await readFile("supabase/migrations/20260831230000_profile_publication_delta.sql", "utf8");

  assert.match(sql, /create table public\.profile_publication_removals/i);
  assert.match(sql, /alter table public\.profile_publication_removals enable row level security/i);
  assert.match(sql, /private\.has_org_role[\s\S]*'super_admin', 'owner', 'admin', 'recruiter'/i);
  assert.doesNotMatch(sql, /profile_publication_removals_select[\s\S]{0,300}'member'/i);
  assert.match(sql, /revoke insert, update, delete on public\.profile_publication_removals from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.publish_profile_review[\s\S]*security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(sql, /private\.merge_profile_publication_delta/i);
  assert.match(sql, /not has_match then result := result \|\| jsonb_build_array\(base_item\)/i);
  assert.match(sql, /profile_delta_merge_text_array\('competencies'/i);
  assert.match(sql, /explicit publication removal is invalid/i);
  assert.match(sql, /profile_publication_removals_unique unique \(organization_id, review_id, field_path\)/i);
  assert.match(sql, /'omissions_preserved', true/i);
  assert.doesNotMatch(sql, /delete from/i);
});

test("the six-screen journey uses one state source and publishes from Delta", async () => {
  const [importer, review, delta, application] = await Promise.all([
    readFile("web/src/pages/ResumeImportPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileDeltaPage.tsx", "utf8"),
    readFile("web/src/app/PrismaApplication.tsx", "utf8"),
  ]);
  assert.match(importer, /Importar currículo/);
  assert.match(importer, /Identificação da pessoa/);
  assert.match(importer, /Processamento do documento/);
  assert.match(importer, /Análise do documento/);
  assert.match(importer, /deriveResumeProductState/);
  assert.match(review, /Revisão do documento/);
  assert.match(delta, /Comparação com o perfil atual/);
  assert.match(delta, /Atualizar Perfil preserva informações já aprovadas/);
  assert.match(delta, /Substituir Perfil/);
  assert.match(application, /profileView === "delta"/);
});

test("legacy approval is private and recoverable review sources survive later empty attempts", async () => {
  const [boundary, guard, guardFix, actorIndex, service] = await Promise.all([
    readFile("supabase/migrations/20260901000000_enforce_profile_publication_boundary.sql", "utf8"),
    readFile("supabase/migrations/20260831233000_profile_publication_review_attempt_guard.sql", "utf8"),
    readFile("supabase/migrations/20260831234000_profile_publication_review_attempt_guard_fix.sql", "utf8"),
    readFile("supabase/migrations/20260901001000_profile_publication_removals_actor_index.sql", "utf8"),
    readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8"),
  ]);

  assert.match(boundary, /revoke execute on function public\.approve_profile_review[\s\S]*public, anon, authenticated/i);
  assert.match(boundary, /grant execute on function public\.publish_profile_review[\s\S]*authenticated/i);
  assert.match(guard, /latest\.state not in \('failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring'\)/i);
  assert.match(guard, /useful_character_count > 0/i);
  assert.match(guardFix, /draft\.validation_status/i);
  assert.match(actorIndex, /profile_publication_removals_actor_idx[\s\S]*actor_auth_user_id/i);
  assert.match(service, /async approveProfileReview[\s\S]*supabase\.rpc\("publish_profile_review"/i);
});

test("legacy profile entities are upgraded at publication and operator gates identify the exact field", async () => {
  const [migration, delta, errors] = await Promise.all([
    readFile("supabase/migrations/20260902213000_actionable_review_errors_and_legacy_publication.sql", "utf8"),
    readFile("web/src/pages/ProfileDeltaPage.tsx", "utf8"),
    readFile("web/src/domain/reviewOperationErrors.ts", "utf8"),
  ]);
  assert.match(migration, /normalize_profile_review_contract[\s\S]*new\.reviewed_data := private\.normalize_profile_review_contract/i);
  assert.match(migration, /historical_profile_approved_before_academic_classification/i);
  assert.match(migration, /operation-feedback-2\.0\.0/i);
  assert.match(migration, /education_classification_required[\s\S]*classificationOrigin/i);
  assert.match(migration, /education_qualification_incompatible[\s\S]*qualification/i);
  assert.match(delta, /synchronizeProfileReviewContract/);
  assert.match(delta, /Revisar o campo/);
  assert.match(errors, /fieldPath/);
  assert.match(errors, /Nenhum campo precisa ser corrigido manualmente/);
});
