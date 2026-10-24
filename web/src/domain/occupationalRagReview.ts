import type { OccupationalCandidate } from "../../../src/domain/occupationalRag.js";
export interface OccupationalRagPayload {
  approved_target_id?:string|null;
  approved_related_ids?:string[];
  contract: string; input_hash: string; proposed_concept: {canonical_label:string;description:string;concept_type:string};
  aliases:string[]; rationale:string; unresolved_questions:string[]; candidate_concepts:OccupationalCandidate[];
  rag:{decision:string;target_id:string;related_ids:string[];evidence:Array<{source_id:string;quote:string}>;method:string;search_prompt_version?:string;draft_prompt_version?:string;};
}
export interface OccupationalRagReview {
  id:string;title:string;status:string;errorCode:string|null;
  context:{contract:string;responsibilities:string;origin:{kind:string;profile_id?:string;version_id?:string;};input_hash:string};
  proposal:{id:string;status:string;original:OccupationalRagPayload;edited:unknown;model:string;decidedAt:string|null}|null;
  globalContribution:{id:string;status:string}|null;
}
export function readOccupationalRagReviews(value:unknown):OccupationalRagReview[]{
  if(!Array.isArray(value)||value.length>50)throw Error("Resposta do reconhecimento incompatível. Atualize a consulta.");
  for(const item of value){
    if(!item||typeof item.id!=="string"||typeof item.title!=="string"||typeof item.status!=="string"||item.context?.contract!=="occupational-rag-1.0.0"||typeof item.context?.responsibilities!=="string")throw Error("Contexto do reconhecimento indisponível.");
    if(item.proposal&&(item.proposal.original?.contract!=="occupational-rag-1.0.0"||!Array.isArray(item.proposal.original.candidate_concepts)||!Array.isArray(item.proposal.original.aliases)||!Array.isArray(item.proposal.original.unresolved_questions)||!item.proposal.original.rag))throw Error("Proposta incompatível. A revisão manual continua disponível.");
  }
  return value as OccupationalRagReview[];
}
