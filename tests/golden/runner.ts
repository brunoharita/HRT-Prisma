import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DeterministicExtractionProvider } from "../../src/ai/deterministicExtractor.js";
import { evaluateMatch } from "../../src/ai/matching.js";
import { searchProfiles } from "../../src/ai/search.js";
import { processResume } from "../../src/application/processResume.js";
import type { RequirementAssessmentStatus, Vacancy, VacancyRequirement } from "../../src/domain/types.js";
import { JsonTalentRepository } from "../../src/infrastructure/jsonRepository.js";
import { calculateMatchingScore, MATCHING_SCORE_CONTRACT_VERSION, type EvidenceCoverageState, type VacancyFunctionAssessment } from "../../web/src/domain/matchingScore.js";
import { VACANCY_MATCHING_VERSION, type VacancyAreaRelationStatus, type VacancyMatchStatus, type VacancyRequirementMatch } from "../../web/src/domain/vacancy.js";

interface ExtractionCase {
  id: string;
  fixture: string;
  fullName: string;
  requiredExplicit: string[];
  requiredInferred: string[];
  requiredContexts: string[];
  forbidden: string[];
}

interface MatchingCase {
  id: string;
  fixture: string;
  requirements: VacancyRequirement[];
  expectedStatuses: Record<string, RequirementAssessmentStatus>;
  expectedGapCount: number;
  expectedSufficiency: "sufficient_evidence" | "insufficient_evidence";
}

interface RetrievalCase {
  id: string;
  fixtures: string[];
  query: string;
  expectedNames: string[];
}

interface MatchingScoreGoldenCase {
  id: string;
  area: { applicable: boolean; status: VacancyAreaRelationStatus; coverageState: EvidenceCoverageState };
  position: { applicable: boolean; basePoints: 20 | 17 | 12 | 8 | 0; seniorityAdjustment: 0 | -1 | -4; coverageState: EvidenceCoverageState };
  requirements: Array<{ importance: "required" | "desired" | "unclassified"; status: VacancyMatchStatus }>;
  expectedScore: number | null;
  expectedCoverage: number;
  expectedStatus: "definitive" | "provisional" | "unavailable";
}

