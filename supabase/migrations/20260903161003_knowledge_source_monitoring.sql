-- Monthly, source-aware monitoring for Prisma's three central occupational bases.
-- Detection is automatic; publication remains an explicit Super Admin decision.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.knowledge_sources
  add column monitoring_enabled boolean not null default false,
  add column monitor_strategy text,
  add column monitor_url text,
  add column monitor_status text not null default 'not_checked',
  add column detected_version text,
  add column detected_release_date date,
  add column detected_fingerprint text,
  add column last_checked_at timestamptz,
  add column last_successful_check_at timestamptz,
  add column next_check_at timestamptz,
  add column consecutive_check_failures integer not null default 0,
  add column last_check_error_code text;

alter table public.knowledge_sources
  add constraint knowledge_sources_monitor_strategy_check
    check (monitor_strategy is null or monitor_strategy in ('cbo_downloads', 'esco_release_page', 'onet_database_page')),
  add constraint knowledge_sources_monitor_url_check
    check (monitor_url is null or monitor_url ~ '^https://'),
  add constraint knowledge_sources_monitor_status_check
    check (monitor_status in ('not_checked', 'current', 'update_available', 'action_required', 'temporary_failure', 'validation_failed')),
  add constraint knowledge_sources_detected_fingerprint_check
    check (detected_fingerprint is null or detected_fingerprint ~ '^[0-9a-f]{64}$'),
  add constraint knowledge_sources_check_failures_check
    check (consecutive_check_failures >= 0 and consecutive_check_failures <= 4),
  add constraint knowledge_sources_monitor_configuration_check
    check (not monitoring_enabled or (monitor_strategy is not null and monitor_url is not null));

create table public.knowledge_source_checks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete restrict,
  invocation_type text not null check (invocation_type in ('scheduled', 'retry', 'manual')),
  attempt integer not null check (attempt between 1 and 4),
  status text not null check (status in ('current', 'update_available', 'action_required', 'temporary_failure', 'validation_failed')),
  detected_version text,
  detected_release_date date,
  detected_fingerprint text check (detected_fingerprint is null or detected_fingerprint ~ '^[0-9a-f]{64}$'),
  artifacts jsonb not null default '{}'::jsonb check (jsonb_typeof(artifacts) = 'object'),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,80}$'),
  monitor_version text not null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (completed_at >= started_at),
  check ((status in ('temporary_failure', 'validation_failed')) = (error_code is not null))
);

create index knowledge_source_checks_source_created_idx
on public.knowledge_source_checks (source_id, created_at desc);

alter table public.knowledge_source_checks enable row level security;

create policy knowledge_source_checks_super_admin_read
on public.knowledge_source_checks
for select to authenticated
using ((select private.is_super_admin((select auth.uid()))));

revoke all on table public.knowledge_source_checks from public, anon, authenticated;
grant select on table public.knowledge_source_checks to authenticated;

create or replace function private.next_knowledge_source_monthly_check(p_from timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    date_trunc('month', timezone('America/Sao_Paulo', p_from))
    + interval '1 month'
    + interval '1 hour'
  ) at time zone 'America/Sao_Paulo';
$$;

