-- M5.4.3: resolve a vacancy title from approved Knowledge first, then retain a
-- bounded, auditable consultation of official snapshots.  A snapshot is not
-- publication: only an already-approved concept can become a reference here.
create table public.occupation_resolution_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid references public.vacancies(id) on delete set null,
  raw_term text not null check (char_length(btrim(raw_term)) between 1 and 240),
  normalized_term text not null,
  language text not null default 'pt-BR',
  resolver_version text not null default 'occupation-resolution-on-demand-1.0.0',
  idempotency_key text not null,
  status text not null check (status in ('resolved', 'ambiguous', 'completed', 'service_unavailable', 'failed')),
  decision_origin text not null check (decision_origin in ('existing_reconciliation', 'deterministic_official_resolution', 'agent_assisted_resolution', 'human_reconciliation', 'no_safe_decision')),
  canonical_occupation_concept_id uuid references public.knowledge_concepts(id) on delete restrict,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  candidate_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(candidate_snapshot) = 'array'),
  ambiguity_reason text,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  check ((status = 'resolved') = (canonical_occupation_concept_id is not null))
);

create index occupation_resolution_attempts_lookup_idx
  on public.occupation_resolution_attempts (organization_id, normalized_term, created_at desc);

alter table public.occupation_resolution_attempts enable row level security;
create policy occupation_resolution_attempts_read on public.occupation_resolution_attempts
  for select to authenticated
  using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
revoke all on public.occupation_resolution_attempts from public, anon, authenticated;
grant select on public.occupation_resolution_attempts to authenticated;

create or replace function public.resolve_occupation_on_demand(
  p_organization_id uuid,
  p_observed_term text,
  p_vacancy_id uuid default null,
  p_language text default 'pt-BR'
) returns table (
  attempt_id uuid,
  resolution_status text,
  decision_origin text,
  canonical_concept_id uuid,
  canonical_label text,
  normalized_term text,
  candidates jsonb,
  ambiguity_reason text,
  reused boolean
)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_normalized text := private.normalize_knowledge_term(p_observed_term);
  v_key text;
  v_existing public.occupation_resolution_attempts;
  v_concept_id uuid;
  v_label text;
  v_scope text;
  v_state text;
  v_candidates jsonb := '[]'::jsonb;
  v_status text := 'ambiguous';
  v_origin text := 'no_safe_decision';
  v_reason text := null;
  v_attempt uuid;
begin
  if v_actor is null or not private.has_org_role(p_organization_id, array['owner','admin','recruiter']::public.membership_role[]) then
    raise exception 'OCCUPATION_RESOLUTION_UNAUTHORIZED';
  end if;
  if v_normalized = '' or char_length(v_normalized) > 240 then raise exception 'OCCUPATION_RESOLUTION_TERM_INVALID'; end if;
  if p_vacancy_id is not null and not exists (select 1 from public.vacancies where id = p_vacancy_id and organization_id = p_organization_id) then
    raise exception 'OCCUPATION_RESOLUTION_VACANCY_INVALID';
  end if;
  v_key := encode(extensions.digest(concat_ws('|', p_organization_id::text, coalesce(p_vacancy_id::text, ''), v_normalized, p_language, 'occupation-resolution-on-demand-1.0.0'), 'sha256'), 'hex');
  select * into v_existing from public.occupation_resolution_attempts
   where organization_id = p_organization_id and idempotency_key = v_key;
  if found then
    return query select v_existing.id, v_existing.status, v_existing.decision_origin,
      v_existing.canonical_occupation_concept_id,
      (select canonical_label from public.knowledge_concepts where id = v_existing.canonical_occupation_concept_id),
      v_existing.normalized_term, v_existing.candidate_snapshot, v_existing.ambiguity_reason, true;
    return;
  end if;

  -- Existing organization/global aliases and their published reconciliation win.
  select resolution_state, concept_id, concept_label, resolution_scope
    into v_state, v_concept_id, v_label, v_scope
  from public.resolve_knowledge_term_v2(p_organization_id, p_observed_term, p_language)
  where concept_type = 'occupation'
  limit 1;
  if v_state = 'resolved' then
    select reconciliation.canonical_occupation_concept_id into v_concept_id
    from public.knowledge_occupation_reconciliations reconciliation
    where reconciliation.source_occupation_concept_id = v_concept_id and reconciliation.status = 'approved';
    v_concept_id := coalesce(v_concept_id, (select concept_id from public.resolve_knowledge_term_v2(p_organization_id, p_observed_term, p_language) where concept_type = 'occupation' limit 1));
    select canonical_label into v_label from public.knowledge_concepts where id = v_concept_id;
    v_status := 'resolved'; v_origin := case when v_scope = 'organization' then 'existing_reconciliation' else 'deterministic_official_resolution' end;
  else
    -- Bound query (maximum 12 rows) over source snapshots. It is evidence for
    -- the Knowledge workflow, never a label-similarity publication shortcut.
    select coalesce(jsonb_agg(candidate order by candidate->>'sourceName', candidate->>'label'), '[]'::jsonb)
      into v_candidates
    from (
      select jsonb_build_object('sourceName', source.name, 'sourceVersion', version.external_version,
        'externalId', stage.external_id, 'externalUri', stage.external_uri, 'label', stage.preferred_label,
        'description', stage.description, 'reasonCode', case when private.normalize_knowledge_term(stage.preferred_label) = v_normalized then 'official_exact_label' else 'official_exact_alias' end) as candidate
      from public.knowledge_source_stage_records stage
      join public.knowledge_source_versions version on version.id = stage.source_version_id
      join public.knowledge_sources source on source.id = stage.source_id
      where stage.record_kind = 'concept' and stage.concept_type = 'occupation' and stage.source_status = 'active'
        and (private.normalize_knowledge_term(stage.preferred_label) = v_normalized
          or exists (select 1 from jsonb_array_elements_text(stage.aliases) alias_value where private.normalize_knowledge_term(alias_value) = v_normalized))
      order by source.name, stage.external_id limit 12
    ) snapshots;
    v_reason := case when jsonb_array_length(v_candidates) = 0 then 'no_official_candidate' else 'official_candidates_require_reconciliation' end;
  end if;
  insert into public.occupation_resolution_attempts (
    organization_id, vacancy_id, raw_term, normalized_term, language, idempotency_key, status, decision_origin,
    canonical_occupation_concept_id, evidence, candidate_snapshot, ambiguity_reason, actor_auth_user_id
  ) values (
    p_organization_id, p_vacancy_id, btrim(p_observed_term), v_normalized, p_language, v_key, v_status, v_origin,
    case when v_status = 'resolved' then v_concept_id else null end,
    jsonb_build_object('contractVersion','occupation-resolution-on-demand-1.0.0','reasonCodes',case when v_status = 'resolved' then jsonb_build_array('approved_knowledge_term') else jsonb_build_array(v_reason) end),
    v_candidates, v_reason, v_actor
  ) returning id into v_attempt;
  return query select v_attempt, v_status, v_origin, case when v_status = 'resolved' then v_concept_id else null end,
    case when v_status = 'resolved' then v_label else null end, v_normalized, v_candidates, v_reason, false;
end;
$$;
revoke all on function public.resolve_occupation_on_demand(uuid, text, uuid, text) from public, anon;
grant execute on function public.resolve_occupation_on_demand(uuid, text, uuid, text) to authenticated;
