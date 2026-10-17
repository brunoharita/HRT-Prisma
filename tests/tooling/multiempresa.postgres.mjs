import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const bin=process.env.PRISMA_PG_BIN??"C:/Program Files/PostgreSQL/17/bin/",port=process.env.PRISMA_TEST_PG_PORT??"5846";
const sorting=process.argv.includes('--sorting');
const ownerOnboarding=process.argv.includes('--owner-onboarding')||sorting;
const work=resolve(`tmp/v3m0-pg-${Date.now()}`),evidence=sorting?"docs/qa/evidence/groups-sorting-v303":ownerOnboarding?"docs/qa/evidence/owner-onboarding-v301":"docs/qa/evidence/v3m0-multiempresa",checks=[];
mkdirSync(work,{recursive:true});mkdirSync(evidence,{recursive:true});
const cmd=(name,args,input)=>(execFileSync(bin+name+".exe",args,{input,encoding:"utf8",stdio:name==="pg_ctl"?"ignore":["pipe","pipe","pipe"],env:{...process.env,PGCLIENTENCODING:"UTF8"}})??"").trim();
const args=["-X","-qAt","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose","-h","127.0.0.1","-p",port,"-U","prisma_test","-d","postgres","-f","-"];
const run=sql=>cmd("psql",args,sql),check=(name,pass)=>{checks.push({name,pass:Boolean(pass)});assert.ok(pass,name);};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const as=(user,sql,role="authenticated")=>`set role ${role};select set_config('request.jwt.claim.sub','${user===null?"":id(user)}',false);${sql};`;
const uuid=value=>String(value).includes("-")?value:id(value);
const call=(action,g=null,o=null,data={})=>`select public.organization_administration('${action}',${g?`'${uuid(g)}'`:"null"},${o?`'${uuid(o)}'`:"null"},'${JSON.stringify(data).replaceAll("'","''")}'::jsonb,'organization-administration-1.0.0')`;
const ws=user=>JSON.parse(run(as(user,call("workspace"))).split("\n").at(-1));
const rev=(g,user=1)=>ws(user).groups.find(x=>x.id===uuid(g)).revision;
const fail=(name,sql,fragment)=>{let denied=false;try{run(sql);}catch(e){denied=String(e.stderr).includes(fragment);}check(name,denied);};
const source=readFileSync("supabase/migrations/20260824113000_m2_users_people.sql","utf8");
const initial=readFileSync("supabase/migrations/20260820200810_initial_prisma_schema.sql","utf8");
const func=name=>{const f=source.match(new RegExp(`create or replace function private\\.${name}\\([\\s\\S]*?\\$\\$;`))?.[0];assert.ok(f,name);return f;};
const table=name=>{const t=source.match(new RegExp(`create table public\\.${name} \\([\\s\\S]*?\\n\\);`))?.[0];assert.ok(t,name);return t;};
const migration=readFileSync("supabase/migrations/20261017040000_multiempresa_v3.sql","utf8");
let started=false;
try {
 cmd("initdb",["-D",work+"/data","-U","prisma_test","-A","trust","--encoding=UTF8","--locale=C"]);
 cmd("pg_ctl",["-D",work+"/data","-l",work+"/server.log","-o",`-h 127.0.0.1 -p ${port}`,"-w","start"]);started=true;
 check("isolated PG17 on localhost",run("select host(inet_server_addr())||'|'||current_setting('server_version_num')").startsWith("127.0.0.1|17"));
 run(`create schema auth;create role anon;create role authenticated;create role service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;
 ${initial.slice(0,initial.indexOf('create or replace function private.has_org_role')).replace("enum ('admin', 'recruiter', 'hiring_manager')","enum ('super_admin','owner','admin','recruiter','member')")}
 ${table('organization_groups')}
 alter table public.organizations add group_id uuid not null references public.organization_groups(id);
 create type public.platform_user_status as enum('pending_first_access','active','inactive','blocked');
 create type public.platform_credential_mode as enum('manual_password','activation_link');
 ${func('touch_updated_at')}${func('is_reserved_username')}
 ${table('platform_users').replaceAll('public.membership_role_v2','public.membership_role')}
 create unique index platform_users_email_unique_idx on public.platform_users(lower(email));
 ${table('platform_user_audit_events')}
 ${['sync_owner_memberships_for_user','sync_owner_memberships_for_group','platform_users_owner_membership_trigger','validate_membership_scope','is_active_platform_user','is_super_admin','has_org_role'].map(func).join('\n')}
 create trigger platform_users_sync_owner_memberships after insert or update of access_profile,group_id on public.platform_users for each row execute function private.platform_users_owner_membership_trigger();
 create trigger organizations_sync_owner_memberships after insert or update of group_id on public.organizations for each row execute function private.sync_owner_memberships_for_group();
 create trigger organization_memberships_validate_scope before insert or update on public.organization_memberships for each row execute function private.validate_membership_scope();
 grant usage on schema private to authenticated;grant execute on function private.has_org_role(uuid,public.membership_role[]) to authenticated;
 ${source.match(/create policy [\s\S]*?(?=revoke all on all tables in schema public)/)?.[0]}
 do $$declare t record;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t.tablename);end loop;end$$;
 grant select on all tables in schema public to authenticated;
 insert into public.organization_groups(id,name,slug) values('${id(100)}','Grupo A','grupo-a'),('${id(200)}','Grupo B','grupo-b');
 insert into public.organizations(id,name,group_id) values('${id(110)}','Empresa A1','${id(100)}'),('${id(111)}','Empresa A2','${id(100)}'),('${id(210)}','Empresa B1','${id(200)}');
 insert into auth.users select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'synthetic'||n||'@example.invalid','{}' from generate_series(1,10)n;
 insert into public.platform_users(auth_user_id,full_name,username,email,access_profile,group_id) values
 ('${id(1)}','Super sintético','super.synthetic','super@example.invalid','super_admin',null),
 ('${id(2)}','Owner A','owner.synthetic.a','ownera@example.invalid','owner','${id(100)}'),
 ('${id(3)}','Recruiter A','recruiter.synthetic.a','reca@example.invalid','admin','${id(100)}'),
 ('${id(4)}','Comum A','common.synthetic.a','common@example.invalid','member','${id(100)}'),
 ('${id(5)}','Owner B','owner.synthetic.b','ownerb@example.invalid','owner','${id(200)}'),
 ('${id(6)}','Recruiter B','recruiter.synthetic.b','recb@example.invalid','recruiter','${id(200)}'),
 ('${id(7)}','Comum A2','common.synthetic.a2','common2@example.invalid','member','${id(100)}');
 insert into public.organization_memberships(organization_id,user_id,role) values('${id(110)}','${id(3)}','admin'),('${id(110)}','${id(4)}','member'),('${id(111)}','${id(7)}','member'),('${id(210)}','${id(6)}','recruiter');`);
 // Reproduce pre-existing Super residues without weakening the migration's validator.
 run(`alter table public.organization_memberships disable trigger organization_memberships_validate_scope;
 insert into public.organization_memberships(organization_id,user_id,role) values('${id(110)}','${id(1)}','admin'),('${id(210)}','${id(1)}','recruiter');
 alter table public.organization_memberships enable trigger organization_memberships_validate_scope;`);
 // Install the real follow-up gate and signature-compatible delegation fixtures for the
 // other service RPCs. These prove the injected boundary, not matching/wallet algorithms.
 const followUp=readFileSync("supabase/migrations/20261008120000_position_follow_up.sql","utf8").match(/create (?:or replace )?function private\.authorize_position_follow_up[\s\S]*?\$\$;/)?.[0];assert.ok(followUp);
 const boundaries=['claim_matching_legacy_review_refresh','claim_stable_matching_score','commit_matching_snapshot','complete_stable_matching_score','load_matching_trajectory_review','save_matching_trajectory_review'];
 run(`${followUp}
 create function private.m83_sources(p_actor uuid,p_organization uuid,p_profile uuid,p_position uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin return '{"delegated":true}'::jsonb;end$$;
 ${boundaries.map(name=>`create function public.${name}(p_actor_id uuid,p_organization_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin return '{"delegated":true}'::jsonb;end$$;`).join('\n')}
 create table private.prisma_token_accounts(organization_id uuid primary key,active boolean);
 insert into private.prisma_token_accounts values('${id(110)}',true),('${id(210)}',true);
 create function private.prisma_token_reserve(p_org uuid,p_function text,p_operation uuid,p_quote uuid,p_quantity integer) returns uuid language plpgsql security definer set search_path='' as $$declare q record;begin
 if p_operation='${id(999)}' then return p_quote;end if;
 select p_quote as actor_id into q;
 if not (select active from private.prisma_token_accounts where organization_id=p_org) then raise exception 'account inactive';end if;
 return p_quote;end$$;`);
 const boundaryBefore=run("select jsonb_object_agg(n.nspname||'.'||p.proname,p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('authorize_position_follow_up','m83_sources','prisma_token_reserve',"+boundaries.map(n=>`'${n}'`).join(',')+")");
 run("begin;\n"+migration+"\ncommit;");
 if(ownerOnboarding)run('begin;'+readFileSync('supabase/migrations/20261017122000_owner_onboarding_v301.sql','utf8')+'commit;');
 if(sorting){
  const before=run("select pg_get_functiondef('public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure)");
  const acl=run("select proacl::text from pg_proc where oid='public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure");
  run('create trigger organization_groups_touch_updated_at before update on public.organization_groups for each row execute function private.touch_updated_at();create trigger organizations_touch_updated_at before update on public.organizations for each row execute function private.touch_updated_at();');
  run('begin;'+readFileSync('supabase/migrations/20261017143000_group_company_sorting.sql','utf8')+'commit;');
  const after=run("select pg_get_functiondef('public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure)");
  const expected=before.replace("p_contract is distinct from 'organization-administration-1.0.0'","(p_contract is null or p_contract not in ('organization-administration-1.0.0','organization-administration-1.1.0'))").replace("'id',visible_group.id,'name',visible_group.name,'status',visible_group.status","'id',visible_group.id,'name',visible_group.name,'createdAt',visible_group.created_at,'updatedAt',visible_group.updated_at,'status',visible_group.status").replace("'id',x.id,'name',x.name,'status',x.status,'groupId',x.group_id","'id',x.id,'name',x.name,'createdAt',x.created_at,'updatedAt',x.updated_at,'status',x.status,'groupId',x.group_id");
  check('sorting SQL exactly three additive replacements',after===expected);
  check('sorting SQL preserves ACL',acl===run("select proacl::text from pg_proc where oid='public.organization_administration(text,uuid,uuid,jsonb,text)'::regprocedure"));
  const current=user=>JSON.parse(run(as(user,call('workspace').replace('organization-administration-1.0.0','organization-administration-1.1.0'))).split('\n').at(-1));
  for(const user of [1,2,3]){
   const data=current(user),legacy=ws(user);
   check('new and legacy contracts preserve exact scope '+user,JSON.stringify(data.groups)===JSON.stringify(legacy.groups));
   for(const group of data.groups){
    check('group dates from stored row '+user+' '+group.id,run(`select created_at='${group.createdAt}'::timestamptz and updated_at='${group.updatedAt}'::timestamptz from public.organization_groups where id='${group.id}'`)==='t');
    for(const company of group.companies)check('company dates from stored row '+user+' '+company.id,run(`select created_at='${company.createdAt}'::timestamptz and updated_at='${company.updatedAt}'::timestamptz from public.organizations where id='${company.id}'`)==='t');
   }
  }
  fail('new contract rejects common user',as(4,call('workspace').replace('organization-administration-1.0.0','organization-administration-1.1.0')),'42501');
  for(const contract of ['unknown',''])fail('sorting rejects unknown contract '+contract,as(1,call('workspace').replace('organization-administration-1.0.0',contract)),'22023');
  fail('sorting rejects anonymous',as(null,call('workspace')),'42501');
  fail('sorting preserves private actor boundary',as(1,'select private.organization_admin_actor(null,null)'),'permission denied');
  const original=current(1).groups.find(g=>g.id===id(100));
  run(`update public.organization_groups set name=name where id='${id(100)}';update public.organizations set name=name where id='${id(110)}'`);
  const changed=current(1).groups.find(g=>g.id===id(100));
  check('update dates advance without changing creation',Date.parse(changed.updatedAt)>Date.parse(original.updatedAt)&&changed.createdAt===original.createdAt&&Date.parse(changed.companies.find(c=>c.id===id(110)).updatedAt)>Date.parse(original.companies.find(c=>c.id===id(110)).updatedAt));
  fail('sorting migration refuses unexpected replay baseline',readFileSync('supabase/migrations/20261017143000_group_company_sorting.sql','utf8'),'Unexpected organization_administration baseline');
 }
 const boundaryAfter=JSON.parse(run("select jsonb_object_agg(n.nspname||'.'||p.proname,p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('authorize_position_follow_up','m83_sources','prisma_token_reserve',"+boundaries.map(n=>`'${n}'`).join(',')+")"));
 for(const [name,body] of Object.entries(JSON.parse(boundaryBefore))){const restored=boundaryAfter[name].replace(/begin\n -- V3M0_ORGANIZATION_STATE_GUARD\n[^\n]*\n/,'begin').replace(/-- V3M0_TOKEN_STATE_GUARD\n[^\n]*\n /,'');check(`existing function body preserved except guard: ${name}`,restored===body);}
 run("create function public.test_follow_up(uuid) returns uuid language sql security definer set search_path='' as $$select private.authorize_position_follow_up($1)$$;create function public.test_reserve(uuid,text,uuid,uuid) returns uuid language sql security definer set search_path='' as $$select private.prisma_token_reserve($1,$2,$3,$4,1)$$;");
 check("live authority RPC admits local Recruiter",run(as(3,`select public.can_operate_prisma_organization('${id(110)}')`)).endsWith('t'));
 check("live authority RPC rejects common",run(as(4,`select public.can_operate_prisma_organization('${id(110)}')`)).endsWith('f'));
 check("real follow-up gate delegates authorized actor",run(as(3,`select public.test_follow_up('${id(110)}')`)).endsWith(id(3)));
 for(const name of boundaries)check(`active matching boundary delegates: ${name}`,run(`select public.${name}('${id(3)}','${id(110)}')->>'delegated'`)==='true');
 check("common synthesis reservation preserved",run(`select public.test_reserve('${id(110)}','profile_synthesis','${id(998)}','${id(4)}')`)===id(4));
 fail("common cannot reserve administrator function",`select public.test_reserve('${id(110)}','matching','${id(998)}','${id(4)}')`,'42501');
 check("legacy Admin migrated without changing memberships",run(`select access_profile||'|'||(select role from public.organization_memberships where user_id='${id(3)}') from public.platform_users where auth_user_id='${id(3)}'`)==="recruiter|recruiter");
 check("legacy Super memberships preserved without default or new authority",run(`select count(*)=2 and bool_and(not is_default) and count(*) filter(where role='admin')=1 from public.organization_memberships where user_id='${id(1)}'`)==='t');
 fail("new Super memberships remain forbidden",`insert into public.organization_memberships(organization_id,user_id,role) values('${id(111)}','${id(1)}','recruiter')`,'42501');
 check("legacy alias transition is audited as system metadata",run("select count(*) from public.platform_user_audit_events where action='access_profile_canonicalized_v3' and actor_auth_user_id is null")==="1");
 check("existing capacity and companies preserved",ws(1).groups.find(g=>g.id===id(100)).companyLimit===2);
 check("Super sees both groups",ws(1).groups.length===2);
 check("Owner sees own two companies",ws(2).groups.length===1&&ws(2).groups[0].companies.length===2);
 check("Recruiter sees only assigned company",ws(3).groups.length===1&&ws(3).groups[0].companies.length===1);
 fail("common cannot administer",as(4,call("workspace")),"42501");
 fail("no identity cannot administer",as(null,call("workspace")),"42501");
 fail("anonymous has no execute",as(null,call("workspace"),"anon"),"permission denied");
 fail("unknown contract denied",as(1,"select public.organization_administration('workspace',null,null,'{}','unknown')"),"incompatível");
 fail("missing contract denied",as(1,"select public.organization_administration('workspace')"),"incompatível");
 fail("Recruiter cannot read other group",as(3,call("list_links",200,210,{revision:rev(200)})),"fora do seu escopo");
 fail("Recruiter cannot edit unassigned company",as(3,call("configure_company",100,111,{revision:rev(100),name:"Denied"})),"fora do seu escopo");
 fail("company capacity enforced",as(3,call("create_company",100,null,{revision:rev(100),name:"Denied"})),"Limite");
 fail("Recruiter cannot change plan",as(3,call("configure_group",100,null,{revision:rev(100),companyLimit:3})),"Somente Owner");
 fail("Owner cannot change plan",as(2,call("configure_group",100,null,{revision:rev(100),companyLimit:3})),"exclusivos");
 fail("below existing capacity denied",as(1,call("configure_group",100,null,{revision:rev(100),companyLimit:1})),"inferior");
 fail("Professional cap five",as(1,call("configure_group",100,null,{revision:rev(100),companyLimit:6})),"check constraint");
 const beforeRev=rev(100);run(as(1,call("configure_group",100,null,{revision:beforeRev,companyLimit:3})));
 fail("stale revision denied",as(3,call("create_company",100,null,{revision:beforeRev,name:"Stale"})),"Atualize");
 const newCompany=JSON.parse(run(as(3,call("create_company",100,null,{revision:rev(100),name:"Empresa criada pelo Recruiter"}))).split("\n").at(-1)).organizationId;
 check("Recruiter creates within plan",!!newCompany);
 check("creator gets only new explicit link",run(`select role from public.organization_memberships where organization_id='${newCompany}' and user_id='${id(3)}'`)==="recruiter");
 check("Owner gets new company via existing owner trigger",run(`select role from public.organization_memberships where organization_id='${newCompany}' and user_id='${id(2)}'`)==="owner");
 check("Recruiter still cannot see other group",ws(3).groups[0].companies.length===2&&ws(3).groups.length===1);
 fail("cross group link denied",as(3,call("save_link",100,110,{revision:rev(100),userId:id(6),linked:true})),"não elegível");
 run(as(3,call("save_link",100,110,{revision:rev(100),userId:id(7),linked:true,isDefault:true})));
 check("existing common gets second same-group link",run(`select count(*) from public.organization_memberships where user_id='${id(7)}'`)==="2");
 check("common default chosen on server",run(as(7,"select public.get_prisma_default_organization()")).split("\n").at(-1)===id(110));
 check("hidden membership preserved",run(`select count(*) from public.organization_memberships where user_id='${id(7)}' and organization_id='${id(111)}'`)==="1");
 fail("self membership escalation denied",as(3,call("save_link",100,110,{revision:rev(100),userId:id(3),linked:false})),"não elegível");
 fail("last common link cannot be removed",as(3,call("save_link",100,110,{revision:rev(100),userId:id(4),linked:false})),"pelo menos uma");
 const r=rev(100);run(`alter table public.platform_user_audit_events add constraint test_audit_failure check(action<>'organization_admin:configure_company');`);
 fail("audit failure rolls back mutation",as(3,call("configure_company",100,110,{revision:r,name:"Must rollback"})),"test_audit_failure");
 check("audit failure preserves name and revision",run(`select name from public.organizations where id='${id(110)}'`)==="Empresa A1"&&rev(100)===r);
 run("alter table public.platform_user_audit_events drop constraint test_audit_failure");
 check("Recruiter inherits former Admin guarded authority",run(as(3,`select private.has_org_role('${id(110)}',array['owner','admin']::public.membership_role[])`)).endsWith("t"));
 check("Member cannot inherit admin",run(as(4,`select private.has_org_role('${id(110)}',array['owner','admin']::public.membership_role[])`)).endsWith("f"));
 const knowledgeSource=readFileSync("supabase/migrations/20260826201154_m4_knowledge_foundation.sql","utf8");
 const knowledgeGate=knowledgeSource.match(/create or replace function private\.require_knowledge_admin[\s\S]*?\$\$;/)?.[0];assert.ok(knowledgeGate);run(knowledgeGate);
 run("create function public.test_knowledge_boundary(uuid) returns uuid language sql security definer set search_path='' as $$select private.require_knowledge_admin($1)$$;");
 check("real Knowledge gate allows Recruiter only locally",run(as(3,`select public.test_knowledge_boundary('${id(110)}')`)).endsWith(id(3)));
 fail("real Knowledge gate rejects Recruiter global authority",as(3,"select public.test_knowledge_boundary(null)"),"42501");
 fail("real Knowledge gate rejects cross-tenant authority",as(3,`select public.test_knowledge_boundary('${id(210)}')`),"42501");
 check("cross-tenant RLS hides organization",run(as(3,`select count(*) from public.organizations where id='${id(210)}'`)).endsWith("0"));
 fail("client cannot call service persistence",as(3,`select public.save_platform_user_v3('${id(3)}','${id(4)}','{}','{}')`),"permission denied");
 const userData=(n,profile="member",group=100)=>({fullName:"Usuário sintético "+n,username:"synthetic.user."+n,email:"synthetic"+n+"@example.invalid",profile,groupId:uuid(group),status:"active",credentialMode:"activation_link",mustChangePassword:false});
 const save=(actor,n,data,orgs)=>as(null,`select public.save_platform_user_v3('${id(actor)}','${id(n)}','${JSON.stringify(data)}',array[${orgs.map(x=>`'${uuid(x)}'::uuid`).join(',')}])`,"service_role");
 run(save(3,8,userData(8),[110,newCompany]));
 check("transactional persistence creates operator and both links",run(`select count(*) from public.organization_memberships where user_id='${id(8)}'`)==="2");
 check("transactional persistence sets one default",run(`select count(*) from public.organization_memberships where user_id='${id(8)}' and is_default`)==="1");
 fail("common actor cannot persist users through service boundary",save(4,9,userData(9),[110]),"Operador sem autoridade");
 fail("Recruiter cannot grant unassigned company",save(3,9,userData(9),[111]),"fora do escopo");
 fail("Recruiter cannot grant Owner",save(3,9,userData(9,"owner"),[110]),"não concede Owner");
 fail("cross group operator assignment denied",save(3,9,userData(9,"member",200),[210]),"fora do escopo");
 fail("duplicate active Owner denied",save(1,9,userData(9,"owner"),[110]),"platform_users_one_active_owner");
 check("failed operator persistence leaves no partial user",run(`select count(*) from public.platform_users where auth_user_id='${id(9)}'`)==="0");
 run(`alter table public.platform_user_audit_events add constraint test_user_audit_failure check(action<>'user_created') not valid;`);
 fail("user audit failure aborts operator and memberships",save(3,9,userData(9),[110]),"test_user_audit_failure");
 check("no operator residue after audit failure",run(`select (select count(*) from public.platform_users where auth_user_id='${id(9)}')+(select count(*) from public.organization_memberships where user_id='${id(9)}')`)==="0");
 run("alter table public.platform_user_audit_events drop constraint test_user_audit_failure");
 fail("active Owner cannot be removed",save(1,2,userData(2,"recruiter"),[110,111]),"transferência");
 fail("self scope expansion denied",save(3,3,{...userData(3,"recruiter"),status:"inactive"},[110,newCompany]),"Autoalteração");
 run("create function public.test_erasure_boundary(uuid) returns text language sql security definer set search_path='' as $$select private.person_deletion_actor_kind($1)$$;");
 check("former Admin erasure actor remains compatible",run(as(3,`select public.test_erasure_boundary('${id(110)}')`)).endsWith("admin"));
 fail("common cannot obtain erasure authority",as(4,`select public.test_erasure_boundary('${id(110)}')`),"person_deletion_access_denied");
 run(`insert into public.people(id,organization_id,full_name) values('${id(120)}','${id(110)}','Pessoa sintética'),('${id(220)}','${id(210)}','Pessoa sintética B');
 insert into public.person_private_data(organization_id,person_id,email) values('${id(110)}','${id(120)}','synthetic@example.invalid'),('${id(210)}','${id(220)}','synthetic-b@example.invalid');`);
 check("recruiter can read own private person data",run(as(3,"select count(*) from public.person_private_data")).endsWith("1"));
 check("common cannot read private person data",run(as(4,"select count(*) from public.person_private_data")).endsWith("0"));
 check("own person remains visible without cross-tenant person",run(as(3,"select count(*) from public.people")).endsWith("1"));
 run(as(3,call("configure_company",100,newCompany,{revision:rev(100),status:"inactive"})));
 check("inactive organization denies old session helper",run(as(3,`select private.has_org_role('${newCompany}',array['recruiter']::public.membership_role[])`)).endsWith("f"));
 check("inactive organization denies Knowledge operational RPC",run(as(3,`select public.can_operate_prisma_organization('${newCompany}')`)).endsWith('f'));
 fail("inactive organization denies real follow-up gate",as(3,`select public.test_follow_up('${newCompany}')`),'42501');
 for(const name of boundaries)fail(`inactive matching boundary denied: ${name}`,`select public.${name}('${id(3)}','${newCompany}')`,'42501');
 fail("inactive profile sources boundary denied",`select private.m83_sources('${id(3)}','${newCompany}',null,null)`,'42501');
 fail("inactive organization denies new token reservation",`select public.test_reserve('${newCompany}','matching','${id(998)}','${id(3)}')`,'42501');
 check("existing token replay survives company inactivation",run(`select public.test_reserve('${newCompany}','matching','${id(999)}','${id(3)}')`)===id(3));
 check("Super retains inactive service boundary visibility",run(`select public.load_matching_trajectory_review('${id(1)}','${newCompany}')->>'delegated'`)==='true');
 check("Super preserves global visibility of inactive organization",run(as(1,`select private.has_org_role('${newCompany}',array['member']::public.membership_role[])`)).endsWith("t"));
 check("inactive organization preserves memberships",run(`select count(*)>0 from public.organization_memberships where organization_id='${newCompany}'`)==="t");
 fail("inactivation does not free a company slot",as(3,call("create_company",100,null,{revision:rev(100),name:"No slot recycling"})),"Limite");
 run(as(3,call("configure_company",100,newCompany,{revision:rev(100),status:"active"})));
 fail("primary company protected",as(2,call("configure_company",100,110,{revision:rev(100),status:"inactive"})),"principal");
 const createdGroup=JSON.parse(run(as(1,call("create_group",null,null,{name:ownerOnboarding?'HRT Solutions':"Grupo em preparação",companyName:"Primeira empresa"}))).split("\n").at(-1));
 check("new group remains preparation without invented owner",ws(1).groups.some(g=>g.id===createdGroup.groupId&&g.status==="draft"&&g.owner===null));
 fail("new group cannot activate without active Owner",as(1,call("configure_group",createdGroup.groupId,null,{revision:1,status:"active"})),"Owner ativo");
 if(ownerOnboarding){
  const contract='owner-onboarding-1.0.0',gid=createdGroup.groupId,company=createdGroup.organizationId;
  const context=(actor=1,group=gid,version=contract)=>as(null,`select public.owner_onboarding_context_v301('${id(actor)}','${uuid(group)}','${version}')`,'service_role');
  const canonical=JSON.parse(run(context()).split('\n').at(-1));
  check('Owner context canonical username from group',canonical.username==='hrtsolutions.owner');
  check('Owner context binds profile/group/first company',canonical.profile==='owner'&&canonical.group.id===gid&&canonical.company.id===company&&canonical.company.name==='Primeira empresa');
  fail('Owner context cannot be invoked directly by client',as(1,`select public.owner_onboarding_context_v301('${id(1)}','${gid}','${contract}')`),'permission denied');
  fail('Owner persistence cannot be invoked directly by client',as(1,`select public.create_group_owner_v301('${id(1)}','${id(9)}','${gid}','${company}','{}','${contract}')`),'permission denied');
  for(const actor of [2,3,4])fail('Owner onboarding requires active Super '+actor,context(actor),'42501');
  fail('Owner context unknown contract denied',context(1,gid,'unknown'),'22023');
  fail('Owner context active group denied',context(1,100),'22023');
  fail('Owner context unknown group denied',context(1,9999),'22023');
  const data={...userData(9,'owner',gid),username:canonical.username};
  const create=(n=9,input=data,org=company,version=contract)=>as(null,`select public.create_group_owner_v301('${id(1)}','${id(n)}','${gid}','${org}','${JSON.stringify(input)}','${version}')`,'service_role');
  for(const [name,input,org] of [['username',{...data,username:'changed.owner'},company],['profile',{...data,profile:'recruiter'},company],['group',{...data,groupId:id(100)},company],['company',data,id(110)]])fail('Owner protected '+name+' cannot change',create(9,input,org),'42501');
  fail('Owner persistence unknown contract denied',create(9,data,company,'unknown'),'22023');
  fail('Owner persistence never replaces existing identity',create(8),'42501');
  run(as(1,call('configure_group',gid,null,{revision:rev(gid),name:'Renamed Group'})));
  fail('Owner persistence rejects stale group name',create(),'42501');
  run(as(1,call('configure_group',gid,null,{revision:rev(gid),name:'HRT Solutions'})));
  run(`update public.platform_users set username='hrtsolutions.owner' where auth_user_id='${id(8)}'`);
  fail('Owner username collision never invents suffix',context(),'23505');
  run(`update public.platform_users set username='synthetic.user.8' where auth_user_id='${id(8)}'`);
  run("alter table public.platform_user_audit_events add constraint owner_audit_failure check(action<>'owner_onboarding_completed_v301') not valid");
  fail('Owner contextual audit failure rolls back all domain writes',create(),'owner_audit_failure');
  check('Owner audit failure preserves absent user and memberships',run(`select (select count(*) from public.platform_users where auth_user_id='${id(9)}')+(select count(*) from public.organization_memberships where user_id='${id(9)}')`)==='0');
  run('alter table public.platform_user_audit_events drop constraint owner_audit_failure');
  const parallelOwner=n=>new Promise(resolve=>{const child=spawn(bin+'psql.exe',args,{stdio:['pipe','pipe','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.stdout.resume();child.on('exit',code=>resolve({code,error}));child.stdin.end(create(n,{...data,email:`owner${n}@example.invalid`,username:'hrtsolutions.owner'}));});
  const result=await Promise.all([parallelOwner(9),parallelOwner(10)]);
  check('concurrent initial Owner creation has one winner',result.filter(r=>r.code===0).length===1);
  check('Owner contextual audit recorded once',run(`select count(*) from public.platform_user_audit_events where group_id='${gid}' and action='owner_onboarding_completed_v301'`)==='1');
  fail('Owner context refuses replay after creation',context(),'23505');
  const invalidGroup=JSON.parse(run(as(1,call('create_group',null,null,{name:'Grupo Árvore',companyName:'Primeira empresa'}))).split('\n').at(-1));
  fail('unsupported username characters never transliterated',context(1,invalidGroup.groupId),'22023');
  run(`update public.organization_groups set name=repeat('A',40) where id='${invalidGroup.groupId}'`);
  fail('long group username never truncated',context(1,invalidGroup.groupId),'22023');
  run(`update public.organization_groups set name='Another Group' where id='${invalidGroup.groupId}';insert into public.organizations(name,group_id,status) values('Segunda empresa','${invalidGroup.groupId}','draft')`);
  fail('Owner context refuses more than first company',context(1,invalidGroup.groupId),'22023');
 }else run(save(1,9,userData(9,"owner",createdGroup.groupId),[createdGroup.organizationId]));
 check("explicit Owner can be designated in preparation",ws(1).groups.find(g=>g.id===createdGroup.groupId).owner.status==="active");
 run(as(1,call("configure_company",createdGroup.groupId,createdGroup.organizationId,{revision:rev(createdGroup.groupId),status:"active"})));
 run(as(1,call("configure_group",createdGroup.groupId,null,{revision:rev(createdGroup.groupId),status:"active"})));
 check("group activates only after owner and primary are ready",ws(1).groups.find(g=>g.id===createdGroup.groupId).status==="active");
 check("drafts do not create token accounts",run("select count(*) from private.prisma_token_accounts")==="2");
 // Concurrency uses independent PostgreSQL connections; the group lock serializes slot allocation.
 run(as(1,call("configure_group",200,null,{revision:rev(200),companyLimit:2})));
 const revision=rev(200),sql=as(5,call("create_company",200,null,{revision,name:"Último slot"}));
 const parallel=()=>new Promise(resolve=>{const child=spawn(bin+"psql.exe",args,{stdio:["pipe","pipe","pipe"]});let error="";child.stderr.on("data",d=>error+=d);child.stdout.resume();child.on("exit",code=>resolve({code,error}));child.stdin.end(sql);});
 const results=await Promise.all([parallel(),parallel()]);
 check("concurrent slot allocation has one winner",results.filter(r=>r.code===0).length===1);
 check("concurrent slot allocation never exceeds cap",ws(5).groups[0].activeCount===2);
 check("all mutations audited",Number(run("select count(*) from public.platform_user_audit_events"))>=7);
} finally {
 writeFileSync(evidence+"/postgres.json",JSON.stringify({engine:"PostgreSQL17 isolated local; real source table/helper/policy subset; Auth.uid fixture",checks},null,2));
 if(started)cmd("pg_ctl",["-D",work+"/data","-m","fast","-w","stop"]);
}
console.log(JSON.stringify({checks:checks.length,pass:true}));
