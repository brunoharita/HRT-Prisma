-- Explicit recovery into the corrected contract, never reset legacy attempts/backfill.
create or replace function private.synthesis_can_retry(j public.profile_synthesis_jobs) returns boolean language sql stable set search_path='' as $$
 select j.state='failed' and j.available_at<=now() and (
  (j.contract_version='profile-synthesis-1.0.0' and j.prompt_version='profile-synthesis-prompt-1.0.0' and j.model_config='gpt-5.6-luna' and j.error_code='RESPONSE_INVALID'
   and coalesce(j.diagnostic->>'reason','') in ('','REFERENCES_INVALID','WORD_LIMIT','TEXT_INVALID','ANSWER_INVALID','CLARIFICATION_INVALID','STRUCTURE_INVALID','UNSUPPORTED_VERIFICATION'))
  or (j.attempts<3 and j.error_code in ('RESPONSE_INVALID','PROVIDER_UNAVAILABLE','RATE_LIMITED','REQUEST_INTERRUPTED')
   and coalesce(j.diagnostic->>'reason','') not in ('SOURCE_INVALID','MODEL_MISMATCH','REFUSAL','DATABASE_CONTRACT','USAGE_INVALID','UNSUPPORTED_VERIFICATION'))
 );
$$;
revoke all on function private.synthesis_can_retry(public.profile_synthesis_jobs) from public,anon,authenticated;
create or replace function public.retry_profile_synthesis(p_organization_id uuid,p_person_id uuid,p_profile_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; j public.profile_synthesis_jobs;
begin
 v:=public.load_profile_synthesis(p_organization_id,p_person_id,p_profile_id);
 select * into j from public.profile_synthesis_jobs where id=(v->>'jobId')::uuid and organization_id=p_organization_id and person_id=p_person_id and profile_id=(v->>'profileId')::uuid and basis_hash=v->>'basisHash' for update;
 if j.id is not null and private.synthesis_can_retry(j) then
  if j.contract_version='profile-synthesis-1.0.0' then perform private.enqueue_profile_synthesis(j.profile_id);
  else update public.profile_synthesis_jobs set state='queued',available_at=now() where id=j.id;
  end if;
 end if;
 return public.load_profile_synthesis(p_organization_id,p_person_id,p_profile_id);
end $$;
revoke all on function public.retry_profile_synthesis(uuid,uuid,uuid) from public,anon;
grant execute on function public.retry_profile_synthesis(uuid,uuid,uuid) to authenticated;
