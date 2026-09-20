import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, EditOutlined, HistoryOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Skeleton, Space } from "antd";
import { CanonicalProfileHeader } from "../components/profile/CanonicalProfileView";
import { PersonProfessionalEvidenceMap } from "../components/profile/PersonProfessionalEvidenceMap";
import { buildPrismaProfileView } from "../domain/canonicalProfile";
import type { ProfessionalEvidenceAssociation } from "../domain/personProfessionalEvidence";
import type { PersonProfileView, PrismaDataRepository } from "../domain/prismaData";
import { describeLifecycle } from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage } from "../ui/PrismaPage";
import { profileCompetencyCurationService } from "../infrastructure/supabase/profileCompetencyCurationService";

interface PersonProfilePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function PersonProfilePage({ activeMembership, personId, repository, onNavigate }: PersonProfilePageProps) {
  const [view, setView] = useState<PersonProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setView(null); setError(null); setLoading(true);
    void repository.loadPersonProfile(activeMembership.organizationId, personId, activeMembership.role)
      .then((result) => { if (current) setView(result); })
      .catch(() => { if (current) setError("O Perfil não pôde ser consultado. Verifique seu acesso e tente novamente."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, activeMembership.role, personId, repository]);

  const canonical = useMemo(() => view?.profile ? buildPrismaProfileView({
    fullName: view.person.fullName,
    profile: view.profile,
    location: view.privateContact?.location ?? null,
    lifecycleLabel: describeLifecycle(view.person.lifecycle),
    operationalStatusLabel: "Ativo",
    knowledge: view.normalizedKnowledge.map((item) => ({ originalTerm: item.originalTerm, canonicalLabel: item.canonicalLabel, state: item.state })),
    version: {
      profileId: view.profile.id,
      number: view.profile.profileVersion,
      publishedAt: view.profile.approvedAt ?? view.profile.createdAt,
      current: view.profile.current,
    },
  }) : null, [view]);
  const canReview = activeMembership.role !== "member";
  const curation = useMemo(() => profileCompetencyCurationService(activeMembership.organizationId, personId, activeMembership.role), [activeMembership.organizationId, personId, activeMembership.role]);

  function openEvidenceSource(evidence: ProfessionalEvidenceAssociation) {
    const source = evidence.evidence.source;
    if (source.documentId && source.reviewId) {
      window.sessionStorage.setItem(`prisma.review-evidence.${source.reviewId}`, JSON.stringify({
        fieldPath: source.fieldPath,
        pageNumber: source.pageNumber,
        regionId: source.spatialRegionId,
        linkId: source.evidenceLinkId,
      }));
      onNavigate(`/profiles/${personId}/documents/${source.documentId}/verification/${source.reviewId}`);
      return;
    }
    if (source.documentId) {
      onNavigate(`/profiles/${personId}/documents/${source.documentId}`);
      return;
    }
    if (evidence.nature === "verified_assessment" || evidence.nature === "assessment_result") onNavigate("/verifications");
  }

  return (
    <PrismaPage className="prisma-profile-page">
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(canReview ? `/profiles/${personId}` : "/profiles")} type="text">{canReview ? "Voltar para a Central da Pessoa" : "Voltar para Pessoas"}</Button>
      {loading ? <ProfileSkeleton /> : null}
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {!loading && !error && !view ? <PrismaCard><Empty description="Pessoa inexistente ou indisponível para esta empresa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
      {view && !canonical ? <PrismaCard><Empty description="Ainda não existe um Perfil publicado para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
      {canonical ? <CanonicalProfileHeader actions={canReview ? <Space wrap><Button icon={<HistoryOutlined />} onClick={() => onNavigate(`/profiles/${personId}/versions`)}>Versões do perfil</Button><Button icon={<EditOutlined />} onClick={() => onNavigate(`/profiles/${personId}/versions`)} type="primary">Criar nova revisão</Button></Space> : undefined} profile={canonical} /> : null}
      {canonical ? <PersonProfessionalEvidenceMap key={`${activeMembership.organizationId}:${personId}`} curation={curation} onOpenSource={openEvidenceSource} onOpenVersions={canReview ? () => onNavigate(`/profiles/${personId}/versions`) : undefined} profile={canonical} projection={view?.professionalEvidence ?? null} projectionError={view?.professionalEvidenceError ?? null} /> : null}
    </PrismaPage>
  );
}

function ProfileSkeleton() {
  return <div className="prisma-profile-skeleton"><PrismaCard><Skeleton active avatar paragraph={{ rows: 3 }} /></PrismaCard><PrismaCard><Skeleton active paragraph={{ rows: 8 }} /></PrismaCard></div>;
}
