begin;

create or replace function public.request_m51c_item_generation(
  p_organization_id uuid,
  p_generation_need_id uuid,
  p_quantity integer,
  p_target_scope text,
  p_estimated_cost_cents integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  policy public.assessment_ai_policies;
  spent integer;
  request_id uuid;
  need public.assessment_item_generation_needs;
  existing_request public.assessment_item_generation_requests;
  requests_today integer;
  last_request_at timestamptz;
begin
  if p_target_scope not in ('global', 'organization')
    or p_idempotency_key is null or trim(p_idempotency_key) = '' then
    raise exception 'M51C_INVALID_REQUEST';
  end if;
  actor_id := private.m51c_require_governance(p_organization_id, p_target_scope = 'global');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0)
  );
  select * into existing_request from public.assessment_item_generation_requests
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if existing_request.id is not null then
    if existing_request.generation_need_id <> p_generation_need_id
      or existing_request.target_scope <> p_target_scope
      or existing_request.requested_quantity <> p_quantity
      or existing_request.estimated_cost_cents <> p_estimated_cost_cents then
      raise exception 'M51C_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'requestId', existing_request.id, 'status', existing_request.status,
      'replayed', true
    );
  end if;
  select * into need from public.assessment_item_generation_needs
  where organization_id = p_organization_id and id = p_generation_need_id for update;
  if need.id is null or need.status not in ('open', 'requested', 'failed') then
    raise exception 'M51C_GENERATION_NEED_NOT_AVAILABLE';
  end if;
  if p_quantity < 1 or p_quantity > need.deficit then raise exception 'M51C_QUANTITY_EXCEEDS_GAP'; end if;

  select * into policy from public.assessment_ai_policies
  where organization_id = p_organization_id for update;
  if policy.id is null or not policy.generation_enabled
    or policy.provider is null or policy.model is null then
    raise exception 'M51C_AI_GENERATION_DISABLED';
  end if;
  if jsonb_array_length(policy.allowed_competencies) > 0
    and not (policy.allowed_competencies ? need.competency_key) then
    raise exception 'M51C_COMPETENCY_NOT_ALLOWED';
  end if;
  if p_estimated_cost_cents is null or p_estimated_cost_cents < 0 then
    raise exception 'M51C_UNKNOWN_COST';
  end if;
  if policy.maximum_cost_per_request_cents is null
    or p_estimated_cost_cents > policy.maximum_cost_per_request_cents then
    raise exception 'M51C_REQUEST_COST_CEILING_EXCEEDED';
  end if;
  if p_quantity > policy.maximum_items_per_request then raise exception 'M51C_REQUEST_LIMIT_EXCEEDED'; end if;

  select count(*)::integer, max(created_at)
  into requests_today, last_request_at
  from public.assessment_item_generation_requests
  where organization_id = p_organization_id and provider = 'external'
    and created_at >= date_trunc('day', now()) and status <> 'cancelled';
  if requests_today >= policy.maximum_requests_per_day then raise exception 'M51C_DAILY_REQUEST_LIMIT_EXCEEDED'; end if;
  if last_request_at is not null
    and last_request_at + make_interval(secs => policy.cooldown_seconds) > now() then
    raise exception 'M51C_GENERATION_COOLDOWN_ACTIVE';
  end if;

  select coalesce(sum(amount_cents), 0)::integer into spent
  from public.assessment_ai_budget_ledger
  where organization_id = p_organization_id
    and created_at >= date_trunc('month', now());
  if policy.monthly_limit_cents is null
    or spent + p_estimated_cost_cents > policy.monthly_limit_cents then
    raise exception 'M51C_BUDGET_EXCEEDED';
  end if;

  insert into public.assessment_item_generation_requests (
    organization_id, generation_need_id, target_scope, requested_quantity, directives,
    provider, model, status, estimated_cost_cents, prompt_version,
    idempotency_key, created_by_auth_user_id
  ) values (
    p_organization_id, p_generation_need_id, p_target_scope, p_quantity,
    jsonb_build_array('no_pii', 'no_web_search'), 'external', policy.model, 'queued',
    p_estimated_cost_cents, 'm51c-ai-item-generation-1.0.0',
    p_idempotency_key, actor_id
  ) returning id into request_id;
  insert into public.assessment_ai_budget_ledger (
    organization_id, generation_request_id, entry_type, amount_cents,
    provider, model, usage_metadata, created_by_auth_user_id
  ) values (
    p_organization_id, request_id, 'reservation', p_estimated_cost_cents,
    policy.provider, policy.model,
    jsonb_build_object('estimated', true, 'policyVersion', policy.policy_version), actor_id
  );
  update public.assessment_item_generation_needs
  set status = 'generating', updated_at = now()
  where id = need.id;
  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, action, result, payload
  ) values (
    p_organization_id, actor_id, 'm51c_generation_requested', 'success',
    jsonb_build_object(
      'request_id', request_id, 'generation_need_id', need.id,
      'estimated_cost_cents', p_estimated_cost_cents,
      'prompt_version', 'm51c-ai-item-generation-1.0.0'
    )
  );
  return jsonb_build_object(
    'requestId', request_id, 'status', 'queued', 'replayed', false,
    'estimatedCostCents', p_estimated_cost_cents
  );
