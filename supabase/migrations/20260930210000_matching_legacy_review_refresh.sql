-- A paid recheck is allowed only after an authorized, explicit request for a
-- legacy disagreement whose two original readings were never stored.
alter table public.matching_trajectory_assessments
  add column legacy_refresh_requested_at timestamptz,
  add column legacy_refresh_requested_by uuid,
  add constraint matching_trajectory_legacy_refresh_actor_check check (
    (legacy_refresh_requested_at is null) = (legacy_refresh_requested_by is null)
  );

-- The ordinary limit remains three attempts. One explicit legacy recheck may
-- be attempt four, without pretending the earlier attempts did not occur.
alter table public.matching_trajectory_assessments
  drop constraint matching_trajectory_assessments_attempts_check,
  add constraint matching_trajectory_assessments_attempts_check check (
    attempts between 1 and 3 or (attempts = 4 and legacy_refresh_requested_at is not null)
  );
alter table public.matching_trajectory_assessments
  drop constraint matching_trajectory_last_reading_pair_shape,
  add constraint matching_trajectory_last_reading_pair_shape check (
    last_reading_pair is null or (
      jsonb_typeof(last_reading_pair) = 'object'
      and last_reading_pair - array['attempt','readings'] = '{}'::jsonb
      and jsonb_typeof(last_reading_pair->'readings') = 'array'
      and jsonb_array_length(last_reading_pair->'readings') = 2
      and (last_reading_pair->>'attempt') ~ '^[1-4]$'
    )
  );

-- After a manually requested recheck fails, normal search must never start
-- another paid attempt. The source assessment remains readable as fallback.
do $migration$
declare definition text; old_guard text := 'if r.attempts>=3 or r.retry_after>clock_timestamp() then';
begin
  definition:=pg_get_functiondef('public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean)'::regprocedure);
  if (length(definition)-length(replace(definition,old_guard,'')))/length(old_guard)<>1
  then raise exception 'MATCHING_LEGACY_REFRESH_CLAIM_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_guard,
    'if r.legacy_refresh_requested_at is not null or r.attempts>=3 or r.retry_after>clock_timestamp() then');
end $migration$;

-- This short transaction claims one existing cache row; the provider calls
-- take place later, outside the transaction and under its existing lease.
create function public.claim_matching_legacy_review_refresh(
  p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,p_analysis_id uuid,
  p_input_hash text,p_method_version text,p_prompt_version text,p_model_version text,
  p_source_versions jsonb,p_context jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.matching_trajectory_assessments; sources jsonb;
begin
  sources:=private.m83_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if not (private.is_super_admin(p_actor_id) or exists (
    select 1 from public.organization_memberships m where m.user_id=p_actor_id and m.organization_id=p_organization_id
      and m.role in ('owner','admin','recruiter')
  )) then raise exception 'MATCHING_REVIEW_NOT_AUTHORIZED' using errcode='42501'; end if;
  if not pg_try_advisory_xact_lock(830031) then
    return jsonb_build_object('status','processing','reason_code','CONCURRENCY_LIMIT','acquired',false); end if;
  begin
    select * into r from public.matching_trajectory_assessments where id=p_analysis_id for update nowait;
  exception when lock_not_available then
    return jsonb_build_object('status','processing','reason_code','CONCURRENCY_LIMIT','acquired',false);
  end;
  if r.id is null or r.organization_id is distinct from p_organization_id
    or r.profile_id is distinct from p_profile_id or r.vacancy_version_id is distinct from p_position_version_id
    or r.input_hash is distinct from p_input_hash or r.method_version is distinct from p_method_version
    or r.prompt_version is distinct from p_prompt_version or r.model_version is distinct from p_model_version
    or r.source_versions is distinct from sources->'sourceVersions'
    or p_source_versions is distinct from r.source_versions or r.minimized_context is distinct from p_context
  then return jsonb_build_object('status','unavailable','reason_code','SOURCE_STALE','acquired',false); end if;
  if r.status<>'indeterminate' or r.reason_code<>'READINGS_DISAGREE'
    or r.last_reading_pair is not null or r.legacy_refresh_requested_at is not null or r.attempts>=4
  then return jsonb_build_object('status','unavailable','reason_code','REVIEW_NOT_READY','acquired',false); end if;
  if (select count(*) from public.matching_trajectory_assessments
      where status='processing' and lease_until>clock_timestamp())>=2 then
    return jsonb_build_object('status','processing','reason_code','CONCURRENCY_LIMIT','acquired',false); end if;
  update public.matching_trajectory_assessments set status='processing',reason_code=null,reading=null,
    lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '150 seconds',
    attempts=attempts+1,retry_after=null,completed_at=null,
    legacy_refresh_requested_at=clock_timestamp(),legacy_refresh_requested_by=p_actor_id
    where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'lease',r.lease,'attempts',r.attempts,'status',r.status,'acquired',true);
