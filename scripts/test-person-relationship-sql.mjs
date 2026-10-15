import {readFile,writeFile,mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
const exe="C:/Program Files/PostgreSQL/17/bin/psql.exe",db="person_tags_qa_v271";
const args=["-X","-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-v","ON_ERROR_STOP=1"];
function run(database,sql){const r=spawnSync(exe,[...args,"-d",database,"-At","-c",sql],{encoding:"utf8",windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;}
assert.equal(run("postgres",`select count(*) from pg_database where datname='${db}'`).trim(),"0");
run("postgres",`create database ${db}`);
try{
let sql=`begin;
create schema private;
create table public.people(id uuid,organization_id uuid,operational_status text);
create table public.position_evaluation_processes(id uuid,organization_id uuid,status text);
create table public.position_evaluation_entries(person_id uuid,organization_id uuid,process_id uuid,stage text,details jsonb);
create function private.authorize_position_follow_up(uuid) returns uuid language plpgsql as $$begin
 if current_setting('test.actor',true) is distinct from 'reviewer' or $1::text<>'00000000-0000-0000-0000-000000000001' then raise exception 'denied' using errcode='42501';end if;return $1;end$$;
`;
sql+=(await readFile("supabase/migrations/20261015130000_person_relationship_tags.sql","utf8")).replace(/^begin;|^commit;/mg,"");
sql+=`
create function pg_temp.check_tag(expected boolean) returns void language plpgsql as $$begin
 if (public.get_person_relationship_tags('00000000-0000-0000-0000-000000000001',array['00000000-0000-0000-0000-000000000003'::uuid])->0->>'isCandidate')::boolean is distinct from expected then raise exception 'tag mismatch';end if;end$$;
insert into public.people values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','active');
insert into public.position_evaluation_processes values('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','active');
select set_config('test.actor','reviewer',true);
select pg_temp.check_tag(false);
insert into public.position_evaluation_entries values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','awaiting_evaluation','{}');
select pg_temp.check_tag(true);
update public.position_evaluation_entries set details='{"decision":{"outcome":"do_not_proceed"}}',stage='decision_recorded';select pg_temp.check_tag(false);
update public.position_evaluation_entries set details='{"decision":{"outcome":"proceed"}}';select pg_temp.check_tag(true);
update public.position_evaluation_entries set stage='closed';select pg_temp.check_tag(false);
update public.position_evaluation_entries set stage='awaiting_decision';update public.position_evaluation_processes set status='closed';select pg_temp.check_tag(false);
update public.position_evaluation_processes set status='active';select pg_temp.check_tag(true);
insert into public.position_evaluation_processes values('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','active');
insert into public.position_evaluation_entries values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','awaiting_interview','{}');
update public.position_evaluation_entries set details='{"decision":{"outcome":"do_not_proceed"}}' where process_id='00000000-0000-0000-0000-000000000004';select pg_temp.check_tag(true);
update public.position_evaluation_processes set status='closed' where id='00000000-0000-0000-0000-000000000004';select pg_temp.check_tag(true);
update public.position_evaluation_entries set stage='closed' where process_id='00000000-0000-0000-0000-000000000005';select pg_temp.check_tag(false);
update public.position_evaluation_entries set organization_id='00000000-0000-0000-0000-000000000002';select pg_temp.check_tag(false);
do $$begin
 if has_function_privilege('anon','public.get_person_relationship_tags(uuid,uuid[])','execute') then raise exception 'anon';end if;
 begin perform public.get_person_relationship_tags('00000000-0000-0000-0000-000000000002','{}');raise exception 'tenant bypass';exception when insufficient_privilege then null;end;
 perform set_config('test.actor','member',true);
 begin perform public.get_person_relationship_tags('00000000-0000-0000-0000-000000000001','{}');raise exception 'role bypass';exception when insufficient_privilege then null;end;
 perform set_config('test.actor','',true);
 begin perform public.get_person_relationship_tags('00000000-0000-0000-0000-000000000001','{}');raise exception 'session bypass';exception when insufficient_privilege then null;end;
end$$;
rollback;select 'PASS: 15 SQL checks, isolated model; existing authorization helper replaced only by test stub';
`;
const output=run(db,sql);await mkdir("docs/qa/evidence/person-status-v271",{recursive:true});await writeFile("docs/qa/evidence/person-status-v271/sql.txt",output);console.log(output.slice(-220));
}finally{run("postgres",`drop database ${db}`);}
