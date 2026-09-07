begin;

create temporary table m54_cancellation_context as
select membership.user_id as actor_id, membership.organization_id
from public.organization_memberships membership
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

select set_config('request.jwt.claim.sub', (select actor_id::text from m54_cancellation_context), true);

create temporary table m54_cancellation_saved as
select * from public.save_vacancy_definition(
  (select organization_id from m54_cancellation_context), null, 'Vaga sintética de cancelamento QA M5.4',
  'QA', null, null, null, 'vacant', null, 'Validar cancelamento auditável.', '[]'::jsonb, '[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'stableId', gen_random_uuid(), 'label', 'Validação de cancelamento', 'category', 'competency',
    'importance', 'required', 'relationMode', 'direct', 'relatedSignals', '[]'::jsonb
  )),
  '[]'::jsonb, 'manual', null, null, null, false, 'material'
);

select * from public.cancel_vacancy(
  (select organization_id from m54_cancellation_context),
  (select vacancy_id from m54_cancellation_saved),
  'Teste de cancelamento QA.'
);

do $qa$
declare
  saved record;
begin
  select * into saved from m54_cancellation_saved;
  if not exists (select 1 from public.vacancies where id = saved.vacancy_id and status = 'cancelled') then
    raise exception 'vacancy was not cancelled';
  end if;
  if not exists (select 1 from public.vacancy_events where vacancy_id = saved.vacancy_id and event_type = 'cancelled') then
    raise exception 'cancellation event was not recorded';
  end if;
  if not exists (
    select 1 from public.vacancies vacancy
    join public.positions position on position.organization_id = vacancy.organization_id and position.id = vacancy.position_id
    where vacancy.id = saved.vacancy_id and position.status = 'vacant'
  ) then
    raise exception 'position was not preserved';
  end if;
end;
$qa$;

select
  not pg_catalog.has_function_privilege('anon', 'public.cancel_vacancy(uuid,uuid,text)', 'EXECUTE') as anonymous_cancel_denied,
  not pg_catalog.has_table_privilege('authenticated', 'public.vacancies', 'DELETE') as direct_delete_denied;

rollback;
