import {spawnSync,spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const exe='C:/Program Files/PostgreSQL/17/bin/',args=['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-v','ON_ERROR_STOP=1'],db='prisma_company_questions_v251',dir='docs/qa/evidence/company-question-reuse-v251/sql',checks=[];
const call=(database,query)=>{const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-At','-c',query],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-2000));return r.stdout.trim();};
const file=async(database,path,sql)=>{await writeFile(path,sql);const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-f',path],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});return{status:r.status,output:(r.stdout+'\n'+r.stderr).split(/\r?\n/).map(l=>l.trimEnd()).join('\n')};};
const concurrent=query=>new Promise(resolve=>{const p=spawn(exe+'psql.exe',[...args,'-d',db,'-At','-c',query],{windowsHide:true});let output='',error='';p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>error+=x);p.on('exit',status=>resolve({status,output,error}));});
if(call('import_evidence_v202','select count(*) from public.people')!=='0')throw Error('Empty LOCAL baseline required');
if(call('postgres',`select count(*) from pg_database where datname='${db}'`)!=='0')throw Error('Owned clone already exists; never overwrite');
const prepare=spawnSync(process.execPath,['scripts/test-question-bank-sql.mjs','--process-regression','--prepare-only'],{encoding:'utf8',windowsHide:true});if(prepare.status!==0)throw Error('Existing synthetic QA preparation failed');
await mkdir(dir,{recursive:true});call('postgres',`create database ${db}`);
try{
 const dump=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--schema-only','--no-owner'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(dump.status!==0)throw Error('LOCAL schema dump failed');
 let r=await file(db,'tmp/company-questions-schema.sql',dump.stdout);if(r.status!==0)throw Error(r.output.slice(-2400));
 const seed=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--data-only','--no-owner','--disable-triggers','-t','public.verification_definitions','-t','public.assessment_blueprints','-t','public.assessment_item_families','-t','public.assessment_items'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(seed.status!==0)throw Error('LOCAL technical seed dump failed');
 r=await file(db,'tmp/company-questions-seed.sql',seed.stdout);if(r.status!==0)throw Error(r.output.slice(-2400));
 const original=(await readFile('tmp/question-bank-local.sql','utf8')).replaceAll("'import_evidence_v202'",`'${db}'`),marker='select m83_assert((select data from v232_legacy)',at=original.indexOf(marker);if(at<0)throw Error('Process regression boundary missing');
 const migration=(await readFile('supabase/migrations/20261012060000_company_question_reuse.sql','utf8')).replace(/^\s*(begin|commit);\s*$/gim,'');
 const extra=await readFile('supabase/qa/company_question_reuse_verification.sql','utf8');
 const prefix=original.slice(0,at)+"\nreset role;create temp table cq_original as select id,to_jsonb(a) data from public.position_assessments a;create temp table cq_global as select id,to_jsonb(i) data from public.assessment_items i where organization_id is null;\n"+migration;
 const combined=prefix+original.slice(at).replace(/rollback;\s*$/,'')+extra+'\nrollback;\n';
 r=await file(db,'tmp/company-questions-regression.sql',combined);await writeFile(`${dir}/sql.txt`,r.output);checks.push({name:'sensitive private reuse plus existing bank/process/portal regression',pass:r.status===0,sqlChecks:(r.output.match(/NOTICE:  PASS:/g)??[]).length});if(r.status!==0)throw Error(r.output.slice(-3600));
 // Recreate only synthetic fixtures in this owned clone for a real two-connection race.
 r=await file(db,'tmp/company-questions-concurrent-fixture.sql',combined.replace(/rollback;\s*$/,'commit;'));if(r.status!==0)throw Error(r.output.slice(-2000));
 const [assessment,org]=call(db,"select provenance->>'assessmentId',organization_id from public.assessment_items where stem='Exclusive company synthetic new question'").split('|');
 call(db,"delete from public.assessment_items where stem='Exclusive company synthetic new question'");
 const results=await Promise.all([1,2].map(()=>concurrent(`begin;select private.project_company_assessment_questions('${org}','${assessment}');select pg_sleep(0.2);commit;`)));
 const duplicate=call(db,"select count(*) from public.assessment_items where stem='Exclusive company synthetic new question'");
 checks.push({name:'two simultaneous projections do not duplicate item or approval',pass:results.every(x=>x.status===0)&&duplicate==='1'});if(checks.some(x=>!x.pass))throw Error(JSON.stringify(results));
}finally{
 call('postgres',`drop database ${db}`);
 await writeFile(`${dir}/checks.json`,JSON.stringify({environment:'Owned LOCAL PostgreSQL17 schema-only clone; synthetic fixtures; removed after test',checks,limits:['Original disposable baseline preserved; no real production mutation, paid AI or email used.']},null,2));
}
console.log(JSON.stringify(checks));
