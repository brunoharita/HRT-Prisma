-- M5.2: deterministic, source-versioned professional knowledge normalization.
-- Extends the Movement 4 foundation; it does not create a parallel ontology.

alter table public.knowledge_source_versions
  add column official_url text,
  add column manifest jsonb not null default '{}'::jsonb,
  add column validation_summary jsonb not null default '{}'::jsonb,
  add column is_current boolean not null default false,
  add column validated_at timestamptz,
  add column staged_at timestamptz;

alter table public.knowledge_source_versions
  add constraint knowledge_source_versions_manifest_object_check
    check (jsonb_typeof(manifest) = 'object'),
  add constraint knowledge_source_versions_validation_summary_object_check
    check (jsonb_typeof(validation_summary) = 'object'),
  add constraint knowledge_source_versions_official_url_check
    check (official_url is null or official_url ~ '^https://');

create unique index knowledge_source_versions_identity_idx
on public.knowledge_source_versions (id, source_id);

create unique index knowledge_source_versions_current_idx
on public.knowledge_source_versions (source_id)
where is_current;

alter table public.knowledge_terms
  add column source_version_id uuid;

alter table public.knowledge_terms
  add constraint knowledge_terms_source_version_fk
    foreign key (source_version_id, source_id)
    references public.knowledge_source_versions(id, source_id) on delete restrict,
  add constraint knowledge_terms_source_version_pair_check
    check ((source_id is null and source_version_id is null)
      or (source_id is not null and source_version_id is not null));

alter table public.knowledge_relations
  add column source_version_id uuid;

alter table public.knowledge_relations
  add constraint knowledge_relations_source_version_fk
    foreign key (source_version_id, source_id)
    references public.knowledge_source_versions(id, source_id) on delete restrict,
  add constraint knowledge_relations_source_version_pair_check
    check ((source_id is null and source_version_id is null)
      or (source_id is not null and source_version_id is not null));

create index knowledge_terms_source_version_idx
on public.knowledge_terms (source_version_id, status, normalized_term);

create unique index knowledge_terms_source_identity_idx
on public.knowledge_terms (concept_id, source_version_id, language, normalized_term)
where source_version_id is not null;

create unique index knowledge_terms_manual_alias_identity_idx
on public.knowledge_terms (
  scope,
  coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  concept_id,
  language,
  normalized_term
)
where source_version_id is null and status = 'approved';

create index knowledge_relations_source_version_idx
on public.knowledge_relations (source_version_id, status, relation_type);

create unique index knowledge_external_mapping_version_external_idx
on public.knowledge_external_mappings (source_version_id, external_id);

alter table public.knowledge_observations
  alter column evidence_id drop not null,
  add column profile_id uuid,
  add column review_id uuid,
  add column evidence_link_id uuid,
  add column source_field_path text,
  add column resolution_source_version_id uuid references public.knowledge_source_versions(id) on delete restrict,
  add column resolution_method_version text not null default 'knowledge-normalization-2.0.0',
  add column resolved_at timestamptz,
  add column resolved_by_auth_user_id uuid references auth.users(id) on delete restrict;

alter table public.knowledge_observations
  add constraint knowledge_observations_profile_fk
    foreign key (organization_id, profile_id)
    references public.professional_profiles(organization_id, id) on delete cascade,
  add constraint knowledge_observations_review_fk
    foreign key (organization_id, review_id)
    references public.profile_reviews(organization_id, id) on delete restrict,
  add constraint knowledge_observations_evidence_link_fk
    foreign key (organization_id, evidence_link_id)
    references public.profile_review_evidence_links(organization_id, id) on delete restrict,
  add constraint knowledge_observations_trace_check
    check (evidence_id is not null or review_id is not null),
  add constraint knowledge_observations_field_path_check
    check (source_field_path is null or source_field_path in ('competencies', 'professionalTitle'));

alter table public.knowledge_observations
  drop constraint if exists knowledge_observations_resolution_state_check;

update public.knowledge_observations
set resolution_state = 'resolved'
where resolution_state = 'normalized';

alter table public.knowledge_observations
  add constraint knowledge_observations_resolution_state_check
    check (resolution_state in ('resolved', 'ambiguous', 'unresolved'));

create unique index knowledge_observations_profile_term_idx
on public.knowledge_observations (organization_id, profile_id, normalized_term)
where profile_id is not null;

create index knowledge_observations_review_idx
on public.knowledge_observations (organization_id, review_id, source_field_path);

create index knowledge_observations_source_version_idx
on public.knowledge_observations (resolution_source_version_id, resolution_state);

alter table public.knowledge_inbox
  add column observation_ids uuid[] not null default '{}';

