import { useEffect, useState } from "react";
import { ApartmentOutlined, CheckCircleOutlined, ClockCircleOutlined, DatabaseOutlined, FileAddOutlined, SafetyCertificateOutlined, SyncOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Skeleton, Statistic, Tag, Typography } from "antd";
import type { HomeSummary, KnowledgeSourceHealth, KnowledgeSourceMonitorStatus, PrismaDataRepository } from "../domain/prismaData";
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
        {!loading && summary ? (
          <KnowledgeSourcesCard
            sources={summary.knowledgeSources}
            canManage={activeMembership.role === "super_admin"}
            onNavigate={onNavigate}
          />
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

function KnowledgeSourcesCard({
  sources,
  canManage,
  onNavigate,
}: {
  sources: KnowledgeSourceHealth[];
  canManage: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <PrismaCard
      className="prisma-knowledge-health-card"
      title={<span className="prisma-knowledge-health-title"><SyncOutlined /> Bases de conhecimento</span>}
      extra={canManage ? <Button onClick={() => onNavigate("/knowledge")} size="small" type="link">Abrir governança</Button> : undefined}
    >
      <Typography.Paragraph className="prisma-knowledge-health-intro" type="secondary">
        Referências profissionais verificadas mensalmente, no primeiro dia às 01:00, no horário de São Paulo.
      </Typography.Paragraph>
      <div className="prisma-knowledge-health-grid">
        {sources.map((source) => {
          const status = describeMonitorStatus(source.status);
          return (
            <article className="prisma-knowledge-source" key={source.id}>
              <div className="prisma-knowledge-source__heading">
                <div>
                  <strong>{source.name}</strong>
                  <small>{source.published ? "Versão publicada" : "Versão detectada"}</small>
                </div>
                <Tag color={status.color}>{status.label}</Tag>
              </div>
              <Typography.Text className="prisma-knowledge-source__version">
                {source.version ?? "Versão ainda não identificada"}
              </Typography.Text>
              <dl>
                <div><dt>Data da versão</dt><dd>{formatReleaseDate(source.releaseDate)}</dd></div>
                {source.published && source.detectedVersion && source.detectedVersion !== source.version ? (
                  <div><dt>Nova versão detectada</dt><dd>{source.detectedVersion} · {formatReleaseDate(source.detectedReleaseDate)}</dd></div>
                ) : null}
                <div><dt><ClockCircleOutlined /> Última checagem</dt><dd>{formatCheckedAt(source.lastCheckedAt)}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </PrismaCard>
  );
}

function describeMonitorStatus(status: KnowledgeSourceMonitorStatus): { label: string; color: string } {
  if (status === "current") return { label: "Atualizada", color: "success" };
  if (status === "update_available") return { label: "Nova versão disponível", color: "processing" };
  if (status === "action_required") return { label: "Aguardando ação humana", color: "warning" };
  if (status === "temporary_failure") return { label: "Falha temporária", color: "error" };
  if (status === "validation_failed") return { label: "Validação rejeitada", color: "error" };
  return { label: "Ainda não verificada", color: "default" };
}

function formatReleaseDate(value: string | null): string {
  if (!value) return "Não informada pela fonte";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatCheckedAt(value: string | null): string {
  if (!value) return "Aguardando primeira checagem";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
