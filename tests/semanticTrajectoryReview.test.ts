import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareTrajectoryContext, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION,
  type SemanticAssessment,
} from "../src/domain/semanticTrajectory.js";
import { applySemanticAssessment } from "../web/src/domain/semanticMatching.js";
import {
  emptyVacancyDraft, newVacancyRequirement, matchVacancyCandidate,
  type VacancyDetail, type VacancyDemonstratedEvidence,
} from "../web/src/domain/vacancy.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";

// Review regressions only: synthetic sources and explicit mocked classifications; no provider/service imports.
const position = { title: "Desenvolvedor backend" };
const description = "Implementei Node.js";

for (const text of [
  "Gestante. Nunca escrevi codigo de servidor.",
  "Idade: 71. Nunca escrevi código de servidor.",
  "Gestante e responsável por APIs, mas nunca escrevi código.",
]) {
  test(`M8.3 review #1: complex sensitive clause cannot leave a misleading positive title (${text})`, () => {
    const profile = { experiences: [{ role: position.title, description: text }] };
    const before = structuredClone(profile);
    assert.throws(() => prepareTrajectoryContext(profile, position), { message: "TRAJECTORY_SENSITIVE_CONTEXT" });
    assert.deepEqual(profile, before);
  });
}

test("M8.3 review #1: isolated attributes may be removed without dropping adjacent negation", () => {
  const context = prepareTrajectoryContext({ experiences: [{
    role: position.title,
    description: "Idade: 71; Gestante\nReligião: SINTETICA\nNunca escrevi código de servidor.",
  }] }, position);
  assert.equal(context.entries[0]?.text, "Desenvolvedor backend. Nunca escrevi código de servidor.");
  assert.doesNotMatch(JSON.stringify(context), /71|Gestante|SINTETICA/i);
});

test("M8.3 review #3: known two-letter identifiers are removed across all analysis text", () => {
  const context = prepareTrajectoryContext({
    identity: { fullName: "Li" }, education: [{ institution: "IP" }],
    experiences: [{ organization: "EY", role: "Programador", description: "Li programou na EY e estudou no IP. EY, ey; EYE KEY EY_1." }],
  }, { title: "Desenvolvedor backend na EY", mission: "Li mantém APIs.", responsibilities: ["Integrar sistemas do IP."] });
  const text = JSON.stringify(context);
  assert.doesNotMatch(text, /(?<![\p{L}\p{N}_])(?:Li|EY|IP)(?![\p{L}\p{N}_])/iu);
  assert.ok(context.entries[0]?.text.includes("EYE KEY EY_1."));
  assert.match(text, /\[omitido\]/);
});

test("M8.3 review #3: employer redaction preserves technical words containing its name", () => {
  const context = prepareTrajectoryContext({ experiences: [{
    organization: "Meta", role: "Programador", description: "Na Meta implementei metadados e metaprogramação.",
  }] }, position);
  assert.equal(context.entries[0]?.text, "Programador. Na [omitido] implementei metadados e metaprogramação.");
});

test("M8.3 review #3: normalized Unicode names and literal regex characters respect word boundaries", () => {
  const context = prepareTrajectoryContext({ experiences: [{
    organization: "A\u0301gil", role: "Programador", description: "Na Ágil e A+B fiz APIs ágeis. Ágila e XA+B não são os nomes.",
  }] }, position, ["A+B"]);
  assert.equal(context.entries[0]?.text, "Programador. Na [omitido] e [omitido] fiz APIs ágeis. Ágila e XA+B não são os nomes.");
});

function setup(profileChanges: Partial<StructuredDraft> = {}, demonstrated: VacancyDemonstratedEvidence[] = []) {
  const profile: StructuredDraft = {
    identity: { fullName: "Pessoa Sintética" },
    contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: null, areasOfExpertise: [], professionalObjective: null, summary: null, keyResults: [],
    experiences: [{ id: "exp-canonical", source: "human", role: position.title, description,
      organization: null, period: null, evidenceText: "", page: null }],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
    ...profileChanges,
  };
  const need: VacancyDetail = {
    ...emptyVacancyDraft(), ...position, id: "review-vacancy", organizationId: "review-org", versionId: "review-v1", version: 1,
    area: "Desenvolvimento de software", jobRoleName: position.title, occupantName: null,
    createdAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T00:00:00Z",
    requirements: [{ ...newVacancyRequirement("Node.js", "technology"), stableId: "req-node", importance: "required", importanceConfirmed: true }],
  };
  const person: PublishedProfileCandidate = {
    personId: "review-person", fullName: "Pessoa Sintética", lifecycle: "candidate", operationalStatus: "active", location: null,
    profileId: "review-profile", profileVersion: 1, publishedAt: "2026-09-25T00:00:00Z", profileData: profile, knowledge: [],
  };
  const legacy = matchVacancyCandidate(need, person, null, demonstrated);
  const context = prepareTrajectoryContext(profile, need);
  const assessment: SemanticAssessment = {
    status: "complete", organizationId: need.organizationId, profileId: person.profileId, positionVersionId: need.versionId,
    methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION, modelVersion: "mock-review-model",
    inputHash: "a".repeat(64), analysisId: "review-analysis", context,
    reading: { items: context.entries.map(entry => ({ id: entry.id, activity: "backend_execution",
      quote: entry.kind === "experience" ? description : entry.text })) },
  };
  return { need, legacy, assessment };
}

