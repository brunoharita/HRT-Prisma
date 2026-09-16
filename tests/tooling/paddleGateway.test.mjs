import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createAuthorizer, createGateway, PARSER_TRANSPORT_VERSION, TRANSPORT_VERSION } from "../../services/paddle-gateway/gateway.mjs";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const payload = {
  file: Buffer.from("%PDF-1.7\nsynthetic\n%%EOF").toString("base64"), fileType: 0,
  useDocOrientationClassify: false, useDocUnwarping: false, useTextlineOrientation: false,
  useTableRecognition: true, useFormulaRecognition: false, useChartRecognition: false,
  returnMarkdownImages: false, visualize: false,
};
const headers = {
  Origin: "https://prisma.hrtsolutions.com.br", Authorization: "Bearer synthetic.jwt.token",
  "X-Prisma-Organization-Id": organizationId, "X-Prisma-Document-Contract": TRANSPORT_VERSION,
  "Content-Type": "application/json",
};
async function fixture(t, options = {}) {
  const calls = []; const logs = [];
  const server = createGateway({ authorize: async () => {}, fetchImpl: async (url, init) => {
    calls.push({ url, init }); return Response.json({ errorCode: 0, result: { synthetic: true } });
  }, log: (entry) => logs.push(entry), ...options });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (changes = {}, path = "/document-intelligence/layout-parsing") => fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload), ...changes });
  return { base, calls, logs, send };
}

test("transport preserves payload and both routes but strips credentials before Paddle", async (t) => {
  const { calls, logs, send } = await fixture(t);
  for (const path of ["/document-intelligence/layout-parsing", "/document-intelligence-vl/layout-parsing"]) {
    const response = await send({}, path);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { errorCode: 0, result: { synthetic: true } });
  }
  assert.deepEqual(calls.map((call) => call.url), ["http://127.0.0.1:18080/layout-parsing", "http://127.0.0.1:18081/layout-parsing"]);
  for (const call of calls) { assert.deepEqual(JSON.parse(call.init.body), payload); assert.deepEqual(call.init.headers, { "Content-Type": "application/json" }); }
  assert.equal(logs.length, 2);
  assert.ok(logs.every((entry) => Object.keys(entry).sort().join() === "durationMs,event,route,status"));
});

test("parser route authenticates the binding and forwards only loopback worker headers", async (t) => {
  const { base, calls } = await fixture(t);
  const pdf = Buffer.from("%PDF-1.7\nsynthetic\n%%EOF");
  const parserPayload = {
    organizationId,
    pdfBase64: pdf.toString("base64"),
    sourceSha256: createHash("sha256").update(pdf).digest("hex"),
  };
  const response = await fetch(`${base}/parser-ia-hosted/parse`, {
    method: "POST",
    headers: {
      Origin: headers.Origin,
      Authorization: headers.Authorization,
      "X-Prisma-Organization-Id": organizationId,
      "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parserPayload),
  });
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, "http://127.0.0.1:18787/parse");
  assert.deepEqual(JSON.parse(calls[0].init.body), parserPayload);
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/json",
    Host: "127.0.0.1:8787",
    Origin: "http://127.0.0.1:5555",
    "X-Prisma-Local-Parser": "1",
  });
  assert.equal(JSON.stringify(calls[0]).includes("Bearer"), false);
});

test("parser route rejects tenant mismatch, source mismatch and Paddle contract before forwarding", async (t) => {
  const { base, calls } = await fixture(t);
  const pdf = Buffer.from("%PDF-1.7\nsynthetic\n%%EOF");
  const body = { organizationId, pdfBase64: pdf.toString("base64"), sourceSha256: "0".repeat(64) };
  const parserHeaders = {
    Origin: headers.Origin,
    Authorization: headers.Authorization,
    "X-Prisma-Organization-Id": organizationId,
    "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION,
    "Content-Type": "application/json",
  };
  assert.equal((await fetch(`${base}/parser-ia-hosted/parse`, { method: "POST", headers: parserHeaders, body: JSON.stringify(body) })).status, 400);
  assert.equal((await fetch(`${base}/parser-ia-hosted/parse`, { method: "POST", headers: parserHeaders, body: JSON.stringify({ ...body, organizationId: "33333333-3333-4333-8333-333333333333" }) })).status, 400);
  assert.equal((await fetch(`${base}/parser-ia-hosted/parse`, { method: "POST", headers: { ...parserHeaders, "X-Prisma-Parser-Contract": TRANSPORT_VERSION }, body: JSON.stringify(body) })).status, 400);
  assert.equal(calls.length, 0);
});

