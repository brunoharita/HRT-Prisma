import type { ProfessionalEvidenceProjection } from "./personProfessionalEvidence.js";
import type { KnowledgeConceptSuggestion } from "./knowledgeData.js";
import type { CompetencyClassification, CompetencyMatchClass, CompetencyTaxonomyReference } from "./competencyTaxonomy.js";

export type PendingCompetency = ProfessionalEvidenceProjection["normalization"]["items"][number] & { occurrence?: number; groupCount?: number };
export const CURATION_WORKFLOW_VERSION = "profile-competency-curation-5.0.0";
export const CURATION_PAGE_SIZE = 10;
export function competencyKey(item: PendingCompetency): string {
  return JSON.stringify([item.originalIndex, item.originalTerm, item.sourceText, item.normalizedTerm, item.occurrence ?? 0]);
}
export function pendingCompetencies(projection: ProfessionalEvidenceProjection): PendingCompetency[] {
  const occurrences = new Map<string, number>();
  return projection.normalization.items.map((item) => {
    const key = competencyKey(item), occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return { ...item, occurrence };
  }).filter((item) => !["resolved", "human_preserved"].includes(item.state));
}
export function curationReturnTarget(before: PendingCompetency[], after: PendingCompetency[], selectedKey: string, advance: boolean): string | null {
  const remaining = new Set(after.map(competencyKey));
  if (!advance && remaining.has(selectedKey)) return selectedKey;
  const index = before.findIndex((item) => competencyKey(item) === selectedKey);
  const candidates = [...before.slice(index + 1), ...before.slice(0, Math.max(0, index)).reverse()];
  return candidates.map(competencyKey).find((key) => remaining.has(key)) ?? after.map(competencyKey).find((key) => key !== selectedKey) ?? null;
}
export function curationPage(items: PendingCompetency[], key: string | null, currentPage: number): number {
  const index = items.findIndex((item) => competencyKey(item) === key);
  return index >= 0 ? Math.floor(index / CURATION_PAGE_SIZE) + 1 : Math.max(1, Math.min(currentPage, Math.ceil(items.length / CURATION_PAGE_SIZE)));
}
export interface CurationCandidate extends KnowledgeConceptSuggestion {
  description: string;
  matchedTerm: string;
  matchClass: CompetencyMatchClass;
  aliasAuthority: string;
  references: CompetencyTaxonomyReference[];
  classificationState: "classified" | "pending";
  classification: CompetencyClassification | null;
}
export interface CompetencySubgroupOption {
  id: string;
  code: string;
  label: string;
  macroGroupCode: "hard" | "soft";
  scope: "global" | "organization";
  organizationId: string | null;
  definition?: string;
  classificationQuestion?: string;
  examples?: string[];
  sortOrder?: number;
}
export function groupPendingCompetencies(items: PendingCompetency[]): PendingCompetency[] {
  const groups = new Map<string, PendingCompetency[]>();
  for (const item of items) {
    const key = item.normalizedTerm.normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("pt-BR");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((group) => ({
    ...group[0]!,
    groupCount: group.length,
    searchTerms: [...new Set(group.flatMap((item) => [item.normalizedTerm, ...item.searchTerms, item.sourceText]).filter(Boolean))].slice(0, 8),
  }));
}
export interface CurationDecision {
  item: PendingCompetency; profileId: string; scope: "organization" | "global";
  action: "alias" | "proposal"; conceptId: string | null; proposalLabel: string; proposalDescription: string;
  subgroupId: string | null;
}
export interface CompetencyCurationAdapter {
  canUseGlobal: boolean;
  loadSubgroups(): Promise<CompetencySubgroupOption[]>;
  search(query: string): Promise<CurationCandidate[]>;
  save(decision: CurationDecision): Promise<{ projection: ProfessionalEvidenceProjection; outcome: "alias" | "proposal" }>;
  refresh(): Promise<ProfessionalEvidenceProjection>;
  loadEvidenceSources(profileId: string): Promise<Array<{ nature: "contextual" | "certified"; index: number; label: string; quote: string }>>;
  linkEvidence(input: { profileId: string; conceptId: string; nature: "contextual" | "certified"; sourceIndex: number;
    sourceQuote: string; credentialName: string | null; credentialIssuer: string | null; reason: string }): Promise<ProfessionalEvidenceProjection>;
}
