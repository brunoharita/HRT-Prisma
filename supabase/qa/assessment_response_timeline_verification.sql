-- Synthetic disposable LOCAL data only, rolled back by the existing runner.
reset role;
-- Fixture helper only, session-local: worker intentionally has no direct table read.
create function pg_temp.tl_event(p_kind text,p_values jsonb) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('eventId',m83_id('tl-'||p_kind),'kind',p_kind,'questionInstanceId',a.questions#>>'{0,id}','questionVersion',a.questions#>>'{0,version}','clientAtMs',1791900000000,'sequence',200,'method','position-assessment-response-timeline-1.0.0','values',p_values)
 from public.position_assessment_attempts t join public.position_assessments a on a.id=t.assessment_id where t.id=m83_id('aa-attempt')
$$;
create temp table tl_events(e jsonb);
insert into tl_events values(pg_temp.tl_event('question_displayed','{"support":"observed_display","limitation":"display_does_not_confirm_reading"}')),
(pg_temp.tl_event('answer_selected','{"optionId":"B","previousOptionId":null,"support":"observed_choice","limitation":"choice_does_not_identify_intent"}')),
(pg_temp.tl_event('answer_changed','{"optionId":"A","previousOptionId":"B","support":"observed_choice","limitation":"choice_does_not_identify_intent"}'));
grant all on tl_events to service_role;grant execute on function pg_temp.tl_event(text,jsonb) to service_role;
set local role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',(select jsonb_agg(e) from tl_events)));
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',(select jsonb_agg(e) from tl_events)));
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',(select jsonb_agg(e) from cs_events)));
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{method}','"position-assessment-response-timeline-1.0.0"') from cs_events where e->>'kind'='copy_action_observed')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('0',64),jsonb_build_object('events',(select jsonb_agg(e) from tl_events))),'42501');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select e||'{"organizationId":"00000000-0000-0000-0000-000000000000"}' from tl_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{questionVersion}','"wrong"') from tl_events limit 1)))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array(pg_temp.tl_event('answer_selected','{"optionId":"unknown","previousOptionId":null,"support":"observed_choice","limitation":"choice_does_not_identify_intent"}')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array(pg_temp.tl_event('answer_changed','{"optionId":"A","previousOptionId":"unknown","support":"observed_choice","limitation":"choice_does_not_identify_intent"}')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array(pg_temp.tl_event('answer_changed','{"optionId":"A","previousOptionId":"A","support":"observed_choice","limitation":"choice_does_not_identify_intent"}')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array(pg_temp.tl_event('answer_selected','{"optionId":"B","support":"observed_choice","limitation":"choice_does_not_identify_intent"}')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,text}','"private"') from tl_events where e->>'kind'='answer_selected')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{method}','"position-assessment-browser-signals-1.0.0"') from tl_events where e->>'kind'='question_displayed')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array(pg_temp.tl_event('focus_episode','{"durationMs":1}')))),'22023');
select m83_reject(format('select public.position_assessment_public(''events'',%L,%L)',repeat('c',64),jsonb_build_object('events',jsonb_build_array((select jsonb_set(e,'{values,optionId}','"C"') from tl_events where e->>'kind'='answer_selected')))),'40001');
select public.position_assessment_public('events',repeat('c',64),jsonb_build_object('events',jsonb_build_array(jsonb_build_object('eventId',m83_id('tl-legacy'),'kind','answer_changed','questionInstanceId',(select e->>'questionInstanceId' from tl_events limit 1),'questionVersion',(select e->>'questionVersion' from tl_events limit 1),'clientAtMs',1791900000010,'sequence',203,'method','position-assessment-browser-signals-1.0.0','values',jsonb_build_object('support','observed','limitation','no_intent_inference')))));
reset role;
select m83_assert((select count(*)=3 from public.position_assessment_events where event_id in (select (e->>'eventId')::uuid from tl_events)),'timeline replay is idempotent');
select m83_assert(not exists(select data from tl_attempts_before except select to_jsonb(t) from public.position_assessment_attempts t),'timeline preserves answers results status revisions and human data');
select m83_assert(not exists(select data from tl_assessments_before except select to_jsonb(t) from public.position_assessments t),'timeline preserves assessment snapshots');
select m83_assert(not exists(select data from tl_analyses_before except select to_jsonb(t) from private.assessment_activity_analyses t),'saved AI reports unchanged');
select m83_assert(not has_function_privilege('anon','public.position_assessment_public(text,text,jsonb)','execute') and not has_function_privilege('authenticated','public.position_assessment_public(text,text,jsonb)','execute'),'RPC remains worker only');
select m83_assert(not has_table_privilege('authenticated','public.position_assessment_events','insert'),'no client direct event writes');
select m83_assert((select relrowsecurity from pg_class where oid='public.position_assessment_events'::regclass),'RLS stays enabled');
select m83_assert(exists(select 1 from public.position_assessment_events where event_id=m83_id('tl-legacy')),'old response event collector still accepted');
