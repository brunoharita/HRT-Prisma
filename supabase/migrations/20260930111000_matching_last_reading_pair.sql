-- Keep only the latest structured pair for a versioned profile/position assessment.
alter table public.matching_trajectory_assessments
  add column last_reading_pair jsonb
  constraint matching_trajectory_last_reading_pair_shape check (
    last_reading_pair is null or (
      jsonb_typeof(last_reading_pair) = 'object'
      and last_reading_pair - array['attempt','readings'] = '{}'::jsonb
      and jsonb_typeof(last_reading_pair->'readings') = 'array'
      and jsonb_array_length(last_reading_pair->'readings') = 2
      and (last_reading_pair->>'attempt') ~ '^[1-3]$'
    )
  );

-- The legacy completion contract remains available during a rolling Edge deployment.
-- This wrapper validates the compact pair, then completes and writes it atomically.
create function public.complete_matching_trajectory_audited(
  p_actor_id uuid,p_analysis_id uuid,p_lease uuid,p_status text,p_reading jsonb,
  p_reason_code text,p_actual_model_version text,p_reading_pair jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  r public.matching_trajectory_assessments;
  result jsonb;
  side jsonb;
  item jsonb;
  source_id text;
  evidence_id text;
  source_text text;
  left_classifications jsonb;
  right_classifications jsonb;
  agreed_classifications jsonb;
  i integer;
begin
  select * into r from public.matching_trajectory_assessments where id=p_analysis_id for update;
  if r.id is null or r.status<>'processing' or r.lease is distinct from p_lease or r.lease_until<=clock_timestamp() then
    raise exception 'M83_LEASE_INVALID' using errcode='40001'; end if;
  if p_reading_pair is null or jsonb_typeof(p_reading_pair) is distinct from 'array'
    or jsonb_array_length(p_reading_pair)<>2 or octet_length(p_reading_pair::text)>128000 then
    raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
  for i in 0..1 loop
    side:=p_reading_pair->i;
    if jsonb_typeof(side) is distinct from 'object' then
      raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
    if side->>'outcome'='validated' then
      if side-array['outcome','model','items']<>'{}'::jsonb
        or jsonb_typeof(side->'model') is distinct from 'string' or length(btrim(side->>'model')) not between 1 and 160
        or jsonb_typeof(side->'items') is distinct from 'array'
        or jsonb_array_length(side->'items')<>jsonb_array_length(r.minimized_context->'entries')
        or (select count(distinct x->>'id') from jsonb_array_elements(side->'items') x)<>jsonb_array_length(side->'items')
      then raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
      for item in select value from jsonb_array_elements(side->'items') loop
        source_id:=item->>'id'; evidence_id:=item->>'evidenceId';
        select e->>'text' into source_text from jsonb_array_elements(r.minimized_context->'entries') e
          where e->>'id'=source_id;
        if jsonb_typeof(item) is distinct from 'object' or item-array['id','activity','evidenceId']<>'{}'::jsonb
          or jsonb_typeof(item->'id') is distinct from 'string'
          or source_text is null
          or coalesce(item->>'activity','') not in (
            'direct_function','equivalent_function','related_function','entry_potential','context','other','unclear',
            'backend_execution','software_execution','software_analysis','software_leadership','software_context')
          or jsonb_typeof(item->'evidenceId') is distinct from 'string'
          or (item->>'activity'='unclear' and evidence_id<>'')
          or (item->>'activity'<>'unclear' and (
            left(evidence_id,length(source_id)+1)<>source_id||':'
            or substring(evidence_id from length(source_id)+2) !~ '^(0|[1-9][0-9]{0,2})$'
          ))
        then raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
        if item->>'activity'<>'unclear' and substring(evidence_id from length(source_id)+2)::integer >=
          greatest(1,ceil(length(source_text)::numeric/120)::integer) then
          raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
      end loop;
    elsif side->>'outcome'='failed' then
      if side-array['outcome','stage','reasonCode']<>'{}'::jsonb
        or coalesce(side->>'stage','') not in (
          'provider_transport','provider_http','provider_json','provider_status','provider_model',
          'provider_output','provider_content','output_json','reading_evidence','reading_contract','internal')
        or coalesce(side->>'reasonCode','') not in ('PROVIDER_UNAVAILABLE','RESPONSE_INVALID','PROVIDER_TIMEOUT')
      then raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
    else raise exception 'MATCHING_AUDIT_INVALID' using errcode='22023'; end if;
  end loop;

  if (p_reading_pair->0)->>'outcome'='validated' then
    select jsonb_agg(jsonb_build_object('id',x->>'id','activity',x->>'activity') order by x->>'id')
      into left_classifications from jsonb_array_elements((p_reading_pair->0)->'items') x;
  end if;
  if (p_reading_pair->1)->>'outcome'='validated' then
    select jsonb_agg(jsonb_build_object('id',x->>'id','activity',x->>'activity') order by x->>'id')
      into right_classifications from jsonb_array_elements((p_reading_pair->1)->'items') x;
  end if;
  if p_status='complete' then
    if left_classifications is null or right_classifications is null
      or left_classifications is distinct from right_classifications
      or (p_reading_pair->0)->>'model' is distinct from (p_reading_pair->1)->>'model'
      or p_actual_model_version is distinct from (p_reading_pair->0)->>'model'
      or jsonb_typeof(p_reading->'items') is distinct from 'array'
    then raise exception 'MATCHING_AUDIT_INCONSISTENT' using errcode='22023'; end if;
    select jsonb_agg(jsonb_build_object('id',x->>'id','activity',x->>'activity') order by x->>'id')
      into agreed_classifications from jsonb_array_elements(p_reading->'items') x;
    if agreed_classifications is distinct from left_classifications then
      raise exception 'MATCHING_AUDIT_INCONSISTENT' using errcode='22023'; end if;
  elsif p_status='indeterminate' then
    if left_classifications is null or right_classifications is null
      or left_classifications is not distinct from right_classifications
      or (p_reading_pair->0)->>'model' is distinct from (p_reading_pair->1)->>'model'
      or p_actual_model_version is distinct from (p_reading_pair->0)->>'model'
    then raise exception 'MATCHING_AUDIT_INCONSISTENT' using errcode='22023'; end if;
  elsif p_status='unavailable' then
    if left_classifications is not null and right_classifications is not null
      and (p_reading_pair->0)->>'model' is not distinct from (p_reading_pair->1)->>'model'
    then raise exception 'MATCHING_AUDIT_INCONSISTENT' using errcode='22023'; end if;
  else raise exception 'MATCHING_AUDIT_INCONSISTENT' using errcode='22023'; end if;

  result:=public.complete_matching_trajectory(p_actor_id,p_analysis_id,p_lease,p_status,p_reading,p_reason_code,p_actual_model_version);
  if result->>'status'=p_status and result->>'reason_code' is not distinct from p_reason_code then
    update public.matching_trajectory_assessments
      set last_reading_pair=jsonb_build_object('attempt',r.attempts,'readings',p_reading_pair)
      where id=r.id;
  end if;
  return result-'last_reading_pair';
end $$;
revoke all on function public.complete_matching_trajectory_audited(uuid,uuid,uuid,text,jsonb,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.complete_matching_trajectory_audited(uuid,uuid,uuid,text,jsonb,text,text,jsonb)
  to service_role;

-- Cache reuse must not transport audit content through ordinary matching RPCs.
do $migration$
declare definition text;
begin
  definition:=pg_get_functiondef('public.claim_matching_trajectory(uuid,uuid,uuid,uuid,text,text,text,text,jsonb,jsonb,boolean)'::regprocedure);
  if position('to_jsonb(r)-array[''lease'',''lease_until'']' in definition)=0
    or position('return to_jsonb(r)||jsonb_build_object(''acquired'',true)' in definition)=0
  then raise exception 'MATCHING_AUDIT_CLAIM_BASELINE_MISMATCH'; end if;
  definition:=replace(definition,'to_jsonb(r)-array[''lease'',''lease_until'']',
    'to_jsonb(r)-array[''lease'',''lease_until'',''last_reading_pair'']');
  definition:=replace(definition,'return to_jsonb(r)||jsonb_build_object(''acquired'',true)',
    'return (to_jsonb(r)-''last_reading_pair'')||jsonb_build_object(''acquired'',true)');
  execute definition;
end $migration$;
