import type { ProcessedDocumentInput } from "../domain/personIngestion";
import { PARSER_IA_VERSION, preparedParserIa, structureParserIa } from "../domain/parserIa";

export function parserIaEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_PARSER_IA_LOCAL === "true" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export async function prepareParserIa(input: ProcessedDocumentInput, organizationId: string): Promise<ProcessedDocumentInput> {
  if (!parserIaEnabled()) return input;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 135000);
  try {
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const response = await fetch("/parser-ia-local/parse", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Prisma-Local-Parser": "1" },
      body: JSON.stringify({ organizationId, sourceSha256: input.sha256, pdfBase64: btoa(binary) }), signal: controller.signal,
    });
    if (!response.ok) throw new Error("PARSER_UNAVAILABLE");
    const output = await response.json() as { pages: ProcessedDocumentInput["pages"]; result: NonNullable<ProcessedDocumentInput["parserIa"]> };
    const received = output.result;
    if (received?.version !== PARSER_IA_VERSION || received.organizationId !== organizationId || received.sourceSha256 !== input.sha256 || !Array.isArray(output.pages) || output.pages.length !== input.pages.length) throw new Error("PARSER_BINDING_INVALID");
    const parsed = structureParserIa({ status: received.status === "partial" ? "partial" : "complete", facts: received.acceptedFacts, uncertainties: received.draft.uncertainties }, output.pages, { sourceSha256: input.sha256, organizationId, provenance: received.provenance });
    const prepared = { ...input, pages: output.pages, nativePageCount: output.pages.length, ocrPageCount: 0, parserIa: parsed };
    preparedParserIa(prepared, organizationId);
    return prepared;
  } catch {
    throw new Error("Não foi possível concluir a interpretação por IA. Nenhum campo foi preenchido por essa tentativa. Tente novamente ou utilize a leitura local disponível.");
  } finally { window.clearTimeout(timer); }
}
