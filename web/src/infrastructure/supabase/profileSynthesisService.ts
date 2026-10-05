import { readProfileSynthesisView, readSynthesisSource, type ProfileSynthesisView, type SynthesisSource } from "../../../../src/domain/profileSynthesis";
import { supabase } from "./client";

export interface ProfileSynthesisAdapter {
  load(): Promise<ProfileSynthesisView>;
  request(): Promise<ProfileSynthesisView>;
  source(analysisId: string, sourceId: string): Promise<SynthesisSource>;
}
export function profileSynthesisService(organizationId: string, personId: string, profileId: string): ProfileSynthesisAdapter {
  const args = { p_organization_id: organizationId, p_person_id: personId, p_profile_id: profileId };
  const read = async (name: string) => {
    const { data, error } = await supabase.rpc(name as never, args as never);
    if (error) throw Error("A síntese está indisponível. O Perfil publicado continua disponível.");
    const view = readProfileSynthesisView(data, organizationId, personId);
    if (view.profileId !== profileId) throw Error("SYNTHESIS_VERSION_INVALID");
    return view;
  };
  return { load: () => read("load_profile_synthesis"), request: () => read("request_profile_synthesis"), source: async (analysisId, sourceId) => {
    const { data, error } = await supabase.rpc("load_profile_synthesis_source" as never, {
      p_organization_id: organizationId, p_person_id: personId, p_analysis_id: analysisId, p_source_id: sourceId,
    } as never);
    if (error) throw Error("Não foi possível consultar esta fonte. Tente novamente.");
    return readSynthesisSource(data);
  } };
}
