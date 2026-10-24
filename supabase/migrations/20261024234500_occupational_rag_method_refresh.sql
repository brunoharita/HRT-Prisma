-- Reuse the original Inbox/run and retain prior machine output; never manufacture a human rejection.
create or replace function public.retry_occupational_rag(p_inbox_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare inbox public.knowledge_inbox; proposal public.knowledge_proposals;
begin
 select * into inbox from public.knowledge_inbox where id=p_inbox_id for update;
 if inbox.id is null or inbox.scope<>'organization' or inbox.occupation_context->>'contract' is distinct from 'occupational-rag-1.0.0' then raise exception 'RAG_INBOX_INVALID' using errcode='42501'; end if;
 perform private.require_knowledge_admin(inbox.organization_id);
 if inbox.status='research_queued' then return; end if;
 if exists(select 1 from public.knowledge_research_runs r where r.inbox_id=inbox.id and r.lease_until>now()) then raise exception 'RAG_PROCESSING_ACTIVE' using errcode='55000'; end if;
 if inbox.status='awaiting_human_review' then
  select * into proposal from public.knowledge_proposals p where p.inbox_id=inbox.id and p.scope='organization' and p.prompt_version='occupational-rag-1.0.0' and p.status<>'research_requested' order by p.created_at desc limit 1 for update;
  if proposal.id is null or proposal.status<>'awaiting_human_review' or proposal.human_edited_proposal is not null or proposal.decided_at is not null or proposal.decided_by_auth_user_id is not null or proposal.published_concept_id is not null then raise exception 'RAG_HUMAN_DECISION_PRESERVED' using errcode='55000'; end if;
  if proposal.original_proposal#>>'{rag,search_prompt_version}'='occupational-search-1.0.1' then raise exception 'RAG_RETRY_NOT_AVAILABLE' using errcode='55000'; end if;
  update public.knowledge_proposals set status='research_requested' where id=proposal.id;
  update public.knowledge_research_runs set status='queued',attempts=0,lease_id=null,lease_until=null,error_code=null,completed_at=null,
   attempt_history=attempt_history||jsonb_build_array(jsonb_build_object('at',now(),'result','research_requested','prior_proposal_id',proposal.id,'search_prompt_version','occupational-search-1.0.1'))
   where id=proposal.research_run_id and provider='local_ollama' and status='proposal_ready';
  if not found then raise exception 'RAG_RETRY_NOT_AVAILABLE' using errcode='55000'; end if;
 elsif inbox.status in('failed','researching') then
  update public.knowledge_research_runs set status='queued',attempts=0,lease_id=null,lease_until=null where inbox_id=inbox.id and provider='local_ollama' and status in('failed','researching');
 else raise exception 'RAG_RETRY_NOT_AVAILABLE' using errcode='55000'; end if;
 update public.knowledge_inbox set status='research_queued',cooldown_until=null where id=inbox.id;
end $$;
revoke all on function public.retry_occupational_rag(uuid) from public,anon;
grant execute on function public.retry_occupational_rag(uuid) to authenticated;

create or replace function public.load_occupational_rag_reviews(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_organization_id is null then raise exception 'RAG_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 perform private.require_knowledge_admin(p_organization_id);
 select coalesce(jsonb_agg(row_value order by seen desc),'[]'::jsonb) into result from(
  select i.last_seen_at seen,jsonb_build_object('id',i.id,'title',i.original_term,'context',i.occupation_context,
   'status',case when p.id is not null then p.status::text when run.status='failed' and i.status not in('approved','rejected','deferred') then 'failed' else i.status::text end,'errorCode',run.error_code,
   'proposal',case when p.id is not null then jsonb_build_object('id',p.id,'status',p.status,'original',p.original_proposal,'edited',p.human_edited_proposal,'model',p.model,'decidedAt',p.decided_at) end,
   'globalContribution',case when g.id is not null then jsonb_build_object('id',g.id,'status',g.status) end) row_value
  from public.knowledge_inbox i
  left join lateral(select r.status,r.error_code from public.knowledge_research_runs r where r.inbox_id=i.id and r.provider='local_ollama' order by r.created_at desc limit 1) run on true
  left join lateral(select q.* from public.knowledge_proposals q where q.inbox_id=i.id and q.scope='organization' and q.organization_id=i.organization_id and q.prompt_version='occupational-rag-1.0.0' and q.status<>'research_requested' order by q.created_at desc limit 1) p on true
  left join lateral(select q.id,q.status from public.knowledge_proposals q where q.inbox_id=i.id and q.scope='global' and q.origin_organization_id=i.organization_id order by q.created_at desc limit 1) g on true
  where i.organization_id=p_organization_id and i.occupation_context->>'contract'='occupational-rag-1.0.0'
  order by i.last_seen_at desc limit 50
 ) selected;
 return result;
end $$;
revoke all on function public.load_occupational_rag_reviews(uuid) from public,anon;
grant execute on function public.load_occupational_rag_reviews(uuid) to authenticated;


create or replace function public.load_position_occupational_rag(p_organization_id uuid,p_inbox_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare review jsonb; proposal public.knowledge_proposals; candidates jsonb;
begin
 if p_organization_id is null then raise exception 'RAG_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 perform private.require_knowledge_admin(p_organization_id);
 if not exists(select 1 from public.knowledge_inbox i where i.id=p_inbox_id and i.organization_id=p_organization_id
  and i.occupation_context->>'contract'='occupational-rag-1.0.0') then raise exception 'RAG_CONTEXT_UNAVAILABLE' using errcode='42501'; end if;
 select * into proposal from public.knowledge_proposals p where p.inbox_id=p_inbox_id and p.scope='organization'
  and p.organization_id=p_organization_id and p.prompt_version='occupational-rag-1.0.0' and p.status<>'research_requested' order by p.created_at desc limit 1;
 select jsonb_build_object('id',i.id,'title',i.original_term,'context',i.occupation_context,
  'status',case when proposal.id is not null then proposal.status::text when run.status='failed' and i.status not in('approved','rejected','deferred') then 'failed' else i.status::text end,'errorCode',run.error_code,
  'proposal',case when proposal.id is not null then jsonb_build_object('id',proposal.id,'status',proposal.status,'original',proposal.original_proposal,'edited',proposal.human_edited_proposal,'model',proposal.model,'decidedAt',proposal.decided_at) end,
  'globalContribution',case when g.id is not null then jsonb_build_object('id',g.id,'status',g.status) end) into review from public.knowledge_inbox i
  left join lateral(select r.status,r.error_code from public.knowledge_research_runs r where r.inbox_id=i.id and r.provider='local_ollama' order by r.created_at desc limit 1) run on true
  left join lateral(select q.id,q.status from public.knowledge_proposals q where q.inbox_id=i.id and q.scope='global' and q.origin_organization_id=i.organization_id order by q.created_at desc limit 1) g on true
  where i.id=p_inbox_id and i.organization_id=p_organization_id;
 with ids as(select (value->>'id')::uuid id from jsonb_array_elements(coalesce(proposal.original_proposal->'candidate_concepts','[]'::jsonb))
  union select proposal.published_concept_id where proposal.status='approved'), selected as materialized (
  select c.* from public.knowledge_concepts c join ids on ids.id=c.id
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',c.description,'scope',c.scope,'version',c.version,
  'sources',coalesce((select jsonb_agg(distinct jsonb_build_object('name',l.reference->>'source','version',l.reference->>'sourceVersion')) from private.m71_official_links(p_organization_id,c.id) l),'[]'::jsonb)) order by c.canonical_label),'[]'::jsonb) into candidates
 from selected c where private.m71_concept_allowed(p_organization_id,c.id);
 return jsonb_build_object('review',review,'candidates',candidates);
end $$;
revoke all on function public.load_position_occupational_rag(uuid,uuid) from public,anon;
grant execute on function public.load_position_occupational_rag(uuid,uuid) to authenticated;
