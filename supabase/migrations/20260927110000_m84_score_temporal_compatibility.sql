-- M8.4: preserve semantic snapshot history while accepting the new temporal score contract.
do $migration$
declare
  commit_definition text := pg_get_functiondef('public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure);
  old_guard text := $guard$p_evaluation#>>'{score,scoreContractVersion}' is distinct from 'matching-score-1.3.0'$guard$;
  new_guard text := $guard$p_evaluation#>>'{score,scoreContractVersion}' not in ('matching-score-1.3.0','matching-score-1.4.0')$guard$;
begin
  if (length(commit_definition)-length(replace(commit_definition, old_guard, '')))/length(old_guard) <> 1
    or position(new_guard in commit_definition) > 0 then
    raise exception 'M84_SCORE_COMPATIBILITY_BASELINE_MISMATCH';
  end if;
  execute replace(commit_definition, old_guard, new_guard);
end
$migration$;
