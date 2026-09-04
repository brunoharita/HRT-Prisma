import { buildPrismaProfileView, type CanonicalKnowledgeTerm, type PrismaProfileView } from "./canonicalProfile.js";
import type { StructuredDraft } from "./personIngestion.js";

export const PROFILE_DISCOVERY_VERSION = "1.0.0";

export type CompetencyMatchMode = "all" | "any";

export interface ProfileSearchQuery {
  role: string;
  area: string;
  organization: string;
  minimumYears: number | null;
  currentExperienceOnly: boolean;
  educationCourse: string;
  educationLevel: string;
  educationInstitution: string;
  competencies: string[];
  competencyMode: CompetencyMatchMode;
  language: string;
  languageLevel: string;
  certification: string;
  lifecycle: string;
  operationalStatus: string;
  city: string;
}

export interface PublishedProfileCandidate {
  personId: string;
  fullName: string;
  lifecycle: string;
  operationalStatus: "active" | "archived";
  location: string | null;
  profileId: string;
  profileVersion: number;
  publishedAt: string;
  profileData: StructuredDraft;
  knowledge: CanonicalKnowledgeTerm[];
}

export interface ProfileSearchResult {
  candidate: PublishedProfileCandidate;
  profile: PrismaProfileView;
  reasons: string[];
  matchedObservedTerms: Array<{ query: string; observedTerms: string[] }>;
}

export interface KnowledgeSearchMatches {
  [normalizedQuery: string]: Record<string, string[]>;
}

export function emptyProfileSearchQuery(): ProfileSearchQuery {
  return {
    role: "", area: "", organization: "", minimumYears: null, currentExperienceOnly: false,
    educationCourse: "", educationLevel: "", educationInstitution: "", competencies: [], competencyMode: "all",
    language: "", languageLevel: "", certification: "", lifecycle: "", operationalStatus: "active", city: "",
  };
}

export function searchPublishedProfiles(
  candidates: PublishedProfileCandidate[],
  query: ProfileSearchQuery,
  knowledgeMatches: KnowledgeSearchMatches = {},
): ProfileSearchResult[] {
  return candidates.flatMap((candidate): ProfileSearchResult[] => {
    const directTerms = candidate.profileData.competencies;
    const matchedObservedTerms = query.competencies.map((term) => {
      const direct = directTerms.filter((candidateTerm) => includes(candidateTerm, term));
      const canonical = knowledgeMatches[normalize(term)]?.[candidate.personId] ?? [];
      return { query: term, observedTerms: unique([...direct, ...canonical]) };
    });
    const competencyMatches = matchedObservedTerms.map((item) => item.observedTerms.length > 0);
    const competenciesMatch = query.competencies.length === 0
      || (query.competencyMode === "all" ? competencyMatches.every(Boolean) : competencyMatches.some(Boolean));
    if (!competenciesMatch) return [];

    const experiences = candidate.profileData.experiences;
    const areaMatchesProfile = !query.area || candidate.profileData.areasOfExpertise.some((item) => includes(item, query.area));
    const relevantExperiences = experiences.filter((item) => {
      if (query.currentExperienceOnly && !isCurrentPeriod(item.period)) return false;
      return matchesText(item.role, query.role) && matchesText(item.organization, query.organization)
        && (areaMatchesProfile || matchesText([item.role, item.organization, item.description, item.evidenceText].filter(Boolean).join(" "), query.area));
    });
    if ((query.role || query.area || query.organization || query.currentExperienceOnly) && relevantExperiences.length === 0) return [];
    const years = estimateExperienceYears(query.role || query.area || query.organization ? relevantExperiences : experiences);
    if (query.minimumYears !== null && (years === null || years < query.minimumYears)) return [];

    const education = candidate.profileData.education;
    if (query.educationCourse && !education.some((item) => matchesText(item.course, query.educationCourse))) return [];
    if (query.educationInstitution && !education.some((item) => matchesText(item.institution, query.educationInstitution))) return [];
    if (query.educationLevel && !education.some((item) => item.level === query.educationLevel)) return [];
    if (query.certification && !candidate.profileData.certifications.some((item) => includes(item, query.certification))) return [];
    if (query.language && !candidate.profileData.languages.some((item) => languageMatches(item, query.language, query.languageLevel))) return [];
    if (query.lifecycle && candidate.lifecycle !== query.lifecycle) return [];
    if (query.operationalStatus && candidate.operationalStatus !== query.operationalStatus) return [];
    if (query.city && !matchesText(candidate.location, query.city)) return [];

    const reasons = buildReasons(query, relevantExperiences, years, matchedObservedTerms, candidate.profileData, areaMatchesProfile);
    const profile = buildPrismaProfileView({
      fullName: candidate.fullName,
      profile: candidate.profileData,
      location: candidate.location,
      lifecycleLabel: lifecycleLabel(candidate.lifecycle),
      operationalStatusLabel: candidate.operationalStatus === "active" ? "Ativo" : "Arquivado",
      knowledge: candidate.knowledge,
      version: { profileId: candidate.profileId, number: candidate.profileVersion, publishedAt: candidate.publishedAt, current: true },
    });
    return [{ candidate, profile, reasons, matchedObservedTerms }];
  }).sort((left, right) => right.reasons.length - left.reasons.length || left.candidate.fullName.localeCompare(right.candidate.fullName, "pt-BR"));
}

