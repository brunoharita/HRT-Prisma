create table public.verification_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  definition_key text not null,
  name text not null,
  competency_key text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  domain text not null,
  version text not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  description text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, definition_key, version),
  check (jsonb_typeof(content) = 'object')
);

create unique index verification_definitions_global_unique_idx
on public.verification_definitions (definition_key, version)
where organization_id is null;

create index verification_definitions_scope_idx
on public.verification_definitions (organization_id, competency_key, target_level, status);

create table public.verification_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_key text not null,
  competency_key text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  criticality_threshold text not null check (criticality_threshold in ('low', 'medium', 'high', 'critical')),
  requirement text not null check (requirement in ('none', 'optional', 'recommended', 'required_by_policy')),
  version text not null,
  active boolean not null default true,
  rationale text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, policy_key, version)
);

create index verification_policies_scope_idx
on public.verification_policies (organization_id, competency_key, target_level, active);

create table public.verification_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  vacancy_id uuid not null,
  requirement_id uuid,
  competency_key text not null,
  competency_label text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  criticality text not null check (criticality in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'draft', 'prepared', 'cancelled')),
  sufficiency_status text not null check (sufficiency_status in ('sufficient', 'verification_optional', 'verification_recommended', 'verification_required_by_policy', 'insufficient_information')),
  sufficiency_requirement text not null check (sufficiency_requirement in ('none', 'optional', 'recommended', 'required_by_policy')),
  sufficiency_reason_codes jsonb not null default '[]'::jsonb,
  sufficiency_explanation text not null,
  sufficiency_engine_version text not null,
  policy_version text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, person_id, vacancy_id, competency_key, target_level),
  foreign key (organization_id, person_id)
    references public.people(organization_id, id)
    on delete cascade,
  foreign key (organization_id, vacancy_id)
    references public.vacancies(organization_id, id)
    on delete cascade,
  foreign key (organization_id, requirement_id)
    references public.vacancy_requirements(organization_id, id)
    on delete set null (requirement_id),
  check (jsonb_typeof(sufficiency_reason_codes) = 'array'),
  check (jsonb_typeof(evidence_snapshot) = 'object'),
  check (jsonb_typeof(context_snapshot) = 'object')
);

create index verification_needs_scope_idx
on public.verification_needs (organization_id, status, created_at desc);

create table public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  definition_id uuid not null references public.verification_definitions(id) on delete restrict,
  blueprint_key text not null,
  version text not null,
  item_count integer not null check (item_count > 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  modality text not null default 'multiple_choice' check (modality in ('multiple_choice')),
  language text not null default 'pt-BR',
  dimension_distribution jsonb not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, blueprint_key, version),
  check (jsonb_typeof(dimension_distribution) = 'array')
);

create unique index assessment_blueprints_global_unique_idx
on public.assessment_blueprints (blueprint_key, version)
where organization_id is null;

create table public.assessment_rubrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  definition_id uuid not null references public.verification_definitions(id) on delete restrict,
  rubric_key text not null,
  version text not null,
  passing_rules jsonb not null,
  correction_dimensions jsonb not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rubric_key, version),
  check (jsonb_typeof(passing_rules) = 'object'),
  check (jsonb_typeof(correction_dimensions) = 'array')
);

create unique index assessment_rubrics_global_unique_idx
on public.assessment_rubrics (rubric_key, version)
where organization_id is null;

create table public.assessment_item_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_key text not null,
  competency_key text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  dimension text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, family_key)
);

create unique index assessment_item_families_global_unique_idx
on public.assessment_item_families (family_key)
where organization_id is null;

create table public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id uuid not null references public.assessment_item_families(id) on delete restrict,
  item_key text not null,
  version text not null,
  competency_key text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  dimension text not null,
  state text not null default 'active' check (state in ('active', 'inactive', 'deprecated', 'compromised')),
  source text not null default 'global' check (source in ('global', 'organization')),
  language text not null default 'pt-BR',
  modality text not null default 'multiple_choice' check (modality in ('multiple_choice')),
  stem text not null,
  options jsonb not null,
  answer_key jsonb not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, item_key, version),
  check (jsonb_typeof(options) = 'array'),
  check (jsonb_typeof(answer_key) = 'object')
);

create unique index assessment_items_global_unique_idx
on public.assessment_items (item_key, version)
where organization_id is null;

create index assessment_items_scope_idx
on public.assessment_items (organization_id, competency_key, target_level, dimension, state);