create table public.knowledge_source_stage_records (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  source_version_id uuid not null,
  record_kind text not null check (record_kind in ('concept', 'relation')),
  external_id text not null,
  external_uri text,
  concept_type public.knowledge_concept_type,
  preferred_label text,
  description text not null default '',
  language text not null default 'pt-BR',
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  source_status text not null default 'active' check (source_status in ('active', 'deprecated')),
  source_external_id text,
  target_external_id text,
  relation_type public.knowledge_relation_type,
  source_file text not null,
  source_row bigint not null check (source_row > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (source_version_id, source_id)
    references public.knowledge_source_versions(id, source_id) on delete cascade,
  check (
    (record_kind = 'concept' and concept_type is not null and preferred_label is not null
      and source_external_id is null and target_external_id is null and relation_type is null)
    or
    (record_kind = 'relation' and concept_type is null and preferred_label is null
      and source_external_id is not null and target_external_id is not null and relation_type is not null)
  ),
  unique (source_version_id, record_kind, external_id, language)
);

create index knowledge_source_stage_records_source_idx
on public.knowledge_source_stage_records (source_version_id, record_kind, external_id);

alter table public.knowledge_source_stage_records enable row level security;

create policy knowledge_source_stage_records_super_admin_read
on public.knowledge_source_stage_records
for select to authenticated
using ((select private.is_super_admin((select auth.uid()))));

revoke all on table public.knowledge_source_stage_records from public, anon, authenticated;
grant select on table public.knowledge_source_stage_records to authenticated;

create or replace function public.resolve_knowledge_term_v2(
  p_organization_id uuid,
  p_observed_term text,
  p_language text default 'pt-BR'
) returns table (
  resolution_state text,
  concept_id uuid,
  concept_label text,
  concept_type public.knowledge_concept_type,
  resolution_scope public.knowledge_scope,
  candidate_ids uuid[],
  normalized_term text,
  global_version bigint,
  organization_version bigint,
  source_id uuid,
  source_version_id uuid,
  source_name text,
  external_id text,
  external_uri text
)
language sql stable security invoker set search_path = '' as $$
  with normalized as (
    select private.normalize_knowledge_term(p_observed_term) as value
  ), versions as (
    select coalesce(max(version) filter (where scope = 'global'), 0) as global_version,
      max(version) filter (where scope = 'organization' and organization_id = p_organization_id) as organization_version
    from public.knowledge_change_sets
  ), raw_candidates as (
    select concept.id, concept.canonical_label, concept.concept_type,
      term.scope as resolution_scope, term.ambiguous,
      case when term.scope = 'organization' then 1 else 2 end as precedence
    from public.knowledge_terms term
    join public.knowledge_concepts concept on concept.id = term.concept_id
    left join public.knowledge_source_versions source_version on source_version.id = term.source_version_id
    cross join normalized
    where term.normalized_term = normalized.value
      and term.status = 'approved'
      and concept.status = 'approved'
      and (term.source_version_id is null
        or (source_version.import_status = 'published' and source_version.is_current))
      and (term.scope = 'global'
        or (term.scope = 'organization' and term.organization_id = p_organization_id))
  ), candidates as (
    select id, min(canonical_label) as canonical_label,
      min(concept_type::text)::public.knowledge_concept_type as concept_type,
      min(resolution_scope::text)::public.knowledge_scope as resolution_scope,
      bool_or(ambiguous) as ambiguous, min(precedence) as precedence
    from raw_candidates
    group by id
  ), preferred as (
    select * from candidates
    where precedence = (select min(precedence) from candidates)
  ), aggregate_result as (
    select count(*) as candidate_count,
      coalesce(bool_or(ambiguous), false) as has_ambiguous_alias,
      coalesce(array_agg(id order by id), '{}') as ids
    from preferred
  ), selected as (
    select preferred.*
    from preferred
    order by preferred.id
    limit 1
  ), authority as (
    select mapping.concept_id, mapping.source_id, mapping.source_version_id,
      source.name as source_name, mapping.external_id, mapping.external_uri
    from public.knowledge_external_mappings mapping
    join public.knowledge_source_versions source_version
      on source_version.id = mapping.source_version_id
      and source_version.import_status = 'published'
      and source_version.is_current
    join public.knowledge_sources source on source.id = mapping.source_id
    join selected on selected.id = mapping.concept_id
    order by case source.name when 'ESCO' then 1 when 'CBO' then 2 else 3 end,
      source.name, mapping.external_id
    limit 1
  )
  select case
      when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then 'resolved'
      when aggregate_result.candidate_count > 0 then 'ambiguous'
      else 'unresolved'
    end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then selected.id end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then selected.canonical_label end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then selected.concept_type end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then selected.resolution_scope end,
    aggregate_result.ids,
    normalized.value,
    versions.global_version,
    versions.organization_version,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then authority.source_id end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then authority.source_version_id end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then authority.source_name end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then authority.external_id end,
    case when aggregate_result.candidate_count = 1 and not aggregate_result.has_ambiguous_alias then authority.external_uri end
  from aggregate_result
  cross join normalized
  cross join versions
  left join selected on true
  left join authority on true;
$$;

revoke all on function public.resolve_knowledge_term_v2(uuid, text, text) from public, anon;
grant execute on function public.resolve_knowledge_term_v2(uuid, text, text) to authenticated, service_role;

create or replace function public.enqueue_knowledge_observation(
  p_organization_id uuid,
  p_person_id uuid,
  p_evidence_id uuid,
  p_original_term text,
  p_language text default 'pt-BR'
) returns table (observation_id uuid, inbox_id uuid, resolution_state text, concept_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  resolution record;
  new_observation uuid;
  queued_inbox uuid;
  fingerprint_value text;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  perform 1 from public.evidence evidence
  where evidence.organization_id = p_organization_id
    and evidence.id = p_evidence_id
    and evidence.person_id = p_person_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'evidence reference not found in organization';
  end if;

  select * into resolution
  from public.resolve_knowledge_term_v2(p_organization_id, p_original_term, p_language);

  insert into public.knowledge_observations (
    organization_id, person_id, evidence_id, original_term, normalized_term, language,
    resolution_state, concept_id, candidate_concept_ids, normalization_method,
    knowledge_global_version, knowledge_organization_version, resolution_source_version_id,
    resolution_method_version, resolved_at
  ) values (
    p_organization_id, p_person_id, p_evidence_id, p_original_term, resolution.normalized_term, p_language,
    resolution.resolution_state, resolution.concept_id, resolution.candidate_ids,
    case
      when resolution.resolution_scope = 'organization' then 'organization_exact'
      when resolution.resolution_scope = 'global' then 'global_exact'
      when resolution.resolution_state = 'ambiguous' then 'ambiguous_exact'
      else 'no_safe_match'
    end,
    resolution.global_version, resolution.organization_version, resolution.source_version_id,
    'knowledge-normalization-2.0.0',
    case when resolution.resolution_state = 'resolved' then now() end
  )
  on conflict (organization_id, evidence_id, normalized_term)
  do update set
    original_term = excluded.original_term,
    resolution_state = excluded.resolution_state,
    concept_id = excluded.concept_id,
    candidate_concept_ids = excluded.candidate_concept_ids,
    normalization_method = excluded.normalization_method,
    knowledge_global_version = excluded.knowledge_global_version,
    knowledge_organization_version = excluded.knowledge_organization_version,
    resolution_source_version_id = excluded.resolution_source_version_id,
    resolution_method_version = excluded.resolution_method_version,
    resolved_at = excluded.resolved_at
  returning id into new_observation;

  if resolution.resolution_state <> 'resolved' then
    fingerprint_value := encode(extensions.digest(concat_ws('|', 'organization', p_organization_id::text,
      p_language, resolution.normalized_term), 'sha256'), 'hex');
    insert into public.knowledge_inbox (
      scope, organization_id, fingerprint, original_term, normalized_search_term, language,
      status, candidate_concept_ids, evidence_reference_ids, observation_ids, created_by_auth_user_id
    ) values (
      'organization', p_organization_id, fingerprint_value, p_original_term, resolution.normalized_term, p_language,
      case when resolution.resolution_state = 'ambiguous' then 'ambiguous'::public.knowledge_inbox_status
        else 'unresolved'::public.knowledge_inbox_status end,
      resolution.candidate_ids, array[p_evidence_id], array[new_observation], actor_id
    )
    on conflict (scope, organization_id, fingerprint)
    do update set
      last_seen_at = now(),
      occurrence_count = public.knowledge_inbox.occurrence_count + 1,
      status = excluded.status,
      evidence_reference_ids = (
        select coalesce(array_agg(distinct value), '{}')
        from unnest(public.knowledge_inbox.evidence_reference_ids || excluded.evidence_reference_ids) value
      ),
      observation_ids = (
        select coalesce(array_agg(distinct value), '{}')
        from unnest(public.knowledge_inbox.observation_ids || excluded.observation_ids) value
      ),
      candidate_concept_ids = excluded.candidate_concept_ids
    returning id into queued_inbox;
  end if;

  return query select new_observation, queued_inbox, resolution.resolution_state, resolution.concept_id;
end;
$$;

create or replace function private.capture_profile_knowledge_observations()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  observed_term text;
  resolution record;
  new_observation uuid;
  linked_evidence_id uuid;
  linked_evidence_link_id uuid;
  fingerprint_value text;
begin
  if new.review_id is null or jsonb_typeof(new.profile_data -> 'competencies') <> 'array' then
    return new;
  end if;

  select link.id, link.evidence_id
  into linked_evidence_link_id, linked_evidence_id
  from public.profile_review_evidence_links link
  where link.organization_id = new.organization_id
    and link.review_id = new.review_id
    and link.field_path = 'competencies'
    and link.state = 'active'
  order by link.created_at desc, link.id desc
  limit 1;

  for observed_term in
    select distinct btrim(value)
    from jsonb_array_elements_text(new.profile_data -> 'competencies') item(value)
    where nullif(btrim(value), '') is not null
  loop
    select * into resolution
    from public.resolve_knowledge_term_v2(new.organization_id, observed_term, 'pt-BR');

    insert into public.knowledge_observations (
      organization_id, person_id, evidence_id, profile_id, review_id, evidence_link_id,
      source_field_path, original_term, normalized_term, language, resolution_state, concept_id,
      candidate_concept_ids, normalization_method, knowledge_global_version,
      knowledge_organization_version, resolution_source_version_id, resolution_method_version, resolved_at
    ) values (
      new.organization_id, new.person_id, linked_evidence_id, new.id, new.review_id, linked_evidence_link_id,
      'competencies', observed_term, resolution.normalized_term, 'pt-BR', resolution.resolution_state,
      resolution.concept_id, resolution.candidate_ids,
      case
        when resolution.resolution_scope = 'organization' then 'organization_exact'
        when resolution.resolution_scope = 'global' then 'global_exact'
        when resolution.resolution_state = 'ambiguous' then 'ambiguous_exact'
        else 'no_safe_match'
      end,
      resolution.global_version, resolution.organization_version, resolution.source_version_id,
      'knowledge-normalization-2.0.0',
      case when resolution.resolution_state = 'resolved' then now() end
    )
    on conflict (organization_id, profile_id, normalized_term) where profile_id is not null
    do update set original_term = excluded.original_term
    returning id into new_observation;

    if resolution.resolution_state <> 'resolved' then
      fingerprint_value := encode(extensions.digest(concat_ws('|', 'organization', new.organization_id::text,
        'pt-BR', resolution.normalized_term), 'sha256'), 'hex');
      insert into public.knowledge_inbox (
        scope, organization_id, fingerprint, original_term, normalized_search_term, language,
        status, candidate_concept_ids, evidence_reference_ids, observation_ids,
        created_by_auth_user_id
      ) values (
        'organization', new.organization_id, fingerprint_value, observed_term, resolution.normalized_term, 'pt-BR',
        case when resolution.resolution_state = 'ambiguous' then 'ambiguous'::public.knowledge_inbox_status
          else 'unresolved'::public.knowledge_inbox_status end,
        resolution.candidate_ids,
        case when linked_evidence_id is null then '{}'::uuid[] else array[linked_evidence_id] end,
        array[new_observation], new.approved_by_auth_user_id
      )
      on conflict (scope, organization_id, fingerprint)
      do update set
        last_seen_at = now(),
        occurrence_count = public.knowledge_inbox.occurrence_count + 1,
        status = excluded.status,
        candidate_concept_ids = excluded.candidate_concept_ids,
        evidence_reference_ids = (
          select coalesce(array_agg(distinct value), '{}')
          from unnest(public.knowledge_inbox.evidence_reference_ids || excluded.evidence_reference_ids) value
        ),
        observation_ids = (
          select coalesce(array_agg(distinct value), '{}')
          from unnest(public.knowledge_inbox.observation_ids || excluded.observation_ids) value
        );
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.capture_profile_knowledge_observations() from public, anon, authenticated;

create trigger professional_profiles_capture_knowledge_observations
after insert on public.professional_profiles
for each row execute function private.capture_profile_knowledge_observations();

create or replace function public.resolve_knowledge_inbox_alias(
  p_inbox_id uuid,
  p_concept_id uuid,
  p_scope public.knowledge_scope,
  p_reason text
) returns table (inbox_id uuid, concept_id uuid, knowledge_version bigint, observations_updated bigint)
language plpgsql security definer set search_path = '' as $$
declare
  inbox public.knowledge_inbox;
  target public.knowledge_concepts;
  actor_id uuid;
  next_version bigint;
  new_change_set uuid;
  affected bigint;
  source_version uuid;
begin
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) < 5 then
    raise exception using errcode = '22023', message = 'decision reason must contain at least five characters';
  end if;
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  select * into target from public.knowledge_concepts item where item.id = p_concept_id and item.status = 'approved';
  if not found then raise exception using errcode = 'P0002', message = 'approved Knowledge concept not found'; end if;
  if p_scope = 'organization' and inbox.organization_id is null then
    raise exception using errcode = '22023', message = 'organization alias requires organization inbox';
  end if;
  if p_scope = 'organization' and target.scope = 'organization' and target.organization_id <> inbox.organization_id then
    raise exception using errcode = '42501', message = 'cross-organization Knowledge alias denied';
  end if;
  if p_scope = 'global' and target.scope <> 'global' then
    raise exception using errcode = '22023', message = 'global alias requires global concept';
  end if;
  if exists (
    select 1 from public.knowledge_terms term
    where term.scope = p_scope
      and term.organization_id is not distinct from case when p_scope = 'organization' then inbox.organization_id end
      and term.normalized_term = inbox.normalized_search_term
      and term.status = 'approved'
      and term.concept_id <> p_concept_id
  ) then
    raise exception using errcode = '23505', message = 'alias conflicts with another approved concept';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_scope::text,
    coalesce(inbox.organization_id::text, 'global')), 0));
  select coalesce(max(version), 0) + 1 into next_version
  from public.knowledge_change_sets
  where scope = p_scope
    and organization_id is not distinct from case when p_scope = 'organization' then inbox.organization_id end;

  select mapping.source_version_id into source_version
  from public.knowledge_external_mappings mapping
  join public.knowledge_source_versions version on version.id = mapping.source_version_id and version.is_current
  where mapping.concept_id = p_concept_id
  order by version.published_at desc nulls last
  limit 1;

  insert into public.knowledge_change_sets (
    scope, organization_id, version, summary, source_versions, changed_entities, approved_by_auth_user_id
  ) values (
    p_scope, case when p_scope = 'organization' then inbox.organization_id end, next_version,
    concat('Alias aprovado para termo observado: ', inbox.original_term),
    case when source_version is null then '[]'::jsonb else jsonb_build_array(source_version) end,
    jsonb_build_array(jsonb_build_object(
      'operation', 'approve_alias', 'term', inbox.original_term, 'normalized_term', inbox.normalized_search_term,
      'concept_id', p_concept_id, 'scope', p_scope, 'reason', btrim(p_reason),
      'source_version_id', source_version, 'observation_ids', to_jsonb(inbox.observation_ids)
    )), actor_id
  ) returning id into new_change_set;

  insert into public.knowledge_terms (
    concept_id, scope, organization_id, term, normalized_term, language, term_type,
    status, version, approved_by_auth_user_id
  ) values (
    p_concept_id, p_scope, case when p_scope = 'organization' then inbox.organization_id end,
    inbox.original_term, inbox.normalized_search_term, inbox.language, 'alias', 'approved', next_version, actor_id
  )
  on conflict do nothing;

  update public.knowledge_observations observation
  set resolution_state = 'resolved', concept_id = p_concept_id, candidate_concept_ids = '{}',
    normalization_method = case when p_scope = 'organization' then 'human_organization_alias' else 'human_global_alias' end,
    resolution_method_version = 'knowledge-normalization-2.0.0',
    knowledge_global_version = case when p_scope = 'global' then next_version else observation.knowledge_global_version end,
    knowledge_organization_version = case when p_scope = 'organization' then next_version else observation.knowledge_organization_version end,
    resolution_source_version_id = source_version, resolved_at = now(), resolved_by_auth_user_id = actor_id
  where observation.id = any(inbox.observation_ids)
    and (p_scope = 'global' or observation.organization_id = inbox.organization_id);
  get diagnostics affected = row_count;

  update public.knowledge_inbox item
  set status = 'approved', last_seen_at = now(), candidate_concept_ids = array[p_concept_id]
  where item.id = inbox.id;

  insert into public.knowledge_reinterpretation_impacts (
    organization_id, person_id, profile_id, change_set_id, concept_id, policy
  )
  select observation.organization_id, observation.person_id, observation.profile_id,
    new_change_set, p_concept_id,
    coalesce(settings.reinterpretation_policy, 'off'::public.knowledge_reinterpretation_policy)
  from public.knowledge_observations observation
  left join public.organization_knowledge_settings settings on settings.organization_id = observation.organization_id
  where observation.id = any(inbox.observation_ids) and observation.profile_id is not null
  on conflict do nothing;

  return query select inbox.id, p_concept_id, next_version, affected;
