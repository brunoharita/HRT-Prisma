import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildKnowledgeSourceSql, buildKnowledgeSourceSqlBatches, prepareCboSource, prepareEscoSource } from "../src/knowledge/sourceIngestion.js";

test("CBO preparation preserves aliases, occupational hierarchy, encoding and provenance", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prisma-cbo-"));
  try {
    await Promise.all([
      writeFile(path.join(directory, "CBO2002 - Familia.csv"), Buffer.from("CODIGO;TITULO\r\n2521;Profissionais da administração\r\n", "latin1")),
      writeFile(path.join(directory, "CBO2002 - Ocupacao.csv"), Buffer.from("CODIGO;TITULO\r\n252105;Administrador\r\n", "latin1")),
      writeFile(path.join(directory, "CBO2002 - Sinonimo.csv"), Buffer.from("CODIGO;TITULO\r\n252105;Administrador de empresas\r\n252105;Gestor \"administrativo\"\r\n", "latin1")),
    ]);
    const prepared = await prepareCboSource({ directory, externalVersion: "CBO 2002-2025-06-06", releaseDate: "2025-06-06", downloadedAt: "2026-09-03T10:00:00Z" });
    const occupation = prepared.records.find((record) => record.externalId === "CBO:occupation:252105");
    assert.deepEqual(occupation?.aliases, ["Administrador de empresas", "Gestor \"administrativo\""]);
    assert.ok(prepared.records.some((record) => record.recordKind === "relation" && record.sourceExternalId === occupation?.externalId && record.targetExternalId === "CBO:family:2521"));
    assert.deepEqual(prepared.manifest.counts, { conceptRecords: 2, relationRecords: 1 });
    assert.ok(prepared.manifest.files.every((file) => file.sha256.length === 64 && file.encoding === "windows-1252"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("ESCO preparation joins translations by URI without treating translated labels as independent concepts", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prisma-esco-"));
  try {
    const uri = "http://data.europa.eu/esco/skill/example";
    await Promise.all([
      writeFile(path.join(directory, "skills_pt.csv"), `conceptUri,preferredLabel,altLabels,description\n${uri},Analisar dados,Análise de dados|Analytics,Competência analítica\n`, "utf8"),
      writeFile(path.join(directory, "skills_en.csv"), `conceptUri,preferredLabel,altLabels,description\n${uri},Analyse data,Data analysis,Analytical skill\n`, "utf8"),
    ]);
    const prepared = await prepareEscoSource({ directory, externalVersion: "v1.2.1", releaseDate: "2025-12-10", downloadedAt: "2026-09-03T10:00:00Z" });
    const concepts = prepared.records.filter((record) => record.recordKind === "concept" && record.externalId === uri);
    assert.equal(concepts.length, 2);
    assert.deepEqual(new Set(concepts.map((concept) => concept.language)), new Set(["pt-BR", "en"]));
    assert.equal(prepared.manifest.counts.conceptRecords, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("source SQL separates staging and diff from auditable human publication", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prisma-cbo-sql-"));
  try {
    await Promise.all([
      writeFile(path.join(directory, "familia.csv"), "CODIGO;TITULO\n2521;Administração\n", "latin1"),
      writeFile(path.join(directory, "ocupacao.csv"), "CODIGO;TITULO\n252105;Administrador\n", "latin1"),
      writeFile(path.join(directory, "sinonimo.csv"), "CODIGO;TITULO\n252105;Gestor\n", "latin1"),
    ]);
    const prepared = await prepareCboSource({ directory, externalVersion: "test", releaseDate: "2025-06-06", downloadedAt: "2026-09-03T10:00:00Z" });
    const sql = buildKnowledgeSourceSql(prepared, 2);
    assert.match(sql.stageSql, /stage_knowledge_source_batch/);
    assert.match(sql.stageSql, /diff_knowledge_source_version/);
    assert.doesNotMatch(sql.stageSql, /publish_knowledge_source_version/);
    assert.match(sql.publishSqlTemplate, /<SUPER_ADMIN_AUTH_USER_ID>/);
    assert.match(sql.publishSqlTemplate, /publish_knowledge_source_version/);
    const batched = buildKnowledgeSourceSqlBatches(prepared, 2);
    assert.equal(batched.stageBatchSql.length, 2);
    assert.ok(batched.stageBatchSql.every((batch) => /^begin;/i.test(batch) && /commit;$/i.test(batch)));
    assert.match(batched.finalizeAndDiffSql, /finalize_knowledge_source_stage/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("M5.2 migration is fail-closed, tenant-aware, versioned and has no silent backfill", async () => {
  const sql = await readFile("supabase/migrations/20260903094700_m52_knowledge_normalization.sql", "utf8");
  assert.match(sql, /create table public\.knowledge_source_stage_records/i);
  assert.match(sql, /alter table public\.knowledge_source_stage_records enable row level security/i);
  assert.match(sql, /knowledge_source_versions_current_idx/i);
  assert.match(sql, /term\.scope = 'organization'/i);
  assert.match(sql, /term\.scope = 'global'/i);
  assert.match(sql, /an active Super Admin must approve source publication/i);
  assert.match(sql, /for each row execute function private\.capture_profile_knowledge_observations/i);
  assert.doesNotMatch(sql, /insert into public\.knowledge_observations[\s\S]*select[\s\S]*from public\.professional_profiles[\s\S]*where/i);
  assert.doesNotMatch(sql, /create extension[^;]*(vector|pg_trgm)|embedding/i);
  assert.doesNotMatch(sql, /grant execute on function public\.publish_knowledge_source_version\([^;]+to authenticated/i);
  const fix = await readFile("supabase/migrations/20260903100340_m52_knowledge_stage_rpc_fix.sql", "utf8");
  assert.match(fix, /#variable_conflict error/i);
  assert.match(fix, /v_record_kind/i);
  assert.doesNotMatch(fix, /stage\.record_kind = record_kind/i);
  const stateFix = await readFile("supabase/migrations/20260903101644_m52_knowledge_observation_state_fix.sql", "utf8");
  assert.match(stateFix, /drop constraint if exists knowledge_observations_check/i);
  assert.match(stateFix, /resolution_state = 'resolved' and concept_id is not null/i);
  const publishFix = await readFile("supabase/migrations/20260903102721_m52_knowledge_publish_mapping_fix.sql", "utf8");
  assert.doesNotMatch(publishFix, /create temporary table/i);
  assert.match(publishFix, /join public\.knowledge_external_mappings source_mapping/i);
});
