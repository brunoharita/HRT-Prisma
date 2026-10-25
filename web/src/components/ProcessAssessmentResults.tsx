import {useEffect,useState} from 'react';
import {Button,Space,Table,Tag} from 'antd';
import {PrismaCard} from '../ui/PrismaCard';
import {useProcessCandidateScores,type ProcessCandidateScores} from "../ui/useProcessCandidateScores";
import {assessmentResultRows,savedAssessmentPrismaScore} from '../shared/processAssessmentResults';
import {attemptPresentationStatus} from '../domain/assessmentInvitations';
import type {ProcessAssessmentWorkspace} from '../domain/processAssessmentData';
import type {FollowUpEntry} from '../domain/positionFollowUp';
import {assessmentStateLabels as states} from './AssessmentAttemptResults';

type Attempt=ProcessAssessmentWorkspace['attempts'][number];
const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
export function ProcessAssessmentResults({workspace,now,busy,readOnly,onResult,onCancel,onDispatch,savedScores}:{workspace:ProcessAssessmentWorkspace;now:number;busy:boolean;readOnly:boolean;onResult:(personId:string)=>void;onCancel:(attempt:Attempt)=>void;onDispatch:(deliveryId:string)=>void;savedScores?:ProcessCandidateScores}){
  const ownScores=useProcessCandidateScores(workspace,!savedScores),scores=savedScores??ownScores;
  const rows=assessmentResultRows(workspace,scores.entries),scoreState=scores.state;
  const scoreEntries=new Map(scores.entries.map(entry=>[entry.personId,entry]));
  const completed=rows.filter(row=>row.performance!==null).length;
  function prisma(personId:string){
    const score=savedAssessmentPrismaScore(scoreEntries.get(personId),workspace.positionVersionId);
    return <div className="process-result-metric"><span className="process-result-metric-label">Nota Prisma</span>{score?<><strong>{number.format(score.value)}<small> / 100</small></strong>{score.notices.map(notice=><small key={notice}>{notice}</small>)}</>:<><strong className="process-result-unavailable">{scoreState==='loading'?'Consultando…':'Indisponível'}</strong><small>{scoreState==='error'?'Consulta não concluída. Use Atualizar para tentar novamente.':scoreState==='ready'?'Sem nota salva disponível.':'Consultando a nota salva.'}</small></>}</div>;
  }
  function performance(row:typeof rows[number]){
    return <div className="process-result-metric"><span className="process-result-metric-label">Desempenho na avaliação</span>{row.performance?<><strong>{number.format(row.performance.percent)}<small>%</small></strong><small>{row.performance.correct} de {row.performance.total} acertos</small><div className="process-result-meter" aria-hidden="true"><span style={{width:`${row.performance.percent}%`}} /></div></>:<><strong className="process-result-unavailable">{row.attempt.status==='submitted'?'Indisponível':'Sem resultado'}</strong><small>{row.attempt.status==='submitted'?'Resultado não disponível para esta aplicação.':'Sem resultado concluído.'}</small></>}</div>;
  }
  function status(attempt:Attempt){
    const status=attemptPresentationStatus(attempt,workspace.assessment?.config.durationMinutes,now);
    return <div className="process-result-status"><Tag>{states[status]??'Estado indisponível'}</Tag>{attempt.deliveries.length?<details className="process-result-deliveries"><summary>Envio do convite</summary>{attempt.deliveries.map(delivery=><div key={delivery.id}><Tag>{states[delivery.state]??'Estado indisponível'}</Tag>{delivery.providerEmailId?<small>Aceitação pelo provedor; entrega e abertura não verificadas.</small>:null}{['failed','queued','sending'].includes(delivery.state)&&!readOnly?<Button disabled={busy} onClick={()=>onDispatch(delivery.id)}>Retomar envio</Button>:null}</div>)}</details>:null}</div>;
  }
  function actions(attempt:Attempt){return <Space wrap><Button type="link" onClick={()=>onResult(attempt.personId)}>Ver resultado e atividade</Button>{!readOnly&&!['submitted','cancelled'].includes(attempt.status)?<Button disabled={busy} onClick={()=>onCancel(attempt)}>Cancelar aplicação</Button>:null}</Space>;}
  return <PrismaCard title="Aplicações e resultados individuais" className="process-results-card">
    <div className="process-results-overview"><div><span>Candidatos</span><strong>{rows.length}</strong></div><div><span>Com resultado</span><strong>{completed}</strong></div><div><span>Sem resultado</span><strong>{rows.length-completed}</strong></div></div>
    <p className="process-results-order" role="status">{scoreState==="loading"?"Consultando notas salvas para ordenar por aderência…":scoreState==="error"?"Notas indisponíveis nesta consulta; ordem pelo desempenho da avaliação e nome.":"Maior Nota Prisma salva primeiro · notas indisponíveis ao final · desempate pelo desempenho na avaliação e nome."}</p>
    <p className="process-results-context">Nota Prisma e acertos da avaliação são medidas independentes. A decisão permanece com o recrutador.</p>
    <div className="process-results-desktop"><Table rowKey={row=>row.attempt.id} pagination={false} dataSource={rows} columns={[
      {title:'Pessoa',width:'20%',render:(_,row)=><strong className="process-result-name">{row.name}</strong>},
      {title:'Nota Prisma ↓',width:'17%',render:(_,row)=>prisma(row.attempt.personId)},
      {title:'Desempenho na avaliação',width:'22%',render:(_,row)=>performance(row)},
      {title:'Estado',width:'18%',render:(_,row)=>status(row.attempt)},
      {title:'Ações',render:(_,row)=>actions(row.attempt)},
    ]}/></div>
    <div className="process-results-mobile" aria-label="Resultados por candidato">{rows.map(row=><article key={row.attempt.id} className="process-result-person"><h3>{row.name}</h3><div className="process-result-metrics">{prisma(row.attempt.personId)}{performance(row)}</div>{status(row.attempt)}<div className="process-result-actions">{actions(row.attempt)}</div></article>)}</div>
  </PrismaCard>;
}
