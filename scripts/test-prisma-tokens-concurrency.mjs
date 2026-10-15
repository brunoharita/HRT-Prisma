import {spawnSync,spawn} from 'node:child_process';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const exe='C:/Program Files/PostgreSQL/17/bin/',args=['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-v','ON_ERROR_STOP=1'],db=process.argv.includes('--calendar-wallet')?'prisma_tokens_concurrency_v262':'prisma_tokens_concurrency_v240',checks=[];
function psql(database,query){const r=spawnSync(exe+'psql.exe',[...args,'-d',database,'-At','-c',query],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-1200));return r.stdout.trim();}
function concurrent(query){return new Promise(resolve=>{const p=spawn(exe+'psql.exe',[...args,'-d',db,'-At','-c',query],{windowsHide:true});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('exit',status=>resolve({status,out,err}));});}
if(psql('import_evidence_v202','select count(*) from public.people')!=='0')throw Error('LOCAL empty baseline required');if(psql('postgres',`select count(*) from pg_database where datname='${db}'`)!=='0')throw Error('Dedicated LOCAL concurrency database exists; do not overwrite');
psql('postgres',`create database ${db}`);
try{
 const dump=spawnSync(exe+'pg_dump.exe',['-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','--schema-only','--no-owner','--no-privileges'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});if(dump.status!==0)throw Error('LOCAL_SCHEMA_DUMP_FAILED');await writeFile('tmp/tokens-concurrency-baseline.sql',dump.stdout);
 let r=spawnSync(exe+'psql.exe',[...args,'-d',db,'-f','tmp/tokens-concurrency-baseline.sql'],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-1200));psql(db,'grant usage on schema extensions to anon,authenticated,service_role');
 const fixture=(await readFile('tmp/tokens-prisma-local.sql','utf8')).replaceAll("'import_evidence_v202'",`'${db}'`).replace(/rollback;\s*$/,'commit;');await writeFile('tmp/tokens-concurrency-fixture.sql',fixture);r=spawnSync(exe+'psql.exe',[...args,'-d',db,'-f','tmp/tokens-concurrency-fixture.sql'],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-1600));
 const a=psql(db,"select m83_id('a')"),b=psql(db,"select m83_id('b')"),actor=psql(db,"select m83_id('super')");
 const auth=`select set_config('request.jwt.claim.sub','${actor}',true);`;
 const quote=()=>psql(db,`begin;${auth}select public.prisma_tokens('quote','${b}','{"functionName":"parser_ia","quantity":1}')->>'id';commit;`).split(/\r?\n/).find(x=>/^[a-f0-9-]{36}$/.test(x)&&x!==actor);
 psql(db,`begin;${auth}select public.prisma_tokens('grant','${b}',jsonb_build_object('tokens',15000,'reason','Concurrent local fixture','operationId',gen_random_uuid()));commit;`);
 const q1=quote(),q2=quote();
 const spend=await Promise.all([q1,q2].map(q=>concurrent(`begin;${auth}select private.prisma_token_reserve('${b}','parser_ia',gen_random_uuid(),'${q}',1);select pg_sleep(0.15);commit;`)));
 checks.push({name:'parallel distinct consumers cannot overspend shared company balance',pass:spend.filter(x=>x.status===0).length===1&&spend.filter(x=>/PT_INSUFFICIENT_BALANCE/.test(x.err)).length===1&&psql(db,`select private.prisma_token_balance('${b}')`)==='3000'});
 psql(db,`select private.prisma_token_settle('${b}','parser_ia',operation_id,false) from private.prisma_token_reservations where organization_id='${b}' and status='reserved'`);
 const q3=quote(),operation=psql(db,'select gen_random_uuid()');
 const replay=await Promise.all([1,2].map(()=>concurrent(`begin;${auth}select private.prisma_token_reserve('${b}','parser_ia','${operation}','${q3}',1);select pg_sleep(0.15);commit;`)));
 checks.push({name:'parallel identical logical calls create one reservation',pass:replay.every(x=>x.status===0)&&psql(db,`select count(*) from private.prisma_token_reservations where operation_id='${operation}'`)==='1'});
 const settles=await Promise.all([1,2].map(()=>concurrent(`begin;select private.prisma_token_settle('${b}','parser_ia','${operation}',true);select pg_sleep(0.15);commit;`)));
 checks.push({name:'parallel successful settlement creates one debit',pass:settles.every(x=>x.status===0)&&psql(db,`select count(*) from private.prisma_token_movements where reference_id=(select id from private.prisma_token_reservations where operation_id='${operation}') and kind='debit'`)==='1'});
 const id=psql(db,'select gen_random_uuid()'),pack=psql(db,'select id from private.prisma_token_packages where active limit 1');
 psql(db,`begin;${auth}select public.prisma_tokens('request_package','${a}',jsonb_build_object('packageId','${pack}','operationId','${id}'));select public.prisma_tokens('order_status','${a}',jsonb_build_object('id','${id}','status','awaiting_payment'));commit;`);
 const release=await Promise.all([1,2].map(()=>concurrent(`begin;${auth}select public.prisma_tokens('order_status','${a}',jsonb_build_object('id','${id}','status','released','paymentConfirmed',true,'paymentReference','synthetic-concurrent-verified'));select pg_sleep(0.15);commit;`)));
 checks.push({name:'parallel verified release cannot credit the same order twice',pass:release.every(x=>x.status===0)&&psql(db,`select count(*) from private.prisma_token_lots where source_key='order:${id}'`)==='1'});
 const c=psql(db,`insert into public.organizations(name,group_id) values('Concurrent renewal fixture',m83_id('group')) returning id` ).split(/\r?\n/).find(x=>/^[a-f0-9-]{36}$/.test(x));
 const renewal=await Promise.all([1,2].map(()=>concurrent(`begin;${auth}select public.prisma_tokens('overview','${c}')->>'available';select pg_sleep(0.15);commit;`)));
 checks.push({name:'first simultaneous consultations grant monthly franchise once',pass:renewal.every(x=>x.status===0)&&psql(db,`select count(*) from private.prisma_token_lots where organization_id='${c}'`)==='1'});
 if(checks.some(c=>!c.pass))throw Error('TOKEN_CONCURRENCY_FAILED');
}finally{psql('postgres',`drop database ${db}`);await mkdir(process.argv.includes('--calendar-wallet')?'docs/qa/evidence/tokens-v262/concurrency':'docs/qa/evidence/tokens-prisma-v240/concurrency',{recursive:true});await writeFile((process.argv.includes('--calendar-wallet')?'docs/qa/evidence/tokens-v262/concurrency':'docs/qa/evidence/tokens-prisma-v240/concurrency')+'/checks.json',JSON.stringify({environment:'Owned LOCAL PostgreSQL17 schema-only clone removed after run',checks},null,2));}
console.log(JSON.stringify({passed:checks.length,total:checks.length}));
