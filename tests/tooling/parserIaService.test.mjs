import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createGateway, requestLoopbackWorker, PARSER_TRANSPORT_VERSION } from "../../services/paddle-gateway/gateway.mjs";
import { createParserHttpServer, createParserService, readParserPdf, parserRequest, parseProviderResponse, providerFailureCode, safeParserError, allowedLocalRequest, readLimitedProviderBody, PARSER_MODEL } from "../../scripts/parser-ia-service.mjs";
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

test("parser transport logs fixed diagnostic codes only and tolerates telemetry failure", async (t) => {
  const logs = [];
  const server = createParserHttpServer(async () => { throw new Error("private resume secret"); }, 8787, (entry) => { logs.push(entry); throw new Error("optional telemetry unavailable"); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/parse`;
  const headers = { Host: "127.0.0.1:8787", Origin: "http://127.0.0.1:5555", "X-Prisma-Local-Parser": "1", "Content-Type": "application/json" };
  const response = await requestLoopbackWorker(url, { method: "POST", headers, body: JSON.stringify({ organizationId: input.organizationId, sourceSha256: input.sourceSha256, pdfBase64: bytes.toString("base64") }) });
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "PARSER_PROVIDER_FAILED" });
  assert.equal((await fetch(url)).status, 403);
  assert.deepEqual(logs.map(({ code }) => code), ["PARSER_PROVIDER_FAILED", "PARSER_LOCAL_ONLY"]);
  assert.ok(logs.every((entry) => Object.keys(entry).sort().join() === "code,durationMs,event,status"));
  assert.equal(JSON.stringify(logs).includes("private"), false);
});

test("M5.7 backend uses original PDF spans and constrained OpenAI request", async () => {
  const pages = await readParserPdf(bytes);
  const request = parserRequest(bytes, pages);
  assert.equal(request.store, false); assert.equal(request.model, PARSER_MODEL); assert.equal(request.tools, undefined);
  assert.equal(request.max_output_tokens, 12000); assert.equal(request.text.format.strict, true);
  assert.match(request.input[0].content[0].file_data, /^data:application\/pdf;base64,/);
  assert.equal(pages[0].layoutLines[0].text, "Synthetic Person");
});

test("readiness inspects configuration and existing locks without network or filesystem writes", async () => {
  const dir = await directory();
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic", fetchImpl: () => assert.fail("No inference") });
  assert.deepEqual(await parse.readiness(), { state: "available", reason: "ready" });
  assert.deepEqual(await readdir(dir), []);
  const missing = createParserService({ directory: dir, keyProvider: async () => { throw new Error("private"); } });
  assert.deepEqual(await missing.readiness(), { state: "unavailable", reason: "configuration_missing" });
  await writeFile(join(dir, "operation.lock"), "preserved");
  assert.deepEqual(await parse.readiness(), { state: "busy", reason: "worker_busy" });
  assert.equal(await readFile(join(dir, "operation.lock"), "utf8"), "preserved");
});

test("readiness HTTP preserves loopback controls and never executes parse", async (t) => {
  const parse = Object.assign(async () => assert.fail("No parse"), { readiness: async () => ({ state: "available", reason: "ready" }) });
  const server = createParserHttpServer(parse); server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/readiness`;
  const headers = { Host: "127.0.0.1:8787", Origin: "http://127.0.0.1:5555", "X-Prisma-Local-Parser": "1", "Content-Type": "application/json" };
  const response = await requestLoopbackWorker(url, { method: "POST", headers, body: "{}" });
  assert.equal(response.status, 200); assert.equal((await response.json()).state, "available");
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await requestLoopbackWorker(url, { method: "POST", headers, body: '{"pdf":"private"}' })).status, 400);
});

test("authenticated gateway-to-worker readiness uses real HTTP and no inference or writes", async (t) => {
  const dir = await directory();
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic", fetchImpl: () => assert.fail("No OpenAI") });
  const worker = createParserHttpServer(parse); worker.listen(0, "127.0.0.1"); await once(worker, "listening");
  const gateway = createGateway({ authorize: async () => {}, log: () => {}, fetchImpl: (url, options) => requestLoopbackWorker(url.replace(":18787/", `:${worker.address().port}/`), options) });
  gateway.listen(0, "127.0.0.1"); await once(gateway, "listening");
  t.after(() => { for (const server of [gateway, worker]) { server.closeAllConnections(); server.close(); } });
  const response = await fetch(`http://127.0.0.1:${gateway.address().port}/parser-ia-hosted/readiness`, {
    method: "POST", headers: { Origin: "https://prisma.hrtsolutions.com.br", Authorization: "Bearer synthetic", "X-Prisma-Organization-Id": "11111111-1111-4111-8111-111111111111", "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION, "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(response.status, 200); assert.equal((await response.json()).state, "available");
  assert.deepEqual(await readdir(dir), []);
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
  await assert.rejects(readFile(join(dir, "budget.json"), "utf8"), { code: "ENOENT" });
});
test("M5.7 provider errors are sanitized, not retried, and create no local budget reservation", async () => {
  const dir = await directory(); let calls = 0;
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async () => { calls++; throw new Error("private resume and secret"); } });
  await assert.rejects(parse(input), /^Error: PARSER_PROVIDER_FAILED$/); assert.equal(calls, 1);
  await assert.rejects(readFile(join(dir, "budget.json"), "utf8"), { code: "ENOENT" });
  assert.equal(safeParserError(new Error("secret")), "PARSER_PROVIDER_FAILED");
});
test("M5.7 legacy exhausted budget is preserved but no longer blocks the provider", async () => {
  const dir = await directory(); let calls = 0;
  const legacy = JSON.stringify({ version: 1, budgetUsd: 2, attempts: [1, 2, 3].map(() => ({ accountedUsd: 0.6 })) });
  await writeFile(join(dir, "budget.json"), legacy);
  const parse = createParserService({ directory: dir, keyProvider: async () => "synthetic-secret", fetchImpl: async () => { calls++; return new Response(JSON.stringify(provider())); } });
  await parse(input); assert.equal(calls, 1);
  assert.equal(await readFile(join(dir, "budget.json"), "utf8"), legacy);
});
test("M5.7 provider billing and rate errors are classified without exposing response details", async () => {
  assert.equal(providerFailureCode(429, JSON.stringify({ error: { code: "credit_balance_exhausted", message: "private" } })), "PARSER_CREDIT_BALANCE_EXHAUSTED");
  assert.equal(providerFailureCode(429, JSON.stringify({ error: { code: "insufficient_quota", message: "private" } })), "PARSER_CREDIT_BALANCE_EXHAUSTED");
  assert.equal(providerFailureCode(429, JSON.stringify({ error: { code: "billing_hard_limit_reached", message: "private" } })), "PARSER_SPEND_LIMIT_EXCEEDED");
  assert.equal(providerFailureCode(429, JSON.stringify({ error: { code: "project_spend_limit_exceeded", message: "private" } })), "PARSER_SPEND_LIMIT_EXCEEDED");
  assert.equal(providerFailureCode(429, JSON.stringify({ error: { code: "rate_limit_exceeded", message: "private" } })), "PARSER_RATE_LIMIT");
  assert.equal(providerFailureCode(401, "private"), "PARSER_KEY_REJECTED");
  assert.equal(providerFailureCode(500, "private"), "PARSER_PROVIDER_FAILED");
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
