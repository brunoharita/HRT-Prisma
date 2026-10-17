import { supabase } from "./client";
import { ORGANIZATION_ADMIN_CONTRACT, organizationPlans, type OrganizationAdminWorkspace, type ManagedCompanyUser } from "../../domain/organizationAdministration";
export type OrganizationAdminAction = "workspace" | "create_group" | "configure_group" | "create_company" | "configure_company" | "list_links" | "save_link";
export const organizationAdministrationService = {
  async run(action: OrganizationAdminAction, groupId: string | null = null, organizationId: string | null = null, input: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc("organization_administration" as never, { p_action: action, p_group_id: groupId, p_organization_id: organizationId, p_data: input, p_contract: ORGANIZATION_ADMIN_CONTRACT } as never);
    if (error) throw Error(error.code === "23514" ? "Plano ou capacidade incompatível. Confira os limites informados." : error.code === "23505" ? "Já existe um cadastro incompatível com esta alteração. Atualize a consulta." : error.message);
    const result = data as unknown as Record<string, unknown>;
    if (result?.contract !== ORGANIZATION_ADMIN_CONTRACT) throw Error("Administração incompatível. Atualize a página.");
    return result;
  },
  async workspace(): Promise<OrganizationAdminWorkspace> {
    const data = await this.run("workspace");
    if (!Array.isArray(data.groups) || typeof data.isSuper !== "boolean" || data.groups.some(g => !g.id || !organizationPlans.includes(g.plan) || !Number.isSafeInteger(g.companyCount) || !Array.isArray(g.companies) || !Number.isSafeInteger(g.revision) || g.companies.some((c: { groupId: string }) => c.groupId !== g.id))) throw Error("Dados de empresas incompatíveis. Atualize a consulta.");
    return data as unknown as OrganizationAdminWorkspace;
  },
  async links(groupId: string, organizationId: string, revision: number): Promise<ManagedCompanyUser[]> {
    const data = await this.run("list_links", groupId, organizationId, { revision });
    if (data.organizationId !== organizationId || !Array.isArray(data.users)) throw Error("Vínculos incompatíveis com a empresa selecionada.");
    return data.users as ManagedCompanyUser[];
  },
};
