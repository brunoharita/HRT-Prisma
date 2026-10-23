import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Reuse the empty LOCAL schema and the existing manual publication regression.
const exe = "C:/Program Files/PostgreSQL/17/bin/";
const args = ["-X", "-h", "127.0.0.1", "-p", "55479", "-U", "prisma_v202_qa", "-v", "ON_ERROR_STOP=1"];
const database = "profile_scalar_targets_qa";
const directory = "docs/qa/evidence/profile-publication-scalar-fix";
function query(db, sql) {
  const result = spawnSync(exe + "psql.exe", [...args, "-d", db, "-At", "-c", sql], { encoding: "utf8", windowsHide: true, timeout: 60000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const cleanMigration = async path => (await readFile(path, "utf8")).replace(/^begin;\s*$/mg, "").replace(/^commit;\s*$/mg, "");
assert.equal(query("import_evidence_v202", "select current_database()||'|'||inet_server_port()||'|'||(select count(*) from public.people)"), "import_evidence_v202|55479|0");
assert.equal(query("postgres", `select count(*) from pg_database where datname='${database}'`), "0", "Never overwrite a local database");
await mkdir(directory, { recursive: true });
await mkdir("tmp/profile-scalar-targets", { recursive: true });
let sql = `begin; do $$ begin if current_database()<>'${database}' or inet_server_port()<>55479 or exists(select 1 from public.people) then raise exception 'Empty disposable LOCAL baseline required'; end if; end $$;\n`;
const fixture = await readFile("supabase/qa/m83_semantic_trajectory_verification.sql", "utf8");
sql += fixture.slice(0, fixture.indexOf("insert into public.people"));
sql += "insert into public.people(id,organization_id,full_name) values(m83_id('legacy-person'),m83_id('a'),'Legado sintético');\n";
sql += await cleanMigration("supabase/migrations/20261004040000_review_period_format_preflight.sql");
const consumers = await readFile("supabase/migrations/20261010181000_prisma_tokens_consumers.sql", "utf8");
sql += consumers.slice(consumers.indexOf("alter function private.enqueue_profile_synthesis"), consumers.indexOf("alter function public.request_profile_synthesis"));
sql += await cleanMigration("supabase/migrations/20261015070000_manual_profile_and_employee.sql");
let regression = await readFile("supabase/qa/manual_profile_v270_verification.sql", "utf8");
const saveMarker = "insert into manual_state values('update_save'";
assert.ok(regression.includes(saveMarker));
regression = regression.replace(saveMarker, `update manual_state set value=jsonb_set(value,'{professionalTitle}','"Analista atualizado"') where key='update_payload';\n${saveMarker}`);
const publicationLine = regression.split("\n").find(line => line.startsWith("insert into manual_state values('version2'"));
assert.ok(publicationLine?.includes("'merge','[]'"));
const decisions = JSON.stringify([
  { fieldPath: "professionalTitle", action: "update", resolver: "same_block", sourceBlockId: null, targetBlockId: null },
  { fieldPath: "summary", action: "update", resolver: "same_block", sourceBlockId: null, targetBlockId: null },
]);
const fixedLine = publicationLine.replace("'merge','[]'", `'merge','${decisions}'`);
const baseline = `
do $$ declare constraint_name text; begin
  begin
    perform public.publish_profile_review(m83_id('a'),(select (value->>'review_id')::uuid from manual_state where key='update'),2,'merge','${decisions}','scalar-baseline-reject');
    raise exception 'Baseline did not reproduce';
  exception when check_violation then
    get stacked diagnostics constraint_name=constraint_name;
    if constraint_name<>'profile_publication_decisions_check' then raise; end if;
    raise notice 'PASS: baseline reproduces exact23514 constraint for title and summary';
  end;
end $$;
select m83_assert((select count(*)=1 from public.professional_profiles) and (select state='draft' and lock_version=2 from public.profile_reviews where id=(select (value->>'review_id')::uuid from manual_state where key='update')),'baseline failure rolls back Profile and preserves saved review');
reset role;
${await cleanMigration("supabase/migrations/20261023144000_profile_publication_scalar_targets.sql")}
set local role authenticated;
`;
regression = regression.replace(publicationLine, () => baseline + fixedLine + "\nselect m83_assert((select count(*)=2 and bool_and(target_block_id is null) from public.profile_publication_decisions where review_id=(select (value->>'review_id')::uuid from manual_state where key='update')),'updated title and summary published with complete audit and no fabricated block IDs');");
sql += regression;
sql += await readFile("supabase/qa/profile_publication_scalar_targets_verification.sql", "utf8");
sql += "\nselect m83_assert((select count(*)=0 from public.profile_synthesis_jobs),'publication never enqueues AI');\nrollback;\n";
await writeFile("tmp/profile-scalar-targets/verification.sql", sql);
query("postgres", `create database ${database} with template template0`);
try {
  const dump = spawnSync(exe + "pg_dump.exe", ["-h", "127.0.0.1", "-p", "55479", "-U", "prisma_v202_qa", "-d", "import_evidence_v202", "--schema-only", "--no-owner"], { encoding: "utf8", windowsHide: true, maxBuffer: 24 * 1024 * 1024, timeout: 60000 });
  assert.equal(dump.status, 0, dump.stderr);
  await writeFile("tmp/profile-scalar-targets/schema.sql", dump.stdout);
  for (const file of ["schema", "verification"]) {
    const result = spawnSync(exe + "psql.exe", [...args, "-d", database, "-f", `tmp/profile-scalar-targets/${file}.sql`], { encoding: "utf8", windowsHide: true, maxBuffer: 12 * 1024 * 1024, timeout: 60000 });
    const output = (result.stdout + "\n" + result.stderr).replaceAll("\r", "").split("\n").map(line => line.trimEnd()).join("\n");
    if (file === "verification") {
      await writeFile(`${directory}/sql.txt`, output);
      console.log(output.slice(-8000));
      await writeFile(`${directory}/summary.json`, JSON.stringify({ environment: "LOCAL PostgreSQL17; schema-only clone; synthetic fixtures; transaction rollback and clone removed", status: result.status === 0 ? "PASS" : "FAIL", assertions: (output.match(/NOTICE:  PASS:/g) ?? []).length }, null, 2) + "\n");
    }
    assert.equal(result.status, 0, result.stderr.slice(-2200));
  }
} finally {
  query("postgres", `drop database ${database}`);
}
