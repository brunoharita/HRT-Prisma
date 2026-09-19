import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260919164100_m77_legacy_company_proposal_transition.sql", "utf8");
const service = readFileSync("web/src/infrastructure/supabase/knowledgeService.ts", "utf8");
const page = readFileSync("web/src/pages/KnowledgePage.tsx", "utf8");

test("transição legada exige Super Admin real, empresa e motivo antes de qualquer escrita", () => {
  assert.match(migration, /v_actor_id := private\.require_knowledge_admin\(null\)/);
  assert.match(migration, /v_proposal\.organization_id is distinct from p_organization_id/);
  assert.match(migration, /v_proposal\.status <> 'awaiting_human_review'/);
  assert.match(migration, /v_proposal\.human_edited_proposal is not null/);
  assert.match(migration, /v_inbox\.organization_id is distinct from p_organization_id/);
  assert.match(migration, /human decision reason is required/);
  assert.doesNotMatch(migration, /request\.jwt\.claim|set_config\('request\./);
  assert.match(migration, /revoke all on function public\.transition_legacy_knowledge_proposal\(uuid, uuid, text\) from public, anon/);
});

test("aprovação local e enfileiramento Global compartilham a transação e preservam retry", () => {
  assert.match(migration, /distinct on \(private\.normalize_knowledge_term\(alias_item\.value\)\)/);
  assert.match(migration, /private\.normalize_knowledge_term\(alias_value\) <> private\.normalize_knowledge_term\(canonical_label\)/);
  assert.match(migration, /public\.approve_knowledge_proposal\(p_proposal_id, null, p_reason\)/);
  assert.match(migration, /private\.m77_enqueue_global_contribution\(/);
  assert.match(migration, /item\.status = 'awaiting_human_review' and item\.published_concept_id is null/);
  assert.match(migration, /return query select v_proposal\.id, v_proposal\.published_concept_id, v_global_proposal_id, true/);
  assert.match(migration, /approved organization term already exists/);
  assert.doesNotMatch(migration, /approve_knowledge_proposal\(v_global_proposal_id/);
});

test("a interface distingue recuperação local de decisão Global", () => {
  assert.match(service, /transition_legacy_knowledge_proposal/);
  assert.match(page, /proposal\.scope === "organization" \? <>/);
  assert.match(page, /Motivo da transição da proposta legada/);
  assert.match(page, /Aprovar na empresa e enviar à revisão Global/);
  assert.match(page, /proposal\.organizationId !== organizationId/);
  assert.match(page, /awaiting_human_review: "Pendente de revisão"/);
});
