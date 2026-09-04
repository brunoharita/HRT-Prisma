import { useEffect, useMemo, useState } from "react";
import {
  AimOutlined,
  ApartmentOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  StarOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  applyStructureSuggestions,
  emptyVacancyDraft,
  newVacancyRequirement,
  structureVacancyDescription,
  validateVacancyDraft,
  type VacancyCandidateMatch,
  type VacancyDetail,
  type VacancyDraft,
  type VacancyMatchStatus,
  type VacancyRequirementCategory,
  type VacancyRequirementDraft,
  type VacancyStructureSuggestion,
  type VacancySummary,
} from "../domain/vacancy.js";
import {
  vacancyService,
  type OrganizationRoleTemplate,
  type VacancyHistoryItem,
  type VacancyReferenceSuggestion,
} from "../infrastructure/supabase/vacancyService.js";
import type { OrganizationMembership } from "../shared/access.js";
import { PrismaCard } from "../ui/PrismaCard.js";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage.js";

const PAGE_SIZE = 8;
const DRAFT_KEY = "prisma.vacancy-draft.1";

interface CommonProps { activeMembership: OrganizationMembership; onNavigate: (path: string) => void; }

export function VacanciesPage({ activeMembership, onNavigate }: CommonProps) {
  const [items, setItems] = useState<VacancySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [occupancy, setOccupancy] = useState<"all" | "occupied" | "vacant">("all");
  const [area, setArea] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void vacancyService.list(activeMembership.organizationId)
      .then((result) => { if (current) setItems(result); })
      .catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível carregar as Vagas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId]);

  const areas = useMemo(() => [...new Set(items.flatMap((item) => item.area ? [item.area] : []))].sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const query = normalize(search);
    const textMatches = !query || [item.title, item.area, item.location, item.occupantName].some((value) => normalize(value ?? "").includes(query));
    return textMatches && (occupancy === "all" || item.occupancy === occupancy) && (!area || item.area === area);
  }), [items, search, occupancy, area]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return <PrismaPage className="prisma-vacancies-page">
    <PrismaPageHeader title="Vagas" description="Gerencie as necessidades profissionais da sua empresa." actions={<Button icon={<PlusOutlined />} onClick={() => { clearDraft(); onNavigate("/vacancies/new"); }} type="primary">Nova vaga</Button>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    <PrismaCard className="prisma-vacancy-toolbar">
      <Input allowClear aria-label="Buscar Vagas" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por título, área, localidade ou Pessoa..." prefix={<SearchOutlined />} value={search} />
      <Segmented onChange={(value) => { setOccupancy(value as typeof occupancy); setPage(1); }} options={[{ label: `Todas ${items.length}`, value: "all" }, { label: `Ocupadas ${items.filter((item) => item.occupancy === "occupied").length}`, value: "occupied" }, { label: `Não ocupadas ${items.filter((item) => item.occupancy === "vacant").length}`, value: "vacant" }]} value={occupancy} />
      <Select allowClear aria-label="Filtrar por área" onChange={(value) => { setArea(value ?? null); setPage(1); }} options={areas.map((value) => ({ label: value, value }))} placeholder="Todas as áreas" value={area} />
    </PrismaCard>
    {loading ? <PrismaCard><Skeleton active paragraph={{ rows: 10 }} /></PrismaCard> : null}
    {!loading && !items.length ? <PrismaCard><Empty description={<span>Ainda não há Vagas cadastradas.<br />Cadastre a primeira necessidade profissional da sua empresa.</span>}><Button icon={<PlusOutlined />} onClick={() => onNavigate("/vacancies/new")} type="primary">Nova vaga</Button></Empty></PrismaCard> : null}
    {!loading && items.length && !filtered.length ? <PrismaCard><Empty description="Nenhuma Vaga corresponde aos filtros informados." /></PrismaCard> : null}
    {!loading && visible.length ? <>
      <div className="prisma-vacancy-table-wrap"><Table<VacancySummary> columns={vacancyColumns(onNavigate)} dataSource={visible} pagination={false} rowKey="id" /></div>
      <div className="prisma-vacancy-pagination"><Typography.Text type="secondary">Mostrando {visible.length} de {filtered.length} Vagas</Typography.Text><Pagination current={page} onChange={setPage} pageSize={PAGE_SIZE} showSizeChanger={false} total={filtered.length} /></div>
    </> : null}
  </PrismaPage>;
}

