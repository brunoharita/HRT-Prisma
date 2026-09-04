-- Claim the merge operation before checking active state so a completed request
-- can be replayed after the source Person has already been absorbed.
begin;

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
  if jsonb_typeof(coalesce(p_contact_choices, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'merge_choices_invalid',
      detail = private.m53_feedback('Não foi possível entender as escolhas dos dados de contato.', 'Revise somente os campos marcados como conflito.');
  end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_source_person_id::text,
    p_target_person_id::text, coalesce(p_contact_choices, '{}'::jsonb)::text, coalesce(p_profile_choice, 'automatic')), 'sha256'), 'hex');
  operation := private.claim_document_operation(p_organization_id, p_source_person_id, null,
    'merge_people', p_idempotency_key, fingerprint, actor_id);
  update public.document_operations item set target_person_id = p_target_person_id where item.id = operation.id;
  if operation.status = 'completed' then
    return query select p_target_person_id, p_source_person_id,
      nullif(operation.result ->> 'profile_version', '')::integer, true; return;
  end if;

  perform 1 from public.people item where item.organization_id = p_organization_id
    and item.id in (p_source_person_id, p_target_person_id) order by item.id for update;
  select * into source_person from public.people item where item.organization_id = p_organization_id and item.id = p_source_person_id;
  select * into target_person from public.people item where item.organization_id = p_organization_id and item.id = p_target_person_id;
  if source_person.id is null or target_person.id is null or source_person.operational_status <> 'active' or target_person.operational_status <> 'active' then
    raise exception using errcode = 'P0002', message = 'merge_person_not_available',
      detail = private.m53_feedback('Uma das Pessoas escolhidas não está mais disponível para mesclagem.', 'Atualize a busca e escolha dois cadastros ativos.');
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

  update public.profile_reviews item set state = 'invalidated', invalidated_at = now(), last_edited_by_auth_user_id = actor_id
  where item.organization_id = p_organization_id and item.person_id = p_source_person_id and item.state = 'draft';
  perform private.reassign_document_person(p_organization_id, item.id, p_target_person_id)
  from public.documents item
  where item.organization_id = p_organization_id and item.person_id = p_source_person_id
  order by item.document_version, item.id;

  if chosen_profile.id = source_profile.id and source_profile.id is not null then
    select coalesce(max(item.profile_version), 0) + 1 into next_profile_version from public.professional_profiles item
    where item.organization_id = p_organization_id and item.person_id = p_target_person_id;
    update public.professional_profiles item set superseded_at = now()
    where item.organization_id = p_organization_id and item.person_id = p_target_person_id and item.superseded_at is null;
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
  update public.professional_profiles item set superseded_at = coalesce(item.superseded_at, now())
  where item.organization_id = p_organization_id and item.person_id = p_source_person_id;
  update public.people item set operational_status = 'merged', merged_into_person_id = p_target_person_id,
    merged_at = now(), merged_by_auth_user_id = actor_id, updated_at = now()
  where item.organization_id = p_organization_id and item.id = p_source_person_id;
  update public.people item set profile_state = case when chosen_profile.id is null then item.profile_state else 'generated' end,
    updated_at = now() where item.organization_id = p_organization_id and item.id = p_target_person_id;
  update public.document_operations item set status = 'completed', completed_at = now(), profile_id = created_profile_id,
    result = jsonb_build_object('primary_person_id', p_target_person_id, 'absorbed_person_id', p_source_person_id,
      'profile_version', next_profile_version, 'documents_moved', true, 'history_preserved', true)
  where item.id = operation.id;
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

commit;