end;
$$;

create or replace function public.complete_m51c_external_generation(
  p_request_id uuid,
  p_proposals jsonb,
  p_usage jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.assessment_item_generation_requests;
  proposal_value jsonb;
  sequence integer := 0;
  actual_cost integer;
  stem_value text;
begin
  select * into request_record from public.assessment_item_generation_requests
  where id = p_request_id for update;
  if request_record.id is null or request_record.provider <> 'external' then
    raise exception 'M51C_REQUEST_NOT_COMPLETABLE';
  end if;
  if request_record.status = 'completed' then
    select count(*)::integer into sequence from public.assessment_item_generation_proposals
    where organization_id = request_record.organization_id
      and generation_request_id = request_record.id;
    return jsonb_build_object(
      'requestId', request_record.id, 'proposalCount', sequence,
      'costCents', coalesce(request_record.actual_cost_cents, 0), 'replayed', true
    );
  end if;
  if request_record.status not in ('queued', 'processing') then raise exception 'M51C_REQUEST_NOT_COMPLETABLE'; end if;
  if jsonb_typeof(p_proposals) <> 'array'
    or jsonb_array_length(p_proposals) <> request_record.requested_quantity then
    raise exception 'M51C_INVALID_PROVIDER_OUTPUT';
  end if;
  actual_cost := (p_usage ->> 'costCents')::integer;
  if actual_cost is null or actual_cost < 0 then raise exception 'M51C_UNKNOWN_ACTUAL_COST'; end if;

  for proposal_value in select value from jsonb_array_elements(p_proposals) loop
    sequence := sequence + 1;
    stem_value := proposal_value ->> 'stem';
    if coalesce(stem_value, '') = ''
      or jsonb_typeof(proposal_value -> 'options') <> 'array'
      or jsonb_array_length(proposal_value -> 'options') < 2
      or coalesce(proposal_value ->> 'correctOptionId', '') = ''
      or coalesce(proposal_value ->> 'explanation', '') = ''
      or stem_value ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
      or stem_value ~* '([0-9]{3}[.-]?){3}[0-9]{2}' then
      raise exception 'M51C_INVALID_PROVIDER_OUTPUT';
    end if;
    insert into public.assessment_item_generation_proposals (
      organization_id, generation_request_id, proposal_sequence, proposed_item,
      content_fingerprint, validation_result, provider_provenance
    ) values (
      request_record.organization_id, request_record.id, sequence, proposal_value,
      private.m51c_item_fingerprint(stem_value),
      jsonb_build_object('valid', true, 'reasonCodes', jsonb_build_array('STRUCTURE_VALID')),
      jsonb_build_object(
        'provider', coalesce(p_usage ->> 'provider', 'external'),
        'model', request_record.model, 'synthetic', false,
        'promptVersion', request_record.prompt_version,
        'schemaVersion', request_record.schema_version,
        'usage', p_usage
      )
    );
  end loop;
  update public.assessment_item_generation_requests
  set status = 'completed', actual_cost_cents = actual_cost, completed_at = now()
  where id = request_record.id;
  insert into public.assessment_ai_budget_ledger (
    organization_id, generation_request_id, entry_type, amount_cents,
    provider, model, usage_metadata, created_by_auth_user_id
  ) values
  (
    request_record.organization_id, request_record.id, 'release',
    -coalesce(request_record.estimated_cost_cents, 0),
    coalesce(p_usage ->> 'provider', request_record.provider), request_record.model,
    jsonb_build_object('reservationReleased', true), request_record.created_by_auth_user_id
  ),
  (
    request_record.organization_id, request_record.id, 'usage', actual_cost,
    coalesce(p_usage ->> 'provider', request_record.provider), request_record.model,
    p_usage, request_record.created_by_auth_user_id
  );
  update public.assessment_item_generation_needs
  set status = 'generated', updated_at = now()
  where id = request_record.generation_need_id;
  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, action, result, payload
  ) values (
    request_record.organization_id, request_record.created_by_auth_user_id,
    'm51c_generation_completed', 'success',
    jsonb_build_object(
      'request_id', request_record.id, 'proposal_count', sequence,
      'actual_cost_cents', actual_cost, 'schema_version', request_record.schema_version
    )
  );
  return jsonb_build_object(
    'requestId', request_record.id, 'proposalCount', sequence,
    'costCents', actual_cost, 'replayed', false
  );
