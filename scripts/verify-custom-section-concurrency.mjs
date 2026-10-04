// Two connections to disposable LOCAL PostgreSQL; synthetic fixture, complete rollback.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const port = process.argv[2] ?? "55479";
const database = process.argv[3] ?? "import_evidence_v202_final";
if (!/^55[0-9]{3}$/.test(port) || !/^import_evidence_v202(?:_final)?$/.test(database)) throw Error("Disposable local QA target required");
const command = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
const args = ["-X", "-A", "-t", "-h", "127.0.0.1", "-p", port, "-U", "prisma_v202_qa", "-d", database, "-v", "ON_ERROR_STOP=1"];
const source = await readFile("tmp/import-evidence-v202-qa/verification.sql", "utf8");
assert.ok(source.includes("S202_PUBLICATION_QA_PASS_ROLLED_BACK"), "Generate the --publication scenario first");
const digest = createHash("md5").update("s202-fixture-org").digest("hex");
const org = `${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20)}`;
const probeSql = `select pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('prisma-custom-section-learning:${org}',0));`;
const probe = () => {
  const result = spawnSync(command, args, { input: probeSql, encoding: "utf8", windowsHide: true, timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const child = spawn(command, args, { windowsHide: true, timeout: 30_000 });
let output = "";
let errors = "";
let checked = false;
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
  if (!checked && output.includes("S202_LOCK_HELD")) {
    checked = true;
    assert.equal(probe(), "f", "Publication must hold the organization catalog lock until transaction end");
  }
});
child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
const completed = new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve() : reject(Error(errors)));
});
child.stdin.end(source.replace("reset role;", "select 'S202_LOCK_HELD';\nselect pg_sleep(3);\nreset role;"));
await completed;
assert.ok(checked && output.includes("S202_PUBLICATION_QA_PASS_ROLLED_BACK"));
assert.equal(probe(), "t", "Catalog lock must be released on rollback");
console.log("S202_CONCURRENT_CONNECTIONS_PASS_ROLLED_BACK: publication locks tenant catalog; second connection blocked; rollback releases lock");
