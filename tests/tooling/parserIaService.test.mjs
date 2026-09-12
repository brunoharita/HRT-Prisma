import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createParserService, readParserPdf, parserRequest, parseProviderResponse, safeParserError, allowedLocalRequest, readLimitedProviderBody, PARSER_MODEL } from "../../scripts/parser-ia-service.mjs";
import { structureParserIa, preparedParserIa, parserIaMethodVersion } from "../../dist/web/src/domain/parserIa.js";

function syntheticPdf() {
  const content = "BT /F1 16 Tf 50 740 Td (Synthetic Person) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Count 1 /Kids [3 0 R] >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
const bytes = syntheticPdf();
const input = { bytes, sourceSha256: createHash("sha256").update(bytes).digest("hex"), organizationId: "synthetic-org" };
const payload = { status: "complete", facts: [{ path: "identity.fullName", value: "Synthetic Person", sources: ["p1l1"] }], uncertainties: [] };
const provider = () => ({ status: "completed", model: PARSER_MODEL, id: "resp_synthetic", usage: { input_tokens: 1000, output_tokens: 100 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(payload) }] }] });
const directory = () => mkdtemp(join(tmpdir(), "prisma-m57-test-"));

test("M5.7 backend uses original PDF spans and constrained OpenAI request", async () => {
  const pages = await readParserPdf(bytes);
  const request = parserRequest(bytes, pages);
  assert.equal(request.store, false); assert.equal(request.model, PARSER_MODEL); assert.equal(request.tools, undefined);
  assert.equal(request.max_output_tokens, 12000); assert.equal(request.text.format.strict, true);
  assert.match(request.input[0].content[0].file_data, /^data:application\/pdf;base64,/);
  assert.equal(pages[0].layoutLines[0].text, "Synthetic Person");
});
test("M5.7 no external call without correct source binding or credential", async () => {
  let calls = 0;
  const parse = createParserService({ directory: await directory(), keyProvider: async () => { throw new Error("PARSER_KEY_MISSING"); }, fetchImpl: async () => { calls++; } });
  await assert.rejects(parse({ ...input, sourceSha256: "a".repeat(64) }), /SOURCE_MISMATCH/);
  await assert.rejects(parse(input), /KEY_MISSING/); assert.equal(calls, 0);
});
test("M5.7 same source is cached only within its organization and prompt", async () => {
  const dir = await directory(); let calls = 0;
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async (url, options) => {
    calls++; assert.equal(url, "https://api.openai.com/v1/responses"); assert.equal(options.redirect, "error"); assert.equal(options.headers.Authorization, "Bearer synthetic-secret");
    return new Response(JSON.stringify(provider()), { status: 200 });
  } });
  const first = await parse(input); const second = await parse(input);
  assert.equal(first.cached, false); assert.equal(second.cached, true); assert.equal(calls, 1);
  await parse({ ...input, organizationId: "different-org" }); assert.equal(calls, 2);
  const ledger = await readFile(join(dir, "budget.json"), "utf8");
  assert.equal(ledger.includes("Synthetic Person"), false); assert.equal(ledger.includes("synthetic-secret"), false);
});
test("M5.7 provider errors are sanitized, not retried, and retain reservation", async () => {
  const dir = await directory(); let calls = 0;
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async () => { calls++; throw new Error("private resume and secret"); } });
  await assert.rejects(parse(input), /^Error: PARSER_PROVIDER_FAILED$/); assert.equal(calls, 1);
  const ledger = JSON.parse(await readFile(join(dir, "budget.json"), "utf8")); assert.equal(ledger.attempts[0].accountedUsd, 0.6);
  assert.equal(safeParserError(new Error("secret")), "PARSER_PROVIDER_FAILED");
});
test("M5.7 persistent budget prevents further requests after uncertain spending", async () => {
  const dir = await directory(); let calls = 0;
  await writeFile(join(dir, "budget.json"), JSON.stringify({ version: 1, budgetUsd: 2, attempts: [1, 2, 3].map(() => ({ accountedUsd: 0.6 })) }));
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async () => { calls++; } });
  await assert.rejects(parse(input), /BUDGET_EXHAUSTED/); assert.equal(calls, 0);
});
test("M5.7 corrupted ledger cannot reset the budget", async () => {
  const dir = await directory(); await writeFile(join(dir, "budget.json"), "{}");
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async () => { throw new Error("unexpected call"); } });
  await assert.rejects(parse(input), /LEDGER_INVALID/);
});
test("M5.7 timeout aborts provider without exposing its error", async () => {
  const parse = createParserService({ directory: await directory(), timeoutMs: 10, keyProvider: async () => "synthetic-secret", fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("secret timeout")))) });
  await assert.rejects(parse(input), /PARSER_TIMEOUT/);
});
test("M5.7 concurrent calls are rejected before a second paid request", async () => {
  let release; let notify;
  const started = new Promise((r) => { notify = r; });
  const parse = createParserService({ directory: await directory(), keyProvider: async () => "synthetic-secret", fetchImpl: async () => { notify(); await new Promise((r) => { release = r; }); return new Response(JSON.stringify(provider())); } });
  const pending = parse(input); await started;
  await assert.rejects(parse(input), /PARSER_BUSY/); release(); await pending;
});
test("M5.7 rejects refusal, incomplete output, unknown usage and changed model", () => {
  assert.throws(() => parseProviderResponse({ ...provider(), status: "incomplete" }), /INCOMPLETE/);
  assert.throws(() => parseProviderResponse({ ...provider(), usage: null }), /USAGE_INVALID/);
  assert.throws(() => parseProviderResponse({ ...provider(), model: "unexpected-model" }), /USAGE_INVALID/);
  assert.throws(() => parseProviderResponse({ ...provider(), output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "no" }] }] }), /REFUSED/);
});
test("M5.7 local boundary rejects remote hosts, browser origins and missing headers", () => {
  const req = { socket: { remoteAddress: "127.0.0.1" }, headers: { host: "127.0.0.1:8787", origin: "http://localhost:5555", "x-prisma-local-parser": "1", "content-type": "application/json" } };
  assert.equal(allowedLocalRequest(req, 8787), true);
  for (const [key, value] of [["origin", "https://attacker.example"], ["host", "attacker.example:8787"], ["x-prisma-local-parser", undefined], ["content-type", "text/plain"]]) assert.equal(allowedLocalRequest({ ...req, headers: { ...req.headers, [key]: value } }, 8787), false);
  assert.equal(allowedLocalRequest({ ...req, socket: { remoteAddress: "192.168.1.4" } }, 8787), false);
});
test("M5.7 malformed PDF is rejected before processing", async () => { await assert.rejects(readParserPdf(Buffer.from("not pdf")), /INVALID_PDF/); });
test("M5.7 offline replay cannot access credentials or the network", async () => {
  const parse = createParserService({ directory: await directory(), allowNetwork: false, keyProvider: async () => { assert.fail("No secret access"); }, fetchImpl: async () => { assert.fail("No network"); } });
  await assert.rejects(parse(input), /PARSER_LIVE_DISABLED/);
});
test("M5.7 provider response body is bounded while reading", async () => {
  await assert.rejects(readLimitedProviderBody(new Response("too long"), 3), /RESPONSE_LIMIT/);
  assert.equal(await readLimitedProviderBody(new Response("ok"), 3), "ok");
});

