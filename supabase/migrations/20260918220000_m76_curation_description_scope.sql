-- M7.6: optional concept descriptions, no Profile-curation justification, and explicit Global authority.

create or replace function private.m76_resolve_knowledge_inbox_alias(
  p_inbox_id uuid,
  p_concept_id uuid,
  p_scope public.knowledge_scope
) returns table (inbox_id uuid, concept_id uuid, knowledge_version bigint, observations_updated bigint)
language plpgsql security definer set search_path = '' as $$
declare
  inbox public.knowledge_inbox;
  target public.knowledge_concepts;
  actor_id uuid;
  next_version bigint;
  new_change_set uuid;
  affected bigint;
  source_version uuid;
begin
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  select * into target from public.knowledge_concepts item where item.id = p_concept_id and item.status = 'approved';
  if not found then raise exception using errcode = 'P0002', message = 'approved Knowledge concept not found'; end if;
  if p_scope = 'organization' and inbox.organization_id is null then
    raise exception using errcode = '22023', message = 'organization alias requires organization inbox';
  end if;
  if p_scope = 'organization' and target.scope = 'organization' and target.organization_id <> inbox.organization_id then
    raise exception using errcode = '42501', message = 'cross-organization Knowledge alias denied';
  end if;
  if p_scope = 'global' and target.scope <> 'global' then
    raise exception using errcode = '22023', message = 'global alias requires global concept';
  end if;
  if exists (
    select 1 from public.knowledge_terms term
    where term.scope = p_scope
      and term.organization_id is not distinct from case when p_scope = 'organization' then inbox.organization_id end
      and term.normalized_term = inbox.normalized_search_term
      and term.status = 'approved'
      and term.concept_id <> p_concept_id
  ) then
    raise exception using errcode = '23505', message = 'alias conflicts with another approved concept';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_scope::text, coalesce(inbox.organization_id::text, 'global')), 0));
  select coalesce(max(version), 0) + 1 into next_version
  from public.knowledge_change_sets
  where scope = p_scope and organization_id is not distinct from case when p_scope = 'organization' then inbox.organization_id end;
  select mapping.source_version_id into source_version
  from public.knowledge_external_mappings mapping
  join public.knowledge_source_versions version on version.id = mapping.source_version_id and version.is_current
  where mapping.concept_id = p_concept_id
  order by version.published_at desc nulls last limit 1;

  insert into public.knowledge_change_sets (
    scope, organization_id, version, summary, source_versions, changed_entities, approved_by_auth_user_id
  ) values (
    p_scope, case when p_scope = 'organization' then inbox.organization_id end, next_version,
    concat('Alias aprovado para termo observado: ', inbox.original_term),
    case when source_version is null then '[]'::jsonb else jsonb_build_array(source_version) end,
    jsonb_build_array(jsonb_build_object(
      'operation', 'approve_alias', 'term', inbox.original_term, 'normalized_term', inbox.normalized_search_term,
      'concept_id', p_concept_id, 'scope', p_scope, 'source_version_id', source_version, 'observation_ids', to_jsonb(inbox.observation_ids)
    )), actor_id
  ) returning id into new_change_set;
  insert into public.knowledge_terms (
    concept_id, scope, organization_id, term, normalized_term, language, term_type, status, version, approved_by_auth_user_id
  ) values (
    p_concept_id, p_scope, case when p_scope = 'organization' then inbox.organization_id end,
    inbox.original_term, inbox.normalized_search_term, inbox.language, 'alias', 'approved', next_version, actor_id
  ) on conflict do nothing;
  update public.knowledge_observations observation
  set resolution_state = 'resolved', concept_id = p_concept_id, candidate_concept_ids = '{}',
    normalization_method = case when p_scope = 'organization' then 'human_organization_alias' else 'human_global_alias' end,
    resolution_method_version = 'knowledge-normalization-2.0.0',
    knowledge_global_version = case when p_scope = 'global' then next_version else observation.knowledge_global_version end,
    knowledge_organization_version = case when p_scope = 'organization' then next_version else observation.knowledge_organization_version end,
    resolution_source_version_id = source_version, resolved_at = now(), resolved_by_auth_user_id = actor_id
  where observation.id = any(inbox.observation_ids) and (p_scope = 'global' or observation.organization_id = inbox.organization_id);
  get diagnostics affected = row_count;
  update public.knowledge_inbox item set status = 'approved', last_seen_at = now(), candidate_concept_ids = array[p_concept_id] where item.id = inbox.id;
  insert into public.knowledge_reinterpretation_impacts (organization_id, person_id, profile_id, change_set_id, concept_id, policy)
  select observation.organization_id, observation.person_id, observation.profile_id, new_change_set, p_concept_id,
    coalesce(settings.reinterpretation_policy, 'off'::public.knowledge_reinterpretation_policy)
  from public.knowledge_observations observation
  left join public.organization_knowledge_settings settings on settings.organization_id = observation.organization_id
  where observation.id = any(inbox.observation_ids) and observation.profile_id is not null on conflict do nothing;
  return query select inbox.id, p_concept_id, next_version, affected;
