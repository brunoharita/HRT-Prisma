export const KNOWLEDGE_SOURCE_MONITOR_VERSION = "knowledge-source-monitor-1.0.1";

export type KnowledgeSourceMonitorStatus =
  | "current"
  | "update_available"
  | "action_required"
  | "temporary_failure"
  | "validation_failed";

export interface DetectedSourceRelease {
  externalVersion: string;
  releaseDate: string | null;
}

export function parseCboReleasePage(html: string): DetectedSourceRelease {
  const text = htmlToText(html);
  const date = requireDateMatch(text, /Atualizado\s+em\s+(\d{2})\/(\d{2})\/(\d{4})/iu, "CBO_RELEASE_DATE_NOT_FOUND");
  return { externalVersion: `CBO 2002-${date}`, releaseDate: date };
}

export function parseEscoReleasePage(html: string): DetectedSourceRelease {
  const text = htmlToText(html);
  const version = text.match(/Current\s+version\s*:\s*ESCO\s+v?([0-9]+(?:\.[0-9]+)+)/iu)?.[1]
    ?? text.match(/ESCO\s+v([0-9]+(?:\.[0-9]+)+)/iu)?.[1];
  if (!version) throw new DetectionError("ESCO_VERSION_NOT_FOUND");
  const dateMatch = text.match(/Last\s+update\s*:?[\s(]*(\d{2})\/(\d{2})\/(\d{4})/iu);
  return { externalVersion: `v${version}`, releaseDate: dateMatch ? toIsoDate(dateMatch) : null };
}

export function parseOnetReleasePage(html: string): DetectedSourceRelease {
  const text = htmlToText(html);
  const version = text.match(/O\*NET(?:®)?\s+([0-9]+(?:\.[0-9]+)+)\s+Database/iu)?.[1];
  if (!version) throw new DetectionError("ONET_VERSION_NOT_FOUND");
  const monthMatch = text.match(/(?:Production\s+database[^.]{0,120}|O\*NET[^.]{0,120})\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/iu);
  return { externalVersion: version, releaseDate: monthMatch ? toIsoMonth(monthMatch[1]!, monthMatch[2]!) : null };
}

export function parseOnetReleaseArchive(html: string, externalVersion: string): string {
  const text = htmlToText(html);
  const escapedVersion = externalVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`O\\*NET(?:®)?\\s+${escapedVersion}\\s+(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(20\\d{2})`, "iu"));
  if (!match?.[1] || !match[2]) throw new DetectionError("ONET_RELEASE_DATE_NOT_FOUND");
  return toIsoMonth(match[1], match[2]);
}

export function assessDetectedRelease(input: {
  detectedVersion: string;
  publishedVersion: string | null;
  knownVersions: string[];
}): KnowledgeSourceMonitorStatus {
  const detected = normalizeVersion(input.detectedVersion);
  const published = input.publishedVersion ? normalizeVersion(input.publishedVersion) : null;
  if (published === detected) return "current";
  if (input.knownVersions.some((version) => normalizeVersion(version) === detected)) return "action_required";
  return "update_available";
}

export function semanticCboFileName(fileName: string): "family" | "occupation" | "synonym" | null {
  const normalized = fileName.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (normalized.includes("familia")) return "family";
  if (normalized.includes("ocupacao")) return "occupation";
  if (normalized.includes("sinonimo")) return "synonym";
  return null;
}

export function cboArtifactsMatchManifest(
  artifacts: Record<string, string>,
  manifest: unknown,
): boolean {
  if (!isRecord(manifest) || !Array.isArray(manifest.files)) return false;
  const known = new Map<string, string>();
  for (const file of manifest.files) {
    if (!isRecord(file) || typeof file.name !== "string" || typeof file.sha256 !== "string") continue;
    const semanticName = semanticCboFileName(file.name);
    if (semanticName) known.set(semanticName, file.sha256.toLowerCase());
  }
  return (["family", "occupation", "synonym"] as const)
    .every((name) => known.get(name) === artifacts[name]?.toLowerCase());
}

export class DetectionError extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "DetectionError";
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&reg;|&#174;/giu, "®")
    .replace(/&amp;/giu, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function requireDateMatch(text: string, pattern: RegExp, code: string): string {
  const match = text.match(pattern);
  if (!match) throw new DetectionError(code);
  return toIsoDate(match);
}

function toIsoDate(match: RegExpMatchArray): string {
  const [, day, month, year] = match;
  if (!day || !month || !year) throw new DetectionError("INVALID_RELEASE_DATE");
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new DetectionError("INVALID_RELEASE_DATE");
  return iso;
}

function toIsoMonth(month: string, year: string): string {
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const index = months.indexOf(month.toLowerCase());
  if (index < 0) throw new DetectionError("INVALID_RELEASE_MONTH");
  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

function normalizeVersion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
