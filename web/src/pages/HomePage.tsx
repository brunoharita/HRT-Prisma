import { useEffect, useState } from "react";
import { ApartmentOutlined, DatabaseOutlined, FileAddOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Empty, Skeleton, Statistic, Typography } from "antd";
import type { HomeSummary, PrismaDataRepository } from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import type { PrismaNavigationItem } from "../ui/PrismaAppShell";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface HomePageProps {
  activeMembership: OrganizationMembership;
  navigationItems: PrismaNavigationItem[];
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function HomePage({ activeMembership, navigationItems, repository, onNavigate }: HomePageProps) {
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
        if (current) setError("Não foi possível consultar o resumo da organização no Supabase.");
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
        description={`Dados persistidos da organização ${activeMembership.organizationName}.`}
        extras={<Badge status="processing" text="Supabase QA" />}
      />
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {activeMembership.role !== "member" ? (
        <PrismaCard className="prisma-curriculum-first-card">
          <div>
            <Typography.Title level={2}>Importar currículo</Typography.Title>
            <Typography.Paragraph>
              Importe um currículo e deixe o Prisma criar o cadastro e estruturar o Perfil profissional.
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
        <PrismaCard className="prisma-foundation-card" title="Consultar dados">
          <div className="prisma-route-list">
            {navigationItems.map((item) => (
              <button key={item.path} className="prisma-route-link" type="button" onClick={() => onNavigate(item.path)}>
                <span className="prisma-route-icon">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{describeRoute(item.path)}</small></span>
              </button>
            ))}
          </div>
        </PrismaCard>
        <PrismaCard className="prisma-contract-card" title="Fronteira de autorização">
          <Alert
            description="As consultas incluem a organização ativa explicitamente. O banco confirma sessão, membership e papel em cada linha por RLS."
            message="A interface não concede autoridade"
            showIcon
            type="info"
          />
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
        <Typography.Text type="secondary">Registros profissionais no tenant ativo.</Typography.Text>
      </PrismaCard>
      <PrismaCard className="prisma-status-card">
        <Statistic prefix={<DatabaseOutlined />} title="Perfis estruturados" value={summary.structuredProfilesCount} />
        <Typography.Text type="secondary">Perfis atuais persistidos e consultáveis.</Typography.Text>
      </PrismaCard>
      <PrismaCard className="prisma-status-card">
        <Statistic prefix={<ApartmentOutlined />} title="Vagas abertas" value={summary.openVacanciesCount} />
        <Typography.Text type="secondary">Vagas com status aberto no domínio.</Typography.Text>
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

function describeRoute(path: string): string {
  if (path === "/") return "Resumo persistido da organização";
  if (path === "/profiles") return "Busca e perfis profissionais";
  if (path === "/vacancies") return "Vagas e requisitos";
  return "Gestão da organização";
}
