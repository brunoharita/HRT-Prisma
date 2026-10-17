import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { AccessEmailError, CONTACT_EMAIL, isTechnicalAuthEmail, readAuthIdentity, sendOperatorAccessEmail, technicalAuthEmail } from "./operatorIdentity.ts";

const PASSWORD_MIN_LENGTH = 8;

type MembershipRole = "super_admin" | "owner" | "admin" | "recruiter" | "member";
type PlatformUserStatus = "pending_first_access" | "active" | "inactive" | "blocked";
type CredentialMode = "manual_password" | "activation_link";

interface PlatformUserRow {
  id: string;
  auth_user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone_e164: string | null;
  phone_country_iso2: string | null;
  phone_country_label: string | null;
  phone_country_code: string | null;
  phone_national_number: string | null;
  access_profile: MembershipRole;
  group_id: string | null;
  status: PlatformUserStatus;
  credential_mode: CredentialMode;
  must_change_password: boolean;
}

interface OrganizationRow {
  id: string;
  name: string;
  group_id: string;
}

type ManagedUserRow = Omit<PlatformUserRow, "phone_e164" | "credential_mode" | "must_change_password">;

interface OrganizationMembershipRow {
  organization_id: string;
  user_id: string;
  role: MembershipRole;
}

interface GroupRow {
  id: string;
  name: string;
}

interface UpsertInput {
  fullName: string;
  username: string;
  email: string;
  status: "active" | "inactive";
  profile: MembershipRole;
  groupId: string | null;
  organizationIds: string[];
  phoneCountryIso2: string;
  phoneNationalNumber: string;
  credentialMode: CredentialMode;
  password?: string;
  passwordConfirmation?: string;
}

interface ActorContext {
  actor: PlatformUserRow;
  accessibleOrganizations: OrganizationRow[];
  accessibleOrganizationIds: Set<string>;
}
interface OwnerOnboardingContext {
  contract: "owner-onboarding-1.0.0"; username: string; profile: "owner";
  group: { id: string; name: string }; company: { id: string; name: string };
}

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceClient = createServiceClient();
    const userClient = createUserClient(request);
    const authUser = await requireAuthUser(userClient);
    const payload = await request.json();
    const action = String(payload?.action ?? "");

    if (action === "owner_context" || action === "create_owner") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      const context = await readOwnerContext(serviceClient, actorContext, String(payload?.groupId ?? ""), payload?.contract);
      if (action === "owner_context") return jsonResponse(200, { ...context });
      const input = payload?.input as UpsertInput;
      if (!input || input.username !== context.username || input.profile !== "owner" || input.groupId !== context.group.id
        || !Array.isArray(input.organizationIds) || input.organizationIds.length !== 1 || input.organizationIds[0] !== context.company.id) {
        throw new HttpError(403, "Os quatro campos protegidos do cadastro de Owner foram alterados. Reabra Cadastrar Owner no grupo.");
      }
      const origin = request.headers.get("origin") ?? new URL(request.url).origin;
      await createPlatformUser(serviceClient, actorContext, input, origin, context);
      return jsonResponse(200, { ok: true });
    }

    if (action === "list") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      assertCanManageUsers(actorContext.actor);
      const data = await buildBootstrapPayload(serviceClient, actorContext, payload?.query ?? {});
      return jsonResponse(200, data);
    }

    if (action === "get") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      assertCanManageUsers(actorContext.actor);
      const user = await readVisibleTargetUser(serviceClient, actorContext, String(payload?.userId ?? ""));
      return jsonResponse(200, user);
    }

    if (action === "create") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      assertCanManageUsers(actorContext.actor);
      const input = payload?.input as UpsertInput;
      const origin = request.headers.get("origin") ?? new URL(request.url).origin;
      await createPlatformUser(serviceClient, actorContext, input, origin);
      return jsonResponse(200, { ok: true });
    }

    if (action === "update") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      assertCanManageUsers(actorContext.actor);
      const input = payload?.input as UpsertInput;
      await updatePlatformUser(serviceClient, actorContext, String(payload?.userId ?? ""), input);
      return jsonResponse(200, { ok: true });
    }

    if (action === "admin_reset_password") {
      const actorContext = await loadActorContext(serviceClient, authUser.id);
      assertCanManageUsers(actorContext.actor);
      const origin = request.headers.get("origin") ?? new URL(request.url).origin;
      await requestAdminPasswordReset(serviceClient, actorContext, String(payload?.userId ?? ""), origin);
      return jsonResponse(200, { ok: true });
    }

    if (action === "complete_first_access") {
      await completeFirstAccess(serviceClient, authUser.id);
      return jsonResponse(200, { ok: true });
    }

    throw new HttpError(400, "Ação de usuários não suportada.");
  } catch (error) {
    if (error instanceof AccessEmailError) return jsonResponse(error.status, { error: error.message });
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message });
    const message = error instanceof Error ? error.message : "Falha inesperada na função de usuários.";
    return jsonResponse(500, { error: message });
  }
});

