import type { ItemBankGovernanceWorkspace } from "../../domain/assessmentItemGovernanceData";
import { supabase } from "./client";

export const assessmentItemGovernanceService = {
  async loadWorkspace(organizationId: string): Promise<ItemBankGovernanceWorkspace> {
    const { data, error } = await supabase.rpc("load_m51c_item_bank_workspace" as never, { p_organization_id: organizationId } as never);
    if (error) throw new Error(error.message || "Não foi possível carregar o Banco de Itens.");
    if (!isRecord(data)) throw new Error("Resposta inválida do Banco de Itens.");
    const payload: Record<string, unknown> = data;
    return {
      versions: isRecord(payload.versions) ? payload.versions as unknown as ItemBankGovernanceWorkspace["versions"] : { gapAnalysis: "unknown", analytics: "unknown", calibration: "unknown", budget: "unknown", proposal: "unknown" },
      gaps: asArray(payload.gaps), items: asArray(payload.items), requests: asArray(payload.requests), proposals: asArray(payload.proposals),
      policy: isRecord(payload.policy) ? payload.policy as unknown as ItemBankGovernanceWorkspace["policy"] : {
        generationEnabled: false, provider: null, model: null, monthlyLimitCents: null, maximumItemsPerRequest: 0,
        maximumRequestsPerDay: 0, maximumCostPerRequestCents: null, cooldownSeconds: 0, budgetAlertPercent: 80,
        requireHumanReview: true, allowPii: false, allowWebSearch: false, version: "unknown", spentCents: 0,
      },
    };
  },

  async createFakeGeneration(input: { organizationId: string; blueprintId: string; dimension: string; quantity: number; targetScope: "global" | "organization" }) {
    const { data, error } = await supabase.rpc("create_m51c_fake_generation_request" as never, {
      p_organization_id: input.organizationId, p_blueprint_id: input.blueprintId, p_dimension: input.dimension,
      p_quantity: input.quantity, p_target_scope: input.targetScope, p_idempotency_key: crypto.randomUUID(),
    } as never);
    if (error) throw new Error(error.message || "Não foi possível executar a geração sintética.");
    return isRecord(data) ? data : {};
  },

  async requestExternalGeneration(input: { organizationId: string; generationNeedId: string; quantity: number; targetScope: "global" | "organization" }) {
    const { data, error } = await supabase.functions.invoke("assessment-item-generator", {
      body: { schemaVersion: "m51c-assessment-item-generation-request-1.0.0", ...input, idempotencyKey: crypto.randomUUID() },
    });
    if (error) throw new Error(error.message || "Não foi possível solicitar a geração externa.");
    return isRecord(data) ? data : {};
  },

  async reviewProposal(proposalId: string, decision: "approve" | "reject" | "request_changes", rationale: string) {
    const { error } = await supabase.rpc("review_m51c_item_proposal" as never, {
      p_proposal_id: proposalId, p_decision: decision, p_rationale: rationale,
    } as never);
    if (error) throw new Error(error.message || "Não foi possível registrar a revisão.");
  },

  async publishApproved(organizationId: string, proposalIds: string[]) {
    const { data, error } = await supabase.rpc("publish_m51c_approved_proposals" as never, {
      p_organization_id: organizationId, p_proposal_ids: proposalIds,
    } as never);
    if (error) throw new Error(error.message || "Não foi possível publicar os itens aprovados.");
    return isRecord(data) ? data : {};
  },

  async refreshSyntheticAnalytics(organizationId: string, assessmentItemId: string) {
    const { data, error } = await supabase.rpc("refresh_m51c_synthetic_item_analytics" as never, {
      p_organization_id: organizationId, p_assessment_item_id: assessmentItemId,
    } as never);
    if (error) throw new Error(error.message || "Não foi possível atualizar a prévia analítica.");
    return isRecord(data) ? data : {};
  },
};

function asArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
