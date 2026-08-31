create or replace function public.invalidate_document_review(
  p_organization_id uuid,
  p_document_id uuid,
  p_idempotency_key text
)
returns table (document_id uuid, review_id uuid, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict error
declare
  v_actor_id uuid;
  v_document public.documents;
  v_review public.profile_reviews;
  v_operation public.document_operations;
  v_fingerprint text;
  v_latest_attempt_state public.processing_state;
begin
  v_actor_id := private.require_document_reviewer(p_organization_id);

  select review.* into v_review
  from public.profile_reviews review
  where review.organization_id = p_organization_id
    and review.document_id = p_document_id
    and review.state = 'draft'
  order by review.created_at desc
  limit 1
  for update;

  select document.* into v_document
  from public.documents document
  where document.organization_id = p_organization_id
    and document.id = p_document_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'document not found in organization';
  end if;
  if v_document.person_id is null then
    raise exception using errcode = '55000', message = 'document is not linked to a person';
  end if;

  if v_document.status = 'approved' or v_document.review_state = 'approved' then
    raise exception using errcode = '55000', message = 'approved document cannot be invalidated';
  end if;
  if v_document.review_state = 'invalidated' then
    select review.* into v_review
    from public.profile_reviews review
    where review.organization_id = p_organization_id
      and review.document_id = p_document_id
      and review.state = 'invalidated'
    order by review.invalidated_at desc nulls last
    limit 1;
    return query select p_document_id, v_review.id, true;
    return;
  end if;

  if v_document.review_state in ('ready_for_review', 'in_review') and v_review.id is null then
    raise exception using errcode = '55000', message = 'review must be started before invalidation';
  end if;

  if v_review.id is null then
    select attempt.state into v_latest_attempt_state
    from public.document_processing_attempts attempt
    where attempt.organization_id = p_organization_id
      and attempt.document_id = p_document_id
    order by attempt.attempt_number desc
    limit 1;
    if v_latest_attempt_state is null or v_latest_attempt_state not in (
      'failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring'
    ) then
      raise exception using errcode = '55000', message = 'only a failed or reviewable import can be invalidated';
    end if;
  end if;

  v_fingerprint := pg_catalog.encode(
    extensions.digest(pg_catalog.concat_ws('|', p_document_id::text, coalesce(v_review.id::text, 'failed-import')), 'sha256'),
    'hex'
  );
  v_operation := private.claim_document_operation(
    p_organization_id,
    v_document.person_id,
    p_document_id,
    'invalidate_review',
    p_idempotency_key,
    v_fingerprint,
    v_actor_id
  );
  if v_operation.status = 'completed' then
    return query select p_document_id, v_operation.review_id, true;
    return;
  end if;

  if v_review.id is not null then
    update public.profile_reviews
    set state = 'invalidated', invalidated_at = now(),
        last_edited_by_auth_user_id = v_actor_id, updated_at = now()
    where organization_id = p_organization_id and id = v_review.id;
  end if;

  update public.documents
  set review_state = 'invalidated'
  where organization_id = p_organization_id and id = p_document_id;

  update public.document_operations
  set review_id = v_review.id,
      status = 'completed',
      result = pg_catalog.jsonb_build_object(
        'document_id', p_document_id,
        'review_id', v_review.id,
        'history_preserved', true,
        'profile_unchanged', true
      ),
      completed_at = now(),
      updated_at = now()
  where id = v_operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id,
    v_document.person_id,
    p_document_id,
    v_review.processing_attempt_id,
    v_actor_id,
    'document_review_invalidated',
    'success',
    pg_catalog.jsonb_build_object(
      'operation_id', v_operation.id,
      'review_id', v_review.id,
      'history_preserved', true,
      'profile_unchanged', true
    )
  );

  return query select p_document_id, v_review.id, false;
end;
$$;

revoke all on function public.invalidate_document_review(uuid, uuid, text) from public, anon;
grant execute on function public.invalidate_document_review(uuid, uuid, text) to authenticated;
