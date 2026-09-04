-- M5.3 - pilot operational resilience.
-- Extends the existing immutable profile, review lock, operation ledger and audit stream.

begin;

alter table public.people
  add column operational_status text not null default 'active'
    check (operational_status in ('active', 'archived', 'merged')),
  add column archived_at timestamptz,
  add column archived_by_auth_user_id uuid references auth.users(id) on delete restrict,
  add column merged_into_person_id uuid,
  add column merged_at timestamptz,
  add column merged_by_auth_user_id uuid references auth.users(id) on delete restrict;

alter table public.people
  add constraint people_merged_into_person_fk
  foreign key (organization_id, merged_into_person_id)
  references public.people(organization_id, id) on delete restrict,
  add constraint people_operational_status_shape_check check (
    (operational_status = 'active' and archived_at is null and merged_into_person_id is null and merged_at is null)
    or (operational_status = 'archived' and archived_at is not null and merged_into_person_id is null and merged_at is null)
    or (operational_status = 'merged' and archived_at is null and merged_into_person_id is not null and merged_at is not null and merged_into_person_id <> id)
  );

create index people_operational_status_idx
  on public.people (organization_id, operational_status, updated_at desc);
create index people_merged_into_idx
  on public.people (organization_id, merged_into_person_id)
  where merged_into_person_id is not null;

alter table public.profile_reviews
  add column source_kind text not null default 'document'
    check (source_kind in ('document', 'profile')),
  add column source_profile_id uuid,
  add column current_profile_id_at_start uuid,
  add column current_profile_version_at_start integer
    check (current_profile_version_at_start is null or current_profile_version_at_start > 0),
  add column source_document_snapshot jsonb
    check (source_document_snapshot is null or jsonb_typeof(source_document_snapshot) = 'object');

update public.profile_reviews
set current_profile_id_at_start = base_profile_id,
    current_profile_version_at_start = base_profile_version
where current_profile_id_at_start is null;

alter table public.profile_reviews
  alter column document_id drop not null,
  alter column processing_attempt_id drop not null,
  drop constraint if exists profile_reviews_organization_id_document_id_fkey,
  drop constraint if exists profile_reviews_organization_id_processing_attempt_id_fkey;

alter table public.profile_reviews
  add constraint profile_reviews_document_resilient_fk
    foreign key (organization_id, document_id)
    references public.documents(organization_id, id) on delete set null (document_id),
  add constraint profile_reviews_attempt_resilient_fk
    foreign key (organization_id, processing_attempt_id)
    references public.document_processing_attempts(organization_id, id) on delete set null (processing_attempt_id),
  add constraint profile_reviews_source_profile_fk
    foreign key (organization_id, source_profile_id)
    references public.professional_profiles(organization_id, id) on delete restrict,
  add constraint profile_reviews_current_profile_at_start_fk
    foreign key (organization_id, current_profile_id_at_start)
    references public.professional_profiles(organization_id, id) on delete restrict,
  add constraint profile_reviews_source_shape_check check (
    (source_kind = 'document' and (
      (document_id is not null and processing_attempt_id is not null)
      or (document_id is null and source_document_snapshot is not null)
    ))
    or (source_kind = 'profile' and source_profile_id is not null)
  );

create unique index profile_reviews_one_profile_source_draft_idx
  on public.profile_reviews (organization_id, person_id, source_profile_id)
  where state = 'draft' and source_kind = 'profile';

alter table public.document_operations
  add column target_person_id uuid,
  add column source_profile_id uuid,
  add constraint document_operations_target_person_fk
    foreign key (organization_id, target_person_id)
    references public.people(organization_id, id) on delete restrict,
  add constraint document_operations_source_profile_fk
    foreign key (organization_id, source_profile_id)
    references public.professional_profiles(organization_id, id) on delete restrict;

alter table public.document_operations drop constraint if exists document_operations_operation_type_check;
alter table public.document_operations add constraint document_operations_operation_type_check check (operation_type in (
  'register_document', 'persist_extraction', 'retry_processing', 'record_failure',
  'start_review', 'save_review_draft', 'approve_review', 'invalidate_review',
  'record_review_evidence', 'retire_review_evidence', 'restore_profile',
  'reset_profile', 'delete_document', 'start_profile_source_review',
  'move_document', 'merge_people', 'update_person_lifecycle', 'set_person_archive_state'
));

alter table public.professional_profiles drop constraint if exists professional_profiles_publication_origin_check;
alter table public.professional_profiles add constraint professional_profiles_publication_origin_check
  check (publication_origin in (
    'legacy', 'review_merge', 'review_replace', 'restored',
    'document_deletion_rebuild', 'merged_person_profile'
  ));

create or replace function private.m53_feedback(p_reason text, p_next_action text default null)
returns text language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'contract', 'operation-feedback-2.0.0',
    'reason', p_reason,
    'nextAction', p_next_action,
    'itemNumber', null
  )::text
$$;
revoke all on function private.m53_feedback(text, text) from public, anon, authenticated;

create or replace function private.reassign_document_person(
  p_organization_id uuid, p_document_id uuid, p_target_person_id uuid
) returns integer language plpgsql set search_path = '' as $$
declare
  next_document_version integer;
begin
  select coalesce(max(item.document_version), 0) + 1 into next_document_version
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_target_person_id
    and item.id <> p_document_id;

  update public.documents set person_id = p_target_person_id,
    document_version = next_document_version, updated_at = now()
  where organization_id = p_organization_id and id = p_document_id;
  update public.document_processing_attempts set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.document_page_extractions set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.extraction_drafts set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.evidence set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.profile_reviews set person_id = p_target_person_id
  where organization_id = p_organization_id and document_id = p_document_id;
  update public.profile_publication_decisions decision set person_id = p_target_person_id
  where decision.organization_id = p_organization_id and decision.review_id in (
    select review.id from public.profile_reviews review
    where review.organization_id = p_organization_id and review.document_id = p_document_id
  );
  update public.knowledge_observations observation set person_id = p_target_person_id
  where observation.organization_id = p_organization_id and observation.evidence_id in (
    select evidence.id from public.evidence evidence
    where evidence.organization_id = p_organization_id and evidence.document_id = p_document_id
  );
  return next_document_version;
