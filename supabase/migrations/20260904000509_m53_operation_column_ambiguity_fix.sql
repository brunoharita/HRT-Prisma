-- Forward-only fix for ambiguities reported by PostgreSQL plpgsql_check.
begin;

create or replace function public.publish_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_publication_mode text,
  p_block_decisions jsonb,
  p_idempotency_key text
)
returns table (review_id uuid, profile_id uuid, profile_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  review public.profile_reviews;
  base_profile_data jsonb := '{}'::jsonb;
  proposal_profile_data jsonb;
  final_profile_data jsonb;
  publication record;
  block_decision jsonb;
  removal_payload jsonb := '[]'::jsonb;
  inner_key text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_publication_mode not in ('merge', 'replace') then
    raise exception using errcode = '22023', message = 'profile_publication_mode_required',
      detail = private.profile_lifecycle_feedback('profile_publication_mode_required');
  end if;

  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  if review.base_profile_id is not null then
    select profile.profile_data into base_profile_data from public.professional_profiles profile
    where profile.organization_id = p_organization_id and profile.id = review.base_profile_id
      and profile.person_id = review.person_id;
    if not found then raise exception using errcode = 'P0001', message = 'profile_base_conflict'; end if;
  end if;

  proposal_profile_data := review.reviewed_data - 'identity' - 'contact';
  perform private.validate_profile_block_decisions(base_profile_data, proposal_profile_data, p_block_decisions);

  for block_decision in select item.value from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) item(value) loop
    if block_decision ->> 'action' = 'remove' then
      removal_payload := removal_payload || jsonb_build_array(jsonb_build_object(
        'fieldPath', block_decision ->> 'fieldPath',
        'previousValue', block_decision -> 'previousValue',
        'reason', 'Remoção decidida na comparação do perfil'
      ));
    end if;
  end loop;

  if review.state = 'draft' then
    if review.lock_version <> p_expected_lock_version then
      raise exception using errcode = 'P0001', message = 'review_conflict';
    end if;
    final_profile_data := case p_publication_mode
      when 'replace' then proposal_profile_data
      else private.merge_profile_publication_delta(base_profile_data, proposal_profile_data, removal_payload)
    end;
    final_profile_data := private.apply_profile_block_decisions(base_profile_data, final_profile_data, p_block_decisions);
    update public.profile_reviews set reviewed_data = jsonb_build_object(
      'identity', coalesce(review.reviewed_data -> 'identity', '{}'::jsonb),
      'contact', coalesce(review.reviewed_data -> 'contact', '{}'::jsonb)
    ) || final_profile_data, last_edited_by_auth_user_id = actor_id
    where organization_id = p_organization_id and id = p_review_id;
  end if;

  inner_key := p_idempotency_key || ':' || p_publication_mode || ':' ||
    encode(extensions.digest(coalesce(p_block_decisions, '[]'::jsonb)::text, 'sha256'), 'hex');
  select * into publication from public.approve_profile_review(
    p_organization_id, p_review_id, p_expected_lock_version, inner_key
  );

  update public.professional_profiles set publication_origin = case p_publication_mode
    when 'replace' then 'review_replace' else 'review_merge' end
  where organization_id = p_organization_id and id = publication.profile_id;

  insert into public.profile_publication_decisions (
    organization_id, person_id, review_id, approved_profile_id, field_path, action,
    resolver, source_block_id, target_block_id, actor_auth_user_id
  ) select p_organization_id, review.person_id, p_review_id, publication.profile_id,
    item.value ->> 'fieldPath', item.value ->> 'action', coalesce(item.value ->> 'resolver', 'ambiguous'),
    item.value ->> 'sourceBlockId', item.value ->> 'targetBlockId', actor_id
  from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) item(value)
  on conflict (organization_id, review_id, field_path) do nothing;

  insert into public.profile_publication_removals (
    organization_id, person_id, review_id, approved_profile_id, field_path,
    previous_value, reason, actor_auth_user_id
  ) select p_organization_id, review.person_id, p_review_id, publication.profile_id,
    item.value ->> 'fieldPath', item.value -> 'previousValue', item.value ->> 'reason', actor_id
  from jsonb_array_elements(removal_payload) item(value)
  on conflict (organization_id, review_id, field_path) do nothing;

  if not publication.reused then
    insert into public.person_ingestion_events (
      organization_id, person_id, document_id, processing_attempt_id, actor_auth_user_id,
      event_type, result, metadata
    ) values (
      p_organization_id, review.person_id, review.document_id, review.processing_attempt_id, actor_id,
      case p_publication_mode when 'replace' then 'profile_published_replace' else 'profile_published_merge' end,
      'success', jsonb_build_object('review_id', p_review_id, 'profile_id', publication.profile_id,
        'profile_version', publication.profile_version, 'mode', p_publication_mode,
        'decision_count', jsonb_array_length(coalesce(p_block_decisions, '[]'::jsonb)))
    );
    insert into public.person_ingestion_events (
      organization_id, person_id, document_id, processing_attempt_id, actor_auth_user_id,
      event_type, result, metadata
    ) select p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
      actor_id, case item.value ->> 'action'
        when 'add' then 'profile_block_added'
        when 'update' then 'profile_block_updated'
        when 'replace' then 'profile_block_replaced'
        when 'remove' then 'profile_block_removed'
        else 'profile_block_maintained' end,
      'success', jsonb_build_object('profile_id', publication.profile_id,
        'field_path', item.value ->> 'fieldPath', 'resolver', item.value ->> 'resolver',
        'source_block_id', item.value ->> 'sourceBlockId', 'target_block_id', item.value ->> 'targetBlockId')
    from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) item(value);
  end if;
  return query select publication.review_id, publication.profile_id, publication.profile_version, publication.reused;
