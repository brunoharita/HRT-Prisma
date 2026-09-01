begin;

alter table public.assessment_items drop constraint if exists assessment_items_state_check;
alter table public.assessment_items add constraint assessment_items_state_check
check (state in ('proposed', 'in_review', 'approved', 'active', 'rejected', 'inactive', 'retired', 'deprecated', 'compromised'));
alter table public.assessment_items
  add column defined_difficulty text not null default 'medium' check (defined_difficulty in ('low', 'medium', 'high')),
  add column calibration_state text not null default 'defined' check (calibration_state in ('defined', 'collecting_data', 'provisional', 'calibrated', 'review_required')),
  add column expected_time_min_seconds integer not null default 60 check (expected_time_min_seconds >= 0),
  add column expected_time_typical_seconds integer not null default 120 check (expected_time_typical_seconds >= expected_time_min_seconds),
  add column expected_time_max_seconds integer not null default 240 check (expected_time_max_seconds >= expected_time_typical_seconds),
  add column content_fingerprint text,
  add column provenance jsonb not null default '{"origin":"manual_or_legacy"}'::jsonb,
  add column human_approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  add column human_approved_at timestamptz,
  add constraint assessment_items_provenance_object check (jsonb_typeof(provenance) = 'object'),
  add constraint assessment_items_human_approval_complete check (
    (human_approved_by_auth_user_id is null and human_approved_at is null)
    or (human_approved_by_auth_user_id is not null and human_approved_at is not null)
  );

create index assessment_items_governance_idx
on public.assessment_items (organization_id, state, calibration_state, defined_difficulty);

create table public.assessment_item_generation_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  blueprint_id uuid not null references public.assessment_blueprints(id) on delete restrict,
  competency_key text not null,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  dimension text not null,
  modality text not null default 'multiple_choice' check (modality in ('multiple_choice')),
  language text not null default 'pt-BR',
  required_items integer not null check (required_items > 0),
  eligible_items integer not null check (eligible_items >= 0),
  deficit integer not null check (deficit > 0),
  reason_codes jsonb not null,
  status text not null default 'open' check (status in ('open', 'requested', 'resolved', 'cancelled')),
  analysis_version text not null default 'm51c-gap-analysis-1.0.0',
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (jsonb_typeof(reason_codes) = 'array')
);

create table public.assessment_item_generation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_need_id uuid not null,
  target_scope text not null check (target_scope in ('global', 'organization')),
  requested_quantity integer not null check (requested_quantity between 1 and 50),
  directives jsonb not null default '[]'::jsonb,
  provider text not null check (provider in ('fake-deterministic', 'external')),
  model text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled', 'budget_blocked')),
  estimated_cost_cents integer check (estimated_cost_cents >= 0),
  actual_cost_cents integer check (actual_cost_cents >= 0),
  prompt_version text not null,
  schema_version text not null default 'm51c-item-proposal-1.0.0',
  idempotency_key text not null,
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, generation_need_id)
    references public.assessment_item_generation_needs(organization_id, id) on delete restrict,
  check (jsonb_typeof(directives) = 'array')
);

create table public.assessment_item_generation_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_request_id uuid not null,
  proposal_sequence integer not null check (proposal_sequence > 0),
  proposed_item jsonb not null,
  content_fingerprint text not null,
  maximum_lexical_similarity numeric(6,4) not null default 0 check (maximum_lexical_similarity between 0 and 1),
  duplicate_candidates jsonb not null default '[]'::jsonb,
  validation_result jsonb not null,
  status text not null default 'proposed' check (status in ('proposed', 'in_review', 'approved', 'rejected', 'published')),
  provider_provenance jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, generation_request_id, proposal_sequence),
  foreign key (organization_id, generation_request_id)
    references public.assessment_item_generation_requests(organization_id, id) on delete cascade,
  check (jsonb_typeof(proposed_item) = 'object'),
  check (jsonb_typeof(duplicate_candidates) = 'array'),
  check (jsonb_typeof(validation_result) = 'object'),
  check (jsonb_typeof(provider_provenance) = 'object')
);

create table public.assessment_item_generation_reviews (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null,
  reviewer_auth_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approve', 'reject', 'request_changes')),
  rationale text not null,
  reviewed_snapshot jsonb not null,
  review_version text not null default 'm51c-human-item-review-1.0.0',
  created_at timestamptz not null default now(),
  foreign key (organization_id, proposal_id)
    references public.assessment_item_generation_proposals(organization_id, id) on delete restrict,
  check (jsonb_typeof(reviewed_snapshot) = 'object')
);

