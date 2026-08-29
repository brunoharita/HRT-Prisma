do $$
declare
  function_oid oid;
  function_definition text;
  updated_definition text;
  ambiguous_clause constant text := 'on conflict (organization_id, region_id, mapped_link_id) do nothing';
begin
  function_oid := to_regprocedure(
    'public.record_profile_review_evidence_refined(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,text,jsonb,jsonb,text,uuid,text)'
  );
  if function_oid is null then
    raise exception 'refined review evidence function was not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  if position(ambiguous_clause in function_definition) = 0 then
    if position('on conflict do nothing' in function_definition) > 0 then
      return;
    end if;
    raise exception 'refined review evidence conflict clause has an unexpected shape';
  end if;

  updated_definition := replace(
    function_definition,
    ambiguous_clause,
    'on conflict do nothing'
  );
  execute updated_definition;
end;
$$;
