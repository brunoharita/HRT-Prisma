begin;

do $qa$
declare
  base_profile jsonb := '{"summary":"Resumo aprovado","competencies":["SQL","BPM"],"experiences":[{"id":"experience_current001","role":"Diretor","organization":"HRT","period":"2025 - Atual","description":"Base aprovada","source":"human"}]}'::jsonb;
  proposal_profile jsonb := '{"summary":"Resumo novo","competencies":["SQL"],"experiences":[{"id":"experience_source001","role":"Diretor","organization":"HRT","period":"2025 - Atual","description":"Proposta nova","source":"extracted"}]}'::jsonb;
  keep_decisions jsonb := '[
    {"fieldPath":"summary","action":"keep","resolver":"same_block","sourceBlockId":null,"targetBlockId":null},
    {"fieldPath":"competencies::bpm","action":"keep","resolver":"ambiguous","sourceBlockId":null,"targetBlockId":null},
    {"fieldPath":"experiences::experience_current001","action":"keep","resolver":"same_block","sourceBlockId":"experience_source001","targetBlockId":"experience_current001"}
  ]'::jsonb;
  remove_decisions jsonb := '[
    {"fieldPath":"summary","action":"remove","resolver":"same_block","sourceBlockId":null,"targetBlockId":null},
    {"fieldPath":"competencies::sql","action":"remove","resolver":"same_block","sourceBlockId":null,"targetBlockId":null},
    {"fieldPath":"experiences::experience_current001","action":"remove","resolver":"same_block","sourceBlockId":"experience_source001","targetBlockId":"experience_current001"}
  ]'::jsonb;
  candidate jsonb;
  result jsonb;
  feedback_detail text;
begin
  candidate := private.merge_profile_publication_delta(base_profile, proposal_profile, '[]'::jsonb);
  result := private.apply_profile_block_decisions(base_profile, candidate, keep_decisions);
  if result ->> 'summary' <> 'Resumo aprovado'
    or not (result -> 'competencies' ? 'BPM')
    or result #>> '{experiences,0,description}' <> 'Base aprovada'
  then raise exception 'keep decisions did not preserve the approved values'; end if;

  result := private.apply_profile_block_decisions(base_profile, proposal_profile, keep_decisions);
  if result ->> 'summary' <> 'Resumo aprovado'
    or not (result -> 'competencies' ? 'BPM')
    or result #>> '{experiences,0,id}' <> 'experience_current001'
  then raise exception 'replace mode did not honor explicit keep decisions'; end if;

  result := private.apply_profile_block_decisions(base_profile, candidate, remove_decisions);
  if result -> 'summary' <> 'null'::jsonb
    or result -> 'competencies' ? 'SQL'
    or jsonb_array_length(result -> 'experiences') <> 0
  then raise exception 'remove decisions were not applied to the new profile'; end if;

  begin
    perform private.validate_profile_block_decisions(base_profile, proposal_profile, '[{"fieldPath":"experiences::missing","action":"update","resolver":"same_block","sourceBlockId":"experience_source001","targetBlockId":"missing"}]'::jsonb);
    raise exception 'an unknown target was accepted';
  exception when sqlstate '22023' then
    get stacked diagnostics feedback_detail = pg_exception_detail;
    if feedback_detail::jsonb ->> 'reason' <> 'profile_block_target_not_found'
      or feedback_detail::jsonb ->> 'fieldPath' <> 'experiences::missing'
    then raise exception 'the invalid target did not return actionable feedback'; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_person_id uuid;
  v_profile_id uuid;
  profile_count integer;
  restored record;
  replayed record;
  reset_result record;
begin
  select membership.user_id, membership.organization_id, profile.person_id, profile.id
  into v_actor_id, v_organization_id, v_person_id, v_profile_id
  from public.organization_memberships membership
  join public.professional_profiles profile on profile.organization_id = membership.organization_id
  where membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
  order by profile.created_at desc limit 1;
  if not found then raise exception 'an approved profile with an authorized reviewer is required'; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);
  select count(*) into profile_count from public.professional_profiles item
  where item.organization_id = v_organization_id and item.person_id = v_person_id;

  begin
    select * into restored from public.restore_profile_version(
      v_organization_id, v_person_id, v_profile_id, 'qa:profile-lifecycle:restore:0001'
    );
    select * into replayed from public.restore_profile_version(
      v_organization_id, v_person_id, v_profile_id, 'qa:profile-lifecycle:restore:0001'
    );
    if restored.reused or not replayed.reused or restored.profile_id <> replayed.profile_id
      or restored.profile_version <> replayed.profile_version
    then raise exception 'restore replay created a duplicate version'; end if;
    raise exception 'qa_rollback_restore';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_restore' then raise; end if;
  end;

  begin
    select * into reset_result from public.reset_person_profile(
      v_organization_id, v_person_id, 'qa:profile-lifecycle:reset:000001'
    );
    if reset_result.reused
      or exists (select 1 from public.professional_profiles item where item.organization_id = v_organization_id and item.person_id = v_person_id and item.superseded_at is null)
      or (select count(*) from public.professional_profiles item where item.organization_id = v_organization_id and item.person_id = v_person_id) <> profile_count
    then raise exception 'reset did not preserve the immutable profile history'; end if;
    raise exception 'qa_rollback_reset';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_reset' then raise; end if;
  end;
