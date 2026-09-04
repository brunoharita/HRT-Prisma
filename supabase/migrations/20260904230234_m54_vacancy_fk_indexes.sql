-- M5.4 - covering indexes for vacancy, position and evaluation relationships.

create index if not exists positions_job_role_fk_idx on public.positions (organization_id, job_role_id);
create index if not exists positions_unit_fk_idx on public.positions (organization_id, organization_unit_id)
  where organization_unit_id is not null;

create index if not exists vacancies_position_fk_idx on public.vacancies (organization_id, position_id)
  where position_id is not null;
create index if not exists vacancies_job_role_fk_idx on public.vacancies (organization_id, job_role_id);
create index if not exists vacancies_current_version_fk_idx on public.vacancies (organization_id, current_version_id)
  where current_version_id is not null;
create index if not exists vacancies_source_fk_idx on public.vacancies (organization_id, source_vacancy_id)
  where source_vacancy_id is not null;
create index if not exists vacancies_reference_concept_fk_idx on public.vacancies (reference_concept_id)
  where reference_concept_id is not null;

create index if not exists vacancy_versions_source_vacancy_fk_idx
  on public.vacancy_versions (organization_id, source_vacancy_id) where source_vacancy_id is not null;
create index if not exists vacancy_versions_source_job_role_fk_idx
  on public.vacancy_versions (organization_id, source_job_role_id) where source_job_role_id is not null;
create index if not exists vacancy_versions_reference_concept_fk_idx
  on public.vacancy_versions (reference_concept_id) where reference_concept_id is not null;
create index if not exists vacancy_versions_actor_fk_idx
  on public.vacancy_versions (created_by_auth_user_id) where created_by_auth_user_id is not null;

create index if not exists vacancy_requirements_competency_fk_idx
  on public.vacancy_requirements (organization_id, competency_id) where competency_id is not null;
create index if not exists vacancy_requirements_concept_fk_idx
  on public.vacancy_requirements (concept_id) where concept_id is not null;

create index if not exists vacancy_requirement_relations_vacancy_fk_idx
  on public.vacancy_requirement_relations (organization_id, vacancy_id);
create index if not exists vacancy_requirement_relations_concept_fk_idx
  on public.vacancy_requirement_relations (related_concept_id) where related_concept_id is not null;
create index if not exists vacancy_requirement_relations_actor_fk_idx
  on public.vacancy_requirement_relations (confirmed_by_auth_user_id);

create index if not exists vacancy_events_version_fk_idx
  on public.vacancy_events (organization_id, vacancy_version_id) where vacancy_version_id is not null;
create index if not exists vacancy_events_actor_fk_idx
  on public.vacancy_events (actor_auth_user_id) where actor_auth_user_id is not null;

create index if not exists match_evaluations_person_fk_idx
  on public.match_evaluations (organization_id, person_id);
