-- M5 education classification: additive JSON contract, fail-closed writes and metadata-only audit.

begin;

create function private.is_valid_education_classification(payload jsonb, require_current boolean)
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
    elsif require_current and coalesce(item ->> 'source', '') = 'extracted' then
      return false;
    end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.is_valid_education_classification(jsonb, boolean) from public, anon, authenticated;

create function private.is_approved_education_classification(payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1 from jsonb_array_elements(coalesce(payload -> 'education', '[]'::jsonb)) item(value)
    where item.value ? 'classificationReviewed'
      and (jsonb_typeof(item.value -> 'classificationReviewed') <> 'boolean' or item.value -> 'classificationReviewed' <> 'true'::jsonb)
  )
$$;

revoke all on function private.is_approved_education_classification(jsonb) from public, anon, authenticated;

create function private.education_delta_course_identity(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    private.profile_delta_normalize(value),
    '^(pós[- ]?doutorado|doutorado|mestrado|m\.?b\.?a\.?|pós[- ]?graduação|especialização|bacharelado|bacharel|licenciatura|tecnologia|tecnólogo|curso técnico|técnico|postdoctoral|doctorate|doctoral|master(''s)?( degree)?|bachelor(''s)?( degree)?|technical (course|diploma|program))\s+(em|in|of)\s+',
    '', 'i'
  )
$$;

revoke all on function private.education_delta_course_identity(text) from public, anon, authenticated;

