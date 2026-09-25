import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  activities, agreeTrajectoryReadings, isSemanticPilot, prepareTrajectoryContext, readTrajectoryResponse,
  trajectoryResponseSchema, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, SEMANTIC_MATCHING_VERSION, SEMANTIC_SCORE_VERSION,
  type SemanticAssessment, type SemanticContext, type SemanticReading,
} from "../src/domain/semanticTrajectory.js";
import {
  semanticPilotCases, semanticPilotExpectations, semanticPilotLimitation, semanticPilotPosition,
  type SemanticPilotCase,
} from "../src/fixtures/semanticTrajectoryPilot.js";
import { applySemanticAssessment, unavailableSemantic, semanticComparisonPending } from "../web/src/domain/semanticMatching.js";
import { calculateMatchingScore, type MatchingScoreInput } from "../web/src/domain/matchingScore.js";
import {
  emptyVacancyDraft, matchVacancyCandidate, newVacancyRequirement, sortVacancyMatches,
  type VacancyDetail, type VacancyCandidateMatch,
} from "../web/src/domain/vacancy.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";

const runner = await import(pathToFileURL(resolve("scripts/evaluate-semantic-trajectory.mjs")).href);
const prepared = (item: SemanticPilotCase) => prepareTrajectoryContext(item.profile, semanticPilotPosition);
function fixture(baseId: string, variant: SemanticPilotCase["variant"] = "plain"): SemanticPilotCase {
  const item = semanticPilotCases.find(row => row.baseId === baseId && row.variant === variant);
  assert.ok(item);
  return item;
}
function oracleReading(item: SemanticPilotCase, context = prepared(item)): SemanticReading {
  return { items: context.entries.map(entry => ({
    id: entry.id, activity: semanticPilotExpectations[item.baseId]!.classes[entry.id]!, quote: entry.text,
  })) };
}
function providerBody(reading: SemanticReading) {
  return { status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(reading) }] }] };
}

test("M8.3 pilot has 12 contrasted bases, five realizations each and 120 later calls/model", () => {
  assert.equal(semanticPilotCases.length, 60);
  assert.equal(new Set(semanticPilotCases.map(item => item.id)).size, 60);
  assert.equal(Object.keys(semanticPilotExpectations).length, 12);
  for (const baseId of Object.keys(semanticPilotExpectations)) {
    const variants = semanticPilotCases.filter(item => item.baseId === baseId);
    assert.equal(variants.length, 5);
    assert.equal(new Set(variants.map(item => item.variant)).size, 5);
    assert.ok(semanticPilotExpectations[baseId]!.grounding.length > 20);
    for (const item of variants) {
      const context = prepared(item);
      assert.deepEqual(context.entries.map(entry => entry.id).sort(), Object.keys(semanticPilotExpectations[baseId]!.classes).sort(), item.id);
      assert.doesNotThrow(() => readTrajectoryResponse(oracleReading(item), context), item.id);
      assert.deepEqual(Object.keys(item).sort(), ["baseId", "id", "profile", "variant"]);
    }
  }
  assert.equal(semanticPilotCases.length * 2, 120);
  assert.match(semanticPilotLimitation, /not an independent holdout/i);
});

test("pilot activation stays narrow and does not turn management, internships or other occupations into backend", () => {
  for (const title of ["Desenvolvedor backend", "Backend developer", "Engenheira back-end"]) assert.equal(isSemanticPilot(title), true, title);
  for (const title of ["Diretor de backend", "Gerente desenvolvedor backend", "Estágio desenvolvedor backend", "Analista de Sistemas", "Desenvolvedor frontend", ""]) assert.equal(isSemanticPilot(title), false, title);
});

test("response schema is closed, finite and has no score or free explanation", () => {
  assert.equal(trajectoryResponseSchema.additionalProperties, false);
  assert.deepEqual(trajectoryResponseSchema.required, ["items"]);
  assert.deepEqual(Object.keys(trajectoryResponseSchema.properties), ["items"]);
  const row = trajectoryResponseSchema.properties.items.items;
  assert.equal(row.additionalProperties, false);
  assert.deepEqual(row.required, ["id", "activity", "quote"]);
  assert.deepEqual(Object.keys(row.properties).sort(), ["activity", "id", "quote"]);
  assert.deepEqual(row.properties.activity.enum, [...activities]);
});

