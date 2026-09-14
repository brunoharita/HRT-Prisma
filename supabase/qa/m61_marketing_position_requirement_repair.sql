begin;

create temporary table m61_repair_context as
select
  vacancy.id as vacancy_id,
  vacancy.organization_id,
  vacancy.current_version_id as previous_version_id,
  version.title,
  version.area,
  version.location,
  version.work_arrangement,
  version.employment_type,
  position.status as position_status,
  position.occupant_person_id,
  version.mission,
  version.responsibilities,
  version.expected_outcomes,
  version.context_items,
  version.source_kind,
  version.source_vacancy_id,
  version.source_job_role_id,
  version.reference_concept_id,
  (
    select membership.user_id
    from public.organization_memberships membership
    where membership.organization_id = vacancy.organization_id
      and membership.role in ('owner', 'admin', 'recruiter')
    order by membership.created_at
    limit 1
  ) as actor_id
from public.vacancies vacancy
join public.vacancy_versions version
  on version.organization_id = vacancy.organization_id
 and version.id = vacancy.current_version_id
join public.positions position
  on position.organization_id = vacancy.organization_id
 and position.id = vacancy.position_id
where vacancy.id = 'f03121aa-3a85-4fa9-abf1-62753ba9ae7e'::uuid
  and vacancy.definition_version = 2
  and version.version = 2
  and version.title = 'Analista de Marketing';

do $qa$
declare
  context_count integer;
  total_count integer;
  distinct_count integer;
  unclassified_count integer;
  desired_count integer;
begin
  select count(*) into context_count from m61_repair_context where actor_id is not null;
  if context_count <> 1 then
    raise exception 'M61_REPAIR_CONTEXT_MISMATCH';
  end if;

  select
    count(*),
    count(distinct requirement.label),
    count(*) filter (
      where requirement.importance = 'unclassified'
        and requirement.label in ('RD Station', '2 anos de experiência comprovada na área', 'Office')
    ),
    count(*) filter (
      where requirement.importance = 'desired'
        and requirement.importance_confirmed
        and requirement.label in ('Gestão de tempo', 'Chat GPT')
    )
  into total_count, distinct_count, unclassified_count, desired_count
  from public.vacancy_requirements requirement
  where requirement.organization_id = (select organization_id from m61_repair_context)
    and requirement.vacancy_version_id = (select previous_version_id from m61_repair_context);

  if total_count <> 5 or distinct_count <> 5 or unclassified_count <> 3 or desired_count <> 2 then
    raise exception 'M61_REPAIR_REQUIREMENTS_MISMATCH';
  end if;
end;
$qa$;

select set_config('request.jwt.claim.sub', (select actor_id::text from m61_repair_context), true);

create temporary table m61_repair_result as
select *
from public.save_vacancy_definition(
  (select organization_id from m61_repair_context),
  (select vacancy_id from m61_repair_context),
  (select title from m61_repair_context),
  (select area from m61_repair_context),
  (select location from m61_repair_context),
  (select work_arrangement from m61_repair_context),
  (select employment_type from m61_repair_context),
  (select position_status from m61_repair_context),
  (select occupant_person_id from m61_repair_context),
  (select mission from m61_repair_context),
  (select responsibilities from m61_repair_context),
  (select expected_outcomes from m61_repair_context),
  (
    select jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'stableId', requirement.stable_id,
        'label', requirement.label,
        'category', requirement.category,
        'importance', case
          when requirement.label in ('RD Station', '2 anos de experiência comprovada na área', 'Office') then 'required'
          else requirement.importance
        end,
        'origin', requirement.origin,
        'proposedCategory', requirement.proposed_category,
        'categoryConfirmed', requirement.category_confirmed,
        'importanceConfirmed', true,
        'sourceSuggestionId', requirement.source_suggestion_id,
        'observedTerm', requirement.observed_term,
        'conceptId', requirement.concept_id,
        'relationMode', requirement.relation_mode,
        'relatedSignals', coalesce((
          select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'label', relation.related_label,
            'conceptId', relation.related_concept_id,
            'origin', relation.suggestion_origin
          )) order by relation.created_at, relation.id)
          from public.vacancy_requirement_relations relation
          where relation.organization_id = requirement.organization_id
            and relation.requirement_id = requirement.id
        ), '[]'::jsonb),
        'targetLevel', requirement.target_level,
        'criticality', requirement.criticality,
        'verificationPolicyRequirement', requirement.verification_policy_requirement
      ))
      order by requirement.created_at, requirement.id
    )
    from public.vacancy_requirements requirement
    where requirement.organization_id = (select organization_id from m61_repair_context)
      and requirement.vacancy_version_id = (select previous_version_id from m61_repair_context)
  ),
  (select context_items from m61_repair_context),
  (select source_kind from m61_repair_context),
  (select source_vacancy_id from m61_repair_context),
  (select source_job_role_id from m61_repair_context),
  (select reference_concept_id from m61_repair_context),
  false,
  'material'
);

do $qa$
declare
  saved record;
begin
  select * into saved from m61_repair_result;

  if saved.created or saved.version <> 3 then
    raise exception 'M61_REPAIR_VERSION_MISMATCH';
  end if;

  if (select contract_version from public.vacancy_versions where id = saved.vacancy_version_id)
      <> 'vacancy-definition-1.2.0' then
    raise exception 'M61_REPAIR_CONTRACT_MISMATCH';
  end if;

  if (select count(*) from public.vacancy_requirements where vacancy_version_id = saved.vacancy_version_id and importance = 'required') <> 3
    or (select count(*) from public.vacancy_requirements where vacancy_version_id = saved.vacancy_version_id and importance = 'desired') <> 2
    or exists (select 1 from public.vacancy_requirements where vacancy_version_id = saved.vacancy_version_id and importance = 'unclassified') then
    raise exception 'M61_REPAIR_RESULT_MISMATCH';
  end if;

  if (select count(*) from public.vacancy_requirements where vacancy_version_id = (select previous_version_id from m61_repair_context) and importance = 'unclassified') <> 3 then
    raise exception 'M61_REPAIR_HISTORY_CHANGED';
  end if;
end;
$qa$;

commit;

select
  vacancy.definition_version,
  version.contract_version,
  count(*) filter (where requirement.importance = 'required') as required_count,
  count(*) filter (where requirement.importance = 'desired') as desired_count,
  count(*) filter (where requirement.importance = 'unclassified') as unclassified_count,
  jsonb_agg(jsonb_build_object('label', requirement.label, 'importance', requirement.importance) order by requirement.label) as requirements
from public.vacancies vacancy
join public.vacancy_versions version on version.id = vacancy.current_version_id and version.organization_id = vacancy.organization_id
join public.vacancy_requirements requirement on requirement.vacancy_version_id = version.id and requirement.organization_id = vacancy.organization_id
where vacancy.id = 'f03121aa-3a85-4fa9-abf1-62753ba9ae7e'::uuid
group by vacancy.definition_version, version.contract_version;
