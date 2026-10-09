-- One-time protected setup and purpose-bound drain of human-requested deliveries.
create table private.position_assessment_operational_config (
 id boolean primary key default true check(id), bootstrap_hash text check(bootstrap_hash ~ '^[a-f0-9]{64}$'),
 resend_cipher bytea, dispatcher_hash text check(dispatcher_hash ~ '^[a-f0-9]{64}$'), installed_at timestamptz,
 check((installed_at is null and resend_cipher is null and dispatcher_hash is null) or
       (installed_at is not null and resend_cipher is not null and dispatcher_hash is not null and bootstrap_hash is null))
);
revoke all on private.position_assessment_operational_config from public,anon,authenticated,service_role;
create function public.install_position_assessment_configuration(p_secret text,p_resend_key text,p_dispatcher_secret text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.position_assessment_operational_config; begin
 select * into c from private.position_assessment_operational_config where id for update;
 if c.installed_at is not null or length(coalesce(p_secret,''))<40 or c.bootstrap_hash is distinct from encode(extensions.digest(p_secret,'sha256'),'hex') then raise exception 'PA_SETUP_DENIED' using errcode='42501'; end if;
 if p_resend_key !~ '^re_[a-zA-Z0-9_-]{15,200}$' or p_resend_key is null or length(coalesce(p_dispatcher_secret,''))<40 then raise exception 'PA_SETUP_INVALID' using errcode='22023'; end if;
 update private.position_assessment_operational_config set bootstrap_hash=null,
 resend_cipher=extensions.pgp_sym_encrypt(p_resend_key,(select value from private.position_assessment_key),'cipher-algo=aes256'),
 dispatcher_hash=encode(extensions.digest(p_dispatcher_secret,'sha256'),'hex'),installed_at=now() where id;
 return true;
end $$;
revoke all on function public.install_position_assessment_configuration(text,text,text) from public;
grant execute on function public.install_position_assessment_configuration(text,text,text) to anon,authenticated;
create function public.position_assessment_email_configuration() returns text
language plpgsql security definer set search_path='' as $$ begin
 return (select extensions.pgp_sym_decrypt(resend_cipher,(select value from private.position_assessment_key)) from private.position_assessment_operational_config where installed_at is not null);
end $$;
revoke all on function public.position_assessment_email_configuration() from public,anon,authenticated;
grant execute on function public.position_assessment_email_configuration() to service_role;
alter table public.position_assessment_deliveries add column next_attempt_at timestamptz not null default now();
create function public.position_assessment_pending_deliveries(p_secret text) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 if length(coalesce(p_secret,''))<40 or not exists(select 1 from private.position_assessment_operational_config where installed_at is not null and dispatcher_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'PA_DISPATCHER_DENIED' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'organizationId',d.organization_id)) from
 (select id,organization_id from public.position_assessment_deliveries where next_attempt_at<=now()
 and (state='queued' or (state='sending' and lease_until<=now())) order by created_at limit 10) d),'[]');
end $$;
revoke all on function public.position_assessment_pending_deliveries(text) from public,anon,authenticated;
grant execute on function public.position_assessment_pending_deliveries(text) to service_role;
create function private.pa_delivery_backoff() returns trigger language plpgsql set search_path='' as $$ begin
 if new.state='queued' then new.next_attempt_at:=now()+make_interval(secs=>least(300,15*power(2,least(new.tries,4)))::integer); end if;
 return new;
end $$;
revoke all on function private.pa_delivery_backoff() from public,anon,authenticated,service_role;
create trigger position_assessment_delivery_backoff before update of state on public.position_assessment_deliveries for each row execute function private.pa_delivery_backoff();