end;
$$;

revoke all on function public.resolve_knowledge_inbox_alias(uuid, uuid, public.knowledge_scope, text) from public, anon;
grant execute on function public.resolve_knowledge_inbox_alias(uuid, uuid, public.knowledge_scope, text) to authenticated;

create or replace function public.propose_knowledge_concept_from_inbox(
  p_inbox_id uuid,
  p_scope public.knowledge_scope,
  p_canonical_label text,
  p_concept_type public.knowledge_concept_type,
  p_description text,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inbox public.knowledge_inbox;
  actor_id uuid;
  proposal_id uuid;
begin
  if nullif(btrim(p_canonical_label), '') is null then
    raise exception using errcode = '22023', message = 'canonical label is required';
  end if;
  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) < 5 then
    raise exception using errcode = '22023', message = 'proposal reason must contain at least five characters';
  end if;
  select * into inbox from public.knowledge_inbox item where item.id = p_inbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge inbox item not found'; end if;
  actor_id := private.require_knowledge_admin(case when p_scope = 'organization' then inbox.organization_id end);
  if p_scope = 'organization' and inbox.organization_id is null then
    raise exception using errcode = '22023', message = 'organization proposal requires organization inbox';
  end if;

  insert into public.knowledge_proposals (
    inbox_id, scope, organization_id, proposal_type, original_proposal, status,
    prompt_version, output_schema_version, source_policy_version
  ) values (
    inbox.id, p_scope, case when p_scope = 'organization' then inbox.organization_id end, 'create',
    jsonb_build_object(
      'observed_term', inbox.original_term,
      'proposed_concept', jsonb_build_object('canonical_label', btrim(p_canonical_label),
        'concept_type', p_concept_type, 'description', coalesce(p_description, '')),
      'aliases', jsonb_build_array(inbox.original_term),
      'sources', '[]'::jsonb,
      'rationale', btrim(p_reason),
      'unresolved_questions', '[]'::jsonb,
      'created_by_auth_user_id', actor_id
    ), 'awaiting_human_review', 'human-proposal-1.0.0', 'knowledge-proposal-1.0.0', 'trusted-sources-1.0.0'
  ) returning id into proposal_id;
  update public.knowledge_inbox set status = 'awaiting_human_review' where id = inbox.id;
  return proposal_id;
