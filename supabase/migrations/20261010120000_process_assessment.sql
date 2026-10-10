-- Additive shared process assessment v2. Existing v1 snapshots and applications are untouched.
alter table public.position_evaluation_processes add column is_current boolean not null default true,
 add column sequence integer not null default 1 check(sequence>0), add column start_request_id uuid;
alter table public.position_evaluation_processes drop constraint position_evaluation_processes_organization_id_vacancy_id_key;
create unique index position_evaluation_processes_current_idx on public.position_evaluation_processes(organization_id,vacancy_id) where is_current;
create unique index position_evaluation_processes_sequence_idx on public.position_evaluation_processes(organization_id,vacancy_id,sequence);
create unique index position_evaluation_processes_start_idx on public.position_evaluation_processes(organization_id,start_request_id) where start_request_id is not null;
alter table public.position_assessments alter column person_id drop not null,
 add column process_id uuid,
 drop constraint position_assessments_contract_version_check,
 add constraint position_assessments_shape_check check(
 (contract_version='position-assessment-1.0.0' and person_id is not null and process_id is null)
 or (contract_version='position-assessment-2.0.0' and person_id is null and process_id is not null)),
 add foreign key(organization_id,process_id) references public.position_evaluation_processes(organization_id,id) on delete cascade;
create unique index position_assessments_process_idx on public.position_assessments(organization_id,process_id) where process_id is not null;
alter table public.position_assessment_attempts add column person_id uuid,
 add foreign key(organization_id,person_id) references public.people(organization_id,id) on delete cascade;
create unique index position_assessment_attempts_person_idx on public.position_assessment_attempts(assessment_id,person_id) where person_id is not null;
create table public.position_assessment_batches (
 organization_id uuid not null, request_id uuid not null, assessment_id uuid not null,
 fingerprint text not null, actor_id uuid not null references auth.users(id), receipts jsonb not null,
 created_at timestamptz not null default now(), primary key(organization_id,request_id),
 foreign key(organization_id,assessment_id) references public.position_assessments(organization_id,id) on delete cascade
);
alter table public.position_assessment_batches enable row level security;
revoke all on public.position_assessment_batches from public,anon,authenticated,service_role;

-- An explicit Person erasure removes their receipts as well as their applications.
-- The anonymous common test belongs to the process and survives erasure of one participant.
create function private.pa_erase_batch_recipient() returns trigger language plpgsql security definer set search_path='' as $$ begin
 update public.position_assessment_batches b set receipts=(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(b.receipts) x where x->>'personId'<>old.id::text)
 where b.organization_id=old.organization_id and exists(select 1 from jsonb_array_elements(b.receipts) x where x->>'personId'=old.id::text);
 return old;
end $$;
revoke all on function private.pa_erase_batch_recipient() from public,anon,authenticated,service_role;
create trigger pa_erase_batch_recipient before delete on public.people for each row execute function private.pa_erase_batch_recipient();


create or replace function private.get_position_follow_up_cycle(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid,p_process_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proc public.position_evaluation_processes; entries jsonb; operators jsonb; hist jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_vacancy_id is null then
   if p_person_id is null then raise exception 'FOLLOW_UP_SCOPE_REQUIRED' using errcode='22023'; end if;
   return jsonb_build_object('contract','position-follow-up-1.0.0','links',(select coalesce(jsonb_agg(jsonb_build_object(
     'vacancyId',v.id,'title',v.title,'stage',e.stage,'processName',p.name,'processStatus',p.status,'processId',p.id,'isCurrent',p.is_current) order by p.created_at desc),'[]')
     from public.position_evaluation_entries e join public.position_evaluation_processes p on p.organization_id=e.organization_id and p.id=e.process_id
       join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id
     where e.organization_id=p_organization_id and e.person_id=p_person_id));
 end if;
 if not exists(select 1 from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id) then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and ((p_process_id is null and is_current) or id=p_process_id);
 select coalesce(jsonb_agg(jsonb_build_object('id',u.auth_user_id,'name',u.full_name) order by u.full_name),'[]') into operators
 from public.organization_memberships m join public.platform_users u on u.auth_user_id=m.user_id
 where m.organization_id=p_organization_id and m.role in ('owner','admin','recruiter') and u.status='active';
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'personId',e.person_id,'fullName',p.full_name,'title',profile.profile_data->>'professionalTitle',
   'city',nullif(btrim(pd.city),''),
   'state',nullif(btrim(pd.state_code),''),
   'age',case when pd.birth_date<=current_date then extract(year from age(current_date,pd.birth_date))::integer else null end,
   'stage',e.stage,'revision',e.revision,'details',e.details,'profileId',profile.id,'profileVersion',profile.profile_version,
   'sourceProfileId',e.source_profile_id,'sourcePositionId',e.source_position_id,
   'score',ev.evaluation_data#>'{stableMatch,score,score}',
   'scoreState',case when st.lease is not null and st.lease_until>now() then 'updating' when ev.id is null then 'unavailable'
     when st.dependencies is distinct from st.attempted_dependencies then 'update_failed' else 'saved' end,
   'scoreProfileId',ev.evaluation_data#>>'{stableMatch,score,profileVersion}',
   'scorePositionId',ev.evaluation_data#>>'{stableMatch,score,positionVersion}',
   'evaluationId',ev.id,'match',ev.evaluation_data->'stableMatch') order by p.full_name),'[]') into entries
 from public.position_evaluation_entries e join public.people p on p.organization_id=e.organization_id and p.id=e.person_id
 left join public.person_private_data pd on pd.organization_id=p.organization_id and pd.person_id=p.id
 left join lateral(select f.id,f.profile_version,f.profile_data from public.professional_profiles f
   where f.organization_id=e.organization_id and f.person_id=e.person_id and f.review_status='approved' and f.superseded_at is null
   order by f.profile_version desc limit 1) profile on true
 left join public.matching_score_states st on st.organization_id=e.organization_id and st.person_id=e.person_id and st.vacancy_id=p_vacancy_id
 left join public.match_evaluations ev on ev.organization_id=e.organization_id and ev.id=st.evaluation_id and ev.person_id=e.person_id and ev.vacancy_id=p_vacancy_id
 where e.organization_id=p_organization_id and e.process_id=proc.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'entryId',h.entry_id,'action',h.action,'actor',h.actor_name,'at',h.created_at,'before',h.before_data,'after',h.after_data) order by h.created_at desc,h.id),'[]') into hist
 from public.position_evaluation_history h where h.organization_id=p_organization_id and h.process_id=proc.id;
 return jsonb_build_object('contract','position-follow-up-1.0.0','process',case when proc.id is null then null else jsonb_build_object('id',proc.id,'name',proc.name,'status',proc.status,'revision',proc.revision,'isCurrent',proc.is_current,'sequence',proc.sequence) end,
 'processes',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'revision',revision,'isCurrent',is_current,'sequence',sequence) order by sequence desc),'[]') from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id),
 'entries',entries,'operators',operators,'history',hist);
end $$;

