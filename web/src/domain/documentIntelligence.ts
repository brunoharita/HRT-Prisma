import type { LayoutTextLine } from "./adaptiveResumeExtraction.js";

export const DOCUMENT_INTELLIGENCE_CONTRACT_VERSION = "1.0.0";
export const CANONICAL_DOCUMENT_VERSION = "1.0.0";
export const CANONICAL_COORDINATE_SYSTEM = "normalized-page-v1";

export type DocumentIntelligenceRoute = "native-fast" | "structure" | "vision" | "recovery";
export type DocumentIntelligenceMode = "baseline" | "shadow" | "enabled";
export type DocumentIntelligenceStage = "preflight" | "native" | "structure" | "vision" | "recovery" | "fallback";
export type DocumentIntelligenceDiagnosticCategory =
  | "document_ocr_failure"
  | "layout_reading_order_failure"
  | "structural_failure"
  | "semantic_failure"
  | "unknown_pattern"
  | "real_ambiguity"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_response"
  | "page_incomplete"
  | "content_insufficient"
  | "fallback_used"
  | "unsupported_input";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface CanonicalRegion {
  coordinateSystem: typeof CANONICAL_COORDINATE_SYSTEM;
  x: number;
  y: number;
  width: number;
  height: number;
  polygon: NormalizedPoint[];
}

export interface CanonicalLine {
  id: string;
  text: string;
  readingOrder: number;
  region: CanonicalRegion;
  score: number | null;
}

export interface CanonicalBlock {
  id: string;
  type: string;
  text: string;
  readingOrder: number;
  region: CanonicalRegion;
  score: number | null;
  lines: CanonicalLine[];
}

export interface CanonicalPage {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
  blocks: CanonicalBlock[];
  lines: CanonicalLine[];
}

export interface CanonicalDocumentProvenance {
  provider: string;
  providerVersion: string;
  model: string;
  modelVersion: string;
  route: Exclude<DocumentIntelligenceRoute, "native-fast">;
  processedAt: string;
}

export interface CanonicalDocument {
  contractVersion: typeof CANONICAL_DOCUMENT_VERSION;
  coordinateSystem: typeof CANONICAL_COORDINATE_SYSTEM;
  pages: CanonicalPage[];
  provenance: CanonicalDocumentProvenance;
}

export interface DocumentIntelligenceRequest {
  bytes: Uint8Array;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  route: "structure" | "vision" | "recovery";
  pageNumbers?: number[];
}

export interface DocumentIntelligenceProvider {
  readonly providerName: string;
  analyze(request: DocumentIntelligenceRequest): Promise<CanonicalDocument>;
}

export interface NativePagePreflight {
  pageNumber: number;
  text: string;
  layoutLines: LayoutTextLine[];
  textSufficient: boolean;
}

export interface DocumentPreflight {
  route: Exclude<DocumentIntelligenceRoute, "recovery">;
  reasons: string[];
  insufficientPages: number[];
  structurallyComplexPages: number[];
}

export interface DocumentIntelligenceMetric {
  stage: DocumentIntelligenceStage;
  route: DocumentIntelligenceRoute;
  durationMs: number;
  pageCount: number;
  outcome: "success" | "fallback" | "failure" | "skipped";
  diagnosticCategory: DocumentIntelligenceDiagnosticCategory | null;
}

export interface DocumentIntelligenceTrace {
  contractVersion: typeof DOCUMENT_INTELLIGENCE_CONTRACT_VERSION;
  mode: DocumentIntelligenceMode;
  selectedRoute: DocumentIntelligenceRoute;
  effectiveRoute: DocumentIntelligenceRoute;
  provider: string | null;
  providerVersion: string | null;
  model: string | null;
  modelVersion: string | null;
  fallbackUsed: boolean;
  diagnostics: DocumentIntelligenceDiagnosticCategory[];
  metrics: DocumentIntelligenceMetric[];
}

export function resolveDocumentIntelligenceMode(raw: string | undefined): DocumentIntelligenceMode {
  return raw === "shadow" || raw === "enabled" ? raw : "baseline";
}

export function preflightDocument(pages: NativePagePreflight[]): DocumentPreflight {
  const insufficientPages = pages.filter((page) => !page.textSufficient).map((page) => page.pageNumber);
  const structurallyComplexPages = pages.filter((page) => page.textSufficient && hasComplexLayout(page.layoutLines)).map((page) => page.pageNumber);
  if (insufficientPages.length > 0) {
    return {
      route: "vision",
      reasons: ["native_text_insufficient"],
      insufficientPages,
      structurallyComplexPages,
    };
  }
  if (structurallyComplexPages.length > 0) {
    return {
      route: "structure",
      reasons: ["multi_column_or_complex_layout"],
      insufficientPages,
      structurallyComplexPages,
    };
  }
  return { route: "native-fast", reasons: ["native_text_and_layout_sufficient"], insufficientPages, structurallyComplexPages };
}

