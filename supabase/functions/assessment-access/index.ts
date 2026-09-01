import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const BOUNDARY_VERSION = "m51b-assessment-access-boundary-1.0.0";
const REQUEST_SCHEMA_VERSION = "m51b-assessment-access-request-1.0.0";
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:5555",
  "http://127.0.0.1:5556",
  "http://localhost:5555",
  "http://localhost:5556",
]);
const MAX_BODY_BYTES = 64 * 1024;
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
    return ALLOWED_ORIGINS.has(origin)
      ? new Response("ok", { status: 200, headers })
      : jsonResponse(403, { error: "Origem não autorizada." }, headers);
  }
  if (request.method !== "POST" || !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { error: "Acesso não autorizado." }, headers);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonResponse(413, { error: "Requisição excede o limite permitido." }, headers);

  try {
    const body = await request.json() as BoundaryRequest;
    if (body.schemaVersion !== REQUEST_SCHEMA_VERSION) {
      return jsonResponse(409, { error: "Versão de requisição não suportada." }, headers);
    }
    const action = String(body.action ?? "");
    const payload = isRecord(body.payload) ? body.payload : {};
    if (action === "issue") return await issueInvitation(request, payload, headers);
    if (action === "cancel" || action === "revoke") return await manageInvitation(request, action, payload, headers);
    return await handleParticipantAction(action, String(body.token ?? ""), payload, headers);
  } catch (error) {
    return mappedFailure(error, headers);
  }
});

async function issueInvitation(request: Request, payload: Record<string, unknown>, headers: HeadersInit) {
  const token = createOpaqueToken();
  const tokenHash = await sha256(token);
  const userClient = createUserClient(request);
  const { data, error } = await userClient.rpc("issue_m51b_invitation", {
    p_prepared_assessment_id: String(payload.preparedAssessmentId ?? ""),
    p_token_hash: tokenHash,
    p_delivery_channel: String(payload.deliveryChannel ?? "link"),
    p_valid_days: Number(payload.validDays ?? 7),
    p_result_visibility: String(payload.resultVisibility ?? "completion_only"),
    p_message: String(payload.message ?? ""),
    p_idempotency_key: String(payload.idempotencyKey ?? crypto.randomUUID()),
  });
  if (error) throw error;
  return jsonResponse(200, {
    ...asRecord(data),
    token,
    relativePath: `/verify/${token}`,
    boundaryVersion: BOUNDARY_VERSION,
  }, headers);
}

async function manageInvitation(request: Request, action: "cancel" | "revoke", payload: Record<string, unknown>, headers: HeadersInit) {
  const userClient = createUserClient(request);
  const { data, error } = await userClient.rpc("manage_m51b_invitation", {
    p_invitation_id: String(payload.invitationId ?? ""),
    p_action: action,
  });
  if (error) throw error;
  return jsonResponse(200, { ...asRecord(data), boundaryVersion: BOUNDARY_VERSION }, headers);
}

async function handleParticipantAction(action: string, token: string, payload: Record<string, unknown>, headers: HeadersInit) {
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(token)) return jsonResponse(404, { error: "Convite indisponível." }, headers);
  const tokenHash = await sha256(token);
  enforceMemoryRateLimit(`${tokenHash}:${action}`);
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc("m51b_public_access", {
    p_action: action,
    p_token_hash: tokenHash,
    p_payload: payload,
  });
  if (error) throw error;
  return jsonResponse(200, { ...asRecord(data), boundaryVersion: BOUNDARY_VERSION }, headers);
}

function createUserClient(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("M51B_OPERATOR_AUTH_REQUIRED");
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

function createOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function enforceMemoryRateLimit(key: string): void {
  const now = Date.now();
  const recent = (memoryRateWindow.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 60) throw new Error("M51B_RATE_LIMITED");
  recent.push(now);
  memoryRateWindow.set(key, recent);
  if (memoryRateWindow.size > 2_000) {
    for (const [storedKey, timestamps] of memoryRateWindow) {
      if (timestamps.every((timestamp) => now - timestamp >= 60_000)) memoryRateWindow.delete(storedKey);
    }
  }
}

function mappedFailure(error: unknown, headers: HeadersInit): Response {
  const message = error instanceof Error ? error.message : isRecord(error) ? String(error.message ?? "") : "";
  if (message.includes("RATE_LIMITED")) return jsonResponse(429, { error: "Muitas tentativas. Aguarde um minuto." }, headers);
  if (message.includes("UNAVAILABLE") || message.includes("ACCESS_DENIED")) return jsonResponse(404, { error: "Convite indisponível." }, headers);
  if (message.includes("STALE_RESPONSE_VERSION")) return jsonResponse(409, { error: "A resposta mudou em outra sessão. Recarregue a verificação." }, headers);
  if (message.includes("UNKNOWN_") || message.includes("VERSION")) return jsonResponse(409, { error: "A versão desta verificação não é suportada." }, headers);
  if (message.includes("AUTH") || message.includes("JWT") || message.includes("permission")) return jsonResponse(401, { error: "Sessão do operador inválida." }, headers);
  if (message.includes("ATTEMPT_LOCKED")) return jsonResponse(409, { error: "Esta tentativa já foi finalizada ou não pode mais ser alterada." }, headers);
  return jsonResponse(400, { error: "Não foi possível concluir esta operação de verificação." }, headers);
}

function responseHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function jsonResponse(status: number, payload: Record<string, unknown>, headers: HeadersInit): Response {
  return new Response(JSON.stringify(payload), { status, headers });
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("M51B_BOUNDARY_CONFIGURATION_ERROR");
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

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
