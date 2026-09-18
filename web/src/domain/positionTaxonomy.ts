import { newVacancyRequirement, type VacancyDraft, type VacancyRequirementCategory, type VacancyRequirementDraft } from "./vacancy.js";

export const POSITION_TAXONOMY_CONTRACT = "position-taxonomy-1.0.0";
export type TaxonomyDecision = "automatic" | "human" | "cleared";
export type ProfessionalConceptType = "occupation" | "skill" | "knowledge" | "technology" | "methodology" | "certification";
export interface TaxonomyReference {
  mappingId: string; conceptId: string; sourceId: string; source: "CBO" | "ESCO" | "O*NET";
  snapshotId: string; sourceVersion: string; externalId: string; externalUri: string | null;
  label: string; mappingType: string; method: string; recordedAt: string;
  provenance: Record<string, unknown>; reconciliations: Record<string, unknown>[];
}
export interface TaxonomyOrigin {
  relationId?: string; relationVersion?: number; relationType?: string; reference?: TaxonomyReference;
  attributes?: Record<string, unknown>; provenance: Record<string, unknown>; recordedAt: string;
  method?: string; changeSetId?: string | null;
}
export interface TaxonomyItem {
  conceptId: string; label: string; conceptType: ProfessionalConceptType; scope: "global" | "organization";
  organizationId: string | null; conceptVersion: number; description?: string; origins: TaxonomyOrigin[];
}
export interface TaxonomyCandidate { id: string; label: string; description: string; scope: "global" | "organization"; conceptType?: ProfessionalConceptType }
export interface PositionTaxonomy {
  contractVersion: typeof POSITION_TAXONOMY_CONTRACT; organizationId: string; originalTitle: string; normalizedTerm: string;
  state: "resolved" | "ambiguous" | "unresolved"; method: string; decision: TaxonomyDecision;
  concept: { id: string; label: string; scope: "global" | "organization"; organizationId: string | null; version: number; description: string; provenance: Record<string, unknown> } | null;
  references: TaxonomyReference[]; items: TaxonomyItem[]; complements: TaxonomyItem[]; candidates: TaxonomyCandidate[];
  recordedAt: string; actorId: string | null; savedBy?: string; positionVersionId?: string; positionVersion?: number; previousVersionId?: string | null;
  matchedTerms?: Array<Record<string, unknown>>;
  decisionRecordedAt?: string;
}
export const taxonomyGroups: Record<ProfessionalConceptType, string> = {
  occupation: "Famílias e ocupações relacionadas", skill: "Habilidades", knowledge: "Conhecimentos",
  technology: "Tecnologias e ferramentas", methodology: "Métodos e práticas", certification: "Certificações",
};
export const taxonomyStateLabels: Record<PositionTaxonomy["state"], string> = {
  resolved: "Associação resolvida", ambiguous: "Requer seleção", unresolved: "Referência ainda não resolvida",
};
export const taxonomyMethodLabels: Record<string, string> = {
  approved_exact_alias: "Correspondência exata com termo ou alias aprovado; precedência da Knowledge da empresa sobre a Global.",
  human_selection: "Referência selecionada explicitamente por operador autorizado.",
  human_removal: "Associação desfeita explicitamente pelo operador.",
  no_safe_match: "Os termos aprovados não sustentam uma interpretação única. Nenhuma aproximação foi aplicada.",
};
export function groupTaxonomyItems(items: readonly TaxonomyItem[]): Array<{ type: ProfessionalConceptType; label: string; items: TaxonomyItem[] }> {
  return (Object.keys(taxonomyGroups) as ProfessionalConceptType[]).flatMap((type) => {
    const group = items.filter((item) => item.conceptType === type);
    return group.length ? [{ type, label: taxonomyGroups[type], items: group }] : [];
  });
}
export function taxonomyRequirementCategory(item: TaxonomyItem): VacancyRequirementCategory | null {
  if (item.conceptType === "occupation") return null;
  return ({ skill: "competency", knowledge: "knowledge", technology: "technology", methodology: "knowledge", certification: "certification" } as const)[item.conceptType];
}
export function selectTaxonomyRequirement(draft: VacancyDraft, item: TaxonomyItem, importance: "required" | "desired"): VacancyDraft {
  const category = taxonomyRequirementCategory(item);
  if (!category || !["required", "desired"].includes(importance)) throw new Error("Selecione um conhecimento e sua obrigatoriedade.");
  if (item.scope === "organization" && item.organizationId !== draft.taxonomy?.organizationId) throw new Error("Knowledge de outra empresa indisponível.");
  if (draft.requirements.some((requirement) => requirement.conceptId === item.conceptId)) return draft;
  const requirement: VacancyRequirementDraft = { ...newVacancyRequirement(item.label, category),
    conceptId: item.conceptId, conceptLabel: item.label, importance, importanceConfirmed: true,
    categoryConfirmed: true, origin: "human", taxonomyOrigin: item };
  return { ...draft, requirements: [...draft.requirements, requirement] };
}
export function applyTaxonomy(draft: VacancyDraft, taxonomy: PositionTaxonomy): VacancyDraft {
  if (taxonomy.originalTitle !== draft.title) return draft; // Never apply an out-of-order response.
  return { ...draft, referenceConceptId: taxonomy.concept?.id ?? null, taxonomy, taxonomyDecision: taxonomy.decision };
}
export function changeTaxonomyTitle(draft: VacancyDraft, title: string): VacancyDraft {
  const decision = draft.taxonomyDecision ?? (draft.referenceConceptId ? "human" : "automatic");
  return { ...draft, title, taxonomy: null, taxonomyDecision: decision,
    referenceConceptId: decision === "human" ? draft.referenceConceptId : null };
}
export function readPositionTaxonomy(value: unknown, organizationId: string): PositionTaxonomy | null {
  if (value === null || value === undefined) return null; // Historical, never reinterpreted as an empty snapshot.
  if (!isObject(value) || value.contractVersion !== POSITION_TAXONOMY_CONTRACT || value.organizationId !== organizationId
    || !["resolved", "ambiguous", "unresolved"].includes(String(value.state))
    || !["automatic", "human", "cleared"].includes(String(value.decision))
    || typeof value.originalTitle !== "string" || typeof value.method !== "string" || typeof value.recordedAt !== "string"
    || !Array.isArray(value.references) || !value.references.every(validReference)
    || !Array.isArray(value.items) || !value.items.every((item) => validItem(item, organizationId))
    || !Array.isArray(value.complements) || !value.complements.every((item) => validItem(item, organizationId) && item.scope === "organization")
    || !Array.isArray(value.candidates) || !value.candidates.every((item) => isObject(item) && typeof item.id === "string" && typeof item.label === "string")
    || (value.state === "resolved" ? !isObject(value.concept) || typeof value.concept.id !== "string" || typeof value.concept.label !== "string"
      || (value.concept.scope === "organization" && value.concept.organizationId !== organizationId) : value.concept !== null)) {
    throw new Error("A interpretação da Posição possui contrato desconhecido ou inválido. Atualize a página ou revise a associação.");
  }
  return value as unknown as PositionTaxonomy;
}
function validReference(value: unknown): value is TaxonomyReference {
  return isObject(value) && ["CBO", "ESCO", "O*NET"].includes(String(value.source))
    && ["mappingId", "conceptId", "snapshotId", "sourceVersion", "externalId", "label", "method"].every((key) => typeof value[key] === "string");
}
function validItem(value: unknown, organizationId: string): value is TaxonomyItem {
  return isObject(value) && typeof value.conceptId === "string" && typeof value.label === "string"
    && Object.hasOwn(taxonomyGroups, String(value.conceptType)) && ["global", "organization"].includes(String(value.scope))
    && (value.scope === "global" ? value.organizationId === null : value.organizationId === organizationId)
    && Array.isArray(value.origins) && value.origins.length > 0
    && value.origins.every((origin) => isObject(origin) && typeof origin.recordedAt === "string" && isObject(origin.provenance)
      && (origin.reference === undefined ? origin.method === "organization_knowledge" && value.scope === "organization" : validReference(origin.reference)));
}
export function readTaxonomyItem(value: unknown, organizationId: string): TaxonomyItem | null {
  if (value === null || value === undefined) return null;
  if (!validItem(value, organizationId)) throw new Error("A origem do requisito possui contrato inválido.");
  return value;
}
function isObject(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