create table public.prepared_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  need_id uuid not null,
  definition_id uuid not null references public.verification_definitions(id) on delete restrict,
  blueprint_id uuid not null references public.assessment_blueprints(id) on delete restrict,
  rubric_id uuid not null references public.assessment_rubrics(id) on delete restrict,
  status text not null check (status in ('draft', 'prepared')),
  item_ids jsonb not null,
  version_snapshot jsonb not null,
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, need_id, status),
  foreign key (organization_id, need_id)
    references public.verification_needs(organization_id, id)
    on delete cascade,
  check (jsonb_typeof(item_ids) = 'array'),
  check (jsonb_typeof(version_snapshot) = 'object')
);

create index prepared_assessments_need_idx
on public.prepared_assessments (organization_id, need_id, created_at desc);

create table public.verification_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  need_id uuid,
  prepared_assessment_id uuid,
  action text not null,
  result text not null check (result in ('success', 'failure')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, need_id)
    references public.verification_needs(organization_id, id)
    on delete set null,
  foreign key (organization_id, prepared_assessment_id)
    references public.prepared_assessments(organization_id, id)
    on delete set null,
  check (jsonb_typeof(payload) = 'object')
);

create index verification_audit_events_scope_idx
on public.verification_audit_events (organization_id, created_at desc);

create or replace function private.m51a_select_policy_requirement(
  p_organization_id uuid,
  p_competency_key text,
  p_target_level text
)
returns table(requirement text, version text)
language sql
stable
security definer
set search_path = ''
as $$
  select policy.requirement, policy.version
  from public.verification_policies policy
  where policy.organization_id = p_organization_id
    and policy.competency_key = p_competency_key
    and policy.target_level = p_target_level
    and policy.active
  order by
    case policy.requirement
      when 'required_by_policy' then 1
      when 'recommended' then 2
      when 'optional' then 3
      else 4
    end,
    policy.created_at desc
  limit 1;
$$;

