-- Uses the established pg_cron/pg_net + Vault authentication boundary. No secret is exposed.
do $$
begin
  if not exists(select 1 from vault.secrets where name='knowledge_source_monitor_secret')
    or not exists(select 1 from vault.secrets where name='knowledge_source_monitor_project_url') then
    raise exception 'M73_SCHEDULER_CONFIGURATION_REQUIRED';
  end if;
  perform cron.schedule('prisma-profile-competency-normalization','* * * * *',$cron$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_project_url' order by created_at desc limit 1)||'/functions/v1/knowledge-agent',
      headers:=jsonb_build_object('Content-Type','application/json','x-prisma-monitor-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='knowledge_source_monitor_secret' order by created_at desc limit 1)),
      body:='{"mode":"competency_normalization"}'::jsonb,timeout_milliseconds:=120000)
    where exists(select 1 from public.profile_competency_normalization_runs where attempts<3 and
      ((status in ('queued','failed') and available_at<=now()) or (status='processing' and started_at<now()-interval '5 minutes')));
  $cron$);
end $$;
