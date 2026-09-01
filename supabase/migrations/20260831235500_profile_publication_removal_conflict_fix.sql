do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.publish_profile_review(uuid,uuid,integer,jsonb,text)'::regprocedure)
  into function_definition;
  if position('on conflict (organization_id, review_id, field_path) do nothing' in function_definition) = 0 then
    raise exception 'publish_profile_review removal conflict target has an unexpected shape';
  end if;
  execute replace(
    function_definition,
    'on conflict (organization_id, review_id, field_path) do nothing',
    'on conflict on constraint profile_publication_removals_unique do nothing'
  );
end;
$migration$;