create or replace function private.mutate_position_follow_up_cycle_core(p_organization_id uuid,p_vacancy_id uuid,p_action text,p_person_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare actor uuid; actor_name text; proc public.position_evaluation_processes; entry public.position_evaluation_entries; old_data jsonb; next_stage text; d jsonb; profile uuid; position uuid; k text; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select full_name into actor_name from public.platform_users where auth_user_id=actor;
 if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>24000 then raise exception 'FOLLOW_UP_INVALID_PAYLOAD' using errcode='22023'; end if;
 if p_action not in ('add','stage','details','schedule','cancel_interview','decision','close','reopen','close_process','reopen_process') then raise exception 'FOLLOW_UP_INVALID_ACTION' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_payload) loop
   if not ((p_action='add' and k in ('profileId','positionId')) or (p_action='stage' and k='stage') or (p_action='details' and k in ('nextAction','assignee','dueDate','notes'))
     or (p_action='schedule' and k in ('at','timezone','participants')) or (p_action='decision' and k in ('outcome','rationale')))
   then raise exception 'FOLLOW_UP_UNEXPECTED_FIELD' using errcode='22023'; end if;
   if jsonb_typeof(p_payload->k) is distinct from 'string' and not (p_action='details' and k in ('assignee','dueDate') and jsonb_typeof(p_payload->k)='null')
   then raise exception 'FOLLOW_UP_INVALID_FIELD_TYPE' using errcode='22023'; end if;
 end loop;
 -- Per-position lock serializes add/close with entry writes, including first creation.
 select current_version_id into position from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id and status<>'cancelled' for update;
 if not found or position is null then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 if p_action='add' then
   select id into profile from public.professional_profiles where organization_id=p_organization_id and person_id=p_person_id and review_status='approved' and superseded_at is null order by profile_version desc limit 1;
   if profile is null or not exists(select 1 from public.people where organization_id=p_organization_id and id=p_person_id and operational_status='active') then raise exception 'FOLLOW_UP_PUBLISHED_PERSON_REQUIRED' using errcode='22023'; end if;
   if p_payload->>'profileId' is distinct from profile::text or p_payload->>'positionId' is distinct from position::text then raise exception 'FOLLOW_UP_SOURCE_CHANGED' using errcode='40001'; end if;
   insert into public.position_evaluation_processes(organization_id,vacancy_id) select p_organization_id,p_vacancy_id where not exists(select 1 from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and is_current) on conflict do nothing;
 end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and is_current for update;
 if proc.id is null then raise exception 'FOLLOW_UP_PROCESS_REQUIRED' using errcode='22023'; end if;
 if p_action in ('close_process','reopen_process') then
   if p_expected_revision is distinct from proc.revision then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
   if (p_action='close_process' and proc.status<>'active') or (p_action='reopen_process' and proc.status<>'closed') then raise exception 'FOLLOW_UP_INVALID_STATE' using errcode='22023'; end if;
   old_data:=jsonb_build_object('status',proc.status);
   update public.position_evaluation_processes set status=case when p_action='close_process' then 'closed' else 'active' end,revision=revision+1 where id=proc.id;
   insert into public.position_evaluation_history(organization_id,process_id,actor_id,actor_name,action,before_data,after_data)
    values(p_organization_id,proc.id,actor,actor_name,p_action,old_data,jsonb_build_object('status',case when p_action='close_process' then 'closed' else 'active' end));
   -- Closing the process preserves individual stages and decisions; reopening does too.
   return public.get_position_follow_up(p_organization_id,p_vacancy_id);
 end if;
 if proc.status<>'active' then raise exception 'FOLLOW_UP_PROCESS_CLOSED' using errcode='22023'; end if;
 select * into entry from public.position_evaluation_entries where organization_id=p_organization_id and process_id=proc.id and person_id=p_person_id for update;
 if p_action='add' then
   if entry.id is not null then return public.get_position_follow_up(p_organization_id,p_vacancy_id); end if;
   insert into public.position_evaluation_entries(organization_id,process_id,person_id,source_profile_id,source_position_id)
    values(p_organization_id,proc.id,p_person_id,profile,position) returning * into entry;
   old_data:=null;
 else
   if entry.id is null then raise exception 'FOLLOW_UP_ENTRY_REQUIRED' using errcode='22023'; end if;
   if p_expected_revision is distinct from entry.revision then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
   if entry.stage='closed' and p_action<>'reopen' then raise exception 'FOLLOW_UP_ENTRY_CLOSED' using errcode='22023'; end if;
   old_data:=jsonb_build_object('stage',entry.stage,'details',entry.details,'revision',entry.revision);
   d:=entry.details; next_stage:=entry.stage;
   case p_action
    when 'stage' then
     next_stage:=p_payload->>'stage';
     if next_stage is null or next_stage not in ('awaiting_evaluation','evaluating','awaiting_interview','awaiting_decision') then raise exception 'FOLLOW_UP_INVALID_STAGE' using errcode='22023'; end if;
     -- Existing interview/decision facts remain visible even when revisiting an earlier phase.
    when 'details' then
     if length(coalesce(p_payload->>'nextAction',''))>1000 or length(coalesce(p_payload->>'notes',''))>12000 then raise exception 'FOLLOW_UP_TEXT_TOO_LONG' using errcode='22023'; end if;
     if nullif(p_payload->>'assignee','') is not null and not exists(select 1 from public.organization_memberships m join public.platform_users u on u.auth_user_id=m.user_id
       where m.organization_id=p_organization_id and m.user_id=(p_payload->>'assignee')::uuid and m.role in ('owner','admin','recruiter') and u.status='active') then raise exception 'FOLLOW_UP_INVALID_ASSIGNEE' using errcode='22023'; end if;
     if nullif(p_payload->>'dueDate','') is not null and ((p_payload->>'dueDate')!~'^\d{4}-\d{2}-\d{2}$' or (p_payload->>'dueDate')::date is null) then raise exception 'FOLLOW_UP_INVALID_DATE' using errcode='22023'; end if;
     d:=d||p_payload;
    when 'schedule' then
     if nullif(btrim(p_payload->>'participants'),'') is null or length(p_payload->>'participants')>2000 or nullif(p_payload->>'at','') is null
       or (p_payload->>'at')!~'(Z|[+-]\d{2}:\d{2})$' or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_payload->>'timezone') then raise exception 'FOLLOW_UP_INTERVIEW_REQUIRED' using errcode='22023'; end if;
     perform (p_payload->>'at')::timestamptz;
     d:=d||jsonb_build_object('interview',p_payload||jsonb_build_object('status','scheduled')); next_stage:='interview_scheduled';
    when 'cancel_interview' then
     if d#>>'{interview,status}' is distinct from 'scheduled' then raise exception 'FOLLOW_UP_NO_INTERVIEW' using errcode='22023'; end if;
     d:=jsonb_set(d,'{interview,status}','"cancelled"'); if entry.stage='interview_scheduled' then next_stage:='awaiting_interview'; end if;
    when 'decision' then
     if (p_payload->>'outcome') is null or (p_payload->>'outcome') not in ('proceed','do_not_proceed') or nullif(btrim(p_payload->>'rationale'),'') is null or length(p_payload->>'rationale')>8000 then raise exception 'FOLLOW_UP_DECISION_REQUIRED' using errcode='22023'; end if;
     d:=d||jsonb_build_object('decision',p_payload); next_stage:='decision_recorded';
    when 'close' then next_stage:='closed';
    when 'reopen' then
     if entry.stage<>'closed' then raise exception 'FOLLOW_UP_INVALID_STATE' using errcode='22023'; end if; next_stage:=entry.previous_stage;
    else raise exception 'FOLLOW_UP_INVALID_ACTION' using errcode='22023';
   end case;
   update public.position_evaluation_entries set stage=next_stage,previous_stage=case when p_action='close' then entry.stage else previous_stage end,
    details=d,revision=revision+1 where id=entry.id returning * into entry;
 end if;
 update public.position_evaluation_processes set revision=revision+1 where id=proc.id;
 insert into public.position_evaluation_history(organization_id,process_id,entry_id,actor_id,actor_name,action,before_data,after_data)
 values(p_organization_id,proc.id,entry.id,actor,actor_name,p_action,old_data,jsonb_build_object('stage',entry.stage,'details',entry.details,'revision',entry.revision));
 return public.get_position_follow_up(p_organization_id,p_vacancy_id);
end $$;

