import type { ProfessionalEvidenceProjection } from "./personProfessionalEvidence.js";
import type { KnowledgeConceptSuggestion } from "./knowledgeData.js";
import type { CompetencyMatchClass, CompetencyTaxonomyReference } from "./competencyTaxonomy.js";

export type PendingCompetency = ProfessionalEvidenceProjection["normalization"]["items"][number] & { occurrence?: number };
export const CURATION_WORKFLOW_VERSION = "profile-competency-curation-2.0.0";
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
}
export interface CurationDecision {
  item: PendingCompetency; profileId: string; scope: "organization" | "global"; reason: string;
  action: "alias" | "proposal"; conceptId: string | null; proposalLabel: string; proposalType: "skill" | "competency" | "knowledge" | "technology" | "methodology" | "certification";
}
export interface CompetencyCurationAdapter {
  canUseGlobal: boolean;
  search(query: string): Promise<CurationCandidate[]>;
  save(decision: CurationDecision): Promise<{ projection: ProfessionalEvidenceProjection; outcome: "alias" | "proposal" }>;
  refresh(): Promise<ProfessionalEvidenceProjection>;
}
