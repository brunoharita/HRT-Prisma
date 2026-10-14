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
sql+=await readFile('supabase/qa/process_assessment_verification.sql','utf8');
for(const name of ['20261005013000_profile_synthesis_diagnostics','20261005034000_profile_synthesis_sections','20261005034500_profile_synthesis_retry_upgrade','20261010180000_prisma_tokens','20261010181000_prisma_tokens_consumers']) sql+=await readFile(`supabase/migrations/${name}.sql`,'utf8');
const nonround=process.argv.includes('--nonround-rates');
if(nonround){
 sql+=await readFile('supabase/qa/prisma_token_nonround_before.sql','utf8');
 const migration=await readFile('supabase/migrations/20261012130000_prisma_token_nonround_rates.sql','utf8');
 sql+=`update private.prisma_token_rates set tokens_per_unit=12345 where function_name='parser_ia';\nselect m83_reject($nr_migration$${migration}$nr_migration$,'P0001');\nupdate private.prisma_token_rates set tokens_per_unit=10000 where function_name='parser_ia';\n`;
 sql+=`insert into private.prisma_token_rates(function_name,tokens_per_unit,effective_at) values('parser_ia',9999,now()+interval '1 day');\nselect m83_reject($nr_migration$${migration}$nr_migration$,'P0001');\ndelete from private.prisma_token_rates where effective_at>now();\n`;
 sql+=migration;
 sql+=await readFile('supabase/qa/prisma_token_nonround_after.sql','utf8');
 sql+=`select m83_reject($nr_migration$${migration}$nr_migration$,'P0001');\nselect m83_assert((select count(*)=6 from private.prisma_token_rates),'replay rejected without extra revisions');\n`;
}else sql+=await readFile('supabase/qa/prisma_tokens_verification.sql','utf8');
const timeline=process.argv.includes('--response-timeline');
const content=process.argv.includes('--content-signals')||timeline;
const activity=process.argv.includes('--activity-analysis')||content;
if(activity){
 sql+=await readFile('supabase/migrations/20261013120000_assessment_activity_analysis.sql','utf8');
 const rate=await readFile('supabase/migrations/20261013130000_assessment_activity_analysis_rate.sql','utf8');
 sql+=`reset role; savepoint approved_activity_rate; create temp table aa_rates_before as select to_jsonb(r) data from private.prisma_token_rates r;
`;
 sql+=rate;
 sql+=`select m83_assert((select count(*)=1 and min(tokens_per_unit)=6193 from private.prisma_token_rates where function_name='assessment_activity_analysis'),'approved commercial activity tariff is 6193');
select m83_assert(not exists(select data from aa_rates_before except select to_jsonb(r) from private.prisma_token_rates r),'other tariffs preserved');
select m83_reject($aa_rate$${rate}$aa_rate$,'P0001');
select m83_assert((select count(*)=1 from private.prisma_token_rates where function_name='assessment_activity_analysis'),'tariff replay adds no revision');
rollback to approved_activity_rate;
`;
 sql+=await readFile('supabase/qa/assessment_activity_analysis_verification.sql','utf8');
}
if(content){sql+=await readFile('supabase/migrations/20261013193000_assessment_content_signals.sql','utf8');sql+=await readFile('supabase/qa/assessment_content_signals_verification.sql','utf8');sql+=await readFile('supabase/migrations/20261013205000_assessment_content_selection_scope.sql','utf8');sql+=await readFile('supabase/qa/assessment_content_selection_scope_verification.sql','utf8');}
if(timeline){sql+='\nreset role; create temp table tl_attempts_before as select to_jsonb(t) data from public.position_assessment_attempts t; create temp table tl_assessments_before as select to_jsonb(t) data from public.position_assessments t; create temp table tl_analyses_before as select to_jsonb(t) data from private.assessment_activity_analyses t;\n';sql+=await readFile('supabase/migrations/20261014100000_assessment_response_timeline.sql','utf8');sql+=await readFile('supabase/qa/assessment_response_timeline_verification.sql','utf8');}
sql+='\nrollback;';
const dir=timeline?'docs/qa/evidence/assessment-question-timeline/sql':content?'docs/qa/evidence/assessment-content-signals/sql':activity?'docs/qa/evidence/assessment-activity-v252/sql':nonround?'docs/qa/evidence/tokens-nonround-rates/sql':'docs/qa/evidence/tokens-prisma-v240/sql';await mkdir(dir,{recursive:true});await mkdir('tmp',{recursive:true});await writeFile('tmp/tokens-prisma-local.sql',sql);
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','tmp/tokens-prisma-local.sql'],{encoding:'utf8',windowsHide:true});
const rawOutput=(r.stdout+'\n'+r.stderr).replaceAll('\r\n','\n');const output=activity?rawOutput.split('\n').map(line=>line.trimEnd()).join('\n'):rawOutput;await writeFile(`${dir}/sql.txt`,output);console.log(output.slice(-6500));process.exitCode=r.status??1;
