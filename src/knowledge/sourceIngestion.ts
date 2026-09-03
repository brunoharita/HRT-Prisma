import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { parse } from "csv-parse";
import type { KnowledgeConceptType, KnowledgeRelationType } from "../domain/knowledge.js";

export const KNOWLEDGE_SOURCE_INGESTION_VERSION = "knowledge-source-ingestion-1.0.0";

export interface KnowledgeSourceStageRecord {
  recordKind: "concept" | "relation";
  externalId: string;
  externalUri: string | null;
  conceptType: KnowledgeConceptType | null;
  preferredLabel: string | null;
  description: string;
  language: string;
  aliases: string[];
  sourceStatus: "active" | "deprecated";
  sourceExternalId: string | null;
  targetExternalId: string | null;
  relationType: KnowledgeRelationType | null;
  sourceFile: string;
  sourceRow: number;
  contentHash: string;
}

export interface KnowledgeSourceFileManifest {
  name: string;
  bytes: number;
  sha256: string;
  encoding: "windows-1252" | "utf-8";
  records: number;
}

export interface KnowledgeSourcePackage {
  sourceName: "CBO" | "ESCO";
  externalVersion: string;
  officialUrl: string;
  manifest: {
    schemaVersion: "1.0.0";
    ingestionVersion: string;
    source: "CBO" | "ESCO";
    externalVersion: string;
    releaseDate: string;
    downloadedAt: string;
    format: "CSV";
    packageSha256: string;
    files: KnowledgeSourceFileManifest[];
    counts: { conceptRecords: number; relationRecords: number };
    excludedFiles: Array<{ name: string; reason: string }>;
  };
  records: KnowledgeSourceStageRecord[];
}

interface ParsedCsv {
  file: KnowledgeSourceFileManifest;
  rows: Array<Record<string, string>>;
}

export async function prepareCboSource(input: {
  directory: string;
  externalVersion: string;
  releaseDate: string;
  downloadedAt: string;
}): Promise<KnowledgeSourcePackage> {
  const occupationPath = await requireMatchingFile(input.directory, /ocupacao\.csv$/i);
  const synonymPath = await requireMatchingFile(input.directory, /sinonimo\.csv$/i);
  const familyPath = await requireMatchingFile(input.directory, /familia\.csv$/i);
  const [occupations, synonyms, families] = await Promise.all([
    parseCsvFile(occupationPath, "windows-1252", ";"),
    parseCsvFile(synonymPath, "windows-1252", ";"),
    parseCsvFile(familyPath, "windows-1252", ";"),
  ]);
  requireHeaders(occupations, ["codigo", "titulo"]);
  requireHeaders(synonyms, ["codigo", "titulo"]);
  requireHeaders(families, ["codigo", "titulo"]);

  const synonymsByCode = new Map<string, Set<string>>();
  for (const row of synonyms.rows) {
    const code = required(row, "codigo", synonyms.file.name);
    const title = required(row, "titulo", synonyms.file.name);
    const bucket = synonymsByCode.get(code) ?? new Set<string>();
    bucket.add(title);
    synonymsByCode.set(code, bucket);
  }

  const records: KnowledgeSourceStageRecord[] = [];
  for (const [index, row] of families.rows.entries()) {
    const code = required(row, "codigo", families.file.name);
    records.push(stageConcept({
      externalId: `CBO:family:${code}`,
      preferredLabel: required(row, "titulo", families.file.name),
      aliases: [], language: "pt-BR", conceptType: "occupation",
      sourceFile: families.file.name, sourceRow: index + 2,
    }));
  }
  for (const [index, row] of occupations.rows.entries()) {
    const code = required(row, "codigo", occupations.file.name);
    const occupationExternalId = `CBO:occupation:${code}`;
    records.push(stageConcept({
      externalId: occupationExternalId,
      preferredLabel: required(row, "titulo", occupations.file.name),
      aliases: [...(synonymsByCode.get(code) ?? [])], language: "pt-BR", conceptType: "occupation",
      sourceFile: occupations.file.name, sourceRow: index + 2,
    }));
    const familyCode = code.slice(0, 4);
    records.push(stageRelation({
      externalId: `CBO:relation:${code}:is_a:${familyCode}`,
      sourceExternalId: occupationExternalId,
      targetExternalId: `CBO:family:${familyCode}`,
      relationType: "is_a", sourceFile: occupations.file.name, sourceRow: index + 2,
    }));
  }
  return buildPackage("CBO", input, [occupations.file, synonyms.file, families.file], records, [
    { name: "CBO2002 - PerfilOcupacional.csv", reason: "Não é necessário para normalização lexical e adicionaria alto custo de ingestão neste movimento." },
  ]);
}

