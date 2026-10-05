-- Incremental, preserves result/prompt contracts and existing history. No real-Person mutations.
alter table public.profile_synthesis_jobs add column diagnostic jsonb;
alter table public.profile_synthesis_attempts add column diagnostic jsonb;
create function private.valid_synthesis_diagnostic(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if d is null then return true; end if;
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>1000 or d->>'version' is distinct from 'synthesis-diagnostic-1.0.0'
 or coalesce(d->>'stage','') not in ('input','provider','response','contract','persistence','read','source','render')
 or coalesce(d->>'reason','') not in ('SOURCE_INVALID','INPUT_TOO_LARGE','RATE_LIMITED','PROVIDER_UNAVAILABLE','CONFIGURATION_UNAVAILABLE','REQUEST_INTERRUPTED','BODY_MISSING','BODY_TOO_LARGE','JSON_INVALID','OUTPUT_INCOMPLETE','MODEL_MISMATCH','USAGE_INVALID','REFUSAL','OUTPUT_MISSING','STRUCTURE_INVALID','TEXT_INVALID','REFERENCES_INVALID','UNSUPPORTED_VERIFICATION','WORD_LIMIT','ANSWER_INVALID','CLARIFICATION_INVALID','DATABASE_CONTRACT','DATABASE_UNAVAILABLE','LEASE_INVALID','READ_UNAVAILABLE','READ_INVALID','SOURCE_UNAVAILABLE','RENDER_FAILED','WAIT_EXCEEDED','SESSION_EXPIRED','ACCESS_DENIED')
 or exists(select 1 from jsonb_object_keys(d) k where k not in ('version','stage','reason','section','item','observed','limit','httpStatus')) then return false; end if;
 if d ? 'section' and (jsonb_typeof(d->'section') is distinct from 'string' or d->>'section' not in ('overview','trajectory','activities','contexts','competencies','results','education','objective','clarifications')) then return false; end if;
 if exists(select 1 from jsonb_each(d) e where e.key in ('item','observed','limit','httpStatus') and (jsonb_typeof(e.value) is distinct from 'number' or e.value::text !~ '^[0-9]{1,7}$')) then return false; end if;
 if d ? 'httpStatus' and (d->>'httpStatus')::integer not between 100 and 599 then return false; end if;
 if d ? 'item' and (d->>'item')::integer>240 then return false; end if;
 return true;
exception when others then return false;
end $$;
revoke all on function private.valid_synthesis_diagnostic(jsonb) from public,anon,authenticated;
alter table public.profile_synthesis_jobs add constraint synthesis_job_diagnostic_valid check(private.valid_synthesis_diagnostic(diagnostic));
alter table public.profile_synthesis_attempts add constraint synthesis_attempt_diagnostic_valid check(private.valid_synthesis_diagnostic(diagnostic));
create function private.synthesis_can_retry(j public.profile_synthesis_jobs) returns boolean language sql stable set search_path='' as $$
 select j.state='failed' and j.attempts<3 and j.available_at<=now()
 and j.error_code in ('RESPONSE_INVALID','PROVIDER_UNAVAILABLE','RATE_LIMITED','REQUEST_INTERRUPTED')
 and coalesce(j.diagnostic->>'reason','') not in ('SOURCE_INVALID','MODEL_MISMATCH','REFUSAL','DATABASE_CONTRACT','USAGE_INVALID','UNSUPPORTED_VERIFICATION');
$$;
revoke all on function private.synthesis_can_retry(public.profile_synthesis_jobs) from public,anon,authenticated;
-- Keep the reviewed v1 transaction implementation private; the public wrapper is backwards-compatible with the old worker's arguments.
alter function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text) rename to complete_profile_synthesis_legacy;
alter function public.complete_profile_synthesis_legacy(text,uuid,uuid,jsonb,text,integer,integer,integer,text) set schema private;
revoke all on function private.complete_profile_synthesis_legacy(text,uuid,uuid,jsonb,text,integer,integer,integer,text) from public,anon,authenticated;
create function public.complete_profile_synthesis(p_secret text,p_job_id uuid,p_lease uuid,p_result jsonb,p_model text,p_input_tokens integer,p_output_tokens integer,p_duration_ms integer,p_error text default null,p_diagnostic jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.profile_synthesis_jobs; d jsonb:=p_diagnostic; failure text:=p_error;
begin
 perform private.require_synthesis_worker(p_secret);
 if not private.valid_synthesis_diagnostic(d) or (d is not null and p_error is null) then raise exception 'SYNTHESIS_DIAGNOSTIC_INVALID' using errcode='22023'; end if;
 if p_input_tokens is null or p_input_tokens not between 0 and 50000 or p_output_tokens is null or p_output_tokens not between 0 and 6000 or p_duration_ms is null or p_duration_ms not between 0 and 3600000 then raise exception 'SYNTHESIS_METRICS_INVALID' using errcode='22023'; end if;
 begin
  perform private.complete_profile_synthesis_legacy(p_secret,p_job_id,p_lease,p_result,p_model,p_input_tokens,p_output_tokens,p_duration_ms,p_error);
 exception when sqlstate '22023' then
  if sqlerrm<>'SYNTHESIS_RESPONSE_INVALID' then raise; end if;
  failure:='RESPONSE_INVALID'; d:=jsonb_build_object('version','synthesis-diagnostic-1.0.0','stage','persistence','reason','DATABASE_CONTRACT');
  perform private.complete_profile_synthesis_legacy(p_secret,p_job_id,p_lease,null,p_model,p_input_tokens,p_output_tokens,p_duration_ms,failure);
 end;
 update public.profile_synthesis_attempts set diagnostic=d where job_id=p_job_id and attempt=(select attempts from public.profile_synthesis_jobs where id=p_job_id);
 update public.profile_synthesis_jobs set diagnostic=d where id=p_job_id returning * into j;
 return jsonb_build_object('state',j.state,'errorCode',failure,'diagnostic',d);
end $$;
revoke all on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) from public;
grant execute on function public.complete_profile_synthesis(text,uuid,uuid,jsonb,text,integer,integer,integer,text,jsonb) to anon,authenticated;
create or replace function public.load_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.professional_profiles; s jsonb; h text; j public.profile_synthesis_jobs; a public.profile_syntheses; prior public.profile_syntheses; prev jsonb:='null'::jsonb;
begin
 perform private.m72_require_profile_reader(p_organization_id);
 select * into p from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id and review_status='approved'
 and ((p_profile_id is null and superseded_at is null) or id=p_profile_id) order by profile_version desc limit 1;
 if p.id is null then raise exception 'SYNTHESIS_PROFILE_DENIED' using errcode='42501'; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 select * into j from public.profile_synthesis_jobs where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version='profile-synthesis-1.0.0' and prompt_version='profile-synthesis-prompt-1.0.0' and model_config='gpt-5.6-luna';
 select * into a from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and basis_hash=h and contract_version='profile-synthesis-1.0.0' and prompt_version='profile-synthesis-prompt-1.0.0' and model_config='gpt-5.6-luna';
 if a.id is null then
  select * into prior from public.profile_syntheses where organization_id=p_organization_id and profile_id=p.id and contract_version='profile-synthesis-1.0.0' order by generated_at desc limit 1;
  if prior.id is not null then prev:=jsonb_build_object('analysisId',prior.id,'profileVersion',p.profile_version,'generatedAt',prior.generated_at,'result',prior.result,'sources',(select jsonb_agg(x-'text') from jsonb_array_elements(prior.sources) x)); end if;
 end if;
 return jsonb_build_object('organizationId',p.organization_id,'personId',p.person_id,'profileId',p.id,'profileVersion',p.profile_version,'state',case when a.id is not null then 'complete' when j.state='obsolete' then 'not_requested' else coalesce(j.state,'not_requested') end,
 'analysisId',a.id,'generatedAt',a.generated_at,'model',a.model,'result',a.result,'previous',prev,'sources',(select coalesce(jsonb_agg(x-'text'),'[]'::jsonb) from jsonb_array_elements(s) x),'errorCode',j.error_code,'basisHash',h,'jobId',j.id,'attempts',coalesce(j.attempts,0),'diagnostic',j.diagnostic,'canRetry',coalesce(private.synthesis_can_retry(j),false));
