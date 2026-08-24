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
  p_draft_version text
)
returns table (processing_attempt_id uuid, structured boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_attempt_number integer;
  new_attempt_id uuid;
  is_structured boolean;
  source_is_manual boolean;
  page_record record;
  evidence_record record;
begin
  if not (select private.has_org_role(
    p_organization_id,
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  )) then
    raise exception 'organization scope is not authorized';
  end if;

  if jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) = 0 then
    raise exception 'at least one extracted page is required';
  end if;

  if jsonb_typeof(p_draft) <> 'object' then
    raise exception 'a structured draft object is required';
  end if;

  perform 1
  from public.documents document
  where document.organization_id = p_organization_id
    and document.person_id = p_person_id
    and document.id = p_document_id
  for update;

  if not found then
    raise exception 'document does not belong to the organization and person';
  end if;

  select coalesce(max(attempt.attempt_number), 0) + 1
  into next_attempt_number
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id
    and attempt.document_id = p_document_id;

  insert into public.document_processing_attempts (
    organization_id,
    person_id,
    document_id,
    attempt_number,
    state,
    native_extraction_version,
    ocr_version,
    structuring_version,
    current_method,
    pages_native,
    pages_ocr,
    useful_character_count
  )
  values (
    p_organization_id,
    p_person_id,
    p_document_id,
    next_attempt_number,
    'structuring',
    p_native_extraction_version,
    p_ocr_version,
    p_structuring_version,
    'deterministic_structuring',
    p_pages_native,
    p_pages_ocr,
    coalesce((select sum((page.value ->> 'useful_character_count')::integer) from jsonb_array_elements(p_pages) page), 0)
  )
  returning id into new_attempt_id;

  for page_record in
    select *
    from jsonb_to_recordset(p_pages) as page(
      page_number integer,
      text_content text,
      origin text,
      useful_character_count integer,
      method text,
      method_version text
    )
  loop
    if page_record.page_number is null
      or page_record.page_number < 1
      or page_record.text_content is null
      or page_record.origin not in ('native_pdf', 'ocr', 'manual_text') then
      raise exception 'invalid extracted page contract';
    end if;

    insert into public.document_page_extractions (
      organization_id,
      person_id,
      document_id,
      processing_attempt_id,
      page_number,
      origin,
      text_content,
      useful_character_count,
      method,
      method_version
    )
    values (
      p_organization_id,
      p_person_id,
      p_document_id,
      new_attempt_id,
      page_record.page_number,
      page_record.origin::public.page_extraction_origin,
      page_record.text_content,
      coalesce(page_record.useful_character_count, 0),
      coalesce(page_record.method, 'unknown'),
      coalesce(page_record.method_version, 'unknown')
    );
  end loop;

  is_structured := jsonb_array_length(coalesce(p_draft -> 'experiences', '[]'::jsonb)) > 0;

  insert into public.extraction_drafts (
    organization_id,
    person_id,
    document_id,
    processing_attempt_id,
    draft_version,
    validation_status,
    identified_fields,
    uncertainties,
    not_identified,
    validated_at
  )
  values (
    p_organization_id,
    p_person_id,
    p_document_id,
    new_attempt_id,
    p_draft_version,
    case when is_structured then 'valid' else 'insufficient' end,
    p_draft,
    coalesce(p_draft -> 'uncertainties', '[]'::jsonb),
    coalesce(p_draft -> 'notIdentified', '[]'::jsonb),
    now()
  );

  for evidence_record in
    select
      'experience'::text as kind,
      concat_ws(' em ', item ->> 'role', item ->> 'organization') as fact,
      item ->> 'evidenceText' as quoted_text,
      (item ->> 'page')::integer as source_page,
      ordinal
    from jsonb_array_elements(coalesce(p_draft -> 'experiences', '[]'::jsonb)) with ordinality as source(item, ordinal)
    union all
    select
      'education'::text,
      item ->> 'course',
      item ->> 'evidenceText',
      (item ->> 'page')::integer,
      ordinal
    from jsonb_array_elements(coalesce(p_draft -> 'education', '[]'::jsonb)) with ordinality as source(item, ordinal)
  loop
    insert into public.evidence (
      organization_id,
      person_id,
      document_id,
      kind,
      fact,
      source_page,
      source_block,
      quoted_text,
      extraction_version,
      processing_attempt_id,
      extraction_origin,
      method,
      method_version
    )
    select
      p_organization_id,
      p_person_id,
      p_document_id,
      evidence_record.kind,
      evidence_record.fact,
      evidence_record.source_page,
      format('page-%s-fact-%s', evidence_record.source_page, evidence_record.ordinal),
      evidence_record.quoted_text,
      p_structuring_version,
      new_attempt_id,
      page.origin,
      'deterministic-regex',
      p_structuring_version
    from public.document_page_extractions page
    where page.organization_id = p_organization_id
      and page.processing_attempt_id = new_attempt_id
      and page.page_number = evidence_record.source_page;
  end loop;

  select exists (
    select 1
    from public.document_page_extractions page
    where page.organization_id = p_organization_id
      and page.processing_attempt_id = new_attempt_id
      and page.origin = 'manual_text'
  ) into source_is_manual;

  update public.document_processing_attempts
  set state = case when is_structured then 'structured'::public.processing_state else 'failed_structuring'::public.processing_state end,
      current_method = case when is_structured then 'awaiting_profile_generation' else 'manual_review' end,
      failure_code = case when is_structured then null else 'insufficient_structured_facts' end,
      failure_message = case when is_structured then null else 'A fonte foi preservada, mas não contém experiência estruturável suficiente.' end,
      completed_at = now()
  where organization_id = p_organization_id and id = new_attempt_id;

  update public.documents
  set status = 'needs_manual_review',
      failure_category = case when is_structured then 'profile_generation_pending' else 'insufficient_extraction' end,
      failure_reason = case
        when is_structured then 'Dados extraídos aguardam geração explícita do Perfil Prisma.'
        else 'A extração foi preservada, mas é insuficiente para gerar um perfil.'
      end,
      can_reprocess = true,
      processed_at = now()
  where organization_id = p_organization_id and id = p_document_id;

  update public.people
  set profile_state = case when is_structured then 'building'::public.person_profile_state else 'requires_attention'::public.person_profile_state end,
      latest_source_type = case when source_is_manual then 'manual_text'::public.document_source_type else 'resume_pdf'::public.document_source_type end,
      latest_source_at = now(),
      updated_at = now()
  where organization_id = p_organization_id and id = p_person_id;

  return query select new_attempt_id, is_structured;
end;
$$;

revoke all on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text) from public, anon;
grant execute on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text) to authenticated;
