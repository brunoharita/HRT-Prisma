-- M5 hardening: the server independently enforces the same spatial-evidence
-- boundary used by the client before delegating to the audited v3 operations.

create or replace function private.is_valid_sibling_signature_summary(p_summary jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_summary) <> 'object'
    or p_summary - array['companyPlacement', 'periodPlacement', 'headerEmphasis', 'spatial', 'hasBullets', 'columnBand']::text[] <> '{}'::jsonb
    or coalesce(p_summary ->> 'companyPlacement', '') not in ('same-line', 'next-line')
    or coalesce(p_summary ->> 'periodPlacement', '') <> 'header'
    or coalesce(p_summary ->> 'headerEmphasis', '') not in ('regular', 'strong')
    or coalesce(jsonb_typeof(p_summary -> 'spatial'), '') <> 'boolean'
    or coalesce(jsonb_typeof(p_summary -> 'hasBullets'), '') <> 'boolean'
    or coalesce(jsonb_typeof(p_summary -> 'columnBand'), '') <> 'number' then
    return false;
  end if;
  return (p_summary ->> 'spatial')::boolean
    and (p_summary ->> 'columnBand')::double precision between 0 and 1;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

create or replace function private.is_valid_sibling_candidate_summary(p_summary jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  detected_count integer;
  strong_count integer;
  possible_count integer;
  rejected_count integer;
begin
  if jsonb_typeof(p_summary) <> 'object'
    or p_summary - array['detected', 'strong', 'possible', 'rejected']::text[] <> '{}'::jsonb
    or coalesce(jsonb_typeof(p_summary -> 'detected'), '') <> 'number'
    or coalesce(jsonb_typeof(p_summary -> 'strong'), '') <> 'number'
    or coalesce(jsonb_typeof(p_summary -> 'possible'), '') <> 'number'
    or coalesce(jsonb_typeof(p_summary -> 'rejected'), '') <> 'number' then
    return false;
  end if;
  detected_count := (p_summary ->> 'detected')::integer;
  strong_count := (p_summary ->> 'strong')::integer;
  possible_count := (p_summary ->> 'possible')::integer;
  rejected_count := (p_summary ->> 'rejected')::integer;
  return detected_count between 0 and 1000
    and strong_count between 0 and 1000
    and possible_count between 0 and 1000
    and rejected_count between 0 and 1000
    and detected_count = strong_count + possible_count + rejected_count;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

create or replace function private.is_valid_sibling_suggestion(p_suggestion jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  region jsonb;
begin
  if jsonb_typeof(p_suggestion) <> 'object'
    or p_suggestion - array['candidateId', 'fieldPath', 'pageNumber', 'evidenceMethod', 'rationaleCode', 'evidenceRegions']::text[] <> '{}'::jsonb
    or coalesce(p_suggestion ->> 'candidateId', '') !~ '^experience_[a-z0-9]{8,64}$'
    or coalesce(p_suggestion ->> 'fieldPath', '') !~ '^experiences\.experience_[a-z0-9]{8,64}\.(role|organization|period|description)$'
    or split_part(p_suggestion ->> 'fieldPath', '.', 2) <> p_suggestion ->> 'candidateId'
    or coalesce(jsonb_typeof(p_suggestion -> 'pageNumber'), '') <> 'number'
    or coalesce(p_suggestion ->> 'evidenceMethod', '') not in ('pdfjs-layout-v1', 'tesseract-layout-v1')
    or coalesce(p_suggestion ->> 'rationaleCode', '') <> 'same-document-block-pattern'
    or jsonb_typeof(p_suggestion -> 'evidenceRegions') <> 'array'
    or jsonb_array_length(p_suggestion -> 'evidenceRegions') not between 1 and 8 then
    return false;
  end if;
  if (p_suggestion ->> 'pageNumber')::integer not between 1 and 200 then return false; end if;

  for region in select value from jsonb_array_elements(p_suggestion -> 'evidenceRegions')
  loop
    if jsonb_typeof(region) <> 'object'
      or region - array['pageNumber', 'x', 'y', 'width', 'height', 'selectedText', 'extractionMethod']::text[] <> '{}'::jsonb
      or coalesce(jsonb_typeof(region -> 'pageNumber'), '') <> 'number'
      or coalesce(jsonb_typeof(region -> 'x'), '') <> 'number'
      or coalesce(jsonb_typeof(region -> 'y'), '') <> 'number'
      or coalesce(jsonb_typeof(region -> 'width'), '') <> 'number'
      or coalesce(jsonb_typeof(region -> 'height'), '') <> 'number'
      or coalesce(jsonb_typeof(region -> 'selectedText'), '') <> 'string'
      or coalesce(jsonb_typeof(region -> 'extractionMethod'), '') <> 'string'
      or char_length(region ->> 'selectedText') not between 1 and 2000
      or coalesce(region ->> 'extractionMethod', '') not in ('pdfjs-text-layer-v1', 'tesseract-region-v1')
      or (p_suggestion ->> 'evidenceMethod' = 'pdfjs-layout-v1' and region ->> 'extractionMethod' <> 'pdfjs-text-layer-v1')
      or (p_suggestion ->> 'evidenceMethod' = 'tesseract-layout-v1' and region ->> 'extractionMethod' <> 'tesseract-region-v1') then
      return false;
    end if;
    if (region ->> 'pageNumber')::integer not between 1 and 200
      or (region ->> 'x')::double precision < 0
      or (region ->> 'y')::double precision < 0
      or (region ->> 'width')::double precision <= 0
      or (region ->> 'height')::double precision <= 0
      or (region ->> 'x')::double precision + (region ->> 'width')::double precision > 1
      or (region ->> 'y')::double precision + (region ->> 'height')::double precision > 1 then
      return false;
    end if;
  end loop;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range then
  return false;
end;
$$;

alter function public.record_profile_review_sibling_scan(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) rename to record_profile_review_sibling_scan_v3_impl;

revoke all on function public.record_profile_review_sibling_scan_v3_impl(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) from public, anon, authenticated;

create function public.record_profile_review_sibling_scan(
  p_organization_id uuid,
  p_review_id uuid,
  p_anchor_experience_id text,
  p_method_version text,
  p_algorithm_version text,
  p_signature_version text,
  p_signature_summary jsonb,
  p_candidate_summary jsonb,
  p_decision text,
  p_idempotency_key text
)
returns table (event_id bigint, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_sibling_signature_summary(p_signature_summary)
    or not private.is_valid_sibling_candidate_summary(p_candidate_summary) then
    raise exception using errcode = '22023', message = 'sibling scan metadata is invalid';
  end if;
  return query select * from public.record_profile_review_sibling_scan_v3_impl(
    p_organization_id, p_review_id, p_anchor_experience_id, p_method_version,
    p_algorithm_version, p_signature_version, p_signature_summary,
    p_candidate_summary, p_decision, p_idempotency_key
  );
end;
$$;

revoke all on function public.record_profile_review_sibling_scan(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) from public, anon;
grant execute on function public.record_profile_review_sibling_scan(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) to authenticated;

alter function public.apply_profile_review_adaptive_suggestions_v3(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) rename to apply_profile_review_adaptive_suggestions_v3_impl;

revoke all on function public.apply_profile_review_adaptive_suggestions_v3_impl(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) from public, anon, authenticated;

create function public.apply_profile_review_adaptive_suggestions_v3(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_reviewed_data jsonb,
  p_source_field_path text,
  p_pattern_key text,
  p_method_version text,
  p_algorithm_version text,
  p_signature_version text,
  p_anchor_experience_id text,
  p_signature_summary jsonb,
  p_candidate_summary jsonb,
  p_accepted_suggestions jsonb,
  p_reason text,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, adaptation_event_id uuid, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggestion jsonb;
begin
  if not private.is_valid_sibling_signature_summary(p_signature_summary)
    or not private.is_valid_sibling_candidate_summary(p_candidate_summary)
    or jsonb_typeof(p_accepted_suggestions) <> 'array'
    or jsonb_array_length(p_accepted_suggestions) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'adaptive sibling request is invalid';
  end if;
  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions)
  loop
    if not private.is_valid_sibling_suggestion(suggestion) then
      raise exception using errcode = '22023', message = 'adaptive sibling suggestion metadata is invalid';
    end if;
  end loop;
  return query select * from public.apply_profile_review_adaptive_suggestions_v3_impl(
    p_organization_id, p_review_id, p_expected_lock_version, p_reviewed_data,
    p_source_field_path, p_pattern_key, p_method_version, p_algorithm_version,
    p_signature_version, p_anchor_experience_id, p_signature_summary,
    p_candidate_summary, p_accepted_suggestions, p_reason, p_idempotency_key
  );
end;
$$;

revoke all on function public.apply_profile_review_adaptive_suggestions_v3(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) from public, anon;
grant execute on function public.apply_profile_review_adaptive_suggestions_v3(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) to authenticated;
