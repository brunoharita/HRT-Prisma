import { createClient, type JwtPayload } from "@supabase/supabase-js";
import "./styles.css";
import {
  evaluateRouteAccess,
  normalizeMembershipRole,
  resolveActiveMembership,
  type MembershipRole,
  type OrganizationMembership,
  type RouteRule,
} from "./shared/access.js";

interface AppState {
  claims: JwtPayload | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  loading: boolean;
  initialized: boolean;
  signingIn: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
}

interface AppRoute {
  path: string;
  label?: string;
  description?: string;
  rule: RouteRule;
  render: (activeMembership: OrganizationMembership | null) => string;
}

interface MembershipRow {
  organization_id: string;
  role: string;
  organizations?: { name?: string | null } | { name?: string | null }[] | null;
}

const ACTIVE_ORGANIZATION_STORAGE_KEY = "prisma.activeOrganizationId";
const appElement = getAppElement();

const supabase = createClient(readEnv("VITE_SUPABASE_URL"), readEnv("VITE_SUPABASE_PUBLISHABLE_KEY"), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const state: AppState = {
  claims: null,
  memberships: [],
  activeOrganizationId: null,
  loading: true,
  initialized: false,
  signingIn: false,
  errorMessage: null,
  infoMessage: null,
};

const routes: AppRoute[] = [
  {
    path: "/",
    label: "Visao geral",
    description: "Resumo da sessao, tenant ativo e capacidades liberadas pelo papel atual.",
    rule: { requiresAuth: true, requiresMembership: true },
    render: (activeMembership) => {
      const roleLabel = describeRole(activeMembership?.role ?? null);
      return `
        <section class="hero">
          <div>
            <p class="eyebrow">Supabase Auth</p>
            <h1>Prisma conectado com sessao validada e tenant ativo.</h1>
            <p class="lede">
              Esta superficie web consome o contrato de autorizacao existente. A sessao e validada com
              <code>getClaims()</code> e as rotas dependem da membership ativa em
              <code>organization_memberships</code>.
            </p>
          </div>
          <div class="panel inset">
            <p class="panel-label">Contexto ativo</p>
            <p class="panel-title">${escapeHtml(activeMembership?.organizationName ?? "Sem organization ativa")}</p>
            <p class="panel-meta">Papel atual: ${escapeHtml(roleLabel)}</p>
          </div>
        </section>
        <section class="cards">
          <article class="card">
            <p class="card-label">Rota protegida</p>
            <h2>Falha segura</h2>
            <p>Sem sessao a navegacao vai para <code>/sign-in</code>. Sem membership valida a navegacao vai para <code>/access-denied</code>.</p>
          </article>
          <article class="card">
            <p class="card-label">Tenant</p>
            <h2>Organization obrigatoria</h2>
            <p>A organization ativa define o contexto da UI, mas a protecao real continua no banco via RLS.</p>
          </article>
          <article class="card">
            <p class="card-label">Papel</p>
            <h2>Autorizacao por role</h2>
            <p>Rotas administrativas e operacionais exigem <code>admin</code>, <code>recruiter</code> ou <code>hiring_manager</code> conforme o contrato do projeto.</p>
          </article>
        </section>
      `;
    },
  },
  {
    path: "/profiles",
    label: "Perfis",
    description: "Disponivel para admin, recruiter e hiring manager.",
    rule: { requiresAuth: true, requiresMembership: true },
    render: (activeMembership) => `
      <section class="page-copy">
        <p class="eyebrow">Area protegida</p>
        <h1>Perfis profissionais</h1>
        <p>
          A rota esta liberada para o papel <strong>${escapeHtml(describeRole(activeMembership?.role ?? null))}</strong>.
          O adaptador Supabase de runtime ainda nao foi implementado para listar dados reais; esta pagina valida apenas
          a base de sessao, tenant e autorizacao.
        </p>
      </section>
    `,
  },
  {
    path: "/vacancies",
    label: "Vagas",
    description: "Disponivel para admin e recruiter.",
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin", "recruiter"] },
    render: (activeMembership) => `
      <section class="page-copy">
        <p class="eyebrow">Role guard</p>
        <h1>Vagas e requisitos</h1>
        <p>
          Esta rota exige <code>admin</code> ou <code>recruiter</code>. O papel ativo atual e
          <strong>${escapeHtml(describeRole(activeMembership?.role ?? null))}</strong>.
        </p>
        <p>
          A pagina existe para demonstrar o bloqueio por papel antes da integracao com os fluxos completos de vagas.
        </p>
      </section>
    `,
  },
  {
    path: "/admin",
    label: "Administracao",
    description: "Disponivel apenas para admin.",
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin"] },
    render: (activeMembership) => `
      <section class="page-copy">
        <p class="eyebrow">Admin only</p>
        <h1>Administracao da organizacao</h1>
        <p>
          Esta rota esta liberada apenas para <code>admin</code>. O papel ativo atual e
          <strong>${escapeHtml(describeRole(activeMembership?.role ?? null))}</strong>.
        </p>
        <p>
          Ao integrar cadastro de memberships, esta pagina deve permanecer cliente apenas do contrato do backend e nunca
          fonte de autorizacao.
        </p>
      </section>
    `,
  },
  {
    path: "/sign-in",
    rule: { requiresAuth: false, requiresMembership: false },
    render: () => `
      <section class="auth-shell">
        <div class="auth-copy">
          <p class="eyebrow">Prisma</p>
          <h1>Entrar</h1>
          <p>
            Use um usuario ja provisionado no Supabase Auth. O acesso ao app depende de sessao valida e membership ativa
            em <code>organization_memberships</code>.
          </p>
        </div>
        <form class="panel auth-form" data-form="sign-in">
          <label>
            <span>E-mail</span>
            <input type="email" name="email" autocomplete="email" required />
          </label>
          <label>
            <span>Senha</span>
            <input type="password" name="password" autocomplete="current-password" required minlength="6" />
          </label>
          <button type="submit" class="primary-button" ${state.signingIn ? "disabled" : ""}>
            ${state.signingIn ? "Entrando..." : "Entrar"}
          </button>
          <p class="help-text">Sem membership valida, a sessao entra mas a UI continua bloqueada.</p>
        </form>
      </section>
    `,
  },
  {
    path: "/access-denied",
    rule: { requiresAuth: true, requiresMembership: false },
    render: () => `
      <section class="page-copy">
        <p class="eyebrow">Acesso bloqueado</p>
        <h1>Usuario autenticado sem membership ativa.</h1>
        <p>
          O Prisma falha de forma segura quando o usuario nao possui organization ou papel conhecido.
          Cadastre a membership em <code>organization_memberships</code> antes de tentar usar o app.
        </p>
      </section>
    `,
  },
  {
    path: "/unauthorized",
    rule: { requiresAuth: true, requiresMembership: true },
    render: (activeMembership) => `
      <section class="page-copy">
        <p class="eyebrow">Permissao insuficiente</p>
        <h1>O papel atual nao libera esta rota.</h1>
        <p>
          Organization ativa: <strong>${escapeHtml(activeMembership?.organizationName ?? "Nao identificada")}</strong>.
          Papel atual: <strong>${escapeHtml(describeRole(activeMembership?.role ?? null))}</strong>.
        </p>
      </section>
    `,
  },
];

document.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest<HTMLAnchorElement>("[data-link]");
  if (link) {
    const href = link.getAttribute("href");
    if (href) {
      event.preventDefault();
      navigate(href);
    }
    return;
  }

  const signOutButton = target.closest<HTMLButtonElement>("[data-action='sign-out']");
  if (signOutButton) {
    event.preventDefault();
    await handleSignOut();
  }
});

