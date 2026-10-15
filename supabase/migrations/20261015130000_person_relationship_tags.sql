-- Current presentation only. Legacy lifecycle and its audit history remain intact.
begin;
create function public.get_person_relationship_tags(p_organization_id uuid,p_person_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.authorize_position_follow_up(p_organization_id);
 if coalesce(cardinality(p_person_ids),0)>200 then raise exception 'PERSON_TAG_SCOPE_LIMIT' using errcode='22023'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('personId',p.id,'isCandidate',exists(
   select 1 from public.position_evaluation_entries e
   join public.position_evaluation_processes s on s.organization_id=e.organization_id and s.id=e.process_id
   where e.organization_id=p.organization_id and e.person_id=p.id and s.status='active' and p.operational_status='active'
     and e.stage in ('awaiting_evaluation','evaluating','awaiting_interview','interview_scheduled','awaiting_decision','decision_recorded')
     and coalesce(e.details#>>'{decision,outcome}','')<>'do_not_proceed'
 ))) from public.people p where p.organization_id=p_organization_id and p.id=any(p_person_ids)),'[]'::jsonb);
end $$;
revoke all on function public.get_person_relationship_tags(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.get_person_relationship_tags(uuid,uuid[]) to authenticated;
commit;
