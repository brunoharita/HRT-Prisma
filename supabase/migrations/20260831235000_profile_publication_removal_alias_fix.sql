do $migration$
declare
  function_definition text;
  old_block text := $old$
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
$old$;
  new_block text := $new$
  insert into public.profile_publication_removals (
    organization_id, person_id, review_id, approved_profile_id,
    field_path, previous_value, reason, actor_auth_user_id
  )
  select
    p_organization_id,
    review.person_id,
    p_review_id,
    publication.profile_id,
    removal_row.value ->> 'fieldPath',
    removal_row.value -> 'previousValue',
    btrim(removal_row.value ->> 'reason'),
    actor_id
  from jsonb_array_elements(coalesce(p_explicit_removals, '[]'::jsonb)) as removal_row(value)
  on conflict (organization_id, review_id, field_path) do nothing;
$new$;
begin
  select pg_get_functiondef('public.publish_profile_review(uuid,uuid,integer,jsonb,text)'::regprocedure)
  into function_definition;
  if position(old_block in function_definition) = 0 then
    raise exception 'publish_profile_review removal insert has an unexpected shape';
  end if;
  execute replace(function_definition, old_block, new_block);
end;
$migration$;
