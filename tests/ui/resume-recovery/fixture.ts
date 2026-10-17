import { documentFixture, attemptFixture } from "../../fixtures/personFlow.js";
import type { TokenQuote } from "../../../web/src/domain/prismaTokens.js";
const params = new URLSearchParams(location.search);
export const state = { mode: params.get("case") ?? "success", releaseQuote: null as (() => void) | null, quoteCalls: 0, resumeCalls: 0, mutations: [] as string[], confirmed: [] as TokenQuote[], succeeded: false };
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const document = () => documentFixture({ id: "document-fixture", sourceType: "resume_pdf", reviewAttempt: null, documentVersion: 1, filename: "Currículo sintético.pdf", extractionVersion: "pdfjs-5.4.296/parser-ia-spans-v1", status: state.succeeded ? "ready_for_review" : "failed", reviewState: state.succeeded ? "ready_for_review" : "not_ready", isLegacyUnstored: false, latestAttempt: attemptFixture({ usefulCharacterCount: 0, state: state.succeeded ? "structured" : "failed_structuring", failureCode: state.succeeded ? null : "resume_intake_processing_failed" }), ...(state.mode === "approved" ? { status: "approved", reviewState: "approved", profileVersion: 2 } : {}), ...(state.mode === "contract" ? { latestAttempt: attemptFixture({state:"failed_structuring",failureCode:"import_evidence_contract_invalid"}) } : {}), ...(state.mode === "reprocess" ? { extractionVersion: "pdfjs-layout-v1", canReprocess: true } : {}) });
export const ingestion = {
  async loadWorkspace() { return { person: { id: "person-fixture", fullName: "Pessoa sintética" }, selectedDocument: document(), documents: [document()], pages: [], draft: null }; },
  async listDocumentAttempts() { return [document().latestAttempt]; },
  async listAuditEvents() { return []; },
  async resumeFailedAiIntake(org: string, person: string, doc: string, quote: TokenQuote) {
    if (org !== "org-fixture" || person !== "person-fixture" || doc !== "document-fixture" || quote?.organizationId !== org || quote.functionName !== "parser_ia" || quote.amount > quote.available || Date.parse(quote.expiresAt) <= Date.now()) throw Error("Escopo ou consumo inválido no teste.");
    state.resumeCalls++; state.confirmed.push(quote); await pause(350);
    if (state.mode === "failure") throw Error("Falha técnica simulada. O documento e o Perfil vigente permanecem preservados.");
    state.mutations.push("persist", "complete"); state.succeeded = true;
  },
  async reprocessDocument() { state.mutations.push("reprocess"); state.succeeded = true; },
};
export const supabase = { rpc: (_name: string, args: {p_organization_id: string}) => ({ abortSignal: async () => {
  state.quoteCalls++; if (state.mode === "loading" && !state.releaseQuote) await new Promise<void>(resolve => { state.releaseQuote = resolve; }); await pause(35);
  if (state.mode === "error") return { error: {message: "PT_ACCOUNT_DISABLED"}, data: null };
  const quote: TokenQuote = { contract: "prisma-token-quote-1.0.0", id: crypto.randomUUID(), organizationId: args.p_organization_id, functionName: "parser_ia", quantity: 1, tokensPerUnit: 10000, amount: 10000, available: state.mode === "insufficient" ? 9999 : 100000, expiresAt: new Date(Date.now() + (state.mode === "expires" ? 1200 : 600000)).toISOString() };
  return { error: null, data: quote };
} }) };
Object.assign(window, { __recovery: state });
