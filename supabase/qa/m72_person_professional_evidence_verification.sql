-- M7.2 disposable local PostgreSQL verification. Synthetic data only; every write rolls back.
begin;
create function public.m72_id(text) returns uuid language sql immutable as $$ select md5('m72-fixture-'||$1)::uuid $$;
create function public.m72_assert(boolean,text) returns void language plpgsql as $$
begin if $1 is distinct from true then raise exception 'M72 FAIL: %',$2; end if; raise notice 'PASS: %',$2; end $$;
create function public.m72_reject(text,text) returns void language plpgsql as $$
begin
  begin execute $1; exception when others then
    if $2 is null or sqlstate=$2 then raise notice 'PASS: denied (%)',sqlstate; return; end if;
    raise exception 'Unexpected denial %: %',sqlstate,sqlerrm;
  end;
  raise exception 'M72 FAIL: expected rejection for %',$1;
end $$;

insert into public.organization_groups(id,name,slug) values(m72_id('group'),'M72 synthetic','m72-synthetic');
insert into public.organizations(id,name,group_id) values
  (m72_id('org-a'),'M72 A',m72_id('group')),(m72_id('org-b'),'M72 B',m72_id('group'));
insert into auth.users(id,email) select m72_id(u),u||'@example.invalid' from unnest(array['owner','member','outsider','inactive']) u;
insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,group_id,status)
select m72_id('platform-'||u),m72_id(u),'Synthetic '||u,'m72-'||u,u||'@example.invalid',
  (case when u in ('inactive','outsider') then 'member' else u end)::public.membership_role,m72_id('group'),
  (case when u='inactive' then 'inactive' else 'active' end)::public.platform_user_status
from unnest(array['owner','member','outsider','inactive']) u;
insert into public.organization_memberships(organization_id,user_id,role) values
  (m72_id('org-a'),m72_id('owner'),'owner'),(m72_id('org-a'),m72_id('member'),'member'),
  (m72_id('org-a'),m72_id('inactive'),'member'),(m72_id('org-b'),m72_id('outsider'),'member')
on conflict do nothing;

insert into public.people(id,organization_id,full_name) values
  (m72_id('person-a'),m72_id('org-a'),'Pessoa sintética A'),(m72_id('person-b'),m72_id('org-b'),'Pessoa sintética B');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at,superseded_at)
values
  (m72_id('profile-old'),m72_id('org-a'),m72_id('person-a'),'{}','fixture','profile-1.0.0','none','fixture','fixture',1,'approved',now()-interval '2 days',now()-interval '1 day'),
  (m72_id('profile-current'),m72_id('org-a'),m72_id('person-a'),'{}','fixture','profile-1.0.0','none','fixture','fixture',2,'approved',now()-interval '1 day',null);

insert into public.knowledge_sources(id,name,domain,source_class,publisher,method,status)
values(m72_id('onet'),'O*NET','onet.fixture.invalid','official_occupational_taxonomy','Test fixture','dataset','approved');
insert into public.knowledge_source_versions(id,source_id,external_version,format,import_status,is_current)
values(m72_id('onet-v'),m72_id('onet'),'31.0','tsv','published',true);
insert into public.knowledge_concepts(id,scope,organization_id,concept_type,canonical_label,status,provenance)
values(m72_id('java'),'global',null,'technology','Java','approved','{"fixture":true}'),
  (m72_id('java-b'),'organization',m72_id('org-b'),'technology','Java reservado B','approved','{"fixture":true}');
insert into public.knowledge_terms(concept_id,scope,organization_id,term,normalized_term,status)
values(m72_id('java'),'global',null,'Java','java','approved'),
  (m72_id('java-b'),'organization',m72_id('org-b'),'Java reservado B','java reservado b','approved');

insert into public.knowledge_observations(id,organization_id,person_id,profile_id,original_term,normalized_term,resolution_state,normalization_method,resolution_method_version,concept_id,resolution_source_version_id,knowledge_global_version,source_snapshot,resolved_at)
values
  (m72_id('observation-current'),m72_id('org-a'),m72_id('person-a'),m72_id('profile-current'),'Java','java','resolved','global_exact','knowledge-normalization-2.0.0',m72_id('java'),m72_id('onet-v'),1,'{}',now()),
  (m72_id('observation-old'),m72_id('org-a'),m72_id('person-a'),m72_id('profile-old'),'Java antiga','java antiga','resolved','global_exact','knowledge-normalization-2.0.0',m72_id('java'),m72_id('onet-v'),1,'{}',now()-interval '2 days'),
  (m72_id('observation-ambiguous'),m72_id('org-a'),m72_id('person-a'),m72_id('profile-current'),'Arquitetura','arquitetura','ambiguous','ambiguous','knowledge-normalization-2.0.0',null,null,1,'{}',null),
  (m72_id('observation-incompatible'),m72_id('org-a'),m72_id('person-a'),m72_id('profile-current'),'Legado','legado','unresolved','legacy','knowledge-normalization-1.0.0',null,null,1,'{}',null);

