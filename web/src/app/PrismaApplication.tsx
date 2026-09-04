import { useEffect, useState, type ReactNode } from "react";
import {
  ApartmentOutlined,
  BankOutlined,
  BranchesOutlined,
  HomeOutlined,
  BookOutlined,
  DatabaseOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Form, Input, Result, Tag } from "antd";
import type { JwtPayload } from "@supabase/supabase-js";
import type { PlatformOperator } from "../domain/platformUsersData";
import { supabase } from "../infrastructure/supabase/client";
import { prismaRepository } from "../infrastructure/supabase/prismaRepository";
import { platformUsersService } from "../infrastructure/supabase/platformUsersService";
import { HomePage } from "../pages/HomePage";
import { PasswordChangePage } from "../pages/PasswordChangePage";
import { PeoplePage } from "../pages/PeoplePage";
import { DocumentDetailPage } from "../pages/DocumentDetailPage";
import { DocumentOperationsPage } from "../pages/DocumentOperationsPage";
import { PersonFormPage } from "../pages/PersonFormPage";
import { PersonProfilePage } from "../pages/PersonProfilePage";
import { ProfileSearchPage } from "../pages/ProfileSearchPage";
import { ProfileComparePage } from "../pages/ProfileComparePage";
import { PersonWorkspacePage } from "../pages/PersonWorkspacePage";
import { ProfileReviewPage } from "../pages/ProfileReviewPage";
import { ProfileDeltaPage } from "../pages/ProfileDeltaPage";
import { ProfileVersionsPage } from "../pages/ProfileVersionsPage";
import { PersonMergePage } from "../pages/PersonMergePage";
import { ResumeImportPage } from "../pages/ResumeImportPage";
import { UserFormPage } from "../pages/UserFormPage";
import { UsersPage } from "../pages/UsersPage";
import { KnowledgePage } from "../pages/KnowledgePage";
import { CompetencyVerificationPage } from "../pages/CompetencyVerificationPage";
import { VerificationOperationsPage } from "../pages/VerificationOperationsPage";
import { VerificationSessionPage } from "../pages/VerificationSessionPage";
import { AssessmentItemBankPage } from "../pages/AssessmentItemBankPage";
import {
  canActivateOrganization,
  evaluateRouteAccess,
  resolvePreferredOrganizationId,
  resolveActiveMembership,
  type OrganizationMembership,
  type RouteRule,
} from "../shared/access";
import { describePlatformAccessProfile } from "../shared/platformUsers";
import { PrismaAppShell, type PrismaNavigationItem } from "../ui/PrismaAppShell";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface AppState {
  claims: JwtPayload | null;
  currentOperator: PlatformOperator | null;
  memberships: OrganizationMembership[];
  activeOrganizationId: string | null;
  initialized: boolean;
  signingIn: boolean;
  recoveringAccess: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
}

interface AppRoute {
  path: string;
  label?: string;
  rule: RouteRule;
  icon?: ReactNode;
  profileId?: string;
  profileMode?: "view" | "edit" | "create";
  profileView?: "workspace" | "profile" | "search" | "compare" | "operations" | "document" | "review" | "delta" | "verification" | "versions" | "import" | "merge";
  comparePersonIds?: [string, string];
  documentId?: string;
  reviewId?: string;
  userId?: string;
  verificationNeedId?: string;
  verificationMode?: "detail" | "prepare";
  verificationPreparedAssessmentId?: string;
  participantToken?: string;
}

interface SignInValues {
  username: string;
  password: string;
}

const ACTIVE_ORGANIZATION_STORAGE_KEY = "prisma.activeOrganizationId";

