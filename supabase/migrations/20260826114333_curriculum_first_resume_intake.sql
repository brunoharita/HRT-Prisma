create type public.resume_intake_status as enum (
  'file_received',
  'extracting_identity',
  'needs_human_identity',
  'needs_duplicate_resolution',
  'ready_to_resolve',
  'processing',
  'ready_for_review',
  'completed',
  'failed'
);

create type public.resume_identity_resolution as enum (
  'created_new_person',
  'linked_existing_person',
  'needs_human_identity',
  'needs_duplicate_resolution',
  'failed'
);

create table public.resume_intakes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  identity_fingerprint text check (identity_fingerprint is null or char_length(identity_fingerprint) = 64),
  resolution_idempotency_key text check (resolution_idempotency_key is null or char_length(resolution_idempotency_key) between 16 and 160),
  resolution_fingerprint text check (resolution_fingerprint is null or char_length(resolution_fingerprint) = 64),
  status public.resume_intake_status not null default 'file_received',
  source_type public.document_source_type not null default 'resume_pdf',
  filename text not null,
  declared_mime_type text not null,
  validated_mime_type text not null,
  storage_bucket text not null default 'person-documents' check (storage_bucket = 'person-documents'),
  storage_path text not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size between 1 and 15728640),
  page_count integer not null check (page_count between 1 and 200),
  extraction_version text not null,
  detected_name text,
  detected_email text,
  detected_phone text,
  normalized_name text,
  normalized_email text,
  normalized_phone text,
  resolved_person_id uuid,
  resolved_document_id uuid,
  resolution_type public.resume_identity_resolution,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  resolved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  unique (organization_id, storage_path),
  foreign key (organization_id, resolved_person_id)
    references public.people(organization_id, id) on delete restrict,
  foreign key (organization_id, resolved_document_id)
    references public.documents(organization_id, id) on delete restrict,
  check (
    (resolved_at is null and resolved_by_auth_user_id is null and resolved_document_id is null)
    or
    (resolved_at is not null and resolved_by_auth_user_id is not null and resolved_person_id is not null and resolved_document_id is not null
      and resolution_type in ('created_new_person', 'linked_existing_person'))
  )
);

create index resume_intakes_status_idx
  on public.resume_intakes (organization_id, status, created_at desc);
create index person_private_data_normalized_email_idx
  on public.person_private_data (organization_id, lower(btrim(email))) where email is not null;
create index person_private_data_normalized_phone_idx
  on public.person_private_data (organization_id, regexp_replace(coalesce(phone_e164, phone), '[^0-9]', '', 'g'))
  where coalesce(phone_e164, phone) is not null;
create index people_normalized_name_idx
  on public.people (organization_id, lower(regexp_replace(btrim(full_name), '[[:space:]]+', ' ', 'g')));

create trigger resume_intakes_touch_updated_at
before update on public.resume_intakes
for each row execute function private.touch_updated_at();

alter table public.resume_intakes enable row level security;

