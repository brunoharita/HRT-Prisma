import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  canActivateOrganization,
  evaluateRouteAccess,
  resolveActiveMembership,
  resolvePreferredOrganizationId,
  type OrganizationMembership,
} from "../web/src/shared/access.js";

const adminMembership: OrganizationMembership = {
  organizationId: "org-1",
  organizationName: "Org 1",
  groupId: "group-1",
  groupName: "Group 1",
  role: "admin",
};

const recruiterMembership: OrganizationMembership = {
  organizationId: "org-2",
  organizationName: "Org 2",
  groupId: "group-1",
  groupName: "Group 1",
  role: "recruiter",
};

test("redirects unauthenticated users to sign-in", () => {
  const outcome = evaluateRouteAccess(
    { isAuthenticated: false, memberships: [], activeOrganizationId: null },
    { requiresAuth: true, requiresMembership: true },
  );

  assert.equal(outcome.allowed, false);
  assert.equal(outcome.redirectTo, "/sign-in");
  assert.equal(outcome.reason, "sign_in_required");
});

test("redirects authenticated users without membership to access-denied", () => {
  const outcome = evaluateRouteAccess(
    { isAuthenticated: true, memberships: [], activeOrganizationId: null },
    { requiresAuth: true, requiresMembership: true },
  );

  assert.equal(outcome.allowed, false);
  assert.equal(outcome.redirectTo, "/access-denied");
  assert.equal(outcome.reason, "membership_required");
});

test("redirects authenticated users without the required role to unauthorized", () => {
  const outcome = evaluateRouteAccess(
    { isAuthenticated: true, memberships: [recruiterMembership], activeOrganizationId: recruiterMembership.organizationId },
    { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin"] },
  );

  assert.equal(outcome.allowed, false);
  assert.equal(outcome.redirectTo, "/unauthorized");
  assert.equal(outcome.reason, "role_required");
});

test("allows authenticated users with the required role", () => {
  const outcome = evaluateRouteAccess(
    { isAuthenticated: true, memberships: [adminMembership], activeOrganizationId: adminMembership.organizationId },
    { requiresAuth: true, requiresMembership: true, allowedRoles: ["admin"] },
  );

  assert.equal(outcome.allowed, true);
  assert.equal(outcome.redirectTo, null);
  assert.equal(outcome.reason, "allowed");
  assert.equal(outcome.activeMembership?.role, "admin");
});

test("resolves the active membership from the current organization", () => {
  const activeMembership = resolveActiveMembership(
    [adminMembership, recruiterMembership],
    recruiterMembership.organizationId,
  );

  assert.equal(activeMembership?.organizationId, recruiterMembership.organizationId);
});

test("rejects a persisted organization outside current memberships", () => {
  assert.equal(resolvePreferredOrganizationId([adminMembership], "org-not-allowed"), adminMembership.organizationId);
  assert.equal(canActivateOrganization([adminMembership], "org-not-allowed"), false);
});

test("keeps an allowed persisted organization and supports an explicit tenant change", () => {
  const memberships = [adminMembership, recruiterMembership];
  assert.equal(resolvePreferredOrganizationId(memberships, recruiterMembership.organizationId), recruiterMembership.organizationId);
  assert.equal(canActivateOrganization(memberships, adminMembership.organizationId), true);
});

test("keeps Supabase domain queries behind one repository boundary", async () => {
  const application = await readFile(resolve("web/src/app/PrismaApplication.tsx"), "utf8");
  const repository = await readFile(resolve("web/src/infrastructure/supabase/prismaRepository.ts"), "utf8");

  assert.equal(application.includes('.from("'), false);
  assert.equal(repository.includes('.eq("organization_id", organizationId)'), true);
  assert.equal(repository.includes('role === "super_admin" || role === "owner" || role === "admin" || role === "recruiter"'), true);
});
