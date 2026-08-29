import { useEffect, useMemo, useRef, useState } from "react";
import {
  AimOutlined,
  DownloadOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Alert, Button, InputNumber, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import {
  areSiblingReviewFields,
  fieldPathMatches,
  intersectPixelRects,
  normalizePointerRegion,
  normalizedRegionStyle,
  PDFJS_CHARACTER_REGION_METHOD,
  pixelRectsOverlap,
  textContainedByPixelRegion,
  type NormalizedPageRegion,
  type PixelRect,
  type PositionedTextUnit,
  type RegionExtractionMethod,
  type ReviewEvidenceLink,
  type SpatialEvidenceRegion,
} from "../../domain/spatialEvidence";

export interface EvidenceNavigationTarget {
  pageNumber: number;
  regionId: string | null;
  linkId: string | null;
  nonce: number;
}

export interface RegionSelectionResult {
  pageNumber: number;
  region: NormalizedPageRegion;
  rawSelectedText: string | null;
  selectedText: string | null;
  extractionMethod: RegionExtractionMethod;
  ocrState: "not_needed" | "completed" | "failed";
  selectionRect: PixelRect | null;
  textUnits: PositionedTextUnit[];
  refinementCandidates: RegionRefinementCandidate[];
}

export interface RegionRefinementCandidate {
  linkId: string;
  regionId: string;
  fieldPath: string;
  linkKind: ReviewEvidenceLink["linkKind"];
  source: SpatialEvidenceRegion["source"];
  overlapText: string | null;
  defaultExcluded: boolean;
  pixelRegion: PixelRect;
}

interface DocumentEvidenceViewerProps {
  pdfUrl: string | null;
  fileName: string;
  pageCount: number;
  regions: SpatialEvidenceRegion[];
  links: ReviewEvidenceLink[];
  selectedFieldPath: string;
  activeLinkId: string | null;
  selectionMode: boolean;
  refinementExcludedLinkIds?: string[];
  navigationTarget: EvidenceNavigationTarget | null;
  onSelectionCancel: () => void;
  onSelectionComplete: (selection: RegionSelectionResult) => void;
  onEvidenceClick: (fieldPath: string, linkId: string) => void;
}

interface DragState {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export function DocumentEvidenceViewer({
  pdfUrl,
  fileName,
  pageCount,
  regions,
  links,
  selectedFieldPath,
  activeLinkId,
  selectionMode,
  refinementExcludedLinkIds = [],
  navigationTarget,
  onSelectionCancel,
  onSelectionComplete,
  onEvidenceClick,
}: DocumentEvidenceViewerProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [loading, setLoading] = useState(Boolean(pdfUrl));
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionStatus, setSelectionStatus] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingRegion, setPendingRegion] = useState<NormalizedPageRegion | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const renderVersionRef = useRef(0);
  const ocrVersionRef = useRef(0);

  useEffect(() => {
    let current = true;
    let loaded: PDFDocumentProxy | null = null;
    if (!pdfUrl) {
      setLoading(false);
      setPdfDocument(null);
      return () => undefined;
    }
    setLoading(true);
    setError(null);
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      loaded = await pdfjs.getDocument({ url: pdfUrl }).promise;
      if (!current) {
        await loaded.destroy();
        return;
      }
      setPdfDocument(loaded);
      setCurrentPage((page) => Math.min(Math.max(page, 1), loaded?.numPages ?? 1));
    }).catch((caught: unknown) => {
      if (current) setError(caught instanceof Error ? caught.message : "O PDF não pôde ser carregado.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
      if (loaded) void loaded.destroy();
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !pageRef.current || !textLayerRef.current) return;
    const renderVersion = ++renderVersionRef.current;
    let page: PDFPageProxy | null = null;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;
    let textLayer: { cancel: () => void } | null = null;
    setRendering(true);
    setError(null);
    setPendingRegion(null);
    setDrag(null);
    void pdfDocument.getPage(currentPage).then(async (loadedPage) => {
      page = loadedPage;
      const viewport = loadedPage.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const pageElement = pageRef.current;
      const textElement = textLayerRef.current;
      if (!canvas || !pageElement || !textElement || renderVersion !== renderVersionRef.current) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      pageElement.style.width = `${viewport.width}px`;
      pageElement.style.height = `${viewport.height}px`;
      textElement.replaceChildren();
      textElement.style.width = `${viewport.width}px`;
      textElement.style.height = `${viewport.height}px`;
      textElement.style.setProperty("--scale-factor", String(viewport.scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("O navegador não conseguiu preparar a página do PDF.");
      renderTask = loadedPage.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
      const pdfjs = await import("pdfjs-dist");
      const textContent = await loadedPage.getTextContent();
      const layer = new pdfjs.TextLayer({ textContentSource: textContent, container: textElement, viewport });
      textLayer = layer;
      await layer.render();
    }).catch((caught: unknown) => {
      if (renderVersion !== renderVersionRef.current) return;
      if (caught instanceof Error && /cancel/i.test(caught.name)) return;
      setError(caught instanceof Error ? caught.message : "A página do PDF não pôde ser renderizada.");
    }).finally(() => {
      if (renderVersion === renderVersionRef.current) setRendering(false);
    });
    return () => {
      renderVersionRef.current += 1;
      renderTask?.cancel();
      textLayer?.cancel();
      page?.cleanup();
    };
  }, [currentPage, loading, pdfDocument, zoom]);

  useEffect(() => {
    if (!navigationTarget) return;
    setCurrentPage(navigationTarget.pageNumber);
  }, [navigationTarget]);

  useEffect(() => {
    if (!navigationTarget?.regionId || rendering) return;
    const timer = window.setTimeout(() => {
      pageRef.current?.querySelector<HTMLElement>(`[data-region-id="${navigationTarget.regionId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [navigationTarget, rendering]);

  useEffect(() => {
    if (!selectionMode) {
      setDrag(null);
      setPendingRegion(null);
      setSelectionStatus(null);
      ocrVersionRef.current += 1;
      setOcrBusy(false);
    }
  }, [selectionMode]);

  const pageLinks = useMemo(() => links.flatMap((link) => {
    if (link.state !== "active" || !link.spatialRegionId) return [];
    const region = regions.find((item) => item.id === link.spatialRegionId && item.pageNumber === currentPage);
    return region ? [{ link, region }] : [];
  }), [currentPage, links, regions]);

  const totalPages = pdfDocument?.numPages ?? pageCount;

  function pointerPoint(event: React.PointerEvent<HTMLDivElement>) {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!selectionMode || ocrBusy || event.button !== 0) return;
    const point = pointerPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPendingRegion(null);
    setSelectionStatus("Arraste até o fim da evidência.");
    setDrag({ start: point, end: point });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || !selectionMode) return;
    const point = pointerPoint(event);
    if (point) setDrag({ ...drag, end: point });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || !selectionMode || !pageRef.current) return;
    const point = pointerPoint(event) ?? drag.end;
    const region = normalizePointerRegion(drag.start, point, pageRef.current.clientWidth, pageRef.current.clientHeight);
    setDrag(null);
    if (!region) {
      setSelectionStatus("A seleção ficou pequena demais. Desenhe uma região maior.");
      return;
    }
    setPendingRegion(region);
    void finishSelection(region);
  }

  async function finishSelection(region: NormalizedPageRegion) {
    const version = ++ocrVersionRef.current;
    const nativeSelection = nativeTextSelection(region);
    if (nativeSelection?.rawSelectedText) {
      setSelectionStatus("Texto da região recuperado pela camada nativa do PDF.");
      onSelectionComplete({
        pageNumber: currentPage,
        region,
        ...nativeSelection,
        extractionMethod: PDFJS_CHARACTER_REGION_METHOD,
        ocrState: "not_needed",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    setOcrBusy(true);
    setSelectionStatus("Executando OCR local somente na região selecionada...");
    try {
      const crop = document.createElement("canvas");
      crop.width = Math.max(1, Math.round(region.width * canvas.width));
      crop.height = Math.max(1, Math.round(region.height * canvas.height));
      const context = crop.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Não foi possível preparar a região para OCR.");
      context.drawImage(
        canvas,
        Math.round(region.x * canvas.width),
        Math.round(region.y * canvas.height),
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["por", "eng"]);
      try {
        const result = await worker.recognize(crop, {}, { text: true, blocks: true });
        if (version !== ocrVersionRef.current) return;
        const recognized = result.data.text.replace(/\s+/g, " ").trim();
        const ocrSelection = recognized
          ? selectionFromUnits(
            region,
            positionedOcrTextUnits(result.data.blocks, region, crop.width, crop.height),
            recognized,
          )
          : emptyTextSelection();
        setSelectionStatus(recognized ? "OCR local concluído. Revise a sugestão antes de aplicar." : "O OCR não reconheceu texto; a região permanece disponível como evidência.");
        onSelectionComplete({
          pageNumber: currentPage,
          region,
          ...ocrSelection,
          extractionMethod: recognized ? "tesseract-region-v1" : "manual-region-v1",
          ocrState: recognized ? "completed" : "failed",
        });
      } finally {
        await worker.terminate();
      }
    } catch {
      if (version !== ocrVersionRef.current) return;
      setSelectionStatus("O OCR local falhou. A região pode ser vinculada, mas uma correção exigirá texto e justificativa manual.");
      onSelectionComplete({ pageNumber: currentPage, region, ...emptyTextSelection(), extractionMethod: "manual-region-v1", ocrState: "failed" });
    } finally {
      if (version === ocrVersionRef.current) setOcrBusy(false);
    }
  }

  function nativeTextSelection(region: NormalizedPageRegion) {
    const pageRect = pageRef.current?.getBoundingClientRect();
    const layer = textLayerRef.current;
    if (!pageRect || !layer) return null;
    const selectionRect = normalizedToPixelRect(region, pageRect);
    const units = positionedTextUnits(layer, selectionRect);
    return selectionFromUnits(region, units, textContainedByPixelRegion(units, selectionRect));
  }

  function selectionFromUnits(region: NormalizedPageRegion, units: PositionedTextUnit[], rawText: string | null) {
    const pageRect = pageRef.current?.getBoundingClientRect();
    if (!pageRect || !rawText) return emptyTextSelection();
    const selectionRect = normalizedToPixelRect(region, pageRect);
    if (!units.length) {
      return { rawSelectedText: rawText, selectedText: rawText, selectionRect, textUnits: [], refinementCandidates: [] };
    }
    const refinementCandidates = pageLinks.flatMap(({ link, region: mappedRegion }) => {
      if (!areSiblingReviewFields(link.fieldPath, selectedFieldPath)) return [];
      const pixelRegion = normalizedToPixelRect(mappedRegion, pageRect);
      const overlap = intersectPixelRects(selectionRect, pixelRegion);
      if (!overlap) return [];
      const overlapText = textContainedByPixelRegion(units, overlap);
      if (!overlapText) return [];
      return [{
        linkId: link.id,
        regionId: mappedRegion.id,
        fieldPath: link.fieldPath,
        linkKind: link.linkKind,
        source: mappedRegion.source,
        overlapText,
        defaultExcluded: mappedRegion.source === "human",
        pixelRegion,
      } satisfies RegionRefinementCandidate];
    });
    const defaultExclusions = refinementCandidates.filter((candidate) => candidate.defaultExcluded).map((candidate) => candidate.pixelRegion);
    return {
      rawSelectedText: rawText,
      selectedText: textContainedByPixelRegion(units, selectionRect, defaultExclusions),
      selectionRect,
      textUnits: units,
      refinementCandidates,
    };
  }

  function positionedOcrTextUnits(
    blocks: OcrBlock[] | null,
    region: NormalizedPageRegion,
    cropWidth: number,
    cropHeight: number,
  ): PositionedTextUnit[] {
    const pageRect = pageRef.current?.getBoundingClientRect();
    if (!pageRect || !blocks?.length || cropWidth <= 0 || cropHeight <= 0) return [];
    const cropRect = normalizedToPixelRect(region, pageRect);
    const scaleX = (cropRect.right - cropRect.left) / cropWidth;
    const scaleY = (cropRect.bottom - cropRect.top) / cropHeight;
    const units: PositionedTextUnit[] = [];
    let sourceIndex = 0;
    blocks.forEach((block) => block.paragraphs.forEach((paragraph) => paragraph.lines.forEach((line) => {
      let sourceOffset = 0;
      line.words.forEach((word, wordIndex) => {
        word.symbols.forEach((symbol) => {
          Array.from(symbol.text).forEach((character) => {
            units.push({
              text: character,
              sourceIndex,
              sourceOffset,
              rect: {
                left: cropRect.left + symbol.bbox.x0 * scaleX,
                top: cropRect.top + symbol.bbox.y0 * scaleY,
                right: cropRect.left + symbol.bbox.x1 * scaleX,
                bottom: cropRect.top + symbol.bbox.y1 * scaleY,
              },
            });
            sourceOffset += character.length;
          });
        });
        const lastSymbol = word.symbols.at(-1);
        const nextSymbol = line.words[wordIndex + 1]?.symbols[0];
        if (lastSymbol && nextSymbol) {
          const centerX = cropRect.left + ((lastSymbol.bbox.x1 + nextSymbol.bbox.x0) / 2) * scaleX;
          units.push({
            text: " ",
            sourceIndex,
            sourceOffset,
            rect: {
              left: centerX - 0.5,
              top: cropRect.top + Math.min(lastSymbol.bbox.y0, nextSymbol.bbox.y0) * scaleY,
              right: centerX + 0.5,
              bottom: cropRect.top + Math.max(lastSymbol.bbox.y1, nextSymbol.bbox.y1) * scaleY,
            },
          });
          sourceOffset += 1;
        }
      });
      sourceIndex += 1;
    })));
    return units;
  }

  function fitWidth() {
    const scrollWidth = scrollRef.current?.clientWidth;
    const pageWidth = pageRef.current?.clientWidth;
    if (!scrollWidth || !pageWidth) return;
    setZoom((value) => Math.min(2.5, Math.max(0.5, value * ((scrollWidth - 36) / pageWidth))));
  }

  if (!pdfUrl) {
    return <div className="prisma-document-viewer-empty"><Alert title="O documento original não está disponível para visualização." description="A revisão continua acessível, mas nenhuma coordenada espacial será criada sem o PDF e sua versão." showIcon type="warning" /></div>;
  }

  return (
    <section aria-label="Currículo original" className="prisma-document-viewer">
      <div className="prisma-pdf-toolbar">
        <Space size={4} wrap>
          <Typography.Text strong>Página</Typography.Text>
          <InputNumber aria-label="Página atual" disabled={ocrBusy} min={1} max={Math.max(totalPages, 1)} precision={0} size="small" value={currentPage} onChange={(value) => setCurrentPage(Math.min(Math.max(Math.trunc(value ?? 1), 1), Math.max(totalPages, 1)))} />
          <Typography.Text type="secondary">/ {totalPages || "?"}</Typography.Text>
          <Tooltip title="Página anterior"><Button aria-label="Página anterior" disabled={ocrBusy || currentPage <= 1} icon={<LeftOutlined />} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} size="small" /></Tooltip>
          <Tooltip title="Próxima página"><Button aria-label="Próxima página" disabled={ocrBusy || currentPage >= totalPages} icon={<RightOutlined />} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} size="small" /></Tooltip>
        </Space>
        <Space size={4} wrap>
          <Tooltip title="Reduzir zoom"><Button aria-label="Reduzir zoom" disabled={ocrBusy} icon={<MinusOutlined />} onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} size="small" /></Tooltip>
          <Tag>{Math.round(zoom * 100)}%</Tag>
          <Tooltip title="Aumentar zoom"><Button aria-label="Aumentar zoom" disabled={ocrBusy} icon={<PlusOutlined />} onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))} size="small" /></Tooltip>
          <Button disabled={ocrBusy} icon={<AimOutlined />} onClick={fitWidth} size="small">Ajustar largura</Button>
          <Tooltip title={`Abrir ${fileName} em nova guia`}><Button aria-label="Abrir PDF autorizado" icon={<DownloadOutlined />} onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")} size="small" /></Tooltip>
        </Space>
      </div>

      {selectionMode ? (
        <div className="prisma-selection-instruction" role="status">
          <span>Selecione uma área do currículo para <strong>{selectedFieldPath}</strong>.</span>
          <Button disabled={ocrBusy} onClick={onSelectionCancel} size="small" type="text">Cancelar seleção</Button>
        </div>
      ) : null}
      {selectionStatus ? <div className="prisma-selection-status" role="status">{selectionStatus}</div> : null}

      <div className="prisma-pdf-scroll" ref={scrollRef}>
        {loading ? <Skeleton active paragraph={{ rows: 14 }} /> : null}
        {error ? <Alert title="Erro ao renderizar o PDF" description={error} showIcon type="error" /> : null}
        {!loading && !error ? (
          <div className="prisma-pdf-page" ref={pageRef}>
            <canvas aria-label={`Página ${currentPage} do currículo`} ref={canvasRef} />
            <div aria-hidden={!selectionMode} className="textLayer prisma-pdf-text-layer" ref={textLayerRef} />
            <div className="prisma-evidence-overlay" aria-label="Camada de evidências">
              {pageLinks.map(({ link, region }) => (
                <button
                  aria-label={`Evidência ${link.linkKind} de ${link.fieldPath}`}
                  className={[
                    "prisma-evidence-highlight",
                    `prisma-evidence-highlight--${link.linkKind}`,
                    activeLinkId === link.id || fieldPathMatches(link.fieldPath, selectedFieldPath) ? "is-active" : "",
                    refinementExcludedLinkIds.includes(link.id) ? "is-refinement-excluded" : "",
                  ].filter(Boolean).join(" ")}
                  data-region-id={region.id}
                  key={link.id}
                  onClick={() => onEvidenceClick(link.fieldPath, link.id)}
                  style={normalizedRegionStyle(region)}
                  type="button"
                />
              ))}
              {pendingRegion ? <div className="prisma-evidence-highlight prisma-evidence-highlight--pending" style={normalizedRegionStyle(pendingRegion)} /> : null}
              {drag && pageRef.current ? <div className="prisma-evidence-highlight prisma-evidence-highlight--pending" style={dragStyle(drag, pageRef.current.clientWidth, pageRef.current.clientHeight)} /> : null}
            </div>
            <div
              aria-label="Área de seleção manual de evidência"
              className={["prisma-region-selector", selectionMode ? "is-active" : ""].join(" ")}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>
        ) : null}
        {rendering ? <div className="prisma-pdf-rendering" role="status">Renderizando página...</div> : null}
      </div>

      <div className="prisma-evidence-legend" aria-label="Legenda de evidências">
        <span><i className="is-original" />Original</span>
        <span><i className="is-complementary" />Complementar</span>
        <span><i className="is-reviewer" />Revisor</span>
        <span><i className="is-pending" />Seleção atual</span>
      </div>
    </section>
  );
}

function positionedTextUnits(layer: HTMLElement, selection: PixelRect): PositionedTextUnit[] {
  const units: PositionedTextUnit[] = [];
  const range = document.createRange();
  let sourceIndex = 0;
  layer.querySelectorAll<HTMLElement>("span").forEach((span) => {
    const spanRect = span.getBoundingClientRect();
    if (!pixelRectsOverlap(selection, spanRect)) {
      sourceIndex += 1;
      return;
    }
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const textNode = node as Text;
      let sourceOffset = 0;
      Array.from(textNode.data).forEach((character) => {
        const nextOffset = sourceOffset + character.length;
        range.setStart(textNode, sourceOffset);
        range.setEnd(textNode, nextOffset);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          units.push({
            text: character,
            sourceIndex,
            sourceOffset,
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
          });
        }
        sourceOffset = nextOffset;
      });
      sourceIndex += 1;
      node = walker.nextNode();
    }
  });
  range.detach();
  return units;
}

export function refinedSelectionText(selection: RegionSelectionResult, excludedLinkIds: string[]): string | null {
  if (!selection.selectionRect || !selection.textUnits.length) return selection.selectedText;
  const excluded = selection.refinementCandidates
    .filter((candidate) => excludedLinkIds.includes(candidate.linkId))
    .map((candidate) => candidate.pixelRegion);
  return textContainedByPixelRegion(selection.textUnits, selection.selectionRect, excluded);
}

function normalizedToPixelRect(region: NormalizedPageRegion, pageRect: PixelRect): PixelRect {
  const width = pageRect.right - pageRect.left;
  const height = pageRect.bottom - pageRect.top;
  return {
    left: pageRect.left + region.x * width,
    top: pageRect.top + region.y * height,
    right: pageRect.left + (region.x + region.width) * width,
    bottom: pageRect.top + (region.y + region.height) * height,
  };
}

function emptyTextSelection() {
  return {
    rawSelectedText: null,
    selectedText: null,
    selectionRect: null,
    textUnits: [],
    refinementCandidates: [],
  };
}

interface OcrBlock {
  paragraphs: Array<{
    lines: Array<{
      words: Array<{
        symbols: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
      }>;
    }>;
  }>;
}

function dragStyle(drag: DragState, width: number, height: number) {
  const region = normalizePointerRegion(drag.start, drag.end, width, height, 0);
  return region ? normalizedRegionStyle(region) : undefined;
}