export function VacancyEditorPage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId?: string }) {
  const [draft, setDraft] = useState<VacancyDraft>(() => vacancyId ? emptyVacancyDraft() : readDraft());
  const [roles, setRoles] = useState<OrganizationRoleTemplate[]>([]);
  const [previous, setPrevious] = useState<VacancySummary[]>([]);
  const [occupants, setOccupants] = useState<Array<{ value: string; label: string }>>([]);
  const [references, setReferences] = useState<VacancyReferenceSuggestion[]>([]);
  const [loading, setLoading] = useState(Boolean(vacancyId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [advisorQuestion, setAdvisorQuestion] = useState("");
  const [advisorAnswer, setAdvisorAnswer] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void Promise.all([
      vacancyService.listRoleTemplates(activeMembership.organizationId),
      vacancyService.list(activeMembership.organizationId),
      vacancyService.listOccupants(activeMembership.organizationId),
      vacancyId ? vacancyService.load(activeMembership.organizationId, vacancyId) : Promise.resolve(null),
    ]).then(([roleItems, vacancyItems, people, detail]) => {
      if (!current) return;
      setRoles(roleItems); setPrevious(vacancyItems.filter((item) => item.id !== vacancyId)); setOccupants(people);
      if (detail) setDraft(detail);
      if (vacancyId && !detail) setError("A Vaga solicitada não foi encontrada na empresa ativa.");
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível preparar a edição da Vaga.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);

  useEffect(() => {
    if (vacancyId || loading) return;
    persistDraft(draft); setSavedLocally(true);
    const timeout = window.setTimeout(() => setSavedLocally(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [draft, loading, vacancyId]);

  const update = <K extends keyof VacancyDraft>(key: K, value: VacancyDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  async function usePrevious(id: string) {
    const detail = await vacancyService.load(activeMembership.organizationId, id);
    if (!detail) return;
    setDraft({ ...detail, id: null, sourceKind: "previous_vacancy", sourceVacancyId: id, occupantPersonId: null, occupancy: "vacant", saveAsRole: false });
  }
  function useRole(id: string) {
    const role = roles.find((item) => item.id === id); if (!role) return;
    setDraft((current) => ({ ...current, title: role.name, mission: role.mission, responsibilities: role.responsibilities, expectedOutcomes: role.expectedOutcomes, requirements: role.requirements, contextItems: role.contextItems, sourceKind: "organization_role", jobRoleId: role.id, referenceConceptId: role.referenceConceptId }));
  }
  async function searchReferences(value: string) {
    try { setReferences(await vacancyService.suggestReferences(activeMembership.organizationId, value)); }
    catch (caught) { setError(errorMessage(caught, "Não foi possível consultar as referências profissionais.")); }
  }
  async function save() {
    const errors = validateVacancyDraft(draft);
    if (errors.length) { setError(errors.join(" ")); return; }
    setSaving(true); setError(null);
    try {
      const result = await vacancyService.save(activeMembership.organizationId, draft);
      clearDraft(); onNavigate(`/vacancies/${result.id}`);
    } catch (caught) { setError(errorMessage(caught, "Não foi possível salvar a Vaga.")); }
    finally { setSaving(false); }
  }

  if (loading) return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 18 }} /></PrismaCard></PrismaPage>;
  return <PrismaPage className="prisma-vacancy-editor-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")} type="text">Voltar</Button>
    <PrismaPageHeader title={vacancyId ? "Editar vaga" : "Nova vaga"} description="Explique a necessidade em blocos simples. O Prisma preserva a estrutura e a versão usadas nas avaliações." actions={savedLocally ? <Tag icon={<CheckCircleOutlined />} color="success">Rascunho salvo neste navegador</Tag> : null} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {!vacancyId ? <PrismaCard className="prisma-vacancy-start-card" title="Como você quer começar?">
      <div><label>Função da empresa<Select allowClear onChange={useRole} options={roles.map((item) => ({ label: item.name, value: item.id }))} placeholder="Usar uma função validada" /></label></div>
      <div><label>Vaga anterior<Select allowClear onChange={(value) => void usePrevious(value)} options={previous.map((item) => ({ label: item.title, value: item.id }))} placeholder="Reutilizar somente a definição" /></label></div>
      <div><label>Referência profissional<Select allowClear filterOption={false} onSearch={(value) => void searchReferences(value)} onSelect={(value) => { const reference = references.find((item) => item.conceptId === value); if (reference) setDraft((current) => ({ ...current, title: current.title || reference.label, referenceConceptId: value, sourceKind: "knowledge_reference" })); }} options={references.map((item) => ({ label: `${item.label} · ${item.scope === "global" ? "Global" : "Empresa"}`, value: item.conceptId }))} placeholder="Buscar na Knowledge" showSearch /></label></div>
      <Button icon={<RobotOutlined />} onClick={() => onNavigate("/vacancies/assist")}>Começar com uma descrição</Button>
    </PrismaCard> : null}
    <Form layout="vertical" onFinish={() => void save()}>
      <PrismaCard className="prisma-vacancy-form-section" title="1. Informações básicas">
        <div className="prisma-vacancy-form-grid">
          <Form.Item label="Título da Vaga" required><Input maxLength={240} onChange={(event) => update("title", event.target.value)} placeholder="Ex.: Gerente Comercial Enterprise" value={draft.title} /></Form.Item>
          <Form.Item label="Área"><Input onChange={(event) => update("area", event.target.value)} placeholder="Ex.: Comercial" value={draft.area} /></Form.Item>
          <Form.Item label="Localidade"><Input onChange={(event) => update("location", event.target.value)} placeholder="Ex.: São Paulo, SP" value={draft.location} /></Form.Item>
          <Form.Item label="Regime de trabalho"><Select allowClear onChange={(value) => update("workArrangement", value ?? null)} options={workArrangementOptions} placeholder="Não informado" value={draft.workArrangement} /></Form.Item>
          <Form.Item label="Tipo de vínculo"><Input onChange={(event) => update("employmentType", event.target.value)} placeholder="Ex.: CLT" value={draft.employmentType} /></Form.Item>
          <Form.Item label="Situação de ocupação"><Segmented block onChange={(value) => setDraft((current) => ({ ...current, occupancy: value as VacancyDraft["occupancy"], occupantPersonId: value === "occupied" ? current.occupantPersonId : null }))} options={[{ label: "Não ocupada", value: "vacant" }, { label: "Ocupada", value: "occupied" }]} value={draft.occupancy} /></Form.Item>
        </div>
        {draft.occupancy === "occupied" ? <Form.Item label="Pessoa que ocupa a posição" required><Select showSearch optionFilterProp="label" onChange={(value) => update("occupantPersonId", value)} options={occupants} placeholder="Selecione uma Pessoa existente" value={draft.occupantPersonId} /></Form.Item> : null}
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section" title="2. Missão da vaga"><Typography.Text type="secondary">Qual é o principal propósito desta Vaga?</Typography.Text><Input.TextArea maxLength={700} onChange={(event) => update("mission", event.target.value)} rows={4} showCount value={draft.mission} /></PrismaCard>
      <div className="prisma-vacancy-two-columns">
        <StringListEditor label="3. Responsabilidades" onChange={(value) => update("responsibilities", value)} placeholder="O que esta Pessoa fará?" values={draft.responsibilities} />
        <StringListEditor label="4. Resultados esperados" onChange={(value) => update("expectedOutcomes", value)} placeholder="O que esperamos que esta Pessoa entregue?" values={draft.expectedOutcomes} />
      </div>
      <PrismaCard className="prisma-vacancy-form-section" title="5. O que a Pessoa precisa trazer">
        <Typography.Paragraph type="secondary">Classifique somente o que importa para esta Vaga. Não há pesos ou notas.</Typography.Paragraph>
        <div className="prisma-requirement-editor-list">{draft.requirements.map((item, index) => <RequirementEditor item={item} key={item.stableId} onChange={(next) => update("requirements", draft.requirements.map((current, currentIndex) => currentIndex === index ? next : current))} onRemove={() => update("requirements", draft.requirements.filter((_, currentIndex) => currentIndex !== index))} />)}</div>
        <Button icon={<PlusOutlined />} onClick={() => update("requirements", [...draft.requirements, newVacancyRequirement()])} type="link">Adicionar requisito</Button>
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section" title="6. Contexto"><Select mode="tags" onChange={(value) => update("contextItems", value)} open={false} placeholder="Ex.: B2B, Enterprise, expansão regional" tokenSeparators={[",", ";"]} value={draft.contextItems} /></PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section" title={<span><BulbOutlined /> Pergunta pontual ao Prisma</span>}>
        <Typography.Paragraph type="secondary">Use esta orientação local para revisar um ponto da definição. Ela não altera campos nem envia dados a terceiros.</Typography.Paragraph>
        <Input.Search enterButton="Analisar pergunta" onChange={(event) => setAdvisorQuestion(event.target.value)} onSearch={() => setAdvisorAnswer(answerVacancyQuestion(advisorQuestion, draft))} placeholder="Ex.: Há requisitos demais para esta Vaga?" value={advisorQuestion} />
        {advisorAnswer ? <Alert className="prisma-vacancy-advisor-answer" title={advisorAnswer} showIcon type="info" /> : null}
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-save-bar"><Checkbox checked={draft.saveAsRole} onChange={(event) => update("saveAsRole", event.target.checked)}>Usar esta definição como referência da empresa</Checkbox><Space><Button onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")}>Cancelar</Button><Button htmlType="submit" loading={saving} type="primary">Salvar vaga</Button></Space></PrismaCard>
    </Form>
  </PrismaPage>;
}

export function VacancyAssistPage({ onNavigate }: CommonProps) {
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<VacancyStructureSuggestion[]>([]);
  function analyze() { setSuggestions(structureVacancyDescription(description)); }
  function confirm() {
    const base = readDraft();
    const structured = applyStructureSuggestions({ ...base, title: base.title || inferTitle(description) }, suggestions);
    persistDraft(structured); onNavigate("/vacancies/new");
  }
  const grouped = groupSuggestions(suggestions);
  return <PrismaPage className="prisma-vacancy-assist-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies/new")} type="text">Voltar para Nova vaga</Button>
    <PrismaPageHeader title="Estruturar vaga com ajuda do Prisma" description="Cole uma descrição livre. O Prisma organiza somente o que está no texto e separa sugestões que exigem sua confirmação." />
    <Alert icon={<RobotOutlined />} message="A assistência externa permanece desativada. Esta preparação é determinística, não envia dados a terceiros e não salva nada antes da sua revisão." showIcon type="info" />
    <div className="prisma-vacancy-assist-grid">
      <PrismaCard title="1. Descrição da vaga"><Input.TextArea maxLength={5000} onChange={(event) => setDescription(event.target.value)} placeholder="Cole aqui a descrição profissional..." rows={23} showCount value={description} /><div className="prisma-vacancy-assist-actions"><Button icon={<DeleteOutlined />} onClick={() => { setDescription(""); setSuggestions([]); }}>Limpar texto</Button><Button disabled={!description.trim()} icon={<BulbOutlined />} onClick={analyze} type="primary">Estruturar descrição</Button></div></PrismaCard>
      <PrismaCard title="2. Estrutura sugerida pelo Prisma">
        {!suggestions.length ? <Empty description="A estrutura sugerida aparecerá aqui para revisão." /> : Object.entries(grouped).map(([category, items]) => <section className="prisma-assist-suggestion-group" key={category}><strong>{category}</strong>{items.map((item) => <Checkbox checked={item.selected} key={item.id} onChange={(event) => setSuggestions((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: event.target.checked } : candidate))}><span>{item.label}</span>{item.origin === "derived" ? <Tag color="purple">Sugestão para revisão</Tag> : null}<small>{item.reason}</small></Checkbox>)}</section>)}
      </PrismaCard>
    </div>
    <PrismaCard className="prisma-vacancy-save-bar"><Typography.Text type="secondary">Revise, desmarque ou ajuste tudo antes de salvar a Vaga.</Typography.Text><Space><Button onClick={() => onNavigate("/vacancies/new")}>Editar manualmente</Button><Button disabled={!suggestions.some((item) => item.selected)} onClick={confirm} type="primary">Confirmar estrutura</Button></Space></PrismaCard>
  </PrismaPage>;
}

