import type { ProcessedDocumentInput } from "../domain/personIngestion";
import { PARSER_IA_VERSION, preparedParserIa, structureParserIa } from "../domain/parserIa";
import { supabase } from "./supabase/client";

export const PARSER_IA_HOSTED_TRANSPORT_VERSION = "parser-ia-hosted-transport-1.0.0";
export type ParserIaMode = "disabled" | "local" | "hosted";

export function parserIaMode(): ParserIaMode {
  if (import.meta.env.VITE_PARSER_IA_MODE === "hosted") return "hosted";
  if (import.meta.env.DEV && import.meta.env.VITE_PARSER_IA_LOCAL === "true" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return "local";
  return "disabled";
}

export function parserIaEnabled(): boolean {
  return parserIaMode() !== "disabled";
}

export async function prepareParserIa(input: ProcessedDocumentInput, organizationId: string): Promise<ProcessedDocumentInput> {
  if (!parserIaEnabled()) return input;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 135000);
  try {
    const mode = parserIaMode();
    if (mode === "disabled") return input;
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const endpoint = mode === "local" ? "/parser-ia-local/parse" : "/parser-ia-hosted/parse";
    if (mode === "local") headers["X-Prisma-Local-Parser"] = "1";
    else {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error("PARSER_SESSION_REQUIRED");
      headers.Authorization = `Bearer ${data.session.access_token}`;
      headers["X-Prisma-Organization-Id"] = organizationId;
      headers["X-Prisma-Parser-Contract"] = PARSER_IA_HOSTED_TRANSPORT_VERSION;
    }
    const response = await fetch(endpoint, {
      method: "POST", headers,
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
