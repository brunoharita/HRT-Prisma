import { useEffect, useState, type ReactNode } from "react";
import { ApartmentOutlined, BankOutlined, HomeOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Result, Tag } from "antd";
import type { JwtPayload } from "@supabase/supabase-js";
import darkBackgroundLogo from "../assets/brand/prisma-logo-dark-background.png";
import { supabase } from "../infrastructure/supabase/client";
import { prismaRepository } from "../infrastructure/supabase/prismaRepository";
import { HomePage } from "../pages/HomePage";
import { PeoplePage } from "../pages/PeoplePage";
import { PersonProfilePage } from "../pages/PersonProfilePage";
import {
  canActivateOrganization,
  evaluateRouteAccess,
  resolvePreferredOrganizationId,
  resolveActiveMembership,
  type OrganizationMembership,
  type RouteRule,
} from "../shared/access";
import { PrismaAppShell, type PrismaNavigationItem } from "../ui/PrismaAppShell";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface AppState {
  claims: JwtPayload | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
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
  profileId?: string;
}

interface SignInValues {
  email: string;
  password: string;
}

const ACTIVE_ORGANIZATION_STORAGE_KEY = "prisma.activeOrganizationId";

const routes: AppRoute[] = [
  { path: "/", label: "Início", icon: <HomeOutlined />, rule: { requiresAuth: true, requiresMembership: true } },
  { path: "/profiles", label: "Pessoas", icon: <TeamOutlined />, rule: { requiresAuth: true, requiresMembership: true } },
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
  initialized: false,
  signingIn: false,
  errorMessage: null,
  infoMessage: null,
};

