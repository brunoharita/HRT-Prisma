import type { ExtractedPage, StructuredDraft } from "./personIngestion.js";

export const IMPORT_TEXT_UNICODE_VERSION = "unicode-text-1.0.0";
export interface UnicodeReplacements { nul: number; unpairedSurrogates: number; }

// PostgreSQL text/jsonb cannot store NUL or malformed UTF-16. Valid Unicode is immutable.
export function representImportText(text: string): { text: string; replacements: UnicodeReplacements } {
  let represented = "";
  const replacements = { nul: 0, unpairedSurrogates: 0 };
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 0) { represented += "\uFFFD"; replacements.nul += 1; }
    else if (code >= 0xD800 && code <= 0xDBFF) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) { represented += text.slice(index, index + 2); index += 1; }
      else { represented += "\uFFFD"; replacements.unpairedSurrogates += 1; }
    } else if (code >= 0xDC00 && code <= 0xDFFF) { represented += "\uFFFD"; replacements.unpairedSurrogates += 1; }
    else represented += text[index];
  }
  return { text: represented, replacements };
}

export function containsInvalidImportUnicode(value: unknown, keysOnly = false): boolean {
  if (typeof value === "string") return !keysOnly && representImportText(value).text !== value;
  if (Array.isArray(value)) return value.some((item) => containsInvalidImportUnicode(item, keysOnly));
  if (value && typeof value === "object") return Object.entries(value).some(([key, item]) => representImportText(key).text !== key || containsInvalidImportUnicode(item, keysOnly));
  return false;
}

function representJson<T>(value: T, replacements: UnicodeReplacements): T {
  if (typeof value === "string") {
    const represented = representImportText(value);
    replacements.nul += represented.replacements.nul;
    replacements.unpairedSurrogates += represented.replacements.unpairedSurrogates;
    return represented.text as T;
  }
  if (Array.isArray(value)) return value.map((item) => representJson(item, replacements)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, representJson(item, replacements)])) as T;
  return value;
}

export function prepareImportText(pages: ExtractedPage[], draft: StructuredDraft): { pages: ExtractedPage[]; draft: StructuredDraft } {
  // Keys are structural authority; never repair them or risk a collision.
  if (containsInvalidImportUnicode(pages, true) || containsInvalidImportUnicode(draft, true)) throw new Error("IMPORT_UNICODE_KEY_INVALID");
  const warnings: string[] = [];
  const preparedPages = pages.map((page) => {
    const replacements = { nul: 0, unpairedSurrogates: 0 };
    const represented = representJson(page, replacements);
    if (!replacements.nul && !replacements.unpairedSurrogates) return page;
    warnings.push(`Página ${page.pageNumber}: símbolo não identificado (�) no texto derivado. Confira os marcadores e o conteúdo no PDF original.`);
    return { ...represented, methodVersion: `${page.methodVersion}/${IMPORT_TEXT_UNICODE_VERSION}:nul=${replacements.nul}:surrogate=${replacements.unpairedSurrogates}` };
  });
  const draftReplacements = { nul: 0, unpairedSurrogates: 0 };
  const representedDraft = representJson(draft, draftReplacements);
  if (draftReplacements.nul || draftReplacements.unpairedSurrogates) warnings.push(`Há símbolo não identificado (�) nos campos derivados: ${draftReplacements.nul + draftReplacements.unpairedSurrogates} ocorrências representadas. Confira o conteúdo no PDF original.`);
  const uncertainties = [...representedDraft.uncertainties];
  for (const warning of warnings) if (!uncertainties.includes(warning)) uncertainties.push(warning);
  return { pages: preparedPages, draft: warnings.length ? { ...representedDraft, uncertainties } : draftReplacements.nul || draftReplacements.unpairedSurrogates ? representedDraft : draft };
}
