begin;

alter table public.assessment_item_generation_needs
  drop constraint assessment_item_generation_needs_status_check;
alter table public.assessment_item_generation_needs
  add constraint assessment_item_generation_needs_status_check
  check (status in (
    'open', 'requested', 'generating', 'generated', 'under_review',
    'partially_approved', 'resolved', 'cancelled', 'failed', 'expired'
  ));

alter table public.assessment_item_generation_proposals
  drop constraint assessment_item_generation_proposals_status_check;
alter table public.assessment_item_generation_proposals
  add constraint assessment_item_generation_proposals_status_check
  check (status in (
    'proposed', 'validation_failed', 'duplicate_candidate', 'in_review',
    'approved', 'rejected', 'published', 'superseded'
  ));

alter table public.assessment_ai_policies
  add column maximum_requests_per_day integer not null default 10
    check (maximum_requests_per_day between 1 and 1000),
  add column maximum_cost_per_request_cents integer
    check (maximum_cost_per_request_cents > 0),
  add column cooldown_seconds integer not null default 30
    check (cooldown_seconds between 0 and 86400),
  add column budget_alert_percent integer not null default 80
    check (budget_alert_percent between 1 and 100),
  add column allowed_competencies jsonb not null default '[]'::jsonb
    check (jsonb_typeof(allowed_competencies) = 'array');

alter table public.assessment_item_calibration_snapshots
  drop constraint assessment_item_calibration_snapshots_check,
  add column p25_time_seconds numeric(12,2) check (p25_time_seconds >= 0),
  add column p75_time_seconds numeric(12,2) check (p75_time_seconds >= 0),
  add column omission_rate numeric(6,4) check (omission_rate between 0 and 1),
  add column answer_change_rate numeric(6,4) check (answer_change_rate between 0 and 1),
  add column excluded_technical_incident_count integer not null default 0
    check (excluded_technical_incident_count >= 0),
  add constraint assessment_item_calibration_snapshots_synthetic_never_calibrated
    check (sample_kind = 'real_anonymized' or calibration_state <> 'calibrated');

alter table public.assessment_items drop constraint assessment_items_calibration_state_check;
alter table public.assessment_item_calibration_snapshots
  drop constraint assessment_item_calibration_snapshots_calibration_state_check;

update public.assessment_items
set calibration_state = case calibration_state
  when 'defined' then 'uncalibrated'
  when 'provisional' then 'calibration_eligible'
  when 'review_required' then 'calibration_review_required'
  else calibration_state
end;
update public.assessment_item_calibration_snapshots
set calibration_state = case calibration_state
  when 'defined' then 'uncalibrated'
  when 'provisional' then 'calibration_eligible'
  when 'review_required' then 'calibration_review_required'
  else calibration_state
end;

create or replace function private.m51c_normalize_calibration_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.calibration_state := case new.calibration_state
    when 'defined' then 'uncalibrated'
    when 'provisional' then 'calibration_eligible'
    when 'review_required' then 'calibration_review_required'
    else new.calibration_state
  end;
  return new;
end;
$$;
create trigger assessment_items_normalize_calibration_state
before insert or update of calibration_state on public.assessment_items
for each row execute function private.m51c_normalize_calibration_state();
create trigger assessment_item_calibration_snapshots_normalize_state
before insert or update of calibration_state on public.assessment_item_calibration_snapshots
for each row execute function private.m51c_normalize_calibration_state();

alter table public.assessment_items
  alter column calibration_state set default 'uncalibrated',
  add constraint assessment_items_calibration_state_check
  check (calibration_state in (
    'uncalibrated', 'collecting_data', 'calibration_eligible',
    'calibrated', 'calibration_review_required'
  ));
alter table public.assessment_item_calibration_snapshots
  add constraint assessment_item_calibration_snapshots_calibration_state_check
  check (calibration_state in (
    'uncalibrated', 'collecting_data', 'calibration_eligible',
    'calibrated', 'calibration_review_required'
  ));

