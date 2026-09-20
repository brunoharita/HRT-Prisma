import type { ProfessionalConceptType } from "./positionTaxonomy.js";

export const COMPETENCY_TAXONOMY_CONTRACT = "competency-taxonomy-2.0.0";
export const COMPETENCY_TAXONOMY_SEARCH_CONTRACT = "competency-taxonomy-search-2.0.0";

export interface CompetencyClassification {
  macroGroupCode: "hard" | "soft";
  macroGroupLabel: string;
  subgroupId: string;
  subgroupCode: string;
  subgroupLabel: string;
  classificationVersion: number;
  taxonomyVersion: typeof COMPETENCY_TAXONOMY_CONTRACT;
}

export type CompetencyMatchClass = "exact" | "official_alias" | "human_alias" | "relevant_partial" | "ambiguous";
export type CompetencySearchState = CompetencyMatchClass | "no_equivalent";

export interface CompetencyTaxonomyReference {
  source: string;
  sourceVersion: string;
  externalId: string;
  externalUri: string | null;
  mappingType: string;
  nativeType: ProfessionalConceptType | null;
  provenance: Record<string, unknown>;
}

export interface CompetencyTaxonomyCandidate {
  conceptId: string;
  canonicalLabel: string;
  conceptType: ProfessionalConceptType;
  scope: "global" | "organization";
  description: string;
  matchedTerm: string;
  matchClass: CompetencyMatchClass;
  aliasAuthority: "prisma_canonical" | "official_source" | "human_audited" | "published_knowledge";
  aliases: string[];
  references: CompetencyTaxonomyReference[];
  classificationState: "classified" | "pending";
  classification: CompetencyClassification | null;
}

export interface CompetencyTaxonomySearchResult {
  contractVersion: typeof COMPETENCY_TAXONOMY_SEARCH_CONTRACT;
  taxonomyVersion: typeof COMPETENCY_TAXONOMY_CONTRACT;
  query: string;
  state: CompetencySearchState;
  items: CompetencyTaxonomyCandidate[];
}

export function readCompetencyTaxonomySearch(value: unknown): CompetencyTaxonomySearchResult {
  if (!isRecord(value)
    || value.contractVersion !== COMPETENCY_TAXONOMY_SEARCH_CONTRACT
    || value.taxonomyVersion !== COMPETENCY_TAXONOMY_CONTRACT
    || typeof value.query !== "string"
    || !["exact", "official_alias", "human_alias", "relevant_partial", "ambiguous", "no_equivalent"].includes(String(value.state))
    || !Array.isArray(value.items)
    || !value.items.every(validCandidate)) {
    throw new Error("A busca da Taxonomia de Competências retornou contrato ou proveniência incompatível.");
  }
  return value as unknown as CompetencyTaxonomySearchResult;
}

function validCandidate(value: unknown): boolean {
  return isRecord(value)
    && typeof value.conceptId === "string" && typeof value.canonicalLabel === "string"
    && value.conceptType !== "occupation"
    && ["skill", "competency", "knowledge", "technology", "methodology", "certification"].includes(String(value.conceptType))
    && ["global", "organization"].includes(String(value.scope))
    && typeof value.description === "string" && typeof value.matchedTerm === "string"
    && ["exact", "official_alias", "human_alias", "relevant_partial", "ambiguous"].includes(String(value.matchClass))
    && ["prisma_canonical", "official_source", "human_audited", "published_knowledge"].includes(String(value.aliasAuthority))
    && Array.isArray(value.aliases) && value.aliases.every((item) => typeof item === "string")
    && ["classified", "pending"].includes(String(value.classificationState))
    && (value.classificationState === "pending" ? value.classification === null : validClassification(value.classification))
    && Array.isArray(value.references) && value.references.every((item) => isRecord(item)
      && typeof item.source === "string" && typeof item.sourceVersion === "string" && typeof item.externalId === "string"
      && (item.externalUri === null || typeof item.externalUri === "string") && typeof item.mappingType === "string"
      && (item.nativeType === null || typeof item.nativeType === "string") && isRecord(item.provenance));
}

export function validClassification(value: unknown): value is CompetencyClassification {
  return isRecord(value) && ["hard", "soft"].includes(String(value.macroGroupCode))
    && typeof value.macroGroupLabel === "string" && typeof value.subgroupId === "string"
    && typeof value.subgroupCode === "string" && typeof value.subgroupLabel === "string"
    && Number.isSafeInteger(value.classificationVersion) && Number(value.classificationVersion) > 0
    && value.taxonomyVersion === COMPETENCY_TAXONOMY_CONTRACT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
