import { useEffect, useState, type ReactNode } from "react";
import {
  ApartmentOutlined,
  BankOutlined,
  CheckCircleFilled,
  HomeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Badge, Button, Empty, Form, Input, Result, Space, Spin, Statistic, Tag, Typography } from "antd";
import { createClient, type JwtPayload } from "@supabase/supabase-js";
import {
  evaluateRouteAccess,
  normalizeMembershipRole,
  resolveActiveMembership,
  type OrganizationMembership,
  type RouteRule,
} from "../shared/access";
import darkBackgroundLogo from "../assets/brand/prisma-logo-dark-background.png";
import { PrismaAppShell, type PrismaNavigationItem } from "../ui/PrismaAppShell";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

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
  rule: RouteRule;
  icon?: ReactNode;
}

interface MembershipRow {
  organization_id: string;
  role: string;
  organizations?: { name?: string | null } | { name?: string | null }[] | null;
}

interface SignInValues {
  email: string;
  password: string;
}

const ACTIVE_ORGANIZATION_STORAGE_KEY = "prisma.activeOrganizationId";

const supabase = createClient(readEnv("VITE_SUPABASE_URL"), readEnv("VITE_SUPABASE_PUBLISHABLE_KEY"), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const routes: AppRoute[] = [
  {
    path: "/",
    label: "Início",
    icon: <HomeOutlined />,
    rule: { requiresAuth: true, requiresMembership: true },
  },
  {
    path: "/profiles",
    label: "Pessoas",
    icon: <TeamOutlined />,
    rule: { requiresAuth: true, requiresMembership: true },
  },
  {
    path: "/vacancies",
    label: "Vagas",
    icon: <ApartmentOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin", "recruiter"] },
  },
  {
    path: "/admin",
    label: "Administração",
    icon: <BankOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin"] },
  },
  { path: "/sign-in", rule: { requiresAuth: false, requiresMembership: false } },
  { path: "/access-denied", rule: { requiresAuth: true, requiresMembership: false } },
  { path: "/unauthorized", rule: { requiresAuth: true, requiresMembership: true } },
];

const initialState: AppState = {
  claims: null,
  memberships: [],
  activeOrganizationId: null,
  loading: true,
  initialized: false,
  signingIn: false,
  errorMessage: null,
  infoMessage: null,
};

export function PrismaApplication() {
  const [state, setState] = useState<AppState>(initialState);
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    let cancelled = false;

    async function refreshAuthState() {
      setState((current) => ({ ...current, loading: true, errorMessage: null }));
      const { data, error } = await supabase.auth.getClaims();
      if (cancelled) return;

      if (error) {
        setState((current) => ({
          ...current,
          claims: null,
          memberships: [],
          activeOrganizationId: null,
          errorMessage: "Não foi possível validar a sessão atual no Supabase Auth.",
          loading: false,
          initialized: true,
        }));
        return;
      }

      const claims = data?.claims ?? null;
      if (!claims || typeof claims.sub !== "string") {
        setState((current) => ({
          ...current,
          claims: null,
          memberships: [],
          activeOrganizationId: null,
          loading: false,
          initialized: true,
        }));
        clearStoredActiveOrganizationId();
        return;
      }

      try {
        const memberships = await loadMemberships(claims.sub);
        if (cancelled) return;
        const activeOrganizationId = resolvePreferredOrganizationId(
          memberships,
          readStoredActiveOrganizationId(),
        );
        if (activeOrganizationId) persistActiveOrganizationId(activeOrganizationId);

        setState((current) => ({
          ...current,
          claims,
          memberships,
          activeOrganizationId,
          loading: false,
          initialized: true,
          infoMessage: memberships.length === 0
            ? "Sessão válida, mas nenhuma membership ativa foi encontrada."
            : current.infoMessage,
        }));
      } catch (membershipError) {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          claims,
          memberships: [],
          activeOrganizationId: null,
          loading: false,
          initialized: true,
          errorMessage: membershipError instanceof Error
            ? membershipError.message
            : "Falha ao carregar memberships do usuário autenticado.",
        }));
      }
    }

    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshAuthState(), 0);
    });
    void refreshAuthState();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const route = findRoute(pathname);
  const activeMembership = resolveActiveMembership(state.memberships, state.activeOrganizationId);
  const access = evaluateRouteAccess(
    {
      isAuthenticated: Boolean(state.claims),
      memberships: state.memberships,
      activeOrganizationId: state.activeOrganizationId,
    },
    route.rule,
  );
  const redirectTo = route.path === "/sign-in" && state.claims
    ? "/"
    : !access.allowed && access.redirectTo && access.redirectTo !== route.path
      ? access.redirectTo
      : null;

  useEffect(() => {
    if (!redirectTo || !state.initialized) return;
    navigate(redirectTo, true);
    setPathname(redirectTo);
  }, [redirectTo, state.initialized]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setPathname(normalizePath(path));
  };

  const handleSignIn = async ({ email, password }: SignInValues) => {
    setState((current) => ({ ...current, signingIn: true, errorMessage: null, infoMessage: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((current) => ({ ...current, signingIn: false, errorMessage: error.message }));
      return;
    }
    setState((current) => ({ ...current, signingIn: false, infoMessage: "Sessão iniciada com sucesso." }));
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((current) => ({ ...current, errorMessage: error.message }));
      return;
    }
    clearStoredActiveOrganizationId();
    setState({ ...initialState, loading: false, initialized: true, infoMessage: "Sessão encerrada." });
    handleNavigate("/sign-in");
  };

  const handleOrganizationChange = (organizationId: string) => {
    persistActiveOrganizationId(organizationId);
    setState((current) => ({
      ...current,
      activeOrganizationId: organizationId,
      infoMessage: "Organização ativa atualizada.",
    }));
  };

  if (!state.initialized || redirectTo) return <LoadingScreen />;

  if (route.path === "/sign-in") {
    return (
      <SignInPage
        errorMessage={state.errorMessage}
        infoMessage={state.infoMessage}
        signingIn={state.signingIn}
        onDismissAlert={() => setState((current) => ({ ...current, errorMessage: null, infoMessage: null }))}
        onSignIn={handleSignIn}
      />
    );
  }

  const navigationItems = getNavigationItems(activeMembership);
  const email = typeof state.claims?.email === "string" ? state.claims.email : "Usuário autenticado";

  return (
    <PrismaAppShell
      activeMembership={activeMembership}
      email={email}
      memberships={state.memberships}
      navigationItems={navigationItems}
      onNavigate={handleNavigate}
      onOrganizationChange={handleOrganizationChange}
      onSignOut={() => void handleSignOut()}
      selectedPath={route.path}
    >
      {state.errorMessage || state.infoMessage ? (
        <Alert
          className="prisma-shell-alert"
          closable
          message={state.errorMessage ?? state.infoMessage}
          onClose={() => setState((current) => ({ ...current, errorMessage: null, infoMessage: null }))}
          showIcon
          type={state.errorMessage ? "error" : "success"}
        />
      ) : null}
      {renderRouteContent(route.path, activeMembership, navigationItems, handleNavigate)}
    </PrismaAppShell>
  );
}

