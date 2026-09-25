// Offline by default. Build first: pnpm run build
// Live (explicit authorization required): node scripts/evaluate-semantic-trajectory.mjs --execute
// Uses only OPENAI_API_KEY and KNOWLEDGE_RESEARCH_MODEL from the process environment.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  activities, prepareTrajectoryContext, readTrajectoryResponse, agreeTrajectoryReadings,
  trajectoryInstructions, trajectoryResponseSchema,
} from "../dist/src/domain/semanticTrajectory.js";
import {
  semanticPilotCases, semanticPilotExpectations, semanticPilotLimitation, semanticPilotPosition,
} from "../dist/src/fixtures/semanticTrajectoryPilot.js";

export const CONCURRENCY = 2;
export const TIMEOUT_MS = 90_000;
const READINGS = 2;

export function buildTrajectoryRequest(context, model) {
  return {
    model, store: false, max_output_tokens: 6000, reasoning: { effort: "low" }, instructions: trajectoryInstructions,
    // Only the shared prepared source context. No oracle, case rationale, prior response or scores.
    input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(context) }] }],
    text: { format: { type: "json_schema", name: "semantic_trajectory", strict: true, schema: trajectoryResponseSchema } },
  };
}

export function parseTrajectoryProviderResponse(body, context) {
  if (body?.status !== "completed" || body.error != null || body.incomplete_details != null || !Array.isArray(body.output)) throw new Error("TRAJECTORY_PROVIDER_INVALID");
  const messages = body.output.filter(item => item?.type === "message");
  if (messages.length !== 1 || messages[0].role !== "assistant" || messages[0].status !== "completed" || !Array.isArray(messages[0].content)) throw new Error("TRAJECTORY_PROVIDER_INVALID");
  const contents = messages[0].content;
  if (contents.length !== 1 || contents[0]?.type !== "output_text" || typeof contents[0].text !== "string") throw new Error("TRAJECTORY_PROVIDER_INVALID");
  return readTrajectoryResponse(JSON.parse(contents[0].text), context);
}

function emptyReport(mode) {
  return {
    mode, result: "NOT_RUN", baseCount: 12, variantsPerBase: 5, readingsPerCase: READINGS,
    plannedCallsPerModel: semanticPilotCases.length * READINGS, callsAttempted: 0, validReadings: 0,
    categoryAgreement: null, repeatDisagreement: null, stability: null, failureCaseIds: [],
    limitation: semanticPilotLimitation,
  };
}

const rate = (matched, total) => ({ matched, total, rate: total ? matched / total : null });

/** No disk writes, provider logging, automatic retries, budget counters or financial caps. */
export async function evaluateSemanticPilot({ execute = false, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const report = emptyReport(execute ? "live" : "offline");
  if (!execute) return report;
  const key = env.OPENAI_API_KEY?.trim();
  const model = env.KNOWLEDGE_RESEARCH_MODEL?.trim();
  if (!key || !model) return { ...report, result: "CONFIGURATION_REQUIRED" };

  // Preparation stays owned by the shared domain module. An invalid input is not truncated.
  const prepared = semanticPilotCases.map(item => {
    try { return prepareTrajectoryContext(item.profile, semanticPilotPosition); }
    catch { return null; }
  });
  const results = semanticPilotCases.map(() => Array(READINGS).fill(null));
  const jobs = semanticPilotCases.flatMap((_, caseIndex) => Array.from({ length: READINGS }, (_, readingIndex) => ({ caseIndex, readingIndex })));
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const { caseIndex, readingIndex } = jobs[cursor++];
      const original = prepared[caseIndex];
      if (!original) continue;
      // Runtime parity: fresh calls, no previous-response link, second reading reverses sources.
      const context = readingIndex === 1 ? { ...original, entries: [...original.entries].reverse() } : original;
      report.callsAttempted++;
      try {
        const response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST", redirect: "error",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(buildTrajectoryRequest(context, model)),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) { await response.body?.cancel(); continue; }
        results[caseIndex][readingIndex] = parseTrajectoryProviderResponse(await response.json(), context);
        report.validReadings++;
      } catch {
        // Provider errors may contain prompts/credentials. Retain only the synthetic case ID below.
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const failures = new Set();
  const categories = Object.fromEntries(activities.map(activity => [activity, { matched: 0, total: 0 }]));
  let matchedItems = 0, expectedItems = 0, matchedReadings = 0, repeatPairs = 0, disagreements = 0;
  semanticPilotCases.forEach((item, index) => {
    const expected = semanticPilotExpectations[item.baseId].classes;
    for (const reading of results[index]) {
      let matches = reading !== null;
      for (const [id, activity] of Object.entries(expected)) {
        expectedItems++;
        categories[activity].total++;
        if (reading?.items.find(row => row.id === id)?.activity === activity) {
          matchedItems++; categories[activity].matched++;
        } else matches = false;
      }
      if (matches && reading.items.length === Object.keys(expected).length) matchedReadings++;
      else failures.add(item.id);
    }
    const [first, second] = results[index];
    if (first && second) {
      repeatPairs++;
      if (!agreeTrajectoryReadings(first, second)) { disagreements++; failures.add(item.id); }
    }
  });
  let stableBases = 0, evaluatedBases = 0;
  for (const baseId of new Set(semanticPilotCases.map(item => item.baseId))) {
    const indices = semanticPilotCases.flatMap((item, index) => item.baseId === baseId ? [index] : []);
    const readings = indices.flatMap(index => results[index]);
    if (readings.some(reading => reading === null)) continue;
    evaluatedBases++;
    if (readings.every(reading => agreeTrajectoryReadings(readings[0], reading))) stableBases++;
    else for (const index of indices) failures.add(semanticPilotCases[index].id);
  }
  report.categoryAgreement = {
    items: rate(matchedItems, expectedItems), readings: rate(matchedReadings, jobs.length),
    byExpectedCategory: Object.fromEntries(Object.entries(categories).map(([activity, counts]) => [activity, rate(counts.matched, counts.total)])),
  };
  report.repeatDisagreement = { disagreements, evaluatedPairs: repeatPairs, unavailablePairs: semanticPilotCases.length - repeatPairs, rate: repeatPairs ? disagreements / repeatPairs : null };
  report.stability = { stableBases, evaluatedBases, totalBases: report.baseCount, rate: evaluatedBases ? stableBases / evaluatedBases : null };
  report.failureCaseIds = [...failures].sort();
  report.result = report.validReadings === jobs.length && failures.size === 0 ? "PASS" : "FAIL";
  return report;
}

export async function main(args = process.argv.slice(2), dependencies = {}) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--execute")) return { ...emptyReport("offline"), result: "INVALID_ARGUMENTS" };
  return evaluateSemanticPilot({ ...dependencies, execute: args[0] === "--execute" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let report;
  try { report = await main(); }
  catch { report = { ...emptyReport("offline"), result: "RUNNER_FAILED" }; }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = ["PASS", "NOT_RUN"].includes(report.result) ? 0 : 1;
}
