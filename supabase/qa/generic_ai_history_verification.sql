-- Synthetic metadata only; whole migration/fixture/checks are rolled back by harness.
create temp table ai_history_state(key text primary key,value jsonb);
grant all on ai_history_state to authenticated,service_role;
create function public.ai_history_open(p_org uuid,p_function text default 'assessment_items',p_key text default repeat('a',64)) returns jsonb
language sql security invoker as $$ select public.record_ai_history_v1('open_request',jsonb_build_object(
 'scope',case when p_org is null then 'platform' else 'organization' end,'organizationId',p_org,'functionName',p_function,
 'operationId',public.m83_id('operation'),'sourceVersion','synthetic-1.0.0','inputFingerprint',repeat('b',64),'idempotencyKey',p_key)) $$;
create function public.ai_history_begin(p_req uuid,p_org uuid,p_attempt text,p_kind text default 'external') returns jsonb
language sql security invoker as $$ select public.record_ai_history_v1('begin_attempt',jsonb_build_object(
 'requestId',p_req,'organizationId',p_org,'attemptId',public.m83_id(p_attempt),'stage','reading',
 'provider',case when p_kind='cache' then 'cache' else 'synthetic-provider' end,
 'model',case when p_kind='cache' then 'none' else 'synthetic-model' end,'methodVersion','synthetic-1.0.0',
 'usageKind',p_kind,'pricingVersion',case when p_kind='cache' then null else 'synthetic-pricing-1.0.0' end)) $$;
create function public.ai_history_finish(p_req uuid,p_org uuid,p_attempt text,p_result text default 'success',p_usage jsonb default '{}') returns jsonb
language sql security invoker as $$ select public.record_ai_history_v1('complete_attempt',jsonb_build_object(
 'requestId',p_req,'organizationId',p_org,'attemptId',public.m83_id(p_attempt),'result',p_result,'durationMs',25,
 'errorCategory',case when p_result='failure' then 'SYNTHETIC_FAILURE' else null end)||p_usage) $$;

