-- owner-lifecycle1.0.0. Actual group status remains the existing live authorization gate.
alter table private.organization_group_settings
 add column configured_status text not null default 'draft' check(configured_status in ('draft','active','inactive')),
 add column owner_auth_user_id uuid references auth.users(id) on delete set null,
 add column owner_suspended boolean not null default false,
 add column owner_suspension_reason text check(owner_suspension_reason is null or length(owner_suspension_reason)<=500),
 add column owner_restore_status public.platform_user_status not null default 'active' check(owner_restore_status in ('active','pending_first_access')),
 add column initial_activation_pending boolean not null default true;

update private.organization_group_settings s set configured_status=g.status,
 owner_auth_user_id=(select u.auth_user_id from public.platform_users u where u.group_id=g.id and u.access_profile='owner' and u.status in ('active','pending_first_access') limit 1),
 initial_activation_pending=g.status='draft' and (select count(*) from public.organizations o where o.group_id=g.id)=1
 and exists(select 1 from public.organizations o where o.id=s.primary_organization_id and o.group_id=g.id and o.status='draft')
from public.organization_groups g where g.id=s.group_id;

create function private.reconcile_group_owner(p_group uuid,p_actor uuid default null,p_owner_hint uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare g public.organization_groups; s private.organization_group_settings; u public.platform_users; o public.organizations;
 previous_values jsonb; owner_id uuid; suspended boolean; next_status text; initial_activation boolean:=false;
begin
 select * into g from public.organization_groups where id=p_group for update;
 if g.id is null then return; end if;
 select * into s from private.organization_group_settings where group_id=g.id for update;
 if s.group_id is null then raise exception 'Configuração do grupo ausente.' using errcode='22023'; end if;
 previous_values:=jsonb_build_object('status',g.status,'configuredStatus',s.configured_status,'ownerId',s.owner_auth_user_id,'ownerSuspended',s.owner_suspended,'reason',s.owner_suspension_reason);
 owner_id:=s.owner_auth_user_id;
 if owner_id is null then
  select auth_user_id into owner_id from public.platform_users where group_id=g.id and access_profile='owner'
   and (status in ('active','pending_first_access') or auth_user_id=p_owner_hint) order by auth_user_id limit 1;
 end if;
 select * into u from public.platform_users where auth_user_id=owner_id and group_id=g.id and access_profile='owner';
 select * into o from public.organizations where id=s.primary_organization_id and group_id=g.id for update;
 suspended:=not coalesce(u.status='active',false) and (owner_id is not null or s.configured_status='active');
 if not suspended and u.status='active' and s.initial_activation_pending and s.configured_status='draft' and g.status='draft'
  and o.status='draft' and (select count(*) from public.organizations where group_id=g.id)=1 then
  update public.organizations set status='active' where id=o.id;
  o.status:='active';s.configured_status:='active';s.initial_activation_pending:=false;initial_activation:=true;
 end if;
 next_status:=case when s.configured_status='active' and (suspended or o.id is null or o.status<>'active') then 'inactive' else s.configured_status end;
 if g.status is distinct from next_status then update public.organization_groups set status=next_status where id=g.id; end if;
 if initial_activation or g.status is distinct from next_status or s.owner_auth_user_id is distinct from owner_id or s.owner_suspended is distinct from suspended then
  update private.organization_group_settings set owner_auth_user_id=owner_id,owner_suspended=suspended,
   owner_suspension_reason=case when suspended then coalesce(owner_suspension_reason,'Aguardando um Owner ativo.') else null end,
   configured_status=s.configured_status,initial_activation_pending=s.initial_activation_pending,revision=revision+1 where group_id=g.id;
  insert into public.platform_user_audit_events(actor_auth_user_id,target_auth_user_id,group_id,organization_id,action,previous_values,new_values)
  values(p_actor,case when u.id is not null then owner_id end,g.id,case when initial_activation then o.id end,
   case when initial_activation then 'owner_initial_activation_v307' else 'owner_operation_reconciled_v307' end,previous_values,
   jsonb_build_object('status',next_status,'configuredStatus',s.configured_status,'ownerId',owner_id,'ownerSuspended',suspended,'initialActivation',initial_activation,'source','owner-lifecycle-1.0.0'));
 end if;
end $$;
revoke all on function private.reconcile_group_owner(uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- Deferred safety net also supports the preceding Edge's first-access write during rollout.
create function private.owner_lifecycle_state_trigger() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='DELETE' then
  if old.access_profile='owner' then perform private.reconcile_group_owner(old.group_id); end if;
 else
  if new.access_profile='owner' then perform private.reconcile_group_owner(new.group_id,null,new.auth_user_id); end if;
  if tg_op='UPDATE' and old.access_profile='owner' and (old.group_id is distinct from new.group_id or new.access_profile<>'owner') then perform private.reconcile_group_owner(old.group_id); end if;
 end if;
 return null;
end $$;
revoke all on function private.owner_lifecycle_state_trigger() from public,anon,authenticated,service_role;
create constraint trigger owner_lifecycle_reconcile after insert or update of status,access_profile,group_id or delete on public.platform_users
 deferrable initially deferred for each row execute function private.owner_lifecycle_state_trigger();

create function public.complete_first_access_v307(p_auth_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare u public.platform_users; gid uuid; begin
 select group_id into gid from public.platform_users where auth_user_id=p_auth_user;
 if gid is not null then perform 1 from public.organization_groups where id=gid for update; end if;
 select * into u from public.platform_users where auth_user_id=p_auth_user for update;
 if u.id is null or u.status not in ('active','pending_first_access') or u.group_id is distinct from gid then
  raise exception 'Conta não habilitada para concluir o primeiro acesso.' using errcode='42501'; end if;
 update public.platform_users set status='active',must_change_password=false,first_access_completed_at=clock_timestamp() where id=u.id;
 insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,action,previous_values,new_values)
 values(p_auth_user,u.id,p_auth_user,u.group_id,'first_access_completed',jsonb_build_object('status',u.status,'must_change_password',u.must_change_password),jsonb_build_object('status','active','must_change_password',false));
 if u.access_profile='owner' then perform private.reconcile_group_owner(u.group_id,p_auth_user,p_auth_user); end if;
end $$;
revoke all on function public.complete_first_access_v307(uuid) from public,anon,authenticated,service_role;
grant execute on function public.complete_first_access_v307(uuid) to service_role;

create function public.group_owner_lifecycle_v307(p_action text,p_group uuid,p_revision integer,p_current_owner uuid,
 p_target_owner uuid default null,p_reason text default null,p_contract text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.platform_users; g public.organization_groups; s private.organization_group_settings; old_owner public.platform_users; candidate public.platform_users;
 before_values jsonb; reason_value text:=btrim(p_reason); begin
 if p_contract is distinct from 'owner-lifecycle-1.0.0' then raise exception 'Contrato de Owner incompatível. Atualize a página.' using errcode='22023'; end if;
 select * into actor from public.platform_users where auth_user_id=auth.uid() and status='active' and access_profile='super_admin';
 if actor.id is null then raise exception 'Somente Super Admin ativo administra o Owner.' using errcode='42501'; end if;
 select * into g from public.organization_groups where id=p_group for update;
 select * into s from private.organization_group_settings where group_id=p_group for update;
 if g.id is null or s.group_id is null then raise exception 'Grupo não encontrado.' using errcode='P0002'; end if;
 if p_revision is distinct from s.revision or p_current_owner is distinct from s.owner_auth_user_id then
  raise exception 'O grupo ou Owner foi alterado. Atualize a consulta.' using errcode='40001'; end if;
 select * into actor from public.platform_users where auth_user_id=auth.uid() and status='active' and access_profile='super_admin' for share;
 if actor.id is null then raise exception 'Operador revogado.' using errcode='42501'; end if;
 if p_action='candidates' then
  return jsonb_build_object('contract',p_contract,'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',u.auth_user_id,'name',u.full_name,'username',u.username,'profile',u.access_profile) order by u.full_name,u.id)
  from public.platform_users u where u.group_id=g.id and u.status='active' and u.access_profile in ('admin','recruiter','member') and u.auth_user_id<>actor.auth_user_id
  and not exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.organization_id where m.user_id=u.auth_user_id and o.group_id<>g.id)),'[]'::jsonb));
 end if;
 if p_action not in ('replace','deactivate','reactivate') or p_action is null then raise exception 'Ação de Owner inválida.' using errcode='22023'; end if;
 if reason_value is null or length(reason_value) not between 5 and 500 then raise exception 'Informe o motivo (5 a 500 caracteres).' using errcode='22023'; end if;
 perform 1 from public.platform_users where auth_user_id in (p_current_owner,p_target_owner) order by auth_user_id for update;
 select * into old_owner from public.platform_users where auth_user_id=s.owner_auth_user_id and group_id=g.id and access_profile='owner';
 if old_owner.id is null or old_owner.auth_user_id=actor.auth_user_id then raise exception 'Owner vigente não disponível.' using errcode='42501'; end if;
 before_values:=jsonb_build_object('ownerId',old_owner.auth_user_id,'ownerStatus',old_owner.status,'groupStatus',g.status,'configuredStatus',s.configured_status,'ownerSuspended',s.owner_suspended);
 if p_action='replace' then
  select * into candidate from public.platform_users where auth_user_id=p_target_owner and group_id=g.id and status='active' and access_profile in ('admin','recruiter','member');
  if candidate.id is null or candidate.auth_user_id in (actor.auth_user_id,old_owner.auth_user_id)
   or exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.organization_id where m.user_id=candidate.auth_user_id and o.group_id<>g.id) then
   raise exception 'Escolha um usuário ativo elegível deste grupo.' using errcode='42501'; end if;
  update public.platform_users set status=case when status='blocked' then 'blocked'::public.platform_user_status else 'inactive'::public.platform_user_status end where id=old_owner.id;
  update public.platform_users set access_profile='owner' where id=candidate.id;
  update private.organization_group_settings set owner_auth_user_id=candidate.auth_user_id,owner_restore_status='active' where group_id=g.id;
 elsif p_action='deactivate' then
  if old_owner.status not in ('active','pending_first_access') then raise exception 'Owner já está inativo ou bloqueado.' using errcode='22023'; end if;
  update private.organization_group_settings set owner_restore_status=old_owner.status,owner_suspension_reason=reason_value where group_id=g.id;
  update public.platform_users set status='inactive' where id=old_owner.id;
 else
  if old_owner.status<>'inactive' then raise exception 'Somente Owner inativo pode ser reativado por este fluxo.' using errcode='22023'; end if;
  update public.platform_users set status=s.owner_restore_status where id=old_owner.id;
 end if;
 perform private.reconcile_group_owner(g.id,actor.auth_user_id);
 update private.organization_group_settings set revision=revision+1 where group_id=g.id;
 insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,action,previous_values,new_values)
 values(actor.auth_user_id,old_owner.id,old_owner.auth_user_id,g.id,'owner_lifecycle:'||p_action,before_values,
  jsonb_build_object('ownerId',coalesce(candidate.auth_user_id,old_owner.auth_user_id),'reason',reason_value,'previousCandidateProfile',candidate.access_profile,'source',p_contract));
 return jsonb_build_object('contract',p_contract,'ok',true);
