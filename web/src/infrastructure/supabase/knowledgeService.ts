import type { PlatformAccessProfile } from "../../shared/platformUsers";
import type { KnowledgeConceptSuggestion, KnowledgeDashboard, KnowledgeProposalView, KnowledgeSettingsView } from "../../domain/knowledgeData";
import { supabaseFunctionOperationError, supabaseOperationError } from "../../domain/reviewOperationErrors";
import type { Json } from "./database.types";
import { supabase } from "./client";
import { readCompetencyTaxonomySearch } from "../../domain/competencyTaxonomy";
import { isKnowledgeProposalVisible } from "../../shared/knowledgeProposalVisibility";
import type { CompetencySubgroupOption } from "../../domain/profileCompetencyCuration";

export const knowledgeService = {
  async loadDashboard(profile: PlatformAccessProfile, organizationId: string | null): Promise<KnowledgeDashboard> {
    const [sourcesResult, versionsResult, conceptsResult, termsResult, mappingsResult, relationsResult, inboxResult, proposalsResult, impactsResult, settingsResult] = await Promise.all([
      supabase.from("knowledge_sources").select("*").order("name"),
      supabase.from("knowledge_source_versions").select("*").order("created_at", { ascending: false }),
      supabase.from("knowledge_concepts").select("*").order("updated_at", { ascending: false }),
      supabase.from("knowledge_terms").select("*").eq("status", "approved"),
      supabase.from("knowledge_external_mappings").select("*"),
      supabase.from("knowledge_relations").select("*").eq("status", "approved"),
      supabase.from("knowledge_inbox").select("*").order("last_seen_at", { ascending: false }),
      supabase.from("knowledge_proposals").select("*").order("created_at", { ascending: false }),
      organizationId ? supabase.from("knowledge_reinterpretation_impacts").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      organizationId ? supabase.from("organization_knowledge_settings").select("*").eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    for (const result of [sourcesResult, versionsResult, conceptsResult, termsResult, mappingsResult, relationsResult, inboxResult, proposalsResult, impactsResult, settingsResult]) {
      if (result.error) throw supabaseOperationError(result.error, "Não foi possível carregar o ambiente de Conhecimento.");
    }
    const concepts = (conceptsResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.scope === "global" || row.organization_id === organizationId);
    const inbox = (inboxResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.organization_id === organizationId);
    const proposals = (proposalsResult.data ?? []).filter((row) => isKnowledgeProposalVisible({ scope: row.scope, organizationId: row.organization_id, status: row.status }, profile, organizationId));
    const conceptsById = new Map(concepts.map((row) => [row.id, row]));
    const sourcesById = new Map((sourcesResult.data ?? []).map((row) => [row.id, row]));
    const versionsById = new Map((versionsResult.data ?? []).map((row) => [row.id, row]));
    return {
      sources: (sourcesResult.data ?? []).map((row) => { const sourceVersions = (versionsResult.data ?? []).filter((item) => item.source_id === row.id); const version = sourceVersions.find((item) => item.is_current) ?? null; const pending = sourceVersions.find((item) => item.import_status === "diff_ready" && !item.is_current) ?? null; const mapVersion = (item: typeof version) => item ? { id: item.id, externalVersion: item.external_version, releaseDate: item.release_date, retrievalDate: item.retrieval_date, checksumSha256: item.checksum_sha256, importStatus: item.import_status, isCurrent: item.is_current, publishedAt: item.published_at, counts: item.counts, officialUrl: item.official_url } : null; return { id: row.id, name: row.name, domain: row.domain, sourceClass: row.source_class, method: row.method, license: row.license, lastVerifiedAt: row.last_verified_at, status: row.status,
        currentVersion: mapVersion(version), pendingVersion: mapVersion(pending) }; }),
      concepts: concepts.map((row) => ({ id: row.id, canonicalLabel: row.canonical_label, conceptType: row.concept_type, scope: row.scope, description: row.description, version: row.version, status: row.status, updatedAt: row.updated_at,
        aliases: (termsResult.data ?? []).filter((term) => term.concept_id === row.id).map((term) => term.term),
        mappings: (mappingsResult.data ?? []).filter((mapping) => mapping.concept_id === row.id).map((mapping) => ({ source: sourcesById.get(mapping.source_id)?.name ?? "Fonte", sourceVersion: versionsById.get(mapping.source_version_id)?.external_version ?? "Versão não disponível", externalId: mapping.external_id, externalUri: mapping.external_uri })),
        relations: (relationsResult.data ?? []).filter((relation) => relation.source_concept_id === row.id).map((relation) => ({ type: relation.relation_type, targetLabel: conceptsById.get(relation.target_concept_id)?.canonical_label ?? "Conceito relacionado",
          source: sourcesById.get(relation.source_id ?? "")?.name ?? "Fonte", sourceVersion: versionsById.get(relation.source_version_id ?? "")?.external_version ?? "Versão não disponível", attributes: relation.relation_attributes })),
      })),
      inbox: inbox.map((row) => ({ id: row.id, originalTerm: row.original_term, occurrenceCount: row.occurrence_count, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at, scope: row.scope, status: row.status,
        candidateConcepts: row.candidate_concept_ids.flatMap((id) => { const concept = conceptsById.get(id); return concept ? [{ id, label: concept.canonical_label }] : []; }), observationCount: row.observation_ids.length })),
      proposals: proposals.map(mapProposal),
      impacts: (impactsResult.data ?? []).map((row) => ({ id: row.id, personId: row.person_id, profileId: row.profile_id, conceptId: row.concept_id, policy: row.policy, status: row.status, createdAt: row.created_at })),
      settings: settingsResult.data ? { allowExternalKnowledgeEnrichment: settingsResult.data.allow_external_knowledge_enrichment, reinterpretationPolicy: settingsResult.data.reinterpretation_policy } : { allowExternalKnowledgeEnrichment: false, reinterpretationPolicy: "off" },
    };
  },
  async suggestConcepts(organizationId: string, query: string): Promise<KnowledgeConceptSuggestion[]> {
    const { data, error } = await supabase.rpc("suggest_knowledge_concepts", { p_organization_id: organizationId, p_query: query, p_limit: 8 });
    if (error) throw supabaseOperationError(error, "Não foi possível buscar conceitos candidatos.");
    return data.map((row) => ({ id: row.concept_id, canonicalLabel: row.canonical_label, conceptType: row.concept_type,
      scope: row.concept_scope, aliases: row.aliases, sourceName: row.source_name, sourceVersion: row.source_version,
      externalId: row.external_id, externalUri: row.external_uri, method: row.suggestion_method }));
  },
  async searchCompetencyTaxonomy(organizationId: string, query: string) {
    const { data, error } = await supabase.rpc("search_competency_taxonomy_v2" as never, {
      p_organization_id: organizationId, p_query: query, p_limit: 8,
    } as never);
    if (error) throw supabaseOperationError(error, "Não foi possível buscar na Taxonomia de Competências.");
    return readCompetencyTaxonomySearch(data);
  },
  async listCompetencySubgroups(organizationId: string | null): Promise<CompetencySubgroupOption[]> {
    const { data, error } = await supabase.from("competency_subgroups" as never).select("id,code,label,macro_group_code,scope,organization_id,definition,classification_question,examples,sort_order")
      .eq("status", "active").order("sort_order");
    if (error) throw supabaseOperationError(error, "Não foi possível carregar os subagrupadores.");
    return ((data ?? []) as Array<{ id: string; code: string; label: string; macro_group_code: "hard" | "soft";
      scope: "global" | "organization"; organization_id: string | null; definition: string;
      classification_question: string; examples: unknown; sort_order: number }>).filter((row) => row.scope === "global" || row.organization_id === organizationId)
      .map((row) => ({ id: row.id, code: row.code, label: row.label, macroGroupCode: row.macro_group_code,
        scope: row.scope, organizationId: row.organization_id, definition: row.definition,
        classificationQuestion: row.classification_question,
        examples: Array.isArray(row.examples) ? row.examples.filter((value): value is string => typeof value === "string") : [],
        sortOrder: row.sort_order }));
  },
  async listCompetencyMacroGroups(): Promise<Array<{ code: "hard" | "soft"; label: string; definition: string; sortOrder: number }>> {
    const { data, error } = await supabase.from("competency_macro_groups" as never).select("code,label,definition,sort_order").order("sort_order");
    if (error) throw supabaseOperationError(error, "Não foi possível carregar os macrogrupos.");
    return ((data ?? []) as Array<{ code: "hard" | "soft"; label: string; definition: string; sort_order: number }>).map((row) => ({
      code: row.code, label: row.label, definition: row.definition, sortOrder: row.sort_order,
    }));
  },
  async resolveInboxAlias(input: { inboxId: string; conceptId: string; scope: "global" | "organization"; reason: string }) {
    const { data, error } = await supabase.rpc("resolve_knowledge_inbox_alias", { p_inbox_id: input.inboxId, p_concept_id: input.conceptId, p_scope: input.scope, p_reason: input.reason });
    if (error) throw supabaseOperationError(error, "Não foi possível aprovar o alias.");
    return data[0];
  },
  async proposeConcept(input: { inboxId: string; scope: "global" | "organization"; canonicalLabel: string; conceptType: "occupation" | "competency"; subgroupId: string | null; description: string; reason: string }) {
    const { data, error } = input.conceptType === "occupation"
      ? await supabase.rpc("propose_knowledge_concept_from_inbox", { p_inbox_id: input.inboxId, p_scope: input.scope, p_canonical_label: input.canonicalLabel, p_concept_type: "occupation", p_description: input.description, p_reason: input.reason })
      : await supabase.rpc("propose_knowledge_concept_from_inbox_v2" as never, { p_inbox_id: input.inboxId, p_scope: input.scope,
        p_canonical_label: input.canonicalLabel, p_subgroup_id: input.subgroupId, p_description: input.description, p_reason: input.reason } as never);
    if (error) throw supabaseOperationError(error, "Não foi possível criar a proposta.");
    return data;
  },
  async research(inboxId: string) {
    const { data, error } = await supabase.functions.invoke("knowledge-agent", { body: { inboxId } });
    if (error) throw await supabaseFunctionOperationError(error, "Não foi possível pesquisar este termo.");
    return data;
  },
  async researchGlobalContribution(proposalId: string, inboxId: string) {
    const { data, error } = await supabase.functions.invoke("knowledge-agent", { body: { inboxId, contributionProposalId: proposalId } });
    if (error) throw await supabaseFunctionOperationError(error, "Não foi possível pesquisar esta contribuição.");
    return data;
  },
  async publishSourceVersion(sourceVersionId: string) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const { data, error } = await supabase.functions.invoke("knowledge-source-publish", { body: { sourceVersionId, batchSize: 5000 } });
      if (error) throw await supabaseFunctionOperationError(error, "Não foi possível concluir a publicação desta versão. A operação pode ser retomada pelo mesmo botão.");
      const result = data as { source: string; version: string; result: { done: boolean; phase: string; processed: number; concepts_published: number; terms_published: number; relations_published: number } };
      if (result.result.done) return result;
    }
    throw new Error("A publicação foi interrompida antes da conclusão. Tente novamente para continuar.");
  },
  async approveProposal(proposalId: string, subgroupId: string | null, reason: string) {
    const { data, error } = await supabase.rpc("approve_knowledge_proposal_v2" as never, { p_proposal_id: proposalId,
      p_subgroup_id: subgroupId, p_decision_reason: reason } as never);
    if (error) throw supabaseOperationError(error, "Não foi possível aprovar esta proposta.");
    return data[0];
  },
  async transitionLegacyProposal(proposalId: string, organizationId: string, subgroupId: string | null, reason: string) {
    const { data, error } = await supabase.rpc("transition_legacy_knowledge_proposal_v2" as never, {
      p_proposal_id: proposalId, p_organization_id: organizationId, p_subgroup_id: subgroupId, p_reason: reason,
    } as never);
    if (error) throw supabaseOperationError(error, "Não foi possível regularizar a proposta legada.");
    return data;
  },
  async decideGlobalContribution(proposalId: string, decision: "rejected" | "deferred", reason: string) {
    const { data, error } = await supabase.rpc("decide_knowledge_global_contribution", {
      p_proposal_id: proposalId, p_decision: decision, p_reason: reason,
    });
    if (error) throw supabaseOperationError(error, "Não foi possível registrar esta decisão global.");
    return data;
  },
  async saveSettings(organizationId: string, settings: KnowledgeSettingsView) {
    const { error } = await supabase.from("organization_knowledge_settings").upsert({
      organization_id: organizationId,
      allow_external_knowledge_enrichment: settings.allowExternalKnowledgeEnrichment,
      reinterpretation_policy: settings.reinterpretationPolicy,
      updated_at: new Date().toISOString(),
    });
    if (error) throw supabaseOperationError(error, "Não foi possível salvar as configurações de Conhecimento.");
  },
  async dispatchReinterpretation(organizationId: string, impactId: string) {
    const { data, error } = await supabase.rpc("dispatch_knowledge_reinterpretation", {
      p_organization_id: organizationId, p_impact_id: impactId, p_idempotency_key: `knowledge-ui-${impactId}`,
    });
    if (error) throw supabaseOperationError(error, "Não foi possível iniciar a reanálise dos perfis afetados.");
    return data[0];
  },
};

