import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isKnowledgeProposalVisible } from "../web/src/shared/knowledgeProposalVisibility.js";

const globalProposal = { scope: "global", organizationId: null, status: "awaiting_human_review" } as const;
const activeOrganizationProposal = { scope: "organization", organizationId: "org-a", status: "awaiting_human_review" } as const;
const otherOrganizationProposal = { scope: "organization", organizationId: "org-b", status: "awaiting_human_review" } as const;

test("Super Admin vê a fila global e somente a proposta legada pendente da empresa ativa", () => {
  assert.equal(isKnowledgeProposalVisible(globalProposal, "super_admin", "org-a"), true);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "super_admin", "org-a"), true);
  assert.equal(isKnowledgeProposalVisible(otherOrganizationProposal, "super_admin", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "super_admin", null), false);
  assert.equal(isKnowledgeProposalVisible({ ...activeOrganizationProposal, status: "approved" }, "super_admin", "org-a"), false);
});

test("administradores da empresa não veem a fila de propostas", () => {
  assert.equal(isKnowledgeProposalVisible(globalProposal, "admin", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "owner", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(otherOrganizationProposal, "owner", "org-a"), false);
  assert.equal(isKnowledgeProposalVisible(activeOrganizationProposal, "admin", null), false);
});

test("card de proposta informa o alcance que está sendo revisado", async () => {
  const page = await readFile("web/src/pages/KnowledgePage.tsx", "utf8");
  assert.match(page, /Global Prisma/);
  assert.match(page, /Salvar na Knowledge da empresa/);
  assert.match(page, /proposal\.scope === "global"/);
  assert.match(page, /Proposta legada · Empresa ativa/);
  assert.match(page, /Aprovar na empresa e enviar à revisão Global/);
});
