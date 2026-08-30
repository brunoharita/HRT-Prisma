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
  boundingPixelRectForTextUnits,
  canonicalizePositionedTextUnits,
  fieldPathMatches,
  intersectPixelRects,
  isReviewEvidenceVisibleOnCurrentScreen,
  normalizePointerRegion,
  normalizedPageRegionToRect,
  normalizedRectToPageRegion,
  normalizedRegionStyle,
  PDFJS_CHARACTER_REGION_METHOD,
  textContainedByPixelRegion,
  textFromPositionedUnits,
  textUnitsExcludingPixelRegions,
  textUnitsReachedByPixelRegion,
  uniqueTextUnitMatch,
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
  selectedTextUnits: PositionedTextUnit[];
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
  canonicalRegion: PixelRect;
}

interface DocumentEvidenceViewerProps {
  pdfUrl: string | null;
  fileName: string;
  pageCount: number;
  regions: SpatialEvidenceRegion[];
  links: ReviewEvidenceLink[];
  fallbackOriginalEvidence: {
    linkId: string;
    fieldPath: string;
    pageNumber: number;
    text: string;
  } | null;
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
  fallbackOriginalEvidence,
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
  const [pendingVisualSelection, setPendingVisualSelection] = useState<RegionSelectionResult | null>(null);
  const [fallbackOriginalRegion, setFallbackOriginalRegion] = useState<NormalizedPageRegion | null>(null);
  const [pageTextUnits, setPageTextUnits] = useState<PositionedTextUnit[]>([]);
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
    setPageTextUnits([]);
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
      pageElement.style.setProperty("--scale-factor", String(viewport.scale));
      pageElement.style.setProperty("--total-scale-factor", String(viewport.scale));
      textElement.replaceChildren();
      textElement.style.width = `${viewport.width}px`;
      textElement.style.height = `${viewport.height}px`;
      textElement.style.setProperty("--scale-factor", String(viewport.scale));
      textElement.style.setProperty("--total-scale-factor", String(viewport.scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("O navegador não conseguiu preparar a página do PDF.");
      renderTask = loadedPage.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
      const pdfjs = await import("pdfjs-dist");
      const textContent = await loadedPage.getTextContent();
      const layer = new pdfjs.TextLayer({ textContentSource: textContent, container: textElement, viewport });
      textLayer = layer;
      await layer.render();
      if (renderVersion === renderVersionRef.current) {
        setPageTextUnits(canonicalTextUnits(textElement, pageElement.getBoundingClientRect()));
      }
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
    setFallbackOriginalRegion(null);
    if (rendering || !fallbackOriginalEvidence || fallbackOriginalEvidence.pageNumber !== currentPage) return;
    if (!pageTextUnits.length) return;
    const matchedUnits = uniqueTextUnitMatch(pageTextUnits, fallbackOriginalEvidence.text);
    const matchedRect = boundingPixelRectForTextUnits(matchedUnits);
    setFallbackOriginalRegion(matchedRect ? normalizedRectToPageRegion(matchedRect) : null);
  }, [currentPage, fallbackOriginalEvidence, pageTextUnits, rendering]);

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
      setPendingVisualSelection(null);
      setSelectionStatus(null);
      ocrVersionRef.current += 1;
      setOcrBusy(false);
    }
  }, [selectionMode]);

  const pageLinks = useMemo(() => links.flatMap((link) => {
    if (link.state !== "active" || !link.spatialRegionId
      || !isReviewEvidenceVisibleOnCurrentScreen(link.fieldPath, selectedFieldPath)) return [];
    const region = regions.find((item) => item.id === link.spatialRegionId && item.pageNumber === currentPage);
    return region ? [{ link, region }] : [];
  }), [currentPage, links, regions, selectedFieldPath]);

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
    setPendingVisualSelection(null);
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
      const completedSelection: RegionSelectionResult = {
        pageNumber: currentPage,
        ...nativeSelection,
        extractionMethod: PDFJS_CHARACTER_REGION_METHOD,
        ocrState: "not_needed",
      };
      setPendingRegion(completedSelection.region);
      setPendingVisualSelection(completedSelection);
      setSelectionStatus("Seleção ajustada aos caracteres destacados. O texto recuperado corresponde exatamente ao destaque.");
      onSelectionComplete(completedSelection);
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
        const completedSelection: RegionSelectionResult = {
          pageNumber: currentPage,
          ...ocrSelection,
          region: "region" in ocrSelection ? ocrSelection.region : region,
          extractionMethod: recognized ? "tesseract-region-v1" : "manual-region-v1",
          ocrState: recognized ? "completed" : "failed",
        };
        setPendingRegion(completedSelection.region);
        setPendingVisualSelection(recognized ? completedSelection : null);
        setSelectionStatus(recognized
          ? completedSelection.selectedTextUnits.length
            ? "OCR local concluído. Os símbolos destacados correspondem ao texto recuperado."
            : "OCR local concluído sem geometria por símbolo. Revise o texto antes de aplicá-lo."
          : "O OCR não reconheceu texto; a região permanece disponível como evidência.");
        onSelectionComplete(completedSelection);
      } finally {
        await worker.terminate();
      }
    } catch {
      if (version !== ocrVersionRef.current) return;
      setSelectionStatus("O OCR local falhou. A região pode ser vinculada, mas uma correção exigirá texto e justificativa manual.");
      setPendingVisualSelection(null);
      onSelectionComplete({ pageNumber: currentPage, region, ...emptyTextSelection(), extractionMethod: "manual-region-v1", ocrState: "failed" });
    } finally {
      if (version === ocrVersionRef.current) setOcrBusy(false);
    }
  }

  function nativeTextSelection(region: NormalizedPageRegion) {
    if (!pageTextUnits.length) return null;
    const selectionRect = normalizedPageRegionToRect(region);
    return selectionFromUnits(region, pageTextUnits, textContainedByPixelRegion(pageTextUnits, selectionRect));
  }

  function selectionFromUnits(region: NormalizedPageRegion, units: PositionedTextUnit[], rawText: string | null) {
    if (!rawText) return { region, ...emptyTextSelection() };
    const selectionRect = normalizedPageRegionToRect(region);
    const selectedTextUnits = textUnitsReachedByPixelRegion(units, selectionRect);
    const resolvedRawText = textFromPositionedUnits(selectedTextUnits) ?? rawText;
    if (!units.length) {
      return { region, rawSelectedText: rawText, selectedText: rawText, selectionRect, textUnits: [], selectedTextUnits: [], refinementCandidates: [] };
    }
    const resolvedSelectionRect = boundingPixelRectForTextUnits(selectedTextUnits) ?? selectionRect;
    const resolvedRegion = normalizedRectToPageRegion(resolvedSelectionRect) ?? region;
    const refinementCandidates = pageLinks.flatMap(({ link, region: mappedRegion }) => {
      if (!areSiblingReviewFields(link.fieldPath, selectedFieldPath)) return [];
      const canonicalRegion = normalizedPageRegionToRect(mappedRegion);
      const overlap = intersectPixelRects(resolvedSelectionRect, canonicalRegion);
      if (!overlap) return [];
      const overlapText = textContainedByPixelRegion(selectedTextUnits, overlap);
      if (!overlapText) return [];
      return [{
        linkId: link.id,
        regionId: mappedRegion.id,
        fieldPath: link.fieldPath,
        linkKind: link.linkKind,
        source: mappedRegion.source,
        overlapText,
        defaultExcluded: mappedRegion.source === "human",
        canonicalRegion,
      } satisfies RegionRefinementCandidate];
    });
    const defaultExclusions = refinementCandidates.filter((candidate) => candidate.defaultExcluded).map((candidate) => candidate.canonicalRegion);
    return {
      region: resolvedRegion,
      rawSelectedText: resolvedRawText,
      selectedText: textFromPositionedUnits(textUnitsExcludingPixelRegions(selectedTextUnits, defaultExclusions)),
      selectionRect: resolvedSelectionRect,
      textUnits: units,
      selectedTextUnits,
      refinementCandidates,
    };
  }

  function positionedOcrTextUnits(
    blocks: OcrBlock[] | null,
    region: NormalizedPageRegion,
    cropWidth: number,
    cropHeight: number,
  ): PositionedTextUnit[] {
    if (!blocks?.length || cropWidth <= 0 || cropHeight <= 0) return [];
    const cropRect = normalizedPageRegionToRect(region);
    const scaleX = region.width / cropWidth;
    const scaleY = region.height / cropHeight;
    const units: PositionedTextUnit[] = [];
    let sourceIndex = 0;
    blocks.forEach((block) => block.paragraphs.forEach((paragraph) => paragraph.lines.forEach((line) => {
      let sourceOffset = 0;
      line.words.forEach((word, wordIndex) => {
        word.symbols.forEach((symbol) => {
          Array.from(symbol.text).forEach((character) => {
            units.push({
              unitId: `ocr:${sourceIndex}:${sourceOffset}`,
              text: character,
              sourceIndex,
              sourceOffset,
              lineIndex: sourceIndex,
              source: "ocr",
              confidence: null,
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
          const previousRight = cropRect.left + lastSymbol.bbox.x1 * scaleX;
          const nextLeft = cropRect.left + nextSymbol.bbox.x0 * scaleX;
          const centerX = (previousRight + nextLeft) / 2;
          const halfWidth = Math.max(Math.abs(nextLeft - previousRight) / 2, scaleX / 2);
          units.push({
            unitId: `ocr:${sourceIndex}:${sourceOffset}`,
            text: " ",
            sourceIndex,
            sourceOffset,
            lineIndex: sourceIndex,
            source: "ocr",
            confidence: null,
            rect: {
              left: centerX - halfWidth,
              top: cropRect.top + Math.min(lastSymbol.bbox.y0, nextSymbol.bbox.y0) * scaleY,
              right: centerX + halfWidth,
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

  const pendingCharacterRegions = pendingVisualSelection && pageRef.current
    ? textUnitsExcludingPixelRegions(
      pendingVisualSelection.selectedTextUnits,
      pendingVisualSelection.refinementCandidates
        .filter((candidate) => refinementExcludedLinkIds.includes(candidate.linkId))
        .map((candidate) => candidate.canonicalRegion),
    ).flatMap((unit) => {
      const normalized = normalizedRectToPageRegion(unit.rect);
      return normalized ? [{ unit, normalized }] : [];
    })
    : [];

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
      {selectionMode || selectionStatus ? (
        <div className="prisma-selection-status" role="status">
          {selectionStatus ?? "Arraste sobre a evidência desejada."}
        </div>
      ) : null}

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
              {fallbackOriginalEvidence && fallbackOriginalRegion ? (
                <button
                  aria-label={`Evidência original localizada visualmente de ${fallbackOriginalEvidence.fieldPath}`}
                  className={[
                    "prisma-evidence-highlight",
                    "prisma-evidence-highlight--original",
                    activeLinkId === fallbackOriginalEvidence.linkId ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                  data-visual-fallback="exact-pdf-text"
                  key={`fallback-${fallbackOriginalEvidence.linkId}`}
                  onClick={() => onEvidenceClick(fallbackOriginalEvidence.fieldPath, fallbackOriginalEvidence.linkId)}
                  style={normalizedRegionStyle(fallbackOriginalRegion)}
                  type="button"
                />
              ) : null}
              {pendingCharacterRegions.map(({ unit, normalized }) => (
                <span
                  aria-hidden="true"
                  className="prisma-evidence-character-highlight"
                  key={`${unit.sourceIndex}-${unit.sourceOffset}`}
                  style={normalizedRegionStyle(normalized)}
                />
              ))}
              {!pendingCharacterRegions.length && pendingRegion ? <div className="prisma-evidence-highlight prisma-evidence-highlight--pending" style={normalizedRegionStyle(pendingRegion)} /> : null}
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

function canonicalTextUnits(layer: HTMLElement, pageRect: PixelRect): PositionedTextUnit[] {
  const units: PositionedTextUnit[] = [];
  const range = document.createRange();
  const spans = Array.from(layer.querySelectorAll<HTMLElement>("span"));
  let sourceIndex = 0;
  spans.forEach((span) => {
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
            unitId: `native:${sourceIndex}:${sourceOffset}`,
            text: character,
            sourceIndex,
            sourceOffset,
            lineIndex: sourceIndex,
            source: "native",
            confidence: 1,
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
  return canonicalizePositionedTextUnits(units, pageRect);
}

export function refinedSelectionText(selection: RegionSelectionResult, excludedLinkIds: string[]): string | null {
  if (!selection.selectedTextUnits.length) return selection.selectedText;
  const excluded = selection.refinementCandidates
    .filter((candidate) => excludedLinkIds.includes(candidate.linkId))
    .map((candidate) => candidate.canonicalRegion);
  return textFromPositionedUnits(textUnitsExcludingPixelRegions(selection.selectedTextUnits, excluded));
}

function emptyTextSelection() {
  return {
    rawSelectedText: null,
    selectedText: null,
    selectionRect: null,
    textUnits: [],
    selectedTextUnits: [],
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
