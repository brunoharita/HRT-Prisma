import type { ResumeProcessingProgress } from "./personIngestion.js";
import type { OperationRecovery } from "./reviewOperationErrors.js";

export function importProcessingPresentation(progress: ResumeProcessingProgress | null, error: string | null, recovery: OperationRecovery) {
  const ready = progress?.stage === "ready_for_review" && !error;
  return {
    currentStep: ready ? 3 : 2,
    status: error ? "error" as const : "process" as const,
    percent: ready ? 100 : progress?.stage === "persisting" ? 70 : 50,
    title: error ? "Processamento interrompido antes de disponibilizar a revisão." : progress?.message ?? "Preparando processamento...",
    detail: error ? recovery === "await-system-update" ? "A leitura foi preservada. Esta falha exige correção do sistema antes da retomada." : "O processamento foi interrompido. Use a ação indicada para continuar." : "Isso pode levar alguns instantes.",
    preservedMessage: "O documento foi preservado e nenhum Perfil foi publicado nesta etapa. O progresso anterior não significa que a gravação foi concluída.",
  };
}