document.addEventListener("submit", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) return;
  if (target.dataset.form !== "sign-in") return;

  event.preventDefault();
  await handleSignIn(target);
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.dataset.field !== "organization") return;

  state.activeOrganizationId = target.value;
  persistActiveOrganizationId(target.value);
  state.infoMessage = "Organization ativa atualizada.";
  renderApplication();
});

window.addEventListener("popstate", () => {
  renderApplication();
});

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(() => {
  void refreshAuthState();
});

window.addEventListener("beforeunload", () => {
  subscription.unsubscribe();
});

void refreshAuthState();

async function refreshAuthState(): Promise<void> {
  state.loading = true;
  state.errorMessage = null;
  renderApplication();

  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    state.claims = null;
    state.memberships = [];
    state.activeOrganizationId = null;
    state.errorMessage = "Nao foi possivel validar a sessao atual no Supabase Auth.";
    state.loading = false;
    state.initialized = true;
    renderApplication();
    return;
  }

  const claims = data?.claims ?? null;
  state.claims = claims;

  if (!claims || typeof claims.sub !== "string") {
    clearAuthenticatedState();
    renderApplication();
    return;
  }

  try {
    const memberships = await loadMemberships(claims.sub);
    state.memberships = memberships;
    state.activeOrganizationId = resolvePreferredOrganizationId(memberships, readStoredActiveOrganizationId());
    if (state.activeOrganizationId) {
      persistActiveOrganizationId(state.activeOrganizationId);
    }
    if (memberships.length === 0) {
      state.infoMessage = "Sessao valida, mas nenhuma membership ativa foi encontrada.";
    }
  } catch (membershipError) {
    state.memberships = [];
    state.activeOrganizationId = null;
    state.errorMessage = membershipError instanceof Error
      ? membershipError.message
      : "Falha ao carregar memberships do usuario autenticado.";
  }

  state.loading = false;
  state.initialized = true;
  renderApplication();
}

