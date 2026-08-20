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

const tempDirectory = await mkdtemp(join(tmpdir(), "prisma-golden-"));
try {
  const results = [...await runExtractionCases(tempDirectory), ...await runMatchingCases(tempDirectory), ...await runRetrievalCases(tempDirectory)];
  const failed = results.filter((result) => result.status !== "passed");
  process.stdout.write(`${JSON.stringify({ summary: { passed: results.length - failed.length, failed: failed.length, regression: failed.length }, cases: results }, null, 2)}\n`);
  if (failed.length > 0) process.exitCode = 1;
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
