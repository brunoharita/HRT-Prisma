import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildPdfLayoutLines, isNativeTextSufficient, usefulCharacterCount } from "../dist/web/src/domain/personIngestion.js";
import { linkedInMainColumn } from "../dist/web/src/domain/linkedinPdfEvaluation.js";

export async function readLinkedInPdf(path, expectedHash) {
  const bytes = await readFile(path);
  if (bytes.length > 15 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("INVALID_PDF");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!expectedHash || sha256 !== expectedHash.toLowerCase()) throw new Error("SOURCE_HASH_MISMATCH");
  const pdf = await getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false }).promise;
  try {
    if (pdf.numPages > 50) throw new Error("PAGE_LIMIT");
    const rawPages = [];
    const links = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const text = await page.getTextContent();
      const items = text.items;
      rawPages.push({ pageNumber, items, width: viewport.width, height: viewport.height });
      for (const annotation of await page.getAnnotations()) {
        if (annotation.subtype !== "Link" || !annotation.url || !Array.isArray(annotation.rect)) continue;
        const [x1, y1, x2, y2] = annotation.rect;
        links.push({ pageNumber, url: annotation.url, x: x1 / viewport.width, y: (viewport.height - y2) / viewport.height, width: (x2 - x1) / viewport.width, height: (y2 - y1) / viewport.height });
      }
    }
    const mainX = linkedInMainColumn(rawPages.flatMap((page) => page.items.flatMap((item) => buildPdfLayoutLines([item], page.width, page.height))));
    const baseline = [];
    const adapted = [];
    for (const page of rawPages) {
      const nativeLines = buildPdfLayoutLines(page.items, page.width, page.height);
      const main = mainX === null ? page.items : page.items.filter((item) => Array.isArray(item.transform) && item.transform[4] / page.width >= mainX - 0.025);
      const side = mainX === null ? [] : page.items.filter((item) => Array.isArray(item.transform) && item.transform[4] / page.width < mainX - 0.025);
      const separated = [...buildPdfLayoutLines(main, page.width, page.height), ...buildPdfLayoutLines(side, page.width, page.height)].sort((a, b) => a.y - b.y || a.x - b.x);
      const asPage = (layoutLines, methodVersion) => {
        const text = layoutLines.map((line) => line.text).join("\n");
        return { pageNumber: page.pageNumber, text, layoutLines, origin: "native_pdf", usefulCharacterCount: usefulCharacterCount(text), method: "pdfjs", methodVersion };
      };
      baseline.push(asPage(nativeLines, "pdfjs-5.4.296/layout-v2"));
      adapted.push(asPage(separated, "linkedin-native-columns-1.0.0"));
    }
    return { sha256, pages: adapted, baselinePages: baseline, links, nativeSufficientPages: adapted.filter((page) => isNativeTextSufficient(page.text)).length, pageCount: pdf.numPages };
  } finally { await pdf.destroy(); }
}
