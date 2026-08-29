import type {
  OriginalReviewEvidence,
  ReviewEvidenceEvent,
  ReviewEvidenceLink,
  SpatialEvidenceRegion,
} from "./spatialEvidence.js";
import {
  ADAPTIVE_STRUCTURING_VERSION,
  buildAdaptiveExtraction,
  type FieldEvidenceDescriptor,
  type LayoutTextLine,
} from "./adaptiveResumeExtraction.js";

export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const NATIVE_EXTRACTION_VERSION = "pdfjs-5.4.296/layout-v2";
export const OCR_VERSION = "tesseract.js-7.0.0/por+eng-v1";
export const STRUCTURING_VERSION = ADAPTIVE_STRUCTURING_VERSION;
export const EXTRACTION_DRAFT_VERSION = "3.1.0";

export type PersonProfileState =
  | "not_generated"
  | "building"
  | "generated"
  | "requires_attention"
  | "processing_failed";

export type DocumentSourceType = "manual_text" | "resume_pdf";
export type DocumentReviewState = "not_ready" | "ready_for_review" | "in_review" | "approved" | "invalidated";
export type ResumeIntakeStatus =
  | "file_received"
  | "extracting_identity"
  | "needs_human_identity"
  | "needs_duplicate_resolution"
  | "ready_to_resolve"
  | "processing"
  | "ready_for_review"
  | "completed"
  | "failed";
export type ResumeIdentityResolution =
  | "created_new_person"
  | "linked_existing_person"
  | "needs_human_identity"
  | "needs_duplicate_resolution"
  | "failed";
export type PageExtractionOrigin = "native_pdf" | "ocr" | "manual_text";
export type ProcessingState =
  | "uploaded"
  | "validated"
  | "extracting_native"
  | "native_extracted"
  | "ocr_required"
  | "ocr_processing"
  | "extracted"
  | "structuring"
  | "structured"
  | "profile_ready"
  | "completed"
  | "failed_validation"
  | "failed_extraction"
  | "failed_ocr"
  | "failed_structuring";

export interface PersonEditorValue {
  fullName: string;
  email: string;
  phoneCountryIso2: string;
  phoneCountryLabel: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  phoneE164: string;
  birthDate: string | null;
  city: string;
  countryCode: string;
  notes: string;
}

export interface PersonWorkspaceSummary {
  id: string;
  organizationId: string;
  fullName: string;
  lifecycle: string;
  profileState: PersonProfileState;
  latestSourceType: DocumentSourceType | null;
  latestSourceAt: string | null;
  updatedAt: string;
  privateData: PersonEditorValue;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  origin: PageExtractionOrigin;
  usefulCharacterCount: number;
  method: string;
  methodVersion: string;
  layoutLines?: LayoutTextLine[];
  fieldEvidence?: FieldEvidenceDescriptor[];
}

export interface ProcessedDocumentInput {
  file: File;
  sha256: string;
  pages: ExtractedPage[];
  nativePageCount: number;
  ocrPageCount: number;
}

export interface ResumeDuplicateCandidate {
  personId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  reasons: Array<"same_email" | "same_phone" | "same_name">;
  strong: boolean;
}

export interface ResumeIntakeIdentityResult {
  kind: "identity";
  intakeId: string;
  storagePath: string;
  status: ResumeIntakeStatus;
  identityResult: ResumeIdentityResolution | null;
  candidates: ResumeDuplicateCandidate[];
  reused: boolean;
}

export interface ResumeIntakeResolutionResult {
  kind: "resolved";
  intakeId: string;
  personId: string;
  documentId: string;
  documentVersion: number;
  resolutionType: "created_new_person" | "linked_existing_person";
  reused: boolean;
}

export type CustomProfileSectionFormat = "text" | "list";

export interface CustomProfileSectionItem {
  id: string;
  value: string;
}

