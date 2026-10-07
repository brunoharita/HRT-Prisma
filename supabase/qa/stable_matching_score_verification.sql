-- Synthetic two-person fixture; LOCAL disposable database transaction only.
insert into public.people(id,organization_id,full_name) values(m83_id('person2'),m83_id('a'),'Pessoa sintética 2');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at)
values(m83_id('profile2'),m83_id('a'),m83_id('person2'),'{"experiences":[{"role":"Backend developer","period":"2020 - 2022"}]}','fixture','none','none','fixture','fixture',1,'approved',now());
insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance)
values(m83_id('java'),'global','technology','Java','approved','{"fixture":true}');
insert into public.knowledge_observations(organization_id,person_id,profile_id,original_term,normalized_term,resolution_state,normalization_method,resolution_method_version,concept_id,knowledge_global_version,source_snapshot,resolved_at)
values(m83_id('a'),m83_id('person2'),m83_id('profile2'),'Java','java','resolved','global_exact','knowledge-normalization-2.0.0',m83_id('java'),1,'{}',now());
insert into public.vacancy_requirements(id,organization_id,vacancy_id,vacancy_version_id,stable_id,label,importance,category) values(m83_id('requirement'),m83_id('a'),m83_id('vacancy'),m83_id('v2'),m83_id('stable'),'SQL','required','technology');
create function pg_temp.claim(text default 'profile',boolean default false) returns jsonb language sql as $$
 select public.claim_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id($1),m83_id('v2'),$2)$$;
create function pg_temp.projection(text default 'profile',integer default 50) returns jsonb language sql as $$
 select jsonb_build_object('score',jsonb_build_object('profileVersion',m83_id($1),'positionVersion',m83_id('v2'),
 'scoreContractVersion','matching-score-1.4.0','matchingContractVersion','vacancy-matching-explainable-5.1.0','score',$2,'referenceDate','2026-10-07'),
 'requirements',jsonb_build_array(jsonb_build_object('requirement',jsonb_build_object('stableId',m83_id('stable'),'label','SQL'),'status','no_evidence','explanation','Synthetic evidence missing','evidence','[]'::jsonb)),'discoveryGroup','main_area')$$;
create function pg_temp.complete(c jsonb,p text default 'profile',points integer default 50) returns jsonb language sql as $$
 select public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id(p),m83_id('v2'),(c->>'lease')::uuid,
 c#>'{sources,stableDependencies}',pg_temp.projection(p,points),c->>'reason',c->'changedDependencies')$$;
