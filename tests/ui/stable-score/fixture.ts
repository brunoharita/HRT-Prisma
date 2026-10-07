import {emptyVacancyDraft,matchVacancyCandidate,type VacancyDetail} from "../../../web/src/domain/vacancy.js";
import type {PublishedProfileCandidate} from "../../../web/src/domain/profileDiscovery.js";
const uuid=(n:number)=>`10000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
export const scenario=new URLSearchParams(location.search).get("case")??"normal";
export const vacancy:VacancyDetail={...emptyVacancyDraft(),id:uuid(1),versionId:uuid(2),version:1,organizationId:uuid(3),title:"Desenvolvedor backend",area:"Tecnologia",jobRoleName:"",occupantName:null,createdAt:"",updatedAt:""};
export const candidates=[4,5].map((n)=>({personId:uuid(n),fullName:n===4?"Pessoa Alfa":"Pessoa Beta",profileId:uuid(n+2),profileVersion:1,lifecycle:"candidate",operationalStatus:"active",publishedAt:"2026-10-01",knowledge:[],location:null,
 profileData:{identity:{fullName:n===4?"Pessoa Alfa":"Pessoa Beta"},contact:{},professionalTitle:"Desenvolvedor backend",experiences:[{id:"e1",role:"Desenvolvedor backend",description:"Desenvolvimento de APIs",period:"2020 - 2025",organization:null}],education:[],competencies:[],languages:[],certifications:[],areasOfExpertise:["Tecnologia"],keyResults:[],customSections:[],uncertainties:[],notIdentified:[]}})) as unknown as PublishedProfileCandidate[];
const records=candidates.map((candidate,i)=>{const {candidate:_identity,...match}=matchVacancyCandidate(vacancy,candidate,null,[],[],"2026-10-01");match.score={...match.score,status:"provisional",score:i===0?73:61};return {state:"current",evaluationId:uuid(i+10),calculatedAt:"2026-10-01T10:00:00Z",match};});
records[0]!.match.semanticFallback={status:"indeterminate",reasonCode:"READINGS_DISAGREE"};
export const fixture={calls:[] as {operation:string;profileId:string}[],saves:0,fail:false};
Object.assign(window,{__stableFixture:fixture});
export const transport={functions:{async invoke(_name:string,{body}:{body:{operation:string;profileId:string}}){fixture.calls.push(body);await new Promise(r=>setTimeout(r,150));const i=candidates.findIndex(c=>c.profileId===body.profileId);if(i<0)throw Error("Unexpected profile");
 if(scenario==="partial"&&i===0)return {data:null,error:Error("Synthetic unavailable")};
 if(body.operation==="recalculate"){
  if(fixture.fail)return {data:{...records[i],state:"update_failed"},error:null};
  records[i]!.match.score={...records[i]!.match.score,score:82};records[i]!.evaluationId=uuid(i+30);
 }
 return {data:structuredClone(records[i]),error:null};}}};
export async function loadPublishedProfileCandidateCollection(){return {candidates,analyzedProfileCount:2,publishedProfileCount:2,queriedProfileRecordCount:2,expectedProfileRecordCount:2,complete:true};}
export async function loadPublishedProfileCandidates(_org:string,_private:boolean,ids:string[]){return candidates.filter(c=>ids.includes(c.personId));}
export const review={async loadTrajectoryReview(){return {status:"review_pending",analysisId:uuid(20),conflictCount:1,conflicts:[{id:"e1",kind:"experience",fieldPath:"experiences.0",text:"Desenvolvimento de APIs",first:{activity:"direct_function",quote:"Desenvolvimento de APIs"},second:{activity:"related_function",quote:"Desenvolvimento de APIs"}}]};},
 async saveTrajectoryReview(){fixture.saves++;records[0]!.match.score={...records[0]!.match.score,score:78};records[0]!.evaluationId=uuid(21);delete records[0]!.match.semanticFallback;return "resolved";}};