const routes: AppRoute[] = [
  { path: "/", label: "Home", icon: <HomeOutlined />, rule: { requiresAuth: true, requiresMembership: true } },
  { path: "/profiles", label: "Pessoas", icon: <TeamOutlined />, rule: { requiresAuth: true, requiresMembership: true } },
  {
    path: "/vacancies",
    label: "Vagas",
    icon: <ApartmentOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] },
  },
  {
    path: "/matching",
    label: "Matching",
    icon: <BranchesOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] },
  },
  {
    path: "/verifications",
    label: "Verificações",
    icon: <SafetyCertificateOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] },
  },
  {
    path: "/item-bank",
    label: "Banco de Itens",
    icon: <DatabaseOutlined />,
    rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin"] },
  },
  {
    path: "/users",
    label: "Usuários",
    icon: <UserOutlined />,
    rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner", "admin"] },
  },
  {
    path: "/organizations",
    label: "Organizações",
    icon: <BankOutlined />,
    rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner"] },
  },
  {
    path: "/knowledge",
    label: "Conhecimento",
    icon: <BookOutlined />,
    rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner", "admin"] },
  },
  {
    path: "/settings",
    label: "Configurações",
    icon: <SettingOutlined />,
    rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner", "admin"] },
  },
  { path: "/change-password", rule: { requiresAuth: true, requiresMembership: false } },
  { path: "/sign-in", rule: { requiresAuth: false, requiresMembership: false } },
  { path: "/access-denied", rule: { requiresAuth: true, requiresMembership: false } },
  { path: "/unauthorized", rule: { requiresAuth: true, requiresMembership: false } },
];

const initialState: AppState = {
  claims: null,
  currentOperator: null,
  memberships: [],
  activeOrganizationId: null,
  initialized: false,
  signingIn: false,
  recoveringAccess: false,
  errorMessage: null,
  infoMessage: null,
};

