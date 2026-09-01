import type {
  CurrentProfileSummary,
  DocumentReviewState,
  PersonDocumentTimelineItem,
  ProcessingAttemptView,
} from "./personIngestion.js";
import { deriveResumeProductState, isReviewableAttempt, isTechnicalFailure as isResumeTechnicalFailure } from "./resumeProductState.js";

export const DOCUMENT_PRESENTATION_VERSION = "2.0.0";

export type DocumentOperationalState =
  | "none"
  | "received"
  | "processing"
  | "requires_review"
  | "processed"
  | "technical_failure"
  | "discarded";

export type PresentationTone = "neutral" | "processing" | "review" | "success" | "danger";

export interface DocumentPresentation {
  state: DocumentOperationalState;
  label: string;
  description: string;
  nextAction: string;
  tone: PresentationTone;
  requiresAction: boolean;
}

type PresentableDocument = Pick<PersonDocumentTimelineItem, "reviewState" | "status" | "latestAttempt" | "reviewAttempt">;

export function presentDocument(document: PresentableDocument | null): DocumentPresentation {
  if (!document) return {
    state: "none",
    label: "Sem nova importação",
    description: "Nenhuma importação foi registrada.",
    nextAction: "Nenhuma ação necessária",
    tone: "neutral",
    requiresAction: false,
  };

  const product = deriveResumeProductState({
    documentStatus: document.status,
    reviewState: document.reviewState,
    latestAttempt: document.latestAttempt,
    reviewAttempt: document.reviewAttempt,
  });
  if (product.state === "discarded") return { state: "discarded", label: product.label, description: product.message, nextAction: product.nextActionLabel, tone: "neutral", requiresAction: false };
  if (product.state === "profile_updated") return { state: "processed", label: product.label, description: product.message, nextAction: product.nextActionLabel, tone: "success", requiresAction: false };
  if (product.state === "requires_review" || product.state === "ready_to_publish") return { state: "requires_review", label: product.label, description: product.message, nextAction: product.nextActionLabel, tone: "review", requiresAction: true };
  if (product.state === "technical_failure") return { state: "technical_failure", label: product.label, description: product.message, nextAction: product.nextActionLabel, tone: "danger", requiresAction: true };
  if (!document.latestAttempt) return { state: "received", label: "Recebido", description: "Documento recebido e preservado, aguardando processamento.", nextAction: product.nextActionLabel, tone: "neutral", requiresAction: false };
  return { state: "processing", label: product.label, description: product.message, nextAction: product.nextActionLabel, tone: "processing", requiresAction: false };
}

export function currentProfileLabel(profile: CurrentProfileSummary | null): string {
  return profile ? `Perfil v${profile.profileVersion} aprovado` : "Sem perfil aprovado";
}

export function currentProfileDescription(profile: CurrentProfileSummary | null): string {
  return profile ? "Disponível no Prisma" : "Uma versão será criada somente após revisão e aprovação";
}

export function isReviewableDocument(document: PresentableDocument | null): boolean {
  return Boolean(document?.reviewAttempt && presentDocument(document).state === "requires_review"
    && isRecoverableReviewAttempt(document.reviewAttempt));
}

export function countPendingReviews(documents: PresentableDocument[]): number {
  return documents.filter((document) => presentDocument(document).state === "requires_review").length;
}

export function isTechnicalFailure(attempt: ProcessingAttemptView | null): boolean {
  return isResumeTechnicalFailure(attempt);
}

export function isRecoverableReviewAttempt(attempt: ProcessingAttemptView | null): boolean {
  return isReviewableAttempt(attempt);
}

export function isDocumentReviewState(value: string): value is DocumentReviewState {
  return ["not_ready", "ready_for_review", "in_review", "approved", "invalidated"].includes(value);
}
