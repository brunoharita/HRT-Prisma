import { useEffect, useRef, useState } from "react";
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Form, Input, List, Modal, Pagination, Select, Skeleton, Space, Tag, Typography } from "antd";
import { ApartmentOutlined, EditOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { OrganizationMembership } from "../shared/access.js";
import type { VacancyDraft } from "../domain/vacancy.js";
import { applyTaxonomy, groupTaxonomyItems, selectTaxonomyRequirement, taxonomyGroups, taxonomyMethodLabels, taxonomyRequirementCategory, taxonomyStateLabels,
  type PositionTaxonomy, type ProfessionalConceptType, type TaxonomyCandidate, type TaxonomyItem, type TaxonomyReference } from "../domain/positionTaxonomy.js";
import { positionTaxonomyService } from "../infrastructure/supabase/positionTaxonomyService.js";
import { knowledgeService } from "../infrastructure/supabase/knowledgeService.js";
import type { CompetencySubgroupOption } from "../domain/profileCompetencyCuration.js";
import { PrismaCard } from "../ui/PrismaCard.js";

interface Props {
  draft: VacancyDraft; membership: OrganizationMembership;
  onChange?: (update: (draft: VacancyDraft) => VacancyDraft) => void;
  onEdit?: () => void;
}
export function PositionTaxonomyPanel({ draft, membership, onChange, onEdit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [why, setWhy] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [complement, setComplement] = useState(false);
  const [history, setHistory] = useState<Array<{ version: number; snapshot: PositionTaxonomy | null }>>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyError, setHistoryError] = useState<string | null>(null);
  useEffect(() => {
    if (!why || !draft.id) return;
    let current = true; setHistoryError(null); setHistory([]);
    void positionTaxonomyService.history(membership.organizationId, draft.id, (historyPage - 1) * 20)
      .then((items) => { if (current) setHistory(items); })
      .catch(() => { if (current) setHistoryError("Histórico indisponível agora. Feche e abra a explicação para tentar novamente."); });
    return () => { current = false; };
  }, [why, draft.id, membership.organizationId, historyPage]);
  const latest = useRef({ draft, onChange }); latest.current = { draft, onChange };
  const decision = draft.taxonomyDecision ?? (draft.referenceConceptId ? "human" : "automatic");
  const selected = decision === "human" ? draft.referenceConceptId : null;
  const complementKey = JSON.stringify(draft.taxonomyComplementIds ?? []);
  useEffect(() => {
    if (!onChange || !draft.title.trim()) { setLoading(false); setError(null); return; }
    const controller = new AbortController();
    let current = true;
    setLoading(true); setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const timer = window.setTimeout(() => {
      void positionTaxonomyService.preview(membership.organizationId, draft.title, selected, decision,
        JSON.parse(complementKey) as string[], controller.signal).then((snapshot) => {
          if (current) latest.current.onChange?.((value) => applyTaxonomy(value, snapshot));
        }).catch(() => { if (current) setError("Não foi possível consultar a taxonomia publicada agora. O preenchimento está preservado."); })
        .finally(() => { if (current) setLoading(false); window.clearTimeout(timeout); });
    }, 350);
    return () => { current = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout); };
  }, [membership.organizationId, draft.title, selected, decision, complementKey, Boolean(onChange), retry]);
  const snapshot = draft.taxonomy?.originalTitle === draft.title && draft.taxonomy.organizationId === membership.organizationId ? draft.taxonomy : null;
  const ready = Boolean(snapshot && !loading && !error);
  const canCreate = ["super_admin", "owner", "admin"].includes(membership.role);
  function correctAssociation() { setWhy(false); if (onChange) setCorrect(true); else onEdit?.(); }
  function choose(candidate: TaxonomyCandidate) {
    onChange?.((value) => ({ ...value, referenceConceptId: candidate.id, taxonomyDecision: "human", taxonomy: null })); setCorrect(false);
  }
  function addComplement(id: string) {
    onChange?.((value) => ({ ...value, taxonomyComplementIds: [...new Set([...(value.taxonomyComplementIds ?? []), id])] })); setComplement(false);
  }
  const groups = groupTaxonomyItems(snapshot?.items ?? []);
  return <section className="prisma-position-taxonomy" aria-label="Taxonomia profissional da Posição">
    <PrismaCard title={<Space><ApartmentOutlined />Referência ocupacional Prisma</Space>}
      extra={<Button type="link" icon={<InfoCircleOutlined />} onClick={() => setWhy(true)}>Por que o Prisma associou assim?</Button>}>
      <div className="prisma-taxonomy-identity">
        <div><Typography.Text type="secondary">Nome informado pela empresa</Typography.Text><strong>{draft.title || "Informe o título da Posição"}</strong></div>
        <div><Typography.Text type="secondary">Conceito profissional Prisma</Typography.Text><strong>{snapshot?.concept?.label ?? "Ainda não associado"}</strong>
          {snapshot ? <Tag color={snapshot.state === "resolved" ? "green" : "default"}>{taxonomyStateLabels[snapshot.state]}</Tag> : null}</div>
        <Space wrap>{onChange || onEdit ? <Button icon={<EditOutlined />} onClick={correctAssociation}>Corrigir associação</Button> : null}
          {onChange && decision !== "automatic" ? <Button onClick={() => onChange((value) => ({ ...value, taxonomyDecision: "automatic", taxonomy: null, referenceConceptId: null }))}>Reavaliar pelo título</Button> : null}</Space>
      </div>
      {loading ? <div role="status" aria-live="polite"><Skeleton active paragraph={{ rows: 2 }} title={false} /><span>Consultando Knowledge publicada…</span></div> : null}
      {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>} /> : null}
      {!snapshot && !loading && !error ? <Alert type="info" showIcon title={onChange ? "A interpretação aparece após informar o título." : "Esta versão não possui interpretação M7.1 registrada."}
        description={onChange ? "O nome e os requisitos permanecem sob decisão da empresa." : "Uma referência histórica não é reclassificada retroativamente. Edite a Posição para registrar uma nova interpretação versionada."} /> : null}
      {snapshot && !loading ? <>
        <Typography.Paragraph type="secondary">{snapshot.decision === "automatic" && snapshot.state === "resolved" ? "Associada automaticamente por correspondência aprovada." : taxonomyMethodLabels[snapshot.method]}</Typography.Paragraph>
        <ReferenceList references={snapshot.references} />
        {snapshot.state === "ambiguous" ? <Alert showIcon type="warning" title="Mais de uma interpretação pode representar este título." description="Use Corrigir associação para selecionar uma referência. Nenhuma foi escolhida automaticamente." /> : null}
        {snapshot.state === "unresolved" ? <Alert showIcon type="info" title="A Posição pode ser salva sem referência ocupacional." description="Busque uma referência aplicável ou preserve o termo para curadoria na Knowledge da empresa." /> : null}
      </> : null}
    </PrismaCard>
    <PrismaCard title="Conhecimentos e habilidades relacionados" extra={<Tag>Referências, não requisitos automáticos</Tag>}>
      <Typography.Paragraph type="secondary">Itens relacionados às referências oficiais desta ocupação. As categorias e medidas de cada fonte permanecem no detalhe de origem. Não representam competências de uma Pessoa.</Typography.Paragraph>
      {groups.length ? <div className="prisma-taxonomy-groups">{groups.map((group) => <div className="prisma-taxonomy-group" key={group.type}>
        <h3>{group.label} <Tag>{group.items.length}</Tag></h3>
        <TaxonomyItems items={group.items} draft={draft} editable={Boolean(onChange) && ready} onChoose={(item, importance) => onChange?.((value) => selectTaxonomyRequirement(value, item, importance))} />
      </div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading ? "Aguardando consulta das fontes" : "Sem relações publicadas para esta referência. Ausência de relação não é deficiência da Posição."} />}
    </PrismaCard>
    <PrismaCard title="Knowledge complementar da empresa" extra={onChange ? <Button icon={<PlusOutlined />} disabled={!draft.title.trim()} onClick={() => setComplement(true)}>Adicionar item complementar</Button> : undefined}>
      <Typography.Paragraph type="secondary">Válida somente nesta organização. Criar ou associar um item não o torna requisito e não altera a Knowledge Global nem os snapshots oficiais.</Typography.Paragraph>
      {snapshot?.complements.length ? <TaxonomyItems items={snapshot.complements} draft={draft} editable={Boolean(onChange) && ready}
        onChoose={(item, importance) => onChange?.((value) => selectTaxonomyRequirement(value, item, importance))}
        onRemove={onChange ? (id) => onChange((value) => ({ ...value, taxonomyComplementIds: (value.taxonomyComplementIds ?? []).filter((item) => item !== id) })) : undefined} />
        : <Typography.Text type="secondary">Nenhum complemento associado a esta versão.</Typography.Text>}
    </PrismaCard>
    <Drawer open={why} onClose={() => setWhy(false)} title="Como o Prisma interpretou esta posição" size={600} className="prisma-taxonomy-drawer"
      footer={<Space wrap><Button onClick={() => setWhy(false)}>Fechar</Button>{onChange || onEdit ? <Button onClick={correctAssociation}>Corrigir associação</Button> : null}</Space>}>
      <Descriptions column={1} bordered items={[
        { key: "title", label: "Nome informado", children: draft.title },
        { key: "concept", label: "Conceito profissional Prisma", children: snapshot?.concept?.label ?? "Não resolvido nesta versão" },
        { key: "method", label: "Regra aplicada", children: snapshot ? taxonomyMethodLabels[snapshot.method] ?? snapshot.method : "Sem registro M7.1" },
        { key: "decision", label: "Decisão humana", children: snapshot?.decision === "automatic" ? "Não houve seleção humana da associação nesta interpretação." : snapshot ? "Seleção ou remoção explícita registrada pelo operador." : "Não registrada neste contrato" },
        { key: "time", label: "Registro", children: snapshot ? new Date(snapshot.recordedAt).toLocaleString("pt-BR") : "Não disponível" },
        { key: "version", label: "Versão da Posição", children: snapshot?.positionVersion ?? "Prévia, ainda não salva" },
      ]} />
      <h3>Referências utilizadas</h3><ReferenceList references={snapshot?.references ?? []} detailed />
      <Collapse items={[{ key: "method", label: "Método, versões e decisão registrada", children: <pre className="prisma-taxonomy-provenance">{JSON.stringify(snapshot ? {
        contractVersion: snapshot.contractVersion, originalTitle: snapshot.originalTitle, normalizedTerm: snapshot.normalizedTerm,
        conceptVersion: snapshot.concept?.version, matchedTerms: snapshot.matchedTerms, method: snapshot.method, actorId: snapshot.actorId, savedBy: snapshot.savedBy,
        organizationId: snapshot.organizationId, positionVersionId: snapshot.positionVersionId, decisionRecordedAt: snapshot.decisionRecordedAt,
      } : { status: "historical_unrecorded" }, null, 2)}</pre> }]} />
      <h3>Histórico de interpretações</h3>
      {historyError ? <Alert type="warning" title={historyError} /> : null}
      <List dataSource={history} locale={{ emptyText: "Nenhuma versão anterior carregada nesta edição." }} renderItem={(entry) => <List.Item>
        <Collapse className="prisma-taxonomy-history" items={[{ key: String(entry.version), label: `Definição v${entry.version} · ${entry.snapshot?.concept?.label ?? "Sem associação M7.1 registrada"}`,
          children: <><Typography.Paragraph>{entry.snapshot ? `${taxonomyMethodLabels[entry.snapshot.method] ?? entry.snapshot.method} · ${new Date(entry.snapshot.recordedAt).toLocaleString("pt-BR")}` : "Registro histórico preservado, sem reinterpretação."}</Typography.Paragraph>
            {entry.snapshot ? <><Typography.Paragraph>Nome informado nesta versão: {entry.snapshot.originalTitle}</Typography.Paragraph><Collapse items={[{ key: "snapshot", label: "Interpretação e origens completas desta versão", children: <pre className="prisma-taxonomy-provenance">{JSON.stringify(entry.snapshot, null, 2)}</pre> }]} /></> : null}
            <ReferenceList references={entry.snapshot?.references ?? []} detailed />{entry.snapshot?.actorId ? <Typography.Text>Operador registrado: {entry.snapshot.actorId}</Typography.Text> : null}</> }]} />
      </List.Item>} />
      {draft.id ? <Space><Button disabled={historyPage === 1} onClick={() => setHistoryPage((value) => value - 1)}>Versões mais recentes</Button><Button disabled={history.length < 20} onClick={() => setHistoryPage((value) => value + 1)}>Versões anteriores</Button></Space> : null}
    </Drawer>
    <KnowledgePicker open={correct} kind="occupation" organizationId={membership.organizationId} initialQuery={draft.title}
      candidates={snapshot?.candidates ?? []} onClose={() => setCorrect(false)} onChoose={choose}
      footer={<Button onClick={() => { onChange?.((value) => ({ ...value, referenceConceptId: null, taxonomyDecision: "cleared", taxonomy: null })); setCorrect(false); }}>Desfazer associação</Button>} />
    <ComplementDialog open={complement} organizationId={membership.organizationId} canCreate={canCreate} onClose={() => setComplement(false)} onAdd={addComplement} />
  </section>;
}

