-- M7.2 v2: one Professional Taxonomy infrastructure, with independently versioned
-- Occupational and Competency domains. Existing M7.1/M7.2/M7.3/M7.4 RPCs remain intact.

create table public.professional_taxonomy_releases (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('occupation','competency')),
  contract_version text not null check (contract_version ~ '^[a-z][a-z0-9-]+-[0-9]+\.[0-9]+\.[0-9]+$'),
  scope public.knowledge_scope not null default 'global',
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'published' check (status in ('draft','published','superseded')),
  source_versions jsonb not null default '[]'::jsonb check (jsonb_typeof(source_versions)='array'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  published_by_auth_user_id uuid references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique nulls not distinct(domain,scope,organization_id,contract_version),
  check ((scope='global' and organization_id is null) or (scope='organization' and organization_id is not null))
);
create unique index professional_taxonomy_current_release_idx
  on public.professional_taxonomy_releases(domain,scope,coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid))
  where status='published';
alter table public.professional_taxonomy_releases enable row level security;
create policy professional_taxonomy_releases_read on public.professional_taxonomy_releases
  for select to authenticated using (
    scope='global' or private.has_org_role(organization_id,array['super_admin','owner','admin','recruiter','member']::public.membership_role[])
  );
revoke all on public.professional_taxonomy_releases from public,anon;
grant select on public.professional_taxonomy_releases to authenticated;

insert into public.professional_taxonomy_releases(domain,contract_version,source_versions,provenance)
select 'occupation','position-taxonomy-1.0.0',coalesce(jsonb_agg(jsonb_build_object(
  'source',source.name,'version',version.external_version,'sourceVersionId',version.id
) order by source.name),'[]'::jsonb),jsonb_build_object(
  'method','m71_preserved','note','Registro aditivo; não altera o contrato ocupacional M7.1.'
)
from public.knowledge_sources source
join public.knowledge_source_versions version on version.source_id=source.id and version.is_current and version.import_status='published'
where source.name in ('CBO','ESCO','O*NET')
on conflict do nothing;

insert into public.professional_taxonomy_releases(domain,contract_version,source_versions,provenance)
select 'competency','competency-taxonomy-1.0.0',coalesce(jsonb_agg(jsonb_build_object(
  'source',source.name,'version',version.external_version,'sourceVersionId',version.id
) order by source.name),'[]'::jsonb),jsonb_build_object(
  'method','published_knowledge_projection',
  'conceptCount',(select count(*) from public.knowledge_concepts concept where concept.status='approved' and concept.concept_type<>'occupation'),
  'note','Taxonomia de Competências reutiliza conceitos, termos, mappings e relações publicados da Knowledge.'
)
from public.knowledge_sources source
join public.knowledge_source_versions version on version.source_id=source.id and version.is_current and version.import_status='published'
where source.name in ('ESCO','O*NET')
on conflict do nothing;

do $$ begin
  if not exists(select 1 from public.knowledge_concepts where status='approved' and concept_type<>'occupation') then
    raise exception 'COMPETENCY_TAXONOMY_EMPTY';
  end if;
end $$;

create function private.m72_competency_reader(p_organization_id uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=(select auth.uid());
begin
  if v_actor is null or p_organization_id is null or not exists(select 1 from public.organizations where id=p_organization_id)
    or not (private.is_super_admin(v_actor) or private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[])) then
    raise exception 'COMPETENCY_TAXONOMY_UNAUTHORIZED' using errcode='42501';
  end if;
  return v_actor;
end $$;
revoke all on function private.m72_competency_reader(uuid) from public,anon,authenticated;

