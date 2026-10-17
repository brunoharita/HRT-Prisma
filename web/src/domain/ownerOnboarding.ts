export const OWNER_ONBOARDING_CONTRACT = "owner-onboarding-1.0.0";
export interface OwnerOnboardingContext {
  contract: typeof OWNER_ONBOARDING_CONTRACT;
  username: string;
  profile: "owner";
  group: { id: string; name: string };
  company: { id: string; name: string };
}
export function decodeOwnerOnboarding(value: unknown, groupId: string): OwnerOnboardingContext {
  const v = value as Partial<OwnerOnboardingContext> | null;
  if (!v || v.contract !== OWNER_ONBOARDING_CONTRACT || v.profile !== "owner" || v.group?.id !== groupId
    || !v.group.name || !v.company?.id || !v.company.name || typeof v.username !== "string" || !v.username.endsWith(".owner")) {
    throw Error("O contexto do Owner não pôde ser confirmado. Volte a Grupos e empresas.");
  }
  return v as OwnerOnboardingContext;
}
export function ownerOnboardingPath(groupId: string): string {
  return `/organizations/${encodeURIComponent(groupId)}/owner/new`;
}