end;
$$;
revoke all on function private.m76_resolve_knowledge_inbox_alias(uuid, uuid, public.knowledge_scope) from public, anon, authenticated;

create or replace function private.m76_propose_knowledge_concept_from_inbox(
  p_inbox_id uuid,
  p_scope public.knowledge_scope,
  p_canonical_label text,
  p_concept_type public.knowledge_concept_type,
  p_description text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inbox public.knowledge_inbox; actor_id uuid; proposal_id uuid;
begin
  if nullif(btrim(p_canonical_label), '') is null then raise exception using errcode = '22023', message = 'canonical label is required'; end if;
  if length(coalesce(p_description, '')) > 2000 then raise exception using errcode = '22023', message = 'concept description is too long'; end if;
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  if p_scope = 'organization' and inbox.organization_id is null then raise exception using errcode = '22023', message = 'organization proposal requires organization inbox'; end if;
  insert into public.knowledge_proposals (
    inbox_id, scope, organization_id, proposal_type, original_proposal, status,
    prompt_version, output_schema_version, source_policy_version
  ) values (
    inbox.id, p_scope, case when p_scope = 'organization' then inbox.organization_id end, 'create',
    jsonb_build_object(
      'observed_term', inbox.original_term,
      'proposed_concept', jsonb_build_object('canonical_label', btrim(p_canonical_label), 'concept_type', p_concept_type, 'description', btrim(coalesce(p_description, ''))),
      'aliases', jsonb_build_array(inbox.original_term), 'sources', '[]'::jsonb, 'unresolved_questions', '[]'::jsonb, 'created_by_auth_user_id', actor_id
    ), 'awaiting_human_review', 'human-proposal-2.0.0', 'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0'
  ) returning id into proposal_id;
  update public.knowledge_inbox set status = 'awaiting_human_review' where id = inbox.id;
  return proposal_id;
end;
$$;
revoke all on function private.m76_propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text) from public, anon, authenticated;

