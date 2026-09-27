import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { isSemanticPilot } from "../src/domain/semanticTrajectory.js";
import { applySemanticAssessment, isSemanticTriageEligible, unavailableSemantic } from "../web/src/domain/semanticMatching.js";
import { emptyVacancyDraft, isVacancyDiscoveryCandidate, matchVacancyCandidate, newVacancyRequirement, type VacancyDetail } from "../web/src/domain/vacancy.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

const vacancy: VacancyDetail = { ...emptyVacancyDraft(), id: "v", versionId: "v1", version: 1, organizationId: "org",
  title: "Desenvolvedor backend", area: "Tecnologia", createdAt: "", updatedAt: "", jobRoleName: "", occupantName: null,
  requirements: [{ ...newVacancyRequirement("Node.js", "technology"), importance: "required" }] };
function match(id: string, role: string, competencies: string[] = [], areasOfExpertise: string[] = []) {
  const profile: StructuredDraft = { identity: { fullName: "Synthetic" }, contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: null, summary: null, professionalObjective: null, keyResults: [], areasOfExpertise,
    experiences: [{ id: "experience", role, description: null, organization: null, period: null, evidenceText: "", page: null, source: "human" }],
    education: [], competencies, languages: [], certifications: [], customSections: [], uncertainties: [], notIdentified: [] };
  return matchVacancyCandidate(vacancy, { personId: id, fullName: "Synthetic", lifecycle: "candidate", operationalStatus: "active",
    profileId: id, profileVersion: 1, profileData: profile, knowledge: [], location: null, publishedAt: "" });
}
const a = match("a", "Desenvolvedor backend"), b = match("b", "Programador de sistemas", [], ["Tecnologia"]),
  c = match("c", "Vendedor", ["Node.js"]), outside = match("outside", "Vendedor");

test("legacy triage admits A and B, keeps C contextual, excludes no relation without score thresholds", () => {
  assert.equal(a.discoveryGroup, "main_area"); assert.equal(b.discoveryGroup, "related_area");
  assert.equal(c.discoveryGroup, "contextual_signals"); assert.equal(isVacancyDiscoveryCandidate(c), true);
  assert.equal(isVacancyDiscoveryCandidate(outside), false);
  assert.deepEqual([a, b, c, outside].map(isSemanticTriageEligible), [true, true, false, false]);
  assert.equal(isSemanticTriageEligible({ ...b, score: { ...b.score, score: 0 } }), true);
  assert.equal(isSemanticTriageEligible({ ...c, positionDecision: "confirmed" }), false);
});

// Execute the production orchestration declaration with injected infrastructure, not a second implementation.
const source = readFileSync("web/src/infrastructure/supabase/vacancyService.ts", "utf8");
const ast = ts.createSourceFile("service.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "interpretMatches");
assert.ok(declaration);
const compiled = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function orchestrator(calls: string[]) {
  return new Function("isSemanticPilot", "isSemanticTriageEligible", "applySemanticAssessment", "unavailableSemantic", "supabase", `${compiled}; return interpretMatches;`)(
    isSemanticPilot, isSemanticTriageEligible, applySemanticAssessment, unavailableSemantic,
    { functions: { invoke: async (_name: string, options: { body: { profileId: string } }) => {
      calls.push(options.body.profileId); return { data: null, error: { message: "synthetic unavailable" } };
    } } },
  );
}
test("production batch calls only A/B, preserves C/outside untouched and counts eligible progress", async () => {
  const calls: string[] = [], progress: number[][] = [];
  const results = await orchestrator(calls)(vacancy, [a, b, c, outside], (done: number, total: number) => progress.push([done, total]));
  assert.deepEqual(calls.sort(), ["a", "b"]);
  assert.deepEqual(progress, [[0, 2], [1, 2], [2, 2]]);
  assert.equal(results[2], c); assert.equal(results[3], outside);
  assert.equal(results[0].semanticAssessment.status, "unavailable");
  assert.equal(results[1].semanticAssessment.status, "unavailable");
  assert.equal(results[2].semanticAssessment, undefined); assert.equal(results[3].semanticAssessment, undefined);
  assert.deepEqual(results.filter((m: typeof a) => m.semanticAssessment || isVacancyDiscoveryCandidate(m)).map((m: typeof a) => m.candidate.personId), ["a", "b", "c"]);
});
test("empty eligible set and positions outside the pilot never call AI", async () => {
  const calls: string[] = [];
  await orchestrator(calls)(vacancy, [c, outside]);
  const original = [a, b];
  assert.equal(await orchestrator(calls)({ ...vacancy, title: "Gerente de projetos" }, original), original);
  assert.deepEqual(calls, []);
});
test("discovery and direct comparison both filter legacy discovery before orchestration", () => {
  assert.match(source, /interpretMatches\(vacancy, baseMatches\.filter\(isVacancyDiscoveryCandidate\)/);
  assert.match(source, /interpretMatches\(vacancy, matches\.filter\(isVacancyDiscoveryCandidate\)/);
});
