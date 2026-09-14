begin;

create temporary table m62_context as
select membership.user_id as actor_id, membership.organization_id,
  person.id as person_id, vacancy.id as vacancy_id, vacancy.current_version_id as vacancy_version_id,
  requirement.id as requirement_id, requirement.stable_id, requirement.label
from public.organization_memberships membership
join public.people person on person.organization_id = membership.organization_id and person.operational_status = 'active'
join public.vacancies vacancy on vacancy.organization_id = membership.organization_id and vacancy.current_version_id is not null
join public.vacancy_requirements requirement on requirement.organization_id = membership.organization_id and requirement.vacancy_version_id = vacancy.current_version_id
where membership.role in ('owner', 'admin', 'recruiter')
order by membership.created_at limit 1;

do $qa$ begin if (select count(*) from m62_context) <> 1 then raise exception 'M6.2 QA requires actor, person and versioned requirement'; end if; end $qa$;
select set_config('request.jwt.claim.sub', (select actor_id::text from m62_context), true);

update public.vacancy_requirements
set target_level = 'intermediate', criticality = 'high'
where id = (select requirement_id from m62_context);

create temporary table m62_before as select count(*)::bigint as count from public.verification_needs where organization_id = (select organization_id from m62_context);
select public.load_m51a_verification_workspace((select organization_id from m62_context));
do $qa$ begin if (select count(*) from public.verification_needs where organization_id = (select organization_id from m62_context)) <> (select count from m62_before) then raise exception 'workspace loader mutated verification needs'; end if; end $qa$;

create temporary table m62_evaluation as
with inserted as (
  insert into public.match_evaluations (organization_id, person_id, vacancy_id, vacancy_version_id, evaluation_data, matching_version, prompt_version, model_version)
  select organization_id, person_id, vacancy_id, vacancy_version_id,
    jsonb_build_object('vacancyVersion', 999, 'requirements', jsonb_build_array(jsonb_build_object('stableId', stable_id, 'label', label, 'status', 'no_evidence', 'explanation', 'QA sintético', 'evidence', '[]'::jsonb)), 'score', jsonb_build_object('scoreContractVersion', 'matching-score-1.0.0', 'inputFingerprint', 'm62-qa')),
    'vacancy-matching-explainable-4.0.0', 'no-llm-prompt-1.0.0', 'deterministic-local-3.0.0'
  from m62_context returning id
) select id from inserted;

create temporary table m62_created as
select public.create_m62_verification_need((select id from m62_evaluation), (select requirement_id from m62_context), 'intermediate', 'high') as result;

do $qa$
declare denied boolean := false;
begin
  begin
    perform public.create_m62_verification_need((select id from m62_evaluation), gen_random_uuid(), 'intermediate', 'high');
  exception when raise_exception then
    if sqlerrm = 'M62_REQUIREMENT_CONTEXT_MISMATCH' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'mismatched requirement was accepted'; end if;

  denied := false;
  begin
    perform public.create_m62_verification_need((select id from m62_evaluation), (select requirement_id from m62_context), 'basic', 'high');
  exception when raise_exception then
    if sqlerrm = 'M62_TARGET_LEVEL_CONTEXT_MISMATCH' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'mismatched target level was accepted'; end if;

  denied := false;
  begin
    perform public.create_m62_verification_need((select id from m62_evaluation), (select requirement_id from m62_context), 'intermediate', 'critical');
  exception when raise_exception then
    if sqlerrm = 'M62_CRITICALITY_CONTEXT_MISMATCH' then denied := true; else raise; end if;
  end;
  if not denied then raise exception 'mismatched criticality was accepted'; end if;
end $qa$;

select
  (select result ->> 'needId' from m62_created) is not null as exact_need_created,
  (select result ->> 'status' from m62_created) in ('verification_optional', 'verification_recommended', 'verification_required_by_policy') as explained_status,
  (select target_level from public.verification_needs where id = ((select result ->> 'needId' from m62_created)::uuid)) = 'intermediate' as persisted_level_preserved,
  (select criticality from public.verification_needs where id = ((select result ->> 'needId' from m62_created)::uuid)) = 'high' as persisted_criticality_preserved,
  not pg_catalog.has_function_privilege('anon', 'public.create_m62_verification_need(uuid,uuid,text,text)', 'EXECUTE') as anonymous_denied,
  pg_catalog.has_function_privilege('authenticated', 'public.create_m62_verification_need(uuid,uuid,text,text)', 'EXECUTE') as authenticated_allowed,
  not pg_catalog.has_function_privilege('authenticated', 'public.ensure_m51a_demo_need(uuid)', 'EXECUTE') as legacy_demo_retired;

rollback;