create function public.search_competency_taxonomy(p_organization_id uuid,p_query text,p_limit integer default 8)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_query text; v_items jsonb; v_exact_count integer; v_state text;
begin
  perform private.m72_competency_reader(p_organization_id);
  v_query:=private.normalize_knowledge_term(p_query);
  if p_query is null or char_length(p_query)>240 or p_limit is null or p_limit not between 1 and 20 then
    raise exception 'COMPETENCY_SEARCH_INVALID' using errcode='22023';
  end if;
  if v_query='' then
    return jsonb_build_object('contractVersion','competency-taxonomy-search-1.0.0','taxonomyVersion','competency-taxonomy-1.0.0',
      'query',v_query,'state','no_equivalent','items','[]'::jsonb);
  end if;
  with visible as materialized (
    select term.id term_id,term.concept_id,term.term,term.normalized_term,term.term_type,term.scope term_scope,
      term.source_id,term.source_version_id,term.approved_by_auth_user_id,concept.canonical_label,concept.concept_type,
      concept.scope concept_scope,concept.organization_id,concept.description,
      case
        when term.normalized_term=v_query and term.normalized_term=private.normalize_knowledge_term(concept.canonical_label) then 1
        when term.normalized_term=v_query and term.source_id is not null then 2
        when term.normalized_term=v_query and term.approved_by_auth_user_id is not null then 3
        when term.normalized_term=v_query then 4
        when char_length(v_query)>=3 and not exists(
          select 1 from unnest(regexp_split_to_array(v_query,' +')) query_token
          where not exists(select 1 from unnest(regexp_split_to_array(term.normalized_term,' +')) term_token where term_token like query_token||'%')
        ) then 5 else 99 end rank
    from public.knowledge_terms term
    join public.knowledge_concepts concept on concept.id=term.concept_id
    left join public.knowledge_source_versions version on version.id=term.source_version_id
    where term.status='approved' and concept.status='approved' and concept.concept_type<>'occupation'
      and (term.scope='global' or term.organization_id=p_organization_id)
      and (concept.scope='global' or concept.organization_id=p_organization_id)
      and (term.source_version_id is null or (version.import_status='published' and version.is_current))
  ), ranked as materialized (
    select visible.*,row_number() over(partition by concept_id order by rank,case when term_scope='organization' then 0 else 1 end,term_id) concept_rank
    from visible where rank<99
  ), exact as (select count(distinct concept_id) count from ranked where rank<=4)
  select count into v_exact_count from exact;
  with visible as materialized (
    select term.id term_id,term.concept_id,term.term,term.normalized_term,term.term_type,term.scope term_scope,
      term.source_id,term.source_version_id,term.approved_by_auth_user_id,concept.canonical_label,concept.concept_type,
      concept.scope concept_scope,concept.organization_id,concept.description,
      case
        when term.normalized_term=v_query and term.normalized_term=private.normalize_knowledge_term(concept.canonical_label) then 1
        when term.normalized_term=v_query and term.source_id is not null then 2
        when term.normalized_term=v_query and term.approved_by_auth_user_id is not null then 3
        when term.normalized_term=v_query then 4
        when char_length(v_query)>=3 and not exists(
          select 1 from unnest(regexp_split_to_array(v_query,' +')) query_token
          where not exists(select 1 from unnest(regexp_split_to_array(term.normalized_term,' +')) term_token where term_token like query_token||'%')
        ) then 5 else 99 end rank
    from public.knowledge_terms term
    join public.knowledge_concepts concept on concept.id=term.concept_id
    left join public.knowledge_source_versions version on version.id=term.source_version_id
    where term.status='approved' and concept.status='approved' and concept.concept_type<>'occupation'
      and (term.scope='global' or term.organization_id=p_organization_id)
      and (concept.scope='global' or concept.organization_id=p_organization_id)
      and (term.source_version_id is null or (version.import_status='published' and version.is_current))
  ), ranked as materialized (
    select visible.*,row_number() over(partition by concept_id order by rank,case when term_scope='organization' then 0 else 1 end,term_id) concept_rank
    from visible where rank<99
  ), page as (
    select * from ranked where concept_rank=1 order by rank,canonical_label,concept_id limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'conceptId',page.concept_id,'canonicalLabel',page.canonical_label,'conceptType',page.concept_type,'scope',page.concept_scope,
    'description',page.description,'matchedTerm',page.term,
    'matchClass',case when page.rank<=4 and v_exact_count>1 then 'ambiguous' when page.rank=1 then 'exact'
      when page.rank=2 then 'official_alias' when page.rank in (3,4) then 'human_alias' else 'relevant_partial' end,
    'aliasAuthority',case when page.rank=1 then 'prisma_canonical' when page.source_id is not null then 'official_source'
      when page.approved_by_auth_user_id is not null then 'human_audited' else 'published_knowledge' end,
    'aliases',coalesce((select jsonb_agg(distinct alias.term order by alias.term) from public.knowledge_terms alias
      where alias.concept_id=page.concept_id and alias.status='approved'),'[]'::jsonb),
    'references',coalesce((select jsonb_agg(jsonb_build_object('source',source.name,'sourceVersion',version.external_version,
      'externalId',mapping.external_id,'externalUri',mapping.external_uri,'mappingType',mapping.mapping_type,
      'nativeType',stage.concept_type,'provenance',mapping.provenance) order by source.name,mapping.external_id)
      from public.knowledge_external_mappings mapping
      join public.knowledge_sources source on source.id=mapping.source_id
      join public.knowledge_source_versions version on version.id=mapping.source_version_id and version.is_current and version.import_status='published'
      left join public.knowledge_source_stage_records stage on stage.source_version_id=version.id and stage.record_kind='concept' and stage.external_id=mapping.external_id
      where mapping.concept_id=page.concept_id),'[]'::jsonb)
  ) order by page.rank,page.canonical_label,page.concept_id),'[]'::jsonb) into v_items from page;
  v_state:=case when jsonb_array_length(v_items)=0 then 'no_equivalent' when v_exact_count>1 then 'ambiguous'
    when (v_items->0->>'matchClass') in ('exact','official_alias','human_alias') then v_items->0->>'matchClass' else 'relevant_partial' end;
  return jsonb_build_object('contractVersion','competency-taxonomy-search-1.0.0','taxonomyVersion','competency-taxonomy-1.0.0',
    'query',v_query,'state',v_state,'items',v_items);