export function VacancyDetailPage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId: string }) {
  const [detail, setDetail] = useState<VacancyDetail | null>(null);
  const [history, setHistory] = useState<VacancyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void Promise.all([vacancyService.load(activeMembership.organizationId, vacancyId), vacancyService.history(activeMembership.organizationId, vacancyId)])
      .then(([item, historyItems]) => { if (current) { setDetail(item); setHistory(historyItems); } })
      .catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível carregar a Vaga.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);
  if (loading) return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 18 }} /></PrismaCard></PrismaPage>;
  if (!detail) return <PrismaPage><Alert showIcon title={error ?? "Vaga não encontrada."} type="error" /></PrismaPage>;
  const required = detail.requirements.filter((item) => item.importance === "required");
  const desired = detail.requirements.filter((item) => item.importance === "desired");
  return <PrismaPage className="prisma-vacancy-detail-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies")} type="text">Voltar para Vagas</Button>
    <div className="prisma-vacancy-detail-header"><div><Space wrap><Typography.Title level={1}>{detail.title}</Typography.Title><OccupancyTag occupancy={detail.occupancy} /></Space><div className="prisma-vacancy-meta"><span><ApartmentOutlined /> {detail.area || "Área não informada"}</span><span><EnvironmentOutlined /> {detail.location || "Localidade não informada"}</span>{detail.employmentType ? <span>{detail.employmentType}</span> : null}{detail.occupantName ? <span><UserOutlined /> Ocupada por {detail.occupantName}</span> : null}<span>Definição v{detail.version}</span></div></div><Space wrap><Button icon={<EditOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/edit`)}>Editar vaga</Button><Button icon={<TeamOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">{detail.occupancy === "occupied" ? "Avaliar Pessoa atual" : "Encontrar pessoas"}</Button></Space></div>
    {error ? <Alert showIcon title={error} type="error" /> : null}
    <Tabs items={[
      { key: "overview", label: "Visão geral", children: <div className="prisma-vacancy-detail-stack"><DetailSection icon={<AimOutlined />} title="Missão da vaga"><Typography.Paragraph>{detail.mission}</Typography.Paragraph></DetailSection><DetailList icon={<TeamOutlined />} items={detail.responsibilities} title="Responsabilidades" /><DetailList icon={<CheckCircleOutlined />} items={detail.expectedOutcomes} title="Resultados esperados" /><PrismaCard title={<span><StarOutlined /> O que procuramos</span>}><div className="prisma-vacancy-requirement-groups"><RequirementTags items={required} label="Obrigatório" /><RequirementTags items={desired} label="Desejável" /></div></PrismaCard><DetailTags icon={<EnvironmentOutlined />} items={detail.contextItems} title="Contexto" /></div> },
      { key: "people", label: "Pessoas encontradas", children: <Empty description="A descoberta é calculada sob demanda para não carregar todos os Perfis na abertura."><Button onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">Encontrar pessoas</Button></Empty> },
      { key: "history", label: "Histórico", children: <PrismaCard><List dataSource={history} locale={{ emptyText: "Nenhuma alteração registrada." }} renderItem={(item) => <List.Item><List.Item.Meta avatar={<HistoryOutlined />} title={historyLabel(item.type)} description={`${item.version ? `Definição v${item.version} · ` : ""}${formatDate(item.createdAt)}`} /></List.Item>} /></PrismaCard> },
    ]} />
  </PrismaPage>;
}

export function VacancyPeoplePage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId: string }) {
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [matches, setMatches] = useState<VacancyCandidateMatch[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeMatch, setActiveMatch] = useState<VacancyCandidateMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void vacancyService.load(activeMembership.organizationId, vacancyId).then(async (detail) => {
      if (!detail) throw new Error("A Vaga não foi encontrada.");
      const result = await vacancyService.findPeople(activeMembership.organizationId, detail, true);
      if (current) { setVacancy(detail); setMatches(result); }
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível encontrar Pessoas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);
  async function evaluate(match: VacancyCandidateMatch) {
    setActiveMatch(match);
    try { if (vacancy) await vacancyService.recordEvaluation(vacancy, match); }
    catch (caught) { setError(errorMessage(caught, "A aderência foi calculada, mas não pôde ser registrada.")); }
  }
  function toggle(personId: string) { setSelected((current) => current.includes(personId) ? current.filter((id) => id !== personId) : current.length < 2 ? [...current, personId] : [current[1]!, personId]); }
  return <PrismaPage className="prisma-vacancy-people-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}`)} type="text">Voltar para a Vaga</Button>
    <PrismaPageHeader title={vacancy ? `Pessoas para ${vacancy.title}` : "Pessoas encontradas"} description="Resultados internos explicados pelos requisitos desta Vaga, sem score e sem vencedor." actions={<Button disabled={selected.length !== 2} icon={<SwapOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}/compare/${selected.join("/")}`)} type="primary">Comparar selecionadas ({selected.length}/2)</Button>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {loading ? <PrismaCard><Skeleton active avatar paragraph={{ rows: 14 }} /></PrismaCard> : null}
    {!loading && !matches.length ? <PrismaCard><Empty description="Ainda não encontramos Perfis com evidências suficientes para estes critérios."><Space wrap><Button onClick={() => onNavigate(`/vacancies/${vacancyId}/edit`)}>Revisar requisitos</Button><Button onClick={() => onNavigate("/profiles/search")}>Consultar Pessoas manualmente</Button></Space></Empty></PrismaCard> : null}
    <div className="prisma-vacancy-match-list">{matches.map((match) => <CandidateMatchCard key={match.candidate.personId} match={match} onEvaluate={() => void evaluate(match)} onNavigate={onNavigate} onToggle={() => toggle(match.candidate.personId)} selected={selected.includes(match.candidate.personId)} />)}</div>
    <MatchDrawer match={activeMatch} onClose={() => setActiveMatch(null)} open={Boolean(activeMatch)} />
  </PrismaPage>;
}

export function VacancyComparePage({ activeMembership, onNavigate, personIds, vacancyId }: CommonProps & { personIds: [string, string]; vacancyId: string }) {
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [matches, setMatches] = useState<VacancyCandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void vacancyService.load(activeMembership.organizationId, vacancyId).then(async (detail) => {
      if (!detail) throw new Error("A Vaga não foi encontrada.");
      const result = await vacancyService.loadPeopleByIds(activeMembership.organizationId, detail, personIds, true);
      if (current) { setVacancy(detail); setMatches(result); }
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível comparar estas Pessoas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId, personIds[0], personIds[1]]);
  const rows = vacancy?.requirements.map((requirement) => ({ key: requirement.stableId, label: requirement.label,
    left: matches[0]?.requirements.find((item) => item.requirement.stableId === requirement.stableId), right: matches[1]?.requirements.find((item) => item.requirement.stableId === requirement.stableId) })) ?? [];
  return <PrismaPage className="prisma-vacancy-compare-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}/people`)} type="text">Voltar aos resultados</Button>
    <PrismaPageHeader title="Comparar pessoas" description={vacancy ? `Aderência por requisito da Vaga ${vacancy.title}. Sem score e sem vencedor.` : "Aderência por requisito da Vaga."} />
    {error ? <Alert showIcon title={error} type="error" /> : null}
    {loading ? <PrismaCard><Skeleton active paragraph={{ rows: 14 }} /></PrismaCard> : null}
    {!loading && matches.length !== 2 ? <PrismaCard><Empty description="Selecione exatamente duas Pessoas com Perfil publicado." /></PrismaCard> : null}
    {matches.length === 2 ? <>
      <div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard key={match.candidate.personId}><div className="prisma-match-person"><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small></div></div></PrismaCard>)}</div>
      <PrismaCard className="prisma-comparison-table"><Table columns={comparisonColumns(matches)} dataSource={rows} pagination={false} scroll={{ x: 620 }} /></PrismaCard>
      <div className="prisma-comparison-mobile">{rows.map((row) => <PrismaCard key={row.key} title={row.label}><div><strong>{matches[0]!.candidate.fullName}</strong>{row.left ? <MatchStatusTag status={row.left.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.left?.explanation}</Typography.Paragraph></div><div><strong>{matches[1]!.candidate.fullName}</strong>{row.right ? <MatchStatusTag status={row.right.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.right?.explanation}</Typography.Paragraph></div></PrismaCard>)}</div>
      <Typography.Title level={2}>Destaques objetivos</Typography.Title><div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard className="prisma-match-highlight-card" key={match.candidate.personId} title={match.candidate.fullName}><ul>{match.requirements.filter((item) => item.status !== "no_evidence").slice(0, 5).map((item) => <li key={item.requirement.stableId}><CheckCircleOutlined /> {item.explanation}</li>)}</ul></PrismaCard>)}</div>
    </> : null}
  </PrismaPage>;
}