create table public.assessment_item_calibration_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  assessment_item_id uuid not null references public.assessment_items(id) on delete restrict,
  sample_kind text not null check (sample_kind in ('synthetic_qa', 'real_anonymized')),
  application_count integer not null default 0 check (application_count >= 0),
  correct_rate numeric(6,4) check (correct_rate between 0 and 1),
  median_time_seconds numeric(12,2) check (median_time_seconds >= 0),
  observed_difficulty numeric(6,4) check (observed_difficulty between 0 and 1),
  calibration_state text not null check (calibration_state in ('defined', 'collecting_data', 'provisional', 'calibrated', 'review_required')),
  reason_codes jsonb not null,
  analytics_version text not null default 'm51c-item-analytics-1.0.0',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(reason_codes) = 'array'),
  check (sample_kind = 'real_anonymized' or (correct_rate is null and observed_difficulty is null and calibration_state <> 'calibrated'))
);

create table public.assessment_item_quality_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  assessment_item_id uuid not null references public.assessment_items(id) on delete restrict,
  flag_code text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (jsonb_typeof(evidence) = 'object')
);

create table public.assessment_ai_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  generation_enabled boolean not null default false,
  provider text,
  model text,
  monthly_limit_cents integer check (monthly_limit_cents > 0),
  maximum_items_per_request integer not null default 5 check (maximum_items_per_request between 1 and 50),
  require_human_review boolean not null default true check (require_human_review),
  allow_pii boolean not null default false check (not allow_pii),
  allow_web_search boolean not null default false check (not allow_web_search),
  policy_version text not null default 'm51c-ai-generation-policy-1.0.0',
  updated_by_auth_user_id uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.assessment_ai_budget_ledger (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_request_id uuid,
  entry_type text not null check (entry_type in ('reservation', 'usage', 'release', 'adjustment')),
  amount_cents integer not null,
  provider text,
  model text,
  usage_metadata jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, generation_request_id)
    references public.assessment_item_generation_requests(organization_id, id) on delete restrict,
  check (jsonb_typeof(usage_metadata) = 'object')
);

create index assessment_generation_needs_scope_idx on public.assessment_item_generation_needs (organization_id, status, created_at desc);
create index assessment_generation_requests_scope_idx on public.assessment_item_generation_requests (organization_id, status, created_at desc);
create index assessment_generation_proposals_scope_idx on public.assessment_item_generation_proposals (organization_id, status, created_at desc);
create index assessment_generation_proposals_fingerprint_idx on public.assessment_item_generation_proposals (content_fingerprint);
create index assessment_calibration_item_idx on public.assessment_item_calibration_snapshots (assessment_item_id, calculated_at desc);
create index assessment_quality_item_idx on public.assessment_item_quality_flags (assessment_item_id, status);
create index assessment_budget_scope_idx on public.assessment_ai_budget_ledger (organization_id, created_at desc);