end;
$qa$;

do $qa$
declare
  v_actor_id uuid;
  v_organization_id uuid;
  v_person_id uuid;
  v_document_id uuid;
  operation record;
  finalized record;
  evidence_ids uuid[];
  observation_ids uuid[];
  demonstrated_count bigint;
begin
  select membership.user_id, membership.organization_id, document.person_id, document.id
  into v_actor_id, v_organization_id, v_person_id, v_document_id
  from public.organization_memberships membership
  join public.documents document on document.organization_id = membership.organization_id and document.person_id is not null
  where membership.role in ('super_admin', 'owner', 'admin', 'recruiter')
  order by (exists (
    select 1 from public.professional_profiles profile
    where profile.organization_id = document.organization_id and profile.source_document_id = document.id and profile.superseded_at is null
  )) desc, document.created_at desc limit 1;
  if not found then raise exception 'a document with an authorized reviewer is required'; end if;
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);
  select coalesce(array_agg(item.id), '{}'::uuid[]) into evidence_ids from public.evidence item
  where item.organization_id = v_organization_id and item.document_id = v_document_id;
  select coalesce(array_agg(item.id), '{}'::uuid[]) into observation_ids from public.knowledge_observations item
  where item.organization_id = v_organization_id and (
    item.evidence_id = any(evidence_ids)
    or item.review_id in (select review.id from public.profile_reviews review where review.organization_id = v_organization_id and review.document_id = v_document_id)
  );
  select count(*) into demonstrated_count from public.competency_demonstrated_evidence item
  where item.organization_id = v_organization_id and item.person_id = v_person_id;

  begin
    select * into operation from public.prepare_document_deletion(
      v_organization_id, v_person_id, v_document_id, 'qa:profile-lifecycle:delete:00001'
    );
    select * into finalized from public.finalize_document_deletion(v_organization_id, operation.operation_id);
    if finalized.reused or exists (select 1 from public.documents item where item.organization_id = v_organization_id and item.id = v_document_id)
    then raise exception 'document deletion did not reach the authoritative final state'; end if;
    if exists (
      select 1 from public.knowledge_observations item
      where item.id = any(observation_ids) and (item.source_snapshot is null or item.evidence_id is not null or item.review_id is not null or item.evidence_link_id is not null)
    ) then raise exception 'Knowledge provenance was lost or left pointing to deleted rows'; end if;
    if (select count(*) from public.knowledge_observations item where item.id = any(observation_ids)) <> cardinality(observation_ids)
    then raise exception 'Knowledge observations were removed with the document'; end if;
    if (select count(*) from public.competency_demonstrated_evidence item where item.organization_id = v_organization_id and item.person_id = v_person_id) <> demonstrated_count
    then raise exception 'demonstrated evidence changed during document deletion'; end if;
    if exists (
      select 1 from public.knowledge_inbox inbox
      where inbox.evidence_reference_ids && evidence_ids
    ) then raise exception 'Knowledge Inbox retained an orphan evidence reference'; end if;
    raise exception 'qa_rollback_delete';
  exception when raise_exception then
    if sqlerrm <> 'qa_rollback_delete' then raise; end if;
  end;
end;
$qa$;

select
  not pg_catalog.has_function_privilege('anon', 'public.restore_profile_version(uuid,uuid,uuid,text)', 'EXECUTE') as anon_restore_denied,
  not pg_catalog.has_function_privilege('anon', 'public.reset_person_profile(uuid,uuid,text)', 'EXECUTE') as anon_reset_denied,
  not pg_catalog.has_function_privilege('anon', 'public.prepare_document_deletion(uuid,uuid,uuid,text)', 'EXECUTE') as anon_delete_denied,
  pg_catalog.has_function_privilege('authenticated', 'public.publish_profile_review(uuid,uuid,integer,text,jsonb,text)', 'EXECUTE') as authenticated_publish_allowed,
  not pg_catalog.has_function_privilege('authenticated', 'private.apply_profile_block_decisions(jsonb,jsonb,jsonb)', 'EXECUTE') as private_decision_core_denied;

rollback;
