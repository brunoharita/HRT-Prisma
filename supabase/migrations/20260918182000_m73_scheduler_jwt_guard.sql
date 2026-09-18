-- Forward-only correction: retain the existing Edge gateway JWT guard, plus Vault authentication.
select cron.alter_job(job_id:=jobid,active:=false) from cron.job where jobname='prisma-profile-competency-normalization';

create function public.configure_profile_competency_scheduler(p_gateway_jwt text) returns bigint
language plpgsql security definer set search_path='' as $$
declare v_url text; v_secret uuid; v_job bigint; v_payload text; v_claims jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name='knowledge_source_monitor_project_url' order by created_at desc limit 1;
  if v_url is null or not exists(select 1 from vault.secrets where name='knowledge_source_monitor_secret') then raise exception 'M73_SCHEDULER_CONFIGURATION_REQUIRED'; end if;
  -- Only the already-existing public anon JWT is accepted, never a service-role credential.
  v_payload:=translate(split_part(p_gateway_jwt,'.',2),'-_','+/');
  v_claims:=convert_from(decode(v_payload||repeat('=',(4-length(v_payload)%4)%4),'base64'),'utf8')::jsonb;
  if coalesce(v_claims->>'role','')<>'anon' or coalesce(v_claims->>'ref','')<>split_part(split_part(v_url,'://',2),'.',1)
    or coalesce((v_claims->>'exp')::bigint,0)<=extract(epoch from now()) then raise exception 'M73_GATEWAY_ANON_JWT_REQUIRED'; end if;
  select id into v_secret from vault.secrets where name='profile_competency_normalization_gateway_jwt' limit 1;
  if v_secret is null then
    perform vault.create_secret(p_gateway_jwt,'profile_competency_normalization_gateway_jwt','Existing public anon JWT for M73 Edge gateway validation');
  else
    perform vault.update_secret(v_secret,p_gateway_jwt,'profile_competency_normalization_gateway_jwt','Existing public anon JWT for M73 Edge gateway validation');
  end if;
  select cron.schedule('prisma-profile-competency-normalization','* * * * *',$cron$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_project_url' order by created_at desc limit 1)||'/functions/v1/knowledge-agent',
      headers:=jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='profile_competency_normalization_gateway_jwt' order by created_at desc limit 1),
        'x-prisma-monitor-secret',(select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_secret' order by created_at desc limit 1)),
      body:='{"mode":"competency_normalization"}'::jsonb,timeout_milliseconds:=120000)
    where exists(select 1 from public.profile_competency_normalization_runs where attempts<3 and
      ((status in ('queued','failed') and available_at<=now()) or (status='processing' and started_at<now()-interval '5 minutes')));
  $cron$) into v_job;
  perform cron.alter_job(job_id:=v_job,active:=true);
  return v_job;
end $$;
revoke all on function public.configure_profile_competency_scheduler(text) from public,anon,authenticated;
grant execute on function public.configure_profile_competency_scheduler(text) to service_role;
