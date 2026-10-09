-- Add only current registered city/state to the existing authorized follow-up read.
-- No snapshot fallback, new grants, data writes or full Profile exposure.
create or replace function public.get_position_follow_up(p_organization_id uuid,p_vacancy_id uuid default null,p_person_id uuid default null)
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
 return jsonb_build_object('contract','position-follow-up-1.0.0','process',case when proc.id is null then null else jsonb_build_object('id',proc.id,'name',proc.name,'status',proc.status,'revision',proc.revision) end,
 'entries',entries,'operators',operators,'history',hist);
end $$;
revoke all on function public.get_position_follow_up(uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.get_position_follow_up(uuid,uuid,uuid) to authenticated;
