import { matchVacancyCandidate } from "./_generated/web/src/domain/vacancy.js";
import { applySemanticAssessment } from "./_generated/web/src/domain/semanticMatching.js";
import { decodeProfileDataForPresentation } from "./_generated/web/src/infrastructure/supabase/personIngestionService.js";
import type { SemanticAssessment } from "../../../src/domain/semanticTrajectory.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SNAPSHOT_SOURCE_INVALID");
  return value as Record<string, unknown>;
}

/** Database-to-engine adapter only. All score and evidence rules live in generated source modules. */
export function buildSnapshotEvaluation(sources: Record<string, unknown>, assessment: SemanticAssessment): Record<string, unknown> | null {
  if (assessment.status !== "complete") return null;
  const vacancy = record(sources.vacancy), rawCandidate = record(sources.candidate);
  if (vacancy.organizationId !== assessment.organizationId || vacancy.versionId !== assessment.positionVersionId
    || rawCandidate.profileId !== assessment.profileId || !Array.isArray(vacancy.requirements)
    || !Array.isArray(rawCandidate.knowledge) || !Array.isArray(sources.demonstratedEvidence)) throw new Error("SNAPSHOT_SOURCE_INVALID");
  const candidate = { ...rawCandidate, profileData: decodeProfileDataForPresentation(rawCandidate.profileData) };
  const base = matchVacancyCandidate(vacancy, candidate, sources.occupationReference as never, sources.demonstratedEvidence as never);
  const match = applySemanticAssessment(vacancy, { ...base, positionDecision: sources.positionDecision ?? null }, assessment);
  if (match.semanticAssessment?.status !== "complete" || match.score.status === "unavailable" || match.score.score == null) return null;
  return {
    vacancyVersion: vacancy.version,
    requirements: match.requirements.map((item: { requirement: { stableId: string; label: string }; status: string; explanation: string; evidence: unknown }) => ({
      stableId: item.requirement.stableId, label: item.requirement.label, status: item.status, explanation: item.explanation, evidence: item.evidence,
    })),
    areaRelation: match.areaRelation, positionRelation: match.positionRelation, positionDecision: match.positionDecision,
    trajectoryAssessment: match.trajectoryAssessment, discoveryGroup: match.discoveryGroup, functionAssessment: match.functionAssessment,
    semanticInterpretation: { analysisId: assessment.analysisId, inputHash: assessment.inputHash, methodVersion: assessment.methodVersion,
      promptVersion: assessment.promptVersion, modelVersion: assessment.modelVersion, status: assessment.status },
    score: match.score, detailedStatus: match.detailedStatus, evidenceAssessment: match.evidenceAssessment,
    sufficiency: match.detailedStatus !== "ready" ? "pending_classification" : match.missingRequiredCount ? "insufficient_evidence" : "sufficient_evidence",
  };
}
