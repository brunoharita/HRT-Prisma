/** Server-only adapter. The caller must authorize and claim an immutable, audited queue job.
 * Persist firstAttemptAtMs BEFORE networking; retries must retain payload, sender and job ID.
 * This module neither authorizes invitations nor persists queue state nor sends on import.
 */
export interface AssessmentEmailJob {
  readonly organizationId: string;
  readonly id: string;
  readonly firstAttemptAtMs: number;
  readonly expiresAtMs: number;
  readonly providerEmailId: string | null;
  readonly message: {
    readonly from: string;
    readonly to: string;
    readonly subject: string;
    readonly html: string;
    readonly text: string;
  };
}

export type AssessmentEmailReceipt =
  | { status: "accepted"; providerEmailId: string; evidence: "provider_response" | "persisted_receipt" }
  | { status: "retry"; reason: "rate_limited" | "transient_failure" | "concurrent_request" | "transport_unknown" | "receipt_unknown"; acceptance: "unknown" | "not_accepted" | "pending"; retryAfterSeconds: number | null }
  | { status: "blocked"; reason: "invalid_scope" | "invalid_job" | "expired" | "configuration_missing" | "reconciliation_required" | "idempotency_conflict"; acceptance: "unknown" | "not_attempted" }
  | { status: "failed"; reason: "provider_rejected"; httpStatus: number; acceptance: "not_accepted" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAILBOX = /^[^\s<>@,;\x00-\x1f\x7f]+@[^\s<>@,;\x00-\x1f\x7f]+\.[^\s<>@,;\x00-\x1f\x7f]+$/;
const HEADER_CONTROL = /[\x00-\x1f\x7f]/;
const TIMEOUT_MS = 15_000;
// Resend retains keys for 24h. Leave time for transport/clock uncertainty near expiry.
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000 - 30_000;

function retryAfter(value: string | null, nowMs: number): number | null {
  if (value === null) return null;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - nowMs) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds, 3600) : null;
}

/** Explicit invocation only; never use in the frontend or pass a browser-supplied job. */
export function createResendAssessmentTransport(config: {
  apiKey: string;
  from: string;
  fetch: typeof globalThis.fetch;
  now: () => number;
}): (job: AssessmentEmailJob, authorizedOrganizationId: string) => Promise<AssessmentEmailReceipt> {
  return async (job, authorizedOrganizationId) => {
    const nowMs = config.now();
    if (!UUID.test(authorizedOrganizationId) || !UUID.test(job.organizationId) || job.organizationId !== authorizedOrganizationId) {
      return { status: "blocked", reason: "invalid_scope", acceptance: "not_attempted" };
    }
    if (!UUID.test(job.id) || !Number.isSafeInteger(nowMs) || !Number.isSafeInteger(job.firstAttemptAtMs)
      || !Number.isSafeInteger(job.expiresAtMs) || job.firstAttemptAtMs > nowMs
      || job.firstAttemptAtMs < 0 || job.expiresAtMs <= job.firstAttemptAtMs
      || !MAILBOX.test(job.message.from) || !MAILBOX.test(job.message.to)
      || !job.message.subject.trim() || job.message.subject.length > 998 || HEADER_CONTROL.test(job.message.subject)
      || !job.message.html.trim() || !job.message.text.trim()
      || (job.providerEmailId !== null && !UUID.test(job.providerEmailId))) {
      return { status: "blocked", reason: "invalid_job", acceptance: "not_attempted" };
    }
    // A durable acceptance receipt is still evidence when the invitation later expires.
    if (job.providerEmailId !== null) {
      return { status: "accepted", providerEmailId: job.providerEmailId, evidence: "persisted_receipt" };
    }
    if (nowMs >= job.expiresAtMs) return { status: "blocked", reason: "expired", acceptance: "unknown" };
    if (nowMs - job.firstAttemptAtMs >= RETRY_WINDOW_MS) {
      return { status: "blocked", reason: "reconciliation_required", acceptance: "unknown" };
    }
    if (!/^re_[a-zA-Z0-9_-]{16,}$/.test(config.apiKey) || !MAILBOX.test(config.from) || job.message.from !== config.from) {
      return { status: "blocked", reason: "configuration_missing", acceptance: "not_attempted" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await config.fetch("https://api.resend.com/emails", {
        method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `position-assessment/${job.organizationId}/${job.id}`,
        },
        // No arbitrary headers, tags, CC/BCC, attachments or provider-specific fields.
        body: JSON.stringify({ from: job.message.from, to: [job.message.to], subject: job.message.subject,
          html: job.message.html, text: job.message.text }),
      });
      if (response.status === 429) {
        return { status: "retry", reason: "rate_limited", acceptance: "not_accepted", retryAfterSeconds: retryAfter(response.headers.get("retry-after"), nowMs) };
      }
      if (response.status === 408 || response.status >= 500) {
        return { status: "retry", reason: "transient_failure", acceptance: "unknown", retryAfterSeconds: retryAfter(response.headers.get("retry-after"), nowMs) };
      }
      if (response.ok || response.status === 409) {
        const body: unknown = await response.json().catch(() => null);
        if (response.ok) {
          const id = body !== null && typeof body === "object" && "id" in body ? body.id : null;
          if (typeof id === "string" && UUID.test(id)) {
            return { status: "accepted", providerEmailId: id, evidence: "provider_response" };
          }
          return { status: "retry", reason: "receipt_unknown", acceptance: "unknown", retryAfterSeconds: null };
        }
        const name = body !== null && typeof body === "object" && "name" in body ? body.name : null;
        if (name === "concurrent_idempotent_requests") {
          return { status: "retry", reason: "concurrent_request", acceptance: "pending", retryAfterSeconds: retryAfter(response.headers.get("retry-after"), nowMs) };
        }
        // A changed payload may coexist with an accepted original; never mint a new key.
        return { status: "blocked", reason: "idempotency_conflict", acceptance: "unknown" };
      }
      if (response.status >= 400 && response.status < 500) {
        return { status: "failed", reason: "provider_rejected", httpStatus: response.status, acceptance: "not_accepted" };
      }
      return { status: "retry", reason: "receipt_unknown", acceptance: "unknown", retryAfterSeconds: null };
    } catch {
      // Error/body text may contain credentials, recipient or personal URL; return categories only.
      return { status: "retry", reason: "transport_unknown", acceptance: "unknown", retryAfterSeconds: null };
    } finally {
      clearTimeout(timer);
    }
  };
}
