import type {PlatformAccessProfile} from "../shared/platformUsers";
import type {OrganizationMembership} from "../shared/access";
import {KnowledgePage} from "./KnowledgePage";
// Preserve the former URL while keeping a single owner for this consultative capability.
export function SettingsPage({profile,activeMembership}:{profile:PlatformAccessProfile;activeMembership:OrganizationMembership|null}){
 return <KnowledgePage profile={profile} activeMembership={activeMembership} initialTab="structure"/>;
}
