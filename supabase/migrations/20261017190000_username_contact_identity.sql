-- operator-identity2.0.0. Preserve Auth UUIDs, passwords, memberships and history.
drop index public.platform_users_email_unique_idx;
create index platform_users_email_idx on public.platform_users(lower(email));

create table private.operator_access_email_requests (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 actor_auth_user_id uuid references auth.users(id) on delete set null,
 organization_id uuid references public.organizations(id),
 purpose text not null check(purpose in ('activation','recovery')),
 requested_at timestamptz not null default clock_timestamp(),
 state text not null default 'preparing' check(state in ('preparing','accepted','failed','unknown')),
 provider_id text,
 check(provider_id is null or length(provider_id) between 1 and 200)
);
alter table private.operator_access_email_requests enable row level security;
revoke all on private.operator_access_email_requests from public,anon,authenticated,service_role;
create index operator_access_email_user_time_idx on private.operator_access_email_requests(auth_user_id,requested_at desc);

create function public.operator_access_email_configuration() returns text
language sql security definer set search_path='' as $$
 select public.position_assessment_email_configuration();
$$;
revoke all on function public.operator_access_email_configuration() from public,anon,authenticated;
grant execute on function public.operator_access_email_configuration() to service_role;

create function public.claim_operator_access_email(p_auth_user uuid,p_purpose text,p_actor uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.platform_users; request_id uuid; begin
 if p_purpose not in ('activation','recovery') or p_purpose is null then raise exception 'ACCESS_EMAIL_PURPOSE_INVALID' using errcode='22023'; end if;
 select * into u from public.platform_users where auth_user_id=p_auth_user for update;
 if u.id is null or u.status not in ('active','pending_first_access') then return null; end if;
 if exists(select 1 from private.operator_access_email_requests where auth_user_id=p_auth_user and requested_at>clock_timestamp()-interval '60 seconds')
 or (select count(*) from private.operator_access_email_requests where auth_user_id=p_auth_user and requested_at>clock_timestamp()-interval '1 hour')>=3 then return null; end if;
 insert into private.operator_access_email_requests(auth_user_id,actor_auth_user_id,organization_id,purpose)
 values(p_auth_user,p_actor,(select organization_id from public.organization_memberships where user_id=p_auth_user order by organization_id limit 1),p_purpose) returning id into request_id;
 return jsonb_build_object('requestId',request_id,'username',u.username,'email',u.email);
end $$;
revoke all on function public.claim_operator_access_email(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_operator_access_email(uuid,text,uuid) to service_role;

create function public.finish_operator_access_email(p_request uuid,p_state text,p_provider text default null) returns void
language plpgsql security definer set search_path='' as $$ begin
 if p_state not in ('accepted','failed','unknown') or p_state is null then raise exception 'ACCESS_EMAIL_STATE_INVALID' using errcode='22023'; end if;
 update private.operator_access_email_requests set state=p_state,provider_id=p_provider where id=p_request and state='preparing';
 if not found then raise exception 'ACCESS_EMAIL_REQUEST_INVALID' using errcode='22023'; end if;
end $$;
revoke all on function public.finish_operator_access_email(uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_operator_access_email(uuid,text,text) to service_role;
