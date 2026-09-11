import {
  CANONICAL_COORDINATE_SYSTEM,
  CANONICAL_DOCUMENT_VERSION,
  assertCanonicalDocument,
  type CanonicalBlock,
  type CanonicalDocument,
  type CanonicalLine,
  type CanonicalRegion,
  type DocumentIntelligenceProvider,
  type DocumentIntelligenceRequest,
  type DocumentIntelligenceDiagnosticCategory,
  type DocumentIntelligenceProviderDescriptor,
} from "../domain/documentIntelligence.js";

export const PADDLE_PROVIDER_VERSION = "paddleocr-3.7.0/prisma-adapter-1.1.0";
export const PADDLE_STRUCTURE_MODEL_VERSION = "PP-StructureV3/PP-OCRv6";
export const PADDLE_VISION_MODEL_VERSION = "PaddleOCR-VL-1.6";

interface PaddleProviderOptions {
  structureEndpoint: string;
  recoveryEndpoint: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
}

const DEFAULT_OPTIONS: PaddleProviderOptions = {
  structureEndpoint: "/document-intelligence/layout-parsing",
  recoveryEndpoint: "/document-intelligence-vl/layout-parsing",
  timeoutMs: 240_000,
};

export class PaddleProviderError extends Error {
  constructor(
    message: string,
    readonly diagnosticCategory: DocumentIntelligenceDiagnosticCategory,
    readonly reasonCode: string,
    readonly httpStatus: number | null = null,
    readonly providerErrorCode: number | string | null = null,
  ) {
    super(message);
    this.name = "PaddleProviderError";
  }
}

export class PaddleDocumentIntelligenceProvider implements DocumentIntelligenceProvider {
  readonly providerName = "paddleocr-self-hosted";
  private readonly options: PaddleProviderOptions;

