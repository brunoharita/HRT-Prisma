import { createClient } from "npm:@supabase/supabase-js@2.112.3";

interface PublishPayload {
  sourceVersionId: string;
  batchSize?: number;
}

interface PublishResult {
  source_version_id: string;
  phase: string;
  done: boolean;
  processed: number;
  concepts_published: number;
  terms_published: number;
  relations_published: number;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return jsonResponse(204, null);
  if (request.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const payload = await parsePayload(request);
    const serviceClient = createServiceClient();
    const actor = await authorizedSuperAdmin(request, serviceClient);
    if (!actor) return jsonResponse(403, { error: "SUPER_ADMIN_REQUIRED" });

    const { data: version, error: versionError } = await serviceClient
      .from("knowledge_source_versions")
      .select("id,external_version,import_status,is_current,source_id,knowledge_sources!inner(name)")
      .eq("id", payload.sourceVersionId)
      .maybeSingle();
    if (versionError) throw new Error("SOURCE_VERSION_UNAVAILABLE");
    if (!version || !isCentralSource(version.knowledge_sources?.name)) return jsonResponse(404, { error: "SOURCE_VERSION_NOT_FOUND" });
    if (version.is_current || version.import_status === "published") return jsonResponse(409, { error: "SOURCE_VERSION_ALREADY_PUBLISHED" });
    if (version.import_status !== "diff_ready") return jsonResponse(409, { error: "SOURCE_VERSION_NOT_READY" });

    const batchSize = payload.batchSize ?? 10000;
    const { data, error } = await serviceClient.rpc("publish_knowledge_source_version_batch", {
      p_source_version_id: payload.sourceVersionId,
      p_approved_by_auth_user_id: actor,
      p_batch_size: batchSize,
    });
    if (error) throw new Error(error.message || "SOURCE_PUBLICATION_FAILED");
    const result = Array.isArray(data) ? data[0] as PublishResult | undefined : data as PublishResult | null;
    if (!result) throw new Error("SOURCE_PUBLICATION_EMPTY_RESULT");
    return jsonResponse(200, { source: version.knowledge_sources.name, version: version.external_version, result });
  } catch (error) {
    return jsonResponse(500, { error: safeErrorCode(error) });
  }
});

async function parsePayload(request: Request): Promise<PublishPayload> {
  let value: unknown;
  try { value = await request.json(); } catch { throw new Error("INVALID_REQUEST_BODY"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REQUEST_BODY");
  const record = value as Record<string, unknown>;
  const sourceVersionId = typeof record.sourceVersionId === "string" && /^[0-9a-f-]{36}$/i.test(record.sourceVersionId) ? record.sourceVersionId : null;
  if (!sourceVersionId) throw new Error("SOURCE_VERSION_REQUIRED");
  const batchSize = record.batchSize === undefined ? undefined : Number(record.batchSize);
  if (batchSize !== undefined && (!Number.isInteger(batchSize) || batchSize < 100 || batchSize > 10000)) throw new Error("INVALID_BATCH_SIZE");
  return { sourceVersionId, batchSize };
}

function createServiceClient() {
  const url = readRequiredEnv("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("MISSING_SERVICE_CONFIGURATION");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authorizedSuperAdmin(request: Request, serviceClient: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: operator, error: operatorError } = await serviceClient
    .from("platform_users")
    .select("access_profile,status")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  return !operatorError && operator?.status === "active" && operator.access_profile === "super_admin" ? data.user.id : null;
}

function isCentralSource(value: unknown): value is "CBO" | "ESCO" | "O*NET" { return value === "CBO" || value === "ESCO" || value === "O*NET"; }
function readRequiredEnv(name: string): string { const value = Deno.env.get(name); if (!value) throw new Error("MISSING_SERVICE_CONFIGURATION"); return value; }
function safeErrorCode(error: unknown): string { return (error instanceof Error ? error.message : "UNEXPECTED_SOURCE_PUBLICATION_FAILURE").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "UNEXPECTED_SOURCE_PUBLICATION_FAILURE"; }
function jsonResponse(status: number, body: unknown): Response { return new Response(body === null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } }); }
