export const SPATIAL_EVIDENCE_CONTRACT_VERSION = "1.1.0";
export const SPATIAL_EVIDENCE_COORDINATE_SYSTEM = "normalized-page-v1" as const;
export const PDFJS_CHARACTER_REGION_METHOD = "pdfjs-character-region-v2" as const;

export type ReviewEvidenceAction =
  | "correct_current_field"
  | "add_complementary"
  | "replace_review_evidence"
  | "create_new_information";

export type ReviewEvidenceLinkKind = "original" | "reviewer" | "complementary";
export type ReviewEvidenceLinkState = "active" | "superseded";
export type RegionExtractionMethod =
  | "pdfjs-text-layer-v1"
  | typeof PDFJS_CHARACTER_REGION_METHOD
  | "tesseract-region-v1"
  | "manual-region-v1";
export type SpatialEvidenceContractVersion = "1.0.0" | typeof SPATIAL_EVIDENCE_CONTRACT_VERSION;

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
  contractVersion: SpatialEvidenceContractVersion;
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
  eventType: "human_region_added" | "review_evidence_replaced" | "complementary_evidence_added" | "new_information_created" | "review_evidence_removed";
  previousLinkId: string | null;
  newLinkId: string | null;
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

export interface PixelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PositionedTextUnit {
  text: string;
  sourceIndex: number;
  sourceOffset: number;
  rect: PixelRect;
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

export function textContainedByPixelRegion(units: PositionedTextUnit[], selection: PixelRect): string | null {
  const selected = units.filter((unit) => {
    const centerX = (unit.rect.left + unit.rect.right) / 2;
    const centerY = (unit.rect.top + unit.rect.bottom) / 2;
    return centerX >= selection.left && centerX <= selection.right
      && centerY >= selection.top && centerY <= selection.bottom;
  });
  if (!selected.length) return null;

  let result = "";
  let previous: PositionedTextUnit | null = null;
  selected.forEach((unit) => {
    if (previous && shouldSeparateTextUnits(previous, unit) && result && !/\s$/.test(result) && !/^\s/.test(unit.text)) {
      result += " ";
    }
    result += unit.text;
    previous = unit;
  });
  const normalized = result.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function shouldSeparateTextUnits(previous: PositionedTextUnit, current: PositionedTextUnit): boolean {
  const previousCenterY = (previous.rect.top + previous.rect.bottom) / 2;
  const currentCenterY = (current.rect.top + current.rect.bottom) / 2;
  const height = Math.max(previous.rect.bottom - previous.rect.top, current.rect.bottom - current.rect.top);
  if (Math.abs(currentCenterY - previousCenterY) > height * 0.6) return true;
  if (previous.sourceIndex === current.sourceIndex) {
    return current.sourceOffset > previous.sourceOffset + previous.text.length;
  }
  const horizontalGap = current.rect.left - previous.rect.right;
  return horizontalGap > Math.max(1, height * 0.12);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundNormalized(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
