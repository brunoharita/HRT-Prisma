-- M5.5: source-versioned occupational references. Source scales stay distinct.

alter table public.knowledge_source_stage_records
  add column relation_attributes jsonb not null default '{}'::jsonb
  check (jsonb_typeof(relation_attributes) = 'object');

alter table public.knowledge_relations
  add column relation_attributes jsonb not null default '{}'::jsonb
  check (jsonb_typeof(relation_attributes) = 'object');

create index knowledge_relations_occupation_reference_idx
on public.knowledge_relations (source_concept_id, source_version_id, status)
where status = 'approved';

create index knowledge_relations_attributes_gin_idx
on public.knowledge_relations using gin (relation_attributes);

create or replace function public.stage_knowledge_source_batch_v2(
  p_source_name text,
  p_external_version text,
  p_official_url text,
  p_manifest jsonb,
  p_records jsonb,
  p_reset boolean default false
) returns table (source_version_id uuid, staged_records bigint, reused_records bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_result record;
  v_item jsonb;
begin
  if jsonb_typeof(p_records) <> 'array' then
    raise exception using errcode = '22023', message = 'records array is required';
  end if;

  select * into v_result
  from public.stage_knowledge_source_batch(p_source_name, p_external_version, p_official_url, p_manifest, p_records, p_reset);

  for v_item in select value from jsonb_array_elements(p_records) loop
    if v_item ->> 'recordKind' = 'relation' then
      if jsonb_typeof(coalesce(v_item -> 'relationAttributes', '{}'::jsonb)) <> 'object' then
        raise exception using errcode = '22023', message = 'relation attributes must be an object';
      end if;
      update public.knowledge_source_stage_records
      set relation_attributes = coalesce(v_item -> 'relationAttributes', '{}'::jsonb)
      where source_version_id = v_result.source_version_id
        and record_kind = 'relation'
        and external_id = v_item ->> 'externalId'
        and language = coalesce(nullif(v_item ->> 'language', ''), 'und');
    end if;
  end loop;
  return query select v_result.source_version_id, v_result.staged_records, v_result.reused_records;
end;
$$;

create or replace function public.publish_knowledge_source_version_v2(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid
) returns table (source_version_id uuid, knowledge_version bigint, concepts_published bigint, terms_published bigint, relations_published bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_result record;
begin
  create temporary table m55_relation_attributes on commit drop as
  select external_id, source_external_id, target_external_id, relation_attributes
  from public.knowledge_source_stage_records
  where source_version_id = p_source_version_id and record_kind = 'relation';

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

revoke all on function public.stage_knowledge_source_batch_v2(text, text, text, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.publish_knowledge_source_version_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.stage_knowledge_source_batch_v2(text, text, text, jsonb, jsonb, boolean) to service_role;
grant execute on function public.publish_knowledge_source_version_v2(uuid, uuid) to service_role;

comment on column public.knowledge_relations.relation_attributes is
  'Source-defined occupational relation semantics and measures. ESCO essential/optional and O*NET scales remain distinct.';
