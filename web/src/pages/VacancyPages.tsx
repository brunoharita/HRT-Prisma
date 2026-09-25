import { PositionTaxonomyPanel, TaxonomyOriginDetails } from "../components/PositionTaxonomyPanel";
import { isSemanticPilot } from "../../../src/domain/semanticTrajectory.js";
import { semanticComparisonPending } from "../domain/semanticMatching.js";
import { positionTaxonomyService } from "../infrastructure/supabase/positionTaxonomyService";
import { changeTaxonomyTitle } from "../domain/positionTaxonomy";
import { toggleComparisonSelection } from "../shared/uxFoundation";
import { usePrismaScope, useUnsavedChanges, useViewState } from "../ui/PrismaNavigation";
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
  Spin,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { competencyVerificationService } from "../infrastructure/supabase/competencyVerificationService";
import { PrismaState } from "../ui/PrismaState";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MatchingScoreDimension, MatchingScoreItemStatus } from "../domain/matchingScore.js";
import {
  applyStructuredDescription,
  applyVacancyRestructureDelta,
  answerVacancyQuestion,
  emptyVacancyDraft,
  inferRequirementCategory,
  newManualVacancyRequirement,
  newVacancyRequirement,
  sortVacancyMatches,
  structureVacancyDescription,
  sourceKindAfterOccupationReference,
  compareVacancyRequirements,
  validateVacancyDraft,
  vacancyRequirementCategories,
  vacancyRequirementCategoryLabel,
  type VacancyCandidateMatch,
  type VacancyAdvisorAnswer,
  type VacancyAreaRelationStatus,
  type VacancyDetail,
  type VacancyDraft,
  type VacancyMatchStatus,
  type VacancyPeopleDiscovery,
  type VacancyPositionRelationDecision,
  type VacancyPositionRelationStatus,
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
  const draftScope = usePrismaScope();
  const [items, setItems] = useState<VacancySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useViewState("search", "");
  const [occupancy, setOccupancy] = useViewState<"all" | "occupied" | "vacant">("occupancy", "all");
  const [area, setArea] = useViewState<string | null>("area", null);
  const [page, setPage] = useViewState("page", 1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void vacancyService.list(activeMembership.organizationId)
      .then((result) => { if (current) setItems(result); })
      .catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível carregar as Posições.")); })
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
      setError(errorMessage(caught, "Não foi possível excluir a Posição."));
    } finally {
      setDeletingId(null);
    }
  }

  return <PrismaPage className="prisma-vacancies-page">
    <PrismaPageHeader title="Posições" description="Gerencie as necessidades profissionais da sua empresa." actions={<Button icon={<PlusOutlined />} onClick={() => { clearDraft(draftScope); onNavigate("/vacancies/new"); }} type="primary">Nova posição</Button>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    <PrismaCard className="prisma-vacancy-toolbar">
      <Input allowClear aria-label="Buscar Posições" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por título, área, localidade ou Pessoa..." prefix={<SearchOutlined />} value={search} />
      <Segmented onChange={(value) => { setOccupancy(value as typeof occupancy); setPage(1); }} options={[{ label: `Todas ${items.length}`, value: "all" }, { label: `Ocupadas ${items.filter((item) => item.occupancy === "occupied").length}`, value: "occupied" }, { label: `Não ocupadas ${items.filter((item) => item.occupancy === "vacant").length}`, value: "vacant" }]} value={occupancy} />
      <Select allowClear aria-label="Filtrar por área" onChange={(value) => { setArea(value ?? null); setPage(1); }} options={areas.map((value) => ({ label: value, value }))} placeholder="Todas as áreas" value={area} />
    </PrismaCard>
    {loading ? <PrismaCard><Skeleton active paragraph={{ rows: 10 }} /></PrismaCard> : null}
    {!loading && !error && !items.length ? <PrismaCard><Empty description={<span>Ainda não há Posições cadastradas.<br />Cadastre a primeira necessidade profissional da sua empresa.</span>}><Button icon={<PlusOutlined />} onClick={() => onNavigate("/vacancies/new")} type="primary">Nova posição</Button></Empty></PrismaCard> : null}
    {!loading && !error && items.length && !filtered.length ? <PrismaCard><Empty description="Nenhuma Posição corresponde aos filtros informados." /></PrismaCard> : null}
    {!loading && visible.length ? <>
      <p className="prisma-table-scroll-hint">Role a tabela para os lados para acessar todas as ações.</p>
      <div className="prisma-vacancy-table-wrap" role="region" aria-label="Posições e ações" tabIndex={0}><Table<VacancySummary> columns={vacancyColumns(onNavigate, removeVacancy, deletingId)} dataSource={visible} pagination={false} rowKey="id" /></div>
      <div className="prisma-vacancy-pagination"><Typography.Text type="secondary">Mostrando {visible.length} de {filtered.length} Posições</Typography.Text><Pagination current={page} onChange={setPage} pageSize={PAGE_SIZE} showSizeChanger={false} total={filtered.length} /></div>
    </> : null}
  </PrismaPage>;
}

