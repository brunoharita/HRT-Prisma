-- Correct the already-deployed v2 RPC without rewriting its migration history.
-- Fresh databases already receive the explicit bigint cast in the preceding migration.

do $$
declare
  function_definition text;
  broken_fragment constant text := 'p_organization_id, p_review_id, null, new_event_id,';
  corrected_fragment constant text := 'p_organization_id, p_review_id, null::bigint, new_event_id,';
begin
  select pg_catalog.pg_get_functiondef(
    'public.apply_profile_review_adaptive_suggestions(uuid,uuid,integer,jsonb,text,text,text,jsonb,text,text)'::regprocedure
  ) into function_definition;

  if pg_catalog.strpos(function_definition, broken_fragment) > 0 then
    execute pg_catalog.replace(function_definition, broken_fragment, corrected_fragment);
  elsif pg_catalog.strpos(function_definition, corrected_fragment) = 0 then
    raise exception using errcode = 'P0001', message = 'adaptive RPC definition is not recognized';
  end if;
end;
$$;