test("response accepts each source once in any order and only an exact quote from its own source", () => {
  const item = fixture("historic_programmer");
  const context = prepared(item);
  const reading = oracleReading(item);
  assert.deepEqual(readTrajectoryResponse({ items: [...reading.items].reverse() }, context), reading);
  const first = reading.items[0]!;
  const second = reading.items[1]!;
  const invalid: unknown[] = [
    null, [], "refused", {}, { items: null }, { refusal: "no" },
    { ...reading, score: 100 }, { ...reading, explanation: "free text" },
    { items: [] }, { items: [first] }, { items: [first, first] }, { items: [...reading.items, second] },
    { items: [{ ...first, id: "unknown" }, second] }, { items: [{ ...first, id: 0 }, second] },
    { items: [{ ...first, activity: "expert" }, second] }, { items: [{ ...first, activity: 20 }, second] },
    { items: [{ ...first, quote: "invented evidence" }, second] },
    { items: [{ ...first, quote: second.quote }, second] },
    { items: [{ ...first, quote: first.quote.toUpperCase() }, second] },
    { items: [{ ...first, quote: "" }, second] }, { items: [{ ...first, quote: 123 }, second] },
    { items: [{ ...first, quote: "a".repeat(4001) }, second] },
    { items: [{ id: first.id, activity: first.activity }, second] },
    { items: [{ ...first, score: 20 }, second] }, { items: [null, second] },
  ];
  for (const [index, value] of invalid.entries()) assert.throws(() => readTrajectoryResponse(value, context), /TRAJECTORY_RESPONSE_INVALID/, `invalid-${index}`);
  const ambiguous = prepared(fixture("ambiguous"));
  assert.deepEqual(readTrajectoryResponse({ items: [{ id: "e0", activity: "unclear", quote: "" }] }, ambiguous).items[0]?.activity, "unclear");
  assert.deepEqual(readTrajectoryResponse({ items: [] }, prepared(fixture("empty"))), { items: [] });
});

test("independent agreement ignores quote choice and order, not category or source coverage", () => {
  const item = fixture("historic_programmer"), first = oracleReading(item);
  const second = structuredClone(first);
  second.items[0]!.quote = "Diretor de tecnologia";
  second.items.reverse();
  assert.equal(agreeTrajectoryReadings(first, readTrajectoryResponse(second, prepared(item))), true);
  second.items[0]!.activity = "backend_execution";
  assert.equal(agreeTrajectoryReadings(first, second), false);
  assert.equal(agreeTrajectoryReadings(first, { items: [first.items[0]!] }), false);
});

test("shared preparation omits identity, contacts, employers, schools, dates and prestige metadata", () => {
  for (const baseId of Object.keys(semanticPilotExpectations)) {
    assert.deepEqual(prepared(fixture(baseId, "excluded_metadata")), prepared(fixture(baseId)), baseId);
    assert.doesNotMatch(JSON.stringify(prepared(fixture(baseId, "excluded_metadata"))), /SYNTHETIC_|example\.invalid|1980|1985|1995|2001|2004|2023/);
  }
  const context = prepareTrajectoryContext({
    identity: { fullName: "SYNTHETIC_PERSON" },
    education: [{ institution: "SYNTHETIC_SCHOOL" }],
    experiences: [{ role: "Programador", organization: "SYNTHETIC_COMPANY", period: "1990 - 2000", description: "SYNTHETIC_PERSON programou para SYNTHETIC_COMPANY. SYNTHETIC_SCHOOL. synthetic@example.invalid https://example.invalid +00 000 000 0000\nReligião: SYNTHETIC_SENSITIVE\nProgramei relatórios ABAP." }],
  }, { title: "Desenvolvedor backend", mission: "SYNTHETIC_PERSON SYNTHETIC_COMPANY SYNTHETIC_SCHOOL", responsibilities: ["EXTRA_REDACTION implementou serviços."] }, ["EXTRA_REDACTION"]);
  assert.doesNotMatch(JSON.stringify(context), /SYNTHETIC_|EXTRA_REDACTION|example\.invalid|1990|2000|000 000/);
  assert.match(context.entries[0]!.text, /Programei relatórios ABAP/);
  assert.deepEqual(Object.keys(context).sort(), ["entries", "position"]);
  assert.deepEqual(Object.keys(context.entries[0]!).sort(), ["fieldPath", "id", "kind", "text"]);
});

