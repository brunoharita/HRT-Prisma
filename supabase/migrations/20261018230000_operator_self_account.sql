-- operator-self-account-1.0.0. Contact is not the Auth credential (ADR-086).
create table private.operator_self_email_changes (
 id uuid primary key, auth_user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, organization_id uuid references public.organizations(id),
 old_email text not null, new_email text not null, code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 attempts integer not null default 0 check(attempts between 0 and 5),
 state text not null default 'pending' check(state in ('pending','confirmed','cancelled','expired','locked')),
 send_state text not null default 'preparing' check(send_state in ('preparing','accepted','failed','unknown')),
 provider_id text check(provider_id is null or length(provider_id) between 1 and 200)
);
create index operator_self_email_user_time_idx on private.operator_self_email_changes(auth_user_id,created_at desc);
create table private.operator_self_security_attempts (
 id uuid primary key default gen_random_uuid(),auth_user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,organization_id uuid references public.organizations(id),
 purpose text not null check(purpose in ('email','password')),
 created_at timestamptz not null default clock_timestamp(),
 state text not null default 'started' check(state in ('started','verified','rejected','changed','failed','unknown'))
);
create index operator_self_security_user_time_idx on private.operator_self_security_attempts(auth_user_id,created_at desc);
alter table private.operator_self_email_changes enable row level security;
alter table private.operator_self_security_attempts enable row level security;
revoke all on private.operator_self_email_changes,private.operator_self_security_attempts from public,anon,authenticated,service_role;

create function private.keep_owner_username_v313() returns trigger language plpgsql set search_path='' as $$begin
 if old.access_profile='owner' and new.username is distinct from old.username then
  raise exception 'O username do Owner é definido na criação e não pode ser alterado.' using errcode='42501';
 end if;return new;
end$$;
revoke all on function private.keep_owner_username_v313() from public,anon,authenticated,service_role;
create trigger platform_users_keep_owner_username before update of username on public.platform_users for each row execute function private.keep_owner_username_v313();