interface GoldenResult {
  suite: "extraction" | "matching";
  caseId: string;
  status: "passed" | "failed" | "regression";
  differences: string[];
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const sourceGoldenDirectory = resolve(currentDirectory, "../../../tests/golden");
const organizationId = "20000000-0000-4000-8000-000000000001";

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function processFixture(fixturePath: string, storePath: string) {
  const repository = new JsonTalentRepository(storePath);
  const provider = new DeterministicExtractionProvider();
  const sourceText = await readFile(fixturePath, "utf8");
  const result = await processResume(repository, provider, {
    organizationId,
    filename: fixturePath.split(/[\\/]/).at(-1) ?? "fixture.txt",
    mediaType: "text/plain",
    sourceText,
  });
  return { repository, result };
}

async function runExtractionCases(tempDirectory: string): Promise<GoldenResult[]> {
  const base = join(sourceGoldenDirectory, "extraction");
  const cases = await loadJson<ExtractionCase[]>(join(base, "cases.json"));
  const results: GoldenResult[] = [];
  for (const item of cases) {
    const differences: string[] = [];
    const { result } = await processFixture(join(base, item.fixture), join(tempDirectory, `${item.id}.json`));
    if (!result.ok) {
      differences.push(`processing failed: ${result.document.failure?.category ?? "unknown"}`);
    } else {
      if (result.profile.fullName !== item.fullName) differences.push(`name expected=${item.fullName} actual=${result.profile.fullName}`);
      const explicit = new Set(result.profile.competencies.filter((signal) => signal.classification === "explicit").map((signal) => signal.normalizedName));
      const inferred = new Set(result.profile.competencies.filter((signal) => signal.classification === "inferred").map((signal) => signal.normalizedName));
      for (const required of item.requiredExplicit) if (!explicit.has(required)) differences.push(`missing explicit competency: ${required}`);
      for (const required of item.requiredInferred) if (!inferred.has(required)) differences.push(`missing inference: ${required}`);
      for (const required of item.requiredContexts) if (!result.profile.professionalContexts.includes(required)) differences.push(`missing context: ${required}`);
      const allKnowledge = new Set([...explicit, ...inferred, ...result.profile.professionalContexts]);
      for (const forbidden of item.forbidden) if (allKnowledge.has(forbidden)) differences.push(`forbidden invention: ${forbidden}`);
      for (const evidence of result.evidence) if (!evidence.locator.quotedText) differences.push(`evidence without source text: ${evidence.id}`);
    }
    results.push({ suite: "extraction", caseId: item.id, status: differences.length === 0 ? "passed" : "regression", differences });
  }
  return results;
}

async function runMatchingCases(tempDirectory: string): Promise<GoldenResult[]> {
  const base = join(sourceGoldenDirectory, "matching");
  const cases = await loadJson<MatchingCase[]>(join(base, "cases.json"));
  const results: GoldenResult[] = [];
  for (const item of cases) {
    const differences: string[] = [];
    const fixturePath = resolve(base, item.fixture);
    const { repository, result } = await processFixture(fixturePath, join(tempDirectory, `matching-${item.id}.json`));
    if (!result.ok) {
      differences.push(`processing failed: ${result.document.failure?.category ?? "unknown"}`);
    } else {
      const evidence = await repository.listEvidence(organizationId);
      const inferences = await repository.listInferences(organizationId);
      const vacancy: Vacancy = {
        id: `30000000-0000-4000-8000-${item.id.padEnd(12, "0").slice(0, 12)}`,
        organizationId,
        roleName: item.id,
        requirements: item.requirements,
      };
      const match = evaluateMatch({ profile: result.profile, vacancy, evidence, inferences });
      for (const [requirementId, expected] of Object.entries(item.expectedStatuses)) {
        const actual = match.requirements.find((requirement) => requirement.requirementId === requirementId)?.status;
        if (actual !== expected) differences.push(`status ${requirementId} expected=${expected} actual=${actual ?? "missing"}`);
      }
      if (match.gaps.length !== item.expectedGapCount) differences.push(`gaps expected=${item.expectedGapCount} actual=${match.gaps.length}`);
      if (match.sufficiency !== item.expectedSufficiency) differences.push(`sufficiency expected=${item.expectedSufficiency} actual=${match.sufficiency}`);
      if (match.requirements.some((requirement) => !requirement.explanation)) differences.push("requirement without explanation");
    }
    results.push({ suite: "matching", caseId: item.id, status: differences.length === 0 ? "passed" : "regression", differences });
  }
  return results;
}

async function runRetrievalCases(tempDirectory: string): Promise<GoldenResult[]> {
  const base = join(sourceGoldenDirectory, "matching");
  const cases = await loadJson<RetrievalCase[]>(join(base, "retrieval-cases.json"));
  const results: GoldenResult[] = [];
  for (const item of cases) {
    const differences: string[] = [];
    const profiles = [];
    const evidence = [];
    const inferences = [];
    for (const [index, fixture] of item.fixtures.entries()) {
      const processed = await processFixture(resolve(base, fixture), join(tempDirectory, `retrieval-${item.id}-${index}.json`));
      if (!processed.result.ok) {
        differences.push(`processing failed: ${fixture}`);
        continue;
      }
      profiles.push(processed.result.profile);
      evidence.push(...await processed.repository.listEvidence(organizationId));
      inferences.push(...await processed.repository.listInferences(organizationId));
    }
    const actualNames = searchProfiles({ query: item.query, profiles, evidence, inferences }).map((result) => result.fullName);
    if (JSON.stringify(actualNames) !== JSON.stringify(item.expectedNames)) {
      differences.push(`names expected=${JSON.stringify(item.expectedNames)} actual=${JSON.stringify(actualNames)}`);
    }
    results.push({ suite: "matching", caseId: item.id, status: differences.length === 0 ? "passed" : "regression", differences });
  }
  return results;
}

async function runMatchingScoreCases(): Promise<GoldenResult[]> {
  const cases = await loadJson<MatchingScoreGoldenCase[]>(join(sourceGoldenDirectory, "matching", "score-cases.json"));
  return cases.map((item) => {
    const differences: string[] = [];
    const evidence = { label: "Evidência sintética", source: "Fixture golden", sourceId: `evidence-${item.id}`, fieldPath: "fixture", dimension: "competency" as const };
    const requirements: VacancyRequirementMatch[] = item.requirements.map((requirement, index) => ({
      requirement: {
        stableId: `${item.id}-${index}`,
        label: `Requisito ${index + 1}`,
        category: "competency",
        importance: requirement.importance,
        observedTerm: null,
        conceptId: null,
        relationMode: "direct",
        relatedSignals: [],
      },
      status: requirement.status,
      evidence: requirement.status === "no_evidence" ? [] : [evidence],
      explanation: requirement.status === "no_evidence" ? "Sem evidência suficiente nas informações publicadas." : "Evidência sintética avaliada.",
      relatedSignal: requirement.status === "related_signal" ? "Sinal sintético" : null,
    }));
    const functionAssessment: VacancyFunctionAssessment = {
      relation: item.position.basePoints === 20 ? "same_function" : item.position.basePoints === 17 ? "equivalent_function" : item.position.basePoints === 12 ? "related_function" : item.position.basePoints === 8 ? "contextual_relation" : "no_relation",
      basePoints: item.position.basePoints,
      seniorityAdjustment: item.position.seniorityAdjustment,
      seniorityRelation: item.position.seniorityAdjustment === -4 ? "materially_above" : item.position.seniorityAdjustment === -1 ? "adjacent_below" : "aligned",
      coverageState: item.position.coverageState,
      evidence: item.position.coverageState === "evaluated_relation" ? [evidence] : [],
      explanation: "Função avaliada pela fixture golden.",
    };
    const result = calculateMatchingScore({
      areaApplicable: item.area.applicable,
      functionApplicable: item.position.applicable,
      areaRelation: { status: item.area.status, coverageState: item.area.coverageState, evidence: item.area.status === "none" ? [] : [evidence], explanation: "Área avaliada pela fixture golden." },
      functionAssessment,
      requirements,
      unclassifiedRequirementCount: item.requirements.filter((requirement) => requirement.importance === "unclassified").length,
      positionVersion: "golden-position-v1",
      positionVersionNumber: 1,
      profileVersion: "golden-profile-v1",
      profileVersionNumber: 1,
      matchingContractVersion: VACANCY_MATCHING_VERSION,
      scoreContractVersion: MATCHING_SCORE_CONTRACT_VERSION,
    });
    if (result.score !== item.expectedScore) differences.push(`score expected=${item.expectedScore} actual=${result.score}`);
    if (result.coveragePercent !== item.expectedCoverage) differences.push(`coverage expected=${item.expectedCoverage} actual=${result.coveragePercent}`);
    if (result.status !== item.expectedStatus) differences.push(`status expected=${item.expectedStatus} actual=${result.status}`);
    if (result.score !== null && result.score > result.coveragePercent) differences.push("score exceeded coverage");
    return { suite: "matching", caseId: `score-${item.id}`, status: differences.length === 0 ? "passed" : "regression", differences };
  });
}

const tempDirectory = await mkdtemp(join(tmpdir(), "prisma-golden-"));
try {
  const results = [...await runExtractionCases(tempDirectory), ...await runMatchingCases(tempDirectory), ...await runRetrievalCases(tempDirectory), ...await runMatchingScoreCases()];
  const failed = results.filter((result) => result.status !== "passed");
  process.stdout.write(`${JSON.stringify({ summary: { passed: results.length - failed.length, failed: failed.length, regression: failed.length }, cases: results }, null, 2)}\n`);
  if (failed.length > 0) process.exitCode = 1;
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
