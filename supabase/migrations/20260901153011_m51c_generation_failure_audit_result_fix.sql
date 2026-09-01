begin;

create or replace function public.fail_m51c_external_generation(
  p_request_id uuid,
  p_error_class text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.assessment_item_generation_requests;
begin
  select * into request_record from public.assessment_item_generation_requests
  where id = p_request_id for update;
  if request_record.id is null or request_record.provider <> 'external' then
    raise exception 'M51C_REQUEST_NOT_FAILABLE';
  end if;
  if request_record.status = 'failed' then
    return jsonb_build_object('requestId', request_record.id, 'status', 'failed', 'replayed', true);
  end if;
  if request_record.status not in ('queued', 'processing') then raise exception 'M51C_REQUEST_NOT_FAILABLE'; end if;
  update public.assessment_item_generation_requests
  set status = 'failed', completed_at = now()
  where id = request_record.id;
  insert into public.assessment_ai_budget_ledger (
    organization_id, generation_request_id, entry_type, amount_cents,
    provider, model, usage_metadata, created_by_auth_user_id
  ) values (
    request_record.organization_id, request_record.id, 'release',
    -coalesce(request_record.estimated_cost_cents, 0), request_record.provider,
    request_record.model,
    jsonb_build_object('reservationReleased', true, 'errorClass', left(coalesce(p_error_class, 'provider_failure'), 80)),
    request_record.created_by_auth_user_id
  );
  update public.assessment_item_generation_needs
  set status = 'failed', updated_at = now()
  where id = request_record.generation_need_id;
  insert into public.verification_audit_events (
    organization_id, actor_auth_user_id, action, result, payload
  ) values (
    request_record.organization_id, request_record.created_by_auth_user_id,
    'm51c_generation_failed', 'failure',
    jsonb_build_object(
      'request_id', request_record.id,
      'error_class', left(coalesce(p_error_class, 'provider_failure'), 80)
    )
  );
  return jsonb_build_object('requestId', request_record.id, 'status', 'failed', 'replayed', false);
end;
$$;

revoke all on function public.fail_m51c_external_generation(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.fail_m51c_external_generation(uuid, text) to service_role;

commit;