create or replace function public.position_assessment_workspace(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare result jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,auth.uid(),'position_assessment_consulted','success',jsonb_build_object('personId',p_person_id,'vacancyId',p_vacancy_id));
 if not exists(select 1 from public.position_evaluation_entries e join public.position_evaluation_processes p on p.id=e.process_id and p.organization_id=e.organization_id
 where e.organization_id=p_organization_id and e.person_id=p_person_id and p.vacancy_id=p_vacancy_id) then raise exception 'PA_CONTEXT_INVALID' using errcode='42501'; end if;
 select jsonb_build_object('contract','position-assessment-1.0.0','organizationId',p_organization_id,'personId',p.id,'personName',p.full_name,
 'vacancyId',v.id,'positionVersionId',v.current_version_id,'positionTitle',v.title,'email',pd.email,
 'requirements',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'competencyKey',coalesce(r.concept_id::text,r.competency_id::text,r.label)) order by r.created_at),'[]') from public.vacancy_requirements r where r.organization_id=p_organization_id and r.vacancy_version_id=v.current_version_id),
 'assessments',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('generationPending',exists(select 1 from public.position_assessment_generation g where g.assessment_id=a.id and g.status='reserved')) order by a.created_at desc),'[]') from public.position_assessments a where a.organization_id=p_organization_id and (a.person_id=p.id or (a.process_id is not null and exists(select 1 from public.position_assessment_attempts x where x.assessment_id=a.id and x.person_id=p.id))) and a.vacancy_id=v.id),
 'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'assessmentId',a.id,'status',t.status,'expiresAt',t.expires_at,'startedAt',t.started_at,'submittedAt',t.submitted_at,'answers',t.answers,'result',t.result,
 'deliveries',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'state',d.state,'recipient',d.recipient,'subject',d.subject,'message',d.message,'providerEmailId',d.provider_email_id,'errorCategory',d.error_category,'requestedAt',d.created_at)),'[]') from public.position_assessment_deliveries d where d.attempt_id=t.id),
 'events',(select coalesce(jsonb_agg(to_jsonb(ev) order by ev.sequence,ev.received_at),'[]') from public.position_assessment_events ev where ev.attempt_id=t.id)) order by t.created_at desc),'[]')
 from public.position_assessment_attempts t join public.position_assessments a on a.organization_id=t.organization_id and a.id=t.assessment_id where a.organization_id=p_organization_id and coalesce(t.person_id,a.person_id)=p.id and a.vacancy_id=v.id)) into result
 from public.people p join public.vacancies v on v.organization_id=p.organization_id left join public.person_private_data pd on pd.organization_id=p.organization_id and pd.person_id=p.id
 where p.organization_id=p_organization_id and p.id=p_person_id and v.id=p_vacancy_id;
 if result is null then raise exception 'PA_CONTEXT_INVALID' using errcode='42501'; end if;
 return result;
end $$;

