-- V3M0 / organization-administration-1.0.0. Existing tenant data and Tokens stay in place.
alter table public.organization_groups add column if not exists status text not null default 'active' check(status in ('draft','active','inactive'));
alter table public.organizations add column if not exists status text not null default 'active' check(status in ('draft','active','inactive'));
alter table public.organization_memberships add column if not exists is_default boolean not null default false;
drop index if exists public.organization_memberships_member_one_org_idx;
-- Legacy Super memberships are historical residues, never the source of global authority.
-- Do not touch them: the existing validator correctly refuses newly assigning them.
with first_membership as(select m.id,row_number() over(partition by m.user_id order by m.created_at,m.id) as n from public.organization_memberships m
 join public.platform_users u on u.auth_user_id=m.user_id where u.access_profile<>'super_admin')
update public.organization_memberships m set is_default=true from first_membership f where f.id=m.id and f.n=1
and not exists(select 1 from public.organization_memberships x where x.user_id=m.user_id and x.is_default);
create unique index if not exists organization_memberships_one_default on public.organization_memberships(user_id) where is_default;
create unique index if not exists platform_users_one_active_owner on public.platform_users(group_id) where access_profile='owner' and status in ('active','pending_first_access');

create table private.organization_group_settings(
 group_id uuid primary key references public.organization_groups(id),
 plan text not null default 'professional' check(plan in ('essential','essential_plus','professional','enterprise')),
 company_limit integer not null default 1 check(company_limit between 1 and 100000),
 primary_organization_id uuid references public.organizations(id),
 revision integer not null default 1 check(revision>0),
 terms_status text not null default 'provisional' check(terms_status='provisional'),
 check((plan in ('essential','essential_plus') and company_limit=1) or (plan='professional' and company_limit<=5) or plan='enterprise')
);
alter table private.organization_group_settings enable row level security;
revoke all on private.organization_group_settings from public,anon,authenticated,service_role;
insert into private.organization_group_settings(group_id,plan,company_limit,primary_organization_id)
 select g.id,case when count(o.id)>5 then 'enterprise' else 'professional' end,greatest(count(o.id),1)::integer,
 (array_agg(o.id order by o.created_at,o.id) filter(where o.id is not null))[1]
 from public.organization_groups g left join public.organizations o on o.group_id=g.id group by g.id;
insert into public.platform_user_audit_events(group_id,action,new_values)
 select group_id,'organization_settings_initialized_v3',jsonb_build_object('plan',plan,'companyLimit',company_limit,'primaryOrganizationId',primary_organization_id,'method','v3m0_existing_state_preservation','termsStatus',terms_status)
 from private.organization_group_settings;

-- Legacy Admin is an alias for Recruiter, never a fifth product role.
create or replace function private.canonical_access_role(p_role public.membership_role) returns public.membership_role
language sql immutable set search_path='' as $$ select case when p_role='admin' then 'recruiter'::public.membership_role else p_role end $$;
revoke all on function private.canonical_access_role(public.membership_role) from public,anon,authenticated,service_role;
grant execute on function private.canonical_access_role(public.membership_role) to authenticated,service_role;

create or replace function private.validate_membership_scope() returns trigger language plpgsql set search_path='' as $$
declare u public.platform_users; g uuid;
begin
 select * into u from public.platform_users where auth_user_id=new.user_id;
 select group_id into g from public.organizations where id=new.organization_id;
 if u.id is null or g is null or u.access_profile='super_admin' or u.group_id is distinct from g
 or private.canonical_access_role(new.role)<>private.canonical_access_role(u.access_profile) then
 raise exception 'Vínculo incompatível com o perfil ou grupo do usuário.' using errcode='42501';end if;
 return new;
end $$;
-- Update aliases atomically; historical audit rows and the enum remain untouched.
insert into public.platform_user_audit_events(target_platform_user_id,target_auth_user_id,group_id,action,previous_values,new_values)
 select id,auth_user_id,group_id,'access_profile_canonicalized_v3',jsonb_build_object('profile','admin'),jsonb_build_object('profile','recruiter','method','v3m0_role_alias','authorizationContract','tenant-authorization-2.0.0')
 from public.platform_users where access_profile='admin';
update public.platform_users set access_profile='recruiter' where access_profile='admin';
update public.organization_memberships m set role='recruiter' from public.platform_users u
 where u.auth_user_id=m.user_id and u.access_profile='recruiter' and m.role='admin';