function RequirementEditor({ item, onChange, onRemove }: { item: VacancyRequirementDraft; onChange: (item: VacancyRequirementDraft) => void; onRemove: () => void }) {
  return <div className="prisma-requirement-editor"><Input aria-label="Requisito" onChange={(event) => onChange({ ...item, label: event.target.value, observedTerm: event.target.value })} placeholder="Ex.: Gestão de pipeline" value={item.label} /><Select aria-label="Categoria do requisito" onChange={(value) => onChange({ ...item, category: value })} options={requirementCategoryOptions} value={item.category} /><Segmented onChange={(value) => onChange({ ...item, importance: value as VacancyRequirementDraft["importance"] })} options={[{ label: "Obrigatório", value: "required" }, { label: "Desejável", value: "desired" }]} value={item.importance} /><Select aria-label="Sinais relacionados confirmados" mode="tags" onChange={(values) => onChange({ ...item, relatedSignals: values.map((label) => ({ label, conceptId: null, origin: "operator" })) })} open={false} placeholder="Sinais relacionados, se confirmados" tokenSeparators={[",", ";"]} value={item.relatedSignals.map((signal) => signal.label)} /><Popconfirm description="Remover este requisito da definição atual?" onConfirm={onRemove} title="Remover requisito"><Button aria-label="Remover requisito" danger icon={<DeleteOutlined />} type="text" /></Popconfirm></div>;
}

