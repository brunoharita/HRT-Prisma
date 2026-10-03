import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createHostedParser } from "../../scripts/start-parser-ia-hosted.mjs";
import { checkHostedParser } from "../../scripts/check-parser-ia-hosted.mjs";
import { createParserHttpServer, PARSER_MODEL } from "../../scripts/parser-ia-service.mjs";
import { createGateway, requestLoopbackWorker, PARSER_TRANSPORT_VERSION } from "../../services/paddle-gateway/gateway.mjs";

function syntheticPdf() {
  const content = "BT /F1 16 Tf 50 740 Td (Synthetic Person) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Count 1 /Kids [3 0 R] >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  return Buffer.from(`${pdf}xref\n0 6\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "prisma-hosted-"));
  const secretPath = join(root, "parser.env");
  await writeFile(secretPath, "OPENAI_API_KEY=sk-synthetic\n", { mode: 0o400 });
  return { directory: join(root, "cache"), lockDirectory: join(root, "locks"), secretPath, root };
}

test("hosted restart separates volatile locks from persistent validated cache and does not replay IA", async () => {
  const settings = await setup(); let calls = 0;
  const bytes = syntheticPdf();
  const input = { bytes, organizationId: "synthetic-org", sourceSha256: createHash("sha256").update(bytes).digest("hex") };
  const fetchImpl = async () => {
    calls++;
    return Response.json({ status: "completed", model: PARSER_MODEL, id: "resp_synthetic", usage: { input_tokens: 100, output_tokens: 30 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ status: "complete", facts: [{ path: "identity.fullName", value: "Synthetic Person", sources: ["p1l1"] }], uncertainties: [] }) }] }] });
  };
  const first = await createHostedParser({ ...settings, fetchImpl });
  assert.equal((await first(input)).cached, false);
  await writeFile(join(settings.lockDirectory, "operation.lock"), "interrupted-container");
  assert.deepEqual(await first.readiness(), { state: "busy", reason: "worker_busy" });
  const restarted = await createHostedParser({ ...settings, lockDirectory: join(settings.root, "new-tmpfs"), fetchImpl });
  assert.deepEqual(await restarted.readiness(), { state: "available", reason: "ready" });
  const replay = await restarted(input);
  assert.equal(replay.cached, true);
  assert.equal(replay.result.acceptedFacts[0].value, "Synthetic Person");
  assert.equal(calls, 1);
  assert.deepEqual(await readdir(join(settings.root, "new-tmpfs")), []);
  assert.ok((await readdir(settings.directory)).every((name) => name.endsWith(".private.json")));
  assert.equal((await restarted({ ...input, organizationId: "other-org" })).cached, false);
  assert.equal(calls, 2);
});

test("gateway reaches hosted worker with existing logical Host and rejects unauthenticated request", async (t) => {
  const settings = await setup();
  const parse = await createHostedParser({ ...settings, fetchImpl: () => assert.fail("No IA for readiness") });
  const worker = createParserHttpServer(parse); worker.listen(0, "127.0.0.1"); await once(worker, "listening");
  const gateway = createGateway({ authorize: async () => {}, log: () => {}, fetchImpl: (url, options) => requestLoopbackWorker(url.replace(":18787/", `:${worker.address().port}/`), options) });
  gateway.listen(0, "127.0.0.1"); await once(gateway, "listening");
  t.after(() => { for (const server of [gateway, worker]) { server.closeAllConnections(); server.close(); } });
  assert.equal(await checkHostedParser(worker.address().port), true);
  assert.equal((await fetch(`http://127.0.0.1:${worker.address().port}/readiness`, { method: "POST", body: "{}" })).status, 403);
  const url = `http://127.0.0.1:${gateway.address().port}/parser-ia-hosted/readiness`;
  const headers = { Origin: "https://prisma.hrtsolutions.com.br", "Content-Type": "application/json", "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION, "X-Prisma-Organization-Id": "11111111-1111-4111-8111-111111111111" };
  assert.equal((await fetch(url, { method: "POST", headers, body: "{}" })).status, 401);
  const response = await fetch(url, { method: "POST", headers: { ...headers, Authorization: "Bearer synthetic" }, body: "{}" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).state, "available");
  assert.deepEqual(await readdir(settings.directory), []);
});

test("hosted health accepts occupied worker and fails closed on missing credential", async (t) => {
  const settings = await setup();
  const parse = await createHostedParser({ ...settings, secretPath: join(settings.root, "absent.env") });
  const worker = createParserHttpServer(parse); worker.listen(0, "127.0.0.1"); await once(worker, "listening");
  t.after(() => { worker.closeAllConnections(); worker.close(); });
  assert.deepEqual(await parse.readiness(), { state: "unavailable", reason: "configuration_missing" });
  assert.equal(await checkHostedParser(worker.address().port), false);
  await writeFile(join(settings.lockDirectory, "operation.lock"), "existing-operation");
  assert.equal(await checkHostedParser(worker.address().port), true);
});

test("hosted health times out without contacting provider or hanging restart checks", async (t) => {
  const parse = Object.assign(async () => {}, { readiness: () => new Promise(() => {}) });
  const worker = createParserHttpServer(parse); worker.listen(0, "127.0.0.1"); await once(worker, "listening");
  t.after(() => { worker.closeAllConnections(); worker.close(); });
  assert.equal(await checkHostedParser(worker.address().port, 25), false);
});
