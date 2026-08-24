import { useEffect, useMemo, useState } from "react";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Breadcrumb, Button, Empty, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { GroupScopeOption, PlatformOperator, PlatformUserListItem, PlatformUserQuery } from "../domain/platformUsersData";
import { platformUsersService } from "../infrastructure/supabase/platformUsersService";
import {
  describePlatformAccessProfile,
  describePlatformUserStatus,
  PLATFORM_ACCESS_PROFILES,
  PLATFORM_USER_STATUSES,
  type PlatformAccessProfile,
  type PlatformUserStatus,
} from "../shared/platformUsers";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface UsersPageProps {
  onNavigate: (path: string) => void;
}

const initialQuery: PlatformUserQuery = {
  search: "",
  status: "all",
  profile: "all",
  groupId: "all",
  organizationId: "all",
};

export function UsersPage({ onNavigate }: UsersPageProps) {
  const [query, setQuery] = useState<PlatformUserQuery>(initialQuery);
  const [users, setUsers] = useState<PlatformUserListItem[]>([]);
  const [groups, setGroups] = useState<GroupScopeOption[]>([]);
  const [currentOperator, setCurrentOperator] = useState<PlatformOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void platformUsersService.loadBootstrapData(query)
      .then((data) => {
        if (!current) return;
        setUsers(data.users);
        setGroups(data.groups);
        setCurrentOperator(data.currentOperator);
      })
      .catch(() => {
        if (current) setError("Não foi possível consultar os usuários dentro da sua autoridade atual.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [query]);

  const organizationOptions = useMemo(
    () => groups.flatMap((group) => group.organizations),
    [groups],
  );

  const columns = useMemo<ColumnsType<PlatformUserListItem>>(
    () => [
      {
        dataIndex: "fullName",
        key: "fullName",
        title: "Usuário",
        render: (_, row) => (
          <div className="prisma-users-cell-primary">
            <strong>{row.fullName}</strong>
            <small>{row.username}</small>
          </div>
        ),
      },
      {
        dataIndex: "profile",
        key: "profile",
        title: "Perfil",
        render: (value: PlatformAccessProfile) => <Tag color="blue">{describePlatformAccessProfile(value)}</Tag>,
      },
      {
        dataIndex: "groupName",
        key: "groupName",
        title: "Grupo",
        render: (value: string | null) => value ?? "Plataforma inteira",
      },
      {
        dataIndex: "allowedOrganizations",
        key: "allowedOrganizations",
        title: "Empresas permitidas",
        render: (organizations: PlatformUserListItem["allowedOrganizations"], row) =>
          row.profile === "super_admin"
            ? "Todas as empresas"
            : organizations.length > 0
              ? organizations.map((organization) => organization.name).join(", ")
              : "Nenhuma empresa derivada",
      },
      {
        dataIndex: "status",
        key: "status",
        title: "Status",
        render: (value: PlatformUserStatus) => (
          <Tag color={value === "active" ? "green" : value === "inactive" ? "default" : "orange"}>
            {describePlatformUserStatus(value)}
          </Tag>
        ),
      },
      {
        key: "actions",
        title: "",
        render: (_, row) => (
          <Button type="link" onClick={() => onNavigate(`/users/${row.id}`)}>
            Editar
          </Button>
        ),
      },
    ],
    [onNavigate],
  );

  return (
    <PrismaPage>
      <PrismaPageHeader
        title="Usuários"
        description="Gestão de operadores da plataforma dentro da autoridade efetiva do perfil atual."
        breadcrumbs={<Breadcrumb items={[{ title: "Usuários" }, { title: "Gestão" }]} />}
        actions={(
          <Button icon={<PlusOutlined />} onClick={() => onNavigate("/users/new")} type="primary">
            Novo usuário
          </Button>
        )}
        extras={currentOperator ? <Alert banner message={`Operador atual: ${currentOperator.fullName} (${describePlatformAccessProfile(currentOperator.profile)})`} type="info" /> : undefined}
      />
      {error ? <Alert className="prisma-shell-alert" message={error} showIcon type="error" /> : null}
      <PrismaCard className="prisma-users-toolbar">
        <Input
          allowClear
          onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value }))}
          placeholder="Buscar por nome ou username"
          prefix={<SearchOutlined />}
          value={query.search}
        />
        <Space wrap>
          <Select
            aria-label="Filtrar por status"
            onChange={(value: PlatformUserQuery["status"]) => setQuery((current) => ({ ...current, status: value }))}
            options={[
              { label: "Todos os status", value: "all" },
              ...PLATFORM_USER_STATUSES.map((status) => ({ label: describePlatformUserStatus(status), value: status })),
            ]}
            value={query.status}
          />
          <Select
            aria-label="Filtrar por perfil"
            onChange={(value: PlatformUserQuery["profile"]) => setQuery((current) => ({ ...current, profile: value }))}
            options={[
              { label: "Todos os perfis", value: "all" },
              ...PLATFORM_ACCESS_PROFILES.map((profile) => ({ label: describePlatformAccessProfile(profile), value: profile })),
            ]}
            value={query.profile}
          />
          <Select
            aria-label="Filtrar por grupo"
            onChange={(value: PlatformUserQuery["groupId"]) => setQuery((current) => ({ ...current, groupId: value }))}
            options={[
              { label: "Todos os grupos", value: "all" },
              ...groups.map((group) => ({ label: group.name, value: group.id })),
            ]}
            value={query.groupId}
          />
          <Select
            aria-label="Filtrar por empresa"
            onChange={(value: PlatformUserQuery["organizationId"]) => setQuery((current) => ({ ...current, organizationId: value }))}
            options={[
              { label: "Todas as empresas", value: "all" },
              ...organizationOptions.map((organization) => ({ label: organization.name, value: organization.id })),
            ]}
            value={query.organizationId}
          />
        </Space>
      </PrismaCard>
      <PrismaCard className="prisma-users-table-card">
        {users.length === 0 && !loading ? (
          <Empty description="Nenhum usuário corresponde aos filtros atuais." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            rowKey="id"
          />
        )}
      </PrismaCard>
    </PrismaPage>
  );
}
