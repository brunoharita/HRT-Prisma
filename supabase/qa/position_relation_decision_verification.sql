-- Run only in Prisma-QA. The audited decision is rolled back.
begin;

create temporary table position_relation_decision_context as
select
  operator.auth_user_id as actor_id,
  vacancy.organization_id,
  vacancy.id as vacancy_id,
  vacancy.current_version_id as vacancy_version_id,
  vacancy_version.version,
  person.id as person_id,
  gen_random_uuid() as deleting_person_id
from public.platform_users operator
join public.organization_memberships membership
  on membership.user_id = operator.auth_user_id
join public.vacancies vacancy
  on vacancy.organization_id = membership.organization_id
 and vacancy.title = 'Analista de Marketing'
join public.vacancy_versions vacancy_version
  on vacancy_version.organization_id = vacancy.organization_id
 and vacancy_version.id = vacancy.current_version_id
join public.people person
  on person.organization_id = membership.organization_id
 and person.full_name = 'Bruno Harita Santos'
where operator.username = 'harita.super'
  and operator.status = 'active'
  and person.operational_status = 'active'
order by vacancy.updated_at desc
limit 1;

do $qa$
begin
  if (select count(*) from position_relation_decision_context) <> 1 then
    raise exception 'QA requires one active operator, vacancy, version and Person';
  end if;
end;
$qa$;

insert into public.people (
  id,
  organization_id,
  full_name,
  operational_status
)
select
  deleting_person_id,
  organization_id,
  '[QA] Person deletion guard fixture',
  'deleting'
from position_relation_decision_context;

grant select on table position_relation_decision_context to authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select actor_id::text from position_relation_decision_context),
  true
);
set local role authenticated;

do $qa$
begin
  perform set_config('prisma.person_deletion_operation_id', gen_random_uuid()::text, true);
  if private.person_deletion_context_allows(
    (select organization_id from position_relation_decision_context),
    (select person_id from position_relation_decision_context)
  ) then
    raise exception 'authenticated caller bypassed the authoritative deletion context';
  end if;
end;
$qa$;

do $qa$
declare
  blocked boolean := false;
begin
  begin
    insert into public.match_evaluations (
      organization_id,
      person_id,
      vacancy_id,
      vacancy_version_id,
      evaluation_data,
      matching_version,
      prompt_version,
      model_version
    )
    select
      organization_id,
      deleting_person_id,
      vacancy_id,
      vacancy_version_id,
      jsonb_build_object('type', 'position_relation_decision', 'decision', 'dismissed'),
      'vacancy-matching-explainable-2.1.0',
      'no-llm-prompt-1.0.0',
      'deterministic-local-3.0.0'
    from position_relation_decision_context;
  exception
    when object_not_in_prerequisite_state then
      if sqlerrm = 'person_deletion_in_progress' then
        blocked := true;
      else
        raise;
      end if;
  end;
  if not blocked then
    raise exception 'authenticated write accepted a Person in deletion';
  end if;
end;
$qa$;

create temporary table recorded_position_relation_decision as
with inserted as (
  insert into public.match_evaluations (
    organization_id,
    person_id,
    vacancy_id,
    vacancy_version_id,
    evaluation_data,
    matching_version,
    prompt_version,
    model_version
  )
  select
    organization_id,
    person_id,
    vacancy_id,
    vacancy_version_id,
    jsonb_build_object(
      'type', 'position_relation_decision',
      'decision', 'dismissed',
      'vacancyVersion', version,
      'positionRelation', jsonb_build_object('status', 'possible'),
      'decidedAt', now()
    ),
    'vacancy-matching-explainable-2.1.0',
    'no-llm-prompt-1.0.0',
    'deterministic-local-3.0.0'
  from position_relation_decision_context
  returning id
)
select id from inserted;

do $qa$
begin
  if (select count(*) from recorded_position_relation_decision) <> 1 then
    raise exception 'position relation decision was not recorded';
  end if;
end;
$qa$;

select 'PASS: active decision recorded, deleting Person blocked and deletion context remained fail-closed' as result;
rollback;
