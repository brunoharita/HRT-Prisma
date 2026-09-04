import type { PostgrestError } from "@supabase/supabase-js";
import {
  DataAccessFailure,
  isPersonLifecycle,
  type HomeSummary,
  type KnowledgeSourceHealth,
  type KnowledgeSourceMonitorStatus,
  type PeopleQuery,
  type PersonListItem,
  type PersonProfileView,
  type PrismaDataRepository,
  type StructuredProfile,
} from "../../domain/prismaData";
import type { StructuredDraft } from "../../domain/personIngestion";
import { legacyReviewEntityIdFromValue } from "../../domain/reviewFieldLifecycle";
import {
  EDUCATION_CLASSIFICATION_ORIGINS,
  EDUCATION_LEVELS,
  EDUCATION_QUALIFICATIONS,
  EDUCATION_STATUSES,
  resolveEducationClassification,
  type EducationClassificationOrigin,
  type EducationLevel,
  type EducationQualification,
  type EducationStatus,
} from "../../../../src/domain/educationClassification";
import type { PlatformOperator } from "../../domain/platformUsersData";
import { normalizeMembershipRole, type MembershipRole, type OrganizationMembership } from "../../shared/access";
import { supabase } from "./client";
import type { Json } from "./database.types";

type ProfileRow = Awaited<ReturnType<typeof loadCurrentProfileRow>>;