export function PrismaApplication() {
  const [state, setState] = useState<AppState>(initialState);
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    let current = true;
    async function refreshAuthState() {
      const { data, error } = await supabase.auth.getClaims();
      if (!current) return;
      if (error) {
        clearStoredActiveOrganizationId();
        setState({ ...initialState, initialized: true, errorMessage: "Não foi possível validar a sessão atual no Supabase Auth." });
        return;
      }

      const claims = data?.claims ?? null;
      if (!claims || typeof claims.sub !== "string") {
        clearStoredActiveOrganizationId();
        setState({ ...initialState, initialized: true });
        return;
      }

      try {
        const memberships = await prismaRepository.loadMemberships(claims.sub);
        if (!current) return;
        const activeOrganizationId = resolvePreferredOrganizationId(memberships, readStoredActiveOrganizationId());
        if (activeOrganizationId) persistActiveOrganizationId(activeOrganizationId);
        else clearStoredActiveOrganizationId();
        setState((previous) => ({
          ...previous,
          claims,
          memberships,
          activeOrganizationId,
          initialized: true,
          errorMessage: null,
          infoMessage: memberships.length === 0 ? "Sessão válida, mas nenhuma membership ativa foi encontrada." : null,
        }));
      } catch {
        if (!current) return;
        clearStoredActiveOrganizationId();
        setState((previous) => ({
          ...previous,
          claims,
          memberships: [],
          activeOrganizationId: null,
          initialized: true,
          errorMessage: "A sessão foi validada, mas as memberships não puderam ser confirmadas.",
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
      current = false;
      subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const route = findRoute(pathname);
  const activeMembership = resolveActiveMembership(state.memberships, state.activeOrganizationId);
  const access = evaluateRouteAccess({
    isAuthenticated: Boolean(state.claims),
    memberships: state.memberships,
    activeOrganizationId: state.activeOrganizationId,
  }, route.rule);
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
    const normalized = normalizePath(path);
    navigate(normalized);
    setPathname(normalized);
  };

  const handleSignIn = async ({ email, password }: SignInValues) => {
    setState((current) => ({ ...current, signingIn: true, errorMessage: null, infoMessage: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((current) => ({ ...current, signingIn: false, errorMessage: "E-mail, senha ou sessão inválidos." }));
      return;
    }
    setState((current) => ({ ...current, signingIn: false, infoMessage: "Sessão iniciada com sucesso." }));
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((current) => ({ ...current, errorMessage: "Não foi possível encerrar a sessão com segurança." }));
      return;
    }
    clearStoredActiveOrganizationId();
    setState({ ...initialState, initialized: true, infoMessage: "Sessão encerrada." });
    handleNavigate("/sign-in");
  };

  const handleOrganizationChange = (organizationId: string) => {
    if (!canActivateOrganization(state.memberships, organizationId)) {
      clearStoredActiveOrganizationId();
      setState((current) => ({ ...current, activeOrganizationId: null, errorMessage: "Organização não autorizada." }));
      return;
    }
    persistActiveOrganizationId(organizationId);
    setState((current) => ({ ...current, activeOrganizationId: organizationId, infoMessage: "Organização ativa atualizada." }));
    if (pathname.startsWith("/profiles/")) handleNavigate("/profiles");
  };

  if (!state.initialized || redirectTo) return <LoadingScreen />;
  if (route.path === "/sign-in") {
    return <SignInPage
      errorMessage={state.errorMessage}
      infoMessage={state.infoMessage}
      signingIn={state.signingIn}
      onDismissAlert={() => setState((current) => ({ ...current, errorMessage: null, infoMessage: null }))}
      onSignIn={handleSignIn}
    />;
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
      selectedPath={route.profileId ? "/profiles" : route.path}
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
      <div key={activeMembership?.organizationId ?? "no-organization"}>
        {renderRouteContent(route, activeMembership, navigationItems, handleNavigate)}
      </div>
    </PrismaAppShell>
  );
}

function renderRouteContent(
  route: AppRoute,
  activeMembership: OrganizationMembership | null,
  navigationItems: PrismaNavigationItem[],
  onNavigate: (path: string) => void,
) {
  if (route.path === "/" && activeMembership) return <HomePage activeMembership={activeMembership} navigationItems={navigationItems} repository={prismaRepository} onNavigate={onNavigate} />;
  if (route.path === "/profiles" && route.profileId && activeMembership) return <PersonProfilePage activeMembership={activeMembership} personId={route.profileId} repository={prismaRepository} onNavigate={onNavigate} />;
  if (route.path === "/profiles" && activeMembership) return <PeoplePage activeMembership={activeMembership} repository={prismaRepository} onNavigate={onNavigate} />;
  if (route.path === "/vacancies") return <PlaceholderPage title="Vagas" description="Vagas e requisitos da organização ativa." />;
  if (route.path === "/admin") return <PlaceholderPage title="Administração" description="Configurações restritas a administradores da organização." />;
  if (route.path === "/access-denied") return <AccessResult activeMembership={activeMembership} unauthorized={false} />;
  return <AccessResult activeMembership={activeMembership} unauthorized />;
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <PrismaPage><PrismaPageHeader title={title} description={description} /><PrismaCard><Result status="info" title="Módulo fora deste movimento" subTitle="O App Shell e a autorização da rota estão preservados." /></PrismaCard></PrismaPage>;
}

function AccessResult({ unauthorized, activeMembership }: { unauthorized: boolean; activeMembership: OrganizationMembership | null }) {
  return <PrismaPage><PrismaCard><Result status="403" title={unauthorized ? "Permissão insuficiente" : "Acesso bloqueado"} subTitle={unauthorized ? `O papel ${describeRole(activeMembership?.role ?? null)} não libera esta rota.` : "A sessão é válida, mas nenhuma membership ativa foi encontrada."} extra={unauthorized ? <Tag color="blue">Organização: {activeMembership?.organizationName}</Tag> : undefined} /></PrismaCard></PrismaPage>;
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
        <div className="prisma-auth-message"><Tag color="blue">Talent Intelligence</Tag><h1>Decisões de talento com contexto, evidência e responsabilidade.</h1><p>A inteligência apoia a análise. A decisão continua humana.</p></div>
      </section>
      <section className="prisma-auth-form-panel">
        <div className="prisma-auth-form-wrap">
          <div className="prisma-auth-form-heading"><span className="prisma-auth-kicker">Acesso seguro</span><h2>Entrar no Prisma</h2><p>Use um usuário provisionado no Supabase Auth com membership ativa.</p></div>
          {errorMessage || infoMessage ? <Alert closable message={errorMessage ?? infoMessage} onClose={onDismissAlert} showIcon type={errorMessage ? "error" : "success"} /> : null}
          <Form<SignInValues> layout="vertical" onFinish={(values) => void onSignIn(values)} requiredMark={false}>
            <Form.Item label="E-mail" name="email" rules={[{ required: true, type: "email", message: "Informe um e-mail válido." }]}><Input autoComplete="email" prefix={<UserOutlined />} size="large" /></Form.Item>
            <Form.Item label="Senha" name="password" rules={[{ required: true, min: 6, message: "Informe sua senha." }]}><Input.Password autoComplete="current-password" size="large" /></Form.Item>
            <Button block htmlType="submit" loading={signingIn} size="large" type="primary">Entrar</Button>
          </Form>
          <p className="prisma-auth-footnote">Sem sessão, organização ou papel reconhecido, o acesso permanece bloqueado.</p>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return <div className="prisma-loading-screen" role="status" aria-live="polite"><span className="prisma-loading-mark" /><span>Validando sessão e memberships...</span></div>;
}

function getNavigationItems(activeMembership: OrganizationMembership | null): PrismaNavigationItem[] {
  if (!activeMembership) return [];
  return routes
    .filter((route): route is AppRoute & { label: string; icon: ReactNode } => Boolean(route.label && route.icon))
    .filter((route) => !route.rule.allowedRoles || route.rule.allowedRoles.includes(activeMembership.role))
    .map((route) => ({ path: route.path, label: route.label, icon: route.icon }));
}

function findRoute(pathname: string): AppRoute {
  const normalized = normalizePath(pathname);
  const exact = routes.find((route) => route.path === normalized);
  if (exact) return exact;
  const profileMatch = /^\/profiles\/([^/]+)$/.exec(normalized);
  if (profileMatch?.[1]) return { path: "/profiles", profileId: profileMatch[1], rule: { requiresAuth: true, requiresMembership: true } };
  return routes[0]!;
}

function describeRole(role: OrganizationMembership["role"] | null): string {
  if (role === "admin") return "Administrador";
  if (role === "recruiter") return "Recrutador";
  if (role === "hiring_manager") return "Gestor contratante";
  return "Sem papel ativo";
}

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function navigate(path: string, replace = false): void {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
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
