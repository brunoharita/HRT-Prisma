-- Approval must use the best recoverable review source, not be blocked by a
-- later empty technical attempt. A later useful/successful attempt still makes
-- the review stale and fails closed.

do $migration$
declare
  function_definition text;
  old_guard text := $old$
  select attempt.id into latest_attempt_id
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = review.document_id
  order by attempt.attempt_number desc limit 1;
  if latest_attempt_id is distinct from review.processing_attempt_id then
    raise exception using errcode = 'P0001', message = 'processing_base_conflict';
  end if;
$old$;
  new_guard text := $new$
  select attempt.id into latest_attempt_id
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = review.document_id
  order by attempt.attempt_number desc limit 1;
  if latest_attempt_id is distinct from review.processing_attempt_id then
    if exists (
      select 1
      from public.document_processing_attempts latest
      where latest.organization_id = p_organization_id
        and latest.id = latest_attempt_id
        and (
          latest.state not in ('failed_validation', 'failed_extraction', 'failed_ocr', 'failed_structuring')
          or latest.useful_character_count > 0
          or latest.pages_native + latest.pages_ocr > 0
        )
    ) or not exists (
      select 1
      from public.document_processing_attempts selected
      join public.extraction_drafts draft
        on draft.organization_id = selected.organization_id
       and draft.processing_attempt_id = selected.id
      where selected.organization_id = p_organization_id
        and selected.id = review.processing_attempt_id
        and selected.document_id = review.document_id
        and selected.useful_character_count > 0
        and selected.pages_native + selected.pages_ocr > 0
        and draft.status in ('valid', 'insufficient')
        and (
          selected.state in ('structured', 'profile_ready')
          or (
            selected.state = 'failed_structuring'
            and selected.failure_code = 'insufficient_structured_facts'
          )
        )
    ) then
      raise exception using errcode = 'P0001', message = 'processing_base_conflict';
    end if;
  end if;
$new$;
begin
  select pg_get_functiondef('public.approve_profile_review(uuid,uuid,integer,text)'::regprocedure)
  into function_definition;
  if position(old_guard in function_definition) = 0 then
    raise exception 'approve_profile_review processing guard has an unexpected shape';
  end if;
  execute replace(function_definition, old_guard, new_guard);
end;
$migration$;