export async function prepareEscoSource(input: {
  directory: string;
  externalVersion: string;
  releaseDate: string;
  downloadedAt: string;
}): Promise<KnowledgeSourcePackage> {
  const files = await listFilesRecursive(input.directory);
  const skillFiles = files.filter((file) => /skills?_[a-z-]+\.csv$/i.test(path.basename(file)) || /skills?\.csv$/i.test(path.basename(file)));
  if (skillFiles.length === 0) throw new Error("esco_required_file_missing:skills_<language>.csv");
  const parsedSkills = await Promise.all(skillFiles.map((file) => parseCsvFile(file, "utf-8", ",")));
  const recordsByIdentity = new Map<string, KnowledgeSourceStageRecord>();
  for (const parsed of parsedSkills) {
    requireAnyHeader(parsed, ["concepturi", "concept_uri", "uri"]);
    requireAnyHeader(parsed, ["preferredlabel", "preferred_label", "label"]);
    const language = inferLanguage(parsed.file.name);
    for (const [index, row] of parsed.rows.entries()) {
      const uri = requiredAny(row, ["concepturi", "concept_uri", "uri"], parsed.file.name);
      const label = requiredAny(row, ["preferredlabel", "preferred_label", "label"], parsed.file.name);
      const aliases = splitEscoLabels(optionalAny(row, ["altlabels", "alt_labels", "alternativelabel"]));
      const conceptType = classifyEscoConcept(optionalAny(row, ["concepttype", "concept_type", "type"]), uri);
      const record = stageConcept({
        externalId: uri, externalUri: uri, preferredLabel: label,
        description: optionalAny(row, ["description", "definition", "scopenote"]),
        aliases, language, conceptType, sourceFile: parsed.file.name, sourceRow: index + 2,
      });
      recordsByIdentity.set(`${uri}|${language}`, record);
    }
  }

  const relationPaths = files.filter((file) => /broaderrelationskillpillar|skills?hierarchy|skills?skills?relations/i.test(path.basename(file)) && /\.csv$/i.test(file));
  const parsedRelations = await Promise.all(relationPaths.map((file) => parseCsvFile(file, "utf-8", ",")));
  const relations: KnowledgeSourceStageRecord[] = [];
  for (const parsed of parsedRelations) {
    for (const [index, row] of parsed.rows.entries()) {
      const source = optionalAny(row, ["concepturi", "concept_uri", "sourceuri", "source_uri", "skilluri"]);
      const target = optionalAny(row, ["broaderuri", "broader_uri", "targeturi", "target_uri", "relatedskilluri"]);
      if (!source || !target || source === target || !hasConcept(recordsByIdentity, source) || !hasConcept(recordsByIdentity, target)) continue;
      relations.push(stageRelation({
        externalId: `ESCO:relation:${sha256(`${source}|broader_than|${target}`)}`,
        sourceExternalId: source, targetExternalId: target, relationType: "is_a",
        sourceFile: parsed.file.name, sourceRow: index + 2,
      }));
    }
  }
  return buildPackage("ESCO", input, [...parsedSkills, ...parsedRelations].map((item) => item.file), [...recordsByIdentity.values(), ...relations], []);
}

export function buildKnowledgeSourceSql(packageData: KnowledgeSourcePackage, batchSize = 500): { stageSql: string; publishSqlTemplate: string } {
  const batched = buildKnowledgeSourceSqlBatches(packageData, batchSize);
  return { stageSql: [...batched.stageBatchSql, batched.finalizeAndDiffSql].join("\n"), publishSqlTemplate: batched.publishSqlTemplate };
}

