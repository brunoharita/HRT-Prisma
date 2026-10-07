import { useLoadingFeedback, useLoadingTask } from "../../ui/PrismaLoadingFeedback";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BulbOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Input, Modal, Select, Space, Switch, Tabs, Tag, Typography } from "antd";
import type { PrismaProfileView } from "../../domain/canonicalProfile";
import {
  evidenceNatureLabel,
  groupProfessionalEvidence,
  summarizeProfessionalEvidence,
  type ProfessionalConceptEvidenceView,
  type ProfessionalEvidenceAssociation,
  type ProfessionalEvidenceNature,
  type ProfessionalEvidenceProjection,
  type ProfessionalEvidenceGroupView,
} from "../../domain/personProfessionalEvidence";
import { personProfileSummary } from "../../domain/personProfileSummary";
import { PrismaCard } from "../../ui/PrismaCard";
import { CanonicalProfileView } from "./CanonicalProfileView";
import { CompetencyCuration } from "./CompetencyCuration";
import type { CompetencyCurationAdapter } from "../../domain/profileCompetencyCuration";

import type { ProfileSynthesisAdapter } from "../../infrastructure/supabase/profileSynthesisService";
import type { SynthesisSource } from "../../../../src/domain/profileSynthesis";
import { ProfileSynthesisSurface } from "./ProfileSynthesisSurface";
import { CompetencyGroupModal } from "./CompetencyGroupModal";
import { confirmPrismaNavigation, useViewState } from "../../ui/PrismaNavigation";
import type { PersonWorkspaceParts } from "../../pages/PersonWorkspacePage";
import { focusNoticeFields, focusNoticeTarget } from "../../ui/noticeActions";

interface PersonProfessionalEvidenceMapProps {
  activeSurface?: Surface;
  onSurfaceChange?: (surface: Surface) => void;
  workspace?: PersonWorkspaceParts | undefined;
  synthesis?: ProfileSynthesisAdapter | undefined;
  onOpenSynthesisSource?: ((source: SynthesisSource) => void) | undefined;
  profile: PrismaProfileView;
  projection: ProfessionalEvidenceProjection | null;
  projectionError: string | null;
  onOpenSource: (evidence: ProfessionalEvidenceAssociation) => void;
  curation?: CompetencyCurationAdapter | undefined;
  onOpenVersions?: (() => void) | undefined;
}

export const PERSON_SURFACES = [["summary", "Resumo"], ["competencies", "Competências"], ["evidence", "Evidências"], ["profile", "Perfil completo"], ["documents", "Documentos e revisões"], ["history", "Histórico"]] as const;

export type Surface = "summary" | "competencies" | "evidence" | "profile" | "documents" | "history";

const natureColors: Record<ProfessionalEvidenceNature, string> = {
  declared: "blue",
  contextual: "purple",
  certified: "cyan",
  verified_assessment: "green",
  demonstrated_skill: "gold",
  assessment_result: "default",
};

