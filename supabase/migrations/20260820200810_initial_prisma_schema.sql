create extension if not exists pgcrypto;

create schema if not exists private;

create type public.membership_role as enum ('admin', 'recruiter', 'hiring_manager');
create type public.document_status as enum (
  'pending',
  'processing',
  'processed',
  'extraction_failed',
  'needs_manual_review',
  'unsupported_format'
);
create type public.position_status as enum ('occupied', 'vacant', 'planned', 'inactive');
create type public.knowledge_classification as enum ('explicit', 'inferred');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_unit_id uuid,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name),
  foreign key (organization_id, parent_unit_id)
    references public.organization_units(organization_id, id)
    on delete set null (parent_unit_id)
);

create table public.job_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  mission text,
  responsibilities jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_unit_id uuid,
  job_role_id uuid not null,
  status public.position_status not null default 'planned',
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, organization_unit_id)
    references public.organization_units(organization_id, id)
    on delete set null (organization_unit_id),
  foreign key (organization_id, job_role_id)
    references public.job_roles(organization_id, id)
);

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  position_id uuid,
  job_role_id uuid not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed', 'cancelled')),
  context_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, position_id)
    references public.positions(organization_id, id)
    on delete set null (position_id),
  foreign key (organization_id, job_role_id)
    references public.job_roles(organization_id, id)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  lifecycle text not null default 'candidate'
    check (lifecycle in ('candidate', 'employee', 'former_employee', 'former_candidate', 'talent_pool')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.person_private_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  email text,
  phone text,
  location text,
  additional_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid,
  filename text not null,
  media_type text not null,
  storage_path text,
  checksum_sha256 text not null,
  status public.document_status not null default 'pending',
  failure_category text,
  failure_reason text,
  failure_technical_message text,
  can_reprocess boolean,
  extraction_version text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete set null (person_id),
  check (
    (status in ('extraction_failed', 'needs_manual_review', 'unsupported_format') and failure_reason is not null)
    or
    (status not in ('extraction_failed', 'needs_manual_review', 'unsupported_format'))
  )
);

create table public.professional_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  source_document_id uuid not null,
  profile_data jsonb not null,
  uncertainties jsonb not null default '[]'::jsonb,
  not_identified jsonb not null default '[]'::jsonb,
  extraction_version text not null,
  inference_version text not null,
  embedding_version text not null,
  prompt_version text not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade,
  foreign key (organization_id, source_document_id)
    references public.documents(organization_id, id)
    on delete restrict
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  kind text not null,
  fact text not null,
  source_page integer,
  source_block text not null,
  quoted_text text not null,
  extraction_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id)
    on delete cascade
);

create table public.inferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  inference_type text not null,
  value text not null,
  rationale text not null,
  inference_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade
);

create table public.inference_evidence (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inference_id uuid not null,
  evidence_id uuid not null,
  primary key (organization_id, inference_id, evidence_id),
  foreign key (organization_id, inference_id)
    references public.inferences(organization_id, id)
    on delete cascade,
  foreign key (organization_id, evidence_id)
    references public.evidence(organization_id, id)
    on delete cascade
);

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  normalized_name text not null,
  competency_type text not null default 'knowledge',
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, normalized_name)
);

create table public.profile_competencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null,
  competency_id uuid not null,
  classification public.knowledge_classification not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id, competency_id, classification),
  unique (organization_id, id),
  foreign key (organization_id, profile_id)
    references public.professional_profiles(organization_id, id)
    on delete cascade,
  foreign key (organization_id, competency_id)
    references public.competencies(organization_id, id)
    on delete restrict
);

create table public.vacancy_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid not null,
  competency_id uuid not null,
  label text not null,
  importance text not null check (importance in ('required', 'desired')),
  transferable_competencies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, vacancy_id)
    references public.vacancies(organization_id, id)
    on delete cascade,
  foreign key (organization_id, competency_id)
    references public.competencies(organization_id, id)
    on delete restrict
);

create table public.match_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  vacancy_id uuid not null,
  evaluation_data jsonb not null,
  matching_version text not null,
  prompt_version text not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade,
  foreign key (organization_id, vacancy_id)
    references public.vacancies(organization_id, id)
    on delete cascade
);

create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null,
  document_id uuid,
  stage text not null,
  duration_ms integer not null check (duration_ms >= 0),
  provider text not null,
  model text not null,
  version text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 8) not null default 0,
  result text not null check (result in ('success', 'failure')),
  error_category text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id)
    on delete set null (document_id)
);

