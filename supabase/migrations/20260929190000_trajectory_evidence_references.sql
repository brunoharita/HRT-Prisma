-- Prompt 2.1 replaces copied model quotes with server-resolved literal source references.
-- Keep historical assessments immutable and bind new attempts to the new prompt key.
do $migration$
declare
  definition text;
  old_claim text := $old$p_prompt_version is null or p_prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0')$old$;
  new_claim text := $new$p_prompt_version is null or p_prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0','trajectory-evidence-2.1.0')$new$;
  old_commit text := $old$cache.prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0')$old$;
  new_commit text := $new$cache.prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0','trajectory-evidence-2.1.0')$new$;
begin
  definition := pg_get_functiondef('public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean)'::regprocedure);
  if position(old_claim in definition)=0 then raise exception 'TRAJECTORY_EVIDENCE_CLAIM_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_claim,new_claim);

  definition := pg_get_functiondef('public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure);
  if position(old_commit in definition)=0 then raise exception 'TRAJECTORY_EVIDENCE_COMMIT_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_commit,new_commit);
end
$migration$;
