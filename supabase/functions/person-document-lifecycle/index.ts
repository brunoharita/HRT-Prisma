import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (request.method !== "POST") return respond(405, "Use a ação disponível na tela para excluir o documento.");
    const authorization = request.headers.get("authorization");
    if (!authorization) return respond(401, "Sua sessão expirou. Entre novamente para continuar.");
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action !== "delete_document") return respond(400, "A ação solicitada não está disponível.");
    const organizationId = text(payload.organizationId);
    const personId = text(payload.personId);
    const documentId = text(payload.documentId);
    const idempotencyKey = text(payload.idempotencyKey);
    if (!organizationId || !personId || !documentId || idempotencyKey.length < 16) {
      return respond(400, "Não foi possível identificar o documento. Atualize a página e tente novamente.");
    }

    const url = required("SUPABASE_URL");
    const anonKey = required("SUPABASE_ANON_KEY");
    const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const prepared = await userClient.rpc("prepare_document_deletion", {
      p_organization_id: organizationId,
      p_person_id: personId,
      p_document_id: documentId,
      p_idempotency_key: idempotencyKey,
    });
    if (prepared.error) throw prepared.error;
    const plan = prepared.data?.[0];
    if (!plan) return respond(409, "A exclusão não pôde ser preparada. Atualize a página e tente novamente.");
    if (!plan.reused && plan.storage_bucket && plan.storage_path) {
      const removed = await serviceClient.storage.from(plan.storage_bucket).remove([plan.storage_path]);
      if (removed.error) return respond(503, "O arquivo não pôde ser removido agora. Tente novamente; nenhuma informação foi perdida.");
    }
    const finalized = await userClient.rpc("finalize_document_deletion", {
      p_organization_id: organizationId,
      p_operation_id: plan.operation_id,
    });
    if (finalized.error) throw finalized.error;
    return new Response(JSON.stringify({ ok: true, ...(finalized.data?.[0] ?? {}) }), { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "A exclusão não pôde ser concluída agora.";
    if (/jwt|session|authenticated/i.test(message)) return respond(401, "Sua sessão expirou. Entre novamente para continuar.");
    if (/authorized|permission|42501/i.test(message)) return respond(403, "Seu perfil não possui permissão para excluir este documento.");
    if (/not_found|not found/i.test(message)) return respond(404, "Este documento não está mais disponível. Atualize a página para ver o estado atual.");
    console.error("person-document-lifecycle failed", { message });
    return respond(500, "A exclusão foi interrompida antes de concluir. Tente novamente; o Prisma retomará do ponto seguro.");
  }
});

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function respond(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: corsHeaders });
}
