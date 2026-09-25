import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SemanticContext } from "../src/domain/semanticTrajectory.js";
import { semanticComplexPilotCases as cases, semanticComplexPilotExpectations as expectations } from "../src/fixtures/semanticTrajectoryComplexPilot.js";

const runner = await import(pathToFileURL(resolve("scripts/evaluate-semantic-trajectory-complex.mjs")).href);
const env = { OPENAI_API_KEY: "SYNTHETIC_SECRET", KNOWLEDGE_RESEARCH_MODEL: "synthetic-model" };

test("complex corpus stays offline by default, with 15 source-only eight-entry cases", async () => {
  const report = await runner.main([], { env, fetchImpl: () => { throw new Error("network forbidden"); } });
  assert.equal(report.result, "NOT_RUN");
  assert.equal(report.fixtureValidation, "PASS");
  assert.equal(report.callsAttempted, 0);
  assert.equal(report.plannedCallsPerModel, 30);
  const prepared = runner.prepareComplexPilot() as SemanticContext[];
  assert.equal(prepared.length, 15);
  assert.ok(prepared.every(context => context.entries.length === 8));
  assert.equal((await runner.main(["--unknown"])).result, "INVALID_ARGUMENTS");
  assert.equal((await runner.main(["--execute"], { env: {} })).result, "CONFIGURATION_REQUIRED");
});

for (const invalidQuote of [false, true]) {
  test(`complex runner ${invalidQuote ? "rejects fabricated quotes without leaking them" : "checks repeated and variant labels without sending oracle"}`, async () => {
    let calls = 0;
    const prepared = runner.prepareComplexPilot() as SemanticContext[];
    const normalized = (context: SemanticContext) => JSON.stringify({ ...context, entries: [...context.entries].sort((a, b) => a.id.localeCompare(b.id)) });
    const report = await runner.main(["--execute"], { env, fetchImpl: async (_url: string, options: RequestInit) => {
      calls++;
      const request = JSON.parse(String(options.body));
      const context = JSON.parse(request.input[0].content[0].text) as SemanticContext;
      const index = prepared.findIndex(source => normalized(source) === normalized(context));
      assert.ok(index >= 0);
      assert.deepEqual(Object.keys(context).sort(), Object.keys(prepared[index]!).sort());
      assert.doesNotMatch(request.input[0].content[0].text, /grounding|expected|baseId|classes/);
      const expected = expectations[cases[index]!.baseId]!.classes;
      const items = context.entries.map(entry => ({ id: entry.id, activity: expected[entry.id], quote: invalidQuote ? "PRIVATE_FABRICATED_QUOTE" : entry.text }));
      return { ok: true, json: async () => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items }) }] }] }) };
    } });
    assert.equal(calls, 30);
    assert.equal(report.result, invalidQuote ? "FAIL" : "PASS");
    assert.equal(report.validReadings, invalidQuote ? 0 : 30);
    assert.equal(report.categoryAgreement.items.matched, invalidQuote ? 0 : 240);
    assert.equal(report.repeatDisagreement.evaluatedPairs, invalidQuote ? 0 : 15);
    assert.equal(report.stability.stableBases, invalidQuote ? 0 : 3);
    assert.doesNotMatch(JSON.stringify(report), /PRIVATE_FABRICATED_QUOTE|SYNTHETIC_SECRET|Bearer/);
    if (invalidQuote) assert.ok(report.failures.every((failure: { reason: string }) => failure.reason === "READING_INVALID"));
  });
}
