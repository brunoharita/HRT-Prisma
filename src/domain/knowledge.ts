import { createHash } from "node:crypto";

export const KNOWLEDGE_CONCEPT_TYPES = [
  "occupation", "skill", "knowledge", "technology", "methodology", "certification",
] as const;

export const KNOWLEDGE_RELATION_TYPES = [
  "is_a", "part_of", "related_to", "requires", "uses", "applies_to", "supports",
  "equivalent_to", "broader_than", "narrower_than",
] as const;

export const KNOWLEDGE_NORMALIZATION_VERSION = "knowledge-normalization-2.0.0";
export type KnowledgeConceptType = typeof KNOWLEDGE_CONCEPT_TYPES[number];
export type KnowledgeRelationType = typeof KNOWLEDGE_RELATION_TYPES[number];
export type KnowledgeScope = "global" | "organization";
export type KnowledgeSourceClass =
  | "official_occupational_taxonomy"
  | "official_vendor_documentation"
  | "official_certification_issuer"
  | "official_standard_body"
  | "official_government_or_public_body"
  | "recognized_nonprofit_foundation"
  | "secondary_recognized_source";

export interface KnowledgeTerm {
  id: string; conceptId: string; organizationId: string | null; scope: KnowledgeScope;
  text: string; normalizedText: string; language: string;
  status: "draft" | "approved" | "deprecated" | "rejected"; ambiguous: boolean;
}

export interface KnowledgeConcept {
  id: string; organizationId: string | null; scope: KnowledgeScope; conceptType: KnowledgeConceptType;
  canonicalLabel: string; description: string; version: number;
  status: "draft" | "approved" | "deprecated" | "rejected";
}

export interface KnowledgeCatalog {
  concepts: readonly KnowledgeConcept[]; terms: readonly KnowledgeTerm[];
  globalVersion: number; organizationVersion: number | null;
}

export interface KnowledgeResolution {
  observedTerm: string; normalizedSearchTerm: string;
  state: "resolved" | "ambiguous" | "unresolved";
  concept: KnowledgeConcept | null; candidates: KnowledgeConcept[];
  knowledgeGlobalVersion: number; knowledgeOrganizationVersion: number | null;
  method: "organization_exact" | "global_exact" | "ambiguous_exact" | "no_safe_match";
}

export interface KnowledgeResearchSource {
  url: string; title: string; publisher: string; sourceClass: KnowledgeSourceClass; retrievedAt: string;
}

export interface KnowledgeProposal {
  observedTerm: string;
  proposedConcept: { canonicalLabel: string; conceptType: KnowledgeConceptType; description: string };
  aliases: string[];
  proposedRelations: Array<{ targetLabel: string; relationType: KnowledgeRelationType }>;
  sources: KnowledgeResearchSource[]; rationale: string; unresolvedQuestions: string[];
}

export interface SanitizedKnowledgeResearchRequest {
  term: string; language: string; scope: KnowledgeScope;
}

export function normalizeKnowledgeTerm(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9+#.]+/g, " ").trim().replace(/\s+/g, " ");
}

export function resolveKnowledgeTerm(
  observedTerm: string,
  organizationId: string | null,
  catalog: KnowledgeCatalog,
): KnowledgeResolution {
  const normalizedSearchTerm = normalizeKnowledgeTerm(observedTerm);
  const approvedConcepts = new Map(catalog.concepts.filter((concept) => concept.status === "approved").map((concept) => [concept.id, concept]));
  const matchingTerms = catalog.terms.filter((term) => term.status === "approved" && term.normalizedText === normalizedSearchTerm && approvedConcepts.has(term.conceptId));
  const organizationCandidates = uniqueConcepts(matchingTerms.filter((term) => term.scope === "organization" && term.organizationId === organizationId).map((term) => approvedConcepts.get(term.conceptId)!));
  const globalCandidates = uniqueConcepts(matchingTerms.filter((term) => term.scope === "global").map((term) => approvedConcepts.get(term.conceptId)!));
  const candidates = organizationCandidates.length > 0 ? organizationCandidates : globalCandidates;
  const ambiguous = candidates.length > 1 || matchingTerms.some((term) => candidates.some((candidate) => candidate.id === term.conceptId) && term.ambiguous);
  if (candidates.length === 1 && !ambiguous) {
    return { observedTerm, normalizedSearchTerm, state: "resolved", concept: candidates[0]!, candidates,
      knowledgeGlobalVersion: catalog.globalVersion, knowledgeOrganizationVersion: catalog.organizationVersion,
      method: organizationCandidates.length > 0 ? "organization_exact" : "global_exact" };
  }
  return { observedTerm, normalizedSearchTerm, state: candidates.length > 0 ? "ambiguous" : "unresolved", concept: null, candidates,
    knowledgeGlobalVersion: catalog.globalVersion, knowledgeOrganizationVersion: catalog.organizationVersion,
    method: candidates.length > 0 ? "ambiguous_exact" : "no_safe_match" };
}

export function createKnowledgeInboxFingerprint(input: {
  normalizedTerm: string; language: string; scope: KnowledgeScope; organizationId: string | null;
}): string {
  return createHash("sha256").update([input.scope, input.organizationId ?? "global", input.language, input.normalizedTerm].join("|")).digest("hex");
}

export function buildSanitizedResearchRequest(input: { term: string; language: string; scope: KnowledgeScope }): SanitizedKnowledgeResearchRequest {
  const term = input.term.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!term || term.length > 160) throw new Error("invalid_knowledge_term");
  return { term, language: input.language, scope: input.scope };
}

export function validateResearchRequestHasNoPii(serializedPayload: string, prohibitedValues: readonly string[]): void {
  const normalizedPayload = serializedPayload.toLocaleLowerCase("pt-BR");
  for (const value of prohibitedValues.filter(Boolean)) {
    if (normalizedPayload.includes(value.toLocaleLowerCase("pt-BR"))) throw new Error("pii_outbound_blocked");
  }
  for (const forbiddenKey of ["person_id", "organization_id", "storage_path", "resume_text", "email", "phone", "cpf"]) {
    if (new RegExp(`\\"${forbiddenKey}\\"\\s*:`, "i").test(serializedPayload)) throw new Error("pii_outbound_blocked");
  }
}

export function validateKnowledgeProposal(proposal: KnowledgeProposal, allowedDomains: ReadonlySet<string>): void {
  if (!KNOWLEDGE_CONCEPT_TYPES.includes(proposal.proposedConcept.conceptType)) throw new Error("invalid_concept_type");
  if (!proposal.observedTerm.trim() || !proposal.proposedConcept.canonicalLabel.trim()) throw new Error("invalid_proposal");
  if (proposal.sources.length === 0) throw new Error("source_required");
  const officialSources = proposal.sources.filter((source) => source.sourceClass !== "secondary_recognized_source");
  const secondaryDomains = new Set(proposal.sources.filter((source) => source.sourceClass === "secondary_recognized_source").map((source) => new URL(source.url).hostname));
  if (officialSources.length === 0 && secondaryDomains.size < 2) throw new Error("two_independent_secondary_sources_required");
  for (const source of proposal.sources) {
    const url = new URL(source.url);
    const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
    if (url.protocol !== "https:" || !allowedDomains.has(hostname)) throw new Error("source_domain_not_allowed");
    if (!source.title.trim() || !source.publisher.trim() || !source.retrievedAt) throw new Error("source_metadata_required");
  }
}

function uniqueConcepts(concepts: readonly KnowledgeConcept[]): KnowledgeConcept[] {
  return [...new Map(concepts.map((concept) => [concept.id, concept])).values()];
}
