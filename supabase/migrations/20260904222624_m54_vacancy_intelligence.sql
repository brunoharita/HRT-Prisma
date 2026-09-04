-- M5.4 - Vagas: necessidade profissional estruturada, versionada e explicável.

alter table public.job_roles
  add column if not exists reference_concept_id uuid references public.knowledge_concepts(id) on delete set null,
  add column if not exists expected_outcomes jsonb not null default '[]'::jsonb,
  add column if not exists requirements_template jsonb not null default '[]'::jsonb,
  add column if not exists context_items jsonb not null default '[]'::jsonb;

alter table public.job_roles
  add constraint job_roles_expected_outcomes_array check (jsonb_typeof(expected_outcomes) = 'array'),
  add constraint job_roles_requirements_template_array check (jsonb_typeof(requirements_template) = 'array'),
  add constraint job_roles_context_items_array check (jsonb_typeof(context_items) = 'array');

alter table public.positions
  add column if not exists occupant_person_id uuid;

alter table public.positions
  add constraint positions_occupant_person_fk
  foreign key (organization_id, occupant_person_id)
  references public.people(organization_id, id)
  on delete set null (occupant_person_id);

alter table public.positions
  add constraint positions_occupancy_consistent check (
    (status = 'occupied' and occupant_person_id is not null)
    or (status <> 'occupied' and occupant_person_id is null)
  ) not valid;

alter table public.vacancies
  add column if not exists area text,
  add column if not exists location text,
  add column if not exists work_arrangement text,
  add column if not exists employment_type text,
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_vacancy_id uuid,
  add column if not exists reference_concept_id uuid references public.knowledge_concepts(id) on delete set null,
  add column if not exists definition_version integer not null default 0,
  add column if not exists current_version_id uuid;

alter table public.vacancies
  add constraint vacancies_work_arrangement_check check (
    work_arrangement is null or work_arrangement in ('onsite', 'hybrid', 'remote', 'flexible')
  ),
  add constraint vacancies_source_kind_check check (
    source_kind in ('manual', 'organization_role', 'previous_vacancy', 'knowledge_reference', 'assisted_description')
  ),
  add constraint vacancies_definition_version_check check (definition_version >= 0),
  add constraint vacancies_source_vacancy_fk foreign key (organization_id, source_vacancy_id)
    references public.vacancies(organization_id, id) on delete set null (source_vacancy_id);

create table public.vacancy_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid not null,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  area text,
  location text,
  work_arrangement text check (work_arrangement is null or work_arrangement in ('onsite', 'hybrid', 'remote', 'flexible')),
  employment_type text,
  mission text,
  responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(responsibilities) = 'array'),
  expected_outcomes jsonb not null default '[]'::jsonb check (jsonb_typeof(expected_outcomes) = 'array'),
  context_items jsonb not null default '[]'::jsonb check (jsonb_typeof(context_items) = 'array'),
  source_kind text not null check (source_kind in ('manual', 'organization_role', 'previous_vacancy', 'knowledge_reference', 'assisted_description')),
  source_vacancy_id uuid,
  source_job_role_id uuid,
  reference_concept_id uuid references public.knowledge_concepts(id) on delete set null,
  change_kind text not null default 'material' check (change_kind in ('material', 'editorial')),
  contract_version text not null default 'vacancy-definition-1.0.0',
  created_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, vacancy_id, version),
  foreign key (organization_id, vacancy_id) references public.vacancies(organization_id, id) on delete cascade,
  foreign key (organization_id, source_vacancy_id) references public.vacancies(organization_id, id) on delete set null (source_vacancy_id),
  foreign key (organization_id, source_job_role_id) references public.job_roles(organization_id, id) on delete set null (source_job_role_id)
);

alter table public.vacancies
  add constraint vacancies_current_version_fk
  foreign key (organization_id, current_version_id)
  references public.vacancy_versions(organization_id, id);

alter table public.vacancy_requirements
  alter column competency_id drop not null,
  add column if not exists vacancy_version_id uuid,
  add column if not exists stable_id uuid not null default gen_random_uuid(),
  add column if not exists category text not null default 'competency',
  add column if not exists observed_term text,
  add column if not exists concept_id uuid references public.knowledge_concepts(id) on delete set null,
  add column if not exists relation_mode text not null default 'direct',
  add column if not exists target_level text,
  add column if not exists criticality text,
  add column if not exists verification_policy_requirement text;

