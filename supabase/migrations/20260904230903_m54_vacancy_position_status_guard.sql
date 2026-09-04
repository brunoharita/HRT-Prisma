-- M5.4 - a Vaga can reference only an occupied or non-occupied position.

create or replace function private.enforce_vacancy_position_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position_id is not null and not exists (
    select 1 from public.positions position
    where position.organization_id = new.organization_id
      and position.id = new.position_id
      and position.status in ('occupied', 'vacant')
  ) then
    raise exception 'VACANCY_POSITION_STATUS_INVALID';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_linked_position_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status not in ('occupied', 'vacant') and exists (
    select 1 from public.vacancies vacancy
    where vacancy.organization_id = new.organization_id
      and vacancy.position_id = new.id
  ) then
    raise exception 'VACANCY_POSITION_STATUS_INVALID';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_vacancy_position_status on public.vacancies;
create trigger enforce_vacancy_position_status
before insert or update of organization_id, position_id on public.vacancies
for each row execute function private.enforce_vacancy_position_status();

drop trigger if exists prevent_linked_position_status_change on public.positions;
create trigger prevent_linked_position_status_change
before update of status on public.positions
for each row execute function private.prevent_linked_position_status_change();

revoke all on function private.enforce_vacancy_position_status() from public, anon, authenticated;
revoke all on function private.prevent_linked_position_status_change() from public, anon, authenticated;