end $$;
revoke all on function public.load_profile_synthesis(uuid,uuid,uuid) from public,anon;
grant execute on function public.load_profile_synthesis(uuid,uuid,uuid) to authenticated;

create function public.retry_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; j public.profile_synthesis_jobs;
begin
 -- Reader authority and immutable approved version/base are resolved on the server. Never reset attempts.
 v:=public.load_profile_synthesis(p_organization_id,p_person_id,p_profile_id);
 select * into j from public.profile_synthesis_jobs where id=(v->>'jobId')::uuid and organization_id=p_organization_id and person_id=p_person_id and profile_id=(v->>'profileId')::uuid and basis_hash=v->>'basisHash' for update;
 if j.id is not null and private.synthesis_can_retry(j) then
  update public.profile_synthesis_jobs set state='queued',available_at=now() where id=j.id;
 end if;
 return public.load_profile_synthesis(p_organization_id,p_person_id,p_profile_id);
end $$;
revoke all on function public.retry_profile_synthesis(uuid,uuid,uuid) from public,anon;
grant execute on function public.retry_profile_synthesis(uuid,uuid,uuid) to authenticated;

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
 select * into p from public.professional_profiles where id=j.profile_id and organization_id=j.organization_id and person_id=j.person_id;
 if p.id is null then return null; end if;
 s:=private.profile_synthesis_sources(p.id); h:=encode(extensions.digest(s::text,'sha256'),'hex');
 if h<>j.basis_hash then update public.profile_synthesis_jobs set state='obsolete',lease=null,lease_until=null where id=j.id; perform private.enqueue_profile_synthesis(p.id); return null; end if;
 update public.profile_synthesis_jobs set state='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '3 minutes',error_code=null,diagnostic=null where id=j.id returning * into j;
 insert into public.profile_synthesis_attempts(organization_id,person_id,job_id,attempt) values(j.organization_id,j.person_id,j.id,j.attempts);
 return jsonb_build_object('id',j.id,'organizationId',j.organization_id,'personId',j.person_id,'profileId',j.profile_id,'lease',j.lease,'sources',s,'basisHash',j.basis_hash,'model',j.model_config);
end $$;
