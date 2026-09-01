import type { DocumentReviewState, ProcessingAttemptView, ResumeIntakeStatus } from "./personIngestion.js";

export const RESUME_PRODUCT_STATE_VERSION = "1.0.0";

export type ResumeProductState =
  | "processing"
  | "requires_identity"
  | "requires_review"
  | "ready_to_publish"
  | "profile_updated"
  | "technical_failure"
  | "discarded";

export type ResumeProductAction =
  | "wait"
  | "confirm_person"
  | "review_resume"
  | "compare_profile"
  | "open_person"
  | "reprocess"
  | "replace_file"
  | "none";

export type ResumeProductSeverity = "neutral" | "info" | "warning" | "success" | "error";

export interface ResumeProductStateInput {
  intakeStatus?: ResumeIntakeStatus | null;
  documentStatus?: string | null;
  reviewState?: DocumentReviewState | null;
  latestAttempt?: ProcessingAttemptView | null;
  reviewAttempt?: ProcessingAttemptView | null;
  reviewComplete?: boolean;
  profilePublished?: boolean;
  profilePreserved?: boolean;
  failureRecoverable?: boolean;
}

export interface ResumeProductStateView {
  state: ResumeProductState;
  label: string;
  message: string;
  nextAction: ResumeProductAction;
  nextActionLabel: string;
  severity: ResumeProductSeverity;
  profilePreserved: boolean;
  documentPreserved: boolean;
  reviewPossible: boolean;
  publicationPossible: boolean;
}

export function deriveResumeProductState(input: ResumeProductStateInput): ResumeProductStateView {
  const profilePreserved = input.profilePreserved === true;
  const base = { profilePreserved, documentPreserved: true };

  if (input.reviewState === "invalidated") return {
    ...base,
    state: "discarded",
    label: "Descartado",
    message: "A importação saiu do fluxo ativo. O documento, o histórico e o perfil vigente foram preservados.",
    nextAction: "none",
    nextActionLabel: "Nenhuma ação ativa",
    severity: "neutral",
    reviewPossible: false,
    publicationPossible: false,
  };

  if (input.profilePublished || input.reviewState === "approved" || input.documentStatus === "approved") return {
    ...base,
    state: "profile_updated",
    label: "Perfil atualizado",
    message: "A nova versão foi publicada e está disponível na Central da Pessoa.",
    nextAction: "open_person",
    nextActionLabel: "Abrir Central da Pessoa",
    severity: "success",
    reviewPossible: false,
    publicationPossible: false,
  };

  if (input.reviewComplete) return {
    ...base,
    state: "ready_to_publish",
    label: "Pronto para publicação",
    message: "A revisão atende aos requisitos e a proposta pode ser comparada com o perfil vigente.",
    nextAction: "compare_profile",
    nextActionLabel: "Comparar com o perfil atual",
    severity: "info",
    reviewPossible: true,
    publicationPossible: true,
  };

  if (requiresIdentity(input.intakeStatus)) return {
    ...base,
    state: "requires_identity",
    label: "Requer identificação",
    message: "Confirme de quem é o currículo antes de estruturar as informações profissionais.",
    nextAction: "confirm_person",
    nextActionLabel: "Confirmar Pessoa",
    severity: "warning",
    reviewPossible: false,
    publicationPossible: false,
  };

  if (isReviewableAttempt(input.reviewAttempt) || input.reviewState === "ready_for_review" || input.reviewState === "in_review") return {
    ...base,
    state: "requires_review",
    label: "Requer revisão",
    message: "O conteúdo foi recuperado, mas alguns pontos precisam de revisão humana antes da publicação.",
    nextAction: "review_resume",
    nextActionLabel: "Revisar currículo",
    severity: "warning",
    reviewPossible: Boolean(input.reviewAttempt && isReviewableAttempt(input.reviewAttempt)),
    publicationPossible: false,
  };

  if (isTechnicalFailure(input.latestAttempt) || input.intakeStatus === "failed" || input.documentStatus === "failed" || input.documentStatus === "extraction_failed" || input.documentStatus === "unsupported_format") return {
    ...base,
    state: "technical_failure",
    label: "Falha técnica",
    message: "O Prisma não conseguiu continuar tecnicamente. O documento recebido permaneceu preservado.",
    nextAction: input.failureRecoverable ? "reprocess" : "replace_file",
    nextActionLabel: input.failureRecoverable ? "Reprocessar" : "Substituir arquivo",
    severity: "error",
    reviewPossible: false,
    publicationPossible: false,
  };

  return {
    ...base,
    state: "processing",
    label: "Processando",
    message: "O Prisma está analisando o documento. O arquivo já foi recebido e preservado.",
    nextAction: "wait",
    nextActionLabel: "Aguardar processamento",
    severity: "info",
    reviewPossible: false,
    publicationPossible: false,
  };
}

function requiresIdentity(status: ResumeIntakeStatus | null | undefined): boolean {
  return status === "needs_human_identity" || status === "needs_duplicate_resolution" || status === "ready_to_resolve";
}

export function isTechnicalFailure(attempt: ProcessingAttemptView | null | undefined): boolean {
  if (!attempt?.state.startsWith("failed")) return false;
  return !isReviewableAttempt(attempt);
}

export function isReviewableAttempt(attempt: ProcessingAttemptView | null | undefined): boolean {
  if (!attempt) return false;
  if (attempt.state === "structured" || attempt.state === "profile_ready") return true;
  return attempt.state === "failed_structuring"
    && attempt.failureCode === "insufficient_structured_facts"
    && attempt.usefulCharacterCount > 0
    && attempt.pagesNative + attempt.pagesOcr > 0;
}