create index organization_memberships_user_org_idx on public.organization_memberships (user_id, organization_id);
create index organization_units_org_idx on public.organization_units (organization_id);
create index job_roles_org_idx on public.job_roles (organization_id);
create index positions_org_idx on public.positions (organization_id);
create index vacancies_org_idx on public.vacancies (organization_id);
create index people_org_idx on public.people (organization_id);
create index documents_org_status_idx on public.documents (organization_id, status);
create index documents_org_checksum_idx on public.documents (organization_id, checksum_sha256);
create index profiles_org_person_idx on public.professional_profiles (organization_id, person_id);
create index evidence_org_person_idx on public.evidence (organization_id, person_id);
create index inferences_org_person_idx on public.inferences (organization_id, person_id);
create index competencies_org_name_idx on public.competencies (organization_id, normalized_name);
create index profile_competencies_org_profile_idx on public.profile_competencies (organization_id, profile_id);
create index vacancy_requirements_org_vacancy_idx on public.vacancy_requirements (organization_id, vacancy_id);
create index match_evaluations_org_vacancy_idx on public.match_evaluations (organization_id, vacancy_id);
create index ai_usage_events_org_created_idx on public.ai_usage_events (organization_id, created_at desc);

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
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
        and membership.role = any (allowed_roles)
    );
$$;

revoke all on function private.has_org_role(uuid, public.membership_role[]) from public;
revoke all on function private.has_org_role(uuid, public.membership_role[]) from anon;
grant usage on schema private to authenticated;
grant execute on function private.has_org_role(uuid, public.membership_role[]) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_units enable row level security;
alter table public.job_roles enable row level security;
alter table public.positions enable row level security;
alter table public.vacancies enable row level security;
alter table public.people enable row level security;
alter table public.person_private_data enable row level security;
alter table public.documents enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.evidence enable row level security;
alter table public.inferences enable row level security;
alter table public.inference_evidence enable row level security;
alter table public.competencies enable row level security;
alter table public.profile_competencies enable row level security;
alter table public.vacancy_requirements enable row level security;
alter table public.match_evaluations enable row level security;
alter table public.ai_usage_events enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using ((select private.has_org_role(id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));

create policy memberships_select on public.organization_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_org_role(organization_id, array['admin']::public.membership_role[]))
);
create policy memberships_manage on public.organization_memberships for all to authenticated
using ((select private.has_org_role(organization_id, array['admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin']::public.membership_role[])));

create policy units_select on public.organization_units for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy units_manage on public.organization_units for all to authenticated
using ((select private.has_org_role(organization_id, array['admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin']::public.membership_role[])));

create policy roles_select on public.job_roles for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy roles_manage on public.job_roles for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy positions_select on public.positions for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy positions_manage on public.positions for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy vacancies_select on public.vacancies for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy vacancies_manage on public.vacancies for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy people_select on public.people for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy people_manage on public.people for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy private_data_select on public.person_private_data for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));
create policy private_data_manage on public.person_private_data for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy documents_select on public.documents for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));
create policy documents_manage on public.documents for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy profiles_select on public.professional_profiles for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy profiles_manage on public.professional_profiles for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy evidence_select on public.evidence for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy evidence_manage on public.evidence for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy inferences_select on public.inferences for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy inferences_manage on public.inferences for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy inference_evidence_select on public.inference_evidence for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy inference_evidence_manage on public.inference_evidence for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy competencies_select on public.competencies for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy competencies_manage on public.competencies for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy profile_competencies_select on public.profile_competencies for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy profile_competencies_manage on public.profile_competencies for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy vacancy_requirements_select on public.vacancy_requirements for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy vacancy_requirements_manage on public.vacancy_requirements for all to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

create policy match_evaluations_select on public.match_evaluations for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));
create policy match_evaluations_create on public.match_evaluations for insert to authenticated
with check ((select private.has_org_role(organization_id, array['admin', 'recruiter', 'hiring_manager']::public.membership_role[])));

create policy usage_events_select on public.ai_usage_events for select to authenticated
using ((select private.has_org_role(organization_id, array['admin', 'recruiter']::public.membership_role[])));

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.organization_units, public.job_roles, public.positions, public.vacancies,
  public.people, public.person_private_data, public.documents, public.professional_profiles, public.evidence,
  public.inferences, public.inference_evidence, public.competencies, public.profile_competencies,
  public.vacancy_requirements, public.match_evaluations to authenticated;
grant select on public.organizations, public.organization_memberships, public.ai_usage_events to authenticated;
grant insert, update, delete on public.organization_memberships to authenticated;
grant usage, select on all sequences in schema public to authenticated;
