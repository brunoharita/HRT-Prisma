-- Synthetic fixture; the harness wraps migration and verification in one rollback.
create function public.m83_id(text) returns uuid language sql immutable as $$select md5('m83-'||$1)::uuid$$;
create function public.m83_assert(boolean,text) returns void language plpgsql as $$begin
  if $1 is distinct from true then raise exception 'M83 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end$$;
create function public.m83_reject(text,text) returns void language plpgsql as $$begin
  begin execute $1; exception when others then if sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate;return;end if;raise;end;
  raise exception 'M83 FAIL expected denial';end$$;
insert into public.organization_groups(id,name,slug) values(m83_id('group'),'M83 synthetic','m83-synthetic');
insert into public.organizations(id,name,group_id) values(m83_id('a'),'M83 A',m83_id('group')),(m83_id('b'),'M83 B',m83_id('group'));
insert into auth.users(id,email) select m83_id(u),u||'@example.invalid' from unnest(array['recruiter','member','outsider','inactive']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m83_id('platform-'||u),m83_id(u),'Synthetic '||u,'m83-'||u,u||'@example.invalid',
  (case when u='inactive' then 'recruiter' when u='outsider' then 'member' else u end)::public.membership_role,m83_id('group'),
  (case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
from unnest(array['recruiter','member','outsider','inactive']) u;
insert into public.organization_memberships(organization_id,user_id,role) values
 (m83_id('a'),m83_id('recruiter'),'recruiter'),(m83_id('a'),m83_id('member'),'member'),
 (m83_id('a'),m83_id('inactive'),'recruiter'),(m83_id('b'),m83_id('outsider'),'member');
insert into public.people(id,organization_id,full_name) values(m83_id('person'),m83_id('a'),'Pessoa sintética');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,superseded_at)
 values(m83_id('old'),m83_id('a'),m83_id('person'),'{}','fixture','none','none','fixture','fixture',1,'approved',now(),now()),
 (m83_id('profile'),m83_id('a'),m83_id('person'),'{"experiences":[{"organization":"Employer secret","role":"Backend developer","description":"Built APIs"}]}','fixture','none','none','fixture','fixture',2,'approved',now(),null);
insert into public.job_roles(id,organization_id,name) values(m83_id('role'),m83_id('a'),'Backend developer');
insert into public.vacancies(id,organization_id,job_role_id,title,status) values(m83_id('vacancy'),m83_id('a'),m83_id('role'),'Backend developer','open');
insert into public.vacancy_versions(id,organization_id,vacancy_id,version,title,source_kind) values
 (m83_id('v1'),m83_id('a'),m83_id('vacancy'),1,'Backend developer','manual'),
 (m83_id('v2'),m83_id('a'),m83_id('vacancy'),2,'Backend developer','manual');
update public.vacancies set current_version_id=m83_id('v2'),definition_version=2 where id=m83_id('vacancy');
create temp table m83_state(key text primary key,value jsonb);
grant all on m83_state to authenticated,service_role;
insert into m83_state values('context','{"position":"Backend developer","entries":[{"id":"e0","fieldPath":"experiences.0","text":"Backend developer. Built APIs","kind":"experience"}]}'),
 ('reading','{"items":[{"id":"e0","activity":"backend_execution","quote":"Built APIs"}]}');
-- This invoker helper is only a test fixture, never a deployed RPC.
create function public.m83_claim(p_hash text default repeat('a',64)) returns jsonb language sql as $$
 select public.claim_matching_trajectory(public.m83_id('member'),public.m83_id('a'),public.m83_id('profile'),public.m83_id('v2'),p_hash,
 'trajectory-backend-1.0.0','trajectory-evidence-1.1.0','configured-model',
 (select value from m83_state where key='versions'),(select value from m83_state where key='context')) $$;
-- M83 transactional checks start here (also the concurrency harness seed boundary).
set local role authenticated;
select set_config('request.jwt.claim.sub',m83_id('member')::text,true);
insert into m83_state select 'versions',public.load_matching_trajectory_sources(m83_id('a'),m83_id('profile'),m83_id('v2'))->'sourceVersions';
select m83_assert((select value->>'profileVersion'='2' from m83_state where key='versions'),'member can read current approved profile');
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('old'),m83_id('v2')),'40001');
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('profile'),m83_id('v1')),'40001');
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('b'),m83_id('profile'),m83_id('v2')),'42501');
select m83_reject('select * from public.matching_trajectory_assessments','42501');
select m83_reject('select public.m83_claim()','42501');
select m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'')',m83_id('member'),m83_id('anything'),m83_id('lease')),'42501');
select set_config('request.jwt.claim.sub',m83_id('outsider')::text,true);
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('profile'),m83_id('v2')),'42501');
select set_config('request.jwt.claim.sub',m83_id('inactive')::text,true);
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('profile'),m83_id('v2')),'42501');
select set_config('request.jwt.claim.sub','',true);
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('profile'),m83_id('v2')),'42501');
reset role;
set local role anon;
select m83_reject(format('select public.load_matching_trajectory_sources(%L,%L,%L)',m83_id('a'),m83_id('profile'),m83_id('v2')),'42501');
select m83_reject('select public.m83_claim()','42501');
select m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'')',m83_id('member'),m83_id('anything'),m83_id('lease')),'42501');
reset role;
select m83_assert((select relrowsecurity from pg_class where oid='public.matching_trajectory_assessments'::regclass),'RLS enabled');
set local role service_role;
select m83_reject('select * from public.matching_trajectory_assessments','42501');
insert into m83_state select 'claim',public.m83_claim();
select m83_assert((select (value->>'acquired')::boolean from m83_state where key='claim'),'service acquires lease');
select m83_assert(public.m83_claim()->>'acquired'='false','duplicate cannot acquire active lease');
select m83_assert(not(public.m83_claim() ? 'lease'),'reused cache never exposes lease');
do $$ declare c jsonb; r jsonb; begin
 select value into c from m83_state where key='claim'; select value into r from m83_state where key='reading';
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L)',m83_id('member'),c->>'id',m83_id('wrong'),r),'40001');
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L,null,''resolved'')',m83_id('member'),c->>'id',c->>'lease','{"items":[]}'),'22023');
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L,null,''resolved'')',m83_id('member'),c->>'id',c->>'lease',jsonb_set(r,'{items,0,quote}','"invented"')),'22023');
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L,null,''resolved'')',m83_id('member'),c->>'id',c->>'lease',jsonb_set(r,'{items,0,activity}','"hire"')),'22023');
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L,null,''resolved'')',m83_id('member'),c->>'id',c->>'lease',jsonb_set(r,'{items,0,id}','"unknown"')),'22023');
 perform m83_assert(public.complete_matching_trajectory(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,'complete',r,null,'provider-model-revision')->>'status'='complete','complete persists valid evidence');
 perform m83_reject(format('select public.complete_matching_trajectory(%L,%L,%L,''complete'',%L)',m83_id('member'),c->>'id',c->>'lease',r),'40001');
 perform m83_assert(public.m83_claim()->>'status'='complete' and public.m83_claim()->>'acquired'='false','complete reused without provider replay');
 perform m83_assert(public.m83_claim()->>'actual_model_version'='provider-model-revision' and public.m83_claim()->>'model_version'='configured-model','resolved model and configured key recorded separately');
 perform m83_assert(public.claim_matching_trajectory(m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),repeat('a',64),
   'trajectory-backend-1.0.0','trajectory-evidence-1.1.0','configured-model',
   (select value from m83_state where key='versions'),(select value from m83_state where key='context'),false)->>'status'='complete','disabled AI still returns compatible completed cache');
 perform m83_assert(public.claim_matching_trajectory(m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'),repeat('9',64),
   'trajectory-backend-1.0.0','trajectory-evidence-1.1.0','configured-model',
   (select value from m83_state where key='versions'),(select value from m83_state where key='context'),false)->>'reason_code'='AI_DISABLED','disabled AI cannot acquire a new lease');
 c:=public.m83_claim(repeat('b',64));
 perform public.complete_matching_trajectory(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,'indeterminate',null,'READINGS_DISAGREE','provider-model-revision');
 perform m83_assert(public.m83_claim(repeat('b',64))->>'status'='indeterminate' and public.m83_claim(repeat('b',64))->>'acquired'='false','disagreement cached without retry');
 c:=public.m83_claim(repeat('c',64));
 perform public.complete_matching_trajectory(m83_id('member'),(c->>'id')::uuid,(c->>'lease')::uuid,'unavailable',null,'PROVIDER_UNAVAILABLE');
 perform m83_assert(public.m83_claim(repeat('c',64))->>'acquired'='false','provider error cooldown blocks replay');
