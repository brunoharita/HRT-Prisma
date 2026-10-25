import {comparePositionScores,savedPositionScore} from "./positionAdherenceOrder.js";
import type {ProcessAssessmentWorkspace} from '../domain/processAssessmentData.js';
import type {FollowUpEntry} from '../domain/positionFollowUp.js';
import type {AssessmentAttempt} from '../domain/positionAssessmentData.js';

export function assessmentPerformance(attempt:AssessmentAttempt,assessmentId:string|undefined,questionCount:number):{correct:number;total:number;percent:number}|null {
  const result=attempt.result;
  if(attempt.assessmentId!==assessmentId||attempt.status!=='submitted'||!result||!Number.isSafeInteger(result.correct)||!Number.isSafeInteger(result.total)||result.total<=0||result.total!==questionCount||result.correct<0||result.correct>result.total)return null;
  return {correct:result.correct,total:result.total,percent:result.correct/result.total*100};
}

export function assessmentResultRows(workspace:ProcessAssessmentWorkspace,entries:FollowUpEntry[]=[]){
  const scores=new Map(entries.map(e=>[e.personId,savedAssessmentPrismaScore(e,workspace.positionVersionId)?.value]));
  const names=new Map(workspace.candidates.map(candidate=>[candidate.personId,candidate.name]));
  return workspace.attempts.map(attempt=>({attempt,name:names.get(attempt.personId)??'Pessoa',performance:assessmentPerformance(attempt,workspace.assessment?.id,workspace.assessment?.questions.length??0)}))
    .sort((a,b)=>comparePositionScores(scores.get(a.attempt.personId),scores.get(b.attempt.personId))||(a.performance&&b.performance?(b.performance.correct*a.performance.total-a.performance.correct*b.performance.total)||a.name.localeCompare(b.name,'pt-BR')||a.attempt.id.localeCompare(b.attempt.id):a.performance?-1:b.performance?1:a.name.localeCompare(b.name,'pt-BR')||a.attempt.id.localeCompare(b.attempt.id)));
}

export function savedAssessmentPrismaScore(entry:FollowUpEntry|undefined,positionVersionId:string):{value:number;notices:string[]}|null {
  const value=entry?savedPositionScore(entry.score,entry.scoreState):null;
  if(!entry||value===null)return null;
  const notices:string[]=[];
  if(entry.scoreState==='updating')notices.push('Atualizando · nota anterior preservada');
  if(entry.scoreState==='update_failed')notices.push('Atualização não concluída · nota preservada');
  const match=entry.match as {score?:{status?:string}}|null;
  if(match?.score?.status==='provisional')notices.push('Provisória · consulte a cobertura');
  if(!entry.scoreProfileId||!entry.scorePositionId)notices.push('Versões da nota indisponíveis');
  else if(entry.profileId!==entry.scoreProfileId||positionVersionId!==entry.scorePositionId)notices.push('Nota vinculada a outra versão de Perfil ou Posição');
  return {value,notices};
}

export function orderAssessmentCandidates(workspace:ProcessAssessmentWorkspace,entries:FollowUpEntry[]){const scores=new Map(entries.map(e=>[e.personId,savedAssessmentPrismaScore(e,workspace.positionVersionId)?.value]));return [...workspace.candidates].sort((a,b)=>comparePositionScores(scores.get(a.personId),scores.get(b.personId))||a.name.localeCompare(b.name,"pt-BR")||a.personId.localeCompare(b.personId));}
