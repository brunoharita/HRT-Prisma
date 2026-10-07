import type { PublishedProfileCandidate } from "./profileDiscovery.js";
import type { VacancyCandidateMatch, VacancyDetail } from "./vacancy.js";

/** Join live identity with an intact server snapshot; never rebuild its score. */
export function restoreStableMatch(vacancy: VacancyDetail, candidate: PublishedProfileCandidate, value: unknown): VacancyCandidateMatch {
  const state = value as Record<string, unknown> | null;
  const match = state?.match as VacancyCandidateMatch | undefined;
  if (!state || !["current", "updating", "update_failed"].includes(String(state.state)) || !match || !match.score
    || typeof state.evaluationId !== "string" || !/^[0-9a-f-]{36}$/i.test(state.evaluationId)
    || !Array.isArray(match.requirements) || !["main_area", "related_area", "contextual_signals"].includes(match.discoveryGroup)
    || (state.state === "current" && (match.score.profileVersion !== candidate.profileId || match.score.positionVersion !== vacancy.versionId))) {
    throw new Error("O resultado persistido está indisponível. Nenhum score substituto foi calculado. Tente novamente pela ação de recálculo.");
  }
  return { ...match, candidate, stableResult: { evaluationId: state.evaluationId, state: state.state as "current" | "updating" | "update_failed",
    calculatedAt: typeof state.calculatedAt === "string" ? state.calculatedAt : null,
    ...(state.audit ? { audit: state.audit as NonNullable<NonNullable<VacancyCandidateMatch["stableResult"]>["audit"]> } : {}) } };
}
