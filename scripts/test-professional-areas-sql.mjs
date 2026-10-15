import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const exe='C:/Program Files/PostgreSQL/17/bin/',db='professional_area_qa_v274',args=['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-v','ON_ERROR_STOP=1'];
function run(database,sql){const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-At','-c',sql],{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
assert.equal(run('import_evidence_v202',"select current_database()||'|'||inet_server_port()||'|'||(select count(*) from people)"),'import_evidence_v202|55479|0');
assert.equal(run('postgres',`select count(*) from pg_database where datname='${db}'`),'0');
run('postgres',`create database ${db} with template template0`);
try{
await mkdir('tmp',{recursive:true});await mkdir('docs/qa/evidence/professional-areas-v274',{recursive:true});
const dump=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--schema-only','--no-owner'],{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});assert.equal(dump.status,0,dump.stderr);await writeFile('tmp/area-schema.sql',dump.stdout);
let r=spawnSync(exe+'psql.exe',[...args,'-d',db,'-q','-f','tmp/area-schema.sql'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
// This disposable baseline predates M7.7 and manual-profile delivery; restore
// only the already deployed dependencies used by the new migration.
let sql='';
for(const name of ['20260919040000_m77_company_knowledge_global_governance.sql','20260919041500_m77_global_contribution_review_actions.sql','20261004040000_review_period_format_preflight.sql','20261015070000_manual_profile_and_employee.sql']) sql+=(await readFile('supabase/migrations/'+name,'utf8')).replace(/^begin;|^commit;/mg,'')+'\n';
const m81=await readFile('supabase/migrations/20260920110000_m81_competency_structure.sql','utf8');sql+=m81.slice(0,m81.indexOf('create function private.m81_validate'));
sql+=`create table public.profile_competency_normalization_runs(id uuid,lease uuid,status text,request_count integer,started_at timestamptz);create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;\n`;
sql+=(await readFile('supabase/migrations/20261015160000_people_directory_taxonomy.sql','utf8')).replace(/^begin;|^commit;/mg,'');
sql+=`insert into auth.users(id,email) values(md5('area-seed-admin')::uuid,'seed@example.invalid');insert into public.platform_users(id,auth_user_id,full_name,username,email,access_profile,status) values(md5('area-seed-platform')::uuid,md5('area-seed-admin')::uuid,'Seed admin','area-seed-admin','seed@example.invalid','super_admin','active');`;
const m73=await readFile('supabase/migrations/20260918180000_m73_declared_competency_normalization.sql','utf8');sql+=m73.slice(m73.indexOf('create function private.resolve_normalized_competency'),m73.indexOf('revoke all on function private.resolve_normalized_competency'));
await writeFile('tmp/area-deps.sql',sql);r=spawnSync(exe+'psql.exe',[...args,'-d',db,'-q','-f','tmp/area-deps.sql'],{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});assert.equal(r.status,0,r.stderr.slice(-3500));
run(db,await readFile('supabase/migrations/20261015203000_professional_area_type.sql','utf8'));
sql=await readFile('supabase/migrations/20261015203100_professional_areas.sql','utf8');
const fixture=await readFile('supabase/qa/m83_semantic_trajectory_verification.sql','utf8');
sql+='\nbegin;\n'+fixture.slice(0,fixture.indexOf('insert into public.job_roles'));
sql+=await readFile('supabase/qa/professional_areas_verification.sql','utf8');sql+='\nrollback;';
await writeFile('tmp/area-verification.sql',sql);r=spawnSync(exe+'psql.exe',[...args,'-d',db,'-f','tmp/area-verification.sql'],{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});const output=[r.stdout,r.stderr].join('\n').replaceAll('\r','').split('\n').map(x=>x.trimEnd()).join('\n');await writeFile('docs/qa/evidence/professional-areas-v274/sql.txt',output);console.log(output.slice(-7000));assert.equal(r.status,0,'area SQL');
}finally{run('postgres',`drop database ${db}`);}