create policy resume_intakes_select on public.resume_intakes
for select to authenticated
using ((select private.has_org_role(
  organization_id,
  array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));

revoke all on table public.resume_intakes from anon, authenticated;
grant select on table public.resume_intakes to authenticated;

create or replace function public.start_resume_intake(
  p_organization_id uuid,
  p_filename text,
  p_declared_mime_type text,
  p_validated_mime_type text,
  p_checksum_sha256 text,
  p_byte_size bigint,
  p_page_count integer,
  p_extraction_version text,
  p_idempotency_key text
)
returns table (
  intake_id uuid,
  storage_path text,
  intake_status public.resume_intake_status,
  resolved_person_id uuid,
  resolved_document_id uuid,
  document_version integer,
  resolution_type public.resume_identity_resolution,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  fingerprint text;
  new_intake_id uuid := gen_random_uuid();
  safe_filename text;
  claimed public.resume_intakes;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_filename is null or btrim(p_filename) = '' then
    raise exception using errcode = '22023', message = 'filename is required';
  end if;
  if p_declared_mime_type <> 'application/pdf' or p_validated_mime_type <> 'application/pdf' then
    raise exception using errcode = '22023', message = 'only validated PDF intake is supported';
  end if;
  if p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid sha256 checksum';
  end if;
  if p_byte_size is null or p_byte_size not between 1 and 15728640 then
    raise exception using errcode = '22023', message = 'invalid document size';
  end if;
  if p_page_count is null or p_page_count not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid page count';
  end if;
  if char_length(p_idempotency_key) not between 16 and 160 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_filename, p_declared_mime_type,
    p_validated_mime_type, p_checksum_sha256, p_byte_size::text, p_page_count::text, p_extraction_version), 'sha256'), 'hex');
  safe_filename := left(regexp_replace(p_filename, '[^a-zA-Z0-9._-]+', '-', 'g'), 120);
  if safe_filename = '' then safe_filename := 'curriculo.pdf'; end if;

  insert into public.resume_intakes (
    id, organization_id, idempotency_key, request_fingerprint, filename,
    declared_mime_type, validated_mime_type, storage_path, checksum_sha256,
    byte_size, page_count, extraction_version, actor_auth_user_id
  ) values (
    new_intake_id, p_organization_id, p_idempotency_key, fingerprint, p_filename,
    p_declared_mime_type, p_validated_mime_type,
    concat(p_organization_id, '/intakes/', new_intake_id, '/', safe_filename),
    p_checksum_sha256, p_byte_size, p_page_count, p_extraction_version, actor_id
  ) on conflict (organization_id, idempotency_key) do nothing;

  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.idempotency_key = p_idempotency_key
  for update;
  if claimed.request_fingerprint <> fingerprint then
    raise exception using errcode = '23505', message = 'idempotency key was already used for another intake';
  end if;

  if claimed.id = new_intake_id then
    insert into public.person_ingestion_events (
      organization_id, actor_auth_user_id, event_type, result, metadata
    ) values (
      p_organization_id, actor_id, 'resume_intake_started', 'success',
      jsonb_build_object('intake_id', claimed.id, 'byte_size', p_byte_size, 'page_count', p_page_count)
    );
  end if;

  return query
  select claimed.id, claimed.storage_path, claimed.status,
    claimed.resolved_person_id, claimed.resolved_document_id, document.document_version,
    claimed.resolution_type, claimed.id <> new_intake_id
  from (select 1) marker
  left join public.documents document
    on document.organization_id = claimed.organization_id and document.id = claimed.resolved_document_id;
end;
$$;

