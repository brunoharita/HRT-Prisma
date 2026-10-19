import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
export async function verifyFirstAccess({run,check,fail,id,as,bin,args}){
 const scalar=q=>run(q).split('\n').filter(Boolean).at(-1),json=q=>JSON.parse(scalar(q));
 const snapshot=()=>run("select jsonb_agg(to_jsonb(u) order by id) from public.platform_users u"),members=()=>run("select jsonb_agg(to_jsonb(m) order by id) from public.organization_memberships m");
 const before=snapshot(),beforeMembers=members();
 const migration=readFileSync('supabase/migrations/20261019110000_preserve_pending_first_access.sql','utf8');
 run('begin;'+migration+'commit;');
 check('first access migration changes no existing user or membership',before===snapshot()&&beforeMembers===members());
 fail('unexpected migration replay fails closed',migration,'Unexpected save_platform_user_v3 baseline');
 run(`insert into auth.users select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'pending'||n||'@example.invalid','{}' from generate_series(60,69)n;`);
 const data=(n,g=100,status='active',extra={})=>({fullName:'Pendente sintético',username:'pending.'+n,email:'shared@example.invalid',profile:'recruiter',groupId:id(g),status,credentialMode:'activation_link',mustChangePassword:true,...extra});
 const save=(n,g=100,status='active',extra={},actor=1)=>as(null,`select public.save_platform_user_v3('${id(actor)}','${id(n)}','${JSON.stringify(data(n,g,status,extra))}',array['${id(g===200?210:110)}']::uuid[])`,'service_role');
 const row=n=>json(`select jsonb_build_object('status',status,'mustChange',must_change_password,'firstAccess',first_access_completed_at,'groupId',group_id,'credentialMode',credential_mode,'username',username) from public.platform_users where auth_user_id='${id(n)}'`);
 const complete=n=>as(null,`select public.complete_first_access_v307('${id(n)}')`,'service_role');
 run(save(60,100,'pending_first_access'));
 const original=row(60),auth=run('select jsonb_agg(to_jsonb(a) order by id) from auth.users a');
 run(save(60,200,'active',{mustChangePassword:false}));
 check('pending edit between groups keeps pending and original credential flags',row(60).status==='pending_first_access'&&row(60).mustChange&&row(60).firstAccess===null&&row(60).credentialMode===original.credentialMode&&row(60).groupId===id(200));
 check('pending transfer commits exactly requested company without old memberships',scalar(`select array_agg(organization_id)::text from public.organization_memberships where user_id='${id(60)}'`)==='{'+id(210)+'}');
 check('update audit records effective pending state',scalar(`select new_values->>'status' from public.platform_user_audit_events where target_auth_user_id='${id(60)}' and action='user_updated' order by created_at desc limit 1`)==='pending_first_access');
 fail('cross group recruiter cannot transfer pending target',save(60,100,'active',{},3),'42501');
 for(const role of ['anon','authenticated'])fail(role+' cannot bypass Edge to save',as(1,save(60).replace(/^set role service_role;/,''),role),'42501');
 run(save(60,200,'inactive'));check('pending account can be administratively disabled',row(60).status==='inactive'&&row(60).mustChange);
 run(save(60,200,'active'));check('re-enable incomplete activation restores pending',row(60).status==='pending_first_access');
 run(complete(60));check('only explicit completion clears requirement and activates',row(60).status==='active'&&!row(60).mustChange&&row(60).firstAccess!==null);
 const completedAt=row(60).firstAccess;run(save(60,100));check('edit after genuine completion keeps timestamp and active state',row(60).status==='active'&&row(60).firstAccess===completedAt&&!row(60).mustChange);
 run(save(61,100,'active',{credentialMode:'manual_password',mustChangePassword:false}));run(save(61,200));
 check('legacy manual active without first access timestamp remains active',row(61).status==='active'&&row(61).firstAccess===null&&!row(61).mustChange);
 run(save(62,100,'pending_first_access'));run(`update public.platform_users set status='blocked' where auth_user_id='${id(62)}'`);
 for(const intent of ['active','inactive']){run(save(62,100,intent));check('generic '+intent+' edit preserves security block',row(62).status==='blocked');}
 fail('blocked account cannot complete first access',complete(62),'42501');
 run(save(63,100,'pending_first_access'));run(save(63,100,'inactive'));fail('inactive account cannot complete first access',complete(63),'42501');
 const newGroup=json(as(1,`select public.organization_administration('create_group',null,null,'{"name":"Pending Owner preservation","companyName":"Primeira empresa"}','organization-administration-1.2.0')`));
 const ownerInput=data(64,100,'pending_first_access',{profile:'owner',groupId:newGroup.groupId});
 const ownerSave=status=>as(null,`select public.save_platform_user_v3('${id(1)}','${id(64)}','${JSON.stringify({...ownerInput,status})}',array['${newGroup.organizationId}']::uuid[])`,'service_role');
 run(ownerSave('pending_first_access'));run(ownerSave('active'));
 const state=()=>json(`select jsonb_build_object('group',g.status,'company',o.status) from public.organization_groups g join public.organizations o on o.group_id=g.id where g.id='${newGroup.groupId}'`);
 check('pending Owner edit does not activate group or first company',row(64).status==='pending_first_access'&&state().group==='draft'&&state().company==='draft');
 run(complete(64));check('actual Owner completion still activates group and first company',state().group==='active'&&state().company==='active');
 // Two real database connections: both interleavings of completion/edit, no stale snapshot wins.
 const parallel=sql=>new Promise((resolve,reject)=>{const p=spawn(bin+'psql.exe',args,{stdio:['pipe','pipe','pipe']});let stderr='';p.stderr.on('data',d=>stderr+=d);p.stdout.resume();p.on('exit',code=>code===0?resolve():reject(Error(stderr)));p.stdin.end(sql);});
 for(const n of [65,66]){
  run(save(n,100,'pending_first_access'));
  const a=n===65?complete(n):save(n,200),b=n===65?save(n,200):complete(n);
  await Promise.all([parallel('begin;'+a+`select pg_sleep(0.1);commit;`),parallel(b)]);
  check('completion/edit race '+n+' ends active with completed access and requested scope',row(n).status==='active'&&!row(n).mustChange&&row(n).firstAccess!==null&&row(n).groupId===id(200));
 }
 check('all admin edits preserve native Auth identities',auth===run('select jsonb_agg(to_jsonb(a) order by id) from auth.users a'));
}