end;
$$;

revoke all on function public.propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text, text) from public, anon;
grant execute on function public.propose_knowledge_concept_from_inbox(uuid, public.knowledge_scope, text, public.knowledge_concept_type, text, text) to authenticated;

create or replace function public.suggest_knowledge_concepts(
  p_organization_id uuid,
  p_query text,
  p_limit integer default 8
) returns table (
  concept_id uuid,
  canonical_label text,
  concept_type public.knowledge_concept_type,
  concept_scope public.knowledge_scope,
  description text,
  aliases text[],
  source_name text,
  source_version text,
  external_id text,
  external_uri text,
  suggestion_method text
)
language sql stable security invoker set search_path = '' as $$
  with normalized as (
    select private.normalize_knowledge_term(p_query) as value
  ), visible_terms as (
    select term.concept_id, term.term, term.normalized_term,
      case
        when term.normalized_term = normalized.value then 1
        when term.normalized_term like normalized.value || '%' then 2
        when term.normalized_term like '%' || normalized.value || '%' then 3
        when normalized.value like '%' || term.normalized_term || '%' then 4
        else 9
      end as rank
    from public.knowledge_terms term
    join public.knowledge_concepts concept on concept.id = term.concept_id
    left join public.knowledge_source_versions version on version.id = term.source_version_id
    cross join normalized
    where normalized.value <> ''
      and term.status = 'approved' and concept.status = 'approved'
      and (term.scope = 'global' or (term.scope = 'organization' and term.organization_id = p_organization_id))
      and (term.source_version_id is null or (version.import_status = 'published' and version.is_current))
      and (term.normalized_term = normalized.value
        or term.normalized_term like normalized.value || '%'
        or term.normalized_term like '%' || normalized.value || '%'
        or normalized.value like '%' || term.normalized_term || '%')
  ), ranked as (
    select concept_id, min(rank) as rank
    from visible_terms
    group by concept_id
    order by min(rank), concept_id
    limit greatest(1, least(coalesce(p_limit, 8), 20))
  )
  select concept.id, concept.canonical_label, concept.concept_type, concept.scope, concept.description,
    coalesce((select array_agg(distinct term.term order by term.term)
      from public.knowledge_terms term
      where term.concept_id = concept.id and term.status = 'approved'), '{}'),
    authority.source_name, authority.external_version, authority.external_id, authority.external_uri,
    case ranked.rank when 1 then 'exact' when 2 then 'prefix' else 'contains' end
  from ranked
  join public.knowledge_concepts concept on concept.id = ranked.concept_id
  left join lateral (
    select source.name as source_name, version.external_version, mapping.external_id, mapping.external_uri
    from public.knowledge_external_mappings mapping
    join public.knowledge_source_versions version on version.id = mapping.source_version_id and version.is_current
    join public.knowledge_sources source on source.id = mapping.source_id
    where mapping.concept_id = concept.id
    order by case source.name when 'ESCO' then 1 when 'CBO' then 2 else 3 end
    limit 1
  ) authority on true
  order by ranked.rank, concept.canonical_label, concept.id;
