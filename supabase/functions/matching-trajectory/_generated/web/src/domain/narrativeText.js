// Generated from web/src/domain/narrativeText.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
const EXPLICIT_ITEM_MARKER = /[•▪●◦‣⁃∙]/u;
/** Keeps explicit list markers visible while presenting each item on its own line. */
export function preserveExplicitItemLineBreaks(value) {
    return value
        .replace(/ *([•▪●◦‣⁃∙])/gu, "\n$1")
        .replace(/([•▪●◦‣⁃∙])(?=\S)/gu, "$1 ")
        .replace(/\n{2,}/gu, "\n")
        .trim();
}
export function hasExplicitItemMarker(value) {
    return EXPLICIT_ITEM_MARKER.test(value);
}
