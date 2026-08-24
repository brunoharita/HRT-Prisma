alter type public.document_status add value if not exists 'received';
alter type public.document_status add value if not exists 'ready_for_review';
alter type public.document_status add value if not exists 'in_review';
alter type public.document_status add value if not exists 'approved';
alter type public.document_status add value if not exists 'failed';

create type public.document_review_state as enum (
  'not_ready',
  'ready_for_review',
  'in_review',
  'approved',
  'invalidated'
);

create type public.document_operation_status as enum ('started', 'completed', 'failed');
create type public.profile_review_state as enum ('draft', 'approved', 'invalidated');

alter table public.documents
  add column review_state public.document_review_state not null default 'not_ready';

alter table public.document_processing_attempts
  add column retry_of_attempt_id uuid,
  add column actor_auth_user_id uuid references auth.users(id) on delete set null,
  add foreign key (organization_id, retry_of_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete restrict;

create table public.document_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid,
  document_id uuid,
  processing_attempt_id uuid,
  review_id uuid,
  profile_id uuid,
  operation_type text not null check (operation_type in (
    'register_document',
    'persist_extraction',
    'retry_processing',
    'record_failure',
    'start_review',
    'save_review_draft',
    'approve_review',
    'invalidate_review'
  )),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  request_fingerprint text not null check (char_length(request_fingerprint) between 8 and 256),
  status public.document_operation_status not null default 'started',
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  error_code text,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, operation_type, idempotency_key),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete cascade
);

create table public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  document_id uuid not null,
  processing_attempt_id uuid not null,
  base_profile_id uuid,
  base_profile_version integer check (base_profile_version is null or base_profile_version > 0),
  approved_profile_id uuid,
  state public.profile_review_state not null default 'draft',
  extracted_data jsonb not null check (jsonb_typeof(extracted_data) = 'object'),
  reviewed_data jsonb not null check (jsonb_typeof(reviewed_data) = 'object'),
  lock_version integer not null default 1 check (lock_version > 0),
  started_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  last_edited_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete cascade,
  foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete restrict,
  foreign key (organization_id, base_profile_id)
    references public.professional_profiles(organization_id, id) on delete restrict,
  check (
    (state = 'draft' and approved_at is null and approved_profile_id is null)
    or (state = 'approved' and approved_at is not null and approved_profile_id is not null)
    or (state = 'invalidated' and invalidated_at is not null)
  )
);

create unique index profile_reviews_one_draft_per_attempt_idx
on public.profile_reviews (organization_id, processing_attempt_id)
where state = 'draft';

create table public.profile_review_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  reviewed_data jsonb not null check (jsonb_typeof(reviewed_data) = 'object'),
  change_reason text,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, review_id, revision_number),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade
);

create table public.profile_review_changes (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  review_revision_id uuid not null,
  field_path text not null check (field_path in (
    'summary', 'experiences', 'education', 'certifications',
    'languages', 'competencies', 'uncertainties', 'notIdentified'
  )),
  extracted_value jsonb,
  previous_value jsonb,
  reviewed_value jsonb,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, review_revision_id)
    references public.profile_review_revisions(organization_id, id) on delete cascade
);

alter table public.professional_profiles
  drop constraint if exists professional_profiles_review_status_check,
  add constraint professional_profiles_review_status_check
    check (review_status in ('pending_review', 'generated', 'requires_attention', 'approved', 'invalidated')),
  add column review_id uuid,
  add column approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  add column approved_at timestamptz,
  add column base_profile_id uuid,
  add foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete restrict,
  add foreign key (organization_id, base_profile_id)
    references public.professional_profiles(organization_id, id) on delete restrict;

alter table public.profile_reviews
  add foreign key (organization_id, approved_profile_id)
    references public.professional_profiles(organization_id, id) on delete restrict;

alter table public.document_operations
  add foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete cascade,
  add foreign key (organization_id, profile_id)
    references public.professional_profiles(organization_id, id) on delete cascade;

create unique index professional_profiles_one_current_idx
on public.professional_profiles (organization_id, person_id)
where superseded_at is null;

