import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, EditOutlined, FileSearchOutlined, HistoryOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Skeleton, Space, Tag, Typography } from "antd";
import { CanonicalProfileView } from "../components/profile/CanonicalProfileView";
import { buildPrismaProfileView } from "../domain/canonicalProfile";
import type { PersonProfileView, PrismaDataRepository } from "../domain/prismaData";
import { describeLifecycle } from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PersonProfilePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

type EvidenceSection = "about" | "experience" | "education" | "competencies" | "credentials" | "other";

export function PersonProfilePage({ activeMembership, personId, repository, onNavigate }: PersonProfilePageProps) {
  const [view, setView] = useState<PersonProfileView | null>(null);
  const [evidenceSection, setEvidenceSection] = useState<EvidenceSection | null>(null);
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

  return (
    <PrismaPage className="prisma-profile-page">
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}`)} type="text">Voltar para a Central da Pessoa</Button>
      <PrismaPageHeader
        title="Perfil"
        description="Representação profissional estruturada, comparável e rastreável do Prisma."
        actions={<Space wrap><Button icon={<HistoryOutlined />} onClick={() => onNavigate(`/profiles/${personId}/versions`)}>Versões do perfil</Button>{canReview ? <Button icon={<EditOutlined />} onClick={() => onNavigate(`/profiles/${personId}/versions`)} type="primary">Criar nova revisão</Button> : null}</Space>}
      />
      {loading ? <ProfileSkeleton /> : null}
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {!loading && !error && !view ? <PrismaCard><Empty description="Pessoa inexistente ou indisponível para esta empresa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
      {view && !canonical ? <PrismaCard><Empty description="Ainda não existe um Perfil publicado para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : null}
      {canonical ? <CanonicalProfileView onShowEvidence={setEvidenceSection} profile={canonical} /> : null}
      <EvidenceDrawer evidence={view?.evidence ?? []} onClose={() => setEvidenceSection(null)} open={evidenceSection !== null} section={evidenceSection} />
    </PrismaPage>
  );
}

function ProfileSkeleton() {
  return <div className="prisma-profile-skeleton"><PrismaCard><Skeleton active avatar paragraph={{ rows: 3 }} /></PrismaCard><PrismaCard><Skeleton active paragraph={{ rows: 8 }} /></PrismaCard></div>;
}

function EvidenceDrawer({ evidence, onClose, open, section }: { evidence: PersonProfileView["evidence"]; onClose: () => void; open: boolean; section: EvidenceSection | null }) {
  const sectionLabel = section ? ({ about: "Sobre", experience: "Experiência profissional", education: "Formação", competencies: "Competências", credentials: "Credenciais", other: "Outros" } as const)[section] : "Perfil";
  return <Drawer className="prisma-evidence-drawer" destroyOnHidden onClose={onClose} open={open} title="Evidências disponíveis no Perfil" width="min(540px, 96vw)">
    <Typography.Paragraph type="secondary">Consulta aberta a partir de {sectionLabel}. As evidências abaixo pertencem ao Perfil publicado e mantêm sua origem documental.</Typography.Paragraph>
    {evidence.length ? <div className="prisma-canonical-evidence-list">{evidence.map((item) => <article key={item.id}><div><Tag color="blue">{item.sourcePage ? `Página ${item.sourcePage}` : "Fonte documental"}</Tag><span>{humanEvidenceKind(item.kind)}</span></div><strong>{item.fact}</strong><blockquote>{item.quotedText}</blockquote></article>)}</div> : <Empty description="Não há evidência documental disponível para este Perfil." image={<FileSearchOutlined />} />}
  </Drawer>;
}

function humanEvidenceKind(kind: string): string {
  if (/demonstrated/i.test(kind)) return "Verificação concluída";
  if (/human|review/i.test(kind)) return "Confirmada na revisão";
  return "Identificada no documento";
}