test("rejects anonymous, cross-origin, missing tenant, unknown contract and unexpected routes before forwarding", async (t) => {
  const { send, calls } = await fixture(t);
  for (const [key, value, expected] of [
    ["Authorization", "", 401], ["Origin", "https://evil.example", 403],
    ["X-Prisma-Organization-Id", "", 403], ["X-Prisma-Document-Contract", "unknown", 400],
    ["Content-Type", "text/plain", 415],
  ]) assert.equal((await send({ headers: { ...headers, [key]: value } })).status, expected);
  assert.equal((await send({}, "/health")).status, 404);
  assert.equal((await send({}, "/document-intelligence/layout-parsing?url=http://evil.example")).status, 404);
  assert.equal((await send({ method: "GET", body: undefined })).status, 405);
  assert.equal(calls.length, 0);
});

test("rejects URL injection, unknown options, bad signatures, malformed and oversized bodies", async (t) => {
  const { send, calls } = await fixture(t);
  for (const change of [{ file: "https://internal.example" }, { url: "http://internal.example" }, { visualize: true }, { file: Buffer.from("not a PDF").toString("base64") }]) {
    assert.equal((await send({ body: JSON.stringify({ ...payload, ...change }) })).status, 400);
  }
  assert.equal((await send({ body: "{" })).status, 400);
  assert.equal((await send({ body: " ".repeat(21 * 1024 * 1024 + 1) })).status, 413);
  assert.equal(calls.length, 0);
});

test("authority service failure fails closed without leaking errors", async (t) => {
  const { send, calls, logs } = await fixture(t, { authorize: async () => { throw new Error("sensitive provider content"); } });
  const response = await send(); assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes("sensitive"), false);
  assert.equal(JSON.stringify(logs).includes("sensitive"), false);
  assert.equal(calls.length, 0);
});

test("worker network failure retains a cooldown and never retries", async (t) => {
  let attempts = 0;
  const { send } = await fixture(t, { timeoutMs: 100, fetchImpl: async () => { attempts++; throw new Error("network failure"); } });
  assert.equal((await send()).status, 502);
  assert.equal((await send()).status, 429);
  assert.equal(attempts, 1);
});

test("serializes inference and releases capacity after successful completion", async (t) => {
  let release; let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const pending = new Promise((resolve) => { release = resolve; });
  const { send } = await fixture(t, { fetchImpl: async () => { started(); await pending; return Response.json({ errorCode: 0 }); } });
  const first = send(); await ready;
  assert.equal((await send()).status, 429);
  release(); assert.equal((await first).status, 200);
  assert.equal((await send()).status, 200);
});

test("worker timeout aborts transport and retains cooldown", async (t) => {
  const { send } = await fixture(t, { timeoutMs: 40, fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }) });
  assert.equal((await send()).status, 504);
  assert.equal((await send()).status, 429);
});

test("client disconnect aborts upstream and does not immediately reuse busy CPU", async (t) => {
  let started; const ready = new Promise((resolve) => { started = resolve; });
  let aborted; const stopped = new Promise((resolve) => { aborted = resolve; });
  const { send } = await fixture(t, { timeoutMs: 1000, fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
    started(); init.signal.addEventListener("abort", () => { aborted(); reject(new Error("aborted")); }, { once: true });
  }) });
  const controller = new AbortController();
  const pending = send({ signal: controller.signal }).catch(() => null);
  await ready; controller.abort(); await pending; await stopped;
  assert.equal((await send()).status, 429);
});