create index document_operations_scope_idx
on public.document_operations (organization_id, status, created_at desc);
create index document_operations_document_idx
on public.document_operations (organization_id, document_id, created_at desc);
create index profile_reviews_person_idx
on public.profile_reviews (organization_id, person_id, created_at desc);
create index profile_review_revisions_review_idx
on public.profile_review_revisions (organization_id, review_id, revision_number desc);
create index profile_review_changes_review_idx
on public.profile_review_changes (organization_id, review_id, created_at desc);

create trigger document_operations_touch_updated_at
before update on public.document_operations
for each row execute function private.touch_updated_at();

create trigger profile_reviews_touch_updated_at
before update on public.profile_reviews
for each row execute function private.touch_updated_at();

alter table public.document_operations enable row level security;
alter table public.profile_reviews enable row level security;
alter table public.profile_review_revisions enable row level security;
alter table public.profile_review_changes enable row level security;

create policy document_operations_select on public.document_operations for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy profile_reviews_select on public.profile_reviews for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy profile_review_revisions_select on public.profile_review_revisions for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));
create policy profile_review_changes_select on public.profile_review_changes for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));

drop policy if exists ingestion_events_select on public.person_ingestion_events;
create policy ingestion_events_select on public.person_ingestion_events for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[])));

grant select on public.document_operations, public.profile_reviews, public.profile_review_revisions, public.profile_review_changes to authenticated;
grant usage, select on sequence public.profile_review_changes_id_seq to authenticated;

revoke insert, update, delete on public.documents from authenticated;
revoke insert, update, delete on public.document_processing_attempts from authenticated;
revoke insert, update, delete on public.document_page_extractions from authenticated;
revoke insert, update, delete on public.extraction_drafts from authenticated;
revoke insert, update, delete on public.evidence from authenticated;
revoke insert, update, delete on public.professional_profiles from authenticated;
revoke insert, update, delete on public.person_ingestion_events from authenticated;
revoke insert, update, delete on public.document_operations from authenticated;
revoke insert, update, delete on public.profile_reviews from authenticated;
revoke insert, update, delete on public.profile_review_revisions from authenticated;
revoke insert, update, delete on public.profile_review_changes from authenticated;

