import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { applySemanticAssessment, isSemanticDiscoveryEligible, isSemanticTriageEligible, semanticTriageDisposition, unavailableSemantic } from "../web/src/domain/semanticMatching.js";
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
    profileId: id, profileVersion: 1, profileData: profile, knowledge: [], location: null, publishedAt: "" },
  { conceptId: "software", canonicalLabel: "Desenvolvedor de sistemas de tecnologia da informação", aliases: ["Programador de sistemas", "Desenvolvedor de software"], relations: [] });
}
const a = match("a", "Desenvolvedor backend"), b = match("b", "Programador de sistemas", [], ["Tecnologia"]),
  c = match("c", "Vendedor", ["Node.js"]), outside = match("outside", "Vendedor");

test("discovery remains broad while only unresolved occupational relations reach AI", () => {
  assert.equal(a.discoveryGroup, "main_area"); assert.equal(b.discoveryGroup, "related_area");
  assert.equal(c.discoveryGroup, "contextual_signals");
  assert.deepEqual([a, b, c, outside].map(isSemanticDiscoveryEligible), [true, true, true, true]);
  assert.deepEqual([a, b, c, outside].map(isSemanticTriageEligible), [true, true, false, false]);
  assert.deepEqual([a, b, c, outside].map(semanticTriageDisposition), ["needs_interpretation", "needs_interpretation", "contextual_only", "contextual_only"]);
  assert.equal(isSemanticTriageEligible({ ...b, score: { ...b.score, score: 0 } }), true);
  assert.equal(isSemanticTriageEligible({ ...c, positionDecision: "dismissed" }), false);
  assert.equal(isSemanticTriageEligible({ ...b, discoveryGroup: "contextual_signals" }), true);
  assert.equal(semanticTriageDisposition({ ...b, positionRelation: { ...b.positionRelation, status: "same_reference" } }), "resolved_internal");
  assert.equal(semanticTriageDisposition({ ...b, positionDecision: "confirmed" }), "resolved_internal");
});

