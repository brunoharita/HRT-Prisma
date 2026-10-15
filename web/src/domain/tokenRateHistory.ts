import type { TokenRate } from "./prismaTokens.js";

/** Mirrors quote selection: effective_at <= now, then effective_at/created_at/id DESC. */
export function classifyTokenRates(rates: readonly TokenRate[], now = Date.now()) {
  const ordered = [...rates].sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt)
    || Date.parse(b.createdAt ?? b.effectiveAt) - Date.parse(a.createdAt ?? a.effectiveAt)
    || b.id.localeCompare(a.id));
  const current = new Map<string, TokenRate>();
  const history = new Map<string, { effectiveAt: string; scheduled: boolean; rates: TokenRate[] }>();
  for (const rate of ordered) {
    const scheduled = Date.parse(rate.effectiveAt) > now;
    if (!scheduled && !current.has(rate.functionName)) current.set(rate.functionName, rate);
    else {
      const group = history.get(rate.effectiveAt) ?? { effectiveAt: rate.effectiveAt, scheduled, rates: [] };
      group.rates.push(rate);
      history.set(rate.effectiveAt, group);
    }
  }
  return { current: [...current.values()], history: [...history.values()] };
}