create or replace function private.m51a_sufficiency_status(
  p_requirement text,
  p_target_level text,
  p_criticality text,
  p_documentary_strength text,
  p_has_demonstrated boolean
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_has_demonstrated then 'sufficient'
    when p_requirement = 'required_by_policy' then 'verification_required_by_policy'
    when p_documentary_strength = 'none' then 'insufficient_information'
    when p_requirement = 'recommended'
      or p_target_level = 'advanced'
      or p_criticality in ('critical', 'high') then 'verification_recommended'
    else 'verification_optional'
  end;
$$;

create or replace function private.m51a_reason_codes(
  p_requirement text,
  p_target_level text,
  p_criticality text,
  p_documentary_strength text,
  p_has_demonstrated boolean
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(code), '[]'::jsonb)
  from (
    select 'DEMONSTRATED_EVIDENCE_CONFIRMS_LEVEL'::text as code where p_has_demonstrated
    union all select 'POLICY_REQUIRES_VERIFICATION' where p_requirement = 'required_by_policy' and not p_has_demonstrated
    union all select 'POLICY_RECOMMENDS_VERIFICATION' where p_requirement = 'recommended' and not p_has_demonstrated
    union all select 'DOCUMENTARY_EVIDENCE_STRONG_BUT_NOT_DEMONSTRATED' where p_documentary_strength = 'strong' and not p_has_demonstrated
    union all select 'DOCUMENTARY_EVIDENCE_LIMITED' where p_documentary_strength = 'limited' and not p_has_demonstrated
    union all select 'NO_RELEVANT_EVIDENCE' where p_documentary_strength = 'none' and not p_has_demonstrated
    union all select 'NO_DEMONSTRATED_EVIDENCE' where not p_has_demonstrated
    union all select 'CRITICAL_NEED_REQUIRES_HUMAN_CONFIRMATION' where p_criticality in ('critical', 'high') and not p_has_demonstrated
    union all select 'ADVANCED_LEVEL_REQUIRES_DEMONSTRATION' where p_target_level = 'advanced' and not p_has_demonstrated
  ) reason;
$$;

create or replace function public.ensure_m51a_demo_need(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  selected_person record;
  selected_vacancy record;
  selected_requirement record;
  policy record;
  evidence_count integer;
  documentary_strength text;
  need_record public.verification_needs;
  status_value text;
  reason_codes jsonb;
begin
  actor_id := private.require_document_reviewer(p_organization_id);

  select person.id, person.full_name
  into selected_person
  from public.people person
  where person.organization_id = p_organization_id
  order by person.created_at desc
  limit 1;

  select vacancy.id, vacancy.title
  into selected_vacancy
  from public.vacancies vacancy
  where vacancy.organization_id = p_organization_id
  order by case vacancy.status when 'open' then 1 when 'draft' then 2 else 3 end, vacancy.created_at desc
  limit 1;

  if selected_person.id is null or selected_vacancy.id is null then
    raise exception 'M51A_REQUIRES_PERSON_AND_VACANCY';
  end if;

  select requirement.id, requirement.label, competency.normalized_name
  into selected_requirement
  from public.vacancy_requirements requirement
  join public.competencies competency
    on competency.organization_id = requirement.organization_id
   and competency.id = requirement.competency_id
  where requirement.organization_id = p_organization_id
    and requirement.vacancy_id = selected_vacancy.id
  order by
    case when lower(competency.normalized_name) like '%sql%' then 1 else 2 end,
    case requirement.importance when 'required' then 1 else 2 end,
    requirement.created_at
  limit 1;

  if selected_requirement.id is null then
    raise exception 'M51A_REQUIRES_VACANCY_REQUIREMENT';
  end if;

  select coalesce(count(*), 0)
  into evidence_count
  from public.evidence evidence_item
  where evidence_item.organization_id = p_organization_id
    and evidence_item.person_id = selected_person.id
    and (
      lower(evidence_item.fact) like '%sql%'
      or lower(evidence_item.quoted_text) like '%sql%'
      or lower(evidence_item.fact) like '%' || lower(selected_requirement.normalized_name) || '%'
    );

  documentary_strength := case when evidence_count >= 2 then 'strong' when evidence_count = 1 then 'limited' else 'strong' end;

  select *
  into policy
  from private.m51a_select_policy_requirement(p_organization_id, 'sql', 'advanced')
  limit 1;

  status_value := private.m51a_sufficiency_status(coalesce(policy.requirement, 'recommended'), 'advanced', 'critical', documentary_strength, false);
  reason_codes := private.m51a_reason_codes(coalesce(policy.requirement, 'recommended'), 'advanced', 'critical', documentary_strength, false);

  insert into public.verification_needs (
    organization_id, person_id, vacancy_id, requirement_id, competency_key, competency_label,
    target_level, criticality, status, sufficiency_status, sufficiency_requirement,
    sufficiency_reason_codes, sufficiency_explanation, sufficiency_engine_version,
    policy_version, evidence_snapshot, context_snapshot, created_by_auth_user_id
  )
  values (
    p_organization_id, selected_person.id, selected_vacancy.id, selected_requirement.id, 'sql', 'SQL',
    'advanced', 'critical', 'open', status_value, coalesce(policy.requirement, 'recommended'),
    reason_codes,
    case
      when status_value = 'verification_required_by_policy' then 'A política vigente exige verificação humana antes de tratar a aderência como demonstrada.'
      else 'A evidência documental existente ajuda a indicar aderência, mas não demonstra SQL avançado no nível requerido.'
    end,
    'm51a-evidence-sufficiency-1.0.0',
    coalesce(policy.version, 'm51a-verification-policy-1.0.0'),
    jsonb_build_object(
      'documentary_evidence', case when documentary_strength = 'none' then 'none' else 'available' end,
      'demonstrated_evidence', 'not_available',
      'evidence_count', evidence_count,
      'source', 'QA/demo synthetic M5.1A'
    ),
    jsonb_build_object(
      'person_name', selected_person.full_name,
      'vacancy_title', selected_vacancy.title,
      'requirement_label', selected_requirement.label,
      'source', 'QA/demo synthetic M5.1A'
    ),
    actor_id
  )
  on conflict (organization_id, person_id, vacancy_id, competency_key, target_level)
  do update set
    requirement_id = excluded.requirement_id,
    competency_label = excluded.competency_label,
    criticality = excluded.criticality,
    sufficiency_status = excluded.sufficiency_status,
    sufficiency_requirement = excluded.sufficiency_requirement,
    sufficiency_reason_codes = excluded.sufficiency_reason_codes,
    sufficiency_explanation = excluded.sufficiency_explanation,
    sufficiency_engine_version = excluded.sufficiency_engine_version,
    policy_version = excluded.policy_version,
    evidence_snapshot = excluded.evidence_snapshot,
    context_snapshot = excluded.context_snapshot,
    updated_at = now()
  returning * into need_record;

  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, need_id, action, result, payload
  ) values (
    p_organization_id, actor_id, need_record.id, 'm51a_demo_need_ensured', 'success',
    jsonb_build_object('need_id', need_record.id, 'sufficiency_status', need_record.sufficiency_status)
  );

  return jsonb_build_object('need_id', need_record.id);
end;
$$;

create or replace function public.load_m51a_verification_workspace(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  ensured jsonb;
  payload jsonb;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  ensured := public.ensure_m51a_demo_need(p_organization_id);

  select jsonb_build_object(
    'needs', coalesce(jsonb_agg(jsonb_build_object(
      'id', need.id,
      'personId', need.person_id,
      'personName', need.context_snapshot ->> 'person_name',
      'vacancyId', need.vacancy_id,
      'vacancyTitle', need.context_snapshot ->> 'vacancy_title',
      'requirementId', need.requirement_id,
      'competencyKey', need.competency_key,
      'competencyLabel', need.competency_label,
      'targetLevel', need.target_level,
      'criticality', need.criticality,
      'status', need.status,
      'sufficiencyStatus', need.sufficiency_status,
      'sufficiencyRequirement', need.sufficiency_requirement,
      'reasonCodes', need.sufficiency_reason_codes,
      'explanation', need.sufficiency_explanation,
      'engineVersion', need.sufficiency_engine_version,
      'policyVersion', need.policy_version,
      'evidenceSnapshot', need.evidence_snapshot,
      'contextSnapshot', need.context_snapshot,
      'createdAt', need.created_at
    ) order by need.created_at desc), '[]'::jsonb),
    'definitions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', definition.id,
        'organizationId', definition.organization_id,
        'key', definition.definition_key,
        'name', definition.name,
        'competencyKey', definition.competency_key,
        'targetLevel', definition.target_level,
        'domain', definition.domain,
        'version', definition.version,
        'status', definition.status,
        'description', definition.description,
        'content', definition.content,
        'usageCount', 128
      ) order by definition.name), '[]'::jsonb)
      from public.verification_definitions definition
      where definition.status = 'active'
        and (definition.organization_id is null or definition.organization_id = p_organization_id)
    ),
    'blueprints', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', blueprint.id,
        'definitionId', blueprint.definition_id,
        'key', blueprint.blueprint_key,
        'version', blueprint.version,
        'itemCount', blueprint.item_count,
        'estimatedMinutes', blueprint.estimated_minutes,
        'modality', blueprint.modality,
        'language', blueprint.language,
        'dimensionDistribution', blueprint.dimension_distribution
      ) order by blueprint.blueprint_key), '[]'::jsonb)
      from public.assessment_blueprints blueprint
      join public.verification_definitions definition on definition.id = blueprint.definition_id
      where blueprint.status = 'active'
        and (definition.organization_id is null or definition.organization_id = p_organization_id)
    ),
    'rubrics', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', rubric.id,
        'definitionId', rubric.definition_id,
        'key', rubric.rubric_key,
        'version', rubric.version,
        'passingRules', rubric.passing_rules,
        'correctionDimensions', rubric.correction_dimensions
      ) order by rubric.rubric_key), '[]'::jsonb)
      from public.assessment_rubrics rubric
      join public.verification_definitions definition on definition.id = rubric.definition_id
      where rubric.status = 'active'
        and (definition.organization_id is null or definition.organization_id = p_organization_id)
    ),
    'itemBankSummary', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'competencyKey', item.competency_key,
        'targetLevel', item.target_level,
        'source', item.source,
        'availableItems', count(*)
      )), '[]'::jsonb)
      from public.assessment_items item
      where item.state = 'active'
        and (item.organization_id is null or item.organization_id = p_organization_id)
      group by item.competency_key, item.target_level, item.source
    ),
    'preparedAssessments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', prepared.id,
        'needId', prepared.need_id,
        'definitionId', prepared.definition_id,
        'blueprintId', prepared.blueprint_id,
        'rubricId', prepared.rubric_id,
        'status', prepared.status,
        'itemIds', prepared.item_ids,
        'versionSnapshot', prepared.version_snapshot,
        'createdAt', prepared.created_at
      ) order by prepared.created_at desc), '[]'::jsonb)
      from public.prepared_assessments prepared
      where prepared.organization_id = p_organization_id
    )
  )
  into payload
  from public.verification_needs need
  where need.organization_id = p_organization_id;

  perform actor_id;
  perform ensured;
  return payload;
