-- Exact normalized heading is the tenant catalog identity (ADR-019).
-- Source section IDs remain unchanged in Profiles and confirmation provenance.
begin;
create or replace function private.learn_approved_custom_profile_sections()
returns trigger
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  v_section jsonb;
  v_definition_id uuid;
  v_normalized_name text;
  v_created boolean;
  v_confirmation_id uuid;
begin
  if old.state = 'draft' and new.state = 'approved' then
    -- Only this private trigger writes this catalog through the client flow.
    -- Serialize lookup/create for both unique keys within the organization.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'prisma-custom-section-learning:' || new.organization_id::text, 0));
    for v_section in
      select value from jsonb_array_elements(coalesce(new.reviewed_data -> 'customSections', '[]'::jsonb))
    loop
      v_normalized_name := private.normalize_profile_section_name(v_section ->> 'name');
      v_created := false;
      select item.id into v_definition_id
      from public.organization_custom_section_definitions item
      where item.organization_id = new.organization_id and item.normalized_name = v_normalized_name
      for update;
      if not found then
        select item.id into v_definition_id
        from public.organization_custom_section_definitions item
        where item.organization_id = new.organization_id and item.section_key = v_section ->> 'id'
        for update;
      end if;
      if v_definition_id is null then
        insert into public.organization_custom_section_definitions (
          organization_id, section_key, display_name, normalized_name, format,
          method_version, contract_version, status, confirmation_count,
          first_confirmed_at, last_confirmed_at
        ) values (
          new.organization_id, v_section ->> 'id', btrim(v_section ->> 'name'),
          v_normalized_name, v_section ->> 'format',
          'prisma-custom-section-learning-v1', '1.0.0', 'active', 1, now(), now()
        ) returning id into v_definition_id;
        v_created := true;
      end if;

      insert into public.organization_custom_section_confirmations (
        organization_id, definition_id, review_id, section_key,
        method_version, contract_version, confirmed_at
      ) values (
        new.organization_id, v_definition_id, new.id, v_section ->> 'id',
        'prisma-custom-section-learning-v1', '1.0.0', now()
      ) on conflict (organization_id, definition_id, review_id) do nothing
      returning id into v_confirmation_id;
      if v_confirmation_id is not null and not v_created then
        update public.organization_custom_section_definitions set
          display_name = btrim(v_section ->> 'name'), normalized_name = v_normalized_name,
          format = v_section ->> 'format', status = 'active',
          confirmation_count = confirmation_count + 1,
          last_confirmed_at = now(), updated_at = now()
        where organization_id = new.organization_id and id = v_definition_id;
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.learn_approved_custom_profile_sections() from public, anon, authenticated;
comment on function private.learn_approved_custom_profile_sections() is
  'ADR-019 bounded identity fix: exact normalized tenant heading before source key, atomic confirmation provenance; source/profile IDs unchanged.';
commit;
