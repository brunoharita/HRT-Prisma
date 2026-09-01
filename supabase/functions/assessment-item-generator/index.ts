import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const BOUNDARY_VERSION = "m51c-assessment-item-generator-1.0.0";
const REQUEST_SCHEMA_VERSION = "m51c-assessment-item-generation-request-1.0.0";
const MAX_BODY_BYTES = 32 * 1024;
const memoryRateWindow = new Map<string, number[]>();

interface GenerationBody {
  schemaVersion?: string;
  organizationId?: string;
  generationNeedId?: string;
  quantity?: number;
  targetScope?: "global" | "organization";
  idempotencyKey?: string;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const headers = responseHeaders(origin);
  if (request.method === "OPTIONS") return isAllowedOrigin(origin)
    ? new Response("ok", { status: 200, headers })
    : jsonResponse(403, { error: "Origem não autorizada." }, headers);
  if (request.method !== "POST" || !isAllowedOrigin(origin)) return jsonResponse(403, { error: "Acesso não autorizado." }, headers);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return jsonResponse(413, { error: "Requisição excede o limite permitido." }, headers);

  try {
    const userClient = createUserClient(request);
    const user = await requireAuthUser(userClient);
    enforceMemoryRateLimit(user.id);
    requireEnabledConfiguration();
    const body = await request.json() as GenerationBody;
    if (body.schemaVersion !== REQUEST_SCHEMA_VERSION) throw new HttpError(409, "Versão de requisição não suportada.");
    const organizationId = requireUuid(body.organizationId, "organizationId");
    const generationNeedId = requireUuid(body.generationNeedId, "generationNeedId");
    const quantity = Number(body.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new HttpError(400, "Quantidade inválida.");
    const targetScope = body.targetScope === "global" ? "global" : "organization";
    const estimatedCostCents = quantity * readPositiveIntegerEnv("M51C_ESTIMATED_COST_CENTS_PER_ITEM");
    const idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    const { data: queued, error: queueError } = await userClient.rpc("request_m51c_item_generation", {
      p_organization_id: organizationId,
      p_generation_need_id: generationNeedId,
      p_quantity: quantity,
      p_target_scope: targetScope,
      p_estimated_cost_cents: estimatedCostCents,
      p_idempotency_key: idempotencyKey,
    });
    if (queueError) throw queueError;
    const queuedResult = asRecord(queued);
    const requestId = String(queuedResult.requestId ?? "");
    if (queuedResult.replayed === true && queuedResult.status === "completed") {
      return jsonResponse(200, { requestId, status: "completed", replayed: true, boundaryVersion: BOUNDARY_VERSION }, headers);
    }
    const serviceClient = createServiceClient();
    try {
      const context = await readGenerationContext(serviceClient, requestId, organizationId);
      const providerResult = await generateProposals(context, quantity);
      const { data, error } = await serviceClient.rpc("complete_m51c_external_generation", {
        p_request_id: requestId,
        p_proposals: providerResult.items,
        p_usage: providerResult.usage,
      });
      if (error) throw error;
      return jsonResponse(200, { ...asRecord(data), boundaryVersion: BOUNDARY_VERSION }, headers);
    } catch (error) {
      await serviceClient.rpc("fail_m51c_external_generation", {
        p_request_id: requestId,
        p_error_class: classifyProviderError(error),
      });
      throw error;
    }
  } catch (error) {
    return mappedFailure(error, headers);
  }
});

async function readGenerationContext(serviceClient: ReturnType<typeof createServiceClient>, requestId: string, organizationId: string) {
  const { data: requestRow, error: requestError } = await serviceClient.from("assessment_item_generation_requests")
    .select("id, organization_id, generation_need_id, requested_quantity, target_scope, directives, model, prompt_version, schema_version")
    .eq("id", requestId).eq("organization_id", organizationId).single();
  if (requestError || !requestRow) throw new HttpError(404, "Pedido de geração não encontrado.");
  const { data: needRow, error: needError } = await serviceClient.from("assessment_item_generation_needs")
    .select("blueprint_id, competency_key, target_level, dimension, modality, language, deficit")
    .eq("id", requestRow.generation_need_id).eq("organization_id", organizationId).single();
  if (needError || !needRow) throw new HttpError(404, "Necessidade de geração não encontrada.");
  return { request: requestRow, need: needRow };
}

