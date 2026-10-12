import {interviewInstant} from "./positionFollowUp.js";
import type {AssessmentAttempt} from "./positionAssessmentData.js";
export const ASSESSMENT_TIMEZONE="America/Sao_Paulo";
export const invitationDays=[1,3,7,14,30] as const;
export function invitationDay(now=Date.now(),days=0):string {
 const date=new Intl.DateTimeFormat("sv-SE",{timeZone:ASSESSMENT_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const calendar=new Date(`${date}T12:00:00Z`);calendar.setUTCDate(calendar.getUTCDate()+days);return calendar.toISOString().slice(0,10);
}
export function invitationDeadline(day:string):string {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(`${day}T00:00:00Z`))||new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)!==day)throw Error("Escolha uma data válida para o prazo.");
 return new Date(Date.parse(interviewInstant(`${day}T23:59`,ASSESSMENT_TIMEZONE))+59_999).toISOString();
}
export function invitationDeadlineValid(day:string,now=Date.now()):boolean {try{const at=Date.parse(invitationDeadline(day));return at>now&&at<=now+90*86_400_000;}catch{return false;}}
export function invitationDateLabel(day:string):string {try{return new Date(invitationDeadline(day)).toLocaleDateString("pt-BR",{timeZone:ASSESSMENT_TIMEZONE});}catch{return "Data indisponível";}}
export function defaultAssessmentMessage(positionTitle:string):string {return `Você foi convidado(a) para uma avaliação do processo seletivo para a Posição “${positionTitle}”. Acesse seu link pessoal, confira as instruções e conclua o envio das respostas dentro do prazo.`;}
export function attemptDeadline(attempt:Pick<AssessmentAttempt,"expiresAt"|"startedAt">,durationMinutes:number|undefined):number {
 const expires=Date.parse(attempt.expiresAt),started=attempt.startedAt?Date.parse(attempt.startedAt):NaN;
 return Number.isFinite(started)&&typeof durationMinutes==="number"&&Number.isFinite(durationMinutes)&&durationMinutes>0?Math.min(expires,started+durationMinutes*60_000):expires;
}
export function attemptPresentationStatus(attempt:Pick<AssessmentAttempt,"status"|"expiresAt"|"startedAt">,durationMinutes:number|undefined,now=Date.now()):string {return ["invited","started"].includes(attempt.status)&&now>=attemptDeadline(attempt,durationMinutes)?"not_performed":attempt.status;}
