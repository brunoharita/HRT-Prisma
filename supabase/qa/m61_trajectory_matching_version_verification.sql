begin;

create temporary table m61_trajectory_context as
select membership.user_id as actor_id, membership.organization_id,
  person.id as person_id, vacancy.id as vacancy_id, vacancy.current_version_id as vacancy_version_id,
  requirement.id as requirement_id, requirement.stable_id, requirement.label,
  coalesce(requirement.target_level, 'intermediate') as target_level,
  coalesce(requirement.criticality, 'medium') as criticality
from public.organization_memberships membership
join public.people person on person.organization_id = membership.organization_id and person.operational_status = 'active'
join public.vacancies vacancy on vacancy.organization_id = membership.organization_id and vacancy.current_version_id is not null
join public.vacancy_requirements requirement on requirement.organization_id = membership.organization_id and requirement.vacancy_version_id = vacancy.current_version_id
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at
limit 1;

do $qa$ begin
  if (select count(*) from m61_trajectory_context) <> 1 then raise exception 'M6.1 QA requires actor, person and versioned requirement'; end if;
end $qa$;

select set_config('request.jwt.claim.sub', (select actor_id::text from m61_trajectory_context), true);

create temporary table m61_current_evaluation as
with inserted as (
  insert into public.match_evaluations (organization_id, person_id, vacancy_id, vacancy_version_id, evaluation_data, matching_version, prompt_version, model_version)
  select organization_id, person_id, vacancy_id, vacancy_version_id,
    jsonb_build_object(
      'vacancyVersion', 999,
      'requirements', jsonb_build_array(jsonb_build_object('stableId', stable_id, 'label', label, 'status', 'no_evidence', 'evidence', '[]'::jsonb)),
      'score', jsonb_build_object('scoreContractVersion', 'matching-score-1.2.0', 'inputFingerprint', 'm61-trajectory-qa')
    ),
    'vacancy-matching-explainable-5.0.0', 'no-llm-prompt-1.0.0', 'deterministic-local-3.0.0'
  from m61_trajectory_context
  returning id
) select id from inserted;

create temporary table m61_current_result as
select public.create_m62_verification_need(
  (select id from m61_current_evaluation),
  (select requirement_id from m61_trajectory_context),
  (select target_level from m61_trajectory_context),
  (select criticality from m61_trajectory_context)
) as result;

do $qa$
declare
  unsupported_id uuid;
  denied boolean := false;
begin
  insert into public.match_evaluations (organization_id, person_id, vacancy_id, vacancy_version_id, evaluation_data, matching_version, prompt_version, model_version)
  select organization_id, person_id, vacancy_id, vacancy_version_id,
    jsonb_build_object('requirements', jsonb_build_array(jsonb_build_object('stableId', stable_id))),
    'vacancy-matching-explainable-unknown', 'no-llm-prompt-1.0.0', 'deterministic-local-3.0.0'
  from m61_trajectory_context
  returning id into unsupported_id;

  begin
    perform public.create_m62_verification_need(
      unsupported_id,
      (select requirement_id from m61_trajectory_context),
      (select target_level from m61_trajectory_context),
      (select criticality from m61_trajectory_context)
    );
  exception when raise_exception then
    if sqlerrm = 'M62_UNSUPPORTED_MATCHING_VERSION' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'unsupported matching version was accepted'; end if;
end $qa$;

select
  (select result ->> 'needId' from m61_current_result) is not null as matching_5_need_supported,
  not pg_catalog.has_function_privilege('anon', 'public.create_m62_verification_need(uuid,uuid,text,text)', 'EXECUTE') as anonymous_denied,
  pg_catalog.has_function_privilege('authenticated', 'public.create_m62_verification_need(uuid,uuid,text,text)', 'EXECUTE') as authenticated_allowed;

rollback;
