-- Real resolver/auth/RLS from disposable repository schema; synthetic rows only.
insert into public.competency_macro_groups(code,label,definition,sort_order) values('hard','Hard Skills','Técnicas',1);
insert into public.competency_subgroups(id,code,macro_group_code,scope,label,definition,sort_order)
 values(m83_id('h1'),'H1','hard','global','Domínios','Áreas profissionais',1);
insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance)
 values(m83_id('area'),'global','knowledge','Tecnologia da informação','approved','{}'),
 (m83_id('role'),'global','occupation','Gerente de tecnologia da informação','approved','{}'),
 (m83_id('coord'),'global','occupation','Coordenador de tecnologia da informação','approved','{}');
insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method)
 values(m83_id('area'),m83_id('h1'),1,'fixture','human_curated');
insert into public.knowledge_terms(concept_id,scope,term,normalized_term,language,term_type,status,version)
 values(m83_id('role'),'global','Gerente de TI','gerente de ti','pt-BR','alias','approved',1),
 (m83_id('role'),'global','Coordenador de TI','coordenador de ti','pt-BR','alias','approved',1),
 (m83_id('area'),'global','Tecnologia da informação','tecnologia da informacao','pt-BR','canonical','approved',1);
update public.professional_profiles set profile_data='{"areasOfExpertise":["Tecnologia da informação"],"experiences":[{"role":"Gerente de TI","organization":"Empresa sintética","period":"Jan/2024 - Atual","description":"Gestão de tecnologia da informação"}]}' where id=m83_id('profile');
-- Fixture update is not the runtime publication flow. Explicit enqueue verifies the same trigger helper.
select private.enqueue_people_directory(m83_id('profile'));
create temp table directory_state(job jsonb);
insert into directory_state select public.claim_people_directory();
-- The earlier synthetic Backend context may be claimed first: complete it, then claim the current context.
do $$declare j jsonb;begin
 select job into j from directory_state;
 if j->'input'->>'role'<>'Gerente de TI' then
   perform public.complete_people_directory((j->>'id')::uuid,(j->>'lease')::uuid,'{"areaIds":[],"functionId":null}');
   update directory_state set job=public.claim_people_directory();
 end if;
end$$;
select m83_assert((select job->'exact'->'function'->>'id'=m83_id('role')::text from directory_state),'approved exact role');
select m83_assert((select job->'exact'->'areas'->0->>'id'=m83_id('area')::text from directory_state),'approved exact area grounded in same experience');
select m83_assert(private.people_directory_level('Coordenador de TI')<>private.people_directory_level('Gerente de TI'),'never promote coordinator to manager');
select m83_assert(private.people_directory_input('{"role":"Analista financeiro"}','["Tecnologia da informação"]')->'areas'='[]','general area not applied to unrelated experience');
select m83_reject(format('select public.complete_people_directory(%L,%L,%L)',job->>'id',job->>'lease','{"areaIds":["00000000-0000-0000-0000-000000000000"],"functionId":null}'),'P0001') from directory_state;
select m83_reject(format('select public.complete_people_directory(%L,%L,%L)',job->>'id',m83_id('wrong-lease'),'{}'),'P0001') from directory_state;
select m83_assert(not public.reserve_people_directory_call((job->>'id')::uuid,(job->>'lease')::uuid,0,200),'zero cap denies') from directory_state;
select m83_assert(not public.reserve_people_directory_call((job->>'id')::uuid,(job->>'lease')::uuid,null,200),'missing cap denies') from directory_state;
select m83_assert(public.reserve_people_directory_call((job->>'id')::uuid,(job->>'lease')::uuid,1,200),'one bounded call reserved') from directory_state;
insert into public.profile_competency_normalization_runs values(m83_id('normalization'),m83_id('lease'),'processing',0,now());
select m83_assert(not public.reserve_competency_normalization_call_v2(m83_id('normalization'),m83_id('lease'),1,200),'existing competency consumer observes shared daily limit');
select public.complete_people_directory((job->>'id')::uuid,(job->>'lease')::uuid,'{"areaIds":[],"functionId":null}') from directory_state;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
set local role authenticated;
select m83_assert(public.get_people_directory(m83_id('a'))->0->>'originalRole'='Gerente de TI','directory preserves original role');
select m83_reject(format('select public.get_people_directory(%L)',m83_id('b')),'42501');
select m83_reject('select * from public.people_directory_contexts','42501');
select m83_reject('select public.claim_people_directory()','42501');
reset role;
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);
set local role authenticated;
select m83_assert(jsonb_array_length(public.get_people_directory(m83_id('a')))=1,'member reads approved professional directory');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select m83_reject(format('select public.get_people_directory(%L)',m83_id('a')),'42501');
reset role;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
update public.knowledge_concepts set status='deprecated' where id=m83_id('area');
select m83_assert(public.get_people_directory(m83_id('a'))->0->'areas'='[]','deprecated references disappear immediately');
update public.professional_profiles set superseded_at=now() where id=m83_id('profile');
select m83_assert(public.get_people_directory(m83_id('a'))='[]','superseded profile is excluded');
select m83_assert(not has_function_privilege('anon','public.get_people_directory(uuid)','execute'),'anon ACL');
select m83_assert((select relrowsecurity from pg_class where oid='public.people_directory_contexts'::regclass),'cache RLS enabled without client policies');
-- A new current snapshot with the same professional context reuses the cache.
select m83_assert(public.claim_people_directory() is null,'superseded and orphan contexts never leave backend');
update public.knowledge_concepts set status='approved' where id=m83_id('area');
update public.professional_profiles set superseded_at=null,profile_data='{"areasOfExpertise":[],"experiences":[{"role":"Coordenador de TI","organization":"Empresa sintética","period":"Jan/2024 - Atual","description":"Tecnologia da informação"}]}' where id=m83_id('profile');
delete from directory_state;insert into directory_state select public.claim_people_directory();
select m83_assert((select job->'exact'->'function'='null' from directory_state),'exact alias cannot promote coordinator to manager');
select m83_reject(format('select public.complete_people_directory(%L,%L,%L)',job->>'id',job->>'lease',jsonb_build_object('areaIds','[]'::jsonb,'functionId',m83_id('role'))),'P0001') from directory_state;
select public.complete_people_directory((job->>'id')::uuid,(job->>'lease')::uuid,jsonb_build_object('areaIds',jsonb_build_array(m83_id('area')),'functionId',m83_id('coord'))) from directory_state;
select m83_assert(public.get_people_directory(m83_id('a'))->0->'areas'->0->>'method'='ai_grouping','AI association is explicitly derived navigation');
select private.enqueue_people_directory(m83_id('profile'));
select m83_assert(public.claim_people_directory() is null,'unchanged context is not queried again');
