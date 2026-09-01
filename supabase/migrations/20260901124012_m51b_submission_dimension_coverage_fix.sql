do $migration$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'm51b_public_access'
    and pg_get_function_identity_arguments(procedure.oid) = 'p_action text, p_token_hash text, p_payload jsonb';

  if function_definition is null then
    raise exception 'M51B_PUBLIC_ACCESS_FUNCTION_NOT_FOUND';
  end if;
  if position('jsonb_object_length(v_dimension_results)' in function_definition) = 0 then
    raise exception 'M51B_DIMENSION_COVERAGE_SOURCE_NOT_FOUND';
  end if;

  corrected_definition := replace(
    function_definition,
    'jsonb_object_length(v_dimension_results)',
    '(select count(*)::integer from jsonb_object_keys(v_dimension_results))'
  );
  execute corrected_definition;
end;
$migration$;

revoke all on function public.m51b_public_access(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.m51b_public_access(text, text, jsonb) to service_role;
