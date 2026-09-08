import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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
  InfoCircleOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
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
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  applyStructuredDescription,
  applyVacancyRestructureDelta,
  answerVacancyQuestion,
  emptyVacancyDraft,
  inferRequirementCategory,
  materializeVacancyFromProfessionalReference,
  newVacancyRequirement,
  occupationResolutionMessage,
  sortVacancyMatches,
  structureVacancyDescription,
  sourceKindAfterOccupationReference,
  compareVacancyRequirements,
  validateVacancyDraft,
  vacancyRequirementCategories,
  vacancyRequirementCategoryLabel,
  type VacancyCandidateMatch,
  type VacancyAdvisorAnswer,
  type VacancyDetail,
  type VacancyDraft,
  type VacancyMatchStatus,
  type VacancyPeopleDiscovery,
  type VacancyPositionRelationDecision,
  type VacancyPositionRelationStatus,
  type VacancyRequirementDraft,
  type VacancyStructureSuggestion,
  type VacancySummary,
  type OccupationResolution,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function removeVacancy(item: VacancySummary) {
    setDeletingId(item.id); setError(null);
    try {
      await vacancyService.cancel(activeMembership.organizationId, item.id);
      setItems((current) => current.filter((vacancy) => vacancy.id !== item.id));
      setPage((current) => Math.min(current, Math.max(1, Math.ceil((items.length - 1) / PAGE_SIZE))));
    } catch (caught) {
      setError(errorMessage(caught, "Não foi possível excluir a Vaga."));
    } finally {
      setDeletingId(null);
    }
  }

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
      <div className="prisma-vacancy-table-wrap"><Table<VacancySummary> columns={vacancyColumns(onNavigate, removeVacancy, deletingId)} dataSource={visible} pagination={false} rowKey="id" /></div>
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
  const [advisorAnswer, setAdvisorAnswer] = useState<VacancyAdvisorAnswer | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorScope, setAdvisorScope] = useState<"market" | "internal">("market");
  const [advisorHelpOpen, setAdvisorHelpOpen] = useState(false);
  const [occupationResolution, setOccupationResolution] = useState<OccupationResolution | null>(null);
  const [occupationLoading, setOccupationLoading] = useState(false);
  const [referencePreparing, setReferencePreparing] = useState(false);
  const [referencePrepared, setReferencePrepared] = useState(false);
  const [occupationExplorerOpen, setOccupationExplorerOpen] = useState(false);
  const [restructureOpen, setRestructureOpen] = useState(false);
  const [restructureDescription, setRestructureDescription] = useState("");
  const [restructureDelta, setRestructureDelta] = useState<ReturnType<typeof compareVacancyRequirements>>([]);
  const [validationTarget, setValidationTarget] = useState<"occupation" | "title" | "occupant" | "requirement" | null>(null);
  const occupationReferenceRef = useRef<HTMLDivElement>(null);

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
  function focusValidationTarget(target: "occupation" | "title" | "occupant" | "requirement") {
    setValidationTarget(target);
    if (target === "occupation") window.requestAnimationFrame(() => occupationReferenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
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
  async function useProfessionalReference(conceptId: string) {
    const reference = references.find((item) => item.conceptId === conceptId); if (!reference) return;
    if (draft.sourceKind === "assisted_description") {
      setDraft((current) => ({ ...current, referenceConceptId: conceptId, title: current.title || reference.label }));
      setReferencePrepared(false); setValidationTarget(null); return;
    }
    const hasHumanContent = Boolean(draft.title || draft.mission || draft.responsibilities.length || draft.requirements.length);
    if (hasHumanContent && draft.sourceKind !== "knowledge_reference" && !window.confirm("Esta referência prepara uma nova proposta e substituirá o conteúdo ainda não salvo. Deseja continuar?")) return;
    setReferencePreparing(true); setError(null);
    try {
      const proposal = await vacancyService.loadProfessionalReferenceProposal(activeMembership.organizationId, conceptId);
      setDraft((current) => materializeVacancyFromProfessionalReference(current, proposal));
      setReferencePrepared(true); setValidationTarget(null);
    } catch (caught) { setError(errorMessage(caught, "Não foi possível preparar a estrutura a partir da referência profissional.")); }
    finally { setReferencePreparing(false); }
  }
  async function resolveOccupation() {
    if (draft.title.trim().length < 2) return;
    setOccupationLoading(true);
    try {
      const resolution = await vacancyService.resolveOccupationV2(activeMembership.organizationId, draft.title, vacancyId ?? null);
      setOccupationResolution(resolution);
      if (resolution.status === "resolved" && resolution.canonicalConceptId) {
        setDraft((current) => ({ ...current, referenceConceptId: resolution.canonicalConceptId, sourceKind: current.sourceKind === "manual" ? "knowledge_reference" : current.sourceKind })); setValidationTarget(null);
      }
    } catch (caught) { setOccupationResolution(null); setError(errorMessage(caught, "A referência profissional não está disponível agora. O rascunho foi preservado para nova tentativa.")); }
    finally { setOccupationLoading(false); }
  }
  async function selectOfficialOccupation(externalId: string) {
    if (!occupationResolution) return;
    try { const conceptId = await vacancyService.selectOfficialOccupation(activeMembership.organizationId, occupationResolution.attemptId, externalId); const candidate = occupationResolution.candidates.find((item) => item.externalId === externalId); setDraft((current) => ({ ...current, referenceConceptId: conceptId, sourceKind: sourceKindAfterOccupationReference(current), title: current.title || candidate?.label || current.title })); setValidationTarget(null); setOccupationResolution({ ...occupationResolution, status: "resolved", decisionOrigin: "human_reconciliation", canonicalConceptId: conceptId, canonicalLabel: candidate?.label ?? draft.title }); setOccupationExplorerOpen(false); }
    catch (caught) { setError(errorMessage(caught, "Não foi possível registrar a referência oficial.")); }
  }
  async function enableManualOccupation() {
    if (!occupationResolution) return;
    try { await vacancyService.declareNoOfficialOccupation(activeMembership.organizationId, occupationResolution.attemptId); setOccupationResolution({ ...occupationResolution, status: "manual_allowed", decisionOrigin: "no_official_reference" }); }
    catch (caught) { setError(errorMessage(caught, "Não foi possível registrar a ausência de referência oficial.")); }
  }
  async function createManualOccupation() {
    if (!occupationResolution) return;
    try { const conceptId = await vacancyService.createManualOccupation(activeMembership.organizationId, occupationResolution.attemptId, draft.title); setDraft((current) => ({ ...current, referenceConceptId: conceptId, sourceKind: sourceKindAfterOccupationReference(current) })); setValidationTarget(null); setOccupationResolution({ ...occupationResolution, status: "resolved", decisionOrigin: "manual_organization_concept", canonicalConceptId: conceptId, canonicalLabel: draft.title }); setOccupationExplorerOpen(false); }
    catch (caught) { setError(errorMessage(caught, "Não foi possível criar o conceito ocupacional interno.")); }
  }
  async function save() {
    const errors = validateVacancyDraft(draft);
    if (errors.length) {
      const target = errors.some((item) => /título/i.test(item)) ? "title" : errors.some((item) => /Pessoa que ocupa/i.test(item)) ? "occupant" : "requirement";
      focusValidationTarget(target); setError(errors.join(" ")); return;
    }
    if (!draft.referenceConceptId) { focusValidationTarget("occupation"); setError("Conclua a resolução ocupacional pela referência oficial ou, após o explorador, pelo conceito interno da empresa antes de salvar a Vaga."); return; }
    setSaving(true); setError(null);
    try {
      const result = await vacancyService.save(activeMembership.organizationId, draft);
      clearDraft(); onNavigate(`/vacancies/${result.id}`);
    } catch (caught) { setError(errorMessage(caught, "Não foi possível salvar a Vaga.")); }
    finally { setSaving(false); }
  }
  function previewRestructure() {
    const suggestions = structureVacancyDescription(restructureDescription);
    const proposed = applyStructuredDescription({ ...emptyVacancyDraft(), requirements: [] }, restructureDescription, suggestions).requirements;
    setRestructureDelta(compareVacancyRequirements(draft.requirements, proposed));
  }
  function applyRestructure() {
    const suggestions = structureVacancyDescription(restructureDescription);
    const rebuilt = applyStructuredDescription({ ...draft, requirements: [] }, restructureDescription, suggestions);
    setDraft({ ...rebuilt, requirements: applyVacancyRestructureDelta(draft.requirements, restructureDelta), structureSource: { originalDescription: restructureDescription, contractVersion: rebuilt.structureSource?.contractVersion ?? "vacancy-structure-profile-aligned-2.1.0", structuredAt: new Date().toISOString(), items: rebuilt.structureSource?.items ?? [] } });
    setRestructureOpen(false); setRestructureDelta([]);
  }
  async function askAdvisor() {
    if (!advisorQuestion.trim()) {
      setAdvisorAnswer(answerVacancyQuestion("", draft, { otherVacancies: previous, roles: [], knowledge: [], knowledgeLookupAvailable: true }));
      return;
    }
    setAdvisorLoading(true);
    let knowledgeLookupAvailable = true;
    let knowledge: Awaited<ReturnType<typeof vacancyService.suggestAdvisorKnowledge>> = [];
    try { knowledge = await vacancyService.suggestAdvisorKnowledge(activeMembership.organizationId, advisorQuestion); }
    catch { knowledgeLookupAvailable = false; }
    const answer = answerVacancyQuestion(advisorQuestion, draft, {
      otherVacancies: previous.map((item) => ({ title: item.title, area: item.area })),
      roles: roles.map((item) => ({ name: item.name, requirements: item.requirements.map((requirement) => requirement.label) })),
      knowledge: knowledge.map((item) => ({ label: item.label, scope: item.scope, source: item.source, relatedLabels: item.relatedLabels })),
      knowledgeLookupAvailable,
    });
    if (advisorScope === "market") {
      try {
        const research = await vacancyService.researchAdvisorMarket({
          organizationId: activeMembership.organizationId,
          question: advisorQuestion,
          roleTitle: draft.title,
          area: draft.area,
        });
        setAdvisorAnswer({
          ...answer,
          market: [research.marketSummary, ...research.caveats].filter(Boolean).join(" "),
          suggestion: research.recommendation || answer.suggestion,
          sources: research.sources,
          webSearched: true,
        });
      } catch (caught) {
        setAdvisorAnswer({ ...answer, market: errorMessage(caught, "Não foi possível consultar o mercado agora. A análise interna foi preservada."), sources: [], webSearched: false });
      }
    } else {
      setAdvisorAnswer({ ...answer, market: "Você escolheu consultar somente as fontes internas autorizadas: a Vaga atual, Vagas e funções acessíveis da empresa e a Knowledge publicada disponível.", sources: [], webSearched: false });
    }
    setAdvisorLoading(false);
  }
  function addAdvisorRequirement() {
    const proposed = advisorAnswer?.suggestedRequirement;
    if (!proposed || draft.requirements.some((item) => normalize(item.label) === normalize(proposed.label))) return;
    update("requirements", [...draft.requirements, { ...newVacancyRequirement(proposed.label), importance: proposed.importance }]);
    setAdvisorAnswer(null);
  }

  if (loading) return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 18 }} /></PrismaCard></PrismaPage>;
  return <PrismaPage className="prisma-vacancy-editor-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")} type="text">Voltar</Button>
    <PrismaPageHeader title={vacancyId ? "Editar vaga" : "Nova vaga"} description="Explique a necessidade em blocos simples. O Prisma preserva a estrutura e a versão usadas nas avaliações." actions={<Space>{vacancyId && draft.structureSource ? <Button onClick={() => { setRestructureDescription(draft.structureSource?.originalDescription ?? ""); setRestructureOpen(true); }}>Editar descrição e reestruturar</Button> : null}{savedLocally ? <Tag icon={<CheckCircleOutlined />} color="success">Rascunho salvo neste navegador</Tag> : null}</Space>} />
    {error ? <Alert closable onClose={() => { setError(null); setValidationTarget(null); }} showIcon title={error} type="error" /> : null}
    {!vacancyId ? <PrismaCard className={`prisma-vacancy-start-card ${validationTarget === "occupation" ? "has-validation-error" : ""}`} title="Como você quer começar?">
      <div><label>Função da empresa<Select allowClear onChange={useRole} options={roles.map((item) => ({ label: item.name, value: item.id }))} placeholder="Usar uma função validada" /></label></div>
      <div><label>Vaga anterior<Select allowClear onChange={(value) => void usePrevious(value)} options={previous.map((item) => ({ label: item.title, value: item.id }))} placeholder="Reutilizar somente a definição" /></label></div>
      <div className={validationTarget === "occupation" ? "prisma-vacancy-reference-field has-validation-error" : "prisma-vacancy-reference-field"} ref={occupationReferenceRef}><label>Referência profissional<Select allowClear disabled={referencePreparing} filterOption={false} loading={referencePreparing} onSearch={(value) => void searchReferences(value)} onSelect={(value) => void useProfessionalReference(value)} options={references.map((item) => ({ label: `${item.label} · ${item.scope === "global" ? "Global" : "Empresa"}`, value: item.conceptId }))} placeholder="Buscar na Knowledge" showSearch /></label>{referencePreparing ? <Typography.Text type="secondary">Prisma está preparando a estrutura da Vaga...</Typography.Text> : null}{referencePrepared ? <Typography.Text type="secondary">Estrutura preparada a partir da referência profissional selecionada. Revise e adapte para a necessidade da sua empresa.</Typography.Text> : null}{validationTarget === "occupation" ? <Typography.Text className="prisma-field-validation-message" role="alert" type="danger">Selecione a referência profissional ou conclua a decisão no Explorador de Referências Oficiais.</Typography.Text> : null}</div>
      <Button icon={<RobotOutlined />} onClick={() => onNavigate("/vacancies/assist")}>Começar com uma descrição</Button>
    </PrismaCard> : null}
    <Form layout="vertical" onFinish={() => void save()} onKeyDown={(event) => {
      const target = event.target as HTMLElement;
      if (event.key === "Enter" && target instanceof HTMLInputElement && !target.closest(".ant-select")) event.preventDefault();
    }}>
      <PrismaCard className="prisma-vacancy-form-section" title="1. Informações básicas">
        <div className="prisma-vacancy-form-grid">
          <Form.Item {...(validationTarget === "title" ? { help: "Informe o título da Vaga.", validateStatus: "error" as const } : {})} label="Título da Vaga" required><Input maxLength={240} onBlur={() => void resolveOccupation()} onChange={(event) => { update("title", event.target.value); setOccupationResolution(null); if (validationTarget === "title") setValidationTarget(null); }} placeholder="Ex.: Gerente Comercial Enterprise" value={draft.title} /></Form.Item>
          <Form.Item label="Área"><Input onChange={(event) => update("area", event.target.value)} placeholder="Ex.: Comercial" value={draft.area} /></Form.Item>
          <Form.Item label="Localidade"><Input onChange={(event) => update("location", event.target.value)} placeholder="Ex.: São Paulo, SP" value={draft.location} /></Form.Item>
          <Form.Item label="Regime de trabalho"><Select allowClear onChange={(value) => update("workArrangement", value ?? null)} options={workArrangementOptions} placeholder="Não informado" value={draft.workArrangement} /></Form.Item>
          <Form.Item label="Tipo de vínculo"><Input onChange={(event) => update("employmentType", event.target.value)} placeholder="Ex.: CLT" value={draft.employmentType} /></Form.Item>
          <Form.Item label="Situação de ocupação"><Segmented block onChange={(value) => setDraft((current) => ({ ...current, occupancy: value as VacancyDraft["occupancy"], occupantPersonId: value === "occupied" ? current.occupantPersonId : null }))} options={[{ label: "Não ocupada", value: "vacant" }, { label: "Ocupada", value: "occupied" }]} value={draft.occupancy} /></Form.Item>
        </div>
        {occupationLoading ? <Typography.Text type="secondary">Consultando referências profissionais oficiais...</Typography.Text> : null}
        {occupationResolution ? <Alert showIcon type={occupationResolution.status === "resolved" ? "success" : "info"} message={occupationResolutionMessage(occupationResolution)} description={occupationResolution.status === "needs_human_review" ? <Button onClick={() => setOccupationExplorerOpen(true)} size="small" type="primary">Explorar ESCO e O*NET</Button> : occupationResolution.status === "manual_allowed" ? <Button onClick={() => void createManualOccupation()} size="small" type="primary">Cadastrar conceito interno da empresa</Button> : undefined} /> : null}
        {draft.occupancy === "occupied" ? <Form.Item {...(validationTarget === "occupant" ? { help: "Selecione a Pessoa que ocupa esta posição.", validateStatus: "error" as const } : {})} label="Pessoa que ocupa a posição" required><Select showSearch optionFilterProp="label" onChange={(value) => { update("occupantPersonId", value); if (validationTarget === "occupant") setValidationTarget(null); }} options={occupants} placeholder="Selecione uma Pessoa existente" value={draft.occupantPersonId} /></Form.Item> : null}
      </PrismaCard>
      <Drawer destroyOnClose onClose={() => setOccupationExplorerOpen(false)} open={occupationExplorerOpen} title="Explorador de Referências Oficiais" width={560}>
        <Typography.Paragraph>Escolha uma referência ESCO ou O*NET somente se ela representar a Vaga. Esta escolha cria uma reconciliação reutilizável apenas para a empresa.</Typography.Paragraph>
        <List dataSource={occupationResolution?.candidates ?? []} locale={{ emptyText: "Nenhuma referência oficial foi encontrada no snapshot consultado." }} renderItem={(candidate) => <List.Item actions={[<Button key="select" onClick={() => void selectOfficialOccupation(candidate.externalId)} type="primary">Usar referência</Button>]}><List.Item.Meta title={`${candidate.label} · ${candidate.sourceName}`} description={`${candidate.externalId}${candidate.description ? ` · ${candidate.description}` : ""}`} /></List.Item>} />
        <Button danger onClick={() => void enableManualOccupation()}>Não existe referência oficial aplicável</Button>
      </Drawer>
      <Drawer destroyOnClose onClose={() => setRestructureOpen(false)} open={restructureOpen} title="Editar descrição e reestruturar" width={680}>
        <Typography.Paragraph>O Prisma comparará a nova descrição com a estrutura atual. Decisões humanas e requisitos manuais permanecem; itens não encontrados nunca são removidos automaticamente.</Typography.Paragraph>
        <Input.TextArea maxLength={5000} onChange={(event) => setRestructureDescription(event.target.value)} rows={10} value={restructureDescription} />
        <Space style={{ marginTop: 12 }}><Button disabled={!restructureDescription.trim()} onClick={previewRestructure} type="primary">Reestruturar e comparar</Button></Space>
        {restructureDelta.length ? <div className="prisma-restructure-delta">{restructureDelta.map((item) => <div key={item.requirement.stableId}><Tag color={item.kind === "new" ? "blue" : item.kind === "not_found" ? "gold" : "green"}>{({ maintained: "Mantido", new: "Novo", changed: "Alterado", not_found: "Não encontrado" } as Record<string, string>)[item.kind]}</Tag><span>{item.requirement.label}</span>{item.kind === "not_found" ? <Space><Button size="small">Manter requisito</Button><Button danger onClick={() => setRestructureDelta((current) => current.filter((candidate) => candidate.requirement.stableId !== item.requirement.stableId))} size="small">Remover requisito</Button></Space> : null}</div>)}</div> : null}
        {restructureDelta.length ? <Button onClick={applyRestructure} type="primary">Aplicar reestruturação</Button> : null}
      </Drawer>
      <PrismaCard className="prisma-vacancy-form-section" title="2. Sobre a posição"><Typography.Text type="secondary">Contextualize de forma breve o propósito da posição, sem listar tarefas.</Typography.Text><Input.TextArea maxLength={700} onChange={(event) => update("mission", event.target.value)} rows={4} showCount value={draft.mission} /></PrismaCard>
      <div className="prisma-vacancy-two-columns">
        <StringListEditor label="3. Responsabilidades" onChange={(value) => update("responsibilities", value)} placeholder="O que esta Pessoa fará?" values={draft.responsibilities} />
        <StringListEditor label="4. Resultados esperados" onChange={(value) => update("expectedOutcomes", value)} placeholder="O que esperamos que esta Pessoa entregue?" values={draft.expectedOutcomes} />
      </div>
      <PrismaCard className="prisma-vacancy-form-section" title="5. Requisitos da Vaga">
        <Typography.Paragraph type="secondary">O Prisma propõe a dimensão profissional. A decisão entre obrigatório e desejável é sempre sua.</Typography.Paragraph>
        <Space wrap><Button onClick={() => update("requirements", draft.requirements.map((item) => ({ ...item, importance: "required", importanceConfirmed: true })))}>Todos obrigatórios</Button><Button onClick={() => update("requirements", draft.requirements.map((item) => ({ ...item, importance: "desired", importanceConfirmed: true })))}>Todos desejáveis</Button><Button type="primary">Quero classificar</Button></Space>
        <div className="prisma-requirement-editor-list">{draft.requirements.map((item, index) => <RequirementEditor invalid={validationTarget === "requirement" && !item.label.trim()} item={item} key={item.stableId} onChange={(next) => { update("requirements", draft.requirements.map((current, currentIndex) => currentIndex === index ? next : current)); if (validationTarget === "requirement" && next.label.trim()) setValidationTarget(null); }} onRemove={() => update("requirements", draft.requirements.filter((_, currentIndex) => currentIndex !== index))} />)}</div>
        {validationTarget === "requirement" ? <Typography.Text className="prisma-field-validation-message" role="alert" type="danger">Preencha ou remova o requisito sem descrição.</Typography.Text> : null}
        <Button icon={<PlusOutlined />} onClick={() => update("requirements", [...draft.requirements, newVacancyRequirement()])} type="link">Adicionar requisito</Button>
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section" title={<span>6. Contexto da vaga <Tooltip title="Use este campo para explicar o cenário da vaga: o momento da área, o desafio da posição e o ambiente em que essa Pessoa irá atuar. Requisitos profissionais ficam no item 5."><InfoCircleOutlined aria-label="Para que serve o contexto da vaga?" /></Tooltip></span>}>
        <Typography.Paragraph type="secondary"><strong>Para que serve?</strong> Use este campo para explicar o cenário da vaga: o momento da área, o desafio da posição e o ambiente em que essa Pessoa irá atuar. Não use este espaço para requisitos do candidato; esses ficam em “O que a Pessoa precisa trazer”.</Typography.Paragraph>
        <Input.TextArea onChange={(event) => update("contextItems", event.target.value ? [event.target.value] : [])} placeholder="Ex.: A área está sendo estruturada e precisa ganhar previsibilidade comercial. A pessoa terá autonomia para revisar processos e apoiar o crescimento da equipe." rows={5} value={draft.contextItems.join("\n\n")} />
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section prisma-vacancy-advisor" title={<span><RobotOutlined /> Assistente Prisma</span>}>
        <Typography.Paragraph type="secondary">Pergunte livremente sobre a Vaga. Por padrão, o Prisma consulta fontes externas aprovadas e mostra as referências usadas. Escolha “Somente fontes internas” apenas quando não quiser consultar o mercado. Não inclua nomes ou dados pessoais. Nenhuma resposta altera dados automaticamente.</Typography.Paragraph>
        <Space align="center" wrap><strong>Onde pesquisar?</strong><Segmented onChange={(value) => setAdvisorScope(value as "market" | "internal")} options={[{ label: "Mercado e fontes externas", value: "market" }, { label: "Somente fontes internas", value: "internal" }]} value={advisorScope} /><Button icon={<QuestionCircleOutlined />} onClick={() => setAdvisorHelpOpen(true)} type="text">Como funciona?</Button></Space>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 7 }} onChange={(event) => setAdvisorQuestion(event.target.value)} onPressEnter={(event) => { if (!event.shiftKey) { event.preventDefault(); void askAdvisor(); } }} placeholder="Ex.: O que está faltando nesta vaga de Product Owner?" value={advisorQuestion} />
        <div className="prisma-vacancy-advisor-submit"><Typography.Text type="secondary">Enter para enviar, Shift + Enter para nova linha</Typography.Text><Button disabled={!advisorQuestion.trim()} icon={<BulbOutlined />} loading={advisorLoading} onClick={() => void askAdvisor()} type="primary">Perguntar ao Prisma</Button></div>
        {advisorAnswer ? <div className="prisma-vacancy-advisor-answer">
          <section><Space><strong>Na sua empresa</strong><Tag color={advisorAnswer.internalStatus === "sufficient" ? "success" : advisorAnswer.internalStatus === "partial" ? "gold" : "default"}>{({ sufficient: "Informação suficiente", partial: "Informação parcial", insufficient: "Informação insuficiente" } as const)[advisorAnswer.internalStatus]}</Tag></Space><Typography.Paragraph>{advisorAnswer.internal}</Typography.Paragraph></section>
          <section><Space><strong>No mercado</strong><Tag color={advisorAnswer.webSearched ? "blue" : "default"}>{advisorAnswer.webSearched ? "Web pesquisada agora" : "Somente contexto interno"}</Tag></Space><Typography.Paragraph>{advisorAnswer.market}</Typography.Paragraph></section>
          {advisorAnswer.sources.length ? <section className="prisma-vacancy-advisor-sources"><strong>Fontes consultadas</strong>{advisorAnswer.sources.map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank"><LinkOutlined /> {source.title} · {source.publisher}</a>)}</section> : null}
          <section><strong>Sugestão do Prisma</strong><Typography.Paragraph>{advisorAnswer.suggestion}</Typography.Paragraph></section>
          <footer><Button onClick={() => setAdvisorAnswer(null)}>Ignorar</Button>{advisorAnswer.suggestedRequirement ? <Button onClick={addAdvisorRequirement} type="primary">Adicionar à vaga</Button> : null}{advisorAnswer.allowKnowledgeReview ? <Button onClick={() => onNavigate("/knowledge")}>Revisar na Knowledge</Button> : null}</footer>
        </div> : null}
        <Modal footer={<Button onClick={() => setAdvisorHelpOpen(false)} type="primary">Entendi</Button>} onCancel={() => setAdvisorHelpOpen(false)} open={advisorHelpOpen} title="Como o Assistente Prisma pesquisa">
          <Typography.Paragraph><strong>Mercado e fontes externas</strong> é o modo padrão. Qualquer pergunta enviada consulta fontes externas aprovadas e apresenta uma síntese, ressalvas e links para as fontes utilizadas.</Typography.Paragraph>
          <Typography.Paragraph><strong>Somente fontes internas</strong> não consulta a Web. A resposta usa apenas a Vaga atual, Vagas e funções acessíveis da empresa e conceitos publicados na Knowledge permitida.</Typography.Paragraph>
          <Typography.Paragraph><strong>Exemplos de mercado:</strong> “Quais competências são mais pedidas para esta função?”; “Como essa posição aparece em empresas maiores?”; “Quais tecnologias são relevantes hoje?”</Typography.Paragraph>
          <Typography.Paragraph><strong>Exemplos internos:</strong> “O que esta Vaga exige?”; “Quais requisitos aparecem nas nossas Vagas?”; “O que a empresa já registra sobre esta tecnologia?”</Typography.Paragraph>
          <Typography.Paragraph>Na pesquisa externa, o Prisma envia somente a pergunta, o título e a área da Vaga, o idioma e a data. Não envia Pessoas, Perfis, currículos, descrição completa da Vaga, nome da empresa ou dados pessoais. A mesma consulta pode reutilizar um resultado verificado das últimas 24 horas.</Typography.Paragraph>
          <Typography.Paragraph>Nenhuma resposta altera a Vaga automaticamente. Fontes externas só são usadas quando aprovadas e verificáveis; se a pesquisa não puder ocorrer, a análise interna é preservada e o Prisma informa a falha.</Typography.Paragraph>
        </Modal>
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-save-bar"><Checkbox checked={draft.saveAsRole} onChange={(event) => update("saveAsRole", event.target.checked)}>Usar esta definição como referência da empresa</Checkbox><Space><Button onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")}>Cancelar</Button><Button htmlType="submit" loading={saving} type="primary">Salvar vaga</Button></Space></PrismaCard>
    </Form>
  </PrismaPage>;
}

