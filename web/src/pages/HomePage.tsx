import {selectionProcessService} from "../infrastructure/supabase/selectionProcessService";
import {processFollowUpPath,type SelectionProcess} from "../domain/selectionProcess";
import {useRecentWork} from "../ui/useRecentWork";
import {personIngestionService} from "../infrastructure/supabase/personIngestionService";
import type {PersonWorkspaceSummary} from "../domain/personIngestion";
import {presentDocument} from "../domain/documentPresentation";
import "../ui/uxEvolution.css";
import {useEffect,useState} from "react";
import {Alert,Button,Drawer,Empty,Skeleton} from "antd";
import {HomeFilled,ArrowRightOutlined,FileAddOutlined} from "@ant-design/icons";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import type {HomeSummary,PrismaDataRepository} from "../domain/prismaData";
import type {OrganizationMembership} from "../shared/access";
import {PrismaCard} from "../ui/PrismaCard";
import {PrismaPage,PrismaPageHeader} from "../ui/PrismaPage";

interface HomePageProps {
  activeMembership:OrganizationMembership;
  repository:PrismaDataRepository;
  onNavigate:(path:string)=>void;
}
export function HomePage({activeMembership,repository,onNavigate}:HomePageProps) {
  const recent=useRecentWork();
  const canManage=activeMembership.role!=="member";
  const [people,setPeople]=useState<PersonWorkspaceSummary[]>([]),[workError,setWorkError]=useState(false),[workLoading,setWorkLoading]=useState(canManage);
  const [processes,setProcesses]=useState<SelectionProcess[]>([]),[processError,setProcessError]=useState(false);
  const [summary,setSummary]=useState<HomeSummary|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  const [help,setHelp]=useState(false);
  useLoadingFeedback({"Carregando resumo inicial…":loading});
  useEffect(()=>{
    let current=true;
    setSummary(null);setError(null);setLoading(true);
    void repository.loadHomeSummary(activeMembership.organizationId)
      .then(data=>{if(current)setSummary(data);})
      .catch(()=>{if(current)setError("Não foi possível carregar o resumo da empresa.");})
      .finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[activeMembership.organizationId,repository,retry]);
  useEffect(()=>{let current=true;setPeople([]);setWorkError(false);setWorkLoading(canManage);if(!canManage)return;
    void personIngestionService.listPeople(activeMembership.organizationId,"",true).then(data=>{if(current)setPeople(data);}).catch(()=>{if(current)setWorkError(true);}).finally(()=>{if(current)setWorkLoading(false);});
    return()=>{current=false;};
  },[activeMembership.organizationId,canManage,retry]);
  useEffect(()=>{let current=true;setProcesses([]);setProcessError(false);if(!canManage)return;
    void selectionProcessService.load(activeMembership.organizationId,{status:"active"}).then(result=>{if(current)setProcesses(result.processes);}).catch(()=>{if(current)setProcessError(true);});return()=>{current=false;};
  },[activeMembership.organizationId,canManage,retry]);
  const activePeople=people.filter(p=>p.operationalStatus==="active");
  const pending=activePeople.filter(p=>p.pendingReviewCount>0).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const failed=activePeople.filter(p=>presentDocument(p.latestDocument).state==="technical_failure");
  const continued=recent[0]??(pending[0]?{path:`/profiles/${pending[0].id}`,title:pending[0].fullName,detail:"Documentos aguardando revisão"}:null);
  const administrator=activeMembership.role==="owner"||activeMembership.role==="super_admin";
  return <PrismaPage className="prisma-m81-home prisma-v310">
    <PrismaPageHeader icon={<HomeFilled/>} title={canManage?"Seu trabalho, em dia":"Seu espaço no Prisma"} description={`${activeMembership.organizationName}${activeMembership.groupName?` · ${activeMembership.groupName}`:""}`} actions={canManage?<Button type="primary" icon={<FileAddOutlined/>} onClick={()=>onNavigate("/profiles/import")}>Importar currículo</Button>:<Button onClick={()=>onNavigate("/profiles")}>Consultar Pessoas</Button>}/>
    {error?<Alert type="error" showIcon title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Atualizar consulta</Button>}/>:null}
    <PrismaCard className="prisma-home-continue"><p>{recent.length?"Continuar de onde parou":continued?"Revisão aguardando sua atenção":"Comece por aqui"}</p><h2>{continued?.title??(administrator?"Administre seu grupo e acompanhe o trabalho":"Encontre as informações para sua próxima atividade")}</h2><p>{continued?.detail??(canManage?"Consulte sua base, encontre profissionais para uma Posição ou revise os documentos disponíveis.":"Consulte os conteúdos autorizados na empresa ativa.")}</p><Button type="primary" onClick={()=>onNavigate(continued?.path??(administrator?"/companies":"/profiles"))}>{continued?"Continuar atividade":administrator?"Grupos e empresas":"Consultar Pessoas"} <ArrowRightOutlined/></Button></PrismaCard>
    <div className="prisma-home-work-grid"><PrismaCard title={canManage?"Precisa da sua atenção":"Seus acessos"}>
      {workLoading?<Skeleton active paragraph={{rows:2}}/>:workError?<Alert showIcon type="warning" title="Pendências indisponíveis nesta consulta" action={<Button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</Button>}/>:canManage?<>
        {pending.length?<button type="button" className="prisma-home-task" onClick={()=>onNavigate(`/profiles/${pending[0]!.id}`)}><span><strong>{pending.reduce((n,p)=>n+p.pendingReviewCount,0)} documentos aguardam revisão</strong><small>Continuar por {pending[0]!.fullName}</small></span><ArrowRightOutlined/></button>:<p>Nenhuma revisão pendente identificada nesta consulta.</p>}
        {failed.length?<button type="button" className="prisma-home-task" onClick={()=>onNavigate(`/profiles/${failed[0]!.id}`)}><span><strong>{failed.length} importações precisam de atenção</strong><small>Consultar a causa e a recuperação disponível.</small></span><ArrowRightOutlined/></button>:null}
      </>:<p>Seu perfil permite consultar as informações disponibilizadas para esta empresa.</p>}
      {canManage?processes.filter(p=>(p.stages.interview_scheduled??0)>0||(p.stages.awaiting_decision??0)>0).slice(0,4).map(process=><button type="button" key={process.id} className="prisma-home-task" onClick={()=>onNavigate(processFollowUpPath(process))}><span><strong>{process.title} · {process.name}</strong><small>{[(process.stages.interview_scheduled??0)>0?`${process.stages.interview_scheduled} entrevistas agendadas`:null,(process.stages.awaiting_decision??0)>0?`${process.stages.awaiting_decision} ${process.stages.awaiting_decision===1?"pessoa aguarda":"pessoas aguardam"} decisão`:null].filter(Boolean).join(" · ")}</small></span><ArrowRightOutlined/></button>):null}
      {processError?<p>Não foi possível consultar os processos. <Button type="link" onClick={()=>setRetry(n=>n+1)}>Atualizar pendências</Button></p>:canManage&&processes.length>=50?<p>Mostrando processos recentes. <Button type="link" onClick={()=>onNavigate("/selection-processes")}>Consultar todos os processos</Button></p>:null}
      {canManage?<button type="button" className="prisma-home-task" onClick={()=>onNavigate("/vacancies")}><span><strong>Consultar Posições</strong><small>{canManage?"Encontre pessoas e consulte evidências para cada necessidade.":"Consulte as Posições disponíveis para seu acesso."}</small></span><ArrowRightOutlined/></button>:<button type="button" className="prisma-home-task" onClick={()=>onNavigate("/profiles/search")}><span><strong>Encontrar profissionais</strong><small>Consulte os Perfis publicados na sua empresa.</small></span><ArrowRightOutlined/></button>}
      {administrator?<button type="button" className="prisma-home-task" onClick={()=>onNavigate("/companies")}><span><strong>{activeMembership.role==="super_admin"?"Administrar grupos e empresas":"Administrar seu grupo"}</strong><small>{activeMembership.role==="super_admin"?"Visão administrativa de todos os grupos autorizados.":activeMembership.groupName??"Consulte empresas e acessos sob sua responsabilidade."}</small></span><ArrowRightOutlined/></button>:null}
      {canManage?<button type="button" className="prisma-home-task" onClick={()=>onNavigate("/users")}><span><strong>Gerenciar acessos</strong><small>{activeMembership.role==="recruiter"||activeMembership.role==="admin"?"Somente as empresas vinculadas ao seu usuário.":"Usuários e permissões sob sua responsabilidade."}</small></span><ArrowRightOutlined/></button>:null}
    </PrismaCard><PrismaCard title="Acessos recentes">{recent.length?recent.slice(0,4).map(item=><button type="button" className="prisma-home-recent" key={item.path} onClick={()=>onNavigate(item.path)}><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRightOutlined/></button>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Os acessos desta sessão aparecerão aqui."/>}</PrismaCard></div>
    {loading?<PrismaCard><Skeleton active paragraph={{rows:2}}/></PrismaCard>:summary?<PrismaCard><div className="prisma-home-totals" aria-label="Resumo da empresa ativa"><button type="button" onClick={()=>onNavigate("/profiles")}><strong>{summary.peopleCount}</strong><span>Pessoas nesta empresa</span></button><button type="button" onClick={()=>onNavigate("/profiles/search")}><strong>{summary.structuredProfilesCount}</strong><span>Perfis publicados</span></button>{canManage?<button type="button" onClick={()=>onNavigate("/vacancies")}><strong>{summary.openVacanciesCount}</strong><span>Posições abertas</span></button>:<button type="button" onClick={()=>onNavigate("/tokens")}><strong>Tokens</strong><span>Consultar seu consumo</span></button>}</div></PrismaCard>:null}
    <div><Button type="link" onClick={()=>setHelp(true)}>Como o Prisma trabalha</Button></div>
    <Drawer open={help} title="Como o Prisma trabalha" onClose={()=>setHelp(false)} size="large">
      <h3>Decisão humana</h3><p>O Prisma organiza evidências, mas não decide contratações.</p>
      <h3>Origem preservada</h3><p>Cada informação permanece vinculada à sua fonte e versão.</p>
      <h3>Dados protegidos</h3><p>O acesso respeita a empresa ativa e o papel de cada usuário.</p>
      <h3>Estrutura de competências</h3><p>As competências são organizadas por grupos. Consulte a definição de cada grupo ao classificar uma informação. Fontes e versões podem ser consultadas na área Conhecimento pelos administradores autorizados.</p>
    </Drawer>
  </PrismaPage>;
}