async function generateProposals(context: Awaited<ReturnType<typeof readGenerationContext>>, quantity: number) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${readRequiredEnv("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: readRequiredEnv("M51C_GENERATION_MODEL"),
      store: false,
      instructions: "Gere itens técnicos sem dados pessoais, nomes, empresas ou contexto de candidatos. Não use pesquisa web. Responda somente no schema.",
      input: JSON.stringify({
        competencyKey: context.need.competency_key,
        targetLevel: context.need.target_level,
        dimension: context.need.dimension,
        modality: context.need.modality,
        language: context.need.language,
        quantity,
        directives: context.request.directives,
      }),
      text: { format: { type: "json_schema", name: "assessment_item_proposals", strict: true, schema: proposalSchema(quantity) } },
    }),
  });
  if (!response.ok) throw new HttpError(502, "Provider de geração indisponível.");
  const payload = await response.json() as Record<string, unknown>;
  const outputText = Array.isArray(payload.output)
    ? payload.output.flatMap((item) => Array.isArray(asRecord(item).content) ? asRecord(item).content as unknown[] : [])
      .map(asRecord).find((content) => content.type === "output_text")?.text
    : undefined;
  if (typeof outputText !== "string") throw new HttpError(502, "Provider retornou saída inválida.");
  let parsed: { items?: unknown };
  try { parsed = JSON.parse(outputText); } catch { throw new HttpError(502, "Provider retornou JSON inválido."); }
  if (!Array.isArray(parsed.items) || parsed.items.length !== quantity) throw new HttpError(502, "Provider retornou quantidade incompatível.");
  validateProviderItems(parsed.items, context);
  const usage = asRecord(payload.usage);
  const inputTokens = Number(usage.input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const costCents = Math.ceil((inputTokens * readPositiveIntegerEnv("M51C_INPUT_COST_CENTS_PER_MILLION")
    + outputTokens * readPositiveIntegerEnv("M51C_OUTPUT_COST_CENTS_PER_MILLION")) / 1_000_000);
  return { items: parsed.items, usage: { inputTokens, outputTokens, costCents, provider: "openai-responses", model: readRequiredEnv("M51C_GENERATION_MODEL"), providerRequestId: String(payload.id ?? "") } };
}

function validateProviderItems(items: unknown[], context: Awaited<ReturnType<typeof readGenerationContext>>) {
  for (const rawItem of items) {
    const item = asRecord(rawItem);
    const options = Array.isArray(item.options) ? item.options.map(asRecord) : [];
    const visibleText = `${String(item.stem ?? "")} ${options.map((option) => String(option.label ?? "")).join(" ")}`;
    if (String(item.competencyKey ?? "") !== context.need.competency_key
      || String(item.targetLevel ?? "") !== context.need.target_level
      || String(item.dimension ?? "") !== context.need.dimension
      || String(item.modality ?? "") !== context.need.modality
      || String(item.language ?? "") !== context.need.language) {
      throw new HttpError(502, "Provider retornou metadados fora do contrato solicitado.");
    }
    const optionIds = options.map((option) => String(option.id ?? ""));
    if (new Set(optionIds).size !== optionIds.length || !optionIds.includes(String(item.correctOptionId ?? ""))) {
      throw new HttpError(502, "Provider retornou alternativas inválidas.");
    }
    const minimum = Number(item.expectedTimeMinSeconds);
    const typical = Number(item.expectedTimeTypicalSeconds);
    const maximum = Number(item.expectedTimeMaxSeconds);
    if (![minimum, typical, maximum].every(Number.isInteger) || minimum < 0 || minimum > typical || typical > maximum) {
      throw new HttpError(502, "Provider retornou tempos inválidos.");
    }
    if (visibleText.length > 12_000 || containsPotentialPii(visibleText)
      || /\b(resposta correta|gabarito|correct answer)\b/i.test(visibleText)) {
      throw new HttpError(502, "Provider retornou conteúdo bloqueado pela validação de segurança.");
    }
  }
}

function proposalSchema(quantity: number) {
  return {
    type: "object", additionalProperties: false, required: ["items"],
    properties: { items: { type: "array", minItems: quantity, maxItems: quantity, items: {
      type: "object", additionalProperties: false,
      required: ["key", "competencyKey", "targetLevel", "dimension", "difficulty", "language", "modality", "stem", "options", "correctOptionId", "explanation", "expectedTimeMinSeconds", "expectedTimeTypicalSeconds", "expectedTimeMaxSeconds"],
      properties: {
        key: { type: "string" }, competencyKey: { type: "string" }, targetLevel: { type: "string", enum: ["basic", "intermediate", "advanced"] },
        dimension: { type: "string" }, difficulty: { type: "string", enum: ["low", "medium", "high"] }, language: { type: "string" },
        modality: { type: "string", enum: ["multiple_choice"] }, stem: { type: "string" },
        options: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["id", "label"], properties: { id: { type: "string" }, label: { type: "string" } } } },
        correctOptionId: { type: "string" }, explanation: { type: "string" }, expectedTimeMinSeconds: { type: "integer" },
        expectedTimeTypicalSeconds: { type: "integer" }, expectedTimeMaxSeconds: { type: "integer" },
      },
    } } },
  };
}

