import type { PlatformAccessProfile } from "./platformUsers.js";

export interface ScopedKnowledgeProposalRow {
  scope: "global" | "organization";
  organizationId: string | null;
  status: string;
}

export function isKnowledgeProposalVisible(
  proposal: ScopedKnowledgeProposalRow,
  profile: PlatformAccessProfile,
  activeOrganizationId: string | null,
): boolean {
  if (proposal.scope === "global") return profile === "super_admin";
  return profile === "super_admin" && activeOrganizationId !== null
    && proposal.organizationId === activeOrganizationId
    && proposal.status === "awaiting_human_review";
}
