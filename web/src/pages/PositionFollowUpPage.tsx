import { useEffect, useRef, useState, type DragEvent } from "react";
import { Alert, Button, Drawer, Empty, Input, Modal, Radio, Segmented, Select, Skeleton, Space, Table, Tabs, Tag, Typography } from "antd";
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, FilterOutlined, HolderOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SearchOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import type { OrganizationMembership } from "../shared/access";
import type { VacancyCandidateMatch, VacancyDetail } from "../domain/vacancy";
import { filterFollowUp, followUpColumns, followUpColumn, followUpStages, followUpHistoryLabels, interviewInstant, type FollowUpData, type FollowUpDetails, type FollowUpEntry, type FollowUpFilters } from "../domain/positionFollowUp";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { vacancyService } from "../infrastructure/supabase/vacancyService";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaBriefcaseIcon } from "../ui/PrismaBriefcaseIcon";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { useUnsavedChanges, useViewState } from "../ui/PrismaNavigation";
import "./positionFollowUp.css";

interface Props { activeMembership: OrganizationMembership; vacancyId: string; personId?: string; onNavigate: (path: string) => void; }
const reviewerRoles = ["super_admin","owner","admin","recruiter"];
const initialFilters: FollowUpFilters = { search:"",stage:"",assignee:"",due:"",order:"name",closed:false };
const message = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir esta operação.";
const date = (value: string) => new Date(value).toLocaleString("pt-BR");

