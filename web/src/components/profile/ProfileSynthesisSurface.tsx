import { Component, useEffect, useRef, useState } from "react";
import { FileSearchOutlined, FileTextOutlined, LinkOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Grid, Skeleton, Space, Tag } from "antd";
import { PROFILE_SYNTHESIS_QUESTIONS, SynthesisFailure, explainSynthesisFailure, explainSynthesisSection, type ProfileSynthesisView, type SynthesisSource, type SynthesisStatement } from "../../../../src/domain/profileSynthesis";
import type { ProfileSynthesisAdapter } from "../../infrastructure/supabase/profileSynthesisService";
import type { PrismaProfileView } from "../../domain/canonicalProfile";
import { publishedSummarySections } from "../../domain/profileSummaryPublished";
import { PrismaCard } from "../../ui/PrismaCard";

type SurfaceProps = { adapter: ProfileSynthesisAdapter; onOriginal: () => void; onOpenSource: (source: SynthesisSource) => void; originalSummary?: string | null | undefined; publishedProfile?: PrismaProfileView | undefined };
class SynthesisBoundary extends Component<SurfaceProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { console.error("PRISMA_SYNTHESIS_RENDER_FAILED"); }
  override componentDidUpdate(previous: SurfaceProps) { if (previous.adapter !== this.props.adapter && this.state.failed) this.setState({ failed: false }); }
  override render() {
    if (!this.state.failed) return <ProfileSynthesisBody {...this.props} />;
    const info = explainSynthesisFailure("RENDER_FAILED");
    return <><Alert type="warning" showIcon title={info.explanation} description={info.action} action={<Button onClick={() => this.setState({ failed: false })}>Atualizar consulta</Button>} /><PublishedSummary {...this.props} /></>;
  }
}
export function ProfileSynthesisSurface(props: SurfaceProps) { return <SynthesisBoundary {...props} />; }

