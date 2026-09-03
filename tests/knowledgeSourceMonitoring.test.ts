import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessDetectedRelease,
  cboArtifactsMatchManifest,
  parseCboReleasePage,
  parseEscoReleasePage,
  parseOnetReleaseArchive,
  parseOnetReleasePage,
} from "../src/knowledge/sourceMonitoring.js";

test("official source pages produce stable CBO, ESCO and O*NET release identities", () => {
  assert.deepEqual(
    parseCboReleasePage("<main><p>Atualizado em 06/06/2025 14h20</p></main>"),
    { externalVersion: "CBO 2002-2025-06-06", releaseDate: "2025-06-06" },
  );
  assert.deepEqual(
    parseEscoReleasePage("<div>Current version: ESCO v1.2.1 (Last update 10/12/2025)</div>"),
    { externalVersion: "v1.2.1", releaseDate: "2025-12-10" },
  );
  assert.deepEqual(
    parseOnetReleasePage("<title>O*NET 31.0 Database</title><p>Production database updated August 2026.</p>"),
    { externalVersion: "31.0", releaseDate: "2026-08-01" },
  );
  assert.equal(parseOnetReleaseArchive("<h2>O*NET 31.0 August 2026</h2>", "31.0"), "2026-08-01");
});

test("monitor distinguishes published, catalogued and newly detected releases", () => {
  assert.equal(assessDetectedRelease({ detectedVersion: "31.0", publishedVersion: "31.0", knownVersions: ["31.0"] }), "current");
  assert.equal(assessDetectedRelease({ detectedVersion: "31.0", publishedVersion: null, knownVersions: ["31.0"] }), "action_required");
  assert.equal(assessDetectedRelease({ detectedVersion: "31.1", publishedVersion: "31.0", knownVersions: ["31.0"] }), "update_available");
});

test("CBO content comparison survives official and local file-name differences", () => {
  const hashes = { family: "a".repeat(64), occupation: "b".repeat(64), synonym: "c".repeat(64) };
  assert.equal(cboArtifactsMatchManifest(hashes, {
    files: [
      { name: "CBO2002 - Família.csv", sha256: hashes.family },
      { name: "CBO2002 - Ocupação.csv", sha256: hashes.occupation },
      { name: "CBO2002 - Sinônimo.csv", sha256: hashes.synonym },
    ],
  }), true);
});

test("monitoring migration is fail-closed, retry-aware and cannot publish knowledge", async () => {
  const sql = await readFile("supabase/migrations/20260903161003_knowledge_source_monitoring.sql", "utf8");
  assert.match(sql, /create table public\.knowledge_source_checks/i);
  assert.match(sql, /alter table public\.knowledge_source_checks enable row level security/i);
  assert.match(sql, /private\.is_super_admin/i);
  assert.match(sql, /revoke all on table public\.knowledge_source_checks from public, anon, authenticated/i);
  assert.match(sql, /authorize_knowledge_source_monitor/i);
  assert.match(sql, /vault\.decrypted_secrets/i);
  assert.match(sql, /when 1 then p_completed_at \+ interval '6 hours'/i);
  assert.match(sql, /when 2 then p_completed_at \+ interval '24 hours'/i);
  assert.match(sql, /when 3 then p_completed_at \+ interval '72 hours'/i);
  assert.match(sql, /America\/Sao_Paulo/i);
  assert.match(sql, /cron\.schedule/i);
  assert.doesNotMatch(sql, /insert\s+into\s+cron\.job/i);
  assert.doesNotMatch(sql, /publish_knowledge_source_version/i);
  assert.doesNotMatch(sql, /grant execute[^;]+to authenticated/i);
});

test("Edge monitor requires its private invocation secret and uses fixed official sources", async () => {
  const source = await readFile("supabase/functions/knowledge-source-monitor/index.ts", "utf8");
  const migration = await readFile("supabase/migrations/20260903161003_knowledge_source_monitoring.sql", "utf8");
  const config = await readFile("supabase/config.toml", "utf8");
  assert.match(source, /x-prisma-monitor-secret/i);
  assert.match(source, /authorize_knowledge_source_monitor/i);
  assert.match(source, /gov\.br\/trabalho-e-emprego/i);
  assert.match(migration, /esco\.ec\.europa\.eu/i);
  assert.match(migration, /onetcenter\.org/i);
  assert.doesNotMatch(source, /publish_knowledge_source_version/i);
  assert.match(config, /\[functions\.knowledge-source-monitor\]\s+verify_jwt = false/i);
});

test("Home exposes version, release date and latest check through the repository boundary", async () => {
  const page = await readFile("web/src/pages/HomePage.tsx", "utf8");
  const repository = await readFile("web/src/infrastructure/supabase/prismaRepository.ts", "utf8");
  assert.match(page, /Bases de conhecimento/);
  assert.match(page, /Data da versão/);
  assert.match(page, /Última checagem/);
  assert.doesNotMatch(page, /\.from\(/);
  assert.match(repository, /\.from\("knowledge_sources"\)/);
  assert.match(repository, /\.from\("knowledge_source_versions"\)/);
});