create temp table stable_test(k text primary key,v jsonb);
grant all on stable_test to service_role,authenticated;
set local role service_role;
insert into stable_test values('a',pg_temp.claim()),('b',pg_temp.claim('profile2'));
select m83_assert((select (v->>'acquired')::boolean from stable_test where k='a'),'initial calculation acquires lease');
select m83_assert(pg_temp.claim()->>'acquired'='false','concurrent load cannot calculate twice');
insert into stable_test values('a-result',pg_temp.complete((select v from stable_test where k='a'))),('b-result',pg_temp.complete((select v from stable_test where k='b'),'profile2',60));
select m83_assert(pg_temp.claim()->>'evaluationId'=(select v->>'evaluationId' from stable_test where k='a-result'),'reload returns original evaluation ID');
select m83_assert(pg_temp.claim()->'match'=(select v->'match' from stable_test where k='a-result'),'reload returns exact score and reference date');
select m83_assert(pg_temp.claim()->>'calculatedAt'=(select v->>'calculatedAt' from stable_test where k='a-result'),'calculation timestamp remains exact');
select m83_assert(pg_temp.claim()->>'acquired'='false','reading result never recomputes');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_assert(public.create_m62_verification_need((select (v->>'evaluationId')::uuid from stable_test where k='a-result'),m83_id('requirement'),'intermediate','medium')->>'needId' is not null,'stable snapshot preserves contextual verification journey');
reset role;
-- Software/global Knowledge counters alone do not enter dependency signature.
select m83_assert(not(private.stable_matching_sources(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'))->'stableDependencies' ? 'knowledgeGlobalVersion'),'global counters excluded');
-- Mutate only Person A, preserving B completely.
update public.professional_profiles set profile_data=jsonb_set(profile_data,'{professionalTitle}','"Backend specialist"') where id=m83_id('profile');
set local role service_role;
insert into stable_test values('a-change',pg_temp.claim());
select m83_assert((select v->>'reason'='dependencies_changed' and v->'changedDependencies' ? 'profile' from stable_test where k='a-change'),'profile change is causal trigger');
select m83_assert((select v->'match'=(select v->'match' from stable_test where k='a-result') from stable_test where k='a-change'),'previous result retained while updating');
select m83_assert(pg_temp.claim('profile2')->>'evaluationId'=(select v->>'evaluationId' from stable_test where k='b-result'),'other person unchanged by A');
select pg_temp.complete((select v from stable_test where k='a-change'),'profile',55);
select m83_assert(pg_temp.claim()->'match'->'score'->>'score'='55','new completed result published atomically');
reset role;
select m83_assert((select count(*)=2 from public.match_evaluations where person_id=m83_id('person') and evaluation_data ? 'stableAudit'),'history retained');
set local role service_role;
insert into stable_test values('explicit',pg_temp.claim('profile',true));
select m83_assert((select v->>'reason'='explicit_recalculation' from stable_test where k='explicit'),'explicit recalculation allowed');
select public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),
 (select (v->>'lease')::uuid from stable_test where k='explicit'),(select v#>'{sources,stableDependencies}' from stable_test where k='explicit'),null,'explicit_recalculation','[]');
select m83_assert(pg_temp.claim()->'match'->'score'->>'score'='55','failed recalculation preserves prior score');
reset role;
-- Unrelated concept changes never trigger either Person.
insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance)
values(m83_id('unrelated'),'global','technology','Unrelated tool','approved','{"fixture":true}');
set local role service_role;
select m83_assert(pg_temp.claim('profile2')->>'acquired'='false','unrelated Knowledge change preserves result');
reset role;
update public.knowledge_concepts set canonical_label='Java updated' where id=m83_id('java');
set local role service_role;
insert into stable_test values('knowledge',pg_temp.claim('profile2'));
select m83_assert((select v->'changedDependencies' ? 'knowledge' from stable_test where k='knowledge'),'linked Knowledge change triggers affected person');
select pg_temp.complete((select v from stable_test where k='knowledge'),'profile2',61);
select m83_assert(pg_temp.claim()->>'acquired'='false','Knowledge linked to B does not change A');
reset role;
-- A contextual review on A is a dependency of A only.
insert into public.matching_trajectory_assessments(id,organization_id,profile_id,vacancy_version_id,input_hash,method_version,prompt_version,model_version,source_versions,minimized_context,status,reading,human_review_id)
values(m83_id('human-analysis'),m83_id('a'),m83_id('profile'),m83_id('v2'),repeat('a',64),'trajectory-position-2.0.0','trajectory-evidence-2.1.0','fixture','{}','{}','complete','{"items":[]}',m83_id('human-review'));
set local role service_role;
insert into stable_test values('review',pg_temp.claim());
select m83_assert((select v->'changedDependencies' ? 'decision' from stable_test where k='review'),'human review updates only its contextual dependency');
select pg_temp.complete((select v from stable_test where k='review'),'profile',55);
select m83_assert(pg_temp.claim('profile2')->>'acquired'='false','reviewing A leaves B evaluation untouched');
reset role;
update public.vacancy_versions set mission='Changed position item' where id=m83_id('v2');
set local role service_role;
insert into stable_test values('position-a',pg_temp.claim()),('position-b',pg_temp.claim('profile2'));
select m83_assert((select v->'changedDependencies' ? 'position' from stable_test where k='position-b'),'position change affects all directly linked evaluations');
select pg_temp.complete((select v from stable_test where k='position-a'),'profile',55);
select pg_temp.complete((select v from stable_test where k='position-b'),'profile2',62);
reset role;
-- Evidence is a causal input; an expiry crossed by the clock is not.
reset role;
set local session_replication_role=replica;
insert into public.competency_demonstrated_evidence(id,organization_id,person_id,competency_key,verification_need_id,prepared_assessment_id,attempt_id,evaluation_id,
 verification_definition_id,verification_definition_version,blueprint_id,blueprint_version,rubric_id,rubric_version,evaluation_version,integrity_rule_version,
 demonstrated_level,raw_result,dimension_results,coverage_state,methodological_quality,integrity_state,confidence_state,reason_codes,verified_at,valid_until,status,provenance)
 values(m83_id('snapshot-demonstrated'),m83_id('a'),m83_id('person'),'APIs',m83_id('need-placeholder'),m83_id('prepared-placeholder'),m83_id('attempt-placeholder'),m83_id('evaluation-placeholder'),
 m83_id('definition-placeholder'),'1.0.0',m83_id('blueprint-placeholder'),'1.0.0',m83_id('rubric-placeholder'),'1.0.0','1.0.0','1.0.0',
 'intermediate','{}','{}','complete','sufficient','valid','high','[]',now(),now()-interval '1 day','active','{"fixture":true}');
set local session_replication_role=origin;
set local role service_role;
insert into stable_test values('evidence',pg_temp.claim());
select m83_assert((select v->'changedDependencies' ? 'evidence' from stable_test where k='evidence'),'new demonstrated evidence triggers only its person');
select m83_assert((select jsonb_array_length(v#>'{sources,demonstratedEvidence}')=1 from stable_test where k='evidence'),'expired evidence remains in dependency identity to prevent clock invalidation');
select pg_temp.complete((select v from stable_test where k='evidence'),'profile',55);
select m83_assert(pg_temp.claim()->>'acquired'='false','expired evidence does not cause repeated recalculation');
select m83_assert(pg_temp.claim('profile2')->>'acquired'='false','evidence on A does not change B');
-- Unknown contracts and forged identity cannot complete a current lease.
insert into stable_test values('invalid',pg_temp.claim('profile2',true));
select m83_reject($q$select public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile2'),m83_id('v2'),(select (v->>'lease')::uuid from stable_test where k='invalid'),(select v#>'{sources,stableDependencies}' from stable_test where k='invalid'),jsonb_set(pg_temp.projection('profile2'),'{score,scoreContractVersion}','"unknown"'),'explicit_recalculation','[]')$q$,'22023');
select m83_reject($q$select public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile2'),m83_id('v2'),(select (v->>'lease')::uuid from stable_test where k='invalid'),(select v#>'{sources,stableDependencies}' from stable_test where k='invalid'),pg_temp.projection('profile'),'explicit_recalculation','[]')$q$,'22023');
reset role;
update public.matching_score_states set lease_until=now()-interval '1 second' where person_id=m83_id('person2');
set local role service_role;
select m83_reject($q$select pg_temp.complete((select v from stable_test where k='invalid'),'profile2',99)$q$,'40001');
select m83_assert(pg_temp.claim('profile2')->'match'->'score'->>'score'='62','expired lease cannot overwrite saved result');

reset role;
-- Source change during work rejects stale completion, with no new history.
update public.professional_profiles set profile_data=jsonb_set(profile_data,'{professionalTitle}','"Another direct change"') where id=m83_id('profile');
set local role service_role;
insert into stable_test values('stale',pg_temp.claim());
reset role;
update public.professional_profiles set profile_data=jsonb_set(profile_data,'{professionalTitle}','"Changed during work"') where id=m83_id('profile');
set local role service_role;
select m83_reject($q$select pg_temp.complete((select v from stable_test where k='stale'),'profile',99)$q$,'40001');
select m83_assert(pg_temp.claim()->'match'->'score'->>'score'='55','stale completion cannot replace valid score');
select m83_reject($q$select public.claim_stable_matching_score(m83_id('member'),m83_id('a'),m83_id('profile2'),m83_id('v2'),true)$q$,'42501');
select m83_reject($q$select public.claim_stable_matching_score(m83_id('outsider'),m83_id('a'),m83_id('profile2'),m83_id('v2'),false)$q$,'42501');
select m83_reject('select * from public.matching_score_states','42501');
select m83_reject($q$delete from public.match_evaluations where evaluation_data ? 'stableAudit'$q$,'42501');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_reject($q$select public.claim_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),false)$q$,'42501');
select m83_reject('select * from public.matching_score_states','42501');
reset role;
select m83_reject($q$update public.match_evaluations set evaluation_data=evaluation_data where evaluation_data ? 'stableAudit'$q$,'42501');
select m83_assert((select relrowsecurity from pg_class where oid='public.matching_score_states'::regclass),'stable pointer RLS enabled');
