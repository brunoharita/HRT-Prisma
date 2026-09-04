import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260903232237_m53_pilot_operational_resilience.sql";

test("M5.3 normalizes structured lists from historical profile versions", async () => {
  const service = await readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8");
  assert.match(service, /decodeHistoricalTextList\(value\.languages[\s\S]*\["proficiency", "level"\]/);
  assert.match(service, /decodeHistoricalTextList\(value\.certifications/);
  assert.match(service, /decodeHistoricalTextList\(value\.competencies/);
});

test("M5.3 keeps a long historical Profile independently scrollable during review", async () => {
  const [review, styles] = await Promise.all([
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);
  assert.match(review, /className="prisma-profile-review-source"/);
  assert.match(styles, /\.prisma-profile-review-source\s*\{[^}]*height: 100%;[^}]*min-height: 0;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;[^}]*scrollbar-gutter: stable;/s);
});

test("M5.3 reuses immutable profiles and existing documents as revision sources", async () => {
  const [sql, application, center, versions, review] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("web/src/app/PrismaApplication.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/pages/ProfileVersionsPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
  ]);
  assert.match(sql, /create or replace function public\.start_profile_version_review/i);
  assert.match(sql, /create or replace function public\.start_document_revision/i);
  assert.match(sql, /source_kind in \('document', 'profile'\)/i);
  assert.match(center, /Perfil atual[\s\S]*Versão anterior[\s\S]*Documento existente/);
  assert.match(versions, /Usar como base para nova revisão/);
  assert.match(application, /profileSourceReviewMatch = \/\^\\\/profiles/);
  assert.match(review, /workspace\.sourceKind === "profile"/);
});

test("M5.3 deletion keeps every Profile version immutable and restorable", async () => {
  const [sql, center, versions] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/pages/ProfileVersionsPage.tsx", "utf8"),
  ]);
  const deletion = sql.slice(sql.indexOf("create or replace function public.finalize_document_deletion"), sql.indexOf("create or replace function public.move_person_document"));
  assert.match(deletion, /source_document_snapshot = coalesce/i);
  assert.match(deletion, /source_document_id = null, processing_attempt_id = null/i);
  assert.match(deletion, /'profile_preserved', true/i);
  assert.doesNotMatch(deletion, /insert into public\.professional_profiles/i);
  assert.doesNotMatch(deletion, /update public\.professional_profiles set superseded_at/i);
  assert.match(center, /Nenhuma versão de Perfil será reescrita/);
  assert.match(versions, /O documento original foi excluído, mas este Perfil continua completo e restaurável/);
  assert.match(versions, /Restaurar como nova versão/);
});

test("M5.3 corrects document ownership atomically with all document-scoped records", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const helper = sql.slice(sql.indexOf("create or replace function private.reassign_document_person"), sql.indexOf("create or replace function public.start_profile_version_review"));
  for (const table of ["documents", "document_processing_attempts", "document_page_extractions", "extraction_drafts", "evidence", "profile_reviews", "profile_publication_decisions", "knowledge_observations"]) {
    assert.match(helper, new RegExp(`update public\\.${table}`, "i"));
  }
  assert.match(sql, /current_profile_affected/);
  assert.match(sql, /previous_document_version/);
  assert.match(sql, /target_document_version/);
});

test("M5.3 merge requires human choices only for real conflicts and preserves history", async () => {
  const [sql, page] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("web/src/pages/PersonMergePage.tsx", "utf8"),
  ]);
  assert.match(sql, /merge_contact_choice_required/);
  assert.match(sql, /merge_profile_choice_required/);
  assert.match(sql, /p_contact_choices ->> conflict_field/);
  assert.match(sql, /operational_status = 'merged'/);
  assert.match(sql, /merged_into_person_id = p_target_person_id/);
  assert.match(page, /Escolha somente os dados que entram em conflito/);
  assert.match(page, /O Prisma não mistura conteúdos automaticamente/);
  assert.match(page, /Documentos, extrações, evidências e versões históricas serão preservados/);
});

test("M5.3 mutations fail closed for tenant, role, stale state and duplicate requests", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const signature of ["start_profile_version_review", "start_document_revision", "preview_document_deletion", "move_person_document", "update_person_lifecycle", "set_person_archive_state", "merge_people"]) {
    const start = sql.indexOf(`create or replace function public.${signature}`);
    const body = sql.slice(start, sql.indexOf("revoke all on function", start));
    assert.ok(start >= 0, `${signature} must exist`);
    assert.match(body, /private\.require_document_reviewer\(p_organization_id\)/i);
    if (signature !== "preview_document_deletion") assert.match(body, /private\.claim_document_operation/i);
  }
  assert.match(sql, /person\.updated_at is distinct from p_expected_updated_at/);
  assert.match(sql, /message = 'person_state_conflict'/);
  assert.match(sql, /if operation\.status = 'completed'/);
  assert.match(sql, /revoke all on function public\.merge_people[\s\S]*grant execute[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /grant (select|insert|update|delete|all) on public\.(people|documents|profile_reviews)[\s\S]*to authenticated/i);
});

test("M5.3 presents archive, merge, move and recovery without new global navigation", async () => {
  const [application, people, center, merge, styles] = await Promise.all([
    readFile("web/src/app/PrismaApplication.tsx", "utf8"),
    readFile("web/src/pages/PeoplePage.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/pages/PersonMergePage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);
  assert.match(center, /Corrigir Pessoa vinculada/);
  assert.match(center, /Arquivar Pessoa/);
  assert.match(center, /Reativar Pessoa/);
  assert.match(center, /Criar nova revisão/);
  assert.match(people, /Pessoas arquivadas/);
  assert.match(merge, /Mesclar Pessoas/);
  assert.match(application, /profileView === "merge"/);
  assert.doesNotMatch(application, /label: "Mesclar Pessoas"/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.prisma-merge-footer/);
});