function PublishedSummary({ publishedProfile, originalSummary, onOriginal }: Pick<SurfaceProps, "publishedProfile" | "originalSummary" | "onOriginal">) {
  const sections = publishedSummarySections(publishedProfile);
  return <div className="prisma-synthesis-reading prisma-synthesis-published">
    <PrismaCard title="Resumo do perfil" extra={<Button onClick={onOriginal}>Consultar Perfil completo</Button>}>
      <p className="prisma-synthesis-provenance">Informações publicadas no Perfil aprovado</p>
      {originalSummary ? <p className="prisma-synthesis-narrative">{originalSummary}</p> : <p>Ainda não há um resumo narrativo publicado. Os registros disponíveis aparecem abaixo.</p>}
    </PrismaCard>
    <div className="prisma-synthesis-axes">{PROFILE_SYNTHESIS_QUESTIONS.map(([id, label]) => <SummarySectionBoundary key={id} title={label}><PrismaCard title={label} className="prisma-synthesis-published-section">
      {sections[id].map((text, index) => <p key={index}>{text}</p>)}
      <p className="prisma-synthesis-missing">{sections[id].length ? "A análise desta seção ainda não está disponível. Os dados publicados foram preservados acima." : id === "clarifications" ? "Ainda não foi possível preparar perguntas específicas para aprofundar este Perfil." : "Não há informações publicadas suficientes para responder a esta seção neste momento."}</p>
    </PrismaCard></SummarySectionBoundary>)}</div>
  </div>;
}
class SummarySectionBoundary extends Component<{ children: React.ReactNode; title: string }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { console.error("PRISMA_SYNTHESIS_SECTION_RENDER_FAILED"); }
  override render() { return this.state.failed ? <PrismaCard title={this.props.title}><p>Não foi possível apresentar esta seção agora. As outras informações continuam disponíveis.</p></PrismaCard> : this.props.children; }
}
function ProfileSynthesisBody({ adapter, onOriginal, onOpenSource, originalSummary, publishedProfile }: SurfaceProps) {
  const [view, setView] = useState<ProfileSynthesisView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryAttempt, setQueryAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const retryLock = useRef(false);
  const currentAdapter = useRef<ProfileSynthesisAdapter | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [selection, setSelected] = useState<{ statement: SynthesisStatement; sourceId: string; analysisId: string } | null>(null);
  const [sourceState, setSourceState] = useState<{ key: string; source: SynthesisSource | null; error: string | null } | null>(null);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const cache = useRef(new Map<string, SynthesisSource>());
  const sourceToggle = useRef<HTMLButtonElement>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const sourceScroll = useRef(0);
  const sourceWasOpen = useRef(false);
  const drawerOpen = useRef(false);
  const screens = Grid.useBreakpoint();
  const narrow = screens.md === false;

  useEffect(() => {
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined; let polls = 0;
    const firstVisit = currentAdapter.current !== adapter;
    if (firstVisit) { setView(null); setSelected(null); setShowSources(false); sourceTrigger.current = null; cache.current.clear(); currentAdapter.current = adapter; }
    setError(null);
    const update = async (initial = false) => {
      if (!active) return;
      if (document.visibilityState !== "visible") { timer = setTimeout(() => void update(initial), 15000); return; }
      try {
        let next = await adapter.load();
        if (initial && next.state === "not_requested") next = await adapter.request();
        if (!active) return;
        setView(next); setError(null);
        if (["queued", "processing"].includes(next.state) && polls++ < 24) timer = setTimeout(() => {
          if (document.visibilityState === "visible") void update();
          else timer = setTimeout(() => void update(), 15000);
        }, 5000);
        else if (["queued", "processing"].includes(next.state)) setError("WAIT_EXCEEDED");
      } catch (cause) { if (active) setError(cause instanceof SynthesisFailure ? cause.diagnostic.reason : "READ_UNAVAILABLE"); }
    };
    void update(firstVisit);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [adapter, queryAttempt]);

  const retry = async () => {
    const operation = view?.state === "not_requested" ? () => adapter.request() : adapter.retry ? () => adapter.retry!() : null;
    if (!operation || retryLock.current) return;
    retryLock.current = true; setRetrying(true);
    try { const next = await operation(); if (currentAdapter.current === adapter) { setView(next); setQueryAttempt(value => value + 1); } }
    catch (cause) { if (currentAdapter.current === adapter) setError(cause instanceof SynthesisFailure ? cause.diagnostic.reason : "READ_UNAVAILABLE"); }
    finally { retryLock.current = false; setRetrying(false); }
  };

  const effective = view?.result ?? view?.previous?.result;
  const analysisId = view?.analysisId ?? view?.previous?.analysisId;
  const selected = showSources && selection?.analysisId === analysisId ? selection : null;
  const sourceIsOpen = Boolean(selected);
  drawerOpen.current = sourceIsOpen;
  const references = view?.result ? view.sources : view?.previous?.sources ?? [];
  const showingPrevious = Boolean(view?.previous && !view.result);
  const profileVersion = showingPrevious ? view?.previous?.profileVersion : view?.profileVersion;
  const generatedAt = showingPrevious ? view?.previous?.generatedAt : view?.generatedAt;
  const generatedDate = generatedAt && Number.isFinite(Date.parse(generatedAt)) ? new Intl.DateTimeFormat("pt-BR").format(new Date(generatedAt)) : null;
  const sourceKey = selected ? selected.analysisId + ":" + selected.sourceId : null;
  const source = sourceState?.key === sourceKey ? sourceState.source : null;
  const sourceError = sourceState?.key === sourceKey ? sourceState.error : null;

  useEffect(() => {
    let active = true;
    setSourceState(null);
    if (!selected || !analysisId) return;
    const key = analysisId + ":" + selected.sourceId;
    const cached = cache.current.get(key);
    if (cached) { setSourceState({ key, source: cached, error: null }); return; }
    void adapter.source(analysisId, selected.sourceId).then(next => {
      if (active) { cache.current.set(key, next); setSourceState({ key, source: next, error: null }); }
    }).catch((cause: unknown) => {
      if (active) { const info = explainSynthesisFailure(cause instanceof SynthesisFailure ? cause.diagnostic.reason : "SOURCE_UNAVAILABLE"); setSourceState({ key, source: null, error: info.explanation + " " + info.action }); }
    });
    return () => { active = false; };
  }, [adapter, analysisId, selected?.sourceId, sourceAttempt]);

  const restoreFocus = () => {
    if (!sourceTrigger.current) return;
    // The portal removes its focus guards after the close animation commits.
    requestAnimationFrame(() => {
      if (drawerOpen.current) return;
      const trigger = sourceTrigger.current?.isConnected ? sourceTrigger.current : sourceToggle.current;
      if (!trigger?.isConnected) return;
      trigger?.focus({ preventScroll: true });
      window.scrollTo({ top: sourceScroll.current, behavior: "instant" });
    });
  };
  useEffect(() => {
    if (sourceWasOpen.current && !sourceIsOpen) restoreFocus();
    sourceWasOpen.current = sourceIsOpen;
  }, [sourceIsOpen]);
  const open = (statement: SynthesisStatement, trigger: HTMLElement) => {
    if (!analysisId || !showSources) return;
    sourceTrigger.current = trigger;
    sourceScroll.current = window.scrollY;
    setSelected({ statement, sourceId: statement.sourceIds[0]!, analysisId });
  };
  const toggleSources = () => { if (showSources) setSelected(null); setShowSources(value => !value); };
  const statements = (items: SynthesisStatement[]) => items.map((item, i) => <div className={"prisma-synthesis-statement" + (selected?.statement === item ? " is-source-selected" : "")} key={i}>
    {item.nature === "interpretation" ? <span className="prisma-synthesis-interpretation">Interpretação da IA</span> : null}
    <p>{item.text}</p>
    {showSources ? <Button className="prisma-synthesis-origin-action" type="link" icon={<FileSearchOutlined />} aria-label={"Consultar fonte: " + (references.find(x => x.id === item.sourceIds[0])?.label ?? "Informação publicada")} onClick={event => open(item, event.currentTarget)}>Ver origem</Button> : null}
  </div>);

  return <section className={"prisma-synthesis" + (selected && !narrow ? " is-source-open" : "")} aria-label="Resumo profissional">
    {error ? <Alert showIcon type="warning" title={explainSynthesisFailure(error).explanation} description={explainSynthesisFailure(error).action} action={<Button onClick={() => setQueryAttempt(value => value + 1)}>Atualizar consulta</Button>} /> : null}
    {showingPrevious ? <Alert showIcon type="info" title="As informações de base mudaram" description={"A síntese anterior está identificada abaixo e pode conter informações que mudaram. " + (view?.state === "failed" ? "A nova leitura não pôde ser concluída; o Perfil aprovado permanece disponível." : view?.state === "insufficient" ? "A base atual precisa de mais informações profissionais para uma nova síntese." : "A nova leitura está sendo preparada.")} /> : null}
    {!effective ? <>
      {!view && !error ? <Skeleton active paragraph={{ rows: 2 }} /> : null}
      {view?.state === "failed" ? <p>Não foi possível concluir a leitura da IA. Você pode consultar as informações publicadas em cada seção abaixo.</p> : view?.state === "queued" || view?.state === "processing" ? <p>A leitura da IA está sendo preparada. Os dados publicados permanecem disponíveis.</p> : null}
      <Space wrap>{view?.canRetry && adapter.retry ? <Button loading={retrying} onClick={() => void retry()}>Gerar leitura novamente</Button> : null}{view?.state === "not_requested" ? <Button loading={retrying} onClick={() => void retry()}>Gerar síntese</Button> : null}<Button onClick={() => setQueryAttempt(value => value + 1)}>Atualizar consulta</Button></Space>
      <PublishedSummary publishedProfile={publishedProfile} originalSummary={originalSummary} onOriginal={onOriginal} />
    </> : <div className="prisma-synthesis-reading">
      <header className="prisma-synthesis-heading">
        <div><h2>Resumo do perfil</h2><p className="prisma-synthesis-provenance">Síntese gerada por IA · Perfil publicado v{profileVersion} · {showingPrevious ? "Análise anterior" : "Análise gravada"}{generatedDate ? " em " + generatedDate : ""}{effective.issues?.length ? " · Algumas informações indisponíveis" : ""}</p></div>
        <Button ref={sourceToggle} icon={<FileSearchOutlined />} onClick={toggleSources} aria-pressed={showSources}>{showSources ? "Ocultar fontes" : "Mostrar fontes"}</Button>
      </header>
      <SummarySectionBoundary key={(analysisId ?? "") + ":overview"} title="Síntese do perfil">
        <div className="prisma-synthesis-narrative">{statements(effective.overview)}
          {effective.issues?.some(x => x.section === "overview") ? <p className="prisma-synthesis-missing">{explainSynthesisSection(effective.issues.find(x => x.section === "overview")?.reason)}</p> : null}
        </div>
      </SummarySectionBoundary>
      <div className="prisma-synthesis-axes">{effective.answers.map(a => {
        const title = PROFILE_SYNTHESIS_QUESTIONS.find(x => x[0] === a.questionId)![1];
        const issue = effective.issues?.find(x => x.section === a.questionId);
        return <SummarySectionBoundary key={(analysisId ?? "") + ":" + a.questionId} title={title}><PrismaCard title={title}>
          {statements(a.statements)}
          {issue ? <p className="prisma-synthesis-missing">{explainSynthesisSection(issue.reason)}</p> : null}
          {a.missingInformation.length ? <div className="prisma-synthesis-missing">{a.missingInformation.map((x, i) => <p key={i}>{x}</p>)}</div> : null}
          {a.questionId === "clarifications" && effective.clarifications.length ? <div className="prisma-synthesis-questions"><h3>Pontos para aprofundar</h3>{effective.clarifications.map((item, index) => <div className="prisma-synthesis-question" key={index}>
            <span>{index + 1}</span><div><p>{item.text}</p>{showSources ? <Button className="prisma-synthesis-origin-action" type="link" icon={<FileSearchOutlined />} onClick={event => open({ text: item.text, nature: "interpretation", sourceIds: item.sourceIds }, event.currentTarget)}>Ver origem da pergunta</Button> : null}</div>
          </div>)}</div> : null}
        </PrismaCard></SummarySectionBoundary>;
      })}</div>
      <Button className="prisma-synthesis-original" type="link" icon={<FileTextOutlined />} onClick={onOriginal}>Consultar Perfil completo</Button>
    </div>}
    <Drawer title="Fontes e origens" open={Boolean(selected)} onClose={() => setSelected(null)} afterOpenChange={isOpen => { if (!isOpen) restoreFocus(); }} focusable={{ focusTriggerAfterClose: false, trap: narrow }} closable={{ "aria-label": "Fechar fontes" }} size={narrow ? "100%" : 420} mask={narrow} push={false} destroyOnHidden rootClassName="prisma-synthesis-source-drawer">
      {selected ? <SummarySectionBoundary key={selected.analysisId + ":" + selected.sourceId} title="Origem da informação">
        <div className="prisma-synthesis-source-panel">
          <h3>Trecho selecionado</h3><p className="prisma-synthesis-selected">{selected.statement.text}</p>
          <p className="prisma-synthesis-provenance">Perfil publicado v{profileVersion}{showingPrevious ? " · Análise anterior" : ""}</p>
          <h3>Origem da informação</h3>
          {selected.statement.sourceIds.length > 1 ? <div className="prisma-synthesis-source-choices">{selected.statement.sourceIds.map(id => <Button key={id} type={selected.sourceId === id ? "primary" : "default"} onClick={() => setSelected({ ...selected, sourceId: id })}>{references.find(x => x.id === id)?.label ?? "Fonte publicada"}</Button>)}</div> : null}
          {sourceError ? <Alert title={sourceError} action={<Button onClick={() => setSourceAttempt(value => value + 1)}>Tentar novamente</Button>} type="warning" /> : source ? <>
            <Tag color={source.nature === "verified_assessment" ? "green" : "blue"}>{source.nature === "verified_assessment" ? "Assessment vigente na geração" : "Relato publicado"}</Tag>
            <h4>{source.label}</h4><blockquote>{source.text}</blockquote>
            <p>{source.pageNumber ? "Página " + source.pageNumber : "Campo publicado, sem posição de página disponível"}</p>
            {source.documentId || source.nature === "verified_assessment" ? <Button block onClick={() => { try { onOpenSource(source); } catch { setSourceState({ key: sourceKey!, source: null, error: "Não foi possível abrir a origem. Tente novamente ou consulte o Perfil completo." }); } }} icon={<LinkOutlined />}>Abrir origem</Button> : null}
            <p className="prisma-synthesis-source-note">{source.nature === "verified_assessment" ? "A condição do Assessment corresponde à base utilizada nesta análise." : "Esta informação foi declarada no Perfil. Ela não representa uma verificação independente."}</p>
          </> : <Skeleton active paragraph={{ rows: 4 }} />}
        </div>
      </SummarySectionBoundary> : null}
    </Drawer>
  </section>;
}
