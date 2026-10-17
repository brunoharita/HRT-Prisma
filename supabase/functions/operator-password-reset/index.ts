import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { sendOperatorAccessEmail } from "../platform-users/operatorIdentity.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { identifier } = await request.json();
    const normalized = String(identifier ?? "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) return neutralSuccess();

    const serviceClient = createServiceClient();
    const identifierQuery = serviceClient
        .from("platform_users")
        .select("auth_user_id, status")
        .eq("username", normalized)
        .limit(1);
    const { data: users } = await identifierQuery;
    const target = users?.[0];
    if (!target || target.status === "inactive" || target.status === "blocked") return neutralSuccess();

    await sendOperatorAccessEmail(serviceClient, target.auth_user_id,
      target.status === "pending_first_access" ? "activation" : "recovery");
    return neutralSuccess();
  } catch {
    return neutralSuccess();
  }
});

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    readSecretKey(),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
}

function readSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Secret key ausente.");
  return legacy;
}

function neutralSuccess() {
  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: corsHeaders },
  );
}