end $$;
revoke all on function public.claim_matching_legacy_review_refresh(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.claim_matching_legacy_review_refresh(uuid,uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb)
  to service_role;

-- An expected missing legacy pair is a typed result, not SQLSTATE 40001
-- (serialization failure). The old path was observed timing out at the gateway.
create or replace function public.load_matching_trajectory_review(
  p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,p_analysis_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.matching_trajectory_assessments; sources jsonb; conflict_count integer;
begin
  sources:=private.m83_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if not (private.is_super_admin(p_actor_id) or exists (
    select 1 from public.organization_memberships m where m.user_id=p_actor_id and m.organization_id=p_organization_id
      and m.role in ('owner','admin','recruiter')
  )) then raise exception 'MATCHING_REVIEW_NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into r from public.matching_trajectory_assessments where id=p_analysis_id and organization_id=p_organization_id
    and profile_id=p_profile_id and vacancy_version_id=p_position_version_id;
  if r.id is null or r.source_versions is distinct from sources->'sourceVersions'
    or r.status<>'indeterminate' or r.reason_code<>'READINGS_DISAGREE'
  then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='P0001'; end if;
  if r.last_reading_pair is null then
    return jsonb_build_object('analysisId',r.id,'conflictCount',0,'reviewable',false,
      'reasonCode','PAIR_NOT_STORED');
  end if;
  if r.last_reading_pair#>>'{readings,0,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,1,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,0,model}' is distinct from r.last_reading_pair#>>'{readings,1,model}'
  then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='P0001'; end if;
  select count(*) into conflict_count from jsonb_array_elements(r.last_reading_pair#>'{readings,0,items}') a
    join jsonb_array_elements(r.last_reading_pair#>'{readings,1,items}') b on a->>'id'=b->>'id'
    where a->>'activity' is distinct from b->>'activity';
  if conflict_count<1 then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='P0001'; end if;
  if conflict_count>5 then return jsonb_build_object('analysisId',r.id,'conflictCount',conflict_count,'reviewable',false); end if;
  return jsonb_build_object('analysisId',r.id,'conflictCount',conflict_count,'reviewable',true,
    'pair',r.last_reading_pair,'context',r.minimized_context,'humanReviewId',r.human_review_id);
end $$;
revoke all on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) to service_role;

-- A concurrent or stale choice is expected and must fail promptly, not be
-- retried by the database gateway as a serialization failure.
do $migration$
declare definition text; old_error text := 'MATCHING_REVIEW_NOT_READY'' using errcode=''40001';
begin
  definition:=pg_get_functiondef('public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb)'::regprocedure);
  if (length(definition)-length(replace(definition,old_error,'')))/length(old_error)<>1
  then raise exception 'MATCHING_LEGACY_REFRESH_SAVE_BASELINE_MISMATCH'; end if;
  execute replace(definition,old_error,'MATCHING_REVIEW_NOT_READY'' using errcode=''P0001');
end $migration$;
