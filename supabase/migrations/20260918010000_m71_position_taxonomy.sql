-- M7.1: on-demand projection of the existing Knowledge; no parallel ontology.
-- New metadata belongs to immutable position definition/requirement versions.
alter table public.vacancy_versions add column taxonomy_snapshot jsonb;
alter table public.vacancy_requirements add column taxonomy_origin jsonb;
alter table public.vacancy_versions add constraint vacancy_taxonomy_snapshot_object
  check (taxonomy_snapshot is null or (jsonb_typeof(taxonomy_snapshot) = 'object'
    and taxonomy_snapshot->>'contractVersion' = 'position-taxonomy-1.0.0'));
alter table public.vacancy_requirements add constraint vacancy_taxonomy_origin_object
  check (taxonomy_origin is null or jsonb_typeof(taxonomy_origin) = 'object');

create function private.m71_require_editor(p_organization_id uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_organization_id is null
    or not exists(select 1 from public.organizations o where o.id=p_organization_id) or not private.has_org_role(
    p_organization_id, array['owner','admin','recruiter']::public.membership_role[]
  ) then raise exception using errcode = '42501', message = 'POSITION_TAXONOMY_UNAUTHORIZED'; end if;
  return auth.uid();
end;
$$;
revoke all on function private.m71_require_editor(uuid) from public, anon, authenticated;

-- Only published/current official mappings and explicitly approved reconciliations.
-- Reconciliation is a governed identity link, never lexical similarity.
create function private.m71_official_links(p_organization_id uuid, p_concept_id uuid)
returns table(source_concept_id uuid, source_id uuid, source_version_id uuid, reference jsonb)
language sql stable security definer set search_path = '' as $$
  with recursive linked(id) as (
    select c.id from public.knowledge_concepts c where c.id = p_concept_id and c.status = 'approved'
      and c.concept_type = 'occupation' and (c.scope = 'global' or c.organization_id = p_organization_id)
    union
    select case when r.canonical_occupation_concept_id = l.id then r.source_occupation_concept_id
      else r.canonical_occupation_concept_id end
    from linked l join public.knowledge_occupation_reconciliations r
      on l.id in (r.canonical_occupation_concept_id, r.source_occupation_concept_id) and r.status = 'approved'
  ), mapped as (
    select m.*, c.canonical_label from linked l join public.knowledge_concepts c on c.id = l.id
      join public.knowledge_external_mappings m on m.concept_id = c.id
    where c.status = 'approved' and c.concept_type = 'occupation'
      and (c.scope = 'global' or c.organization_id = p_organization_id)
  )
  select m.concept_id, s.id, v.id, jsonb_build_object(
    'mappingId', m.id, 'conceptId', m.concept_id, 'sourceId', s.id, 'source', s.name,
    'snapshotId', v.id, 'sourceVersion', v.external_version, 'externalId', m.external_id,
    'externalUri', m.external_uri, 'label', coalesce(st.preferred_label, m.canonical_label),
    'mappingType', m.mapping_type, 'method', case when m.concept_id = p_concept_id then 'published_mapping' else 'approved_reconciliation' end,
    'provenance', m.provenance, 'recordedAt', m.created_at,
    'reconciliations', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'method',r.method,'decidedAt',r.decided_at,
      'decidedBy',r.decided_by_auth_user_id,'evidence',r.evidence,'rationale',r.rationale))
      from public.knowledge_occupation_reconciliations r where r.status='approved'
      and r.canonical_occupation_concept_id in (select id from linked)
      and r.source_occupation_concept_id in (select id from linked)), '[]'::jsonb))
  from mapped m join public.knowledge_sources s on s.id = m.source_id
    join public.knowledge_source_versions v on v.id = m.source_version_id and v.source_id = s.id
    left join lateral (select stage.preferred_label from public.knowledge_source_stage_records stage
      where stage.source_version_id=v.id and stage.external_id=m.external_id and stage.record_kind='concept' limit 1) st on true
  where s.name in ('CBO','ESCO','O*NET') and s.status='approved' and v.import_status='published' and v.is_current;
$$;
revoke all on function private.m71_official_links(uuid,uuid) from public, anon, authenticated;