create or replace function private.require_document_reviewer(p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authenticated session required';
  end if;
  if not private.has_org_role(
    p_organization_id,
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  ) then
    raise exception using errcode = '42501', message = 'organization scope is not authorized';
  end if;
  return actor_id;
end;
$$;

revoke all on function private.require_document_reviewer(uuid) from public, anon, authenticated;

create or replace function private.claim_document_operation(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_operation_type text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_actor_id uuid
)
returns public.document_operations
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.document_operations;
begin
  if char_length(p_idempotency_key) not between 16 and 160 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;

  insert into public.document_operations (
    organization_id, person_id, document_id, operation_type,
    idempotency_key, request_fingerprint, actor_auth_user_id
  ) values (
    p_organization_id, p_person_id, p_document_id, p_operation_type,
    p_idempotency_key, p_request_fingerprint, p_actor_id
  )
  on conflict (organization_id, operation_type, idempotency_key) do nothing;

  select * into claimed
  from public.document_operations operation
  where operation.organization_id = p_organization_id
    and operation.operation_type = p_operation_type
    and operation.idempotency_key = p_idempotency_key
  for update;

  if claimed.request_fingerprint <> p_request_fingerprint then
    raise exception using errcode = '23505', message = 'idempotency key was already used for another request';
  end if;

  return claimed;
end;
$$;

revoke all on function private.claim_document_operation(uuid, uuid, uuid, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.register_person_document(
  p_organization_id uuid,
  p_person_id uuid,
  p_source_type public.document_source_type,
  p_filename text,
  p_declared_mime_type text,
  p_validated_mime_type text,
  p_checksum_sha256 text,
  p_byte_size bigint,
  p_page_count integer,
  p_extraction_version text,
  p_idempotency_key text
)
returns table (document_id uuid, document_version integer, storage_path text, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  operation public.document_operations;
  new_document_id uuid;
  next_version integer;
  resolved_storage_path text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_person_id is null or p_filename is null or btrim(p_filename) = '' then
    raise exception using errcode = '22023', message = 'person and filename are required';
  end if;
  if p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid sha256 checksum';
  end if;
  if p_byte_size is null or p_byte_size <= 0 or p_byte_size > 15728640 then
    raise exception using errcode = '22023', message = 'invalid document size';
  end if;
  if p_page_count is null or p_page_count < 1 or p_page_count > 200 then
    raise exception using errcode = '22023', message = 'invalid page count';
  end if;

  perform 1 from public.people person
  where person.organization_id = p_organization_id and person.id = p_person_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'person not found in organization';
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_person_id::text, p_source_type::text, p_filename,
    p_declared_mime_type, p_validated_mime_type, p_checksum_sha256, p_byte_size::text,
    p_page_count::text, p_extraction_version), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, p_person_id, null, 'register_document',
    p_idempotency_key, fingerprint, actor_id
  );

  if operation.status = 'completed' and operation.document_id is not null then
    return query
    select document.id, document.document_version, document.storage_path, true
    from public.documents document
    where document.organization_id = p_organization_id and document.id = operation.document_id;
    return;
  end if;

  select coalesce(max(document.document_version), 0) + 1 into next_version
  from public.documents document
  where document.organization_id = p_organization_id and document.person_id = p_person_id;

  new_document_id := gen_random_uuid();
  resolved_storage_path := case when p_source_type = 'resume_pdf'
    then concat(p_organization_id, '/', p_person_id, '/', new_document_id, '.pdf')
    else null end;

  insert into public.documents (
    id, organization_id, person_id, filename, original_filename, media_type,
    declared_mime_type, validated_mime_type, storage_path, storage_bucket,
    checksum_sha256, byte_size, page_count, status, review_state,
    extraction_version, source_type, actor_auth_user_id, document_version,
    can_reprocess
  ) values (
    new_document_id, p_organization_id, p_person_id, p_filename,
    case when p_source_type = 'resume_pdf' then p_filename else null end,
    p_validated_mime_type, p_declared_mime_type, p_validated_mime_type,
    resolved_storage_path, case when resolved_storage_path is null then null else 'person-documents' end,
    p_checksum_sha256, p_byte_size, p_page_count, 'received', 'not_ready',
    p_extraction_version, p_source_type, actor_id, next_version, true
  );

  update public.document_operations
  set document_id = new_document_id,
      status = 'completed',
      result = jsonb_build_object('document_id', new_document_id, 'document_version', next_version),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id,
    event_type, result, metadata
  ) values (
    p_organization_id, p_person_id, new_document_id, actor_id,
    'document_registered', 'success',
    jsonb_build_object('operation_id', operation.id, 'source_type', p_source_type, 'document_version', next_version)
  );

  return query select new_document_id, next_version, resolved_storage_path, false;
end;
$$;

