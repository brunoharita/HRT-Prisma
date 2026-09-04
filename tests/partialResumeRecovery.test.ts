import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260831204334_recover_partial_resume_review.sql";

test("partial resume recovery keeps incomplete recognition reviewable and fail-closed", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.persist_person_extraction/i);
  assert.match(sql, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(sql, /set status = 'ready_for_review'::public\.document_status,[\s\S]*review_state = 'ready_for_review'/i);
  assert.match(sql, /failure_category = case when is_structured then null else 'incomplete_recognition'/i);
  assert.match(sql, /'reviewable', true/i);
  assert.match(sql, /create or replace function public\.start_profile_review/i);
  assert.match(sql, /attempt\.state = 'failed_structuring'[\s\S]*attempt\.failure_code = 'insufficient_structured_facts'/i);
  assert.match(sql, /attempt\.useful_character_count > 0/i);
  assert.match(sql, /attempt\.pages_native \+ attempt\.pages_ocr > 0/i);
  assert.match(sql, /exists \([\s\S]*from public\.document_page_extractions page/i);
  assert.match(sql, /extraction\.validation_status in \('valid', 'insufficient'\)/i);
  assert.match(sql, /'recovery_mode', recovery_mode/i);
  assert.doesNotMatch(sql, /delete from/i);
});

test("partial resume recovery uses preserved pages instead of the latest empty attempt", async () => {
  const [service, detail, workspace] = await Promise.all([
    readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8"),
    readFile("web/src/pages/DocumentDetailPage.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
  ]);

  assert.match(service, /function reviewAttemptsByDocument/);
  assert.match(service, /isRecoverableReviewAttempt\(candidate\)/);
  assert.match(service, /selectedDocument\?\.reviewAttempt\?\.id \?\? selectedDocument\?\.latestAttempt\?\.id/);
  assert.match(service, /pageAttemptIds[\s\S]*find\(\(attempt\) => pageAttemptIds\.has\(attempt\.id\)\)/);
  assert.doesNotMatch(service, /if \(!data\?\.\[0\]\?\.structured\)/);
  assert.match(detail, /document\.reviewAttempt\.id/);
  assert.match(detail, /Recuperar informações no currículo/);
  assert.match(workspace, /document\.reviewAttempt\.id/);
  assert.match(workspace, /Reabrir importação/);
});
