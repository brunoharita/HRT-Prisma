export const RESUME_SEMANTIC_QUALITY_VERSION = "resume-semantic-quality-1.0.0";

export type ResumeSemanticQualityReason =
  | "multipage_resume_without_professional_history"
  | "professional_content_without_professional_history";

export interface ResumeSemanticQualityInput {
  pageCount: number;
  experienceCount: number;
  hasProfessionalTitle: boolean;
  hasSummary: boolean;
  competencyCount: number;
  areaCount: number;
  keyResultCount: number;
}

export interface ResumeSemanticQualityDecision {
  version: typeof RESUME_SEMANTIC_QUALITY_VERSION;
  sufficient: boolean;
  reasons: ResumeSemanticQualityReason[];
}

/**
 * This gate does not judge the candidate or infer missing history. It only
 * detects contradictions between the apparent document scope and the output
 * produced by the deterministic structurer.
 */
export function assessResumeSemanticQuality(input: ResumeSemanticQualityInput): ResumeSemanticQualityDecision {
  const reasons: ResumeSemanticQualityReason[] = [];
  if (input.experienceCount === 0 && input.pageCount >= 3) {
    reasons.push("multipage_resume_without_professional_history");
  } else if (input.experienceCount === 0 && input.pageCount >= 2
    && (input.hasProfessionalTitle || input.hasSummary || input.competencyCount > 0 || input.areaCount > 0 || input.keyResultCount > 0)) {
    reasons.push("professional_content_without_professional_history");
  }
  return { version: RESUME_SEMANTIC_QUALITY_VERSION, sufficient: reasons.length === 0, reasons };
}