alter table public.vacancy_requirements
  add constraint vacancy_requirements_version_fk foreign key (organization_id, vacancy_version_id)
    references public.vacancy_versions(organization_id, id) on delete cascade,
  add constraint vacancy_requirements_category_check check (
    category in ('experience', 'competency', 'knowledge', 'technology', 'education', 'certification', 'language', 'context')
  ),
  add constraint vacancy_requirements_relation_mode_check check (relation_mode in ('direct', 'related')),
  add constraint vacancy_requirements_target_level_check check (target_level is null or target_level in ('basic', 'intermediate', 'advanced')),
  add constraint vacancy_requirements_criticality_check check (criticality is null or criticality in ('low', 'medium', 'high', 'critical')),
  add constraint vacancy_requirements_policy_check check (
    verification_policy_requirement is null or verification_policy_requirement in ('none', 'optional', 'recommended', 'required_by_policy')
  );

create table public.vacancy_requirement_relations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid not null,
  vacancy_version_id uuid not null,
  requirement_id uuid not null,
  related_label text not null check (char_length(btrim(related_label)) between 1 and 240),
  related_concept_id uuid references public.knowledge_concepts(id) on delete set null,
  suggestion_origin text not null default 'operator' check (suggestion_origin in ('operator', 'knowledge', 'deterministic_assistant', 'external_assistant')),
  confirmed_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, requirement_id, related_label),
  foreign key (organization_id, vacancy_id) references public.vacancies(organization_id, id) on delete cascade,
  foreign key (organization_id, vacancy_version_id) references public.vacancy_versions(organization_id, id) on delete cascade,
  foreign key (organization_id, requirement_id) references public.vacancy_requirements(organization_id, id) on delete cascade
);

alter table public.match_evaluations
  add column if not exists vacancy_version_id uuid;

alter table public.match_evaluations
  add constraint match_evaluations_vacancy_version_fk
  foreign key (organization_id, vacancy_version_id)
  references public.vacancy_versions(organization_id, id) on delete restrict;

create table public.vacancy_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid not null,
  vacancy_version_id uuid,
  event_type text not null check (event_type in ('created', 'definition_updated', 'occupancy_updated', 'match_evaluated')),
  actor_auth_user_id uuid references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, vacancy_id) references public.vacancies(organization_id, id) on delete cascade,
  foreign key (organization_id, vacancy_version_id) references public.vacancy_versions(organization_id, id) on delete set null (vacancy_version_id)
);

create index vacancy_versions_current_idx on public.vacancy_versions (organization_id, vacancy_id, version desc);
create index vacancy_requirements_version_idx on public.vacancy_requirements (organization_id, vacancy_version_id, importance, category);
create unique index vacancy_requirements_stable_version_idx
  on public.vacancy_requirements (organization_id, vacancy_version_id, stable_id)
  where vacancy_version_id is not null;
create index vacancy_requirement_relations_version_idx on public.vacancy_requirement_relations (organization_id, vacancy_version_id, requirement_id);
create index positions_occupant_idx on public.positions (organization_id, occupant_person_id) where occupant_person_id is not null;
create index vacancies_occupation_idx on public.vacancies (organization_id, definition_version, created_at desc);
create index vacancy_events_history_idx on public.vacancy_events (organization_id, vacancy_id, created_at desc);
create index match_evaluations_version_idx on public.match_evaluations (organization_id, vacancy_version_id, person_id, created_at desc);

insert into public.vacancy_versions (
  organization_id, vacancy_id, version, title, area, location, work_arrangement, employment_type,
  mission, responsibilities, expected_outcomes, context_items, source_kind, source_job_role_id,
  reference_concept_id, change_kind, created_at
)
select
  vacancy.organization_id, vacancy.id, 1, vacancy.title, vacancy.area, vacancy.location,
  vacancy.work_arrangement, vacancy.employment_type, role.mission,
  coalesce(role.responsibilities, '[]'::jsonb), coalesce(role.expected_outcomes, '[]'::jsonb),
  case when jsonb_typeof(vacancy.context_overrides) = 'array' then vacancy.context_overrides else coalesce(role.context_items, '[]'::jsonb) end,
  vacancy.source_kind, vacancy.job_role_id, coalesce(vacancy.reference_concept_id, role.reference_concept_id),
  'material', vacancy.created_at
from public.vacancies vacancy
join public.job_roles role on role.organization_id = vacancy.organization_id and role.id = vacancy.job_role_id
where vacancy.definition_version = 0;

update public.vacancies vacancy
set definition_version = version.version,
    current_version_id = version.id
from public.vacancy_versions version
where version.organization_id = vacancy.organization_id
  and version.vacancy_id = vacancy.id
  and version.version = 1
  and vacancy.definition_version = 0;

