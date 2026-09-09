-- M5.2 publication hardening: replace row-by-row source publication with
-- set-based batches. The public contract and Super Admin boundary remain the same.

create or replace function public.publish_knowledge_source_version(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid
)
returns table (
  source_version_id uuid,
  knowledge_version bigint,
  concepts_published bigint,
  terms_published bigint,
  relations_published bigint,
  reused boolean
)
language plpgsql
security definer
set search_path = '' as $$
#variable_conflict error
declare
  v_version_record public.knowledge_source_versions;
  v_source_record public.knowledge_sources;
  v_next_version bigint;
  v_new_change_set uuid;
  v_concept_count bigint := 0;
  v_term_count bigint := 0;
  v_relation_count bigint := 0;
begin
  if p_approved_by_auth_user_id is null
    or not (select private.is_super_admin(p_approved_by_auth_user_id)) then
    raise exception using errcode = '42501', message = 'an active Super Admin must approve source publication';
  end if;

  select * into v_version_record
  from public.knowledge_source_versions version
  where version.id = p_source_version_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Knowledge source version not found';
  end if;
  if v_version_record.import_status = 'published' then
    return query select v_version_record.id,
      coalesce((v_version_record.counts ->> 'knowledgeVersion')::bigint, 0),
      coalesce((v_version_record.counts ->> 'conceptsPublished')::bigint, 0),
      coalesce((v_version_record.counts ->> 'termsPublished')::bigint, 0),
      coalesce((v_version_record.counts ->> 'relationsPublished')::bigint, 0), true;
    return;
  end if;
  if v_version_record.import_status <> 'diff_ready' then
    raise exception using errcode = '55000', message = 'source version must be validated, staged and diffed before publication';
  end if;

  select * into v_source_record
  from public.knowledge_sources source
  where source.id = v_version_record.source_id;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'source-publish', v_source_record.id::text), 0));

  select coalesce(max(change_set.version), 0) + 1 into v_next_version
  from public.knowledge_change_sets change_set
  where change_set.scope = 'global' and change_set.organization_id is null;
  insert into public.knowledge_change_sets (
    scope, organization_id, version, summary, source_versions, changed_entities, approved_by_auth_user_id
  ) values (
    'global', null, v_next_version,
    concat('Publicação da fonte ', v_source_record.name, ' ', v_version_record.external_version),
    jsonb_build_array(v_version_record.id),
    jsonb_build_array(jsonb_build_object('operation', 'publish_source_version',
      'source', v_source_record.name, 'source_version_id', v_version_record.id)),
    p_approved_by_auth_user_id
  ) returning id into v_new_change_set;

  -- One preferred language row per external concept, with current mappings
  -- taking precedence over mappings from an earlier source version.
  create temporary table m52_publish_concept_map on commit drop as
    select distinct on (stage.external_id)
      stage.external_id,
      stage.external_uri,
      stage.concept_type,
      stage.preferred_label,
      stage.description,
      stage.language,
      stage.aliases,
      stage.source_file,
      stage.source_row,
      stage.content_hash,
      coalesce(current_mapping.concept_id, previous_mapping.concept_id) as concept_id
    from public.knowledge_source_stage_records stage
    left join lateral (
      select mapping.concept_id
      from public.knowledge_external_mappings mapping
      where mapping.source_version_id = p_source_version_id
        and mapping.external_id = stage.external_id
      order by mapping.created_at, mapping.concept_id
      limit 1
    ) current_mapping on true
    left join lateral (
      select mapping.concept_id
      from public.knowledge_external_mappings mapping
      where mapping.source_id = v_source_record.id
        and mapping.external_id = stage.external_id
      order by mapping.created_at, mapping.concept_id
      limit 1
    ) previous_mapping on true
    where stage.source_version_id = p_source_version_id
      and stage.record_kind = 'concept'
      and stage.source_status = 'active'
    order by stage.external_id,
      case stage.language when 'pt-BR' then 1 when 'pt' then 2 when 'en' then 3 else 4 end,
      stage.language;

  select count(*) into v_concept_count
  from m52_publish_concept_map
  where concept_id is null;

  insert into public.knowledge_concepts (
    scope, organization_id, concept_type, canonical_label, description, language,
    status, version, change_set_id, provenance
  )
  select 'global', null, map.concept_type, map.preferred_label, map.description, map.language,
    'approved', 1, v_new_change_set,
    jsonb_build_object('source', v_source_record.name, 'source_version_id', p_source_version_id,
      'external_id', map.external_id, 'source_file', map.source_file)
  from m52_publish_concept_map map
  where map.concept_id is null;

  update m52_publish_concept_map map
  set concept_id = concept.id
  from public.knowledge_concepts concept
  where map.concept_id is null
    and concept.change_set_id = v_new_change_set
    and concept.provenance ->> 'source_version_id' = p_source_version_id::text
    and concept.provenance ->> 'external_id' = map.external_id;

  insert into public.knowledge_external_mappings (
    concept_id, source_id, source_version_id, external_id, external_uri, mapping_type, provenance
  )
  select map.concept_id, v_source_record.id, p_source_version_id, map.external_id, map.external_uri, 'exact',
    jsonb_build_object('source_file', map.source_file, 'source_row', map.source_row, 'content_hash', map.content_hash)
  from m52_publish_concept_map map
  where map.concept_id is not null
  on conflict do nothing;

  update public.knowledge_terms term
  set status = 'deprecated'
  where term.source_id = v_source_record.id and term.status = 'approved';
  update public.knowledge_relations relation
  set status = 'deprecated'
  where relation.source_id = v_source_record.id and relation.status = 'approved';

  with term_rows as (
    select map.concept_id, map.language, map.preferred_label as term, 'canonical'::text as term_type
    from m52_publish_concept_map map
    where map.concept_id is not null
    union all
    select map.concept_id, map.language, alias.value, 'alias'::text
    from m52_publish_concept_map map
    cross join lateral jsonb_array_elements_text(coalesce(map.aliases, '[]'::jsonb)) alias(value)
    where map.concept_id is not null and nullif(btrim(alias.value), '') is not null
  ), distinct_terms as (
    select distinct on (term_rows.concept_id, term_rows.language, private.normalize_knowledge_term(term_rows.term))
      term_rows.*
    from term_rows
    order by term_rows.concept_id, term_rows.language, private.normalize_knowledge_term(term_rows.term),
      case when term_rows.term_type = 'canonical' then 1 else 2 end
  )
  insert into public.knowledge_terms (
    concept_id, scope, organization_id, term, normalized_term, language, term_type,
    source_id, source_version_id, status, version
  )
  select concept_id, 'global', null, term, private.normalize_knowledge_term(term), language, term_type,
    v_source_record.id, p_source_version_id, 'approved', 1
  from distinct_terms
  on conflict do nothing;
  get diagnostics v_term_count = row_count;

  insert into public.knowledge_relations (
    source_concept_id, target_concept_id, relation_type, scope, organization_id,
    source_id, source_version_id, provenance, status, version
  )
  select source_mapping.concept_id, target_mapping.concept_id, stage.relation_type,
    'global', null, v_source_record.id, p_source_version_id,
    jsonb_build_object('source_file', stage.source_file, 'source_row', stage.source_row, 'content_hash', stage.content_hash),
    'approved', v_next_version::integer
  from public.knowledge_source_stage_records stage
  join public.knowledge_external_mappings source_mapping
    on source_mapping.source_version_id = p_source_version_id
   and source_mapping.external_id = stage.source_external_id
  join public.knowledge_external_mappings target_mapping
    on target_mapping.source_version_id = p_source_version_id
   and target_mapping.external_id = stage.target_external_id
  where stage.source_version_id = p_source_version_id
    and stage.record_kind = 'relation'
  on conflict do nothing;
  get diagnostics v_relation_count = row_count;

  update public.knowledge_source_versions version
  set is_current = false
  where version.source_id = v_source_record.id
    and version.id <> p_source_version_id
    and version.is_current;
  update public.knowledge_source_versions version
  set import_status = 'published', is_current = true, published_at = now(),
    counts = version.counts || jsonb_build_object(
      'knowledgeVersion', v_next_version,
      'conceptsPublished', v_concept_count,
      'termsPublished', v_term_count,
      'relationsPublished', v_relation_count
    )
  where version.id = p_source_version_id;
  delete from public.knowledge_source_stage_records stage
  where stage.source_version_id = p_source_version_id;

  return query select p_source_version_id, v_next_version, v_concept_count, v_term_count, v_relation_count, false;
end;
$$;

revoke all on function public.publish_knowledge_source_version(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_knowledge_source_version(uuid, uuid) to service_role;
