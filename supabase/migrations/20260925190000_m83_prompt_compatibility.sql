-- Forward-only prompt calibration: retain 1.1.0 and admit 1.2.0, never rewrite cache/history.
-- Exact guarded replacements preserve authorization, leases, NOWAIT, source checks and ACLs.
do $migration$
declare
  claim_definition text := pg_get_functiondef('public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean)'::regprocedure);
  commit_definition text := pg_get_functiondef('public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure);
  claim_guard text := $guard$p_prompt_version is distinct from 'trajectory-evidence-1.1.0'$guard$;
  commit_guard text := $guard$cache.prompt_version<>'trajectory-evidence-1.1.0'$guard$;
begin
  if (length(claim_definition)-length(replace(claim_definition,claim_guard,'')))/length(claim_guard) <> 1
    or (length(commit_definition)-length(replace(commit_definition,commit_guard,'')))/length(commit_guard) <> 1 then
    raise exception 'M83_PROMPT_COMPATIBILITY_BASELINE_MISMATCH';
  end if;
  execute replace(claim_definition,claim_guard,
    $guard$(p_prompt_version is null or p_prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0'))$guard$);
  execute replace(commit_definition,commit_guard,
    $guard$cache.prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0')$guard$);
end
$migration$;
