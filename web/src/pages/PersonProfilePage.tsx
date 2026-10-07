import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import type { ReactNode } from "react";
import { PersonWorkspacePage, type PersonWorkspaceParts } from "./PersonWorkspacePage";
import { confirmPrismaNavigation, useViewState } from "../ui/PrismaNavigation";
import { PERSON_SURFACES, type Surface } from "../components/profile/PersonProfessionalEvidenceMap";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Empty, Skeleton } from "antd";
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
import { profileSynthesisService } from "../infrastructure/supabase/profileSynthesisService";
import type { SynthesisSource } from "../../../src/domain/profileSynthesis";

interface PersonProfilePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function PersonProfilePage({ activeMembership, personId, repository, onNavigate }: PersonProfilePageProps) {
  const [surface, setSurface] = useViewState<Surface>("personSurface", "summary", `/profiles/${personId}`);
  const changeSurface = (next: Surface) => { void confirmPrismaNavigation().then(ok => { if (ok) setSurface(next); }); };
  const [view, setView] = useState<PersonProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [noticeRetry, setNoticeRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useLoadingFeedback({ "Carregando Perfil…": loading });

  useEffect(() => {
    let current = true;
    setView(null); setError(null); setLoading(true);
    void repository.loadPersonProfile(activeMembership.organizationId, personId, activeMembership.role)
      .then((result) => { if (current) setView(result); })
      .catch(() => { if (current) setError("O Perfil não pôde ser consultado. Verifique seu acesso e tente novamente."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, activeMembership.role, personId, repository, noticeRetry]);

  const canonical = useMemo(() => view?.profile ? buildPrismaProfileView({
    fullName: view.person.fullName,
    profile: view.profile,
    location: view.privateContact?.location ?? null,
    lifecycleLabel: describeLifecycle(view.person.lifecycle),
    operationalStatusLabel: ({active:"Ativa",archived:"Arquivada",merged:"Mesclada",deleting:"Exclusão em andamento"} as Record<string,string>)[view.operationalStatus ?? ""] ?? null,
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
  const synthesis = useMemo(() => view?.profile ? profileSynthesisService(activeMembership.organizationId, personId, view.profile.id) : undefined, [activeMembership.organizationId, personId, view?.profile?.id]);
  function openSynthesisSource(source: SynthesisSource) {
    if (source.documentId && source.reviewId) {
      window.sessionStorage.setItem(`prisma.review-evidence.${source.reviewId}`, JSON.stringify({ fieldPath: source.fieldPath, pageNumber: source.pageNumber }));
      onNavigate(`/profiles/${personId}/documents/${source.documentId}/verification/${source.reviewId}`);
    } else if (source.documentId) onNavigate(`/profiles/${personId}/documents/${source.documentId}`);
    else if (source.nature === "verified_assessment") onNavigate("/verifications");
  }

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

  const renderPage = (operations?: PersonWorkspaceParts): ReactNode => (
    <PrismaPage className="prisma-profile-page">
      {operations?.header ?? <><Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>{canonical ? <><CanonicalProfileHeader profile={canonical} />{canonical.version ? <p className="prisma-person-profile-version">Perfil v{canonical.version.number} · Publicado em {new Date(canonical.version.publishedAt).toLocaleDateString("pt-BR")}</p> : null}</> : view ? <h1>{view.person.fullName}</h1> : null}</>}
      {operations?.notices}
      {loading ? <ProfileSkeleton /> : null}
      {error ? <Alert message={error} showIcon type="error" action={<Button onClick={() => setNoticeRetry((value) => value + 1)}>Atualizar consulta</Button>} /> : null}
      {!loading && !error && !view ? <PrismaCard><Empty description="Pessoa inexistente ou indisponível para esta empresa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
      {view && !canonical ? <><nav aria-label="Áreas do Perfil profissional" className="prisma-m72-tabs">{PERSON_SURFACES.map(([key,label]) => <button key={key} aria-current={surface === key ? "page" : undefined} onClick={() => changeSurface(key)} type="button">{label}</button>)}</nav><PrismaCard><Empty description="Ainda não existe Perfil publicado para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />{operations && surface === "summary" ? <Button onClick={() => changeSurface("documents")}>Consultar documentos e continuar revisão</Button> : null}</PrismaCard>{operations ? <div className="prisma-person-no-profile">{surface === "summary" && operations.pending ? <section className="prisma-person-rail-pending"><h3>Ações pendentes</h3>{operations.pending}</section> : null}{surface === "documents" ? operations.documents : surface === "history" ? operations.history : null}</div> : null}</> : null}
      {canonical ? <PersonProfessionalEvidenceMap key={`${activeMembership.organizationId}:${personId}`} activeSurface={surface} onSurfaceChange={changeSurface} workspace={operations} synthesis={synthesis} onOpenSynthesisSource={openSynthesisSource} curation={curation} onOpenSource={openEvidenceSource} onOpenVersions={canReview ? () => onNavigate(`/profiles/${personId}/versions`) : undefined} profile={canonical} projection={view?.professionalEvidence ?? null} projectionError={view?.professionalEvidenceError ?? null} /> : null}
      {surface === "profile" && canReview && view?.privateContact ? <PrismaCard title="Contato autorizado"><Descriptions column={1}><Descriptions.Item label="E-mail">{view.privateContact.email ?? "Não informado"}</Descriptions.Item><Descriptions.Item label="Telefone">{view.privateContact.phone ?? "Não informado"}</Descriptions.Item><Descriptions.Item label="Localização">{view.privateContact.location ?? "Não informada"}</Descriptions.Item></Descriptions></PrismaCard> : null}
    </PrismaPage>
  );
  return canReview ? <PersonWorkspacePage activeMembership={activeMembership} personId={personId} onNavigate={onNavigate} renderWorkspace={renderPage} onOpenDocuments={() => changeSurface("documents")} /> : renderPage();
}

function ProfileSkeleton() {
  return <div className="prisma-profile-skeleton"><PrismaCard><Skeleton active avatar paragraph={{ rows: 3 }} /></PrismaCard><PrismaCard><Skeleton active paragraph={{ rows: 8 }} /></PrismaCard></div>;
}