create function private.m71_concept_allowed(p_organization_id uuid, p_concept_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.knowledge_concepts c where c.id=p_concept_id and c.status='approved'
    and c.concept_type='occupation' and ((c.scope='organization' and c.organization_id=p_organization_id)
      or (c.scope='global' and exists(select 1 from private.m71_official_links(p_organization_id,c.id)))));
$$;
revoke all on function private.m71_concept_allowed(uuid,uuid) from public, anon, authenticated;

create function private.m71_taxonomy(p_organization_id uuid, p_concept_id uuid, p_complement_ids uuid[] default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_concept jsonb; v_references jsonb; v_items jsonb; v_complements jsonb;
begin
  if p_concept_id is not null and not private.m71_concept_allowed(p_organization_id,p_concept_id) then
    raise exception using errcode='22023', message='POSITION_REFERENCE_UNAVAILABLE';
  end if;
  if exists(select 1 from unnest(p_complement_ids) id where not exists(select 1 from public.knowledge_concepts c
    where c.id=id and c.scope='organization' and c.organization_id=p_organization_id and c.status='approved' and c.concept_type<>'occupation')) then
    raise exception using errcode='42501', message='POSITION_COMPLEMENT_SCOPE_INVALID';
  end if;
  select jsonb_build_object('id',c.id,'label',c.canonical_label,'scope',c.scope,'organizationId',c.organization_id,
    'version',c.version,'description',c.description,'provenance',c.provenance) into v_concept
    from public.knowledge_concepts c where c.id=p_concept_id;
  select coalesce(jsonb_agg(l.reference order by l.reference->>'source',l.reference->>'externalId'),'[]'::jsonb)
    into v_references from private.m71_official_links(p_organization_id,p_concept_id) l;
  -- Group only by stable concept identity. Same labels are not enough to merge.
  select coalesce(jsonb_agg(item order by item->>'conceptType',item->>'label'),'[]'::jsonb) into v_items from (
    select jsonb_build_object('conceptId',c.id,'label',c.canonical_label,'conceptType',c.concept_type,
      'scope',c.scope,'organizationId',c.organization_id,'conceptVersion',c.version,
      'origins',jsonb_agg(jsonb_build_object('relationId',r.id,'relationVersion',r.version,'relationType',r.relation_type,
        'reference',l.reference,'attributes',r.relation_attributes,'provenance',r.provenance,'recordedAt',r.created_at)
        order by r.id)) item
    from private.m71_official_links(p_organization_id,p_concept_id) l
      join public.knowledge_relations r on r.source_concept_id=l.source_concept_id and r.source_id=l.source_id
        and r.source_version_id=l.source_version_id and r.status='approved'
      join public.knowledge_concepts c on c.id=r.target_concept_id and c.status='approved'
    where (r.scope='global' or r.organization_id=p_organization_id)
      and (c.scope='global' or c.organization_id=p_organization_id)
    group by c.id
  ) items;
  select coalesce(jsonb_agg(jsonb_build_object('conceptId',c.id,'label',c.canonical_label,'conceptType',c.concept_type,
    'scope','organization','organizationId',c.organization_id,'conceptVersion',c.version,'description',c.description,
    'origins',jsonb_build_array(jsonb_build_object('method','organization_knowledge','provenance',c.provenance,
      'changeSetId',c.change_set_id,'recordedAt',c.created_at))) order by c.canonical_label),'[]'::jsonb)
    into v_complements from public.knowledge_concepts c where c.id=any(p_complement_ids)
      and c.scope='organization' and c.organization_id=p_organization_id and c.status='approved';
  return jsonb_build_object('concept',v_concept,'references',v_references,'items',v_items,'complements',v_complements);
end;
$$;
revoke all on function private.m71_taxonomy(uuid,uuid,uuid[]) from public, anon, authenticated;

create function public.preview_position_taxonomy(p_organization_id uuid, p_title text,
  p_selected_concept_id uuid default null, p_decision text default 'automatic', p_complement_ids uuid[] default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_normalized text; v_ids uuid[]; v_ambiguous boolean; v_concept uuid; v_state text;
  v_method text; v_candidates jsonb; v_taxonomy jsonb; v_terms jsonb := '[]'::jsonb;
begin
  perform private.m71_require_editor(p_organization_id);
  if p_decision not in ('automatic','human','cleared') or p_decision is null
    or p_title is null or char_length(p_title)>240 or nullif(btrim(p_title),'') is null then
    raise exception using errcode='22023', message='POSITION_TAXONOMY_INPUT_INVALID'; end if;
  v_normalized := private.normalize_knowledge_term(p_title);
  if p_decision='automatic' then
  with matches as (
    select distinct coalesce(r.canonical_occupation_concept_id,c.id) id, t.ambiguous,
      jsonb_build_object('id',t.id,'term',t.term,'scope',t.scope,'organizationId',t.organization_id,
        'version',t.version,'sourceVersionId',t.source_version_id,'ambiguous',t.ambiguous) term,
      case when t.scope='organization' then 1 else 2 end priority
    from public.knowledge_terms t join public.knowledge_concepts c on c.id=t.concept_id
      left join public.knowledge_occupation_reconciliations r on r.source_occupation_concept_id=c.id and r.status='approved'
    where t.normalized_term=v_normalized and t.status='approved'
      and (t.scope='global' or (t.scope='organization' and t.organization_id=p_organization_id))
      and private.m71_concept_allowed(p_organization_id,c.id)
      and private.m71_concept_allowed(p_organization_id,coalesce(r.canonical_occupation_concept_id,c.id))
      and (t.source_version_id is null or exists(select 1 from public.knowledge_source_versions v
        join public.knowledge_sources s on s.id=v.source_id where v.id=t.source_version_id
        and v.is_current and v.import_status='published' and s.name in ('CBO','ESCO','O*NET')))
  ) select array_agg(distinct id),bool_or(ambiguous),coalesce(jsonb_agg(term),'[]'::jsonb) into v_ids,v_ambiguous,v_terms
    from matches where priority=(select min(priority) from matches);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',c.description,'scope',c.scope)
    order by c.canonical_label),'[]'::jsonb) into v_candidates from public.knowledge_concepts c where c.id=any(v_ids);
  if p_decision='human' then
    if p_selected_concept_id is null or not private.m71_concept_allowed(p_organization_id,p_selected_concept_id) then
      raise exception using errcode='22023',message='POSITION_REFERENCE_UNAVAILABLE'; end if;
    v_concept:=p_selected_concept_id; v_state:='resolved'; v_method:='human_selection';
  elsif p_decision='cleared' then v_state:='unresolved'; v_method:='human_removal';
  elsif cardinality(v_ids)=1 and not v_ambiguous then
    v_concept:=v_ids[1]; v_state:='resolved'; v_method:='approved_exact_alias';
  else v_state:=case when cardinality(v_ids)>0 then 'ambiguous' else 'unresolved' end; v_method:='no_safe_match'; end if;
  v_taxonomy:=private.m71_taxonomy(p_organization_id,v_concept,p_complement_ids);
  return v_taxonomy || jsonb_build_object('contractVersion','position-taxonomy-1.0.0','organizationId',p_organization_id,
    'originalTitle',p_title,'normalizedTerm',v_normalized,'state',v_state,'method',v_method,'decision',p_decision,
    'candidates',v_candidates,'matchedTerms',v_terms,'recordedAt',now(),'actorId',case when p_decision<>'automatic' then auth.uid() end);
