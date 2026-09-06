-- Forward-only fix: the stage status is constrained, so exact-reuse records
-- are copied to a transaction-local table and removed before the legacy loop.
create or replace function public.publish_knowledge_source_version_v2(p_source_version_id uuid, p_approved_by_auth_user_id uuid)
returns table (source_version_id uuid, knowledge_version bigint, concepts_published bigint, terms_published bigint, relations_published bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_result record;
begin
  create temporary table m55_relation_attributes on commit drop as
    select stage.external_id, stage.source_external_id, stage.target_external_id, stage.relation_attributes
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = p_source_version_id and stage.record_kind = 'relation';

  create temporary table m55_canonical_reuse on commit drop as
    select stage.* from public.knowledge_source_stage_records stage
    join public.knowledge_concepts concept on concept.scope = 'global' and concept.organization_id is null
      and concept.status = 'approved' and concept.concept_type = stage.concept_type
      and lower(btrim(concept.canonical_label)) = lower(btrim(stage.preferred_label))
    where stage.source_version_id = p_source_version_id and stage.record_kind = 'concept'
      and stage.source_status = 'active';

  insert into public.knowledge_external_mappings (concept_id, source_id, source_version_id, external_id, external_uri, mapping_type, provenance)
  select concept.id, stage.source_id, stage.source_version_id, stage.external_id, stage.external_uri, 'exact',
    jsonb_build_object('source_file', stage.source_file, 'source_row', stage.source_row,
      'content_hash', stage.content_hash, 'canonical_reuse', true)
  from m55_canonical_reuse stage
  join public.knowledge_concepts concept on concept.scope = 'global' and concept.organization_id is null
    and concept.status = 'approved' and concept.concept_type = stage.concept_type
    and lower(btrim(concept.canonical_label)) = lower(btrim(stage.preferred_label))
  on conflict do nothing;

  delete from public.knowledge_source_stage_records stage
  where stage.source_version_id = p_source_version_id and stage.record_kind = 'concept'
    and exists (select 1 from m55_canonical_reuse reused where reused.id = stage.id);

  select * into v_result from public.publish_knowledge_source_version(p_source_version_id, p_approved_by_auth_user_id);

  insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type, source_id, source_version_id, status, version)
  select mapping.concept_id, 'global', null, stage.preferred_label, private.normalize_knowledge_term(stage.preferred_label),
    stage.language, 'canonical', stage.source_id, stage.source_version_id, 'approved', 1
  from m55_canonical_reuse stage join public.knowledge_external_mappings mapping
    on mapping.source_version_id = stage.source_version_id and mapping.external_id = stage.external_id
  on conflict do nothing;

  insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type, source_id, source_version_id, status, version)
  select mapping.concept_id, 'global', null, alias.value, private.normalize_knowledge_term(alias.value),
    stage.language, 'alias', stage.source_id, stage.source_version_id, 'approved', 1
  from m55_canonical_reuse stage join public.knowledge_external_mappings mapping
    on mapping.source_version_id = stage.source_version_id and mapping.external_id = stage.external_id
  cross join lateral jsonb_array_elements_text(stage.aliases) alias(value)
  where nullif(btrim(alias.value), '') is not null on conflict do nothing;

  update public.knowledge_relations relation set relation_attributes = attributes.relation_attributes,
    provenance = relation.provenance || jsonb_build_object('relation_attributes_version', 'occupational-reference-1.0.0')
  from m55_relation_attributes attributes join public.knowledge_external_mappings source_mapping
    on source_mapping.external_id = attributes.source_external_id
  join public.knowledge_external_mappings target_mapping on target_mapping.external_id = attributes.target_external_id
    and target_mapping.source_version_id = source_mapping.source_version_id
  where relation.source_version_id = p_source_version_id and relation.source_concept_id = source_mapping.concept_id
    and relation.target_concept_id = target_mapping.concept_id and source_mapping.source_version_id = p_source_version_id;

  return query select v_result.source_version_id, v_result.knowledge_version, v_result.concepts_published,
    v_result.terms_published, v_result.relations_published, v_result.reused;
end;
$$;
revoke all on function public.publish_knowledge_source_version_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_knowledge_source_version_v2(uuid, uuid) to service_role;
