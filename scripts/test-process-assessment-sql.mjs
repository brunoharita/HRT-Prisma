import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
let sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 or exists(select 1 from public.people) or to_regclass('public.position_assessments') is not null then raise exception 'Empty disposable LOCAL baseline required'; end if; end $$;\ntruncate public.profile_synthesis_jobs cascade;\n";
const stable=await readFile('supabase/migrations/20261007150000_stable_matching_scores.sql','utf8');sql+=stable.slice(0,stable.indexOf('-- Ignore passage'));
const fixture=await readFile('supabase/qa/m83_semantic_trajectory_verification.sql','utf8');sql+=fixture.slice(0,fixture.indexOf('create temp table m83_state'));
for(const name of ['20261009140000_generic_ai_request_history','20261008120000_position_follow_up','20261009150000_position_assessment','20261009160000_ai_history_worker_boundary','20261009170000_position_assessment_operational_boundary']) sql+=await readFile(`supabase/migrations/${name}.sql`,'utf8');
sql+=`insert into public.people(id,organization_id,full_name) values(m83_id('late-person'),m83_id('a'),'Candidato sintético tardio');
insert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at)
values(m83_id('late-profile'),m83_id('a'),m83_id('late-person'),'{}','fixture','none','none','fixture','fixture',1,'approved',now());\n`;
// Establish and verify the historical v1 portal first, then protect its full snapshots across the additive migration.
sql+=await readFile('supabase/qa/position_assessment_verification.sql','utf8');
sql+='\nreset role; create temp table v232_legacy as select to_jsonb(a) data from public.position_assessments a;\n';
sql+=await readFile('supabase/migrations/20261010120000_process_assessment.sql','utf8');
sql+=await readFile('supabase/qa/process_assessment_verification.sql','utf8');sql+='\nrollback;';
const dir='docs/qa/evidence/process-assessment-v232/sql';await mkdir(dir,{recursive:true});await mkdir('tmp',{recursive:true});await writeFile('tmp/process-assessment-local.sql',sql);
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','tmp/process-assessment-local.sql'],{encoding:'utf8',windowsHide:true});
const output=(r.stdout+'\n'+r.stderr).replaceAll('\r\n','\n');await writeFile(`${dir}/sql.txt`,output);console.log(output.slice(-6500));process.exitCode=r.status??1;