function ReferenceList({ references, detailed = false }: { references: TaxonomyReference[]; detailed?: boolean }) {
  if (!references.length) return <Typography.Paragraph type="secondary">Sem referência oficial registrada. As três fontes não são obrigatórias.</Typography.Paragraph>;
  return <List className="prisma-taxonomy-references" dataSource={references} renderItem={(reference) => <List.Item>
    <div><Tag color="blue">{reference.source}</Tag><strong>{reference.label}</strong><p>{reference.externalId} · Versão {reference.sourceVersion}</p>
      <Typography.Text type="secondary">{({ exact: "Correspondência exata", close: "Correspondência aproximada", related: "Referência relacionada", broader: "Referência mais ampla", narrower: "Referência mais específica" } as Record<string, string>)[reference.mappingType] ?? reference.mappingType}</Typography.Text>
      {detailed ? <Collapse items={[{ key: reference.mappingId, label: "Proveniência desta ligação", children: <pre className="prisma-taxonomy-provenance">{JSON.stringify(reference, null, 2)}</pre> }]} /> : null}
    </div>
  </List.Item>} />;
}
function TaxonomyItems({ items, draft, editable, onChoose, onRemove }: { items: TaxonomyItem[]; draft: VacancyDraft; editable: boolean;
  onChoose: (item: TaxonomyItem, importance: "required" | "desired") => void; onRemove?: ((id: string) => void) | undefined }) {
  return <List dataSource={items} pagination={items.length > 6 ? { pageSize: 6, size: "small", showSizeChanger: false } : false}
    renderItem={(item) => {
      const requirement = draft.requirements.find((entry) => entry.conceptId === item.conceptId);
      const sources = [...new Set(item.origins.flatMap((origin) => origin.reference ? [origin.reference.source] : []))];
      return <List.Item className="prisma-taxonomy-item"><div><strong>{item.label}</strong><div>
        <Tag color={item.scope === "organization" ? "purple" : "blue"}>{item.scope === "organization" ? "Knowledge da empresa" : sources.length > 1 ? `Prisma · ${sources.join(" + ")}` : sources.join(" · ")}</Tag>
        {requirement ? <Tag color="green">{requirement.importance === "required" ? "Requisito obrigatório" : requirement.importance === "desired" ? "Requisito desejável" : "Requisito para classificar"}</Tag> : null}</div>
        <TaxonomyOriginDetails item={item} />
        {editable && !requirement && taxonomyRequirementCategory(item) ? <Space wrap className="prisma-taxonomy-item-actions">
          <Button size="small" onClick={() => onChoose(item, "required")}>Adicionar como obrigatório</Button>
          <Button size="small" onClick={() => onChoose(item, "desired")}>Adicionar como desejável</Button></Space> : null}
        {editable && onRemove ? <Button type="link" onClick={() => onRemove(item.conceptId)}>Desassociar complemento</Button> : null}
      </div></List.Item>;
    }} />;
}