end;
$$;
revoke all on function public.preview_position_taxonomy(uuid,text,uuid,text,uuid[]) from public, anon;
grant execute on function public.preview_position_taxonomy(uuid,text,uuid,text,uuid[]) to authenticated;

create function public.search_position_taxonomy(p_organization_id uuid,p_query text,p_kind text default 'occupation',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_items jsonb; v_count integer;
begin
  perform private.m71_require_editor(p_organization_id);
  if p_kind not in ('occupation','complement') or p_kind is null or p_offset<0 or p_offset is null
    or char_length(coalesce(p_query,''))>240 then raise exception using errcode='22023',message='POSITION_SEARCH_INVALID'; end if;
  with term_candidates as materialized (
    select distinct t.concept_id from public.knowledge_terms t
    where t.status='approved' and (t.scope='global' or t.organization_id=p_organization_id)
      and position(private.normalize_knowledge_term(coalesce(p_query,'')) in t.normalized_term)>0
  ), candidates as materialized (
    select c.id,c.canonical_label,c.concept_type,c.scope,c.description from public.knowledge_concepts c
    where c.status='approved' and (
      (p_kind='occupation' and private.m71_concept_allowed(p_organization_id,c.id)) or
      (p_kind='complement' and c.scope='organization' and c.organization_id=p_organization_id and c.concept_type<>'occupation'))
    and c.id in (select concept_id from term_candidates)
  ), page as (select * from candidates order by canonical_label,id limit 25 offset p_offset)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',canonical_label,'conceptType',concept_type,'scope',scope,'description',description)
    order by canonical_label,id),'[]'::jsonb),(select count(*) from candidates) into v_items,v_count from page;
  return jsonb_build_object('items',v_items,'total',v_count);
