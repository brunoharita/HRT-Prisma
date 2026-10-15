import { supabase } from "./client";
import { supabaseOperationError } from "../../domain/reviewOperationErrors";
import type { DirectoryConcept } from "../../domain/peopleDirectory";

export interface ProfessionalArea {
  id: string; label: string; description: string; aliases: string[]; version: number;
  scope: "global" | "organization"; organizationId: string | null; active: boolean;
}
export interface AreaContribution {
  id: string; status: string; original_proposal: {
    proposed_concept: { canonical_label: string; description: string }; aliases: string[];
    origin: { concept_id: string; concept_version: number };
  };
}
async function rpc(name: string, args: object): Promise<unknown> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw supabaseOperationError(error, "Não foi possível concluir a operação de áreas profissionais.");
  return data;
}
export const professionalAreaService = {
  async load(organizationId: string | null, reviewId: string | null = null) {
    return await rpc("get_professional_areas", { p_organization_id: organizationId, p_review_id: reviewId }) as { options: ProfessionalArea[]; suggestion: DirectoryConcept[] };
  },
  async save(organizationId: string | null, area: { id?: string; label: string; description: string; aliases: string[]; active: boolean; version?: number }) {
    return await rpc("save_professional_area", { p_organization_id: organizationId, p_id: area.id ?? null, p_label: area.label,
      p_description: area.description, p_aliases: area.aliases, p_active: area.active, p_expected_version: area.version ?? null }) as string;
  },
  async contributions(): Promise<AreaContribution[]> {
    const { data, error } = await supabase.from("knowledge_proposals").select("id,status,original_proposal")
      .eq("prompt_version", "professional-area-1.0.0").eq("scope", "global").not("origin_organization_id", "is", null)
      .order("created_at", { ascending: false });
    if (error) throw supabaseOperationError(error, "Não foi possível consultar as contribuições de áreas.");
    return (data ?? []) as unknown as AreaContribution[];
  },
  async decide(proposalId: string, decision: "approved" | "rejected" | "deferred", targetId: string | null, label: string, description: string, aliases: string[], reason: string) {
    return rpc("review_professional_area_contribution", { p_proposal_id: proposalId, p_decision: decision, p_target_id: targetId,
      p_label: label, p_description: description, p_aliases: aliases, p_reason: reason });
  },
};