export function TaxonomyOriginDetails({ item }: { item: TaxonomyItem }) {
  return <Collapse size="small" items={[{ key: "source", label: `Ver origem de ${item.label}`, children: <>
    {item.description ? <p>{item.description}</p> : null}
    <Typography.Paragraph>Tipo publicado: {taxonomyGroups[item.conceptType]}. Medidas de importância e nível pertencem à fonte; não definem exigência ou proficiência Prisma.</Typography.Paragraph>
    {item.origins.map((origin, index) => <div key={origin.relationId ?? index}>
      <strong>{origin.reference ? `${origin.reference.source} · ${origin.reference.sourceVersion}` : "Knowledge da empresa"}</strong>
      {origin.relationType ? <p>Relação na fonte: {origin.relationType}</p> : null}
      {origin.attributes?.relevance ? <p>Relevância na fonte: {String(origin.attributes.relevance)} (não é obrigatoriedade da Posição).</p> : null}
      {Array.isArray(origin.attributes?.measurements) ? <ul>{origin.attributes.measurements.map((measure: Record<string, unknown>, i: number) => <li key={i}>Escala {String(measure.scaleId)}: {String(measure.rawValue)} · valor original da fonte</li>)}</ul> : null}
    </div>)}
    <Collapse items={[{ key: "technical", label: "Identificadores, método e proveniência completos", children: <pre className="prisma-taxonomy-provenance">{JSON.stringify(item, null, 2)}</pre> }]} />
  </> }]} />;
}

