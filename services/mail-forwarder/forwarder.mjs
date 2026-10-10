import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import PostalMime from "postal-mime";

export const DOMAIN = "hrtsolutions.com.br";
export const TARGET = "bruno.harita@gmail.com";
export const FROM = `HRT Solutions <encaminhamento@${DOMAIN}>`;
export const PATH = "/webhooks/resend-inbound";
export const SAFE_WINDOW = 24 * 60 * 60 * 1000 - 60_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ADDRESS = /^[^\s<>@,;\r\n]+@[^\s<>@,;\r\n]+$/;
const DELIVERY = new Set(["email.delivered", "email.bounced", "email.failed", "email.complained"]);
const TERMINAL = new Set(["accepted", "delivered", "bounced", "failed", "complained", "reconcile", "blocked"]);
const MAX_RAW = 20 * 1024 * 1024;

export function recipients(email) {
  const envelope = Array.isArray(email?.received_for) && email.received_for.length ? email.received_for : email?.to;
  return Array.isArray(envelope) ? [...new Set(envelope.filter(value => typeof value === "string" && ADDRESS.test(value) && value.toLowerCase().endsWith(`@${DOMAIN}`)).map(value => value.toLowerCase()))].sort() : [];
}

function fault(code) { return Object.assign(new Error(code), { code }); }