create or replace function public.authorize_knowledge_source_monitor(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_secret text;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_secret is null or char_length(p_secret) < 32 then
    return false;
  end if;

  select secret.decrypted_secret
  into v_expected_secret
  from vault.decrypted_secrets secret
  where secret.name = 'knowledge_source_monitor_secret'
  order by secret.created_at desc
  limit 1;

  return v_expected_secret is not null
    and extensions.digest(p_secret, 'sha256') = extensions.digest(v_expected_secret, 'sha256');
end;
$$;

create or replace function public.record_knowledge_source_check(
  p_source_id uuid,
  p_trigger text,
  p_status text,
  p_detected_version text,
  p_detected_release_date date,
  p_detected_fingerprint text,
  p_artifacts jsonb,
  p_error_code text,
  p_monitor_version text,
  p_idempotency_key text,
  p_started_at timestamptz,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.knowledge_sources%rowtype;
  v_check_id uuid;
  v_attempt integer;
  v_next_check_at timestamptz;
  v_replayed boolean := false;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into v_source
  from public.knowledge_sources
  where id = p_source_id
    and monitoring_enabled
    and name in ('CBO', 'ESCO', 'O*NET')
  for update;

  if not found then
    raise exception 'monitored source not found' using errcode = '22023';
  end if;

  if p_trigger not in ('scheduled', 'retry', 'manual')
    or p_status not in ('current', 'update_available', 'action_required', 'temporary_failure', 'validation_failed')
    or p_monitor_version is null
    or p_idempotency_key is null
    or char_length(p_idempotency_key) not between 16 and 180
    or p_completed_at < p_started_at
    or jsonb_typeof(coalesce(p_artifacts, '{}'::jsonb)) <> 'object'
    or (p_detected_fingerprint is not null and p_detected_fingerprint !~ '^[0-9a-f]{64}$')
    or ((p_status in ('temporary_failure', 'validation_failed')) <> (p_error_code is not null)) then
    raise exception 'invalid knowledge source check payload' using errcode = '22023';
  end if;

  if p_error_code is not null and p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'invalid monitor error code' using errcode = '22023';
  end if;

  v_attempt := case
    when p_status in ('temporary_failure', 'validation_failed') then least(v_source.consecutive_check_failures + 1, 4)
    else 1
  end;

  insert into public.knowledge_source_checks (
    source_id, invocation_type, attempt, status, detected_version, detected_release_date,
    detected_fingerprint, artifacts, error_code, monitor_version, idempotency_key,
    started_at, completed_at
  ) values (
    p_source_id, p_trigger, v_attempt, p_status, nullif(btrim(p_detected_version), ''),
    p_detected_release_date, p_detected_fingerprint, coalesce(p_artifacts, '{}'::jsonb),
    p_error_code, p_monitor_version, p_idempotency_key, p_started_at, p_completed_at
  )
  on conflict (idempotency_key) do nothing
  returning id into v_check_id;

  if v_check_id is null then
    select id into v_check_id
    from public.knowledge_source_checks
    where idempotency_key = p_idempotency_key;
    v_replayed := true;
    return jsonb_build_object('checkId', v_check_id, 'replayed', v_replayed);
  end if;

  if p_status in ('temporary_failure', 'validation_failed') then
    v_next_check_at := case v_attempt
      when 1 then p_completed_at + interval '6 hours'
      when 2 then p_completed_at + interval '24 hours'
      when 3 then p_completed_at + interval '72 hours'
      else private.next_knowledge_source_monthly_check(p_completed_at)
    end;
  else
    v_next_check_at := private.next_knowledge_source_monthly_check(p_completed_at);
  end if;

  update public.knowledge_sources
  set monitor_status = p_status,
      detected_version = coalesce(nullif(btrim(p_detected_version), ''), detected_version),
      detected_release_date = coalesce(p_detected_release_date, detected_release_date),
      detected_fingerprint = coalesce(p_detected_fingerprint, detected_fingerprint),
      last_checked_at = p_completed_at,
      last_successful_check_at = case
        when p_status in ('current', 'update_available', 'action_required') then p_completed_at
        else last_successful_check_at
      end,
      next_check_at = v_next_check_at,
      consecutive_check_failures = case
        when p_status in ('temporary_failure', 'validation_failed') then v_attempt
        else 0
      end,
      last_check_error_code = p_error_code,
      updated_at = now()
  where id = p_source_id;

  if p_status in ('current', 'update_available', 'action_required')
    and nullif(btrim(p_detected_version), '') is not null then
    insert into public.knowledge_source_versions (
      source_id, external_version, release_date, retrieval_date, checksum_sha256,
      format, license, import_status, warnings, official_url, validation_summary
    ) values (
      p_source_id,
      btrim(p_detected_version),
      p_detected_release_date,
      p_completed_at,
      null,
      case v_source.name when 'CBO' then 'CSV' when 'ESCO' then 'CSV/RDF/ODS' else 'database files' end,
      v_source.license,
      'catalogued',
      case when p_status = 'current' then '[]'::jsonb else jsonb_build_array('Nova versão detectada automaticamente; publicação depende de validação e aprovação humana.') end,
      v_source.monitor_url,
      jsonb_build_object('monitorVersion', p_monitor_version, 'detectedAt', p_completed_at, 'artifacts', coalesce(p_artifacts, '{}'::jsonb))
    )
    on conflict (source_id, external_version) do update
    set release_date = coalesce(excluded.release_date, public.knowledge_source_versions.release_date),
        retrieval_date = excluded.retrieval_date,
        checksum_sha256 = coalesce(public.knowledge_source_versions.checksum_sha256, excluded.checksum_sha256),
        official_url = coalesce(public.knowledge_source_versions.official_url, excluded.official_url),
        validation_summary = public.knowledge_source_versions.validation_summary || excluded.validation_summary;
  end if;

  return jsonb_build_object('checkId', v_check_id, 'replayed', v_replayed, 'nextCheckAt', v_next_check_at);
end;
$$;

create or replace function public.configure_knowledge_source_monitor(p_project_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_secret_id uuid;
  v_monitor_secret_id uuid;
  v_job record;
  v_job_id bigint;
begin
  if session_user <> 'postgres' and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_project_url is null or p_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$' then
    raise exception 'valid Supabase project URL required' using errcode = '22023';
  end if;

  select id into v_project_secret_id from vault.secrets where name = 'knowledge_source_monitor_project_url' limit 1;
  if v_project_secret_id is null then
    select vault.create_secret(p_project_url, 'knowledge_source_monitor_project_url', 'Prisma knowledge monitor project URL') into v_project_secret_id;
  else
    perform vault.update_secret(v_project_secret_id, p_project_url, 'knowledge_source_monitor_project_url', 'Prisma knowledge monitor project URL');
  end if;

  select id into v_monitor_secret_id from vault.secrets where name = 'knowledge_source_monitor_secret' limit 1;
  if v_monitor_secret_id is null then
    select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'knowledge_source_monitor_secret', 'Prisma knowledge monitor invocation secret') into v_monitor_secret_id;
  end if;

  for v_job in select jobid from cron.job where jobname = 'prisma-knowledge-source-monitor-due' loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  select cron.schedule(
    'prisma-knowledge-source-monitor-due',
    '0 * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'knowledge_source_monitor_project_url' order by created_at desc limit 1) || '/functions/v1/knowledge-source-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-prisma-monitor-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'knowledge_source_monitor_secret' order by created_at desc limit 1)
        ),
        body := '{"trigger":"due"}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cron$
  ) into v_job_id;

  update public.knowledge_sources
  set next_check_at = coalesce(next_check_at, private.next_knowledge_source_monthly_check(now())),
      updated_at = now()
  where monitoring_enabled;

  return jsonb_build_object('jobId', v_job_id, 'schedule', 'hourly due scan', 'timezone', 'America/Sao_Paulo');
