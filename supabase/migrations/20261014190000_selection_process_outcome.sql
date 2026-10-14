-- selection-process-outcome-1.0.0: explicit human outcome only with closure.
-- No historical backfill; assessments, entries, stages, decisions and occupancy remain intact.
alter table public.position_evaluation_processes
 add column closure_outcome text check(closure_outcome in ('selected','none')),
 add column selected_entry_id uuid,
 add column closed_at timestamptz,
 add column closure_actor_id uuid,
 add constraint selection_chosen_entry_scope foreign key(organization_id,selected_entry_id)
   references public.position_evaluation_entries(organization_id,id) on delete set null(selected_entry_id),
 add constraint selection_closure_shape check(
   (closure_outcome is null and selected_entry_id is null and closed_at is null and closure_actor_id is null)
   or (status='closed' and closure_outcome is not null and closed_at is not null and closure_actor_id is not null
     and (closure_outcome='selected' or selected_entry_id is null)));
create index selection_chosen_entry_idx on public.position_evaluation_processes(selected_entry_id) where selected_entry_id is not null;

create function private.selection_process_outcome(p_org uuid,p_process uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when p.closure_outcome is null then null else jsonb_build_object(
  'contract','selection-process-outcome-1.0.0','outcome',p.closure_outcome,
  'selectedPersonId',e.person_id,'selectedPersonName',person.full_name,'closedAt',p.closed_at,'actor',u.full_name) end
 from public.position_evaluation_processes p
 left join public.position_evaluation_entries e on e.organization_id=p.organization_id and e.process_id=p.id and e.id=p.selected_entry_id
 left join public.people person on person.organization_id=e.organization_id and person.id=e.person_id
 left join public.platform_users u on u.auth_user_id=p.closure_actor_id
 where p.organization_id=p_org and p.id=p_process;
$$;
revoke all on function private.selection_process_outcome(uuid,uuid) from public,anon,authenticated,service_role;

-- Existing assessment results are referenced, never duplicated or inferred into final decisions.
create function private.person_selection_tests(p_org uuid,p_person uuid,p_process uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('organizationId',a.organization_id,'personId',p_person,'id',a.id,'vacancyId',a.vacancy_id,'positionTitle',v.title,
  'createdAt',a.created_at,'durationMinutes',(a.config->>'durationMinutes')::integer,
  'attemptId',t.id,'status',coalesce(t.status,'not_invited'),'expiresAt',t.expires_at,'startedAt',t.started_at,'submittedAt',t.submitted_at,
  'correct',t.result->'correct','total',t.result->'total') order by a.created_at desc,t.created_at desc),'[]')
 from public.position_assessments a join public.vacancies v on v.organization_id=a.organization_id and v.id=a.vacancy_id
 left join public.position_assessment_attempts t on t.organization_id=a.organization_id and t.assessment_id=a.id and coalesce(t.person_id,a.person_id)=p_person
 where a.organization_id=p_org and ((p_process is not null and a.process_id=p_process and t.person_id=p_person)
   or (p_process is null and a.process_id is null and a.person_id=p_person));
$$;
revoke all on function private.person_selection_tests(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_person_selection_history(p_organization_id uuid,p_person_id uuid,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; total integer; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if not exists(select 1 from public.people where organization_id=p_organization_id and id=p_person_id) then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'SELECTION_INVALID_FILTER' using errcode='22023'; end if;
 select count(*) into total from public.position_evaluation_entries where organization_id=p_organization_id and person_id=p_person_id;
 select coalesce(jsonb_agg(jsonb_build_object('organizationId',e.organization_id,'personId',e.person_id,'entryId',e.id,
  'processId',p.id,'processName',p.name,'processStatus',p.status,'vacancyId',v.id,'title',v.title,'stage',e.stage,
  'joinedAt',e.created_at,'processCreatedAt',p.created_at,'outcome',private.selection_process_outcome(p_organization_id,p.id),
  'tests',private.person_selection_tests(p_organization_id,p_person_id,p.id)) order by p.created_at desc,p.id),'[]') into rows
 from (select e.* from public.position_evaluation_entries e join public.position_evaluation_processes p on p.organization_id=e.organization_id and p.id=e.process_id
  where e.organization_id=p_organization_id and e.person_id=p_person_id order by p.created_at desc,p.id limit 50 offset p_offset) e
 join public.position_evaluation_processes p on p.organization_id=e.organization_id and p.id=e.process_id
 join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id;
 return jsonb_build_object('contract','person-selection-history-1.0.0','organizationId',p_organization_id,'personId',p_person_id,
   'participations',rows,'total',total,'pageSize',50,'legacyTests',private.person_selection_tests(p_organization_id,p_person_id,null));
end $$;
revoke all on function public.get_person_selection_history(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_person_selection_history(uuid,uuid,integer) to authenticated;

create or replace function private.get_position_follow_up_cycle(p_organization_id uuid,p_vacancy_id uuid,p_person_id uuid,p_process_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proc public.position_evaluation_processes; entries jsonb; operators jsonb; hist jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_vacancy_id is null then
   if p_person_id is null then raise exception 'FOLLOW_UP_SCOPE_REQUIRED' using errcode='22023'; end if;
   return jsonb_build_object('contract','position-follow-up-1.0.0','links',(select coalesce(jsonb_agg(jsonb_build_object(
     'vacancyId',v.id,'title',v.title,'stage',e.stage,'processName',p.name,'processStatus',p.status,'processId',p.id,'isCurrent',p.is_current,'outcome',private.selection_process_outcome(p_organization_id,p.id),'joinedAt',e.created_at) order by p.created_at desc),'[]')
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
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'entryId',h.entry_id,'action',h.action,'subjectName',case when h.action in ('close_process','reopen_process') then person.full_name end,'actor',h.actor_name,'at',h.created_at,'before',h.before_data,'after',h.after_data) order by h.created_at desc,h.id),'[]') into hist
 from public.position_evaluation_history h left join public.position_evaluation_entries subject on subject.organization_id=h.organization_id and subject.id=h.entry_id left join public.people person on person.organization_id=subject.organization_id and person.id=subject.person_id where h.organization_id=p_organization_id and h.process_id=proc.id;
 return jsonb_build_object('contract','position-follow-up-1.0.0','process',case when proc.id is null then null else jsonb_build_object('id',proc.id,'name',proc.name,'status',proc.status,'revision',proc.revision,'isCurrent',proc.is_current,'sequence',proc.sequence,'outcome',private.selection_process_outcome(p_organization_id,proc.id)) end,
 'processes',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'revision',revision,'isCurrent',is_current,'sequence',sequence) order by sequence desc),'[]') from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id),
 'entries',entries,'operators',operators,'history',hist);
