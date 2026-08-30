import { useDeferredValue, useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Skeleton, Statistic, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DocumentOperationSummary, DocumentReviewState } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface DocumentOperationsPageProps {
  activeMembership: OrganizationMembership;
  onNavigate: (path: string) => void;
}

export function DocumentOperationsPage({ activeMembership, onNavigate }: DocumentOperationsPageProps) {
  const [documents, setDocuments] = useState<DocumentOperationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("pt-BR"));

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void personIngestionService.listDocumentOperations(activeMembership.organizationId)
      .then((result) => { if (current) setDocuments(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a central."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId]);

  const filtered = documents.filter((document) => {
    const matchesSearch = !deferredSearch || `${document.personName} ${document.filename}`.toLocaleLowerCase("pt-BR").includes(deferredSearch);
    return matchesSearch && (status === "all" || operationalStatus(document) === status);
  });
  const counts = documents.reduce((result, document) => {
    result[operationalStatus(document)] += 1;
    return result;
  }, { received: 0, processing: 0, review: 0, completed: 0, failed: 0 });

  const columns: ColumnsType<DocumentOperationSummary> = [
    {
      title: "Pessoa",
      dataIndex: "personName",
      key: "personName",
      width: 280,
      render: (value: string, document) => (
        <button className="prisma-person-name-button prisma-operation-person" onClick={() => onNavigate(`/profiles/${document.personId}`)} type="button">
          <span className="prisma-person-avatar" aria-hidden="true">{initials(value)}</span>
          <span className="prisma-operation-person-copy">
            <Tooltip title={value}><strong>{value}</strong></Tooltip>
            <small>Registro da empresa</small>
          </span>
        </button>
      ),
    },
    {
      title: "Documento",
      dataIndex: "filename",
      key: "filename",
      width: 270,
      render: (value, document) => (
        <div className="prisma-operation-document">
          <span className="prisma-operation-document-icon" aria-hidden="true">
            {document.sourceType === "resume_pdf" ? <FilePdfOutlined /> : <FileTextOutlined />}
          </span>
          <span className="prisma-operation-document-copy">
            <Tooltip title={value}><strong>{value}</strong></Tooltip>
            <small className="prisma-table-secondary">v{document.documentVersion} · {document.sourceType === "resume_pdf" ? "PDF" : "Texto manual"}</small>
          </span>
        </div>
      ),
    },
    { title: "Status", key: "status", width: 160, render: (_, document) => <OperationalStatusTag document={document} /> },
    { title: "Tentativa", key: "attempt", width: 140, render: (_, document) => <span className="prisma-operation-compact-value">{document.latestAttempt ? `#${document.latestAttempt.attemptNumber}` : "Ainda não iniciada"}</span> },
    { title: "Perfil", key: "profile", width: 120, render: (_, document) => <span className="prisma-operation-compact-value">{document.profileVersion ? `v${document.profileVersion}` : "Não aprovado"}</span> },
    { title: "Atualizado em", key: "updated", width: 165, render: (_, document) => <time className="prisma-operation-date" dateTime={document.processedAt ?? document.createdAt}>{formatDate(document.processedAt ?? document.createdAt)}</time> },
    { title: "Ações", key: "actions", width: 110, align: "center", render: (_, document) => <Button className="prisma-operation-open" icon={<EyeOutlined />} onClick={() => onNavigate(`/profiles/${document.personId}/documents/${document.id}`)}>Abrir</Button> },
  ];

  return (
    <PrismaPage className="prisma-m2c-page">
      <PrismaPageHeader
        title="Processamento e revisões"
        description="Acompanhe documentos, tentativas, falhas e revisões humanas da empresa ativa."
        actions={<Button onClick={() => onNavigate("/profiles")}>Voltar para Pessoas</Button>}
      />
      <div className="prisma-operations-stats">
        <OperationMetric icon={<FileSearchOutlined />} label="Recebidos" value={counts.received} tone="neutral" />
        <OperationMetric icon={<SyncOutlined spin={counts.processing > 0} />} label="Processando" value={counts.processing} tone="processing" />
        <OperationMetric icon={<ClockCircleOutlined />} label="Aguardando revisão" value={counts.review} tone="review" />
        <OperationMetric icon={<CheckCircleOutlined />} label="Concluídos" value={counts.completed} tone="success" />
        <OperationMetric icon={<CloseCircleOutlined />} label="Falharam" value={counts.failed} tone="danger" />
      </div>
      <PrismaCard className="prisma-operations-toolbar">
        <Input.Search allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pessoa ou documento..." value={search} />
        <Select
          aria-label="Filtrar status operacional"
          onChange={setStatus}
          options={[
            { value: "all", label: "Todos os status" },
            { value: "received", label: "Recebidos" },
            { value: "processing", label: "Processando" },
            { value: "review", label: "Aguardando revisão" },
            { value: "completed", label: "Concluídos" },
            { value: "failed", label: "Falharam" },
          ]}
          value={status}
        />
      </PrismaCard>
      {error ? <Alert title={error} showIcon type="error" /> : null}
      <PrismaCard className="prisma-operations-table">
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
          <Table
            columns={columns}
            dataSource={filtered}
            locale={{ emptyText: <Empty description="Nenhum documento corresponde aos filtros." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} ${total === 1 ? "resultado" : "resultados"}` }}
            rowKey="id"
            scroll={{ x: 1345 }}
            size="middle"
            tableLayout="fixed"
          />
        )}
      </PrismaCard>
    </PrismaPage>
  );
}

function OperationMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <PrismaCard className={`prisma-operation-metric prisma-operation-metric--${tone}`}><span className="prisma-operation-metric-icon">{icon}</span><Statistic title={label} value={value} /></PrismaCard>;
}

export function OperationalStatusTag({ document }: { document: { reviewState: DocumentReviewState; latestAttempt: DocumentOperationSummary["latestAttempt"] } }) {
  const state = operationalStatus(document);
  if (state === "failed") return <Tag color="red">Falhou</Tag>;
  if (state === "completed") return <Tag color="green">Aprovado</Tag>;
  if (state === "review") return <Tag color="blue">Aguardando revisão</Tag>;
  if (state === "processing") return <Tag color="gold">Processando</Tag>;
  return <Tag color="purple">Recebido</Tag>;
}

function operationalStatus(document: { reviewState: DocumentReviewState; latestAttempt: DocumentOperationSummary["latestAttempt"] }): "received" | "processing" | "review" | "completed" | "failed" {
  if (document.latestAttempt?.state.startsWith("failed")) return "failed";
  if (document.reviewState === "approved") return "completed";
  if (document.reviewState === "ready_for_review" || document.reviewState === "in_review") return "review";
  if (document.latestAttempt) return "processing";
  return "received";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
