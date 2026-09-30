-- Append after M83, last-pair and human-review synthetic fixtures in one rollback transaction.
select m83_assert(has_function_privilege('service_role',
  'public.claim_matching_legacy_review_refresh(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb)','execute')
  and not has_function_privilege('authenticated',
  'public.claim_matching_legacy_review_refresh(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb)','execute')
  and not has_function_privilege('anon',
  'public.claim_matching_legacy_review_refresh(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb)','execute'),
  'explicit legacy recheck remains service-only');

create temp table mlr_state(key text primary key,value jsonb);
grant all on mlr_state to service_role;
create function public.mlr_audit(p_analysis uuid) returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object('actor',legacy_refresh_requested_by,'requestedAt',legacy_refresh_requested_at,
    'status',status,'reading',reading) from public.matching_trajectory_assessments where id=p_analysis $$;
revoke all on function public.mlr_audit(uuid) from public,anon,authenticated;
grant execute on function public.mlr_audit(uuid) to service_role;
create function public.mlr_expire_retry(p_analysis uuid) returns void language sql security definer set search_path='' as $$
  update public.matching_trajectory_assessments set retry_after=now()-interval '1 minute' where id=p_analysis $$;
revoke all on function public.mlr_expire_retry(uuid) from public,anon,authenticated;
grant execute on function public.mlr_expire_retry(uuid) to service_role;
set local role service_role;
insert into mlr_state select 'legacy',public.m83_claim(repeat('f',32)||repeat('0',32));
reset role;
update public.matching_trajectory_assessments set status='indeterminate',reason_code='READINGS_DISAGREE',
  lease=null,lease_until=null,completed_at=clock_timestamp(),attempts=3
  where id=(select (value->>'id')::uuid from mlr_state where key='legacy');
set local role authenticated;
select m83_reject('select public.claim_matching_legacy_review_refresh(null,null,null,null,null,null,null,null,null,null,null)','42501');
reset role;
set local role service_role;
do $$ declare analysis uuid; loaded jsonb; claimed jsonb; pair jsonb;
begin
  select (value->>'id')::uuid into analysis from mlr_state where key='legacy';
  loaded:=public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis);
  perform m83_assert(loaded->>'reasonCode'='PAIR_NOT_STORED' and loaded->>'conflictCount'='0'
    and loaded->>'reviewable'='false' and loaded->>'analysisId'=analysis::text,
    'missing historical readings return a typed, nonretryable result');
  perform m83_reject(format('select public.claim_matching_legacy_review_refresh(%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L)',
    m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis,
    repeat('f',32)||repeat('0',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model',(select value from m83_state where key='versions'),(select value from m83_state where key='context')),'42501');
  claimed:=public.claim_matching_legacy_review_refresh(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,repeat('f',32)||repeat('0',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model','{}'::jsonb,(select value from m83_state where key='context'));
  perform m83_assert(claimed->>'reason_code'='SOURCE_STALE' and claimed->>'acquired'='false',
    'forged source revision cannot incur a paid call');
  claimed:=public.claim_matching_legacy_review_refresh(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,repeat('f',32)||repeat('0',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model',(select value from m83_state where key='versions'),(select value from m83_state where key='context'));
  perform m83_assert(claimed->>'acquired'='true' and claimed->>'attempts'='4' and claimed->>'id'=analysis::text
    and public.mlr_audit(analysis)->>'actor'=m83_id('recruiter')::text
    and public.mlr_audit(analysis)->>'requestedAt' is not null,
    'authorized explicit action acquires one audited fourth attempt');
  perform m83_assert(public.claim_matching_legacy_review_refresh(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,repeat('f',32)||repeat('0',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model',(select value from m83_state where key='versions'),(select value from m83_state where key='context'))
    ->>'acquired'='false','duplicate click does not acquire another lease');
  pair:='[{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]},
    {"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"software_leadership","evidenceId":"e0:0"}]}]'::jsonb;
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('recruiter'),analysis,(claimed->>'lease')::uuid,
    'indeterminate',null,'READINGS_DISAGREE','provider-model-revision',pair)->>'status'='indeterminate'
    and public.m83_read_audit(analysis)#>>'{pair,attempt}'='4'
    and public.load_matching_trajectory_review(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),analysis)
      ->>'reviewable'='true',
    'new pair becomes reviewable while preserving its actual attempt number');
  perform m83_assert(public.m83_claim(repeat('f',32)||repeat('0',32))->>'acquired'='false',
    'ordinary search does not repeat an indeterminate manual check');
end $$;
reset role;

set local role service_role;
insert into mlr_state select 'failed',public.m83_claim(repeat('f',32)||repeat('1',32));
reset role;
update public.matching_trajectory_assessments set status='indeterminate',reason_code='READINGS_DISAGREE',
  lease=null,lease_until=null,completed_at=clock_timestamp()
  where id=(select (value->>'id')::uuid from mlr_state where key='failed');
set local role service_role;
do $$ declare analysis uuid; claimed jsonb; failed_pair jsonb;
begin
  select (value->>'id')::uuid into analysis from mlr_state where key='failed';
  claimed:=public.claim_matching_legacy_review_refresh(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,repeat('f',32)||repeat('1',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model',(select value from m83_state where key='versions'),(select value from m83_state where key='context'));
  perform m83_assert(claimed->>'acquired'='true' and claimed->>'attempts'='2',
    'earlier legacy attempt count is not invented or reset');
  failed_pair:='[{"outcome":"failed","stage":"provider_http","reasonCode":"PROVIDER_UNAVAILABLE"},
    {"outcome":"failed","stage":"provider_http","reasonCode":"PROVIDER_UNAVAILABLE"}]'::jsonb;
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('recruiter'),analysis,(claimed->>'lease')::uuid,
    'unavailable',null,'PROVIDER_UNAVAILABLE',null,failed_pair)->>'status'='unavailable',
    'provider failure does not create a reviewed reading');
  perform public.mlr_expire_retry(analysis);
  perform m83_assert(public.m83_claim(repeat('f',32)||repeat('1',32))->>'acquired'='false'
    and public.mlr_audit(analysis)->>'status'='unavailable'
    and public.mlr_audit(analysis)->'reading'='null'::jsonb,
    'failed manual check cannot trigger another paid attempt during ordinary search');
  perform m83_assert(public.claim_matching_legacy_review_refresh(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
    analysis,repeat('f',32)||repeat('1',32),'trajectory-backend-1.0.0',current_setting('m83_test.prompt_version'),
    'configured-model',(select value from m83_state where key='versions'),(select value from m83_state where key='context'))
    ->>'acquired'='false','the same legacy row cannot be charged twice');
end $$;
reset role;
