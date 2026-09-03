-- Forward-only correction for the current two-argument review contract normalizer.
create or replace function public.restore_profile_version(
  p_organization_id uuid, p_person_id uuid, p_profile_id uuid, p_idempotency_key text
) returns table (profile_id uuid, profile_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid; operation public.document_operations; source_profile public.professional_profiles;
  next_version integer; new_profile_id uuid; fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into source_profile from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.id = p_profile_id;
  if not found then raise exception using errcode = 'P0002', message = 'profile_version_not_found', detail = private.profile_lifecycle_feedback('profile_version_not_found'); end if;
  fingerprint := encode(extensions.digest(concat_ws('|', p_person_id::text, p_profile_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, null, 'restore_profile', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' and operation.profile_id is not null then
    return query select item.id, item.profile_version, true from public.professional_profiles item
    where item.organization_id = p_organization_id and item.id = operation.profile_id; return;
  end if;
  perform 1 from public.people item where item.organization_id = p_organization_id and item.id = p_person_id for update;
  select coalesce(max(item.profile_version), 0) + 1 into next_version from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = p_person_id;
  update public.professional_profiles set superseded_at = now()
  where organization_id = p_organization_id and person_id = p_person_id and superseded_at is null;
  insert into public.professional_profiles (
    organization_id, person_id, source_document_id, profile_data, uncertainties, not_identified,
    extraction_version, inference_version, embedding_version, prompt_version, model_version,
    processing_attempt_id, profile_version, review_status, approved_by_auth_user_id, approved_at,
    base_profile_id, publication_origin, restored_from_profile_id, source_document_snapshot
  ) values (
    p_organization_id, p_person_id, source_profile.source_document_id,
    private.normalize_profile_review_contract(source_profile.profile_data, source_profile.profile_data), source_profile.uncertainties,
    source_profile.not_identified, source_profile.extraction_version, source_profile.inference_version,
    source_profile.embedding_version, source_profile.prompt_version, source_profile.model_version,
    source_profile.processing_attempt_id, next_version, 'approved', actor_id, now(), source_profile.id,
    'restored', source_profile.id, source_profile.source_document_snapshot
  ) returning id into new_profile_id;
  update public.people set profile_state = 'generated', updated_at = now()
  where organization_id = p_organization_id and id = p_person_id;
  update public.document_operations set profile_id = new_profile_id, status = 'completed', completed_at = now(),
    result = jsonb_build_object('profile_id', new_profile_id, 'profile_version', next_version, 'restored_from_profile_id', source_profile.id)
  where id = operation.id;
  insert into public.person_ingestion_events (organization_id, person_id, actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, p_person_id, actor_id, 'profile_version_restored', 'success',
    jsonb_build_object('operation_id', operation.id, 'profile_id', new_profile_id, 'profile_version', next_version,
      'restored_from_profile_id', source_profile.id, 'restored_from_version', source_profile.profile_version));
  return query select new_profile_id, next_version, false;
end;
$$;

revoke all on function public.restore_profile_version(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.restore_profile_version(uuid, uuid, uuid, text) to authenticated;

comment on function public.restore_profile_version(uuid, uuid, uuid, text) is
  'Restores a historical snapshot through the current two-argument profile contract normalizer.';
