import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ApartmentOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Input, Select, Space, Switch, Tag, Typography } from "antd";
import type { PrismaProfileView } from "../../domain/canonicalProfile";
import {
  evidenceNatureLabel,
  groupProfessionalEvidence,
  summarizeProfessionalEvidence,
  type ProfessionalConceptEvidenceView,
  type ProfessionalEvidenceAssociation,
  type ProfessionalEvidenceNature,
  type ProfessionalEvidenceProjection,
} from "../../domain/personProfessionalEvidence";
import { taxonomyGroups, type ProfessionalConceptType } from "../../domain/positionTaxonomy";
import { PrismaCard } from "../../ui/PrismaCard";
import { CanonicalProfileView } from "./CanonicalProfileView";
import { CompetencyCuration } from "./CompetencyCuration";
import type { CompetencyCurationAdapter } from "../../domain/profileCompetencyCuration";

interface PersonProfessionalEvidenceMapProps {
  profile: PrismaProfileView;
  projection: ProfessionalEvidenceProjection | null;
  projectionError: string | null;
  onOpenSource: (evidence: ProfessionalEvidenceAssociation) => void;
  curation?: CompetencyCurationAdapter | undefined;
}

type Surface = "summary" | "competencies" | "evidence" | "profile";

const natureColors: Record<ProfessionalEvidenceNature, string> = {
  declared: "blue",
  contextual: "purple",
  demonstrated: "green",
};

export function PersonProfessionalEvidenceMap({ profile, projection: incomingProjection, projectionError, onOpenSource, curation }: PersonProfessionalEvidenceMapProps) {
  const [projection, setProjection] = useState(incomingProjection);
  const [curationOpen, setCurationOpen] = useState(false);
  useEffect(() => { setProjection(incomingProjection); }, [incomingProjection]);
  const [surface, setSurface] = useState<Surface>("summary");
  const [selectedEvidence, setSelectedEvidence] = useState<ProfessionalEvidenceAssociation | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ProfessionalConceptEvidenceView | null>(null);
  const groups = useMemo(() => projection ? groupProfessionalEvidence(projection) : [], [projection]);

  return <div className={`prisma-m72-profile${curationOpen ? " prisma-m74-open" : ""}`}>
    <nav aria-label="Áreas do Perfil profissional" className="prisma-m72-tabs">
      {([
        ["summary", "Resumo"], ["competencies", "Competências"], ["evidence", "Evidências"], ["profile", "Perfil completo"],
      ] as const).map(([key, label]) => <button disabled={curationOpen} aria-current={surface === key ? "page" : undefined} key={key} onClick={() => setSurface(key)} type="button">{label}</button>)}
    </nav>
    {projection ? <NormalizationStatus projection={projection} disabled={curationOpen} /> : null}
    {projectionError ? <Alert action={<Button onClick={() => window.location.reload()}>Tentar novamente</Button>} description="O Perfil publicado continua disponível abaixo." title={projectionError} showIcon type="warning" /> : null}
    {!projection && !projectionError ? <PrismaCard><Empty description="Ainda não há evidências publicadas para organizar nesta visão." image={<FileSearchOutlined />} /></PrismaCard> : null}
    {surface === "summary" ? <SummarySurface groups={groups} profile={profile} projection={projection} onEvidence={setSelectedEvidence} onOpenCompetencies={() => setSurface("competencies")} onOpenEvidence={() => setSurface("evidence")} /> : null}
    {surface === "competencies" ? <CompetencySurface groups={groups} projection={projection} onConcept={setSelectedConcept} onEvidence={setSelectedEvidence} curation={curation} onProjection={setProjection} onCurationOpen={setCurationOpen} /> : null}
    {surface === "evidence" ? <EvidenceSurface groups={groups} projection={projection} onExplain={setSelectedEvidence} onOpenSource={onOpenSource} /> : null}
    {surface === "profile" ? <CanonicalProfileView profile={profile} showCompetencies={false} showHeader={false} /> : null}
    <ExplanationDrawer concept={selectedConcept} evidence={selectedEvidence} onClose={() => { setSelectedConcept(null); setSelectedEvidence(null); }} onOpenSource={onOpenSource} />
  </div>;
}

