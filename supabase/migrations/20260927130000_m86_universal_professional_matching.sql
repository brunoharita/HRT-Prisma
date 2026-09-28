-- M8.6: universal professional interpretation, explicit temporal policy and forward-compatible snapshots.
alter table public.vacancy_versions
  add column if not exists experience_policy text not null default 'unspecified';

do $migration$
begin
  if not exists (select 1 from pg_constraint where conname='vacancy_versions_experience_policy_check') then
    alter table public.vacancy_versions add constraint vacancy_versions_experience_policy_check
      check (experience_policy in ('not_required','required','unspecified'));
  end if;
end
$migration$;

do $migration$
declare
  definition text;
  old_profile text := $old$'experiences',coalesce(p.profile_data->'experiences','[]'),
      'professionalTitle',p.profile_data->'professionalTitle',
      'areasOfExpertise',coalesce(p.profile_data->'areasOfExpertise','[]')$old$;
  new_profile text := $new$'experiences',coalesce(p.profile_data->'experiences','[]'),
      'education',coalesce(p.profile_data->'education','[]'),
      'professionalTitle',p.profile_data->'professionalTitle',
      'professionalObjective',p.profile_data->'professionalObjective',
      'summary',p.profile_data->'summary',
      'keyResults',coalesce(p.profile_data->'keyResults','[]'),
      'areasOfExpertise',coalesce(p.profile_data->'areasOfExpertise','[]')$new$;
begin
  definition:=pg_get_functiondef('private.m83_sources(uuid,uuid,uuid,uuid)'::regprocedure);
  if position(old_profile in definition)=0 then raise exception 'M86_PROFILE_SOURCE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_profile,new_profile);
end
$migration$;

do $migration$
declare
  definition text;
  old_save text := $old$update public.vacancy_versions set title=p_draft->>'title',taxonomy_snapshot=v_snapshot,contract_version='vacancy-definition-1.3.0'$old$;
  new_save text := $new$update public.vacancy_versions set title=p_draft->>'title',experience_policy=coalesce(nullif(p_draft->>'experiencePolicy',''),'unspecified'),taxonomy_snapshot=v_snapshot,contract_version='vacancy-definition-1.3.0'$new$;
  source_old text := $old$'position',jsonb_build_object('title',v.title,'mission',v.mission,'responsibilities',v.responsibilities),$old$;
  source_new text := $new$'position',jsonb_build_object('title',v.title,'mission',v.mission,'responsibilities',v.responsibilities,'experiencePolicy',coalesce(v.experience_policy,'unspecified')),$new$;
  snapshot_old text := $old$'title',v.title,'area',coalesce(v.area,''),'mission'$old$;
  snapshot_new text := $new$'title',v.title,'experiencePolicy',coalesce(v.experience_policy,'unspecified'),'area',coalesce(v.area,''),'mission'$new$;
begin
  definition:=pg_get_functiondef('public.save_position_taxonomy(uuid,jsonb,uuid)'::regprocedure);
  if position(old_save in definition)=0 then raise exception 'M86_SAVE_POSITION_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_save,new_save);

  definition:=pg_get_functiondef('private.m83_sources(uuid,uuid,uuid,uuid)'::regprocedure);
  if position(source_old in definition)=0 then raise exception 'M86_SOURCE_BASELINE_MISMATCH'; end if;
  execute replace(definition,source_old,source_new);

  definition:=pg_get_functiondef('private.m83_snapshot_sources(uuid,uuid,uuid,uuid)'::regprocedure);
  if position(snapshot_old in definition)=0 then raise exception 'M86_SNAPSHOT_SOURCE_BASELINE_MISMATCH'; end if;
  execute replace(definition,snapshot_old,snapshot_new);
end
$migration$;

do $migration$
declare
  definition text;
  old_method text := $old$p_method_version is distinct from 'trajectory-backend-1.0.0'$old$;
  new_method text := $new$p_method_version not in ('trajectory-backend-1.0.0','trajectory-position-2.0.0')$new$;
  old_prompt text := $old$p_prompt_version is null or p_prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0')$old$;
  new_prompt text := $new$p_prompt_version is null or p_prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0')$new$;
  old_kind text := $old$coalesce(item->>'kind','') not in ('experience','declaration')$old$;
  new_kind text := $new$coalesce(item->>'kind','') not in ('experience','education','declaration')$new$;
  old_activity text := $old$coalesce(item->>'activity','') not in ('backend_execution','software_execution','software_analysis','software_leadership','software_context','other','unclear')$old$;
  new_activity text := $new$coalesce(item->>'activity','') not in ('direct_function','equivalent_function','related_function','entry_potential','context','other','unclear','backend_execution','software_execution','software_analysis','software_leadership','software_context')$new$;