$$;

revoke all on function public.suggest_knowledge_concepts(uuid, text, integer) from public, anon;
grant execute on function public.suggest_knowledge_concepts(uuid, text, integer) to authenticated;

create or replace function public.search_people_by_knowledge_concept(
  p_organization_id uuid,
  p_query text
) returns table (
  person_id uuid,
  profile_id uuid,
  full_name text,
  concept_id uuid,
  canonical_label text,
  observed_terms text[],
  source_name text,
  source_version text,
  external_id text,
  external_uri text
)
language sql stable security invoker set search_path = '' as $$
  with resolution as (
    select * from public.resolve_knowledge_term_v2(p_organization_id, p_query, 'pt-BR')
  )
  select person.id, profile.id, person.full_name, concept.id, concept.canonical_label,
    array_agg(distinct observation.original_term order by observation.original_term),
    resolution.source_name,
    source_version.external_version,
    resolution.external_id,
    resolution.external_uri
  from resolution
  join public.knowledge_concepts concept on concept.id = resolution.concept_id
  join public.knowledge_observations observation
    on observation.organization_id = p_organization_id
    and observation.concept_id = concept.id
    and observation.resolution_state = 'resolved'
  join public.professional_profiles profile
    on profile.organization_id = observation.organization_id
    and profile.id = observation.profile_id
    and profile.superseded_at is null
  join public.people person
    on person.organization_id = profile.organization_id and person.id = profile.person_id
  left join public.knowledge_source_versions source_version on source_version.id = resolution.source_version_id
  where resolution.resolution_state = 'resolved'
  group by person.id, profile.id, person.full_name, concept.id, concept.canonical_label,
    resolution.source_name, source_version.external_version, resolution.external_id, resolution.external_uri
  order by person.full_name, person.id;
$$;

revoke all on function public.search_people_by_knowledge_concept(uuid, text) from public, anon;
grant execute on function public.search_people_by_knowledge_concept(uuid, text) to authenticated;

