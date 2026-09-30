-- Run after the M83 synthetic fixture, inside its rollback transaction.
insert into public.organization_memberships(organization_id,user_id,role)
  values(m83_id('a'),m83_id('member'),'member');
update m83_state set value=public.load_matching_trajectory_sources(m83_id('a'),m83_id('profile'),m83_id('v2'))->'sourceVersions'
  where key='versions';
-- Test-only readback; never deployed. The service role still has no table SELECT.
create function public.m83_read_audit(p_id uuid) returns jsonb
  language sql security definer set search_path='' as $$
    select jsonb_build_object('pair',last_reading_pair,'reading',reading)
      from public.matching_trajectory_assessments where id=p_id $$;
revoke all on function public.m83_read_audit(uuid) from public,anon,authenticated;
grant execute on function public.m83_read_audit(uuid) to service_role;
set local role authenticated;
select m83_reject('select last_reading_pair from public.matching_trajectory_assessments','42501');
select m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',null,null,null,null)',
  m83_id('member'),m83_id('anything'),m83_id('lease')),'42501');
reset role;
set local role anon;
select m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',null,null,null,null)',
  m83_id('member'),m83_id('anything'),m83_id('lease')),'42501');
reset role;
set local role service_role;
select m83_reject('select last_reading_pair from public.matching_trajectory_assessments','42501');
do $$
declare
  c jsonb;
  r jsonb;
  pair jsonb := '[{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]},
                  {"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]}]';
  disagree jsonb := '[{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]},
                     {"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"software_leadership","evidenceId":"e0:0"}]}]';
  failed jsonb := '[{"outcome":"failed","stage":"provider_status","reasonCode":"RESPONSE_INVALID"},
                   {"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]}]';
begin
  select value into r from m83_state where key='reading';
  c:=public.m83_claim(repeat('7',64));
  perform m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',%L,null,%L,%L)',
    m83_id('member'),c->>'id',m83_id('wrong'),r,'provider-model-revision',pair),'40001');
  perform m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',%L,null,%L,%L)',
    m83_id('member'),c->>'id',c->>'lease',r,'provider-model-revision',jsonb_set(pair,'{0,items,0,quote}','"private raw resume"')),'22023');
  perform m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',%L,null,%L,%L)',
    m83_id('member'),c->>'id',c->>'lease',r,'provider-model-revision',jsonb_set(pair,'{0,items,0,id}','"other-entry"')),'22023');
  perform m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',%L,null,%L,%L)',
    m83_id('member'),c->>'id',c->>'lease',r,'provider-model-revision',jsonb_set(pair,'{0,items,0,evidenceId}','"e0:999"')),'22023');
  perform m83_reject(format('select public.complete_matching_trajectory_audited(%L,%L,%L,''complete'',%L,null,%L,%L)',
    m83_id('member'),c->>'id',c->>'lease',r,'provider-model-revision',disagree),'22023');
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'complete',r,null,'provider-model-revision',pair)->>'status'='complete','agreed pair completed atomically');
  perform m83_assert(public.m83_read_audit((c->>'id')::uuid)#>>'{pair,attempt}'='1'
    and public.m83_read_audit((c->>'id')::uuid)#>'{pair,readings}'=pair,'only compact agreed pair persisted');
  perform m83_assert(not(public.m83_claim(repeat('7',64)) ? 'last_reading_pair'),'cache claim excludes audit data');
  c:=public.m83_claim(repeat('8',64));
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'indeterminate',null,'READINGS_DISAGREE','provider-model-revision',disagree)->>'status'='indeterminate','divergent pair completed without agreed reading');
  perform m83_assert(public.m83_read_audit((c->>'id')::uuid)->'reading'='null'::jsonb
    and public.m83_read_audit((c->>'id')::uuid)#>'{pair,readings}'=disagree,'divergence preserved without changing result');
  c:=public.m83_claim(repeat('6',64));
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'unavailable',null,'RESPONSE_INVALID',null,failed)->>'status'='unavailable','invalid response stores only typed failure');
  perform m83_assert(public.m83_read_audit((c->>'id')::uuid)#>'{pair,readings}'=failed
    and public.m83_read_audit((c->>'id')::uuid)->'reading'='null'::jsonb,'failed pair stored without provider text');
  c:=public.m83_claim(repeat('3',64));
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'unavailable',null,'RESPONSE_INVALID',null,
    jsonb_set(pair,'{1,model}','"different-model"'))->>'status'='unavailable','different models do not complete');
  c:=public.m83_claim(repeat('4',64));
  perform m83_assert(public.complete_matching_trajectory_audited(m83_id('outsider'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'unavailable',null,'RESPONSE_INVALID',null,failed)->>'reason_code'='AUTH_REVOKED','revoked actor cannot commit audit');
  perform m83_assert(public.m83_read_audit((c->>'id')::uuid)#>'{pair}'='null'::jsonb,'revoked actor leaves no pair');
end $$;
reset role;
update public.matching_trajectory_assessments set retry_after=now()-interval '1 minute' where input_hash=repeat('6',64);
set local role service_role;
do $$ declare c jsonb; r jsonb; pair jsonb := '[{"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]},
  {"outcome":"validated","model":"provider-model-revision","items":[{"id":"e0","activity":"backend_execution","evidenceId":"e0:0"}]}]'; begin
  select value into r from m83_state where key='reading';
  c:=public.m83_claim(repeat('6',64));
  perform m83_assert((c->>'acquired')::boolean and (c->>'attempts')::integer=2,'new retry obtains second attempt');
  perform public.complete_matching_trajectory_audited(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,
    'complete',r,null,'provider-model-revision',pair);
  perform m83_assert(public.m83_read_audit((c->>'id')::uuid)#>>'{pair,attempt}'='2'
    and public.m83_read_audit((c->>'id')::uuid)#>'{pair,readings}'=pair,'second attempt replaces previous pair');
end $$;
reset role;