end $$;
revoke all on function public.search_competency_taxonomy(uuid,text,integer) from public,anon;
grant execute on function public.search_competency_taxonomy(uuid,text,integer) to authenticated;

create function public.load_occupation_competency_relations(p_organization_id uuid,p_occupation_concept_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  perform private.m72_competency_reader(p_organization_id);
  if not exists(select 1 from public.knowledge_concepts where id=p_occupation_concept_id and status='approved' and concept_type='occupation'
    and (scope='global' or organization_id=p_organization_id)) then
    raise exception 'OCCUPATION_CONCEPT_UNAVAILABLE' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('relationId',relation.id,'relationType',relation.relation_type,
    'occupationConceptId',relation.source_concept_id,'competencyConceptId',competency.id,'competencyLabel',competency.canonical_label,
    'competencyType',competency.concept_type,'source',source.name,'sourceVersion',version.external_version,
    'attributes',relation.relation_attributes,'provenance',relation.provenance,'createsPersonalEvidence',false)
    order by competency.canonical_label,relation.id),'[]'::jsonb) into v_items
  from public.knowledge_relations relation
  join public.knowledge_concepts competency on competency.id=relation.target_concept_id and competency.status='approved' and competency.concept_type<>'occupation'
  join public.knowledge_sources source on source.id=relation.source_id
  join public.knowledge_source_versions version on version.id=relation.source_version_id and version.is_current and version.import_status='published'
  where relation.source_concept_id=p_occupation_concept_id and relation.status='approved'
    and (relation.scope='global' or relation.organization_id=p_organization_id)
    and (competency.scope='global' or competency.organization_id=p_organization_id);
  return jsonb_build_object('contractVersion','occupation-competency-relations-1.0.0',
    'occupationTaxonomyVersion','position-taxonomy-1.0.0','competencyTaxonomyVersion','competency-taxonomy-1.0.0','items',v_items);
end $$;
revoke all on function public.load_occupation_competency_relations(uuid,uuid) from public,anon;
grant execute on function public.load_occupation_competency_relations(uuid,uuid) to authenticated;

