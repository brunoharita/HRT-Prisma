create extension if not exists unaccent with schema extensions;

create type public.knowledge_scope as enum ('global', 'organization');
create type public.knowledge_concept_type as enum ('occupation', 'skill', 'knowledge', 'technology', 'methodology', 'certification');
create type public.knowledge_status as enum ('draft', 'approved', 'deprecated', 'rejected');
create type public.knowledge_relation_type as enum ('is_a', 'part_of', 'related_to', 'requires', 'uses', 'applies_to', 'supports', 'equivalent_to', 'broader_than', 'narrower_than');
create type public.knowledge_mapping_type as enum ('exact', 'close', 'broader', 'narrower', 'related');
create type public.knowledge_source_class as enum (
  'official_occupational_taxonomy', 'official_vendor_documentation', 'official_certification_issuer',
  'official_standard_body', 'official_government_or_public_body', 'recognized_nonprofit_foundation',
  'secondary_recognized_source'
);
create type public.knowledge_inbox_status as enum (
  'unresolved', 'research_queued', 'researching', 'proposal_ready', 'awaiting_human_review',
  'approved', 'rejected', 'ambiguous', 'deferred', 'failed', 'budget_limited'
);
create type public.knowledge_reinterpretation_policy as enum ('off', 'manual', 'daily', 'weekly', 'monthly', 'custom');

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  source_class public.knowledge_source_class not null,
  publisher text not null,
  method text not null check (method in ('dataset', 'api', 'web')),
  allowed_scope public.knowledge_scope not null default 'global',
  status public.knowledge_status not null default 'draft',
  license text,
  attribution_requirements text,
  last_verified_at timestamptz,
  approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain)
);

create table public.knowledge_source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete restrict,
  external_version text not null,
  release_date date,
  retrieval_date timestamptz,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  format text not null,
  license text,
  import_status text not null default 'catalogued'
    check (import_status in ('catalogued', 'uploaded', 'validated', 'staged', 'diff_ready', 'published', 'failed')),
  counts jsonb not null default '{}'::jsonb check (jsonb_typeof(counts) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  previous_version_id uuid references public.knowledge_source_versions(id) on delete restrict,
  raw_storage_path text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (source_id, external_version)
);

create table public.knowledge_change_sets (
  id uuid primary key default gen_random_uuid(),
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  version bigint not null check (version > 0),
  summary text not null,
  source_versions jsonb not null default '[]'::jsonb check (jsonb_typeof(source_versions) = 'array'),
  changed_entities jsonb not null default '[]'::jsonb check (jsonb_typeof(changed_entities) = 'array'),
  approved_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  unique nulls not distinct (scope, organization_id, version),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);

create table public.knowledge_concepts (
  id uuid primary key default gen_random_uuid(),
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  concept_type public.knowledge_concept_type not null,
  canonical_label text not null check (char_length(btrim(canonical_label)) between 1 and 240),
  description text not null default '',
  language text not null default 'pt-BR',
  status public.knowledge_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  change_set_id uuid references public.knowledge_change_sets(id) on delete restrict,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_by_auth_user_id uuid references auth.users(id) on delete restrict,
  approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);
create unique index knowledge_concepts_canonical_idx on public.knowledge_concepts
  (scope, coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), concept_type, lower(btrim(canonical_label)), version);
create index knowledge_concepts_lookup_idx on public.knowledge_concepts
  (scope, organization_id, status, concept_type, lower(btrim(canonical_label)));

create table public.knowledge_terms (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.knowledge_concepts(id) on delete cascade,
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 240),
  normalized_term text not null check (char_length(normalized_term) between 1 and 240),
  language text not null default 'pt-BR',
  term_type text not null default 'alias' check (term_type in ('canonical', 'alias', 'synonym', 'abbreviation')),
  source_id uuid references public.knowledge_sources(id) on delete restrict,
  status public.knowledge_status not null default 'draft',
  ambiguous boolean not null default false,
  version integer not null default 1 check (version > 0),
  approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);
create index knowledge_terms_normalized_idx on public.knowledge_terms (normalized_term, scope, organization_id, status);

create table public.knowledge_relations (
  id uuid primary key default gen_random_uuid(),
  source_concept_id uuid not null references public.knowledge_concepts(id) on delete cascade,
  target_concept_id uuid not null references public.knowledge_concepts(id) on delete cascade,
  relation_type public.knowledge_relation_type not null,
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete restrict,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  status public.knowledge_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  approved_by_auth_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_concept_id, target_concept_id, relation_type, version),
  check (source_concept_id <> target_concept_id),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);

