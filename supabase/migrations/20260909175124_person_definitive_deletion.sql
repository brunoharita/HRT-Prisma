-- M5.5 - definitive Person deletion.
-- One authoritative, tenant-scoped and resumable operation coordinates PostgreSQL and Storage.

begin;

alter table public.people
  drop constraint people_operational_status_shape_check,
  drop constraint people_operational_status_check;

alter table public.people
  add constraint people_operational_status_check
    check (operational_status in ('active', 'archived', 'merged', 'deleting')),
  add constraint people_operational_status_shape_check check (
    (operational_status = 'active' and archived_at is null and merged_into_person_id is null and merged_at is null)
    or (operational_status = 'archived' and archived_at is not null and merged_into_person_id is null and merged_at is null)
    or (operational_status = 'merged' and archived_at is null and merged_at is not null and merged_into_person_id is distinct from id)
    or operational_status = 'deleting'
  );

create table public.person_deletion_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  deleted_person_id_snapshot uuid not null,
  person_name_snapshot text not null check (char_length(btrim(person_name_snapshot)) between 1 and 240),
  actor_kind text not null check (actor_kind in ('super_admin', 'owner', 'admin', 'self')),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_reference text not null check (char_length(actor_reference) between 4 and 80),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 240),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  preflight_fingerprint text not null check (preflight_fingerprint ~ '^[0-9a-f]{64}$'),
  contract_version text not null default 'person-definitive-deletion-1.0.0',
  status text not null check (status in (
    'requested', 'locked', 'purging', 'verifying', 'completed', 'failed_retryable', 'blocked'
  )),
  preflight_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(preflight_summary) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  error_code text,
  retry_count integer not null default 0 check (retry_count >= 0),
  requested_at timestamptz not null default now(),
  locked_at timestamptz,
  purging_at timestamptz,
  verifying_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create unique index person_deletion_one_open_operation_idx
  on public.person_deletion_operations (organization_id, deleted_person_id_snapshot)
  where status in ('requested', 'locked', 'purging', 'verifying', 'failed_retryable');
create index person_deletion_audit_idx
  on public.person_deletion_operations (organization_id, completed_at desc)
  where status = 'completed';

create table public.person_deletion_storage_items (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.person_deletion_operations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  storage_bucket text not null check (char_length(btrim(storage_bucket)) between 1 and 120),
  storage_path text not null check (char_length(btrim(storage_path)) between 1 and 1024),
  status text not null default 'pending' check (status in ('pending', 'removed')),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (operation_id, storage_bucket, storage_path)
);

create index person_deletion_storage_pending_idx
  on public.person_deletion_storage_items (operation_id, status);

create table public.person_self_service_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  purpose text not null default 'person_data_self_service'
    check (purpose = 'person_data_self_service'),
  contract_version text not null default 'person-data-self-service-1.0.0',
  contact_kind text not null check (contact_kind in ('email', 'phone')),
  contact_fingerprint text not null check (contact_fingerprint ~ '^[0-9a-f]{64}$'),
  verification_method text not null check (verification_method = 'operator_confirmed_out_of_band'),
  verified_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  issuance_key text not null check (char_length(issuance_key) between 16 and 240),
  status text not null default 'active' check (status in ('active', 'consumed', 'revoked')),
  operation_id uuid references public.person_deletion_operations(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id) on delete cascade,
  unique (organization_id, issuance_key),
  check (expires_at > issued_at)
);

create index person_self_service_person_status_idx
  on public.person_self_service_capabilities (organization_id, person_id, status, expires_at);

-- Approved/rejected structural learning contains no resume values or excerpts and survives
-- after its individual review provenance is removed. Candidate learning remains individual.
alter table public.extraction_learning_cases
  alter column review_id drop not null,
  drop constraint extraction_learning_cases_organization_id_review_id_fkey,
  drop constraint extraction_learning_cases_organization_id_evidence_event_i_fkey,
  drop constraint extraction_learning_cases_adaptation_event_fk,
  drop constraint extraction_learning_cases_source_shape_check,
  add constraint extraction_learning_cases_review_deletion_fk
    foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete set null (review_id),
  add constraint extraction_learning_cases_evidence_event_deletion_fk
    foreign key (organization_id, evidence_event_id)
    references public.profile_review_evidence_events(organization_id, id) on delete set null (evidence_event_id),
  add constraint extraction_learning_cases_adaptation_event_deletion_fk
    foreign key (organization_id, adaptation_event_id)
    references public.profile_review_adaptation_events(organization_id, id) on delete set null (adaptation_event_id),
  add constraint extraction_learning_cases_source_shape_check check (
    (evidence_event_id is not null and adaptation_event_id is null and pattern_key is null)
    or (
      evidence_event_id is null
      and adaptation_event_id is not null
      and pattern_key ~ '^experience:block-v2:[a-z0-9:-]+$'
      and source_method_version in ('prisma-document-learning-v2', 'prisma-document-learning-v3')
    )
    or (
      review_id is null and evidence_event_id is null and adaptation_event_id is null
      and status in ('approved', 'rejected')
    )
  );

alter table public.organization_custom_section_confirmations
  alter column review_id drop not null,
  drop constraint organization_custom_section_confirmations_review_lifecycle_fk,
  add constraint organization_custom_section_confirmations_review_deletion_fk
    foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete set null (review_id);

create or replace function private.person_deletion_feedback(p_reason text, p_next_action text default null)
returns text language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'contract', 'operation-feedback-2.0.0',
    'reason', p_reason,
    'nextAction', p_next_action,
    'itemNumber', null
  )::text
$$;

revoke all on function private.person_deletion_feedback(text, text) from public, anon, authenticated;

