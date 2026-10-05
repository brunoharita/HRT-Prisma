import { Component, useEffect, useRef, useState } from "react";
import { ArrowLeftOutlined, ArrowRightOutlined, FileTextOutlined, LinkOutlined } from "@ant-design/icons";
import { Alert, Button, Collapse, Skeleton, Space, Tag } from "antd";
import { PROFILE_SYNTHESIS_QUESTIONS, SynthesisFailure, explainSynthesisFailure, type ProfileSynthesisView, type SynthesisSource, type SynthesisStatement } from "../../../../src/domain/profileSynthesis";
import type { ProfileSynthesisAdapter } from "../../infrastructure/supabase/profileSynthesisService";
import { PrismaCard } from "../../ui/PrismaCard";

type SurfaceProps = { adapter: ProfileSynthesisAdapter; onOriginal: () => void; onOpenSource: (source: SynthesisSource) => void; originalSummary?: string | null | undefined };
class SynthesisBoundary extends Component<SurfaceProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { console.error("PRISMA_SYNTHESIS_RENDER_FAILED"); }
  override componentDidUpdate(previous: SurfaceProps) { if (previous.adapter !== this.props.adapter && this.state.failed) this.setState({ failed: false }); }
  override render() {
    if (!this.state.failed) return <ProfileSynthesisBody {...this.props} />;
    const info = explainSynthesisFailure("RENDER_FAILED");
    return <PrismaCard title="A síntese não pôde ser apresentada"><Alert type="warning" showIcon title={info.explanation} description={info.action} /><PublishedFallback {...this.props} /><Space wrap><Button onClick={() => this.setState({ failed: false })}>Atualizar consulta</Button><Button onClick={this.props.onOriginal}>Consultar Perfil completo</Button></Space><p>Referência de atendimento: apresentação da síntese.</p></PrismaCard>;
  }
}
export function ProfileSynthesisSurface(props: SurfaceProps) { return <SynthesisBoundary {...props} />; }
function PublishedFallback({ originalSummary }: Pick<SurfaceProps, "originalSummary">) {
  return originalSummary ? <div className="prisma-synthesis-published-fallback"><h3>Resumo publicado</h3><p>{originalSummary}</p><p>Informação do Perfil aprovado, preservada independentemente da análise.</p></div> : <p>As informações profissionais aprovadas continuam disponíveis no Perfil completo.</p>;
}
function ProfileSynthesisBody({ adapter, onOriginal, onOpenSource, originalSummary }: SurfaceProps) {
  const [view, setView] = useState<ProfileSynthesisView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryAttempt, setQueryAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const retryLock = useRef(false);
  const currentAdapter = useRef<ProfileSynthesisAdapter | null>(null);
  const [selection, setSelected] = useState<{ statement: SynthesisStatement; sourceId: string; analysisId: string } | null>(null);
  const [source, setSource] = useState<SynthesisSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const cache = useRef(new Map<string, SynthesisSource>());
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined; let polls = 0;
    const firstVisit = currentAdapter.current !== adapter;
    if (firstVisit) { setView(null); setSelected(null); cache.current.clear(); currentAdapter.current = adapter; }
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
  const selected = selection?.analysisId === analysisId ? selection : null;
  const references = view?.result ? view.sources : view?.previous?.sources ?? [];
  const showingPrevious = Boolean(view?.previous && !view.result);
  useEffect(() => {
    let active = true;
    setSource(null); setSourceError(null);
    if (!selected || !analysisId) return;
    const key = `${analysisId}:${selected.sourceId}`;
    const cached = cache.current.get(key);
    if (cached) { setSource(cached); return; }
    void adapter.source(analysisId, selected.sourceId).then(next => { if (active) { cache.current.set(key, next); setSource(next); } }).catch((cause: unknown) => { if (active) { const info = explainSynthesisFailure(cause instanceof SynthesisFailure ? cause.diagnostic.reason : "SOURCE_UNAVAILABLE"); setSourceError(`${info.explanation} ${info.action}`); } });
    return () => { active = false; };
  }, [adapter, analysisId, selected?.sourceId, sourceAttempt]);
  const open = (statement: SynthesisStatement, sourceId: string) => { if (!analysisId) return; setSelected({ statement, sourceId, analysisId }); setTimeout(() => { detailRef.current?.focus(); detailRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, 0); };
  const statements = (items: SynthesisStatement[], compact = false) => items.map((item, i) => <div className={`prisma-synthesis-statement${compact ? " is-compact" : ""}`} key={i}>
    <p>{item.text}</p><div className="prisma-synthesis-citations"><Tag color={item.nature === "interpretation" ? "gold" : "blue"}>{item.nature === "interpretation" ? "Leitura da IA" : "Relato publicado"}</Tag>{item.sourceIds.map((id, index) => <Button key={id} aria-label={`Consultar fonte ${index + 1}: ${references.find(x => x.id === id)?.label ?? id}`} onClick={() => open(item, id)} type="link">Fonte {index + 1} <LinkOutlined /></Button>)}</div>
  </div>);
  return <section className="prisma-synthesis" aria-label="Síntese profissional por IA">
    {!effective || selected ? <header className="prisma-synthesis-heading"><div><span className="prisma-synthesis-eyebrow">LEITURA PROFISSIONAL</span><h2>Resumo do perfil</h2><p>Uma síntese da trajetória, com as informações que sustentam cada leitura.</p></div><Button onClick={onOriginal} icon={<FileTextOutlined />}>Ver resumo do currículo</Button></header> : null}
    {error ? <Alert showIcon type="warning" title={explainSynthesisFailure(error).explanation} description={explainSynthesisFailure(error).action} action={<Button onClick={() => setQueryAttempt(value => value + 1)}>Atualizar consulta</Button>} /> : null}
    {showingPrevious ? <Alert showIcon type="info" title="As informações de base mudaram" description={`A síntese anterior está identificada abaixo e pode conter informações que mudaram. ${view?.state === "failed" ? "A nova leitura não pôde ser concluída; o Perfil aprovado permanece disponível." : view?.state === "insufficient" ? "A base atual precisa de mais informações profissionais para uma nova síntese." : "A nova leitura está sendo preparada."}`} /> : null}
    {effective && view?.state === "failed" ? <PrismaCard title="A nova síntese não foi concluída"><p>{explainSynthesisFailure(view.diagnostic?.reason ?? view.errorCode).explanation}</p><p>{view.attempts === 3 ? "O limite de três tentativas desta versão foi atingido. Informe a referência de atendimento ao suporte." : explainSynthesisFailure(view.diagnostic?.reason ?? view.errorCode).action}</p><Space wrap>{view.canRetry && adapter.retry ? <Button loading={retrying} onClick={() => void retry()}>Gerar síntese novamente</Button> : null}<Button onClick={() => setQueryAttempt(value => value + 1)}>Atualizar consulta</Button></Space><p>Referência de atendimento: {view.jobId ?? "consulta da síntese"} · Tentativa {view.attempts ?? 0} de 3.</p></PrismaCard> : null}
    {!effective ? <PrismaCard title={error ? "Síntese indisponível" : view?.state === "failed" ? "Síntese não concluída" : view?.state === "insufficient" ? "Precisamos de informações profissionais" : view?.state === "not_requested" ? "Síntese ainda não solicitada" : "Preparando a síntese do perfil"}>
      {!view && !error ? <Skeleton active paragraph={{ rows: 3 }} /> : view?.state === "failed" ? <><p>{explainSynthesisFailure(view.diagnostic?.reason ?? view.errorCode).explanation}</p><p>{view.attempts === 3 ? "O limite de três tentativas desta versão foi atingido. Informe a referência de atendimento ao suporte." : explainSynthesisFailure(view.diagnostic?.reason ?? view.errorCode).action}</p><Space wrap>{view.canRetry && adapter.retry ? <Button loading={retrying} onClick={() => void retry()}>Gerar síntese novamente</Button> : null}<Button onClick={() => setQueryAttempt(value => value + 1)}>Atualizar consulta</Button></Space></> : <p>{error ? "Nenhum dado aprovado foi alterado." : view?.state === "insufficient" ? "Esta versão não contém registros profissionais suficientes para uma síntese. Complemente o Perfil pela revisão com as informações disponíveis." : view?.state === "not_requested" ? "Nenhuma análise foi iniciada nesta consulta." : "A análise será gravada para as próximas consultas. Você pode consultar o Perfil completo enquanto ela é preparada."}</p>}
      {view?.state === "not_requested" ? <><p>Esta versão ainda não tem uma síntese gravada. Para iniciar a análise, escolha Gerar síntese. Atualizar consulta apenas verifica o andamento.</p><Button loading={retrying} onClick={() => void retry()}>Gerar síntese</Button></> : null}
      {error || view?.state === "failed" || view?.state === "not_requested" ? <PublishedFallback originalSummary={originalSummary} /> : null}
      <Button onClick={onOriginal}>Consultar Perfil completo</Button>
      {view?.jobId ? <Collapse ghost items={[{ key: "diagnostic", label: "Detalhes para atendimento", children: <><p>Referência: {view.jobId} · Tentativa {view.attempts ?? 0} de 3.</p>{view.diagnostic?.section ? <p>Seção: {view.diagnostic.section === "overview" ? "Síntese principal" : PROFILE_SYNTHESIS_QUESTIONS.find(([id]) => id === view.diagnostic?.section)?.[1]}</p> : null}<p>Identificação: {view.diagnostic?.reason ?? view.errorCode ?? "Em processamento"}</p></> }]} /> : null}
    </PrismaCard> : selected ? <>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setSelected(null)}>Voltar para a síntese</Button>
      <div className="prisma-synthesis-detail" tabIndex={-1} ref={detailRef}>
        <PrismaCard title="Leitura profissional"><p className="prisma-synthesis-provenance">Perfil v{view?.profileVersion} · {showingPrevious ? "Síntese anterior" : "Síntese gravada"}</p>{statements(effective.overview)}<h3>Afirmação selecionada</h3><div className="prisma-synthesis-selected">{statements([selected.statement])}</div><h3>Informações que sustentam esta leitura</h3><div className="prisma-synthesis-source-choices">{selected.statement.sourceIds.map(id => <Button key={id} type={selected.sourceId === id ? "primary" : "default"} onClick={() => setSelected({ statement: selected.statement, sourceId: id, analysisId: selected.analysisId })}>{references.find(x => x.id === id)?.label ?? "Fonte publicada"}</Button>)}</div><p>O trecho ao lado é parte da base utilizada nesta análise. Conexões interpretativas continuam identificadas como leitura da IA.</p></PrismaCard>
        <PrismaCard title="Fonte da informação" className="prisma-synthesis-source-panel">{sourceError ? <Alert title={sourceError} action={<Button onClick={() => setSourceAttempt(value => value + 1)}>Tentar novamente</Button>} type="warning" /> : source ? <><Tag color={source.nature === "verified_assessment" ? "green" : "blue"}>{source.nature === "verified_assessment" ? "Assessment vigente na geração" : "Informação do Perfil publicado"}</Tag><h3>{source.label}</h3><blockquote>{source.text}</blockquote><p>{source.pageNumber ? `Página ${source.pageNumber}` : "Campo publicado, sem posição de página disponível"}</p>{source.documentId || source.nature === "verified_assessment" ? <Button block onClick={() => { try { onOpenSource(source); } catch { setSourceError("Não foi possível abrir a origem. Tente novamente ou consulte o Perfil completo."); } }} icon={<LinkOutlined />}>Abrir origem</Button> : null}</> : <Skeleton active paragraph={{ rows: 4 }} />}</PrismaCard>
      </div>
      <Questions />
    </> : <div className="prisma-synthesis-layout">
      <main><PrismaCard className="prisma-synthesis-overview" extra={<Button type="link" onClick={onOriginal}>Ver resumo do currículo</Button>} title={<span>Síntese do Perfil <Tag color="blue">Gerado por IA</Tag></span>}><p className="prisma-synthesis-provenance">Perfil publicado v{view?.profileVersion} · {showingPrevious ? "Análise anterior" : "Análise gravada"}{(view?.generatedAt ?? view?.previous?.generatedAt) ? ` em ${new Intl.DateTimeFormat("pt-BR").format(new Date((view?.generatedAt ?? view?.previous?.generatedAt)!))}` : ""}</p><p className="prisma-synthesis-narrative">{effective.overview.map((item,i) => <span key={i}>{item.nature === "interpretation" ? <Tag color="gold">Leitura da IA</Tag> : null}{item.text} {item.sourceIds.map(id => <Button type="link" key={id} aria-label={`Consultar fonte: ${references.find(x => x.id === id)?.label ?? id}`} onClick={() => open(item,id)}>[{references.findIndex(x => x.id === id)+1}]</Button>)} </span>)}</p>
      <div className="prisma-synthesis-highlights">{([['activities','Atuação'],['contexts','Contextos'],['objective','Objetivo declarado']] as const).map(([id,label]) => { const a = effective.answers.find(x => x.questionId === id)!; return <PrismaCard key={id} title={label}>{a.statements[0] ? statements([a.statements[0]], true) : <p>{a.missingInformation[0]}</p>}</PrismaCard>; })}</div>
        <Button type="link" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? "Recolher análise" : "Explorar análise completa"} <ArrowRightOutlined /></Button>
      </PrismaCard>
      {expanded ? <Collapse className="prisma-synthesis-axes" items={effective.answers.map(a => ({ key: a.questionId, label: PROFILE_SYNTHESIS_QUESTIONS.find(x => x[0] === a.questionId)![1], children: <>{statements(a.statements)}{a.missingInformation.length ? <div className="prisma-synthesis-missing"><strong>O que ainda precisa ser esclarecido</strong>{a.missingInformation.map(x => <p key={x}>{x}</p>)}</div> : null}</> }))} /> : null}
      <PrismaCard title="Informações que sustentam a síntese"><div className="prisma-synthesis-evidence-list">{[...new Set(effective.overview.flatMap(x => x.sourceIds))].map(id => <button type="button" key={id} onClick={() => open(effective.overview.find(x => x.sourceIds.includes(id))!, id)}><FileTextOutlined /><span>{references.find(x => x.id === id)?.label ?? "Fonte publicada"}</span><ArrowRightOutlined /></button>)}</div></PrismaCard>
      </main><aside><PrismaCard title="Como ler esta síntese"><Tag color="blue">Base: Perfil publicado v{view?.profileVersion}</Tag><p>As informações do Perfil e a leitura da IA aparecem separadas. Cada afirmação permite consultar sua fonte.</p><p>Esta análise apoia a revisão humana. Ela não decide contratação nem comprova competências por si só.</p><Button block onClick={onOriginal}>Consultar informações originais</Button></PrismaCard><Questions /></aside>
    </div>}
  </section>;
  function Questions() { return <PrismaCard title="Pontos para aprofundar">{effective?.clarifications.length ? effective.clarifications.map((item, index) => <div className="prisma-synthesis-question" key={index}><span>{index + 1}</span><div><p>{item.text}</p><Button type="link" onClick={() => open({ text: item.text, nature: "interpretation", sourceIds: item.sourceIds }, item.sourceIds[0]!)}>Ver contexto da pergunta</Button></div></div>) : <p>{effective ? "Nenhuma pergunta complementar foi priorizada nesta análise." : "As perguntas aparecerão após a análise dos registros disponíveis."}</p>}</PrismaCard>; }
}
