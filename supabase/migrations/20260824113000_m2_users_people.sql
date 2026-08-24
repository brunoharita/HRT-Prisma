create type public.membership_role_v2 as enum ('super_admin', 'owner', 'admin', 'recruiter', 'member');
create type public.platform_user_status as enum ('pending_first_access', 'active', 'inactive', 'blocked');
create type public.platform_credential_mode as enum ('manual_password', 'activation_link');

create table public.organization_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations add column group_id uuid references public.organization_groups(id) on delete restrict;

do $$
declare
  migrated_group_id uuid;
begin
  if exists (select 1 from public.organizations where group_id is null) then
    insert into public.organization_groups (name, slug)
    values ('Grupo principal', 'grupo-principal')
    returning id into migrated_group_id;

    update public.organizations
    set group_id = migrated_group_id
    where group_id is null;
  end if;
end;
$$;

alter table public.organizations alter column group_id set not null;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_reserved_username(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(value, '')) = any (
    array['admin', 'api', 'help', 'owner', 'prisma', 'root', 'security', 'support', 'system', 'superadmin']
  );
$$;

create table public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  email text not null,
  phone_e164 text,
  phone_country_iso2 text,
  phone_country_label text,
  phone_country_code text,
  phone_national_number text,
  access_profile public.membership_role_v2 not null,
  group_id uuid references public.organization_groups(id) on delete restrict,
  status public.platform_user_status not null default 'active',
  credential_mode public.platform_credential_mode not null default 'manual_password',
  must_change_password boolean not null default false,
  first_access_completed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (username = lower(username)),
  check (char_length(username) between 3 and 32),
  check (username ~ '^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$'),
  check (not private.is_reserved_username(username)),
  check (
    (
      phone_e164 is null
      and phone_country_iso2 is null
      and phone_country_label is null
      and phone_country_code is null
      and phone_national_number is null
    )
    or
    (
      phone_e164 is not null
      and phone_country_iso2 is not null
      and phone_country_label is not null
      and phone_country_code is not null
      and phone_national_number is not null
    )
  ),
  check (
    (access_profile = 'super_admin' and group_id is null)
    or
    (access_profile <> 'super_admin' and group_id is not null)
  )
);

create unique index platform_users_email_unique_idx on public.platform_users (lower(email));
create index organizations_group_idx on public.organizations (group_id);
create index platform_users_group_profile_idx on public.platform_users (group_id, access_profile, status);

create table public.platform_user_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  target_platform_user_id uuid references public.platform_users(id) on delete set null,
  target_auth_user_id uuid references auth.users(id) on delete set null,
  group_id uuid references public.organization_groups(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(previous_values) = 'object'),
  check (jsonb_typeof(new_values) = 'object')
);

create index platform_user_audit_target_idx on public.platform_user_audit_events (target_auth_user_id, created_at desc);
create index platform_user_audit_actor_idx on public.platform_user_audit_events (actor_auth_user_id, created_at desc);

create trigger organization_groups_touch_updated_at
before update on public.organization_groups
for each row execute function private.touch_updated_at();

create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function private.touch_updated_at();

create trigger platform_users_touch_updated_at
before update on public.platform_users
for each row execute function private.touch_updated_at();

