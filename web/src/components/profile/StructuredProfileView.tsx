import { CanonicalProfileView } from "./CanonicalProfileView";
import { buildPrismaProfileView } from "../../domain/canonicalProfile";
import type { StructuredDraft } from "../../domain/personIngestion";

export function StructuredProfileView({ profile, compact = false }: { profile: StructuredDraft; compact?: boolean }) {
  const view = buildPrismaProfileView({
    fullName: profile.identity.fullName || "Perfil profissional",
    profile,
  });
  return <CanonicalProfileView compact={compact} profile={view} showHeader={false} />;
}