export function VacancyAssistPage({ onNavigate }: CommonProps) {
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<VacancyStructureSuggestion[]>([]);
  const [reviewRequirements, setReviewRequirements] = useState<VacancyRequirementDraft[]>([]);
  const [classificationMode, setClassificationMode] = useState<"batch" | "individual">("batch");
  function analyze() {
    const next = structureVacancyDescription(description);
    setSuggestions(next);
    setReviewRequirements(applyStructuredDescription(emptyVacancyDraft(), description, next).requirements);
    setClassificationMode("batch");
  }
  function confirm() {
    const base = readDraft();
    const structured = { ...applyStructuredDescription({ ...base, title: base.title || inferTitle(description) }, description, suggestions), requirements: reviewRequirements };
    persistDraft(structured); onNavigate("/vacancies/new");
  }
  return <PrismaPage className="prisma-vacancy-assist-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies/new")} type="text">Voltar para Nova vaga</Button>
    <PrismaPageHeader title="Estruturar vaga com ajuda do Prisma" description="Descrição da vaga é a fonte original. A estrutura sugerida é uma interpretação revisável, sem enriquecimento externo." />
    <Alert icon={<RobotOutlined />} message="A assistência externa permanece desativada. Esta preparação é determinística, não envia dados a terceiros e não salva nada antes da sua revisão." showIcon type="info" />
    <div className="prisma-vacancy-assist-grid">
      <PrismaCard title="1. Descrição da vaga · fonte original"><Input.TextArea maxLength={5000} onChange={(event) => setDescription(event.target.value)} placeholder="Cole aqui a descrição profissional..." rows={23} showCount value={description} /><div className="prisma-vacancy-assist-actions"><Button icon={<DeleteOutlined />} onClick={() => { setDescription(""); setSuggestions([]); }}>Limpar texto</Button><Button disabled={!description.trim()} icon={<BulbOutlined />} onClick={analyze} type="primary">Estruturar descrição</Button></div></PrismaCard>
      <PrismaCard title="2. Revisar e ajustar">
        {!suggestions.length ? <Empty description="A estrutura sugerida aparecerá aqui para revisão." /> : <><section className="prisma-assist-suggestion-group"><strong>Sobre a posição, responsabilidades e resultados</strong>{suggestions.filter((item) => ["mission", "responsibility", "outcome", "context"].includes(item.category)).map((item) => <Checkbox checked={item.selected} key={item.id} onChange={(event) => setSuggestions((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: event.target.checked } : candidate))}><span>{item.label}</span><small>{item.category === "mission" ? "Sobre a posição" : item.category === "context" ? "Contexto consolidado em Sobre a posição" : item.category === "responsibility" ? "Responsabilidade" : "Resultado esperado"}</small></Checkbox>)}</section><section className="prisma-assist-suggestion-group"><strong>Requisitos identificados pelo Prisma</strong><Space wrap><Button onClick={() => { setReviewRequirements((current) => current.map((item) => ({ ...item, importance: "required", importanceConfirmed: true }))); setClassificationMode("batch"); }}>Todos obrigatórios</Button><Button onClick={() => { setReviewRequirements((current) => current.map((item) => ({ ...item, importance: "desired", importanceConfirmed: true }))); setClassificationMode("batch"); }}>Todos desejáveis</Button><Button onClick={() => setClassificationMode("individual")} type="primary">Quero classificar</Button><Button icon={<PlusOutlined />} onClick={() => { setReviewRequirements((current) => [...current, newVacancyRequirement()]); setClassificationMode("individual"); }}>Adicionar requisito</Button></Space>{classificationMode === "individual" ? <div className="prisma-requirement-editor-list">{reviewRequirements.map((item, index) => <RequirementEditor invalid={!item.label.trim()} item={item} key={item.stableId} onChange={(next) => setReviewRequirements((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? next : candidate))} onRemove={() => setReviewRequirements((current) => current.filter((_, candidateIndex) => candidateIndex !== index))} />)}</div> : <Typography.Paragraph type="secondary">Escolha um modo em lote ou “Quero classificar” para revisar item a item.</Typography.Paragraph>}</section></>}
      </PrismaCard>
    </div>
    <PrismaCard className="prisma-vacancy-save-bar"><Typography.Text type="secondary">Rascunhos podem permanecer incompletos. A Vaga só entra no matching após classificar cada requisito ativo.</Typography.Text><Space><Button onClick={() => onNavigate("/vacancies/new")}>Editar manualmente</Button><Button disabled={!suggestions.some((item) => item.selected)} onClick={confirm} type="primary">Confirmar estrutura</Button></Space></PrismaCard>
  </PrismaPage>;
}

