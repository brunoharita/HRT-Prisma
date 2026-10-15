import { parseResumePeriod } from "../../../src/domain/resumeDates.js";
export interface DirectoryConcept { id: string; label: string; version: number; method: "approved_exact_alias" | "ai_grouping" | "human_confirmed"; active?: boolean }
export interface DirectoryEntry {
  personId: string; profileId: string; profileVersion: number; experienceIndex: number;
  originalRole: string | null; organization: string | null; period: string | null;
  status: string; methodVersion: string; globalVersion: number | null; organizationVersion: number | null;
  areas: DirectoryConcept[]; function: DirectoryConcept | null;
}
export type DirectoryScope = "recent" | "trajectory";
export function directoryEntries(entries: DirectoryEntry[] | null | undefined, scope: DirectoryScope, today = new Date()): { entries: DirectoryEntry[]; chronologyKnown: boolean } {
  const source = entries ?? [];
  const dated = source.map(entry => ({ entry, period: parseResumePeriod(entry.period ?? "") }));
  const month = (d: { year: number; month: number }) => d.year * 12 + d.month;
  const reference = today.getFullYear() * 12 + today.getMonth() + 1;
  const known = dated.length > 0 && dated.every(({period:p}) => p?.isRange && p.start && !p.start.inferred.includes("month")
    && month(p.start) <= reference && (p.current || p.end && !p.end.inferred.includes("month") && month(p.end) <= reference && month(p.end) >= month(p.start)));
  if (scope === "trajectory") return { entries: source, chronologyKnown: known };
  if (!known) return { entries: [], chronologyKnown: false };
  const current = dated.filter(x => x.period?.current);
  const end = Math.max(...dated.map(x => x.period?.end ? month(x.period.end) : -Infinity));
  return { entries: (current.length ? current : dated.filter(x => x.period?.end && month(x.period.end) === end)).map(x => x.entry), chronologyKnown: true };
}
export function matchesDirectory(entry: DirectoryEntry, area: string, role: string): boolean {
  return (!area || entry.areas.some(c => c.id === area)) && (!role || entry.function?.id === role);
}
export function directorySearch(entries: DirectoryEntry[] | null | undefined): string {
  return (entries ?? []).flatMap(e => [e.originalRole, e.organization, e.period, e.function?.label, ...e.areas.map(a => a.label)]).filter(Boolean).join(" ");
}
