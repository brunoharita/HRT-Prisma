import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';

export async function verifyUsernameIdentity({run,check,fail,id,as,bin,args}) {
 const snapshot=run("select jsonb_agg(to_jsonb(u) order by id) from public.platform_users u"),auth=run("select jsonb_agg(to_jsonb(u) order by id) from auth.users u"),members=run("select jsonb_agg(to_jsonb(m) order by organization_id,user_id) from public.organization_memberships m");
 run('create unique index if not exists platform_users_email_unique_idx on public.platform_users(lower(email)); create or replace function public.position_assessment_email_configuration() returns text language sql as $$ select null::text $$; revoke all on function public.position_assessment_email_configuration() from public,anon,authenticated;');
 run(readFileSync('supabase/migrations/20261017190000_username_contact_identity.sql','utf8'));
 check('migration preserves every existing platform user field',snapshot===run("select jsonb_agg(to_jsonb(u) order by id) from public.platform_users u"));
 check('migration preserves Auth identities and credentials',auth===run("select jsonb_agg(to_jsonb(u) order by id) from auth.users u"));
 check('migration preserves memberships and scopes',members===run("select jsonb_agg(to_jsonb(m) order by organization_id,user_id) from public.organization_memberships m"));
 run(`update public.platform_users set email='shared@example.invalid' where auth_user_id in ('${id(4)}','${id(6)}')`);
 check('same contact accepted for independent users in distinct groups',run("select count(*)=2 and count(distinct auth_user_id)=2 and count(distinct group_id)=2 from public.platform_users where email='shared@example.invalid'")==='t');
 fail('username remains globally unique',`update public.platform_users set username=(select username from public.platform_users where auth_user_id='${id(4)}') where auth_user_id='${id(6)}'`,'23505');
 fail('Auth identity remains globally unique',`update public.platform_users set auth_user_id='${id(4)}' where auth_user_id='${id(6)}'`,'23505');
 check('contact lookup index is nonunique',run("select not indisunique from pg_index where indexrelid='public.platform_users_email_idx'::regclass")==='t');
 check('private email metadata has RLS and no client/table grants',run("select relrowsecurity and not has_table_privilege('anon',oid,'select,insert,update,delete') and not has_table_privilege('authenticated',oid,'select,insert,update,delete') and not has_table_privilege('service_role',oid,'select,insert,update,delete') from pg_class where oid='private.operator_access_email_requests'::regclass")==='t');
 for(const name of ['operator_access_email_configuration()','claim_operator_access_email(uuid,text,uuid)','finish_operator_access_email(uuid,text,text)']) {
  check('only service role executes '+name,run(`select not has_function_privilege('anon','public.${name}','execute') and not has_function_privilege('authenticated','public.${name}','execute') and has_function_privilege('service_role','public.${name}','execute')`)==='t');
 }
 const claim=n=>`select public.claim_operator_access_email('${id(n)}','recovery',null)`;
 fail('client cannot claim access email',as(4,claim(4)),'42501');
 const first=JSON.parse(run(`set role service_role;${claim(4)};reset role;`).split('\n').filter(Boolean).at(-1));
 check('claim binds contact and username from selected user',first.email==='shared@example.invalid'&&first.username===run(`select username from public.platform_users where auth_user_id='${id(4)}'`));
 check('immediate duplicate request throttled',run(`set role service_role;${claim(4)};reset role;`).trim()==='');
 const other=JSON.parse(run(`set role service_role;${claim(6)};reset role;`).split('\n').filter(Boolean).at(-1));
 check('shared contact does not share request or account identity',first.requestId!==other.requestId);
 run(`set role service_role;select public.finish_operator_access_email('${first.requestId}','accepted','synthetic-receipt');reset role;`);
 check('provider acceptance receipt persisted without token',run(`select state='accepted' and provider_id='synthetic-receipt' from private.operator_access_email_requests where id='${first.requestId}'`)==='t');
 fail('receipt cannot be overwritten',`set role service_role;select public.finish_operator_access_email('${first.requestId}','failed',null)`,'ACCESS_EMAIL_REQUEST_INVALID');
 run(`update private.operator_access_email_requests set requested_at=clock_timestamp()-interval '70 seconds' where auth_user_id='${id(4)}'`);
 run(`set role service_role;${claim(4)};reset role;`);
 run(`update private.operator_access_email_requests set requested_at=clock_timestamp()-interval '70 seconds' where auth_user_id='${id(4)}'`);
 run(`set role service_role;${claim(4)};reset role;`);
 run(`update private.operator_access_email_requests set requested_at=clock_timestamp()-interval '70 seconds' where auth_user_id='${id(4)}'`);
 check('fourth hourly request denied',run(`set role service_role;${claim(4)};reset role;`).trim()==='');
 run(`delete from private.operator_access_email_requests where auth_user_id='${id(4)}'`);
 const parallel=()=>new Promise(resolve=>{const child=spawn(bin+'psql.exe',args,{stdio:['pipe','pipe','pipe']});let out='',error='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>error+=d);child.on('exit',code=>resolve({code,out,error}));child.stdin.end(`set role service_role;${claim(4)};`);});
 const results=await Promise.all([parallel(),parallel()]);
 check('concurrent requests serialize with one claim',results.every(r=>r.code===0)&&results.filter(r=>r.out.includes('requestId')).length===1);
 run(`update public.platform_users set status='inactive' where auth_user_id='${id(6)}';delete from private.operator_access_email_requests where auth_user_id='${id(6)}'`);
 check('inactive account never produces a claim',run(`set role service_role;${claim(6)};reset role;`).trim()==='');
 run(`update public.platform_users set status='active' where auth_user_id='${id(6)}'`);
 check('schema has no password/token/content fields',run("select count(*)=0 from information_schema.columns where table_schema='private' and table_name='operator_access_email_requests' and column_name~'(password|token|recipient|content|email$)' ")==='t');
}
