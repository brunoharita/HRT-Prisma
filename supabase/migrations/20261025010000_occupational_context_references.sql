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
 -- Retrieval snapshots remain immutable in review.proposal.original. Only the supported
 -- contextual target is a suggestion; a human-approved publication always prevails.
 with ids as(select (value->>'id')::uuid id from jsonb_array_elements(coalesce(proposal.original_proposal->'candidate_concepts','[]'::jsonb))
  where proposal.status='awaiting_human_review'
   and proposal.original_proposal#>>'{rag,decision}'='alias'
   and value->>'id'=proposal.original_proposal#>>'{rag,target_id}'
   and nullif(btrim(proposal.original_proposal->>'rationale'),'') is not null
   and jsonb_array_length(coalesce(proposal.original_proposal#>'{rag,evidence}','[]'::jsonb))>0
  union select proposal.published_concept_id where proposal.status='approved'), selected as materialized (
  select c.* from public.knowledge_concepts c join ids on ids.id=c.id
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',c.description,'scope',c.scope,'version',c.version,
  'sources',coalesce((select jsonb_agg(distinct jsonb_build_object('name',l.reference->>'source','version',l.reference->>'sourceVersion')) from private.m71_official_links(p_organization_id,c.id) l),'[]'::jsonb)) order by c.canonical_label),'[]'::jsonb) into candidates
 from selected c where private.m71_concept_allowed(p_organization_id,c.id);
 return jsonb_build_object('review',review,'candidates',candidates);
end $$;
revoke all on function public.load_position_occupational_rag(uuid,uuid) from public,anon;
grant execute on function public.load_position_occupational_rag(uuid,uuid) to authenticated;