test("shared preparation removes dates inside free text, preserving the work evidence", () => {
  const context = prepareTrajectoryContext({ experiences: [{ role: "Programador", description: "Em 2004 programei relatórios ABAP. Em 25/09/2020 implementei APIs." }] }, semanticPilotPosition);
  assert.doesNotMatch(context.entries[0]!.text, /2004|2020|25\/09/);
  assert.match(context.entries[0]!.text, /programei relatórios ABAP/);
  assert.match(context.entries[0]!.text, /implementei APIs/);
});

test("sanitization must not silently erase work evidence sharing a line with a sensitive attribute", () => {
  const context = prepareTrajectoryContext({ experiences: [{ role: "Programador", description: "Idade: 71; implementei pessoalmente APIs de servidor." }] }, semanticPilotPosition);
  assert.match(context.entries[0]!.text, /implementei pessoalmente APIs de servidor/);
  assert.doesNotMatch(context.entries[0]!.text, /Idade|\b71\b/i);
});

test("input limits reject whole input rather than silently truncating sources or text", () => {
  const within = "a".repeat(3990) + "END_MARKER";
  assert.equal(prepareTrajectoryContext({ experiences: [{ description: within }] }, semanticPilotPosition).entries[0]!.text, within);
  const contexts = [
    [{ experiences: [{ description: `${within}x` }] }, semanticPilotPosition],
    [{}, { title: "b".repeat(6001) }],
    [{ experiences: Array.from({ length: 61 }, () => ({ role: "Programador" })) }, semanticPilotPosition],
    [{ experiences: Array.from({ length: 7 }, () => ({ description: "a".repeat(3900) })) }, semanticPilotPosition],
  ] as const;
  for (const [profile, position] of contexts) assert.throws(() => prepareTrajectoryContext(profile, position), /TRAJECTORY_INPUT_LIMIT/);
  assert.equal(prepareTrajectoryContext({ experiences: Array.from({ length: 60 }, () => ({ role: "Programador" })) }, semanticPilotPosition).entries.length, 60);
  assert.equal(prepareTrajectoryContext({}, { title: "b".repeat(6000) }).position.length, 6000);
});

