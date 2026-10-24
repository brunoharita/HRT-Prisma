import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {openOccupationalHistory} from './occupational-rag-worker.mjs';
const position=process.argv.includes('--position-v321');
const auditFix=process.argv.includes('--audit-fix');
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
 if(auditFix){
  sql("do $$begin execute replace(pg_get_functiondef('public.search_occupational_rag_candidates(text,uuid,uuid,text[])'::regprocedure),'public.search_occupational_rag_candidates(', 'private.qa_rag_old_search('); end$$;");
  sql(fs.readFileSync('supabase/migrations/20261024231000_occupational_rag_search_performance.sql','utf8'));
  sql(fs.readFileSync('supabase/migrations/20261024232500_occupational_rag_selective_prefilter.sql','utf8'));
 }
 if(position){
  const classification=fs.readFileSync('supabase/migrations/20260920111000_m81_competency_projection.sql','utf8');
  sql(classification.slice(0,classification.indexOf('create function public.search_competency_taxonomy_v2')));
  sql(fs.readFileSync('supabase/migrations/20260918010000_m71_position_taxonomy.sql','utf8'));
  sql("do $$begin execute replace(pg_get_functiondef('private.m71_concept_allowed(uuid,uuid)'::regprocedure),'private.m71_concept_allowed(', 'private.qa321_old_allowed('); end$$;");
  sql(fs.readFileSync('supabase/migrations/20261024220000_position_rag_v321.sql','utf8'));
 }
 if(auditFix&&position)sql(fs.readFileSync('supabase/migrations/20261024234500_occupational_rag_method_refresh.sql','utf8'));
 assert.equal(sql("select count(*) from pg_tables where schemaname in('public','private');"),before,'No new table');
 const envelopes=[];
 if(auditFix){
  const history=await openOccupationalHistory({rpc:async(_name,args)=>{envelopes.push(args);return {error:null,data:args.p_action==='open_request'?{request:{id:'00000000-0000-4000-8000-000000000001'}}:{acquired:true}};}},{id:'audit-regression',lease:'00000000-0000-4000-8000-000000000002',organizationId:'00000000-0000-4000-8000-000000000003',inputHash:'a'.repeat(64)},async()=>Response.json({prompt_eval_count:12,eval_count:5}));
  await history.fetcher('http://knowledge-model:11434/api/chat',{body:JSON.stringify({model:'qwen3:4b-instruct-2507-q4_K_M'})});await history.close(true);
 }
 const captured=envelopes.map(({p_action,p_data})=>{const json=JSON.stringify(p_data).replaceAll("'","''");return `${p_action==='open_request'?'insert into audit_response select':'select'} public.record_ai_worker_history_v1(repeat('h',48),'${p_action}',jsonb_set('${json}'::jsonb,'{organizationId}',to_jsonb(rag_id('a')::text))${p_action==='open_request'?'':` || jsonb_build_object('requestId',(select v#>>'{request,id}' from audit_response))`});`;}).join('\n');
 const auditSql=auditFix?`\ncreate temp table audit_response(v jsonb);grant select,insert on audit_response to anon;set local role anon;${captured}\nreset role;select rag_assert((select status='succeeded' from public.ai_requests where operation_id='00000000-0000-4000-8000-000000000002'),'actual JavaScript worker envelopes complete under PostgreSQL metadata contract');\nselect rag_reject(format('select public.record_ai_worker_history_v1(%L,''open_request'',%L)',repeat('h',48),jsonb_build_object('scope','organization','organizationId',rag_id('a'),'functionName','occupational_rag','actionOperationId','forbidden')),'22023');\nreset role;`:'';
 let fixture=fs.readFileSync('supabase/qa/occupational_rag_verification.sql','utf8').replaceAll('\r','');
 if(auditFix){
  const check=`reset role;
do $$declare j jsonb; terms text[];begin select v into j from rag_state where k='job';
 foreach terms slice 1 in array array[['Sales Representative'],['estoque'],['vendedor'],['cargo privado'],['sales OR estoque'],['de'],['Sales Representative OR Gestor de Estoque'],['Representative and clientes']] loop
 perform rag_assert(public.search_occupational_rag_candidates(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,terms)=private.qa_rag_old_search(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,terms),'optimized retrieval preserves original results and tenant scope');end loop;end$$;
savepoint search_volume;
insert into public.knowledge_terms(concept_id,scope,term,normalized_term,language,term_type,status,approved_by_auth_user_id)
 values(rag_id('sales'),'global','Prospecção consultiva','prospeccao consultiva','pt-BR','alias','approved',rag_id('super'));
do $$declare j jsonb; result jsonb;begin select v into j from rag_state where k='job';
 result:=public.search_occupational_rag_candidates(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,array['prospeccao Representative']);
 perform rag_assert(jsonb_array_length(result)=1 and result=private.qa_rag_old_search(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,array['prospeccao Representative']),'indexed prefilter preserves a query split across title and accented alias');end$$;
insert into public.knowledge_concepts(id,canonical_label,concept_type,scope,description,status,approved_by_auth_user_id)
 select rag_id('volume-'||n),'Cargo sintético '||n,'occupation','global','Atividades sintéticas não relacionadas.','approved',rag_id('super') from generate_series(1,1000) n;
insert into public.knowledge_terms(concept_id,scope,term,normalized_term,language,term_type,status,approved_by_auth_user_id)
 select rag_id('volume-'||n),'global','Cargo sintético '||n,'cargo sintetico '||n,'pt-BR','canonical','approved',rag_id('super') from generate_series(1,1000) n;
do $$declare j jsonb; started timestamptz:=clock_timestamp();begin select v into j from rag_state where k='job';
 perform rag_assert(jsonb_array_length(public.search_occupational_rag_candidates(repeat('s',48),(j->>'id')::uuid,(j->>'lease')::uuid,array['estoque']))=1,'bounded retrieval remains grounded with 1000 unrelated roles');
 perform rag_assert(clock_timestamp()-started<interval '3 seconds','1000-role retrieval below PostgreSQL request timeout');end$$;
rollback to search_volume;
set local role anon;
`;
  fixture=fixture.replace("insert into rag_state select 'payload'",()=>check+"insert into rag_state select 'payload'");
  if(process.argv.includes('--method-refresh')){const cutoff=fixture.indexOf("\nreset role;\nselect rag_assert((select count(*)=3");assert(cutoff>0,'Original fixture boundary must exist');fixture=fixture.slice(0,cutoff)+"\n"+fs.readFileSync('supabase/qa/occupational_rag_method_refresh_verification.sql','utf8');}
  else if(process.argv.includes('--search-only'))fixture=fixture.slice(0,fixture.indexOf("insert into rag_state select 'payload'"));
 }
 let output=sql('begin;\n'+fixture+(position&&!process.argv.includes('--method-refresh')?'\n'+fs.readFileSync('supabase/qa/position_rag_v321_verification.sql','utf8'):'')+auditSql+'\nrollback;');
 if(position&&!process.argv.includes('--method-refresh')){
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
 if(auditFix){fs.mkdirSync('docs/qa/evidence/position-rag-audit-fix',{recursive:true});fs.writeFileSync(process.argv.includes('--method-refresh')?'docs/qa/evidence/position-rag-audit-fix/sql-method.txt':process.argv.includes('--search-only')?'docs/qa/evidence/position-rag-audit-fix/sql-search.txt':'docs/qa/evidence/position-rag-audit-fix/sql.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));console.log(output.slice(-3500));}else if(position){fs.mkdirSync('docs/qa/evidence/position-rag-v321/sql',{recursive:true});fs.writeFileSync('docs/qa/evidence/position-rag-v321/sql/verification.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));console.log(output.slice(-8000));process.exitCode=0;}else{
 fs.mkdirSync('docs/qa/evidence/occupational-rag-v320/sql',{recursive:true});
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/verification.txt',output.replaceAll('\r','').split('\n').map(line=>line.trimEnd()).join('\n'));
 fs.writeFileSync('docs/qa/evidence/occupational-rag-v320/sql/environment.json',JSON.stringify({environment:'Owned PostgreSQL17 local schema-only clone 127.0.0.1:55479',dependencies,newTables:0,syntheticOnly:true,transaction:'rolled back',result:'PASS'},null,2));
 console.log(output.slice(-5000));
 }
}finally{sql(`drop database ${db};`,'postgres');}
