import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const local={host:'127.0.0.1',port:'55479',user:'prisma_v202_qa',database:'import_evidence_v202'};
const processRegression=process.argv.includes('--process-regression');
const sqlFile=async(path)=>(await readFile(path,'utf8')).replace(/^\s*begin;\s*$/gim,'').replace(/^\s*commit;\s*$/gim,'');
let sql=`begin; do $$ begin if current_database()<>'${local.database}' or inet_server_port()<>${local.port} or exists(select 1 from public.people) or to_regclass('private.prisma_token_accounts') is not null then raise exception 'Verified empty disposable LOCAL baseline required';end if;end $$;\n`;
if(processRegression){
 const stable=await sqlFile('supabase/migrations/20261007150000_stable_matching_scores.sql');sql+=stable.slice(0,stable.indexOf('-- Ignore passage'));
 const fixture=await sqlFile('supabase/qa/m83_semantic_trajectory_verification.sql');sql+=fixture.slice(0,fixture.indexOf('create temp table m83_state'));
 for(const name of ['20261009140000_generic_ai_request_history','20261008120000_position_follow_up','20261009150000_position_assessment','20261009160000_ai_history_worker_boundary','20261009170000_position_assessment_operational_boundary'])sql+=await sqlFile(`supabase/migrations/${name}.sql`);
 sql+=`insert into public.people(id,organization_id,full_name) values(m83_id('late-person'),m83_id('a'),'Candidato sintético tardio');\ninsert into public.professional_profiles(id,organization_id,person_id,profile_data,extraction_version,inference_version,embedding_version,prompt_version,model_version,profile_version,review_status,approved_at) values(m83_id('late-profile'),m83_id('a'),m83_id('late-person'),'{}','fixture','none','none','fixture','fixture',1,'approved',now());\n`;
 sql+=await sqlFile('supabase/qa/position_assessment_verification.sql');
 sql+='\nreset role;create temp table v232_legacy as select to_jsonb(a) data from public.position_assessments a;\n';
 sql+=await sqlFile('supabase/migrations/20261010120000_process_assessment.sql');
}
for(const name of ['20261009140000_generic_ai_request_history','20261010180000_prisma_tokens','20261012010000_question_bank_workspace_and_review','20261012011000_question_bank_tokens']){
 if(processRegression&&name==='20261009140000_generic_ai_request_history')continue;
 sql+=await sqlFile(`supabase/migrations/${name}.sql`)+'\n';
}
sql+=await sqlFile('supabase/qa/question_bank_verification.sql');
if(processRegression){sql+='\nreset role;\n';sql+=await sqlFile('supabase/qa/process_assessment_verification.sql');}
sql+='\nrollback;\n';
const dir=`docs/qa/evidence/question-bank-v250/${processRegression?'regression-sql':'sql'}`;await mkdir(dir,{recursive:true});await mkdir('tmp',{recursive:true});await writeFile('tmp/question-bank-local.sql',sql);
if(process.argv.includes('--prepare-only')){console.log('Prepared synthetic SQL; no database connection or mutation.');process.exit(0);}
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h',local.host,'-p',local.port,'-U',local.user,'-d',local.database,'-v','ON_ERROR_STOP=1','-f','tmp/question-bank-local.sql'],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
const output=(r.stdout+'\n'+r.stderr).replaceAll('\r\n','\n').split('\n').map(line=>line.trimEnd()).join('\n');await writeFile(`${dir}/sql.txt`,output);const checks=(output.match(/NOTICE:  PASS:/g)??[]).length;await writeFile(`${dir}/checks.json`,JSON.stringify({environment:local,transaction:'rollback, synthetic fixtures only',checks,exitCode:r.status},null,2));console.log(output.slice(-4500));console.log(JSON.stringify({checks,exitCode:r.status}));process.exitCode=r.status??1;
