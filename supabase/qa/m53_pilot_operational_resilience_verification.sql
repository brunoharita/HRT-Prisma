begin;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_person_id uuid;
  v_profile_id uuid;
  first_review record;
  replay_review record;
begin
  select membership.user_id, profile.organization_id, profile.person_id, profile.id
  into v_actor_id, v_organization_id, v_person_id, v_profile_id
  from public.professional_profiles profile
  join public.organization_memberships membership on membership.organization_id = profile.organization_id
  join public.people person on person.organization_id = profile.organization_id and person.id = profile.person_id
  where membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
    and person.operational_status = 'active'
  order by profile.profile_version desc limit 1;
  if not found then raise exception 'an active person with a profile and reviewer is required'; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);

  begin
    select * into first_review from public.start_profile_version_review(
      v_organization_id, v_person_id, v_profile_id, 'qa:m53:profile-source-review:0001'
    );
    select * into replay_review from public.start_profile_version_review(
      v_organization_id, v_person_id, v_profile_id, 'qa:m53:profile-source-review:0001'
    );
    if first_review.reused or not replay_review.reused or first_review.review_id <> replay_review.review_id then
      raise exception 'profile source review replay created a duplicate';
    end if;
    if not exists (select 1 from public.profile_reviews review where review.id = first_review.review_id
      and review.source_kind = 'profile' and review.source_profile_id = v_profile_id) then
      raise exception 'profile source review did not preserve its immutable source';
    end if;
    raise exception 'qa_rollback_profile_source';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_profile_source' then raise; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_person_id uuid;
  v_document_id uuid;
  v_current_profile_id uuid;
  v_current_version integer;
  profile_count integer;
  deletion_preview record;
  deletion_operation record;
  deletion_result record;
  restored record;
begin
  select membership.user_id, profile.organization_id, profile.person_id,
    profile.source_document_id, profile.id, profile.profile_version
  into v_actor_id, v_organization_id, v_person_id, v_document_id, v_current_profile_id, v_current_version
  from public.professional_profiles profile
  join public.organization_memberships membership on membership.organization_id = profile.organization_id
  join public.people person on person.organization_id = profile.organization_id and person.id = profile.person_id
  where membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
    and profile.superseded_at is null and profile.source_document_id is not null
    and person.operational_status = 'active'
  order by profile.profile_version desc limit 1;
  if not found then raise exception 'a current document-backed profile is required'; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);
  select count(*) into profile_count from public.professional_profiles profile
  where profile.organization_id = v_organization_id and profile.person_id = v_person_id;

  begin
    select * into deletion_preview from public.preview_document_deletion(v_organization_id, v_person_id, v_document_id);
    if not deletion_preview.current_profile_preserved then raise exception 'preflight did not promise current profile preservation'; end if;
    select * into deletion_operation from public.prepare_document_deletion(
      v_organization_id, v_person_id, v_document_id, 'qa:m53:delete-preserve:000001'
    );
    select * into deletion_result from public.finalize_document_deletion(v_organization_id, deletion_operation.operation_id);
    if deletion_result.profile_rebuilt or deletion_result.profile_version <> v_current_version then
      raise exception 'document deletion rewrote or replaced the current profile';
    end if;
    if not exists (select 1 from public.professional_profiles profile where profile.id = v_current_profile_id
      and profile.superseded_at is null and profile.source_document_id is null
      and profile.source_document_snapshot ->> 'id' = v_document_id::text) then
      raise exception 'current profile snapshot was not preserved after deletion';
    end if;
    if (select count(*) from public.professional_profiles profile
      where profile.organization_id = v_organization_id and profile.person_id = v_person_id) <> profile_count then
      raise exception 'document deletion changed the number of profile versions';
    end if;
    select * into restored from public.restore_profile_version(
      v_organization_id, v_person_id, v_current_profile_id, 'qa:m53:restore-deleted-source:001'
    );
    if restored.profile_version <> v_current_version + 1 then
      raise exception 'restoring the preserved version did not create the next version';
    end if;
    raise exception 'qa_rollback_delete_restore';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_delete_restore' then raise; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_source_person_id uuid;
  v_target_person_id uuid;
  v_document_id uuid;
  moved record;
begin
  select membership.user_id, source.organization_id, source.id, target.id, document.id
  into v_actor_id, v_organization_id, v_source_person_id, v_target_person_id, v_document_id
  from public.people source
  join public.documents document on document.organization_id = source.organization_id and document.person_id = source.id
  join public.organization_memberships membership on membership.organization_id = source.organization_id
    and membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
  join lateral (
    select candidate.id from public.people candidate
    where candidate.organization_id = source.organization_id and candidate.id <> source.id
      and candidate.operational_status = 'active'
    order by candidate.created_at limit 1
  ) target on true
  where source.operational_status = 'active'
  order by document.created_at desc limit 1;
  if not found then return; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);

  begin
    select * into moved from public.move_person_document(
      v_organization_id, v_document_id, v_target_person_id, 'qa:m53:move-document:000001'
    );
    if moved.source_person_id <> v_source_person_id or moved.target_person_id <> v_target_person_id then
      raise exception 'document move returned the wrong people';
    end if;
    if exists (select 1 from public.document_processing_attempts item where item.document_id = v_document_id and item.person_id <> v_target_person_id)
      or exists (select 1 from public.document_page_extractions item where item.document_id = v_document_id and item.person_id <> v_target_person_id)
      or exists (select 1 from public.extraction_drafts item where item.document_id = v_document_id and item.person_id <> v_target_person_id)
      or exists (select 1 from public.evidence item where item.document_id = v_document_id and item.person_id <> v_target_person_id)
      or exists (select 1 from public.profile_reviews item where item.document_id = v_document_id and item.person_id <> v_target_person_id)
    then raise exception 'document-scoped history did not move atomically'; end if;
    raise exception 'qa_rollback_move';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_move' then raise; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_source_person_id uuid;
  v_target_person_id uuid;
  v_source_document_count integer;
  v_source_profile_count integer;
  merged record;
  replayed record;
