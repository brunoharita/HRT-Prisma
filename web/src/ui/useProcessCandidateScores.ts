import {useEffect,useState} from "react";
import type {ProcessAssessmentWorkspace} from "../domain/processAssessmentData";
import type {FollowUpEntry} from "../domain/positionFollowUp";
import {positionFollowUpService} from "../infrastructure/supabase/positionFollowUpService";

export interface ProcessCandidateScores {scope:string;entries:FollowUpEntry[];state:"loading"|"ready"|"error";}
export function useProcessCandidateScores(workspace:ProcessAssessmentWorkspace|null,enabled=true):ProcessCandidateScores {
 const scope=JSON.stringify([workspace?.organizationId,workspace?.vacancyId,workspace?.process.id]);
 const [scores,setScores]=useState<ProcessCandidateScores|null>(null);
 useEffect(()=>{
  if(!enabled||!workspace)return;
  let active=true;setScores({scope,entries:[],state:"loading"});
  void positionFollowUpService.load(workspace.organizationId,workspace.vacancyId,workspace.process.id).then(data=>{
   if(data.process?.id!==workspace.process.id)throw Error("Contexto de notas incompatível");
   if(active)setScores({scope,entries:data.entries,state:"ready"});
  }).catch(()=>{if(active)setScores({scope,entries:[],state:"error"});});
  return()=>{active=false;};
 },[scope,workspace?.attempts,enabled]);
 return scores?.scope===scope?scores:{scope,entries:[],state:"loading"};
}
