function assert(value: unknown, message: string) { if (!value) throw Error(message); }
let handler: (request: Request) => Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((h: typeof handler) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
Deno.test("four roles: real Edge handler validates scope before Auth and saves atomically with compensation", async () => {
  const originalFetch = globalThis.fetch;
  for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS", "SUPABASE_PUBLISHABLE_KEYS"]) Deno.env.delete(key);
  Deno.env.set("SUPABASE_URL", "https://synthetic.invalid");Deno.env.set("SUPABASE_ANON_KEY", "synthetic-public");Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-server");
  try {
    for (const scenario of ["common", "cross-group", "outside-company", "member", "recruiter", "legacy-admin", "rpc-failure"] as const) {
      const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
      globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input)), method = init?.method ?? "GET", body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        calls.push({ path: url.pathname, method, body });
        if (url.pathname === "/auth/v1/user") return Response.json({ id: id(3), email: "fixture@example.invalid", aud: "authenticated", role: "authenticated" });
        if (url.pathname === "/rest/v1/platform_users") {
          if (url.searchParams.has("auth_user_id")) return Response.json([{ id: id(30), auth_user_id: id(3), full_name: "Operador sintético", username: "synthetic.actor", email: "actor@example.invalid", access_profile: scenario === "common" ? "member" : "recruiter", group_id: id(100), status: "active" }]);
          return Response.json([]);
        }
        if (url.pathname === "/rest/v1/organization_memberships") return Response.json([{ organization_id: id(110), user_id: id(3), role: "recruiter" }]);
        if (url.pathname === "/rest/v1/organizations") return Response.json([{ id: id(110), name: "Empresa A", group_id: id(100) }, ...(url.searchParams.has("group_id") ? [{ id: id(111), name: "Empresa B", group_id: id(100) }] : [])]);
        if (url.pathname === "/auth/v1/invite") return Response.json({ id: id(9), email: "new@example.invalid" });
        if (url.pathname === "/rest/v1/rpc/save_platform_user_v3") return scenario === "rpc-failure" ? Response.json({ code: "42501", message: "Autoridade revogada durante a operação." }, { status: 403 }) : Response.json(id(90));
        if (url.pathname === `/auth/v1/admin/users/${id(9)}` && method === "DELETE") return Response.json({});
        throw Error(`Unexpected synthetic request: ${method} ${url.pathname}`);
      }) as typeof fetch;
      const profile = scenario === "recruiter" ? "recruiter" : scenario === "legacy-admin" ? "admin" : "member";
      const input = { fullName: "Novo usuário sintético", username: "new.synthetic", email: "new@example.invalid", status: "active", profile, groupId: id(scenario === "cross-group" ? 200 : 100), organizationIds: [id(scenario === "outside-company" ? 111 : 110)], phoneCountryIso2: "BR", phoneNationalNumber: "11999999999", credentialMode: "activation_link" };
      const response = await handler(new Request("https://synthetic.invalid/platform-users", { method: "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", input, actor: id(1) }) }));
      const positive = ["member", "recruiter", "legacy-admin"].includes(scenario);
      assert(response.status === (positive ? 200 : 403), `${scenario}: HTTP ${response.status} ${await response.text()}`);
      const authCalls = calls.filter(c => c.path === "/auth/v1/invite"), saved = calls.filter(c => c.path === "/rest/v1/rpc/save_platform_user_v3");
      if (positive || scenario === "rpc-failure") {
        assert(authCalls.length === 1 && saved.length === 1, scenario + ": one identity and one atomic persistence");
        assert(saved[0].body.p_actor === id(3), scenario + ": actor comes from verified session");
        const payload = saved[0].body.p_data as { profile: string; status: string };
        assert(payload.profile === (profile === "admin" ? "recruiter" : profile) && payload.status === "pending_first_access", scenario + ": canonical role and activation boundary");
      } else assert(authCalls.length === 0 && saved.length === 0, scenario + ": denied before identity creation");
      assert(calls.filter(c => c.method === "DELETE").length === (scenario === "rpc-failure" ? 1 : 0), scenario + ": compensate only this request's failed identity");
    }
  } finally { globalThis.fetch = originalFetch; }
});
