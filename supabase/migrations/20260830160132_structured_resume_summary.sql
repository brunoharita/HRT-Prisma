-- Structured resume summary: explicit review fields, private canonical contact data,
-- evidence-safe field paths, and prevention of contact PII in professional profiles.

alter table public.person_private_data
  add column state_code text,
  add column linkedin_url text,
  add constraint person_private_data_state_code_check
    check (state_code is null or char_length(btrim(state_code)) between 2 and 80),
  add constraint person_private_data_linkedin_url_check
    check (
      linkedin_url is null
      or linkedin_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/in/[a-z0-9%_.-]+/?$'
    );

create function private.is_valid_structured_resume_summary(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  identity_payload jsonb;
  contact_payload jsonb;
  item jsonb;
  property record;
begin
  if jsonb_typeof(payload) <> 'object' then return false; end if;

  if payload ? 'identity' then
    identity_payload := payload -> 'identity';
    if jsonb_typeof(identity_payload) <> 'object'
      or identity_payload - array['fullName']::text[] <> '{}'::jsonb
    then return false; end if;
    if identity_payload ? 'fullName'
      and identity_payload -> 'fullName' <> 'null'::jsonb
      and (
        jsonb_typeof(identity_payload -> 'fullName') <> 'string'
        or char_length(btrim(identity_payload ->> 'fullName')) not between 2 and 160
      )
    then return false; end if;
  end if;

  if payload ? 'contact' then
    contact_payload := payload -> 'contact';
    if jsonb_typeof(contact_payload) <> 'object'
      or contact_payload - array['city', 'state', 'phone', 'email', 'linkedin']::text[] <> '{}'::jsonb
    then return false; end if;
    for property in select key, value from jsonb_each(contact_payload)
    loop
      if property.value <> 'null'::jsonb and jsonb_typeof(property.value) <> 'string' then return false; end if;
      if property.value <> 'null'::jsonb and (
        (property.key = 'city' and char_length(btrim(property.value #>> '{}')) not between 1 and 120)
        or (property.key = 'state' and char_length(btrim(property.value #>> '{}')) not between 2 and 80)
        or (property.key = 'phone' and char_length(btrim(property.value #>> '{}')) not between 5 and 40)
        or (property.key = 'email' and (
          char_length(btrim(property.value #>> '{}')) > 320
          or btrim(property.value #>> '{}') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ))
        or (property.key = 'linkedin' and (
          char_length(btrim(property.value #>> '{}')) > 500
          or btrim(property.value #>> '{}') !~* '^https://([a-z0-9-]+\.)?linkedin\.com/in/[a-z0-9%_.-]+/?$'
        ))
      ) then return false; end if;
    end loop;
  end if;

  if payload ? 'professionalTitle' and payload -> 'professionalTitle' <> 'null'::jsonb
    and (jsonb_typeof(payload -> 'professionalTitle') <> 'string'
      or char_length(btrim(payload ->> 'professionalTitle')) not between 1 and 240)
  then return false; end if;
  if payload ? 'professionalObjective' and payload -> 'professionalObjective' <> 'null'::jsonb
    and (jsonb_typeof(payload -> 'professionalObjective') <> 'string'
      or char_length(btrim(payload ->> 'professionalObjective')) not between 1 and 4000)
  then return false; end if;
  if payload ? 'summary' and payload -> 'summary' <> 'null'::jsonb
    and (jsonb_typeof(payload -> 'summary') <> 'string'
      or char_length(btrim(payload ->> 'summary')) not between 1 and 12000)
  then return false; end if;

  if payload ? 'areasOfExpertise' then
    if jsonb_typeof(payload -> 'areasOfExpertise') <> 'array'
      or jsonb_array_length(payload -> 'areasOfExpertise') > 30
    then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'areasOfExpertise')
    loop
      if jsonb_typeof(item) <> 'string'
        or char_length(btrim(item #>> '{}')) not between 1 and 120
      then return false; end if;
    end loop;
    if exists (
      select 1 from jsonb_array_elements_text(payload -> 'areasOfExpertise') value
      group by lower(btrim(value)) having count(*) > 1
    ) then return false; end if;
  end if;

  if payload ? 'keyResults' then
    if jsonb_typeof(payload -> 'keyResults') <> 'array'
      or jsonb_array_length(payload -> 'keyResults') > 50
    then return false; end if;
    for item in select value from jsonb_array_elements(payload -> 'keyResults')
    loop
      if jsonb_typeof(item) <> 'object'
        or item - array['id', 'value']::text[] <> '{}'::jsonb
        or not (item ?& array['id', 'value']::text[])
        or coalesce(item ->> 'id', '') !~ '^result_[a-z0-9]{8,64}$'
        or jsonb_typeof(item -> 'value') <> 'string'
        or char_length(btrim(item ->> 'value')) not between 1 and 4000
      then return false; end if;
    end loop;
    if exists (
      select 1 from jsonb_array_elements(payload -> 'keyResults') value
      group by value ->> 'id' having count(*) > 1
    ) then return false; end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

revoke all on function private.is_valid_structured_resume_summary(jsonb) from public, anon, authenticated;

alter table public.extraction_drafts
  add constraint extraction_drafts_structured_summary_shape_check
  check (private.is_valid_structured_resume_summary(identified_fields)) not valid;
alter table public.extraction_drafts validate constraint extraction_drafts_structured_summary_shape_check;

alter table public.profile_reviews
  add constraint profile_reviews_extracted_structured_summary_shape_check
    check (private.is_valid_structured_resume_summary(extracted_data)) not valid,
  add constraint profile_reviews_reviewed_structured_summary_shape_check
    check (private.is_valid_structured_resume_summary(reviewed_data)) not valid;
alter table public.profile_reviews validate constraint profile_reviews_extracted_structured_summary_shape_check;
alter table public.profile_reviews validate constraint profile_reviews_reviewed_structured_summary_shape_check;

alter table public.profile_review_revisions
  add constraint profile_review_revisions_structured_summary_shape_check
  check (private.is_valid_structured_resume_summary(reviewed_data)) not valid;
alter table public.profile_review_revisions validate constraint profile_review_revisions_structured_summary_shape_check;

alter table public.professional_profiles
  add constraint professional_profiles_structured_summary_shape_check
  check (
    not (profile_data ?| array['identity', 'contact']::text[])
    and private.is_valid_structured_resume_summary(profile_data)
  ) not valid;
alter table public.professional_profiles validate constraint professional_profiles_structured_summary_shape_check;

alter table public.profile_review_changes
  drop constraint profile_review_changes_field_path_check,
  add constraint profile_review_changes_field_path_check check (field_path in (
    'identity', 'contact', 'professionalTitle', 'areasOfExpertise',
    'professionalObjective', 'summary', 'keyResults', 'experiences', 'education',
    'certifications', 'languages', 'competencies', 'customSections',
    'uncertainties', 'notIdentified'
  ));

alter table public.profile_review_evidence_links
  drop constraint profile_review_evidence_links_field_path_check,
  add constraint profile_review_evidence_links_field_path_check check (
    field_path ~ '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$'
  );

do $$
declare
  function_oid oid;
  function_definition text;
  old_review_path_pattern text := '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$';
  old_extraction_path_pattern text := '^(summary|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?)$';
  new_path_pattern text := '^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|uncertainties|notIdentified|experiences\.[0-9]+(\.(role|organization|period|description))?|education\.[0-9]+(\.(course|institution|period|description))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.items\.[a-z0-9][a-z0-9_-]{7,79}\.value)$';
  old_fields text := '''languages'', ''competencies'', ''customSections'', ''uncertainties'', ''notIdentified''';
  new_fields text := '''languages'', ''competencies'', ''customSections'', ''identity'', ''contact'', ''professionalTitle'', ''areasOfExpertise'', ''professionalObjective'', ''keyResults'', ''uncertainties'', ''notIdentified''';
begin
  function_oid := to_regprocedure(
    'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)'
  );
  if function_oid is null then raise exception 'private record evidence function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_path_pattern in function_definition) = 0 then
    if position(old_review_path_pattern in function_definition) = 0 then raise exception 'private record evidence field path contract has an unexpected shape'; end if;
    function_definition := replace(function_definition, old_review_path_pattern, new_path_pattern);
  end if;
  if position(new_fields in function_definition) = 0 then
    if position(old_fields in function_definition) = 0 then raise exception 'private record evidence review field loop has an unexpected shape'; end if;
    function_definition := replace(function_definition, old_fields, new_fields);
  end if;
  execute function_definition;

  function_oid := to_regprocedure('public.save_profile_review(uuid,uuid,integer,jsonb,text,text)');
  if function_oid is null then raise exception 'save review function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_fields in function_definition) = 0 then
    if position(old_fields in function_definition) = 0 then raise exception 'save review field loop has an unexpected shape'; end if;
    execute replace(function_definition, old_fields, new_fields);
  end if;

  function_oid := to_regprocedure('public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid)');
  if function_oid is null then raise exception 'persist extraction function was not found'; end if;
  function_definition := pg_get_functiondef(function_oid);
  if position(new_path_pattern in function_definition) = 0 then
    if position(old_extraction_path_pattern in function_definition) = 0 then raise exception 'persist extraction field path contract has an unexpected shape'; end if;
    execute replace(function_definition, old_extraction_path_pattern, new_path_pattern);
  end if;
end;
$$;

create or replace function public.approve_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_idempotency_key text
)
returns table (review_id uuid, profile_id uuid, profile_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  review public.profile_reviews;
  operation public.document_operations;
  current_profile_id uuid;
  current_profile_version integer;
  latest_attempt_id uuid;
  new_profile_id uuid;
  next_profile_version integer;
  fingerprint text;
  profile_payload jsonb;
  identity_payload jsonb;
  contact_payload jsonb;
  reviewed_name text;
  reviewed_city text;
  reviewed_state text;
  reviewed_phone text;
  reviewed_email text;
  reviewed_linkedin text;
  normalized_phone_digits text;
  normalized_phone_e164 text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into review from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  fingerprint := pg_catalog.encode(extensions.digest(concat_ws('|', p_review_id::text, p_expected_lock_version::text), 'sha256'), 'hex');
  operation := private.claim_document_operation(
    p_organization_id, review.person_id, review.document_id, 'approve_review',
    p_idempotency_key, fingerprint, actor_id
  );
  if operation.status = 'completed' and operation.profile_id is not null then
    return query select review.id, profile.id, profile.profile_version, true
    from public.professional_profiles profile
    where profile.organization_id = p_organization_id and profile.id = operation.profile_id;
    return;
  end if;
  if review.state <> 'draft' then raise exception using errcode = '55000', message = 'review is no longer approvable'; end if;
  if review.lock_version <> p_expected_lock_version then
    raise exception using errcode = 'P0001', message = 'review_conflict';
  end if;
  if not private.is_valid_structured_resume_summary(review.reviewed_data) then
    raise exception using errcode = '22023', message = 'structured resume summary is invalid';
  end if;

  perform 1 from public.people person
  where person.organization_id = p_organization_id and person.id = review.person_id
  for update;

  identity_payload := coalesce(review.reviewed_data -> 'identity', '{}'::jsonb);
  contact_payload := coalesce(review.reviewed_data -> 'contact', '{}'::jsonb);
  profile_payload := review.reviewed_data - 'identity' - 'contact';
  reviewed_name := nullif(btrim(identity_payload ->> 'fullName'), '');
  reviewed_city := nullif(btrim(contact_payload ->> 'city'), '');
  reviewed_state := nullif(btrim(contact_payload ->> 'state'), '');
  reviewed_phone := nullif(btrim(contact_payload ->> 'phone'), '');
  reviewed_email := nullif(lower(btrim(contact_payload ->> 'email')), '');
  reviewed_linkedin := nullif(btrim(contact_payload ->> 'linkedin'), '');

  if reviewed_phone is not null then
    normalized_phone_digits := regexp_replace(reviewed_phone, '[^0-9]', '', 'g');
    if char_length(normalized_phone_digits) in (10, 11) then
      normalized_phone_digits := '55' || normalized_phone_digits;
    elsif char_length(normalized_phone_digits) not between 12 and 15 then
      raise exception using errcode = '22023', message = 'reviewed phone is invalid';
    end if;
    normalized_phone_e164 := '+' || normalized_phone_digits;
  end if;

  if reviewed_name is not null then
    update public.people
    set full_name = reviewed_name, updated_at = now()
    where organization_id = p_organization_id and id = review.person_id;
  end if;

  if reviewed_city is not null or reviewed_state is not null or reviewed_phone is not null
    or reviewed_email is not null or reviewed_linkedin is not null
  then
    insert into public.person_private_data (
      organization_id, person_id, email, phone, location, phone_e164,
      phone_country_iso2, phone_country_label, phone_country_code,
      phone_national_number, city, state_code, linkedin_url
    ) values (
      p_organization_id, review.person_id, reviewed_email, reviewed_phone,
      nullif(concat_ws(', ', reviewed_city, reviewed_state), ''), normalized_phone_e164,
      case when normalized_phone_digits like '55%' then 'BR' end,
      case when normalized_phone_digits like '55%' then 'Brasil' end,
      case when normalized_phone_digits like '55%' then '55' end,
      case when normalized_phone_digits like '55%' then substring(normalized_phone_digits from 3) end,
      reviewed_city, reviewed_state, reviewed_linkedin
    )
    on conflict (organization_id, person_id) do update set
      email = coalesce(excluded.email, public.person_private_data.email),
      phone = coalesce(excluded.phone, public.person_private_data.phone),
      phone_e164 = coalesce(excluded.phone_e164, public.person_private_data.phone_e164),
      phone_country_iso2 = case when excluded.phone is not null then excluded.phone_country_iso2 else public.person_private_data.phone_country_iso2 end,
      phone_country_label = case when excluded.phone is not null then excluded.phone_country_label else public.person_private_data.phone_country_label end,
      phone_country_code = case when excluded.phone is not null then excluded.phone_country_code else public.person_private_data.phone_country_code end,
      phone_national_number = case when excluded.phone is not null then excluded.phone_national_number else public.person_private_data.phone_national_number end,
      city = coalesce(excluded.city, public.person_private_data.city),
      state_code = coalesce(excluded.state_code, public.person_private_data.state_code),
      location = case
        when excluded.city is not null or excluded.state_code is not null
          then concat_ws(', ', coalesce(excluded.city, public.person_private_data.city), coalesce(excluded.state_code, public.person_private_data.state_code))
        else public.person_private_data.location
      end,
      linkedin_url = coalesce(excluded.linkedin_url, public.person_private_data.linkedin_url),
      updated_at = now();
  end if;

  select profile.id, profile.profile_version into current_profile_id, current_profile_version
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id and profile.person_id = review.person_id
    and profile.superseded_at is null
  for update;
  if current_profile_id is distinct from review.base_profile_id
    or current_profile_version is distinct from review.base_profile_version then
    raise exception using errcode = 'P0001', message = 'profile_base_conflict';
  end if;

  select attempt.id into latest_attempt_id
  from public.document_processing_attempts attempt
  where attempt.organization_id = p_organization_id and attempt.document_id = review.document_id
  order by attempt.attempt_number desc limit 1;
  if latest_attempt_id is distinct from review.processing_attempt_id then
    raise exception using errcode = 'P0001', message = 'processing_base_conflict';
  end if;

  if not exists (
    select 1 from public.evidence evidence
    where evidence.organization_id = p_organization_id
      and evidence.processing_attempt_id = review.processing_attempt_id
  ) then
    raise exception using errcode = '23514', message = 'material evidence is required before approval';
  end if;

  select coalesce(max(profile.profile_version), 0) + 1 into next_profile_version
  from public.professional_profiles profile
  where profile.organization_id = p_organization_id and profile.person_id = review.person_id;

  update public.professional_profiles
  set superseded_at = now()
  where organization_id = p_organization_id and person_id = review.person_id and superseded_at is null;

  insert into public.professional_profiles (
    organization_id, person_id, source_document_id, profile_data,
    uncertainties, not_identified, extraction_version, inference_version,
    embedding_version, prompt_version, model_version, processing_attempt_id,
    profile_version, review_status, review_id, approved_by_auth_user_id,
    approved_at, base_profile_id
  ) values (
    p_organization_id, review.person_id, review.document_id, profile_payload,
    coalesce(profile_payload -> 'uncertainties', '[]'::jsonb),
    coalesce(profile_payload -> 'notIdentified', '[]'::jsonb),
    'm2c-reviewed-v2', 'none', 'none', 'none', 'human-reviewed-deterministic',
    review.processing_attempt_id, next_profile_version, 'approved', review.id,
    actor_id, now(), review.base_profile_id
  ) returning id into new_profile_id;

  update public.profile_reviews
  set state = 'approved', approved_profile_id = new_profile_id,
      approved_by_auth_user_id = actor_id, approved_at = now(),
      last_edited_by_auth_user_id = actor_id
  where organization_id = p_organization_id and id = p_review_id;

  update public.document_processing_attempts
  set state = 'completed', current_method = 'human_review_approved', completed_at = now()
  where organization_id = p_organization_id and id = review.processing_attempt_id;
  update public.documents
  set status = 'approved', review_state = 'approved', processed_at = now(),
      failure_category = null, failure_reason = null, failure_technical_message = null
  where organization_id = p_organization_id and id = review.document_id;
  update public.people set profile_state = 'generated', updated_at = now()
  where organization_id = p_organization_id and id = review.person_id;

  update public.document_operations
  set review_id = p_review_id, profile_id = new_profile_id, status = 'completed',
      result = jsonb_build_object('review_id', p_review_id, 'profile_id', new_profile_id, 'profile_version', next_profile_version),
      completed_at = now()
  where id = operation.id;

  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, processing_attempt_id,
    actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
    actor_id, 'profile_review_approved', 'success',
    jsonb_build_object('operation_id', operation.id, 'review_id', p_review_id,
      'profile_id', new_profile_id, 'profile_version', next_profile_version,
      'private_contact_updated', reviewed_city is not null or reviewed_state is not null
        or reviewed_phone is not null or reviewed_email is not null or reviewed_linkedin is not null)
  );
  return query select p_review_id, new_profile_id, next_profile_version, false;
end;
$$;

revoke all on function public.approve_profile_review(uuid, uuid, integer, text) from public, anon;
grant execute on function public.approve_profile_review(uuid, uuid, integer, text) to authenticated;
