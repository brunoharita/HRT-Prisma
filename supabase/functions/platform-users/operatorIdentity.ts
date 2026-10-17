import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";

type Client = SupabaseClient;
const TECHNICAL_DOMAIN = "users.prisma.invalid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CONTACT_EMAIL = /^[^\s<>@,;\x00-\x1f\x7f]+@[^\s<>@,;\x00-\x1f\x7f]+\.[^\s<>@,;\x00-\x1f\x7f]+$/;
const APP_ORIGIN = "https://prisma.hrtsolutions.com.br";

export class AccessEmailError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function technicalAuthEmail(identity: string = crypto.randomUUID()): string {
  if (!UUID.test(identity)) throw new Error("Identidade técnica inválida.");
  return `auth+${identity.toLowerCase()}@${TECHNICAL_DOMAIN}`;
}

export function isTechnicalAuthEmail(email: string): boolean {
  return /^auth\+[0-9a-f-]{36}@users\.prisma\.invalid$/.test(email);
}

export async function readAuthIdentity(client: Client, authUserId: string) {
  const { data, error } = await client.auth.admin.getUserById(authUserId);
  if (error || !data.user || data.user.id !== authUserId || !data.user.email) {
    throw new AccessEmailError(400, "Não foi possível resolver a identidade de acesso.");
  }
  return data.user;
}

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Shared by the three operator Edges. Caller authorizes the target first; never log/return links or tokens. */
export async function sendOperatorAccessEmail(client: Client, authUserId: string, purpose: "activation" | "recovery", actorId: string | null = null) {
  const { data: apiKey, error: configError } = await client.rpc("operator_access_email_configuration");
  if (configError || typeof apiKey !== "string" || !apiKey.startsWith("re_")) {
    throw new AccessEmailError(503, "Envio de acesso indisponível. Tente novamente mais tarde.");
  }
  const { data: claim, error: claimError } = await client.rpc("claim_operator_access_email", { p_auth_user: authUserId, p_purpose: purpose, p_actor: actorId });
  if (claimError) throw new AccessEmailError(503, "Não foi possível registrar a solicitação de acesso.");
  if (!claim) throw new AccessEmailError(429, "Aguarde antes de solicitar outro link para este usuário.");
  let state: "failed" | "unknown" = "failed";
  try {
    if (!UUID.test(claim.requestId) || !CONTACT_EMAIL.test(claim.email) || isTechnicalAuthEmail(claim.email)
      || !/^[a-z0-9._-]{3,32}$/.test(claim.username)) throw new Error("Invalid claim");
    const identity = await readAuthIdentity(client, authUserId);
    const redirectTo = `${APP_ORIGIN}/change-password`;
    const { data, error } = await client.auth.admin.generateLink({ type: "recovery", email: identity.email!, options: { redirectTo } });
    if (error || data.user?.id !== authUserId || !data.properties?.action_link) throw new Error("Invalid identity link");
    const link = new URL(data.properties.action_link);
    if (link.origin !== new URL(Deno.env.get("SUPABASE_URL")!).origin || link.pathname !== "/auth/v1/verify"
      || link.searchParams.get("type") !== "recovery" || link.searchParams.get("redirect_to") !== redirectTo
      || !link.searchParams.get("token")) throw new Error("Invalid redirect");
    const action = purpose === "activation" ? "Ativar acesso" : "Redefinir senha";
    const text = `${action} no Prisma\n\nUsuário: ${claim.username}\n\n${link.href}\n\nEste link tem prazo limitado e é de uso único. Ele altera somente o acesso do usuário indicado. Se você não solicitou esta ação, ignore esta mensagem.\nSuporte: suporte@hrtsolutions.com.br`;
    const html = `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${action} no Prisma</title></head><body style="font:16px Arial,sans-serif;color:#172b4d;background:#f4f6fa;padding:24px"><main style="max-width:560px;margin:auto;background:white;padding:24px"><h1 style="font-size:24px">${action} no Prisma</h1><p>Usuário: <strong>${escape(claim.username)}</strong></p><p><a href="${escape(link.href)}" style="display:inline-block;background:#155eef;color:white;padding:14px 20px;border-radius:6px">${action}</a></p><p>Este link tem prazo limitado e é de uso único. Ele altera somente o acesso do usuário indicado.</p><p>Se você não solicitou esta ação, ignore esta mensagem.</p><p>Suporte: <a href="mailto:suporte@hrtsolutions.com.br">suporte@hrtsolutions.com.br</a></p></main></body></html>`;
    state = "unknown"; // A timeout can coexist with acceptance; never auto-retry with a new key.
    const response = await fetch("https://api.resend.com/emails", { method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `operator-access/${claim.requestId}` },
      body: JSON.stringify({ from: "Prisma <suporte@hrtsolutions.com.br>", to: [claim.email], subject: `${action} no Prisma: ${claim.username}`, html, text }) });
    if (!response.ok) { state = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409 ? "failed" : "unknown"; throw new Error("Provider unavailable"); }
    const receipt = await response.json();
    if (typeof receipt.id !== "string" || !receipt.id || receipt.id.length > 200) throw new Error("Invalid receipt");
    const { error: receiptError } = await client.rpc("finish_operator_access_email", { p_request: claim.requestId, p_state: "accepted", p_provider: receipt.id });
    if (receiptError) throw new Error("Receipt unavailable");
  } catch {
    // Persist metadata only; an unknown outcome never means delivery was not accepted.
    await client.rpc("finish_operator_access_email", { p_request: claim.requestId, p_state: state, p_provider: null });
    throw new AccessEmailError(502, "Não foi possível confirmar o envio do link de acesso. Aguarde e tente novamente.");
  }
}
