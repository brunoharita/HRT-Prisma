-- Complete, reversible Profile and document lifecycle.
-- Reuses the immutable profile versions, document operation ledger and ingestion event stream.

alter table public.professional_profiles
  add column publication_origin text not null default 'legacy'
    check (publication_origin in ('legacy', 'review_merge', 'review_replace', 'restored', 'document_deletion_rebuild')),
  add column restored_from_profile_id uuid,
  add column source_document_snapshot jsonb
    check (source_document_snapshot is null or jsonb_typeof(source_document_snapshot) = 'object');

alter table public.professional_profiles alter column source_document_id drop not null;

alter table public.knowledge_observations
  add column source_snapshot jsonb
    check (source_snapshot is null or jsonb_typeof(source_snapshot) = 'object');
alter table public.knowledge_observations drop constraint if exists knowledge_observations_trace_check;
alter table public.knowledge_observations add constraint knowledge_observations_trace_check
  check (evidence_id is not null or review_id is not null or source_snapshot is not null);

alter table public.professional_profiles
  add constraint professional_profiles_restored_from_fk
  foreign key (organization_id, restored_from_profile_id)
  references public.professional_profiles(organization_id, id) on delete restrict;

alter table public.document_operations drop constraint if exists document_operations_operation_type_check;
alter table public.document_operations add constraint document_operations_operation_type_check check (operation_type in (
  'register_document', 'persist_extraction', 'retry_processing', 'record_failure',
  'start_review', 'save_review_draft', 'approve_review', 'invalidate_review',
  'record_review_evidence', 'retire_review_evidence', 'restore_profile',
  'reset_profile', 'delete_document'
));

-- Audit rows must outlive a physically deleted document.
alter table public.document_operations drop constraint if exists document_operations_organization_id_document_id_fkey;
alter table public.document_operations add constraint document_operations_document_lifecycle_fk
  foreign key (organization_id, document_id)
  references public.documents(organization_id, id) on delete set null (document_id);
alter table public.document_operations drop constraint if exists document_operations_organization_id_processing_attempt_id_fkey;
alter table public.document_operations add constraint document_operations_attempt_lifecycle_fk
  foreign key (organization_id, processing_attempt_id)
  references public.document_processing_attempts(organization_id, id) on delete set null (processing_attempt_id);
alter table public.document_operations drop constraint if exists document_operations_organization_id_review_id_fkey;
alter table public.document_operations add constraint document_operations_review_lifecycle_fk
  foreign key (organization_id, review_id)
  references public.profile_reviews(organization_id, id) on delete set null (review_id);

alter table public.person_ingestion_events drop constraint if exists person_ingestion_events_organization_id_document_id_fkey;
alter table public.person_ingestion_events add constraint person_ingestion_events_document_lifecycle_fk
  foreign key (organization_id, document_id)
  references public.documents(organization_id, id) on delete set null (document_id);
alter table public.person_ingestion_events drop constraint if exists person_ingestion_events_organization_id_processing_attempt_id_fkey;
alter table public.person_ingestion_events add constraint person_ingestion_events_attempt_lifecycle_fk
  foreign key (organization_id, processing_attempt_id)
  references public.document_processing_attempts(organization_id, id) on delete set null (processing_attempt_id);

create table public.profile_publication_decisions (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  person_id uuid not null,
  review_id uuid not null,
  approved_profile_id uuid not null,
  field_path text not null,
  action text not null check (action in ('add', 'update', 'replace', 'keep', 'remove')),
  resolver text not null check (resolver in ('same_block', 'new_block', 'ambiguous')),
  source_block_id text,
  target_block_id text,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, review_id, field_path),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, review_id) references public.profile_reviews(organization_id, id) on delete cascade,
  foreign key (organization_id, approved_profile_id) references public.professional_profiles(organization_id, id) on delete cascade,
  check ((action in ('update', 'replace') and target_block_id is not null) or action not in ('update', 'replace'))
);

alter table public.profile_publication_decisions enable row level security;
create policy profile_publication_decisions_select on public.profile_publication_decisions
for select to authenticated using ((select private.has_org_role(
  organization_id, array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
)));
revoke all on public.profile_publication_decisions from public, anon, authenticated;
grant select on public.profile_publication_decisions to authenticated;
revoke all on sequence public.profile_publication_decisions_id_seq from public, anon, authenticated;

