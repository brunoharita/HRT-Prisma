import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve("supabase/migrations/20260910164522_m56_document_intelligence_observability.sql");

test("M5.6 telemetry is tenant-scoped with RLS and explicit grants", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /organization_id uuid not null/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.has_org_role/);
  assert.match(sql, /actor_auth_user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /revoke all on public\.document_intelligence_runs from public, anon, authenticated/);
  assert.match(sql, /grant select, insert on public\.document_intelligence_runs to authenticated/);
});

test("M5.6 telemetry cannot persist raw document content", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.doesNotMatch(sql, /resume_text|raw_text|text_content|document_content|prompt/i);
  assert.match(sql, /diagnostic_categories/);
  assert.match(sql, /stage_metrics/);
});

test("structural pattern knowledge remains organization-scoped metadata", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /alter table public\.organization_extraction_patterns/);
  assert.match(sql, /structural_signature_version/);
  assert.match(sql, /provider_family/);
  assert.match(sql, /applicability jsonb/);
  assert.doesNotMatch(sql, /cbo|esco|o\*net|onet/i);
});
