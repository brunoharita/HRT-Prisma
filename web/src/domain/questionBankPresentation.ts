import type { GenerationProposalView, GovernedItemView } from "./assessmentItemGovernanceData.js";

export const questionAvailability: Record<GovernedItemView["state"], string> = {
  active: "Ativa no banco", approved: "Aprovada", proposed: "Proposta", in_review: "Em revisão", rejected: "Rejeitada",
  inactive: "Inativa", retired: "Retirada", deprecated: "Descontinuada", compromised: "Uso suspenso por comprometimento",
};
export const proposalSituation: Record<GenerationProposalView["status"], string> = {
  proposed: "Para revisar", validation_failed: "Estrutura inválida", duplicate_candidate: "Possível duplicidade", in_review: "Ajustes solicitados",
  approved: "Aprovada, aguardando disponibilização", rejected: "Rejeitada", published: "Disponibilizada", superseded: "Substituída",
};
export const requestSituation: Record<string,string> = {queued:"Na fila",processing:"Em geração",completed:"Concluída",failed:"Falhou",cancelled:"Cancelada",budget_blocked:"Bloqueada por orçamento"};
export const pendingProposal = (p: GenerationProposalView) => ["proposed","duplicate_candidate","in_review","validation_failed"].includes(p.status);
export const reviewableProposal = (p: GenerationProposalView) => pendingProposal(p);
export const difficultyName = (v: string) => ({low:"Fácil",medium:"Média",high:"Difícil"})[v] ?? "Não informada";
export const scopeName = (v?: string) => v === "global" ? "Global" : v === "organization" ? "Da empresa" : "Destino não informado";
export const normalizeBankText = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
export function bankTextMatches(query: string, values: Array<string|undefined>) { return normalizeBankText(values.filter(Boolean).join(" ")).includes(normalizeBankText(query.trim())); }
export function formatQuestionTime(seconds: number|null|undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "Não disponível";
  const rounded = Math.round(seconds), minutes = Math.floor(rounded / 60), rest = rounded % 60;
  return minutes ? `${minutes} min${rest ? ` ${rest} s` : ""}` : `${rest} s`;
}
export const questionRate = (v: number|null|undefined) => v === null || v === undefined ? "Não disponível" : `${Math.round(v*100)}%`;
export const bankReasonNames: Record<string,string> = {
  STRUCTURE_VALID:"Estrutura válida",SCHEMA_VALID:"Estrutura compatível com o formato",POTENTIAL_PII_DETECTED:"Possível dado pessoal no conteúdo",
  ANSWER_LEAKAGE_DETECTED:"Possível indicação da resposta no enunciado",INVALID_OPTIONS:"Alternativas inválidas",INVALID_CORRECT_OPTION:"Alternativa correta inválida",
  EXACT_DUPLICATE_REVIEW_REQUIRED:"Conteúdo idêntico requer justificativa de exceção",STRONG_SIMILARITY_REVIEW_REQUIRED:"Similaridade forte requer justificativa de exceção",POSSIBLE_DUPLICATE_REVIEW_RECOMMENDED:"Comparação de conteúdo recomendada",
  SYNTHETIC_SAMPLE_NOT_REAL_CALIBRATION:"Amostra sintética não permite calibração real",SYNTHETIC_SAMPLE:"Amostra sintética de teste",INSUFFICIENT_REAL_SAMPLE:"Amostra real insuficiente",NO_VALID_APPLICATIONS:"Nenhuma observação válida nesta amostra",NO_REAL_APPLICATIONS:"Sem aplicações reais nesta amostra",REAL_CALIBRATION_NOT_IMPLEMENTED:"Calibração real indisponível",ELIGIBLE_ITEM_COVERAGE_GAP:"Cobertura elegível insuficiente",COVERAGE_SUFFICIENT:"Cobertura satisfeita",
};
export const bankReasonName = (code: string) => bankReasonNames[code] ?? "Motivo registrado; consulte a referência em detalhes";
