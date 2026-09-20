#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ioldpnqqvobprjiontre";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventorySql = `select json_build_object(
  'objects', count(*),
  'bytes', coalesce(sum(nullif(metadata->>'size', '')::bigint), 0),
  'buckets', (select count(*) from storage.buckets),
  'bucketFingerprint', (select md5(coalesce(string_agg(id, chr(30) order by id), '')) from storage.buckets),
  'fingerprint', md5(coalesce(string_agg(
    bucket_id || chr(31) || name || chr(31) || coalesce(id::text, '') || chr(31) ||
    coalesce(updated_at::text, '') || chr(31) || coalesce(metadata->>'size', ''),
    chr(30) order by bucket_id, name), ''))
)::text from storage.objects`;

function fail(message) {
  throw new Error(message);
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function pgTool(name) {
  const configured = process.env.PRISMA_BACKUP_PG_BIN;
  if (configured) return path.join(configured, process.platform === "win32" ? `${name}.exe` : name);
  if (process.platform === "win32") return path.join("C:\\Program Files\\PostgreSQL\\17\\bin", `${name}.exe`);
  return name;
}

async function command(executable, args, { capture = false } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || "20" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      if (capture) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", () => reject(new Error(`Não foi possível iniciar ${path.basename(executable)}.`)));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(executable)} falhou (código ${code}). ${stderr.replace(/password[^\r\n]*/gi, "password [oculto]").slice(0, 400)}`));
    });
  });
}

function pgArgs() {
  const { PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD, PGPASSFILE } = process.env;
  if (!PGHOST || !PGUSER || !PGDATABASE || !(PGPASSWORD || PGPASSFILE)) {
    fail("Configure PGHOST, PGUSER, PGDATABASE e PGPASSWORD ou PGPASSFILE no ambiente local.");
  }
  if (!PGHOST.includes(PROJECT_REF) && !PGUSER.includes(PROJECT_REF)) {
    fail("A conexão PostgreSQL não identifica o projeto Supabase esperado.");
  }
  if (PGDATABASE !== "postgres") fail("PGDATABASE deve ser postgres para o projeto Prisma.");
  const port = PGPORT || "5432";
  if (port !== "5432") fail("Use a conexão direta ou o session pooler na porta 5432.");
  return ["--host", PGHOST, "--port", port, "--username", PGUSER, "--dbname", PGDATABASE];
}

async function dbInventory(connection) {
  const output = await command(pgTool("psql"), ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...connection, "--command", `set role postgres; ${inventorySql}`], { capture: true });
  try {
    const jsonLine = output.trim().split(/\r?\n/).reverse().find((line) => line.trim().startsWith("{"));
    const parsed = JSON.parse(jsonLine || "");
    if (!Number.isSafeInteger(parsed.objects) || !Number.isSafeInteger(parsed.bytes) || !Number.isSafeInteger(parsed.buckets) || !/^[a-f0-9]{32}$/.test(parsed.fingerprint) || !/^[a-f0-9]{32}$/.test(parsed.bucketFingerprint)) fail("Inventário PostgreSQL inválido.");
    return parsed;
  } catch {
    fail("O PostgreSQL não retornou um inventário Storage válido.");
  }
}

async function validateDestination(destination) {
  if (!destination || !path.isAbsolute(destination)) fail("Informe uma pasta absoluta, privada e fora do repositório.");
  const resolved = await realpath(destination).catch(() => fail("A pasta de destino precisa existir antes do backup."));
  const repository = await realpath(repoRoot);
  const temporary = await realpath(os.tmpdir());
  if (inside(repository, resolved) || inside(temporary, resolved)) fail("O destino não pode ficar no repositório nem na pasta temporária.");
  if (!(await stat(resolved)).isDirectory()) fail("O destino não é uma pasta.");
  return resolved;
}

async function listObjects(storage, bucket, prefix = "") {
  const objects = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) fail(`Falha ao listar o bucket ${bucket}.`);
    for (const entry of data || []) {
      if (!entry.name || entry.name === "." || entry.name === ".." || entry.name.includes("/") || entry.name.includes("\\")) fail("Nome inválido no inventário de Storage.");
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) objects.push({ bucket, key, expectedBytes: Number(entry.metadata?.size) });
      else objects.push(...await listObjects(storage, bucket, key));
    }
    if ((data || []).length < 1000) break;
  }
  return objects;
}

async function verify(backupDir) {
  const root = await realpath(backupDir);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  if (manifest.version !== 1 || manifest.projectRef !== PROJECT_REF || !Array.isArray(manifest.objects)) fail("Manifesto de backup inválido.");
  const files = [{ file: "database.dump", sha256: manifest.database.sha256, bytes: manifest.database.bytes }, ...manifest.objects];
  for (const item of files) {
    const file = path.resolve(root, item.file);
    const resolved = await realpath(file).catch(() => fail("Arquivo de backup ausente."));
    if (!inside(root, resolved) || !(await stat(resolved)).isFile()) fail("Arquivo de backup ausente ou fora da pasta.");
    if ((await stat(resolved)).size !== item.bytes || (await hashFile(resolved)) !== item.sha256) fail(`Checksum inválido: ${item.file}`);
  }
  const archive = path.join(root, "database.dump");
  const toc = await command(pgTool("pg_restore"), ["--list", archive], { capture: true });
  for (const schema of ["public", "auth", "storage"]) {
    if (!toc.includes(`TABLE DATA ${schema} `)) fail(`O dump não contém dados do schema ${schema}.`);
  }
  await command(pgTool("pg_restore"), ["--file", process.platform === "win32" ? "NUL" : "/dev/null", archive]);
  if (manifest.objects.length !== manifest.inventoryAfter.objects) fail("Contagem de objetos divergente no manifesto.");
  console.log(JSON.stringify({ status: "integrity-verified", restoreTest: "pending", projectRef: PROJECT_REF, objects: manifest.objects.length, backupDir: root }));
}

