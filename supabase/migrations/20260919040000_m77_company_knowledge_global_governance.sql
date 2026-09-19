-- M7.7: company Knowledge is immediately usable; its sanitized contribution is reviewed centrally.

alter table public.knowledge_proposals
  add column origin_organization_id uuid references public.organizations(id) on delete restrict,
  add column origin_concept_id uuid references public.knowledge_concepts(id) on delete restrict;

create unique index knowledge_global_contribution_origin_idx on public.knowledge_proposals(origin_concept_id)
  where scope = 'global' and origin_concept_id is not null;

drop policy if exists knowledge_proposals_read on public.knowledge_proposals;
create policy knowledge_proposals_read on public.knowledge_proposals for select to authenticated
  using ((select private.is_super_admin((select auth.uid()))));
drop policy if exists knowledge_approvals_read on public.knowledge_approvals;
create policy knowledge_approvals_read on public.knowledge_approvals for select to authenticated
  using ((select private.is_super_admin((select auth.uid()))));

create or replace function private.m77_enqueue_global_contribution(
  p_inbox public.knowledge_inbox, p_origin_concept_id uuid, p_payload jsonb, p_actor_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare proposal_id uuid;
begin
  insert into public.knowledge_proposals (
    inbox_id, scope, organization_id, origin_organization_id, origin_concept_id, proposal_type, original_proposal, status,
    prompt_version, output_schema_version, source_policy_version
  ) values (
    p_inbox.id, 'global', null, p_inbox.organization_id, p_origin_concept_id, 'create',
    jsonb_build_object(
      'observed_term', p_inbox.original_term,
      'proposed_concept', p_payload->'proposed_concept',
      'aliases', p_payload->'aliases', 'sources', '[]'::jsonb, 'unresolved_questions', '[]'::jsonb,
      'origin', jsonb_build_object('organization_id', p_inbox.organization_id, 'concept_id', p_origin_concept_id, 'created_by_auth_user_id', p_actor_id)
    ), 'awaiting_human_review', 'm77-company-contribution-1.0.0', 'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0'
  ) on conflict (origin_concept_id) where scope = 'global' and origin_concept_id is not null do nothing
  returning id into proposal_id;
  return proposal_id;
end;
$$;
revoke all on function private.m77_enqueue_global_contribution(public.knowledge_inbox, uuid, jsonb, uuid) from public, anon, authenticated;

create or replace function private.m76_propose_knowledge_concept_from_inbox(
  p_inbox_id uuid, p_scope public.knowledge_scope, p_canonical_label text,
  p_concept_type public.knowledge_concept_type, p_description text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare inbox public.knowledge_inbox; actor_id uuid; proposal_id uuid; local_concept_id uuid; payload jsonb;
begin
  if nullif(btrim(p_canonical_label), '') is null then raise exception using errcode = '22023', message = 'canonical label is required'; end if;
  if length(coalesce(p_description, '')) > 2000 then raise exception using errcode = '22023', message = 'concept description is too long'; end if;
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  if p_scope = 'organization' and inbox.organization_id is null then raise exception using errcode = '22023', message = 'organization proposal requires organization inbox'; end if;
  payload := jsonb_build_object('observed_term', inbox.original_term,
    'proposed_concept', jsonb_build_object('canonical_label', btrim(p_canonical_label), 'concept_type', p_concept_type, 'description', btrim(coalesce(p_description, ''))),
    'aliases', jsonb_build_array(inbox.original_term), 'sources', '[]'::jsonb, 'unresolved_questions', '[]'::jsonb, 'created_by_auth_user_id', actor_id);
  insert into public.knowledge_proposals (inbox_id, scope, organization_id, proposal_type, original_proposal, status, prompt_version, output_schema_version, source_policy_version)
  values (inbox.id, p_scope, case when p_scope = 'organization' then inbox.organization_id end, 'create', payload,
    'awaiting_human_review', 'human-proposal-2.0.0', 'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0') returning id into proposal_id;
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
end;
$$;
revoke all on function private.m76_propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text) from public, anon, authenticated;

create or replace function public.propose_knowledge_concept_from_inbox(
  p_inbox_id uuid, p_scope public.knowledge_scope, p_canonical_label text, p_concept_type public.knowledge_concept_type,
  p_description text, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) < 5 then raise exception using errcode = '22023', message = 'proposal reason must contain at least five characters'; end if;
  return private.m76_propose_knowledge_concept_from_inbox(p_inbox_id, p_scope, p_canonical_label, p_concept_type, p_description);
end;
$$;
revoke all on function public.propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text, text) from public, anon;
grant execute on function public.propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text, text) to authenticated;
