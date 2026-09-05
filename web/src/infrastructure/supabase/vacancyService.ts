import type { PostgrestError } from "@supabase/supabase-js";
import {
  VACANCY_MATCHING_VERSION,
  matchVacancyCandidate,
  sortVacancyMatches,
  type VacancyCandidateMatch,
  type VacancyDetail,
  type VacancyDraft,
  type VacancyRequirementDraft,
  type VacancySummary,
} from "../../domain/vacancy.js";
import type { Json } from "./database.types.js";
import { supabase } from "./client.js";
import { loadPublishedProfileCandidates } from "./profileDiscoveryService.js";

export interface OrganizationRoleTemplate {
  id: string;
  name: string;
  mission: string;
  responsibilities: string[];
  expectedOutcomes: string[];
  requirements: VacancyRequirementDraft[];
  contextItems: string[];
  referenceConceptId: string | null;
}

export interface VacancyReferenceSuggestion {
  conceptId: string;
  label: string;
  scope: "global" | "organization";
  source: string | null;
}

export interface VacancyAdvisorKnowledgeSuggestion extends VacancyReferenceSuggestion {
  conceptType: string;
}

export interface VacancyHistoryItem {
  id: number;
  type: string;
  version: number | null;
  createdAt: string;
}

export const vacancyService = {
  async list(organizationId: string): Promise<VacancySummary[]> {
    const result = await supabase.from("vacancies")
      .select("id, position_id, title, area, location, employment_type, definition_version, updated_at")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false });
    throwIfError(result.error, "Não foi possível carregar as Vagas da empresa ativa.");
    const rows = result.data ?? [];
    const positionIds = rows.flatMap((item) => item.position_id ? [item.position_id] : []);
    const positionResult = positionIds.length
      ? await supabase.from("positions").select("id, status, occupant_person_id").eq("organization_id", organizationId).in("id", positionIds)
      : { data: [], error: null };
    throwIfError(positionResult.error, "Não foi possível confirmar a ocupação das Vagas.");
    const positions = new Map((positionResult.data ?? []).map((item) => [item.id, item]));
    const occupantIds = [...new Set((positionResult.data ?? []).flatMap((item) => item.occupant_person_id ? [item.occupant_person_id] : []))];
    const peopleResult = occupantIds.length
      ? await supabase.from("people").select("id, full_name").eq("organization_id", organizationId).in("id", occupantIds)
      : { data: [], error: null };
    throwIfError(peopleResult.error, "Não foi possível identificar as Pessoas vinculadas às Vagas.");
    const people = new Map((peopleResult.data ?? []).map((item) => [item.id, item.full_name]));
    return rows.map((item) => {
      const position = item.position_id ? positions.get(item.position_id) : null;
      return {
        id: item.id,
        title: item.title,
        area: item.area,
        location: item.location,
        employmentType: item.employment_type,
        occupancy: position?.status === "occupied" ? "occupied" : "vacant",
        occupantName: position?.occupant_person_id ? people.get(position.occupant_person_id) ?? null : null,
        definitionVersion: item.definition_version,
        updatedAt: item.updated_at,
      };
    });
  },

  async load(organizationId: string, vacancyId: string): Promise<VacancyDetail | null> {
    const vacancyResult = await supabase.from("vacancies")
      .select("id, organization_id, position_id, job_role_id, title, area, location, work_arrangement, employment_type, source_kind, source_vacancy_id, reference_concept_id, definition_version, current_version_id, created_at, updated_at")
      .eq("organization_id", organizationId).eq("id", vacancyId).maybeSingle();
    throwIfError(vacancyResult.error, "Não foi possível carregar a Vaga solicitada.");
    const vacancy = vacancyResult.data;
    if (!vacancy?.current_version_id) return null;
    const [versionResult, requirementResult, positionResult, roleResult] = await Promise.all([
      supabase.from("vacancy_versions").select("*").eq("organization_id", organizationId).eq("id", vacancy.current_version_id).maybeSingle(),
      supabase.from("vacancy_requirements").select("*").eq("organization_id", organizationId).eq("vacancy_version_id", vacancy.current_version_id).order("created_at"),
      vacancy.position_id ? supabase.from("positions").select("status, occupant_person_id").eq("organization_id", organizationId).eq("id", vacancy.position_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from("job_roles").select("name").eq("organization_id", organizationId).eq("id", vacancy.job_role_id).maybeSingle(),
    ]);
    throwIfError(versionResult.error, "Não foi possível carregar a definição vigente da Vaga.");
    throwIfError(requirementResult.error, "Não foi possível carregar os requisitos da Vaga.");
    throwIfError(positionResult.error, "Não foi possível carregar a posição vinculada.");
    throwIfError(roleResult.error, "Não foi possível carregar a função da empresa.");
    const version = versionResult.data;
    if (!version) return null;
    const requirements = requirementResult.data ?? [];
    const [relationResult, conceptResult, occupantResult] = await Promise.all([
      requirements.length ? supabase.from("vacancy_requirement_relations").select("*").eq("organization_id", organizationId).eq("vacancy_version_id", version.id) : Promise.resolve({ data: [], error: null }),
      loadConceptLabels([...new Set([version.reference_concept_id, ...requirements.map((item) => item.concept_id)].filter((item): item is string => Boolean(item)))]),
      positionResult.data?.occupant_person_id
        ? supabase.from("people").select("full_name").eq("organization_id", organizationId).eq("id", positionResult.data.occupant_person_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    throwIfError(relationResult.error, "Não foi possível carregar os sinais relacionados confirmados.");
    throwIfError(occupantResult.error, "Não foi possível carregar a Pessoa ocupante.");
    const relations = relationResult.data ?? [];
    return {
      id: vacancy.id,
      organizationId,
      versionId: version.id,
      version: version.version,
      title: version.title,
      area: version.area ?? "",
      location: version.location ?? "",
      workArrangement: version.work_arrangement,
      employmentType: version.employment_type ?? "",
      occupancy: positionResult.data?.status === "occupied" ? "occupied" : "vacant",
      occupantPersonId: positionResult.data?.occupant_person_id ?? null,
      occupantName: occupantResult.data?.full_name ?? null,
      mission: version.mission ?? "",
      responsibilities: readStringArray(version.responsibilities),
      expectedOutcomes: readStringArray(version.expected_outcomes),
      requirements: requirements.map((item) => ({
        stableId: item.stable_id,
        label: item.label,
        category: item.category,
        importance: item.importance,
        observedTerm: item.observed_term,
        conceptId: item.concept_id,
        conceptLabel: item.concept_id ? conceptResult.get(item.concept_id) ?? null : null,
        relationMode: item.relation_mode,
        relatedSignals: relations.filter((relation) => relation.requirement_id === item.id).map((relation) => ({
          label: relation.related_label,
          conceptId: relation.related_concept_id,
          origin: relation.suggestion_origin,
        })),
        targetLevel: item.target_level,
        criticality: item.criticality,
        verificationPolicyRequirement: item.verification_policy_requirement,
      })),
      contextItems: readStringArray(version.context_items),
      sourceKind: version.source_kind,
      sourceVacancyId: version.source_vacancy_id,
      jobRoleId: version.source_job_role_id ?? vacancy.job_role_id,
      jobRoleName: roleResult.data?.name ?? version.title,
      referenceConceptId: version.reference_concept_id,
      saveAsRole: false,
      changeKind: "material",
      createdAt: vacancy.created_at,
      updatedAt: vacancy.updated_at,
    };
  },

  async save(organizationId: string, draft: VacancyDraft): Promise<{ id: string; version: number }> {
    const result = await supabase.rpc("save_vacancy_definition", {
      p_organization_id: organizationId,
      p_vacancy_id: draft.id,
      p_title: draft.title,
      p_area: draft.area,
      p_location: draft.location,
      p_work_arrangement: draft.workArrangement,
      p_employment_type: draft.employmentType,
      p_occupancy_status: draft.occupancy,
      p_occupant_person_id: draft.occupantPersonId,
      p_mission: draft.mission,
      p_responsibilities: draft.responsibilities as Json,
      p_expected_outcomes: draft.expectedOutcomes as Json,
      p_requirements: draft.requirements as unknown as Json,
      p_context_items: draft.contextItems as Json,
      p_source_kind: draft.sourceKind,
      p_source_vacancy_id: draft.sourceVacancyId,
      p_job_role_id: draft.jobRoleId,
      p_reference_concept_id: draft.referenceConceptId,
      p_save_as_role: draft.saveAsRole,
      p_change_kind: draft.changeKind,
    });
    if (result.error) throw new Error(humanizeVacancyError(result.error));
    const saved = result.data?.[0];
    if (!saved) throw new Error("A Vaga não foi confirmada pelo banco. Seu preenchimento foi preservado.");
    return { id: saved.vacancy_id, version: saved.version };
  },

  async listRoleTemplates(organizationId: string): Promise<OrganizationRoleTemplate[]> {
    const result = await supabase.from("job_roles").select("*").eq("organization_id", organizationId).order("name");
    throwIfError(result.error, "Não foi possível carregar as funções da empresa.");
    return (result.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      mission: item.mission ?? "",
      responsibilities: readStringArray(item.responsibilities),
      expectedOutcomes: readStringArray(item.expected_outcomes),
      requirements: readRequirements(item.requirements_template),
      contextItems: readStringArray(item.context_items),
      referenceConceptId: item.reference_concept_id,
    }));
  },

  async listOccupants(organizationId: string): Promise<Array<{ value: string; label: string }>> {
    const result = await supabase.from("people").select("id, full_name").eq("organization_id", organizationId)
      .eq("operational_status", "active").order("full_name").range(0, 499);
    throwIfError(result.error, "Não foi possível carregar as Pessoas disponíveis para vínculo.");
    return (result.data ?? []).map((item) => ({ value: item.id, label: item.full_name }));
  },

  async suggestReferences(organizationId: string, query: string): Promise<VacancyReferenceSuggestion[]> {
    if (query.trim().length < 2) return [];
    const result = await supabase.rpc("suggest_knowledge_concepts", { p_organization_id: organizationId, p_query: query.trim(), p_limit: 8 });
    throwIfError(result.error, "Não foi possível consultar as referências profissionais agora.");
    return (result.data ?? []).filter((item) => item.concept_type === "occupation").map((item) => ({
      conceptId: item.concept_id,
      label: item.canonical_label,
      scope: item.concept_scope,
      source: item.source_name,
    }));
  },

  async suggestAdvisorKnowledge(organizationId: string, query: string): Promise<VacancyAdvisorKnowledgeSuggestion[]> {
    if (query.trim().length < 2) return [];
    const result = await supabase.rpc("suggest_knowledge_concepts", { p_organization_id: organizationId, p_query: query.trim(), p_limit: 8 });
    throwIfError(result.error, "Não foi possível consultar a Knowledge para esta pergunta.");
    return (result.data ?? []).map((item) => ({
      conceptId: item.concept_id,
      label: item.canonical_label,
      conceptType: item.concept_type,
      scope: item.concept_scope,
      source: item.source_name,
    }));
  },

  async findPeople(organizationId: string, vacancy: VacancyDetail, includePrivateLocation = true): Promise<VacancyCandidateMatch[]> {
    const candidates = await loadPublishedProfileCandidates(organizationId, includePrivateLocation);
    return sortVacancyMatches(candidates.map((candidate) => matchVacancyCandidate(vacancy, candidate)));
  },

  async loadPeopleByIds(organizationId: string, vacancy: VacancyDetail, personIds: string[], includePrivateLocation = true): Promise<VacancyCandidateMatch[]> {
    const candidates = await loadPublishedProfileCandidates(organizationId, includePrivateLocation, personIds.slice(0, 2));
    return personIds.flatMap((id) => {
      const candidate = candidates.find((item) => item.personId === id);
      return candidate ? [matchVacancyCandidate(vacancy, candidate)] : [];
    });
  },

  async recordEvaluation(vacancy: VacancyDetail, match: VacancyCandidateMatch): Promise<void> {
    const result = await supabase.from("match_evaluations").insert({
      organization_id: vacancy.organizationId,
      person_id: match.candidate.personId,
      vacancy_id: vacancy.id!,
      vacancy_version_id: vacancy.versionId,
      evaluation_data: {
        vacancyVersion: vacancy.version,
        requirements: match.requirements.map((item) => ({
          stableId: item.requirement.stableId,
          label: item.requirement.label,
          status: item.status,
          explanation: item.explanation,
          evidence: item.evidence,
        })),
        sufficiency: match.missingRequiredCount ? "insufficient_evidence" : "sufficient_evidence",
      } as unknown as Json,
      matching_version: VACANCY_MATCHING_VERSION,
      prompt_version: "no-llm-prompt-1.0.0",
      model_version: "deterministic-local-2.0.0",
    });
    throwIfError(result.error, "A aderência foi calculada, mas o histórico não pôde ser registrado. Nenhuma conclusão foi perdida nesta tela.");
  },

  async history(organizationId: string, vacancyId: string): Promise<VacancyHistoryItem[]> {
    const result = await supabase.from("vacancy_events").select("id, event_type, metadata, created_at")
      .eq("organization_id", organizationId).eq("vacancy_id", vacancyId).order("created_at", { ascending: false });
    throwIfError(result.error, "Não foi possível carregar o histórico da Vaga.");
    return (result.data ?? []).map((item) => ({ id: item.id, type: item.event_type, version: readNumber(asRecord(item.metadata)?.version), createdAt: item.created_at }));
  },
};

async function loadConceptLabels(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const result = await supabase.from("knowledge_concepts").select("id, canonical_label").in("id", ids);
  throwIfError(result.error, "Não foi possível resolver as referências profissionais da Vaga.");
  return new Map((result.data ?? []).map((item) => [item.id, item.canonical_label]));
}

function readRequirements(value: Json): VacancyRequirementDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const label = readString(record?.label);
    const stableId = readString(record?.stableId);
    const category = readString(record?.category);
    const importance = readString(record?.importance);
    if (!label || !stableId || !isCategory(category) || (importance !== "required" && importance !== "desired")) return [];
    return [{ stableId, label, category, importance, observedTerm: readString(record?.observedTerm), conceptId: readString(record?.conceptId), relationMode: "direct" as const, relatedSignals: [] }];
  });
}