end;
$$;

revoke all on function public.publish_profile_review(uuid, uuid, integer, text, jsonb, text) from public, anon;
grant execute on function public.publish_profile_review(uuid, uuid, integer, text, jsonb, text) to authenticated;

create or replace function public.move_person_document(
  p_organization_id uuid, p_document_id uuid, p_target_person_id uuid, p_idempotency_key text
)
returns table (document_id uuid, source_person_id uuid, target_person_id uuid, current_profile_affected boolean, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  target_document public.documents;
  destination public.people;
  operation public.document_operations;
  source_id uuid;
  affects_current boolean;
  target_document_version integer;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into target_document from public.documents item
  where item.organization_id = p_organization_id and item.id = p_document_id for update;
  if not found or target_document.person_id is null then raise exception using errcode = 'P0002', message = 'document_not_found',
    detail = private.m53_feedback('O documento não está mais vinculado a uma Pessoa.', 'Atualize a tela e escolha outro documento.'); end if;
  source_id := target_document.person_id;
  if source_id = p_target_person_id then
    return query select p_document_id, source_id, p_target_person_id, false, true; return;
  end if;
  select * into destination from public.people item
  where item.organization_id = p_organization_id and item.id = p_target_person_id
    and item.operational_status = 'active' for update;
  if not found then raise exception using errcode = 'P0002', message = 'target_person_not_available',
    detail = private.m53_feedback('A Pessoa de destino não está disponível para receber o documento.', 'Escolha outra Pessoa ativa.'); end if;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_document_id::text, source_id::text, p_target_person_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, source_id, p_document_id,
    'move_document', p_idempotency_key, fingerprint, actor_id);
  update public.document_operations item set target_person_id = p_target_person_id where item.id = operation.id;
  if operation.status = 'completed' then
    return query select p_document_id, source_id, p_target_person_id,
      coalesce((operation.result ->> 'current_profile_affected')::boolean, false), true; return;
  end if;
  select exists (select 1 from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = source_id
      and item.source_document_id = p_document_id and item.superseded_at is null) into affects_current;
  update public.profile_reviews item set state = 'invalidated', invalidated_at = now(), last_edited_by_auth_user_id = actor_id
  where item.organization_id = p_organization_id and item.document_id = p_document_id and item.state = 'draft';
  target_document_version := private.reassign_document_person(p_organization_id, p_document_id, p_target_person_id);
  update public.documents item set review_state = 'ready_for_review', status = 'ready_for_review', updated_at = now()
  where item.organization_id = p_organization_id and item.id = p_document_id;
  update public.document_operations item set status = 'completed', completed_at = now(), result = jsonb_build_object(
    'source_person_id', source_id, 'target_person_id', p_target_person_id,
    'current_profile_affected', affects_current, 'history_preserved', true,
    'previous_document_version', target_document.document_version,
    'target_document_version', target_document_version
  ) where item.id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_target_person_id, p_document_id, actor_id, 'document_person_corrected', 'success',
    jsonb_build_object('operation_id', operation.id, 'source_person_id', source_id,
      'target_person_id', p_target_person_id, 'current_profile_affected', affects_current,
      'previous_document_version', target_document.document_version,
      'target_document_version', target_document_version)
  );
  return query select p_document_id, source_id, p_target_person_id, affects_current, false;
end;
$$;

revoke all on function public.move_person_document(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.move_person_document(uuid, uuid, uuid, text) to authenticated;

commit;