create or replace function public.position_assessment_mutate(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid,p_action text,p_assessment_id uuid default null,p_revision integer default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid; proc public.position_evaluation_processes; a public.position_assessments; conf jsonb; reqs jsonb; qs jsonb; q jsonb; oldq jsonb; newqs jsonb:='[]'; ids uuid[]; v uuid; bank public.assessment_items; keyhash text; family uuid;
begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and is_current for update;
 if proc.id is null or proc.status<>'active' then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 if p_person_id is not null then raise exception 'PA_USE_PROCESS_ASSESSMENT' using errcode='22023'; end if;
 if p_action='configure' and p_assessment_id is null and p_payload->>'processId' is distinct from proc.id::text then raise exception 'PA_CONTEXT_CHANGED' using errcode='40001'; end if;
 if p_action not in ('configure','questions','approve','ready','allow_ai') or p_action is null then raise exception 'PA_ACTION_INVALID' using errcode='22023'; end if;
 if p_assessment_id is not null then
  select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id and person_id is null and process_id=proc.id and vacancy_id=p_vacancy_id for update;
  if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
  if a.revision is distinct from p_revision then raise exception 'PA_CONFLICT' using errcode='40001'; end if;
  if a.status in ('issued','cancelled')  then raise exception 'PA_IMMUTABLE' using errcode='22023'; end if;
 elsif p_action<>'configure' then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 if a.id is not null and exists(select 1 from public.position_assessment_generation where assessment_id=a.id and status='reserved') then raise exception 'PA_GENERATION_PENDING' using errcode='40001'; end if;
 if p_action='configure' then
  conf:=p_payload->'config';
  if conf->>'mode' is null or conf->>'mode' not in ('bank','ai','mixed') or (conf->>'durationMinutes')::integer not between 1 and 240 or conf->>'durationMinutes' is null then raise exception 'PA_CONFIG_INVALID' using errcode='22023'; end if;
  conf:=jsonb_build_object('quantity',(conf->>'quantity')::integer,'level',(conf->>'level')::integer,'durationMinutes',(conf->>'durationMinutes')::integer,'mode',conf->>'mode',
  'distribution',private.pa_distribution((conf->>'quantity')::integer,(conf->>'level')::integer));
  if jsonb_typeof(p_payload->'requirementIds') is distinct from 'array' then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(p_payload->'requirementIds');
  if ids is null or cardinality(ids)=0 or (select count(distinct x) from unnest(ids) x)<>cardinality(ids) then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  select current_version_id into v from public.vacancies where id=p_vacancy_id and organization_id=p_organization_id;
  select jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'competencyKey',coalesce(r.concept_id::text,r.competency_id::text,r.label)) order by r.created_at) into reqs
  from public.vacancy_requirements r where r.organization_id=p_organization_id and r.vacancy_version_id=v and r.id=any(ids);
  if jsonb_array_length(reqs) is distinct from cardinality(ids) or cardinality(ids)>(conf->>'quantity')::integer then raise exception 'PA_REQUIREMENTS_INVALID' using errcode='22023'; end if;
  if a.id is null then insert into public.position_assessments(organization_id,person_id,process_id,contract_version,vacancy_id,position_version_id,requirements,config,created_by)
   values(p_organization_id,null,proc.id,'position-assessment-2.0.0',p_vacancy_id,v,reqs,conf,actor) returning * into a;
  else update public.position_assessments set config=conf,requirements=reqs,position_version_id=v,questions='[]',status='draft',revision=revision+1,updated_at=now() where id=a.id returning * into a; end if;
 elsif p_action='allow_ai' then
  update public.position_assessments set config=jsonb_set(config,'{mode}','"mixed"'),revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='questions' then
  qs:=p_payload->'questions';
  if jsonb_typeof(qs) is distinct from 'array' or jsonb_array_length(qs)>(a.config->>'quantity')::integer then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
  if (select count(distinct q->>'id') from jsonb_array_elements(qs) q)<>jsonb_array_length(qs) then raise exception 'PA_DUPLICATE' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(qs) loop
   perform private.pa_validate_question(q,p_organization_id,a.requirements);
   if (a.config->>'mode'='bank' and q->>'source'<>'bank') or (a.config->>'mode'='ai' and q->>'source'<>'ai') then raise exception 'PA_MODE_INVALID' using errcode='22023'; end if;
   if q->>'source'='bank' then
    select value into oldq from jsonb_array_elements(a.questions) where value->>'id'=q->>'id';
    if oldq->'provenance'->>'method'='human-edited-bank' then
     if q->'provenance' is distinct from oldq->'provenance' or q->>'version' is distinct from oldq->>'version' or q->>'competencyKey' is distinct from oldq->>'competencyKey' or q->>'requirementId' is distinct from oldq->>'requirementId' or q->>'difficulty' is distinct from oldq->>'difficulty' then raise exception 'PA_PROVENANCE_INVALID' using errcode='42501'; end if;
    else
     select * into bank from public.assessment_items where id=(q->>'id')::uuid and (organization_id=p_organization_id or organization_id is null) and state in ('approved','active') and human_approved_at is not null;
     if not found or bank.version is distinct from q->>'version' or bank.competency_key is distinct from q->>'competencyKey'
     or (case bank.defined_difficulty when 'low' then 'easy' when 'high' then 'hard' else 'medium' end) is distinct from q->>'difficulty' then raise exception 'PA_BANK_INVALID' using errcode='42501'; end if;
     if bank.stem is distinct from q->>'stem' or bank.options is distinct from q->'options' or bank.answer_key->>'correctOptionId' is distinct from q->>'correctOptionId' or bank.explanation is distinct from q->>'explanation' then
      q:=q||jsonb_build_object('id',gen_random_uuid(),'version','position-assessment-edited-bank-1.0.0','provenance',jsonb_build_object('method','human-edited-bank','version','position-assessment-edited-bank-1.0.0','baseItemId',bank.id,'baseVersion',bank.version,'authorId',actor));
     else q:=q||jsonb_build_object('provenance',jsonb_build_object('method','approved-item-bank','version',bank.version,'authorId',bank.human_approved_by_auth_user_id)); end if;
    end if;
   end if;
   -- Client cannot claim human approval. An edit resets review.
   q:=q-'approvedBy'-'approvedAt'-'review';
   select value into oldq from jsonb_array_elements(a.questions) where value->>'id'=q->>'id';
   if q->>'source'='ai' and (oldq is null or oldq->>'source'<>'ai' or oldq->>'version' is distinct from q->>'version' or oldq->'provenance' is distinct from q->'provenance' or oldq->>'requirementId' is distinct from q->>'requirementId' or oldq->>'competencyKey' is distinct from q->>'competencyKey' or oldq->>'difficulty' is distinct from q->>'difficulty') then raise exception 'PA_PROVENANCE_INVALID' using errcode='42501'; end if;
   if oldq-'approvedBy'-'approvedAt'-'review'=q then q:=oldq; else q:=q||jsonb_build_object('review','pending');
    if oldq is not null then q:=q||jsonb_build_object('provenance',q->'provenance'||jsonb_build_object('editedBy',actor,'editRevision',a.revision+1)); end if;
   end if;
   if q->>'source'='bank' and q->'provenance'->>'method'='approved-item-bank' and bank.human_approved_by_auth_user_id is not null and bank.human_approved_at is not null then
    q:=q||jsonb_build_object('review','approved','approvedBy',bank.human_approved_by_auth_user_id,'approvedAt',bank.human_approved_at);
   end if;
   newqs:=newqs||jsonb_build_array(q);
  end loop;
  update public.position_assessments set questions=newqs,status='draft',revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='approve' then
  if not exists(select 1 from jsonb_array_elements(a.questions) where value->>'id'=p_payload->>'questionId') then raise exception 'PA_QUESTION_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(a.questions) loop
   if q->>'id'=p_payload->>'questionId' then
    perform private.pa_validate_question(q,p_organization_id,a.requirements);
    q:=q||jsonb_build_object('review','approved','approvedBy',actor,'approvedAt',now());
    if p_payload->>'saveToBank'='true' and (q->>'source'='ai' or q->'provenance'->>'method'='human-edited-bank') then
     keyhash:=encode(extensions.digest(jsonb_build_object('stem',lower(trim(q->>'stem')),'options',q->'options','correctOptionId',q->>'correctOptionId','explanation',q->>'explanation','competencyKey',q->>'competencyKey','difficulty',q->>'difficulty','language',q->>'language')::text,'sha256'),'hex');
     select id into bank.id from public.assessment_items where organization_id=p_organization_id and content_fingerprint=keyhash and state in ('approved','active') limit 1;
     if bank.id is null then
      insert into public.assessment_item_families(organization_id,family_key,competency_key,target_level,dimension) values(p_organization_id,'pa-'||keyhash,q->>'competencyKey','intermediate','contextual') on conflict(organization_id,family_key) do update set family_key=excluded.family_key returning id into family;
      insert into public.assessment_items(organization_id,family_id,item_key,version,competency_key,target_level,dimension,state,source,language,stem,options,answer_key,explanation,defined_difficulty,content_fingerprint,provenance,human_approved_by_auth_user_id,human_approved_at)
      values(p_organization_id,family,'pa-'||keyhash,'position-assessment-item-1.0.0',q->>'competencyKey','intermediate','contextual','approved','organization','pt-BR',q->>'stem',q->'options',jsonb_build_object('correctOptionId',q->>'correctOptionId'),q->>'explanation',case q->>'difficulty' when 'easy' then 'low' when 'hard' then 'high' else 'medium' end,keyhash,q->'provenance',actor,now());
     end if;
    end if;
   end if;
   newqs:=newqs||jsonb_build_array(q);
  end loop;
  update public.position_assessments set questions=newqs,revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='ready' then
  if not private.pa_ready(a) then raise exception 'PA_REVIEW_REQUIRED' using errcode='22023'; end if;
  update public.position_assessments set status='ready',revision=revision+1,updated_at=now() where id=a.id returning * into a;
 elsif p_action='cancel' then
  update public.position_assessments set status='cancelled',revision=revision+1,updated_at=now() where id=a.id returning * into a;
  update public.position_assessment_attempts set status='cancelled' where assessment_id=a.id and status<>'submitted';
  update public.position_assessment_deliveries d set state='cancelled' where d.attempt_id in (select id from public.position_assessment_attempts where assessment_id=a.id) and state<>'sent';
 end if;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload)
 values(p_organization_id,actor,'position_assessment_'||p_action,'success',jsonb_build_object('assessmentId',a.id,'revision',a.revision,'contract',a.contract_version));
 return to_jsonb(a);
end $$;

create or replace function public.position_assessment_invite(p_organization_id uuid,p_assessment_id uuid,p_request_key uuid,p_recipient text,p_subject text,p_message text,p_expires_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.position_assessments; d public.position_assessment_deliveries; actor uuid; token text; t uuid; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 select * into d from public.position_assessment_deliveries where organization_id=p_organization_id and request_key=p_request_key;
 if found then
  if d.recipient is distinct from p_recipient or d.subject is distinct from p_subject or d.message is distinct from p_message or not exists(select 1 from public.position_assessment_attempts where id=d.attempt_id and assessment_id=a.id and expires_at=p_expires_at) then raise exception 'PA_INVITE_CONFLICT' using errcode='40001'; end if;
  return jsonb_build_object('deliveryId',d.id,'attemptId',d.attempt_id,'state',d.state);
 end if;
 raise exception 'PA_USE_PROCESS_ASSESSMENT' using errcode='22023';
 if a.status<>'ready' or not private.pa_ready(a) then raise exception 'PA_REVIEW_REQUIRED' using errcode='22023'; end if;
 if p_request_key is null or p_recipient is null or p_recipient !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' or length(p_recipient)>254
 or coalesce(trim(p_subject),'')='' or length(p_subject)>200 or p_subject ~ '[\r\n]' or coalesce(trim(p_message),'')='' or length(p_message)>4000
 or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '90 days' then raise exception 'PA_INVITE_INVALID' using errcode='22023'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.position_assessment_attempts(organization_id,assessment_id,token_hash,expires_at) values(p_organization_id,a.id,encode(extensions.digest(token,'sha256'),'hex'),p_expires_at) returning id into t;
 insert into public.position_assessment_deliveries(organization_id,attempt_id,request_key,requested_by,recipient,subject,message,token_cipher)
 values(p_organization_id,t,p_request_key,actor,p_recipient,p_subject,p_message,extensions.pgp_sym_encrypt(token,(select value from private.position_assessment_key),'cipher-algo=aes256')) returning * into d;
 update public.position_assessments set status='issued',revision=revision+1,updated_at=now() where id=a.id;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'position_assessment_invite_requested','success',jsonb_build_object('assessmentId',a.id,'deliveryId',d.id,'attemptId',t,'recipientOverridden',p_recipient is distinct from (select pd.email from public.person_private_data pd where pd.organization_id=p_organization_id and pd.person_id=a.person_id)));
 return jsonb_build_object('deliveryId',d.id,'attemptId',t,'state',d.state);