create table public.knowledge_external_mappings (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.knowledge_concepts(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete restrict,
  source_version_id uuid not null references public.knowledge_source_versions(id) on delete restrict,
  external_id text not null,
  external_uri text,
  mapping_type public.knowledge_mapping_type not null,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_version_id, external_id, concept_id)
);
create index knowledge_external_mapping_lookup_idx on public.knowledge_external_mappings (source_id, external_id);

create table public.organization_knowledge_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  allow_external_knowledge_enrichment boolean not null default false,
  reinterpretation_policy public.knowledge_reinterpretation_policy not null default 'off',
  custom_interval interval,
  inherit_global boolean not null default false,
  source_check_frequency interval not null default interval '1 month',
  updated_by_auth_user_id uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (reinterpretation_policy = 'custom' or custom_interval is null),
  check (reinterpretation_policy <> 'custom' or custom_interval > interval '0 seconds')
);

create table public.knowledge_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  evidence_id uuid not null,
  original_term text not null,
  normalized_term text not null,
  language text not null default 'pt-BR',
  resolution_state text not null check (resolution_state in ('normalized', 'ambiguous', 'unresolved')),
  concept_id uuid references public.knowledge_concepts(id) on delete restrict,
  candidate_concept_ids uuid[] not null default '{}',
  normalization_method text not null,
  knowledge_global_version bigint not null,
  knowledge_organization_version bigint,
  created_at timestamptz not null default now(),
  unique (organization_id, evidence_id, normalized_term),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, evidence_id) references public.evidence(organization_id, id) on delete cascade,
  check ((resolution_state = 'normalized' and concept_id is not null) or (resolution_state <> 'normalized' and concept_id is null))
);
create index knowledge_observations_concept_idx on public.knowledge_observations (organization_id, concept_id, person_id);

create table public.knowledge_inbox (
  id uuid primary key default gen_random_uuid(),
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  original_term text not null,
  normalized_search_term text not null,
  language text not null default 'pt-BR',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count bigint not null default 1 check (occurrence_count > 0),
  status public.knowledge_inbox_status not null default 'unresolved',
  candidate_concept_ids uuid[] not null default '{}',
  evidence_reference_ids uuid[] not null default '{}',
  cooldown_until timestamptz,
  created_by_auth_user_id uuid references auth.users(id) on delete restrict,
  unique nulls not distinct (scope, organization_id, fingerprint),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);
create index knowledge_inbox_queue_idx on public.knowledge_inbox (scope, organization_id, status, last_seen_at desc);

create table public.knowledge_research_runs (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.knowledge_inbox(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  provider text not null,
  model text not null,
  prompt_version text not null,
  output_schema_version text not null,
  source_policy_version text not null,
  status text not null check (status in ('queued', 'researching', 'proposal_ready', 'failed', 'budget_limited')),
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost_usd numeric(12,8),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (request_fingerprint, status) deferrable initially immediate
);

create table public.knowledge_research_sources (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.knowledge_research_runs(id) on delete cascade,
  knowledge_source_id uuid not null references public.knowledge_sources(id) on delete restrict,
  url text not null,
  title text not null,
  publisher text not null,
  source_class public.knowledge_source_class not null,
  retrieved_at timestamptz not null,
  content_summary text not null default '',
  content_hash text,
  created_at timestamptz not null default now(),
  unique (research_run_id, url)
);

create table public.knowledge_proposals (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.knowledge_inbox(id) on delete cascade,
  research_run_id uuid references public.knowledge_research_runs(id) on delete restrict,
  scope public.knowledge_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_type text not null default 'create' check (proposal_type in ('create', 'update')),
  target_concept_id uuid references public.knowledge_concepts(id) on delete restrict,
  original_proposal jsonb not null check (jsonb_typeof(original_proposal) = 'object'),
  human_edited_proposal jsonb check (human_edited_proposal is null or jsonb_typeof(human_edited_proposal) = 'object'),
  status text not null default 'awaiting_human_review'
    check (status in ('awaiting_human_review', 'approved', 'rejected', 'deferred', 'research_requested')),
  provider text,
  model text,
  prompt_version text,
  output_schema_version text,
  source_policy_version text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_auth_user_id uuid references auth.users(id) on delete restrict,
  decision_reason text,
  published_concept_id uuid references public.knowledge_concepts(id) on delete restrict,
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null))
);

create table public.knowledge_approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.knowledge_proposals(id) on delete restrict,
  action text not null check (action in ('approved', 'edited_and_approved', 'rejected', 'deferred', 'research_requested')),
  original_proposal jsonb not null,
  decided_proposal jsonb,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