-- The projection consumes existing M5.1 rows. These synthetic rows bypass creation FKs only inside
-- this rolled-back fixture so the read contract can be tested without recreating an assessment session.
set local session_replication_role=replica;
insert into public.verification_needs(id,organization_id,person_id,vacancy_id,competency_key,competency_label,target_level,criticality,sufficiency_status,sufficiency_requirement,sufficiency_explanation,sufficiency_engine_version,policy_version,created_by_auth_user_id)
values(m72_id('need-java'),m72_id('org-a'),m72_id('person-a'),m72_id('vacancy-placeholder'),'java','Java','intermediate','medium','verification_required_by_policy','required_by_policy','Fixture M72','fixture','fixture',m72_id('owner'));
insert into public.competency_demonstrated_evidence(id,organization_id,person_id,competency_key,verification_need_id,prepared_assessment_id,attempt_id,evaluation_id,verification_definition_id,verification_definition_version,blueprint_id,blueprint_version,rubric_id,rubric_version,evaluation_version,integrity_rule_version,demonstrated_level,raw_result,dimension_results,coverage_state,methodological_quality,integrity_state,confidence_state,reason_codes,verified_at,valid_until,status,provenance)
values
  (m72_id('demonstrated-valid'),m72_id('org-a'),m72_id('person-a'),'java',m72_id('need-java'),m72_id('prepared-valid'),m72_id('attempt-valid'),m72_id('evaluation-valid'),m72_id('definition'),'1.0.0',m72_id('blueprint'),'1.0.0',m72_id('rubric'),'1.0.0','1.0.0','1.0.0','intermediate','{}','{}','complete','sufficient','valid','high','[]',now(),now()+interval '1 year','active','{"fixture":true}'),
  (m72_id('demonstrated-invalid'),m72_id('org-a'),m72_id('person-a'),'java',m72_id('need-java'),m72_id('prepared-invalid'),m72_id('attempt-invalid'),m72_id('evaluation-invalid'),m72_id('definition'),'1.0.0',m72_id('blueprint'),'1.0.0',m72_id('rubric'),'1.0.0','1.0.0','1.0.0','insufficient_evidence','{}','{}','partial','insufficient','valid','low','[]',now()-interval '1 day',null,'invalidated','{"fixture":true}');
set local session_replication_role=origin;

set local role authenticated;
select set_config('request.jwt.claim.sub',m72_id('member')::text,true);
do $$
declare result jsonb;
begin
  result:=public.load_person_professional_evidence_map(m72_id('org-a'),m72_id('person-a'));
  perform m72_assert(result->>'contractVersion'='person-professional-evidence-1.0.0','known projection contract returned');
  perform m72_assert(result->>'taxonomyContractVersion'='position-taxonomy-1.0.0','M7.1 taxonomy contract reused');
  perform m72_assert(result#>>'{profile,id}'=m72_id('profile-current')::text,'only current approved profile projected');
  perform m72_assert(jsonb_array_length(result->'associations')=3,'current declaration and M5.1 rows projected; historical profile excluded');
  perform m72_assert(result#>>'{associations,0,nature}'='declared','explicit profile evidence remains declared');
  perform m72_assert(result#>>'{associations,0,concept,label}'='Java','published Knowledge concept retained');
  perform m72_assert((select count(*)=1 from jsonb_array_elements(result->'associations') item where item->>'nature'='demonstrated' and (item#>>'{verification,qualifiesAsVerified}')::boolean),'only active sufficient M5.1 evidence qualifies as verified');
  perform m72_assert((select count(*)=1 from jsonb_array_elements(result->'associations') item where item->>'nature'='demonstrated' and not (item#>>'{verification,qualifiesAsVerified}')::boolean),'invalidated insufficient evidence remains distinct and unverified');
  perform m72_assert(jsonb_array_length(result->'issues')=2,'ambiguous and incompatible states stay explicit');
end $$;
select m72_reject(format('select public.load_person_professional_evidence_map(%L,%L)',m72_id('org-b'),m72_id('person-a')),'42501');
select set_config('request.jwt.claim.sub',m72_id('outsider')::text,true);
select m72_reject(format('select public.load_person_professional_evidence_map(%L,%L)',m72_id('org-a'),m72_id('person-a')),'42501');
select set_config('request.jwt.claim.sub',m72_id('inactive')::text,true);
select m72_reject(format('select public.load_person_professional_evidence_map(%L,%L)',m72_id('org-a'),m72_id('person-a')),'42501');
reset role;
set local role anon;
select m72_reject(format('select public.load_person_professional_evidence_map(%L,%L)',m72_id('org-a'),m72_id('person-a')),'42501');
reset role;
rollback;