end;
$$;

create or replace function public.fail_m51c_external_generation(
  p_request_id uuid,
  p_error_class text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.assessment_item_generation_requests;
begin
  select * into request_record from public.assessment_item_generation_requests
  where id = p_request_id for update;
  if request_record.id is null or request_record.provider <> 'external' then
    raise exception 'M51C_REQUEST_NOT_FAILABLE';
  end if;
  if request_record.status = 'failed' then
    return jsonb_build_object('requestId', request_record.id, 'status', 'failed', 'replayed', true);
  end if;
  if request_record.status not in ('queued', 'processing') then raise exception 'M51C_REQUEST_NOT_FAILABLE'; end if;
  update public.assessment_item_generation_requests
  set status = 'failed', completed_at = now()
  where id = request_record.id;
  insert into public.assessment_ai_budget_ledger (
    organization_id, generation_request_id, entry_type, amount_cents,
    provider, model, usage_metadata, created_by_auth_user_id
  ) values (
    request_record.organization_id, request_record.id, 'release',
    -coalesce(request_record.estimated_cost_cents, 0), request_record.provider,
    request_record.model,
    jsonb_build_object('reservationReleased', true, 'errorClass', left(coalesce(p_error_class, 'provider_failure'), 80)),
    request_record.created_by_auth_user_id
  );
  update public.assessment_item_generation_needs
  set status = 'failed', updated_at = now()
  where id = request_record.generation_need_id;
  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, action, result, payload
  ) values (
    request_record.organization_id, request_record.created_by_auth_user_id,
    'm51c_generation_failed', 'failure',
    jsonb_build_object(
      'request_id', request_record.id,
      'error_class', left(coalesce(p_error_class, 'provider_failure'), 80)
    )
  );
  return jsonb_build_object('requestId', request_record.id, 'status', 'failed', 'replayed', false);
end;
$$;

create or replace function private.m51c_sync_generation_need_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  need_id uuid;
  pending_count integer;
  published_count integer;
  rejected_count integer;
begin
  select request.generation_need_id into need_id
  from public.assessment_item_generation_requests request
  where request.organization_id = new.organization_id
    and request.id = new.generation_request_id;
  select
    count(*) filter (where proposal.status in ('proposed', 'duplicate_candidate', 'in_review', 'approved')),
    count(*) filter (where proposal.status = 'published'),
    count(*) filter (where proposal.status in ('rejected', 'validation_failed', 'superseded'))
  into pending_count, published_count, rejected_count
  from public.assessment_item_generation_proposals proposal
  join public.assessment_item_generation_requests request
    on request.organization_id = proposal.organization_id
    and request.id = proposal.generation_request_id
  where request.organization_id = new.organization_id
    and request.generation_need_id = need_id;
  update public.assessment_item_generation_needs
  set status = case
    when pending_count > 0 and published_count > 0 then 'partially_approved'
    when pending_count > 0 then 'under_review'
    when published_count > 0 then 'resolved'
    when rejected_count > 0 then 'failed'
    else status
  end,
  updated_at = now()
  where id = need_id;
  return new;
end;
$$;
create trigger assessment_item_generation_proposals_sync_need
after insert or update of status on public.assessment_item_generation_proposals
for each row execute function private.m51c_sync_generation_need_status();

revoke all on function public.request_m51c_item_generation(uuid, uuid, integer, text, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_m51c_external_generation(uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_m51c_external_generation(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.m51c_sync_generation_need_status()
  from public, anon, authenticated, service_role;
grant execute on function public.request_m51c_item_generation(uuid, uuid, integer, text, integer, text) to authenticated;
grant execute on function public.complete_m51c_external_generation(uuid, jsonb, jsonb) to service_role;
grant execute on function public.fail_m51c_external_generation(uuid, text) to service_role;

commit;
