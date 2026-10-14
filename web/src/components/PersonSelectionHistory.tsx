import { useEffect, useState } from "react";
import { Alert, Button, Collapse, Empty, Modal, Skeleton, Space, Tag, Typography } from "antd";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { positionAssessmentService } from "../infrastructure/supabase/positionAssessmentService";
import { followUpStages, type FollowUpData } from "../domain/positionFollowUp";
import type { PersonSelectionHistory as HistoryData, PersonSelectionParticipation, PersonSelectionTest } from "../domain/personSelectionHistory";
import type { AssessmentAttempt, PositionAssessment } from "../domain/positionAssessmentData";
import { selectionResultLabel } from "../domain/selectionOutcome";
import { FollowUpHistory } from "./FollowUpHistory";
import { AssessmentAttemptResults, assessmentStateLabels } from "./AssessmentAttemptResults";
import { PrismaCard } from "../ui/PrismaCard";
import { ReadableRecord } from "../ui/ReadableRecord";
const message=(error:unknown)=>error instanceof Error?error.message:"Não foi possível consultar o histórico dos processos.";
const date=(value:string)=>new Date(value).toLocaleString("pt-BR");
type Props={organizationId:string;personId:string;onNavigate:(path:string)=>void};
export function PersonSelectionHistory({organizationId,personId,onNavigate}:Props){
 const [data,setData]=useState<HistoryData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const [test,setTest]=useState<{value:PersonSelectionTest;processId:string|null}|null>(null);
 useEffect(()=>{setOffset(0);setData(null);setTest(null);},[organizationId,personId]);
 useEffect(()=>{let current=true;setLoading(true);setError(null);
  void positionFollowUpService.historyForPerson(organizationId,personId,offset).then(result=>{if(current)setData(previous=>offset&&previous?.organizationId===organizationId&&previous.personId===personId?{...result,participations:[...new Map([...previous.participations,...result.participations].map(p=>[p.processId,p])).values()]}:result);}).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};
 },[organizationId,personId,offset,retry]);
 const current=data?.organizationId===organizationId&&data.personId===personId?data:null;
 return <PrismaCard title="Processos seletivos">
  {error?<Alert type="warning" showIcon title={error} action={<Button loading={loading} onClick={()=>setRetry(n=>n+1)}>Consultar histórico novamente</Button>}/>:null}
  {loading&&!current?<Skeleton active paragraph={{rows:3}}/>:current?<>
   {current.participations.length?<Collapse items={current.participations.map(p=>({key:p.processId,label:<div><strong>{p.title} · {p.processName}</strong><div><Tag color={p.processStatus==="closed"&&p.outcome?.selectedPersonId===personId?"green":"default"}>{selectionResultLabel(p.processStatus,p.outcome,personId)}</Tag><small>Participação desde {date(p.joinedAt)}{p.outcome?` · Encerrado em ${date(p.outcome.closedAt)}`:p.processStatus==="closed"?" · Processo encerrado":""}</small></div></div>,children:<ParticipationDetails {...{organizationId,personId,onNavigate}} participation={p} onTest={value=>setTest({value,processId:p.processId})}/>}))}/>:<Empty description="Nenhuma participação em processos seletivos nesta empresa."/>}
   {current.participations.length<current.total?<Button loading={loading} style={{marginTop:12}} onClick={()=>setOffset(current.participations.length)}>Carregar mais participações</Button>:null}
   {current.legacyTests.length?<Collapse style={{marginTop:16}} items={[{key:"legacy",label:`Avaliações individuais anteriores (${current.legacyTests.length})`,children:<><p>Registros preservados, sem vínculo comprovado com um ciclo de seleção.</p><TestList tests={current.legacyTests} onTest={value=>setTest({value,processId:null})}/></>}]}/>:null}
  </>:null}
  {test?<PersonTestResult key={`${organizationId}:${personId}:${test.value.id}`} organizationId={organizationId} personId={personId} test={test.value} processId={test.processId} onClose={()=>setTest(null)}/>:null}
 </PrismaCard>;
}
function ParticipationDetails({organizationId,personId,onNavigate,participation,onTest}:Props&{participation:PersonSelectionParticipation;onTest:(test:PersonSelectionTest)=>void}){
 const [data,setData]=useState<FollowUpData|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setData(null);setError(null);setLoading(true);
  void positionFollowUpService.load(organizationId,participation.vacancyId,participation.processId).then(result=>{if(result.process?.id!==participation.processId||!result.entries.some(e=>e.personId===personId))throw Error("Não foi possível confirmar esta participação. Atualize o histórico.");if(current)setData(result);}).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};
 },[organizationId,personId,participation.processId,participation.vacancyId,retry]);
 const entry=data?.entries.find(e=>e.personId===personId),process=data?.process;
 return <div>{error?<Alert type="warning" title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Consultar participação novamente</Button>}/>:null}
  {loading?<Skeleton active paragraph={{rows:2}}/>:entry&&process?<>
   <Space wrap><Tag>{selectionResultLabel(process.status,process.outcome,personId)}</Tag><span>Etapa registrada: {followUpStages[entry.stage]}</span><Button onClick={()=>onNavigate(`/vacancies/${participation.vacancyId}/follow-up/processes/${participation.processId}/${personId}`)}>Abrir participação no processo</Button></Space>
   {process.outcome?<p>Decisão final: {selectionResultLabel(process.status,process.outcome)} · {date(process.outcome.closedAt)} · {process.outcome.actor??"Responsável indisponível"}</p>:null}
   <h3>Atividades e registros da participação</h3>
   {entry.details.nextAction?<p>Próxima ação registrada: {entry.details.nextAction}</p>:null}
   {entry.details.assignee?<p>Responsável: {data?.operators.find(o=>o.id===entry.details.assignee)?.name??"Responsável indisponível"}</p>:null}
   {entry.details.dueDate?<p>Prazo registrado: {entry.details.dueDate}</p>:null}
   {entry.details.notes?<><h4>Anotações e perguntas internas</h4><Typography.Paragraph style={{whiteSpace:"pre-wrap"}}>{entry.details.notes}</Typography.Paragraph></>:null}
   {entry.details.interview?<><h4>Entrevista</h4><p>{entry.details.interview.status==="scheduled"?"Agendada":"Cancelada"} · {new Date(entry.details.interview.at).toLocaleString("pt-BR",{timeZone:entry.details.interview.timezone})} · {entry.details.interview.timezone} · {entry.details.interview.participants}</p></>:null}
   {entry.details.decision?<><h4>Decisão intermediária</h4><p>{entry.details.decision.outcome==="proceed"?"Prosseguir":"Não prosseguir neste processo"}</p><Typography.Paragraph style={{whiteSpace:"pre-wrap"}}>{entry.details.decision.rationale}</Typography.Paragraph></>:null}
   <details><summary>Consultar todos os campos do acompanhamento</summary><ReadableRecord value={entry.details}/></details>
   <h3>Testes e avaliações</h3><TestList tests={participation.tests} onTest={onTest}/>
   <h3>Histórico completo da participação</h3><FollowUpHistory history={data!.history.filter(h=>h.entryId===entry.id||h.entryId===null||["close_process","reopen_process"].includes(h.action))} operators={data!.operators}/>
  </>:null}</div>;
}
function TestList({tests,onTest}:{tests:PersonSelectionTest[];onTest:(test:PersonSelectionTest)=>void}){
 return tests.length?<div>{tests.map(t=>{const deadline=Math.min(t.expiresAt?Date.parse(t.expiresAt):Infinity,t.startedAt?Date.parse(t.startedAt)+t.durationMinutes*60000:Infinity),expired=["invited","started"].includes(t.status)&&Number.isFinite(deadline)&&Date.now()>=deadline;
  return <article key={`${t.id}:${t.attemptId??"draft"}`} style={{marginBottom:16}}><strong>{t.positionTitle} · Avaliação de {date(t.createdAt)}</strong><p>{expired?"Não realizada · prazo encerrado":assessmentStateLabels[t.status]??"Sem aplicação"}{t.total!==null&&t.correct!==null?` · ${t.correct}/${t.total} acertos`:""}</p>{t.submittedAt?<small>Concluída em {date(t.submittedAt)}</small>:null}<div><Button onClick={()=>onTest(t)}>Ver avaliação, respostas e resultado</Button></div></article>;
 })}</div>:<p>Nenhum teste ou avaliação registrado para esta participação.</p>;
}
function PersonTestResult({organizationId,personId,test,processId,onClose}:{organizationId:string;personId:string;test:PersonSelectionTest;processId:string|null;onClose:()=>void}){
 const [data,setData]=useState<{assessment:PositionAssessment;attempt:AssessmentAttempt|null;personName:string}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setData(null);setError(null);setLoading(true);
  void positionAssessmentService.load(organizationId,test.vacancyId,personId).then(result=>{const assessment=result.assessments.find(a=>a.id===test.id&&a.organization_id===organizationId&&a.vacancy_id===test.vacancyId&&(a.process_id??null)===processId),attempt=test.attemptId?result.attempts.find(t=>t.id===test.attemptId&&t.assessmentId===test.id):null;
   if(result.organizationId!==organizationId||result.personId!==personId||!assessment||(test.attemptId&&!attempt))throw Error("Não foi possível confirmar o vínculo desta avaliação. Atualize o histórico.");if(current)setData({assessment,attempt:attempt??null,personName:result.personName});
  }).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};
 },[organizationId,personId,test.id,test.attemptId,test.vacancyId,processId,retry]);
 return <Modal className="assessment-results-modal" open width={1000} title="Avaliação da participação · histórico" onCancel={onClose} footer={null}>{error?<Alert type="warning" title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Consultar avaliação novamente</Button>}/>:null}{loading?<Skeleton active/>:data?data.attempt?<AssessmentAttemptResults assessment={data.assessment} attempt={data.attempt} personName={data.personName} positionTitle={test.positionTitle} onRefresh={()=>setRetry(n=>n+1)}/>:<><p>Sem aplicação registrada para esta avaliação.</p><Collapse items={data.assessment.questions.map(q=>({key:q.id,label:q.stem,children:<>{q.options.map(o=><p key={o.id}>{o.label}</p>)}<p>Resposta correta: {q.correctOptionId} · {q.explanation}</p></>}))}/></>:null}</Modal>;
}
