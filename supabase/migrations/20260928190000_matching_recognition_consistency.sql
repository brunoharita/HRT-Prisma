-- Keep the M6.2 verification boundary compatible with new deterministic snapshots and
-- the already published semantic 7.0.0 contract. No historical row is rewritten.
do $migration$
declare
  definition text;
  old_guard text := $guard$evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-semantic-6.0.0')$guard$;
  new_guard text := $guard$evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-explainable-5.1.0', 'vacancy-matching-semantic-6.0.0', 'vacancy-matching-semantic-7.0.0')$guard$;
begin
  definition := pg_get_functiondef('public.create_m62_verification_need(uuid,uuid,text,text)'::regprocedure);
  if position(old_guard in definition) = 0 then raise exception 'MATCHING_RECOGNITION_M62_BASELINE_MISMATCH'; end if;
  execute replace(definition, old_guard, new_guard);
end
$migration$;
