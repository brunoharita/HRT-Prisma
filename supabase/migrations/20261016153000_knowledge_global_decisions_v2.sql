-- knowledge-global-decision-2.0.0: keep local or approve Global; reason is optional.
-- Historical rejected/deferred records and local concepts remain untouched.
create or replace function public.decide_knowledge_global_contribution(
  p_proposal_id uuid, p_decision text, p_reason text
) returns table (proposal_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare proposal public.knowledge_proposals; actor_id uuid; optional_reason text;
begin
  if p_decision is distinct from 'deferred' then
    raise exception using errcode = '22023', message = 'global contribution decision must be deferred (keep local)';
  end if;
  actor_id := private.require_knowledge_admin(null);
  optional_reason := nullif(btrim(p_reason), '');
  select * into proposal from public.knowledge_proposals item
    where item.id = p_proposal_id and item.scope = 'global' and item.origin_organization_id is not null
    for update;
  if not found then raise exception using errcode = 'P0002', message = 'global company contribution not found'; end if;
  if proposal.status <> 'awaiting_human_review' then
    raise exception using errcode = '55000', message = 'global contribution is not awaiting review';
  end if;
  update public.knowledge_proposals set status = p_decision, decided_at = now(),
    decided_by_auth_user_id = actor_id, decision_reason = optional_reason
    where id = proposal.id;
  insert into public.knowledge_approvals (proposal_id, action, original_proposal, decided_proposal, actor_auth_user_id, reason)
    values (proposal.id, p_decision, proposal.original_proposal,
      jsonb_build_object('decision', p_decision, 'local_origin_preserved', true), actor_id, optional_reason);
  return query select proposal.id, p_decision;
end;
$$;
revoke all on function public.decide_knowledge_global_contribution(uuid, text, text) from public, anon;
grant execute on function public.decide_knowledge_global_contribution(uuid, text, text) to authenticated;