export function PersonProfessionalEvidenceMap({ profile, projection: incomingProjection, projectionError, onOpenSource, curation, onOpenVersions, synthesis, onOpenSynthesisSource, workspace, activeSurface, onSurfaceChange }: PersonProfessionalEvidenceMapProps) {
  const [projection, setProjection] = useState(incomingProjection);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [curationOpen, setCurationOpen] = useState(false);
  useEffect(() => { setProjection(incomingProjection); }, [incomingProjection]);
  const [storedSurface, setStoredSurface] = useViewState<Surface>("professionalSurface", "summary");
  const surface = activeSurface ?? storedSurface;
  const setSurface = (next: Surface) => { if (onSurfaceChange) onSurfaceChange(next); else void confirmPrismaNavigation().then(ok => { if (ok) setStoredSurface(next); }); };
  const [selectedEvidence, setSelectedEvidence] = useState<ProfessionalEvidenceAssociation | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ProfessionalConceptEvidenceView | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [linkConcept, setLinkConcept] = useState<ProfessionalConceptEvidenceView | null>(null);
  const [classifyConcept, setClassifyConcept] = useState<ProfessionalConceptEvidenceView | null>(null);
  const [focusPending, setFocusPending] = useState(false);
  const groups = useMemo(() => projection ? groupProfessionalEvidence(projection) : [], [projection]);
  const selectedGroup = groups.find((item) => item.key === selectedGroupKey);
  const summary = useMemo(() => personProfileSummary(projection), [projection]);
  useEffect(() => {
    if (surface !== "competencies" || !focusPending) return;
    const heading = document.getElementById("prisma-profile-pending");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
    setFocusPending(false);
  }, [surface, focusPending]);
  const openReview = () => { setFocusPending(true); setSurface("competencies"); };

  return <div className={`prisma-m72-profile${curationOpen ? " prisma-m74-open" : ""}`}>
    <nav aria-label="Áreas do Perfil profissional" className="prisma-m72-tabs">
      {PERSON_SURFACES.map(([key, label]) => <button disabled={curationOpen} aria-current={surface === key ? "page" : undefined} key={key} onClick={() => { setSurface(key); setSelectedConcept(null); setSelectedGroupKey(null); }} type="button">{label}</button>)}
    </nav>
    {projection && ["competencies", "evidence"].includes(surface) ? <NormalizationStatus projection={projection} disabled={curationOpen} /> : null}
    {projectionError ? <Alert action={<Button onClick={() => window.location.reload()}>Tentar novamente</Button>} description="O Perfil publicado continua disponível abaixo." title={projectionError} showIcon type="warning" /> : null}
    {!projection && !projectionError && (surface !== "summary" || !synthesis) ? <PrismaCard><Empty description="Ainda não há evidências publicadas para organizar nesta visão." image={<FileSearchOutlined />} /></PrismaCard> : null}
    {surface === "summary" ? <div className={`prisma-person-reading-layout${workspace ? " has-operations" : ""}`}>
      {workspace?.pending || (curation && summary && summary.pendingCount !== null && summary.pendingCount > 0) ? <div className="prisma-person-reading-pending"><section className="prisma-person-rail-pending"><h3>Ações pendentes <Tag color="gold">{(workspace?.pendingCount ?? 0) + (curation && summary?.pendingCount ? 1 : 0)}</Tag></h3>
        {workspace?.pending}
        {curation && summary && summary.pendingCount !== null && summary.pendingCount > 0 ? <article><strong>Competências sem classificação</strong><p>{summary.pendingCount} declarações ainda precisam ser associadas a uma competência. As declarações originais permanecem preservadas.</p><Button block onClick={openReview}>Revisar competências</Button></article> : null}
      </section></div> : null}
      <div className="prisma-person-reading-main">
        {synthesis && onOpenSynthesisSource ? <ProfileSynthesisSurface canGenerate={Boolean(workspace?.header)} adapter={synthesis} publishedProfile={profile} originalSummary={profile.about?.summary} onOriginal={() => setOriginalOpen(true)} onProfile={() => setSurface("profile")} onOpenSource={onOpenSynthesisSource} /> : <SummarySurface facts={summary} profile={profile} projection={projection} canReview={Boolean(curation)} onReview={openReview} onEvidence={setSelectedEvidence} onOpenCompetencies={() => setSurface("competencies")} onOpenEvidence={() => setSurface("evidence")} onOpenProfile={() => setSurface("profile")} onOpenVersions={onOpenVersions} />}
        {summary ? <PrismaCard className="prisma-person-evidence-strip"><strong>Competências e evidências</strong><span><b>{summary.conceptCount}</b> conceitos associados</span><span><b>{summary.evidenceCount}</b> evidências vinculadas</span>{summary.pendingCount !== null ? <span><b>{summary.pendingCount}</b> declarações a revisar</span> : null}<div><Button type="link" onClick={() => setSurface("competencies")}>Consultar competências →</Button><Button type="link" onClick={() => setSurface("evidence")}>Explorar evidências →</Button></div></PrismaCard> : null}
      </div>
      {workspace ? <aside className="prisma-person-reading-rail" aria-label="Contexto operacional da Pessoa">{workspace.documentsPreview}<Button type="link" onClick={() => setSurface("documents")}>Ver todos os documentos →</Button>{workspace.activityPreview}<Button type="link" onClick={() => setSurface("history")}>Ver histórico →</Button>{workspace.quickActions}</aside> : null}
    </div> : null}
    {surface === "documents" ? workspace?.documents ?? <PrismaCard><Empty description="Documentos e revisões disponíveis somente para operadores autorizados." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
    {surface === "history" ? workspace?.history ?? <PrismaCard><Empty description="O histórico operacional exige acesso autorizado." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
    <Modal title="Resumo original do currículo" open={originalOpen} onCancel={() => setOriginalOpen(false)} footer={<Button onClick={() => setOriginalOpen(false)}>Voltar à leitura</Button>} width={760}><p className="prisma-person-original-summary">{profile.about?.summary || "O Perfil publicado não possui resumo original."}</p></Modal>
    {surface === "competencies" && selectedConcept ? <><ConceptDetailSurface concept={selectedConcept} onBack={() => setSelectedConcept(null)} onEvidence={setSelectedEvidence} onOpenSource={onOpenSource} />{!selectedConcept.classification ? <Button onClick={() => setClassifyConcept(selectedConcept)}>{curation && (selectedConcept.scope === "organization" || curation.canUseGlobal) ? "Definir grupo" : "Ver orientação"}</Button> : null}</> : null}
    {surface === "competencies" && !selectedConcept && selectedGroup ? <SubgroupDetailSurface group={selectedGroup} onBack={() => setSelectedGroupKey(null)} onConcept={setSelectedConcept} onEvidence={setSelectedEvidence} /> : null}
    {surface === "competencies" && !selectedConcept && !selectedGroup ? <CompetencySurface groups={groups} projection={projection} onConcept={setSelectedConcept} onGroup={setSelectedGroupKey} onEvidence={setSelectedEvidence} onLink={setLinkConcept} onClassify={setClassifyConcept} curation={curation} onProjection={setProjection} onCurationOpen={setCurationOpen} /> : null}
    {surface === "evidence" ? <EvidenceSurface groups={groups} projection={projection} onExplain={setSelectedEvidence} onOpenSource={onOpenSource} /> : null}
    {surface === "profile" ? <CanonicalProfileView profile={profile} showEducationDetails showCompetencies={false} showHeader={false} /> : null}
    <ExplanationDrawer concept={surface === "competencies" ? null : selectedConcept} evidence={selectedEvidence} onClose={() => { if (surface !== "competencies") setSelectedConcept(null); setSelectedEvidence(null); }} onOpenSource={onOpenSource} />
    {projection && curation ? <EvidenceLinkModal adapter={curation} concept={linkConcept} profileId={projection.profile.id} onClose={() => setLinkConcept(null)} onProjection={setProjection} /> : null}
    <CompetencyGroupModal concept={classifyConcept} adapter={curation} onClose={() => setClassifyConcept(null)} onProjection={(value) => { setProjection(value); setSelectedConcept(null); setSelectedGroupKey(null); }} />
  </div>;
}

function SummarySurface({ facts, profile, projection, canReview, onReview, onEvidence, onOpenCompetencies, onOpenEvidence, onOpenProfile, onOpenVersions }: {
  facts: ReturnType<typeof personProfileSummary>;
  profile: PrismaProfileView;
  projection: ProfessionalEvidenceProjection | null;
  canReview: boolean;
  onReview: () => void;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
  onOpenCompetencies: () => void;
  onOpenEvidence: () => void;
  onOpenProfile: () => void;
  onOpenVersions: (() => void) | undefined;
}) {
  const publishedAt = profile.version?.publishedAt ? formatSummaryDate(profile.version.publishedAt) : null;
  const hasPending = facts?.pendingCount !== null && facts?.pendingCount !== undefined && facts.pendingCount > 0;
  return <>
    {hasPending ? <section aria-label="Competências pendentes de revisão" className="prisma-m72-pending-banner">
      <span className="prisma-m72-pending-banner__icon" aria-hidden="true"><ExclamationCircleOutlined /></span>
      <div><strong>{facts.pendingCount} {facts.pendingCount === 1 ? "competência pendente" : "competências pendentes"} de revisão</strong><p>Declarações do Perfil aguardam associação segura. Isso não indica falta de competência.</p></div>
      {canReview ? <Button icon={<ArrowRightOutlined />} iconPlacement="end" onClick={onReview} type="primary">Revisar competências</Button> : <span className="prisma-m72-pending-banner__restricted">Revisão disponível para administradores autorizados.</span>}
    </section> : null}
    <div className="prisma-m72-summary-layout">
    <main>
      <PrismaCard className="prisma-m72-summary-card" title="Resumo do perfil" extra={<Button onClick={onOpenProfile} type="link">Ver perfil completo <ArrowRightOutlined /></Button>}>
        {profile.about?.summary ? <Typography.Paragraph className="prisma-person-original-summary">{profile.about.summary}</Typography.Paragraph> : <Typography.Text type="secondary">O Perfil publicado não possui resumo narrativo.</Typography.Text>}
        {profile.about?.areasOfExpertise.length ? <Space className="prisma-m72-summary-tags" wrap>{profile.about.areasOfExpertise.map((item) => <Tag color="blue" key={item}>{item}</Tag>)}</Space> : null}
      </PrismaCard>
      {facts ? <PrismaCard className="prisma-m72-quick-view" title="Visão rápida">
        <div className="prisma-m72-quick-grid">
          <SummaryMetric icon={<BulbOutlined />} value={facts.conceptCount} label="Conceitos com evidência" />
          {facts.pendingCount !== null ? <SummaryMetric icon={<ClockCircleOutlined />} value={facts.pendingCount} label="Itens pendentes de revisão" warning={facts.pendingCount > 0} /> : null}
          <SummaryMetric icon={<FileTextOutlined />} value={facts.evidenceCount} label="Evidências vinculadas" />
          {publishedAt ? <SummaryMetric icon={<CalendarOutlined />} value={publishedAt} label="Publicação do Perfil" /> : null}
        </div>
      </PrismaCard> : null}
      <PrismaCard className="prisma-m72-group-summary" title="Competências por subagrupador" extra={<Button onClick={onOpenCompetencies} type="link">Ver todas <ArrowRightOutlined /></Button>}>
        {facts?.groups.length ? <div className="prisma-m72-group-grid">{facts.groups.map((group) => <article key={group.key}>
          <header><GroupIcon type={group.macroGroupCode} /><div><strong>{group.label}</strong><span>{group.macroGroupLabel} · {group.concepts.length} {group.concepts.length === 1 ? "conceito" : "conceitos"}</span></div></header>
          <ul>{group.concepts.slice(0, 5).map((concept) => <li key={concept.id}>{concept.label}</li>)}</ul>
          <Button onClick={onOpenCompetencies} type="link">Ver todos ({group.concepts.length}) <ArrowRightOutlined /></Button>
        </article>)}</div> : <Empty description={projection ? "Ainda não há conceitos associados para organizar nesta visão." : "Agrupamentos indisponíveis nesta visão."} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      {hasPending ? <PrismaCard className="prisma-m72-pending-preview" title="Itens que pedem revisão" extra={<Button onClick={onReview} disabled={!canReview} type="link">Ver todos ({facts.pendingCount}) <ArrowRightOutlined /></Button>}>
        <div className="prisma-m72-pending-preview__list">{facts.pendingPreview.map((item) => <button disabled={!canReview} key={`${item.originalIndex}:${item.normalizedTerm}`} onClick={onReview} type="button"><FileTextOutlined /><span><strong>{item.normalizedTerm}</strong><small>Aguardando associação{(item.groupCount ?? 1) > 1 ? ` · ${item.groupCount} ocorrências` : ""}</small></span></button>)}</div>
      </PrismaCard> : null}
    </main>
    <aside>
      {facts ? <PrismaCard className="prisma-m72-pending-side" title="Pendências">
        {hasPending ? <><p><strong>{facts.pendingCount}</strong> {facts.pendingCount === 1 ? "item aguarda" : "itens aguardam"} revisão</p><Typography.Text type="secondary">A declaração original permanece preservada.</Typography.Text>{canReview ? <Button block onClick={onReview} type="primary">Revisar competências <ArrowRightOutlined /></Button> : <Typography.Text type="secondary">A revisão exige autorização administrativa.</Typography.Text>}</> : facts.pendingCount === 0 ? <Typography.Text>Não há competências pendentes de associação nesta projeção.</Typography.Text> : <Typography.Text type="secondary">A contagem ainda não está disponível. Consulte o processamento na aba Competências.</Typography.Text>}
      </PrismaCard> : null}
      <PrismaCard title="Evidências recentes" extra={<Button onClick={onOpenEvidence} type="link">Ver todas</Button>}>
        {facts?.recentEvidence.length ? <div className="prisma-m72-recent-evidence">{facts.recentEvidence.map((item) => <button key={item.id} onClick={() => onEvidence(item)} type="button"><span className={`is-${item.nature}`}><EvidenceIcon nature={item.nature} /></span><div><strong>{item.evidence.title}</strong><small>{item.concept.label}</small></div>{formatSummaryDate(item.evidence.recordedAt) ? <time dateTime={item.evidence.recordedAt}>{formatSummaryDate(item.evidence.recordedAt)}</time> : null}</button>)}</div> : <Empty description={projection ? "Sem evidências publicadas nesta versão." : "Evidências indisponíveis nesta visão."} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      <PrismaCard className="prisma-m72-quick-actions" title="Ações rápidas">
        <div>{canReview && hasPending ? <Button onClick={onReview}>Revisar competências <ArrowRightOutlined /></Button> : null}{onOpenVersions ? <Button onClick={onOpenVersions}>Criar nova revisão <ArrowRightOutlined /></Button> : null}<Button onClick={onOpenEvidence}>Ver evidências <ArrowRightOutlined /></Button><Button onClick={onOpenProfile}>Abrir perfil completo <ArrowRightOutlined /></Button></div>
      </PrismaCard>
    </aside>
    </div>
  </>;
}

function SummaryMetric({ icon, value, label, warning = false }: { icon: ReactNode; value: number | string; label: string; warning?: boolean }) {
  return <article className={warning ? "is-warning" : ""}><span aria-hidden="true">{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function formatSummaryDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function CompetencySurface({ groups, projection, onConcept, onGroup, onEvidence, onLink, onClassify, curation, onProjection, onCurationOpen }: {
  groups: ReturnType<typeof groupProfessionalEvidence>;
  projection: ProfessionalEvidenceProjection | null;
  onConcept: (value: ProfessionalConceptEvidenceView) => void;
  onGroup: (key: string) => void;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
  onLink: (value: ProfessionalConceptEvidenceView) => void;
  onClassify: (value: ProfessionalConceptEvidenceView) => void;
  curation: CompetencyCurationAdapter | undefined;
  onProjection: (value: ProfessionalEvidenceProjection) => void;
  onCurationOpen: (value: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [nature, setNature] = useState<ProfessionalEvidenceNature | "all">("all");
  const [group, setGroup] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const filtered = groups.flatMap((item) => group === "all" || item.key === group ? [{ ...item, concepts: item.concepts.filter((concept) => {
    const queryMatches = !query.trim() || concept.label.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
    const natureMatches = nature === "all" || concept.natures.includes(nature);
    return queryMatches && natureMatches && (!verifiedOnly || concept.hasCurrentVerifiedAssessment);
  }) }] : []).filter((item) => item.concepts.length);
  const macroGroups = (["hard", "soft", "pending"] as const).map((code) => ({
    code, label: code === "hard" ? "Hard Skills" : code === "soft" ? "Soft Skills" : "Grupo ainda não definido",
    subgroups: filtered.filter((item) => item.macroGroupCode === code),
  })).filter((item) => item.subgroups.length || (group === "all" && item.code !== "pending"));
  const summary = projection ? summarizeProfessionalEvidence(projection) : null;
  return <div className="prisma-m72-competency-layout">
    <main>
      <section aria-label="Filtros do mapa de competências" className="prisma-m72-filters">
        <Select aria-label="Natureza da evidência" onChange={setNature} options={[{ value: "all", label: "Todas as naturezas" }, { value: "declared", label: "Declaradas" }, { value: "contextual", label: "Contextualizadas" }, { value: "certified", label: "Certificadas" }, { value: "verified_assessment", label: "Verificadas por Assessment" }, { value: "demonstrated_skill", label: "Habilidade Evidenciada" }]} value={nature} />
        <Select aria-label="Subagrupador" onChange={setGroup} options={[{ value: "all", label: "Todos os subagrupadores" }, ...groups.map((item) => ({ value: item.key, label: item.label }))]} value={group} />
        <Input allowClear aria-label="Buscar conceitos profissionais" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar competências..." prefix={<SearchOutlined />} value={query} />
        <label><Switch checked={verifiedOnly} onChange={setVerifiedOnly} /> Verificado por Assessment</label>
      </section>
      <PrismaCard title="Competências" extra={<WhyButton onClick={() => onConcept(filtered[0]?.concepts[0]!)} disabled={!filtered.length} />}>
        {macroGroups.length ? <div className="prisma-m81-macro-groups">{macroGroups.map((macro) => <section aria-label={macro.label} className={`prisma-m81-macro-card is-${macro.code}`} key={macro.code}>
          <h3>{macro.label}</h3>{macro.code === "pending" ? <Alert className="prisma-group-pending-notice" type="warning" showIcon title="Falta definir o grupo destas competências. Vincular evidências não define esse grupo." description={<Space direction="vertical">{macro.subgroups.flatMap((item) => item.concepts).map((concept) => <span key={concept.id}><strong>{concept.label}</strong> · {concept.evidences.length} {concept.evidences.length === 1 ? "evidência vinculada" : "evidências vinculadas"} <Button type="link" aria-label={`Definir grupo de ${concept.label}`} onClick={() => onClassify(concept)}>{curation && (concept.scope === "organization" || curation.canUseGlobal) ? "Definir grupo" : "Ver orientação"}</Button></span>)}</Space>} /> : null}{macro.subgroups.length ? <Collapse className="prisma-m72-concept-collapse" items={macro.subgroups.map((item) => ({
            key: item.key,
            label: <span className="prisma-m72-collapse-label"><GroupIcon type={macro.code} /><strong>{item.label}</strong><small>{item.concepts.length} itens</small></span>,
            children: <div className="prisma-m72-concept-list"><Button className="prisma-m81-subgroup-open" onClick={() => onGroup(item.key)} type="link">Abrir detalhe do subagrupador <ArrowRightOutlined /></Button>{item.concepts.map((concept) => <article key={concept.id}>
              <button onClick={() => onConcept(concept)} type="button"><strong>{concept.label}</strong><NatureTags concept={concept} /><span><FileTextOutlined /> {concept.evidences.length} {concept.evidences.length === 1 ? "evidência" : "evidências"}</span></button>
              <Space><Button aria-label={`Abrir evidência de ${concept.label}`} onClick={() => onEvidence(concept.evidences[0]!)} type="text">›</Button>
              {curation && concept.type !== "occupation" && concept.type !== "certification" ? <Button onClick={() => onLink(concept)} type="link">Vincular evidência</Button> : null}</Space>
            </article>)}</div>,
          }))} /> : <p className="prisma-m81-empty-group">Nenhuma competência classificada neste macrogrupo.</p>}
        </section>)}</div> : <Empty description="Nenhum conceito evidenciado corresponde aos filtros." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      {projection ? <CompetencyCuration projection={projection} adapter={curation} onProjection={onProjection} onOpenChange={onCurationOpen} /> : null}
    </main>
    <aside>
      <PrismaCard title="Leitura do perfil">
        {summary ? <><Metric icon={<FileTextOutlined />} label="Declaradas" value={summary.declaredCount} /><Metric icon={<BulbOutlined />} label="Contextualizadas" value={summary.contextualCount} /><Metric icon={<CheckCircleOutlined />} label="Verificadas por Assessment" value={summary.verifiedCount} /><div className="prisma-m72-total"><strong>{summary.conceptCount}</strong><span>conceitos em {summary.groupCount} subagrupadores</span></div></> : <Empty description="Sem projeção disponível." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      {projection?.normalization.coverage.pendingItemCount ? <Alert description={`${projection.normalization.coverage.pendingItemCount} item(ns), agrupados em ${projection.normalization.coverage.uniquePendingTermCount} termo(s) único(s), aguardam associação segura. Consulte a lista de pendências; isso não significa ausência de competência.`} title="Associações pendentes" showIcon type="warning" action={<Button onClick={() => focusNoticeTarget("#prisma-profile-pending")}>Ver termos para revisar</Button>} /> : null}
      <Alert description="Declaração e contexto do currículo continuam autorrelato. Assessment verifica conhecimento no seu instrumento; habilidade prática exige evidência organizacional própria." title="Como ler as evidências" showIcon type="info" />
    </aside>
  </div>;
}

function SubgroupDetailSurface({ group, onBack, onConcept, onEvidence }: {
  group: ProfessionalEvidenceGroupView;
  onBack: () => void;
  onConcept: (value: ProfessionalConceptEvidenceView) => void;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
}) {
  return <section className="prisma-m81-detail-surface">
    <nav aria-label="Caminho do subagrupador" className="prisma-m81-detail-breadcrumb"><Button onClick={onBack} type="link">Competências</Button><span>›</span><span>{group.macroGroupLabel}</span><span>›</span><strong>{group.label}</strong></nav>
    <header className="prisma-m81-detail-heading"><div><h2>{group.label}</h2><p>{group.macroGroupLabel} · {group.concepts.length} {group.concepts.length === 1 ? "competência" : "competências"} com evidência neste Perfil.</p></div></header>
    <PrismaCard><div className="prisma-m81-subgroup-table-wrap"><table className="prisma-m81-subgroup-table"><thead><tr><th>Competência</th><th>Status</th><th>Evidências</th><th>Ações</th></tr></thead><tbody>{group.concepts.map((concept) => <tr key={concept.id}><td><button className="prisma-m81-table-link" onClick={() => onConcept(concept)} type="button">{concept.label}</button></td><td><NatureTags concept={concept} compact /></td><td>{concept.evidences.length}</td><td><Button aria-label={`Abrir evidência de ${concept.label}`} onClick={() => onEvidence(concept.evidences[0]!)} type="text">•••</Button></td></tr>)}</tbody></table></div></PrismaCard>
  </section>;
}

function ConceptDetailSurface({ concept, onBack, onEvidence, onOpenSource }: {
  concept: ProfessionalConceptEvidenceView;
  onBack: () => void;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
  onOpenSource: (value: ProfessionalEvidenceAssociation) => void;
}) {
  const first = concept.evidences[0];
  const status = ([
    ["Declarado", concept.natures.includes("declared"), "Identificado em fonte publicada."],
    ["Contextualizado", concept.natures.includes("contextual"), "Uso associado a uma experiência publicada."],
    ["Certificado", concept.natures.includes("certified"), "Credencial identificada e vinculada."],
    ["Verificado por Assessment", concept.hasCurrentVerifiedAssessment, "Resultado direto vigente de Assessment."],
    ["Habilidade Evidenciada", concept.hasDemonstratedSkill, "Evidência organizacional de prática."],
  ] as const);
  return <section className="prisma-m81-detail-surface">
    <nav aria-label="Caminho da competência" className="prisma-m81-detail-breadcrumb"><Button onClick={onBack} type="link">Competências</Button><span>›</span><span>{concept.classification?.subgroupLabel ?? "Grupo ainda não definido"}</span><span>›</span><strong>{concept.label}</strong></nav>
    <header className="prisma-m81-detail-heading"><div><h2>{concept.label}</h2><Tag>{concept.classification?.subgroupLabel ?? "Grupo ainda não definido"}</Tag><p>Conceito profissional com {concept.evidences.length} {concept.evidences.length === 1 ? "evidência preservada" : "evidências preservadas"} neste Perfil.</p></div></header>
    <Tabs items={[
      { key: "overview", label: "Visão Geral", children: <PrismaCard title="Status da Competência na Pessoa"><div className="prisma-m81-status-list">{status.map(([label, present, description]) => <div key={label}><span className={present ? "is-present" : "is-unverified"}>{present ? <CheckCircleOutlined /> : <ClockCircleOutlined />}</span><strong>{label}</strong><span>{present ? description : label === "Verificado por Assessment" ? "Ainda não verificado por Assessment." : label === "Habilidade Evidenciada" ? "Ainda não evidenciada pela organização." : "Nenhuma evidência dessa natureza registrada."}</span></div>)}</div></PrismaCard> },
      { key: "evidence", label: `Evidências (${concept.evidences.length})`, children: <PrismaCard title="Evidências preservadas"><div className="prisma-m81-concept-evidence-list">{concept.evidences.map((item) => <article key={item.id}><Tag color={natureColors[item.nature]}>{evidenceNatureLabel(item.nature)}</Tag><strong>{item.evidence.title}</strong><span>{item.evidence.source.label}</span><Button onClick={() => onEvidence(item)} type="link">Ver explicação</Button></article>)}</div></PrismaCard> },
      { key: "context", label: "Contexto", children: first ? <PrismaCard title="Origem e proveniência"><EvidenceDetails evidence={first} onOpenSource={onOpenSource} /></PrismaCard> : null },
      { key: "history", label: "Histórico", children: <PrismaCard title="Registros preservados"><div className="prisma-m81-concept-evidence-list">{concept.evidences.map((item) => <article key={item.id}><strong>{evidenceNatureLabel(item.nature)}</strong><span>{formatSummaryDate(item.evidence.recordedAt) ?? "Data indisponível"}</span><span>{item.evidence.source.label}</span></article>)}</div></PrismaCard> },
    ]} />
  </section>;
}

function EvidenceLinkModal({ adapter, concept, profileId, onClose, onProjection }: {
  adapter: CompetencyCurationAdapter; concept: ProfessionalConceptEvidenceView | null; profileId: string;
  onClose: () => void; onProjection: (value: ProfessionalEvidenceProjection) => void;
}) {
  const sourceActivity = useLoadingTask("Carregando fontes da evidência…", Boolean(concept));
  const [sources, setSources] = useState<Awaited<ReturnType<CompetencyCurationAdapter["loadEvidenceSources"]>>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { quote: string; credentialName: string; credentialIssuer: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useLoadingFeedback({ "Processando informações…": Boolean(concept) && busy });
  const saveLock = useRef(false);
  useEffect(() => {
    if (!concept) return;
    let current = true;
    setSources([]); setSelected([]); setDrafts({}); setError(null);
    void sourceActivity.run(() => adapter.loadEvidenceSources(profileId)).then((items) => { if (current) setSources(items); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Fontes indisponíveis."); });
    return () => { current = false; };
  }, [adapter, concept?.id, profileId]);
  const chosen = selected.flatMap(key => { const source = sources.find(item => `${item.nature}:${item.index}` === key); return source ? [{ key, source, draft: drafts[key]! }] : []; });
  const valid = chosen.length > 0 && chosen.length === selected.length && chosen.every(({ source, draft }) => draft
    && draft.quote.trim().length >= (source.nature === "contextual" ? 15 : 5) && draft.quote.trim().length <= 2000
    && (source.nature === "contextual" || (draft.credentialName.trim().length >= 2 && draft.credentialIssuer.trim().length >= 2)));
  const edit = (key: string, field: "quote" | "credentialName" | "credentialIssuer", value: string) => setDrafts(previous => ({ ...previous, [key]: { ...previous[key]!, [field]: value } }));
  const save = async () => {
    if (!concept || !valid || saveLock.current) return;
    saveLock.current = true;
    setBusy(true); setError(null);
    try {
      const next = await adapter.linkEvidence({ profileId, conceptId: concept.id, sources: chosen.map(({ source, draft }) => ({ nature: source.nature,
        sourceIndex: source.index, sourceQuote: draft.quote.trim(), credentialName: source.nature === "certified" ? draft.credentialName.trim() : null,
        credentialIssuer: source.nature === "certified" ? draft.credentialIssuer.trim() : null })) });
      onProjection(next); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gravar o vínculo."); }
    finally { saveLock.current = false; setBusy(false); }
  };
  return <Modal title={`Vincular evidência a ${concept?.label ?? "competência"}`} open={Boolean(concept)} onCancel={() => { if (!saveLock.current) onClose(); }} width={640} closable={!busy}
    okText={selected.length > 1 ? `Confirmar ${selected.length} vínculos` : "Confirmar vínculo"} okButtonProps={{ disabled: !valid, loading: busy }} onOk={() => void save()} cancelButtonProps={{ disabled: busy }}>
    <Typography.Paragraph type="secondary">Selecione uma ou mais fontes do Perfil publicado. Você não precisa escrever uma justificativa. Esses vínculos não equivalem a uma verificação por Assessment.</Typography.Paragraph>
    {error ? <Alert type="error" showIcon title={error} action={<Space wrap><Button onClick={(event) => focusNoticeFields(event.currentTarget)}>Revisar fontes</Button><Button onClick={() => { void sourceActivity.run(() => adapter.refresh()).then((value) => { onProjection(value); onClose(); }).catch(() => setError("A lista não pôde ser consultada. Sua seleção foi preservada. Tente consultar novamente.")); }}>Consultar vínculos</Button></Space>} /> : null}
    <label>Fontes do Perfil<Select mode="multiple" aria-label="Fontes do Perfil" loading={sourceActivity.pending} disabled={busy} style={{ width: "100%" }} value={selected} placeholder="Selecione uma ou mais experiências ou credenciais" optionFilterProp="label"
      options={sources.map((item) => ({ value: `${item.nature}:${item.index}`, label: item.label }))} onChange={(value) => {
        setSelected(value); setDrafts(previous => { const next = { ...previous }; for (const key of value) {
          const item = sources.find(candidate => `${candidate.nature}:${candidate.index}` === key);
          if (item && !next[key]) next[key] = { quote: item.quote.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""), credentialName: "", credentialIssuer: "" };
        } return next; });
      }} /></label>
    {chosen.map(({ key, source, draft }) => <div key={key} className="prisma-evidence-link-source">
      <Typography.Text strong>{source.label}</Typography.Text>
      <label>Trecho da fonte<Input.TextArea aria-label={`Trecho: ${source.label}`} disabled={busy} value={draft.quote} onChange={(event) => edit(key, "quote", event.target.value)} rows={3} maxLength={2000} /></label>
      {source.nature === "certified" ? <><label>Nome da credencial<Input disabled={busy} value={draft.credentialName} onChange={(event) => edit(key, "credentialName", event.target.value)} /></label>
        <label>Emissor informado<Input disabled={busy} value={draft.credentialIssuer} onChange={(event) => edit(key, "credentialIssuer", event.target.value)} /></label></> : null}
    </div>)}
  </Modal>;
}

function EvidenceSurface({ groups, projection, onExplain, onOpenSource }: {
  groups: ReturnType<typeof groupProfessionalEvidence>;
  projection: ProfessionalEvidenceProjection | null;
  onExplain: (value: ProfessionalEvidenceAssociation) => void;
  onOpenSource: (value: ProfessionalEvidenceAssociation) => void;
}) {
  const [query, setQuery] = useState("");
  const [nature, setNature] = useState<ProfessionalEvidenceNature | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const evidence = groups.flatMap((group) => group.concepts.flatMap((concept) => concept.evidences.map((item) => ({ ...item, groupLabel: group.label }))));
  const filtered = evidence.filter((item) => (nature === "all" || item.nature === nature) && (!query.trim() || `${item.evidence.title} ${item.evidence.fact} ${item.concept.label}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))));
  const active = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const summary = projection ? summarizeProfessionalEvidence(projection) : null;
  return <div className="prisma-m72-evidence-surface">
    <section aria-label="Filtros de evidências" className="prisma-m72-filters">
      <Select aria-label="Tipo de evidência" onChange={setNature} options={[{ value: "all", label: "Todos os tipos" }, { value: "declared", label: "Declaradas" }, { value: "contextual", label: "Contextualizadas" }, { value: "certified", label: "Certificadas" }, { value: "verified_assessment", label: "Verificadas por Assessment" }, { value: "demonstrated_skill", label: "Habilidade Evidenciada" }, { value: "assessment_result", label: "Assessment sem verificação vigente" }]} value={nature} />
      <Input allowClear aria-label="Buscar evidências" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evidências..." prefix={<SearchOutlined />} value={query} />
    </section>
    <div className="prisma-m72-metrics"><MetricCard label="Evidências publicadas" value={summary?.evidenceCount ?? 0} /><MetricCard label="Conceitos evidenciados" value={summary?.conceptCount ?? 0} /><MetricCard label="Verificados por Assessment" value={summary?.verifiedCount ?? 0} /><MetricCard label="Associações a revisar" value={projection?.issues.length ?? 0} /></div>
    <div className="prisma-m72-evidence-layout">
      <PrismaCard title="Explorador de evidências" extra={<WhyButton onClick={() => active && onExplain(active)} disabled={!active} />}>
        {filtered.length ? <div className="prisma-m72-evidence-list">{filtered.map((item) => <button aria-pressed={active?.id === item.id} key={item.id} onClick={() => setSelectedId(item.id)} type="button"><EvidenceIcon nature={item.nature} /><div><strong>{item.evidence.title}</strong><small>{item.evidence.source.label}</small></div><span>{item.concept.label}</span><Tag color={natureColors[item.nature]}>{evidenceNatureLabel(item.nature)}</Tag></button>)}</div> : <Empty description="Nenhuma evidência corresponde aos filtros." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      <PrismaCard className="prisma-m72-evidence-detail" title="Detalhe da evidência">
        {active ? <EvidenceDetails evidence={active} onOpenSource={onOpenSource} /> : <Empty description="Selecione uma evidência para consultar sua origem." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
    </div>
  </div>;
}

function ExplanationDrawer({ concept, evidence, onClose, onOpenSource }: { concept: ProfessionalConceptEvidenceView | null; evidence: ProfessionalEvidenceAssociation | null; onClose: () => void; onOpenSource: (value: ProfessionalEvidenceAssociation) => void }) {
  const selected = evidence ?? concept?.evidences[0] ?? null;
  return <Drawer destroyOnHidden onClose={onClose} open={Boolean(concept || evidence)} size="large" title="Por que o Prisma está mostrando isso?">
    {selected ? <><EvidenceDetails evidence={selected} onOpenSource={onOpenSource} />{concept && concept.evidences.length > 1 ? <div className="prisma-m72-related-evidence"><Typography.Title level={4}>Outras evidências preservadas</Typography.Title>{concept.evidences.filter((item) => item.id !== selected.id).map((item) => <article key={item.id}><Tag color={natureColors[item.nature]}>{evidenceNatureLabel(item.nature)}</Tag><strong>{item.evidence.title}</strong></article>)}</div> : null}</> : null}
  </Drawer>;
}

function EvidenceDetails({ evidence, onOpenSource }: { evidence: ProfessionalEvidenceAssociation; onOpenSource: (value: ProfessionalEvidenceAssociation) => void }) {
  return <div className="prisma-m72-evidence-details">
    <header><EvidenceIcon nature={evidence.nature} /><div><Typography.Title level={3}>{evidence.evidence.title}</Typography.Title><Tag color={natureColors[evidence.nature]}>{evidenceNatureLabel(evidence.nature)}</Tag></div></header>
    <Descriptions column={1} size="small" items={[
      { key: "concept", label: "Conceito Prisma", children: evidence.concept.label },
      { key: "group", label: "Classificação Prisma", children: evidence.concept.classification
        ? `${evidence.concept.classification.macroGroupLabel} > ${evidence.concept.classification.subgroupLabel}`
        : "Pendente de curadoria" },
      { key: "observed", label: "O que consta na fonte", children: evidence.observedTerm },
      { key: "source", label: "Origem", children: evidence.evidence.source.label },
      { key: "method", label: "Como foi relacionado", children: evidence.explanation.method },
      { key: "versions", label: "Versões", children: `${evidence.explanation.methodVersion} · ${evidence.explanation.taxonomyVersion}${evidence.explanation.sourceVersion ? ` · ${evidence.explanation.sourceVersion}` : ""}` },
      { key: "human", label: "Decisão humana", children: evidence.explanation.humanDecision ?? "Não registrada para esta associação" },
      ...(evidence.verification ? [{ key: "verification", label: "Resultado de Assessment", children: evidence.verification.qualifiesAsVerified ? "Conhecimento verificado no instrumento vigente" : `Registro ${evidence.verification.status}; não produz verificação atual` }] : []),
    ]} />
    {evidence.evidence.quote ? <blockquote>{evidence.evidence.quote}</blockquote> : <Alert description="A origem permanece rastreável pelo Perfil, mas esta evidência não possui posição espacial disponível." title="Sem destaque espacial" showIcon type="info" />}
    <Button disabled={!evidence.evidence.source.documentId && !["verified_assessment", "assessment_result"].includes(evidence.nature)} icon={<LinkOutlined />} onClick={() => onOpenSource(evidence)} type="primary">Abrir origem</Button>
    <Alert description="Esta explicação apresenta fatos, regras, versões e proveniência. Ela não é score, avaliação absoluta nem cadeia privada de raciocínio." showIcon type="info" />
  </div>;
}

function NatureTags({ concept, compact = false }: { concept: ProfessionalConceptEvidenceView; compact?: boolean }) {
  return <Space size={[4, 4]} wrap>{concept.natures.map((nature) => <Tag color={natureColors[nature]} key={nature}>{compact ? evidenceNatureLabel(nature).replace("Evidência ", "") : evidenceNatureLabel(nature)}</Tag>)}</Space>;
}

function WhyButton({ disabled = false, onClick }: { disabled?: boolean; onClick: () => void }) { return <Button disabled={disabled} icon={<InfoCircleOutlined />} onClick={onClick} type="link">Por que estou vendo isso?</Button>; }
function GroupIcon({ type }: { type: string }) { return <span className={`prisma-m72-group-icon is-${type}`}>{type === "hard" ? <DatabaseOutlined /> : type === "pending" ? <ApartmentOutlined /> : <BulbOutlined />}</span>; }
function EvidenceIcon({ nature }: { nature: ProfessionalEvidenceNature }) { return nature === "verified_assessment" || nature === "demonstrated_skill" ? <CheckCircleOutlined /> : nature === "contextual" ? <BulbOutlined /> : <FileTextOutlined />; }
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="prisma-m72-reading-metric"><span>{icon}</span><div><strong>{label}</strong><small>{label === "Declaradas" ? "Informadas no Perfil publicado" : label === "Contextuais" ? "Relações identificadas pelo Prisma" : "Resultado direto vigente"}</small></div><b>{value}</b></div>; }
function MetricCard({ label, value }: { label: string; value: number }) { return <article><strong>{value}</strong><span>{label}</span></article>; }

function NormalizationStatus({ projection, disabled }: { projection: ProfessionalEvidenceProjection; disabled: boolean }) {
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useLoadingFeedback({ "Solicitando atualização das evidências…": requesting });
  const status = projection.normalization.status;
  const latestAttempt = projection.normalization.latestAttempt;
  // Queue processing is server-side and survives navigation. Do not reload unsaved browser state.
  useEffect(() => { setMessage(null); }, [projection.profile.id, status]);
  const retry = async () => {
    setRequesting(true);
    try {
      const { supabase } = await import("../../infrastructure/supabase/client");
      const { error } = await supabase.rpc("request_profile_competency_normalization" as never, {
        p_organization_id: projection.organizationId, p_person_id: projection.personId,
      } as never);
      setMessage(error ? "Não foi possível solicitar o processamento. É necessária permissão de revisão nesta empresa." : "Processamento solicitado. Reabra o Perfil em instantes para consultar o resultado.");
    } catch { setMessage("Não foi possível conectar. O Perfil foi preservado; tente novamente."); }
    finally { setRequesting(false); }
  };
  if (status === "complete" && latestAttempt?.status === "failed" && !latestAttempt.usedAsBasis) return <Alert showIcon type="warning" title="Última atualização não foi concluída"
    description={message ?? "O último resultado completo continua ativo; nenhuma associação anterior foi perdida. Você pode tentar atualizar novamente."}
    action={<Button disabled={disabled} loading={requesting} onClick={() => void retry()}>Tentar novamente</Button>} />;
  if (status === "complete") return <div className="prisma-m73-normalization-actions"><Typography.Text type="secondary">{message ?? "Associações processadas. A declaração revisada foi preservada."}</Typography.Text><Button disabled={disabled} loading={requesting} onClick={() => void retry()} type="link">Atualizar associações</Button></div>;
  return <Alert showIcon type={status === "failed" ? "warning" : "info"} title={status === "failed" ? "Normalização parcialmente disponível" : "Organizando competências declaradas"}
    description={message ?? (status === "failed" ? "A declaração original foi preservada. O processamento não foi concluído; os vínculos seguros já disponíveis continuam visíveis." : "O Perfil já está publicado. A associação com a Knowledge é processada em segundo plano; reabra esta tela em instantes.")}
    action={status === "failed" || status === "not_processed" ? <Button disabled={disabled} loading={requesting} onClick={() => void retry()}>Reprocessar</Button> : undefined} />;
}
