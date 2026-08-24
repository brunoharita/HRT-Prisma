create type public.person_profile_state as enum (
  'not_generated',
  'building',
  'generated',
  'requires_attention',
  'processing_failed'
);

create type public.document_source_type as enum ('manual_text', 'resume_pdf');

create type public.processing_state as enum (
  'uploaded',
  'validated',
  'extracting_native',
  'native_extracted',
  'ocr_required',
  'ocr_processing',
  'extracted',
  'structuring',
  'structured',
  'profile_ready',
  'completed',
  'failed_validation',
  'failed_extraction',
  'failed_ocr',
  'failed_structuring'
);

create type public.page_extraction_origin as enum ('native_pdf', 'ocr', 'manual_text');

alter table public.people
  add column profile_state public.person_profile_state not null default 'not_generated',
  add column latest_source_type public.document_source_type,
  add column latest_source_at timestamptz;

alter table public.person_private_data
  add column phone_e164 text,
  add column phone_country_iso2 text,
  add column phone_country_label text,
  add column phone_country_code text,
  add column phone_national_number text,
  add column birth_date date,
  add column city text,
  add column country_code text,
  add column notes text;

alter table public.documents
  add column source_type public.document_source_type not null default 'resume_pdf',
  add column original_filename text,
  add column declared_mime_type text,
  add column validated_mime_type text,
  add column byte_size bigint,
  add column page_count integer,
  add column actor_auth_user_id uuid references auth.users(id) on delete set null,
  add column document_version integer not null default 1,
  add column storage_bucket text,
  add column is_legacy_unstored boolean not null default false;

update public.documents
set is_legacy_unstored = true
where storage_path is null;

alter table public.documents
  add constraint documents_byte_size_valid check (byte_size is null or byte_size between 1 and 15728640),
  add constraint documents_page_count_valid check (page_count is null or page_count between 1 and 200),
  add constraint documents_storage_contract check (
    (source_type = 'manual_text' and storage_path is null and not is_legacy_unstored)
    or
    (source_type = 'resume_pdf' and storage_path is not null and storage_bucket = 'person-documents' and not is_legacy_unstored)
    or
    (source_type = 'resume_pdf' and storage_path is null and storage_bucket is null and is_legacy_unstored and actor_auth_user_id is null)
  );

create function private.enforce_document_legacy_contract()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_legacy_unstored and (tg_op = 'INSERT' or not old.is_legacy_unstored) then
    raise exception 'is_legacy_unstored is reserved for migration backfill';
  end if;
  return new;
end;
$$;

create trigger documents_reject_new_legacy_unstored
before insert or update of is_legacy_unstored on public.documents
for each row execute function private.enforce_document_legacy_contract();

revoke all on function private.enforce_document_legacy_contract() from public, anon, authenticated;

create unique index documents_person_version_idx
on public.documents (organization_id, person_id, document_version);

create table public.document_processing_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  state public.processing_state not null default 'uploaded',
  native_extraction_version text not null,
  ocr_version text,
  structuring_version text not null,
  current_method text not null default 'validation',
  pages_native integer not null default 0 check (pages_native >= 0),
  pages_ocr integer not null default 0 check (pages_ocr >= 0),
  useful_character_count integer not null default 0 check (useful_character_count >= 0),
  failure_code text,
  failure_message text,
  can_reprocess boolean not null default true,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, document_id, attempt_number),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  check (
    (state in ('failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring') and failure_code is not null and failure_message is not null)
    or state not in ('failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring')
  )
);

create index document_processing_attempts_person_idx
on public.document_processing_attempts (organization_id, person_id, started_at desc);

create table public.document_page_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  processing_attempt_id uuid not null,
  page_number integer not null check (page_number > 0),
  origin public.page_extraction_origin not null,
  text_content text not null,
  useful_character_count integer not null check (useful_character_count >= 0),
  method text not null,
  method_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, processing_attempt_id, page_number),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete cascade
);

create index document_page_extractions_document_idx
on public.document_page_extractions (organization_id, document_id, page_number);

create table public.extraction_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  processing_attempt_id uuid not null,
  draft_version text not null,
  validation_status text not null check (validation_status in ('valid', 'insufficient', 'invalid')),
  identified_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(identified_fields) = 'object'),
  uncertainties jsonb not null default '[]'::jsonb check (jsonb_typeof(uncertainties) = 'array'),
  not_identified jsonb not null default '[]'::jsonb check (jsonb_typeof(not_identified) = 'array'),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, processing_attempt_id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete cascade
);

alter table public.evidence
  add column processing_attempt_id uuid,
  add column extraction_origin public.page_extraction_origin,
  add column method text,
  add column method_version text,
  add column source_offset_start integer,
  add column source_offset_end integer,
  add foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete cascade;

alter table public.professional_profiles
  add column processing_attempt_id uuid,
  add column profile_version integer not null default 1,
  add column review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'generated', 'requires_attention')),
  add foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete restrict;

create unique index professional_profiles_person_version_idx
on public.professional_profiles (organization_id, person_id, profile_version);

create table public.person_ingestion_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid,
  document_id uuid,
  processing_attempt_id uuid,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  result text not null check (result in ('success', 'failure', 'denied')),
  error_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete cascade
);

create index person_ingestion_events_lookup_idx
on public.person_ingestion_events (organization_id, person_id, created_at desc);

create trigger document_processing_attempts_touch_updated_at
before update on public.document_processing_attempts
for each row execute function private.touch_updated_at();

create or replace function private.storage_object_organization_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_segment text;
begin
  first_segment := split_part(object_name, '/', 1);
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;

revoke all on function private.storage_object_organization_id(text) from public, anon, authenticated;
grant execute on function private.storage_object_organization_id(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('person-documents', 'person-documents', false, 15728640, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.document_processing_attempts enable row level security;
alter table public.document_page_extractions enable row level security;
alter table public.extraction_drafts enable row level security;
alter table public.person_ingestion_events enable row level security;

create policy processing_attempts_select on public.document_processing_attempts for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy processing_attempts_manage on public.document_processing_attempts for all to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));

create policy page_extractions_select on public.document_page_extractions for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy page_extractions_manage on public.document_page_extractions for all to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));

create policy extraction_drafts_select on public.extraction_drafts for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy extraction_drafts_manage on public.extraction_drafts for all to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));

create policy ingestion_events_select on public.person_ingestion_events for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin']::public.membership_role[])));

drop policy if exists person_documents_read on storage.objects;
drop policy if exists person_documents_upload on storage.objects;

create policy person_documents_read on storage.objects for select to authenticated
using (
  bucket_id = 'person-documents'
  and (select private.has_org_role(
    private.storage_object_organization_id(name),
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  ))
);

create policy person_documents_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'person-documents'
  and (select private.has_org_role(
    private.storage_object_organization_id(name),
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  ))
);

grant select, insert, update on public.document_processing_attempts, public.document_page_extractions, public.extraction_drafts to authenticated;
grant select on public.person_ingestion_events to authenticated;
grant usage, select on sequence public.person_ingestion_events_id_seq to authenticated;