with membership_summary as (
  select
    membership.user_id as auth_user_id,
    min(membership.created_at) as created_at,
    min(organization.group_id) as group_id,
    case
      when bool_or(membership.role = 'admin') then 'admin'::public.membership_role_v2
      when bool_or(membership.role = 'recruiter') then 'recruiter'::public.membership_role_v2
      else 'member'::public.membership_role_v2
    end as access_profile
  from public.organization_memberships membership
  join public.organizations organization on organization.id = membership.organization_id
  group by membership.user_id
),
auth_identity as (
  select
    auth_user.id as auth_user_id,
    coalesce(
      nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_user.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(auth_user.email, auth_user.id::text), '@', 1)
    ) as full_name,
    lower(
      regexp_replace(
        coalesce(nullif(split_part(auth_user.email, '@', 1), ''), 'user-' || substr(replace(auth_user.id::text, '-', ''), 1, 8)),
        '[^a-zA-Z0-9._-]+',
        '-',
        'g'
      )
    ) as base_username,
    coalesce(auth_user.email, 'user-' || substr(replace(auth_user.id::text, '-', ''), 1, 8) || '@example.invalid') as email
  from auth.users auth_user
),
identity_ranked as (
  select
    auth_identity.auth_user_id,
    auth_identity.full_name,
    case
      when char_length(trim(both '-' from auth_identity.base_username)) < 3
        then 'user-' || substr(replace(auth_identity.auth_user_id::text, '-', ''), 1, 8)
      else trim(both '-' from auth_identity.base_username)
    end as normalized_username,
    auth_identity.email
  from auth_identity
),
identity_deduplicated as (
  select
    identity_ranked.auth_user_id,
    identity_ranked.full_name,
    case
      when count(*) over (partition by identity_ranked.normalized_username) > 1
        then left(identity_ranked.normalized_username, 24) || '-' || substr(replace(identity_ranked.auth_user_id::text, '-', ''), 1, 6)
      else identity_ranked.normalized_username
    end as username,
    identity_ranked.email
  from identity_ranked
)
insert into public.platform_users (
  auth_user_id,
  full_name,
  username,
  email,
  access_profile,
  group_id,
  status,
  credential_mode,
  must_change_password,
  created_at,
  updated_at
)
select
  membership_summary.auth_user_id,
  identity_deduplicated.full_name,
  identity_deduplicated.username,
  identity_deduplicated.email,
  membership_summary.access_profile,
  membership_summary.group_id,
  'active'::public.platform_user_status,
  'manual_password'::public.platform_credential_mode,
  false,
  membership_summary.created_at,
  membership_summary.created_at
from membership_summary
join identity_deduplicated on identity_deduplicated.auth_user_id = membership_summary.auth_user_id
on conflict (auth_user_id) do nothing;

alter table public.organization_memberships add column role_v2 public.membership_role_v2;

update public.organization_memberships
set role_v2 = case role
  when 'admin' then 'admin'::public.membership_role_v2
  when 'recruiter' then 'recruiter'::public.membership_role_v2
  else 'member'::public.membership_role_v2
end;

alter table public.organization_memberships drop column role;
drop type public.membership_role;
alter table public.organization_memberships rename column role_v2 to role;
alter type public.membership_role_v2 rename to membership_role;

alter table public.organization_memberships
  add constraint organization_memberships_role_not_super_admin check (role <> 'super_admin');

create unique index organization_memberships_member_one_org_idx
on public.organization_memberships (user_id)
where role = 'member';