function StringListEditor({ label, onChange, placeholder, values }: { label: string; onChange: (values: string[]) => void; placeholder: string; values: string[] }) {
  const [input, setInput] = useState("");
  function add() { const value = input.trim(); if (!value) return; onChange([...values, value]); setInput(""); }
  return <PrismaCard className="prisma-vacancy-form-section" title={label}><div className="prisma-string-list">{values.map((value, index) => <div key={`${value}-${index}`}><Input onChange={(event) => onChange(values.map((item, currentIndex) => currentIndex === index ? event.target.value : item))} value={value} /><Button aria-label={`Remover ${value}`} danger icon={<DeleteOutlined />} onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))} type="text" /></div>)}</div><Input onChange={(event) => setInput(event.target.value)} onPressEnter={add} placeholder={placeholder} suffix={<Button icon={<PlusOutlined />} onClick={add} size="small" type="text" />} value={input} /></PrismaCard>;
}

function CandidateMatchCard({ match, onEvaluate, onNavigate, onToggle, selected }: { match: VacancyCandidateMatch; onEvaluate: () => void; onNavigate: (path: string) => void; onToggle: () => void; selected: boolean }) {
  const met = match.requirements.filter((item) => item.status === "met");
  const related = match.requirements.filter((item) => item.status === "related_signal");
  const missing = match.requirements.filter((item) => item.status === "no_evidence");
  return <PrismaCard className={`prisma-vacancy-match-card${selected ? " is-selected" : ""}`}><article><header><Checkbox checked={selected} onChange={onToggle} /><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small></div><Space orientation="vertical"><Button onClick={() => onNavigate(`/profiles/${match.candidate.personId}/profile`)} type="primary">Ver perfil</Button><Button onClick={onEvaluate}>Avaliar aderência</Button></Space></header>{match.candidate.profileData.summary ? <Typography.Paragraph ellipsis={{ rows: 2 }}>{match.candidate.profileData.summary}</Typography.Paragraph> : null}<section className="prisma-match-reasons"><strong><FileSearchOutlined /> Por que apareceu</strong><Space wrap>{match.reasons.slice(0, 5).map((reason) => <Tag key={reason}>{reason}</Tag>)}</Space></section><div className="prisma-match-evidence-grid"><MatchBucket color="success" items={met.map((item) => item.requirement.label)} title={`Evidências encontradas (${met.length})`} /><MatchBucket color="warning" items={related.map((item) => `${item.relatedSignal}: sinal relacionado`)} title={`Sinais relacionados (${related.length})`} /><MatchBucket color="error" items={missing.map((item) => item.requirement.label)} title={`Ainda sem evidência suficiente (${missing.length})`} /></div></article></PrismaCard>;
}