-- Narrow backend boundary: actor and session come only from an authenticated Edge.
create function public.operator_self_account_v313(p_actor uuid,p_session uuid,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.platform_users; before_u public.platform_users; e private.operator_self_email_changes; s private.operator_self_security_attempts;
 org uuid; revision text; request_id uuid; pending jsonb;
begin
 if p_actor is null or p_session is null or not exists(select 1 from auth.sessions where id=p_session and user_id=p_actor and (not_after is null or not_after>clock_timestamp())) then
  raise exception 'Sessão inválida. Entre novamente.' using errcode='42501';end if;
 select * into u from public.platform_users where auth_user_id=p_actor for update;
 if u.id is null or u.status<>'active' or u.must_change_password or u.access_profile not in ('super_admin','owner','admin','recruiter','member') then raise exception 'Cadastro indisponível nesta sessão.' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>6000 then raise exception 'Dados inválidos.' using errcode='22023';end if;
 select organization_id into org from public.organization_memberships where user_id=p_actor order by organization_id limit 1;
 revision:=md5(to_jsonb(u)::text);
 if p_action='read' then
  if p_data<>'{}'::jsonb then raise exception 'Leitura não aceita alvo ou campos.' using errcode='22023';end if;
  select jsonb_build_object('id',id,'email',new_email,'expiresAt',expires_at,'createdAt',created_at,'sendState',send_state)
   into pending from private.operator_self_email_changes where auth_user_id=p_actor and session_id=p_session and state='pending' and expires_at>clock_timestamp() and attempts<5 and old_email=u.email order by created_at desc limit 1;
  return jsonb_build_object('contract','operator-self-account-1.0.0','revision',revision,'fullName',u.full_name,'username',u.username,'email',u.email,
   'phoneCountryIso2',u.phone_country_iso2,'phoneNationalNumber',u.phone_national_number,'profile',u.access_profile,'status',u.status,
   'groupName',(select name from public.organization_groups where id=u.group_id),
   'companies',coalesce((select jsonb_agg(o.name order by o.name) from public.organization_memberships m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor),'[]'::jsonb),'pendingEmail',pending);
 elsif p_action='save' then
  if p_data-array['revision','fullName','username','phoneCountryIso2','phoneCountryLabel','phoneCountryCode','phoneNationalNumber','phoneE164']<>'{}'::jsonb then raise exception 'Campos protegidos não podem ser alterados.' using errcode='42501';end if;
  if p_data->>'revision' is distinct from revision then raise exception 'Cadastro atualizado em outra sessão. Recarregue antes de salvar.' using errcode='40001';end if;
  if length(btrim(p_data->>'fullName')) not between 2 and 160 or p_data->>'fullName' is null
   or p_data->>'username' is null or p_data->>'phoneCountryIso2' is null or p_data->>'phoneE164' !~ '^\+[0-9]{8,16}$'
   or p_data->>'phoneE164' is null or p_data->>'phoneNationalNumber' !~ '^[0-9]{8,13}$' or p_data->>'phoneNationalNumber' is null then raise exception 'Cadastro incompleto ou inválido.' using errcode='22023';end if;
  before_u:=u;
  update public.platform_users set full_name=btrim(p_data->>'fullName'),username=p_data->>'username',phone_country_iso2=p_data->>'phoneCountryIso2',
   phone_country_label=p_data->>'phoneCountryLabel',phone_country_code=p_data->>'phoneCountryCode',phone_national_number=p_data->>'phoneNationalNumber',phone_e164=p_data->>'phoneE164',updated_at=clock_timestamp() where id=u.id;
  insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,organization_id,action,previous_values,new_values)
   values(p_actor,u.id,p_actor,u.group_id,org,'self_account_updated',jsonb_build_object('fullName',before_u.full_name,'username',before_u.username,'phoneE164',before_u.phone_e164),jsonb_build_object('fullName',btrim(p_data->>'fullName'),'username',p_data->>'username','phoneE164',p_data->>'phoneE164'));
  return jsonb_build_object('ok',true);
 elsif p_action='security_begin' then
  if p_data-array['purpose']<>'{}'::jsonb or p_data->>'purpose' is null or p_data->>'purpose' not in ('email','password') then raise exception 'Ação inválida.' using errcode='22023';end if;
  if (select count(*) from private.operator_self_security_attempts where auth_user_id=p_actor and created_at>clock_timestamp()-interval '15 minutes')>=5 then raise exception 'Aguarde quinze minutos antes de tentar novamente.' using errcode='P0001';end if;
  insert into private.operator_self_security_attempts(auth_user_id,session_id,organization_id,purpose) values(p_actor,p_session,org,p_data->>'purpose') returning id into request_id;
  return jsonb_build_object('id',request_id);
 elsif p_action='security_finish' then
  if p_data-array['id','state']<>'{}'::jsonb then raise exception 'Ação inválida.' using errcode='22023';end if;
  select * into s from private.operator_self_security_attempts where id=(p_data->>'id')::uuid and auth_user_id=p_actor and session_id=p_session for update;
  if s.id is null or s.created_at<clock_timestamp()-interval '5 minutes' or not (s.state='started' and p_data->>'state' in ('verified','rejected')) then raise exception 'Confirmação de segurança inválida.' using errcode='42501';end if;
  update private.operator_self_security_attempts set state=p_data->>'state' where id=s.id;
  if s.purpose='password' then
   insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,organization_id,action,new_values)
   values(p_actor,u.id,p_actor,u.group_id,org,'self_password_'||(p_data->>'state'),jsonb_build_object('requestId',s.id));
  end if;
  return jsonb_build_object('ok',true);
 elsif p_action='email_begin' then
  if p_data-array['id','hash','email','securityId']<>'{}'::jsonb then raise exception 'Ação inválida.' using errcode='22023';end if;
  if not exists(select 1 from private.operator_self_security_attempts where id=(p_data->>'securityId')::uuid and auth_user_id=p_actor and session_id=p_session and purpose='email' and state='verified' and created_at>clock_timestamp()-interval '5 minutes') then raise exception 'Confirme a senha atual.' using errcode='42501';end if;
  if p_data->>'email' is null or length(p_data->>'email')>254 or p_data->>'email' !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' or p_data->>'email' like '%@users.prisma.invalid' or p_data->>'email'=u.email then raise exception 'Informe outro e-mail válido.' using errcode='22023';end if;
  if exists(select 1 from private.operator_self_email_changes where auth_user_id=p_actor and created_at>clock_timestamp()-interval '60 seconds') or (select count(*) from private.operator_self_email_changes where auth_user_id=p_actor and created_at>clock_timestamp()-interval '1 hour')>=3 then raise exception 'Aguarde para reenviar. Limite de três solicitações por hora.' using errcode='P0001';end if;
  update private.operator_self_email_changes set state='cancelled' where auth_user_id=p_actor and state='pending';
  insert into private.operator_self_email_changes(id,auth_user_id,session_id,organization_id,old_email,new_email,code_hash) values((p_data->>'id')::uuid,p_actor,p_session,org,u.email,p_data->>'email',p_data->>'hash') returning * into e;
  return jsonb_build_object('id',e.id,'email',e.new_email,'username',u.username);
 elsif p_action in ('email_receipt','email_cancel','email_confirm') then
  if p_data-array['id','hash','state','providerId']<>'{}'::jsonb then raise exception 'Ação inválida.' using errcode='22023';end if;
  select * into e from private.operator_self_email_changes where id=(p_data->>'id')::uuid and auth_user_id=p_actor and session_id=p_session for update;
  if e.id is null then raise exception 'Solicitação indisponível.' using errcode='42501';end if;
  if p_action='email_receipt' then
   if e.send_state<>'preparing' or p_data->>'state' is null or p_data->>'state' not in ('accepted','failed','unknown') then raise exception 'Recibo inválido.' using errcode='22023';end if;
   update private.operator_self_email_changes set send_state=p_data->>'state',provider_id=p_data->>'providerId' where id=e.id;
   return jsonb_build_object('ok',true);
  elsif p_action='email_cancel' then
   update private.operator_self_email_changes set state='cancelled' where id=e.id and state='pending';return jsonb_build_object('ok',true);
  end if;
  if e.state='confirmed' and u.email=e.new_email then return jsonb_build_object('verified',true,'reused',true);end if;
  if e.state<>'pending' or e.send_state='failed' or e.attempts>=5 then return jsonb_build_object('verified',false,'reason','Solicitação encerrada. Envie um novo código.');end if;
  if e.expires_at<=clock_timestamp() then update private.operator_self_email_changes set state='expired' where id=e.id;return jsonb_build_object('verified',false,'reason','Código expirado. Envie um novo código.');end if;
  if u.email<>e.old_email then update private.operator_self_email_changes set state='cancelled' where id=e.id;return jsonb_build_object('verified',false,'reason','Seu contato foi atualizado. Recarregue o cadastro.');end if;
  if p_data->>'hash' is distinct from e.code_hash then
   update private.operator_self_email_changes set attempts=attempts+1,state=case when attempts+1>=5 then 'locked' else 'pending' end where id=e.id;
   return jsonb_build_object('verified',false,'reason','Código inválido. Após cinco erros, solicite outro código.');
  end if;
  update public.platform_users set email=e.new_email,updated_at=clock_timestamp() where id=u.id;
  update private.operator_self_email_changes set state='confirmed' where id=e.id;
  insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,organization_id,action,previous_values,new_values)
   values(p_actor,u.id,p_actor,u.group_id,org,'self_email_confirmed',jsonb_build_object('email',e.old_email),jsonb_build_object('email',e.new_email,'requestId',e.id));
  return jsonb_build_object('verified',true);
 end if;
 raise exception 'Ação não suportada.' using errcode='22023';
