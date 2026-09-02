-- Allows an explicitly reviewed historical education record to enter the current
-- lifecycle without fabricating a classifier snapshot that never existed.
-- Also completes spatial-evidence support for the new academic dimensions.

begin;

create or replace function private.is_valid_education_classification(payload jsonb, require_current boolean)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  sources jsonb;
  snapshot jsonb;
  has_classification boolean;
begin
  if jsonb_typeof(payload) <> 'object' then return false; end if;
  if not (payload ? 'education') then return true; end if;
  if jsonb_typeof(payload -> 'education') <> 'array' then return false; end if;

  for item in select value from jsonb_array_elements(payload -> 'education')
  loop
    has_classification := item ?| array[
      'originalText', 'level', 'qualification', 'classificationOrigin', 'classificationSources',
      'classificationReasons', 'classificationMethodVersion', 'classificationReviewed', 'classifierSnapshot'
    ]::text[];
    if not has_classification then
      if require_current then return false; end if;
      continue;
    end if;
    if not (item ?& array[
      'originalText', 'level', 'qualification', 'status', 'classificationOrigin', 'classificationSources',
      'classificationReasons', 'classificationMethodVersion', 'classificationReviewed'
    ]::text[]) then return false; end if;
    if jsonb_typeof(item -> 'originalText') <> 'string'
      or char_length(item ->> 'originalText') > 20000
      or coalesce(item ->> 'level', '') not in ('secondary', 'technical', 'undergraduate', 'postgraduate', 'unknown')
      or coalesce(item ->> 'qualification', '') not in ('technical_course', 'technologist', 'bachelor', 'licentiate', 'specialization', 'mba', 'master', 'doctorate', 'postdoctorate', 'other', 'unknown')
      or coalesce(item ->> 'status', '') not in ('completed', 'in_progress', 'interrupted', 'suspended', 'unknown')
      or coalesce(item ->> 'classificationOrigin', '') not in ('explicit', 'inferred', 'human', 'unknown')
      or jsonb_typeof(item -> 'classificationReviewed') <> 'boolean'
      or jsonb_typeof(item -> 'classificationReasons') <> 'array'
      or jsonb_array_length(item -> 'classificationReasons') not between 1 and 32
      or exists (select 1 from jsonb_array_elements(item -> 'classificationReasons') reason(value) where jsonb_typeof(reason.value) <> 'string' or char_length(reason.value #>> '{}') > 200)
      or jsonb_typeof(item -> 'classificationMethodVersion') <> 'string'
      or char_length(btrim(item ->> 'classificationMethodVersion')) not between 3 and 80
    then return false; end if;

    sources := item -> 'classificationSources';
    if jsonb_typeof(sources) <> 'object'
      or sources - array['level', 'qualification', 'status']::text[] <> '{}'::jsonb
      or not (sources ?& array['level', 'qualification', 'status']::text[])
      or exists (select 1 from jsonb_each_text(sources) source where source.value not in ('explicit', 'inferred', 'human', 'unknown'))
    then return false; end if;

    if not (case item ->> 'level'
      when 'secondary' then (item ->> 'qualification') in ('other', 'unknown')
      when 'technical' then (item ->> 'qualification') in ('technical_course', 'unknown')
      when 'undergraduate' then (item ->> 'qualification') in ('technologist', 'bachelor', 'licentiate', 'other', 'unknown')
      when 'postgraduate' then (item ->> 'qualification') in ('specialization', 'mba', 'master', 'doctorate', 'postdoctorate', 'other', 'unknown')
      when 'unknown' then (item ->> 'qualification') = 'unknown'
      else false end)
    then return false; end if;

    if item ? 'classifierSnapshot' then
      snapshot := item -> 'classifierSnapshot';
      if jsonb_typeof(snapshot) <> 'object'
        or snapshot - array['course', 'level', 'qualification', 'status', 'classificationOrigin', 'classificationSources', 'classificationReasons', 'classificationMethodVersion']::text[] <> '{}'::jsonb
        or not (snapshot ?& array['course', 'level', 'qualification', 'status', 'classificationOrigin', 'classificationSources', 'classificationReasons', 'classificationMethodVersion']::text[])
        or (snapshot -> 'course' <> 'null'::jsonb and jsonb_typeof(snapshot -> 'course') <> 'string')
        or coalesce(snapshot ->> 'level', '') not in ('secondary', 'technical', 'undergraduate', 'postgraduate', 'unknown')
        or coalesce(snapshot ->> 'qualification', '') not in ('technical_course', 'technologist', 'bachelor', 'licentiate', 'specialization', 'mba', 'master', 'doctorate', 'postdoctorate', 'other', 'unknown')
        or coalesce(snapshot ->> 'status', '') not in ('completed', 'in_progress', 'interrupted', 'suspended', 'unknown')
        or coalesce(snapshot ->> 'classificationOrigin', '') not in ('explicit', 'inferred', 'human', 'unknown')
        or jsonb_typeof(snapshot -> 'classificationSources') <> 'object'
        or jsonb_typeof(snapshot -> 'classificationReasons') <> 'array'
        or jsonb_typeof(snapshot -> 'classificationMethodVersion') <> 'string'
      then return false; end if;
    elsif require_current
      and coalesce(item ->> 'source', '') = 'extracted'
      and item ->> 'classificationMethodVersion' <> 'legacy-unclassified'
    then
      return false;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.is_valid_education_classification(jsonb, boolean) from public, anon, authenticated;

create or replace function private.review_field_record_scope(p_field_path text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_field_path ~ '^experiences\.([0-9]+|experience_[a-z0-9]{8,64})\.(role|organization|period|description)$'
      then substring(p_field_path from '^(experiences\.([0-9]+|experience_[a-z0-9]{8,64}))\.')
    when p_field_path ~ '^education\.([0-9]+|education_[a-z0-9]{8,64})\.(course|institution|period|description|level|qualification|status|classificationOrigin)$'
      then substring(p_field_path from '^(education\.([0-9]+|education_[a-z0-9]{8,64}))\.')
    else null
  end;
$$;

revoke all on function private.review_field_record_scope(text) from public, anon, authenticated;

do $$
declare
  function_oid oid;
  function_definition text;
  old_pattern text := '(course|institution|period|description)';
  new_pattern text := '(course|institution|period|description|level|qualification|status|classificationOrigin)';
begin
  function_oid := to_regprocedure('private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)')::oid;
  if function_oid is null then raise exception 'required review evidence function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_pattern in function_definition) = 0 then
    if position(old_pattern in function_definition) = 0 then raise exception 'review evidence path contract has an unexpected shape'; end if;
    execute replace(function_definition, old_pattern, new_pattern);
  end if;
end;
$$;

comment on function private.is_valid_education_classification(jsonb, boolean) is
  'Validates the versioned M5 academic classification. Historical records may enter current review as legacy-unclassified without a fabricated classifier snapshot.';

commit;