// Execute the production orchestration declaration with injected infrastructure, not a second implementation.
const source = readFileSync("web/src/infrastructure/supabase/vacancyService.ts", "utf8");
const ast = ts.createSourceFile("service.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "interpretMatches");
assert.ok(declaration);
const compiled = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function orchestrator(calls: string[]) {
  return new Function("isSemanticTriageEligible", "applySemanticAssessment", "unavailableSemantic", "supabase", `${compiled}; return interpretMatches;`)(
    isSemanticTriageEligible, applySemanticAssessment, unavailableSemantic,
    { functions: { invoke: async (_name: string, options: { body: { profileId: string } }) => {
      calls.push(options.body.profileId); return { data: null, error: { message: "synthetic unavailable" } };
    } } },
  );
}
test("production batch sends only plausible unresolved relations and counts progress", async () => {
  const calls: string[] = [], progress: number[][] = [], updates: string[] = [];
  const results = await orchestrator(calls)(vacancy, [a, b, c, outside], (done: number, total: number) => progress.push([done, total]), undefined,
    (updated: typeof a) => updates.push(updated.candidate.personId));
  assert.deepEqual(calls.sort(), ["a", "b"]);
  assert.deepEqual(progress, [[0, 2], [1, 2], [2, 2]]);
  assert.deepEqual(updates.sort(), ["a", "b"]);
  for (const [index, result] of results.entries()) {
    const { semanticFallback, ...priorResult } = result;
    assert.equal(Boolean(semanticFallback), index < 2);
    assert.deepEqual(priorResult, [a, b, c, outside][index]);
  }
  assert.deepEqual(results.map((m: typeof a) => m.candidate.personId), ["a", "b", "c", "outside"]);
});
test("dismissed, contextual and internally resolved profiles never call AI", async () => {
  const calls: string[] = [];
  const original = [a, b, c];
  const interpreted = await orchestrator(calls)(vacancy, [{ ...a, positionDecision: "dismissed" },
    { ...b, positionRelation: { ...b.positionRelation, status: "related_reference" } }, c]);
  assert.deepEqual(calls, []);
  const attempted = await orchestrator(calls)({ ...vacancy, title: "Gerente de projetos" }, original);
  assert.deepEqual(calls, ["a", "b"]);
  assert.equal(interpreted.every((item: typeof a) => !item.semanticFallback && !item.semanticAssessment), true);
  assert.equal(attempted[2].semanticFallback, undefined);
});

test("profiles without usable professional content are excluded before interpretation", () => {
  const empty = structuredClone(a);
  empty.candidate.profileData = {
    ...empty.candidate.profileData,
    professionalTitle: null, summary: null, professionalObjective: null, areasOfExpertise: [], keyResults: [], experiences: [],
  };
  assert.equal(isSemanticDiscoveryEligible(empty), false);
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
test("discovery exposes saved results only after stable server resolution", async () => {
  const variable = ast.statements.find((item) => ts.isVariableStatement(item) && item.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === "vacancyService"));
  assert.ok(variable && ts.isVariableStatement(variable));
  const object = variable.declarationList.declarations[0]?.initializer;
  assert.ok(object && ts.isObjectLiteralExpression(object));
  const method = object.properties.find((item) => ts.isMethodDeclaration(item) && item.name.getText(ast) === "findPeople");
  assert.ok(method);
  const code = ts.transpileModule(`const service = { ${method.getText(ast)} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let finish!: (matches: typeof a[]) => void;
  const delayed = new Promise<typeof a[]>((resolve) => { finish = resolve; });
  const findPeople = new Function("loadPublishedProfileCandidateCollection", "hasUsableProfessionalContent", "sortVacancyMatches", "loadStableCandidates", `${code}; return service.findPeople;`)(
    async () => ({ candidates: [a.candidate, b.candidate], analyzedProfileCount: 2, publishedProfileCount: 2, complete: true }),
    () => true, (matches: typeof a[]) => matches, async () => delayed);
  let initial: unknown;
  const operation = findPeople("org", vacancy, true, undefined, undefined, (value: unknown) => { initial = value; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual((initial as {matches: unknown[]}).matches, [], "initial disclosure has no transient pre-AI score");
  finish([a, b]);
  assert.deepEqual((await operation).matches, [a, b]);
  assert.ok(initial);
});

test("100 synthetic profiles pass internal triage while only ambiguous occupations consume AI", async () => {
  const start = performance.now();
  const profiles = Array.from({ length: 100 }, (_, index) => index < 8
    ? match(`plausible-${index}`, "Programador de sistemas")
    : index < 20
      ? { ...match(`internal-${index}`, "Desenvolvedor backend"), positionRelation: { ...a.positionRelation, status: "same_reference" as const } }
      : match(`context-${index}`, "Vendedor de tecnologia", ["Node.js"]));
  const internalElapsedMs = performance.now() - start;
  assert.ok(internalElapsedMs < 5000, `synthetic internal 100-profile pass took ${internalElapsedMs.toFixed(0)} ms`);
  const calls: string[] = [], progress: number[][] = [];
  const results = await orchestrator(calls)(vacancy, profiles, (done: number, total: number) => progress.push([done, total]));
  assert.equal(results.length, 100);
  assert.equal(calls.length, 8);
  assert.deepEqual(progress[0], [0, 8]);
  assert.deepEqual(progress.at(-1), [8, 8]);
  assert.equal(results.filter((item: typeof a) => item.semanticFallback).length, 8);
});

test("seven contrasted career tracks route programming and historical development but not adjacent business domains", () => {
  const tracks = [
    match("software-history", "Desenvolvedor de software"),
    match("systems-programming", "Programador de sistemas"),
    match("marketing", "Assistente de Marketing & Business Development"),
    match("content", "Produtor de conteúdo audiovisual"),
    match("tech-sales", "Consultor comercial de tecnologia", ["Node.js"]),
    match("customer-success", "Customer Success"),
    match("logistics", "Operador de logística"),
  ];
  assert.deepEqual(tracks.map(isSemanticDiscoveryEligible), [true, true, true, true, true, true, true]);
  assert.deepEqual(tracks.map(isSemanticTriageEligible), [true, true, false, false, false, false, false]);
});
