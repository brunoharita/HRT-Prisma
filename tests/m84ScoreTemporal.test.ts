import assert from "node:assert/strict";
import test from "node:test";
import { calculateMatchingScore, MATCHING_SCORE_CONTRACT_VERSION, type MatchingScoreInput, type VacancyFunctionAssessment } from "../web/src/domain/matchingScore.js";
import { VACANCY_MATCHING_VERSION } from "../web/src/domain/vacancy.js";

const referenceDate = "2026-09-27";
const functionAssessment: VacancyFunctionAssessment = { relation: "no_relation", basePoints: 0, seniorityAdjustment: 0, seniorityRelation: "not_available", coverageState: "not_applicable", evidence: [], explanation: "Não aplicável." };
const areaRelation = { status: "none" as const, coverageState: "not_applicable" as const, evidence: [], explanation: "Não aplicável." };

function score(periods: string[], date = referenceDate): ReturnType<typeof calculateMatchingScore> {
  const input: MatchingScoreInput = {
    areaApplicable: false, functionApplicable: false, areaRelation, functionAssessment, requirements: [], unclassifiedRequirementCount: 0,
    relatedExperiences: periods.map((period, index) => ({ id: `experience-${index}`, period, evidence: [{ reference: `experience-${index}`, label: `Experiência ${index + 1}`, source: "Experiência relacionada" }] })),
    referenceDate: date, positionVersion: "position-1", positionVersionNumber: 1, profileVersion: "profile-1", profileVersionNumber: 1,
    matchingContractVersion: VACANCY_MATCHING_VERSION, scoreContractVersion: MATCHING_SCORE_CONTRACT_VERSION,
  };
  return calculateMatchingScore(input);
}

test("M8.4 converte os quatro máximos antigos e adiciona duas dimensões de 10", () => {
  const result = score(["01/2020 - 09/2026"]);
  assert.deepEqual(result.dimensions.map(item => [item.key, item.applicablePoints]), [
    ["area", 0], ["position", 0], ["required", 0], ["desired", 0], ["duration", 10], ["recency", 10],
  ]);
  assert.equal(result.dimensions.find(item => item.key === "duration")?.earnedPoints, 10);
  assert.equal(result.dimensions.find(item => item.key === "recency")?.earnedPoints, 10);
  assert.equal(result.score, 100);
});

test("M8.4 duração respeita os cinco limites em meses inteiros", () => {
  const cases = [["10/2025 - 08/2026", 0], ["09/2025 - 08/2026", 3], ["09/2024 - 08/2026", 5], ["09/2023 - 08/2026", 7], ["09/2021 - 08/2026", 10]] as const;
  for (const [period, expected] of cases) assert.equal(score([period]).dimensions.find(item => item.key === "duration")?.earnedPoints, expected, period);
});

test("M8.4 recência respeita atuação atual e os quatro limites de encerramento", () => {
  const cases = [["01/2026 - Atual", 10], ["01/2026 - 03/2026", 7], ["01/2025 - 09/2025", 5], ["01/2025 - 03/2025", 3], ["01/2023 - 09/2023", 0]] as const;
  for (const [period, expected] of cases) assert.equal(score([period]).dimensions.find(item => item.key === "recency")?.earnedPoints, expected, period);
});

test("M8.4 une sobreposição antes de somar e mantém data de referência no fingerprint", () => {
  const result = score(["01/2020 - 12/2021", "01/2021 - 12/2022"]);
  assert.equal(result.dimensions.find(item => item.key === "duration")?.earnedPoints, 7);
  assert.equal(score(["01/2020 - 12/2021", "01/2021 - 12/2022"]).inputFingerprint, result.inputFingerprint);
  assert.notEqual(score(["01/2020 - 12/2021", "01/2021 - 12/2022"], "2026-09-28").inputFingerprint, result.inputFingerprint);
});

test("M8.4 não transforma período anual parcial ou ausência de data em zero", () => {
  const partial = score(["2024 - Atual"]);
  assert.equal(partial.score, null);
  assert.equal(partial.dimensions.find(item => item.key === "duration")?.determined, false);
  assert.equal(partial.dimensions.find(item => item.key === "duration")?.earnedPoints, 0);
  assert.equal(partial.dimensions.find(item => item.key === "recency")?.determined, true);
  const missing = score([""]);
  assert.equal(missing.score, null);
  assert.match(missing.unavailableReason ?? "", /período completo/i);
});

test("M8.4 rejeita atuação atual com início posterior à data de referência", () => {
  const result = score(["01/2027 - Atual"]);
  assert.equal(result.score, null);
  assert.equal(result.dimensions.find(item => item.key === "duration")?.determined, false);
  assert.equal(result.dimensions.find(item => item.key === "recency")?.determined, false);
});
