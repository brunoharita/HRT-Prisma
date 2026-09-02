-- M5: deterministic intra-document structural learning and sibling block discovery.
-- Existing v2 events remain readable. New v3 writes preserve structural metadata only;
-- selected source text is stored exclusively in the spatial evidence ledger.

alter table public.profile_review_adaptation_events
  add column algorithm_version text not null default 'adaptive-field-correction-v2'
    check (char_length(algorithm_version) between 8 and 120),
  add column signature_version text
    check (signature_version is null or char_length(signature_version) between 8 and 120),
  add column anchor_experience_id text
    check (anchor_experience_id is null or anchor_experience_id ~ '^experience_[a-z0-9]{8,64}$'),
  add column signature_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(signature_summary) = 'object'),
  add column candidate_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(candidate_summary) = 'object');

alter table public.profile_review_adaptation_events
  drop constraint profile_review_adaptation_events_method_version_check,
  add constraint profile_review_adaptation_events_method_version_check
    check (method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3'));

alter table public.organization_extraction_patterns
  drop constraint organization_extraction_patterns_method_version_check,
  add constraint organization_extraction_patterns_method_version_check
    check (method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3'));

alter table public.extraction_learning_cases
  drop constraint extraction_learning_cases_source_shape_check,
  add constraint extraction_learning_cases_source_shape_check check (
    (evidence_event_id is not null and adaptation_event_id is null and pattern_key is null)
    or (
      evidence_event_id is null
      and adaptation_event_id is not null
      and pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$'
      and source_method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3')
    )
  );

create or replace function public.record_profile_review_sibling_scan(
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
declare
  actor_id uuid;
  review public.profile_reviews;
  existing_id bigint;
  new_id bigint;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_anchor_experience_id !~ '^experience_[a-z0-9]{8,64}$'
    or p_method_version <> 'prisma-document-learning-v3'
    or p_algorithm_version <> 'adaptive-sibling-block-v1'
    or p_signature_version <> 'experience-sibling-signature-v1'
    or p_decision not in ('detected', 'discarded')
    or jsonb_typeof(p_signature_summary) <> 'object'
    or jsonb_typeof(p_candidate_summary) <> 'object'
    or p_signature_summary - array['companyPlacement', 'periodPlacement', 'headerEmphasis', 'spatial', 'hasBullets', 'columnBand']::text[] <> '{}'::jsonb
    or p_candidate_summary - array['detected', 'strong', 'possible', 'rejected']::text[] <> '{}'::jsonb
    or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'sibling scan metadata is invalid';
  end if;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  select item.id into existing_id
  from public.person_ingestion_events item
  where item.organization_id = p_organization_id
    and item.person_id = review.person_id
    and item.event_type = case p_decision when 'detected' then 'sibling_blocks_detected' else 'sibling_suggestions_discarded' end
    and item.metadata ->> 'idempotency_key' = p_idempotency_key;
  if existing_id is not null then return query select existing_id, true; return; end if;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id,
    case p_decision when 'detected' then 'sibling_blocks_detected' else 'sibling_suggestions_discarded' end,
    'success',
    jsonb_build_object(
      'review_id', p_review_id,
      'anchor_experience_id', p_anchor_experience_id,
      'method_version', p_method_version,
      'algorithm_version', p_algorithm_version,
      'signature_version', p_signature_version,
      'signature_summary', p_signature_summary,
      'candidate_summary', p_candidate_summary,
      'idempotency_key', p_idempotency_key
    )
  ) returning id into new_id;
  return query select new_id, false;
end;
$$;

revoke all on function public.record_profile_review_sibling_scan(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) from public, anon;
grant execute on function public.record_profile_review_sibling_scan(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, text
) to authenticated;

create or replace function public.apply_profile_review_adaptive_suggestions_v3(
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
  actor_id uuid;
  review public.profile_reviews;
  existing_event public.profile_review_adaptation_events;
  saved record;
  revision_id uuid;
  new_event_id uuid;
  new_region_id uuid;
  new_link_id uuid;
  source_document_version integer;
  fingerprint text;
  suggestion jsonb;
  evidence_region jsonb;
  safe_suggestions jsonb;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(p_reviewed_data) <> 'object'
    or p_source_field_path !~ '^experiences\.([0-9]+|experience_[a-z0-9]{8,64})\.(role|organization|period|description)$'
    or p_pattern_key !~ '^experience:block-v2:[a-z0-9:-]+$'
    or char_length(p_pattern_key) not between 10 and 240
    or p_method_version <> 'prisma-document-learning-v3'
    or p_algorithm_version <> 'adaptive-sibling-block-v1'
    or p_signature_version <> 'experience-sibling-signature-v1'
    or p_anchor_experience_id !~ '^experience_[a-z0-9]{8,64}$'
    or jsonb_typeof(p_signature_summary) <> 'object'
    or jsonb_typeof(p_candidate_summary) <> 'object'
    or p_signature_summary - array['companyPlacement', 'periodPlacement', 'headerEmphasis', 'spatial', 'hasBullets', 'columnBand']::text[] <> '{}'::jsonb
    or p_candidate_summary - array['detected', 'strong', 'possible', 'rejected']::text[] <> '{}'::jsonb
    or jsonb_typeof(p_accepted_suggestions) <> 'array'
    or jsonb_array_length(p_accepted_suggestions) not between 1 and 100
    or p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000
    or p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'adaptive sibling request is invalid';
  end if;

  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions)
  loop
    if jsonb_typeof(suggestion) <> 'object'
      or suggestion - array['candidateId', 'fieldPath', 'pageNumber', 'evidenceMethod', 'rationaleCode', 'evidenceRegions']::text[] <> '{}'::jsonb
      or coalesce(suggestion ->> 'candidateId', '') !~ '^experience_[a-z0-9]{8,64}$'
      or coalesce(suggestion ->> 'fieldPath', '') !~ '^experiences\.experience_[a-z0-9]{8,64}\.(role|organization|period|description)$'
      or jsonb_typeof(suggestion -> 'pageNumber') <> 'number'
      or (suggestion ->> 'pageNumber')::integer not between 1 and 200
      or coalesce(suggestion ->> 'evidenceMethod', '') not in ('pdfjs-layout-v1', 'tesseract-layout-v1', 'text-line-v1')
      or coalesce(suggestion ->> 'rationaleCode', '') <> 'same-document-block-pattern'
      or jsonb_typeof(suggestion -> 'evidenceRegions') <> 'array'
      or jsonb_array_length(suggestion -> 'evidenceRegions') > 8 then
      raise exception using errcode = '22023', message = 'adaptive sibling suggestion metadata is invalid';
    end if;
    for evidence_region in select value from jsonb_array_elements(suggestion -> 'evidenceRegions')
    loop
      if jsonb_typeof(evidence_region) <> 'object'
        or evidence_region - array['pageNumber', 'x', 'y', 'width', 'height', 'selectedText', 'extractionMethod']::text[] <> '{}'::jsonb
        or coalesce(evidence_region ->> 'extractionMethod', '') not in ('pdfjs-text-layer-v1', 'tesseract-region-v1')
        or char_length(coalesce(evidence_region ->> 'selectedText', '')) not between 1 and 2000
        or (evidence_region ->> 'pageNumber')::integer not between 1 and 200
        or (evidence_region ->> 'x')::double precision < 0
        or (evidence_region ->> 'y')::double precision < 0
        or (evidence_region ->> 'width')::double precision <= 0
        or (evidence_region ->> 'height')::double precision <= 0
        or (evidence_region ->> 'x')::double precision + (evidence_region ->> 'width')::double precision > 1
        or (evidence_region ->> 'y')::double precision + (evidence_region ->> 'height')::double precision > 1 then
        raise exception using errcode = '22023', message = 'adaptive sibling evidence region is invalid';
      end if;
    end loop;
  end loop;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;
  select item.document_version into source_document_version from public.documents item
  where item.organization_id = p_organization_id and item.id = review.document_id;
  if source_document_version is null then raise exception using errcode = 'P0002', message = 'review document version was not found'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|',
    p_review_id::text, p_expected_lock_version::text,
    pg_catalog.encode(extensions.digest(p_reviewed_data::text, 'sha256'), 'hex'),
    p_source_field_path, p_pattern_key, p_method_version, p_algorithm_version,
    p_signature_version, p_anchor_experience_id, p_signature_summary::text,
    p_candidate_summary::text, p_accepted_suggestions::text, btrim(p_reason)
  ), 'sha256'), 'hex');

  select * into existing_event from public.profile_review_adaptation_events item
  where item.organization_id = p_organization_id and item.review_id = p_review_id
    and item.idempotency_key = p_idempotency_key;
  if found then
    if existing_event.request_fingerprint <> fingerprint then
      raise exception using errcode = '23505', message = 'adaptive idempotency key reused with another request';
    end if;
    return query select p_review_id, existing_event.lock_version, existing_event.id, true;
    return;
  end if;

  select * into saved from public.save_profile_review(
    p_organization_id, p_review_id, p_expected_lock_version, p_reviewed_data,
    btrim(p_reason), left('adaptive-v3:' || p_idempotency_key, 200)
  );
  select item.id into revision_id from public.profile_review_revisions item
  where item.organization_id = p_organization_id and item.review_id = p_review_id
    and item.revision_number = saved.lock_version;
  if revision_id is null then raise exception using errcode = 'P0002', message = 'adaptive review revision was not found'; end if;

  select jsonb_agg(jsonb_build_object(
    'candidateId', item.value ->> 'candidateId',
    'fieldPath', item.value ->> 'fieldPath',
    'pageNumber', item.value -> 'pageNumber',
    'evidenceMethod', item.value ->> 'evidenceMethod',
    'rationaleCode', item.value ->> 'rationaleCode',
    'evidenceRegionCount', jsonb_array_length(item.value -> 'evidenceRegions')
  )) into safe_suggestions from jsonb_array_elements(p_accepted_suggestions) item(value);

  insert into public.profile_review_adaptation_events (
    organization_id, review_id, review_revision_id, source_field_path,
    pattern_key, method_version, accepted_suggestions, idempotency_key,
    request_fingerprint, lock_version, actor_auth_user_id, algorithm_version,
    signature_version, anchor_experience_id, signature_summary, candidate_summary
  ) values (
    p_organization_id, p_review_id, revision_id, p_source_field_path,
    p_pattern_key, p_method_version, safe_suggestions, p_idempotency_key,
    fingerprint, saved.lock_version, actor_id, p_algorithm_version,
    p_signature_version, p_anchor_experience_id, p_signature_summary, p_candidate_summary
  ) returning id into new_event_id;

  insert into public.extraction_learning_cases (
    organization_id, review_id, evidence_event_id, adaptation_event_id,
    field_path, learning_scope, status, source_contract_version,
    reviewed_contract_version, pattern_key, source_method_version
  ) select distinct
    p_organization_id, p_review_id, null::bigint, new_event_id,
    item.value ->> 'fieldPath', 'document_local', 'candidate', '5.0.0',
    '5.0.0', p_pattern_key, p_method_version
  from jsonb_array_elements(p_accepted_suggestions) item(value);

  for suggestion in select value from jsonb_array_elements(p_accepted_suggestions)
  loop
    for evidence_region in select value from jsonb_array_elements(suggestion -> 'evidenceRegions')
    loop
      insert into public.spatial_evidence_regions (
        organization_id, person_id, document_id, document_version, review_id,
        page_number, x, y, width, height, selected_text, raw_selected_text,
        extraction_method, source, contract_version, created_by_auth_user_id
      ) values (
        p_organization_id, review.person_id, review.document_id, source_document_version, p_review_id,
        (evidence_region ->> 'pageNumber')::integer,
        (evidence_region ->> 'x')::double precision, (evidence_region ->> 'y')::double precision,
        (evidence_region ->> 'width')::double precision, (evidence_region ->> 'height')::double precision,
        evidence_region ->> 'selectedText', evidence_region ->> 'selectedText',
        evidence_region ->> 'extractionMethod', 'system', '1.2.0', actor_id
      ) returning id into new_region_id;

      insert into public.profile_review_evidence_links (
        organization_id, review_id, field_path, spatial_region_id, link_kind,
        state, reason, created_by_auth_user_id
      ) values (
        p_organization_id, p_review_id, suggestion ->> 'fieldPath', new_region_id,
        'complementary', 'active', 'Sugestão estrutural confirmada pelo revisor.', actor_id
      ) returning id into new_link_id;

      insert into public.profile_review_evidence_events (
        organization_id, review_id, review_revision_id, field_path, event_type,
        new_link_id, reason, actor_auth_user_id
      ) values (
        p_organization_id, p_review_id, revision_id, suggestion ->> 'fieldPath',
        'complementary_evidence_added', new_link_id,
        'Sugestão estrutural confirmada pelo revisor.', actor_id
      );
    end loop;
  end loop;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'sibling_suggestions_applied', 'success',
    jsonb_build_object(
      'review_id', p_review_id, 'adaptation_event_id', new_event_id,
      'pattern_key', p_pattern_key, 'suggestion_count', jsonb_array_length(p_accepted_suggestions),
      'method_version', p_method_version, 'algorithm_version', p_algorithm_version,
      'signature_version', p_signature_version, 'candidate_summary', p_candidate_summary
    )
  );
  return query select p_review_id, saved.lock_version, new_event_id, false;
end;
$$;

revoke all on function public.apply_profile_review_adaptive_suggestions_v3(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) from public, anon;
grant execute on function public.apply_profile_review_adaptive_suggestions_v3(
  uuid, uuid, integer, jsonb, text, text, text, text, text, text, jsonb, jsonb, jsonb, text, text
) to authenticated;