create or replace function public.knowledge_normalization_metrics(p_organization_id uuid)
returns table (
  observed_terms bigint,
  auto_resolved bigint,
  human_resolved bigint,
  ambiguous bigint,
  unresolved bigint,
  organization_aliases bigint,
  global_proposals bigint,
  external_concepts bigint,
  average_resolution_seconds numeric
)
language sql stable security invoker set search_path = '' as $$
  select count(*),
    count(*) filter (where observation.resolution_state = 'resolved' and observation.normalization_method in ('organization_exact', 'global_exact')),
    count(*) filter (where observation.resolution_state = 'resolved' and observation.normalization_method like 'human_%'),
    count(*) filter (where observation.resolution_state = 'ambiguous'),
    count(*) filter (where observation.resolution_state = 'unresolved'),
    (select count(*) from public.knowledge_terms term
      where term.scope = 'organization' and term.organization_id = p_organization_id
        and term.term_type = 'alias' and term.status = 'approved'),
    (select count(*) from public.knowledge_proposals proposal
      where proposal.scope = 'global' and proposal.inbox_id in (
        select inbox.id from public.knowledge_inbox inbox where inbox.organization_id = p_organization_id
      )),
    count(distinct observation.concept_id) filter (where observation.resolution_source_version_id is not null),
    round((avg(extract(epoch from observation.resolved_at - observation.created_at))
      filter (where observation.resolved_at is not null))::numeric, 3)
  from public.knowledge_observations observation
  where observation.organization_id = p_organization_id;
$$;

revoke all on function public.knowledge_normalization_metrics(uuid) from public, anon;
grant execute on function public.knowledge_normalization_metrics(uuid) to authenticated;

create or replace function public.stage_knowledge_source_batch(
  p_source_name text,
  p_external_version text,
  p_official_url text,
  p_manifest jsonb,
  p_records jsonb,
  p_reset boolean default false
) returns table (source_version_id uuid, staged_records bigint, reused_records bigint)
language plpgsql security definer set search_path = '' as $$
declare
  source_record public.knowledge_sources;
  version_record public.knowledge_source_versions;
  item jsonb;
  existing_hash text;
  staged bigint := 0;
  reused bigint := 0;
  record_kind text;
begin
  if jsonb_typeof(p_manifest) <> 'object' or jsonb_typeof(p_records) <> 'array' then
    raise exception using errcode = '22023', message = 'manifest object and records array are required';
  end if;
  if p_official_url !~ '^https://' then
    raise exception using errcode = '22023', message = 'official HTTPS URL is required';
  end if;
  select * into source_record from public.knowledge_sources source
  where source.name = p_source_name and source.status = 'approved' for update;
  if not found then raise exception using errcode = 'P0002', message = 'approved Knowledge source not found'; end if;

  insert into public.knowledge_source_versions (
    source_id, external_version, release_date, retrieval_date, checksum_sha256, format,
    license, import_status, official_url, manifest, validation_summary, validated_at,
    previous_version_id
  ) values (
    source_record.id, p_external_version,
    nullif(p_manifest ->> 'releaseDate', '')::date,
    nullif(p_manifest ->> 'downloadedAt', '')::timestamptz,
    nullif(p_manifest ->> 'packageSha256', ''),
    coalesce(nullif(p_manifest ->> 'format', ''), 'CSV'),
    source_record.license, 'validated', p_official_url, p_manifest,
    jsonb_build_object('validatedBy', 'knowledge-source-ingestion-1.0.0'), now(),
    (select current_version.id from public.knowledge_source_versions current_version
      where current_version.source_id = source_record.id and current_version.is_current
      order by current_version.published_at desc nulls last limit 1)
  )
  on conflict (source_id, external_version)
  do update set official_url = excluded.official_url, manifest = excluded.manifest,
    validation_summary = excluded.validation_summary, validated_at = excluded.validated_at
  where public.knowledge_source_versions.import_status <> 'published'
  returning * into version_record;

  if not found then
    select * into version_record from public.knowledge_source_versions version
    where version.source_id = source_record.id and version.external_version = p_external_version;
    raise exception using errcode = '55000', message = 'published source version is immutable';
  end if;
  if p_reset then delete from public.knowledge_source_stage_records stage where stage.source_version_id = version_record.id; end if;

  for item in select value from jsonb_array_elements(p_records) record(value)
  loop
    record_kind := item ->> 'recordKind';
    if record_kind not in ('concept', 'relation') then
      raise exception using errcode = '22023', message = 'unexpected stage record kind';
    end if;
    select stage.content_hash into existing_hash
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = version_record.id
      and stage.record_kind = record_kind
      and stage.external_id = item ->> 'externalId'
      and stage.language = coalesce(nullif(item ->> 'language', ''), 'pt-BR');
    if found then
      if existing_hash <> item ->> 'contentHash' then
        raise exception using errcode = '23505', message = 'divergent staged record replay';
      end if;
      reused := reused + 1;
      continue;
    end if;
    insert into public.knowledge_source_stage_records (
      source_id, source_version_id, record_kind, external_id, external_uri,
      concept_type, preferred_label, description, language, aliases, source_status,
      source_external_id, target_external_id, relation_type, source_file, source_row, content_hash
    ) values (
      source_record.id, version_record.id, record_kind, item ->> 'externalId', nullif(item ->> 'externalUri', ''),
      nullif(item ->> 'conceptType', '')::public.knowledge_concept_type,
      nullif(item ->> 'preferredLabel', ''), coalesce(item ->> 'description', ''),
      coalesce(nullif(item ->> 'language', ''), 'pt-BR'), coalesce(item -> 'aliases', '[]'::jsonb),
      coalesce(nullif(item ->> 'sourceStatus', ''), 'active'),
      nullif(item ->> 'sourceExternalId', ''), nullif(item ->> 'targetExternalId', ''),
      nullif(item ->> 'relationType', '')::public.knowledge_relation_type,
      item ->> 'sourceFile', (item ->> 'sourceRow')::bigint, item ->> 'contentHash'
    );
    staged := staged + 1;
  end loop;

  update public.knowledge_source_versions version
  set import_status = 'staged', staged_at = now()
  where version.id = version_record.id;
  return query select version_record.id, staged, reused;
end;
$$;

create or replace function public.finalize_knowledge_source_stage(p_source_version_id uuid)
returns table (source_version_id uuid, concept_records bigint, relation_records bigint, status text)
language plpgsql security definer set search_path = '' as $$
declare
  version_record public.knowledge_source_versions;
  concept_count bigint;
  relation_count bigint;
  expected_concepts bigint;
  expected_relations bigint;
