import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260919040000_m77_company_knowledge_global_governance.sql", "utf8");
const reviewMigration = readFileSync("supabase/migrations/20260919041500_m77_global_contribution_review_actions.sql", "utf8");
const page = readFileSync("web/src/pages/KnowledgePage.tsx", "utf8");
const agent = readFileSync("supabase/functions/knowledge-agent/index.ts", "utf8");

test("M7.7 salva a empresa, cria contribuição global e preserva precedência", () => {
  assert.match(migration, /origin_organization_id uuid/);
  assert.match(migration, /origin_concept_id uuid/);
  assert.match(migration, /private\.m77_enqueue_global_contribution/);
  assert.match(migration, /'global', null, p_inbox\.organization_id, p_origin_concept_id/);
  assert.match(migration, /human_organization_concept/);
  assert.match(migration, /approve_knowledge_proposal/);
  assert.match(migration, /create policy knowledge_proposals_read[\s\S]*is_super_admin/);
  assert.match(agent, /contributionProposalId/);
  assert.match(agent, /requireGlobalContribution/);
});

test("M7.7 deixa a revisão global somente para Super Admin", () => {
  assert.doesNotMatch(page, /\{ key: "proposals", label: "Propostas", children: proposalsPanel\(\) \},\n    \{ key: "impacts"/);
  assert.match(page, /Salvar na Knowledge da empresa/);
  assert.match(page, /Criar proposta, sem publicar/);
});

test("M7.7 apresenta candidatos informativos e audita decisões sem publicação", () => {
  assert.match(reviewMigration, /candidate_concepts/);
  assert.match(reviewMigration, /decide_knowledge_global_contribution/);
  assert.match(reviewMigration, /p_decision not in \('rejected', 'deferred'\)/);
  assert.match(page, /Candidatos globais para análise/);
  assert.match(page, /Manter somente local/);
  assert.match(page, /Contribuição global rejeitada; origem local preservada/);
});
