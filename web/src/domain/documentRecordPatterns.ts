export const GENERIC_RECORD_PATTERN_VERSION = "generic-record-pattern-v1";
export const GENERIC_RECORD_SIGNATURE_VERSION = "relative-record-signature-v1";

export interface RecordPatternLine {
  text: string;
  pageNumber: number;
  sequence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  emphasis: "regular" | "strong";
  blockId?: string | null;
  blockType?: string | null;
  blockReadingOrder?: number | null;
}

export interface RecordPatternRegion {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RelativeRecordSignature {
  spatial: boolean;
  headerEmphasis: RecordPatternLine["emphasis"];
  hasBullets: boolean;
  lineCountBand: number;
  relativeIndentBand: number;
  blockTypePattern: string;
  periodPlacement: "top" | "body" | "none";
}

export interface RelativePatternComparison {
  classification: "strong" | "possible" | "rejected";
  criteria: Array<"relative-topology" | "typography" | "period-structure" | "body-pattern" | "block-type" | "reading-order">;
  reason: "insufficient-geometry" | "different-structure" | null;
}

const DATE_RANGE = /\b(?:(?:0?[1-9]|1[0-2])[/. -](?:\d{2}|\d{4})|(?:19|20)\d{2}|(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|feb|apr|may|aug|sep|oct|dec)[a-zç]*)(?:(?:\s*(?:a|até|to|[-–])\s*)|\s+)(?:atual|presente|present|current|(?:(?:0?[1-9]|1[0-2])[/. -](?:\d{2}|\d{4})|(?:19|20)\d{2}|(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|feb|apr|may|aug|sep|oct|dec)[a-zç]*))/i;

export function removeRepeatedMarginNoise<T extends RecordPatternLine>(lines: T[]): T[] {
  const pages = new Set(lines.map((line) => line.pageNumber));
  if (pages.size < 2) return lines;
  const occurrences = new Map<string, Set<number>>();
  for (const line of lines) {
    if (!isMarginLine(line)) continue;
    const key = comparablePatternText(line.text);
    if (key.length < 3) continue;
    const pageSet = occurrences.get(key) ?? new Set<number>();
    pageSet.add(line.pageNumber);
    occurrences.set(key, pageSet);
  }
  const repeated = new Set([...occurrences].filter(([, pageSet]) => pageSet.size >= 2).map(([key]) => key));
  return lines.filter((line) => !isMarginLine(line) || !repeated.has(comparablePatternText(line.text)));
}

export function locateRecordAnchor<T extends RecordPatternLine>(
  lines: T[],
  fieldValues: Array<string | null | undefined>,
  regions: RecordPatternRegion[] = [],
  preferredLine?: (line: T) => boolean,
): number {
  const values = [...new Set(fieldValues.map(comparablePatternText).filter((value) => value.length >= 2))];
  const regionPages = new Set(regions.map((region) => region.pageNumber));
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  lines.forEach((line, index) => {
    if (regionPages.size > 0 && !regionPages.has(line.pageNumber)) return;
    const normalized = comparablePatternText(line.text);
    const semanticScore = values.reduce((score, value) => {
      if (normalized === value) return score + 40;
      if (normalized.includes(value) || value.includes(normalized)) return score + Math.min(32, Math.max(8, Math.min(value.length, normalized.length)));
      return score + sharedTokenScore(value, normalized);
    }, 0);
    const overlapsSelection = regions.some((region) => line.pageNumber === region.pageNumber && regionsOverlap(line, region));
    const nearSelection = regions.some((region) => line.pageNumber === region.pageNumber && verticalDistance(line, region) <= 0.14);
    // The region identifies the record while the preferred predicate identifies
    // its structural header. This keeps a selection made inside the body tied
    // to the correct header without jumping to another repeated block.
    const preferred = preferredLine?.(line) ? 120 : 0;
    const score = semanticScore + preferred + (overlapsSelection ? 80 : nearSelection ? 8 : 0) + (line.emphasis === "strong" ? 2 : 0);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestScore >= 12 ? bestIndex : -1;
}

export function buildRelativeRecordSignature(lines: RecordPatternLine[]): RelativeRecordSignature {
  const ordered = [...lines].sort(byReadingOrder);
  const first = ordered[0];
  const spatial = Boolean(first && first.fontSize > 0 && ordered.every((line) => Number.isFinite(line.x) && Number.isFinite(line.y)));
  const minX = spatial ? Math.min(...ordered.map((line) => line.x)) : 0;
  const width = spatial ? Math.max(0.001, Math.max(...ordered.map((line) => line.x + line.width)) - minX) : 1;
  const indents = ordered.map((line) => Math.max(0, (line.x - minX) / width));
  const periodIndex = ordered.findIndex((line) => DATE_RANGE.test(line.text));
  return {
    spatial,
    headerEmphasis: first?.emphasis ?? "regular",
    hasBullets: ordered.some((line) => isBullet(line.text)),
    lineCountBand: Math.min(8, Math.max(1, Math.ceil(ordered.length / 2))),
    relativeIndentBand: Math.round((indents.reduce((sum, value) => sum + value, 0) / Math.max(1, indents.length)) * 10) / 10,
    blockTypePattern: [...new Set(ordered.map((line) => normalizeBlockType(line.blockType)).filter(Boolean))].join("+") || "unknown",
    periodPlacement: periodIndex < 0 ? "none" : periodIndex <= Math.max(1, Math.floor(ordered.length * 0.34)) ? "top" : "body",
  };
}

export function compareRelativeRecordPattern(
  source: RelativeRecordSignature,
  candidateLines: RecordPatternLine[],
): RelativePatternComparison {
  const candidate = buildRelativeRecordSignature(candidateLines);
  if (!source.spatial || !candidate.spatial) {
    return { classification: "rejected", criteria: [], reason: "insufficient-geometry" };
  }
  const criteria: RelativePatternComparison["criteria"] = ["reading-order"];
  if (Math.abs(source.lineCountBand - candidate.lineCountBand) <= 1 && Math.abs(source.relativeIndentBand - candidate.relativeIndentBand) <= 0.25) criteria.push("relative-topology");
  if (source.headerEmphasis === candidate.headerEmphasis) criteria.push("typography");
  if (source.periodPlacement === candidate.periodPlacement) criteria.push("period-structure");
  if (source.hasBullets === candidate.hasBullets) criteria.push("body-pattern");
  if (source.blockTypePattern === "unknown" || candidate.blockTypePattern === "unknown" || source.blockTypePattern === candidate.blockTypePattern) criteria.push("block-type");
  if (criteria.length >= 6) return { classification: "strong", criteria, reason: null };
  if (criteria.length >= 4) return { classification: "possible", criteria, reason: null };
  return { classification: "rejected", criteria, reason: "different-structure" };
}

export function comparablePatternText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function normalizeBlockType(value: string | null | undefined): string {
  const normalized = comparablePatternText(value);
  if (/title|heading|header|section/.test(normalized)) return "heading";
  if (/list/.test(normalized)) return "list";
  if (/table/.test(normalized)) return "table";
  if (/footer/.test(normalized)) return "footer";
  if (/text|paragraph/.test(normalized)) return "text";
  return normalized;
}

function sharedTokenScore(left: string, right: string): number {
  const tokens = new Set(left.split(/\s+/).filter((token) => token.length >= 3));
  return [...tokens].filter((token) => right.includes(token)).reduce((score, token) => score + Math.min(8, token.length), 0);
}

function isMarginLine(line: RecordPatternLine): boolean {
  return line.y <= 0.09 || line.y + line.height >= 0.91;
}

function isBullet(value: string): boolean {
  return /^[•·▪◦*+\-]\s+/.test(value.trim());
}

function regionsOverlap(line: RecordPatternLine, region: RecordPatternRegion): boolean {
  return line.x < region.x + region.width && line.x + line.width > region.x
    && line.y < region.y + region.height && line.y + line.height > region.y;
}

function verticalDistance(line: RecordPatternLine, region: RecordPatternRegion): number {
  const lineCenter = line.y + line.height / 2;
  const regionCenter = region.y + region.height / 2;
  return Math.abs(lineCenter - regionCenter);
}

function byReadingOrder(left: RecordPatternLine, right: RecordPatternLine): number {
  return left.pageNumber - right.pageNumber
    || (left.blockReadingOrder ?? left.sequence) - (right.blockReadingOrder ?? right.sequence)
    || left.y - right.y
    || left.x - right.x;
}
