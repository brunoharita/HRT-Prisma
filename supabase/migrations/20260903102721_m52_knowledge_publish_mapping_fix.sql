-- Forward-only fix: use persisted source-version mappings instead of a temporary table.

create or replace function public.publish_knowledge_source_version(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid
)
returns table (source_version_id uuid, knowledge_version bigint, concepts_published bigint, terms_published bigint, relations_published bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  v_version_record public.knowledge_source_versions;
  v_source_record public.knowledge_sources;
  v_stage_concept record;
  v_stage_term record;
  v_stage_relation record;
  v_local_concept_id uuid;
  v_next_version bigint;
  v_new_change_set uuid;
  v_concept_count bigint := 0;
  v_term_count bigint := 0;
  v_relation_count bigint := 0;
  v_preferred public.knowledge_source_stage_records;
  v_alias_value text;
begin
  if p_approved_by_auth_user_id is null
    or not (select private.is_super_admin(p_approved_by_auth_user_id)) then
    raise exception using errcode = '42501', message = 'an active Super Admin must approve source publication';
  end if;
  select * into v_version_record from public.knowledge_source_versions version
  where version.id = p_source_version_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge source version not found'; end if;
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
  select * into v_source_record from public.knowledge_sources source where source.id = v_version_record.source_id;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'source-publish', v_source_record.id::text), 0));
  select coalesce(max(change_set.version), 0) + 1 into v_next_version
  from public.knowledge_change_sets change_set where change_set.scope = 'global' and change_set.organization_id is null;
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

  for v_stage_concept in
    select distinct stage.external_id
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = v_version_record.id
      and stage.record_kind = 'concept'
      and stage.source_status = 'active'
    order by stage.external_id
  loop
    select mapping.concept_id into v_local_concept_id
    from public.knowledge_external_mappings mapping
    where mapping.source_id = v_source_record.id and mapping.external_id = v_stage_concept.external_id
    order by mapping.created_at, mapping.concept_id
    limit 1;
    select * into v_preferred
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = v_version_record.id
      and stage.record_kind = 'concept'
      and stage.external_id = v_stage_concept.external_id
      and stage.source_status = 'active'
    order by case stage.language when 'pt-BR' then 1 when 'pt' then 2 when 'en' then 3 else 4 end,
      stage.language
    limit 1;
    if v_local_concept_id is null then
      insert into public.knowledge_concepts (
        scope, organization_id, concept_type, canonical_label, description, language,
        status, version, change_set_id, provenance
      ) values (
        'global', null, v_preferred.concept_type, v_preferred.preferred_label, v_preferred.description,
        v_preferred.language, 'approved', 1, v_new_change_set,
        jsonb_build_object('source', v_source_record.name, 'source_version_id', v_version_record.id,
          'external_id', v_preferred.external_id, 'source_file', v_preferred.source_file)
      ) returning id into v_local_concept_id;
      v_concept_count := v_concept_count + 1;
    else
      update public.knowledge_concepts concept
      set canonical_label = v_preferred.preferred_label,
        description = v_preferred.description,
        language = v_preferred.language,
        concept_type = v_preferred.concept_type,
        status = 'approved', version = concept.version + 1,
        change_set_id = v_new_change_set,
        provenance = concept.provenance || jsonb_build_object(
          'source', v_source_record.name, 'source_version_id', v_version_record.id,
          'external_id', v_preferred.external_id, 'source_file', v_preferred.source_file
        ), updated_at = now()
      where concept.id = v_local_concept_id;
    end if;
    insert into public.knowledge_external_mappings (
      concept_id, source_id, source_version_id, external_id, external_uri, mapping_type, provenance
    ) values (
      v_local_concept_id, v_source_record.id, v_version_record.id, v_preferred.external_id,
      v_preferred.external_uri, 'exact', jsonb_build_object('source_file', v_preferred.source_file,
        'source_row', v_preferred.source_row, 'content_hash', v_preferred.content_hash)
    );
  end loop;

  update public.knowledge_terms term set status = 'deprecated'
  where term.source_id = v_source_record.id and term.status = 'approved';
  update public.knowledge_relations relation set status = 'deprecated'
  where relation.source_id = v_source_record.id and relation.status = 'approved';

  for v_stage_term in
    select stage.*, mapping.concept_id as local_concept_id
    from public.knowledge_source_stage_records stage
    join public.knowledge_external_mappings mapping
      on mapping.source_version_id = v_version_record.id and mapping.external_id = stage.external_id
    where stage.source_version_id = v_version_record.id
      and stage.record_kind = 'concept'
      and stage.source_status = 'active'
    order by stage.external_id, stage.language
  loop
    insert into public.knowledge_terms (
      concept_id, scope, organization_id, term, normalized_term, language, term_type,
      source_id, source_version_id, status, version
    ) values (
      v_stage_term.local_concept_id, 'global', null, v_stage_term.preferred_label,
      private.normalize_knowledge_term(v_stage_term.preferred_label), v_stage_term.language, 'canonical',
      v_source_record.id, v_version_record.id, 'approved', 1
    ) on conflict do nothing;
    if found then v_term_count := v_term_count + 1; end if;
    for v_alias_value in select jsonb_array_elements_text(v_stage_term.aliases)
    loop
      if nullif(btrim(v_alias_value), '') is not null then
        insert into public.knowledge_terms (
          concept_id, scope, organization_id, term, normalized_term, language, term_type,
          source_id, source_version_id, status, version
        ) values (
          v_stage_term.local_concept_id, 'global', null, v_alias_value,
          private.normalize_knowledge_term(v_alias_value), v_stage_term.language, 'alias',
          v_source_record.id, v_version_record.id, 'approved', 1
        ) on conflict do nothing;
        if found then v_term_count := v_term_count + 1; end if;
      end if;
    end loop;
  end loop;

  for v_stage_relation in
    select stage.*, source_mapping.concept_id as source_concept_id,
      target_mapping.concept_id as target_concept_id
    from public.knowledge_source_stage_records stage
    join public.knowledge_external_mappings source_mapping
      on source_mapping.source_version_id = v_version_record.id and source_mapping.external_id = stage.source_external_id
    join public.knowledge_external_mappings target_mapping
      on target_mapping.source_version_id = v_version_record.id and target_mapping.external_id = stage.target_external_id
    where stage.source_version_id = v_version_record.id and stage.record_kind = 'relation'
    order by stage.external_id
  loop
    insert into public.knowledge_relations (
      source_concept_id, target_concept_id, relation_type, scope, organization_id,
      source_id, source_version_id, provenance, status, version
    ) values (
      v_stage_relation.source_concept_id, v_stage_relation.target_concept_id,
      v_stage_relation.relation_type, 'global', null, v_source_record.id, v_version_record.id,
      jsonb_build_object('source_file', v_stage_relation.source_file,
        'source_row', v_stage_relation.source_row, 'content_hash', v_stage_relation.content_hash),
      'approved', v_next_version::integer
    ) on conflict do nothing;
    if found then v_relation_count := v_relation_count + 1; end if;
  end loop;

  update public.knowledge_source_versions version set is_current = false
  where version.source_id = v_source_record.id and version.id <> v_version_record.id and version.is_current;
  update public.knowledge_source_versions version
  set import_status = 'published', is_current = true, published_at = now(),
    counts = version.counts || jsonb_build_object(
      'knowledgeVersion', v_next_version,
      'conceptsPublished', v_concept_count,
      'termsPublished', v_term_count,
      'relationsPublished', v_relation_count
    )
  where version.id = v_version_record.id;
  delete from public.knowledge_source_stage_records stage where stage.source_version_id = v_version_record.id;

  return query select v_version_record.id, v_next_version, v_concept_count, v_term_count, v_relation_count, false;
end;
$$;

revoke all on function public.publish_knowledge_source_version(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_knowledge_source_version(uuid, uuid) to service_role;