export function PrismaApplication() {
  const [state, setState] = useState<AppState>(initialState);
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  async function refreshAuthState() {
    const { data, error } = await supabase.auth.getClaims();
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
      const [currentOperator, memberships] = await Promise.all([
        prismaRepository.loadCurrentOperator(claims.sub),
        prismaRepository.loadMemberships(claims.sub),
      ]);
      const activeOrganizationId = resolvePreferredOrganizationId(memberships, readStoredActiveOrganizationId());
      if (activeOrganizationId) persistActiveOrganizationId(activeOrganizationId);
      else clearStoredActiveOrganizationId();
      setState((previous) => ({
        ...previous,
        claims,
        currentOperator,
        memberships,
        activeOrganizationId,
        initialized: true,
        errorMessage: null,
        infoMessage: !currentOperator
          ? "Sessão válida, mas nenhum operador do Prisma foi encontrado."
          : currentOperator.status !== "active" && !currentOperator.mustChangePassword
            ? "Este usuário não possui operação ativa na plataforma."
            : memberships.length === 0 && !currentOperator.mustChangePassword
              ? "Sessão válida, mas nenhuma empresa ativa foi encontrada para o operador."
              : null,
      }));
    } catch {
      clearStoredActiveOrganizationId();
      setState((previous) => ({
        ...previous,
        claims,
        currentOperator: null,
        memberships: [],
        activeOrganizationId: null,
        initialized: true,
        errorMessage: "A sessão foi validada, mas o contexto do operador não pôde ser confirmado.",
      }));
    }
  }

  useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshAuthState(), 0);
    });
    void refreshAuthState();
    return () => {
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
  const redirectTo = resolveRedirect(route, state, access);

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

  const handleSignIn = async ({ username, password }: SignInValues) => {
    setState((current) => ({ ...current, signingIn: true, errorMessage: null, infoMessage: null }));
    try {
      await platformUsersService.signInWithUsername(username, password);
      setState((current) => ({ ...current, signingIn: false, infoMessage: "Sessão iniciada com sucesso." }));
    } catch {
      setState((current) => ({ ...current, signingIn: false, errorMessage: "Username, senha ou sessão inválidos." }));
    }
  };

  const handleRequestPasswordReset = async (identifier: string) => {
    setState((current) => ({ ...current, recoveringAccess: true, errorMessage: null, infoMessage: null }));
    try {
      await platformUsersService.requestPasswordReset(identifier);
      setState((current) => ({
        ...current,
        recoveringAccess: false,
        infoMessage: "Se o identificador existir, um fluxo seguro de recuperação foi iniciado.",
      }));
    } catch {
      setState((current) => ({
        ...current,
        recoveringAccess: false,
        errorMessage: "Não foi possível solicitar a recuperação de acesso neste momento.",
      }));
    }
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
      setState((current) => ({ ...current, activeOrganizationId: null, errorMessage: "Empresa não autorizada." }));
      return;
    }
    persistActiveOrganizationId(organizationId);
    setState((current) => ({ ...current, activeOrganizationId: organizationId, infoMessage: "Empresa ativa atualizada." }));
    if (pathname.startsWith("/profiles/")) handleNavigate("/profiles");
  };

  if (route.participantToken) return <VerificationSessionPage token={route.participantToken} />;

  if (!state.initialized || redirectTo) return <LoadingScreen />;
  if (route.path === "/sign-in") {
    return <SignInPage
      errorMessage={state.errorMessage}
      infoMessage={state.infoMessage}
      recoveringAccess={state.recoveringAccess}
      signingIn={state.signingIn}
      onDismissAlert={() => setState((current) => ({ ...current, errorMessage: null, infoMessage: null }))}
      onRequestPasswordReset={handleRequestPasswordReset}
      onSignIn={handleSignIn}
    />;
  }

  const navigationItems = getNavigationItems(state.currentOperator, activeMembership);
  const profileName = state.currentOperator?.fullName ?? "Operador";
  const profileSubtitle = state.currentOperator
    ? describePlatformAccessProfile(state.currentOperator.profile)
    : describeRole(activeMembership?.role ?? null);

  return (
    <PrismaAppShell
      activeMembership={activeMembership}
      memberships={state.memberships}
      navigationItems={navigationItems}
      onNavigate={handleNavigate}
      onOrganizationChange={handleOrganizationChange}
      onSignOut={() => void handleSignOut()}
      profileName={profileName}
      profileSubtitle={profileSubtitle}
      selectedPath={route.profileId ? "/profiles" : route.userId ? "/users" : route.path.startsWith("/matching") ? "/matching" : route.path.startsWith("/verifications") ? "/verifications" : route.path}
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
      <div key={activeMembership?.organizationId ?? state.currentOperator?.authUserId ?? "no-context"}>
        {renderRouteContent(route, state.currentOperator, activeMembership, navigationItems, handleNavigate, refreshAuthState)}
      </div>
    </PrismaAppShell>
  );
}