create table public.knowledge_reinterpretation_impacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  profile_id uuid not null,
  change_set_id uuid not null references public.knowledge_change_sets(id) on delete cascade,
  concept_id uuid not null references public.knowledge_concepts(id) on delete restrict,
  policy public.knowledge_reinterpretation_policy not null,
  status text not null default 'pending' check (status in ('pending', 'queued', 'draft_ready', 'completed', 'dismissed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id, profile_id, change_set_id, concept_id),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, profile_id) references public.professional_profiles(organization_id, id) on delete cascade
);

create table public.knowledge_reinterpretation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  impact_id uuid not null references public.knowledge_reinterpretation_impacts(id) on delete cascade,
  person_id uuid not null,
  base_profile_id uuid not null,
  review_id uuid references public.profile_reviews(id) on delete restrict,
  idempotency_key text not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null default 'queued' check (status in ('queued', 'processing', 'draft_ready', 'completed', 'failed')),
  knowledge_global_version bigint not null,
  knowledge_organization_version bigint,
  requested_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, idempotency_key),
  foreign key (organization_id, person_id) references public.people(organization_id, id) on delete cascade,
  foreign key (organization_id, base_profile_id) references public.professional_profiles(organization_id, id) on delete restrict
);

alter table public.profile_reviews
  add column knowledge_global_version bigint,
  add column knowledge_organization_version bigint,
  add column reinterpretation_job_id uuid references public.knowledge_reinterpretation_jobs(id) on delete restrict;
alter table public.professional_profiles
  add column knowledge_global_version bigint,
  add column knowledge_organization_version bigint,
  add column reinterpretation_job_id uuid references public.knowledge_reinterpretation_jobs(id) on delete restrict;