create function public.load_person_professional_evidence_map_v4(p_organization_id uuid,p_person_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_base jsonb; v_associations jsonb; v_issues jsonb;
begin
  v_base:=public.load_person_professional_evidence_map_v3(p_organization_id,p_person_id);
  select coalesce(jsonb_agg(jsonb_set(item,'{explanation,taxonomyVersion}',to_jsonb('competency-taxonomy-1.0.0'::text),true)
    order by ordinal),'[]'::jsonb) into v_associations
  from jsonb_array_elements(v_base->'associations') with ordinality rows(item,ordinal)
  where item#>>'{concept,type}'<>'occupation';
  select coalesce(jsonb_agg(item order by ordinal),'[]'::jsonb) into v_issues
  from (
    select item,ordinal from jsonb_array_elements(v_base->'issues') with ordinality rows(item,ordinal)
    union all
    select jsonb_build_object('code','incompatible','observedTerm',item->>'observedTerm',
      'explanation','Conceito ocupacional preservado no domínio ocupacional; não foi convertido em competência pessoal.'),100000+ordinal
    from jsonb_array_elements(v_base->'associations') with ordinality rows(item,ordinal) where item#>>'{concept,type}'='occupation'
  ) issues;
  return (v_base-'taxonomyContractVersion')||jsonb_build_object(
    'contractVersion','person-professional-evidence-3.0.0',
    'taxonomyVersions',jsonb_build_object('occupation','position-taxonomy-1.0.0','competency','competency-taxonomy-1.0.0'),
    'associations',v_associations,'issues',v_issues
  );
end $$;
revoke all on function public.load_person_professional_evidence_map_v4(uuid,uuid) from public,anon;
grant execute on function public.load_person_professional_evidence_map_v4(uuid,uuid) to authenticated;

create function public.curate_profile_competency_v2(
  p_organization_id uuid,p_person_id uuid,p_profile_id uuid,p_original_index integer,p_source_text text,p_normalized_term text,
  p_scope public.knowledge_scope,p_action text,p_concept_id uuid,p_reason text,p_proposal_label text,p_proposal_type public.knowledge_concept_type
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_legacy jsonb; v_projection jsonb;
begin
  v_legacy:=public.curate_profile_competency(p_organization_id,p_person_id,p_profile_id,p_original_index,p_source_text,p_normalized_term,
    p_scope,p_action,p_concept_id,p_reason,p_proposal_label,p_proposal_type);
  v_projection:=public.load_person_professional_evidence_map_v4(p_organization_id,p_person_id);
  return jsonb_build_object('workflowVersion','profile-competency-curation-2.0.0','outcome',v_legacy->>'outcome',
    'projection',v_projection,'proposalId',v_legacy->'proposalId');
end $$;
revoke all on function public.curate_profile_competency_v2(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) from public,anon;
grant execute on function public.curate_profile_competency_v2(uuid,uuid,uuid,integer,text,text,public.knowledge_scope,text,uuid,text,text,public.knowledge_concept_type) to authenticated;

alter table public.vacancy_requirements add column competency_taxonomy_version text;

create function private.enforce_vacancy_requirement_competency_taxonomy() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.concept_id is null then new.competency_taxonomy_version:=null; return new; end if;
  if not exists(select 1 from public.knowledge_concepts concept where concept.id=new.concept_id and concept.status='approved'
    and concept.concept_type<>'occupation' and (concept.scope='global' or concept.organization_id=new.organization_id)) then
    raise exception 'POSITION_REQUIREMENT_COMPETENCY_INVALID' using errcode='42501';
  end if;
  new.competency_taxonomy_version:='competency-taxonomy-1.0.0';
  return new;
end $$;
revoke all on function private.enforce_vacancy_requirement_competency_taxonomy() from public,anon,authenticated;
create trigger enforce_vacancy_requirement_competency_taxonomy
  before insert or update of concept_id on public.vacancy_requirements
  for each row execute function private.enforce_vacancy_requirement_competency_taxonomy();

comment on table public.professional_taxonomy_releases is 'Independent release metadata for the Occupational and Competency domains over the shared Knowledge infrastructure.';
comment on column public.vacancy_requirements.competency_taxonomy_version is 'Version of the Competency Taxonomy used by a new concept association; historical rows may remain null.';