function readStringArray(value: Json): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []; }
function asRecord(value: Json | undefined): { [key: string]: Json | undefined } | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null; }
function readString(value: Json | undefined): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function readNumber(value: Json | undefined): number | null { return typeof value === "number" ? value : null; }
function isCategory(value: string | null): value is VacancyRequirementDraft["category"] { return Boolean(value && ["experience", "competency", "knowledge", "technology", "education", "certification", "language", "context"].includes(value)); }

function humanizeVacancyError(error: PostgrestError): string {
  const text = `${error.message} ${error.details ?? ""}`;
  if (/VACANCY_UNAUTHORIZED/.test(text)) return "Seu perfil não possui autorização para criar ou editar Vagas nesta empresa.";
  if (/VACANCY_OCCUPANT_REQUIRED/.test(text)) return "Selecione a Pessoa que ocupa esta posição antes de salvar.";
  if (/VACANCY_OCCUPANT_INVALID/.test(text)) return "A Pessoa selecionada não está disponível na empresa ativa.";
  if (/VACANCY_REFERENCE_INVALID|VACANCY_REQUIREMENT_CONCEPT_INVALID/.test(text)) return "Uma referência profissional não está mais disponível. Revise o item indicado e tente novamente.";
  if (/VACANCY_REQUIREMENT/.test(text)) return "Revise os requisitos: há um item incompleto ou com classificação inválida.";
  return "Não foi possível salvar a Vaga. Seu preenchimento foi preservado para nova tentativa.";
}

function throwIfError(error: PostgrestError | null, message: string): void { if (error) throw new Error(message); }