export function buildKnowledgeSourceSqlBatches(packageData: KnowledgeSourcePackage, batchSize = 500): {
  stageBatchSql: string[]; finalizeAndDiffSql: string; publishSqlTemplate: string;
} {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2_000) throw new Error("invalid_batch_size");
  const source = sqlLiteral(packageData.sourceName);
  const version = sqlLiteral(packageData.externalVersion);
  const url = sqlLiteral(packageData.officialUrl);
  const manifest = sqlJson(packageData.manifest);
  const batches: string[] = [];
  for (let offset = 0; offset < packageData.records.length; offset += batchSize) {
    const batch = packageData.records.slice(offset, offset + batchSize);
    batches.push(["begin;", `select * from public.stage_knowledge_source_batch(${source}, ${version}, ${url}, ${manifest}, ${sqlJson(batch)}, ${offset === 0 ? "true" : "false"});`, "commit;"].join("\n"));
  }
  const versionSelector = `(select version.id from public.knowledge_source_versions version join public.knowledge_sources source on source.id = version.source_id where source.name = ${source} and version.external_version = ${version})`;
  return {
    stageBatchSql: batches,
    finalizeAndDiffSql: ["begin;", `select * from public.finalize_knowledge_source_stage(${versionSelector});`, `select * from public.diff_knowledge_source_version(${versionSelector});`, "commit;"].join("\n"),
    publishSqlTemplate: ["begin;", "-- Substitua o marcador pelo UUID de um Super Admin ativo que tomou a decisão de publicar.", `select * from public.publish_knowledge_source_version(${versionSelector}, '<SUPER_ADMIN_AUTH_USER_ID>'::uuid);`, "commit;"].join("\n"),
  };
}

async function parseCsvFile(filePath: string, encoding: "windows-1252" | "utf-8", delimiter: string): Promise<ParsedCsv> {
  const rows: Array<Record<string, string>> = [];
  const parser = createReadStream(filePath)
    .pipe(new DecodeTransform(encoding))
    .pipe(parse({ columns: (headers: string[]) => headers.map(normalizeHeader), delimiter, bom: true,
      relax_column_count: false, relax_quotes: true, skip_empty_lines: true, trim: true }));
  for await (const row of parser) rows.push(row as Record<string, string>);
  const metadata = await stat(filePath);
  const bytes = await readFile(filePath);
  return { file: { name: path.basename(filePath), bytes: metadata.size, sha256: sha256(bytes), encoding, records: rows.length }, rows };
}

