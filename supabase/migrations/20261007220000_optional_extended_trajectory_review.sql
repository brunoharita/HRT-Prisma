-- Eligibility now follows the actual verified conflicts, not a five-item cap.
-- Existing rows/decision format, tenant/actor/source guards and atomic save remain.
alter table public.matching_trajectory_reviews drop constraint matching_trajectory_reviews_choices_check;
alter table public.matching_trajectory_reviews add constraint matching_trajectory_reviews_choices_check
  check (jsonb_typeof(choices)='array' and jsonb_array_length(choices)>=1);

do $migration$
declare definition text; old_guard text;
begin
  definition:=pg_get_functiondef('public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid)'::regprocedure);
  old_guard:='  if conflict_count>5 then return jsonb_build_object(''analysisId'',r.id,''conflictCount'',conflict_count,''reviewable'',false); end if;';
  if (length(definition)-length(replace(definition,old_guard,'')))/length(old_guard)<>1
  then raise exception 'EXTENDED_REVIEW_LOAD_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,'');

  definition:=pg_get_functiondef('public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)'::regprocedure);
  old_guard:='conflict_count not between 1 and 5';
  if (length(definition)-length(replace(definition,old_guard,'')))/length(old_guard)<>1
  then raise exception 'EXTENDED_REVIEW_SAVE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,'conflict_count<1');
end $migration$;

-- CREATE OR REPLACE retains ACL; state it explicitly as defense in depth.
revoke all on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb) to service_role;