export interface CustomProfileSection {
  id: string;
  name: string;
  format: CustomProfileSectionFormat;
  source: "extracted" | "human";
  items: CustomProfileSectionItem[];
}

export interface StructuredDraft {
  summary: string | null;
  experiences: Array<{ role: string; organization: string; period: string | null; description?: string | null; evidenceText: string; page: number }>;
  education: Array<{ course: string; institution: string; period: string | null; description?: string | null; evidenceText: string; page: number }>;
  certifications: string[];
  languages: string[];
  competencies: string[];
  customSections: CustomProfileSection[];
  uncertainties: string[];
  notIdentified: string[];
}

export interface PersonDocumentTimelineItem {
  id: string;
  filename: string;
  sourceType: DocumentSourceType;
  documentVersion: number;
  byteSize: number | null;
  pageCount: number | null;
  status: string;
  reviewState: DocumentReviewState;
  createdAt: string;
  processedAt: string | null;
  profileVersion: number | null;
  isLegacyUnstored: boolean;
  latestAttempt: ProcessingAttemptView | null;
}

export interface DocumentOperationSummary extends PersonDocumentTimelineItem {
  personId: string;
  personName: string;
  failureCode: string | null;
}

export interface ProcessingAuditEvent {
  id: number;
  eventType: string;
  result: "success" | "failure" | "denied";
  errorCode: string | null;
  actorAuthUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProfileReviewRevision {
  id: string;
  revisionNumber: number;
  changeReason: string | null;
  actorAuthUserId: string;
  createdAt: string;
}

export interface ProfileReviewChange {
  id: number;
  fieldPath: keyof StructuredDraft;
  extractedValue: unknown;
  previousValue: unknown;
  reviewedValue: unknown;
  reason: string;
  actorAuthUserId: string;
  createdAt: string;
}

export interface ProfileReviewAdaptationEvent {
  id: string;
  reviewRevisionId: string;
  sourceFieldPath: string;
  patternKey: string;
  methodVersion: string;
  acceptedSuggestions: Array<{
    fieldPath: string;
    pageNumber: number;
    evidenceMethod: "pdfjs-layout-v1" | "text-line-v1";
    rationaleCode: "same-document-block-pattern";
  }>;
  lockVersion: number;
  actorAuthUserId: string;
  createdAt: string;
}

export interface ProfileReviewWorkspace {
  id: string;
  personId: string;
  personName: string;
  documentId: string;
  documentName: string;
  documentVersion: number;
  documentPageCount: number;
  documentStoragePath: string | null;
  documentSourceType: DocumentSourceType;
  processingAttemptId: string;
  state: "draft" | "approved" | "invalidated";
  lockVersion: number;
  extractedData: StructuredDraft;
  reviewedData: StructuredDraft;
  baseProfileVersion: number | null;
  approvedProfileId: string | null;
  approvedAt: string | null;
  pages: ExtractedPage[];
  revisions: ProfileReviewRevision[];
  changes: ProfileReviewChange[];
  adaptationEvents: ProfileReviewAdaptationEvent[];
  originalEvidence: OriginalReviewEvidence[];
  spatialRegions: SpatialEvidenceRegion[];
  evidenceLinks: ReviewEvidenceLink[];
  evidenceEvents: ReviewEvidenceEvent[];
}

export interface ProfileVersionView {
  id: string;
  profileVersion: number;
  profileData: StructuredDraft;
  reviewStatus: string;
  sourceDocumentId: string;
  processingAttemptId: string | null;
  approvedByAuthUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  supersededAt: string | null;
}

export interface ProcessingAttemptView {
  id: string;
  attemptNumber: number;
  state: ProcessingState;
  currentMethod: string;
  pagesNative: number;
  pagesOcr: number;
  usefulCharacterCount: number;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface PersonIngestionWorkspace {
  person: PersonWorkspaceSummary;
  documents: PersonDocumentTimelineItem[];
  selectedDocument: PersonDocumentTimelineItem | null;
  pages: ExtractedPage[];
  draft: StructuredDraft | null;
}

export interface PdfProcessingProgress {
  stage: "validating" | "extracting_native" | "ocr" | "completed";
  pageNumber?: number;
  pageCount?: number;
  message: string;
}

export async function validateAndProcessPdf(
  file: File,
  onProgress?: (progress: PdfProcessingProgress) => void,
): Promise<ProcessedDocumentInput> {
  onProgress?.({ stage: "validating", message: "Validando assinatura, tamanho e estrutura do PDF." });
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  if (file.size > MAX_PDF_BYTES) throw new Error("O PDF excede o limite de 15 MB.");
  if (file.type && file.type !== "application/pdf") throw new Error("O arquivo selecionado não declara o tipo PDF.");

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("A assinatura do arquivo não corresponde a um PDF.");
  }
  const trailer = new TextDecoder("ascii").decode(bytes.slice(Math.max(0, bytes.length - 2048)));
  if (!trailer.includes("%%EOF")) throw new Error("O PDF está incompleto ou corrompido.");

