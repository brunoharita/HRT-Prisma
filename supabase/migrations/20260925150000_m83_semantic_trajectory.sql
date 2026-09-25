-- M8.3: derived interpretation only. No writes to profiles, positions or Knowledge.
create table public.matching_trajectory_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null,
  vacancy_version_id uuid not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  method_version text not null,
  prompt_version text not null,
  model_version text not null check (length(model_version) between 1 and 160),
  actual_model_version text check (length(actual_model_version) between 1 and 160),
  source_versions jsonb not null check (jsonb_typeof(source_versions) = 'object'),
  minimized_context jsonb not null check (jsonb_typeof(minimized_context) = 'object'),
  status text not null check (status in ('processing','complete','indeterminate','unavailable')),
  reading jsonb,
  reason_code text,
  lease uuid,
  lease_until timestamptz,
  attempts integer not null default 1 check (attempts between 1 and 3),
  retry_after timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (organization_id,profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
  foreign key (organization_id,vacancy_version_id) references public.vacancy_versions(organization_id,id) on delete cascade,
  unique (organization_id,profile_id,vacancy_version_id,input_hash,method_version,prompt_version,model_version),
  check ((status = 'complete' and reading is not null) or (status <> 'complete' and reading is null)),
  check ((status = 'processing' and lease is not null and lease_until is not null)
    or (status <> 'processing' and lease is null and lease_until is null))
);
alter table public.matching_trajectory_assessments enable row level security;
revoke all on public.matching_trajectory_assessments from public,anon,authenticated,service_role;
create index matching_trajectory_active_idx on public.matching_trajectory_assessments (organization_id,lease_until)
  where status='processing';
create index matching_trajectory_vacancy_idx on public.matching_trajectory_assessments (organization_id,vacancy_version_id);