async function buildBootstrapPayload(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  rawQuery: Record<string, unknown>,
) {
  const visibleGroups = await listVisibleGroups(serviceClient, actorContext);
  const visibleUsers = await listVisibleUsers(serviceClient, actorContext, rawQuery);

  return {
    currentOperator: mapOperator(actorContext.actor, visibleGroups),
    groups: visibleGroups.map((group) => ({
      id: group.id,
      name: group.name,
      organizations: group.organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        groupId: organization.group_id,
        groupName: group.name,
      })),
    })),
    users: visibleUsers,
  };
}

async function listVisibleGroups(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
) {
  if (actorContext.actor.access_profile === "super_admin") {
    const [groups, organizations] = await Promise.all([
      selectRows<GroupRow>(serviceClient.from("organization_groups").select("id, name").order("name", { ascending: true })),
      selectRows<OrganizationRow>(serviceClient.from("organizations").select("id, name, group_id").order("name", { ascending: true })),
    ]);
    return groups.map((group) => ({
      ...group,
      organizations: organizations.filter((organization) => organization.group_id === group.id),
    }));
  }

  if (!actorContext.actor.group_id) return [];
  const [group] = await selectRows<GroupRow>(
    serviceClient.from("organization_groups").select("id, name").eq("id", actorContext.actor.group_id),
  );
  if (!group) return [];

  const organizations = actorContext.actor.access_profile === "owner"
    ? await selectRows<OrganizationRow>(
      serviceClient.from("organizations").select("id, name, group_id").eq("group_id", actorContext.actor.group_id).order("name", { ascending: true }),
    )
    : actorContext.accessibleOrganizations;

  return [{ ...group, organizations }];
}

async function listVisibleUsers(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  rawQuery: Record<string, unknown>,
) {
  let usersQuery = serviceClient
    .from("platform_users")
    .select("id, auth_user_id, full_name, username, email, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, access_profile, group_id, status")
    .order("full_name", { ascending: true });

  if (actorContext.actor.access_profile !== "super_admin" && actorContext.actor.group_id) {
    usersQuery = usersQuery.eq("group_id", actorContext.actor.group_id);
  }

  const users = await selectRows<ManagedUserRow>(usersQuery);
  if (users.length === 0) return [];

  const memberships = await selectRows<OrganizationMembershipRow>(
    serviceClient
      .from("organization_memberships")
      .select("organization_id, user_id, role")
      .in("user_id", users.map((user) => user.auth_user_id)),
  );

  const organizationIds = [...new Set(memberships.map((membership) => membership.organization_id))];
  const organizations = organizationIds.length === 0
    ? []
    : await selectRows<OrganizationRow>(
      serviceClient.from("organizations").select("id, name, group_id").in("id", organizationIds),
    );
  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
  const groupMap = new Map(
    (await listVisibleGroups(serviceClient, actorContext)).map((group) => [group.id, group.name]),
  );
  const actorScopeIds = actorContext.accessibleOrganizationIds;

  const query = {
    search: typeof rawQuery.search === "string" ? rawQuery.search.trim().toLowerCase() : "",
    status: typeof rawQuery.status === "string" ? rawQuery.status : "all",
    profile: typeof rawQuery.profile === "string" ? rawQuery.profile : "all",
    groupId: typeof rawQuery.groupId === "string" ? rawQuery.groupId : "all",
    organizationId: typeof rawQuery.organizationId === "string" ? rawQuery.organizationId : "all",
  };

  return users
    .map((user) => {
      const allowedOrganizations = memberships
        .filter((membership) => membership.user_id === user.auth_user_id)
        .map((membership) => organizationMap.get(membership.organization_id))
        .filter((organization): organization is OrganizationRow => Boolean(organization));

      return {
        id: user.id,
        authUserId: user.auth_user_id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phoneCountryIso2: user.phone_country_iso2,
        phoneCountryLabel: user.phone_country_label,
        phoneCountryCode: user.phone_country_code,
        phoneNationalNumber: user.phone_national_number,
        status: user.status,
        profile: user.access_profile,
        groupId: user.group_id,
        groupName: user.group_id ? groupMap.get(user.group_id) ?? null : null,
        allowedOrganizations: allowedOrganizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          groupId: organization.group_id,
          groupName: user.group_id ? groupMap.get(user.group_id) ?? "" : "",
        })),
      };
    })
    .filter((user) => isTargetVisible(actorContext.actor, actorScopeIds, user))
    .filter((user) => query.status === "all" || user.status === query.status)
    .filter((user) => query.profile === "all" || user.profile === query.profile)
    .filter((user) => query.groupId === "all" || user.groupId === query.groupId)
    .filter((user) => query.organizationId === "all" || user.allowedOrganizations.some((organization) => organization.id === query.organizationId))
    .filter((user) => !query.search || user.fullName.toLowerCase().includes(query.search) || user.username.toLowerCase().includes(query.search));
}