begin
  select membership.user_id, source.organization_id, source.id, target.id
  into v_actor_id, v_organization_id, v_source_person_id, v_target_person_id
  from public.people source
  join public.organization_memberships membership on membership.organization_id = source.organization_id
    and membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
  join lateral (
    select candidate.id from public.people candidate
    where candidate.organization_id = source.organization_id and candidate.id <> source.id
      and candidate.operational_status = 'active'
    order by candidate.created_at limit 1
  ) target on true
  where source.operational_status = 'active'
  order by source.created_at desc limit 1;
  if not found then return; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);
  select count(*) into v_source_document_count from public.documents item
  where item.organization_id = v_organization_id and item.person_id = v_source_person_id;
  select count(*) into v_source_profile_count from public.professional_profiles item
  where item.organization_id = v_organization_id and item.person_id = v_source_person_id;

  begin
    select * into merged from public.merge_people(
      v_organization_id, v_source_person_id, v_target_person_id,
      jsonb_build_object('email', 'target', 'phone_e164', 'target', 'birth_date', 'target'),
      'target', 'qa:m53:merge-people:000001'
    );
    select * into replayed from public.merge_people(
      v_organization_id, v_source_person_id, v_target_person_id,
      jsonb_build_object('email', 'target', 'phone_e164', 'target', 'birth_date', 'target'),
      'target', 'qa:m53:merge-people:000001'
    );
    if merged.reused or not replayed.reused
      or merged.primary_person_id <> replayed.primary_person_id
      or merged.absorbed_person_id <> replayed.absorbed_person_id then
      raise exception 'merge replay was not idempotent';
    end if;
    if not exists (select 1 from public.people item where item.id = v_source_person_id
      and item.operational_status = 'merged' and item.merged_into_person_id = v_target_person_id) then
      raise exception 'absorbed person did not retain the merged redirect';
    end if;
    if (select count(*) from public.documents item where item.organization_id = v_organization_id
      and item.person_id = v_target_person_id) < v_source_document_count then
      raise exception 'source documents were not preserved on the primary person';
    end if;
    if (select count(*) from public.professional_profiles item where item.organization_id = v_organization_id
      and item.person_id = v_source_person_id) <> v_source_profile_count then
      raise exception 'merge erased immutable source profile history';
    end if;
    raise exception 'qa_rollback_merge';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_merge' then raise; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_person_id uuid;
  v_updated_at timestamptz;
  v_cross_tenant_denied boolean := false;
  v_stale_write_denied boolean := false;
begin
  select membership.user_id, person.organization_id, person.id, person.updated_at
  into v_actor_id, v_organization_id, v_person_id, v_updated_at
  from public.people person
  join public.organization_memberships membership on membership.organization_id = person.organization_id
    and membership.role in ('owner', 'admin', 'recruiter')
  where person.operational_status = 'active'
    and not exists (
      select 1 from public.platform_users elevated
      where elevated.auth_user_id = membership.user_id and elevated.access_profile = 'super_admin'
    )
  order by person.updated_at desc limit 1;
  if not found then return; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);

  begin
    perform public.preview_document_deletion(gen_random_uuid(), v_person_id, gen_random_uuid());
  exception when insufficient_privilege then
    v_cross_tenant_denied := true;
  end;
  if not v_cross_tenant_denied then raise exception 'cross-tenant request was not denied'; end if;

  begin
    perform public.update_person_lifecycle(
      v_organization_id, v_person_id, 'candidate', v_updated_at - interval '1 second',
      'qa:m53:stale-person-state:000001'
    );
  exception when raise_exception then
    if sqlerrm = 'person_state_conflict' then v_stale_write_denied := true; else raise; end if;
  end;
  if not v_stale_write_denied then raise exception 'stale person state was not denied'; end if;
end;
$qa$;

select
  not pg_catalog.has_function_privilege('anon', 'public.start_profile_version_review(uuid,uuid,uuid,text)', 'EXECUTE') as anon_profile_review_denied,
  not pg_catalog.has_function_privilege('anon', 'public.start_document_revision(uuid,uuid,uuid,uuid,text)', 'EXECUTE') as anon_document_review_denied,
  not pg_catalog.has_function_privilege('anon', 'public.preview_document_deletion(uuid,uuid,uuid)', 'EXECUTE') as anon_preflight_denied,
  not pg_catalog.has_function_privilege('anon', 'public.move_person_document(uuid,uuid,uuid,text)', 'EXECUTE') as anon_move_denied,
  not pg_catalog.has_function_privilege('anon', 'public.merge_people(uuid,uuid,uuid,jsonb,text,text)', 'EXECUTE') as anon_merge_denied,
  not pg_catalog.has_function_privilege('authenticated', 'private.reassign_document_person(uuid,uuid,uuid)', 'EXECUTE') as private_move_core_denied;

rollback;
