
-- Commercial reservations surround existing authorized transactional boundaries.
alter function public.position_assessment_generation_request(uuid,uuid,uuid,jsonb) set schema private;
alter function private.position_assessment_generation_request(uuid,uuid,uuid,jsonb) rename to pa_generation_request_before_tokens;
revoke all on function private.pa_generation_request_before_tokens(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.position_assessment_generation_request(p_organization_id uuid,p_assessment_id uuid,p_request_id uuid,p_distribution jsonb,p_token_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g jsonb; quantity integer; begin
 if not private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[]) then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 perform private.prisma_token_ensure(p_organization_id);
 g:=private.pa_generation_request_before_tokens(p_organization_id,p_assessment_id,p_request_id,p_distribution);
 if g->>'status' in ('succeeded','failed') then return g;end if;
 select sum((r->>'quantity')::integer) into quantity from jsonb_array_elements(p_distribution) r;
 perform private.prisma_token_reserve(p_organization_id,'position_assessment_items',p_request_id,p_token_quote_id,quantity);
 return g;
end $$;
revoke all on function public.position_assessment_generation_request(uuid,uuid,uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.position_assessment_generation_request(uuid,uuid,uuid,jsonb,uuid) to authenticated;

alter function public.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) set schema private;
alter function private.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) rename to pa_generation_finish_before_tokens;
revoke all on function private.pa_generation_finish_before_tokens(uuid,uuid,jsonb,numeric,boolean) from public,anon,authenticated,service_role;
create function public.position_assessment_generation_finish(p_request_id uuid,p_organization_id uuid,p_questions jsonb,p_actual_usd numeric,p_success boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; begin
 perform private.prisma_token_ensure(p_organization_id);
 v:=private.pa_generation_finish_before_tokens(p_request_id,p_organization_id,p_questions,p_actual_usd,p_success);
 perform private.prisma_token_settle(p_organization_id,'position_assessment_items',p_request_id,v->>'status'='succeeded');
 return v;
end $$;
revoke all on function public.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) from public,anon,authenticated;
grant execute on function public.position_assessment_generation_finish(uuid,uuid,jsonb,numeric,boolean) to service_role;