function SummarySurface({ groups, profile, projection, onEvidence, onOpenCompetencies, onOpenEvidence }: {
  groups: ReturnType<typeof groupProfessionalEvidence>;
  profile: PrismaProfileView;
  projection: ProfessionalEvidenceProjection | null;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
  onOpenCompetencies: () => void;
  onOpenEvidence: () => void;
}) {
  const recent = [...(projection?.associations ?? [])].sort((left, right) => right.evidence.recordedAt.localeCompare(left.evidence.recordedAt)).slice(0, 5);
  return <div className="prisma-m72-summary-layout">
    <main>
      {profile.about ? <PrismaCard className="prisma-m72-summary-card" title="Resumo do Perfil" extra={<WhyButton onClick={() => onEvidence(recent[0]!)} disabled={!recent.length} />}>
        {profile.about.summary ? <Typography.Paragraph>{profile.about.summary}</Typography.Paragraph> : <Typography.Text type="secondary">O Perfil publicado não possui resumo narrativo.</Typography.Text>}
        {profile.about.areasOfExpertise.length ? <Space wrap>{profile.about.areasOfExpertise.map((item) => <Tag color="blue" key={item}>{item}</Tag>)}</Space> : null}
      </PrismaCard> : null}
      <PrismaCard className="prisma-m72-taxonomy-card" title="Taxonomia de Competências Prisma" extra={<Button onClick={onOpenCompetencies} type="link">Explorar na taxonomia</Button>}>
        <Typography.Paragraph>Este Perfil e os requisitos de Posição podem usar a mesma identidade canônica de competência. A Taxonomia Ocupacional permanece um domínio separado, e relações entre ocupações e competências nunca criam fatos sobre a Pessoa.</Typography.Paragraph>
      </PrismaCard>
      <PrismaCard className="prisma-m72-group-summary" title="Conhecimentos e habilidades por agrupamento" extra={<WhyButton onClick={onOpenCompetencies} />}>
        {groups.length ? <div className="prisma-m72-group-grid">{groups.map((group) => <article key={group.key}>
          <header><GroupIcon type={group.key} /><div><strong>{group.label}</strong><span>{group.concepts.length} {group.concepts.length === 1 ? "conceito" : "conceitos"}</span></div></header>
          <ul>{group.concepts.slice(0, 3).map((concept) => <li key={concept.id}><span>{concept.label}</span><NatureTags compact concept={concept} /></li>)}</ul>
          <Button onClick={onOpenCompetencies} type="link">Ver todos os itens ({group.concepts.length})</Button>
        </article>)}</div> : <Empty description="Ainda não há evidências publicadas para organizar nesta visão." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
    </main>
    <aside>
      <PrismaCard title="Evidências recentes" extra={<Button onClick={onOpenEvidence} type="link">Ver todas</Button>}>
        {recent.length ? <div className="prisma-m72-recent-evidence">{recent.map((item) => <button key={item.id} onClick={() => onEvidence(item)} type="button"><span className={`is-${item.nature}`}><EvidenceIcon nature={item.nature} /></span><div><strong>{item.evidence.title}</strong><small>{item.concept.label}</small><Tag color={natureColors[item.nature]}>{evidenceNatureLabel(item.nature)}</Tag></div></button>)}</div> : <Empty description="Sem evidências publicadas nesta versão." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      <Alert description="Os conceitos exibidos partem do Perfil vigente, de inferências versionadas ou de Evidência Demonstrada aprovada. Ausência de evidência não é deficiência." title="Leitura baseada em evidências" showIcon type="info" />
    </aside>
  </div>;
}

function CompetencySurface({ groups, projection, onConcept, onEvidence, curation, onProjection, onCurationOpen }: {
  groups: ReturnType<typeof groupProfessionalEvidence>;
  projection: ProfessionalEvidenceProjection | null;
  onConcept: (value: ProfessionalConceptEvidenceView) => void;
  onEvidence: (value: ProfessionalEvidenceAssociation) => void;
  curation: CompetencyCurationAdapter | undefined;
  onProjection: (value: ProfessionalEvidenceProjection) => void;
  onCurationOpen: (value: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [nature, setNature] = useState<ProfessionalEvidenceNature | "all">("all");
  const [group, setGroup] = useState<ProfessionalConceptType | "all">("all");
  const [demonstratedOnly, setDemonstratedOnly] = useState(false);
  const filtered = groups.flatMap((item) => group === "all" || item.key === group ? [{ ...item, concepts: item.concepts.filter((concept) => {
    const queryMatches = !query.trim() || concept.label.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
    const natureMatches = nature === "all" || concept.natures.includes(nature);
    return queryMatches && natureMatches && (!demonstratedOnly || concept.hasCurrentDemonstratedEvidence);
  }) }] : []).filter((item) => item.concepts.length);
  const summary = projection ? summarizeProfessionalEvidence(projection) : null;
  return <div className="prisma-m72-competency-layout">
    <main>
      <section aria-label="Filtros do mapa de competências" className="prisma-m72-filters">
        <Select aria-label="Natureza da evidência" onChange={setNature} options={[{ value: "all", label: "Todas as naturezas" }, { value: "declared", label: "Declaradas" }, { value: "contextual", label: "Contextuais" }, { value: "demonstrated", label: "Demonstradas" }]} value={nature} />
        <Select aria-label="Agrupamento profissional" onChange={setGroup} options={[{ value: "all", label: "Todos os agrupamentos" }, ...groups.map((item) => ({ value: item.key, label: item.label }))]} value={group} />
        <Input allowClear aria-label="Buscar conceitos profissionais" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar competências..." prefix={<SearchOutlined />} value={query} />
        <label><Switch checked={demonstratedOnly} onChange={setDemonstratedOnly} /> Com evidência demonstrada</label>
      </section>
      <PrismaCard title="Mapa de competências" extra={<WhyButton onClick={() => onConcept(filtered[0]?.concepts[0]!)} disabled={!filtered.length} />}>
        {filtered.length ? <Collapse className="prisma-m72-concept-collapse" defaultActiveKey={[filtered[0]!.key]} items={filtered.map((item) => ({
          key: item.key,
          label: <span className="prisma-m72-collapse-label"><GroupIcon type={item.key} /><strong>{item.label}</strong><small>{item.concepts.length} itens</small></span>,
          children: <div className="prisma-m72-concept-list">{item.concepts.map((concept) => <article key={concept.id}>
            <button onClick={() => onConcept(concept)} type="button"><strong>{concept.label}</strong><NatureTags concept={concept} /><span><FileTextOutlined /> {concept.evidences.length} {concept.evidences.length === 1 ? "evidência" : "evidências"}</span></button>
            <Button aria-label={`Abrir evidência de ${concept.label}`} onClick={() => onEvidence(concept.evidences[0]!)} type="text">›</Button>
          </article>)}</div>,
        }))} /> : <Empty description="Nenhum conceito evidenciado corresponde aos filtros." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      {projection ? <CompetencyCuration projection={projection} adapter={curation} onProjection={onProjection} onOpenChange={onCurationOpen} /> : null}
    </main>
    <aside>
      <PrismaCard title="Leitura do perfil">
        {summary ? <><Metric icon={<FileTextOutlined />} label="Declaradas" value={summary.declaredCount} /><Metric icon={<BulbOutlined />} label="Contextuais" value={summary.contextualCount} /><Metric icon={<CheckCircleOutlined />} label="Com evidência demonstrada válida" value={summary.demonstratedCount} /><div className="prisma-m72-total"><strong>{summary.conceptCount}</strong><span>conceitos evidenciados em {summary.groupCount} agrupamentos</span></div></> : <Empty description="Sem projeção disponível." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
      {projection?.issues.length ? <Alert description={`${projection.issues.length} item(ns) declarado(s) aguardam associação segura. Consulte a lista de pendências; isso não significa ausência de competência.`} title="Associações pendentes" showIcon type="warning" /> : null}
      <Alert description="Declarada, contextual e demonstrada indicam a natureza da evidência. Não representam nível de proficiência, senioridade ou score." title="Como ler os estados" showIcon type="info" />
    </aside>
  </div>;
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
      <Select aria-label="Tipo de evidência" onChange={setNature} options={[{ value: "all", label: "Todos os tipos" }, { value: "declared", label: "Declaradas" }, { value: "contextual", label: "Contextuais" }, { value: "demonstrated", label: "Demonstradas" }]} value={nature} />
      <Input allowClear aria-label="Buscar evidências" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evidências..." prefix={<SearchOutlined />} value={query} />
    </section>
    <div className="prisma-m72-metrics"><MetricCard label="Evidências publicadas" value={summary?.evidenceCount ?? 0} /><MetricCard label="Conceitos evidenciados" value={summary?.conceptCount ?? 0} /><MetricCard label="Demonstrações válidas" value={summary?.demonstratedCount ?? 0} /><MetricCard label="Associações a revisar" value={projection?.issues.length ?? 0} /></div>
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
      { key: "group", label: "Agrupamento", children: taxonomyGroups[evidence.concept.type] },
      { key: "observed", label: "O que consta na fonte", children: evidence.observedTerm },
      { key: "source", label: "Origem", children: evidence.evidence.source.label },
      { key: "method", label: "Como foi relacionado", children: evidence.explanation.method },
      { key: "versions", label: "Versões", children: `${evidence.explanation.methodVersion} · ${evidence.explanation.taxonomyVersion}${evidence.explanation.sourceVersion ? ` · ${evidence.explanation.sourceVersion}` : ""}` },
      { key: "human", label: "Decisão humana", children: evidence.explanation.humanDecision ?? "Não registrada para esta associação" },
      ...(evidence.verification ? [{ key: "verification", label: "Resultado de verificação", children: evidence.verification.qualifiesAsVerified ? "Evidência Demonstrada válida e ativa" : `Registro ${evidence.verification.status}; não produz estado verificado atual` }] : []),
    ]} />
    {evidence.evidence.quote ? <blockquote>{evidence.evidence.quote}</blockquote> : <Alert description="A origem permanece rastreável pelo Perfil, mas esta evidência não possui posição espacial disponível." title="Sem destaque espacial" showIcon type="info" />}
    <Button disabled={!evidence.evidence.source.documentId && evidence.nature !== "demonstrated"} icon={<LinkOutlined />} onClick={() => onOpenSource(evidence)} type="primary">Abrir origem</Button>
    <Alert description="Esta explicação apresenta fatos, regras, versões e proveniência. Ela não é score, avaliação absoluta nem cadeia privada de raciocínio." showIcon type="info" />
  </div>;
}

function NatureTags({ concept, compact = false }: { concept: ProfessionalConceptEvidenceView; compact?: boolean }) {
  return <Space size={[4, 4]} wrap>{concept.natures.map((nature) => <Tag color={natureColors[nature]} key={nature}>{compact ? evidenceNatureLabel(nature).replace("Evidência ", "") : evidenceNatureLabel(nature)}</Tag>)}</Space>;
}

function WhyButton({ disabled = false, onClick }: { disabled?: boolean; onClick: () => void }) { return <Button disabled={disabled} icon={<InfoCircleOutlined />} onClick={onClick} type="link">Por que estou vendo isso?</Button>; }
function GroupIcon({ type }: { type: ProfessionalConceptType }) { return <span className={`prisma-m72-group-icon is-${type}`}>{type === "technology" ? <DatabaseOutlined /> : type === "occupation" ? <ApartmentOutlined /> : <BulbOutlined />}</span>; }
function EvidenceIcon({ nature }: { nature: ProfessionalEvidenceNature }) { return nature === "demonstrated" ? <CheckCircleOutlined /> : nature === "contextual" ? <BulbOutlined /> : <FileTextOutlined />; }
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="prisma-m72-reading-metric"><span>{icon}</span><div><strong>{label}</strong><small>{label === "Declaradas" ? "Informadas no Perfil publicado" : label === "Contextuais" ? "Relações identificadas pelo Prisma" : "Resultado direto vigente"}</small></div><b>{value}</b></div>; }
function MetricCard({ label, value }: { label: string; value: number }) { return <article><strong>{value}</strong><span>{label}</span></article>; }

function NormalizationStatus({ projection, disabled }: { projection: ProfessionalEvidenceProjection; disabled: boolean }) {
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const status = projection.normalization.status;
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
  if (status === "complete") return <div className="prisma-m73-normalization-actions"><Typography.Text type="secondary">{message ?? "Associações processadas. A declaração revisada foi preservada."}</Typography.Text><Button disabled={disabled} loading={requesting} onClick={() => void retry()} type="link">Atualizar associações</Button></div>;
  return <Alert showIcon type={status === "failed" ? "warning" : "info"} title={status === "failed" ? "Normalização parcialmente disponível" : "Organizando competências declaradas"}
    description={message ?? (status === "failed" ? "A declaração original foi preservada. O processamento não foi concluído; os vínculos seguros já disponíveis continuam visíveis." : "O Perfil já está publicado. A associação com a Knowledge é processada em segundo plano; reabra esta tela em instantes.")}
    action={status === "failed" || status === "not_processed" ? <Button disabled={disabled} loading={requesting} onClick={() => void retry()}>Reprocessar</Button> : undefined} />;
}
