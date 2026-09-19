-- M7.7: authenticated, atomic transition for a legacy organization proposal.
-- No legacy row is changed by applying this migration; the Super Admin must act explicitly.
-- The historical proposal repeats its canonical label in aliases. Keep the original
-- proposal intact and skip only redundant aliases when publishing a term.
create or replace function public.approve_knowledge_proposal(
  p_proposal_id uuid, p_human_edited_proposal jsonb default null, p_decision_reason text default null
) returns table (proposal_id uuid, concept_id uuid, knowledge_version bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare proposal public.knowledge_proposals; actor_id uuid; payload jsonb; new_concept_id uuid;
  next_version bigint; new_change_set uuid; canonical_label text; description_value text; concept_type_value public.knowledge_concept_type;
  alias_value text; inbox public.knowledge_inbox;
begin
  select * into proposal from public.knowledge_proposals item where item.id = p_proposal_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge proposal not found'; end if;
  actor_id := private.require_knowledge_admin(proposal.organization_id);
  if proposal.status = 'approved' then
    select change_set.version into next_version from public.knowledge_concepts concept
      join public.knowledge_change_sets change_set on change_set.id = concept.change_set_id
      where concept.id = proposal.published_concept_id;
    return query select proposal.id, proposal.published_concept_id, next_version, true; return;
  end if;
  if proposal.status <> 'awaiting_human_review' then raise exception using errcode = '55000', message = 'proposal is not approvable'; end if;
  payload := coalesce(p_human_edited_proposal, proposal.original_proposal);
  canonical_label := nullif(btrim(payload #>> '{proposed_concept,canonical_label}'), '');
  description_value := coalesce(payload #>> '{proposed_concept,description}', '');
  concept_type_value := (payload #>> '{proposed_concept,concept_type}')::public.knowledge_concept_type;
  if canonical_label is null then raise exception using errcode = '22023', message = 'canonical label is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', proposal.scope::text, coalesce(proposal.organization_id::text, 'global')), 0));
  select coalesce(max(version), 0) + 1 into next_version from public.knowledge_change_sets
    where scope = proposal.scope and organization_id is not distinct from proposal.organization_id;
  insert into public.knowledge_change_sets (scope, organization_id, version, summary, changed_entities, approved_by_auth_user_id)
    values (proposal.scope, proposal.organization_id, next_version, concat('Knowledge proposal ', proposal.id, ' approved'),
      jsonb_build_array(jsonb_build_object('proposal_id', proposal.id, 'operation', proposal.proposal_type)), actor_id)
    returning id into new_change_set;
  if proposal.proposal_type = 'update' then
    update public.knowledge_concepts set status = 'deprecated', updated_at = now()
      where id = proposal.target_concept_id and status = 'approved';
  end if;
  insert into public.knowledge_concepts (scope, organization_id, concept_type, canonical_label, description, language,
    status, version, change_set_id, provenance, created_by_auth_user_id, approved_by_auth_user_id)
  values (proposal.scope, proposal.organization_id, concept_type_value, canonical_label, description_value, 'pt-BR',
    'approved', 1, new_change_set, jsonb_build_object('proposal_id', proposal.id, 'research_run_id', proposal.research_run_id), actor_id, actor_id)
  returning id into new_concept_id;
  insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type,
    status, version, approved_by_auth_user_id)
  values (new_concept_id, proposal.scope, proposal.organization_id, canonical_label, private.normalize_knowledge_term(canonical_label),
    'pt-BR', 'canonical', 'approved', 1, actor_id);
  for alias_value in
    select distinct on (private.normalize_knowledge_term(alias_item.value)) alias_item.value
      from jsonb_array_elements_text(coalesce(payload -> 'aliases', '[]'::jsonb)) as alias_item(value)
      order by private.normalize_knowledge_term(alias_item.value), alias_item.value
  loop
    if nullif(btrim(alias_value), '') is not null
      and private.normalize_knowledge_term(alias_value) <> private.normalize_knowledge_term(canonical_label) then
      insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type,
        status, version, approved_by_auth_user_id)
      values (new_concept_id, proposal.scope, proposal.organization_id, alias_value, private.normalize_knowledge_term(alias_value),
        'pt-BR', 'alias', 'approved', 1, actor_id);
    end if;
  end loop;
  update public.knowledge_proposals set human_edited_proposal = p_human_edited_proposal, status = 'approved',
    decided_at = now(), decided_by_auth_user_id = actor_id, decision_reason = p_decision_reason,
    published_concept_id = new_concept_id where id = proposal.id;
  insert into public.knowledge_approvals (proposal_id, action, original_proposal, decided_proposal, actor_auth_user_id, reason)
    values (proposal.id, case when p_human_edited_proposal is null then 'approved' else 'edited_and_approved' end,
      proposal.original_proposal, payload, actor_id, p_decision_reason);
  update public.knowledge_inbox set status = 'approved' where id = proposal.inbox_id;
  select * into inbox from public.knowledge_inbox where id = proposal.inbox_id;
  insert into public.knowledge_reinterpretation_impacts (organization_id, person_id, profile_id, change_set_id, concept_id, policy)
  select observation.organization_id, observation.person_id, profile.id, new_change_set, new_concept_id,
    coalesce(settings.reinterpretation_policy, 'off'::public.knowledge_reinterpretation_policy)
  from public.knowledge_observations observation
  join public.professional_profiles profile on profile.organization_id = observation.organization_id
    and profile.person_id = observation.person_id and profile.superseded_at is null
  left join public.organization_knowledge_settings settings on settings.organization_id = observation.organization_id
  where observation.normalized_term = inbox.normalized_search_term
    and (proposal.scope = 'global' or observation.organization_id = proposal.organization_id)
  on conflict do nothing;
  return query select proposal.id, new_concept_id, next_version, false;