export class Store {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'pending', created INTEGER NOT NULL,
        first_send INTEGER, fingerprint TEXT, receipt TEXT UNIQUE, attempts INTEGER NOT NULL DEFAULT 0,
        next INTEGER NOT NULL DEFAULT 0, error TEXT, delivery TEXT
      );`);
    this.db.prepare("UPDATE jobs SET state='retry' WHERE state='sending'").run();
  }
  add(id, now) { this.db.prepare("INSERT OR IGNORE INTO jobs (id, created) VALUES (?, ?)").run(id, now); }
  get(id) { return this.db.prepare("SELECT * FROM jobs WHERE id=?").get(id); }
  due(now) { return this.db.prepare("SELECT * FROM jobs WHERE state IN ('pending','retry') AND next<=? ORDER BY created LIMIT 1").get(now); }
  update(id, values) {
    const allowed = new Set(["state", "first_send", "fingerprint", "receipt", "attempts", "next", "error", "delivery"]);
    const fields = Object.keys(values);
    if (!fields.length || fields.some(field => !allowed.has(field))) throw fault("invalid_update");
    this.db.prepare(`UPDATE jobs SET ${fields.map(field => `${field}=?`).join(",")} WHERE id=?`).run(...fields.map(field => values[field]), id);
  }
  delivery(id, type) {
    // Out-of-order failure/complaint may never be overwritten by a later delivered event.
    this.db.prepare("UPDATE jobs SET delivery=?, state=CASE WHEN state IN ('bounced','failed','complained') THEN state ELSE ? END WHERE receipt=?").run(type, type, id);
  }
  counts() { return this.db.prepare("SELECT state, count(*) AS count FROM jobs GROUP BY state ORDER BY state").all(); }
  close() { this.db.close(); }
}

export async function downloadRaw(url, { fetchImpl = fetch, signal } = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { throw fault("raw_url_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443") ||
      ![".resend.com", ".amazonaws.com"].some(suffix => parsed.hostname.endsWith(suffix))) throw fault("raw_url_invalid");
  const response = await fetchImpl(parsed, { signal, redirect: "error" });
  if (!response.ok) throw fault("raw_download_failed");
  if (Number(response.headers.get("content-length")) > MAX_RAW) { await response.body?.cancel(); throw fault("message_too_large"); }
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_RAW) throw fault("message_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

export async function prepareMessage(email, raw) {
  const originalTo = recipients(email);
  if (!originalTo.length) throw fault("domain_mismatch");
  if (!Buffer.isBuffer(raw) || raw.length > MAX_RAW) throw fault("message_too_large");
  const parsed = await PostalMime.parse(raw, { attachmentEncoding: "base64" });
  const replies = (parsed.replyTo?.length ? parsed.replyTo : [parsed.from]).map(item => item?.address).filter(address => typeof address === "string" && ADDRESS.test(address));
  if (!replies.length) throw fault("invalid_sender");
  const attachments = parsed.attachments.map(item => ({
    filename: item.filename || "attachment", content: item.content,
    contentType: item.mimeType,
    ...(item.contentId ? { contentId: item.contentId.replace(/^<|>$/g, "") } : {}),
  }));
  // Only original MIME content is reused. Arbitrary incoming headers, links and instructions have no authority.
  return {
    from: FROM, to: [TARGET], replyTo: [...new Set(replies)],
    subject: parsed.subject || "(sem assunto)",
    text: parsed.text || undefined, html: parsed.html || undefined,
    ...(attachments.length ? { attachments } : {}),
    headers: { "X-HRT-Forwarded": "1", "X-Original-To": originalTo.join(", "), "X-Original-From": replies.join(", ") },
    tags: [{ name: "purpose", value: "hrt-forwarding" }],
  };
}

export class Forwarder {
  constructor({ store, resend, webhookSecret, clock = Date.now, readRaw = downloadRaw, logger = console.log }) {
    if (!webhookSecret?.startsWith("whsec_")) throw fault("configuration_missing");
    Object.assign(this, { store, resend, webhookSecret, clock, readRaw, logger });
    this.busy = false;
  }
  ingest(raw, headers) {
    let event;
    try {
      event = this.resend.webhooks.verify({ payload: raw, webhookSecret: this.webhookSecret, headers: {
        id: headers["svix-id"] ?? headers["webhook-id"],
        timestamp: headers["svix-timestamp"] ?? headers["webhook-timestamp"],
        signature: headers["svix-signature"] ?? headers["webhook-signature"],
      } });
    } catch { return 401; }
    if (!event?.data || !UUID.test(event.data.email_id ?? "")) return 400;
    if (event.type === "email.received") {
      if (!recipients(event.data).length) return 202;
      this.store.add(event.data.email_id, this.clock());
    } else if (DELIVERY.has(event.type)) {
      this.store.delivery(event.data.email_id, event.type.slice(6));
    }
    return 200;
  }
  async tick() {
    if (this.busy) return false;
    this.busy = true;
    let job;
    try {
      job = this.store.due(this.clock());
      if (!job) return false;
      if (job.first_send !== null && this.clock() - job.first_send >= SAFE_WINDOW) {
        this.store.update(job.id, { state: "reconcile", error: "idempotency_expired" });
        return true;
      }
      const signal = AbortSignal.timeout(25_000);
      const response = await this.resend.emails.receiving.get(job.id, {}, { signal, redirect: "error" });
      if (response.error) throw fault(`provider_${safeProviderError(response.error)}`);
      if (response.data?.id !== job.id || !recipients(response.data).length) throw fault("domain_mismatch");
      const raw = await this.readRaw(response.data.raw?.download_url, { signal });
      const message = await prepareMessage(response.data, raw);
      const fingerprint = createHash("sha256").update(JSON.stringify(message)).digest("hex");
      if (job.fingerprint && fingerprint !== job.fingerprint) throw fault("payload_changed");
      this.store.update(job.id, { state: "sending", fingerprint, first_send: job.first_send ?? this.clock(), attempts: job.attempts + 1 });
      const result = await this.resend.emails.send(message, { idempotencyKey: `hrt-forward/${job.id}`, signal, redirect: "error" });
      if (result.error) throw fault(`provider_${safeProviderError(result.error)}`);
      if (!UUID.test(result.data?.id ?? "")) throw fault("receipt_missing");
      this.store.update(job.id, { state: "accepted", receipt: result.data.id, error: null });
      this.logger(JSON.stringify({ event: "forward_accepted", id: job.id, receipt: result.data.id }));
      return true;
    } catch (error) {
      if (!job) { this.logger(JSON.stringify({ event: "queue_error" })); return false; }
      const code = typeof error.code === "string" && /^[a-z_0-9]+$/.test(error.code) ? error.code : "transport_unknown";
      const permanent = ["domain_mismatch", "message_too_large", "raw_url_invalid", "invalid_sender", "provider_validation_error", "provider_restricted_api_key", "provider_invalid_api_key"].includes(code);
      const reconcile = code === "payload_changed" || code === "provider_invalid_idempotent_request";
      const persisted = this.store.get(job.id);
      // Persistence failure after a send must not erase its receipt or authorize another send.
      if (!TERMINAL.has(persisted.state)) this.store.update(job.id, {
        state: reconcile ? "reconcile" : permanent ? "blocked" : "retry", error: code,
        next: this.clock() + Math.min(3_600_000, 60_000 * 2 ** Math.min(persisted.attempts, 6)),
      });
      this.logger(JSON.stringify({ event: "forward_problem", id: job.id, code }));
      return true;
    } finally { this.busy = false; }
  }
}

function safeProviderError(error) {
  const allowed = new Set(["validation_error", "restricted_api_key", "invalid_api_key", "rate_limit_exceeded", "invalid_idempotent_request", "concurrent_idempotent_requests", "application_error", "daily_quota_exceeded", "monthly_quota_exceeded"]);
  return allowed.has(error.name) ? error.name : "error";
}
