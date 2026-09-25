import { useUnsavedChanges } from "../ui/PrismaNavigation";
import { useRef, useState } from "react";
import {
  ArrowLeftOutlined, CloudUploadOutlined, EyeOutlined, FilePdfOutlined,
  LockOutlined, PlusOutlined, SafetyCertificateOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Progress, Steps, Tag, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import {
  extractResumeIdentity, hasMinimumResumeIdentity, normalizeResumeEmail, normalizeResumeName,
  normalizeResumePhone, type ResumeIdentity,
} from "../../../src/domain/resumeIdentity.js";
import {
  validateAndProcessPdf, type PdfProcessingProgress, type PersonIngestionWorkspace,
  type ProcessedDocumentInput, type ResumeDuplicateCandidate, type ResumeIntakeIdentityResult,
  type ResumeIntakeResolutionResult, type ResumeProcessingProgress,
} from "../domain/personIngestion";
import { deriveResumeProductState } from "../domain/resumeProductState";
import { operationRecovery, type OperationRecovery } from "../domain/reviewOperationErrors";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import { prepareParserIa, parserIaEnabled } from "../infrastructure/parserIaClient";
import { parserIaIdentity } from "../domain/parserIa";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { useParserReadiness } from "../ui/useParserReadiness";
import { parserReadinessBlocksImport, parserReadinessTitles, type ParserReadiness } from "../domain/parserReadiness";

interface ResumeImportPageProps { activeMembership: OrganizationMembership; onNavigate: (path: string) => void; }
interface IdentityFormValue { fullName: string; email: string; phone: string; }
type JourneyPhase = "upload" | "identity" | "processing" | "analysis";
type ResolutionAttempt = { action: "create_new_person" | "link_existing_person"; personId: string | null };

export function ResumeImportPage({ activeMembership, onNavigate }: ResumeImportPageProps) {
  const [phase, setPhase] = useState<JourneyPhase>("upload");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processed, setProcessed] = useState<ProcessedDocumentInput | null>(null);
  const [identity, setIdentity] = useState<ResumeIdentity | null>(null);
  const [intake, setIntake] = useState<ResumeIntakeIdentityResult | null>(null);
  const [result, setResult] = useState<ResumeIntakeResolutionResult | null>(null);
  const [analysis, setAnalysis] = useState<PersonIngestionWorkspace | null>(null);
  const [progress, setProgress] = useState<PdfProcessingProgress | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ResumeProcessingProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRecovery, setProcessingRecovery] = useState<OperationRecovery>("none");
  const [lastResolution, setLastResolution] = useState<ResolutionAttempt | null>(null);
  const checkingImport = useRef(false);
  const importSelection = useRef(fileList[0]?.originFileObj);
  importSelection.current = fileList[0]?.originFileObj;
  const { readiness, refresh: refreshReadiness } = useParserReadiness(activeMembership.organizationId, phase === "upload" && !busy);

  useUnsavedChanges(fileList.length > 0 && phase !== "analysis");

  function restartImport() {
    setPhase("upload");
    setFileList([]);
    setProcessed(null);
    setIdentity(null);
    setIntake(null);
    setResult(null);
    setAnalysis(null);
    setProcessingProgress(null);
    setProcessingRecovery("none");
    setLastResolution(null);
    setError(null);
  }

  async function handleImport() {
    if (checkingImport.current || busy) return;
    const file = fileList[0]?.originFileObj;
    if (!file) { setError("Selecione um currículo em PDF antes de iniciar."); return; }
    if (!parserIaEnabled()) { setError("O Parser IA não está disponível. A importação não foi iniciada."); return; }
    checkingImport.current = true;
    const availability = await refreshReadiness().finally(() => { checkingImport.current = false; });
    if (parserReadinessBlocksImport(availability) || importSelection.current !== file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const nativeProcessed = await validateAndProcessPdf(file, setProgress, {
        nativeOnlyForParserIa: true,
      });
      setProgress({ stage: "document_intelligence", message: "Interpretando os campos e conferindo as referências ao documento." });
      const nextProcessed = await prepareParserIa(nativeProcessed, activeMembership.organizationId);
      const nextIdentity = nextProcessed.parserIa ? parserIaIdentity(nextProcessed.parserIa) : extractResumeIdentity(nextProcessed.pages);
      const nextIntake = await personIngestionService.beginResumeIntake(activeMembership.organizationId, nextProcessed, nextIdentity, intakeKey(activeMembership.organizationId, nextProcessed.sha256));
      setProcessed(nextProcessed); setIdentity(nextIdentity);
      if (nextIntake.kind === "resolved") {
        setResult(nextIntake);
        setAnalysis(await personIngestionService.loadWorkspace(activeMembership.organizationId, nextIntake.personId, nextIntake.documentId));
        setPhase("analysis");
      } else {
        setIntake(nextIntake);
        setPhase("identity");
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "O currículo não pôde ser importado."); }
    finally { setBusy(false); setProgress(null); }
  }

  async function handleIdentityReview(value: IdentityFormValue): Promise<boolean> {
    if (!intake) { setError("A identificação desta importação não está mais disponível. Volte ao envio e abra o fluxo novamente."); return false; }
    const nextIdentity: ResumeIdentity = {
      fullName: normalizeResumeName(value.fullName) || null,
      email: normalizeResumeEmail(value.email), phone: normalizeResumePhone(value.phone),
      namePage: identity?.namePage ?? null, emailPage: identity?.emailPage ?? null, phonePage: identity?.phonePage ?? null,
    };
    if (!hasMinimumResumeIdentity(nextIdentity)) { setError("Informe o nome e pelo menos um e-mail ou telefone válido."); return false; }
    setBusy(true); setError(null);
    try {
      const nextIntake = await personIngestionService.identifyResumeIntake(activeMembership.organizationId, intake.intakeId, intake.storagePath, nextIdentity);
      setIdentity(nextIdentity); setIntake(nextIntake);
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível verificar a identificação."); return false; }
    finally { setBusy(false); }
  }

  async function resolveIntake(action: "create_new_person" | "link_existing_person", personId: string | null) {
    if (!intake || !processed) {
      setError("Os dados necessários para continuar não estão mais disponíveis nesta tela. Volte ao envio e abra a importação novamente.");
      setPhase("upload");
      return;
    }
    setLastResolution({ action, personId });
    setBusy(true); setError(null); setPhase("processing");
    setProcessingRecovery("none");
    setProcessingProgress({ stage: "structuring", message: "Preparando a análise das informações profissionais." });
    try {
      const resolved = await personIngestionService.resolveResumeIntake(
        activeMembership.organizationId, intake.intakeId, processed, action, personId,
        `resume-intake-resolution:${intake.intakeId}:${action}:${personId ?? "new"}`,
        setProcessingProgress,
      );
      setResult(resolved);
      setAnalysis(await personIngestionService.loadWorkspace(activeMembership.organizationId, resolved.personId, resolved.documentId));
      setLastResolution(null);
      setPhase("analysis");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir o processamento.");
      setProcessingRecovery(operationRecovery(caught));
      setPhase("processing");
    } finally { setBusy(false); }
  }

  function handleCreateDespiteMatch() {
    if (!intake) { setError("A identificação desta importação não está mais disponível. Volte ao envio e abra o fluxo novamente."); return; }
    if (intake.status === "needs_duplicate_resolution") {
      Modal.confirm({
        title: "Criar uma nova Pessoa?",
        content: "Há um cadastro possivelmente correspondente. Confirme somente se o currículo pertence a outra Pessoa.",
        okText: "Criar nova pessoa", cancelText: "Voltar", onOk: () => resolveIntake("create_new_person", null),
      });
    } else void resolveIntake("create_new_person", null);
  }

  async function startReview() {
    if (!result || !analysis?.selectedDocument?.reviewAttempt) {
      setError("Esta importação ainda não possui uma tentativa pronta para revisão. Reabra a Central da Pessoa para ver o estado atual e a próxima ação disponível.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const reviewId = await personIngestionService.startProfileReview(activeMembership.organizationId, result.personId, result.documentId, analysis.selectedDocument.reviewAttempt.id);
      onNavigate(`/profiles/${result.personId}/documents/${result.documentId}/review/${reviewId}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a revisão."); }
    finally { setBusy(false); }
  }

  return <PrismaPage className={`prisma-resume-journey prisma-resume-journey--${phase}`}>
    {phase === "upload" ? <UploadScreen busy={busy} error={error} fileList={fileList} onBack={() => onNavigate("/profiles")} onChange={setFileList} onImport={() => void handleImport()} progress={progress} readiness={readiness} onCheck={() => void refreshReadiness()} /> : null}
    {phase !== "upload" && processed?.parserIa?.status === "partial" ? <Alert type="warning" showIcon message="Interpretação parcial: há informações que precisam de conferência na revisão." /> : null}
    {phase === "identity" && intake ? <IdentityScreen busy={busy} error={error} identity={identity} intake={intake} onBack={() => setPhase("upload")} onCreate={handleCreateDespiteMatch} onIdentityReview={handleIdentityReview} onLink={(candidate) => void resolveIntake("link_existing_person", candidate.personId)} processed={processed} /> : null}
    {phase === "processing" ? <ProcessingScreen busy={busy} error={error} onBack={() => onNavigate("/profiles")} onReplace={restartImport} onRetry={processingRecovery === "retry" && lastResolution ? () => void resolveIntake(lastResolution.action, lastResolution.personId) : null} processed={processed} progress={processingProgress} recovery={processingRecovery} /> : null}
    {phase === "analysis" && result && analysis ? <AnalysisScreen analysis={analysis} busy={busy} error={error} onBack={() => onNavigate(`/profiles/${result.personId}`)} onReview={() => void startReview()} processed={processed} reused={result.reused} /> : null}
  </PrismaPage>;
}

function UploadScreen(props: { busy: boolean; error: string | null; fileList: UploadFile[]; progress: PdfProcessingProgress | null; onBack: () => void; onChange: (files: UploadFile[]) => void; onImport: () => void; readiness: ParserReadiness; onCheck: () => void }) {
  return <>
    <PrismaPageHeader title="Importar currículo" description="Envie o currículo para iniciarmos a análise e a construção do Perfil Prisma." />
    <Button icon={<ArrowLeftOutlined />} onClick={props.onBack} type="text">Voltar para Pessoas</Button>
    <Steps className="prisma-m81-import-steps" current={0} size="small" responsive items={[
      { title: "Upload" }, { title: "Processamento" }, { title: "Revisão" }, { title: "Publicação" },
    ]} />
    {props.error ? <Alert showIcon title={props.error} type="error" /> : null}
    <PrismaCard className="prisma-journey-upload-card">
      <Upload.Dragger accept="application/pdf,.pdf" beforeUpload={() => false} disabled={props.busy} fileList={props.fileList} maxCount={1} onChange={({ fileList }) => props.onChange(fileList.slice(-1))} onRemove={() => { props.onChange([]); return true; }}>
        <p className="ant-upload-drag-icon"><CloudUploadOutlined /></p><p className="ant-upload-text">Arraste e solte o arquivo aqui</p><p className="ant-upload-hint">ou</p>
        <Button disabled={props.busy} type="primary">Selecionar arquivo</Button><p className="prisma-upload-contract">Formato aceito: PDF · Tamanho máximo: 15 MB</p>
      </Upload.Dragger>
      {props.fileList[0] ? <div className="prisma-selected-file"><FilePdfOutlined /><div><strong>{props.fileList[0].name}</strong><span>{formatBytes(props.fileList[0].size ?? 0)}</span></div><Tag>Arquivo selecionado</Tag></div> : null}
      {props.progress ? <Alert description={props.progress.message} showIcon title="Leitura inicial em andamento" type="info" /> : null}
      {!props.busy ? <div role="status" aria-live="polite"><Alert
        className="prisma-parser-readiness"
        showIcon
        type={props.readiness.state === "available" ? "success" : props.readiness.state === "checking" ? "info" : "warning"}
        title={parserReadinessTitles[props.readiness.state]}
        description={<>
          {props.readiness.state === "available" ? "Conexão verificada. A resposta da IA será confirmada durante o processamento."
            : props.readiness.state === "unavailable" ? (["access_denied", "session_required"].includes(props.readiness.reason) ? "Confira sua sessão e o acesso à empresa antes de tentar novamente." : "O serviço não está pronto para receber o currículo. Seu arquivo selecionado será mantido.")
              : props.readiness.state === "unknown" ? "Você pode verificar novamente ou tentar importar. A disponibilidade será conferida antes do envio."
                : props.readiness.state === "busy" ? "A disponibilidade será atualizada automaticamente. Seu arquivo selecionado será mantido." : "Aguarde a checagem do serviço."}
          {props.readiness.observedAt > 0 && props.readiness.state !== "checking" ? <div>Verificado às {new Date(props.readiness.observedAt).toLocaleTimeString("pt-BR")}</div> : null}
        </>}
        action={<Button size="small" loading={props.readiness.state === "checking"} onClick={props.onCheck}>Verificar novamente</Button>}
      /></div> : null}
      <Button className="prisma-journey-upload-submit" disabled={!props.fileList.length || parserReadinessBlocksImport(props.readiness)} loading={props.busy} onClick={props.onImport} type="primary">Importar currículo</Button>
    </PrismaCard>
    <details className="prisma-m81-import-details"><summary>Como funciona e como os dados são protegidos</summary>
      {parserIaEnabled() ? <Alert showIcon title="Importação com IA ativada" description="O PDF será enviado à OpenAI para organizar os campos. Você poderá conferir e corrigir o resultado antes de publicar o perfil." type="info" /> : null}
      <Alert icon={<LockOutlined />} showIcon title="Seus dados estão protegidos" description="O currículo é armazenado de forma privada, isolado por organização e acessível somente a operadores autorizados." type="info" />
    </details>
  </>;
}

function IdentityScreen(props: { busy: boolean; error: string | null; identity: ResumeIdentity | null; intake: ResumeIntakeIdentityResult; processed: ProcessedDocumentInput | null; onBack: () => void; onCreate: () => void; onIdentityReview: (value: IdentityFormValue) => Promise<boolean>; onLink: (candidate: ResumeDuplicateCandidate) => void }) {
  const state = deriveResumeProductState({ intakeStatus: props.intake.status });
  const fallbackIdentity: ResumeIdentity = { fullName: null, email: null, phone: null, namePage: null, emailPage: null, phonePage: null };
  const [editingIdentity, setEditingIdentity] = useState(false);
  const hasMinimumIdentity = hasMinimumResumeIdentity(props.identity ?? fallbackIdentity);
  async function confirmIdentity(value: IdentityFormValue) {
    if (await props.onIdentityReview(value)) setEditingIdentity(false);
  }
  return <>
    <PrismaPageHeader title="Identificação da pessoa" description="Encontramos possíveis correspondências para este currículo." actions={<FileCard file={props.processed?.file ?? null} />} />
    <Button disabled={props.busy} icon={<ArrowLeftOutlined />} onClick={props.onBack} type="text">Voltar para importação</Button>
    {props.error ? <Alert showIcon title={props.error} type="error" /> : null}
    <Alert description="Informações profissionais não são usadas para decidir identidade." showIcon title={state.message} type="info" />
    <PrismaCard className="prisma-journey-contact-card" title="Contato identificado no currículo">
      {hasMinimumIdentity && !editingIdentity ? <><Descriptions column={{ xs: 1, sm: 3 }} size="small"><Descriptions.Item label="Nome">{props.identity?.fullName}</Descriptions.Item><Descriptions.Item label="E-mail">{props.identity?.email ?? "Não identificado"}</Descriptions.Item><Descriptions.Item label="Celular">{props.identity?.phone ?? "Não identificado"}</Descriptions.Item></Descriptions><Button disabled={props.busy} onClick={() => setEditingIdentity(true)} type="link">Corrigir identificação</Button></> : <IdentityForm busy={props.busy} identity={props.identity} onSubmit={confirmIdentity} onCancel={editingIdentity ? () => setEditingIdentity(false) : undefined} />}
    </PrismaCard>
    {!editingIdentity ? <PrismaCard className="prisma-journey-matches" title="Possíveis correspondências">
      <Typography.Paragraph type="secondary">Selecione alguma Pessoa da sua organização com base no contato e no nome.</Typography.Paragraph>
      {props.intake.candidates.map((candidate) => <article className="prisma-journey-match" key={candidate.personId}><span className="prisma-match-avatar">{initials(candidate.fullName)}</span><div><strong>{candidate.fullName}</strong><small>{candidate.email ?? candidate.phone ?? "Contato privado disponível"}</small></div><Tag color={candidate.strong ? "green" : "gold"}>{candidate.reasons.map(describeReason).join(" · ")}</Tag><Button disabled={props.busy} loading={props.busy} onClick={() => props.onLink(candidate)} type="primary" ghost>Selecionar</Button></article>)}
      <article className="prisma-journey-match prisma-journey-match--new"><span className="prisma-match-avatar"><UserAddOutlined /></span><div><strong>Criar nova pessoa</strong><small>Não encontramos a pessoa na nossa base</small></div><Button disabled={props.busy || !hasMinimumIdentity} icon={<PlusOutlined />} loading={props.busy} onClick={props.onCreate}>Criar nova</Button></article>
      {props.intake.candidates.length ? <Button disabled={props.busy || !hasMinimumIdentity} icon={<UserAddOutlined />} onClick={props.onCreate} type="link">Nenhuma das opções acima é a pessoa</Button> : null}
    </PrismaCard> : null}
  </>;
}

function IdentityForm({ busy, identity, onSubmit, onCancel }: { busy: boolean; identity: ResumeIdentity | null; onSubmit: (value: IdentityFormValue) => void; onCancel?: (() => void) | undefined }) {
  return <Form<IdentityFormValue> disabled={busy} initialValues={{ fullName: identity?.fullName ?? "", email: identity?.email ?? "", phone: identity?.phone ?? "" }} layout="vertical" onFinish={onSubmit}><div className="prisma-identity-fields"><Form.Item label="Nome" name="fullName" rules={[{ required: true, whitespace: true, message: "Informe o nome da Pessoa." }]}><Input autoComplete="name" /></Form.Item><Form.Item label="E-mail" name="email"><Input autoComplete="email" /></Form.Item><Form.Item label="Telefone" name="phone"><Input autoComplete="tel" /></Form.Item></div><Button disabled={busy} htmlType="submit" loading={busy} type="primary">Confirmar identificação</Button>{onCancel ? <Button disabled={busy} onClick={onCancel}>Cancelar correção</Button> : null}</Form>;
}

function ProcessingScreen({ busy, error, onBack, onReplace, onRetry, processed, progress, recovery }: { busy: boolean; error: string | null; onBack: () => void; onReplace: () => void; onRetry: (() => void) | null; processed: ProcessedDocumentInput | null; progress: ResumeProcessingProgress | null; recovery: OperationRecovery }) {
  const current = progress?.stage === "structuring" ? 2 : progress?.stage === "persisting" ? 3 : 4;
  const recoveryAction = onRetry
    ? <Button disabled={busy} onClick={onRetry} type="primary">Tentar novamente</Button>
    : recovery === "sign-in"
      ? <Button onClick={onBack}>Entrar novamente</Button>
      : recovery === "reload" || recovery === "return-to-review"
        ? <Button onClick={onBack}>Abrir Central da Pessoa</Button>
        : <Button onClick={onReplace}>Substituir arquivo</Button>;
  return <>
    <PrismaPageHeader title="Processamento do documento" description="Acompanhe o processamento do currículo enviado." actions={<FileCard file={processed?.file ?? null} />} />
    <Button disabled={busy} icon={<ArrowLeftOutlined />} onClick={onBack} type="text">Voltar para Pessoas</Button>
    <PrismaCard className="prisma-journey-processing-timeline"><Steps current={current} items={[{ title: "Recebido" }, { title: "Extraindo texto" }, { title: "Estruturando" }, { title: "Revisão" }, { title: "Pronto" }]} responsive /></PrismaCard>
    {error ? <Alert action={recoveryAction} description={onRetry ? "O documento foi preservado com o progresso concluído. Você pode repetir a etapa interrompida sem reenviar o currículo." : "O documento foi preservado e nenhum perfil foi publicado. Use a ação indicada para continuar por um caminho seguro."} showIcon title={error} type="error" /> : null}
    <div className="prisma-journey-processing-grid"><PrismaCard title="Status atual"><Progress percent={progress?.stage === "ready_for_review" ? 100 : 70} showInfo={false} status={error ? "exception" : "active"} /><Typography.Title level={4}>{progress?.message ?? "Preparando processamento..."}</Typography.Title><Typography.Text type="secondary">Isso pode levar alguns instantes.</Typography.Text></PrismaCard><PrismaCard title="Detalhes"><Descriptions column={1} size="small"><Descriptions.Item label="Páginas detectadas">{processed?.pages.length ?? "Aguardando"}</Descriptions.Item><Descriptions.Item label="Método atual">{processingMethodLabel(processed)}</Descriptions.Item><Descriptions.Item label="OCR necessário">{processed?.ocrPageCount ? "Sim" : "Não"}</Descriptions.Item><Descriptions.Item label="Arquivo recebido">Preservado</Descriptions.Item></Descriptions></PrismaCard></div>
    {!error ? <Alert showIcon title="Mantenha esta página aberta durante o processamento" description="O arquivo já foi recebido, mas a extração e a estruturação ainda são concluídas por esta sessão. Ao final, a revisão será aberta automaticamente." type="info" /> : null}
  </>;
}

function AnalysisScreen({ analysis, busy, error, onBack, onReview, processed, reused }: { analysis: PersonIngestionWorkspace; busy: boolean; error: string | null; onBack: () => void; onReview: () => void; processed: ProcessedDocumentInput | null; reused: boolean }) {
  const document = analysis.selectedDocument;
  const draft = analysis.draft;
  const state = deriveResumeProductState({ documentStatus: document?.status ?? null, reviewState: document?.reviewState ?? null, latestAttempt: document?.latestAttempt ?? null, reviewAttempt: document?.reviewAttempt ?? null, profilePreserved: Boolean(analysis.person.currentProfile) });
  const detectedSections = draft ? [draft.summary, draft.experiences.length, draft.education.length, draft.competencies.length, draft.certifications.length, draft.languages.length].filter(Boolean).length : 0;
  return <>
    <PrismaPageHeader title="Análise do documento" description="Resumo da análise automática do currículo." actions={<FileCard file={processed?.file ?? null} />} />
    <Button icon={<ArrowLeftOutlined />} onClick={onBack} type="text">Voltar para a Central da Pessoa</Button>
    {error ? <Alert showIcon title={error} type="error" /> : null}{reused ? <Alert action={<Button onClick={onBack}>Abrir importação existente</Button>} showIcon title="Este documento já foi importado." type="info" /> : null}
    <div className="prisma-journey-analysis-grid"><PrismaCard title="Resumo da análise"><Descriptions column={1} size="small"><Descriptions.Item label="Páginas analisadas">{analysis.pages.length}</Descriptions.Item><Descriptions.Item label="Texto extraído">{analysis.pages.reduce((sum, page) => sum + page.usefulCharacterCount, 0)} caracteres úteis</Descriptions.Item><Descriptions.Item label="Método utilizado">{processingMethodLabel(processed)}</Descriptions.Item><Descriptions.Item label="Seções identificadas">{detectedSections}</Descriptions.Item><Descriptions.Item label="Sinais de experiência">{draft?.experiences.length ?? 0}</Descriptions.Item><Descriptions.Item label="Competências identificadas">{draft?.competencies.length ?? 0}</Descriptions.Item><Descriptions.Item label="Pontos que precisam revisão">{(draft?.uncertainties.length ?? 0) + (draft?.notIdentified.length ?? 0)}</Descriptions.Item></Descriptions></PrismaCard><PrismaCard title="Classificação do resultado"><Tag color={state.state === "requires_review" ? "gold" : "green"}>{state.label}</Tag><Typography.Paragraph>{state.message}</Typography.Paragraph><Typography.Text strong>Próximo passo</Typography.Text><Typography.Paragraph type="secondary">Revise e complemente as informações extraídas antes de publicar.</Typography.Paragraph><Button disabled={!state.reviewPossible} icon={<SafetyCertificateOutlined />} loading={busy} onClick={onReview} type="primary">Iniciar revisão</Button></PrismaCard></div>
    <PrismaCard className="prisma-analysis-pages" title="Texto extraído por página"><div>{analysis.pages.map((page) => <Card hoverable key={page.pageNumber} size="small"><FilePdfOutlined /><strong>Página {page.pageNumber}</strong><Tag color={page.origin === "ocr" ? "gold" : "green"}>{pageMethodLabel(page)}</Tag><small>{page.text.slice(0, 110)}...</small></Card>)}</div></PrismaCard>
    <Alert icon={<SafetyCertificateOutlined />} showIcon title="O texto extraído foi preservado integralmente" description="Nenhuma informação aprovada do perfil vigente foi alterada nesta etapa." type="info" />
  </>;
}

function FileCard({ file }: { file: File | null }) { return <Card className="prisma-journey-file-card" size="small"><FilePdfOutlined /><span><strong>{file?.name ?? "Currículo importado"}</strong><small>{file ? `PDF · ${formatBytes(file.size)}` : "PDF preservado"}</small></span><Button disabled={!file} icon={<EyeOutlined />} onClick={() => openLocalPdf(file)} size="small" type="link">Ver documento</Button></Card>; }
function openLocalPdf(file: File | null): void { if (!file) return; const url = URL.createObjectURL(file); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
function intakeKey(organizationId: string, checksum: string): string { const key = `prisma.resume-intake.${organizationId}.${checksum}`; const current = window.sessionStorage.getItem(key); if (current) return current; const created = `resume-intake:${crypto.randomUUID()}`; window.sessionStorage.setItem(key, created); return created; }
function describeReason(reason: ResumeDuplicateCandidate["reasons"][number]): string { return reason === "same_email" ? "Correspondência por e-mail" : reason === "same_phone" ? "Correspondência por telefone" : "Possível correspondência por nome"; }
function initials(value: string): string { return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function processingMethodLabel(processed: ProcessedDocumentInput | null): string {
  if (!processed) return "Aguardando";
  const trace = processed.documentIntelligence;
  if (trace?.provider === "paddleocr-self-hosted" && !trace.fallbackUsed && trace.effectiveRoute !== "native-fast") return "PP-StructureV3 local";
  if (trace?.fallbackUsed && processed.ocrPageCount) return "Tesseract local após fallback estrutural";
  if (processed.ocrPageCount) return "Tesseract OCR local";
  return "PDF.js nativo";
}
function pageMethodLabel(page: ProcessedDocumentInput["pages"][number]): string {
  if (/PP-Structure|PaddleOCR/i.test(`${page.method} ${page.methodVersion}`)) return "Paddle estrutural local";
  return page.origin === "ocr" ? "Tesseract OCR local" : "PDF.js nativo";
}
function formatBytes(value: number): string { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
