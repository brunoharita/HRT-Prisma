begin;

-- Keep publication fail-closed while accepting the complementary level already
-- supported by the canonical education validator.
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
      when 'complementary' then (education_item.value ->> 'qualification') in ('other', 'unknown')
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

revoke all on function private.enforce_approved_education_classification() from public, anon, authenticated;

comment on function private.enforce_approved_education_classification() is
  'Validates approved education levels, including complementary formation, before profile publication.';

commit;
