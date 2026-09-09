import { useEffect, useState } from "react";
import { ApartmentOutlined, CheckCircleOutlined, ClockCircleOutlined, DatabaseOutlined, FileAddOutlined, SafetyCertificateOutlined, SyncOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Skeleton, Statistic, Steps, Tag, Typography } from "antd";
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
  const [checkingSourceId, setCheckingSourceId] = useState<string | null>(null);
  const [resolutionSource, setResolutionSource] = useState<KnowledgeSourceHealth | null>(null);

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
            checkingSourceId={checkingSourceId}
            onResolve={setResolutionSource}
            onCheck={async (sourceId) => {
              setCheckingSourceId(sourceId);
              try {
                await repository.checkKnowledgeSource(sourceId);
                const refreshed = await repository.loadHomeSummary(activeMembership.organizationId);
                setSummary(refreshed);
              } catch {
                setError("Não foi possível checar esta base de conhecimento agora.");
              } finally {
                setCheckingSourceId(null);
              }
            }}
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
      <SourceResolutionDrawer source={resolutionSource} onClose={() => setResolutionSource(null)} onNavigate={onNavigate} />
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
  checkingSourceId,
  onCheck,
  onResolve,
}: {
  sources: KnowledgeSourceHealth[];
  canManage: boolean;
  onNavigate: (path: string) => void;
  checkingSourceId: string | null;
  onCheck: (sourceId: string) => Promise<void>;
  onResolve: (source: KnowledgeSourceHealth) => void;
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
              {source.status === "action_required" ? (
                <Alert
                  className="prisma-knowledge-source__action"
                  description={describeRequiredAction(source)}
                  message="O que falta fazer"
                  showIcon
                  type="warning"
                />
              ) : null}
              {source.status !== "current" ? <Button block onClick={() => onResolve(source)} type="primary">Resolver pendências</Button> : null}
              {canManage ? <Button block loading={checkingSourceId === source.id} onClick={() => void onCheck(source.id)} size="small">Checar agora</Button> : null}
            </article>
          );
        })}
      </div>
    </PrismaCard>
  );
}

function SourceResolutionDrawer({
  source,
  onClose,
  onNavigate,
}: {
  source: KnowledgeSourceHealth | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const plan = source ? buildResolutionPlan(source) : null;
  return <Drawer open={Boolean(source)} onClose={onClose} title={plan?.title ?? "Resolver pendências"} width={560}>
    {plan ? <>
      <Alert showIcon type={plan.tone} message={plan.summary} />
      <Typography.Title level={5} style={{ marginTop: 24 }}>O que o Prisma fará</Typography.Title>
      <Steps direction="vertical" size="small" items={plan.steps.map((step) => ({ title: step }))} />
      <Alert style={{ marginTop: 20 }} type="info" showIcon message="Decisão necessária" description={plan.humanDecision} />
      {plan.canOpenGovernance ? <Button block onClick={() => { onClose(); onNavigate("/knowledge"); }} style={{ marginTop: 20 }} type="primary">Abrir governança</Button> : null}
    </> : null}
  </Drawer>;
}

function buildResolutionPlan(source: KnowledgeSourceHealth): {
  title: string;
  summary: string;
  steps: string[];
  humanDecision: string;
  tone: "info" | "warning" | "error";
  canOpenGovernance: boolean;
} {
  const version = source.detectedVersion ?? source.version ?? "a versão encontrada";
  if (source.pendingPublication) return {
    title: `Resolver pendências · ${source.name}`,
    summary: `A versão ${version} já foi preparada e comparada com a versão atual.`,
    steps: ["Abrir a Governança", "Revisar o que mudou", "Confirmar a publicação da nova versão"],
    humanDecision: "A publicação altera a base global usada pelo Prisma e precisa da aprovação de um Super Admin.",
    tone: "warning",
    canOpenGovernance: true,
  };
  if (source.status === "temporary_failure") return {
    title: `Tentar novamente · ${source.name}`,
    summary: "A fonte não respondeu corretamente nesta tentativa.",
    steps: ["Repetir a consulta à fonte oficial", "Registrar o novo resultado", "Manter a versão atual se a fonte continuar indisponível"],
    humanDecision: "Nenhuma decisão de publicação é necessária enquanto a consulta não for concluída.",
    tone: "error",
    canOpenGovernance: false,
  };
  if (source.status === "validation_failed") return {
    title: `Revisar validação · ${source.name}`,
    summary: "A fonte respondeu, mas o conteúdo não passou pela validação esperada.",
    steps: ["Consultar novamente a fonte oficial", "Identificar o que não pôde ser validado", "Preparar uma nova tentativa quando o conteúdo estiver íntegro"],
    humanDecision: "A versão atual continua protegida; nenhuma publicação será feita com conteúdo não validado.",
    tone: "error",
    canOpenGovernance: true,
  };
  return {
    title: `Preparar atualização · ${source.name}`,
    summary: `A versão ${version} foi encontrada, mas ainda não está pronta para uso no Prisma.`,
    steps: ["Obter o pacote oficial", "Validar estrutura, origem e licença", "Comparar com a versão atual", "Enviar para revisão humana"],
    humanDecision: "Depois da preparação, um Super Admin revisará as diferenças antes da publicação.",
    tone: "info",
    canOpenGovernance: true,
  };
}

function describeRequiredAction(source: KnowledgeSourceHealth): string {
  if (source.pendingPublication) {
    return `A versão ${source.detectedVersion ?? source.version ?? "detectada"} já foi preparada e comparada. Falta revisar e aprovar a publicação em Governança.`;
  }
  if (!source.published) {
    return `A versão ${source.detectedVersion ?? source.version ?? "detectada"} foi encontrada, mas ainda precisa ser preparada, validada e aprovada antes de ser usada pelo Prisma.`;
  }
  return "Foi identificada uma diferença em relação à versão publicada. Revise a nova versão antes de substituir a atual.";
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
