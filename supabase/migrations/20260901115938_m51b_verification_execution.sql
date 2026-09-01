begin;

alter table public.verification_needs drop constraint if exists verification_needs_status_check;
alter table public.verification_needs add constraint verification_needs_status_check
check (status in ('open', 'draft', 'prepared', 'resolved', 'inconclusive', 'requires_reassessment', 'expired', 'cancelled'));

create table public.assessment_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  verification_need_id uuid not null,
  prepared_assessment_id uuid not null,
  person_id uuid not null,
  delivery_channel text not null check (delivery_channel in ('link', 'email', 'whatsapp')),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  first_access_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  status text not null default 'issued' check (status in ('draft', 'issued', 'opened', 'started', 'completed', 'expired', 'cancelled', 'revoked')),
  participant_result_visibility text not null default 'completion_only' check (participant_result_visibility in ('completion_only', 'summary', 'detailed')),
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  reissued_from uuid,
  version text not null default 'm51b-assessment-invitation-1.0.0',
  idempotency_key text not null,
  message_snapshot jsonb not null default '{}'::jsonb,
  audit_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (token_hash),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, verification_need_id) references public.verification_needs(organization_id, id) on delete restrict,
  foreign key (organization_id, prepared_assessment_id) references public.prepared_assessments(organization_id, id) on delete restrict,
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete restrict,
  foreign key (organization_id, reissued_from) references public.assessment_invitations(organization_id, id) on delete set null (reissued_from),
  check (expires_at > issued_at),
  check (jsonb_typeof(message_snapshot) = 'object'),
  check (jsonb_typeof(audit_metadata) = 'object')
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invitation_id uuid not null,
  verification_need_id uuid not null,
  prepared_assessment_id uuid not null,
  person_id uuid not null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'paused', 'submitted', 'evaluated', 'expired', 'cancelled', 'invalidated', 'inconclusive')),
  started_at_server timestamptz,
  submitted_at_server timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  expires_at timestamptz not null,
  elapsed_active_seconds integer not null default 0 check (elapsed_active_seconds >= 0),
  elapsed_total_seconds integer not null default 0 check (elapsed_total_seconds >= 0),
  current_question_instance_id uuid,
  active_session_id text,
  terms_snapshot jsonb not null default '{}'::jsonb,
  session_version text not null default 'm51b-assessment-attempt-1.0.0',
  assessment_version text not null,
  integrity_rule_version text not null default 'm51b-integrity-ruleset-1.0.0',
  evaluation_version text not null default 'm51b-assessment-evaluation-1.0.0',
  lock_version integer not null default 1 check (lock_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, invitation_id, attempt_number),
  foreign key (organization_id, invitation_id) references public.assessment_invitations(organization_id, id) on delete restrict,
  foreign key (organization_id, verification_need_id) references public.verification_needs(organization_id, id) on delete restrict,
  foreign key (organization_id, prepared_assessment_id) references public.prepared_assessments(organization_id, id) on delete restrict,
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete restrict,
  check (jsonb_typeof(terms_snapshot) = 'object')
);

create table public.assessment_question_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  assessment_item_id uuid not null references public.assessment_items(id) on delete restrict,
  assessment_item_version text not null,
  sequence integer not null check (sequence > 0),
  item_key text not null,
  stem_snapshot text not null,
  option_snapshot jsonb not null,
  answer_key_snapshot text not null,
  presented_prompt_version text not null default 'm51b-question-instance-1.0.0',
  alternative_order jsonb not null,
  randomization_metadata jsonb not null default '{"mode":"stable"}'::jsonb,
  target_level text not null check (target_level in ('basic', 'intermediate', 'advanced')),
  dimension text not null,
  difficulty text not null check (difficulty in ('low', 'medium', 'high')),
  expected_time_min_seconds integer not null check (expected_time_min_seconds >= 0),
  expected_time_typical_seconds integer not null check (expected_time_typical_seconds >= expected_time_min_seconds),
  expected_time_max_seconds integer not null check (expected_time_max_seconds >= expected_time_typical_seconds),
  first_presented_at timestamptz,
  first_interaction_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'not_presented' check (status in ('not_presented', 'active', 'answered', 'marked', 'submitted')),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id, sequence),
  unique (organization_id, attempt_id, assessment_item_id),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  check (jsonb_typeof(option_snapshot) = 'array'),
  check (jsonb_typeof(alternative_order) = 'array'),
  check (jsonb_typeof(randomization_metadata) = 'object')
);

alter table public.assessment_attempts
  add constraint assessment_attempts_current_question_fk
  foreign key (organization_id, current_question_instance_id)
  references public.assessment_question_instances(organization_id, id)
  on delete set null (current_question_instance_id);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  question_instance_id uuid not null,
  selected_option text,
  first_selected_option text,
  final_selected_option text,
  selection_count integer not null default 0 check (selection_count >= 0),
  change_count integer not null default 0 check (change_count >= 0),
  first_selected_at timestamptz,
  last_changed_at timestamptz,
  submitted_at timestamptz,
  marked_for_review boolean not null default false,
  response_version integer not null default 1 check (response_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id, question_instance_id),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  foreign key (organization_id, question_instance_id) references public.assessment_question_instances(organization_id, id) on delete cascade
);

create table public.assessment_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  question_instance_id uuid,
  event_type text not null check (event_type in (
    'invitation_opened', 'assessment_landing_viewed', 'instructions_viewed', 'pre_start_confirmed', 'assessment_started',
    'question_opened', 'answer_selected', 'answer_changed', 'question_marked', 'question_unmarked', 'question_revisited',
    'page_hidden', 'page_visible', 'window_blurred', 'window_focused', 'connection_lost', 'connection_restored',
    'page_reloaded', 'assessment_paused', 'assessment_resumed', 'question_elapsed', 'question_submitted',
    'assessment_submit_requested', 'assessment_submitted', 'assessment_timeout', 'technical_error'
  )),
  occurred_at_client timestamptz not null,
  received_at_server timestamptz not null default now(),
  sequence integer not null check (sequence > 0),
  session_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  event_schema_version text not null default 'm51b-assessment-event-1.0.0',
  unique (organization_id, attempt_id, idempotency_key),
  unique (organization_id, attempt_id, session_id, sequence),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  foreign key (organization_id, question_instance_id) references public.assessment_question_instances(organization_id, id) on delete restrict,
  check (jsonb_typeof(metadata) = 'object')
);

create table public.assessment_question_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  question_instance_id uuid not null,
  total_elapsed_seconds integer not null default 0 check (total_elapsed_seconds >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  hidden_seconds integer not null default 0 check (hidden_seconds >= 0),
  blurred_seconds integer not null default 0 check (blurred_seconds >= 0),
  absence_count integer not null default 0 check (absence_count >= 0),
  blur_count integer not null default 0 check (blur_count >= 0),
  revisit_count integer not null default 0 check (revisit_count >= 0),
  answer_change_count integer not null default 0 check (answer_change_count >= 0),
  first_interaction_latency_seconds integer,
  expected_time_min_seconds integer not null,
  expected_time_typical_seconds integer not null,
  expected_time_max_seconds integer not null,
  actual_time_ratio numeric(12,4) not null default 0,
  difficulty text not null,
  result text not null check (result in ('correct', 'incorrect', 'unanswered')),
  technical_incident_present boolean not null default false,
  flags jsonb not null default '[]'::jsonb,
  metrics_version text not null default 'm51b-question-metrics-1.0.0',
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id, question_instance_id),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  foreign key (organization_id, question_instance_id) references public.assessment_question_instances(organization_id, id) on delete restrict,
  check (jsonb_typeof(flags) = 'array')
);