end $$;

create or replace function public.position_assessment_public(p_action text,p_token_hash text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
<<pa_access>>
declare t public.position_assessment_attempts; a public.position_assessments; q jsonb; answers jsonb; marked jsonb; answer text; result jsonb; correct integer:=0; event jsonb; kind text; eid uuid; ev public.position_assessment_events; limit_at timestamptz; allowed text[];
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_action not in ('load','start','save','submit','events') or p_action is null then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 select * into t from public.position_assessment_attempts where token_hash=p_token_hash for update;
 if not found or t.status='cancelled' then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 select * into a from public.position_assessments where organization_id=t.organization_id and id=t.assessment_id;
 if a.status<>'issued' then raise exception 'PA_TOKEN_INVALID' using errcode='42501'; end if;
 limit_at:=least(t.expires_at,coalesce(t.started_at+make_interval(mins=>(a.config->>'durationMinutes')::integer),t.expires_at));
 if t.status<>'submitted' and now()>=limit_at then raise exception 'PA_EXPIRED' using errcode='22023'; end if;
 if p_action='start' then
  if t.status='invited' then update public.position_assessment_attempts set status='started',started_at=now(),revision=revision+1 where id=t.id returning * into t;
   insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(t.organization_id,t.id,'participant','started','{}');
  end if;
 elsif p_action in ('save','submit') then
  if t.status='submitted' and p_action='submit' then return jsonb_build_object('contract','position-assessment-1.0.0','status','submitted','submittedAt',t.submitted_at,'receiptId',t.id); end if;
  if t.status<>'started' then raise exception 'PA_ATTEMPT_STATE' using errcode='22023'; end if;
  if (p_payload->>'revision')::integer is distinct from t.revision then
   if p_action='save' and (p_payload->>'revision')::integer=t.revision-1 and p_payload->'answers'=t.answers and p_payload->'marked'=t.marked then
    p_action:='load';
   else raise exception 'PA_ANSWER_CONFLICT' using errcode='40001'; end if;
  end if;
  answers:=p_payload->'answers'; marked:=p_payload->'marked';
  if jsonb_typeof(answers) is distinct from 'object' or jsonb_typeof(marked) is distinct from 'array' then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(answers) k where not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=k))
   or exists(select 1 from jsonb_array_elements_text(marked) k where not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=k)) then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(a.questions) loop
   answer:=answers->>(q->>'id');
   if answer is not null and not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=answer) then raise exception 'PA_ANSWERS_INVALID' using errcode='22023'; end if;
   if p_action='submit' and answer is null then raise exception 'PA_ANSWERS_INCOMPLETE' using errcode='22023'; end if;
   if answer=q->>'correctOptionId' then correct:=correct+1; end if;
  end loop;
  if p_action<>'load' then update public.position_assessment_attempts set answers=pa_access.answers,marked=pa_access.marked,revision=revision+1 where id=t.id returning * into t; end if;
  if p_action='submit' then
   result:=jsonb_build_object('correct',correct,'total',jsonb_array_length(a.questions),'method','position-assessment-objective-1.0.0',
   'requirements',(select jsonb_agg(jsonb_build_object('id',r->>'id','label',r->>'label','correct',(select count(*) from jsonb_array_elements(a.questions) q where q->>'requirementId'=r->>'id' and answers->>(q->>'id')=q->>'correctOptionId'),'total',(select count(*) from jsonb_array_elements(a.questions) q where q->>'requirementId'=r->>'id'))) from jsonb_array_elements(a.requirements) r));
   update public.position_assessment_attempts set status='submitted',result=pa_access.result,submitted_at=now() where id=t.id returning * into t;
   insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(t.organization_id,t.id,'participant','submitted',jsonb_build_object('method','position-assessment-objective-1.0.0'));
  end if;
 elsif p_action='events' then
  if t.status not in ('started','submitted') or jsonb_typeof(p_payload->'events') is distinct from 'array' or jsonb_array_length(p_payload->'events')>100 then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
  for event in select value from jsonb_array_elements(p_payload->'events') loop
   kind:=event->>'kind'; eid:=(event->>'eventId')::uuid;
   if kind is null or kind not in ('focus_episode','mouse_idle_before_first_choice','zoom_observed','capture_shortcut_observed','observation_gap','question_reopened','answer_changed')
    or exists(select 1 from jsonb_object_keys(event) k where k not in ('eventId','kind','questionInstanceId','questionVersion','clientAtMs','sequence','method','values'))
    or not exists(select 1 from jsonb_array_elements(a.questions) q where q->>'id'=event->>'questionInstanceId' and q->>'version'=event->>'questionVersion')
    or jsonb_typeof(event->'values') is distinct from 'object' or length((event->'values')::text)>2000 or event->>'method' not in ('position-assessment-focus-1.0.0','position-assessment-mouse-samples-1.0.0','position-assessment-browser-signals-1.0.0') or event->>'method' is null then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   allowed:=case kind when 'focus_episode' then array['durationMs','startedAtClientMs','endedAtClientMs','closedBy','limitation'] when 'mouse_idle_before_first_choice' then array['totalIdleMs','longestIdleMs','observedActiveMs','unobservedActiveMs','support','resolutionMs','closedBy','limitation'] when 'zoom_observed' then array['previousScale','scale','support','limitation'] when 'capture_shortcut_observed' then array['shortcut','support','limitation'] else array['support','limitation'] end;
   if exists(select 1 from jsonb_object_keys(event->'values') k where not(k=any(allowed))) then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   -- No arbitrary text, coordinates, keys, clipboard or image. Codes/numbers only.
   if exists(select 1 from jsonb_each(event->'values') x where jsonb_typeof(x.value) not in ('number','string','null') or (jsonb_typeof(x.value)='string' and x.value#>>'{}' !~ '^[a-zA-Z0-9_:+.-]{1,100}$') or (jsonb_typeof(x.value)='number' and not ((x.value#>>'{}')::numeric>=0 and (x.value#>>'{}')::numeric<'Infinity'::numeric))) then raise exception 'PA_EVENTS_INVALID' using errcode='22023'; end if;
   select * into ev from public.position_assessment_events where attempt_id=t.id and event_id=eid;
   if found then
    if ev.payload is distinct from event->'values' or ev.kind is distinct from kind or ev.question_id::text is distinct from event->>'questionInstanceId' or ev.question_version is distinct from event->>'questionVersion' or ev.sequence is distinct from (event->>'sequence')::bigint or ev.client_at_ms is distinct from (event->>'clientAtMs')::numeric or ev.method is distinct from event->>'method' then raise exception 'PA_EVENT_CONFLICT' using errcode='40001'; end if;
   else insert into public.position_assessment_events(organization_id,attempt_id,event_id,question_id,question_version,kind,client_at_ms,sequence,method,payload)
    values(t.organization_id,t.id,eid,(event->>'questionInstanceId')::uuid,event->>'questionVersion',kind,(event->>'clientAtMs')::numeric,(event->>'sequence')::bigint,event->>'method',event->'values'); end if;
  end loop;
 end if;
 if t.status='submitted' then return jsonb_build_object('contract','position-assessment-1.0.0','status','submitted','submittedAt',t.submitted_at,'receiptId',t.id); end if;
 return jsonb_build_object('contract','position-assessment-1.0.0','organizationId',t.organization_id,'attemptId',t.id,'revision',t.revision,'status',t.status,'expiresAt',t.expires_at,'startedAt',t.started_at,
 'deadline',least(t.expires_at,coalesce(t.started_at+make_interval(mins=>(a.config->>'durationMinutes')::integer),t.expires_at)),
 'durationMinutes',a.config->'durationMinutes','positionTitle',(select title from public.vacancy_versions where id=a.position_version_id),'personName',(select full_name from public.people where id=coalesce(t.person_id,a.person_id) and organization_id=t.organization_id),
 'questions',case when t.status='started' then (select jsonb_agg(q-'correctOptionId'-'explanation'-'approvedBy'-'provenance'-'approvedAt'-'review') from jsonb_array_elements(a.questions) q) else '[]'::jsonb end,'answers',t.answers,'marked',t.marked);
end $$;

create or replace function public.position_assessment_generation_request(p_organization_id uuid,p_assessment_id uuid,p_request_id uuid,p_distribution jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.position_assessments; g public.position_assessment_generation; actor uuid; total integer; d text; req jsonb; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 perform 1 from public.organizations where id=p_organization_id for update;
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id for update;
 if not found or a.status<>'draft' or a.config->>'mode' not in ('ai','mixed') then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 if a.process_id is null or not exists(select 1 from public.position_evaluation_processes p where p.id=a.process_id and p.organization_id=a.organization_id and p.is_current and p.status='active') then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 select * into g from public.position_assessment_generation where id=p_request_id;
 if found then if g.organization_id<>p_organization_id or g.assessment_id<>a.id or g.distribution is distinct from p_distribution then raise exception 'PA_GENERATION_CONFLICT' using errcode='40001'; end if; return to_jsonb(g); end if;
 if exists(select 1 from public.position_assessment_generation where assessment_id=a.id and status='reserved') then raise exception 'PA_GENERATION_PENDING' using errcode='40001'; end if;
 if jsonb_typeof(p_distribution) is distinct from 'array' or (select count(distinct ((r->>'requirementId')||':'||(r->>'difficulty'))) from jsonb_array_elements(p_distribution) r)<>jsonb_array_length(p_distribution) then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 total:=0;
 for req in select value from jsonb_array_elements(p_distribution) loop
  if not exists(select 1 from jsonb_array_elements(a.requirements) r where r->>'id'=req->>'requirementId') or req->>'difficulty' is null or req->>'difficulty' not in ('easy','medium','hard') or (req->>'quantity')::integer is null or (req->>'quantity')::integer<1 then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  total:=total+(req->>'quantity')::integer;
 end loop;
 if total not between 1 and 20 then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
 foreach d in array array['easy','medium','hard'] loop
  if (select coalesce(sum((r->>'quantity')::integer),0) from jsonb_array_elements(p_distribution) r where r->>'difficulty'=d)+(select count(*) from jsonb_array_elements(a.questions) q where q->>'difficulty'=d)>(a.config#>>array['distribution','counts',d])::integer then raise exception 'PA_GENERATION_DEFICIT_INVALID' using errcode='22023'; end if;
 end loop;
 if (select coalesce(sum(coalesce(actual_usd,reserved_usd)),0) from public.position_assessment_generation where organization_id=p_organization_id and created_at>=date_trunc('month',now()))+0.25>10 then raise exception 'PA_MONTHLY_BUDGET_EXCEEDED' using errcode='22023'; end if;
 insert into public.position_assessment_generation(id,organization_id,assessment_id,actor_id,revision,distribution,requirements) values(p_request_id,p_organization_id,a.id,actor,a.revision,p_distribution,a.requirements) returning * into g;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'position_assessment_generation_requested','success',jsonb_build_object('requestId',g.id,'assessmentId',a.id,'reservedUsd',0.25,'quantity',total));
 return to_jsonb(g);
end $$;

create or replace function public.position_assessment_generation_finish(p_request_id uuid,p_organization_id uuid,p_questions jsonb,p_actual_usd numeric,p_success boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare g public.position_assessment_generation; a public.position_assessments; q jsonb; n integer; r jsonb; begin
 select * into g from public.position_assessment_generation where id=p_request_id and organization_id=p_organization_id for update;
 if not found then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 if g.status in ('succeeded','failed') then return jsonb_build_object('status',g.status); end if;
 if p_actual_usd is not null and not(p_actual_usd>=0 and p_actual_usd<=0.25) then raise exception 'PA_COST_INVALID' using errcode='22023'; end if;
 select * into a from public.position_assessments where id=g.assessment_id and organization_id=g.organization_id for update;
 if p_success and a.process_id is not null and not exists(select 1 from public.position_evaluation_processes p where p.id=a.process_id and p.organization_id=a.organization_id and p.is_current and p.status='active') then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 if p_success then
  if a.status<>'draft' or a.revision<>g.revision then raise exception 'PA_GENERATION_STALE' using errcode='40001'; end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions)<>(select sum((r->>'quantity')::integer) from jsonb_array_elements(g.distribution) r) then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
   perform private.pa_validate_question(q,g.organization_id,g.requirements);
   if q->>'source'<>'ai' or q->>'review'<>'pending' or q ? 'approvedBy' then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  end loop;
  for r in select value from jsonb_array_elements(g.distribution) loop
   if (select count(*) from jsonb_array_elements(p_questions) q where q->>'requirementId'=r->>'requirementId' and q->>'difficulty'=r->>'difficulty')<>(r->>'quantity')::integer then raise exception 'PA_GENERATION_INVALID' using errcode='22023'; end if;
  end loop;
  if (select count(distinct q->>'id') from jsonb_array_elements(a.questions||p_questions) q)<>jsonb_array_length(a.questions||p_questions) then raise exception 'PA_DUPLICATE' using errcode='22023'; end if;
  update public.position_assessments set questions=questions||p_questions,revision=revision+1,updated_at=now() where id=a.id;
 end if;
 update public.position_assessment_generation set status=case when p_success then 'succeeded' else 'failed' end,actual_usd=p_actual_usd,finished_at=now() where id=g.id;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(g.organization_id,g.actor_id,'position_assessment_generation_completed',case when p_success then 'success' else 'failure' end,jsonb_build_object('requestId',g.id,'assessmentId',a.id,'costKnown',p_actual_usd is not null));
 return jsonb_build_object('status',case when p_success then 'succeeded' else 'failed' end);
end $$;

revoke all on function private.get_position_follow_up_cycle(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function private.mutate_position_follow_up_cycle_core(uuid,uuid,text,uuid,integer,jsonb) from public,anon,authenticated,service_role;
-- Discovery may still add a Person to the current process. Existing mutations require its explicit ID.
create or replace function public.mutate_position_follow_up(p_organization_id uuid,p_vacancy_id uuid,p_action text,p_person_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_action is distinct from 'add' then raise exception 'FOLLOW_UP_PROCESS_ID_REQUIRED' using errcode='40001'; end if;
 return private.mutate_position_follow_up_cycle_core(p_organization_id,p_vacancy_id,p_action,p_person_id,p_expected_revision,p_payload);
end $$;
create function public.mutate_position_follow_up_process(p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid,p_action text,p_person_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 perform private.authorize_position_follow_up(p_organization_id);
 perform 1 from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id for update;
 perform 1 from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and id=p_process_id and is_current for update;
 if not found then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
 return private.mutate_position_follow_up_cycle_core(p_organization_id,p_vacancy_id,p_action,p_person_id,p_expected_revision,p_payload);
end $$;
revoke all on function public.mutate_position_follow_up_process(uuid,uuid,uuid,text,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.mutate_position_follow_up_process(uuid,uuid,uuid,text,uuid,integer,jsonb) to authenticated;
create or replace function public.get_position_follow_up(p_organization_id uuid,p_vacancy_id uuid default null,p_person_id uuid default null)
returns jsonb language sql security definer set search_path='' as $$ select private.get_position_follow_up_cycle(p_organization_id,p_vacancy_id,p_person_id,null) $$;
create function public.get_position_follow_up_process(p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_process_id is null or not exists(select 1 from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and id=p_process_id) then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 return private.get_position_follow_up_cycle(p_organization_id,p_vacancy_id,null,p_process_id);
end $$;

create function public.start_position_selection_process(p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid,p_revision integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; proc public.position_evaluation_processes; prior public.position_evaluation_processes; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 perform 1 from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id and status<>'cancelled' for update;
 if not found or p_request_id is null then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and start_request_id=p_request_id;
 if found then
  if proc.vacancy_id<>p_vacancy_id then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
  return public.get_position_follow_up_process(p_organization_id,p_vacancy_id,proc.id);
 end if;
 select * into prior from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and is_current for update;
 if prior.id is distinct from p_process_id or prior.revision is distinct from p_revision then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
 if prior.status<>'closed' then raise exception 'FOLLOW_UP_CLOSE_FIRST' using errcode='22023'; end if;
 update public.position_evaluation_processes set is_current=false,revision=revision+1 where id=prior.id;
 insert into public.position_evaluation_processes(organization_id,vacancy_id,name,sequence,start_request_id)
 values(p_organization_id,p_vacancy_id,'Acompanhamento '||lpad((prior.sequence+1)::text,2,'0'),prior.sequence+1,p_request_id) returning * into proc;
 insert into public.position_evaluation_history(organization_id,process_id,actor_id,actor_name,action,after_data)
 select p_organization_id,proc.id,actor,full_name,'start_process',jsonb_build_object('previousProcessId',prior.id) from public.platform_users where auth_user_id=actor;
 return public.get_position_follow_up(p_organization_id,p_vacancy_id);
end $$;

create function public.process_assessment_workspace(p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proc public.position_evaluation_processes; a public.position_assessments; v public.vacancies; result jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 select * into v from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and ((p_process_id is null and is_current) or id=p_process_id);
 if v.id is null or proc.id is null then raise exception 'PA_CONTEXT_INVALID' using errcode='42501'; end if;
 select * into a from public.position_assessments where organization_id=p_organization_id and process_id=proc.id;
 result:=jsonb_build_object('contract','process-assessment-1.0.0','organizationId',p_organization_id,'vacancyId',v.id,'positionVersionId',v.current_version_id,'positionTitle',v.title,
 'process',jsonb_build_object('id',proc.id,'name',proc.name,'status',proc.status,'revision',proc.revision,'isCurrent',proc.is_current),
 'assessment',case when a.id is null then null else to_jsonb(a)||jsonb_build_object('generationPending',exists(select 1 from public.position_assessment_generation g where g.assessment_id=a.id and g.status='reserved')) end,
 'requirements',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'competencyKey',coalesce(r.concept_id::text,r.competency_id::text,r.label)) order by r.created_at),'[]') from public.vacancy_requirements r where r.organization_id=p_organization_id and r.vacancy_version_id=v.current_version_id),
 'candidates',(select coalesce(jsonb_agg(jsonb_build_object('personId',p.id,'name',p.full_name,'email',pd.email,'stage',e.stage,'active',p.operational_status='active') order by p.full_name),'[]') from public.position_evaluation_entries e join public.people p on p.organization_id=e.organization_id and p.id=e.person_id left join public.person_private_data pd on pd.organization_id=p.organization_id and pd.person_id=p.id where e.organization_id=p_organization_id and e.process_id=proc.id),
 'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'personId',t.person_id,'assessmentId',t.assessment_id,'status',t.status,'expiresAt',t.expires_at,'startedAt',t.started_at,'submittedAt',t.submitted_at,'answers',t.answers,'result',t.result,
 'deliveries',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'state',d.state,'recipient',d.recipient,'subject',d.subject,'message',d.message,'providerEmailId',d.provider_email_id,'errorCategory',d.error_category) order by d.created_at),'[]') from public.position_assessment_deliveries d where d.organization_id=t.organization_id and d.attempt_id=t.id),
 'events',(select coalesce(jsonb_agg(to_jsonb(ev) order by ev.sequence,ev.received_at),'[]') from public.position_assessment_events ev where ev.organization_id=t.organization_id and ev.attempt_id=t.id)) order by t.created_at),'[]') from public.position_assessment_attempts t where t.organization_id=p_organization_id and t.assessment_id=a.id),
 'reusable',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'processName',p.name,'quantity',x.config->'quantity','durationMinutes',x.config->'durationMinutes') order by x.created_at desc),'[]') from public.position_assessments x join public.position_evaluation_processes p on p.organization_id=x.organization_id and p.id=x.process_id where x.organization_id=p_organization_id and x.vacancy_id=v.id and x.process_id<>proc.id and x.status='issued' and x.position_version_id=v.current_version_id),
 'legacy',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'personId',x.person_id,'status',x.status,'createdAt',x.created_at) order by x.created_at desc),'[]') from public.position_assessments x where x.organization_id=p_organization_id and x.vacancy_id=v.id and x.process_id is null));
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,auth.uid(),'process_assessment_consulted','success',jsonb_build_object('processId',proc.id,'assessmentId',a.id));
 return result;
