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
        'competencyKey', item_summary.competency_key,
        'targetLevel', item_summary.target_level,
        'source', item_summary.source,
        'availableItems', item_summary.available_items
      ) order by item_summary.competency_key, item_summary.target_level, item_summary.source), '[]'::jsonb)
      from (
        select item.competency_key, item.target_level, item.source, count(*)::integer as available_items
        from public.assessment_items item
        where item.state = 'active'
          and (item.organization_id is null or item.organization_id = p_organization_id)
        group by item.competency_key, item.target_level, item.source
      ) item_summary
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

revoke all on function public.load_m51a_verification_workspace(uuid) from public, anon;
grant execute on function public.load_m51a_verification_workspace(uuid) to authenticated;
