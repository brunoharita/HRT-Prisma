import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { trajectoryEvidenceInput, type SemanticContext } from "../src/domain/semanticTrajectory.js";
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

for (const invalidReference of [false, true]) {
  test(`complex runner ${invalidReference ? "rejects fabricated references without leaking them" : "checks repeated and variant labels without sending oracle"}`, async () => {
    let calls = 0;
    const prepared = runner.prepareComplexPilot() as SemanticContext[];
    const normalized = (input: ReturnType<typeof trajectoryEvidenceInput>) => JSON.stringify({ ...input, entries: [...input.entries].sort((a, b) => a.id.localeCompare(b.id)) });
    const report = await runner.main(["--execute"], { env, fetchImpl: async (_url: string, options: RequestInit) => {
      calls++;
      const request = JSON.parse(String(options.body));
      const input = JSON.parse(request.input[0].content[0].text) as ReturnType<typeof trajectoryEvidenceInput>;
      const index = prepared.findIndex(source => normalized(trajectoryEvidenceInput(source)) === normalized(input));
      assert.ok(index >= 0);
      assert.deepEqual(Object.keys(input).sort(), Object.keys(trajectoryEvidenceInput(prepared[index]!)).sort());
      assert.doesNotMatch(request.input[0].content[0].text, /grounding|expected|baseId|classes/);
      const expected = expectations[cases[index]!.baseId]!.classes;
      const items = input.entries.map(entry => ({ id: entry.id, activity: expected[entry.id],
        evidenceId: invalidReference ? "PRIVATE_FABRICATED_REFERENCE" : expected[entry.id] === "unclear" ? "" : entry.segments[0]!.id }));
      return { ok: true, json: async () => ({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ items }) }] }] }) };
    } });
    assert.equal(calls, 30);
    assert.equal(report.result, invalidReference ? "FAIL" : "PASS");
    assert.equal(report.validReadings, invalidReference ? 0 : 30);
    assert.equal(report.categoryAgreement.items.matched, invalidReference ? 0 : 240);
    assert.equal(report.repeatDisagreement.evaluatedPairs, invalidReference ? 0 : 15);
    assert.equal(report.stability.stableBases, invalidReference ? 0 : 3);
    assert.doesNotMatch(JSON.stringify(report), /PRIVATE_FABRICATED_REFERENCE|SYNTHETIC_SECRET|Bearer/);
    if (invalidReference) assert.ok(report.failures.every((failure: { reason: string }) => failure.reason === "READING_INVALID"));
  });
}
