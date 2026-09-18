-- M7.4: contextual curation reuses Knowledge decisions; no profile mutation or model call.
-- V1/V2 remain intact for old clients. Same evidence shape; human method is explicitly versioned.
create function public.load_person_professional_evidence_map_v3(p_organization_id uuid,p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  v_base jsonb; v_item jsonb; v_items jsonb:='[]'; v_extra jsonb:='[]'; v_term public.knowledge_terms;
  v_concept public.knowledge_concepts; v_resolution jsonb; v_ordinal integer:=0; v_associations jsonb;
  v_profile public.professional_profiles; v_decision record; v_global bigint; v_org bigint;
begin
  -- Existing RPC is the read authorization boundary, including active user and tenant checks.
  v_base:=public.load_person_professional_evidence_map_v2(p_organization_id,p_person_id);
  select * into v_profile from public.professional_profiles where id=(v_base#>>'{profile,id}')::uuid and organization_id=p_organization_id;
  select coalesce(max(version) filter(where scope='global'),0),coalesce(max(version) filter(where scope='organization' and organization_id=p_organization_id),0)
    into v_global,v_org from public.knowledge_change_sets;
  for v_item in select value from jsonb_array_elements(v_base#>'{normalization,items}') loop
    v_ordinal:=v_ordinal+1;
    -- A reviewed raw-profile decision already represented by V1 always wins.
    if v_item->>'state'='human_preserved' then v_items:=v_items||jsonb_build_array(v_item);continue;end if;
    select term.* into v_term from public.knowledge_terms term
      join public.knowledge_concepts concept on concept.id=term.concept_id
      where term.normalized_term=private.normalize_knowledge_term(v_item->>'normalizedTerm')
        and term.status='approved' and term.term_type='alias' and term.approved_by_auth_user_id is not null and not term.ambiguous
        and (term.scope='global' or term.organization_id=p_organization_id)
        and concept.status='approved' and concept.concept_type<>'occupation'
        and (concept.scope='global' or concept.organization_id=p_organization_id)
      order by case when term.scope='organization' then 0 else 1 end,term.version desc,term.id limit 1;
    if v_term.id is null then v_items:=v_items||jsonb_build_array(v_item);continue;end if;
    v_resolution:=private.resolve_normalized_competency(p_organization_id,v_item->>'normalizedTerm',jsonb_build_array(v_item->>'normalizedTerm'));
    if v_resolution->>'state'<>'resolved' or (v_resolution->>'conceptId')::uuid<>v_term.concept_id then
      v_items:=v_items||jsonb_build_array(v_item);continue;
    end if;
    select * into v_concept from public.knowledge_concepts where id=v_term.concept_id;
    select changes.created_at,entity->>'reason' reason into v_decision
      from public.knowledge_change_sets changes cross join lateral jsonb_array_elements(changes.changed_entities) entity
      where changes.scope=v_term.scope and changes.organization_id is not distinct from v_term.organization_id
        and changes.version=v_term.version and entity->>'operation'='approve_alias'
        and entity->>'concept_id'=v_term.concept_id::text and entity->>'normalized_term'=v_term.normalized_term
      order by changes.created_at desc limit 1;
    v_items:=v_items||jsonb_build_array(v_item||v_resolution||jsonb_build_object('reason','Associação por alias aprovado em curadoria humana.'));
    -- Replace only the automatic evidence for this atom, never contextual/demonstrated evidence.
    select coalesce(jsonb_agg(a),'[]') into v_associations from jsonb_array_elements(v_base->'associations') a
      where not (a->>'id' like 'normalized:%' and split_part(a->>'id',':',3)=v_ordinal::text);
    v_base:=jsonb_set(v_base,'{associations}',v_associations);
    v_extra:=v_extra||jsonb_build_array(jsonb_build_object(
      'id','curated:'||v_profile.id::text||':'||v_ordinal,'nature','declared',
      'concept',jsonb_build_object('id',v_concept.id,'label',v_concept.canonical_label,'type',v_concept.concept_type,'scope',v_concept.scope,'version',v_concept.version),
      'observedTerm',v_item->>'originalTerm',
      'evidence',jsonb_build_object('id','curated:'||v_profile.id::text||':'||v_ordinal,'title',v_item->>'normalizedTerm',
        'fact','Competência declarada associada por decisão humana; sem atribuir proficiência.','quote',v_item->>'sourceText',
        'recordedAt',coalesce(v_decision.created_at,v_profile.approved_at,v_profile.created_at),
        'source',jsonb_build_object('kind','published_profile','label','Perfil publicado v'||v_profile.profile_version,
          'documentId',v_profile.source_document_id,'filename',null,'pageNumber',null,'fieldPath','competencies','reviewId',v_profile.review_id,'evidenceLinkId',null,'spatialRegionId',null)),
      'explanation',jsonb_build_object('method','Alias aprovado por curadoria humana na Knowledge; declaração original preservada.',
        'methodVersion','profile-competency-curation-1.0.0','taxonomyVersion','position-taxonomy-1.0.0',
        'knowledgeGlobalVersion',v_global,'knowledgeOrganizationVersion',v_org,'sourceName',v_resolution->>'sourceName','sourceVersion',v_resolution->>'sourceVersion',
        'humanDecision',concat('Alias ',case when v_term.scope='global' then 'Global' else 'da empresa' end,' aprovado. ',coalesce(v_decision.reason,'Decisão registrada na Knowledge.'))),
      'verification',null));
  end loop;
  v_base:=jsonb_set(v_base,'{normalization,items}',v_items);
  v_base:=jsonb_set(v_base,'{associations}',(v_base->'associations')||v_extra);
  -- Preserve unrelated legacy issues when no normalized items are available.
  if jsonb_array_length(v_items)>0 then
    v_base:=jsonb_set(v_base,'{issues}',coalesce((select jsonb_agg(jsonb_build_object('code',item->>'state','observedTerm',item->>'normalizedTerm','explanation',item->>'reason'))
      from jsonb_array_elements(v_items) item where item->>'state' not in ('resolved','human_preserved')),'[]'));
  end if;
  return v_base;
end $$;
revoke all on function public.load_person_professional_evidence_map_v3(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v3(uuid,uuid) to authenticated;

create function public.curate_profile_competency(
  p_organization_id uuid,p_person_id uuid,p_profile_id uuid,p_original_index integer,p_source_text text,p_normalized_term text,
  p_scope public.knowledge_scope,p_action text,p_concept_id uuid,p_reason text,p_proposal_label text,p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.professional_profiles; v_base jsonb; v_item jsonb; v_inbox public.knowledge_inbox; v_proposal uuid; v_result record;
begin
  -- Always require access to the originating organization, even when choosing Global.
  perform private.require_knowledge_admin(p_organization_id);
  if p_organization_id is null or p_scope is null or p_action is null or p_action not in ('alias','proposal') then raise exception 'CURATION_INPUT_INVALID' using errcode='22023';end if;
  if p_scope='global' then perform private.require_knowledge_admin(null);end if;
  if coalesce(length(btrim(p_reason)),0)<5 or length(p_reason)>2000 then raise exception 'CURATION_REASON_REQUIRED' using errcode='22023';end if;
  select * into v_profile from public.professional_profiles where id=p_profile_id and organization_id=p_organization_id and person_id=p_person_id
    and review_status='approved' and superseded_at is null for update;
  if not found then raise exception 'CURATION_PROFILE_CHANGED' using errcode='40001';end if;
  v_base:=public.load_person_professional_evidence_map_v3(p_organization_id,p_person_id);
  if v_base#>>'{profile,id}'<>p_profile_id::text then raise exception 'CURATION_PROFILE_CHANGED' using errcode='40001';end if;
  select item into v_item from jsonb_array_elements(v_base#>'{normalization,items}') item
    where (item->>'originalIndex')::integer=p_original_index and item->>'sourceText'=p_source_text
      and item->>'normalizedTerm'=p_normalized_term and item->>'state' in ('unresolved','ambiguous','source_unavailable') limit 1;
  if v_item is null then raise exception 'CURATION_ITEM_CHANGED' using errcode='40001';end if;
  if p_action='alias' and not exists(select 1 from public.knowledge_concepts where id=p_concept_id and status='approved' and concept_type<>'occupation'
    and (scope='global' or (scope='organization' and organization_id=p_organization_id)) and (p_scope<>'global' or scope='global')) then
    raise exception 'CURATION_CONCEPT_DENIED' using errcode='42501';end if;
  if p_action='proposal' and (p_proposal_type is null or p_proposal_type='occupation' or coalesce(length(btrim(p_proposal_label)),0) not between 1 and 240) then
    raise exception 'CURATION_PROPOSAL_INVALID' using errcode='22023';end if;
  insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,language,status)
    values('organization',p_organization_id,
      encode(extensions.digest(concat_ws('|','organization',p_organization_id::text,'pt-BR',private.normalize_knowledge_term(p_normalized_term)),'sha256'),'hex'),
      p_normalized_term,private.normalize_knowledge_term(p_normalized_term),'pt-BR','unresolved')
    on conflict(scope,organization_id,fingerprint) do nothing;
  select * into v_inbox from public.knowledge_inbox where scope='organization' and organization_id=p_organization_id
    and fingerprint=encode(extensions.digest(concat_ws('|','organization',p_organization_id::text,'pt-BR',private.normalize_knowledge_term(p_normalized_term)),'sha256'),'hex') for update;
  -- Same lock order as the existing Knowledge RPC: inbox, then scope decision lock.
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',p_scope::text,case when p_scope='organization' then p_organization_id::text else 'global' end),0));
  if p_action='alias' then
    if exists(select 1 from public.knowledge_observations where id=any(v_inbox.observation_ids)
      and resolved_by_auth_user_id is not null and concept_id is distinct from p_concept_id) then
      raise exception 'CURATION_HUMAN_DECISION_CONFLICT' using errcode='23505';end if;
    select * into v_result from public.resolve_knowledge_inbox_alias(v_inbox.id,p_concept_id,p_scope,p_reason);
  else
    -- Repeated submission after a lost response must not create duplicate pending proposals.
    select id into v_proposal from public.knowledge_proposals where inbox_id=v_inbox.id and scope=p_scope
      and status not in ('rejected','approved') order by created_at desc limit 1;
    if v_proposal is not null then raise exception 'CURATION_PROPOSAL_ALREADY_PENDING' using errcode='23505';end if;
    v_proposal:=public.propose_knowledge_concept_from_inbox(v_inbox.id,p_scope,p_proposal_label,p_proposal_type,'',p_reason);
  end if;
  v_base:=public.load_person_professional_evidence_map_v3(p_organization_id,p_person_id);
  -- Do not commit an alias that the refreshed projection cannot represent safely.
  if p_action='alias' and not exists(select 1 from jsonb_array_elements(v_base#>'{normalization,items}') item where
    (item->>'originalIndex')::integer=p_original_index and item->>'sourceText'=p_source_text and item->>'normalizedTerm'=p_normalized_term
    and item->>'state' in ('resolved','human_preserved')) then raise exception 'CURATION_NOT_RESOLVED' using errcode='40001';end if;
  return jsonb_build_object('workflowVersion','profile-competency-curation-1.0.0','outcome',p_action,'projection',v_base,'proposalId',v_proposal);
end $$;
revoke all on function public.curate_profile_competency(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) from public,anon;
grant execute on function public.curate_profile_competency(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) to authenticated;