function HomePage({ activeMembership, navigationItems, onNavigate }: {
  activeMembership: OrganizationMembership;
  navigationItems: PrismaNavigationItem[];
  onNavigate: (path: string) => void;
}) {
  return (
    <PrismaPage>
      <PrismaPageHeader
        title="Início"
        description="Contexto autenticado e acessos disponíveis para a organização selecionada."
        extras={<Badge status="success" text="Sessão validada" />}
      />
      <section className="prisma-dashboard-grid" aria-label="Resumo da sessão">
        <PrismaCard className="prisma-status-card">
          <Statistic prefix={<CheckCircleFilled />} title="Sessão" value="Validada" />
          <Typography.Text type="secondary">Identidade confirmada pelo Supabase Auth.</Typography.Text>
        </PrismaCard>
        <PrismaCard className="prisma-status-card">
          <Statistic prefix={<BankOutlined />} title="Organização ativa" value={activeMembership.organizationName} />
          <Typography.Text type="secondary">O tenant ativo orienta o contexto da interface.</Typography.Text>
        </PrismaCard>
        <PrismaCard className="prisma-status-card">
          <Statistic prefix={<SafetyCertificateOutlined />} title="Papel atual" value={describeRole(activeMembership.role)} />
          <Typography.Text type="secondary">A autorização material permanece protegida por RLS.</Typography.Text>
        </PrismaCard>
        <PrismaCard className="prisma-foundation-card" title="Acessos disponíveis">
          <div className="prisma-route-list">
            {navigationItems.map((item) => (
              <button key={item.path} className="prisma-route-link" type="button" onClick={() => onNavigate(item.path)}>
                <span className="prisma-route-icon">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{describeRoute(item.path)}</small>
                </span>
              </button>
            ))}
          </div>
        </PrismaCard>
        <PrismaCard className="prisma-contract-card" title="Contrato de segurança preservado">
          <Alert
            description="A sidebar apresenta somente rotas compatíveis com o papel conhecido, mas não é autoridade de autorização. Sessão, membership e papel continuam falhando de forma segura, e o banco permanece responsável pelas políticas RLS."
            message="Interface consumidora, nunca fonte de autoridade"
            showIcon
            type="info"
          />
        </PrismaCard>
      </section>
    </PrismaPage>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <PrismaPage>
      <PrismaPageHeader title={title} description={description} />
      <PrismaCard>
        <Empty
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text strong>Estrutura de navegação disponível</Typography.Text>
              <Typography.Text type="secondary">
                Os dados e fluxos deste módulo ainda não possuem adaptador Supabase de runtime aprovado.
              </Typography.Text>
            </Space>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </PrismaCard>
    </PrismaPage>
  );
}

