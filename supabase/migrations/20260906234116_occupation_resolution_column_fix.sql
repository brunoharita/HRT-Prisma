-- Keep the applied resolver contract while qualifying the concept label inside
-- PL/pgSQL (the OUT column shares that name).
do $$
declare definition text;
begin
  select pg_get_functiondef(function_entry.oid) into definition
  from pg_proc function_entry
  join pg_namespace namespace_entry on namespace_entry.oid = function_entry.pronamespace
  where namespace_entry.nspname = 'public'
    and function_entry.proname = 'resolve_occupation_on_demand'
    and pg_get_function_identity_arguments(function_entry.oid) = 'p_organization_id uuid, p_observed_term text, p_vacancy_id uuid, p_language text';
  if definition is null then raise exception 'OCCUPATION_RESOLUTION_FUNCTION_MISSING'; end if;
  definition := replace(definition,
    'select canonical_label into v_label from public.knowledge_concepts where id = v_concept_id;',
    'select concept.canonical_label into v_label from public.knowledge_concepts concept where concept.id = v_concept_id;');
  execute definition;
end;
$$;
