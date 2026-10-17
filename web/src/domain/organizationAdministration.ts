export const ORGANIZATION_ADMIN_CONTRACT = "organization-administration-1.0.0";
export const organizationPlans = ["essential", "essential_plus", "professional", "enterprise"] as const;
export type OrganizationPlan = typeof organizationPlans[number];
export const planLabels: Record<OrganizationPlan, string> = { essential: "Essential", essential_plus: "Essential Plus", professional: "Professional", enterprise: "Enterprise" };
export type CompanyStatus = "draft" | "active" | "inactive";
export const companyStatusLabels: Record<CompanyStatus, string> = { draft: "Em preparação", active: "Ativa", inactive: "Inativa" };
export interface ManagedCompany { id: string; name: string; status: CompanyStatus; groupId: string; users: number }
export interface ManagedGroup {
  id: string; name: string; status: CompanyStatus; plan: OrganizationPlan; companyLimit: number; activeCount: number; companyCount: number;
  primaryOrganizationId: string | null; revision: number; termsStatus: "provisional";
  owner: { name: string; status: string } | null; companies: ManagedCompany[];
}
export interface OrganizationAdminWorkspace { contract: string; isSuper: boolean; groups: ManagedGroup[] }
export interface ManagedCompanyUser { id: string; name: string; profile: "recruiter" | "member"; linked: boolean; isDefault: boolean; canEdit: boolean }
export function planCompanyLimitValid(plan: OrganizationPlan, limit: number): boolean {
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= 100000 && (plan === "enterprise" || (plan === "professional" ? limit <= 5 : limit === 1));
}