async function readVisibleTargetUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  userId: string,
) {
  if (!userId) throw new HttpError(400, "Usuário alvo não informado.");

  const [user] = await selectRows<ManagedUserRow>(
    serviceClient
      .from("platform_users")
      .select(
        "id, auth_user_id, full_name, username, email, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, access_profile, group_id, status",
      )
      .eq("id", userId),
  );
  if (!user) throw new HttpError(404, "Usuário não encontrado.");

  const [groupRow] = user.group_id
    ? await selectRows<GroupRow>(serviceClient.from("organization_groups").select("id, name").eq("id", user.group_id))
    : [];
  const memberships = await selectRows<OrganizationMembershipRow>(
    serviceClient
      .from("organization_memberships")
      .select("organization_id, user_id, role")
      .eq("user_id", user.auth_user_id),
  );
  const organizations = memberships.length === 0
    ? []
    : await selectRows<OrganizationRow>(
      serviceClient.from("organizations").select("id, name, group_id").in("id", memberships.map((membership) => membership.organization_id)),
    );

  const mappedUser = {
    id: user.id,
    authUserId: user.auth_user_id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    phoneCountryIso2: user.phone_country_iso2,
    phoneCountryLabel: user.phone_country_label,
    phoneCountryCode: user.phone_country_code,
    phoneNationalNumber: user.phone_national_number,
    status: user.status,
    profile: user.access_profile,
    groupId: user.group_id,
    groupName: groupRow?.name ?? null,
    allowedOrganizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      groupId: organization.group_id,
      groupName: groupRow?.name ?? "",
    })),
  };

  if (!isTargetVisible(actorContext.actor, actorContext.accessibleOrganizationIds, mappedUser)) {
    throw new HttpError(403, "Você não pode administrar este usuário.");
  }
  return mappedUser;
}

async function createPlatformUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  input: UpsertInput,
  _origin: string,
  ownerContext?: OwnerOnboardingContext,
) {
  const normalized = await normalizeAndValidateInput(serviceClient, actorContext, input);
  if (normalized.credentialMode === "activation_link" && normalized.status !== "active") {
    throw new HttpError(400, "Ative o usuário antes de iniciar o primeiro acesso por e-mail.");
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: technicalAuthEmail(), email_confirm: true,
    ...(normalized.credentialMode === "manual_password" ? { password: normalized.password } : {}),
    user_metadata: { full_name: normalized.fullName },
  });
  if (error || !data.user) throw new HttpError(400, "Não foi possível criar o usuário no Supabase Auth.");
  const authUserId = data.user.id;

  const platformStatus: PlatformUserStatus = normalized.credentialMode === "activation_link"
    ? "pending_first_access"
    : normalized.status;
  const mustChangePassword = normalized.credentialMode === "activation_link";

  try {
    await savePlatformRecord(serviceClient, actorContext, authUserId, normalized, platformStatus, mustChangePassword, ownerContext);
  } catch (error) {
    // This identity was created by this request and has no committed domain record or access.
    const { error: cleanupError } = await serviceClient.auth.admin.deleteUser(authUserId);
    if (cleanupError) throw new HttpError(500, "O cadastro não foi concluído e a ativação precisa de conciliação pelo suporte.");
    throw error;
  }
  // Send only after the account and scope commit. Never delete a committed user on mail failure.
  if (normalized.credentialMode === "activation_link") {
    try { await sendOperatorAccessEmail(serviceClient, authUserId, "activation", actorContext.actor.auth_user_id); }
    catch { throw new HttpError(502, "Usuário cadastrado, mas o envio da ativação não foi confirmado. Abra o cadastro em Usuários e solicite a redefinição de senha."); }
  }
}

