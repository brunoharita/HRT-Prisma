-- M7.3: derived, tenant-scoped normalization. Reviewed profile snapshots remain immutable.
create table public.profile_competency_normalization_runs (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity,
  revision integer not null default 1,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null,
  method_version text not null default 'declared-competency-normalization-1.0.0',
  knowledge_global_version bigint not null,
  knowledge_organization_version bigint not null,
  original_terms jsonb not null check(jsonb_typeof(original_terms)='array'),
  status text not null default 'queued' check(status in ('queued','processing','complete','failed')),
  result jsonb not null default '[]' check(jsonb_typeof(result)='array'),
  attempts integer not null default 0,
  lease uuid,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  error_code text,
  model text,
  request_count integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  foreign key (organization_id,profile_id) references public.professional_profiles(organization_id,id) on delete cascade,
  unique(profile_id,method_version,knowledge_global_version,knowledge_organization_version,revision)
);
alter table public.profile_competency_normalization_runs enable row level security;
revoke all on public.profile_competency_normalization_runs from public,anon,authenticated;
grant select,insert,update on public.profile_competency_normalization_runs to service_role;
create index profile_competency_normalization_queue_idx on public.profile_competency_normalization_runs(available_at,created_at)
  where status in ('queued','processing','failed');
create index profile_competency_normalization_profile_idx on public.profile_competency_normalization_runs(organization_id,profile_id,created_at desc);

