-- M5.4.6: canonical review keeps draft requirements unclassified until the human decides.
-- Historical versions remain immutable and readable.

alter table public.vacancy_requirements
  drop constraint if exists vacancy_requirements_importance_check;
alter table public.vacancy_requirements
  add constraint vacancy_requirements_importance_check
  check (importance in ('required', 'desired', 'unclassified'));
alter table public.vacancy_requirements
  add column if not exists origin text not null default 'description'
    check (origin in ('description', 'human')),
  add column if not exists proposed_category text,
  add column if not exists category_confirmed boolean not null default false,
  add column if not exists importance_confirmed boolean not null default false,
  add column if not exists source_suggestion_id uuid;

create table public.vacancy_requirement_dimension_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  vacancy_version_id uuid not null references public.vacancy_versions(id) on delete cascade,
  requirement_stable_id uuid not null,
  observed_term text not null check (char_length(btrim(observed_term)) between 1 and 240),
  proposed_category text not null check (proposed_category in ('experience', 'competency', 'knowledge', 'technology', 'education', 'certification', 'language')),
  confirmed_category text not null check (confirmed_category in ('experience', 'competency', 'knowledge', 'technology', 'education', 'certification', 'language')),
  contract_version text not null,
  actor_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, vacancy_version_id, requirement_stable_id)
);
alter table public.vacancy_requirement_dimension_feedback enable row level security;
create policy vacancy_requirement_dimension_feedback_select on public.vacancy_requirement_dimension_feedback
  for select to authenticated using ((select private.has_org_role(organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[])));
revoke all on table public.vacancy_requirement_dimension_feedback from anon, authenticated;
grant select on table public.vacancy_requirement_dimension_feedback to authenticated;

alter function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text)
  rename to save_vacancy_definition_m545;

create function public.save_vacancy_definition(
  p_organization_id uuid, p_vacancy_id uuid, p_title text, p_area text, p_location text,
  p_work_arrangement text, p_employment_type text, p_occupancy_status public.position_status,
  p_occupant_person_id uuid, p_mission text, p_responsibilities jsonb, p_expected_outcomes jsonb,
  p_requirements jsonb, p_context_items jsonb, p_source_kind text, p_source_vacancy_id uuid,
  p_job_role_id uuid, p_reference_concept_id uuid, p_save_as_role boolean, p_change_kind text default 'material'
) returns table(vacancy_id uuid, vacancy_version_id uuid, version integer, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_requirements jsonb;
  v_saved record;
  v_item jsonb;
  v_stable_id uuid;
  v_proposed text;
  v_confirmed text;
  v_term text;
  v_fingerprint text;
begin
  if v_actor is null or not private.has_org_role(p_organization_id, array['owner', 'admin', 'recruiter']::public.membership_role[]) then
    raise exception 'VACANCY_UNAUTHORIZED';
  end if;
  if jsonb_typeof(coalesce(p_requirements, '[]'::jsonb)) <> 'array' then raise exception 'VACANCY_LIST_INVALID'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) item where coalesce(item->>'importance','') not in ('required','desired','unclassified')) then
    raise exception 'VACANCY_REQUIREMENT_IMPORTANCE_INVALID';
  end if;
  select coalesce(jsonb_agg(case when item->>'importance' = 'unclassified' then jsonb_set(item, '{importance}', '"desired"'::jsonb) else item end), '[]'::jsonb)
    into v_requirements from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) item;
  select * into v_saved from public.save_vacancy_definition_m545(
    p_organization_id, p_vacancy_id, p_title, p_area, p_location, p_work_arrangement, p_employment_type,
    p_occupancy_status, p_occupant_person_id, p_mission, p_responsibilities, p_expected_outcomes, v_requirements,
    p_context_items, p_source_kind, p_source_vacancy_id, p_job_role_id, p_reference_concept_id, p_save_as_role, p_change_kind
  );
  for v_item in select value from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) loop
    v_stable_id := nullif(v_item->>'stableId', '')::uuid;
    update public.vacancy_requirements requirement set
      importance = v_item->>'importance',
      origin = coalesce(nullif(v_item->>'origin',''), 'description'),
      proposed_category = nullif(v_item->>'proposedCategory',''),
      category_confirmed = coalesce((v_item->>'categoryConfirmed')::boolean, false),
      importance_confirmed = coalesce((v_item->>'importanceConfirmed')::boolean, false),
      source_suggestion_id = nullif(v_item->>'sourceSuggestionId','')::uuid
    where requirement.organization_id = p_organization_id and requirement.vacancy_version_id = v_saved.vacancy_version_id
      and requirement.stable_id = v_stable_id;
    v_proposed := nullif(v_item->>'proposedCategory','');
    v_confirmed := nullif(v_item->>'category','');
    v_term := nullif(btrim(v_item->>'label'),'');
    if coalesce((v_item->>'categoryConfirmed')::boolean, false) and v_term is not null and v_proposed is not null and v_proposed <> v_confirmed then
      insert into public.vacancy_requirement_dimension_feedback (
        organization_id, vacancy_id, vacancy_version_id, requirement_stable_id, observed_term, proposed_category, confirmed_category, contract_version, actor_auth_user_id
      ) values (p_organization_id, v_saved.vacancy_id, v_saved.vacancy_version_id, v_stable_id, v_term, v_proposed, v_confirmed, 'vacancy-definition-1.1.0', v_actor)
      on conflict do nothing;
      v_fingerprint := encode(extensions.digest(concat_ws('|', 'vacancy-dimension-feedback', p_organization_id::text, private.normalize_knowledge_term(v_term), v_proposed, v_confirmed), 'sha256'), 'hex');
      insert into public.knowledge_inbox (scope, organization_id, fingerprint, original_term, normalized_search_term, language, status, candidate_concept_ids, evidence_reference_ids, observation_ids, created_by_auth_user_id)
      values ('organization', p_organization_id, v_fingerprint, v_term, private.normalize_knowledge_term(v_term), 'pt-BR', 'unresolved', '{}', '{}', '{}', v_actor)
      on conflict (scope, organization_id, fingerprint) do update set last_seen_at = now(), occurrence_count = public.knowledge_inbox.occurrence_count + 1;
    end if;
  end loop;
  return query select v_saved.vacancy_id, v_saved.vacancy_version_id, v_saved.version, v_saved.created;
end;
$$;

revoke all on function public.save_vacancy_definition_m545(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) from public, anon;
grant execute on function public.save_vacancy_definition(uuid, uuid, text, text, text, text, text, public.position_status, uuid, text, jsonb, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, boolean, text) to authenticated;

comment on table public.vacancy_requirement_dimension_feedback is 'M5.4.6 auditável: correção humana de dimensão em Vaga alimenta somente o Inbox Knowledge da organização, sem publicação automática.';