function AccessResult({ unauthorized, activeMembership }: {
  unauthorized: boolean;
  activeMembership: OrganizationMembership | null;
}) {
  return (
    <PrismaPage>
      <PrismaCard>
        <Result
          status="403"
          title={unauthorized ? "Permissão insuficiente" : "Acesso bloqueado"}
          subTitle={unauthorized
            ? `O papel ${describeRole(activeMembership?.role ?? null)} não libera esta rota.`
            : "A sessão é válida, mas nenhuma membership ativa foi encontrada."}
          extra={unauthorized ? <Tag color="blue">Organização: {activeMembership?.organizationName}</Tag> : undefined}
        />
      </PrismaCard>
    </PrismaPage>
  );
}

function SignInPage({ errorMessage, infoMessage, signingIn, onDismissAlert, onSignIn }: {
  errorMessage: string | null;
  infoMessage: string | null;
  signingIn: boolean;
  onDismissAlert: () => void;
  onSignIn: (values: SignInValues) => Promise<void>;
}) {
  return (
    <main className="prisma-auth-shell">
      <section className="prisma-auth-brand-panel">
        <div className="prisma-auth-brand-frame"><img src={darkBackgroundLogo} alt="Prisma" /></div>
        <div className="prisma-auth-message">
          <Tag color="blue">Talent Intelligence</Tag>
          <h1>Decisões de talento com contexto, evidência e responsabilidade.</h1>
          <p>A inteligência apoia a análise. A decisão continua humana.</p>
        </div>
      </section>
      <section className="prisma-auth-form-panel">
        <div className="prisma-auth-form-wrap">
          <div className="prisma-auth-form-heading">
            <span className="prisma-auth-kicker">Acesso seguro</span>
            <h2>Entrar no Prisma</h2>
            <p>Use um usuário provisionado no Supabase Auth com membership ativa.</p>
          </div>
          {errorMessage || infoMessage ? (
            <Alert closable message={errorMessage ?? infoMessage} onClose={onDismissAlert} showIcon type={errorMessage ? "error" : "success"} />
          ) : null}
          <Form<SignInValues> layout="vertical" onFinish={(values) => void onSignIn(values)} requiredMark={false}>
            <Form.Item label="E-mail" name="email" rules={[{ required: true, type: "email", message: "Informe um e-mail válido." }]}>
              <Input autoComplete="email" prefix={<UserOutlined />} size="large" />
            </Form.Item>
            <Form.Item label="Senha" name="password" rules={[{ required: true, min: 6, message: "Informe sua senha." }]}>
              <Input.Password autoComplete="current-password" size="large" />
            </Form.Item>
            <Button block htmlType="submit" loading={signingIn} size="large" type="primary">Entrar</Button>
          </Form>
          <p className="prisma-auth-footnote">Sem sessão, organization ou papel reconhecido, o acesso permanece bloqueado.</p>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="prisma-loading-screen" role="status" aria-live="polite">
      <Spin size="large" />
      <span>Validando sessão e memberships...</span>
    </div>
  );
}

