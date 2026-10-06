import type { PersonDocumentTimelineItem, PersonIngestionWorkspace } from "./personIngestion.js";
import { PERIOD_FORMAT_MESSAGES, reviewPeriodProblem } from "./reviewPeriodFormat.js";
import { reviewEntityPathSegment } from "./reviewFieldLifecycle.js";

/** A precise destination only when the draft belongs to this document and the existing validator diagnoses it. */
export function personReviewNotice(workspace: PersonIngestionWorkspace, document: PersonDocumentTimelineItem): {title: string; description: string; fieldPath: string} | null {
  if (workspace.selectedDocument?.id !== document.id || !document.reviewAttempt || !workspace.draft) return null;
  for (const item of workspace.draft.education) {
    const problem = reviewPeriodProblem(item.period);
    if (!problem || problem === "unrecognized") continue;
    return {title: problem === "missing_start" ? "Período de formação incompleto" : "Período de formação a conferir", description: `No Documento v${document.documentVersion}, ${problem === "missing_start" ? "foi informado apenas que a formação é atual, sem quando começou. Confira a fonte, preservando o dado ausente se ela não informar." : PERIOD_FORMAT_MESSAGES[problem]}`, fieldPath: `education.${reviewEntityPathSegment("education", item.id)}.period`};
  }
  return null;
}
