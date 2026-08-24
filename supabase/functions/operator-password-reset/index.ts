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
    const { identifier } = await request.json();
    const normalized = String(identifier ?? "").trim();
    if (!normalized) return neutralSuccess();

    const serviceClient = createServiceClient();
    const identifierQuery = normalized.includes("@")
      ? serviceClient
        .from("platform_users")
        .select("email, status")
        .ilike("email", normalized)
        .limit(1)
      : serviceClient
        .from("platform_users")
        .select("email, status")
        .eq("username", normalized.toLowerCase())
        .limit(1);
    const { data: users } = await identifierQuery;
    const target = users?.[0];
    if (!target || target.status === "inactive" || target.status === "blocked") return neutralSuccess();

    const publishableClient = createPublishableClient();
    await publishableClient.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${request.headers.get("origin") ?? new URL(request.url).origin}/change-password`,
    });
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

function createPublishableClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    readPublishableKey(),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
}

function readPublishableKey() {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (!legacy) throw new Error("Publishable key ausente.");
  return legacy;
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
