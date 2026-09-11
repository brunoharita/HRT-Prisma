import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CANONICAL_COORDINATE_SYSTEM,
  assertCanonicalDocument,
  canonicalPageToLayoutLines,
  preflightDocument,
  resolveDocumentIntelligenceMode,
  safeDocumentIntelligenceFailure,
  type NativePagePreflight,
} from "../web/src/domain/documentIntelligence.js";
import {
  PaddleDocumentIntelligenceProvider,
  PaddleProviderError,
  mapPaddleLayoutResponse,
} from "../web/src/infrastructure/paddleDocumentIntelligenceProvider.js";
import { buildPdfLayoutLines } from "../web/src/domain/personIngestion.js";

function nativePage(pageNumber: number, textSufficient = true): NativePagePreflight {
  return {
    pageNumber,
    text: textSufficient ? "A".repeat(100) : "",
    textSufficient,
    layoutLines: Array.from({ length: 10 }, (_, index) => ({
      text: `Linha ${index}`,
      x: 0.08,
      y: 0.05 + index * 0.04,
      width: 0.78,
      height: 0.02,
      fontSize: 11,
      emphasis: "regular" as const,
    })),
  };
}

test("preflight keeps a simple native PDF on the lowest-cost route", () => {
  assert.deepEqual(preflightDocument([nativePage(1), nativePage(2)]), {
    route: "native-fast",
    reasons: ["native_text_and_layout_sufficient"],
    insufficientPages: [],
    structurallyComplexPages: [],
  });
});

test("preflight routes image-only pages to vision and two columns to structure", () => {
  assert.equal(preflightDocument([nativePage(1, false)]).route, "vision");
  const complex = nativePage(1);
  complex.layoutLines = Array.from({ length: 8 }, (_, index) => ({
    text: `Coluna ${index}`,
    x: index % 2 === 0 ? 0.08 : 0.58,
    y: 0.1 + Math.floor(index / 2) * 0.05,
    width: 0.3,
    height: 0.02,
    fontSize: 11,
    emphasis: "regular" as const,
  }));
  assert.equal(preflightDocument([complex]).route, "structure");
});

test("PDF layout keeps distant same-row columns as separate lines", () => {
  const lines = buildPdfLayoutLines([
    { str: "Experiência", transform: [11, 0, 0, 11, 50, 750], width: 120, height: 12, fontName: "Regular" },
    { str: "Competências", transform: [11, 0, 0, 11, 360, 750], width: 120, height: 12, fontName: "Regular" },
  ], 600, 800);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.text, "Experiência");
  assert.equal(lines[1]?.text, "Competências");
});

test("unknown feature flag values fail closed to baseline", () => {
  assert.equal(resolveDocumentIntelligenceMode("enabled"), "enabled");
  assert.equal(resolveDocumentIntelligenceMode("shadow"), "shadow");
  assert.equal(resolveDocumentIntelligenceMode("unexpected"), "baseline");
  assert.equal(resolveDocumentIntelligenceMode(undefined), "baseline");
});

test("Paddle adapter maps provider data to provider-neutral normalized geometry", () => {
  const canonical = mapPaddleLayoutResponse({
    errorCode: 0,
    result: {
      layoutParsingResults: [{
        prunedResult: {
          page_index: 0,
          width: 1000,
          height: 2000,
          parsing_res_list: [
            { block_id: 8, block_order: 0, block_label: "doc_title", block_content: "ANA SILVA", block_bbox: [100, 100, 900, 220] },
            { block_id: 9, block_order: 1, block_label: "text", block_content: "Experiência profissional", block_bbox: [100, 300, 900, 700] },
          ],
          overall_ocr_res: {
            rec_texts: ["ANA SILVA", "Experiência profissional"],
            rec_scores: [0.99, 0.97],
            rec_polys: [
              [[100, 100], [900, 100], [900, 220], [100, 220]],
              [[100, 300], [900, 300], [900, 360], [100, 360]],
            ],
          },
        },
      }],
    },
  }, {
    route: "structure",
    providerVersion: "fixture-provider-1",
    model: "PP-StructureV3",
    modelVersion: "fixture-model-1",
    processedAt: "2026-09-10T12:00:00.000Z",
  });
  assert.equal(canonical.coordinateSystem, CANONICAL_COORDINATE_SYSTEM);
  assert.equal(canonical.pages[0]?.blocks[0]?.type, "doc_title");
  assert.deepEqual(canonical.pages[0]?.lines[0]?.region.polygon[0], { x: 0.1, y: 0.05 });
  const lines = canonicalPageToLayoutLines(canonical.pages[0]!);
  assert.equal(lines[0]?.text, "ANA SILVA");
  assert.equal(lines[0]?.emphasis, "strong");
  assert.equal(lines[0]?.blockId, "p1-b0008");
  assert.equal(lines[0]?.blockType, "doc_title");
  assert.equal(lines[1]?.blockReadingOrder, 1);
  assert.equal(lines[1]?.y, 0.15);
});