create or replace function public.record_document_failure(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_failure_state public.processing_state,
  p_failure_code text,
  p_failure_message text,
  p_idempotency_key text
)
returns table (processing_attempt_id uuid, attempt_number integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  operation public.document_operations;
  new_attempt_id uuid;
  next_attempt integer;
  previous_attempt_id uuid;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_failure_state not in ('failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring') then
    raise exception using errcode = '22023', message = 'invalid failure state';
  end if;
  if p_failure_code is null or p_failure_code !~ '^[a-z0-9_]{3,80}$' then
    raise exception using errcode = '22023', message = 'invalid failure code';
  end if;

  perform 1 from public.documents document
  where document.organization_id = p_organization_id
    and document.person_id = p_person_id and document.id = p_document_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'document not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_document_id::text, p_failure_state::text, p_failure_code), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, p_person_id, p_document_id, 'record_failure',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.processing_attempt_id is not null then
    return query select attempt.id, attempt.attempt_number, true
    from public.document_processing_attempts attempt
    where attempt.organization_id = p_organization_id and attempt.id = operation.processing_attempt_id;
    return;
  end if;

  select attempt.id into previous_attempt_id
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = p_document_id
  order by attempt.attempt_number desc limit 1;

  select coalesce(max(attempt.attempt_number), 0) + 1 into next_attempt
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = p_document_id;

  insert into public.document_processing_attempts (
    organization_id, person_id, document_id, attempt_number, state,
    native_extraction_version, structuring_version, current_method,
    failure_code, failure_message, can_reprocess, retry_of_attempt_id,
    actor_auth_user_id, completed_at
  ) values (
    p_organization_id, p_person_id, p_document_id, next_attempt, p_failure_state,
    'not_completed', 'not_completed', 'failed', p_failure_code,
    left(coalesce(p_failure_message, 'Falha de processamento.'), 500), true,
    previous_attempt_id, actor_id, now()
  ) returning id into new_attempt_id;

  update public.documents
  set status = 'failed', review_state = 'not_ready', failure_category = p_failure_code,
      failure_reason = left(coalesce(p_failure_message, 'Falha de processamento.'), 500),
      failure_technical_message = p_failure_code, can_reprocess = true, processed_at = now()
  where organization_id = p_organization_id and id = p_document_id;

  update public.people set profile_state = 'processing_failed', updated_at = now()
  where organization_id = p_organization_id and id = p_person_id;

  update public.document_operations
  set processing_attempt_id = new_attempt_id, status = 'completed',
      result = jsonb_build_object('processing_attempt_id', new_attempt_id, 'attempt_number', next_attempt),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, error_code, metadata
  ) values (
    p_organization_id, p_person_id, p_document_id, new_attempt_id,
    actor_id, 'processing_failed', 'failure', p_failure_code,
    jsonb_build_object('operation_id', operation.id, 'attempt_number', next_attempt, 'state', p_failure_state)
  );

  return query select new_attempt_id, next_attempt, false;
end;
$$;

drop function if exists public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text);

