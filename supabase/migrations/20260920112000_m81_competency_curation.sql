-- M8.1: classify new Knowledge competencies in the same transaction as approval.
-- Keep the native Knowledge type only as source/rollback metadata.

create or replace function private.m76_propose_knowledge_concept_from_inbox(
  p_inbox_id uuid, p_scope public.knowledge_scope, p_canonical_label text,
  p_concept_type public.knowledge_concept_type, p_description text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare inbox public.knowledge_inbox; actor_id uuid; proposal_id uuid; local_concept_id uuid; payload jsonb;
  v_subgroup text;
begin
  if nullif(btrim(p_canonical_label), '') is null then raise exception using errcode = '22023', message = 'canonical label is required'; end if;
  if length(coalesce(p_description, '')) > 2000 then raise exception using errcode = '22023', message = 'concept description is too long'; end if;
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  if p_scope = 'organization' and inbox.organization_id is null then raise exception using errcode = '22023', message = 'organization proposal requires organization inbox'; end if;
  v_subgroup := nullif(pg_catalog.current_setting('prisma.m81_subgroup_id', true), '');
  payload := jsonb_build_object('observed_term', inbox.original_term,
    'proposed_concept', jsonb_build_object('canonical_label', btrim(p_canonical_label), 'concept_type', p_concept_type,
      'description', btrim(coalesce(p_description, ''))) ||
      case when v_subgroup is null then '{}'::jsonb else jsonb_build_object('subgroup_id', v_subgroup) end,
    'aliases', jsonb_build_array(inbox.original_term), 'sources', '[]'::jsonb, 'unresolved_questions', '[]'::jsonb, 'created_by_auth_user_id', actor_id);
  insert into public.knowledge_proposals (inbox_id, scope, organization_id, proposal_type, original_proposal, status, prompt_version, output_schema_version, source_policy_version)
  values (inbox.id, p_scope, case when p_scope = 'organization' then inbox.organization_id end, 'create', payload,
    'awaiting_human_review', case when v_subgroup is null then 'human-proposal-2.0.0' else 'profile-competency-curation-5.0.0' end,
    'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0') returning id into proposal_id;
  if p_scope = 'organization' then
    select concept_id into local_concept_id from public.approve_knowledge_proposal(proposal_id, null, 'Criação local autorizada; contribuição global pendente.');
    update public.knowledge_observations observation
    set resolution_state = 'resolved', concept_id = local_concept_id, candidate_concept_ids = '{}',
      normalization_method = 'human_organization_concept', resolution_method_version = 'knowledge-governance-3.0.0',
      resolved_at = now(), resolved_by_auth_user_id = actor_id
    where observation.id = any(inbox.observation_ids) and observation.organization_id = inbox.organization_id;
    update public.knowledge_inbox set status = 'approved', candidate_concept_ids = array[local_concept_id], last_seen_at = now()
      where id = inbox.id;
    perform private.m77_enqueue_global_contribution(inbox, local_concept_id, payload, actor_id);
  else
    update public.knowledge_inbox set status = 'awaiting_human_review' where id = inbox.id;
  end if;
  return proposal_id;
end $$;
revoke all on function private.m76_propose_knowledge_concept_from_inbox(uuid,public.knowledge_scope,text,public.knowledge_concept_type,text) from public, anon, authenticated;

create function public.curate_profile_competency_v5(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_original_index integer, p_source_text text, p_normalized_term text,
  p_scope public.knowledge_scope, p_action text, p_concept_id uuid, p_proposal_label text, p_proposal_description text,
  p_subgroup_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_subgroup public.competency_subgroups; v_result jsonb; v_proposal_id uuid;
begin
  if p_action = 'proposal' then
    select * into v_subgroup from public.competency_subgroups where id = p_subgroup_id and status = 'active';
    if v_subgroup.id is null or (p_scope = 'global' and v_subgroup.scope <> 'global')
      or (v_subgroup.scope = 'organization' and v_subgroup.organization_id is distinct from p_organization_id) then
      raise exception 'CURATION_SUBGROUP_SCOPE_INVALID' using errcode = '42501';
    end if;
  elsif p_subgroup_id is not null then
    raise exception 'CURATION_SUBGROUP_NOT_APPLICABLE' using errcode = '22023';
  end if;
  if p_action = 'proposal' then
    perform pg_catalog.set_config('prisma.m81_subgroup_id', p_subgroup_id::text, true);
  end if;
  v_result := private.m76_curate_profile_competency(p_organization_id, p_person_id, p_profile_id,
    p_original_index, p_source_text, p_normalized_term, p_scope, p_action, p_concept_id,
    p_proposal_label, p_proposal_description, 'knowledge');
  if p_action = 'proposal' then
    perform pg_catalog.set_config('prisma.m81_subgroup_id', '', true);
    v_proposal_id := (v_result->>'proposalId')::uuid;
    if v_proposal_id is null then raise exception 'CURATION_PROPOSAL_NOT_CREATED' using errcode = '55000'; end if;
    if not exists(select 1 from public.knowledge_proposals where id = v_proposal_id
      and original_proposal#>>'{proposed_concept,subgroup_id}' = p_subgroup_id::text) then
      raise exception 'CURATION_PROPOSAL_CHANGED' using errcode = '40001';
    end if;
  end if;
  return jsonb_build_object('workflowVersion', 'profile-competency-curation-5.0.0',
    'outcome', v_result->>'outcome', 'proposalId', v_result->'proposalId',
    'projection', public.load_person_professional_evidence_map_v6(p_organization_id, p_person_id));
end $$;
revoke all on function public.curate_profile_competency_v5(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,uuid) from public, anon;
grant execute on function public.curate_profile_competency_v5(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,uuid) to authenticated;

create function public.propose_knowledge_concept_from_inbox_v2(
  p_inbox_id uuid, p_scope public.knowledge_scope, p_canonical_label text,
  p_subgroup_id uuid, p_description text, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inbox public.knowledge_inbox; v_subgroup public.competency_subgroups; v_result uuid;
begin
  if p_subgroup_id is null then raise exception 'COMPETENCY_SUBGROUP_REQUIRED' using errcode = '22023'; end if;
  select * into v_inbox from public.knowledge_inbox where id = p_inbox_id;
  if not found then raise exception 'KNOWLEDGE_INBOX_NOT_FOUND' using errcode = 'P0002'; end if;
  perform private.require_knowledge_admin(case when p_scope = 'organization' then v_inbox.organization_id end);
  select * into v_subgroup from public.competency_subgroups where id = p_subgroup_id and status = 'active';
  if v_subgroup.id is null or (p_scope = 'global' and v_subgroup.scope <> 'global')
    or (v_subgroup.scope = 'organization' and v_subgroup.organization_id is distinct from v_inbox.organization_id) then
    raise exception 'COMPETENCY_SUBGROUP_SCOPE_INVALID' using errcode = '42501';
  end if;
  perform pg_catalog.set_config('prisma.m81_subgroup_id', p_subgroup_id::text, true);
  v_result := public.propose_knowledge_concept_from_inbox(p_inbox_id, p_scope, p_canonical_label, 'knowledge', p_description, p_reason);
  perform pg_catalog.set_config('prisma.m81_subgroup_id', '', true);
  return v_result;
end $$;
revoke all on function public.propose_knowledge_concept_from_inbox_v2(uuid,public.knowledge_scope,text,uuid,text,text) from public, anon;
grant execute on function public.propose_knowledge_concept_from_inbox_v2(uuid,public.knowledge_scope,text,uuid,text,text) to authenticated;

create function public.create_position_knowledge_complement_v2(
  p_organization_id uuid, p_label text, p_subgroup_id uuid, p_description text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_subgroup public.competency_subgroups; v_concept uuid; v_current uuid;
begin
  perform private.require_knowledge_admin(p_organization_id);
  select * into v_subgroup from public.competency_subgroups where id = p_subgroup_id and status = 'active';
  if v_subgroup.id is null or (v_subgroup.scope = 'organization'
    and v_subgroup.organization_id is distinct from p_organization_id) then
    raise exception 'POSITION_COMPLEMENT_SUBGROUP_INVALID' using errcode = '42501';
  end if;
  perform pg_catalog.set_config('prisma.m81_subgroup_id', p_subgroup_id::text, true);
  v_concept := public.create_position_knowledge_complement(p_organization_id, p_label, 'knowledge', p_description);
  perform pg_catalog.set_config('prisma.m81_subgroup_id', '', true);
  select subgroup_id into v_current from public.knowledge_competency_classifications
    where concept_id = v_concept and is_current;
  if v_current is not null and v_current <> p_subgroup_id then
    raise exception 'POSITION_COMPLEMENT_EXISTING_CLASSIFICATION_DIFFERS' using errcode = '23505';
  end if;
  if v_current is null then
    perform public.classify_knowledge_competency(v_concept, p_subgroup_id,
      'Classificação humana do complemento da Posição');
  end if;
  return v_concept;
end $$;
revoke all on function public.create_position_knowledge_complement_v2(uuid,text,uuid,text) from public, anon;
grant execute on function public.create_position_knowledge_complement_v2(uuid,text,uuid,text) to authenticated;

-- Rename the M7.7 body to preserve its exact publication and contribution semantics.
-- The replacement checks M8 classification and commits both writes atomically.
alter function public.approve_knowledge_proposal(uuid,jsonb,text) rename to approve_knowledge_proposal_m77;
revoke all on function public.approve_knowledge_proposal_m77(uuid,jsonb,text) from public, anon, authenticated;

create function public.approve_knowledge_proposal(
  p_proposal_id uuid, p_human_edited_proposal jsonb default null, p_decision_reason text default null
) returns table (proposal_id uuid, concept_id uuid, knowledge_version bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_proposal public.knowledge_proposals; v_payload jsonb; v_type public.knowledge_concept_type;
  v_subgroup uuid; v_scope public.competency_subgroups; v_result record;
begin
  select * into v_proposal from public.knowledge_proposals where id = p_proposal_id for update;
  if not found then raise exception 'KNOWLEDGE_PROPOSAL_NOT_FOUND' using errcode = 'P0002'; end if;
  perform private.require_knowledge_admin(v_proposal.organization_id);
  if v_proposal.status = 'approved' then
    return query select old.proposal_id, old.concept_id, old.knowledge_version, old.reused
      from public.approve_knowledge_proposal_m77(p_proposal_id, p_human_edited_proposal, p_decision_reason) old;
    return;
  end if;
  v_payload := coalesce(p_human_edited_proposal, v_proposal.original_proposal);
  v_type := (v_payload#>>'{proposed_concept,concept_type}')::public.knowledge_concept_type;
  if v_type <> 'occupation' then
    if v_type = 'certification' then
      raise exception 'CERTIFICATION_IS_CREDENTIAL_NOT_COMPETENCY' using errcode = '22023';
    end if;
    if nullif(v_payload#>>'{proposed_concept,subgroup_id}', '') is null
      and nullif(pg_catalog.current_setting('prisma.m81_subgroup_id', true), '') is not null then
      v_payload := jsonb_set(v_payload, '{proposed_concept,subgroup_id}',
        to_jsonb(pg_catalog.current_setting('prisma.m81_subgroup_id', true)), true);
    end if;
    v_subgroup := nullif(v_payload#>>'{proposed_concept,subgroup_id}', '')::uuid;
    select * into v_scope from public.competency_subgroups where id = v_subgroup and status = 'active';
    if v_scope.id is null or (v_proposal.scope = 'global' and v_scope.scope <> 'global')
      or (v_proposal.scope = 'organization' and v_scope.scope = 'organization'
        and v_scope.organization_id is distinct from v_proposal.organization_id) then
      raise exception 'COMPETENCY_SUBGROUP_REQUIRED_OR_SCOPE_INVALID' using errcode = '42501';
    end if;
  end if;
  select * into v_result from public.approve_knowledge_proposal_m77(p_proposal_id,
    case when v_payload is distinct from v_proposal.original_proposal then v_payload else p_human_edited_proposal end,
    p_decision_reason);
  if v_type <> 'occupation' then
    perform public.classify_knowledge_competency(v_result.concept_id, v_subgroup,
      coalesce(nullif(btrim(p_decision_reason), ''), 'Aprovação humana na Knowledge'));
  end if;
  return query select v_result.proposal_id, v_result.concept_id, v_result.knowledge_version, v_result.reused;
end $$;
revoke all on function public.approve_knowledge_proposal(uuid,jsonb,text) from public, anon;
grant execute on function public.approve_knowledge_proposal(uuid,jsonb,text) to authenticated;

create function public.approve_knowledge_proposal_v2(
  p_proposal_id uuid, p_subgroup_id uuid, p_decision_reason text
) returns table (proposal_id uuid, concept_id uuid, knowledge_version bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_proposal public.knowledge_proposals; v_payload jsonb; v_type public.knowledge_concept_type;
begin
  select * into v_proposal from public.knowledge_proposals where id = p_proposal_id for update;
  if not found then raise exception 'KNOWLEDGE_PROPOSAL_NOT_FOUND' using errcode = 'P0002'; end if;
  perform private.require_knowledge_admin(v_proposal.organization_id);
  v_payload := v_proposal.original_proposal;
  v_type := (v_payload#>>'{proposed_concept,concept_type}')::public.knowledge_concept_type;
  if v_type <> 'occupation' then
    if p_subgroup_id is null then raise exception 'COMPETENCY_SUBGROUP_REQUIRED' using errcode = '22023'; end if;
    v_payload := jsonb_set(v_payload, '{proposed_concept,subgroup_id}', to_jsonb(p_subgroup_id::text), true);
  elsif p_subgroup_id is not null then
    raise exception 'OCCUPATION_HAS_NO_COMPETENCY_SUBGROUP' using errcode = '22023';
  end if;
  return query select approved.proposal_id, approved.concept_id, approved.knowledge_version, approved.reused
    from public.approve_knowledge_proposal(p_proposal_id, v_payload, p_decision_reason) approved;
end $$;
revoke all on function public.approve_knowledge_proposal_v2(uuid,uuid,text) from public, anon;
grant execute on function public.approve_knowledge_proposal_v2(uuid,uuid,text) to authenticated;

create function public.transition_legacy_knowledge_proposal_v2(
  p_proposal_id uuid, p_organization_id uuid, p_subgroup_id uuid, p_reason text
) returns table (proposal_id uuid, concept_id uuid, global_proposal_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_subgroup public.competency_subgroups;
  v_type public.knowledge_concept_type;
begin
  perform private.require_knowledge_admin(p_organization_id);
  select (original_proposal#>>'{proposed_concept,concept_type}')::public.knowledge_concept_type into v_type
    from public.knowledge_proposals where id = p_proposal_id and organization_id = p_organization_id;
  if v_type is distinct from 'occupation' then
    select * into v_subgroup from public.competency_subgroups where id = p_subgroup_id and status = 'active';
    if v_subgroup.id is null or (v_subgroup.scope = 'organization'
      and v_subgroup.organization_id is distinct from p_organization_id) then
      raise exception 'COMPETENCY_SUBGROUP_SCOPE_INVALID' using errcode = '42501';
    end if;
    perform pg_catalog.set_config('prisma.m81_subgroup_id', p_subgroup_id::text, true);
  elsif p_subgroup_id is not null then
    raise exception 'OCCUPATION_HAS_NO_COMPETENCY_SUBGROUP' using errcode = '22023';
  end if;
  return query select legacy.proposal_id, legacy.concept_id, legacy.global_proposal_id, legacy.reused
    from public.transition_legacy_knowledge_proposal(p_proposal_id, p_organization_id, p_reason) legacy;
  if v_type is distinct from 'occupation' then perform pg_catalog.set_config('prisma.m81_subgroup_id', '', true); end if;
end $$;
revoke all on function public.transition_legacy_knowledge_proposal_v2(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.transition_legacy_knowledge_proposal_v2(uuid,uuid,uuid,text) to authenticated;
