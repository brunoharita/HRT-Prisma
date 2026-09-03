-- Approved historical profiles preserve their classification and historical human approval state.
create or replace function private.normalize_approved_profile_contract(p_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb := private.normalize_profile_review_contract(p_payload, '{}'::jsonb);
  normalized_education jsonb;
begin
  select coalesce(jsonb_agg(jsonb_set(item.value, '{classificationReviewed}', 'true'::jsonb, true) order by item.ordinality), '[]'::jsonb)
  into normalized_education
  from jsonb_array_elements(case when jsonb_typeof(result -> 'education') = 'array' then result -> 'education' else '[]'::jsonb end)
    with ordinality item(value, ordinality);
  return jsonb_set(result, '{education}', normalized_education, true);
end;
$$;

revoke all on function private.normalize_approved_profile_contract(jsonb) from public, anon, authenticated;

create or replace function private.normalize_lifecycle_historical_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_origin in ('restored', 'document_deletion_rebuild') then
    new.profile_data := private.normalize_approved_profile_contract(new.profile_data);
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_lifecycle_historical_profile() from public, anon, authenticated;

comment on function private.normalize_approved_profile_contract(jsonb) is
  'Upgrades an already approved historical snapshot without recalculating or inventing academic classification.';
