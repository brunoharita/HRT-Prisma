-- Stable lifecycle only. Rubric, Profile, Knowledge and human decisions are unchanged.
create table public.matching_score_states (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null,
  vacancy_id uuid not null,
  evaluation_id uuid references public.match_evaluations(id) on delete set null,
  dependencies jsonb,
  attempted_dependencies jsonb,
  lease uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key(organization_id,person_id,vacancy_id),
  foreign key(organization_id,person_id) references public.people(organization_id,id) on delete cascade,
  foreign key(organization_id,vacancy_id) references public.vacancies(organization_id,id) on delete cascade
);
alter table public.matching_score_states enable row level security;
revoke all on public.matching_score_states from public,anon,authenticated,service_role;

-- Ignore passage of time when identifying inputs. Validity is evaluated at the
-- calculation's fixed reference date, not while reading the current result.
create function private.stable_matching_sources(p_actor uuid,p_org uuid,p_profile uuid,p_position uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s jsonb; demonstrated jsonb; deps jsonb; review_id uuid;
begin
  s:=private.m83_snapshot_sources(p_actor,p_org,p_profile,p_position);
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'competencyKey',e.competency_key,'demonstratedLevel',e.demonstrated_level,
    'confidenceState',e.confidence_state,'verificationDefinitionVersion',e.verification_definition_version,'evaluationVersion',e.evaluation_version,
    'integrityRuleVersion',e.integrity_rule_version,'verifiedAt',e.verified_at,'validUntil',e.valid_until) order by e.verified_at desc,e.id),'[]')
    into demonstrated from public.competency_demonstrated_evidence e where e.organization_id=p_org
      and e.person_id=(s#>>'{candidate,personId}')::uuid and e.status='active'
      and e.demonstrated_level in ('basic','intermediate','advanced') and e.confidence_state in ('high','adequate','reduced');
  s:=s||jsonb_build_object('demonstratedEvidence',demonstrated);
  select a.human_review_id into review_id from public.matching_trajectory_assessments a
    where a.organization_id=p_org and a.profile_id=p_profile and a.vacancy_version_id=p_position
      and a.human_review_id is not null order by a.completed_at desc nulls last,a.created_at desc limit 1;
  -- Actual consumed data, not global revision counters, runtime version or date.
  deps:=jsonb_build_object(
    'profile',encode(extensions.digest(jsonb_build_object('id',p_profile,'data',s#>'{candidate,profileData}')::text,'sha256'),'hex'),
    'position',encode(extensions.digest((s->'vacancy')::text,'sha256'),'hex'),
    'knowledge',encode(extensions.digest(jsonb_build_object('occupation',s->'occupationReference','observations',
      (select coalesce(jsonb_agg(x-'sourceVersion' order by (x-'sourceVersion')::text),'[]') from jsonb_array_elements(s#>'{candidate,knowledge}') x))::text,'sha256'),'hex'),
    'evidence',encode(extensions.digest(demonstrated::text,'sha256'),'hex'),
    'decision',encode(extensions.digest(jsonb_build_object('decision',s->'decisionSource','reviewId',review_id)::text,'sha256'),'hex'));
  return s||jsonb_build_object('stableDependencies',deps);
end $$;
revoke all on function private.stable_matching_sources(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.claim_stable_matching_score(p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,p_recalculate boolean default false)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s jsonb; st public.matching_score_states; ev public.match_evaluations; person uuid; vacancy uuid; deps jsonb; result jsonb;
begin
  s:=private.stable_matching_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if p_recalculate and not (private.is_super_admin(p_actor_id) or exists(select 1 from public.organization_memberships m
    where m.organization_id=p_organization_id and m.user_id=p_actor_id and m.role in ('owner','admin','recruiter')))
    then raise exception 'MATCHING_RECALCULATION_NOT_AUTHORIZED' using errcode='42501'; end if;
  person:=(s#>>'{candidate,personId}')::uuid; vacancy:=(s#>>'{vacancy,id}')::uuid; deps:=s->'stableDependencies';
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text||person::text||vacancy::text,214));
  insert into public.matching_score_states(organization_id,person_id,vacancy_id) values(p_organization_id,person,vacancy) on conflict do nothing;
  select * into st from public.matching_score_states where organization_id=p_organization_id and person_id=person and vacancy_id=vacancy for update;
  select * into ev from public.match_evaluations where id=st.evaluation_id and organization_id=p_organization_id and person_id=person and vacancy_id=vacancy;
  result:=jsonb_build_object('evaluationId',ev.id,'match',ev.evaluation_data->'stableMatch','calculatedAt',ev.created_at,
    'audit',ev.evaluation_data->'stableAudit','acquired',false,'state','current');
  if st.lease is not null and st.lease_until>clock_timestamp() then return result||jsonb_build_object('state','updating'); end if;
  if not p_recalculate and st.dependencies=deps and ev.id is not null then return result; end if;
  if not p_recalculate and st.attempted_dependencies=deps and ev.id is not null then return result||jsonb_build_object('state','update_failed'); end if;
  update public.matching_score_states set lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '150 seconds',
    attempted_dependencies=deps,updated_at=clock_timestamp() where organization_id=p_organization_id and person_id=person and vacancy_id=vacancy returning * into st;
  return result||jsonb_build_object('state','updating','acquired',true,'lease',st.lease,'sources',s,
    'reason',case when p_recalculate then 'explicit_recalculation' when ev.id is null then 'initial_calculation' else 'dependencies_changed' end,
    'changedDependencies',(select coalesce(jsonb_agg(key order by key),'[]') from jsonb_each(deps) where value is distinct from st.dependencies->key));
end $$;
revoke all on function public.claim_stable_matching_score(uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_stable_matching_score(uuid,uuid,uuid,uuid,boolean) to service_role;

create function public.complete_stable_matching_score(p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,
  p_lease uuid,p_dependencies jsonb,p_match jsonb,p_reason text,p_changed_dependencies jsonb) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s jsonb; st public.matching_score_states; person uuid; vacancy uuid; ev uuid; audit jsonb; data jsonb; calculated_at timestamptz;
begin
  perform pg_advisory_xact_lock(214032);
  lock table public.organizations,public.organization_memberships,public.platform_users,
    public.professional_profiles,public.people,public.vacancies,public.vacancy_versions,
    public.vacancy_requirements,public.vacancy_requirement_relations,public.knowledge_observations,
    public.knowledge_concepts,public.knowledge_terms,public.knowledge_relations,public.knowledge_change_sets,
    public.competency_demonstrated_evidence,public.match_evaluations,public.matching_trajectory_assessments in share mode nowait;
  s:=private.stable_matching_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  person:=(s#>>'{candidate,personId}')::uuid; vacancy:=(s#>>'{vacancy,id}')::uuid;
  select * into st from public.matching_score_states where organization_id=p_organization_id and person_id=person and vacancy_id=vacancy for update;
  if st.lease is null or st.lease is distinct from p_lease or st.lease_until<=clock_timestamp()
    or st.attempted_dependencies is distinct from p_dependencies or s->'stableDependencies' is distinct from p_dependencies
    then raise exception 'STABLE_SCORE_SOURCE_STALE' using errcode='40001'; end if;
  if p_match is null then
    update public.matching_score_states set lease=null,lease_until=null,updated_at=clock_timestamp()
      where organization_id=p_organization_id and person_id=person and vacancy_id=vacancy;
    return jsonb_build_object('state','update_failed');
  end if;
  if jsonb_typeof(p_match)<>'object' or p_match ? 'candidate'
    or p_match#>>'{score,profileVersion}' is distinct from p_profile_id::text
    or p_match#>>'{score,positionVersion}' is distinct from p_position_version_id::text
    or p_match#>>'{score,scoreContractVersion}' is distinct from 'matching-score-1.4.0'
    or coalesce(p_match#>>'{score,matchingContractVersion}','') not in ('vacancy-matching-explainable-5.1.0','vacancy-matching-semantic-7.0.0')
    or coalesce(p_match->>'discoveryGroup','') not in ('main_area','related_area','contextual_signals')
    or coalesce(p_reason,'') not in ('explicit_recalculation','initial_calculation','dependencies_changed')
    or jsonb_typeof(p_match->'requirements') is distinct from 'array'
    then raise exception 'STABLE_SCORE_INVALID' using errcode='22023'; end if;
  if p_reason='explicit_recalculation' and not (private.is_super_admin(p_actor_id) or exists(select 1 from public.organization_memberships m
    where m.organization_id=p_organization_id and m.user_id=p_actor_id and m.role in ('owner','admin','recruiter')))
    then raise exception 'MATCHING_RECALCULATION_NOT_AUTHORIZED' using errcode='42501'; end if;
  audit:=jsonb_build_object('contract','matching-stable-result-1.0.0','reason',p_reason,'changedDependencies',p_changed_dependencies,
    'actorId',p_actor_id,'previousEvaluationId',st.evaluation_id,'previousScore',(select evaluation_data#>'{score,score}' from public.match_evaluations where id=st.evaluation_id),
    'newScore',p_match#>'{score,score}','dependencies',p_dependencies);
  data:=jsonb_build_object('stableMatch',p_match,'stableAudit',audit,'score',p_match->'score','requirements',
    (select coalesce(jsonb_agg(jsonb_build_object('stableId',x#>>'{requirement,stableId}','label',x#>>'{requirement,label}','status',x->>'status','explanation',x->>'explanation','evidence',x->'evidence')),'[]') from jsonb_array_elements(p_match->'requirements') x),
    'vacancyVersion',s#>'{vacancy,version}','areaRelation',p_match->'areaRelation','positionRelation',p_match->'positionRelation',
    'functionAssessment',p_match->'functionAssessment','trajectoryAssessment',p_match->'trajectoryAssessment','discoveryGroup',p_match->'discoveryGroup',
    'detailedStatus',p_match->'detailedStatus','evidenceAssessment',p_match->'evidenceAssessment',
    'positionDecision',p_match->'positionDecision','semanticInterpretation',p_match->'semanticAssessment',
    'backendSnapshotContract','matching-stable-result-1.0.0');
  insert into public.match_evaluations(organization_id,person_id,vacancy_id,vacancy_version_id,evaluation_data,matching_version,prompt_version,model_version)
    values(p_organization_id,person,vacancy,p_position_version_id,data,p_match#>>'{score,matchingContractVersion}',
      coalesce(p_match#>>'{semanticAssessment,promptVersion}','no-llm-prompt-1.0.0'),coalesce(p_match#>>'{semanticAssessment,modelVersion}','deterministic-local-3.0.0')) returning id,created_at into ev,calculated_at;
  update public.matching_score_states set evaluation_id=ev,dependencies=p_dependencies,lease=null,lease_until=null,updated_at=clock_timestamp()
    where organization_id=p_organization_id and person_id=person and vacancy_id=vacancy;
  return jsonb_build_object('state','current','evaluationId',ev,'match',p_match,'audit',audit,'calculatedAt',calculated_at);
end $$;
revoke all on function public.complete_stable_matching_score(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_stable_matching_score(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) to service_role;

-- Stable history is immutable and cannot be manufactured through the Data API.
create function private.guard_stable_matching_score() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.evaluation_data ? 'stableAudit' and current_user<>pg_get_userbyid((select relowner from pg_class where oid='public.match_evaluations'::regclass))
      then raise exception 'STABLE_SCORE_IMMUTABLE' using errcode='42501'; end if;
    return old; -- Preserve the existing owner-only definitive Person deletion contract.
  end if;
  if tg_op='UPDATE' and old.evaluation_data ? 'stableAudit' then raise exception 'STABLE_SCORE_IMMUTABLE' using errcode='42501'; end if;
  if (new.evaluation_data ? 'stableAudit' or new.evaluation_data ? 'stableMatch')
    and current_user<>pg_get_userbyid((select relowner from pg_class where oid='public.match_evaluations'::regclass))
    then raise exception 'STABLE_SCORE_BACKEND_REQUIRED' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function private.guard_stable_matching_score() from public,anon,authenticated,service_role;
create trigger guard_stable_matching_score before insert or update or delete on public.match_evaluations for each row execute function private.guard_stable_matching_score();