begin
  select * into version_record from public.knowledge_source_versions version
  where version.id = p_source_version_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge source version not found'; end if;
  if version_record.import_status = 'published' then
    return query select version_record.id,
      coalesce((version_record.counts ->> 'conceptRecords')::bigint, 0),
      coalesce((version_record.counts ->> 'relationRecords')::bigint, 0),
      version_record.import_status;
    return;
  end if;
  select count(*) filter (where record_kind = 'concept'), count(*) filter (where record_kind = 'relation')
  into concept_count, relation_count
  from public.knowledge_source_stage_records stage where stage.source_version_id = version_record.id;
  expected_concepts := nullif(version_record.manifest -> 'counts' ->> 'conceptRecords', '')::bigint;
  expected_relations := nullif(version_record.manifest -> 'counts' ->> 'relationRecords', '')::bigint;
  if expected_concepts is null or concept_count <> expected_concepts then
    raise exception using errcode = '23514', message = 'staged concept count does not match manifest';
  end if;
  if expected_relations is null or relation_count <> expected_relations then
    raise exception using errcode = '23514', message = 'staged relation count does not match manifest';
  end if;
  if exists (
    select 1 from public.knowledge_source_stage_records stage
    where stage.source_version_id = version_record.id and (
      nullif(stage.external_id, '') is null or nullif(stage.source_file, '') is null
      or (stage.record_kind = 'concept' and nullif(stage.preferred_label, '') is null)
    )
  ) then raise exception using errcode = '23514', message = 'stage contains invalid records'; end if;
  update public.knowledge_source_versions version
  set import_status = 'diff_ready', counts = jsonb_build_object(
    'conceptRecords', concept_count, 'relationRecords', relation_count
  ), validation_summary = version.validation_summary || jsonb_build_object(
    'headersValidated', true, 'encodingValidated', true, 'recordCountsValidated', true
  ) where version.id = version_record.id;
  return query select version_record.id, concept_count, relation_count, 'diff_ready'::text;
end;
$$;

create or replace function public.diff_knowledge_source_version(p_source_version_id uuid)
returns table (new_concepts bigint, existing_concepts bigint, removed_concepts bigint, staged_relations bigint)
language sql stable security definer set search_path = '' as $$
  with version as (
    select * from public.knowledge_source_versions where id = p_source_version_id
  ), staged as (
    select distinct external_id from public.knowledge_source_stage_records
    where source_version_id = p_source_version_id and record_kind = 'concept' and source_status = 'active'
  ), current_mappings as (
    select distinct mapping.external_id
    from public.knowledge_external_mappings mapping
    join public.knowledge_source_versions current_version
      on current_version.id = mapping.source_version_id and current_version.is_current
    join version on version.source_id = mapping.source_id
  )
  select count(*) filter (where current_mappings.external_id is null),
    count(*) filter (where current_mappings.external_id is not null),
    (select count(*) from current_mappings where not exists (
      select 1 from staged where staged.external_id = current_mappings.external_id
    )),
    (select count(*) from public.knowledge_source_stage_records
      where source_version_id = p_source_version_id and record_kind = 'relation')
  from staged left join current_mappings using (external_id);
$$;