create or replace function private.m51c_require_governance(p_organization_id uuid, p_global boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_profile text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'M51C_AUTH_REQUIRED';
  end if;
  select platform_user.access_profile::text into actor_profile
  from public.platform_users platform_user
  where platform_user.auth_user_id = actor_id and platform_user.status::text = 'active';
  if actor_profile is null then
    raise exception using errcode = '42501', message = 'M51C_ACTIVE_OPERATOR_REQUIRED';
  end if;
  if p_global and actor_profile <> 'super_admin' then
    raise exception using errcode = '42501', message = 'M51C_GLOBAL_SCOPE_REQUIRES_SUPER_ADMIN';
  end if;
  if not p_global and not private.has_org_role(
    p_organization_id,
    array['super_admin', 'owner', 'admin']::public.membership_role[]
  ) then
    raise exception using errcode = '42501', message = 'M51C_GOVERNANCE_ROLE_REQUIRED';
  end if;
  return actor_id;
end;
$$;

create or replace function private.m51c_item_fingerprint(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.encode(extensions.digest(
    pg_catalog.convert_to(pg_catalog.lower(pg_catalog.regexp_replace(coalesce(p_text, ''), '[^a-zA-Z0-9]+', ' ', 'g')), 'UTF8'),
    'sha256'
  ), 'hex');
$$;

create or replace function public.load_m51c_item_bank_workspace(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  result jsonb;
begin
  actor_id := private.m51c_require_governance(p_organization_id, false);
  insert into public.assessment_ai_policies (organization_id) values (p_organization_id) on conflict (organization_id) do nothing;

  with targets as (
    select blueprint.id as blueprint_id, blueprint.blueprint_key, definition.competency_key, definition.target_level,
      blueprint.modality, blueprint.language, distribution.value ->> 'dimension' as dimension,
      greatest((distribution.value ->> 'count')::integer, 0) as blueprint_count,
      greatest((distribution.value ->> 'count')::integer, 0) + 2 as required_items
    from public.assessment_blueprints blueprint
    join public.verification_definitions definition on definition.id = blueprint.definition_id
    cross join lateral jsonb_array_elements(blueprint.dimension_distribution) distribution(value)
    where blueprint.status = 'active' and definition.status = 'active'
      and (blueprint.organization_id is null or blueprint.organization_id = p_organization_id)
      and (definition.organization_id is null or definition.organization_id = p_organization_id)
  ), eligible as (
    select target.blueprint_id, target.dimension, count(item.id)::integer as eligible_items
    from targets target
    left join public.assessment_items item on item.competency_key = target.competency_key
      and item.target_level = target.target_level and item.dimension = target.dimension
      and item.modality = target.modality and item.language = target.language
      and item.state = 'active' and (item.organization_id is null or item.organization_id = p_organization_id)
    group by target.blueprint_id, target.dimension
  ), gaps as (
    select target.*, eligible.eligible_items, greatest(target.required_items - eligible.eligible_items, 0) as deficit
    from targets target join eligible using (blueprint_id, dimension)
  )
  select jsonb_build_object(
    'versions', jsonb_build_object('gapAnalysis', 'm51c-gap-analysis-1.0.0', 'analytics', 'm51c-item-analytics-1.0.0', 'calibration', 'm51c-item-calibration-1.0.0'),
    'gaps', coalesce((select jsonb_agg(jsonb_build_object(
      'key', gap.blueprint_id::text || ':' || gap.dimension, 'blueprintId', gap.blueprint_id, 'blueprintKey', gap.blueprint_key,
      'competencyKey', gap.competency_key, 'targetLevel', gap.target_level, 'dimension', gap.dimension,
      'modality', gap.modality, 'language', gap.language, 'requiredItems', gap.required_items,
      'eligibleItems', gap.eligible_items, 'deficit', gap.deficit,
      'reasonCodes', case when gap.deficit > 0 then jsonb_build_array('ELIGIBLE_ITEM_COVERAGE_GAP') else jsonb_build_array('COVERAGE_SUFFICIENT') end
    ) order by gap.blueprint_key, gap.dimension) from gaps gap), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', item.id, 'key', item.item_key, 'version', item.version, 'scope', item.source,
      'organizationId', item.organization_id, 'competencyKey', item.competency_key, 'targetLevel', item.target_level,
      'dimension', item.dimension, 'state', item.state, 'definedDifficulty', item.defined_difficulty,
      'calibrationState', item.calibration_state, 'stem', item.stem,
      'applicationCount', coalesce(metrics.application_count, 0), 'correctRate', metrics.correct_rate,
      'medianTimeSeconds', metrics.median_time_seconds, 'observedDifficulty', metrics.observed_difficulty
    ) order by item.item_key) from public.assessment_items item
      left join lateral (select snapshot.application_count, snapshot.correct_rate, snapshot.median_time_seconds, snapshot.observed_difficulty
        from public.assessment_item_calibration_snapshots snapshot where snapshot.assessment_item_id = item.id
        order by snapshot.calculated_at desc limit 1) metrics on true
      where item.organization_id is null or item.organization_id = p_organization_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', request.id, 'status', request.status, 'provider', request.provider,
      'quantity', request.requested_quantity, 'targetScope', request.target_scope, 'createdAt', request.created_at)
      order by request.created_at desc) from public.assessment_item_generation_requests request where request.organization_id = p_organization_id), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object('id', proposal.id, 'requestId', proposal.generation_request_id,
      'status', proposal.status, 'item', proposal.proposed_item, 'fingerprint', proposal.content_fingerprint,
      'similarity', proposal.maximum_lexical_similarity, 'validation', proposal.validation_result,
      'provenance', proposal.provider_provenance, 'createdAt', proposal.created_at)
      order by proposal.created_at desc, proposal.proposal_sequence)
      from public.assessment_item_generation_proposals proposal where proposal.organization_id = p_organization_id), '[]'::jsonb),
    'policy', (select jsonb_build_object('generationEnabled', policy.generation_enabled, 'provider', policy.provider, 'model', policy.model,
      'monthlyLimitCents', policy.monthly_limit_cents, 'maximumItemsPerRequest', policy.maximum_items_per_request,
      'requireHumanReview', policy.require_human_review, 'allowPii', policy.allow_pii, 'allowWebSearch', policy.allow_web_search,
      'version', policy.policy_version,
      'spentCents', coalesce((select sum(ledger.amount_cents) from public.assessment_ai_budget_ledger ledger
        where ledger.organization_id = p_organization_id and ledger.entry_type = 'usage'
          and ledger.created_at >= date_trunc('month', now())), 0)) from public.assessment_ai_policies policy where policy.organization_id = p_organization_id)
  ) into result;
  perform actor_id;
  return result;
