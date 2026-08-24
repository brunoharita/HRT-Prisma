import { createClient } from "npm:@supabase/supabase-js@2.112.3";

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
    .select("id, auth_user_id, full_name, username, email, access_profile, group_id, status")
    .order("full_name", { ascending: true });

  if (actorContext.actor.access_profile !== "super_admin" && actorContext.actor.group_id) {
    usersQuery = usersQuery.eq("group_id", actorContext.actor.group_id);
  }

  const users = await selectRows<PlatformUserRow>(usersQuery);
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

  const [user] = await selectRows<PlatformUserRow>(
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
  origin: string,
) {
  const normalized = await normalizeAndValidateInput(serviceClient, actorContext, input);
  if (normalized.credentialMode === "activation_link" && normalized.status !== "active") {
    throw new HttpError(400, "Ative o usuário antes de iniciar o primeiro acesso por e-mail.");
  }

  let authUserId: string;
  if (normalized.credentialMode === "manual_password") {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: normalized.email,
      email_confirm: true,
      password: normalized.password,
      user_metadata: { full_name: normalized.fullName },
    });
    if (error || !data.user) throw new HttpError(400, "Não foi possível criar o usuário no Supabase Auth.");
    authUserId = data.user.id;
  } else {
    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(normalized.email, {
      redirectTo: `${origin}/change-password`,
      data: { full_name: normalized.fullName },
    });
    if (error || !data.user) throw new HttpError(400, "Não foi possível iniciar o primeiro acesso por e-mail.");
    authUserId = data.user.id;
  }

  const platformStatus: PlatformUserStatus = normalized.credentialMode === "activation_link"
    ? "pending_first_access"
    : normalized.status;
  const mustChangePassword = normalized.credentialMode === "activation_link";

  const { data: insertedRows, error: insertError } = await serviceClient
    .from("platform_users")
    .insert({
      auth_user_id: authUserId,
      full_name: normalized.fullName,
      username: normalized.username,
      email: normalized.email,
      phone_e164: normalized.phone.e164,
      phone_country_iso2: normalized.phone.countryIso2,
      phone_country_label: normalized.phone.countryLabel,
      phone_country_code: normalized.phone.callingCode,
      phone_national_number: normalized.phone.nationalNumber,
      access_profile: normalized.profile,
      group_id: normalized.groupId,
      status: platformStatus,
      credential_mode: normalized.credentialMode,
      must_change_password: mustChangePassword,
    })
    .select("id");
  if (insertError || !insertedRows?.[0]) throw new HttpError(400, "Não foi possível persistir o operador do Prisma.");

  await rewriteOrganizationMemberships(
    serviceClient,
    authUserId,
    normalized.profile,
    normalized.groupId,
    normalized.organizationIds,
  );
  await recordAuditEvent(serviceClient, {
    actorAuthUserId: actorContext.actor.auth_user_id,
    targetPlatformUserId: insertedRows[0].id,
    targetAuthUserId: authUserId,
    groupId: normalized.groupId,
    organizationId: normalized.organizationIds[0] ?? null,
    action: "user_created",
    previousValues: {},
    newValues: {
      full_name: normalized.fullName,
      username: normalized.username,
      email: normalized.email,
      access_profile: normalized.profile,
      group_id: normalized.groupId,
      status: platformStatus,
      organization_ids: normalized.organizationIds,
      credential_mode: normalized.credentialMode,
    },
  });
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
    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(existing.auth_user_id, {
      email: normalized.email,
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

  const { error: updateError } = await serviceClient
    .from("platform_users")
    .update({
      full_name: normalized.fullName,
      username: normalized.username,
      email: normalized.email,
      phone_e164: normalized.phone.e164,
      phone_country_iso2: normalized.phone.countryIso2,
      phone_country_label: normalized.phone.countryLabel,
      phone_country_code: normalized.phone.callingCode,
      phone_national_number: normalized.phone.nationalNumber,
      access_profile: normalized.profile,
      group_id: normalized.groupId,
      status: normalized.status,
    })
    .eq("id", existing.id);
  if (updateError) throw new HttpError(400, "Não foi possível atualizar o usuário do Prisma.");

  await rewriteOrganizationMemberships(
    serviceClient,
    existing.auth_user_id,
    normalized.profile,
    normalized.groupId,
    normalized.organizationIds,
  );
  await recordAuditEvent(serviceClient, {
    actorAuthUserId: actorContext.actor.auth_user_id,
    targetPlatformUserId: existing.id,
    targetAuthUserId: existing.auth_user_id,
    groupId: normalized.groupId,
    organizationId: normalized.organizationIds[0] ?? null,
    action: "user_updated",
    previousValues: {
      full_name: existing.full_name,
      username: existing.username,
      email: existing.email,
      access_profile: existing.access_profile,
      group_id: existing.group_id,
      status: existing.status,
    },
    newValues: {
      full_name: normalized.fullName,
      username: normalized.username,
      email: normalized.email,
      access_profile: normalized.profile,
      group_id: normalized.groupId,
      status: normalized.status,
      organization_ids: normalized.organizationIds,
    },
  });
}

async function requestAdminPasswordReset(
  serviceClient: ReturnType<typeof createServiceClient>,
  actorContext: ActorContext,
  targetUserId: string,
  origin: string,
) {
  const targetUser = await readVisibleTargetUser(serviceClient, actorContext, targetUserId);
  const [targetRow] = await selectRows<PlatformUserRow>(
    serviceClient
      .from("platform_users")
      .select("*")
      .eq("id", targetUserId),
  );
  if (!targetRow) throw new HttpError(404, "Usuário não encontrado.");

  const publishableClient = createPublishableClient();
  const { error: resetError } = await publishableClient.auth.resetPasswordForEmail(targetUser.email, {
    redirectTo: `${origin}/change-password`,
  });
  if (resetError) throw new HttpError(400, "Não foi possível iniciar a redefinição de senha.");

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
  const [currentUser] = await selectRows<PlatformUserRow>(
    serviceClient
      .from("platform_users")
      .select("*")
      .eq("auth_user_id", authUserId),
  );
  if (!currentUser) throw new HttpError(404, "Operador não encontrado.");

  const nextStatus: PlatformUserStatus = currentUser.status === "pending_first_access" ? "active" : currentUser.status;
  const { error } = await serviceClient
    .from("platform_users")
    .update({
      must_change_password: false,
      status: nextStatus,
      first_access_completed_at: new Date().toISOString(),
    })
    .eq("id", currentUser.id);
  if (error) throw new HttpError(400, "Não foi possível concluir o primeiro acesso.");

  await recordAuditEvent(serviceClient, {
    actorAuthUserId: currentUser.auth_user_id,
    targetPlatformUserId: currentUser.id,
    targetAuthUserId: currentUser.auth_user_id,
    groupId: currentUser.group_id,
    organizationId: null,
    action: "first_access_completed",
    previousValues: {
      must_change_password: currentUser.must_change_password,
      status: currentUser.status,
    },
    newValues: {
      must_change_password: false,
      status: nextStatus,
    },
  });
}

async function rewriteOrganizationMemberships(
  serviceClient: ReturnType<typeof createServiceClient>,
  authUserId: string,
  profile: MembershipRole,
  groupId: string | null,
  organizationIds: string[],
) {
  const { error: deleteError } = await serviceClient
    .from("organization_memberships")
    .delete()
    .eq("user_id", authUserId);
  if (deleteError) throw new HttpError(400, "Não foi possível reescrever o escopo de empresas do usuário.");

  if (profile === "super_admin") return;
  if (profile === "owner") {
    if (!groupId) throw new HttpError(400, "Owner precisa de um grupo válido.");
    const ownerOrganizations = await selectRows<OrganizationRow>(
      serviceClient
        .from("organizations")
        .select("id, name, group_id")
        .eq("group_id", groupId),
    );
    if (ownerOrganizations.length === 0) throw new HttpError(400, "O grupo informado não possui empresas para derivar o escopo.");
    const { error: insertOwnerError } = await serviceClient
      .from("organization_memberships")
      .insert(
        ownerOrganizations.map((organization) => ({
          organization_id: organization.id,
          user_id: authUserId,
          role: "owner" as const,
        })),
      );
    if (insertOwnerError) throw new HttpError(400, "Não foi possível derivar as empresas do Owner.");
    return;
  }
  if (organizationIds.length === 0) throw new HttpError(400, "Nenhuma empresa válida foi informada para o perfil selecionado.");

  const { error: insertError } = await serviceClient
    .from("organization_memberships")
    .insert(
      organizationIds.map((organizationId) => ({
        organization_id: organizationId,
        user_id: authUserId,
        role: profile,
      })),
    );
  if (insertError) throw new HttpError(400, "Não foi possível gravar as empresas permitidas do usuário.");
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
  const profile = input.profile;
  const groupId = input.groupId;
  const credentialMode = input.credentialMode;
  const status: PlatformUserStatus = input.status === "inactive" ? "inactive" : "active";

  if (!fullName) throw new HttpError(400, "Nome completo é obrigatório.");
  validateUsername(username);
  if (!email || !email.includes("@")) throw new HttpError(400, "E-mail inválido.");
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

  const [emailConflict] = await selectRows<Pick<PlatformUserRow, "id">>(
    serviceClient
      .from("platform_users")
      .select("id")
      .ilike("email", email)
      .neq("id", currentUserId ?? "00000000-0000-0000-0000-000000000000")
      .limit(1),
  );
  if (emailConflict) throw new HttpError(409, "O e-mail informado já está em uso.");

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
  if (profile === "member" && deduplicated.length !== 1) {
    throw new HttpError(400, "Member deve receber exatamente uma empresa.");
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
  if (!["super_admin", "owner", "admin"].includes(actor.access_profile)) {
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
  if (password.length < 12) throw new HttpError(400, "A senha deve ter pelo menos 12 caracteres.");
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
  if (profile === "recruiter") return 2;
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
