-- Custom profile sections: evidence-safe persistence and organization-scoped structural learning.

create function private.normalize_profile_section_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(translate(value,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

revoke all on function private.normalize_profile_section_name(text) from public, anon, authenticated;

create function private.is_valid_custom_profile_sections(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  sections jsonb;
  section jsonb;
  item jsonb;
begin
  if jsonb_typeof(payload) <> 'object' then return false; end if;
  if not (payload ? 'customSections') then return true; end if;
  sections := payload -> 'customSections';
  if jsonb_typeof(sections) <> 'array' or jsonb_array_length(sections) > 50 then return false; end if;

  if exists (
    select 1 from jsonb_array_elements(sections) candidate
    group by candidate ->> 'id' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(sections) candidate
    group by private.normalize_profile_section_name(candidate ->> 'name') having count(*) > 1
  ) then return false; end if;

  for section in select value from jsonb_array_elements(sections)
  loop
    if jsonb_typeof(section) <> 'object'
      or section - array['id', 'name', 'format', 'source', 'items']::text[] <> '{}'::jsonb
      or not (section ?& array['id', 'name', 'format', 'source', 'items']::text[])
      or coalesce(section ->> 'id', '') !~ '^[a-z0-9][a-z0-9_-]{7,79}$'
      or char_length(btrim(coalesce(section ->> 'name', ''))) not between 2 and 80
      or private.normalize_profile_section_name(section ->> 'name') in (
        'certificacoes', 'competencias', 'competencias chave', 'educacao',
        'experiencia', 'experiencia profissional', 'formacao', 'formacao academica',
        'idiomas', 'incertezas', 'nao identificados', 'pendencias de interpretacao',
        'informacoes nao localizadas', 'resumo', 'resumo profissional'
      )
      or coalesce(section ->> 'format', '') not in ('text', 'list')
      or coalesce(section ->> 'source', '') not in ('extracted', 'human')
      or jsonb_typeof(section -> 'items') <> 'array'
      or jsonb_array_length(section -> 'items') not between 1 and 100
      or ((section ->> 'format') = 'text' and jsonb_array_length(section -> 'items') <> 1)
    then return false; end if;

    if exists (
      select 1 from jsonb_array_elements(section -> 'items') candidate
      group by candidate ->> 'id' having count(*) > 1
    ) then return false; end if;

    for item in select value from jsonb_array_elements(section -> 'items')
    loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'value']::text[] <> '{}'::jsonb
        or not (item ?& array['id', 'value']::text[])
        or coalesce(item ->> 'id', '') !~ '^[a-z0-9][a-z0-9_-]{7,79}$'
        or char_length(btrim(coalesce(item ->> 'value', ''))) not between 1 and 4000
      then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.is_valid_custom_profile_sections(jsonb) from public, anon, authenticated;

alter table public.extraction_drafts
  add constraint extraction_drafts_custom_sections_shape_check
  check (private.is_valid_custom_profile_sections(identified_fields)) not valid;
alter table public.extraction_drafts validate constraint extraction_drafts_custom_sections_shape_check;

alter table public.profile_reviews
  add constraint profile_reviews_extracted_custom_sections_shape_check
    check (private.is_valid_custom_profile_sections(extracted_data)) not valid,
  add constraint profile_reviews_reviewed_custom_sections_shape_check
    check (private.is_valid_custom_profile_sections(reviewed_data)) not valid;
alter table public.profile_reviews validate constraint profile_reviews_extracted_custom_sections_shape_check;
alter table public.profile_reviews validate constraint profile_reviews_reviewed_custom_sections_shape_check;

alter table public.profile_review_revisions
  add constraint profile_review_revisions_custom_sections_shape_check
  check (private.is_valid_custom_profile_sections(reviewed_data)) not valid;
alter table public.profile_review_revisions validate constraint profile_review_revisions_custom_sections_shape_check;

alter table public.professional_profiles
  add constraint professional_profiles_custom_sections_shape_check
  check (private.is_valid_custom_profile_sections(profile_data)) not valid;
alter table public.professional_profiles validate constraint professional_profiles_custom_sections_shape_check;

alter table public.profile_review_changes
  drop constraint profile_review_changes_field_path_check,
  add constraint profile_review_changes_field_path_check check (field_path in (
    'summary', 'experiences', 'education', 'certifications', 'languages',
    'competencies', 'customSections', 'uncertainties', 'notIdentified'
  ));

alter table public.profile_review_evidence_links
  drop constraint profile_review_evidence_links_field_path_check,
  add constraint profile_review_evidence_links_field_path_check check (
    field_path ~ '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
  );

do $$
declare
  function_oid oid;
  function_definition text;
  updated_definition text;
  old_path_pattern text := '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?)$';
  new_path_pattern text := '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$';
  old_fields text := '''languages'', ''competencies'', ''uncertainties'', ''notIdentified''';
  new_fields text := '''languages'', ''competencies'', ''customSections'', ''uncertainties'', ''notIdentified''';
begin
  function_oid := to_regprocedure(
    'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)'
  );
  if function_oid is null then raise exception 'private record evidence function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_path_pattern in function_definition) = 0 then
    if position(old_path_pattern in function_definition) = 0 then raise exception 'private record evidence field path contract has an unexpected shape'; end if;
    function_definition := replace(function_definition, old_path_pattern, new_path_pattern);
  end if;
  if position(new_fields in function_definition) = 0 then
    if position(old_fields in function_definition) = 0 then raise exception 'private record evidence review field loop has an unexpected shape'; end if;
    function_definition := replace(function_definition, old_fields, new_fields);
  end if;
  execute function_definition;

  function_oid := to_regprocedure('public.save_profile_review(uuid,uuid,integer,jsonb,text,text)');
  if function_oid is null then raise exception 'save review function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_fields in function_definition) = 0 then
    if position(old_fields in function_definition) = 0 then raise exception 'save review field loop has an unexpected shape'; end if;
    updated_definition := replace(function_definition, old_fields, new_fields);
    execute updated_definition;
  end if;
end;
$$;

create table public.organization_custom_section_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  section_key text not null check (section_key ~ '^[a-z0-9][a-z0-9_-]{7,79}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  normalized_name text not null check (
    char_length(normalized_name) between 2 and 80
    and normalized_name = private.normalize_profile_section_name(display_name)
  ),
  format text not null check (format in ('text', 'list')),
  method_version text not null default 'prisma-custom-section-learning-v1'
    check (method_version = 'prisma-custom-section-learning-v1'),
  contract_version text not null default '1.0.0' check (contract_version = '1.0.0'),
  status text not null default 'active' check (status in ('active', 'retired')),
  confirmation_count integer not null default 1 check (confirmation_count > 0),
  first_confirmed_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, section_key),
  unique (organization_id, normalized_name)
);

