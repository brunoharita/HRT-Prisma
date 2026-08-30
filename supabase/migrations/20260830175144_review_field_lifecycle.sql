-- Stable repeatable-field identity and authoritative review lifecycle validation.
-- Historical index-based payloads remain readable; every newly saved draft uses stable IDs.

create function private.is_valid_review_field_lifecycle(payload jsonb, require_stable_ids boolean)
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
    if jsonb_typeof(payload -> 'experiences') <> 'array'
      or jsonb_array_length(payload -> 'experiences') > 200 then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'experiences')
    loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'source', 'role', 'organization', 'period', 'description', 'evidenceText', 'page', 'startDate', 'endDate']::text[] <> '{}'::jsonb
        or (require_stable_ids and item ?| array['startDate', 'endDate']::text[])
        or (require_stable_ids and not (item ?& array['id', 'source']::text[]))
        or (item ? 'id' and coalesce(item ->> 'id', '') !~ '^experience_[a-z0-9]{8,64}$')
        or (item ? 'source' and coalesce(item ->> 'source', '') not in ('extracted', 'human'))
        or (item ? 'role' and item -> 'role' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'role') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'role')) not between 1 and 240)))
        or (item ? 'organization' and item -> 'organization' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'organization') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'organization')) not between 1 and 240)))
        or (item ? 'period' and item -> 'period' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'period') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'period')) not between 1 and 160)))
        or (item ? 'description' and item -> 'description' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'description') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'description')) not between 1 and 12000)))
        or (item ? 'evidenceText' and jsonb_typeof(item -> 'evidenceText') <> 'string')
        or (item ? 'page' and item -> 'page' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'page') <> 'number' or (item ->> 'page')::numeric < 1))
        or (require_stable_ids and nullif(btrim(item ->> 'role'), '') is null
          and nullif(btrim(item ->> 'organization'), '') is null)
      then return false; end if;
    end loop;
    if exists (
      select 1 from jsonb_array_elements(payload -> 'experiences') value
      where value ? 'id' group by value ->> 'id' having count(*) > 1
    ) then return false; end if;
  end if;

  if payload ? 'education' then
    if jsonb_typeof(payload -> 'education') <> 'array'
      or jsonb_array_length(payload -> 'education') > 200 then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'education')
    loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'source', 'course', 'institution', 'period', 'description', 'evidenceText', 'page', 'status']::text[] <> '{}'::jsonb
        or (require_stable_ids and item ? 'status')
        or (require_stable_ids and not (item ?& array['id', 'source']::text[]))
        or (item ? 'id' and coalesce(item ->> 'id', '') !~ '^education_[a-z0-9]{8,64}$')
        or (item ? 'source' and coalesce(item ->> 'source', '') not in ('extracted', 'human'))
        or (item ? 'course' and item -> 'course' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'course') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'course')) not between 1 and 500)))
        or (item ? 'institution' and item -> 'institution' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'institution') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'institution')) not between 1 and 240)))
        or (item ? 'period' and item -> 'period' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'period') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'period')) not between 1 and 160)))
        or (item ? 'description' and item -> 'description' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'description') <> 'string' or (require_stable_ids
            and char_length(btrim(item ->> 'description')) not between 1 and 12000)))
        or (item ? 'evidenceText' and jsonb_typeof(item -> 'evidenceText') <> 'string')
        or (item ? 'page' and item -> 'page' <> 'null'::jsonb and (
          jsonb_typeof(item -> 'page') <> 'number' or (item ->> 'page')::numeric < 1))
        or (require_stable_ids and nullif(btrim(item ->> 'course'), '') is null
          and nullif(btrim(item ->> 'institution'), '') is null)
      then return false; end if;
    end loop;
    if exists (
      select 1 from jsonb_array_elements(payload -> 'education') value
      where value ? 'id' group by value ->> 'id' having count(*) > 1
    ) then return false; end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

