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
  fieldPathMatches,
  normalizePointerRegion,
  normalizedRegionStyle,
  type NormalizedPageRegion,
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
  selectedText: string | null;
  extractionMethod: RegionExtractionMethod;
  ocrState: "not_needed" | "completed" | "failed";
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
    const text = textInsideRegion(region);
    if (text) {
      setSelectionStatus("Texto da região recuperado pela camada nativa do PDF.");
      onSelectionComplete({ pageNumber: currentPage, region, selectedText: text, extractionMethod: "pdfjs-text-layer-v1", ocrState: "not_needed" });
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
        const result = await worker.recognize(crop);
        if (version !== ocrVersionRef.current) return;
        const recognized = result.data.text.replace(/\s+/g, " ").trim();
        setSelectionStatus(recognized ? "OCR local concluído. Revise a sugestão antes de aplicar." : "O OCR não reconheceu texto; a região permanece disponível como evidência.");
        onSelectionComplete({
          pageNumber: currentPage,
          region,
          selectedText: recognized || null,
          extractionMethod: recognized ? "tesseract-region-v1" : "manual-region-v1",
          ocrState: recognized ? "completed" : "failed",
        });
      } finally {
        await worker.terminate();
      }
    } catch {
      if (version !== ocrVersionRef.current) return;
      setSelectionStatus("O OCR local falhou. A região pode ser vinculada, mas uma correção exigirá texto e justificativa manual.");
      onSelectionComplete({ pageNumber: currentPage, region, selectedText: null, extractionMethod: "manual-region-v1", ocrState: "failed" });
    } finally {
      if (version === ocrVersionRef.current) setOcrBusy(false);
    }
  }

  function textInsideRegion(region: NormalizedPageRegion): string | null {
    const pageRect = pageRef.current?.getBoundingClientRect();
    const layer = textLayerRef.current;
    if (!pageRect || !layer) return null;
    const selectionRect = {
      left: pageRect.left + region.x * pageRect.width,
      top: pageRect.top + region.y * pageRect.height,
      right: pageRect.left + (region.x + region.width) * pageRect.width,
      bottom: pageRect.top + (region.y + region.height) * pageRect.height,
    };
    const text = [...layer.querySelectorAll<HTMLElement>("span")]
      .filter((span) => rectanglesIntersect(selectionRect, span.getBoundingClientRect()))
      .map((span) => span.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text || null;
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

function rectanglesIntersect(
  left: { left: number; top: number; right: number; bottom: number },
  right: { left: number; top: number; right: number; bottom: number },
): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

function dragStyle(drag: DragState, width: number, height: number) {
  const region = normalizePointerRegion(drag.start, drag.end, width, height, 0);
  return region ? normalizedRegionStyle(region) : undefined;
}
