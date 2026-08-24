import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Form,
  Input,
  Radio,
  Select,
  Segmented,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  InfoCircleOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { GroupScopeOption, PlatformUserListItem, PlatformUserUpsertInput } from "../domain/platformUsersData";
import type { PlatformOperator } from "../domain/platformUsersData";
import { platformUsersService } from "../infrastructure/supabase/platformUsersService";
import {
  buildPasswordRequirementState,
  COUNTRY_PHONE_OPTIONS,
  describePlatformAccessProfile,
  getCountryPhoneOption,
  isPasswordPolicySatisfied,
  normalizePhoneInput,
  normalizeUsername,
  type CredentialDeliveryMode,
  type PlatformAccessProfile,
} from "../shared/platformUsers";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface UserFormPageProps {
  mode: "create" | "edit";
  userId?: string;
  onNavigate: (path: string) => void;
}

interface UserFormValues {
  fullName: string;
  username: string;
  email: string;
  phoneCountryIso2: string;
  phoneNationalNumber: string;
  status: "active" | "inactive";
  profile: PlatformAccessProfile;
  groupId: string | null;
  organizationIds: string[];
  credentialMode: CredentialDeliveryMode;
  password: string;
  passwordConfirmation: string;
}

const defaultValues: UserFormValues = {
  fullName: "",
  username: "",
  email: "",
  phoneCountryIso2: "BR",
  phoneNationalNumber: "",
  status: "active",
  profile: "recruiter",
  groupId: null,
  organizationIds: [],
  credentialMode: "manual_password",
  password: "",
  passwordConfirmation: "",
};

