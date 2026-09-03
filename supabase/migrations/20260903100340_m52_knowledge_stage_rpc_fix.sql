-- Forward-only fix: disambiguate the staged record kind from the table column.

create or replace function public.stage_knowledge_source_batch(
  p_source_name text,
  p_external_version text,
  p_official_url text,
  p_manifest jsonb,
  p_records jsonb,
  p_reset boolean default false
) returns table (source_version_id uuid, staged_records bigint, reused_records bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  v_source_record public.knowledge_sources;
  v_version_record public.knowledge_source_versions;
  v_item jsonb;
  v_existing_hash text;
  v_staged bigint := 0;
  v_reused bigint := 0;
  v_record_kind text;
begin
  if jsonb_typeof(p_manifest) <> 'object' or jsonb_typeof(p_records) <> 'array' then
    raise exception using errcode = '22023', message = 'manifest object and records array are required';
  end if;
  if p_official_url !~ '^https://' then
    raise exception using errcode = '22023', message = 'official HTTPS URL is required';
  end if;
  select * into v_source_record from public.knowledge_sources source
  where source.name = p_source_name and source.status = 'approved' for update;
  if not found then raise exception using errcode = 'P0002', message = 'approved Knowledge source not found'; end if;

  insert into public.knowledge_source_versions (
    source_id, external_version, release_date, retrieval_date, checksum_sha256, format,
    license, import_status, official_url, manifest, validation_summary, validated_at,
    previous_version_id
  ) values (
    v_source_record.id, p_external_version,
    nullif(p_manifest ->> 'releaseDate', '')::date,
    nullif(p_manifest ->> 'downloadedAt', '')::timestamptz,
    nullif(p_manifest ->> 'packageSha256', ''),
    coalesce(nullif(p_manifest ->> 'format', ''), 'CSV'),
    v_source_record.license, 'validated', p_official_url, p_manifest,
    jsonb_build_object('validatedBy', 'knowledge-source-ingestion-1.0.0'), now(),
    (select current_version.id from public.knowledge_source_versions current_version
      where current_version.source_id = v_source_record.id and current_version.is_current
      order by current_version.published_at desc nulls last limit 1)
  )
  on conflict (source_id, external_version)
  do update set official_url = excluded.official_url, manifest = excluded.manifest,
    validation_summary = excluded.validation_summary, validated_at = excluded.validated_at
  where public.knowledge_source_versions.import_status <> 'published'
  returning * into v_version_record;

  if not found then
    select * into v_version_record from public.knowledge_source_versions version
    where version.source_id = v_source_record.id and version.external_version = p_external_version;
    raise exception using errcode = '55000', message = 'published source version is immutable';
  end if;
  if p_reset then delete from public.knowledge_source_stage_records stage where stage.source_version_id = v_version_record.id; end if;

  for v_item in select record.value from jsonb_array_elements(p_records) record(value)
  loop
    v_record_kind := v_item ->> 'recordKind';
    if v_record_kind not in ('concept', 'relation') then
      raise exception using errcode = '22023', message = 'unexpected stage record kind';
    end if;
    select stage.content_hash into v_existing_hash
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = v_version_record.id
      and stage.record_kind = v_record_kind
      and stage.external_id = v_item ->> 'externalId'
      and stage.language = coalesce(nullif(v_item ->> 'language', ''), 'pt-BR');
    if found then
      if v_existing_hash <> v_item ->> 'contentHash' then
        raise exception using errcode = '23505', message = 'divergent staged record replay';
      end if;
      v_reused := v_reused + 1;
      continue;
    end if;
    insert into public.knowledge_source_stage_records (
      source_id, source_version_id, record_kind, external_id, external_uri,
      concept_type, preferred_label, description, language, aliases, source_status,
      source_external_id, target_external_id, relation_type, source_file, source_row, content_hash
    ) values (
      v_source_record.id, v_version_record.id, v_record_kind, v_item ->> 'externalId', nullif(v_item ->> 'externalUri', ''),
      nullif(v_item ->> 'conceptType', '')::public.knowledge_concept_type,
      nullif(v_item ->> 'preferredLabel', ''), coalesce(v_item ->> 'description', ''),
      coalesce(nullif(v_item ->> 'language', ''), 'pt-BR'), coalesce(v_item -> 'aliases', '[]'::jsonb),
      coalesce(nullif(v_item ->> 'sourceStatus', ''), 'active'),
      nullif(v_item ->> 'sourceExternalId', ''), nullif(v_item ->> 'targetExternalId', ''),
      nullif(v_item ->> 'relationType', '')::public.knowledge_relation_type,
      v_item ->> 'sourceFile', (v_item ->> 'sourceRow')::bigint, v_item ->> 'contentHash'
    );
    v_staged := v_staged + 1;
  end loop;

  update public.knowledge_source_versions version
  set import_status = 'staged', staged_at = now()
  where version.id = v_version_record.id;
  return query select v_version_record.id, v_staged, v_reused;
end;
$$;

revoke all on function public.stage_knowledge_source_batch(text, text, text, jsonb, jsonb, boolean)
from public, anon, authenticated;
grant execute on function public.stage_knowledge_source_batch(text, text, text, jsonb, jsonb, boolean)
to service_role;
