export const SELECTION_OUTCOME_CONTRACT = "selection-process-outcome-1.0.0";
export interface SelectionOutcome {
  contract: typeof SELECTION_OUTCOME_CONTRACT;
  outcome: "selected" | "none";
  selectedPersonId: string | null;
  selectedPersonName: string | null;
  closedAt: string;
  actor: string | null;
}
export function isSelectionOutcome(value: unknown): value is SelectionOutcome {
  const result = value as SelectionOutcome | null;
  return Boolean(result && result.contract === SELECTION_OUTCOME_CONTRACT && ["selected", "none"].includes(result.outcome)
    && typeof result.closedAt === "string" && Number.isFinite(Date.parse(result.closedAt))
    && (result.selectedPersonId === null || typeof result.selectedPersonId === "string")
    && (result.selectedPersonName === null || typeof result.selectedPersonName === "string")
    && (result.actor === null || typeof result.actor === "string")
    && (result.outcome === "none" ? result.selectedPersonId === null && result.selectedPersonName === null : result.selectedPersonId === null ? result.selectedPersonName === null : typeof result.selectedPersonName === "string"));
}
export function selectionResultLabel(status: "active" | "closed", outcome?: SelectionOutcome | null, personId?: string): string {
  if (status === "active") return "Em andamento";
  if (!outcome) return "Resultado não informado";
  if (personId) return outcome.outcome === "selected" && outcome.selectedPersonId === personId ? "Escolhida" : "Não escolhida";
  return outcome.outcome === "none" ? "Encerrado sem escolha" : `Pessoa escolhida: ${outcome.selectedPersonName ?? "identidade indisponível"}`;
}
