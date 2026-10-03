import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";
import { reviewFieldPathExists } from "./reviewFieldLifecycle.js";
import { containsInvalidImportUnicode } from "./importTextUnicode.js";

export const IMPORT_EVIDENCE_CONTRACT_VERSION = "import-evidence-1.1.0";
export const PARSER_EVIDENCE_ADAPTER_VERSION = "evidence-adapter-1.0.1";
export const IMPORT_EVIDENCE_FIELD_PATTERN = /^(identity\.fullName|contact\.(city|state|phone|email|linkedin)|professionalTitle|areasOfExpertise|professionalObjective|summary|keyResults\.result_[a-z0-9]{8,64}\.value|certifications|languages|competencies|toolsAndTechnologies|professionalContexts|uncertainties|notIdentified|experiences\.([0-9]+|experience_[a-z0-9]{8,64})(\.(role|organization|period|description))?|education\.([0-9]+|education_[a-z0-9]{8,64})(\.(course|institution|period|description|level|qualification|status|classificationOrigin))?|customSections\.[a-z0-9][a-z0-9_-]{7,79}\.(name|items\.[a-z0-9][a-z0-9_-]{7,79}\.value))$/;
export const IMPORT_FAILURE_REASONS = ["unicode_invalid", "pages_invalid", "page_invalid", "arrays_invalid", "payload_limit", "field_path_invalid", "field_target_missing", "evidence_page_invalid", "evidence_text_invalid", "geometry_invalid", "method_origin_invalid", "unavailable", "session_required", "environment_mismatch", "operation_failed"] as const;
export type ImportFailureReason = typeof IMPORT_FAILURE_REASONS[number];
export interface ImportEvidenceIssue { reason: ImportFailureReason; fieldPath: string | null; pageNumber: number | null; evidenceIndex: number | null; }
export interface ImportFailureDiagnostic extends ImportEvidenceIssue {
  contract: typeof IMPORT_EVIDENCE_CONTRACT_VERSION;
  stage: "structuring" | "persisting" | "completing";
  technicalCode: string | null;
  adapterVersion: typeof PARSER_EVIDENCE_ADAPTER_VERSION;
  structuringVersion: string;
}

// IDs and free-form backend messages never enter diagnostic metadata.
export function diagnosticFieldPath(path: unknown): string | null {
  if (typeof path !== "string" || !IMPORT_EVIDENCE_FIELD_PATTERN.test(path)) return null;
  return path.replace(/^(experiences|education|keyResults)\.[^.]+/, "$1.*")
    .replace(/^customSections\.[^.]+/, "customSections.*").replace(/\.items\.[^.]+/, ".items.*");
}

export function importEvidenceIssue(pages: ExtractedPage[], draft: StructuredDraft): ImportEvidenceIssue | null {
  const issue = (reason: ImportFailureReason, pageNumber: number | null = null, path: unknown = null, evidenceIndex: number | null = null): ImportEvidenceIssue => ({ reason, pageNumber, fieldPath: diagnosticFieldPath(path), evidenceIndex });
  if (!Array.isArray(pages) || !pages.length || pages.length > 200) return issue("pages_invalid");
  if (containsInvalidImportUnicode(pages) || containsInvalidImportUnicode(draft)) return issue("unicode_invalid");
  const seen = new Set<number>();
  for (const page of pages) {
    if (!page || !Number.isInteger(page.pageNumber) || page.pageNumber < 1 || page.pageNumber > pages.length || seen.has(page.pageNumber)
      || typeof page.text !== "string" || !["native_pdf", "ocr", "manual_text"].includes(page.origin)) return issue("page_invalid");
    seen.add(page.pageNumber);
    const lines = page.layoutLines === undefined ? [] : page.layoutLines; const evidence = page.fieldEvidence === undefined ? [] : page.fieldEvidence;
    if (!Array.isArray(lines) || !Array.isArray(evidence)) return issue("arrays_invalid", page.pageNumber);
    if (lines.length > 10000 || evidence.length > 1000) return issue("payload_limit", page.pageNumber);
    for (const [index, descriptor] of evidence.entries()) {
      const path = descriptor?.fieldPath;
      if (typeof path !== "string" || !IMPORT_EVIDENCE_FIELD_PATTERN.test(path)) return issue("field_path_invalid", page.pageNumber, null, index);
      if (!reviewFieldPathExists(draft, path)) return issue("field_target_missing", page.pageNumber, path, index);
      if (descriptor.pageNumber !== page.pageNumber) return issue("evidence_page_invalid", page.pageNumber, path, index);
      if (typeof descriptor.text !== "string" || !descriptor.text.trim()) return issue("evidence_text_invalid", page.pageNumber, path, index);
      if (!["pdfjs-layout-v1", "tesseract-layout-v1", "text-line-v1"].includes(descriptor.method)) return issue("method_origin_invalid", page.pageNumber, path, index);
      const box = [descriptor.x, descriptor.y, descriptor.width, descriptor.height];
      const hasBox = box.some((value) => value != null);
      if (hasBox && (!box.every((value) => typeof value === "number" && Number.isFinite(value))
        || descriptor.x! < 0 || descriptor.y! < 0 || descriptor.width! <= 0 || descriptor.height! <= 0
        || descriptor.x! + descriptor.width! > 1 || descriptor.y! + descriptor.height! > 1)) return issue("geometry_invalid", page.pageNumber, path, index);
      if (hasBox && !((page.origin === "native_pdf" && descriptor.method === "pdfjs-layout-v1")
          || (page.origin === "ocr" && descriptor.method === "tesseract-layout-v1"))) return issue("method_origin_invalid", page.pageNumber, path, index);
    }
  }
  return null;
}