exception when unique_violation then raise exception 'O username informado já está em uso.' using errcode='23505';
end$$;
revoke all on function public.operator_self_account_v313(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.operator_self_account_v313(uuid,uuid,text,jsonb) to service_role;

-- Auth admin password updates revoke all sessions. Finalize only the already
-- verified, recent intent; this endpoint can append a receipt, never edit a user.
create function public.finish_operator_self_password_v313(p_actor uuid,p_session uuid,p_request uuid,p_state text) returns void
language plpgsql security definer set search_path='' as $$
declare u public.platform_users; s private.operator_self_security_attempts;
begin
 if p_state is null or p_state not in ('changed','failed','unknown') then raise exception 'Recibo inválido.' using errcode='22023';end if;
 select * into u from public.platform_users where auth_user_id=p_actor for update;
 select * into s from private.operator_self_security_attempts where id=p_request and auth_user_id=p_actor and session_id=p_session for update;
 if u.id is null or s.id is null or s.purpose<>'password' or s.state<>'verified' or s.created_at<clock_timestamp()-interval '5 minutes' then raise exception 'Intenção de senha inválida.' using errcode='42501';end if;
 update private.operator_self_security_attempts set state=p_state where id=s.id;
 insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,organization_id,action,new_values)
 values(p_actor,u.id,p_actor,u.group_id,s.organization_id,'self_password_'||p_state,jsonb_build_object('requestId',s.id));
end$$;
revoke all on function public.finish_operator_self_password_v313(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_operator_self_password_v313(uuid,uuid,uuid,text) to service_role;
