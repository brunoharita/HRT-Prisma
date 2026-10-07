import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Spin } from "antd";
import { loadingActivity } from "./loadingActivity";

/** Register only operations capable of changing this mounted surface. Labels contain no record data. */
export function useLoadingFeedback(operations: Record<string, unknown>) {
  const id = useId();
  const labels = JSON.stringify(Object.entries(operations).filter(([, active]) => Boolean(active)).map(([label]) => label));
  useEffect(() => {
    loadingActivity.update(id, JSON.parse(labels) as string[]);
    return () => loadingActivity.update(id, []);
  }, [id, labels]);
}

/** Counts concurrent action promises; each settlement releases only its own operation. */
export function useLoadingTask(label: string, visible = true) {
  const [count, setCount] = useState(0);
  const mounted = useRef(false);
  const tokens = useRef(new Set<symbol>());
  const visibleRef = useRef(visible); visibleRef.current = visible;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; tokens.current.clear(); }; }, []);
  useEffect(() => { if (!visible) { tokens.current.clear(); setCount(0); } }, [visible]);
  useLoadingFeedback({ [label]: visible && count > 0 });
  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    const token = Symbol();
    if (visibleRef.current) { tokens.current.add(token); setCount(tokens.current.size); }
    try { return await operation(); }
    finally { if (tokens.current.delete(token) && mounted.current) setCount(tokens.current.size); }
  }, []);
  return { run, pending: count > 0 };
}

/** Persistent, non-blocking companion to local skeletons, table and button states. */
export function PrismaLoadingFeedback() {
  const labels = useSyncExternalStore(loadingActivity.subscribe, loadingActivity.getSnapshot, loadingActivity.getSnapshot);
  return <aside className="prisma-loading-feedback" role="status" aria-live="polite" aria-atomic="true" aria-busy={labels.length > 0} hidden={!labels.length}>
    {labels.length ? <><Spin size="small" /><div><strong>{labels.length === 1 ? labels[0] : "Há operações em andamento"}</strong>{labels.length > 1 ? <span>{labels.slice(0, 3).join(" · ")}{labels.length > 3 ? ` · mais ${labels.length - 3}` : ""}</span> : null}</div></> : null}
  </aside>;
}
