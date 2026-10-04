import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";
import {
  hasMaterialProfessionalInformation,
  legacyReviewEntityIdFromValue,
  normalizeReviewDraft,
  reviewDraftNeedsContractUpgrade,
  reviewDraftChangeState,
  reviewEntityFieldPath,
  reviewFieldPathExists,
  validateReviewDraftForSave,
} from "../web/src/domain/reviewFieldLifecycle.js";

function draft(): StructuredDraft {
  return {
    identity: { fullName: "Bruno Harita Santos" },
    contact: { city: null, state: null, phone: null, email: "bruno@example.com", linkedin: null },
    professionalTitle: "Diretor de Operações",
    areasOfExpertise: [], professionalObjective: null, summary: null, keyResults: [],
    experiences: [], education: [], certifications: [], languages: [], competencies: [],
    customSections: [], uncertainties: [], notIdentified: [],
  };
}

test("normalization deletes blank optional and repeatable values without inventing content", () => {
  const input = draft();
  input.contact.city = "   ";
  input.areasOfExpertise = [" Operações ", "operações", ""];
  input.keyResults = [{ id: "result_12345678", value: "  " }, { id: "result_abcdefgh", value: " Reduziu o prazo em 30% " }];
  input.experiences = [
    { id: "experience_12345678", source: "human", role: null, organization: null, period: " ", description: null, evidenceText: "", page: null },
    { id: "experience_abcdefgh", source: "human", role: " Diretor ", organization: null, period: null, description: null, evidenceText: "", page: null },
  ];
  input.education = [{ id: "education_12345678", source: "human", course: null, institution: null, period: null, description: null, evidenceText: "", page: null }];
  input.customSections = [{ id: "custom_12345678", name: "Projetos", format: "list", source: "human", items: [{ id: "item_12345678", value: " " }] }];

  const normalized = normalizeReviewDraft(input);
  assert.equal(normalized.contact.city, null);
  assert.deepEqual(normalized.areasOfExpertise, ["Operações"]);
  assert.deepEqual(normalized.keyResults, [{ id: "result_abcdefgh", value: "Reduziu o prazo em 30%" }]);
  assert.equal(normalized.experiences.length, 1);
  assert.equal(normalized.experiences[0]?.role, "Diretor");
  assert.equal(normalized.education.length, 0);
  assert.equal(normalized.customSections.length, 0);
});

test("save requires name, one private contact channel, and material professional content", () => {
  const input = draft();
  input.identity.fullName = " "; input.contact.email = null; input.professionalTitle = null;
  const issues = validateReviewDraftForSave(input);
  assert.ok(issues.some((issue) => issue.fieldPath === "identity.fullName"));
  assert.ok(issues.some((issue) => issue.fieldPath === "contact.phone"));
  assert.ok(issues.some((issue) => issue.fieldPath === "contact.email"));
  assert.ok(issues.some((issue) => issue.fieldPath === "professionalTitle"));
  assert.equal(hasMaterialProfessionalInformation(input), false);
});

test("existing private contact satisfies the contact gate without copying it into the public review draft", () => {
  const input = draft(); input.contact.email = null;
  const issues = validateReviewDraftForSave(input, { existingPhone: "+5514999999999" });
  assert.equal(issues.some((issue) => issue.fieldPath === "contact.phone" || issue.fieldPath === "contact.email"), false);
  assert.equal(input.contact.phone, null);
});

test("phone guidance anticipates the server rejection without choosing a contact or mutating evidence", () => {
  for (const phone of ["(11) 98888-7777 / (11) 97777-6666", "98888-7777", "123", "+55119888877778888"]) {
    const input = draft(); input.contact.phone = phone;
    const original = structuredClone(input);
    const issue = validateReviewDraftForSave(input).find((item) => item.fieldPath === "contact.phone");
    assert.ok(issue, phone);
    assert.match(issue.message, /Telefone: informe apenas um número com DDD/);
    assert.match(issue.message, /escolha qual usar/);
    assert.deepEqual(input, original);
  }
  for (const phone of ["(11) 98888-7777", "(11) 3888-7777", "+55 11 98888-7777", "+44 20 7946 0958", null, " "]) {
    const input = draft(); input.contact.phone = phone;
    assert.equal(validateReviewDraftForSave(input).some((item) => item.fieldPath === "contact.phone"), false, String(phone));
  }
});

