-- Additive activity analysis; original telemetry/answers/results remain immutable.
-- New consumer category is registered without selecting a commercial tariff here.
alter table private.prisma_token_rates drop constraint prisma_token_rates_function_name_check;
alter table private.prisma_token_rates add constraint prisma_token_rates_function_name_check
 check(function_name in ('position_assessment_items','parser_ia','profile_synthesis','assessment_activity_analysis'));

create table private.assessment_activity_analyses (
 id uuid primary key, organization_id uuid not null, attempt_id uuid not null,
 actor_id uuid references auth.users(id) on delete set null, history_request_id uuid not null references public.ai_requests(id),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'), method_version text not null default 'assessment-activity-analysis-1.0.0',
 model text not null default 'gpt-5.6-luna', status text not null check(status in ('running','succeeded','failed')),
 input_snapshot jsonb not null, facts jsonb, selection jsonb, error_category text,
 created_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
 unique(organization_id,id), foreign key(organization_id,attempt_id) references public.position_assessment_attempts(organization_id,id) on delete cascade,
 check((status='running' and completed_at is null) or (status<>'running' and completed_at is not null)),
 check((status='succeeded' and facts is not null and selection is not null) or (status<>'succeeded' and facts is null and selection is null))
);
create unique index assessment_activity_analyses_live on private.assessment_activity_analyses(organization_id,attempt_id,fingerprint,method_version) where status in ('running','succeeded');
create index assessment_activity_analyses_attempt on private.assessment_activity_analyses(organization_id,attempt_id,created_at desc);
alter table private.assessment_activity_analyses enable row level security;
revoke all on private.assessment_activity_analyses from public,anon,authenticated,service_role;

create function private.assessment_activity_snapshot(p_org uuid,p_attempt uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('attemptStatus',t.status,'questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.value->>'id','version',q.value->>'version') order by q.ordinality),'[]') from jsonb_array_elements(a.questions) with ordinality q(value,ordinality)),
 'events',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'question_id',e.question_id,'question_version',e.question_version,'kind',e.kind,'client_at_ms',e.client_at_ms,'received_at',e.received_at,'sequence',e.sequence,'method',e.method,'payload',e.payload) order by e.id),'[]') from public.position_assessment_events e where e.organization_id=p_org and e.attempt_id=t.id))
 from public.position_assessment_attempts t join public.position_assessments a on a.organization_id=t.organization_id and a.id=t.assessment_id
 where t.organization_id=p_org and t.id=p_attempt
$$;
revoke all on function private.assessment_activity_snapshot(uuid,uuid) from public,anon,authenticated,service_role;

create function private.assessment_activity_view(r private.assessment_activity_analyses,p_current_fingerprint text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'organizationId',r.organization_id,'attemptId',r.attempt_id,'attemptStatus',r.input_snapshot->>'attemptStatus','status',case when r.status='running' and exists(select 1 from private.prisma_token_reservations x where x.organization_id=r.organization_id and x.operation_id=r.id and x.function_name='assessment_activity_analysis' and x.status='released') then 'failed' when r.status='running' and r.created_at<clock_timestamp()-interval '2 minutes' then 'reconciliation_required' else r.status end,'inputFingerprint',r.fingerprint,'stale',r.fingerprint<>p_current_fingerprint,'methodVersion',r.method_version,'model',r.model,'createdAt',r.created_at,'completedAt',r.completed_at,'facts',r.facts,'selection',r.selection,'errorCategory',r.error_category)
$$;
revoke all on function private.assessment_activity_view(private.assessment_activity_analyses,text) from public,anon,authenticated,service_role;