export function PositionFollowUpPage({ activeMembership, vacancyId, personId, onNavigate }: Props) {
  const base = `/vacancies/${vacancyId}/follow-up`;
  const [vacancy,setVacancy] = useState<VacancyDetail|null>(null);
  const [data,setData] = useState<FollowUpData|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [pending,setPending] = useState<string[]>([]);
  const locks = useRef(new Set<string>()), generation = useRef(0), responseSequence = useRef(0);
  const [mode,setMode] = useViewState<string>("mode","kanban",base);
  const [filters,setFilters] = useViewState<FollowUpFilters>("filters",initialFilters,base);
  const [mobileColumn,setMobileColumn] = useViewState<string>("column","awaiting_evaluation",base);
  const [showFilters,setShowFilters] = useState(false);
  const [dragging,setDragging] = useState<string|null>(null), [target,setTarget] = useState<string|null>(null);
  const dragRef = useRef<string|null>(null);
  useLoadingFeedback({ "Carregando acompanhamento…":loading, "Salvando acompanhamento…":pending.length>0 });
  async function load() {
    const scope = generation.current, request = ++responseSequence.current;
    setLoading(true); setError(null);
    try {
      const [v,d] = await Promise.all([vacancyService.load(activeMembership.organizationId,vacancyId),positionFollowUpService.load(activeMembership.organizationId,vacancyId)]);
      if(scope===generation.current && request===responseSequence.current){setVacancy(v);setData(previous=>!previous?.process||!d.process||d.process.revision>=previous.process.revision?d:previous);}
    } catch(e){if(scope===generation.current)setError(message(e));}
    finally{if(scope===generation.current)setLoading(false);}
  }
  useEffect(()=>{generation.current++;locks.current.clear();setPending([]);setData(null);setVacancy(null);if(reviewerRoles.includes(activeMembership.role))void load();else setLoading(false);return()=>{generation.current++;};},[activeMembership.organizationId,activeMembership.role,vacancyId]);
  useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==="Escape"){dragRef.current=null;setDragging(null);setTarget(null);}};window.addEventListener("keydown",cancel);return()=>window.removeEventListener("keydown",cancel);},[]);
  async function mutate(action:string,entry:FollowUpEntry|null,payload:object={}) {
    const key=entry?.id??"process"; if(locks.current.has(key))return false;
    locks.current.add(key);setPending([...locks.current]);setError(null);
    const scope=generation.current;
    try{
      const result=await positionFollowUpService.mutate(activeMembership.organizationId,vacancyId,action,entry?.personId??null,entry?.revision??data?.process?.revision??null,payload);
      // Read after each transaction so independent card responses cannot regress the board.
      if(scope===generation.current){setData(previous=>!previous?.process||!result.process||result.process.revision>=previous.process.revision?result:previous);}
      return true;
    }catch(e){if(scope===generation.current)setError(message(e));return false;}
    finally{if(scope===generation.current){locks.current.delete(key);setPending([...locks.current]);}}
  }
  if(!reviewerRoles.includes(activeMembership.role))return <PrismaPage><Alert type="error" showIcon title="Você não tem acesso ao acompanhamento desta Posição." /></PrismaPage>;
  const rows=data?filterFollowUp(data.entries,filters,new Date().toLocaleDateString("en-CA")):[];
  const selected=data?.entries.find(e=>e.personId===personId)??null;
  const disabled=data?.process?.status==="closed";
  function update(patch:Partial<FollowUpFilters>){setFilters({...filters,...patch});}
  function stopDrag(){dragRef.current=null;setDragging(null);setTarget(null);}
  function startDrag(event:DragEvent,entry:FollowUpEntry){
    if(disabled||pending.includes(entry.id)){event.preventDefault();return;}
    dragRef.current=entry.id;setDragging(entry.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-prisma-follow-up",entry.id);
    const card=event.currentTarget.closest("article");if(card)event.dataTransfer.setDragImage(card,20,25);
  }
  function drop(event:DragEvent,stage:string){
    event.preventDefault();const id=dragRef.current;stopDrag();
    const entry=data?.entries.find(e=>e.id===id);if(entry&&followUpColumn(entry.stage)!==stage)void mutate("stage",entry,{stage});
  }
  function card(entry:FollowUpEntry){return <article key={entry.id} data-entry={entry.personId} className={`pf-card${dragging===entry.id?" is-dragging":""}`} aria-busy={pending.includes(entry.id)}>
    <div className="pf-card-top"><span className="pf-avatar" aria-hidden="true">{entry.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}</span><div className="pf-card-identity"><button className="pf-person" onClick={()=>onNavigate(`${base}/${entry.personId}`)}>{entry.fullName}</button><p className="pf-title">{entry.title||"Título não informado"}</p></div>
      {entry.stage!=="closed"?<button className="pf-handle" draggable={!disabled&&!pending.includes(entry.id)} aria-label={`Arrastar ${entry.fullName}`} title="Arraste pela alça. Use Mover etapa como alternativa." disabled={disabled||pending.includes(entry.id)} onDragStart={e=>startDrag(e,entry)} onDragEnd={stopDrag}><HolderOutlined /></button>:null}</div>
    {entry.age!==null?<p className="pf-age"><UserOutlined /> {entry.age} anos</p>:null}
    <button className={`pf-score${entry.score===null?" is-unavailable":""}`} aria-label={`Score e cobertura de ${entry.fullName}`} onClick={()=>onNavigate(`${base}/${entry.personId}`)}><span>Score Prisma</span><strong>{entry.score===null?"Indisponível":entry.score}</strong><span className="pf-score-link">Score e cobertura</span><RightOutlined /></button>
    {scoreNotice(entry)?<small className="pf-score-notice">{scoreNotice(entry)}</small>:null}
    {entry.stage==="interview_scheduled"||entry.stage==="decision_recorded"?<Tag>{followUpStages[entry.stage]}</Tag>:null}
    {pending.includes(entry.id)?<div role="status" className="pf-saving">Salvando etapa…</div>:null}
    <div className="pf-card-bottom"><Button type="link" onClick={()=>onNavigate(`${base}/${entry.personId}`)}>Ver detalhes</Button>{entry.stage!=="closed"?<MoveStage entry={entry} disabled={disabled||pending.includes(entry.id)} onMove={stage=>void mutate("stage",entry,{stage})} />:null}</div>
  </article>;}
  return <PrismaPage className="pf-page">
    <Button type="text" icon={<ArrowLeftOutlined />} onClick={()=>onNavigate("/vacancies")}>Voltar para Posições</Button>
    <PrismaPageHeader icon={<PrismaBriefcaseIcon />} title={vacancy?.title??"Acompanhamento da Posição"} description={vacancy?.area||"Acompanhe as Pessoas selecionadas nesta Posição."}
      extras={<Space wrap>{vacancy?<Tag>Definição v{vacancy.version}</Tag>:null}{data?.process?<Tag color="blue">{data.process.name} · {disabled?"Encerrada":"Em andamento"}</Tag>:null}{vacancy?<Tag>{vacancy.occupancy==="occupied"?"Ocupada":"Não ocupada"}</Tag>:null}</Space>}
      actions={<Space wrap><Button className="pf-view-position" onClick={()=>onNavigate(`/vacancies/${vacancyId}`)}>Ver posição</Button><Button icon={<PlusOutlined aria-hidden />} type="primary" onClick={()=>onNavigate(`/vacancies/${vacancyId}/people`)}>Encontrar pessoas</Button></Space>} />
    <Tabs activeKey="follow-up" onChange={key=>onNavigate(key==="people"?`/vacancies/${vacancyId}/people`:`/vacancies/${vacancyId}${key==="history"?"/history":""}`)} items={[{key:"overview",label:"Visão geral"},{key:"people",label:"Pessoas encontradas"},{key:"follow-up",label:"Acompanhamento"},{key:"history",label:"Histórico"}]} />
    {error?<Alert type="error" showIcon title={error} action={<Button loading={loading} onClick={()=>void load()}>Atualizar dados</Button>} />:null}
    {loading&&!data?<PrismaCard><Skeleton active paragraph={{rows:10}} /></PrismaCard>:null}
    {data?<>
      <div className="pf-metrics" aria-label="Indicadores de todo o processo"><div><TeamOutlined /><strong>{data.entries.filter(e=>e.stage!=="closed").length}</strong><span>Pessoas em acompanhamento</span></div><div><CalendarOutlined /><strong>{data.entries.filter(e=>e.details.interview?.status==="scheduled"&&e.stage!=="closed").length}</strong><span>Entrevistas agendadas</span></div><div><CheckCircleOutlined /><strong>{data.entries.filter(e=>e.details.decision).length}</strong><span>Decisões registradas</span></div></div>
      {disabled?<Alert type="info" showIcon title="Processo encerrado" description="Etapas e decisões foram preservadas. Reabra o processo para continuar o acompanhamento." />:null}
      <div className="pf-toolbar"><Input aria-label="Buscar Pessoa ou próxima ação" placeholder="Buscar Pessoa ou próxima ação" prefix={<SearchOutlined />} value={filters.search} onChange={e=>update({search:e.target.value})} />
        <Button className="pf-filter-toggle" aria-label="Filtros e ordenação" aria-expanded={showFilters} icon={<FilterOutlined aria-hidden />} onClick={()=>setShowFilters(v=>!v)} />
        <div className={`pf-filters${showFilters?" is-open":""}`}>
        <Select aria-label="Filtrar etapa" value={filters.stage} onChange={stage=>update({stage})} options={[{value:"",label:"Todas as etapas"},...Object.entries(followUpStages).map(([value,label])=>({value,label}))]} />
        <Select aria-label="Filtrar responsável" value={filters.assignee} onChange={assignee=>update({assignee})} options={[{value:"",label:"Todos os responsáveis"},{value:"missing",label:"Sem responsável"},...data.operators.map(o=>({value:o.id,label:o.name}))]} />
        <Select aria-label="Filtrar prazo" value={filters.due} onChange={due=>update({due})} options={[{value:"",label:"Todos os prazos"},{value:"overdue",label:"Atrasados"},{value:"today",label:"Hoje"},{value:"missing",label:"Sem prazo"}]} />
        <Select aria-label="Ordenar acompanhamento" value={filters.order} onChange={order=>update({order})} options={[{value:"name",label:"Nome"},{value:"due",label:"Prazo"}]} />
        </div>
        <Segmented aria-label="Visualização" options={[{value:"list",label:"Lista"},{value:"kanban",label:"Kanban"}]} value={mode} onChange={v=>setMode(String(v))} />
      </div>
      <p className="pf-drag-help">Arraste pela alça para mudar de fase ou use Mover etapa.</p>
      <div className="pf-scope"><span>{rows.length} Pessoas nesta visualização · indicadores acima consideram todo o processo</span><Space wrap><Button type={filters.closed?"primary":"default"} onClick={()=>update({closed:!filters.closed,stage:""})}>{filters.closed?"Voltar ao acompanhamento":`Concluídos (${data.entries.filter(e=>e.stage==="closed").length})`}</Button><Button aria-label="Atualizar acompanhamento" icon={<ReloadOutlined />} loading={loading} onClick={()=>void load()} /></Space></div>
      {!data.entries.length?<PrismaCard><Empty description="Nenhuma Pessoa foi adicionada à avaliação desta Posição."><Button type="primary" onClick={()=>onNavigate(`/vacancies/${vacancyId}/people`)}>Encontrar pessoas</Button></Empty></PrismaCard>
      :!rows.length?<PrismaCard><Empty description={filters.closed?"Nenhum acompanhamento concluído corresponde aos filtros.":"Nenhuma Pessoa corresponde aos filtros."}><Button onClick={()=>setFilters(initialFilters)}>Limpar filtros</Button></Empty></PrismaCard>
      :mode==="list"?<><div className="pf-desktop-list"><Table pagination={{pageSize:20,hideOnSinglePage:true}} dataSource={rows} rowKey="id" columns={[
        {title:"Pessoa",render:(_,e:FollowUpEntry)=><><button className="pf-person" onClick={()=>onNavigate(`${base}/${e.personId}`)}>{e.fullName}</button><div>{e.title||"Título não informado"}</div></>},
        {title:"Etapa",render:(_,e:FollowUpEntry)=>followUpStages[e.stage]},
        {title:"Próxima ação",render:(_,e:FollowUpEntry)=>e.details.nextAction||"Não informada"},
        {title:"Responsável",render:(_,e:FollowUpEntry)=>data.operators.find(o=>o.id===e.details.assignee)?.name||(e.details.assignee?"Responsável indisponível":"Não atribuído")},
        {title:"Prazo",render:(_,e:FollowUpEntry)=>e.details.dueDate?e.details.dueDate.split("-").reverse().join("/"):"Sem prazo"},
        {title:"",render:(_,e:FollowUpEntry)=><Button onClick={()=>onNavigate(`${base}/${e.personId}`)}>Ver detalhes</Button>},
      ]} /></div><div className="pf-mobile-list">{rows.map(e=><PrismaCard key={e.id}><button className="pf-person" onClick={()=>onNavigate(`${base}/${e.personId}`)}>{e.fullName}</button><p>{followUpStages[e.stage]}</p><p>Próxima ação: {e.details.nextAction||"Não informada"}</p><p>Responsável: {data.operators.find(o=>o.id===e.details.assignee)?.name||"Não atribuído"}</p><p>Prazo: {e.details.dueDate||"Sem prazo"}</p><Button onClick={()=>onNavigate(`${base}/${e.personId}`)}>Ver detalhes</Button></PrismaCard>)}</div></>
      :filters.closed?<div className="pf-closed">{rows.map(card)}</div>:<>
        <Select className="pf-mobile-selector" aria-label="Coluna do Kanban" value={mobileColumn} onChange={setMobileColumn} options={followUpColumns.map(c=>({value:c.key,label:`${c.title} (${rows.filter(e=>followUpColumn(e.stage)===c.key).length})`}))} />
        <div className="pf-board" aria-label="Kanban de Pessoas">{followUpColumns.map(col=><section key={col.key} data-column={col.key} className={`pf-column${mobileColumn===col.key?" is-mobile-active":""}${target===col.key?" is-target":""}`} onDragOver={e=>{if(dragRef.current&&!disabled){e.preventDefault();e.dataTransfer.dropEffect="move";setTarget(col.key);}}} onDrop={e=>drop(e,col.key)}>
          <header><span className={`pf-dot pf-dot-${col.key}`} /><h2>{col.title}</h2><span className="pf-count">{rows.filter(e=>followUpColumn(e.stage)===col.key).length}</span></header>
          <div className="pf-column-cards">{rows.filter(e=>followUpColumn(e.stage)===col.key).map(card)}{!rows.some(e=>followUpColumn(e.stage)===col.key)?<p className="pf-column-empty">{dragging?"Solte o cartão aqui":"Nenhuma Pessoa nesta fase"}</p>:null}</div>
        </section>)}</div></>}
      <footer className="pf-footer"><span>As etapas organizam o acompanhamento. O score apoia a análise das evidências.</span>{data.process?<Button loading={pending.includes("process")} disabled={pending.length>0} onClick={()=>Modal.confirm({title:disabled?"Reabrir este processo?":"Encerrar este processo?",content:"As etapas, decisões e o histórico de cada Pessoa serão preservados. A ocupação da Posição permanece a mesma.",okText:disabled?"Reabrir processo":"Encerrar processo",cancelText:"Cancelar",onOk:async()=>{if(!await mutate(disabled?"reopen_process":"close_process",null))throw new Error("Falha ao salvar");}})}>{disabled?"Reabrir processo":"Encerrar processo"}</Button>:null}</footer>
    </>:null}
    {personId&&data&&!selected?<Alert type="warning" title="Esta Pessoa não está no acompanhamento desta Posição." action={<Button onClick={()=>onNavigate(base)}>Voltar ao acompanhamento</Button>} />:null}
    {selected&&data?<FollowUpDetail key={selected.id} entry={selected} data={data} vacancy={vacancy} disabled={disabled||selected.stage==="closed"||pending.includes(selected.id)} saving={pending.includes(selected.id)} error={error} refreshing={loading} onRefresh={()=>void load()} onClose={()=>onNavigate(base)} onNavigate={onNavigate} onMutate={(action,payload)=>mutate(action,selected,payload)} />:null}
  </PrismaPage>;
}

