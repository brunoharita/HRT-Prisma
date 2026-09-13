import assert from "node:assert/strict";
import test from "node:test";
import { parseResumeDate, parseResumePeriod, resumePeriodDurationDays } from "../src/domain/resumeDates.js";
import { classifyEducationRecord } from "../src/domain/educationClassification.js";
import { buildAdaptiveExtraction } from "../web/src/domain/adaptiveResumeExtraction.js";
import { structureParserIa } from "../web/src/domain/parserIa.js";
import { normalizeReviewDraft, validateReviewDraftForSave } from "../web/src/domain/reviewFieldLifecycle.js";
import { estimateExperienceYears } from "../web/src/domain/profileDiscovery.js";
import type { ExtractedPage } from "../web/src/domain/personIngestion.js";

test("normalizes single dates, partial dates, mixed periods and exact explicit days", () => {
  const cases = [
    ["2020", "01/01/2020"], ["Março de 2020", "01/03/2020"], ["03/2020", "01/03/2020"],
    ["2020 - 2024", "01/01/2020 - 31/12/2024"], ["2020 a fevereiro de 2024", "01/01/2020 - 29/02/2024"],
    ["Março de 2020 a 2024", "01/03/2020 - 31/12/2024"], ["15/03/2020 a fevereiro de 2024", "15/03/2020 - 29/02/2024"],
    ["jan/2020 - fev/2023", "01/01/2020 - 28/02/2023"], ["2024-02-15 - 2024-03-04", "15/02/2024 - 04/03/2024"],
    ["15 de março de 2020 até 10 de abril de 2021", "15/03/2020 - 10/04/2021"],
    ["March 2020 to September 2021", "01/03/2020 - 30/09/2021"],
    ["2020 - Present (4 years)", "01/01/2020 - Atual"], ["(2010 - 2011)", "01/01/2010 - 31/12/2011"],
  ];
  for (const [source, expected] of cases) {
    const parsed = parseResumePeriod(source);
    assert.equal(parsed?.value, expected, source);
    assert.equal(parsed?.originalText, source);
    assert.equal(parseResumePeriod(parsed?.value)?.value, expected, `idempotent: ${source}`);
  }
  assert.deepEqual(parseResumeDate("2020")?.inferred, ["month", "day"]);
  assert.deepEqual(parseResumeDate("03/2020")?.inferred, ["day"]);
  assert.deepEqual(parseResumeDate("15/03/2020")?.inferred, []);
});

test("does not fabricate years, roll invalid dates over, or accept reversed ranges", () => {
  for (const value of ["", "março", "03/20", "31/04/2020", "29/02/2023", "00/2024", "13/2024", "2024 - 2020", "2024 - desconhecido", "3 anos", "2020 -", "2020 ou 2021"]) {
    assert.equal(parseResumePeriod(value), null, value);
    assert.equal(resumePeriodDurationDays(value), null, value);
  }
  assert.equal(parseResumeDate("29/02/2000")?.value, "29/02/2000");
  assert.equal(parseResumeDate("29/02/1900"), null);
});

test("duration subtracts civil days and recalculates Atual on the day of each query", () => {
  const feb28 = new Date(2024, 1, 28, 23, 59);
  const mar1 = new Date(2024, 2, 1, 0, 1);
  assert.equal(resumePeriodDurationDays("01/02/2024 - Atual", feb28), 27);
  assert.equal(resumePeriodDurationDays("01/02/2024 - Atual", mar1), 29);
  assert.equal(resumePeriodDurationDays("28/02/2024 - 01/03/2024", feb28), 2);
  assert.equal(resumePeriodDurationDays("01/02/2024 - 01/02/2024"), 0);
  assert.equal(resumePeriodDurationDays("02/03/2024 - Atual", mar1), null);
  assert.equal(resumePeriodDurationDays("Atual", mar1), null);
  assert.equal(resumePeriodDurationDays("2020", mar1), null);
  assert.equal(parseResumePeriod("2020 - atual")?.end, null);
});