create unique index assessment_generation_needs_active_gap_idx
on public.assessment_item_generation_needs (
  organization_id, blueprint_id, competency_key, target_level, dimension, modality, language
)
where status in ('open', 'requested', 'generating', 'generated', 'under_review', 'partially_approved');

create or replace function public.refresh_m51c_synthetic_item_analytics(
  p_organization_id uuid,
  p_assessment_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  item_record public.assessment_items;
  application_count integer;
  usable_count integer;
  correct_rate numeric;
  omission_rate numeric;
  answer_change_rate numeric;
  median_time numeric;
  p25_time numeric;
  p75_time numeric;
  excluded_incidents integer;
  snapshot_id uuid;
  next_state text;
  reasons jsonb;
begin
  actor_id := private.m51c_require_governance(p_organization_id, false);
  select * into item_record from public.assessment_items item
  where item.id = p_assessment_item_id
    and (item.organization_id is null or item.organization_id = p_organization_id);
  if item_record.id is null then raise exception 'M51C_ITEM_NOT_AVAILABLE'; end if;

  select
    count(metric.id)::integer,
    count(metric.id) filter (where not metric.technical_incident_present)::integer,
    coalesce(count(metric.id) filter (where metric.technical_incident_present), 0)::integer,
    case when count(metric.id) filter (where not metric.technical_incident_present) = 0 then null else
      count(metric.id) filter (where not metric.technical_incident_present and metric.result = 'correct')::numeric
        / count(metric.id) filter (where not metric.technical_incident_present) end,
    case when count(metric.id) filter (where not metric.technical_incident_present) = 0 then null else
      count(metric.id) filter (where not metric.technical_incident_present and metric.result = 'unanswered')::numeric
        / count(metric.id) filter (where not metric.technical_incident_present) end,
    case when count(metric.id) filter (where not metric.technical_incident_present) = 0 then null else
      count(metric.id) filter (where not metric.technical_incident_present and metric.answer_change_count > 0)::numeric
        / count(metric.id) filter (where not metric.technical_incident_present) end,
    percentile_cont(0.50) within group (order by metric.total_elapsed_seconds)
      filter (where not metric.technical_incident_present),
    percentile_cont(0.25) within group (order by metric.total_elapsed_seconds)
      filter (where not metric.technical_incident_present),
    percentile_cont(0.75) within group (order by metric.total_elapsed_seconds)
      filter (where not metric.technical_incident_present)
  into application_count, usable_count, excluded_incidents, correct_rate, omission_rate,
    answer_change_rate, median_time, p25_time, p75_time
  from public.assessment_question_metrics metric
  join public.assessment_question_instances question
    on question.organization_id = metric.organization_id and question.id = metric.question_instance_id
  where metric.organization_id = p_organization_id
    and question.assessment_item_id = p_assessment_item_id;

  next_state := case when coalesce(usable_count, 0) = 0 then 'uncalibrated' else 'collecting_data' end;
  reasons := case when coalesce(usable_count, 0) = 0
    then jsonb_build_array('SAMPLE_INSUFFICIENT', 'SYNTHETIC_OBSERVATIONS_EXCLUDED_FROM_REAL_CALIBRATION')
    else jsonb_build_array('SYNTHETIC_CALIBRATION_PREVIEW', 'SYNTHETIC_OBSERVATIONS_EXCLUDED_FROM_REAL_CALIBRATION')
  end;
  insert into public.assessment_item_calibration_snapshots (
    organization_id, assessment_item_id, sample_kind, application_count, correct_rate,
    median_time_seconds, p25_time_seconds, p75_time_seconds, omission_rate,
    answer_change_rate, excluded_technical_incident_count, observed_difficulty,
    calibration_state, reason_codes
  ) values (
    p_organization_id, p_assessment_item_id, 'synthetic_qa', coalesce(application_count, 0),
    round(correct_rate, 4), round(median_time, 2), round(p25_time, 2), round(p75_time, 2),
    round(omission_rate, 4), round(answer_change_rate, 4), coalesce(excluded_incidents, 0),
    case when correct_rate is null then null else round(1 - correct_rate, 4) end,
    next_state, reasons
  ) returning id into snapshot_id;
  insert into public.verification_audit_events (organization_id, actor_auth_user_id, action, result, payload)
  values (
    p_organization_id, actor_id, 'm51c_synthetic_analytics_refreshed', 'success',
    jsonb_build_object(
      'assessment_item_id', p_assessment_item_id, 'snapshot_id', snapshot_id,
      'application_count', coalesce(application_count, 0), 'sample_kind', 'synthetic_qa'
    )
  );
  return jsonb_build_object(
    'snapshotId', snapshot_id, 'applicationCount', coalesce(application_count, 0),
    'usableCount', coalesce(usable_count, 0), 'calibrationState', next_state,
    'sampleKind', 'synthetic_qa', 'realCalibration', false
  );
end;
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
  insert into public.assessment_ai_policies (organization_id)
  values (p_organization_id) on conflict (organization_id) do nothing;

  with targets as (
    select blueprint.id as blueprint_id, blueprint.blueprint_key,
      definition.competency_key, definition.target_level,
      case definition.target_level when 'advanced' then 'high'
        when 'intermediate' then 'medium' else 'low' end as defined_difficulty,
      blueprint.modality, blueprint.language,
      distribution.value ->> 'dimension' as dimension,
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
    left join public.assessment_items item
      on item.competency_key = target.competency_key
      and item.target_level = target.target_level
      and item.dimension = target.dimension
      and item.defined_difficulty = target.defined_difficulty
      and item.modality = target.modality and item.language = target.language
      and item.state = 'active'
      and (item.organization_id is null or item.organization_id = p_organization_id)
    group by target.blueprint_id, target.dimension
  ), gaps as (
    select target.*, eligible.eligible_items,
      greatest(target.required_items - eligible.eligible_items, 0) as deficit
    from targets target join eligible using (blueprint_id, dimension)
  )
  select jsonb_build_object(
    'versions', jsonb_build_object(
      'gapAnalysis', 'm51c-gap-analysis-1.0.0',
      'analytics', 'm51c-item-analytics-1.0.0',
      'calibration', 'm51c-item-calibration-1.0.0',
      'budget', 'm51c-ai-budget-1.0.0',
      'proposal', 'm51c-item-proposal-1.0.0'
    ),
    'gaps', coalesce((select jsonb_agg(jsonb_build_object(
      'key', gap.blueprint_id::text || ':' || gap.dimension,
      'blueprintId', gap.blueprint_id, 'blueprintKey', gap.blueprint_key,
      'competencyKey', gap.competency_key, 'targetLevel', gap.target_level,
      'definedDifficulty', gap.defined_difficulty, 'dimension', gap.dimension,
      'modality', gap.modality, 'language', gap.language,
      'requiredItems', gap.required_items, 'eligibleItems', gap.eligible_items,
      'deficit', gap.deficit,
      'reasonCodes', case when gap.deficit > 0
        then jsonb_build_array('ELIGIBLE_ITEM_COVERAGE_GAP')
        else jsonb_build_array('COVERAGE_SUFFICIENT') end
    ) order by gap.blueprint_key, gap.dimension) from gaps gap), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', item.id, 'key', item.item_key, 'version', item.version,
      'scope', item.source, 'organizationId', item.organization_id,
      'competencyKey', item.competency_key, 'targetLevel', item.target_level,
      'dimension', item.dimension, 'state', item.state,
      'definedDifficulty', item.defined_difficulty,
      'calibrationState', coalesce(metrics.calibration_state, item.calibration_state),
      'stem', item.stem,
      'applicationCount', coalesce(metrics.application_count, 0),
      'correctRate', metrics.correct_rate,
      'medianTimeSeconds', metrics.median_time_seconds,
      'p25TimeSeconds', metrics.p25_time_seconds,
      'p75TimeSeconds', metrics.p75_time_seconds,
      'omissionRate', metrics.omission_rate,
      'answerChangeRate', metrics.answer_change_rate,
      'excludedTechnicalIncidentCount', coalesce(metrics.excluded_technical_incident_count, 0),
      'observedDifficulty', metrics.observed_difficulty,
      'sampleKind', metrics.sample_kind,
      'analyticsReasonCodes', coalesce(metrics.reason_codes, '[]'::jsonb)
    ) order by item.item_key)
      from public.assessment_items item
      left join lateral (
        select snapshot.application_count, snapshot.correct_rate,
          snapshot.median_time_seconds, snapshot.p25_time_seconds, snapshot.p75_time_seconds,
          snapshot.omission_rate, snapshot.answer_change_rate,
          snapshot.excluded_technical_incident_count, snapshot.observed_difficulty,
          snapshot.sample_kind, snapshot.calibration_state, snapshot.reason_codes
        from public.assessment_item_calibration_snapshots snapshot
        where snapshot.assessment_item_id = item.id
          and snapshot.organization_id = p_organization_id
        order by snapshot.calculated_at desc limit 1
      ) metrics on true
      where item.organization_id is null or item.organization_id = p_organization_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
      'id', request.id, 'status', request.status, 'provider', request.provider,
      'quantity', request.requested_quantity, 'targetScope', request.target_scope,
      'createdAt', request.created_at
    ) order by request.created_at desc)
      from public.assessment_item_generation_requests request
      where request.organization_id = p_organization_id), '[]'::jsonb),
    'proposals', coalesce((select jsonb_agg(jsonb_build_object(
      'id', proposal.id, 'requestId', proposal.generation_request_id,
      'status', proposal.status, 'item', proposal.proposed_item,
      'fingerprint', proposal.content_fingerprint,
      'similarity', proposal.maximum_lexical_similarity,
      'duplicateCandidates', proposal.duplicate_candidates,
      'validation', proposal.validation_result,
      'provenance', proposal.provider_provenance,
      'createdAt', proposal.created_at
    ) order by proposal.created_at desc, proposal.proposal_sequence)
      from public.assessment_item_generation_proposals proposal
      where proposal.organization_id = p_organization_id), '[]'::jsonb),
    'policy', (select jsonb_build_object(
      'generationEnabled', policy.generation_enabled,
      'provider', policy.provider, 'model', policy.model,
      'monthlyLimitCents', policy.monthly_limit_cents,
      'maximumItemsPerRequest', policy.maximum_items_per_request,
      'maximumRequestsPerDay', policy.maximum_requests_per_day,
      'maximumCostPerRequestCents', policy.maximum_cost_per_request_cents,
      'cooldownSeconds', policy.cooldown_seconds,
      'budgetAlertPercent', policy.budget_alert_percent,
      'requireHumanReview', policy.require_human_review,
      'allowPii', policy.allow_pii, 'allowWebSearch', policy.allow_web_search,
      'version', policy.policy_version,
      'spentCents', coalesce((select sum(ledger.amount_cents)
        from public.assessment_ai_budget_ledger ledger
        where ledger.organization_id = p_organization_id
          and ledger.created_at >= date_trunc('month', now())), 0)
    ) from public.assessment_ai_policies policy
      where policy.organization_id = p_organization_id)
  ) into result;
  perform actor_id;
  return result;
end;
$$;

revoke all on function public.refresh_m51c_synthetic_item_analytics(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.refresh_m51c_synthetic_item_analytics(uuid, uuid) to authenticated;

revoke all on function public.load_m51c_item_bank_workspace(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.load_m51c_item_bank_workspace(uuid) to authenticated;
revoke all on function private.m51c_normalize_calibration_state()
  from public, anon, authenticated, service_role;

commit;