async function updatePlatformUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  targetUserId: string,
  input: UpsertInput,
) {
  const [existing] = await selectRows<PlatformUserRow>(
    serviceClient
      .from("platform_users")
      .select("*")
      .eq("id", targetUserId),
  );
  if (!existing) throw new HttpError(404, "Usuário não encontrado.");

  const existingView = await readVisibleTargetUser(serviceClient, actorContext, targetUserId);
  if (existing.auth_user_id === actorContext.actor.auth_user_id) {
    const requestedScope = JSON.stringify({
      profile: input.profile,
      groupId: input.groupId,
      status: input.status,
      organizationIds: [...input.organizationIds].sort(),
    });
    const currentScope = JSON.stringify({
      profile: existing.access_profile,
      groupId: existing.group_id,
      status: existing.status === "active" ? "active" : "inactive",
      organizationIds: existingView.allowedOrganizations.map((organization) => organization.id).sort(),
    });
    if (requestedScope !== currentScope) {
      throw new HttpError(403, "Autoelevação, autoampliação de escopo e autoalteração de status não são permitidas.");
    }
  }

  const normalized = await normalizeAndValidateInput(serviceClient, actorContext, input, existing.id);
  if (existing.access_profile === "owner" && await wouldDeactivateLastOwner(serviceClient, existing, normalized)) {
    throw new HttpError(409, "O grupo precisa manter pelo menos um Owner ativo.");
  }

  if (normalized.email !== existing.email) {
    const identity = await readAuthIdentity(serviceClient, existing.auth_user_id);
    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(existing.auth_user_id, {
      email: isTechnicalAuthEmail(identity.email!) ? identity.email : technicalAuthEmail(existing.auth_user_id),
      email_confirm: true,
      user_metadata: { full_name: normalized.fullName },
    });
    if (authUpdateError) throw new HttpError(400, "Não foi possível atualizar o e-mail no Supabase Auth.");
  } else if (normalized.fullName !== existing.full_name) {
    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(existing.auth_user_id, {
      user_metadata: { full_name: normalized.fullName },
    });
    if (authUpdateError) throw new HttpError(400, "Não foi possível atualizar o nome do usuário no Supabase Auth.");
  }

  // Alias conversion is monotonic/idempotent, independent of the contact transaction.
  // A failed save preserves contact/password/ID; never restore an old routable Auth address
  // over another concurrent edit. All logins and deliveries already resolve by Auth UUID.
  await savePlatformRecord(serviceClient, actorContext, existing.auth_user_id, normalized, normalized.status, existing.must_change_password);
}

async function requestAdminPasswordReset(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  targetUserId: string,
  _origin: string,
) {
  const targetUser = await readVisibleTargetUser(serviceClient, actorContext, targetUserId);
  const [targetRow] = await selectRows<PlatformUserRow>(
    serviceClient
      .from("platform_users")
      .select("*")
      .eq("id", targetUserId),
  );
  if (!targetRow) throw new HttpError(404, "Usuário não encontrado.");

  await sendOperatorAccessEmail(serviceClient, targetRow.auth_user_id,
    targetRow.status === "pending_first_access" ? "activation" : "recovery", actorContext.actor.auth_user_id);

  const { error: updateError } = await serviceClient
    .from("platform_users")
    .update({ must_change_password: true })
    .eq("id", targetUserId);
  if (updateError) throw new HttpError(400, "Não foi possível registrar a redefinição pendente.");

  await recordAuditEvent(serviceClient, {
    actorAuthUserId: actorContext.actor.auth_user_id,
    targetPlatformUserId: targetUserId,
    targetAuthUserId: targetRow.auth_user_id,
    groupId: targetUser.groupId,
    organizationId: targetUser.allowedOrganizations[0]?.id ?? null,
    action: "password_reset_requested_by_admin",
    previousValues: { must_change_password: targetRow.must_change_password },
    newValues: { must_change_password: true },
  });
}

