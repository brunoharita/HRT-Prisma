import type {
  CurrentProfileSummary,
  DocumentReviewState,
  PersonDocumentTimelineItem,
  ProcessingAttemptView,
} from "./personIngestion.js";

export const DOCUMENT_PRESENTATION_VERSION = "1.2.0";

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

  if (document.reviewState === "invalidated") return {
    state: "discarded",
    label: "Importação arquivada",
    description: "A pendência foi encerrada e o histórico foi preservado.",
    nextAction: "Nenhuma pendência ativa",
    tone: "neutral",
    requiresAction: false,
  };

  if (document.reviewState === "approved" || document.status === "approved") return {
    state: "processed",
    label: "Processado",
    description: "Documento estruturado e revisão concluída.",
    nextAction: "Nenhuma ação necessária",
    tone: "success",
    requiresAction: false,
  };

  if (document.reviewAttempt && isRecoverableReviewAttempt(document.reviewAttempt)) return {
    state: "requires_review",
    label: "Requer revisão",
    description: document.reviewAttempt.state === "failed_structuring"
      ? "Conteúdo recuperado, mas o reconhecimento automático precisa de complementação humana."
      : "Conteúdo recuperado, revisão humana necessária.",
    nextAction: "Revisar nova importação",
    tone: "review",
    requiresAction: true,
  };

  if (isTechnicalFailure(document.latestAttempt)) return {
    state: "technical_failure",
    label: "Falha técnica",
    description: "O arquivo ou o processamento encontrou um erro técnico.",
    nextAction: "Reprocessar ou substituir arquivo",
    tone: "danger",
    requiresAction: true,
  };

  if (document.reviewState === "ready_for_review" || document.reviewState === "in_review") return {
    state: "requires_review",
    label: "Requer revisão",
    description: "Conteúdo recuperado, revisão humana necessária.",
    nextAction: "Revisar nova importação",
    tone: "review",
    requiresAction: true,
  };

  if (!document.latestAttempt) return {
    state: "received",
    label: "Recebido",
    description: "Documento preservado e aguardando processamento.",
    nextAction: "Aguardar processamento",
    tone: "neutral",
    requiresAction: false,
  };

  return {
    state: "processing",
    label: "Processando",
    description: "Documento preservado e em processamento.",
    nextAction: "Aguardar processamento",
    tone: "processing",
    requiresAction: false,
  };
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
  return Boolean(attempt?.state.startsWith("failed"));
}

export function isRecoverableReviewAttempt(attempt: ProcessingAttemptView | null): boolean {
  if (!attempt) return false;
  if (attempt.state === "structured" || attempt.state === "profile_ready") return true;
  return attempt.state === "failed_structuring"
    && attempt.failureCode === "insufficient_structured_facts"
    && attempt.usefulCharacterCount > 0
    && attempt.pagesNative + attempt.pagesOcr > 0;
}

export function isDocumentReviewState(value: string): value is DocumentReviewState {
  return ["not_ready", "ready_for_review", "in_review", "approved", "invalidated"].includes(value);
}
