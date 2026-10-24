-- Preserve the original query/scopes/results; aggregate aliases once and evaluate source eligibility after lexical matching.
create or replace function public.search_occupational_rag_candidates(p_secret text,p_job_id uuid,p_lease uuid,p_terms text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job public.knowledge_research_runs; query_value tsquery; result jsonb;
begin
 perform private.require_synthesis_worker(p_secret);
 select * into job from public.knowledge_research_runs where id=p_job_id and lease_id=p_lease and lease_until>now() and status='researching' and provider='local_ollama';
 if job.id is null or cardinality(p_terms) not between 1 and 9 or exists(select 1 from unnest(p_terms) t where char_length(t)>240) then raise exception 'RAG_LEASE_OR_QUERY_INVALID' using errcode='42501'; end if;
 query_value:=websearch_to_tsquery('simple',(select string_agg(private.normalize_knowledge_term(t),' OR ') from unnest(p_terms) t));
 with term_text as materialized (
  select t.concept_id,string_agg(t.term,' ') aliases_text from public.knowledge_terms t
  where t.status='approved' and (t.scope='global' or t.organization_id=job.organization_id) group by t.concept_id
 ), visible as materialized (
  select c.*,coalesce(t.aliases_text,'') aliases_text
  from public.knowledge_concepts c left join term_text t on t.concept_id=c.id
  where c.status='approved' and c.concept_type='occupation' and (c.scope='global' or c.organization_id=job.organization_id)
   and to_tsvector('simple',private.normalize_knowledge_term(c.canonical_label||' '||coalesce(t.aliases_text,'')||' '||c.description))@@query_value
 ), ranked as (
  select c.*,ts_rank(to_tsvector('simple',private.normalize_knowledge_term(c.canonical_label||' '||c.aliases_text||' '||c.description)),query_value) rank
  from visible c where (c.scope='organization' or not exists(select 1 from public.knowledge_external_mappings m where m.concept_id=c.id)
    or exists(select 1 from public.knowledge_external_mappings m join public.knowledge_source_versions v on v.id=m.source_version_id where m.concept_id=c.id and v.import_status='published' and v.is_current))
  order by case when c.scope='organization' then 0 else 1 end,rank desc,c.id limit 40
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.canonical_label,'description',left(c.description,900),'scope',c.scope,'version',c.version,
  'aliases',coalesce((select jsonb_agg(t.term) from public.knowledge_terms t where t.concept_id=c.id and t.status='approved' and (t.scope='global' or t.organization_id=job.organization_id)),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('name',s.name,'version',v.external_version,'externalId',m.external_id,'uri',m.external_uri))
   from public.knowledge_external_mappings m join public.knowledge_sources s on s.id=m.source_id join public.knowledge_source_versions v on v.id=m.source_version_id
   where m.concept_id=c.id and v.import_status='published' and v.is_current),'[]'::jsonb)) order by case when c.scope='organization' then 0 else 1 end,c.rank desc),'[]'::jsonb) into result from ranked c;
 return result;
end $$;
revoke all on function public.search_occupational_rag_candidates(text,uuid,uuid,text[]) from public;
grant execute on function public.search_occupational_rag_candidates(text,uuid,uuid,text[]) to anon,authenticated;