create or replace function private.prisma_actor_has_org_role(p_actor uuid,target_organization_id uuid,allowed_roles public.membership_role[]) returns boolean
language sql stable security definer set search_path='' as $$
 select p_actor is not null and exists(select 1 from public.organizations o join public.organization_groups g on g.id=o.group_id
 where o.id=target_organization_id and (
 private.is_super_admin(p_actor) or (o.status='active' and g.status='active' and exists(select 1 from public.organization_memberships m
 join public.platform_users u on u.auth_user_id=m.user_id where m.organization_id=o.id and m.user_id=p_actor
 and u.status='active' and u.group_id=g.id and private.canonical_access_role(m.role)=private.canonical_access_role(u.access_profile)
 and (m.role=any(allowed_roles) or (m.role='recruiter' and 'admin'=any(allowed_roles)))))))
$$;
revoke all on function private.prisma_actor_has_org_role(uuid,uuid,public.membership_role[]) from public,anon,authenticated,service_role;
create or replace function private.has_org_role(target_organization_id uuid,allowed_roles public.membership_role[]) returns boolean
language sql stable security definer set search_path='' as $$
 select private.prisma_actor_has_org_role(auth.uid(),target_organization_id,allowed_roles)
$$;
revoke all on function private.has_org_role(uuid,public.membership_role[]) from public,anon;
grant execute on function private.has_org_role(uuid,public.membership_role[]) to authenticated,service_role;
create or replace function public.can_operate_prisma_organization(p_organization_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_org_role(p_organization_id,array['owner','admin','recruiter']::public.membership_role[])
$$;
revoke all on function public.can_operate_prisma_organization(uuid) from public,anon,authenticated,service_role;
grant execute on function public.can_operate_prisma_organization(uuid) to authenticated;

create or replace function private.person_deletion_actor_kind(p_organization_id uuid) returns text
language plpgsql security definer set search_path='' as $$
begin
 if private.is_super_admin(auth.uid()) then return 'super_admin';end if;
 if private.has_org_role(p_organization_id,array['owner']::public.membership_role[]) then return 'owner';end if;
 if private.has_org_role(p_organization_id,array['admin','recruiter']::public.membership_role[]) then return 'admin';end if;
 raise exception 'person_deletion_access_denied' using errcode='42501';
end $$;
revoke all on function private.person_deletion_actor_kind(uuid) from public,anon,authenticated;

create or replace function private.organization_admin_actor(p_group uuid,p_organization uuid default null) returns public.platform_users
language plpgsql security definer set search_path='' as $$
declare u public.platform_users;
begin
 select * into u from public.platform_users where auth_user_id=auth.uid() and status='active';
 if u.id is null then raise exception 'Operador ativo obrigatório.' using errcode='42501';end if;
 if u.access_profile='super_admin' then return u;end if;
 if u.group_id is distinct from coalesce(p_group,u.group_id) or private.canonical_access_role(u.access_profile) not in ('owner','recruiter') then
 raise exception 'Administração fora do seu escopo.' using errcode='42501';end if;
 if u.access_profile in ('admin','recruiter') and not exists(select 1 from public.organization_memberships m join public.organizations o on o.id=m.organization_id
 where m.user_id=u.auth_user_id and o.group_id=u.group_id and m.role in ('admin','recruiter')) then
 raise exception 'Vínculo administrativo obrigatório.' using errcode='42501';end if;
 if p_organization is not null and not exists(select 1 from public.organizations o where o.id=p_organization and o.group_id=p_group
 and (u.access_profile='owner' or exists(select 1 from public.organization_memberships m where m.organization_id=o.id and m.user_id=u.auth_user_id and m.role in ('admin','recruiter')))) then
 raise exception 'Empresa fora do seu escopo.' using errcode='42501';end if;
 return u;
end $$;
revoke all on function private.organization_admin_actor(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.organization_administration(p_action text,p_group_id uuid default null,p_organization_id uuid default null,p_data jsonb default '{}',p_contract text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.platform_users; g public.organization_groups; o public.organizations; cfg private.organization_group_settings;
 target public.platform_users; actor_id uuid:=auth.uid(); result jsonb; gid uuid; oid uuid; name_value text; next_status text;
 next_plan text; next_limit integer; old_values jsonb; owner_id uuid; target_user uuid; default_value boolean;
begin
 if p_contract is distinct from 'organization-administration-1.0.0' then raise exception 'Contrato de administração incompatível. Atualize a página.' using errcode='22023';end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'Dados inválidos.' using errcode='22023';end if;
 u:=private.organization_admin_actor(p_group_id,p_organization_id);
 if p_action='workspace' then
  select jsonb_build_object('contract',p_contract,'isSuper',u.access_profile='super_admin','groups',coalesce(jsonb_agg(row_value order by group_name),'[]'::jsonb)) into result from (
   select visible_group.name as group_name,jsonb_build_object('id',visible_group.id,'name',visible_group.name,'status',visible_group.status,'plan',s.plan,'companyLimit',s.company_limit,
   'revision',s.revision,'primaryOrganizationId',s.primary_organization_id,'termsStatus',s.terms_status,
   'activeCount',(select count(*) from public.organizations x where x.group_id=visible_group.id and x.status='active'),
   'companyCount',(select count(*) from public.organizations x where x.group_id=visible_group.id),
   'owner',(select jsonb_build_object('name',x.full_name,'status',x.status) from public.platform_users x where x.group_id=visible_group.id and x.access_profile='owner' and x.status in ('active','pending_first_access') limit 1),
   'companies',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'status',x.status,'groupId',x.group_id,
   'users',(select count(*) from public.organization_memberships m join public.platform_users q on q.auth_user_id=m.user_id where m.organization_id=x.id and q.status='active')) order by x.name,x.id)
   from public.organizations x where x.group_id=visible_group.id and (u.access_profile in ('super_admin','owner') or exists(select 1 from public.organization_memberships m where m.organization_id=x.id and m.user_id=actor_id))),'[]'::jsonb)) as row_value
   from public.organization_groups visible_group join private.organization_group_settings s on s.group_id=visible_group.id
   where u.access_profile='super_admin' or visible_group.id=u.group_id
  ) rows;
  return result;
 end if;
 if p_action='create_group' then
  if u.access_profile<>'super_admin' then raise exception 'Somente Super Admin cadastra grupos.' using errcode='42501';end if;
  name_value:=btrim(p_data->>'name');
  if name_value is null or length(name_value) not between 2 and 120 then raise exception 'Informe o nome do grupo (2 a120 caracteres).' using errcode='22023';end if;
  gid:=gen_random_uuid();oid:=gen_random_uuid();
  insert into public.organization_groups(id,name,slug,status) values(gid,name_value,'grupo-'||gid::text,'draft');
  name_value:=btrim(p_data->>'companyName');
  if name_value is null or length(name_value) not between 2 and 120 then raise exception 'Informe a primeira empresa (2 a120 caracteres).' using errcode='22023';end if;
  insert into public.organizations(id,name,group_id,status) values(oid,name_value,gid,'draft');
  insert into private.organization_group_settings(group_id,primary_organization_id) values(gid,oid);
  p_group_id:=gid;p_organization_id:=oid;
 else
  select * into g from public.organization_groups where id=p_group_id for update;
  if g.id is null then raise exception 'Grupo não encontrado.' using errcode='P0002';end if;
  select * into cfg from private.organization_group_settings where group_id=g.id for update;
  u:=private.organization_admin_actor(p_group_id,p_organization_id);
  if (p_data->>'revision')::integer is distinct from cfg.revision then raise exception 'Dados alterados. Atualize antes de salvar.' using errcode='40001';end if;
  if p_organization_id is not null then
   select * into o from public.organizations where id=p_organization_id and group_id=g.id for update;
   if o.id is null then raise exception 'Empresa fora do grupo.' using errcode='42501';end if;
  end if;
  old_values:=jsonb_build_object('groupName',g.name,'groupStatus',g.status,'plan',cfg.plan,'companyLimit',cfg.company_limit,'companyName',o.name,'companyStatus',o.status,'revision',cfg.revision);
  if p_action='configure_group' then
   if u.access_profile not in ('super_admin','owner') then raise exception 'Somente Owner ou Super Admin altera o grupo.' using errcode='42501';end if;
   name_value:=btrim(coalesce(p_data->>'name',g.name));next_status:=coalesce(p_data->>'status',g.status);
   if length(name_value) not between 2 and 120 or next_status not in ('draft','active','inactive') then raise exception 'Nome ou situação inválida.' using errcode='22023';end if;
   next_plan:=coalesce(p_data->>'plan',cfg.plan);next_limit:=coalesce((p_data->>'companyLimit')::integer,cfg.company_limit);
   if u.access_profile<>'super_admin' and (next_plan<>cfg.plan or next_limit<>cfg.company_limit) then raise exception 'Plano e capacidade são exclusivos do Super Admin.' using errcode='42501';end if;
   if (select count(*) from public.organizations where group_id=g.id)>next_limit then raise exception 'Capacidade inferior às empresas cadastradas. Reavalie os limites do plano.' using errcode='22023';end if;
   if next_status='active' and (not exists(select 1 from public.platform_users where group_id=g.id and access_profile='owner' and status='active')
   or not exists(select 1 from public.organizations where id=cfg.primary_organization_id and group_id=g.id and status='active')) then
   raise exception 'Ativação exige Owner ativo e empresa principal ativa.' using errcode='22023';end if;
   update public.organization_groups set name=name_value,status=next_status where id=g.id;
   update private.organization_group_settings set plan=next_plan,company_limit=next_limit where group_id=g.id;
  elsif p_action='create_company' then
   if g.status<>'active' then raise exception 'Grupo não está ativo.' using errcode='42501';end if;
   select auth_user_id into owner_id from public.platform_users where group_id=g.id and access_profile='owner' and status='active';
   if owner_id is null then raise exception 'Defina um Owner ativo antes de criar outra empresa.' using errcode='22023';end if;
   if (select count(*) from public.organizations where group_id=g.id)>=cfg.company_limit then raise exception 'Limite de empresas configurado para o plano atingido. Consulte o responsável pelo plano.' using errcode='22023';end if;
   name_value:=btrim(p_data->>'name');
   if name_value is null or length(name_value) not between 2 and 120 then raise exception 'Informe o nome da empresa (2 a120 caracteres).' using errcode='22023';end if;
   oid:=gen_random_uuid();
   insert into public.organizations(id,name,group_id,status) values(oid,name_value,g.id,'active');
   if u.access_profile in ('admin','recruiter') then
    insert into public.organization_memberships(organization_id,user_id,role) values(oid,actor_id,'recruiter');
   end if;
   p_organization_id:=oid;
  elsif p_action='configure_company' then
   if o.id is null then raise exception 'Empresa obrigatória.' using errcode='22023';end if;
   name_value:=btrim(coalesce(p_data->>'name',o.name));next_status:=coalesce(p_data->>'status',o.status);
   if length(name_value) not between 2 and 120 or next_status not in ('draft','active','inactive') then raise exception 'Nome ou situação inválida.' using errcode='22023';end if;
   if next_status<>o.status and next_status='active' then
    if (select count(*) from public.organizations where group_id=g.id and status='active')>=cfg.company_limit then raise exception 'Limite de empresas atingido.' using errcode='22023';end if;
    if not exists(select 1 from public.platform_users where group_id=g.id and access_profile='owner' and status='active') then raise exception 'Owner ativo obrigatório.' using errcode='22023';end if;
   end if;
   if next_status<>'active' and g.status='active' and cfg.primary_organization_id=o.id then raise exception 'Inative o grupo antes de inativar a empresa principal.' using errcode='22023';end if;
   update public.organizations set name=name_value,status=next_status where id=o.id;
  elsif p_action in ('list_links','save_link') then
   if o.id is null then raise exception 'Empresa obrigatória.' using errcode='22023';end if;
   if p_action='save_link' then
    target_user:=(p_data->>'userId')::uuid;
    select * into target from public.platform_users where auth_user_id=target_user and group_id=g.id and access_profile in ('recruiter','member') for update;
    if target.id is null or target.status<>'active' or target.auth_user_id=actor_id then raise exception 'Usuário não elegível para alteração de vínculo.' using errcode='42501';end if;
    if coalesce((p_data->>'linked')::boolean,false) then
     insert into public.organization_memberships(organization_id,user_id,role) values(o.id,target_user,private.canonical_access_role(target.access_profile)) on conflict(organization_id,user_id) do nothing;
     default_value:=coalesce((p_data->>'isDefault')::boolean,false) or not exists(select 1 from public.organization_memberships where user_id=target_user and is_default);
     if default_value then
      update public.organization_memberships set is_default=false where user_id=target_user and is_default;
      update public.organization_memberships set is_default=true where user_id=target_user and organization_id=o.id;
     end if;
    else
     if (select count(*) from public.organization_memberships where user_id=target_user)<=1 then raise exception 'Mantenha pelo menos uma empresa ou inative o usuário pelo cadastro autorizado.' using errcode='22023';end if;
     delete from public.organization_memberships where user_id=target_user and organization_id=o.id;
     if not exists(select 1 from public.organization_memberships where user_id=target_user and is_default) then
      update public.organization_memberships set is_default=true where id=(select id from public.organization_memberships where user_id=target_user order by created_at,id limit 1);
     end if;
    end if;
   end if;
   select jsonb_build_object('contract',p_contract,'organizationId',o.id,'users',coalesce(jsonb_agg(jsonb_build_object('id',q.auth_user_id,'name',q.full_name,'profile',q.access_profile,
   'linked',m.id is not null,'isDefault',coalesce(m.is_default,false),'canEdit',q.auth_user_id<>actor_id) order by q.full_name,q.id),'[]'::jsonb)) into result
   from public.platform_users q left join public.organization_memberships m on m.user_id=q.auth_user_id and m.organization_id=o.id
   where q.group_id=g.id and q.access_profile in ('recruiter','member') and q.status='active';
   if p_action='list_links' then return result;end if;
  else raise exception 'Ação de administração desconhecida.' using errcode='22023';end if;
  update private.organization_group_settings set revision=revision+1 where group_id=g.id;
 end if;
 insert into public.platform_user_audit_events(actor_auth_user_id,target_auth_user_id,group_id,organization_id,action,previous_values,new_values)
 values(actor_id,target_user,p_group_id,p_organization_id,'organization_admin:'||p_action,coalesce(old_values,'{}'),jsonb_build_object('action',p_action,'revision',(select revision from private.organization_group_settings where group_id=p_group_id),'targetUserId',target_user,'linked',p_data->'linked'));
 return coalesce(result,jsonb_build_object('contract',p_contract,'groupId',p_group_id,'organizationId',p_organization_id,'ok',true));
