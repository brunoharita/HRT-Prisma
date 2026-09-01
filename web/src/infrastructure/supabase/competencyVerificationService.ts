import type {
  PrepareAssessmentResult,
  VerificationWorkspaceView,
} from "../../domain/competencyVerificationData";
import { supabase } from "./client";

export const competencyVerificationService = {
  async loadWorkspace(organizationId: string): Promise<VerificationWorkspaceView> {
    const { data, error } = await supabase.rpc(
      "load_m51a_verification_workspace" as never,
      { p_organization_id: organizationId } as never,
    );
    if (error) throw new Error(error.message || "Não foi possível carregar o workspace de verificação.");
    return decodeWorkspace(data);
  },

  async prepareAssessment(input: {
    needId: string;
    definitionId: string;
    blueprintId: string;
    status: "draft" | "prepared";
  }): Promise<PrepareAssessmentResult> {
    const { data, error } = await supabase.rpc(
      "prepare_m51a_assessment" as never,
      {
        p_need_id: input.needId,
        p_definition_id: input.definitionId,
        p_blueprint_id: input.blueprintId,
        p_status: input.status,
        p_idempotency_key: crypto.randomUUID(),
      } as never,
    );
    if (error) throw new Error(error.message || "Não foi possível preparar a verificação.");
    return decodePrepareResult(data);
  },
};

function decodeWorkspace(value: unknown): VerificationWorkspaceView {
  const payload = isRecord(value) ? value : {};
  return {
    needs: asArray(payload.needs),
    definitions: asArray(payload.definitions),
    blueprints: asArray(payload.blueprints),
    rubrics: asArray(payload.rubrics),
    itemBankSummary: asArray(payload.itemBankSummary),
    preparedAssessments: asArray(payload.preparedAssessments),
  } as VerificationWorkspaceView;
}

function decodePrepareResult(value: unknown): PrepareAssessmentResult {
  if (!isRecord(value)) throw new Error("Resposta inválida da preparação de verificação.");
  return {
    preparedAssessmentId: String(value.preparedAssessmentId),
    needId: String(value.needId),
    status: value.status === "prepared" ? "prepared" : "draft",
    itemCount: Number(value.itemCount ?? 0),
  };
}

function asArray(value: unknown): never[] {
  return Array.isArray(value) ? value as never[] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
