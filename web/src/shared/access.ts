import {
  PLATFORM_ACCESS_PROFILES,
  type PlatformAccessProfile,
} from "./platformUsers.js";

export const MEMBERSHIP_ROLES = PLATFORM_ACCESS_PROFILES;

export type MembershipRole = PlatformAccessProfile;

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  groupId: string | null;
  groupName: string | null;
  role: MembershipRole;
}

export interface AuthorizationSnapshot {
  isAuthenticated: boolean;
  memberships: readonly OrganizationMembership[];
  activeOrganizationId: string | null;
}

export interface RouteRule {
  requiresAuth?: boolean;
  requiresMembership?: boolean;
  allowedRoles?: readonly MembershipRole[];
}

export interface AccessOutcome {
  allowed: boolean;
  redirectTo: string | null;
  activeMembership: OrganizationMembership | null;
  reason: "allowed" | "sign_in_required" | "membership_required" | "role_required";
}

export function isMembershipRole(value: string): value is MembershipRole {
  return MEMBERSHIP_ROLES.some((role: MembershipRole) => role === value);
}

export function normalizeMembershipRole(value: string): MembershipRole | null {
  return isMembershipRole(value) ? value : null;
}

export function resolveActiveMembership(
  memberships: readonly OrganizationMembership[],
  activeOrganizationId: string | null,
): OrganizationMembership | null {
  if (activeOrganizationId) {
    const activeMembership = memberships.find((membership) => membership.organizationId === activeOrganizationId);
    if (activeMembership) return activeMembership;
  }

  return memberships[0] ?? null;
}

export function resolvePreferredOrganizationId(
  memberships: readonly OrganizationMembership[],
  storedOrganizationId: string | null,
): string | null {
  if (storedOrganizationId && memberships.some((membership) => membership.organizationId === storedOrganizationId)) {
    return storedOrganizationId;
  }
  return memberships[0]?.organizationId ?? null;
}

export function canActivateOrganization(
  memberships: readonly OrganizationMembership[],
  organizationId: string,
): boolean {
  return memberships.some((membership) => membership.organizationId === organizationId);
}

export function evaluateRouteAccess(
  snapshot: AuthorizationSnapshot,
  rule: RouteRule,
): AccessOutcome {
  const requiresAuth = rule.requiresAuth ?? true;
  const requiresMembership = rule.requiresMembership ?? requiresAuth;

  if (!requiresAuth) {
    return { allowed: true, redirectTo: null, activeMembership: null, reason: "allowed" };
  }

  if (!snapshot.isAuthenticated) {
    return { allowed: false, redirectTo: "/sign-in", activeMembership: null, reason: "sign_in_required" };
  }

  const activeMembership = resolveActiveMembership(snapshot.memberships, snapshot.activeOrganizationId);

  if (requiresMembership && !activeMembership) {
    return {
      allowed: false,
      redirectTo: "/access-denied",
      activeMembership: null,
      reason: "membership_required",
    };
  }

  if (rule.allowedRoles && rule.allowedRoles.length > 0) {
    if (!activeMembership || !rule.allowedRoles.includes(activeMembership.role)) {
      return {
        allowed: false,
        redirectTo: "/unauthorized",
        activeMembership,
        reason: "role_required",
      };
    }
  }

  return { allowed: true, redirectTo: null, activeMembership, reason: "allowed" };
}