function profileFor(item: SemanticPilotCase): StructuredDraft {
  return {
    identity: { fullName: "SYNTHETIC_PERSON" }, contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: item.profile.professionalTitle ?? null, areasOfExpertise: item.profile.areasOfExpertise ?? [],
    professionalObjective: null, summary: null, keyResults: [],
    experiences: (item.profile.experiences ?? []).map((entry, index) => ({ id: `exp-${index}`, source: "human", role: entry.role, description: entry.description, organization: "SYNTHETIC_COMPANY", period: entry.period ?? null, evidenceText: entry.description, page: 1 })),
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
}
function vacancy(): VacancyDetail {
  return {
    ...emptyVacancyDraft(), ...semanticPilotPosition, id: "vacancy-synthetic", organizationId: "org-synthetic", versionId: "position-v1", version: 1,
    area: "Desenvolvimento de software", jobRoleName: "Desenvolvedor backend", occupantName: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    requirements: [
      { ...newVacancyRequirement("Node.js", "technology"), stableId: "req-node", importance: "required", importanceConfirmed: true },
      { ...newVacancyRequirement("Git", "technology"), stableId: "req-git", importance: "desired", importanceConfirmed: true },
    ],
  };
}
function setup(item = fixture("backend"), candidateId = "candidate-synthetic") {
  const need = vacancy();
  const person: PublishedProfileCandidate = {
    personId: candidateId, fullName: "SYNTHETIC_PERSON", lifecycle: "candidate", operationalStatus: "active", location: null,
    profileId: `profile-${candidateId}`, profileVersion: 1, publishedAt: "2026-01-01T00:00:00Z", profileData: profileFor(item), knowledge: [],
  };
  const legacy = matchVacancyCandidate(need, person);
  const context = prepareTrajectoryContext(person.profileData, need);
  const assessment: SemanticAssessment = {
    status: "complete", organizationId: need.organizationId, profileId: person.profileId, positionVersionId: need.versionId,
    methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION, modelVersion: "synthetic-model",
    inputHash: "synthetic-input-hash", analysisId: "synthetic-analysis", context, reading: oracleReading(item, context),
  };
  return { need, person, legacy, assessment };
}
function inputFor(match: VacancyCandidateMatch): MatchingScoreInput {
  return {
    areaApplicable: true, functionApplicable: true, areaRelation: match.areaRelation, functionAssessment: match.functionAssessment,
    requirements: match.requirements, unclassifiedRequirementCount: match.unclassifiedRequirementCount, competitiveEligibility: "eligible",
    positionVersion: match.score.positionVersion, positionVersionNumber: match.score.positionVersionNumber,
    profileVersion: match.score.profileVersion, profileVersionNumber: match.score.profileVersionNumber,
    matchingContractVersion: SEMANTIC_MATCHING_VERSION, scoreContractVersion: SEMANTIC_SCORE_VERSION, interpretationReference: "synthetic-analysis",
  };
}

for (const item of semanticPilotCases) {
  test(`rubric integration preserves grounded classes: ${item.id}`, () => {
    const { need, legacy, assessment } = setup(item);
    const before = structuredClone({ need, legacy, assessment });
    const actual = applySemanticAssessment(need, legacy, assessment);
    const expected = semanticPilotExpectations[item.baseId]!;
    if (expected.functionPoints !== null) assert.equal(actual.functionAssessment.basePoints, expected.functionPoints);
    if (expected.group !== null) assert.equal(actual.discoveryGroup, { A: "main_area", B: "related_area", C: "contextual_signals" }[expected.group]);
    if (expected.functionPoints === null || expected.group === "C") assert.equal(actual.score.score, null);
    if (expected.functionPoints && expected.functionPoints > 0) assert.equal(actual.score.dimensions.find(row => row.key === "area")?.earnedPoints, 30);
    assert.equal(actual.functionAssessment.seniorityAdjustment, 0);
    assert.equal(actual.functionAssessment.seniorityRelation, "not_available");
    assert.deepEqual(actual.requirements, legacy.requirements);
    assert.deepEqual(actual.score.dimensions.filter(row => ["required", "desired"].includes(row.key)), legacy.score.dimensions.filter(row => ["required", "desired"].includes(row.key)));
    if (expected.functionPoints === null) {
      assert.equal(semanticComparisonPending([actual]), true);
      assert.deepEqual(actual.score.dimensions.map(row => row.applicablePoints), [35, 15]);
    } else assert.deepEqual(actual.score.dimensions.map(row => row.applicablePoints), [30, 20, 35, 15]);
    assert.deepEqual({ need, legacy, assessment }, before);
  });
}

test("systems analyst earns 12, ABAP does not invent Node.js or backend eligibility", () => {
  const analyst = setup(fixture("systems_analyst"));
  assert.equal(applySemanticAssessment(analyst.need, analyst.legacy, analyst.assessment).functionAssessment.basePoints, 12);
  const abap = setup(fixture("abap"));
  const actual = applySemanticAssessment(abap.need, abap.legacy, abap.assessment);
  assert.equal(actual.functionAssessment.basePoints, 17);
  assert.equal(actual.discoveryGroup, "related_area");
  assert.equal(actual.requirements.find(row => row.requirement.label === "Node.js")?.status, "no_evidence");
  assert.equal(actual.score.dimensions.find(row => row.key === "required")?.earnedPoints, 0);
  assert.doesNotMatch(JSON.stringify(actual.functionAssessment.evidence), /Node\.js/);
});

test("historical programming survives current leadership and permits an evidence-grounded tie", () => {
  const first = setup(fixture("historic_programmer"), "synthetic-a");
  const second = setup(fixture("abap"), "synthetic-b");
  const historical = applySemanticAssessment(first.need, first.legacy, first.assessment);
  const current = applySemanticAssessment(second.need, second.legacy, second.assessment);
  assert.equal(historical.functionAssessment.basePoints, 17);
  assert.equal(historical.functionAssessment.evidence[0]?.fieldPath, "experiences.exp-1");
  assert.equal(historical.score.score, current.score.score);
  assert.equal(historical.discoveryGroup, current.discoveryGroup);
  const reversed = structuredClone(first.assessment);
  reversed.context!.entries.reverse(); reversed.reading!.items.reverse();
  assert.equal(applySemanticAssessment(first.need, first.legacy, reversed).score.score, historical.score.score);
});

test("two different histories with proven backend execution may tie without a person preference", () => {
  const first = setup(fixture("historic_programmer"), "synthetic-a");
  const second = setup(fixture("hands_on_lead"), "synthetic-b");
  const history = first.person.profileData as StructuredDraft;
  history.experiences[1]!.role = "Desenvolvedor backend";
  history.experiences[1]!.description = "Implementei pessoalmente APIs de servidor em Node.js.";
  first.legacy = matchVacancyCandidate(first.need, first.person);
  first.assessment.context = prepareTrajectoryContext(history, first.need);
  first.assessment.reading = { items: first.assessment.context.entries.map(entry => ({ id: entry.id, activity: entry.id === "e1" ? "backend_execution" : "software_leadership", quote: entry.text })) };
  const a = applySemanticAssessment(first.need, first.legacy, first.assessment);
  const b = applySemanticAssessment(second.need, second.legacy, second.assessment);
  assert.equal(a.functionAssessment.basePoints, 20);
  assert.equal(b.functionAssessment.basePoints, 20);
  assert.equal(a.discoveryGroup, "main_area");
  assert.equal(a.score.score, b.score.score);
});

test("declarations explain 24 area points but do not fabricate experience or eligibility", () => {
  const { need, legacy, assessment } = setup(fixture("declaration_only"));
  const actual = applySemanticAssessment(need, legacy, assessment);
  assert.equal(actual.score.dimensions.find(row => row.key === "area")?.earnedPoints, 24);
  assert.equal(actual.score.score, null);
  assert.equal(actual.functionAssessment.basePoints, 0);
  assert.deepEqual(actual.functionAssessment.evidence, []);
});

test("duplicate sources and verbosity do not increase points or establish a person preference", () => {
  const { need, legacy, assessment } = setup(fixture("abap"));
  const original = applySemanticAssessment(need, legacy, assessment);
  const duplicated = structuredClone(assessment);
  duplicated.context!.entries.push({ ...duplicated.context!.entries[0]!, id: "e1", fieldPath: "experiences.1" });
  duplicated.reading!.items.push({ ...duplicated.reading!.items[0]!, id: "e1" });
  const repeated = applySemanticAssessment(need, legacy, duplicated);
  assert.equal(repeated.functionAssessment.basePoints, original.functionAssessment.basePoints);
  assert.equal(repeated.score.score, original.score.score);
  const renamed = structuredClone(legacy);
  renamed.candidate.fullName = "SYNTHETIC_ALTERNATE_NAME";
  renamed.candidate.location = "SYNTHETIC_LOCATION";
  const profile = renamed.candidate.profileData as StructuredDraft;
  profile.identity = { fullName: "SYNTHETIC_ALTERNATE_NAME", birthDate: "1900-01-01", gender: "SYNTHETIC_SENSITIVE" } as StructuredDraft["identity"];
  profile.experiences[0]!.organization = "SYNTHETIC_PRESTIGE_COMPANY";
  profile.experiences[0]!.period = "1980 - 2026";
  const neutral = applySemanticAssessment(need, renamed, assessment);
  assert.equal(neutral.score.score, original.score.score);
  assert.equal(neutral.score.inputFingerprint, original.score.inputFingerprint);
});

test("unclear additional work preserves proven history but makes comparison provisional", () => {
  const { need, legacy, assessment } = setup(fixture("abap"));
  assessment.context!.entries.push({ id: "e1", fieldPath: "experiences.1", kind: "experience", text: "Consultor" });
  assessment.reading!.items.push({ id: "e1", activity: "unclear", quote: "Consultor" });
  const actual = applySemanticAssessment(need, legacy, assessment);
  assert.equal(actual.functionAssessment.basePoints, 17);
  assert.notEqual(actual.score.score, null);
  assert.equal(actual.score.status, "provisional");
  assert.equal(semanticComparisonPending([actual]), true);
});

test("pending, divergent, unavailable and malformed interpretations never become zero or lose manual evidence", () => {
  const { need, legacy, assessment } = setup();
  legacy.positionDecision = "confirmed";
  const variants: SemanticAssessment[] = [
    ...(["processing", "indeterminate", "unavailable"] as const).map(status => ({ ...assessment, status })),
    unavailableSemantic(need, legacy), { ...assessment, reading: { items: [] } },
  ];
  for (const variant of variants) {
    const actual = applySemanticAssessment(need, legacy, variant);
    assert.equal(actual.score.score, null);
    assert.equal(actual.score.status, "unavailable");
    assert.equal(semanticComparisonPending([actual]), true);
    assert.deepEqual(actual.candidate, legacy.candidate);
    assert.deepEqual(actual.requirements, legacy.requirements);
    assert.equal(actual.positionDecision, "confirmed");
    assert.deepEqual(actual.score.dimensions, legacy.score.dimensions.filter(row => ["required", "desired"].includes(row.key)));
  }
  assert.equal(semanticComparisonPending([]), false);
  assert.equal(semanticComparisonPending([legacy]), false);
});

test("tenant, profile, position, method, prompt and missing provenance fail closed", () => {
  const { need, legacy, assessment } = setup();
  const invalid: Array<Partial<SemanticAssessment>> = [
    { organizationId: "other-tenant" }, { profileId: "other-profile" }, { positionVersionId: "position-v2" },
    { methodVersion: "unknown" }, { promptVersion: "unknown" }, { modelVersion: "" }, { inputHash: "" }, { analysisId: "" },
  ];
  for (const override of invalid) {
    const actual = applySemanticAssessment(need, legacy, { ...assessment, ...override });
    assert.equal(actual.score.score, null, Object.keys(override)[0]);
    assert.equal(actual.semanticAssessment?.status, "unavailable");
    assert.equal(semanticComparisonPending([actual]), true);
  }
});

test("semantic scoring supports exactly matching 6.0.0 with score 1.3.0 and a versioned interpretation", () => {
  const { need, legacy, assessment } = setup();
  const actual = applySemanticAssessment(need, legacy, assessment);
  assert.equal(actual.score.matchingContractVersion, "vacancy-matching-semantic-6.0.0");
  assert.equal(actual.score.scoreContractVersion, "matching-score-1.3.0");
  const input = inputFor(actual);
  assert.notEqual(calculateMatchingScore(input).score, null);
  for (const override of [
    { matchingContractVersion: "vacancy-matching-semantic-6.0.1" },
    { matchingContractVersion: "vacancy-matching-semantic-7.0.0" },
    { scoreContractVersion: "matching-score-1.2.0" }, { scoreContractVersion: "matching-score-1.3.1" },
    { matchingContractVersion: "vacancy-matching-explainable-5.0.0" }, { interpretationReference: "" },
  ]) assert.equal(calculateMatchingScore({ ...input, ...override }).score, null);
  assert.notEqual(calculateMatchingScore({ ...input, matchingContractVersion: "vacancy-matching-explainable-5.0.0", scoreContractVersion: "matching-score-1.2.0" }).score, null);
});

test("fingerprint is deterministic, changes with interpretation identity and never mutates old snapshots", () => {
  const { need, legacy, assessment } = setup();
  const original = applySemanticAssessment(need, legacy, assessment);
  const snapshot = structuredClone(original);
  assert.equal(applySemanticAssessment(need, legacy, assessment).score.inputFingerprint, original.score.inputFingerprint);
  for (const override of [{ analysisId: "analysis-new" }, { modelVersion: "model-new" }, { inputHash: "hash-new" }]) {
    const updated = applySemanticAssessment(need, legacy, { ...assessment, ...override });
    assert.notEqual(updated.score.inputFingerprint, original.score.inputFingerprint);
    assert.equal(updated.score.score, original.score.score);
  }
  assert.deepEqual(original, snapshot);
});

test("a material pending interpretation disables numeric ordering even for completed peers", () => {
  const high = setup(fixture("backend"), "high");
  const low = setup(fixture("backend"), "low");
  const pending = applySemanticAssessment(high.need, high.legacy, { ...high.assessment, status: "indeterminate" });
  const a = applySemanticAssessment(high.need, high.legacy, high.assessment);
  const b = applySemanticAssessment(low.need, low.legacy, low.assessment);
  a.candidate = { ...a.candidate, fullName: "SYNTHETIC_Z" }; b.candidate = { ...b.candidate, fullName: "SYNTHETIC_A" };
  a.score = { ...a.score, score: 99 }; b.score = { ...b.score, score: 20 };
  const sorted = sortVacancyMatches([a, b, pending]);
  assert.equal(semanticComparisonPending(sorted), true);
  assert.ok(sorted.indexOf(b) < sorted.indexOf(a));
});

test("runner offline is default even with credentials; only exact --execute can dispatch", async () => {
  let calls = 0;
  const dependencies = { env: { OPENAI_API_KEY: "SYNTHETIC_SECRET", KNOWLEDGE_RESEARCH_MODEL: "synthetic-model" }, fetchImpl: async () => { calls++; throw new Error("network forbidden"); } };
  const report = await runner.main([], dependencies);
  assert.equal(report.mode, "offline"); assert.equal(report.result, "NOT_RUN");
  assert.equal(report.plannedCallsPerModel, 120); assert.equal(report.callsAttempted, 0);
  assert.equal(report.categoryAgreement, null); assert.equal(report.stability, null);
  for (const args of [["--execute=true"], ["--execute", "--execute"], ["--model=secret"], ["--output=report.json"]]) {
    assert.equal((await runner.main(args, dependencies)).result, "INVALID_ARGUMENTS");
  }
  assert.equal(calls, 0);
  assert.equal((await runner.main(["--execute"], { ...dependencies, env: {} })).result, "CONFIGURATION_REQUIRED");
  assert.equal(calls, 0);
});

test("request uses shared strict schema, no storage/history/oracle, and prepared sources only", () => {
  for (const item of semanticPilotCases) {
    const body = runner.buildTrajectoryRequest(prepared(item), "synthetic-model");
    assert.equal(body.store, false); assert.equal(body.model, "synthetic-model");
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.text.format.schema, trajectoryResponseSchema);
    assert.deepEqual(JSON.parse(body.input[0].content[0].text), prepared(item));
    assert.equal(body.max_output_tokens, 6000);
    assert.deepEqual(body.reasoning, { effort: "low" });
    assert.deepEqual(Object.keys(body).sort(), ["input", "instructions", "max_output_tokens", "model", "reasoning", "store", "text"]);
    assert.doesNotMatch(JSON.stringify(body.input), /grounding|functionPoints|expected|SYNTHETIC_|example\.invalid/);
  }
});