  const sha256 = await digestSha256(bytes);
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdfDocument = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  if (pdfDocument.numPages < 1 || pdfDocument.numPages > 200) throw new Error("O PDF não possui uma quantidade de páginas suportada.");

  const pages: ExtractedPage[] = [];
  const ocrCandidates: Array<{ pageNumber: number; canvas: HTMLCanvasElement }> = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    onProgress?.({
      stage: "extracting_native",
      pageNumber,
      pageCount: pdfDocument.numPages,
      message: `Extraindo texto nativo da página ${pageNumber} de ${pdfDocument.numPages}.`,
    });
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const layoutViewport = page.getViewport({ scale: 1 });
    const layoutLines = buildPdfLayoutLines(textContent.items, layoutViewport.width, layoutViewport.height);
    const text = layoutLines.map((line) => line.text).join("\n").trim();
    if (isNativeTextSufficient(text)) {
      pages.push({ ...toExtractedPage(pageNumber, text, "native_pdf", "pdfjs", NATIVE_EXTRACTION_VERSION), layoutLines });
      continue;
    }
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("O navegador não conseguiu preparar a página para OCR.");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    ocrCandidates.push({ pageNumber, canvas });
  }

  if (ocrCandidates.length > 0) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(["por", "eng"]);
    try {
      for (const candidate of ocrCandidates) {
        onProgress?.({
          stage: "ocr",
          pageNumber: candidate.pageNumber,
          pageCount: pdfDocument.numPages,
          message: `Executando OCR local na página ${candidate.pageNumber} de ${pdfDocument.numPages}.`,
        });
        const result = await worker.recognize(candidate.canvas);
        const text = result.data.text.replace(/\s+/g, " ").trim();
        if (!isOcrTextSufficient(text)) {
          throw new Error(`A página ${candidate.pageNumber} continuou sem texto suficiente após o OCR.`);
        }
        pages.push(toExtractedPage(candidate.pageNumber, text, "ocr", "tesseract.js", OCR_VERSION));
      }
    } finally {
      await worker.terminate();
    }
  }

  pages.sort((left, right) => left.pageNumber - right.pageNumber);
  const usefulCharacterCount = pages.reduce((total, page) => total + page.usefulCharacterCount, 0);
  if (usefulCharacterCount < 120) throw new Error("A extração resultou em conteúdo insuficiente para construir um perfil.");
  onProgress?.({ stage: "completed", pageCount: pdfDocument.numPages, message: "Extração concluída e validada." });
  return {
    file,
    sha256,
    pages,
    nativePageCount: pages.filter((page) => page.origin === "native_pdf").length,
    ocrPageCount: pages.filter((page) => page.origin === "ocr").length,
  };
}

