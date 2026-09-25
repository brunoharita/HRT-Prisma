import { useCallback, useEffect, useRef, useState } from "react";
import { currentParserReadiness, type ParserReadiness } from "../domain/parserReadiness";
import { checkParserIaReadiness } from "../infrastructure/parserIaClient";

export function useParserReadiness(organizationId: string, active: boolean) {
  const [value, setValue] = useState<ParserReadiness>({ state: "checking", reason: "checking", organizationId, observedAt: Date.now() });
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setValue({ state: "checking", reason: "checking", organizationId, observedAt: Date.now() });
    const result = await checkParserIaReadiness(organizationId, controller.signal);
    if (request !== sequence.current || controller.signal.aborted) return { ...result, state: "checking" as const, reason: "superseded" };
    setValue(result);
    return result;
  }, [organizationId]);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const recheck = () => { if (document.visibilityState === "visible") void refresh(); };
    const periodic = window.setInterval(recheck, 30000);
    const expire = window.setInterval(() => setValue((previous) => currentParserReadiness(previous, organizationId)), 1000);
    window.addEventListener("focus", recheck);
    return () => {
      ++sequence.current; pending.current?.abort();
      window.clearInterval(periodic); window.clearInterval(expire); window.removeEventListener("focus", recheck);
    };
  }, [organizationId, active, refresh]);

  return { readiness: currentParserReadiness(value, organizationId), refresh };
}