end;
$$;
revoke all on function public.search_position_taxonomy(uuid,text,text,integer) from public, anon;
grant execute on function public.search_position_taxonomy(uuid,text,text,integer) to authenticated;

-- A human admin's explicit creation uses the existing Inbox -> proposal -> approval.
-- No scope argument can redirect this endpoint to Global.
create function public.create_position_knowledge_complement(p_organization_id uuid,p_label text,
  p_concept_type public.knowledge_concept_type,p_description text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_ids uuid[]; v_inbox uuid; v_proposal uuid; v_concept uuid; v_fingerprint text; v_payload jsonb;
begin
  perform private.m71_require_editor(p_organization_id);
  v_actor:=private.require_knowledge_admin(p_organization_id);
  if p_concept_type is null or p_concept_type='occupation' or nullif(btrim(p_label),'') is null
    or char_length(p_label)>240 or char_length(coalesce(p_description,''))>4000 then
    raise exception using errcode='22023',message='POSITION_COMPLEMENT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text||'|'||private.normalize_knowledge_term(p_label),0));
  select array_agg(distinct c.id) into v_ids from public.knowledge_concepts c
    join public.knowledge_terms t on t.concept_id=c.id where c.scope='organization' and c.organization_id=p_organization_id
    and t.scope='organization' and t.organization_id=p_organization_id and t.status='approved' and not t.ambiguous
    and c.status='approved' and c.concept_type=p_concept_type and t.normalized_term=private.normalize_knowledge_term(p_label);
  if cardinality(v_ids)=1 then return v_ids[1]; end if;
  if cardinality(v_ids)>1 then raise exception using errcode='22023',message='POSITION_COMPLEMENT_AMBIGUOUS'; end if;
  v_fingerprint:=encode(extensions.digest(concat_ws('|','position-complement',p_organization_id::text,
    p_concept_type::text,private.normalize_knowledge_term(p_label)),'sha256'),'hex');
  insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status,
    candidate_concept_ids,evidence_reference_ids,observation_ids,created_by_auth_user_id)
    values('organization',p_organization_id,v_fingerprint,p_label,private.normalize_knowledge_term(p_label),'pt-BR','unresolved','{}','{}','{}',v_actor)
    on conflict(scope,organization_id,fingerprint) do update set last_seen_at=now() returning id into v_inbox;
  v_proposal:=public.propose_knowledge_concept_from_inbox(v_inbox,'organization',p_label,p_concept_type,p_description,
    'Complemento criado explicitamente na Knowledge da empresa por administrador autorizado.');
  -- The factory includes the original term as alias. Here it IS the canonical
  -- label, already inserted by approval; do not duplicate that implicit term.
  -- Preserve the original proposal; the decision payload records this mechanical
  -- normalization of the explicit human creation, with both copies audited.
  select jsonb_set(p.original_proposal,'{aliases}','[]'::jsonb) into v_payload
    from public.knowledge_proposals p where p.id=v_proposal and p.organization_id=p_organization_id;
  select a.concept_id into v_concept from public.approve_knowledge_proposal(v_proposal,v_payload,
    'Criação confirmada na Knowledge da empresa; alias idêntico ao canônico omitido. Não implica requisito da Posição.') a;
  return v_concept;
end;
$$;
revoke all on function public.create_position_knowledge_complement(uuid,text,public.knowledge_concept_type,text) from public, anon;
grant execute on function public.create_position_knowledge_complement(uuid,text,public.knowledge_concept_type,text) to authenticated;