function KnowledgePicker({ open, kind, organizationId, initialQuery = "", candidates = [], onClose, onChoose, footer }: {
  open: boolean; kind: "occupation" | "complement"; organizationId: string; initialQuery?: string; candidates?: TaxonomyCandidate[];
  onClose: () => void; onChoose: (candidate: TaxonomyCandidate) => void; footer?: React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery); const [page, setPage] = useState(1);
  const [items, setItems] = useState<TaxonomyCandidate[]>([]); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  useEffect(() => { if (open) { setQuery(initialQuery); setPage(1); } }, [open, initialQuery]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); let current = true; setLoading(true); setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const timer = window.setTimeout(() => void positionTaxonomyService.search(organizationId, query, kind, (page - 1) * 25, controller.signal)
      .then((result) => { if (current) { setItems(result.items); setTotal(result.total); } })
      .catch(() => { if (current) { setError("A busca não respondeu. Tente novamente."); setItems([]); } })
      .finally(() => { if (current) setLoading(false); window.clearTimeout(timeout); }), 300);
    return () => { current = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout); };
  }, [open, organizationId, query, kind, page, retry]);
  return <Drawer open={open} onClose={onClose} size={560} className="prisma-taxonomy-drawer" footer={footer}
    title={kind === "occupation" ? "Corrigir associação" : "Selecionar Knowledge da empresa"}>
    <Typography.Paragraph>{kind === "occupation" ? "Selecione um conceito aprovado que represente a Posição. A escolha altera somente esta definição e preserva o título da empresa." : "Escolha um item já aprovado na empresa. Associar não o transforma em requisito."}</Typography.Paragraph>
    {candidates.length ? <List header="Interpretações para este título" dataSource={candidates} renderItem={(candidate) => <List.Item actions={[<Button key="select" onClick={() => onChoose(candidate)}>Selecionar {candidate.label}</Button>]}>{candidate.label}</List.Item>} /> : null}
    <Input.Search aria-label="Buscar conceitos publicados" placeholder="Buscar por nome ou alias" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
    {error ? <Alert type="error" title={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>} /> : null}
    <List loading={loading} dataSource={items} locale={{ emptyText: "Nenhum conceito publicado encontrado. Ajuste a busca ou preserve o termo para curadoria." }}
      renderItem={(candidate) => <List.Item actions={[<Button disabled={loading} key="select" onClick={() => onChoose(candidate)}>Selecionar</Button>]}>
        <List.Item.Meta title={candidate.label} description={<><Tag>{candidate.scope === "organization" ? "Knowledge da empresa" : "Base oficial publicada"}</Tag>{candidate.description}</>} />
      </List.Item>} />
    <Pagination current={page} total={total} pageSize={25} showSizeChanger={false} onChange={setPage} />
  </Drawer>;
}
function ComplementDialog({ open, organizationId, canCreate, onClose, onAdd }: { open: boolean; organizationId: string; canCreate: boolean; onClose: () => void; onAdd: (id: string) => void }) {
  const [picker, setPicker] = useState(false); const [label, setLabel] = useState("");
  const [subgroups, setSubgroups] = useState<CompetencySubgroupOption[]>([]);
  const [subgroupId, setSubgroupId] = useState<string | null>(null);
  const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !canCreate) return;
    let active = true;
    void knowledgeService.listCompetencySubgroups(organizationId).then((rows) => { if (active) setSubgroups(rows); })
      .catch(() => { if (active) setError("Não foi possível carregar os subagrupadores."); });
    return () => { active = false; };
  }, [open, canCreate, organizationId]);
  async function create() {
    if (!subgroupId) return;
    setBusy(true); setError(null);
    try { const id = await positionTaxonomyService.createComplement(organizationId, label, subgroupId, description); onAdd(id); setLabel(""); setDescription(""); setSubgroupId(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível criar o complemento."); }
    finally { setBusy(false); }
  }
  return <><Modal open={open} onCancel={onClose} title="Adicionar item complementar" footer={null} destroyOnHidden>
    <Alert type="info" showIcon title="Somente Knowledge da empresa" description="Esta ação não altera a base global nem as fontes oficiais. A obrigatoriedade será escolhida separadamente, ao adicionar o item aos requisitos." />
    <Button block onClick={() => setPicker(true)} className="prisma-taxonomy-item-actions">Selecionar item existente</Button>
    {canCreate ? <Form layout="vertical" onFinish={() => void create()}>
      <Form.Item label="Nome do item" required><Input aria-label="Nome do item complementar" value={label} maxLength={240} onChange={(event) => setLabel(event.target.value)} /></Form.Item>
      <Form.Item label="Subagrupador principal" required><Select aria-label="Subagrupador principal do complemento" value={subgroupId} onChange={setSubgroupId} placeholder="Selecione a classificação" options={(["hard", "soft"] as const).map((macro) => ({ label: macro === "hard" ? "Hard Skills" : "Soft Skills", options: subgroups.filter((item) => item.macroGroupCode === macro).map((item) => ({ value: item.id, label: `${item.code} · ${item.label}` })) }))} /></Form.Item>
      <Form.Item label="Contexto ou descrição (opcional)"><Input.TextArea aria-label="Contexto ou descrição do complemento" maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></Form.Item>
      {error ? <Alert type="error" title={error} /> : null}<Space><Button onClick={onClose}>Cancelar</Button><Button type="primary" htmlType="submit" loading={busy} disabled={!label.trim() || !subgroupId}>Criar e associar complemento</Button></Space>
    </Form> : <Typography.Paragraph>A criação de Knowledge exige Owner, Admin ou Super Admin. Você pode reutilizar itens já publicados para sua empresa.</Typography.Paragraph>}
  </Modal><KnowledgePicker open={picker && open} kind="complement" organizationId={organizationId} onClose={() => setPicker(false)} onChoose={(candidate) => { setPicker(false); onAdd(candidate.id); }} /></>;
}
