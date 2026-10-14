-- Run after the existing synthetic assessment baseline; LOCAL rollback only.
reset role;
create temp table sp_baseline as select jsonb_build_object(
 'assessments',(select jsonb_agg(to_jsonb(a) order by id) from public.position_assessments a),
 'attempts',(select jsonb_agg(to_jsonb(a) order by id) from public.position_assessment_attempts a),
 'scores',(select jsonb_agg(to_jsonb(a) order by id) from public.match_evaluations a),
 'profiles',(select jsonb_agg(to_jsonb(a) order by id) from public.professional_profiles a)) value;
insert into public.positions(id,organization_id,job_role_id,status,title) values
 (m83_id('sp-pos'),m83_id('a'),m83_id('role'),'vacant','Desenvolvedor backend');
insert into public.vacancies(id,organization_id,job_role_id,position_id,title,status,current_version_id) values
 (m83_id('sp-vac'),m83_id('a'),m83_id('role'),m83_id('sp-pos'),'Desenvolvedor backend','open',null);
insert into public.vacancy_versions(id,organization_id,vacancy_id,version,title,source_kind) values
 (m83_id('sp-ver'),m83_id('a'),m83_id('sp-vac'),1,'Desenvolvedor backend','manual');
update public.vacancies set current_version_id=m83_id('sp-ver') where id=m83_id('sp-vac');
create temp table sp_result(value jsonb);grant all on sp_result to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);
select m83_reject(format('select public.get_selection_process_workspace(%L)',m83_id('a')),'42501');
select m83_reject(format('select public.get_selection_process_positions(%L)',m83_id('a')),'42501');
select m83_reject(format('select public.start_position_selection_process(%L,%L,null,null,%L)',m83_id('a'),m83_id('sp-vac'),m83_id('sp-req')),'42501');
select set_config('request.jwt.claim.sub',m83_id('outsider')::text,true);
select m83_reject(format('select public.get_selection_process_workspace(%L)',m83_id('a')),'42501');
select set_config('request.jwt.claim.sub',m83_id('inactive')::text,true);
select m83_reject(format('select public.get_selection_process_positions(%L)',m83_id('a')),'42501');
select set_config('request.jwt.claim.sub','',true);
select m83_reject(format('select public.get_selection_process_workspace(%L)',m83_id('a')),'42501');
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_reject(format('select public.get_selection_process_workspace(%L)',m83_id('b')),'42501');
select m83_assert(public.get_selection_process_workspace(m83_id('a'))->>'contract'='selection-process-management-1.0.0','versioned operator envelope');
select m83_reject(format('select public.get_selection_process_workspace(%L,''x'',''paused'')',m83_id('a')),'22023');
select m83_reject(format('select public.get_selection_process_positions(%L,'''',-1)',m83_id('a')),'22023');
select m83_reject(format('select public.start_position_selection_process(%L,%L,null,null,%L)',m83_id('a'),m83_id('unknown-vac'),m83_id('sp-req')),'42501');
select m83_reject(format('select public.start_position_selection_process(%L,%L,null,null,null)',m83_id('a'),m83_id('sp-vac')),'22023');
select m83_assert(exists(select 1 from jsonb_array_elements(public.get_selection_process_positions(m83_id('a'))->'positions') p where p->>'id'=m83_id('sp-vac')::text),'eligible vacant position is selectable');
select m83_reject(format('select public.mutate_position_follow_up(%L,%L,''add'',%L,null,%L::jsonb)',m83_id('a'),m83_id('sp-vac'),m83_id('person'),jsonb_build_object('profileId',m83_id('profile'),'positionId',m83_id('sp-ver'))),'22023');
select m83_assert(public.get_position_follow_up(m83_id('a'),m83_id('sp-vac'))->'process'='null','implicit inclusion never creates a cycle');
insert into sp_result select public.start_position_selection_process(m83_id('a'),m83_id('sp-vac'),null,null,m83_id('sp-req'));
select m83_assert((select value#>>'{process,status}'='active' and jsonb_array_length(value->'entries')=0 from sp_result),'explicit first process is empty and active');
select m83_assert(public.start_position_selection_process(m83_id('a'),m83_id('sp-vac'),null,null,m83_id('sp-req'))#>>'{process,id}'=(select value#>>'{process,id}' from sp_result),'same request reuses exact cycle');
select m83_reject(format('select public.start_position_selection_process(%L,%L,null,null,%L)',m83_id('a'),m83_id('sp-vac'),m83_id('sp-distinct')),'40001');
select m83_reject(format('select public.start_position_selection_process(%L,%L,%L,1,%L)',m83_id('a'),m83_id('sp-vac'),(select value#>>'{process,id}' from sp_result),m83_id('sp-distinct')),'22023');
select m83_assert(not exists(select 1 from jsonb_array_elements(public.get_selection_process_positions(m83_id('a'))->'positions') p where p->>'id'=m83_id('sp-vac')::text),'active position excluded from new selection');
select m83_assert(public.get_selection_process_workspace(m83_id('a'),'Desenvolvedor backend','active')->>'total'='1','server search and status scope');
select m83_assert(public.get_selection_process_workspace(m83_id('a'),'Desenvolvedor backend','active',50)->'processes'='[]','pagination is bounded and explicit');
select m83_reject(format('select public.get_selection_process_workspace(%L,'''',''all'',0,%L)',m83_id('b'),(select value#>>'{process,id}' from sp_result)),'42501');
select m83_assert(public.mutate_position_follow_up_process(m83_id('a'),m83_id('sp-vac'),(select (value#>>'{process,id}')::uuid from sp_result),'add',m83_id('person'),null,jsonb_build_object('profileId',m83_id('profile'),'positionId',m83_id('sp-ver')))->'entries' is not null,'existing add writer works only after explicit creation');
select m83_assert(public.get_selection_process_workspace(m83_id('a'),'Desenvolvedor backend')->'processes'->0->>'candidates'='1','summary counts actual membership');
select m83_assert(public.get_selection_process_workspace(m83_id('a'),'Desenvolvedor backend')->'processes'->0->'stages'->>'awaiting_evaluation'='1','legacy initial stages grouped');
delete from sp_result;
insert into sp_result select public.get_position_follow_up(m83_id('a'),m83_id('sp-vac'));
select public.mutate_position_follow_up_process(m83_id('a'),m83_id('sp-vac'),(select (value#>>'{process,id}')::uuid from sp_result),'close_process',null,(select (value#>>'{process,revision}')::integer from sp_result));
reset role;
select m83_assert((select status='vacant' from public.positions where id=m83_id('sp-pos')),'closing does not occupy position');
update public.positions set status='occupied',occupant_person_id=m83_id('person') where id=m83_id('sp-pos');
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_reject(format('select public.start_position_selection_process(%L,%L,%L,%s,%L)',m83_id('a'),m83_id('sp-vac'),(select value#>>'{process,id}' from sp_result),(select (value#>>'{process,revision}')::integer+1 from sp_result),m83_id('sp-next')),'22023');
select m83_reject(format('select public.mutate_position_follow_up_process(%L,%L,%L,''reopen_process'',null,%s)',m83_id('a'),m83_id('sp-vac'),(select value#>>'{process,id}' from sp_result),(select (value#>>'{process,revision}')::integer+1 from sp_result)),'22023');
select m83_assert(not exists(select 1 from jsonb_array_elements(public.get_selection_process_positions(m83_id('a'))->'positions') p where p->>'id'=m83_id('sp-vac')::text),'occupied position excluded');
reset role;
update public.positions set status='vacant',occupant_person_id=null where id=m83_id('sp-pos');
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_assert(public.start_position_selection_process(m83_id('a'),m83_id('sp-vac'),(select (value#>>'{process,id}')::uuid from sp_result),(select (value#>>'{process,revision}')::integer+1 from sp_result),m83_id('sp-next'))#>>'{process,sequence}'='2','new empty cycle after closure');
select m83_assert(jsonb_array_length(public.get_position_follow_up_process(m83_id('a'),m83_id('sp-vac'),(select (value#>>'{process,id}')::uuid from sp_result))->'entries')=1,'history retains prior candidate');
select m83_assert(public.start_position_selection_process(m83_id('a'),m83_id('sp-vac'),null,null,m83_id('sp-req'))#>>'{process,isCurrent}'='false','replay of old request returns exact historic cycle');
select m83_reject(format('select public.mutate_position_follow_up_process(%L,%L,%L,''reopen_process'',null,3)',m83_id('a'),m83_id('sp-vac'),(select value#>>'{process,id}' from sp_result)),'40001');
reset role;
select m83_assert((select count(*)=1 from public.position_evaluation_processes where organization_id=m83_id('a') and vacancy_id=m83_id('sp-vac') and status='active'),'only one active cycle');
select m83_assert((select count(*)=2 from public.position_evaluation_history h join public.position_evaluation_processes p on p.id=h.process_id where p.vacancy_id=m83_id('sp-vac') and h.action='start_process'),'one audit per creation, replay adds none');
select m83_assert((select value from sp_baseline)=jsonb_build_object(
 'assessments',(select jsonb_agg(to_jsonb(a) order by id) from public.position_assessments a),
 'attempts',(select jsonb_agg(to_jsonb(a) order by id) from public.position_assessment_attempts a),
 'scores',(select jsonb_agg(to_jsonb(a) order by id) from public.match_evaluations a),
 'profiles',(select jsonb_agg(to_jsonb(a) order by id) from public.professional_profiles a)),'assessments attempts scores profiles preserved');
select m83_assert(not has_function_privilege('anon','public.get_selection_process_workspace(uuid,text,text,integer,uuid,uuid)','execute'),'anon cannot list');
select m83_assert(not has_function_privilege('service_role','public.get_selection_process_positions(uuid,text,integer)','execute'),'worker gains no operator permission');
select m83_assert(not has_table_privilege('authenticated','public.position_evaluation_processes','insert'),'no direct client writes');
select m83_assert((select relrowsecurity from pg_class where oid='public.position_evaluation_processes'::regclass),'RLS retained');
