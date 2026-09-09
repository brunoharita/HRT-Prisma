import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PERSON_DEPENDENCY_MATRIX,
  canAdministrativelyDeletePerson,
  canTransitionPersonDeletion,
  isFreshRegistration,
  isPersonSelfServiceCapability,
  personSelfServiceScope,
  sanitizePersonDeletionError,
} from "../src/domain/personDefinitiveDeletion.js";

const migrationPath = "supabase/migrations/20260909175124_person_definitive_deletion.sql";

test("M5.5 authority and self-service scopes fail closed", () => {
  for (const allowed of ["super_admin", "owner", "admin"]) assert.equal(canAdministrativelyDeletePerson(allowed), true);
  for (const denied of ["recruiter", "member", "self", "unknown"]) assert.equal(canAdministrativelyDeletePerson(denied), false);
  assert.match(personSelfServiceScope("org-a", "person-a"), /person-data-self-service-1\.0\.0:person_data_self_service:org-a:person-a/);
  assert.equal(isPersonSelfServiceCapability({ contractVersion: "person-data-self-service-1.0.0", purpose: "person_data_self_service", organizationId: "org-a", personId: "person-a", expectedOrganizationId: "org-a", expectedPersonId: "person-a" }), true);
  assert.equal(isPersonSelfServiceCapability({ contractVersion: "m51b-assessment-invitation-1.0.0", purpose: "assessment", organizationId: "org-a", personId: "person-a", expectedOrganizationId: "org-a", expectedPersonId: "person-a" }), false);
  assert.equal(isPersonSelfServiceCapability({ contractVersion: "person-data-self-service-1.0.0", purpose: "person_data_self_service", organizationId: "org-a", personId: "person-b", expectedOrganizationId: "org-a", expectedPersonId: "person-a" }), false);
});

test("M5.5 operation state machine allows retry but never reopens terminal states", () => {
  assert.equal(canTransitionPersonDeletion("requested", "purging"), true);
  assert.equal(canTransitionPersonDeletion("purging", "verifying"), true);
  assert.equal(canTransitionPersonDeletion("verifying", "completed"), true);
  assert.equal(canTransitionPersonDeletion("failed_retryable", "purging"), true);
  assert.equal(canTransitionPersonDeletion("completed", "purging"), false);
  assert.equal(canTransitionPersonDeletion("blocked", "completed"), false);
});

test("M5.5 dependency classification preserves shared knowledge and deletes the individual aggregate", () => {
  const byResource = new Map(PERSON_DEPENDENCY_MATRIX.map((item) => [item.resource, item.action]));
  assert.equal(byResource.get("people"), "delete");
  assert.equal(byResource.get("person_private_data"), "delete");
  assert.equal(byResource.get("knowledge_observations"), "delete");
  assert.equal(byResource.get("published_knowledge"), "preserve");
  assert.equal(byResource.get("assessment_item_bank_and_rubrics"), "preserve");
  assert.equal(byResource.get("vacancies"), "preserve");
  assert.equal(byResource.get("person_deletion_operations"), "preserve");
});

test("M5.5 feedback is sanitized and re-registration is always a fresh aggregate", () => {
  assert.doesNotMatch(sanitizePersonDeletionError("person_deletion_storage_pending at public.documents"), /public\.|documents|sql/i);
  assert.equal(isFreshRegistration("old-id", "new-id", 0), true);
  assert.equal(isFreshRegistration("old-id", "old-id", 0), false);
  assert.equal(isFreshRegistration("old-id", "new-id", 1), false);
});

test("M5.5 SQL owns one tenant-scoped resumable saga and a detached minimal audit", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.person_deletion_operations/i);
  assert.match(sql, /deleted_person_id_snapshot uuid not null/);
  assert.match(sql, /person_name_snapshot text not null/);
  assert.match(sql, /actor_reference text not null/);
  assert.doesNotMatch(sql.match(/create table public\.person_deletion_operations[\s\S]*?\);/i)?.[0] ?? "", /email|phone|resume|response|address/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /person_deletion_one_open_operation_idx/);
  assert.match(sql, /operational_status = 'deleting'/);
  assert.match(sql, /person_deletion_context_allows/);
  assert.match(sql, /revoke all on public\.person_deletion_operations[\s\S]*from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant delete on public\.people/i);
});

test("M5.5 SQL coordinates Storage and refuses completion with residues", async () => {
  const [sql, edge, config] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("supabase/functions/person-data-deletion/index.ts", "utf8"),
    readFile("supabase/config.toml", "utf8"),
  ]);
  assert.match(sql, /person_deletion_storage_pending/);
  assert.match(sql, /person_deletion_residue_detected/);
  assert.match(sql, /person_deletion_shared_knowledge_changed/);
  assert.match(edge, /\.storage\.from\(bucket\)\.remove/);
  assert.match(edge, /\.storage\.from\(bucket\)\.list/);
  assert.match(edge, /mark_person_deletion_storage_removed/);
  assert.match(edge, /fail_person_deletion_retryable/);
  assert.match(edge, /finalize_person_definitive_deletion/);
  assert.match(config, /\[functions\.person-data-deletion\][\s\S]*verify_jwt = false/);
});

test("M5.5 self-service never accepts assessment authority and never takes a person id", async () => {
  const [sql, edge, page] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("supabase/functions/person-data-deletion/index.ts", "utf8"),
    readFile("web/src/pages/PersonDataSelfServicePage.tsx", "utf8"),
  ]);
  const selfFunction = sql.slice(sql.indexOf("create or replace function public.person_self_service_access"), sql.indexOf("create or replace function public.mark_person_deletion_storage_removed"));
  assert.match(selfFunction, /purpose = 'person_data_self_service'/);
  assert.match(selfFunction, /contract_version = 'person-data-self-service-1\.0\.0'/);
  assert.doesNotMatch(selfFunction, /p_person_id/);
  assert.doesNotMatch(edge, /assessment-access|m51b_public_access/);
  assert.match(edge, /tokenHash/);
  assert.doesNotMatch(edge, /console\.error\([^\n]*(token|email|phone)/i);
  assert.match(page, /Excluir meus dados/);
  assert.doesNotMatch(page, /\bEXCLUIR\b/);
  assert.doesNotMatch(page, /digite|justificativa/i);
});

test("M5.5 administrative UX offers one categorized confirmation in a critical area", async () => {
  const center = await readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8");
  assert.match(center, /Excluir Pessoa definitivamente/);
  assert.match(center, /canDeletePerson/);
  assert.match(center, /\["super_admin", "owner", "admin"\]/);
  assert.match(center, /Será excluído/);
  assert.match(center, /Continuará disponível/);
  assert.match(center, /Auditoria mínima da exclusão/);
  assert.doesNotMatch(center.match(/function handleDeletePerson[\s\S]*?function issueSelfServiceAccess/)?.[0] ?? "", /Popconfirm|checkbox|justificativa|EXCLUIR/);
});
