import {useEffect,useRef,useState} from "react";
import {Alert,Button,Empty,Input,Modal,Pagination,Segmented,Skeleton,Space,Tabs,Tag} from "antd";
import {ArrowLeftOutlined,ArrowRightOutlined,ApartmentOutlined,PlusOutlined,SearchOutlined,TeamOutlined,ReloadOutlined,StopOutlined} from "@ant-design/icons";
import type {OrganizationMembership} from "../shared/access";
import {processFollowUpPath,processOccupancy,processPath,processStageRows,type SelectionProcess,type SelectionWorkspace} from "../domain/selectionProcess";
import {selectionProcessService} from "../infrastructure/supabase/selectionProcessService";
import {positionFollowUpService} from "../infrastructure/supabase/positionFollowUpService";
import type {FollowUpData} from "../domain/positionFollowUp";
import {FollowUpHistory} from "../components/FollowUpHistory";
import {CreateSelectionProcessModal} from "../components/CreateSelectionProcessModal";
import {PrismaPage,PrismaPageHeader} from "../ui/PrismaPage";
import {useViewState} from "../ui/PrismaNavigation";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import "./selectionProcesses.css";
const roles=["super_admin","owner","admin","recruiter"];
export function SelectionProcessesPage({activeMembership,onNavigate,selectedId,vacancyId}:{activeMembership:OrganizationMembership;onNavigate:(path:string)=>void;selectedId?:string;vacancyId?:string}){
 const org=activeMembership.organizationId;
 const [filter,setFilter]=useViewState("processFilters",{search:"",status:"all",page:1},"/selection-processes");
 const [data,setData]=useState<SelectionWorkspace|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0),[creating,setCreating]=useState(false);
 const [pending,setPending]=useState(false),[tab,setTab]=useState("summary"),[history,setHistory]=useState<FollowUpData|null>(null),[historyError,setHistoryError]=useState<string|null>(null),[historyLoading,setHistoryLoading]=useState(false);
 const lock=useRef(false),generation=useRef(0);
 const allowed=roles.includes(activeMembership.role);
 useLoadingFeedback({"Carregando processos seletivos…":loading,"Salvando processo seletivo…":pending,"Carregando histórico do processo…":historyLoading});
 useEffect(()=>{setData(null);setError(null);setTab("summary");setHistory(null);},[org,activeMembership.role,vacancyId]);
 useEffect(()=>{
  const request=++generation.current;setLoading(true);setError(null);
  if(!allowed){setLoading(false);return;}
  const timer=setTimeout(()=>void selectionProcessService.load(org,{search:filter.search,status:filter.status,offset:(filter.page-1)*50,...(selectedId?{selectedId}:{}),...(vacancyId?{vacancyId}:{})})
  .then(d=>{if(request===generation.current)setData(d);}).catch(e=>{if(request===generation.current)setError(e.message);}).finally(()=>{if(request===generation.current)setLoading(false);}),180);
  return()=>{clearTimeout(timer);generation.current++;};
 },[org,activeMembership.role,filter.search,filter.status,filter.page,selectedId,vacancyId,retry,allowed]);
 useEffect(()=>{const refresh=()=>setRetry(n=>n+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
 const current=data?.organizationId===org?data:null;
 const selected=selectedId?(current?.selected?.id===selectedId?current.selected:current?.processes.find(p=>p.id===selectedId)??null):current?.processes[0]??null;
 useEffect(()=>{setTab("summary");setHistory(null);setHistoryError(null);},[selected?.id]);
 useEffect(()=>{
  if(tab!=="history"||!selected)return;
  let alive=true;setHistory(null);setHistoryError(null);setHistoryLoading(true);
  void positionFollowUpService.load(org,selected.vacancyId,selected.id).then(d=>{if(alive)setHistory(d);}).catch(e=>{if(alive)setHistoryError(e.message);}).finally(()=>{if(alive)setHistoryLoading(false);});
  return()=>{alive=false;setHistoryLoading(false);};
 },[tab,selected?.id,retry,org]);
 async function changeStatus(p:SelectionProcess){
  if(lock.current)return;lock.current=true;setPending(true);setError(null);
  try{await positionFollowUpService.mutate(org,p.vacancyId,p.status==="active"?"close_process":"reopen_process",null,p.revision,{},p.id);setRetry(n=>n+1);}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");throw e;}finally{lock.current=false;setPending(false);}
 }
 function confirmStatus(p:SelectionProcess){Modal.confirm({title:p.status==="active"?"Encerrar este processo?":"Reabrir este processo?",content:"Candidatos, avaliações e decisões serão preservados. A ocupação da Posição permanece a mesma.",okText:p.status==="active"?"Encerrar processo":"Reabrir processo",cancelText:"Cancelar",onOk:()=>changeStatus(p)});}
 if(!allowed)return <PrismaPage><Alert type="error" showIcon title="Você não tem acesso aos processos seletivos." action={<Button onClick={()=>onNavigate("/")}>Ir para Início</Button>}/></PrismaPage>;
 const back=()=>onNavigate(vacancyId?`/selection-processes/position/${vacancyId}`:"/selection-processes");
 const canWrite=selected?.isCurrent&&selected.status==="active";
 return <PrismaPage className={`sp-page ${selectedId?"sp-selected":""}`}>
 <PrismaPageHeader icon={<ApartmentOutlined aria-hidden="true"/>} title="Processos seletivos" description={vacancyId?"Processos e histórico da Posição selecionada.":"Gerencie os ciclos de seleção das Posições da empresa."} actions={<Space wrap><Button aria-label="Atualizar processos" icon={<ReloadOutlined aria-hidden="true"/>} loading={loading} onClick={()=>setRetry(n=>n+1)}/><Button type="primary" icon={<PlusOutlined aria-hidden="true"/>} onClick={()=>setCreating(true)}>Novo processo</Button></Space>}/>
 {error?<Alert showIcon type="error" title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</Button>}/>:null}
 {vacancyId?<Button type="link" onClick={()=>onNavigate(`/vacancies/${vacancyId}`)}>Ver Posição</Button>:null}
 <div className={`sp-workspace ${selectedId?"sp-detail-open":""}`} aria-busy={loading}>
 <section className="sp-list" aria-label="Lista de processos seletivos">
 <Input aria-label="Buscar processo ou Posição" prefix={<SearchOutlined aria-hidden="true"/>} placeholder="Buscar processo ou Posição" maxLength={200} value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value,page:1})} allowClear/>
 <Segmented block aria-label="Situação dos processos" value={filter.status} onChange={status=>setFilter({...filter,status:String(status),page:1})} options={[{value:"all",label:`Todos${current?` (${current.counts.active+current.counts.closed})`:""}`},{value:"active",label:`Em andamento${current?` (${current.counts.active})`:""}`},{value:"closed",label:`Encerrados${current?` (${current.counts.closed})`:""}`}]}/>
 {loading&&!current?<Skeleton active paragraph={{rows:6}}/>:current?.processes.length?<div className="sp-process-list">{current.processes.map(p=><button type="button" key={p.id} className={`sp-process ${selected?.id===p.id?"is-selected":""}`} aria-pressed={selected?.id===p.id} onClick={()=>onNavigate(processPath(p))}>
 <span className="sp-process-title">{p.title} · {p.name}</span><Tag color={p.status==="active"?"blue":"default"}>{p.status==="active"?"Em andamento":"Encerrado"}</Tag>
 <span>{p.candidates} candidatos</span><small>{processOccupancy(p.occupancy)}</small>
 </button>)}</div>:!error?<Empty description={filter.search||filter.status!=="all"?"Nenhum processo corresponde aos filtros.":"Nenhum processo seletivo criado."}><Button type="primary" onClick={()=>setCreating(true)}>Criar processo seletivo</Button></Empty>:null}
 {current&&current.total>50?<Pagination size="small" current={filter.page} pageSize={50} total={current.total} showSizeChanger={false} onChange={page=>setFilter({...filter,page})}/>:null}
 </section>
 <section className="sp-detail" aria-label="Detalhe do processo selecionado">
 <Button className="sp-mobile-back" type="text" icon={<ArrowLeftOutlined aria-hidden="true"/>} onClick={back}>Processos seletivos</Button>
 {selected?<><header className="sp-detail-header"><div className="sp-detail-identity"><h2>{selected.title} · {selected.name}</h2><Space wrap><Tag color={selected.status==="active"?"blue":"default"}>{selected.status==="active"?"Em andamento":"Encerrado"}</Tag><span>{processOccupancy(selected.occupancy)}</span><Button type="link" onClick={()=>onNavigate(`/vacancies/${selected.vacancyId}`)}>Ver Posição <ArrowRightOutlined aria-hidden="true"/></Button></Space><p className="sp-candidates"><TeamOutlined aria-hidden="true"/> {selected.candidates} candidatos</p></div>
 <div className="sp-actions"><Button type="primary" onClick={()=>onNavigate(processFollowUpPath(selected))}>Abrir acompanhamento</Button><Button disabled={!canWrite} icon={<SearchOutlined aria-hidden="true"/>} onClick={()=>onNavigate(`/vacancies/${selected.vacancyId}/people`)}>Encontrar pessoas</Button><Button disabled={!canWrite} onClick={()=>onNavigate(`${processFollowUpPath(selected)}/assessment`)}>Preparar avaliação</Button>
 {selected.isCurrent?<Button danger={selected.status==="active"} icon={<StopOutlined aria-hidden="true"/>} disabled={pending||(selected.status==="closed"&&selected.occupancy!=="vacant")} loading={pending} onClick={()=>confirmStatus(selected)}>{selected.status==="active"?"Encerrar processo":"Reabrir processo"}</Button>:null}
 </div></header>
 {selected.status==="closed"?<Alert type="info" showIcon title="Processo encerrado" description={selected.isCurrent?"Candidatos, avaliações e decisões permanecem disponíveis. Reabrir exige Posição desocupada.":"Este ciclo histórico está disponível somente para consulta."}/>:null}
 <Tabs activeKey={tab} onChange={setTab} items={[
 {key:"summary",label:"Resumo",children:<div className="sp-stage-summary"><h3>Candidatos por etapa</h3>{processStageRows(selected).map((r,i)=><div className="sp-stage-row" key={r.key}><span className={`sp-stage-dot sp-stage-${i}`} aria-hidden/><span>{r.title}</span><strong>{r.count}</strong></div>)}</div>},
 {key:"assessment",label:"Avaliação",children:<div className="sp-tab-content"><p>A prova pertence a este processo. Aplicações, resultados e registros permanecem individuais.</p><Button onClick={()=>onNavigate(`${processFollowUpPath(selected)}/assessment`)}>Consultar avaliação do processo</Button></div>},
 {key:"history",label:"Histórico",children:<div className="sp-tab-content">{historyError?<Alert showIcon type="error" title={historyError} action={<Button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</Button>}/>:historyLoading?<Skeleton active/>:history?<FollowUpHistory history={history.history} operators={history.operators}/>:null}</div>}
 ]}/></>:loading?<Skeleton active paragraph={{rows:6}}/>:<Empty description="Selecione um processo para consultar o resumo."/>}
 </section></div>
 {creating?<CreateSelectionProcessModal organizationId={org} {...(vacancyId?{vacancyId}:{})} onClose={()=>setCreating(false)} onCreated={id=>{setCreating(false);setFilter({search:"",status:"all",page:1});onNavigate(`/selection-processes/${id}`);setRetry(n=>n+1);}}/>:null}
 </PrismaPage>;
}
