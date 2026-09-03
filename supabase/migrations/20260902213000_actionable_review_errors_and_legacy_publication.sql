-- Makes historical profile data safe to merge into a current review and returns
-- structured, field-addressable feedback for every operator-correctable gate.

begin;

create function private.raise_review_action_required(
  p_reason text,
  p_field_path text default null,
  p_item_number integer default null
)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  raise exception using
    errcode = '22023',
    message = 'prisma_action_required',
    detail = jsonb_build_object(
      'contract', 'operation-feedback-2.0.0',
      'reason', p_reason,
      'fieldPath', p_field_path,
      'itemNumber', p_item_number
    )::text;
end;
$$;

revoke all on function private.raise_review_action_required(text, text, integer) from public, anon, authenticated;

create function private.normalize_profile_review_entity(
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
    return normalized || jsonb_strip_nulls(jsonb_build_object(
      'originalText', p_item -> 'originalText',
      'level', p_item -> 'level',
      'qualification', p_item -> 'qualification',
      'status', p_item -> 'status',
      'classificationOrigin', p_item -> 'classificationOrigin',
      'classificationSources', p_item -> 'classificationSources',
      'classificationReasons', p_item -> 'classificationReasons',
      'classificationMethodVersion', p_item -> 'classificationMethodVersion',
      'classificationReviewed', p_item -> 'classificationReviewed',
      'classifierSnapshot', p_item -> 'classifierSnapshot'
    ));
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

create function private.normalize_profile_review_contract(p_payload jsonb, p_previous_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb := coalesce(p_payload, '{}'::jsonb);
  normalized_array jsonb;
begin
  if jsonb_typeof(result) <> 'object' then return result; end if;

  select coalesce(jsonb_agg(private.normalize_profile_review_entity('experience', row_item.value, row_item.ordinality, false) order by row_item.ordinality), '[]'::jsonb)
  into normalized_array
  from jsonb_array_elements(case when jsonb_typeof(result -> 'experiences') = 'array' then result -> 'experiences' else '[]'::jsonb end) with ordinality row_item(value, ordinality);
  result := jsonb_set(result, '{experiences}', normalized_array, true);

  select coalesce(jsonb_agg(private.normalize_profile_review_entity(
    'education', row_item.value, row_item.ordinality,
    not exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(p_previous_payload -> 'education') = 'array' then p_previous_payload -> 'education' else '[]'::jsonb end) previous_item(value)
      where private.profile_delta_items_match('education', previous_item.value, row_item.value)
    )
  ) order by row_item.ordinality), '[]'::jsonb)
  into normalized_array
  from jsonb_array_elements(case when jsonb_typeof(result -> 'education') = 'array' then result -> 'education' else '[]'::jsonb end) with ordinality row_item(value, ordinality);
  result := jsonb_set(result, '{education}', normalized_array, true);

  select coalesce(jsonb_agg(private.normalize_profile_review_entity('keyResult', row_item.value, row_item.ordinality, false) order by row_item.ordinality), '[]'::jsonb)
  into normalized_array
  from jsonb_array_elements(case when jsonb_typeof(result -> 'keyResults') = 'array' then result -> 'keyResults' else '[]'::jsonb end) with ordinality row_item(value, ordinality);
  result := jsonb_set(result, '{keyResults}', normalized_array, true);
  return result;
end;
$$;

revoke all on function private.normalize_profile_review_contract(jsonb, jsonb) from public, anon, authenticated;

create or replace function private.enforce_saved_profile_review_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reviewed_data := private.normalize_profile_review_contract(new.reviewed_data, old.reviewed_data);
  if not private.is_valid_structured_resume_summary(new.reviewed_data)
    or not private.is_valid_review_field_lifecycle(new.reviewed_data, true)
    or not private.is_valid_education_classification(new.reviewed_data, true)
  then perform private.raise_review_action_required('review_contract_sync_failed'); end if;
  if nullif(btrim(new.reviewed_data #>> '{identity,fullName}'), '') is null
  then perform private.raise_review_action_required('full_name_required', 'identity.fullName'); end if;
  if nullif(btrim(new.reviewed_data #>> '{contact,phone}'), '') is null
    and nullif(btrim(new.reviewed_data #>> '{contact,email}'), '') is null
    and not exists (
      select 1 from public.person_private_data private_data
      where private_data.organization_id = new.organization_id and private_data.person_id = new.person_id
        and coalesce(nullif(btrim(private_data.phone_e164), ''), nullif(btrim(private_data.phone_national_number), ''), nullif(btrim(private_data.phone), ''), nullif(btrim(private_data.email), '')) is not null
    )
  then perform private.raise_review_action_required('contact_required', 'contact.phone'); end if;
  if not private.has_material_professional_information(new.reviewed_data)
  then perform private.raise_review_action_required('professional_information_required', 'professionalTitle'); end if;
  return new;
end;
$$;

create or replace function private.enforce_approved_education_classification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  education_item record;
  field_root text;
begin
  for education_item in
    select value, ordinality::integer as item_number
    from jsonb_array_elements(coalesce(new.profile_data -> 'education', '[]'::jsonb)) with ordinality
  loop
    field_root := 'education.' || case
      when coalesce(education_item.value ->> 'id', '') ~ '^education_[a-z0-9]{8,64}$' then education_item.value ->> 'id'
      else (education_item.item_number - 1)::text
    end;
    if not (case education_item.value ->> 'level'
      when 'secondary' then (education_item.value ->> 'qualification') in ('other', 'unknown')
      when 'technical' then (education_item.value ->> 'qualification') in ('technical_course', 'unknown')
      when 'undergraduate' then (education_item.value ->> 'qualification') in ('technologist', 'bachelor', 'licentiate', 'other', 'unknown')
      when 'postgraduate' then (education_item.value ->> 'qualification') in ('specialization', 'mba', 'master', 'doctorate', 'postdoctorate', 'other', 'unknown')
      when 'unknown' then (education_item.value ->> 'qualification') = 'unknown'
      else false end)
    then perform private.raise_review_action_required('education_qualification_incompatible', field_root || '.qualification', education_item.item_number); end if;
    if education_item.value -> 'classificationReviewed' is distinct from 'true'::jsonb
    then perform private.raise_review_action_required('education_classification_required', field_root || '.classificationOrigin', education_item.item_number); end if;
  end loop;
  if not private.is_valid_education_classification(new.profile_data, false)
  then perform private.raise_review_action_required('review_contract_sync_failed'); end if;
  return new;
end;
$$;

comment on function private.normalize_profile_review_contract(jsonb, jsonb) is
  'Upgrades legacy approved entities at the publication boundary without fabricating academic facts. New or edited legacy education remains subject to human confirmation.';
comment on function private.raise_review_action_required(text, text, integer) is
  'Stable operation-feedback 2.0 envelope. The client translates reason codes into natural language and focuses fieldPath without exposing database details.';

commit;
