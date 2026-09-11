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
  if p_resolution_action = 'link_existing_person' then
    if claimed.status not in ('ready_to_resolve', 'needs_duplicate_resolution', 'needs_human_identity') then
      raise exception using errcode = '23514', message = 'resume intake identity is not ready for resolution';
    end if;
    if claimed.detected_name is null then
      raise exception using errcode = '23514', message = 'detected name is required before linking a resume';
    end if;
    if p_existing_person_id is null then
      raise exception using errcode = '22023', message = 'existing person is required for link resolution';
    end if;
    select person.id into resolved_person from public.people person
    where person.organization_id = p_organization_id and person.id = p_existing_person_id
    for update;
    if resolved_person is null then raise exception using errcode = 'P0002', message = 'person not found in organization'; end if;
    resolved_type := 'linked_existing_person';
  else
    if claimed.status not in ('ready_to_resolve', 'needs_duplicate_resolution') then
      raise exception using errcode = '23514', message = 'resume intake identity is not ready for resolution';
    end if;
    if claimed.detected_name is null or (claimed.normalized_email is null and claimed.normalized_phone is null) then
      raise exception using errcode = '23514', message = 'minimum identity is required before creating a person';
    end if;
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

comment on function public.resolve_resume_intake(uuid, uuid, text, uuid, text) is
  'Resolves a resume intake. Human-confirmed linking accepts a name-only source in the identity-review state; creating a person still requires name plus email or phone.';
