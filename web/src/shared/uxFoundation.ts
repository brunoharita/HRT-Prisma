export const UX_FOUNDATION_VERSION = "prisma-ux-foundation-1.0.0";

export const navigationGroups = ["Operação", "Curadoria", "Administração"] as const;
export type NavigationGroup = typeof navigationGroups[number];

export function navigationGroup(path: string): NavigationGroup {
  if (path === "/knowledge" || path === "/item-bank") return "Curadoria";
  if (path === "/users") return "Administração";
  return "Operação";
}

export function isDeliveredNavigation(path: string): boolean {
  return !["/matching", "/organizations"].includes(path);
}

/** Presentation only. Historical data, source terms and persisted identifiers remain untouched. */
export function interfaceText(value: string): string {
  return value.replace(/\bVAGAS\b/g, "POSIÇÕES").replace(/\bVagas\b/g, "Posições").replace(/\bvagas\b/g, "posições")
    .replace(/\bVAGA\b/g, "POSIÇÃO").replace(/\bVaga\b/g, "Posição").replace(/\bvaga\b/g, "posição");
}

export function observedMetric(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "Ainda sem dados"
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

export function resolveRequestedItem<T extends { id: string }>(items: readonly T[], id?: string): T | null {
  return id ? items.find((item) => item.id === id) ?? null : null;
}

export function toggleComparisonSelection(current: readonly string[], id: string): string[] {
  if (current.includes(id)) return current.filter((item) => item !== id);
  return current.length < 2 ? [...current, id] : [...current];
}

export function safeNavigationPath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u0020]/.test(path)) return null;
  return path === "/" ? path : path.replace(/\/+$/, "");
}

/** Only ephemeral filters/selections/UI preferences belong here, never domain records or credentials. */
export class NavigationViewStore {
  private readonly values = new Map<string, unknown>();
  constructor(readonly scope: string) {}
  read<T>(scope: string, key: string, fallback: T): T {
    return scope === this.scope && this.values.has(key) ? this.values.get(key) as T : fallback;
  }
  write<T>(scope: string, key: string, value: T): void {
    if (scope !== this.scope) return;
    if (this.values.size >= 100 && !this.values.has(key)) this.values.delete(this.values.keys().next().value!);
    this.values.set(key, value);
  }
  clear(): void { this.values.clear(); }
}

export class NavigationGuards {
  private readonly guards = new Map<string, () => boolean>();
  register(id: string, dirty: () => boolean): () => void {
    this.guards.set(id, dirty);
    return () => { this.guards.delete(id); };
  }
  get dirty(): boolean { return [...this.guards.values()].some((guard) => guard()); }
  allow(confirm: () => boolean): boolean { return !this.dirty || confirm(); }
}
