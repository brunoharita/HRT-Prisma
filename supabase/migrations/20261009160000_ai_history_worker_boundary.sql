-- Purpose-bound metadata writer for the existing private Parser/Synthesis workers.
-- Separate credential: never reuse an AI provider key or grant direct table access.
create table private.ai_history_worker_config(id boolean primary key default true check(id),token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'));
revoke all on private.ai_history_worker_config from public,anon,authenticated,service_role;
create function public.record_ai_worker_history_v1(p_secret text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare function_name text; begin
 if length(coalesce(p_secret,''))<40 or not exists(select 1 from private.ai_history_worker_config where token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'AI_HISTORY_WORKER_DENIED' using errcode='42501'; end if;
 if p_action='open_request' then
  function_name:=p_data->>'functionName';
  if p_data->>'scope' is distinct from 'organization' or p_data->>'organizationId' is null or p_data->>'actorId' is not null then raise exception 'AI_HISTORY_WORKER_SCOPE_DENIED' using errcode='42501'; end if;
 else select r.function_name into function_name from public.ai_requests r where r.id=(p_data->>'requestId')::uuid and r.organization_id=(p_data->>'organizationId')::uuid and r.scope='organization'; end if;
 if function_name is null or function_name not in ('parser_ia','profile_synthesis') then raise exception 'AI_HISTORY_WORKER_FUNCTION_DENIED' using errcode='42501'; end if;
 return private.record_ai_history_v1(p_action,p_data);
end $$;
revoke all on function public.record_ai_worker_history_v1(text,text,jsonb) from public;
grant execute on function public.record_ai_worker_history_v1(text,text,jsonb) to anon,authenticated;
