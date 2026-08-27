export const SPATIAL_EVIDENCE_CONTRACT_VERSION = "1.0.0";
export const SPATIAL_EVIDENCE_COORDINATE_SYSTEM = "normalized-page-v1" as const;

export type ReviewEvidenceAction =
  | "correct_current_field"
  | "add_complementary"
  | "replace_review_evidence"
  | "create_new_information";

export type ReviewEvidenceLinkKind = "original" | "reviewer" | "complementary";
export type ReviewEvidenceLinkState = "active" | "superseded";
export type RegionExtractionMethod = "pdfjs-text-layer-v1" | "tesseract-region-v1" | "manual-region-v1";

export interface NormalizedPageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialEvidenceRegion extends NormalizedPageRegion {
  id: string;
  organizationId: string;
  personId: string;
  documentId: string;
  documentVersion: number;
  reviewId: string;
  pageNumber: number;
  coordinateSystem: typeof SPATIAL_EVIDENCE_COORDINATE_SYSTEM;
  selectedText: string | null;
  extractionMethod: RegionExtractionMethod;
  source: "system" | "human";
  contractVersion: typeof SPATIAL_EVIDENCE_CONTRACT_VERSION;
  createdByAuthUserId: string | null;
  createdAt: string;
}

export interface ReviewEvidenceLink {
  id: string;
  reviewId: string;
  fieldPath: string;
  evidenceId: string | null;
  spatialRegionId: string | null;
  linkKind: ReviewEvidenceLinkKind;
  state: ReviewEvidenceLinkState;
  replacesLinkId: string | null;
  supersededByLinkId: string | null;
  reason: string | null;
  createdByAuthUserId: string;
  createdAt: string;
  supersededAt: string | null;
}

export interface ReviewEvidenceEvent {
  id: number;
  reviewId: string;
  reviewRevisionId: string;
  fieldPath: string;
  eventType: "human_region_added" | "review_evidence_replaced" | "complementary_evidence_added" | "new_information_created";
  previousLinkId: string | null;
  newLinkId: string;
  reason: string;
  actorAuthUserId: string;
  createdAt: string;
}

export interface OriginalReviewEvidence {
  id: string;
  kind: string;
  fact: string;
  sourcePage: number | null;
  sourceBlock: string;
  quotedText: string;
  extractionOrigin: "native_pdf" | "ocr" | "manual_text" | null;
  method: string | null;
  methodVersion: string | null;
  createdAt: string;
}

export interface PointerPoint {
  x: number;
  y: number;
}

export function normalizePointerRegion(
  start: PointerPoint,
  end: PointerPoint,
  pageWidth: number,
  pageHeight: number,
  minimumPixels = 6,
): NormalizedPageRegion | null {
  if (![start.x, start.y, end.x, end.y, pageWidth, pageHeight, minimumPixels].every(Number.isFinite)) return null;
  if (pageWidth <= 0 || pageHeight <= 0 || minimumPixels < 0) return null;

  const left = clamp(Math.min(start.x, end.x), 0, pageWidth);
  const top = clamp(Math.min(start.y, end.y), 0, pageHeight);
  const right = clamp(Math.max(start.x, end.x), 0, pageWidth);
  const bottom = clamp(Math.max(start.y, end.y), 0, pageHeight);
  if (right - left < minimumPixels || bottom - top < minimumPixels) return null;

  const region = {
    x: roundNormalized(left / pageWidth),
    y: roundNormalized(top / pageHeight),
    width: roundNormalized((right - left) / pageWidth),
    height: roundNormalized((bottom - top) / pageHeight),
  };
  return isNormalizedPageRegion(region) ? region : null;
}

export function isNormalizedPageRegion(region: NormalizedPageRegion): boolean {
  const values = [region.x, region.y, region.width, region.height];
  if (!values.every(Number.isFinite)) return false;
  if (region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0) return false;
  if (region.x > 1 || region.y > 1 || region.width > 1 || region.height > 1) return false;
  return region.x + region.width <= 1.000001 && region.y + region.height <= 1.000001;
}

export function normalizedRegionStyle(region: NormalizedPageRegion): Record<"left" | "top" | "width" | "height", string> {
  if (!isNormalizedPageRegion(region)) throw new Error("A região normalizada é inválida.");
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`,
  };
}

export function topLevelReviewField(fieldPath: string): string {
  return fieldPath.split(".")[0] ?? fieldPath;
}

export function fieldPathMatches(linkFieldPath: string, selectedFieldPath: string): boolean {
  return linkFieldPath === selectedFieldPath
    || linkFieldPath.startsWith(`${selectedFieldPath}.`)
    || selectedFieldPath.startsWith(`${linkFieldPath}.`);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundNormalized(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
