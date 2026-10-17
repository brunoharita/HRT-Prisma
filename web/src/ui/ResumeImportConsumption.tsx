import { useEffect, useState } from "react";
import { Button } from "antd";
import { formatTokens, quoteUsable, type TokenQuote } from "../domain/prismaTokens";
import { useTokenQuote } from "./TokenUsageHint";

/** Only the recovery screen owns this confirmation; consulting never starts AI. */
export function useResumeImportConsumption(organizationId: string, enabled: boolean) {
  const state = useTokenQuote(organizationId, "parser_ia", 1, enabled);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!state.quote) return;
    const remaining = Date.parse(state.quote.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 1, 2147483647));
    return () => window.clearTimeout(timer);
  }, [state.quote]);

  function usable(quote: TokenQuote | null, at: number) {
    return quoteUsable(quote, organizationId, 1, at) && quote?.functionName === "parser_ia";
  }
  const valid = usable(state.quote, Math.max(now, Date.now()));
  const sufficient = !!state.quote && state.quote.amount <= state.quote.available;
  const allowed = enabled && valid && sufficient && !state.loading && !state.error;
  function confirm() {
    if (!enabled || state.loading || state.error || !usable(state.quote, Date.now())) throw Error("Atualize a previsão de consumo antes de retomar a importação.");
    if (!state.quote || state.quote.amount > state.quote.available) throw Error("Saldo insuficiente de Tokens Prisma. Consulte o administrador da empresa.");
    return state.quote;
  }
  return { ...state, valid, sufficient, allowed, confirm };
}

export function ResumeImportConsumption({ consumption, busy }: { consumption: ReturnType<typeof useResumeImportConsumption>; busy: boolean }) {
  const { quote, loading, error, valid, sufficient, refresh } = consumption;
  return <div aria-label="Consumo da retomada">
    <p role="status">{loading ? "Consultando consumo…" : error ?? (!valid ? "A previsão de consumo está indisponível ou expirou. Atualize antes de retomar." : quote ? `Consumo previsto: ${formatTokens(quote.amount)} Tokens Prisma. Saldo disponível: ${formatTokens(quote.available)}.` : "Consumo indisponível.")}</p>
    {!loading && valid && !error && !sufficient ? <p role="alert">Saldo insuficiente de Tokens Prisma. Consulte o administrador da empresa.</p> : null}
    <Button disabled={busy || loading} onClick={refresh}>Atualizar consumo</Button>
    <p>A retomada só começa ao clicar em Retomar importação com IA. Reutilizar conteúdo existente não consome novamente.</p>
  </div>;
}
