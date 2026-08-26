import { useState } from "react";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  FilePdfOutlined,
  LinkOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Alert, Button, Descriptions, Form, Input, Modal, Result, Space, Steps, Tag, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import {
  extractResumeIdentity,
  hasMinimumResumeIdentity,
  normalizeResumeEmail,
  normalizeResumeName,
  normalizeResumePhone,
  type ResumeIdentity,
} from "../../../src/domain/resumeIdentity.js";
import {
  validateAndProcessPdf,
  type PdfProcessingProgress,
  type ProcessedDocumentInput,
  type ResumeDuplicateCandidate,
  type ResumeIntakeIdentityResult,
  type ResumeIntakeResolutionResult,
} from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ResumeImportPageProps {
  activeMembership: OrganizationMembership;
  onNavigate: (path: string) => void;
}

interface IdentityFormValue {
  fullName: string;
  email: string;
  phone: string;
}

export function ResumeImportPage({ activeMembership, onNavigate }: ResumeImportPageProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processed, setProcessed] = useState<ProcessedDocumentInput | null>(null);
  const [identity, setIdentity] = useState<ResumeIdentity | null>(null);
  const [intake, setIntake] = useState<ResumeIntakeIdentityResult | null>(null);
  const [result, setResult] = useState<ResumeIntakeResolutionResult | null>(null);
  const [progress, setProgress] = useState<PdfProcessingProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      setError("Selecione um currículo em PDF antes de iniciar.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const nextProcessed = await validateAndProcessPdf(file, setProgress);
      const nextIdentity = extractResumeIdentity(nextProcessed.pages);
      const nextIntake = await personIngestionService.beginResumeIntake(
        activeMembership.organizationId,
        nextProcessed,
        nextIdentity,
        intakeKey(activeMembership.organizationId, nextProcessed.sha256),
      );
      setProcessed(nextProcessed);
      setIdentity(nextIdentity);
      if (nextIntake.kind === "resolved") {
        setResult(nextIntake);
        return;
      }
      setIntake(nextIntake);
      if (nextIntake.status === "ready_to_resolve") {
        await resolveIntake(nextIntake, nextProcessed, "create_new_person", null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O currículo não pôde ser importado.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleIdentityReview(value: IdentityFormValue) {
    if (!intake || !processed) return;
    const nextIdentity: ResumeIdentity = {
      fullName: normalizeResumeName(value.fullName) || null,
      email: normalizeResumeEmail(value.email),
      phone: normalizeResumePhone(value.phone),
      namePage: identity?.namePage ?? null,
      emailPage: identity?.emailPage ?? null,
      phonePage: identity?.phonePage ?? null,
    };
    if (!hasMinimumResumeIdentity(nextIdentity)) {
      setError("Informe o nome e pelo menos um e-mail ou telefone válido.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const nextIntake = await personIngestionService.identifyResumeIntake(
        activeMembership.organizationId,
        intake.intakeId,
        intake.storagePath,
        nextIdentity,
      );
      setIdentity(nextIdentity);
      setIntake(nextIntake);
      if (nextIntake.status === "ready_to_resolve") {
        await resolveIntake(nextIntake, processed, "create_new_person", null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível verificar a identificação.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveIntake(
    currentIntake: ResumeIntakeIdentityResult,
    currentProcessed: ProcessedDocumentInput,
    action: "create_new_person" | "link_existing_person",
    personId: string | null,
  ) {
    const resolved = await personIngestionService.resolveResumeIntake(
      activeMembership.organizationId,
      currentIntake.intakeId,
      currentProcessed,
      action,
      personId,
      `resume-intake-resolution:${currentIntake.intakeId}:${action}:${personId ?? "new"}`,
    );
    setResult(resolved);
  }

  async function handleLink(candidate: ResumeDuplicateCandidate) {
    if (!intake || !processed) return;
    setBusy(true);
    setError(null);
    try {
      await resolveIntake(intake, processed, "link_existing_person", candidate.personId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível vincular à Pessoa existente.");
    } finally {
      setBusy(false);
    }
  }

  function handleCreateDespiteMatch() {
    if (!intake || !processed) return;
    Modal.confirm({
      title: "Criar uma nova Pessoa?",
      content: "Há um cadastro possivelmente correspondente. Confirme somente se o currículo pertence a outra Pessoa.",
      okText: "Criar nova pessoa",
      cancelText: "Voltar",
      onOk: async () => {
        setBusy(true);
        setError(null);
        try {
          await resolveIntake(intake, processed, "create_new_person", null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Não foi possível criar a nova Pessoa.");
          throw caught;
        } finally {
          setBusy(false);
        }
      },
    });
  }

  if (result) {
    const created = result.resolutionType === "created_new_person";
    return (
      <PrismaPage className="prisma-resume-import-page">
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title={created ? "Pessoa criada com sucesso" : "Currículo adicionado à pessoa existente"}
          subTitle={(
            <div className="prisma-resume-result-summary">
              <Typography.Paragraph>O documento foi vinculado, processado e está pronto para a revisão humana do Perfil Prisma.</Typography.Paragraph>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Nome">{identity?.fullName || "Identidade confirmada"}</Descriptions.Item>
                <Descriptions.Item label="E-mail">{identity?.email || "Não identificado"}</Descriptions.Item>
                <Descriptions.Item label="Telefone">{identity?.phone || "Não identificado"}</Descriptions.Item>
                <Descriptions.Item label="Documento">{processed?.file.name || "Currículo importado"}</Descriptions.Item>
              </Descriptions>
            </div>
          )}
          extra={[
            <Button key="review" onClick={() => onNavigate(`/profiles/${result.personId}/documents/${result.documentId}`)} type="primary">
              Revisar perfil
            </Button>,
            <Button key="profile" onClick={() => onNavigate(`/profiles/${result.personId}`)}>
              Abrir pessoa
            </Button>,
          ]}
        />
      </PrismaPage>
    );
  }

  const needsIdentity = intake?.status === "needs_human_identity";
  const needsDuplicate = intake?.status === "needs_duplicate_resolution";
  const currentStep = needsIdentity || needsDuplicate ? 2 : busy || processed ? 1 : 0;

  return (
    <PrismaPage className="prisma-resume-import-page">
      <PrismaPageHeader
        title="Importar currículo"
        description="Envie um currículo em PDF. O Prisma identificará a Pessoa, verificará possíveis correspondências e criará ou atualizará o cadastro conforme necessário."
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>
      <Steps
        className="prisma-resume-intake-steps"
        current={currentStep}
        items={[
          { title: "Arquivo recebido" },
          { title: "Extraindo identificação" },
          { title: needsDuplicate ? "Resolver correspondência" : needsIdentity ? "Confirmar identidade" : "Verificando cadastro" },
          { title: "Pronto para revisão" },
        ]}
        responsive
      />
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}

      {!intake ? (
        <PrismaCard className="prisma-resume-upload-card">
          <Upload.Dragger
            accept="application/pdf,.pdf"
            beforeUpload={() => false}
            disabled={busy}
            fileList={fileList}
            maxCount={1}
            onChange={({ fileList: next }) => setFileList(next.slice(-1))}
            onRemove={() => { setFileList([]); return true; }}
          >
            <p className="ant-upload-drag-icon"><CloudUploadOutlined /></p>
            <p className="ant-upload-text">Arraste e solte o currículo aqui</p>
            <p className="ant-upload-hint">ou clique para selecionar · Apenas PDF · Tamanho máximo: 15 MB</p>
          </Upload.Dragger>
          {fileList[0] ? (
            <div className="prisma-selected-file">
              <FilePdfOutlined />
              <div><strong>{fileList[0].name}</strong><span>{formatBytes(fileList[0].size ?? 0)}</span></div>
              <Tag color="green">Pronto para importar</Tag>
            </div>
          ) : null}
          {progress ? <Alert message={progress.message} showIcon type="info" /> : null}
          <div className="prisma-resume-import-actions">
            <Button onClick={() => onNavigate("/profiles")}>Cancelar</Button>
            <Button disabled={fileList.length === 0} loading={busy} onClick={() => void handleImport()} type="primary">
              Importar currículo
            </Button>
          </div>
        </PrismaCard>
      ) : null}

      {needsIdentity ? (
        <PrismaCard className="prisma-identity-review-card" title="Precisamos identificar a Pessoa">
          <Alert
            description="O Prisma não criará um cadastro sem nome e pelo menos um contato válido. Complete somente os dados mínimos para continuar."
            message="Nenhuma Pessoa foi criada"
            showIcon
            type="warning"
          />
          <Form<IdentityFormValue>
            initialValues={{ fullName: identity?.fullName ?? "", email: identity?.email ?? "", phone: identity?.phone ?? "" }}
            layout="vertical"
            onFinish={(value) => void handleIdentityReview(value)}
          >
            <div className="prisma-identity-fields">
              <Form.Item label="Nome" name="fullName" rules={[{ required: true, message: "Informe o nome da Pessoa." }]}>
                <Input autoComplete="name" />
              </Form.Item>
              <Form.Item label="E-mail" name="email"><Input autoComplete="email" /></Form.Item>
              <Form.Item label="Telefone" name="phone"><Input autoComplete="tel" /></Form.Item>
            </div>
            <Space wrap>
              <Button htmlType="submit" loading={busy} type="primary">Verificar identificação</Button>
              <Button onClick={() => onNavigate("/profiles")} type="text">Cancelar importação</Button>
            </Space>
          </Form>
        </PrismaCard>
      ) : null}

      {intake?.status === "ready_to_resolve" && processed && error ? (
        <PrismaCard className="prisma-resume-retry-card" title="A importação não foi concluída">
          <Typography.Paragraph>O arquivo e a identificação foram preservados. Tente continuar sem reenviar ou duplicar o cadastro.</Typography.Paragraph>
          <Space wrap>
            <Button loading={busy} onClick={() => void resolveIntake(intake, processed, "create_new_person", null)} type="primary">
              Tentar novamente
            </Button>
            <Button onClick={() => onNavigate("/profiles")}>Voltar para Pessoas</Button>
          </Space>
        </PrismaCard>
      ) : null}

      {needsDuplicate ? (
        <PrismaCard className="prisma-duplicate-resolution-card" title="Possível cadastro existente">
          <Alert
            description="Encontramos uma Pessoa que pode corresponder ao currículo importado. Revise antes de continuar."
            message="A correspondência ainda não é uma decisão"
            showIcon
            type="info"
          />
          <div className="prisma-imported-identity">
            <Typography.Text type="secondary">Identificação extraída</Typography.Text>
            <strong>{identity?.fullName}</strong>
            <span>{identity?.email || "E-mail não identificado"}</span>
            <span>{identity?.phone || "Telefone não identificado"}</span>
          </div>
          <div className="prisma-duplicate-candidates">
            {intake.candidates.map((candidate) => (
              <article key={candidate.personId} className="prisma-duplicate-candidate">
                <div>
                  <Typography.Text type="secondary">Pessoa encontrada</Typography.Text>
                  <strong>{candidate.fullName}</strong>
                  <span>{candidate.email || "E-mail não informado"}</span>
                  <span>{candidate.phone || "Telefone não informado"}</span>
                  <Space wrap>{candidate.reasons.map((reason) => <Tag key={reason}>{describeReason(reason)}</Tag>)}</Space>
                </div>
                <Button icon={<LinkOutlined />} loading={busy} onClick={() => void handleLink(candidate)} type="primary">
                  Vincular à pessoa existente
                </Button>
              </article>
            ))}
          </div>
          <Button icon={<UserAddOutlined />} loading={busy} onClick={handleCreateDespiteMatch}>
            Criar nova pessoa
          </Button>
        </PrismaCard>
      ) : null}
    </PrismaPage>
  );
}

function intakeKey(organizationId: string, checksum: string): string {
  const storageKey = `prisma.resume-intake.${organizationId}.${checksum}`;
  const current = window.sessionStorage.getItem(storageKey);
  if (current) return current;
  const created = `resume-intake:${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function describeReason(reason: ResumeDuplicateCandidate["reasons"][number]): string {
  if (reason === "same_email") return "Mesmo e-mail";
  if (reason === "same_phone") return "Mesmo telefone";
  return "Mesmo nome";
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