end $$;
-- Subtransactions prove physical lifecycle cascades, then restore fixture rows.
reset role;
do $$ begin
 begin
  delete from public.professional_profiles where id=m83_id('profile');
  perform m83_assert(not exists(select 1 from public.matching_trajectory_assessments),'profile deletion cascades to derived cache');
  raise exception 'rollback fixture' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null; end;
 begin
  update public.vacancies set current_version_id=null where id=m83_id('vacancy');
  delete from public.vacancy_versions where id=m83_id('v2');
  perform m83_assert(not exists(select 1 from public.matching_trajectory_assessments),'position version deletion cascades to derived cache');
  raise exception 'rollback fixture' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null; end;
end $$;
reset role;
-- Exhausted operational retries remain unavailable until a different source/method key.
update public.matching_trajectory_assessments set retry_after=now()-interval '1 day',attempts=3 where input_hash=repeat('c',64);
set local role service_role;
select m83_assert(public.m83_claim(repeat('c',64))->>'acquired'='false','attempt limit blocks endless provider failures');
insert into m83_state select 'stale',public.m83_claim(repeat('d',64));
insert into m83_state select 'expired',public.m83_claim(repeat('e',64));
select m83_assert(public.m83_claim(repeat('f',64))->>'reason_code'='CONCURRENCY_LIMIT','tenant concurrency bounded');
reset role;
update public.matching_trajectory_assessments set lease_until=now()-interval '1 minute' where input_hash=repeat('e',64);
set local role service_role;
select m83_assert(public.m83_claim(repeat('e',64))->>'reason_code'='LEASE_EXPIRED','expired lease enters cooldown before retry');
reset role;
insert into public.knowledge_change_sets(scope,organization_id,version,summary,approved_by_auth_user_id)
 values('organization',m83_id('a'),1,'Synthetic revision',m83_id('recruiter'));
