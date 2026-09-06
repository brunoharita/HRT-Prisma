import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildKnowledgeSourceSql, buildKnowledgeSourceSqlBatches, prepareCboSource, prepareEscoSource, prepareOnetSource } from "../src/knowledge/sourceIngestion.js";

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
      writeFile(path.join(directory, "occupations_pt.csv"), "conceptUri,preferredLabel\nhttp://data.europa.eu/esco/occupation/example,Analista\n", "utf8"),
      writeFile(path.join(directory, "occupations_en.csv"), "conceptUri,preferredLabel\nhttp://data.europa.eu/esco/occupation/example,Analyst\n", "utf8"),
    ]);
    const prepared = await prepareEscoSource({ directory, externalVersion: "v1.2.1", releaseDate: "2025-12-10", downloadedAt: "2026-09-03T10:00:00Z" });
    const concepts = prepared.records.filter((record) => record.recordKind === "concept" && record.externalId === uri);
    assert.equal(concepts.length, 2);
    assert.deepEqual(new Set(concepts.map((concept) => concept.language)), new Set(["pt-BR", "en"]));
    assert.equal(prepared.manifest.counts.conceptRecords, 4);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("ESCO preserves essential and optional occupational relevance without converting it to proficiency", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prisma-esco-relations-"));
  try {
    const occupation = "http://data.europa.eu/esco/occupation/example";
    const skill = "http://data.europa.eu/esco/skill/example";
    await Promise.all([
      writeFile(path.join(directory, "occupations_en.csv"), `conceptUri,preferredLabel\n${occupation},Analyst\n`, "utf8"),
      writeFile(path.join(directory, "skills_en.csv"), `conceptUri,preferredLabel\n${skill},Analyse data\n`, "utf8"),
      writeFile(path.join(directory, "occupationSkillRelations_en.csv"), `occupationUri,skillUri,relationType\n${occupation},${skill},essential\n`, "utf8"),
    ]);
    const prepared = await prepareEscoSource({ directory, externalVersion: "v1.2.1", releaseDate: "2025-12-10", downloadedAt: "2026-09-06T10:00:00Z" });
    const relation = prepared.records.find((record) => record.recordKind === "relation" && record.sourceExternalId === occupation && record.targetExternalId === skill);
    assert.equal(relation?.relationType, "requires");
    assert.deepEqual(relation?.relationAttributes, { sourceRelationCode: "essential", relevance: "essential" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("O*NET preparation keeps Importance and Level as separate official measurements", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "prisma-onet-"));
  try {
    await Promise.all([
      writeFile(path.join(directory, "Occupation Data.txt"), "O*NET-SOC Code\tTitle\tDescription\n11-1011.00\tChief Executives\tLead organizations\n", "utf8"),
      writeFile(path.join(directory, "Content Model Reference.txt"), "Element ID\tElement Name\tDescription\tDomain Source\n2.A.1.a\tReading Comprehension\tUnderstand written sentences\tSkills\n2.C.1.a\tAdministration and Management\tKnowledge of management\tKnowledge\n", "utf8"),
      writeFile(path.join(directory, "Skills.txt"), "O*NET-SOC Code\tElement ID\tElement Name\tScale ID\tData Value\tStandard Error\tSuppress\n11-1011.00\t2.A.1.a\tReading Comprehension\tIM\t4.25\t0.10\tN\n11-1011.00\t2.A.1.a\tReading Comprehension\tLV\t5.50\t0.20\tN\n", "utf8"),
      writeFile(path.join(directory, "Knowledge.txt"), "O*NET-SOC Code\tElement ID\tElement Name\tScale ID\tData Value\tStandard Error\tSuppress\n11-1011.00\t2.C.1.a\tAdministration and Management\tIM\t4.60\t0.08\tN\n", "utf8"),
      writeFile(path.join(directory, "Technology Skills.txt"), "O*NET-SOC Code\tExample\tCommodity Code\tCommodity Title\n11-1011.00\tCustomer relationship management CRM software\t43232304\tCustomer relationship management software\n", "utf8"),
    ]);
    const prepared = await prepareOnetSource({ directory, externalVersion: "31.0", releaseDate: "2026-08-01", downloadedAt: "2026-09-06T10:00:00Z" });
    const skillRelation = prepared.records.find((record) => record.recordKind === "relation" && record.targetExternalId === "O*NET:element:2.A.1.a");
    assert.deepEqual(skillRelation?.relationAttributes, { sourceRelationCode: "skill", measurements: [
      { scaleId: "IM", rawValue: "4.25", sourceFile: "Skills.txt", sourceRow: 2, standardError: "0.10", suppress: "N" },
      { scaleId: "LV", rawValue: "5.50", sourceFile: "Skills.txt", sourceRow: 3, standardError: "0.20", suppress: "N" },
    ] });
    assert.ok(prepared.records.some((record) => record.externalId.startsWith("O*NET:technology:") && record.conceptType === "technology"));
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

test("M5.5 keeps official relation attributes separate and fixes the staging wrapper ambiguity", async () => {
  const migration = await readFile("supabase/migrations/20260906155011_knowledge_occupational_relations.sql", "utf8");
  const fix = await readFile("supabase/migrations/20260906160538_knowledge_occupational_stage_rpc_fix.sql", "utf8");
  assert.match(migration, /add column relation_attributes jsonb/i);
  assert.match(migration, /stage_knowledge_source_batch_v2/i);
  assert.match(migration, /publish_knowledge_source_version_v2/i);
  assert.match(migration, /revoke all on function public\.stage_knowledge_source_batch_v2/i);
  assert.match(fix, /stage\.source_version_id = v_result\.source_version_id/i);
  assert.doesNotMatch(fix, /where source_version_id = v_result\.source_version_id/i);
});
