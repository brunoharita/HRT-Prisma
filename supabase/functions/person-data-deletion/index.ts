import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const BOUNDARY_VERSION = "person-data-deletion-boundary-1.0.0";
const REQUEST_VERSION = "person-data-deletion-request-1.0.0";
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_ORIGINS = ["http://127.0.0.1:5555", "http://localhost:5555"];
const memoryRateWindow = new Map<string, number[]>();

interface BoundaryRequest {
  action?: string;
  token?: string;
  schemaVersion?: string;
  payload?: Record<string, unknown>;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const headers = responseHeaders(origin);
  if (request.method === "OPTIONS") {
    return allowedOrigins().has(origin)
      ? new Response("ok", { status: 200, headers })
      : jsonResponse(403, { error: "Acesso indisponível." }, headers);
  }
  if (request.method !== "POST" || !allowedOrigins().has(origin)) {
    return jsonResponse(403, { error: "Acesso indisponível." }, headers);
  }

  let operationId = "";
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse(413, { error: "Requisição excede o limite permitido." }, headers);
    }
    const body = JSON.parse(rawBody) as BoundaryRequest;
    if (body.schemaVersion !== REQUEST_VERSION) {
      return jsonResponse(409, { error: "Versão de requisição não suportada." }, headers);
    }
    const action = String(body.action ?? "");
    const payload = isRecord(body.payload) ? body.payload : {};
    if (action === "preview") return await previewForOperator(request, payload, headers);
    if (action === "issue_self_access") return await issueSelfAccess(request, payload, headers);
    if (action === "delete") {
      const prepared = await beginForOperator(request, payload);
      operationId = String(prepared.operation_id ?? "");
      return await completeDeletion(prepared, headers);
    }
    if (action === "inspect_self" || action === "delete_self") {
      const token = String(body.token ?? "");
      if (!/^[A-Za-z0-9_-]{40,200}$/.test(token)) return selfUnavailable(headers);
      const tokenHash = await sha256(token);
      enforceMemoryRateLimit(`${tokenHash}:${action}`);
      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient.rpc("person_self_service_access", {
        p_action: action === "inspect_self" ? "inspect" : "delete",
        p_token_hash: tokenHash,
        p_payload: payload,
      });
      if (error) throw error;
      const result = asRecord(data);
      if (action === "inspect_self") {
        return jsonResponse(200, { ...result, boundaryVersion: BOUNDARY_VERSION }, headers);
      }
      operationId = String(result.operation_id ?? "");
      return await completeDeletion(result, headers);
    }
    return jsonResponse(400, { error: "Ação indisponível." }, headers);
  } catch (error) {
    if (operationId) await markRetryable(operationId, error);
    return mappedFailure(error, headers);
  }
});

async function previewForOperator(request: Request, payload: Record<string, unknown>, headers: HeadersInit) {
  const userClient = createUserClient(request);
  const { data, error } = await userClient.rpc("preview_person_definitive_deletion", {
    p_organization_id: String(payload.organizationId ?? ""),
    p_person_id: String(payload.personId ?? ""),
  });
  if (error) throw error;
  const result = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  return jsonResponse(200, { ...result, boundaryVersion: BOUNDARY_VERSION }, headers);
}

async function beginForOperator(request: Request, payload: Record<string, unknown>) {
  const userClient = createUserClient(request);
  const { data, error } = await userClient.rpc("begin_person_definitive_deletion", {
    p_organization_id: String(payload.organizationId ?? ""),
    p_person_id: String(payload.personId ?? ""),
    p_preflight_fingerprint: String(payload.preflightFingerprint ?? ""),
    p_idempotency_key: String(payload.idempotencyKey ?? ""),
  });
  if (error) throw error;
  const result = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!result.operation_id) throw new Error("PERSON_DELETION_PREPARE_EMPTY");
  return result;
}

