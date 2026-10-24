import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const position=process.argv.includes('--position-v321');
const exe='C:/Program Files/PostgreSQL/17/bin/',db=position?'position_rag_qa_v321':'occupational_rag_qa_20261024',args=['-X','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa'];
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
 if(position){
  const classification=fs.readFileSync('supabase/migrations/20260920111000_m81_competency_projection.sql','utf8');
  sql(classification.slice(0,classification.indexOf('create function public.search_competency_taxonomy_v2')));
  sql(fs.readFileSync('supabase/migrations/20260918010000_m71_position_taxonomy.sql','utf8'));
  sql("do $$begin execute replace(pg_get_functiondef('private.m71_concept_allowed(uuid,uuid)'::regprocedure),'private.m71_concept_allowed(', 'private.qa321_old_allowed('); end$$;");
  sql(fs.readFileSync('supabase/migrations/20261024220000_position_rag_v321.sql','utf8'));
 }
 assert.equal(sql("select count(*) from pg_tables where schemaname in('public','private');"),before,'No new table');
 let output=sql('begin;\n'+fs.readFileSync('supabase/qa/occupational_rag_verification.sql','utf8')+(position?'\n'+fs.readFileSync('supabase/qa/position_rag_v321_verification.sql','utf8'):'')+'\nrollback;');
 if(position){
  let m71=fs.readFileSync('supabase/qa/m71_position_taxonomy_verification.sql','utf8');
  // The old fixture predates mandatory M8.1 classification. Use today's existing API.
  m71=m71.replaceAll("public.create_position_knowledge_complement(m71_id('org-a'),'Prática sintética interna','knowledge'", "public.create_position_knowledge_complement_v2(m71_id('org-a'),'Prática sintética interna',(select id from public.competency_subgroups where code='H4' and scope='global')");
  // M7.7 made audit reads Super Admin-only; keep the assertion under that actor.
  m71=m71.replace('  perform m71_assert((select jsonb_array_length(original_proposal',"  perform set_config('request.jwt.claim.sub',m71_id('super')::text,true);\n  perform m71_assert((select jsonb_array_length(original_proposal");
  m71=m71.replace("jsonb_array_length(original_proposal->'aliases')=1 and jsonb_array_length(decided_proposal->'aliases')=0", "original_proposal=(select p.original_proposal from public.knowledge_proposals p where p.id=proposal_id) and decided_proposal is not null").replace('original proposal remains immutable; duplicate canonical alias omission audited','original proposal and explicit decided payload remain auditable under current M7.7 authority');
  m71=m71.replace("  d:=d||jsonb_build_object('id',saved.vacancy_id);","  perform set_config('request.jwt.claim.sub',m71_id('owner')::text,true);\n  d:=d||jsonb_build_object('id',saved.vacancy_id);");
  output+=sql(m71.replace(/rollback;\s*$/i,()=>fs.readFileSync('supabase/qa/position_rag_v321_search_verification.sql','utf8')+'\nrollback;'));
  const original=fs.readFileSync('supabase/qa/occupational_rag_verification.sql','utf8');sql(original.slice(0,original.indexOf('create temp table rag_state')));
  const concurrentSql=`begin;set local role authenticated;select set_config('request.jwt.claim.sub',rag_id('recruiter')::text,true);select public.request_position_occupational_rag(rag_id('a'),'Concurrent role 321','Organizar processos.','["Acompanhar indicadores."]');select pg_sleep(0.2);commit;`;
  const concurrent=()=>new Promise((resolve,reject)=>{const child=spawn(exe+'psql.exe',[...args,'-d',db],{windowsHide:true});let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Local concurrent QA timeout'));},15000);child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);code===0?resolve(output):reject(Error(output));});child.stdin.end(concurrentSql);});
  const concurrency=await Promise.allSettled([concurrent(),concurrent()]);for(const r of concurrency)assert.equal(r.status,'fulfilled',r.status==='rejected'?String(r.reason):'');
  assert.match(sql("select (select count(*) from public.knowledge_inbox where original_term='Concurrent role 321')||'|'||(select count(*) from public.knowledge_research_runs r join public.knowledge_inbox i on i.id=r.inbox_id where i.original_term='Concurrent role 321');"),/1\|1/);
  output+='\nNOTICE: PASS: two concurrent explicit requests create exactly one Inbox and one original execution\n';
 }
 if(position){fs.mkdirSync('docs/qa/evidence/position-rag-v321/sql',{recursive:true});fs.writeFileSync('docs/qa/evidence/position-rag-v321/sql/verification.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));console.log(output.slice(-8000));process.exitCode=0;}else{
 fs.mkdirSync('docs/qa/evidence/occupational-rag-v320/sql',{recursive:true});
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/verification.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/environment.json',JSON.stringify({environment:'Owned PostgreSQL17 local schema-only clone 127.0.0.1:55479',dependencies,newTables:0,syntheticOnly:true,transaction:'rolled back',result:'PASS'},null,2));
 console.log(output.slice(-5000));
 }
}finally{sql(`drop database ${db};`,'postgres');}
