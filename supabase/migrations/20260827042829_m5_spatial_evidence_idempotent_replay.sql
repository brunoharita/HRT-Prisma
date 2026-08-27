alter function public.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) set schema private;

revoke all on function private.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) from public, anon, authenticated;

create function public.record_profile_review_evidence(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_field_path text,
  p_action text,
  p_document_version integer,
  p_page_number integer,
  p_x double precision,
  p_y double precision,
  p_width double precision,
  p_height double precision,
  p_selected_text text,
  p_extraction_method text,
  p_reviewed_data jsonb,
  p_reason text,
  p_replaces_link_id uuid,
  p_idempotency_key text
)
returns table (
  review_id uuid,
  lock_version integer,
  region_id uuid,
  link_id uuid,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  operation public.document_operations;
  next_reviewed_data jsonb;
  resolved_reason text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);

  select * into review
  from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'review not found in organization';
  end if;

  next_reviewed_data := coalesce(p_reviewed_data, review.reviewed_data);
  resolved_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if resolved_reason is null then
    resolved_reason := case p_action
      when 'correct_current_field' then format('Campo corrigido com região explícita da página %s.', p_page_number)
      when 'add_complementary' then format('Evidência complementar adicionada a partir da página %s.', p_page_number)
      when 'replace_review_evidence' then format('Evidência ativa substituída por região da página %s.', p_page_number)
      when 'create_new_information' then format('Nova informação criada com evidência explícita da página %s.', p_page_number)
    end;
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|',
    p_review_id::text,
    p_expected_lock_version::text,
    p_field_path,
    p_action,
    p_document_version::text,
    p_page_number::text,
    p_x::text,
    p_y::text,
    p_width::text,
    p_height::text,
    pg_catalog.encode(extensions.digest(coalesce(p_selected_text, ''), 'sha256'), 'hex'),
    p_extraction_method,
    pg_catalog.encode(extensions.digest(next_reviewed_data::text, 'sha256'), 'hex'),
    resolved_reason,
    coalesce(p_replaces_link_id::text, '')
  ), 'sha256'), 'hex');

  operation := private.claim_document_operation(
    p_organization_id,
    review.person_id,
    review.document_id,
    'record_review_evidence',
    p_idempotency_key,
    fingerprint,
    actor_id
  );

  if operation.status = 'completed' and operation.review_id = p_review_id then
    return query select
      p_review_id,
      (operation.result ->> 'lock_version')::integer,
      (operation.result ->> 'region_id')::uuid,
      (operation.result ->> 'link_id')::uuid,
      true;
    return;
  end if;

  return query
  select result.review_id, result.lock_version, result.region_id, result.link_id, result.reused
  from private.record_profile_review_evidence(
    p_organization_id,
    p_review_id,
    p_expected_lock_version,
    p_field_path,
    p_action,
    p_document_version,
    p_page_number,
    p_x,
    p_y,
    p_width,
    p_height,
    p_selected_text,
    p_extraction_method,
    p_reviewed_data,
    p_reason,
    p_replaces_link_id,
    p_idempotency_key
  ) result;
end;
$$;

revoke all on function public.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) from public, anon;

grant execute on function public.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) to authenticated;