create or replace function public.identify_resume_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_detected_name text,
  p_detected_email text,
  p_detected_phone text
)
returns table (
  intake_status public.resume_intake_status,
  identity_result public.resume_identity_resolution,
  candidates jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  claimed public.resume_intakes;
  clean_name text := nullif(btrim(p_detected_name), '');
  clean_email text := nullif(lower(btrim(p_detected_email)), '');
  clean_phone text := nullif(regexp_replace(coalesce(p_detected_phone, ''), '[^0-9]', '', 'g'), '');
  normalized_name_value text;
  fingerprint text;
  matches jsonb := '[]'::jsonb;
  next_status public.resume_intake_status;
  next_result public.resume_identity_resolution;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.id = p_intake_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'resume intake not found in organization'; end if;
  if claimed.resolved_at is not null then
    raise exception using errcode = '23514', message = 'resume intake is already resolved';
  end if;
  if clean_name is not null and char_length(clean_name) > 180 then
    raise exception using errcode = '22023', message = 'detected name is too long';
  end if;
  if clean_email is not null and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    clean_email := null;
  end if;
  if clean_phone is not null and char_length(clean_phone) in (10, 11) then
    clean_phone := concat('55', clean_phone);
  end if;
  if clean_phone is not null and char_length(clean_phone) not between 10 and 15 then
    clean_phone := null;
  end if;
  normalized_name_value := case when clean_name is null then null
    else lower(regexp_replace(clean_name, '[[:space:]]+', ' ', 'g')) end;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', coalesce(normalized_name_value, ''),
    coalesce(clean_email, ''), coalesce(clean_phone, '')), 'sha256'), 'hex');

  if clean_name is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'person_id', match.person_id,
      'full_name', match.full_name,
      'email', match.email,
      'phone', match.phone,
      'reasons', match.reasons,
      'strong', match.strong
    ) order by match.strong desc, match.full_name), '[]'::jsonb)
    into matches
    from (
      select person.id as person_id, person.full_name, private_data.email,
        coalesce(private_data.phone_e164, private_data.phone) as phone,
        array_remove(array[
          case when clean_email is not null and lower(btrim(private_data.email)) = clean_email then 'same_email' end,
          case when clean_phone is not null and regexp_replace(coalesce(private_data.phone_e164, private_data.phone), '[^0-9]', '', 'g') = clean_phone then 'same_phone' end,
          case when lower(regexp_replace(btrim(person.full_name), '[[:space:]]+', ' ', 'g')) = normalized_name_value then 'same_name' end
        ], null) as reasons,
        (
          (clean_email is not null and lower(btrim(private_data.email)) = clean_email)
          or (clean_phone is not null and regexp_replace(coalesce(private_data.phone_e164, private_data.phone), '[^0-9]', '', 'g') = clean_phone)
        ) as strong
      from public.people person
      left join public.person_private_data private_data
        on private_data.organization_id = person.organization_id and private_data.person_id = person.id
      where person.organization_id = p_organization_id
        and (
          (clean_email is not null and lower(btrim(private_data.email)) = clean_email)
          or (clean_phone is not null and regexp_replace(coalesce(private_data.phone_e164, private_data.phone), '[^0-9]', '', 'g') = clean_phone)
          or lower(regexp_replace(btrim(person.full_name), '[[:space:]]+', ' ', 'g')) = normalized_name_value
        )
      order by strong desc, person.updated_at desc
      limit 8
    ) match;
  end if;

  if clean_name is null or (clean_email is null and clean_phone is null) then
    next_status := 'needs_human_identity';
    next_result := 'needs_human_identity';
  elsif jsonb_array_length(matches) > 0 then
    next_status := 'needs_duplicate_resolution';
    next_result := 'needs_duplicate_resolution';
  else
    next_status := 'ready_to_resolve';
    next_result := null;
  end if;

  update public.resume_intakes set
    status = next_status,
    identity_fingerprint = fingerprint,
    detected_name = clean_name,
    detected_email = clean_email,
    detected_phone = case when clean_phone is null then null else concat('+', clean_phone) end,
    normalized_name = normalized_name_value,
    normalized_email = clean_email,
    normalized_phone = clean_phone,
    resolution_type = next_result,
    error_code = null,
    error_message = null
  where organization_id = p_organization_id and id = p_intake_id;

  insert into public.person_ingestion_events (
    organization_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, actor_id,
    case when next_status = 'needs_human_identity' then 'resume_identity_insufficient'
      when next_status = 'needs_duplicate_resolution' then 'resume_duplicate_possible'
      else 'resume_identity_extracted' end,
    'success', jsonb_build_object('intake_id', p_intake_id, 'candidate_count', jsonb_array_length(matches))
  );

  return query select next_status, next_result, matches;
end;
$$;