async function loadMemberships(userId: string): Promise<OrganizationMembership[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("A sessao foi validada, mas o app nao conseguiu consultar organization_memberships.");
  }

  return (data ?? [])
    .map((row) => toOrganizationMembership(row as MembershipRow))
    .filter((membership): membership is OrganizationMembership => membership !== null);
}

function toOrganizationMembership(row: MembershipRow): OrganizationMembership | null {
  const role = normalizeMembershipRole(row.role);
  if (!role) return null;

  const organizationNameSource = Array.isArray(row.organizations)
    ? row.organizations[0]?.name
    : row.organizations?.name;

  return {
    organizationId: row.organization_id,
    organizationName: typeof organizationNameSource === "string" && organizationNameSource.trim().length > 0
      ? organizationNameSource
      : row.organization_id,
    role,
  };
}

async function handleSignIn(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");

  state.signingIn = true;
  state.errorMessage = null;
  state.infoMessage = null;
  renderApplication();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(email ?? ""),
    password: String(password ?? ""),
  });

  state.signingIn = false;

  if (error) {
    state.errorMessage = error.message;
    renderApplication();
    return;
  }

  state.infoMessage = "Sessao iniciada com sucesso.";
  await refreshAuthState();
}

async function handleSignOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    state.errorMessage = error.message;
    renderApplication();
    return;
  }

  clearAuthenticatedState();
  state.infoMessage = "Sessao encerrada.";
  navigate("/sign-in", { replace: true });
}

function clearAuthenticatedState(): void {
  state.claims = null;
  state.memberships = [];
  state.activeOrganizationId = null;
  state.loading = false;
  state.initialized = true;
  clearStoredActiveOrganizationId();
}

function renderApplication(): void {
  const route = findRoute(window.location.pathname);

  if (route.path === "/sign-in" && state.claims) {
    navigate("/", { replace: true });
    return;
  }

  const snapshot = {
    isAuthenticated: Boolean(state.claims),
    memberships: state.memberships,
    activeOrganizationId: state.activeOrganizationId,
  };

  const access = evaluateRouteAccess(snapshot, route.rule);
  if (!access.allowed && access.redirectTo && access.redirectTo !== route.path) {
    navigate(access.redirectTo, { replace: true });
    return;
  }

  const activeMembership = resolveActiveMembership(state.memberships, state.activeOrganizationId);
  const navigation = renderNavigation(snapshot);
  const alert = renderAlert();
  const content = state.loading && !state.initialized
    ? `<section class="loading-shell"><p>Validando sessao e memberships...</p></section>`
    : route.render(activeMembership);

  appElement.innerHTML = `
    <div class="shell">
      ${renderHeader(activeMembership, navigation)}
      ${alert}
      <main class="content">${content}</main>
    </div>
  `;
}

