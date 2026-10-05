import { readProfileSynthesisView, readSynthesisSource, SynthesisFailure, synthesisDiagnostic, type ProfileSynthesisView, type SynthesisSource } from "../../../../src/domain/profileSynthesis";
import { supabase } from "./client";
import { supabaseOperationError } from "../../domain/reviewOperationErrors";

function readFailure(code: string, source = false): SynthesisFailure {
  // Reuse auth classification, never pass the RPC's free-text payload into operator feedback.
  const classified = supabaseOperationError({ code, message: "" }, "Consulta indisponível.");
  return new SynthesisFailure(synthesisDiagnostic(source ? "source" : "read", classified.category === "authentication" ? "SESSION_EXPIRED" : classified.category === "authorization" ? "ACCESS_DENIED" : source ? "SOURCE_UNAVAILABLE" : "READ_UNAVAILABLE"));
}

export interface ProfileSynthesisAdapter {
  load(): Promise<ProfileSynthesisView>;
  request(): Promise<ProfileSynthesisView>;
  source(analysisId: string, sourceId: string): Promise<SynthesisSource>;
  retry?(): Promise<ProfileSynthesisView>;
}
export function profileSynthesisService(organizationId: string, personId: string, profileId: string): ProfileSynthesisAdapter {
  const args = { p_organization_id: organizationId, p_person_id: personId, p_profile_id: profileId };
  const read = async (name: string) => {
    const { data, error } = await supabase.rpc(name as never, args as never).abortSignal(AbortSignal.timeout(20000));
    if (error) throw readFailure(error.code);
    try {
      const view = readProfileSynthesisView(data, organizationId, personId);
      if (view.profileId !== profileId) throw Error("SYNTHESIS_VERSION_INVALID");
      return view;
    } catch { throw new SynthesisFailure(synthesisDiagnostic("read", "READ_INVALID")); }
  };
  return { load: () => read("load_profile_synthesis"), request: () => read("request_profile_synthesis"), retry: () => read("retry_profile_synthesis"), source: async (analysisId, sourceId) => {
    const { data, error } = await supabase.rpc("load_profile_synthesis_source" as never, {
      p_organization_id: organizationId, p_person_id: personId, p_analysis_id: analysisId, p_source_id: sourceId,
    } as never).abortSignal(AbortSignal.timeout(20000));
    if (error) throw readFailure(error.code, true);
    try { return readSynthesisSource(data); } catch { throw new SynthesisFailure(synthesisDiagnostic("source", "SOURCE_UNAVAILABLE")); }
  } };
}