end;
$$;

create or replace function public.create_m51c_fake_generation_request(
  p_organization_id uuid,
  p_blueprint_id uuid,
  p_dimension text,
  p_quantity integer,
  p_target_scope text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  blueprint record;
  eligible_count integer;
  target_count integer;
  need public.assessment_item_generation_needs;
  request_record public.assessment_item_generation_requests;
  replay_proposal_count integer;
  sequence integer;
  item_payload jsonb;
  stem_value text;
begin
  if p_target_scope not in ('global', 'organization') or p_quantity not between 1 and 20
    or p_idempotency_key is null or trim(p_idempotency_key) = '' then raise exception 'M51C_INVALID_REQUEST'; end if;
  actor_id := private.m51c_require_governance(p_organization_id, p_target_scope = 'global');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));
  select * into request_record from public.assessment_item_generation_requests
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if request_record.id is not null then
    if request_record.target_scope <> p_target_scope or request_record.requested_quantity <> p_quantity then
      raise exception 'M51C_IDEMPOTENCY_CONFLICT';
    end if;
    select count(*)::integer into replay_proposal_count from public.assessment_item_generation_proposals
    where organization_id = p_organization_id and generation_request_id = request_record.id;
    return jsonb_build_object('requestId', request_record.id, 'proposalCount', replay_proposal_count,
      'provider', request_record.provider, 'costCents', coalesce(request_record.actual_cost_cents, 0), 'replayed', true);
  end if;
  select bp.*, definition.competency_key, definition.target_level into blueprint
  from public.assessment_blueprints bp join public.verification_definitions definition on definition.id = bp.definition_id
  where bp.id = p_blueprint_id and bp.status = 'active' and (bp.organization_id is null or bp.organization_id = p_organization_id);
  if blueprint.id is null then raise exception 'M51C_BLUEPRINT_NOT_FOUND'; end if;
  select coalesce((value ->> 'count')::integer, 0) + 2 into target_count
  from jsonb_array_elements(blueprint.dimension_distribution) where value ->> 'dimension' = p_dimension;
  if target_count is null then raise exception 'M51C_DIMENSION_NOT_IN_BLUEPRINT'; end if;
  select count(*)::integer into eligible_count from public.assessment_items item
  where item.state = 'active' and item.competency_key = blueprint.competency_key and item.target_level = blueprint.target_level
    and item.dimension = p_dimension and item.modality = blueprint.modality and item.language = blueprint.language
    and (item.organization_id is null or item.organization_id = p_organization_id);
  if target_count - eligible_count <= 0 then raise exception 'M51C_NO_GAP_TO_GENERATE'; end if;
  if p_quantity > target_count - eligible_count then raise exception 'M51C_QUANTITY_EXCEEDS_GAP'; end if;

  insert into public.assessment_item_generation_needs (organization_id, blueprint_id, competency_key, target_level, dimension,
    modality, language, required_items, eligible_items, deficit, reason_codes, status, created_by_auth_user_id)
  values (p_organization_id, blueprint.id, blueprint.competency_key, blueprint.target_level, p_dimension,
    blueprint.modality, blueprint.language, target_count, eligible_count, target_count - eligible_count,
    jsonb_build_array('ELIGIBLE_ITEM_COVERAGE_GAP', 'QA_FAKE_PROVIDER_ALLOWED'), 'requested', actor_id)
  returning * into need;
  insert into public.assessment_item_generation_requests (organization_id, generation_need_id, target_scope, requested_quantity,
    directives, provider, model, status, estimated_cost_cents, actual_cost_cents, prompt_version, idempotency_key, created_by_auth_user_id, completed_at)
  values (p_organization_id, need.id, p_target_scope, p_quantity, jsonb_build_array('synthetic_qa_only', 'no_pii', 'no_web_search'),
    'fake-deterministic', 'not-applicable-no-llm', 'completed', 0, 0, 'm51c-fake-item-generation-1.0.0', p_idempotency_key, actor_id, now())
  on conflict (organization_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning * into request_record;

  for sequence in 1..p_quantity loop
    stem_value := '[QA sintético] Cenário ' || sequence || ' de ' || p_dimension || ': qual alternativa atende ao objetivo com maior consistência?';
    item_payload := jsonb_build_object(
      'key', 'M51C-' || upper(blueprint.competency_key) || '-' || upper(replace(p_dimension, ' ', '-')) || '-'
        || right(replace(request_record.id::text, '-', ''), 8) || '-' || sequence,
      'competencyKey', blueprint.competency_key, 'targetLevel', blueprint.target_level, 'dimension', p_dimension,
      'difficulty', case blueprint.target_level when 'advanced' then 'high' when 'intermediate' then 'medium' else 'low' end,
      'language', blueprint.language, 'modality', blueprint.modality, 'stem', stem_value,
      'options', jsonb_build_array(jsonb_build_object('id','A','label','[QA] Alternativa A'), jsonb_build_object('id','B','label','[QA] Alternativa B'),
        jsonb_build_object('id','C','label','[QA] Alternativa C'), jsonb_build_object('id','D','label','[QA] Alternativa D')),
      'correctOptionId', 'B', 'explanation', '[QA sintético] A alternativa B é a referência determinística.',
      'expectedTimeMinSeconds', 60, 'expectedTimeTypicalSeconds', 120, 'expectedTimeMaxSeconds', 240
    );
    insert into public.assessment_item_generation_proposals (organization_id, generation_request_id, proposal_sequence,
      proposed_item, content_fingerprint, validation_result, provider_provenance)
    values (p_organization_id, request_record.id, sequence, item_payload, private.m51c_item_fingerprint(stem_value),
      jsonb_build_object('valid', true, 'reasonCodes', jsonb_build_array('SCHEMA_VALID')),
      jsonb_build_object('provider','fake-deterministic','model','not-applicable-no-llm','synthetic',true,
        'promptVersion','m51c-fake-item-generation-1.0.0','schemaVersion','m51c-item-proposal-1.0.0'));
  end loop;
  insert into public.verification_audit_events (organization_id, actor_auth_user_id, action, result, payload)
  values (p_organization_id, actor_id, 'm51c_fake_generation_completed', 'success',
    jsonb_build_object('request_id', request_record.id, 'quantity', p_quantity, 'cost_cents', 0));
  return jsonb_build_object('requestId', request_record.id, 'proposalCount', p_quantity, 'provider', request_record.provider, 'costCents', 0);
end;
$$;

create or replace function public.request_m51c_item_generation(
  p_organization_id uuid, p_generation_need_id uuid, p_quantity integer, p_target_scope text,
  p_estimated_cost_cents integer, p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid; policy public.assessment_ai_policies; spent integer; request_id uuid;
  need public.assessment_item_generation_needs; existing_request public.assessment_item_generation_requests;
begin
  if p_target_scope not in ('global', 'organization') or p_idempotency_key is null or trim(p_idempotency_key) = '' then
    raise exception 'M51C_INVALID_REQUEST';
  end if;
  actor_id := private.m51c_require_governance(p_organization_id, p_target_scope = 'global');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text || ':' || p_idempotency_key, 0));
  select * into existing_request from public.assessment_item_generation_requests
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if existing_request.id is not null then
    if existing_request.generation_need_id <> p_generation_need_id or existing_request.target_scope <> p_target_scope
      or existing_request.requested_quantity <> p_quantity or existing_request.estimated_cost_cents <> p_estimated_cost_cents then
      raise exception 'M51C_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('requestId', existing_request.id, 'status', existing_request.status, 'replayed', true);
  end if;
  select * into need from public.assessment_item_generation_needs
  where organization_id = p_organization_id and id = p_generation_need_id for update;
  if need.id is null or need.status not in ('open', 'requested') then raise exception 'M51C_GENERATION_NEED_NOT_AVAILABLE'; end if;
  if p_quantity < 1 or p_quantity > need.deficit then raise exception 'M51C_QUANTITY_EXCEEDS_GAP'; end if;
  select * into policy from public.assessment_ai_policies where organization_id = p_organization_id;
  if policy.id is null or not policy.generation_enabled or policy.provider is null or policy.model is null then
    raise exception 'M51C_AI_GENERATION_DISABLED';
  end if;
  if p_estimated_cost_cents is null or p_estimated_cost_cents < 0 then raise exception 'M51C_UNKNOWN_COST'; end if;
  select coalesce(sum(amount_cents), 0)::integer into spent from public.assessment_ai_budget_ledger
  where organization_id = p_organization_id and entry_type = 'usage' and created_at >= date_trunc('month', now());
  if policy.monthly_limit_cents is null or spent + p_estimated_cost_cents > policy.monthly_limit_cents then raise exception 'M51C_BUDGET_EXCEEDED'; end if;
  if p_quantity < 1 or p_quantity > policy.maximum_items_per_request then raise exception 'M51C_REQUEST_LIMIT_EXCEEDED'; end if;
  insert into public.assessment_item_generation_requests (organization_id, generation_need_id, target_scope, requested_quantity,
    directives, provider, model, status, estimated_cost_cents, prompt_version, idempotency_key, created_by_auth_user_id)
  values (p_organization_id, p_generation_need_id, p_target_scope, p_quantity, jsonb_build_array('no_pii','no_web_search'),
    'external', policy.model, 'queued', p_estimated_cost_cents, 'm51c-ai-item-generation-1.0.0', p_idempotency_key, actor_id)
  returning id into request_id;
  return jsonb_build_object('requestId', request_id, 'status', 'queued');