function renderHeader(activeMembership: OrganizationMembership | null, navigation: string): string {
  const hasMemberships = state.memberships.length > 0;
  const email = typeof state.claims?.email === "string" ? state.claims.email : "Sessao sem e-mail";

  return `
    <header class="topbar">
      <div class="brand-block">
        <a class="brand" href="/" data-link>Prisma</a>
        <p class="brand-subtitle">Talent Intelligence com Auth e rotas protegidas</p>
      </div>
      <div class="topbar-actions">
        ${hasMemberships ? renderOrganizationSelector() : ""}
        ${state.claims ? `
          <div class="session-badge">
            <strong>${escapeHtml(email)}</strong>
            <span>${escapeHtml(describeRole(activeMembership?.role ?? null))}</span>
          </div>
          <button class="secondary-button" type="button" data-action="sign-out">Sair</button>
        ` : ""}
      </div>
      ${navigation}
    </header>
  `;
}

function renderOrganizationSelector(): string {
  const options = state.memberships.map((membership) => `
    <option value="${escapeAttribute(membership.organizationId)}" ${membership.organizationId === state.activeOrganizationId ? "selected" : ""}>
      ${escapeHtml(membership.organizationName)} · ${escapeHtml(describeRole(membership.role))}
    </option>
  `).join("");

  return `
    <label class="organization-selector">
      <span>Organization</span>
      <select data-field="organization">${options}</select>
    </label>
  `;
}

function renderNavigation(snapshot: { isAuthenticated: boolean; memberships: OrganizationMembership[]; activeOrganizationId: string | null }): string {
  const items = routes
    .filter((route) => route.label)
    .filter((route) => evaluateRouteAccess(snapshot, route.rule).allowed)
    .map((route) => {
      const activeClass = route.path === window.location.pathname ? "nav-link active" : "nav-link";
      return `<a class="${activeClass}" href="${route.path}" data-link>${route.label}</a>`;
    })
    .join("");

  if (!items) return "";
  return `<nav class="navigation">${items}</nav>`;
}

function renderAlert(): string {
  if (state.errorMessage) {
    return `<section class="alert error">${escapeHtml(state.errorMessage)}</section>`;
  }
  if (state.infoMessage) {
    return `<section class="alert info">${escapeHtml(state.infoMessage)}</section>`;
  }
  return "";
}

function findRoute(pathname: string): AppRoute {
  return routes.find((route) => route.path === pathname) ?? routes[0]!;
}

function navigate(path: string, options?: { replace?: boolean }): void {
  const currentPath = window.location.pathname;
  if (path !== currentPath) {
    if (options?.replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
  }
  renderApplication();
}

function readEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new Error(`Variavel obrigatoria ausente: ${name}. Configure-a em .env local antes de iniciar o app.`);
}

function resolvePreferredOrganizationId(
  memberships: readonly OrganizationMembership[],
  preferredOrganizationId: string | null,
): string | null {
  if (preferredOrganizationId && memberships.some((membership) => membership.organizationId === preferredOrganizationId)) {
    return preferredOrganizationId;
  }

  return memberships[0]?.organizationId ?? null;
}

function readStoredActiveOrganizationId(): string | null {
  return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

function persistActiveOrganizationId(organizationId: string): void {
  window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
}

function clearStoredActiveOrganizationId(): void {
  window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

function getAppElement(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) {
    throw new Error("Elemento #app nao encontrado.");
  }

  return element;
}

function describeRole(role: MembershipRole | null): string {
  switch (role) {
    case "admin":
      return "admin";
    case "recruiter":
      return "recruiter";
    case "hiring_manager":
      return "hiring_manager";
    default:
      return "papel nao identificado";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