create or replace function private.profile_lifecycle_feedback(p_reason text, p_field_path text default null)
returns text language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'contract', 'operation-feedback-2.0.0',
    'reason', p_reason,
    'fieldPath', p_field_path,
    'itemNumber', null
  )::text
$$;
revoke all on function private.profile_lifecycle_feedback(text, text) from public, anon, authenticated;

create or replace function private.validate_profile_block_decisions(
  p_base jsonb, p_proposal jsonb, p_decisions jsonb
) returns void language plpgsql immutable set search_path = '' as $$
declare
  decision jsonb;
  root text;
  target text;
  source_id text;
  action_value text;
  resolver_value text;
  target_item jsonb;
  source_item jsonb;
begin
  if jsonb_typeof(coalesce(p_decisions, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'profile_block_decisions_invalid',
      detail = private.profile_lifecycle_feedback('profile_block_decisions_invalid');
  end if;
  if jsonb_array_length(coalesce(p_decisions, '[]'::jsonb)) > 500 then
    raise exception using errcode = '22023', message = 'profile_block_decisions_too_many',
      detail = private.profile_lifecycle_feedback('profile_block_decisions_too_many');
  end if;
  for decision in select value from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb)) loop
    root := split_part(coalesce(decision ->> 'fieldPath', ''), '::', 1);
    target := nullif(decision ->> 'targetBlockId', '');
    source_id := nullif(decision ->> 'sourceBlockId', '');
    action_value := decision ->> 'action';
    resolver_value := decision ->> 'resolver';
    if root not in ('professionalTitle', 'professionalObjective', 'summary', 'areasOfExpertise',
      'experiences', 'education', 'competencies', 'languages', 'certifications', 'keyResults', 'customSections')
      or action_value not in ('add', 'update', 'replace', 'keep', 'remove')
      or resolver_value not in ('same_block', 'new_block', 'ambiguous') then
      raise exception using errcode = '22023', message = 'profile_block_decision_invalid',
        detail = private.profile_lifecycle_feedback('profile_block_decision_invalid', decision ->> 'fieldPath');
    end if;
    if action_value = 'add' and resolver_value <> 'new_block' then
      raise exception using errcode = '22023', message = 'profile_block_resolver_invalid',
        detail = private.profile_lifecycle_feedback('profile_block_resolver_invalid', decision ->> 'fieldPath');
    end if;
    if action_value in ('update', 'replace') and root in ('experiences', 'education', 'keyResults', 'customSections') then
      if target is null then
        raise exception using errcode = '22023', message = 'profile_block_target_required',
          detail = private.profile_lifecycle_feedback('profile_block_target_required', decision ->> 'fieldPath');
      end if;
      select item into target_item from jsonb_array_elements(coalesce(p_base -> root, '[]'::jsonb)) item
      where item ->> 'id' = target limit 1;
      if target_item is null then
        raise exception using errcode = '22023', message = 'profile_block_target_not_found',
          detail = private.profile_lifecycle_feedback('profile_block_target_not_found', decision ->> 'fieldPath');
      end if;
      select item into source_item from jsonb_array_elements(coalesce(p_proposal -> root, '[]'::jsonb)) item
      where item ->> 'id' = source_id or private.profile_delta_items_match(root, target_item, item) limit 1;
      if source_item is null or resolver_value <> 'same_block' then
        raise exception using errcode = '22023', message = 'profile_block_source_not_found',
          detail = private.profile_lifecycle_feedback('profile_block_source_not_found', decision ->> 'fieldPath');
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function private.validate_profile_block_decisions(jsonb, jsonb, jsonb) from public, anon, authenticated;

create or replace function private.apply_profile_block_decisions(
  p_base jsonb, p_candidate jsonb, p_decisions jsonb
) returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  result jsonb := coalesce(p_candidate, '{}'::jsonb);
  decision jsonb;
  root text;
  identity text;
  action_value text;
  source_id text;
  target_id text;
  base_item jsonb;
  current_item jsonb;
  rewritten jsonb;
  inserted boolean;
