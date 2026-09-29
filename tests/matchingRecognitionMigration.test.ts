import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("M6.2 acrescenta somente versões reconhecidas e preserva guard fail-closed", async () => {
  const sql = await readFile("supabase/migrations/20260928190000_matching_recognition_consistency.sql", "utf8");
  const oldGuard = sql.match(/old_guard text := \$guard\$(.*?)\$guard\$/s)?.[1];
  const newGuard = sql.match(/new_guard text := \$guard\$(.*?)\$guard\$/s)?.[1];
  assert.ok(oldGuard && newGuard);
  assert.equal(oldGuard, "evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-semantic-6.0.0')");
  assert.equal(newGuard, "evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-explainable-5.1.0', 'vacancy-matching-semantic-6.0.0', 'vacancy-matching-semantic-7.0.0')");
  assert.match(sql, /pg_get_functiondef\('public\.create_m62_verification_need\(uuid,uuid,text,text\)'::regprocedure\)/);
  assert.match(sql, /if position\(old_guard in definition\) = 0 then raise exception 'MATCHING_RECOGNITION_M62_BASELINE_MISMATCH'/);
  assert.match(sql, /execute replace\(definition, old_guard, new_guard\)/);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate|drop|revoke|grant)\b/i);
});
