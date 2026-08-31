import { useEffect, useState } from "react";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  List,
  Popconfirm,
  Skeleton,
  Space,
  Spin,
  Statistic,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  processManualText,
  validateAndProcessPdf,
  type PersonDocumentTimelineItem,
  type PersonIngestionWorkspace,
  type PdfProcessingProgress,
  type ProcessingState,
} from "../domain/personIngestion";
import {
  currentProfileDescription,
  currentProfileLabel,
  isReviewableDocument,
  presentDocument,
} from "../domain/documentPresentation";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PersonWorkspacePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  onNavigate: (path: string) => void;
}

export function PersonWorkspacePage({ activeMembership, personId, onNavigate }: PersonWorkspacePageProps) {
  const [workspace, setWorkspace] = useState<PersonIngestionWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState<PdfProcessingProgress | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();

  async function refresh(documentId = selectedDocumentId) {
    const result = await personIngestionService.loadWorkspace(activeMembership.organizationId, personId, documentId);
    if (!result) throw new Error("Pessoa não encontrada nesta empresa.");
    setWorkspace(result);
    setSelectedDocumentId(result.selectedDocument?.id);
    setSelectedPage(result.pages[0]?.pageNumber ?? 1);
  }

  useEffect(() => {
    let current = true;
    setLoading(true);
    void personIngestionService.loadWorkspace(activeMembership.organizationId, personId)
      .then((result) => { if (current) setWorkspace(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a Pessoa."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, personId]);

  async function handleManualProcessing() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      processManualText(manualText);
      const documentId = await personIngestionService.processManualSource(activeMembership.organizationId, personId, manualText);
      setManualText("");
      setSelectedDocumentId(documentId);
      await refresh(documentId);
      setSuccess("Texto manual preservado, extraído e estruturado com proveniência.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O texto não pôde ser processado. Nenhum perfil foi gerado.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePdfProcessing() {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      setError("Selecione um PDF antes de processar.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const processed = await validateAndProcessPdf(file, setProgress);
      const documentId = await personIngestionService.processPdf(activeMembership.organizationId, personId, processed);
      setSelectedDocumentId(documentId);
      setFileList([]);
      await refresh(documentId);
      setSuccess(processed.ocrPageCount > 0
        ? `PDF processado com OCR local em ${processed.ocrPageCount} página(s).`
        : "PDF processado integralmente por extração nativa; OCR não necessário.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O PDF não pôde ser processado. Nenhum perfil foi gerado.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleStartReview(document = workspace?.selectedDocument) {
    if (!document?.latestAttempt) return;
    setBusy(true);
    setError(null);
    try {
      const reviewId = await personIngestionService.startProfileReview(
        activeMembership.organizationId,
        personId,
        document.id,
        document.latestAttempt.id,
      );
      onNavigate(`/profiles/${personId}/documents/${document.id}/review/${reviewId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A revisão humana não pôde ser iniciada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReprocess(document = workspace?.selectedDocument) {
    if (!document) return;
    setBusy(true);
    setError(null);
    try {
      await personIngestionService.reprocessDocument(activeMembership.organizationId, personId, document.id);
      await refresh(document.id);
      setSuccess("Nova tentativa técnica criada sem apagar a extração ou o perfil anterior.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reprocessar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard(document: PersonDocumentTimelineItem) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (presentDocument(document).state === "requires_review") {
        if (!document.latestAttempt) throw new Error("A importação não possui tentativa revisável.");
        await personIngestionService.startProfileReview(
          activeMembership.organizationId,
          personId,
          document.id,
          document.latestAttempt.id,
        );
      }
      await personIngestionService.discardDocumentReview(activeMembership.organizationId, document.id);
      await refresh(document.id);
      setSuccess("A pendência foi arquivada. Documento, tentativas, revisão e perfil atual permanecem preservados no histórico.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível arquivar a importação.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 14 }} /></PrismaPage>;
  if (!workspace) return <PrismaPage><Alert message={error ?? "Pessoa não encontrada."} showIcon type="error" /></PrismaPage>;
  const currentPage = workspace.pages.find((page) => page.pageNumber === selectedPage) ?? workspace.pages[0];
  const selectedDocument = workspace.selectedDocument;
  const latestDocument = workspace.documents[0] ?? null;
  const latestPresentation = presentDocument(latestDocument);
  const attempt = selectedDocument?.latestAttempt;
  const canReview = isReviewableDocument(latestDocument);

  return (
    <PrismaPage className="prisma-m2b-page prisma-person-workspace">
      <PrismaPageHeader
        title={workspace.person.fullName}
        description={`Central da Pessoa · perfil vigente, documentos, revisões e novas importações · ${activeMembership.organizationName}`}
        actions={(
          <Space wrap>
            <Button onClick={() => onNavigate("/profiles/processes")}>Processamento e revisões</Button>
            <Button icon={<EditOutlined />} onClick={() => onNavigate(`/profiles/${personId}/edit`)}>Editar dados</Button>
          </Space>
        )}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable message={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}

      <PrismaCard className={`prisma-person-current-banner prisma-person-current-banner--${workspace.person.currentProfile ? "preserved" : "initial"}`}>
        <div className="prisma-person-current-banner__status">
          <span className="prisma-person-current-banner__icon">{workspace.person.currentProfile ? <CheckCircleOutlined /> : <FileTextOutlined />}</span>
          <div>
            <Typography.Title level={3}>{currentProfileLabel(workspace.person.currentProfile)}</Typography.Title>
            <Typography.Paragraph>
              {latestDocument
                ? `O documento “${latestDocument.filename}” foi preservado. ${latestPresentation.state === "requires_review" ? "A nova versão de perfil ainda não existe e depende da revisão humana." : latestPresentation.description}`
                : currentProfileDescription(workspace.person.currentProfile)}
            </Typography.Paragraph>
          </div>
        </div>
        <div className="prisma-person-current-banner__actions">
          {canReview && latestDocument ? <Button loading={busy} onClick={() => void handleStartReview(latestDocument)} type="primary">Revisar nova importação</Button> : null}
          <Space wrap>
            <Button disabled={!workspace.person.currentProfile} onClick={() => onNavigate(`/profiles/${personId}/versions`)}>Ver perfil atual</Button>
            {latestDocument ? <Button icon={<EyeOutlined />} onClick={() => onNavigate(documentViewerPath(personId, latestDocument))}>{latestDocument.verificationReviewId ? "Ver documento" : "Detalhes técnicos"}</Button> : null}
            {latestDocument && ["requires_review", "technical_failure"].includes(latestPresentation.state) ? <Button disabled={busy} icon={<ReloadOutlined />} loading={busy} onClick={() => void handleReprocess(latestDocument)}>Reprocessar</Button> : null}
            {latestDocument && ["requires_review", "technical_failure"].includes(latestPresentation.state) ? (
              <Popconfirm
                cancelText="Manter pendência"
                description="O documento, as tentativas, a revisão e o perfil atual serão preservados. Apenas a pendência operacional será encerrada."
                okText="Arquivar importação"
                onConfirm={() => void handleDiscard(latestDocument)}
                title="Descartar esta nova importação do fluxo ativo?"
              >
                <Button danger disabled={busy} icon={<DeleteOutlined />}>Descartar nova importação</Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>
        <div className="prisma-person-current-banner__preservation">
          <Tag color={latestPresentation.tone === "review" ? "gold" : latestPresentation.tone === "danger" ? "red" : "green"}>{latestPresentation.label}</Tag>
          <strong>{latestDocument ? "Nova importação preservada" : "Sem nova importação"}</strong>
          <span>{latestDocument && !latestDocument.profileVersion ? "Nenhuma nova versão de perfil foi criada." : currentProfileDescription(workspace.person.currentProfile)}</span>
        </div>
      </PrismaCard>

      <div className="prisma-person-hub-grid">
        <PrismaCard className="prisma-person-hub-summary">
          <Typography.Title level={3}>Resumo da Pessoa</Typography.Title>
          <div className="prisma-person-summary-metrics">
            <SummaryMetric icon={<CheckCircleOutlined />} label="Perfil atual" value={workspace.person.currentProfile ? `v${workspace.person.currentProfile.profileVersion} aprovado` : "Não aprovado"} tone="success" />
            <SummaryMetric icon={<ClockCircleOutlined />} label="Última importação" value={latestPresentation.label} tone={latestPresentation.tone} />
            <SummaryMetric icon={<FileTextOutlined />} label="Documentos" value={String(workspace.person.documentCount)} tone="processing" />
            <SummaryMetric icon={<SafetyCertificateOutlined />} label="Revisões pendentes" value={String(workspace.person.pendingReviewCount)} tone="review" />
          </div>
        </PrismaCard>
        <PrismaCard className="prisma-person-recent-history">
          <Typography.Title level={3}>Histórico recente</Typography.Title>
          <Timeline items={recentHistory(workspace)} />
        </PrismaCard>
      </div>

      <section aria-labelledby="documentos-versoes" className="prisma-m2b-section prisma-person-documents-section">
        <div className="prisma-section-heading">
          <div><Typography.Title id="documentos-versoes" level={3}>Documentos e versões</Typography.Title><Typography.Text type="secondary">Versão documental e versão de perfil são registradas separadamente.</Typography.Text></div>
        </div>
        <PrismaCard>
          <Table
            columns={workspaceDocumentColumns({
              onOpen: (document) => onNavigate(documentViewerPath(personId, document)),
              onReview: (document) => void handleStartReview(document),
            })}
            dataSource={workspace.documents}
            locale={{ emptyText: "Nenhuma fonte documental registrada." }}
            pagination={false}
            rowKey="id"
            scroll={{ x: 980 }}
          />
        </PrismaCard>
      </section>

      <section aria-labelledby="entrada-dados" className="prisma-m2b-section">
        <div className="prisma-section-heading">
          <div><Typography.Title id="entrada-dados" level={3}>Nova importação</Typography.Title><Typography.Text type="secondary">Adicione uma nova fonte sem substituir o perfil atual antes da revisão e aprovação.</Typography.Text></div>
        </div>
        <PrismaCard>
          <Tabs
            items={[
              {
                key: "manual",
                label: "Texto manual",
                children: (
                  <div className="prisma-manual-input">
                    <Alert message="O texto será preservado como fonte documental desta Pessoa e nunca será interpretado como instrução ao sistema." showIcon type="info" />
                    <Input.TextArea
                      aria-label="Texto profissional manual"
                      onChange={(event) => setManualText(event.target.value)}
                      placeholder="Cole aqui experiências, formação, competências e demais informações profissionais..."
                      rows={12}
                      value={manualText}
                    />
                    <Space className="prisma-ingestion-actions">
                      <Button disabled={busy || !manualText} icon={<DeleteOutlined />} onClick={() => setManualText("")}>Limpar</Button>
                      <Button disabled={busy || manualText.trim().length < 120} loading={busy} onClick={() => void handleManualProcessing()} type="primary">Processar texto</Button>
                    </Space>
                  </div>
                ),
              },
              {
                key: "upload",
                label: "Upload de currículo",
                children: (
                  <div className="prisma-upload-panel">
                    <Upload.Dragger
                      accept="application/pdf,.pdf"
                      beforeUpload={() => false}
                      fileList={fileList}
                      maxCount={1}
                      onChange={({ fileList: next }) => setFileList(next.slice(-1))}
                      onRemove={() => { setFileList([]); return true; }}
                    >
                      <p className="ant-upload-drag-icon"><CloudUploadOutlined /></p>
                      <p className="ant-upload-text">Arraste e solte o arquivo aqui</p>
                      <p className="ant-upload-hint">ou clique para selecionar · Apenas PDF · Tamanho máximo: 15 MB</p>
                    </Upload.Dragger>
                    {fileList[0] ? (
                      <div className="prisma-selected-file">
                        <FilePdfOutlined />
                        <div><strong>{fileList[0].name}</strong><span>{formatBytes(fileList[0].size ?? 0)}</span></div>
                        <Tag color="green">Pronto para validar</Tag>
                      </div>
                    ) : null}
                    {progress ? <Alert message={progress.message} showIcon type="info" /> : null}
                    <Button disabled={busy || fileList.length === 0} loading={busy} onClick={() => void handlePdfProcessing()} type="primary">Processar</Button>
                  </div>
                ),
              },
            ]}
          />
        </PrismaCard>
      </section>

      <section aria-labelledby="processamento" className="prisma-m2b-section">
        <div className="prisma-section-heading"><Typography.Title id="processamento" level={3}>Processamento do documento</Typography.Title>{attempt ? <ProcessingTag state={attempt.state} /> : null}</div>
        <PrismaCard>
          {attempt && workspace.selectedDocument ? (
            <>
              <Steps className="prisma-processing-steps" current={stepIndex(attempt.state)} items={processingSteps(attempt.state, attempt.pagesOcr)} responsive />
              <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} size="small" title="Detalhes do processamento">
                <Descriptions.Item label="Arquivo">{workspace.selectedDocument.filename}</Descriptions.Item>
                <Descriptions.Item label="Tamanho">{formatBytes(workspace.selectedDocument.byteSize ?? 0)}</Descriptions.Item>
                <Descriptions.Item label="Páginas">{workspace.selectedDocument.pageCount ?? "Aguardando"}</Descriptions.Item>
                <Descriptions.Item label="Método atual">{attempt.currentMethod}</Descriptions.Item>
                <Descriptions.Item label="Tentativa">v{attempt.attemptNumber}</Descriptions.Item>
                <Descriptions.Item label="Caracteres úteis">{attempt.usefulCharacterCount}</Descriptions.Item>
              </Descriptions>
              {isProcessing(attempt.state) ? <div className="prisma-processing-active"><Spin size="small" /><span>Processamento em andamento</span></div> : null}
              {attempt.failureMessage ? <Alert description="A fonte e as tentativas anteriores foram preservadas. Nenhum perfil inválido foi gerado." message={attempt.failureMessage} showIcon type="error" /> : null}
            </>
          ) : <Empty description="Nenhuma fonte foi processada para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </PrismaCard>
      </section>

      <section aria-labelledby="resultado" className="prisma-m2b-section prisma-extraction-section">
        <div className="prisma-section-heading">
          <Typography.Title id="resultado" level={3}>Resultado da extração e Perfil Prisma em construção</Typography.Title>
          <Space wrap>
            {selectedDocument ? <Button onClick={() => onNavigate(`/profiles/${personId}/documents/${selectedDocument.id}`)}>Detalhes do documento</Button> : null}
            {attempt ? <Button disabled={busy} icon={<ReloadOutlined />} loading={busy} onClick={() => void handleReprocess()}>Reprocessar</Button> : null}
          </Space>
        </div>
        <PrismaCard>
          <Tabs items={[
            {
              key: "text",
              label: "Texto extraído",
              children: workspace.pages.length > 0 ? (
                <div className="prisma-extracted-layout">
                  <div className="prisma-page-rail" role="navigation" aria-label="Páginas extraídas">
                    {workspace.pages.map((page) => <Button block key={page.pageNumber} onClick={() => setSelectedPage(page.pageNumber)} type={page.pageNumber === selectedPage ? "primary" : "text"}>Página {page.pageNumber}</Button>)}
                  </div>
                  <div className="prisma-page-text">
                    <Space><Tag color={currentPage?.origin === "ocr" ? "gold" : "blue"}>{currentPage?.origin === "ocr" ? "Texto via OCR" : currentPage?.origin === "manual_text" ? "Fonte manual" : "Texto nativo"}</Tag><Typography.Text type="secondary">{currentPage?.methodVersion}</Typography.Text></Space>
                    <pre>{currentPage?.text}</pre>
                  </div>
                </div>
              ) : <Empty description="O texto aparecerá após um processamento válido." image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            },
            {
              key: "structured",
              label: "Dados estruturados",
              children: workspace.draft ? <StructuredDraftView draft={workspace.draft} /> : <Empty description="Nenhum Extraction Draft disponível." image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            },
            {
              key: "evidence",
              label: "Evidências",
              children: workspace.draft ? (
                <List dataSource={[...workspace.draft.experiences, ...workspace.draft.education]} renderItem={(item) => <List.Item><SafetyCertificateOutlined /><div><strong>{"role" in item ? item.role : item.course}</strong><p>{item.evidenceText}</p><Tag>Página {item.page}</Tag></div></List.Item>} />
              ) : <Empty description="Nenhuma evidência criada." image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            },
            {
              key: "technical",
              label: "Detalhes técnicos",
              children: attempt && workspace.selectedDocument ? <TechnicalDetails document={workspace.selectedDocument} /> : <Empty description="Sem detalhes técnicos." />,
            },
          ]} />
        </PrismaCard>
      </section>

    </PrismaPage>
  );
}

function StructuredDraftView({ draft }: { draft: NonNullable<PersonIngestionWorkspace["draft"]> }) {
  return (
    <div className="prisma-structured-layout">
      <div>
        <Typography.Title level={4}>Resumo profissional</Typography.Title>
        <Typography.Paragraph>{draft.summary ?? "Resumo não identificado de forma segura."}</Typography.Paragraph>
        <Typography.Title level={4}>Experiências ({draft.experiences.length})</Typography.Title>
        <List dataSource={draft.experiences} locale={{ emptyText: "Nenhuma experiência estruturável identificada." }} renderItem={(item) => <List.Item className="prisma-structured-item"><div><strong>{item.role}</strong><p>{item.organization}{item.period ? ` · ${item.period}` : ""}</p><Tag color="blue">Evidência na página {item.page}</Tag></div></List.Item>} />
        <Typography.Title level={4}>Formação acadêmica ({draft.education.length})</Typography.Title>
        <List dataSource={draft.education} locale={{ emptyText: "Formação não identificada." }} renderItem={(item) => <List.Item>{item.course}</List.Item>} />
        {draft.customSections.map((section) => <div key={section.id}><Typography.Title level={4}>{section.name}</Typography.Title><List dataSource={section.items} renderItem={(item) => <List.Item>{item.value}</List.Item>} /></div>)}
      </div>
      <PrismaCard className="prisma-coverage-card">
        <Typography.Title level={4}>Cobertura dos dados</Typography.Title>
        <Coverage label="Experiências" complete={draft.experiences.length > 0} />
        <Coverage label="Formação" complete={draft.education.length > 0} />
        <Coverage label="Competências" complete={draft.competencies.length > 0} />
        <Coverage label="Idiomas" complete={draft.languages.length > 0} />
        <Typography.Text type="secondary">Sem score global arbitrário. Cada indicador possui regra binária e explicável.</Typography.Text>
        {draft.notIdentified.length > 0 ? <Alert message="Campos não identificados" description={draft.notIdentified.join(", ")} showIcon type="warning" /> : null}
      </PrismaCard>
    </div>
  );
}

function Coverage({ label, complete }: { label: string; complete: boolean }) {
  return <div className="prisma-coverage-row"><span>{label}</span><Tag color={complete ? "green" : "default"}>{complete ? "Identificado" : "Não identificado"}</Tag></div>;
}

function TechnicalDetails({ document }: { document: PersonDocumentTimelineItem }) {
  const attempt = document.latestAttempt!;
  return <Descriptions bordered column={1} size="small"><Descriptions.Item label="Document ID">{document.id}</Descriptions.Item><Descriptions.Item label="Processing attempt">{attempt.id} · v{attempt.attemptNumber}</Descriptions.Item><Descriptions.Item label="Extração">{attempt.pagesNative} página(s) nativas</Descriptions.Item><Descriptions.Item label="OCR">{attempt.pagesOcr > 0 ? `${attempt.pagesOcr} página(s) via OCR local` : "Não necessário"}</Descriptions.Item><Descriptions.Item label="Estado">{attempt.state}</Descriptions.Item></Descriptions>;
}

function ProcessingTag({ state }: { state: ProcessingState }) {
  if (state.startsWith("failed")) return <Tag color="red">Erro no processamento</Tag>;
  if (["structured", "profile_ready", "completed"].includes(state)) return <Tag color="green">Processamento concluído</Tag>;
  if (state === "ocr_required" || state === "ocr_processing") return <Tag color="gold">OCR necessário</Tag>;
  return <Tag color="blue">Processando</Tag>;
}

function processingSteps(state: ProcessingState, pagesOcr: number) {
  const failed = state.startsWith("failed");
  return [
    { title: "Arquivo recebido", status: "finish" as const },
    { title: "Extração de texto", status: failed && state === "failed_extraction" ? "error" as const : stepIndex(state) > 1 ? "finish" as const : "process" as const },
    { title: "OCR", content: pagesOcr > 0 ? `${pagesOcr} página(s)` : "Não necessário", status: pagesOcr > 0 ? (stepIndex(state) > 2 ? "finish" as const : "process" as const) : "wait" as const },
    { title: "Análise e estruturação", status: failed && state === "failed_structuring" ? "error" as const : stepIndex(state) > 3 ? "finish" as const : "process" as const },
    { title: "Conclusão", status: state === "completed" ? "finish" as const : "wait" as const },
  ];
}

function stepIndex(state: ProcessingState): number {
  if (state === "uploaded" || state === "validated") return 1;
  if (state === "extracting_native" || state === "native_extracted") return 2;
  if (state === "ocr_required" || state === "ocr_processing") return 2;
  if (state === "extracted" || state === "structuring") return 3;
  if (state === "structured" || state === "profile_ready") return 4;
  if (state === "completed") return 5;
  return 1;
}

function isProcessing(state: ProcessingState): boolean {
  return !state.startsWith("failed") && !["structured", "profile_ready", "completed"].includes(state);
}

function SummaryMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return <div className={`prisma-person-summary-metric prisma-person-summary-metric--${tone}`}><span>{icon}</span><Statistic title={label} value={value} /></div>;
}

function recentHistory(workspace: PersonIngestionWorkspace) {
  const profileItem = workspace.person.currentProfile ? [{
    color: "green",
    children: <HistoryItem date={workspace.person.currentProfile.approvedAt ?? workspace.person.currentProfile.createdAt} description="Perfil disponível no Prisma" title={`Perfil v${workspace.person.currentProfile.profileVersion} aprovado`} />,
  }] : [];
  const documentItems = workspace.documents.slice(0, 3).map((document) => {
    const presentation = presentDocument(document);
    return {
      color: presentation.tone === "danger" ? "red" : presentation.tone === "review" ? "gold" : presentation.tone === "success" ? "green" : "blue",
      children: <HistoryItem date={document.processedAt ?? document.createdAt} description={`${document.filename} · ${presentation.description}`} title={`Documento v${document.documentVersion} · ${presentation.label}`} />,
    };
  });
  return [...profileItem, ...documentItems]
    .sort((left, right) => historyItemDate(right.children).localeCompare(historyItemDate(left.children)))
    .slice(0, 4);
}

function HistoryItem({ date, title, description }: { date: string; title: string; description: string }) {
  return <div className="prisma-person-history-item" data-date={date}><small>{formatDate(date)}</small><strong>{title}</strong><span>{description}</span></div>;
}

function historyItemDate(node: React.ReactNode): string {
  if (!node || typeof node !== "object" || !("props" in node)) return "";
  return String((node as React.ReactElement<{ date?: string }>).props.date ?? "");
}

function workspaceDocumentColumns({ onOpen, onReview }: {
  onOpen: (document: PersonDocumentTimelineItem) => void;
  onReview: (document: PersonDocumentTimelineItem) => void;
}): ColumnsType<PersonDocumentTimelineItem> {
  return [
    {
      title: "Documento",
      dataIndex: "filename",
      key: "filename",
      width: 300,
      render: (value, document) => <div className="prisma-person-document-name"><FilePdfOutlined /><div><strong>{value}</strong><small>Importado em {formatDate(document.createdAt)}</small></div></div>,
    },
    { title: "Versão documental", dataIndex: "documentVersion", key: "version", width: 160, render: (value) => <strong>Documento v{value}</strong> },
    {
      title: "Estado",
      key: "status",
      width: 180,
      render: (_, document) => {
        const presentation = presentDocument(document);
        return <Tag color={presentation.tone === "danger" ? "red" : presentation.tone === "review" ? "gold" : presentation.tone === "success" ? "green" : "blue"}>{presentation.label}</Tag>;
      },
    },
    {
      title: "Resultado no perfil",
      key: "profileVersion",
      width: 250,
      render: (_, document) => <div className="prisma-person-document-result"><strong>{document.profileVersion ? `Perfil v${document.profileVersion} aprovado` : "Nenhuma nova versão criada"}</strong><small>{document.profileVersion ? "Versão aprovada e rastreável" : "O perfil atual permanece preservado"}</small></div>,
    },
    {
      title: "Ação",
      key: "actions",
      width: 150,
      render: (_, document) => isReviewableDocument(document)
        ? <Button onClick={() => onReview(document)} type="primary" ghost>Abrir revisão</Button>
        : <Button icon={<EyeOutlined />} onClick={() => onOpen(document)}>{document.verificationReviewId ? "Ver documento" : "Detalhes técnicos"}</Button>,
    },
  ];
}

function documentViewerPath(personId: string, document: PersonDocumentTimelineItem): string {
  return document.verificationReviewId
    ? `/profiles/${personId}/documents/${document.id}/verification/${document.verificationReviewId}`
    : `/profiles/${personId}/documents/${document.id}`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
