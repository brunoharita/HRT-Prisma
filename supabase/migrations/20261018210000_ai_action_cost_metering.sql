-- ai-action-cost-metering-1.0.0. Additive metadata only; no backfill or billing mutation.
alter table public.ai_requests
 add column action_operation_id uuid,
 add column commercial_operation_id uuid,
 add column measurement_version text check(measurement_version='ai-action-cost-metering-1.0.0');
alter table public.ai_usage_events add column measurement jsonb;
create index ai_requests_action_idx on public.ai_requests(scope,binding_id,function_name,action_operation_id,created_at desc) where action_operation_id is not null;

create function private.ai_cost_measurement_valid(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb;
begin
 if p is null or jsonb_typeof(p)<>'object' or length(p::text)>4096 or not(p ?& array['version','requestedModel','resolvedModel','providerResponseId','providerRequestId','serviceTier','inputCachedTokens','inputCacheWriteTokens','outputReasoningTokens','webSearchCalls','otherToolCalls','calculationStatus','lowerBoundUsd','upperBoundUsd','tokenCostUsd','toolCostUsd']) or p->>'version' is distinct from 'ai-cost-measurement-1.0.0'
  or p->>'calculationStatus' is null or p->>'calculationStatus' not in ('calculated','bounded','partial','unknown') then return false;end if;
 for k,v in select * from jsonb_each(p) loop
  if k in ('version','calculationStatus') then continue;
  elsif k in ('requestedModel','resolvedModel','providerResponseId','providerRequestId','serviceTier') then
   if v<>'null'::jsonb and (jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$') then return false;end if;
  elsif k in ('inputCachedTokens','inputCacheWriteTokens','outputReasoningTokens','webSearchCalls','otherToolCalls') then
   if v<>'null'::jsonb and (jsonb_typeof(v)<>'number' or (v#>>'{}') !~ '^[0-9]+$' or (v#>>'{}')::numeric>2147483647) then return false;end if;
  elsif k in ('lowerBoundUsd','upperBoundUsd','tokenCostUsd','toolCostUsd') then
   if v<>'null'::jsonb and (jsonb_typeof(v)<>'number' or not((v#>>'{}')::numeric>=0 and (v#>>'{}')::numeric<'Infinity'::numeric)) then return false;end if;
  else return false;end if;
 end loop;
 if p->>'upperBoundUsd' is not null and (p->>'lowerBoundUsd' is null or (p->>'upperBoundUsd')::numeric<(p->>'lowerBoundUsd')::numeric) then return false;end if;
 if p->>'calculationStatus'='calculated' and (p->>'resolvedModel' is null or p->>'serviceTier' is distinct from 'default' or p->>'inputCachedTokens' is null or p->>'inputCacheWriteTokens' is null or p->>'webSearchCalls' is null or p->>'otherToolCalls' is distinct from '0' or p->>'upperBoundUsd' is null or (p->>'lowerBoundUsd')::numeric<>(p->>'upperBoundUsd')::numeric) then return false;end if;
 return true;
exception when others then return false;
end $$;
revoke all on function private.ai_cost_measurement_valid(jsonb) from public,anon,authenticated,service_role;
alter table public.ai_usage_events add constraint ai_cost_measurement_shape check(measurement is null or private.ai_cost_measurement_valid(measurement));

alter function private.record_ai_history_v1(text,jsonb) rename to record_ai_history_before_metering_v1;
revoke all on function private.record_ai_history_before_metering_v1(text,jsonb) from public,anon,authenticated,service_role;
create function private.record_ai_history_v1(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; req public.ai_requests; evt public.ai_usage_events; action_op uuid; commercial_op uuid; m jsonb; previous jsonb; prior_completed timestamptz; job public.profile_synthesis_jobs;
begin
 if p_action='open_request' then
  action_op:=(p_data->>'actionOperationId')::uuid;
  v:=private.record_ai_history_before_metering_v1(p_action,p_data-'actionOperationId');
  select * into req from public.ai_requests where id=(v#>>'{request,id}')::uuid for update;
  if req.measurement_version is not null then
   if action_op is not null and req.action_operation_id is distinct from action_op then raise exception 'AI_COST_ACTION_CONFLICT' using errcode='40001';end if;
   return v;
  end if;
  if req.function_name='profile_synthesis' then
   select * into job from public.profile_synthesis_jobs j where j.organization_id=req.organization_id and j.lease=req.operation_id;
   if action_op is not null and (job.id is null or action_op<>job.id) then raise exception 'AI_COST_SYNTHESIS_BINDING_INVALID' using errcode='42501';end if;
   action_op:=coalesce(job.id,action_op,req.operation_id);
   select b.operation_id into commercial_op from private.prisma_synthesis_token_bindings b where b.job_id=job.id and b.organization_id=req.organization_id;
  elsif req.function_name in ('competency_normalization','people_directory','matching_trajectory') then
   if req.function_name='competency_normalization' then select id into action_op from public.profile_competency_normalization_runs where organization_id=req.organization_id and lease=req.operation_id;
   elsif req.function_name='people_directory' then select id into action_op from public.people_directory_contexts where organization_id=req.organization_id and lease=req.operation_id;
   else select id into action_op from public.matching_trajectory_assessments where organization_id=req.organization_id and lease=req.operation_id;end if;
   action_op:=coalesce(action_op,req.operation_id);
  else
   if action_op is not null and action_op<>req.operation_id then raise exception 'AI_COST_ACTION_BINDING_INVALID' using errcode='22023';end if;
   action_op:=req.operation_id;
   if req.function_name in ('parser_ia','position_assessment_items','assessment_activity_analysis') then commercial_op:=req.operation_id;end if;
  end if;
  if (v->>'created')::boolean then
   update public.ai_requests set action_operation_id=action_op,commercial_operation_id=commercial_op,measurement_version='ai-action-cost-metering-1.0.0' where id=req.id;
  end if;
  return v;
 elsif p_action='complete_attempt' then
  m:=nullif(p_data->'measurement','null'::jsonb);
  if m is not null and not private.ai_cost_measurement_valid(m) then raise exception 'AI_COST_METADATA_INVALID' using errcode='22023';end if;
  select e.measurement,e.completed_at into previous,prior_completed from public.ai_usage_events e where e.request_id=(p_data->>'requestId')::uuid and e.attempt_id=(p_data->>'attemptId')::uuid and e.organization_id is not distinct from (p_data->>'organizationId')::uuid;
  v:=private.record_ai_history_before_metering_v1(p_action,p_data-'measurement');
  if m is not null then
   if prior_completed is not null and previous is distinct from m then raise exception 'AI_COST_METADATA_CONFLICT' using errcode='40001';end if;
   select * into evt from public.ai_usage_events where id=(v->>'eventId')::bigint;
   if coalesce((m->>'inputCachedTokens')::bigint,0)+coalesce((m->>'inputCacheWriteTokens')::bigint,0)>evt.input_tokens
    or (m->>'outputReasoningTokens')::bigint>evt.output_tokens then raise exception 'AI_COST_USAGE_INVALID' using errcode='22023';end if;
   if evt.estimated_cost_usd is not null and evt.estimated_cost_usd is distinct from round((m->>'upperBoundUsd')::numeric,8) then raise exception 'AI_COST_CALCULATION_CONFLICT' using errcode='22023';end if;
   update public.ai_usage_events set measurement=m,pricing_version='openai-standard-2026-10-18' where id=evt.id;
  end if;
  return v;
 end if;
 return private.record_ai_history_before_metering_v1(p_action,p_data);
end $$;
revoke all on function private.record_ai_history_v1(text,jsonb) from public,anon,authenticated,service_role;
-- Rebind the narrow public writer explicitly; grants remain backend-only.
create or replace function public.record_ai_history_v1(p_action text,p_data jsonb) returns jsonb
language sql security definer set search_path='' as $$ select private.record_ai_history_v1(p_action,p_data) $$;
revoke all on function public.record_ai_history_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.record_ai_history_v1(text,jsonb) to service_role;
-- Invalidate cached PL/pgSQL bodies that called the prior writer OID, preserving
-- their exact current authority/settlement definitions and grants.
do $$begin
 execute pg_get_functiondef('public.record_ai_worker_history_v1(text,text,jsonb)'::regprocedure);
 execute pg_get_functiondef('public.assessment_activity_analysis_start(uuid,uuid,uuid,uuid)'::regprocedure);
end $$;

-- Existing activity boundary owns its lease and atomic delivery/token settlement.
alter function public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb) rename to assessment_activity_finish_before_metering;
revoke all on function public.assessment_activity_finish_before_metering(uuid,uuid,boolean,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.assessment_activity_analysis_finish(p_organization_id uuid,p_request_id uuid,p_success boolean,p_facts jsonb,p_selection jsonb,p_usage jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; a private.assessment_activity_analyses; m jsonb; previous jsonb;
begin
 m:=nullif(p_usage->'measurement','null'::jsonb);
 if m is not null and not private.ai_cost_measurement_valid(m) then raise exception 'AI_COST_METADATA_INVALID' using errcode='22023';end if;
 select * into a from private.assessment_activity_analyses where id=p_request_id and organization_id=p_organization_id for update;
 select measurement into previous from public.ai_usage_events where request_id=a.history_request_id and attempt_id=a.id;
 if m is not null and a.status<>'running' and previous is distinct from m then raise exception 'AI_COST_METADATA_CONFLICT' using errcode='40001';end if;
 v:=public.assessment_activity_finish_before_metering(p_organization_id,p_request_id,p_success,p_facts,p_selection,p_usage-'measurement');
 if m is not null then
  select * into a from private.assessment_activity_analyses where id=p_request_id and organization_id=p_organization_id;
  if coalesce((m->>'inputCachedTokens')::bigint,0)+coalesce((m->>'inputCacheWriteTokens')::bigint,0)>(p_usage->>'inputTokens')::bigint or (m->>'outputReasoningTokens')::bigint>(p_usage->>'outputTokens')::bigint then raise exception 'AI_COST_USAGE_INVALID' using errcode='22023';end if;
  if p_usage->>'estimatedCostUsd' is not null and round((p_usage->>'estimatedCostUsd')::numeric,8) is distinct from round((m->>'upperBoundUsd')::numeric,8) then raise exception 'AI_COST_CALCULATION_CONFLICT' using errcode='22023';end if;
  -- Base completion above is the first immutable receipt; attach metadata in this same transaction.
  update public.ai_usage_events set measurement=m,pricing_version='openai-standard-2026-10-18' where request_id=a.history_request_id and attempt_id=a.id and (measurement is null or measurement=m);
  if not found then raise exception 'AI_COST_METADATA_CONFLICT' using errcode='40001';end if;
 end if;
 return v;
end $$;
revoke all on function public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb) to service_role;

-- Read-only internal report: no ensure/reserve/settle, no company impersonation.
create function public.ai_cost_history_v1(p_limit integer default 25,p_before timestamptz default null,p_before_id uuid default null,p_function_name text default null,p_organization_id uuid default null,p_action_id uuid default null,p_event_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare report jsonb;
begin
 if auth.uid() is null or not private.is_super_admin(auth.uid()) or not exists(select 1 from public.platform_users where auth_user_id=auth.uid() and status='active' and access_profile='super_admin') then raise exception 'AI_COST_ACCESS_DENIED' using errcode='42501';end if;
 if p_limit is null or p_limit<1 or p_limit>50 or p_event_before is not null and (p_action_id is null or p_event_before<1) or ((p_before is null)<>(p_before_id is null)) or (p_function_name is not null and p_function_name !~ '^[a-z][a-z0-9_]{1,63}$') then raise exception 'AI_COST_FILTER_INVALID' using errcode='22023';end if;
 with requests as (
  select r.*,md5(r.scope||':'||r.binding_id::text||':'||r.function_name||':'||coalesce(r.action_operation_id,r.operation_id)::text)::uuid action_key
  from public.ai_requests r where (p_function_name is null or r.function_name=p_function_name) and (p_organization_id is null or r.organization_id=p_organization_id)
 ), grouped as (
  select action_key,scope,organization_id,function_name,max(created_at) latest_at,min(created_at) first_at,count(*) request_count,
   bool_and(measurement_version is not null) linked_version,
   bool_and(measurement_version is not null and r.status='succeeded' and exists(select 1 from public.ai_usage_events e where e.request_id=r.id and e.usage_kind='cache' and e.result='success') and not exists(select 1 from public.ai_usage_events e where e.request_id=r.id and e.usage_kind='external')) cache_only
   from requests r group by action_key,scope,organization_id,function_name
 ), page as (
  select * from grouped g where (p_action_id is null or action_key=p_action_id) and (p_before is null or (latest_at,action_key)<(p_before,p_before_id)) order by latest_at desc,action_key desc limit p_limit+1
 ), visible as (select * from page order by latest_at desc,action_key desc limit p_limit), detail_events as (
  select e.* from public.ai_usage_events e join requests r on r.id=e.request_id where p_action_id is not null and r.action_key=p_action_id and (p_event_before is null or e.id<p_event_before) order by e.id desc limit 51
 ), detail_visible as (select * from detail_events order by id desc limit 50)
 select jsonb_build_object('contract','ai-action-cost-report-1.0.0','hasMore',(select count(*)>p_limit from page),'hasMoreAttempts',(select count(*)>50 from detail_events),'nextAttemptId',(select min(id) from detail_visible),'items',coalesce(jsonb_agg(jsonb_build_object(
  'actionId',g.action_key,'scope',g.scope,'organizationId',g.organization_id,'functionName',g.function_name,'createdAt',g.first_at,'latestAt',g.latest_at,'requestCount',g.request_count,'legacy',not g.linked_version,
  'usage',(select jsonb_build_object('attemptCount',count(*),'externalAttempts',count(*) filter(where usage_kind='external'),'cacheHits',count(*) filter(where usage_kind='cache'),'inputTokens',sum(input_tokens),'outputTokens',sum(output_tokens),'estimatedUsd',sum(estimated_cost_usd),'observedUsd',sum(observed_cost_usd) filter(where cost_status='observed'),'unknownAttempts',count(*) filter(where cost_status='unknown'),'incompleteAttempts',count(*) filter(where usage_kind='external' and (measurement is null or measurement->>'calculationStatus'<>'calculated')),'failedAttempts',count(*) filter(where result='failure')) from public.ai_usage_events e where e.request_id in(select id from requests where action_key=g.action_key)),
  'commercial',(select jsonb_build_object('state',case when count(*)>0 then 'linked' when g.cache_only then 'reused' when g.function_name in ('parser_ia','profile_synthesis','position_assessment_items','assessment_activity_analysis') then 'unlinked' else 'included' end,
   'debitedTokens',case when count(*)>0 or g.cache_only or g.function_name not in ('parser_ia','profile_synthesis','position_assessment_items','assessment_activity_analysis') then coalesce(sum(amount) filter(where status='charged'),0) else null end,'reservedTokens',coalesce(sum(amount) filter(where status='reserved'),0),'releasedTokens',coalesce(sum(amount) filter(where status='released'),0),
   'reservations',coalesce(jsonb_agg(jsonb_build_object('id',s.id,'status',s.status,'amount',s.amount,'quoteId',s.quote_id,'tokensPerUnit',q.tokens_per_unit,'quantity',s.amount/nullif(q.tokens_per_unit,0),'sources',(select coalesce(jsonb_agg(jsonb_build_object('source',l.source,'amount',a.amount,'state',s.status)),'[]'::jsonb) from private.prisma_token_allocations a join private.prisma_token_lots l on l.id=a.lot_id and l.organization_id=a.organization_id where a.reservation_id=s.id and a.organization_id=s.organization_id))),'[]'::jsonb))
   from private.prisma_token_reservations s join private.prisma_token_quotes q on q.id=s.quote_id and q.organization_id=s.organization_id where s.organization_id=g.organization_id and s.function_name=g.function_name and s.operation_id in(select commercial_operation_id from requests where action_key=g.action_key)),
  'requests',case when p_action_id is null then null else (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'operationId',r.operation_id,'commercialOperationId',r.commercial_operation_id,'createdAt',r.created_at,'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'number',e.attempt_number,'kind',e.usage_kind,'result',e.result,'errorCategory',e.error_category,'inputTokens',e.input_tokens,'outputTokens',e.output_tokens,'estimatedUsd',e.estimated_cost_usd,'observedUsd',e.observed_cost_usd,'costStatus',e.cost_status,'pricingVersion',e.pricing_version,'requestedModel',e.model,'measurement',e.measurement) order by e.attempt_number),'[]'::jsonb) from detail_visible e where e.request_id=r.id)) order by r.created_at),'[]'::jsonb) from requests r where r.action_key=g.action_key and r.id in(select request_id from detail_visible)) end
 ) order by g.latest_at desc,g.action_key desc),'[]'::jsonb)) into report from visible g;
 return report;
end $$;
revoke all on function public.ai_cost_history_v1(integer,timestamptz,uuid,text,uuid,uuid,bigint) from public,anon,authenticated,service_role;
grant execute on function public.ai_cost_history_v1(integer,timestamptz,uuid,text,uuid,uuid,bigint) to authenticated;
comment on function public.ai_cost_history_v1(integer,timestamptz,uuid,text,uuid,uuid,bigint) is 'Active Super Admin only, read-only paginated metadata and commercial correlation; calculated costs are not provider invoices. No AI invocation.';
