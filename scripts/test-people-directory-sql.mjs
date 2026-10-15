import {readFile,writeFile,mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
const exe="C:/Program Files/PostgreSQL/17/bin/",db="people_directory_qa_v272";
const args=["-X","-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-v","ON_ERROR_STOP=1"];
function run(database,sql){const r=spawnSync(exe+"psql.exe",[...args,"-d",database,"-At","-c",sql],{encoding:"utf8",windowsHide:true,maxBuffer:10*1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
assert.equal(run("postgres",`select count(*) from pg_database where datname='${db}'`),"0");
run("postgres",`create database ${db} with template template0`);
try {
  await mkdir("tmp",{recursive:true});await mkdir("docs/qa/evidence/people-taxonomy-v272",{recursive:true});
  const dump=spawnSync(exe+"pg_dump.exe",["-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-d","import_evidence_v202","--schema-only","--no-owner"],{encoding:"utf8",windowsHide:true,maxBuffer:20*1024*1024});assert.equal(dump.status,0,dump.stderr);
  await writeFile("tmp/people-directory-schema.sql",dump.stdout);
  let result=spawnSync(exe+"psql.exe",[...args,"-d",db,"-q","-f","tmp/people-directory-schema.sql"],{encoding:"utf8",windowsHide:true,maxBuffer:10*1024*1024});assert.equal(result.status,0,result.stderr);
  const m81=await readFile("supabase/migrations/20260920110000_m81_competency_structure.sql","utf8");
  let sql="begin;\n"+m81.slice(0,m81.indexOf("create function private.m81_validate"));
  sql+=`create table public.profile_competency_normalization_runs(id uuid,lease uuid,status text,request_count integer,started_at timestamptz);
    create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;\n`;
  const migration=await readFile("supabase/migrations/20261015160000_people_directory_taxonomy.sql","utf8");
  sql+=migration.replace(/^begin;|^commit;/mg,"");
  const fixture=await readFile("supabase/qa/m83_semantic_trajectory_verification.sql","utf8");
  sql+=fixture.slice(0,fixture.indexOf("insert into public.job_roles"));
  sql+=await readFile("supabase/qa/people_directory_verification.sql","utf8");
  sql+="\nrollback;";await writeFile("tmp/people-directory-verification.sql",sql);
  result=spawnSync(exe+"psql.exe",[...args,"-d",db,"-f","tmp/people-directory-verification.sql"],{encoding:"utf8",windowsHide:true,maxBuffer:10*1024*1024});
  const output=[result.stdout,result.stderr].join("\n");await writeFile("docs/qa/evidence/people-taxonomy-v272/sql.txt",output);console.log(output.slice(-5000));assert.equal(result.status,0,"isolated SQL verification");
} finally {run("postgres",`drop database ${db}`);}
