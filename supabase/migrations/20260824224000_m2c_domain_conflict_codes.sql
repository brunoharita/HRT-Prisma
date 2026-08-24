-- Functional review conflicts must be returned immediately. SQLSTATE 40001 is
-- reserved for retryable serialization failures and can trigger client retries.
do $patch$
declare
  function_signature regprocedure;
  function_definition text;
begin
  foreach function_signature in array array[
    'public.save_profile_review(uuid,uuid,integer,jsonb,text,text)'::regprocedure,
    'public.approve_profile_review(uuid,uuid,integer,text)'::regprocedure
  ]
  loop
    select pg_get_functiondef(function_signature) into function_definition;
    if position('errcode = ''40001''' in function_definition) = 0 then
      raise exception 'expected retryable conflict code was not found in %', function_signature;
    end if;
    execute replace(function_definition, 'errcode = ''40001''', 'errcode = ''P0001''');
  end loop;
end;
$patch$;