async function completeFirstAccess(
  serviceClient: ReturnType<typeof createServiceClient>,
  authUserId: string,
) {
  const { error } = await serviceClient.rpc("complete_first_access_v307", { p_auth_user: authUserId });
  if (error) throw new HttpError(error.code === "42501" ? 403 : 400, "Não foi possível concluir o primeiro acesso. Confirme se a conta está habilitada.");
}

async function savePlatformRecord(
  serviceClient: ReturnType<typeof createServiceClient>, actorContext: ActorContext, authUserId: string,
  normalized: Awaited<ReturnType<typeof normalizeAndValidateInput>>, status: PlatformUserStatus, mustChangePassword: boolean,
  ownerContext?: OwnerOnboardingContext,
) {
  const data = { fullName: normalized.fullName, username: normalized.username, email: normalized.email,
      profile: normalized.profile, groupId: normalized.groupId, status, credentialMode: normalized.credentialMode,
      mustChangePassword, phoneE164: normalized.phone.e164, phoneCountryIso2: normalized.phone.countryIso2,
      phoneCountryLabel: normalized.phone.countryLabel, phoneCountryCode: normalized.phone.callingCode,
      phoneNationalNumber: normalized.phone.nationalNumber };
  const { error } = ownerContext
    ? await serviceClient.rpc("create_group_owner_v301", { p_actor: actorContext.actor.auth_user_id, p_auth_user: authUserId,
      p_group: ownerContext.group.id, p_company: ownerContext.company.id, p_contract: ownerContext.contract, p_data: data })
    : await serviceClient.rpc("save_platform_user_v3", {
      p_actor: actorContext.actor.auth_user_id, p_auth_user: authUserId, p_organizations: normalized.organizationIds, p_data: data });
  if (error) throw new HttpError(error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400,
    error.code === "23505" ? "Já existe um cadastro ou Owner ativo incompatível. Atualize a consulta." : error.message);
}

async function readOwnerContext(serviceClient: ReturnType<typeof createServiceClient>, actorContext: ActorContext, groupId: string, contract: unknown): Promise<OwnerOnboardingContext> {
  if (actorContext.actor.access_profile !== "super_admin") throw new HttpError(403, "Somente Super Admin cadastra o Owner de um novo grupo.");
  if (!groupId || contract !== "owner-onboarding-1.0.0") throw new HttpError(400, "Contexto ou contrato de cadastro de Owner incompatível.");
  const { data, error } = await serviceClient.rpc("owner_onboarding_context_v301", { p_actor: actorContext.actor.auth_user_id, p_group: groupId, p_contract: contract });
  if (error) throw new HttpError(error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400, error.message);
  const context = data as OwnerOnboardingContext | null;
  if (!context || context.contract !== contract || context.profile !== "owner" || context.group?.id !== groupId
    || !context.username || !context.company?.id || !context.group.name || !context.company.name) throw new HttpError(400, "O contexto do Owner não pôde ser confirmado.");
  return context;
}