begin
  definition:=pg_get_functiondef('public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean)'::regprocedure);
  if position(old_method in definition)=0 or position(old_prompt in definition)=0 or position(old_kind in definition)=0 then raise exception 'M86_CLAIM_BASELINE_MISMATCH'; end if;
  definition:=replace(definition,old_method,new_method);
  definition:=replace(definition,old_prompt,new_prompt);
  definition:=replace(definition,old_kind,new_kind);
  execute definition;

  definition:=pg_get_functiondef('public.complete_matching_trajectory(uuid,uuid,uuid,text,jsonb,text,text)'::regprocedure);
  if position(old_activity in definition)=0 then raise exception 'M86_COMPLETE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_activity,new_activity);
end
$migration$;

do $migration$
declare
  definition text;
  old_method text := $old$cache.method_version<>'trajectory-backend-1.0.0'$old$;
  new_method text := $new$cache.method_version not in ('trajectory-backend-1.0.0','trajectory-position-2.0.0')$new$;
  old_prompt text := $old$cache.prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0')$old$;
  new_prompt text := $new$cache.prompt_version not in ('trajectory-evidence-1.1.0','trajectory-evidence-1.2.0','trajectory-evidence-2.0.0')$new$;
  old_contract text := $old$p_evaluation#>>'{score,matchingContractVersion}' is distinct from 'vacancy-matching-semantic-6.0.0'$old$;
  new_contract text := $new$p_evaluation#>>'{score,matchingContractVersion}' not in ('vacancy-matching-semantic-6.0.0','vacancy-matching-semantic-7.0.0')$new$;
  old_reuse text := $old$matching_version='vacancy-matching-semantic-6.0.0'$old$;
  new_reuse text := $new$matching_version in ('vacancy-matching-semantic-6.0.0','vacancy-matching-semantic-7.0.0')$new$;
  old_insert text := $old$'vacancy-matching-semantic-6.0.0',cache.prompt_version$old$;
  new_insert text := $new$case when cache.method_version='trajectory-position-2.0.0' then 'vacancy-matching-semantic-7.0.0' else 'vacancy-matching-semantic-6.0.0' end,cache.prompt_version$new$;
begin
  definition:=pg_get_functiondef('public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure);
  if position(old_method in definition)=0 or position(old_prompt in definition)=0 or position(old_contract in definition)=0
    or position(old_reuse in definition)=0 or position(old_insert in definition)=0 then raise exception 'M86_COMMIT_BASELINE_MISMATCH'; end if;
  definition:=replace(definition,old_method,new_method);
  definition:=replace(definition,old_prompt,new_prompt);
  definition:=replace(definition,old_contract,new_contract);
  definition:=replace(definition,old_reuse,new_reuse);
  definition:=replace(definition,old_insert,new_insert);
  execute definition;
end
$migration$;

create or replace function private.guard_m83_matching_snapshot() returns trigger
language plpgsql set search_path='' as $$
declare trusted boolean := current_user=pg_get_userbyid((select relowner from pg_class where oid='public.match_evaluations'::regclass));
begin
  if trusted then return new; end if;
  if tg_op='UPDATE' and old.matching_version in ('vacancy-matching-semantic-6.0.0','vacancy-matching-semantic-7.0.0')
    and old.evaluation_data->>'type' is distinct from 'position_relation_decision' then
    raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501'; end if;
  if new.matching_version in ('vacancy-matching-semantic-6.0.0','vacancy-matching-semantic-7.0.0') then
    if new.evaluation_data->>'type' is distinct from 'position_relation_decision'
      or coalesce(new.evaluation_data->>'decision','') not in ('confirmed','dismissed')
      or new.evaluation_data-array['type','decision','vacancyVersion','areaRelation','positionRelation','decidedAt']<>'{}' then
      raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501'; end if;
  elsif coalesce(new.evaluation_data->'semanticInterpretation','null'::jsonb)<>'null'::jsonb
    or new.evaluation_data#>>'{score,matchingContractVersion}' in ('vacancy-matching-semantic-6.0.0','vacancy-matching-semantic-7.0.0') then
    raise exception 'M83_BACKEND_SNAPSHOT_REQUIRED' using errcode='42501';
  end if;
  return new;
end $$;

-- A confirmed case may be proposed to the existing Knowledge Inbox, but never publishes a relation automatically.
create table if not exists public.knowledge_relation_learning_requests (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null references public.knowledge_inbox(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  position_version_id uuid not null references public.vacancy_versions(id) on delete restrict,
  profile_id uuid not null references public.professional_profiles(id) on delete restrict,
  observed_term text not null,
  relation_type text not null check (relation_type in ('direct','equivalent','related')),
  human_decision text not null check (human_decision in ('confirmed','dismissed')),
  evidence_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_snapshot)='object'),
  status text not null default 'pending' check (status in ('pending','accepted_as_alias','rejected','deferred')),
  created_by_auth_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, position_version_id, profile_id, observed_term, relation_type)
);
alter table public.knowledge_relation_learning_requests enable row level security;
drop policy if exists knowledge_relation_learning_requests_read on public.knowledge_relation_learning_requests;
create policy knowledge_relation_learning_requests_read on public.knowledge_relation_learning_requests for select to authenticated
  using (private.has_org_role(organization_id, array['super_admin','owner','admin','recruiter','member']::public.membership_role[]));
