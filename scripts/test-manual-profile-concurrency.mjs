import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const exe = "C:/Program Files/PostgreSQL/17/bin/psql.exe", args = ["-X", "-h", "127.0.0.1", "-p", "55479", "-U", "prisma_v202_qa", "-v", "ON_ERROR_STOP=1"], db = "manual_profile_concurrency_v270";
function query(database, sql) {
  const r = spawnSync(exe, [...args, "-d", database, "-At", "-c", sql], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw Error(r.stderr.slice(-1800));
  return r.stdout.trim();
}
function concurrent(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn(exe, [...args, "-d", db, "-At", "-c", sql], { windowsHide: true });
    let output = "", error = "";
    p.stdout.on("data", x => output += x); p.stderr.on("data", x => error += x);
    p.on("error", reject); p.on("exit", code => resolve({ code, output, error }));
  });
}
assert.equal(query("import_evidence_v202", "select current_database()||'|'||inet_server_port()||'|'||(select count(*) from public.people)"), "import_evidence_v202|55479|0");
assert.equal(query("postgres", `select count(*) from pg_database where datname='${db}'`), "0", "Never overwrite a local database");
query("postgres", `create database ${db} with template template0`);
const checks = [];
const check = (name, pass) => { checks.push({ name, pass }); assert.ok(pass, name); };
try {
  await mkdir("tmp/manual-profile-browser", { recursive: true });
  const dump = spawnSync("C:/Program Files/PostgreSQL/17/bin/pg_dump.exe", ["-h", "127.0.0.1", "-p", "55479", "-U", "prisma_v202_qa", "-d", "import_evidence_v202", "--schema-only", "--no-owner"], { encoding: "utf8", windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(dump.status, 0, "Logical disposable baseline schema dump");
  await writeFile("tmp/manual-profile-browser/schema.sql", dump.stdout);
  const load = spawnSync(exe, [...args, "-d", db, "-f", "tmp/manual-profile-browser/schema.sql"], { encoding: "utf8", windowsHide: true });
  assert.equal(load.status, 0, load.stderr.slice(-1500));
  let sql = "begin;";
  const fixture = await readFile("supabase/qa/m83_semantic_trajectory_verification.sql", "utf8");
  sql += fixture.slice(0, fixture.indexOf("insert into public.people"));
  for (const name of ["20261004040000_review_period_format_preflight", "20261015070000_manual_profile_and_employee"]) sql += (await readFile(`supabase/migrations/${name}.sql`, "utf8")).replace(/^begin;\s*$/mg, "").replace(/^commit;\s*$/mg, "");
  sql += "commit;";
  await mkdir("tmp/manual-profile-browser", { recursive: true });
  await writeFile("tmp/manual-profile-browser/concurrency.sql", sql);
  const setup = spawnSync(exe, [...args, "-d", db, "-f", "tmp/manual-profile-browser/concurrency.sql"], { encoding: "utf8", windowsHide: true });
  assert.equal(setup.status, 0, setup.stderr);
  const start = "begin;set local role authenticated;select set_config('request.jwt.claim.sub',m83_id('recruiter')::text,true);";
  const request = "select row_to_json(r) from public.start_manual_profile_review(m83_id('a'),null,'{\"fullName\":\"Pessoa corrida\",\"email\":\"race@example.invalid\"}',false,'manual-concurrent-create-01') r;";
  const created = await Promise.all([concurrent(start + request + "select pg_sleep(0.7);commit;"), concurrent(start + request + "commit;")]);
  check("concurrent replay creates one Person and one manual draft", created.every(r => r.code === 0) && query(db, "select count(*) from public.people") === "1" && query(db, "select count(*) from public.profile_reviews") === "1");
  const person = query(db, "select id from public.people"), review = query(db, "select id from public.profile_reviews");
  const updates = await Promise.all(["A", "B"].map(text => concurrent(start + `select * from public.save_profile_review(m83_id('a'),'${review}',1,(select reviewed_data||jsonb_build_object('summary','Resumo ${text}') from public.profile_reviews where id='${review}'),'Manual update','manual-concurrent-save-${text}');select pg_sleep(0.3);commit;`)));
  if (updates.filter(r => r.code === 0).length !== 1) console.log(updates.map(r => ({ code: r.code, error: r.error.slice(0, 800) })));
  check("competing draft saves produce one success and one conflict", updates.filter(r => r.code === 0).length === 1 && updates.some(r => r.error.includes("review_conflict")) && query(db, `select lock_version from public.profile_reviews where id='${review}'`) === "2");
  const publication = `select * from public.publish_profile_review(m83_id('a'),'${review}',2,'merge','[]','manual-concurrent-publish-01');`;
  const published = await Promise.all([concurrent(start + publication + "select pg_sleep(0.5);commit;"), concurrent(start + publication + "commit;")]);
  check("competing publication replay produces one immutable version", published.every(r => r.code === 0) && query(db, "select count(*) from public.professional_profiles") === "1");
  const second = "select * from public.start_manual_profile_review(m83_id('a'),null,'{\"fullName\":\"Outra corrida\"}',false,";
  const duplicates = await Promise.all(["A", "B"].map(key => concurrent(start + second + `'manual-dedup-race-${key}');select pg_sleep(0.3);commit;`)));
  check("different concurrent creation keys still require human duplicate decision", duplicates.filter(r => r.code === 0).length === 1 && duplicates.some(r => r.error.includes("manual_duplicate_confirmation_required")) && query(db, "select count(*) from public.people where full_name='Outra corrida'") === "1");
  check("manual concurrency never creates documents attempts or extraction evidence", query(db, "select (select count(*) from public.documents)+(select count(*) from public.document_processing_attempts)+(select count(*) from public.evidence)") === "0");
  check("original profile survives further drafts", query(db, `select profile_version=1 and superseded_at is null from public.professional_profiles where person_id='${person}'`) === "t");
} finally {
  await mkdir("docs/qa/evidence/manual-profile-v270/sql", { recursive: true });
  await writeFile("docs/qa/evidence/manual-profile-v270/sql/concurrency.json", JSON.stringify(checks, null, 2) + "\n");
  query("postgres", `drop database ${db}`);
}
console.log(`PASS ${checks.length} real concurrent manual-profile checks; disposable database removed`);
