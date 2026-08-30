import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";
import {
  hasMaterialProfessionalInformation,
  normalizeReviewDraft,
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