revoke all on table public.knowledge_relation_learning_requests from public,anon,authenticated,service_role;
grant select on table public.knowledge_relation_learning_requests to authenticated;

create or replace function public.enqueue_position_relation_learning(
  p_organization_id uuid, p_position_version_id uuid, p_profile_id uuid, p_observed_term text,
  p_relation_type text, p_human_decision text, p_evidence_snapshot jsonb default '{}'::jsonb
) returns table (request_id uuid, inbox_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor_id uuid; normalized text; fingerprint text; queued_inbox uuid; request uuid;
begin
  actor_id:=private.require_document_reviewer(p_organization_id);
  if p_relation_type not in ('direct','equivalent','related') or p_human_decision <> 'confirmed'
    or jsonb_typeof(coalesce(p_evidence_snapshot,'{}'::jsonb)) is distinct from 'object' then
    raise exception 'M86_LEARNING_REQUEST_INVALID' using errcode='22023'; end if;
  if not exists (select 1 from public.vacancy_versions where id=p_position_version_id and organization_id=p_organization_id)
    or not exists (select 1 from public.professional_profiles where id=p_profile_id and organization_id=p_organization_id
      and review_status='approved' and superseded_at is null) then
    raise exception 'M86_LEARNING_SOURCE_INVALID' using errcode='40001'; end if;
  normalized:=private.normalize_knowledge_term(p_observed_term);
  if normalized='' then raise exception 'M86_LEARNING_TERM_INVALID' using errcode='22023'; end if;
  fingerprint:=encode(extensions.digest(concat_ws('|','position_relation',p_organization_id::text,p_position_version_id::text,p_profile_id::text,normalized,p_relation_type),'sha256'),'hex');
  insert into public.knowledge_inbox(scope,organization_id,fingerprint,original_term,normalized_search_term,status,created_by_auth_user_id)
    values('organization',p_organization_id,fingerprint,btrim(p_observed_term),normalized,'awaiting_human_review',actor_id)
    on conflict (scope,organization_id,fingerprint) do update set last_seen_at=now(),occurrence_count=public.knowledge_inbox.occurrence_count+1,
      status=case when public.knowledge_inbox.status='approved' then public.knowledge_inbox.status else 'awaiting_human_review' end
    returning id into queued_inbox;
  insert into public.knowledge_relation_learning_requests(inbox_id,organization_id,position_version_id,profile_id,observed_term,relation_type,human_decision,evidence_snapshot,created_by_auth_user_id)
    values(queued_inbox,p_organization_id,p_position_version_id,p_profile_id,btrim(p_observed_term),p_relation_type,p_human_decision,p_evidence_snapshot,actor_id)
    on conflict (organization_id,position_version_id,profile_id,observed_term,relation_type) do update set evidence_snapshot=excluded.evidence_snapshot,status='pending';
  select id into request from public.knowledge_relation_learning_requests where organization_id=p_organization_id and position_version_id=p_position_version_id
    and profile_id=p_profile_id and observed_term=btrim(p_observed_term) and relation_type=p_relation_type;
  return query select request,queued_inbox;
end $$;
revoke all on function public.enqueue_position_relation_learning(uuid,uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_position_relation_learning(uuid,uuid,uuid,text,text,text,jsonb) to authenticated;