test("explicit non-completion markers prevail over completion default and completion words", () => {
  for (const [status, values] of Object.entries({
    suspended: ["Curso trancado", "Matrícula suspensa", "on hold"],
    interrupted: ["Não concluído", "Não finalizado", "Abandonado", "Sem conclusão", "Cancelado", "incomplete", "not completed", "dropped out"],
    in_progress: ["Cursando", "Em andamento", "Conclusão prevista: 2027", "Previsão de conclusão 2027", "expected graduation 2027", "currently studying"],
  })) for (const text of values) {
    const result = classifyEducationRecord({ course: "Engenharia de Materiais", description: text });
    assert.equal(result.status, status, text);
    assert.equal(result.classificationSources.status, "explicit", text);
  }
  assert.equal(classifyEducationRecord({ institution: "Faculdade", period: "2020 - 2024" }).status, "unknown");
  const explicit = classifyEducationRecord({ course: "MBA em Gestão", status: "Concluído", period: "2020 - Atual" });
  assert.equal(explicit.status, "completed");
  assert.equal(explicit.classificationSources.status, "explicit");
});

test("AI import, review save and reload preserve dates, assumptions, evidence and academic snapshot", () => {
  const lines = ["Pessoa Teste", "teste@example.com", "Gerente", "Empresa Teste", "março de 2020 - Atual", "MBA em Gestão", "2020 - 2021"];
  const page: ExtractedPage = { pageNumber: 1, text: lines.join("\n"), usefulCharacterCount: 200, origin: "native_pdf", method: "pdfjs", methodVersion: "test", layoutLines: lines.map((text, index) => ({ text, x: .1, y: .1 + index * .03, width: .8, height: .02, fontSize: 12, emphasis: "regular" })) };
  const paths = ["identity.fullName", "contact.email", "experiences.a.role", "experiences.a.organization", "experiences.a.period", "education.a.course", "education.a.period"];
  const payload = { status: "complete", facts: lines.map((value, index) => ({ path: paths[index], value, sources: [`p1l${index + 1}`] })), uncertainties: [] };
  const before = JSON.stringify(payload);
  const result = structureParserIa(payload, [page], { organizationId: "test-org", sourceSha256: "a".repeat(64), provenance: { model: "synthetic", promptSha256: "b".repeat(64), responseId: "test", inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 1 } });
  const normalized = normalizeReviewDraft(result.draft);
  assert.deepEqual(validateReviewDraftForSave(normalized), []);
  assert.equal(normalized.experiences[0]?.period, "01/03/2020 - Atual");
  assert.equal(normalized.education[0]?.period, "01/01/2020 - 31/12/2021");
  assert.equal(normalized.education[0]?.status, "completed");
  assert.equal(normalized.education[0]?.classificationSources?.status, "inferred");
  assert.equal(normalized.education[0]?.classificationMethodVersion, "1.1.0");
  assert.ok(normalized.uncertainties.some((value) => value.includes("março de 2020 - Atual") && value.includes("assumidos")));
  assert.equal(result.acceptedFacts[4]?.value, lines[4]);
  assert.equal(result.fieldEvidence.find((item) => item.fieldPath.endsWith(".period"))?.text, lines[4]);
  assert.equal(JSON.stringify(payload), before);
  const reloaded = JSON.parse(JSON.stringify(normalized));
  assert.deepEqual(normalizeReviewDraft(reloaded), normalized);
  assert.ok(estimateExperienceYears(reloaded.experiences, new Date(2024, 2, 1))! > estimateExperienceYears(reloaded.experiences, new Date(2024, 1, 28))!);
  const manual = { ...normalized, experiences: [{ ...normalized.experiences[0]!, period: "2022 - 2023", source: "human" as const }] };
  assert.equal(normalizeReviewDraft(manual).experiences[0]?.period, "01/01/2022 - 31/12/2023");
});

test("native extraction preserves explicitly declared days instead of matching only month/year", () => {
  const text = "Pessoa Teste\nExperiência profissional\nGerente | Empresa Teste Ltda | 15/03/2020 - 04/02/2024\nGestão de projetos.";
  const result = buildAdaptiveExtraction([{ pageNumber: 1, text, usefulCharacterCount: text.length, origin: "manual_text", method: "manual", methodVersion: "test" }]);
  assert.equal(result.draft.experiences[0]?.period, "15/03/2020 - 04/02/2024");
});