create function public.persist_person_extraction(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_pages jsonb,
  p_draft jsonb,
  p_pages_native integer,
  p_pages_ocr integer,
  p_native_extraction_version text,
  p_ocr_version text,
  p_structuring_version text,
  p_draft_version text,
  p_idempotency_key text,
  p_retry_of_attempt_id uuid default null
)
returns table (processing_attempt_id uuid, structured boolean, attempt_number integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  operation public.document_operations;
  next_attempt integer;
  new_attempt_id uuid;
  is_structured boolean;
  source_is_manual boolean;
  page_record record;
  evidence_record record;
  fingerprint text;
  operation_type text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) = 0 then
    raise exception using errcode = '22023', message = 'at least one extracted page is required';
  end if;
  if jsonb_typeof(p_draft) <> 'object' then
    raise exception using errcode = '22023', message = 'a structured draft object is required';
  end if;

  perform 1 from public.documents document
  where document.organization_id = p_organization_id
    and document.person_id = p_person_id and document.id = p_document_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'document not found in organization'; end if;

  if p_retry_of_attempt_id is not null and not exists (
    select 1 from public.document_processing_attempts attempt
    where attempt.organization_id = p_organization_id
      and attempt.document_id = p_document_id and attempt.id = p_retry_of_attempt_id
  ) then
    raise exception using errcode = 'P0002', message = 'retry base attempt not found';
  end if;

  operation_type := case when p_retry_of_attempt_id is null then 'persist_extraction' else 'retry_processing' end;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_document_id::text, coalesce(p_retry_of_attempt_id::text, ''),
    p_native_extraction_version, coalesce(p_ocr_version, ''), p_structuring_version, p_draft_version,
    jsonb_array_length(p_pages)::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, p_person_id, p_document_id, operation_type,
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.processing_attempt_id is not null then
    return query
    select attempt.id, attempt.state <> 'failed_structuring'::public.processing_state,
      attempt.attempt_number, true
    from public.document_processing_attempts attempt
    where attempt.organization_id = p_organization_id and attempt.id = operation.processing_attempt_id;
    return;
  end if;

  select coalesce(max(attempt.attempt_number), 0) + 1 into next_attempt
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = p_document_id;

  insert into public.document_processing_attempts (
    organization_id, person_id, document_id, attempt_number, state,
    native_extraction_version, ocr_version, structuring_version, current_method,
    pages_native, pages_ocr, useful_character_count, retry_of_attempt_id, actor_auth_user_id
  ) values (
    p_organization_id, p_person_id, p_document_id, next_attempt, 'structuring',
    p_native_extraction_version, p_ocr_version, p_structuring_version,
    'deterministic_structuring', p_pages_native, p_pages_ocr,
    coalesce((select sum((page.value ->> 'useful_character_count')::integer)
      from jsonb_array_elements(p_pages) page), 0),
    p_retry_of_attempt_id, actor_id
  ) returning id into new_attempt_id;

  for page_record in
    select * from jsonb_to_recordset(p_pages) as page(
      page_number integer, text_content text, origin text,
      useful_character_count integer, method text, method_version text
    )
  loop
    if page_record.page_number is null or page_record.page_number < 1
      or page_record.text_content is null
      or page_record.origin not in ('native_pdf', 'ocr', 'manual_text') then
      raise exception using errcode = '22023', message = 'invalid extracted page contract';
    end if;
    insert into public.document_page_extractions (
      organization_id, person_id, document_id, processing_attempt_id,
      page_number, origin, text_content, useful_character_count, method, method_version
    ) values (
      p_organization_id, p_person_id, p_document_id, new_attempt_id,
      page_record.page_number, page_record.origin::public.page_extraction_origin,
      page_record.text_content, coalesce(page_record.useful_character_count, 0),
      coalesce(page_record.method, 'unknown'), coalesce(page_record.method_version, 'unknown')
    );
  end loop;

  is_structured := jsonb_array_length(coalesce(p_draft -> 'experiences', '[]'::jsonb)) > 0;
  insert into public.extraction_drafts (
    organization_id, person_id, document_id, processing_attempt_id,
    draft_version, validation_status, identified_fields, uncertainties,
    not_identified, validated_at
  ) values (
    p_organization_id, p_person_id, p_document_id, new_attempt_id,
    p_draft_version, case when is_structured then 'valid' else 'insufficient' end,
    p_draft, coalesce(p_draft -> 'uncertainties', '[]'::jsonb),
    coalesce(p_draft -> 'notIdentified', '[]'::jsonb), now()
  );

  for evidence_record in
    select 'experience'::text as kind,
      concat_ws(' em ', item ->> 'role', item ->> 'organization') as fact,
      item ->> 'evidenceText' as quoted_text,
      (item ->> 'page')::integer as source_page, ordinal
    from jsonb_array_elements(coalesce(p_draft -> 'experiences', '[]'::jsonb))
      with ordinality as source(item, ordinal)
    union all
    select 'education'::text, item ->> 'course', item ->> 'evidenceText',
      (item ->> 'page')::integer, ordinal
    from jsonb_array_elements(coalesce(p_draft -> 'education', '[]'::jsonb))
      with ordinality as source(item, ordinal)
  loop
    insert into public.evidence (
      organization_id, person_id, document_id, kind, fact, source_page,
      source_block, quoted_text, extraction_version, processing_attempt_id,
      extraction_origin, method, method_version
    )
    select p_organization_id, p_person_id, p_document_id, evidence_record.kind,
      evidence_record.fact, evidence_record.source_page,
      format('page-%s-fact-%s', evidence_record.source_page, evidence_record.ordinal),
      evidence_record.quoted_text, p_structuring_version, new_attempt_id,
      page.origin, 'deterministic-regex', p_structuring_version
    from public.document_page_extractions page
    where page.organization_id = p_organization_id
      and page.processing_attempt_id = new_attempt_id
      and page.page_number = evidence_record.source_page;
  end loop;

  select exists (
    select 1 from public.document_page_extractions page
    where page.organization_id = p_organization_id
      and page.processing_attempt_id = new_attempt_id and page.origin = 'manual_text'
  ) into source_is_manual;

  update public.document_processing_attempts
  set state = case when is_structured then 'structured'::public.processing_state else 'failed_structuring'::public.processing_state end,
      current_method = case when is_structured then 'awaiting_human_review' else 'manual_review_required' end,
      failure_code = case when is_structured then null else 'insufficient_structured_facts' end,
      failure_message = case when is_structured then null else 'A fonte foi preservada, mas não contém experiência estruturável suficiente.' end,
      can_reprocess = true, completed_at = now()
  where organization_id = p_organization_id and id = new_attempt_id;

  update public.documents
  set status = case when is_structured then 'ready_for_review'::public.document_status else 'failed'::public.document_status end,
      review_state = case when is_structured then 'ready_for_review'::public.document_review_state else 'not_ready'::public.document_review_state end,
      failure_category = case when is_structured then null else 'insufficient_extraction' end,
      failure_reason = case when is_structured then null else 'A extração foi preservada, mas é insuficiente para revisão.' end,
      failure_technical_message = case when is_structured then null else 'insufficient_structured_facts' end,
      can_reprocess = true, processed_at = now()
  where organization_id = p_organization_id and id = p_document_id;

  update public.people
  set profile_state = case when is_structured then 'building'::public.person_profile_state else 'requires_attention'::public.person_profile_state end,
      latest_source_type = case when source_is_manual then 'manual_text'::public.document_source_type else 'resume_pdf'::public.document_source_type end,
      latest_source_at = now(), updated_at = now()
  where organization_id = p_organization_id and id = p_person_id;

  update public.document_operations
  set processing_attempt_id = new_attempt_id, status = 'completed',
      result = jsonb_build_object('processing_attempt_id', new_attempt_id, 'attempt_number', next_attempt, 'structured', is_structured),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, error_code, metadata
  ) values (
    p_organization_id, p_person_id, p_document_id, new_attempt_id,
    actor_id, case when p_retry_of_attempt_id is null then 'extraction_persisted' else 'processing_retried' end,
    case when is_structured then 'success' else 'failure' end,
    case when is_structured then null else 'insufficient_structured_facts' end,
    jsonb_build_object('operation_id', operation.id, 'attempt_number', next_attempt,
      'pages_native', p_pages_native, 'pages_ocr', p_pages_ocr, 'structured', is_structured)
  );

  return query select new_attempt_id, is_structured, next_attempt, false;
