-- Append to the M83 and last-reading-pair synthetic fixtures in one rollback transaction.
select m83_assert((select relrowsecurity from pg_class where oid='public.matching_trajectory_reviews'::regclass),
  'human review audit has RLS');
select m83_assert(not has_table_privilege('authenticated','public.matching_trajectory_reviews','select')
  and not has_table_privilege('service_role','public.matching_trajectory_reviews','select')
  and not has_function_privilege('authenticated','public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid)','execute')
  and not has_function_privilege('authenticated','public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)','execute'),
  'pair and audit remain service RPC only');

create temp table mhr_state(key text primary key,value jsonb);
grant all on mhr_state to service_role;
create function public.mhr_audit(p_analysis uuid) returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object('status',a.status,'reading',a.reading,'pair',a.last_reading_pair->'readings',
    'reviewId',v.id,'reviewer',v.reviewer_id,'choices',v.choices,'reviewStatus',v.status)
  from public.matching_trajectory_assessments a join public.matching_trajectory_reviews v on v.id=a.human_review_id
  where a.id=p_analysis $$;
revoke all on function public.mhr_audit(uuid) from public,anon,authenticated;
grant execute on function public.mhr_audit(uuid) to service_role;
insert into mhr_state values('pair','[{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]},{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"software_leadership","evidenceId":"e0:0"}]}]');
set local role service_role;
insert into mhr_state select 'claim',public.m83_claim(repeat('5',64));
select public.complete_matching_trajectory_audited(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,
  'indeterminate',null,'READINGS_DISAGREE','provider-model-revision',(select value from mhr_state where key='pair'))
  ->>'status' from mhr_state where key='claim';
do $$ declare analysis uuid; loaded jsonb; expected_choices jsonb := '[{"id":"e0","choice":"first"}]';
  expected_reading jsonb := '{"items":[{"id":"e0","activity":"backend_execution","quote":"Built APIs"}]}'; result jsonb;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='claim';
  perform m83_reject(format('select public.load_matching_trajectory_review(%L,%L,%L,%L,%L)',
    m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis),'42501');
  perform m83_reject(format('select public.load_matching_trajectory_review(%L,%L,%L,%L,%L)',
    m83_id('outsider'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis),'42501');
  loaded:=public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis);
  perform m83_assert(loaded->>'conflictCount'='1' and loaded->>'reviewable'='true'
    and loaded#>>'{context,entries,0,text}'='Backend developer. Built APIs',
    'one divergence exposes only its scoped evidence to reviewer');
  perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
    m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,expected_choices,expected_reading),'42501');
  perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
    m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
    '[{"id":"wrong","choice":"first"}]'::jsonb,expected_reading),'22023');
  perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
    m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,expected_choices,
    '{"items":[{"id":"e0","activity":"backend_execution","quote":"invented evidence"}]}'::jsonb),'22023');
  result:=public.save_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,expected_choices,expected_reading);
  perform m83_assert(result->>'status'='resolved'
    and public.mhr_audit(analysis)->>'status'='complete'
    and public.mhr_audit(analysis)->'reading'=expected_reading
    and public.mhr_audit(analysis)->'pair'=(select value from mhr_state where key='pair')
    and public.mhr_audit(analysis)->>'reviewer'=m83_id('recruiter')::text
    and public.mhr_audit(analysis)->'choices'=expected_choices
    and public.mhr_audit(analysis)->>'reviewStatus'='resolved',
    'human choice records actor and preserves the original pair while completing reading');
  perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,%L)',
    m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,expected_choices,expected_reading),'40001');
