import { useEffect, useState } from "react";
import { ArrowLeftOutlined, AuditOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Empty, Skeleton, Space, Table, Tag, Timeline } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PersonIngestionWorkspace, ProcessingAttemptView, ProcessingAuditEvent } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { OperationalStatusTag } from "./DocumentOperationsPage";

interface DocumentDetailPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId: string;
  onNavigate: (path: string) => void;
}

export function DocumentDetailPage({ activeMembership, personId, documentId, onNavigate }: DocumentDetailPageProps) {
  const [workspace, setWorkspace] = useState<PersonIngestionWorkspace | null>(null);
  const [attempts, setAttempts] = useState<ProcessingAttemptView[]>([]);
  const [events, setEvents] = useState<ProcessingAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [nextWorkspace, nextAttempts, nextEvents] = await Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, personId, documentId),
      personIngestionService.listDocumentAttempts(activeMembership.organizationId, documentId),
      personIngestionService.listAuditEvents(activeMembership.organizationId, documentId),
    ]);
    setWorkspace(nextWorkspace);
    setAttempts(nextAttempts);
    setEvents(nextEvents);
  }

  useEffect(() => {
    let current = true;
    setLoading(true);
    void Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, personId, documentId),
      personIngestionService.listDocumentAttempts(activeMembership.organizationId, documentId),
      personIngestionService.listAuditEvents(activeMembership.organizationId, documentId),
    ]).then(([nextWorkspace, nextAttempts, nextEvents]) => {
      if (!current) return;
      setWorkspace(nextWorkspace); setAttempts(nextAttempts); setEvents(nextEvents);
    }).catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o documento."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, documentId, personId]);

  const document = workspace?.selectedDocument;
  async function handleRetry() {
    if (!document) return;
    setBusy(true); setError(null);
    try { await personIngestionService.reprocessDocument(activeMembership.organizationId, personId, document.id); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível reprocessar o documento."); }
    finally { setBusy(false); }
  }
  async function handleReview() {
    if (!document?.latestAttempt) return;
    setBusy(true); setError(null);
    try {
      const reviewId = await personIngestionService.startProfileReview(activeMembership.organizationId, personId, document.id, document.latestAttempt.id);
      onNavigate(`/profiles/${personId}/documents/${document.id}/review/${reviewId}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a revisão."); }
    finally { setBusy(false); }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 14 }} /></PrismaPage>;
  if (!workspace || !document) return <PrismaPage><Alert title={error ?? "Documento não encontrado nesta empresa."} showIcon type="error" /></PrismaPage>;

  const attemptColumns: ColumnsType<ProcessingAttemptView> = [
    { title: "Tentativa", dataIndex: "attemptNumber", render: (value) => `#${value}` },
    { title: "Estado", dataIndex: "state", render: (value: string) => <Tag color={value.startsWith("failed") ? "red" : value === "completed" ? "green" : "blue"}>{value}</Tag> },
    { title: "Método", dataIndex: "currentMethod" },
    { title: "Páginas", render: (_, attempt) => `${attempt.pagesNative} nativas · ${attempt.pagesOcr} OCR` },
    { title: "Início", dataIndex: "startedAt", render: formatDate },
    { title: "Conclusão", dataIndex: "completedAt", render: (value) => value ? formatDate(value) : "Em andamento" },
  ];

  return (
    <PrismaPage className="prisma-m2c-page">
      <PrismaPageHeader
        title={document.filename}
        description={`${workspace.person.fullName} · Documento v${document.documentVersion}`}
        actions={<Space wrap><Button icon={<ReloadOutlined />} loading={busy} onClick={() => void handleRetry()}>Reprocessar</Button><Button disabled={document.latestAttempt?.state !== "structured"} loading={busy} onClick={() => void handleReview()} type="primary">Revisar perfil</Button></Space>}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles/processes")} type="text">Voltar para a central</Button>
      {error ? <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <div className="prisma-document-summary-grid">
        <PrismaCard title="Informações do documento">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Documento ID">{document.id}</Descriptions.Item>
            <Descriptions.Item label="Origem">{document.sourceType === "resume_pdf" ? "Upload de currículo" : "Texto manual"}</Descriptions.Item>
            <Descriptions.Item label="Tamanho">{formatBytes(document.byteSize)}</Descriptions.Item>
            <Descriptions.Item label="Páginas">{document.pageCount ?? "Não informado"}</Descriptions.Item>
            <Descriptions.Item label="Recebido em">{formatDate(document.createdAt)}</Descriptions.Item>
          </Descriptions>
        </PrismaCard>
        <PrismaCard title="Situação atual">
          <Space orientation="vertical">
            <OperationalStatusTag document={document} />
            <span>Estado de revisão: <strong>{document.reviewState}</strong></span>
            <span>Tentativa atual: <strong>{document.latestAttempt ? `#${document.latestAttempt.attemptNumber}` : "não iniciada"}</strong></span>
            <span>Perfil aprovado: <strong>{document.profileVersion ? `v${document.profileVersion}` : "não"}</strong></span>
          </Space>
        </PrismaCard>
        <PrismaCard title="Próximos passos">
          {document.reviewState === "approved" ? <Alert title="Documento concluído e perfil aprovado." showIcon type="success" /> : document.latestAttempt?.state === "structured" ? <Button block onClick={() => void handleReview()} type="primary">Iniciar ou continuar revisão</Button> : <Alert title="Reprocesse quando houver uma falha recuperável." showIcon type="info" />}
          <Button block onClick={() => onNavigate(`/profiles/${personId}/versions`)}>Comparar versões do perfil</Button>
        </PrismaCard>
      </div>
      <PrismaCard title="Tentativas de processamento">
        <Table columns={attemptColumns} dataSource={attempts} pagination={false} rowKey="id" scroll={{ x: 900 }} />
      </PrismaCard>
      <PrismaCard title={<span><AuditOutlined /> Auditoria operacional</span>}>
        {events.length ? <Timeline items={events.map((event) => ({ color: event.result === "failure" ? "red" : "green", content: <div><strong>{event.eventType}</strong><p>{formatDate(event.createdAt)} · {event.result}{event.errorCode ? ` · ${event.errorCode}` : ""}</p><small>Ator: {event.actorAuthUserId ?? "sistema"}</small></div> }))} /> : <Empty description="Nenhum evento auditável registrado." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
    </PrismaPage>
  );
}

function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function formatBytes(value: number | null): string { if (!value) return "Não informado"; return value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`; }