update public.vacancy_requirements requirement
set vacancy_version_id = vacancy.current_version_id
from public.vacancies vacancy
where vacancy.organization_id = requirement.organization_id
  and vacancy.id = requirement.vacancy_id
  and requirement.vacancy_version_id is null;

alter table public.vacancy_versions enable row level security;
alter table public.vacancy_requirement_relations enable row level security;
alter table public.vacancy_events enable row level security;

drop policy if exists vacancies_select on public.vacancies;
drop policy if exists vacancies_manage on public.vacancies;
drop policy if exists vacancy_requirements_select on public.vacancy_requirements;
drop policy if exists vacancy_requirements_manage on public.vacancy_requirements;
drop policy if exists match_evaluations_select on public.match_evaluations;
drop policy if exists match_evaluations_create on public.match_evaluations;

create policy vacancies_select on public.vacancies for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy vacancies_manage on public.vacancies for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancy_versions_select on public.vacancy_versions for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy vacancy_versions_insert on public.vacancy_versions for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancy_requirements_select on public.vacancy_requirements for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy vacancy_requirements_insert on public.vacancy_requirements for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancy_requirement_relations_select on public.vacancy_requirement_relations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy vacancy_requirement_relations_insert on public.vacancy_requirement_relations for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy vacancy_events_select on public.vacancy_events for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy match_evaluations_select on public.match_evaluations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy match_evaluations_create on public.match_evaluations for insert to authenticated
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

revoke all on public.vacancy_versions, public.vacancy_requirement_relations, public.vacancy_events from anon, authenticated;
revoke insert, update, delete on public.vacancies, public.vacancy_requirements from authenticated;
grant select on public.vacancies, public.vacancy_versions, public.vacancy_requirements, public.vacancy_requirement_relations, public.vacancy_events to authenticated;

