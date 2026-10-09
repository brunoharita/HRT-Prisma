-- ADR-080 / Agreement position-assessment-v230 v0.4.0 D-14.
-- Metadata only. No backfill, provider call, billing, expiration or deletion job.
create table public.ai_requests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  scope text not null check (scope in ('organization', 'platform')),
  organization_id uuid references public.organizations(id) on delete cascade,
  binding_id uuid generated always as (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  function_name text not null check (function_name ~ '^[a-z][a-z0-9_]{1,63}$'),
  operation_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  source_version text not null check (source_version ~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'),
  input_fingerprint text not null check (input_fingerprint ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  contract_version text not null default 'ai-request-1.0.0' check (contract_version = 'ai-request-1.0.0'),
  status text not null default 'requested' check (status in ('requested','running','succeeded','failed','cancelled')),
  error_category text check (error_category ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  check ((scope = 'organization' and organization_id is not null) or (scope = 'platform' and organization_id is null)),
  check ((status in ('requested','running') and completed_at is null and error_category is null)
    or (status = 'succeeded' and completed_at is not null and error_category is null)
    or (status in ('failed','cancelled') and completed_at is not null and error_category is not null)),
  unique (id, scope, binding_id),
  unique (scope, binding_id, function_name, idempotency_key)
);
create index ai_requests_org_created_idx on public.ai_requests (organization_id,created_at desc) where scope='organization';

-- Legacy rows retain their original values/default zero and are explicitly unverified.
-- Every v2 writer supplies NULL for unknown costs rather than using the v1 default.
alter table public.ai_usage_events
  alter column organization_id drop not null,
  alter column duration_ms drop not null,
  alter column estimated_cost_usd drop not null,
  alter column result drop not null,
  add column scope text not null default 'organization' check (scope in ('organization','platform')),
  add column binding_id uuid generated always as (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  add column contract_version text not null default 'ai-usage-events-1.0.0' check (contract_version in ('ai-usage-events-1.0.0','ai-usage-events-2.0.0')),
  add column request_id uuid,
  add column attempt_id uuid,
  add column attempt_number integer check (attempt_number > 0),
  add column usage_kind text not null default 'external' check (usage_kind in ('external','cache')),
  add column completed_at timestamptz,
  add column pricing_version text check (pricing_version ~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'),
  add column observed_cost_usd numeric(18,8),
  add column cost_evidence_hash text check (cost_evidence_hash ~ '^[a-f0-9]{64}$'),
  add column cost_status text not null default 'legacy_unverified' check (cost_status in ('legacy_unverified','unknown','estimated','observed','not_applicable')),
  add constraint ai_usage_tokens_nonnegative check ((input_tokens is null or input_tokens >= 0) and (output_tokens is null or output_tokens >= 0)),
  add constraint ai_usage_costs_valid check ((estimated_cost_usd is null or (estimated_cost_usd >= 0 and estimated_cost_usd < 'Infinity'::numeric))
    and (observed_cost_usd is null or (observed_cost_usd >= 0 and observed_cost_usd < 'Infinity'::numeric))),
  add constraint ai_usage_scope_valid check ((scope='organization' and organization_id is not null) or (scope='platform' and organization_id is null and document_id is null)),
  add constraint ai_usage_request_binding foreign key (request_id,scope,binding_id) references public.ai_requests(id,scope,binding_id) on delete cascade,
  add constraint ai_usage_attempt_unique unique (request_id,attempt_id),
  add constraint ai_usage_ordinal_unique unique (request_id,attempt_number),
  add constraint ai_usage_versioned_shape check (
    (contract_version='ai-usage-events-1.0.0' and scope='organization' and request_id is null and attempt_id is null and attempt_number is null
      and result is not null and duration_ms is not null and estimated_cost_usd is not null and cost_status='legacy_unverified')
    or (contract_version='ai-usage-events-2.0.0' and request_id is not null and attempt_id is not null and attempt_number is not null
      and ((result is null and completed_at is null and duration_ms is null and input_tokens is null and output_tokens is null
          and estimated_cost_usd is null and observed_cost_usd is null and cost_status='unknown' and error_category is null and cost_evidence_hash is null)
        or (result is not null and completed_at is not null and duration_ms is not null
          and ((result='success' and error_category is null) or (result='failure' and error_category is not null))
          and ((usage_kind='cache' and result='success' and input_tokens is null and output_tokens is null
              and estimated_cost_usd is not distinct from 0 and observed_cost_usd is not distinct from 0 and cost_status='not_applicable' and cost_evidence_hash is null)
            or (usage_kind='external' and (
              (cost_status='unknown' and estimated_cost_usd is null and observed_cost_usd is null and cost_evidence_hash is null)
              or (cost_status='estimated' and estimated_cost_usd is not null and observed_cost_usd is null and cost_evidence_hash is null)
              or (cost_status='observed' and observed_cost_usd is not null and cost_evidence_hash is not null))
              and (estimated_cost_usd is null or (pricing_version is not null and input_tokens is not null and output_tokens is not null)))))))
  );
create index ai_usage_request_idx on public.ai_usage_events(request_id,attempt_number) where request_id is not null;

alter table public.ai_requests enable row level security;
drop policy if exists usage_events_select on public.ai_usage_events;
create policy usage_events_select on public.ai_usage_events for select to authenticated
  using (scope='organization' and organization_id is not null
    and (select private.has_org_role(organization_id,array['owner','admin','recruiter']::public.membership_role[])));
create policy ai_requests_select on public.ai_requests for select to authenticated
  using (scope='organization' and organization_id is not null
    and (select private.has_org_role(organization_id,array['owner','admin','recruiter']::public.membership_role[])));
revoke all on public.ai_requests,public.ai_usage_events from public,anon,authenticated,service_role;
grant select on public.ai_requests,public.ai_usage_events to authenticated;
revoke all on sequence public.ai_usage_events_id_seq from public,anon,authenticated,service_role;

-- Privileged metadata writer, callable only by the trusted backend role (or an
-- already authorized SECURITY DEFINER boundary). No browser-editable authority.
create function private.record_ai_history_v1(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  allowed text[]; req public.ai_requests; evt public.ai_usage_events;
  org uuid; req_id uuid; attempt uuid; actor uuid; kind text; outcome text;
  input_count integer; output_count integer; elapsed integer;
  estimate numeric; observed numeric; reason text; evidence_hash text;
begin
  if p_action is null or p_data is null or jsonb_typeof(p_data)<>'object' then
    raise exception using errcode='22023',message='AI_HISTORY_INVALID_INPUT';
  end if;
  allowed := case p_action
    when 'open_request' then array['scope','organizationId','functionName','operationId','actorId','sourceVersion','inputFingerprint','idempotencyKey']
    when 'begin_attempt' then array['requestId','organizationId','attemptId','stage','provider','model','methodVersion','usageKind','pricingVersion']
    when 'complete_attempt' then array['requestId','organizationId','attemptId','result','durationMs','inputTokens','outputTokens','estimatedCostUsd','observedCostUsd','costEvidenceHash','errorCategory']
    when 'complete_request' then array['requestId','organizationId','status','errorCategory']
    when 'get_request' then array['requestId','organizationId'] else null end;
  if allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed))) then
    raise exception using errcode='22023',message='AI_HISTORY_FIELDS_REJECTED';
  end if;
  -- Never treat a missing organization binding as an explicit global request.
  if not(p_data ? 'organizationId') then raise exception using errcode='22023',message='AI_HISTORY_SCOPE_REQUIRED'; end if;
  org := (p_data->>'organizationId')::uuid;
  if p_action='open_request' then
    actor := (p_data->>'actorId')::uuid;
    if actor is not null and not exists(select 1 from public.platform_users u
      where u.auth_user_id=actor and u.status='active' and
        ((p_data->>'scope'='platform' and u.access_profile='super_admin')
          or (p_data->>'scope'='organization' and (u.access_profile='super_admin' or exists(
            select 1 from public.organization_memberships m where m.user_id=actor and m.organization_id=org))))) then
      raise exception using errcode='42501',message='AI_HISTORY_ACTOR_SCOPE_INVALID';
    end if;
    insert into public.ai_requests(scope,organization_id,function_name,operation_id,actor_id,source_version,input_fingerprint,idempotency_key)
      values(p_data->>'scope',org,p_data->>'functionName',(p_data->>'operationId')::uuid,actor,p_data->>'sourceVersion',p_data->>'inputFingerprint',p_data->>'idempotencyKey')
      on conflict(scope,binding_id,function_name,idempotency_key) do nothing returning * into req;
    if found then return jsonb_build_object('request',to_jsonb(req)-'binding_id','created',true); end if;
    select * into req from public.ai_requests where scope=p_data->>'scope'
      and organization_id is not distinct from org and function_name=p_data->>'functionName' and idempotency_key=p_data->>'idempotencyKey' for update;
    if req.operation_id is distinct from (p_data->>'operationId')::uuid or req.actor_id is distinct from actor
      or req.source_version is distinct from p_data->>'sourceVersion' or req.input_fingerprint is distinct from p_data->>'inputFingerprint' then
      raise exception using errcode='40001',message='AI_HISTORY_REQUEST_CONFLICT';
    end if;
    return jsonb_build_object('request',to_jsonb(req)-'binding_id','created',false);
  end if;
  req_id := (p_data->>'requestId')::uuid;
  select * into req from public.ai_requests where id=req_id and organization_id is not distinct from org for update;
  if not found then raise exception using errcode='42501',message='AI_HISTORY_REQUEST_SCOPE_INVALID'; end if;
  if p_action='get_request' then
    return jsonb_build_object('request',to_jsonb(req)-'binding_id','attempts',coalesce((select jsonb_agg(to_jsonb(e)-'binding_id' order by attempt_number)
      from public.ai_usage_events e where e.request_id=req.id),'[]'::jsonb));
  end if;
  if p_action='begin_attempt' then
    attempt := (p_data->>'attemptId')::uuid;
    kind := p_data->>'usageKind';
    select * into evt from public.ai_usage_events where request_id=req.id and attempt_id=attempt;
    if found then
      if evt.stage is distinct from p_data->>'stage' or evt.provider is distinct from p_data->>'provider'
        or evt.model is distinct from p_data->>'model' or evt.version is distinct from p_data->>'methodVersion'
        or evt.usage_kind is distinct from kind or evt.pricing_version is distinct from p_data->>'pricingVersion' then
        raise exception using errcode='40001',message='AI_HISTORY_ATTEMPT_CONFLICT';
      end if;
      return jsonb_build_object('eventId',evt.id,'attemptNumber',evt.attempt_number,'acquired',false);
    end if;
    if req.status not in ('requested','running') then raise exception using errcode='40001',message='AI_HISTORY_REQUEST_CLOSED'; end if;
    if (p_data->>'stage') is null or (p_data->>'stage') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'
      or (p_data->>'provider') is null or (p_data->>'provider') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'
      or (p_data->>'model') is null or (p_data->>'model') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'
      or (p_data->>'methodVersion') is null or (p_data->>'methodVersion') !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}$'
      or kind is null or kind not in ('external','cache')
      or (kind='cache' and ((p_data->>'provider')<>'cache' or (p_data->>'model')<>'none' or p_data->>'pricingVersion' is not null)) then
      raise exception using errcode='22023',message='AI_HISTORY_ATTEMPT_METADATA_INVALID';
    end if;
    insert into public.ai_usage_events(organization_id,process_id,stage,duration_ms,provider,model,version,input_tokens,output_tokens,estimated_cost_usd,result,
      scope,contract_version,request_id,attempt_id,attempt_number,usage_kind,pricing_version,cost_status)
      values(org,req.operation_id,p_data->>'stage',null,p_data->>'provider',p_data->>'model',p_data->>'methodVersion',null,null,null,null,
        req.scope,'ai-usage-events-2.0.0',req.id,attempt,
        (select coalesce(max(attempt_number),0)+1 from public.ai_usage_events where request_id=req.id),kind,p_data->>'pricingVersion','unknown') returning * into evt;
    update public.ai_requests set status='running' where id=req.id;
    return jsonb_build_object('eventId',evt.id,'attemptNumber',evt.attempt_number,'acquired',true);
  end if;
  if p_action='complete_attempt' then
    attempt := (p_data->>'attemptId')::uuid;
    select * into evt from public.ai_usage_events where request_id=req.id and attempt_id=attempt for update;
    if not found then raise exception using errcode='22023',message='AI_HISTORY_ATTEMPT_REQUIRED'; end if;
    outcome:=p_data->>'result'; elapsed:=(p_data->>'durationMs')::integer;
    input_count:=(p_data->>'inputTokens')::integer; output_count:=(p_data->>'outputTokens')::integer;
    estimate:=(p_data->>'estimatedCostUsd')::numeric; observed:=(p_data->>'observedCostUsd')::numeric;
    evidence_hash:=p_data->>'costEvidenceHash'; reason:=p_data->>'errorCategory';
    if outcome is null or outcome not in ('success','failure') or elapsed is null or elapsed<0
      or (input_count is not null and input_count<0) or (output_count is not null and output_count<0)
      or (estimate is not null and not(estimate>=0 and estimate<'Infinity'::numeric))
      or (observed is not null and not(observed>=0 and observed<'Infinity'::numeric))
      or (estimate is not null and evt.usage_kind='external' and (evt.pricing_version is null or input_count is null or output_count is null))
      or (observed is not null and evt.usage_kind='external' and evidence_hash is null)
      or (observed is null and evidence_hash is not null)
      or (outcome='failure' and (reason is null or reason !~ '^[A-Z][A-Z0-9_]{1,63}$')) or (outcome='success' and reason is not null)
      or (evt.usage_kind='cache' and (outcome<>'success' or input_count is not null or output_count is not null or estimate is distinct from 0 or observed is distinct from 0 or evidence_hash is not null)) then
      raise exception using errcode='22023',message='AI_HISTORY_USAGE_INVALID';
    end if;
    -- Same payload replays identically at persisted USD precision, including floats.
    estimate:=round(estimate,8); observed:=round(observed,8);
    if evt.completed_at is not null then
      if evt.result is distinct from outcome or evt.duration_ms is distinct from elapsed
        or evt.input_tokens is distinct from input_count or evt.output_tokens is distinct from output_count
        or evt.estimated_cost_usd is distinct from estimate or evt.observed_cost_usd is distinct from observed
        or evt.cost_evidence_hash is distinct from evidence_hash or evt.error_category is distinct from reason then
        raise exception using errcode='40001',message='AI_HISTORY_USAGE_CONFLICT';
      end if;
      return jsonb_build_object('eventId',evt.id,'recorded',false);
    end if;
    update public.ai_usage_events set result=outcome,duration_ms=elapsed,input_tokens=input_count,output_tokens=output_count,
      estimated_cost_usd=estimate,observed_cost_usd=observed,cost_evidence_hash=evidence_hash,error_category=reason,completed_at=clock_timestamp(),
      cost_status=case when usage_kind='cache' then 'not_applicable' when observed is not null then 'observed' when estimate is not null then 'estimated' else 'unknown' end
      where id=evt.id;
    return jsonb_build_object('eventId',evt.id,'recorded',true);
  end if;
  outcome:=p_data->>'status'; reason:=p_data->>'errorCategory';
  if outcome is null or outcome not in ('succeeded','failed','cancelled')
    or (outcome='succeeded' and reason is not null)
    or (outcome in ('failed','cancelled') and (reason is null or reason !~ '^[A-Z][A-Z0-9_]{1,63}$')) then
    raise exception using errcode='22023',message='AI_HISTORY_STATUS_INVALID';
  end if;
  if req.status in ('succeeded','failed','cancelled') then
    if req.status<>outcome or req.error_category is distinct from reason then raise exception using errcode='40001',message='AI_HISTORY_STATUS_CONFLICT'; end if;
    return jsonb_build_object('request',to_jsonb(req)-'binding_id','recorded',false);
  end if;
  if exists(select 1 from public.ai_usage_events where request_id=req.id and result is null)
    or (outcome='succeeded' and not exists(select 1 from public.ai_usage_events where request_id=req.id and result='success')) then
    raise exception using errcode='40001',message='AI_HISTORY_ATTEMPTS_UNRESOLVED';
  end if;
  update public.ai_requests set status=outcome,error_category=reason,completed_at=clock_timestamp() where id=req.id returning * into req;
  return jsonb_build_object('request',to_jsonb(req)-'binding_id','recorded',true);
exception
  when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation then
    raise exception using errcode='22023',message='AI_HISTORY_INVALID_INPUT';
  when foreign_key_violation then
    raise exception using errcode='42501',message='AI_HISTORY_SCOPE_INVALID';
  when unique_violation then
    raise exception using errcode='40001',message='AI_HISTORY_CONFLICT';
end $$;
revoke all on function private.record_ai_history_v1(text,jsonb) from public,anon,authenticated,service_role;

create function public.record_ai_history_v1(p_action text,p_data jsonb) returns jsonb
-- EXECUTE is restricted to service_role. Definer permits the one atomic writer
-- without granting the worker access to the private schema or direct table DML.
-- Human auth/tenant authority stays in each consumer's original boundary.
language sql security definer set search_path='' as $$ select private.record_ai_history_v1(p_action,p_data) $$;
revoke all on function public.record_ai_history_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.record_ai_history_v1(text,jsonb) to service_role;
comment on function public.record_ai_history_v1(text,jsonb) is 'Trusted backend metadata only; authorize original operation before calling. No provider invocation or billing. Persist acquired attempt before external call; duplicate acquisition must not call provider again.';
