import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ui = readFileSync("web/src/components/profile/CompetencyCuration.tsx", "utf8");
const domain = readFileSync("web/src/domain/profileCompetencyCuration.ts", "utf8");
const service = readFileSync("web/src/infrastructure/supabase/knowledgeService.ts", "utf8");
const curationService = readFileSync("web/src/infrastructure/supabase/profileCompetencyCurationService.ts", "utf8");
const agent = readFileSync("supabase/functions/knowledge-agent/index.ts", "utf8");

test("M82 description suggestion remains an editable human-reviewed field", () => {
  assert.match(domain, /suggestDescription\(label: string\): Promise<string>/);
  assert.match(ui, /Sugerir com IA/);
  assert.match(ui, /Sugestão gerada por IA\. Revise o texto antes de gravar\./);
  assert.match(ui, /setDescription\(suggestion\)/);
  assert.match(ui, /onDirty\(true\)/);
  assert.match(curationService, /suggestConceptDescription\(organizationId, label\)/);
});

test("M82 routes only the competency name through the dedicated agent mode", () => {
  assert.match(service, /mode: "concept_description"/);
  assert.match(service, /contract: "concept-description-suggestion-request-1\.0\.0"/);
  assert.match(service, /competencyName/);
  assert.match(agent, /payload\?\.mode === "concept_description"/);
  assert.match(agent, /concept-description-suggestion-request-1\.0\.0/);
  const handler = agent.slice(agent.indexOf("async function handleConceptDescription"), agent.indexOf("async function callOpenAiForConceptDescription"));
  assert.doesNotMatch(handler, /knowledge_inbox|knowledge_proposals|web_search/);
  assert.match(handler, /requireDescriptionSuggestionAuthority/);
  assert.match(handler, /enforceBudgets/);
  const call = agent.slice(agent.indexOf("async function callOpenAiForConceptDescription"), agent.indexOf("function parseAndValidateConceptDescription"));
  assert.match(call, /store: false/);
  assert.doesNotMatch(call, /web_search/);
  assert.match(call, /conceptDescriptionSchema/);
});

test("M82 rejects malformed description output and normalizes it to one paragraph", () => {
  assert.match(agent, /answer\.definition\.replace/);
  assert.match(agent, /definition\.length > 2000/);
  assert.match(agent, /required: \["definition"\]/);
});
