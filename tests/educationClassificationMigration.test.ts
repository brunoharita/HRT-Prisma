import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260902122414_education_academic_classification.sql", "utf8");
const compatibilityMigration = readFileSync("supabase/migrations/20260902125511_education_academic_classification_legacy_compatibility.sql", "utf8");

test("migration extends the canonical education JSON instead of creating a parallel table", () => {
  assert.match(migration, /is_valid_education_classification/);
  assert.match(migration, /'level'.*'qualification'.*'classificationOrigin'/s);
  assert.doesNotMatch(migration, /create table .*education/i);
});

test("current extraction and review writes fail closed while historical payloads remain compatible", () => {
  assert.match(migration, /is_valid_education_classification\(new\.reviewed_data, true\)/);
  assert.match(migration, /is_valid_education_classification\(new\.identified_fields, true\)/);
  assert.match(migration, /if require_current then return false/);
});

test("academic combinations and metadata-only audit are enforced server-side", () => {
  assert.match(migration, /when 'technical' then \(item ->> 'qualification'\) in \('technical_course', 'unknown'\)/);
  assert.match(migration, /education_classification_confirmed/);
  assert.match(migration, /profile contains an unreviewed academic classification/);
  assert.match(migration, /'changed_dimensions'/);
  assert.doesNotMatch(migration, /grant .*is_valid_education_classification.*authenticated/i);
});

test("classification evidence paths remain bounded to the existing review contract", () => {
  assert.match(migration, /education_\[a-z0-9\]\{8,64\}.*level\|qualification\|status\|classificationOrigin/s);
  assert.match(compatibilityMigration, /review_field_record_scope/);
  assert.match(compatibilityMigration, /course\|institution\|period\|description\|level\|qualification\|status\|classificationOrigin/);
});

test("reviewed historical records enter the current lifecycle without a fabricated snapshot", () => {
  assert.match(compatibilityMigration, /classificationMethodVersion' <> 'legacy-unclassified'/);
  assert.match(compatibilityMigration, /without a fabricated classifier snapshot/);
});