end;
$$;

create or replace function public.transition_legacy_knowledge_proposal(
  p_proposal_id uuid, p_organization_id uuid, p_reason text
) returns table (proposal_id uuid, concept_id uuid, global_proposal_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid;
  v_proposal public.knowledge_proposals;
  v_inbox public.knowledge_inbox;
  v_concept_id uuid;
  v_global_proposal_id uuid;
  v_label text;
begin
  v_actor_id := private.require_knowledge_admin(null);
  if p_organization_id is null then
    raise exception using errcode = '22023', message = 'active organization is required';
  end if;
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) < 5 then
    raise exception using errcode = '22023', message = 'human decision reason is required';
  end if;

  select * into v_proposal from public.knowledge_proposals item
    where item.id = p_proposal_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'legacy Knowledge proposal not found';
  end if;
  if v_proposal.scope <> 'organization' or v_proposal.organization_id is distinct from p_organization_id
    or v_proposal.proposal_type <> 'create' then
    raise exception using errcode = '42501', message = 'legacy proposal scope or organization mismatch';
  end if;

  if v_proposal.status = 'approved' then
    select item.id into v_global_proposal_id from public.knowledge_proposals item
      where item.scope = 'global' and item.origin_organization_id = p_organization_id
        and item.origin_concept_id = v_proposal.published_concept_id;
    if v_proposal.published_concept_id is null or v_global_proposal_id is null then
      raise exception using errcode = '55000', message = 'approved proposal lacks a linked Global contribution';
    end if;
    return query select v_proposal.id, v_proposal.published_concept_id, v_global_proposal_id, true;
    return;
  end if;
  if v_proposal.status <> 'awaiting_human_review' or v_proposal.human_edited_proposal is not null then
    raise exception using errcode = '55000', message = 'legacy proposal is not eligible for unchanged approval';
  end if;

  select * into v_inbox from public.knowledge_inbox item
    where item.id = v_proposal.inbox_id for update;
  if not found or v_inbox.scope <> 'organization'
    or v_inbox.organization_id is distinct from p_organization_id
    or v_inbox.status <> 'awaiting_human_review' then
    raise exception using errcode = '55000', message = 'legacy Inbox is not eligible for transition';
  end if;

  v_label := nullif(btrim(v_proposal.original_proposal #>> '{proposed_concept,canonical_label}'), '');
  if v_label is null then
    raise exception using errcode = '22023', message = 'legacy concept label is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'organization', p_organization_id::text), 0));
  if exists (
    select 1 from public.knowledge_terms term
      where term.scope = 'organization' and term.organization_id = p_organization_id
        and term.status = 'approved'
        and term.normalized_term = private.normalize_knowledge_term(v_label)
  ) then
    raise exception using errcode = '23505', message = 'approved organization term already exists';
  end if;

  select approved.concept_id into v_concept_id
    from public.approve_knowledge_proposal(p_proposal_id, null, p_reason) approved;
  if v_concept_id is null then
    raise exception using errcode = '55000', message = 'local Knowledge approval did not return a concept';
  end if;
  update public.knowledge_observations observation
    set resolution_state = 'resolved', concept_id = v_concept_id, candidate_concept_ids = '{}',
      normalization_method = 'human_organization_concept',
      resolution_method_version = 'knowledge-governance-3.0.0',
      resolved_at = now(), resolved_by_auth_user_id = v_actor_id
    where observation.id = any(v_inbox.observation_ids)
      and observation.organization_id = p_organization_id;
  update public.knowledge_inbox item
    set status = 'approved', candidate_concept_ids = array[v_concept_id], last_seen_at = now()
    where item.id = v_inbox.id and item.organization_id = p_organization_id;

  v_global_proposal_id := private.m77_enqueue_global_contribution(
    v_inbox, v_concept_id, v_proposal.original_proposal, v_actor_id
  );
  if v_global_proposal_id is null or not exists (
    select 1 from public.knowledge_proposals item
      where item.id = v_global_proposal_id and item.scope = 'global'
        and item.status = 'awaiting_human_review' and item.published_concept_id is null
        and item.origin_organization_id = p_organization_id
        and item.origin_concept_id = v_concept_id
  ) then
    raise exception using errcode = '55000', message = 'Global contribution was not queued';
  end if;
  return query select v_proposal.id, v_concept_id, v_global_proposal_id, false;
end;
$$;

revoke all on function public.transition_legacy_knowledge_proposal(uuid, uuid, text) from public, anon;
grant execute on function public.transition_legacy_knowledge_proposal(uuid, uuid, text) to authenticated;
