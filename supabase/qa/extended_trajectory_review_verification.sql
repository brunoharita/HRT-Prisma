-- After historical human-review verification and the new migration, in a rollback.
select m83_assert((select relrowsecurity from pg_class where oid='public.matching_trajectory_reviews'::regclass)
  and not has_function_privilege('anon','public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid)','execute')
  and not has_function_privilege('authenticated','public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)','execute')
  and not has_table_privilege('service_role','public.matching_trajectory_reviews','insert'),
  'extended review retains RLS and service-only checked RPC authority');

do $$ declare analysis uuid; n int; entries jsonb; first_items jsonb; second_items jsonb; pair_before jsonb;
  choices jsonb; reading jsonb; result jsonb; loaded jsonb; before_count int;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='six';
  foreach n in array array[6,21] loop
    select jsonb_agg(jsonb_build_object('id','e'||i,'fieldPath','experiences.'||i,'text','Built APIs','kind','experience')),
      jsonb_agg(jsonb_build_object('id','e'||i,'activity','backend_execution','evidenceId','e'||i||':0')),
      jsonb_agg(jsonb_build_object('id','e'||i,'activity','software_leadership','evidenceId','e'||i||':0')),
      jsonb_agg(jsonb_build_object('id','e'||i,'choice','first')),
      jsonb_build_object('items',jsonb_agg(jsonb_build_object('id','e'||i,'activity','backend_execution','quote','Built APIs')))
      into entries,first_items,second_items,choices,reading from generate_series(0,n-1) i;
    pair_before:=jsonb_build_object('attempt',1,'readings',jsonb_build_array(
      jsonb_build_object('outcome','validated','model','provider-model-revision','items',first_items),
      jsonb_build_object('outcome','validated','model','provider-model-revision','items',second_items)));
    update public.matching_trajectory_assessments set status='indeterminate',reason_code='READINGS_DISAGREE',
      reading=null,human_review_id=null,minimized_context=jsonb_build_object('position','Backend developer','entries',entries),
      last_reading_pair=pair_before where id=analysis;
    select count(*) into before_count from public.matching_trajectory_reviews where analysis_id=analysis;
    set local role service_role;
    loaded:=public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis);
    perform m83_assert(loaded->>'reviewable'='true' and (loaded->>'conflictCount')::int=n and loaded->'pair'=pair_before,
      'all extended conflicts available without truncation: '||n);
    perform m83_reject(format('select public.load_matching_trajectory_review(%L,%L,%L,%L,%L)',
      m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis),'42501');
    perform m83_reject(format('select public.load_matching_trajectory_review(%L,%L,%L,%L,%L)',
      m83_id('outsider'),m83_id('b'),m83_id('profile'),m83_id('v2'),analysis),'40001');
    perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,choices-0,reading),'22023');
    perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,jsonb_set(choices,'{1,id}','"e0"'),reading),'22023');
    perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,choices,jsonb_set(reading,'{items,0,quote}','"invented"')),'22023');
    result:=public.save_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
      jsonb_set(choices,'{0,choice}','"cannot_determine"'),null);
    perform m83_assert(result->>'status'='unresolved' and public.mhr_audit(analysis)->>'status'='indeterminate',
      'uncertain extended choice preserves internal calculation: '||n);
    result:=public.save_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,choices,reading);
    perform m83_assert(result->>'status'='resolved' and public.mhr_audit(analysis)->'reading'=reading
      and public.mhr_audit(analysis)->'choices'=choices and public.mhr_audit(analysis)->'pair'=pair_before->'readings',
      'complete extended save preserves every choice and original evidence: '||n);
    perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,choices,reading),'P0001');
    reset role;
    perform m83_assert((select count(*) from public.matching_trajectory_reviews where analysis_id=analysis)=before_count+2,
      'only the two intentional complete saves create audit rows: '||n);
  end loop;
end $$;
