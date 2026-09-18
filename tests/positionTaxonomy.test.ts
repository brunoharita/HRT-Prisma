import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { applyTaxonomy, changeTaxonomyTitle, groupTaxonomyItems, readPositionTaxonomy, readTaxonomyItem, selectTaxonomyRequirement } from "../web/src/domain/positionTaxonomy.js";
import { emptyVacancyDraft, VACANCY_MATCHING_VERSION } from "../web/src/domain/vacancy.js";
import { m71Fixture, m71Item, m71Complement } from "./fixtures/m71Taxonomy.js";

test("M7.1 normalization preserves business title, text, requirements and explicit choices", () => {
  const draft = { ...emptyVacancyDraft(), title: "Desenvolvedor de software", mission: "Missão humana" };
  const next = applyTaxonomy(draft, m71Fixture());
  assert.equal(next.title, draft.title); assert.equal(next.mission, draft.mission);
  assert.deepEqual(next.requirements, []); assert.equal(next.referenceConceptId, "occupation-fixture");
  assert.equal(applyTaxonomy(draft, m71Fixture({ originalTitle: "Resposta antiga" })), draft);
  assert.equal(changeTaxonomyTitle({ ...next, taxonomyDecision: "human" }, "Outro título humano").referenceConceptId, "occupation-fixture");
  assert.equal(changeTaxonomyTitle(next, "Outro título").referenceConceptId, null);
  assert.equal(changeTaxonomyTitle({ ...next, taxonomyDecision: "cleared" }, "Novo título").taxonomyDecision, "cleared");
});
test("M7.1 selection required/desired is explicit, deduplicated and source preserving", () => {
  const draft = { ...emptyVacancyDraft(), taxonomy: m71Fixture() };
  const next = selectTaxonomyRequirement(draft, m71Item, "desired");
  assert.equal(next.requirements.length, 1); assert.equal(next.requirements[0]?.importance, "desired");
  assert.equal(next.requirements[0]?.importanceConfirmed, true); assert.deepEqual(next.requirements[0]?.taxonomyOrigin, m71Item);
  assert.equal(selectTaxonomyRequirement(next, m71Item, "required"), next);
  assert.throws(() => selectTaxonomyRequirement(draft, { ...m71Item, conceptType: "occupation" }, "required"));
  assert.throws(() => selectTaxonomyRequirement(draft, m71Item, "automatic" as "required"));
  assert.equal(selectTaxonomyRequirement(draft, m71Complement, "required").requirements[0]?.importance, "required");
  assert.throws(() => selectTaxonomyRequirement(draft, { ...m71Complement, organizationId: "other" }, "required"));
});
test("M7.1 groups only published types, never manufactures common occupational families", () => {
  const groups = groupTaxonomyItems([m71Item, { ...m71Item, conceptType: "skill", conceptId: "distinct" }]);
  assert.deepEqual(groups.map(g => g.type), ["skill", "knowledge"]);
  assert.equal(groups.flatMap(g => g.items).length, 2);
});
test("M7.1 historical null is readable; unknown versions, foreign tenant and missing origins fail closed", () => {
  assert.equal(readPositionTaxonomy(null, "org-fixture"), null);
  assert.deepEqual(readPositionTaxonomy(m71Fixture(), "org-fixture"), m71Fixture());
  for (const invalid of [
    m71Fixture({ contractVersion: "future" as never }), m71Fixture({ organizationId: "other" }),
    m71Fixture({ references: [{ ...m71Fixture().references[0]!, source: "Another" as never }] }),
    m71Fixture({ items: [{ ...m71Item, origins: [] }] }),
    m71Fixture({ complements: [{ ...m71Complement, organizationId: "other" }] }),
    m71Fixture({ state: "unresolved" }),
  ]) assert.throws(() => readPositionTaxonomy(invalid, "org-fixture"));
  assert.deepEqual(readTaxonomyItem(m71Item, "org-fixture"), m71Item);
  assert.throws(() => readTaxonomyItem({ ...m71Complement, organizationId: "other" }, "org-fixture"));
});
test("M7.1 unresolved and ambiguous states retain the text without fabricating a concept", () => {
  for (const state of ["unresolved", "ambiguous"] as const) {
    const value = m71Fixture({ state, concept: null, items: [], references: [] });
    assert.equal(readPositionTaxonomy(value, "org-fixture")?.state, state);
    assert.equal(applyTaxonomy({ ...emptyVacancyDraft(), title: value.originalTitle }, value).referenceConceptId, null);
  }
});
test("M7.1 SQL is additive, recomputes provenance and preserves authorization owners", async () => {
  const sql = await readFile("supabase/migrations/20260918010000_m71_position_taxonomy.sql", "utf8");
  assert.match(sql, /private\.has_org_role/); assert.match(sql, /private\.require_knowledge_admin/);
  assert.match(sql, /public\.save_vacancy_definition/); assert.match(sql, /POSITION_VERSION_CONFLICT/);
  assert.match(sql, /v_snapshot:=public\.preview_position_taxonomy/);
  assert.match(sql, /v\.import_status='published' and v\.is_current/);
  assert.doesNotMatch(sql, /create table|disable row level|grant .* to anon|insert into public\.people|update public\.professional_profiles/i);
  assert.doesNotMatch(sql, /target_level\s*=|criticality\s*=/);
  assert.equal(VACANCY_MATCHING_VERSION, "vacancy-matching-explainable-5.0.0");
});
test("M7.1 UI provides recovery, progressive provenance, human correction, shared responsive surfaces", async () => {
  const ui = await readFile("web/src/components/PositionTaxonomyPanel.tsx", "utf8");
  const page = await readFile("web/src/pages/VacancyPages.tsx", "utf8");
  const css = await readFile("web/src/styles.css", "utf8");
  for (const label of ["Por que o Prisma associou assim?", "Corrigir associação", "Desfazer associação", "Adicionar como obrigatório", "Adicionar como desejável", "Conhecimentos e habilidades relacionados", "Knowledge complementar da empresa", "Tentar novamente"]) assert.ok(ui.includes(label), label);
  assert.match(ui, /AbortController/); assert.match(ui, /setTimeout/); assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /positionTaxonomyService.history/); assert.match(css, /prisma-taxonomy-identity \{ grid-template-columns: 1fr;/);
  assert.doesNotMatch(page, /resolveOccupationV2\(|materializeVacancyFromProfessionalReference\(/);
  assert.match(page, /structureSource: null, sourceKind: "previous_vacancy", sourceVacancyId: id/);
  assert.doesNotMatch(ui, /fetch\(|openai|embedding|Lominger|Verificado|Declarado|Contextual/);
});
