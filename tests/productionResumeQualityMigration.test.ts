import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production quality repair is additive, tenant-scoped and keeps telemetry PII-free", async () => {
  const sql = await readFile("supabase/migrations/20260916203000_production_resume_quality_observability.sql", "utf8");
  assert.match(sql, /create table if not exists public\.document_intelligence_runs/i);
  assert.match(sql, /foreign key \(organization_id, person_id\)/i);
  assert.match(sql, /alter table public\.document_intelligence_runs enable row level security/i);
  assert.match(sql, /private\.has_org_role/i);
  assert.match(sql, /actor_auth_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /revoke all on public\.document_intelligence_runs from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert on public\.document_intelligence_runs to authenticated/i);
  assert.doesNotMatch(sql, /resume_text|text_content|prompt|pdf_base64/i);
});