export function VacancyEditorPage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId?: string }) {
  const draftScope = usePrismaScope();
  const [draft, setDraft] = useState<VacancyDraft>(() => vacancyId ? emptyVacancyDraft() : readDraft(draftScope));
  const baseline = useRef(JSON.stringify(draft));
  const markSaved = useUnsavedChanges(JSON.stringify(draft) !== baseline.current);
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
  const [referenceSearchLoading, setReferenceSearchLoading] = useState(false);
  const [referenceSearchTerm, setReferenceSearchTerm] = useState("");
  const [referenceSearchError, setReferenceSearchError] = useState<string | null>(null);
  const referenceSearchRequest = useRef(0);
  const referenceSearchTimer = useRef<number | null>(null);
  const referenceSearchAbort = useRef<AbortController | null>(null);
  const referenceSearchCache = useRef(new Map<string, VacancyReferenceSuggestion[]>());
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
      if (detail) { baseline.current = JSON.stringify(detail); setDraft(detail); }
      if (vacancyId && !detail) setError("A Posição solicitada não foi encontrada na empresa ativa.");
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível preparar a edição da Posição.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);

  useEffect(() => {
    if (vacancyId || loading) return;
    persistDraft(draft, draftScope); setSavedLocally(true);
    const timeout = window.setTimeout(() => setSavedLocally(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [draft, loading, vacancyId]);

  useEffect(() => () => {
    if (referenceSearchTimer.current !== null) window.clearTimeout(referenceSearchTimer.current);
    referenceSearchAbort.current?.abort();
  }, []);

  const update = <K extends keyof VacancyDraft>(key: K, value: VacancyDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  function focusValidationTarget(target: "occupation" | "title" | "occupant" | "requirement") {
    setValidationTarget(target);
    if (target === "occupation") window.requestAnimationFrame(() => occupationReferenceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  async function usePrevious(id: string) {
    const detail = await vacancyService.load(activeMembership.organizationId, id);
    if (!detail) return;
    // The source definition keeps its assisted-description trace; this copy is
    // derived from that position, not a new assisted-description extraction.
    setDraft({ ...detail, id: null, expectedVersionId: null, taxonomy: null, structureSource: null, sourceKind: "previous_vacancy", sourceVacancyId: id, occupantPersonId: null, occupancy: "vacant", saveAsRole: false });
  }
  function useRole(id: string) {
    const role = roles.find((item) => item.id === id); if (!role) return;
    setDraft((current) => ({ ...current, title: role.name, mission: role.mission, responsibilities: role.responsibilities, expectedOutcomes: role.expectedOutcomes, requirements: role.requirements, contextItems: role.contextItems, sourceKind: "organization_role", jobRoleId: role.id, structureSource: null, referenceConceptId: role.referenceConceptId, taxonomy: null, taxonomyDecision: role.referenceConceptId ? "human" : "automatic", taxonomyComplementIds: [] }));
  }
  function searchReferences(value: string) {
    const query = value.trim();
    const cacheKey = query.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
    setReferenceSearchTerm(query);
    setReferenceSearchError(null);
    if (referenceSearchTimer.current !== null) window.clearTimeout(referenceSearchTimer.current);
    referenceSearchAbort.current?.abort();
    const request = ++referenceSearchRequest.current;
    if (query.length < 2) {
      setReferences([]);
      setReferenceSearchLoading(false);
      return;
    }
    const cached = referenceSearchCache.current.get(cacheKey);
    if (cached) {
      setReferences(cached);
      setReferenceSearchLoading(false);
      return;
    }
    setReferenceSearchLoading(true);
    referenceSearchTimer.current = window.setTimeout(() => {
      referenceSearchTimer.current = null;
      void runReferenceSearch(query, cacheKey, request);
    }, 400);
  }
  async function runReferenceSearch(query: string, cacheKey: string, request: number) {
    const controller = new AbortController();
    referenceSearchAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const page = await positionTaxonomyService.search(activeMembership.organizationId, query, "occupation", 0, controller.signal);
      const result = page.items.map((item) => ({ conceptId: item.id, label: item.label, scope: item.scope, source: null }));
      if (request === referenceSearchRequest.current) {
        referenceSearchCache.current.set(cacheKey, result);
        setReferences(result);
      }
    } catch (caught) {
      if (request === referenceSearchRequest.current) {
        setReferences([]);
        setReferenceSearchError(controller.signal.aborted
          ? "A consulta ultrapassou 8 segundos e foi interrompida."
          : errorMessage(caught, "A busca na Knowledge interna não respondeu agora."));
      }
    } finally {
      window.clearTimeout(timeout);
      if (referenceSearchAbort.current === controller) referenceSearchAbort.current = null;
      if (request === referenceSearchRequest.current) setReferenceSearchLoading(false);
    }
  }
  const retryReferenceSearch = () => { if (referenceSearchTerm.length >= 2) searchReferences(referenceSearchTerm); };
  async function useProfessionalReference(conceptId: string) {
    setDraft((current) => ({ ...current, referenceConceptId: conceptId, taxonomyDecision: "human", taxonomy: null }));
    setValidationTarget(null);
  }
  async function save() {
    const errors = validateVacancyDraft(draft);
    if (errors.length) {
      const target = errors.some((item) => /título/i.test(item)) ? "title" : errors.some((item) => /Pessoa que ocupa/i.test(item)) ? "occupant" : "requirement";
      focusValidationTarget(target); setError(errors.join(" ")); return;
    }
    setSaving(true); setError(null);
    try {
      const result = await vacancyService.save(activeMembership.organizationId, draft);
      baseline.current = JSON.stringify(draft); markSaved(); clearDraft(draftScope); onNavigate(`/vacancies/${result.id}`);
    } catch (caught) { setError(errorMessage(caught, "Não foi possível salvar a Posição.")); }
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
      setAdvisorAnswer({ ...answer, market: "Você escolheu consultar somente as fontes internas autorizadas: a Posição atual, Posições e funções acessíveis da empresa e a Knowledge publicada disponível.", sources: [], webSearched: false });
    }
    setAdvisorLoading(false);
  }
  function addAdvisorRequirement() {
    const proposed = advisorAnswer?.suggestedRequirement;
    if (!proposed || draft.requirements.some((item) => normalize(item.label) === normalize(proposed.label))) return;
    update("requirements", [...draft.requirements, { ...newVacancyRequirement(proposed.label), importance: proposed.importance, importanceConfirmed: true }]);
    setAdvisorAnswer(null);
  }

  const referenceOptions = [
    { label: "Na sua empresa", options: references.filter((item) => item.scope !== "global").map((item) => ({ label: item.label, value: item.conceptId })) },
    { label: "Base global do Prisma", options: references.filter((item) => item.scope === "global").map((item) => ({ label: item.label, value: item.conceptId })) },
  ].filter((group) => group.options.length > 0);

  if (loading) return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 18 }} /></PrismaCard></PrismaPage>;
  return <PrismaPage className="prisma-vacancy-editor-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")} type="text">Voltar</Button>
    <PrismaPageHeader title={vacancyId ? "Editar posição" : "Nova posição"} description="Explique a necessidade em blocos simples. O Prisma preserva a estrutura e a versão usadas nas avaliações." actions={<Space>{vacancyId && draft.structureSource ? <Button onClick={() => { setRestructureDescription(draft.structureSource?.originalDescription ?? ""); setRestructureOpen(true); }}>Editar descrição e reestruturar</Button> : null}{savedLocally ? <Tag icon={<CheckCircleOutlined />} color="success">Rascunho salvo neste navegador</Tag> : null}</Space>} />
    {error ? <Alert closable onClose={() => { setError(null); setValidationTarget(null); }} showIcon title={error} type="error" /> : null}
    {!vacancyId ? <PrismaCard className={`prisma-vacancy-start-card ${validationTarget === "occupation" ? "has-validation-error" : ""}`} title="Escolha como começar">
      <div className="prisma-start-description">
        <Typography.Paragraph>Escolha uma definição que o Prisma já conhece ou comece pela descrição da necessidade. Você poderá revisar e ajustar tudo antes de salvar.</Typography.Paragraph>
        <div className="prisma-start-source-guide" aria-label="Ordem das fontes consultadas">
          <div><strong>1. Knowledge interna</strong><span>Empresa e base global, com referências aprovadas.</span></div>
          <div><strong>2. Referências oficiais catalogadas</strong><span>ESCO, CBO e O*NET, consultadas quando o título ainda não tem correspondência segura.</span></div>
        </div>
      </div>
      <div className="prisma-start-choice-grid">
        <div className="prisma-start-choice"><div className="prisma-start-choice-heading"><span className="prisma-start-choice-number">1</span><span><strong>Função da empresa</strong><small>Usa uma definição validada pela empresa.</small></span></div><Select allowClear aria-label="Função da empresa" onChange={useRole} options={roles.map((item) => ({ label: item.name, value: item.id }))} placeholder="Usar uma função validada" /></div>
        <div className="prisma-start-choice"><div className="prisma-start-choice-heading"><span className="prisma-start-choice-number">2</span><span><strong>Posição anterior</strong><small>Reutiliza somente uma definição existente.</small></span></div><Select allowClear aria-label="Posição anterior" onChange={(value) => void usePrevious(value)} options={previous.map((item) => ({ label: item.title, value: item.id }))} placeholder="Reutilizar somente a definição" /></div>
        <div className={`${validationTarget === "occupation" ? "prisma-vacancy-reference-field has-validation-error" : "prisma-vacancy-reference-field"} prisma-start-choice`} ref={occupationReferenceRef}>
          <div className="prisma-start-choice-heading"><span className="prisma-start-choice-number">3</span><span><strong>Referência profissional</strong><small>Procura primeiro na Knowledge interna.</small></span></div>
          <Select allowClear aria-label="Referência profissional" filterOption={false} loading={referenceSearchLoading} onChange={() => setReferenceSearchError(null)} onClear={() => setDraft((current) => ({ ...current, referenceConceptId: null, taxonomy: null, taxonomyDecision: "cleared" }))} onSearch={searchReferences} options={referenceOptions} placeholder="Buscar na Knowledge interna" showSearch suffixIcon={<SearchOutlined />} notFoundContent={referenceSearchLoading ? <span className="prisma-reference-search-status"><Spin size="small" /> Buscando na Knowledge interna…</span> : referenceSearchError ? <span className="prisma-reference-search-status is-error">A busca interna não respondeu.</span> : referenceSearchTerm.length < 2 ? "Digite pelo menos 2 caracteres para buscar" : "Nenhuma referência profissional encontrada na Knowledge interna"} onSelect={(value) => void useProfessionalReference(value)} />
          <Typography.Text className="prisma-reference-search-help" type="secondary">Digite pelo menos 2 caracteres. A consulta combina referências aprovadas da sua empresa e da base global.</Typography.Text>
        {referenceSearchLoading ? <Typography.Text aria-live="polite" className="prisma-reference-search-feedback" role="status" type="secondary"><Spin size="small" /> Buscando referências na Knowledge interna…</Typography.Text> : null}
        {!referenceSearchLoading && referenceSearchTerm.length >= 2 && references.length > 0 ? <Typography.Text aria-live="polite" className="prisma-reference-search-feedback is-success" role="status" type="secondary">{references.length} referência{references.length === 1 ? "" : "s"} encontrada{references.length === 1 ? "" : "s"} na Knowledge interna.</Typography.Text> : null}
        {!referenceSearchLoading && !referenceSearchError && referenceSearchTerm.length >= 2 && references.length === 0 ? <Typography.Text aria-live="polite" className="prisma-reference-search-feedback" role="status" type="secondary">Nenhuma correspondência interna. A taxonomia permite buscar e selecionar uma referência publicada.</Typography.Text> : null}
        {referenceSearchError ? <Alert className="prisma-reference-search-error" showIcon type="error" message="A busca na Knowledge interna não respondeu." description={`${referenceSearchError} O rascunho foi preservado. Tente novamente ou continue pelo título da Posição para consultar as referências oficiais catalogadas.`} action={<Button onClick={retryReferenceSearch} size="small">Tentar novamente</Button>} /> : null}
        </div>
      </div>
      <div className="prisma-start-assist-choice"><div><strong>Começar pela descrição</strong><span>Descreva a necessidade com suas palavras. O Prisma estrutura uma sugestão para você revisar.</span></div><Button icon={<RobotOutlined />} onClick={() => onNavigate("/vacancies/assist")}>Começar com uma descrição</Button></div>
    </PrismaCard> : null}
    <Form layout="vertical" onFinish={() => void save()} onKeyDown={(event) => {
      const target = event.target as HTMLElement;
      if (event.key === "Enter" && target instanceof HTMLInputElement && !target.closest(".ant-select")) event.preventDefault();
    }}>
      <PrismaCard className="prisma-vacancy-form-section" title="1. Informações básicas">
        <div className="prisma-vacancy-form-grid">
          <Form.Item {...(validationTarget === "title" ? { help: "Informe o título da Posição.", validateStatus: "error" as const } : {})} extra="A associação automática usa somente Knowledge aprovada e fontes publicadas. Uma escolha humana permanece até ser corrigida ou reavaliada." label="Título da Posição" required><Input maxLength={240} onChange={(event) => { setDraft((current) => changeTaxonomyTitle(current, event.target.value)); if (validationTarget === "title") setValidationTarget(null); }} placeholder="Ex.: Gerente Comercial Enterprise" value={draft.title} /></Form.Item>
          <Form.Item label="Área"><Input onChange={(event) => update("area", event.target.value)} placeholder="Ex.: Comercial" value={draft.area} /></Form.Item>
          <Form.Item label="Localidade"><Input onChange={(event) => update("location", event.target.value)} placeholder="Ex.: São Paulo, SP" value={draft.location} /></Form.Item>
          <Form.Item label="Regime de trabalho"><Select allowClear onChange={(value) => update("workArrangement", value ?? null)} options={workArrangementOptions} placeholder="Não informado" value={draft.workArrangement} /></Form.Item>
          <Form.Item label="Tipo de vínculo"><Input onChange={(event) => update("employmentType", event.target.value)} placeholder="Ex.: CLT" value={draft.employmentType} /></Form.Item>
          <Form.Item label="Situação de ocupação"><Segmented block onChange={(value) => setDraft((current) => ({ ...current, occupancy: value as VacancyDraft["occupancy"], occupantPersonId: value === "occupied" ? current.occupantPersonId : null }))} options={[{ label: "Não ocupada", value: "vacant" }, { label: "Ocupada", value: "occupied" }]} value={draft.occupancy} /></Form.Item>
        </div>
        {draft.occupancy === "occupied" ? <Form.Item {...(validationTarget === "occupant" ? { help: "Selecione a Pessoa que ocupa esta posição.", validateStatus: "error" as const } : {})} label="Pessoa que ocupa a posição" required><Select showSearch optionFilterProp="label" onChange={(value) => { update("occupantPersonId", value); if (validationTarget === "occupant") setValidationTarget(null); }} options={occupants} placeholder="Selecione uma Pessoa existente" value={draft.occupantPersonId} /></Form.Item> : null}
      </PrismaCard>
      <PositionTaxonomyPanel draft={draft} membership={activeMembership} onChange={setDraft} />
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
      <PrismaCard className="prisma-vacancy-form-section" title="5. Requisitos da Posição">
        <Typography.Paragraph type="secondary">O Prisma propõe a dimensão profissional. A decisão entre obrigatório e desejável é sempre sua.</Typography.Paragraph>
        <Space wrap><Button onClick={() => update("requirements", draft.requirements.map((item) => ({ ...item, importance: "required", importanceConfirmed: true })))}>Todos obrigatórios</Button><Button onClick={() => update("requirements", draft.requirements.map((item) => ({ ...item, importance: "desired", importanceConfirmed: true })))}>Todos desejáveis</Button><Button type="primary">Quero classificar</Button></Space>
        <div className="prisma-requirement-editor-list">{draft.requirements.map((item, index) => <RequirementEditor invalid={validationTarget === "requirement" && (!item.label.trim() || item.importance === "unclassified")} item={item} key={item.stableId} onChange={(next) => { const requirements = draft.requirements.map((current, currentIndex) => currentIndex === index ? next : current); update("requirements", requirements); if (validationTarget === "requirement" && requirements.every((requirement) => requirement.label.trim() && requirement.importance !== "unclassified")) setValidationTarget(null); }} onRemove={() => update("requirements", draft.requirements.filter((_, currentIndex) => currentIndex !== index))} />)}</div>
        {validationTarget === "requirement" ? <Typography.Text className="prisma-field-validation-message" role="alert" type="danger">{draft.requirements.some((item) => !item.label.trim()) ? "Preencha ou remova o requisito sem descrição." : "Classifique cada requisito como Obrigatório ou Desejável antes de salvar."}</Typography.Text> : null}
        <Button icon={<PlusOutlined />} onClick={() => update("requirements", [...draft.requirements, newManualVacancyRequirement()])} type="link">Adicionar requisito</Button>
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section" title={<span>6. Contexto da posição <Tooltip title="Use este campo para explicar o cenário da posição: o momento da área, o desafio da posição e o ambiente em que essa Pessoa irá atuar. Requisitos profissionais ficam no item 5."><InfoCircleOutlined aria-label="Para que serve o contexto da posição?" /></Tooltip></span>}>
        <Typography.Paragraph type="secondary"><strong>Para que serve?</strong> Use este campo para explicar o cenário da posição: o momento da área, o desafio da posição e o ambiente em que essa Pessoa irá atuar. Não use este espaço para requisitos do candidato; esses ficam em “O que a Pessoa precisa trazer”.</Typography.Paragraph>
        <Input.TextArea onChange={(event) => update("contextItems", event.target.value ? [event.target.value] : [])} placeholder="Ex.: A área está sendo estruturada e precisa ganhar previsibilidade comercial. A pessoa terá autonomia para revisar processos e apoiar o crescimento da equipe." rows={5} value={draft.contextItems.join("\n\n")} />
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-form-section prisma-vacancy-advisor" title={<span><RobotOutlined /> Assistente Prisma</span>}>
        <Typography.Paragraph type="secondary">Pergunte livremente sobre a Posição. Por padrão, o Prisma consulta fontes externas aprovadas e mostra as referências usadas. Escolha “Somente fontes internas” apenas quando não quiser consultar o mercado. Não inclua nomes ou dados pessoais. Nenhuma resposta altera dados automaticamente.</Typography.Paragraph>
        <Space align="center" wrap><strong>Onde pesquisar?</strong><Segmented onChange={(value) => setAdvisorScope(value as "market" | "internal")} options={[{ label: "Mercado e fontes externas", value: "market" }, { label: "Somente fontes internas", value: "internal" }]} value={advisorScope} /><Button icon={<QuestionCircleOutlined />} onClick={() => setAdvisorHelpOpen(true)} type="text">Como funciona?</Button></Space>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 7 }} onChange={(event) => setAdvisorQuestion(event.target.value)} onPressEnter={(event) => { if (!event.shiftKey) { event.preventDefault(); void askAdvisor(); } }} placeholder="Ex.: O que está faltando nesta posição de Product Owner?" value={advisorQuestion} />
        <div className="prisma-vacancy-advisor-submit"><Typography.Text type="secondary">Enter para enviar, Shift + Enter para nova linha</Typography.Text><Button disabled={!advisorQuestion.trim()} icon={<BulbOutlined />} loading={advisorLoading} onClick={() => void askAdvisor()} type="primary">Perguntar ao Prisma</Button></div>
        {advisorAnswer ? <div className="prisma-vacancy-advisor-answer">
          <section><Space><strong>Na sua empresa</strong><Tag color={advisorAnswer.internalStatus === "sufficient" ? "success" : advisorAnswer.internalStatus === "partial" ? "gold" : "default"}>{({ sufficient: "Informação suficiente", partial: "Informação parcial", insufficient: "Informação insuficiente" } as const)[advisorAnswer.internalStatus]}</Tag></Space><Typography.Paragraph>{advisorAnswer.internal}</Typography.Paragraph></section>
          <section><Space><strong>No mercado</strong><Tag color={advisorAnswer.webSearched ? "blue" : "default"}>{advisorAnswer.webSearched ? "Web pesquisada agora" : "Somente contexto interno"}</Tag></Space><Typography.Paragraph>{advisorAnswer.market}</Typography.Paragraph></section>
          {advisorAnswer.sources.length ? <section className="prisma-vacancy-advisor-sources"><strong>Fontes consultadas</strong>{advisorAnswer.sources.map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank"><LinkOutlined /> {source.title} · {source.publisher}</a>)}</section> : null}
          <section><strong>Sugestão do Prisma</strong><Typography.Paragraph>{advisorAnswer.suggestion}</Typography.Paragraph></section>
          <footer><Button onClick={() => setAdvisorAnswer(null)}>Ignorar</Button>{advisorAnswer.suggestedRequirement ? <Button onClick={addAdvisorRequirement} type="primary">Adicionar à posição</Button> : null}{advisorAnswer.allowKnowledgeReview ? <Button onClick={() => onNavigate("/knowledge")}>Revisar na Knowledge</Button> : null}</footer>
        </div> : null}
        <Modal footer={<Button onClick={() => setAdvisorHelpOpen(false)} type="primary">Entendi</Button>} onCancel={() => setAdvisorHelpOpen(false)} open={advisorHelpOpen} title="Como o Assistente Prisma pesquisa">
          <Typography.Paragraph><strong>Mercado e fontes externas</strong> é o modo padrão. Qualquer pergunta enviada consulta fontes externas aprovadas e apresenta uma síntese, ressalvas e links para as fontes utilizadas.</Typography.Paragraph>
          <Typography.Paragraph><strong>Somente fontes internas</strong> não consulta a Web. A resposta usa apenas a Posição atual, Posições e funções acessíveis da empresa e conceitos publicados na Knowledge permitida.</Typography.Paragraph>
          <Typography.Paragraph><strong>Exemplos de mercado:</strong> “Quais competências são mais pedidas para esta função?”; “Como essa posição aparece em empresas maiores?”; “Quais tecnologias são relevantes hoje?”</Typography.Paragraph>
          <Typography.Paragraph><strong>Exemplos internos:</strong> “O que esta Posição exige?”; “Quais requisitos aparecem nas nossas Posições?”; “O que a empresa já registra sobre esta tecnologia?”</Typography.Paragraph>
          <Typography.Paragraph>Na pesquisa externa, o Prisma envia somente a pergunta, o título e a área da Posição, o idioma e a data. Não envia Pessoas, Perfis, currículos, descrição completa da Posição, nome da empresa ou dados pessoais. A mesma consulta pode reutilizar um resultado verificado das últimas 24 horas.</Typography.Paragraph>
          <Typography.Paragraph>Nenhuma resposta altera a Posição automaticamente. Fontes externas só são usadas quando aprovadas e verificáveis; se a pesquisa não puder ocorrer, a análise interna é preservada e o Prisma informa a falha.</Typography.Paragraph>
        </Modal>
      </PrismaCard>
      <PrismaCard className="prisma-vacancy-save-bar"><Checkbox checked={draft.saveAsRole} onChange={(event) => update("saveAsRole", event.target.checked)}>Usar esta definição como referência da empresa</Checkbox><Space><Button onClick={() => onNavigate(vacancyId ? `/vacancies/${vacancyId}` : "/vacancies")}>Cancelar</Button><Button htmlType="submit" loading={saving} type="primary">Salvar posição</Button></Space></PrismaCard>
    </Form>
  </PrismaPage>;
}

export function VacancyAssistPage({ onNavigate }: CommonProps) {
  const draftScope = usePrismaScope();
  const [description, setDescription] = useState("");
  const markSaved = useUnsavedChanges(description.trim().length > 0);
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
    const base = readDraft(draftScope);
    const structured = { ...applyStructuredDescription({ ...base, title: base.title || inferTitle(description) }, description, suggestions), requirements: reviewRequirements };
    persistDraft(structured, draftScope); markSaved(); onNavigate("/vacancies/new");
  }
  return <PrismaPage className="prisma-vacancy-assist-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies/new")} type="text">Voltar para Nova posição</Button>
    <PrismaPageHeader title="Estruturar posição com ajuda do Prisma" description="Descrição da posição é a fonte original. A estrutura sugerida é uma interpretação revisável, sem enriquecimento externo." />
    <Alert icon={<RobotOutlined />} message="A assistência externa permanece desativada. Esta preparação é determinística, não envia dados a terceiros e não salva nada antes da sua revisão." showIcon type="info" />
    <div className="prisma-vacancy-assist-grid">
      <PrismaCard title="1. Descrição da posição · fonte original"><Input.TextArea maxLength={5000} onChange={(event) => setDescription(event.target.value)} placeholder="Cole aqui a descrição profissional..." rows={23} showCount value={description} /><div className="prisma-vacancy-assist-actions"><Button icon={<DeleteOutlined />} onClick={() => { setDescription(""); setSuggestions([]); }}>Limpar texto</Button><Button disabled={!description.trim()} icon={<BulbOutlined />} onClick={analyze} type="primary">Estruturar descrição</Button></div></PrismaCard>
      <PrismaCard title="2. Revisar e ajustar">
        {!suggestions.length ? <Empty description="A estrutura sugerida aparecerá aqui para revisão." /> : <><section className="prisma-assist-suggestion-group"><strong>Sobre a posição, responsabilidades e resultados</strong>{suggestions.filter((item) => ["mission", "responsibility", "outcome", "context"].includes(item.category)).map((item) => <Checkbox checked={item.selected} key={item.id} onChange={(event) => setSuggestions((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: event.target.checked } : candidate))}><span>{item.label}</span><small>{item.category === "mission" ? "Sobre a posição" : item.category === "context" ? "Contexto consolidado em Sobre a posição" : item.category === "responsibility" ? "Responsabilidade" : "Resultado esperado"}</small></Checkbox>)}</section><section className="prisma-assist-suggestion-group"><strong>Requisitos identificados pelo Prisma</strong><Space wrap><Button onClick={() => { setReviewRequirements((current) => current.map((item) => ({ ...item, importance: "required", importanceConfirmed: true }))); setClassificationMode("batch"); }}>Todos obrigatórios</Button><Button onClick={() => { setReviewRequirements((current) => current.map((item) => ({ ...item, importance: "desired", importanceConfirmed: true }))); setClassificationMode("batch"); }}>Todos desejáveis</Button><Button onClick={() => setClassificationMode("individual")} type="primary">Quero classificar</Button><Button icon={<PlusOutlined />} onClick={() => { setReviewRequirements((current) => [...current, newManualVacancyRequirement()]); setClassificationMode("individual"); }}>Adicionar requisito</Button></Space>{classificationMode === "individual" ? <div className="prisma-requirement-editor-list">{reviewRequirements.map((item, index) => <RequirementEditor invalid={!item.label.trim() || item.importance === "unclassified"} item={item} key={item.stableId} onChange={(next) => setReviewRequirements((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? next : candidate))} onRemove={() => setReviewRequirements((current) => current.filter((_, candidateIndex) => candidateIndex !== index))} />)}</div> : <Typography.Paragraph type="secondary">Escolha um modo em lote ou “Quero classificar” para revisar item a item.</Typography.Paragraph>}</section></>}
      </PrismaCard>
    </div>
    <PrismaCard className="prisma-vacancy-save-bar"><Typography.Text type="secondary">Rascunhos podem permanecer incompletos. A Posição só entra no matching após classificar cada requisito ativo.</Typography.Text><Space><Button onClick={() => onNavigate("/vacancies/new")}>Editar manualmente</Button><Button disabled={!suggestions.some((item) => item.selected)} onClick={confirm} type="primary">Confirmar estrutura</Button></Space></PrismaCard>
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
      .catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível carregar a Posição.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, vacancyId]);
  if (loading) return <PrismaPage><PrismaCard><Skeleton active paragraph={{ rows: 18 }} /></PrismaCard></PrismaPage>;
  if (!detail) return <PrismaPage><Alert showIcon title={error ?? "Posição não encontrada."} type="error" /></PrismaPage>;
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
      setError(errorMessage(caught, "Não foi possível excluir a Posição."));
    } finally {
      setDeleting(false);
    }
  }
  return <PrismaPage className="prisma-vacancy-detail-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/vacancies")} type="text">Voltar para Posições</Button>
    <div className="prisma-vacancy-detail-header"><div><Space wrap><Typography.Title level={1}>{detail.title}</Typography.Title><OccupancyTag occupancy={detail.occupancy} /></Space><div className="prisma-vacancy-meta"><span><ApartmentOutlined /> {detail.area || "Área não informada"}</span><span><EnvironmentOutlined /> {detail.location || "Localidade não informada"}</span>{detail.employmentType ? <span>{detail.employmentType}</span> : null}{detail.occupantName ? <span><UserOutlined /> Ocupada por {detail.occupantName}</span> : null}<span>Definição v{detail.version}</span></div></div><Space wrap><Button icon={<EditOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/edit`)}>Editar posição</Button><Popconfirm cancelText="Cancelar" description="Esta necessidade sairá da lista. O histórico de definições e avaliações será preservado." okButtonProps={{ danger: true, loading: deleting }} okText="Excluir posição" onConfirm={() => void removeVacancy()} title="Excluir esta Posição?"><Button danger icon={<DeleteOutlined />} loading={deleting}>Excluir</Button></Popconfirm><Button icon={<TeamOutlined />} onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">{detail.occupancy === "occupied" ? "Avaliar Pessoa atual" : "Encontrar pessoas"}</Button></Space></div>
    {error ? <Alert showIcon title={error} type="error" /> : null}
    <PositionTaxonomyPanel draft={detail} membership={activeMembership} onEdit={() => onNavigate(`/vacancies/${detail.id}/edit`)} />
    <Tabs items={[
      { key: "overview", label: "Visão geral", children: <div className="prisma-vacancy-detail-stack">{[detail.mission, ...detail.contextItems].some((item) => item.trim()) ? <DetailSection icon={<AimOutlined />} title="Sobre a posição"><Typography.Paragraph>{[detail.mission, ...detail.contextItems].filter(Boolean).join(" ")}</Typography.Paragraph></DetailSection> : null}{detail.responsibilities.length ? <DetailList icon={<TeamOutlined />} items={detail.responsibilities} title="Responsabilidades" /> : null}{pending.length ? <RequirementDimensionGroups icon={<ClockCircleOutlined />} items={pending} title="Requisitos para classificar" /> : null}{required.length ? <RequirementDimensionGroups icon={<StarOutlined />} items={required} title="Requisitos obrigatórios" /> : null}{desired.length ? <RequirementDimensionGroups icon={<StarOutlined />} items={desired} title="Requisitos desejáveis" /> : null}{detail.expectedOutcomes.length ? <DetailList icon={<CheckCircleOutlined />} items={detail.expectedOutcomes} title="Resultados esperados" /> : null}</div> },
      { key: "people", label: "Pessoas encontradas", children: <Empty description="A descoberta é calculada sob demanda para não carregar todos os Perfis na abertura."><Button onClick={() => onNavigate(`/vacancies/${detail.id}/people`)} type="primary">Encontrar pessoas</Button></Empty> },
      { key: "history", label: "Histórico", children: <PrismaCard><List dataSource={history} locale={{ emptyText: "Nenhuma alteração registrada." }} renderItem={(item) => <List.Item><List.Item.Meta avatar={<HistoryOutlined />} title={historyLabel(item.type)} description={`${item.version ? `Definição v${item.version} · ` : ""}${formatDate(item.createdAt)}`} /></List.Item>} /></PrismaCard> },
    ]} />
  </PrismaPage>;
}

export function VacancyPeoplePage({ activeMembership, onNavigate, vacancyId }: CommonProps & { vacancyId: string }) {
  const generation = useRef(0);
  const evaluationRequest = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [matches, setMatches] = useState<VacancyCandidateMatch[]>([]);
  const [discovery, setDiscovery] = useState<Omit<VacancyPeopleDiscovery, "matches"> | null>(null);
  const [selected, setSelected] = useViewState<string[]>("selected", []);
  const [activeMatch, setActiveMatch] = useState<VacancyCandidateMatch | null>(null);
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(null);
  const [decidingPersonId, setDecidingPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    generation.current += 1; evaluationRequest.current += 1;
    const controller = new AbortController();
    setLoading(true); setError(null); setMatches([]); setDiscovery(null); setProgress(null); setVacancy(null); setActiveMatch(null); setActiveEvaluationId(null); setDecidingPersonId(null);
    void vacancyService.load(activeMembership.organizationId, vacancyId).then(async (detail) => {
      if (!detail) throw new Error("A Posição não foi encontrada.");
      if (!current) return;
      setVacancy(detail);
      const result = await vacancyService.findPeople(activeMembership.organizationId, detail, true, (completed, total) => { if (current) setProgress({ completed, total }); }, controller.signal);
      if (current) { const { matches: found, ...summary } = result; setVacancy(detail); setMatches(found); setDiscovery(summary); }
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível encontrar Pessoas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; generation.current += 1; evaluationRequest.current += 1; controller.abort(); };
  }, [activeMembership.organizationId, vacancyId, attempt]);
  async function evaluate(match: VacancyCandidateMatch) {
    const scope = generation.current, request = ++evaluationRequest.current;
    setError(null);
    if (match.semanticAssessment) {
      setActiveEvaluationId(null); setActiveMatch(match);
      if (match.semanticAssessment.status !== "complete" || match.score.score === null) return;
    }
    try {
      const evaluationId = vacancy ? await vacancyService.recordEvaluation(vacancy, match) : null;
      if (scope !== generation.current || request !== evaluationRequest.current) return;
      setActiveEvaluationId(evaluationId);
      setActiveMatch(match);
    }
    catch (caught) { if (scope === generation.current && request === evaluationRequest.current) setError(errorMessage(caught, "A aderência foi calculada, mas não pôde ser registrada.")); }
  }
  async function decidePosition(match: VacancyCandidateMatch, decision: Exclude<VacancyPositionRelationDecision, null>) {
    if (!vacancy) return;
    const scope = generation.current;
    setDecidingPersonId(match.candidate.personId); setError(null);
    try {
      await vacancyService.recordPositionRelationDecision(vacancy, match, decision);
      if (scope !== generation.current) return;
      setMatches((current) => sortVacancyMatches(current.map((item) => item.candidate.personId === match.candidate.personId ? { ...item, positionDecision: decision } : item)));
    } catch (caught) { if (scope === generation.current) setError(errorMessage(caught, "Não foi possível registrar sua decisão sobre esta relação.")); }
    finally { if (scope === generation.current) setDecidingPersonId(null); }
  }
  function toggle(personId: string) {
    if (!selected.includes(personId) && selected.length === 2) { setError("Você já selecionou duas pessoas. Remova uma antes de escolher outra."); return; }
    setSelected((current) => toggleComparisonSelection(current, personId));
  }
  const comparisonPending = semanticComparisonPending(matches);
  const pendingMatches = matches.filter(match => match.semanticAssessment && match.semanticAssessment.status !== "complete");
  return <PrismaPage className="prisma-vacancy-people-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}`)} type="text">Voltar para a Posição</Button>
    <PrismaPageHeader title={vacancy ? `Pessoas para ${vacancy.title}` : "Pessoas encontradas"} description="A trajetória e os requisitos são apresentados separadamente. O score organiza evidências, não decide contratação. Consulte cobertura e pendências antes de comparar." actions={<Button disabled={selected.length !== 2} icon={<SwapOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}/compare/${selected.join("/")}`)} type="primary">Comparar selecionadas ({selected.length}/2)</Button>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {discovery ? <Alert showIcon type={discovery.unclassifiedRequirementCount ? "warning" : "info"} title={`${discovery.analyzedProfileCount} de ${discovery.publishedProfileCount} Perfis publicados consultados.`} description={discovery.unclassifiedRequirementCount ? `${discovery.unclassifiedRequirementCount} requisito${discovery.unclassifiedRequirementCount === 1 ? " aguarda" : "s aguardam"} classificação. A descoberta ocupacional continua disponível; conclua a classificação para fechar a aderência detalhada.` : "A análise percorreu todos os Perfis publicados acessíveis da empresa."} action={discovery.unclassifiedRequirementCount ? <Button onClick={() => onNavigate(`/vacancies/${vacancyId}/edit`)}>Classificar requisitos</Button> : undefined} /> : null}
    {loading ? <PrismaCard><div role="status" aria-live="polite">{progress ? `Interpretando trajetórias: ${progress.completed} de ${progress.total}. O conjunto será exibido sem reordenações parciais.` : "Carregando Perfis publicados…"}</div><Skeleton active avatar paragraph={{ rows: 14 }} /></PrismaCard> : null}
    {vacancy && !loading ? <Alert showIcon type={comparisonPending ? "warning" : "info"} title={isSemanticPilot(vacancy.title) ? comparisonPending ? "Comparação ainda incompleta · sem prioridade segura" : "Trajetória interpretada com critérios versionados" : "Método determinístico anterior"} description={isSemanticPilot(vacancy.title) ? comparisonPending ? "Há evidências ou análises pendentes. A ordem dentro dos grupos é alfabética, não uma recomendação de prioridade." : "A IA classifica evidências; regras fixas calculam os pontos. Histórico técnico é preservado e ferramentas específicas exigem evidência própria." : "A leitura semântica foi validada inicialmente para desenvolvimento backend. Esta Posição mantém o método anterior."} /> : null}
    {pendingMatches.length ? <Button disabled={loading} onClick={() => setAttempt(value => value + 1)}>Atualizar análise disponível</Button> : null}
    {pendingMatches.length ? <section className="prisma-vacancy-match-group"><Typography.Title level={2}>Análise pendente · sem classificação</Typography.Title><Typography.Paragraph>Estas Pessoas não foram colocadas em último lugar nem receberam zero. Consulta do Perfil e comparação de requisitos continuam disponíveis.</Typography.Paragraph><div className="prisma-vacancy-match-list">{pendingMatches.map(match => <CandidateMatchCard deciding={decidingPersonId === match.candidate.personId} key={match.candidate.personId} match={match} onDecision={decision => void decidePosition(match, decision)} onEvaluate={() => void evaluate(match)} onNavigate={onNavigate} onToggle={() => toggle(match.candidate.personId)} selected={selected.includes(match.candidate.personId)} />)}</div></section> : null}
    {!loading && !error && !matches.length ? <PrismaCard><Empty description={discovery?.publishedProfileCount ? "Nenhum Perfil apresentou experiência na área, relação ocupacional ou outra evidência rastreável para esta Posição." : "Não há Perfis publicados acessíveis para esta empresa."}><Button onClick={() => onNavigate(discovery?.publishedProfileCount ? `/vacancies/${vacancyId}/edit` : "/profiles/search")}>{discovery?.publishedProfileCount ? "Revisar Posição" : "Consultar Pessoas"}</Button></Empty></PrismaCard> : null}
    <div className="prisma-vacancy-match-groups">{(["main_area", "related_area", "contextual_signals"] as const).map((group) => {
      const grouped = matches.filter((match) => match.discoveryGroup === group && (!match.semanticAssessment || match.semanticAssessment.status === "complete"));
      if (!grouped.length) return null;
      const title = group === "main_area" ? "Grupo A · trajetória diretamente compatível" : group === "related_area" ? "Grupo B · trajetória relacionada ou potencial de entrada" : `Grupo C · somente sinais contextuais (${grouped.length})`;
      const description = isSemanticPilot(vacancy?.title ?? "") ? (group === "main_area" ? "Execução backend demonstrada." : group === "related_area" ? "Atuação relacionada em software; especialização backend não presumida." : "Declarações ou contexto sem atuação técnica suficiente para elegibilidade.") + (comparisonPending ? " Ordem alfabética; comparação incompleta." : " Pontos comparáveis somente dentro do grupo.") : group === "main_area" ? "Há experiência profissional direta na área ou em função equivalente. Ordem: maior Prisma Score primeiro." : group === "related_area" ? "Há trajetória adjacente ou transferível; em Posições de entrada, formação, projetos e conhecimentos também podem sustentar este grupo. Ordem: maior Prisma Score primeiro." : "Termos, ferramentas ou outros sinais foram encontrados, mas não há trajetória profissional relacionada suficiente para um Prisma Score comparável.";
      const cards = <div className="prisma-vacancy-match-list">{grouped.map((match) => <CandidateMatchCard deciding={decidingPersonId === match.candidate.personId} key={match.candidate.personId} match={match} onDecision={(decision) => void decidePosition(match, decision)} onEvaluate={() => void evaluate(match)} onNavigate={onNavigate} onToggle={() => toggle(match.candidate.personId)} selected={selected.includes(match.candidate.personId)} />)}</div>;
      return group === "contextual_signals"
        ? <details className="prisma-vacancy-match-group prisma-contextual-signals-group" key={group}><summary><strong>{title}</strong><span>{description}</span></summary>{cards}</details>
        : <section className="prisma-vacancy-match-group" key={group}><header><Typography.Title level={2}>{title}</Typography.Title><Typography.Text type="secondary">{description}</Typography.Text></header>{cards}</section>;
    })}</div>
    <MatchDrawer evaluationId={activeEvaluationId} match={activeMatch} onClose={() => { evaluationRequest.current += 1; setActiveMatch(null); setActiveEvaluationId(null); }} onNavigate={onNavigate} open={Boolean(activeMatch)} vacancy={vacancy} />
  </PrismaPage>;
}

export function VacancyComparePage({ activeMembership, onNavigate, personIds, vacancyId }: CommonProps & { personIds: [string, string]; vacancyId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [matches, setMatches] = useState<VacancyCandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true); setError(null); setMatches([]); setVacancy(null);
    void vacancyService.load(activeMembership.organizationId, vacancyId).then(async (detail) => {
      if (!detail) throw new Error("A Posição não foi encontrada.");
      if (!current) return;
      const result = await vacancyService.loadPeopleByIds(activeMembership.organizationId, detail, personIds, true, controller.signal);
      if (current) { setVacancy(detail); setMatches(result); }
    }).catch((caught) => { if (current) setError(errorMessage(caught, "Não foi possível comparar estas Pessoas.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [activeMembership.organizationId, vacancyId, personIds[0], personIds[1], attempt]);
  const rows = vacancy?.requirements.map((requirement) => ({ key: requirement.stableId, label: requirement.label,
    left: matches[0]?.requirements.find((item) => item.requirement.stableId === requirement.stableId), right: matches[1]?.requirements.find((item) => item.requirement.stableId === requirement.stableId) })) ?? [];
  return <PrismaPage className="prisma-vacancy-compare-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/vacancies/${vacancyId}/people`)} type="text">Voltar aos resultados</Button>
    <PrismaPageHeader title="Comparar pessoas" description={vacancy ? `Evidências para ${vacancy.title}. Interpretação versionada, sem decisão automática.` : "Aderência por requisito da Posição."} />
    {error ? <Alert showIcon title={error} type="error" /> : null}
    {loading ? <PrismaCard><Skeleton active paragraph={{ rows: 14 }} /></PrismaCard> : null}
    {!loading && matches.length !== 2 ? <PrismaCard><Empty description="Selecione exatamente duas Pessoas com Perfil publicado." /></PrismaCard> : null}
    {matches.some(match => match.semanticAssessment && match.semanticAssessment.status !== "complete") ? <Button disabled={loading} onClick={() => setAttempt(value => value + 1)}>Atualizar análise disponível</Button> : null}
    {semanticComparisonPending(matches) ? <Alert showIcon type="warning" title="Comparação incompleta · sem prioridade segura" description="As notas provisórias e as análises pendentes não determinam quem deve ter prioridade. Consulte evidências e lacunas." /> : null}
    {matches.length === 2 ? <>
      {matches.some((match) => match.detailedStatus !== "ready") ? <Alert showIcon type="warning" title="Aderência detalhada ainda incompleta" description="A relação ocupacional continua comparável. Classifique os requisitos pendentes para concluir obrigatórios e lacunas." /> : null}
      <div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard key={match.candidate.personId}><div className="prisma-match-person"><AvatarInitials name={match.candidate.fullName} /><div>
        <Typography.Title level={3}>{match.candidate.fullName}</Typography.Title>
        <Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small>
        {!match.semanticAssessment || match.semanticAssessment.status === "complete" ? <><Space wrap><MatchRelationTags match={match} />{match.positionDecision === "confirmed" ? <Tag color="green">Relação confirmada</Tag> : match.positionDecision === "dismissed" ? <Tag>Não considerar</Tag> : null}</Space><Typography.Paragraph>{match.areaRelation.explanation}</Typography.Paragraph><Typography.Paragraph>{match.functionAssessment.explanation}</Typography.Paragraph></> : null}
        {match.semanticAssessment ? <MatchingScoreSummary match={match} /> : null}
      </div></div></PrismaCard>)}</div>
      <PrismaCard className="prisma-comparison-table"><Table columns={comparisonColumns(matches)} dataSource={rows} pagination={false} scroll={{ x: 620 }} /></PrismaCard>
      <div className="prisma-comparison-mobile">{rows.map((row) => <PrismaCard key={row.key} title={row.label}><div><strong>{matches[0]!.candidate.fullName}</strong>{row.left ? <MatchStatusTag status={row.left.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.left?.explanation}</Typography.Paragraph></div><div><strong>{matches[1]!.candidate.fullName}</strong>{row.right ? <MatchStatusTag status={row.right.status} /> : <Tag>Não avaliado</Tag>}<Typography.Paragraph>{row.right?.explanation}</Typography.Paragraph></div></PrismaCard>)}</div>
      <Typography.Title level={2}>Destaques objetivos</Typography.Title><div className="prisma-vacancy-compare-people">{matches.map((match) => <PrismaCard className="prisma-match-highlight-card" key={match.candidate.personId} title={match.candidate.fullName}><ul>{match.requirements.filter((item) => item.status !== "no_evidence").slice(0, 5).map((item) => <li key={item.requirement.stableId}><CheckCircleOutlined /> {item.explanation}</li>)}</ul></PrismaCard>)}</div>
    </> : null}
  </PrismaPage>;
}

