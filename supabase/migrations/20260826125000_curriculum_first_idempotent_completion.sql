create or replace function public.complete_resume_intake(
  p_organization_id uuid,
  p_intake_id uuid,
  p_document_id uuid
)
returns public.resume_intake_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  claimed public.resume_intakes;
begin
  actor_id := private.require_document_reviewer(p_organization_id);
  select * into claimed from public.resume_intakes intake
  where intake.organization_id = p_organization_id and intake.id = p_intake_id
  for update;
  if not found or claimed.resolved_document_id is distinct from p_document_id then
    raise exception using errcode = 'P0002', message = 'resolved resume intake document not found';
  end if;
  if claimed.status in ('ready_for_review', 'completed') then
    return claimed.status;
  end if;
  if not exists (
    select 1 from public.documents document
    where document.organization_id = p_organization_id and document.id = p_document_id
      and document.person_id = claimed.resolved_person_id and document.status = 'ready_for_review'
  ) then
    raise exception using errcode = '23514', message = 'document is not ready for review';
  end if;
  update public.resume_intakes set status = 'ready_for_review'
  where organization_id = p_organization_id and id = p_intake_id;
  insert into public.person_ingestion_events (
    organization_id, person_id, document_id, actor_auth_user_id, event_type, result, metadata
  ) values (
    p_organization_id, claimed.resolved_person_id, p_document_id, actor_id,
    'resume_intake_ready_for_review', 'success', jsonb_build_object('intake_id', p_intake_id)
  );
  return 'ready_for_review';
end;
$$;

revoke all on function public.complete_resume_intake(uuid, uuid, uuid) from public, anon;
grant execute on function public.complete_resume_intake(uuid, uuid, uuid) to authenticated;
