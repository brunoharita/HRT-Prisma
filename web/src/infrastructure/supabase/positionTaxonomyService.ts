import { POSITION_TAXONOMY_CONTRACT, readPositionTaxonomy, type PositionTaxonomy, type ProfessionalConceptType, type TaxonomyCandidate, type TaxonomyDecision } from "../../domain/positionTaxonomy.js";
import type { VacancyDraft } from "../../domain/vacancy.js";
import type { Json } from "./database.types.js";
import { supabase } from "./client.js";

// New RPCs remain on the same Supabase boundary, with server-side membership checks.
export const positionTaxonomyService = {
  async history(organizationId: string, vacancyId: string, offset = 0): Promise<Array<{ version: number; snapshot: PositionTaxonomy | null }>> {
    const { data, error } = await supabase.from("vacancy_versions").select("*")
      .eq("organization_id", organizationId).eq("vacancy_id", vacancyId).order("version", { ascending: false }).range(offset, offset + 19);
    if (error) throw new Error("Não foi possível carregar o histórico de interpretações.");
    return (data ?? []).map((row) => ({ version: row.version,
      snapshot: readPositionTaxonomy((row as unknown as { taxonomy_snapshot?: unknown }).taxonomy_snapshot, organizationId) }));
  },
  async preview(organizationId: string, title: string, conceptId: string | null, decision: TaxonomyDecision, complementIds: string[], signal?: AbortSignal): Promise<PositionTaxonomy> {
    const request = supabase.rpc("preview_position_taxonomy" as never, { p_organization_id: organizationId, p_title: title,
      p_selected_concept_id: conceptId, p_decision: decision, p_complement_ids: complementIds } as never);
    const { data, error } = await request.abortSignal(signal ?? AbortSignal.timeout(20000));
    if (error) throw new Error("A taxonomia não respondeu. O preenchimento foi preservado; tente novamente.");
    const result = readPositionTaxonomy(data, organizationId);
    if (!result) throw new Error("A taxonomia não retornou uma interpretação válida.");
    return result;
  },
  async search(organizationId: string, query: string, kind: "occupation" | "complement", offset = 0, signal?: AbortSignal): Promise<{ items: TaxonomyCandidate[]; total: number }> {
    const { data, error } = await supabase.rpc("search_position_taxonomy" as never,
      { p_organization_id: organizationId, p_query: query, p_kind: kind, p_offset: offset } as never).abortSignal(signal ?? AbortSignal.timeout(20000));
    if (error) throw new Error("Não foi possível buscar na Knowledge publicada. Tente novamente.");
    const result = data as unknown as { items: TaxonomyCandidate[]; total: number };
    if (!result || !Array.isArray(result.items) || typeof result.total !== "number") throw new Error("Busca de Knowledge inválida.");
    return result;
  },
  async createComplement(organizationId: string, label: string, type: Exclude<ProfessionalConceptType, "occupation">, description: string): Promise<string> {
    const { data, error } = await supabase.rpc("create_position_knowledge_complement" as never,
      { p_organization_id: organizationId, p_label: label, p_concept_type: type, p_description: description } as never);
    if (error || typeof data !== "string") throw new Error("Não foi possível confirmar o complemento. A criação exige administrador da Knowledge da empresa.");
    return data;
  },
  async save(organizationId: string, draft: VacancyDraft): Promise<{ id: string; version: number }> {
    const { taxonomy: _preview, ...definition } = draft;
    const { data, error } = await supabase.rpc("save_position_taxonomy" as never, {
      p_organization_id: organizationId, p_draft: { ...definition, taxonomyContract: POSITION_TAXONOMY_CONTRACT } as unknown as Json,
      p_expected_version_id: draft.expectedVersionId ?? null,
    } as never);
    if (error) {
      if (error.code === "40001") throw new Error("Esta Posição foi atualizada por outro operador. Reabra a versão atual antes de salvar.");
      throw new Error("Não foi possível salvar a Posição com sua proveniência. Seu preenchimento foi preservado; tente novamente.");
    }
    const saved = (data as unknown as Array<{ vacancy_id: string; version: number }> | null)?.[0];
    if (!saved) throw new Error("O banco não confirmou o salvamento da Posição.");
    return { id: saved.vacancy_id, version: saved.version };
  },
};
