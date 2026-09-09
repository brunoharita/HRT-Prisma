-- M5.2 publication scalability: resumable batches with one transaction per call.
-- The existing RPC remains compatible; large snapshots use this bounded worker.

create table public.knowledge_source_publication_runs (
  source_version_id uuid primary key references public.knowledge_source_versions(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete restrict,
  approved_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  change_set_id uuid not null references public.knowledge_change_sets(id) on delete restrict,
  phase text not null default 'concepts' check (phase in ('concepts', 'terms', 'relations', 'finalized')),
  last_concept_external_id text,
  last_term_stage_id bigint,
  last_relation_stage_id bigint,
  concepts_published bigint not null default 0 check (concepts_published >= 0),
  terms_published bigint not null default 0 check (terms_published >= 0),
  relations_published bigint not null default 0 check (relations_published >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_source_publication_runs enable row level security;
revoke all on table public.knowledge_source_publication_runs from public, anon, authenticated;
grant all on table public.knowledge_source_publication_runs to service_role;

create or replace function public.publish_knowledge_source_version_batch(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid,
  p_batch_size integer default 5000
)
returns table (
  source_version_id uuid,
  phase text,
  done boolean,
  processed integer,
  concepts_published bigint,
  terms_published bigint,
  relations_published bigint
)
language plpgsql
security definer
set search_path = '' as $$
#variable_conflict error
declare
  v_version public.knowledge_source_versions;
  v_source public.knowledge_sources;
  v_run public.knowledge_source_publication_runs;
  v_next_version bigint;
  v_change_set uuid;
  v_processed integer := 0;
  v_inserted bigint := 0;
begin
  if p_batch_size < 100 or p_batch_size > 10000 then
    raise exception using errcode = '22023', message = 'publication batch size must be between 100 and 10000';
  end if;
  if p_approved_by_auth_user_id is null
    or not (select private.is_super_admin(p_approved_by_auth_user_id)) then
    raise exception using errcode = '42501', message = 'an active Super Admin must approve source publication';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'source-publish-batch', p_source_version_id::text), 0));
  select * into v_version from public.knowledge_source_versions version where version.id = p_source_version_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge source version not found'; end if;
  if v_version.import_status = 'published' then
    return query select p_source_version_id, 'finalized', true, 0,
      coalesce((v_version.counts ->> 'conceptsPublished')::bigint, 0),
      coalesce((v_version.counts ->> 'termsPublished')::bigint, 0),
      coalesce((v_version.counts ->> 'relationsPublished')::bigint, 0);
    return;
  end if;
  if v_version.import_status <> 'diff_ready' then
    raise exception using errcode = '55000', message = 'source version must be validated, staged and diffed before publication';
  end if;
  select * into v_source from public.knowledge_sources source where source.id = v_version.source_id;

  select * into v_run from public.knowledge_source_publication_runs run where run.source_version_id = p_source_version_id for update;
  if not found then
    select coalesce(max(change_set.version), 0) + 1 into v_next_version
    from public.knowledge_change_sets change_set
    where change_set.scope = 'global' and change_set.organization_id is null;
    insert into public.knowledge_change_sets (
      scope, organization_id, version, summary, source_versions, changed_entities, approved_by_auth_user_id
    ) values (
      'global', null, v_next_version,
      concat('Publicação da fonte ', v_source.name, ' ', v_version.external_version),
      jsonb_build_array(p_source_version_id),
      jsonb_build_array(jsonb_build_object('operation', 'publish_source_version', 'source', v_source.name, 'source_version_id', p_source_version_id)),
      p_approved_by_auth_user_id
    ) returning id into v_change_set;
    insert into public.knowledge_source_publication_runs (source_version_id, source_id, approved_by_auth_user_id, change_set_id)
    values (p_source_version_id, v_source.id, p_approved_by_auth_user_id, v_change_set)
    returning * into v_run;
  elsif v_run.approved_by_auth_user_id <> p_approved_by_auth_user_id then
    raise exception using errcode = '42501', message = 'publication approval owner cannot change during a run';
  end if;

  if v_run.phase = 'concepts' then
    create temporary table m52_batch_concepts on commit drop as
      select distinct on (stage.external_id)
        stage.external_id, stage.external_uri, stage.concept_type, stage.preferred_label, stage.description,
        stage.language, stage.aliases, stage.source_file, stage.source_row, stage.content_hash,
        coalesce(current_mapping.concept_id, previous_mapping.concept_id, canonical_reuse.concept_id) as concept_id
      from public.knowledge_source_stage_records stage
      left join lateral (
        select mapping.concept_id from public.knowledge_external_mappings mapping
        where mapping.source_version_id = p_source_version_id and mapping.external_id = stage.external_id
        order by mapping.created_at, mapping.concept_id limit 1
      ) current_mapping on true
      left join lateral (
        select mapping.concept_id from public.knowledge_external_mappings mapping
        where mapping.source_id = v_source.id and mapping.external_id = stage.external_id
        order by mapping.created_at, mapping.concept_id limit 1
    ) previous_mapping on true
    left join lateral (
      select concept.id as concept_id
      from public.knowledge_concepts concept
      where concept.scope = 'global' and concept.organization_id is null and concept.status = 'approved'
        and concept.concept_type = stage.concept_type
        and lower(btrim(concept.canonical_label)) = lower(btrim(stage.preferred_label))
      order by concept.updated_at, concept.id
      limit 1
    ) canonical_reuse on true
      where stage.source_version_id = p_source_version_id and stage.record_kind = 'concept'
        and stage.source_status = 'active'
        and (v_run.last_concept_external_id is null or stage.external_id > v_run.last_concept_external_id)
      order by stage.external_id, case stage.language when 'pt-BR' then 1 when 'pt' then 2 when 'en' then 3 else 4 end, stage.language
      limit p_batch_size;
    select count(*) into v_processed from m52_batch_concepts;

    insert into public.knowledge_concepts (scope, organization_id, concept_type, canonical_label, description, language, status, version, change_set_id, provenance)
    select 'global', null, concept_type, preferred_label, description, language, 'approved', 1, v_run.change_set_id,
      jsonb_build_object('source', v_source.name, 'source_version_id', p_source_version_id, 'external_id', external_id, 'source_file', source_file)
    from m52_batch_concepts where concept_id is null;
    get diagnostics v_inserted = row_count;

    update m52_batch_concepts map set concept_id = concept.id
    from public.knowledge_concepts concept
    where map.concept_id is null and concept.change_set_id = v_run.change_set_id
      and concept.provenance ->> 'source_version_id' = p_source_version_id::text
      and concept.provenance ->> 'external_id' = map.external_id;
    insert into public.knowledge_external_mappings (concept_id, source_id, source_version_id, external_id, external_uri, mapping_type, provenance)
    select concept_id, v_source.id, p_source_version_id, external_id, external_uri, 'exact',
      jsonb_build_object('source_file', source_file, 'source_row', source_row, 'content_hash', content_hash)
    from m52_batch_concepts where concept_id is not null on conflict do nothing;

    if v_run.last_concept_external_id is null then
      update public.knowledge_terms term set status = 'deprecated' where term.source_id = v_source.id and term.status = 'approved';
      update public.knowledge_relations relation set status = 'deprecated' where relation.source_id = v_source.id and relation.status = 'approved';
    end if;
    update public.knowledge_source_publication_runs run
    set last_concept_external_id = (select max(external_id) from m52_batch_concepts),
        concepts_published = run.concepts_published + v_inserted,
        phase = case when v_processed < p_batch_size then 'terms' else 'concepts' end,
        updated_at = now()
    where run.source_version_id = p_source_version_id;
  elsif v_run.phase = 'terms' then
    create temporary table m52_batch_terms on commit drop as
      select stage.id, stage.external_id, stage.language, stage.preferred_label, stage.aliases
      from public.knowledge_source_stage_records stage
      where stage.source_version_id = p_source_version_id and stage.record_kind = 'concept'
        and stage.source_status = 'active' and (v_run.last_term_stage_id is null or stage.id > v_run.last_term_stage_id)
      order by stage.id limit p_batch_size;
    select count(*) into v_processed from m52_batch_terms;
    with term_rows as (
      select mapping.concept_id, batch.language, batch.preferred_label as term, 'canonical'::text as term_type
      from m52_batch_terms batch join public.knowledge_external_mappings mapping
        on mapping.source_version_id = p_source_version_id and mapping.external_id = batch.external_id
      union all
      select mapping.concept_id, batch.language, alias.value, 'alias'::text
      from m52_batch_terms batch join public.knowledge_external_mappings mapping
        on mapping.source_version_id = p_source_version_id and mapping.external_id = batch.external_id
      cross join lateral jsonb_array_elements_text(coalesce(batch.aliases, '[]'::jsonb)) alias(value)
      where nullif(btrim(alias.value), '') is not null
    ), distinct_terms as (
      select distinct on (term_rows.concept_id, term_rows.language, private.normalize_knowledge_term(term_rows.term)) term_rows.*
      from term_rows
      order by term_rows.concept_id, term_rows.language, private.normalize_knowledge_term(term_rows.term), case when term_rows.term_type = 'canonical' then 1 else 2 end
    )
    insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type, source_id, source_version_id, status, version)
    select concept_id, 'global', null, term, private.normalize_knowledge_term(term), language, term_type, v_source.id, p_source_version_id, 'approved', 1
    from distinct_terms on conflict do nothing;
    get diagnostics v_inserted = row_count;
    update public.knowledge_source_publication_runs run
    set last_term_stage_id = (select max(id) from m52_batch_terms), terms_published = run.terms_published + v_inserted,
        phase = case when v_processed < p_batch_size then 'relations' else 'terms' end, updated_at = now()
    where run.source_version_id = p_source_version_id;
  elsif v_run.phase = 'relations' then
    create temporary table m52_batch_relations on commit drop as
      select stage.id, stage.external_id, stage.source_external_id, stage.target_external_id, stage.relation_type,
        stage.source_file, stage.source_row, stage.content_hash, stage.relation_attributes
      from public.knowledge_source_stage_records stage
      where stage.source_version_id = p_source_version_id and stage.record_kind = 'relation'
        and (v_run.last_relation_stage_id is null or stage.id > v_run.last_relation_stage_id)
      order by stage.id limit p_batch_size;
    select count(*) into v_processed from m52_batch_relations;
    insert into public.knowledge_relations (source_concept_id, target_concept_id, relation_type, scope, organization_id, source_id, source_version_id, provenance, status, version, relation_attributes)
    select source_mapping.concept_id, target_mapping.concept_id, batch.relation_type, 'global', null, v_source.id, p_source_version_id,
      jsonb_build_object('source_file', batch.source_file, 'source_row', batch.source_row, 'content_hash', batch.content_hash),
      'approved', (select version from public.knowledge_change_sets where id = v_run.change_set_id)::integer, batch.relation_attributes
    from m52_batch_relations batch
    join public.knowledge_external_mappings source_mapping on source_mapping.source_version_id = p_source_version_id and source_mapping.external_id = batch.source_external_id
    join public.knowledge_external_mappings target_mapping on target_mapping.source_version_id = p_source_version_id and target_mapping.external_id = batch.target_external_id
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    update public.knowledge_source_publication_runs run
    set last_relation_stage_id = (select max(id) from m52_batch_relations), relations_published = run.relations_published + v_inserted,
        phase = case when v_processed < p_batch_size then 'finalized' else 'relations' end, updated_at = now()
    where run.source_version_id = p_source_version_id;
  end if;

  select * into v_run from public.knowledge_source_publication_runs run where run.source_version_id = p_source_version_id;
  if v_run.phase = 'finalized' then
    update public.knowledge_source_versions version set is_current = false
    where version.source_id = v_source.id and version.id <> p_source_version_id and version.is_current;
    update public.knowledge_source_versions version set import_status = 'published', is_current = true, published_at = now(),
      counts = version.counts || jsonb_build_object('knowledgeVersion', (select version from public.knowledge_change_sets where id = v_run.change_set_id),
        'conceptsPublished', v_run.concepts_published, 'termsPublished', v_run.terms_published, 'relationsPublished', v_run.relations_published)
    where version.id = p_source_version_id;
    delete from public.knowledge_source_stage_records stage where stage.source_version_id = p_source_version_id;
    update public.knowledge_source_publication_runs run set phase = 'finalized', updated_at = now() where run.source_version_id = p_source_version_id;
  end if;
  return query select p_source_version_id, v_run.phase, v_run.phase = 'finalized', v_processed,
    v_run.concepts_published, v_run.terms_published, v_run.relations_published;
end;
$$;

revoke all on function public.publish_knowledge_source_version_batch(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.publish_knowledge_source_version_batch(uuid, uuid, integer) to service_role;
