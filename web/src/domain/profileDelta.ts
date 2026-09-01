import type { StructuredDraft } from "./personIngestion.js";

export const PROFILE_PUBLICATION_DELTA_VERSION = "1.0.0";

export type ProfileDeltaKind = "added" | "updated" | "maintained" | "not_cited" | "explicit_removal";
export type ProfileDeltaSection = "summary" | "experiences" | "competencies" | "education" | "languages" | "certifications" | "others" | "private_contact";

export interface ProfileDeltaItem {
  key: string;
  section: ProfileDeltaSection;
  kind: ProfileDeltaKind;
  label: string;
  before: string | null;
  after: string | null;
  removable: boolean;
  provenance: "approved" | "explicit" | "normalized" | "human";
}

export interface ProfileDelta {
  items: ProfileDeltaItem[];
  counts: Record<ProfileDeltaKind, number>;
  firstPublication: boolean;
}

export interface ProfileDeltaContext {
  currentContact?: { city?: string | null; state?: string | null; phone?: string | null; email?: string | null; linkedin?: string | null };
  explicitRemovalKeys?: ReadonlySet<string>;
}

export function deriveProfileDelta(current: StructuredDraft | null, proposal: StructuredDraft, context: ProfileDeltaContext = {}): ProfileDelta {
  const removals = context.explicitRemovalKeys ?? new Set<string>();
  const items: ProfileDeltaItem[] = [];
  scalar(items, "summary", "professionalTitle", "Título profissional", current?.professionalTitle ?? null, proposal.professionalTitle, removals);
  scalar(items, "summary", "professionalObjective", "Objetivo profissional", current?.professionalObjective ?? null, proposal.professionalObjective, removals);
  scalar(items, "summary", "summary", "Resumo profissional", current?.summary ?? null, proposal.summary, removals);
  list(items, "summary", "areasOfExpertise", "Área de atuação", current?.areasOfExpertise ?? [], proposal.areasOfExpertise, removals);
  entities(items, "experiences", "experiences", current?.experiences ?? [], proposal.experiences, experienceIdentity, experienceLabel, removals);
  entities(items, "education", "education", current?.education ?? [], proposal.education, educationIdentity, educationLabel, removals);
  list(items, "competencies", "competencies", "Competência explícita", current?.competencies ?? [], proposal.competencies, removals);
  list(items, "languages", "languages", "Idioma", current?.languages ?? [], proposal.languages, removals);
  list(items, "certifications", "certifications", "Certificação", current?.certifications ?? [], proposal.certifications, removals);
  entities(items, "others", "keyResults", current?.keyResults ?? [], proposal.keyResults, (item) => normalized(item.value), (item) => item.value, removals);
  entities(items, "others", "customSections", current?.customSections ?? [], proposal.customSections, (item) => normalized(item.name), (item) => item.name, removals);

  const currentContact = context.currentContact;
  if (currentContact) {
    scalar(items, "private_contact", "contact.city", "Cidade", currentContact.city ?? null, proposal.contact.city, removals, false);
    scalar(items, "private_contact", "contact.state", "Estado", currentContact.state ?? null, proposal.contact.state, removals, false);
    scalar(items, "private_contact", "contact.phone", "Telefone", currentContact.phone ?? null, proposal.contact.phone, removals, false);
    scalar(items, "private_contact", "contact.email", "E-mail", currentContact.email ?? null, proposal.contact.email, removals, false);
    scalar(items, "private_contact", "contact.linkedin", "LinkedIn", currentContact.linkedin ?? null, proposal.contact.linkedin, removals, false);
  }

  const counts: Record<ProfileDeltaKind, number> = { added: 0, updated: 0, maintained: 0, not_cited: 0, explicit_removal: 0 };
  for (const item of items) counts[item.kind] += 1;
  return { items, counts, firstPublication: current === null };
}

