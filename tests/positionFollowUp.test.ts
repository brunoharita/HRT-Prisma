import assert from "node:assert/strict";
import test from "node:test";
import {filterFollowUp,followUpLocation,followUpColumn,followUpColumns,followUpStages,followUpStageAction,followUpProcessName,interviewInstant,type FollowUpEntry,type FollowUpFilters} from "../web/src/domain/positionFollowUp.js";
const filters:FollowUpFilters={search:"",stage:"",assignee:"",due:"",order:"name",closed:false};
const entries=[{id:"1",fullName:"Marina Costa",stage:"evaluating",details:{nextAction:"Conferir APIs",dueDate:"2026-10-07",assignee:"a"}},{id:"2",fullName:"Rafael Lima",stage:"awaiting_evaluation",details:{}},{id:"3",fullName:"Joana Alves",stage:"closed",details:{}}] as FollowUpEntry[];
test("lista/quadro filtram o mesmo conjunto sem inventar prazo ou responsável",()=>{
 assert.deepEqual(filterFollowUp(entries,filters,"2026-10-08").map(e=>e.id),["1","2"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,search:"APIs"},"2026-10-08").map(e=>e.id),["1"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,due:"missing",assignee:"missing"},"2026-10-08").map(e=>e.id),["2"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,due:"overdue"},"2026-10-08").map(e=>e.id),["1"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,closed:true},"2026-10-08").map(e=>e.id),["3"]);
 assert.equal(followUpColumn("interview_scheduled"),"interview_scheduled");assert.equal(followUpColumn("decision_recorded"),"decision_recorded");
});
test("etapas antigas convergem sem alterar fatos, scores ou histórico e filtros antigos permanecem úteis",()=>{
 const before=JSON.stringify(entries);
 for(const stage of ["evaluating","awaiting_evaluation"]){
  assert.equal(followUpColumn(stage as FollowUpEntry["stage"]),"awaiting_evaluation");
  assert.deepEqual(filterFollowUp(entries,{...filters,stage},"2026-10-08").map(e=>e.id),["1","2"]);
  assert.equal(followUpStages[stage as FollowUpEntry["stage"]],"Selecionadas para acompanhamento");
 }
 assert.equal(JSON.stringify(entries),before);
 assert.deepEqual(followUpColumns.map(c=>c.key),["awaiting_evaluation","awaiting_interview","interview_scheduled","awaiting_decision","decision_recorded"]);
 const stages=[{...entries[0]!,stage:"awaiting_interview"},{...entries[1]!,stage:"interview_scheduled"}] as FollowUpEntry[];
 assert.deepEqual(filterFollowUp(stages,{...filters,stage:"interview_scheduled"},"2026-10-08").map(e=>e.id),["2"]);
});
test("etapas factuais exigem ação específica, sem mudança genérica de etapa",()=>{
 assert.equal(followUpStageAction("interview_scheduled"),"schedule");
 assert.equal(followUpStageAction("decision_recorded"),"decision");
 for(const c of followUpColumns.filter(c=>!["interview_scheduled","decision_recorded"].includes(c.key)))assert.equal(followUpStageAction(c.key),"stage");
});
test("nome automático do processo descreve acompanhamento e preserva nomes próprios",()=>{
 assert.equal(followUpProcessName("Avaliação 01"),"Acompanhamento 01");
 assert.equal(followUpProcessName("Avaliação técnica backend"),"Avaliação técnica backend");
});
test("agendamento interpreta fuso explícito e rejeita hora inexistente",()=>{
 assert.equal(interviewInstant("2026-10-15T14:00","America/Sao_Paulo"),"2026-10-15T17:00:00.000Z");
 assert.equal(interviewInstant("2026-10-15T14:00","UTC"),"2026-10-15T14:00:00.000Z");
 assert.throws(()=>interviewInstant("2026-03-08T02:30","America/New_York"),/não existe/);
 assert.throws(()=>interviewInstant("","UTC"),/Informe/);assert.throws(()=>interviewInstant("2026-10-15T14:00","invalid"));
});

test("localização atual exibe UF sem inferir ausências ou estados desconhecidos",()=>{
 assert.equal(followUpLocation({city:" Bauru ",state:" São Paulo "}),"Bauru - SP");
 assert.equal(followUpLocation({city:"Bauru",state:"sp"}),"Bauru - SP");
 assert.equal(followUpLocation({city:"Bauru",state:null}),"Bauru · UF não informada");
 assert.equal(followUpLocation({city:null,state:"Ceará"}),"Cidade não informada - CE");
 assert.equal(followUpLocation({city:"Paris",state:"Île-de-France"}),"Paris - Île-de-France");
 assert.equal(followUpLocation({city:" ",state:null}),"Localização não informada");
});