end $$;
reset role;
insert into mhr_state select 'current-snapshot',private.m83_snapshot_sources(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'));
set local role service_role;
do $$ declare analysis uuid; review_id uuid; base_eval jsonb; revised jsonb; fingerprint text; committed jsonb;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='claim';
  review_id:=(public.mhr_audit(analysis)->>'reviewId')::uuid;
  select value into base_eval from m83_state where key='snapshot-evaluation';
  select value->>'fingerprint' into fingerprint from mhr_state where key='current-snapshot';
  revised:=jsonb_set(base_eval,'{semanticInterpretation}',
    (base_eval->'semanticInterpretation')||jsonb_build_object('analysisId',analysis,'inputHash',repeat('5',64)));
  revised:=jsonb_set(revised,'{positionDecision}',
    (select coalesce(value->'positionDecision','null'::jsonb) from mhr_state where key='current-snapshot'));
  perform m83_reject(format('select public.commit_matching_snapshot(%L,%L,%L,%L,%L,%L,%L)',
    m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,fingerprint,revised),'22023');
  revised:=jsonb_set(revised,'{semanticInterpretation}',revised->'semanticInterpretation'
    ||jsonb_build_object('resolutionSource','human_review','reviewId',review_id,
      'reviewVersion','trajectory-human-review-1.0.0'));
  committed:=public.commit_matching_snapshot(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,fingerprint,revised);
  perform m83_assert(committed->>'evaluationId' is not null,'snapshot accepts only provenance-bound human reading');
end $$;
reset role;

set local role service_role;
insert into mhr_state select 'unresolved',public.m83_claim(repeat('c',32)||repeat('d',32));
select public.complete_matching_trajectory_audited(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,
  'indeterminate',null,'READINGS_DISAGREE','provider-model-revision',(select value from mhr_state where key='pair'))
  ->>'status' from mhr_state where key='unresolved';
do $$ declare analysis uuid; result jsonb;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='unresolved';
  result:=public.save_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
    '[{"id":"e0","choice":"cannot_determine"}]',null);
  perform m83_assert(result->>'status'='unresolved' and public.mhr_audit(analysis)->>'status'='indeterminate'
    and public.mhr_audit(analysis)->'reading'='null'::jsonb
    and public.mhr_audit(analysis)->>'reviewStatus'='unresolved',
    'undetermined choice is audited and preserves pre-AI result');
end $$;
reset role;
do $$ declare analysis uuid;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='unresolved';
  begin
    update public.professional_profiles set profile_data=jsonb_set(profile_data,'{professionalTitle}','"New role"')
      where id=m83_id('profile');
    perform m83_reject(format('select public.load_matching_trajectory_review(%L,%L,%L,%L,%L)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis),'40001');
    perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,null)',
      m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
      '[{"id":"e0","choice":"cannot_determine"}]'::jsonb),'40001');
    raise exception 'rollback stale fixture' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null; end;
end $$;

-- A separate synthetic record exercises the upper bound without provider calls.
set local role service_role;
insert into mhr_state select 'six',public.m83_claim(repeat('a',32)||repeat('b',32));
reset role;
do $$ declare analysis uuid; entries jsonb; left_items jsonb; right_items jsonb; n int;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='six';
  select jsonb_agg(jsonb_build_object('id','e'||i,'fieldPath','experiences.'||i,'text','Built APIs','kind','experience')),
    jsonb_agg(jsonb_build_object('id','e'||i,'activity','backend_execution','evidenceId','e'||i||':0')),
    jsonb_agg(jsonb_build_object('id','e'||i,'activity','software_leadership','evidenceId','e'||i||':0'))
    into entries,left_items,right_items from generate_series(0,5) i;
  update public.matching_trajectory_assessments set status='indeterminate',reason_code='READINGS_DISAGREE',
    lease=null,lease_until=null,completed_at=clock_timestamp(),
    minimized_context=jsonb_build_object('position','Backend developer','entries',entries),
    last_reading_pair=jsonb_build_object('attempt',1,'readings',jsonb_build_array(
      jsonb_build_object('outcome','validated','model','provider-model-revision','items',left_items),
      jsonb_build_object('outcome','validated','model','provider-model-revision','items',right_items))) where id=analysis;
  select count(*) into n from public.matching_trajectory_assessments where id=analysis;
  perform m83_assert(n=1,'six-entry synthetic fixture prepared');
end $$;
set local role service_role;
do $$ declare analysis uuid; loaded jsonb;
begin
  select (value->>'id')::uuid into analysis from mhr_state where key='six';
  loaded:=public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis);
  perform m83_assert(loaded->>'conflictCount'='6' and loaded->>'reviewable'='false' and not(loaded ? 'pair'),
    'above five retains internal result without disclosing pair for review');
  perform m83_reject(format('select public.save_matching_trajectory_review(%L,%L,%L,%L,%L,%L,null)',
    m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
    (select jsonb_agg(jsonb_build_object('id','e'||i,'choice','first')) from generate_series(0,5) i)),'22023');
end $$;
reset role;
update public.matching_trajectory_assessments set last_reading_pair=jsonb_set(last_reading_pair,
  '{readings,1,items,5,activity}','"backend_execution"'::jsonb)
  where id=(select (value->>'id')::uuid from mhr_state where key='six');
set local role service_role;
select m83_assert((public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
  (select (value->>'id')::uuid from mhr_state where key='six'))->>'conflictCount')='5'
  and (public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
  (select (value->>'id')::uuid from mhr_state where key='six'))->>'reviewable')='true',
  'exactly five conflicts are reviewable');
reset role;
