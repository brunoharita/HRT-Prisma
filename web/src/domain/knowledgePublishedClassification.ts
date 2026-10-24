import type { KnowledgeProposalView } from "./knowledgeData.js";

type ClassificationRow = { concept_id: string; subgroup_id: string; version: number };
type Reader = (conceptIds: string[]) => Promise<ClassificationRow[]>;

/** Reads only visible published concepts. The original proposal remains historical evidence. */
export async function withPublishedClassifications(proposals: KnowledgeProposalView[], read: Reader): Promise<KnowledgeProposalView[]> {
  const eligible = (p: KnowledgeProposalView) => p.status === "approved" && p.proposedConcept.concept_type !== "occupation"
    && p.proposedConcept.concept_type !== "professional_area" && !p.originTermId && p.originWorkflow !== "occupational-rag-1.0.0";
  const ids = [...new Set(proposals.filter(eligible).flatMap(p => p.publishedConceptId ? [p.publishedConceptId] : []))];
  const states = new Map<string, NonNullable<KnowledgeProposalView["publishedClassification"]>>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    try {
      const rows = await read(batch);
      for (const id of batch) {
        const matches = rows.filter(row => row.concept_id === id);
        const row = matches[0];
        states.set(id, !matches.length ? { state: "missing" } : matches.length === 1 && row && row.subgroup_id && Number.isInteger(row.version) && row.version > 0
          ? { state: "published", subgroupId: row.subgroup_id, version: row.version } : { state: "unavailable" });
      }
    } catch {
      for (const id of batch) states.set(id, { state: "unavailable" });
    }
  }
  return proposals.map(p => eligible(p) ? { ...p, publishedClassification: states.get(p.publishedConceptId ?? "") ?? { state: "missing" } } : p);
}
