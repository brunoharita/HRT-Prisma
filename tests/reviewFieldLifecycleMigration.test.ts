import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("review lifecycle migration preserves legacy paths and protects every new save in PostgreSQL", async () => {
  const sql = await readFile("supabase/migrations/20260830175144_review_field_lifecycle.sql", "utf8");
  assert.match(sql, /is_valid_review_field_lifecycle\(payload jsonb, require_stable_ids boolean\)/);
  assert.match(sql, /experience_\[a-z0-9\]\{8,64\}/);
  assert.match(sql, /education_\[a-z0-9\]\{8,64\}/);
  assert.match(sql, /\[0-9\]\+\|experience_/);
  assert.match(sql, /before update of reviewed_data on public\.profile_reviews/);
  assert.match(sql, /full name is required to save a resume/);
  assert.match(sql, /phone or email is required to save a resume/);
  assert.match(sql, /material professional information is required to save a resume/);
  assert.match(sql, /person_private_data/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /revoke all on function private\.enforce_saved_profile_review_lifecycle/);
  assert.match(sql, /link_profile_review_original_evidence/);
  assert.match(sql, /new\.extracted_data -> 'experiences'.*->> 'id'/s);
  assert.doesNotMatch(sql, /grant execute on function private\./);
});

test("review UI exposes add, explicit removal, undo and field-local validation", async () => {
  const [panel, page] = await Promise.all([
    readFile("web/src/components/review/StructuredReviewPanel.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
  ]);
  assert.match(panel, />Adicionar experiência</);
  assert.match(panel, />Adicionar formação</);
  assert.match(panel, />Adicionar resultado</);
  assert.match(panel, />Remover experiência</);
  assert.match(panel, />Remover formação</);
  assert.match(panel, />Desfazer</);
  assert.match(panel, /data-review-field-path/);
  assert.match(panel, /Resultado vazio será descartado ao salvar/);
  assert.match(page, /normalizeReviewDraft\(draft\)/);
  assert.match(page, /validateReviewDraftForSave/);
});
