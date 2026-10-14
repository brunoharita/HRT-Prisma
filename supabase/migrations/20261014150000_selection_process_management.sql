-- selection-process-management-1.0.0: explicit, tenant-scoped selection cycles.
-- No backfill, erasure or changes to assessments, matching or human decisions.
create unique index position_evaluation_processes_active_idx
 on public.position_evaluation_processes(organization_id,vacancy_id) where status='active';

create function private.guard_selection_process_start() returns trigger
language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare pos uuid; occupation public.position_status; begin
 if tg_op='UPDATE' and not (old.status='closed' and new.status='active') then return new; end if;
 select v.position_id into pos from public.vacancies v
 where v.organization_id=new.organization_id and v.id=new.vacancy_id and v.status<>'cancelled'
 and v.current_version_id is not null for update;
 if not found or pos is null then raise exception 'SELECTION_POSITION_UNAVAILABLE' using errcode='22023'; end if;
 select p.status into occupation from public.positions p where p.organization_id=new.organization_id and p.id=pos for update;
 if occupation is distinct from 'vacant'::public.position_status then raise exception 'SELECTION_POSITION_OCCUPIED' using errcode='22023'; end if;
 if tg_op='INSERT' and new.start_request_id is null then raise exception 'SELECTION_EXPLICIT_START_REQUIRED' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function private.guard_selection_process_start() from public,anon,authenticated,service_role;
create trigger selection_process_start_guard before insert or update on public.position_evaluation_processes
 for each row execute function private.guard_selection_process_start();

