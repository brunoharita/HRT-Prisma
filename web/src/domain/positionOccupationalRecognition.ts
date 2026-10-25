import {readOccupationalRagReviews,type OccupationalRagReview} from "./occupationalRagReview.js";
import type {TaxonomyCandidate} from "./positionTaxonomy.js";
import {contextualOccupationalCandidates} from "./occupationalContextReferences.js";

export interface PositionOccupationalRecognition {
  review: OccupationalRagReview;
  candidates: Array<TaxonomyCandidate & {version:number;sources:Array<{name:string;version:string}>}>;
}
export function readPositionOccupationalRecognition(value:unknown):PositionOccupationalRecognition {
  if(!value||typeof value!=="object")throw Error("Resultado do reconhecimento indisponível. Atualize a consulta.");
  const data=value as PositionOccupationalRecognition;
  readOccupationalRagReviews([data.review]);
  if(!Array.isArray(data.candidates)||data.candidates.length>16||data.candidates.some(c=>!c||typeof c.id!=="string"||typeof c.label!=="string"
    ||typeof c.description!=="string"||!["global","organization"].includes(c.scope)||!Number.isInteger(c.version)||c.version<1
    ||!Array.isArray(c.sources)||c.sources.some(s=>!s||typeof s.name!=="string"||typeof s.version!=="string")))throw Error("Referências do reconhecimento incompatíveis. Use a busca manual ou atualize a consulta.");
  return {...data,candidates:positionRecognitionCandidates(data)};
}

export function positionRecognitionCandidates(data:PositionOccupationalRecognition):PositionOccupationalRecognition["candidates"]{
 // The authenticated loader returns only the published concept after human approval,
 // including a manually chosen target or a newly created concept outside the AI pool.
 if(data.review.proposal?.status==="approved")return data.candidates;
 const ids=new Set(contextualOccupationalCandidates(data.review).map(c=>c.id));
 return data.candidates.filter(c=>ids.has(c.id));
}
