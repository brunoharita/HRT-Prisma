export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const NATIVE_EXTRACTION_VERSION = "pdfjs-5.4.296/native-v1";
export const OCR_VERSION = "tesseract.js-7.0.0/por+eng-v1";
export const STRUCTURING_VERSION = "prisma-deterministic-profile-v1";
export const EXTRACTION_DRAFT_VERSION = "1.0.0";

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

export interface StructuredDraft {
  summary: string | null;
  experiences: Array<{ role: string; organization: string; period: string | null; evidenceText: string; page: number }>;
  education: Array<{ course: string; institution: string; period: string | null; evidenceText: string; page: number }>;
  certifications: string[];
  languages: string[];
  competencies: string[];
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
  reason: string;
  actorAuthUserId: string;
  createdAt: string;
}

export interface ProfileReviewWorkspace {
  id: string;
  personId: string;
  personName: string;
  documentId: string;
  documentName: string;
  processingAttemptId: string;
  state: "draft" | "approved" | "invalidated";
  lockVersion: number;
  extractedData: StructuredDraft;
  reviewedData: StructuredDraft;
  baseProfileVersion: number | null;
  approvedProfileId: string | null;
  approvedAt: string | null;
  revisions: ProfileReviewRevision[];
  changes: ProfileReviewChange[];
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
    const text = textContent.items
      .map((item) => ("str" in item ? `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}` : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n+ */g, "\n")
      .trim();
    if (isNativeTextSufficient(text)) {
      pages.push(toExtractedPage(pageNumber, text, "native_pdf", "pdfjs", NATIVE_EXTRACTION_VERSION));
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
  const lines = pages.flatMap((page) => page.text.split(/\n|\s{2,}/).map((line) => ({ line: line.trim(), page: page.pageNumber })))
    .filter((entry) => entry.line.length > 2);
  const experiencePattern = /(.+?)\s+(?:em|at|[-|])\s+(.+?)(?:\s+([0-9]{4}[^|]*))?$/i;
  const experiences = lines.flatMap((entry) => {
    const match = experiencePattern.exec(entry.line);
    if (!match?.[1] || !match[2] || !/(analista|desenvolvedor|developer|gerente|coordenador|especialista|consultor|engineer|recruiter|diretor)/i.test(match[1])) return [];
    return [{ role: match[1].trim(), organization: match[2].trim(), period: match[3]?.trim() ?? null, evidenceText: entry.line, page: entry.page }];
  }).slice(0, 12);
  const education = lines.filter((entry) => /(universidade|faculdade|bacharel|tecnólogo|mba|pós-graduação|university|college)/i.test(entry.line))
    .slice(0, 8)
    .map((entry) => ({ course: entry.line, institution: "Não identificada", period: null, evidenceText: entry.line, page: entry.page }));
  const competencyCatalog = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "Power BI", "SAP", "Scrum", "Kanban", "Docker", "AWS", "Azure", "Supabase"];
  const fullText = pages.map((page) => page.text).join("\n");
  const competencies = competencyCatalog.filter((item) => new RegExp(`\\b${escapeRegExp(item)}\\b`, "i").test(fullText));
  const languages = ["Português", "Inglês", "Espanhol", "English", "Spanish"].filter((item) => new RegExp(`\\b${item}\\b`, "i").test(fullText));
  const notIdentified = [
    ...(experiences.length === 0 ? ["experiências estruturáveis"] : []),
    ...(education.length === 0 ? ["formação acadêmica"] : []),
    ...(competencies.length === 0 ? ["competências explícitas"] : []),
    ...(languages.length === 0 ? ["idiomas"] : []),
  ];
  return {
    summary: experiences.length > 0 ? `${experiences[0]!.role} com experiência profissional documentada em ${experiences[0]!.organization}.` : null,
    experiences,
    education,
    certifications: lines.filter((entry) => /(certificação|certified|certificate)/i.test(entry.line)).slice(0, 8).map((entry) => entry.line),
    languages,
    competencies,
    uncertainties: [],
    notIdentified,
  };
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
