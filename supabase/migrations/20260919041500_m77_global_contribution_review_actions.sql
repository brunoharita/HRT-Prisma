-- M7.7: candidate evidence and non-publication decisions for company contributions.

create or replace function private.m77_enqueue_global_contribution(
  p_inbox public.knowledge_inbox, p_origin_concept_id uuid, p_payload jsonb, p_actor_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare proposal_id uuid; candidate_snapshot jsonb; normalized_label text;
begin
  normalized_label := private.normalize_knowledge_term(p_payload #>> '{proposed_concept,canonical_label}');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', candidate.id, 'canonical_label', candidate.canonical_label,
    'concept_type', candidate.concept_type, 'match', candidate.match_kind
  ) order by candidate.match_rank, candidate.canonical_label), '[]'::jsonb)
  into candidate_snapshot
  from (
    select distinct on (concept.id) concept.id, concept.canonical_label, concept.concept_type,
      case when term.normalized_term = normalized_label then 'exact' else 'prefix' end as match_kind,
      case when term.normalized_term = normalized_label then 1 else 2 end as match_rank
    from public.knowledge_terms term
    join public.knowledge_concepts concept on concept.id = term.concept_id
    where concept.scope = 'global' and concept.status = 'approved' and term.status = 'approved'
      and normalized_label <> ''
      and (term.normalized_term = normalized_label
        or (char_length(normalized_label) >= 5 and (term.normalized_term like normalized_label || '%' or normalized_label like term.normalized_term || '%')))
    order by concept.id, match_rank, concept.canonical_label
  ) candidate;

  insert into public.knowledge_proposals (
    inbox_id, scope, organization_id, origin_organization_id, origin_concept_id, proposal_type, original_proposal, status,
    prompt_version, output_schema_version, source_policy_version
  ) values (
    p_inbox.id, 'global', null, p_inbox.organization_id, p_origin_concept_id, 'create',
    jsonb_build_object(
      'observed_term', p_inbox.original_term,
      'proposed_concept', p_payload->'proposed_concept',
      'aliases', p_payload->'aliases', 'sources', '[]'::jsonb, 'unresolved_questions', '[]'::jsonb,
      'candidate_concepts', candidate_snapshot,
      'origin', jsonb_build_object('organization_id', p_inbox.organization_id, 'concept_id', p_origin_concept_id, 'created_by_auth_user_id', p_actor_id)
    ), 'awaiting_human_review', 'm77-company-contribution-1.0.0', 'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0'
  ) on conflict (origin_concept_id) where scope = 'global' and origin_concept_id is not null do update
    set original_proposal = jsonb_set(public.knowledge_proposals.original_proposal, '{candidate_concepts}', excluded.original_proposal->'candidate_concepts', true)
  returning id into proposal_id;
  return proposal_id;
end;
$$;
revoke all on function private.m77_enqueue_global_contribution(public.knowledge_inbox, uuid, jsonb, uuid) from public, anon, authenticated;

create or replace function public.decide_knowledge_global_contribution(
  p_proposal_id uuid, p_decision text, p_reason text
) returns table (proposal_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare proposal public.knowledge_proposals; actor_id uuid;
begin
  if p_decision not in ('rejected', 'deferred') then
    raise exception using errcode = '22023', message = 'global contribution decision must be rejected or deferred';
  end if;
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) < 5 then
    raise exception using errcode = '22023', message = 'decision reason must contain at least five characters';
  end if;
  actor_id := private.require_knowledge_admin(null);
  select * into proposal from public.knowledge_proposals item
    where item.id = p_proposal_id and item.scope = 'global' and item.origin_organization_id is not null
    for update;
  if not found then raise exception using errcode = 'P0002', message = 'global company contribution not found'; end if;
  if proposal.status <> 'awaiting_human_review' then
    raise exception using errcode = '55000', message = 'global contribution is not awaiting review';
  end if;
  update public.knowledge_proposals set status = p_decision, decided_at = now(),
    decided_by_auth_user_id = actor_id, decision_reason = btrim(p_reason)
    where id = proposal.id;
  insert into public.knowledge_approvals (proposal_id, action, original_proposal, decided_proposal, actor_auth_user_id, reason)
    values (proposal.id, p_decision, proposal.original_proposal,
      jsonb_build_object('decision', p_decision, 'local_origin_preserved', true), actor_id, btrim(p_reason));
  return query select proposal.id, p_decision;
end;
$$;
revoke all on function public.decide_knowledge_global_contribution(uuid, text, text) from public, anon;
grant execute on function public.decide_knowledge_global_contribution(uuid, text, text) to authenticated;