end;
$$;

create or replace function public.start_profile_review(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_processing_attempt_id uuid,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  operation public.document_operations;
  draft_data jsonb;
  new_review_id uuid;
  current_profile_id uuid;
  current_profile_version integer;
  existing_review public.profile_reviews;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform 1 from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.person_id = p_person_id
    and attempt.document_id = p_document_id and attempt.id = p_processing_attempt_id
    and attempt.state in ('structured', 'profile_ready')
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'reviewable processing attempt not found'; end if;

  select extraction.identified_fields into draft_data
  from public.extraction_drafts extraction
  where extraction.organization_id = p_organization_id
    and extraction.processing_attempt_id = p_processing_attempt_id
    and extraction.validation_status = 'valid';
  if draft_data is null then raise exception using errcode = 'P0002', message = 'valid extraction draft not found'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_document_id::text, p_processing_attempt_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, p_person_id, p_document_id, 'start_review',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.review_id is not null then
    return query select review.id, review.lock_version, true
    from public.profile_reviews review
    where review.organization_id = p_organization_id and review.id = operation.review_id;
    return;
  end if;

  select * into existing_review from public.profile_reviews review
  where review.organization_id = p_organization_id
    and review.processing_attempt_id = p_processing_attempt_id and review.state = 'draft'
  for update;
  if found then
    update public.document_operations
    set review_id = existing_review.id, status = 'completed',
        result = jsonb_build_object('review_id', existing_review.id, 'lock_version', existing_review.lock_version),
        completed_at = now()
    where id = operation.id;
    return query select existing_review.id, existing_review.lock_version, true;
    return;
  end if;

  select profile.id, profile.profile_version into current_profile_id, current_profile_version
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id and profile.person_id = p_person_id
    and profile.superseded_at is null
  for update;

  insert into public.profile_reviews (
    organization_id, person_id, document_id, processing_attempt_id,
    base_profile_id, base_profile_version, extracted_data, reviewed_data,
    started_by_auth_user_id, last_edited_by_auth_user_id
  ) values (
    p_organization_id, p_person_id, p_document_id, p_processing_attempt_id,
    current_profile_id, current_profile_version, draft_data, draft_data,
    actor_id, actor_id
  ) returning id into new_review_id;

  insert into public.profile_review_revisions (
    organization_id, review_id, revision_number, reviewed_data,
    change_reason, actor_auth_user_id
  ) values (p_organization_id, new_review_id, 1, draft_data, 'Revisão iniciada', actor_id);

  update public.documents set review_state = 'in_review', status = 'in_review'
  where organization_id = p_organization_id and id = p_document_id;

  update public.document_operations
  set review_id = new_review_id, status = 'completed',
      result = jsonb_build_object('review_id', new_review_id, 'lock_version', 1), completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_person_id, p_document_id, p_processing_attempt_id,
    actor_id, 'profile_review_started', 'success', jsonb_build_object('operation_id', operation.id, 'review_id', new_review_id)
  );
  return query select new_review_id, 1, false;
