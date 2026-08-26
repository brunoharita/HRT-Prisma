import { createHash } from "node:crypto";
import type { KnowledgeConceptType } from "../domain/knowledge.js";

export interface KnowledgeSnapshotFile {
  name: string;
  content: string;
  checksumSha256: string;
}

export interface KnowledgeSnapshotPackage {
  externalVersion: string;
  releaseDate: string | null;
  retrievedAt: string;
  files: KnowledgeSnapshotFile[];
}

export interface StagedExternalConcept {
  externalId: string;
  externalUri: string | null;
  canonicalLabel: string;
  description: string;
  conceptType: KnowledgeConceptType;
  language: string;
  aliases: string[];
  provenance: { source: "CBO" | "ESCO" | "O*NET"; externalVersion: string; sourceFile: string };
}

export interface KnowledgeSourceAdapter {
  readonly sourceName: "CBO" | "ESCO" | "O*NET";
  validate(snapshot: KnowledgeSnapshotPackage): void;
  stage(snapshot: KnowledgeSnapshotPackage): StagedExternalConcept[];
}

export class CboKnowledgeSourceAdapter implements KnowledgeSourceAdapter {
  readonly sourceName = "CBO" as const;
  validate(snapshot: KnowledgeSnapshotPackage) { validateSnapshot(snapshot, ["ocup"]); }
  stage(snapshot: KnowledgeSnapshotPackage): StagedExternalConcept[] {
    this.validate(snapshot);
    const file = findFile(snapshot, "ocup");
    return parseDelimited(file.content).map((row) => ({
      externalId: required(row, ["codigo", "cod_cbo", "cbo"]), externalUri: null,
      canonicalLabel: required(row, ["titulo", "titulo_ocupacao", "ocupacao"]),
      description: optional(row, ["descricao", "descricao_sumaria"]), conceptType: "occupation" as const,
      language: "pt-BR", aliases: splitAliases(optional(row, ["sinonimos", "sinonimo"])),
      provenance: { source: this.sourceName, externalVersion: snapshot.externalVersion, sourceFile: file.name },
    }));
  }
}

export class EscoKnowledgeSourceAdapter implements KnowledgeSourceAdapter {
  readonly sourceName = "ESCO" as const;
  validate(snapshot: KnowledgeSnapshotPackage) { validateSnapshot(snapshot, ["esco"]); }
  stage(snapshot: KnowledgeSnapshotPackage): StagedExternalConcept[] {
    this.validate(snapshot);
    const file = findFile(snapshot, "esco");
    return parseDelimited(file.content).map((row) => {
      const uri = required(row, ["concepturi", "concept_uri", "uri"]);
      const rawType = optional(row, ["concepttype", "concept_type", "type"]).toLowerCase();
      return {
        externalId: uri, externalUri: uri,
        canonicalLabel: required(row, ["preferredlabel", "preferred_label", "label"]),
        description: optional(row, ["description", "definition"]),
        conceptType: rawType.includes("occupation") ? "occupation" as const : "skill" as const,
        language: optional(row, ["language", "lang"]) || "en",
        aliases: splitAliases(optional(row, ["altlabels", "alt_labels", "alternativelabel"])),
        provenance: { source: this.sourceName, externalVersion: snapshot.externalVersion, sourceFile: file.name },
      };
    });
  }
}

export class OnetKnowledgeSourceAdapter implements KnowledgeSourceAdapter {
  readonly sourceName = "O*NET" as const;
  validate(snapshot: KnowledgeSnapshotPackage) { validateSnapshot(snapshot, ["occupation"]); }
  stage(snapshot: KnowledgeSnapshotPackage): StagedExternalConcept[] {
    this.validate(snapshot);
    const file = findFile(snapshot, "occupation");
    return parseDelimited(file.content).map((row) => ({
      externalId: required(row, ["onetsoccode", "onet_soc_code", "code"]), externalUri: null,
      canonicalLabel: required(row, ["title", "occupation"]), description: optional(row, ["description"]),
      conceptType: "occupation" as const, language: "en", aliases: [],
      provenance: { source: this.sourceName, externalVersion: snapshot.externalVersion, sourceFile: file.name },
    }));
  }
}

export function checksumSnapshotContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function validateSnapshot(snapshot: KnowledgeSnapshotPackage, requiredFileFragments: string[]) {
  if (!snapshot.externalVersion.trim() || !snapshot.retrievedAt || snapshot.files.length === 0) throw new Error("invalid_snapshot_metadata");
  for (const file of snapshot.files) {
    if (!file.name.trim() || !file.content.trim() || checksumSnapshotContent(file.content) !== file.checksumSha256) throw new Error("snapshot_checksum_mismatch");
  }
  for (const fragment of requiredFileFragments) findFile(snapshot, fragment);
}
function findFile(snapshot: KnowledgeSnapshotPackage, fragment: string) {
  const file = snapshot.files.find((candidate) => candidate.name.toLowerCase().includes(fragment));
  if (!file) throw new Error(`snapshot_file_missing:${fragment}`);
  return file;
}
function parseDelimited(content: string): Array<Record<string, string>> {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("snapshot_has_no_records");
  const delimiter = lines[0]!.split(";").length > lines[0]!.split(",").length ? ";" : ",";
  const headers = parseLine(lines[0]!, delimiter).map(normalizeHeader);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseLine(line, delimiter)[index]?.trim() ?? ""])));
}
function parseLine(line: string, delimiter: string): string[] {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value); return values;
}
function normalizeHeader(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function required(row: Record<string, string>, candidates: string[]) { const value = optional(row, candidates); if (!value) throw new Error(`snapshot_required_field_missing:${candidates[0]}`); return value; }
function optional(row: Record<string, string>, candidates: string[]) { for (const candidate of candidates) { const value = row[normalizeHeader(candidate)]; if (value) return value.trim(); } return ""; }
function splitAliases(value: string) { return value ? [...new Set(value.split(/[|;]/).map((alias) => alias.trim()).filter(Boolean))] : []; }
