import type {PlatformAccessProfile,PlatformUserStatus} from "../shared/platformUsers.js";
export const SELF_ACCOUNT_CONTRACT="operator-self-account-1.0.0";
export interface SelfAccount {
 contract:typeof SELF_ACCOUNT_CONTRACT;revision:string;fullName:string;username:string;email:string;
 phoneCountryIso2:string|null;phoneNationalNumber:string|null;profile:PlatformAccessProfile;status:PlatformUserStatus;
 groupName:string|null;companies:string[];
 pendingEmail:{id:string;email:string;expiresAt:string;createdAt:string;sendState:"preparing"|"accepted"|"failed"|"unknown"}|null;
}
export interface SelfAccountInput {revision:string;fullName:string;username:string;phoneCountryIso2:string;phoneNationalNumber:string;}