test("M8.3 review #5: interpreting the same requirement quote does not create independent corroboration", () => {
  const { need, legacy, assessment } = setup();
  const before = structuredClone({ need, legacy, assessment });
  const result = applySemanticAssessment(need, legacy, assessment);
  const original = legacy.requirements[0]!.evidence.find(item => item.label === description);
  assert.ok(original);
  assert.equal(result.areaRelation.evidence[0]?.sourceId, original.sourceId);
  assert.equal(result.areaRelation.evidence[0]?.fieldPath, original.fieldPath);
  assert.equal(result.evidenceAssessment.independentSourceCount, 1);
  assert.equal(result.evidenceAssessment.level, "supported");
  assert.deepEqual(result.requirements, legacy.requirements);
  assert.deepEqual({ need, legacy, assessment }, before);
});

test("M8.3 review #5: title, areas, repeated experiences and interpretations still constitute one Profile source", () => {
  const { need, legacy, assessment } = setup({
    professionalTitle: position.title, areasOfExpertise: ["Desenvolvimento backend"],
    competencies: ["Node.js"], summary: description,
    experiences: ["first", "second"].map(id => ({ id, source: "human" as const, role: position.title,
      description, organization: null, period: null, evidenceText: description, page: null })),
  });
  for (const analysisId of ["interpretation-first", "interpretation-second"]) {
    const result = applySemanticAssessment(need, legacy, { ...assessment, analysisId });
    assert.equal(result.evidenceAssessment.independentSourceCount, 1);
    assert.equal(result.evidenceAssessment.level, "supported");
    assert.deepEqual(result.requirements, legacy.requirements);
  }
});

test("M8.3 review #5: canonical role identity survives a title-only citation", () => {
  const { need, legacy, assessment } = setup();
  assessment.reading!.items[0]!.quote = position.title;
  const result = applySemanticAssessment(need, legacy, assessment);
  assert.equal(result.areaRelation.evidence[0]?.sourceId, "experience:exp-canonical:role");
  assert.equal(result.areaRelation.evidence[0]?.fieldPath, "experiences.exp-canonical.role");
  assert.equal(result.evidenceAssessment.independentSourceCount, 1);
});

test("M8.3 review #5: explicit versioned Demonstrated evidence remains an independent source without duplicate inflation", () => {
  const demonstrated: VacancyDemonstratedEvidence = {
    id: "review-assessment-evidence", competencyKey: "Node.js", demonstratedLevel: "advanced", confidenceState: "high",
    verificationDefinitionVersion: "m51a-verification-definition-1.0.0", evaluationVersion: "m51b-assessment-evaluation-1.0.0",
    integrityRuleVersion: "m51b-integrity-ruleset-1.0.0", verifiedAt: "2026-09-25T00:00:00Z",
  };
  const { need, legacy, assessment } = setup({}, [demonstrated, { ...demonstrated }]);
  assert.equal(legacy.requirements[0]?.evidence[0]?.source, "Evidência Demonstrada");
  const result = applySemanticAssessment(need, legacy, assessment);
  assert.equal(result.evidenceAssessment.independentSourceCount, 2);
  assert.equal(result.evidenceAssessment.level, "corroborated");
  assert.deepEqual(result.requirements, legacy.requirements);
});

// These pairs exercise the shared engine, not the provider, database projection or UI gate.
// Array-order tests document why SQL and browser loaders need identical tie-breakers.
test("M8.3 review #9: new Demonstrated evidence changes the fingerprint without changing Profile or Position IDs", () => {
  const { need, legacy, assessment } = setup();
  need.requirements[0]!.targetLevel = "advanced";
  const previous = applySemanticAssessment(need, matchVacancyCandidate(need, legacy.candidate), assessment);
  const current = applySemanticAssessment(need, matchVacancyCandidate(need, legacy.candidate, null, [{
    id: "new-demonstrated", competencyKey: "Node.js", demonstratedLevel: "advanced", confidenceState: "high",
    verificationDefinitionVersion: "m51a-verification-definition-1.0.0", evaluationVersion: "m51b-assessment-evaluation-1.0.0",
    integrityRuleVersion: "m51b-integrity-ruleset-1.0.0", verifiedAt: "2026-09-25T00:00:00Z",
  }]), assessment);
  assert.equal(previous.requirements[0]?.status, "partially_met");
  assert.equal(current.requirements[0]?.status, "met");
  assert.equal(previous.score.score, 79);
  assert.equal(current.score.score, 100);
  assert.equal(previous.score.profileVersion, current.score.profileVersion);
  assert.equal(previous.score.positionVersion, current.score.positionVersion);
  assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
});

