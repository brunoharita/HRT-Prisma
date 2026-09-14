-- M6.2: a verification need is created only by an explicit, tenant-authorized
-- action from an exact matching evaluation and an exact versioned requirement.

do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.verification_needs'::regclass
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) ilike '%organization_id%person_id%vacancy_id%competency_key%target_level%';
  if constraint_name is not null then
    execute format('alter table public.verification_needs drop constraint %I', constraint_name);
  end if;
end $$;

create unique index if not exists verification_needs_exact_requirement_idx
  on public.verification_needs (organization_id, person_id, vacancy_id, requirement_id, target_level)
  where requirement_id is not null;
create unique index if not exists verification_needs_legacy_competency_idx
  on public.verification_needs (organization_id, person_id, vacancy_id, competency_key, target_level)
  where requirement_id is null;

create or replace function public.create_m62_verification_need(
  p_matching_evaluation_id uuid,
  p_requirement_id uuid,
  p_target_level text,
  p_criticality text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  evaluation public.match_evaluations;
  requirement public.vacancy_requirements;
  vacancy public.vacancies;
  person public.people;
  actor_id uuid;
  matched_requirement jsonb;
  policy_requirement text;
  sufficiency_status text;
  competency_key text;
  need_record public.verification_needs;
  inserted boolean := false;
begin
  if p_target_level not in ('basic', 'intermediate', 'advanced') then raise exception 'M62_INVALID_TARGET_LEVEL'; end if;
  if p_criticality not in ('low', 'medium', 'high', 'critical') then raise exception 'M62_INVALID_CRITICALITY'; end if;

  select * into evaluation from public.match_evaluations where id = p_matching_evaluation_id;
  if evaluation.id is null then raise exception 'M62_MATCHING_EVALUATION_NOT_FOUND'; end if;
  actor_id := private.require_document_reviewer(evaluation.organization_id);
  if evaluation.matching_version <> 'vacancy-matching-explainable-4.0.0' or evaluation.vacancy_version_id is null then
    raise exception 'M62_UNSUPPORTED_MATCHING_VERSION';
  end if;

  select * into requirement from public.vacancy_requirements
  where organization_id = evaluation.organization_id
    and id = p_requirement_id
    and vacancy_id = evaluation.vacancy_id
    and vacancy_version_id = evaluation.vacancy_version_id;
  if requirement.id is null then raise exception 'M62_REQUIREMENT_CONTEXT_MISMATCH'; end if;

  select value into matched_requirement
  from jsonb_array_elements(coalesce(evaluation.evaluation_data -> 'requirements', '[]'::jsonb))
  where value ->> 'stableId' = requirement.stable_id::text
  limit 1;
  if matched_requirement is null then raise exception 'M62_MATCHING_EVIDENCE_NOT_FOUND'; end if;

  select * into vacancy from public.vacancies
  where organization_id = evaluation.organization_id and id = evaluation.vacancy_id;
  select * into person from public.people
  where organization_id = evaluation.organization_id and id = evaluation.person_id and operational_status = 'active';
  if vacancy.id is null or person.id is null then raise exception 'M62_CONTEXT_NOT_AVAILABLE'; end if;

  policy_requirement := coalesce(requirement.verification_policy_requirement,
    case when requirement.importance = 'required' then 'recommended' else 'optional' end);
  sufficiency_status := case policy_requirement
    when 'required_by_policy' then 'verification_required_by_policy'
    when 'recommended' then 'verification_recommended'
    else 'verification_optional'
  end;
  competency_key := coalesce(
    (select competency.normalized_name from public.competencies competency
      where competency.organization_id = evaluation.organization_id and competency.id = requirement.competency_id),
    lower(regexp_replace(requirement.label, '[^a-zA-Z0-9]+', '_', 'g'))
  );

  insert into public.verification_needs (
    organization_id, person_id, vacancy_id, requirement_id, competency_key, competency_label,
    target_level, criticality, status, sufficiency_status, sufficiency_requirement,
    sufficiency_reason_codes, sufficiency_explanation, sufficiency_engine_version,
    policy_version, evidence_snapshot, context_snapshot, created_by_auth_user_id
  ) values (
    evaluation.organization_id, evaluation.person_id, evaluation.vacancy_id, requirement.id,
    competency_key, requirement.label, p_target_level, p_criticality, 'open', sufficiency_status,
    policy_requirement,
    jsonb_build_array(
      case when matched_requirement ->> 'status' = 'no_evidence' then 'NO_RELEVANT_EVIDENCE' else 'MATCHING_EVIDENCE_REQUIRES_CONFIRMATION' end,
      'NO_DEMONSTRATED_EVIDENCE'
    ),
    case
      when sufficiency_status = 'verification_required_by_policy' then 'A política registrada para este requisito exige verificação no contexto desta Posição.'
      when matched_requirement ->> 'status' = 'no_evidence' then 'O matching não encontrou evidência suficiente para este requisito; a verificação pode produzir evidência nova.'
      else 'A evidência do matching é relevante, mas uma demonstração pode reduzir a incerteza sobre este requisito.'
    end,
    'm62-evidence-sufficiency-1.0.0', 'm62-contextual-verification-policy-1.0.0',
    jsonb_build_object(
      'matching_evaluation_id', evaluation.id,
      'matching_requirement', matched_requirement,
      'matching_version', evaluation.matching_version,
      'score_contract_version', evaluation.evaluation_data #>> '{score,scoreContractVersion}',
      'input_fingerprint', evaluation.evaluation_data #>> '{score,inputFingerprint}',
      'documentary_evidence', case when jsonb_array_length(coalesce(matched_requirement -> 'evidence', '[]'::jsonb)) > 0 then 'available' else 'not_available' end,
      'demonstrated_evidence', 'not_available'
    ),
    jsonb_build_object(
      'source', 'matching_requirement_action',
      'journey_version', 'm62-contextual-verification-journey-1.0.0',
      'person_name', person.full_name,
      'vacancy_title', vacancy.title,
      'vacancy_version_id', evaluation.vacancy_version_id,
      'vacancy_version', evaluation.evaluation_data ->> 'vacancyVersion',
      'requirement_id', requirement.id,
      'requirement_stable_id', requirement.stable_id,
      'requirement_label', requirement.label,
      'requirement_importance', requirement.importance,
      'target_level_source', case when requirement.target_level is null then 'operator' else 'position_definition' end,
      'criticality_source', case when requirement.criticality is null then 'operator' else 'position_definition' end,
      'verification_policy_requirement', policy_requirement
    ),
    actor_id
  )
  on conflict (organization_id, person_id, vacancy_id, requirement_id, target_level)
    where requirement_id is not null do nothing
  returning * into need_record;

  if need_record.id is null then
    select * into need_record from public.verification_needs
    where organization_id = evaluation.organization_id and person_id = evaluation.person_id
      and vacancy_id = evaluation.vacancy_id and requirement_id = requirement.id and target_level = p_target_level;
  else
    inserted := true;
  end if;

  insert into public.verification_audit_events
    (organization_id, actor_auth_user_id, need_id, action, result, payload)
  values (evaluation.organization_id, actor_id, need_record.id,
    case when inserted then 'm62_contextual_need_created' else 'm62_contextual_need_reused' end,
    'success', jsonb_build_object('matching_evaluation_id', evaluation.id, 'requirement_id', requirement.id));

  return jsonb_build_object('needId', need_record.id, 'created', inserted, 'status', need_record.sufficiency_status);
end;
$$;

create or replace function public.load_m51a_verification_workspace(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform actor_id;
  return jsonb_build_object(
    'needs', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', need.id, 'personId', need.person_id, 'personName', need.context_snapshot ->> 'person_name',
      'vacancyId', need.vacancy_id, 'vacancyTitle', need.context_snapshot ->> 'vacancy_title',
      'requirementId', need.requirement_id, 'competencyKey', need.competency_key, 'competencyLabel', need.competency_label,
      'targetLevel', need.target_level, 'criticality', need.criticality, 'status', need.status,
      'sufficiencyStatus', need.sufficiency_status, 'sufficiencyRequirement', need.sufficiency_requirement,
      'reasonCodes', need.sufficiency_reason_codes, 'explanation', need.sufficiency_explanation,
      'engineVersion', need.sufficiency_engine_version, 'policyVersion', need.policy_version,
      'evidenceSnapshot', need.evidence_snapshot, 'contextSnapshot', need.context_snapshot, 'createdAt', need.created_at,
      'events', (select coalesce(jsonb_agg(jsonb_build_object('id', event.id, 'action', event.action, 'result', event.result, 'payload', event.payload, 'createdAt', event.created_at) order by event.created_at), '[]'::jsonb)
        from public.verification_audit_events event where event.organization_id = need.organization_id and event.need_id = need.id)
    ) order by need.created_at desc), '[]'::jsonb) from public.verification_needs need where need.organization_id = p_organization_id),
    'definitions', (select coalesce(jsonb_agg(jsonb_build_object('id', definition.id, 'organizationId', definition.organization_id, 'key', definition.definition_key, 'name', definition.name, 'competencyKey', definition.competency_key, 'targetLevel', definition.target_level, 'domain', definition.domain, 'version', definition.version, 'status', definition.status, 'description', definition.description, 'content', definition.content, 'usageCount', 0) order by definition.name), '[]'::jsonb) from public.verification_definitions definition where definition.status = 'active' and (definition.organization_id is null or definition.organization_id = p_organization_id)),
    'blueprints', (select coalesce(jsonb_agg(jsonb_build_object('id', blueprint.id, 'definitionId', blueprint.definition_id, 'key', blueprint.blueprint_key, 'version', blueprint.version, 'itemCount', blueprint.item_count, 'estimatedMinutes', blueprint.estimated_minutes, 'modality', blueprint.modality, 'language', blueprint.language, 'dimensionDistribution', blueprint.dimension_distribution) order by blueprint.blueprint_key), '[]'::jsonb) from public.assessment_blueprints blueprint join public.verification_definitions definition on definition.id = blueprint.definition_id where blueprint.status = 'active' and (definition.organization_id is null or definition.organization_id = p_organization_id)),
    'rubrics', (select coalesce(jsonb_agg(jsonb_build_object('id', rubric.id, 'definitionId', rubric.definition_id, 'key', rubric.rubric_key, 'version', rubric.version, 'passingRules', rubric.passing_rules, 'correctionDimensions', rubric.correction_dimensions) order by rubric.rubric_key), '[]'::jsonb) from public.assessment_rubrics rubric join public.verification_definitions definition on definition.id = rubric.definition_id where rubric.status = 'active' and (definition.organization_id is null or definition.organization_id = p_organization_id)),
    'itemBankSummary', (select coalesce(jsonb_agg(jsonb_build_object('competencyKey', item.competency_key, 'targetLevel', item.target_level, 'source', item.source, 'availableItems', item.count)), '[]'::jsonb) from (select competency_key, target_level, source, count(*)::integer as count from public.assessment_items where state = 'active' and (organization_id is null or organization_id = p_organization_id) group by competency_key, target_level, source) item),
    'preparedAssessments', (select coalesce(jsonb_agg(jsonb_build_object('id', prepared.id, 'needId', prepared.need_id, 'definitionId', prepared.definition_id, 'blueprintId', prepared.blueprint_id, 'rubricId', prepared.rubric_id, 'status', prepared.status, 'itemIds', prepared.item_ids, 'versionSnapshot', prepared.version_snapshot, 'createdAt', prepared.created_at) order by prepared.created_at desc), '[]'::jsonb) from public.prepared_assessments prepared where prepared.organization_id = p_organization_id)
  );
