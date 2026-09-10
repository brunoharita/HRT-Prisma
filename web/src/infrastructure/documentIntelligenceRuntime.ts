import { resolveDocumentIntelligenceMode } from "../domain/documentIntelligence";
import { PaddleDocumentIntelligenceProvider } from "./paddleDocumentIntelligenceProvider";

export const documentIntelligenceRuntime = {
  mode: resolveDocumentIntelligenceMode(import.meta.env.VITE_DOCUMENT_INTELLIGENCE_MODE),
  provider: new PaddleDocumentIntelligenceProvider(),
};
