-- Forward-only patch for the function definition already applied in Prisma-QA.
do $patch$
declare
  function_definition text;
  old_fragment text := 'set status = case when is_structured then ''ready_for_review'' else ''failed'' end,';
  new_fragment text := 'set status = case when is_structured then ''ready_for_review''::public.document_status else ''failed''::public.document_status end,';
begin
  select pg_get_functiondef(
    'public.persist_person_extraction(uuid,uuid,uuid,jsonb,jsonb,integer,integer,text,text,text,text,text,uuid)'::regprocedure
  ) into function_definition;

  if position(old_fragment in function_definition) = 0 then
    raise exception 'persist_person_extraction status assignment was not found';
  end if;

  execute replace(function_definition, old_fragment, new_fragment);
end;
$patch$;
