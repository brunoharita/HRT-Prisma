// Focused verification of the EXISTING classification RPC on the disposable LOCAL database.
import { readFile,writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const structure=await readFile('supabase/migrations/20260920110000_m81_competency_structure.sql','utf8');
const projection=await readFile('supabase/migrations/20260920111000_m81_competency_projection.sql','utf8');
const fixture=(await readFile('supabase/qa/competency_evidence_batch_verification.sql','utf8')).split('create function pg_temp.batch')[0];
const sql=`begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 then raise exception 'LOCAL disposable database required'; end if; end $$;\n${structure}\n${projection.split('create function public.search_competency_taxonomy_v2')[0]}\n${fixture}\n${await readFile('supabase/qa/competency_group_verification.sql','utf8')}\nrollback;\n`;
await writeFile('tmp/group-v2010-local.sql',sql);
const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1','-f','tmp/group-v2010-local.sql'],{encoding:'utf8',windowsHide:true,timeout:60000});
await writeFile('tmp/group-v2010-sql.log',(r.stdout??'')+(r.stderr??''));
if(r.status!==0)throw Error('Focused classification checks failed, transaction rolled back. See tmp/group-v2010-sql.log');
console.log(`Existing classification RPC PASS: ${((r.stderr??'').match(/NOTICE:  PASS:/g)??[]).length} checks; ROLLBACK.`);