function scalar(
  output: ProfileDeltaItem[], section: ProfileDeltaSection, key: string, label: string,
  before: string | null, after: string | null, removals: ReadonlySet<string>, removable = true,
): void {
  const previous = clean(before);
  const next = clean(after);
  if (!previous && !next) return;
  output.push({
    key,
    section,
    kind: removals.has(key) && previous ? "explicit_removal" : !previous ? "added" : !next ? "not_cited" : normalized(previous) === normalized(next) ? "maintained" : "updated",
    label,
    before: previous,
    after: next,
    removable: removable && Boolean(previous),
    provenance: previous && !next ? "approved" : "explicit",
  });
}

function list(
  output: ProfileDeltaItem[], section: ProfileDeltaSection, root: string, label: string,
  current: string[], proposal: string[], removals: ReadonlySet<string>,
): void {
  const nextByKey = new Map(proposal.filter(Boolean).map((value) => [normalized(value), value.trim()]));
  const currentKeys = new Set<string>();
  for (const value of current.filter(Boolean)) {
    const normalizedValue = normalized(value);
    currentKeys.add(normalizedValue);
    const key = `${root}::${normalizedValue}`;
    output.push({
      key,
      section,
      kind: removals.has(key) ? "explicit_removal" : nextByKey.has(normalizedValue) ? "maintained" : "not_cited",
      label,
      before: value.trim(),
      after: nextByKey.get(normalizedValue) ?? null,
      removable: true,
      provenance: !nextByKey.has(normalizedValue) ? "approved" : nextByKey.get(normalizedValue) !== value.trim() ? "normalized" : "explicit",
    });
  }
  for (const [normalizedValue, value] of nextByKey) {
    if (currentKeys.has(normalizedValue)) continue;
    output.push({ key: `${root}::${normalizedValue}`, section, kind: "added", label, before: null, after: value, removable: false, provenance: "explicit" });
  }
}

function entities<T extends { id: string }>(
  output: ProfileDeltaItem[], section: ProfileDeltaSection, root: string, current: T[], proposal: T[],
  identity: (item: T) => string, label: (item: T) => string, removals: ReadonlySet<string>,
): void {
  const remaining = [...proposal];
  for (const previous of current) {
    const identityKey = identity(previous);
    const index = remaining.findIndex((candidate) => candidate.id === previous.id || identity(candidate) === identityKey);
    const next = index >= 0 ? remaining.splice(index, 1)[0]! : null;
    const key = `${root}::${previous.id}`;
    output.push({
      key,
      section,
      kind: removals.has(key) ? "explicit_removal" : !next ? "not_cited" : equivalent(previous, next) ? "maintained" : "updated",
      label: label(next ?? previous),
      before: describeEntity(previous),
      after: next ? describeEntity(next) : null,
      removable: true,
      provenance: !next ? "approved" : previous.id.startsWith("human_") || next.id.startsWith("human_") ? "human" : "explicit",
    });
  }
  for (const next of remaining) {
    output.push({ key: `${root}::${next.id}`, section, kind: "added", label: label(next), before: null, after: describeEntity(next), removable: false, provenance: next.id.startsWith("human_") ? "human" : "explicit" });
  }
}

function experienceIdentity(item: StructuredDraft["experiences"][number]): string {
  return `${normalized(item.organization)}|${normalized(item.role)}`;
}
function experienceLabel(item: StructuredDraft["experiences"][number]): string { return [item.organization, item.role].filter(Boolean).join(" · ") || "Experiência profissional"; }
function educationIdentity(item: StructuredDraft["education"][number]): string { return `${normalized(item.institution)}|${normalized(item.course)}`; }
function educationLabel(item: StructuredDraft["education"][number]): string { return [item.institution, item.course].filter(Boolean).join(" · ") || "Formação"; }
function describeEntity(value: unknown): string { return JSON.stringify(value); }
function equivalent(left: unknown, right: unknown): boolean { return normalized(JSON.stringify(left, replacer)) === normalized(JSON.stringify(right, replacer)); }
function replacer(key: string, value: unknown): unknown { return ["id", "source", "evidenceText", "page"].includes(key) ? undefined : value; }
function clean(value: string | null | undefined): string | null { return value?.trim() || null; }
function normalized(value: unknown): string { return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR"); }
