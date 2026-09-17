begin;

do $qa$
declare
  legacy_base jsonb := '{"education":[{"course":"MBA em Gestão","institution":"USC","period":"2019 - 2020","evidenceText":"MBA em Gestão","page":1}],"experiences":[{"role":"Diretor","organization":"HRT","period":"2025 - Atual","evidenceText":"Diretor, HRT","page":1}],"keyResults":[]}'::jsonb;
  current_proposal jsonb := '{"identity":{"fullName":"Pessoa QA"},"contact":{"city":null,"state":null,"phone":null,"email":"qa@example.com","linkedin":null},"professionalTitle":"Diretor","areasOfExpertise":[],"professionalObjective":null,"summary":null,"keyResults":[],"experiences":[],"education":[],"certifications":[],"languages":[],"competencies":[],"customSections":[],"uncertainties":[],"notIdentified":[]}'::jsonb;
  merged jsonb;
  normalized jsonb;
  proposal_legacy jsonb;
  nullable_course_item jsonb := '{"id":"education_12345678","source":"extracted","course":null,"institution":"Instituição sintética","period":"2026 - 2027","description":null,"evidenceText":"Instituição sintética","page":2,"originalText":"Instituição sintética","level":"unknown","qualification":"unknown","status":"in_progress","classificationOrigin":"human","classificationSources":{"level":"human","qualification":"human","status":"human"},"classificationReasons":["synthetic_nullable_course_regression"],"classificationMethodVersion":"education-classification-1.0.0","classificationReviewed":true,"classifierSnapshot":{"course":null,"level":"unknown","qualification":"unknown","status":"in_progress","classificationOrigin":"human","classificationSources":{"level":"human","qualification":"human","status":"human"},"classificationReasons":["synthetic_nullable_course_regression"],"classificationMethodVersion":"education-classification-1.0.0"}}'::jsonb;
  nullable_course_normalized jsonb;
  feedback_detail text;
begin
  merged := private.merge_profile_publication_delta(legacy_base, current_proposal - 'identity' - 'contact', '[]'::jsonb);
  merged := jsonb_build_object('identity', current_proposal -> 'identity', 'contact', current_proposal -> 'contact') || merged;
  normalized := private.normalize_profile_review_contract(merged, current_proposal);

  if normalized #>> '{education,0,level}' <> 'unknown'
    or normalized #>> '{education,0,qualification}' <> 'unknown'
    or normalized #>> '{education,0,status}' <> 'unknown'
    or normalized #> '{education,0,classificationReviewed}' <> 'true'::jsonb
    or normalized #>> '{education,0,classificationReasons,0}' <> 'historical_profile_approved_before_academic_classification'
  then raise exception 'historical approved education was not preserved as reviewed unknown data'; end if;
  if coalesce(normalized #>> '{education,0,id}', '') !~ '^education_[a-z0-9]{8,64}$'
    or coalesce(normalized #>> '{experiences,0,id}', '') !~ '^experience_[a-z0-9]{8,64}$'
  then raise exception 'historical entity did not receive a stable id'; end if;
  if not private.is_valid_review_field_lifecycle(normalized, true)
    or not private.is_valid_education_classification(normalized, true)
  then raise exception 'normalized publication payload does not satisfy the current contract'; end if;

  proposal_legacy := current_proposal || jsonb_build_object('education', legacy_base -> 'education');
  normalized := private.normalize_profile_review_contract(proposal_legacy, proposal_legacy);
  if normalized #> '{education,0,classificationReviewed}' <> 'false'::jsonb
    or normalized #>> '{education,0,classificationReasons,0}' <> 'historical_review_requires_academic_confirmation'
  then raise exception 'a proposal-only legacy education bypassed human confirmation'; end if;

  nullable_course_normalized := private.normalize_profile_review_entity('education', nullable_course_item, 1, false);
  if not (nullable_course_normalized -> 'classifierSnapshot' ? 'course')
    or nullable_course_normalized #> '{classifierSnapshot,course}' is distinct from 'null'::jsonb
    or not private.is_valid_review_field_lifecycle(jsonb_build_object('education', jsonb_build_array(nullable_course_normalized)), true)
    or not private.is_valid_education_classification(jsonb_build_object('education', jsonb_build_array(nullable_course_normalized)), true)
  then raise exception 'nullable classifier snapshot course was not preserved as a valid contract field'; end if;

  begin
    perform private.raise_review_action_required('education_classification_required', 'education.education_12345678.classificationOrigin', 2);
    raise exception 'actionable feedback did not fail closed';
  exception when sqlstate '22023' then
    get stacked diagnostics feedback_detail = pg_exception_detail;
    if feedback_detail::jsonb <> jsonb_build_object(
      'contract', 'operation-feedback-2.0.0',
      'reason', 'education_classification_required',
      'fieldPath', 'education.education_12345678.classificationOrigin',
      'itemNumber', 2
    ) then raise exception 'actionable feedback detail is incomplete'; end if;
  end;
end;
$qa$;

select
  not pg_catalog.has_function_privilege('anon', 'private.normalize_profile_review_contract(jsonb,jsonb)', 'EXECUTE') as anon_normalizer_denied,
  not pg_catalog.has_function_privilege('authenticated', 'private.normalize_profile_review_contract(jsonb,jsonb)', 'EXECUTE') as authenticated_normalizer_denied,
  not pg_catalog.has_function_privilege('anon', 'private.raise_review_action_required(text,text,integer)', 'EXECUTE') as anon_feedback_denied,
  not pg_catalog.has_function_privilege('authenticated', 'private.raise_review_action_required(text,text,integer)', 'EXECUTE') as authenticated_feedback_denied;

rollback;
