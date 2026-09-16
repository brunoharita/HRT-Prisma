import { resolveDocumentIntelligenceMode } from "../domain/documentIntelligence";
import { PaddleDocumentIntelligenceProvider } from "./paddleDocumentIntelligenceProvider";
import { supabase } from "./supabase/client";

export const documentIntelligenceRuntime = {
  mode: resolveDocumentIntelligenceMode(import.meta.env.VITE_DOCUMENT_INTELLIGENCE_MODE),
  providerForOrganization: (organizationId: string) => new PaddleDocumentIntelligenceProvider({
    timeoutMs: resolveProviderTimeout(import.meta.env.VITE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS),
    requestHeaders: async () => {
      // The Vite-only loopback route remains compatible; hosted calls require live session authority.
      if (import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return {};
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token || !organizationId) throw new Error("Document transport requires a session and organization.");
      return {
        Authorization: `Bearer ${data.session.access_token}`,
        "X-Prisma-Organization-Id": organizationId,
        "X-Prisma-Document-Contract": "paddle-hosted-transport-1.0.0",
      };
    },
  }),
};

function resolveProviderTimeout(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 30_000 && parsed <= 300_000 ? Math.round(parsed) : 240_000;
}
