import { resolveDocumentIntelligenceMode } from "../domain/documentIntelligence";
import { PaddleDocumentIntelligenceProvider } from "./paddleDocumentIntelligenceProvider";

export const documentIntelligenceRuntime = {
  mode: resolveDocumentIntelligenceMode(import.meta.env.VITE_DOCUMENT_INTELLIGENCE_MODE),
  provider: new PaddleDocumentIntelligenceProvider({
    timeoutMs: resolveProviderTimeout(import.meta.env.VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS),
  }),
};

function resolveProviderTimeout(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 30_000 && parsed <= 300_000 ? Math.round(parsed) : 240_000;
}
