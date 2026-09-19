import assert from "node:assert/strict";
import test from "node:test";
import { isKnowledgeProposalVisible } from "../web/src/shared/knowledgeProposalVisibility.js";

const globalProposal = { scope: "global", organizationId: null } as const;
const activeOrganizationProposal = { scope: "organization", organizationId: "org-a" } as const;
const otherOrganizationProposal = { scope: "organization", organizationId: "org-b" } as const;

test("Super Admin vê propostas globais e da empresa ativa, sem vazar outra empresa", () => {
  assert.equal(isKnowledgeProposalVisible(globalProposal, "super_admin", "org-a"), true);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "super_admin", "org-a"), true);
  assert.equal(isKnowledgeProposalVisible(otherOrganizationProposal, "super_admin", "org-a"), false);
});

test("administradores da empresa não veem propostas globais nem de outra empresa", () => {
  assert.equal(isKnowledgeProposalVisible(globalProposal, "admin", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "owner", "org-a"), true);
  assert.equal(isKnowledgeProposalVisible(otherOrganizationProposal, "owner", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "admin", null), false);
});
