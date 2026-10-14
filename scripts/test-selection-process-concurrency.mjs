import{spawnSync,spawn}from"node:child_process";import{readFile,writeFile,mkdir}from"node:fs/promises";
import{selectionProcessQaSql}from"./selection-process-qa-baseline.mjs";
const exe="C:/Program Files/PostgreSQL/17/bin/",args=["-X","-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-v","ON_ERROR_STOP=1"],db="selection_process_concurrency_v260",checks=[];
function psql(database,q){const r=spawnSync(exe+"psql.exe",[...args,"-d",database,"-At","-c",q],{encoding:"utf8",windowsHide:true});if(r.status!==0)throw Error(r.stderr.slice(-1500));return r.stdout.trim();}
function simultaneous(q){return new Promise(resolve=>{const p=spawn(exe+"psql.exe",[...args,"-d",db,"-At","-c",q],{windowsHide:true});let out="",err="";p.stdout.on("data",x=>out+=x);p.stderr.on("data",x=>err+=x);p.on("exit",status=>resolve({status,out,err}));});}
if(psql("import_evidence_v202","select count(*) from public.people")!=="0")throw Error("Empty local baseline required");
if(psql("postgres",`select count(*) from pg_database where datname='${db}'`)!=="0")throw Error("Task disposable DB exists; never overwrite");
await mkdir("tmp/selection-processes",{recursive:true});psql("postgres",`create database ${db}`);
try{
 const dump=spawnSync(exe+"pg_dump.exe",["-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-d","import_evidence_v202","--schema-only","--no-owner","--no-privileges"],{encoding:"utf8",windowsHide:true,maxBuffer:16*1024*1024});
 if(dump.status!==0)throw Error("Dump failed");await writeFile("tmp/selection-processes/baseline.sql",dump.stdout);
 const load=spawnSync(exe+"psql.exe",[...args,"-d",db,"-f","tmp/selection-processes/baseline.sql"],{encoding:"utf8",windowsHide:true});if(load.status!==0)throw Error(load.stderr.slice(-1500));
 psql(db,"grant usage on schema extensions to anon,authenticated,service_role");
 let source=await selectionProcessQaSql(db);source=source.slice(0,source.indexOf("create temp table sp_result"))+"\ncommit;";
 await writeFile("tmp/selection-processes/concurrency-fixture.sql",source);
 const fixture=spawnSync(exe+"psql.exe",[...args,"-d",db,"-f","tmp/selection-processes/concurrency-fixture.sql"],{encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024});if(fixture.status!==0)throw Error(fixture.stderr.slice(-1500));
 const a=psql(db,"select m83_id('a')"),v=psql(db,"select m83_id('sp-vac')"),actor=psql(db,"select m83_id('recruiter')"),req=psql(db,"select m83_id('concurrent-same')");
 const auth=`set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);`;
 const same=await Promise.all([1,2].map(()=>simultaneous(`begin;${auth}select public.start_position_selection_process('${a}','${v}',null,null,'${req}')#>>'{process,id}';select pg_sleep(.15);commit;`)));
 checks.push({name:"concurrent same request returns same cycle with one audit",pass:same.every(r=>r.status===0)&&psql(db,`select count(*) from public.position_evaluation_processes where vacancy_id='${v}'`)==="1"&&psql(db,`select count(*) from public.position_evaluation_history h join public.position_evaluation_processes p on p.id=h.process_id where p.vacancy_id='${v}'`)==="1"});
 const p=psql(db,`select id from public.position_evaluation_processes where vacancy_id='${v}'`);
 psql(db,`begin;${auth}select public.mutate_position_follow_up_process('${a}','${v}','${p}','close_process',null,1);commit;`);
 const rev=psql(db,`select revision from public.position_evaluation_processes where id='${p}'`);
 const distinct=await Promise.all(["race-1","race-2"].map(n=>simultaneous(`begin;${auth}select public.start_position_selection_process('${a}','${v}','${p}',${rev},m83_id('${n}'))#>>'{process,id}';select pg_sleep(.15);commit;`)));
 checks.push({name:"distinct concurrent starts leave exactly one new active process",pass:distinct.filter(r=>r.status===0).length===1&&distinct.filter(r=>r.status!==0&&r.err.includes("FOLLOW_UP_CONFLICT")).length===1&&psql(db,`select count(*) from public.position_evaluation_processes where vacancy_id='${v}' and status='active'`)==="1"});
 checks.push({name:"previous cycle and position occupancy preserved",pass:psql(db,`select count(*) from public.position_evaluation_processes where vacancy_id='${v}' and status='closed' and not is_current`)==="1"&&psql(db,"select status from public.positions where id=m83_id('sp-pos')")==="vacant"});
 await writeFile("docs/qa/evidence/selection-processes-v260/sql/concurrency.json",JSON.stringify(checks,null,2));
 if(checks.some(c=>!c.pass))throw Error("Concurrency failed");console.log(`PASS ${checks.length} concurrent checks`);
}finally{psql("postgres",`drop database ${db}`);}
