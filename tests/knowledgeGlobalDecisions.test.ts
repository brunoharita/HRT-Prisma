import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const sql=readFileSync("supabase/migrations/20261016153000_knowledge_global_decisions_v2.sql","utf8");
const page=readFileSync("web/src/pages/KnowledgePage.tsx","utf8");
test("two decisions keep audit authority origin locks and history",()=>{
 assert.match(sql,/p_decision is distinct from 'deferred'/);
 assert.match(sql,/private\.require_knowledge_admin\(null\)/);
 assert.match(sql,/for update/);assert.match(sql,/status <> 'awaiting_human_review'/);
 assert.match(sql,/origin_organization_id is not null/);
 assert.match(sql,/optional_reason := nullif\(btrim\(p_reason\), ''\)/);
 assert.match(sql,/insert into public\.knowledge_approvals/);
 assert.doesNotMatch(sql,/delete from|update public\.knowledge_concepts|char_length/);
 assert.match(sql,/from public, anon/);
});
test("global UI removes rejection and reason gate while keeping classification",()=>{
 const global=page.slice(page.indexOf('</> : <><Input.TextArea value={proposalDecisionReasons[proposal.id]'));
 assert.match(global,/Justificativa \(opcional\)/);assert.match(global,/Aprovar na Base Global/);
 assert.match(global,/Manter somente local/);assert.doesNotMatch(global,/>Rejeitar<|trim\(\)\.length < 5/);
 assert.match(global,/validSubgroupChoice/);assert.match(global,/concept_type === "certification"/);
 assert.match(page,/rejected: "Rejeitado"/);assert.match(page,/deferred: "Mantido somente local"/);
});