create or replace function private.sync_owner_memberships_for_user(target_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.membership_role;
  target_group_id uuid;
begin
  delete from public.organization_memberships
  where user_id = target_auth_user_id
    and role = 'owner'::public.membership_role;

  select platform_user.access_profile, platform_user.group_id
  into target_profile, target_group_id
  from public.platform_users platform_user
  where platform_user.auth_user_id = target_auth_user_id;

  if target_profile = 'owner' and target_group_id is not null then
    insert into public.organization_memberships (organization_id, user_id, role, created_at)
    select organization.id, target_auth_user_id, 'owner'::public.membership_role, now()
    from public.organizations organization
    where organization.group_id = target_group_id
    on conflict (organization_id, user_id) do update
    set role = excluded.role;
  end if;
end;
$$;

create or replace function private.sync_owner_memberships_for_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.organization_memberships
  where organization_id = new.id
    and role = 'owner'::public.membership_role;

  insert into public.organization_memberships (organization_id, user_id, role, created_at)
  select new.id, platform_user.auth_user_id, 'owner'::public.membership_role, now()
  from public.platform_users platform_user
  where platform_user.access_profile = 'owner'
    and platform_user.group_id = new.group_id
  on conflict (organization_id, user_id) do update
  set role = excluded.role;

  return new;
end;
$$;

create or replace function private.platform_users_owner_membership_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_owner_memberships_for_user(new.auth_user_id);
  return new;
end;
$$;

create or replace function private.validate_membership_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_group_id uuid;
  target_profile public.membership_role;
  organization_group_id uuid;
begin
  select platform_user.group_id, platform_user.access_profile
  into target_group_id, target_profile
  from public.platform_users platform_user
  where platform_user.auth_user_id = new.user_id;

  if target_profile is null then
    raise exception 'platform_users row is required before organization membership';
  end if;

  select organization.group_id
  into organization_group_id
  from public.organizations organization
  where organization.id = new.organization_id;

  if organization_group_id is null then
    raise exception 'organization not found for membership';
  end if;

  if target_profile = 'super_admin' then
    raise exception 'super admin must not receive organization memberships';
  end if;

  if target_group_id is distinct from organization_group_id then
    raise exception 'organization membership must stay inside the user group';
  end if;

  if new.role <> target_profile then
    raise exception 'organization membership role must match the platform user profile';
  end if;

  return new;
end;
$$;

create trigger platform_users_sync_owner_memberships
after insert or update of access_profile, group_id on public.platform_users
for each row execute function private.platform_users_owner_membership_trigger();

create trigger organizations_sync_owner_memberships
after insert or update of group_id on public.organizations
for each row execute function private.sync_owner_memberships_for_group();

create trigger organization_memberships_validate_scope
before insert or update on public.organization_memberships
for each row execute function private.validate_membership_scope();

do $$
declare
  platform_user record;
begin
  for platform_user in
    select auth_user_id
    from public.platform_users
    where access_profile = 'owner'
  loop
    perform private.sync_owner_memberships_for_user(platform_user.auth_user_id);
  end loop;
end;
$$;

create or replace function private.is_active_platform_user(target_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_users platform_user
    where platform_user.auth_user_id = target_auth_user_id
      and platform_user.status = 'active'::public.platform_user_status
  );
$$;

create or replace function private.is_super_admin(target_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_users platform_user
    where platform_user.auth_user_id = target_auth_user_id
      and platform_user.status = 'active'::public.platform_user_status
      and platform_user.access_profile = 'super_admin'::public.membership_role
  );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      (select private.is_super_admin((select auth.uid())))
      or exists (
        select 1
        from public.organization_memberships membership
        join public.platform_users platform_user
          on platform_user.auth_user_id = membership.user_id
        where membership.organization_id = target_organization_id
          and membership.user_id = (select auth.uid())
          and membership.role = any (allowed_roles)
          and platform_user.status = 'active'::public.platform_user_status
      )
    );
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.is_reserved_username(text) from public;
revoke all on function private.sync_owner_memberships_for_user(uuid) from public;
revoke all on function private.sync_owner_memberships_for_group() from public;
revoke all on function private.platform_users_owner_membership_trigger() from public;
revoke all on function private.validate_membership_scope() from public;
revoke all on function private.is_active_platform_user(uuid) from public;
revoke all on function private.is_super_admin(uuid) from public;
revoke all on function private.has_org_role(uuid, public.membership_role[]) from public;
revoke all on function private.has_org_role(uuid, public.membership_role[]) from anon;
grant usage on schema private to authenticated;
grant execute on function private.has_org_role(uuid, public.membership_role[]) to authenticated;

alter table public.organization_groups enable row level security;
alter table public.platform_users enable row level security;
alter table public.platform_user_audit_events enable row level security;

