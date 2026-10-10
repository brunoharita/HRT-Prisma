import { safeNavigationPath } from "./uxFoundation.js";

export interface NavigationHistoryEntry {
  index: number;
  path: string;
  scope: string;
  previousPath?: string;
}

/** Only operator routes may be origins; public capability URLs and authentication are excluded. */
export function operatorHistoryPath(path: string): string | null {
  const safe = safeNavigationPath(path);
  if (!safe || /[?#]/.test(safe)) return null;
  return safe === "/" || /^\/(profiles|vacancies|matching|verifications|item-bank|knowledge|users|settings|organizations)(\/|$)/.test(safe) ? safe : null;
}

export function readNavigationHistory(value: unknown, scope: string, pathname: string): NavigationHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<NavigationHistoryEntry>;
  if (entry.scope !== scope || !Number.isSafeInteger(entry.index) || entry.index! < 0
    || typeof entry.path !== "string" || entry.path !== pathname || !operatorHistoryPath(entry.path)) return null;
  if (entry.previousPath !== undefined && (typeof entry.previousPath !== "string" || !operatorHistoryPath(entry.previousPath))) return null;
  return entry as NavigationHistoryEntry;
}

export function previousNavigationPath(entry: NavigationHistoryEntry, scope: string): string | null {
  return entry.scope === scope && entry.index > 0 && entry.previousPath && entry.previousPath !== entry.path
    ? operatorHistoryPath(entry.previousPath) : null;
}

export function nextNavigationEntry(current: NavigationHistoryEntry, scope: string, path: string, replace: boolean): NavigationHistoryEntry {
  const sameScope = current.scope === scope;
  const origin = sameScope ? operatorHistoryPath(current.path) : null;
  const previous = replace ? (sameScope ? current.previousPath : undefined) : origin ?? undefined;
  return {
    index: sameScope ? current.index + (replace ? 0 : 1) : 0,
    path, scope,
    ...(previous && operatorHistoryPath(path) ? { previousPath: previous } : {}),
  };
}