create index organization_custom_section_definitions_active_idx
on public.organization_custom_section_definitions (organization_id, status, confirmation_count desc, last_confirmed_at desc);

alter table public.organization_custom_section_definitions enable row level security;
create policy organization_custom_section_definitions_select
on public.organization_custom_section_definitions
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on public.organization_custom_section_definitions from public, anon, authenticated;
grant select on public.organization_custom_section_definitions to authenticated;

create function private.learn_approved_custom_profile_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section jsonb;
begin
  if old.state = 'draft' and new.state = 'approved' then
    for section in select value from jsonb_array_elements(coalesce(new.reviewed_data -> 'customSections', '[]'::jsonb))
    loop
      insert into public.organization_custom_section_definitions (
        organization_id, section_key, display_name, normalized_name, format,
        method_version, contract_version, status, confirmation_count,
        first_confirmed_at, last_confirmed_at
      ) values (
        new.organization_id,
        section ->> 'id',
        btrim(section ->> 'name'),
        private.normalize_profile_section_name(section ->> 'name'),
        section ->> 'format',
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
        updated_at = now();
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.learn_approved_custom_profile_sections() from public, anon, authenticated;

create trigger profile_reviews_learn_custom_sections
after update of state on public.profile_reviews
for each row execute function private.learn_approved_custom_profile_sections();
