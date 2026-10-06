// Targeted LOCAL PostgreSQL verification; existing source checks + new batch; all writes roll back.
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const psql=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/psql.exe':'psql';
const args=['-X','-h','127.0.0.1','-p','55479','-U','prisma_v202_qa','-d','import_evidence_v202','-v','ON_ERROR_STOP=1'];
const sql="begin; do $$ begin if current_database()<>'import_evidence_v202' or inet_server_port()<>55479 then raise exception 'Disposable LOCAL database required'; end if; end $$;\n"+(await readFile('supabase/migrations/20260920111500_m81_person_competency_evidence_links.sql','utf8'))+'\n'+(await readFile('supabase/migrations/20261006023000_competency_evidence_batch.sql','utf8'))+'\n'+(await readFile('supabase/qa/competency_evidence_batch_verification.sql','utf8'))+'\nrollback;\n';
await writeFile('tmp/evidence-v209-local.sql',sql);
const result=spawnSync(psql,[...args,'-f','tmp/evidence-v209-local.sql'],{encoding:'utf8',windowsHide:true,timeout:60000});
await writeFile('tmp/evidence-v209-sql.log',(result.stdout??'')+(result.stderr??''));
if(result.status!==0)throw Error('Targeted SQL failed; transaction rolled back. See tmp/evidence-v209-sql.log');
console.log(`Targeted SQL PASS: ${((result.stderr??'').match(/NOTICE:  PASS:/g)??[]).length} checks, ROLLBACK.`);
