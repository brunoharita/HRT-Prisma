import { useEffect, useState } from "react";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
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
  Skeleton,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
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
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { ProfileStateTag } from "./PeoplePage";

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

  async function handleStartReview() {
    if (!workspace?.selectedDocument?.latestAttempt) return;
    setBusy(true);
    setError(null);
    try {
      const reviewId = await personIngestionService.startProfileReview(
        activeMembership.organizationId,
        personId,
        workspace.selectedDocument.id,
        workspace.selectedDocument.latestAttempt.id,
      );
      onNavigate(`/profiles/${personId}/documents/${workspace.selectedDocument.id}/review/${reviewId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A revisão humana não pôde ser iniciada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReprocess() {
    if (!workspace?.selectedDocument) return;
    setBusy(true);
    setError(null);
    try {
      await personIngestionService.reprocessDocument(activeMembership.organizationId, personId, workspace.selectedDocument.id);
      await refresh(workspace.selectedDocument.id);
      setSuccess("Nova tentativa técnica criada sem apagar a extração ou o perfil anterior.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reprocessar o documento.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 14 }} /></PrismaPage>;
  if (!workspace) return <PrismaPage><Alert message={error ?? "Pessoa não encontrada."} showIcon type="error" /></PrismaPage>;
  const currentPage = workspace.pages.find((page) => page.pageNumber === selectedPage) ?? workspace.pages[0];
  const selectedDocument = workspace.selectedDocument;
  const attempt = selectedDocument?.latestAttempt;
  const canReview = attempt?.state === "structured" && Boolean(workspace.draft?.experiences.length);

  return (
    <PrismaPage className="prisma-m2b-page prisma-person-workspace">
      <PrismaPageHeader
        title={workspace.person.fullName}
        description={`Pessoa ${workspace.person.id.slice(0, 8)} · ${activeMembership.organizationName}`}
        actions={(
          <Space wrap>
            <Button onClick={() => onNavigate("/profiles/processes")}>Processamento e revisões</Button>
            <Button onClick={() => onNavigate(`/profiles/${personId}/versions`)}>Comparar versões</Button>
            <Button icon={<EditOutlined />} onClick={() => onNavigate(`/profiles/${personId}/edit`)}>Editar dados</Button>
            <Button disabled={!canReview} loading={busy} onClick={() => void handleStartReview()} type="primary">Iniciar revisão</Button>
          </Space>
        )}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable message={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}

      <section aria-labelledby="entrada-dados" className="prisma-m2b-section">
        <div className="prisma-section-heading">
          <div><Typography.Title id="entrada-dados" level={3}>Entrada de dados</Typography.Title><Typography.Text type="secondary">Texto e PDF são fontes independentes e rastreáveis.</Typography.Text></div>
          <ProfileStateTag state={workspace.person.profileState} />
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

      <section aria-labelledby="historico" className="prisma-m2b-section">
        <Typography.Title id="historico" level={3}>Linha do tempo de documentos e versões</Typography.Title>
        <PrismaCard>
          <Table
            columns={timelineColumns((documentId) => { setSelectedDocumentId(documentId); void refresh(documentId); })}
            dataSource={workspace.documents}
            locale={{ emptyText: "Nenhuma fonte documental registrada." }}
            pagination={false}
            rowKey="id"
            scroll={{ x: 980 }}
          />
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

function timelineColumns(onSelect: (id: string) => void): ColumnsType<PersonDocumentTimelineItem> {
  return [
    { title: "Documento", dataIndex: "filename", key: "filename" },
    { title: "Tipo", key: "sourceType", render: (_, item) => item.isLegacyUnstored ? "Importação legada" : item.sourceType === "resume_pdf" ? "Currículo" : "Texto manual" },
    { title: "Versão", dataIndex: "documentVersion", key: "version", render: (value) => `v${value}` },
    { title: "Origem", key: "origin", render: (_, item) => item.isLegacyUnstored ? "Base anterior ao M2-B" : item.sourceType === "resume_pdf" ? "Upload" : "Entrada manual" },
    { title: "Processamento", dataIndex: "createdAt", key: "createdAt", render: formatDate },
    { title: "Páginas", dataIndex: "pageCount", key: "pages" },
    { title: "Status", key: "status", render: (_, item) => item.latestAttempt ? <ProcessingTag state={item.latestAttempt.state} /> : <Tag>Pendente</Tag> },
    { title: "Perfil gerado", dataIndex: "profileVersion", key: "profileVersion", render: (value) => value ? `v${value}` : "Não" },
    { title: "Ações", key: "actions", render: (_, item) => <Button onClick={() => onSelect(item.id)} type="link">Visualizar</Button> },
  ];
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
