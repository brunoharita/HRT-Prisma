import {
  agreeTrajectoryReadings, composeReviewedTrajectoryReading, inspectTrajectoryReadingPair, isSemanticPilot,
  prepareTrajectoryContext, readTrajectoryEvidenceResponse, readTrajectoryResponse, trajectoryEvidenceInput,
  HUMAN_REVIEW_VERSION, SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, trajectoryInstructions, trajectoryResponseSchema,
} from "./_generated/src/domain/semanticTrajectory.js";
import { buildDeterministicMatch, buildSnapshotEvaluation } from "./snapshot.ts";
import { isSemanticTriageEligible } from "./_generated/web/src/domain/semanticMatching.js";

export type SemanticEntry = { id: string; fieldPath: string; text: string; kind: "experience" | "education" | "declaration" };
export type SemanticContext = { position: string; entries: SemanticEntry[] };
export type SemanticReading = { items: Array<{ id: string; activity: string; quote: string }> };
export type SemanticAssessment = {
  organizationId: string; profileId: string; positionVersionId: string; status: string;
  methodVersion: string; promptVersion: string; modelVersion: string; inputHash: string; analysisId: string;
  context?: SemanticContext; reading?: SemanticReading;
  resolutionSource?: "human_review"; reviewId?: string; reviewVersion?: string;
};

type RpcResult = { data: unknown; error: { code?: string } | null };
export interface RpcClient { rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult> }
export interface Dependencies {
  env(name: string): string | undefined;
  authenticate(bearer: string): Promise<{ id: string; client: RpcClient } | null>;
  service(): RpcClient;
  fetch: typeof fetch;
  logDiagnostic?: (event: TrajectoryDiagnosticEvent) => void;
}
type RequestIds = Pick<SemanticAssessment, "organizationId" | "profileId" | "positionVersionId">;
type ReadingStage = "provider_transport" | "provider_http" | "provider_json" | "provider_status" | "provider_model"
  | "provider_output" | "provider_content" | "output_json" | "reading_evidence" | "reading_contract" | "validated" | "internal";
type ReadingDiagnostic = {
  outcome: "validated" | "failed"; stage: ReadingStage; reasonCode?: string; httpStatus?: number;
  providerStatus?: string; incompleteReason?: string; inputTokens?: number; outputTokens?: number;
};
type AuditedReading = { outcome: "validated"; model: string; items: Array<{ id: string; activity: string; evidenceId: string }> }
  | { outcome: "failed"; stage: ReadingStage; reasonCode: string };
