import {Alert,Empty,Table,Tag,Tabs} from 'antd';
import {useState} from 'react';
import {AssessmentActivity} from './AssessmentActivity';
import {ASSESSMENT_TIMEZONE,attemptDeadline,attemptPresentationStatus} from '../domain/assessmentInvitations';
import {useAssessmentDeadline} from '../ui/useAssessmentDeadline';
import type {AssessmentAttempt,AssessmentQuestion,PositionAssessment} from '../domain/positionAssessmentData';
export const assessmentStateLabels:Record<string,string>={draft:'Rascunho',ready:'Revisado',issued:'Prova fixada',cancelled:'Cancelado',invited:'Aguardando início',started:'Em andamento',submitted:'Concluído',not_performed:'Não realizada · prazo encerrado',queued:'Na fila',sending:'Enviando',sent:'Aceito pelo provedor',failed:'Falhou',reconciliation_required:'Requer conciliação'};
export function AssessmentAttemptResults({assessment,attempt}:{assessment:PositionAssessment;attempt:AssessmentAttempt|null}) {
 const [tab,setTab]=useState('summary');const now=useAssessmentDeadline(attempt&&['invited','started'].includes(attempt.status)?[attemptDeadline(attempt,assessment.config.durationMinutes)]:[]);if(!attempt)return <Empty description="Nenhuma aplicação emitida." />;
 const status=attemptPresentationStatus(attempt,assessment.config.durationMinutes,now);
 return <><Tag>{assessmentStateLabels[status]??status}</Tag><Tabs activeKey={tab} onChange={setTab} items={[{key:'summary',label:'Resumo'},{key:'answers',label:'Questões e respostas'},{key:'activity',label:'Atividade por questão'}]} />
 {tab==='summary'?<><p>{attempt.result?`${attempt.result.correct} / ${attempt.result.total} respostas corretas`:status==='not_performed'?'A avaliação não foi concluída dentro do prazo. As respostas sincronizadas permanecem no histórico.':'Resultado disponível após a submissão completa.'}</p><p>Resultado separado do Prisma Score.</p>{attempt.result?.requirements.map(r=><p key={r.id}>{r.label}: {r.correct} / {r.total}</p>)}<p>Prazo de acesso (Brasília): {new Date(attempt.expiresAt).toLocaleString('pt-BR',{timeZone:ASSESSMENT_TIMEZONE,dateStyle:'short',timeStyle:'short'})}</p>{attempt.submittedAt?<p>Concluída em {new Date(attempt.submittedAt).toLocaleString('pt-BR')}</p>:null}</>:null}
 {tab==='answers'?<Table rowKey="id" scroll={{x:500}} pagination={{pageSize:5,showSizeChanger:false}} dataSource={assessment.questions} columns={[{title:'Questão',render:(_,q:AssessmentQuestion)=><details><summary>{q.stem}</summary>{q.options.map(o=><p key={o.id}>{o.id} · {o.label}</p>)}<p>{q.explanation}</p><p>{q.source==='bank'?'Banco':'IA'} · versão {q.version} · método {q.provenance.method}</p></details>},{title:'Resposta',render:(_,q:AssessmentQuestion)=>attempt.answers[q.id]??'Sem resposta'},{title:'Correta',dataIndex:'correctOptionId'}]} />:null}
 {tab==='activity'?<AssessmentActivity assessment={assessment} attempt={attempt}/>:null}
 </>;
}
