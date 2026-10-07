/** Presentation only: no network interception, polling, domain data or side effects. */
export function createLoadingActivityStore() {
  const operations = new Map<string, readonly string[]>();
  const listeners = new Set<() => void>();
  let snapshot: readonly string[] = [];
  function update(id: string, labels: readonly string[]) {
    if (labels.length) operations.set(id, labels); else operations.delete(id);
    const next = [...new Set([...operations.values()].flat())];
    if (next.length === snapshot.length && next.every((label, index) => label === snapshot[index])) return;
    snapshot = next;
    listeners.forEach(listener => listener());
  }
  return {
    update,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
  };
}

export const loadingActivity = createLoadingActivityStore();
