-- Forward-only qualification of columns that overlap the table-return contract.
create or replace function public.reset_person_profile(
  p_organization_id uuid, p_person_id uuid, p_idempotency_key text
) returns table (person_id uuid, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare actor_id uuid; operation public.document_operations; fingerprint text; current_profile uuid;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  fingerprint := encode(extensions.digest(p_person_id::text, 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, null, 'reset_profile', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' then return query select p_person_id, true; return; end if;
  perform 1 from public.people item where item.organization_id = p_organization_id and item.id = p_person_id for update;
  update public.professional_profiles profile set superseded_at = now()
  where profile.organization_id = p_organization_id and profile.person_id = p_person_id and profile.superseded_at is null
  returning profile.id into current_profile;
  update public.people person set profile_state = 'not_generated', updated_at = now()
  where person.organization_id = p_organization_id and person.id = p_person_id;
  update public.document_operations item set status = 'completed', completed_at = now(),
    result = jsonb_build_object('person_id', p_person_id, 'previous_profile_id', current_profile) where item.id = operation.id;
  insert into public.person_ingestion_events (organization_id, person_id, actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, p_person_id, actor_id, 'profile_reset', 'success',
    jsonb_build_object('operation_id', operation.id, 'previous_profile_id', current_profile));
  return query select p_person_id, false;
end;
$$;

revoke all on function public.reset_person_profile(uuid, uuid, text) from public, anon;
grant execute on function public.reset_person_profile(uuid, uuid, text) to authenticated;

comment on function public.reset_person_profile(uuid, uuid, text) is
  'Removes only the current-profile pointer while preserving person, documents and version history.';
