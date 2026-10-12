begin;
-- Reuse the existing generated-question tariff and commercial ledger.
-- No policy activation, provider, model, prompt, tariff or budget is selected here.
alter function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text) set schema private;
alter function private.request_m51c_item_generation(uuid,uuid,integer,text,integer,text) rename to question_bank_request_before_tokens;
revoke all on function private.question_bank_request_before_tokens(uuid,uuid,integer,text,integer,text) from public,anon,authenticated,service_role;
create function public.request_m51c_item_generation(p_organization_id uuid,p_generation_need_id uuid,p_quantity integer,p_target_scope text,p_estimated_cost_cents integer,p_idempotency_key text,p_token_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
 perform private.m51c_require_governance(p_organization_id,p_target_scope='global');
 v:=private.question_bank_request_before_tokens(p_organization_id,p_generation_need_id,p_quantity,p_target_scope,p_estimated_cost_cents,p_idempotency_key);
 if v->>'status' in ('completed','failed','cancelled') then return v;end if;
 if p_token_quote_id is null then raise exception 'PT_QUOTE_REQUIRED' using errcode='22023';end if;
 perform private.prisma_token_ensure(p_organization_id);
 perform private.prisma_token_reserve(p_organization_id,'position_assessment_items',(v->>'requestId')::uuid,p_token_quote_id,p_quantity);
 return v;
end $$;
revoke all on function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_m51c_item_generation(uuid,uuid,integer,text,integer,text,uuid) to authenticated;

alter function public.complete_m51c_external_generation(uuid,jsonb,jsonb) set schema private;
alter function private.complete_m51c_external_generation(uuid,jsonb,jsonb) rename to question_bank_complete_before_tokens;
revoke all on function private.question_bank_complete_before_tokens(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.complete_m51c_external_generation(p_request_id uuid,p_proposals jsonb,p_usage jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; org uuid;
begin
 select organization_id into org from public.assessment_item_generation_requests where id=p_request_id and provider='external' for update;
 if not found then raise exception 'M51C_REQUEST_NOT_COMPLETABLE';end if;
 v:=private.question_bank_complete_before_tokens(p_request_id,p_proposals,p_usage);
 perform private.prisma_token_settle(org,'position_assessment_items',p_request_id,true);
 return v;
end $$;
revoke all on function public.complete_m51c_external_generation(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.complete_m51c_external_generation(uuid,jsonb,jsonb) to service_role;

alter function public.fail_m51c_external_generation(uuid,text) set schema private;
alter function private.fail_m51c_external_generation(uuid,text) rename to question_bank_fail_before_tokens;
revoke all on function private.question_bank_fail_before_tokens(uuid,text) from public,anon,authenticated,service_role;
create function public.fail_m51c_external_generation(p_request_id uuid,p_error_class text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v jsonb; org uuid;
begin
 select organization_id into org from public.assessment_item_generation_requests where id=p_request_id and provider='external' for update;
 if not found then raise exception 'M51C_REQUEST_NOT_FAILABLE';end if;
 v:=private.question_bank_fail_before_tokens(p_request_id,p_error_class);
 perform private.prisma_token_settle(org,'position_assessment_items',p_request_id,false);
 return v;
end $$;
revoke all on function public.fail_m51c_external_generation(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.fail_m51c_external_generation(uuid,text) to service_role;
commit;
