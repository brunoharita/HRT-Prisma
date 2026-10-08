-- Operational follow-up is independent of matching, Profile and occupancy.
create table public.position_evaluation_processes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 vacancy_id uuid not null, name text not null default 'Avaliação 01', status text not null default 'active' check(status in ('active','closed')),
 revision integer not null default 1, created_at timestamptz not null default now(),
 unique(organization_id,vacancy_id), unique(organization_id,id),
 foreign key(organization_id,vacancy_id) references public.vacancies(organization_id,id) on delete cascade
);
create table public.position_evaluation_entries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, process_id uuid not null, person_id uuid not null,
 stage text not null default 'awaiting_evaluation' check(stage in ('awaiting_evaluation','evaluating','awaiting_interview','interview_scheduled','awaiting_decision','decision_recorded','closed')),
 previous_stage text not null default 'awaiting_evaluation', details jsonb not null default '{}', revision integer not null default 1,
 source_profile_id uuid, source_position_id uuid, created_at timestamptz not null default now(),
 unique(organization_id,process_id,person_id), unique(organization_id,id),
 foreign key(organization_id,process_id) references public.position_evaluation_processes(organization_id,id) on delete cascade,
 foreign key(organization_id,person_id) references public.people(organization_id,id) on delete cascade
);
create table public.position_evaluation_history (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, process_id uuid not null, entry_id uuid,
 actor_id uuid not null, actor_name text not null, action text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now(),
 foreign key(organization_id,process_id) references public.position_evaluation_processes(organization_id,id) on delete cascade,
 foreign key(organization_id,entry_id) references public.position_evaluation_entries(organization_id,id) on delete cascade
);
create index on public.position_evaluation_entries(organization_id,person_id);
create index on public.position_evaluation_history(organization_id,process_id,created_at);
alter table public.position_evaluation_processes enable row level security;
alter table public.position_evaluation_entries enable row level security;
alter table public.position_evaluation_history enable row level security;
revoke all on public.position_evaluation_processes,public.position_evaluation_entries,public.position_evaluation_history from public,anon,authenticated,service_role;

-- Only these reviewed RPCs expose minimized records; every call checks live authority.
create function private.authorize_position_follow_up(p_org uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); begin
 if actor is null or not private.is_active_platform_user(actor) or not (
   private.is_super_admin(actor) or exists(select 1 from public.organization_memberships m where m.organization_id=p_org and m.user_id=actor and m.role in ('owner','admin','recruiter')))
 then raise exception 'FOLLOW_UP_NOT_AUTHORIZED' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations where id=p_org) then raise exception 'FOLLOW_UP_NOT_AUTHORIZED' using errcode='42501'; end if;
 return actor;
end $$;
revoke all on function private.authorize_position_follow_up(uuid) from public,anon,authenticated,service_role;

create function public.get_position_follow_up(p_organization_id uuid,p_vacancy_id uuid default null,p_person_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proc public.position_evaluation_processes; entries jsonb; operators jsonb; hist jsonb; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_vacancy_id is null then
   if p_person_id is null then raise exception 'FOLLOW_UP_SCOPE_REQUIRED' using errcode='22023'; end if;
   return jsonb_build_object('contract','position-follow-up-1.0.0','links',(select coalesce(jsonb_agg(jsonb_build_object(
     'vacancyId',v.id,'title',v.title,'stage',e.stage,'processName',p.name,'processStatus',p.status) order by p.created_at desc),'[]')
     from public.position_evaluation_entries e join public.position_evaluation_processes p on p.organization_id=e.organization_id and p.id=e.process_id
       join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id
     where e.organization_id=p_organization_id and e.person_id=p_person_id));
 end if;
 if not exists(select 1 from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id) then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.auth_user_id,'name',u.full_name) order by u.full_name),'[]') into operators
 from public.organization_memberships m join public.platform_users u on u.auth_user_id=m.user_id
 where m.organization_id=p_organization_id and m.role in ('owner','admin','recruiter') and u.status='active';
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'personId',e.person_id,'fullName',p.full_name,'title',profile.profile_data->>'professionalTitle',
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
 return jsonb_build_object('contract','position-follow-up-1.0.0','process',case when proc.id is null then null else jsonb_build_object('id',proc.id,'name',proc.name,'status',proc.status,'revision',proc.revision) end,
 'entries',entries,'operators',operators,'history',hist);
end $$;
revoke all on function public.get_position_follow_up(uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.get_position_follow_up(uuid,uuid,uuid) to authenticated;

create function public.mutate_position_follow_up(p_organization_id uuid,p_vacancy_id uuid,p_action text,p_person_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}')
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
   insert into public.position_evaluation_processes(organization_id,vacancy_id) values(p_organization_id,p_vacancy_id) on conflict do nothing;
 end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id for update;
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
revoke all on function public.mutate_position_follow_up(uuid,uuid,text,uuid,integer,jsonb) from public,anon,service_role;
grant execute on function public.mutate_position_follow_up(uuid,uuid,text,uuid,integer,jsonb) to authenticated;
