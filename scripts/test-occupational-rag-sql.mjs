import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const exe='C:/Program Files/PostgreSQL/17/bin/',db='occupational_rag_qa_20261024',args=['-X','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa'];
function sql(text,database=db){const r=spawnSync(exe+'psql.exe',[...args,'-d',database],{input:text,encoding:'utf8',maxBuffer:20e6,windowsHide:true});if(r.status!==0)throw Error(r.stderr+'\n'+r.stdout.slice(-1800));return r.stdout+'\n'+r.stderr;}
// A fixed, disposable local QA database only. Never accepts a remote destination.
assert.equal(sql("select current_database()||'|'||inet_server_port();",'postgres').includes('postgres|55479'),true);
sql(`drop database if exists ${db};create database ${db} template template0;`,'postgres');
try{
 const dump=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--schema-only','--no-owner'],{encoding:'utf8',maxBuffer:20e6,windowsHide:true});assert.equal(dump.status,0,dump.stderr);sql(dump.stdout);
 const dependencies=['20260919040000_m77_company_knowledge_global_governance.sql','20260919041500_m77_global_contribution_review_actions.sql','20260919164100_m77_legacy_company_proposal_transition.sql','20260920110000_m81_competency_structure.sql','20260920112000_m81_competency_curation.sql','20261016153000_knowledge_global_decisions_v2.sql','20261009140000_generic_ai_request_history.sql','20261009160000_ai_history_worker_boundary.sql'];
 for(const name of dependencies)sql(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 const v3=fs.readFileSync('supabase/migrations/20261017040000_multiempresa_v3.sql','utf8');
 sql(v3.split('\n').slice(1,3).join('\n')+'\n'+v3.slice(v3.indexOf('create or replace function private.canonical_access_role'),v3.indexOf('create or replace function private.validate_membership_scope'))+'\n'+v3.slice(v3.indexOf('create or replace function private.prisma_actor_has_org_role'),v3.indexOf('create or replace function public.can_operate_prisma_organization')));
 const before=sql("select count(*) from pg_tables where schemaname in('public','private');");
 sql(fs.readFileSync('supabase/migrations/20261024090000_occupational_rag_v320.sql','utf8'));
 assert.equal(sql("select count(*) from pg_tables where schemaname in('public','private');"),before,'No new table');
 const output=sql('begin;\n'+fs.readFileSync('supabase/qa/occupational_rag_verification.sql','utf8')+'\nrollback;');
 fs.mkdirSync('docs/qa/evidence/occupational-rag-v320/sql',{recursive:true});
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/verification.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/environment.json',JSON.stringify({environment:'Owned PostgreSQL17 local schema-only clone 127.0.0.1:55479',dependencies,newTables:0,syntheticOnly:true,transaction:'rolled back',result:'PASS'},null,2));
 console.log(output.slice(-5000));
}finally{sql(`drop database ${db};`,'postgres');}
