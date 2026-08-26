import type { PlatformAccessProfile } from "../../shared/platformUsers";
import type { KnowledgeDashboard, KnowledgeProposalView, KnowledgeSettingsView } from "../../domain/knowledgeData";
import type { Json } from "./database.types";
import { supabase } from "./client";

export const knowledgeService = {
  async loadDashboard(profile: PlatformAccessProfile, organizationId: string | null): Promise<KnowledgeDashboard> {
    const [sourcesResult, conceptsResult, inboxResult, proposalsResult, impactsResult, settingsResult] = await Promise.all([
      profile === "super_admin" ? supabase.from("knowledge_sources").select("*").order("name") : Promise.resolve({ data: [], error: null }),
      supabase.from("knowledge_concepts").select("*").order("updated_at", { ascending: false }),
      supabase.from("knowledge_inbox").select("*").order("last_seen_at", { ascending: false }),
      supabase.from("knowledge_proposals").select("*").order("created_at", { ascending: false }),
      organizationId ? supabase.from("knowledge_reinterpretation_impacts").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      organizationId ? supabase.from("organization_knowledge_settings").select("*").eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    for (const result of [sourcesResult, conceptsResult, inboxResult, proposalsResult, impactsResult, settingsResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    const concepts = (conceptsResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.scope === "global" || row.organization_id === organizationId);
    const inbox = (inboxResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.organization_id === organizationId);
    const proposals = (proposalsResult.data ?? []).filter((row) => profile === "super_admin" ? row.scope === "global" : row.organization_id === organizationId);
    return {
      sources: (sourcesResult.data ?? []).map((row) => ({ id: row.id, name: row.name, domain: row.domain, sourceClass: row.source_class, method: row.method, license: row.license, lastVerifiedAt: row.last_verified_at, status: row.status })),
      concepts: concepts.map((row) => ({ id: row.id, canonicalLabel: row.canonical_label, conceptType: row.concept_type, scope: row.scope, description: row.description, version: row.version, status: row.status, updatedAt: row.updated_at })),
      inbox: inbox.map((row) => ({ id: row.id, originalTerm: row.original_term, occurrenceCount: row.occurrence_count, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at, scope: row.scope, status: row.status })),
      proposals: proposals.map(mapProposal),
      impacts: (impactsResult.data ?? []).map((row) => ({ id: row.id, personId: row.person_id, profileId: row.profile_id, conceptId: row.concept_id, policy: row.policy, status: row.status, createdAt: row.created_at })),
      settings: settingsResult.data ? { allowExternalKnowledgeEnrichment: settingsResult.data.allow_external_knowledge_enrichment, reinterpretationPolicy: settingsResult.data.reinterpretation_policy } : { allowExternalKnowledgeEnrichment: false, reinterpretationPolicy: "off" },
    };
  },
  async research(inboxId: string) {
    const { data, error } = await supabase.functions.invoke("knowledge-agent", { body: { inboxId } });
    if (error) throw new Error(error.message);
    return data;
  },
  async approveProposal(proposalId: string) {
    const { data, error } = await supabase.rpc("approve_knowledge_proposal", { p_proposal_id: proposalId, p_human_edited_proposal: null, p_decision_reason: "Aprovado na administração de Conhecimento" });
    if (error) throw new Error(error.message);
    return data[0];
  },
  async saveSettings(organizationId: string, settings: KnowledgeSettingsView) {
    const { error } = await supabase.from("organization_knowledge_settings").upsert({
      organization_id: organizationId,
      allow_external_knowledge_enrichment: settings.allowExternalKnowledgeEnrichment,
      reinterpretation_policy: settings.reinterpretationPolicy,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  },
  async dispatchReinterpretation(organizationId: string, impactId: string) {
    const { data, error } = await supabase.rpc("dispatch_knowledge_reinterpretation", {
      p_organization_id: organizationId, p_impact_id: impactId, p_idempotency_key: `knowledge-ui-${impactId}`,
    });
    if (error) throw new Error(error.message);
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