set local role service_role;
select m83_assert(public.m83_claim()->>'reason_code'='SOURCE_STALE','Knowledge revision invalidates completed cache');
select m83_assert(public.complete_matching_trajectory(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,'complete',
 (select value from m83_state where key='reading'))->>'reason_code'='SOURCE_STALE','completion rechecks Knowledge revision') from m83_state where key='stale';
reset role;
-- Refresh source versions and then mutate source data within the same profile/version id.
update m83_state set value=private.m83_sources(m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'))->'sourceVersions' where key='versions';
set local role service_role;
update m83_state set value=public.m83_claim(repeat('f',64)) where key='stale';
reset role;
update public.professional_profiles set profile_data=jsonb_set(profile_data,'{professionalTitle}','"Changed"') where id=m83_id('profile');
set local role service_role;
select m83_assert(public.complete_matching_trajectory(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,'complete',
 (select value from m83_state where key='reading'))->>'reason_code'='SOURCE_STALE','completion rejects profile edits during provider call') from m83_state where key='stale';
reset role;
update m83_state set value=private.m83_sources(m83_id('member'),m83_id('a'),m83_id('profile'),m83_id('v2'))->'sourceVersions' where key='versions';
set local role service_role;
update m83_state set value=public.m83_claim(repeat('1',64)) where key='stale';
reset role;
update public.vacancies set current_version_id=m83_id('v1') where id=m83_id('vacancy');
set local role service_role;
select m83_assert(public.complete_matching_trajectory(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,'complete',
 (select value from m83_state where key='reading'))->>'reason_code'='SOURCE_STALE','completion rejects changed current position version') from m83_state where key='stale';
reset role;
update public.vacancies set current_version_id=m83_id('v2') where id=m83_id('vacancy');
set local role service_role;
update m83_state set value=public.m83_claim(repeat('2',64)) where key='stale';
reset role;
delete from public.organization_memberships where user_id=m83_id('member');
set local role service_role;
select m83_assert(public.complete_matching_trajectory(m83_id('member'),(value->>'id')::uuid,(value->>'lease')::uuid,'complete',
 (select value from m83_state where key='reading'))->>'reason_code'='AUTH_REVOKED','completion distinguishes revoked membership from stale tenant data') from m83_state where key='stale';
reset role;
select m83_assert((select attempts<3 and reason_code='AUTH_REVOKED' from matching_trajectory_assessments where input_hash=repeat('2',64)), 'revoked actor does not exhaust shared cache attempts');
set local role service_role;
select m83_assert(public.claim_matching_trajectory(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),repeat('2',64),
 'trajectory-backend-1.0.0','trajectory-evidence-1.1.0','configured-model',
 (select value from m83_state where key='versions'),(select value from m83_state where key='context'))->>'acquired'='true','another authorized actor retries after revocation');
