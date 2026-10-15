import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const db="manual_profile_qa_v270", exe="C:/Program Files/PostgreSQL/17/bin/", args=["-X","-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-v","ON_ERROR_STOP=1"];
function query(database,sql){const r=spawnSync(exe+"psql.exe",[...args,"-d",database,"-At","-c",sql],{encoding:"utf8",windowsHide:true});assert.equal(r.status,0,r.stderr.slice(-1200));return r.stdout.trim();}
assert.equal(query("import_evidence_v202","select current_database()||'|'||inet_server_port()||'|'||(select count(*) from public.people)"),"import_evidence_v202|55479|0");
assert.equal(query("postgres",`select count(*) from pg_database where datname='${db}'`),"0","Never overwrite a local database");
// Fixed disposable localhost only. Entire migration, fixtures and assertions roll back.
let sql = `begin; do $$ begin if current_database()<>'${db}' or inet_server_port()<>55479 or exists(select 1 from public.people) then raise exception 'Empty disposable LOCAL database required'; end if; end $$;\n`;
const fixture = await readFile("supabase/qa/m83_semantic_trajectory_verification.sql", "utf8");
sql += fixture.slice(0, fixture.indexOf("insert into public.people"));
sql += "insert into public.people(id,organization_id,full_name) values(m83_id('legacy-person'),m83_id('a'),'Legado administrativo');\n";
sql += (await readFile("supabase/migrations/20261004040000_review_period_format_preflight.sql", "utf8")).replace(/^begin;\s*$/mg, "").replace(/^commit;\s*$/mg, "");
// This old disposable schema predates Tokens; mirror its already deployed explicit-only synthesis gate.
const consumers = await readFile("supabase/migrations/20261010181000_prisma_tokens_consumers.sql", "utf8");
sql += consumers.slice(consumers.indexOf("alter function private.enqueue_profile_synthesis"), consumers.indexOf("alter function public.request_profile_synthesis"));
sql += (await readFile("supabase/migrations/20261015070000_manual_profile_and_employee.sql", "utf8")).replace(/^begin;\s*$/mg, "").replace(/^commit;\s*$/mg, "");
sql += await readFile("supabase/qa/manual_profile_v270_verification.sql", "utf8");
sql += "select m83_assert((select count(*)=0 from public.profile_synthesis_jobs),'manual draft and publication never enqueue synthesis AI');\n";
sql += "\nrollback;";
await mkdir("tmp", { recursive: true });
await mkdir("docs/qa/evidence/manual-profile-v270/sql", { recursive: true });
await writeFile("tmp/manual-profile-local.sql", sql);
query("postgres",`create database ${db} with template template0`);
try {
const dump=spawnSync(exe+"pg_dump.exe",["-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-d","import_evidence_v202","--schema-only","--no-owner"],{encoding:"utf8",windowsHide:true,maxBuffer:20*1024*1024});assert.equal(dump.status,0,"Logical disposable schema baseline");
await writeFile("tmp/manual-profile-schema.sql",dump.stdout);
const setup=spawnSync(exe+"psql.exe",[...args,"-d",db,"-f","tmp/manual-profile-schema.sql"],{encoding:"utf8",windowsHide:true});assert.equal(setup.status,0,setup.stderr.slice(-1200));
const result = spawnSync(exe+"psql.exe", [...args,"-d",db,"-f","tmp/manual-profile-local.sql"], { encoding: "utf8", windowsHide: true });
const output = (result.stdout + "\n" + result.stderr).replaceAll("\r", "").split("\n").map(line => line.trimEnd()).join("\n");
await writeFile("docs/qa/evidence/manual-profile-v270/sql/verification.txt", output);
console.log(output.slice(-5500));
process.exitCode = result.status ?? 1;
} finally {query("postgres",`drop database ${db}`);}
