import type { Json } from "../infrastructure/supabase/database.types";

export interface KnowledgeSourceView {
  id: string; name: string; domain: string; sourceClass: string; method: string; license: string | null;
  lastVerifiedAt: string | null; status: string; currentVersion: KnowledgeSourceVersionView | null;
}
export interface KnowledgeSourceVersionView { id: string; externalVersion: string; releaseDate: string | null; retrievalDate: string | null;
  checksumSha256: string | null; importStatus: string; isCurrent: boolean; publishedAt: string | null; counts: Json; officialUrl: string | null; }
export interface KnowledgeConceptView {
  id: string; canonicalLabel: string; conceptType: string; scope: "global" | "organization";
  description: string; version: number; status: string; updatedAt: string; aliases: string[];
  mappings: Array<{ source: string; sourceVersion: string; externalId: string; externalUri: string | null }>;
  relations: Array<{ type: string; targetLabel: string }>;
}
export interface KnowledgeInboxView {
  id: string; originalTerm: string; occurrenceCount: number; firstSeenAt: string; lastSeenAt: string;
  scope: "global" | "organization"; status: string; candidateConcepts: Array<{ id: string; label: string }>;
  observationCount: number;
}
export interface KnowledgeProposalView {
  id: string; observedTerm: string; proposedConcept: { canonical_label?: string; concept_type?: string; description?: string };
  sources: Array<{ url?: string; title?: string; publisher?: string; source_class?: string; retrieved_at?: string }>;
  status: string; originalProposal: Json;
}
export interface KnowledgeImpactView {
  id: string; personId: string; profileId: string; conceptId: string; policy: string; status: string; createdAt: string;
}
export interface KnowledgeSettingsView {
  allowExternalKnowledgeEnrichment: boolean;
  reinterpretationPolicy: "off" | "manual" | "daily" | "weekly" | "monthly" | "custom";
}
export interface KnowledgeDashboard {
  sources: KnowledgeSourceView[]; concepts: KnowledgeConceptView[]; inbox: KnowledgeInboxView[];
  proposals: KnowledgeProposalView[]; impacts: KnowledgeImpactView[]; settings: KnowledgeSettingsView;
}
export interface KnowledgeConceptSuggestion { id: string; canonicalLabel: string; conceptType: string; scope: "global" | "organization";
  aliases: string[]; sourceName: string | null; sourceVersion: string | null; externalId: string | null; externalUri: string | null; method: string; }