for (const key of ["sourceId", "label", "source", "sourceVersion"] as const) {
  test(`M8.3 review #9: requirement evidence ${key} participates in the fingerprint even at equal points`, () => {
    const { need, legacy, assessment } = setup();
    const previous = applySemanticAssessment(need, legacy, assessment);
    const changed = structuredClone(legacy);
    changed.requirements[0]!.evidence[0]![key] = `changed-${key}`;
    const current = applySemanticAssessment(need, changed, assessment);
    assert.equal(previous.score.score, current.score.score);
    assert.equal(previous.requirements[0]?.status, current.requirements[0]?.status);
    assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
  });
}

test("M8.3 review #9: JSON object key insertion order does not cause a false fingerprint mismatch", () => {
  const { need, legacy, assessment } = setup();
  const previous = applySemanticAssessment(need, legacy, assessment);
  const reordered = structuredClone(legacy);
  reordered.requirements[0]!.evidence = reordered.requirements[0]!.evidence.map(item =>
    Object.fromEntries(Object.entries(item).reverse()) as typeof item);
  assert.equal(applySemanticAssessment(need, reordered, assessment).score.inputFingerprint, previous.score.inputFingerprint);
});

test("M8.3 review #11: requirement array order matters even when points and evidence are unchanged", () => {
  const { need, legacy, assessment } = setup();
  need.requirements.push({ ...newVacancyRequirement("Python", "technology"), stableId: "req-python", importance: "required" });
  const previous = applySemanticAssessment(need, matchVacancyCandidate(need, legacy.candidate), assessment);
  const reorderedNeed = { ...need, requirements: [...need.requirements].reverse() };
  const current = applySemanticAssessment(reorderedNeed, matchVacancyCandidate(reorderedNeed, legacy.candidate), assessment);
  assert.equal(previous.score.score, current.score.score);
  assert.deepEqual([...previous.requirements].reverse(), current.requirements);
  assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
});

test("M8.3 review #11: relatedSignals ordering selects evidence and can change a same-score fingerprint", () => {
  const { need, legacy, assessment } = setup({ competencies: ["Python", "Java"] });
  need.requirements = [{ ...newVacancyRequirement("COBOL", "technology"), stableId: "req-related", importance: "required",
    relatedSignals: ["Python", "Java"].map(label => ({ label, conceptId: null, origin: "operator" })) }];
  const previous = applySemanticAssessment(need, matchVacancyCandidate(need, legacy.candidate), assessment);
  const reversed = structuredClone(need);
  reversed.requirements[0]!.relatedSignals.reverse();
  const current = applySemanticAssessment(reversed, matchVacancyCandidate(reversed, legacy.candidate), assessment);
  assert.equal(previous.requirements[0]?.status, "related_signal");
  assert.equal(current.requirements[0]?.status, "related_signal");
  assert.equal(previous.requirements[0]?.relatedSignal, "Python");
  assert.equal(current.requirements[0]?.relatedSignal, "Java");
  assert.equal(previous.score.score, current.score.score);
  assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
});

test("M8.3 review #11: unavailable canonical concept must not preserve resolved matching credit", () => {
  const { need, legacy, assessment } = setup();
  need.requirements = [{ ...newVacancyRequirement("Rust", "technology"), stableId: "req-rust", importance: "required" }];
  const approved: PublishedProfileCandidate = { ...legacy.candidate, knowledge: [{
    originalTerm: "Alias sintético", canonicalLabel: "Rust", state: "resolved", conceptId: "concept-rust", conceptType: "technology",
    sourceFieldPath: "competencies.0", sourceVersion: "global:0|organization:1|source:none|method:fixture",
  }] };
  const unavailable: PublishedProfileCandidate = { ...approved, knowledge: approved.knowledge.map(item => ({
    ...item, state: "unresolved", canonicalLabel: null, conceptId: null, conceptType: null,
  })) };
  const previous = applySemanticAssessment(need, matchVacancyCandidate(need, approved), assessment);
  const current = applySemanticAssessment(need, matchVacancyCandidate(need, unavailable), assessment);
  assert.equal(previous.requirements[0]?.status, "met");
  assert.equal(current.requirements[0]?.status, "no_evidence");
  assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
});

test("M8.3 review #11: loadConceptLabels content affects matching even with unchanged requirement labels", () => {
  const { need, legacy, assessment } = setup();
  need.requirements = [{ ...newVacancyRequirement("Runtime interno", "technology"), stableId: "req-alias", importance: "required",
    conceptId: "concept-node", conceptLabel: "Node.js" }];
  const previous = applySemanticAssessment(need, matchVacancyCandidate(need, legacy.candidate), assessment);
  const unpublished = structuredClone(need);
  unpublished.requirements[0]!.conceptId = null;
  unpublished.requirements[0]!.conceptLabel = null;
  const current = applySemanticAssessment(unpublished, matchVacancyCandidate(unpublished, legacy.candidate), assessment);
  assert.equal(previous.requirements[0]?.status, "met");
  assert.equal(current.requirements[0]?.status, "no_evidence");
  assert.notEqual(previous.score.inputFingerprint, current.score.inputFingerprint);
});