create function private.enqueue_profile_competency_normalization(p_profile_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_profile public.professional_profiles; v_global bigint; v_org bigint; v_id uuid;
begin
  select * into v_profile from public.professional_profiles where id=p_profile_id and review_status='approved' and superseded_at is null;
  if not found then return null; end if;
  select coalesce(max(version) filter(where scope='global'),0),coalesce(max(version) filter(where scope='organization' and organization_id=v_profile.organization_id),0)
    into v_global,v_org from public.knowledge_change_sets;
  insert into public.profile_competency_normalization_runs(organization_id,profile_id,knowledge_global_version,knowledge_organization_version,original_terms)
    values(v_profile.organization_id,v_profile.id,v_global,v_org,
      case when jsonb_typeof(v_profile.profile_data->'competencies')='array' then v_profile.profile_data->'competencies' else '[]'::jsonb end)
    on conflict(profile_id,method_version,knowledge_global_version,knowledge_organization_version,revision) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.profile_competency_normalization_runs
    where profile_id=v_profile.id and method_version='declared-competency-normalization-1.0.0' and knowledge_global_version=v_global and knowledge_organization_version=v_org order by revision desc limit 1; end if;
  return v_id;
end $$;
revoke all on function private.enqueue_profile_competency_normalization(uuid) from public,anon,authenticated;

create function private.capture_profile_competency_normalization() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.enqueue_profile_competency_normalization(new.id);
  return new;
end $$;
revoke all on function private.capture_profile_competency_normalization() from public,anon,authenticated;
create trigger capture_profile_competency_normalization after insert or update of review_status,superseded_at on public.professional_profiles
  for each row execute function private.capture_profile_competency_normalization();

create function public.request_profile_competency_normalization(p_organization_id uuid,p_person_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_run uuid; v_previous public.profile_competency_normalization_runs;
begin
  perform private.require_document_reviewer(p_organization_id);
  select id into v_id from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id
    and review_status='approved' and superseded_at is null order by profile_version desc limit 1;
  if v_id is null then raise exception 'PERSON_PUBLISHED_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  v_run:=private.enqueue_profile_competency_normalization(v_id);
  select * into v_previous from public.profile_competency_normalization_runs where id=v_run for update;
  if v_previous.status='complete' then
    insert into public.profile_competency_normalization_runs(organization_id,profile_id,knowledge_global_version,knowledge_organization_version,original_terms,revision)
      values(v_previous.organization_id,v_previous.profile_id,v_previous.knowledge_global_version,v_previous.knowledge_organization_version,v_previous.original_terms,v_previous.revision+1)
      on conflict do nothing returning id into v_run;
  end if;
  -- A retry never changes a completed interpretation or overrides a human decision.
  update public.profile_competency_normalization_runs set status='queued',attempts=0,available_at=now(),error_code=null
    where id=v_run and status='failed';
  return v_run;
end $$;
revoke all on function public.request_profile_competency_normalization(uuid,uuid) from public,anon;
grant execute on function public.request_profile_competency_normalization(uuid,uuid) to authenticated;

create function public.claim_profile_competency_normalization() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_run public.profile_competency_normalization_runs;
begin
  select run.* into v_run from public.profile_competency_normalization_runs run
    join public.professional_profiles profile on profile.id=run.profile_id and profile.organization_id=run.organization_id
    where profile.review_status='approved' and profile.superseded_at is null and run.attempts<3
      and run.method_version='declared-competency-normalization-1.0.0'
      and ((run.status in ('queued','failed') and run.available_at<=now()) or (run.status='processing' and run.started_at<now()-interval '5 minutes'))
      and not exists(select 1 from public.profile_competency_normalization_runs newer where newer.profile_id=run.profile_id and newer.sequence>run.sequence)
    order by run.created_at limit 1 for update of run skip locked;
  if v_run.id is null then return null; end if;
  update public.profile_competency_normalization_runs set status='processing',lease=gen_random_uuid(),started_at=now(),attempts=attempts+1,error_code=null
    where id=v_run.id returning * into v_run;
  return jsonb_build_object('id',v_run.id,'organizationId',v_run.organization_id,'lease',v_run.lease,'terms',v_run.original_terms,
    'externalEnabled',coalesce((select allow_external_knowledge_enrichment from public.organization_knowledge_settings where organization_id=v_run.organization_id),false),
    'humanTerms',coalesce((select jsonb_agg(original_term) from public.knowledge_observations where organization_id=v_run.organization_id and profile_id=v_run.profile_id and resolved_by_auth_user_id is not null),'[]'::jsonb));
end $$;
revoke all on function public.claim_profile_competency_normalization() from public,anon,authenticated;
grant execute on function public.claim_profile_competency_normalization() to service_role;

-- Exact approved aliases after semantic normalization, never raw similarity as fact.
create function private.resolve_normalized_competency(p_org uuid,p_source text,p_search jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_ids uuid[]; v_ambiguous boolean; v_source record; v_concept public.knowledge_concepts; v_authority record;
begin
  select * into v_source from public.resolve_knowledge_term_v2(p_org,p_source,'pt-BR');
  if v_source.resolution_state='resolved' and v_source.concept_type<>'occupation' then
    v_ids:=array[v_source.concept_id];
  elsif v_source.resolution_state='ambiguous' then
    return jsonb_build_object('state','ambiguous','conceptId',null,'reason','A declaração possui mais de um alias aprovado. Requer curadoria.');
  else
    with candidates as (
      select concept.id,term.ambiguous,case when term.scope='organization' then 1 else 2 end priority
      from jsonb_array_elements_text(p_search) expression
      join public.knowledge_terms term on term.normalized_term=private.normalize_knowledge_term(expression.value)
      join public.knowledge_concepts concept on concept.id=term.concept_id
      left join public.knowledge_source_versions source on source.id=term.source_version_id
      where term.status='approved' and concept.status='approved' and concept.concept_type<>'occupation'
        and (term.scope='global' or term.organization_id=p_org) and (concept.scope='global' or concept.organization_id=p_org)
        and (term.source_version_id is null or (source.import_status='published' and source.is_current))
    ), preferred as (select * from candidates where priority=(select min(priority) from candidates))
    select array_agg(distinct id),bool_or(ambiguous) into v_ids,v_ambiguous from preferred;
  end if;
  if coalesce(array_length(v_ids,1),0)<>1 or coalesce(v_ambiguous,false) then
    return jsonb_build_object('state',case when coalesce(array_length(v_ids,1),0)>0 then 'ambiguous' else 'unresolved' end,'conceptId',null,
      'reason',case when coalesce(array_length(v_ids,1),0)>0 then 'Mais de um conceito publicado pode corresponder ao termo normalizado.' else 'Declaração preservada; ainda sem conceito equivalente publicado na Knowledge.' end);
  end if;
  select * into v_concept from public.knowledge_concepts where id=v_ids[1] and status='approved' and (scope='global' or organization_id=p_org);
  if not found then return jsonb_build_object('state','unresolved','conceptId',null,'reason','Conceito indisponível para esta empresa.'); end if;
  select source.name,version.id,version.external_version into v_authority
    from public.knowledge_external_mappings mapping join public.knowledge_source_versions version on version.id=mapping.source_version_id and version.import_status='published' and version.is_current
    join public.knowledge_sources source on source.id=version.source_id where mapping.concept_id=v_concept.id
    order by case source.name when 'ESCO' then 1 when 'O*NET' then 2 else 3 end,source.name limit 1;
  return jsonb_build_object('state','resolved','conceptId',v_concept.id,'conceptVersion',v_concept.version,'sourceVersionId',v_authority.id,
    'sourceName',v_authority.name,'sourceVersion',v_authority.external_version,'reason','Declaração normalizada e vinculada a conceito aprovado da Knowledge.');
end $$;
revoke all on function private.resolve_normalized_competency(uuid,text,jsonb) from public,anon,authenticated;

create function public.complete_profile_competency_normalization(p_run_id uuid,p_lease uuid,p_items jsonb,p_error text default null,p_model text default null,p_input_tokens integer default null,p_output_tokens integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_run public.profile_competency_normalization_runs; v_item jsonb; v_result jsonb:='[]'; v_original text; v_resolution jsonb; v_index integer; v_human record;
begin
  select * into v_run from public.profile_competency_normalization_runs where id=p_run_id for update;
  if not found or v_run.status<>'processing' or v_run.lease is distinct from p_lease then raise exception 'COMPETENCY_LEASE_INVALID' using errcode='40001'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>400 then raise exception 'COMPETENCY_ITEMS_INVALID'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index:=(v_item->>'originalIndex')::integer;
    v_original:=v_run.original_terms->>v_index;
    if v_index is null or v_index<0 or v_original is null or coalesce(jsonb_typeof(v_item->'sourceText'),'null')<>'string' or length(btrim(v_item->>'sourceText'))=0
      or strpos(v_original,v_item->>'sourceText')=0 or coalesce(length(btrim(v_item->>'normalizedTerm')),0) not between 1 and 240
      or coalesce(jsonb_typeof(v_item->'searchTerms'),'null')<>'array' or jsonb_array_length(v_item->'searchTerms')>4
      or coalesce(v_item->>'method','') not in ('deterministic','semantic_normalization')
      or coalesce(jsonb_typeof(v_item->'ambiguous'),'null')<>'boolean' then raise exception 'COMPETENCY_ITEMS_UNGROUNDED'; end if;
    if exists(select 1 from jsonb_array_elements(v_item->'searchTerms') t where jsonb_typeof(t)<>'string' or length(btrim(t#>>'{}')) not between 1 and 240) then raise exception 'COMPETENCY_SEARCH_INVALID'; end if;
    select observation.concept_id,observation.resolution_state into v_human from public.knowledge_observations observation
      where observation.organization_id=v_run.organization_id and observation.profile_id=v_run.profile_id
        and observation.original_term=v_original and observation.resolved_by_auth_user_id is not null limit 1;
    if found then
      -- Human observations remain the authority; the V1 projection already renders their provenance.
      v_resolution:=jsonb_build_object('state','human_preserved','conceptId',v_human.concept_id,'reason','Decisão humana existente preservada.');
    elsif (v_item->>'ambiguous')::boolean then
      v_resolution:=jsonb_build_object('state','ambiguous','conceptId',null,'reason','A interpretação da declaração exige revisão humana.');
    else
      v_resolution:=private.resolve_normalized_competency(v_run.organization_id,v_item->>'sourceText',v_item->'searchTerms');
    end if;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('originalIndex',v_index,'originalTerm',v_original,'sourceText',v_item->>'sourceText',
      'normalizedTerm',v_item->>'normalizedTerm','searchTerms',v_item->'searchTerms','method',v_item->>'method')||v_resolution);
    if v_resolution->>'state' in ('unresolved','ambiguous') then
      -- Reuse human curatorship without attaching a compound raw observation to one atom.
      insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status)
        values('organization',v_run.organization_id,
          encode(extensions.digest(concat_ws('|','organization',v_run.organization_id::text,'pt-BR',private.normalize_knowledge_term(v_item->>'normalizedTerm')),'sha256'),'hex'),
          v_item->>'normalizedTerm',private.normalize_knowledge_term(v_item->>'normalizedTerm'),'pt-BR',
          case when v_resolution->>'state'='ambiguous' then 'ambiguous'::public.knowledge_inbox_status else 'unresolved'::public.knowledge_inbox_status end)
        on conflict(scope,organization_id,fingerprint) do update set last_seen_at=now();
    end if;
  end loop;
  if (p_error is null or jsonb_array_length(p_items)>0) and exists(select 1 from jsonb_array_elements_text(v_run.original_terms) with ordinality term(value,ordinal)
    where btrim(value)<>'' and not exists(select 1 from jsonb_array_elements(v_result) item where (item->>'originalIndex')::bigint=term.ordinal-1)) then raise exception 'COMPETENCY_ITEMS_INCOMPLETE'; end if;
  update public.profile_competency_normalization_runs set result=v_result,status=case when p_error is null then 'complete' else 'failed' end,
    error_code=case when p_error in ('PROVIDER_UNAVAILABLE','BUDGET_LIMITED','RESPONSE_INVALID','INPUT_LIMIT','AI_DISABLED') then p_error when p_error is not null then 'PROCESSING_FAILED' end,
    completed_at=now(),available_at=now()+interval '15 minutes',model=p_model,input_tokens=p_input_tokens,output_tokens=p_output_tokens
    where id=v_run.id;
end $$;
revoke all on function public.complete_profile_competency_normalization(uuid,uuid,jsonb,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.complete_profile_competency_normalization(uuid,uuid,jsonb,text,text,integer,integer) to service_role;

-- Reserve one bounded provider call atomically. Reuses the existing research budget and records usage.
create function public.reserve_competency_normalization_call(p_run_id uuid,p_lease uuid,p_daily_cap integer,p_monthly_cap integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_day bigint; v_month bigint;
begin
  perform pg_advisory_xact_lock(hashtext('prisma-knowledge-provider-budget'));
  if not exists(select 1 from public.profile_competency_normalization_runs where id=p_run_id and lease=p_lease and status='processing') then raise exception 'COMPETENCY_LEASE_INVALID'; end if;
  select count(*) filter(where created_at>=date_trunc('day',now())),count(*) into v_day,v_month from (
    select created_at from public.knowledge_research_runs where request_count>0
    union all select created_at from public.vacancy_advisor_research_runs where request_count>0
    union all select started_at from public.profile_competency_normalization_runs run cross join lateral generate_series(1,run.request_count)
  ) calls where created_at>=date_trunc('month',now());
  if p_daily_cap<=0 or p_monthly_cap<=0 or v_day>=p_daily_cap or v_month>=p_monthly_cap then return false; end if;
  update public.profile_competency_normalization_runs set request_count=request_count+1 where id=p_run_id;
  return true;
end $$;
revoke all on function public.reserve_competency_normalization_call(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_competency_normalization_call(uuid,uuid,integer,integer) to service_role;

-- Keep the original public V1 RPC unchanged so an old frontend stays operational during rollout.

create function public.load_person_professional_evidence_map_v2(p_organization_id uuid,p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_base jsonb; v_run public.profile_competency_normalization_runs; v_associations jsonb; v_items jsonb; v_issues jsonb;
begin
  v_base:=public.load_person_professional_evidence_map(p_organization_id,p_person_id);
  select * into v_run from public.profile_competency_normalization_runs where organization_id=p_organization_id and profile_id=(v_base#>>'{profile,id}')::uuid
    and method_version='declared-competency-normalization-1.0.0' order by sequence desc limit 1;
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
    select coalesce(jsonb_agg(jsonb_build_object('originalIndex',ordinal-1,'originalTerm',term,'sourceText',term,'normalizedTerm',term,'state','unresolved',
      'reason','Declaração preservada; aguardando processamento da associação.')),'[]'::jsonb) into v_items
      from jsonb_array_elements_text(v_run.original_terms) with ordinality terms(term,ordinal);
  end if;
  return v_base||jsonb_build_object('contractVersion','person-professional-evidence-2.0.0','associations',v_associations,'issues',v_issues,
    'normalization',jsonb_build_object('status',v_run.status,'declaredCount',jsonb_array_length(v_run.original_terms),'items',v_items,
      'methodVersion',v_run.method_version,'errorCode',v_run.error_code));
end $$;
revoke all on function public.load_person_professional_evidence_map_v2(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v2(uuid,uuid) to authenticated;

-- Explicitly authorized refresh: only derived rows for current published profiles, never originals.
select private.enqueue_profile_competency_normalization(id) from public.professional_profiles where review_status='approved' and superseded_at is null;