function MatchDrawer({ match, onClose, open }: { match: VacancyCandidateMatch | null; onClose: () => void; open: boolean }) {
  return <Drawer onClose={onClose} open={open} size="large" title={match ? `Aderência de ${match.candidate.fullName}` : "Aderência"}>{match ? <><Alert title="Esta leitura compara evidências publicadas com a versão atual da Vaga. Não é avaliação de desempenho nem decisão de contratação." showIcon type="info" /><List dataSource={match.requirements} renderItem={(item) => <List.Item><List.Item.Meta avatar={<StatusIcon status={item.status} />} title={<Space wrap>{item.requirement.label}<MatchStatusTag status={item.status} /></Space>} description={<><Typography.Paragraph>{item.explanation}</Typography.Paragraph>{item.evidence.map((evidence) => <Tag key={`${evidence.source}-${evidence.label}`}>{evidence.label} · {evidence.source}</Tag>)}</>} /></List.Item>} /></> : null}</Drawer>;
}

function MatchBucket({ color, items, title }: { color: "success" | "warning" | "error"; items: string[]; title: string }) { return <section className={`prisma-match-bucket is-${color}`}><strong>{title}</strong>{items.length ? <Space wrap>{items.map((item) => <Tag color={color} key={item}>{item}</Tag>)}</Space> : <Typography.Text type="secondary">Nenhum item nesta categoria.</Typography.Text>}</section>; }
function AvatarInitials({ name }: { name: string }) { return <div aria-hidden="true" className="prisma-vacancy-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>; }
function OccupancyTag({ occupancy }: { occupancy: VacancyDraft["occupancy"] }) { return occupancy === "occupied" ? <Tag color="blue">Ocupada</Tag> : <Tag color="green">Não ocupada</Tag>; }
function MatchStatusTag({ status }: { status: VacancyMatchStatus }) { const map = { met: ["success", "Atendido"], partially_met: ["warning", "Parcial"], related_signal: ["purple", "Sinal relacionado"], no_evidence: ["error", "Sem evidência suficiente"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function StatusIcon({ status }: { status: VacancyMatchStatus }) { return status === "met" ? <CheckCircleOutlined className="is-success" /> : status === "no_evidence" ? <ExclamationCircleOutlined className="is-error" /> : <ClockCircleOutlined className="is-warning" />; }
function DetailSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) { return <PrismaCard title={<span>{icon} {title}</span>}>{children}</PrismaCard>; }
function DetailList({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}>{items.length ? <ul className="prisma-vacancy-editorial-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <Typography.Text type="secondary">Não informado.</Typography.Text>}</DetailSection>; }
function DetailTags({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}><Space wrap>{items.map((item) => <Tag key={item}>{item}</Tag>)}</Space></DetailSection>; }
function RequirementTags({ items, label }: { items: VacancyRequirementDraft[]; label: string }) { return <section><strong>{label}</strong><Space wrap>{items.length ? items.map((item) => <Tag color={label === "Obrigatório" ? "purple" : "blue"} key={item.stableId}>{item.label}</Tag>) : <Typography.Text type="secondary">Nenhum</Typography.Text>}</Space></section>; }

function vacancyColumns(onNavigate: (path: string) => void): ColumnsType<VacancySummary> { return [
  { title: "Vaga", dataIndex: "title", key: "title", render: (value, item) => <button className="prisma-vacancy-title-link" onClick={() => onNavigate(`/vacancies/${item.id}`)} type="button"><strong>{value}</strong><small>Definição v{item.definitionVersion}</small></button> },
  { title: "Área", dataIndex: "area", key: "area", responsive: ["md"], render: (value) => value || "Não informada" },
  { title: "Situação", dataIndex: "occupancy", key: "occupancy", render: (value) => <OccupancyTag occupancy={value} /> },
  { title: "Pessoa vinculada", dataIndex: "occupantName", key: "occupantName", responsive: ["lg"], render: (value) => value || "Nenhuma" },
  { title: "Ação", key: "action", align: "right", render: (_, item) => <Button onClick={() => onNavigate(item.occupancy === "occupied" ? `/vacancies/${item.id}/people` : `/vacancies/${item.id}/people`)}>{item.occupancy === "occupied" ? "Avaliar aderência" : "Encontrar pessoas"}</Button> },
]; }

function comparisonColumns(matches: VacancyCandidateMatch[]): ColumnsType<{ key: string; label: string; left: VacancyCandidateMatch["requirements"][number] | undefined; right: VacancyCandidateMatch["requirements"][number] | undefined }> { return [
  { title: "Requisito da Vaga", dataIndex: "label", key: "label", fixed: "left", width: 220 },
  { title: matches[0]?.candidate.fullName ?? "Pessoa A", dataIndex: "left", key: "left", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
  { title: matches[1]?.candidate.fullName ?? "Pessoa B", dataIndex: "right", key: "right", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
]; }

const requirementCategoryOptions = [
  ["experience", "Experiência"], ["competency", "Competência"], ["knowledge", "Conhecimento"], ["technology", "Tecnologia/ferramenta"],
  ["education", "Formação"], ["certification", "Certificação"], ["language", "Idioma"], ["context", "Contexto"],
].map(([value, label]) => ({ value: value as VacancyRequirementCategory, label }));
const workArrangementOptions = [{ value: "onsite", label: "Presencial" }, { value: "hybrid", label: "Híbrido" }, { value: "remote", label: "Remoto" }, { value: "flexible", label: "Flexível" }];

function answerVacancyQuestion(question: string, draft: VacancyDraft): string {
  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion) return "Escreva uma pergunta objetiva sobre a definição desta Vaga.";
  if (/requisit|exig[eê]ncia|demais|muitos/.test(normalizedQuestion)) {
    const required = draft.requirements.filter((item) => item.importance === "required").length;
    const requirementLabel = required === 1 ? "requisito obrigatório" : "requisitos obrigatórios";
    return required > 6
      ? `Há ${required} ${requirementLabel}. Vale revisar quais são realmente indispensáveis e mover diferenciais para Desejável.`
      : `Há ${required} ${requirementLabel}. A quantidade não indica um problema por si só; confirme se cada item é indispensável para esta necessidade específica.`;
  }
  if (/t[ií]tulo|nome/.test(normalizedQuestion)) return draft.title.trim()
    ? `O título atual é “${draft.title.trim()}”. Verifique se ele representa a necessidade específica sem misturar nível, área e contexto desnecessariamente.`
    : "O título ainda não foi informado. Prefira o nome reconhecido da função e mantenha contexto específico nos demais campos.";
  if (/miss[aã]o|prop[oó]sito/.test(normalizedQuestion)) return draft.mission.trim()
    ? "A missão está preenchida. Confirme se ela descreve propósito e impacto, sem repetir uma lista de atividades."
    : "A missão ainda está vazia. Resuma em uma frase por que esta posição existe e qual resultado principal ela viabiliza.";
  return "Posso orientar sobre título, missão ou quantidade de requisitos usando apenas os campos atuais. Outras análises exigem uma pergunta mais específica ou evidência adicional.";
}

function groupSuggestions(items: VacancyStructureSuggestion[]): Record<string, VacancyStructureSuggestion[]> { const labels: Record<string, string> = { mission: "Missão", responsibility: "Responsabilidades", outcome: "Resultados esperados", experience: "Experiência", competency: "Competências", knowledge: "Conhecimentos", technology: "Tecnologias e ferramentas", education: "Formação", certification: "Certificações", language: "Idiomas", context: "Contexto" }; return items.reduce<Record<string, VacancyStructureSuggestion[]>>((groups, item) => { const key = labels[item.category] ?? item.category; (groups[key] ??= []).push(item); return groups; }, {}); }
function inferTitle(value: string): string { return value.match(/(?:busca(?:mos)?|procuramos)\s+(?:de\s+)?(?:um|uma)\s+([^,.]+)/i)?.[1]?.trim() ?? ""; }
function historyLabel(value: string): string { return ({ created: "Vaga criada", definition_updated: "Definição atualizada", occupancy_updated: "Ocupação atualizada", match_evaluated: "Aderência avaliada" } as Record<string, string>)[value] ?? "Atualização registrada"; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
function errorMessage(value: unknown, fallback: string): string { return value instanceof Error ? value.message : fallback; }
function persistDraft(draft: VacancyDraft): void { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
function readDraft(): VacancyDraft { try { const raw = window.sessionStorage.getItem(DRAFT_KEY); return raw ? { ...emptyVacancyDraft(), ...JSON.parse(raw) as VacancyDraft } : emptyVacancyDraft(); } catch { return emptyVacancyDraft(); } }
function clearDraft(): void { window.sessionStorage.removeItem(DRAFT_KEY); }