create or replace function public.publish_knowledge_source_version(
  p_source_version_id uuid,
  p_approved_by_auth_user_id uuid
)
returns table (source_version_id uuid, knowledge_version bigint, concepts_published bigint, terms_published bigint, relations_published bigint, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare
  version_record public.knowledge_source_versions;
  source_record public.knowledge_sources;
  stage_concept record;
  stage_term record;
  stage_relation record;
  local_concept_id uuid;
  target_concept_id uuid;
  next_version bigint;
  new_change_set uuid;
  concept_count bigint := 0;
  term_count bigint := 0;
  relation_count bigint := 0;
  preferred public.knowledge_source_stage_records;
  alias_value text;
begin
  if p_approved_by_auth_user_id is null
    or not (select private.is_super_admin(p_approved_by_auth_user_id)) then
    raise exception using errcode = '42501', message = 'an active Super Admin must approve source publication';
  end if;
  select * into version_record from public.knowledge_source_versions version
  where version.id = p_source_version_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Knowledge source version not found'; end if;
  if version_record.import_status = 'published' then
    return query select version_record.id,
      coalesce((version_record.counts ->> 'knowledgeVersion')::bigint, 0),
      coalesce((version_record.counts ->> 'conceptsPublished')::bigint, 0),
      coalesce((version_record.counts ->> 'termsPublished')::bigint, 0),
      coalesce((version_record.counts ->> 'relationsPublished')::bigint, 0), true;
    return;
  end if;
  if version_record.import_status <> 'diff_ready' then
    raise exception using errcode = '55000', message = 'source version must be validated, staged and diffed before publication';
  end if;
  select * into source_record from public.knowledge_sources source where source.id = version_record.source_id;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'source-publish', source_record.id::text), 0));
  select coalesce(max(version), 0) + 1 into next_version
  from public.knowledge_change_sets where scope = 'global' and organization_id is null;
  insert into public.knowledge_change_sets (
    scope, organization_id, version, summary, source_versions, changed_entities, approved_by_auth_user_id
  ) values (
    'global', null, next_version,
    concat('Publicação da fonte ', source_record.name, ' ', version_record.external_version),
    jsonb_build_array(version_record.id),
    jsonb_build_array(jsonb_build_object('operation', 'publish_source_version',
      'source', source_record.name, 'source_version_id', version_record.id)),
    p_approved_by_auth_user_id
  ) returning id into new_change_set;

  create temporary table m52_concept_map (
    external_id text primary key,
    concept_id uuid not null
  ) on commit drop;

  for stage_concept in
    select distinct stage.external_id
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = version_record.id
      and stage.record_kind = 'concept'
      and stage.source_status = 'active'
    order by stage.external_id
  loop
    select mapping.concept_id into local_concept_id
    from public.knowledge_external_mappings mapping
    where mapping.source_id = source_record.id and mapping.external_id = stage_concept.external_id
    order by mapping.created_at, mapping.concept_id
    limit 1;
    select * into preferred
    from public.knowledge_source_stage_records stage
    where stage.source_version_id = version_record.id
      and stage.record_kind = 'concept'
      and stage.external_id = stage_concept.external_id
      and stage.source_status = 'active'
    order by case stage.language when 'pt-BR' then 1 when 'pt' then 2 when 'en' then 3 else 4 end,
      stage.language
    limit 1;
    if local_concept_id is null then
      insert into public.knowledge_concepts (
        scope, organization_id, concept_type, canonical_label, description, language,
        status, version, change_set_id, provenance
      ) values (
        'global', null, preferred.concept_type, preferred.preferred_label, preferred.description,
        preferred.language, 'approved', 1, new_change_set,
        jsonb_build_object('source', source_record.name, 'source_version_id', version_record.id,
          'external_id', preferred.external_id, 'source_file', preferred.source_file)
      ) returning id into local_concept_id;
      concept_count := concept_count + 1;
    else
      update public.knowledge_concepts concept
      set canonical_label = preferred.preferred_label,
        description = preferred.description,
        language = preferred.language,
        concept_type = preferred.concept_type,
        status = 'approved', version = concept.version + 1,
        change_set_id = new_change_set,
        provenance = concept.provenance || jsonb_build_object(
          'source', source_record.name, 'source_version_id', version_record.id,
          'external_id', preferred.external_id, 'source_file', preferred.source_file
        ), updated_at = now()
      where concept.id = local_concept_id;
    end if;
    insert into m52_concept_map (external_id, concept_id) values (stage_concept.external_id, local_concept_id);
    insert into public.knowledge_external_mappings (
      concept_id, source_id, source_version_id, external_id, external_uri, mapping_type, provenance
    ) values (
      local_concept_id, source_record.id, version_record.id, preferred.external_id,
      preferred.external_uri, 'exact', jsonb_build_object('source_file', preferred.source_file,
        'source_row', preferred.source_row, 'content_hash', preferred.content_hash)
    );
  end loop;

  update public.knowledge_terms term
  set status = 'deprecated'
  where term.source_id = source_record.id and term.status = 'approved';
  update public.knowledge_relations relation
  set status = 'deprecated'
  where relation.source_id = source_record.id and relation.status = 'approved';

  for stage_term in
    select stage.*, map.concept_id as local_concept_id
    from public.knowledge_source_stage_records stage
    join m52_concept_map map on map.external_id = stage.external_id
    where stage.source_version_id = version_record.id
      and stage.record_kind = 'concept'
      and stage.source_status = 'active'
    order by stage.external_id, stage.language
  loop
    insert into public.knowledge_terms (
      concept_id, scope, organization_id, term, normalized_term, language, term_type,
      source_id, source_version_id, status, version
    ) values (
      stage_term.local_concept_id, 'global', null, stage_term.preferred_label,
      private.normalize_knowledge_term(stage_term.preferred_label), stage_term.language, 'canonical',
      source_record.id, version_record.id, 'approved', 1
    ) on conflict do nothing;
    if found then term_count := term_count + 1; end if;
    for alias_value in select jsonb_array_elements_text(stage_term.aliases)
    loop
      if nullif(btrim(alias_value), '') is not null then
        insert into public.knowledge_terms (
          concept_id, scope, organization_id, term, normalized_term, language, term_type,
          source_id, source_version_id, status, version
        ) values (
          stage_term.local_concept_id, 'global', null, alias_value,
          private.normalize_knowledge_term(alias_value), stage_term.language, 'alias',
          source_record.id, version_record.id, 'approved', 1
        ) on conflict do nothing;
        if found then term_count := term_count + 1; end if;
      end if;
    end loop;
  end loop;

  for stage_relation in
    select stage.*, source_map.concept_id as source_concept_id,
      target_map.concept_id as target_concept_id
    from public.knowledge_source_stage_records stage
    join m52_concept_map source_map on source_map.external_id = stage.source_external_id
    join m52_concept_map target_map on target_map.external_id = stage.target_external_id
    where stage.source_version_id = version_record.id and stage.record_kind = 'relation'
    order by stage.external_id
  loop
    insert into public.knowledge_relations (
      source_concept_id, target_concept_id, relation_type, scope, organization_id,
      source_id, source_version_id, provenance, status, version
    ) values (
      stage_relation.source_concept_id, stage_relation.target_concept_id,
      stage_relation.relation_type, 'global', null, source_record.id, version_record.id,
      jsonb_build_object('source_file', stage_relation.source_file,
        'source_row', stage_relation.source_row, 'content_hash', stage_relation.content_hash),
      'approved', next_version::integer
    ) on conflict do nothing;
    if found then relation_count := relation_count + 1; end if;
  end loop;

  update public.knowledge_source_versions version
  set is_current = false
  where version.source_id = source_record.id and version.id <> version_record.id and version.is_current;
  update public.knowledge_source_versions version
  set import_status = 'published', is_current = true, published_at = now(),
    counts = version.counts || jsonb_build_object(
      'knowledgeVersion', next_version,
      'conceptsPublished', concept_count,
      'termsPublished', term_count,
      'relationsPublished', relation_count
    )
  where version.id = version_record.id;
  delete from public.knowledge_source_stage_records stage where stage.source_version_id = version_record.id;

  return query select version_record.id, next_version, concept_count, term_count, relation_count, false;
end;
$$;

revoke all on function public.stage_knowledge_source_batch(text, text, text, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.finalize_knowledge_source_stage(uuid) from public, anon, authenticated;
revoke all on function public.diff_knowledge_source_version(uuid) from public, anon, authenticated;
revoke all on function public.publish_knowledge_source_version(uuid, uuid) from public, anon, authenticated;
grant execute on function public.stage_knowledge_source_batch(text, text, text, jsonb, jsonb, boolean) to service_role;
grant execute on function public.finalize_knowledge_source_stage(uuid) to service_role;
grant execute on function public.diff_knowledge_source_version(uuid) to service_role;
grant execute on function public.publish_knowledge_source_version(uuid, uuid) to service_role;
