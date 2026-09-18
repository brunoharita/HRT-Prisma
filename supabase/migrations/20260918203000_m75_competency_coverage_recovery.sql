-- M7.5: preserve the last complete competency coverage, expose the latest attempt separately,
-- and isolate the bounded provider budget used by profile normalization.

create or replace function public.reserve_competency_normalization_call_v2(
  p_run_id uuid,p_lease uuid,p_daily_cap integer,p_monthly_cap integer
) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_day bigint; v_month bigint;
begin
  perform pg_advisory_xact_lock(hashtext('prisma-competency-normalization-budget'));
  if not exists(select 1 from public.profile_competency_normalization_runs where id=p_run_id and lease=p_lease and status='processing') then
    raise exception 'COMPETENCY_LEASE_INVALID';
  end if;
  select
    coalesce(sum(run.request_count) filter(where run.started_at>=date_trunc('day',now())),0),
    coalesce(sum(run.request_count),0)
    into v_day,v_month
  from public.profile_competency_normalization_runs run
  where run.started_at>=date_trunc('month',now()) and run.request_count>0;
  if p_daily_cap<=0 or p_monthly_cap<=0 or v_day>=p_daily_cap or v_month>=p_monthly_cap then return false; end if;
  update public.profile_competency_normalization_runs set request_count=request_count+1 where id=p_run_id;
  return true;
