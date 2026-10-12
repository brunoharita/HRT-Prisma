import {spawnSync,spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const exe='C:/Program Files/PostgreSQL/17/bin/',args=['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-v','ON_ERROR_STOP=1'],db='prisma_qb_concurrency_v250',dir='docs/qa/evidence/question-bank-v250/regression-sql',checks=[];
function psql(database,query){const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-At','-c',query],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-1600));return r.stdout.trim();}
async function file(database,path,sql){await writeFile(path,sql);const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-f',path],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});return {status:r.status,output:(r.stdout+'\n'+r.stderr).split(/\r?\n/).map(line=>line.trimEnd()).join('\n')};}
function concurrent(query){return new Promise(resolve=>{const p=spawn(exe+'psql.exe',[...args,'-d',db,'-At','-c',query],{windowsHide:true});let output='',error='';p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>error+=x);p.on('exit',status=>resolve({status,output,error}));});}
if(psql('import_evidence_v202','select count(*) from public.people')!=='0')throw Error('LOCAL empty baseline required');
if(psql('postgres',`select count(*) from pg_database where datname='${db}'`)!=='0')throw Error('Owned LOCAL clone exists; never overwrite');
const prepared=spawnSync(process.execPath,['scripts/test-question-bank-sql.mjs','--process-regression','--prepare-only'],{encoding:'utf8',windowsHide:true});if(prepared.status!==0)throw Error('SYNTHETIC_FIXTURE_PREPARATION_FAILED');
await mkdir(dir,{recursive:true});psql('postgres',`create database ${db}`);
try{
 const dump=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--schema-only','--no-owner'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(dump.status!==0)throw Error('LOCAL_SCHEMA_DUMP_FAILED');
 let r=await file(db,'tmp/question-bank-clone-schema.sql',dump.stdout);if(r.status!==0)throw Error(r.output.slice(-1600));
 const seed=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--data-only','--no-owner','--disable-triggers','-t','public.verification_definitions','-t','public.assessment_blueprints','-t','public.assessment_item_families','-t','public.assessment_items'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(seed.status!==0)throw Error('LOCAL_TECHNICAL_SEED_DUMP_FAILED');
 r=await file(db,'tmp/question-bank-clone-seed.sql',seed.stdout);if(r.status!==0)throw Error(r.output.slice(-1600));
 const fixture=(await readFile('tmp/question-bank-local.sql','utf8')).replaceAll("'import_evidence_v202'",`'${db}'`);
 r=await file(db,'tmp/question-bank-clone-regression.sql',fixture);await writeFile(`${dir}/sql.txt`,r.output);checks.push({name:'question-bank plus legacy/shared process, canonical bank, portal/correction and preservation SQL',pass:r.status===0,sqlChecks:(r.output.match(/NOTICE:  PASS:/g)??[]).length});if(r.status!==0)throw Error(r.output.slice(-2500));
 // Commit only synthetic QA fixtures inside this owned clone, then use independent connections.
 const split=fixture.indexOf('create function public.qb_id');

 // The prefix includes process migrations but no question-bank fixtures yet. Keep the full fixture up to the process regression marker.


 const base=fixture.slice(0,split);
 const qb=(await readFile('supabase/qa/question_bank_verification.sql','utf8'));
 r=await file(db,'tmp/question-bank-clone-fixture.sql',base+qb+'\nreset role;commit;');if(r.status!==0)throw Error(r.output.slice(-1800));
 const org=psql(db,"select qb_id('a')"),actor=psql(db,"select qb_id('owner')"),proposal=psql(db,"select p.id from public.assessment_item_generation_proposals p join public.assessment_item_generation_requests r on r.id=p.generation_request_id where p.organization_id=qb_id('a') and r.target_scope='organization' and r.provider='fake-deterministic' order by p.id limit 1");
 // New purely synthetic version for one fresh human decision, with no production data.
 const fresh=psql(db,`insert into public.assessment_item_generation_proposals(organization_id,generation_request_id,proposal_sequence,status,proposed_item,content_fingerprint,maximum_lexical_similarity,duplicate_candidates,validation_result,provider_provenance) select organization_id,generation_request_id,(select max(proposal_sequence)+1 from public.assessment_item_generation_proposals where generation_request_id=p.generation_request_id),'proposed',jsonb_set(proposed_item,'{key}','"QB-CONCURRENCY"'),content_fingerprint||'-concurrency',0,'[]','{"valid":true,"reasonCodes":[]}',provider_provenance from public.assessment_item_generation_proposals p where id='${proposal}' returning id` ).split(/\r?\n/)[0];
 const auth=`set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);`;
 const results=await Promise.all([1,2].map(()=>concurrent(`begin;${auth}select public.approve_and_publish_question_bank_proposal('${org}','${fresh}','Revisao explicita da excecao na fixture concorrente');select pg_sleep(0.2);commit;`)));
 checks.push({name:'two independent connections approve/publish exactly one review and one bank version',pass:results.every(r=>r.status===0)&&psql(db,`select count(*) from public.assessment_item_generation_reviews where proposal_id='${fresh}'`)==='1'&&psql(db,`select count(*) from public.assessment_items where provenance->>'proposalId'='${fresh}'`)==='1'});
 if(checks.some(c=>!c.pass))throw Error(JSON.stringify(results));
}finally{
 psql('postgres',`drop database ${db}`);
 await writeFile(`${dir}/checks.json`,JSON.stringify({environment:'Owned LOCAL PostgreSQL17 schema-only clone; technical seed only; removed after run',baselineLimitation:'Original disposable baseline has a missing physical profile_synthesis_jobs relation file, observed during deletion regression; it was preserved and not repaired.',checks},null,2));
}
console.log(JSON.stringify({checks}));