create function public.assessment_activity_analysis_load(p_organization_id uuid,p_attempt_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; fp text; r private.assessment_activity_analyses; previous jsonb;
begin
 perform private.authorize_position_follow_up(p_organization_id);
 snapshot:=private.assessment_activity_snapshot(p_organization_id,p_attempt_id);
 if snapshot is null then raise exception 'PA_ACTIVITY_NOT_AVAILABLE' using errcode='42501';end if;
 fp:=encode(extensions.digest(snapshot::text,'sha256'),'hex');
 select * into r from private.assessment_activity_analyses where organization_id=p_organization_id and attempt_id=p_attempt_id and fingerprint=fp order by (status='running') desc,created_at desc limit 1;
 if not found then select * into r from private.assessment_activity_analyses where organization_id=p_organization_id and attempt_id=p_attempt_id order by (status='running') desc,created_at desc limit 1;end if;
 select private.assessment_activity_view(v,fp) into previous from private.assessment_activity_analyses v where organization_id=p_organization_id and attempt_id=p_attempt_id and status='succeeded' order by created_at desc limit 1;
 return jsonb_build_object('contract','assessment-activity-analysis-1.0.0','organizationId',p_organization_id,'attemptId',p_attempt_id,'inputFingerprint',fp,'analysis',case when r.id is not null then private.assessment_activity_view(r,fp) else null end,'previousAnalysis',previous);
end $$;
revoke all on function public.assessment_activity_analysis_load(uuid,uuid) from public,anon,service_role;
grant execute on function public.assessment_activity_analysis_load(uuid,uuid) to authenticated;

create function public.assessment_activity_analysis_start(p_organization_id uuid,p_attempt_id uuid,p_request_id uuid,p_token_quote_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; snapshot jsonb; fp text; r private.assessment_activity_analyses; hist jsonb; spent numeric;
begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 if p_request_id is null then raise exception 'PA_ACTIVITY_INVALID' using errcode='22023';end if;
 perform 1 from public.position_assessment_attempts where organization_id=p_organization_id and id=p_attempt_id for update;
 if not found then raise exception 'PA_ACTIVITY_NOT_AVAILABLE' using errcode='42501';end if;
 snapshot:=private.assessment_activity_snapshot(p_organization_id,p_attempt_id);fp:=encode(extensions.digest(snapshot::text,'sha256'),'hex');
 select * into r from private.assessment_activity_analyses where id=p_request_id;
 if found then
  if r.organization_id<>p_organization_id or r.attempt_id<>p_attempt_id then raise exception 'PA_ACTIVITY_NOT_AVAILABLE' using errcode='42501';end if;
  return jsonb_build_object('acquired',false,'analysis',private.assessment_activity_view(r,fp));
 end if;
 select * into r from private.assessment_activity_analyses where organization_id=p_organization_id and attempt_id=p_attempt_id and fingerprint=fp and status in ('running','succeeded') order by created_at desc limit 1;
 if found then
  -- Explicit admin release after an uncertain outcome permits a later explicit retry.
  if r.status='running' and exists(select 1 from private.prisma_token_reservations where organization_id=p_organization_id and function_name='assessment_activity_analysis' and operation_id=r.id and status='released') then
   perform private.record_ai_history_v1('complete_attempt',jsonb_build_object('requestId',r.history_request_id,'organizationId',p_organization_id,'attemptId',r.id,'result','failure','durationMs',least(round(extract(epoch from clock_timestamp()-r.created_at)*1000),2147483647)::integer,'inputTokens',null,'outputTokens',null,'estimatedCostUsd',null,'observedCostUsd',null,'costEvidenceHash',null,'errorCategory','ADMIN_RELEASED'));
   perform private.record_ai_history_v1('complete_request',jsonb_build_object('requestId',r.history_request_id,'organizationId',p_organization_id,'status','failed','errorCategory','ADMIN_RELEASED'));
   update private.assessment_activity_analyses set status='failed',completed_at=clock_timestamp(),error_category='ADMIN_RELEASED' where id=r.id;
  else return jsonb_build_object('acquired',false,'analysis',private.assessment_activity_view(r,fp));end if;
 end if;
 if snapshot->>'attemptStatus' not in ('started','submitted') or jsonb_array_length(snapshot->'events')=0 then raise exception 'PA_ACTIVITY_NO_EVENTS' using errcode='22023';end if;
 -- Existing account lock serializes consumer starts before budget/reservation checks.
 perform private.prisma_token_ensure(p_organization_id);
 if exists(select 1 from private.assessment_activity_analyses where organization_id=p_organization_id and attempt_id=p_attempt_id and status='running') then raise exception 'PA_ACTIVITY_IN_PROGRESS' using errcode='40001';end if;
 if (select count(*) from private.assessment_activity_analyses where organization_id=p_organization_id and created_at>clock_timestamp()-interval '1 day')>=100 then raise exception 'PA_ACTIVITY_LIMIT' using errcode='22023';end if;
 select coalesce(sum(coalesce(estimated_cost_usd,0.25)),0) into spent from public.ai_usage_events e join public.ai_requests h on h.id=e.request_id and h.organization_id=e.organization_id where e.organization_id=p_organization_id and h.function_name='assessment_activity_analysis' and e.created_at>=date_trunc('month',now());
 if spent+0.25>10 then raise exception 'PA_ACTIVITY_BUDGET' using errcode='22023';end if;
 perform private.prisma_token_reserve(p_organization_id,'assessment_activity_analysis',p_request_id,p_token_quote_id,1);
 hist:=private.record_ai_history_v1('open_request',jsonb_build_object('scope','organization','organizationId',p_organization_id,'functionName','assessment_activity_analysis','operationId',p_request_id,'actorId',actor,'sourceVersion','assessment-activity-analysis-1.0.0','inputFingerprint',fp,'idempotencyKey',encode(extensions.digest(p_request_id::text,'sha256'),'hex')));
 perform private.record_ai_history_v1('begin_attempt',jsonb_build_object('requestId',hist#>>'{request,id}','organizationId',p_organization_id,'attemptId',p_request_id,'stage','activity_analysis','provider','openai-responses','model','gpt-5.6-luna','methodVersion','assessment-activity-analysis-1.0.0','usageKind','external','pricingVersion','openai-standard-2026-10-09'));
 insert into private.assessment_activity_analyses(id,organization_id,attempt_id,actor_id,history_request_id,fingerprint,status,input_snapshot) values(p_request_id,p_organization_id,p_attempt_id,actor,(hist#>>'{request,id}')::uuid,fp,'running',snapshot) returning * into r;
 return jsonb_build_object('acquired',true,'analysis',private.assessment_activity_view(r,fp),'snapshot',snapshot);
end $$;
revoke all on function public.assessment_activity_analysis_start(uuid,uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.assessment_activity_analysis_start(uuid,uuid,uuid,uuid) to authenticated;

create function public.assessment_activity_analysis_finish(p_organization_id uuid,p_request_id uuid,p_success boolean,p_facts jsonb,p_selection jsonb,p_usage jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.assessment_activity_analyses; fp text; reason text;
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'PA_ACTIVITY_WORKER_DENIED' using errcode='42501';end if;
 select * into r from private.assessment_activity_analyses where organization_id=p_organization_id and id=p_request_id for update;
 if not found then raise exception 'PA_ACTIVITY_NOT_AVAILABLE' using errcode='42501';end if;
 if r.status<>'running' then
  if (r.status='succeeded') is distinct from p_success then raise exception 'PA_ACTIVITY_COMPLETION_CONFLICT' using errcode='40001';end if;
  return private.assessment_activity_view(r,r.fingerprint);
 end if;
 if p_success is null or jsonb_typeof(p_usage) is distinct from 'object' then raise exception 'PA_ACTIVITY_INVALID' using errcode='22023';end if;
 if p_success and (p_facts->>'contract' is distinct from 'assessment-activity-analysis-1.0.0' or jsonb_typeof(p_facts->'patterns') is distinct from 'array' or jsonb_typeof(p_selection->'patternIds') is distinct from 'array' or jsonb_typeof(p_selection->'contextIds') is distinct from 'array' or (p_facts->>'questionCount')::integer<>jsonb_array_length(r.input_snapshot->'questions')) then raise exception 'PA_ACTIVITY_RESULT_INVALID' using errcode='22023';end if;
 if p_success and (exists(select 1 from jsonb_array_elements_text(p_selection->'patternIds') id where not exists(select 1 from jsonb_array_elements(p_facts->'patterns') pat where pat->>'id'=id)) or exists(select 1 from jsonb_array_elements_text(p_selection->'contextIds') id where id not in ('focus','mouse','capture','missing','navigation'))) then raise exception 'PA_ACTIVITY_RESULT_INVALID' using errcode='22023';end if;
 reason:=case when p_success then null else 'ACTIVITY_ANALYSIS_FAILED' end;
 perform private.record_ai_history_v1('complete_attempt',jsonb_build_object('requestId',r.history_request_id,'organizationId',p_organization_id,'attemptId',r.id,'result',case when p_success then 'success' else 'failure' end,'durationMs',p_usage->'durationMs','inputTokens',p_usage->'inputTokens','outputTokens',p_usage->'outputTokens','estimatedCostUsd',p_usage->'estimatedCostUsd','observedCostUsd',null,'costEvidenceHash',null,'errorCategory',reason));
 perform private.record_ai_history_v1('complete_request',jsonb_build_object('requestId',r.history_request_id,'organizationId',p_organization_id,'status',case when p_success then 'succeeded' else 'failed' end,'errorCategory',reason));
 perform private.prisma_token_settle(p_organization_id,'assessment_activity_analysis',r.id,p_success);
 update private.assessment_activity_analyses set status=case when p_success then 'succeeded' else 'failed' end,facts=case when p_success then p_facts else null end,selection=case when p_success then p_selection else null end,completed_at=clock_timestamp(),error_category=reason where id=r.id returning * into r;
 fp:=encode(extensions.digest(private.assessment_activity_snapshot(p_organization_id,r.attempt_id)::text,'sha256'),'hex');
 return private.assessment_activity_view(r,fp);
end $$;
revoke all on function public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.assessment_activity_analysis_finish(uuid,uuid,boolean,jsonb,jsonb,jsonb) to service_role;
