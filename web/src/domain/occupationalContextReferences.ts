import type {OccupationalCandidate} from "../../../src/domain/occupationalRag.js";
import type {OccupationalRagPayload,OccupationalRagReview} from "./occupationalRagReview.js";

// Retrieval is a research pool, not an endorsement. Keep the original snapshot intact.
export function contextualOccupationalCandidates(review:OccupationalRagReview):OccupationalCandidate[]{
 const proposal=review.proposal;
 if(!proposal)return [];
 if(proposal.status==="approved"){
  const edited=proposal.edited as OccupationalRagPayload|null;
  if(!edited)return [];
  const ids=new Set([edited.approved_target_id,...(edited.approved_related_ids??[])]);
  return proposal.original.candidate_concepts.filter(c=>ids.has(c.id));
 }
 const payload=proposal.original;
 if(proposal.status!=="awaiting_human_review"||payload.rag.decision!=="alias"||!payload.rationale.trim()||!payload.rag.evidence?.length)return [];
 return payload.candidate_concepts.filter(c=>c.id===payload.rag.target_id);
}