type TrajectoryDiagnosticEvent = {
  event: "matching_trajectory_readings"; version: 1; analysisId: string; attempt: number | null;
  stage: "reading_failure" | "model_disagreement" | "readings_disagree";
  readings: [ReadingDiagnostic, ReadingDiagnostic];
};
class ReadingError extends Error {
  constructor(code: "RESPONSE_INVALID" | "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT", readonly diagnostic: Omit<ReadingDiagnostic, "outcome" | "reasonCode">) {
    super(code);
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${canonical(row[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export async function inputHash(context: SemanticContext, sourceVersions: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical({ context, sourceVersions })));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function sourceArgs(ids: RequestIds) {
  return { p_organization_id: ids.organizationId, p_profile_id: ids.profileId, p_position_version_id: ids.positionVersionId };
}
function allowed(value: unknown, options: readonly string[]): string | undefined {
  return typeof value === "string" ? (options.includes(value) ? value : "other") : undefined;
}
function tokenCount(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 10_000_000 ? Number(value) : undefined;
}
function providerDiagnostic(provider: Record<string, unknown>, httpStatus: number): Omit<ReadingDiagnostic, "outcome" | "reasonCode" | "stage"> {
  const usage = record(provider.usage), incomplete = record(provider.incomplete_details);
  return { httpStatus,
    providerStatus: allowed(provider.status, ["completed", "incomplete", "failed", "in_progress", "queued", "cancelled"]),
    incompleteReason: allowed(incomplete.reason, ["max_output_tokens", "content_filter"]),
    inputTokens: tokenCount(usage.input_tokens), outputTokens: tokenCount(usage.output_tokens) };
}
function evidenceFailure(value: unknown, context: SemanticContext): boolean {
  const items = record(value).items;
  const input = trajectoryEvidenceInput(context) as { entries: Array<{ id: string; segments: Array<{ id: string }> }> };
  return Array.isArray(items) && items.some(item => {
    const row = record(item), entry = input.entries.find(source => source.id === row.id);
    return entry && typeof row.evidenceId === "string" && (row.activity === "unclear"
      ? row.evidenceId !== "" : !entry.segments.some(segment => segment.id === row.evidenceId));
  });
}
function readingDiagnostic(result: PromiseSettledResult<{ reading: SemanticReading; model: string; diagnostic: ReadingDiagnostic; audit: AuditedReading }>): ReadingDiagnostic {
  if (result.status === "fulfilled") return result.value.diagnostic;
  const error = result.reason;
  return error instanceof ReadingError
    ? { outcome: "failed", reasonCode: error.message, ...error.diagnostic }
    : { outcome: "failed", reasonCode: "RESPONSE_INVALID", stage: "internal" };
}
function auditedReading(result: PromiseSettledResult<{ reading: SemanticReading; model: string; diagnostic: ReadingDiagnostic; audit: AuditedReading }>): AuditedReading {
  if (result.status === "fulfilled") return result.value.audit;
  const diagnostic = readingDiagnostic(result);
  return { outcome: "failed", stage: diagnostic.stage, reasonCode: diagnostic.reasonCode ?? "RESPONSE_INVALID" };
}
function emitDiagnostic(deps: Dependencies, event: TrajectoryDiagnosticEvent): void {
  try {
    if (deps.logDiagnostic) deps.logDiagnostic(event);
    else console.warn(JSON.stringify(event));
  } catch { /* Optional telemetry must never affect the assessment. */ }
}
async function reading(context: SemanticContext, model: string, key: string, deps: Dependencies): Promise<{ reading: SemanticReading; model: string; diagnostic: ReadingDiagnostic; audit: AuditedReading }> {
  let response: Response;
  try {
    response = await deps.fetch("https://api.openai.com/v1/responses", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, store: false, max_output_tokens: 6000, reasoning: { effort: "low" },
        instructions: trajectoryInstructions, input: JSON.stringify(trajectoryEvidenceInput(context)),
        text: { format: { type: "json_schema", name: "trajectory_reading", strict: true, schema: trajectoryResponseSchema } },
      }),
    });
  } catch (error) {
    throw new ReadingError(error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)
      ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE", { stage: "provider_transport" });
  }
  if (!response.ok) throw new ReadingError("PROVIDER_UNAVAILABLE", { stage: "provider_http", httpStatus: response.status });
  let provider: Record<string, unknown>;
  try { provider = record(await response.json()); }
  catch { throw new ReadingError("RESPONSE_INVALID", { stage: "provider_json", httpStatus: response.status }); }
  const diagnostic = providerDiagnostic(provider, response.status);
  const fail = (stage: ReadingStage): never => { throw new ReadingError("RESPONSE_INVALID", { ...diagnostic, stage }); };
  if (provider.status !== "completed" || provider.error != null || provider.incomplete_details != null) fail("provider_status");
  if (typeof provider.model !== "string" || !provider.model.trim() || provider.model.length > 160) fail("provider_model");
  const resolvedModel = provider.model as string;
  const outputs = Array.isArray(provider.output) ? provider.output : [];
  const messages = outputs.map(record).filter(item => item.type === "message");
  if (outputs.some(item => !["message", "reasoning"].includes(String(record(item).type)))
    || messages.length !== 1 || messages[0].role !== "assistant" || messages[0].status !== "completed") fail("provider_output");
  const texts = Array.isArray(messages[0].content) ? messages[0].content.map(record) : [];
  if (texts.length !== 1 || texts[0].type !== "output_text" || typeof texts[0].text !== "string") fail("provider_content");
  let parsed: unknown;
  try { parsed = JSON.parse(texts[0].text as string); }
  catch { fail("output_json"); }
  const validReading = (() => {
    try { return readTrajectoryEvidenceResponse(parsed, context); }
    catch { return fail(evidenceFailure(parsed, context) ? "reading_evidence" : "reading_contract"); }
  })();
  const items = (record(parsed).items as unknown[]).map(item => {
    const row = record(item);
    return { id: row.id as string, activity: row.activity as string, evidenceId: row.evidenceId as string };
  });
  return { reading: validReading, model: resolvedModel, diagnostic: { outcome: "validated", ...diagnostic, stage: "validated" },
    audit: { outcome: "validated", model: resolvedModel, items } };
}

export async function handleMatchingTrajectory(request: Request, deps: Dependencies): Promise<Response> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = new Set((deps.env("PRISMA_ALLOWED_ORIGINS") ??
    "http://127.0.0.1:5555,http://localhost:5555,https://prisma.hrtsolutions.com.br").split(",").map(item => item.trim()));
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  if (allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowed.has(origin)) return json({ status: "unavailable", reasonCode: "ORIGIN_DENIED" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ status: "unavailable", reasonCode: "METHOD_NOT_ALLOWED" }, 405);
  let base: SemanticAssessment | undefined;
  const unavailable = (reasonCode: string, status = 200) => json({ ...base, status: "unavailable", reasonCode }, status);
  try {
    const bearer = request.headers.get("Authorization") ?? "";
    if (!/^Bearer \S+$/i.test(bearer)) return unavailable("AUTH_REQUIRED", 401);
    const actor = await deps.authenticate(bearer);
    if (!actor) return unavailable("AUTH_REQUIRED", 401);
    if (Number(request.headers.get("content-length") ?? 0) > 1024) return unavailable("REQUEST_INVALID", 400);
    // Incremental bound also covers chunked requests without trusting Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return unavailable("REQUEST_INVALID", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return unavailable("REQUEST_INVALID", 400); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body: Record<string, unknown>;
    try { body = record(JSON.parse(new TextDecoder().decode(bytes))); } catch { return unavailable("REQUEST_INVALID", 400); }
    const snapshot = body.operation === "snapshot";
    const reviewLoad = body.operation === "review_load";
    const reviewSave = body.operation === "review_save";
    const expectedKeys = reviewSave ? "analysisId,choices,operation,organizationId,positionVersionId,profileId,referenceDate"
      : snapshot || reviewLoad ? "operation,organizationId,positionVersionId,profileId,referenceDate"
      : "organizationId,positionVersionId,profileId,referenceDate";
    if (Object.keys(body).sort().join() !== expectedKeys
      || ![body.organizationId, body.profileId, body.positionVersionId].every(value => typeof value === "string" && uuid.test(value))
      || (reviewSave && (typeof body.analysisId !== "string" || !uuid.test(body.analysisId)))
      || typeof body.referenceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.referenceDate)
      || Number.isNaN(Date.parse(`${body.referenceDate}T00:00:00.000Z`))
      || new Date(`${body.referenceDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== body.referenceDate) {
      return unavailable("REQUEST_INVALID", 400);
    }
    const referenceDate = body.referenceDate;
    const ids: RequestIds = { organizationId: body.organizationId as string, profileId: body.profileId as string, positionVersionId: body.positionVersionId as string };
    const model = deps.env("KNOWLEDGE_RESEARCH_MODEL")?.trim() ?? "";
    base = { ...ids, status: "unavailable", methodVersion: SEMANTIC_METHOD_VERSION, promptVersion: SEMANTIC_PROMPT_VERSION,
      modelVersion: model, inputHash: "", analysisId: "" };
    // The first data access uses the authenticated user's token, before creating a service client.
    const authorized = await actor.client.rpc("load_matching_trajectory_sources", sourceArgs(ids));
    if (authorized.error || !authorized.data) return unavailable(authorized.error?.code === "40001" ? "SOURCE_STALE" : "NOT_AUTHORIZED", 403);
    const sources = record(authorized.data), position = record(sources.position);
    if (typeof position.title !== "string" || !isSemanticPilot(position.title)) return unavailable("OUTSIDE_PILOT");
    let context: SemanticContext;
    try {
      context = prepareTrajectoryContext(sources.profileData, { ...position, title: position.title },
        Array.isArray(sources.redactions) ? sources.redactions.filter((item): item is string => typeof item === "string") : []) as SemanticContext;
    } catch (error) {
      return unavailable(error instanceof Error && error.message === "TRAJECTORY_SENSITIVE_CONTEXT" ? "INPUT_REQUIRES_REVIEW" : "INPUT_LIMIT");
    }
    if (!context.entries.length) return unavailable("NO_TRAJECTORY_EVIDENCE");
    const triage = await actor.client.rpc("load_matching_snapshot_sources", sourceArgs(ids));
    if (triage.error || !triage.data) return unavailable(triage.error?.code === "42501" ? "NOT_AUTHORIZED" : "TRIAGE_UNAVAILABLE", triage.error?.code === "42501" ? 403 : 200);
    const triageSources = record(triage.data);
    if (canonical(triageSources.sourceVersions) !== canonical(sources.sourceVersions)) return unavailable("SOURCE_STALE");
    try {
      if (!isSemanticTriageEligible(buildDeterministicMatch(triageSources, ids, referenceDate))) return unavailable("OUTSIDE_SEMANTIC_TRIAGE");
    } catch { return unavailable("TRIAGE_SOURCE_INVALID"); }
    const key = deps.env("OPENAI_API_KEY");
    if (!model) return unavailable("AI_DISABLED");
    const allowCompute = !snapshot && !reviewLoad && !reviewSave && deps.env("KNOWLEDGE_AGENT_ENABLED") === "true" && Boolean(key);
    base.inputHash = await inputHash(context, sources.sourceVersions);
    const service = deps.service();
    const claimed = await service.rpc("claim_matching_trajectory", { ...sourceArgs(ids), p_actor_id: actor.id,
      p_input_hash: base.inputHash, p_method_version: SEMANTIC_METHOD_VERSION, p_prompt_version: SEMANTIC_PROMPT_VERSION,
      p_model_version: model, p_source_versions: sources.sourceVersions, p_context: context, p_allow_compute: allowCompute });
    if (claimed.error || !claimed.data) return unavailable("CACHE_UNAVAILABLE");
    let result = record(claimed.data);
    base.analysisId = typeof result.id === "string" ? result.id : "";
    if (reviewLoad || reviewSave) {
      if (reviewSave && body.analysisId !== base.analysisId) return unavailable("REVIEW_NOT_READY", 409);
      if (result.status !== "indeterminate" || result.reason_code !== "READINGS_DISAGREE" || !uuid.test(base.analysisId)) {
        return unavailable("REVIEW_NOT_READY", 409);
      }
      const loaded = await service.rpc("load_matching_trajectory_review", { ...sourceArgs(ids), p_actor_id: actor.id,
        p_analysis_id: base.analysisId });
      if (loaded.error || !loaded.data) return unavailable(loaded.error?.code === "42501" ? "NOT_AUTHORIZED" : "REVIEW_NOT_READY",
        loaded.error?.code === "42501" ? 403 : 409);
      const review = record(loaded.data);
      const conflictCount = review.conflictCount;
      if (!Number.isInteger(conflictCount) || Number(conflictCount) < 1) return unavailable("REVIEW_NOT_READY", 409);
      if (review.reviewable === false) return json({ status: "review_unavailable", reasonCode: "TOO_MANY_CONFLICTS", conflictCount });
      try {
        if (canonical(review.context) !== canonical(context)) return unavailable("SOURCE_STALE", 409);
        const inspected = inspectTrajectoryReadingPair(review.pair, context);
        if (inspected.conflicts.length !== conflictCount || inspected.conflicts.length > 5) return unavailable("REVIEW_NOT_READY", 409);
        if (reviewLoad) return json({ status: "review_pending", analysisId: base.analysisId, conflictCount,
          conflicts: inspected.conflicts });
        const choices = body.choices;
        if (!Array.isArray(choices) || choices.length !== conflictCount || choices.some(item => {
          const row = record(item);
          return Object.keys(row).sort().join() !== "choice,id" || typeof row.id !== "string"
            || !["first", "second", "cannot_determine"].includes(String(row.choice));
        })) return unavailable("REVIEW_INPUT_INVALID", 400);
        const reading = composeReviewedTrajectoryReading(review.pair, context, choices as never);
        const saved = await service.rpc("save_matching_trajectory_review", { ...sourceArgs(ids), p_actor_id: actor.id,
          p_analysis_id: base.analysisId, p_choices: choices, p_reading: reading });
        if (saved.error || !saved.data) return unavailable(saved.error?.code === "42501" ? "NOT_AUTHORIZED"
          : saved.error?.code === "22023" ? "REVIEW_INPUT_INVALID" : "REVIEW_NOT_READY",
          saved.error?.code === "42501" ? 403 : saved.error?.code === "22023" ? 400 : 409);
        const value = record(saved.data);
        if (!uuid.test(String(value.reviewId)) || !["resolved", "unresolved"].includes(String(value.status))) {
          return unavailable("REVIEW_NOT_READY", 409);
        }
        return json({ status: value.status, reviewId: value.reviewId });
      } catch { return unavailable("REVIEW_INPUT_INVALID", 400); }
    }
    if (result.acquired === true) {
      if (!allowCompute || !key) return unavailable("AI_DISABLED");
      let status = "unavailable", reason: string | null = null, agreed: SemanticReading | null = null, actualModel: string | null = null;
      let lastReadingPair: [AuditedReading, AuditedReading] | null = null;
      try {
        // Both independent requests settle before releasing the lease, including a failed sibling.
        const settled = await Promise.allSettled([
          reading(context, model, key, deps),
          reading({ ...context, entries: [...context.entries].reverse() }, model, key, deps),
        ]);
        const [a, b] = settled;
        lastReadingPair = [auditedReading(a), auditedReading(b)];
        const diagnostics: [ReadingDiagnostic, ReadingDiagnostic] = [readingDiagnostic(a), readingDiagnostic(b)];
        const diagnosticStage = a.status === "rejected" || b.status === "rejected" ? "reading_failure"
          : a.value.model !== b.value.model ? "model_disagreement"
          : !agreeTrajectoryReadings(a.value.reading, b.value.reading) ? "readings_disagree" : null;
        const attempt = typeof result.attempts === "number" && Number.isInteger(result.attempts) && result.attempts >= 1 && result.attempts <= 3
          ? result.attempts : null;
        if (diagnosticStage) emitDiagnostic(deps, { event: "matching_trajectory_readings", version: 1,
          analysisId: base.analysisId, attempt,
          stage: diagnosticStage, readings: diagnostics });
        if (a.status === "rejected") throw a.reason;
        if (b.status === "rejected") throw b.reason;
        const first = a.value, second = b.value;
        if (first.model !== second.model) throw new Error("RESPONSE_INVALID");
        actualModel = first.model;
        if (agreeTrajectoryReadings(first.reading, second.reading)) { status = "complete"; agreed = first.reading; }
        else { status = "indeterminate"; reason = "READINGS_DISAGREE"; }
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        reason = ["PROVIDER_UNAVAILABLE", "RESPONSE_INVALID", "PROVIDER_TIMEOUT"].includes(code) ? code : "RESPONSE_INVALID";
      }
      const completion = await service.rpc("complete_matching_trajectory_audited", { p_actor_id: actor.id, p_analysis_id: result.id,
        p_lease: result.lease, p_status: status, p_reading: agreed, p_reason_code: reason, p_actual_model_version: actualModel,
        p_reading_pair: lastReadingPair });
      if (completion.error || !completion.data) return unavailable("COMPLETION_UNAVAILABLE");
      result = record(completion.data);
    }
    if (typeof result.actual_model_version === "string") base.modelVersion = result.actual_model_version;
    // Recheck the user's authority and all source revisions before releasing a cached/new result.
    const finalSources = await actor.client.rpc("load_matching_trajectory_sources", sourceArgs(ids));
    if (finalSources.error?.code === "42501") return unavailable("AUTH_REVOKED");
    if (finalSources.error || !finalSources.data || canonical(record(finalSources.data).sourceVersions) !== canonical(sources.sourceVersions)) {
      return unavailable("SOURCE_STALE");
    }
    if (result.status === "complete") {
      try {
        const validReading = readTrajectoryResponse(result.reading, context);
        const reviewId = typeof result.human_review_id === "string" && uuid.test(result.human_review_id)
          ? result.human_review_id : undefined;
        const resolution = reviewId ? { resolutionSource: "human_review" as const, reviewId,
          reviewVersion: HUMAN_REVIEW_VERSION } : {};
        if (snapshot) {
          const loaded = await actor.client.rpc("load_matching_snapshot_sources", sourceArgs(ids));
          if (loaded.error || !loaded.data) return unavailable(loaded.error?.code === "42501" ? "AUTH_REVOKED" : "SNAPSHOT_SOURCE_UNAVAILABLE");
          const snapshotSources = record(loaded.data);
          if (canonical(snapshotSources.sourceVersions) !== canonical(sources.sourceVersions)) return unavailable("SOURCE_STALE");
          const evaluation = buildSnapshotEvaluation(snapshotSources, { ...base, status: "complete", reading: validReading, context,
            ...resolution }, referenceDate);
          if (!evaluation) return unavailable("SNAPSHOT_NOT_READY");
          const committed = await service.rpc("commit_matching_snapshot", { ...sourceArgs(ids), p_actor_id: actor.id,
            p_analysis_id: base.analysisId, p_source_fingerprint: snapshotSources.fingerprint, p_evaluation: evaluation });
          if (committed.error || !committed.data) return unavailable(committed.error?.code === "40001" ? "SOURCE_STALE"
            : committed.error?.code === "42501" ? "AUTH_REVOKED" : "SNAPSHOT_UNAVAILABLE");
          const response = record(committed.data);
          if (typeof response.evaluationId !== "string" || !uuid.test(response.evaluationId)) return unavailable("SNAPSHOT_UNAVAILABLE");
          return json({ evaluationId: response.evaluationId, inputFingerprint: record(evaluation.score).inputFingerprint });
        }
        return json({ ...base, status: "complete", reading: validReading, context, ...resolution });
      } catch { return unavailable(snapshot ? "SNAPSHOT_SOURCE_INVALID" : "CACHE_INVALID"); }
    }
    if (result.status === "processing" || result.status === "indeterminate" || result.status === "unavailable") {
      const attempts = typeof result.attempts === "number" && Number.isInteger(result.attempts) ? result.attempts : 3;
      const retryAfter = typeof result.retry_after === "string" && !Number.isNaN(Date.parse(result.retry_after)) ? result.retry_after : undefined;
      return json({ ...base, status: result.status, ...(typeof result.reason_code === "string" ? { reasonCode: result.reason_code } : {}),
        retryAvailable: result.status === "unavailable" && allowCompute && attempts < 3 && (!retryAfter || Date.parse(retryAfter) <= Date.now()),
        retryExhausted: result.status === "unavailable" && attempts >= 3,
        ...(result.status === "unavailable" && retryAfter ? { retryAfter } : {}) });
    }
    return unavailable("CACHE_INVALID");
  } catch {
    // Never serialize/log provider bodies, credentials, browser input or source data.
    return unavailable("BACKEND_UNAVAILABLE", 503);
  }
}
