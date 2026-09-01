-- Canonical publication delta: omission preserves approved knowledge and only an
-- explicit, justified decision may remove an approved item.

create table public.profile_publication_removals (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  person_id uuid not null,
  review_id uuid not null,
  approved_profile_id uuid not null,
  field_path text not null,
  previous_value jsonb,
  reason text not null,
  actor_auth_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint profile_publication_removals_review_fk
    foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id),
  constraint profile_publication_removals_person_fk
    foreign key (organization_id, person_id)
    references public.people(organization_id, id),
  constraint profile_publication_removals_profile_fk
    foreign key (organization_id, approved_profile_id)
    references public.professional_profiles(organization_id, id),
  constraint profile_publication_removals_reason_check
    check (char_length(btrim(reason)) >= 5),
  constraint profile_publication_removals_path_check
    check (
      field_path in ('professionalTitle', 'professionalObjective', 'summary')
      or field_path ~ '^(areasOfExpertise|competencies|languages|certifications|experiences|education|keyResults|customSections)::[^:]+$'
    ),
  constraint profile_publication_removals_unique unique (organization_id, review_id, field_path)
);

create index profile_publication_removals_person_idx
  on public.profile_publication_removals (organization_id, person_id, created_at desc);
create index profile_publication_removals_profile_idx
  on public.profile_publication_removals (organization_id, approved_profile_id);

alter table public.profile_publication_removals enable row level security;
create policy profile_publication_removals_select
  on public.profile_publication_removals
  for select
  to authenticated
  using ((select private.has_org_role(
    organization_id,
    array['super_admin', 'owner', 'admin', 'recruiter']::public.membership_role[]
  )));

grant select on public.profile_publication_removals to authenticated;
revoke insert, update, delete on public.profile_publication_removals from public, anon, authenticated;

create or replace function private.profile_delta_normalize(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g'))
$$;

create or replace function private.profile_delta_has_removal(p_removals jsonb, p_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_removals, '[]'::jsonb)) item
    where item ->> 'fieldPath' = p_path
  )
$$;

