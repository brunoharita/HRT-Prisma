-- Forward-only qualification of the document reference inside the table-return function.
create or replace function public.finalize_document_deletion(
  p_organization_id uuid, p_operation_id uuid
) returns table (document_id uuid, profile_version integer, profile_rebuilt boolean, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid; operation public.document_operations; target_document public.documents;
  current_profile public.professional_profiles; fallback_profile public.professional_profiles;
  new_profile_id uuid; next_version integer; rebuilt boolean := false; original_document_id uuid;
  document_evidence_ids uuid[] := '{}'::uuid[]; document_inference_ids uuid[] := '{}'::uuid[];
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into operation from public.document_operations item where item.organization_id = p_organization_id
    and item.id = p_operation_id and item.operation_type = 'delete_document' for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_deletion_operation_not_found', detail = private.profile_lifecycle_feedback('document_deletion_operation_not_found'); end if;
  original_document_id := (operation.result ->> 'document_id')::uuid;
  if operation.status = 'completed' then
    return query select original_document_id, nullif(operation.result ->> 'profile_version', '')::integer,
      coalesce((operation.result ->> 'profile_rebuilt')::boolean, false), true; return;
  end if;
  select * into target_document from public.documents item where item.organization_id = p_organization_id
    and item.id = original_document_id and item.person_id = operation.person_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_changed_before_deletion', detail = private.profile_lifecycle_feedback('document_changed_before_deletion'); end if;
  perform 1 from public.people item where item.organization_id = p_organization_id and item.id = operation.person_id for update;
  select * into current_profile from public.professional_profiles item where item.organization_id = p_organization_id
    and item.person_id = operation.person_id and item.superseded_at is null for update;
  if current_profile.id is not null and current_profile.source_document_id = original_document_id then
    select * into fallback_profile from public.professional_profiles item where item.organization_id = p_organization_id
      and item.person_id = operation.person_id and item.source_document_id is distinct from original_document_id
    order by item.profile_version desc limit 1;
    update public.professional_profiles set superseded_at = now() where id = current_profile.id;
    if fallback_profile.id is not null then
      select coalesce(max(item.profile_version), 0) + 1 into next_version from public.professional_profiles item
      where item.organization_id = p_organization_id and item.person_id = operation.person_id;
      insert into public.professional_profiles (
        organization_id, person_id, source_document_id, profile_data, uncertainties, not_identified,
        extraction_version, inference_version, embedding_version, prompt_version, model_version,
        processing_attempt_id, profile_version, review_status, approved_by_auth_user_id, approved_at,
        base_profile_id, publication_origin, source_document_snapshot
      ) values (
        p_organization_id, operation.person_id, fallback_profile.source_document_id,
        private.normalize_approved_profile_contract(fallback_profile.profile_data),
        fallback_profile.uncertainties, fallback_profile.not_identified,
        fallback_profile.extraction_version, fallback_profile.inference_version, fallback_profile.embedding_version,
        fallback_profile.prompt_version, fallback_profile.model_version, fallback_profile.processing_attempt_id,
        next_version, 'approved', actor_id, now(), current_profile.id, 'document_deletion_rebuild',
        fallback_profile.source_document_snapshot
      ) returning id into new_profile_id;
      rebuilt := true;
    else
      update public.people set profile_state = 'not_generated', updated_at = now()
      where organization_id = p_organization_id and id = operation.person_id;
    end if;
  end if;
  update public.professional_profiles profile set
    source_document_snapshot = coalesce(profile.source_document_snapshot, jsonb_build_object(
      'id', target_document.id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version, 'deletedAt', now()
    )), source_document_id = null, processing_attempt_id = null, review_id = null
  where profile.organization_id = p_organization_id and profile.source_document_id = original_document_id;
  select coalesce(array_agg(item.id), '{}'::uuid[]) into document_evidence_ids
  from public.evidence item
  where item.organization_id = p_organization_id and item.document_id = original_document_id;
  select coalesce(array_agg(distinct link.inference_id), '{}'::uuid[]) into document_inference_ids
  from public.inference_evidence link
  where link.organization_id = p_organization_id and link.evidence_id = any(document_evidence_ids);
  update public.knowledge_observations observation set
    source_snapshot = coalesce(observation.source_snapshot, jsonb_strip_nulls(jsonb_build_object(
      'documentId', original_document_id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version, 'deletedAt', now(),
      'evidenceId', observation.evidence_id, 'reviewId', observation.review_id,
      'sourceFieldPath', observation.source_field_path
    ))),
    evidence_link_id = null,
    evidence_id = null,
    review_id = null
  where observation.organization_id = p_organization_id and (
    observation.evidence_id = any(document_evidence_ids)
    or observation.review_id in (
      select item.id from public.profile_reviews item
      where item.organization_id = p_organization_id and item.document_id = original_document_id
    )
  );
  update public.knowledge_inbox inbox set evidence_reference_ids = coalesce((
    select array_agg(reference_id)
    from unnest(inbox.evidence_reference_ids) reference_id
    where not (reference_id = any(document_evidence_ids))
  ), '{}'::uuid[])
  where document_evidence_ids <> '{}'::uuid[]
    and inbox.evidence_reference_ids && document_evidence_ids;
  delete from public.resume_intakes where organization_id = p_organization_id and resolved_document_id = original_document_id;
  delete from public.profile_publication_removals removal where removal.organization_id = p_organization_id
    and removal.review_id in (
      select review.id from public.profile_reviews review
      where review.organization_id = p_organization_id and review.document_id = original_document_id
    );
  delete from public.documents where organization_id = p_organization_id and id = original_document_id;
  delete from public.inferences inference
  where inference.organization_id = p_organization_id
    and inference.id = any(document_inference_ids)
    and not exists (
      select 1 from public.inference_evidence link
      where link.organization_id = p_organization_id and link.inference_id = inference.id
    );
  update public.document_operations set status = 'completed', completed_at = now(), result = result || jsonb_build_object(
    'profile_rebuilt', rebuilt, 'profile_id', new_profile_id, 'profile_version', next_version, 'deleted_at', now()
  ) where id = p_operation_id;
  insert into public.person_ingestion_events (organization_id, person_id, actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, operation.person_id, actor_id, 'document_deleted', 'success',
    jsonb_build_object('operation_id', p_operation_id, 'document_id', original_document_id,
      'filename', target_document.filename, 'profile_rebuilt', rebuilt));
  if rebuilt then
    insert into public.person_ingestion_events (organization_id, person_id, actor_auth_user_id, event_type, result, metadata)
    values (p_organization_id, operation.person_id, actor_id, 'profile_rebuilt_after_document_deletion', 'success',
      jsonb_build_object('operation_id', p_operation_id, 'profile_id', new_profile_id, 'profile_version', next_version));
  end if;
  return query select original_document_id, next_version, rebuilt, false;
end;
$$;

revoke all on function public.finalize_document_deletion(uuid, uuid) from public, anon;
grant execute on function public.finalize_document_deletion(uuid, uuid) to authenticated;

comment on function public.finalize_document_deletion(uuid, uuid) is
  'Finalizes Storage deletion with qualified audit references and preserves historical profile and Knowledge provenance.';