create function private.has_material_professional_information(payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(btrim(payload ->> 'professionalTitle'), ''),
                  nullif(btrim(payload ->> 'professionalObjective'), ''),
                  nullif(btrim(payload ->> 'summary'), '')) is not null
    or jsonb_array_length(coalesce(payload -> 'areasOfExpertise', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'keyResults', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'experiences', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'education', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'competencies', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'languages', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'certifications', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(payload -> 'customSections', '[]'::jsonb)) > 0;
$$;

revoke all on function private.is_valid_review_field_lifecycle(jsonb, boolean) from public, anon, authenticated;
revoke all on function private.has_material_professional_information(jsonb) from public, anon, authenticated;

alter table public.extraction_drafts
  add constraint extraction_drafts_review_field_lifecycle_shape_check
  check (private.is_valid_review_field_lifecycle(identified_fields, false)) not valid;
alter table public.extraction_drafts validate constraint extraction_drafts_review_field_lifecycle_shape_check;

alter table public.profile_reviews
  add constraint profile_reviews_extracted_field_lifecycle_shape_check
    check (private.is_valid_review_field_lifecycle(extracted_data, false)) not valid,
  add constraint profile_reviews_reviewed_field_lifecycle_shape_check
    check (private.is_valid_review_field_lifecycle(reviewed_data, false)) not valid;
alter table public.profile_reviews validate constraint profile_reviews_extracted_field_lifecycle_shape_check;
alter table public.profile_reviews validate constraint profile_reviews_reviewed_field_lifecycle_shape_check;

alter table public.profile_review_revisions
  add constraint profile_review_revisions_field_lifecycle_shape_check
  check (private.is_valid_review_field_lifecycle(reviewed_data, false)) not valid;
alter table public.profile_review_revisions validate constraint profile_review_revisions_field_lifecycle_shape_check;

alter table public.professional_profiles
  add constraint professional_profiles_field_lifecycle_shape_check
  check (private.is_valid_review_field_lifecycle(profile_data, false)) not valid;
alter table public.professional_profiles validate constraint professional_profiles_field_lifecycle_shape_check;

create function private.enforce_saved_profile_review_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_structured_resume_summary(new.reviewed_data)
    or not private.is_valid_review_field_lifecycle(new.reviewed_data, true)
  then raise exception using errcode = '22023', message = 'reviewed data has an invalid field lifecycle contract'; end if;

  if nullif(btrim(new.reviewed_data #>> '{identity,fullName}'), '') is null then
    raise exception using errcode = '23514', message = 'full name is required to save a resume';
  end if;

  if nullif(btrim(new.reviewed_data #>> '{contact,phone}'), '') is null
    and nullif(btrim(new.reviewed_data #>> '{contact,email}'), '') is null
    and not exists (
      select 1 from public.person_private_data private_data
      where private_data.organization_id = new.organization_id
        and private_data.person_id = new.person_id
        and coalesce(nullif(btrim(private_data.phone_e164), ''),
          nullif(btrim(private_data.phone_national_number), ''),
          nullif(btrim(private_data.phone), ''), nullif(btrim(private_data.email), '')) is not null
    )
  then raise exception using errcode = '23514', message = 'phone or email is required to save a resume'; end if;

  if not private.has_material_professional_information(new.reviewed_data) then
    raise exception using errcode = '23514', message = 'material professional information is required to save a resume';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_saved_profile_review_lifecycle() from public, anon, authenticated;

create function private.enforce_new_extraction_field_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_review_field_lifecycle(new.identified_fields, true) then
    raise exception using errcode = '22023', message = 'extraction draft has an invalid field lifecycle contract';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_new_extraction_field_lifecycle() from public, anon, authenticated;
create trigger extraction_drafts_enforce_new_field_lifecycle
before insert or update of identified_fields on public.extraction_drafts
for each row execute function private.enforce_new_extraction_field_lifecycle();

create trigger profile_reviews_enforce_saved_field_lifecycle
before update of reviewed_data on public.profile_reviews
for each row when (old.reviewed_data is distinct from new.reviewed_data)
execute function private.enforce_saved_profile_review_lifecycle();

alter table public.profile_review_evidence_links
  drop constraint profile_review_evidence_links_field_path_check,
  add constraint profile_review_evidence_links_field_path_check check (
    field_path ~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
  );

alter table public.profile_review_adaptation_events
  drop constraint profile_review_adaptation_events_source_field_path_check,
  add constraint profile_review_adaptation_events_source_field_path_check check (
    source_field_path ~ '^experiences\.([0-9]+|experience_[a-z0-9]{8,64})\.(role|organization|period|description)$'
  );

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
    when p_field_path ~ '^education\.([0-9]+|education_[a-z0-9]{8,64})\.(course|institution|period|description)$'
      then substring(p_field_path from '^(education\.([0-9]+|education_[a-z0-9]{8,64}))\.')
    else null
  end;
$$;

revoke all on function private.review_field_record_scope(text) from public, anon, authenticated;

create or replace function private.link_profile_review_original_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_review_evidence_links (
    organization_id, review_id, field_path, evidence_id, link_kind, created_by_auth_user_id
  )
  select new.organization_id, new.id,
    case ranked.kind
      when 'experience' then case
        when coalesce(new.extracted_data -> 'experiences' -> ranked.item_index ->> 'id', '') ~ '^experience_[a-z0-9]{8,64}$'
          then format('experiences.%s', new.extracted_data -> 'experiences' -> ranked.item_index ->> 'id')
        else format('experiences.%s', ranked.item_index) end
      when 'education' then case
        when coalesce(new.extracted_data -> 'education' -> ranked.item_index ->> 'id', '') ~ '^education_[a-z0-9]{8,64}$'
          then format('education.%s', new.extracted_data -> 'education' -> ranked.item_index ->> 'id')
        else format('education.%s', ranked.item_index) end
    end,
    ranked.id, 'original', new.started_by_auth_user_id
  from (
    select evidence.id, evidence.kind,
      (row_number() over (partition by evidence.kind order by evidence.source_page nulls last, evidence.source_block, evidence.id) - 1)::integer as item_index
    from public.evidence evidence
    where evidence.organization_id = new.organization_id
      and evidence.person_id = new.person_id
      and evidence.document_id = new.document_id
      and evidence.processing_attempt_id = new.processing_attempt_id
      and evidence.kind in ('experience', 'education')
  ) ranked
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.link_profile_review_original_evidence() from public, anon, authenticated;

do $$
declare
  function_oid oid;
  function_definition text;
  lifecycle_guard text := $guard$
  if not private.is_valid_review_field_lifecycle(review.reviewed_data, false)
    or not private.has_material_professional_information(review.reviewed_data)
  then raise exception using errcode = '22023', message = 'reviewed data has an invalid field lifecycle contract'; end if;
  if coalesce(nullif(btrim(review.reviewed_data #>> '{identity,fullName}'), ''),
      (select nullif(btrim(person.full_name), '') from public.people person
       where person.organization_id = p_organization_id and person.id = review.person_id)) is null
  then raise exception using errcode = '23514', message = 'full name is required to approve a resume'; end if;
  if nullif(btrim(review.reviewed_data #>> '{contact,phone}'), '') is null
    and nullif(btrim(review.reviewed_data #>> '{contact,email}'), '') is null
    and not exists (
      select 1 from public.person_private_data private_data
      where private_data.organization_id = p_organization_id and private_data.person_id = review.person_id
        and coalesce(nullif(btrim(private_data.phone_e164), ''), nullif(btrim(private_data.phone_national_number), ''),
          nullif(btrim(private_data.phone), ''), nullif(btrim(private_data.email), '')) is not null)
  then raise exception using errcode = '23514', message = 'phone or email is required to approve a resume'; end if;
$guard$;
  summary_guard text := $guard$
  if not private.is_valid_structured_resume_summary(review.reviewed_data) then
    raise exception using errcode = '22023', message = 'structured resume summary is invalid';
  end if;
$guard$;
begin
  foreach function_oid in array array[
    to_regprocedure('private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)')::oid,
    to_regprocedure('public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid)')::oid,
    to_regprocedure('public.apply_profile_review_adaptive_suggestions(uuid,uuid,integer,jsonb,text,text,text,jsonb,text,text)')::oid
  ] loop
    if function_oid is null then raise exception 'required review function was not found'; end if;
    function_definition := pg_get_functiondef(function_oid);
    function_definition := replace(function_definition,
      'experiences\.[0-9]+', 'experiences\.([0-9]+|experience_[a-z0-9]{8,64})');
    function_definition := replace(function_definition,
      'education\.[0-9]+', 'education\.([0-9]+|education_[a-z0-9]{8,64})');
    execute function_definition;
  end loop;

  function_oid := to_regprocedure('public.approve_profile_review(uuid,uuid,integer,text)');
  if function_oid is null then raise exception 'approve review function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(lifecycle_guard in function_definition) = 0 then
    if position(summary_guard in function_definition) = 0 then raise exception 'approve review validation contract has an unexpected shape'; end if;
    execute replace(function_definition, summary_guard, summary_guard || lifecycle_guard);
  end if;
end;
$$;