create or replace function public.start_position_selection_process(
 p_organization_id uuid,p_vacancy_id uuid,p_process_id uuid,p_revision integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='3s' as $$
declare actor uuid; proc public.position_evaluation_processes; prior public.position_evaluation_processes;
 next_sequence integer; pos uuid; occupation public.position_status; actor_name text; begin
 actor:=private.authorize_position_follow_up(p_organization_id);
 if p_request_id is null then raise exception 'FOLLOW_UP_REQUEST_REQUIRED' using errcode='22023'; end if;
 select v.position_id into pos from public.vacancies v where v.organization_id=p_organization_id and v.id=p_vacancy_id
 and v.status<>'cancelled' and v.current_version_id is not null for update;
 if not found then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 select * into proc from public.position_evaluation_processes where organization_id=p_organization_id and start_request_id=p_request_id;
 if proc.id is not null then
  if proc.vacancy_id<>p_vacancy_id then raise exception 'FOLLOW_UP_REPLAY_MISMATCH' using errcode='22023'; end if;
  return public.get_position_follow_up_process(p_organization_id,p_vacancy_id,proc.id);
 end if;
 select p.status into occupation from public.positions p where p.organization_id=p_organization_id and p.id=pos for update;
 if occupation is distinct from 'vacant'::public.position_status then raise exception 'SELECTION_POSITION_OCCUPIED' using errcode='22023'; end if;
 select * into prior from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and is_current for update;
 if prior.id is distinct from p_process_id or prior.revision is distinct from p_revision then raise exception 'FOLLOW_UP_CONFLICT' using errcode='40001'; end if;
 if exists(select 1 from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id and status='active')
 then raise exception 'SELECTION_ACTIVE_PROCESS_EXISTS' using errcode='22023'; end if;
 select coalesce(max(sequence),0)+1 into next_sequence from public.position_evaluation_processes where organization_id=p_organization_id and vacancy_id=p_vacancy_id;
 if prior.id is not null then update public.position_evaluation_processes set is_current=false,revision=revision+1 where id=prior.id; end if;
 insert into public.position_evaluation_processes(organization_id,vacancy_id,name,sequence,start_request_id)
 values(p_organization_id,p_vacancy_id,'Processo '||lpad(next_sequence::text,2,'0'),next_sequence,p_request_id) returning * into proc;
 select full_name into actor_name from public.platform_users where auth_user_id=actor;
 insert into public.position_evaluation_history(organization_id,process_id,actor_id,actor_name,action,after_data)
 values(p_organization_id,proc.id,actor,actor_name,'start_process',jsonb_build_object('previousProcessId',prior.id,'positionVersionId',(select current_version_id from public.vacancies where organization_id=p_organization_id and id=p_vacancy_id)));
 return public.get_position_follow_up_process(p_organization_id,p_vacancy_id,proc.id);
end $$;

create function private.selection_process_summary(p_org uuid,p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('organizationId',p.organization_id,'id',p.id,'vacancyId',v.id,'title',v.title,
 'name','Processo '||lpad(p.sequence::text,2,'0'),'sequence',p.sequence,'status',p.status,'revision',p.revision,
 'isCurrent',p.is_current,'occupancy',pos.status,'createdAt',p.created_at,
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
revoke all on function private.selection_process_summary(uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_selection_process_workspace(p_organization_id uuid,p_search text default '',
 p_status text default 'all',p_offset integer default 0,p_selected_process_id uuid default null,p_vacancy_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; selected jsonb; total integer; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_status not in ('all','active','closed') or p_status is null or p_offset is null or p_offset<0 or p_offset>1000000
 or p_search is null or length(p_search)>200 then raise exception 'SELECTION_INVALID_FILTER' using errcode='22023'; end if;
 if p_selected_process_id is not null then
  selected:=private.selection_process_summary(p_organization_id,p_selected_process_id);
  if selected is null then raise exception 'FOLLOW_UP_NOT_FOUND' using errcode='42501'; end if;
 end if;
 select count(*) into total from public.position_evaluation_processes p join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id
 where p.organization_id=p_organization_id and (p_vacancy_id is null or v.id=p_vacancy_id)
 and (p_status='all' or p.status=p_status) and (p_search='' or strpos(lower(v.title||' Processo '||lpad(p.sequence::text,2,'0')),lower(btrim(p_search)))>0);
 select coalesce(jsonb_agg(private.selection_process_summary(p_organization_id,p.id) order by p.created_at desc,p.id),'[]') into rows
 from (select p.* from public.position_evaluation_processes p join public.vacancies v on v.organization_id=p.organization_id and v.id=p.vacancy_id
 where p.organization_id=p_organization_id and (p_vacancy_id is null or v.id=p_vacancy_id)
 and (p_status='all' or p.status=p_status) and (p_search='' or strpos(lower(v.title||' Processo '||lpad(p.sequence::text,2,'0')),lower(btrim(p_search)))>0)
 order by p.created_at desc,p.id limit 50 offset p_offset) p;
 return jsonb_build_object('contract','selection-process-management-1.0.0','organizationId',p_organization_id,
 'processes',rows,'selected',selected,'total',total,'pageSize',50,'counts',
 (select jsonb_build_object('active',count(*) filter(where status='active'),'closed',count(*) filter(where status='closed'))
 from public.position_evaluation_processes where organization_id=p_organization_id and (p_vacancy_id is null or vacancy_id=p_vacancy_id)));
end $$;

create function public.get_selection_process_positions(p_organization_id uuid,p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; total integer; begin
 perform private.authorize_position_follow_up(p_organization_id);
 if p_search is null or length(p_search)>200 or p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'SELECTION_INVALID_FILTER' using errcode='22023'; end if;
 select count(*) into total from public.vacancies v join public.positions pos on pos.organization_id=v.organization_id and pos.id=v.position_id
 where v.organization_id=p_organization_id and v.status<>'cancelled' and v.current_version_id is not null and pos.status='vacant'
 and not exists(select 1 from public.position_evaluation_processes p where p.organization_id=v.organization_id and p.vacancy_id=v.id and p.status='active')
 and (p_search='' or strpos(lower(v.title),lower(btrim(p_search)))>0);
 select coalesce(jsonb_agg(jsonb_build_object('organizationId',v.organization_id,'id',v.id,'title',v.title,'processId',p.id,'revision',p.revision) order by v.title,v.id),'[]') into rows
 from (select v.* from public.vacancies v join public.positions pos on pos.organization_id=v.organization_id and pos.id=v.position_id
 where v.organization_id=p_organization_id and v.status<>'cancelled' and v.current_version_id is not null and pos.status='vacant'
 and not exists(select 1 from public.position_evaluation_processes p where p.organization_id=v.organization_id and p.vacancy_id=v.id and p.status='active')
 and (p_search='' or strpos(lower(v.title),lower(btrim(p_search)))>0) order by v.title,v.id limit 50 offset p_offset) v
 left join public.position_evaluation_processes p on p.organization_id=v.organization_id and p.vacancy_id=v.id and p.is_current;
 return jsonb_build_object('contract','selection-process-management-1.0.0','organizationId',p_organization_id,'positions',rows,'total',total,'pageSize',50);
end $$;
revoke all on function public.get_selection_process_workspace(uuid,text,text,integer,uuid,uuid),public.get_selection_process_positions(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_selection_process_workspace(uuid,text,text,integer,uuid,uuid),public.get_selection_process_positions(uuid,text,integer) to authenticated;
-- Existing start RPC ACL is preserved by CREATE OR REPLACE.
