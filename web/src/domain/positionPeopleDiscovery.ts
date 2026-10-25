import {comparePositionScores} from "../shared/positionAdherenceOrder.js";
import type {VacancyCandidateMatch,VacancyDetail,VacancyMatchEvidence} from "./vacancy.js";
import {sortVacancyMatches} from "./vacancy.js";

export const POSITION_PEOPLE_DISCOVERY_VERSION="position-people-discovery-1.0.0";
export type PositionPeopleDisposition="recommended"|"review"|"human"|"not_recommended";
const professional=(item:VacancyMatchEvidence)=>/^experiences(?:[.\[]|$)/.test(item.fieldPath??"")||/^experience:/.test(item.sourceId??"");
const normalized=(text:string)=>text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().trim();
function supportedProfessionalEvidence(match:VacancyCandidateMatch,item:VacancyMatchEvidence):boolean {
 if(professional(item))return true;
 // The resolver can cite the declared title first when an identical experience title
 // exists. Corroborate the attribution; never admit a declared title by itself.
 return item.fieldPath==="professionalTitle"&&Boolean(item.label.trim())&&Boolean(match.candidate.profileData?.experiences.some(exp=>normalized(exp.role??"")===normalized(item.label)));
}

export function positionPeopleDisposition(vacancy:VacancyDetail,match:VacancyCandidateMatch,manuallyIncluded=false):PositionPeopleDisposition {
 if(match.positionDecision==="dismissed")return "not_recommended";
 const trajectory=match.trajectoryAssessment;
 if(["direct","related"].includes(trajectory.relation)&&trajectory.evidence.some(item=>supportedProfessionalEvidence(match,item)))return "recommended";
 if(vacancy.experiencePolicy==="not_required"&&trajectory.relation==="entry_potential"&&trajectory.evidence.some(item=>
   /^(?:education|projects|customSections)(?:[.\[:]|$)/.test(item.fieldPath??item.sourceId??"")&&hasPositionCoreEvidence(vacancy,item.label)))return "recommended";
 if(match.positionDecision==="confirmed"||manuallyIncluded)return "human";
 if(trajectory.reviewRequired&&trajectory.activityEvidence?.some(professional))return "review";
 if(match.positionRelation.status==="possible_title_relation"&&match.positionRelation.evidence.some(professional))return "review";
 return "not_recommended";
}

export function projectPositionPeople(vacancy:VacancyDetail,matches:VacancyCandidateMatch[],manualIds:ReadonlySet<string>=new Set()){
 const groups:{recommended:VacancyCandidateMatch[];review:VacancyCandidateMatch[];human:VacancyCandidateMatch[];omitted:number}={recommended:[],review:[],human:[],omitted:0};
 for(const match of sortPositionMatches(matches)){
  const disposition=positionPeopleDisposition(vacancy,match,manualIds.has(match.candidate.personId));
  if(disposition==="not_recommended")groups.omitted++;else groups[disposition].push(match);
 }
 return groups;
}

export function sortPositionMatches(matches:VacancyCandidateMatch[]):VacancyCandidateMatch[]{
 return sortVacancyMatches(matches).sort((a,b)=>comparePositionScores(a.score.score,b.score.score));
}
// Conservative lexical support for entry materials; semantic cross-language interpretation
// can already provide grounded entry evidence. Neither path creates an occupational alias.
function hasPositionCoreEvidence(vacancy:VacancyDetail,text:string):boolean {
 const normalize=(value:string)=>value.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const generic=new Set(["de","da","do","das","dos","e","em","of","and","in","the","junior","jr","senior","sr","pleno","auxiliar","assistente","estagiario","estagio","aprendiz","trainee","gerente","analista","tecnico","assistant","manager"]);
 const core=normalize(vacancy.title).split(" ").filter(t=>t.length>2&&!generic.has(t));
 const words=new Set(normalize(text).split(" "));
 return core.length>0&&core.every(t=>words.has(t));
}
