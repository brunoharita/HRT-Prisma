-- Run after the synthetic stable-score fixture in a disposable LOCAL transaction.
create temp table recognition_before as select id,md5(evaluation_data::text) digest from public.match_evaluations;
create temp table recognition_acl as select oid,proacl from pg_proc where oid in ('private.stable_matching_sources(uuid,uuid,uuid,uuid)'::regprocedure,'public.complete_stable_matching_score(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb)'::regprocedure,'public.create_m62_verification_need(uuid,uuid,text,text)'::regprocedure);
\i supabase/migrations/20261023180000_trajectory_activity_recognition.sql

select m83_assert(not exists(select 1 from recognition_acl a join pg_proc p on p.oid=a.oid where p.proacl is distinct from a.proacl),'recognition migration preserves exact ACLs');
select m83_assert(not exists(select 1 from recognition_before b join public.match_evaluations e using(id) where b.digest<>md5(e.evaluation_data::text)),'recognition migration leaves all evaluation history immutable');
update public.matching_score_states set lease_until=now()-interval '1 day';
insert into stable_test values('recognition-claim',pg_temp.claim('profile2'));
select m83_assert((select v->>'acquired'='true' and v->'changedDependencies' ? 'trajectoryRecognition' from stable_test where k='recognition-claim'),'new method is a causal dependency, not a date invalidation');
select m83_assert((select v#>>'{sources,stableDependencies,trajectoryRecognition}'='trajectory-recognition-1.0.0' from stable_test where k='recognition-claim'),'recognition revision is recorded');
select m83_assert((select v->'match' is not null from stable_test where k='recognition-claim'),'old result is retained during method upgrade');
select m83_reject($q$select public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile2'),m83_id('v2'),(v->>'lease')::uuid,v#>'{sources,stableDependencies}',jsonb_set(pg_temp.projection('profile2'),'{score,matchingContractVersion}','"unknown"'),v->>'reason',v->'changedDependencies') from stable_test where k='recognition-claim'$q$,'22023');
insert into stable_test select 'recognition-result',public.complete_stable_matching_score(m83_id('recruiter'),m83_id('a'),m83_id('profile2'),m83_id('v2'),(v->>'lease')::uuid,v#>'{sources,stableDependencies}',jsonb_set(pg_temp.projection('profile2'),'{score,matchingContractVersion}','"vacancy-matching-explainable-5.2.0"'),v->>'reason',v->'changedDependencies') from stable_test where k='recognition-claim';
select m83_assert((select v#>>'{match,score,matchingContractVersion}'='vacancy-matching-explainable-5.2.0' from stable_test where k='recognition-result'),'new deterministic version is accepted');
select m83_assert(pg_temp.claim('profile2')->>'acquired'='false','second read preserves exact updated evaluation');
select m83_assert(not exists(select 1 from recognition_before b left join public.match_evaluations e using(id) where e.id is null or b.digest<>md5(e.evaluation_data::text)),'upgrade appends and preserves every historical evaluation');
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
select m83_assert(public.create_m62_verification_need((select (v->>'evaluationId')::uuid from stable_test where k='recognition-result'),m83_id('requirement'),'intermediate','medium')->>'needId' is not null,'new matching version preserves M62 requirement verification');
reset role;
