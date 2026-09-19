import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ui = readFileSync("web/src/components/profile/CompetencyCuration.tsx", "utf8");
const service = readFileSync("web/src/infrastructure/supabase/profileCompetencyCurationService.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260918220000_m76_curation_description_scope.sql", "utf8");

test("M76 curation captures optional description and retires the justification field", () => {
  assert.match(ui, /aria-label="Descrição do conceito"/);
  assert.doesNotMatch(ui, /Justificativa da associação/);
  assert.match(service, /curate_profile_competency_v4/);
  assert.doesNotMatch(service, /p_reason/);
  assert.match(migration, /p_scope = 'global'.*private\.require_knowledge_admin\(null\)/s);
  assert.match(migration, /human-proposal-2\.0\.0/);
  assert.doesNotMatch(migration, /'rationale',\s*btrim/);
});