test("M5.7 provider model survives transport, frontend validation and intake provenance gate", async () => {
  const parse = createParserService({ directory: await directory(), keyProvider: async () => "synthetic-secret", fetchImpl: async () => new Response(JSON.stringify(provider()), { status: 200 }) });
  for (let attempt = 0; attempt < 2; attempt++) {
    const output = JSON.parse(JSON.stringify(await parse(input)));
    const received = output.result;
    const parsed = structureParserIa({ status: received.status === "partial" ? "partial" : "complete", facts: received.acceptedFacts, uncertainties: received.draft.uncertainties }, output.pages, { sourceSha256: input.sourceSha256, organizationId: input.organizationId, provenance: received.provenance });
    const prepared = preparedParserIa({ sha256: input.sourceSha256, parserIa: parsed }, input.organizationId);
    assert.equal(prepared.provenance.model, PARSER_MODEL);
    assert.equal(parserIaMethodVersion(prepared), `parser-ia-1.0.0/${PARSER_MODEL}/${received.provenance.promptSha256}`);
    assert.equal(output.cached, attempt === 1);
    for (const model of ["", "a/b", "bad model", "a".repeat(81), ".hidden", "model\n"]) {
      assert.throws(() => preparedParserIa({ sha256: input.sourceSha256, parserIa: { ...parsed, provenance: { ...parsed.provenance, model } } }, input.organizationId), /PROVENANCE_INVALID/);
    }
  }
});