create or replace function private.m76_curate_profile_competency(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_proposal_label text, p_proposal_description text,
  p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile public.professional_profiles; v_base jsonb; v_item jsonb; v_inbox public.knowledge_inbox; v_proposal uuid; v_result record;
begin
  perform private.require_knowledge_admin(p_organization_id);
  if p_organization_id is null or p_scope is null or p_action is null or p_action not in ('alias', 'proposal') then raise exception 'CURATION_INPUT_INVALID' using errcode = '22023'; end if;
  if p_scope = 'global' then perform private.require_knowledge_admin(null); end if;
  if p_proposal_description is not null and length(p_proposal_description) > 2000 then raise exception 'CURATION_DESCRIPTION_INVALID' using errcode = '22023'; end if;
  select * into v_profile from public.professional_profiles where id = p_profile_id and organization_id = p_organization_id and person_id = p_person_id
    and review_status = 'approved' and superseded_at is null for update;
  if not found then raise exception 'CURATION_PROFILE_CHANGED' using errcode = '40001'; end if;
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id, p_person_id);
  if v_base#>>'{profile,id}' <> p_profile_id::text then raise exception 'CURATION_PROFILE_CHANGED' using errcode = '40001'; end if;
  select item into v_item from jsonb_array_elements(v_base#>'{normalization,items}') item
    where (item->>'originalIndex')::integer = p_original_index and item->>'sourceText' = p_source_text
      and item->>'normalizedTerm' = p_normalized_term and item->>'state' in ('unresolved', 'ambiguous', 'source_unavailable') limit 1;
  if v_item is null then raise exception 'CURATION_ITEM_CHANGED' using errcode = '40001'; end if;
  if p_action = 'alias' and not exists(select 1 from public.knowledge_concepts where id = p_concept_id and status = 'approved' and concept_type <> 'occupation'
    and (scope = 'global' or (scope = 'organization' and organization_id = p_organization_id)) and (p_scope <> 'global' or scope = 'global')) then
    raise exception 'CURATION_CONCEPT_DENIED' using errcode = '42501'; end if;
  if p_action = 'proposal' and (p_proposal_type is null or p_proposal_type = 'occupation' or coalesce(length(btrim(p_proposal_label)), 0) not between 1 and 240) then
    raise exception 'CURATION_PROPOSAL_INVALID' using errcode = '22023'; end if;
  insert into public.knowledge_inbox(scope, organization_id, fingerprint, original_term, normalized_search_term, language, status)
    values('organization', p_organization_id, encode(extensions.digest(concat_ws('|', 'organization', p_organization_id::text, 'pt-BR', private.normalize_knowledge_term(p_normalized_term)), 'sha256'), 'hex'),
      p_normalized_term, private.normalize_knowledge_term(p_normalized_term), 'pt-BR', 'unresolved') on conflict(scope, organization_id, fingerprint) do nothing;
  select * into v_inbox from public.knowledge_inbox where scope = 'organization' and organization_id = p_organization_id
    and fingerprint = encode(extensions.digest(concat_ws('|', 'organization', p_organization_id::text, 'pt-BR', private.normalize_knowledge_term(p_normalized_term)), 'sha256'), 'hex') for update;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_scope::text, case when p_scope = 'organization' then p_organization_id::text else 'global' end), 0));
  if p_action = 'alias' then
    if exists(select 1 from public.knowledge_observations where id = any(v_inbox.observation_ids) and resolved_by_auth_user_id is not null and concept_id is distinct from p_concept_id) then
      raise exception 'CURATION_HUMAN_DECISION_CONFLICT' using errcode = '23505'; end if;
    select * into v_result from private.m76_resolve_knowledge_inbox_alias(v_inbox.id, p_concept_id, p_scope);
  else
    select id into v_proposal from public.knowledge_proposals where inbox_id = v_inbox.id and scope = p_scope and status not in ('rejected', 'approved') order by created_at desc limit 1;
    if v_proposal is not null then raise exception 'CURATION_PROPOSAL_ALREADY_PENDING' using errcode = '23505'; end if;
    v_proposal := private.m76_propose_knowledge_concept_from_inbox(v_inbox.id, p_scope, p_proposal_label, p_proposal_type, p_proposal_description);
  end if;
  v_base := public.load_person_professional_evidence_map_v5(p_organization_id, p_person_id);
  if p_action = 'alias' and not exists(select 1 from jsonb_array_elements(v_base#>'{normalization,items}') item where
    (item->>'originalIndex')::integer = p_original_index and item->>'sourceText' = p_source_text and item->>'normalizedTerm' = p_normalized_term and item->>'state' in ('resolved', 'human_preserved')) then
    raise exception 'CURATION_NOT_RESOLVED' using errcode = '40001'; end if;
  return jsonb_build_object('outcome', p_action, 'projection', v_base, 'proposalId', v_proposal);
end;
$$;
revoke all on function private.m76_curate_profile_competency(uuid, uuid, uuid, integer, text, text, public.knowledge_scope, text, uuid, text, text, public.knowledge_concept_type) from public, anon, authenticated;

create function public.curate_profile_competency_v4(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_proposal_label text, p_proposal_description text,
  p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result := private.m76_curate_profile_competency(p_organization_id, p_person_id, p_profile_id, p_original_index, p_source_text, p_normalized_term,
    p_scope, p_action, p_concept_id, p_proposal_label, p_proposal_description, p_proposal_type);
  return jsonb_build_object('workflowVersion', 'profile-competency-curation-4.0.0', 'outcome', result->>'outcome', 'projection', result->'projection', 'proposalId', result->'proposalId');
end;
$$;
revoke all on function public.curate_profile_competency_v4(uuid, uuid, uuid, integer, text, text, public.knowledge_scope, text, uuid, text, text, public.knowledge_concept_type) from public, anon;
grant execute on function public.curate_profile_competency_v4(uuid, uuid, uuid, integer, text, text, public.knowledge_scope, text, uuid, text, text, public.knowledge_concept_type) to authenticated;

-- Existing client signatures remain callable for rollback compatibility, but ignore the retired justification input.
create or replace function public.curate_profile_competency_v3(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_reason text, p_proposal_label text, p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result := private.m76_curate_profile_competency(p_organization_id, p_person_id, p_profile_id, p_original_index, p_source_text, p_normalized_term,
    p_scope, p_action, p_concept_id, p_proposal_label, '', p_proposal_type);
  return jsonb_build_object('workflowVersion', 'profile-competency-curation-3.0.0', 'outcome', result->>'outcome', 'projection', result->'projection', 'proposalId', result->'proposalId');
end;
$$;

create or replace function public.curate_profile_competency_v2(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_reason text, p_proposal_label text, p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result := private.m76_curate_profile_competency(p_organization_id, p_person_id, p_profile_id, p_original_index, p_source_text, p_normalized_term,
    p_scope, p_action, p_concept_id, p_proposal_label, '', p_proposal_type);
  return jsonb_build_object('workflowVersion', 'profile-competency-curation-2.0.0', 'outcome', result->>'outcome', 'projection', public.load_person_professional_evidence_map_v4(p_organization_id, p_person_id), 'proposalId', result->'proposalId');
end;
$$;

create or replace function public.curate_profile_competency(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_reason text, p_proposal_label text, p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result := private.m76_curate_profile_competency(p_organization_id, p_person_id, p_profile_id, p_original_index, p_source_text, p_normalized_term,
    p_scope, p_action, p_concept_id, p_proposal_label, '', p_proposal_type);
  return jsonb_build_object('workflowVersion', 'profile-competency-curation-1.0.0', 'outcome', result->>'outcome', 'projection', public.load_person_professional_evidence_map_v3(p_organization_id, p_person_id), 'proposalId', result->'proposalId');
end;
$$;

-- Delete only historical rationale produced by Profile curation, identified through profile-linked observations.
update public.knowledge_change_sets change_set
set changed_entities = coalesce((select jsonb_agg(case when entity->>'operation' = 'approve_alias'
  and exists(select 1 from jsonb_array_elements_text(coalesce(entity->'observation_ids', '[]'::jsonb)) observation_id
    join public.knowledge_observations observation on observation.id = observation_id::uuid and observation.profile_id is not null)
  then entity - 'reason' else entity end) from jsonb_array_elements(change_set.changed_entities) entity), '[]'::jsonb)
where exists(select 1 from jsonb_array_elements(change_set.changed_entities) entity
  where entity->>'operation' = 'approve_alias' and exists(select 1 from jsonb_array_elements_text(coalesce(entity->'observation_ids', '[]'::jsonb)) observation_id
    join public.knowledge_observations observation on observation.id = observation_id::uuid and observation.profile_id is not null));

update public.knowledge_proposals proposal
set original_proposal = proposal.original_proposal - 'rationale'
where proposal.prompt_version = 'human-proposal-1.0.0'
  and exists(select 1 from public.knowledge_inbox inbox cross join lateral unnest(inbox.observation_ids) observation_id
    join public.knowledge_observations observation on observation.id = observation_id and observation.profile_id is not null where inbox.id = proposal.inbox_id);

comment on function public.curate_profile_competency_v4(uuid, uuid, uuid, integer, text, text, public.knowledge_scope, text, uuid, text, text, public.knowledge_concept_type)
  is 'M7.6 Profile curation: optional concept description, no justification capture, Global requires Super Admin.';