end $$;
revoke all on function public.group_owner_lifecycle_v307(text,uuid,integer,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.group_owner_lifecycle_v307(text,uuid,integer,uuid,uuid,text,text) to authenticated;

-- Service-role Edge preflight, with a second live guard in each domain write below.
create function public.operator_administration_available_v307(p_auth_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_users u left join private.organization_group_settings s on s.group_id=u.group_id
 where u.auth_user_id=p_auth_user and u.status='active' and (u.access_profile='super_admin' or (s.group_id is not null and not s.owner_suspended)))
$$;
revoke all on function public.operator_administration_available_v307(uuid) from public,anon,authenticated,service_role;
grant execute on function public.operator_administration_available_v307(uuid) to service_role;

-- Extend the already versioned implementation with guarded, exact substitutions.
do $migration$
declare definition text; pair text[]; previous text; begin
 definition:=pg_get_functiondef('public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure);
 foreach pair slice 1 in array array[
  array[$old$'organization-administration-1.0.0','organization-administration-1.1.0'$old$,$new$'organization-administration-1.0.0','organization-administration-1.1.0','organization-administration-1.2.0'$new$],
  array[$old$'status',visible_group.status,'plan'$old$,$new$'status',visible_group.status,'configuredStatus',s.configured_status,'ownerSuspended',s.owner_suspended,'ownerSuspensionReason',s.owner_suspension_reason,'plan'$new$],
  array[$old$'owner',(select jsonb_build_object('name',x.full_name,'status',x.status) from public.platform_users x where x.group_id=visible_group.id and x.access_profile='owner' and x.status in ('active','pending_first_access') limit 1)$old$,
   $new$'owner',(select jsonb_build_object('id',x.auth_user_id,'name',x.full_name,'username',x.username,'status',x.status) from public.platform_users x where x.auth_user_id=s.owner_auth_user_id and x.group_id=visible_group.id and x.access_profile='owner')$new$],
  array[$old$if p_action='configure_group' then$old$,$new$if p_action='configure_group' then
   if cfg.owner_suspended and p_contract<>'organization-administration-1.2.0' then raise exception 'Atualize a página para preservar o motivo da suspensão do grupo.' using errcode='22023'; end if;$new$],
  array[$old$next_status:=coalesce(p_data->>'status',g.status);$old$,$new$next_status:=coalesce(p_data->>'status',cfg.configured_status);$new$],
  array[$old$if next_status='active' and (not exists$old$,$new$if next_status='active' and not (cfg.owner_suspended and cfg.configured_status='active') and (not exists$new$],
  array[$old$update public.organization_groups set name=name_value,status=next_status where id=g.id;$old$,
   $new$update public.organization_groups set name=name_value,status=case when cfg.owner_suspended and next_status='active' then 'inactive' else next_status end where id=g.id;$new$],
  array[$old$set plan=next_plan,company_limit=next_limit where group_id=g.id;$old$,
   $new$set plan=next_plan,company_limit=next_limit,configured_status=next_status,initial_activation_pending=case when next_status<>'draft' then false else initial_activation_pending end where group_id=g.id;$new$],
  array[$old$return coalesce(result,jsonb_build_object$old$,$new$perform private.reconcile_group_owner(p_group_id,actor_id);
 return coalesce(result,jsonb_build_object$new$]
 ] loop
  previous:=pair[1];
  if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then raise exception 'Owner lifecycle: organization administration baseline changed'; end if;
  definition:=replace(definition,previous,pair[2]);
 end loop;
 execute definition;
 definition:=pg_get_functiondef('private.organization_admin_actor(uuid,uuid)'::regprocedure);
 previous:='if u.access_profile=''super_admin'' then return u;end if;';
 if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then raise exception 'Owner lifecycle: admin actor baseline changed'; end if;
 definition:=replace(definition,previous,previous||$guard$
 if exists(select 1 from private.organization_group_settings where group_id=u.group_id and owner_suspended) then
 raise exception 'Grupo suspenso por ausência de Owner ativo.' using errcode='42501';end if;$guard$);
 execute definition;
 definition:=pg_get_functiondef('public.save_platform_user_v3(uuid,uuid,jsonb,uuid[])'::regprocedure);
 previous:='if profile_value=''owner'' then select array_agg';
 if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then raise exception 'Owner lifecycle: user guard anchor changed'; end if;
 definition:=replace(definition,previous,$guard$
 if actor.access_profile<>'super_admin' and exists(select 1 from private.organization_group_settings where group_id=actor.group_id and owner_suspended) then raise exception 'Grupo suspenso por ausência de Owner ativo.' using errcode='42501';end if;
 if target.id is not null and target.access_profile='owner' and exists(select 1 from private.organization_group_settings where owner_auth_user_id=p_auth_user)
  and (profile_value<>target.access_profile or status_value<>target.status or group_value is distinct from target.group_id) then
  raise exception 'Use a gestão de Owner em Grupos e empresas para alterar o responsável ou sua situação.' using errcode='42501'; end if;
 if profile_value='owner' and status_value in ('active','pending_first_access') and exists(select 1 from private.organization_group_settings where group_id=group_value and owner_auth_user_id is not null and owner_auth_user_id<>p_auth_user) then
  raise exception 'Use Substituir Owner para designar outro responsável.' using errcode='42501'; end if;
 if profile_value='owner' then select array_agg$guard$);
 previous:='return uid;';
 if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then raise exception 'Owner lifecycle: user completion anchor changed'; end if;
 definition:=replace(definition,previous,$guard$if profile_value='owner' then perform private.reconcile_group_owner(group_value,p_actor,p_auth_user); end if;
 return uid;$guard$);
 execute definition;
end $migration$;

-- Apply the approved rule to already-ready INITIAL drafts only. Never invent an Owner,
-- activate an inactive company/group or migrate credentials. Reconciliation audits as system.
do $$declare r record;begin
 for r in select group_id from private.organization_group_settings order by group_id loop
  perform private.reconcile_group_owner(r.group_id);
 end loop;
end $$;
