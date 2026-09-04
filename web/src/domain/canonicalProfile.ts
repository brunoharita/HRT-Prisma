import type { StructuredDraft, StructuredEducation, StructuredExperience } from "./personIngestion.js";

export const PRISMA_PROFILE_VIEW_VERSION = "1.0.0";

export type CompetencyGroupKey = "competencies" | "knowledge" | "tools";

export interface CanonicalKnowledgeTerm {
  originalTerm: string;
  canonicalLabel: string | null;
  state: "resolved" | "ambiguous" | "unresolved";
}

export interface PrismaProfileView {
  identity: {
    fullName: string;
    professionalTitle: string | null;
    location: string | null;
    lifecycleLabel: string | null;
    operationalStatusLabel: string | null;
  };
  about: {
    summary: string | null;
    professionalObjective: string | null;
    areasOfExpertise: string[];
    keyResults: string[];
  } | null;
  experiences: StructuredExperience[];
  education: StructuredEducation[];
  competencyGroups: Array<{
    key: CompetencyGroupKey;
    label: string;
    values: Array<{ label: string; originalTerm: string | null }>;
  }>;
  credentials: {
    certifications: string[];
    languages: Array<{ language: string; level: string | null }>;
  } | null;
  customSections: StructuredDraft["customSections"];
  version: {
    profileId: string;
    number: number;
    publishedAt: string;
    current: boolean;
  } | null;
}

export interface PrismaProfileSource {
  fullName: string;
  profile: StructuredDraft;
  location?: string | null;
  lifecycleLabel?: string | null;
  operationalStatusLabel?: string | null;
  knowledge?: CanonicalKnowledgeTerm[];
  version?: PrismaProfileView["version"];
}

const TOOL_PATTERNS = [
  /\b(sql|python|java|javascript|typescript|react|node(?:\.js)?|docker|kubernetes)\b/i,
  /\b(power\s*bi|excel|tableau|qlik|sap|erp|wms|knapp|supabase|n8n)\b/i,
  /\b(aws|azure|gcp|jira|confluence|monday(?:\.com)?|sharepoint|figma)\b/i,
];

const KNOWLEDGE_PATTERNS = [
  /\b(bpm|bpmn|lean|scrum|kanban|pmo|okr|kpi|itil|cobit|lgpd)\b/i,
  /\b(metodologias?\s+ágeis?|gestão\s+de\s+indicadores|governança|analytics|design\s+thinking)\b/i,
];

export function buildPrismaProfileView(source: PrismaProfileSource): PrismaProfileView {
  const profile = source.profile;
  const about = profile.summary || profile.professionalObjective || profile.areasOfExpertise.length || profile.keyResults.length
    ? {
        summary: cleanText(profile.summary),
        professionalObjective: cleanText(profile.professionalObjective),
        areasOfExpertise: uniqueText(profile.areasOfExpertise),
        keyResults: uniqueText(profile.keyResults.map((item) => item.value)),
      }
    : null;
  const competencyGroups = groupCompetencies(profile.competencies, source.knowledge ?? []);
  const certifications = uniqueText(profile.certifications);
  const languages = profile.languages.flatMap(parseLanguage).filter(uniqueLanguage);

  return {
    identity: {
      fullName: source.fullName.trim(),
      professionalTitle: cleanText(profile.professionalTitle),
      location: cleanText(source.location ?? joinLocation(profile.contact.city, profile.contact.state)),
      lifecycleLabel: cleanText(source.lifecycleLabel),
      operationalStatusLabel: cleanText(source.operationalStatusLabel),
    },
    about,
    experiences: profile.experiences.filter(hasExperienceContent),
    education: profile.education.filter(hasEducationContent),
    competencyGroups,
    credentials: certifications.length || languages.length ? { certifications, languages } : null,
    customSections: profile.customSections.filter((section) => section.items.some((item) => item.value.trim())),
    version: source.version ?? null,
  };
}

export function groupCompetencies(
  observedTerms: string[],
  knowledge: CanonicalKnowledgeTerm[] = [],
): PrismaProfileView["competencyGroups"] {
  const resolvedByOriginal = new Map(
    knowledge
      .filter((item) => item.state === "resolved" && item.canonicalLabel)
      .map((item) => [normalize(item.originalTerm), item.canonicalLabel!.trim()]),
  );
  const grouped = new Map<CompetencyGroupKey, Array<{ label: string; originalTerm: string | null }>>([
    ["competencies", []], ["knowledge", []], ["tools", []],
  ]);
  const seen = new Set<string>();

  for (const observed of uniqueText(observedTerms)) {
    const canonical = resolvedByOriginal.get(normalize(observed)) ?? observed;
    const deduplicationKey = normalize(canonical);
    if (seen.has(deduplicationKey)) continue;
    seen.add(deduplicationKey);
    const key = classifyCompetency(canonical);
    grouped.get(key)!.push({ label: canonical, originalTerm: canonical === observed ? null : observed });
  }

  const labels: Record<CompetencyGroupKey, string> = {
    competencies: "Competências",
    knowledge: "Conhecimentos",
    tools: "Tecnologias e ferramentas",
  };
  return (["competencies", "knowledge", "tools"] as const)
    .map((key) => ({ key, label: labels[key], values: grouped.get(key)! }))
    .filter((group) => group.values.length > 0);
}

export function parseLanguage(value: string): Array<{ language: string; level: string | null }> {
  const normalized = value.trim();
  if (!normalized) return [];
  const [language, ...qualifiers] = normalized.split(/\s*[·|]\s*/);
  if (!language?.trim()) return [];
  const level = qualifiers.join(" · ").trim();
  return [{ language: language.trim(), level: level || null }];
}

export function profileHasPublishedContent(profile: PrismaProfileView): boolean {
  return Boolean(profile.about || profile.experiences.length || profile.education.length
    || profile.competencyGroups.length || profile.credentials || profile.customSections.length);
}

function classifyCompetency(value: string): CompetencyGroupKey {
  if (TOOL_PATTERNS.some((pattern) => pattern.test(value))) return "tools";
  if (KNOWLEDGE_PATTERNS.some((pattern) => pattern.test(value))) return "knowledge";
  return "competencies";
}

function uniqueText(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const clean = cleanText(value);
    if (!clean) return [];
    const key = normalize(clean);
    if (seen.has(key)) return [];
    seen.add(key);
    return [clean];
  });
}

function cleanText(value: string | null | undefined): string | null {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean || null;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

function joinLocation(city: string | null, state: string | null): string | null {
  const parts = [cleanText(city), cleanText(state)].filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(", ") : null;
}

function hasExperienceContent(item: StructuredExperience): boolean {
  return Boolean(item.role?.trim() || item.organization?.trim() || item.period?.trim() || item.description?.trim());
}

function hasEducationContent(item: StructuredEducation): boolean {
  return Boolean(item.course?.trim() || item.institution?.trim() || item.period?.trim() || item.description?.trim());
}

function uniqueLanguage(value: { language: string; level: string | null }, index: number, values: Array<{ language: string; level: string | null }>): boolean {
  return values.findIndex((candidate) => normalize(candidate.language) === normalize(value.language) && normalize(candidate.level ?? "") === normalize(value.level ?? "")) === index;
}