function renderRouteContent(
  path: string,
  activeMembership: OrganizationMembership | null,
  navigationItems: PrismaNavigationItem[],
  onNavigate: (path: string) => void,
) {
  if (path === "/" && activeMembership) {
    return <HomePage activeMembership={activeMembership} navigationItems={navigationItems} onNavigate={onNavigate} />;
  }
  if (path === "/profiles") return <PlaceholderPage title="Pessoas" description="Perfis profissionais acessíveis ao papel atual." />;
  if (path === "/vacancies") return <PlaceholderPage title="Vagas" description="Vagas e requisitos da organização ativa." />;
  if (path === "/admin") return <PlaceholderPage title="Administração" description="Configurações restritas a administradores da organização." />;
  if (path === "/access-denied") return <AccessResult activeMembership={activeMembership} unauthorized={false} />;
  return <AccessResult activeMembership={activeMembership} unauthorized />;
}

function getNavigationItems(activeMembership: OrganizationMembership | null): PrismaNavigationItem[] {
  if (!activeMembership) return [];
  return routes
    .filter((route): route is AppRoute & { label: string; icon: ReactNode } => Boolean(route.label && route.icon))
    .filter((route) => !route.rule.allowedRoles || route.rule.allowedRoles.includes(activeMembership.role))
    .map((route) => ({ path: route.path, label: route.label, icon: route.icon }));
}

function describeRoute(path: string) {
  if (path === "/") return "Resumo do contexto autenticado";
  if (path === "/profiles") return "Perfis profissionais";
  if (path === "/vacancies") return "Vagas e requisitos";
  return "Gestão da organização";
}

function describeRole(role: OrganizationMembership["role"] | null): string {
  if (role === "admin") return "Administrador";
  if (role === "recruiter") return "Recrutador";
  if (role === "hiring_manager") return "Gestor contratante";
  return "Sem papel ativo";
}

async function loadMemberships(userId: string): Promise<OrganizationMembership[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("A sessão foi validada, mas o app não conseguiu consultar organization_memberships.");
  return (data ?? [])
    .map((row) => toOrganizationMembership(row as MembershipRow))
    .filter((membership): membership is OrganizationMembership => membership !== null);
}

function toOrganizationMembership(row: MembershipRow): OrganizationMembership | null {
  const role = normalizeMembershipRole(row.role);
  if (!role) return null;
  const organizationNameSource = Array.isArray(row.organizations) ? row.organizations[0]?.name : row.organizations?.name;
  return {
    organizationId: row.organization_id,
    organizationName: typeof organizationNameSource === "string" && organizationNameSource.trim().length > 0
      ? organizationNameSource
      : row.organization_id,
    role,
  };
}

function findRoute(pathname: string): AppRoute {
  return routes.find((route) => route.path === normalizePath(pathname)) ?? routes[0]!;
}

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function navigate(path: string, replace = false): void {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
}

function resolvePreferredOrganizationId(
  memberships: readonly OrganizationMembership[],
  storedOrganizationId: string | null,
): string | null {
  if (storedOrganizationId && memberships.some((membership) => membership.organizationId === storedOrganizationId)) {
    return storedOrganizationId;
  }
  return memberships[0]?.organizationId ?? null;
}

function persistActiveOrganizationId(organizationId: string): void {
  window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
}

function readStoredActiveOrganizationId(): string | null {
  return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

function clearStoredActiveOrganizationId(): void {
  window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

function readEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}
