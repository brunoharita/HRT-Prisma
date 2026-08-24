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
    const { username, password } = await request.json();
    const normalizedUsername = String(username ?? "").trim().toLowerCase();
    const providedPassword = String(password ?? "");
    if (!normalizedUsername || !providedPassword) {
      return neutralFailure();
    }

    const serviceClient = createServiceClient();
    const { data: users, error } = await serviceClient
      .from("platform_users")
      .select("id, auth_user_id, email, status, must_change_password")
      .eq("username", normalizedUsername)
      .limit(1);
    if (error) return neutralFailure();
    const target = users?.[0];
    if (!target || target.status !== "active" || target.must_change_password) {
      return neutralFailure();
    }

    const authResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: readPublishableKey(),
      },
      body: JSON.stringify({
        email: target.email,
        password: providedPassword,
      }),
    });
    if (!authResponse.ok) return neutralFailure();

    const session = await authResponse.json() as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!session.access_token || !session.refresh_token) return neutralFailure();

    await serviceClient
      .from("platform_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", target.id);

    return new Response(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch {
    return neutralFailure();
  }
});

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    readSecretKey(),
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

function neutralFailure() {
  return new Response(
    JSON.stringify({ error: "Username ou senha inválidos." }),
    { status: 401, headers: corsHeaders },
  );
}
