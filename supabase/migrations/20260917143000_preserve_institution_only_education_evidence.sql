begin;

-- The review contract accepts education identified by course or institution.
-- Keep evidence.fact source-grounded and non-null for either valid shape.
create or replace function private.persist_person_extraction(
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
    select 'education'::text,
      coalesce(nullif(btrim(item ->> 'course'), ''), nullif(btrim(item ->> 'institution'), '')),
      item ->> 'evidenceText',
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
      failure_message = case when is_structured then null else 'O conteúdo foi recuperado, mas nenhuma experiência profissional foi reconhecida automaticamente.' end,
      can_reprocess = true, completed_at = now()
  where organization_id = p_organization_id and id = new_attempt_id;

  update public.documents
  set status = 'ready_for_review'::public.document_status,
      review_state = 'ready_for_review'::public.document_review_state,
      failure_category = case when is_structured then null else 'incomplete_recognition' end,
      failure_reason = case when is_structured then null else 'O conteúdo foi recuperado e precisa de complementação humana.' end,
      failure_technical_message = case when is_structured then null else 'insufficient_structured_facts' end,
      can_reprocess = true, processed_at = now()
  where organization_id = p_organization_id and id = p_document_id;

  update public.people
  set profile_state = 'building'::public.person_profile_state,
      latest_source_type = case when source_is_manual then 'manual_text'::public.document_source_type else 'resume_pdf'::public.document_source_type end,
      latest_source_at = now(), updated_at = now()
  where organization_id = p_organization_id and id = p_person_id;

  update public.document_operations
  set processing_attempt_id = new_attempt_id, status = 'completed',
      result = jsonb_build_object('processing_attempt_id', new_attempt_id, 'attempt_number', next_attempt,
        'structured', is_structured, 'reviewable', true),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_person_id, p_document_id, new_attempt_id,
    actor_id, case when p_retry_of_attempt_id is null then 'extraction_persisted' else 'processing_retried' end,
    'success',
    jsonb_build_object('operation_id', operation.id, 'attempt_number', next_attempt,
      'pages_native', p_pages_native, 'pages_ocr', p_pages_ocr, 'structured', is_structured,
      'reviewable', true, 'recognition_status', case when is_structured then 'complete' else 'partial' end)
  );

  return query select new_attempt_id, is_structured, next_attempt, false;
end;
$$;

revoke all on function private.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) from public, anon, authenticated;

comment on function private.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) is
  'Persists one extraction atomically and labels education evidence with the declared course or, when absent, the declared institution.';

commit;