create or replace function private.normalize_knowledge_term(value text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9+#.]+', ' ', 'g'));
$$;

create or replace function private.require_knowledge_admin(p_organization_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := (select auth.uid());
begin
  if actor_id is null then raise exception using errcode = '28000', message = 'authenticated user required'; end if;
  if p_organization_id is null then
    if not (select private.is_super_admin(actor_id)) then raise exception using errcode = '42501', message = 'global Knowledge requires Super Admin'; end if;
  elsif not (select private.has_org_role(p_organization_id, array['super_admin', 'owner', 'admin']::public.membership_role[])) then
    raise exception using errcode = '42501', message = 'organization Knowledge approval denied';
  end if;
  return actor_id;
end;
$$;
revoke all on function private.require_knowledge_admin(uuid) from public, anon, authenticated;

create or replace function public.resolve_knowledge_term(p_organization_id uuid, p_observed_term text, p_language text default 'pt-BR')
returns table (resolution_state text, concept_id uuid, concept_label text, concept_type public.knowledge_concept_type,
  resolution_scope public.knowledge_scope, candidate_ids uuid[], normalized_term text, global_version bigint, organization_version bigint)
language sql stable security invoker set search_path = '' as $$
  with normalized as (select private.normalize_knowledge_term(p_observed_term) as value),
  versions as (
    select coalesce(max(version) filter (where scope = 'global'), 0) as global_version,
      max(version) filter (where scope = 'organization' and organization_id = p_organization_id) as organization_version
    from public.knowledge_change_sets
  ), candidates as (
    select concept.id, concept.canonical_label, concept.concept_type, concept.scope, term.ambiguous,
      case when concept.scope = 'organization' then 1 else 2 end as precedence
    from public.knowledge_terms term join public.knowledge_concepts concept on concept.id = term.concept_id
    cross join normalized
    where term.normalized_term = normalized.value and term.status = 'approved' and concept.status = 'approved'
      and (concept.scope = 'global' or (concept.scope = 'organization' and concept.organization_id = p_organization_id))
  ), preferred as (select * from candidates where precedence = (select min(precedence) from candidates)), aggregate_result as (
    select count(*) as count, bool_or(ambiguous) as ambiguous, array_agg(id order by id) as ids,
      (array_agg(id order by id))[1] as single_id, min(canonical_label) as label, min(concept_type::text)::public.knowledge_concept_type as type,
      min(scope::text)::public.knowledge_scope as scope from preferred
  )
  select case when aggregate_result.count = 1 and not coalesce(aggregate_result.ambiguous, false) then 'normalized'
      when aggregate_result.count > 0 then 'ambiguous' else 'unresolved' end,
    case when aggregate_result.count = 1 and not coalesce(aggregate_result.ambiguous, false) then aggregate_result.single_id end,
    case when aggregate_result.count = 1 and not coalesce(aggregate_result.ambiguous, false) then aggregate_result.label end,
    case when aggregate_result.count = 1 and not coalesce(aggregate_result.ambiguous, false) then aggregate_result.type end,
    case when aggregate_result.count = 1 and not coalesce(aggregate_result.ambiguous, false) then aggregate_result.scope end,
    coalesce(aggregate_result.ids, '{}'), normalized.value, versions.global_version, versions.organization_version
  from aggregate_result cross join normalized cross join versions;
$$;

create or replace function public.enqueue_knowledge_observation(
  p_organization_id uuid, p_person_id uuid, p_evidence_id uuid, p_original_term text, p_language text default 'pt-BR'
) returns table (observation_id uuid, inbox_id uuid, resolution_state text, concept_id uuid)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; resolution record; new_observation uuid; queued_inbox uuid; scope_value public.knowledge_scope;
  fingerprint_value text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform 1 from public.evidence e where e.organization_id = p_organization_id and e.id = p_evidence_id and e.person_id = p_person_id;
  if not found then raise exception using errcode = 'P0002', message = 'evidence reference not found in organization'; end if;
  select * into resolution from public.resolve_knowledge_term(p_organization_id, p_original_term, p_language);
  insert into public.knowledge_observations (organization_id, person_id, evidence_id, original_term, normalized_term, language,
    resolution_state, concept_id, candidate_concept_ids, normalization_method, knowledge_global_version, knowledge_organization_version)
  values (p_organization_id, p_person_id, p_evidence_id, p_original_term, resolution.normalized_term, p_language,
    resolution.resolution_state, resolution.concept_id, resolution.candidate_ids,
    case when resolution.resolution_scope = 'organization' then 'organization_exact' when resolution.resolution_scope = 'global' then 'global_exact'
      when resolution.resolution_state = 'ambiguous' then 'ambiguous_exact' else 'no_safe_match' end,
    resolution.global_version, resolution.organization_version)
  on conflict (organization_id, evidence_id, normalized_term) do update set original_term = excluded.original_term
  returning id into new_observation;
  if resolution.resolution_state <> 'normalized' then
    scope_value := 'organization';
    fingerprint_value := encode(extensions.digest(concat_ws('|', scope_value::text, p_organization_id::text, p_language, resolution.normalized_term), 'sha256'), 'hex');
    insert into public.knowledge_inbox (scope, organization_id, fingerprint, original_term, normalized_search_term, language,
      status, candidate_concept_ids, evidence_reference_ids, created_by_auth_user_id)
    values (scope_value, p_organization_id, fingerprint_value, p_original_term, resolution.normalized_term, p_language,
      case when resolution.resolution_state = 'ambiguous' then 'ambiguous' else 'unresolved' end,
      resolution.candidate_ids, array[p_evidence_id], actor_id)
    on conflict (scope, organization_id, fingerprint) do update set last_seen_at = now(), occurrence_count = public.knowledge_inbox.occurrence_count + 1,
      evidence_reference_ids = (select array_agg(distinct value) from unnest(public.knowledge_inbox.evidence_reference_ids || excluded.evidence_reference_ids) value),
      candidate_concept_ids = excluded.candidate_concept_ids
    returning id into queued_inbox;
  end if;
  return query select new_observation, queued_inbox, resolution.resolution_state, resolution.concept_id;
end;
$$;

create or replace function public.approve_knowledge_proposal(
  p_proposal_id uuid, p_human_edited_proposal jsonb default null, p_decision_reason text default null
) returns table (proposal_id uuid, concept_id uuid, knowledge_version bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare proposal public.knowledge_proposals; actor_id uuid; payload jsonb; new_concept_id uuid;
  next_version bigint; new_change_set uuid; canonical_label text; description_value text; concept_type_value public.knowledge_concept_type;
  alias_value text; inbox public.knowledge_inbox;
begin
  select * into proposal from public.knowledge_proposals item where item.id = p_proposal_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge proposal not found'; end if;
  actor_id := private.require_knowledge_admin(proposal.organization_id);
  if proposal.status = 'approved' then
    select change_set.version into next_version from public.knowledge_concepts concept
      join public.knowledge_change_sets change_set on change_set.id = concept.change_set_id
      where concept.id = proposal.published_concept_id;
    return query select proposal.id, proposal.published_concept_id, next_version, true; return;
  end if;
  if proposal.status <> 'awaiting_human_review' then raise exception using errcode = '55000', message = 'proposal is not approvable'; end if;
  payload := coalesce(p_human_edited_proposal, proposal.original_proposal);
  canonical_label := nullif(btrim(payload #>> '{proposed_concept,canonical_label}'), '');
  description_value := coalesce(payload #>> '{proposed_concept,description}', '');
  concept_type_value := (payload #>> '{proposed_concept,concept_type}')::public.knowledge_concept_type;
  if canonical_label is null then raise exception using errcode = '22023', message = 'canonical label is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', proposal.scope::text, coalesce(proposal.organization_id::text, 'global')), 0));
  select coalesce(max(version), 0) + 1 into next_version from public.knowledge_change_sets
    where scope = proposal.scope and organization_id is not distinct from proposal.organization_id;
  insert into public.knowledge_change_sets (scope, organization_id, version, summary, changed_entities, approved_by_auth_user_id)
    values (proposal.scope, proposal.organization_id, next_version, concat('Knowledge proposal ', proposal.id, ' approved'),
      jsonb_build_array(jsonb_build_object('proposal_id', proposal.id, 'operation', proposal.proposal_type)), actor_id)
    returning id into new_change_set;
  if proposal.proposal_type = 'update' then
    update public.knowledge_concepts set status = 'deprecated', updated_at = now()
      where id = proposal.target_concept_id and status = 'approved';
  end if;
  insert into public.knowledge_concepts (scope, organization_id, concept_type, canonical_label, description, language,
    status, version, change_set_id, provenance, created_by_auth_user_id, approved_by_auth_user_id)
  values (proposal.scope, proposal.organization_id, concept_type_value, canonical_label, description_value, 'pt-BR',
    'approved', 1, new_change_set, jsonb_build_object('proposal_id', proposal.id, 'research_run_id', proposal.research_run_id), actor_id, actor_id)
  returning id into new_concept_id;
  insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type,
    status, version, approved_by_auth_user_id)
  values (new_concept_id, proposal.scope, proposal.organization_id, canonical_label, private.normalize_knowledge_term(canonical_label),
    'pt-BR', 'canonical', 'approved', 1, actor_id);
  for alias_value in select jsonb_array_elements_text(coalesce(payload -> 'aliases', '[]'::jsonb)) loop
    if nullif(btrim(alias_value), '') is not null then
      insert into public.knowledge_terms (concept_id, scope, organization_id, term, normalized_term, language, term_type,
        status, version, approved_by_auth_user_id)
      values (new_concept_id, proposal.scope, proposal.organization_id, alias_value, private.normalize_knowledge_term(alias_value),
        'pt-BR', 'alias', 'approved', 1, actor_id);
    end if;
  end loop;
  update public.knowledge_proposals set human_edited_proposal = p_human_edited_proposal, status = 'approved',
    decided_at = now(), decided_by_auth_user_id = actor_id, decision_reason = p_decision_reason,
    published_concept_id = new_concept_id where id = proposal.id;
  insert into public.knowledge_approvals (proposal_id, action, original_proposal, decided_proposal, actor_auth_user_id, reason)
    values (proposal.id, case when p_human_edited_proposal is null then 'approved' else 'edited_and_approved' end,
      proposal.original_proposal, payload, actor_id, p_decision_reason);
  update public.knowledge_inbox set status = 'approved' where id = proposal.inbox_id;
  select * into inbox from public.knowledge_inbox where id = proposal.inbox_id;
  insert into public.knowledge_reinterpretation_impacts (organization_id, person_id, profile_id, change_set_id, concept_id, policy)
  select observation.organization_id, observation.person_id, profile.id, new_change_set, new_concept_id,
    coalesce(settings.reinterpretation_policy, 'off'::public.knowledge_reinterpretation_policy)
  from public.knowledge_observations observation
  join public.professional_profiles profile on profile.organization_id = observation.organization_id
    and profile.person_id = observation.person_id and profile.superseded_at is null
  left join public.organization_knowledge_settings settings on settings.organization_id = observation.organization_id
  where observation.normalized_term = inbox.normalized_search_term
    and (proposal.scope = 'global' or observation.organization_id = proposal.organization_id)
  on conflict do nothing;
  return query select proposal.id, new_concept_id, next_version, false;
end;
$$;

create or replace function public.dispatch_knowledge_reinterpretation(p_organization_id uuid, p_impact_id uuid, p_idempotency_key text)
returns table (job_id uuid, status text, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; impact public.knowledge_reinterpretation_impacts; existing public.knowledge_reinterpretation_jobs;
  fingerprint_value text; global_version bigint; organization_version bigint; new_id uuid;
begin
  actor_id := private.require_knowledge_admin(p_organization_id);
  select * into impact from public.knowledge_reinterpretation_impacts item
    where item.organization_id = p_organization_id and item.id = p_impact_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge impact not found'; end if;
  fingerprint_value := encode(extensions.digest(concat_ws('|', p_impact_id::text, impact.profile_id::text), 'sha256'), 'hex');
  select * into existing from public.knowledge_reinterpretation_jobs item
    where item.organization_id = p_organization_id and item.idempotency_key = p_idempotency_key;
  if found then
    if existing.request_fingerprint <> fingerprint_value then raise exception using errcode = '23505', message = 'idempotency key conflict'; end if;
    return query select existing.id, existing.status, true; return;
  end if;
  select coalesce(max(version) filter (where scope = 'global'), 0), max(version) filter (where scope = 'organization' and organization_id = p_organization_id)
    into global_version, organization_version from public.knowledge_change_sets;
  insert into public.knowledge_reinterpretation_jobs (organization_id, impact_id, person_id, base_profile_id, idempotency_key,
    request_fingerprint, knowledge_global_version, knowledge_organization_version, requested_by_auth_user_id)
  values (p_organization_id, p_impact_id, impact.person_id, impact.profile_id, p_idempotency_key,
    fingerprint_value, global_version, organization_version, actor_id) returning id into new_id;
  update public.knowledge_reinterpretation_impacts set status = 'queued', updated_at = now() where id = p_impact_id;
  return query select new_id, 'queued'::text, false;
end;
$$;

create or replace function public.prepare_knowledge_reinterpretation_review(
  p_organization_id uuid, p_job_id uuid, p_reinterpreted_profile jsonb
) returns table (job_id uuid, review_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; job public.knowledge_reinterpretation_jobs; base_profile public.professional_profiles;
  document_id uuid; attempt_id uuid; new_review uuid;
begin
  actor_id := private.require_knowledge_admin(p_organization_id);
  if jsonb_typeof(p_reinterpreted_profile) <> 'object' then raise exception using errcode = '22023', message = 'reinterpreted profile must be an object'; end if;
  select * into job from public.knowledge_reinterpretation_jobs item where item.organization_id = p_organization_id and item.id = p_job_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'reinterpretation job not found'; end if;
  if job.review_id is not null then return query select job.id, job.review_id, job.status; return; end if;
  select * into base_profile from public.professional_profiles profile where profile.organization_id = p_organization_id
    and profile.id = job.base_profile_id and profile.superseded_at is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'profile_base_conflict'; end if;
  document_id := base_profile.source_document_id; attempt_id := base_profile.processing_attempt_id;
  if attempt_id is null then raise exception using errcode = '23514', message = 'profile has no reviewable processing attempt'; end if;
  insert into public.profile_reviews (organization_id, person_id, document_id, processing_attempt_id, base_profile_id,
    base_profile_version, extracted_data, reviewed_data, started_by_auth_user_id, last_edited_by_auth_user_id,
    knowledge_global_version, knowledge_organization_version, reinterpretation_job_id)
  values (p_organization_id, job.person_id, document_id, attempt_id, base_profile.id, base_profile.profile_version,
    base_profile.profile_data, p_reinterpreted_profile, actor_id, actor_id, job.knowledge_global_version,
    job.knowledge_organization_version, job.id) returning id into new_review;
  insert into public.profile_review_revisions (organization_id, review_id, revision_number, reviewed_data, change_reason, actor_auth_user_id)
    values (p_organization_id, new_review, 1, p_reinterpreted_profile, 'Reinterpretação por mudança de Knowledge', actor_id);
  update public.knowledge_reinterpretation_jobs set review_id = new_review, status = 'draft_ready' where id = job.id;
  update public.knowledge_reinterpretation_impacts set status = 'draft_ready', updated_at = now() where id = job.impact_id;
  return query select job.id, new_review, 'draft_ready'::text;
end;
$$;

create or replace function private.copy_knowledge_versions_to_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare review public.profile_reviews;
begin
  if new.review_id is not null then
    select * into review from public.profile_reviews item where item.id = new.review_id;
    new.knowledge_global_version := review.knowledge_global_version;
    new.knowledge_organization_version := review.knowledge_organization_version;
    new.reinterpretation_job_id := review.reinterpretation_job_id;
  end if;
  return new;
end;
$$;
create trigger professional_profiles_copy_knowledge_versions before insert on public.professional_profiles
  for each row execute function private.copy_knowledge_versions_to_profile();

insert into public.knowledge_sources (name, domain, source_class, publisher, method, status, license, attribution_requirements, last_verified_at)
values
  ('CBO', 'gov.br', 'official_occupational_taxonomy', 'Ministério do Trabalho e Emprego', 'dataset', 'approved', 'CC BY-ND 3.0', 'Preservar conteúdo bruto e atribuição; mappings Prisma ficam separados.', '2026-08-26'),
  ('ESCO', 'esco.ec.europa.eu', 'official_occupational_taxonomy', 'European Commission', 'dataset', 'approved', 'Commission Decision 2011/833/EU', 'This service uses the ESCO classification of the European Commission.', '2026-08-26'),
  ('O*NET', 'onetcenter.org', 'official_occupational_taxonomy', 'U.S. Department of Labor / National Center for O*NET Development', 'dataset', 'approved', 'CC BY 4.0 with documented exceptions', 'Credit and link to O*NET data; review external-source exceptions.', '2026-08-26'),
  ('O*NET Web Services', 'services.onetcenter.org', 'official_occupational_taxonomy', 'U.S. Department of Labor / National Center for O*NET Development', 'api', 'approved', 'O*NET Web Services terms', 'Credit and link to O*NET Web Services.', '2026-08-26'),
  ('Microsoft Learn', 'learn.microsoft.com', 'official_vendor_documentation', 'Microsoft', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('AWS Documentation', 'docs.aws.amazon.com', 'official_vendor_documentation', 'Amazon Web Services', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('Google Cloud', 'cloud.google.com', 'official_vendor_documentation', 'Google', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('Oracle Documentation', 'docs.oracle.com', 'official_vendor_documentation', 'Oracle', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('SAP Help', 'help.sap.com', 'official_vendor_documentation', 'SAP', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('PMI', 'pmi.org', 'official_certification_issuer', 'Project Management Institute', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('Scrum Guide', 'scrumguides.org', 'official_standard_body', 'Scrum Guides', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('NIST', 'nist.gov', 'official_government_or_public_body', 'National Institute of Standards and Technology', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('Kubernetes', 'kubernetes.io', 'recognized_nonprofit_foundation', 'Cloud Native Computing Foundation', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('Python Documentation', 'docs.python.org', 'recognized_nonprofit_foundation', 'Python Software Foundation', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26'),
  ('PostgreSQL', 'postgresql.org', 'recognized_nonprofit_foundation', 'PostgreSQL Global Development Group', 'web', 'approved', null, 'Citar URL e publisher.', '2026-08-26');

insert into public.knowledge_source_versions (source_id, external_version, release_date, format, license, import_status, warnings)
select id, case name when 'CBO' then 'CBO 2002 - portal snapshot 2026-08-26' when 'ESCO' then 'v1.2.1' when 'O*NET' then '31.0' end,
  case name when 'ESCO' then date '2025-12-10' else null end,
  case name when 'CBO' then 'CSV/ZIP' when 'ESCO' then 'CSV/RDF/ODS' else 'database files' end,
  license, 'catalogued', '["Snapshot ainda não carregado; checksum e contagens serão registrados no upload validado."]'::jsonb
from public.knowledge_sources where name in ('CBO', 'ESCO', 'O*NET');

create index knowledge_source_versions_source_idx on public.knowledge_source_versions (source_id, created_at desc);
create index knowledge_relations_source_idx on public.knowledge_relations (source_concept_id, relation_type, status);
create index knowledge_research_runs_inbox_idx on public.knowledge_research_runs (inbox_id, created_at desc);
create index knowledge_proposals_queue_idx on public.knowledge_proposals (scope, organization_id, status, created_at);
create index knowledge_impacts_queue_idx on public.knowledge_reinterpretation_impacts (organization_id, status, created_at);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_source_versions enable row level security;
alter table public.knowledge_change_sets enable row level security;
alter table public.knowledge_concepts enable row level security;
alter table public.knowledge_terms enable row level security;
alter table public.knowledge_relations enable row level security;
alter table public.knowledge_external_mappings enable row level security;
alter table public.organization_knowledge_settings enable row level security;
alter table public.knowledge_observations enable row level security;
alter table public.knowledge_inbox enable row level security;
alter table public.knowledge_research_runs enable row level security;
alter table public.knowledge_research_sources enable row level security;
alter table public.knowledge_proposals enable row level security;
alter table public.knowledge_approvals enable row level security;
alter table public.knowledge_reinterpretation_impacts enable row level security;
alter table public.knowledge_reinterpretation_jobs enable row level security;

create policy knowledge_sources_read on public.knowledge_sources for select to authenticated using (status = 'approved' or (select private.is_super_admin((select auth.uid()))));
create policy knowledge_source_versions_read on public.knowledge_source_versions for select to authenticated using (exists (select 1 from public.knowledge_sources source where source.id = source_id and (source.status = 'approved' or (select private.is_super_admin((select auth.uid()))))));
create policy knowledge_change_sets_read on public.knowledge_change_sets for select to authenticated using (scope = 'global' or (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[])));
create policy knowledge_concepts_read on public.knowledge_concepts for select to authenticated using ((scope = 'global' and status = 'approved') or (scope = 'organization' and (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[]))));
create policy knowledge_terms_read on public.knowledge_terms for select to authenticated using ((scope = 'global' and status = 'approved') or (scope = 'organization' and (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[]))));
create policy knowledge_relations_read on public.knowledge_relations for select to authenticated using ((scope = 'global' and status = 'approved') or (scope = 'organization' and (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[]))));
create policy knowledge_mappings_read on public.knowledge_external_mappings for select to authenticated using (exists (select 1 from public.knowledge_concepts concept where concept.id = concept_id and (concept.scope = 'global' or (select private.has_org_role(concept.organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[])))));
create policy organization_knowledge_settings_read on public.organization_knowledge_settings for select to authenticated using ((select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter']::public.membership_role[])));
create policy organization_knowledge_settings_manage on public.organization_knowledge_settings for all to authenticated
  using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])))
  with check ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy knowledge_observations_read on public.knowledge_observations for select to authenticated using ((select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter']::public.membership_role[])));
create policy knowledge_inbox_read on public.knowledge_inbox for select to authenticated using ((scope = 'global' and (select private.is_super_admin((select auth.uid())))) or (scope = 'organization' and (select private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter']::public.membership_role[]))));
create policy knowledge_runs_read on public.knowledge_research_runs for select to authenticated using ((organization_id is null and (select private.is_super_admin((select auth.uid())))) or (organization_id is not null and (select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[]))));
create policy knowledge_research_sources_read on public.knowledge_research_sources for select to authenticated using (exists (select 1 from public.knowledge_research_runs run where run.id = research_run_id and ((run.organization_id is null and (select private.is_super_admin((select auth.uid())))) or (run.organization_id is not null and (select private.has_org_role(run.organization_id, array['super_admin','owner','admin']::public.membership_role[]))))));
create policy knowledge_proposals_read on public.knowledge_proposals for select to authenticated using ((scope = 'global' and (select private.is_super_admin((select auth.uid())))) or (scope = 'organization' and (select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[]))));
create policy knowledge_approvals_read on public.knowledge_approvals for select to authenticated using (exists (select 1 from public.knowledge_proposals proposal where proposal.id = proposal_id and ((proposal.scope = 'global' and (select private.is_super_admin((select auth.uid())))) or (proposal.scope = 'organization' and (select private.has_org_role(proposal.organization_id, array['super_admin','owner','admin']::public.membership_role[]))))));
create policy knowledge_impacts_read on public.knowledge_reinterpretation_impacts for select to authenticated using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));
create policy knowledge_jobs_read on public.knowledge_reinterpretation_jobs for select to authenticated using ((select private.has_org_role(organization_id, array['super_admin','owner','admin']::public.membership_role[])));

revoke all on table public.knowledge_sources, public.knowledge_source_versions, public.knowledge_change_sets,
  public.knowledge_concepts, public.knowledge_terms, public.knowledge_relations, public.knowledge_external_mappings,
  public.knowledge_observations, public.knowledge_inbox, public.knowledge_research_runs, public.knowledge_research_sources,
  public.knowledge_proposals, public.knowledge_approvals, public.knowledge_reinterpretation_impacts,
  public.knowledge_reinterpretation_jobs from anon, authenticated;
grant select on table public.knowledge_sources, public.knowledge_source_versions, public.knowledge_change_sets,
  public.knowledge_concepts, public.knowledge_terms, public.knowledge_relations, public.knowledge_external_mappings,
  public.knowledge_observations, public.knowledge_inbox, public.knowledge_research_runs, public.knowledge_research_sources,
  public.knowledge_proposals, public.knowledge_approvals, public.knowledge_reinterpretation_impacts,
  public.knowledge_reinterpretation_jobs to authenticated;
revoke all on table public.organization_knowledge_settings from anon, authenticated;
grant select, insert, update on table public.organization_knowledge_settings to authenticated;
revoke all on function public.resolve_knowledge_term(uuid, text, text), public.enqueue_knowledge_observation(uuid, uuid, uuid, text, text),
  public.approve_knowledge_proposal(uuid, jsonb, text),
  public.dispatch_knowledge_reinterpretation(uuid, uuid, text), public.prepare_knowledge_reinterpretation_review(uuid, uuid, jsonb) from public, anon;
grant execute on function public.resolve_knowledge_term(uuid, text, text), public.enqueue_knowledge_observation(uuid, uuid, uuid, text, text),
  public.approve_knowledge_proposal(uuid, jsonb, text),
  public.dispatch_knowledge_reinterpretation(uuid, uuid, text), public.prepare_knowledge_reinterpretation_review(uuid, uuid, jsonb) to authenticated;