function RequirementEditor({ invalid, item, onChange, onRemove }: { invalid: boolean; item: VacancyRequirementDraft; onChange: (item: VacancyRequirementDraft) => void; onRemove: () => void }) {
  return <div className={`prisma-requirement-editor ${invalid ? "has-validation-error" : ""}`}><label><span>Requisito</span><Input {...(invalid && !item.label.trim() ? { status: "error" as const } : {})} aria-invalid={invalid && !item.label.trim()} aria-label="Requisito" onChange={(event) => { const category = inferRequirementCategory(event.target.value); onChange({ ...item, label: event.target.value, observedTerm: event.target.value, category, proposedCategory: category, categoryConfirmed: false, conceptId: null, conceptLabel: null, relatedSignals: [] }); }} placeholder="Ex.: Gestão de pipeline" value={item.label} /></label><label><span>Dimensão profissional</span><Select aria-label="Dimensão profissional" onChange={(category) => onChange({ ...item, category, categoryConfirmed: true })} options={vacancyRequirementCategories} value={item.category} /></label><label><span>Importância</span><Segmented block className="prisma-requirement-importance" onChange={(value) => onChange({ ...item, importance: value as VacancyRequirementDraft["importance"], importanceConfirmed: true })} options={[{ label: "Obrigatório", value: "required" }, { label: "Desejável", value: "desired" }]} value={item.importance} />{item.importance === "unclassified" ? <small>Escolha Obrigatório ou Desejável antes de salvar.</small> : null}</label><Popconfirm description="Remover este requisito da definição atual?" onConfirm={onRemove} title="Remover requisito"><Button aria-label="Remover requisito" danger icon={<DeleteOutlined />} type="text" /></Popconfirm></div>;
}