async function normalizeAndValidateInput(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  input: UpsertInput,
  currentUserId?: string,
) {
  if (!input) throw new HttpError(400, "Payload de usuário ausente.");
  const fullName = String(input.fullName ?? "").trim();
  const username = normalizeUsername(input.username);
  const email = String(input.email ?? "").trim().toLowerCase();
  const profile = input.profile === "admin" ? "recruiter" : input.profile;
  const groupId = input.groupId;
  const credentialMode = input.credentialMode;
  const status: PlatformUserStatus = input.status === "inactive" ? "inactive" : "active";

  if (!fullName) throw new HttpError(400, "Nome completo é obrigatório.");
  validateUsername(username);
  if (!CONTACT_EMAIL.test(email) || isTechnicalAuthEmail(email)) throw new HttpError(400, "E-mail inválido.");
  if (!["manual_password", "activation_link"].includes(credentialMode)) throw new HttpError(400, "Modo de credencial inválido.");
  if (!["super_admin", "owner", "admin", "recruiter", "member"].includes(profile)) throw new HttpError(400, "Perfil inválido.");
  if (profile === "super_admin" && actorContext.actor.access_profile !== "super_admin") {
    throw new HttpError(403, "Somente Super Admin pode conceder autoridade global.");
  }
  if (profile !== "super_admin" && !groupId) throw new HttpError(400, "Grupo é obrigatório para este perfil.");
  if (actorContext.actor.access_profile !== "super_admin" && groupId !== actorContext.actor.group_id) {
    throw new HttpError(403, "Você só pode administrar usuários dentro do seu próprio grupo.");
  }
  if (accessProfileRank(profile) > accessProfileRank(actorContext.actor.access_profile)) {
    throw new HttpError(403, "Você não pode produzir autoridade efetiva superior à sua.");
  }

  const phone = normalizePhoneInput(input.phoneCountryIso2, input.phoneNationalNumber);
  const organizations = groupId
    ? await selectRows<OrganizationRow>(
      serviceClient.from("organizations").select("id, name, group_id").eq("group_id", groupId),
    )
    : [];
  if (profile === "owner" && groupId) {
    const [otherOwner] = await selectRows<Pick<PlatformUserRow, "id">>(serviceClient.from("platform_users").select("id")
      .eq("group_id", groupId).eq("access_profile", "owner").in("status", ["active", "pending_first_access"])
      .neq("id", currentUserId ?? "00000000-0000-0000-0000-000000000000").limit(1));
    if (otherOwner) throw new HttpError(409, "Este grupo já possui Owner ativo ou com ativação pendente.");
  }
  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
  const organizationIds = normalizeOrganizationIds(profile, input.organizationIds, organizations);
  for (const organizationId of organizationIds) {
    if (!organizationMap.has(organizationId)) {
      throw new HttpError(400, "Empresas fora do grupo selecionado não são permitidas.");
    }
    if (actorContext.actor.access_profile !== "super_admin" && !actorContext.accessibleOrganizationIds.has(organizationId)) {
      throw new HttpError(403, "Você não pode atribuir uma empresa fora do seu próprio escopo.");
    }
  }

  const [usernameConflict] = await selectRows<Pick<PlatformUserRow, "id">>(
    serviceClient
      .from("platform_users")
      .select("id")
      .eq("username", username)
      .neq("id", currentUserId ?? "00000000-0000-0000-0000-000000000000")
      .limit(1),
  );
  if (usernameConflict) throw new HttpError(409, "O username informado já está em uso.");

  const password = input.password;
  if (credentialMode === "manual_password") {
    if (!password || password !== input.passwordConfirmation) throw new HttpError(400, "A confirmação da senha não coincide.");
    validatePassword(password, username);
  }

  return {
    fullName,
    username,
    email,
    profile,
    groupId,
    status,
    credentialMode,
    organizationIds,
    phone,
    password,
  };
}

function normalizeOrganizationIds(
  profile: MembershipRole,
  requestedOrganizationIds: string[],
  allOrganizations: OrganizationRow[],
) {
  if (profile === "super_admin") return [];
  if (profile === "owner") return allOrganizations.map((organization) => organization.id);
  const deduplicated = [...new Set(requestedOrganizationIds)];
  if ((profile === "admin" || profile === "recruiter") && deduplicated.length < 1) {
    throw new HttpError(400, "Selecione pelo menos uma empresa.");
  }
  if (profile === "member" && deduplicated.length < 1) {
    throw new HttpError(400, "Usuário comum precisa de pelo menos uma empresa.");
  }
  return deduplicated;
}

async function loadActorContext(
  serviceClient: ReturnType<typeof createServiceClient>,
  authUserId: string,
): Promise<ActorContext> {
  const [actor] = await selectRows<PlatformUserRow>(
    serviceClient
      .from("platform_users")
      .select("*")
      .eq("auth_user_id", authUserId),
  );
  if (!actor) throw new HttpError(403, "Operador não encontrado.");
  if (actor.access_profile !== "super_admin") {
    const {data: available, error} = await serviceClient.rpc("operator_administration_available_v307", {p_auth_user: authUserId});
    if (error || available !== true) throw new HttpError(403, "Administração indisponível. Confirme se o usuário e o Owner do grupo estão ativos.");
  }

  let accessibleOrganizations: OrganizationRow[] = [];
  if (actor.access_profile === "super_admin") {
    accessibleOrganizations = await selectRows<OrganizationRow>(
      serviceClient.from("organizations").select("id, name, group_id"),
    );
  } else {
    const memberships = await selectRows<OrganizationMembershipRow>(
      serviceClient
        .from("organization_memberships")
        .select("organization_id, user_id, role")
        .eq("user_id", authUserId),
    );
    const organizationIds = memberships.map((membership) => membership.organization_id);
    accessibleOrganizations = organizationIds.length === 0
      ? []
      : await selectRows<OrganizationRow>(
        serviceClient.from("organizations").select("id, name, group_id").in("id", organizationIds),
      );
  }

  return {
    actor,
    accessibleOrganizations,
    accessibleOrganizationIds: new Set(accessibleOrganizations.map((organization) => organization.id)),
  };
}