end;
$$;

create or replace function public.prepare_m51a_assessment(
  p_need_id uuid,
  p_definition_id uuid,
  p_blueprint_id uuid,
  p_status text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  need_record public.verification_needs;
  definition_record public.verification_definitions;
  blueprint_record public.assessment_blueprints;
  rubric_record public.assessment_rubrics;
  actor_id uuid;
  selected_item_ids jsonb;
  item_versions jsonb;
  prepared_record public.prepared_assessments;
begin
  if p_status not in ('draft', 'prepared') then
    raise exception 'M51A_INVALID_PREPARED_STATUS';
  end if;

  select * into need_record from public.verification_needs where id = p_need_id;
  if need_record.id is null then
    raise exception 'M51A_NEED_NOT_FOUND';
  end if;

  actor_id := private.require_document_reviewer(need_record.organization_id);

  select * into definition_record
  from public.verification_definitions
  where id = p_definition_id
    and status = 'active'
    and competency_key = need_record.competency_key
    and target_level = need_record.target_level
    and (organization_id is null or organization_id = need_record.organization_id);

  select * into blueprint_record
  from public.assessment_blueprints
  where id = p_blueprint_id
    and definition_id = p_definition_id
    and status = 'active'
    and (organization_id is null or organization_id = need_record.organization_id);

  select * into rubric_record
  from public.assessment_rubrics
  where definition_id = p_definition_id
    and status = 'active'
    and (organization_id is null or organization_id = need_record.organization_id)
  order by created_at desc
  limit 1;

  if definition_record.id is null or blueprint_record.id is null or rubric_record.id is null then
    raise exception 'M51A_INSTRUMENT_CONTRACT_NOT_FOUND';
  end if;

  with target_distribution as (
    select
      value ->> 'dimension' as dimension,
      greatest((value ->> 'count')::integer, 0) as target_count
    from jsonb_array_elements(blueprint_record.dimension_distribution)
  ),
  ranked_items as (
    select
      item.id,
      item.version,
      row_number() over (partition by item.dimension order by item.item_key, item.version desc) as dimension_rank
    from public.assessment_items item
    join target_distribution distribution on distribution.dimension = item.dimension
    where item.state = 'active'
      and item.competency_key = definition_record.competency_key
      and item.target_level = definition_record.target_level
      and item.modality = blueprint_record.modality
      and item.language = blueprint_record.language
      and (item.organization_id is null or item.organization_id = need_record.organization_id)
  ),
  selected_items as (
    select ranked_items.id, ranked_items.version
    from ranked_items
    join target_distribution distribution on distribution.dimension = (
      select item.dimension from public.assessment_items item where item.id = ranked_items.id
    )
    where ranked_items.dimension_rank <= distribution.target_count
    order by ranked_items.id
  )
  select
    coalesce(jsonb_agg(id), '[]'::jsonb),
    coalesce(jsonb_object_agg(id::text, version), '{}'::jsonb)
  into selected_item_ids, item_versions
  from selected_items;

  if jsonb_array_length(selected_item_ids) <> blueprint_record.item_count then
    raise exception 'M51A_INSUFFICIENT_ITEM_BANK_COVERAGE';
  end if;

  insert into public.prepared_assessments (
    organization_id, need_id, definition_id, blueprint_id, rubric_id, status,
    item_ids, version_snapshot, created_by_auth_user_id
  )
  values (
    need_record.organization_id,
    need_record.id,
    definition_record.id,
    blueprint_record.id,
    rubric_record.id,
    p_status,
    selected_item_ids,
    jsonb_build_object(
      'definitionVersion', definition_record.version,
      'blueprintVersion', blueprint_record.version,
      'rubricVersion', rubric_record.version,
      'itemVersions', item_versions,
      'composerVersion', 'm51a-assessment-composer-1.0.0',
      'preparedAssessmentVersion', 'm51a-prepared-assessment-1.0.0',
      'idempotencyKey', p_idempotency_key
    ),
    actor_id
  )
  on conflict (organization_id, need_id, status)
  do update set
    definition_id = excluded.definition_id,
    blueprint_id = excluded.blueprint_id,
    rubric_id = excluded.rubric_id,
    item_ids = excluded.item_ids,
    version_snapshot = excluded.version_snapshot,
    updated_at = now()
  returning * into prepared_record;

  update public.verification_needs
  set status = case when p_status = 'prepared' then 'prepared' else 'draft' end,
      updated_at = now()
  where organization_id = need_record.organization_id
    and id = need_record.id;

  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, need_id, prepared_assessment_id, action, result, payload
  ) values (
    need_record.organization_id, actor_id, need_record.id, prepared_record.id,
    case when p_status = 'prepared' then 'm51a_assessment_prepared' else 'm51a_assessment_draft_saved' end,
    'success',
    jsonb_build_object('prepared_assessment_id', prepared_record.id, 'idempotency_key', p_idempotency_key)
  );

  return jsonb_build_object(
    'preparedAssessmentId', prepared_record.id,
    'needId', prepared_record.need_id,
    'status', prepared_record.status,
    'itemCount', jsonb_array_length(prepared_record.item_ids)
  );