test("length guidance names the field and professional minimum gives concrete examples", () => {
  const input = draft(); input.contact.city = "x".repeat(121);
  assert.equal(validateReviewDraftForSave(input).find((item) => item.fieldPath === "contact.city")?.message, "Cidade: reduza o texto para no máximo 120 caracteres.");
  input.professionalTitle = null;
  assert.match(validateReviewDraftForSave(input).find((item) => item.fieldPath === "professionalTitle")!.message, /resumo, objetivo, experiência, formação ou competência/);
});

test("stable entity paths survive array reordering while legacy paths remain compatible", () => {
  const first = { id: "experience_abcdefgh", source: "human" as const, role: "Diretor", organization: null, period: null, description: null, evidenceText: "", page: null };
  const second = { ...first, id: "experience_ijklmnop", role: "Gerente" };
  const input = draft(); input.experiences = [first, second];
  assert.equal(reviewEntityFieldPath("experience", input.experiences[1]!, "role"), "experiences.experience_ijklmnop.role");
  input.experiences.reverse();
  assert.equal(reviewEntityFieldPath("experience", input.experiences[0]!, "role"), "experiences.experience_ijklmnop.role");
  assert.equal(reviewEntityFieldPath("experience", { id: "experience_legacy00000003" }, "role"), "experiences.3.role");
});

test("partially declared repeatable records require their identifying pair", () => {
  const input = draft();
  input.experiences = [{ id: "experience_12345678", source: "human", role: null, organization: null, period: "2020 - 2024", description: null, evidenceText: "", page: null }];
  input.education = [{ id: "education_12345678", source: "human", course: null, institution: null, period: "2024", description: null, evidenceText: "", page: null }];
  const issues = validateReviewDraftForSave(input);
  assert.ok(issues.some((issue) => issue.fieldPath === "experiences.experience_12345678.role"));
  assert.ok(issues.some((issue) => issue.fieldPath === "education.education_12345678.course"));
});

test("empty repeatable forms are transient and do not become saveable changes", () => {
  const baseline = draft();
  const withEmptyEducation = structuredClone(baseline);
  withEmptyEducation.education.push({
    id: "education_12345678", source: "human", course: null, institution: null,
    period: null, description: null, evidenceText: "", page: null,
  });
  assert.deepEqual(reviewDraftChangeState(baseline, withEmptyEducation), {
    rawChanged: true,
    meaningfulChanged: false,
    transientOnly: true,
  });
  withEmptyEducation.education[0]!.course = "Gestão de Projetos";
  assert.equal(reviewDraftChangeState(baseline, withEmptyEducation).meaningfulChanged, true);
});

test("field existence distinguishes temporary targets from removed or root paths", () => {
  const input = draft();
  input.education.push({
    id: "education_12345678", source: "human", course: null, institution: null,
    period: null, description: null, evidenceText: "", page: null,
  });
  assert.equal(reviewFieldPathExists(input, "education.education_12345678.course"), true);
  assert.equal(reviewFieldPathExists(input, "education"), false);
  assert.equal(reviewFieldPathExists(input, "education.education_removed.course"), false);
  assert.equal(reviewFieldPathExists(input, "summary"), true);
});

test("legacy entities receive deterministic content-aware ids and require one technical synchronization", () => {
  const first = legacyReviewEntityIdFromValue("education", 0, { course: "MBA", institution: "USC", period: "2019 - 2020" });
  const repeated = legacyReviewEntityIdFromValue("education", 0, { course: "MBA", institution: "USC", period: "2019 - 2020" });
  const changed = legacyReviewEntityIdFromValue("education", 0, { course: "Bacharelado", institution: "UNESP", period: "2010 - 2013" });
  assert.equal(first, repeated);
  assert.notEqual(first, changed);
  assert.match(first, /^education_legacy[0-9]{8}[a-z0-9]{12}$/);

  const legacy = { professionalTitle: "Diretor", experiences: [{ role: "Diretor", organization: "HRT" }] };
  assert.equal(reviewDraftNeedsContractUpgrade(legacy), true);
  assert.equal(reviewDraftNeedsContractUpgrade(draft()), false);
});
