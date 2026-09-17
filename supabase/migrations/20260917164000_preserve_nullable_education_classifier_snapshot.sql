-- Preserve contract-required nullable fields inside academic classifier snapshots.
-- The previous normalizer stripped JSON nulls recursively, which removed
-- classifierSnapshot.course from valid institution-only education records.

begin;

create or replace function private.normalize_profile_review_entity(
  p_kind text,
  p_item jsonb,
  p_ordinal bigint,
  p_historical_approved boolean
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  stable_id text;
  normalized jsonb;
  original_text text;
begin
  stable_id := case p_kind
    when 'experience' then case
      when coalesce(p_item ->> 'id', '') ~ '^experience_[a-z0-9]{8,64}$' then p_item ->> 'id'
      else 'experience_legacy' || lpad((p_ordinal - 1)::text, 8, '0')
        || substring(encode(extensions.digest(concat_ws('|', p_item ->> 'role', p_item ->> 'organization', p_item ->> 'period'), 'sha256'), 'hex') from 1 for 12)
    end
    when 'education' then case
      when coalesce(p_item ->> 'id', '') ~ '^education_[a-z0-9]{8,64}$' then p_item ->> 'id'
      else 'education_legacy' || lpad((p_ordinal - 1)::text, 8, '0')
        || substring(encode(extensions.digest(concat_ws('|', p_item ->> 'course', p_item ->> 'institution', p_item ->> 'period'), 'sha256'), 'hex') from 1 for 12)
    end
    when 'keyResult' then case
      when coalesce(p_item ->> 'id', '') ~ '^result_[a-z0-9]{8,64}$' then p_item ->> 'id'
      else 'result_legacy' || lpad((p_ordinal - 1)::text, 8, '0')
        || substring(encode(extensions.digest(coalesce(p_item ->> 'value', p_item #>> '{}', ''), 'sha256'), 'hex') from 1 for 12)
    end
  end;

  if p_kind = 'experience' then
    return jsonb_build_object(
      'id', stable_id,
      'source', case when p_item ->> 'source' = 'human' then 'human' else 'extracted' end,
      'role', case when jsonb_typeof(p_item -> 'role') = 'string' then p_item -> 'role' else 'null'::jsonb end,
      'organization', case when jsonb_typeof(p_item -> 'organization') = 'string' then p_item -> 'organization' else 'null'::jsonb end,
      'period', case when jsonb_typeof(p_item -> 'period') = 'string' then p_item -> 'period' else 'null'::jsonb end,
      'description', case when jsonb_typeof(p_item -> 'description') = 'string' then p_item -> 'description' else 'null'::jsonb end,
      'evidenceText', case when jsonb_typeof(p_item -> 'evidenceText') = 'string' then p_item -> 'evidenceText' else '""'::jsonb end,
      'page', case when jsonb_typeof(p_item -> 'page') = 'number' and (p_item ->> 'page')::numeric >= 1 then p_item -> 'page' else 'null'::jsonb end
    );
  end if;

  if p_kind = 'keyResult' then
    return jsonb_build_object(
      'id', stable_id,
      'value', case when jsonb_typeof(p_item) = 'string' then p_item else to_jsonb(coalesce(p_item ->> 'value', '')) end
    );
  end if;

  normalized := jsonb_build_object(
    'id', stable_id,
    'source', case when p_item ->> 'source' = 'human' then 'human' else 'extracted' end,
    'course', case when jsonb_typeof(p_item -> 'course') = 'string' then p_item -> 'course' else 'null'::jsonb end,
    'institution', case when jsonb_typeof(p_item -> 'institution') = 'string' then p_item -> 'institution' else 'null'::jsonb end,
    'period', case when jsonb_typeof(p_item -> 'period') = 'string' then p_item -> 'period' else 'null'::jsonb end,
    'description', case when jsonb_typeof(p_item -> 'description') = 'string' then p_item -> 'description' else 'null'::jsonb end,
    'evidenceText', case when jsonb_typeof(p_item -> 'evidenceText') = 'string' then p_item -> 'evidenceText' else '""'::jsonb end,
    'page', case when jsonb_typeof(p_item -> 'page') = 'number' and (p_item ->> 'page')::numeric >= 1 then p_item -> 'page' else 'null'::jsonb end
  );

  if private.is_valid_education_classification(jsonb_build_object('education', jsonb_build_array(p_item)), true) then
    return normalized
      || jsonb_strip_nulls(jsonb_build_object(
        'originalText', p_item -> 'originalText',
        'level', p_item -> 'level',
        'qualification', p_item -> 'qualification',
        'status', p_item -> 'status',
        'classificationOrigin', p_item -> 'classificationOrigin',
        'classificationSources', p_item -> 'classificationSources',
        'classificationReasons', p_item -> 'classificationReasons',
        'classificationMethodVersion', p_item -> 'classificationMethodVersion',
        'classificationReviewed', p_item -> 'classificationReviewed'
      ))
      || case
        when p_item ? 'classifierSnapshot'
          then jsonb_build_object('classifierSnapshot', p_item -> 'classifierSnapshot')
        else '{}'::jsonb
      end;
  end if;

  original_text := coalesce(nullif(btrim(p_item ->> 'evidenceText'), ''), nullif(btrim(p_item ->> 'course'), ''), 'Formação histórica sem texto original disponível');
  return normalized || jsonb_build_object(
    'originalText', original_text,
    'level', 'unknown',
    'qualification', 'unknown',
    'status', 'unknown',
    'classificationOrigin', 'unknown',
    'classificationSources', jsonb_build_object('level', 'unknown', 'qualification', 'unknown', 'status', 'unknown'),
    'classificationReasons', jsonb_build_array(case when p_historical_approved then 'historical_profile_approved_before_academic_classification' else 'historical_review_requires_academic_confirmation' end),
    'classificationMethodVersion', 'legacy-unclassified',
    'classificationReviewed', p_historical_approved
  );
end;
$$;

revoke all on function private.normalize_profile_review_entity(text, jsonb, bigint, boolean) from public, anon, authenticated;

do $migration_test$
declare
  source_item jsonb := '{
    "id":"education_12345678",
    "source":"extracted",
    "course":null,
    "institution":"Instituição sintética",
    "period":"2026 - 2027",
    "description":null,
    "evidenceText":"Instituição sintética",
    "page":2,
    "originalText":"Instituição sintética",
    "level":"unknown",
    "qualification":"unknown",
    "status":"in_progress",
    "classificationOrigin":"human",
    "classificationSources":{"level":"human","qualification":"human","status":"human"},
    "classificationReasons":["synthetic_nullable_course_regression"],
    "classificationMethodVersion":"education-classification-1.0.0",
    "classificationReviewed":true,
    "classifierSnapshot":{
      "course":null,
      "level":"unknown",
      "qualification":"unknown",
      "status":"in_progress",
      "classificationOrigin":"human",
      "classificationSources":{"level":"human","qualification":"human","status":"human"},
      "classificationReasons":["synthetic_nullable_course_regression"],
      "classificationMethodVersion":"education-classification-1.0.0"
    }
  }'::jsonb;
  normalized_item jsonb;
begin
  if not private.is_valid_education_classification(
    jsonb_build_object('education', jsonb_build_array(source_item)),
    true
  ) then
    raise exception 'nullable education classifier snapshot fixture is invalid';
  end if;

  normalized_item := private.normalize_profile_review_entity('education', source_item, 1, false);

  if not (normalized_item -> 'classifierSnapshot' ? 'course')
    or normalized_item #> '{classifierSnapshot,course}' is distinct from 'null'::jsonb
  then
    raise exception 'classifier snapshot nullable course was not preserved';
  end if;

  if not private.is_valid_review_field_lifecycle(
      jsonb_build_object('education', jsonb_build_array(normalized_item)),
      true
    )
    or not private.is_valid_education_classification(
      jsonb_build_object('education', jsonb_build_array(normalized_item)),
      true
    )
  then
    raise exception 'normalized nullable education classifier snapshot is invalid';
  end if;
end;
$migration_test$;

comment on function private.normalize_profile_review_entity(text, jsonb, bigint, boolean) is
  'Normalizes review entities while preserving contract-required nullable fields inside valid academic classifier snapshots.';

commit;