begin
  for decision in select value from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb)) loop
    root := split_part(decision ->> 'fieldPath', '::', 1);
    identity := split_part(decision ->> 'fieldPath', '::', 2);
    action_value := decision ->> 'action';
    source_id := nullif(decision ->> 'sourceBlockId', '');
    target_id := nullif(decision ->> 'targetBlockId', '');

    if root in ('professionalTitle', 'professionalObjective', 'summary') then
      if action_value = 'keep' then
        result := jsonb_set(result, array[root], coalesce(p_base -> root, 'null'::jsonb), true);
      elsif action_value = 'remove' then
        result := jsonb_set(result, array[root], 'null'::jsonb, true);
      end if;
    elsif root in ('areasOfExpertise', 'competencies', 'languages', 'certifications')
      and action_value in ('keep', 'remove') then
      select item into base_item
      from jsonb_array_elements(case when jsonb_typeof(p_base -> root) = 'array' then p_base -> root else '[]'::jsonb end) item
      where private.profile_delta_normalize(item #>> '{}') = identity limit 1;
      rewritten := '[]'::jsonb;
      for current_item in select value from jsonb_array_elements(
        case when jsonb_typeof(result -> root) = 'array' then result -> root else '[]'::jsonb end
      ) loop
        if private.profile_delta_normalize(current_item #>> '{}') <> identity then
          rewritten := rewritten || jsonb_build_array(current_item);
        end if;
      end loop;
      if action_value = 'keep' and base_item is not null then
        rewritten := rewritten || jsonb_build_array(base_item);
      end if;
      result := jsonb_set(result, array[root], rewritten, true);
    elsif root in ('experiences', 'education', 'keyResults', 'customSections')
      and action_value in ('keep', 'remove') then
      select item into base_item
      from jsonb_array_elements(case when jsonb_typeof(p_base -> root) = 'array' then p_base -> root else '[]'::jsonb end) item
      where item ->> 'id' = coalesce(target_id, identity) limit 1;
      rewritten := '[]'::jsonb;
      inserted := false;
      for current_item in select value from jsonb_array_elements(
        case when jsonb_typeof(result -> root) = 'array' then result -> root else '[]'::jsonb end
      ) loop
        if (source_id is not null and current_item ->> 'id' = source_id)
          or (target_id is not null and current_item ->> 'id' = target_id)
          or (base_item is not null and private.profile_delta_items_match(root, base_item, current_item)) then
          if action_value = 'keep' and not inserted and base_item is not null then
            rewritten := rewritten || jsonb_build_array(base_item);
            inserted := true;
          end if;
        else
          rewritten := rewritten || jsonb_build_array(current_item);
        end if;
      end loop;
      if action_value = 'keep' and not inserted and base_item is not null then
        rewritten := rewritten || jsonb_build_array(base_item);
      end if;
      result := jsonb_set(result, array[root], rewritten, true);
    end if;
  end loop;
  return result;
end;
$$;
revoke all on function private.apply_profile_block_decisions(jsonb, jsonb, jsonb) from public, anon, authenticated;

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
  decision jsonb;
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

  for decision in select value from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) loop
    if decision ->> 'action' = 'remove' then
      removal_payload := removal_payload || jsonb_build_array(jsonb_build_object(
        'fieldPath', decision ->> 'fieldPath',
        'previousValue', decision -> 'previousValue',
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
    decision ->> 'fieldPath', decision ->> 'action', coalesce(decision ->> 'resolver', 'ambiguous'),
    decision ->> 'sourceBlockId', decision ->> 'targetBlockId', actor_id
  from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) decision
  on conflict (organization_id, review_id, field_path) do nothing;

  insert into public.profile_publication_removals (
    organization_id, person_id, review_id, approved_profile_id, field_path,
    previous_value, reason, actor_auth_user_id
  ) select p_organization_id, review.person_id, p_review_id, publication.profile_id,
    removal ->> 'fieldPath', removal -> 'previousValue', removal ->> 'reason', actor_id
  from jsonb_array_elements(removal_payload) removal
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
      actor_id, case decision ->> 'action'
        when 'add' then 'profile_block_added'
        when 'update' then 'profile_block_updated'
        when 'replace' then 'profile_block_replaced'
        when 'remove' then 'profile_block_removed'
        else 'profile_block_maintained' end,
      'success', jsonb_build_object('profile_id', publication.profile_id,
        'field_path', decision ->> 'fieldPath', 'resolver', decision ->> 'resolver',
        'source_block_id', decision ->> 'sourceBlockId', 'target_block_id', decision ->> 'targetBlockId')
    from jsonb_array_elements(coalesce(p_block_decisions, '[]'::jsonb)) decision;
  end if;
  return query select publication.review_id, publication.profile_id, publication.profile_version, publication.reused;
end;
$$;

revoke all on function public.publish_profile_review(uuid, uuid, integer, text, jsonb, text) from public, anon;
grant execute on function public.publish_profile_review(uuid, uuid, integer, text, jsonb, text) to authenticated;
revoke execute on function public.publish_profile_review(uuid, uuid, integer, jsonb, text) from authenticated;

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
    private.normalize_profile_review_contract(source_profile.profile_data, '{}'::jsonb), source_profile.uncertainties,
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
  update public.document_operations set status = 'completed', completed_at = now(),
    result = jsonb_build_object('person_id', p_person_id, 'previous_profile_id', current_profile) where id = operation.id;
  insert into public.person_ingestion_events (organization_id, person_id, actor_auth_user_id, event_type, result, metadata)
  values (p_organization_id, p_person_id, actor_id, 'profile_reset', 'success',
    jsonb_build_object('operation_id', operation.id, 'previous_profile_id', current_profile));
  return query select p_person_id, false;
end;
$$;

create or replace function public.prepare_document_deletion(
  p_organization_id uuid, p_person_id uuid, p_document_id uuid, p_idempotency_key text
) returns table (operation_id uuid, storage_bucket text, storage_path text, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare actor_id uuid; operation public.document_operations; document public.documents; fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into document from public.documents item where item.organization_id = p_organization_id
    and item.person_id = p_person_id and item.id = p_document_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_not_found_for_deletion', detail = private.profile_lifecycle_feedback('document_not_found_for_deletion'); end if;
  fingerprint := encode(extensions.digest(concat_ws('|', p_person_id::text, p_document_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, p_document_id, 'delete_document', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' then
    return query select operation.id, operation.result ->> 'storage_bucket', operation.result ->> 'storage_path', true; return;
  end if;
  update public.document_operations set result = jsonb_build_object(
    'storage_bucket', document.storage_bucket, 'storage_path', document.storage_path,
    'filename', document.filename, 'document_id', document.id, 'person_id', document.person_id
  ) where id = operation.id;
  return query select operation.id, document.storage_bucket, document.storage_path, false;
end;
$$;

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
        private.normalize_profile_review_contract(fallback_profile.profile_data, '{}'::jsonb),
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

revoke all on function public.restore_profile_version(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.reset_person_profile(uuid, uuid, text) from public, anon;
revoke all on function public.prepare_document_deletion(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.finalize_document_deletion(uuid, uuid) from public, anon;
grant execute on function public.restore_profile_version(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reset_person_profile(uuid, uuid, text) to authenticated;
grant execute on function public.prepare_document_deletion(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.finalize_document_deletion(uuid, uuid) to authenticated;

comment on function public.publish_profile_review(uuid, uuid, integer, text, jsonb, text) is
  'Publishes a reviewed profile in merge or replace mode with explicit per-block audit decisions.';
comment on function public.restore_profile_version(uuid, uuid, uuid, text) is
  'Restores a historical snapshot by creating a new immutable current profile version.';
comment on function public.reset_person_profile(uuid, uuid, text) is
  'Removes only the current-profile pointer while preserving person, documents and version history.';
comment on function public.prepare_document_deletion(uuid, uuid, uuid, text) is
  'Authorizes and durably prepares Storage deletion; replay is safe.';
comment on function public.finalize_document_deletion(uuid, uuid) is
  'Finalizes a prepared deletion after Storage success and rebuilds the current profile when required.';
