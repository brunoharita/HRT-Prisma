// Offline by default. Build first using the existing project build.
// Paid calls require separate approval: node scripts/evaluate-semantic-trajectory-complex.mjs --execute
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildTrajectoryRequest, parseTrajectoryProviderResponse, CONCURRENCY, TIMEOUT_MS } from "./evaluate-semantic-trajectory.mjs";
import { activities, prepareTrajectoryContext, agreeTrajectoryReadings, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION } from "../dist/src/domain/semanticTrajectory.js";
import { semanticComplexPilotCases as cases, semanticComplexPilotExpectations as expectations,
  semanticComplexPilotLimitation, semanticComplexPilotPosition } from "../dist/src/fixtures/semanticTrajectoryComplexPilot.js";

const READINGS = 2;
const baseIds = [...new Set(cases.map(item => item.baseId))];
const rate = (matched, total) => ({ matched, total, rate: total ? matched / total : null });
function emptyReport(mode) {
  return {
    mode, result: "NOT_RUN", methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION,
    baseCount: baseIds.length, caseCount: cases.length,
    variantsPerBase: Object.fromEntries(baseIds.map(id => [id, cases.filter(item => item.baseId === id).length])),
    readingsPerCase: READINGS, plannedCallsPerModel: cases.length * READINGS,
    fixtureValidation: "NOT_RUN", callsAttempted: 0, validReadings: 0,
    categoryAgreement: null, repeatDisagreement: null, stability: null, failures: [],
    limitation: semanticComplexPilotLimitation,
  };
}

export function prepareComplexPilot() {
  if (new Set(cases.map(item => item.id)).size !== cases.length) throw new Error("COMPLEX_FIXTURE_INVALID");
  if (Object.keys(expectations).sort().join() !== [...baseIds].sort().join()) throw new Error("COMPLEX_FIXTURE_INVALID");
  return cases.map(item => {
    const context = prepareTrajectoryContext(item.profile, semanticComplexPilotPosition);
    const expected = expectations[item.baseId]?.classes;
    if (!expected || context.entries.length !== 8 || context.entries.filter(entry => entry.kind === "experience").length !== 6
      || context.entries.map(entry => entry.id).sort().join() !== Object.keys(expected).sort().join()
      || Object.values(expected).some(value => !activities.includes(value))) throw new Error("COMPLEX_FIXTURE_INVALID");
    return context;
  });
}

// Diagnostic only: never repair a quote, relax the shared parser or print provider/source text.
function invalidReadingDetails(body, context) {
  try {
    const message = body.output?.find(item => item?.type === "message");
    const decoded = JSON.parse(message?.content?.[0]?.text);
    if (!Array.isArray(decoded?.items)) return [];
    return decoded.items.flatMap(item => {
      const entry = context.entries.find(source => source.id === item?.id);
      if (!entry) return [];
      if (typeof item.quote !== "string") return [{ entryId: entry.id, reason: "QUOTE_NOT_STRING" }];
      const quoteLength = item.quote.length, sourceLength = entry.text.length;
      if (!entry.text.includes(item.quote)) return [{ entryId: entry.id, reason: "QUOTE_NOT_LITERAL", quoteLength, sourceLength }];
      if (item.activity !== "unclear" && item.quote.trim().length < Math.min(6, sourceLength)) {
        return [{ entryId: entry.id, reason: "QUOTE_TOO_SHORT", quoteLength, sourceLength }];
      }
      return [];
    });
  } catch { return []; }
}

