-- Human review is contextual to one tenant, published Profile and Position version.
-- The two original AI readings are never rewritten by this movement.
create table public.matching_trajectory_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  analysis_id uuid not null references public.matching_trajectory_assessments(id) on delete cascade,
  reviewer_id uuid not null,
  review_version text not null check (review_version='trajectory-human-review-1.0.0'),
  choices jsonb not null check (jsonb_typeof(choices)='array' and jsonb_array_length(choices) between 1 and 5),
  reading jsonb,
  status text not null check (status in ('resolved','unresolved')),
  created_at timestamptz not null default clock_timestamp(),
  check ((status='resolved' and reading is not null) or (status='unresolved' and reading is null))
);
create index matching_trajectory_reviews_analysis_idx on public.matching_trajectory_reviews(analysis_id,created_at desc);
create index matching_trajectory_reviews_org_idx on public.matching_trajectory_reviews(organization_id,created_at desc);
alter table public.matching_trajectory_reviews enable row level security;
revoke all on public.matching_trajectory_reviews from public,anon,authenticated,service_role;
alter table public.matching_trajectory_assessments add column human_review_id uuid;

-- Only the Edge service receives the compact pair. The browser receives at most
-- five conflict projections, never this RPC's raw audit/cache payload.
create function public.load_matching_trajectory_review(
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
    or r.last_reading_pair is null
    or r.last_reading_pair#>>'{readings,0,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,1,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,0,model}' is distinct from r.last_reading_pair#>>'{readings,1,model}'
  then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='40001'; end if;
  select count(*) into conflict_count from jsonb_array_elements(r.last_reading_pair#>'{readings,0,items}') a
    join jsonb_array_elements(r.last_reading_pair#>'{readings,1,items}') b on a->>'id'=b->>'id'
    where a->>'activity' is distinct from b->>'activity';
  if conflict_count<1 then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='40001'; end if;
  if conflict_count>5 then return jsonb_build_object('analysisId',r.id,'conflictCount',conflict_count,'reviewable',false); end if;
  return jsonb_build_object('analysisId',r.id,'conflictCount',conflict_count,'reviewable',true,
    'pair',r.last_reading_pair,'context',r.minimized_context,'humanReviewId',r.human_review_id);
end $$;
revoke all on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.load_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid) to service_role;

-- The client submits only choices. Edge constructs the complete reading from
-- the two validated references; this transaction revalidates authority, scope,
-- source revisions and every classification before changing the cached outcome.
create function public.save_matching_trajectory_review(
  p_actor_id uuid,p_organization_id uuid,p_profile_id uuid,p_position_version_id uuid,p_analysis_id uuid,
  p_choices jsonb,p_reading jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.matching_trajectory_assessments; sources jsonb; review_id uuid;
  conflict_count integer; choice_count integer; unresolved boolean; item jsonb; entry jsonb; left_item jsonb; right_item jsonb;
  choice_item jsonb; reading_item jsonb; expected_activity text; quote_text text;
begin
  sources:=private.m83_sources(p_actor_id,p_organization_id,p_profile_id,p_position_version_id);
  if not (private.is_super_admin(p_actor_id) or exists (
    select 1 from public.organization_memberships m where m.user_id=p_actor_id and m.organization_id=p_organization_id
      and m.role in ('owner','admin','recruiter')
  )) then raise exception 'MATCHING_REVIEW_NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into r from public.matching_trajectory_assessments where id=p_analysis_id and organization_id=p_organization_id
    and profile_id=p_profile_id and vacancy_version_id=p_position_version_id for update;
  if r.id is null or r.source_versions is distinct from sources->'sourceVersions'
    or r.status<>'indeterminate' or r.reason_code<>'READINGS_DISAGREE'
    or r.last_reading_pair is null
    or r.last_reading_pair#>>'{readings,0,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,1,outcome}'<>'validated'
    or r.last_reading_pair#>>'{readings,0,model}' is distinct from r.last_reading_pair#>>'{readings,1,model}'
  then raise exception 'MATCHING_REVIEW_NOT_READY' using errcode='40001'; end if;
  select count(*) into conflict_count from jsonb_array_elements(r.last_reading_pair#>'{readings,0,items}') a
    join jsonb_array_elements(r.last_reading_pair#>'{readings,1,items}') b on a->>'id'=b->>'id'
    where a->>'activity' is distinct from b->>'activity';
  if conflict_count not between 1 and 5 or jsonb_typeof(p_choices) is distinct from 'array'
    or jsonb_array_length(p_choices)<>conflict_count then
    raise exception 'MATCHING_REVIEW_CHOICES_INVALID' using errcode='22023'; end if;
  select count(distinct c->>'id'),bool_or(c->>'choice'='cannot_determine') into choice_count,unresolved
    from jsonb_array_elements(p_choices) c;
  if choice_count<>conflict_count then raise exception 'MATCHING_REVIEW_CHOICES_INVALID' using errcode='22023'; end if;
  for choice_item in select value from jsonb_array_elements(p_choices) loop
    if jsonb_typeof(choice_item) is distinct from 'object'
      or choice_item-array['id','choice']<>'{}'::jsonb
      or coalesce(choice_item->>'choice','') not in ('first','second','cannot_determine')
      or not exists (
        select 1 from jsonb_array_elements(r.last_reading_pair#>'{readings,0,items}') a
          join jsonb_array_elements(r.last_reading_pair#>'{readings,1,items}') b on a->>'id'=b->>'id'
          where a->>'id'=choice_item->>'id' and a->>'activity' is distinct from b->>'activity'
      ) then raise exception 'MATCHING_REVIEW_CHOICES_INVALID' using errcode='22023'; end if;
  end loop;
  if unresolved then
    if p_reading is not null then raise exception 'MATCHING_REVIEW_READING_INVALID' using errcode='22023'; end if;
  else
    if jsonb_typeof(p_reading) is distinct from 'object' or p_reading-array['items']<>'{}'::jsonb
      or jsonb_typeof(p_reading->'items') is distinct from 'array'
      or jsonb_array_length(p_reading->'items')<>jsonb_array_length(r.minimized_context->'entries')
      or (select count(distinct x->>'id') from jsonb_array_elements(p_reading->'items') x)<>jsonb_array_length(p_reading->'items')
    then raise exception 'MATCHING_REVIEW_READING_INVALID' using errcode='22023'; end if;
    for entry in select value from jsonb_array_elements(r.minimized_context->'entries') loop
      select value into left_item from jsonb_array_elements(r.last_reading_pair#>'{readings,0,items}') x where x.value->>'id'=entry->>'id';
      select value into right_item from jsonb_array_elements(r.last_reading_pair#>'{readings,1,items}') x where x.value->>'id'=entry->>'id';
      select value into reading_item from jsonb_array_elements(p_reading->'items') x where x.value->>'id'=entry->>'id';
      select value into choice_item from jsonb_array_elements(p_choices) x where x.value->>'id'=entry->>'id';
      expected_activity:=case when choice_item->>'choice'='second' then right_item->>'activity' else left_item->>'activity' end;
      quote_text:=reading_item->>'quote';
      if left_item is null or right_item is null or reading_item is null
        or jsonb_typeof(reading_item) is distinct from 'object'
        or reading_item-array['id','activity','quote']<>'{}'::jsonb
        or reading_item->>'activity' is distinct from expected_activity
        or jsonb_typeof(reading_item->'quote') is distinct from 'string'
        or (expected_activity='unclear' and quote_text<>'')
        or (expected_activity<>'unclear' and (length(btrim(quote_text))<least(6,length(entry->>'text'))
          or strpos(entry->>'text',quote_text)=0))
      then raise exception 'MATCHING_REVIEW_READING_INVALID' using errcode='22023'; end if;
    end loop;
  end if;
  insert into public.matching_trajectory_reviews(organization_id,analysis_id,reviewer_id,review_version,choices,reading,status)
    values(p_organization_id,r.id,p_actor_id,'trajectory-human-review-1.0.0',p_choices,p_reading,
      case when unresolved then 'unresolved' else 'resolved' end) returning id into review_id;
  if unresolved then
    update public.matching_trajectory_assessments set human_review_id=review_id where id=r.id;
  else
    update public.matching_trajectory_assessments set human_review_id=review_id,status='complete',reading=p_reading,
      reason_code=null,completed_at=clock_timestamp() where id=r.id;
  end if;
  return jsonb_build_object('reviewId',review_id,'status',case when unresolved then 'unresolved' else 'resolved' end);
end $$;
revoke all on function public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_matching_trajectory_review(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb) to service_role;

-- The existing snapshot path still runs as service_role and rechecks all source
-- revisions. Add the human review identity to its provenance gate.
do $migration$
declare definition text; marker text;
begin
  definition:=pg_get_functiondef('public.commit_matching_snapshot(uuid,uuid,uuid,uuid,uuid,text,jsonb)'::regprocedure);
  marker:='or p_evaluation#>>''{semanticInterpretation,status}'' is distinct from ''complete''';
  if position(marker in definition)=0 then raise exception 'MATCHING_REVIEW_SNAPSHOT_BASELINE_MISMATCH'; end if;
  definition:=replace(definition,marker,marker||E'\n    or (cache.human_review_id is null and p_evaluation#>>''{semanticInterpretation,resolutionSource}'' is not null)'
    ||E'\n    or (cache.human_review_id is not null and ('
    ||E'\n      p_evaluation#>>''{semanticInterpretation,resolutionSource}'' is distinct from ''human_review'''
    ||E'\n      or p_evaluation#>>''{semanticInterpretation,reviewId}'' is distinct from cache.human_review_id::text'
    ||E'\n      or p_evaluation#>>''{semanticInterpretation,reviewVersion}'' is distinct from ''trajectory-human-review-1.0.0''))');
  execute definition;
end $migration$;
