-- LOCAL fixture only. No production data or user decisions.
reset role;
create temp table cs_preserved as select to_jsonb(t) data from public.position_assessment_attempts t;
create temp table cs_reports as select to_jsonb(t) data from private.assessment_activity_analyses t;
create function pg_temp.cs_event(p_kind text,p_values jsonb) returns jsonb language sql as $$
 select jsonb_build_object('eventId',m83_id('cs-'||p_kind),'kind',p_kind,'questionInstanceId',a.questions#>>'{0,id}','questionVersion',a.questions#>>'{0,version}','clientAtMs',1791919000000,'sequence',100,'method','position-assessment-content-signals-1.0.0','values',p_values)
 from public.position_assessment_attempts t join public.position_assessments a on a.id=t.assessment_id where t.id=m83_id('aa-attempt')
$$;
create temp table cs_events(e jsonb);
insert into cs_events values(pg_temp.cs_event('text_selection_observed','{"region":"stem","characterCount":15,"support":"observed_selection","limitation":"selection_does_not_confirm_copy"}')),
(pg_temp.cs_event('copy_action_observed','{"region":"options","characterCount":10,"trigger":"keyboard_correlated","support":"received_copy_event","limitation":"clipboard_result_and_destination_not_observable"}')),
(pg_temp.cs_event('context_menu_observed','{"region":"stem","characterCount":0,"support":"received_context_menu","limitation":"menu_does_not_confirm_copy"}'));
grant all on cs_events to service_role;grant execute on function pg_temp.cs_event(text,jsonb) to service_role;
set local role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',(select jsonb_agg(e) from cs_events)));
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',(select jsonb_agg(e) from cs_events)));
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('0',64),jsonb_build_object('events',(select jsonb_agg(e) from cs_events))),'42501');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select e||'{"organizationId":"00000000-0000-0000-0000-000000000000"}' from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,clipboard}','"private text"') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,region}','"unknown"') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,characterCount}','1.5') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,characterCount}','100001') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,characterCount}','0') from cs_events where e->>'kind'='copy_action_observed')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,trigger}','"fraud"') from cs_events where e->>'kind'='copy_action_observed')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{method}','"position-assessment-browser-signals-1.0.0"') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{questionVersion}','"other"') from cs_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,characterCount}','14') from cs_events where e->>'kind'='text_selection_observed')))),'40001');
reset role;
select m83_assert((select count(*)=3 from public.position_assessment_events where kind in ('text_selection_observed','copy_action_observed','context_menu_observed')),'new signals persist once through authorized token-bound pipeline');
select m83_assert(not exists(select data from cs_preserved except select to_jsonb(t) from public.position_assessment_attempts t),'content events preserve answers results attempts and revisions');
select m83_assert(not exists(select data from cs_reports except select to_jsonb(t) from private.assessment_activity_analyses t),'method upgrade preserves all historical analyses');
select m83_assert(not has_function_privilege('anon','public.position_assessment_public(text,text,jsonb)','execute'),'portal RPC remains worker only');
select m83_assert(not has_table_privilege('authenticated','public.position_assessment_events','insert'),'event table no direct mutation');
select m83_assert((select min(tokens_per_unit)=17 from private.prisma_token_rates where function_name='assessment_activity_analysis'),'fixture tariff unchanged by method upgrade');
set local role authenticated;select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',m83_id('recruiter'))::text,true);
select m83_assert(public.assessment_activity_analysis_load(m83_id('a'),m83_id('aa-attempt'))#>>'{previousAnalysis,stale}'='true','older method remains readable and explicitly requires consent before refresh');
insert into aa_state values('quote-content',public.prisma_tokens('quote',m83_id('a'),'{"functionName":"assessment_activity_analysis","quantity":1}'));
select set_config('request.headers','{}',true);
select m83_reject('select public.assessment_activity_analysis_start(m83_id(''a''),m83_id(''aa-attempt''),m83_id(''old-worker''),null)','22023');
select set_config('request.headers','{"x-prisma-activity-method":"assessment-activity-analysis-1.0.0"}',true);
select m83_reject('select public.assessment_activity_analysis_start(m83_id(''a''),m83_id(''aa-attempt''),m83_id(''old-worker''),null)','22023');
select set_config('request.headers','{"x-prisma-activity-method":"assessment-activity-analysis-1.1.0"}',true);
insert into aa_state values('start-content',public.assessment_activity_analysis_start(m83_id('a'),m83_id('aa-attempt'),m83_id('cs-request'),(select (value->>'id')::uuid from aa_state where key='quote-content')));
select m83_assert((select value#>>'{analysis,methodVersion}'='assessment-activity-analysis-1.1.0' and value->>'acquired'='true' from aa_state where key='start-content'),'new analysis gets explicit new method and frozen official snapshot');
reset role;
insert into aa_state values('facts-content',jsonb_build_object('contract','assessment-activity-analysis-1.0.0','questionCount',(select jsonb_array_length(value#>'{snapshot,questions}') from aa_state where key='start-content'),'patterns',jsonb_build_array(jsonb_build_object('id','copy_operations','title','Comandos de cópia registrados'))));
set local role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.assessment_activity_analysis_finish(m83_id('a'),m83_id('cs-request'),true,(select value from aa_state where key='facts-content'),'{"patternIds":["copy_operations"],"contextIds":["copy","missing"]}','{"durationMs":10,"inputTokens":1,"outputTokens":1,"estimatedCostUsd":0.00001}');
reset role;
select m83_assert((select status='succeeded' and selection->'contextIds' @> '["copy"]' from private.assessment_activity_analyses where id=m83_id('cs-request')),'new copy context and immutable result supported by worker boundary');
