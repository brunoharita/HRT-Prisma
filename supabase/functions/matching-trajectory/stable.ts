import { buildDeterministicMatch } from "./snapshot.ts";
import { applySemanticAssessment, isSemanticTriageEligible } from "./_generated/web/src/domain/semanticMatching.js";
import type { Dependencies, RpcClient } from "./handler.ts";

const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

/** Stable reads never invoke the scoring engine/provider when dependencies match. */
export async function stableMatching(body: Record<string, unknown>, bearer: string,
  actor: { id: string; client: RpcClient }, deps: Dependencies,
  interpret: (request: Request) => Promise<Response>): Promise<Response> {
  const args = { p_actor_id: actor.id, p_organization_id: body.organizationId, p_profile_id: body.profileId, p_position_version_id: body.positionVersionId };
  // Authenticated source read precedes privileged RPC. Never accept a browser score.
  const authorized = await actor.client.rpc("load_matching_trajectory_sources", {
    p_organization_id: body.organizationId, p_profile_id: body.profileId, p_position_version_id: body.positionVersionId,
  });
  if (authorized.error || !authorized.data) return response({ status: "unavailable", reasonCode: "NOT_AUTHORIZED" }, 403);
  const service = deps.service();
  const claim = await service.rpc("claim_stable_matching_score", { ...args, p_recalculate: body.operation === "recalculate" });
  if (claim.error || !claim.data) return response({ status: "unavailable", reasonCode: claim.error?.code === "42501" ? "NOT_AUTHORIZED" : "STABLE_SCORE_UNAVAILABLE" }, claim.error?.code === "42501" ? 403 : 503);
  const state = obj(claim.data);
  if (state.acquired !== true) return response(state);
  const sources = obj(state.sources), lease = state.lease, dependencies = sources.stableDependencies;
  const finish = async (match: unknown) => service.rpc("complete_stable_matching_score", { ...args, p_lease: lease,
    p_dependencies: dependencies, p_match: match, p_reason: state.reason, p_changed_dependencies: state.changedDependencies });
  try {
    // Date belongs to this calculation. The browser's access date is irrelevant on reads.
    const calculationTime = new Date();
    const referenceDate = calculationTime.toISOString().slice(0, 10);
    const validEvidence = Array.isArray(sources.demonstratedEvidence) ? sources.demonstratedEvidence.filter(item => {
      const until = obj(item).validUntil;
      return until == null || (typeof until === "string" && Date.parse(until) > calculationTime.getTime());
    }) : [];
    let match = buildDeterministicMatch({ ...sources, demonstratedEvidence: validEvidence }, body as never, referenceDate);
    if (isSemanticTriageEligible(match)) {
      const result = await interpret(new Request("https://internal.invalid/matching-trajectory", { method: "POST",
        headers: { Authorization: bearer, "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: body.organizationId, profileId: body.profileId, positionVersionId: body.positionVersionId, referenceDate }) }));
      const assessment = await result.json();
      if (!result.ok || assessment.status === "processing" || (state.match && assessment.status === "unavailable")) throw new Error("UPDATE_NOT_READY");
      match = applySemanticAssessment(obj(sources.vacancy), match, assessment);
    }
    const { candidate: _candidate, ...projection } = match;
    const persisted: Record<string, unknown> = projection;
    if (persisted.semanticAssessment) {
      const { context: _context, reading: _reading, ...metadata } = obj(persisted.semanticAssessment);
      persisted.semanticAssessment = metadata;
    }
    const completed = await finish(persisted);
    if (completed.error || !completed.data) throw new Error("COMMIT_UNAVAILABLE");
    return response(completed.data);
  } catch {
    // Release only our lease; failed/stale work cannot replace the previous result.
    await finish(null);
    return response({ state: "update_failed", evaluationId: state.evaluationId, match: state.match,
      calculatedAt: state.calculatedAt, audit: state.audit });
  }
}