function requireEnabledConfiguration() {
  if (Deno.env.get("M51C_AI_ITEM_GENERATION_ENABLED") !== "true") throw new HttpError(503, "Geração por IA implementada, mas não ativada.");
  readRequiredEnv("OPENAI_API_KEY"); readRequiredEnv("M51C_GENERATION_MODEL");
  readPositiveIntegerEnv("M51C_ESTIMATED_COST_CENTS_PER_ITEM");
  readPositiveIntegerEnv("M51C_INPUT_COST_CENTS_PER_MILLION");
  readPositiveIntegerEnv("M51C_OUTPUT_COST_CENTS_PER_MILLION");
}

function createUserClient(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new HttpError(401, "Sessão inválida.");
  return createClient(readRequiredEnv("SUPABASE_URL"), readPublishableKey(), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
}
function createServiceClient() { return createClient(readRequiredEnv("SUPABASE_URL"), readSecretKey(), { auth: { persistSession: false } }); }
async function requireAuthUser(client: ReturnType<typeof createUserClient>) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Sessão inválida.");
  return data.user;
}
function enforceMemoryRateLimit(key: string) {
  const now = Date.now(); const recent = (memoryRateWindow.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 10) throw new HttpError(429, "Limite temporário de geração atingido.");
  recent.push(now); memoryRateWindow.set(key, recent);
}
function isAllowedOrigin(origin: string) {
  const allowed = new Set(["http://127.0.0.1:5555", "http://localhost:5555", ...String(Deno.env.get("M51C_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean)]);
  return allowed.has(origin);
}
function responseHeaders(origin: string): HeadersInit { return {
  "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'",
  "Content-Type": "application/json; charset=utf-8", Vary: "Origin",
}; }
function mappedFailure(error: unknown, headers: HeadersInit) {
  const message = error instanceof Error ? error.message : String(asRecord(error).message ?? "");
  if (message.includes("BUDGET") || message.includes("DISABLED")) return jsonResponse(503, { error: "Geração externa indisponível por política ou orçamento." }, headers);
  if (message.includes("AUTH") || message.includes("Sessão") || message.includes("permission")) return jsonResponse(401, { error: "Sessão inválida." }, headers);
  if (message.includes("ROLE") || message.includes("SCOPE") || message.includes("authorized")) return jsonResponse(403, { error: "Operação não autorizada." }, headers);
  if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, headers);
  return jsonResponse(400, { error: "Não foi possível concluir a geração." }, headers);
}
function requireUuid(value: unknown, name: string) { const text = String(value ?? ""); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new HttpError(400, `${name} inválido.`); return text; }
function requireIdempotencyKey(value: unknown) { const text = String(value ?? ""); if (!/^[0-9a-z-]{16,120}$/i.test(text)) throw new HttpError(400, "Chave de idempotência inválida."); return text; }
function containsPotentialPii(value: string) { return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(value) || /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/.test(value); }
function classifyProviderError(error: unknown) { if (error instanceof HttpError) return `http_${error.status}`; return "provider_or_persistence_failure"; }
function readRequiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new HttpError(503, `Configuração ausente: ${name}.`); return value; }
function readPositiveIntegerEnv(name: string) { const value = Number(readRequiredEnv(name)); if (!Number.isInteger(value) || value <= 0) throw new HttpError(503, `Configuração inválida: ${name}.`); return value; }
function readPublishableKey() { const value = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"); return value ? JSON.parse(value).default as string : readRequiredEnv("SUPABASE_ANON_KEY"); }
function readSecretKey() { const value = Deno.env.get("SUPABASE_SECRET_KEYS"); return value ? JSON.parse(value).default as string : readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"); }
function asRecord(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function jsonResponse(status: number, payload: Record<string, unknown>, headers: HeadersInit) { return new Response(JSON.stringify(payload), { status, headers }); }
class HttpError extends Error { constructor(public status: number, message: string) { super(message); this.name = "HttpError"; } }