function RequirementDimensionGroups({ icon, items, title }: { icon: ReactNode; items: VacancyRequirementDraft[]; title: string }) {
  const groups = vacancyRequirementCategories.map((category) => ({ ...category, items: items.filter((item) => item.category === category.value) })).filter((group) => group.items.length);
  return <PrismaCard title={<span>{icon} {title}</span>}><div className="prisma-vacancy-dimension-groups">{groups.map((group) => <section key={group.value}><strong>{group.label}</strong><ul>{group.items.map((item) => <li key={item.stableId}>{item.label}{item.taxonomyOrigin ? <TaxonomyOriginDetails item={item.taxonomyOrigin} /> : null}</li>)}</ul></section>)}</div></PrismaCard>;
}

function StringListEditor({ label, onChange, placeholder, values }: { label: string; onChange: (values: string[]) => void; placeholder: string; values: string[] }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<InputRef>(null);
  function add() { const value = input.trim(); if (!value) return; onChange([...values, value]); setInput(""); }
  function addFromEnter(event: KeyboardEvent<HTMLInputElement>) { event.preventDefault(); add(); window.requestAnimationFrame(() => inputRef.current?.focus()); }
  return <PrismaCard className="prisma-vacancy-form-section" title={label}><div className="prisma-string-list">{values.map((value, index) => <div key={`${value}-${index}`}><Input onChange={(event) => onChange(values.map((item, currentIndex) => currentIndex === index ? event.target.value : item))} value={value} /><Button aria-label={`Remover ${value}`} danger icon={<DeleteOutlined />} onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))} type="text" /></div>)}</div><Input onChange={(event) => setInput(event.target.value)} onPressEnter={addFromEnter} placeholder={placeholder} ref={inputRef} suffix={<Button icon={<PlusOutlined />} onClick={add} size="small" type="text" />} value={input} /></PrismaCard>;
}

