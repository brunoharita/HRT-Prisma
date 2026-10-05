-- Per-response preservation. No backfill, no reset, no canonical Profile writes.
alter table public.profile_synthesis_jobs alter column contract_version set default 'profile-synthesis-1.1.0', alter column prompt_version set default 'profile-synthesis-prompt-1.1.0';
alter table public.profile_syntheses alter column contract_version set default 'profile-synthesis-1.1.0', alter column prompt_version set default 'profile-synthesis-prompt-1.1.0';
create or replace function private.valid_profile_synthesis_sections_core(p_result jsonb,p_sources jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare a jsonb; st jsonb; ref jsonb; ids text[]:=array['trajectory','activities','contexts','competencies','results','education','objective','clarifications']; n integer:=0; total text;
begin
 if jsonb_typeof(p_result) is distinct from 'object' or p_result->>'contractVersion' is distinct from 'profile-synthesis-1.0.0'
 or (select count(*) from jsonb_object_keys(p_result))<>4 or jsonb_typeof(p_sources) is distinct from 'array'
 or jsonb_typeof(p_result->'overview') is distinct from 'array' or jsonb_array_length(p_result->'overview') not between 0 and 5
 or jsonb_typeof(p_result->'answers') is distinct from 'array' or jsonb_array_length(p_result->'answers')<>8
 or jsonb_typeof(p_result->'clarifications') is distinct from 'array' or jsonb_array_length(p_result->'clarifications')>3 or octet_length(p_result::text)>40000 then return false; end if;
 select string_agg(x->>'text',' ') into total from jsonb_array_elements(p_result->'overview') x;
 if cardinality(regexp_split_to_array(btrim(total),'\s+'))>120 then return false; end if;
 for a in select x from jsonb_array_elements(p_result->'answers') x loop
  n:=n+1;
  if jsonb_typeof(a) is distinct from 'object' or (select count(*) from jsonb_object_keys(a))<>4
  or a->>'questionId' is distinct from ids[n] or coalesce(a->>'status','') not in ('answered','partial','insufficient')
  or jsonb_typeof(a->'statements') is distinct from 'array' or jsonb_array_length(a->'statements')>4
  or jsonb_typeof(a->'missingInformation') is distinct from 'array' or jsonb_array_length(a->'missingInformation')>3 then return false; end if;
  if a->>'status'='insufficient' and (jsonb_array_length(a->'statements')<>0 or jsonb_array_length(a->'missingInformation')=0) then return false; end if;
  if a->>'status'<>'insufficient' and jsonb_array_length(a->'statements')=0 then return false; end if;
  if a->>'status'='partial' and jsonb_array_length(a->'missingInformation')=0 then return false; end if;
  for ref in select x from jsonb_array_elements(a->'missingInformation') x loop
   if jsonb_typeof(ref) is distinct from 'string' or char_length(btrim(ref#>>'{}')) not between 1 and 600 then return false; end if;
  end loop;
  select string_agg(x->>'text',' ') into total from jsonb_array_elements(a->'statements') x;
  if cardinality(regexp_split_to_array(btrim(total),'\s+'))>120 then return false; end if;
 end loop;
 for st in select x from jsonb_array_elements(p_result->'overview') x union all select x from jsonb_array_elements(p_result->'answers') answers_row cross join lateral jsonb_array_elements(answers_row->'statements') x loop
  if jsonb_typeof(st) is distinct from 'object' or (select count(*) from jsonb_object_keys(st))<>3
  or jsonb_typeof(st->'text') is distinct from 'string' or char_length(btrim(coalesce(st->>'text',''))) not between 1 and 1800
  or st->>'text' ~ U&'[\0001-\0008\000B\000C\000E-\001F]'
  or coalesce(st->>'nature','') not in ('published_fact','interpretation') or st->>'text' ~ U&'[\0001-\0008\000B\000C\000E-\001F]'
  or jsonb_typeof(st->'sourceIds') is distinct from 'array'
  or jsonb_array_length(st->'sourceIds') not between 1 and 5 or (select count(distinct x) from jsonb_array_elements(st->'sourceIds') x)<>jsonb_array_length(st->'sourceIds') then return false; end if;
  for ref in select x from jsonb_array_elements(st->'sourceIds') x loop
   if jsonb_typeof(ref) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'id'=ref#>>'{}') then return false; end if;
  end loop;
  if st->>'text' ~* '(conhecimento|competência) verificad[oa]|verificad[oa] por assessment' and not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'nature'='verified_assessment' and st->'sourceIds' ? (s->>'id')) then return false;end if;
 end loop;
 for st in select x from jsonb_array_elements(p_result->'clarifications') x loop
  if jsonb_typeof(st) is distinct from 'object' or (select count(*) from jsonb_object_keys(st))<>3
  or not(coalesce(st->>'questionId','')=any(ids)) or jsonb_typeof(st->'text') is distinct from 'string' or char_length(btrim(coalesce(st->>'text',''))) not between 1 and 600
  or st->>'text' ~ U&'[\0001-\0008\000B\000C\000E-\001F]'
  or jsonb_typeof(st->'sourceIds') is distinct from 'array' or jsonb_array_length(st->'sourceIds') not between 1 and 5
  or (select count(distinct x) from jsonb_array_elements(st->'sourceIds') x)<>jsonb_array_length(st->'sourceIds') then return false; end if;
  for ref in select x from jsonb_array_elements(st->'sourceIds') x loop if jsonb_typeof(ref) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(p_sources) s where s->>'id'=ref#>>'{}') then return false; end if; end loop;
 end loop;
 return true;
exception when others then return false;
end $$;

create or replace function private.valid_profile_synthesis_result(p_result jsonb,p_sources jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare issue jsonb; base jsonb;
begin
 if p_result->>'contractVersion'='profile-synthesis-1.0.0' then
  return jsonb_array_length(p_result->'overview')>=1 and private.valid_profile_synthesis_sections_core(p_result,p_sources);
 end if;
 if p_result->>'contractVersion' is distinct from 'profile-synthesis-1.1.0' or jsonb_typeof(p_result->'issues') is distinct from 'array' or jsonb_array_length(p_result->'issues')>9 or (select count(*) from jsonb_object_keys(p_result))<>5 then return false; end if;
 for issue in select x from jsonb_array_elements(p_result->'issues') x loop
  if jsonb_typeof(issue) is distinct from 'object' or (select count(*) from jsonb_object_keys(issue))<>2 or issue->>'section' not in ('overview','trajectory','activities','contexts','competencies','results','education','objective','clarifications') or issue->>'section' is null
  or issue->>'reason' is null or not private.valid_synthesis_diagnostic(jsonb_build_object('version','synthesis-diagnostic-1.0.0','stage','contract','reason',issue->>'reason','section',issue->>'section')) then return false; end if;
 end loop;
 if (select count(distinct x->>'section') from jsonb_array_elements(p_result->'issues') x)<>jsonb_array_length(p_result->'issues') then return false; end if;
 if jsonb_array_length(p_result->'overview')=0 and not exists(select 1 from jsonb_array_elements(p_result->'issues') x where x->>'section'='overview') then return false; end if;
 base:=(p_result-'issues')||jsonb_build_object('contractVersion','profile-synthesis-1.0.0');
 return private.valid_profile_synthesis_sections_core(base,p_sources);
exception when others then return false;
end $$;
revoke all on function private.valid_profile_synthesis_sections_core(jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.valid_profile_synthesis_result(jsonb,jsonb) from public,anon,authenticated;

create or replace function private.enqueue_profile_synthesis(p_profile_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; s jsonb; h text; job_id uuid;
begin
 select * into p from public.professional_profiles where id=p_profile_id and review_status='approved';
 if p.id is null or not exists(select 1 from public.people where id=p.person_id and organization_id=p.organization_id and operational_status not in ('deleting','merged')) then return null; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 insert into public.profile_synthesis_jobs(organization_id,person_id,profile_id,basis_hash,state,contract_version,prompt_version)
 values(p.organization_id,p.person_id,p.id,h,case when jsonb_array_length(s)=0 then 'insufficient' else 'queued' end,'profile-synthesis-1.1.0','profile-synthesis-prompt-1.1.0')
 on conflict(organization_id,profile_id,basis_hash,contract_version,prompt_version,model_config) do nothing returning id into job_id;
 if job_id is null then select j.id into job_id from public.profile_synthesis_jobs j where j.organization_id=p.organization_id and j.profile_id=p.id and j.basis_hash=h and j.contract_version='profile-synthesis-1.1.0' and j.prompt_version='profile-synthesis-prompt-1.1.0' and j.model_config='gpt-5.6-luna'; end if;
 update public.profile_synthesis_jobs set state=case when attempts<3 then 'queued' else 'failed' end,available_at=now() where id=job_id and state='obsolete';
 return job_id;
end $$;
create or replace function public.load_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; s jsonb; h text; j public.profile_synthesis_jobs; a public.profile_syntheses; prior public.profile_syntheses; prev jsonb:='null'::jsonb;
begin
 perform private.m72_require_profile_reader(p_organization_id);
 select * into p from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id and review_status='approved'
 and ((p_profile_id is null and superseded_at is null) or id=p_profile_id) order by profile_version desc limit 1;
 if p.id is null then raise exception 'SYNTHESIS_PROFILE_DENIED' using errcode='42501'; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 select * into j from public.profile_synthesis_jobs where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version in ('profile-synthesis-1.0.0','profile-synthesis-1.1.0') and prompt_version in ('profile-synthesis-prompt-1.0.0','profile-synthesis-prompt-1.1.0') and model_config='gpt-5.6-luna' order by case when contract_version='profile-synthesis-1.1.0' then 0 else 1 end limit 1;
 select * into a from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version in ('profile-synthesis-1.0.0','profile-synthesis-1.1.0') and prompt_version in ('profile-synthesis-prompt-1.0.0','profile-synthesis-prompt-1.1.0') and model_config='gpt-5.6-luna' order by case when contract_version='profile-synthesis-1.1.0' then 0 else 1 end limit 1;
 if a.id is null then
  select * into prior from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and contract_version in ('profile-synthesis-1.0.0','profile-synthesis-1.1.0') order by generated_at desc limit 1;
  if prior.id is not null then prev:=jsonb_build_object('analysisId',prior.id,'profileVersion',p.profile_version,'generatedAt',prior.generated_at,'result',prior.result,'sources',(select jsonb_agg(x-'text') from jsonb_array_elements(prior.sources) x)); end if;
 end if;
 return jsonb_build_object('organizationId',p.organization_id,'personId',p.person_id,'profileId',p.id,'profileVersion',p.profile_version,'state',case when a.id is not null then 'complete' when j.state='obsolete' then 'not_requested' else coalesce(j.state,'not_requested') end,
 'analysisId',a.id,'generatedAt',a.generated_at,'model',a.model,'result',a.result,'previous',prev,'sources',(select coalesce(jsonb_agg(x-'text'),'[]'::jsonb) from jsonb_array_elements(s) x),'errorCode',j.error_code,'basisHash',h,'jobId',j.id,'attempts',coalesce(j.attempts,0),'diagnostic',j.diagnostic,'canRetry',coalesce(private.synthesis_can_retry(j),false));
end $$;
create or replace function public.claim_profile_synthesis(p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.profile_synthesis_jobs; s jsonb; h text; p public.professional_profiles;
begin
 perform private.require_synthesis_worker(p_secret);
 update public.profile_synthesis_attempts a set completed_at=now(),error_code='REQUEST_INTERRUPTED',diagnostic=jsonb_build_object('version','synthesis-diagnostic-1.0.0','stage','persistence','reason','REQUEST_INTERRUPTED')
 from public.profile_synthesis_jobs expired where a.job_id=expired.id and a.attempt=expired.attempts and a.completed_at is null and expired.state='processing' and expired.lease_until<now();
 update public.profile_synthesis_jobs set state='failed',error_code='REQUEST_INTERRUPTED',diagnostic=jsonb_build_object('version','synthesis-diagnostic-1.0.0','stage','persistence','reason','REQUEST_INTERRUPTED'),lease=null,lease_until=null where state='processing' and lease_until<now() and attempts>=3;
 -- Bounded reconciliation: only publications after this feature's install, never historical backfill.
 perform private.enqueue_profile_synthesis(p2.id) from public.professional_profiles p2 where p2.review_status='approved' and p2.superseded_at is null
 and p2.approved_at>=(select installed_at from private.profile_synthesis_installation)
 and not exists(select 1 from public.profile_synthesis_jobs j2 where j2.profile_id=p2.id) order by p2.approved_at limit 10;
 select * into j from public.profile_synthesis_jobs q where attempts<3 and available_at<=now() and (state='queued' or (state='processing' and lease_until<now()))
 order by coalesce((select max(a.started_at) from public.profile_synthesis_attempts a where a.organization_id=q.organization_id),'-infinity'::timestamptz),available_at,created_at limit 1 for update skip locked;
 if j.id is null then return null; end if;
 if j.contract_version='profile-synthesis-1.0.0' then update public.profile_synthesis_jobs set state='obsolete',lease=null,lease_until=null where id=j.id; perform private.enqueue_profile_synthesis(j.profile_id); return null; end if;
 select * into p from public.professional_profiles where id=j.profile_id and organization_id=j.organization_id and person_id=j.person_id;
 if p.id is null then return null; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 if h<>j.basis_hash then update public.profile_synthesis_jobs set state='obsolete',lease=null,lease_until=null where id=j.id; perform private.enqueue_profile_synthesis(p.id); return null; end if;
 update public.profile_synthesis_jobs set state='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '3 minutes',error_code=null,diagnostic=null where id=j.id returning * into j;
 insert into public.profile_synthesis_attempts(organization_id,person_id,job_id,attempt) values(j.organization_id,j.person_id,j.id,j.attempts);
 return jsonb_build_object('id',j.id,'organizationId',j.organization_id,'personId',j.person_id,'profileId',j.profile_id,'lease',j.lease,'sources',s,'basisHash',j.basis_hash,'model',j.model_config);
end $$;

create or replace function private.complete_profile_synthesis_legacy(p_secret text,p_job_id uuid,p_lease uuid,p_result jsonb,p_model text,p_input_tokens integer,p_output_tokens integer,p_duration_ms integer,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare j public.profile_synthesis_jobs; s jsonb; h text;
begin
 perform private.require_synthesis_worker(p_secret);
 select * into j from public.profile_synthesis_jobs where id=p_job_id for update;
 if j.id is null or j.state<>'processing' or j.lease is distinct from p_lease or j.lease_until<now() then raise exception 'SYNTHESIS_LEASE_INVALID' using errcode='40001'; end if;
 if p_model is distinct from j.model_config then raise exception 'SYNTHESIS_MODEL_INVALID' using errcode='22023';end if;
 if p_error is not null and p_error not in ('PROVIDER_UNAVAILABLE','RATE_LIMITED','RESPONSE_INVALID','INPUT_TOO_LARGE','CONFIGURATION_UNAVAILABLE','REQUEST_INTERRUPTED') then raise exception 'SYNTHESIS_ERROR_INVALID'; end if;
 s:=private.profile_synthesis_sources(j.profile_id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 if p_error is null and h=j.basis_hash then
  if p_result->>'contractVersion' is distinct from j.contract_version or not private.valid_profile_synthesis_result(p_result,s) then raise exception 'SYNTHESIS_RESPONSE_INVALID' using errcode='22023'; end if;
  insert into public.profile_syntheses(organization_id,person_id,profile_id,basis_hash,contract_version,prompt_version,model_config,model,sources,result)
  values(j.organization_id,j.person_id,j.profile_id,j.basis_hash,j.contract_version,j.prompt_version,j.model_config,p_model,s,p_result) on conflict do nothing;
 end if;
 update public.profile_synthesis_attempts set completed_at=now(),duration_ms=greatest(0,p_duration_ms),input_tokens=greatest(0,p_input_tokens),output_tokens=greatest(0,p_output_tokens),model=left(p_model,160),error_code=p_error where job_id=j.id and attempt=j.attempts;
 update public.profile_synthesis_jobs set state=case when h<>j.basis_hash then 'obsolete' when p_error is null then 'complete' when p_error in ('PROVIDER_UNAVAILABLE','RATE_LIMITED') and j.attempts<3 then 'queued' else 'failed' end,
 available_at=now()+make_interval(secs=>30*j.attempts*j.attempts),error_code=p_error,lease=null,lease_until=null where id=j.id;
 if h<>j.basis_hash then perform private.enqueue_profile_synthesis(j.profile_id); end if;
end $$;
revoke all on function private.complete_profile_synthesis_legacy(text,uuid,uuid,jsonb,text,integer,integer,integer,text) from public,anon,authenticated;
