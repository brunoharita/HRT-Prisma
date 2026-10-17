import { technicalAuthEmail } from "./operatorIdentity.ts";
const handlers: Record<string, (r: Request) => Promise<Response>> = {};
const serve = Deno.serve;
for (const name of ["platform-users", "operator-sign-in", "operator-password-reset"]) {
  Deno.serve = ((handler: (r: Request) => Promise<Response>) => { handlers[name] = handler; return {}; }) as typeof Deno.serve;
  await import(`../${name}/index.ts`);
}
Deno.serve = serve;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const check = (pass: unknown, name: string) => { if (!pass) throw Error(name); };
const password = () => String.fromCharCode(65 + crypto.getRandomValues(new Uint8Array(1))[0] % 26) + crypto.randomUUID().replaceAll("-", "") + String.fromCharCode(33);

Deno.test("operator identity: independent accounts, legacy compatibility, contact edits, delivery and failure boundaries", async () => {
  const originalFetch = globalThis.fetch;
  Deno.env.set("SUPABASE_URL", "https://synthetic.invalid");
  Deno.env.set("SUPABASE_ANON_KEY", "synthetic-public");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-server");
  Deno.env.delete("SUPABASE_SECRET_KEYS"); Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  const shared = "shared@example.invalid", secretA = password(), secretB = password();
  const auth = new Map<string, {id: string; email: string; password: string}>([
    [id(1), {id: id(1), email: "legacy-admin@example.invalid", password: password()}],
    [id(4), {id: id(4), email: "legacy@example.invalid", password: secretA}],
    [id(6), {id: id(6), email: technicalAuthEmail(id(6)), password: secretB}],
  ]);
  const row = (n: number, group: number, profile: string) => ({id: id(n + 20), auth_user_id: id(n), full_name: "Operador sintético", username: `synthetic.user.${n}`, email: shared,
    phone_country_iso2: "BR", phone_country_label: "Brasil", phone_country_code: "55", phone_national_number: "11999999999", access_profile: profile,
    group_id: profile === "super_admin" ? null : id(group), status: "active", must_change_password: false, credential_mode: "manual_password"});
  const rows: any[] = [row(1, 100, "super_admin"), row(4, 100, "member"), row(6, 200, "member")];
  const orgs = [{id: id(110), name: "Empresa A", group_id: id(100)}, {id: id(210), name: "Empresa B", group_id: id(200)}];
  let scenario = "normal", next = 10, sends: any[] = [], calls: any[] = [], ledger: any[] = [];
  const tokens = new Map<string, string>();
  globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = new URL(String(input)), method = init?.method ?? "GET", body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    calls.push({path: url.pathname, query: url.searchParams, method, body});
    if (url.pathname === "/rest/v1/rpc/operator_administration_available_v307") return Response.json(true);
    if (url.pathname === "/auth/v1/user" && method === "GET") {
      const bearer = new Headers(init?.headers).get("Authorization") ?? "";
      return Response.json({id: bearer.includes("self-a") ? id(4) : id(1), aud: "authenticated", role: "authenticated"});
    }
    if (url.pathname === "/rest/v1/platform_users") {
      const keys = ["id", "auth_user_id", "username"];
      let found = rows.filter(r => keys.every(key => {const q = url.searchParams.get(key); return !q || (q.startsWith("eq.") ? r[key] === q.slice(3) : q.startsWith("neq.") ? r[key] !== q.slice(4) : true);}));
      if (method === "PATCH") { found.forEach(r => Object.assign(r, body)); return Response.json(null); }
      return Response.json(found);
    }
    if (url.pathname === "/rest/v1/organizations") return Response.json(orgs);
    if (url.pathname === "/rest/v1/organization_groups") return Response.json([{id: id(100), name: "Grupo A"}, {id: id(200), name: "Grupo B"}]);
    if (url.pathname === "/rest/v1/organization_memberships") return Response.json([{organization_id: id(110), user_id: id(4), role: "member"}, {organization_id: id(210), user_id: id(6), role: "member"}]);
    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      const created = {id: id(next++), email: body.email, password: body.password ?? password()}; auth.set(created.id, created); return Response.json({id: created.id, email: created.email});
    }
    if (url.pathname.startsWith("/auth/v1/admin/users/")) {
      const key = url.pathname.split("/").at(-1)!, user = auth.get(key);
      if (method === "DELETE") { auth.delete(key); return Response.json({}); }
      if (method === "PUT") { if (body.email) user!.email = body.email; return Response.json({id: key, email: user!.email}); }
      return Response.json({id: scenario === "wrong-identity" ? id(999) : key, email: user?.email});
    }
    if (url.pathname === "/auth/v1/token") {
      const user = [...auth.values()].find(u => u.email === body.email && u.password === body.password);
      return user ? Response.json({access_token: crypto.randomUUID(), refresh_token: crypto.randomUUID(), user: {id: scenario === "wrong-session" ? id(999) : user.id}}) : Response.json({}, {status: 400});
    }
    if (url.pathname === "/rest/v1/rpc/complete_first_access_v307") {
      const target = rows.find(r => r.auth_user_id === body.p_auth_user);
      if (!target || !["active", "pending_first_access"].includes(target.status)) return Response.json({code: "42501"}, {status: 403});
      Object.assign(target, {status: "active", must_change_password: false});return Response.json(null);
    }
    if (url.pathname === "/rest/v1/rpc/save_platform_user_v3") {
      if (scenario === "save-failure") return Response.json({code: "42501", message: "Permissão revogada"}, {status: 403});
      const existing = rows.find(r => r.auth_user_id === body.p_auth_user);
      const values = {username: body.p_data.username, email: body.p_data.email, status: body.p_data.status, must_change_password: body.p_data.mustChangePassword, access_profile: body.p_data.profile, group_id: body.p_data.groupId};
      if (existing) Object.assign(existing, values); else rows.push({...row(Number(body.p_auth_user.slice(-12)), 100, "member"), ...values});
      return Response.json(id(90));
    }
    if (url.pathname === "/rest/v1/platform_user_audit_events") return Response.json(null);
    if (url.pathname === "/rest/v1/rpc/operator_access_email_configuration") return Response.json(scenario === "no-config" ? null : "re_" + crypto.randomUUID());
    if (url.pathname === "/rest/v1/rpc/claim_operator_access_email") {
      if (scenario === "throttle") return Response.json(null);
      const target = rows.find(r => r.auth_user_id === body.p_auth_user);
      const claim = {requestId: crypto.randomUUID(), email: target.email, username: target.username};
      ledger.push({id: claim.requestId, state: "preparing", user: body.p_auth_user}); return Response.json(claim);
    }
    if (url.pathname === "/auth/v1/admin/generate_link") {
      const user = [...auth.values()].find(u => u.email === body.email)!;
      const token = crypto.randomUUID(); tokens.set(token, user.id);
      return Response.json({id: scenario === "wrong-link-user" ? id(999) : user.id, email: user.email,
        action_link: `${scenario === "wrong-link-host" ? "https://attacker.invalid" : "https://synthetic.invalid"}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent(body.redirectTo)}`,
        hashed_token: token, verification_type: "recovery", email_otp: crypto.randomUUID()});
    }
    if (url.hostname === "api.resend.com") {
      sends.push(body);
      if (scenario === "timeout") throw Error("untrusted transport detail must not escape");
      if (scenario === "provider-failure") return Response.json({}, {status: 422});
      return Response.json({id: crypto.randomUUID()});
    }
    if (url.pathname === "/rest/v1/rpc/finish_operator_access_email") {
      if (scenario === "receipt-failure" && body.p_state === "accepted") return Response.json({message: "receipt failed"}, {status: 500});
      const request = ledger.find(r => r.id === body.p_request); request.state = body.p_state; return Response.json(null);
    }
    throw Error("Unexpected synthetic request " + url.pathname);
  }) as typeof fetch;
  const invoke = (name: string, body: any, bearer = "synthetic") => handlers[name](new Request("https://synthetic.invalid/" + name, {method: "POST", headers: {"Content-Type": "application/json", Authorization: `Bearer ${bearer}`, Origin: "https://attacker.invalid"}, body: JSON.stringify(body)}));
  const sign = (username: string, value: string) => invoke("operator-sign-in", {username, password: value});
  const input = (username: string, mode = "manual_password") => ({fullName: "Usuário sintético", username, email: shared, status: "active", profile: "member", groupId: id(100), organizationIds: [id(110)], phoneCountryIso2: "BR", phoneNationalNumber: "11999999999", credentialMode: mode, password: secretA, passwordConfirmation: secretA});
  try {
    check((await sign(" SYNTHETIC.USER.4 ", secretA)).status === 200, "legacy username login preserved with shared contact");
    check((await sign("synthetic.user.6", secretB)).status === 200, "technical identity login independent");
    check((await sign("synthetic.user.4", secretB)).status === 401 && (await sign("synthetic.user.6", secretA)).status === 401, "passwords cannot cross accounts");
    check(calls.filter(c => c.path === "/auth/v1/token").every(c => c.body.email !== shared), "contact never used for authentication");
    for (scenario of ["wrong-identity", "wrong-session"]) check((await sign("synthetic.user.4", secretA)).status === 401, scenario + " denied");
    scenario = "normal";
    for (const status of ["inactive", "blocked", "pending_first_access"]) {rows[1].status = status; const count = calls.length; check((await sign("synthetic.user.4", secretA)).status === 401 && !calls.slice(count).some(c => c.path === "/auth/v1/token"), status + " denied before token");}
    rows[1].status = "active"; rows[1].must_change_password = true; check((await sign("synthetic.user.4", secretA)).status === 401, "mandatory change preserved"); rows[1].must_change_password = false;
    check((await invoke("platform-users", {action: "create", input: input("new.manual")})).status === 200, "same contact accepted in manual creation");
    const createdAuth = [...auth.values()].at(-1)!; check(createdAuth.email !== shared && createdAuth.email.endsWith("@users.prisma.invalid"), "new Auth address exclusive and separate");
    check((await invoke("platform-users", {action: "create", input: input("new.manual")})).status === 409, "duplicate username rejected");
    const before = sends.length;
    check((await invoke("platform-users", {action: "create", input: input("new.activation", "activation_link")})).status === 200 && sends.length === before + 1, "activation sent after committed creation");
    check(sends.at(-1).to[0] === shared && sends.at(-1).text.includes("new.activation"), "activation names exact account and real contact");
    check(!sends.at(-1).text.includes("attacker.invalid"), "request Origin never controls redirect");
    const lastAuth = [...auth.keys()].at(-1)!; check(rows.find(r => r.auth_user_id === lastAuth)?.status === "pending_first_access", "activation requires first access");
    let baseline = sends.length;
    for (const identifier of [shared, "unknown.user", "", "bad username"]) check((await invoke("operator-password-reset", {identifier})).status === 200, "neutral recovery response");
    check(sends.length === baseline, "email or unknown identifier never selects first account");
    for (const n of [4, 6]) {
      check((await invoke("operator-password-reset", {identifier: `synthetic.user.${n}`})).status === 200, "recovery by username");
      const message = sends.at(-1); check(message.to[0] === shared && message.text.includes(`synthetic.user.${n}`), "same inbox receives account-specific message");
      const token = [...tokens.keys()].at(-1)!; check(tokens.get(token) === id(n), "native generated link belongs only to selected Auth ID");
    }
    baseline = sends.length; scenario = "throttle";
    check((await invoke("operator-password-reset", {identifier: "synthetic.user.4"})).status === 200 && sends.length === baseline, "throttle is neutral and sends nothing");
    for (scenario of ["wrong-link-user", "wrong-link-host", "no-config"]) {
      baseline = sends.length; check((await invoke("operator-password-reset", {identifier: "synthetic.user.4"})).status === 200 && sends.length === baseline, scenario + " blocks send without enumeration");
    }
    for (scenario of ["timeout", "provider-failure", "receipt-failure"]) {
      const response = await invoke("platform-users", {action: "admin_reset_password", userId: rows[1].id});
      check(response.status === 502 && !(await response.text()).includes("untrusted"), scenario + " has safe failure");
      check(ledger.at(-1).state === (scenario === "provider-failure" ? "failed" : "unknown"), scenario + " recorded without inventing delivery");
    }
    scenario = "normal";
    const edited = {...input("synthetic.user.4"), email: "changed@example.invalid"};
    scenario = "save-failure";
    check((await invoke("platform-users", {action: "update", userId: rows[1].id, input: edited})).status === 403, "revoked save fails");
    check(auth.get(id(4))!.email === technicalAuthEmail(id(4)) && rows[1].email === shared && auth.get(id(4))!.password === secretA, "failed save preserves contact/password/ID and keeps idempotent technical conversion");
    check((await sign("synthetic.user.4", secretA)).status === 200, "failed contact save leaves legacy login functional");
    scenario = "normal";
    check((await invoke("platform-users", {action: "update", userId: rows[1].id, input: edited})).status === 200, "legacy contact editable independently");
    check(auth.get(id(4))!.email === technicalAuthEmail(id(4)) && rows[1].email === edited.email && auth.get(id(4))!.password === secretA, "legacy conversion preserves ID and password");
    check((await sign("synthetic.user.4", secretA)).status === 200 && (await sign("synthetic.user.6", secretB)).status === 200, "both logins survive contact edit");
    rows[1].must_change_password = true; rows[2].must_change_password = true;
    check((await invoke("platform-users", {action: "complete_first_access", userId: rows[2].id}, "self-a")).status === 200 && !rows[1].must_change_password && rows[2].must_change_password, "completion bound to session A ignores supplied B");
    for (const status of ["inactive", "blocked"]) {
      rows[1].status = status;rows[1].must_change_password = true;
      check((await invoke("platform-users", {action: "complete_first_access"}, "self-a")).status === 403 && rows[1].status === status && rows[1].must_change_password, "inactive/blocked first access cannot restore authority");
    }
    rows[1].status = "active";
    scenario = "save-failure"; const count = auth.size;
    check((await invoke("platform-users", {action: "create", input: input("new.denied")})).status === 403 && auth.size === count, "failed new user save compensates only new identity");
    scenario = "provider-failure"; const count2 = auth.size;
    check((await invoke("platform-users", {action: "create", input: input("new.mailfail", "activation_link")})).status === 502 && auth.size === count2 + 1 && rows.some(r => r.username === "new.mailfail"), "mail failure preserves committed account for explicit resend");
    check(!calls.some(c => c.query.has("email") || c.path === "/auth/v1/invite" || c.path === "/auth/v1/recover"), "no first-email lookup or native sending to technical address");
  } finally { globalThis.fetch = originalFetch; }
});