create function public.save_position_taxonomy(p_organization_id uuid,p_draft jsonb,p_expected_version_id uuid default null)
returns table(vacancy_id uuid,vacancy_version_id uuid,version integer,created boolean)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid; v_current public.vacancies; v_saved record; v_snapshot jsonb; v_concept uuid;
  v_complements uuid[]; v_item jsonb; v_req jsonb; v_origin jsonb; v_attempt uuid; v_decision text; v_previous jsonb;
begin
  v_actor:=private.m71_require_editor(p_organization_id);
  if p_draft is null or jsonb_typeof(p_draft)<>'object' or p_draft->>'taxonomyContract' is distinct from 'position-taxonomy-1.0.0' then
    raise exception using errcode='22023',message='POSITION_TAXONOMY_VERSION_INVALID'; end if;
  v_id:=nullif(p_draft->>'id','')::uuid;
  if v_id is not null then
    select * into v_current from public.vacancies v where v.organization_id=p_organization_id and v.id=v_id for update;
    if not found then raise exception using errcode='42501',message='POSITION_TAXONOMY_UNAUTHORIZED'; end if;
    if v_current.current_version_id is distinct from p_expected_version_id then
      raise exception using errcode='40001',message='POSITION_VERSION_CONFLICT'; end if;
    select taxonomy_snapshot into v_previous from public.vacancy_versions where id=v_current.current_version_id and organization_id=p_organization_id;
  elsif p_expected_version_id is not null then raise exception using errcode='22023',message='POSITION_VERSION_CONFLICT'; end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into v_complements
    from jsonb_array_elements_text(coalesce(p_draft->'taxonomyComplementIds','[]'::jsonb));
  v_decision:=coalesce(p_draft->>'taxonomyDecision','automatic');
  v_snapshot:=public.preview_position_taxonomy(p_organization_id,p_draft->>'title',
    nullif(p_draft->>'referenceConceptId','')::uuid,v_decision,v_complements);
  v_concept:=(v_snapshot#>>'{concept,id}')::uuid;
  -- Every selected requirement concept must be visible. Taxonomy suggestions never generate requirements here.
  for v_req in select value from jsonb_array_elements(coalesce(p_draft->'requirements','[]'::jsonb)) loop
    if nullif(v_req->>'conceptId','') is not null and not exists(select 1 from public.knowledge_concepts c
      where c.id=(v_req->>'conceptId')::uuid and c.status='approved' and (c.scope='global' or c.organization_id=p_organization_id)) then
      raise exception using errcode='42501',message='POSITION_REQUIREMENT_SCOPE_INVALID'; end if;
  end loop;
  select * into v_saved from public.save_vacancy_definition(p_organization_id,v_id,p_draft->>'title',
    p_draft->>'area',p_draft->>'location',p_draft->>'workArrangement',p_draft->>'employmentType',
    (p_draft->>'occupancy')::public.position_status,nullif(p_draft->>'occupantPersonId','')::uuid,p_draft->>'mission',
    p_draft->'responsibilities',p_draft->'expectedOutcomes',p_draft->'requirements',p_draft->'contextItems',
    p_draft->>'sourceKind',nullif(p_draft->>'sourceVacancyId','')::uuid,nullif(p_draft->>'jobRoleId','')::uuid,
    v_concept,coalesce((p_draft->>'saveAsRole')::boolean,false),coalesce(p_draft->>'changeKind','material'));
  v_snapshot:=v_snapshot||jsonb_build_object('positionVersionId',v_saved.vacancy_version_id,'positionVersion',v_saved.version,
    'recordedAt',now(),'decisionRecordedAt',now(),'savedBy',v_actor,'previousVersionId',p_expected_version_id);
  if v_decision<>'automatic' and v_previous->>'decision'=v_decision
    and v_previous->>'originalTitle'=p_draft->>'title'
    and (v_previous#>>'{concept,id}') is not distinct from v_concept::text then
    v_snapshot:=v_snapshot||jsonb_build_object('actorId',v_previous->'actorId',
      'decisionRecordedAt',coalesce(v_previous->'decisionRecordedAt',v_previous->'recordedAt'));
  end if;
  -- Preserve the exact observed business title (the legacy saver trims it).
  update public.vacancy_versions set title=p_draft->>'title',taxonomy_snapshot=v_snapshot,contract_version='vacancy-definition-1.3.0'
    where id=v_saved.vacancy_version_id and organization_id=p_organization_id;
  update public.vacancies set title=p_draft->>'title' where id=v_saved.vacancy_id and organization_id=p_organization_id;
  update public.positions set title=p_draft->>'title' where organization_id=p_organization_id
    and id=(select position_id from public.vacancies where id=v_saved.vacancy_id);
  if jsonb_typeof(p_draft->'structureSource')='object' then
    perform public.record_vacancy_structure_source(p_organization_id,v_saved.vacancy_version_id,p_draft->'structureSource');
  end if;
  -- The compatibility RPC writes its historical version. This atomic owner is newer.
  update public.vacancy_versions set contract_version='vacancy-definition-1.3.0'
    where id=v_saved.vacancy_version_id and organization_id=p_organization_id;
  for v_req in select value from jsonb_array_elements(coalesce(p_draft->'requirements','[]'::jsonb)) loop
    select value into v_origin from jsonb_array_elements((v_snapshot->'items')||(v_snapshot->'complements'))
      where value->>'conceptId'=v_req->>'conceptId';
    -- A previously selected requirement keeps its original source snapshot after a correction.
    if v_origin is null and p_expected_version_id is not null then
      select r.taxonomy_origin into v_origin from public.vacancy_requirements r where r.organization_id=p_organization_id
        and r.vacancy_version_id=p_expected_version_id and r.stable_id=(v_req->>'stableId')::uuid
        and r.concept_id=nullif(v_req->>'conceptId','')::uuid;
    end if;
    update public.vacancy_requirements r set taxonomy_origin=v_origin
      where r.organization_id=p_organization_id and r.vacancy_version_id=v_saved.vacancy_version_id
        and r.stable_id=(v_req->>'stableId')::uuid;
  end loop;
  insert into public.occupation_resolution_attempts(organization_id,vacancy_id,raw_term,normalized_term,resolver_version,
    idempotency_key,status,decision_origin,canonical_occupation_concept_id,evidence,candidate_snapshot,actor_auth_user_id)
  values(p_organization_id,v_saved.vacancy_id,p_draft->>'title',v_snapshot->>'normalizedTerm','position-taxonomy-1.0.0',
    v_saved.vacancy_version_id::text,case when v_concept is not null then 'resolved' when v_snapshot->>'state'='ambiguous' then 'ambiguous' else 'completed' end,
    case when v_decision='human' then 'human_reconciliation' when v_concept is not null then 'deterministic_official_resolution' else 'no_safe_decision' end,
    v_concept,v_snapshot,v_snapshot->'candidates',v_actor) returning id into v_attempt;
  -- Unknown terms and changed human interpretation are feedback, never new aliases/Global publication.
  if v_concept is null or (v_id is not null and v_current.reference_concept_id is distinct from v_concept and v_decision<>'automatic') then
    insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status,
      candidate_concept_ids,evidence_reference_ids,observation_ids,created_by_auth_user_id)
    values('organization',p_organization_id,encode(extensions.digest(concat_ws('|','position-taxonomy',p_organization_id::text,
      v_snapshot->>'normalizedTerm',coalesce(v_concept::text,'')),'sha256'),'hex'),p_draft->>'title',v_snapshot->>'normalizedTerm',
      'pt-BR',case when v_snapshot->>'state'='ambiguous' then 'ambiguous'::public.knowledge_inbox_status else 'unresolved'::public.knowledge_inbox_status end,
      case when v_concept is null then '{}'::uuid[] else array[v_concept] end,'{}','{}',v_actor)
    on conflict(scope,organization_id,fingerprint) do update set last_seen_at=now(),occurrence_count=public.knowledge_inbox.occurrence_count+1;
  end if;
  return query select v_saved.vacancy_id,v_saved.vacancy_version_id,v_saved.version,v_saved.created;
end;
$$;
revoke all on function public.save_position_taxonomy(uuid,jsonb,uuid) from public, anon;
grant execute on function public.save_position_taxonomy(uuid,jsonb,uuid) to authenticated;

comment on column public.vacancy_versions.taxonomy_snapshot is 'M7.1 server-computed source snapshot and decision. NULL means historical/unrecorded, not absence of knowledge.';
comment on column public.vacancy_requirements.taxonomy_origin is 'Original taxonomy provenance of an explicitly selected requirement; no automatic importance.';