end;
$$;
revoke all on function private.reassign_document_person(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.start_profile_version_review(
  p_organization_id uuid,
  p_person_id uuid,
  p_profile_id uuid,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  source_profile public.professional_profiles;
  current_profile public.professional_profiles;
  existing_review public.profile_reviews;
  operation public.document_operations;
  review_payload jsonb;
  new_review_id uuid;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into source_profile from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.id = p_profile_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'profile_source_not_found',
      detail = private.m53_feedback('A versão escolhida não está mais disponível para esta Pessoa.', 'Escolha outra versão na Central da Pessoa.');
  end if;
  perform 1 from public.people item
  where item.organization_id = p_organization_id and item.id = p_person_id
    and item.operational_status <> 'merged' for update;
  if not found then
    raise exception using errcode = '55000', message = 'person_not_available',
      detail = private.m53_feedback('Esta Pessoa foi mesclada e não recebe novas revisões.', 'Abra o cadastro principal indicado na Central da Pessoa.');
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_person_id::text, p_profile_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, p_person_id, source_profile.source_document_id,
    'start_profile_source_review', p_idempotency_key, fingerprint, actor_id
  );
  update public.document_operations set source_profile_id = p_profile_id where id = operation.id;
  if operation.status = 'completed' and operation.review_id is not null then
    return query select item.id, item.lock_version, true from public.profile_reviews item
    where item.organization_id = p_organization_id and item.id = operation.review_id;
    return;
  end if;

  select * into existing_review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.person_id = p_person_id
    and item.source_kind = 'profile' and item.source_profile_id = p_profile_id and item.state = 'draft'
  for update;
  if found then
    update public.document_operations set review_id = existing_review.id, status = 'completed', completed_at = now(),
      result = jsonb_build_object('review_id', existing_review.id, 'lock_version', existing_review.lock_version)
    where id = operation.id;
    return query select existing_review.id, existing_review.lock_version, true;
    return;
  end if;

  select * into current_profile from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.superseded_at is null
  for update;
  review_payload := private.normalize_profile_review_contract(source_profile.profile_data, source_profile.profile_data);

  insert into public.profile_reviews (
    organization_id, person_id, document_id, processing_attempt_id,
    base_profile_id, base_profile_version, current_profile_id_at_start,
    current_profile_version_at_start, source_kind, source_profile_id,
    source_document_snapshot, extracted_data, reviewed_data,
    started_by_auth_user_id, last_edited_by_auth_user_id
  ) values (
    p_organization_id, p_person_id, source_profile.source_document_id,
    source_profile.processing_attempt_id, source_profile.id, source_profile.profile_version,
    current_profile.id, current_profile.profile_version, 'profile', source_profile.id,
    source_profile.source_document_snapshot, review_payload, review_payload, actor_id, actor_id
  ) returning id into new_review_id;

  insert into public.profile_review_revisions (
    organization_id, review_id, revision_number, reviewed_data, change_reason, actor_auth_user_id
  ) values (
    p_organization_id, new_review_id, 1, review_payload,
    'Nova revisão criada a partir de uma versão existente do Perfil.', actor_id
  );
  update public.document_operations set review_id = new_review_id, status = 'completed', completed_at = now(),
    result = jsonb_build_object('review_id', new_review_id, 'lock_version', 1, 'source_profile_id', source_profile.id)
  where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_person_id, source_profile.source_document_id,
    source_profile.processing_attempt_id, actor_id, 'profile_source_review_started', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', new_review_id,
      'source_profile_id', source_profile.id, 'source_profile_version', source_profile.profile_version)
  );
  return query select new_review_id, 1, false;
end;
$$;