end;
$$;

revoke all on function public.authorize_knowledge_source_monitor(text) from public, anon, authenticated;
revoke all on function public.record_knowledge_source_check(uuid, text, text, text, date, text, jsonb, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.configure_knowledge_source_monitor(text) from public, anon, authenticated;
grant execute on function public.authorize_knowledge_source_monitor(text) to service_role;
grant execute on function public.record_knowledge_source_check(uuid, text, text, text, date, text, jsonb, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.configure_knowledge_source_monitor(text) to service_role;

update public.knowledge_sources
set monitoring_enabled = true,
    monitor_strategy = case name
      when 'CBO' then 'cbo_downloads'
      when 'ESCO' then 'esco_release_page'
      when 'O*NET' then 'onet_database_page'
    end,
    monitor_url = case name
      when 'CBO' then 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads'
      when 'ESCO' then 'https://esco.ec.europa.eu/en/use-esco/download'
      when 'O*NET' then 'https://www.onetcenter.org/database.html'
    end,
    next_check_at = private.next_knowledge_source_monthly_check(now()),
    updated_at = now()
where name in ('CBO', 'ESCO', 'O*NET');

comment on column public.knowledge_sources.next_check_at is
  'Next real source check. Monthly checks are due at 01:00 America/Sao_Paulo; failures retry after 6h, 24h and 72h.';
comment on table public.knowledge_source_checks is
  'Append-only monitoring evidence. Detection never publishes a knowledge source version.';
comment on function public.configure_knowledge_source_monitor(text) is
  'Creates the private Vault invocation secret and an hourly due scanner; call once per Supabase environment after deploying the Edge Function.';