async function issueSelfAccess(request: Request, payload: Record<string, unknown>, headers: HeadersInit) {
  const organizationId = String(payload.organizationId ?? "");
  const personId = String(payload.personId ?? "");
  const idempotencyKey = String(payload.idempotencyKey ?? "");
  if (!organizationId || !personId || idempotencyKey.length < 16) throw new Error("SELF_SERVICE_ISSUE_INVALID");
  const token = await deterministicOpaqueToken(`${organizationId}:${personId}:${idempotencyKey}`);
  const tokenHash = await sha256(token);
  const userClient = createUserClient(request);
  const { data, error } = await userClient.rpc("issue_person_self_service_access", {
    p_organization_id: organizationId,
    p_person_id: personId,
    p_token_hash: tokenHash,
    p_contact_kind: String(payload.contactKind ?? ""),
    p_valid_minutes: Number(payload.validMinutes ?? 30),
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  return jsonResponse(200, {
    ...result,
    token,
    relativePath: `/my-data/${token}`,
    boundaryVersion: BOUNDARY_VERSION,
  }, headers);
}

async function completeDeletion(plan: Record<string, unknown>, headers: HeadersInit) {
  const operationId = String(plan.operation_id ?? "");
  if (!operationId) throw new Error("PERSON_DELETION_OPERATION_MISSING");
  const serviceClient = createServiceClient();
  const storagePlan = Array.isArray(plan.storage_plan) ? plan.storage_plan : [];
  for (const rawItem of storagePlan) {
    const item = asRecord(rawItem);
    const bucket = String(item.bucket ?? "");
    const path = String(item.path ?? "");
    if (!bucket || !path) throw new Error("PERSON_DELETION_STORAGE_PLAN_INVALID");
    const removed = await serviceClient.storage.from(bucket).remove([path]);
    if (removed.error) throw new Error("PERSON_DELETION_STORAGE_REMOVE_FAILED");
    const separator = path.lastIndexOf("/");
    const folder = separator >= 0 ? path.slice(0, separator) : "";
    const fileName = separator >= 0 ? path.slice(separator + 1) : path;
    const verification = await serviceClient.storage.from(bucket).list(folder, {
      limit: 100,
      search: fileName,
    });
    if (verification.error) throw new Error("PERSON_DELETION_STORAGE_VERIFY_FAILED");
    if ((verification.data ?? []).some((entry) => entry.name === fileName)) {
      throw new Error("PERSON_DELETION_STORAGE_RESIDUE");
    }
    const marked = await serviceClient.rpc("mark_person_deletion_storage_removed", {
      p_operation_id: operationId,
      p_storage_bucket: bucket,
      p_storage_path: path,
    });
    if (marked.error) throw marked.error;
  }
  const organizationId = await operationOrganization(serviceClient, operationId);
  const finalized = await serviceClient.rpc("finalize_person_definitive_deletion", {
    p_organization_id: organizationId,
    p_operation_id: operationId,
  });
  if (finalized.error) throw finalized.error;
  const result = Array.isArray(finalized.data) ? asRecord(finalized.data[0]) : asRecord(finalized.data);
  return jsonResponse(200, { ok: true, ...result, boundaryVersion: BOUNDARY_VERSION }, headers);
}

async function operationOrganization(client: ReturnType<typeof createServiceClient>, operationId: string): Promise<string> {
  const { data, error } = await client.from("person_deletion_operations")
    .select("organization_id").eq("id", operationId).maybeSingle();
  if (error || !data?.organization_id) throw new Error("PERSON_DELETION_OPERATION_UNAVAILABLE");
  return String(data.organization_id);
}

async function markRetryable(operationId: string, error: unknown): Promise<void> {
  try {
    const code = safeErrorCode(error);
    await createServiceClient().rpc("fail_person_deletion_retryable", {
      p_operation_id: operationId,
      p_error_code: code,
    });
  } catch {
    // Best effort only; the authoritative ledger remains non-completed on interruption.
  }
}

function createUserClient(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("PERSON_DELETION_AUTH_REQUIRED");
  return createClient(readRequiredEnv("SUPABASE_URL"), readPublishableKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function createServiceClient() {
  return createClient(readRequiredEnv("SUPABASE_URL"), readSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function deterministicOpaqueToken(seed: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(readSecretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`person-self-service:${seed}`));
  return base64Url(new Uint8Array(signed));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function enforceMemoryRateLimit(key: string): void {
  const now = Date.now();
  const recent = (memoryRateWindow.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 30) throw new Error("PERSON_DELETION_RATE_LIMITED");
  recent.push(now);
  memoryRateWindow.set(key, recent);
  if (memoryRateWindow.size > 2_000) {
    for (const [storedKey, timestamps] of memoryRateWindow) {
      if (timestamps.every((timestamp) => now - timestamp >= 60_000)) memoryRateWindow.delete(storedKey);
    }
  }
}

function mappedFailure(error: unknown, headers: HeadersInit): Response {
  const message = safeErrorCode(error);
  if (message.includes("RATE_LIMITED")) return jsonResponse(429, { error: "Muitas tentativas. Aguarde um minuto." }, headers);
  if (message.includes("self_service") || message.includes("SELF_SERVICE") || message.includes("UNAVAILABLE")) return selfUnavailable(headers);
  if (message.includes("AUTH") || message.includes("JWT")) return jsonResponse(401, { error: "Sua sessão expirou. Entre novamente para continuar." }, headers);
  if (message.includes("access_denied") || message.includes("permission") || message.includes("42501")) return jsonResponse(403, { error: "Seu perfil não possui permissão para excluir esta Pessoa." }, headers);
  if (message.includes("preflight_changed")) return jsonResponse(409, { error: "Os dados mudaram. Revise novamente o impacto antes de excluir." }, headers);
  if (message.includes("already_in_progress") || message.includes("idempotency")) return jsonResponse(409, { error: "Já existe uma exclusão para esta Pessoa. Atualize a página para continuar." }, headers);
  if (message.includes("STORAGE") || message.includes("storage")) return jsonResponse(503, { error: "Os arquivos não puderam ser removidos agora. Tente novamente para retomar com segurança." }, headers);
  console.error("person-data-deletion failed", { code: message.slice(0, 120) });
  return jsonResponse(500, { error: "A exclusão foi interrompida antes de concluir. Tente novamente para retomar do ponto seguro." }, headers);
}

function selfUnavailable(headers: HeadersInit): Response {
  return jsonResponse(404, { error: "Acesso indisponível ou expirado." }, headers);
}

function responseHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigins().has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function allowedOrigins(): Set<string> {
  const configured = (Deno.env.get("ALLOWED_APP_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
}

function jsonResponse(status: number, payload: Record<string, unknown>, headers: HeadersInit): Response {
  return new Response(JSON.stringify(payload), { status, headers });
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("PERSON_DELETION_BOUNDARY_CONFIGURATION_ERROR");
  return value;
}

function readPublishableKey(): string {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  return readRequiredEnv("SUPABASE_ANON_KEY");
}

function readSecretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error)) return String(error.message ?? error.code ?? "PERSON_DELETION_FAILED");
  return "PERSON_DELETION_FAILED";
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