test("invalid worker responses are sanitized", async (t) => {
  const { send } = await fixture(t, { fetchImpl: async () => new Response("sensitive upstream error", { status: 500 }) });
  const response = await send(); assert.equal(response.status, 502);
  assert.equal(JSON.stringify(await response.json()).includes("sensitive"), false);
});

test("Paddle timeout retains its cooldown without blocking Parser IA", async (t) => {
  const calls = [];
  const { send } = await fixture(t, { timeoutMs: 500, fetchImpl: async (url, init) => {
    calls.push(url);
    if (url.includes(":18080/")) return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    return Response.json({ synthetic: true });
  } });
  assert.equal((await send()).status, 504);
  const pdf = Buffer.from(payload.file, "base64");
  const parserRequest = {
    headers: { ...headers, "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION },
    body: JSON.stringify({ organizationId, pdfBase64: payload.file, sourceSha256: createHash("sha256").update(pdf).digest("hex") }),
  };
  assert.equal((await send(parserRequest, "/parser-ia-hosted/parse")).status, 200);
  assert.equal((await send()).status, 429);
  assert.deepEqual(calls, ["http://127.0.0.1:18080/layout-parsing", "http://127.0.0.1:18787/parse"]);
});

test("both Paddle routes share capacity while the separate Parser IA can proceed", async (t) => {
  let release; let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const pending = new Promise((resolve) => { release = resolve; });
  const { send } = await fixture(t, { fetchImpl: async (url) => {
    if (url.includes(":18080/")) { started(); await pending; }
    return Response.json({ synthetic: true });
  } });
  const first = send(); await ready;
  try {
    assert.equal((await send({}, "/document-intelligence-vl/layout-parsing")).status, 429);
    assert.equal((await send()).status, 429);
    const pdf = Buffer.from(payload.file, "base64");
    assert.equal((await send({
      headers: { ...headers, "X-Prisma-Parser-Contract": PARSER_TRANSPORT_VERSION },
      body: JSON.stringify({ organizationId, pdfBase64: payload.file, sourceSha256: createHash("sha256").update(pdf).digest("hex") }),
    }, "/parser-ia-hosted/parse")).status, 200);
  } finally { release(); }
  assert.equal((await first).status, 200);
});

function authFixture({ role = "recruiter", status = "active", memberRole = "recruiter", orgs = [{ id: organizationId }], memberships, user = { id: userId } } = {}) {
  const calls = [];
  const authorize = createAuthorizer({ supabaseUrl: "https://ioldpnqqvobprjiontre.supabase.co", publishableKey: "synthetic-publishable", fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    const data = url.pathname === "/auth/v1/user" ? user : url.pathname.endsWith("platform_users") ? [{ status, access_profile: role }] : url.pathname.endsWith("organizations") ? orgs : memberships ?? [{ role: memberRole }];
    return Response.json(data);
  } });
  return { calls, authorize };
}

test("uses validated user plus RLS, live operator and tenant membership with caller token only", async () => {
  const { calls, authorize } = authFixture(); await authorize(headers.Authorization, organizationId);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ init }) => init.headers.Authorization === headers.Authorization));
  assert.ok(calls.at(-1).url.includes(`user_id=eq.${userId}&organization_id=eq.${organizationId}`));
  const superAdmin = authFixture({ role: "super_admin", memberships: [] });
  await superAdmin.authorize(headers.Authorization, organizationId); assert.equal(superAdmin.calls.length, 3);
});

test("denies member, unknown role, blocked/inactive operator, other tenant and invalid session", async () => {
  for (const options of [
    { role: "member" }, { role: "invented" }, { status: "blocked" }, { status: "inactive" },
    { memberRole: "member" }, { memberRole: "invented" }, { memberships: [] }, { orgs: [] },
    { role: "super_admin", orgs: [] }, { user: { id: userId, is_anonymous: true } }, { user: {} },
  ]) await assert.rejects(authFixture(options).authorize(headers.Authorization, organizationId));
});