end $$;

create or replace function private.mutate_position_follow_up_cycle_core(p_organization_id uuid,p_vacancy_id uuid,p_action text,p_person_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare actor uuid; actor_name text; proc public.position_evaluation_processes; entry public.position_evaluation_entries; old_data jsonb; next_stage text; d jsonb; profile uuid; position uuid; k text; selected_entry uuid; closure text; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 select full_name into actor_name from public.platform_users where auth_user_id=actor;
 if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>24000 then raise exception 'FOLLOW_UP_INVALID_PAYLOAD' using errcode='22023'; end if;
 if p_action not in ('add','stage','details','schedule','cancel_interview','decision','close','reopen','close_process','reopen_process') then raise exception 'FOLLOW_UP_INVALID_ACTION' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_payload) loop
   if not ((p_action='add' and k in ('profileId','positionId')) or (p_action='stage' and k='stage') or (p_action='details' and k in ('nextAction','assignee','dueDate','notes'))
     or (p_action='schedule' and k in ('at','timezone','participants')) or (p_action='decision' and k in ('outcome','rationale')) or (p_action='close_process' and k in ('contract','outcome','selectedPersonId')))
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
   if p_action='close_process' then
     if p_payload->>'contract' is distinct from 'selection-process-outcome-1.0.0' or p_payload->>'outcome' is null or p_payload->>'outcome' not in ('selected','none') then
       raise exception 'SELECTION_CLOSURE_REQUIRED' using errcode='22023'; end if;
     closure:=p_payload->>'outcome';
     if closure='selected' then
       select id into selected_entry from public.position_evaluation_entries where organization_id=p_organization_id and process_id=proc.id and person_id::text=p_payload->>'selectedPersonId' for update;
       if selected_entry is null then raise exception 'SELECTION_PARTICIPANT_REQUIRED' using errcode='22023'; end if;
     elsif p_payload ? 'selectedPersonId' then raise exception 'SELECTION_UNEXPECTED_PERSON' using errcode='22023'; end if;
   end if;
   old_data:=jsonb_build_object('status',proc.status,'closureOutcome',proc.closure_outcome);
   update public.position_evaluation_processes set status=case when p_action='close_process' then 'closed' else 'active' end,
     closure_outcome=closure,selected_entry_id=selected_entry,
     closed_at=case when p_action='close_process' then now() end,
     closure_actor_id=case when p_action='close_process' then actor end,revision=revision+1 where id=proc.id;
   insert into public.position_evaluation_history(organization_id,process_id,entry_id,actor_id,actor_name,action,before_data,after_data)
    values(p_organization_id,proc.id,case when p_action='close_process' then selected_entry else proc.selected_entry_id end,actor,actor_name,p_action,old_data,
      jsonb_build_object('status',case when p_action='close_process' then 'closed' else 'active' end,'closureOutcome',closure));
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

create or replace function private.selection_process_summary(p_org uuid,p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('organizationId',p.organization_id,'id',p.id,'vacancyId',v.id,'title',v.title,
 'name','Processo '||lpad(p.sequence::text,2,'0'),'sequence',p.sequence,'status',p.status,'revision',p.revision,
 'outcome',private.selection_process_outcome(p_org,p.id),'isCurrent',p.is_current,'occupancy',pos.status,'createdAt',p.created_at,
 'candidates',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id),
 'stages',jsonb_build_object(
 'awaiting_evaluation',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage in ('awaiting_evaluation','evaluating')),
 'awaiting_interview',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage='awaiting_interview'),
 'interview_scheduled',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage='interview_scheduled'),
 'awaiting_decision',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage='awaiting_decision'),
 'decision_recorded',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage='decision_recorded'),
 'closed',(select count(*) from public.position_evaluation_entries e where e.organization_id=p_org and e.process_id=p.id and e.stage='closed')))
 from public.position_evaluation_processes p join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id
 left join public.positions pos on pos.organization_id=v.organization_id and pos.id=v.position_id
 where p.organization_id=p_org and p.id=p_id;
$$;
