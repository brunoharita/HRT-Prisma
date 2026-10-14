import{selectionProcessQaSql}from"./selection-process-qa-baseline.mjs";import{writeFile,mkdir}from"node:fs/promises";import{spawnSync}from"node:child_process";
await mkdir("tmp/selection-processes",{recursive:true});await mkdir("docs/qa/evidence/selection-processes-v260/sql",{recursive:true});await writeFile("tmp/selection-processes/local.sql",await selectionProcessQaSql());
const r=spawnSync("C:/Program Files/PostgreSQL/17/bin/psql.exe",["-X","-h","127.0.0.1","-p","55479","-U","prisma_v202_qa","-d","import_evidence_v202","-v","ON_ERROR_STOP=1","-f","tmp/selection-processes/local.sql"],{encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024});
const evidence=(r.stdout+"\n"+r.stderr).replace(/[ \t]+$/gm,"");
await writeFile("docs/qa/evidence/selection-processes-v260/sql/sql.txt",evidence);
console.log(`SQL ${(evidence.match(/NOTICE:  PASS:/g)??[]).length} checks, exit ${r.status}`);if(r.status!==0)console.log(evidence.slice(-1500));process.exitCode=r.status??1;
