import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  IdcardOutlined,
  ImportOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
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
  type ProfileVersionView,
  type ProcessingState,
  type StructuredEducation,
  type StructuredExperience,
} from "../domain/personIngestion";
import { isReviewableDocument, presentDocument } from "../domain/documentPresentation";
import {
  EDUCATION_LEVEL_LABELS,
  EDUCATION_ORIGIN_LABELS,
  EDUCATION_QUALIFICATION_LABELS,
  EDUCATION_STATUS_LABELS,
  educationClassificationNeedsReview,
  resolveEducationClassification,
} from "../../../src/domain/educationClassification";
import {
  buildPersonCenterViewModel,
  type PersonActionKind,
  type PersonCenterViewModel,
  type PersonPendingAction,
} from "../domain/personActionCenter";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage } from "../ui/PrismaPage";
import { PrismaStatusTag } from "../ui/PrismaStatusTag";

interface PersonWorkspacePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  onNavigate: (path: string) => void;
}

const competencyClassificationGuide = [
  {
    key: "explicit",
    label: "Explícita",
    description: "Identificada diretamente em um currículo ou em outra fonte aprovada.",
  },
  {
    key: "inferred",
    label: "Inferida",
    description: "Derivada de sinais relacionados, com justificativa e evidências rastreáveis.",
  },
  {
    key: "demonstrated",
    label: "Demonstrada",
    description: "Comprovada por uma verificação concluída, com método e resultado preservados.",
  },
] as const;

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
  const [currentProfileVersion, setCurrentProfileVersion] = useState<ProfileVersionView | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "documents" | "ingestion">("overview");

  async function refresh(documentId = selectedDocumentId) {
    const [result, versions] = await Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, personId, documentId),
      personIngestionService.listProfileVersions(activeMembership.organizationId, personId),
    ]);
    if (!result) throw new Error("Pessoa não encontrada nesta empresa.");
    setWorkspace(result);
    setCurrentProfileVersion(versions.find((version) => version.supersededAt === null) ?? null);
    setSelectedDocumentId(result.selectedDocument?.id);
    setSelectedPage(result.pages[0]?.pageNumber ?? 1);
  }

  useEffect(() => {
    let current = true;
    setLoading(true);
    void Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, personId),
      personIngestionService.listProfileVersions(activeMembership.organizationId, personId),
    ])
      .then(([result, versions]) => {
        if (!current) return;
        setWorkspace(result);
        setCurrentProfileVersion(versions.find((version) => version.supersededAt === null) ?? null);
        const publicationMessage = window.sessionStorage.getItem(`prisma.profile-published.${personId}`);
        if (publicationMessage) {
          window.sessionStorage.removeItem(`prisma.profile-published.${personId}`);
          setSuccess(publicationMessage);
        }
      })
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
    if (!document?.reviewAttempt) return;
    setBusy(true);
    setError(null);
    try {
      const reviewId = await personIngestionService.startProfileReview(
        activeMembership.organizationId,
        personId,
        document.id,
        document.reviewAttempt.id,
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
        if (!document.reviewAttempt) throw new Error("A importação não possui tentativa revisável.");
        await personIngestionService.startProfileReview(
          activeMembership.organizationId,
          personId,
          document.id,
          document.reviewAttempt.id,
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

  const viewModel = useMemo(
    () => workspace ? buildPersonCenterViewModel(workspace, currentProfileVersion) : null,
    [currentProfileVersion, workspace],
  );

  if (loading) return <PrismaPage className="prisma-person-center"><PersonCenterSkeleton /></PrismaPage>;
  if (!workspace || !viewModel) return <PrismaPage><Alert description="O Perfil vigente, quando existente, permanece seguro. Tente carregar a Central novamente." message={error ?? "Não foi possível carregar esta Pessoa."} showIcon type="error" /></PrismaPage>;

  const currentPage = workspace.pages.find((page) => page.pageNumber === selectedPage) ?? workspace.pages[0];
  const selectedDocument = workspace.selectedDocument;
  const attempt = selectedDocument?.latestAttempt;

  function runDocumentAction(kind: PersonActionKind, document: PersonDocumentTimelineItem) {
    if (kind === "review") void handleStartReview(document);
    if (kind === "reprocess") void handleReprocess(document);
    if (kind === "open_document" || kind === "open_details") onNavigate(documentViewerPath(personId, document));
  }

  function selectDocument(document: PersonDocumentTimelineItem) {
    setSelectedDocumentId(document.id);
    void refresh(document.id).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar o documento selecionado."));
  }

  const viewItems = [
    {
      key: "overview",
      label: <span><IdcardOutlined /> Visão geral</span>,
      children: <PersonOverview
        busy={busy}
        model={viewModel}
        onAction={runDocumentAction}
        onDiscard={(document) => void handleDiscard(document)}
        onOpenDocuments={() => setActiveView("documents")}
        onOpenProfile={() => onNavigate(`/profiles/${personId}/versions`)}
      />,
    },
    {
      key: "documents",
      label: <span><FolderOpenOutlined /> Documentos e versões</span>,
      children: <PersonDocumentsView
        busy={busy}
        model={viewModel}
        onAction={runDocumentAction}
        onDiscard={(document) => void handleDiscard(document)}
        onSelect={selectDocument}
        selectedDocument={selectedDocument}
        selectedDraft={workspace.draft}
      />,
    },
    {
      key: "ingestion",
      label: <span><ImportOutlined /> Nova importação</span>,
      children: (
        <div className="prisma-person-ingestion-view">
          <section aria-labelledby="entrada-dados" className="prisma-m2b-section">
            <div className="prisma-section-heading"><div><Typography.Title id="entrada-dados" level={3}>Nova importação</Typography.Title><Typography.Text type="secondary">Adicione uma nova fonte sem substituir o Perfil vigente antes da revisão e publicação.</Typography.Text></div></div>
            <PrismaCard>
              <Tabs items={[
                { key: "manual", label: "Texto manual", children: <div className="prisma-manual-input"><Alert message="O texto será preservado como fonte documental desta Pessoa e nunca será interpretado como instrução ao sistema." showIcon type="info" /><Input.TextArea aria-label="Texto profissional manual" onChange={(event) => setManualText(event.target.value)} placeholder="Cole aqui experiências, formação, competências e demais informações profissionais..." rows={12} value={manualText} /><Space className="prisma-ingestion-actions"><Button disabled={busy || !manualText} icon={<DeleteOutlined />} onClick={() => setManualText("")}>Limpar</Button><Button disabled={busy || manualText.trim().length < 120} loading={busy} onClick={() => void handleManualProcessing()} type="primary">Processar texto</Button></Space></div> },
                { key: "upload", label: "Upload de currículo", children: <div className="prisma-upload-panel"><Upload.Dragger accept="application/pdf,.pdf" beforeUpload={() => false} fileList={fileList} maxCount={1} onChange={({ fileList: next }) => setFileList(next.slice(-1))} onRemove={() => { setFileList([]); return true; }}><p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p className="ant-upload-text">Arraste e solte o arquivo aqui</p><p className="ant-upload-hint">ou clique para selecionar · Apenas PDF · Tamanho máximo: 15 MB</p></Upload.Dragger>{fileList[0] ? <div className="prisma-selected-file"><FilePdfOutlined /><div><strong>{fileList[0].name}</strong><span>{formatBytes(fileList[0].size ?? 0)}</span></div><Tag color="green">Pronto para validar</Tag></div> : null}{progress ? <Alert message={progress.message} showIcon type="info" /> : null}<Button disabled={busy || fileList.length === 0} loading={busy} onClick={() => void handlePdfProcessing()} type="primary">Processar</Button></div> },
              ]} />
            </PrismaCard>
          </section>
          <section aria-labelledby="processamento" className="prisma-m2b-section">
            <div className="prisma-section-heading"><Typography.Title id="processamento" level={3}>Processamento do documento</Typography.Title>{attempt ? <ProcessingTag state={attempt.state} /> : null}</div>
            <PrismaCard>{attempt && selectedDocument ? <><Steps className="prisma-processing-steps" current={stepIndex(attempt.state)} items={processingSteps(attempt.state, attempt.pagesOcr)} responsive /><Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} size="small" title="Detalhes do processamento"><Descriptions.Item label="Arquivo">{selectedDocument.filename}</Descriptions.Item><Descriptions.Item label="Tamanho">{formatBytes(selectedDocument.byteSize ?? 0)}</Descriptions.Item><Descriptions.Item label="Páginas">{selectedDocument.pageCount ?? "Aguardando"}</Descriptions.Item><Descriptions.Item label="Método atual">{attempt.currentMethod}</Descriptions.Item><Descriptions.Item label="Caracteres úteis">{attempt.usefulCharacterCount}</Descriptions.Item></Descriptions>{isProcessing(attempt.state) ? <div className="prisma-processing-active"><Spin size="small" /><span>Processamento em andamento</span></div> : null}{attempt.failureMessage ? <Alert description="A fonte, as tentativas e o Perfil vigente permanecem preservados." message={attempt.failureMessage} showIcon type="error" /> : null}</> : <Empty description="Nenhuma fonte foi processada para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</PrismaCard>
          </section>
          <section aria-labelledby="resultado" className="prisma-m2b-section prisma-extraction-section">
            <div className="prisma-section-heading"><Typography.Title id="resultado" level={3}>Resultado da extração</Typography.Title>{selectedDocument ? <Button onClick={() => onNavigate(`/profiles/${personId}/documents/${selectedDocument.id}`)}>Detalhes técnicos</Button> : null}</div>
            <PrismaCard><Tabs items={[
              { key: "text", label: "Texto extraído", children: workspace.pages.length > 0 ? <div className="prisma-extracted-layout"><div aria-label="Páginas extraídas" className="prisma-page-rail" role="navigation">{workspace.pages.map((page) => <Button block key={page.pageNumber} onClick={() => setSelectedPage(page.pageNumber)} type={page.pageNumber === selectedPage ? "primary" : "text"}>Página {page.pageNumber}</Button>)}</div><div className="prisma-page-text"><Space><Tag color={currentPage?.origin === "ocr" ? "gold" : "blue"}>{currentPage?.origin === "ocr" ? "Texto via OCR" : currentPage?.origin === "manual_text" ? "Fonte manual" : "Texto nativo"}</Tag><Typography.Text type="secondary">{currentPage?.methodVersion}</Typography.Text></Space><pre>{currentPage?.text}</pre></div></div> : <Empty description="O texto aparecerá após um processamento válido." image={Empty.PRESENTED_IMAGE_SIMPLE} /> },
              { key: "structured", label: "Dados estruturados", children: workspace.draft ? <StructuredDraftView draft={workspace.draft} /> : <Empty description="Nenhum dado estruturado disponível." image={Empty.PRESENTED_IMAGE_SIMPLE} /> },
              { key: "evidence", label: "Evidências", children: workspace.draft ? <List dataSource={[...workspace.draft.experiences, ...workspace.draft.education]} renderItem={(item) => <List.Item><SafetyCertificateOutlined /><div><strong>{"role" in item ? item.role : item.course}</strong><p>{item.evidenceText}</p><Tag>Página {item.page}</Tag></div></List.Item>} /> : <Empty description="Nenhuma evidência criada." image={Empty.PRESENTED_IMAGE_SIMPLE} /> },
              { key: "technical", label: "Detalhes técnicos", children: attempt && selectedDocument ? <TechnicalDetails document={selectedDocument} /> : <Empty description="Sem detalhes técnicos." /> },
            ]} /></PrismaCard>
          </section>
        </div>
      ),
    },
  ];

  return (
    <PrismaPage className="prisma-m2b-page prisma-person-workspace prisma-person-center">
      <PersonCenterHeader
        model={viewModel}
        onBack={() => onNavigate("/profiles")}
        onEdit={() => onNavigate(`/profiles/${personId}/edit`)}
        onOpenOperations={() => onNavigate("/profiles/processes")}
      />
      {error ? <Alert closable description="O Perfil vigente permanece preservado." message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable message={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}
      <Tabs activeKey={activeView} className="prisma-person-center-navigation" items={viewItems} onChange={(key) => setActiveView(key as typeof activeView)} />
    </PrismaPage>
  );
}

function PersonCenterSkeleton() {
  return <div className="prisma-person-center-skeleton"><Skeleton active avatar paragraph={{ rows: 3 }} /><div className="prisma-person-center-skeleton__grid"><Skeleton active paragraph={{ rows: 5 }} /><Skeleton active paragraph={{ rows: 5 }} /></div><Skeleton active paragraph={{ rows: 10 }} /></div>;
}

function PersonCenterHeader({ model, onBack, onEdit, onOpenOperations }: {
  model: PersonCenterViewModel;
  onBack: () => void;
  onEdit: () => void;
  onOpenOperations: () => void;
}) {
  return (
    <header className="prisma-person-center-header">
      <Button className="prisma-person-center-header__back" icon={<ArrowLeftOutlined />} onClick={onBack} type="text">Voltar para Pessoas</Button>
      <div className="prisma-person-center-header__main">
        <div className="prisma-person-center-header__identity">
          <Typography.Title level={1}>{model.identity.fullName}</Typography.Title>
          {model.identity.professionalTitle ? <Typography.Paragraph className="prisma-person-center-header__title">{model.identity.professionalTitle}</Typography.Paragraph> : null}
          <div className="prisma-person-center-header__metadata">
            {model.identity.location ? <span><EnvironmentOutlined /> {model.identity.location}</span> : null}
            <span><CalendarOutlined /> Atualizado em {formatDate(model.identity.updatedAt)}</span>
            <span><FileTextOutlined /> {model.identity.documentCount} {model.identity.documentCount === 1 ? "documento" : "documentos"}</span>
          </div>
        </div>
        <Space className="prisma-person-center-header__actions" wrap>
          <Button icon={<SafetyCertificateOutlined />} onClick={onOpenOperations}>Processamento e revisões</Button>
          <Button icon={<EditOutlined />} onClick={onEdit}>Editar dados</Button>
        </Space>
      </div>
    </header>
  );
}

function PersonOverview({ model, busy, onAction, onDiscard, onOpenDocuments, onOpenProfile }: {
  model: PersonCenterViewModel;
  busy: boolean;
  onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void;
  onDiscard: (document: PersonDocumentTimelineItem) => void;
  onOpenDocuments: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <div className="prisma-person-overview">
      <div className="prisma-person-action-layout">
        <PersonActionCenter actions={model.pendingActions} busy={busy} onAction={onAction} onDiscard={onDiscard} />
        <CurrentProfileCard currentProfile={model.currentProfile} onOpen={onOpenProfile} />
      </div>
      <PersonSummary model={model} />
      <ProfessionalKnowledge model={model} />
      <div className="prisma-person-context-grid">
        <RecentDocuments model={model} onAction={onAction} onOpenAll={onOpenDocuments} />
        <RecentActivity model={model} />
      </div>
    </div>
  );
}

function PersonActionCenter({ actions, busy, onAction, onDiscard }: {
  actions: PersonPendingAction[];
  busy: boolean;
  onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void;
  onDiscard: (document: PersonDocumentTimelineItem) => void;
}) {
  if (actions.length === 0) {
    return <div className="prisma-person-action-center prisma-person-action-center--clear"><CheckCircleOutlined /><div><strong>Nenhuma pendência ativa</strong><span>O conhecimento publicado permanece disponível e não exige ação neste momento.</span></div></div>;
  }
  return (
    <section aria-labelledby="person-pending-actions" className="prisma-person-action-center">
      <div className="prisma-person-section-label prisma-person-section-label--warning"><ExclamationCircleFilled /><div><span>Atenção necessária</span><Typography.Title id="person-pending-actions" level={2}>{actions.length} {actions.length === 1 ? "pendência requer" : "pendências requerem"} sua atenção</Typography.Title></div></div>
      <div className={`prisma-person-action-cards${actions.length > 1 ? " prisma-person-action-cards--multiple" : ""}`}>
        {actions.map((action) => <PendingActionCard action={action} busy={busy} key={action.id} onAction={onAction} onDiscard={onDiscard} />)}
      </div>
    </section>
  );
}

function PendingActionCard({ action, busy, onAction, onDiscard }: {
  action: PersonPendingAction;
  busy: boolean;
  onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void;
  onDiscard: (document: PersonDocumentTimelineItem) => void;
}) {
  return (
    <article className={`prisma-person-action-card prisma-person-action-card--${action.tone}`}>
      <div className="prisma-person-action-card__icon">{action.tone === "danger" ? <ExclamationCircleFilled /> : <FileDoneOutlined />}</div>
      <div className="prisma-person-action-card__content">
        <div className="prisma-person-action-card__heading"><div><Typography.Title level={3}>{action.title}</Typography.Title><strong>{action.document.filename}</strong></div><PrismaStatusTag compact label={presentDocument(action.document).label} tone={action.tone} /></div>
        <span className="prisma-person-action-card__date">Importado em {formatDate(action.document.createdAt)}</span>
        <Typography.Paragraph>{action.description}</Typography.Paragraph>
        <div className="prisma-person-action-card__actions">
          {action.primaryAction?.available ? <Button icon={<ArrowRightOutlined />} loading={busy} onClick={() => onAction(action.primaryAction!.kind, action.document)} type="primary">{action.primaryAction.label}</Button> : null}
          <Space wrap>
            {action.secondaryActions.filter((item) => item.kind !== "discard").map((item) => <Button icon={<EyeOutlined />} key={item.kind} onClick={() => onAction(item.kind, action.document)}>{item.label}</Button>)}
            <Popconfirm cancelText="Manter pendência" description="Documento, tentativas, revisão, histórico e Perfil vigente serão preservados." okText="Arquivar importação" onConfirm={() => onDiscard(action.document)} title="Descartar esta importação do fluxo ativo?"><Button danger disabled={busy} icon={<DeleteOutlined />}>Descartar</Button></Popconfirm>
          </Space>
        </div>
      </div>
    </article>
  );
}

function CurrentProfileCard({ currentProfile, onOpen }: { currentProfile: PersonCenterViewModel["currentProfile"]; onOpen: () => void }) {
  if (!currentProfile) {
    return <section className="prisma-person-current-profile prisma-person-current-profile--empty"><div className="prisma-person-section-label"><FileTextOutlined /><div><span>Perfil profissional</span><Typography.Title level={2}>Ainda não existe Perfil publicado</Typography.Title></div></div><Typography.Paragraph>As fontes podem ser processadas e revisadas sem fabricar uma versão de Perfil.</Typography.Paragraph></section>;
  }
  return (
    <section className="prisma-person-current-profile">
      <div className="prisma-person-section-label prisma-person-section-label--success"><CheckCircleOutlined /><div><span>Perfil vigente</span><Typography.Title level={2}>v{currentProfile.version} publicado</Typography.Title></div></div>
      <Typography.Paragraph>Este é o conhecimento profissional atualmente publicado. Ele permanece vigente enquanto novas importações estão em análise ou revisão.</Typography.Paragraph>
      <div className="prisma-person-current-profile__meta"><span>Publicado em {formatDate(currentProfile.publishedAt)}</span>{currentProfile.sourceDocumentName ? <span>Fonte: {currentProfile.sourceDocumentName}</span> : null}</div>
      <Button icon={<EyeOutlined />} onClick={onOpen}>Ver perfil atual</Button>
    </section>
  );
}

function PersonSummary({ model }: { model: PersonCenterViewModel }) {
  const documentContext = [
    model.summary.documents.published ? `${model.summary.documents.published} publicado${model.summary.documents.published === 1 ? "" : "s"}` : null,
    model.summary.documents.awaitingReview ? `${model.summary.documents.awaitingReview} aguardando revisão` : null,
    model.summary.documents.processing ? `${model.summary.documents.processing} processando` : null,
  ].filter(Boolean).join(" · ") || "Nenhuma pendência documental";
  const pendingCount = model.pendingActions.length;
  return (
    <section aria-label="Resumo executivo" className="prisma-person-summary-strip">
      <PersonStat context={documentContext} icon={<FolderOpenOutlined />} label="Documentos" tone="info" value={`${model.summary.documents.total} ${model.summary.documents.total === 1 ? "documento" : "documentos"}`} />
      <PersonStat context={pendingCount ? "Aguardando sua análise" : "Nenhuma ação necessária"} icon={<ClockCircleOutlined />} label="Pendências" tone={pendingCount ? "warning" : "success"} value={`${pendingCount} ${pendingCount === 1 ? "pendente" : "pendentes"}`} />
      <PersonStat context={model.summary.education ? `${model.summary.education} formações publicadas` : "Nenhuma formação publicada"} icon={<TeamOutlined />} label="Experiências" tone="info" value={`${model.summary.experiences} publicadas`} />
      <PersonStat context="Classificação explícita em fontes aprovadas" icon={<SafetyCertificateOutlined />} label="Competências" tone="purple" value={`${model.summary.competencies} publicadas`} />
    </section>
  );
}

function PersonStat({ context, icon, label, tone, value }: { context: string; icon: React.ReactNode; label: string; tone: string; value: string }) {
  return <article className={`prisma-person-stat prisma-person-stat--${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{context}</p></div></article>;
}

function ProfessionalKnowledge({ model }: { model: PersonCenterViewModel }) {
  const knowledge = model.professionalKnowledge;
  if (!knowledge) return <PrismaCard className="prisma-person-professional-knowledge" title="Conhecimento profissional publicado"><Empty description="Ainda não existe conhecimento profissional publicado neste Perfil." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard>;
  const complementary = [...knowledge.certifications.map((value) => ({ type: "Certificação", value })), ...knowledge.languages.map((value) => ({ type: "Idioma", value }))];
  return (
    <PrismaCard className="prisma-person-professional-knowledge" extra={<Typography.Text type="secondary">Perfil v{model.currentProfile?.version}</Typography.Text>} title="Conhecimento profissional publicado">
      {knowledge.summary ? <Typography.Paragraph className="prisma-person-professional-summary" ellipsis={{ rows: 3, expandable: true, symbol: "Ver mais" }}>{knowledge.summary}</Typography.Paragraph> : null}
      <div className="prisma-person-knowledge-editorial">
        <section className="prisma-person-experience-section"><div className="prisma-person-subsection-title"><BookOutlined /><div><Typography.Title level={3}>Experiências</Typography.Title><span>{knowledge.experiences.length} publicadas</span></div></div>{knowledge.experiences.length ? <List dataSource={knowledge.experiences.slice(0, 5)} renderItem={(item) => <PublishedExperienceItem item={item} />} /> : <Typography.Paragraph type="secondary">Nenhuma experiência profissional foi publicada neste perfil.</Typography.Paragraph>}</section>
        <div className="prisma-person-knowledge-side">
          <section><div className="prisma-person-subsection-title"><TeamOutlined /><div><Typography.Title level={3}>Formação</Typography.Title><span>{knowledge.education.length} publicadas</span></div></div>{knowledge.education.length ? <List className="prisma-person-education-list" dataSource={knowledge.education.slice(0, 5)} renderItem={(item) => <PublishedEducationItem item={item} />} /> : <Typography.Paragraph type="secondary">Nenhuma formação foi publicada neste perfil.</Typography.Paragraph>}</section>
          <section><div className="prisma-person-subsection-title"><SafetyCertificateOutlined /><div><Typography.Title level={3}>Competências</Typography.Title><span>{knowledge.competencies.length} explícitas</span></div></div>{knowledge.competencies.length ? <Space className="prisma-person-competency-tags" wrap>{knowledge.competencies.slice(0, 18).map((competency) => <Tag className="prisma-person-competency-tag prisma-person-competency-tag--explicit" color="blue" key={competency}>{competency}</Tag>)}</Space> : <Typography.Paragraph type="secondary">Nenhuma competência explícita foi identificada nos documentos aprovados.</Typography.Paragraph>}</section>
          {complementary.length ? <section><div className="prisma-person-subsection-title"><FileDoneOutlined /><div><Typography.Title level={3}>Outros dados publicados</Typography.Title><span>{complementary.length} registros</span></div></div><div className="prisma-person-complementary-list">{complementary.map((item) => <span key={`${item.type}:${item.value}`}><small>{item.type}</small><strong>{item.value}</strong></span>)}</div></section> : null}
        </div>
      </div>
      <div aria-label="Legenda das classificações de competência" className="prisma-competency-classification-guide"><Typography.Text strong>Como interpretar as classificações</Typography.Text><div className="prisma-competency-classification-guide__items">{competencyClassificationGuide.map((classification) => <div className="prisma-competency-classification-guide__item" key={classification.key}><span aria-hidden="true" className={`prisma-competency-classification-guide__swatch prisma-competency-classification-guide__swatch--${classification.key}`} /><div><strong>{classification.label}</strong><span>{classification.description}</span></div></div>)}</div></div>
    </PrismaCard>
  );
}

function RecentDocuments({ model, onAction, onOpenAll }: { model: PersonCenterViewModel; onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void; onOpenAll: () => void }) {
  return <PrismaCard className="prisma-person-recent-documents" extra={<Button onClick={onOpenAll} type="link">Ver todos</Button>} title="Documentos relacionados">{model.recentDocuments.length ? <List dataSource={model.recentDocuments} renderItem={(document) => { const presentation = presentDocument(document); return <List.Item actions={[<Button aria-label={`Abrir ${document.filename}`} icon={<ArrowRightOutlined />} key="open" onClick={() => onAction(document.verificationReviewId ? "open_document" : "open_details", document)} type="text" />]}><List.Item.Meta avatar={<FilePdfOutlined />} description={<span>Documento v{document.documentVersion} · {formatDate(document.createdAt)}</span>} title={document.filename} /><PrismaStatusTag compact label={presentation.label} tone={statusTone(presentation.tone)} /></List.Item>; }} /> : <Empty description="Nenhum documento foi associado a esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</PrismaCard>;
}

function RecentActivity({ model }: { model: PersonCenterViewModel }) {
  return <PrismaCard className="prisma-person-recent-history" title="Atividade recente">{model.recentActivity.length ? <Timeline items={model.recentActivity.map((item) => ({ color: timelineColor(item.tone), children: <HistoryItem date={item.occurredAt} description={item.description} title={item.title} /> }))} /> : <Empty description="Nenhuma atividade relevante foi registrada para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</PrismaCard>;
}

function PersonDocumentsView({ model, selectedDocument, selectedDraft, busy, onSelect, onAction, onDiscard }: {
  model: PersonCenterViewModel;
  selectedDocument: PersonDocumentTimelineItem | null;
  selectedDraft: PersonIngestionWorkspace["draft"];
  busy: boolean;
  onSelect: (document: PersonDocumentTimelineItem) => void;
  onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void;
  onDiscard: (document: PersonDocumentTimelineItem) => void;
}) {
  return (
    <div className="prisma-person-documents-view">
      <section aria-labelledby="documentos-versoes" className="prisma-person-documents-list">
        <div className="prisma-person-view-heading"><div><Typography.Title id="documentos-versoes" level={2}>Documentos e versões</Typography.Title><Typography.Paragraph>Documento e Perfil possuem versões independentes. Selecione uma fonte para entender seu estado e a próxima ação.</Typography.Paragraph></div><PrismaStatusTag label={`${model.summary.documents.total} documentos`} tone="info" /></div>
        <PrismaCard className="prisma-person-documents-table">
          <Table className="prisma-desktop-only" columns={workspaceDocumentColumns({ onOpen: (document) => onAction(document.verificationReviewId ? "open_document" : "open_details", document), onReview: (document) => onAction("review", document) })} dataSource={model.documents} locale={{ emptyText: "Nenhum documento foi associado a esta Pessoa." }} onRow={(document) => ({
            "aria-label": `Selecionar ${document.filename}`,
            className: selectedDocument?.id === document.id ? "is-selected" : "",
            onClick: () => onSelect(document),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(document);
              }
            },
            role: "button",
            tabIndex: 0,
          })} pagination={false} rowKey="id" scroll={{ x: 980 }} />
          <div className="prisma-mobile-only prisma-person-document-cards">{model.documents.map((document) => { const presentation = presentDocument(document); return <button className={selectedDocument?.id === document.id ? "is-selected" : ""} key={document.id} onClick={() => onSelect(document)} type="button"><span><FilePdfOutlined /><strong>{document.filename}</strong></span><small>Documento v{document.documentVersion} · {formatDate(document.createdAt)}</small><PrismaStatusTag compact label={presentation.label} tone={statusTone(presentation.tone)} /></button>; })}</div>
        </PrismaCard>
      </section>
      <DocumentContextPanel busy={busy} document={selectedDocument} draft={selectedDraft} onAction={onAction} onDiscard={onDiscard} />
    </div>
  );
}

function DocumentContextPanel({ document, draft, busy, onAction, onDiscard }: { document: PersonDocumentTimelineItem | null; draft: PersonIngestionWorkspace["draft"]; busy: boolean; onAction: (kind: PersonActionKind, document: PersonDocumentTimelineItem) => void; onDiscard: (document: PersonDocumentTimelineItem) => void }) {
  if (!document) return <PrismaCard className="prisma-person-document-context"><Empty description="Selecione um documento para ver seu contexto." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard>;
  const presentation = presentDocument(document);
  const metrics = draftMetrics(draft);
  const reviewable = isReviewableDocument(document);
  const canDiscard = ["requires_review", "technical_failure"].includes(presentation.state);
  return (
    <aside aria-label={`Detalhes de ${document.filename}`} className="prisma-person-document-context">
      <PrismaCard>
        <div className="prisma-person-document-context__header"><FilePdfOutlined /><div><small>Documento selecionado</small><Typography.Title level={3}>{document.filename}</Typography.Title><span>Importado em {formatDate(document.createdAt)}</span></div><PrismaStatusTag label={presentation.label} tone={statusTone(presentation.tone)} /></div>
        <div className="prisma-person-document-context__summary"><article><small>Campos recuperados</small><strong>{metrics.recovered}</strong><span>Informações estruturadas nesta fonte</span></article><article><small>Pontos pendentes</small><strong>{metrics.pending}</strong><span>Campos não identificados ou que exigem validação</span></article><article><small>Resultado no Perfil</small><strong>{document.profileVersion ? `v${document.profileVersion}` : "Sem nova versão"}</strong><span>{document.profileVersion ? "Perfil publicado" : "Perfil vigente preservado"}</span></article></div>
        {draft?.education.length ? <DocumentEducationSummary education={draft.education} /> : null}
        <section className="prisma-person-document-context__next"><small>Próxima ação</small><strong>{presentation.nextAction}</strong><p>{presentation.description}</p>{reviewable ? <Button block icon={<ArrowRightOutlined />} loading={busy} onClick={() => onAction("review", document)} type="primary">Abrir revisão M5</Button> : presentation.state === "technical_failure" && document.latestAttempt && document.latestAttempt.pagesNative + document.latestAttempt.pagesOcr > 0 ? <Button block icon={<ReloadOutlined />} loading={busy} onClick={() => onAction("reprocess", document)} type="primary">Reprocessar documento</Button> : null}</section>
        <div className="prisma-person-document-context__actions"><Button icon={<EyeOutlined />} onClick={() => onAction(document.verificationReviewId ? "open_document" : "open_details", document)}>{document.verificationReviewId ? "Visualizar documento" : "Detalhes técnicos"}</Button>{canDiscard ? <Popconfirm cancelText="Manter pendência" description="Documento, histórico e Perfil vigente permanecerão preservados." okText="Arquivar importação" onConfirm={() => onDiscard(document)} title="Descartar esta importação do fluxo ativo?"><Button danger disabled={busy} icon={<DeleteOutlined />}>Descartar</Button></Popconfirm> : null}</div>
      </PrismaCard>
    </aside>
  );
}

function draftMetrics(draft: PersonIngestionWorkspace["draft"]): { recovered: number; pending: number } {
  if (!draft) return { recovered: 0, pending: 0 };
  const scalarValues = [draft.professionalTitle, draft.professionalObjective, draft.summary].filter((value) => value?.trim()).length;
  const collectionValues = draft.keyResults.length + draft.experiences.length + draft.education.length + draft.certifications.length + draft.languages.length + draft.competencies.length + draft.customSections.reduce((sum, section) => sum + section.items.length, 0);
  const pendingEducation = draft.education.filter((item) => educationClassificationNeedsReview(resolveEducationClassification(item))).length;
  return { recovered: scalarValues + collectionValues, pending: draft.notIdentified.length + pendingEducation };
}

function statusTone(tone: ReturnType<typeof presentDocument>["tone"]): "success" | "info" | "warning" | "danger" | "neutral" {
  if (tone === "review") return "warning";
  if (tone === "processing") return "info";
  return tone;
}

function timelineColor(tone: ReturnType<typeof presentDocument>["tone"]): string {
  if (tone === "review") return "#d99a00";
  if (tone === "danger") return "#d9363e";
  if (tone === "success") return "#15945f";
  if (tone === "processing") return "#155eef";
  return "#8793a7";
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

function PublishedExperienceItem({ item }: { item: StructuredExperience }) {
  const role = conciseRecordValue(item.role);
  const organization = conciseRecordValue(item.organization);
  const title = role ?? organization ?? "Experiência profissional registrada";
  const metadata = [organization && organization !== title ? organization : null, conciseRecordValue(item.period)].filter(Boolean).join(" · ");
  const detail = recordDetail([item.description, item.evidenceText, role ? null : item.role, organization ? null : item.organization], title, metadata);
  return <PublishedRecord detail={detail} metadata={metadata} title={title} />;
}

function PublishedEducationItem({ item }: { item: StructuredEducation }) {
  const classification = resolveEducationClassification(item);
  const course = conciseRecordValue(item.course);
  const institution = conciseRecordValue(item.institution);
  const title = course ?? institution ?? "Formação registrada";
  const metadata = [institution && institution !== title ? institution : null, conciseRecordValue(item.period)].filter(Boolean).join(" · ");
  const detail = recordDetail([item.description, item.evidenceText, course ? null : item.course, institution ? null : item.institution], title, metadata);
  return <PublishedRecord detail={detail} metadata={metadata} title={title} badges={<><Tag color={classification.status === "completed" ? "green" : classification.status === "in_progress" ? "blue" : "default"}>{EDUCATION_STATUS_LABELS[classification.status]}</Tag><Tag color="geekblue">{EDUCATION_LEVEL_LABELS[classification.level]}</Tag><Tag color="purple">{EDUCATION_QUALIFICATION_LABELS[classification.qualification]}</Tag><Tag>{EDUCATION_ORIGIN_LABELS[classification.classificationOrigin]}</Tag></>} />;
}

function PublishedRecord({ detail, metadata, title, badges }: { detail: string | null; metadata: string; title: string; badges?: ReactNode }) {
  return (
    <List.Item className="prisma-published-record">
      <div>
        <strong>{title}</strong>
        {metadata ? <small>{metadata}</small> : null}
        {badges ? <div className="prisma-published-record__badges">{badges}</div> : null}
        {detail ? <Typography.Paragraph ellipsis={{ rows: 3, expandable: true, symbol: "Ver mais" }}>{detail}</Typography.Paragraph> : null}
      </div>
    </List.Item>
  );
}

function DocumentEducationSummary({ education }: { education: StructuredEducation[] }) {
  const pending = education.filter((item) => educationClassificationNeedsReview(resolveEducationClassification(item))).length;
  return (
    <section className="prisma-document-education-summary">
      <div className="prisma-document-education-summary__heading"><div><small>Formação acadêmica identificada</small><strong>{education.length} {education.length === 1 ? "registro" : "registros"}</strong></div>{pending ? <Tag color="gold">{pending} requer {pending === 1 ? "validação" : "validações"}</Tag> : <Tag color="green">Classificação confirmada</Tag>}</div>
      <div className="prisma-document-education-summary__list">{education.slice(0, 4).map((item) => { const classification = resolveEducationClassification(item); return <article key={item.id}><div><strong>{item.course || "Curso não identificado"}</strong><span>{item.institution || "Instituição não identificada"}</span></div><div><Tag color="geekblue">{EDUCATION_LEVEL_LABELS[classification.level]}</Tag><Tag color={educationClassificationNeedsReview(classification) ? "gold" : "green"}>{EDUCATION_QUALIFICATION_LABELS[classification.qualification]}</Tag></div></article>; })}</div>
      <div className="prisma-document-education-summary__legend"><span><i className="explicit" />Explícita: informada diretamente no documento</span><span><i className="inferred" />Inferida: deduzida por regra e sujeita à validação</span></div>
    </section>
  );
}

function conciseRecordValue(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized && normalized.length <= 96 ? normalized : null;
}

function recordDetail(values: Array<string | null | undefined>, title: string, metadata: string): string | null {
  const detail = values.map((value) => value?.replace(/\s+/g, " ").trim() ?? "").find((value) => value.length > 0 && value !== title && !metadata.includes(value));
  if (!detail) return null;
  const normalizedDetail = normalizeComparable(detail);
  const normalizedSummary = normalizeComparable(`${title} ${metadata}`);
  return normalizedDetail === normalizedSummary ? null : detail;
}

function normalizeComparable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function HistoryItem({ date, title, description }: { date: string; title: string; description: string }) {
  return <div className="prisma-person-history-item" data-date={date}><small>{formatDate(date)}</small><strong>{title}</strong><span>{description}</span></div>;
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
        ? <Button onClick={(event) => { event.stopPropagation(); onReview(document); }} type="primary" ghost>Abrir revisão</Button>
        : <Button icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); onOpen(document); }}>{document.verificationReviewId ? "Ver documento" : "Detalhes técnicos"}</Button>,
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
