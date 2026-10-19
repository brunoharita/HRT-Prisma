import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
export async function verifySelfAccount({run,check,fail,id,as,bin,args}){
 const scalar=q=>run(q).split('\n').filter(Boolean).at(-1),json=q=>JSON.parse(scalar(q));
 const snapshot=()=>run("select jsonb_agg(to_jsonb(u) order by id) from public.platform_users u"),members=()=>run("select jsonb_agg(to_jsonb(m) order by organization_id,user_id) from public.organization_memberships m");
 const before=snapshot(),beforeMembers=members();
 run('create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id),not_after timestamptz);');
 run('begin;'+readFileSync('supabase/migrations/20261018230000_operator_self_account.sql','utf8')+'commit;');
 check('self migration preserves every existing user and membership',before===snapshot()&&beforeMembers===members());
 run(`insert into public.organization_groups(id,name,slug) values('${id(4000)}','Grupo próprio','self-test');insert into public.organizations(id,name,group_id) values('${id(4100)}','Empresa própria','${id(4000)}');insert into private.organization_group_settings(group_id,primary_organization_id) values('${id(4000)}','${id(4100)}');`);
 for(const [n,role] of [[40,'super_admin'],[41,'owner'],[42,'recruiter'],[43,'member'],[44,'member']]){
  run(`insert into auth.users values('${id(n)}','self${n}@example.invalid','{}');insert into auth.sessions(id,user_id) values('${id(n+100)}','${id(n)}');insert into public.platform_users(auth_user_id,full_name,username,email,access_profile,group_id) values('${id(n)}','Próprio ${n}','self.${n}','shared@example.invalid','${role}',${role==='super_admin'?'null':`'${id(4000)}'`});`);
  if(!['owner','super_admin'].includes(role))run(`insert into public.organization_memberships(organization_id,user_id,role) values('${id(4100)}','${id(n)}','${role}');`);
 }
 const rpc=(n,action,data={},session=n+100)=>`select public.operator_self_account_v313('${id(n)}','${id(session)}','${action}','${JSON.stringify(data).replaceAll("'","''")}')`;
 const call=(n,a,d)=>json('set role service_role;'+rpc(n,a,d)+';reset role;');
 const read=n=>call(n,'read');
 const input=(n,extra={})=>({revision:read(n).revision,fullName:'Nome atualizado',username:'self.'+n,phoneCountryIso2:'BR',phoneCountryLabel:'Brasil',phoneCountryCode:'+55',phoneNationalNumber:'11999999999',phoneE164:'+5511999999999',...extra});
 const scopeSnapshot=run("select jsonb_agg(jsonb_build_array(auth_user_id,access_profile,group_id,status) order by auth_user_id) from public.platform_users"),scopeMembers=members();
 for(const n of [40,41,42,43])check('self read supported for active profile '+n,read(n).username==='self.'+n);
 for(const role of ['anon','authenticated'])fail('browser role cannot call backend self writer '+role,as(43,rpc(43,'read'),role),'42501');
 fail('session from another identity rejected',rpc(43,'read',{},144),'42501');
 run(`delete from auth.sessions where id='${id(144)}'`);fail('revoked session rejected',rpc(44,'read'),'42501');run(`insert into auth.sessions(id,user_id,not_after) values('${id(144)}','${id(44)}',clock_timestamp()-interval '1 second')`);
 fail('expired session lifetime rejected',rpc(44,'read'),'42501');run(`update auth.sessions set not_after=null where id='${id(144)}'`);
 for(const status of ['inactive','blocked','pending_first_access']){run(`update public.platform_users set status='${status}' where auth_user_id='${id(44)}'`);fail('self account unavailable '+status,rpc(44,'read'),'42501');}
 run(`update public.platform_users set status='active',must_change_password=true where auth_user_id='${id(44)}'`);fail('mandatory first access cannot be bypassed',rpc(44,'read'),'42501');run(`update public.platform_users set must_change_password=false where auth_user_id='${id(44)}'`);
 for(const field of ['profile','status','groupId','organizationIds','authUserId','userId','email'])fail('protected field rejected '+field,rpc(43,'save',input(43,{[field]:'attacker'})),'42501');
 fail('read refuses user ID selector',rpc(43,'read',{userId:id(44)}),'22023');
 call(43,'save',input(43,{username:'updated.common'}));check('username change persisted and identity retained',read(43).username==='updated.common'&&scalar(`select auth_user_id from public.platform_users where username='updated.common'`)===id(43));
 fail('global duplicate username rejected',rpc(44,'save',input(44,{username:'updated.common'})),'23505');
 fail('reserved username rejected',rpc(44,'save',input(44,{username:'admin'})),'23514');
 fail('Owner cannot rename itself',rpc(41,'save',input(41,{username:'renamed.owner'})),'42501');
 fail('Owner username cannot be renamed by other writers',`update public.platform_users set username='renamed.owner' where auth_user_id='${id(41)}'`,'42501');
 call(41,'save',input(41));check('Owner may edit basic fields preserving username',read(41).username==='self.41');
 const stale=input(44);call(44,'save',input(44));fail('stale revision cannot overwrite newer changes',rpc(44,'save',stale),'40001');
 run('alter table public.platform_user_audit_events add constraint self_audit_failure check(action<>\'self_account_updated\') not valid');
 const row=scalar(`select to_jsonb(u) from public.platform_users u where auth_user_id='${id(44)}'`);fail('mandatory audit failure rolls basic update back',rpc(44,'save',input(44,{fullName:'Must roll back'})),'23514');check('failed audited update unchanged',row===scalar(`select to_jsonb(u) from public.platform_users u where auth_user_id='${id(44)}'`));run('alter table public.platform_user_audit_events drop constraint self_audit_failure');
 const revision=input(44);const parallel=()=>new Promise(resolve=>{const child=spawn(bin+'psql.exe',args,{stdio:['pipe','pipe','pipe']});child.stdout.resume();child.stderr.resume();child.on('exit',code=>resolve(code));child.stdin.end(rpc(44,'save',revision));});
 const outcomes=await Promise.all([parallel(),parallel()]);check('concurrent revision has one winner',outcomes.filter(c=>c===0).length===1);
 const security=(n,purpose='email')=>{const s=call(n,'security_begin',{purpose});call(n,'security_finish',{id:s.id,state:'verified'});return s.id;};
 const hash='a'.repeat(64),bad='b'.repeat(64);let seq=500;
 const begin=(n,email='new@example.invalid')=>{const rid=id(++seq);call(n,'email_begin',{id:rid,email,hash,securityId:security(n)});call(n,'email_receipt',{id:rid,state:'accepted',providerId:'synthetic'});return rid;};
 let rid=begin(43);check('email remains unchanged before confirmation',read(43).email==='shared@example.invalid'&&read(43).pendingEmail.email==='new@example.invalid');
 fail('confirmation bound to account/session',rpc(44,'email_confirm',{id:rid,hash}),'42501');
 check('wrong code rejected without rolling back counter',!call(43,'email_confirm',{id:rid,hash:bad}).verified&&scalar(`select attempts from private.operator_self_email_changes where id='${rid}'`)==='1');
 check('correct confirmation changes contact only',call(43,'email_confirm',{id:rid,hash}).verified&&read(43).email==='new@example.invalid');
 const audit=scalar("select count(*) from public.platform_user_audit_events where action='self_email_confirmed'");check('confirmation replay idempotent',call(43,'email_confirm',{id:rid,hash}).reused&&audit===scalar("select count(*) from public.platform_user_audit_events where action='self_email_confirmed'"));
 rid=begin(44);call(44,'email_confirm',{id:rid,hash});check('confirmed email may be shared independently',scalar("select count(*)=2 and count(distinct auth_user_id)=2 from public.platform_users where email='new@example.invalid'")==='t');
 const clear=n=>run(`delete from private.operator_self_email_changes where auth_user_id='${id(n)}';delete from private.operator_self_security_attempts where auth_user_id='${id(n)}'`);
 clear(43);rid=begin(43,'expired@example.invalid');run(`update private.operator_self_email_changes set expires_at=clock_timestamp()-interval '1 second' where id='${rid}'`);check('expired code cannot change contact',!call(43,'email_confirm',{id:rid,hash}).verified&&read(43).email==='new@example.invalid');
 clear(43);rid=begin(43,'locked@example.invalid');for(let i=0;i<5;i++)call(43,'email_confirm',{id:rid,hash:bad});check('fifth wrong code locks request',scalar(`select state from private.operator_self_email_changes where id='${rid}'`)==='locked'&&!call(43,'email_confirm',{id:rid,hash}).verified);
 clear(43);rid=begin(43,'stale@example.invalid');run(`update public.platform_users set email='admin-new@example.invalid' where auth_user_id='${id(43)}'`);check('concurrent administrator contact preserved',!call(43,'email_confirm',{id:rid,hash}).verified&&read(43).email==='admin-new@example.invalid');
 clear(43);rid=begin(43,'cancel@example.invalid');call(43,'email_cancel',{id:rid});check('cancelled request cannot be confirmed',!call(43,'email_confirm',{id:rid,hash}).verified);
 clear(43);rid=begin(43,'resend@example.invalid');fail('resend cooldown enforced',rpc(43,'email_begin',{id:id(++seq),email:'next@example.invalid',hash,securityId:security(43)}),'P0001');
 run(`update private.operator_self_email_changes set created_at=clock_timestamp()-interval '61 seconds' where auth_user_id='${id(43)}'`);const next=begin(43,'second@example.invalid');check('resend invalidates prior code',!call(43,'email_confirm',{id:rid,hash}).verified&&read(43).pendingEmail.id===next);
 run(`update private.operator_self_email_changes set created_at=clock_timestamp()-interval '61 seconds' where auth_user_id='${id(43)}'`);begin(43,'third@example.invalid');run(`update private.operator_self_email_changes set created_at=clock_timestamp()-interval '61 seconds' where auth_user_id='${id(43)}'`);fail('fourth hourly send refused',rpc(43,'email_begin',{id:id(++seq),email:'fourth@example.invalid',hash,securityId:security(43)}),'P0001');
 clear(43);for(let i=0;i<5;i++)call(43,'security_begin',{purpose:'password'});fail('reauthentication attempt limit enforced',rpc(43,'security_begin',{purpose:'password'}),'P0001');
 clear(43);const sid=security(43,'password');fail('password receipt rejects browser role',as(43,`select public.finish_operator_self_password_v313('${id(43)}','${id(143)}','${sid}','changed')`),'42501');fail('password receipt bound to original account/session',`select public.finish_operator_self_password_v313('${id(44)}','${id(144)}','${sid}','changed')`,'42501');run(`delete from auth.sessions where id='${id(143)}'`);run(`set role service_role;select public.finish_operator_self_password_v313('${id(43)}','${id(143)}','${sid}','changed');reset role;`);check('receipt finalized after native Auth revocation',scalar(`select state from private.operator_self_security_attempts where id='${sid}'`)==='changed');check('password audit stores no secret',scalar("select new_values ? 'requestId' and not new_values ? 'password' from public.platform_user_audit_events where action='self_password_changed' order by created_at desc limit 1")==='t');fail('password result receipt immutable',`select public.finish_operator_self_password_v313('${id(43)}','${id(143)}','${sid}','unknown')`,'42501');
 for(const table of ['operator_self_email_changes','operator_self_security_attempts'])check('private RLS and no client/service direct grants '+table,scalar(`select relrowsecurity and not has_table_privilege('authenticated',oid,'select,insert,update,delete') and not has_table_privilege('service_role',oid,'select,insert,update,delete') from pg_class where oid='private.${table}'::regclass`)==='t');
 check('authority and memberships preserved across self actions',scopeMembers===members()&&scopeSnapshot===run("select jsonb_agg(jsonb_build_array(auth_user_id,access_profile,group_id,status) order by auth_user_id) from public.platform_users"));
 const groupRevision=scalar(`select revision from private.organization_group_settings where group_id='${id(4000)}'`);
 run(as(40,`select public.group_owner_lifecycle_v307('replace','${id(4000)}',${groupRevision},'${id(41)}','${id(42)}','Substituição sintética autorizada','owner-lifecycle-1.0.0')`));
 check('existing Owner replacement still operates after username guard',scalar(`select access_profile='owner' and status='active' and username='self.42' from public.platform_users where auth_user_id='${id(42)}'`)==='t');

}