end;
$$;

create or replace function public.review_m51c_item_proposal(p_proposal_id uuid, p_decision text, p_rationale text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid; proposal public.assessment_item_generation_proposals; request_record public.assessment_item_generation_requests;
begin
  if p_decision not in ('approve','reject','request_changes') or length(trim(p_rationale)) < 3 then raise exception 'M51C_INVALID_REVIEW'; end if;
  select * into proposal from public.assessment_item_generation_proposals where id = p_proposal_id for update;
  if proposal.id is null then raise exception 'M51C_PROPOSAL_NOT_FOUND'; end if;
  if proposal.status = 'published' then raise exception 'M51C_PUBLISHED_PROPOSAL_LOCKED'; end if;
  select * into request_record from public.assessment_item_generation_requests where organization_id = proposal.organization_id and id = proposal.generation_request_id;
  actor_id := private.m51c_require_governance(proposal.organization_id, request_record.target_scope = 'global');
  insert into public.assessment_item_generation_reviews (organization_id, proposal_id, reviewer_auth_user_id, decision, rationale, reviewed_snapshot)
  values (proposal.organization_id, proposal.id, actor_id, p_decision, trim(p_rationale), proposal.proposed_item);
  update public.assessment_item_generation_proposals set status = case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'in_review' end,
    updated_at = now() where id = proposal.id;
  insert into public.verification_audit_events (organization_id, actor_auth_user_id, action, result, payload)
  values (proposal.organization_id, actor_id, 'm51c_item_proposal_reviewed', 'success', jsonb_build_object('proposal_id', proposal.id, 'decision', p_decision));
  return jsonb_build_object('proposalId', proposal.id, 'status', case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'in_review' end);
end;
$$;

create or replace function public.complete_m51c_external_generation(p_request_id uuid, p_proposals jsonb, p_usage jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare request_record public.assessment_item_generation_requests; proposal_value jsonb; sequence integer := 0; actual_cost integer;
begin
  select * into request_record from public.assessment_item_generation_requests where id = p_request_id for update;
  if request_record.id is null or request_record.provider <> 'external' then raise exception 'M51C_REQUEST_NOT_COMPLETABLE'; end if;
  if request_record.status = 'completed' then
    select count(*)::integer into sequence from public.assessment_item_generation_proposals
    where organization_id = request_record.organization_id and generation_request_id = request_record.id;
    return jsonb_build_object('requestId', request_record.id, 'proposalCount', sequence,
      'costCents', coalesce(request_record.actual_cost_cents, 0), 'replayed', true);
  end if;
  if request_record.status <> 'queued' then raise exception 'M51C_REQUEST_NOT_COMPLETABLE'; end if;
  if jsonb_typeof(p_proposals) <> 'array' or jsonb_array_length(p_proposals) <> request_record.requested_quantity then raise exception 'M51C_INVALID_PROVIDER_OUTPUT'; end if;
  actual_cost := (p_usage ->> 'costCents')::integer;
  if actual_cost is null or actual_cost < 0 then raise exception 'M51C_UNKNOWN_ACTUAL_COST'; end if;
  for proposal_value in select value from jsonb_array_elements(p_proposals) loop
    sequence := sequence + 1;
    if coalesce(proposal_value ->> 'stem', '') = '' or jsonb_typeof(proposal_value -> 'options') <> 'array'
      or jsonb_array_length(proposal_value -> 'options') < 2 or coalesce(proposal_value ->> 'correctOptionId', '') = ''
      or coalesce(proposal_value ->> 'explanation', '') = '' then raise exception 'M51C_INVALID_PROVIDER_OUTPUT'; end if;
    insert into public.assessment_item_generation_proposals (organization_id, generation_request_id, proposal_sequence,
      proposed_item, content_fingerprint, validation_result, provider_provenance)
    values (request_record.organization_id, request_record.id, sequence, proposal_value,
      private.m51c_item_fingerprint(proposal_value ->> 'stem'), jsonb_build_object('valid', true, 'reasonCodes', jsonb_build_array('SCHEMA_VALID')),
      jsonb_build_object('provider','external','model',request_record.model,'synthetic',false,
        'promptVersion',request_record.prompt_version,'schemaVersion',request_record.schema_version,'usage',p_usage));
  end loop;
  update public.assessment_item_generation_requests set status = 'completed', actual_cost_cents = actual_cost, completed_at = now() where id = request_record.id;
  insert into public.assessment_ai_budget_ledger (organization_id, generation_request_id, entry_type, amount_cents, provider, model, usage_metadata, created_by_auth_user_id)
  values (request_record.organization_id, request_record.id, 'usage', actual_cost, request_record.provider, request_record.model, p_usage, request_record.created_by_auth_user_id);
  return jsonb_build_object('requestId', request_record.id, 'proposalCount', sequence, 'costCents', actual_cost);
end;
$$;

create or replace function public.publish_m51c_approved_proposals(p_organization_id uuid, p_proposal_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid; proposal record; family_id uuid; published_ids jsonb := '[]'::jsonb; item_id uuid;
begin
  if coalesce(array_length(p_proposal_ids, 1), 0) = 0 then raise exception 'M51C_NO_PROPOSALS_SELECTED'; end if;
  for proposal in
    select candidate.*, request_record.target_scope
    from public.assessment_item_generation_proposals candidate
    join public.assessment_item_generation_requests request_record on request_record.organization_id = candidate.organization_id and request_record.id = candidate.generation_request_id
    where candidate.organization_id = p_organization_id and candidate.id = any(p_proposal_ids)
    for update of candidate
  loop
    actor_id := private.m51c_require_governance(p_organization_id, proposal.target_scope = 'global');
    if proposal.status = 'published' then
      select item.id into item_id from public.assessment_items item
      where item.provenance ->> 'proposalId' = proposal.id::text
        and item.organization_id is not distinct from case when proposal.target_scope = 'global' then null else p_organization_id end
      limit 1;
      if item_id is null then raise exception 'M51C_PUBLISHED_ITEM_NOT_FOUND'; end if;
      published_ids := published_ids || jsonb_build_array(item_id);
      continue;
    end if;
    if proposal.status <> 'approved' or not exists (
      select 1 from public.assessment_item_generation_reviews review
      where review.organization_id = p_organization_id and review.proposal_id = proposal.id and review.decision = 'approve'
    ) then raise exception 'M51C_HUMAN_REVIEW_REQUIRED'; end if;
    insert into public.assessment_item_families (organization_id, family_key, competency_key, target_level, dimension)
    values (case when proposal.target_scope = 'global' then null else p_organization_id end,
      (proposal.proposed_item ->> 'key') || '-FAMILY', proposal.proposed_item ->> 'competencyKey', proposal.proposed_item ->> 'targetLevel', proposal.proposed_item ->> 'dimension')
    on conflict do nothing;
    select family.id into family_id from public.assessment_item_families family
    where family.family_key = (proposal.proposed_item ->> 'key') || '-FAMILY'
      and family.organization_id is not distinct from case when proposal.target_scope = 'global' then null else p_organization_id end limit 1;
    item_id := null;
    insert into public.assessment_items (organization_id, family_id, item_key, version, competency_key, target_level, dimension,
      state, source, language, modality, stem, options, answer_key, explanation, defined_difficulty, calibration_state,
      expected_time_min_seconds, expected_time_typical_seconds, expected_time_max_seconds, content_fingerprint, provenance,
      human_approved_by_auth_user_id, human_approved_at)
    values (case when proposal.target_scope = 'global' then null else p_organization_id end, family_id, proposal.proposed_item ->> 'key',
      'm51c-assessment-item-1.0.0', proposal.proposed_item ->> 'competencyKey', proposal.proposed_item ->> 'targetLevel', proposal.proposed_item ->> 'dimension',
      'active', proposal.target_scope, proposal.proposed_item ->> 'language', proposal.proposed_item ->> 'modality', proposal.proposed_item ->> 'stem',
      proposal.proposed_item -> 'options', jsonb_build_object('correctOptionId', proposal.proposed_item ->> 'correctOptionId'), proposal.proposed_item ->> 'explanation',
      proposal.proposed_item ->> 'difficulty', 'defined', (proposal.proposed_item ->> 'expectedTimeMinSeconds')::integer,
      (proposal.proposed_item ->> 'expectedTimeTypicalSeconds')::integer, (proposal.proposed_item ->> 'expectedTimeMaxSeconds')::integer,
      proposal.content_fingerprint, proposal.provider_provenance || jsonb_build_object('proposalId', proposal.id, 'humanApproved', true), actor_id, now())
    on conflict do nothing returning id into item_id;
    if item_id is null then raise exception 'M51C_ITEM_VERSION_CONFLICT'; end if;
    update public.assessment_item_generation_proposals set status = 'published', updated_at = now() where id = proposal.id;
    published_ids := published_ids || jsonb_build_array(item_id);
    insert into public.verification_audit_events (organization_id, actor_auth_user_id, action, result, payload)
    values (p_organization_id, actor_id, 'm51c_item_published_after_human_review', 'success',
      jsonb_build_object('proposal_id', proposal.id, 'item_id', item_id, 'scope', proposal.target_scope));
  end loop;
  if jsonb_array_length(published_ids) <> array_length(p_proposal_ids, 1) then raise exception 'M51C_PROPOSAL_SCOPE_MISMATCH'; end if;
  return jsonb_build_object('publishedItemIds', published_ids, 'count', jsonb_array_length(published_ids));
end;
$$;

create or replace function private.m51c_reject_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'M51C_APPEND_ONLY_LEDGER'; end; $$;
create trigger assessment_item_generation_reviews_append_only before update or delete on public.assessment_item_generation_reviews
for each row execute function private.m51c_reject_ledger_mutation();
create trigger assessment_ai_budget_ledger_append_only before update or delete on public.assessment_ai_budget_ledger
for each row execute function private.m51c_reject_ledger_mutation();

alter table public.assessment_item_generation_needs enable row level security;
alter table public.assessment_item_generation_requests enable row level security;
alter table public.assessment_item_generation_proposals enable row level security;
alter table public.assessment_item_generation_reviews enable row level security;
alter table public.assessment_item_calibration_snapshots enable row level security;
alter table public.assessment_item_quality_flags enable row level security;
alter table public.assessment_ai_policies enable row level security;
alter table public.assessment_ai_budget_ledger enable row level security;

create policy assessment_generation_needs_select on public.assessment_item_generation_needs for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_generation_requests_select on public.assessment_item_generation_requests for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_generation_proposals_select on public.assessment_item_generation_proposals for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_generation_reviews_select on public.assessment_item_generation_reviews for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_calibration_snapshots_select on public.assessment_item_calibration_snapshots for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter']::public.membership_role[])));
create policy assessment_quality_flags_select on public.assessment_item_quality_flags for select to authenticated
using (organization_id is null or (select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_ai_policies_select on public.assessment_ai_policies for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy assessment_ai_budget_ledger_select on public.assessment_ai_budget_ledger for select to authenticated
using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));

revoke all on public.assessment_item_generation_needs from anon, authenticated;
revoke all on public.assessment_item_generation_requests from anon, authenticated;
revoke all on public.assessment_item_generation_proposals from anon, authenticated;
revoke all on public.assessment_item_generation_reviews from anon, authenticated;
revoke all on public.assessment_item_calibration_snapshots from anon, authenticated;
revoke all on public.assessment_item_quality_flags from anon, authenticated;
revoke all on public.assessment_ai_policies from anon, authenticated;
revoke all on public.assessment_ai_budget_ledger from anon, authenticated;
revoke all on public.assessment_item_generation_needs from anon;
revoke all on public.assessment_item_generation_requests from anon;
revoke all on public.assessment_item_generation_proposals from anon;
revoke all on public.assessment_item_generation_reviews from anon;
revoke all on public.assessment_item_calibration_snapshots from anon;
revoke all on public.assessment_item_quality_flags from anon;
revoke all on public.assessment_ai_policies from anon;
revoke all on public.assessment_ai_budget_ledger from anon;
grant select on public.assessment_item_generation_needs, public.assessment_item_generation_requests,
  public.assessment_item_generation_proposals, public.assessment_item_generation_reviews,
  public.assessment_item_calibration_snapshots, public.assessment_item_quality_flags,
  public.assessment_ai_policies, public.assessment_ai_budget_ledger to authenticated;

revoke all on function private.m51c_require_governance(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function private.m51c_item_fingerprint(text) from public, anon, authenticated, service_role;
revoke all on function private.m51c_reject_ledger_mutation() from public, anon, authenticated, service_role;
revoke all on function public.load_m51c_item_bank_workspace(uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_m51c_fake_generation_request(uuid, uuid, text, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.request_m51c_item_generation(uuid, uuid, integer, text, integer, text) from public, anon, authenticated, service_role;
revoke all on function public.review_m51c_item_proposal(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.complete_m51c_external_generation(uuid, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.publish_m51c_approved_proposals(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.load_m51c_item_bank_workspace(uuid) to authenticated;
grant execute on function public.create_m51c_fake_generation_request(uuid, uuid, text, integer, text, text) to authenticated;
grant execute on function public.request_m51c_item_generation(uuid, uuid, integer, text, integer, text) to authenticated;
grant execute on function public.review_m51c_item_proposal(uuid, text, text) to authenticated;
grant execute on function public.complete_m51c_external_generation(uuid, jsonb, jsonb) to service_role;
grant execute on function public.publish_m51c_approved_proposals(uuid, uuid[]) to authenticated;

insert into public.assessment_ai_policies (organization_id)
select organization.id from public.organizations organization
on conflict (organization_id) do nothing;

commit;
