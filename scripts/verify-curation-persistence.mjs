// Deterministic SQL tests; only the existing empty LOCAL disposable database, always rolled back.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const files=['20260918160000_m72_person_professional_evidence.sql','20260918180000_m73_declared_competency_normalization.sql','20260918190000_m74_contextual_competency_curation.sql','20260918200000_m72_competency_taxonomy_v2.sql','20260918203000_m75_competency_coverage_recovery.sql','20260918220000_m76_curation_description_scope.sql','20260919040000_m77_company_knowledge_global_governance.sql','20260919164100_m77_legacy_company_proposal_transition.sql','20260920110000_m81_competency_structure.sql','20260920111000_m81_competency_projection.sql','20260920111500_m81_person_competency_evidence_links.sql','20260920112000_m81_competency_curation.sql','20260920223000_m82_human_created_competency_profile_projection.sql'];
let sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 then raise exception 'Disposable LOCAL database required'; end if; if exists(select 1 from public.people) then raise exception 'Empty synthetic baseline required'; end if; end $$;\n";
sql+=await readFile('supabase/qa/m81_competency_setup.sql','utf8')+'\n';
for(const file of files)sql+=(await readFile('supabase/migrations/'+file,'utf8')).replace(/^create function /gm,'create or replace function ')+'\n';
const fixture=await readFile('supabase/qa/stable_competency_curation_verification.sql','utf8');
const [before,after]=fixture.split('-- APPLY CORRECTION HERE');
sql+=before+'\n'+await readFile('supabase/migrations/20261007020000_stable_competency_curation.sql','utf8')+'\n'+after+'\nrollback;\n';
await writeFile('tmp/curation-persistence-local.sql',sql);
const psql=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/psql.exe':'psql';
const r=spawnSync(psql,['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','tmp/curation-persistence-local.sql'],{encoding:'utf8',windowsHide:true,timeout:60000});
await writeFile('tmp/curation-persistence-sql.log',(r.stdout??'')+(r.stderr??''));
if(r.status!==0)throw Error('Targeted SQL failed; transaction rolled back. See tmp/curation-persistence-sql.log');
console.log(`Stable curation SQL PASS: ${((r.stderr??'').match(/NOTICE:  PASS:/g)??[]).length} checks, ROLLBACK.`);
