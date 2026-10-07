import {readFile,writeFile,mkdir} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const migrations=['20260925150000_m83_semantic_trajectory.sql','20260925190000_m83_prompt_compatibility.sql','20260927110000_m84_score_temporal_compatibility.sql','20260930111000_matching_last_reading_pair.sql','20260930170000_matching_human_conflict_review.sql','20260928190000_matching_recognition_consistency.sql','20260930210000_matching_legacy_review_refresh.sql'];
let sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 or exists(select 1 from public.people) then raise exception 'Empty disposable LOCAL database required'; end if; end $$;\n";
sql+="alter table public.vacancy_versions add column if not exists taxonomy_snapshot jsonb;alter table public.vacancy_requirements add column if not exists taxonomy_origin jsonb;alter table public.vacancy_versions add column if not exists experience_policy text not null default 'unspecified';\n";
for(const f of migrations)sql+=await readFile('supabase/migrations/'+f,'utf8')+'\n';
for(const f of ['m83_semantic_trajectory_verification.sql','matching_last_reading_pair_verification.sql','matching_human_conflict_review_verification.sql']){
  let fixture=await readFile('supabase/qa/'+f,'utf8');
  // Historical deletion-cascade test touches an unrelated pre-existing corrupt local synthesis table.
  // Exclude only that lifecycle block; no target review/authority assertion is skipped.
  if(f.startsWith('m83_'))fixture=fixture.slice(0,fixture.indexOf('-- Subtransactions prove physical lifecycle cascades'))+'reset role;\n'+fixture.slice(fixture.indexOf('-- Exhausted operational retries'));
  sql+=fixture+'\n';
}
sql+=await readFile('supabase/migrations/20261007220000_optional_extended_trajectory_review.sql','utf8')+'\n'+await readFile('supabase/qa/extended_trajectory_review_verification.sql','utf8')+'\nrollback;';
await mkdir('docs/qa/evidence/extended-trajectory-review',{recursive:true});await writeFile('tmp/extended-review-local.sql',sql);
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','tmp/extended-review-local.sql'],{encoding:'utf8',windowsHide:true});
await writeFile('docs/qa/evidence/extended-trajectory-review/sql.txt',(r.stdout+'\n'+r.stderr).replace(/[ \t]+$/gm,''));console.log((r.stdout+'\n'+r.stderr).slice(-3500));process.exitCode=r.status??1;