export const prismaRepository: PrismaDataRepository = {
  async loadCurrentOperator(userId) {
    const { data, error } = await supabase
      .from("platform_users")
      .select("id, auth_user_id, full_name, username, email, status, access_profile, group_id, must_change_password")
      .eq("auth_user_id", userId)
      .maybeSingle();
    throwIfError(error, "Não foi possível carregar o operador autenticado.");
    if (!data) return null;

    let groupName: string | null = null;
    if (data.group_id) {
      const { data: group, error: groupError } = await supabase
        .from("organization_groups")
        .select("id, name")
        .eq("id", data.group_id)
        .maybeSingle();
      throwIfError(groupError, "Não foi possível confirmar o grupo do operador.");
      groupName = group?.name ?? null;
    }

    return {
      id: data.id,
      authUserId: data.auth_user_id,
      fullName: data.full_name,
      username: data.username,
      email: data.email,
      status: data.status,
      profile: data.access_profile,
      groupId: data.group_id,
      groupName,
      mustChangePassword: data.must_change_password,
    } satisfies PlatformOperator;
  },

  async loadMemberships(userId) {
    const currentOperator = await this.loadCurrentOperator(userId);
    if (!currentOperator || currentOperator.status !== "active") return [];

    if (currentOperator.profile === "super_admin") {
      const { data: organizationRows, error: organizationError } = await supabase
        .from("organizations")
        .select("id, name, group_id")
        .order("name", { ascending: true });
      throwIfError(organizationError, "Não foi possível consultar as empresas disponíveis para o Super Admin.");

      const groupIds = [...new Set((organizationRows ?? []).map((row) => row.group_id))];
      const { data: groupRows, error: groupError } = await supabase
        .from("organization_groups")
        .select("id, name")
        .in("id", groupIds);
      throwIfError(groupError, "Não foi possível confirmar os grupos visíveis do Super Admin.");
      const groups = new Map((groupRows ?? []).map((row) => [row.id, row.name]));

      return (organizationRows ?? []).map((row) => ({
        organizationId: row.id,
        organizationName: row.name,
        groupId: row.group_id,
        groupName: groups.get(row.group_id) ?? null,
        role: "super_admin",
      }));
    }

    const { data: membershipRows, error } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    throwIfError(error, "Não foi possível consultar as memberships da sessão.");

    const memberships = membershipRows ?? [];
    const organizationIds = memberships.map((row) => row.organization_id);
    if (organizationIds.length === 0) return [];

    const { data: organizationRows, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, group_id")
      .in("id", organizationIds);
    throwIfError(organizationError, "Não foi possível validar as organizações permitidas.");
    const groupIds = [...new Set((organizationRows ?? []).map((row) => row.group_id))];
    const { data: groupRows, error: groupError } = await supabase
      .from("organization_groups")
      .select("id, name")
      .in("id", groupIds);
    throwIfError(groupError, "Não foi possível validar os grupos permitidos.");
    const organizations = new Map((organizationRows ?? []).map((row) => [row.id, row]));
    const groups = new Map((groupRows ?? []).map((row) => [row.id, row.name]));

    return memberships.flatMap((row): OrganizationMembership[] => {
      const role = normalizeMembershipRole(row.role);
      const organization = organizations.get(row.organization_id);
      if (!role || !organization) return [];
      return [{
        organizationId: row.organization_id,
        organizationName: organization.name,
        groupId: organization.group_id,
        groupName: groups.get(organization.group_id) ?? null,
        role,
      }];
    });
  },

  async loadHomeSummary(organizationId) {
    const [people, profiles, vacancies, sourceResult] = await Promise.all([
      supabase.from("people").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      supabase
        .from("professional_profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("superseded_at", null),
      supabase
        .from("vacancies")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      supabase
        .from("knowledge_sources")
        .select("id,name,monitor_status,detected_version,detected_release_date,last_checked_at,next_check_at")
        .in("name", ["CBO", "ESCO", "O*NET"]),
    ]);
    throwIfError(people.error, "Não foi possível contar as pessoas da organização.");
    throwIfError(profiles.error, "Não foi possível contar os perfis estruturados.");
    throwIfError(vacancies.error, "Não foi possível contar as vagas abertas.");
    throwIfError(sourceResult.error, "Não foi possível consultar a atualização das bases de conhecimento.");
    const sources = sourceResult.data ?? [];
    if (sources.length !== 3) {
      throw new DataAccessFailure("invalid_data", "O catálogo das três bases centrais está incompleto.");
    }
    const { data: sourceVersions, error: sourceVersionError } = sources.length
      ? await supabase
          .from("knowledge_source_versions")
          .select("source_id,external_version,release_date,is_current,created_at")
          .in("source_id", sources.map((source) => source.id))
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    throwIfError(sourceVersionError, "Não foi possível consultar as versões das bases de conhecimento.");
    return {
      peopleCount: people.count ?? 0,
      structuredProfilesCount: profiles.count ?? 0,
      openVacanciesCount: vacancies.count ?? 0,
      knowledgeSources: sources
        .map((source): KnowledgeSourceHealth => {
          const versions = (sourceVersions ?? []).filter((version) => version.source_id === source.id);
          const published = versions.find((version) => version.is_current);
          const fallback = versions[0];
          return {
            id: source.id,
            name: requireCentralSourceName(source.name),
            version: published?.external_version ?? source.detected_version ?? fallback?.external_version ?? null,
            releaseDate: published?.release_date ?? source.detected_release_date ?? fallback?.release_date ?? null,
            detectedVersion: source.detected_version,
            detectedReleaseDate: source.detected_release_date,
            lastCheckedAt: source.last_checked_at,
            nextCheckAt: source.next_check_at,
            status: requireMonitorStatus(source.monitor_status),
            published: Boolean(published),
          };
        })
        .sort((left, right) => centralSourceOrder(left.name) - centralSourceOrder(right.name)),
    } satisfies HomeSummary;
  },

  async listPeople(organizationId, query) {
    let peopleQuery = supabase
      .from("people")
      .select("id, organization_id, full_name, lifecycle, created_at")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });

    const search = sanitizeSearch(query.search);
    if (search) peopleQuery = peopleQuery.ilike("full_name", `%${search}%`);
    if (query.lifecycle !== "all") peopleQuery = peopleQuery.eq("lifecycle", query.lifecycle);

    const { data: people, error } = await peopleQuery;
    throwIfError(error, "Não foi possível carregar as pessoas da organização ativa.");
    const peopleRows = people ?? [];
    if (peopleRows.length === 0) return [];

    const { data: profiles, error: profileError } = await supabase
      .from("professional_profiles")
      .select("person_id")
      .eq("organization_id", organizationId)
      .is("superseded_at", null)
      .in("person_id", peopleRows.map((person) => person.id));
    throwIfError(profileError, "Não foi possível identificar os perfis estruturados.");
    const profilePersonIds = new Set((profiles ?? []).map((profile) => profile.person_id));

    return peopleRows.map((person) => toPersonListItem(person, profilePersonIds.has(person.id)));
  },

  async loadPersonProfile(organizationId, personId, role) {
    const { data: person, error } = await supabase
      .from("people")
      .select("id, organization_id, full_name, lifecycle, created_at")
      .eq("organization_id", organizationId)
      .eq("id", personId)
      .maybeSingle();
    throwIfError(error, "Não foi possível carregar a pessoa solicitada.");
    if (!person) return null;

    const profileRow = await loadCurrentProfileRow(organizationId, personId);
    const profile = profileRow ? decodeProfile(profileRow, person.full_name) : null;
    const [evidenceResult, inferenceResult, competencyResult, knowledgeResult, contactResult] = await Promise.all([
      supabase
        .from("evidence")
        .select("id, kind, fact, quoted_text, source_page, source_block, extraction_version")
        .eq("organization_id", organizationId)
        .eq("person_id", personId)
        .order("created_at", { ascending: true }),
      supabase
        .from("inferences")
        .select("id, inference_type, value, rationale, inference_version")
        .eq("organization_id", organizationId)
        .eq("person_id", personId)
        .order("created_at", { ascending: true }),
      profileRow ? loadCompetencies(organizationId, profileRow.id) : Promise.resolve([]),
      profileRow ? loadKnowledgeResolutions(organizationId, profileRow.id) : Promise.resolve([]),
      canReadPrivateContact(role) ? loadPrivateContact(organizationId, personId) : Promise.resolve(null),
    ]);
    throwIfError(evidenceResult.error, "Não foi possível carregar as evidências do perfil.");
    throwIfError(inferenceResult.error, "Não foi possível carregar as inferências do perfil.");

    return {
      person: toPersonListItem(person, Boolean(profile)),
      profile,
      evidence: (evidenceResult.data ?? []).map((item) => ({
        id: item.id,
        kind: item.kind,
        fact: item.fact,
        quotedText: item.quoted_text,
        sourcePage: item.source_page,
        sourceBlock: item.source_block,
        extractionVersion: item.extraction_version,
      })),
      inferences: (inferenceResult.data ?? []).map((item) => ({
        id: item.id,
        type: item.inference_type,
        value: item.value,
        rationale: item.rationale,
        inferenceVersion: item.inference_version,
      })),
      competencies: competencyResult,
      normalizedKnowledge: knowledgeResult,
      privateContact: contactResult,
    } satisfies PersonProfileView;
  },
};