  constructor(options: Partial<PaddleProviderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  describe(route: DocumentIntelligenceRequest["route"]): DocumentIntelligenceProviderDescriptor {
    const recovery = route === "recovery";
    return {
      provider: this.providerName,
      providerVersion: PADDLE_PROVIDER_VERSION,
      model: recovery ? "PaddleOCR-VL" : "PP-StructureV3",
      modelVersion: recovery ? PADDLE_VISION_MODEL_VERSION : PADDLE_STRUCTURE_MODEL_VERSION,
    };
  }

  async analyze(request: DocumentIntelligenceRequest): Promise<CanonicalDocument> {
    const isRecovery = request.route === "recovery";
    const endpoint = isRecovery ? this.options.recoveryEndpoint : this.options.structureEndpoint;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await (this.options.fetchImplementation ?? fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          file: bytesToBase64(request.bytes),
          fileType: request.mimeType === "application/pdf" ? 0 : 1,
          useDocOrientationClassify: request.route !== "structure",
          useDocUnwarping: request.route !== "structure",
          useTextlineOrientation: request.route !== "structure",
          useTableRecognition: true,
          useFormulaRecognition: false,
          useChartRecognition: false,
          returnMarkdownImages: false,
          visualize: false,
        }),
      });
      if (!response.ok) {
        throw new PaddleProviderError(
          "Paddle provider returned a non-success HTTP status.",
          response.status >= 500 || response.status === 429 ? "provider_unavailable" : "provider_invalid_response",
          `http_${response.status}`,
          response.status,
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new PaddleProviderError("Paddle provider returned invalid JSON.", "provider_invalid_response", "invalid_json", response.status);
      }
      const root = record(payload);
      const providerErrorCode = finiteNumber(root?.errorCode);
      if (providerErrorCode !== null && providerErrorCode !== 0) {
        throw new PaddleProviderError("Paddle provider rejected the document.", "provider_invalid_response", "provider_error", response.status, providerErrorCode);
      }
      const descriptor = this.describe(request.route);
      const canonical = mapPaddleLayoutResponse(payload, {
        route: request.route,
        providerVersion: descriptor.providerVersion,
        model: descriptor.model,
        modelVersion: descriptor.modelVersion,
      });
      const requestedPage = request.pageNumbers?.length === 1 ? request.pageNumbers[0] : undefined;
      return requestedPage === undefined ? canonical : {
        ...canonical,
        pages: canonical.pages.map((page) => ({ ...page, pageNumber: requestedPage })),
      };
    } catch (error) {
      if (error instanceof PaddleProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PaddleProviderError("Paddle provider exceeded the configured timeout.", "provider_timeout", "request_timeout");
      }
      if (error instanceof Error && /Paddle response|CanonicalDocument/.test(error.message)) {
        throw new PaddleProviderError("Paddle provider response did not satisfy the canonical contract.", "provider_invalid_response", canonicalFailureReason(error.message));
      }
      throw new PaddleProviderError("Paddle provider could not be reached.", "provider_unavailable", "network_failure");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function canonicalFailureReason(message: string): string {
  if (/layoutParsingResults/.test(message)) return "missing_layout_results";
  if (/prunedResult/.test(message)) return "missing_pruned_result";
  if (/page dimensions/.test(message)) return "invalid_page_dimensions";
  if (/sem páginas/.test(message)) return "empty_canonical_document";
  if (/coordenadas|região|limites/.test(message)) return "invalid_geometry";
  return "canonical_contract_failure";
}

export function mapPaddleLayoutResponse(
  payload: unknown,
  provenance: {
    route: DocumentIntelligenceRequest["route"];
    providerVersion: string;
    model: string;
    modelVersion: string;
    processedAt?: string;
  },
): CanonicalDocument {
  const root = record(payload);
  const result = record(root?.result);
  const rawPages = Array.isArray(result?.layoutParsingResults) ? result.layoutParsingResults : null;
  if (!rawPages?.length) throw new Error("Paddle response does not contain layoutParsingResults.");
  const pages = rawPages.map((rawPage, pageIndex) => mapPage(rawPage, pageIndex + 1));
  return assertCanonicalDocument({
    contractVersion: CANONICAL_DOCUMENT_VERSION,
    coordinateSystem: CANONICAL_COORDINATE_SYSTEM,
    pages,
    provenance: {
      provider: "paddleocr-self-hosted",
      providerVersion: provenance.providerVersion,
      model: provenance.model,
      modelVersion: provenance.modelVersion,
      route: provenance.route,
      processedAt: provenance.processedAt ?? new Date().toISOString(),
    },
  });
}

function mapPage(raw: unknown, fallbackPageNumber: number) {
  const wrapper = record(raw);
  const value = record(wrapper?.prunedResult);
  if (!value) throw new Error("Paddle response contains a page without prunedResult.");
  const width = positiveNumber(value.width);
  const height = positiveNumber(value.height);
  if (!width || !height) throw new Error("Paddle response does not contain valid page dimensions.");
  const pageIndex = finiteNumber(value.page_index);
  const pageNumber = pageIndex === null ? fallbackPageNumber : Math.max(1, Math.trunc(pageIndex) + 1);
  const rawParsingBlocks = Array.isArray(value.parsing_res_list) ? value.parsing_res_list : [];
  const blocks: CanonicalBlock[] = rawParsingBlocks.flatMap((item, index) => {
    const block = record(item);
    const region = regionFromBox(block?.block_bbox, width, height);
    if (!block || !region) return [];
    const text = stringValue(block.block_content).trim();
    const readingOrder = finiteNumber(block.block_order) ?? index;
    const id = `p${pageNumber}-b${String(finiteNumber(block.block_id) ?? index).padStart(4, "0")}`;
    return [{
      id,
      type: stringValue(block.block_label) || "unknown",
      text,
      readingOrder,
      region,
      score: scoreValue(block.score),
      lines: [],
    }];
  });
  const ocr = record(value.overall_ocr_res);
  const texts = Array.isArray(ocr?.rec_texts) ? ocr.rec_texts : [];
  const scores = Array.isArray(ocr?.rec_scores) ? ocr.rec_scores : [];
  const polygons = Array.isArray(ocr?.rec_polys) ? ocr.rec_polys : Array.isArray(ocr?.dt_polys) ? ocr.dt_polys : [];
  const lines: CanonicalLine[] = texts.flatMap((rawText, index) => {
    const text = stringValue(rawText).replace(/\s+/g, " ").trim();
    const region = regionFromPolygon(polygons[index], width, height);
    if (!text || !region) return [];
    return [{ id: `p${pageNumber}-l${String(index).padStart(4, "0")}`, text, readingOrder: index, region, score: scoreValue(scores[index]) }];
  });
  for (const block of blocks) {
    block.lines = lines.filter((line) => centerInside(line.region, block.region));
    if (block.lines.length === 0 && block.text) {
      block.lines = [{ id: `${block.id}-content`, text: block.text, readingOrder: block.readingOrder, region: block.region, score: block.score }];
    }
  }
  const orderedLines = lines.length > 0
    ? orderLinesByBlocks(lines, blocks)
    : blocks.flatMap((block) => block.lines).sort((left, right) => left.readingOrder - right.readingOrder);
  const text = blocks.length > 0
    ? blocks.sort((left, right) => left.readingOrder - right.readingOrder).map((block) => block.text).filter(Boolean).join("\n")
    : orderedLines.map((line) => line.text).join("\n");
  return { pageNumber, width, height, text, blocks, lines: orderedLines };
}

function orderLinesByBlocks(lines: CanonicalLine[], blocks: CanonicalBlock[]): CanonicalLine[] {
  return [...lines].sort((left, right) => {
    const leftOrder = blocks.find((block) => centerInside(left.region, block.region))?.readingOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = blocks.find((block) => centerInside(right.region, block.region))?.readingOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.region.y - right.region.y || left.region.x - right.region.x;
  }).map((line, index) => ({ ...line, readingOrder: index }));
}

function regionFromBox(value: unknown, width: number, height: number): CanonicalRegion | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const numbers = value.slice(0, 4).map(finiteNumber);
  if (numbers.some((item) => item === null)) return null;
  const [x0, y0, x1, y1] = numbers as [number, number, number, number];
  return normalizedRegion([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], width, height);
}