drop policy if exists organizations_select on public.organizations;
drop policy if exists memberships_select on public.organization_memberships;
drop policy if exists memberships_manage on public.organization_memberships;
drop policy if exists units_select on public.organization_units;
drop policy if exists units_manage on public.organization_units;
drop policy if exists roles_select on public.job_roles;
drop policy if exists roles_manage on public.job_roles;
drop policy if exists positions_select on public.positions;
drop policy if exists positions_manage on public.positions;
drop policy if exists vacancies_select on public.vacancies;
drop policy if exists vacancies_manage on public.vacancies;
drop policy if exists people_select on public.people;
drop policy if exists people_manage on public.people;
drop policy if exists private_data_select on public.person_private_data;
drop policy if exists private_data_manage on public.person_private_data;
drop policy if exists documents_select on public.documents;
drop policy if exists documents_manage on public.documents;
drop policy if exists profiles_select on public.professional_profiles;
drop policy if exists profiles_manage on public.professional_profiles;
drop policy if exists evidence_select on public.evidence;
drop policy if exists evidence_manage on public.evidence;
drop policy if exists inferences_select on public.inferences;
drop policy if exists inferences_manage on public.inferences;
drop policy if exists inference_evidence_select on public.inference_evidence;
drop policy if exists inference_evidence_manage on public.inference_evidence;
drop policy if exists competencies_select on public.competencies;
drop policy if exists competencies_manage on public.competencies;
drop policy if exists profile_competencies_select on public.profile_competencies;
drop policy if exists profile_competencies_manage on public.profile_competencies;
drop policy if exists vacancy_requirements_select on public.vacancy_requirements;
drop policy if exists vacancy_requirements_manage on public.vacancy_requirements;
drop policy if exists match_evaluations_select on public.match_evaluations;
drop policy if exists match_evaluations_create on public.match_evaluations;
drop policy if exists usage_events_select on public.ai_usage_events;

create policy organization_groups_select on public.organization_groups for select to authenticated
using (
  exists (
    select 1
    from public.platform_users platform_user
    where platform_user.auth_user_id = (select auth.uid())
      and (
        (platform_user.status = 'active'::public.platform_user_status and platform_user.access_profile = 'super_admin'::public.membership_role)
        or (
          exists (
            select 1
            from public.organizations organization
            where organization.group_id = organization_groups.id
              and (select private.has_org_role(organization.id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[]))
          )
        )
      )
  )
);

create policy platform_users_select_self on public.platform_users for select to authenticated
using (auth_user_id = (select auth.uid()));

create policy organizations_select on public.organizations for select to authenticated
using ((select private.has_org_role(id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));

create policy memberships_select on public.organization_memberships for select to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.is_active_platform_user((select auth.uid())))
  )
  or (select private.is_super_admin((select auth.uid())))
);

create policy units_select on public.organization_units for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy units_manage on public.organization_units for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy roles_select on public.job_roles for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy roles_manage on public.job_roles for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy positions_select on public.positions for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy positions_manage on public.positions for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancies_select on public.vacancies for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy vacancies_manage on public.vacancies for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy people_select on public.people for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy people_manage on public.people for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy private_data_select on public.person_private_data for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy private_data_manage on public.person_private_data for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy documents_select on public.documents for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy documents_manage on public.documents for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy profiles_select on public.professional_profiles for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy profiles_manage on public.professional_profiles for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy evidence_select on public.evidence for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy evidence_manage on public.evidence for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy inferences_select on public.inferences for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy inferences_manage on public.inferences for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy inference_evidence_select on public.inference_evidence for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy inference_evidence_manage on public.inference_evidence for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy competencies_select on public.competencies for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy competencies_manage on public.competencies for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy profile_competencies_select on public.profile_competencies for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy profile_competencies_manage on public.profile_competencies for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancy_requirements_select on public.vacancy_requirements for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy vacancy_requirements_manage on public.vacancy_requirements for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy match_evaluations_select on public.match_evaluations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy match_evaluations_create on public.match_evaluations for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));

create policy usage_events_select on public.ai_usage_events for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

revoke all on all tables in schema public from anon;
grant select on public.organization_groups, public.organizations, public.organization_memberships, public.platform_users to authenticated;
grant select, insert, update, delete on public.organization_units, public.job_roles, public.positions, public.vacancies,
  public.people, public.person_private_data, public.documents, public.professional_profiles, public.evidence,
  public.inferences, public.inference_evidence, public.competencies, public.profile_competencies,
  public.vacancy_requirements, public.match_evaluations to authenticated;
grant select on public.ai_usage_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;
