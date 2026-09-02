export const SPATIAL_EVIDENCE_CONTRACT_VERSION = "1.2.0";
export const SPATIAL_EVIDENCE_COORDINATE_SYSTEM = "normalized-page-v1" as const;
export const PDFJS_CHARACTER_REGION_METHOD = "pdfjs-character-region-v2" as const;
export const COMPETENCY_LIST_SEGMENTATION_VERSION = "competency-list-spatial-v1" as const;

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
  unitId: string;
  text: string;
  sourceIndex: number;
  sourceOffset: number;
  lineIndex: number;
  source: "native" | "ocr";
  confidence: number | null;
  rect: PixelRect;
}

export interface SpatialListResolution {
  values: string[];
  basis: "empty" | "single-value" | "explicit-delimiters" | "spatial-cells";
  ambiguous: boolean;
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
  return units.filter((unit) => {
    const centerX = (unit.rect.left + unit.rect.right) / 2;
    const centerY = (unit.rect.top + unit.rect.bottom) / 2;
    return centerX >= selection.left && unit.rect.left < selection.right
      && centerY >= selection.top && centerY <= selection.bottom;
  });
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

export function splitExplicitListValues(value: string): string[] {
  return uniqueListValues(value.split(/(?:\r?\n|\t|[,;|]|[•▪●◦‣⁃∙])+/));
}

export function resolveSpatialListValues(
  units: PositionedTextUnit[],
  fallbackText: string | null,
): SpatialListResolution {
  const explicitValues = splitExplicitListValues(fallbackText ?? "");
  if (explicitValues.length > 1) {
    return { values: explicitValues, basis: "explicit-delimiters", ambiguous: false };
  }

  const lines = clusterVisualLines(units.filter((unit) => unit.text.trim() || /\s/.test(unit.text)));
  const cellsByLine = lines.map(splitVisualLineIntoCells).filter((line) => line.length > 0);
  if (cellsByLine.some((line) => line.length > 1)) {
    return {
      values: uniqueListValues(cellsByLine.flat()),
      basis: "spatial-cells",
      ambiguous: false,
    };
  }

  const spatialText = cellsByLine.flat().join(" ").trim();
  const singleValue = explicitValues[0] ?? spatialText ?? fallbackText?.trim() ?? "";
  const sourceCount = new Set(units.filter((unit) => unit.text.trim()).map((unit) => unit.sourceIndex)).size;
  const wordCount = singleValue.split(/\s+/).filter(Boolean).length;
  const ambiguous = Boolean(singleValue) && (cellsByLine.length > 1 || (wordCount >= 8 && sourceCount >= 3));
  return {
    values: singleValue ? [singleValue] : [],
    basis: singleValue ? "single-value" : "empty",
    ambiguous,
  };
}

export function normalizedPageRegionToRect(region: NormalizedPageRegion): PixelRect {
  return {
    left: region.x,
    top: region.y,
    right: region.x + region.width,
    bottom: region.y + region.height,
  };
}

export function normalizedRectToPageRegion(rect: PixelRect): NormalizedPageRegion | null {
  const left = clamp(rect.left, 0, 1);
  const top = clamp(rect.top, 0, 1);
  const right = clamp(rect.right, 0, 1);
  const bottom = clamp(rect.bottom, 0, 1);
  if (right <= left || bottom <= top) return null;
  const region = {
    x: roundNormalized(left),
    y: roundNormalized(top),
    width: roundNormalized(right - left),
    height: roundNormalized(bottom - top),
  };
  return isNormalizedPageRegion(region) ? region : null;
}

export function canonicalizePositionedTextUnits(
  units: PositionedTextUnit[],
  pageRect: PixelRect,
): PositionedTextUnit[] {
  const pageWidth = pageRect.right - pageRect.left;
  const pageHeight = pageRect.bottom - pageRect.top;
  if (pageWidth <= 0 || pageHeight <= 0) return [];
  return units.flatMap((unit) => {
    const region = normalizedRectToPageRegion({
      left: (unit.rect.left - pageRect.left) / pageWidth,
      top: (unit.rect.top - pageRect.top) / pageHeight,
      right: (unit.rect.right - pageRect.left) / pageWidth,
      bottom: (unit.rect.bottom - pageRect.top) / pageHeight,
    });
    return region ? [{ ...unit, rect: normalizedPageRegionToRect(region) }] : [];
  });
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
      .forEach((character) => {
        const decorativeMarker = isDecorativeListMarker(character);
        appendSearchCharacter(decorativeMarker ? " " : character, decorativeMarker ? null : unit);
      });
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
  const canonical = /^(experiences|education)\.([a-zA-Z0-9_]+)\.[a-zA-Z]+$/.exec(fieldPath);
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

function shouldSeparateTextUnits(previous: PositionedTextUnit, current: PositionedTextUnit): boolean {
  const previousCenterY = (previous.rect.top + previous.rect.bottom) / 2;
  const currentCenterY = (current.rect.top + current.rect.bottom) / 2;
  const height = Math.max(previous.rect.bottom - previous.rect.top, current.rect.bottom - current.rect.top);
  if (Math.abs(currentCenterY - previousCenterY) > height * 0.6) return true;
  if (previous.sourceIndex === current.sourceIndex) {
    return current.sourceOffset > previous.sourceOffset + previous.text.length;
  }
  const horizontalGap = current.rect.left - previous.rect.right;
  return horizontalGap > Math.max(0.000001, height * 0.12);
}

function clusterVisualLines(units: PositionedTextUnit[]): Array<{ units: PositionedTextUnit[]; centerY: number; height: number }> {
  const lines: Array<{ units: PositionedTextUnit[]; centerY: number; height: number }> = [];
  [...units]
    .sort((left, right) => unitCenterY(left) - unitCenterY(right) || left.rect.left - right.rect.left)
    .forEach((unit) => {
      const centerY = unitCenterY(unit);
      const height = unitHeight(unit);
      const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= Math.max(candidate.height, height) * 0.55);
      if (!line) {
        lines.push({ units: [unit], centerY, height });
        return;
      }
      line.units.push(unit);
      line.centerY = line.units.reduce((sum, candidate) => sum + unitCenterY(candidate), 0) / line.units.length;
      line.height = Math.max(line.height, height);
    });
  return lines.sort((left, right) => left.centerY - right.centerY);
}

function splitVisualLineIntoCells(line: { units: PositionedTextUnit[]; height: number }): string[] {
  const cells: PositionedTextUnit[][] = [];
  let current: PositionedTextUnit[] = [];
  const flush = () => {
    const value = textFromPositionedUnits(current)?.replace(/^[\s:·•|,;]+|[\s:·•|,;]+$/g, "").trim();
    if (value) cells.push(current);
    current = [];
  };

  [...line.units].sort((left, right) => left.rect.left - right.rect.left).forEach((unit) => {
    if (/[|•▪●◦‣⁃∙;,]/.test(unit.text)) {
      flush();
      return;
    }
    const previous = current.at(-1);
    const horizontalGap = previous ? unit.rect.left - previous.rect.right : 0;
    const previousIsWideWhitespace = Boolean(previous && /^\s+$/.test(previous.text) && unitWidth(previous) > line.height * 0.72);
    if (previous && (horizontalGap > line.height * 0.82 || previousIsWideWhitespace)) flush();
    current.push(unit);
  });
  flush();
  return cells.flatMap((cell) => splitExplicitListValues(textFromPositionedUnits(cell) ?? ""));
}

function uniqueListValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const trimmed = value.replace(/\s+/g, " ").trim();
    const comparable = normalizeComparableText(trimmed);
    if (!trimmed || seen.has(comparable)) return [];
    seen.add(comparable);
    return [trimmed];
  });
}

function unitCenterY(unit: PositionedTextUnit): number {
  return (unit.rect.top + unit.rect.bottom) / 2;
}

function unitHeight(unit: PositionedTextUnit): number {
  return Math.max(unit.rect.bottom - unit.rect.top, 0.000001);
}

function unitWidth(unit: PositionedTextUnit): number {
  return Math.max(unit.rect.right - unit.rect.left, 0);
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[•·▪●◦‣⁃∙]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isDecorativeListMarker(value: string): boolean {
  return /[•·▪●◦‣⁃∙]/.test(value);
}

function reviewScreenScope(fieldPath: string): string {
  const entity = /^(experiences|education)\.([a-zA-Z0-9_]+)(?:\.|$)/.exec(fieldPath);
  if (entity) return `${entity[1]}.${entity[2]}`;
  if (fieldPath === "summary"
    || fieldPath === "professionalTitle"
    || fieldPath === "areasOfExpertise"
    || fieldPath === "professionalObjective"
    || fieldPath.startsWith("identity.")
    || fieldPath.startsWith("contact.")
    || fieldPath.startsWith("keyResults.")) return "summary";
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