end;
$$;

alter table public.verification_definitions enable row level security;
alter table public.verification_policies enable row level security;
alter table public.verification_needs enable row level security;
alter table public.assessment_blueprints enable row level security;
alter table public.assessment_rubrics enable row level security;
alter table public.assessment_item_families enable row level security;
alter table public.assessment_items enable row level security;
alter table public.prepared_assessments enable row level security;
alter table public.verification_audit_events enable row level security;

create policy verification_definitions_select on public.verification_definitions for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy verification_definitions_manage on public.verification_definitions for all to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy verification_policies_select on public.verification_policies for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy verification_policies_manage on public.verification_policies for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy verification_needs_select on public.verification_needs for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy verification_needs_manage on public.verification_needs for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy assessment_blueprints_select on public.assessment_blueprints for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy assessment_blueprints_manage on public.assessment_blueprints for all to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_rubrics_select on public.assessment_rubrics for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy assessment_rubrics_manage on public.assessment_rubrics for all to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_item_families_select on public.assessment_item_families for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy assessment_item_families_manage on public.assessment_item_families for all to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy assessment_items_select on public.assessment_items for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy assessment_items_manage on public.assessment_items for all to authenticated
using (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])))
with check (organization_id is not null and (select private.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])));

create policy prepared_assessments_select on public.prepared_assessments for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));
create policy prepared_assessments_manage on public.prepared_assessments for all to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])))
with check ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

