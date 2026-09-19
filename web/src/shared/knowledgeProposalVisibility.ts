import type { PlatformAccessProfile } from "./platformUsers.js";

export interface ScopedKnowledgeProposalRow {
  scope: "global" | "organization";
  organizationId: string | null;
}

export function isKnowledgeProposalVisible(
  proposal: ScopedKnowledgeProposalRow,
  profile: PlatformAccessProfile,
  activeOrganizationId: string | null,
): boolean {
  if (proposal.scope === "global") return profile === "super_admin";
  return activeOrganizationId !== null && proposal.organizationId === activeOrganizationId;
}
