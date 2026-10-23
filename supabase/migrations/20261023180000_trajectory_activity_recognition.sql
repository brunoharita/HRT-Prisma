-- New recognition method is a causal dependency, evaluated lazily by the existing
-- authorized lease/append-only lifecycle. Never rewrite evaluations or decisions.
do $migration$
declare definition text; old_guard text; new_guard text;
begin
  definition:=pg_get_functiondef('private.stable_matching_sources(uuid,uuid,uuid,uuid)'::regprocedure);
  old_guard:=$old$deps:=jsonb_build_object($old$;
  if position(old_guard in definition)=0 or position('trajectoryRecognition' in definition)>0 then
    raise exception 'TRAJECTORY_RECOGNITION_SOURCE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,$new$deps:=jsonb_build_object('trajectoryRecognition','trajectory-recognition-1.0.0',$new$);

  definition:=pg_get_functiondef('public.complete_stable_matching_score(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb)'::regprocedure);
  old_guard:=$old$not in ('vacancy-matching-explainable-5.1.0','vacancy-matching-semantic-7.0.0')$old$;
  new_guard:=$new$not in ('vacancy-matching-explainable-5.1.0','vacancy-matching-explainable-5.2.0','vacancy-matching-semantic-7.0.0')$new$;
  if position(old_guard in definition)=0 then raise exception 'TRAJECTORY_RECOGNITION_STABLE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,new_guard);

  definition:=pg_get_functiondef('public.create_m62_verification_need(uuid,uuid,text,text)'::regprocedure);
  old_guard:=$old$evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-explainable-5.1.0', 'vacancy-matching-semantic-6.0.0', 'vacancy-matching-semantic-7.0.0')$old$;
  new_guard:=$new$evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0', 'vacancy-matching-explainable-5.1.0', 'vacancy-matching-explainable-5.2.0', 'vacancy-matching-semantic-6.0.0', 'vacancy-matching-semantic-7.0.0')$new$;
  if position(old_guard in definition)=0 then raise exception 'TRAJECTORY_RECOGNITION_M62_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,new_guard);
end $migration$;
