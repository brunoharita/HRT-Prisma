import { useCallback, useEffect, useRef, useState } from "react";
import type { FollowUpData } from "../domain/positionFollowUp";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";

/** One current-cycle read per discovery page; no per-candidate queries or passive writes. */
export function usePositionFollowUpMemberships(organizationId: string, vacancyId: string, enabled: boolean) {
  const scope = `${organizationId}:${vacancyId}:${enabled}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const request = useRef(0);
  const [snapshot, setSnapshot] = useState<{ scope: string; data: FollowUpData | null; loading: boolean; error: string | null }>({ scope, data: null, loading: enabled, error: null });
  const reload = useCallback(async () => {
    if (!enabled) return;
    const ticket = ++request.current;
    setSnapshot(previous => ({ scope, data: previous.scope === scope ? previous.data : null, loading: true, error: null }));
    try {
      const data = await positionFollowUpService.load(organizationId, vacancyId);
      if (data.process?.isCurrent === false || (!data.process && data.entries.length)) throw new Error("Não foi possível confirmar o processo atual de acompanhamento.");
      if (request.current === ticket && currentScope.current === scope) setSnapshot({ scope, data, loading: false, error: null });
    } catch (error) {
      if (request.current === ticket && currentScope.current === scope) setSnapshot(previous => ({ ...previous, loading: false, error: error instanceof Error ? error.message : "Não foi possível consultar o acompanhamento." }));
    }
  }, [enabled, organizationId, vacancyId, scope]);
  useEffect(() => {
    if (!enabled) { setSnapshot({ scope, data: null, loading: false, error: null }); return; }
    void reload();
    const focus = () => { void reload(); };
    window.addEventListener("focus", focus);
    return () => { request.current++; window.removeEventListener("focus", focus); };
  }, [enabled, scope, reload]);
  const confirm = useCallback((data: FollowUpData) => {
    if (currentScope.current !== scope) return;
    request.current++; // A returned mutation supersedes any older read in flight.
    setSnapshot({ scope, data, loading: false, error: null });
  }, [scope]);
  const valid = snapshot.scope === scope && enabled;
  return { data: valid ? snapshot.data : null, loading: enabled && (!valid || snapshot.loading), error: valid ? snapshot.error : null,
    confirmed: valid && !snapshot.loading && !snapshot.error && snapshot.data !== null, reload, confirm };
}