create table public.assessment_integrity_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  integrity_state text not null check (integrity_state in ('adequate', 'reduced', 'inconclusive')),
  facts jsonb not null,
  flags jsonb not null,
  patterns jsonb not null,
  reason_codes jsonb not null,
  ruleset_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id, ruleset_version),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  check (jsonb_typeof(facts) = 'object'),
  check (jsonb_typeof(flags) = 'array'),
  check (jsonb_typeof(patterns) = 'array'),
  check (jsonb_typeof(reason_codes) = 'array')
);

create table public.assessment_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attempt_id uuid not null,
  rubric_id uuid not null references public.assessment_rubrics(id) on delete restrict,
  integrity_analysis_id uuid not null,
  raw_result jsonb not null,
  dimension_results jsonb not null,
  demonstrated_level text not null check (demonstrated_level in ('basic', 'intermediate', 'advanced', 'insufficient_evidence', 'inconclusive')),
  coverage_state text not null check (coverage_state in ('sufficient', 'insufficient')),
  methodological_quality text not null check (methodological_quality in ('supported', 'limited', 'insufficient')),
  confidence_state text not null check (confidence_state in ('high', 'adequate', 'reduced', 'inconclusive')),
  reason_codes jsonb not null,
  version_snapshot jsonb not null,
  matching_reassessment jsonb not null,
  evaluation_version text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id, evaluation_version),
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete cascade,
  foreign key (organization_id, integrity_analysis_id) references public.assessment_integrity_analyses(organization_id, id) on delete restrict,
  check (jsonb_typeof(raw_result) = 'object'),
  check (jsonb_typeof(dimension_results) = 'object'),
  check (jsonb_typeof(reason_codes) = 'array'),
  check (jsonb_typeof(version_snapshot) = 'object'),
  check (jsonb_typeof(matching_reassessment) = 'object')
);

create table public.competency_demonstrated_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  competency_key text not null,
  verification_need_id uuid not null,
  prepared_assessment_id uuid not null,
  attempt_id uuid not null,
  evaluation_id uuid not null,
  verification_definition_id uuid not null references public.verification_definitions(id) on delete restrict,
  verification_definition_version text not null,
  blueprint_id uuid not null references public.assessment_blueprints(id) on delete restrict,
  blueprint_version text not null,
  rubric_id uuid not null references public.assessment_rubrics(id) on delete restrict,
  rubric_version text not null,
  evaluation_version text not null,
  integrity_rule_version text not null,
  demonstrated_level text not null check (demonstrated_level in ('basic', 'intermediate', 'advanced', 'insufficient_evidence', 'inconclusive')),
  raw_result jsonb not null,
  dimension_results jsonb not null,
  coverage_state text not null,
  methodological_quality text not null,
  integrity_state text not null,
  confidence_state text not null,
  reason_codes jsonb not null,
  verified_at timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'active' check (status in ('active', 'superseded', 'invalidated')),
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, attempt_id),
  unique (organization_id, evaluation_id),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete restrict,
  foreign key (organization_id, verification_need_id) references public.verification_needs(organization_id, id) on delete restrict,
  foreign key (organization_id, prepared_assessment_id) references public.prepared_assessments(organization_id, id) on delete restrict,
  foreign key (organization_id, attempt_id) references public.assessment_attempts(organization_id, id) on delete restrict,
  foreign key (organization_id, evaluation_id) references public.assessment_evaluations(organization_id, id) on delete restrict,
  check (jsonb_typeof(raw_result) = 'object'),
  check (jsonb_typeof(dimension_results) = 'object'),
  check (jsonb_typeof(reason_codes) = 'array'),
  check (jsonb_typeof(provenance) = 'object')
);

create table public.assessment_access_requests (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invitation_id uuid not null,
  action text not null,
  accepted boolean not null,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, invitation_id) references public.assessment_invitations(organization_id, id) on delete cascade
);

create index assessment_invitations_scope_idx on public.assessment_invitations (organization_id, status, expires_at);
create index assessment_invitations_need_idx on public.assessment_invitations (organization_id, verification_need_id, created_at desc);
create index assessment_invitations_prepared_idx on public.assessment_invitations (organization_id, prepared_assessment_id);
create index assessment_invitations_person_idx on public.assessment_invitations (organization_id, person_id);
create index assessment_invitations_reissued_idx on public.assessment_invitations (organization_id, reissued_from) where reissued_from is not null;
create index assessment_attempts_invitation_idx on public.assessment_attempts (organization_id, invitation_id, status);
create index assessment_attempts_need_idx on public.assessment_attempts (organization_id, verification_need_id);
create index assessment_attempts_prepared_idx on public.assessment_attempts (organization_id, prepared_assessment_id);
create index assessment_attempts_person_idx on public.assessment_attempts (organization_id, person_id);
create index assessment_attempts_current_question_idx on public.assessment_attempts (organization_id, current_question_instance_id) where current_question_instance_id is not null;
create index assessment_question_instances_attempt_idx on public.assessment_question_instances (organization_id, attempt_id, sequence);
create index assessment_question_instances_item_idx on public.assessment_question_instances (assessment_item_id);
create index assessment_responses_attempt_idx on public.assessment_responses (organization_id, attempt_id);
create index assessment_responses_question_idx on public.assessment_responses (organization_id, question_instance_id);
create index assessment_events_attempt_idx on public.assessment_events (organization_id, attempt_id, received_at_server);
create index assessment_events_question_idx on public.assessment_events (organization_id, question_instance_id) where question_instance_id is not null;
create index assessment_question_metrics_attempt_idx on public.assessment_question_metrics (organization_id, attempt_id);
create index assessment_question_metrics_question_idx on public.assessment_question_metrics (organization_id, question_instance_id);
create index assessment_integrity_attempt_idx on public.assessment_integrity_analyses (organization_id, attempt_id);
create index assessment_evaluations_attempt_idx on public.assessment_evaluations (organization_id, attempt_id);
create index assessment_evaluations_integrity_idx on public.assessment_evaluations (organization_id, integrity_analysis_id);
create index demonstrated_evidence_person_idx on public.competency_demonstrated_evidence (organization_id, person_id, competency_key, verified_at desc);
create index demonstrated_evidence_need_idx on public.competency_demonstrated_evidence (organization_id, verification_need_id);
create index demonstrated_evidence_prepared_idx on public.competency_demonstrated_evidence (organization_id, prepared_assessment_id);
create index assessment_access_rate_idx on public.assessment_access_requests (organization_id, invitation_id, occurred_at desc);