end;
$$;

create or replace function public.save_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_reviewed_data jsonb,
  p_reason text,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  operation public.document_operations;
  revision_id uuid;
  next_revision integer;
  next_lock integer;
  field_name text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(p_reviewed_data) <> 'object' then
    raise exception using errcode = '22023', message = 'reviewed data must be an object';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'review reason is required';
  end if;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_review_id::text, p_expected_lock_version::text,
    pg_catalog.encode(extensions.digest(p_reviewed_data::text, 'sha256'), 'hex'), p_reason), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, review.person_id, review.document_id, 'save_review_draft',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.review_id is not null then
    return query select item.id, item.lock_version, true
    from public.profile_reviews item
    where item.organization_id = p_organization_id and item.id = operation.review_id;
    return;
  end if;
  if review.state <> 'draft' then raise exception using errcode = '55000', message = 'review is no longer editable'; end if;
  if review.lock_version <> p_expected_lock_version then
    raise exception using errcode = 'P0001', message = 'review_conflict';
  end if;

  next_revision := review.lock_version + 1;
  next_lock := review.lock_version + 1;
  insert into public.profile_review_revisions (
    organization_id, review_id, revision_number, reviewed_data,
    change_reason, actor_auth_user_id
  ) values (
    p_organization_id, p_review_id, next_revision, p_reviewed_data, btrim(p_reason), actor_id
  ) returning id into revision_id;

  foreach field_name in array array[
    'summary', 'experiences', 'education', 'certifications',
    'languages', 'competencies', 'uncertainties', 'notIdentified'
  ]
  loop
    if coalesce(review.reviewed_data -> field_name, 'null'::jsonb)
      is distinct from coalesce(p_reviewed_data -> field_name, 'null'::jsonb) then
      insert into public.profile_review_changes (
        organization_id, review_id, review_revision_id, field_path,
        extracted_value, previous_value, reviewed_value, reason,
        actor_auth_user_id
      ) values (
        p_organization_id, p_review_id, revision_id, field_name,
        review.extracted_data -> field_name, review.reviewed_data -> field_name,
        p_reviewed_data -> field_name, btrim(p_reason), actor_id
      );
    end if;
  end loop;

  update public.profile_reviews
  set reviewed_data = p_reviewed_data, lock_version = next_lock,
      last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;

  update public.document_operations
  set review_id = p_review_id, status = 'completed',
      result = jsonb_build_object('review_id', p_review_id, 'lock_version', next_lock), completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'profile_review_saved', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', p_review_id, 'revision_number', next_revision)
  );
  return query select p_review_id, next_lock, false;
end;
$$;