function CandidateMatchCard({ deciding, match, onDecision, onEvaluate, onNavigate, onToggle, selected }: { deciding: boolean; match: VacancyCandidateMatch; onDecision: (decision: Exclude<VacancyPositionRelationDecision, null>) => void; onEvaluate: () => void; onNavigate: (path: string) => void; onToggle: () => void; selected: boolean }) {
  if (match.semanticAssessment && match.semanticAssessment.status !== "complete") return <PrismaCard className={`prisma-vacancy-match-card${selected ? " is-selected" : ""}`}><article>
    <header><Checkbox checked={selected} onChange={onToggle} /><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil publicado"}</Typography.Text></div><Space orientation="vertical"><Button onClick={() => onNavigate(`/profiles/${match.candidate.personId}/profile`)} type="primary">Ver perfil</Button><Button onClick={onEvaluate}>Ver análise disponível</Button></Space></header>
    <MatchingScoreSummary match={match} /><Typography.Text type="secondary">Requisitos consultados: {match.directCount} com evidência direta, {match.partialCount} parciais. Compare as evidências sem atribuir prioridade pela pendência.</Typography.Text>
  </article></PrismaCard>;
  const met = match.requirements.filter((item) => item.status === "met");
  const partial = match.requirements.filter((item) => item.status === "partially_met");
  const related = match.requirements.filter((item) => item.status === "related_signal");
  const missing = match.requirements.filter((item) => item.status === "no_evidence");
  const contextualSignals = Array.from(new Set([...met, ...partial, ...related].map((item) => item.requirement.label).concat(match.trajectoryAssessment.evidence.map((item) => item.label))));
  return <PrismaCard className={`prisma-vacancy-match-card${selected ? " is-selected" : ""}${match.positionDecision === "dismissed" ? " is-dismissed" : ""}`}><article><header><Checkbox checked={selected} onChange={onToggle} /><AvatarInitials name={match.candidate.fullName} /><div><Typography.Title level={3}>{match.candidate.fullName}</Typography.Title><Typography.Text>{match.candidate.profileData.professionalTitle || "Perfil profissional"}</Typography.Text><small>{match.candidate.location || "Localização não informada"}</small><Space className="prisma-position-relation-tags" wrap><MatchRelationTags match={match} />{match.positionDecision === "confirmed" ? <Tag color="green">Relação confirmada por você</Tag> : match.positionDecision === "dismissed" ? <Tag>Não considerar</Tag> : null}<DetailedStatusTag match={match} /></Space></div><Space orientation="vertical"><Button onClick={() => onNavigate(`/profiles/${match.candidate.personId}/profile`)} type="primary">Ver perfil</Button><Button onClick={onEvaluate}>{match.semanticAssessment && match.semanticAssessment.status !== "complete" ? "Ver análise disponível" : match.discoveryGroup === "contextual_signals" ? "Ver sinais encontrados" : "Ver como o score foi calculado"}</Button></Space></header><MatchingScoreSummary match={match} />{match.candidate.profileData.summary ? <Typography.Paragraph ellipsis={{ rows: 2 }}>{match.candidate.profileData.summary}</Typography.Paragraph> : null}<section className="prisma-position-relation"><strong>Por que esta Pessoa aparece</strong><Typography.Text strong>Relação da trajetória</Typography.Text><Typography.Paragraph>{match.trajectoryAssessment.explanation}</Typography.Paragraph>{match.areaRelation.status !== "none" ? <><Typography.Text strong>Área profissional observada</Typography.Text><Typography.Paragraph>{match.areaRelation.explanation}</Typography.Paragraph></> : null}<Typography.Text strong>Proximidade do cargo</Typography.Text><Typography.Paragraph>{match.positionRelation.explanation}</Typography.Paragraph><Space wrap><Button disabled={(Boolean(match.semanticAssessment) && match.semanticAssessment?.status !== "complete") || match.positionDecision === "confirmed"} loading={deciding} onClick={() => onDecision("confirmed")} size="small" type={match.positionDecision === "confirmed" ? "default" : "primary"}>Confirmar relação</Button><Button disabled={(Boolean(match.semanticAssessment) && match.semanticAssessment?.status !== "complete") || match.positionDecision === "dismissed"} loading={deciding} onClick={() => onDecision("dismissed")} size="small">Não considerar</Button></Space></section><section className="prisma-match-reasons"><strong><FileSearchOutlined /> Evidências que trouxeram o Perfil</strong><Space wrap>{match.reasons.slice(0, 5).map((reason) => <Tag key={reason}>{reason}</Tag>)}</Space></section>{match.discoveryGroup === "contextual_signals" ? <div className="prisma-match-evidence-grid"><MatchBucket color="warning" items={contextualSignals} title={`Sinais encontrados (${contextualSignals.length})`} /></div> : <div className="prisma-match-evidence-grid"><MatchBucket color="success" items={met.map((item) => item.requirement.label)} title={`Atendidos (${met.length})`} /><MatchBucket color="warning" items={partial.map((item) => item.requirement.label)} title={`Parciais para revisão (${partial.length})`} /><MatchBucket color="warning" items={related.map((item) => `${item.relatedSignal}: sinal relacionado`)} title={`Sinais relacionados (${related.length})`} /><MatchBucket color="error" items={missing.map((item) => item.requirement.label)} title={`Sem evidência suficiente (${missing.length})`} /></div>}</article></PrismaCard>;
}

