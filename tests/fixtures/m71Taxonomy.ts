import { POSITION_TAXONOMY_CONTRACT, type PositionTaxonomy, type TaxonomyItem, type TaxonomyReference } from "../../web/src/domain/positionTaxonomy.js";
export const m71Reference: TaxonomyReference = {
  mappingId: "mapping-fixture", conceptId: "occupation-fixture", sourceId: "onet-fixture", source: "O*NET",
  snapshotId: "snapshot-fixture", sourceVersion: "31.0", externalId: "O*NET:occupation:15-1252.00", externalUri: null,
  label: "Software Developers", mappingType: "exact", method: "published_mapping", recordedAt: "2026-09-18T00:00:00Z",
  provenance: { fixture: true, sourceFile: "Occupation Data.txt", sourceRow: 124 }, reconciliations: [],
};
export const m71Item: TaxonomyItem = {
  conceptId: "knowledge-fixture", label: "Conhecimento sintético para validação", conceptType: "knowledge",
  scope: "global", organizationId: null, conceptVersion: 1,
  origins: [{ relationId: "relation-fixture", relationVersion: 1, relationType: "requires", reference: m71Reference,
    attributes: { measurements: [{ scaleId: "IM", rawValue: 4.5 }], fixture: true },
    provenance: { fixture: true }, recordedAt: "2026-09-18T00:00:00Z" }],
};
export const m71Complement: TaxonomyItem = { ...m71Item, conceptId: "complement-fixture", label: "Prática da empresa (sintética)",
  scope: "organization", organizationId: "org-fixture", origins: [{ method: "organization_knowledge", provenance: { fixture: true }, recordedAt: "2026-09-18T00:00:00Z" }] };
export function m71Fixture(overrides: Partial<PositionTaxonomy> = {}): PositionTaxonomy {
  return { contractVersion: POSITION_TAXONOMY_CONTRACT, organizationId: "org-fixture", originalTitle: "Desenvolvedor de software",
    normalizedTerm: "desenvolvedor de software", state: "resolved", method: "approved_exact_alias", decision: "automatic",
    concept: { id: "occupation-fixture", label: "Software Developers", scope: "global", organizationId: null, version: 1, description: "", provenance: { fixture: true } },
    references: [m71Reference], items: [m71Item], complements: [], candidates: [], recordedAt: "2026-09-18T00:00:00Z", actorId: null, ...overrides };
}