create or replace function private.m51b_append_event(
  p_organization_id uuid,
  p_attempt_id uuid,
  p_question_instance_id uuid,
  p_event_type text,
  p_occurred_at_client timestamptz,
  p_sequence integer,
  p_session_id text,
  p_metadata jsonb,
  p_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.assessment_events (
    organization_id, attempt_id, question_instance_id, event_type, occurred_at_client,
    sequence, session_id, metadata, idempotency_key
  ) values (
    p_organization_id, p_attempt_id, p_question_instance_id, p_event_type,
    p_occurred_at_client, p_sequence, p_session_id, coalesce(p_metadata, '{}'::jsonb), p_idempotency_key
  ) on conflict (organization_id, attempt_id, idempotency_key) do nothing;
end;
$$;

create or replace function private.m51b_public_workspace(p_invitation public.assessment_invitations)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invitationId', p_invitation.id,
    'status', p_invitation.status,
    'expiresAt', p_invitation.expires_at,
    'resultVisibility', p_invitation.participant_result_visibility,
    'person', jsonb_build_object('name', person.full_name),
    'verification', jsonb_build_object(
      'competency', need.competency_label,
      'competencyKey', need.competency_key,
      'targetLevel', need.target_level,
      'criticality', need.criticality,
      'context', need.context_snapshot ->> 'vacancy_title',
      'estimatedMinutes', blueprint.estimated_minutes,
      'itemCount', blueprint.item_count,
      'modality', blueprint.modality
    ),
    'attempt', case when attempt.id is null then null else jsonb_build_object(
      'id', attempt.id,
      'status', attempt.status,
      'startedAt', attempt.started_at_server,
      'submittedAt', attempt.submitted_at_server,
      'elapsedTotalSeconds', attempt.elapsed_total_seconds,
      'lockVersion', attempt.lock_version,
      'currentQuestionInstanceId', attempt.current_question_instance_id,
      'questions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', question.id,
          'sequence', question.sequence,
          'itemCode', question.item_key,
          'itemVersion', question.assessment_item_version,
          'stem', question.stem_snapshot,
          'options', question.option_snapshot,
          'dimension', question.dimension,
          'status', question.status,
          'response', case when response.id is null then null else jsonb_build_object(
            'selectedOptionId', response.final_selected_option,
            'markedForReview', response.marked_for_review,
            'version', response.response_version
          ) end
        ) order by question.sequence), '[]'::jsonb)
        from public.assessment_question_instances question
        left join public.assessment_responses response
          on response.organization_id = question.organization_id
         and response.attempt_id = question.attempt_id
         and response.question_instance_id = question.id
        where question.organization_id = p_invitation.organization_id
          and question.attempt_id = attempt.id
      ),
      'result', case when evaluation.id is null then null else
        jsonb_build_object(
          'completionCode', upper(substr(replace(attempt.id::text, '-', ''), 1, 12)),
          'completedAt', attempt.submitted_at_server,
          'rawResult', case when p_invitation.participant_result_visibility in ('summary', 'detailed') then evaluation.raw_result else null end,
          'dimensionResults', case when p_invitation.participant_result_visibility in ('summary', 'detailed') then evaluation.dimension_results else null end,
          'demonstratedLevel', case when p_invitation.participant_result_visibility in ('summary', 'detailed') then evaluation.demonstrated_level else null end
        )
      end
    ) end,
    'privacy', jsonb_build_object(
      'recorded', jsonb_build_array('tempo por questão', 'alterações de resposta', 'visibilidade e foco da página', 'interrupções técnicas', 'sessão lógica'),
      'notRecorded', jsonb_build_array('webcam', 'microfone', 'gravação de tela', 'conteúdo de outras abas', 'fingerprint persistente')
    ),
    'versions', jsonb_build_object(
      'invitation', p_invitation.version,
      'instructions', 'm51b-participant-instructions-1.0.0',
      'publicBoundary', 'm51b-assessment-access-boundary-1.0.0'
    )
  )
  from public.people person
  join public.verification_needs need on need.organization_id = p_invitation.organization_id and need.id = p_invitation.verification_need_id
  join public.prepared_assessments prepared on prepared.organization_id = p_invitation.organization_id and prepared.id = p_invitation.prepared_assessment_id
  join public.assessment_blueprints blueprint on blueprint.id = prepared.blueprint_id
  left join public.assessment_attempts attempt on attempt.organization_id = p_invitation.organization_id and attempt.invitation_id = p_invitation.id and attempt.attempt_number = 1
  left join public.assessment_evaluations evaluation on evaluation.organization_id = p_invitation.organization_id and evaluation.attempt_id = attempt.id
  where person.organization_id = p_invitation.organization_id and person.id = p_invitation.person_id
  limit 1
$$;

create or replace function public.issue_m51b_invitation(
  p_prepared_assessment_id uuid,
  p_token_hash text,
  p_delivery_channel text,
  p_valid_days integer,
  p_result_visibility text,
  p_message text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prepared public.prepared_assessments;
  need public.verification_needs;
  actor_id uuid;
  invitation public.assessment_invitations;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'M51B_INVALID_TOKEN_HASH'; end if;
  if p_delivery_channel not in ('link', 'email', 'whatsapp') then raise exception 'M51B_INVALID_DELIVERY_CHANNEL'; end if;
  if p_valid_days < 1 or p_valid_days > 14 then raise exception 'M51B_INVALID_EXPIRY'; end if;
  if p_result_visibility not in ('completion_only', 'summary', 'detailed') then raise exception 'M51B_INVALID_RESULT_VISIBILITY'; end if;

  select * into prepared from public.prepared_assessments where id = p_prepared_assessment_id and status = 'prepared';
  if prepared.id is null then raise exception 'M51B_PREPARED_ASSESSMENT_NOT_FOUND'; end if;
  actor_id := private.require_document_reviewer(prepared.organization_id);
  select * into need from public.verification_needs where organization_id = prepared.organization_id and id = prepared.need_id;
  if need.id is null then raise exception 'M51B_VERIFICATION_NEED_NOT_FOUND'; end if;

  select * into invitation from public.assessment_invitations
  where organization_id = prepared.organization_id and idempotency_key = p_idempotency_key;
  if invitation.id is null then
    insert into public.assessment_invitations (
      organization_id, verification_need_id, prepared_assessment_id, person_id, delivery_channel,
      token_hash, expires_at, participant_result_visibility, created_by_auth_user_id,
      idempotency_key, message_snapshot, audit_metadata
    ) values (
      prepared.organization_id, need.id, prepared.id, need.person_id, p_delivery_channel,
      p_token_hash, now() + make_interval(days => p_valid_days), p_result_visibility, actor_id,
      p_idempotency_key,
      jsonb_build_object('subject', 'Convite para verificação de competências', 'body', left(coalesce(p_message, ''), 2000), 'deliveryMode', 'manual_link_only'),
      jsonb_build_object('automaticDeliveryConfigured', false, 'qaSyntheticOnly', true)
    ) returning * into invitation;

    insert into public.verification_audit_events (organization_id, actor_auth_user_id, need_id, prepared_assessment_id, action, result, payload)
    values (prepared.organization_id, actor_id, need.id, prepared.id, 'invitation_issued', 'success',
      jsonb_build_object('invitation_id', invitation.id, 'delivery_channel_intended', p_delivery_channel, 'automatic_delivery', false));
  end if;

  return jsonb_build_object(
    'invitationId', invitation.id,
    'status', invitation.status,
    'expiresAt', invitation.expires_at,
    'deliveryChannel', invitation.delivery_channel,
    'automaticDeliveryConfigured', false,
    'resultVisibility', invitation.participant_result_visibility
  );
end;
$$;

create or replace function public.load_m51b_operator_workspace(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform actor_id;
  return jsonb_build_object(
    'preparedAssessments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', prepared.id,
        'needId', need.id,
        'personId', need.person_id,
        'personName', person.full_name,
        'email', private_data.email,
        'phone', private_data.phone,
        'competency', need.competency_label,
        'competencyKey', need.competency_key,
        'targetLevel', need.target_level,
        'criticality', need.criticality,
        'context', need.context_snapshot ->> 'vacancy_title',
        'itemCount', blueprint.item_count,
        'estimatedMinutes', blueprint.estimated_minutes,
        'createdAt', prepared.created_at
      ) order by prepared.created_at desc), '[]'::jsonb)
      from public.prepared_assessments prepared
      join public.verification_needs need on need.organization_id = prepared.organization_id and need.id = prepared.need_id
      join public.people person on person.organization_id = prepared.organization_id and person.id = need.person_id
      left join public.person_private_data private_data on private_data.organization_id = prepared.organization_id and private_data.person_id = need.person_id
      join public.assessment_blueprints blueprint on blueprint.id = prepared.blueprint_id
      where prepared.organization_id = p_organization_id and prepared.status = 'prepared'
    ),
    'verifications', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'invitationId', invitation.id,
        'preparedAssessmentId', invitation.prepared_assessment_id,
        'personId', invitation.person_id,
        'personName', person.full_name,
        'competency', need.competency_label,
        'targetLevel', need.target_level,
        'status', case
          when invitation.status in ('cancelled', 'revoked') then invitation.status
          when invitation.expires_at <= now() and invitation.status <> 'completed' then 'expired'
          when attempt.status = 'paused' then 'paused'
          when attempt.status in ('in_progress', 'submitted') then 'in_progress'
          when attempt.status in ('evaluated', 'inconclusive') then case when evaluation.demonstrated_level = 'inconclusive' then 'inconclusive' else 'completed' end
          when invitation.status = 'opened' then 'opened'
          else 'pending'
        end,
        'expiresAt', invitation.expires_at,
        'lastActivityAt', coalesce(attempt.updated_at, invitation.opened_at, invitation.issued_at),
        'progress', case when blueprint.item_count = 0 then 0 else round(100.0 * coalesce(answered.count, 0) / blueprint.item_count, 0) end,
        'confidenceState', evaluation.confidence_state,
        'demonstratedLevel', evaluation.demonstrated_level,
        'rawResult', evaluation.raw_result,
        'integrityState', integrity.integrity_state,
        'issuedAt', invitation.issued_at,
        'completedAt', invitation.completed_at,
        'automaticDeliveryConfigured', false
      ) order by invitation.created_at desc), '[]'::jsonb)
      from public.assessment_invitations invitation
      join public.verification_needs need on need.organization_id = invitation.organization_id and need.id = invitation.verification_need_id
      join public.people person on person.organization_id = invitation.organization_id and person.id = invitation.person_id
      join public.prepared_assessments prepared on prepared.organization_id = invitation.organization_id and prepared.id = invitation.prepared_assessment_id
      join public.assessment_blueprints blueprint on blueprint.id = prepared.blueprint_id
      left join public.assessment_attempts attempt on attempt.organization_id = invitation.organization_id and attempt.invitation_id = invitation.id and attempt.attempt_number = 1
      left join public.assessment_evaluations evaluation on evaluation.organization_id = invitation.organization_id and evaluation.attempt_id = attempt.id
      left join public.assessment_integrity_analyses integrity on integrity.organization_id = invitation.organization_id and integrity.id = evaluation.integrity_analysis_id
      left join lateral (
        select count(*)::integer as count from public.assessment_responses response
        where response.organization_id = invitation.organization_id and response.attempt_id = attempt.id and response.final_selected_option is not null
      ) answered on true
      where invitation.organization_id = p_organization_id
    )
  );
