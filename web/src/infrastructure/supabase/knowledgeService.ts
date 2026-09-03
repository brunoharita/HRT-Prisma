import type { PlatformAccessProfile } from "../../shared/platformUsers";
import type { KnowledgeConceptSuggestion, KnowledgeDashboard, KnowledgeProposalView, KnowledgeSettingsView } from "../../domain/knowledgeData";
import { supabaseFunctionOperationError, supabaseOperationError } from "../../domain/reviewOperationErrors";
import type { Json } from "./database.types";
import { supabase } from "./client";

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
    const proposals = (proposalsResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.organization_id === organizationId);
    const conceptsById = new Map(concepts.map((row) => [row.id, row]));
    const sourcesById = new Map((sourcesResult.data ?? []).map((row) => [row.id, row]));
    const versionsById = new Map((versionsResult.data ?? []).map((row) => [row.id, row]));
    return {
      sources: (sourcesResult.data ?? []).map((row) => { const version = (versionsResult.data ?? []).find((item) => item.source_id === row.id && item.is_current) ?? null; return { id: row.id, name: row.name, domain: row.domain, sourceClass: row.source_class, method: row.method, license: row.license, lastVerifiedAt: row.last_verified_at, status: row.status,
        currentVersion: version ? { id: version.id, externalVersion: version.external_version, releaseDate: version.release_date, retrievalDate: version.retrieval_date, checksumSha256: version.checksum_sha256, importStatus: version.import_status, isCurrent: version.is_current, publishedAt: version.published_at, counts: version.counts, officialUrl: version.official_url } : null }; }),
      concepts: concepts.map((row) => ({ id: row.id, canonicalLabel: row.canonical_label, conceptType: row.concept_type, scope: row.scope, description: row.description, version: row.version, status: row.status, updatedAt: row.updated_at,
        aliases: (termsResult.data ?? []).filter((term) => term.concept_id === row.id).map((term) => term.term),
        mappings: (mappingsResult.data ?? []).filter((mapping) => mapping.concept_id === row.id).map((mapping) => ({ source: sourcesById.get(mapping.source_id)?.name ?? "Fonte", sourceVersion: versionsById.get(mapping.source_version_id)?.external_version ?? "Versão não disponível", externalId: mapping.external_id, externalUri: mapping.external_uri })),
        relations: (relationsResult.data ?? []).filter((relation) => relation.source_concept_id === row.id).map((relation) => ({ type: relation.relation_type, targetLabel: conceptsById.get(relation.target_concept_id)?.canonical_label ?? "Conceito relacionado" })) })),
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
  async resolveInboxAlias(input: { inboxId: string; conceptId: string; scope: "global" | "organization"; reason: string }) {
    const { data, error } = await supabase.rpc("resolve_knowledge_inbox_alias", { p_inbox_id: input.inboxId, p_concept_id: input.conceptId, p_scope: input.scope, p_reason: input.reason });
    if (error) throw supabaseOperationError(error, "Não foi possível aprovar o alias.");
    return data[0];
  },
  async proposeConcept(input: { inboxId: string; scope: "global" | "organization"; canonicalLabel: string; conceptType: "occupation" | "skill" | "knowledge" | "technology" | "methodology" | "certification"; description: string; reason: string }) {
    const { data, error } = await supabase.rpc("propose_knowledge_concept_from_inbox", { p_inbox_id: input.inboxId, p_scope: input.scope, p_canonical_label: input.canonicalLabel, p_concept_type: input.conceptType, p_description: input.description, p_reason: input.reason });
    if (error) throw supabaseOperationError(error, "Não foi possível criar a proposta.");
    return data;
  },
  async research(inboxId: string) {
    const { data, error } = await supabase.functions.invoke("knowledge-agent", { body: { inboxId } });
    if (error) throw await supabaseFunctionOperationError(error, "Não foi possível pesquisar este termo.");
    return data;
  },
  async approveProposal(proposalId: string) {
    const { data, error } = await supabase.rpc("approve_knowledge_proposal", { p_proposal_id: proposalId, p_human_edited_proposal: null, p_decision_reason: "Aprovado na administração de Conhecimento" });
    if (error) throw supabaseOperationError(error, "Não foi possível aprovar esta proposta.");
    return data[0];
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

function mapProposal(row: { id: string; status: string; original_proposal: Json }): KnowledgeProposalView {
  const payload = isObject(row.original_proposal) ? row.original_proposal : {};
  return {
    id: row.id, status: row.status, originalProposal: row.original_proposal,
    observedTerm: typeof payload.observed_term === "string" ? payload.observed_term : "Termo não informado",
    proposedConcept: isObject(payload.proposed_concept) ? payload.proposed_concept : {},
    sources: Array.isArray(payload.sources) ? payload.sources.filter(isObject) : [],
  };
}
function isObject(value: unknown): value is Record<string, Json | undefined> { return typeof value === "object" && value !== null && !Array.isArray(value); }