test("canonical validation rejects geometry outside normalized-page-v1", () => {
  assert.throws(() => assertCanonicalDocument({
    contractVersion: "1.0.0",
    coordinateSystem: CANONICAL_COORDINATE_SYSTEM,
    pages: [{
      pageNumber: 1,
      width: 100,
      height: 100,
      text: "texto",
      lines: [],
      blocks: [{
        id: "b1", type: "text", text: "texto", readingOrder: 0, score: null, lines: [],
        region: { coordinateSystem: CANONICAL_COORDINATE_SYSTEM, x: 0.9, y: 0, width: 0.2, height: 0.1, polygon: [] },
      }],
    }],
    provenance: {
      provider: "fixture", providerVersion: "1", model: "fixture", modelVersion: "1",
      route: "structure", processedAt: "2026-09-10T12:00:00.000Z",
    },
  }), /limites/);
});

test("provider calls only the configured self-hosted boundary with minimized output", async () => {
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};
  const fetchImplementation = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      result: {
        layoutParsingResults: [{
          prunedResult: {
            width: 100,
            height: 100,
            parsing_res_list: [{ block_id: 1, block_order: 0, block_label: "text", block_content: "Conteúdo suficiente para teste", block_bbox: [5, 5, 95, 20] }],
            overall_ocr_res: { rec_texts: ["Conteúdo suficiente para teste"], rec_scores: [0.9], rec_polys: [[[5, 5], [95, 5], [95, 20], [5, 20]]] },
          },
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const provider = new PaddleDocumentIntelligenceProvider({
    structureEndpoint: "http://127.0.0.1:8080/layout-parsing",
    fetchImplementation,
  });
  await provider.analyze({ bytes: new Uint8Array([1, 2, 3]), mimeType: "application/pdf", route: "vision" });
  assert.equal(requestedUrl, "http://127.0.0.1:8080/layout-parsing");
  assert.equal(requestedBody.visualize, false);
  assert.equal(requestedBody.returnMarkdownImages, false);
  assert.equal(requestedBody.useFormulaRecognition, false);
  assert.equal(requestedBody.useDocUnwarping, true);
});

test("Paddle failures expose only allowlisted operational metadata", async () => {
  const provider = new PaddleDocumentIntelligenceProvider({
    structureEndpoint: "http://127.0.0.1:8080/layout-parsing",
    fetchImplementation: (async () => new Response(JSON.stringify({ errorCode: 17, errorMsg: "sensitive provider detail" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch,
  });
  await assert.rejects(
    () => provider.analyze({ bytes: new Uint8Array([1]), mimeType: "application/pdf", route: "structure" }),
    (error) => {
      assert.ok(error instanceof PaddleProviderError);
      assert.deepEqual(safeDocumentIntelligenceFailure(error), {
        diagnosticCategory: "provider_invalid_response",
        reasonCode: "provider_error",
        httpStatus: 200,
        providerErrorCode: 17,
      });
      assert.doesNotMatch(JSON.stringify(safeDocumentIntelligenceFailure(error)), /sensitive provider detail/);
      return true;
    },
  );
  assert.equal(safeDocumentIntelligenceFailure({
    diagnosticCategory: "provider_invalid_response",
    reasonCode: "provider_error",
    providerErrorCode: "sensitive provider detail",
  }).providerErrorCode, null);
});

test("Paddle timeout is distinguishable from invalid response and unavailable provider", async () => {
  const provider = new PaddleDocumentIntelligenceProvider({
    timeoutMs: 5,
    fetchImplementation: ((_: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch,
  });
  await assert.rejects(
    () => provider.analyze({ bytes: new Uint8Array([1]), mimeType: "application/pdf", route: "structure" }),
    (error) => {
      assert.deepEqual(safeDocumentIntelligenceFailure(error), {
        diagnosticCategory: "provider_timeout",
        reasonCode: "request_timeout",
        httpStatus: null,
        providerErrorCode: null,
      });
      return true;
    },
  );
});

test("M5.6 cutover requires quality, superiority, less human work and no provider fallback", async () => {
  const script = await readFile("scripts/benchmark-m56.mjs", "utf8");
  assert.match(script, /manifest\.cases\.length < 8 \|\| manifest\.cases\.length > 12/);
  assert.match(script, /eligibleM56CorrectFieldRate >= 0\.9/);
  assert.match(script, /m56\.semantic\.correctFieldRate > consolidated\.baseline\.semantic\.correctFieldRate/);
  assert.match(script, /humanWorkImproved/);
  assert.match(script, /providerFallbacks === 0/);
  assert.match(script, /!criticalRegression/);
});
