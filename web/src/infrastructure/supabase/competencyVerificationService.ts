import type {
  IssuedInvitation,
  ParticipantResultVisibility,
  ParticipantVerificationWorkspace,
  PrepareAssessmentResult,
  VerificationOperatorWorkspace,
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

  async loadOperatorWorkspace(organizationId: string): Promise<VerificationOperatorWorkspace> {
    const { data, error } = await supabase.rpc("load_m51b_operator_workspace" as never, { p_organization_id: organizationId } as never);
    if (error) throw new Error(error.message || "Não foi possível carregar as verificações.");
    const payload: Record<string, unknown> = isRecord(data) ? data : {};
    return { preparedAssessments: asArray(payload.preparedAssessments), verifications: asArray(payload.verifications) } as VerificationOperatorWorkspace;
  },

  async issueInvitation(input: {
    preparedAssessmentId: string;
    deliveryChannel: "link" | "email" | "whatsapp";
    validDays: number;
    resultVisibility: ParticipantResultVisibility;
    message: string;
  }): Promise<IssuedInvitation> {
    const { data, error } = await supabase.functions.invoke("assessment-access", {
      body: {
        action: "issue",
        schemaVersion: "m51b-assessment-access-request-1.0.0",
        payload: { ...input, idempotencyKey: crypto.randomUUID() },
      },
    });
    if (error) throw new Error(error.message || "Não foi possível emitir o convite.");
    if (!isRecord(data) || typeof data.token !== "string" || typeof data.relativePath !== "string") throw new Error("Resposta inválida na emissão do convite.");
    return data as unknown as IssuedInvitation;
  },

  async manageInvitation(invitationId: string, action: "cancel" | "revoke"): Promise<void> {
    const { error } = await supabase.functions.invoke("assessment-access", {
      body: { action, schemaVersion: "m51b-assessment-access-request-1.0.0", payload: { invitationId } },
    });
    if (error) throw new Error(error.message || "Não foi possível atualizar o convite.");
  },

  async participantAction<T = ParticipantVerificationWorkspace>(token: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke("assessment-access", {
      body: { action, token, schemaVersion: "m51b-assessment-access-request-1.0.0", payload },
    });
    if (error) throw new Error(error.message || "Não foi possível acessar a verificação.");
    if (!isRecord(data)) throw new Error("Resposta inválida da verificação.");
    return data as unknown as T;
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
