import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = "supabase/migrations/20260903194822_profile_document_lifecycle.sql";
const cascadeMigration = "supabase/migrations/20260903204244_document_exclusive_dependencies_cascade.sql";

test("profile lifecycle extends existing ledgers with idempotent tenant-authorized operations", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /private\.require_document_reviewer\(p_organization_id\)/);
  assert.match(sql, /private\.claim_document_operation/);
  assert.match(sql, /for update/);
  assert.match(sql, /profile_published_merge/);
  assert.match(sql, /profile_published_replace/);
  assert.match(sql, /profile_version_restored/);
  assert.match(sql, /profile_reset/);
  assert.match(sql, /document_deleted/);
  assert.match(sql, /profile_rebuilt_after_document_deletion/);
  assert.match(sql, /revoke all on function public\.restore_profile_version[\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.restore_profile_version[\s\S]*to authenticated/i);
});

test("restore and reset preserve immutable history while document deletion leaves durable provenance", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /publication_origin = 'document_deletion_rebuild'|\'document_deletion_rebuild\'/);
  assert.match(sql, /restored_from_profile_id/);
  assert.match(sql, /source_document_snapshot/);
  assert.match(sql, /update public\.professional_profiles set superseded_at = now\(\)/i);
  assert.doesNotMatch(sql.match(/create or replace function public\.reset_person_profile[\s\S]*?\$\$;/i)?.[0] ?? "", /delete from public\.professional_profiles/i);
});

test("Storage deletion is coordinated by the authenticated lifecycle function", async () => {
  const [edge, config, service] = await Promise.all([
    readFile("supabase/functions/person-document-lifecycle/index.ts", "utf8"),
    readFile("supabase/config.toml", "utf8"),
    readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8"),
  ]);
  assert.match(edge, /prepare_document_deletion/);
  assert.match(edge, /\.storage\.from\(plan\.storage_bucket\)\.remove/);
  assert.match(edge, /finalize_document_deletion/);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(config, /\[functions\.person-document-lifecycle\][\s\S]*verify_jwt = true/);
  assert.match(service, /functions\.invoke\("person-document-lifecycle"/);
});

test("exclusive document dependencies cascade only inside the authorized lifecycle operation", async () => {
  const sql = await readFile(cascadeMigration, "utf8");
  assert.match(sql, /create trigger documents_authorize_dependency_cascade/i);
  assert.match(sql, /operation\.operation_type = 'delete_document'/i);
  assert.match(sql, /operation\.status = 'started'/i);
  assert.match(sql, /operation\.result ->> 'document_id' = old\.id::text/i);
  assert.match(sql, /current_user <> lifecycle_owner/i);
  assert.match(sql, /set_config\('prisma\.document_deletion_operation_id'/i);
  assert.match(sql, /profile_review_evidence_links_evidence_lifecycle_fk[\s\S]*on delete cascade/i);
  assert.match(sql, /knowledge_observations_evidence_link_lifecycle_fk[\s\S]*on delete set null/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});

test("operator UX exposes the official lifecycle language without per-item reasons", async () => {
  const [delta, versions, detail, center, styles] = await Promise.all([
    readFile("web/src/pages/ProfileDeltaPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileVersionsPage.tsx", "utf8"),
    readFile("web/src/pages/DocumentDetailPage.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);
  for (const label of ["Atualizar Perfil", "Substituir Perfil", "Adicionar", "Atualizar", "Substituir", "Manter atual", "Remover do novo Perfil"]) assert.match(delta, new RegExp(label));
  assert.match(versions, /Restaurar versão/);
  assert.match(versions, /Reiniciar Perfil/);
  assert.match(versions, /className="prisma-version-history-layout"/);
  assert.match(versions, /Visualização da versão v/);
  assert.match(styles, /@media \(max-width: 1000px\)[\s\S]*\.prisma-version-history-layout[\s\S]*grid-template-columns: 1fr/);
  assert.match(detail, /Excluir documento/);
  assert.match(center, /Excluir documento/);
  assert.doesNotMatch(delta, /Justificativa das remoções/);
});
