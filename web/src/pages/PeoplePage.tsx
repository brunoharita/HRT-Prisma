import { useDeferredValue, useEffect, useState } from "react";
import { FileAddOutlined, FileSearchOutlined, FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Skeleton, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PersonWorkspaceSummary } from "../domain/personIngestion";
import type { PrismaDataRepository } from "../domain/prismaData";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PeoplePageProps {
  activeMembership: OrganizationMembership;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function PeoplePage({ activeMembership, onNavigate }: PeoplePageProps) {
  const canManagePeople = activeMembership.role !== "member";
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [people, setPeople] = useState<PersonWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void personIngestionService.listPeople(activeMembership.organizationId, deferredSearch, canManagePeople)
      .then((result) => { if (current) setPeople(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível consultar Pessoas."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, canManagePeople, deferredSearch]);

  const personPath = (personId: string) => canManagePeople ? `/profiles/${personId}/edit` : `/profiles/${personId}`;

  const columns: ColumnsType<PersonWorkspaceSummary> = [
    {
      title: "Nome",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (left, right) => left.fullName.localeCompare(right.fullName),
      render: (name: string, person) => (
        <button className="prisma-person-name-button" onClick={() => onNavigate(personPath(person.id))} type="button">
          <span className="prisma-person-avatar" aria-hidden="true">{initials(name)}</span>
          <strong>{name}</strong>
        </button>
      ),
    },
    { title: "E-mail", key: "email", render: (_, person) => person.privateData.email || <span className="prisma-muted">Não informado</span> },
    { title: "Celular", key: "phone", render: (_, person) => formatPhone(person) },
    { title: "Origem mais recente", key: "source", render: (_, person) => describeSource(person.latestSourceType) },
    { title: "Última atualização", dataIndex: "updatedAt", key: "updatedAt", render: (value: string) => formatDateTime(value) },
    { title: "Status", dataIndex: "profileState", key: "profileState", render: (state: PersonWorkspaceSummary["profileState"]) => <ProfileStateTag state={state} /> },
  ];

  return (
    <PrismaPage className="prisma-m2b-page">
      <PrismaPageHeader
        title="Pessoas"
        description={`Gerencie os registros de pessoas da organização ${activeMembership.organizationName}.`}
        actions={canManagePeople ? (
          <Space wrap>
            <Button icon={<FileSearchOutlined />} onClick={() => onNavigate("/profiles/processes")}>Processamento e revisões</Button>
            <Button icon={<PlusOutlined />} onClick={() => onNavigate("/profiles/new")}>Cadastrar pessoa</Button>
            <Button icon={<FileAddOutlined />} onClick={() => onNavigate("/profiles/import")} type="primary">Importar currículo</Button>
          </Space>
        ) : undefined}
      />
      <PrismaCard className="prisma-people-toolbar prisma-m2b-toolbar">
        <Input
          allowClear
          aria-label="Buscar por nome, e-mail ou telefone"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone..."
          prefix={<SearchOutlined />}
          value={search}
        />
        <Space>
          <Button disabled icon={<FilterOutlined />}>Filtros</Button>
          <Button disabled>Mais filtros</Button>
        </Space>
      </PrismaCard>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <PrismaCard className="prisma-people-table-card">
        {loading ? <Skeleton active paragraph={{ rows: 7 }} /> : (
          <Table
            columns={columns}
            dataSource={people}
            locale={{ emptyText: <Empty description="Nenhuma Pessoa encontrada nesta empresa." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}` }}
            rowKey="id"
            scroll={{ x: 980 }}
            size="middle"
            onRow={(person) => ({ onDoubleClick: () => onNavigate(personPath(person.id)) })}
          />
        )}
      </PrismaCard>
      <Typography.Text className="prisma-table-scope-note" type="secondary">
        A busca e a tabela respeitam a empresa ativa e as políticas RLS do Prisma.
      </Typography.Text>
    </PrismaPage>
  );
}

export function ProfileStateTag({ state }: { state: PersonWorkspaceSummary["profileState"] }) {
  if (state === "generated") return <Tag color="green">Perfil gerado</Tag>;
  if (state === "building") return <Tag color="blue">Em construção</Tag>;
  if (state === "requires_attention") return <Tag color="orange">Requer atenção</Tag>;
  if (state === "processing_failed") return <Tag color="red">Falha de processamento</Tag>;
  return <Tag>Pendente</Tag>;
}

function describeSource(source: PersonWorkspaceSummary["latestSourceType"]): string {
  if (source === "manual_text") return "Texto manual";
  if (source === "resume_pdf") return "Currículo PDF";
  return "A definir";
}

function formatPhone(person: PersonWorkspaceSummary): string {
  const { phoneCountryCode, phoneNationalNumber } = person.privateData;
  return [phoneCountryCode, phoneNationalNumber].filter(Boolean).join(" ") || "Não informado";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