create or replace function private.profile_delta_items_match(p_root text, p_left jsonb, p_right jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if nullif(p_left ->> 'id', '') is not null and p_left ->> 'id' = p_right ->> 'id' then return true; end if;
  if p_root = 'experiences' then
    return private.profile_delta_normalize(p_left ->> 'organization') = private.profile_delta_normalize(p_right ->> 'organization')
      and private.profile_delta_normalize(p_left ->> 'role') = private.profile_delta_normalize(p_right ->> 'role')
      and (nullif(private.profile_delta_normalize(p_left ->> 'organization'), '') is not null or nullif(private.profile_delta_normalize(p_left ->> 'role'), '') is not null);
  elsif p_root = 'education' then
    return private.profile_delta_normalize(p_left ->> 'institution') = private.profile_delta_normalize(p_right ->> 'institution')
      and private.education_delta_course_identity(p_left ->> 'course') = private.education_delta_course_identity(p_right ->> 'course')
      and (nullif(private.profile_delta_normalize(p_left ->> 'institution'), '') is not null or nullif(private.education_delta_course_identity(p_left ->> 'course'), '') is not null);
  elsif p_root = 'keyResults' then
    return private.profile_delta_normalize(p_left ->> 'value') = private.profile_delta_normalize(p_right ->> 'value');
  elsif p_root = 'customSections' then
    return private.profile_delta_normalize(p_left ->> 'name') = private.profile_delta_normalize(p_right ->> 'name');
  end if;
  return false;
end;
$$;

create or replace function private.is_valid_review_field_lifecycle(payload jsonb, require_stable_ids boolean)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(payload) <> 'object' then return false; end if;

  if payload ? 'experiences' then
    if jsonb_typeof(payload -> 'experiences') <> 'array' or jsonb_array_length(payload -> 'experiences') > 200 then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'experiences') loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'source', 'role', 'organization', 'period', 'description', 'evidenceText', 'page', 'startDate', 'endDate']::text[] <> '{}'::jsonb
        or (require_stable_ids and item ?| array['startDate', 'endDate']::text[])
        or (require_stable_ids and not (item ?& array['id', 'source']::text[]))
        or (item ? 'id' and coalesce(item ->> 'id', '') !~ '^experience_[a-z0-9]{8,64}$')
        or (item ? 'source' and coalesce(item ->> 'source', '') not in ('extracted', 'human'))
        or (item ? 'role' and item -> 'role' <> 'null'::jsonb and (jsonb_typeof(item -> 'role') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'role')) not between 1 and 240)))
        or (item ? 'organization' and item -> 'organization' <> 'null'::jsonb and (jsonb_typeof(item -> 'organization') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'organization')) not between 1 and 240)))
        or (item ? 'period' and item -> 'period' <> 'null'::jsonb and (jsonb_typeof(item -> 'period') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'period')) not between 1 and 160)))
        or (item ? 'description' and item -> 'description' <> 'null'::jsonb and (jsonb_typeof(item -> 'description') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'description')) not between 1 and 12000)))
        or (item ? 'evidenceText' and jsonb_typeof(item -> 'evidenceText') <> 'string')
        or (item ? 'page' and item -> 'page' <> 'null'::jsonb and (jsonb_typeof(item -> 'page') <> 'number' or (item ->> 'page')::numeric < 1))
        or (require_stable_ids and nullif(btrim(item ->> 'role'), '') is null and nullif(btrim(item ->> 'organization'), '') is null)
      then return false; end if;
    end loop;
    if exists (select 1 from jsonb_array_elements(payload -> 'experiences') value where value ? 'id' group by value ->> 'id' having count(*) > 1) then return false; end if;
  end if;

  if payload ? 'education' then
    if jsonb_typeof(payload -> 'education') <> 'array' or jsonb_array_length(payload -> 'education') > 200 then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'education') loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'source', 'course', 'institution', 'period', 'description', 'evidenceText', 'page', 'status', 'originalText', 'level', 'qualification', 'classificationOrigin', 'classificationSources', 'classificationReasons', 'classificationMethodVersion', 'classificationReviewed', 'classifierSnapshot']::text[] <> '{}'::jsonb
        or (require_stable_ids and not (item ?& array['id', 'source']::text[]))
        or (item ? 'id' and coalesce(item ->> 'id', '') !~ '^education_[a-z0-9]{8,64}$')
        or (item ? 'source' and coalesce(item ->> 'source', '') not in ('extracted', 'human'))
        or (item ? 'course' and item -> 'course' <> 'null'::jsonb and (jsonb_typeof(item -> 'course') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'course')) not between 1 and 500)))
        or (item ? 'institution' and item -> 'institution' <> 'null'::jsonb and (jsonb_typeof(item -> 'institution') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'institution')) not between 1 and 240)))
        or (item ? 'period' and item -> 'period' <> 'null'::jsonb and (jsonb_typeof(item -> 'period') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'period')) not between 1 and 160)))
        or (item ? 'description' and item -> 'description' <> 'null'::jsonb and (jsonb_typeof(item -> 'description') <> 'string' or (require_stable_ids and char_length(btrim(item ->> 'description')) not between 1 and 12000)))
        or (item ? 'evidenceText' and jsonb_typeof(item -> 'evidenceText') <> 'string')
        or (item ? 'page' and item -> 'page' <> 'null'::jsonb and (jsonb_typeof(item -> 'page') <> 'number' or (item ->> 'page')::numeric < 1))
        or (require_stable_ids and nullif(btrim(item ->> 'course'), '') is null and nullif(btrim(item ->> 'institution'), '') is null)
      then return false; end if;
    end loop;
    if exists (select 1 from jsonb_array_elements(payload -> 'education') value where value ? 'id' group by value ->> 'id' having count(*) > 1) then return false; end if;
    if not private.is_valid_education_classification(payload, require_stable_ids) then return false; end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.enforce_saved_profile_review_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_structured_resume_summary(new.reviewed_data)
    or not private.is_valid_review_field_lifecycle(new.reviewed_data, true)
    or not private.is_valid_education_classification(new.reviewed_data, true)
  then raise exception using errcode = '22023', message = 'reviewed data has an invalid current contract'; end if;
  if nullif(btrim(new.reviewed_data #>> '{identity,fullName}'), '') is null then raise exception using errcode = '23514', message = 'full name is required to save a resume'; end if;
  if nullif(btrim(new.reviewed_data #>> '{contact,phone}'), '') is null
    and nullif(btrim(new.reviewed_data #>> '{contact,email}'), '') is null
    and not exists (
      select 1 from public.person_private_data private_data
      where private_data.organization_id = new.organization_id and private_data.person_id = new.person_id
        and coalesce(nullif(btrim(private_data.phone_e164), ''), nullif(btrim(private_data.phone_national_number), ''), nullif(btrim(private_data.phone), ''), nullif(btrim(private_data.email), '')) is not null
    )
  then raise exception using errcode = '23514', message = 'phone or email is required to save a resume'; end if;
  if not private.has_material_professional_information(new.reviewed_data) then raise exception using errcode = '23514', message = 'material professional information is required to save a resume'; end if;
  return new;
end;
$$;

create or replace function private.enforce_new_extraction_field_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_review_field_lifecycle(new.identified_fields, true)
    or not private.is_valid_education_classification(new.identified_fields, true)
  then raise exception using errcode = '22023', message = 'extraction draft has an invalid current contract'; end if;
  return new;
end;
$$;

alter table public.profile_review_evidence_links
  drop constraint profile_review_evidence_links_field_path_check,
  add constraint profile_review_evidence_links_field_path_check check (
    field_path ~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description|level|qualification|status|classificationOrigin))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
  );

create function private.audit_education_classification_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item jsonb;
  previous_item jsonb;
  dimensions text[];
begin
  if old.reviewed_data -> 'education' is not distinct from new.reviewed_data -> 'education' then return new; end if;
  for current_item in select value from jsonb_array_elements(coalesce(new.reviewed_data -> 'education', '[]'::jsonb)) loop
    select value into previous_item from jsonb_array_elements(coalesce(old.reviewed_data -> 'education', '[]'::jsonb)) item(value)
    where item.value ->> 'id' = current_item ->> 'id' limit 1;
    dimensions := array[]::text[];
    if previous_item is null then dimensions := array['record'];
    else
      if previous_item -> 'level' is distinct from current_item -> 'level' then dimensions := array_append(dimensions, 'level'); end if;
      if previous_item -> 'qualification' is distinct from current_item -> 'qualification' then dimensions := array_append(dimensions, 'qualification'); end if;
      if previous_item -> 'status' is distinct from current_item -> 'status' then dimensions := array_append(dimensions, 'status'); end if;
      if previous_item -> 'classificationOrigin' is distinct from current_item -> 'classificationOrigin' then dimensions := array_append(dimensions, 'origin'); end if;
      if previous_item -> 'classificationReviewed' is distinct from current_item -> 'classificationReviewed' then dimensions := array_append(dimensions, 'review'); end if;
    end if;
    if cardinality(dimensions) > 0 then
      insert into public.person_ingestion_events (
        organization_id, person_id, document_id, processing_attempt_id, actor_auth_user_id, event_type, result, metadata
      ) values (
        new.organization_id, new.person_id, new.document_id, new.processing_attempt_id, auth.uid(),
        case when (current_item ->> 'classificationReviewed')::boolean then 'education_classification_confirmed' else 'education_classification_changed' end,
        'success', jsonb_build_object(
          'review_id', new.id,
          'education_id', current_item ->> 'id',
          'changed_dimensions', to_jsonb(dimensions),
          'classification_origin', current_item ->> 'classificationOrigin',
          'classification_method_version', current_item ->> 'classificationMethodVersion',
          'classification_reviewed', (current_item ->> 'classificationReviewed')::boolean
        )
      );
    end if;
    previous_item := null;
  end loop;
  return new;
end;
$$;

revoke all on function private.audit_education_classification_change() from public, anon, authenticated;
create trigger profile_reviews_audit_education_classification
after update of reviewed_data on public.profile_reviews
for each row execute function private.audit_education_classification_change();

create function private.enforce_approved_education_classification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_education_classification(new.profile_data, false)
    or not private.is_approved_education_classification(new.profile_data)
  then raise exception using errcode = '22023', message = 'profile contains an unreviewed academic classification'; end if;
  return new;
end;
$$;

revoke all on function private.enforce_approved_education_classification() from public, anon, authenticated;
create trigger professional_profiles_enforce_education_classification
before insert or update of profile_data on public.professional_profiles
for each row execute function private.enforce_approved_education_classification();

comment on function private.is_valid_education_classification(jsonb, boolean) is
  'Validates the versioned M5 academic classification embedded in the canonical education array. Historical payloads remain readable; current writes fail closed.';

create or replace function public.persist_person_extraction(
  p_organization_id uuid, p_person_id uuid, p_document_id uuid, p_pages jsonb, p_draft jsonb,
  p_pages_native integer, p_pages_ocr integer, p_native_extraction_version text, p_ocr_version text,
  p_structuring_version text, p_draft_version text, p_idempotency_key text, p_retry_of_attempt_id uuid default null
)
returns table (processing_attempt_id uuid, structured boolean, attempt_number integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  result record;
begin
  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_typeof(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) <> 'array'
  ) then raise exception using errcode = '22023', message = 'layout blocks and field evidence must be arrays'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_pages) page(value)
    where jsonb_array_length(coalesce(page.value -> 'layout_blocks', '[]'::jsonb)) > 10000
       or jsonb_array_length(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) > 1000
  ) then raise exception using errcode = '22023', message = 'adaptive extraction payload exceeds safe limits'; end if;
  if exists (
    select 1
    from jsonb_array_elements(p_pages) page(value)
    cross join lateral jsonb_array_elements(coalesce(page.value -> 'field_evidence', '[]'::jsonb)) descriptor(value)
    where (descriptor.value ->> 'fieldPath') is null
       or (descriptor.value ->> 'fieldPath') !~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description|level|qualification|status|classificationOrigin))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
       or ((descriptor.value ->> 'x') is not null and page.value ->> 'origin' <> 'native_pdf')
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'y') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'width') is null)
       or ((descriptor.value ->> 'x') is null) <> ((descriptor.value ->> 'height') is null)
       or ((descriptor.value ->> 'x') is not null and (
         jsonb_typeof(descriptor.value -> 'x') <> 'number' or jsonb_typeof(descriptor.value -> 'y') <> 'number'
         or jsonb_typeof(descriptor.value -> 'width') <> 'number' or jsonb_typeof(descriptor.value -> 'height') <> 'number'
         or (descriptor.value ->> 'x')::double precision < 0 or (descriptor.value ->> 'y')::double precision < 0
         or (descriptor.value ->> 'width')::double precision <= 0 or (descriptor.value ->> 'height')::double precision <= 0
         or (descriptor.value ->> 'x')::double precision + (descriptor.value ->> 'width')::double precision > 1
         or (descriptor.value ->> 'y')::double precision + (descriptor.value ->> 'height')::double precision > 1
       ))
  ) then raise exception using errcode = '22023', message = 'adaptive field evidence is invalid'; end if;
  if not private.is_valid_education_classification(p_draft, true) then
    raise exception using errcode = '22023', message = 'education classification contract is invalid';
  end if;
  select * into result from private.persist_person_extraction(
    p_organization_id, p_person_id, p_document_id, p_pages, p_draft,
    p_pages_native, p_pages_ocr, p_native_extraction_version, p_ocr_version,
    p_structuring_version, p_draft_version, p_idempotency_key, p_retry_of_attempt_id
  );
  update public.document_page_extractions page
  set layout_blocks = coalesce(payload.value -> 'layout_blocks', '[]'::jsonb), field_evidence = coalesce(payload.value -> 'field_evidence', '[]'::jsonb)
  from jsonb_array_elements(p_pages) payload(value)
  where page.organization_id = p_organization_id and page.processing_attempt_id = result.processing_attempt_id
    and page.page_number = (payload.value ->> 'page_number')::integer;
  return query select result.processing_attempt_id, result.structured, result.attempt_number, result.reused;
end;
$$;

revoke all on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.persist_person_extraction(uuid, uuid, uuid, jsonb, jsonb, integer, integer, text, text, text, text, text, uuid) to authenticated;

commit;
