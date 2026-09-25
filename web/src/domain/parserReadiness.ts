export const PARSER_READINESS_VERSION = "parser-ia-readiness-1.0.0";
export const PARSER_READINESS_TTL_MS = 45000;
export type ParserReadinessState = "checking" | "available" | "busy" | "unavailable" | "unknown";
export interface ParserReadiness {
  state: ParserReadinessState;
  reason: string;
  organizationId: string;
  observedAt: number;
}

const reasons: Record<string, ParserReadinessState> = {
  ready: "available", worker_busy: "busy", configuration_missing: "unavailable", parser_disabled: "unavailable",
  worker_unreachable: "unavailable", check_failed: "unknown", check_timeout: "unknown",
};

export function decodeParserReadiness(value: unknown, organizationId: string, observedAt = Date.now()): ParserReadiness {
  const unknown: ParserReadiness = { state: "unknown", reason: "check_failed", organizationId, observedAt };
  if (!value || typeof value !== "object") return unknown;
  const result = value as Record<string, unknown>;
  if (result.version !== PARSER_READINESS_VERSION || typeof result.reason !== "string"
    || !Object.hasOwn(reasons, result.reason) || reasons[result.reason] !== result.state) return unknown;
  return { state: reasons[result.reason]!, reason: result.reason, organizationId, observedAt };
}

export function currentParserReadiness(value: ParserReadiness, organizationId: string, now = Date.now()): ParserReadiness {
  if (value.organizationId !== organizationId || now - value.observedAt >= PARSER_READINESS_TTL_MS || now < value.observedAt) {
    return { state: "unknown", reason: "stale", organizationId, observedAt: 0 };
  }
  return value;
}

export function parserReadinessBlocksImport(value: ParserReadiness): boolean {
  return value.state === "busy" || value.state === "unavailable" || value.state === "checking";
}

export const parserReadinessTitles: Record<ParserReadinessState, string> = {
  checking: "Verificando disponibilidade da importação…",
  available: "Serviço de importação disponível",
  busy: "Há uma importação em andamento. Aguarde.",
  unavailable: "Importação temporariamente indisponível",
  unknown: "Não foi possível confirmar a disponibilidade",
};
