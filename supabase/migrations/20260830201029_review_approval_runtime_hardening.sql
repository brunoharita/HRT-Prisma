-- Runtime hardening for the final review transition.
-- PL/pgSQL variables use a v_ prefix so ON CONFLICT column targets can never
-- be interpreted as both a function variable and a table column.

create or replace function private.learn_approved_custom_profile_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict error
declare
  v_section jsonb;
  v_definition_id uuid;
begin
  if old.state = 'draft' and new.state = 'approved' then
    for v_section in
      select value
      from jsonb_array_elements(coalesce(new.reviewed_data -> 'customSections', '[]'::jsonb))
    loop
      insert into public.organization_custom_section_definitions (
        organization_id, section_key, display_name, normalized_name, format,
        method_version, contract_version, status, confirmation_count,
        first_confirmed_at, last_confirmed_at
      ) values (
        new.organization_id,
        v_section ->> 'id',
        btrim(v_section ->> 'name'),
        private.normalize_profile_section_name(v_section ->> 'name'),
        v_section ->> 'format',
        'prisma-custom-section-learning-v1', '1.0.0', 'active', 1, now(), now()
      )
      on conflict (organization_id, section_key)
      do update set
        display_name = excluded.display_name,
        normalized_name = excluded.normalized_name,
        format = excluded.format,
        status = 'active',
        confirmation_count = public.organization_custom_section_definitions.confirmation_count + 1,
        last_confirmed_at = now(),
        updated_at = now()
      returning id into v_definition_id;

      insert into public.organization_custom_section_confirmations (
        organization_id, definition_id, review_id, section_key,
        method_version, contract_version, confirmed_at
      ) values (
        new.organization_id, v_definition_id, new.id, v_section ->> 'id',
        'prisma-custom-section-learning-v1', '1.0.0', now()
      ) on conflict (organization_id, definition_id, review_id) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.learn_approved_custom_profile_sections() from public, anon, authenticated;

do $$
declare
  v_function_definition text;
begin
  v_function_definition := pg_get_functiondef(
    'private.learn_approved_custom_profile_sections()'::regprocedure
  );

  if position('#variable_conflict error' in v_function_definition) = 0
    or position('v_definition_id uuid' in v_function_definition) = 0
    or position('new.organization_id, v_definition_id, new.id' in v_function_definition) = 0
  then
    raise exception 'custom section learning hardening was not installed';
  end if;

  if v_function_definition ~ E'\\n\\s*definition_id\\s+uuid[;\\n]'
  then
    raise exception 'custom section learning still declares an ambiguous definition_id variable';
  end if;
end;
$$;
