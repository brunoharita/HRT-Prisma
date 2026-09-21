const EXPLICIT_ITEM_MARKER = /[•▪●◦‣⁃∙]/u;

/** Keeps explicit list markers visible while presenting each item on its own line. */
export function preserveExplicitItemLineBreaks(value: string): string {
  return value
    .replace(/ *([•▪●◦‣⁃∙])/gu, "\n$1")
    .replace(/([•▪●◦‣⁃∙])(?=\S)/gu, "$1 ")
    .replace(/\n{2,}/gu, "\n")
    .trim();
}

export function hasExplicitItemMarker(value: string): boolean {
  return EXPLICIT_ITEM_MARKER.test(value);
}
