import assert from "node:assert/strict";
import test from "node:test";
import {
  EDUCATION_CLASSIFIER_VERSION,
  classifyEducationRecord,
  confirmEducationClassification,
  educationClassificationNeedsReview,
  educationCourseIdentity,
  isEducationLevelQualificationCompatible,
  resolveEducationClassification,
  withHumanEducationClassification,
} from "../src/domain/educationClassification.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";
import { validateEducationClassificationsForApproval } from "../web/src/domain/reviewFieldLifecycle.js";

const cases = [
  ["Bacharelado em Sistemas de Informação", "undergraduate", "bachelor", "Sistemas de Informação"],
  ["LICENCIATURA EM LETRAS", "undergraduate", "licentiate", "LETRAS"],
  ["Tecnologia em Gestão da Tecnologia da Informação", "undergraduate", "technologist", "Gestão da Tecnologia da Informação"],
  ["Técnico em Processamento de Dados", "technical", "technical_course", "Processamento de Dados"],
  ["MBA em Gestão Estratégica de Negócios", "postgraduate", "mba", "Gestão Estratégica de Negócios"],
  ["Especialização em Gestão de Processos", "postgraduate", "specialization", "Gestão de Processos"],
  ["Pós-graduação em Gestão de Projetos", "postgraduate", "unknown", "Gestão de Projetos"],
  ["Mestrado em Engenharia de Produção", "postgraduate", "master", "Engenharia de Produção"],
  ["Doutorado em Ciência da Computação", "postgraduate", "doctorate", "Ciência da Computação"],
  ["Pós-doutorado em Inteligência Artificial", "postgraduate", "postdoctorate", "Inteligência Artificial"],
  ["Bachelor of Computer Science", "undergraduate", "bachelor", "Computer Science"],
  ["Master of Data Science", "postgraduate", "master", "Data Science"],
] as const;

for (const [text, level, qualification, course] of cases) {
  test(`classifies ${text} conservatively`, () => {
    const result = classifyEducationRecord({ course: text, originalText: text });
    assert.equal(result.level, level);
    assert.equal(result.qualification, qualification);
    assert.equal(result.course, course);
    assert.equal(result.originalText, text);
    assert.equal(result.classificationMethodVersion, EDUCATION_CLASSIFIER_VERSION);
  });
}

test("does not confuse a technologist degree with technical education", () => {
  const result = classifyEducationRecord({ course: "teCnÓLoGo em Análise e Desenvolvimento de Sistemas" });
  assert.equal(result.level, "undergraduate");
  assert.equal(result.qualification, "technologist");
});

test("keeps generic postgraduate qualification unknown and reviewable", () => {
  const result = classifyEducationRecord({ course: "PÓS GRADUAÇÃO EM NEGÓCIOS" });
  assert.equal(result.level, "postgraduate");
  assert.equal(result.qualification, "unknown");
  assert.equal(result.classificationSources.level, "explicit");
  assert.equal(result.classificationSources.qualification, "unknown");
  assert.equal(educationClassificationNeedsReview(result), true);
});

test("a closed period never proves completion", () => {
  const result = classifyEducationRecord({ course: "MBA em Gestão", period: "2019 - 2020" });
  assert.equal(result.status, "unknown");
  assert.equal(result.classificationSources.status, "unknown");
});

test("current period only infers in-progress and still requires review", () => {
  const result = classifyEducationRecord({ course: "MBA em Gestão", period: "2024 - Atual" });
  assert.equal(result.status, "in_progress");
  assert.equal(result.classificationSources.status, "inferred");
  assert.equal(educationClassificationNeedsReview(result), true);
});

test("explicit completion is accepted without arbitrary confidence", () => {
  const result = classifyEducationRecord({ course: "MBA em Gestão", status: "Concluído" });
  assert.equal(result.status, "completed");
  assert.equal(result.classificationOrigin, "explicit");
  assert.equal(result.classificationReviewed, true);
  assert.equal("confidence" in result, false);
});

test("ambiguous education stays unknown instead of inventing a degree", () => {
  const result = classifyEducationRecord({ course: "Programa Executivo de Liderança" });
  assert.equal(result.level, "unknown");
  assert.equal(result.qualification, "unknown");
  assert.equal(result.status, "unknown");
  assert.equal(result.classificationOrigin, "unknown");
});

test("human override preserves the original classifier snapshot", () => {
  const original = classifyEducationRecord({ course: "Pós-graduação em Gestão", status: "Concluído" });
  const changed = withHumanEducationClassification(original, { qualification: "specialization" });
  assert.equal(changed.qualification, "specialization");
  assert.equal(changed.classificationOrigin, "human");
  assert.equal(changed.classifierSnapshot?.qualification, "unknown");
  assert.equal(changed.classificationReviewed, false);
  const confirmed = confirmEducationClassification(changed);
  assert.equal(confirmed.classificationReviewed, true);
  assert.equal(confirmed.classifierSnapshot?.qualification, "unknown");
});

test("invalid academic combinations are rejected and level changes clear them", () => {
  assert.equal(isEducationLevelQualificationCompatible("technical", "bachelor"), false);
  const mba = classifyEducationRecord({ course: "MBA em Gestão", status: "Concluído" });
  const changed = withHumanEducationClassification(mba, { level: "undergraduate" });
  assert.equal(changed.qualification, "unknown");
});

test("historical records remain readable without retroactive invention", () => {
  const historical = resolveEducationClassification({ course: "MBA em Gestão", evidenceText: "MBA em Gestão" });
  assert.equal(historical.level, "unknown");
  assert.equal(historical.qualification, "unknown");
  assert.equal(historical.classificationMethodVersion, "legacy-unclassified");
});

test("canonical identity recognizes qualified and unqualified course labels", () => {
  assert.equal(educationCourseIdentity("Bacharelado em Sistemas de Informação"), educationCourseIdentity("Sistemas de Informação"));
});

test("approval blocks unresolved classification until explicit human confirmation", () => {
  const classification = classifyEducationRecord({ course: "MBA em Gestão", period: "2019 - 2020" });
  const draft: StructuredDraft = {
    identity: { fullName: "Pessoa QA" }, contact: { city: null, state: null, phone: null, email: "qa@example.com", linkedin: null },
    professionalTitle: null, areasOfExpertise: [], professionalObjective: null, summary: null, keyResults: [], experiences: [],
    education: [{ id: "education_12345678", source: "extracted", institution: "Universidade QA", period: "2019 - 2020", description: null, evidenceText: classification.originalText, page: 1, ...classification }],
    certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  assert.equal(validateEducationClassificationsForApproval(draft).length, 1);
  draft.education[0] = confirmEducationClassification(draft.education[0]!);
  assert.equal(validateEducationClassificationsForApproval(draft).length, 0);
});