create or replace function public.approve_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_idempotency_key text
)
returns table (review_id uuid, profile_id uuid, profile_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  operation public.document_operations;
  current_profile_id uuid;
  current_profile_version integer;
  latest_attempt_id uuid;
  new_profile_id uuid;
  next_profile_version integer;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_review_id::text, p_expected_lock_version::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, review.person_id, review.document_id, 'approve_review',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.profile_id is not null then
    return query select review.id, profile.id, profile.profile_version, true
    from public.professional_profiles profile
    where profile.organization_id = p_organization_id and profile.id = operation.profile_id;
    return;
  end if;
  if review.state <> 'draft' then raise exception using errcode = '55000', message = 'review is no longer approvable'; end if;
  if review.lock_version <> p_expected_lock_version then
    raise exception using errcode = 'P0001', message = 'review_conflict';
  end if;

  perform 1 from public.people person
  where person.organization_id = p_organization_id and person.id = review.person_id
  for update;

  select profile.id, profile.profile_version into current_profile_id, current_profile_version
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id and profile.person_id = review.person_id
    and profile.superseded_at is null
  for update;
  if current_profile_id is distinct from review.base_profile_id
    or current_profile_version is distinct from review.base_profile_version then
    raise exception using errcode = 'P0001', message = 'profile_base_conflict';
  end if;

  select attempt.id into latest_attempt_id
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = review.document_id
  order by attempt.attempt_number desc limit 1;
  if latest_attempt_id is distinct from review.processing_attempt_id then
    raise exception using errcode = 'P0001', message = 'processing_base_conflict';
  end if;

  if not exists (
    select 1 from public.evidence evidence
    where evidence.organization_id = p_organization_id
      and evidence.processing_attempt_id = review.processing_attempt_id
  ) then
    raise exception using errcode = '23514', message = 'material evidence is required before approval';
  end if;

  select coalesce(max(profile.profile_version), 0) + 1 into next_profile_version
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id and profile.person_id = review.person_id;

  update public.professional_profiles
  set superseded_at = now()
  where organization_id = p_organization_id and person_id = review.person_id and superseded_at is null;

  insert into public.professional_profiles (
    organization_id, person_id, source_document_id, profile_data,
    uncertainties, not_identified, extraction_version, inference_version,
    embedding_version, prompt_version, model_version, processing_attempt_id,
    profile_version, review_status, review_id, approved_by_auth_user_id,
    approved_at, base_profile_id
  ) values (
    p_organization_id, review.person_id, review.document_id, review.reviewed_data,
    coalesce(review.reviewed_data -> 'uncertainties', '[]'::jsonb),
    coalesce(review.reviewed_data -> 'notIdentified', '[]'::jsonb),
    'm2c-reviewed-v1', 'none', 'none', 'none', 'human-reviewed-deterministic',
    review.processing_attempt_id, next_profile_version, 'approved', review.id,
    actor_id, now(), review.base_profile_id
  ) returning id into new_profile_id;

  update public.profile_reviews
  set state = 'approved', approved_profile_id = new_profile_id,
      approved_by_auth_user_id = actor_id, approved_at = now(),
      last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;

  update public.document_processing_attempts
  set state = 'completed', current_method = 'human_review_approved', completed_at = now()
  where organization_id = p_organization_id and id = review.processing_attempt_id;
  update public.documents
  set status = 'approved', review_state = 'approved', processed_at = now(),
      failure_category = null, failure_reason = null, failure_technical_message = null
  where organization_id = p_organization_id and id = review.document_id;
  update public.people set profile_state = 'generated', updated_at = now()
  where organization_id = p_organization_id and id = review.person_id;

  update public.document_operations
  set review_id = p_review_id, profile_id = new_profile_id, status = 'completed',
      result = jsonb_build_object('review_id', p_review_id, 'profile_id', new_profile_id, 'profile_version', next_profile_version),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'profile_review_approved', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', p_review_id,
      'profile_id', new_profile_id, 'profile_version', next_profile_version)
  );
  return query select p_review_id, new_profile_id, next_profile_version, false;
end;
$$;

revoke all on function public.register_person_document(uuid, uuid, public.document_source_type, text, text, text, text, bigint, integer, text, text) from public, anon;
revoke all on function public.record_document_failure(uuid, uuid, uuid, public.processing_state, text, text, text) from public, anon;
revoke all on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.start_profile_review(uuid, uuid, uuid, uuid, text) from public, anon;
revoke all on function public.save_profile_review(uuid, uuid, integer, jsonb, text, text) from public, anon;
revoke all on function public.approve_profile_review(uuid, uuid, integer, text) from public, anon;

grant execute on function public.register_person_document(uuid, uuid, public.document_source_type, text, text, text, text, bigint, integer, text, text) to authenticated;
grant execute on function public.record_document_failure(uuid, uuid, uuid, public.processing_state, text, text, text) to authenticated;
grant execute on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.start_profile_review(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.save_profile_review(uuid, uuid, integer, jsonb, text, text) to authenticated;
grant execute on function public.approve_profile_review(uuid, uuid, integer, text) to authenticated;
