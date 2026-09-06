-- Forward-only fix: avoid output-column ambiguity in the M5.5 staging wrapper.

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
      update public.knowledge_source_stage_records as stage
      set relation_attributes = coalesce(v_item -> 'relationAttributes', '{}'::jsonb)
      where stage.source_version_id = v_result.source_version_id
        and stage.record_kind = 'relation'
        and stage.external_id = v_item ->> 'externalId'
        and stage.language = coalesce(nullif(v_item ->> 'language', ''), 'und');
    end if;
  end loop;
  return query select v_result.source_version_id, v_result.staged_records, v_result.reused_records;
end;
$$;

revoke all on function public.stage_knowledge_source_batch_v2(text, text, text, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.stage_knowledge_source_batch_v2(text, text, text, jsonb, jsonb, boolean) to service_role;
