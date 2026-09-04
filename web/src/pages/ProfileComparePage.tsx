import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Skeleton, Typography } from "antd";
import { CanonicalProfileView } from "../components/profile/CanonicalProfileView";
import { buildPrismaProfileView, type PrismaProfileView } from "../domain/canonicalProfile";
import type { PublishedProfileCandidate } from "../domain/profileDiscovery";
import { profileDiscoveryService } from "../infrastructure/supabase/profileDiscoveryService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileComparePageProps { activeMembership: OrganizationMembership; personIds: [string, string]; onNavigate: (path: string) => void; }

export function ProfileComparePage({ activeMembership, personIds, onNavigate }: ProfileComparePageProps) {
  const [candidates, setCandidates] = useState<PublishedProfileCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true; setLoading(true); setError(null);
    void profileDiscoveryService.loadByIds(activeMembership.organizationId, personIds, activeMembership.role !== "member")
      .then((result) => { if (current) setCandidates(result); })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível comparar estes Perfis."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, activeMembership.role, personIds[0], personIds[1]]);
  const profiles = useMemo(() => candidates.map(toView), [candidates]);

  return <PrismaPage className="prisma-profile-compare-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles/search")} type="text">Voltar aos resultados</Button>
    <PrismaPageHeader title="Comparar perfis" description="Compare a mesma estrutura profissional lado a lado, sem notas, ranking ou decisão automática." actions={<Button icon={<CloseOutlined />} onClick={() => onNavigate("/profiles/search")}>Limpar comparação</Button>} />
    {error ? <Alert showIcon title={error} type="error" /> : null}
    {loading ? <div className="prisma-profile-compare-grid"><PrismaCard><Skeleton active paragraph={{ rows: 14 }} /></PrismaCard><PrismaCard><Skeleton active paragraph={{ rows: 14 }} /></PrismaCard></div> : null}
    {!loading && profiles.length !== 2 ? <PrismaCard><Empty description="Selecione exatamente dois Perfis publicados para comparar." /></PrismaCard> : null}
    {profiles.length === 2 ? <>
      <div className="prisma-profile-compare-note"><SwapOutlined /><span>Os blocos seguem a ordem do Padrão Prisma. Uma seção ausente significa apenas que não há informação publicada nela.</span></div>
      <div className="prisma-profile-compare-grid">{profiles.map((profile, index) => <PrismaCard className="prisma-profile-comparison-column" key={profile.version?.profileId ?? profile.identity.fullName}>
        <CanonicalProfileView compact profile={profile} />
        <ComparisonHighlights profile={profile} />
        <Button block onClick={() => onNavigate(`/profiles/${candidates[index]!.personId}/profile`)} type="primary">Ver perfil completo</Button>
      </PrismaCard>)}</div>
    </> : null}
  </PrismaPage>;
}

function toView(candidate: PublishedProfileCandidate): PrismaProfileView {
  return buildPrismaProfileView({
    fullName: candidate.fullName,
    profile: candidate.profileData,
    location: candidate.location,
    lifecycleLabel: lifecycleLabel(candidate.lifecycle),
    operationalStatusLabel: candidate.operationalStatus === "active" ? "Ativo" : "Arquivado",
    knowledge: candidate.knowledge,
    version: { profileId: candidate.profileId, number: candidate.profileVersion, publishedAt: candidate.publishedAt, current: true },
  });
}

function ComparisonHighlights({ profile }: { profile: PrismaProfileView }) {
  const highlights = [
    profile.experiences.length ? `${profile.experiences.length} ${profile.experiences.length === 1 ? "experiência publicada" : "experiências publicadas"}` : null,
    profile.education.length ? `${profile.education.length} ${profile.education.length === 1 ? "formação publicada" : "formações publicadas"}` : null,
    profile.credentials?.languages[0] ? `${profile.credentials.languages[0].language}${profile.credentials.languages[0].level ? ` · ${profile.credentials.languages[0].level}` : ""}` : null,
    profile.credentials?.certifications[0] ?? null,
  ].filter((item): item is string => Boolean(item));
  if (!highlights.length) return null;
  return <section className="prisma-comparison-highlights"><Typography.Title level={3}>Destaques objetivos</Typography.Title><ul>{highlights.map((item) => <li key={item}><CheckOutlined /> {item}</li>)}</ul></section>;
}

function lifecycleLabel(value: string): string {
  return ({ candidate: "Candidato", employee: "Colaborador", former_employee: "Ex-colaborador", former_candidate: "Ex-candidato", talent_pool: "Banco de talentos" } as Record<string, string>)[value] ?? "Pessoa";
}
