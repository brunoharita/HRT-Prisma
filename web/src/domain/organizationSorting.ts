export type OrganizationSort = "name" | "createdAt" | "updatedAt";
export type OrganizationSortDirection = "asc" | "desc";
type SortableOrganization = { id: string; name: string; createdAt?: string | null; updatedAt?: string | null };
const names = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
export function organizationTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
export function sortOrganizations<T extends SortableOrganization>(records: readonly T[], criterion: OrganizationSort, direction: OrganizationSortDirection): T[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    let comparison = 0;
    if (criterion !== "name") {
      const first = organizationTimestamp(a[criterion]), second = organizationTimestamp(b[criterion]);
      // Unknown dates are unavailable, never a synthetic date or an older fact.
      if (first === null && second !== null) return 1;
      if (first !== null && second === null) return -1;
      if (first !== null && second !== null) comparison = first - second;
    }
    return (comparison || names.compare(a.name, b.name) || a.id.localeCompare(b.id)) * multiplier;
  });
}