function renderRouteContent(
  route: AppRoute,
  currentOperator: PlatformOperator | null,
  activeMembership: OrganizationMembership | null,
  navigationItems: PrismaNavigationItem[],
  onNavigate: (path: string) => void,
  onPasswordCompleted: () => Promise<void>,
) {
  if (route.path === "/" && activeMembership) {
    return <HomePage activeMembership={activeMembership} repository={prismaRepository} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles/new" && activeMembership) {
    return <PersonFormPage activeMembership={activeMembership} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "import" && activeMembership) {
    return <ResumeImportPage activeMembership={activeMembership} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "operations" && activeMembership) {
    return <DocumentOperationsPage activeMembership={activeMembership} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "search" && activeMembership) {
    return <ProfileSearchPage activeMembership={activeMembership} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "compare" && route.comparePersonIds && activeMembership) {
    return <ProfileComparePage activeMembership={activeMembership} personIds={route.comparePersonIds} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "review" && route.profileId && route.reviewId && activeMembership) {
    return <ProfileReviewPage activeMembership={activeMembership} personId={route.profileId} {...(route.documentId ? { documentId: route.documentId } : {})} reviewId={route.reviewId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "delta" && route.profileId && route.reviewId && activeMembership) {
    return <ProfileDeltaPage activeMembership={activeMembership} personId={route.profileId} {...(route.documentId ? { documentId: route.documentId } : {})} reviewId={route.reviewId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "verification" && route.profileId && route.documentId && route.reviewId && activeMembership) {
    return <ProfileReviewPage activeMembership={activeMembership} mode="view" personId={route.profileId} documentId={route.documentId} reviewId={route.reviewId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "document" && route.profileId && route.documentId && activeMembership) {
    return <DocumentDetailPage activeMembership={activeMembership} personId={route.profileId} documentId={route.documentId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "versions" && route.profileId && activeMembership) {
    return <ProfileVersionsPage activeMembership={activeMembership} personId={route.profileId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileView === "merge" && route.profileId && activeMembership) {
    return <PersonMergePage activeMembership={activeMembership} personId={route.profileId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileId && route.profileMode === "edit" && activeMembership) {
    return <PersonFormPage activeMembership={activeMembership} personId={route.profileId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileId && route.profileView === "profile" && activeMembership) {
    return <PersonProfilePage activeMembership={activeMembership} personId={route.profileId} repository={prismaRepository} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && route.profileId && activeMembership) {
    if (activeMembership.role === "member") {
      return <PersonProfilePage activeMembership={activeMembership} personId={route.profileId} repository={prismaRepository} onNavigate={onNavigate} />;
    }
    return <PersonWorkspacePage activeMembership={activeMembership} personId={route.profileId} onNavigate={onNavigate} />;
  }
  if (route.path === "/profiles" && activeMembership) {
    return <PeoplePage activeMembership={activeMembership} repository={prismaRepository} onNavigate={onNavigate} />;
  }
  if (route.path === "/users" && route.userId) {
    return <UserFormPage mode="edit" onNavigate={onNavigate} userId={route.userId} />;
  }
  if (route.path === "/users/new") {
    return <UserFormPage mode="create" onNavigate={onNavigate} />;
  }
  if (route.path === "/users") {
    return <UsersPage onNavigate={onNavigate} />;
  }
  if (route.path === "/matching" && activeMembership) {
    return <CompetencyVerificationPage activeMembership={activeMembership} mode={route.verificationMode ?? "matching"} {...(route.verificationNeedId ? { needId: route.verificationNeedId } : {})} onNavigate={onNavigate} />;
  }
  if (route.path === "/verifications" && activeMembership) {
    return <VerificationOperationsPage activeMembership={activeMembership} {...(route.verificationPreparedAssessmentId ? { preparedAssessmentId: route.verificationPreparedAssessmentId } : {})} onNavigate={onNavigate} />;
  }
  if (route.path === "/item-bank" && activeMembership) {
    return <AssessmentItemBankPage activeMembership={activeMembership} />;
  }
  if (route.path === "/knowledge" && currentOperator) {
    return <KnowledgePage profile={currentOperator.profile} activeMembership={activeMembership} />;
  }
  if (route.path === "/change-password" && currentOperator) {
    return <PasswordChangePage currentOperator={currentOperator} onNavigate={onNavigate} onPasswordCompleted={onPasswordCompleted} />;
  }
  if (route.path === "/vacancies") {
    return <PlaceholderPage title="Vagas" description="Vagas e requisitos da empresa ativa." />;
  }
  if (route.path === "/organizations") {
    return <PlaceholderPage title="Organizações" description="Gestão estrutural de grupos e empresas permanece fora deste movimento." />;
  }
  if (route.path === "/settings") {
    return <PlaceholderPage title="Configurações" description="Configurações operacionais e de segurança ficam centralizadas aqui." />;
  }
  if (route.path === "/access-denied") {
    return <AccessResult activeMembership={activeMembership} currentOperator={currentOperator} unauthorized={false} />;
  }
  return <AccessResult activeMembership={activeMembership} currentOperator={currentOperator} unauthorized />;
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <PrismaPage>
      <PrismaPageHeader title={title} description={description} />
      <PrismaCard>
        <Result status="info" subTitle="O App Shell e a autorização da rota estão preservados." title="Módulo fora deste movimento" />
      </PrismaCard>
    </PrismaPage>
  );
}

function AccessResult({
  unauthorized,
  activeMembership,
  currentOperator,
}: {
  unauthorized: boolean;
  activeMembership: OrganizationMembership | null;
  currentOperator: PlatformOperator | null;
}) {
  const subtitle = unauthorized
    ? `O perfil ${describeRole(currentOperator?.profile ?? activeMembership?.role ?? null)} não libera esta rota.`
    : currentOperator?.mustChangePassword
      ? "Finalize a troca de senha para concluir o primeiro acesso."
      : currentOperator
        ? "A sessão é válida, mas o operador não possui contexto ativo suficiente."
        : "A sessão é válida, mas nenhum operador do Prisma foi encontrado.";

  return (
    <PrismaPage>
      <PrismaCard>
        <Result
          extra={activeMembership ? <Tag color="blue">Empresa ativa: {activeMembership.organizationName}</Tag> : undefined}
          status="403"
          subTitle={subtitle}
          title={unauthorized ? "Permissão insuficiente" : "Acesso bloqueado"}
        />
      </PrismaCard>
    </PrismaPage>
  );
}

function SignInPage({
  errorMessage,
  infoMessage,
  signingIn,
  recoveringAccess,
  onDismissAlert,
  onSignIn,
  onRequestPasswordReset,
}: {
  errorMessage: string | null;
  infoMessage: string | null;
  signingIn: boolean;
  recoveringAccess: boolean;
  onDismissAlert: () => void;
  onSignIn: (values: SignInValues) => Promise<void>;
  onRequestPasswordReset: (identifier: string) => Promise<void>;
}) {
  const [form] = Form.useForm<SignInValues>();

  return (
    <main className="prisma-auth-shell">
      <img alt="" aria-hidden="true" className="prisma-auth-background" src="/assets/login/prisma-login-background.png" />
      <div className="prisma-auth-hrt-frame"><img alt="HRT Solutions" src="/assets/login/hrt-logo-light.png" /></div>
      <section className="prisma-auth-brand-panel">
        <div className="prisma-auth-brand-frame"><img src="/assets/login/prisma-logo-light.png" alt="Prisma" /></div>
        <div className="prisma-auth-message">
          <h1>Onde a evidência<br />encontra a <span>Inteligência.</span></h1>
          <div aria-hidden="true" className="prisma-auth-message-line" />
          <p>Inteligência que conecta.<br />Evidência que transforma.</p>
        </div>
      </section>
      <section className="prisma-auth-form-panel">
        <div className="prisma-auth-form-wrap">
          <div aria-hidden="true" className="prisma-auth-lock-badge"><LockOutlined /></div>
          <div className="prisma-auth-form-heading"><h2>Entrar no <span>Prisma</span></h2></div>
          {errorMessage || infoMessage ? <Alert closable message={errorMessage ?? infoMessage} onClose={onDismissAlert} showIcon type={errorMessage ? "error" : "success"} /> : null}
          <Form<SignInValues> className="prisma-auth-form" form={form} layout="vertical" onFinish={(values) => void onSignIn(values)} requiredMark={false}>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: "Informe o username." }]}>
              <Input autoComplete="username" prefix={<UserOutlined />} size="large" />
            </Form.Item>
            <Form.Item label="Senha" name="password" rules={[{ required: true, min: 1, message: "Informe sua senha." }]}>
              <Input.Password autoComplete="current-password" prefix={<LockOutlined />} size="large" />
            </Form.Item>
            <Button block className="prisma-auth-submit" htmlType="submit" loading={signingIn} size="large" type="primary">Entrar</Button>
            <Button
              block
              className="prisma-auth-recovery"
              loading={recoveringAccess}
              onClick={() => void onRequestPasswordReset(form.getFieldValue("username") ?? "")}
              size="large"
              type="default"
            >
              Esqueci minha senha
            </Button>
          </Form>
        </div>
      </section>
      <footer className="prisma-auth-footer">Prisma <span>•</span> 2026 <span>•</span> v2.6.0 <span>•</span> HRT Solutions</footer>
    </main>
  );
}

function LoadingScreen() {
  return <div className="prisma-loading-screen" role="status" aria-live="polite"><span className="prisma-loading-mark" /><span>Validando sessão, operador e escopo...</span></div>;
}

function getNavigationItems(
  currentOperator: PlatformOperator | null,
  activeMembership: OrganizationMembership | null,
): PrismaNavigationItem[] {
  if (!currentOperator) return [];
  return routes
    .filter((route): route is AppRoute & { label: string; icon: ReactNode } => Boolean(route.label && route.icon))
    .filter((route) => !route.rule.allowedRoles || route.rule.allowedRoles.includes(currentOperator.profile))
    .filter((route) => route.rule.requiresMembership !== true || Boolean(activeMembership))
    .map((route) => ({ path: route.path, label: route.label, icon: route.icon }));
}

function findRoute(pathname: string): AppRoute {
  const normalized = normalizePath(pathname);
  const participantMatch = /^\/verify\/([A-Za-z0-9_-]{40,200})$/.exec(normalized);
  if (participantMatch?.[1]) return { path: "/verify", participantToken: participantMatch[1], rule: { requiresAuth: false, requiresMembership: false } };
  const exact = routes.find((route) => route.path === normalized);
  if (exact) return exact;
  const reviewerRule = { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] as const };
  if (normalized === "/profiles/new") return { path: "/profiles/new", profileMode: "create", rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] } };
  if (normalized === "/profiles/import") return { path: "/profiles", profileView: "import", rule: reviewerRule };
  if (normalized === "/profiles/processes") return { path: "/profiles", profileView: "operations", rule: reviewerRule };
  if (normalized === "/profiles/search") return { path: "/profiles", profileView: "search", rule: { requiresAuth: true, requiresMembership: true } };
  const comparisonMatch = /^\/profiles\/compare\/([^/]+)\/([^/]+)$/.exec(normalized);
  if (comparisonMatch?.[1] && comparisonMatch[2]) return { path: "/profiles", profileView: "compare", comparePersonIds: [comparisonMatch[1], comparisonMatch[2]], rule: { requiresAuth: true, requiresMembership: true } };
  const reviewMatch = /^\/profiles\/([^/]+)\/documents\/([^/]+)\/review\/([^/]+)$/.exec(normalized);
  if (reviewMatch?.[1] && reviewMatch[2] && reviewMatch[3]) return { path: "/profiles", profileId: reviewMatch[1], documentId: reviewMatch[2], reviewId: reviewMatch[3], profileView: "review", rule: reviewerRule };
  const deltaMatch = /^\/profiles\/([^/]+)\/documents\/([^/]+)\/review\/([^/]+)\/delta$/.exec(normalized);
  if (deltaMatch?.[1] && deltaMatch[2] && deltaMatch[3]) return { path: "/profiles", profileId: deltaMatch[1], documentId: deltaMatch[2], reviewId: deltaMatch[3], profileView: "delta", rule: reviewerRule };
  const profileSourceDeltaMatch = /^\/profiles\/([^/]+)\/reviews\/([^/]+)\/delta$/.exec(normalized);
  if (profileSourceDeltaMatch?.[1] && profileSourceDeltaMatch[2]) return { path: "/profiles", profileId: profileSourceDeltaMatch[1], reviewId: profileSourceDeltaMatch[2], profileView: "delta", rule: reviewerRule };
  const profileSourceReviewMatch = /^\/profiles\/([^/]+)\/reviews\/([^/]+)$/.exec(normalized);
  if (profileSourceReviewMatch?.[1] && profileSourceReviewMatch[2]) return { path: "/profiles", profileId: profileSourceReviewMatch[1], reviewId: profileSourceReviewMatch[2], profileView: "review", rule: reviewerRule };
  const verificationMatch = /^\/profiles\/([^/]+)\/documents\/([^/]+)\/verification\/([^/]+)$/.exec(normalized);
  if (verificationMatch?.[1] && verificationMatch[2] && verificationMatch[3]) return { path: "/profiles", profileId: verificationMatch[1], documentId: verificationMatch[2], reviewId: verificationMatch[3], profileView: "verification", rule: reviewerRule };
  const documentMatch = /^\/profiles\/([^/]+)\/documents\/([^/]+)$/.exec(normalized);
  if (documentMatch?.[1] && documentMatch[2]) return { path: "/profiles", profileId: documentMatch[1], documentId: documentMatch[2], profileView: "document", rule: reviewerRule };
  const versionsMatch = /^\/profiles\/([^/]+)\/versions$/.exec(normalized);
  if (versionsMatch?.[1]) return { path: "/profiles", profileId: versionsMatch[1], profileView: "versions", rule: reviewerRule };
  const mergeMatch = /^\/profiles\/([^/]+)\/merge$/.exec(normalized);
  if (mergeMatch?.[1]) return { path: "/profiles", profileId: mergeMatch[1], profileView: "merge", rule: reviewerRule };
  const profileReadMatch = /^\/profiles\/([^/]+)\/profile$/.exec(normalized);
  if (profileReadMatch?.[1]) return { path: "/profiles", profileId: profileReadMatch[1], profileView: "profile", profileMode: "view", rule: { requiresAuth: true, requiresMembership: true } };
  const profileEditMatch = /^\/profiles\/([^/]+)\/edit$/.exec(normalized);
  if (profileEditMatch?.[1]) return { path: "/profiles", profileId: profileEditMatch[1], profileMode: "edit", rule: { requiresAuth: true, requiresMembership: true, allowedRoles: ["super_admin", "owner", "admin", "recruiter"] } };
  const profileMatch = /^\/profiles\/([^/]+)$/.exec(normalized);
  if (profileMatch?.[1]) return { path: "/profiles", profileId: profileMatch[1], profileMode: "view", rule: { requiresAuth: true, requiresMembership: true } };
  const matchingPrepare = /^\/matching\/verification-needs\/([^/]+)\/prepare$/.exec(normalized);
  if (matchingPrepare?.[1]) return { path: "/matching", verificationNeedId: matchingPrepare[1], verificationMode: "prepare", rule: reviewerRule };
  const matchingDetail = /^\/matching\/verification-needs\/([^/]+)$/.exec(normalized);
  if (matchingDetail?.[1]) return { path: "/matching", verificationNeedId: matchingDetail[1], verificationMode: "detail", rule: reviewerRule };
  const verificationInvite = /^\/verifications\/new\/([^/]+)$/.exec(normalized);
  if (verificationInvite?.[1]) return { path: "/verifications", verificationPreparedAssessmentId: verificationInvite[1], rule: reviewerRule };
  if (normalized === "/users/new") return { path: "/users/new", rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner", "admin"] } };
  const userMatch = /^\/users\/([^/]+)$/.exec(normalized);
  if (userMatch?.[1]) {
    return { path: "/users", userId: userMatch[1], rule: { requiresAuth: true, requiresMembership: false, allowedRoles: ["super_admin", "owner", "admin"] } };
  }
  return routes[0]!;
}

function resolveRedirect(route: AppRoute, state: AppState, access: ReturnType<typeof evaluateRouteAccess>): string | null {
  if (route.path === "/sign-in" && state.claims && state.currentOperator?.mustChangePassword) return "/change-password";
  if (route.path === "/sign-in" && state.claims) return "/";
  if (state.claims && state.currentOperator?.mustChangePassword && route.path !== "/change-password") return "/change-password";
  if (state.claims && state.currentOperator && state.currentOperator.status !== "active" && !state.currentOperator.mustChangePassword) {
    return route.path === "/access-denied" ? null : "/access-denied";
  }
  if (!access.allowed && access.redirectTo && access.redirectTo !== route.path) return access.redirectTo;
  return null;
}

function describeRole(role: OrganizationMembership["role"] | PlatformOperator["profile"] | null): string {
  if (!role) return "Sem perfil ativo";
  return describePlatformAccessProfile(role);
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
