-- M6.1.2 trajectory-first matching: accept current and historical supported snapshots in M6.2.

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
  effective_target_level text;
  effective_criticality text;
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
  if evaluation.matching_version not in ('vacancy-matching-explainable-4.0.0', 'vacancy-matching-explainable-5.0.0')
    or evaluation.vacancy_version_id is null then
    raise exception 'M62_UNSUPPORTED_MATCHING_VERSION';
  end if;

  select * into requirement from public.vacancy_requirements
  where organization_id = evaluation.organization_id
    and id = p_requirement_id
    and vacancy_id = evaluation.vacancy_id
    and vacancy_version_id = evaluation.vacancy_version_id;
  if requirement.id is null then raise exception 'M62_REQUIREMENT_CONTEXT_MISMATCH'; end if;
  if requirement.target_level is not null and requirement.target_level <> p_target_level then
    raise exception 'M62_TARGET_LEVEL_CONTEXT_MISMATCH';
  end if;
  if requirement.criticality is not null and requirement.criticality <> p_criticality then
    raise exception 'M62_CRITICALITY_CONTEXT_MISMATCH';
  end if;
  effective_target_level := coalesce(requirement.target_level, p_target_level);
  effective_criticality := coalesce(requirement.criticality, p_criticality);

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
    competency_key, requirement.label, effective_target_level, effective_criticality, 'open', sufficiency_status,
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
      and vacancy_id = evaluation.vacancy_id and requirement_id = requirement.id and target_level = effective_target_level;
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

revoke all on function public.create_m62_verification_need(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_m62_verification_need(uuid, uuid, text, text) to authenticated;

comment on function public.create_m62_verification_need is 'M6.2: creates or reuses an exact need from supported versioned matching snapshots, including trajectory-first matching 5.0.0.';
