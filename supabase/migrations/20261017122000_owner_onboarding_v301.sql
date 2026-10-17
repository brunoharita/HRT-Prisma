-- Contextual Owner onboarding. Existing generic persistence/roles/Auth stay unchanged.
create or replace function private.owner_onboarding_context_v301(p_actor uuid,p_group uuid,p_contract text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare g public.organization_groups; o public.organizations; username_value text;
begin
 if p_contract is distinct from 'owner-onboarding-1.0.0' then raise exception 'Contrato de cadastro de Owner incompatível.' using errcode='22023';end if;
 if not private.is_super_admin(p_actor) then raise exception 'Somente Super Admin ativo cadastra o Owner de um novo grupo.' using errcode='42501';end if;
 select * into g from public.organization_groups where id=p_group;
 if g.id is null or g.status<>'draft' then raise exception 'O grupo não está disponível para cadastrar seu primeiro Owner. Volte a Grupos e empresas.' using errcode='22023';end if;
 if exists(select 1 from public.platform_users where group_id=p_group and access_profile='owner' and status in ('active','pending_first_access')) then raise exception 'Este grupo já possui Owner ativo ou com ativação pendente.' using errcode='23505';end if;
 if (select count(*) from public.organizations where group_id=p_group)<>1 then raise exception 'O cadastro inicial de Owner exige a única primeira empresa do grupo.' using errcode='22023';end if;
 select c.* into o from public.organizations c join private.organization_group_settings s on s.primary_organization_id=c.id and s.group_id=p_group where c.group_id=p_group;
 if o.id is null or o.status<>'draft' then raise exception 'A primeira empresa não está disponível para o cadastro inicial de Owner.' using errcode='22023';end if;
 username_value:=lower(regexp_replace(g.name,'[[:space:]]','','g'))||'.owner';
 if length(username_value) not between 3 and 32 or username_value!~'^[a-z0-9][a-z0-9._-]*[a-z0-9]$' then
  raise exception 'O nome do grupo gera um nome de usuário incompatível com as regras atuais. Ajuste o nome em Grupos e empresas; nenhum nome alternativo será criado.' using errcode='22023';end if;
 if exists(select 1 from public.platform_users where username=username_value) then raise exception 'O nome de usuário % já está em uso. Resolva o conflito em Grupos e empresas; nenhum nome alternativo será criado.',username_value using errcode='23505';end if;
 return jsonb_build_object('contract',p_contract,'username',username_value,'profile','owner','group',jsonb_build_object('id',g.id,'name',g.name),'company',jsonb_build_object('id',o.id,'name',o.name));
end $$;
revoke all on function private.owner_onboarding_context_v301(uuid,uuid,text) from public,anon,authenticated,service_role;

create or replace function public.owner_onboarding_context_v301(p_actor uuid,p_group uuid,p_contract text default null) returns jsonb
language sql stable security definer set search_path='' as $$select private.owner_onboarding_context_v301(p_actor,p_group,p_contract)$$;
revoke all on function public.owner_onboarding_context_v301(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.owner_onboarding_context_v301(uuid,uuid,text) to service_role;

create or replace function public.create_group_owner_v301(p_actor uuid,p_auth_user uuid,p_group uuid,p_company uuid,p_data jsonb,p_contract text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare context_value jsonb; user_value uuid;
begin
 -- Same lock used by organization administration and generic user persistence.
 perform 1 from public.organization_groups where id=p_group for update;
 context_value:=private.owner_onboarding_context_v301(p_actor,p_group,p_contract);
 if p_data->>'profile' is distinct from 'owner' or p_data->>'groupId' is distinct from p_group::text
 or p_data->>'username' is distinct from context_value->>'username' or p_company is distinct from (context_value->'company'->>'id')::uuid then
  raise exception 'Os dados protegidos do cadastro de Owner foram alterados. Reabra Cadastrar Owner no grupo.' using errcode='42501';end if;
 if exists(select 1 from public.platform_users where auth_user_id=p_auth_user) then raise exception 'Este cadastro exige uma nova identidade; nenhum usuário existente será substituído.' using errcode='42501';end if;
 user_value:=public.save_platform_user_v3(p_actor,p_auth_user,p_data,array[p_company]);
 insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,organization_id,action,new_values)
 values(p_actor,user_value,p_auth_user,p_group,p_company,'owner_onboarding_completed_v301',jsonb_build_object('contract',p_contract,'source','group_owner_onboarding','profile','owner','groupId',p_group,'organizationId',p_company));
 return user_value;
end $$;
revoke all on function public.create_group_owner_v301(uuid,uuid,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.create_group_owner_v301(uuid,uuid,uuid,uuid,jsonb,text) to service_role;