function requireCentralSourceName(value: string): "CBO" | "ESCO" | "O*NET" {
  if (value === "CBO" || value === "ESCO" || value === "O*NET") return value;
  throw new DataAccessFailure("invalid_data", "A base central retornada não pertence ao contrato conhecido.");
}

function requireMonitorStatus(value: string): KnowledgeSourceMonitorStatus {
  if (["not_checked", "current", "update_available", "action_required", "temporary_failure", "validation_failed"].includes(value)) {
    return value as KnowledgeSourceMonitorStatus;
  }
  throw new DataAccessFailure("invalid_data", "A base central possui um estado de atualização desconhecido.");
}

function centralSourceOrder(value: KnowledgeSourceHealth["name"]): number {
  return value === "CBO" ? 0 : value === "ESCO" ? 1 : 2;
}

async function loadCurrentProfileRow(organizationId: string, personId: string) {
  const { data, error } = await supabase
    .from("professional_profiles")
    .select("id, profile_version, profile_data, uncertainties, not_identified, extraction_version, inference_version, approved_at, created_at, superseded_at")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .is("superseded_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, "Não foi possível carregar o perfil profissional estruturado.");
  return data;
}

async function loadKnowledgeResolutions(organizationId: string, profileId: string) {
  const { data: observations, error } = await supabase
    .from("knowledge_observations")
    .select("id, original_term, resolution_state, concept_id, normalization_method, resolution_source_version_id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .order("original_term");
  throwIfError(error, "Não foi possível carregar a normalização do perfil.");
  const rows = observations ?? [];
  const conceptIds = [...new Set(rows.flatMap((row) => row.concept_id ? [row.concept_id] : []))];
  const { data: concepts, error: conceptError } = conceptIds.length
    ? await supabase.from("knowledge_concepts").select("id, canonical_label").in("id", conceptIds)
    : { data: [], error: null };
  throwIfError(conceptError, "Não foi possível resolver os conceitos do perfil.");
  const { data: mappings, error: mappingError } = conceptIds.length
    ? await supabase.from("knowledge_external_mappings").select("concept_id, source_id, source_version_id, external_id, external_uri").in("concept_id", conceptIds)
    : { data: [], error: null };
  throwIfError(mappingError, "Não foi possível carregar a origem dos conceitos.");
  const currentMappings = mappings ?? [];
  const versionIds = [...new Set(currentMappings.map((mapping) => mapping.source_version_id))];
  const sourceIds = [...new Set(currentMappings.map((mapping) => mapping.source_id))];
  const [versionResult, sourceResult] = await Promise.all([
    versionIds.length ? supabase.from("knowledge_source_versions").select("id, external_version, is_current").in("id", versionIds) : Promise.resolve({ data: [], error: null }),
    sourceIds.length ? supabase.from("knowledge_sources").select("id, name").in("id", sourceIds) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(versionResult.error, "Não foi possível carregar a versão dos conceitos.");
  throwIfError(sourceResult.error, "Não foi possível carregar a fonte dos conceitos.");
  const labels = new Map((concepts ?? []).map((concept) => [concept.id, concept.canonical_label]));
  const versions = new Map((versionResult.data ?? []).map((version) => [version.id, version]));
  const sources = new Map((sourceResult.data ?? []).map((source) => [source.id, source.name]));
  return rows.map((row) => {
    const mapping = currentMappings.find((item) => item.concept_id === row.concept_id && versions.get(item.source_version_id)?.is_current)
      ?? currentMappings.find((item) => item.concept_id === row.concept_id);
    return {
      observationId: row.id,
      originalTerm: row.original_term,
      state: row.resolution_state as "resolved" | "ambiguous" | "unresolved",
      canonicalLabel: row.concept_id ? labels.get(row.concept_id) ?? null : null,
      conceptId: row.concept_id,
      method: row.normalization_method,
      sourceName: mapping ? sources.get(mapping.source_id) ?? null : null,
      sourceVersion: mapping ? versions.get(mapping.source_version_id)?.external_version ?? null : null,
      externalId: mapping?.external_id ?? null,
      externalUri: mapping?.external_uri ?? null,
    };
  });
}

async function loadCompetencies(organizationId: string, profileId: string) {
  const { data: links, error } = await supabase
    .from("profile_competencies")
    .select("id, competency_id, classification")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId);
  throwIfError(error, "Não foi possível carregar as competências do perfil.");
  const competencyLinks = links ?? [];
  if (competencyLinks.length === 0) return [];

  const { data: competencies, error: competencyError } = await supabase
    .from("competencies")
    .select("id, normalized_name")
    .eq("organization_id", organizationId)
    .in("id", competencyLinks.map((link) => link.competency_id));
  throwIfError(competencyError, "Não foi possível resolver as competências do perfil.");
  const names = new Map((competencies ?? []).map((competency) => [competency.id, competency.normalized_name]));
  return competencyLinks.flatMap((link) => {
    const name = names.get(link.competency_id);
    return name ? [{ id: link.id, name, classification: link.classification }] : [];
  });
}

async function loadPrivateContact(organizationId: string, personId: string) {
  const { data, error } = await supabase
    .from("person_private_data")
    .select("email, phone, location")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .maybeSingle();
  throwIfError(error, "Não foi possível carregar os dados privados permitidos.");
  return data ? { email: data.email, phone: data.phone, location: data.location } : null;
}

function toPersonListItem(
  row: { id: string; organization_id: string; full_name: string; lifecycle: string; created_at: string },
  hasStructuredProfile: boolean,
): PersonListItem {
  if (!isPersonLifecycle(row.lifecycle)) {
    throw new DataAccessFailure("invalid_data", "A pessoa possui um lifecycle não reconhecido pelo contrato atual.");
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    lifecycle: row.lifecycle,
    createdAt: row.created_at,
    hasStructuredProfile,
  };
}

function decodeProfile(row: NonNullable<ProfileRow>, fallbackName: string): StructuredProfile {
  const data = asRecord(row.profile_data);
  if (!data) throw new DataAccessFailure("invalid_data", "O perfil persistido não corresponde ao contrato estruturado.");
  const identity = asRecord(data.identity);
  const contact = asRecord(data.contact);
  return {
    id: row.id,
    profileVersion: row.profile_version,
    approvedAt: row.approved_at,
    current: row.superseded_at === null,
    identity: { fullName: readString(identity?.fullName) ?? readString(data.fullName) ?? fallbackName },
    contact: {
      city: readString(contact?.city),
      state: readString(contact?.state),
      phone: readString(contact?.phone),
      email: readString(contact?.email),
      linkedin: readString(contact?.linkedin),
    },
    professionalTitle: readString(data.professionalTitle),
    areasOfExpertise: readHistoricalTextList(data.areasOfExpertise, ["name", "value"]),
    professionalObjective: readString(data.professionalObjective),
    summary: readString(data.summary),
    keyResults: readKeyResults(data.keyResults),
    experiences: readExperiences(data.experiences),
    education: readEducation(data.education),
    certifications: readHistoricalTextList(data.certifications, ["name", "certification", "title", "value"], ["issuer", "institution"]),
    languages: readHistoricalTextList(data.languages, ["language", "name", "value"], ["proficiency", "level"]),
    competencies: readHistoricalTextList(data.competencies, ["name", "competency", "normalizedName", "value"]),
    customSections: readCustomSections(data.customSections),
    uncertainties: readStringArray(data.uncertainties).length ? readStringArray(data.uncertainties) : readStringArray(row.uncertainties),
    notIdentified: readStringArray(data.notIdentified).length ? readStringArray(data.notIdentified) : readStringArray(row.not_identified),
    extractionVersion: row.extraction_version,
    inferenceVersion: row.inference_version,
    createdAt: row.created_at,
  };
}

function readCustomSections(value: Json | undefined): StructuredProfile["customSections"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const id = readString(record?.id);
    const name = readString(record?.name);
    const format = readString(record?.format);
    const source = readString(record?.source);
    if (!record || !id || !name || (format !== "text" && format !== "list") || (source !== "extracted" && source !== "human") || !Array.isArray(record.items)) return [];
    const items = record.items.flatMap((candidate) => {
      const candidateRecord = asRecord(candidate);
      const itemId = readString(candidateRecord?.id);
      const itemValue = readString(candidateRecord?.value);
      return itemId && itemValue ? [{ id: itemId, value: itemValue }] : [];
    });
    return items.length ? [{ id, name, format, source, items }] : [];
  });
}

function readKeyResults(value: Json | undefined): StructuredDraft["keyResults"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string" && item.trim()) return [{ id: `result_${index}`, value: item.trim() }];
    const record = asRecord(item);
    const result = readString(record?.value);
    return result ? [{ id: readString(record?.id) ?? `result_${index}`, value: result }] : [];
  });
}

