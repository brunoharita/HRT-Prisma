import {PeopleDiscoveryNavigation} from "../components/PeopleDiscoveryNavigation";
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
import { Alert, Button, Checkbox, Dropdown, Empty, Input, Modal, Pagination, Select, Skeleton, Space, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  presentDocument,
  type DocumentOperationalState,
} from "../domain/documentPresentation";
import type { PersonWorkspaceSummary } from "../domain/personIngestion";
import { latestDirectoryEntry, type DirectoryConcept, type DirectoryEntry } from "../domain/peopleDirectory";
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
  const [functionFilter, setFunctionFilter] = useViewState("latestRole", "");
  const [employeeFilter, setEmployeeFilter] = useViewState<"all" | "yes" | "no">("employeeFilter", "all");
  const [profileFilter, setProfileFilter] = useViewState<ProfileFilter>("profileFilter", "all");
  const [importFilter, setImportFilter] = useViewState<ImportFilter>("importFilter", "all");
  const [operationalFilter, setOperationalFilter] = useViewState<OperationalFilter>("operationalFilter", "active");
  const [pagination, setPagination] = useViewState("pagination", { current: 1, pageSize: 10 });
  const [retry, setRetry] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds,setSelectedIds]=useViewState<string[]>("selectedPeople",[]);
  const [visibleColumns,setVisibleColumns]=useViewState<string[]>("visibleColumns",["fullName","professionalFunction","city","profileDate"]);
  const [columnsOpen,setColumnsOpen]=useState(false),[savedOpen,setSavedOpen]=useState(false),[saveOpen,setSaveOpen]=useState(false),[savedName,setSavedName]=useState("");
  type SavedSearch={id:string;name:string;search:string;area:string;role:string;employee:"all"|"yes"|"no";profile:ProfileFilter;importState:ImportFilter;operational:OperationalFilter};
  const [savedSearches,setSavedSearches]=useViewState<SavedSearch[]>("savedSearches",[]);
  const togglePerson=(id:string)=>setSelectedIds(ids=>ids.includes(id)?ids.filter(v=>v!==id):ids.length<2?[...ids,id]:ids);

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

  useEffect(()=>{if(!loading&&!error)setSelectedIds(ids=>ids.filter(id=>people.some(p=>p.id===id&&p.currentProfile)));},[people,loading,error]);
  const personPath = (personId: string) => `/profiles/${personId}`;
  const filteredPeople = useMemo(() => people.filter((person) => {
    const matchesOperational = operationalFilter === "all" || person.operationalStatus === operationalFilter;
    const matchesProfile = profileFilter === "all"
      || (profileFilter === "approved" && Boolean(person.currentProfile))
      || (profileFilter === "without_profile" && !person.currentProfile);
    const matchesImport = importFilter === "all" || presentDocument(person.latestDocument).state === importFilter;
    const matchesProfessional = (!areaFilter || person.professionalAreas?.some(a => a.id === areaFilter)) && (!functionFilter || latestDirectoryEntry(person.professionalDirectory)?.originalRole === functionFilter);
    return matchesProfessional && matchesOperational && matchesProfile && matchesImport && (employeeFilter === "all" || (person.isActiveEmployee === true) === (employeeFilter === "yes"));
  }), [areaFilter,functionFilter,employeeFilter, importFilter, operationalFilter, people, profileFilter]);
  const hasFilters = Boolean(areaFilter || functionFilter || employeeFilter !== "all" || search || profileFilter !== "all" || importFilter !== "all" || operationalFilter !== "active");
  const chips = [
    ...(search?[{key:"search",label:`Busca: ${search}`,clear:()=>setSearch("")}]:[]),
    ...(areaFilter?[{key:"area",label:`Área: ${people.flatMap(p=>p.professionalAreas??[]).find(a=>a.id===areaFilter)?.label??"Área selecionada"}`,clear:()=>setAreaFilter("")}]:[]),
    ...(functionFilter?[{key:"role",label:`Cargo: ${functionFilter}`,clear:()=>setFunctionFilter("")}]:[]),
    {key:"status",label:`Situação: ${{active:"Ativas",archived:"Arquivadas",all:"Todas"}[operationalFilter]}`,clear:()=>setOperationalFilter("active")},
    ...(employeeFilter!=="all"?[{key:"employee",label:`Funcionário ativo: ${employeeFilter==="yes"?"Sim":"Não"}`,clear:()=>setEmployeeFilter("all")}]:[]),
    ...(profileFilter!=="all"?[{key:"profile",label:profileFilter==="approved"?"Com Perfil publicado":"Sem Perfil publicado",clear:()=>setProfileFilter("all")}]:[]),
    ...(importFilter!=="all"?[{key:"import",label:`Importação: ${{requires_review:"Requer revisão",technical_failure:"Falha técnica",processed:"Processadas",none:"Sem importação",discarded:"Arquivadas",processing:"Em processamento",received:"Recebidas"}[importFilter]}`,clear:()=>setImportFilter("all")}]:[])
  ];
  const areaOptions = Array.from(new Map(people.flatMap(p => p.professionalAreas ?? []).map(c => [c.id,{value:c.id,label:c.label}])).values()).sort((a,b) => a.label.localeCompare(b.label,"pt-BR"));
  const roleOptions = [...new Set(people.map(p => latestDirectoryEntry(p.professionalDirectory)?.originalRole).filter((role): role is string => Boolean(role)))].sort((a,b) => a.localeCompare(b,"pt-BR")).map(role => ({value:role,label:role}));
  const resetPage = () => setPagination((current) => ({ ...current, current: 1 }));
  const clearFilters = () => { setAreaFilter(""); setFunctionFilter(""); setEmployeeFilter("all"); setSearch(""); setProfileFilter("all"); setImportFilter("all"); setOperationalFilter("active"); resetPage(); };
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
            <small>{person.professionalAreas===null?"Áreas indisponíveis":(person.professionalAreas??[]).map(a=>a.label).join(" · ")||"Área não informada"}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Área Profissional", key: "professionalAreas", width: 210,
      render: (_,person) => <DirectoryConcepts concepts={person.professionalAreas ?? []} entries={[]} fallback={person.professionalAreas === null ? "Indisponível" : "Não informada"} />,
    },
    {
      title: "Atuação recente", key: "professionalFunction", width: 330,
      render: (_,person) => {
        const role = latestDirectoryEntry(person.professionalDirectory)?.originalRole;
        const entry=latestDirectoryEntry(person.professionalDirectory);
        return <div className="prisma-directory-cell"><strong>{role||latestExperienceFallback(person)}</strong><small>{entry?.organization||"Última empresa não informada"} · {entry?.period||"Período não informado"}</small></div>;
      },
    },
    {
      title: "Última empresa", key: "professionalExperience", width: 235,
      render: (_,person) => {
        const entry = latestDirectoryEntry(person.professionalDirectory);
        return entry ? <div className="prisma-directory-cell"><span className={entry.organization ? undefined : "prisma-person-missing"}>{entry.organization || "Não informado"}</span><small>{entry.period || "Período não informado"}</small></div> : <span className="prisma-person-missing">{latestExperienceFallback(person)}</span>;
      },
    },
    {
      title: "Cidade", key: "city", width: 150,
      render: (_,person) => person.privateData.city || <span className="prisma-person-missing">Não informado</span>,
    },
    {
      title: "Data do Perfil", key: "profileDate", width: 150,
      sorter: (a,b) => Date.parse(a.currentProfile?.approvedAt ?? "1970-01-01") - Date.parse(b.currentProfile?.approvedAt ?? "1970-01-01"),
      render: (_,person) => person.currentProfile?.approvedAt ? formatProfileDate(person.currentProfile.approvedAt) : <span className="prisma-person-missing">Não informado</span>,
    },
  ];

  return (
    <PrismaPage className="prisma-m2b-page prisma-people-page prisma-v310">
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
      <PeopleDiscoveryNavigation active="base" activeMembership={activeMembership} onNavigate={onNavigate}/>
      <PrismaCard className="prisma-people-toolbar prisma-m2b-toolbar">
        <Input
          allowClear
          aria-label="Buscar por nome, e-mail, empresa, área ou cargo"
          onChange={(event) => { setSearch(event.target.value); resetPage(); }}
          placeholder="Buscar por nome, e-mail, empresa, área ou cargo..."
          prefix={<SearchOutlined />}
          value={search}
        />
        <Button icon={<FilterOutlined />} onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>Mais filtros {chips.length>1?`(${chips.length-1})`:""}</Button>
        <div className="prisma-directory-filters">
          <label>Área profissional<Select aria-label="Filtrar área profissional" placeholder="Todas as áreas" allowClear showSearch optionFilterProp="label" value={areaFilter || undefined} options={[{value:"",label:"Todas as áreas"},...areaOptions]} onChange={value=>{setAreaFilter(value??"");resetPage();}}/></label>
          <label>Situação<Select<OperationalFilter> aria-label="Filtrar situação da Pessoa" value={operationalFilter} onChange={value=>{setOperationalFilter(value);resetPage();}} options={[{value:"active",label:"Pessoas ativas"},{value:"archived",label:"Pessoas arquivadas"},{value:"all",label:"Ativas e arquivadas"}]}/></label>
          <label>Função/Cargo<Select aria-label="Filtrar cargo" placeholder="Todos os cargos" allowClear showSearch optionFilterProp="label" value={functionFilter||undefined} options={[{value:"",label:"Todos os cargos"},...roleOptions]} onChange={value=>{setFunctionFilter(value??"");resetPage();}}/></label>
        </div>
        <div className="prisma-filter-summary" aria-label="Filtros aplicados">{chips.map(chip=><Tag key={chip.key} closable={chip.key!=="status"||operationalFilter!=="active"} onClose={()=>{chip.clear();resetPage();}}>{chip.label}</Tag>)}<Button type="link" onClick={clearFilters}>Restaurar padrão</Button><Button type="link" onClick={()=>{setSavedName("");setSaveOpen(true);}}>Salvar busca</Button></div>
        {showFilters ? <div className="prisma-people-filters">
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
      <div className="prisma-list-heading"><strong>{loading?"Consultando pessoas…":error?"Consulta indisponível":`${filteredPeople.length} ${filteredPeople.length===1?"pessoa encontrada":"pessoas encontradas"}`}</strong><Space><Button type="link" onClick={()=>setSavedOpen(true)}>Buscas salvas</Button><Button onClick={()=>setColumnsOpen(true)}>Colunas</Button></Space></div>
      {selectedIds.length?<div className="prisma-selection-toolbar"><span>{selectedIds.length} de 2 pessoas selecionadas</span><Button type="primary" disabled={selectedIds.length!==2} onClick={()=>onNavigate(`/profiles/compare/${selectedIds.join("/")}`)}>Comparar pessoas</Button><Button onClick={()=>setSelectedIds([])}>Limpar seleção</Button></div>:null}
      <PrismaCard className="prisma-people-table-card">
        {loading ? <PrismaState kind="loading" /> : error ? null : (
          <div className="prisma-people-desktop"><Table
            rowSelection={{selectedRowKeys:selectedIds,onChange:keys=>setSelectedIds(keys.map(String).slice(0,2)),getCheckboxProps:p=>({disabled:!p.currentProfile||(!selectedIds.includes(p.id)&&selectedIds.length===2),"aria-label":`Selecionar ${p.fullName} para comparar`})}}
            columns={columns.filter(c=>visibleColumns.includes(String(c.key)))}
            dataSource={filteredPeople}
            locale={{ emptyText: <PrismaState compact kind={hasFilters ? "filtered" : "empty"} description={hasFilters ? "Ajuste os filtros para ampliar a busca." : canManagePeople ? "Importe um currículo para criar o primeiro perfil profissional." : "As pessoas cadastradas e disponíveis nesta empresa aparecerão aqui."} {...(hasFilters ? { action: { label: "Limpar filtros", onClick: clearFilters } } : canManagePeople ? { action: { label: "Importar currículo", onClick: () => onNavigate("/profiles/import") } } : {})} /> }}
            pagination={{ ...pagination, onChange: (current, pageSize) => setPagination({ current, pageSize }), showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}` }}
            rowKey="id"
            scroll={{ x: columns.filter(c=>visibleColumns.includes(String(c.key))).reduce((sum,c)=>sum+Number(c.width??180),48) }}
            size="middle"
            tableLayout="fixed"
            onRow={(person) => ({ onDoubleClick: () => onNavigate(personPath(person.id)) })}
          /></div>
        )}
        {!loading&&!error?<div className="prisma-people-mobile">{filteredPeople.slice((pagination.current-1)*pagination.pageSize,pagination.current*pagination.pageSize).map(person=><article key={person.id} className="prisma-person-mobile-record"><header><Checkbox aria-label={`Selecionar ${person.fullName} para comparar`} checked={selectedIds.includes(person.id)} disabled={!person.currentProfile||(!selectedIds.includes(person.id)&&selectedIds.length===2)} onChange={()=>togglePerson(person.id)}/><div><Button type="link" onClick={()=>onNavigate(personPath(person.id))}>{person.fullName}</Button><small>{person.professionalAreas===null?"Áreas indisponíveis":(person.professionalAreas??[]).map(a=>a.label).join(" · ")||"Área não informada"}</small></div>{person.operationalStatus==="archived"?<Tag>Arquivada</Tag>:null}</header>{visibleColumns.includes("professionalFunction")?<p><strong>{latestDirectoryEntry(person.professionalDirectory)?.originalRole||latestExperienceFallback(person)}</strong><small>{latestDirectoryEntry(person.professionalDirectory)?.organization??"Última empresa não informada"} · {latestDirectoryEntry(person.professionalDirectory)?.period??"Período não informado"}</small></p>:null}{visibleColumns.includes("professionalExperience")?<p>{latestDirectoryEntry(person.professionalDirectory)?.organization??"Última empresa não informada"}<small> · {latestDirectoryEntry(person.professionalDirectory)?.period??"Período não informado"}</small></p>:null}{visibleColumns.includes("professionalAreas")?<p>{(person.professionalAreas??[]).map(a=>a.label).join(" · ")||"Área não informada"}</p>:null}{visibleColumns.includes("city")?<p>Cidade: {person.privateData.city||"Não informada"}</p>:null}{visibleColumns.includes("profileDate")?<p>Perfil publicado: {person.currentProfile?.approvedAt?formatProfileDate(person.currentProfile.approvedAt):"Não disponível"}</p>:null}<Button onClick={()=>onNavigate(personPath(person.id))}>Abrir Perfil</Button></article>)}{!filteredPeople.length?<Empty description="Nenhuma pessoa neste filtro."/>:null}<Pagination {...pagination} total={filteredPeople.length} onChange={(current,pageSize)=>setPagination({current,pageSize})} showSizeChanger={false}/></div>:null}
      </PrismaCard>
      <Modal rootClassName="prisma-v310 prisma-content-standard prisma-reading" title="Colunas da lista" open={columnsOpen} onCancel={()=>setColumnsOpen(false)} footer={<Space><Button onClick={()=>setVisibleColumns(["fullName","professionalFunction","city","profileDate"])}>Restaurar colunas</Button><Button type="primary" onClick={()=>setColumnsOpen(false)}>Concluir</Button></Space>}><div className="prisma-choice-list">{columns.map(c=><Checkbox key={String(c.key)} checked={visibleColumns.includes(String(c.key))} disabled={c.key==="fullName"} onChange={e=>setVisibleColumns(list=>e.target.checked?[...list,String(c.key)]:list.filter(k=>k!==c.key))}>{String(c.title)}</Checkbox>)}</div></Modal>
      <Modal rootClassName="prisma-v310 prisma-content-standard prisma-reading" title="Salvar busca nesta sessão" open={saveOpen} onCancel={()=>setSaveOpen(false)} okText="Salvar busca" okButtonProps={{disabled:!savedName.trim()||savedSearches.length>=20}} onOk={()=>{if(!savedName.trim()||savedSearches.length>=20)return;setSavedSearches(items=>[...items,{id:crypto.randomUUID(),name:savedName.trim(),search,area:areaFilter,role:functionFilter,employee:employeeFilter,profile:profileFilter,importState:importFilter,operational:operationalFilter}]);setSaveOpen(false);}}><p>Os critérios ficam disponíveis nesta sessão, somente nesta empresa. Resultados são consultados novamente ao reabrir.</p><Input aria-label="Nome da busca" maxLength={80} value={savedName} onChange={e=>setSavedName(e.target.value)} placeholder="Ex.: Operações em Bauru"/>{savedSearches.length>=20?<p>Limite de 20 buscas nesta sessão. Remova uma busca antes de salvar outra.</p>:null}</Modal>
      <Modal rootClassName="prisma-v310 prisma-content-standard prisma-reading" title="Buscas salvas nesta sessão" open={savedOpen} onCancel={()=>setSavedOpen(false)} footer={<Button onClick={()=>setSavedOpen(false)}>Fechar</Button>}>{savedSearches.length?savedSearches.map(item=><div key={item.id} className="prisma-saved-search"><Button type="link" onClick={()=>{setSearch(item.search);setAreaFilter(item.area);setFunctionFilter(item.role);setEmployeeFilter(item.employee);setProfileFilter(item.profile);setImportFilter(item.importState);setOperationalFilter(item.operational);resetPage();setSavedOpen(false);}}>{item.name}</Button><Button aria-label={`Excluir busca ${item.name}`} onClick={()=>setSavedSearches(list=>list.filter(s=>s.id!==item.id))}>Remover</Button></div>):<Empty description="Nenhuma busca salva nesta sessão."/>}</Modal>
      <details className="prisma-m81-people-summary"><summary>Resumo de Pessoas</summary><div className="prisma-people-stats">
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<TeamOutlined />} label="Pessoas ativas" value={activePeople.length} tone="neutral" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<CheckCircleOutlined />} label="Com perfil aprovado" value={approvedProfiles} tone="success" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<ClockCircleOutlined />} label="Aguardando revisão" value={awaitingReview} tone="review" />
        <PeopleMetric loading={loading} unavailable={Boolean(error)} icon={<UploadOutlined />} label="Importações hoje" value={importedToday} tone="processing" />
      </div></details>
      <Typography.Text className="prisma-table-scope-note" type="secondary">
        Áreas profissionais do Perfil vigente. Cargo, empresa e período correspondem à última experiência identificável. Data do Perfil corresponde à publicação.
      </Typography.Text>
    </PrismaPage>
  );
}

function latestExperienceFallback(person: PersonWorkspaceSummary): string {
  if (!person.currentProfile) return "Não informado";
  if (!person.professionalDirectory) return "Indisponível";
  if (!person.professionalDirectory.length) return "Não informado";
  return latestDirectoryEntry(person.professionalDirectory) ? "Não informado" : "Experiência não identificada";
}
function DirectoryConcepts({concepts,entries,fallback}: {concepts:DirectoryConcept[];entries:DirectoryEntry[];fallback:string}) {
  const unique = Array.from(new Map(concepts.map(c => [c.id,c])).values());
  return <div className="prisma-directory-cell">{unique.length ? unique.map(c => {
    const sources = entries.filter(e => e.areas.some(a => a.id === c.id) || e.function?.id === c.id);
    const ai = c.method === "ai_grouping" || sources.some(e => [...e.areas,...(e.function ? [e.function] : [])].some(a => a.id === c.id && a.method === "ai_grouping"));
    const lastSpace = c.label.lastIndexOf(" ");
    return <Tooltip key={c.id} title={`${c.method === "human_confirmed" ? "Área selecionada pelo gestor" : ai ? "Agrupamento sugerido por IA" : "Termo aprovado do Knowledge"}. ${sources.map(e => `${e.originalRole || "Experiência"} · ${e.organization || "Empresa não informada"} · ${e.period || "Sem período"} · Perfil v${e.profileVersion}`).join("; ")}. Knowledge v${c.version}.`}>
      <span tabIndex={0} className="prisma-directory-concept">{ai ? <>{c.label.slice(0,lastSpace+1)}<span className="prisma-directory-label-tail">{c.label.slice(lastSpace+1)}<small className="prisma-directory-ai">IA</small></span></> : c.label}</span>
    </Tooltip>;
  }) : <span className="prisma-person-missing">{fallback}</span>}</div>;
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

function isToday(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function formatProfileDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : new Intl.DateTimeFormat("pt-BR", {dateStyle:"short"}).format(date);
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
