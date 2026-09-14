-- M6.1 correction: unclassified requirements are draft-only from vacancy-definition-1.2.0 onward.
-- Historical snapshots remain readable; new saves fail closed until every requirement has human-facing importance.

alter function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text)
  rename to save_vacancy_definition_m546;

create function public.save_vacancy_definition(
  p_organization_id uuid, p_vacancy_id uuid, p_title text, p_area text, p_location text,
  p_work_arrangement text, p_employment_type text, p_occupancy_status public.position_status,
  p_occupant_person_id uuid, p_mission text, p_responsibilities jsonb, p_expected_outcomes jsonb,
  p_requirements jsonb, p_context_items jsonb, p_source_kind text, p_source_vacancy_id uuid,
  p_job_role_id uuid, p_reference_concept_id uuid, p_save_as_role boolean, p_change_kind text default 'material'
) returns table(vacancy_id uuid, vacancy_version_id uuid, version integer, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_saved record;
begin
  if v_actor is null or not private.has_org_role(p_organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[]) then
    raise exception 'VACANCY_UNAUTHORIZED';
  end if;
  if jsonb_typeof(coalesce(p_requirements, '[]'::jsonb)) <> 'array' then
    raise exception 'VACANCY_LIST_INVALID';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) item
    where coalesce(item->>'importance', '') not in ('required', 'desired')
  ) then
    raise exception 'VACANCY_REQUIREMENT_CLASSIFICATION_REQUIRED';
  end if;

  select * into v_saved from public.save_vacancy_definition_m546(
    p_organization_id, p_vacancy_id, p_title, p_area, p_location, p_work_arrangement, p_employment_type,
    p_occupancy_status, p_occupant_person_id, p_mission, p_responsibilities, p_expected_outcomes, p_requirements,
    p_context_items, p_source_kind, p_source_vacancy_id, p_job_role_id, p_reference_concept_id, p_save_as_role, p_change_kind
  );

  update public.vacancy_versions
  set contract_version = 'vacancy-definition-1.2.0'
  where organization_id = p_organization_id and id = v_saved.vacancy_version_id;

  return query select v_saved.vacancy_id, v_saved.vacancy_version_id, v_saved.version, v_saved.created;
end;
$$;

revoke all on function public.save_vacancy_definition_m546(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) to authenticated;

comment on function public.save_vacancy_definition is 'vacancy-definition-1.2.0: salva somente requisitos classificados como required ou desired, com autorização tenant-scoped.';