create or replace function private.person_deletion_actor_kind(p_organization_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_role public.membership_role;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'person_deletion_auth_required';
  end if;
  if private.is_super_admin(actor_id) then return 'super_admin'; end if;
  select membership.role into actor_role
  from public.organization_memberships membership
  join public.platform_users platform_user on platform_user.auth_user_id = membership.user_id
  where membership.organization_id = p_organization_id
    and membership.user_id = actor_id
    and platform_user.status = 'active';
  if actor_role = 'owner' then return 'owner'; end if;
  if actor_role = 'admin' then return 'admin'; end if;
  raise exception using errcode = '42501', message = 'person_deletion_access_denied',
    detail = private.person_deletion_feedback(
      'Você não tem permissão para excluir esta Pessoa.',
      'Peça a um Super Admin, Owner ou Admin autorizado.'
    );
end;
$$;

revoke all on function private.person_deletion_actor_kind(uuid) from public, anon, authenticated;

create or replace function private.person_deletion_preflight(
  p_organization_id uuid, p_person_id uuid
)
returns table (person_name text, fingerprint text, summary jsonb)
language plpgsql security definer set search_path = '' as $$
declare target public.people; local_summary jsonb; storage_signature text;
begin
  select * into target from public.people item
  where item.organization_id = p_organization_id and item.id = p_person_id;
  if target.id is null then
    raise exception using errcode = 'P0002', message = 'person_deletion_not_found';
  end if;

  select coalesce(string_agg(concat_ws(':', item.storage_bucket, item.storage_path), '|' order by item.storage_bucket, item.storage_path), '')
  into storage_signature
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.storage_bucket is not null and item.storage_path is not null and not item.is_legacy_unstored;

  local_summary := jsonb_build_object(
    'documents', (select count(*) from public.documents item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'profiles', (select count(*) from public.professional_profiles item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'reviews', (select count(*) from public.profile_reviews item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'matching', (select count(*) from public.match_evaluations item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'verifications', (select count(*) from public.verification_needs item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'assessmentAttempts', (select count(*) from public.assessment_attempts item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'knowledgeProvenances', (select count(*) from public.knowledge_observations item where item.organization_id = p_organization_id and item.person_id = p_person_id),
    'storageObjects', (select count(*) from public.documents item where item.organization_id = p_organization_id and item.person_id = p_person_id and item.storage_bucket is not null and item.storage_path is not null and not item.is_legacy_unstored),
    'sharedKnowledgeConcepts', (select count(*) from public.knowledge_concepts item where item.organization_id is null or item.organization_id = p_organization_id),
    'sharedAssessmentItems', (select count(*) from public.assessment_items item where item.organization_id is null or item.organization_id = p_organization_id)
  );
  return query select target.full_name,
    encode(extensions.digest(concat_ws('|', target.id::text, target.updated_at::text, target.operational_status, local_summary::text, storage_signature), 'sha256'), 'hex'),
    local_summary;
end;
$$;

revoke all on function private.person_deletion_preflight(uuid, uuid) from public, anon, authenticated;

create or replace function private.person_deletion_context_allows(
  p_organization_id uuid, p_person_id uuid
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare operation_id uuid; routine_owner name;
begin
  begin
    operation_id := nullif(current_setting('prisma.person_deletion_operation_id', true), '')::uuid;
  exception when invalid_text_representation then
    operation_id := null;
  end;
  if operation_id is null then return false; end if;
  select pg_catalog.pg_get_userbyid(procedure.proowner) into routine_owner
  from pg_catalog.pg_proc procedure
  where procedure.oid = 'public.finalize_person_definitive_deletion(uuid,uuid)'::regprocedure;
  if current_user <> routine_owner then return false; end if;
  return exists (
    select 1 from public.person_deletion_operations operation
    where operation.id = operation_id
      and operation.organization_id = p_organization_id
      and operation.deleted_person_id_snapshot = p_person_id
      and operation.status in ('requested', 'locked', 'purging', 'verifying', 'failed_retryable')
  );
end;
$$;

revoke all on function private.person_deletion_context_allows(uuid, uuid) from public, anon, authenticated;

create or replace function private.guard_people_during_deletion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.operational_status = 'deleting'
    and not private.person_deletion_context_allows(old.organization_id, old.id) then
    raise exception using errcode = '55000', message = 'person_deletion_in_progress',
      detail = private.person_deletion_feedback(
        'Esta Pessoa está em exclusão e não pode receber novas alterações.',
        'Continue a exclusão a partir da Central da Pessoa.'
      );
  end if;
  if tg_op = 'UPDATE' and new.operational_status = 'deleting'
    and not private.person_deletion_context_allows(new.organization_id, new.id) then
    raise exception using errcode = '42501', message = 'person_deletion_state_requires_authoritative_operation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_people_during_deletion() from public, anon, authenticated;

create trigger people_guard_during_deletion
before update or delete on public.people
for each row execute function private.guard_people_during_deletion();

create or replace function private.guard_person_reference_during_deletion()
returns trigger language plpgsql set search_path = '' as $$
declare payload jsonb := to_jsonb(new); v_organization_id uuid; column_name text; referenced_person_id uuid;
begin
  v_organization_id := nullif(payload ->> 'organization_id', '')::uuid;
  foreach column_name in array tg_argv loop
    referenced_person_id := nullif(payload ->> column_name, '')::uuid;
    if referenced_person_id is not null and exists (
      select 1 from public.people person
      where person.organization_id = v_organization_id and person.id = referenced_person_id
        and person.operational_status = 'deleting'
    ) and not private.person_deletion_context_allows(v_organization_id, referenced_person_id) then
      raise exception using errcode = '55000', message = 'person_deletion_in_progress',
        detail = private.person_deletion_feedback(
          'Esta Pessoa está em exclusão e não pode receber novas alterações.',
          'Aguarde a conclusão ou continue a operação existente.'
        );
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.guard_person_reference_during_deletion() from public, anon, authenticated;

create trigger person_private_data_guard_deletion before insert or update on public.person_private_data
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger documents_guard_person_deletion before insert or update on public.documents
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger document_attempts_guard_person_deletion before insert or update on public.document_processing_attempts
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger document_pages_guard_person_deletion before insert or update on public.document_page_extractions
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger extraction_drafts_guard_person_deletion before insert or update on public.extraction_drafts
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger evidence_guard_person_deletion before insert or update on public.evidence
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger inferences_guard_person_deletion before insert or update on public.inferences
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger spatial_evidence_guard_person_deletion before insert or update on public.spatial_evidence_regions
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger profile_reviews_guard_person_deletion before insert or update on public.profile_reviews
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger professional_profiles_guard_person_deletion before insert or update on public.professional_profiles
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger profile_decisions_guard_person_deletion before insert or update on public.profile_publication_decisions
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger profile_removals_guard_person_deletion before insert or update on public.profile_publication_removals
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger ingestion_events_guard_person_deletion before insert or update on public.person_ingestion_events
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger document_operations_guard_person_deletion before insert or update on public.document_operations
for each row execute function private.guard_person_reference_during_deletion('person_id', 'target_person_id');
create trigger knowledge_observations_guard_person_deletion before insert or update on public.knowledge_observations
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger knowledge_impacts_guard_person_deletion before insert or update on public.knowledge_reinterpretation_impacts
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger knowledge_jobs_guard_person_deletion before insert or update on public.knowledge_reinterpretation_jobs
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger match_evaluations_guard_person_deletion before insert or update on public.match_evaluations
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger verification_needs_guard_person_deletion before insert or update on public.verification_needs
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger assessment_invitations_guard_person_deletion before insert or update on public.assessment_invitations
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger assessment_attempts_guard_person_deletion before insert or update on public.assessment_attempts
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger demonstrated_evidence_guard_person_deletion before insert or update on public.competency_demonstrated_evidence
for each row execute function private.guard_person_reference_during_deletion('person_id');
create trigger resume_intakes_guard_person_deletion before insert or update on public.resume_intakes
for each row execute function private.guard_person_reference_during_deletion('resolved_person_id');
create trigger positions_guard_person_deletion before insert or update on public.positions
for each row execute function private.guard_person_reference_during_deletion('occupant_person_id');

create or replace function private.guard_assessment_child_during_person_deletion()
returns trigger language plpgsql set search_path = '' as $$
declare payload jsonb := to_jsonb(new); v_organization_id uuid; v_person_id uuid;
begin
  v_organization_id := nullif(payload ->> 'organization_id', '')::uuid;
  if tg_table_name = 'prepared_assessments' then
    select need.person_id into v_person_id from public.verification_needs need
    where need.organization_id = v_organization_id and need.id = nullif(payload ->> 'need_id', '')::uuid;
  elsif tg_table_name = 'assessment_access_requests' then
    select invitation.person_id into v_person_id from public.assessment_invitations invitation
    where invitation.organization_id = v_organization_id and invitation.id = nullif(payload ->> 'invitation_id', '')::uuid;
  elsif tg_table_name = 'verification_audit_events' then
    select coalesce(need.person_id, prepared_need.person_id) into v_person_id
    from (select 1) seed
    left join public.verification_needs need on need.organization_id = v_organization_id and need.id = nullif(payload ->> 'need_id', '')::uuid
    left join public.prepared_assessments prepared on prepared.organization_id = v_organization_id and prepared.id = nullif(payload ->> 'prepared_assessment_id', '')::uuid
    left join public.verification_needs prepared_need on prepared_need.organization_id = v_organization_id and prepared_need.id = prepared.need_id;
  else
    select attempt.person_id into v_person_id from public.assessment_attempts attempt
    where attempt.organization_id = v_organization_id and attempt.id = nullif(payload ->> 'attempt_id', '')::uuid;
  end if;
  if v_person_id is not null and exists (
    select 1 from public.people person where person.organization_id = v_organization_id
      and person.id = v_person_id and person.operational_status = 'deleting'
  ) and not private.person_deletion_context_allows(v_organization_id, v_person_id) then
    raise exception using errcode = '55000', message = 'person_deletion_in_progress';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_assessment_child_during_person_deletion() from public, anon, authenticated;

create trigger prepared_assessments_guard_person_deletion before insert or update on public.prepared_assessments
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_access_requests_guard_person_deletion before insert or update on public.assessment_access_requests
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_question_instances_guard_person_deletion before insert or update on public.assessment_question_instances
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_responses_guard_person_deletion before insert or update on public.assessment_responses
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_events_guard_person_deletion before insert or update on public.assessment_events
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_question_metrics_guard_person_deletion before insert or update on public.assessment_question_metrics
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_integrity_guard_person_deletion before insert or update on public.assessment_integrity_analyses
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger assessment_evaluations_guard_person_deletion before insert or update on public.assessment_evaluations
for each row execute function private.guard_assessment_child_during_person_deletion();
create trigger verification_audit_guard_person_deletion before insert or update on public.verification_audit_events
for each row execute function private.guard_assessment_child_during_person_deletion();

create or replace function public.preview_person_definitive_deletion(
  p_organization_id uuid, p_person_id uuid
)
returns table (person_id uuid, person_name text, preflight_fingerprint text, impact_summary jsonb)
language plpgsql security definer set search_path = '' as $$
declare actor_kind text; preview record;
begin
  actor_kind := private.person_deletion_actor_kind(p_organization_id);
  select * into preview from private.person_deletion_preflight(p_organization_id, p_person_id);
  return query select p_person_id, preview.person_name, preview.fingerprint, preview.summary;
end;
$$;

revoke all on function public.preview_person_definitive_deletion(uuid, uuid) from public, anon;
grant execute on function public.preview_person_definitive_deletion(uuid, uuid) to authenticated;

create or replace function private.begin_person_definitive_deletion(
  p_organization_id uuid,
  p_person_id uuid,
  p_actor_kind text,
  p_actor_auth_user_id uuid,
  p_preflight_fingerprint text,
  p_idempotency_key text,
  p_capability_id uuid default null
)
returns table (operation_id uuid, operation_status text, storage_plan jsonb, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare target public.people; preview record; operation public.person_deletion_operations; fingerprint text;
begin
  if p_actor_kind not in ('super_admin', 'owner', 'admin', 'self')
    or char_length(coalesce(p_idempotency_key, '')) < 16 then
    raise exception using errcode = '22023', message = 'person_deletion_request_invalid';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_person_id::text, 0));

  select * into operation from public.person_deletion_operations item
  where item.organization_id = p_organization_id and item.idempotency_key = p_idempotency_key for update;
  if operation.id is not null then
    fingerprint := encode(extensions.digest(concat_ws('|', p_person_id::text, p_actor_kind, coalesce(p_actor_auth_user_id::text, 'self')), 'sha256'), 'hex');
    if operation.request_fingerprint <> fingerprint then
      raise exception using errcode = '23505', message = 'person_deletion_idempotency_conflict';
    end if;
    update public.person_deletion_operations item set
      retry_count = item.retry_count + case when item.status = 'failed_retryable' then 1 else 0 end,
      status = case when item.status = 'failed_retryable' then 'purging' else item.status end,
      purging_at = case when item.status = 'failed_retryable' then now() else item.purging_at end,
      error_code = case when item.status = 'failed_retryable' then null else item.error_code end,
      updated_at = now()
    where item.id = operation.id returning * into operation;
    return query select operation.id, operation.status,
      coalesce((select jsonb_agg(jsonb_build_object('bucket', storage.storage_bucket, 'path', storage.storage_path) order by storage.storage_bucket, storage.storage_path)
        from public.person_deletion_storage_items storage where storage.operation_id = operation.id and storage.status = 'pending'), '[]'::jsonb),
      true;
    return;
  end if;

  select * into operation from public.person_deletion_operations item
  where item.organization_id = p_organization_id
    and item.deleted_person_id_snapshot = p_person_id
    and item.status in ('requested', 'locked', 'purging', 'verifying', 'failed_retryable')
  order by item.requested_at desc limit 1 for update;
  if operation.id is not null then
    update public.person_deletion_operations item set
      retry_count = item.retry_count + case when item.status = 'failed_retryable' then 1 else 0 end,
      status = case when item.status = 'failed_retryable' then 'purging' else item.status end,
      purging_at = case when item.status = 'failed_retryable' then now() else item.purging_at end,
      error_code = case when item.status = 'failed_retryable' then null else item.error_code end,
      updated_at = now()
    where item.id = operation.id returning * into operation;
    return query select operation.id, operation.status,
      coalesce((select jsonb_agg(jsonb_build_object('bucket', storage.storage_bucket, 'path', storage.storage_path) order by storage.storage_bucket, storage.storage_path)
        from public.person_deletion_storage_items storage where storage.operation_id = operation.id and storage.status = 'pending'), '[]'::jsonb),
      true;
    return;
  end if;

  select * into target from public.people item
  where item.organization_id = p_organization_id and item.id = p_person_id for update;
  if target.id is null then raise exception using errcode = 'P0002', message = 'person_deletion_not_found'; end if;
  if target.operational_status = 'deleting' then
    raise exception using errcode = '55000', message = 'person_deletion_already_in_progress';
  end if;
  select * into preview from private.person_deletion_preflight(p_organization_id, p_person_id);
  if p_preflight_fingerprint is null or p_preflight_fingerprint <> preview.fingerprint then
    raise exception using errcode = '40001', message = 'person_deletion_preflight_changed',
      detail = private.person_deletion_feedback(
        'Os dados desta Pessoa mudaram depois da confirmação.',
        'Revise novamente o impacto antes de excluir.'
      );
  end if;
  if exists (
    select 1 from public.documents owned
    join public.documents other on other.storage_bucket = owned.storage_bucket and other.storage_path = owned.storage_path
      and (other.organization_id, other.person_id, other.id) is distinct from (owned.organization_id, owned.person_id, owned.id)
    where owned.organization_id = p_organization_id and owned.person_id = p_person_id
      and owned.storage_bucket is not null and owned.storage_path is not null
  ) then
    raise exception using errcode = '55000', message = 'person_deletion_storage_ownership_ambiguous';
  end if;

  fingerprint := encode(extensions.digest(concat_ws('|', p_person_id::text, p_actor_kind, coalesce(p_actor_auth_user_id::text, 'self')), 'sha256'), 'hex');
  insert into public.person_deletion_operations (
    organization_id, deleted_person_id_snapshot, person_name_snapshot, actor_kind,
    actor_auth_user_id, actor_reference, idempotency_key, request_fingerprint, preflight_fingerprint,
    status, preflight_summary, locked_at, purging_at
  ) values (
    p_organization_id, p_person_id, target.full_name, p_actor_kind,
    p_actor_auth_user_id, coalesce(p_actor_auth_user_id::text, 'self'), p_idempotency_key, fingerprint, preview.fingerprint,
    'requested', preview.summary, now(), now()
  ) returning * into operation;

  perform set_config('prisma.person_deletion_operation_id', operation.id::text, true);
  update public.people item set operational_status = 'deleting', updated_at = now()
  where item.organization_id = p_organization_id and item.id = p_person_id;

  update public.profile_reviews item set state = 'invalidated', invalidated_at = now(), updated_at = now()
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.state = 'draft';
  update public.assessment_invitations item set status = 'revoked', cancelled_at = coalesce(item.cancelled_at, now()), updated_at = now()
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.status not in ('completed', 'revoked', 'cancelled', 'expired');
  update public.assessment_attempts item set status = 'invalidated', active_session_id = null, updated_at = now()
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.status in ('not_started', 'in_progress', 'paused');
  update public.verification_needs item set status = 'cancelled', updated_at = now()
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.status in ('open', 'draft', 'prepared', 'requires_reassessment');
  update public.person_self_service_capabilities item set status = 'revoked', revoked_at = now(), updated_at = now()
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.status = 'active' and item.id is distinct from p_capability_id;

  insert into public.person_deletion_storage_items (
    operation_id, organization_id, storage_bucket, storage_path
  )
  select operation.id, item.organization_id, item.storage_bucket, item.storage_path
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.storage_bucket is not null and item.storage_path is not null and not item.is_legacy_unstored
  on conflict (operation_id, storage_bucket, storage_path) do nothing;

  update public.person_deletion_operations item set status = 'purging', updated_at = now()
  where item.id = operation.id returning * into operation;

  return query select operation.id, operation.status,
    coalesce((select jsonb_agg(jsonb_build_object('bucket', storage.storage_bucket, 'path', storage.storage_path) order by storage.storage_bucket, storage.storage_path)
      from public.person_deletion_storage_items storage where storage.operation_id = operation.id and storage.status = 'pending'), '[]'::jsonb),
    false;
end;
$$;

revoke all on function private.begin_person_definitive_deletion(uuid, uuid, text, uuid, text, text, uuid) from public, anon, authenticated;

create or replace function public.begin_person_definitive_deletion(
  p_organization_id uuid,
  p_person_id uuid,
  p_preflight_fingerprint text,
  p_idempotency_key text
)
returns table (operation_id uuid, operation_status text, storage_plan jsonb, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid()); actor_kind text;
begin
  actor_kind := private.person_deletion_actor_kind(p_organization_id);
  return query select * from private.begin_person_definitive_deletion(
    p_organization_id, p_person_id, actor_kind, actor_id,
    p_preflight_fingerprint, p_idempotency_key, null
  );
end;
$$;

revoke all on function public.begin_person_definitive_deletion(uuid, uuid, text, text) from public, anon;
grant execute on function public.begin_person_definitive_deletion(uuid, uuid, text, text) to authenticated;

create or replace function public.issue_person_self_service_access(
  p_organization_id uuid,
  p_person_id uuid,
  p_token_hash text,
  p_contact_kind text,
  p_valid_minutes integer,
  p_idempotency_key text
)
returns table (capability_id uuid, expires_at timestamptz, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare actor_id uuid := (select auth.uid()); actor_kind text; target public.people;
  private_data public.person_private_data; contact_value text; fingerprint text;
  existing_key public.person_self_service_capabilities; active_capability public.person_self_service_capabilities;
begin
  actor_kind := private.person_deletion_actor_kind(p_organization_id);
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_contact_kind not in ('email', 'phone')
    or p_valid_minutes not between 5 and 120 or char_length(coalesce(p_idempotency_key, '')) < 16 then
    raise exception using errcode = '22023', message = 'self_service_issue_invalid';
  end if;
  select * into target from public.people item
  where item.organization_id = p_organization_id and item.id = p_person_id for update;
  if target.id is null or target.operational_status not in ('active', 'archived') then
    raise exception using errcode = 'P0002', message = 'self_service_person_unavailable';
  end if;
  select * into private_data from public.person_private_data item
  where item.organization_id = p_organization_id and item.person_id = p_person_id;
  contact_value := case when p_contact_kind = 'email' then lower(nullif(btrim(private_data.email), ''))
    else nullif(regexp_replace(coalesce(private_data.phone_e164, private_data.phone), '[^0-9]', '', 'g'), '') end;
  if contact_value is null then
    raise exception using errcode = '22023', message = 'self_service_verified_contact_required',
      detail = private.person_deletion_feedback(
        'Esta Pessoa não possui o contato verificado escolhido.',
        'Confirme um e-mail ou telefone já associado antes de gerar o acesso.'
      );
  end if;
  fingerprint := encode(extensions.digest(contact_value, 'sha256'), 'hex');
  select capability.* into existing_key from public.person_self_service_capabilities capability
  where capability.organization_id = p_organization_id and capability.issuance_key = p_idempotency_key
  for update;
  if existing_key.id is not null then
    if existing_key.person_id <> p_person_id or existing_key.token_hash <> p_token_hash
      or existing_key.contact_kind <> p_contact_kind then
      raise exception using errcode = '23505', message = 'self_service_issue_idempotency_conflict';
    end if;
    capability_id := existing_key.id;
    expires_at := existing_key.expires_at;
    reused := true;
    return next;
    return;
  end if;
  select capability.* into active_capability from public.person_self_service_capabilities capability
  where capability.organization_id = p_organization_id and capability.person_id = p_person_id
    and capability.status = 'active' and capability.expires_at > now()
    and capability.contact_kind = p_contact_kind
  order by capability.issued_at desc limit 1 for update;
  if active_capability.id is not null then
    update public.person_self_service_capabilities set status = 'revoked', revoked_at = now(), updated_at = now()
    where id = active_capability.id;
  end if;
  insert into public.person_self_service_capabilities (
    organization_id, person_id, token_hash, contact_kind, contact_fingerprint,
    verification_method, verified_by_auth_user_id, issuance_key, expires_at
  ) values (
    p_organization_id, p_person_id, p_token_hash, p_contact_kind, fingerprint,
    'operator_confirmed_out_of_band', actor_id, p_idempotency_key, now() + make_interval(mins => p_valid_minutes)
  ) returning id, public.person_self_service_capabilities.expires_at into capability_id, expires_at;
  reused := false;
  return next;
end;
$$;

revoke all on function public.issue_person_self_service_access(uuid, uuid, text, text, integer, text) from public, anon;
grant execute on function public.issue_person_self_service_access(uuid, uuid, text, text, integer, text) to authenticated;

create or replace function public.person_self_service_access(
  p_action text, p_token_hash text, p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare capability public.person_self_service_capabilities; preview record; operation record;
  preflight_fingerprint text; idempotency_key text;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_action not in ('inspect', 'delete')
    or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = 'P0002', message = 'self_service_access_unavailable';
  end if;
  select * into capability from public.person_self_service_capabilities item
  where item.token_hash = p_token_hash and item.purpose = 'person_data_self_service'
    and item.contract_version = 'person-data-self-service-1.0.0' for update;
  if capability.id is null or capability.status = 'revoked' or capability.expires_at <= now() then
    raise exception using errcode = 'P0002', message = 'self_service_access_unavailable';
  end if;
  if p_action = 'inspect' then
    if capability.status <> 'active' then raise exception using errcode = 'P0002', message = 'self_service_access_unavailable'; end if;
    select * into preview from private.person_deletion_preflight(capability.organization_id, capability.person_id);
    return jsonb_build_object(
      'personName', preview.person_name,
      'preflightFingerprint', preview.fingerprint,
      'impactSummary', preview.summary,
      'expiresAt', capability.expires_at,
      'contractVersion', capability.contract_version
    );
  end if;

  preflight_fingerprint := nullif(p_payload ->> 'preflightFingerprint', '');
  idempotency_key := nullif(p_payload ->> 'idempotencyKey', '');
  if capability.status = 'consumed' then
    if capability.operation_id is null then raise exception using errcode = 'P0002', message = 'self_service_access_unavailable'; end if;
    select item.id operation_id, item.status operation_status,
      coalesce((select jsonb_agg(jsonb_build_object('bucket', storage.storage_bucket, 'path', storage.storage_path) order by storage.storage_bucket, storage.storage_path)
        from public.person_deletion_storage_items storage where storage.operation_id = item.id and storage.status = 'pending'), '[]'::jsonb) storage_plan,
      true reused
    into operation
    from public.person_deletion_operations item where item.id = capability.operation_id;
  else
    select * into operation from private.begin_person_definitive_deletion(
      capability.organization_id, capability.person_id, 'self', null,
      preflight_fingerprint, idempotency_key, capability.id
    );
    update public.person_self_service_capabilities item set
      status = 'consumed', consumed_at = now(), operation_id = operation.operation_id, updated_at = now()
    where item.id = capability.id;
    update public.person_self_service_capabilities item set status = 'revoked', revoked_at = now(), updated_at = now()
    where item.organization_id = capability.organization_id and item.person_id = capability.person_id
      and item.id <> capability.id and item.status = 'active';
  end if;
  return jsonb_build_object(
    'operation_id', operation.operation_id,
    'operation_status', operation.operation_status,
    'storage_plan', operation.storage_plan,
    'reused', operation.reused
  );
end;
$$;

revoke all on function public.person_self_service_access(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.person_self_service_access(text, text, jsonb) to service_role;

create or replace function public.mark_person_deletion_storage_removed(
  p_operation_id uuid, p_storage_bucket text, p_storage_path text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.person_deletion_storage_items item set status = 'removed', removed_at = coalesce(item.removed_at, now())
  where item.operation_id = p_operation_id and item.storage_bucket = p_storage_bucket
    and item.storage_path = p_storage_path and item.status = 'pending';
  if not found and not exists (
    select 1 from public.person_deletion_storage_items item where item.operation_id = p_operation_id
      and item.storage_bucket = p_storage_bucket and item.storage_path = p_storage_path and item.status = 'removed'
  ) then raise exception using errcode = 'P0002', message = 'person_deletion_storage_item_not_found'; end if;
end;
$$;

revoke all on function public.mark_person_deletion_storage_removed(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_person_deletion_storage_removed(uuid, text, text) to service_role;

create or replace function public.fail_person_deletion_retryable(
  p_operation_id uuid, p_error_code text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.person_deletion_operations item set status = 'failed_retryable',
    error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'person_deletion_interrupted'), 120), updated_at = now()
  where item.id = p_operation_id and item.status <> 'completed';
end;
$$;

revoke all on function public.fail_person_deletion_retryable(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_person_deletion_retryable(uuid, text) to service_role;

-- Extend the existing immutable evidence guard and document cascade authority with the
-- exact in-flight Person deletion operation carried by the transaction.
create or replace function private.prevent_review_evidence_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare lifecycle_owner name; document_operation_id uuid; person_operation_id uuid;
begin
  select pg_catalog.pg_get_userbyid(procedure.proowner) into lifecycle_owner
  from pg_catalog.pg_proc procedure
  where procedure.oid = 'public.finalize_person_definitive_deletion(uuid,uuid)'::regprocedure;
  begin
    document_operation_id := nullif(current_setting('prisma.document_deletion_operation_id', true), '')::uuid;
    person_operation_id := nullif(current_setting('prisma.person_deletion_operation_id', true), '')::uuid;
  exception when invalid_text_representation then
    document_operation_id := null; person_operation_id := null;
  end;
  if tg_op = 'DELETE' and current_user = lifecycle_owner and (
    exists (select 1 from public.document_operations operation where operation.id = document_operation_id and operation.organization_id = old.organization_id and operation.operation_type = 'delete_document' and operation.status = 'started')
    or exists (select 1 from public.person_deletion_operations operation where operation.id = person_operation_id and operation.organization_id = old.organization_id and operation.status in ('purging', 'verifying'))
  ) then return old; end if;
  if tg_op = 'UPDATE' and current_user = lifecycle_owner
    and to_jsonb(new) - 'review_id' = to_jsonb(old) - 'review_id'
    and old.review_id is not null and new.review_id is null
    and exists (
      select 1 from public.person_deletion_operations operation
      where operation.id = person_operation_id and operation.organization_id = old.organization_id
        and operation.status in ('purging', 'verifying')
    ) then return new; end if;
  raise exception using errcode = '55000', message = 'review evidence history is immutable';
end;
$$;

create or replace function private.authorize_document_dependency_cascade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare lifecycle_owner name; document_operation_id uuid; person_operation_id uuid;
begin
  select pg_catalog.pg_get_userbyid(procedure.proowner) into lifecycle_owner
  from pg_catalog.pg_proc procedure
  where procedure.oid = 'public.finalize_person_definitive_deletion(uuid,uuid)'::regprocedure;
  begin person_operation_id := nullif(current_setting('prisma.person_deletion_operation_id', true), '')::uuid;
  exception when invalid_text_representation then person_operation_id := null; end;
  if current_user = lifecycle_owner and exists (
    select 1 from public.person_deletion_operations operation
    where operation.id = person_operation_id and operation.organization_id = old.organization_id
      and operation.deleted_person_id_snapshot = old.person_id and operation.status in ('purging', 'verifying')
  ) then return old; end if;
  select operation.id into document_operation_id from public.document_operations operation
  where operation.organization_id = old.organization_id and operation.operation_type = 'delete_document'
    and operation.status = 'started' and operation.result ->> 'document_id' = old.id::text
  order by operation.started_at desc limit 1;
  if current_user <> lifecycle_owner or document_operation_id is null then
    raise exception using errcode = '42501', message = 'document deletion must use the authorized lifecycle operation';
  end if;
  perform set_config('prisma.document_deletion_operation_id', document_operation_id::text, true);
  return old;
end;
$$;

create or replace function public.finalize_person_definitive_deletion(
  p_organization_id uuid, p_operation_id uuid
)
returns table (operation_id uuid, operation_status text, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare operation public.person_deletion_operations; target_person_id uuid;
  document_ids uuid[]; attempt_ids uuid[]; evidence_ids uuid[]; review_ids uuid[]; profile_ids uuid[];
  need_ids uuid[]; prepared_ids uuid[]; invitation_ids uuid[]; attempt_assessment_ids uuid[];
  shared_knowledge_count bigint; shared_item_count bigint; residual_count bigint;
begin
  select * into operation from public.person_deletion_operations item
  where item.organization_id = p_organization_id and item.id = p_operation_id for update;
  if operation.id is null then raise exception using errcode = 'P0002', message = 'person_deletion_operation_not_found'; end if;
  if operation.status = 'completed' then return query select operation.id, operation.status, true; return; end if;
  if operation.status not in ('purging', 'failed_retryable') then raise exception using errcode = '55000', message = 'person_deletion_operation_not_ready'; end if;
  if exists (select 1 from public.person_deletion_storage_items item where item.operation_id = p_operation_id and item.status <> 'removed') then
    raise exception using errcode = '55000', message = 'person_deletion_storage_pending';
  end if;
  target_person_id := operation.deleted_person_id_snapshot;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || target_person_id::text, 0));
  perform set_config('prisma.person_deletion_operation_id', operation.id::text, true);
  update public.person_deletion_operations item set status = 'verifying', verifying_at = now(), updated_at = now()
  where item.id = operation.id;

  select coalesce(array_agg(id), '{}'::uuid[]) into document_ids from public.documents
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into attempt_ids from public.document_processing_attempts
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into evidence_ids from public.evidence
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into review_ids from public.profile_reviews
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into profile_ids from public.professional_profiles
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into need_ids from public.verification_needs
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into prepared_ids from public.prepared_assessments
  where organization_id = p_organization_id and need_id = any(need_ids);
  select coalesce(array_agg(id), '{}'::uuid[]) into invitation_ids from public.assessment_invitations
  where organization_id = p_organization_id and person_id = target_person_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into attempt_assessment_ids from public.assessment_attempts
  where organization_id = p_organization_id and person_id = target_person_id;

  -- M5.1 individual aggregate. Shared definitions, rubrics, blueprints and Item Bank remain.
  delete from public.competency_demonstrated_evidence where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.assessment_evaluations where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  delete from public.assessment_question_metrics where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  delete from public.assessment_events where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  delete from public.assessment_responses where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  update public.assessment_attempts set current_question_instance_id = null
  where organization_id = p_organization_id and id = any(attempt_assessment_ids);
  delete from public.assessment_question_instances where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  delete from public.assessment_integrity_analyses where organization_id = p_organization_id and attempt_id = any(attempt_assessment_ids);
  delete from public.assessment_attempts where organization_id = p_organization_id and id = any(attempt_assessment_ids);
  delete from public.assessment_access_requests where organization_id = p_organization_id and invitation_id = any(invitation_ids);
  delete from public.assessment_invitations where organization_id = p_organization_id and id = any(invitation_ids);
  delete from public.verification_audit_events where organization_id = p_organization_id
    and (need_id = any(need_ids) or prepared_assessment_id = any(prepared_ids));
  delete from public.prepared_assessments where organization_id = p_organization_id and id = any(prepared_ids);
  delete from public.verification_needs where organization_id = p_organization_id and id = any(need_ids);
  delete from public.match_evaluations where organization_id = p_organization_id and person_id = target_person_id;

  -- Remove individual Knowledge provenance while preserving published concepts and shared aliases.
  update public.knowledge_inbox inbox set
    evidence_reference_ids = coalesce((select array_agg(value) from unnest(inbox.evidence_reference_ids) value where not value = any(evidence_ids)), '{}'::uuid[]),
    observation_ids = coalesce((select array_agg(value) from unnest(inbox.observation_ids) value where not value in (
      select observation.id from public.knowledge_observations observation where observation.organization_id = p_organization_id and observation.person_id = target_person_id
    )), '{}'::uuid[])
  where inbox.organization_id = p_organization_id and (
    inbox.evidence_reference_ids && evidence_ids or inbox.observation_ids && coalesce((select array_agg(observation.id) from public.knowledge_observations observation where observation.organization_id = p_organization_id and observation.person_id = target_person_id), '{}'::uuid[])
  );
  delete from public.knowledge_inbox inbox where inbox.organization_id = p_organization_id
    and inbox.status = 'unresolved' and cardinality(inbox.evidence_reference_ids) = 0 and cardinality(inbox.observation_ids) = 0;
  delete from public.knowledge_reinterpretation_jobs where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.knowledge_reinterpretation_impacts where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.knowledge_observations where organization_id = p_organization_id and person_id = target_person_id;

  -- Keep only metadata-only learning that reached a durable decision; candidate rows belong to the review.
  delete from public.extraction_learning_cases where organization_id = p_organization_id and review_id = any(review_ids) and status = 'candidate';
  update public.extraction_learning_cases set review_id = null, evidence_event_id = null, adaptation_event_id = null
  where organization_id = p_organization_id and review_id = any(review_ids) and status in ('approved', 'rejected');
  update public.organization_custom_section_confirmations set review_id = null
  where organization_id = p_organization_id and review_id = any(review_ids);

  delete from public.profile_publication_decisions where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.profile_publication_removals where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.person_ingestion_events where organization_id = p_organization_id and (
    person_id = target_person_id or document_id = any(document_ids) or processing_attempt_id = any(attempt_ids)
  );
  delete from public.document_operations item
  where item.organization_id = p_organization_id
    and item.person_id = operation.deleted_person_id_snapshot;
  update public.document_operations item set target_person_id = null,
    result = item.result - 'target_person_id' - 'targetPersonId' - 'primary_person_id' - 'primaryPersonId'
  where item.organization_id = p_organization_id
    and item.target_person_id = operation.deleted_person_id_snapshot;

  update public.professional_profiles set review_id = null
  where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.profile_reviews where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.professional_profiles where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.inferences where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.evidence where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.resume_intakes where organization_id = p_organization_id
    and (resolved_person_id = target_person_id or resolved_document_id = any(document_ids));
  delete from public.documents where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.person_self_service_capabilities where organization_id = p_organization_id and person_id = target_person_id;
  delete from public.person_private_data where organization_id = p_organization_id and person_id = target_person_id;
  update public.positions set status = 'vacant', occupant_person_id = null, updated_at = now()
  where organization_id = p_organization_id and occupant_person_id = target_person_id;
  update public.people set merged_into_person_id = null, updated_at = now()
  where organization_id = p_organization_id and merged_into_person_id = target_person_id;
  delete from public.people where organization_id = p_organization_id and id = target_person_id;

  select count(*) into residual_count from (
    select id::text from public.people where organization_id = p_organization_id and id = target_person_id
    union all select id::text from public.people where organization_id = p_organization_id and merged_into_person_id = target_person_id
    union all select person_id::text from public.person_private_data where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.documents where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.document_processing_attempts where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.document_page_extractions where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.extraction_drafts where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.evidence where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.inferences where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.spatial_evidence_regions where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.professional_profiles where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.profile_reviews where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.profile_publication_decisions where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.profile_publication_removals where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.person_ingestion_events where organization_id = p_organization_id and person_id = target_person_id
    union all select item.id::text from public.document_operations item
      where item.organization_id = p_organization_id
        and (item.person_id = operation.deleted_person_id_snapshot or item.target_person_id = operation.deleted_person_id_snapshot)
    union all select id::text from public.match_evaluations where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.verification_needs where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.assessment_invitations where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.assessment_attempts where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.competency_demonstrated_evidence where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.knowledge_observations where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.knowledge_reinterpretation_impacts where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.knowledge_reinterpretation_jobs where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.resume_intakes where organization_id = p_organization_id and resolved_person_id = target_person_id
    union all select id::text from public.positions where organization_id = p_organization_id and occupant_person_id = target_person_id
    union all select id::text from public.person_self_service_capabilities where organization_id = p_organization_id and person_id = target_person_id
    union all select id::text from public.person_deletion_storage_items where operation_id = p_operation_id and status <> 'removed'
  ) residue;
  if residual_count <> 0 then raise exception using errcode = '55000', message = 'person_deletion_residue_detected'; end if;

  select count(*) into shared_knowledge_count from public.knowledge_concepts item
  where item.organization_id is null or item.organization_id = p_organization_id;
  select count(*) into shared_item_count from public.assessment_items item
  where item.organization_id is null or item.organization_id = p_organization_id;
  if shared_knowledge_count <> (operation.preflight_summary ->> 'sharedKnowledgeConcepts')::bigint
    or shared_item_count <> (operation.preflight_summary ->> 'sharedAssessmentItems')::bigint then
    raise exception using errcode = '55000', message = 'person_deletion_shared_knowledge_changed';
  end if;

  update public.person_deletion_operations item set status = 'completed', completed_at = now(), error_code = null,
    result = jsonb_build_object(
      'databaseResidues', 0, 'storageResidues', 0,
      'sharedKnowledgePreserved', true, 'sharedAssessmentItemsPreserved', true
    ), updated_at = now()
  where item.id = operation.id returning * into operation;
  return query select operation.id, operation.status, false;
end;
$$;

revoke all on function public.finalize_person_definitive_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_person_definitive_deletion(uuid, uuid) to service_role;

alter table public.person_deletion_operations enable row level security;
alter table public.person_deletion_storage_items enable row level security;
alter table public.person_self_service_capabilities enable row level security;

create policy person_deletion_operations_admin_select on public.person_deletion_operations
for select to authenticated using (
  (select private.has_org_role(organization_id, array['super_admin', 'owner', 'admin']::public.membership_role[]))
);

revoke all on public.person_deletion_operations, public.person_deletion_storage_items, public.person_self_service_capabilities
  from public, anon, authenticated;
grant select on public.person_deletion_operations to authenticated;
grant select, insert, update, delete on public.person_deletion_operations, public.person_deletion_storage_items, public.person_self_service_capabilities
  to service_role;

comment on table public.person_deletion_operations is
  'M5.5 authoritative, resumable and PII-minimized audit ledger for definitive Person deletion.';
comment on table public.person_self_service_capabilities is
  'Short-lived single-purpose capability for a Person to manage and definitively delete only their own data.';
comment on function public.preview_person_definitive_deletion(uuid, uuid) is
  'Authorizes and computes the complete tenant-scoped preflight without exposing technical dependencies to the UI.';
comment on function public.begin_person_definitive_deletion(uuid, uuid, text, text) is
  'Claims and locks one definitive Person deletion before Storage and relational purge.';
comment on function public.person_self_service_access(text, text, jsonb) is
  'Service-only boundary for a single-purpose Person self-service capability; assessment tokens are never accepted.';
comment on function public.finalize_person_definitive_deletion(uuid, uuid) is
  'Finalizes definitive Person deletion only after Storage removal and deterministic absence verification.';

commit;