class DecodeTransform extends Transform {
  readonly #decoder: TextDecoder;
  constructor(encoding: "windows-1252" | "utf-8") { super({ decodeStrings: true }); this.#decoder = new TextDecoder(encoding, { fatal: true }); }
  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: string) => void): void {
    try { callback(null, this.#decoder.decode(chunk, { stream: true })); } catch (error) { callback(error as Error); }
  }
  override _flush(callback: (error?: Error | null, data?: string) => void): void {
    try { callback(null, this.#decoder.decode()); } catch (error) { callback(error as Error); }
  }
}

function stageConcept(input: { externalId: string; externalUri?: string; preferredLabel: string; description?: string; conceptType: KnowledgeConceptType; language: string; aliases: string[]; sourceFile: string; sourceRow: number }): KnowledgeSourceStageRecord {
  return completeStageRecord({ recordKind: "concept", externalId: input.externalId, externalUri: input.externalUri ?? null,
    conceptType: input.conceptType, preferredLabel: input.preferredLabel, description: input.description ?? "", language: input.language,
    aliases: uniqueLabels(input.aliases, input.preferredLabel), sourceStatus: "active", sourceExternalId: null, targetExternalId: null,
    relationType: null, sourceFile: input.sourceFile, sourceRow: input.sourceRow });
}

function stageRelation(input: { externalId: string; sourceExternalId: string; targetExternalId: string; relationType: KnowledgeRelationType; sourceFile: string; sourceRow: number }): KnowledgeSourceStageRecord {
  return completeStageRecord({ recordKind: "relation", externalId: input.externalId, externalUri: null, conceptType: null,
    preferredLabel: null, description: "", language: "und", aliases: [], sourceStatus: "active",
    sourceExternalId: input.sourceExternalId, targetExternalId: input.targetExternalId, relationType: input.relationType,
    sourceFile: input.sourceFile, sourceRow: input.sourceRow });
}

function completeStageRecord(input: Omit<KnowledgeSourceStageRecord, "contentHash">): KnowledgeSourceStageRecord {
  return { ...input, contentHash: sha256(JSON.stringify(input)) };
}

function buildPackage(sourceName: "CBO" | "ESCO", input: { externalVersion: string; releaseDate: string; downloadedAt: string }, files: KnowledgeSourceFileManifest[], records: KnowledgeSourceStageRecord[], excludedFiles: Array<{ name: string; reason: string }>): KnowledgeSourcePackage {
  const officialUrl = sourceName === "CBO" ? "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads" : "https://esco.ec.europa.eu/en/use-esco/download";
  const conceptRecords = records.filter((record) => record.recordKind === "concept").length;
  const relationRecords = records.length - conceptRecords;
  const packageSha256 = sha256(files.map((file) => `${file.name}:${file.sha256}`).sort().join("\n"));
  return { sourceName, externalVersion: input.externalVersion, officialUrl, records,
    manifest: { schemaVersion: "1.0.0", ingestionVersion: KNOWLEDGE_SOURCE_INGESTION_VERSION, source: sourceName,
      externalVersion: input.externalVersion, releaseDate: input.releaseDate, downloadedAt: input.downloadedAt,
      format: "CSV", packageSha256, files, counts: { conceptRecords, relationRecords }, excludedFiles } };
}

async function requireMatchingFile(directory: string, pattern: RegExp): Promise<string> {
  const match = (await listFilesRecursive(directory)).find((file) => pattern.test(path.basename(file)));
  if (!match) throw new Error(`source_file_missing:${pattern.source}`);
  return match;
}

async function listFilesRecursive(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? listFilesRecursive(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat().sort();
}

function requireHeaders(parsed: ParsedCsv, headers: string[]): void { for (const header of headers) requireAnyHeader(parsed, [header]); }
function requireAnyHeader(parsed: ParsedCsv, candidates: string[]): void {
  const sample = parsed.rows[0];
  if (!sample || !candidates.some((candidate) => normalizeHeader(candidate) in sample)) throw new Error(`source_header_missing:${parsed.file.name}:${candidates[0]}`);
}
function required(row: Record<string, string>, header: string, file: string): string { return requiredAny(row, [header], file); }
function requiredAny(row: Record<string, string>, headers: string[], file: string): string {
  const value = optionalAny(row, headers); if (!value) throw new Error(`source_value_missing:${file}:${headers[0]}`); return value;
}
function optionalAny(row: Record<string, string>, headers: string[]): string { for (const header of headers) { const value = row[normalizeHeader(header)]; if (value?.trim()) return value.trim(); } return ""; }
function normalizeHeader(value: string): string { return value.replace(/^\uFEFF/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function inferLanguage(fileName: string): string { const match = fileName.match(/_([a-z]{2}(?:-[a-z]{2})?)\.csv$/i); return match?.[1]?.toLowerCase() === "pt" ? "pt-BR" : match?.[1]?.toLowerCase() ?? "en"; }
function classifyEscoConcept(rawType: string, uri: string): KnowledgeConceptType { const normalized = rawType.toLowerCase(); if (normalized.includes("occupation") || uri.includes("/occupation/")) return "occupation"; if (normalized.includes("knowledge")) return "knowledge"; return "skill"; }
function splitEscoLabels(value: string): string[] { return value ? value.split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean) : []; }
function uniqueLabels(values: string[], preferred: string): string[] { const seen = new Set<string>(); const preferredKey = preferred.toLocaleLowerCase(); return values.filter((value) => { const key = value.toLocaleLowerCase(); if (!value || key === preferredKey || seen.has(key)) return false; seen.add(key); return true; }); }
function hasConcept(records: ReadonlyMap<string, KnowledgeSourceStageRecord>, externalId: string): boolean { for (const key of records.keys()) if (key.startsWith(`${externalId}|`)) return true; return false; }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function sqlLiteral(value: string): string { return `'${value.replaceAll("'", "''")}'`; }
function sqlJson(value: unknown): string { return `${sqlLiteral(JSON.stringify(value))}::jsonb`; }
