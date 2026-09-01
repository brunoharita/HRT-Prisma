import { useEffect, useMemo, useState } from "react";
import { CopyOutlined, LinkOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, Progress, Radio, Select, Space, Table, Tabs, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  IssuedInvitation,
  ParticipantResultVisibility,
  PreparedVerificationOption,
  VerificationMonitoringRow,
  VerificationOperatorWorkspace,
} from "../domain/competencyVerificationData";
import { labelCriticality, labelLevel } from "../domain/competencyVerificationData";
import { competencyVerificationService } from "../infrastructure/supabase/competencyVerificationService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaStatusTag, type PrismaStatusTone } from "../ui/PrismaStatusTag";

interface Props {
  activeMembership: OrganizationMembership;
  preparedAssessmentId?: string;
  onNavigate: (path: string) => void;
}

interface InviteFormValues {
  deliveryChannel: "link" | "email" | "whatsapp";
  validDays: number;
  resultVisibility: ParticipantResultVisibility;
  message: string;
}

export function VerificationOperationsPage({ activeMembership, preparedAssessmentId, onNavigate }: Props) {
  const [workspace, setWorkspace] = useState<VerificationOperatorWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedInvitation | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<VerificationMonitoringRow | null>(null);
  const [form] = Form.useForm<InviteFormValues>();

  const load = async () => {
    try {
      setLoading(true);
      setWorkspace(await competencyVerificationService.loadOperatorWorkspace(activeMembership.organizationId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as verificações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeMembership.organizationId]);

  const prepared = workspace?.preparedAssessments.find((item) => item.id === preparedAssessmentId) ?? null;
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (workspace?.verifications ?? []).filter((item) => {
      const tabMatches = tab === "all"
        || (tab === "pending" && ["pending", "opened"].includes(item.status))
        || (tab === "in_progress" && ["in_progress", "paused"].includes(item.status))
        || (tab === "completed" && ["completed", "inconclusive"].includes(item.status))
        || (tab === "expired" && ["expired", "cancelled", "revoked"].includes(item.status));
      return tabMatches && (!normalized || `${item.personName} ${item.competency} ${verificationStatus(item.status).label}`.toLowerCase().includes(normalized));
    });
  }, [search, tab, workspace?.verifications]);

  const emit = async (values: InviteFormValues) => {
    if (!prepared) return;
    try {
      setIssuing(true);
      const result = await competencyVerificationService.issueInvitation({ preparedAssessmentId: prepared.id, ...values });
      setIssued(result);
      await load();
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Não foi possível emitir o convite.");
    } finally {
      setIssuing(false);
    }
  };

  const verificationUrl = issued ? `${window.location.origin}${issued.relativePath}` : "";
  if (preparedAssessmentId) {
    return (
      <PrismaPage className="prisma-m51b-operator-page">
        <PrismaPageHeader title="Emitir convite" description="Gere um acesso pessoal para a verificação preparada. Nenhuma mensagem externa será enviada automaticamente." />
        <Button onClick={() => onNavigate("/verifications")} type="link">Voltar para verificações</Button>
        {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
        {!prepared && !loading ? <PrismaCard><Empty description="Instrumento preparado não encontrado." /></PrismaCard> : null}
        {prepared ? (
          <>
            <PrismaCard className="prisma-m51b-context-card">
              <Space align="start" size="large" wrap>
                <SafetyCertificateOutlined className="prisma-m51b-context-icon" />
                <div><Typography.Text type="secondary">Verificação a ser aplicada</Typography.Text><Typography.Title level={4}>{prepared.competency} · {labelLevel(prepared.targetLevel)}</Typography.Title><Typography.Text>{prepared.context ?? "Necessidade profissional"} · {labelCriticality(prepared.criticality)}</Typography.Text></div>
                <div><Typography.Text type="secondary">Pessoa</Typography.Text><Typography.Title level={5}>{prepared.personName}</Typography.Title><Typography.Text>{prepared.email || prepared.phone || "Contato não disponível"}</Typography.Text></div>
                <div><Typography.Text type="secondary">Instrumento</Typography.Text><Typography.Title level={5}>{prepared.itemCount} questões</Typography.Title><Typography.Text>Duração estimada: {prepared.estimatedMinutes} min</Typography.Text></div>
              </Space>
            </PrismaCard>
            <PrismaCard title="Convite">
              <Alert message="O Prisma gerará um link seguro para compartilhamento manual. Nenhuma mensagem será enviada automaticamente." showIcon type="info" />
              <Form<InviteFormValues>
                form={form}
                initialValues={{
                  deliveryChannel: "link",
                  validDays: 7,
                  resultVisibility: "completion_only",
                  message: `Olá ${prepared.personName}, você foi convidado para realizar uma verificação de competências em ${prepared.competency}, nível ${labelLevel(prepared.targetLevel)}.`,
                }}
                layout="vertical"
                onFinish={(values) => void emit(values)}
              >
                <Form.Item label="Canal pretendido" name="deliveryChannel"><Radio.Group><Radio value="link">Link</Radio><Radio value="email">E-mail</Radio><Radio value="whatsapp">WhatsApp</Radio></Radio.Group></Form.Item>
                <Form.Item label="Validade" name="validDays"><Select options={[1, 3, 7, 14].map((value) => ({ value, label: `${value} dia${value > 1 ? "s" : ""}` }))} /></Form.Item>
                <Form.Item label="Resultado visível para a Pessoa" name="resultVisibility"><Select options={[{ value: "completion_only", label: "Somente conclusão, padrão seguro" }, { value: "summary", label: "Resumo de desempenho" }, { value: "detailed", label: "Resumo detalhado por dimensão" }]} /></Form.Item>
                <Form.Item label="Prévia da mensagem" name="message"><Input.TextArea maxLength={2000} rows={5} /></Form.Item>
                <Button htmlType="submit" loading={issuing} type="primary">Emitir convite</Button>
              </Form>
            </PrismaCard>
            {issued ? (
              <PrismaCard title="Convite emitido">
                <Alert message="Este link pessoal é exibido apenas agora. Copie-o antes de sair desta tela." showIcon type="success" />
                <div className="prisma-invitation-link"><Input aria-label="Link da verificação" readOnly value={verificationUrl} /><Button icon={<CopyOutlined />} onClick={() => void navigator.clipboard.writeText(verificationUrl).then(() => message.success("Link copiado."))}>Copiar link</Button><Button icon={<LinkOutlined />} onClick={() => window.open(verificationUrl, "_blank", "noopener,noreferrer")}>Abrir</Button></div>
              </PrismaCard>
            ) : null}
          </>
        ) : null}
      </PrismaPage>
    );
  }

  const columns: ColumnsType<VerificationMonitoringRow> = [
    { title: "Pessoa", dataIndex: "personName", key: "personName", ellipsis: true, width: 150 },
    { title: "Competência", dataIndex: "competency", key: "competency", ellipsis: true, responsive: ["sm"], width: 120 },
    { title: "Nível", dataIndex: "targetLevel", key: "targetLevel", render: (value) => labelLevel(value), responsive: ["md"], width: 100 },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <StatusTag status={value} />, width: 112 },
    { title: "Prazo", dataIndex: "expiresAt", key: "expiresAt", render: (value) => new Date(value).toLocaleDateString("pt-BR"), responsive: ["lg"], width: 112 },
    { title: "Progresso", dataIndex: "progress", key: "progress", render: (value, row) => <VerificationProgress row={row} value={value} />, responsive: ["sm"], width: 160 },
    { title: "Ação", key: "action", render: (_, row) => <Button aria-label={`Abrir verificação de ${row.personName}`} onClick={() => setSelected(row)} size="small">Abrir</Button>, width: 58 },
  ];
  return (
    <PrismaPage className="prisma-m51b-operator-page">
      <PrismaPageHeader title="Verificações" description="Acompanhe convites, andamento, resultados e qualidade das evidências." actions={<Button disabled={!workspace?.preparedAssessments.length} icon={<PlusOutlined />} onClick={() => workspace?.preparedAssessments[0] && onNavigate(`/verifications/new/${workspace.preparedAssessments[0].id}`)} type="primary">Nova verificação</Button>} />
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <PrismaCard>
        <Tabs activeKey={tab} items={[{ key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" }, { key: "in_progress", label: "Em andamento" }, { key: "completed", label: "Concluídas" }, { key: "expired", label: "Encerradas" }]} onChange={setTab} />
        <Input.Search allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pessoa, competência ou status" value={search} />
        <Table className="prisma-responsive-table prisma-verification-table" columns={columns} dataSource={filtered} loading={loading} pagination={{ pageSize: 8 }} rowKey="invitationId" tableLayout="fixed" />
      </PrismaCard>
      <Drawer onClose={() => setSelected(null)} open={Boolean(selected)} title="Resultado da verificação" width={560}>
        {selected ? <VerificationDetail value={selected} /> : null}
      </Drawer>
    </PrismaPage>
  );
}

function verificationStatus(status: VerificationMonitoringRow["status"]): { label: string; tone: PrismaStatusTone } {
  const config: Record<VerificationMonitoringRow["status"], { label: string; tone: PrismaStatusTone }> = {
    pending: { label: "Pendente", tone: "neutral" }, opened: { label: "Aberta", tone: "info" }, in_progress: { label: "Em andamento", tone: "purple" }, paused: { label: "Pausada", tone: "warning" }, completed: { label: "Concluída", tone: "success" }, inconclusive: { label: "Inconclusiva", tone: "warning" }, expired: { label: "Expirada", tone: "danger" }, cancelled: { label: "Cancelada", tone: "neutral" }, revoked: { label: "Revogada", tone: "danger" },
  };
  return config[status];
}

function StatusTag({ status }: { status: VerificationMonitoringRow["status"] }) {
  const presentation = verificationStatus(status);
  return <PrismaStatusTag compact label={presentation.label} tone={presentation.tone} />;
}

function VerificationProgress({ row, value }: { row: VerificationMonitoringRow; value: number }) {
  if (["expired", "cancelled", "revoked"].includes(row.status)) return <Typography.Text type="secondary">Encerrada</Typography.Text>;
  if (["pending", "opened"].includes(row.status) && value === 0) return <Typography.Text type="secondary">Não iniciada</Typography.Text>;
  return <Progress format={(percent) => `${percent ?? 0}%`} percent={value} size="small" status={value === 100 ? "success" : "normal"} />;
}

function labelConfidence(value: VerificationMonitoringRow["confidenceState"]) {
  if (!value) return "Ainda não avaliada";
  const labels: Record<NonNullable<VerificationMonitoringRow["confidenceState"]>, string> = {
    high: "Alta",
    adequate: "Adequada",
    reduced: "Reduzida",
    inconclusive: "Inconclusiva",
  };
  return labels[value];
}

function labelIntegrity(value: VerificationMonitoringRow["integrityState"]) {
  if (!value) return "Ainda não avaliada";
  const labels: Record<NonNullable<VerificationMonitoringRow["integrityState"]>, string> = {
    adequate: "Adequada",
    reduced: "Reduzida",
    inconclusive: "Inconclusiva",
  };
  return labels[value];
}

function VerificationDetail({ value }: { value: VerificationMonitoringRow }) {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Descriptions bordered column={1} size="small" items={[
        { key: "person", label: "Pessoa", children: value.personName },
        { key: "competency", label: "Competência", children: `${value.competency} · ${labelLevel(value.targetLevel)}` },
        { key: "status", label: "Status", children: <StatusTag status={value.status} /> },
        { key: "confidence", label: "Confiança da evidência", children: labelConfidence(value.confidenceState) },
        { key: "integrity", label: "Integridade da execução", children: labelIntegrity(value.integrityState) },
      ]} />
      {value.rawResult ? <PrismaCard title="Resultado bruto"><Progress type="circle" percent={value.rawResult.percentage} /><Typography.Paragraph>{value.rawResult.correct} corretas, {value.rawResult.incorrect} incorretas e {value.rawResult.unanswered} não respondidas. O resultado bruto não é alterado por sinais de integridade.</Typography.Paragraph></PrismaCard> : <Empty description="A tentativa ainda não possui avaliação." />}
      <Alert message="Mudanças de foco, visibilidade e interrupções são condições observadas. Não constituem prova de conduta ou fraude." showIcon type="info" />
    </Space>
  );
}
