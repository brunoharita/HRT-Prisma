import { useEffect, useRef, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Pagination, Radio, Select, Space, Tag, Typography } from "antd";
import { CloseOutlined, LeftOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import type { ProfessionalEvidenceProjection } from "../../domain/personProfessionalEvidence";
import { taxonomyGroups } from "../../domain/positionTaxonomy";
import { competencyKey, curationPage, curationReturnTarget, CURATION_PAGE_SIZE, groupPendingCompetencies, pendingCompetencies, type CompetencyCurationAdapter, type CurationCandidate, type CurationDecision, type PendingCompetency } from "../../domain/profileCompetencyCuration";
import { PrismaCard } from "../../ui/PrismaCard";
import { useUnsavedChanges } from "../../ui/PrismaNavigation";

const matchLabels = {
  exact: "Canônico exato",
  official_alias: "Alias oficial exato",
  human_alias: "Alias humano auditado",
  relevant_partial: "Candidato parcial",
  ambiguous: "Correspondência ambígua",
} as const;

export function CompetencyCuration({ projection, adapter, onProjection, onOpenChange }: {
  projection: ProfessionalEvidenceProjection; adapter: CompetencyCurationAdapter | undefined;
  onProjection: (value: ProfessionalEvidenceProjection) => void; onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PendingCompetency | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const dirty = useRef(false);
  const [hasEdits, setHasEdits] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 1200px)").matches);
  useUnsavedChanges(hasEdits || busy);
  const markDirty = (value: boolean) => { dirty.current = value; setHasEdits(value); };
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const headingRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pendingItems = pendingCompetencies(projection);
  const pending = groupPendingCompetencies(pendingItems);
  const legacyIssues = projection.normalization.items.length ? [] : projection.issues;
  const filterItems = (items: PendingCompetency[]) => items.filter((item) => (filter === "all" || item.state === filter)
    && `${item.originalTerm} ${item.normalizedTerm}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  const shown = filterItems(pending);
  const actualPage = curationPage(shown, null, page);
  const current = selected ? shown.findIndex((item) => competencyKey(item) === competencyKey(selected)) : -1;
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1200px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobile, Boolean(selected)]);
  useEffect(() => { onOpenChange(Boolean(selected)); return () => onOpenChange(false); }, [Boolean(selected)]);
  useEffect(() => {
    if (focusKey && !selected && !busy) {
      const row = rowRefs.current.get(focusKey);
      (row ?? headingRef.current)?.focus({ preventScroll: true });
      row?.scrollIntoView({ block: "nearest" });
      setFocusKey(null);
    }
  }, [focusKey, selected, actualPage, projection, busy]);
  useEffect(() => {
    if (selected) panelRef.current?.focus({ preventScroll: true });
  }, [selected && competencyKey(selected)]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty.current || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [busy]);

  function confirmNavigation(action: () => void) {
    if (busy) return;
    if (!dirty.current) { action(); return; }
    let discard = false;
    Modal.confirm({ title: "Descartar alterações não gravadas?", content: "A associação ainda não foi gravada. Você pode continuar a edição ou descartar as alterações.", okText: "Descartar alterações", cancelText: "Continuar editando", autoFocusButton: "cancel", onOk: () => { discard = true; }, afterClose: () => { if (discard) { markDirty(false); action(); } } });
  }
  function open(item: PendingCompetency) {
    if (selected && competencyKey(selected) === competencyKey(item)) return;
    confirmNavigation(() => { setSelected(item); setPage(curationPage(shown, competencyKey(item), page)); });
  }
  function close() {
    confirmNavigation(() => {
      if (selected) { setPage(curationPage(shown, competencyKey(selected), page)); setFocusKey(competencyKey(selected)); }
      setSelected(null);
    });
  }
  async function saved(decision: CurationDecision, advance: boolean) {
    if (!adapter || !selected) return;
    const result = await adapter.save(decision);
    const after = filterItems(groupPendingCompetencies(pendingCompetencies(result.projection)));
    const target = curationReturnTarget(shown, after, competencyKey(selected), advance);
    markDirty(false);
    onProjection(result.projection);
    setPage(curationPage(after, target, page));
    setNotice(result.outcome === "proposal" ? "Proposta registrada, sem publicação. O item continua pendente de aprovação." : "Associação gravada. Lista e contagens atualizadas.");
    const next = advance && target ? after.find((item) => competencyKey(item) === target) ?? null : null;
    setSelected(next);
    if (!next) setFocusKey(target ?? "empty");
  }
  return <>
    <PrismaCard className="prisma-m74-pending" title={<div ref={headingRef} tabIndex={-1}>Declarações aguardando associação ({pendingItems.length || legacyIssues.length} itens{pendingItems.length ? ` · ${pending.length} termos únicos` : ""})</div>}
      extra={adapter ? <Space wrap><Button disabled={busy || Boolean(selected)} type="text" onClick={async () => {
        setBusy(true); setRefreshError(null);
        try { const next = await adapter.refresh(); onProjection(next); setPage(curationPage(filterItems(groupPendingCompetencies(pendingCompetencies(next))), null, page)); }
        catch { setRefreshError("Não foi possível atualizar as pendências. Tente novamente."); }
        finally { setBusy(false); }
      }}>Atualizar lista</Button><Button disabled={!shown.length || busy} onClick={() => shown[(actualPage - 1) * CURATION_PAGE_SIZE] && open(shown[(actualPage - 1) * CURATION_PAGE_SIZE]!)} type="link">Revisar pendências</Button></Space> : undefined}>
      <Typography.Paragraph type="secondary">Selecione um item para revisar sem sair do perfil. A declaração original permanece preservada.</Typography.Paragraph>
      {!adapter ? <Alert type="info" showIcon title="Curadoria disponível para administradores autorizados da Knowledge." /> : null}
      {notice ? <Alert type="success" title={notice} closable onClose={() => setNotice(null)} /> : null}
      {refreshError ? <Alert type="error" title={refreshError} /> : null}
      {legacyIssues.length ? <Alert type="info" title="Estas declarações ainda precisam de normalização antes da curadoria contextual." description={<ul>{legacyIssues.map((issue, index) => <li key={index}>{issue.observedTerm}: {issue.explanation}</li>)}</ul>} /> : null}
      <div className="prisma-m74-list-filters">
        <Input aria-label="Buscar nas pendências" placeholder="Buscar nas pendências..." prefix={<SearchOutlined />} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <Select aria-label="Estado da pendência" value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{ value: "all", label: "Todas as pendências" }, { value: "unresolved", label: "Sem associação" }, { value: "ambiguous", label: "Ambíguas" }, { value: "source_unavailable", label: "Fonte indisponível" }]} />
      </div>
      <div className="prisma-m74-pending-list">{shown.slice((actualPage - 1) * CURATION_PAGE_SIZE, actualPage * CURATION_PAGE_SIZE).map((item, index) => {
        const key = competencyKey(item);
        return <button key={key} ref={(node) => { if (node) rowRefs.current.set(key, node); else rowRefs.current.delete(key); }} type="button" disabled={!adapter || busy} aria-label={`Revisar associação de ${item.normalizedTerm}`} aria-pressed={selected ? competencyKey(selected) === key : false} onClick={() => open(item)}>
          <span>{(actualPage - 1) * CURATION_PAGE_SIZE + index + 1}</span><span>{item.normalizedTerm}</span>{(item.groupCount ?? 1) > 1 ? <Tag>{item.groupCount} ocorrências</Tag> : null}{selected && competencyKey(selected) === key ? <Tag color="blue">Em revisão</Tag> : null}<RightOutlined />
        </button>;
      })}</div>
      {!shown.length && !legacyIssues.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={pending.length ? "Nenhuma pendência corresponde aos filtros." : "Nenhuma declaração aguardando associação."} /> : null}
      <div className="prisma-m74-pagination"><Pagination current={actualPage} pageSize={CURATION_PAGE_SIZE} total={shown.length} showSizeChanger={false} onChange={setPage} showTotal={(total, range) => `${range[0]}–${range[1]} de ${total} itens`} /><small>Sua página, filtros e posição serão preservados.</small></div>
    </PrismaCard>
    {selected && adapter ? <aside className="prisma-m74-curation-panel" role="dialog" aria-modal={mobile} aria-labelledby="prisma-curation-title" tabIndex={-1} ref={panelRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); close(); }
        if (mobile && event.key === "Tab") {
          const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter((node) => node.getClientRects().length);
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header><div><Typography.Title level={3} id="prisma-curation-title">Revisar associação</Typography.Title><Typography.Text type="secondary">{current >= 0 ? `Item ${current + 1} de ${shown.length}` : "Item fora do filtro atual"} · {selected.normalizedTerm}</Typography.Text></div><Button aria-label="Fechar curadoria" icon={<CloseOutlined />} onClick={close} disabled={busy} />
        <Space><Button icon={<LeftOutlined />} disabled={busy || current <= 0} onClick={() => open(shown[current - 1]!)}>Anterior</Button><Button disabled={busy || current < 0 || current >= shown.length - 1} onClick={() => open(shown[current + 1]!)}>Próximo <RightOutlined /></Button></Space></header>
      <CurationForm key={competencyKey(selected)} item={selected} profileId={projection.profile.id} adapter={adapter} onDirty={markDirty} onBusy={setBusy} onCancel={close} onSave={saved} />
    </aside> : null}
  </>;
}

function CurationForm({ item, profileId, adapter, onDirty, onBusy, onCancel, onSave }: {
  item: PendingCompetency; profileId: string; adapter: CompetencyCurationAdapter; onDirty: (value: boolean) => void;
  onBusy: (value: boolean) => void; onCancel: () => void; onSave: (decision: CurationDecision, advance: boolean) => Promise<void>;
}) {
  const [query, setQuery] = useState(item.normalizedTerm);
  const [candidates, setCandidates] = useState<CurationCandidate[]>([]);
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [scope, setScope] = useState<"organization" | "global">("organization");
  const [reason, setReason] = useState("");
  const [proposal, setProposal] = useState(false);
  const [label, setLabel] = useState(item.normalizedTerm);
  const [type, setType] = useState<CurationDecision["proposalType"]>("skill");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const savingLock = useRef(false);
  useEffect(() => { void searchSuggested(item.searchTerms); return () => { request.current++; }; }, []);
  async function searchSuggested(terms: string[]) {
    const id = ++request.current;
    setSearching(true); setError(null);
    const queries = [...new Set([item.normalizedTerm, ...terms, item.sourceText].map((term) => term.trim()).filter(Boolean))].slice(0, 4);
    try {
      const results = await Promise.allSettled(queries.map((term) => adapter.search(term)));
      if (id !== request.current) return;
      const merged = new Map<string, CurationCandidate>();
      for (const result of results) if (result.status === "fulfilled") for (const candidate of result.value) {
        if (candidate.conceptType === "occupation") continue;
        const current = merged.get(candidate.id);
        if (!current || candidatePriority(candidate) < candidatePriority(current)) merged.set(candidate.id, candidate);
      }
      setCandidates([...merged.values()].sort((left, right) => candidatePriority(left) - candidatePriority(right)
        || left.canonicalLabel.localeCompare(right.canonicalLabel, "pt-BR")));
      if (results.every((result) => result.status === "rejected")) setError("Não foi possível buscar conceitos. Tente novamente; sua edição foi preservada.");
    } finally { if (id === request.current) setSearching(false); }
  }
  async function search(term: string) {
    const id = ++request.current;
    setSearching(true); setError(null);
    try { const result = await adapter.search(term); if (id === request.current) setCandidates(result.filter((candidate) => candidate.conceptType !== "occupation")); }
    catch { if (id === request.current) setError("Não foi possível buscar conceitos. Tente novamente; sua edição foi preservada."); }
    finally { if (id === request.current) setSearching(false); }
  }
  const chosen = candidates.find((candidate) => candidate.id === conceptId);
  const valid = reason.trim().length >= 5 && (proposal ? label.trim().length > 0 : Boolean(chosen && (scope === "organization" || chosen.scope === "global")));
  async function save(advance: boolean) {
    if (!valid || savingLock.current) return;
    savingLock.current = true;
    setSaving(true); onBusy(true); setError(null);
    try { await onSave({ item, profileId, scope, reason, action: proposal ? "proposal" : "alias", conceptId: proposal ? null : conceptId, proposalLabel: label, proposalType: type }, advance); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Falha ao gravar. A edição foi preservada."); }
    finally { savingLock.current = false; setSaving(false); onBusy(false); }
  }
  return <>
    <div className="prisma-m74-curation-body">
      <div className="prisma-m74-source"><small>Declaração original</small><strong>{item.originalTerm}</strong></div>
      <div className="prisma-m74-source"><small>Termo em revisão</small><strong>{item.normalizedTerm}</strong>{item.sourceText !== item.originalTerm ? <small>Trecho: {item.sourceText}</small> : null}</div>
      {(item.groupCount ?? 1) > 1 ? <Alert showIcon type="info" title={`${item.groupCount} ocorrências compartilham este termo`} description="Uma associação aprovada será reutilizada nas ocorrências compatíveis, preservando cada origem." /> : null}
      <Alert showIcon type="warning" title={item.reason} />
      {error ? <Alert role="alert" type="error" showIcon title={error} /> : null}
      {!proposal ? <><Typography.Title level={5}>Associar a um conceito existente</Typography.Title>
        <Input.Search aria-label="Buscar conceitos para associação" value={query} disabled={saving} onChange={(event) => setQuery(event.target.value)} onSearch={(value) => void search(value)} loading={searching} enterButton="Buscar" />
        <Typography.Text type="secondary">Sugestões iniciais combinam as expressões versionadas do processamento. Nenhuma opção é selecionada automaticamente.</Typography.Text>
        {!searching && !candidates.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum conceito encontrado. Ajuste a busca ou proponha um conceito." /> : null}
        <Radio.Group aria-label="Conceito para associação" value={conceptId} disabled={saving} onChange={(event) => { setConceptId(event.target.value); onDirty(true); }} className="prisma-m74-candidates">
          {candidates.map((candidate) => <div key={candidate.id} className={conceptId === candidate.id ? "is-selected" : ""}><Radio value={candidate.id}>{candidate.canonicalLabel}</Radio>
            <Space wrap><Tag>{taxonomyGroups[candidate.conceptType as keyof typeof taxonomyGroups] ?? candidate.conceptType}</Tag><Tag>{candidate.scope === "global" ? "Global" : "Empresa"}</Tag><Tag color={candidate.matchClass === "relevant_partial" || candidate.matchClass === "ambiguous" ? "orange" : "blue"}>{matchLabels[candidate.matchClass]}</Tag></Space>
            <p>{candidate.description || "Sem definição publicada."}</p><small>{candidate.sourceName ? `${candidate.sourceName} · ${candidate.sourceVersion ?? "Versão não informada"}` : "Conceito interno aprovado"}</small>
            {candidate.matchedTerm !== candidate.canonicalLabel ? <small>Correspondência sustentada por: {candidate.matchedTerm}</small> : null}
            {candidate.references.length > 1 ? <small>{candidate.references.length} referências oficiais versionadas</small> : null}
          </div>)}
        </Radio.Group></> : <><Typography.Title level={5}>Propor novo conceito</Typography.Title><Alert type="info" title="A proposta não publica um conceito e não encerra esta pendência." />
        <label>Nome canônico proposto<Input aria-label="Nome canônico proposto" value={label} disabled={saving} onChange={(event) => { setLabel(event.target.value); onDirty(true); }} /></label>
        <label>Tipo de conceito<Select aria-label="Tipo de conceito proposto" value={type} disabled={saving} onChange={(value) => { setType(value); onDirty(true); }} options={(["skill", "competency", "knowledge", "technology", "methodology", "certification"] as const).map((value) => ({ value, label: taxonomyGroups[value] }))} /></label></>}
      <label>Alcance da decisão<Select aria-label="Alcance da decisão" value={scope} disabled={saving} onChange={(value) => { setScope(value); onDirty(true); }} options={[{ value: "organization", label: "Knowledge da empresa" }, ...(adapter.canUseGlobal ? [{ value: "global", label: "Knowledge Global" }] : [])]} /></label>
      <Typography.Text type="secondary">{scope === "global" ? "Decisão Global: pode ser reutilizada por outras empresas e perfis." : "Pode ser reutilizada em outros perfis desta empresa."}</Typography.Text>
      <label>Justificativa da associação<Input.TextArea aria-label="Justificativa da associação" placeholder="Explique por que os termos são equivalentes..." value={reason} disabled={saving} rows={3} onChange={(event) => { setReason(event.target.value); onDirty(true); }} /></label>
      <Button type="link" disabled={saving} onClick={() => { setProposal(!proposal); onDirty(true); }}>{proposal ? "Voltar à associação de conceito existente" : "Não encontrou? Propor novo conceito"}</Button>
    </div>
    <footer><Space wrap><Button onClick={onCancel} disabled={saving}>Cancelar</Button><Button disabled={!valid} loading={saving} onClick={() => void save(false)}>Gravar</Button><Button type="primary" disabled={!valid} loading={saving} onClick={() => void save(true)}>Gravar e próximo</Button></Space><small>Gravar retorna à lista; Gravar e próximo continua a revisão.</small></footer>
  </>;
}

function candidatePriority(candidate: CurationCandidate): number {
  return ({ exact: 0, official_alias: 1, human_alias: 2, relevant_partial: 3, ambiguous: 4 } as const)[candidate.matchClass];
}
