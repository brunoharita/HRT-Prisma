import type {
  CredentialDeliveryMode,
  PlatformAccessProfile,
  PlatformUserStatus,
} from "../shared/platformUsers";

export interface PlatformOperator {
  id: string;
  authUserId: string;
  fullName: string;
  username: string;
  email: string;
  status: PlatformUserStatus;
  profile: PlatformAccessProfile;
  groupId: string | null;
  groupName: string | null;
  mustChangePassword: boolean;
}

export interface OrganizationScopeOption {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
}

export interface GroupScopeOption {
  id: string;
  name: string;
  organizations: OrganizationScopeOption[];
}

export interface PlatformUserListItem {
  id: string;
  authUserId: string;
  fullName: string;
  username: string;
  email: string;
  phoneCountryIso2: string | null;
  phoneCountryLabel: string | null;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  status: PlatformUserStatus;
  profile: PlatformAccessProfile;
  groupId: string | null;
  groupName: string | null;
  allowedOrganizations: OrganizationScopeOption[];
}

export interface PlatformUserQuery {
  search: string;
  status: PlatformUserStatus | "all";
  profile: PlatformAccessProfile | "all";
  groupId: string | "all";
  organizationId: string | "all";
}

export interface PlatformUserUpsertInput {
  fullName: string;
  username: string;
  email: string;
  status: "active" | "inactive";
  profile: PlatformAccessProfile;
  groupId: string | null;
  organizationIds: string[];
  phoneCountryIso2: string;
  phoneNationalNumber: string;
  credentialMode: CredentialDeliveryMode;
  password?: string | undefined;
  passwordConfirmation?: string | undefined;
}

export interface PlatformUserBootstrapData {
  currentOperator: PlatformOperator;
  groups: GroupScopeOption[];
  users: PlatformUserListItem[];
}
