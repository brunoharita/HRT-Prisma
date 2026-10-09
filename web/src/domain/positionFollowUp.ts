export const followUpStages = {
  awaiting_evaluation: "Selecionadas para acompanhamento", evaluating: "Selecionadas para acompanhamento",
  awaiting_interview: "Aguardando entrevista", interview_scheduled: "Entrevista agendada",
  awaiting_decision: "Aguardando decisão", decision_recorded: "Decisão registrada", closed: "Concluído",
} as const;
export type FollowUpStage = keyof typeof followUpStages;
export const followUpColumns = [
  { key: "awaiting_evaluation", title: "Selecionadas para acompanhamento" },
  { key: "awaiting_interview", title: "Aguardando entrevista" },
  { key: "interview_scheduled", title: "Entrevista agendada" },
  { key: "awaiting_decision", title: "Aguardando decisão" },
  { key: "decision_recorded", title: "Decisão registrada" },
] as const;
export function followUpColumn(stage: FollowUpStage): string {
  // Keep legacy rows and audit payloads intact; both old initial stages share one visible phase.
  return stage === "evaluating" ? "awaiting_evaluation" : stage;
}
export function followUpStageAction(stage: string): "schedule" | "decision" | "stage" {
  return stage === "interview_scheduled" ? "schedule" : stage === "decision_recorded" ? "decision" : "stage";
}
export function followUpProcessName(name: string): string {
  return name.replace(/^Avaliação (\d+)$/, "Acompanhamento $1");
}
export interface FollowUpDetails {
  nextAction?: string; assignee?: string | null; dueDate?: string | null; notes?: string;
  interview?: { at: string; timezone: string; participants: string; status: "scheduled" | "cancelled" };
  decision?: { outcome: "proceed" | "do_not_proceed"; rationale: string };
}
export interface FollowUpEntry {
  id: string; personId: string; fullName: string; title: string | null; age: number | null;
  stage: FollowUpStage; revision: number; details: FollowUpDetails;
  profileId: string | null; profileVersion: number | null;
  sourceProfileId: string | null; sourcePositionId: string | null;
  score: number | null; scoreState: "saved" | "updating" | "update_failed" | "unavailable";
  scoreProfileId: string | null; scorePositionId: string | null;
  match: unknown; evaluationId: string | null; profileData: unknown;
}
export interface FollowUpData {
  contract: "position-follow-up-1.0.0";
  process: { id: string; name: string; status: "active" | "closed"; revision: number } | null;
  entries: FollowUpEntry[];
  operators: { id: string; name: string }[];
  history: { id: string; entryId: string | null; action: string; actor: string; at: string; before: unknown; after: unknown }[];
}
export interface FollowUpFilters { search: string; stage: string; assignee: string; due: string; order: string; closed: boolean; }
export function filterFollowUp(entries: FollowUpEntry[], filter: FollowUpFilters, today: string): FollowUpEntry[] {
  const q = filter.search.trim().toLocaleLowerCase("pt-BR");
  return entries.filter(e => (filter.closed ? e.stage === "closed" : e.stage !== "closed")
    && (!q || `${e.fullName} ${e.details.nextAction ?? ""}`.toLocaleLowerCase("pt-BR").includes(q))
    && (!filter.stage || followUpColumn(e.stage) === followUpColumn(filter.stage as FollowUpStage))
    && (!filter.assignee || (filter.assignee === "missing" ? !e.details.assignee : e.details.assignee === filter.assignee))
    && (!filter.due || (filter.due === "missing" ? !e.details.dueDate : filter.due === "overdue" ? Boolean(e.details.dueDate && e.details.dueDate < today) : e.details.dueDate === today)))
    .sort((a,b) => filter.order === "due" ? (a.details.dueDate ?? "9999").localeCompare(b.details.dueDate ?? "9999") || a.fullName.localeCompare(b.fullName,"pt-BR") : a.fullName.localeCompare(b.fullName,"pt-BR"));
}
export const followUpHistoryLabels: Record<string,string> = {
  add: "Pessoa adicionada", stage: "Etapa alterada", details: "Acompanhamento atualizado",
  schedule: "Entrevista agendada/reagendada", cancel_interview: "Entrevista cancelada", decision: "Decisão registrada",
  close: "Acompanhamento concluído", reopen: "Acompanhamento reaberto", close_process: "Processo encerrado", reopen_process: "Processo reaberto",
};

/** Interpret the entered wall time in the explicitly chosen IANA zone. No invented offset. */
export function interviewInstant(wallTime: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wallTime)) throw new Error("Informe a data e a hora da entrevista.");
  const target=Date.parse(`${wallTime}:00Z`);
  const format=new Intl.DateTimeFormat("sv-SE",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  let instant=target;
  for(let i=0;i<3;i++){
    const values=Object.fromEntries(format.formatToParts(instant).map(p=>[p.type,p.value]));
    const displayed=Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
    instant+=target-displayed;
  }
  if(format.format(instant).replace(" ","T").slice(0,16)!==wallTime) throw new Error("Esta hora não existe no fuso selecionado. Confira a data e o fuso.");
  return new Date(instant).toISOString();
}
