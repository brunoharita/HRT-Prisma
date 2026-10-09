import {emptyVacancyDraft,matchVacancyCandidate,type VacancyDetail} from "../../../web/src/domain/vacancy.js";
import type {PublishedProfileCandidate} from "../../../web/src/domain/profileDiscovery.js";
import type {FollowUpData,FollowUpEntry} from "../../../web/src/domain/positionFollowUp.js";
export const uuid=(n:number)=>`22000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
export const scenario=new URLSearchParams(location.search).get("case")??"normal";
export const vacancy:VacancyDetail={...emptyVacancyDraft(),id:uuid(1),versionId:uuid(2),version:3,organizationId:uuid(3),title:"Coordenação de Operações",area:"Operações",jobRoleName:"",occupantName:null,createdAt:"",updatedAt:""};
export const candidates=[
 ["Rafael Lima","Analista de Operações",null,64,"awaiting_evaluation"],
 ["Marina Costa","Supervisora de Operações",32,78,"evaluating"],
 ["Joana Alves","Coordenadora de Logística",38,81,"interview_scheduled"],
 ["Pedro Santos","Gerente de Operações",41,76,"awaiting_decision"],
].map((row,i)=>({personId:uuid(10+i),fullName:row[0],profileId:uuid(20+i),profileVersion:2,lifecycle:"candidate",operationalStatus:"active",publishedAt:"2026-10-01",knowledge:[],location:null,
 profileData:{identity:{fullName:row[0]},contact:{},professionalTitle:row[1],experiences:[{id:"e1",role:row[1],description:"Gestão de operações",period:"2020 - 2025",organization:null}],education:[],competencies:[],languages:[],certifications:[],areasOfExpertise:["Operações"],keyResults:[],customSections:[],uncertainties:[],notIdentified:[]},_age:row[2],_score:row[3],_stage:row[4]})) as unknown as (PublishedProfileCandidate & {_age:number|null;_score:number;_stage:FollowUpEntry["stage"]})[];
export const matches=candidates.map(c=>{const m=matchVacancyCandidate(vacancy,c,null,[],[],"2026-10-01");return {...m,score:{...m.score,status:"definitive" as const,score:c._score,profileVersion:c.profileId,profileVersionNumber:2,positionVersion:vacancy.versionId,positionVersionNumber:3}};});
const data:FollowUpData={contract:"position-follow-up-1.0.0",process:{id:uuid(5),name:"Avaliação 01",status:"active",revision:1},operators:[{id:uuid(6),name:"Bruno"}],history:[],entries:candidates.map((c,i)=>({id:uuid(30+i),personId:c.personId,fullName:c.fullName,title:c.profileData.professionalTitle,age:c._age,city:"Bauru",state:"São Paulo",stage:c._stage,revision:1,details:i===2?{interview:{at:"2026-10-15T17:00:00Z",timezone:"America/Sao_Paulo",participants:"Joana e recrutador",status:"scheduled"}}:{},profileId:c.profileId,profileVersion:2,sourceProfileId:c.profileId,sourcePositionId:vacancy.versionId!,score:c._score,scoreState:"saved",scoreProfileId:c.profileId,scorePositionId:vacancy.versionId!,match:matches[i],evaluationId:uuid(40+i),profileData:c.profileData}))};
if(scenario==="empty"){data.entries=[];data.process=null;}
if(scenario==="missing"){data.entries[0]!.score=null;data.entries[0]!.scoreState="unavailable";data.entries[0]!.title=null;data.entries[0]!.match=null;data.entries[0]!.city=null;data.entries[0]!.state=null;}
if(scenario==="reference"){data.entries=data.entries.slice(0,2);Object.assign(data.entries[0]!,{fullName:"Bruno Harita Santos",title:"Executivo de Transformação & Tecnologia",score:56});Object.assign(data.entries[1]!,{fullName:"Diego Reis",title:"Título não informado",score:62});Object.assign((data.entries[0]!.match as typeof matches[number]).score,{status:"provisional"});}
if(scenario==="long"){Object.assign(data.entries[0]!,{fullName:"Maria da Silva Albuquerque de Vasconcelos e Souza",title:"Especialista sênior em desenvolvimento de sistemas e arquitetura de plataformas corporativas",city:"São José dos Campos",state:"SP",score:0});}
export const fixture={data,calls:[] as {name:string;args:Record<string,unknown>}[],fail:false,hold:false,conflict:false,delay:140,navigations:[] as string[]};
Object.assign(window,{__followUpFixture:fixture});
export const transport={async rpc(name:string,args:Record<string,any>){
 fixture.calls.push({name,args});while(fixture.hold)await new Promise(r=>setTimeout(r,30));await new Promise(r=>setTimeout(r,fixture.delay));
 if(scenario==="member")return {data:null,error:{code:"42501",message:"Denied"}};
 if(name==="get_position_follow_up")return {data:structuredClone(data),error:null};
 if(fixture.fail)return {data:null,error:{code:"50000",message:"Synthetic failure"}};
 if(fixture.conflict){fixture.conflict=false;return {data:null,error:{code:"40001",message:"Synthetic conflict"}};}
 let entry=data.entries.find(e=>e.personId===args.p_person_id);
 const payload=args.p_payload??{};
 if(args.p_action==="add"){
   if(!entry){const i=candidates.findIndex(c=>c.personId===args.p_person_id),c=candidates[i]!;entry={id:uuid(30+i),personId:c.personId,fullName:c.fullName,title:c.profileData.professionalTitle,age:c._age,city:"Bauru",state:"São Paulo",stage:"awaiting_evaluation",revision:1,details:{},profileId:c.profileId,profileVersion:2,sourceProfileId:c.profileId,sourcePositionId:vacancy.versionId!,score:c._score,scoreState:"saved",scoreProfileId:c.profileId,scorePositionId:vacancy.versionId!,match:matches[i],evaluationId:uuid(40+i),profileData:c.profileData};data.entries.push(entry);}
   if(!data.process)data.process={id:uuid(5),name:"Avaliação 01",status:"active",revision:1};
 }else if(args.p_action.endsWith("_process")){data.process!.status=args.p_action==="close_process"?"closed":"active";}
 else if(entry){
   if(args.p_expected_revision!==entry.revision)return {data:null,error:{code:"40001",message:"Conflict"}};
   if(args.p_action==="stage")entry.stage=payload.stage;
   if(args.p_action==="details")entry.details={...entry.details,...payload};
   if(args.p_action==="schedule"){entry.details.interview={...payload,status:"scheduled"};entry.stage="interview_scheduled";}
   if(args.p_action==="cancel_interview"){entry.details.interview!.status="cancelled";entry.stage="awaiting_interview";}
   if(args.p_action==="decision"){entry.details.decision=payload;entry.stage="decision_recorded";}
   if(args.p_action==="close")entry.stage="closed";
   if(args.p_action==="reopen")entry.stage="awaiting_evaluation";
   entry.revision++;
 }
 data.process!.revision++;data.history.unshift({id:uuid(100+data.history.length),entryId:entry?.id??null,action:args.p_action,actor:"Bruno",at:"2026-10-08T16:00:00Z",before:null,after:{stage:entry?.stage,details:entry?.details}});
 return {data:structuredClone(data),error:null};
}};