export function processManualText(text: string): { page: ExtractedPage; draft: StructuredDraft } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (usefulCharacterCount(normalized) < 120) {
    throw new Error("Informe ao menos 120 caracteres úteis para processar o texto manual.");
  }
  const page = toExtractedPage(1, normalized, "manual_text", "manual-source", STRUCTURING_VERSION);
  return { page, draft: buildDeterministicDraft([page]) };
}

export function buildDeterministicDraft(pages: ExtractedPage[]): StructuredDraft {
  return buildAdaptiveExtraction(pages).draft;
}

export function isNativeTextSufficient(text: string): boolean {
  const useful = usefulCharacterCount(text);
  if (useful < 80) return false;
  const printable = [...text].filter((character) => /[\p{L}\p{N}\p{P}\p{Zs}]/u.test(character)).length;
  return printable / Math.max(text.length, 1) >= 0.85;
}

export function isOcrTextSufficient(text: string): boolean {
  return usefulCharacterCount(text) >= 50;
}

export function usefulCharacterCount(text: string): number {
  return [...text].filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
}

async function digestSha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toExtractedPage(
  pageNumber: number,
  text: string,
  origin: PageExtractionOrigin,
  method: string,
  methodVersion: string,
): ExtractedPage {
  return { pageNumber, text, origin, usefulCharacterCount: usefulCharacterCount(text), method, methodVersion };
}

function buildPdfLayoutLines(items: unknown[], pageWidth: number, pageHeight: number): LayoutTextLine[] {
  const fragments = items.flatMap((raw) => {
    if (!isPdfTextItem(raw) || !raw.str.trim()) return [];
    const fontSize = Math.max(Math.abs(raw.transform[0]), Math.abs(raw.transform[3]), raw.height || 0);
    return [{
      text: raw.str.trim(),
      x: clampNormalized(raw.transform[4] / pageWidth),
      y: clampNormalized((pageHeight - raw.transform[5] - Math.max(raw.height, fontSize)) / pageHeight),
      width: clampNormalized(Math.max(raw.width / pageWidth, 0.000001)),
      height: clampNormalized(Math.max(raw.height, fontSize, 1) / pageHeight),
      fontSize,
      emphasis: /bold|black|semibold|heavy/i.test(raw.fontName ?? "") ? "strong" as const : "regular" as const,
    }];
  }).sort((left, right) => left.y - right.y || left.x - right.x);
  const groups: typeof fragments[] = [];
  for (const fragment of fragments) {
    let group: (typeof fragments) | undefined;
    for (let index = groups.length - 1; index >= 0; index -= 1) {
      const candidate = groups[index]!;
      if (Math.abs(candidate[0]!.y - fragment.y) <= Math.max(candidate[0]!.height, fragment.height) * 0.55) { group = candidate; break; }
    }
    if (group) group.push(fragment); else groups.push([fragment]);
  }
  return groups.map((group) => {
    group.sort((left, right) => left.x - right.x);
    const x = Math.min(...group.map((item) => item.x));
    const y = Math.min(...group.map((item) => item.y));
    const right = Math.max(...group.map((item) => item.x + item.width));
    const bottom = Math.max(...group.map((item) => item.y + item.height));
    return {
      text: group.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(),
      x,
      y,
      width: Math.min(1 - x, right - x),
      height: Math.min(1 - y, bottom - y),
      fontSize: Math.max(...group.map((item) => item.fontSize)),
      emphasis: group.some((item) => item.emphasis === "strong") ? "strong" : "regular",
    };
  });
}

function isPdfTextItem(value: unknown): value is { str: string; transform: [number, number, number, number, number, number, ...number[]]; width: number; height: number; fontName?: string } {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.str === "string" && Array.isArray(item.transform) && item.transform.length >= 6
    && item.transform.every((entry) => typeof entry === "number") && typeof item.width === "number" && typeof item.height === "number";
}

function clampNormalized(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1_000_000) / 1_000_000;
}