test("provider parser refuses refusals, partial/malformed envelopes and extra answer messages", () => {
  const item = fixture("backend"), context = prepared(item), valid = providerBody(oracleReading(item));
  assert.deepEqual(runner.parseTrajectoryProviderResponse(valid, context), oracleReading(item));
  const malformed = [null, {}, { ...valid, status: "incomplete" },
    { ...valid, status: "incomplete", incomplete_details: { reason: "max_output_tokens" } },
    { ...valid, error: { message: "secret" } },
    { ...valid, incomplete_details: { reason: "max_output_tokens" } }, { ...valid, output: [] },
    { ...valid, output: [...valid.output, ...valid.output] },
    ...[[{ type: "refusal", refusal: "private" }], [{ type: "output_text", text: "not json" }],
      [{ type: "output_text", text: JSON.stringify({ items: [] }) }], [...valid.output[0]!.content, { type: "refusal", refusal: "private" }]]
      .map(content => ({ ...valid, output: [{ ...valid.output[0], content }] })),
    { ...valid, output: [{ ...valid.output[0], role: "user" }] },
    { ...valid, output: [{ ...valid.output[0], status: "in_progress" }] },
  ];
  for (const value of malformed) assert.throws(() => runner.parseTrajectoryProviderResponse(value, context));
});