end $$;

create function public.process_assessment_reuse(p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid,p_source_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; proc public.position_evaluation_processes; a public.position_assessments; source public.position_assessments; version uuid; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and id=p_process_id and is_current and status='active' for update;
 if not found then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 if exists(select 1 from public.position_assessments where organization_id=p_organization_id and process_id=proc.id) then raise exception 'PA_CONFLICT' using errcode='40001'; end if;
 select current_version_id into version from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id;
 select * into source from public.position_assessments where organization_id=p_organization_id and vacancy_id=p_vacancy_id and id=p_source_id and process_id<>proc.id and status='issued' and position_version_id=version;
 if not found or not private.pa_ready(source) then raise exception 'PA_REUSE_INCOMPATIBLE' using errcode='22023'; end if;
 insert into public.position_assessments(organization_id,process_id,contract_version,vacancy_id,position_version_id,requirements,config,questions,created_by)
 values(p_organization_id,proc.id,'position-assessment-2.0.0',p_vacancy_id,version,source.requirements,source.config,source.questions,actor) returning * into a;
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'process_assessment_reused','success',jsonb_build_object('assessmentId',a.id,'sourceAssessmentId',source.id));
 return to_jsonb(a);
end $$;

create function public.process_assessment_issue(p_organization_id uuid,p_assessment_id uuid,p_revision integer,p_request_id uuid,p_recipients jsonb,p_subject text,p_message text,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
#variable_conflict use_column
declare actor uuid; proc public.position_evaluation_processes; a public.position_assessments; batch public.position_assessment_batches;
 recipient jsonb; q jsonb; qs jsonb:='[]'; fingerprint text; receipts jsonb:='[]'; token text; attempt uuid; delivery public.position_assessment_deliveries; key uuid; pid uuid; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 -- Match authoring's process -> assessment lock order and serialize all batches for this process.
 select p.* into proc from public.position_evaluation_processes p join public.position_assessments x on x.organization_id=p.organization_id and x.process_id=p.id where x.organization_id=p_organization_id and x.id=p_assessment_id for update of p;
 select * into a from public.position_assessments where id=p_assessment_id and organization_id=p_organization_id and process_id=proc.id for update;
 if a.id is null or p_request_id is null then raise exception 'PA_NOT_FOUND' using errcode='42501'; end if;
 if jsonb_typeof(p_recipients) is distinct from 'array' or jsonb_array_length(p_recipients)=0 or length(p_recipients::text)>128000 then raise exception 'PA_INVITE_INVALID' using errcode='22023'; end if;
 fingerprint:=encode(extensions.digest(jsonb_build_object('assessment',a.id,'recipients',(select jsonb_agg(x order by x->>'personId') from jsonb_array_elements(p_recipients) x),'subject',p_subject,'message',p_message,'expires',p_expires_at)::text,'sha256'),'hex');
 select * into batch from public.position_assessment_batches where organization_id=p_organization_id and request_id=p_request_id;
 if found then
  if batch.assessment_id<>a.id or batch.fingerprint<>fingerprint then raise exception 'PA_INVITE_CONFLICT' using errcode='40001'; end if;
  return jsonb_build_object('status','queued','duplicate',true,'receipts',batch.receipts);
 end if;
 if not proc.is_current or proc.status<>'active' then raise exception 'PA_CONTEXT_CLOSED' using errcode='42501'; end if;
 if a.revision is distinct from p_revision then raise exception 'PA_CONFLICT' using errcode='40001'; end if;
 if a.status not in ('draft','ready','issued') then raise exception 'PA_IMMUTABLE' using errcode='22023'; end if;
 if exists(select 1 from public.position_assessment_generation where assessment_id=a.id and status='reserved') then raise exception 'PA_GENERATION_PENDING' using errcode='40001'; end if;
 if (select count(distinct x->>'personId') from jsonb_array_elements(p_recipients) x)<>jsonb_array_length(p_recipients)
 or coalesce(trim(p_subject),'')='' or length(p_subject)>200 or p_subject ~ '[\r\n]' or coalesce(trim(p_message),'')='' or length(p_message)>4000
 or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '90 days' then raise exception 'PA_INVITE_INVALID' using errcode='22023'; end if;
 -- Validate the complete batch before approving or queuing any invitation.
 for recipient in select value from jsonb_array_elements(p_recipients) loop
  pid:=(recipient->>'personId')::uuid;
  if recipient->>'email' is null or recipient->>'email' !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' or length(recipient->>'email')>254
  or not exists(select 1 from public.position_evaluation_entries e join public.people p on p.organization_id=e.organization_id and p.id=e.person_id where e.organization_id=p_organization_id and e.process_id=proc.id and e.person_id=pid and e.stage<>'closed' and p.operational_status='active') then raise exception 'PA_RECIPIENT_INVALID' using errcode='22023'; end if;
  select d.* into delivery from public.position_assessment_deliveries d join public.position_assessment_attempts t on t.organization_id=d.organization_id and t.id=d.attempt_id where t.organization_id=p_organization_id and t.assessment_id=a.id and t.person_id=pid;
  if found and (delivery.recipient is distinct from recipient->>'email' or delivery.subject is distinct from p_subject or delivery.message is distinct from p_message or not exists(select 1 from public.position_assessment_attempts t where t.id=delivery.attempt_id and t.expires_at=p_expires_at)) then raise exception 'PA_INVITE_CONFLICT' using errcode='40001'; end if;
 end loop;
 if a.status<>'issued' then
  for q in select value from jsonb_array_elements(a.questions) loop
   perform private.pa_validate_question(q,p_organization_id,a.requirements);
   if q->>'review'<>'approved' or q->>'approvedBy' is null then q:=q||jsonb_build_object('review','approved','approvedBy',actor,'approvedAt',now()); end if;
   qs:=qs||jsonb_build_array(q);
  end loop;
  a.questions:=qs;
  if not private.pa_ready(a) then raise exception 'PA_REVIEW_REQUIRED' using errcode='22023'; end if;
  update public.position_assessments set questions=qs,status='issued',revision=revision+1,updated_at=now() where id=a.id returning * into a;
 end if;
 for recipient in select value from jsonb_array_elements(p_recipients) loop
  pid:=(recipient->>'personId')::uuid;
  select d.* into delivery from public.position_assessment_deliveries d join public.position_assessment_attempts t on t.organization_id=d.organization_id and t.id=d.attempt_id where t.organization_id=p_organization_id and t.assessment_id=a.id and t.person_id=pid;
  if not found then
   token:=encode(extensions.gen_random_bytes(32),'hex'); key:=md5(p_request_id::text||':'||pid::text)::uuid;
   insert into public.position_assessment_attempts(organization_id,assessment_id,person_id,token_hash,expires_at) values(p_organization_id,a.id,pid,encode(extensions.digest(token,'sha256'),'hex'),p_expires_at) returning id into attempt;
   insert into public.position_assessment_deliveries(organization_id,attempt_id,request_key,requested_by,recipient,subject,message,token_cipher)
   values(p_organization_id,attempt,key,actor,recipient->>'email',p_subject,p_message,extensions.pgp_sym_encrypt(token,(select value from private.position_assessment_key),'cipher-algo=aes256')) returning * into delivery;
   insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(p_organization_id,attempt,'backend','batch_invite_requested',jsonb_build_object('requestId',p_request_id,'recipientOverridden',recipient->>'email' is distinct from (select email from public.person_private_data where organization_id=p_organization_id and person_id=pid)));
  end if;
  receipts:=receipts||jsonb_build_array(jsonb_build_object('personId',pid,'attemptId',delivery.attempt_id,'deliveryId',delivery.id,'state',delivery.state));
 end loop;
 insert into public.position_assessment_batches(organization_id,request_id,assessment_id,fingerprint,actor_id,receipts) values(p_organization_id,p_request_id,a.id,fingerprint,actor,receipts);
 insert into public.verification_audit_events(organization_id,actor_auth_user_id,action,result,payload) values(p_organization_id,actor,'process_assessment_batch_approved','success',jsonb_build_object('assessmentId',a.id,'processId',proc.id,'requestId',p_request_id,'count',jsonb_array_length(receipts)));
 return jsonb_build_object('status','queued','receipts',receipts);
end $$;

create function public.process_assessment_cancel_attempt(p_organization_id uuid,p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.position_assessment_attempts; begin
 perform private.authorize_position_follow_up(p_organization_id);
 select * into t from public.position_assessment_attempts where organization_id=p_organization_id and id=p_attempt_id and person_id is not null for update;
 if not found or t.status='submitted' then raise exception 'PA_ATTEMPT_STATE' using errcode='22023'; end if;
 update public.position_assessment_attempts set status='cancelled',revision=revision+1 where id=t.id;
 update public.position_assessment_deliveries set state='cancelled' where attempt_id=t.id and state<>'sent';
 insert into public.position_assessment_audit(organization_id,attempt_id,actor_kind,action,payload) values(p_organization_id,t.id,'backend','cancelled',jsonb_build_object('actorId',auth.uid()));
 return jsonb_build_object('status','cancelled');
end $$;

revoke all on function public.get_position_follow_up_process(uuid,uuid,uuid),public.start_position_selection_process(uuid,uuid,uuid,integer,uuid),public.process_assessment_workspace(uuid,uuid,uuid),public.process_assessment_reuse(uuid,uuid,uuid,uuid),public.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz),public.process_assessment_cancel_attempt(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_position_follow_up_process(uuid,uuid,uuid),public.start_position_selection_process(uuid,uuid,uuid,integer,uuid),public.process_assessment_workspace(uuid,uuid,uuid),public.process_assessment_reuse(uuid,uuid,uuid,uuid),public.process_assessment_issue(uuid,uuid,integer,uuid,jsonb,text,text,timestamptz),public.process_assessment_cancel_attempt(uuid,uuid) to authenticated;