end $$;
revoke all on function public.reserve_competency_normalization_call_v2(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_competency_normalization_call_v2(uuid,uuid,integer,integer) to service_role;

-- Operational rollout boundary: enqueue every current approved profile without impersonating a user.
-- Repeated calls are idempotent while a retry is queued or processing, and never overwrite a complete run.
create or replace function public.request_current_profile_competency_normalizations() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_profile record; v_run_id uuid; v_run public.profile_competency_normalization_runs;
  v_eligible integer:=0; v_queued integer:=0;
begin
  for v_profile in
    select profile.id from public.professional_profiles profile
    where profile.review_status='approved' and profile.superseded_at is null
    order by profile.organization_id,profile.id
  loop
    v_eligible:=v_eligible+1;
    v_run_id:=private.enqueue_profile_competency_normalization(v_profile.id);
    select * into v_run from public.profile_competency_normalization_runs where id=v_run_id for update;
    if v_run.status='complete' then
      insert into public.profile_competency_normalization_runs(
        organization_id,profile_id,knowledge_global_version,knowledge_organization_version,original_terms,revision
      ) values(
        v_run.organization_id,v_run.profile_id,v_run.knowledge_global_version,v_run.knowledge_organization_version,v_run.original_terms,v_run.revision+1
      ) on conflict do nothing returning id into v_run_id;
      if v_run_id is null then
        select id into v_run_id from public.profile_competency_normalization_runs
        where profile_id=v_run.profile_id and method_version=v_run.method_version
          and knowledge_global_version=v_run.knowledge_global_version and knowledge_organization_version=v_run.knowledge_organization_version
          and revision=v_run.revision+1;
      end if;
    elsif v_run.status='failed' then
      update public.profile_competency_normalization_runs
        set status='queued',attempts=0,available_at=now(),started_at=null,completed_at=null,lease=null,error_code=null
        where id=v_run.id returning id into v_run_id;
    end if;
    if exists(select 1 from public.profile_competency_normalization_runs where id=v_run_id and status in ('queued','processing')) then
      v_queued:=v_queued+1;
    end if;
  end loop;
  return jsonb_build_object('eligibleProfiles',v_eligible,'queuedRuns',v_queued);
end $$;
revoke all on function public.request_current_profile_competency_normalizations() from public,anon,authenticated;
grant execute on function public.request_current_profile_competency_normalizations() to service_role;

-- Bug fix under the existing V2 contract: a failed retry cannot replace a compatible complete result.
create or replace function public.load_person_professional_evidence_map_v2(p_organization_id uuid,p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_base jsonb; v_run public.profile_competency_normalization_runs; v_associations jsonb; v_items jsonb; v_issues jsonb;
begin
  v_base:=public.load_person_professional_evidence_map(p_organization_id,p_person_id);
  select * into v_run from public.profile_competency_normalization_runs where organization_id=p_organization_id and profile_id=(v_base#>>'{profile,id}')::uuid
    and method_version='declared-competency-normalization-1.0.0'
    order by case when status='complete' then 0 else 1 end,sequence desc limit 1;
  if v_run.id is null then return v_base||jsonb_build_object('contractVersion','person-professional-evidence-2.0.0','normalization',jsonb_build_object('status','not_processed','declaredCount',
    (select jsonb_array_length(coalesce(profile_data->'competencies','[]'::jsonb)) from public.professional_profiles where id=(v_base#>>'{profile,id}')::uuid),'items','[]'::jsonb,'methodVersion','declared-competency-normalization-1.0.0','errorCode',null)); end if;
  select coalesce(jsonb_agg(item || jsonb_build_object('state',case
    when exists(select 1 from public.knowledge_observations human where human.organization_id=p_organization_id and human.profile_id=v_run.profile_id
      and human.original_term=item->>'originalTerm' and human.resolved_by_auth_user_id is not null) then 'human_preserved'
    when item->>'state'='resolved' and (
    concept.id is null or concept.status<>'approved' or (concept.scope='organization' and concept.organization_id<>p_organization_id)
    or (item->>'sourceVersionId' is not null and (source.id is null or source.import_status<>'published')))
    then 'source_unavailable' else item->>'state' end)),'[]'::jsonb) into v_items
    from jsonb_array_elements(v_run.result) item left join public.knowledge_concepts concept on concept.id=(item->>'conceptId')::uuid
    left join public.knowledge_source_versions source on source.id=(item->>'sourceVersionId')::uuid;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id','normalized:'||v_run.id::text||':'||ordinal,'nature','declared',
    'concept',jsonb_build_object('id',concept.id,'label',concept.canonical_label,'type',concept.concept_type,'scope',concept.scope,'version',concept.version),
    'observedTerm',item->>'originalTerm','evidence',jsonb_build_object('id',v_run.id::text||':'||ordinal,'title',item->>'normalizedTerm',
      'fact','Competência declarada, normalizada sem atribuir proficiência ou demonstração.','quote',item->>'sourceText','recordedAt',v_run.completed_at,
      'source',jsonb_build_object('kind','published_profile','label','Perfil publicado v'||(v_base#>>'{profile,version}'),
        'documentId',profile.source_document_id,'filename',null,'pageNumber',null,'fieldPath','competencies','reviewId',profile.review_id,'evidenceLinkId',null,'spatialRegionId',null)),
    'explanation',jsonb_build_object('method',case when item->>'method'='semantic_normalization' then 'Normalização semântica assistida pelo Knowledge Agent, com associação a alias aprovado; declaração original preservada.' else 'Separação conservadora de lista/nome e associação a alias aprovado da Knowledge.' end,
      'methodVersion',v_run.method_version,'taxonomyVersion','position-taxonomy-1.0.0','knowledgeGlobalVersion',v_run.knowledge_global_version,
      'knowledgeOrganizationVersion',v_run.knowledge_organization_version,'sourceName',item->>'sourceName','sourceVersion',item->>'sourceVersion','humanDecision',null),
    'verification',null) order by ordinal),'[]'::jsonb) into v_associations
    from jsonb_array_elements(v_items) with ordinality items(item,ordinal)
    join public.knowledge_concepts concept on concept.id=(item->>'conceptId')::uuid
    join public.professional_profiles profile on profile.id=v_run.profile_id and profile.organization_id=p_organization_id
    where item->>'state'='resolved';
  if jsonb_array_length(v_items)>0 or jsonb_array_length(v_run.original_terms)=0 then
    select coalesce(jsonb_agg(item),'[]'::jsonb)||v_associations into v_associations from jsonb_array_elements(v_base->'associations') item
      where item->>'nature'<>'declared' or item#>>'{explanation,humanDecision}' is not null or item->>'id' like 'profile-competency:%';
    select coalesce(jsonb_agg(jsonb_build_object('code',item->>'state','observedTerm',item->>'normalizedTerm','explanation',item->>'reason')),'[]'::jsonb)
      into v_issues from jsonb_array_elements(v_items) item where item->>'state' not in ('resolved','human_preserved');
  else
    v_associations:=v_base->'associations'; v_issues:=v_base->'issues';
  end if;
  if jsonb_array_length(v_items)=0 and jsonb_array_length(v_run.original_terms)>0 then
    select coalesce(jsonb_agg(jsonb_build_object('originalIndex',ordinal-1,'originalTerm',term,'sourceText',term,'normalizedTerm',term,
      'searchTerms',jsonb_build_array(term),'state','unresolved','reason','Declaração preservada; aguardando processamento da associação.')),'[]'::jsonb) into v_items
      from jsonb_array_elements_text(v_run.original_terms) with ordinality terms(term,ordinal);
  end if;
  return v_base||jsonb_build_object('contractVersion','person-professional-evidence-2.0.0','associations',v_associations,'issues',v_issues,
    'normalization',jsonb_build_object('status',v_run.status,'declaredCount',jsonb_array_length(v_run.original_terms),'items',v_items,
      'methodVersion',v_run.method_version,'errorCode',v_run.error_code));
end $$;

create or replace function public.load_person_professional_evidence_map_v5(p_organization_id uuid,p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  v_base jsonb; v_profile_id uuid; v_basis public.profile_competency_normalization_runs;
  v_latest public.profile_competency_normalization_runs; v_items jsonb; v_coverage jsonb;
begin
  v_base:=public.load_person_professional_evidence_map_v4(p_organization_id,p_person_id);
  v_profile_id:=(v_base#>>'{profile,id}')::uuid;
  select * into v_basis from public.profile_competency_normalization_runs where organization_id=p_organization_id and profile_id=v_profile_id
    and method_version='declared-competency-normalization-1.0.0'
    order by case when status='complete' then 0 else 1 end,sequence desc limit 1;
  select * into v_latest from public.profile_competency_normalization_runs where organization_id=p_organization_id and profile_id=v_profile_id
    and method_version='declared-competency-normalization-1.0.0' order by sequence desc limit 1;
  select coalesce(jsonb_agg(case when jsonb_typeof(item->'searchTerms')='array' then item
    else item||jsonb_build_object('searchTerms',jsonb_build_array(item->>'normalizedTerm')) end),'[]'::jsonb)
    into v_items from jsonb_array_elements(coalesce(v_base#>'{normalization,items}','[]'::jsonb)) item;
  v_base:=jsonb_set(v_base,'{normalization,items}',v_items,true);
  select jsonb_build_object(
    'totalItemCount',count(*),
    'associatedItemCount',count(*) filter(where item->>'state' in ('resolved','human_preserved')),
    'uniqueConceptCount',(select count(distinct association#>>'{concept,id}') from jsonb_array_elements(v_base->'associations') association where association->>'nature'='declared'),
    'pendingItemCount',count(*) filter(where item->>'state' not in ('resolved','human_preserved')),
    'uniquePendingTermCount',count(distinct private.normalize_knowledge_term(item->>'normalizedTerm')) filter(where item->>'state' not in ('resolved','human_preserved'))
  ) into v_coverage from jsonb_array_elements(v_items) item;
  v_base:=jsonb_set(v_base,'{normalization,coverage}',v_coverage,true);
  v_base:=jsonb_set(v_base,'{normalization,latestAttempt}',case when v_latest.id is null then 'null'::jsonb else jsonb_build_object(
    'runId',v_latest.id,'status',v_latest.status,'errorCode',v_latest.error_code,'completedAt',v_latest.completed_at,
    'usedAsBasis',v_basis.id=v_latest.id) end,true);
  return (v_base-'contractVersion')||jsonb_build_object('contractVersion','person-professional-evidence-3.1.0');
end $$;
revoke all on function public.load_person_professional_evidence_map_v5(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v5(uuid,uuid) to authenticated;

create or replace function public.curate_profile_competency_v3(
  p_organization_id uuid,p_person_id uuid,p_profile_id uuid,p_original_index integer,p_source_text text,p_normalized_term text,
  p_scope public.knowledge_scope,p_action text,p_concept_id uuid,p_reason text,p_proposal_label text,p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_legacy jsonb; v_projection jsonb;
begin
  v_legacy:=public.curate_profile_competency_v2(p_organization_id,p_person_id,p_profile_id,p_original_index,p_source_text,p_normalized_term,
    p_scope,p_action,p_concept_id,p_reason,p_proposal_label,p_proposal_type);
  v_projection:=public.load_person_professional_evidence_map_v5(p_organization_id,p_person_id);
  return jsonb_build_object('workflowVersion','profile-competency-curation-3.0.0','outcome',v_legacy->>'outcome',
    'projection',v_projection,'proposalId',v_legacy->'proposalId');
end $$;
revoke all on function public.curate_profile_competency_v3(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) from public,anon;
grant execute on function public.curate_profile_competency_v3(uuid,uuid,uuid,integer,text, text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) to authenticated;

comment on function public.load_person_professional_evidence_map_v5(uuid,uuid) is
  'M7.5 projection: last complete compatible normalization remains the evidence basis; latest attempt and coverage are explicit.';
comment on function public.reserve_competency_normalization_call_v2(uuid,uuid,integer,integer) is
  'Atomically reserves one call from the dedicated, bounded competency-normalization budget.';