end;
$$;

revoke all on function public.create_m62_verification_need(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_m62_verification_need(uuid, uuid, text, text) to authenticated;
revoke all on function public.load_m51a_verification_workspace(uuid) from public, anon;
grant execute on function public.load_m51a_verification_workspace(uuid) to authenticated;

comment on function public.create_m62_verification_need is 'M6.2: cria ou reutiliza uma necessidade por decisão humana explícita, requisito exato e snapshot versionado do matching.';
comment on function public.load_m51a_verification_workspace is 'M6.2: leitura tenant-scoped sem criação implícita de dados.';

create or replace function public.load_m51b_operator_workspace(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform actor_id;
  return jsonb_build_object(
    'preparedAssessments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', prepared.id, 'needId', need.id, 'personId', need.person_id, 'personName', person.full_name,
        'email', private_data.email, 'phone', private_data.phone, 'competency', need.competency_label,
        'competencyKey', need.competency_key, 'targetLevel', need.target_level, 'criticality', need.criticality,
        'context', need.context_snapshot ->> 'vacancy_title', 'vacancyId', need.vacancy_id,
        'vacancyVersion', nullif(need.context_snapshot ->> 'vacancy_version', '')::integer,
        'requirementId', need.requirement_id, 'requirementLabel', need.context_snapshot ->> 'requirement_label',
        'policyRequirement', need.sufficiency_requirement,
        'definitionVersion', prepared.version_snapshot ->> 'definitionVersion',
        'blueprintVersion', prepared.version_snapshot ->> 'blueprintVersion',
        'rubricVersion', prepared.version_snapshot ->> 'rubricVersion',
        'itemCount', blueprint.item_count, 'estimatedMinutes', blueprint.estimated_minutes,
        'createdAt', prepared.created_at
      ) order by prepared.created_at desc), '[]'::jsonb)
      from public.prepared_assessments prepared
      join public.verification_needs need on need.organization_id = prepared.organization_id and need.id = prepared.need_id
      join public.people person on person.organization_id = prepared.organization_id and person.id = need.person_id
      left join public.person_private_data private_data on private_data.organization_id = prepared.organization_id and private_data.person_id = need.person_id
      join public.assessment_blueprints blueprint on blueprint.id = prepared.blueprint_id
      where prepared.organization_id = p_organization_id and prepared.status = 'prepared'
    ),
    'verifications', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'invitationId', invitation.id, 'preparedAssessmentId', invitation.prepared_assessment_id,
        'personId', invitation.person_id, 'personName', person.full_name, 'competency', need.competency_label,
        'vacancyId', need.vacancy_id, 'vacancyTitle', need.context_snapshot ->> 'vacancy_title',
        'vacancyVersion', nullif(need.context_snapshot ->> 'vacancy_version', '')::integer,
        'requirementId', need.requirement_id, 'requirementLabel', need.context_snapshot ->> 'requirement_label',
        'policyRequirement', need.sufficiency_requirement, 'targetLevel', need.target_level,
        'status', case
          when invitation.status in ('cancelled', 'revoked') then invitation.status
          when invitation.expires_at <= now() and invitation.status <> 'completed' then 'expired'
          when attempt.status = 'paused' then 'paused'
          when attempt.status in ('in_progress', 'submitted') then 'in_progress'
          when attempt.status in ('evaluated', 'inconclusive') then case when evaluation.demonstrated_level = 'inconclusive' then 'inconclusive' else 'completed' end
          when invitation.status = 'opened' then 'opened' else 'pending' end,
        'expiresAt', invitation.expires_at, 'lastActivityAt', coalesce(attempt.updated_at, invitation.opened_at, invitation.issued_at),
        'progress', case when blueprint.item_count = 0 then 0 else round(100.0 * coalesce(answered.count, 0) / blueprint.item_count, 0) end,
        'confidenceState', evaluation.confidence_state, 'demonstratedLevel', evaluation.demonstrated_level,
        'rawResult', evaluation.raw_result, 'integrityState', integrity.integrity_state,
        'issuedAt', invitation.issued_at, 'completedAt', invitation.completed_at,
        'automaticDeliveryConfigured', false,
        'versions', coalesce(prepared.version_snapshot, '{}'::jsonb) || jsonb_build_object(
          'matchingVersion', need.evidence_snapshot ->> 'matching_version',
          'sufficiencyEngineVersion', need.sufficiency_engine_version,
          'policyVersion', need.policy_version,
          'assessmentVersion', attempt.assessment_version,
          'evaluationVersion', evaluation.evaluation_version,
          'integrityRuleVersion', integrity.ruleset_version
        ),
        'events', (select coalesce(jsonb_agg(jsonb_build_object('id', event.id, 'action', event.action, 'result', event.result, 'payload', event.payload, 'createdAt', event.created_at) order by event.created_at), '[]'::jsonb) from public.verification_audit_events event where event.organization_id = invitation.organization_id and event.need_id = need.id)
      ) order by invitation.created_at desc), '[]'::jsonb)
      from public.assessment_invitations invitation
      join public.verification_needs need on need.organization_id = invitation.organization_id and need.id = invitation.verification_need_id
      join public.people person on person.organization_id = invitation.organization_id and person.id = invitation.person_id
      join public.prepared_assessments prepared on prepared.organization_id = invitation.organization_id and prepared.id = invitation.prepared_assessment_id
      join public.assessment_blueprints blueprint on blueprint.id = prepared.blueprint_id
      left join public.assessment_attempts attempt on attempt.organization_id = invitation.organization_id and attempt.invitation_id = invitation.id and attempt.attempt_number = 1
      left join public.assessment_evaluations evaluation on evaluation.organization_id = invitation.organization_id and evaluation.attempt_id = attempt.id
      left join public.assessment_integrity_analyses integrity on integrity.organization_id = invitation.organization_id and integrity.id = evaluation.integrity_analysis_id
      left join lateral (select count(*)::integer as count from public.assessment_responses response where response.organization_id = invitation.organization_id and response.attempt_id = attempt.id and response.final_selected_option is not null) answered on true
      where invitation.organization_id = p_organization_id
    )
  );
end;
$$;

revoke all on function public.load_m51b_operator_workspace(uuid) from public, anon;
grant execute on function public.load_m51b_operator_workspace(uuid) to authenticated;
comment on function public.load_m51b_operator_workspace is 'M6.2: acompanhamento contextual com requisito, versões e linha do tempo.';