create or replace function private.profile_delta_items_match(p_root text, p_left jsonb, p_right jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if nullif(p_left ->> 'id', '') is not null and p_left ->> 'id' = p_right ->> 'id' then
    return true;
  end if;
  if p_root = 'experiences' then
    return private.profile_delta_normalize(p_left ->> 'organization') = private.profile_delta_normalize(p_right ->> 'organization')
      and private.profile_delta_normalize(p_left ->> 'role') = private.profile_delta_normalize(p_right ->> 'role')
      and (nullif(private.profile_delta_normalize(p_left ->> 'organization'), '') is not null
        or nullif(private.profile_delta_normalize(p_left ->> 'role'), '') is not null);
  elsif p_root = 'education' then
    return private.profile_delta_normalize(p_left ->> 'institution') = private.profile_delta_normalize(p_right ->> 'institution')
      and private.profile_delta_normalize(p_left ->> 'course') = private.profile_delta_normalize(p_right ->> 'course')
      and (nullif(private.profile_delta_normalize(p_left ->> 'institution'), '') is not null
        or nullif(private.profile_delta_normalize(p_left ->> 'course'), '') is not null);
  elsif p_root = 'keyResults' then
    return private.profile_delta_normalize(p_left ->> 'value') = private.profile_delta_normalize(p_right ->> 'value');
  elsif p_root = 'customSections' then
    return private.profile_delta_normalize(p_left ->> 'name') = private.profile_delta_normalize(p_right ->> 'name');
  end if;
  return false;
end;
$$;

create or replace function private.profile_delta_merge_entity_array(
  p_root text,
  p_base jsonb,
  p_proposal jsonb,
  p_removals jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb := '[]'::jsonb;
  proposed_item jsonb;
  base_item jsonb;
  matched_base jsonb;
  has_match boolean;
begin
  for proposed_item in select value from jsonb_array_elements(
    case when jsonb_typeof(p_proposal) = 'array' then p_proposal else '[]'::jsonb end
  ) loop
    matched_base := null;
    for base_item in select value from jsonb_array_elements(
      case when jsonb_typeof(p_base) = 'array' then p_base else '[]'::jsonb end
    ) loop
      if private.profile_delta_items_match(p_root, base_item, proposed_item) then
        matched_base := base_item;
        exit;
      end if;
    end loop;
    if matched_base is null
      or not private.profile_delta_has_removal(p_removals, p_root || '::' || (matched_base ->> 'id'))
    then
      result := result || jsonb_build_array(proposed_item);
    end if;
  end loop;

  for base_item in select value from jsonb_array_elements(
    case when jsonb_typeof(p_base) = 'array' then p_base else '[]'::jsonb end
  ) loop
    if private.profile_delta_has_removal(p_removals, p_root || '::' || (base_item ->> 'id')) then
      continue;
    end if;
    has_match := false;
    for proposed_item in select value from jsonb_array_elements(
      case when jsonb_typeof(p_proposal) = 'array' then p_proposal else '[]'::jsonb end
    ) loop
      if private.profile_delta_items_match(p_root, base_item, proposed_item) then
        has_match := true;
        exit;
      end if;
    end loop;
    if not has_match then result := result || jsonb_build_array(base_item); end if;
  end loop;
  return result;
end;
$$;

create or replace function private.profile_delta_merge_text_array(
  p_root text,
  p_base jsonb,
  p_proposal jsonb,
  p_removals jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb := '[]'::jsonb;
  proposed_item jsonb;
  base_item jsonb;
  normalized_value text;
begin
  for proposed_item in select value from jsonb_array_elements(
    case when jsonb_typeof(p_proposal) = 'array' then p_proposal else '[]'::jsonb end
  ) loop
    normalized_value := private.profile_delta_normalize(proposed_item #>> '{}');
    if normalized_value <> ''
      and not private.profile_delta_has_removal(p_removals, p_root || '::' || normalized_value)
      and not exists (
        select 1 from jsonb_array_elements(result) existing
        where private.profile_delta_normalize(existing #>> '{}') = normalized_value
      )
    then result := result || jsonb_build_array(proposed_item); end if;
  end loop;
  for base_item in select value from jsonb_array_elements(
    case when jsonb_typeof(p_base) = 'array' then p_base else '[]'::jsonb end
  ) loop
    normalized_value := private.profile_delta_normalize(base_item #>> '{}');
    if normalized_value <> ''
      and not private.profile_delta_has_removal(p_removals, p_root || '::' || normalized_value)
      and not exists (
        select 1 from jsonb_array_elements(result) existing
        where private.profile_delta_normalize(existing #>> '{}') = normalized_value
      )
    then result := result || jsonb_build_array(base_item); end if;
  end loop;
  return result;
end;
$$;

create or replace function private.profile_delta_removal_exists(p_base jsonb, p_path text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  root text := split_part(p_path, '::', 1);
  identity text := split_part(p_path, '::', 2);
begin
  if p_path in ('professionalTitle', 'professionalObjective', 'summary') then
    return nullif(btrim(p_base ->> p_path), '') is not null;
  elsif root in ('areasOfExpertise', 'competencies', 'languages', 'certifications') then
    return exists (
      select 1 from jsonb_array_elements_text(coalesce(p_base -> root, '[]'::jsonb)) item
      where private.profile_delta_normalize(item) = identity
    );
  elsif root in ('experiences', 'education', 'keyResults', 'customSections') then
    return exists (
      select 1 from jsonb_array_elements(coalesce(p_base -> root, '[]'::jsonb)) item
      where item ->> 'id' = identity
    );
  end if;
  return false;
end;
$$;

create or replace function private.merge_profile_publication_delta(
  p_base jsonb,
  p_proposal jsonb,
  p_removals jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb := coalesce(p_proposal, '{}'::jsonb);
  scalar_key text;
begin
  foreach scalar_key in array array['professionalTitle', 'professionalObjective', 'summary'] loop
    if private.profile_delta_has_removal(p_removals, scalar_key) then
      result := jsonb_set(result, array[scalar_key], 'null'::jsonb, true);
    elsif nullif(btrim(p_proposal ->> scalar_key), '') is null and nullif(btrim(p_base ->> scalar_key), '') is not null then
      result := jsonb_set(result, array[scalar_key], p_base -> scalar_key, true);
    end if;
  end loop;

  result := jsonb_set(result, '{areasOfExpertise}', private.profile_delta_merge_text_array('areasOfExpertise', p_base -> 'areasOfExpertise', p_proposal -> 'areasOfExpertise', p_removals), true);
  result := jsonb_set(result, '{competencies}', private.profile_delta_merge_text_array('competencies', p_base -> 'competencies', p_proposal -> 'competencies', p_removals), true);
  result := jsonb_set(result, '{languages}', private.profile_delta_merge_text_array('languages', p_base -> 'languages', p_proposal -> 'languages', p_removals), true);
  result := jsonb_set(result, '{certifications}', private.profile_delta_merge_text_array('certifications', p_base -> 'certifications', p_proposal -> 'certifications', p_removals), true);
  result := jsonb_set(result, '{experiences}', private.profile_delta_merge_entity_array('experiences', p_base -> 'experiences', p_proposal -> 'experiences', p_removals), true);
  result := jsonb_set(result, '{education}', private.profile_delta_merge_entity_array('education', p_base -> 'education', p_proposal -> 'education', p_removals), true);
  result := jsonb_set(result, '{keyResults}', private.profile_delta_merge_entity_array('keyResults', p_base -> 'keyResults', p_proposal -> 'keyResults', p_removals), true);
  result := jsonb_set(result, '{customSections}', private.profile_delta_merge_entity_array('customSections', p_base -> 'customSections', p_proposal -> 'customSections', p_removals), true);
  return result;
end;
$$;

create or replace function public.publish_profile_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_expected_lock_version integer,
  p_explicit_removals jsonb,
  p_idempotency_key text
)
returns table (review_id uuid, profile_id uuid, profile_version integer, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict error
declare
  actor_id uuid;
  review public.profile_reviews;
  base_profile_data jsonb := '{}'::jsonb;
  proposal_profile_data jsonb;
  merged_profile_data jsonb;
  removal jsonb;
  publication record;
  inner_key text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  if jsonb_typeof(coalesce(p_explicit_removals, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'publication removals must be an array';
  end if;

  select * into review
  from public.profile_reviews item
  where item.organization_id = p_organization_id and item.id = p_review_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'review not found in organization'; end if;

  if review.base_profile_id is not null then
    select profile.profile_data into base_profile_data
    from public.professional_profiles profile
    where profile.organization_id = p_organization_id
      and profile.id = review.base_profile_id
      and profile.person_id = review.person_id;
    if not found then raise exception using errcode = 'P0001', message = 'profile_base_conflict'; end if;
  end if;

  for removal in select value from jsonb_array_elements(coalesce(p_explicit_removals, '[]'::jsonb)) loop
    if nullif(btrim(removal ->> 'fieldPath'), '') is null
      or char_length(btrim(coalesce(removal ->> 'reason', ''))) < 5
      or not private.profile_delta_removal_exists(base_profile_data, removal ->> 'fieldPath')
    then
      raise exception using errcode = '22023', message = 'explicit publication removal is invalid';
    end if;
  end loop;

  inner_key := p_idempotency_key || ':' || encode(extensions.digest(coalesce(p_explicit_removals, '[]'::jsonb)::text, 'sha256'), 'hex');

  if review.state = 'draft' then
    if review.lock_version <> p_expected_lock_version then
      raise exception using errcode = 'P0001', message = 'review_conflict';
    end if;
    proposal_profile_data := review.reviewed_data - 'identity' - 'contact';
    merged_profile_data := private.merge_profile_publication_delta(base_profile_data, proposal_profile_data, p_explicit_removals);
    update public.profile_reviews
    set reviewed_data = jsonb_build_object(
      'identity', coalesce(review.reviewed_data -> 'identity', '{}'::jsonb),
      'contact', coalesce(review.reviewed_data -> 'contact', '{}'::jsonb)
    ) || merged_profile_data,
      last_edited_by_auth_user_id = actor_id
    where organization_id = p_organization_id and id = p_review_id;
  end if;

  select * into publication
  from public.approve_profile_review(p_organization_id, p_review_id, p_expected_lock_version, inner_key);

  insert into public.profile_publication_removals (
    organization_id, person_id, review_id, approved_profile_id,
    field_path, previous_value, reason, actor_auth_user_id
  )
  select
    p_organization_id,
    review.person_id,
    p_review_id,
    publication.profile_id,
    removal ->> 'fieldPath',
    removal -> 'previousValue',
    btrim(removal ->> 'reason'),
    actor_id
  from jsonb_array_elements(coalesce(p_explicit_removals, '[]'::jsonb)) removal
  on conflict (organization_id, review_id, field_path) do nothing;

  if not publication.reused then
    insert into public.person_ingestion_events (
      organization_id, person_id, document_id, processing_attempt_id,
      actor_auth_user_id, event_type, result, metadata
    ) values (
      p_organization_id, review.person_id, review.document_id, review.processing_attempt_id,
      actor_id, 'profile_publication_delta_applied', 'success',
      jsonb_build_object(
        'review_id', p_review_id,
        'profile_id', publication.profile_id,
        'profile_version', publication.profile_version,
        'explicit_removal_count', jsonb_array_length(coalesce(p_explicit_removals, '[]'::jsonb)),
        'omissions_preserved', true
      )
    );
  end if;

  return query select publication.review_id, publication.profile_id, publication.profile_version, publication.reused;
end;
$$;

revoke all on function public.publish_profile_review(uuid, uuid, integer, jsonb, text) from public, anon;
grant execute on function public.publish_profile_review(uuid, uuid, integer, jsonb, text) to authenticated;

comment on table public.profile_publication_removals is
  'Immutable ledger of explicit removals made while publishing a reviewed profile delta. Omission never creates a row.';
comment on function public.publish_profile_review(uuid, uuid, integer, jsonb, text) is
  'Publishes a review by preserving approved facts omitted by the new source and recording only explicit removals.';