-- Explicit actor is only accepted by private/service methods. Public source RPC uses auth.uid().
create function private.m83_sources(p_actor uuid,p_organization uuid,p_profile uuid,p_position uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; v public.vacancy_versions; person public.people;
  kg bigint; ko bigint; redactions jsonb;
begin
  if p_actor is null or not private.is_active_platform_user(p_actor) or not (
    private.is_super_admin(p_actor) or exists (
      select 1 from public.organization_memberships m where m.user_id=p_actor and m.organization_id=p_organization
        and m.role in ('owner','admin','recruiter','member')
    )) then raise exception 'M83_NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into p from public.professional_profiles where id=p_profile and organization_id=p_organization
    and review_status='approved' and superseded_at is null;
  if p.id is null or exists(select 1 from public.professional_profiles newer where newer.organization_id=p_organization
    and newer.person_id=p.person_id and newer.review_status='approved' and newer.superseded_at is null
    and newer.profile_version>p.profile_version) then raise exception 'M83_SOURCE_STALE' using errcode='40001'; end if;
  select * into person from public.people where id=p.person_id and organization_id=p_organization and operational_status='active';
  select vv.* into v from public.vacancy_versions vv join public.vacancies vacancy
    on vacancy.organization_id=vv.organization_id and vacancy.id=vv.vacancy_id and vacancy.current_version_id=vv.id
    where vv.organization_id=p_organization and vv.id=p_position;
  if person.id is null or v.id is null then raise exception 'M83_SOURCE_STALE' using errcode='40001'; end if;
  select coalesce(max(version) filter(where scope='global'),0),
    coalesce(max(version) filter(where scope='organization' and organization_id=p_organization),0)
    into kg,ko from public.knowledge_change_sets;
  -- Redaction values remain on the backend and are never persisted in the derived cache.
  select coalesce(jsonb_agg(distinct value) filter(where length(btrim(value))>0),'[]'::jsonb) into redactions from (
    select person.full_name as value union all select p.profile_data->>'fullName'
    union all select p.profile_data#>>'{identity,fullName}'
    union all select to_jsonb(person)->>'email' union all select to_jsonb(person)->>'phone'
    union all select e->>'organization' from jsonb_array_elements(coalesce(p.profile_data->'experiences','[]')) e
    union all select e->>'institution' from jsonb_array_elements(coalesce(p.profile_data->'education','[]')) e
  ) r;
  return jsonb_build_object('profileData',jsonb_build_object(
      'experiences',coalesce(p.profile_data->'experiences','[]'),
      'professionalTitle',p.profile_data->'professionalTitle',
      'areasOfExpertise',coalesce(p.profile_data->'areasOfExpertise','[]')),
    'position',jsonb_build_object('title',v.title,'mission',v.mission,'responsibilities',v.responsibilities),
    'redactions',redactions,
    'sourceVersions',jsonb_build_object('profileId',p.id,'profileVersion',p.profile_version,
      'profileRevision',encode(extensions.digest(p.profile_data::text,'sha256'),'hex'),
      'positionVersionId',v.id,'positionVersion',v.version,
      'positionRevision',encode(extensions.digest(to_jsonb(v)::text,'sha256'),'hex'),
      'knowledgeGlobalVersion',kg,'knowledgeOrganizationVersion',ko));
end $$;

-- Snapshot inputs are authoritative DB data. This projection performs no scoring.
create function private.m83_snapshot_sources(p_actor uuid,p_organization uuid,p_profile uuid,p_position uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sources jsonb; p public.professional_profiles; v public.vacancy_versions; person public.people;
  vacancy jsonb; candidate jsonb; requirements jsonb; knowledge jsonb; demonstrated jsonb;
  occupation jsonb; decision jsonb; result jsonb;
begin
  sources:=private.m83_sources(p_actor,p_organization,p_profile,p_position);
  select * into p from public.professional_profiles where id=p_profile and organization_id=p_organization;
  select * into v from public.vacancy_versions where id=p_position and organization_id=p_organization;
  select * into person from public.people where id=p.person_id and organization_id=p_organization;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'competencyId',r.competency_id,'stableId',r.stable_id,'label',r.label,'category',r.category,'importance',r.importance,
    'origin',r.origin,'proposedCategory',coalesce(r.proposed_category,r.category),'categoryConfirmed',r.category_confirmed,
    'importanceConfirmed',r.importance_confirmed,'sourceSuggestionId',r.source_suggestion_id,'observedTerm',r.observed_term,
    'conceptId',r.concept_id,'conceptLabel',c.canonical_label,'relationMode',r.relation_mode,'targetLevel',r.target_level,
    'criticality',r.criticality,'verificationPolicyRequirement',r.verification_policy_requirement,'taxonomyOrigin',r.taxonomy_origin,
    'relatedSignals',coalesce((select jsonb_agg(jsonb_build_object('label',rel.related_label,'conceptId',rel.related_concept_id,'origin',rel.suggestion_origin) order by rel.id)
      from public.vacancy_requirement_relations rel where rel.organization_id=p_organization and rel.vacancy_version_id=v.id and rel.requirement_id=r.id),'[]'))
    order by r.created_at,r.id),'[]') into requirements
    from public.vacancy_requirements r left join public.knowledge_concepts c on c.id=r.concept_id and c.status='approved'
      and (c.scope='global' or c.organization_id=p_organization)
    where r.organization_id=p_organization and r.vacancy_id=v.vacancy_id and r.vacancy_version_id=v.id;
  select coalesce(jsonb_agg(jsonb_build_object('originalTerm',o.original_term,'canonicalLabel',c.canonical_label,
    'state',case when o.resolution_state='resolved' and c.id is not null then 'resolved' when o.resolution_state='ambiguous' then 'ambiguous' else 'unresolved' end,
    'conceptId',c.id,'conceptType',c.concept_type,'sourceFieldPath',o.source_field_path,
    'sourceVersion','global:'||o.knowledge_global_version||'|organization:'||coalesce(o.knowledge_organization_version::text,'none')
      ||'|source:'||coalesce(o.resolution_source_version_id::text,'none')||'|method:'||o.resolution_method_version) order by o.id),'[]') into knowledge
    from public.knowledge_observations o left join public.knowledge_concepts c on c.id=o.concept_id and c.status='approved'
      and (c.scope='global' or c.organization_id=p_organization) where o.organization_id=p_organization and o.profile_id=p.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'competencyKey',e.competency_key,'demonstratedLevel',e.demonstrated_level,
    'confidenceState',e.confidence_state,'verificationDefinitionVersion',e.verification_definition_version,'evaluationVersion',e.evaluation_version,
    'integrityRuleVersion',e.integrity_rule_version,'verifiedAt',e.verified_at,'validUntil',e.valid_until) order by e.verified_at desc,e.id),'[]') into demonstrated
    from public.competency_demonstrated_evidence e where e.organization_id=p_organization and e.person_id=p.person_id and e.status='active'
      and (e.valid_until is null or e.valid_until>clock_timestamp()) and e.demonstrated_level in ('basic','intermediate','advanced')
      and e.confidence_state in ('high','adequate','reduced');
  select jsonb_build_object('conceptId',c.id,'canonicalLabel',c.canonical_label,
    'aliases',coalesce((select jsonb_agg(t.term order by t.id) from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' and not t.ambiguous
      and (t.scope='global' or t.organization_id=p_organization)),'[]'),
    'relations',coalesce((select jsonb_agg(jsonb_build_object('conceptId',other.id,'label',other.canonical_label,'relationType',rel.relation_type) order by rel.id)
      from public.knowledge_relations rel join public.knowledge_concepts other on other.id=case when rel.source_concept_id=c.id then rel.target_concept_id else rel.source_concept_id end
        and other.concept_type='occupation' and other.status='approved' and (other.scope='global' or other.organization_id=p_organization)
      where (rel.source_concept_id=c.id or rel.target_concept_id=c.id) and rel.status='approved' and (rel.scope='global' or rel.organization_id=p_organization)
        and rel.relation_type in ('equivalent_to','related_to','is_a','broader_than','narrower_than')),'[]')) into occupation
    from public.knowledge_concepts c where c.id=v.reference_concept_id and c.status='approved' and c.concept_type='occupation'
      and (c.scope='global' or c.organization_id=p_organization);
  select jsonb_build_object('id',m.id,'decision',m.evaluation_data->>'decision','createdAt',m.created_at) into decision
    from public.match_evaluations m where m.organization_id=p_organization and m.person_id=p.person_id and m.vacancy_id=v.vacancy_id
      and m.evaluation_data->>'type'='position_relation_decision' and m.evaluation_data->>'decision' in ('confirmed','dismissed')
    order by m.created_at desc,m.id desc limit 1;
  candidate:=jsonb_build_object('personId',p.person_id,'fullName',person.full_name,'lifecycle',person.lifecycle,'operationalStatus',person.operational_status,
    'location',null,'profileId',p.id,'profileVersion',p.profile_version,'publishedAt',coalesce(p.approved_at,p.created_at),'profileData',p.profile_data,'knowledge',knowledge);
  vacancy:=jsonb_build_object('id',v.vacancy_id,'organizationId',p_organization,'versionId',v.id,'version',v.version,
    'title',v.title,'area',coalesce(v.area,''),'mission',coalesce(v.mission,''),'responsibilities',v.responsibilities,'expectedOutcomes',v.expected_outcomes,
    'contextItems',v.context_items,'requirements',requirements,'referenceConceptId',v.reference_concept_id,'taxonomy',v.taxonomy_snapshot);
  result:=jsonb_build_object('candidate',candidate,'vacancy',vacancy,'occupationReference',occupation,
    'demonstratedEvidence',demonstrated,'positionDecision',decision->>'decision','decisionSource',decision,'sourceVersions',sources->'sourceVersions');
  return result||jsonb_build_object('fingerprint',encode(extensions.digest(result::text,'sha256'),'hex'));
