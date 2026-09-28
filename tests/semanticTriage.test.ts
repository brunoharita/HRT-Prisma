import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { isSemanticPilot } from "../src/domain/semanticTrajectory.js";
import { applySemanticAssessment, isSemanticTriageEligible, unavailableSemantic } from "../web/src/domain/semanticMatching.js";
import { assessVacancySeniority, emptyVacancyDraft, matchVacancyCandidate, newVacancyRequirement, type VacancyDetail } from "../web/src/domain/vacancy.js";
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

test("universal triage admits every published profile with usable professional content", () => {
  assert.equal(a.discoveryGroup, "main_area"); assert.equal(b.discoveryGroup, "related_area");
  assert.equal(c.discoveryGroup, "contextual_signals");
  assert.deepEqual([a, b, c, outside].map(isSemanticTriageEligible), [true, true, true, true]);
  assert.equal(isSemanticTriageEligible({ ...b, score: { ...b.score, score: 0 } }), true);
  assert.equal(isSemanticTriageEligible({ ...c, positionDecision: "dismissed" }), false);
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
test("production batch calls every usable profile and counts eligible progress", async () => {
  const calls: string[] = [], progress: number[][] = [];
  const results = await orchestrator(calls)(vacancy, [a, b, c, outside], (done: number, total: number) => progress.push([done, total]));
  assert.deepEqual(calls.sort(), ["a", "b", "c", "outside"]);
  assert.deepEqual(progress, [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]]);
  for (const [index, result] of results.entries()) {
    const { semanticFallback, ...priorResult } = result;
    assert.equal(semanticFallback?.status, "unavailable");
    assert.deepEqual(priorResult, [a, b, c, outside][index]);
  }
  assert.deepEqual(results.map((m: typeof a) => m.candidate.personId), ["a", "b", "c", "outside"]);
});
test("dismissed profiles and empty positions never call AI", async () => {
  const calls: string[] = [];
  await orchestrator(calls)(vacancy, [{ ...c, positionDecision: "dismissed" }]);
  const original = [a, b];
  const interpreted = await orchestrator(calls)({ ...vacancy, title: "Gerente de projetos" }, original);
  assert.deepEqual(calls, ["a", "b"]);
  assert.equal(interpreted.every((item: typeof a) => item.semanticFallback?.status === "unavailable" && !item.semanticAssessment), true);
});

test("profiles without usable professional content are excluded before interpretation", () => {
  const empty = structuredClone(a);
  empty.candidate.profileData = {
    ...empty.candidate.profileData,
    professionalTitle: null, summary: null, professionalObjective: null, areasOfExpertise: [], keyResults: [], experiences: [],
  };
  assert.equal(isSemanticTriageEligible(empty), false);
});

test("a Marketing profile stays in its original group when AI returns an invalid response", () => {
  const marketingVacancy = { ...vacancy, title: "Analista de Marketing", area: "Marketing", requirements: [] };
  const candidate = structuredClone(a.candidate);
  candidate.profileData.experiences = [{ ...candidate.profileData.experiences[0]!, role: "Assistente de Marketing & Business Development",
    description: "Planejamento de campanhas de marketing, geração de demanda e pesquisa de mercado." }];
  const baseline = matchVacancyCandidate(marketingVacancy, candidate);
  assert.equal(baseline.discoveryGroup, "main_area");
  const result = applySemanticAssessment(marketingVacancy, baseline, { ...unavailableSemantic(marketingVacancy, baseline),
    modelVersion: "synthetic-model", inputHash: "synthetic-hash", analysisId: "synthetic-id", reasonCode: "RESPONSE_INVALID" });
  const { semanticFallback, ...restored } = result;
  assert.equal(semanticFallback?.reasonCode, "RESPONSE_INVALID");
  assert.deepEqual(restored, baseline);
});

test("seniority penalty is symmetric and only uses explicit level markers", () => {
  assert.equal(assessVacancySeniority("Gerente de operações", "Diretor de operações", 20).adjustment, -1);
  assert.equal(assessVacancySeniority("Diretor de operações", "Gerente de operações", 20).adjustment, -1);
  assert.equal(assessVacancySeniority("Júnior de operações", "Diretor de operações", 20).adjustment, -4);
  assert.equal(assessVacancySeniority("Diretor de operações", "Júnior de operações", 20).adjustment, -4);
  assert.equal(assessVacancySeniority("Desenvolvedor de operações", "Programador de operações", 20).adjustment, 0);
});
test("discovery and direct comparison filter only profiles without usable content before orchestration", () => {
  assert.match(source, /interpretMatches\(vacancy, baseMatches\.filter\(match => isSemanticTriageEligible\(match\)\)/);
  assert.match(source, /interpretMatches\(vacancy, matches\.filter\(match => isSemanticTriageEligible\(match\)\)/);
});
