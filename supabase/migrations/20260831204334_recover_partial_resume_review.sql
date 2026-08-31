-- A partial deterministic extraction is a valid input for human recovery.
-- It remains incomplete and cannot become a profile without the existing review gates.

create or replace function public.persist_person_extraction(
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
  recovery_mode boolean;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select attempt.state = 'failed_structuring'::public.processing_state into recovery_mode
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.person_id = p_person_id
    and attempt.document_id = p_document_id and attempt.id = p_processing_attempt_id
    and (
      attempt.state in ('structured', 'profile_ready')
      or (
        attempt.state = 'failed_structuring'
        and attempt.failure_code = 'insufficient_structured_facts'
        and attempt.useful_character_count > 0
        and attempt.pages_native + attempt.pages_ocr > 0
        and exists (
          select 1 from public.document_page_extractions page
          where page.organization_id = p_organization_id
            and page.document_id = p_document_id
            and page.processing_attempt_id = p_processing_attempt_id
        )
      )
    )
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'reviewable processing attempt not found'; end if;

  select extraction.identified_fields into draft_data
  from public.extraction_drafts extraction
  where extraction.organization_id = p_organization_id
    and extraction.document_id = p_document_id
    and extraction.processing_attempt_id = p_processing_attempt_id
    and extraction.validation_status in ('valid', 'insufficient');
  if draft_data is null then raise exception using errcode = 'P0002', message = 'reviewable extraction draft not found'; end if;

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
  ) values (p_organization_id, new_review_id, 1, draft_data,
    case when recovery_mode then 'Recuperação humana iniciada' else 'Revisão iniciada' end, actor_id);

  update public.documents
  set review_state = 'in_review', status = 'in_review',
      failure_category = case when recovery_mode then 'incomplete_recognition' else null end,
      failure_reason = case when recovery_mode then 'Conteúdo preservado em recuperação humana.' else null end
  where organization_id = p_organization_id and id = p_document_id;

  update public.document_operations
  set review_id = new_review_id, status = 'completed',
      result = jsonb_build_object('review_id', new_review_id, 'lock_version', 1, 'recovery_mode', recovery_mode), completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_person_id, p_document_id, p_processing_attempt_id,
    actor_id, 'profile_review_started', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', new_review_id, 'recovery_mode', recovery_mode)
  );
  return query select new_review_id, 1, false;
end;
$$;

-- Historical attempts remain immutable. Only the current document/intake projection is repaired.
with recoverable_documents as (
  select distinct document.organization_id, document.id as document_id, document.person_id
  from public.documents document
  join public.document_processing_attempts attempt
    on attempt.organization_id = document.organization_id and attempt.document_id = document.id
  join public.extraction_drafts extraction
    on extraction.organization_id = attempt.organization_id and extraction.processing_attempt_id = attempt.id
  where document.review_state = 'not_ready'
    and attempt.state = 'failed_structuring'
    and attempt.failure_code = 'insufficient_structured_facts'
    and attempt.useful_character_count > 0
    and attempt.pages_native + attempt.pages_ocr > 0
    and extraction.validation_status = 'insufficient'
    and exists (
      select 1 from public.document_page_extractions page
      where page.organization_id = attempt.organization_id and page.processing_attempt_id = attempt.id
    )
)
update public.documents document
set status = 'ready_for_review', review_state = 'ready_for_review',
    failure_category = 'incomplete_recognition',
    failure_reason = 'O conteúdo foi recuperado e precisa de complementação humana.',
    failure_technical_message = 'insufficient_structured_facts'
from recoverable_documents recoverable
where document.organization_id = recoverable.organization_id and document.id = recoverable.document_id;

update public.resume_intakes intake
set status = 'ready_for_review', error_code = null, error_message = null
from public.documents document
where intake.organization_id = document.organization_id
  and intake.resolved_document_id = document.id
  and document.review_state = 'ready_for_review'
  and intake.status = 'failed';

update public.people person
set profile_state = 'building', updated_at = now()
where exists (
  select 1 from public.documents document
  where document.organization_id = person.organization_id
    and document.person_id = person.id
    and document.review_state = 'ready_for_review'
);