function readExperiences(value: Json | undefined): StructuredDraft["experiences"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const organization = readString(record?.organization);
    const role = readString(record?.role);
    const period = readString(record?.period) ?? formatLegacyPeriod(readString(record?.startDate), readString(record?.endDate));
    if (!record || (!organization && !role && !period && !readString(record.description))) return [];
    return [{
      id: readString(record.id) ?? legacyReviewEntityIdFromValue("experience", index, { organization, role, period }),
      source: readString(record.source) === "human" ? "human" as const : "extracted" as const,
      organization,
      role,
      period,
      description: readString(record.description),
      evidenceText: readString(record.evidenceText) ?? "",
      page: typeof record.page === "number" ? record.page : null,
    }];
  });
}

function readEducation(value: Json | undefined): StructuredDraft["education"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const institution = readString(record?.institution);
    const course = readString(record?.course);
    const period = readString(record?.period);
    if (!record || (!institution && !course && !period)) return [];
    const storedStatus = readString(record.status);
    const storedLevel = readString(record.level);
    const storedQualification = readString(record.qualification);
    const storedOrigin = readString(record.classificationOrigin);
    const candidate = {
      course,
      institution,
      period,
      description: readString(record.description),
      evidenceText: readString(record.evidenceText),
      ...(isEducationStatus(storedStatus) ? { status: storedStatus } : {}),
      ...(isEducationLevel(storedLevel) ? { level: storedLevel } : {}),
      ...(isEducationQualification(storedQualification) ? { qualification: storedQualification } : {}),
      ...(isEducationOrigin(storedOrigin) ? { classificationOrigin: storedOrigin } : {}),
    };
    return [{
      id: readString(record.id) ?? legacyReviewEntityIdFromValue("education", index, { institution, course, period }),
      source: readString(record.source) === "human" ? "human" as const : "extracted" as const,
      course,
      institution,
      period,
      description: candidate.description,
      evidenceText: candidate.evidenceText ?? "",
      page: typeof record.page === "number" ? record.page : null,
      ...resolveEducationClassification(candidate),
    }];
  });
}