end $$;
revoke all on function private.m83_snapshot_sources(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.load_matching_snapshot_sources(p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.m72_require_profile_reader(p_organization_id);
  return private.m83_snapshot_sources(auth.uid(),p_organization_id,p_profile_id,p_position_version_id);
end $$;
revoke all on function public.load_matching_snapshot_sources(uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.load_matching_snapshot_sources(uuid,uuid,uuid) to authenticated;

-- Invoker trigger: definer commit below runs as the table owner. Direct service/client writes do not.
create function private.guard_m83_matching_snapshot() returns trigger language plpgsql set search_path='' as $$
declare trusted boolean := current_user=pg_get_userbyid((select relowner from pg_class where oid='public.match_evaluations'::regclass));
begin
  if trusted then return new; end if;
  if tg_op='UPDATE' and old.matching_version='vacancy-matching-semantic-6.0.0'
    and old.evaluation_data->>'type' is distinct from 'position_relation_decision' then
    raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501'; end if;
  if new.matching_version='vacancy-matching-semantic-6.0.0' then
    if new.evaluation_data->>'type' is distinct from 'position_relation_decision'
      or coalesce(new.evaluation_data->>'decision','') not in ('confirmed','dismissed')
      or new.evaluation_data-array['type','decision','vacancyVersion','areaRelation','positionRelation','decidedAt']<>'{}' then
      raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501'; end if;
  elsif coalesce(new.evaluation_data->'semanticInterpretation','null'::jsonb)<>'null'::jsonb
    or new.evaluation_data#>>'{score,matchingContractVersion}'='vacancy-matching-semantic-6.0.0' then
    raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_m83_matching_snapshot() from public,anon,authenticated,service_role;
create trigger guard_m83_matching_snapshot before insert or update on public.match_evaluations
  for each row execute function private.guard_m83_matching_snapshot();

create function public.commit_matching_snapshot(p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,
  p_analysis_id uuid,p_source_fingerprint text,p_evaluation jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare sources jsonb; cache public.matching_trajectory_assessments; evaluation_id uuid; source_requirement jsonb;
begin
  -- Function-local timeout is active before advisory/table/row locks and restored on exit.
  -- statement_timeout set inside a function cannot bound its already-running outer statement.
  -- Short DB-only critical section. SHARE locks also exclude phantoms (new requirements/evidence/decisions).
  if not pg_try_advisory_xact_lock(830032) then
    raise exception 'M83_SNAPSHOT_BUSY' using errcode='55P03'; end if;
  lock table public.organizations,public.organization_memberships,public.platform_users,
    public.professional_profiles,public.people,public.vacancies,public.vacancy_versions,
    public.vacancy_requirements,public.vacancy_requirement_relations,public.knowledge_observations,
    public.knowledge_concepts,public.knowledge_terms,public.knowledge_relations,public.knowledge_change_sets,
    public.competency_demonstrated_evidence,public.match_evaluations in share mode nowait;
  sources:=private.m83_snapshot_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if p_source_fingerprint is null or sources->>'fingerprint' is distinct from p_source_fingerprint then
    raise exception 'M83_SNAPSHOT_SOURCE_STALE' using errcode='40001'; end if;
  select * into cache from public.matching_trajectory_assessments where id=p_analysis_id and organization_id=p_organization_id
    and profile_id=p_profile_id and vacancy_version_id=p_position_version_id for share nowait;
  if cache.id is null or cache.status<>'complete' or cache.source_versions is distinct from sources->'sourceVersions'
    or cache.method_version<>'trajectory-backend-1.0.0' or cache.prompt_version<>'trajectory-evidence-1.1.0'
    or cache.actual_model_version is null then raise exception 'M83_SNAPSHOT_NOT_READY' using errcode='40001'; end if;
  if jsonb_typeof(p_evaluation) is distinct from 'object' or p_evaluation ? 'type'
    or p_evaluation#>>'{score,matchingContractVersion}' is distinct from 'vacancy-matching-semantic-6.0.0'
    or p_evaluation#>>'{score,scoreContractVersion}' is distinct from 'matching-score-1.3.0'
    or coalesce(p_evaluation#>>'{score,status}','') not in ('definitive','provisional')
    or jsonb_typeof(p_evaluation#>'{score,score}') is distinct from 'number'
    or p_evaluation#>>'{score,profileVersion}' is distinct from p_profile_id::text
    or p_evaluation#>>'{score,positionVersion}' is distinct from p_position_version_id::text
    or p_evaluation#>>'{semanticInterpretation,analysisId}' is distinct from cache.id::text
    or p_evaluation#>>'{semanticInterpretation,inputHash}' is distinct from cache.input_hash
    or p_evaluation#>>'{semanticInterpretation,methodVersion}' is distinct from cache.method_version
    or p_evaluation#>>'{semanticInterpretation,promptVersion}' is distinct from cache.prompt_version
    or p_evaluation#>>'{semanticInterpretation,modelVersion}' is distinct from cache.actual_model_version
    or p_evaluation#>>'{semanticInterpretation,status}' is distinct from 'complete'
    or p_evaluation->>'positionDecision' is distinct from sources->>'positionDecision'
    or p_evaluation->>'vacancyVersion' is distinct from sources#>>'{vacancy,version}'
    or jsonb_typeof(p_evaluation->'requirements') is distinct from 'array' then
    raise exception 'M83_SNAPSHOT_INVALID' using errcode='22023'; end if;
  if jsonb_array_length(p_evaluation->'requirements')<>jsonb_array_length(sources#>'{vacancy,requirements}')
    or (select count(distinct item->>'stableId') from jsonb_array_elements(p_evaluation->'requirements') item)<>jsonb_array_length(p_evaluation->'requirements')
    then raise exception 'M83_SNAPSHOT_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  for source_requirement in select value from jsonb_array_elements(sources#>'{vacancy,requirements}') loop
    if not exists(select 1 from jsonb_array_elements(p_evaluation->'requirements') item
      where item->>'stableId'=source_requirement->>'stableId' and item->>'label'=source_requirement->>'label') then
      raise exception 'M83_SNAPSHOT_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  end loop;
  -- Immutable snapshots are reused when the complete source fingerprint and cache are identical.
  select id into evaluation_id from public.match_evaluations where organization_id=p_organization_id
    and person_id=(sources#>>'{candidate,personId}')::uuid and vacancy_version_id=p_position_version_id
    and matching_version='vacancy-matching-semantic-6.0.0' and evaluation_data->>'backendSourceFingerprint'=p_source_fingerprint
    and evaluation_data#>>'{semanticInterpretation,analysisId}'=cache.id::text limit 1;
  if evaluation_id is null then
    insert into public.match_evaluations(organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version)
    values(p_organization_id,(sources#>>'{candidate,personId}')::uuid,(sources#>>'{vacancy,id}')::uuid,p_position_version_id,
      p_evaluation||jsonb_build_object('backendSourceFingerprint',p_source_fingerprint,'backendSnapshotContract','matching-snapshot-1.0.0'),
      'vacancy-matching-semantic-6.0.0',cache.prompt_version,cache.actual_model_version) returning id into evaluation_id;
  end if;
  return jsonb_build_object('evaluationId',evaluation_id);
end $$;
revoke all on function public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;
revoke all on function private.m83_sources(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.load_matching_trajectory_sources(p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.m72_require_profile_reader(p_organization_id);
  return private.m83_sources(auth.uid(),p_organization_id,p_profile_id,p_position_version_id);
end
$$;
revoke all on function public.load_matching_trajectory_sources(uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.load_matching_trajectory_sources(uuid,uuid,uuid) to authenticated;

-- Serialize only claim/completion bookkeeping; provider requests happen outside transactions.
create function public.claim_matching_trajectory(p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,
  p_position_version_id uuid,p_input_hash text,p_method_version text,p_prompt_version text,p_model_version text,
  p_source_versions jsonb,p_context jsonb,p_allow_compute boolean default true) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_sources jsonb; r public.matching_trajectory_assessments; item jsonb;
begin
  current_sources:=private.m83_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if p_source_versions is distinct from current_sources->'sourceVersions' then
    return jsonb_build_object('status','unavailable','reason_code','SOURCE_STALE','acquired',false); end if;
  if p_method_version is distinct from 'trajectory-backend-1.0.0' or p_prompt_version is distinct from 'trajectory-evidence-1.1.0'
    or p_input_hash is null or p_input_hash !~ '^[a-f0-9]{64}$' or p_model_version is null or length(btrim(p_model_version)) not between 1 and 160
    then raise exception 'M83_INVALID_CONTRACT' using errcode='22023'; end if;
  if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_context->'entries') is distinct from 'array'
    or jsonb_typeof(p_context->'position') is distinct from 'string' or p_context - array['entries','position'] <> '{}'
    or octet_length(p_context::text)>64000 then raise exception 'M83_INVALID_CONTEXT' using errcode='22023'; end if;
  if jsonb_array_length(p_context->'entries') not between 1 and 120 then raise exception 'M83_INVALID_CONTEXT' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_context->'entries') loop
    if jsonb_typeof(item) is distinct from 'object' or item-array['id','fieldPath','text','kind']<>'{}'
      or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 160
      or jsonb_typeof(item->'fieldPath') is distinct from 'string'
      or jsonb_typeof(item->'text') is distinct from 'string' or length(btrim(item->>'text')) not between 1 and 4000
      or coalesce(item->>'kind','') not in ('experience','declaration') then raise exception 'M83_INVALID_CONTEXT' using errcode='22023'; end if;
  end loop;
  if (select count(distinct e->>'id') from jsonb_array_elements(p_context->'entries') e)<>jsonb_array_length(p_context->'entries')
    then raise exception 'M83_INVALID_CONTEXT' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(830031);
  select * into r from public.matching_trajectory_assessments where organization_id=p_organization_id and profile_id=p_profile_id
    and vacancy_version_id=p_position_version_id and input_hash=p_input_hash and method_version=p_method_version
    and prompt_version=p_prompt_version and model_version=p_model_version for update;
  if r.id is not null then
    if r.source_versions is distinct from p_source_versions or r.minimized_context is distinct from p_context then
      raise exception 'M83_INPUT_COLLISION' using errcode='22023'; end if;
    if r.status in ('complete','indeterminate') then return (to_jsonb(r)-array['lease','lease_until'])||jsonb_build_object('acquired',false); end if;
    if r.status='processing' and r.lease_until>clock_timestamp() then
      return (to_jsonb(r)-array['lease','lease_until'])||jsonb_build_object('acquired',false); end if;
    if r.status='processing' then
      update public.matching_trajectory_assessments set status='unavailable',lease=null,lease_until=null,
        reason_code='LEASE_EXPIRED',retry_after=clock_timestamp()+interval '5 minutes' where id=r.id returning * into r;
    end if;
    if r.attempts>=3 or r.retry_after>clock_timestamp() then
      return (to_jsonb(r)-array['lease','lease_until'])||jsonb_build_object('acquired',false); end if;
  end if;
  if p_allow_compute is distinct from true then
    return jsonb_build_object('status','unavailable','reason_code','AI_DISABLED','acquired',false); end if;
  if (select count(*) from public.matching_trajectory_assessments where status='processing' and lease_until>clock_timestamp())>=2
    or (select count(*) from public.matching_trajectory_assessments where status='processing' and lease_until>clock_timestamp()
      and organization_id=p_organization_id)>=2 then
    return jsonb_build_object('status','processing','reason_code','CONCURRENCY_LIMIT','acquired',false); end if;
  if r.id is null then
    insert into public.matching_trajectory_assessments(organization_id,profile_id,vacancy_version_id,input_hash,
      method_version,prompt_version,model_version,source_versions,minimized_context,status,lease,lease_until)
    values(p_organization_id,p_profile_id,p_position_version_id,p_input_hash,p_method_version,p_prompt_version,p_model_version,
      p_source_versions,p_context,'processing',gen_random_uuid(),clock_timestamp()+interval '150 seconds') returning * into r;
  else
    update public.matching_trajectory_assessments set status='processing',lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '150 seconds',
      attempts=attempts+1,retry_after=null,reason_code=null,completed_at=null where id=r.id returning * into r;
  end if;
  return to_jsonb(r)||jsonb_build_object('acquired',true);
end $$;
revoke all on function public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean) to service_role;

create function public.complete_matching_trajectory(p_actor_id uuid,p_analysis_id uuid,p_lease uuid,p_status text,
  p_reading jsonb default null,p_reason_code text default null,p_actual_model_version text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.matching_trajectory_assessments; current_sources jsonb; item jsonb; source_text text;
begin
  select * into r from public.matching_trajectory_assessments where id=p_analysis_id for update;
  if r.id is null or r.status<>'processing' or r.lease is distinct from p_lease or r.lease_until<=clock_timestamp() then
    raise exception 'M83_LEASE_INVALID' using errcode='40001'; end if;
  begin
    current_sources:=private.m83_sources(p_actor_id,r.organization_id,r.profile_id,r.vacancy_version_id);
  exception when sqlstate '40001' then current_sources:=null;
    when sqlstate '42501' then
      -- An actor losing access must not poison the shared tenant/source cache.
      update public.matching_trajectory_assessments set status='unavailable',reading=null,lease=null,lease_until=null,
        reason_code='AUTH_REVOKED',attempts=greatest(1,attempts-1),retry_after=clock_timestamp(),completed_at=clock_timestamp() where id=r.id;
      return jsonb_build_object('status','unavailable','reason_code','AUTH_REVOKED');
  end;
  if current_sources is null or current_sources->'sourceVersions' is distinct from r.source_versions then
    update public.matching_trajectory_assessments set status='unavailable',reading=null,lease=null,lease_until=null,
      reason_code='SOURCE_STALE',attempts=3,completed_at=clock_timestamp() where id=r.id;
    return jsonb_build_object('status','unavailable','reason_code','SOURCE_STALE');
  end if;
  if p_status is null or p_status not in ('complete','indeterminate','unavailable') then raise exception 'M83_INVALID_RESULT' using errcode='22023'; end if;
  if p_status in ('complete','indeterminate') and (p_actual_model_version is null or length(btrim(p_actual_model_version)) not between 1 and 160)
    then raise exception 'M83_INVALID_MODEL' using errcode='22023'; end if;
  if p_status='complete' then
    if jsonb_typeof(p_reading) is distinct from 'object' or p_reading-'items'<>'{}'
      or jsonb_typeof(p_reading->'items') is distinct from 'array' then raise exception 'M83_INVALID_READING' using errcode='22023'; end if;
    if jsonb_array_length(p_reading->'items')<>jsonb_array_length(r.minimized_context->'entries')
      or (select count(distinct e->>'id') from jsonb_array_elements(p_reading->'items') e)<>jsonb_array_length(p_reading->'items')
      then raise exception 'M83_INVALID_READING' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(p_reading->'items') loop
      select e->>'text' into source_text from jsonb_array_elements(r.minimized_context->'entries') e where e->>'id'=item->>'id';
      if source_text is null or jsonb_typeof(item) is distinct from 'object' or item-array['id','activity','quote']<>'{}'
        or coalesce(item->>'activity','') not in ('backend_execution','software_execution','software_analysis','software_leadership','software_context','other','unclear')
        or jsonb_typeof(item->'quote') is distinct from 'string' or length(item->>'quote')>4000
        or (item->>'activity'<>'unclear' and length(btrim(item->>'quote'))<least(6,length(source_text)))
        or strpos(source_text,item->>'quote')=0 then raise exception 'M83_INVALID_READING' using errcode='22023'; end if;
    end loop;
  elsif p_reading is not null then raise exception 'M83_INVALID_RESULT' using errcode='22023'; end if;
  if (p_status='complete' and p_reason_code is not null)
    or (p_status='indeterminate' and p_reason_code is distinct from 'READINGS_DISAGREE')
    or (p_status='unavailable' and coalesce(p_reason_code,'') not in ('PROVIDER_UNAVAILABLE','RESPONSE_INVALID','PROVIDER_TIMEOUT'))
    then raise exception 'M83_INVALID_REASON' using errcode='22023'; end if;
  update public.matching_trajectory_assessments set status=p_status,reading=p_reading,reason_code=p_reason_code,actual_model_version=p_actual_model_version,
    lease=null,lease_until=null,completed_at=clock_timestamp(),
    retry_after=case when p_status='unavailable' then clock_timestamp()+interval '5 minutes' end
    where id=r.id returning * into r;
  return to_jsonb(r)-array['lease','lease_until'];
end $$;
revoke all on function public.complete_matching_trajectory(uuid,uuid,uuid,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.complete_matching_trajectory(uuid,uuid,uuid,text,jsonb,text,text) to service_role;

-- Narrow compatibility extension; preserve the complete existing M6.2 authority/evidence contract.
do $$ declare definition text; old_versions text := '''vacancy-matching-explainable-4.0.0'', ''vacancy-matching-explainable-5.0.0''';
begin
  definition:=pg_get_functiondef('public.create_m62_verification_need(uuid,uuid,text,text)'::regprocedure);
  if strpos(definition,old_versions)=0 then raise exception 'M83_M62_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_versions,old_versions||', ''vacancy-matching-semantic-6.0.0''');
end $$;