function mapProposal(row: { id: string; inbox_id: string; scope: "global" | "organization"; status: string; organization_id: string | null; origin_organization_id: string | null; original_proposal: Json }): KnowledgeProposalView {
  const payload = isObject(row.original_proposal) ? row.original_proposal : {};
  return {
    id: row.id, inboxId: row.inbox_id, scope: row.scope, organizationId: row.organization_id, status: row.status, originalProposal: row.original_proposal,
    observedTerm: typeof payload.observed_term === "string" ? payload.observed_term : "Termo não informado",
    proposedConcept: isObject(payload.proposed_concept) ? payload.proposed_concept : {},
    sources: Array.isArray(payload.sources) ? payload.sources.filter(isObject) : [],
    candidateConcepts: Array.isArray(payload.candidate_concepts) ? payload.candidate_concepts.filter(isObject).map((candidate) => ({
      id: typeof candidate.id === "string" ? candidate.id : undefined,
      canonical_label: typeof candidate.canonical_label === "string" ? candidate.canonical_label : undefined,
      concept_type: typeof candidate.concept_type === "string" ? candidate.concept_type : undefined,
      match: typeof candidate.match === "string" ? candidate.match : undefined,
    })) : [],
    originOrganizationId: row.origin_organization_id,
  };
}
function isObject(value: unknown): value is Record<string, Json | undefined> { return typeof value === "object" && value !== null && !Array.isArray(value); }