function readHistoricalTextList(value: Json | undefined, primaryKeys: string[], qualifierKeys: string[] = []): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    const record = asRecord(item);
    const primary = primaryKeys.map((key) => readString(record?.[key])).find(Boolean);
    if (!primary) return [];
    const qualifier = qualifierKeys.map((key) => readString(record?.[key])).find(Boolean);
    return [`${primary}${qualifier ? ` · ${qualifier}` : ""}`];
  })));
}

function readStringArray(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: Json | undefined): { [key: string]: Json | undefined } | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function readString(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatLegacyPeriod(startDate: string | null, endDate: string | null): string | null {
  if (!startDate && !endDate) return null;
  return `${startDate ?? "Início não informado"} a ${endDate ?? "atual"}`;
}

function isEducationStatus(value: string | null): value is EducationStatus { return Boolean(value && EDUCATION_STATUSES.includes(value as EducationStatus)); }
function isEducationLevel(value: string | null): value is EducationLevel { return Boolean(value && EDUCATION_LEVELS.includes(value as EducationLevel)); }
function isEducationQualification(value: string | null): value is EducationQualification { return Boolean(value && EDUCATION_QUALIFICATIONS.includes(value as EducationQualification)); }
function isEducationOrigin(value: string | null): value is EducationClassificationOrigin { return Boolean(value && EDUCATION_CLASSIFICATION_ORIGINS.includes(value as EducationClassificationOrigin)); }

function sanitizeSearch(search: string): string {
  return search.trim().replace(/[%_]/g, "").slice(0, 80);
}

function canReadPrivateContact(role: MembershipRole): boolean {
  return role === "super_admin" || role === "owner" || role === "admin" || role === "recruiter";
}

function throwIfError(error: PostgrestError | null, fallbackMessage: string): void {
  if (!error) return;
  const forbidden = error.code === "42501" || error.code === "PGRST301";
  throw new DataAccessFailure(forbidden ? "forbidden" : "unavailable", fallbackMessage);
}