reset role;
-- Exact historical/current matching version compatibility, using actual M6.2 function.
insert into public.vacancy_requirements(id,organization_id,vacancy_id,vacancy_version_id,stable_id,label,importance,category)
 values(m83_id('requirement'),m83_id('a'),m83_id('vacancy'),m83_id('v2'),m83_id('stable'),'Backend','required','competency');
select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);
do $$ declare version text; evaluation uuid; result jsonb; begin
 foreach version in array array['vacancy-matching-explainable-4.0.0','vacancy-matching-explainable-5.0.0','vacancy-matching-semantic-6.0.0'] loop
  insert into public.match_evaluations(organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version)
  values(m83_id('a'),m83_id('person'),m83_id('vacancy'),m83_id('v2'),jsonb_build_object('requirements',jsonb_build_array(jsonb_build_object('stableId',m83_id('stable'),'status','no_evidence'))),version,'fixture','fixture') returning id into evaluation;
  result:=public.create_m62_verification_need(evaluation,m83_id('requirement'),'intermediate','medium');
  perform m83_assert(result->>'needId' is not null,'M62 accepts '||version);
  update public.match_evaluations set matching_version='unknown' where id=evaluation;
  perform m83_reject(format('select public.create_m62_verification_need(%L,%L,''intermediate'',''medium'')',evaluation,m83_id('requirement')),'P0001');
 end loop;
end $$;
-- Authoritative snapshot boundary. Uses only synthetic fixture data; no provider call.
reset role;
select m83_assert(public.complete_matching_trajectory(m83_id('recruiter'),id,lease,'complete',
 (select value from m83_state where key='reading'),null,'provider-model-revision')->>'status'='complete','snapshot fixture completes through service contract')
 from matching_trajectory_assessments where input_hash=repeat('2',64);
insert into public.knowledge_concepts(id,scope,concept_type,canonical_label,status,provenance)
 values(m83_id('snapshot-concept'),'global','technology','APIs','approved','{}');
insert into public.knowledge_observations(id,organization_id,person_id,profile_id,original_term,normalized_term,resolution_state,
 normalization_method,resolution_method_version,concept_id,knowledge_global_version,source_snapshot)
 values(m83_id('snapshot-observation'),m83_id('a'),m83_id('person'),m83_id('profile'),'APIs','apis','resolved',
 'global_exact','knowledge-normalization-2.0.0',m83_id('snapshot-concept'),0,'{}');
-- Same synthetic M5.1 seeding pattern as M72: bypass creation FKs only inside this rolled-back fixture.
-- Production routines, authorization, RLS and snapshot triggers remain unchanged and are tested normally.
set local session_replication_role=replica;
insert into public.competency_demonstrated_evidence(id,organization_id,person_id,competency_key,verification_need_id,prepared_assessment_id,attempt_id,evaluation_id,
 verification_definition_id,verification_definition_version,blueprint_id,blueprint_version,rubric_id,rubric_version,evaluation_version,integrity_rule_version,
 demonstrated_level,raw_result,dimension_results,coverage_state,methodological_quality,integrity_state,confidence_state,reason_codes,verified_at,valid_until,status,provenance)
 values(m83_id('snapshot-demonstrated'),m83_id('a'),m83_id('person'),'APIs',m83_id('need-placeholder'),m83_id('prepared-placeholder'),m83_id('attempt-placeholder'),m83_id('evaluation-placeholder'),
 m83_id('definition-placeholder'),'1.0.0',m83_id('blueprint-placeholder'),'1.0.0',m83_id('rubric-placeholder'),'1.0.0','1.0.0','1.0.0',
 'intermediate','{}','{}','complete','sufficient','valid','high','[]',now(),now()+interval '1 day','active','{"fixture":true}');
