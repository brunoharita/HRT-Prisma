import { useEffect, useState } from "react";
import { ApartmentOutlined, CheckCircleOutlined, DatabaseOutlined, FileAddOutlined, SafetyCertificateOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Skeleton, Statistic, Typography } from "antd";
import type { HomeSummary, PrismaDataRepository } from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface HomePageProps {
  activeMembership: OrganizationMembership;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function HomePage({ activeMembership, repository, onNavigate }: HomePageProps) {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setSummary(null);
    setError(null);
    setLoading(true);
    void repository.loadHomeSummary(activeMembership.organizationId)
      .then((result) => {
        if (current) setSummary(result);
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar o resumo da empresa.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [activeMembership.organizationId, repository]);

  return (
    <PrismaPage>
      <PrismaPageHeader
        title="Início"
        description={`Visão consolidada das informações profissionais de ${activeMembership.organizationName}.`}
      />
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {activeMembership.role !== "member" ? (
        <PrismaCard className="prisma-curriculum-first-card">
          <div>
            <Typography.Title level={2}>Importar currículo</Typography.Title>
            <Typography.Paragraph>
              Transforme um currículo em um perfil estruturado para revisão, preservando a fonte e cada evidência.
            </Typography.Paragraph>
          </div>
          <Button icon={<FileAddOutlined />} onClick={() => onNavigate("/profiles/import")} size="large" type="primary">
            Importar currículo
          </Button>
        </PrismaCard>
      ) : null}
      <section className="prisma-dashboard-grid" aria-label="Resumo da organização">
        {loading ? <HomeSkeleton /> : summary ? <HomeMetrics summary={summary} /> : null}
        {!loading && summary && summary.peopleCount === 0 && summary.structuredProfilesCount === 0 && summary.openVacanciesCount === 0 ? (
          <PrismaCard className="prisma-foundation-card">
            <Empty description="Esta organização ainda não possui dados estruturados." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </PrismaCard>
        ) : null}
        <PrismaCard className="prisma-contract-card" title="Confiança em cada etapa">
          <div className="prisma-home-principles">
            <div><CheckCircleOutlined /><span><strong>Decisão humana</strong><small>O Prisma organiza evidências, mas não decide contratações.</small></span></div>
            <div><SafetyCertificateOutlined /><span><strong>Origem preservada</strong><small>Cada informação permanece vinculada à sua fonte e versão.</small></span></div>
            <div><DatabaseOutlined /><span><strong>Dados protegidos</strong><small>O acesso respeita a empresa ativa e o papel de cada usuário.</small></span></div>
          </div>
        </PrismaCard>
      </section>
    </PrismaPage>
  );
}

function HomeMetrics({ summary }: { summary: HomeSummary }) {
  return (
    <>
      <PrismaCard className="prisma-status-card">
        <Statistic prefix={<TeamOutlined />} title="Pessoas" value={summary.peopleCount} />
        <Typography.Text type="secondary">Pessoas registradas na empresa ativa.</Typography.Text>
      </PrismaCard>
      <PrismaCard className="prisma-status-card">
        <Statistic prefix={<DatabaseOutlined />} title="Perfis estruturados" value={summary.structuredProfilesCount} />
        <Typography.Text type="secondary">Perfis aprovados e prontos para consulta.</Typography.Text>
      </PrismaCard>
      <PrismaCard className="prisma-status-card">
        <Statistic prefix={<ApartmentOutlined />} title="Vagas abertas" value={summary.openVacanciesCount} />
        <Typography.Text type="secondary">Vagas atualmente abertas na empresa.</Typography.Text>
      </PrismaCard>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => <PrismaCard key={item} className="prisma-status-card"><Skeleton active paragraph={{ rows: 1 }} /></PrismaCard>)}
    </>
  );
}