function MatchDrawer({ evaluationId, match, onClose, onNavigate, open, vacancy }: { evaluationId: string | null; match: VacancyCandidateMatch | null; onClose: () => void; onNavigate: (path: string) => void; open: boolean; vacancy: VacancyDetail | null }) {
  const contextualOnly = match?.discoveryGroup === "contextual_signals" && (!match.semanticAssessment || match.semanticAssessment.status === "complete");
  return <Drawer className="prisma-matching-score-drawer" onClose={onClose} open={open} size="large" title={match ? `${contextualOnly ? "Sinais Prisma" : "Score Prisma"} de ${match.candidate.fullName}` : "Análise Prisma"}>{match ? <><Alert title={contextualOnly ? "Sinais contextuais observados" : "Compatibilidade profissional observada"} description={contextualOnly ? "O Perfil foi localizado por termos ou requisitos isolados, sem trajetória profissional relacionada suficiente. Esses sinais não formam um Prisma Score comparável e não concorrem no ranking principal." : "O score organiza evidências publicadas. Não mede capacidade absoluta, não prevê desempenho e não decide contratação, rejeição ou descoberta."} showIcon type="info" />{contextualOnly ? <PrismaCard title="Relação da trajetória"><MatchingScoreSummary match={match} expanded /><Typography.Paragraph>{match.trajectoryAssessment.explanation}</Typography.Paragraph>{match.trajectoryAssessment.evidence.map((item) => <Tag key={`${item.sourceId}-${item.label}`}>{item.label} · {item.source}</Tag>)}</PrismaCard> : <><PrismaCard title="Score e cobertura"><MatchingScoreSummary match={match} expanded />{match.score.score !== null ? <Typography.Paragraph>{formatPoints(match.score.earnedPoints)} de {formatPoints(match.score.applicablePoints)} pontos aplicáveis, normalizados para {match.score.score}/100.</Typography.Paragraph> : null}{match.score.provisionalReasons.map((reason) => <Alert key={reason} showIcon title={reason} type="warning" />)}</PrismaCard><PrismaCard title="Como o score foi calculado"><div className="prisma-score-dimensions">{match.score.dimensions.map((dimension) => <ScoreDimension dimension={dimension} key={dimension.key} />)}</div></PrismaCard></>}{contextualOnly ? <PrismaCard title="Como interpretar"><PrismaState compact kind="info" description="O requisito encontrado preserva uma conexão factual, mas não comprova atuação na natureza do trabalho da Posição. A verificação por requisito volta a ficar disponível quando houver trajetória elegível para o matching." /></PrismaCard> : <VerificationRequirementActions evaluationId={evaluationId} match={match} onNavigate={onNavigate} vacancy={vacancy} />}<PrismaCard title="Versões usadas"><dl className="prisma-score-versions"><div><dt>Posição</dt><dd>Definição v{match.score.positionVersionNumber}</dd></div><div><dt>Perfil</dt><dd>Perfil v{match.score.profileVersionNumber}</dd></div><div><dt>Matching</dt><dd>{match.score.matchingContractVersion}</dd></div><div><dt>Score</dt><dd>{match.score.scoreContractVersion}</dd></div>{match.semanticAssessment ? <><div><dt>Interpretação</dt><dd>{match.semanticAssessment.methodVersion}</dd></div><div><dt>Modelo / prompt</dt><dd>{match.semanticAssessment.modelVersion} · {match.semanticAssessment.promptVersion}</dd></div><div><dt>Avaliação derivada</dt><dd>{match.semanticAssessment.analysisId || "Pendente"}</dd></div></> : null}{match.score.knowledgeVersions.length ? <div><dt>Knowledge</dt><dd>{match.score.knowledgeVersions.join("; ")}</dd></div> : null}</dl><details><summary>Identificador técnico reproduzível</summary><code>{match.score.inputFingerprint}</code></details></PrismaCard><PrismaCard title="Experiência na área e proximidade do cargo"><Space wrap><MatchRelationTags match={match} /><EvidenceLevelTag level={match.evidenceAssessment.level} /></Space><Typography.Title level={5}>Relação da trajetória</Typography.Title><Typography.Paragraph>{match.trajectoryAssessment.explanation}</Typography.Paragraph><Typography.Title level={5}>Área profissional</Typography.Title><Typography.Paragraph>{match.areaRelation.explanation}</Typography.Paragraph>{match.areaRelation.evidence.map((item) => <Tag key={`${item.sourceId}-${item.label}`}>{item.label} · {item.source}</Tag>)}<Typography.Title level={5}>Função e senioridade</Typography.Title><Typography.Paragraph>{match.functionAssessment.explanation}</Typography.Paragraph><details><summary>Como a evidência foi avaliada</summary><ul>{match.evidenceAssessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details></PrismaCard>{match.detailedStatus !== "ready" ? <Alert title={match.detailedStatus === "pending_classification" ? "Aderência detalhada pendente" : "A Posição ainda não possui requisitos comparáveis"} description={match.detailedStatus === "pending_classification" ? "A descoberta continua disponível; conclua a classificação para fechar a aderência detalhada." : "A experiência na área e a relação ocupacional continuam disponíveis para sua análise."} showIcon type="warning" /> : null}</> : null}</Drawer>;
}

function VerificationRequirementActions({ evaluationId, match, onNavigate, vacancy }: { evaluationId: string | null; match: VacancyCandidateMatch; onNavigate: (path: string) => void; vacancy: VacancyDetail | null }) {
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, "basic" | "intermediate" | "advanced">>({});
  const [criticalities, setCriticalities] = useState<Record<string, "low" | "medium" | "high" | "critical">>({});
  const candidates = match.requirements.filter((item) => item.status !== "met");
  if (match.semanticAssessment && !evaluationId) return <PrismaCard title="Reduzir incerteza"><PrismaState compact kind="info" description="A consulta manual permanece disponível. Para iniciar uma verificação vinculada a esta avaliação, é necessário confirmar sua análise e suas fontes no servidor. Se a pendência continuar, feche este painel e atualize a análise." /></PrismaCard>;
  if (!candidates.length) return <PrismaCard title="Reduzir incerteza"><PrismaState compact kind="success" description="Todos os requisitos comparáveis já têm evidência direta no Perfil publicado. Uma verificação complementar pode ser preparada futuramente pela central de Verificações." /></PrismaCard>;
  async function createNeed(item: VacancyCandidateMatch["requirements"][number]) {
    if (!evaluationId || !item.requirement.id || !vacancy) return;
    const targetLevel = item.requirement.targetLevel ?? levels[item.requirement.id];
    const criticality = item.requirement.criticality ?? criticalities[item.requirement.id];
    if (!targetLevel || !criticality) { setActionError("Escolha o nível e a criticidade antes de preparar a verificação."); return; }
    setCreatingId(item.requirement.id); setActionError(null);
    try {
      const result = await competencyVerificationService.createNeed({
        matchingEvaluationId: evaluationId,
        requirementId: item.requirement.id,
        targetLevel,
        criticality,
      });
      onNavigate(`/matching/verification-needs/${result.needId}`);
    } catch (caught) { setActionError(errorMessage(caught, "Não foi possível preparar este requisito para verificação.")); }
    finally { setCreatingId(null); }
  }
  return <PrismaCard title="Reduzir incerteza por requisito"><Typography.Paragraph>Escolha um requisito específico. O Prisma preservará a Pessoa, a versão da Posição, a política e as evidências desta avaliação.</Typography.Paragraph>{actionError ? <Alert showIcon title={actionError} type="error" /> : null}<List dataSource={candidates} renderItem={(item) => { const id = item.requirement.id ?? item.requirement.stableId; const level = item.requirement.targetLevel ?? levels[id]; const criticality = item.requirement.criticality ?? criticalities[id]; return <List.Item actions={[<Button disabled={!evaluationId || !item.requirement.id || !level || !criticality} key="verify" loading={creatingId === item.requirement.id} onClick={() => void createNeed(item)} type="primary">Verificar este requisito</Button>]}><List.Item.Meta title={<Space wrap>{item.requirement.label}<MatchStatusTag status={item.status} /></Space>} description={<Space direction="vertical"><Typography.Text type="secondary">{item.explanation}</Typography.Text><Space wrap>{item.requirement.targetLevel ? <Typography.Text>Nível: {labelVacancyLevel(item.requirement.targetLevel)}</Typography.Text> : <Select aria-label={`Nível para ${item.requirement.label}`} onChange={(value) => { if (value) setLevels((current) => ({ ...current, [id]: value })); }} options={[{ value: "basic", label: "Básico" }, { value: "intermediate", label: "Intermediário" }, { value: "advanced", label: "Avançado" }]} placeholder="Escolha o nível" value={levels[id] ?? null} />}{item.requirement.criticality ? <Typography.Text>Criticidade: {labelVacancyCriticality(item.requirement.criticality)}</Typography.Text> : <Select aria-label={`Criticidade para ${item.requirement.label}`} onChange={(value) => { if (value) setCriticalities((current) => ({ ...current, [id]: value })); }} options={[{ value: "low", label: "Baixa" }, { value: "medium", label: "Média" }, { value: "high", label: "Alta" }, { value: "critical", label: "Crítica" }]} placeholder="Escolha a criticidade" value={criticalities[id] ?? null} />}</Space></Space>} /></List.Item>; }} /></PrismaCard>;
}

function labelVacancyLevel(value: NonNullable<VacancyRequirementDraft["targetLevel"]>): string { return ({ basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" } as const)[value]; }
function labelVacancyCriticality(value: NonNullable<VacancyRequirementDraft["criticality"]>): string { return ({ low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" } as const)[value]; }

function MatchingScoreSummary({ expanded = false, match }: { expanded?: boolean; match: VacancyCandidateMatch }) {
  const score = match.score;
  if (match.semanticAssessment && match.semanticAssessment.status !== "complete") return <section className="prisma-score-summary"><strong>Análise pendente</strong><span>{score.unavailableReason}</span><small>Sem nota ou prioridade automática. Consulta manual preservada.</small></section>;
  if (match.discoveryGroup === "contextual_signals") {
    const signalCount = new Set([
      ...match.requirements.filter((item) => item.status !== "no_evidence").map((item) => item.requirement.label),
      ...match.trajectoryAssessment.evidence.map((item) => item.label),
    ]).size;
    return <section className={`prisma-score-summary${expanded ? " is-expanded" : ""}`}><strong>{signalCount} sinal(is)</strong><span>Sem trajetória profissional relacionada</span><small>Não participa do Prisma Score comparável.</small></section>;
  }
  return <section className={`prisma-score-summary${expanded ? " is-expanded" : ""}`}><strong>{score.score === null ? "Score indisponível" : `${score.score}/100`}</strong><span>{score.status === "provisional" ? "Compatibilidade observada provisória" : score.status === "definitive" ? "Compatibilidade observada" : "Critérios insuficientes ou versão desconhecida"}</span><small>Cobertura das evidências: {score.coveragePercent}%</small></section>;
}

function ScoreDimension({ dimension }: { dimension: MatchingScoreDimension }) {
  const labels = { area: "Área profissional", position: "Proximidade da função", required: "Requisitos obrigatórios", desired: "Requisitos desejáveis" } as const;
  return <section><header><strong>{labels[dimension.key]}</strong><span>{formatPoints(dimension.earnedPoints)}/{formatPoints(dimension.applicablePoints)}</span></header><Typography.Paragraph>{dimension.explanation}</Typography.Paragraph>{dimension.evidence.map((item) => <Tag key={item.reference}>{item.label} · {item.source}</Tag>)}{dimension.items?.length ? <List dataSource={dimension.items} renderItem={(item) => <List.Item><List.Item.Meta title={<Space wrap>{item.label}<ScoreItemTag status={item.status} /><strong>{formatPoints(item.earnedPoints)}/{formatPoints(item.applicablePoints)}</strong></Space>} description={<><Typography.Paragraph>{item.explanation}</Typography.Paragraph>{item.evidence.map((evidence) => <Tag key={evidence.reference}>{evidence.label} · {evidence.source}{evidence.sourceVersion ? ` · ${evidence.sourceVersion}` : ""}</Tag>)}</>} /></List.Item>} /> : null}</section>;
}

function ScoreItemTag({ status }: { status: MatchingScoreItemStatus }) {
  const values = { direct: ["success", "Evidência direta"], partial: ["warning", "Atendimento parcial"], related: ["purple", "Sinal profissional relacionado"], no_evidence: ["default", "Sem evidência suficiente"] } as const;
  return <Tag color={values[status][0]}>{values[status][1]}</Tag>;
}

function MatchRelationTags({ match }: { match: VacancyCandidateMatch }) {
  if (match.semanticAssessment && match.semanticAssessment.status !== "complete") return <Tag>Análise pendente</Tag>;
  return <><DiscoveryGroupTag group={match.discoveryGroup} /><AreaRelationTag status={match.areaRelation.status} /><PositionRelationTag status={match.positionRelation.status} /></>;
}

function DiscoveryGroupTag({ group }: { group: VacancyCandidateMatch["discoveryGroup"] }) { const values = { main_area: ["blue", "Trajetória direta"], related_area: ["purple", "Trajetória relacionada"], contextual_signals: ["default", "Somente sinais"] } as const; return <Tag color={values[group][0]}>{values[group][1]}</Tag>; }

function formatPoints(value: number): string { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value); }

function MatchBucket({ color, items, title }: { color: "success" | "warning" | "error"; items: string[]; title: string }) { return <section className={`prisma-match-bucket is-${color}`}><strong>{title}</strong>{items.length ? <Space wrap>{items.map((item) => <Tag color={color} key={item}>{item}</Tag>)}</Space> : <Typography.Text type="secondary">Nenhum item nesta categoria.</Typography.Text>}</section>; }
function AvatarInitials({ name }: { name: string }) { return <div aria-hidden="true" className="prisma-vacancy-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>; }
function OccupancyTag({ occupancy }: { occupancy: VacancyDraft["occupancy"] }) { return occupancy === "occupied" ? <Tag color="blue">Ocupada</Tag> : <Tag color="green">Não ocupada</Tag>; }
function MatchStatusTag({ status }: { status: VacancyMatchStatus }) { const map = { met: ["success", "Atendido"], partially_met: ["warning", "Parcial"], related_signal: ["purple", "Sinal relacionado"], no_evidence: ["error", "Sem evidência suficiente"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function AreaRelationTag({ status }: { status: VacancyAreaRelationStatus }) { const map = { profile_area: ["green", "Área declarada no Perfil"], experience_area: ["blue", "Área citada na experiência"], none: ["default", "Área não identificada"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function PositionRelationTag({ status }: { status: VacancyPositionRelationStatus }) { const map = { interpreted_function: ["blue", "Relação funcional interpretada"], same_reference: ["green", "Mesma referência ocupacional"], equivalent_reference: ["cyan", "Ocupação equivalente"], related_reference: ["blue", "Ocupação relacionada"], possible_title_relation: ["gold", "Possível relação de posição"], none: ["default", "Sem relação automática"] } as const; return <Tag color={map[status][0]}>{map[status][1]}</Tag>; }
function DetailedStatusTag({ match }: { match: VacancyCandidateMatch }) { return match.detailedStatus === "ready" ? <Tag color="blue">Aderência detalhada disponível</Tag> : match.detailedStatus === "pending_classification" ? <Tag color="gold">Aderência pendente · {match.unclassifiedRequirementCount} para classificar</Tag> : <Tag>Sem requisitos comparáveis</Tag>; }
function EvidenceLevelTag({ level }: { level: VacancyCandidateMatch["evidenceAssessment"]["level"] }) { return <Tag color={level === "corroborated" ? "green" : level === "supported" ? "blue" : "default"}>{level === "corroborated" ? "Evidência corroborada" : level === "supported" ? "Evidência sustentada" : "Evidência limitada"}</Tag>; }
function StatusIcon({ status }: { status: VacancyMatchStatus }) { return status === "met" ? <CheckCircleOutlined className="is-success" /> : status === "no_evidence" ? <ExclamationCircleOutlined className="is-error" /> : <ClockCircleOutlined className="is-warning" />; }
function DetailSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) { return <PrismaCard title={<span>{icon} {title}</span>}>{children}</PrismaCard>; }
function DetailList({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}>{items.length ? <ul className="prisma-vacancy-editorial-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <Typography.Text type="secondary">Não informado.</Typography.Text>}</DetailSection>; }
function DetailText({ icon, items, title }: { icon: React.ReactNode; items: string[]; title: string }) { return <DetailSection icon={icon} title={title}>{items.length ? <Typography.Paragraph className="prisma-vacancy-context-text">{items.join("\n\n")}</Typography.Paragraph> : <Typography.Text type="secondary">Não informado.</Typography.Text>}</DetailSection>; }
function RequirementTags({ items, label }: { items: VacancyRequirementDraft[]; label: string }) { return <section><strong>{label}</strong><Space wrap>{items.length ? items.map((item) => <Tag color={label === "Obrigatório" ? "purple" : "blue"} key={item.stableId}>{item.label}</Tag>) : <Typography.Text type="secondary">Nenhum</Typography.Text>}</Space></section>; }

function vacancyColumns(onNavigate: (path: string) => void, onDelete: (item: VacancySummary) => Promise<void>, deletingId: string | null): ColumnsType<VacancySummary> { return [
  { title: "Posição", dataIndex: "title", key: "title", render: (value, item) => <button className="prisma-vacancy-title-link" onClick={() => onNavigate(`/vacancies/${item.id}`)} type="button"><strong>{value}</strong><small>Definição v{item.definitionVersion}</small></button> },
  { title: "Área", dataIndex: "area", key: "area", responsive: ["md"], render: (value) => value || "Não informada" },
  { title: "Situação", dataIndex: "occupancy", key: "occupancy", render: (value) => <OccupancyTag occupancy={value} /> },
  { title: "Pessoa vinculada", dataIndex: "occupantName", key: "occupantName", responsive: ["lg"], render: (value) => value || "Nenhuma" },
  { title: "Ação", key: "action", align: "right", render: (_, item) => <Space wrap size="small"><Button icon={<EditOutlined />} onClick={() => onNavigate(`/vacancies/${item.id}/edit`)}>Editar</Button><Popconfirm cancelText="Cancelar" description="Esta necessidade sairá da lista. O histórico de definições e avaliações será preservado." okButtonProps={{ danger: true, loading: deletingId === item.id }} okText="Excluir posição" onConfirm={() => void onDelete(item)} title="Excluir esta Posição?"><Button aria-label={`Excluir ${item.title}`} danger icon={<DeleteOutlined />} loading={deletingId === item.id}>Excluir</Button></Popconfirm><Button onClick={() => onNavigate(`/vacancies/${item.id}/people`)}>{item.occupancy === "occupied" ? "Avaliar aderência" : "Encontrar pessoas"}</Button></Space> },
]; }

function comparisonColumns(matches: VacancyCandidateMatch[]): ColumnsType<{ key: string; label: string; left: VacancyCandidateMatch["requirements"][number] | undefined; right: VacancyCandidateMatch["requirements"][number] | undefined }> { return [
  { title: "Requisito da Posição", dataIndex: "label", key: "label", fixed: "left", width: 220 },
  { title: matches[0]?.candidate.fullName ?? "Pessoa A", dataIndex: "left", key: "left", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
  { title: matches[1]?.candidate.fullName ?? "Pessoa B", dataIndex: "right", key: "right", render: (value) => value ? <Space orientation="vertical" size={2}><MatchStatusTag status={value.status} /><small>{value.evidence[0]?.label ?? "Nenhuma evidência publicada"}</small></Space> : null },
]; }

const workArrangementOptions = [{ value: "onsite", label: "Presencial" }, { value: "hybrid", label: "Híbrido" }, { value: "remote", label: "Remoto" }, { value: "flexible", label: "Flexível" }];

function groupSuggestions(items: VacancyStructureSuggestion[]): Record<string, VacancyStructureSuggestion[]> { const labels: Record<string, string> = { mission: "Missão", responsibility: "Responsabilidades", outcome: "Resultados esperados", experience: "O que a Pessoa precisa trazer", competency: "O que a Pessoa precisa trazer", knowledge: "O que a Pessoa precisa trazer", technology: "O que a Pessoa precisa trazer", education: "O que a Pessoa precisa trazer", certification: "O que a Pessoa precisa trazer", language: "O que a Pessoa precisa trazer", context: "Contexto da posição" }; return items.reduce<Record<string, VacancyStructureSuggestion[]>>((groups, item) => { const key = labels[item.category] ?? item.category; (groups[key] ??= []).push(item); return groups; }, {}); }
function inferTitle(value: string): string { return value.match(/(?:busca(?:mos)?|procuramos)\s+(?:de\s+)?(?:um|uma)\s+([^,.]+)/i)?.[1]?.trim() ?? ""; }
function historyLabel(value: string): string { return ({ created: "Posição criada", definition_updated: "Definição atualizada", occupancy_updated: "Ocupação atualizada", match_evaluated: "Aderência avaliada", cancelled: "Posição excluída da lista" } as Record<string, string>)[value] ?? "Atualização registrada"; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
function errorMessage(value: unknown, fallback: string): string { return value instanceof Error ? value.message : fallback; }
function persistDraft(draft: VacancyDraft, scope: string): void { window.sessionStorage.setItem(`${DRAFT_KEY}:${scope}`, JSON.stringify(draft)); }
function readDraft(scope: string): VacancyDraft { try { const raw = window.sessionStorage.getItem(`${DRAFT_KEY}:${scope}`); return raw ? { ...emptyVacancyDraft(), ...JSON.parse(raw) as VacancyDraft } : emptyVacancyDraft(); } catch { return emptyVacancyDraft(); } }
function clearDraft(scope: string): void { window.sessionStorage.removeItem(`${DRAFT_KEY}:${scope}`); }
