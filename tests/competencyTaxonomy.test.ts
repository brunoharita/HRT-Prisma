import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { readCompetencyTaxonomySearch } from "../web/src/domain/competencyTaxonomy.js";

const validSearch = {
  contractVersion: "competency-taxonomy-search-1.0.0",
  taxonomyVersion: "competency-taxonomy-1.0.0",
  query: "active listening",
  state: "official_alias",
  items: [{ conceptId: "concept-1", canonicalLabel: "Active Listening", conceptType: "skill", scope: "global",
    description: "Synthetic fixture", matchedTerm: "Active Listening", matchClass: "official_alias", aliasAuthority: "official_source",
    aliases: ["Active Listening"], references: [{ source: "O*NET", sourceVersion: "31.0", externalId: "fixture",
      externalUri: null, mappingType: "exact", nativeType: "skill", provenance: {} }] }],
} as const;

test("M7.2 v2 aceita apenas busca de competência versionada e rejeita ocupação", () => {
  assert.equal(readCompetencyTaxonomySearch(validSearch).items[0]?.canonicalLabel, "Active Listening");
  assert.throws(() => readCompetencyTaxonomySearch({ ...validSearch, taxonomyVersion: "future" }), /incompatível/);
  assert.throws(() => readCompetencyTaxonomySearch({ ...validSearch, items: [{ ...validSearch.items[0], conceptType: "occupation" }] }), /incompatível/);
});

test("M7.2 v2 cria domínios versionados sem substituir M7.1 e exclui ocupações antes do limite", async () => {
  const sql = await readFile("supabase/migrations/20260918200000_m72_competency_taxonomy_v2.sql", "utf8");
  assert.match(sql, /professional_taxonomy_releases/);
  assert.match(sql, /'occupation','position-taxonomy-1\.0\.0'/);
  assert.match(sql, /'competency','competency-taxonomy-1\.0\.0'/);
  assert.match(sql, /concept\.concept_type<>'occupation'/);
  assert.match(sql, /char_length\(v_query\)>=3/);
  assert.match(sql, /load_person_professional_evidence_map_v4/);
  assert.match(sql, /person-professional-evidence-3\.0\.0/);
  assert.match(sql, /createsPersonalEvidence',false/);
  assert.match(sql, /POSITION_REQUIREMENT_COMPETENCY_INVALID/);
  assert.doesNotMatch(sql, /from public\.vacancy_requirements[\s\S]*insert into public\.vacancy_requirements/i);
});

test("M7.2 v2 preserva clientes históricos e usa RPCs aditivas", async () => {
  const [migration, repository, curation] = await Promise.all([
    readFile("supabase/migrations/20260918200000_m72_competency_taxonomy_v2.sql", "utf8"),
    readFile("web/src/infrastructure/supabase/prismaRepository.ts", "utf8"),
    readFile("web/src/infrastructure/supabase/profileCompetencyCurationService.ts", "utf8"),
  ]);
  assert.doesNotMatch(migration, /drop function public\.load_person_professional_evidence_map/);
  assert.match(repository, /load_person_professional_evidence_map_v4/);
  assert.match(curation, /searchCompetencyTaxonomy/);
  assert.match(curation, /curate_profile_competency_v2/);
});
