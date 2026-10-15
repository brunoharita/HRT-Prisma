-- Disposable localhost only; production is never used for fixture mutations.
insert into auth.users(id,email) values(m83_id('admin'),'admin@example.invalid'),(m83_id('super'),'super@example.invalid');
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,status,group_id)
 values(m83_id('platform-admin'),m83_id('admin'),'Admin sintético','area-admin','admin@example.invalid','admin','active',m83_id('group')),
 (m83_id('platform-super'),m83_id('super'),'Super sintético','area-super','super@example.invalid','super_admin','active',null);
insert into public.organization_memberships(organization_id,user_id,role) values(m83_id('a'),m83_id('admin'),'admin');
create temp table area_state(key text primary key,value jsonb);grant all on area_state to authenticated;
select m83_assert((select count(*)=16 from public.knowledge_concepts where concept_type='professional_area' and scope='global'),'16 initial macroareas; no H1 retyping');
select set_config('request.jwt.claim.sub',m83_id('admin')::text,true);
set local role authenticated;
insert into area_state values('local',to_jsonb(public.save_professional_area(m83_id('a'),null,'Experiência do Colaborador','Atuação sintética de RH','["Employee Experience"]',true,null)));
select m83_assert(public.get_professional_areas(m83_id('a'))->'options' @> '[{"label":"Experiência do Colaborador","scope":"organization"}]','local available immediately');
select m83_reject($q$select public.save_professional_area(null,null,'Global indevida','','[]',true,null)$q$,'42501');
select m83_reject(format('select public.save_professional_area(%L,null,''Outra empresa'','''',''[]'',true,null)',m83_id('b')),'42501');
select m83_reject(format('select public.get_professional_areas(%L)',m83_id('b')),'42501');
select m83_reject(format('select public.save_professional_area(%L,null,''Experiência do Colaborador'','''',''[]'',true,null)',m83_id('a')),'23505');
select m83_reject(format('select public.save_professional_area(%L,null,''RH contato'',''pessoa@example.invalid'',''[]'',true,null)',m83_id('a')),'22023');
select m83_assert((select count(*)=0 from public.knowledge_proposals),'company cannot read global contribution queue');
reset role;
insert into area_state select 'proposal',to_jsonb(id) from public.knowledge_proposals where origin_organization_id=m83_id('a') and status='awaiting_human_review';
select m83_assert((select count(*)=1 from public.knowledge_proposals where origin_organization_id=m83_id('a')),'one separate global contribution');
select set_config('request.jwt.claim.sub',m83_id('admin')::text,true);set local role authenticated;
select m83_reject(format('select public.review_professional_area_contribution(%L,''approved'',null,''X'','''',''[]'',''Tentativa indevida'')',(select value#>>'{}' from area_state where key='proposal')),'42501');
reset role;
select set_config('request.jwt.claim.sub',m83_id('super')::text,true);set local role authenticated;
insert into area_state values('global',to_jsonb(public.save_professional_area(null,null,'Área Global Sintética','Descrição global','["Global Example"]',true,null)));
select public.review_professional_area_contribution((select (value#>>'{}')::uuid from area_state where key='proposal'),'approved',(select (value#>>'{}')::uuid from area_state where key='global'),'','','[]','Equivalência decidida pelo administrador');
reset role;
select m83_assert((select status='approved' and version=1 from public.knowledge_concepts where id=(select (value#>>'{}')::uuid from area_state where key='local')),'global association preserves local ID/version/status');
select m83_assert((select count(*)=1 from public.knowledge_approvals where proposal_id=(select (value#>>'{}')::uuid from area_state where key='proposal')),'global decision is audited');
select set_config('request.jwt.claim.sub',m83_id('admin')::text,true);set local role authenticated;
select public.save_professional_area(m83_id('a'),(select (value#>>'{}')::uuid from area_state where key='local'),'Experiência de Pessoas','Descrição revisada','["People Experience"]',true,1);
select m83_reject(format('select public.save_professional_area(%L,%L,''Versão antiga'','''',''[]'',true,1)',m83_id('a'),(select value#>>'{}' from area_state where key='local')),'40001');
reset role;
select m83_assert((select version=2 from public.knowledge_concepts where id=(select (value#>>'{}')::uuid from area_state where key='local')),'edit preserves ID and increments version');
select m83_assert((select count(*)=2 from public.knowledge_proposals where origin_organization_id=m83_id('a')),'edit produces new contribution; old decision immutable');
select m83_assert((select count(*)=2 from public.knowledge_approvals a join public.knowledge_proposals p on p.id=a.proposal_id where p.published_concept_id=(select (value#>>'{}')::uuid from area_state where key='local')),'local history keeps previous snapshot');
select set_config('request.jwt.claim.sub',m83_id('super')::text,true);set local role authenticated;
select public.review_professional_area_contribution((select p.id from public.knowledge_proposals p where p.origin_organization_id=m83_id('a') and p.status='awaiting_human_review'),'deferred',null,'','','[]','Manter somente na base local');
reset role;
select m83_assert((select version=2 and status='approved' from public.knowledge_concepts where id=(select (value#>>'{}')::uuid from area_state where key='local')),'defer keeps local usable');
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);set local role authenticated;
insert into area_state select 'review',to_jsonb(r) from public.start_manual_profile_review(m83_id('a'),null,'{"fullName":"Pessoa Área Sintética","email":"area@example.invalid"}',false,'area-manual-fixture-01') r;
insert into area_state select 'draft',reviewed_data from public.profile_reviews where id=(select (value->>'review_id')::uuid from area_state where key='review');
select public.save_profile_review(m83_id('a'),(select (value->>'review_id')::uuid from area_state where key='review'),1,
 (select value||jsonb_build_object('professionalTitle','HRBP','areasOfExpertise','["Talent Acquisition"]'::jsonb,'professionalAreaIds',jsonb_build_array((select value#>>'{}' from area_state where key='local')),'professionalAreaLabels','["Nome forjado"]'::jsonb) from area_state where key='draft'),'Área declarada','area-save-fixture-01');
select m83_assert((select reviewed_data->'professionalAreaLabels'='["Experiência de Pessoas"]' from public.profile_reviews where id=(select (value->>'review_id')::uuid from area_state where key='review')),'labels canonicalized server-side');
select m83_assert((select reviewed_data->'areasOfExpertise'='["Talent Acquisition"]' from public.profile_reviews where id=(select (value->>'review_id')::uuid from area_state where key='review')),'original areas preserved independently');
select m83_reject(format('select public.save_profile_review(%L,%L,2,%L,''Área inválida'',''area-save-bad-id'')',m83_id('a'),(select value->>'review_id' from area_state where key='review'),(select value||jsonb_build_object('professionalAreaIds',jsonb_build_array(m83_id('not-an-area'))) from area_state where key='draft')),'42501');
select * from public.publish_profile_review(m83_id('a'),(select (value->>'review_id')::uuid from area_state where key='review'),2,'merge','[]','area-publication-01');
select m83_assert(public.get_people_professional_areas(m83_id('a')) @> jsonb_build_array(jsonb_build_object('personId',(select value->>'person_id' from area_state where key='review'),'areas',jsonb_build_array(jsonb_build_object('label','Experiência de Pessoas','method','human_confirmed')))),'human selection published without any experience');
reset role;
-- Existing Profile can be classified, but never rewritten by AI.
update public.professional_profiles set profile_data='{"professionalTitle":"HRBP","areasOfExpertise":["RH"],"experiences":[]}' where id=m83_id('profile');
select private.enqueue_people_directory(m83_id('profile'));
insert into area_state values('job',public.claim_people_directory());
select m83_assert((select value->'input'->>'kind'='profile_area' from area_state where key='job'),'macroarea jobs prioritized over function backlog');
select m83_assert((select value->'exact'->'areas' @> jsonb_build_array(jsonb_build_object('id',(select id from public.knowledge_concepts where concept_type='professional_area' and canonical_label='Recursos Humanos'))) from area_state where key='job'),'RH exact alias resolves only macroarea');
select m83_assert((select count(*)=0 from jsonb_to_recordset((select value->'candidates' from area_state where key='job')) c(id uuid) join public.knowledge_concepts k on k.id=c.id where k.concept_type<>'professional_area'),'IA candidates contain only macroareas');
select public.complete_people_directory((value->>'id')::uuid,(value->>'lease')::uuid,'{"areaIds":[],"functionId":null}') from area_state where key='job';
select m83_assert(private.read_professional_areas(m83_id('a'),'{"professionalTitle":"HRBP","areasOfExpertise":["RH"],"experiences":[]}')->0->>'label'='Recursos Humanos','classification exposed as derived grouping');
select m83_assert(private.read_professional_areas(m83_id('a'),'{"professionalTitle":"HRBP","areasOfExpertise":["RH"],"professionalAreaIds":[],"experiences":[]}')='[]','explicit empty human selection wins over inference');
select m83_assert((select not profile_data ? 'professionalAreaIds' from public.professional_profiles where id=m83_id('profile')),'AI never changes published Profile');
select m83_assert(not private.people_directory_allowed(m83_id('b'),(select (value#>>'{}')::uuid from area_state where key='local'),'area'),'local area cannot be a different tenant candidate');
select m83_assert((select input->>'context' not like '%Employer secret%' from public.people_directory_contexts where input->>'kind'='profile_area' limit 1),'employer not in provider input');
select m83_assert((select count(*)=0 from public.people_directory_contexts where input->>'role'='HRBP' and input->>'kind'='profile_area' and exists(select 1 from public.profile_reviews r where r.source_kind='manual' and r.reviewed_data->>'professionalTitle'='HRBP' and not r.reviewed_data ? 'professionalAreaIds')),'manual draft does not enqueue AI');
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);set local role authenticated;
select m83_reject(format('select public.save_professional_area(%L,null,''Não autorizado'','''',''[]'',true,null)',m83_id('a')),'42501');
select m83_reject(format('select public.get_people_professional_areas(%L)',m83_id('b')),'42501');
reset role;
select m83_assert(not has_function_privilege('anon','public.get_professional_areas(uuid,uuid)','execute'),'anonymous cannot read catalog');
select m83_assert(not has_function_privilege('authenticated','public.claim_people_directory()','execute'),'worker remains service-only');

select m83_assert((select resolution_state='unresolved' from public.resolve_knowledge_term_v2(m83_id('a'),'RH','pt-BR')),'macroarea is not a generic competency alias');
select m83_assert(not exists(select 1 from public.suggest_knowledge_concepts(m83_id('a'),'RH',8) where concept_type='professional_area'),'generic competency suggestions exclude macroareas');
select set_config('request.jwt.claim.sub',m83_id('admin')::text,true);set local role authenticated;
select public.save_professional_area(m83_id('a'),(select (value#>>'{}')::uuid from area_state where key='local'),'Experiência de Pessoas','Descrição revisada','["People Experience"]',false,2);
reset role;
select m83_assert(private.read_professional_areas(m83_id('a'),jsonb_build_object('professionalAreaIds',jsonb_build_array((select value#>>'{}' from area_state where key='local'))))->0->>'active'='false','deactivation preserves historical human selection');
select m83_assert(not private.people_directory_allowed(m83_id('a'),(select (value#>>'{}')::uuid from area_state where key='local'),'area'),'inactive area excluded from AI candidates');
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);set local role authenticated;
insert into area_state select 'update-review',to_jsonb(r) from public.start_manual_profile_review(m83_id('a'),(select (value->>'person_id')::uuid from area_state where key='review'),'{}',false,'area-manual-update-01') r;
select m83_assert((select reviewed_data->'professionalAreaIds'=jsonb_build_array((select value#>>'{}' from area_state where key='local')) from public.profile_reviews where id=(select (value->>'review_id')::uuid from area_state where key='update-review')),'prefill retains selected inactive historical area');
select public.save_profile_review(m83_id('a'),(select (value->>'review_id')::uuid from area_state where key='update-review'),1,
 (select reviewed_data||'{"professionalAreaIds":[]}'::jsonb from public.profile_reviews where id=(select (value->>'review_id')::uuid from area_state where key='update-review')),'Limpeza humana explícita','area-clear-selection-01');
select * from public.publish_profile_review(m83_id('a'),(select (value->>'review_id')::uuid from area_state where key='update-review'),2,'merge','[]','area-clear-publish-01');
select m83_assert(public.get_people_professional_areas(m83_id('a')) @> jsonb_build_array(jsonb_build_object('personId',(select value->>'person_id' from area_state where key='review'),'areas','[]'::jsonb)),'explicit empty human selection survives publication and merge');
reset role;
select m83_assert((select count(*)=0 from public.people_directory_contexts where input->>'kind'='profile_area' and input->>'role'='HRBP' and input->'areas'='["Talent Acquisition"]'),'manual save and publication never enqueue macroarea AI');

select m83_assert(private.resolve_normalized_competency(m83_id('a'),'RH','["RH"]')->>'state'='unresolved','macroarea never becomes normalized competency evidence');
insert into public.competency_macro_groups(code,label,definition,sort_order) values('hard','Hard Skills','Técnicas',1);
insert into public.competency_subgroups(id,code,macro_group_code,scope,label,definition,sort_order) values(m83_id('h1'),'H1','hard','global','Domínios','Domínios de competências',1);
select m83_reject(format('insert into public.knowledge_competency_classifications(concept_id,subgroup_id,version,taxonomy_version,method) values(%L,%L,1,''fixture'',''human_curated'')',(select id from public.knowledge_concepts where concept_type='professional_area' and canonical_label='Recursos Humanos'),m83_id('h1')),'22023');

insert into area_state values('stale-job',public.claim_people_directory());
select m83_assert((select value->'input'->>'kind'='profile_area' from area_state where key='stale-job'),'reclassification job uses macroarea context');
select m83_reject(format('select public.complete_people_directory(%L,%L,%L)',value->>'id',value->>'lease','{"areaIds":["00000000-0000-0000-0000-000000000000"],"functionId":null}'),'P0001') from area_state where key='stale-job';
select m83_assert(not public.reserve_people_directory_call((value->>'id')::uuid,(value->>'lease')::uuid,0,200),'macroarea respects same zero daily cap') from area_state where key='stale-job';
update public.professional_profiles set profile_data=profile_data||'{"professionalAreaIds":[]}'::jsonb where id=m83_id('profile');
select public.complete_people_directory((value->>'id')::uuid,(value->>'lease')::uuid,'{"areaIds":[],"functionId":null}') from area_state where key='stale-job';
select m83_assert((select c.error_code='SOURCE_CHANGED' from public.people_directory_contexts c join area_state s on c.id=(s.value->>'id')::uuid where s.key='stale-job'),'human change during AI invalidates completion');
delete from public.professional_profiles where id=m83_id('profile');
select m83_assert(not exists(select 1 from public.people_directory_contexts where input->>'kind'='profile_area'),'deleting final source purges private derived cache');

insert into public.profile_reviews(id,organization_id,person_id,source_kind,source_document_snapshot,extracted_data,reviewed_data,started_by_auth_user_id,last_edited_by_auth_user_id)
select m83_id('import-review'),m83_id('a'),m83_id('person'),'document','{"filename":"fixture.pdf"}',jsonb_build_object('professionalAreaIds',jsonb_build_array((select value#>>'{}' from area_state where key='global'))),jsonb_build_object('professionalAreaIds',jsonb_build_array((select value#>>'{}' from area_state where key='global'))),m83_id('recruiter'),m83_id('recruiter');
select m83_assert((select not reviewed_data ? 'professionalAreaIds' from public.profile_reviews where id=m83_id('import-review')),'extraction cannot create a human-confirmed area selection');
