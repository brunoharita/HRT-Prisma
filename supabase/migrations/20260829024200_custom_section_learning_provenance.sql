-- Append-only provenance for every approved custom-section definition confirmation.

create table public.organization_custom_section_confirmations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  definition_id uuid not null,
  review_id uuid not null,
  section_key text not null check (section_key ~ '^[a-z0-9][a-z0-9_-]{7,79}$'),
  method_version text not null check (method_version = 'prisma-custom-section-learning-v1'),
  contract_version text not null check (contract_version = '1.0.0'),
  confirmed_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, definition_id, review_id),
  foreign key (organization_id, definition_id)
    references public.organization_custom_section_definitions(organization_id, id) on delete restrict,
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete restrict
);

create index organization_custom_section_confirmations_review_idx
on public.organization_custom_section_confirmations (organization_id, review_id);

alter table public.organization_custom_section_confirmations enable row level security;
create policy organization_custom_section_confirmations_select
on public.organization_custom_section_confirmations
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on public.organization_custom_section_confirmations from public, anon, authenticated;
grant select on public.organization_custom_section_confirmations to authenticated;

create trigger organization_custom_section_confirmations_immutable
before update or delete on public.organization_custom_section_confirmations
for each row execute function private.prevent_review_evidence_history_mutation();

create or replace function private.learn_approved_custom_profile_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section jsonb;
  definition_id uuid;
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
        updated_at = now()
      returning id into definition_id;

      insert into public.organization_custom_section_confirmations (
        organization_id, definition_id, review_id, section_key,
        method_version, contract_version, confirmed_at
      ) values (
        new.organization_id, definition_id, new.id, section ->> 'id',
        'prisma-custom-section-learning-v1', '1.0.0', now()
      ) on conflict (organization_id, definition_id, review_id) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.learn_approved_custom_profile_sections() from public, anon, authenticated;