export function UserFormPage({ mode, userId, onNavigate }: UserFormPageProps) {
  const [form] = Form.useForm<UserFormValues>();
  const [groups, setGroups] = useState<GroupScopeOption[]>([]);
  const [currentOperator, setCurrentOperator] = useState<PlatformOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loadedUser, setLoadedUser] = useState<PlatformUserListItem | null>(null);
  const [profile, setProfile] = useState<PlatformAccessProfile>(defaultValues.profile);
  const [groupId, setGroupId] = useState<string | null>(defaultValues.groupId);
  const [credentialMode, setCredentialMode] = useState<CredentialDeliveryMode>(defaultValues.credentialMode);
  const [status, setStatus] = useState<"active" | "inactive">(defaultValues.status);
  const watchedPassword = Form.useWatch("password", form) ?? "";
  const watchedPasswordConfirmation = Form.useWatch("passwordConfirmation", form) ?? "";
  const watchedUsername = Form.useWatch("username", form) ?? "";

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    setInfo(null);

    void platformUsersService.loadBootstrapData({
      search: "",
      status: "all",
      profile: "all",
      groupId: "all",
      organizationId: "all",
    })
      .then(async (bootstrap) => {
        if (!current) return;
        setGroups(bootstrap.groups);
        setCurrentOperator(bootstrap.currentOperator);

        if (mode === "edit" && userId) {
          const user = await platformUsersService.loadUser(userId);
          if (!current) return;
          setLoadedUser(user);
          const country = getCountryPhoneOption(user.phoneCountryIso2 ?? "BR");
          form.setFieldsValue({
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            phoneCountryIso2: country?.iso2 ?? "BR",
            phoneNationalNumber: user.phoneNationalNumber ?? "",
            status: user.status === "inactive" ? "inactive" : "active",
            profile: user.profile,
            groupId: user.groupId,
            organizationIds: user.allowedOrganizations.map((organization) => organization.id),
            credentialMode: "activation_link",
            password: "",
            passwordConfirmation: "",
          });
          setProfile(user.profile);
          setGroupId(user.groupId);
          setCredentialMode("activation_link");
          setStatus(user.status === "inactive" ? "inactive" : "active");
        } else {
          form.setFieldsValue(defaultValues);
          setProfile(defaultValues.profile);
          setGroupId(defaultValues.groupId);
          setCredentialMode(defaultValues.credentialMode);
          setStatus(defaultValues.status);
          setLoadedUser(null);
        }
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar o contexto de gestão de usuários.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [form, mode, userId]);

  const visibleProfileOptions = useMemo(() => {
    const options: PlatformAccessProfile[] = ["owner", "admin", "recruiter", "member"];
    return currentOperator?.profile === "super_admin"
      ? (["super_admin", ...options] as PlatformAccessProfile[])
      : options;
  }, [currentOperator?.profile]);

  const selectedGroup = groups.find((item) => item.id === groupId) ?? null;
  const availableOrganizations = selectedGroup?.organizations ?? [];
  const passwordState = buildPasswordRequirementState(
    watchedPassword,
    watchedPasswordConfirmation,
    watchedUsername,
  );

  useEffect(() => {
    if (profile === "super_admin") {
      setGroupId(null);
      form.setFieldValue("groupId", null);
      form.setFieldValue("organizationIds", []);
      return;
    }

    if (profile === "member") {
      const currentOrganizations = (form.getFieldValue("organizationIds") ?? []) as string[];
      form.setFieldValue("organizationIds", currentOrganizations.slice(0, 1));
    }

    if (profile === "owner" && selectedGroup) {
      form.setFieldValue(
        "organizationIds",
        selectedGroup.organizations.map((organization) => organization.id),
      );
    }
  }, [form, profile, selectedGroup]);

  const handleSubmit = async (values: UserFormValues) => {
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const normalizedPhone = normalizePhoneInput(values.phoneCountryIso2, values.phoneNationalNumber);
    if (!normalizedPhone.value) {
      setSubmitting(false);
      setError(normalizedPhone.error ?? "Não foi possível validar o celular informado.");
      return;
    }

    if (mode === "create" && values.credentialMode === "manual_password" && !isPasswordPolicySatisfied(passwordState)) {
      setSubmitting(false);
      setError("A senha manual ainda não atende ao padrão mínimo definido para operadores do Prisma.");
      return;
    }

    const organizationIds = normalizeOrganizationScope(values.profile, values.organizationIds, selectedGroup);
    const payload: PlatformUserUpsertInput = {
      fullName: values.fullName.trim(),
      username: normalizeUsername(values.username),
      email: values.email.trim(),
      status: values.status,
      profile: values.profile,
      groupId: values.profile === "super_admin" ? null : values.groupId,
      organizationIds,
      phoneCountryIso2: normalizedPhone.value.countryIso2,
      phoneNationalNumber: normalizedPhone.value.nationalNumber,
      credentialMode: mode === "edit" ? "activation_link" : values.credentialMode,
      password: mode === "create" && values.credentialMode === "manual_password" ? values.password : undefined,
      passwordConfirmation: mode === "create" && values.credentialMode === "manual_password"
        ? values.passwordConfirmation
        : undefined,
    };

    try {
      if (mode === "create") {
        await platformUsersService.createUser(payload);
        setInfo("Usuário criado com sucesso.");
      } else if (userId) {
        await platformUsersService.updateUser(userId, payload);
        setInfo("Usuário atualizado com sucesso.");
      }
      onNavigate("/users");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "A gravação do usuário falhou.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!userId) return;
    setResettingPassword(true);
    setError(null);
    setInfo(null);
    try {
      await platformUsersService.requestAdminPasswordReset(userId);
      setInfo("A redefinição de senha foi enviada para o e-mail cadastrado.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Não foi possível iniciar a redefinição de senha.");
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 14 }} /></PrismaCard></PrismaPage>;
  }

  return (
    <PrismaPage>
      <PrismaPageHeader
        title={mode === "create" ? "Novo usuário" : "Editar usuário"}
        description="Cadastre um operador do Prisma. Usuário e Pessoa são registros distintos."
        breadcrumbs={(
          <Breadcrumb
            items={[
              { title: "Usuários" },
              { title: mode === "create" ? "Cadastro" : "Gestão" },
              { title: mode === "create" ? "Novo usuário" : loadedUser?.fullName ?? "Editar usuário" },
            ]}
          />
        )}
        actions={(
          <>
            <Button onClick={() => onNavigate("/users")}>Cancelar</Button>
            <Button loading={submitting} onClick={() => form.submit()} type="primary">
              {mode === "create" ? "Criar usuário" : "Salvar alterações"}
            </Button>
          </>
        )}
      />
      {error ? <Alert className="prisma-shell-alert" message={error} showIcon type="error" /> : null}
      {info ? <Alert className="prisma-shell-alert" message={info} showIcon type="success" /> : null}
      <Form<UserFormValues> form={form} initialValues={defaultValues} layout="vertical" onFinish={(values) => void handleSubmit(values)} requiredMark={false}>
        <PrismaCard className="prisma-user-form-card">
          <section className="prisma-user-form-section">
            <h2>Dados básicos</h2>
            <div className="prisma-user-form-grid prisma-user-form-grid-basic">
              <Form.Item label="Nome completo *" name="fullName" rules={[{ required: true, message: "Informe o nome completo." }]}>
                <Input prefix={<UserOutlined />} placeholder="João Carlos da Silva" />
              </Form.Item>
              <Form.Item
                label="Username *"
                name="username"
                normalize={(value: string) => normalizeUsername(value)}
                rules={[
                  { required: true, message: "Informe o username." },
                  {
                    validator: async (_, value) => {
                      const normalized = normalizeUsername(String(value ?? ""));
                      if (!normalized) throw new Error("Informe o username.");
                      if (!/^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(normalized)) {
                        throw new Error("Use apenas letras, números, ponto, hífen e underscore.");
                      }
                    },
                  },
                ]}
              >
                <Input placeholder="joao.silva" />
              </Form.Item>
              <Form.Item label="E-mail *" name="email" rules={[{ required: true, type: "email", message: "Informe um e-mail válido." }]}>
                <Input prefix={<MailOutlined />} placeholder="joao.silva@empresa.com" />
              </Form.Item>
              <Form.Item className="prisma-user-form-phone" label="Celular *" required>
                <Space.Compact block>
                  <Form.Item name="phoneCountryIso2" noStyle>
                    <Select
                      className="prisma-country-select"
                      optionFilterProp="label"
                      options={COUNTRY_PHONE_OPTIONS.map((country) => ({
                        label: `${country.callingCode} ${country.label}`,
                        value: country.iso2,
                      }))}
                      showSearch
                    />
                  </Form.Item>
                  <Form.Item name="phoneNationalNumber" noStyle rules={[{ required: true, message: "Informe o celular." }]}>
                    <Input placeholder="(14) 99999-9999" prefix={<PhoneOutlined />} />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
              <Form.Item className="prisma-user-form-status" label="Status">
                <Segmented
                  block
                  onChange={(value) => {
                    const nextValue = value as "active" | "inactive";
                    setStatus(nextValue);
                    form.setFieldValue("status", nextValue);
                  }}
                  options={[
                    { label: "Ativo", value: "active" },
                    { label: "Inativo", value: "inactive" },
                  ]}
                  value={status}
                />
              </Form.Item>
            </div>
          </section>

          <section className="prisma-user-form-section">
            <h2>Acesso e permissões</h2>
            <div className="prisma-user-form-grid prisma-user-form-grid-access">
              <Form.Item label="Perfil de acesso *" name="profile" rules={[{ required: true, message: "Selecione o perfil." }]}>
                <Select
                  onChange={(value: PlatformAccessProfile) => {
                    setProfile(value);
                    form.setFieldValue("profile", value);
                  }}
                  options={visibleProfileOptions.map((value) => ({
                    label: describePlatformAccessProfile(value),
                    value,
                  }))}
                  value={profile}
                />
              </Form.Item>
              <Form.Item
                label="Escopo do grupo *"
                name="groupId"
                rules={profile === "super_admin" ? [] : [{ required: true, message: "Selecione o grupo." }]}
              >
                <Select
                  allowClear={profile !== "super_admin"}
                  disabled={profile === "super_admin"}
                  onChange={(value: string | null) => {
                    setGroupId(value);
                    form.setFieldValue("groupId", value);
                    form.setFieldValue("organizationIds", []);
                  }}
                  options={groups.map((group) => ({ label: group.name, value: group.id }))}
                  placeholder={profile === "super_admin" ? "Autoridade global" : "Selecione um grupo"}
                  value={groupId}
                />
              </Form.Item>
              <Form.Item
                label="Empresas permitidas *"
                name="organizationIds"
                rules={[
                  {
                    validator: async (_, value) => {
                      const selected = Array.isArray(value) ? value : [];
                      if (profile === "super_admin") return;
                      if (profile === "owner" && selectedGroup && selected.length === selectedGroup.organizations.length) return;
                      if (profile === "member" && selected.length === 1) return;
                      if ((profile === "admin" || profile === "recruiter") && selected.length >= 1) return;
                      throw new Error("A seleção de empresas não atende ao perfil escolhido.");
                    },
                  },
                ]}
              >
                <Select
                  disabled={!selectedGroup || profile === "super_admin" || profile === "owner"}
                  mode="multiple"
                  options={availableOrganizations.map((organization) => ({
                    label: organization.name,
                    value: organization.id,
                  }))}
                  placeholder={describeOrganizationPlaceholder(profile, selectedGroup)}
                />
              </Form.Item>
            </div>
            <Typography.Paragraph className="prisma-user-form-help">
              O perfil define o que o usuário pode fazer. O escopo define onde ele pode atuar.
            </Typography.Paragraph>
          </section>

          <section className="prisma-user-form-section">
            <h2>Senha e segurança</h2>
            {mode === "create" ? (
              <>
                <Form.Item label={null} name="credentialMode">
                  <Radio.Group
                    onChange={(event) => {
                      const nextMode = event.target.value as CredentialDeliveryMode;
                      setCredentialMode(nextMode);
                      form.setFieldValue("credentialMode", nextMode);
                    }}
                    value={credentialMode}
                  >
                    <Space direction="vertical">
                      <Radio value="manual_password">Definir senha manualmente</Radio>
                      <Radio value="activation_link">Gerar senha automaticamente e enviar para o e-mail cadastrado</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
                <div className="prisma-user-password-layout">
                  <div className="prisma-user-password-fields">
                    <Form.Item
                      label="Senha *"
                      name="password"
                      rules={credentialMode === "manual_password"
                        ? [{ required: true, message: "Informe a senha." }]
                        : []}
                    >
                      <Input.Password autoComplete="new-password" disabled={credentialMode !== "manual_password"} />
                    </Form.Item>
                    <Form.Item
                      label="Confirmar senha *"
                      name="passwordConfirmation"
                      rules={credentialMode === "manual_password"
                        ? [{ required: true, message: "Confirme a senha." }]
                        : []}
                    >
                      <Input.Password autoComplete="new-password" disabled={credentialMode !== "manual_password"} />
                    </Form.Item>
                  </div>
                  <div className="prisma-user-password-checklist">
                    <h3>Requisitos mínimos</h3>
                    <ul>
                      <PasswordRuleItem satisfied={passwordState.minLength} text="Mínimo de 12 caracteres" />
                      <PasswordRuleItem satisfied={passwordState.uppercase} text="Letra maiúscula" />
                      <PasswordRuleItem satisfied={passwordState.lowercase} text="Letra minúscula" />
                      <PasswordRuleItem satisfied={passwordState.number} text="Número" />
                      <PasswordRuleItem satisfied={passwordState.symbol} text="Caractere especial" />
                      <PasswordRuleItem satisfied={passwordState.confirmationMatches} text="As senhas coincidem" />
                    </ul>
                  </div>
                  <Alert
                    className="prisma-user-password-info"
                    description="Se a senha for gerada automaticamente, ela será enviada por um fluxo seguro de ativação para o e-mail cadastrado e deverá ser alterada no primeiro acesso."
                    icon={<InfoCircleOutlined />}
                    message=""
                    showIcon
                    type="info"
                  />
                </div>
              </>
            ) : (
              <div className="prisma-user-password-layout is-edit">
                <Alert
                  description="A senha atual nunca é exibida. Para trocar a credencial, envie um fluxo auditável de redefinição ao e-mail cadastrado."
                  message="Redefinição segura"
                  showIcon
                  type="info"
                />
                <Button icon={<LockOutlined />} loading={resettingPassword} onClick={() => void handleAdminResetPassword()}>
                  Enviar redefinição de senha
                </Button>
              </div>
            )}
          </section>

          <section className="prisma-user-system-rules">
            <div className="prisma-user-system-rules-icon"><InfoCircleOutlined /></div>
            <ul>
              <li>Usuário opera o Prisma.</li>
              <li>Pessoa é um registro de informação e não possui acesso.</li>
              <li>Criar um Usuário não cria uma Pessoa automaticamente.</li>
            </ul>
          </section>
        </PrismaCard>
      </Form>
      <div className="prisma-user-form-footer-actions">
        <Button onClick={() => onNavigate("/users")}>Cancelar</Button>
        <Button loading={submitting} onClick={() => form.submit()} type="primary">
          {mode === "create" ? "Criar usuário" : "Salvar alterações"}
        </Button>
      </div>
    </PrismaPage>
  );
}

function normalizeOrganizationScope(
  profile: PlatformAccessProfile,
  organizationIds: string[],
  selectedGroup: GroupScopeOption | null,
): string[] {
  if (profile === "super_admin") return [];
  if (profile === "owner") return selectedGroup?.organizations.map((organization) => organization.id) ?? [];
  if (profile === "member") return organizationIds.slice(0, 1);
  return organizationIds;
}

function describeOrganizationPlaceholder(profile: PlatformAccessProfile, selectedGroup: GroupScopeOption | null): string {
  if (profile === "super_admin") return "Autoridade global";
  if (!selectedGroup) return "Selecione um grupo primeiro";
  if (profile === "owner") return "Todas as empresas do grupo serão atribuídas";
  if (profile === "member") return "Selecione exatamente uma empresa";
  return "Selecione uma ou mais empresas";
}

function PasswordRuleItem({ satisfied, text }: { satisfied: boolean; text: string }) {
  return <li className={satisfied ? "is-satisfied" : ""}>{text}</li>;
}
