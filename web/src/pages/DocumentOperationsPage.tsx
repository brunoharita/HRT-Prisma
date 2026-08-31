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
import {
  currentProfileDescription,
  currentProfileLabel,
  presentDocument,
  type DocumentOperationalState,
} from "../domain/documentPresentation";
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
  const [status, setStatus] = useState<"all" | DocumentOperationalState>("all");
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
    return matchesSearch && (status === "all" || presentDocument(document).state === status);
  });
  const counts = documents.reduce((result, document) => {
    const state = presentDocument(document).state;
    if (state === "received") result.received += 1;
    if (state === "processing") result.processing += 1;
    if (state === "requires_review") result.review += 1;
    if (state === "processed") result.completed += 1;
    if (state === "technical_failure") result.failed += 1;
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
            <small>{activeMembership.organizationName}</small>
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
            <small className="prisma-table-secondary">Documento v{document.documentVersion} · {document.sourceType === "resume_pdf" ? "PDF" : "Texto manual"}</small>
          </span>
        </div>
      ),
    },
    {
      title: "Status do documento",
      key: "status",
      width: 230,
      render: (_, document) => {
        const presentation = presentDocument(document);
        return <div className="prisma-operation-status-cell"><OperationalStatusTag document={document} /><small>{presentation.description}</small></div>;
      },
    },
    {
      title: "Perfil atual",
      key: "profile",
      width: 190,
      render: (_, document) => (
        <div className="prisma-operation-profile-cell">
          <Tag color={document.currentProfile ? "green" : "default"}>{currentProfileLabel(document.currentProfile)}</Tag>
          <small>{currentProfileDescription(document.currentProfile)}</small>
        </div>
      ),
    },
    {
      title: "Próxima ação",
      key: "nextAction",
      width: 185,
      render: (_, document) => <span className="prisma-operation-next-action">{presentDocument(document).nextAction}</span>,
    },
    {
      title: "Atualizado em",
      key: "updated",
      width: 150,
      render: (_, document) => <time className="prisma-operation-date" dateTime={document.processedAt ?? document.createdAt}>{formatDate(document.processedAt ?? document.createdAt)}</time>,
    },
    {
      title: "Ações",
      key: "actions",
      width: 110,
      align: "center",
      render: (_, document) => <Button className="prisma-operation-open" icon={<EyeOutlined />} onClick={() => onNavigate(`/profiles/${document.personId}`)}>Abrir</Button>,
    },
  ];

  return (
    <PrismaPage className="prisma-m2c-page prisma-document-operations-page">
      <PrismaPageHeader
        title="Processamento e revisões"
        description="Acompanhe documentos, tentativas, revisões humanas e o impacto no perfil atual."
        actions={<Button onClick={() => onNavigate("/profiles")}>Voltar para Pessoas</Button>}
      />

      <PrismaCard className="prisma-operation-legend">
        <LegendItem icon={<CheckCircleOutlined />} label="Processado" description="Documento processado com sucesso e disponível." tone="success" />
        <LegendItem icon={<ClockCircleOutlined />} label="Requer revisão" description="Conteúdo recuperado, revisão humana necessária." tone="review" />
        <LegendItem icon={<CloseCircleOutlined />} label="Falha técnica" description="Erro no processamento. Nova tentativa necessária." tone="danger" />
      </PrismaCard>

      <div className="prisma-operations-stats">
        <OperationMetric icon={<FileSearchOutlined />} label="Recebidos" value={counts.received} tone="neutral" />
        <OperationMetric icon={<SyncOutlined spin={counts.processing > 0} />} label="Processando" value={counts.processing} tone="processing" />
        <OperationMetric icon={<ClockCircleOutlined />} label="Requer revisão" value={counts.review} tone="review" />
        <OperationMetric icon={<CheckCircleOutlined />} label="Concluídos" value={counts.completed} tone="success" />
        <OperationMetric icon={<CloseCircleOutlined />} label="Falha técnica" value={counts.failed} tone="danger" />
      </div>
      <PrismaCard className="prisma-operations-toolbar">
        <Input.Search allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pessoa, documento ou organização..." value={search} />
        <Select
          aria-label="Filtrar status operacional"
          onChange={setStatus}
          options={[
            { value: "all", label: "Todos os status" },
            { value: "received", label: "Recebidos" },
            { value: "processing", label: "Processando" },
            { value: "requires_review", label: "Requer revisão" },
            { value: "processed", label: "Concluídos" },
            { value: "technical_failure", label: "Falha técnica" },
            { value: "discarded", label: "Arquivados" },
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
            scroll={{ x: 1415 }}
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

function LegendItem({ icon, label, description, tone }: { icon: React.ReactNode; label: string; description: string; tone: string }) {
  return <div className={`prisma-operation-legend-item prisma-operation-legend-item--${tone}`}><span>{icon}</span><div><strong>{label}</strong><small>{description}</small></div></div>;
}

export function OperationalStatusTag({ document }: { document: { reviewState: DocumentReviewState; status: string; latestAttempt: DocumentOperationSummary["latestAttempt"] } }) {
  const presentation = presentDocument(document);
  if (presentation.state === "technical_failure") return <Tag color="red">Falha técnica</Tag>;
  if (presentation.state === "processed") return <Tag color="green">Processado</Tag>;
  if (presentation.state === "requires_review") return <Tag color="gold">Requer revisão</Tag>;
  if (presentation.state === "processing") return <Tag color="blue">Processando</Tag>;
  if (presentation.state === "discarded") return <Tag>Arquivado</Tag>;
  return <Tag color="purple">Recebido</Tag>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
