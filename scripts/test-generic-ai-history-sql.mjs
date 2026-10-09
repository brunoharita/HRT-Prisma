import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
// Fixed, disposable localhost database only. Never accept a remote override.
let sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 or exists(select 1 from public.people) or exists(select 1 from public.ai_usage_events) or to_regclass('public.ai_requests') is not null then raise exception 'Empty disposable LOCAL baseline required'; end if; end $$;\n";
const fixture=await readFile('supabase/qa/m83_semantic_trajectory_verification.sql','utf8');
sql+=fixture.slice(0,fixture.indexOf('create temp table m83_state'));
sql+="insert into public.ai_usage_events(organization_id,process_id,stage,duration_ms,provider,model,version,result) values(public.m83_id('a'),public.m83_id('legacy-before'),'legacy-before',12,'synthetic','synthetic','legacy','failure');\ncreate temp table ai_history_legacy_snapshot as select to_jsonb(e) value from public.ai_usage_events e;\n";
sql+=await readFile('supabase/migrations/20261009140000_generic_ai_request_history.sql','utf8');
sql+=await readFile('supabase/qa/generic_ai_history_verification.sql','utf8');
sql+='\nrollback;';
const evidence='docs/qa/evidence/position-assessment-v230/generic-ai-history';
await mkdir('output',{recursive:true});await mkdir(evidence,{recursive:true});
await writeFile('output/generic-ai-history-local.sql',sql);
const result=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','output/generic-ai-history-local.sql'],{encoding:'utf8',windowsHide:true});
const output=(result.stdout+'\n'+result.stderr).split(/\r?\n/).map(l=>l.trimEnd()).join('\n').trimEnd()+'\n';
await writeFile(`${evidence}/sql.txt`,output);
console.log(output.slice(-6000));process.exitCode=result.status??1;
