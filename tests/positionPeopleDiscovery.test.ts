import assert from "node:assert/strict";
import test from "node:test";
import {emptyVacancyDraft,matchVacancyCandidate,newVacancyRequirement,type VacancyDetail} from "../web/src/domain/vacancy.js";
import type {PublishedProfileCandidate} from "../web/src/domain/profileDiscovery.js";
import {positionPeopleDisposition,projectPositionPeople,sortPositionMatches} from "../web/src/domain/positionPeopleDiscovery.js";
import {comparePositionScores} from "../web/src/shared/positionAdherenceOrder.js";
import {MATCHING_SCORE_CONTRACT_VERSION} from "../web/src/domain/matchingScore.js";

const position:VacancyDetail={...emptyVacancyDraft(),id:"v",versionId:"v1",version:1,organizationId:"org",title:"Gerente de Estoque",area:"Logística",experiencePolicy:"required",responsibilities:["Gestão do Estoque","Gestão de Equipe","Contato com fornecedores"],requirements:[{...newVacancyRequirement("Comunicação"),importance:"required",importanceConfirmed:true}],createdAt:"",updatedAt:"",jobRoleName:"",occupantName:null};
function candidate(name:string,role:string,description:string):PublishedProfileCandidate{return {personId:name,profileId:name+"-p1",profileVersion:1,fullName:name,lifecycle:"candidate",operationalStatus:"active",location:null,publishedAt:"",knowledge:[],profileData:{identity:{fullName:name},contact:{email:null,phone:null,linkedin:null,city:null,state:null},professionalTitle:role,summary:null,professionalObjective:null,keyResults:[],areasOfExpertise:[],experiences:[{id:"e1",role,description,evidenceText:"",organization:"Empresa sintética",period:"2020 - 2025",page:null,source:"human"}],education:[],competencies:["Comunicação"],certifications:[],languages:[],customSections:[],uncertainties:[],notIdentified:[]}};}
const match=(person:PublishedProfileCandidate,v=position)=>matchVacancyCandidate(v,person,null,[],[],"2026-10-25");
const beatriz=()=>match(candidate("Beatriz (fixture sintética)","Analista de Marketing","Planejamento de campanhas e comunicação com clientes."));
const willian=()=>match(candidate("Willian (fixture sintética)","Coordenador de Planejamento e Controle","Coordenação de planejamento e controle de estoque com inventários periódicos."));

test("Beatriz-style generic communication does not admit a person; Willian-style performed inventory work does",()=>{
 const b=beatriz(),w=willian(),before=structuredClone([b,w]);
 assert.equal(b.requirements[0]?.status,"met");assert.equal(positionPeopleDisposition(position,b),"not_recommended");
 assert.equal(positionPeopleDisposition(position,w),"recommended");assert.equal(w.discoveryGroup,"related_area");
 assert.equal(w.functionAssessment.seniorityRelation,before[1]!.functionAssessment.seniorityRelation);
 assert.equal(w.score.scoreContractVersion,MATCHING_SCORE_CONTRACT_VERSION);
 const projected=projectPositionPeople(position,[b,w]);assert.equal(projected.recommended[0]?.candidate.personId,w.candidate.personId);assert.equal(projected.omitted,1);
 assert.deepEqual([b,w],before);
});
test("SAP, a declared broad area, selling stock software and insufficient content are not professional discovery",()=>{
 for(const text of ["Utilizei SAP na emissão de notas fiscais.","Gestão de equipe e contato com fornecedores.","Vendi software de gestão de estoque.",""]){const c=candidate("Sinais","Analista financeiro",text);c.profileData.areasOfExpertise=["Logística"];assert.equal(positionPeopleDisposition(position,match(c)),"not_recommended");}
});
test("the general gate retains another profession and does not blacklist Communication",()=>{
 const direct=match(candidate("Direta","Gerente de Estoque","Gestão do estoque."));assert.equal(positionPeopleDisposition(position,direct),"recommended");
 const declaration=match({...candidate("Declarada","Analista de Marketing","Campanhas."),profileData:{...candidate("Declarada","Analista de Marketing","Campanhas.").profileData,professionalTitle:"Gerente de Estoque"}});assert.equal(positionPeopleDisposition(position,declaration),"not_recommended");
 const marketing={...position,title:"Analista de Marketing",area:"Marketing",responsibilities:["Planejamento de campanhas"]};
 assert.equal(positionPeopleDisposition(marketing,match(candidate("Pessoa","Executivo de contas","Planejamento de marketing e controle de campanhas."),marketing)),"recommended");
 const communication={...position,title:"Analista de Comunicação",area:"Comunicação",responsibilities:["Planejamento de comunicação"]};
 assert.equal(positionPeopleDisposition(communication,match(candidate("Pessoa","Analista de Comunicação","Planejamento de comunicação institucional."),communication)),"recommended");
});
test("uncertain professional activity is separated individually and does not admit generic neighbours",()=>{
 const uncertain=match(candidate("Dúvida","Analista de operações","Atuação integrada com estoque e outras áreas. Utilizei SAP."));
 assert.equal(positionPeopleDisposition(position,uncertain),"review");
 const result=projectPositionPeople(position,[uncertain,beatriz()]);assert.equal(result.review.length,1);assert.equal(result.recommended.length,0);assert.equal(result.omitted,1);
});
test("explicit human confirmation or process inclusion is preserved without inventing recommendation or changing history",()=>{
 const b=beatriz(),original=structuredClone(b);assert.equal(positionPeopleDisposition(position,b,true),"human");
 b.positionDecision="confirmed";assert.equal(positionPeopleDisposition(position,b),"human");assert.equal(b.score.score,original.score.score);
 b.positionDecision="dismissed";assert.equal(positionPeopleDisposition(position,b,true),"not_recommended");
});
test("entry must be explicitly allowed and supported by material relevant to the work",()=>{
 const entry={...position,title:"Assistente de Estoque",experiencePolicy:"not_required" as const},m=beatriz();
 m.trajectoryAssessment={relation:"entry_potential",entryLevelVacancy:true,evidence:[{label:"Projeto de controle de estoque",fieldPath:"customSections.project.items.0",source:"Projeto publicado"}],explanation:"Potencial para revisão"};
 assert.equal(positionPeopleDisposition(entry,m),"recommended");assert.equal(positionPeopleDisposition({...entry,experiencePolicy:"required"},m),"not_recommended");
 m.trajectoryAssessment.evidence=[{label:"Comunicação",fieldPath:"competencies.0",source:"Competência"}];assert.equal(positionPeopleDisposition(entry,m),"not_recommended");
});
test("global score order puts a stronger related trajectory before a direct one; provisional and unavailable remain explicit",()=>{
 const a=willian(),b=willian(),c=beatriz();a.candidate.personId="A";b.candidate.personId="B";a.discoveryGroup="main_area";b.discoveryGroup="related_area";a.score={...a.score,score:40,status:"definitive"};b.score={...b.score,score:80,status:"provisional"};
 const original=structuredClone([a,b,c]);assert.deepEqual(sortPositionMatches([a,c,b]).map(m=>m.candidate.personId),["B","A",c.candidate.personId]);assert.deepEqual([a,b,c],original);
 assert(comparePositionScores(null,0)>0);assert(comparePositionScores(NaN,25)>0);assert.equal(comparePositionScores(null,undefined),0);
});