/** No disk writes, retries, monetary limits, real profiles or production DB access. */
export async function evaluateSemanticComplexPilot({ execute = false, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const report = emptyReport(execute ? "live" : "offline");
  let prepared;
  try { prepared = prepareComplexPilot(); report.fixtureValidation = "PASS"; }
  catch { return { ...report, fixtureValidation: "FAIL", result: "FIXTURE_INVALID" }; }
  if (!execute) return report;
  const key = env.OPENAI_API_KEY?.trim(), model = env.KNOWLEDGE_RESEARCH_MODEL?.trim();
  if (!key || !model) return { ...report, result: "CONFIGURATION_REQUIRED" };
  const results = cases.map(() => Array(READINGS).fill(null));
  const jobs = cases.flatMap((_, caseIndex) => Array.from({ length: READINGS }, (_, readingIndex) => ({ caseIndex, readingIndex })));
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const { caseIndex, readingIndex } = jobs[cursor++];
      const original = prepared[caseIndex];
      const context = readingIndex ? { ...original, entries: [...original.entries].reverse() } : original;
      const location = { caseId: cases[caseIndex].id, readingIndex };
      report.callsAttempted++;
      try {
        const response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          // Shared request builder receives source context only, never expectations or prior outputs.
          body: JSON.stringify(buildTrajectoryRequest(context, model)),
        });
        if (!response.ok) { await response.body?.cancel(); report.failures.push({ ...location, reason: "PROVIDER_HTTP_ERROR" }); continue; }
        const body = await response.json();
        try { results[caseIndex][readingIndex] = parseTrajectoryProviderResponse(body, context); report.validReadings++; }
        catch { report.failures.push({ ...location, reason: "READING_INVALID", details: invalidReadingDetails(body, context) }); }
      } catch { report.failures.push({ ...location, reason: "PROVIDER_UNAVAILABLE_OR_INVALID_JSON" }); }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  let matchedItems = 0, expectedItems = 0, matchedReadings = 0, evaluatedPairs = 0, disagreements = 0;
  const categories = Object.fromEntries(activities.map(activity => [activity, { matched: 0, total: 0 }]));
  cases.forEach((item, index) => {
    const expected = expectations[item.baseId].classes;
    results[index].forEach((reading, readingIndex) => {
      let matches = reading !== null;
      for (const [entryId, activity] of Object.entries(expected)) {
        expectedItems++; categories[activity].total++;
        const actual = reading?.items.find(row => row.id === entryId)?.activity;
        if (actual === activity) { matchedItems++; categories[activity].matched++; }
        else {
          matches = false;
          // Invalid/unavailable readings are already reported; do not invent their classifications.
          if (reading) report.failures.push({ caseId: item.id, readingIndex, entryId, reason: "CATEGORY_MISMATCH", expected: activity, actual: actual ?? null });
        }
      }
      if (matches && reading.items.length === Object.keys(expected).length) matchedReadings++;
    });
    const [first, second] = results[index];
    if (first && second) {
      evaluatedPairs++;
      if (!agreeTrajectoryReadings(first, second)) { disagreements++; report.failures.push({ caseId: item.id, reason: "READINGS_DISAGREE" }); }
    }
  });
  let stableBases = 0, evaluatedBases = 0;
  for (const baseId of baseIds) {
    const readings = cases.flatMap((item, index) => item.baseId === baseId ? results[index] : []);
    if (readings.some(reading => reading === null)) continue;
    evaluatedBases++;
    if (readings.every(reading => agreeTrajectoryReadings(readings[0], reading))) stableBases++;
    else report.failures.push({ baseId, reason: "VARIANTS_DISAGREE" });
  }
  report.categoryAgreement = { items: rate(matchedItems, expectedItems), readings: rate(matchedReadings, jobs.length),
    byExpectedCategory: Object.fromEntries(Object.entries(categories).map(([activity, counts]) => [activity, rate(counts.matched, counts.total)])) };
  report.repeatDisagreement = { disagreements, evaluatedPairs, unavailablePairs: cases.length - evaluatedPairs, rate: evaluatedPairs ? disagreements / evaluatedPairs : null };
  report.stability = { stableBases, evaluatedBases, totalBases: baseIds.length, rate: evaluatedBases ? stableBases / evaluatedBases : null };
  report.failures.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  report.result = report.validReadings === jobs.length && report.failures.length === 0 ? "PASS" : "FAIL";
  return report;
}

export async function main(args = process.argv.slice(2), dependencies = {}) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--execute")) return { ...emptyReport("offline"), result: "INVALID_ARGUMENTS" };
  return evaluateSemanticComplexPilot({ ...dependencies, execute: args[0] === "--execute" });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let report;
  try { report = await main(); } catch { report = { ...emptyReport("offline"), result: "RUNNER_FAILED" }; }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = ["PASS", "NOT_RUN"].includes(report.result) ? 0 : 1;
}
