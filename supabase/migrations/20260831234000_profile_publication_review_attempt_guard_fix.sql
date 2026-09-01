do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.approve_profile_review(uuid,uuid,integer,text)'::regprocedure)
  into function_definition;
  if position('draft.status in (''valid'', ''insufficient'')' in function_definition) = 0 then
    raise exception 'approve_profile_review recoverable draft guard has an unexpected shape';
  end if;
  execute replace(
    function_definition,
    'draft.status in (''valid'', ''insufficient'')',
    'draft.validation_status in (''valid'', ''insufficient'')'
  );
end;
$migration$;
