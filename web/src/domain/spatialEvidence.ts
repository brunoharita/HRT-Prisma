export const SPATIAL_EVIDENCE_CONTRACT_VERSION = "1.2.0";
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
export type SpatialEvidenceContractVersion = "1.0.0" | "1.1.0" | typeof SPATIAL_EVIDENCE_CONTRACT_VERSION;

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
  rawSelectedText: string | null;
  selectedText: string | null;
  extractionMethod: RegionExtractionMethod;
  source: "system" | "human";
  contractVersion: SpatialEvidenceContractVersion;
  createdByAuthUserId: string | null;
  createdAt: string;
}

export interface ReviewEvidenceRefinement {
  id: number;
  reviewId: string;
  regionId: string;
  mappedLinkId: string;
  mappedFieldPath: string;
  decision: "excluded" | "included";
  basis: "same-record-spatial-overlap";
  actorAuthUserId: string;
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

export interface EvidenceSelectionReasonInput {
  selectedText: string | null;
  proposedValue: string;
  valueEdited: boolean;
  changesDraft: boolean;
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

export function isReviewEvidenceVisibleOnCurrentScreen(
  linkFieldPath: string,
  selectedFieldPath: string,
): boolean {
  return reviewScreenScope(linkFieldPath) === reviewScreenScope(selectedFieldPath);
}

export function textContainedByPixelRegion(
  units: PositionedTextUnit[],
  selection: PixelRect,
  excludedRegions: PixelRect[] = [],
): string | null {
  return textFromPositionedUnits(
    textUnitsExcludingPixelRegions(textUnitsReachedByPixelRegion(units, selection), excludedRegions),
  );
}

export function textUnitsReachedByPixelRegion(
  units: PositionedTextUnit[],
  selection: PixelRect,
): PositionedTextUnit[] {
  const directlyReached = units.filter((unit) => {
    const centerX = (unit.rect.left + unit.rect.right) / 2;
    const centerY = (unit.rect.top + unit.rect.bottom) / 2;
    return centerX >= selection.left && unit.rect.left < selection.right
      && centerY >= selection.top && centerY <= selection.bottom;
  });
  if (!directlyReached.length) return [];

  const tolerance = rightEdgeCharacterTolerance(selection);
  const rescuedRightEdgeUnits: PositionedTextUnit[] = [];
  units.forEach((candidate) => {
    if (directlyReached.includes(candidate)) return;
    const centerY = (candidate.rect.top + candidate.rect.bottom) / 2;
    if (centerY < selection.top || centerY > selection.bottom) return;
    if (candidate.rect.left < selection.right || candidate.rect.left > selection.right + tolerance) return;
    if (rescuedRightEdgeUnits.some((unit) => sameVisualLine(unit, candidate))) return;
    const hasReachedPredecessor = directlyReached.some((unit) => sameVisualLine(unit, candidate)
      && unit.rect.left < candidate.rect.left
      && candidate.rect.left - unit.rect.right <= tolerance * 2);
    if (hasReachedPredecessor) rescuedRightEdgeUnits.push(candidate);
  });

  const selected = new Set([...directlyReached, ...rescuedRightEdgeUnits]);
  return units.filter((unit) => selected.has(unit));
}

export function textUnitsExcludingPixelRegions(
  units: PositionedTextUnit[],
  excludedRegions: PixelRect[],
): PositionedTextUnit[] {
  if (!excludedRegions.length) return units;
  return units.filter((unit) => {
    const centerX = (unit.rect.left + unit.rect.right) / 2;
    const centerY = (unit.rect.top + unit.rect.bottom) / 2;
    return !excludedRegions.some((region) => centerX >= region.left && centerX <= region.right
      && centerY >= region.top && centerY <= region.bottom);
  });
}

export function textFromPositionedUnits(units: PositionedTextUnit[]): string | null {
  if (!units.length) return null;

  let result = "";
  let previous: PositionedTextUnit | null = null;
  units.forEach((unit) => {
    if (previous && shouldSeparateTextUnits(previous, unit) && result && !/\s$/.test(result) && !/^\s/.test(unit.text)) {
      result += " ";
    }
    result += unit.text;
    previous = unit;
  });
  const normalized = result.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function characterReachRect(selection: PixelRect): PixelRect {
  return { ...selection, right: selection.right + rightEdgeCharacterTolerance(selection) };
}

export function fitPixelRectToVisualSlot(
  rect: PixelRect,
  sourceBounds: PixelRect,
  visualRight: number,
): PixelRect {
  const sourceWidth = sourceBounds.right - sourceBounds.left;
  const visualWidth = visualRight - sourceBounds.left;
  if (sourceWidth <= 0 || visualWidth <= 0 || visualRight >= sourceBounds.right) return rect;
  const horizontalScale = visualWidth / sourceWidth;
  return {
    left: sourceBounds.left + (rect.left - sourceBounds.left) * horizontalScale,
    top: rect.top,
    right: sourceBounds.left + (rect.right - sourceBounds.left) * horizontalScale,
    bottom: rect.bottom,
  };
}

export function boundingPixelRectForTextUnits(units: PositionedTextUnit[]): PixelRect | null {
  const [first, ...remaining] = units;
  if (!first) return null;
  return remaining.reduce<PixelRect>((bounds, unit) => ({
    left: Math.min(bounds.left, unit.rect.left),
    top: Math.min(bounds.top, unit.rect.top),
    right: Math.max(bounds.right, unit.rect.right),
    bottom: Math.max(bounds.bottom, unit.rect.bottom),
  }), { ...first.rect });
}

export function uniqueTextUnitMatch(
  units: PositionedTextUnit[],
  expectedText: string,
): PositionedTextUnit[] {
  const expected = normalizeComparableText(expectedText);
  if (!expected) return [];

  const projected: string[] = [];
  const unitByCharacter: Array<PositionedTextUnit | null> = [];
  let previous: PositionedTextUnit | null = null;

  units.forEach((unit) => {
    if (previous && shouldSeparateTextUnits(previous, unit)) appendSearchCharacter(" ", null);
    Array.from(unit.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
      .forEach((character) => appendSearchCharacter(character, unit));
    previous = unit;
  });

  const searchable = projected.join("");
  const matches: number[] = [];
  let offset = searchable.indexOf(expected);
  while (offset >= 0) {
    const before = searchable[offset - 1];
    const after = searchable[offset + expected.length];
    const startsInsideWord = isSearchWordCharacter(expected.at(0)) && isSearchWordCharacter(before);
    const endsInsideWord = isSearchWordCharacter(expected.at(-1)) && isSearchWordCharacter(after);
    if (!startsInsideWord && !endsInsideWord) matches.push(offset);
    offset = searchable.indexOf(expected, offset + 1);
  }
  const matchOffset = matches.length === 1 ? matches[0] : undefined;
  if (matchOffset === undefined) return [];

  const matchedUnits = unitByCharacter.slice(matchOffset, matchOffset + expected.length)
    .filter((unit): unit is PositionedTextUnit => Boolean(unit));
  return matchedUnits.filter((unit, index) => matchedUnits.indexOf(unit) === index);

  function appendSearchCharacter(character: string, unit: PositionedTextUnit | null) {
    if (/\s/.test(character)) {
      if (projected.at(-1) === " ") return;
      projected.push(" ");
      unitByCharacter.push(unit);
      return;
    }
    projected.push(character);
    unitByCharacter.push(unit);
  }
}

function isSearchWordCharacter(value: string | undefined): boolean {
  return Boolean(value && /[a-z0-9]/i.test(value));
}

export function siblingReviewFieldScope(fieldPath: string): string | null {
  const canonical = /^(experiences|education)\.([0-9]+)\.[a-zA-Z]+$/.exec(fieldPath);
  return canonical ? `${canonical[1]}.${canonical[2]}` : null;
}

export function areSiblingReviewFields(left: string, right: string): boolean {
  const leftScope = siblingReviewFieldScope(left);
  return Boolean(leftScope && leftScope === siblingReviewFieldScope(right) && left !== right);
}

export function pixelRectsOverlap(left: PixelRect, right: PixelRect): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

export function intersectPixelRects(left: PixelRect, right: PixelRect): PixelRect | null {
  if (!pixelRectsOverlap(left, right)) return null;
  return {
    left: Math.max(left.left, right.left),
    top: Math.max(left.top, right.top),
    right: Math.min(left.right, right.right),
    bottom: Math.min(left.bottom, right.bottom),
  };
}

export function evidenceSelectionRequiresReason(input: EvidenceSelectionReasonInput): boolean {
  if (!input.changesDraft) return false;
  if (!input.selectedText) return true;
  if (!input.valueEdited) return false;
  return normalizeComparableText(input.proposedValue) !== normalizeComparableText(input.selectedText);
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

function rightEdgeCharacterTolerance(selection: PixelRect): number {
  return Math.min(2, Math.max(0.75, (selection.bottom - selection.top) * 0.08));
}

function sameVisualLine(left: PositionedTextUnit, right: PositionedTextUnit): boolean {
  const leftCenterY = (left.rect.top + left.rect.bottom) / 2;
  const rightCenterY = (right.rect.top + right.rect.bottom) / 2;
  const height = Math.max(left.rect.bottom - left.rect.top, right.rect.bottom - right.rect.top);
  return Math.abs(leftCenterY - rightCenterY) <= height * 0.6;
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function reviewScreenScope(fieldPath: string): string {
  const entity = /^(experiences|education)\.([0-9]+)(?:\.|$)/.exec(fieldPath);
  if (entity) return `${entity[1]}.${entity[2]}`;
  if (["certifications", "uncertainties", "notIdentified"].includes(fieldPath)
    || fieldPath.startsWith("customSections.")) return "other";
  return fieldPath;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundNormalized(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
