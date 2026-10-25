import assert from "node:assert/strict";
import test from "node:test";
import {readPositionOccupationalRecognition} from "../web/src/domain/positionOccupationalRecognition.js";
import {contextualOccupationalCandidates} from "../web/src/domain/occupationalContextReferences.js";
import type {OccupationalRagReview} from "../web/src/domain/occupationalRagReview.js";
const value={review:{id:"inbox",title:"Gerente de Estoque",status:"research_queued",context:{contract:"occupational-rag-1.0.0",responsibilities:"Controlar inventário."},proposal:null},candidates:[{id:"approved",label:"Gestor de Estoque",scope:"organization",description:"Controlar estoques.",version:1,sources:[]}]};
test("Position reads the scoped original queue without interpreting suggestion as decision",()=>{
 const result=readPositionOccupationalRecognition(value);assert.equal(result.review.status,"research_queued");assert.equal(result.candidates.length,0);assert.equal(result.review.proposal,null);
});

const stock={...value.candidates[0]!,id:"stock",label:"Gestor de armazém/Gestora de armazém",aliases:[]};
const pool=[stock,...["Gerente de almoxarifado","Planificador de produção na indústria do couro","Representante comercial","Representante comercial autônomo"].map((label,i)=>({...stock,id:"pool-"+i,label}))];
function review():OccupationalRagReview{return {id:"inbox",title:"Gerente de Estoque",status:"awaiting_human_review",errorCode:null,context:{contract:"occupational-rag-1.0.0",responsibilities:"Gestão do Estoque. Gestão de Equipe. Contato com fornecedores.",origin:{kind:"manual"},input_hash:"hash"},globalContribution:null,proposal:{id:"proposal",status:"awaiting_human_review",model:"fixture",decidedAt:null,edited:null,original:{contract:"occupational-rag-1.0.0",input_hash:"hash",proposed_concept:{canonical_label:"Gerente de Estoque",description:"Coordena estoque e equipe.",concept_type:"occupation"},aliases:[],rationale:"Gestão das operações do armazém e da equipe.",unresolved_questions:[],candidate_concepts:pool as never,rag:{decision:"alias",target_id:"stock",related_ids:["pool-2"],evidence:[{source_id:"context",quote:"Gestão de Equipe."}],method:"fixture"}}}};}
test("Gerente de Estoque offers only supported ESCO target; retrieval and relationships are not endorsements",()=>{
 const row=review(),before=structuredClone(row),result=readPositionOccupationalRecognition({review:row,candidates:pool});
 assert.deepEqual(result.candidates.map(c=>c.label),[stock.label]);assert.deepEqual(contextualOccupationalCandidates(row).map(c=>c.id),["stock"]);
 assert.deepEqual(row,before);assert.equal(row.proposal!.original.candidate_concepts.length,5);assert.equal(row.proposal!.edited,null);
});
test("ambiguous, new and insufficient interpretations cannot advertise raw candidates as matches",()=>{
 for(const decision of ["ambiguous","new_concept","insufficient"]){const row=review();row.proposal!.original.rag.decision=decision;assert.deepEqual(contextualOccupationalCandidates(row),[]);assert.equal(readPositionOccupationalRecognition({review:row,candidates:pool}).candidates.length,0);}
});
test("missing target, rationale, evidence or current proposal never falls back to retrieval pool",()=>{
 for(const change of [(r:OccupationalRagReview)=>{r.proposal!.original.rag.target_id="unknown";},(r:OccupationalRagReview)=>{r.proposal!.original.rationale=" ";},(r:OccupationalRagReview)=>{r.proposal!.original.rag.evidence=[];},(r:OccupationalRagReview)=>{r.proposal!.status="research_requested";},(r:OccupationalRagReview)=>{r.proposal=null;}]){const row=review();change(row);assert.deepEqual(contextualOccupationalCandidates(row),[]);}
});
test("human-approved target and explicit relations prevail in Knowledge; raw pool remains unchanged",()=>{
 const row=review();row.proposal!.status="approved";row.proposal!.edited={...row.proposal!.original,approved_target_id:"pool-0",approved_related_ids:[]};
 assert.deepEqual(contextualOccupationalCandidates(row).map(c=>c.id),["pool-0"]);
 row.proposal!.edited={...row.proposal!.original,approved_target_id:null,approved_related_ids:["pool-0"]};assert.deepEqual(contextualOccupationalCandidates(row).map(c=>c.id),["pool-0"]);
 assert.equal(row.proposal!.original.rag.target_id,"stock");
});
test("server-eligible human publication outside retrieval remains selectable without implicit association",()=>{
 const row=review();row.proposal!.status="approved";row.proposal!.edited={...row.proposal!.original,approved_target_id:null,approved_related_ids:[]};
 const published={...stock,id:"new",scope:"organization"};const before=structuredClone(row);
 assert.deepEqual(readPositionOccupationalRecognition({review:row,candidates:[published]}).candidates,[published]);assert.deepEqual(row,before);
});
test("malformed references, unknown context, missing versions and oversized candidates fail closed",()=>{
 for(const changed of [null,{}, {...value,review:{...value.review,context:{contract:"future",responsibilities:"X"}}}, {...value,candidates:[{...value.candidates[0],version:0}]}, {...value,candidates:[{...value.candidates[0],scope:"foreign"}]}, {...value,candidates:Array(17).fill(value.candidates[0])}, {...value,candidates:[{...value.candidates[0],sources:[{name:"ESCO"}]}]}])assert.throws(()=>readPositionOccupationalRecognition(changed));
});