export function canonicalPageToLayoutLines(page: CanonicalPage): LayoutTextLine[] {
  const source = page.lines.length > 0 ? page.lines : page.blocks.flatMap((block) => block.lines);
  return source
    .filter((line) => line.text.trim().length > 0)
    .sort((left, right) => left.readingOrder - right.readingOrder || left.region.y - right.region.y || left.region.x - right.region.x)
    .map((line) => {
      const block = containingBlock(page.blocks, line.id, line.region);
      return {
        text: line.text.replace(/\s+/g, " ").trim(),
        x: line.region.x,
        y: line.region.y,
        width: line.region.width,
        height: line.region.height,
        fontSize: Math.max(1, line.region.height * page.height),
        emphasis: isHeadingBlock(page.blocks, line.id) ? "strong" : "regular",
        blockId: block?.id ?? null,
        blockType: block?.type ?? null,
        blockReadingOrder: block?.readingOrder ?? line.readingOrder,
      };
    });
}

export function assertCanonicalDocument(value: CanonicalDocument): CanonicalDocument {
  if (value.contractVersion !== CANONICAL_DOCUMENT_VERSION || value.coordinateSystem !== CANONICAL_COORDINATE_SYSTEM) {
    throw new Error("CanonicalDocument incompatível com o contrato ativo.");
  }
  if (value.pages.length === 0) throw new Error("CanonicalDocument sem páginas.");
  const numbers = new Set<number>();
  for (const page of value.pages) {
    if (!Number.isInteger(page.pageNumber) || page.pageNumber < 1 || numbers.has(page.pageNumber)) {
      throw new Error("CanonicalDocument contém numeração de página inválida.");
    }
    numbers.add(page.pageNumber);
    if (!(page.width > 0) || !(page.height > 0)) throw new Error("CanonicalDocument contém dimensões de página inválidas.");
    for (const block of page.blocks) validateRegion(block.region);
    for (const line of page.lines) validateRegion(line.region);
  }
  return value;
}

export function diagnosticCategory(error: unknown): DocumentIntelligenceDiagnosticCategory {
  if (error instanceof DOMException && error.name === "AbortError") return "provider_timeout";
  if (error instanceof Error && /timeout|timed out|tempo limite/i.test(error.message)) return "provider_timeout";
  if (error instanceof Error && /canonical|response|resposta|schema|json/i.test(error.message)) return "provider_invalid_response";
  return "provider_unavailable";
}

function hasComplexLayout(lines: LayoutTextLine[]): boolean {
  if (lines.length < 8) return false;
  const left = lines.filter((line) => line.x < 0.44 && line.x + line.width < 0.62);
  const right = lines.filter((line) => line.x > 0.48);
  if (left.length < 3 || right.length < 3) return false;
  const overlappingRows = left.filter((leftLine) => right.some((rightLine) => Math.abs(leftLine.y - rightLine.y) <= Math.max(leftLine.height, rightLine.height, 0.02))).length;
  return overlappingRows >= 2;
}

function isHeadingBlock(blocks: CanonicalBlock[], lineId: string): boolean {
  return blocks.some((block) => block.lines.some((line) => line.id === lineId) && /title|heading|header|section/i.test(block.type));
}

function containingBlock(blocks: CanonicalBlock[], lineId: string, region: CanonicalRegion): CanonicalBlock | null {
  const explicit = blocks.find((block) => block.lines.some((line) => line.id === lineId));
  if (explicit) return explicit;
  const centerX = region.x + region.width / 2;
  const centerY = region.y + region.height / 2;
  return blocks
    .filter((block) => centerX >= block.region.x && centerX <= block.region.x + block.region.width
      && centerY >= block.region.y && centerY <= block.region.y + block.region.height)
    .sort((left, right) => (left.region.width * left.region.height) - (right.region.width * right.region.height))[0] ?? null;
}

function validateRegion(region: CanonicalRegion): void {
  const values = [region.x, region.y, region.width, region.height, ...region.polygon.flatMap((point) => [point.x, point.y])];
  if (region.coordinateSystem !== CANONICAL_COORDINATE_SYSTEM || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("CanonicalDocument contém coordenadas fora de normalized-page-v1.");
  }
  if (region.x + region.width > 1.000001 || region.y + region.height > 1.000001) {
    throw new Error("CanonicalDocument contém região fora dos limites da página.");
  }
}