test("runner makes 120 fresh requests with concurrency two and 90s timeout; stdout report is aggregate only", async () => {
  let calls = 0, active = 0, peak = 0;
  const requests: Array<{ url: string; options: RequestInit; body: Record<string, unknown> }> = [];
  const report = await runner.main(["--execute"], {
    env: { OPENAI_API_KEY: "SYNTHETIC_SECRET", KNOWLEDGE_RESEARCH_MODEL: "synthetic-model" },
    fetchImpl: async (url: string, options: RequestInit) => {
      calls++; active++; peak = Math.max(peak, active);
      const body = JSON.parse(String(options.body)); requests.push({ url, options, body });
      await new Promise<void>(done => setImmediate(done)); active--;
      const context = JSON.parse(body.input[0].content[0].text) as SemanticContext;
      const normalize = (value: SemanticContext) => JSON.stringify({ ...value, entries: [...value.entries].sort((a, b) => a.id.localeCompare(b.id)) });
      const item = semanticPilotCases.find(candidate => normalize(prepared(candidate)) === normalize(context));
      assert.ok(item);
      return { ok: true, json: async () => providerBody(oracleReading(item, context)) };
    },
  });
  assert.equal(calls, 120); assert.equal(peak, 2); assert.equal(runner.CONCURRENCY, 2); assert.equal(runner.TIMEOUT_MS, 90_000);
  assert.equal(new Set(requests.map(row => row.options.signal)).size, 120);
  for (let index = 0; index < requests.length; index += 2) {
    const firstBody = requests[index]!.body as { input: Array<{ content: Array<{ text: string }> }> };
    const secondBody = requests[index + 1]!.body as typeof firstBody;
    const firstContext = JSON.parse(firstBody.input[0]!.content[0]!.text) as SemanticContext;
    const secondContext = JSON.parse(secondBody.input[0]!.content[0]!.text) as SemanticContext;
    assert.deepEqual(secondContext, { ...firstContext, entries: [...firstContext.entries].reverse() });
  }
  for (const { url, options } of requests) {
    assert.equal(url, "https://api.openai.com/v1/responses"); assert.equal(options.method, "POST");
    assert.equal(options.redirect, "error"); assert.ok(options.signal instanceof AbortSignal);
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer SYNTHETIC_SECRET");
  }
  assert.equal(report.result, "PASS"); assert.equal(report.callsAttempted, 120); assert.equal(report.validReadings, 120);
  assert.equal(report.categoryAgreement.items.rate, 1); assert.equal(report.categoryAgreement.readings.rate, 1);
  assert.equal(report.repeatDisagreement.evaluatedPairs, 60); assert.equal(report.repeatDisagreement.disagreements, 0);
  assert.equal(report.stability.stableBases, 12); assert.deepEqual(report.failureCaseIds, []);
  assert.doesNotMatch(JSON.stringify(report), /SYNTHETIC_SECRET|Bearer|Programei|Implementei|quote|example\.invalid/);
});