function assertCanManageUsers(actor: PlatformUserRow) {
  if (actor.status !== "active") throw new HttpError(403, "O operador atual não está ativo.");
  if (!["super_admin", "owner", "admin", "recruiter"].includes(actor.access_profile)) {
    throw new HttpError(403, "Este perfil não administra usuários.");
  }
}

function isTargetVisible(
  actor: PlatformUserRow,
  actorScopeIds: Set<string>,
  target: {
    authUserId: string;
    profile: MembershipRole;
    groupId: string | null;
    allowedOrganizations: { id: string }[];
  },
) {
  if (actor.access_profile === "super_admin") return true;
  if (!actor.group_id || target.groupId !== actor.group_id) return false;
  if (target.profile === "super_admin") return false;
  if (accessProfileRank(target.profile) > accessProfileRank(actor.access_profile)) return false;
  return target.allowedOrganizations.every((organization) => actorScopeIds.has(organization.id));
}

async function wouldDeactivateLastOwner(
  serviceClient: ReturnType<typeof createServiceClient>,
  existing: PlatformUserRow,
  normalized: Awaited<ReturnType<typeof normalizeAndValidateInput>>,
) {
  if (existing.access_profile !== "owner") return false;
  if (normalized.profile === "owner" && normalized.status === "active" && normalized.groupId === existing.group_id) return false;
  return await hasNoOtherActiveOwner(serviceClient, existing.auth_user_id, existing.group_id);
}

function hasNoOtherActiveOwner(
  serviceClient: ReturnType<typeof createServiceClient>,
  excludedAuthUserId: string,
  groupId: string | null,
) {
  if (!groupId) return Promise.resolve(false);
  return selectRows<Pick<PlatformUserRow, "id">>(
    serviceClient
      .from("platform_users")
      .select("id")
      .eq("group_id", groupId)
      .eq("access_profile", "owner")
      .eq("status", "active")
      .neq("auth_user_id", excludedAuthUserId)
      .limit(1),
  ).then((rows) => rows.length === 0);
}

async function recordAuditEvent(
  serviceClient: ReturnType<typeof createServiceClient>,
  payload: {
    actorAuthUserId: string | null;
    targetPlatformUserId: string | null;
    targetAuthUserId: string | null;
    groupId: string | null;
    organizationId: string | null;
    action: string;
    previousValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  },
) {
  const { error } = await serviceClient.from("platform_user_audit_events").insert({
    actor_auth_user_id: payload.actorAuthUserId,
    target_platform_user_id: payload.targetPlatformUserId,
    target_auth_user_id: payload.targetAuthUserId,
    group_id: payload.groupId,
    organization_id: payload.organizationId,
    action: payload.action,
    previous_values: payload.previousValues,
    new_values: payload.newValues,
  });
  if (error) throw new HttpError(500, "Não foi possível registrar a auditoria do usuário.");
}

function mapOperator(
  actor: PlatformUserRow,
  visibleGroups: Array<{ id: string; name: string }>,
) {
  const groupName = actor.group_id ? visibleGroups.find((group) => group.id === actor.group_id)?.name ?? null : null;
  return {
    id: actor.id,
    authUserId: actor.auth_user_id,
    fullName: actor.full_name,
    username: actor.username,
    email: actor.email,
    status: actor.status,
    profile: actor.access_profile,
    groupId: actor.group_id,
    groupName,
    mustChangePassword: actor.must_change_password,
  };
}

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

function createUserClient(request: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    readPublishableKey(),
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    },
  );
}