revoke all on function public.start_profile_version_review(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.start_profile_version_review(uuid, uuid, uuid, text) to authenticated;

create or replace function public.start_document_revision(
  p_organization_id uuid,
  p_person_id uuid,
  p_document_id uuid,
  p_processing_attempt_id uuid,
  p_idempotency_key text
)
returns table (review_id uuid, lock_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  target_document public.documents;
  draft_data jsonb;
  current_profile public.professional_profiles;
  existing_review public.profile_reviews;
  operation public.document_operations;
  new_review_id uuid;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into target_document from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.id = p_document_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_source_not_found',
    detail = private.m53_feedback('Este documento não está mais disponível para esta Pessoa.', 'Escolha outro documento existente ou importe um novo currículo.'); end if;
  perform 1 from public.document_processing_attempts item
  where item.organization_id = p_organization_id and item.document_id = p_document_id
    and item.id = p_processing_attempt_id and item.state in ('structured', 'profile_ready', 'completed', 'failed_structuring');
  if not found then raise exception using errcode = 'P0002', message = 'document_source_not_reusable',
    detail = private.m53_feedback('Este documento ainda não possui conteúdo suficiente para uma nova revisão.', 'Reabra a importação para concluir o processamento.'); end if;
  select item.identified_fields into draft_data from public.extraction_drafts item
  where item.organization_id = p_organization_id and item.document_id = p_document_id
    and item.processing_attempt_id = p_processing_attempt_id and item.validation_status in ('valid', 'insufficient');
  if draft_data is null then raise exception using errcode = 'P0002', message = 'document_draft_not_reusable',
    detail = private.m53_feedback('O conteúdo estruturado deste documento não está disponível.', 'Reprocesse o documento para criar uma nova revisão.'); end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_person_id::text, p_document_id::text, p_processing_attempt_id::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, p_document_id,
    'start_review', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' and operation.review_id is not null then
    return query select item.id, item.lock_version, true from public.profile_reviews item
    where item.organization_id = p_organization_id and item.id = operation.review_id; return;
  end if;
  select * into existing_review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.processing_attempt_id = p_processing_attempt_id and item.state = 'draft'
  for update;
  if found then
    update public.document_operations set review_id = existing_review.id, status = 'completed', completed_at = now(),
      result = jsonb_build_object('review_id', existing_review.id, 'lock_version', existing_review.lock_version)
    where id = operation.id;
    return query select existing_review.id, existing_review.lock_version, true; return;
  end if;
  select * into current_profile from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = p_person_id and item.superseded_at is null for update;
  insert into public.profile_reviews (
    organization_id, person_id, document_id, processing_attempt_id, base_profile_id, base_profile_version,
    current_profile_id_at_start, current_profile_version_at_start, source_kind, source_document_snapshot,
    extracted_data, reviewed_data, started_by_auth_user_id, last_edited_by_auth_user_id
  ) values (
    p_organization_id, p_person_id, p_document_id, p_processing_attempt_id,
    current_profile.id, current_profile.profile_version, current_profile.id, current_profile.profile_version,
    'document', jsonb_build_object('id', target_document.id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version), draft_data, draft_data, actor_id, actor_id
  ) returning id into new_review_id;
  insert into public.profile_review_revisions (
    organization_id, review_id, revision_number, reviewed_data, change_reason, actor_auth_user_id
  ) values (p_organization_id, new_review_id, 1, draft_data, 'Nova revisão criada a partir de um documento existente.', actor_id);
  update public.documents set review_state = 'in_review', status = 'in_review' where id = p_document_id;
  update public.document_operations set review_id = new_review_id, status = 'completed', completed_at = now(),
    result = jsonb_build_object('review_id', new_review_id, 'lock_version', 1) where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id, actor_auth_user_id, event_type, result, metadata
  ) values (p_organization_id, p_person_id, p_document_id, p_processing_attempt_id, actor_id,
    'document_revision_started', 'success', jsonb_build_object('operation_id', operation.id, 'review_id', new_review_id));
  return query select new_review_id, 1, false;
end;
$$;

revoke all on function public.start_document_revision(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.start_document_revision(uuid, uuid, uuid, uuid, text) to authenticated;

create or replace function public.approve_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_idempotency_key text
)
returns table (review_id uuid, profile_id uuid, profile_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  review public.profile_reviews;
  operation public.document_operations;
  current_profile public.professional_profiles;
  latest_attempt_id uuid;
  new_profile_id uuid;
  next_profile_version integer;
  fingerprint text;
  profile_payload jsonb;
  identity_payload jsonb;
  contact_payload jsonb;
  reviewed_name text;
  reviewed_city text;
  reviewed_state text;
  reviewed_phone text;
  reviewed_email text;
  reviewed_linkedin text;
  normalized_phone_digits text;
  normalized_phone_e164 text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'review_not_found',
    detail = private.m53_feedback('Esta revisão não está mais disponível.', 'Volte à Central da Pessoa e escolha Continuar revisão ou Criar nova revisão.'); end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_review_id::text, p_expected_lock_version::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, review.person_id, review.document_id, 'approve_review',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.profile_id is not null then
    return query select review.id, item.id, item.profile_version, true
    from public.professional_profiles item
    where item.organization_id = p_organization_id and item.id = operation.profile_id;
    return;
  end if;
  if review.state <> 'draft' then raise exception using errcode = '55000', message = 'review_not_approvable',
    detail = private.m53_feedback('Esta revisão já foi concluída ou arquivada.', 'Crie uma nova revisão a partir do Perfil ou do documento.'); end if;
  if review.lock_version <> p_expected_lock_version then raise exception using errcode = 'P0001', message = 'review_conflict',
    detail = private.m53_feedback('Esta revisão foi atualizada em outra tela.', 'Recarregue a revisão para continuar com a versão mais recente.'); end if;
  if not private.is_valid_structured_resume_summary(review.reviewed_data) then
    raise exception using errcode = '22023', message = 'review_contract_invalid',
      detail = private.m53_feedback('Alguns campos da revisão precisam ser atualizados antes da publicação.', 'Volte à revisão; o Prisma destacará os campos que precisam de atenção.');
  end if;

  perform 1 from public.people item
  where item.organization_id = p_organization_id and item.id = review.person_id
    and item.operational_status <> 'merged' for update;
  if not found then raise exception using errcode = '55000', message = 'person_not_available',
    detail = private.m53_feedback('Esta Pessoa foi mesclada e não pode receber uma nova versão.', 'Abra o cadastro principal indicado na Central da Pessoa.'); end if;

  identity_payload := coalesce(review.reviewed_data -> 'identity', '{}'::jsonb);
  contact_payload := coalesce(review.reviewed_data -> 'contact', '{}'::jsonb);
  profile_payload := review.reviewed_data - 'identity' - 'contact';
  reviewed_name := nullif(btrim(identity_payload ->> 'fullName'), '');
  reviewed_city := nullif(btrim(contact_payload ->> 'city'), '');
  reviewed_state := nullif(btrim(contact_payload ->> 'state'), '');
  reviewed_phone := nullif(btrim(contact_payload ->> 'phone'), '');
  reviewed_email := nullif(lower(btrim(contact_payload ->> 'email')), '');
  reviewed_linkedin := nullif(btrim(contact_payload ->> 'linkedin'), '');
  if reviewed_phone is not null then
    normalized_phone_digits := regexp_replace(reviewed_phone, '[^0-9]', '', 'g');
    if char_length(normalized_phone_digits) in (10, 11) then normalized_phone_digits := '55' || normalized_phone_digits;
    elsif char_length(normalized_phone_digits) not between 12 and 15 then
      raise exception using errcode = '22023', message = 'reviewed_phone_invalid',
        detail = private.m53_feedback('O telefone informado está incompleto.', 'Revise o telefone ou deixe o campo vazio antes de publicar.');
    end if;
    normalized_phone_e164 := '+' || normalized_phone_digits;
  end if;
  if reviewed_name is not null then
    update public.people set full_name = reviewed_name, updated_at = now()
    where organization_id = p_organization_id and id = review.person_id;
  end if;
  if reviewed_city is not null or reviewed_state is not null or reviewed_phone is not null
    or reviewed_email is not null or reviewed_linkedin is not null then
    insert into public.person_private_data (
      organization_id, person_id, email, phone, location, phone_e164,
      phone_country_iso2, phone_country_label, phone_country_code,
      phone_national_number, city, state_code, linkedin_url
    ) values (
      p_organization_id, review.person_id, reviewed_email, reviewed_phone,
      nullif(concat_ws(', ', reviewed_city, reviewed_state), ''), normalized_phone_e164,
      case when normalized_phone_digits like '55%' then 'BR' end,
      case when normalized_phone_digits like '55%' then 'Brasil' end,
      case when normalized_phone_digits like '55%' then '55' end,
      case when normalized_phone_digits like '55%' then substring(normalized_phone_digits from 3) end,
      reviewed_city, reviewed_state, reviewed_linkedin
    ) on conflict (organization_id, person_id) do update set
      email = coalesce(excluded.email, public.person_private_data.email),
      phone = coalesce(excluded.phone, public.person_private_data.phone),
      phone_e164 = coalesce(excluded.phone_e164, public.person_private_data.phone_e164),
      phone_country_iso2 = case when excluded.phone is not null then excluded.phone_country_iso2 else public.person_private_data.phone_country_iso2 end,
      phone_country_label = case when excluded.phone is not null then excluded.phone_country_label else public.person_private_data.phone_country_label end,
      phone_country_code = case when excluded.phone is not null then excluded.phone_country_code else public.person_private_data.phone_country_code end,
      phone_national_number = case when excluded.phone is not null then excluded.phone_national_number else public.person_private_data.phone_national_number end,
      city = coalesce(excluded.city, public.person_private_data.city),
      state_code = coalesce(excluded.state_code, public.person_private_data.state_code),
      location = case when excluded.city is not null or excluded.state_code is not null
        then concat_ws(', ', coalesce(excluded.city, public.person_private_data.city), coalesce(excluded.state_code, public.person_private_data.state_code))
        else public.person_private_data.location end,
      linkedin_url = coalesce(excluded.linkedin_url, public.person_private_data.linkedin_url),
      updated_at = now();
  end if;

  select * into current_profile from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = review.person_id and item.superseded_at is null for update;
  if current_profile.id is distinct from review.current_profile_id_at_start
    or current_profile.profile_version is distinct from review.current_profile_version_at_start then
    raise exception using errcode = 'P0001', message = 'profile_base_conflict',
      detail = private.m53_feedback('O Perfil vigente mudou depois que esta revisão foi iniciada.', 'Compare novamente com o Perfil atual antes de publicar.');
  end if;
  if review.source_kind = 'document' then
    select item.id into latest_attempt_id from public.document_processing_attempts item
    where item.organization_id = p_organization_id and item.document_id = review.document_id
    order by item.attempt_number desc limit 1;
    if latest_attempt_id is distinct from review.processing_attempt_id then
      raise exception using errcode = 'P0001', message = 'processing_base_conflict',
        detail = private.m53_feedback('Este documento foi reprocessado depois que a revisão começou.', 'Reabra o documento e continue pela revisão mais recente.');
    end if;
    if not exists (select 1 from public.evidence item where item.organization_id = p_organization_id
      and item.processing_attempt_id = review.processing_attempt_id) then
      raise exception using errcode = '23514', message = 'material_evidence_required',
        detail = private.m53_feedback('A evidência deste documento não está disponível para publicação.', 'Reprocesse o documento ou crie uma revisão a partir do Perfil vigente.');
    end if;
  end if;

  select coalesce(max(item.profile_version), 0) + 1 into next_profile_version
  from public.professional_profiles item where item.organization_id = p_organization_id and item.person_id = review.person_id;
  update public.professional_profiles set superseded_at = now()
  where organization_id = p_organization_id and person_id = review.person_id and superseded_at is null;
  insert into public.professional_profiles (
    organization_id, person_id, source_document_id, profile_data, uncertainties, not_identified,
    extraction_version, inference_version, embedding_version, prompt_version, model_version,
    processing_attempt_id, profile_version, review_status, review_id, approved_by_auth_user_id,
    approved_at, base_profile_id, source_document_snapshot
  ) values (
    p_organization_id, review.person_id, review.document_id, profile_payload,
    coalesce(profile_payload -> 'uncertainties', '[]'::jsonb), coalesce(profile_payload -> 'notIdentified', '[]'::jsonb),
    case when review.source_kind = 'profile' then 'profile-snapshot-reuse-v1' else 'm2c-reviewed-v2' end,
    'none', 'none', 'none', 'human-reviewed-deterministic', review.processing_attempt_id,
    next_profile_version, 'approved', review.id, actor_id, now(), review.base_profile_id,
    review.source_document_snapshot
  ) returning id into new_profile_id;
  update public.profile_reviews set state = 'approved', approved_profile_id = new_profile_id,
    approved_by_auth_user_id = actor_id, approved_at = now(), last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;
  if review.processing_attempt_id is not null then
    update public.document_processing_attempts set state = 'completed', current_method = 'human_review_approved', completed_at = now()
    where organization_id = p_organization_id and id = review.processing_attempt_id;
  end if;
  if review.document_id is not null then
    update public.documents set status = 'approved', review_state = 'approved', processed_at = now(),
      failure_category = null, failure_reason = null, failure_technical_message = null
    where organization_id = p_organization_id and id = review.document_id;
  end if;
  update public.people set profile_state = 'generated', updated_at = now()
  where organization_id = p_organization_id and id = review.person_id;
  update public.document_operations set review_id = p_review_id, profile_id = new_profile_id,
    status = 'completed', completed_at = now(), result = jsonb_build_object(
      'review_id', p_review_id, 'profile_id', new_profile_id,
      'profile_version', next_profile_version, 'source_kind', review.source_kind
    ) where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'profile_review_approved', 'success', jsonb_build_object(
      'operation_id', operation.id, 'review_id', p_review_id, 'profile_id', new_profile_id,
      'profile_version', next_profile_version, 'source_kind', review.source_kind,
      'source_profile_id', review.source_profile_id
    )
  );
  return query select p_review_id, new_profile_id, next_profile_version, false;
end;
$$;

revoke all on function public.approve_profile_review(uuid, uuid, integer, text) from public, anon;
grant execute on function public.approve_profile_review(uuid, uuid, integer, text) to authenticated;

create or replace function public.preview_document_deletion(
  p_organization_id uuid, p_person_id uuid, p_document_id uuid
)
returns table (
  document_id uuid, filename text, processing_count integer, evidence_count integer,
  review_count integer, historical_profile_count integer, other_document_count integer,
  current_profile_preserved boolean
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_document_reviewer(p_organization_id);
  return query
  select document.id, document.filename,
    (select count(*)::integer from public.document_processing_attempts item
      where item.organization_id = p_organization_id and item.document_id = document.id),
    (select count(*)::integer from public.evidence item
      where item.organization_id = p_organization_id and item.document_id = document.id),
    (select count(*)::integer from public.profile_reviews item
      where item.organization_id = p_organization_id and item.document_id = document.id),
    (select count(*)::integer from public.professional_profiles item
      where item.organization_id = p_organization_id and item.person_id = p_person_id
        and item.source_document_id = document.id),
    (select count(*)::integer from public.documents item
      where item.organization_id = p_organization_id and item.person_id = p_person_id and item.id <> document.id),
    true
  from public.documents document
  where document.organization_id = p_organization_id and document.person_id = p_person_id and document.id = p_document_id;
  if not found then raise exception using errcode = 'P0002', message = 'document_not_found',
    detail = private.m53_feedback('Este documento já não está disponível.', 'Atualize a Central da Pessoa para ver o estado mais recente.'); end if;
end;
$$;

revoke all on function public.preview_document_deletion(uuid, uuid, uuid) from public, anon;
grant execute on function public.preview_document_deletion(uuid, uuid, uuid) to authenticated;

create or replace function public.finalize_document_deletion(
  p_organization_id uuid, p_operation_id uuid
)
returns table (document_id uuid, profile_version integer, profile_rebuilt boolean, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  operation public.document_operations;
  target_document public.documents;
  current_profile_version integer;
  original_document_id uuid;
  document_evidence_ids uuid[] := '{}'::uuid[];
  document_inference_ids uuid[] := '{}'::uuid[];
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into operation from public.document_operations item
  where item.organization_id = p_organization_id and item.id = p_operation_id
    and item.operation_type = 'delete_document' for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_deletion_operation_not_found',
    detail = private.m53_feedback('A confirmação de exclusão expirou.', 'Abra novamente a exclusão para revisar o impacto atualizado.'); end if;
  original_document_id := (operation.result ->> 'document_id')::uuid;
  if operation.status = 'completed' then
    return query select original_document_id,
      nullif(operation.result ->> 'profile_version', '')::integer, false, true;
    return;
  end if;
  select * into target_document from public.documents item
  where item.organization_id = p_organization_id and item.id = original_document_id
    and item.person_id = operation.person_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'document_changed_before_deletion',
    detail = private.m53_feedback('O documento mudou depois da confirmação.', 'Revise novamente o impacto antes de excluir.'); end if;
  perform 1 from public.people item where item.organization_id = p_organization_id
    and item.id = operation.person_id for update;
  select item.profile_version into current_profile_version from public.professional_profiles item
  where item.organization_id = p_organization_id and item.person_id = operation.person_id
    and item.superseded_at is null;

  update public.professional_profiles item set
    source_document_snapshot = coalesce(item.source_document_snapshot, jsonb_build_object(
      'id', target_document.id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version, 'deletedAt', now()
    )), source_document_id = null, processing_attempt_id = null
  where item.organization_id = p_organization_id and item.source_document_id = original_document_id;
  update public.profile_reviews item set
    source_document_snapshot = coalesce(item.source_document_snapshot, jsonb_build_object(
      'id', target_document.id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version, 'deletedAt', now()
    )), document_id = null, processing_attempt_id = null
  where item.organization_id = p_organization_id and item.document_id = original_document_id;

  select coalesce(array_agg(item.id), '{}'::uuid[]) into document_evidence_ids
  from public.evidence item where item.organization_id = p_organization_id and item.document_id = original_document_id;
  select coalesce(array_agg(distinct link.inference_id), '{}'::uuid[]) into document_inference_ids
  from public.inference_evidence link where link.organization_id = p_organization_id
    and link.evidence_id = any(document_evidence_ids);
  update public.knowledge_observations item set
    source_snapshot = coalesce(item.source_snapshot, jsonb_strip_nulls(jsonb_build_object(
      'documentId', original_document_id, 'filename', target_document.filename,
      'documentVersion', target_document.document_version, 'deletedAt', now(),
      'evidenceId', item.evidence_id, 'reviewId', item.review_id,
      'sourceFieldPath', item.source_field_path
    ))), evidence_link_id = null, evidence_id = null, review_id = null
  where item.organization_id = p_organization_id and (
    item.evidence_id = any(document_evidence_ids)
    or item.review_id in (select review.id from public.profile_reviews review
      where review.organization_id = p_organization_id
        and review.source_document_snapshot ->> 'id' = original_document_id::text)
  );
  update public.knowledge_inbox inbox set evidence_reference_ids = coalesce((
    select array_agg(reference_id) from unnest(inbox.evidence_reference_ids) reference_id
    where not (reference_id = any(document_evidence_ids))
  ), '{}'::uuid[])
  where document_evidence_ids <> '{}'::uuid[] and inbox.evidence_reference_ids && document_evidence_ids;
  delete from public.resume_intakes where organization_id = p_organization_id and resolved_document_id = original_document_id;
  delete from public.documents where organization_id = p_organization_id and id = original_document_id;
  delete from public.inferences item where item.organization_id = p_organization_id
    and item.id = any(document_inference_ids)
    and not exists (select 1 from public.inference_evidence link
      where link.organization_id = p_organization_id and link.inference_id = item.id);

  update public.document_operations set status = 'completed', completed_at = now(), result = result || jsonb_build_object(
    'profile_rebuilt', false, 'profile_version', current_profile_version,
    'profile_preserved', true, 'deleted_at', now()
  ) where id = p_operation_id;
  insert into public.person_ingestion_events (
    organization_id, person_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, operation.person_id, actor_id, 'document_deleted', 'success',
    jsonb_build_object('operation_id', p_operation_id, 'document_id', original_document_id,
      'filename', target_document.filename, 'profile_preserved', true,
      'profile_version', current_profile_version)
  );
  return query select original_document_id, current_profile_version, false, false;
end;
$$;

revoke all on function public.finalize_document_deletion(uuid, uuid) from public, anon;
grant execute on function public.finalize_document_deletion(uuid, uuid) to authenticated;

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
  update public.document_operations set target_person_id = p_target_person_id where id = operation.id;
  if operation.status = 'completed' then
    return query select p_document_id, source_id, p_target_person_id,
      coalesce((operation.result ->> 'current_profile_affected')::boolean, false), true; return;
  end if;
  select exists (select 1 from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = source_id
      and item.source_document_id = p_document_id and item.superseded_at is null) into affects_current;
  update public.profile_reviews set state = 'invalidated', invalidated_at = now(), last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and document_id = p_document_id and state = 'draft';
  target_document_version := private.reassign_document_person(p_organization_id, p_document_id, p_target_person_id);
  update public.documents set review_state = 'ready_for_review', status = 'ready_for_review', updated_at = now()
  where organization_id = p_organization_id and id = p_document_id;
  update public.document_operations set status = 'completed', completed_at = now(), result = jsonb_build_object(
    'source_person_id', source_id, 'target_person_id', p_target_person_id,
    'current_profile_affected', affects_current, 'history_preserved', true,
    'previous_document_version', target_document.document_version,
    'target_document_version', target_document_version
  ) where id = operation.id;
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

create or replace function public.update_person_lifecycle(
  p_organization_id uuid, p_person_id uuid, p_lifecycle text,
  p_expected_updated_at timestamptz, p_idempotency_key text
)
returns table (person_id uuid, lifecycle text, updated_at timestamptz, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  person public.people;
  operation public.document_operations;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_lifecycle not in ('candidate', 'employee', 'former_employee', 'former_candidate', 'talent_pool') then
    raise exception using errcode = '22023', message = 'person_lifecycle_invalid',
      detail = private.m53_feedback('O vínculo escolhido não é válido.', 'Escolha uma das opções disponíveis no campo Vínculo.');
  end if;
  select * into person from public.people item where item.organization_id = p_organization_id
    and item.id = p_person_id and item.operational_status <> 'merged' for update;
  if not found then raise exception using errcode = 'P0002', message = 'person_not_available',
    detail = private.m53_feedback('Esta Pessoa não está disponível para alteração.', 'Atualize a Central da Pessoa.'); end if;
  if person.updated_at is distinct from p_expected_updated_at then raise exception using errcode = 'P0001', message = 'person_state_conflict',
    detail = private.m53_feedback('Os dados desta Pessoa foram atualizados em outra tela.', 'Recarregue a Central antes de alterar o vínculo.'); end if;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_person_id::text, p_lifecycle, p_expected_updated_at::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, null,
    'update_person_lifecycle', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' then
    return query select item.id, item.lifecycle, item.updated_at, true from public.people item
    where item.organization_id = p_organization_id and item.id = p_person_id; return;
  end if;
  update public.people item set lifecycle = p_lifecycle, updated_at = now()
  where item.organization_id = p_organization_id and item.id = p_person_id
  returning item.* into person;
  update public.document_operations set status = 'completed', completed_at = now(),
    result = jsonb_build_object('previous_lifecycle', operation.result ->> 'previous_lifecycle', 'lifecycle', p_lifecycle)
  where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, actor_auth_user_id, event_type, result, metadata
  ) values (p_organization_id, p_person_id, actor_id, 'person_lifecycle_changed', 'success',
    jsonb_build_object('operation_id', operation.id, 'lifecycle', p_lifecycle));
  return query select person.id, person.lifecycle, person.updated_at, false;
end;
$$;

revoke all on function public.update_person_lifecycle(uuid, uuid, text, timestamptz, text) from public, anon;
grant execute on function public.update_person_lifecycle(uuid, uuid, text, timestamptz, text) to authenticated;

create or replace function public.set_person_archive_state(
  p_organization_id uuid, p_person_id uuid, p_archive boolean,
  p_expected_updated_at timestamptz, p_idempotency_key text
)
returns table (person_id uuid, operational_status text, updated_at timestamptz, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  person public.people;
  operation public.document_operations;
  target_status text;
  fingerprint text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  target_status := case when p_archive then 'archived' else 'active' end;
  select * into person from public.people item where item.organization_id = p_organization_id
    and item.id = p_person_id and item.operational_status <> 'merged' for update;
  if not found then raise exception using errcode = 'P0002', message = 'person_not_available',
    detail = private.m53_feedback('Esta Pessoa foi mesclada e não pode ser arquivada ou reativada.', 'Abra o cadastro principal indicado na Central da Pessoa.'); end if;
  if person.updated_at is distinct from p_expected_updated_at then raise exception using errcode = 'P0001', message = 'person_state_conflict',
    detail = private.m53_feedback('O estado desta Pessoa mudou em outra tela.', 'Recarregue a Central antes de continuar.'); end if;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_person_id::text, target_status, p_expected_updated_at::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_person_id, null,
    'set_person_archive_state', p_idempotency_key, fingerprint, actor_id);
  if operation.status = 'completed' then
    return query select item.id, item.operational_status, item.updated_at, true from public.people item
    where item.organization_id = p_organization_id and item.id = p_person_id; return;
  end if;
  update public.people item set operational_status = target_status,
    archived_at = case when p_archive then now() else null end,
    archived_by_auth_user_id = case when p_archive then actor_id else null end,
    updated_at = now()
  where item.organization_id = p_organization_id and item.id = p_person_id returning item.* into person;
  update public.document_operations set status = 'completed', completed_at = now(),
    result = jsonb_build_object('operational_status', target_status) where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, actor_auth_user_id, event_type, result, metadata
  ) values (p_organization_id, p_person_id, actor_id,
    case when p_archive then 'person_archived' else 'person_reactivated' end,
    'success', jsonb_build_object('operation_id', operation.id));
  return query select person.id, person.operational_status, person.updated_at, false;
end;
$$;

revoke all on function public.set_person_archive_state(uuid, uuid, boolean, timestamptz, text) from public, anon;
grant execute on function public.set_person_archive_state(uuid, uuid, boolean, timestamptz, text) to authenticated;

create or replace function public.merge_people(
  p_organization_id uuid, p_source_person_id uuid, p_target_person_id uuid,
  p_contact_choices jsonb, p_profile_choice text, p_idempotency_key text
)
returns table (primary_person_id uuid, absorbed_person_id uuid, profile_version integer, reused boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict error
declare
  actor_id uuid;
  source_person public.people;
  target_person public.people;
  source_private public.person_private_data;
  target_private public.person_private_data;
  source_profile public.professional_profiles;
  target_profile public.professional_profiles;
  chosen_profile public.professional_profiles;
  operation public.document_operations;
  next_profile_version integer;
  created_profile_id uuid;
  fingerprint text;
  conflict_field text;
  choice text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if p_source_person_id = p_target_person_id then raise exception using errcode = '22023', message = 'merge_same_person',
    detail = private.m53_feedback('Escolha duas Pessoas diferentes para a mesclagem.', 'Volte e selecione o cadastro duplicado.'); end if;
  perform 1 from public.people item where item.organization_id = p_organization_id
    and item.id in (p_source_person_id, p_target_person_id) order by item.id for update;
  select * into source_person from public.people item where item.organization_id = p_organization_id and item.id = p_source_person_id;
  select * into target_person from public.people item where item.organization_id = p_organization_id and item.id = p_target_person_id;
  if source_person.id is null or target_person.id is null or source_person.operational_status <> 'active' or target_person.operational_status <> 'active' then
    raise exception using errcode = 'P0002', message = 'merge_person_not_available',
      detail = private.m53_feedback('Uma das Pessoas escolhidas não está mais disponível para mesclagem.', 'Atualize a busca e escolha dois cadastros ativos.');
  end if;
  if jsonb_typeof(coalesce(p_contact_choices, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'merge_choices_invalid',
      detail = private.m53_feedback('Não foi possível entender as escolhas dos dados de contato.', 'Revise somente os campos marcados como conflito.');
  end if;
  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_source_person_id::text,
    p_target_person_id::text, coalesce(p_contact_choices, '{}'::jsonb)::text, coalesce(p_profile_choice, 'automatic')), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_source_person_id, null,
    'merge_people', p_idempotency_key, fingerprint, actor_id);
  update public.document_operations set target_person_id = p_target_person_id where id = operation.id;
  if operation.status = 'completed' then
    return query select p_target_person_id, p_source_person_id,
      nullif(operation.result ->> 'profile_version', '')::integer, true; return;
  end if;

  select * into source_private from public.person_private_data item
    where item.organization_id = p_organization_id and item.person_id = p_source_person_id for update;
  select * into target_private from public.person_private_data item
    where item.organization_id = p_organization_id and item.person_id = p_target_person_id for update;
  foreach conflict_field in array array['email','phone_e164','birth_date'] loop
    if nullif(to_jsonb(source_private) ->> conflict_field, '') is not null
      and nullif(to_jsonb(target_private) ->> conflict_field, '') is not null
      and (to_jsonb(source_private) ->> conflict_field) is distinct from (to_jsonb(target_private) ->> conflict_field) then
      choice := p_contact_choices ->> conflict_field;
      if choice not in ('source', 'target') then raise exception using errcode = '22023', message = 'merge_contact_choice_required',
        detail = private.m53_feedback('Existem dois valores diferentes para ' || case conflict_field
          when 'email' then 'o e-mail' when 'phone_e164' then 'o telefone' else 'a data de nascimento' end || '.',
          'Escolha qual valor deve permanecer apenas nesse campo.'); end if;
    end if;
  end loop;

  select * into source_profile from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = p_source_person_id and item.superseded_at is null for update;
  select * into target_profile from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = p_target_person_id and item.superseded_at is null for update;
  if source_profile.id is not null and target_profile.id is not null and p_profile_choice not in ('source', 'target') then
    raise exception using errcode = '22023', message = 'merge_profile_choice_required',
      detail = private.m53_feedback('As duas Pessoas possuem um Perfil vigente.', 'Escolha qual Perfil deve permanecer como base; nenhum conteúdo será combinado automaticamente.');
  end if;
  if source_profile.id is not null and target_profile.id is null then
    chosen_profile := source_profile;
  elsif p_profile_choice = 'source' then
    chosen_profile := source_profile;
  else
    chosen_profile := target_profile;
  end if;

  if source_private.id is not null or target_private.id is not null then
    insert into public.person_private_data (
      organization_id, person_id, email, phone, location, additional_data,
      phone_e164, phone_country_iso2, phone_country_label, phone_country_code,
      phone_national_number, birth_date, city, country_code, notes, state_code, linkedin_url
    ) values (
      p_organization_id, p_target_person_id,
      case when p_contact_choices ->> 'email' = 'source' then source_private.email else coalesce(target_private.email, source_private.email) end,
      case when p_contact_choices ->> 'phone_e164' = 'source' then source_private.phone else coalesce(target_private.phone, source_private.phone) end,
      coalesce(target_private.location, source_private.location), coalesce(target_private.additional_data, source_private.additional_data, '{}'::jsonb),
      case when p_contact_choices ->> 'phone_e164' = 'source' then source_private.phone_e164 else coalesce(target_private.phone_e164, source_private.phone_e164) end,
      coalesce(target_private.phone_country_iso2, source_private.phone_country_iso2),
      coalesce(target_private.phone_country_label, source_private.phone_country_label),
      coalesce(target_private.phone_country_code, source_private.phone_country_code),
      coalesce(target_private.phone_national_number, source_private.phone_national_number),
      case when p_contact_choices ->> 'birth_date' = 'source' then source_private.birth_date else coalesce(target_private.birth_date, source_private.birth_date) end,
      coalesce(target_private.city, source_private.city), coalesce(target_private.country_code, source_private.country_code),
      coalesce(target_private.notes, source_private.notes), coalesce(target_private.state_code, source_private.state_code),
      coalesce(target_private.linkedin_url, source_private.linkedin_url)
    ) on conflict (organization_id, person_id) do update set
      email = excluded.email, phone = excluded.phone, location = excluded.location,
      additional_data = excluded.additional_data, phone_e164 = excluded.phone_e164,
      phone_country_iso2 = excluded.phone_country_iso2, phone_country_label = excluded.phone_country_label,
      phone_country_code = excluded.phone_country_code, phone_national_number = excluded.phone_national_number,
      birth_date = excluded.birth_date, city = excluded.city, country_code = excluded.country_code,
      notes = excluded.notes, state_code = excluded.state_code, linkedin_url = excluded.linkedin_url,
      updated_at = now();
  end if;

  update public.profile_reviews set state = 'invalidated', invalidated_at = now(), last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and person_id = p_source_person_id and state = 'draft';
  perform private.reassign_document_person(p_organization_id, item.id, p_target_person_id)
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_source_person_id
  order by item.document_version, item.id;

  if chosen_profile.id = source_profile.id and source_profile.id is not null then
    select coalesce(max(item.profile_version), 0) + 1 into next_profile_version from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = p_target_person_id;
    update public.professional_profiles set superseded_at = now()
    where organization_id = p_organization_id and person_id = p_target_person_id and superseded_at is null;
    insert into public.professional_profiles (
      organization_id, person_id, source_document_id, profile_data, uncertainties, not_identified,
      extraction_version, inference_version, embedding_version, prompt_version, model_version,
      processing_attempt_id, profile_version, review_status, approved_by_auth_user_id, approved_at,
      base_profile_id, publication_origin, source_document_snapshot
    ) values (
      p_organization_id, p_target_person_id, source_profile.source_document_id, source_profile.profile_data,
      source_profile.uncertainties, source_profile.not_identified, source_profile.extraction_version,
      source_profile.inference_version, source_profile.embedding_version, source_profile.prompt_version,
      source_profile.model_version, source_profile.processing_attempt_id, next_profile_version, 'approved',
      actor_id, now(), source_profile.id, 'merged_person_profile', source_profile.source_document_snapshot
    ) returning id into created_profile_id;
  else
    next_profile_version := target_profile.profile_version;
  end if;
  update public.professional_profiles set superseded_at = coalesce(superseded_at, now())
  where organization_id = p_organization_id and person_id = p_source_person_id;
  update public.people set operational_status = 'merged', merged_into_person_id = p_target_person_id,
    merged_at = now(), merged_by_auth_user_id = actor_id, updated_at = now()
  where organization_id = p_organization_id and id = p_source_person_id;
  update public.people set profile_state = case when chosen_profile.id is null then profile_state else 'generated' end,
    updated_at = now() where organization_id = p_organization_id and id = p_target_person_id;
  update public.document_operations set status = 'completed', completed_at = now(), profile_id = created_profile_id,
    result = jsonb_build_object('primary_person_id', p_target_person_id, 'absorbed_person_id', p_source_person_id,
      'profile_version', next_profile_version, 'documents_moved', true, 'history_preserved', true)
  where id = operation.id;
  insert into public.person_ingestion_events (
    organization_id, person_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, p_target_person_id, actor_id, 'people_merged', 'success',
    jsonb_build_object('operation_id', operation.id, 'absorbed_person_id', p_source_person_id,
      'primary_person_id', p_target_person_id, 'profile_version', next_profile_version)
  );
  return query select p_target_person_id, p_source_person_id, next_profile_version, false;
end;
$$;

revoke all on function public.merge_people(uuid, uuid, uuid, jsonb, text, text) from public, anon;
grant execute on function public.merge_people(uuid, uuid, uuid, jsonb, text, text) to authenticated;

comment on function public.start_profile_version_review(uuid, uuid, uuid, text) is
  'Creates an editable, locked review from an immutable profile snapshot without fabricating documentary evidence.';
comment on function public.start_document_revision(uuid, uuid, uuid, uuid, text) is
  'Reuses the preserved extraction and evidence of an existing document to create or continue a review.';
comment on function public.preview_document_deletion(uuid, uuid, uuid) is
  'Returns human-presentable impact counts before definitive document deletion.';
comment on function public.finalize_document_deletion(uuid, uuid) is
  'Deletes the confirmed document and its exclusive physical dependencies while preserving all profile snapshots and the current profile.';
comment on function public.move_person_document(uuid, uuid, uuid, text) is
  'Corrects document ownership atomically without rewriting published profile history.';
comment on function public.merge_people(uuid, uuid, uuid, jsonb, text, text) is
  'Absorbs one active person into another with explicit conflict decisions, idempotency and immutable historical profiles.';

commit;