test("runner reports repeat disagreement separately from stable-but-wrong readings and failure IDs only", async () => {
  let call = 0;
  const report = await runner.main(["--execute"], {
    env: { OPENAI_API_KEY: "SYNTHETIC_SECRET", KNOWLEDGE_RESEARCH_MODEL: "synthetic-model" },
    fetchImpl: async (_url: string, options: RequestInit) => {
      const index = call++, item = semanticPilotCases[Math.floor(index / 2)]!;
      const context = JSON.parse(JSON.parse(String(options.body)).input[0].content[0].text) as SemanticContext;
      const reading = oracleReading(item, context);
      if (item.baseId === "backend" && index % 2 === 1) reading.items[0]!.activity = "software_leadership";
      if (item.baseId === "abap") reading.items[0]!.activity = "backend_execution";
      return { ok: true, json: async () => providerBody(reading) };
    },
  });
  assert.equal(report.result, "FAIL"); assert.equal(report.validReadings, 120);
  assert.equal(report.repeatDisagreement.disagreements, 5);
  assert.equal(report.stability.stableBases, 11); // Wrong ABAP is stable, not correct.
  assert.equal(report.failureCaseIds.length, 10);
  assert.ok(report.categoryAgreement.items.rate < 1);
  assert.ok(report.failureCaseIds.every((id: string) => semanticPilotCases.some(item => item.id === id)));
});

test("runner catches timeouts/provider errors without retries, secrets, raw bodies or invented agreement", async () => {
  let calls = 0, cancelled = 0;
  const report = await runner.main(["--execute"], {
    env: { OPENAI_API_KEY: "SYNTHETIC_SECRET", KNOWLEDGE_RESEARCH_MODEL: "synthetic-model" },
    fetchImpl: async () => {
      calls++;
      if (calls % 2) throw new DOMException("SYNTHETIC_SECRET private body", "TimeoutError");
      return { ok: false, status: 429, body: { cancel: async () => { cancelled++; } }, json: async () => { throw new Error("must not read error body"); } };
    },
  });
  assert.equal(calls, 120); assert.equal(cancelled, 60); assert.equal(report.result, "FAIL");
  assert.equal(report.validReadings, 0); assert.equal(report.repeatDisagreement.rate, null);
  assert.equal(report.repeatDisagreement.unavailablePairs, 60); assert.equal(report.stability.rate, null);
  assert.equal(report.categoryAgreement.readings.matched, 0); assert.equal(report.failureCaseIds.length, 60);
  assert.doesNotMatch(JSON.stringify(report), /SYNTHETIC_SECRET|private body|TimeoutError/);
});
