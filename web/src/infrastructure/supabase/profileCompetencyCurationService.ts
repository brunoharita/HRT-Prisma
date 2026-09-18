import { knowledgeService } from "./knowledgeService";
import { supabase } from "./client";
import { readProfessionalEvidenceProjection } from "../../domain/personProfessionalEvidence";
import { CURATION_WORKFLOW_VERSION, type CompetencyCurationAdapter } from "../../domain/profileCompetencyCuration";
import type { MembershipRole } from "../../shared/access";

export function profileCompetencyCurationService(organizationId: string, personId: string, role: MembershipRole): CompetencyCurationAdapter | undefined {
  if (!["super_admin", "owner", "admin"].includes(role)) return undefined;
  return {
    canUseGlobal: role === "super_admin",
    async search(query) {
      const result = await knowledgeService.searchCompetencyTaxonomy(organizationId, query);
      return result.items.map((item) => ({
        id: item.conceptId, canonicalLabel: item.canonicalLabel, conceptType: item.conceptType, scope: item.scope,
        description: item.description, aliases: item.aliases, sourceName: item.references[0]?.source ?? null,
        sourceVersion: item.references[0]?.sourceVersion ?? null, externalId: item.references[0]?.externalId ?? null,
        externalUri: item.references[0]?.externalUri ?? null, method: item.matchClass, matchedTerm: item.matchedTerm,
        matchClass: item.matchClass, aliasAuthority: item.aliasAuthority, references: item.references,
      }));
    },
    async refresh() {
      const { data, error } = await supabase.rpc("load_person_professional_evidence_map_v4" as never, { p_organization_id: organizationId, p_person_id: personId } as never);
      if (error) throw new Error("Não foi possível atualizar a lista. Tente novamente.");
      return readProfessionalEvidenceProjection(data, organizationId, personId);
    },
    async save(decision) {
      const { data, error } = await supabase.rpc("curate_profile_competency_v2" as never, {
        p_organization_id: organizationId, p_person_id: personId, p_profile_id: decision.profileId,
        p_original_index: decision.item.originalIndex, p_source_text: decision.item.sourceText, p_normalized_term: decision.item.normalizedTerm,
        p_scope: decision.scope, p_action: decision.action, p_concept_id: decision.conceptId, p_reason: decision.reason,
        p_proposal_label: decision.proposalLabel, p_proposal_type: decision.proposalType,
      } as never);
      if (error) {
        if (error.code === "40001") throw new Error("Este item ou Perfil foi atualizado por outra operação. Cancele e atualize as pendências antes de tentar novamente.");
        if (error.code === "42501" || error.code === "28000") throw new Error("Você não possui permissão de curadoria para este alcance. A edição foi preservada.");
        if (error.code === "23505") throw new Error(error.message.includes("PROPOSAL_ALREADY_PENDING") ? "Já existe uma proposta pendente para este termo e alcance. Nenhuma proposta duplicada foi criada." : "Este termo já possui outra decisão humana. A decisão não foi substituída.");
        throw new Error("Não foi possível confirmar a gravação. A edição foi preservada; confira as pendências antes de tentar novamente.");
      }
      const result = data as unknown as { workflowVersion: string; projection: unknown; outcome: "alias" | "proposal" };
      if (!result || result.workflowVersion !== CURATION_WORKFLOW_VERSION || !["alias", "proposal"].includes(result.outcome)) throw new Error("Resposta de gravação não reconhecida. Atualize as pendências para conferir o resultado.");
      return { projection: readProfessionalEvidenceProjection(result.projection, organizationId, personId), outcome: result.outcome };
    },
  };
}
