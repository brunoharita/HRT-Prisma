-- Reuse M7.1 and the original occupational queue. No new persisted entity.
create or replace function private.m71_concept_allowed(p_organization_id uuid,p_concept_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.knowledge_concepts c where c.id=p_concept_id and c.status='approved' and c.concept_type='occupation'
 and ((c.scope='organization' and c.organization_id=p_organization_id) or (c.scope='global' and exists(
  with recursive linked(id) as (
   select p_concept_id union
   select case when r.canonical_occupation_concept_id=l.id then r.source_occupation_concept_id else r.canonical_occupation_concept_id end
   from linked l join public.knowledge_occupation_reconciliations r
    on l.id in(r.canonical_occupation_concept_id,r.source_occupation_concept_id) and r.status='approved'
  ) select 1 from linked l join public.knowledge_concepts source_concept on source_concept.id=l.id
   join public.knowledge_external_mappings m on m.concept_id=source_concept.id
   join public.knowledge_sources s on s.id=m.source_id
   join public.knowledge_source_versions v on v.id=m.source_version_id and v.source_id=s.id
   where source_concept.status='approved' and source_concept.concept_type='occupation'
    and (source_concept.scope='global' or source_concept.organization_id=p_organization_id)
    and s.name in('CBO','ESCO','O*NET') and s.status='approved' and v.import_status='published' and v.is_current
 ))));
$$;
revoke all on function private.m71_concept_allowed(uuid,uuid) from public,anon,authenticated;

create or replace function public.search_position_taxonomy(p_organization_id uuid,p_query text,p_kind text default 'occupation',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; normalized text:=private.normalize_knowledge_term(coalesce(p_query,''));
begin
 perform private.m71_require_editor(p_organization_id);
 if p_kind is null or p_kind not in('occupation','complement') or p_offset is null or p_offset<0
  or char_length(coalesce(p_query,''))>240 then raise exception 'POSITION_SEARCH_INVALID' using errcode='22023'; end if;
 if char_length(normalized)<2 then return jsonb_build_object('items','[]'::jsonb,'total',0); end if;
 with terms as materialized (
  select distinct t.concept_id from public.knowledge_terms t
  where t.status='approved' and (t.scope='global' or t.organization_id=p_organization_id) and position(normalized in t.normalized_term)>0
 ), candidates as materialized (
  select c.id,c.canonical_label,c.concept_type,c.scope,c.description from terms t join public.knowledge_concepts c on c.id=t.concept_id
  where c.status='approved' and ((p_kind='occupation' and private.m71_concept_allowed(p_organization_id,c.id))
   or (p_kind='complement' and c.scope='organization' and c.organization_id=p_organization_id and c.concept_type<>'occupation'))
 ), page as(select * from candidates order by canonical_label,id limit 25 offset p_offset)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',canonical_label,'conceptType',concept_type,'scope',scope,'description',description) order by canonical_label,id) from page),'[]'::jsonb),'total',(select count(*) from candidates)) into result;
 return result;
end $$;
revoke all on function public.search_position_taxonomy(uuid,text,text,integer) from public,anon;
grant execute on function public.search_position_taxonomy(uuid,text,text,integer) to authenticated;

create function private.position_rag_context(p_mission text,p_responsibilities jsonb) returns text
language sql immutable set search_path='' as $$
 select concat_ws(E'\n',p_mission,(select string_agg(case when jsonb_typeof(value)='string' then value#>>'{}' else coalesce(value->>'text',value->>'description','') end,E'\n') from jsonb_array_elements(coalesce(p_responsibilities,'[]'::jsonb))))
$$;
revoke all on function private.position_rag_context(text,jsonb) from public,anon,authenticated;

create function public.request_position_occupational_rag(p_organization_id uuid,p_title text,p_mission text,p_responsibilities jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=private.require_knowledge_admin(p_organization_id);
 if p_organization_id is null or char_length(btrim(coalesce(p_title,''))) not between 1 and 240
  or char_length(coalesce(p_mission,''))>16000 or jsonb_typeof(p_responsibilities) is distinct from 'array'
  or jsonb_array_length(p_responsibilities)>100 then raise exception 'RAG_INPUT_INVALID' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_responsibilities) x where jsonb_typeof(x)<>'string' or char_length(x#>>'{}')>4000)
  then raise exception 'RAG_INPUT_INVALID' using errcode='22023'; end if;
 return private.enqueue_occupational_rag(p_organization_id,p_title,private.position_rag_context(p_mission,p_responsibilities),jsonb_build_object('kind','manual'),actor);
end $$;
revoke all on function public.request_position_occupational_rag(uuid,text,text,jsonb) from public,anon;
grant execute on function public.request_position_occupational_rag(uuid,text,text,jsonb) to authenticated;

create or replace function private.occupation_rag_vacancy_saved() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.enqueue_occupational_rag(new.organization_id,new.title,private.position_rag_context(new.mission,new.responsibilities),
  jsonb_build_object('kind','vacancy','version_id',new.id,'vacancy_id',new.vacancy_id),new.created_by_auth_user_id);
 return new;
exception when others then return new;
end $$;
revoke all on function private.occupation_rag_vacancy_saved() from public,anon,authenticated;

create function public.load_position_occupational_rag(p_organization_id uuid,p_inbox_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare review jsonb; proposal public.knowledge_proposals; candidates jsonb;
begin
 if p_organization_id is null then raise exception 'RAG_ORGANIZATION_REQUIRED' using errcode='42501'; end if;
 perform private.require_knowledge_admin(p_organization_id);
 if not exists(select 1 from public.knowledge_inbox i where i.id=p_inbox_id and i.organization_id=p_organization_id
  and i.occupation_context->>'contract'='occupational-rag-1.0.0') then raise exception 'RAG_CONTEXT_UNAVAILABLE' using errcode='42501'; end if;
 select * into proposal from public.knowledge_proposals p where p.inbox_id=p_inbox_id and p.scope='organization'
  and p.organization_id=p_organization_id and p.prompt_version='occupational-rag-1.0.0' order by p.created_at desc limit 1;
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
