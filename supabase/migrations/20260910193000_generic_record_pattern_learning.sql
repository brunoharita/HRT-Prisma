-- M5.6: generic document-local record-pattern learning.
-- Extends the audited v3 experience flow to education and certification records
-- while replacing absolute-position signatures with relative block topology.

alter table public.profile_review_adaptation_events
  add column anchor_record_kind text
    check (anchor_record_kind is null or anchor_record_kind in ('experience', 'education', 'certification')),
  add column anchor_record_id text
    check (anchor_record_id is null or anchor_record_id ~ '^(experience|education|certification)_[a-z0-9]{8,64}$');

alter table public.profile_review_adaptation_events
  drop constraint profile_review_adaptation_events_source_field_path_check,
  add constraint profile_review_adaptation_events_source_field_path_check check (
    source_field_path ~ '^experiences\.([0-9]+|experience_[a-z0-9]{8,64})\.(role|organization|period|description)$'
    or source_field_path ~ '^education\.([0-9]+|education_[a-z0-9]{8,64})\.(course|institution|period|description)$'
    or source_field_path = 'certifications'
  ),
  drop constraint profile_review_adaptation_events_pattern_key_check,
  add constraint profile_review_adaptation_events_pattern_key_check check (
    char_length(pattern_key) between 10 and 240
    and (pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$' or pattern_key ~ '^record:(experience|education|certification):block-v1:[a-z0-9:-]+$')
  ),
  drop constraint profile_review_adaptation_events_method_version_check,
  add constraint profile_review_adaptation_events_method_version_check check (
    method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3', 'prisma-document-learning-v4')
  );

alter table public.organization_extraction_patterns
  drop constraint organization_extraction_patterns_pattern_key_check,
  add constraint organization_extraction_patterns_pattern_key_check check (
    char_length(pattern_key) between 10 and 240
    and (pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$' or pattern_key ~ '^record:(experience|education|certification):block-v1:[a-z0-9:-]+$')
  ),
  drop constraint organization_extraction_patterns_method_version_check,
  add constraint organization_extraction_patterns_method_version_check check (
    method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3', 'prisma-document-learning-v4')
  );

alter table public.extraction_learning_cases
  drop constraint extraction_learning_cases_source_shape_check,
  add constraint extraction_learning_cases_source_shape_check check (
    (evidence_event_id is not null and adaptation_event_id is null and pattern_key is null)
    or (
      evidence_event_id is null
      and adaptation_event_id is not null
      and (pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$' or pattern_key ~ '^record:(experience|education|certification):block-v1:[a-z0-9:-]+$')
      and source_method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3', 'prisma-document-learning-v4')
    )
  );

create function private.is_valid_record_pattern_signature(p_summary jsonb, p_record_kind text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_record_kind not in ('experience', 'education', 'certification')
    or jsonb_typeof(p_summary) <> 'object'
    or p_summary - array['recordKind', 'secondaryPlacement', 'periodPlacement', 'headerEmphasis', 'spatial', 'hasBullets', 'lineCountBand', 'relativeIndentBand', 'blockTypePattern']::text[] <> '{}'::jsonb
    or p_summary ->> 'recordKind' <> p_record_kind
    or coalesce(p_summary ->> 'secondaryPlacement', '') not in ('same-line', 'next-line', 'missing', 'single-value')
    or coalesce(p_summary ->> 'periodPlacement', '') not in ('top', 'body', 'none')
    or coalesce(p_summary ->> 'headerEmphasis', '') not in ('regular', 'strong')
    or coalesce(jsonb_typeof(p_summary -> 'spatial'), '') <> 'boolean'
    or coalesce(jsonb_typeof(p_summary -> 'hasBullets'), '') <> 'boolean'
    or coalesce(jsonb_typeof(p_summary -> 'lineCountBand'), '') <> 'number'
    or coalesce(jsonb_typeof(p_summary -> 'relativeIndentBand'), '') <> 'number'
    or coalesce(jsonb_typeof(p_summary -> 'blockTypePattern'), '') <> 'string'
    or char_length(p_summary ->> 'blockTypePattern') not between 1 and 120 then return false;
  end if;
  return (p_summary ->> 'spatial')::boolean
    and (p_summary ->> 'lineCountBand')::integer between 1 and 8
    and (p_summary ->> 'relativeIndentBand')::double precision between 0 and 1;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;
$$;

create function private.is_valid_record_pattern_suggestion(p_suggestion jsonb, p_record_kind text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare region jsonb; field_path text; candidate_id text;
begin
  field_path := coalesce(p_suggestion ->> 'fieldPath', '');
  candidate_id := coalesce(p_suggestion ->> 'candidateId', '');
  if jsonb_typeof(p_suggestion) <> 'object'
    or p_suggestion - array['candidateId', 'fieldPath', 'pageNumber', 'evidenceMethod', 'rationaleCode', 'evidenceRegions']::text[] <> '{}'::jsonb
    or candidate_id !~ ('^' || p_record_kind || '_[a-z0-9]{8,64}$')
    or (p_record_kind = 'experience' and (field_path !~ '^experiences\.experience_[a-z0-9]{8,64}\.(role|organization|period|description)$' or split_part(field_path, '.', 2) <> candidate_id))
    or (p_record_kind = 'education' and (field_path !~ '^education\.education_[a-z0-9]{8,64}\.(course|institution|period|description)$' or split_part(field_path, '.', 2) <> candidate_id))
    or (p_record_kind = 'certification' and field_path <> 'certifications')
    or coalesce(jsonb_typeof(p_suggestion -> 'pageNumber'), '') <> 'number'
    or (p_suggestion ->> 'pageNumber')::integer not between 1 and 200
    or coalesce(p_suggestion ->> 'evidenceMethod', '') not in ('pdfjs-layout-v1', 'tesseract-layout-v1')
    or coalesce(p_suggestion ->> 'rationaleCode', '') <> 'same-document-block-pattern'
    or jsonb_typeof(p_suggestion -> 'evidenceRegions') <> 'array'
    or jsonb_array_length(p_suggestion -> 'evidenceRegions') not between 1 and 8 then return false;
  end if;
  for region in select value from jsonb_array_elements(p_suggestion -> 'evidenceRegions') loop
    if jsonb_typeof(region) <> 'object'
      or region - array['pageNumber', 'x', 'y', 'width', 'height', 'selectedText', 'extractionMethod']::text[] <> '{}'::jsonb
      or coalesce(region ->> 'extractionMethod', '') not in ('pdfjs-text-layer-v1', 'tesseract-region-v1')
      or char_length(coalesce(region ->> 'selectedText', '')) not between 1 and 2000
      or (region ->> 'pageNumber')::integer not between 1 and 200
      or (region ->> 'x')::double precision < 0 or (region ->> 'y')::double precision < 0
      or (region ->> 'width')::double precision <= 0 or (region ->> 'height')::double precision <= 0
      or (region ->> 'x')::double precision + (region ->> 'width')::double precision > 1
      or (region ->> 'y')::double precision + (region ->> 'height')::double precision > 1
      or (p_suggestion ->> 'evidenceMethod' = 'pdfjs-layout-v1' and region ->> 'extractionMethod' <> 'pdfjs-text-layer-v1')
      or (p_suggestion ->> 'evidenceMethod' = 'tesseract-layout-v1' and region ->> 'extractionMethod' <> 'tesseract-region-v1') then return false;
    end if;
  end loop;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;
$$;

create function public.record_profile_review_record_scan(
  p_organization_id uuid, p_review_id uuid, p_anchor_record_kind text, p_anchor_record_id text,
  p_method_version text, p_algorithm_version text, p_signature_version text,
  p_signature_summary jsonb, p_candidate_summary jsonb, p_decision text, p_idempotency_key text
)
returns table (event_id bigint, reused boolean)
language plpgsql security definer set search_path = ''
as $$
declare actor_id uuid; review public.profile_reviews; existing_id bigint; new_id bigint;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_anchor_record_id !~ ('^' || p_anchor_record_kind || '_[a-z0-9]{8,64}$')
    or p_method_version <> 'prisma-document-learning-v4'
    or p_algorithm_version <> 'generic-record-pattern-v1'
    or p_signature_version <> 'relative-record-signature-v1'
    or p_decision not in ('detected', 'discarded')
    or not private.is_valid_record_pattern_signature(p_signature_summary, p_anchor_record_kind)
    or not private.is_valid_sibling_candidate_summary(p_candidate_summary)
    or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'record scan metadata is invalid';
  end if;
  select * into review from public.profile_reviews item where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;
  select item.id into existing_id from public.person_ingestion_events item
    where item.organization_id = p_organization_id and item.person_id = review.person_id
      and item.event_type = case p_decision when 'detected' then 'sibling_blocks_detected' else 'sibling_suggestions_discarded' end
      and item.metadata ->> 'idempotency_key' = p_idempotency_key;
  if existing_id is not null then return query select existing_id, true; return; end if;
  insert into public.person_ingestion_events (organization_id, person_id, document_id, processing_attempt_id, actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, review.person_id, review.document_id, review.processing_attempt_id, actor_id,
    case p_decision when 'detected' then 'sibling_blocks_detected' else 'sibling_suggestions_discarded' end, 'success',
    jsonb_build_object('review_id', p_review_id, 'anchor_record_kind', p_anchor_record_kind, 'anchor_record_id', p_anchor_record_id,
      'method_version', p_method_version, 'algorithm_version', p_algorithm_version, 'signature_version', p_signature_version,
      'signature_summary', p_signature_summary, 'candidate_summary', p_candidate_summary, 'idempotency_key', p_idempotency_key)) returning id into new_id;
  return query select new_id, false;
end;
$$;

revoke all on function public.record_profile_review_record_scan(uuid, uuid, text, text, text, text, text, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.record_profile_review_record_scan(uuid, uuid, text, text, text, text, text, jsonb, jsonb, text, text) to authenticated;

create function public.apply_profile_review_adaptive_suggestions_v4(
  p_organization_id uuid, p_review_id uuid, p_expected_lock_version integer, p_reviewed_data jsonb,
  p_source_field_path text, p_pattern_key text, p_method_version text, p_algorithm_version text,
  p_signature_version text, p_anchor_record_kind text, p_anchor_record_id text,
  p_signature_summary jsonb, p_candidate_summary jsonb, p_accepted_suggestions jsonb,
  p_reason text, p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, adaptation_event_id uuid, reused boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid; review public.profile_reviews; existing_event public.profile_review_adaptation_events; saved record;
  revision_id uuid; new_event_id uuid; new_region_id uuid; new_link_id uuid; source_document_version integer;
  fingerprint text; suggestion jsonb; evidence_region jsonb; safe_suggestions jsonb;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(p_reviewed_data) <> 'object'
    or (p_anchor_record_kind = 'experience' and p_source_field_path !~ '^experiences\.([0-9]+|experience_[a-z0-9]{8,64})\.(role|organization|period|description)$')
    or (p_anchor_record_kind = 'education' and p_source_field_path !~ '^education\.([0-9]+|education_[a-z0-9]{8,64})\.(course|institution|period|description)$')
    or (p_anchor_record_kind = 'certification' and p_source_field_path <> 'certifications')
    or p_pattern_key !~ ('^(experience:block-v2|record:' || p_anchor_record_kind || ':block-v1):[a-z0-9:-]+$')
    or p_method_version <> 'prisma-document-learning-v4'
    or p_algorithm_version <> 'generic-record-pattern-v1'
    or p_signature_version <> 'relative-record-signature-v1'
    or p_anchor_record_id !~ ('^' || p_anchor_record_kind || '_[a-z0-9]{8,64}$')
    or not private.is_valid_record_pattern_signature(p_signature_summary, p_anchor_record_kind)
    or not private.is_valid_sibling_candidate_summary(p_candidate_summary)
    or jsonb_typeof(p_accepted_suggestions) <> 'array' or jsonb_array_length(p_accepted_suggestions) not between 1 and 100
    or p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000
    or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'adaptive record request is invalid';
  end if;
  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions) loop
    if not private.is_valid_record_pattern_suggestion(suggestion, p_anchor_record_kind) then
      raise exception using errcode = '22023', message = 'adaptive record suggestion metadata is invalid';
    end if;
  end loop;
  select * into review from public.profile_reviews item where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;
  select item.document_version into source_document_version from public.documents item where item.organization_id = p_organization_id and item.id = review.document_id;
  if source_document_version is null then raise exception using errcode = 'P0002', message = 'review document version was not found'; end if;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_review_id::text, p_expected_lock_version::text,
    pg_catalog.encode(extensions.digest(p_reviewed_data::text, 'sha256'), 'hex'), p_source_field_path, p_pattern_key,
    p_method_version, p_algorithm_version, p_signature_version, p_anchor_record_kind, p_anchor_record_id,
    p_signature_summary::text, p_candidate_summary::text, p_accepted_suggestions::text, btrim(p_reason)), 'sha256'), 'hex');
  select * into existing_event from public.profile_review_adaptation_events item
    where item.organization_id = p_organization_id and item.review_id = p_review_id and item.idempotency_key = p_idempotency_key;
  if found then
    if existing_event.request_fingerprint <> fingerprint then raise exception using errcode = '23505', message = 'adaptive idempotency key reused with another request'; end if;
    return query select p_review_id, existing_event.lock_version, existing_event.id, true; return;
  end if;
  select * into saved from public.save_profile_review(p_organization_id, p_review_id, p_expected_lock_version, p_reviewed_data, btrim(p_reason), left('adaptive-v4:' || p_idempotency_key, 200));
  select item.id into revision_id from public.profile_review_revisions item where item.organization_id = p_organization_id and item.review_id = p_review_id and item.revision_number = saved.lock_version;
  if revision_id is null then raise exception using errcode = 'P0002', message = 'adaptive review revision was not found'; end if;
  select jsonb_agg(jsonb_build_object('candidateId', item.value ->> 'candidateId', 'fieldPath', item.value ->> 'fieldPath',
    'pageNumber', item.value -> 'pageNumber', 'evidenceMethod', item.value ->> 'evidenceMethod',
    'rationaleCode', item.value ->> 'rationaleCode', 'evidenceRegionCount', jsonb_array_length(item.value -> 'evidenceRegions')))
    into safe_suggestions from jsonb_array_elements(p_accepted_suggestions) item(value);
  insert into public.profile_review_adaptation_events (organization_id, review_id, review_revision_id, source_field_path,
    pattern_key, method_version, accepted_suggestions, idempotency_key, request_fingerprint, lock_version,
    actor_auth_user_id, algorithm_version, signature_version, anchor_experience_id, anchor_record_kind,
    anchor_record_id, signature_summary, candidate_summary)
  values (p_organization_id, p_review_id, revision_id, p_source_field_path, p_pattern_key, p_method_version,
    safe_suggestions, p_idempotency_key, fingerprint, saved.lock_version, actor_id, p_algorithm_version,
    p_signature_version, null, p_anchor_record_kind, p_anchor_record_id, p_signature_summary, p_candidate_summary)
  returning id into new_event_id;
  insert into public.extraction_learning_cases (organization_id, review_id, evidence_event_id, adaptation_event_id,
    field_path, learning_scope, status, source_contract_version, reviewed_contract_version, pattern_key, source_method_version)
  select distinct p_organization_id, p_review_id, null::bigint, new_event_id, item.value ->> 'fieldPath',
    'document_local', 'candidate', '7.0.0', '7.0.0', p_pattern_key, p_method_version
  from jsonb_array_elements(p_accepted_suggestions) item(value);
  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions) loop
    for evidence_region in select value from jsonb_array_elements(suggestion -> 'evidenceRegions') loop
      insert into public.spatial_evidence_regions (organization_id, person_id, document_id, document_version, review_id,
        page_number, x, y, width, height, selected_text, raw_selected_text, extraction_method, source,
        contract_version, created_by_auth_user_id)
      values (p_organization_id, review.person_id, review.document_id, source_document_version, p_review_id,
        (evidence_region ->> 'pageNumber')::integer, (evidence_region ->> 'x')::double precision,
        (evidence_region ->> 'y')::double precision, (evidence_region ->> 'width')::double precision,
        (evidence_region ->> 'height')::double precision, evidence_region ->> 'selectedText',
        evidence_region ->> 'selectedText', evidence_region ->> 'extractionMethod', 'system', '1.2.0', actor_id)
      returning id into new_region_id;
      insert into public.profile_review_evidence_links (organization_id, review_id, field_path, spatial_region_id,
        link_kind, state, reason, created_by_auth_user_id)
      values (p_organization_id, p_review_id, suggestion ->> 'fieldPath', new_region_id, 'complementary', 'active',
        'Sugestão estrutural confirmada pelo revisor.', actor_id) returning id into new_link_id;
      insert into public.profile_review_evidence_events (organization_id, review_id, review_revision_id, field_path,
        event_type, new_link_id, reason, actor_auth_user_id)
      values (p_organization_id, p_review_id, revision_id, suggestion ->> 'fieldPath', 'complementary_evidence_added',
        new_link_id, 'Sugestão estrutural confirmada pelo revisor.', actor_id);
    end loop;
  end loop;
  insert into public.person_ingestion_events (organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, review.person_id, review.document_id, review.processing_attempt_id, actor_id,
    'sibling_suggestions_applied', 'success', jsonb_build_object('review_id', p_review_id,
      'adaptation_event_id', new_event_id, 'record_kind', p_anchor_record_kind, 'pattern_key', p_pattern_key,
      'suggestion_count', jsonb_array_length(p_accepted_suggestions), 'method_version', p_method_version,
      'algorithm_version', p_algorithm_version, 'signature_version', p_signature_version,
      'candidate_summary', p_candidate_summary));
  return query select p_review_id, saved.lock_version, new_event_id, false;
end;
$$;

revoke all on function public.apply_profile_review_adaptive_suggestions_v4(uuid, uuid, integer, jsonb, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.apply_profile_review_adaptive_suggestions_v4(uuid, uuid, integer, jsonb, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text) to authenticated;

revoke all on function private.is_valid_record_pattern_signature(jsonb, text) from public, anon, authenticated;
revoke all on function private.is_valid_record_pattern_suggestion(jsonb, text) from public, anon, authenticated;
