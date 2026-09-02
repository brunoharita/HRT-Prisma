-- Align adaptive evidence validation with the canonical stable field lifecycle.
-- The wrapper remains fail-closed and delegates persistence to the partial-recovery implementation.

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
  result record;
begin
  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_typeof(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) <> 'array'
  ) then
    raise exception using errcode = '22023', message = 'layout blocks and field evidence must be arrays';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_array_length(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) > 10000
       or jsonb_array_length(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) > 1000
  ) then
    raise exception using errcode = '22023', message = 'adaptive extraction payload exceeds safe limits';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_pages) page(value)
    cross join lateral jsonb_array_elements(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) descriptor(value)
    where (descriptor.value ->> 'fieldPath') is null
       or (descriptor.value ->> 'fieldPath') !~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
       or ((descriptor.value ->> 'x') is not null and page.value ->> 'origin' <> 'native_pdf')
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'y') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'width') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'height') is null)
       or ((descriptor.value ->> 'x') is not null and (
         jsonb_typeof(descriptor.value -> 'x') <> 'number'
         or jsonb_typeof(descriptor.value -> 'y') <> 'number'
         or jsonb_typeof(descriptor.value -> 'width') <> 'number'
         or jsonb_typeof(descriptor.value -> 'height') <> 'number'
         or (descriptor.value ->> 'x')::double precision < 0
         or (descriptor.value ->> 'y')::double precision < 0
         or (descriptor.value ->> 'width')::double precision <= 0
         or (descriptor.value ->> 'height')::double precision <= 0
         or (descriptor.value ->> 'x')::double precision + (descriptor.value ->> 'width')::double precision > 1
         or (descriptor.value ->> 'y')::double precision + (descriptor.value ->> 'height')::double precision > 1
       ))
  ) then
    raise exception using errcode = '22023', message = 'adaptive field evidence is invalid';
  end if;

  select * into result from private.persist_person_extraction(
    p_organization_id, p_person_id, p_document_id, p_pages, p_draft,
    p_pages_native, p_pages_ocr, p_native_extraction_version, p_ocr_version,
    p_structuring_version, p_draft_version, p_idempotency_key, p_retry_of_attempt_id
  );

  update public.document_page_extractions page
  set layout_blocks = coalesce(payload.value -> 'layout_blocks', '[]'::jsonb),
      field_evidence = coalesce(payload.value -> 'field_evidence', '[]'::jsonb)
  from jsonb_array_elements(p_pages) payload(value)
  where page.organization_id = p_organization_id
    and page.processing_attempt_id = result.processing_attempt_id
    and page.page_number = (payload.value ->> 'page_number')::integer;

  return query
  select result.processing_attempt_id, result.structured, result.attempt_number, result.reused;
end;
$$;

revoke all on function public.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) from public, anon;

grant execute on function public.persist_person_extraction(
  uuid, uuid, uuid, jsonb, jsonb, integer, integer,
  text, text, text, text, text, uuid
) to authenticated;