end;
$$;

create or replace function public.manage_m51b_invitation(p_invitation_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.assessment_invitations;
  actor_id uuid;
begin
  select * into invitation from public.assessment_invitations where id = p_invitation_id for update;
  if invitation.id is null then raise exception 'M51B_INVITATION_NOT_FOUND'; end if;
  actor_id := private.require_document_reviewer(invitation.organization_id);
  if p_action not in ('cancel', 'revoke') then raise exception 'M51B_INVALID_INVITATION_ACTION'; end if;
  if invitation.status in ('completed', 'cancelled', 'revoked') then return jsonb_build_object('invitationId', invitation.id, 'status', invitation.status); end if;
  update public.assessment_invitations set
    status = case when p_action = 'cancel' then 'cancelled' else 'revoked' end,
    cancelled_at = now(), updated_at = now()
  where organization_id = invitation.organization_id and id = invitation.id
  returning * into invitation;
  insert into public.verification_audit_events (organization_id, actor_auth_user_id, need_id, prepared_assessment_id, action, result, payload)
  values (invitation.organization_id, actor_id, invitation.verification_need_id, invitation.prepared_assessment_id,
    case when p_action = 'cancel' then 'invitation_cancelled' else 'invitation_revoked' end, 'success', jsonb_build_object('invitation_id', invitation.id));
  return jsonb_build_object('invitationId', invitation.id, 'status', invitation.status);
end;
$$;

create or replace function public.m51b_public_access(p_action text, p_token_hash text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.assessment_invitations;
  prepared public.prepared_assessments;
  attempt public.assessment_attempts;
  question public.assessment_question_instances;
  response public.assessment_responses;
  evaluation public.assessment_evaluations;
  integrity public.assessment_integrity_analyses;
  evidence public.competency_demonstrated_evidence;
  need public.verification_needs;
  v_session_id text := nullif(p_payload ->> 'sessionId', '');
  v_question_id uuid;
  v_attempt_id uuid;
  v_selected_option text;
  v_event_type text;
  v_client_sequence integer;
  v_client_time timestamptz;
  v_idempotency_key text;
  answered_count integer;
  total_count integer;
  correct_count integer;
  incorrect_count integer;
  unanswered_count integer;
  completion_ratio numeric;
  v_dimension_results jsonb;
  v_raw_result jsonb;
  v_coverage_state text;
  v_integrity_state text;
  v_confidence_state text;
  v_demonstrated_level text;
  v_integrity_flags jsonb;
  v_reason_codes jsonb;
  technical_count integer;
  context_switch_count integer;
  v_hidden_seconds integer;
  affected_questions integer;
  session_count integer;
  matching_snapshot jsonb;
begin
  if p_action not in ('landing', 'instructions', 'start', 'workspace', 'save_response', 'record_event', 'pause', 'resume', 'submit') then
    raise exception 'M51B_UNKNOWN_ACTION';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'M51B_ACCESS_DENIED'; end if;

  select * into invitation from public.assessment_invitations where token_hash = p_token_hash for update;
  if invitation.id is null then raise exception 'M51B_ACCESS_DENIED'; end if;
  if invitation.expires_at <= now() and invitation.status not in ('completed', 'cancelled', 'revoked') then
    update public.assessment_invitations set status = 'expired', updated_at = now() where id = invitation.id;
    invitation.status := 'expired';
  end if;
  if invitation.status in ('expired', 'cancelled', 'revoked') then raise exception 'M51B_INVITATION_UNAVAILABLE'; end if;

  if (select count(*) from public.assessment_access_requests request
      where request.organization_id = invitation.organization_id and request.invitation_id = invitation.id
        and request.occurred_at > now() - interval '1 minute') >= 120 then
    raise exception 'M51B_RATE_LIMITED';
  end if;
  insert into public.assessment_access_requests (organization_id, invitation_id, action, accepted)
  values (invitation.organization_id, invitation.id, p_action, true);

  if p_action in ('landing', 'instructions') then
    update public.assessment_invitations set
      status = case when status = 'issued' then 'opened' else status end,
      opened_at = coalesce(opened_at, now()),
      first_access_at = coalesce(first_access_at, now()),
      updated_at = now()
    where id = invitation.id returning * into invitation;
    return private.m51b_public_workspace(invitation);
  end if;

  select * into prepared from public.prepared_assessments
  where organization_id = invitation.organization_id and id = invitation.prepared_assessment_id and status = 'prepared';
  if prepared.id is null or (prepared.version_snapshot ->> 'preparedAssessmentVersion') <> 'm51a-prepared-assessment-1.0.0' then
    raise exception 'M51B_UNKNOWN_ASSESSMENT_VERSION';
  end if;

  if p_action = 'start' then
    if v_session_id is null or length(v_session_id) > 100 then raise exception 'M51B_INVALID_SESSION'; end if;
    if coalesce(p_payload ->> 'instructionsVersion', '') <> 'm51b-participant-instructions-1.0.0' then raise exception 'M51B_UNKNOWN_INSTRUCTIONS_VERSION'; end if;
    select * into attempt from public.assessment_attempts
    where organization_id = invitation.organization_id and invitation_id = invitation.id and attempt_number = 1 for update;
    if attempt.id is null then
      insert into public.assessment_attempts (
        organization_id, invitation_id, verification_need_id, prepared_assessment_id, person_id,
        status, started_at_server, expires_at, active_session_id, terms_snapshot, assessment_version
      ) values (
        invitation.organization_id, invitation.id, invitation.verification_need_id, invitation.prepared_assessment_id,
        invitation.person_id, 'in_progress', now(), invitation.expires_at, v_session_id,
        jsonb_build_object('instructionsVersion', p_payload ->> 'instructionsVersion', 'confirmedAt', now(), 'clientSessionId', v_session_id),
        prepared.version_snapshot ->> 'preparedAssessmentVersion'
      ) returning * into attempt;

      insert into public.assessment_question_instances (
        organization_id, attempt_id, assessment_item_id, assessment_item_version, sequence, item_key,
        stem_snapshot, option_snapshot, answer_key_snapshot, alternative_order, target_level, dimension,
        difficulty, expected_time_min_seconds, expected_time_typical_seconds, expected_time_max_seconds
      )
      select invitation.organization_id, attempt.id, item.id, item.version, item_ref.ordinality::integer,
        item.item_key, item.stem, item.options, item.answer_key ->> 'correctOptionId',
        (select jsonb_agg(option ->> 'id') from jsonb_array_elements(item.options) option),
        item.target_level, item.dimension,
        case when item.target_level = 'advanced' then 'high' when item.target_level = 'intermediate' then 'medium' else 'low' end,
        60, 120, 240
      from jsonb_array_elements_text(prepared.item_ids) with ordinality item_ref(item_id, ordinality)
      join public.assessment_items item on item.id = item_ref.item_id::uuid
      order by item_ref.ordinality;

      select * into question from public.assessment_question_instances
      where organization_id = invitation.organization_id and attempt_id = attempt.id order by sequence limit 1;
      update public.assessment_attempts set current_question_instance_id = question.id where id = attempt.id returning * into attempt;
      update public.assessment_question_instances set status = 'active', first_presented_at = now() where id = question.id;
      update public.assessment_invitations set status = 'started', updated_at = now() where id = invitation.id returning * into invitation;
      perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'invitation_opened', coalesce(invitation.opened_at, now()), 1, v_session_id, '{}'::jsonb, 'start-invitation-opened');
      perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'assessment_landing_viewed', coalesce(invitation.first_access_at, now()), 2, v_session_id, '{}'::jsonb, 'start-landing-viewed');
      perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'instructions_viewed', now(), 3, v_session_id, '{}'::jsonb, 'start-instructions-viewed');
      perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'pre_start_confirmed', now(), 4, v_session_id, '{}'::jsonb, 'start-confirmed');
      perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'assessment_started', now(), 5, v_session_id, '{}'::jsonb, 'start-assessment');
      perform private.m51b_append_event(invitation.organization_id, attempt.id, question.id, 'question_opened', now(), 6, v_session_id, '{}'::jsonb, 'start-question');
    elsif attempt.status not in ('in_progress', 'paused') then
      raise exception 'M51B_ATTEMPT_LOCKED';
    end if;
    return private.m51b_public_workspace(invitation);
  end if;

  v_attempt_id := nullif(p_payload ->> 'attemptId', '')::uuid;
  select * into attempt from public.assessment_attempts
  where organization_id = invitation.organization_id and invitation_id = invitation.id and id = v_attempt_id and attempt_number = 1 for update;
  if attempt.id is null then raise exception 'M51B_ATTEMPT_NOT_FOUND'; end if;

  if p_action = 'workspace' then return private.m51b_public_workspace(invitation); end if;
  if attempt.status not in ('in_progress', 'paused') and p_action <> 'submit' then raise exception 'M51B_ATTEMPT_LOCKED'; end if;

  v_question_id := nullif(p_payload ->> 'questionInstanceId', '')::uuid;
  if v_question_id is not null then
    select * into question from public.assessment_question_instances
    where organization_id = invitation.organization_id and attempt_id = attempt.id and id = v_question_id;
    if question.id is null then raise exception 'M51B_QUESTION_NOT_FOUND'; end if;
  end if;

  if p_action = 'save_response' then
    if attempt.status <> 'in_progress' then raise exception 'M51B_ATTEMPT_NOT_ACTIVE'; end if;
    v_selected_option := nullif(p_payload ->> 'selectedOptionId', '');
    if v_selected_option is not null and not (question.option_snapshot @> jsonb_build_array(jsonb_build_object('id', v_selected_option))) then
      raise exception 'M51B_INVALID_OPTION';
    end if;
    select * into response from public.assessment_responses
    where organization_id = invitation.organization_id and attempt_id = attempt.id and question_instance_id = question.id for update;
    if response.id is not null and coalesce((p_payload ->> 'expectedVersion')::integer, 0) <> response.response_version then
      raise exception 'M51B_STALE_RESPONSE_VERSION';
    end if;
    if response.id is null then
      if coalesce((p_payload ->> 'expectedVersion')::integer, 0) <> 0 then raise exception 'M51B_STALE_RESPONSE_VERSION'; end if;
      insert into public.assessment_responses (
        organization_id, attempt_id, question_instance_id, selected_option, first_selected_option, final_selected_option,
        selection_count, first_selected_at, last_changed_at, marked_for_review
      ) values (
        invitation.organization_id, attempt.id, question.id, v_selected_option, v_selected_option, v_selected_option,
        case when v_selected_option is null then 0 else 1 end,
        case when v_selected_option is null then null else now() end,
        case when v_selected_option is null then null else now() end,
        coalesce((p_payload ->> 'markedForReview')::boolean, false)
      ) returning * into response;
      v_event_type := case when v_selected_option is null then 'question_unmarked' else 'answer_selected' end;
    else
      v_event_type := case
        when response.final_selected_option is distinct from v_selected_option then 'answer_changed'
        when response.marked_for_review is false and coalesce((p_payload ->> 'markedForReview')::boolean, false) then 'question_marked'
        when response.marked_for_review is true and not coalesce((p_payload ->> 'markedForReview')::boolean, false) then 'question_unmarked'
        else 'answer_selected'
      end;
      update public.assessment_responses set
        selected_option = v_selected_option,
        final_selected_option = v_selected_option,
        selection_count = assessment_responses.selection_count + case when v_selected_option is null then 0 else 1 end,
        change_count = assessment_responses.change_count + case when assessment_responses.final_selected_option is distinct from v_selected_option then 1 else 0 end,
        last_changed_at = case when assessment_responses.final_selected_option is distinct from v_selected_option then now() else assessment_responses.last_changed_at end,
        marked_for_review = coalesce((p_payload ->> 'markedForReview')::boolean, false),
        response_version = assessment_responses.response_version + 1,
        updated_at = now()
      where id = response.id returning * into response;
    end if;
    update public.assessment_question_instances set
      first_interaction_at = coalesce(first_interaction_at, now()),
      status = case when response.marked_for_review then 'marked' when response.final_selected_option is not null then 'answered' else status end
    where id = question.id;
    update public.assessment_attempts set current_question_instance_id = question.id, lock_version = lock_version + 1, updated_at = now() where id = attempt.id;
    perform private.m51b_append_event(invitation.organization_id, attempt.id, question.id, v_event_type,
      coalesce(nullif(p_payload ->> 'occurredAtClient', '')::timestamptz, now()),
      coalesce((p_payload ->> 'sequence')::integer, 1), coalesce(v_session_id, attempt.active_session_id),
      jsonb_build_object('responseVersion', response.response_version, 'markedForReview', response.marked_for_review),
      coalesce(p_payload ->> 'idempotencyKey', gen_random_uuid()::text));
    return private.m51b_public_workspace(invitation);
  end if;

  if p_action = 'record_event' then
    v_event_type := p_payload ->> 'eventType';
    if v_event_type in ('page_hidden', 'page_visible', 'window_blurred', 'window_focused', 'connection_lost', 'connection_restored', 'page_reloaded', 'assessment_paused', 'assessment_resumed', 'question_elapsed', 'question_opened', 'technical_error') and question.id is null then
      raise exception 'M51B_ACTIVE_QUESTION_REQUIRED';
    end if;
    v_client_sequence := coalesce((p_payload ->> 'sequence')::integer, 0);
    v_client_time := coalesce(nullif(p_payload ->> 'occurredAtClient', '')::timestamptz, now());
    v_idempotency_key := nullif(p_payload ->> 'idempotencyKey', '');
    if v_event_type is null or v_client_sequence <= 0 or v_session_id is null or v_idempotency_key is null then raise exception 'M51B_INVALID_EVENT'; end if;
    perform private.m51b_append_event(invitation.organization_id, attempt.id, question.id, v_event_type, v_client_time,
      v_client_sequence, v_session_id,
      jsonb_build_object('durationSeconds', greatest(coalesce((p_payload ->> 'durationSeconds')::integer, 0), 0), 'technicalState', p_payload -> 'technicalState'),
      v_idempotency_key);
    if v_event_type = 'question_opened' then
      update public.assessment_attempts set current_question_instance_id = question.id, updated_at = now() where id = attempt.id;
      update public.assessment_question_instances set status = case when status = 'not_presented' then 'active' else status end,
        first_presented_at = coalesce(first_presented_at, now()) where id = question.id;
    end if;
    return jsonb_build_object('accepted', true);
  end if;

  if p_action in ('pause', 'resume') then
    if question.id is null then raise exception 'M51B_ACTIVE_QUESTION_REQUIRED'; end if;
    if p_action = 'pause' and attempt.status <> 'in_progress' then raise exception 'M51B_ATTEMPT_NOT_ACTIVE'; end if;
    if p_action = 'resume' and attempt.status <> 'paused' then raise exception 'M51B_ATTEMPT_NOT_PAUSED'; end if;
    update public.assessment_attempts set
      status = case when p_action = 'pause' then 'paused' else 'in_progress' end,
      paused_at = case when p_action = 'pause' then now() else paused_at end,
      resumed_at = case when p_action = 'resume' then now() else resumed_at end,
      active_session_id = v_session_id,
      current_question_instance_id = question.id,
      lock_version = lock_version + 1,
      updated_at = now()
    where id = attempt.id;
    perform private.m51b_append_event(invitation.organization_id, attempt.id, question.id,
      case when p_action = 'pause' then 'assessment_paused' else 'assessment_resumed' end,
      now(), coalesce((p_payload ->> 'sequence')::integer, 1), coalesce(v_session_id, attempt.active_session_id), '{}'::jsonb,
      coalesce(p_payload ->> 'idempotencyKey', gen_random_uuid()::text));
    return private.m51b_public_workspace(invitation);
  end if;

  if p_action = 'submit' then
    select * into evaluation from public.assessment_evaluations
    where organization_id = invitation.organization_id and attempt_id = attempt.id and evaluation_version = 'm51b-assessment-evaluation-1.0.0';
    if evaluation.id is not null then return private.m51b_public_workspace(invitation); end if;
    if attempt.status not in ('in_progress', 'paused', 'submitted') then raise exception 'M51B_ATTEMPT_LOCKED'; end if;
    if coalesce(p_payload ->> 'evaluationVersion', '') <> 'm51b-assessment-evaluation-1.0.0' then raise exception 'M51B_UNKNOWN_EVALUATION_VERSION'; end if;
    update public.assessment_attempts set status = 'submitted', submitted_at_server = coalesce(submitted_at_server, now()), updated_at = now() where id = attempt.id returning * into attempt;
    perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'assessment_submit_requested', now(),
      coalesce((p_payload ->> 'sequence')::integer, 1), coalesce(v_session_id, attempt.active_session_id), '{}'::jsonb,
      coalesce(p_payload ->> 'idempotencyKey', 'submit-' || attempt.id::text));

    insert into public.assessment_question_metrics (
      organization_id, attempt_id, question_instance_id, total_elapsed_seconds, active_seconds, hidden_seconds,
      blurred_seconds, absence_count, blur_count, revisit_count, answer_change_count,
      expected_time_min_seconds, expected_time_typical_seconds, expected_time_max_seconds, actual_time_ratio,
      difficulty, result, technical_incident_present, flags
    )
    select qi.organization_id, qi.attempt_id, qi.id,
      coalesce(sum(case when ae.event_type = 'question_elapsed' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0)::integer,
      greatest(coalesce(sum(case when ae.event_type = 'question_elapsed' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0)
        - coalesce(sum(case when ae.event_type in ('page_visible', 'window_focused') then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0), 0)::integer,
      coalesce(sum(case when ae.event_type = 'page_visible' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0)::integer,
      coalesce(sum(case when ae.event_type = 'window_focused' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0)::integer,
      count(*) filter (where ae.event_type = 'page_hidden')::integer,
      count(*) filter (where ae.event_type = 'window_blurred')::integer,
      greatest(count(*) filter (where ae.event_type = 'question_opened') - 1, 0)::integer,
      coalesce(ar.change_count, 0), qi.expected_time_min_seconds, qi.expected_time_typical_seconds, qi.expected_time_max_seconds,
      case when qi.expected_time_typical_seconds = 0 then 0 else
        coalesce(sum(case when ae.event_type = 'question_elapsed' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0)::numeric / qi.expected_time_typical_seconds end,
      qi.difficulty,
      case when ar.final_selected_option is null then 'unanswered'
        when ar.final_selected_option = qi.answer_key_snapshot then 'correct' else 'incorrect' end,
      coalesce(bool_or(ae.event_type in ('connection_lost', 'technical_error')), false),
      jsonb_build_array() ||
        case when coalesce(bool_or(ae.event_type in ('connection_lost', 'technical_error')), false) then jsonb_build_array('TECHNICAL_INCIDENT') else '[]'::jsonb end ||
        case when coalesce(sum(case when ae.event_type = 'page_visible' then greatest(coalesce((ae.metadata ->> 'durationSeconds')::integer, 0), 0) else 0 end), 0) > greatest(60, qi.expected_time_typical_seconds * 0.75) then jsonb_build_array('EXTENDED_PAGE_ABSENCE') else '[]'::jsonb end
    from public.assessment_question_instances qi
    left join public.assessment_responses ar on ar.organization_id = qi.organization_id and ar.attempt_id = qi.attempt_id and ar.question_instance_id = qi.id
    left join public.assessment_events ae on ae.organization_id = qi.organization_id and ae.attempt_id = qi.attempt_id and ae.question_instance_id = qi.id
    where qi.organization_id = invitation.organization_id and qi.attempt_id = attempt.id
    group by qi.id, ar.id;

    select count(*), count(*) filter (where result <> 'unanswered'), count(*) filter (where result = 'correct'),
      count(*) filter (where result = 'incorrect'), count(*) filter (where result = 'unanswered')
    into total_count, answered_count, correct_count, incorrect_count, unanswered_count
    from public.assessment_question_metrics where organization_id = invitation.organization_id and attempt_id = attempt.id;
    completion_ratio := case when total_count = 0 then 0 else answered_count::numeric / total_count end;
    select coalesce(jsonb_object_agg(dimension, jsonb_build_object('total', total, 'correct', correct, 'percentage', percentage)), '{}'::jsonb)
    into v_dimension_results from (
      select qi.dimension, count(*)::integer total, count(*) filter (where metric.result = 'correct')::integer correct,
        round(100.0 * count(*) filter (where metric.result = 'correct') / nullif(count(*), 0), 1) percentage
      from public.assessment_question_metrics metric
      join public.assessment_question_instances qi on qi.organization_id = metric.organization_id and qi.id = metric.question_instance_id
      where metric.organization_id = invitation.organization_id and metric.attempt_id = attempt.id group by qi.dimension
    ) dimensions;
    v_raw_result := jsonb_build_object('totalQuestions', total_count, 'correct', correct_count, 'incorrect', incorrect_count,
      'unanswered', unanswered_count, 'percentage', case when total_count = 0 then 0 else round(100.0 * correct_count / total_count, 1) end);

    select count(*) filter (where event_type in ('connection_lost', 'technical_error')),
      count(*) filter (where event_type in ('page_hidden', 'window_blurred')),
      count(distinct question_instance_id) filter (where event_type in ('page_hidden', 'window_blurred')),
      count(distinct session_id)
    into technical_count, context_switch_count, affected_questions, session_count
    from public.assessment_events where organization_id = invitation.organization_id and attempt_id = attempt.id;
    select coalesce(sum(metric.hidden_seconds), 0)::integer into v_hidden_seconds
    from public.assessment_question_metrics metric where metric.organization_id = invitation.organization_id and metric.attempt_id = attempt.id;
    v_integrity_flags := '[]'::jsonb
      || case when technical_count > 0 then jsonb_build_array('TECHNICAL_INCIDENT') else '[]'::jsonb end
      || case when context_switch_count >= greatest(6, total_count) then jsonb_build_array('FREQUENT_CONTEXT_SWITCHING') else '[]'::jsonb end
      || case when session_count > 1 then jsonb_build_array('SESSION_CHANGE') else '[]'::jsonb end
      || case when completion_ratio < 0.7 then jsonb_build_array('INSUFFICIENT_COMPLETION') else '[]'::jsonb end;
    v_integrity_state := case when completion_ratio < 0.7 or technical_count >= 3 then 'inconclusive'
      when context_switch_count >= greatest(6, total_count) or v_hidden_seconds > 300 then 'reduced' else 'adequate' end;
    v_coverage_state := case
      when completion_ratio >= 0.7
        and jsonb_object_length(v_dimension_results) >= coalesce((
          select jsonb_array_length(rubric.correction_dimensions)
          from public.assessment_rubrics rubric
          where rubric.organization_id = invitation.organization_id and rubric.id = prepared.rubric_id
        ), 1)
      then 'sufficient' else 'insufficient' end;
    v_demonstrated_level := case when v_coverage_state = 'insufficient' or v_integrity_state = 'inconclusive' then 'inconclusive'
      when (v_raw_result ->> 'percentage')::numeric >= 80 then 'advanced'
      when (v_raw_result ->> 'percentage')::numeric >= 60 then 'intermediate'
      when (v_raw_result ->> 'percentage')::numeric >= 40 then 'basic' else 'insufficient_evidence' end;
    v_confidence_state := case when v_demonstrated_level = 'inconclusive' then 'inconclusive'
      when v_integrity_state = 'reduced' then 'reduced' else 'adequate' end;
    v_reason_codes := jsonb_build_array(
      case when v_coverage_state = 'sufficient' then 'BLUEPRINT_COVERAGE_MET' else 'BLUEPRINT_COVERAGE_INSUFFICIENT' end,
      'UNCALIBRATED_QA_ITEMS_USED',
      case when v_integrity_state = 'adequate' then 'EXECUTION_CONDITIONS_ADEQUATE' when v_integrity_state = 'reduced' then 'OBSERVED_PATTERNS_REDUCE_STRENGTH' else 'EXECUTION_CONDITIONS_INCONCLUSIVE' end,
      'BROWSER_TELEMETRY_IS_NOT_PROOF_OF_CONDUCT'
    );

    insert into public.assessment_integrity_analyses (organization_id, attempt_id, integrity_state, facts, flags, patterns, reason_codes, ruleset_version)
    values (invitation.organization_id, attempt.id, v_integrity_state,
      jsonb_build_object('contextSwitchCount', context_switch_count, 'hiddenSeconds', v_hidden_seconds, 'affectedQuestionCount', affected_questions,
        'sessionCount', session_count, 'technicalIncidentCount', technical_count), v_integrity_flags, v_integrity_flags,
      jsonb_build_array('BROWSER_TELEMETRY_IS_NOT_PROOF_OF_CONDUCT'), 'm51b-integrity-ruleset-1.0.0')
    on conflict (organization_id, attempt_id, ruleset_version) do nothing;
    select * into integrity from public.assessment_integrity_analyses
    where organization_id = invitation.organization_id and attempt_id = attempt.id and ruleset_version = 'm51b-integrity-ruleset-1.0.0';

    matching_snapshot := jsonb_build_object(
      'matchingVersion', 'm51b-explainable-matching-1.0.0',
      'status', case when v_demonstrated_level = 'advanced' and v_confidence_state in ('high', 'adequate') then 'sufficient'
        when v_demonstrated_level = 'inconclusive' then 'insufficient_information' else 'verification_recommended' end,
      'explanation', case when v_demonstrated_level = 'advanced' and v_confidence_state in ('high', 'adequate')
        then 'A evidência demonstrada sustenta o nível avançado requerido nesta necessidade.'
        when v_demonstrated_level = 'inconclusive' then 'A execução não permite uma interpretação responsável da competência nesta tentativa.'
        else 'A evidência demonstrada disponível não sustenta o nível avançado requerido nesta necessidade.' end,
      'automaticDecision', false
    );
    insert into public.assessment_evaluations (
      organization_id, attempt_id, rubric_id, integrity_analysis_id, raw_result, dimension_results, demonstrated_level,
      coverage_state, methodological_quality, confidence_state, reason_codes, version_snapshot, matching_reassessment, evaluation_version
    ) values (
      invitation.organization_id, attempt.id, prepared.rubric_id, integrity.id, v_raw_result, v_dimension_results, v_demonstrated_level,
      v_coverage_state, case when v_coverage_state = 'sufficient' then 'limited' else 'insufficient' end, v_confidence_state, v_reason_codes,
      prepared.version_snapshot || jsonb_build_object('scoringVersion', 'm51b-deterministic-scoring-1.0.0', 'integrityRuleVersion', 'm51b-integrity-ruleset-1.0.0', 'confidenceVersion', 'm51b-evidence-confidence-1.0.0'),
      matching_snapshot, 'm51b-assessment-evaluation-1.0.0'
    ) returning * into evaluation;

    select * into need from public.verification_needs where organization_id = invitation.organization_id and id = invitation.verification_need_id;
    insert into public.competency_demonstrated_evidence (
      organization_id, person_id, competency_key, verification_need_id, prepared_assessment_id, attempt_id, evaluation_id,
      verification_definition_id, verification_definition_version, blueprint_id, blueprint_version, rubric_id, rubric_version,
      evaluation_version, integrity_rule_version, demonstrated_level, raw_result, dimension_results, coverage_state,
      methodological_quality, integrity_state, confidence_state, reason_codes, provenance
    ) values (
      invitation.organization_id, invitation.person_id, need.competency_key, invitation.verification_need_id, prepared.id, attempt.id, evaluation.id,
      prepared.definition_id, prepared.version_snapshot ->> 'definitionVersion', prepared.blueprint_id, prepared.version_snapshot ->> 'blueprintVersion',
      prepared.rubric_id, prepared.version_snapshot ->> 'rubricVersion', evaluation.evaluation_version, integrity.ruleset_version,
      v_demonstrated_level, v_raw_result, v_dimension_results, v_coverage_state, evaluation.methodological_quality, v_integrity_state, v_confidence_state,
      v_reason_codes, jsonb_build_object('method', 'multiple_choice', 'qaSyntheticOnly', true, 'assessmentItemVersions', prepared.version_snapshot -> 'itemVersions')
    ) on conflict (organization_id, attempt_id) do nothing;
    select * into evidence from public.competency_demonstrated_evidence where organization_id = invitation.organization_id and attempt_id = attempt.id;

    update public.verification_needs set
      status = case when v_demonstrated_level = 'inconclusive' then 'inconclusive' else 'resolved' end,
      sufficiency_status = matching_snapshot ->> 'status',
      sufficiency_reason_codes = v_reason_codes,
      sufficiency_explanation = matching_snapshot ->> 'explanation',
      sufficiency_engine_version = 'm51b-evidence-sufficiency-1.0.0',
      evidence_snapshot = evidence_snapshot || jsonb_build_object('demonstratedEvidenceId', evidence.id, 'demonstratedLevel', v_demonstrated_level,
        'confidenceState', v_confidence_state, 'rawResult', v_raw_result),
      updated_at = now()
    where organization_id = invitation.organization_id and id = invitation.verification_need_id;

    insert into public.match_evaluations (organization_id, person_id, vacancy_id, evaluation_data, matching_version, prompt_version, model_version)
    values (invitation.organization_id, invitation.person_id, need.vacancy_id,
      jsonb_build_object('source', 'demonstrated_evidence', 'verificationNeedId', need.id, 'demonstratedEvidenceId', evidence.id,
        'competencyKey', need.competency_key, 'targetLevel', need.target_level, 'demonstratedLevel', v_demonstrated_level,
        'confidenceState', v_confidence_state, 'explanation', matching_snapshot ->> 'explanation', 'automaticDecision', false),
      'm51b-explainable-matching-1.0.0', 'not-applicable-deterministic', 'not-applicable-no-llm');

    update public.assessment_attempts set status = case when v_demonstrated_level = 'inconclusive' then 'inconclusive' else 'evaluated' end,
      elapsed_total_seconds = greatest(0, extract(epoch from (submitted_at_server - started_at_server))::integer),
      elapsed_active_seconds = greatest(0, extract(epoch from (submitted_at_server - started_at_server))::integer - v_hidden_seconds), updated_at = now()
    where id = attempt.id;
    update public.assessment_question_instances set submitted_at = now(), status = 'submitted'
    where organization_id = invitation.organization_id and attempt_id = attempt.id;
    update public.assessment_responses set submitted_at = now() where organization_id = invitation.organization_id and attempt_id = attempt.id;
    update public.assessment_invitations set status = 'completed', completed_at = now(), updated_at = now() where id = invitation.id returning * into invitation;
    perform private.m51b_append_event(invitation.organization_id, attempt.id, null, 'assessment_submitted', now(),
      coalesce((p_payload ->> 'sequence')::integer, 1) + 1, coalesce(v_session_id, attempt.active_session_id), '{}'::jsonb, 'submitted-' || attempt.id::text);
    insert into public.verification_audit_events (organization_id, actor_auth_user_id, need_id, prepared_assessment_id, action, result, payload)
    values (invitation.organization_id, invitation.created_by_auth_user_id, invitation.verification_need_id, invitation.prepared_assessment_id,
      'demonstrated_evidence_created', 'success', jsonb_build_object('attempt_id', attempt.id, 'evaluation_id', evaluation.id,
        'evidence_id', evidence.id, 'integrity_state', v_integrity_state, 'confidence_state', v_confidence_state, 'boundary_actor', 'public_token'));
    return private.m51b_public_workspace(invitation);
  end if;

  raise exception 'M51B_UNKNOWN_ACTION';
end;
$$;

alter table public.assessment_invitations enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_question_instances enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_events enable row level security;
alter table public.assessment_question_metrics enable row level security;
alter table public.assessment_integrity_analyses enable row level security;
alter table public.assessment_evaluations enable row level security;
alter table public.competency_demonstrated_evidence enable row level security;
alter table public.assessment_access_requests enable row level security;

create policy assessment_invitations_select on public.assessment_invitations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_attempts_select on public.assessment_attempts for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_question_instances_select on public.assessment_question_instances for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_responses_select on public.assessment_responses for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_events_select on public.assessment_events for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_question_metrics_select on public.assessment_question_metrics for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_integrity_analyses_select on public.assessment_integrity_analyses for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy assessment_evaluations_select on public.assessment_evaluations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
create policy demonstrated_evidence_select on public.competency_demonstrated_evidence for select to authenticated
using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter', 'member']::public.membership_role[])));

revoke all on public.assessment_invitations from anon, authenticated;
revoke all on public.assessment_attempts from anon, authenticated;
revoke all on public.assessment_question_instances from anon, authenticated;
revoke all on public.assessment_responses from anon, authenticated;
revoke all on public.assessment_events from anon, authenticated;
revoke all on public.assessment_question_metrics from anon, authenticated;
revoke all on public.assessment_integrity_analyses from anon, authenticated;
revoke all on public.assessment_evaluations from anon, authenticated;
revoke all on public.competency_demonstrated_evidence from anon, authenticated;
revoke all on public.assessment_access_requests from anon, authenticated;
grant select on public.assessment_invitations, public.assessment_attempts, public.assessment_question_instances,
  public.assessment_responses, public.assessment_events, public.assessment_question_metrics,
  public.assessment_integrity_analyses, public.assessment_evaluations, public.competency_demonstrated_evidence to authenticated;

revoke all on function private.m51b_append_event(uuid, uuid, uuid, text, timestamptz, integer, text, jsonb, text) from public, anon, authenticated, service_role;
revoke all on function private.m51b_public_workspace(public.assessment_invitations) from public, anon, authenticated, service_role;
revoke all on function public.issue_m51b_invitation(uuid, text, text, integer, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.load_m51b_operator_workspace(uuid) from public, anon, authenticated, service_role;
revoke all on function public.manage_m51b_invitation(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.m51b_public_access(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.issue_m51b_invitation(uuid, text, text, integer, text, text, text) to authenticated;
grant execute on function public.load_m51b_operator_workspace(uuid) to authenticated;
grant execute on function public.manage_m51b_invitation(uuid, text) to authenticated;
grant execute on function public.m51b_public_access(text, text, jsonb) to service_role;

commit;
