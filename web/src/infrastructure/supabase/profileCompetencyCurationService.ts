import { knowledgeService } from "./knowledgeService";
import { supabase } from "./client";
import { readProfessionalEvidenceProjection } from "../../domain/personProfessionalEvidence";
import { CURATION_WORKFLOW_VERSION, type CompetencyCurationAdapter } from "../../domain/profileCompetencyCuration";
import type { MembershipRole } from "../../shared/access";

export function profileCompetencyCurationService(organizationId: string, personId: string, role: MembershipRole): CompetencyCurationAdapter | undefined {
  if (!["super_admin", "owner", "admin"].includes(role)) return undefined;
  return {
    canUseGlobal: role === "super_admin",
    async loadSubgroups() {
      return knowledgeService.listCompetencySubgroups(organizationId);
    },
    async search(query) {
      const result = await knowledgeService.searchCompetencyTaxonomy(organizationId, query);
      return result.items.map((item) => ({
        id: item.conceptId, canonicalLabel: item.canonicalLabel, conceptType: item.conceptType, scope: item.scope,
        description: item.description, aliases: item.aliases, sourceName: item.references[0]?.source ?? null,
        sourceVersion: item.references[0]?.sourceVersion ?? null, externalId: item.references[0]?.externalId ?? null,
        externalUri: item.references[0]?.externalUri ?? null, method: item.matchClass, matchedTerm: item.matchedTerm,
        matchClass: item.matchClass, aliasAuthority: item.aliasAuthority, references: item.references,
        classificationState: item.classificationState, classification: item.classification,
      }));
    },
    async suggestDescription(label) {
      return knowledgeService.suggestConceptDescription(organizationId, label);
    },
    async refresh() {
      const { data, error } = await supabase.rpc("load_person_professional_evidence_map_v6" as never, { p_organization_id: organizationId, p_person_id: personId } as never);
      if (error) throw new Error("Não foi possível atualizar a lista. Tente novamente.");
      return readProfessionalEvidenceProjection(data, organizationId, personId);
    },
    async loadEvidenceSources(profileId) {
      const { data, error } = await supabase.from("professional_profiles").select("profile_data")
        .eq("id", profileId).eq("organization_id", organizationId).eq("person_id", personId)
        .eq("review_status", "approved").is("superseded_at", null).single();
      if (error || !data) throw new Error("Não foi possível consultar as fontes do Perfil publicado.");
      const profile = (data as { profile_data: unknown }).profile_data;
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new Error("As fontes do Perfil estão indisponíveis.");
      const record = profile as Record<string, unknown>;
      const experiences = Array.isArray(record.experiences) ? record.experiences : [];
      const certifications = Array.isArray(record.certifications) ? record.certifications : [];
      return [
        ...experiences.flatMap((value, index) => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return [];
          const source = value as Record<string, unknown>;
          const description = typeof source.description === "string" ? source.description.trim() : "";
          if (description.length < 15) return [];
          const label = [source.role, source.organization].filter((item): item is string => typeof item === "string" && Boolean(item.trim())).join(" · ");
          return [{ nature: "contextual" as const, index, label: `Experiência ${index + 1}: ${label || "sem título"}`, quote: description }];
        }),
        ...certifications.flatMap((value, index) => typeof value === "string" && value.trim().length >= 5
          ? [{ nature: "certified" as const, index, label: `Credencial ${index + 1}: ${value}`, quote: value.trim() }] : []),
      ];
    },
    async linkEvidence(input) {
      const { error } = await supabase.rpc("link_person_competency_evidence" as never, {
        p_organization_id: organizationId, p_person_id: personId, p_profile_id: input.profileId,
        p_concept_id: input.conceptId, p_nature: input.nature, p_source_index: input.sourceIndex,
        p_source_quote: input.sourceQuote, p_credential_name: input.credentialName,
        p_credential_issuer: input.credentialIssuer, p_reason: input.reason,
      } as never);
      if (error) {
        if (["42501", "28000"].includes(error.code)) throw new Error("Sem permissão para associar esta fonte ou conceito.");
        if (error.code === "40001") throw new Error("O Perfil publicado mudou. Atualize antes de associar a evidência.");
        if (error.code === "23505") throw new Error("Esta fonte já foi vinculada ao conceito com outra decisão. O vínculo anterior foi preservado.");
        throw new Error("A fonte não comprova este vínculo ou os dados estão incompletos. Confira a seleção e tente novamente.");
      }
      const { data, error: refreshError } = await supabase.rpc("load_person_professional_evidence_map_v6" as never, {
        p_organization_id: organizationId, p_person_id: personId,
      } as never);
      if (refreshError) throw new Error("O vínculo foi gravado, mas a visão não pôde ser atualizada. Reabra o Perfil.");
      return readProfessionalEvidenceProjection(data, organizationId, personId);
    },
    async save(decision) {
      const { data, error } = await supabase.rpc("curate_profile_competency_v5" as never, {
        p_organization_id: organizationId, p_person_id: personId, p_profile_id: decision.profileId,
        p_original_index: decision.item.originalIndex, p_source_text: decision.item.sourceText, p_normalized_term: decision.item.normalizedTerm,
        p_scope: decision.scope, p_action: decision.action, p_concept_id: decision.conceptId,
        p_proposal_label: decision.proposalLabel, p_proposal_description: decision.proposalDescription, p_subgroup_id: decision.subgroupId,
      } as never);
      if (error) {
        const proposalAlreadyPending = error.code === "23505" && error.message.includes("PROPOSAL_ALREADY_PENDING");
        if (error.code === "40001") throw new Error("Este item ou Perfil foi atualizado por outra operação. Cancele e atualize as pendências antes de tentar novamente.");
        if (error.code === "42501" || error.code === "28000") throw new Error("Você não possui permissão de curadoria para este alcance. A edição foi preservada.");
        if (error.code === "23505") throw new Error(proposalAlreadyPending ? "Já existe uma proposta pendente para este termo e alcance. Nenhuma proposta duplicada foi criada." : "Este termo já possui outra decisão humana. A decisão não foi substituída.");
        throw new Error("Não foi possível confirmar a gravação. A edição foi preservada; confira as pendências antes de tentar novamente.");
      }
      const result = data as unknown as { workflowVersion: string; projection: unknown; outcome: "alias" | "proposal" };
      if (!result || result.workflowVersion !== CURATION_WORKFLOW_VERSION || !["alias", "proposal"].includes(result.outcome)) throw new Error("Resposta de gravação não reconhecida. Atualize as pendências para conferir o resultado.");
      const { data: projection, error: refreshError } = await supabase.rpc("load_person_professional_evidence_map_v6" as never, {
        p_organization_id: organizationId, p_person_id: personId,
      } as never);
      if (refreshError) throw new Error("A decisão foi gravada, mas a nova visão não pôde ser carregada. Atualize o Perfil.");
      return { projection: readProfessionalEvidenceProjection(projection, organizationId, personId), outcome: result.outcome };
    },
  };
}
