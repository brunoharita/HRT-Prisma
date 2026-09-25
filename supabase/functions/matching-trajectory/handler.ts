import {
  agreeTrajectoryReadings, isSemanticPilot, prepareTrajectoryContext, readTrajectoryResponse,
  SEMANTIC_METHOD_VERSION, SEMANTIC_PROMPT_VERSION, trajectoryInstructions, trajectoryResponseSchema,
  type SemanticAssessment, type SemanticContext, type SemanticReading,
} from "../../../src/domain/semanticTrajectory.ts";
import { buildSnapshotEvaluation } from "./snapshot.ts";

type RpcResult = { data: unknown; error: { code?: string } | null };
export interface RpcClient { rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult> }
export interface Dependencies {
  env(name: string): string | undefined;
  authenticate(bearer: string): Promise<{ id: string; client: RpcClient } | null>;
  service(): RpcClient;
  fetch: typeof fetch;
}
type RequestIds = Pick<SemanticAssessment, "organizationId" | "profileId" | "positionVersionId">;
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
async function reading(context: SemanticContext, model: string, key: string, deps: Dependencies): Promise<{ reading: SemanticReading; model: string }> {
  let response: Response;
  try {
    response = await deps.fetch("https://api.openai.com/v1/responses", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, store: false, max_output_tokens: 6000, reasoning: { effort: "low" },
        instructions: trajectoryInstructions, input: JSON.stringify(context),
        text: { format: { type: "json_schema", name: "trajectory_reading", strict: true, schema: trajectoryResponseSchema } },
      }),
    });
  } catch (error) {
    throw new Error(error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)
      ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) throw new Error("PROVIDER_UNAVAILABLE");
  try {
    const provider = record(await response.json());
    if (provider.status !== "completed" || provider.error != null || provider.incomplete_details != null
      || typeof provider.model !== "string" || !provider.model.trim() || provider.model.length > 160) throw new Error("RESPONSE_INVALID");
    const outputs = Array.isArray(provider.output) ? provider.output : [];
    const messages = outputs.map(record).filter(item => item.type === "message");
    if (outputs.some(item => !["message", "reasoning"].includes(String(record(item).type)))
      || messages.length !== 1 || messages[0].role !== "assistant" || messages[0].status !== "completed") throw new Error("RESPONSE_INVALID");
    const texts = Array.isArray(messages[0].content) ? messages[0].content.map(record) : [];
    if (texts.length !== 1 || texts[0].type !== "output_text" || typeof texts[0].text !== "string") throw new Error("RESPONSE_INVALID");
    const text = texts[0].text;
    return { reading: readTrajectoryResponse(JSON.parse(text), context), model: provider.model };
  } catch { throw new Error("RESPONSE_INVALID"); }
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
    if (Object.keys(body).sort().join() !== (snapshot ? "operation,organizationId,positionVersionId,profileId" : "organizationId,positionVersionId,profileId")
      || ![body.organizationId, body.profileId, body.positionVersionId].every(value => typeof value === "string" && uuid.test(value))) {
      return unavailable("REQUEST_INVALID", 400);
    }
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
        Array.isArray(sources.redactions) ? sources.redactions.filter((item): item is string => typeof item === "string") : []);
    } catch (error) {
      return unavailable(error instanceof Error && error.message === "TRAJECTORY_SENSITIVE_CONTEXT" ? "INPUT_REQUIRES_REVIEW" : "INPUT_LIMIT");
    }
    if (!context.entries.length) return unavailable("NO_TRAJECTORY_EVIDENCE");
    const key = deps.env("OPENAI_API_KEY");
    if (!model) return unavailable("AI_DISABLED");
    const allowCompute = !snapshot && deps.env("KNOWLEDGE_AGENT_ENABLED") === "true" && Boolean(key);
    base.inputHash = await inputHash(context, sources.sourceVersions);
    const service = deps.service();
    const claimed = await service.rpc("claim_matching_trajectory", { ...sourceArgs(ids), p_actor_id: actor.id,
      p_input_hash: base.inputHash, p_method_version: SEMANTIC_METHOD_VERSION, p_prompt_version: SEMANTIC_PROMPT_VERSION,
      p_model_version: model, p_source_versions: sources.sourceVersions, p_context: context, p_allow_compute: allowCompute });
    if (claimed.error || !claimed.data) return unavailable("CACHE_UNAVAILABLE");
    let result = record(claimed.data);
    base.analysisId = typeof result.id === "string" ? result.id : "";
    if (result.acquired === true) {
      if (!allowCompute || !key) return unavailable("AI_DISABLED");
      let status = "unavailable", reason: string | null = null, agreed: SemanticReading | null = null, actualModel: string | null = null;
      try {
        // Both independent requests settle before releasing the lease, including a failed sibling.
        const settled = await Promise.allSettled([
          reading(context, model, key, deps),
          reading({ ...context, entries: [...context.entries].reverse() }, model, key, deps),
        ]);
        const [a, b] = settled;
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
      const completion = await service.rpc("complete_matching_trajectory", { p_actor_id: actor.id, p_analysis_id: result.id,
        p_lease: result.lease, p_status: status, p_reading: agreed, p_reason_code: reason, p_actual_model_version: actualModel });
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
        if (snapshot) {
          const loaded = await actor.client.rpc("load_matching_snapshot_sources", sourceArgs(ids));
          if (loaded.error || !loaded.data) return unavailable(loaded.error?.code === "42501" ? "AUTH_REVOKED" : "SNAPSHOT_SOURCE_UNAVAILABLE");
          const snapshotSources = record(loaded.data);
          if (canonical(snapshotSources.sourceVersions) !== canonical(sources.sourceVersions)) return unavailable("SOURCE_STALE");
          const evaluation = buildSnapshotEvaluation(snapshotSources, { ...base, status: "complete", reading: validReading, context });
          if (!evaluation) return unavailable("SNAPSHOT_NOT_READY");
          const committed = await service.rpc("commit_matching_snapshot", { ...sourceArgs(ids), p_actor_id: actor.id,
            p_analysis_id: base.analysisId, p_source_fingerprint: snapshotSources.fingerprint, p_evaluation: evaluation });
          if (committed.error || !committed.data) return unavailable(committed.error?.code === "40001" ? "SOURCE_STALE"
            : committed.error?.code === "42501" ? "AUTH_REVOKED" : "SNAPSHOT_UNAVAILABLE");
          const response = record(committed.data);
          if (typeof response.evaluationId !== "string" || !uuid.test(response.evaluationId)) return unavailable("SNAPSHOT_UNAVAILABLE");
          return json({ evaluationId: response.evaluationId, inputFingerprint: record(evaluation.score).inputFingerprint });
        }
        return json({ ...base, status: "complete", reading: validReading, context });
      } catch { return unavailable(snapshot ? "SNAPSHOT_SOURCE_INVALID" : "CACHE_INVALID"); }
    }
    if (result.status === "processing" || result.status === "indeterminate" || result.status === "unavailable") {
      return json({ ...base, status: result.status, ...(typeof result.reason_code === "string" ? { reasonCode: result.reason_code } : {}) });
    }
    return unavailable("CACHE_INVALID");
  } catch {
    // Never serialize/log provider bodies, credentials, browser input or source data.
    return unavailable("BACKEND_UNAVAILABLE", 503);
  }
}
