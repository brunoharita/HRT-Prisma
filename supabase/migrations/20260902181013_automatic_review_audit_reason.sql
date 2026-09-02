-- Human review audit is factual by default: actor, timestamp, previous value,
-- reviewed value, evidence and version already provide the durable trail.
-- Keep p_reason for backward compatibility, but never require an operator to
-- compose free text for an ordinary draft save or spatial evidence operation.

do $patch$
declare
  function_oid oid;
  function_definition text;
  required_reason_block constant text := $required$
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'review reason is required';
  end if;
$required$;
  automatic_reason_block constant text := $automatic$
  resolved_reason := coalesce(
    nullif(btrim(coalesce(p_reason, '')), ''),
    'Alteração registrada pelo operador; valores anterior e novo preservados no histórico.'
  );
  if char_length(resolved_reason) > 1000 then
    raise exception using errcode = '22023', message = 'review reason is invalid';
  end if;
$automatic$;
begin
  function_oid := to_regprocedure('public.save_profile_review(uuid,uuid,integer,jsonb,text,text)')::oid;
  if function_oid is null then
    raise exception 'save profile review function was not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  if position('resolved_reason text;' in function_definition) = 0 then
    if position('fingerprint text;' in function_definition) = 0 then
      raise exception 'save profile review declaration has an unexpected shape';
    end if;
    function_definition := replace(
      function_definition,
      'fingerprint text;',
      E'fingerprint text;\n  resolved_reason text;'
    );
  end if;

  if position(required_reason_block in function_definition) = 0 then
    raise exception 'save profile review reason validation has an unexpected shape';
  end if;
  function_definition := replace(function_definition, required_reason_block, automatic_reason_block);
  function_definition := replace(function_definition, 'p_reason), ''sha256''', 'resolved_reason), ''sha256''');
  function_definition := replace(function_definition, 'btrim(p_reason)', 'resolved_reason');

  if position('resolved_reason), ''sha256''' in function_definition) = 0
    or position('resolved_reason, actor_id' in function_definition) = 0 then
    raise exception 'save profile review audit writes were not updated';
  end if;
  execute function_definition;
end;
$patch$;

do $patch$
declare
  function_oid oid;
  function_definition text;
  manual_reason_block constant text := $manual$
    if p_action = 'correct_current_field' and nullif(btrim(coalesce(p_selected_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a manual reason is required when evidence has no extracted text';
    end if;
$manual$;
begin
  function_oid := to_regprocedure(
    'private.record_profile_review_evidence(uuid,uuid,integer,text,text,integer,integer,double precision,double precision,double precision,double precision,text,text,jsonb,text,uuid,text)'
  )::oid;
  if function_oid is null then
    raise exception 'private record profile review evidence function was not found';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  if position(manual_reason_block in function_definition) = 0 then
    raise exception 'record review evidence reason validation has an unexpected shape';
  end if;
  function_definition := replace(function_definition, manual_reason_block, '');
  execute function_definition;
end;
$patch$;

revoke all on function public.save_profile_review(uuid, uuid, integer, jsonb, text, text) from public, anon;
grant execute on function public.save_profile_review(uuid, uuid, integer, jsonb, text, text) to authenticated;

revoke all on function private.record_profile_review_evidence(
  uuid, uuid, integer, text, text, integer, integer,
  double precision, double precision, double precision, double precision,
  text, text, jsonb, text, uuid, text
) from public, anon, authenticated;
