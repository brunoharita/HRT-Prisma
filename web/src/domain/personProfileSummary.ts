import { groupPendingCompetencies, pendingCompetencies } from "./profileCompetencyCuration.js";
import { groupProfessionalEvidence, type ProfessionalEvidenceProjection } from "./personProfessionalEvidence.js";

/** Read-only facts for the operational summary. A missing projection is not zero. */
export function personProfileSummary(projection: ProfessionalEvidenceProjection | null) {
  if (!projection) return null;
  const groups = groupProfessionalEvidence(projection);
  const pendingItems = pendingCompetencies(projection);
  const pendingTerms = groupPendingCompetencies(pendingItems);
  const pendingCount = projection.normalization.status === "complete" || projection.normalization.items.length
    ? pendingItems.length : null;
  const seenEvidence = new Set<string>();
  const recentEvidence = [...projection.associations]
    .sort((left, right) => right.evidence.recordedAt.localeCompare(left.evidence.recordedAt) || left.id.localeCompare(right.id))
    .filter((item) => {
      if (seenEvidence.has(item.evidence.id)) return false;
      seenEvidence.add(item.evidence.id);
      return true;
    })
    .slice(0, 3);
  return {
    groups,
    pendingCount,
    pendingPreview: pendingTerms.slice(0, 5), // Source declaration order, never a priority ranking.
    conceptCount: groups.reduce((total, group) => total + group.concepts.length, 0),
    evidenceCount: new Set(projection.associations.map((item) => item.evidence.id)).size,
    recentEvidence,
  };
}