async function requireAuthUser(userClient: ReturnType<typeof createUserClient>) {
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Sessão inválida.");
  return data.user;
}

function readPublishableKey() {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (!legacy) throw new HttpError(500, "Publishable key ausente no ambiente da função.");
  return legacy;
}

function readSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default as string;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new HttpError(500, "Secret key ausente no ambiente da função.");
  return legacy;
}

async function selectRows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new HttpError(400, error.message);
  return data ?? [];
}

function normalizeUsername(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function validateUsername(username: string) {
  if (username.length < 3 || username.length > 32) throw new HttpError(400, "O username deve ter entre 3 e 32 caracteres.");
  if (username.includes(" ")) throw new HttpError(400, "O username não pode conter espaços.");
  if (!/^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(username)) {
    throw new HttpError(400, "Use apenas letras, números, ponto, hífen e underscore no username.");
  }
  if (["admin", "api", "help", "owner", "prisma", "root", "security", "support", "system", "superadmin"].includes(username)) {
    throw new HttpError(400, "O username informado é reservado pelo sistema.");
  }
}

function validatePassword(password: string, username: string) {
  if (password.length < PASSWORD_MIN_LENGTH) throw new HttpError(400, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  if (!/[A-Z]/.test(password)) throw new HttpError(400, "A senha precisa conter letra maiúscula.");
  if (!/[a-z]/.test(password)) throw new HttpError(400, "A senha precisa conter letra minúscula.");
  if (!/\d/.test(password)) throw new HttpError(400, "A senha precisa conter número.");
  if (!/[^A-Za-z0-9]/.test(password)) throw new HttpError(400, "A senha precisa conter caractere especial.");
  if (normalizeUsername(password) === username) throw new HttpError(400, "A senha não pode ser igual ao username.");
}

function normalizePhoneInput(countryIso2: string, nationalNumberInput: string) {
  const countries = new Map([
    ["BR", { label: "Brasil", callingCode: "+55", min: 10, max: 11 }],
    ["AR", { label: "Argentina", callingCode: "+54", min: 10, max: 11 }],
    ["CL", { label: "Chile", callingCode: "+56", min: 9, max: 9 }],
    ["CO", { label: "Colômbia", callingCode: "+57", min: 10, max: 10 }],
    ["DE", { label: "Alemanha", callingCode: "+49", min: 10, max: 13 }],
    ["ES", { label: "Espanha", callingCode: "+34", min: 9, max: 9 }],
    ["FR", { label: "França", callingCode: "+33", min: 9, max: 9 }],
    ["GB", { label: "Reino Unido", callingCode: "+44", min: 10, max: 10 }],
    ["IT", { label: "Itália", callingCode: "+39", min: 9, max: 10 }],
    ["JP", { label: "Japão", callingCode: "+81", min: 10, max: 11 }],
    ["MX", { label: "México", callingCode: "+52", min: 10, max: 10 }],
    ["PT", { label: "Portugal", callingCode: "+351", min: 9, max: 9 }],
    ["PY", { label: "Paraguai", callingCode: "+595", min: 9, max: 9 }],
    ["UY", { label: "Uruguai", callingCode: "+598", min: 8, max: 9 }],
    ["US", { label: "Estados Unidos", callingCode: "+1", min: 10, max: 10 }],
  ]);
  const country = countries.get(String(countryIso2 ?? "").trim().toUpperCase());
  if (!country) throw new HttpError(400, "País não suportado pelo formulário atual.");
  const nationalNumber = String(nationalNumberInput ?? "").replace(/\D/g, "");
  if (!nationalNumber) throw new HttpError(400, "O celular é obrigatório.");
  if (nationalNumber.length < country.min || nationalNumber.length > country.max) {
    throw new HttpError(400, `O celular deve ter entre ${country.min} e ${country.max} dígitos para ${country.label}.`);
  }
  return {
    countryIso2: String(countryIso2).trim().toUpperCase(),
    countryLabel: country.label,
    callingCode: country.callingCode,
    nationalNumber,
    e164: `${country.callingCode}${nationalNumber}`,
  };
}

function accessProfileRank(profile: MembershipRole) {
  if (profile === "super_admin") return 5;
  if (profile === "owner") return 4;
  if (profile === "admin") return 3;
  if (profile === "recruiter") return 3;
  return 1;
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}
