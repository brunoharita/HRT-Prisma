-- Forward-only fix: avoid PL/pgSQL output-column ambiguity while preserving
-- source-defined relation attributes during the audited publication transaction.
create or replace function public.publish_knowledge_source_version_v2(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid
) returns table (source_version_id uuid, knowledge_version bigint, concepts_published bigint, terms_published bigint, relations_published bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_result record;
begin
  create temporary table m55_relation_attributes on commit drop as
  select stage.external_id, stage.source_external_id, stage.target_external_id, stage.relation_attributes
  from public.knowledge_source_stage_records stage
  where stage.source_version_id = p_source_version_id and stage.record_kind = 'relation';

  select * into v_result
  from public.publish_knowledge_source_version(p_source_version_id, p_approved_by_auth_user_id);

  update public.knowledge_relations relation
  set relation_attributes = attributes.relation_attributes,
      provenance = relation.provenance || jsonb_build_object('relation_attributes_version', 'occupational-reference-1.0.0')
  from m55_relation_attributes attributes
  join public.knowledge_external_mappings source_mapping
    on source_mapping.external_id = attributes.source_external_id
  join public.knowledge_external_mappings target_mapping
    on target_mapping.external_id = attributes.target_external_id
       and target_mapping.source_version_id = source_mapping.source_version_id
  where relation.source_version_id = p_source_version_id
    and relation.source_concept_id = source_mapping.concept_id
    and relation.target_concept_id = target_mapping.concept_id
    and source_mapping.source_version_id = p_source_version_id;

  return query select v_result.source_version_id, v_result.knowledge_version, v_result.concepts_published,
    v_result.terms_published, v_result.relations_published, v_result.reused;
end;
$$;

revoke all on function public.publish_knowledge_source_version_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_knowledge_source_version_v2(uuid, uuid) to service_role;
