import type { MembershipRole, OrganizationMembership } from "../shared/access";
import type { PlatformOperator } from "./platformUsersData";
import type { CustomProfileSection } from "./personIngestion";

export const PERSON_LIFECYCLES = [
  "candidate",
  "employee",
  "former_employee",
  "former_candidate",
  "talent_pool",
] as const;

export type PersonLifecycle = (typeof PERSON_LIFECYCLES)[number];

export interface HomeSummary {
  peopleCount: number;
  structuredProfilesCount: number;
  openVacanciesCount: number;
}

export interface PeopleQuery {
  search: string;
  lifecycle: PersonLifecycle | "all";
}

export interface PersonListItem {
  id: string;
  organizationId: string;
  fullName: string;
  lifecycle: PersonLifecycle;
  createdAt: string;
  hasStructuredProfile: boolean;
}

export interface ProfessionalExperience {
  organization: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
}

export interface EducationItem {
  institution: string;
  course: string;
  status: string | null;
}

export interface LanguageItem {
  language: string;
  proficiency: string | null;
}

export interface StructuredProfile {
  id: string;
  fullName: string;
  experiences: ProfessionalExperience[];
  education: EducationItem[];
  certifications: string[];
  languages: LanguageItem[];
  toolsAndTechnologies: string[];
  professionalContexts: string[];
  customSections: CustomProfileSection[];
  uncertainties: string[];
  notIdentified: string[];
  extractionVersion: string;
  inferenceVersion: string;
  createdAt: string;
}

export interface ProfileEvidence {
  id: string;
  kind: string;
  fact: string;
  quotedText: string;
  sourcePage: number | null;
  sourceBlock: string;
  extractionVersion: string;
}

export interface ProfileInference {
  id: string;
  type: string;
  value: string;
  rationale: string;
  inferenceVersion: string;
}

export interface ProfileCompetency {
  id: string;
  name: string;
  classification: "explicit" | "inferred";
}

export interface ProfileKnowledgeResolution {
  observationId: string;
  originalTerm: string;
  state: "resolved" | "ambiguous" | "unresolved";
  canonicalLabel: string | null;
  conceptId: string | null;
  method: string;
  sourceName: string | null;
  sourceVersion: string | null;
  externalId: string | null;
  externalUri: string | null;
}

export interface PrivateContact {
  email: string | null;
  phone: string | null;
  location: string | null;
}

export interface PersonProfileView {
  person: PersonListItem;
  profile: StructuredProfile | null;
  evidence: ProfileEvidence[];
  inferences: ProfileInference[];
  competencies: ProfileCompetency[];
  normalizedKnowledge: ProfileKnowledgeResolution[];
  privateContact: PrivateContact | null;
}

export interface PrismaDataRepository {
  loadCurrentOperator(userId: string): Promise<PlatformOperator | null>;
  loadMemberships(userId: string): Promise<OrganizationMembership[]>;
  loadHomeSummary(organizationId: string): Promise<HomeSummary>;
  listPeople(organizationId: string, query: PeopleQuery): Promise<PersonListItem[]>;
  loadPersonProfile(
    organizationId: string,
    personId: string,
    role: MembershipRole,
  ): Promise<PersonProfileView | null>;
}

export type DataAccessFailureKind = "forbidden" | "invalid_data" | "unavailable";

export class DataAccessFailure extends Error {
  public constructor(public readonly kind: DataAccessFailureKind, message: string) {
    super(message);
    this.name = "DataAccessFailure";
  }
}

export function isPersonLifecycle(value: string): value is PersonLifecycle {
  return PERSON_LIFECYCLES.some((lifecycle) => lifecycle === value);
}

export function describeLifecycle(lifecycle: PersonLifecycle): string {
  if (lifecycle === "candidate") return "Candidato";
  if (lifecycle === "employee") return "Colaborador";
  if (lifecycle === "former_employee") return "Ex-colaborador";
  if (lifecycle === "former_candidate") return "Ex-candidato";
  return "Banco de talentos";
}
