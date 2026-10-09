import test from "node:test";
import assert from "node:assert/strict";
import { createResendAssessmentTransport, type AssessmentEmailJob } from "../src/infrastructure/positionAssessmentEmailTransport.js";

const org = "00000000-0000-4000-8000-000000000001";
const otherOrg = "00000000-0000-4000-8000-000000000002";
const emailId = "00000000-0000-4000-8000-000000000003";
const apiKey = "re_synthetic_not_a_real_key";
const from = "sender@example.invalid";
const nowMs = Date.parse("2026-10-09T12:00:00Z");
const job: AssessmentEmailJob = {
  organizationId: org, id: "00000000-0000-4000-8000-000000000004", firstAttemptAtMs: nowMs,
  expiresAtMs: nowMs + 3 * 24 * 60 * 60 * 1000, providerEmailId: null,
  message: { from, to: "recipient@example.invalid", subject: "Convite sintético", html: "<p>Conteúdo sintético</p>", text: "Conteúdo sintético" },
};
function fakeTransport(handler: typeof globalThis.fetch, time = nowMs, key = apiKey) {
  return createResendAssessmentTransport({ apiKey: key, from, now: () => time, fetch: handler });
}
const noFetch: typeof globalThis.fetch = async () => { assert.fail("Network must not run"); };

test("provider acceptance has a receipt, remains distinct from delivery and replays the same key/payload", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const send = fakeTransport(async (url, init) => {
    assert.ok(init); calls.push({ url: String(url), init });
    return Response.json({ id: emailId });
  });
  assert.deepEqual(await send(job, org), { status: "accepted", providerEmailId: emailId, evidence: "provider_response" });
  await send({ ...job }, org);
  assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0]?.url, "https://api.resend.com/emails");
  const headers = new Headers(calls[0]?.init.headers);
  assert.equal(headers.get("Idempotency-Key"), `position-assessment/${org}/${job.id}`);
  assert.equal(headers.get("Authorization"), `Bearer ${apiKey}`);
  assert.equal(calls[0]?.init.redirect, "error"); assert.equal(calls[0]?.init.cache, "no-store");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { ...job.message, to: [job.message.to] });
});

test("durable receipt avoids another send even after deadline and provider idempotency expiry", async () => {
  const send = fakeTransport(noFetch, job.expiresAtMs + 1, "");
  assert.deepEqual(await send({ ...job, providerEmailId: emailId }, org), {
    status: "accepted", providerEmailId: emailId, evidence: "persisted_receipt",
  });
});

test("cross-tenant, missing authority and invalid job do not invoke transport", async () => {
  const send = fakeTransport(noFetch);
  for (const organizationId of [otherOrg, "", "invalid"]) {
    assert.equal((await send(job, organizationId)).status, "blocked");
  }
  for (const invalid of [
    { ...job, id: "" }, { ...job, firstAttemptAtMs: nowMs + 1 }, { ...job, firstAttemptAtMs: NaN },
    { ...job, providerEmailId: "not-a-receipt" }, { ...job, expiresAtMs: job.firstAttemptAtMs },
    { ...job, message: { ...job.message, to: "a@example.invalid,b@example.invalid" } },
    { ...job, message: { ...job.message, subject: "Convite\r\nBcc: extra@example.invalid" } },
    { ...job, message: { ...job.message, text: " " } },
  ]) assert.deepEqual(await send(invalid, org), { status: "blocked", reason: "invalid_job", acceptance: "not_attempted" });
});

test("missing credential or sender drift fails closed without exposing its value", async () => {
  assert.equal((await fakeTransport(noFetch, nowMs, "")(job, org)).status, "blocked");
  const changed = { ...job, message: { ...job.message, from: "other@example.invalid" } };
  assert.deepEqual(await fakeTransport(noFetch)(changed, org), { status: "blocked", reason: "configuration_missing", acceptance: "not_attempted" });
});

test("expired invitations and retries near or beyond 24h never send with a fresh key", async () => {
  assert.deepEqual(await fakeTransport(noFetch, job.expiresAtMs)(job, org), { status: "blocked", reason: "expired", acceptance: "unknown" });
  for (const age of [24 * 60 * 60 * 1000 - 30_000, 24 * 60 * 60 * 1000, 25 * 60 * 60 * 1000]) {
    assert.deepEqual(await fakeTransport(noFetch, nowMs + age)(job, org), { status: "blocked", reason: "reconciliation_required", acceptance: "unknown" });
  }
});

test("rate limits, unavailable provider and concurrent sends defer without automatic retry", async () => {
  const cases = [
    { code: 429, body: {}, reason: "rate_limited", acceptance: "not_accepted" },
    { code: 503, body: {}, reason: "transient_failure", acceptance: "unknown" },
    { code: 408, body: {}, reason: "transient_failure", acceptance: "unknown" },
    { code: 409, body: { name: "concurrent_idempotent_requests" }, reason: "concurrent_request", acceptance: "pending" },
  ];
  for (const c of cases) {
    let calls = 0;
    const send = fakeTransport(async () => { calls++; return Response.json(c.body, { status: c.code, headers: { "retry-after": "45" } }); });
    assert.deepEqual(await send(job, org), { status: "retry", reason: c.reason, acceptance: c.acceptance, retryAfterSeconds: 45 });
    assert.equal(calls, 1);
  }
});

test("payload conflict is unresolved, never overwritten by a new idempotency key", async () => {
  assert.deepEqual(await fakeTransport(async () => Response.json({ name: "invalid_idempotent_request" }, { status: 409 }))(job, org), {
    status: "blocked", reason: "idempotency_conflict", acceptance: "unknown",
  });
});

test("ambiguous and rejected responses expose categories only, never provider PII or credentials", async () => {
  const sensitive = `${apiKey} ${job.message.to} https://example.invalid/personal-token`;
  const results = [
    await fakeTransport(async () => { throw new Error(sensitive); })(job, org),
    await fakeTransport(async () => new Response(sensitive, { status: 200 }))(job, org),
    await fakeTransport(async () => Response.json({ id: sensitive }))(job, org),
    await fakeTransport(async () => Response.json({ message: sensitive }, { status: 401 }))(job, org),
  ];
  assert.deepEqual(results.map(r => r.status), ["retry", "retry", "retry", "failed"]);
  for (const result of results) {
    assert.doesNotMatch(JSON.stringify(result), /re_synthetic|recipient@|personal-token/);
  }
});

test("retry hints accept HTTP dates, cap extremes and discard malformed values", async () => {
  for (const [header, expected] of [[new Date(nowMs + 90_000).toUTCString(), 90], ["9999999", 3600], ["-1", null], ["invalid", null]] as const) {
    const receipt = await fakeTransport(async () => Response.json({}, { status: 429, headers: { "retry-after": header } }))(job, org);
    assert.equal(receipt.status, "retry"); if (receipt.status === "retry") assert.equal(receipt.retryAfterSeconds, expected);
  }
});