export function VacancyDetailPage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId: string }) {
  const [detail, setDetail] = useState<VacancyDetail | null>(null);
  const [history, setHistory] = useState<VacancyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const detailId = detail.id!;
  const required = detail.requirements.filter((item) => item.importance === "required");
  const desired = detail.requirements.filter((item) => item.importance === "desired");
  const pending = detail.requirements.filter((item) => item.importance === "unclassified");
  async function removeVacancy() {
    setDeleting(true); setError(null);
    try {
      await vacancyService.cancel(activeMembership.organizationId, detailId);
      onNavigate("/vacancies");
    } catch (caught) {
      setError(errorMessage(caught, "Não foi possível excluir a Vaga."));
    } finally {
      setDeleting(false);
    }
  }
  return <PrismaPage className="prisma-vacancy-detail-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies")} type="text">Voltar para Vagas</Button>
    <div className="prisma-vacancy-detail-header"><div><Space wrap><Typography.Title level={1}>{detail.title}</Typography.Title><OccupancyTag occupancy={detail.occupancy} /></Space><div className="prisma-vacancy-meta"><span><ApartmentOutlined /> {detail.area || "Área não informada"}</span><span><EnvironmentOutlined /> {detail.location || "Localidade não informada"}</span>{detail.employmentType ? <span>{detail.employmentType}</span> : null}{detail.occupantName ? <span><UserOutlined /> Ocupada por {detail.occupantName}</span> : null}<span>Definição v{detail.version}</span></div></div><Space wrap><Button icon={<EditOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/edit`)}>Editar vaga</Button><Popconfirm cancelText="Cancelar" description="A Vaga sairá da lista. A posição, versões e avaliações anteriores serão preservadas." okButtonProps={{ danger: true, loading: deleting }} okText="Excluir vaga" onConfirm={() => void removeVacancy()} title="Excluir esta Vaga?"><Button danger icon={<DeleteOutlined />} loading={deleting}>Excluir</Button></Popconfirm><Button icon={<TeamOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">{detail.occupancy === "occupied" ? "Avaliar Pessoa atual" : "Encontrar pessoas"}</Button></Space></div>
    {error ? <Alert showIcon title={error} type="error" /> : null}
    <Tabs items={[
      { key: "overview", label: "Visão geral", children: <div className="prisma-vacancy-detail-stack">{[detail.mission, ...detail.contextItems].some((item) => item.trim()) ? <DetailSection icon={<AimOutlined />} title="Sobre a posição"><Typography.Paragraph>{[detail.mission, ...detail.contextItems].filter(Boolean).join(" ")}</Typography.Paragraph></DetailSection> : null}{detail.responsibilities.length ? <DetailList icon={<TeamOutlined />} items={detail.responsibilities} title="Responsabilidades" /> : null}{pending.length ? <RequirementDimensionGroups icon={<ClockCircleOutlined />} items={pending} title="Requisitos para classificar" /> : null}{required.length ? <RequirementDimensionGroups icon={<StarOutlined />} items={required} title="Requisitos obrigatórios" /> : null}{desired.length ? <RequirementDimensionGroups icon={<StarOutlined />} items={desired} title="Requisitos desejáveis" /> : null}{detail.expectedOutcomes.length ? <DetailList icon={<CheckCircleOutlined />} items={detail.expectedOutcomes} title="Resultados esperados" /> : null}</div> },
      { key: "people", label: "Pessoas encontradas", children: <Empty description="A descoberta é calculada sob demanda para não carregar todos os Perfis na abertura."><Button onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">Encontrar pessoas</Button></Empty> },
      { key: "history", label: "Histórico", children: <PrismaCard><List dataSource={history} locale={{ emptyText: "Nenhuma alteração registrada." }} renderItem={(item) => <List.Item><List.Item.Meta avatar={<HistoryOutlined />} title={historyLabel(item.type)} description={`${item.version ? `Definição v${item.version} · ` : ""}${formatDate(item.createdAt)}`} /></List.Item>} /></PrismaCard> },
    ]} />
  </PrismaPage>;
}

export function VacancyPeoplePage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId: string }) {
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [matches, setMatches] = useState<VacancyCandidateMatch[]>([]);
  const [discovery, setDiscovery] = useState<Omit<VacancyPeopleDiscovery, "matches"> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeMatch, setActiveMatch] = useState<VacancyCandidateMatch | null>(null);
  const [decidingPersonId, setDecidingPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void vacancyService.load(activeMembership.organizationId, vacancyId).then(async (detail) => {
      if (!detail) throw new Error("A Vaga não foi encontrada.");
      const result = await vacancyService.findPeople(activeMembership.organizationId, detail, true);
      if (current) { const { matches: found, ...summary } = result; setVacancy(detail); setMatches(found); setDiscovery(summary); }
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível encontrar Pessoas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);
  async function evaluate(match: VacancyCandidateMatch) {
    setActiveMatch(match);
    try { if (vacancy) await vacancyService.recordEvaluation(vacancy, match); }
    catch (caught) { setError(errorMessage(caught, "A aderência foi calculada, mas não pôde ser registrada.")); }
  }
  async function decidePosition(match: VacancyCandidateMatch, decision: Exclude<VacancyPositionRelationDecision, null>) {
    if (!vacancy) return;
    setDecidingPersonId(match.candidate.personId); setError(null);
    try {
      await vacancyService.recordPositionRelationDecision(vacancy, match, decision);
      setMatches((current) => sortVacancyMatches(current.map((item) => item.candidate.personId === match.candidate.personId ? { ...item, positionDecision: decision } : item)));
    } catch (caught) { setError(errorMessage(caught, "Não foi possível registrar sua decisão sobre esta relação.")); }
    finally { setDecidingPersonId(null); }
  }
  function toggle(personId: string) { setSelected((current) => current.includes(personId) ? current.filter((id) => id !== personId) : current.length < 2 ? [...current, personId] : [current[1]!, personId]); }
  return <PrismaPage className="prisma-vacancy-people-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}`)} type="text">Voltar para a Vaga</Button>
    <PrismaPageHeader title={vacancy ? `Pessoas para ${vacancy.title}` : "Pessoas encontradas"} description="Relação com a posição e aderência por requisito são explicadas separadamente, sem score e sem vencedor." actions={<Button disabled={selected.length !== 2} icon={<SwapOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}/compare/${selected.join("/")}`)} type="primary">Comparar selecionadas ({selected.length}/2)</Button>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {discovery ? <Alert showIcon type={discovery.unclassifiedRequirementCount ? "warning" : "info"} title={`${discovery.analyzedProfileCount} de ${discovery.publishedProfileCount} Perfis publicados analisados.`} description={discovery.unclassifiedRequirementCount ? `${discovery.unclassifiedRequirementCount} requisito${discovery.unclassifiedRequirementCount === 1 ? " aguarda" : "s aguardam"} classificação. A descoberta ocupacional continua disponível; conclua a classificação para fechar a aderência detalhada.` : "A análise percorreu todos os Perfis publicados acessíveis da empresa."} action={discovery.unclassifiedRequirementCount ? <Button onClick={() => onNavigate(`/vacancies/${vacancyId}/edit`)}>Classificar requisitos</Button> : undefined} /> : null}
    {loading ? <PrismaCard><Skeleton active avatar paragraph={{ rows: 14 }} /></PrismaCard> : null}
    {!loading && !matches.length ? <PrismaCard><Empty description="Não há Perfis publicados acessíveis para esta empresa."><Button onClick={() => onNavigate("/profiles/search")}>Consultar Pessoas</Button></Empty></PrismaCard> : null}
    <div className="prisma-vacancy-match-list">{matches.map((match) => <CandidateMatchCard deciding={decidingPersonId === match.candidate.personId} key={match.candidate.personId} match={match} onDecision={(decision) => void decidePosition(match, decision)} onEvaluate={() => void evaluate(match)} onNavigate={onNavigate} onToggle={() => toggle(match.candidate.personId)} selected={selected.includes(match.candidate.personId)} />)}</div>
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
      {matches.some((match) => match.detailedStatus !== "ready") ? <Alert showIcon type="warning" title="Aderência detalhada ainda incompleta" description="A relação ocupacional continua comparável. Classifique os requisitos pendentes para concluir obrigatórios e lacunas." /> : null}
      <div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard key={match.candidate.personId}><div className="prisma-match-person"><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small><Space wrap><PositionRelationTag status={match.positionRelation.status} />{match.positionDecision === "confirmed" ? <Tag color="green">Relação confirmada</Tag> : match.positionDecision === "dismissed" ? <Tag>Não considerar</Tag> : null}</Space><Typography.Paragraph>{match.positionRelation.explanation}</Typography.Paragraph></div></div></PrismaCard>)}</div>
      <PrismaCard className="prisma-comparison-table"><Table columns={comparisonColumns(matches)} dataSource={rows} pagination={false} scroll={{ x: 620 }} /></PrismaCard>
      <div className="prisma-comparison-mobile">{rows.map((row) => <PrismaCard key={row.key} title={row.label}><div><strong>{matches[0]!.candidate.fullName}</strong>{row.left ? <MatchStatusTag status={row.left.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.left?.explanation}</Typography.Paragraph></div><div><strong>{matches[1]!.candidate.fullName}</strong>{row.right ? <MatchStatusTag status={row.right.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.right?.explanation}</Typography.Paragraph></div></PrismaCard>)}</div>
      <Typography.Title level={2}>Destaques objetivos</Typography.Title><div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard className="prisma-match-highlight-card" key={match.candidate.personId} title={match.candidate.fullName}><ul>{match.requirements.filter((item) => item.status !== "no_evidence").slice(0, 5).map((item) => <li key={item.requirement.stableId}><CheckCircleOutlined /> {item.explanation}</li>)}</ul></PrismaCard>)}</div>
    </> : null}
  </PrismaPage>;
}

function RequirementEditor({ invalid, item, onChange, onRemove }: { invalid: boolean; item: VacancyRequirementDraft; onChange: (item: VacancyRequirementDraft) => void; onRemove: () => void }) {
  return <div className={`prisma-requirement-editor ${invalid ? "has-validation-error" : ""}`}><label><span>Requisito</span><Input {...(invalid ? { status: "error" as const } : {})} aria-invalid={invalid} aria-label="Requisito" onChange={(event) => { const category = inferRequirementCategory(event.target.value); onChange({ ...item, label: event.target.value, observedTerm: event.target.value, category, proposedCategory: category, categoryConfirmed: false, conceptId: null, conceptLabel: null, relatedSignals: [] }); }} placeholder="Ex.: Gestão de pipeline" value={item.label} /></label><label><span>Dimensão profissional</span><Select aria-label="Dimensão profissional" onChange={(category) => onChange({ ...item, category, categoryConfirmed: true })} options={vacancyRequirementCategories} value={item.category} /></label><label><span>Importância</span><Segmented block className="prisma-requirement-importance" onChange={(value) => onChange({ ...item, importance: value as VacancyRequirementDraft["importance"], importanceConfirmed: true })} options={[{ label: "Obrigatório", value: "required" }, { label: "Desejável", value: "desired" }]} value={item.importance === "unclassified" ? undefined : item.importance} /></label><Popconfirm description="Remover este requisito da definição atual?" onConfirm={onRemove} title="Remover requisito"><Button aria-label="Remover requisito" danger icon={<DeleteOutlined />} type="text" /></Popconfirm></div>;
}

function RequirementDimensionGroups({ icon, items, title }: { icon: ReactNode; items: VacancyRequirementDraft[]; title: string }) {
  const groups = vacancyRequirementCategories.map((category) => ({ ...category, items: items.filter((item) => item.category === category.value) })).filter((group) => group.items.length);
  return <PrismaCard title={<span>{icon} {title}</span>}><div className="prisma-vacancy-dimension-groups">{groups.map((group) => <section key={group.value}><strong>{group.label}</strong><ul>{group.items.map((item) => <li key={item.stableId}>{item.label}</li>)}</ul></section>)}</div></PrismaCard>;
}

function StringListEditor({ label, onChange, placeholder, values }: { label: string; onChange: (values: string[]) => void; placeholder: string; values: string[] }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<InputRef>(null);
  function add() { const value = input.trim(); if (!value) return; onChange([...values, value]); setInput(""); }
  function addFromEnter(event: KeyboardEvent<HTMLInputElement>) { event.preventDefault(); add(); window.requestAnimationFrame(() => inputRef.current?.focus()); }
  return <PrismaCard className="prisma-vacancy-form-section" title={label}><div className="prisma-string-list">{values.map((value, index) => <div key={`${value}-${index}`}><Input onChange={(event) => onChange(values.map((item, currentIndex) => currentIndex === index ? event.target.value : item))} value={value} /><Button aria-label={`Remover ${value}`} danger icon={<DeleteOutlined />} onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))} type="text" /></div>)}</div><Input onChange={(event) => setInput(event.target.value)} onPressEnter={addFromEnter} placeholder={placeholder} ref={inputRef} suffix={<Button icon={<PlusOutlined />} onClick={add} size="small" type="text" />} value={input} /></PrismaCard>;
}

function CandidateMatchCard({ deciding, match, onDecision, onEvaluate, onNavigate, onToggle, selected }: { deciding: boolean; match: VacancyCandidateMatch; onDecision: (decision: Exclude<VacancyPositionRelationDecision, null>) => void; onEvaluate: () => void; onNavigate: (path: string) => void; onToggle: () => void; selected: boolean }) {
  const met = match.requirements.filter((item) => item.status === "met");
  const partial = match.requirements.filter((item) => item.status === "partially_met");
  const related = match.requirements.filter((item) => item.status === "related_signal");
  const missing = match.requirements.filter((item) => item.status === "no_evidence");
  return <PrismaCard className={`prisma-vacancy-match-card${selected ? " is-selected" : ""}${match.positionDecision === "dismissed" ? " is-dismissed" : ""}`}><article><header><Checkbox checked={selected} onChange={onToggle} /><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small><Space className="prisma-position-relation-tags" wrap><PositionRelationTag status={match.positionRelation.status} />{match.positionDecision === "confirmed" ? <Tag color="green">Relação confirmada por você</Tag> : match.positionDecision === "dismissed" ? <Tag>Não considerar</Tag> : null}<DetailedStatusTag match={match} /></Space></div><Space orientation="vertical"><Button onClick={() => onNavigate(`/profiles/${match.candidate.personId}/profile`)} type="primary">Ver perfil</Button><Button onClick={onEvaluate}>Ver evidências</Button></Space></header>{match.candidate.profileData.summary ? <Typography.Paragraph ellipsis={{ rows: 2 }}>{match.candidate.profileData.summary}</Typography.Paragraph> : null}<section className="prisma-position-relation"><strong>Relação com a posição</strong><Typography.Paragraph>{match.positionRelation.explanation}</Typography.Paragraph><Space wrap><Button disabled={match.positionDecision === "confirmed"} loading={deciding} onClick={() => onDecision("confirmed")} size="small" type={match.positionDecision === "confirmed" ? "default" : "primary"}>Confirmar relação</Button><Button disabled={match.positionDecision === "dismissed"} loading={deciding} onClick={() => onDecision("dismissed")} size="small">Não considerar</Button></Space></section><section className="prisma-match-reasons"><strong><FileSearchOutlined /> Por que apareceu</strong><Space wrap>{match.reasons.slice(0, 5).map((reason) => <Tag key={reason}>{reason}</Tag>)}</Space></section><div className="prisma-match-evidence-grid"><MatchBucket color="success" items={met.map((item) => item.requirement.label)} title={`Atendidos (${met.length})`} /><MatchBucket color="warning" items={partial.map((item) => item.requirement.label)} title={`Parciais para revisão (${partial.length})`} /><MatchBucket color="warning" items={related.map((item) => `${item.relatedSignal}: sinal relacionado`)} title={`Sinais relacionados (${related.length})`} /><MatchBucket color="error" items={missing.map((item) => item.requirement.label)} title={`Sem evidência suficiente (${missing.length})`} /></div></article></PrismaCard>;
}

function MatchDrawer({ match, onClose, open }: { match: VacancyCandidateMatch | null; onClose: () => void; open: boolean }) {
  return <Drawer onClose={onClose} open={open} size="large" title={match ? `Evidências de ${match.candidate.fullName}` : "Evidências"}>{match ? <><Alert title="Esta leitura compara evidências publicadas com a versão atual da Vaga. Não é avaliação de desempenho nem decisão de contratação." showIcon type="info" /><PrismaCard title="Relação com a posição"><Space wrap><PositionRelationTag status={match.positionRelation.status} /><EvidenceLevelTag level={match.evidenceAssessment.level} /></Space><Typography.Paragraph>{match.positionRelation.explanation}</Typography.Paragraph>{match.positionRelation.evidence.map((item) => <Tag key={`${item.sourceId}-${item.label}`}>{item.label} · {item.source}</Tag>)}<details><summary>Como a evidência foi avaliada</summary><ul>{match.evidenceAssessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details></PrismaCard>{match.detailedStatus !== "ready" ? <Alert title={match.detailedStatus === "pending_classification" ? "Aderência detalhada pendente" : "A Vaga ainda não possui requisitos comparáveis"} description={match.detailedStatus === "pending_classification" ? "A relação ocupacional e as evidências já estão visíveis. Classifique os requisitos para concluir quais lacunas são obrigatórias." : "A relação ocupacional continua disponível para sua análise."} showIcon type="warning" /> : null}<List dataSource={match.requirements} renderItem={(item) => <List.Item><List.Item.Meta avatar={<StatusIcon status={item.status} />} title={<Space wrap>{item.requirement.label}<MatchStatusTag status={item.status} />{item.requirement.importance === "unclassified" ? <Tag>Importância pendente</Tag> : null}</Space>} description={<><Typography.Paragraph>{item.explanation}</Typography.Paragraph>{item.evidence.map((evidence) => <Tag key={`${evidence.sourceId}-${evidence.label}`}>{evidence.label} · {evidence.source}</Tag>)}</>} /></List.Item>} /></> : null}</Drawer>;
}

function MatchBucket({ color, items, title }: { color: "success" | "warning" | "error"; items: string[]; title: string }) { return <section className={`prisma-match-bucket is-${color}`}><strong>{title}</strong>{items.length ? <Space wrap>{items.map((item) => <Tag color={color} key={item}>{item}</Tag>)}</Space> : <Typography.Text type="secondary">Nenhum item nesta categoria.</Typography.Text>}</section>; }
function AvatarInitials({ name }: { name: string }) { return <div aria-hidden="true" className="prisma-vacancy-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>; }
function OccupancyTag({ occupancy }: { occupancy: VacancyDraft["occupancy"] }) { return occupancy === "occupied" ? <Tag color="blue">Ocupada</Tag> : <Tag color="green">Não ocupada</Tag>; }
function MatchStatusTag({ status }: { status: VacancyMatchStatus }) { const map = { met: ["success", "Atendido"], partially_met: ["warning", "Parcial"], related_signal: ["purple", "Sinal relacionado"], no_evidence: ["error", "Sem evidência suficiente"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function PositionRelationTag({ status }: { status: VacancyPositionRelationStatus }) { const map = { same_reference: ["green", "Mesma referência ocupacional"], equivalent_reference: ["cyan", "Ocupação equivalente"], related_reference: ["blue", "Ocupação relacionada"], possible_title_relation: ["gold", "Possível relação de posição"], none: ["default", "Sem relação automática"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function DetailedStatusTag({ match }: { match: VacancyCandidateMatch }) { return match.detailedStatus === "ready" ? <Tag color="blue">Aderência detalhada disponível</Tag> : match.detailedStatus === "pending_classification" ? <Tag color="gold">Aderência pendente · {match.unclassifiedRequirementCount} para classificar</Tag> : <Tag>Sem requisitos comparáveis</Tag>; }
function EvidenceLevelTag({ level }: { level: VacancyCandidateMatch["evidenceAssessment"]["level"] }) { return <Tag color={level === "corroborated" ? "green" : level === "supported" ? "blue" : "default"}>{level === "corroborated" ? "Evidência corroborada" : level === "supported" ? "Evidência sustentada" : "Evidência limitada"}</Tag>; }
function StatusIcon({ status }: { status: VacancyMatchStatus }) { return status === "met" ? <CheckCircleOutlined className="is-success" /> : status === "no_evidence" ? <ExclamationCircleOutlined className="is-error" /> : <ClockCircleOutlined className="is-warning" />; }
function DetailSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) { return <PrismaCard title={<span>{icon} {title}</span>}>{children}</PrismaCard>; }
function DetailList({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}>{items.length ? <ul className="prisma-vacancy-editorial-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <Typography.Text type="secondary">Não informado.</Typography.Text>}</DetailSection>; }
function DetailText({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}>{items.length ? <Typography.Paragraph className="prisma-vacancy-context-text">{items.join("\n\n")}</Typography.Paragraph> : <Typography.Text type="secondary">Não informado.</Typography.Text>}</DetailSection>; }
function RequirementTags({ items, label }: { items: VacancyRequirementDraft[]; label: string }) { return <section><strong>{label}</strong><Space wrap>{items.length ? items.map((item) => <Tag color={label === "Obrigatório" ? "purple" : "blue"} key={item.stableId}>{item.label}</Tag>) : <Typography.Text type="secondary">Nenhum</Typography.Text>}</Space></section>; }

function vacancyColumns(onNavigate: (path: string) => void, onDelete: (item: VacancySummary) => Promise<void>, deletingId: string | null): ColumnsType<VacancySummary> { return [
  { title: "Vaga", dataIndex: "title", key: "title", render: (value, item) => <button className="prisma-vacancy-title-link" onClick={() => onNavigate(`/vacancies/${item.id}`)} type="button"><strong>{value}</strong><small>Definição v{item.definitionVersion}</small></button> },
  { title: "Área", dataIndex: "area", key: "area", responsive: ["md"], render: (value) => value || "Não informada" },
  { title: "Situação", dataIndex: "occupancy", key: "occupancy", render: (value) => <OccupancyTag occupancy={value} /> },
  { title: "Pessoa vinculada", dataIndex: "occupantName", key: "occupantName", responsive: ["lg"], render: (value) => value || "Nenhuma" },
  { title: "Ação", key: "action", align: "right", render: (_, item) => <Space wrap size="small"><Button icon={<EditOutlined />} onClick={() => onNavigate(`/vacancies/${item.id}/edit`)}>Editar</Button><Popconfirm cancelText="Cancelar" description="A Vaga sairá da lista. A posição, versões e avaliações anteriores serão preservadas." okButtonProps={{ danger: true, loading: deletingId === item.id }} okText="Excluir vaga" onConfirm={() => void onDelete(item)} title="Excluir esta Vaga?"><Button aria-label={`Excluir ${item.title}`} danger icon={<DeleteOutlined />} loading={deletingId === item.id}>Excluir</Button></Popconfirm><Button onClick={() => onNavigate(`/vacancies/${item.id}/people`)}>{item.occupancy === "occupied" ? "Avaliar aderência" : "Encontrar pessoas"}</Button></Space> },
]; }

function comparisonColumns(matches: VacancyCandidateMatch[]): ColumnsType<{ key: string; label: string; left: VacancyCandidateMatch["requirements"][number] | undefined; right: VacancyCandidateMatch["requirements"][number] | undefined }> { return [
  { title: "Requisito da Vaga", dataIndex: "label", key: "label", fixed: "left", width: 220 },
  { title: matches[0]?.candidate.fullName ?? "Pessoa A", dataIndex: "left", key: "left", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
  { title: matches[1]?.candidate.fullName ?? "Pessoa B", dataIndex: "right", key: "right", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
]; }

const workArrangementOptions = [{ value: "onsite", label: "Presencial" }, { value: "hybrid", label: "Híbrido" }, { value: "remote", label: "Remoto" }, { value: "flexible", label: "Flexível" }];

function groupSuggestions(items: VacancyStructureSuggestion[]): Record<string, VacancyStructureSuggestion[]> { const labels: Record<string, string> = { mission: "Missão", responsibility: "Responsabilidades", outcome: "Resultados esperados", experience: "O que a Pessoa precisa trazer", competency: "O que a Pessoa precisa trazer", knowledge: "O que a Pessoa precisa trazer", technology: "O que a Pessoa precisa trazer", education: "O que a Pessoa precisa trazer", certification: "O que a Pessoa precisa trazer", language: "O que a Pessoa precisa trazer", context: "Contexto da vaga" }; return items.reduce<Record<string, VacancyStructureSuggestion[]>>((groups, item) => { const key = labels[item.category] ?? item.category; (groups[key] ??= []).push(item); return groups; }, {}); }
function inferTitle(value: string): string { return value.match(/(?:busca(?:mos)?|procuramos)\s+(?:de\s+)?(?:um|uma)\s+([^,.]+)/i)?.[1]?.trim() ?? ""; }
function historyLabel(value: string): string { return ({ created: "Vaga criada", definition_updated: "Definição atualizada", occupancy_updated: "Ocupação atualizada", match_evaluated: "Aderência avaliada", cancelled: "Vaga excluída da lista" } as Record<string, string>)[value] ?? "Atualização registrada"; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
function errorMessage(value: unknown, fallback: string): string { return value instanceof Error ? value.message : fallback; }
function persistDraft(draft: VacancyDraft): void { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
function readDraft(): VacancyDraft { try { const raw = window.sessionStorage.getItem(DRAFT_KEY); return raw ? { ...emptyVacancyDraft(), ...JSON.parse(raw) as VacancyDraft } : emptyVacancyDraft(); } catch { return emptyVacancyDraft(); } }
function clearDraft(): void { window.sessionStorage.removeItem(DRAFT_KEY); }
