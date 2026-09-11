import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map(process.argv.slice(2).flatMap((value, index, all) => value.startsWith("--") ? [[value, all[index + 1]]] : []));
const manifestPath = resolve(args.get("--manifest") ?? "benchmarks/m5.6/private/manifest.json");
const outputPath = resolve(args.get("--output") ?? "benchmarks/m5.6/output/report.json");

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  process.stderr.write(`BLOCKED: manifesto autorizado ausente em ${manifestPath}\n`);
  process.exitCode = 2;
  process.exit();
}

if (!Array.isArray(manifest.cases) || manifest.cases.length < 8 || manifest.cases.length > 12) {
  process.stderr.write("BLOCKED: o benchmark M5.6 exige de 8 a 12 currículos reais autorizados.\n");
  process.exitCode = 2;
  process.exit();
}

const results = [];
for (const item of manifest.cases) {
  const groundTruth = await loadJson(item.groundTruth);
  const baseline = await loadJson(item.baseline);
  const m56 = await loadJson(item.m56);
  results.push({
    id: item.id,
    kind: item.kind,
    clearAndSupported: item.clearAndSupported === true,
    requiresDocumentIntelligence: item.requiresDocumentIntelligence === true,
    baseline: scoreRun(groundTruth, baseline),
    m56: scoreRun(groundTruth, m56),
  });
}

const eligible = results.filter((item) => item.clearAndSupported);
const consolidated = {
  baseline: consolidate(results.map((item) => item.baseline)),
  m56: consolidate(results.map((item) => item.m56)),
  eligibleM56CorrectFieldRate: average(eligible.map((item) => item.m56.semantic.correctFieldRate)),
};
const criticalRegression = consolidated.m56.semantic.unsupportedFacts > consolidated.baseline.semantic.unsupportedFacts
  || consolidated.m56.evidence.spatialCorrectRate < consolidated.baseline.evidence.spatialCorrectRate;
const providerFallbacks = results.filter((item) => item.requiresDocumentIntelligence && item.m56.documentIntelligence.fallbackUsed).length;
const humanWorkImproved = consolidated.m56.semantic.interventionRate < consolidated.baseline.semantic.interventionRate;
const cutover = eligible.length > 0
  && consolidated.eligibleM56CorrectFieldRate >= 0.9
  && consolidated.m56.semantic.correctFieldRate > consolidated.baseline.semantic.correctFieldRate
  && humanWorkImproved
  && providerFallbacks === 0
  && !criticalRegression;
const report = {
  contractVersion: "m5.6-benchmark-1.0.0",
  generatedAt: new Date().toISOString(),
  sourceManifest: manifestPath,
  caseCount: results.length,
  results,
  consolidated,
  cutover: {
    status: cutover ? "PASS" : "BLOCKED",
    targetCorrectFieldRate: 0.9,
    criticalRegression,
    providerFallbacks,
    humanWorkImproved,
    reasons: cutover ? ["quality_target_superiority_and_human_work_reduction_proven"] : [
      ...(consolidated.eligibleM56CorrectFieldRate < 0.9 ? ["quality_target_not_met"] : []),
      ...(consolidated.m56.semantic.correctFieldRate <= consolidated.baseline.semantic.correctFieldRate ? ["baseline_superiority_not_proven"] : []),
      ...(!humanWorkImproved ? ["human_work_reduction_not_proven"] : []),
      ...(providerFallbacks > 0 ? ["required_provider_fallback_detected"] : []),
      ...(criticalRegression ? ["critical_regression_detected"] : []),
    ],
  },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ outputPath, caseCount: results.length, consolidated, cutover: report.cutover }, null, 2)}\n`);
if (!cutover) process.exitCode = 2;

async function loadJson(path) {
  return JSON.parse(await readFile(resolve(dirname(manifestPath), path), "utf8"));
}

function scoreRun(truth, run) {
  const truthFields = flattenFields(truth.fields ?? {});
  const runFields = flattenFields(run.fields ?? {});
  const expected = new Map(truthFields.map((entry) => [entry.key, normalize(entry.value)]));
  const actual = new Map(runFields.map((entry) => [entry.key, normalize(entry.value)]));
  const perField = [...new Set([...expected.keys(), ...actual.keys()])].sort().map((field) => ({
    field,
    expected: expected.has(field),
    extracted: actual.has(field),
    correct: expected.has(field) && actual.has(field) && expected.get(field) === actual.get(field),
    unsupported: !expected.has(field) && actual.has(field),
  }));
  const truePositive = perField.filter((item) => item.correct).length;
  const unsupported = perField.filter((item) => item.unsupported || (item.expected && item.extracted && !item.correct)).length;
  const expectedCount = expected.size;
  const extractedCount = actual.size;
  const recall = ratio(truePositive, expectedCount);
  const precision = ratio(truePositive, extractedCount);
  const correctEvidence = Number(run.evidence?.correct ?? 0);
  const evidenceCount = Number(run.evidence?.total ?? 0);
  return {
    documentIntelligence: {
      readingOrderRate: ratio(Number(run.documentIntelligence?.readingOrderCorrect ?? 0), Number(truth.documentIntelligence?.readingOrderItems ?? 0)),
      blockRecall: ratio(Number(run.documentIntelligence?.blocksCorrect ?? 0), Number(truth.documentIntelligence?.blocksExpected ?? 0)),
      fallbackUsed: run.performance?.fallbackUsed === true,
    },
    semantic: {
      perField,
      expectedFields: expectedCount,
      extractedFields: extractedCount,
      correctFields: truePositive,
      correctFieldRate: recall,
      factualRecall: recall,
      factualPrecision: precision,
      unsupportedFacts: unsupported,
      interventionRate: ratio(Number(run.humanReview?.fieldsRequiringIntervention ?? expectedCount - truePositive), Math.max(expectedCount, 1)),
    },
    evidence: { correct: correctEvidence, total: evidenceCount, spatialCorrectRate: ratio(correctEvidence, evidenceCount) },
    performance: {
      totalMs: Number(run.performance?.totalMs ?? 0),
      stages: run.performance?.stages ?? {},
    },
  };
}

function consolidate(runs) {
  return {
    documentIntelligence: {
      readingOrderRate: average(runs.map((run) => run.documentIntelligence.readingOrderRate)),
      blockRecall: average(runs.map((run) => run.documentIntelligence.blockRecall)),
      fallbackRate: ratio(runs.filter((run) => run.documentIntelligence.fallbackUsed).length, runs.length),
    },
    semantic: {
      correctFieldRate: average(runs.map((run) => run.semantic.correctFieldRate)),
      factualRecall: average(runs.map((run) => run.semantic.factualRecall)),
      factualPrecision: average(runs.map((run) => run.semantic.factualPrecision)),
      unsupportedFacts: runs.reduce((sum, run) => sum + run.semantic.unsupportedFacts, 0),
      interventionRate: average(runs.map((run) => run.semantic.interventionRate)),
    },
    evidence: { spatialCorrectRate: average(runs.map((run) => run.evidence.spatialCorrectRate)) },
    performance: { averageTotalMs: average(runs.map((run) => run.performance.totalMs)) },
  };
}

function flattenFields(value, prefix = "") {
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenFields(item, `${prefix}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => flattenFields(item, prefix ? `${prefix}.${key}` : key));
  return value === null || value === "" ? [] : [{ key: prefix, value }];
}

function normalize(value) {
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1_000_000) / 1_000_000 : 0;
}

function average(values) {
  return ratio(values.reduce((sum, value) => sum + value, 0), values.length);
}