function regionFromPolygon(value: unknown, width: number, height: number): CanonicalRegion | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const points = value.flatMap((rawPoint) => {
    if (!Array.isArray(rawPoint) || rawPoint.length < 2) return [];
    const x = finiteNumber(rawPoint[0]);
    const y = finiteNumber(rawPoint[1]);
    return x === null || y === null ? [] : [[x, y] as [number, number]];
  });
  return points.length < 4 ? null : normalizedRegion(points, width, height);
}

function normalizedRegion(points: Array<[number, number]>, width: number, height: number): CanonicalRegion {
  const polygon = points.map(([x, y]) => ({ x: normalized(x / width), y: normalized(y / height) }));
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    coordinateSystem: CANONICAL_COORDINATE_SYSTEM,
    x,
    y,
    width: normalized(Math.max(...xs) - x),
    height: normalized(Math.max(...ys) - y),
    polygon,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function centerInside(inner: CanonicalRegion, outer: CanonicalRegion): boolean {
  const x = inner.x + inner.width / 2;
  const y = inner.y + inner.height / 2;
  return x >= outer.x && x <= outer.x + outer.width && y >= outer.y && y <= outer.y + outer.height;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveNumber(value: unknown): number | null {
  const result = finiteNumber(value);
  return result !== null && result > 0 ? result : null;
}

function scoreValue(value: unknown): number | null {
  const result = finiteNumber(value);
  return result === null ? null : Math.min(1, Math.max(0, result));
}

function normalized(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1_000_000) / 1_000_000;
}