-- Parser keeps its restricted worker credential and cache-first execution.
create or replace function public.record_ai_worker_history_v1(p_secret text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare fn text; v jsonb; org uuid; req uuid; q uuid; begin
 if length(coalesce(p_secret,''))<40 or not exists(select 1 from private.ai_history_worker_config where token_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'AI_HISTORY_WORKER_DENIED' using errcode='42501';end if;
 org:=(p_data->>'organizationId')::uuid;
 if p_action='open_request' then
  fn:=p_data->>'functionName';
  if p_data->>'scope' is distinct from 'organization' or org is null or p_data->>'actorId' is not null then raise exception 'AI_HISTORY_WORKER_SCOPE_DENIED' using errcode='42501';end if;
 else select function_name,operation_id into fn,req from public.ai_requests where id=(p_data->>'requestId')::uuid and organization_id=org and scope='organization';end if;
 if fn is null or fn not in ('parser_ia','profile_synthesis') then raise exception 'AI_HISTORY_WORKER_FUNCTION_DENIED' using errcode='42501';end if;
 q:=(p_data->>'tokenQuoteId')::uuid;
 if fn='parser_ia' then perform private.prisma_token_ensure(org);end if;
 v:=private.record_ai_history_v1(p_action,p_data-'tokenQuoteId');
 if p_action='open_request' and fn='parser_ia' and q is not null then
  perform private.prisma_token_reserve(org,fn,(p_data->>'operationId')::uuid,q,1);
 elsif p_action='begin_attempt' and fn='parser_ia' and p_data->>'usageKind'='external' then
  if not exists(select 1 from private.prisma_token_reservations where organization_id=org and function_name=fn and operation_id=req and status='reserved') then raise exception 'PT_QUOTE_REQUIRED' using errcode='22023';end if;
 elsif p_action='complete_request' and fn='parser_ia' then
  perform private.prisma_token_settle(org,fn,req,p_data->>'status'='succeeded');
 end if;
 return v;
end $$;

create table private.prisma_synthesis_token_bindings(
 job_id uuid primary key references public.profile_synthesis_jobs(id) on delete cascade,
 organization_id uuid not null references private.prisma_token_accounts(organization_id),
 operation_id uuid not null, quote_id uuid not null,
 foreign key(organization_id,quote_id) references private.prisma_token_quotes(organization_id,id)
);
alter table private.prisma_synthesis_token_bindings enable row level security;
revoke all on private.prisma_synthesis_token_bindings from public,anon,authenticated,service_role;
create function private.prisma_token_bind_synthesis(p_org uuid,p_view jsonb,p_quote uuid) returns void
language plpgsql security definer set search_path='' as $$
declare binding private.prisma_synthesis_token_bindings; begin
 if p_view->>'state' not in ('queued','processing') then return;end if;
 select * into binding from private.prisma_synthesis_token_bindings where job_id=(p_view->>'jobId')::uuid and organization_id=p_org for update;
 if found and exists(select 1 from private.prisma_token_reservations where organization_id=p_org and operation_id=binding.operation_id and function_name='profile_synthesis' and status='reserved') then return;end if;
 perform private.prisma_token_reserve(p_org,'profile_synthesis',p_quote,p_quote,1);
 insert into private.prisma_synthesis_token_bindings(job_id,organization_id,operation_id,quote_id) values((p_view->>'jobId')::uuid,p_org,p_quote,p_quote)
  on conflict(job_id) do update set operation_id=excluded.operation_id,quote_id=excluded.quote_id;
end $$;
revoke all on function private.prisma_token_bind_synthesis(uuid,jsonb,uuid) from public,anon,authenticated,service_role;

-- New synthesis jobs require an explicit action. Publication and reads remain free,
-- preserve facts and stored analyses, and cannot start a billable provider call.
alter function private.enqueue_profile_synthesis(uuid) rename to enqueue_synthesis_before_tokens;
revoke all on function private.enqueue_synthesis_before_tokens(uuid) from public,anon,authenticated,service_role;
create function private.enqueue_profile_synthesis(p_profile_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if current_setting('prisma_tokens.explicit_synthesis',true)='on' then return private.enqueue_synthesis_before_tokens(p_profile_id);end if;
 return null;
end $$;
revoke all on function private.enqueue_profile_synthesis(uuid) from public,anon,authenticated,service_role;

alter function public.request_profile_synthesis(uuid,uuid,uuid) set schema private;
alter function private.request_profile_synthesis(uuid,uuid,uuid) rename to request_synthesis_before_tokens;
alter function public.retry_profile_synthesis(uuid,uuid,uuid) set schema private;
alter function private.retry_profile_synthesis(uuid,uuid,uuid) rename to retry_synthesis_before_tokens;
revoke all on function private.request_synthesis_before_tokens(uuid,uuid,uuid),private.retry_synthesis_before_tokens(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.request_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null,p_token_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; previous_flag text:=current_setting('prisma_tokens.explicit_synthesis',true);begin
 if not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[]) then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 perform private.prisma_token_ensure(p_organization_id);
 perform set_config('prisma_tokens.explicit_synthesis','on',true);
 v:=private.request_synthesis_before_tokens(p_organization_id,p_person_id,p_profile_id);
 perform set_config('prisma_tokens.explicit_synthesis',coalesce(previous_flag,'off'),true);
 perform private.prisma_token_bind_synthesis(p_organization_id,v,p_token_quote_id);return v;
end $$;
create function public.retry_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null,p_token_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; previous_flag text:=current_setting('prisma_tokens.explicit_synthesis',true);begin
 if not private.has_org_role(p_organization_id,array['owner','admin','recruiter','member']::public.membership_role[]) then raise exception 'PT_ACCESS_DENIED' using errcode='42501';end if;
 perform private.prisma_token_ensure(p_organization_id);
 perform set_config('prisma_tokens.explicit_synthesis','on',true);
 v:=private.retry_synthesis_before_tokens(p_organization_id,p_person_id,p_profile_id);
 perform set_config('prisma_tokens.explicit_synthesis',coalesce(previous_flag,'off'),true);
 perform private.prisma_token_bind_synthesis(p_organization_id,v,p_token_quote_id);return v;
end $$;
revoke all on function public.request_profile_synthesis(uuid,uuid,uuid,uuid),public.retry_profile_synthesis(uuid,uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.request_profile_synthesis(uuid,uuid,uuid,uuid),public.retry_profile_synthesis(uuid,uuid,uuid,uuid) to authenticated;
alter function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) set schema private;
alter function private.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) rename to complete_synthesis_before_tokens;
revoke all on function private.complete_synthesis_before_tokens(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) from public,anon,authenticated,service_role;
create function public.complete_profile_synthesis(p_secret text,p_job_id uuid,p_lease uuid,p_result jsonb,p_model text,p_input_tokens integer,p_output_tokens integer,p_duration_ms integer,p_error text default null,p_diagnostic jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; org uuid; binding private.prisma_synthesis_token_bindings; state text;
begin
 -- Legacy completion remains the secret/lease/result authority; token settlement
 -- is committed in the very same transaction as the persisted analysis.
 select organization_id into org from public.profile_synthesis_jobs where id=p_job_id;
 if org is not null then perform 1 from public.organizations where id=org for update;end if;
 v:=private.complete_synthesis_before_tokens(p_secret,p_job_id,p_lease,p_result,p_model,p_input_tokens,p_output_tokens,p_duration_ms,p_error,p_diagnostic);
 select * into binding from private.prisma_synthesis_token_bindings where job_id=p_job_id and organization_id=org;
 select j.state into state from public.profile_synthesis_jobs j where j.id=p_job_id;
 if binding.job_id is not null and state in ('complete','failed','obsolete','insufficient') then
  perform private.prisma_token_settle(org,'profile_synthesis',binding.operation_id,state='complete');
 end if;
 return v;
end $$;
revoke all on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) from public;
grant execute on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) to anon,authenticated;

