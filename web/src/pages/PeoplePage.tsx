import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { TeamOutlined as PrismaPageIcon } from "@ant-design/icons";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FilterOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Dropdown, Empty, Input, Select, Skeleton, Space, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  currentProfileDescription,
  currentProfileLabel,
  presentDocument,
  type DocumentOperationalState,
} from "../domain/documentPresentation";
import type { PersonWorkspaceSummary } from "../domain/personIngestion";
import { directoryEntries, matchesDirectory, type DirectoryConcept, type DirectoryEntry, type DirectoryScope } from "../domain/peopleDirectory";
import type { PrismaDataRepository } from "../domain/prismaData";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { useViewState } from "../ui/PrismaNavigation";
import { PrismaState, PrismaMetric } from "../ui/PrismaState";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PeoplePageProps {
  activeMembership: OrganizationMembership;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

type ProfileFilter = "all" | "approved" | "without_profile";
type ImportFilter = "all" | DocumentOperationalState;
type OperationalFilter = "active" | "archived" | "all";

export function PeoplePage({ activeMembership, onNavigate }: PeoplePageProps) {
  const canManagePeople = activeMembership.role !== "member";
  const [search, setSearch] = useViewState("search", "");
  const [areaFilter, setAreaFilter] = useViewState("directoryArea", "");
  const [functionFilter, setFunctionFilter] = useViewState("directoryFunction", "");
  const [directoryScope, setDirectoryScope] = useViewState<DirectoryScope>("directoryScope", "recent");
  const [employeeFilter, setEmployeeFilter] = useViewState<"all" | "yes" | "no">("employeeFilter", "all");
  const [profileFilter, setProfileFilter] = useViewState<ProfileFilter>("profileFilter", "all");
  const [importFilter, setImportFilter] = useViewState<ImportFilter>("importFilter", "all");
  const [operationalFilter, setOperationalFilter] = useViewState<OperationalFilter>("operationalFilter", "active");
  const [pagination, setPagination] = useViewState("pagination", { current: 1, pageSize: 10 });
  const [retry, setRetry] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const [people, setPeople] = useState<PersonWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useLoadingFeedback({ "Carregando Pessoas…": loading });

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void personIngestionService.listPeople(activeMembership.organizationId, deferredSearch, canManagePeople)
      .then((result) => { if (current) setPeople(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível consultar Pessoas."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, canManagePeople, deferredSearch, retry]);

  const personPath = (personId: string) => `/profiles/${personId}`;
  const filteredPeople = useMemo(() => people.filter((person) => {
    const matchesOperational = operationalFilter === "all" || person.operationalStatus === operationalFilter;
    const matchesProfile = profileFilter === "all"
      || (profileFilter === "approved" && Boolean(person.currentProfile))
      || (profileFilter === "without_profile" && !person.currentProfile);
    const matchesImport = importFilter === "all" || presentDocument(person.latestDocument).state === importFilter;
    const matchesProfessional = (!areaFilter || person.professionalAreas?.some(a => a.id === areaFilter)) && (!functionFilter || directoryEntries(person.professionalDirectory,directoryScope).entries.some(e => matchesDirectory(e,"",functionFilter)));
    return matchesProfessional && matchesOperational && matchesProfile && matchesImport && (employeeFilter === "all" || (person.isActiveEmployee === true) === (employeeFilter === "yes"));
  }), [areaFilter,functionFilter,directoryScope,employeeFilter, importFilter, operationalFilter, people, profileFilter]);
  const hasFilters = Boolean(areaFilter || functionFilter || employeeFilter !== "all" || search || profileFilter !== "all" || importFilter !== "all" || operationalFilter !== "active");
  const scopedEntries = people.flatMap(p => directoryEntries(p.professionalDirectory,directoryScope).entries);
  const conceptOptions = (kind: "area" | "function") => Array.from(new Map((kind === "area" ? people.flatMap(p => p.professionalAreas ?? []) : scopedEntries.flatMap(e => e.function ? [e.function] : [])).map(c => [c.id,{value:c.id,label:c.label}])).values()).sort((a,b) => a.label.localeCompare(b.label,"pt-BR"));
  const shownEntries = (person: PersonWorkspaceSummary) => directoryEntries(person.professionalDirectory,directoryScope).entries.filter(e => matchesDirectory(e,"",functionFilter));
  const resetPage = () => setPagination((current) => ({ ...current, current: 1 }));
  const clearFilters = () => { setAreaFilter(""); setFunctionFilter(""); setDirectoryScope("recent"); setEmployeeFilter("all"); setSearch(""); setProfileFilter("all"); setImportFilter("all"); setOperationalFilter("active"); resetPage(); };
  const activePeople = people.filter((person) => person.operationalStatus === "active");
  const approvedProfiles = activePeople.filter((person) => person.currentProfile).length;
  const awaitingReview = activePeople.filter((person) => person.pendingReviewCount > 0).length;
  const importedToday = activePeople.filter((person) => person.latestDocument && isToday(person.latestDocument.createdAt)).length;

  const columns: ColumnsType<PersonWorkspaceSummary> = [
    {
      title: "Pessoa",
      dataIndex: "fullName",
      key: "fullName",
      width: 250,
      sorter: (left, right) => left.fullName.localeCompare(right.fullName),
      render: (name: string, person) => (
        <button className="prisma-person-name-button prisma-person-primary-cell" onClick={() => onNavigate(personPath(person.id))} type="button">
          <span className="prisma-person-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="prisma-person-primary-copy">
            <strong>{name} {person.operationalStatus === "archived" ? <Tag>Arquivada</Tag> : null}</strong>
            <small>{person.privateData.email || activeMembership.organizationName}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Área(s) profissional(is)", key: "professionalAreas", width: 210,
      render: (_,person) => <DirectoryConcepts concepts={person.professionalAreas ?? []} entries={[]} fallback={person.professionalAreas === null ? "Áreas indisponíveis" : "Sem área selecionada ou agrupada"} />,
    },
    {
      title: "Função / cargo", key: "professionalFunction", width: 240,
      render: (_,person) => {
        const entries = shownEntries(person);
        return <div className="prisma-directory-cell"><DirectoryConcepts concepts={entries.flatMap(e => e.function ? [e.function] : [])} entries={entries} fallback="Sem função agrupada" />
          {entries.map(e => <small key={e.experienceIndex}>Original: {e.originalRole || "Cargo não informado"}</small>)}
          {!entries.length ? <small>{directoryFallback(person,directoryScope)}</small> : null}
        </div>;
      },
    },
    {
      title: directoryScope === "recent" ? "Atuação recente" : "Atuação na trajetória", key: "professionalExperience", width: 225,
      render: (_,person) => <div className="prisma-directory-cell">{shownEntries(person).map(e => <div key={e.experienceIndex}><strong>{e.organization || "Empresa não informada"}</strong><small>{e.period || "Período não informado"}</small></div>)}
        {!shownEntries(person).length ? <small>{directoryFallback(person,directoryScope)}</small> : null}</div>,
    },
    {
      title: "Perfil atual",
      key: "currentProfile",
      width: 165,
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
      width: 225,
      render: (_, person) => {
        const presentation = presentDocument(person.latestDocument);
        return (
          <div className="prisma-person-import-cell">
            <Tag color={documentTagColor(presentation.state)}>{presentation.label}</Tag>
            <strong>{person.latestDocument ? `Documento v${person.latestDocument.documentVersion} · ${formatRelativeDate(person.latestDocument.createdAt)}` : "Nenhum documento recente"}</strong>
            {presentation.requiresAction ? <small>{presentation.description} Próximo passo: {presentation.nextAction}.</small> : null}
          </div>
        );
      },
    },
    {
      title: "Ações",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, person) => <Button icon={<EyeOutlined />} onClick={() => onNavigate(personPath(person.id))}>Abrir</Button>,
    },
  ];

  return (
    <PrismaPage className="prisma-m2b-page prisma-people-page">
      <PrismaPageHeader icon={<PrismaPageIcon />}
        title="Pessoas"
        description="Consulte áreas, funções e experiências a partir dos Perfis aprovados."
        actions={<Space wrap>
            {canManagePeople ? <Button icon={<PlusOutlined />} onClick={() => onNavigate("/profiles/manual")}>Preencher manualmente</Button> : null}
            {canManagePeople ? <Button icon={<FileAddOutlined />} onClick={() => onNavigate("/profiles/import")} type="primary">Importar currículo</Button> : null}
            <Dropdown menu={{ items: [
              { key: "search", label: "Encontrar pessoas", icon: <SearchOutlined /> },
              ...(canManagePeople ? [
                { key: "processes", label: "Processamento e revisões", icon: <FileSearchOutlined /> },
                { key: "new", label: "Cadastrar pessoa", icon: <PlusOutlined /> },
              ] : []),
            ], onClick: ({ key }) => onNavigate(key === "search" ? "/profiles/search" : key === "processes" ? "/profiles/processes" : "/profiles/new") }}>
              <Button icon={<MoreOutlined />}>Outras ações</Button>
            </Dropdown>
          </Space>}
      />
      <PrismaCard className="prisma-people-toolbar prisma-m2b-toolbar">
        <Input
          allowClear
          aria-label="Buscar por nome, e-mail, empresa, área ou cargo"
          onChange={(event) => { setSearch(event.target.value); resetPage(); }}
          placeholder="Buscar por nome, e-mail, empresa, área ou cargo..."
          prefix={<SearchOutlined />}
          value={search}
        />
        <Button icon={<FilterOutlined />} onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>Filtros</Button>
        <div className="prisma-directory-filters">
          <Select aria-label="Filtrar área profissional" placeholder="Todas as áreas" allowClear showSearch optionFilterProp="label" value={areaFilter || undefined} options={conceptOptions("area")} onChange={value => {setAreaFilter(value ?? "");resetPage();}} />
          <Select aria-label="Filtrar função profissional" placeholder="Todas as funções" allowClear showSearch optionFilterProp="label" value={functionFilter || undefined} options={conceptOptions("function")} onChange={value => {setFunctionFilter(value ?? "");resetPage();}} />
          <Select<DirectoryScope> aria-label="Período da atuação" value={directoryScope} options={[{value:"recent",label:"Atual / mais recente"},{value:"trajectory",label:"Trajetória completa"}]} onChange={value => {setDirectoryScope(value);resetPage();}} />
          {hasFilters ? <Button type="link" onClick={clearFilters}>Limpar filtros</Button> : null}
        </div>
        {showFilters ? <div className="prisma-people-filters">
          <Select<OperationalFilter>
            aria-label="Filtrar situação da Pessoa"
            onChange={(value) => { setOperationalFilter(value); resetPage(); }}
            options={[
              { value: "active", label: "Pessoas ativas" },
              { value: "archived", label: "Pessoas arquivadas" },
              { value: "all", label: "Ativas e arquivadas" },
            ]}
            value={operationalFilter}
          />
          <Select aria-label="Filtrar funcionário ativo" value={employeeFilter} onChange={(value) => { setEmployeeFilter(value); resetPage(); }} options={[{value:"all",label:"Funcionário ativo: todos"},{value:"yes",label:"Funcionário ativo: Sim"},{value:"no",label:"Funcionário ativo: Não"}]} />
          <Select<ProfileFilter>
            aria-label="Filtrar perfil atual"
            onChange={(value) => { setProfileFilter(value); resetPage(); }}
            options={[
              { value: "all", label: "Todos os perfis" },
              { value: "approved", label: "Com perfil aprovado" },
              { value: "without_profile", label: "Sem perfil aprovado" },
            ]}
            value={profileFilter}
          />
          <Select<ImportFilter>
            aria-label="Filtrar importações"
            onChange={(value) => { setImportFilter(value); resetPage(); }}
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

        </div> : null}
      </PrismaCard>
      {error ? <PrismaState kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => setRetry((value) => value + 1) }} /> : null}
      <PrismaCard className="prisma-people-table-card">
        {loading ? <PrismaState kind="loading" /> : error ? null : (
          <Table
            columns={columns}
            dataSource={filteredPeople}
            locale={{ emptyText: <PrismaState compact kind={hasFilters ? "filtered" : "empty"} description={hasFilters ? "Ajuste os filtros para ampliar a busca." : canManagePeople ? "Importe um currículo para criar o primeiro perfil profissional." : "As pessoas cadastradas e disponíveis nesta empresa aparecerão aqui."} {...(hasFilters ? { action: { label: "Limpar filtros", onClick: clearFilters } } : canManagePeople ? { action: { label: "Importar currículo", onClick: () => onNavigate("/profiles/import") } } : {})} /> }}
            pagination={{ ...pagination, onChange: (current, pageSize) => setPagination({ current, pageSize }), showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}` }}
            rowKey="id"
            scroll={{ x: 1415 }}
            size="middle"
            tableLayout="fixed"
            onRow={(person) => ({ onDoubleClick: () => onNavigate(personPath(person.id)) })}
          />
        )}
      </PrismaCard>
      <details className="prisma-m81-people-summary"><summary>Resumo de Pessoas</summary><div className="prisma-people-stats">
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<TeamOutlined />} label="Pessoas ativas" value={activePeople.length} tone="neutral" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<CheckCircleOutlined />} label="Com perfil aprovado" value={approvedProfiles} tone="success" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<ClockCircleOutlined />} label="Aguardando revisão" value={awaitingReview} tone="review" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<UploadOutlined />} label="Importações hoje" value={importedToday} tone="processing" />
      </div></details>
      <Typography.Text className="prisma-table-scope-note" type="secondary">
        Agrupamentos identificados por IA auxiliam a navegação. Cargo original e Perfil aprovado são preservados. Área e função filtradas correspondem à mesma experiência.
      </Typography.Text>
    </PrismaPage>
  );
}

function directoryFallback(person: PersonWorkspaceSummary,scope: DirectoryScope): string {
  if (!person.currentProfile) return "Sem Perfil aprovado";
  if (!person.professionalDirectory) return "Agrupamento indisponível";
  if (!person.professionalDirectory.length) return "Sem experiência informada";
  if (scope === "recent" && !directoryEntries(person.professionalDirectory,scope).chronologyKnown) return "Datas insuficientes; consulte a trajetória";
  return person.professionalDirectory.some(e => e.status === "queued" || e.status === "processing") ? "Agrupamento em preparação" : "Sem área agrupada";
}
function DirectoryConcepts({concepts,entries,fallback}: {concepts:DirectoryConcept[];entries:DirectoryEntry[];fallback:string}) {
  const unique = Array.from(new Map(concepts.map(c => [c.id,c])).values());
  return <div className="prisma-directory-cell">{unique.length ? unique.map(c => {
    const sources = entries.filter(e => e.areas.some(a => a.id === c.id) || e.function?.id === c.id);
    const ai = c.method === "ai_grouping" || sources.some(e => [...e.areas,...(e.function ? [e.function] : [])].some(a => a.id === c.id && a.method === "ai_grouping"));
    return <Tooltip key={c.id} title={`${c.method === "human_confirmed" ? "Área selecionada pelo gestor" : ai ? "Agrupamento sugerido por IA" : "Termo aprovado do Knowledge"}. ${sources.map(e => `${e.originalRole || "Experiência"} · ${e.organization || "Empresa não informada"} · ${e.period || "Sem período"} · Perfil v${e.profileVersion}`).join("; ")}. Knowledge v${c.version}.`}>
      <span tabIndex={0} className="prisma-directory-concept">{c.label}{ai ? <small className="prisma-directory-ai">IA</small> : null}</span>
    </Tooltip>;
  }) : <small>{fallback}</small>}</div>;
}

function PeopleMetric({ icon, label, value, tone, loading, unavailable }: { icon: React.ReactNode; label: string; value: number; tone: string; loading: boolean; unavailable: boolean }) {
  return <PrismaCard className={`prisma-people-metric prisma-people-metric--${tone}`}><span className="prisma-people-metric-icon">{icon}</span><PrismaMetric title={label} value={unavailable ? null : value} loading={loading} /></PrismaCard>;
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