create or replace function public.save_vacancy_definition(
  p_organization_id uuid,
  p_vacancy_id uuid,
  p_title text,
  p_area text,
  p_location text,
  p_work_arrangement text,
  p_employment_type text,
  p_occupancy_status public.position_status,
  p_occupant_person_id uuid,
  p_mission text,
  p_responsibilities jsonb,
  p_expected_outcomes jsonb,
  p_requirements jsonb,
  p_context_items jsonb,
  p_source_kind text,
  p_source_vacancy_id uuid,
  p_job_role_id uuid,
  p_reference_concept_id uuid,
  p_save_as_role boolean,
  p_change_kind text default 'material'
)
returns table(vacancy_id uuid, vacancy_version_id uuid, version integer, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  local_vacancy public.vacancies;
  local_position_id uuid;
  local_job_role_id uuid;
  local_version_id uuid;
  local_version integer;
  local_created boolean := false;
  requirement jsonb;
  requirement_id uuid;
  requirement_stable_id uuid;
  related_signal jsonb;
  normalized_requirements jsonb := coalesce(p_requirements, '[]'::jsonb);
begin
  if actor_id is null or not private.has_org_role(p_organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[]) then
    raise exception 'VACANCY_UNAUTHORIZED';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 240 then raise exception 'VACANCY_TITLE_INVALID'; end if;
  if p_work_arrangement is not null and p_work_arrangement not in ('onsite', 'hybrid', 'remote', 'flexible') then raise exception 'VACANCY_WORK_ARRANGEMENT_INVALID'; end if;
  if p_source_kind not in ('manual', 'organization_role', 'previous_vacancy', 'knowledge_reference', 'assisted_description') then raise exception 'VACANCY_SOURCE_INVALID'; end if;
  if p_change_kind not in ('material', 'editorial') then raise exception 'VACANCY_CHANGE_KIND_INVALID'; end if;
  if jsonb_typeof(coalesce(p_responsibilities, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_expected_outcomes, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(normalized_requirements) <> 'array'
    or jsonb_typeof(coalesce(p_context_items, '[]'::jsonb)) <> 'array' then
    raise exception 'VACANCY_LIST_INVALID';
  end if;
  if p_occupancy_status = 'occupied' and p_occupant_person_id is null then raise exception 'VACANCY_OCCUPANT_REQUIRED'; end if;
  if p_occupancy_status <> 'occupied' and p_occupant_person_id is not null then raise exception 'VACANCY_OCCUPANT_NOT_ALLOWED'; end if;
  if p_occupant_person_id is not null and not exists (
    select 1 from public.people person where person.organization_id = p_organization_id and person.id = p_occupant_person_id and person.operational_status = 'active'
  ) then raise exception 'VACANCY_OCCUPANT_INVALID'; end if;
  if p_reference_concept_id is not null and not exists (
    select 1 from public.knowledge_concepts concept
    where concept.id = p_reference_concept_id and concept.status = 'approved'
      and (concept.scope = 'global' or concept.organization_id = p_organization_id)
  ) then raise exception 'VACANCY_REFERENCE_INVALID'; end if;

  if p_job_role_id is not null then
    select id into local_job_role_id from public.job_roles
    where organization_id = p_organization_id and id = p_job_role_id;
    if local_job_role_id is null then raise exception 'VACANCY_ROLE_INVALID'; end if;
  else
    select id into local_job_role_id from public.job_roles
    where organization_id = p_organization_id and lower(btrim(name)) = lower(btrim(p_title)) limit 1;
    if local_job_role_id is null then
      insert into public.job_roles (organization_id, name, mission, responsibilities, reference_concept_id)
      values (p_organization_id, btrim(p_title), nullif(btrim(p_mission), ''), coalesce(p_responsibilities, '[]'::jsonb), p_reference_concept_id)
      returning id into local_job_role_id;
    end if;
  end if;

  if p_vacancy_id is null then
    insert into public.positions (organization_id, job_role_id, status, title, occupant_person_id)
    values (p_organization_id, local_job_role_id, p_occupancy_status, btrim(p_title), p_occupant_person_id)
    returning id into local_position_id;
    insert into public.vacancies (
      organization_id, position_id, job_role_id, title, status, area, location, work_arrangement,
      employment_type, source_kind, source_vacancy_id, reference_concept_id, definition_version, current_version_id
    ) values (
      p_organization_id, local_position_id, local_job_role_id, btrim(p_title), 'open', nullif(btrim(p_area), ''),
      nullif(btrim(p_location), ''), p_work_arrangement, nullif(btrim(p_employment_type), ''), p_source_kind,
      p_source_vacancy_id, p_reference_concept_id, 0, null
    ) returning * into local_vacancy;
    local_created := true;
  else
    select * into local_vacancy from public.vacancies
    where organization_id = p_organization_id and id = p_vacancy_id for update;
    if local_vacancy.id is null then raise exception 'VACANCY_NOT_FOUND'; end if;
    local_position_id := local_vacancy.position_id;
    if local_position_id is null then
      insert into public.positions (organization_id, job_role_id, status, title, occupant_person_id)
      values (p_organization_id, local_job_role_id, p_occupancy_status, btrim(p_title), p_occupant_person_id)
      returning id into local_position_id;
    else
      update public.positions set job_role_id = local_job_role_id, status = p_occupancy_status,
        title = btrim(p_title), occupant_person_id = p_occupant_person_id, updated_at = now()
      where organization_id = p_organization_id and id = local_position_id;
    end if;
  end if;

  local_version := coalesce(local_vacancy.definition_version, 0) + 1;
  insert into public.vacancy_versions (
    organization_id, vacancy_id, version, title, area, location, work_arrangement, employment_type,
    mission, responsibilities, expected_outcomes, context_items, source_kind, source_vacancy_id,
    source_job_role_id, reference_concept_id, change_kind, created_by_auth_user_id
  ) values (
    p_organization_id, local_vacancy.id, local_version, btrim(p_title), nullif(btrim(p_area), ''),
    nullif(btrim(p_location), ''), p_work_arrangement, nullif(btrim(p_employment_type), ''),
    nullif(btrim(p_mission), ''), coalesce(p_responsibilities, '[]'::jsonb), coalesce(p_expected_outcomes, '[]'::jsonb),
    coalesce(p_context_items, '[]'::jsonb), p_source_kind, p_source_vacancy_id, local_job_role_id,
    p_reference_concept_id, p_change_kind, actor_id
  ) returning id into local_version_id;

  for requirement in select value from jsonb_array_elements(normalized_requirements) loop
    if nullif(btrim(requirement ->> 'label'), '') is null then raise exception 'VACANCY_REQUIREMENT_LABEL_INVALID'; end if;
    if coalesce(requirement ->> 'category', '') not in ('experience', 'competency', 'knowledge', 'technology', 'education', 'certification', 'language', 'context') then raise exception 'VACANCY_REQUIREMENT_CATEGORY_INVALID'; end if;
    if coalesce(requirement ->> 'importance', '') not in ('required', 'desired') then raise exception 'VACANCY_REQUIREMENT_IMPORTANCE_INVALID'; end if;
    if nullif(requirement ->> 'conceptId', '') is not null and not exists (
      select 1 from public.knowledge_concepts concept
      where concept.id = (requirement ->> 'conceptId')::uuid and concept.status = 'approved'
        and (concept.scope = 'global' or concept.organization_id = p_organization_id)
    ) then raise exception 'VACANCY_REQUIREMENT_CONCEPT_INVALID'; end if;
    requirement_stable_id := case when nullif(requirement ->> 'stableId', '') is null then gen_random_uuid() else (requirement ->> 'stableId')::uuid end;
    insert into public.vacancy_requirements (
      organization_id, vacancy_id, vacancy_version_id, stable_id, competency_id, label, importance,
      transferable_competencies, category, observed_term, concept_id, relation_mode,
      target_level, criticality, verification_policy_requirement
    ) values (
      p_organization_id, local_vacancy.id, local_version_id, requirement_stable_id, null,
      btrim(requirement ->> 'label'), requirement ->> 'importance', '[]'::jsonb,
      requirement ->> 'category', nullif(btrim(requirement ->> 'observedTerm'), ''),
      nullif(requirement ->> 'conceptId', '')::uuid, coalesce(nullif(requirement ->> 'relationMode', ''), 'direct'),
      nullif(requirement ->> 'targetLevel', ''), nullif(requirement ->> 'criticality', ''),
      nullif(requirement ->> 'verificationPolicyRequirement', '')
    ) returning id into requirement_id;
    for related_signal in select value from jsonb_array_elements(coalesce(requirement -> 'relatedSignals', '[]'::jsonb)) loop
      if nullif(btrim(related_signal ->> 'label'), '') is not null then
        if nullif(related_signal ->> 'conceptId', '') is not null and not exists (
          select 1 from public.knowledge_concepts concept
          where concept.id = (related_signal ->> 'conceptId')::uuid and concept.status = 'approved'
            and (concept.scope = 'global' or concept.organization_id = p_organization_id)
        ) then raise exception 'VACANCY_RELATED_CONCEPT_INVALID'; end if;
        insert into public.vacancy_requirement_relations (
          organization_id, vacancy_id, vacancy_version_id, requirement_id, related_label,
          related_concept_id, suggestion_origin, confirmed_by_auth_user_id
        ) values (
          p_organization_id, local_vacancy.id, local_version_id, requirement_id,
          btrim(related_signal ->> 'label'), nullif(related_signal ->> 'conceptId', '')::uuid,
          coalesce(nullif(related_signal ->> 'origin', ''), 'operator'), actor_id
        );
      end if;
    end loop;
  end loop;

  update public.vacancies set position_id = local_position_id, job_role_id = local_job_role_id,
    title = btrim(p_title), area = nullif(btrim(p_area), ''), location = nullif(btrim(p_location), ''),
    work_arrangement = p_work_arrangement, employment_type = nullif(btrim(p_employment_type), ''),
    source_kind = p_source_kind, source_vacancy_id = p_source_vacancy_id, reference_concept_id = p_reference_concept_id,
    definition_version = local_version, current_version_id = local_version_id, updated_at = now()
  where organization_id = p_organization_id and id = local_vacancy.id;

  if p_save_as_role then
    update public.job_roles set name = btrim(p_title), mission = nullif(btrim(p_mission), ''),
      responsibilities = coalesce(p_responsibilities, '[]'::jsonb), expected_outcomes = coalesce(p_expected_outcomes, '[]'::jsonb),
      requirements_template = normalized_requirements, context_items = coalesce(p_context_items, '[]'::jsonb),
      reference_concept_id = p_reference_concept_id, updated_at = now()
    where organization_id = p_organization_id and id = local_job_role_id;
  end if;

  insert into public.vacancy_events (organization_id, vacancy_id, vacancy_version_id, event_type, actor_auth_user_id, metadata)
  values (p_organization_id, local_vacancy.id, local_version_id,
    case when local_created then 'created' else 'definition_updated' end, actor_id,
    jsonb_build_object('version', local_version, 'change_kind', p_change_kind, 'occupancy_status', p_occupancy_status));

  return query select local_vacancy.id, local_version_id, local_version, local_created;
end;
$$;

revoke all on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) to authenticated;

comment on table public.vacancy_versions is 'Snapshots imutáveis da definição profissional usada por descoberta, matching e histórico.';
comment on table public.vacancy_requirement_relations is 'Relações específicas confirmadas para uma versão de Vaga; nunca promovidas automaticamente à Knowledge.';
comment on function public.save_vacancy_definition is 'M5.4: salva Vaga, posição, versão e requisitos atomicamente com autorização tenant-scoped.';
