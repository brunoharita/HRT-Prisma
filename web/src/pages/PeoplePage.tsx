import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Skeleton, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  currentProfileDescription,
  currentProfileLabel,
  presentDocument,
  type DocumentOperationalState,
} from "../domain/documentPresentation";
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

type ProfileFilter = "all" | "approved" | "without_profile";
type ImportFilter = "all" | DocumentOperationalState;

export function PeoplePage({ activeMembership, onNavigate }: PeoplePageProps) {
  const canManagePeople = activeMembership.role !== "member";
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [importFilter, setImportFilter] = useState<ImportFilter>("all");
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

  const personPath = (personId: string) => `/profiles/${personId}`;
  const filteredPeople = useMemo(() => people.filter((person) => {
    const matchesProfile = profileFilter === "all"
      || (profileFilter === "approved" && Boolean(person.currentProfile))
      || (profileFilter === "without_profile" && !person.currentProfile);
    const matchesImport = importFilter === "all" || presentDocument(person.latestDocument).state === importFilter;
    return matchesProfile && matchesImport;
  }), [importFilter, people, profileFilter]);
  const approvedProfiles = people.filter((person) => person.currentProfile).length;
  const awaitingReview = people.filter((person) => person.pendingReviewCount > 0).length;
  const importedToday = people.filter((person) => person.latestDocument && isToday(person.latestDocument.createdAt)).length;

  const columns: ColumnsType<PersonWorkspaceSummary> = [
    {
      title: "Pessoa",
      dataIndex: "fullName",
      key: "fullName",
      width: 320,
      sorter: (left, right) => left.fullName.localeCompare(right.fullName),
      render: (name: string, person) => (
        <button className="prisma-person-name-button prisma-person-primary-cell" onClick={() => onNavigate(personPath(person.id))} type="button">
          <span className="prisma-person-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="prisma-person-primary-copy">
            <strong>{name}</strong>
            <small>{person.privateData.email || activeMembership.organizationName}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Perfil atual",
      key: "currentProfile",
      width: 240,
      render: (_, person) => (
        <div className="prisma-person-state-cell">
          <Tag color={person.currentProfile ? "green" : "default"}>{currentProfileLabel(person.currentProfile)}</Tag>
          <small>{currentProfileDescription(person.currentProfile)}</small>
        </div>
      ),
    },
    {
      title: "Última importação",
      key: "latestDocument",
      width: 390,
      render: (_, person) => {
        const presentation = presentDocument(person.latestDocument);
        return (
          <div className="prisma-person-import-cell">
            <Tag color={documentTagColor(presentation.state)}>{presentation.label}</Tag>
            <strong>{person.latestDocument ? `Documento v${person.latestDocument.documentVersion} · ${formatRelativeDate(person.latestDocument.createdAt)}` : "Nenhum documento recente"}</strong>
            <small>{presentation.description} {presentation.requiresAction ? `Próximo passo: ${presentation.nextAction}.` : ""}</small>
          </div>
        );
      },
    },
    {
      title: "Ações",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, person) => <Button icon={<EyeOutlined />} onClick={() => onNavigate(personPath(person.id))}>Abrir</Button>,
    },
  ];

  return (
    <PrismaPage className="prisma-m2b-page prisma-people-page">
      <PrismaPageHeader
        title="Pessoas"
        description="Gerencie as pessoas e acompanhe, separadamente, o perfil vigente e as importações recentes."
        actions={canManagePeople ? (
          <Space wrap>
            <Button icon={<FileSearchOutlined />} onClick={() => onNavigate("/profiles/processes")}>Processamento e revisões</Button>
            <Button icon={<PlusOutlined />} onClick={() => onNavigate("/profiles/new")}>Cadastrar pessoa</Button>
            <Button icon={<FileAddOutlined />} onClick={() => onNavigate("/profiles/import")} type="primary">Importar currículo</Button>
          </Space>
        ) : undefined}
      />

      <div className="prisma-people-stats">
        <PeopleMetric icon={<TeamOutlined />} label="Pessoas" value={people.length} tone="neutral" />
        <PeopleMetric icon={<CheckCircleOutlined />} label="Com perfil aprovado" value={approvedProfiles} tone="success" />
        <PeopleMetric icon={<ClockCircleOutlined />} label="Aguardando revisão" value={awaitingReview} tone="review" />
        <PeopleMetric icon={<UploadOutlined />} label="Importações hoje" value={importedToday} tone="processing" />
      </div>

      <PrismaCard className="prisma-people-toolbar prisma-m2b-toolbar">
        <Input
          allowClear
          aria-label="Buscar por nome, e-mail ou organização"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou organização..."
          prefix={<SearchOutlined />}
          value={search}
        />
        <div className="prisma-people-filters">
          <Select<ProfileFilter>
            aria-label="Filtrar perfil atual"
            onChange={setProfileFilter}
            options={[
              { value: "all", label: "Todos os perfis" },
              { value: "approved", label: "Com perfil aprovado" },
              { value: "without_profile", label: "Sem perfil aprovado" },
            ]}
            value={profileFilter}
          />
          <Select<ImportFilter>
            aria-label="Filtrar importações"
            onChange={setImportFilter}
            options={[
              { value: "all", label: "Todas as importações" },
              { value: "requires_review", label: "Requer revisão" },
              { value: "technical_failure", label: "Falha técnica" },
              { value: "processed", label: "Processadas" },
              { value: "none", label: "Sem importação" },
              { value: "discarded", label: "Arquivadas" },
            ]}
            value={importFilter}
          />
          <Button disabled icon={<FilterOutlined />}>Mais filtros</Button>
        </div>
      </PrismaCard>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <PrismaCard className="prisma-people-table-card">
        {loading ? <Skeleton active paragraph={{ rows: 7 }} /> : (
          <Table
            columns={columns}
            dataSource={filteredPeople}
            locale={{ emptyText: <Empty description="Nenhuma Pessoa corresponde aos filtros." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}` }}
            rowKey="id"
            scroll={{ x: 1070 }}
            size="middle"
            tableLayout="fixed"
            onRow={(person) => ({ onDoubleClick: () => onNavigate(personPath(person.id)) })}
          />
        )}
      </PrismaCard>
      <Typography.Text className="prisma-table-scope-note" type="secondary">
        Perfil aprovado e importação são estados independentes. A busca respeita a empresa ativa e as políticas RLS do Prisma.
      </Typography.Text>
    </PrismaPage>
  );
}

function PeopleMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <PrismaCard className={`prisma-people-metric prisma-people-metric--${tone}`}><span className="prisma-people-metric-icon">{icon}</span><Statistic title={label} value={value} /></PrismaCard>;
}

export function ProfileStateTag({ state }: { state: PersonWorkspaceSummary["profileState"] }) {
  if (state === "generated") return <Tag color="green">Perfil aprovado disponível</Tag>;
  if (state === "building") return <Tag color="blue">Perfil em construção</Tag>;
  if (state === "requires_attention") return <Tag color="orange">Importação requer revisão</Tag>;
  if (state === "processing_failed") return <Tag color="red">Última importação com falha técnica</Tag>;
  return <Tag>Sem perfil aprovado</Tag>;
}

function documentTagColor(state: DocumentOperationalState): string {
  if (state === "processed") return "green";
  if (state === "requires_review") return "gold";
  if (state === "technical_failure") return "red";
  if (state === "processing") return "blue";
  return "default";
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function formatRelativeDate(value: string): string {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (elapsedDays === 0) return "enviado hoje";
  if (elapsedDays === 1) return "enviado há 1 dia";
  if (elapsedDays < 30) return `enviado há ${elapsedDays} dias`;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