create or replace function public.resolve_resume_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_resolution_action text,
  p_existing_person_id uuid,
  p_idempotency_key text
)
returns table (
  person_id uuid,
  document_id uuid,
  document_version integer,
  resolution_type public.resume_identity_resolution,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  claimed public.resume_intakes;
  resolved_person uuid;
  new_document uuid;
  next_version integer;
  resolved_type public.resume_identity_resolution;
  fingerprint text;
  existing_operation public.document_operations;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_resolution_action not in ('create_new_person', 'link_existing_person') then
    raise exception using errcode = '22023', message = 'invalid identity resolution action';
  end if;
  if char_length(p_idempotency_key) not between 16 and 160 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;

  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.id = p_intake_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'resume intake not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_intake_id::text, p_resolution_action,
    coalesce(p_existing_person_id::text, ''), coalesce(claimed.identity_fingerprint, '')), 'sha256'), 'hex');
  if claimed.resolved_at is not null then
    if claimed.resolution_idempotency_key <> p_idempotency_key or claimed.resolution_fingerprint <> fingerprint then
      raise exception using errcode = '23505', message = 'resume intake was already resolved by another decision';
    end if;
    return query select claimed.resolved_person_id, claimed.resolved_document_id, document.document_version,
      claimed.resolution_type, true
    from public.documents document
    where document.organization_id = p_organization_id and document.id = claimed.resolved_document_id;
    return;
  end if;
  if claimed.status not in ('ready_to_resolve', 'needs_duplicate_resolution') then
    raise exception using errcode = '23514', message = 'resume intake identity is not ready for resolution';
  end if;
  if claimed.detected_name is null or (claimed.normalized_email is null and claimed.normalized_phone is null) then
    raise exception using errcode = '23514', message = 'minimum identity is required before creating a person';
  end if;

  if p_resolution_action = 'link_existing_person' then
    if p_existing_person_id is null then
      raise exception using errcode = '22023', message = 'existing person is required for link resolution';
    end if;
    select person.id into resolved_person from public.people person
    where person.organization_id = p_organization_id and person.id = p_existing_person_id
    for update;
    if resolved_person is null then raise exception using errcode = 'P0002', message = 'person not found in organization'; end if;
    resolved_type := 'linked_existing_person';
  else
    insert into public.people (organization_id, full_name, lifecycle, profile_state, latest_source_type, latest_source_at)
    values (p_organization_id, claimed.detected_name, 'candidate', 'building', 'resume_pdf', now())
    returning id into resolved_person;
    insert into public.person_private_data (
      organization_id, person_id, email, phone, phone_e164
    ) values (
      p_organization_id, resolved_person, claimed.detected_email, claimed.detected_phone, claimed.detected_phone
    );
    resolved_type := 'created_new_person';
  end if;

  perform 1 from public.people person
  where person.organization_id = p_organization_id and person.id = resolved_person
  for update;
  select coalesce(max(document.document_version), 0) + 1 into next_version
  from public.documents document
  where document.organization_id = p_organization_id and document.person_id = resolved_person;

  new_document := gen_random_uuid();
  insert into public.documents (
    id, organization_id, person_id, filename, original_filename, media_type,
    declared_mime_type, validated_mime_type, storage_path, storage_bucket,
    checksum_sha256, byte_size, page_count, status, review_state,
    extraction_version, source_type, actor_auth_user_id, document_version, can_reprocess
  ) values (
    new_document, p_organization_id, resolved_person, claimed.filename, claimed.filename,
    claimed.validated_mime_type, claimed.declared_mime_type, claimed.validated_mime_type,
    claimed.storage_path, claimed.storage_bucket, claimed.checksum_sha256, claimed.byte_size,
    claimed.page_count, 'received', 'not_ready', claimed.extraction_version,
    claimed.source_type, actor_id, next_version, true
  );

  insert into public.document_operations (
    organization_id, person_id, document_id, operation_type, idempotency_key,
    request_fingerprint, status, result, actor_auth_user_id, completed_at
  ) values (
    p_organization_id, resolved_person, new_document, 'register_document', p_idempotency_key,
    fingerprint, 'completed', jsonb_build_object('intake_id', p_intake_id, 'document_id', new_document,
      'document_version', next_version, 'resolution_type', resolved_type), actor_id, now()
  ) returning * into existing_operation;

  update public.resume_intakes set
    status = 'processing', resolved_person_id = resolved_person, resolved_document_id = new_document,
    resolution_type = resolved_type, resolution_idempotency_key = p_idempotency_key,
    resolution_fingerprint = fingerprint, resolved_by_auth_user_id = actor_id, resolved_at = now()
  where organization_id = p_organization_id and id = p_intake_id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, resolved_person, new_document, actor_id,
    case when resolved_type = 'created_new_person' then 'person_created_from_resume' else 'resume_linked_to_existing_person' end,
    'success', jsonb_build_object('intake_id', p_intake_id, 'operation_id', existing_operation.id,
      'document_version', next_version, 'resolution_type', resolved_type)
  );

  return query select resolved_person, new_document, next_version, resolved_type, false;
