import assert from "node:assert/strict";
import test from "node:test";
import {filterFollowUp,followUpColumn,interviewInstant,type FollowUpEntry,type FollowUpFilters} from "../web/src/domain/positionFollowUp.js";
const filters:FollowUpFilters={search:"",stage:"",assignee:"",due:"",order:"name",closed:false};
const entries=[{id:"1",fullName:"Marina Costa",stage:"evaluating",details:{nextAction:"Conferir APIs",dueDate:"2026-10-07",assignee:"a"}},{id:"2",fullName:"Rafael Lima",stage:"awaiting_evaluation",details:{}},{id:"3",fullName:"Joana Alves",stage:"closed",details:{}}] as FollowUpEntry[];
test("lista/quadro filtram o mesmo conjunto sem inventar prazo ou responsável",()=>{
 assert.deepEqual(filterFollowUp(entries,filters,"2026-10-08").map(e=>e.id),["1","2"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,search:"APIs"},"2026-10-08").map(e=>e.id),["1"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,due:"missing",assignee:"missing"},"2026-10-08").map(e=>e.id),["2"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,due:"overdue"},"2026-10-08").map(e=>e.id),["1"]);
 assert.deepEqual(filterFollowUp(entries,{...filters,closed:true},"2026-10-08").map(e=>e.id),["3"]);
 assert.equal(followUpColumn("interview_scheduled"),"awaiting_interview");assert.equal(followUpColumn("decision_recorded"),"awaiting_decision");
});
test("agendamento interpreta fuso explícito e rejeita hora inexistente",()=>{
 assert.equal(interviewInstant("2026-10-15T14:00","America/Sao_Paulo"),"2026-10-15T17:00:00.000Z");
 assert.equal(interviewInstant("2026-10-15T14:00","UTC"),"2026-10-15T14:00:00.000Z");
 assert.throws(()=>interviewInstant("2026-03-08T02:30","America/New_York"),/não existe/);
 assert.throws(()=>interviewInstant("","UTC"),/Informe/);assert.throws(()=>interviewInstant("2026-10-15T14:00","invalid"));
});
