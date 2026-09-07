alter table public.vacancy_events
  drop constraint if exists vacancy_events_event_type_check;

alter table public.vacancy_events
  add constraint vacancy_events_event_type_check
  check (event_type in ('created', 'definition_updated', 'occupancy_updated', 'match_evaluated', 'cancelled'));

create or replace function public.cancel_vacancy(
  p_organization_id uuid,
  p_vacancy_id uuid,
  p_reason text
)
returns table (vacancy_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  local_vacancy public.vacancies;
begin
  if actor_id is null or not private.has_org_role(p_organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[]) then
    raise exception 'VACANCY_UNAUTHORIZED';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'VACANCY_CANCELLATION_REASON_REQUIRED';
  end if;

  select * into local_vacancy
  from public.vacancies vacancy
  where vacancy.organization_id = p_organization_id
    and vacancy.id = p_vacancy_id
  for update;

  if local_vacancy.id is null then
    raise exception 'VACANCY_NOT_FOUND';
  end if;

  if local_vacancy.status = 'cancelled' then
    return query select local_vacancy.id, local_vacancy.status;
    return;
  end if;

  update public.vacancies
  set status = 'cancelled', updated_at = now()
  where organization_id = p_organization_id
    and id = local_vacancy.id;

  insert into public.vacancy_events (
    organization_id, vacancy_id, vacancy_version_id, event_type, actor_auth_user_id, metadata
  ) values (
    p_organization_id, local_vacancy.id, local_vacancy.current_version_id, 'cancelled', actor_id,
    jsonb_build_object(
      'version', local_vacancy.definition_version,
      'reason', btrim(p_reason),
      'position_preserved', local_vacancy.position_id is not null
    )
  );

  return query select local_vacancy.id, 'cancelled'::text;
end;
$$;

revoke all on function public.cancel_vacancy(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_vacancy(uuid, uuid, text) to authenticated;

comment on function public.cancel_vacancy is 'M5.4: cancela uma Vaga sem apagar posição, versões, avaliações ou histórico.';