end;
$$;

create or replace function public.complete_resume_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_document_id uuid
)
returns public.resume_intake_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  claimed public.resume_intakes;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.id = p_intake_id
  for update;
  if not found or claimed.resolved_document_id is distinct from p_document_id then
    raise exception using errcode = 'P0002', message = 'resolved resume intake document not found';
  end if;
  if not exists (
    select 1 from public.documents document
    where document.organization_id = p_organization_id and document.id = p_document_id
      and document.person_id = claimed.resolved_person_id and document.status = 'ready_for_review'
  ) then
    raise exception using errcode = '23514', message = 'document is not ready for review';
  end if;
  update public.resume_intakes set status = 'ready_for_review'
  where organization_id = p_organization_id and id = p_intake_id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, claimed.resolved_person_id, p_document_id, actor_id,
    'resume_intake_ready_for_review', 'success', jsonb_build_object('intake_id', p_intake_id)
  );
  return 'ready_for_review';
end;
$$;

create or replace function public.fail_resume_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_error_code text,
  p_error_message text
)
returns public.resume_intake_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  claimed public.resume_intakes;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_error_code !~ '^[a-z0-9_]{3,80}$' then
    raise exception using errcode = '22023', message = 'invalid intake failure code';
  end if;
  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.id = p_intake_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'resume intake not found in organization'; end if;
  if claimed.status in ('ready_for_review', 'completed') then
    raise exception using errcode = '23514', message = 'completed resume intake cannot be failed';
  end if;
  update public.resume_intakes set status = 'failed',
    resolution_type = case when resolved_at is null then 'failed'::public.resume_identity_resolution else resolution_type end,
    error_code = p_error_code, error_message = left(coalesce(p_error_message, 'Falha na importação.'), 300)
  where organization_id = p_organization_id and id = p_intake_id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id, event_type, result, error_code, metadata
  ) values (
    p_organization_id, claimed.resolved_person_id, claimed.resolved_document_id, actor_id,
    'resume_intake_failed', 'failure', p_error_code, jsonb_build_object('intake_id', p_intake_id)
  );
  return 'failed';
end;
$$;

revoke all on function public.start_resume_intake(uuid, text, text, text, text, bigint, integer, text, text) from public, anon;
revoke all on function public.identify_resume_intake(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.resolve_resume_intake(uuid, uuid, text, uuid, text) from public, anon;
revoke all on function public.complete_resume_intake(uuid, uuid, uuid) from public, anon;
revoke all on function public.fail_resume_intake(uuid, uuid, text, text) from public, anon;
grant execute on function public.start_resume_intake(uuid, text, text, text, text, bigint, integer, text, text) to authenticated;
grant execute on function public.identify_resume_intake(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.resolve_resume_intake(uuid, uuid, text, uuid, text) to authenticated;
grant execute on function public.complete_resume_intake(uuid, uuid, uuid) to authenticated;
grant execute on function public.fail_resume_intake(uuid, uuid, text, text) to authenticated;
