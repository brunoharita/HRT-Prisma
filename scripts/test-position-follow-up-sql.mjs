import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
// This endpoint is a disposable, empty localhost fixture. Never accept remote overrides.
let sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 or exists(select 1 from public.people) then raise exception 'Empty disposable LOCAL database required'; end if; end $$;\n";
const stable=await readFile('supabase/migrations/20261007150000_stable_matching_scores.sql','utf8');
sql+=stable.slice(0,stable.indexOf('-- Ignore passage'));
const fixture=await readFile('supabase/qa/m83_semantic_trajectory_verification.sql','utf8');
sql+=fixture.slice(0,fixture.indexOf('create temp table m83_state'));
sql+=await readFile('supabase/migrations/20261008120000_position_follow_up.sql','utf8');
sql+=await readFile('supabase/qa/position_follow_up_verification.sql','utf8');
sql+='\nrollback;';
await mkdir('output',{recursive:true});await mkdir('docs/qa/evidence/position-follow-up-v220',{recursive:true});
await writeFile('output/position-follow-up-local.sql',sql);
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','output/position-follow-up-local.sql'],{encoding:'utf8',windowsHide:true});
await writeFile('docs/qa/evidence/position-follow-up-v220/sql.txt',r.stdout+'\n'+r.stderr);
console.log((r.stdout+'\n'+r.stderr).slice(-5500));process.exitCode=r.status??1;