function scoreNotice(entry:FollowUpEntry):string|null {
  const match=entry.match as VacancyCandidateMatch|null;
  if(entry.scoreState==="updating")return "Atualizando · resultado anterior preservado";
  if(entry.scoreState==="update_failed")return "Atualização não concluída · resultado preservado";
  return match?.score?.status==="provisional"?"Provisório · consulte a cobertura":null;
}
function MoveStage({entry,disabled,onMove}:{entry:FollowUpEntry;disabled:boolean;onMove:(stage:string)=>void}){
  return <Select className="pf-move" aria-label={`Mover etapa de ${entry.fullName}`} disabled={disabled} value={null} placeholder="Mover etapa" onChange={onMove} options={followUpColumns.filter(c=>c.key!==followUpColumn(entry.stage)).map(c=>({value:c.key,label:c.title}))} />;
}

function FollowUpDetail({entry,data,vacancy,disabled,saving,error,refreshing,onRefresh,onClose,onNavigate,onMutate}:{entry:FollowUpEntry;data:FollowUpData;vacancy:VacancyDetail|null;disabled:boolean;saving:boolean;error:string|null;refreshing:boolean;onRefresh:()=>void;onClose:()=>void;onNavigate:(path:string)=>void;onMutate:(action:string,payload?:object)=>Promise<boolean>}){
  const [draft,setDraft]=useState<FollowUpDetails>(structuredClone(entry.details));
  const [draftRevision,setDraftRevision]=useState(entry.revision);
  const [outcome,setOutcome]=useState<string|null>(null),[rationale,setRationale]=useState("");
  const [interviewAt,setInterviewAt]=useState(""),[timezone,setTimezone]=useState(Intl.DateTimeFormat().resolvedOptions().timeZone),[participants,setParticipants]=useState("");
  const [localError,setLocalError]=useState<string|null>(null);
  const initial=useRef(JSON.stringify(entry.details));
  const dirty=JSON.stringify(draft)!==initial.current||Boolean(outcome||rationale||interviewAt||participants);
  const markSaved=useUnsavedChanges(dirty);
  const conflict=entry.revision!==draftRevision;
  async function save(action:string,payload?:object){
    setLocalError(null);
    if(conflict){setLocalError("Os dados mudaram enquanto o detalhe estava aberto. Preserve suas anotações e carregue o estado atual antes de salvar.");return;}
    if(await onMutate(action,payload)){
      if(action==="details"){initial.current=JSON.stringify(draft);}
      if(action==="decision"){setOutcome(null);setRationale("");}
      if(action==="schedule"){setInterviewAt("");setParticipants("");}
      setDraftRevision(entry.revision+1);
    }
  }
  function close(){if(!dirty){onClose();return;}let discard=false;Modal.confirm({title:"Descartar alterações não salvas?",content:"O rascunho deste acompanhamento ainda não foi salvo.",okText:"Descartar e fechar",cancelText:"Continuar editando",onOk:()=>{discard=true;},afterClose:()=>{if(discard){markSaved();onClose();}}});}
  const match=entry.match as VacancyCandidateMatch|null;
  return <Drawer open className="pf-drawer" size="large" title={entry.fullName} onClose={close} maskClosable={false}>
    <p>{entry.title||"Título não informado"}{entry.age!==null?` · ${entry.age} anos`:""}</p><Space wrap><Tag>{followUpStages[entry.stage]}</Tag><Button onClick={()=>onNavigate(`/profiles/${entry.personId}/profile`)}>Abrir Perfil e fontes</Button></Space>
    {error?<Alert type="error" showIcon title={error} action={<Button loading={refreshing} onClick={onRefresh}>Atualizar dados</Button>} />:null}
    {localError?<Alert type="error" showIcon title={localError} />:null}
    {conflict?<Alert showIcon type="warning" title="Há uma versão mais recente deste acompanhamento" description="Seu rascunho foi preservado. Ao carregar o estado atual, as alterações locais serão substituídas." action={<Button onClick={()=>Modal.confirm({title:"Substituir o rascunho pelos dados atuais?",okText:"Carregar estado atual",cancelText:"Manter rascunho",onOk:()=>{setDraft(structuredClone(entry.details));initial.current=JSON.stringify(entry.details);setDraftRevision(entry.revision);setOutcome(null);setRationale("");setInterviewAt("");setParticipants("");markSaved();}})}>Carregar estado atual</Button>} />:null}
    <PrismaCard title="Score, cobertura e versões"><div className="pf-detail-score"><span>Score Prisma</span><strong>{entry.score??"Indisponível"}</strong><span>{scoreNotice(entry)}</span></div>
      {match?.score?<><p>Cobertura das evidências: {match.score.coveragePercent}% · referência {match.score.referenceDate}</p><p>Score consultado: Perfil v{match.score.profileVersionNumber} · Definição v{match.score.positionVersionNumber}</p>
      {(entry.profileId!==entry.scoreProfileId||vacancy?.versionId!==entry.scorePositionId)?<Alert type="info" showIcon title="Perfil ou definição mudou após este resultado" description="O resultado anterior foi preservado. Consulte as versões atuais em Pessoas encontradas antes de uma nova análise." />:null}
      <details><summary>Como o score foi calculado e suas evidências</summary>{match.score.provisionalReasons?.map(reason=><p key={reason}>{reason}</p>)}{match.score.dimensions?.map(dim=><section key={dim.key}><h3>{({area:"Área profissional",position:"Proximidade da função",required:"Requisitos obrigatórios",desired:"Requisitos desejáveis",duration:"Duração da experiência",recency:"Recência da experiência"})[dim.key]}</h3><p>{dim.explanation}</p>{dim.evidence.map(ev=><p key={ev.reference}>{ev.label} · {ev.source}{ev.sourceVersion?` · ${ev.sourceVersion}`:""}</p>)}</section>)}{match.requirements?.map(r=><section key={r.requirement.stableId}><h3>{r.requirement.label}</h3><p>{r.explanation}</p></section>)}<p>Matching: {match.score.matchingContractVersion} · Score: {match.score.scoreContractVersion}</p></details></>:<p>Nenhum resultado salvo disponível. Consulte Pessoas encontradas para analisar as evidências.</p>}
      <p>Perfil publicado atual: {entry.profileVersion?`v${entry.profileVersion}`:"Indisponível"} · Definição atual: {vacancy?`v${vacancy.version}`:"Indisponível"}</p>
      {(entry.sourceProfileId!==entry.profileId||entry.sourcePositionId!==vacancy?.versionId)?<p>As versões atuais diferem das consultadas na inclusão. As referências anteriores foram preservadas no acompanhamento.</p>:null}
      <details><summary>Referências preservadas na inclusão</summary><p>Perfil: {entry.sourceProfileId??"Indisponível"}</p><p>Definição: {entry.sourcePositionId??"Indisponível"}</p></details>
    </PrismaCard>
    <PrismaCard title="Próximos passos"><form onSubmit={e=>{e.preventDefault();void save("details",{nextAction:draft.nextAction??"",assignee:draft.assignee||null,dueDate:draft.dueDate||null,notes:draft.notes??""});}}>
      <label>Próxima ação<Input maxLength={1000} disabled={disabled} value={draft.nextAction??""} onChange={e=>setDraft({...draft,nextAction:e.target.value})} /></label>
      <label>Responsável<Select allowClear aria-label="Responsável pelo acompanhamento" disabled={disabled} value={draft.assignee??null} onChange={value=>setDraft({...draft,assignee:value??null})} options={data.operators.map(o=>({value:o.id,label:o.name}))} placeholder="Sem responsável" /></label>
      <label>Prazo<Input type="date" disabled={disabled} value={draft.dueDate??""} onChange={e=>setDraft({...draft,dueDate:e.target.value||null})} /></label>
      <label>Anotações e perguntas internas<Input.TextArea rows={4} maxLength={12000} disabled={disabled} value={draft.notes??""} onChange={e=>setDraft({...draft,notes:e.target.value})} /></label><p className="pf-help">Registro interno deste processo, separado dos fatos e evidências do Perfil.</p>
      <Button htmlType="submit" type="primary" loading={saving} disabled={disabled||conflict}>Salvar acompanhamento</Button>
    </form></PrismaCard>
    <PrismaCard title="Entrevista opcional">{entry.details.interview?<p>{entry.details.interview.status==="scheduled"?"Agendada":"Cancelada"} · {new Date(entry.details.interview.at).toLocaleString("pt-BR",{timeZone:entry.details.interview.timezone})} · {entry.details.interview.timezone}<br />Participantes: {entry.details.interview.participants}</p>:<p>Nenhuma entrevista agendada.</p>}
      <form onSubmit={e=>{e.preventDefault();if(!interviewAt||!participants.trim()){setLocalError("Informe data, hora, fuso e participantes.");return;}try{void save("schedule",{at:interviewInstant(interviewAt,timezone),timezone,participants});}catch(error){setLocalError(message(error));}}}>
        <label>Data e hora<Input type="datetime-local" aria-label="Data e hora da entrevista" value={interviewAt} disabled={disabled} onChange={e=>setInterviewAt(e.target.value)} /></label>
        <label>Fuso horário<Input value={timezone} disabled={disabled} onChange={e=>setTimezone(e.target.value)} /></label>
        <label>Participantes<Input value={participants} maxLength={2000} disabled={disabled} onChange={e=>setParticipants(e.target.value)} /></label>
        <Space wrap><Button htmlType="submit" disabled={disabled||conflict} loading={saving}>{entry.details.interview?.status==="scheduled"?"Reagendar entrevista":"Agendar entrevista"}</Button>{entry.details.interview?.status==="scheduled"?<Button disabled={disabled||conflict} onClick={()=>void save("cancel_interview")}>Cancelar entrevista</Button>:null}</Space>
      </form><p className="pf-help">O registro não envia convites ou mensagens.</p>
    </PrismaCard>
    <PrismaCard title="Decisão neste processo">{entry.details.decision?<p>Decisão registrada: <strong>{entry.details.decision.outcome==="proceed"?"Prosseguir":"Não prosseguir neste processo"}</strong><br />Justificativa: {entry.details.decision.rationale}</p>:<p>Aguardando decisão humana.</p>}
      <form onSubmit={e=>{e.preventDefault();if(!outcome||!rationale.trim()){setLocalError("Escolha a decisão e informe sua justificativa.");return;}void save("decision",{outcome,rationale});}}>
        <Radio.Group aria-label="Decisão humana" disabled={disabled} value={outcome} onChange={e=>setOutcome(e.target.value)} options={[{value:"proceed",label:"Prosseguir"},{value:"do_not_proceed",label:"Não prosseguir neste processo"}]} />
        <label>Justificativa obrigatória<Input.TextArea value={rationale} rows={3} maxLength={8000} disabled={disabled} onChange={e=>setRationale(e.target.value)} /></label>
        <Button htmlType="submit" type="primary" disabled={disabled||conflict} loading={saving}>Registrar decisão</Button>
      </form>
    </PrismaCard>
    <PrismaCard title="Histórico deste acompanhamento">{data.history.filter(h=>h.entryId===entry.id||h.entryId===null).map(h=><details key={h.id}><summary>{followUpHistoryLabels[h.action]??h.action} · {h.actor} · {date(h.at)}</summary><pre className="pf-audit">{JSON.stringify({anterior:h.before,registrado:h.after},null,2)}</pre></details>)}</PrismaCard>
    <Button disabled={data.process?.status==="closed"||saving||dirty||conflict} onClick={()=>Modal.confirm({title:entry.stage==="closed"?"Reabrir acompanhamento?":"Concluir acompanhamento desta Pessoa?",content:"Concluir sem decisão permanece distinto de não prosseguir. A ocupação da Posição e as outras Pessoas permanecem preservadas.",okText:entry.stage==="closed"?"Reabrir":"Concluir",cancelText:"Cancelar",onOk:()=>save(entry.stage==="closed"?"reopen":"close")} )}>{entry.stage==="closed"?"Reabrir acompanhamento":"Concluir acompanhamento"}</Button>
  </Drawer>;
}