end $$;
revoke all on function public.organization_administration(text,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.organization_administration(text,uuid,uuid,jsonb,text) to authenticated;

-- Default company is selected on the server; a common user cannot switch via local storage.
create or replace function public.get_prisma_default_organization() returns uuid language sql stable security definer set search_path='' as $$
 select m.organization_id from public.organization_memberships m join public.platform_users u on u.auth_user_id=m.user_id
 join public.organizations o on o.id=m.organization_id join public.organization_groups g on g.id=o.group_id
 where m.user_id=auth.uid() and u.status='active' and o.status='active' and g.status='active' and u.group_id=g.id
 order by m.is_default desc,m.created_at,m.id limit 1
$$;
revoke all on function public.get_prisma_default_organization() from public,anon,authenticated,service_role;
grant execute on function public.get_prisma_default_organization() to authenticated;

-- Auth is provisioned by the existing Edge Function. Domain record, memberships and audit commit together.
create or replace function public.save_platform_user_v3(p_actor uuid,p_auth_user uuid,p_data jsonb,p_organizations uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.platform_users; target public.platform_users; profile_value public.membership_role; group_value uuid;
 uid uuid; oid uuid; organizations_value uuid[]; previous_default uuid; before_value jsonb; status_value public.platform_user_status;
begin
 select * into actor from public.platform_users where auth_user_id=p_actor and status='active';
 if actor.id is null or private.canonical_access_role(actor.access_profile) not in ('super_admin','owner','recruiter') then raise exception 'Operador sem autoridade.' using errcode='42501';end if;
 profile_value:=private.canonical_access_role((p_data->>'profile')::public.membership_role);group_value:=(p_data->>'groupId')::uuid;
 status_value:=(p_data->>'status')::public.platform_user_status;
 if status_value is null or p_auth_user is null or profile_value is null then raise exception 'Cadastro incompleto.' using errcode='22023';end if;
 if profile_value='super_admin' then
  if actor.access_profile<>'super_admin' or group_value is not null then raise exception 'Autoridade global restrita.' using errcode='42501';end if;
 else
  perform 1 from public.organization_groups where id=group_value for update;
  if not found or (actor.access_profile<>'super_admin' and actor.group_id is distinct from group_value) then raise exception 'Grupo fora do escopo.' using errcode='42501';end if;
 end if;
 select * into actor from public.platform_users where auth_user_id=p_actor and status='active' for share;
 if actor.id is null then raise exception 'Operador revogado.' using errcode='42501';end if;
 if actor.access_profile in ('admin','recruiter') and profile_value not in ('recruiter','member') then raise exception 'Recruiter não concede Owner ou Super Admin.' using errcode='42501';end if;
 select * into target from public.platform_users where auth_user_id=p_auth_user for update;
 if target.id is not null then
  before_value:=jsonb_build_object('profile',target.access_profile,'status',target.status,'groupId',target.group_id,'organizations',(select jsonb_agg(organization_id) from public.organization_memberships where user_id=p_auth_user));
  if actor.access_profile<>'super_admin' and (target.group_id is distinct from actor.group_id or target.access_profile='super_admin'
  or (actor.access_profile in ('admin','recruiter') and target.access_profile='owner')) then raise exception 'Usuário fora da autoridade.' using errcode='42501';end if;
  if actor.access_profile in ('admin','recruiter') and exists(select 1 from public.organization_memberships m where m.user_id=p_auth_user and not exists(select 1 from public.organization_memberships a where a.user_id=p_actor and a.organization_id=m.organization_id and a.role in ('admin','recruiter'))) then
   raise exception 'Use Acessos da empresa para alterar somente o vínculo local.' using errcode='42501';end if;
  if target.access_profile='owner' and target.status='active' and (profile_value<>'owner' or status_value<>'active' or group_value is distinct from target.group_id) then raise exception 'A transferência do Owner exige um fluxo próprio; mantenha o responsável atual.' using errcode='42501';end if;
 end if;
 if profile_value='owner' then select array_agg(id order by created_at,id) into organizations_value from public.organizations where group_id=group_value;
 else select array_agg(distinct x order by x) into organizations_value from unnest(p_organizations) x;end if;
 if profile_value<>'super_admin' and coalesce(cardinality(organizations_value),0)=0 then raise exception 'Selecione pelo menos uma empresa.' using errcode='22023';end if;
 foreach oid in array coalesce(organizations_value,'{}'::uuid[]) loop
  if not exists(select 1 from public.organizations where id=oid and group_id=group_value) then raise exception 'Empresa fora do grupo.' using errcode='42501';end if;
  if actor.access_profile in ('admin','recruiter') and not exists(select 1 from public.organization_memberships where user_id=p_actor and organization_id=oid and role in ('admin','recruiter')) then raise exception 'Empresa fora do escopo do Recruiter.' using errcode='42501';end if;
 end loop;
 if p_auth_user=p_actor and target.id is not null and (profile_value<>private.canonical_access_role(target.access_profile) or status_value<>target.status or group_value is distinct from target.group_id
 or exists((select unnest(coalesce(organizations_value,'{}'::uuid[])) except select organization_id from public.organization_memberships where user_id=p_actor)
 union all (select organization_id from public.organization_memberships where user_id=p_actor except select unnest(coalesce(organizations_value,'{}'::uuid[]))))) then
 raise exception 'Autoalteração de autoridade não permitida.' using errcode='42501';end if;
 select organization_id into previous_default from public.organization_memberships where user_id=p_auth_user and is_default;
 insert into public.platform_users(auth_user_id,full_name,username,email,phone_e164,phone_country_iso2,phone_country_label,phone_country_code,phone_national_number,access_profile,group_id,status,credential_mode,must_change_password)
 values(p_auth_user,btrim(p_data->>'fullName'),p_data->>'username',p_data->>'email',p_data->>'phoneE164',p_data->>'phoneCountryIso2',p_data->>'phoneCountryLabel',p_data->>'phoneCountryCode',p_data->>'phoneNationalNumber',profile_value,group_value,status_value,(p_data->>'credentialMode')::public.platform_credential_mode,coalesce((p_data->>'mustChangePassword')::boolean,false))
 on conflict(auth_user_id) do update set full_name=excluded.full_name,username=excluded.username,email=excluded.email,phone_e164=excluded.phone_e164,phone_country_iso2=excluded.phone_country_iso2,phone_country_label=excluded.phone_country_label,phone_country_code=excluded.phone_country_code,phone_national_number=excluded.phone_national_number,access_profile=excluded.access_profile,group_id=excluded.group_id,status=excluded.status
 returning id into uid;
 delete from public.organization_memberships where user_id=p_auth_user;
 if profile_value<>'super_admin' then
  foreach oid in array organizations_value loop
   insert into public.organization_memberships(user_id,organization_id,role,is_default) values(p_auth_user,oid,profile_value,oid=coalesce(case when previous_default=any(organizations_value) then previous_default end,organizations_value[1]));
  end loop;
 end if;
 insert into public.platform_user_audit_events(actor_auth_user_id,target_platform_user_id,target_auth_user_id,group_id,action,previous_values,new_values)
 values(p_actor,uid,p_auth_user,group_value,case when target.id is null then 'user_created' else 'user_updated' end,coalesce(before_value,'{}'),jsonb_build_object('profile',profile_value,'groupId',group_value,'status',status_value,'organizations',organizations_value));
 return uid;
end $$;
revoke all on function public.save_platform_user_v3(uuid,uuid,jsonb,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.save_platform_user_v3(uuid,uuid,jsonb,uuid[]) to service_role;

-- Existing RPC algorithms/ACLs stay byte-identical except for the entry guard below.
-- Exact named boundaries, verified argument names and required count prevent broad source rewriting.
do $$
declare r record; source_value text; definition_value text; guard_value text; actor_expression text; organization_expression text; guarded_count integer:=0;
begin
 for r in select p.oid,p.proname,p.prosrc,p.proargnames,n.nspname,pg_get_functiondef(p.oid) as definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='private' and p.proname in ('authorize_position_follow_up','m83_sources'))
 or (n.nspname='public' and p.proname in ('claim_matching_legacy_review_refresh','claim_stable_matching_score','commit_matching_snapshot','complete_stable_matching_score','load_matching_trajectory_review','save_matching_trajectory_review')) loop
  if r.proname='authorize_position_follow_up' then actor_expression:='auth.uid()';organization_expression:='p_org';
  elsif r.proname='m83_sources' then actor_expression:='p_actor';organization_expression:='p_organization';
  else actor_expression:='p_actor_id';organization_expression:='p_organization_id';end if;
  if not organization_expression=any(r.proargnames) or (actor_expression<>'auth.uid()' and not actor_expression=any(r.proargnames)) then raise exception 'V3M0 authority boundary signature mismatch: %',r.proname;end if;
  if position('V3M0_ORGANIZATION_STATE_GUARD' in r.prosrc)=0 then
   guard_value:=E'begin\n -- V3M0_ORGANIZATION_STATE_GUARD\n if not private.prisma_actor_has_org_role('||actor_expression||','||organization_expression||E',array[''owner'',''admin'',''recruiter'']::public.membership_role[]) then raise exception ''V3M0_ORGANIZATION_ACCESS_DENIED'' using errcode=''42501'';end if;\n';
   source_value:=regexp_replace(r.prosrc,'\mbegin\M',guard_value,'i');
   if source_value=r.prosrc then raise exception 'V3M0 boundary has no verified entry block: %',r.proname;end if;
   definition_value:=replace(r.definition,r.prosrc,source_value);execute definition_value;
  end if;
  guarded_count:=guarded_count+1;
 end loop;
 if guarded_count<>8 then raise exception 'V3M0 expected eight existing authority boundaries, found %',guarded_count;end if;
 select p.prosrc,pg_get_functiondef(p.oid) into source_value,definition_value from pg_proc p where p.oid=to_regprocedure('private.prisma_token_reserve(uuid,text,uuid,uuid,integer)');
 if source_value is null then raise exception 'V3M0 existing token reservation boundary is required';end if;
 if position('V3M0_TOKEN_STATE_GUARD' in source_value)=0 then
  guard_value:=E'-- V3M0_TOKEN_STATE_GUARD\n if not private.prisma_actor_has_org_role(q.actor_id,p_org,case when p_function=''profile_synthesis'' then array[''owner'',''admin'',''recruiter'',''member'']::public.membership_role[] else array[''owner'',''admin'',''recruiter'']::public.membership_role[] end) then raise exception ''PT_ACCESS_DENIED'' using errcode=''42501'';end if;\n if not (select active from private.prisma_token_accounts';
  if position('if not (select active from private.prisma_token_accounts' in source_value)=0 then raise exception 'V3M0 token reservation entry anchor changed';end if;
  execute replace(definition_value,source_value,replace(source_value,'if not (select active from private.prisma_token_accounts',guard_value));
 end if;
end $$;
