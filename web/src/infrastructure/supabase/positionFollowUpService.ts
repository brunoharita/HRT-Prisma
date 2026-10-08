import { supabase } from "./client";
import type { Json } from "./database.types";
import type { FollowUpData } from "../../domain/positionFollowUp";

function decode(value: Json): FollowUpData {
  const data = value as unknown as FollowUpData;
  if (data?.contract !== "position-follow-up-1.0.0" || !Array.isArray(data.entries) || !Array.isArray(data.history) || !Array.isArray(data.operators)) {
    throw new Error("O acompanhamento retornou um contrato incompatível. Atualize a página.");
  }
  return data;
}
function failure(error: { code?: string; message: string }): Error {
  return new Error(error.code === "40001" ? "Outra pessoa alterou este acompanhamento. Atualize os dados antes de tentar novamente; seu rascunho foi preservado."
    : error.code === "42501" ? "Você não tem acesso a este acompanhamento."
      : "Não foi possível salvar ou consultar o acompanhamento. Confira os campos e tente novamente. O último estado confirmado foi preservado.");
}
export const positionFollowUpService = {
  async load(organizationId: string, vacancyId: string): Promise<FollowUpData> {
    const { data, error } = await supabase.rpc("get_position_follow_up", { p_organization_id: organizationId, p_vacancy_id: vacancyId });
    if (error) throw failure(error); return decode(data);
  },
  async mutate(organizationId: string, vacancyId: string, action: string, personId: string | null, revision: number | null, payload: object = {}): Promise<FollowUpData> {
    const { data, error } = await supabase.rpc("mutate_position_follow_up", { p_organization_id: organizationId, p_vacancy_id: vacancyId, p_action: action,
      p_person_id: personId, p_expected_revision: revision, p_payload: payload as Json });
    if (error) throw failure(error); return decode(data);
  },
  async forPerson(organizationId: string, personId: string) {
    const { data, error } = await supabase.rpc("get_position_follow_up", { p_organization_id: organizationId, p_person_id: personId });
    if (error) throw failure(error);
    const result = data as unknown as { contract: string; links: { vacancyId: string; title: string; stage: keyof typeof import("../../domain/positionFollowUp").followUpStages; processName: string; processStatus: string }[] };
    if (result?.contract !== "position-follow-up-1.0.0" || !Array.isArray(result.links)) throw new Error("Acompanhamento incompatível.");
    return result.links;
  },
};