-- Client claims cannot grant write authority, even when forged to look like backend claims.
set local role anon;
select m83_reject('select public.ai_history_open(public.m83_id(''a''))','42501');
select m83_reject('select * from public.ai_requests','42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select set_config('request.jwt.claim.role','service_role',true);
select m83_reject('select public.ai_history_open(public.m83_id(''a''))','42501');
select m83_reject('select private.record_ai_history_v1(''get_request'',''{}'')','42501');
select m83_reject('delete from public.ai_usage_events','42501');
reset role;

set local role service_role;
select m83_reject('select * from public.ai_requests','42501');
select m83_reject('insert into public.ai_requests default values','42501');
select m83_reject('delete from public.ai_usage_events','42501');
insert into ai_history_state values('a',public.ai_history_open(public.m83_id('a')));
insert into ai_history_state values('a-replay',public.ai_history_open(public.m83_id('a')));
insert into ai_history_state values('b',public.ai_history_open(public.m83_id('b')));
insert into ai_history_state values('platform',public.ai_history_open(null,'knowledge'));
select m83_assert((select value->>'created'='true' from ai_history_state where key='a'),'request created explicitly');
select m83_assert((select value->>'created'='false' from ai_history_state where key='a-replay'),'logical request replay idempotent');
select m83_assert((select value#>>'{request,id}' from ai_history_state where key='a')=(select value#>>'{request,id}' from ai_history_state where key='a-replay'),'replay preserves original ID');
select m83_assert((select value#>>'{request,id}' from ai_history_state where key='a')<>(select value#>>'{request,id}' from ai_history_state where key='b'),'same key in different companies stays distinct');
select m83_assert((select value#>'{request,organization_id}'='null' and value#>>'{request,scope}'='platform' from ai_history_state where key='platform'),'global request has no arbitrary company');
select m83_reject(format('select public.record_ai_history_v1(''open_request'',%L)',jsonb_build_object('scope','organization','organizationId',m83_id('a'),'functionName','assessment_items','operationId',m83_id('operation'),'sourceVersion','synthetic-1.0.0','inputFingerprint',repeat('c',64),'idempotencyKey',repeat('a',64))),'40001');
select m83_reject('select public.record_ai_history_v1(''open_request'',''{"scope":"platform","functionName":"knowledge"}'')','22023');
select m83_reject('select public.record_ai_history_v1(''open_request'',''{"organizationId":null,"prompt":"PRIVATE DATA"}'')','22023');
select m83_reject('select public.record_ai_history_v1(''unknown'',''{}'')','22023');
select m83_reject('select public.record_ai_history_v1(''open_request'',''{"organizationId":"not-an-id"}'')','22023');
select m83_reject(format('select public.record_ai_history_v1(''open_request'',%L)',jsonb_build_object('scope','organization','organizationId',m83_id('a'),'functionName','assessment_items','operationId',m83_id('operation'),'actorId',m83_id('outsider'),'sourceVersion','synthetic-1.0.0','inputFingerprint',repeat('b',64),'idempotencyKey',repeat('e',64))),'42501');
select m83_reject(format('select public.record_ai_history_v1(''open_request'',%L)',jsonb_build_object('scope','platform','organizationId',m83_id('a'),'functionName','knowledge','operationId',m83_id('operation'),'sourceVersion','synthetic-1.0.0','inputFingerprint',repeat('b',64),'idempotencyKey',repeat('e',64))),'22023');
select m83_reject(format('select public.record_ai_history_v1(''get_request'',%L)',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='a'),'organizationId',m83_id('b'))),'42501');
select m83_reject(format('select public.record_ai_history_v1(''get_request'',%L)',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='platform'),'organizationId',m83_id('a'))),'42501');
select m83_reject(format('select public.record_ai_history_v1(''complete_request'',%L)',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='b'),'organizationId',m83_id('b'),'status','succeeded')),'40001');

insert into ai_history_state select 'attempt1',public.ai_history_begin((value#>>'{request,id}')::uuid,m83_id('a'),'first') from ai_history_state where key='a';
select m83_assert((select (value->>'acquired')::boolean from ai_history_state where key='attempt1'),'first attempt acquired before provider call');
select m83_assert(not (public.ai_history_begin((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'first')->>'acquired')::boolean,'duplicate attempt does not acquire a second call');
select m83_reject(format('select public.record_ai_history_v1(''complete_request'',%L)',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='a'),'organizationId',m83_id('a'),'status','failed','errorCategory','SYNTHETIC_FAILURE')),'40001');
insert into ai_history_state select 'pending',public.record_ai_history_v1('get_request',jsonb_build_object('requestId',value#>>'{request,id}','organizationId',m83_id('a'))) from ai_history_state where key='a';
select m83_assert((select value#>'{attempts,0,result}'='null' and value#>'{attempts,0,estimated_cost_usd}'='null' and value#>'{attempts,0,duration_ms}'='null' from ai_history_state where key='pending'),'running attempt does not invent result, duration or zero cost');
select public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'first','failure');
select m83_assert(not(public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'first','failure')->>'recorded')::boolean,'completion replay does not duplicate usage');
select m83_reject(format('select public.ai_history_finish(%L,%L,''first'',''failure'',''{"durationMs":30}'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'40001');
select m83_reject(format('select public.ai_history_finish(%L,%L,''unknown'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'22023');

select public.ai_history_begin((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'second');
select m83_reject(format('select public.ai_history_finish(%L,%L,''second'',''success'',''{"estimatedCostUsd":0.01}'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'22023');
select m83_reject(format('select public.ai_history_finish(%L,%L,''second'',''success'',''{"inputTokens":-1}'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'22023');
select m83_reject(format('select public.ai_history_finish(%L,%L,''second'',''success'',''{"observedCostUsd":0.02}'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'22023');
select public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'second','failure','{"inputTokens":1000,"outputTokens":50,"estimatedCostUsd":0.01}');
select public.ai_history_begin((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'third');
select public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'third','success','{"inputTokens":1000,"outputTokens":200,"estimatedCostUsd":0.020000000000000003}');
select m83_assert(not(public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='a')::uuid,m83_id('a'),'third','success','{"inputTokens":1000,"outputTokens":200,"estimatedCostUsd":0.020000000000000003}')->>'recorded')::boolean,'float cost replays at persisted precision');
select public.record_ai_history_v1('complete_request',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='a'),'organizationId',m83_id('a'),'status','succeeded'));
select m83_assert(not(public.record_ai_history_v1('complete_request',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='a'),'organizationId',m83_id('a'),'status','succeeded'))->>'recorded')::boolean,'request terminal replay is idempotent');
select m83_reject(format('select public.ai_history_begin(%L,%L,''fourth'')',(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('a')),'40001');
select m83_reject(format('select public.record_ai_history_v1(''complete_request'',%L)',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='a'),'organizationId',m83_id('a'),'status','failed','errorCategory','SYNTHETIC_FAILURE')),'40001');

select public.ai_history_begin((select value#>>'{request,id}' from ai_history_state where key='b')::uuid,m83_id('b'),'cached','cache');
select m83_reject(format('select public.ai_history_finish(%L,%L,''cached'',''success'',''{"estimatedCostUsd":0.01,"observedCostUsd":0}'')',(select value#>>'{request,id}' from ai_history_state where key='b'),m83_id('b')),'22023');
select public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='b')::uuid,m83_id('b'),'cached','success','{"estimatedCostUsd":0,"observedCostUsd":0}');
select public.record_ai_history_v1('complete_request',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='b'),'organizationId',m83_id('b'),'status','succeeded'));
select public.ai_history_begin((select value#>>'{request,id}' from ai_history_state where key='platform')::uuid,null,'global');
select public.ai_history_finish((select value#>>'{request,id}' from ai_history_state where key='platform')::uuid,null,'global','success',jsonb_build_object('observedCostUsd',0.03,'costEvidenceHash',repeat('d',64)));
select public.record_ai_history_v1('complete_request',jsonb_build_object('requestId',(select value#>>'{request,id}' from ai_history_state where key='platform'),'organizationId',null,'status','succeeded'));
reset role;

select m83_assert((select count(*)=3 from public.ai_requests),'request count excludes retries');
select m83_assert((select count(*)=3 and count(distinct attempt_number)=3 from public.ai_usage_events where organization_id=m83_id('a') and contract_version='ai-usage-events-2.0.0'),'separate attempts preserve ordered readings/retries');
select m83_assert((select sum(estimated_cost_usd)=0.03 and count(*) filter(where estimated_cost_usd is null)=1 from public.ai_usage_events where organization_id=m83_id('a') and contract_version='ai-usage-events-2.0.0'),'failed paid attempt retained, unknown excluded from known sum but remains explicit');
select m83_assert((select estimated_cost_usd is null and input_tokens is null and output_tokens is null and cost_status='unknown' from public.ai_usage_events where attempt_id=m83_id('first')),'unknown failure cost and tokens remain null');
select m83_assert((select cost_status='not_applicable' and input_tokens is null and output_tokens is null and estimated_cost_usd=0 from public.ai_usage_events where attempt_id=m83_id('cached')),'cache hit is not a paid provider call or fabricated token usage');
select m83_assert((select scope='platform' and organization_id is null and cost_status='observed' and observed_cost_usd=0.03 from public.ai_usage_events where attempt_id=m83_id('global')),'global cost attributed only to platform with evidence hash');
select m83_reject(format('insert into public.ai_usage_events(organization_id,process_id,stage,duration_ms,provider,model,version,estimated_cost_usd,result,scope,contract_version,request_id,attempt_id,attempt_number,cost_status) values(%L,%L,''reading'',null,''synthetic'',''synthetic'',''synthetic'',null,null,''organization'',''ai-usage-events-2.0.0'',%L,%L,99,''unknown'')',m83_id('b'),m83_id('operation'),(select value#>>'{request,id}' from ai_history_state where key='a'),m83_id('cross')),'23503');
insert into public.ai_usage_events(organization_id,process_id,stage,duration_ms,provider,model,version,result)
 values(m83_id('a'),m83_id('legacy-operation'),'legacy',10,'synthetic','synthetic','legacy','success');
select m83_assert((select contract_version='ai-usage-events-1.0.0' and cost_status='legacy_unverified' and request_id is null and estimated_cost_usd=0 from public.ai_usage_events where stage='legacy'),'legacy shape/default preserved without fictional request/backfill');
select m83_assert((select value from ai_history_legacy_snapshot)=(select to_jsonb(e)-array['scope','binding_id','contract_version','request_id','attempt_id','attempt_number','usage_kind','completed_at','pricing_version','observed_cost_usd','cost_evidence_hash','cost_status'] from public.ai_usage_events e where stage='legacy-before'),'pre-migration legacy fields unchanged');
select m83_assert((select count(*)=2 from pg_class where oid in ('public.ai_requests'::regclass,'public.ai_usage_events'::regclass) and relrowsecurity),'both tables use RLS');
select m83_assert(not has_function_privilege('authenticated','public.record_ai_history_v1(text,jsonb)','EXECUTE') and not has_table_privilege('service_role','public.ai_requests','UPDATE'),'write authority exists only through backend RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_assert((select count(*)=1 from public.ai_requests),'recruiter reads only own company requests, not global');
select m83_assert((select count(*)=5 from public.ai_usage_events),'recruiter reads only own company usage including legacy');
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);
select m83_assert((select count(*)=0 from public.ai_requests),'member cannot read AI history');
select m83_assert((select count(*)=0 from public.ai_usage_events),'member cannot read costs');
select set_config('request.jwt.claim.sub',m83_id('inactive')::text,true);
select m83_assert((select count(*)=0 from public.ai_requests),'inactive operator cannot read AI history');
select set_config('request.jwt.claim.sub',m83_id('outsider')::text,true);
select m83_assert((select count(*)=0 from public.ai_requests),'outsider member cannot read another company or global requests');
select set_config('request.jwt.claim.sub','',true);
select m83_assert((select count(*)=0 from public.ai_requests),'missing user identity reads no history');
reset role;