create policy verification_audit_events_select on public.verification_audit_events for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));

revoke all on function private.m51a_select_policy_requirement(uuid, text, text) from public, anon, authenticated;
revoke all on function private.m51a_sufficiency_status(text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.m51a_reason_codes(text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.ensure_m51a_demo_need(uuid) from public;
revoke all on function public.load_m51a_verification_workspace(uuid) from public;
revoke all on function public.prepare_m51a_assessment(uuid, uuid, uuid, text, text) from public;
grant execute on function public.ensure_m51a_demo_need(uuid) to authenticated;
grant execute on function public.load_m51a_verification_workspace(uuid) to authenticated;
grant execute on function public.prepare_m51a_assessment(uuid, uuid, uuid, text, text) to authenticated;

revoke all on public.verification_definitions from anon;
revoke all on public.verification_policies from anon;
revoke all on public.verification_needs from anon;
revoke all on public.assessment_blueprints from anon;
revoke all on public.assessment_rubrics from anon;
revoke all on public.assessment_item_families from anon;
revoke all on public.assessment_items from anon;
revoke all on public.prepared_assessments from anon;
revoke all on public.verification_audit_events from anon;
revoke all on public.verification_definitions from authenticated;
revoke all on public.verification_policies from authenticated;
revoke all on public.verification_needs from authenticated;
revoke all on public.assessment_blueprints from authenticated;
revoke all on public.assessment_rubrics from authenticated;
revoke all on public.assessment_item_families from authenticated;
revoke all on public.assessment_items from authenticated;
revoke all on public.prepared_assessments from authenticated;
revoke all on public.verification_audit_events from authenticated;

grant select on public.verification_definitions to authenticated;
grant select on public.verification_policies to authenticated;
grant select on public.verification_needs to authenticated;
grant select on public.assessment_blueprints to authenticated;
grant select on public.assessment_rubrics to authenticated;
grant select on public.assessment_item_families to authenticated;
grant select on public.assessment_items to authenticated;
grant select on public.prepared_assessments to authenticated;
grant select on public.verification_audit_events to authenticated;
grant insert, update, delete on public.verification_definitions to authenticated;
grant insert, update, delete on public.verification_policies to authenticated;
grant insert, update, delete on public.assessment_blueprints to authenticated;
grant insert, update, delete on public.assessment_rubrics to authenticated;
grant insert, update, delete on public.assessment_item_families to authenticated;
grant insert, update, delete on public.assessment_items to authenticated;

with inserted_definition as (
  insert into public.verification_definitions (
    organization_id, definition_key, name, competency_key, target_level, domain, version, status, description, content
  ) values
    (null, 'sql-advanced-standard', 'SQL Avançado Padrão', 'sql', 'advanced', 'backend', 'v1.2', 'active',
     'Avalia capacidade avançada em SQL, incluindo consultas complexas, performance, modelagem e tuning.',
     jsonb_build_object(
       'what_is_verified', 'Capacidade de escrever consultas SQL avançadas, modelar dados, otimizar performance e resolver problemas complexos.',
       'qa_demo', true
     ))
  on conflict do nothing
  returning id
),
definition as (
  select id from inserted_definition
  union all
  select id from public.verification_definitions where organization_id is null and definition_key = 'sql-advanced-standard' and version = 'v1.2'
  limit 1
),
inserted_blueprint as (
  insert into public.assessment_blueprints (
    organization_id, definition_id, blueprint_key, version, item_count, estimated_minutes, modality, language, dimension_distribution, status
  )
  select null, definition.id, 'BP-SQL-ADV-001', 'v1.3', 15, 45, 'multiple_choice', 'pt-BR',
    jsonb_build_array(
      jsonb_build_object('dimension', 'query_modeling', 'count', 5),
      jsonb_build_object('dimension', 'performance', 'count', 5),
      jsonb_build_object('dimension', 'troubleshooting', 'count', 5)
    ),
    'active'
  from definition
  on conflict do nothing
  returning id
),
inserted_rubric as (
  insert into public.assessment_rubrics (
    organization_id, definition_id, rubric_key, version, passing_rules, correction_dimensions, status
  )
  select null, definition.id, 'RB-SQL-ADV-001', 'v1.2',
    jsonb_build_object('minimumCorrectPercentage', 70, 'requiresDimensionCoverage', true),
    jsonb_build_array('query_modeling', 'performance', 'troubleshooting'),
    'active'
  from definition
  on conflict do nothing
  returning id
),
families as (
  insert into public.assessment_item_families (
    organization_id, family_key, competency_key, target_level, dimension
  )
  select null, 'FAM-SQL-ADV-' || lpad(series::text, 3, '0'), 'sql', 'advanced',
    case when series <= 5 then 'query_modeling' when series <= 10 then 'performance' else 'troubleshooting' end
  from generate_series(1, 15) series
  on conflict do nothing
  returning id, family_key, dimension
)
insert into public.assessment_items (
  organization_id, family_id, item_key, version, competency_key, target_level, dimension,
  state, source, language, modality, stem, options, answer_key, explanation
)
select
  null,
  family.id,
  replace(family.family_key, 'FAM-', 'ITEM-'),
  'm51a-assessment-item-1.0.0',
  'sql',
  'advanced',
  family.dimension,
  'active',
  'global',
  'pt-BR',
  'multiple_choice',
  '[QA/demo] Item sintético de SQL avançado para ' || family.dimension || '.',
  jsonb_build_array(
    jsonb_build_object('id', 'A', 'label', 'Alternativa A'),
    jsonb_build_object('id', 'B', 'label', 'Alternativa B'),
    jsonb_build_object('id', 'C', 'label', 'Alternativa C'),
    jsonb_build_object('id', 'D', 'label', 'Alternativa D')
  ),
  jsonb_build_object('correctOptionId', 'B'),
  '[QA/demo] Explicação sintética versionada para validação interna do instrumento.'
from families family
on conflict do nothing;

insert into public.verification_policies (
  organization_id, policy_key, competency_key, target_level, criticality_threshold, requirement, version, active, rationale
)
select organization.id, 'sql-advanced-critical-default', 'sql', 'advanced', 'critical', 'required_by_policy',
  'm51a-verification-policy-1.0.0', true,
  'SQL avançado crítico deve ser confirmado por verificação humana antes de gerar evidência demonstrada.'
from public.organizations organization
on conflict do nothing;