set local session_replication_role=origin;
insert into m83_state select 'snapshot-sources',private.m83_snapshot_sources(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'));
select m83_assert((select jsonb_array_length(value->'demonstratedEvidence')=1 and jsonb_array_length(value#>'{candidate,knowledge}')=1 from m83_state where key='snapshot-sources'),'snapshot loads active demonstrated evidence and published Knowledge');
insert into m83_state select 'snapshot-evaluation',jsonb_build_object(
 'vacancyVersion',2,'positionDecision',null,'requirements',jsonb_build_array(jsonb_build_object('stableId',m83_id('stable'),'label','Backend','status','no_evidence','evidence','[]'::jsonb)),
 'semanticInterpretation',jsonb_build_object('analysisId',id,'inputHash',input_hash,'methodVersion',method_version,'promptVersion',prompt_version,'modelVersion',actual_model_version,'status','complete'),
 'score',jsonb_build_object('matchingContractVersion','vacancy-matching-semantic-6.0.0','scoreContractVersion','matching-score-1.3.0',
   'profileVersion',profile_id,'positionVersion',vacancy_version_id,'status','provisional','score',50))
 from matching_trajectory_assessments where input_hash=repeat('2',64);
create function public.m83_commit() returns jsonb language sql as $$
 select public.commit_matching_snapshot(public.m83_id('recruiter'),public.m83_id('a'),public.m83_id('profile'),public.m83_id('v2'),
  (select (value#>>'{semanticInterpretation,analysisId}')::uuid from m83_state where key='snapshot-evaluation'),
  (select value->>'fingerprint' from m83_state where key='snapshot-sources'),
  (select value from m83_state where key='snapshot-evaluation')) $$;
set local role authenticated;
select m83_reject('select public.m83_commit()','42501');
select m83_reject(format('insert into public.match_evaluations(organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version) values(%L,%L,%L,%L,%L,''vacancy-matching-semantic-6.0.0'',''forged'',''forged'')',
 m83_id('a'),m83_id('person'),m83_id('vacancy'),m83_id('v2'),(select value from m83_state where key='snapshot-evaluation')),'42501');
select m83_reject(format('insert into public.match_evaluations(organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version) values(%L,%L,%L,%L,%L,''vacancy-matching-semantic-6.0.0'',''forged'',''forged'')',
 m83_id('a'),m83_id('person'),m83_id('vacancy'),m83_id('v2'),'{"type":"position_relation_decision","decision":"confirmed","score":{"score":100}}'),'42501');
reset role;
set local role anon;
select m83_reject('select public.m83_commit()','42501');
reset role;
set local role service_role;
insert into m83_state select 'snapshot-committed',public.m83_commit();
select m83_assert(public.m83_commit()=(select value from m83_state where key='snapshot-committed'),'same authoritative snapshot reused');
reset role;
select m83_assert(public.create_m62_verification_need((select (value->>'evaluationId')::uuid from m83_state where key='snapshot-committed'),m83_id('requirement'),'intermediate','medium')->>'needId' is not null,'M62 consumes backend snapshot with exact requirement');
do $$ declare projection jsonb; begin
 begin
  update public.vacancy_requirements set concept_id=m83_id('snapshot-concept') where id=m83_id('requirement');
  update public.knowledge_concepts set status='deprecated' where id=m83_id('snapshot-concept');
  projection:=private.m83_snapshot_sources(m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'));
  perform m83_assert(projection#>>'{vacancy,requirements,0,conceptId}'=m83_id('snapshot-concept')::text
    and projection#>>'{vacancy,requirements,0,conceptLabel}' is null
    and projection#>>'{candidate,knowledge,0,state}'='unresolved'
    and projection#>>'{candidate,knowledge,0,conceptId}' is null,'unapproved concept preserves requirement link but cannot supply canonical evidence');
  raise exception 'rollback fixture' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null; end;
 begin
  update public.match_evaluations set evaluation_data=jsonb_set(evaluation_data,'{requirements,0,stableId}',to_jsonb(m83_id('wrong-stable')::text))
    where id=(select (value->>'evaluationId')::uuid from m83_state where key='snapshot-committed');
  perform m83_reject(format('select public.create_m62_verification_need(%L,%L,''intermediate'',''medium'')',
    (select value->>'evaluationId' from m83_state where key='snapshot-committed'),m83_id('requirement')),'P0001');
  raise exception 'rollback fixture' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null; end;
end $$;
-- Mutations are rolled back per case, exercising the fingerprint's actual input surfaces.
do $$ declare mutation text; begin
 foreach mutation in array array[
  format('update public.vacancy_requirements set label=''Changed requirement'' where id=%L',m83_id('requirement')),
  format('update public.vacancy_requirements set importance=''desired'' where id=%L',m83_id('requirement')),
  format('update public.professional_profiles set profile_data=profile_data||''{"summary":"Changed source"}'' where id=%L',m83_id('profile')),
  format('update public.knowledge_change_sets set version=version+1 where organization_id=%L',m83_id('a')),
  format('update public.knowledge_concepts set canonical_label=''Changed canonical label'' where id=%L',m83_id('snapshot-concept')),
  format('update public.knowledge_observations set resolution_state=''unresolved'', concept_id=null where id=%L',m83_id('snapshot-observation')),
  format('update public.competency_demonstrated_evidence set confidence_state=''reduced'' where id=%L',m83_id('snapshot-demonstrated')),
  format('update public.competency_demonstrated_evidence set status=''invalidated'' where id=%L',m83_id('snapshot-demonstrated')),
  format('update public.competency_demonstrated_evidence set valid_until=now()-interval ''1 day'' where id=%L',m83_id('snapshot-demonstrated')),
  format('update public.vacancies set current_version_id=%L where id=%L',m83_id('v1'),m83_id('vacancy'))
 ] loop
  begin
   -- Synthetic evidence uses placeholder assessment FKs above. Bypass only its fixture mutation,
   -- never the source read or commit under test; restore normal triggers before assertions.
   if mutation like 'update public.competency_demonstrated_evidence %' then
    perform set_config('session_replication_role','replica',true);
   end if;
   execute mutation;
   perform set_config('session_replication_role','origin',true);
   perform public.m83_reject('select public.m83_commit()','40001');
   raise exception 'rollback mutation' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null; end;
 end loop;
 perform m83_reject(format('select public.commit_matching_snapshot(%L,%L,%L,%L,%L,%L,%L)',
  m83_id('outsider'),m83_id('a'),m83_id('profile'),m83_id('v2'),m83_id('fake'),repeat('0',64),'{}'),'42501');
 perform m83_reject(format('select public.commit_matching_snapshot(%L,%L,%L,%L,%L,%L,%L)',
  m83_id('recruiter'),m83_id('a'),m83_id('profile'),m83_id('v2'),m83_id('fake'),
  (select value->>'fingerprint' from m83_state where key='snapshot-sources'),(select value from m83_state where key='snapshot-evaluation')),'40001');
end $$;
-- Temporarily permit UPDATE in this rolled-back fixture to exercise the trigger beyond current RLS.
create policy m83_test_update on public.match_evaluations for update to authenticated using (true) with check (true);
set local role authenticated;
select m83_reject(format('update public.match_evaluations set evaluation_data=''{}'',matching_version=''vacancy-matching-explainable-5.0.0'' where id=%L',
 (select value->>'evaluationId' from m83_state where key='snapshot-committed')),'42501');
insert into public.match_evaluations(id,organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version)
 values(m83_id('human-decision'),m83_id('a'),m83_id('person'),m83_id('vacancy'),m83_id('v2'),
 '{"type":"position_relation_decision","decision":"confirmed","vacancyVersion":2,"areaRelation":{},"positionRelation":{},"decidedAt":"2026-09-25"}',
 'vacancy-matching-semantic-6.0.0','human','human');
select m83_reject(format('select public.create_m62_verification_need(%L,%L,''intermediate'',''medium'')',m83_id('human-decision'),m83_id('requirement')),'P0001');
reset role;
select m83_reject('select public.m83_commit()','40001');