export function activeFilterCount(query: ProfileSearchQuery): number {
  return [query.role, query.area, query.organization, query.minimumYears, query.currentExperienceOnly,
    query.educationCourse, query.educationLevel, query.educationInstitution, query.competencies.length ? query.competencies : null,
    query.language, query.languageLevel, query.certification, query.lifecycle, query.operationalStatus !== "active" ? query.operationalStatus : "", query.city]
    .filter((value) => value !== "" && value !== null && value !== false).length;
}

function buildReasons(
  query: ProfileSearchQuery,
  experiences: StructuredDraft["experiences"],
  years: number | null,
  competencyMatches: Array<{ query: string; observedTerms: string[] }>,
  profile: StructuredDraft,
  areaMatchesProfile: boolean,
): string[] {
  const reasons: string[] = [];
  if (query.role && experiences.some((item) => matchesText(item.role, query.role))) reasons.push(`Experiência em ${query.role}`);
  if (query.area && (experiences.length || areaMatchesProfile)) reasons.push(`Área de atuação relacionada a ${query.area}`);
  if (query.organization && experiences.some((item) => matchesText(item.organization, query.organization))) reasons.push(`Experiência na organização ${query.organization}`);
  if (query.minimumYears !== null && years !== null) reasons.push(`${formatYears(years)} de experiência relacionada`);
  for (const match of competencyMatches.filter((item) => item.observedTerms.length)) {
    const observed = match.observedTerms.find((item) => normalize(item) !== normalize(match.query));
    reasons.push(observed ? `${match.query} identificado a partir de “${observed}”` : `${match.query} publicado no Perfil`);
  }
  if (query.educationCourse) reasons.push(`Formação relacionada a ${query.educationCourse}`);
  if (query.language) {
    const language = profile.languages.find((item) => languageMatches(item, query.language, query.languageLevel));
    if (language) reasons.push(`${language} confirmado no Perfil`);
  }
  if (query.certification) reasons.push(`Credencial ${query.certification} publicada`);
  if (query.city) reasons.push(`Localização correspondente a ${query.city}`);
  return unique(reasons);
}

function languageMatches(value: string, language: string, minimumLevel: string): boolean {
  if (!includes(value, language)) return false;
  if (!minimumLevel) return true;
  const observed = languageRank(value);
  const minimum = languageRank(minimumLevel);
  return observed !== null && minimum !== null && observed >= minimum;
}

function languageRank(value: string): number | null {
  const normalized = normalize(value);
  if (/fluente|nativo/.test(normalized)) return 4;
  if (/avancado/.test(normalized)) return 3;
  if (/intermediario/.test(normalized)) return 2;
  if (/basico/.test(normalized)) return 1;
  return null;
}

function estimateExperienceYears(experiences: StructuredDraft["experiences"]): number | null {
  const months = experiences.flatMap((item) => periodMonths(item.period)).reduce((total, value) => total + value, 0);
  return months > 0 ? Math.round((months / 12) * 10) / 10 : null;
}

function periodMonths(period: string | null): number[] {
  if (!period) return [];
  const years = period.match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? [];
  if (!years.length) return [];
  const start = years[0]!;
  const end = /atual|presente|current/i.test(period) ? new Date().getFullYear() : years[1];
  if (!end || end < start || end - start > 70) return [];
  return [Math.max(1, (end - start) * 12)];
}

function isCurrentPeriod(period: string | null): boolean {
  return Boolean(period && /atual|presente|current/i.test(period));
}

function matchesText(value: string | null | undefined, query: string): boolean {
  return !query.trim() || includes(value ?? "", query);
}

function includes(value: string, query: string): boolean {
  return normalize(value).includes(normalize(query));
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => { const key = normalize(value); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}

function formatYears(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} ${value === 1 ? "ano" : "anos"}`;
}

function lifecycleLabel(value: string): string {
  return ({ candidate: "Candidato", employee: "Colaborador", former_employee: "Ex-colaborador", former_candidate: "Ex-candidato", talent_pool: "Banco de talentos" } as Record<string, string>)[value] ?? "Pessoa";
}
