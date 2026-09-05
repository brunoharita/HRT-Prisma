import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  BankOutlined,
  BookOutlined,
  BulbOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Pagination, Segmented, Select, Skeleton, Space, Switch, Tag, Typography } from "antd";
import { activeFilterCount, emptyProfileSearchQuery, type ProfileSearchQuery, type ProfileSearchResult } from "../domain/profileDiscovery";
import { profileDiscoveryService } from "../infrastructure/supabase/profileDiscoveryService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileSearchPageProps { activeMembership: OrganizationMembership; onNavigate: (path: string) => void; }

const PAGE_SIZE = 8;
const SEARCH_SESSION_KEY = "prisma.profile-search.1";

export function ProfileSearchPage({ activeMembership, onNavigate }: ProfileSearchPageProps) {
  const restored = useMemo(readSearchSession, []);
  const [query, setQuery] = useState<ProfileSearchQuery>(restored?.query ?? emptyProfileSearchQuery());
  const [results, setResults] = useState<ProfileSearchResult[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(restored?.selectedIds ?? []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canReadLocation = activeMembership.role !== "member";
  const pageResults = useMemo(() => (results ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, results]);

  useEffect(() => {
    if (!restored) return;
    void executeSearch(true);
  }, []);

  function update<K extends keyof ProfileSearchQuery>(key: K, value: ProfileSearchQuery[K]) {
    setQuery((current) => ({ ...current, [key]: value }));
  }
  async function executeSearch(preserveSelection = false) {
    setLoading(true); setError(null); setPage(1); if (!preserveSelection) setSelectedIds([]);
    try { setResults(await profileDiscoveryService.search(activeMembership.organizationId, query, canReadLocation)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível encontrar Perfis agora."); }
    finally { setLoading(false); }
  }
  function toggleSelection(personId: string) {
    setSelectedIds((current) => current.includes(personId) ? current.filter((id) => id !== personId) : current.length < 2 ? [...current, personId] : [current[1]!, personId]);
  }

  return <PrismaPage className="prisma-profile-search-page">
    <Button className="prisma-profile-search-back" icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>
    <PrismaPageHeader title="Encontrar pessoas" description="Use os mesmos blocos do Perfil para encontrar as pessoas adequadas." />
    <PrismaCard
      className="prisma-profile-search-workspace"
      extra={activeFilterCount(query) ? <Tag color="blue">{activeFilterCount(query)} filtros ativos</Tag> : <Typography.Text type="secondary">Comece pelos critérios essenciais</Typography.Text>}
      title={<span className="prisma-profile-search-workspace-title"><SearchOutlined /> Critérios de busca</span>}
    >
      <div className="prisma-profile-search-filter-grid" aria-label="Filtros de Perfil">
        <FilterSection icon={<BankOutlined />} title="Experiência">
          <Field label="Cargo"><Input allowClear onChange={(event) => update("role", event.target.value)} placeholder="Ex.: Gerente de Projetos" value={query.role} /></Field>
          <div className="prisma-search-field-grid"><Field label="Área"><Input allowClear onChange={(event) => update("area", event.target.value)} placeholder="Ex.: Operações" value={query.area} /></Field><Field label="Organização"><Input allowClear onChange={(event) => update("organization", event.target.value)} placeholder="Nome da organização" value={query.organization} /></Field></div>
          <div className="prisma-search-field-grid"><Field label="Anos mínimos"><InputNumber min={0} onChange={(value) => update("minimumYears", value)} placeholder="Qualquer" value={query.minimumYears} /></Field><Field label="Experiência atual"><div className="prisma-search-switch"><Switch checked={query.currentExperienceOnly} onChange={(value) => update("currentExperienceOnly", value)} /><span>Somente vínculo atual</span></div></Field></div>
        </FilterSection>
        <FilterSection icon={<BookOutlined />} title="Formação">
          <div className="prisma-search-field-grid"><Field label="Curso"><Input allowClear onChange={(event) => update("educationCourse", event.target.value)} placeholder="Ex.: Administração" value={query.educationCourse} /></Field><Field label="Nível"><Select allowClear onChange={(value) => update("educationLevel", value ?? "")} options={educationLevels} placeholder="Qualquer nível" value={query.educationLevel || undefined} /></Field></div>
          <Field label="Instituição"><Input allowClear onChange={(event) => update("educationInstitution", event.target.value)} placeholder="Nome da instituição" value={query.educationInstitution} /></Field>
        </FilterSection>
        <FilterSection icon={<BulbOutlined />} title="Competências">
          <Field label="Conceitos"><Select mode="tags" onChange={(values) => update("competencies", values)} open={false} placeholder="Digite uma competência e pressione Enter" tokenSeparators={[",", ";"]} value={query.competencies} /></Field>
          <Field label="A Pessoa deve possuir"><Segmented block onChange={(value) => update("competencyMode", value as "all" | "any")} options={[{ label: "Todas estas competências", value: "all" }, { label: "Pelo menos uma", value: "any" }]} value={query.competencyMode} /></Field>
        </FilterSection>
        <FilterSection icon={<SafetyCertificateOutlined />} title="Credenciais">
          <div className="prisma-search-field-grid"><Field label="Idioma"><Input allowClear onChange={(event) => update("language", event.target.value)} placeholder="Ex.: Inglês" value={query.language} /></Field><Field label="Nível mínimo"><Select allowClear disabled={!query.language} onChange={(value) => update("languageLevel", value ?? "")} options={languageLevels} placeholder="Qualquer nível" value={query.languageLevel || undefined} /></Field></div>
          <Field label="Certificação"><Input allowClear onChange={(event) => update("certification", event.target.value)} placeholder="Ex.: PMP" value={query.certification} /></Field>
        </FilterSection>
        <FilterSection icon={<EnvironmentOutlined />} title="Contexto">
          <div className="prisma-search-field-grid"><Field label="Vínculo"><Select allowClear onChange={(value) => update("lifecycle", value ?? "")} options={lifecycleOptions} placeholder="Qualquer vínculo" value={query.lifecycle || undefined} /></Field>{canReadLocation ? <Field label="Cidade"><Input allowClear onChange={(event) => update("city", event.target.value)} placeholder="Ex.: Bauru" value={query.city} /></Field> : null}</div>
          <Field label="Estado da Pessoa"><Select onChange={(value) => update("operationalStatus", value)} options={[{ label: "Ativas", value: "active" }, { label: "Arquivadas", value: "archived" }, { label: "Ativas e arquivadas", value: "" }]} value={query.operationalStatus} /></Field>
        </FilterSection>
      </div>
      <div className="prisma-profile-search-actions"><Button onClick={() => { window.sessionStorage.removeItem(SEARCH_SESSION_KEY); setQuery(emptyProfileSearchQuery()); setResults(null); setSelectedIds([]); }}>Limpar filtros</Button><Button icon={<SearchOutlined />} loading={loading} onClick={() => void executeSearch()} type="primary">Buscar perfis</Button></div>
    </PrismaCard>

    <main className="prisma-profile-search-results">
      {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
      {loading ? <PrismaCard><Skeleton active avatar paragraph={{ rows: 12 }} /></PrismaCard> : null}
      {!loading && results === null ? <SearchWelcome count={activeFilterCount(query)} /> : null}
      {!loading && results?.length === 0 ? <PrismaCard><Empty description="Nenhum Perfil corresponde aos critérios informados. Ajuste somente os filtros que forem essenciais." /></PrismaCard> : null}
      {!loading && results?.length ? <>
        <div className="prisma-search-results-heading"><div><Typography.Title level={2}>{results.length} {results.length === 1 ? "Perfil encontrado" : "Perfis encontrados"}</Typography.Title><Typography.Text type="secondary">Ordenação determinística pela quantidade de critérios atendidos, sem nota ou decisão automática.</Typography.Text></div>{selectedIds.length ? <Button disabled={selectedIds.length !== 2} icon={<SwapOutlined />} onClick={() => { persistSearchSession(query, selectedIds); onNavigate(`/profiles/compare/${selectedIds.join("/")}`); }} type="primary">Comparar selecionados ({selectedIds.length}/2)</Button> : null}</div>
        <div className="prisma-search-result-list">{pageResults.map((result) => <SearchResultCard key={result.candidate.personId} onNavigate={onNavigate} onToggle={() => toggleSelection(result.candidate.personId)} result={result} selected={selectedIds.includes(result.candidate.personId)} />)}</div>
        <Pagination current={page} onChange={setPage} pageSize={PAGE_SIZE} showSizeChanger={false} total={results.length} />
      </> : null}
    </main>
  </PrismaPage>;
}

function FilterSection({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return <section className={`prisma-search-filter-section${title === "Experiência" ? " is-wide" : ""}`}><header><span>{icon}</span><strong>{title}</strong></header><div>{children}</div></section>;
}
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="prisma-search-field"><span>{label}</span>{children}</label>; }

function SearchWelcome({ count }: { count: number }) {
  return <PrismaCard className="prisma-search-welcome"><span className="prisma-search-welcome-icon"><SearchOutlined /></span><div><Typography.Title level={2}>Encontre Perfis pela estrutura profissional</Typography.Title><Typography.Paragraph>Experiência, Formação, Competências, Credenciais e Contexto usam a mesma linguagem do Perfil. A ausência de informação nunca será apresentada como avaliação negativa.</Typography.Paragraph>{count ? <Tag color="blue">{count} filtros preparados</Tag> : <Tag>Preencha os critérios acima para começar</Tag>}</div></PrismaCard>;
}

function SearchResultCard({ onNavigate, onToggle, result, selected }: { onNavigate: (path: string) => void; onToggle: () => void; result: ProfileSearchResult; selected: boolean }) {
  const profile = result.profile;
  const skills = profile.competencyGroups.flatMap((group) => group.values).slice(0, 6);
  return <PrismaCard className={`prisma-search-result-card${selected ? " is-selected" : ""}`}>
    <article>
      <header><div className="prisma-search-result-avatar" aria-hidden="true">{initials(result.candidate.fullName)}</div><div><Typography.Title level={3}>{result.candidate.fullName}</Typography.Title><Typography.Text>{profile.identity.professionalTitle || "Perfil profissional"}</Typography.Text><span className="prisma-search-result-meta">{profile.identity.location ?? profile.identity.lifecycleLabel}</span></div><Checkbox aria-label={`Selecionar ${result.candidate.fullName} para comparação`} checked={selected} onChange={onToggle}>{selected ? "Selecionado" : "Comparar"}</Checkbox></header>
      {profile.about?.summary ? <Typography.Paragraph ellipsis={{ rows: 3 }}>{profile.about.summary}</Typography.Paragraph> : null}
      <div className="prisma-search-result-highlights">
        {profile.experiences.length ? <section><strong>Experiência</strong>{profile.experiences.slice(0, 2).map((item) => <span key={item.id}>{item.role || item.organization}</span>)}</section> : null}
        {skills.length ? <section><strong>Competências</strong><Space size={[4, 4]} wrap>{skills.map((item) => <Tag key={item.label}>{item.label}</Tag>)}</Space></section> : null}
        {profile.credentials ? <section><strong>Credenciais</strong>{profile.credentials.languages.slice(0, 2).map((item) => <span key={item.language}>{item.language}{item.level ? ` · ${item.level}` : ""}</span>)}{profile.credentials.certifications.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</section> : null}
      </div>
      <div className="prisma-search-reasons"><strong><CheckOutlined /> Por que apareceu nesta busca</strong><ul>{result.reasons.length ? result.reasons.slice(0, 5).map((reason) => <li key={reason}>{reason}</li>) : <li>Perfil publicado e acessível na empresa ativa.</li>}</ul></div>
      <footer><Button onClick={() => onNavigate(`/profiles/${result.candidate.personId}/profile`)}>Ver perfil</Button><Button icon={<SwapOutlined />} onClick={onToggle} type={selected ? "default" : "primary"}>{selected ? "Remover da comparação" : "Comparar"}</Button></footer>
    </article>
  </PrismaCard>;
}

function initials(value: string): string { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""); }

const educationLevels = [
  { label: "Ensino médio", value: "secondary" }, { label: "Técnico", value: "technical" },
  { label: "Graduação", value: "undergraduate" }, { label: "Pós-graduação", value: "postgraduate" },
];
const languageLevels = [{ label: "Básico", value: "basico" }, { label: "Intermediário", value: "intermediario" }, { label: "Avançado", value: "avancado" }, { label: "Fluente ou nativo", value: "fluente" }];
const lifecycleOptions = [{ label: "Candidato", value: "candidate" }, { label: "Colaborador", value: "employee" }, { label: "Ex-colaborador", value: "former_employee" }, { label: "Ex-candidato", value: "former_candidate" }, { label: "Banco de talentos", value: "talent_pool" }];

function persistSearchSession(query: ProfileSearchQuery, selectedIds: string[]): void {
  window.sessionStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify({ query, selectedIds: selectedIds.slice(0, 2) }));
}

function readSearchSession(): { query: ProfileSearchQuery; selectedIds: string[] } | null {
  try {
    const raw = window.sessionStorage.getItem(SEARCH_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { query?: ProfileSearchQuery; selectedIds?: string[] };
    return value.query && Array.isArray(value.selectedIds) ? { query: value.query, selectedIds: value.selectedIds.slice(0, 2) } : null;
  } catch { return null; }
}