async function backup(destination) {
  const root = await validateDestination(destination);
  const storageKey = process.env.PRISMA_BACKUP_STORAGE_KEY;
  if (!storageKey) fail("Configure PRISMA_BACKUP_STORAGE_KEY em ambiente privado; nunca em VITE_*, arquivo versionado ou argumento de comando.");
  const connection = pgArgs();
  const before = await dbInventory(connection);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const incomplete = path.join(root, `.incomplete-prisma-${timestamp}-${process.pid}`);
  const completed = path.join(root, `prisma-${timestamp}`);
  await mkdir(incomplete, { mode: 0o700 });
  await mkdir(path.join(incomplete, "storage"), { mode: 0o700 });
  try {
    const databaseFile = path.join(incomplete, "database.dump");
    await command(pgTool("pg_dump"), ["--format=custom", "--blobs", "--serializable-deferrable", "--role", "postgres", ...connection, "--file", databaseFile]);
    await command(pgTool("pg_restore"), ["--list", databaseFile]);

    const client = createClient(PROJECT_URL, storageKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: buckets, error: bucketError } = await client.storage.listBuckets();
    if (bucketError) fail("Falha ao listar buckets privados. Verifique a credencial de Storage.");
    if ((buckets || []).length !== before.buckets) fail("A listagem de buckets diverge do inventário do banco.");
    const listed = [];
    for (const bucket of buckets || []) listed.push(...await listObjects(client.storage, bucket.id));
    const unique = new Set(listed.map(({ bucket, key }) => `${bucket}\0${key}`));
    if (unique.size !== listed.length || listed.length !== before.objects) fail("A listagem de Storage diverge do inventário do banco.");

    const objects = [];
    for (let index = 0; index < listed.length; index++) {
      const { bucket, key, expectedBytes } = listed[index];
      const { data, error } = await client.storage.from(bucket).download(key);
      if (error || !data) fail(`Falha no download de um objeto do bucket ${bucket}.`);
      const relative = `storage/${String(index + 1).padStart(8, "0")}.bin`;
      const file = path.join(incomplete, relative);
      await pipeline(Readable.fromWeb(data.stream()), createWriteStream(file, { mode: 0o600 }));
      const bytes = (await stat(file)).size;
      if (Number.isSafeInteger(expectedBytes) && bytes !== expectedBytes) fail(`Tamanho divergente em um objeto do bucket ${bucket}.`);
      objects.push({ bucket, key, file: relative, bytes, sha256: await hashFile(file) });
    }
    const after = await dbInventory(connection);
    const totalBytes = objects.reduce((sum, object) => sum + object.bytes, 0);
    if (before.fingerprint !== after.fingerprint || before.bucketFingerprint !== after.bucketFingerprint || before.objects !== after.objects || before.bytes !== after.bytes || before.buckets !== after.buckets || after.objects !== objects.length || after.bytes !== totalBytes) {
      fail("Storage mudou durante o backup ou a cópia não corresponde ao inventário PostgreSQL. Repita em janela sem importações.");
    }
    const manifest = {
      version: 1,
      projectRef: PROJECT_REF,
      startedAt: timestamp,
      completedAt: new Date().toISOString(),
      database: { file: "database.dump", bytes: (await stat(databaseFile)).size, sha256: await hashFile(databaseFile) },
      inventoryBefore: before,
      inventoryAfter: after,
      objects,
      verification: "archive-stream-readable-and-file-checksums; isolated-restore-pending",
    };
    await writeFile(path.join(incomplete, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
    await verify(incomplete);
    await rename(incomplete, completed);
    console.log(JSON.stringify({ status: "copy-completed", restoreTest: "pending", projectRef: PROJECT_REF, objects: objects.length, databaseBytes: manifest.database.bytes, storageBytes: totalBytes, backupDir: completed }));
  } catch (error) {
    console.error(`Backup incompleto em ${incomplete}. Nenhuma exclusão está liberada.`);
    throw error;
  }
}

async function main() {
  const [action, value, extra] = process.argv.slice(2);
  if (extra || !["backup", "verify"].includes(action) || !value) {
    fail("Uso: node scripts/backup-prisma-production.mjs backup <pasta-de-destino> | verify <pasta-do-backup>");
  }
  if (action === "backup") await backup(value);
  else await verify(value);
}

main().catch((error) => {
  const secrets = [process.env.PRISMA_BACKUP_STORAGE_KEY, process.env.PGPASSWORD].filter(Boolean);
  let message = error.message;
  for (const secret of secrets) message = message.replaceAll(secret, "[oculto]");
  console.error(message);
  process.exitCode = 1;
});
