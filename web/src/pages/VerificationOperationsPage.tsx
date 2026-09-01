import { useEffect, useMemo, useState } from "react";
import { CopyOutlined, LinkOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, Progress, Radio, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
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
      return tabMatches && (!normalized || `${item.personName} ${item.competency} ${item.status}`.toLowerCase().includes(normalized));
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
        {!prepared && !loading ? <PrismaCard><Empty description="Assessment preparado não encontrado." /></PrismaCard> : null}
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
              <Alert message="Envio automático por e-mail ainda não configurado. O Prisma emitirá um link para cópia manual em QA." showIcon type="info" />
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
                <Form.Item label="Preview da mensagem" name="message"><Input.TextArea maxLength={2000} rows={5} /></Form.Item>
                <Button htmlType="submit" loading={issuing} type="primary">Emitir convite</Button>
              </Form>
            </PrismaCard>
            {issued ? (
              <PrismaCard title="Convite emitido">
                <Alert message="O token bruto é exibido somente nesta emissão. Copie o link agora para o smoke em sessão separada ou anônima." showIcon type="success" />
                <Input.Group compact><Input aria-label="Link da verificação" readOnly style={{ width: "calc(100% - 210px)" }} value={verificationUrl} /><Button icon={<CopyOutlined />} onClick={() => void navigator.clipboard.writeText(verificationUrl).then(() => message.success("Link copiado."))}>Copiar link</Button><Button icon={<LinkOutlined />} onClick={() => window.open(verificationUrl, "_blank", "noopener,noreferrer")}>Abrir</Button></Input.Group>
              </PrismaCard>
            ) : null}
          </>
        ) : null}
      </PrismaPage>
    );
  }

  const columns: ColumnsType<VerificationMonitoringRow> = [
    { title: "Pessoa", dataIndex: "personName", key: "personName" },
    { title: "Competência", dataIndex: "competency", key: "competency" },
    { title: "Nível", dataIndex: "targetLevel", key: "targetLevel", render: (value) => labelLevel(value) },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <StatusTag status={value} /> },
    { title: "Prazo", dataIndex: "expiresAt", key: "expiresAt", render: (value) => new Date(value).toLocaleDateString("pt-BR") },
    { title: "Progresso", dataIndex: "progress", key: "progress", render: (value) => <Progress percent={value} size="small" status={value === 100 ? "success" : "normal"} /> },
    { title: "Ação", key: "action", render: (_, row) => <Button onClick={() => setSelected(row)} size="small">Abrir</Button> },
  ];
  return (
    <PrismaPage className="prisma-m51b-operator-page">
      <PrismaPageHeader title="Verificações" description="Acompanhe convites, tentativas, resultados e força metodológica da evidência." actions={<Button icon={<PlusOutlined />} onClick={() => workspace?.preparedAssessments[0] && onNavigate(`/verifications/new/${workspace.preparedAssessments[0].id}`)} type="primary">Nova verificação</Button>} />
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <PrismaCard>
        <Tabs activeKey={tab} items={[{ key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" }, { key: "in_progress", label: "Em andamento" }, { key: "completed", label: "Concluídas" }, { key: "expired", label: "Expiradas" }]} onChange={setTab} />
        <Input.Search allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pessoa, competência ou status" value={search} />
        <Table columns={columns} dataSource={filtered} loading={loading} pagination={{ pageSize: 8 }} rowKey="invitationId" scroll={{ x: 900 }} />
      </PrismaCard>
      <Drawer onClose={() => setSelected(null)} open={Boolean(selected)} title="Resultado da verificação" width={560}>
        {selected ? <VerificationDetail value={selected} /> : null}
      </Drawer>
    </PrismaPage>
  );
}

function StatusTag({ status }: { status: VerificationMonitoringRow["status"] }) {
  const config: Record<VerificationMonitoringRow["status"], { color: string; label: string }> = {
    pending: { color: "default", label: "Pendente" }, opened: { color: "blue", label: "Aberta" }, in_progress: { color: "processing", label: "Em andamento" }, paused: { color: "warning", label: "Pausada" }, completed: { color: "success", label: "Concluída" }, inconclusive: { color: "warning", label: "Inconclusiva" }, expired: { color: "error", label: "Expirada" }, cancelled: { color: "default", label: "Cancelada" }, revoked: { color: "error", label: "Revogada" },
  };
  return <Tag color={config[status].color}>{config[status].label}</Tag>;
}

function VerificationDetail({ value }: { value: VerificationMonitoringRow }) {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Descriptions bordered column={1} size="small" items={[
        { key: "person", label: "Pessoa", children: value.personName },
        { key: "competency", label: "Competência", children: `${value.competency} · ${labelLevel(value.targetLevel)}` },
        { key: "status", label: "Status", children: <StatusTag status={value.status} /> },
        { key: "confidence", label: "Confiança da evidência", children: value.confidenceState ?? "Ainda não avaliada" },
        { key: "integrity", label: "Integridade da execução", children: value.integrityState ?? "Ainda não avaliada" },
      ]} />
      {value.rawResult ? <PrismaCard title="Resultado bruto"><Progress type="circle" percent={value.rawResult.percentage} /><Typography.Paragraph>{value.rawResult.correct} corretas, {value.rawResult.incorrect} incorretas e {value.rawResult.unanswered} não respondidas. O resultado bruto não é alterado por sinais de integridade.</Typography.Paragraph></PrismaCard> : <Empty description="A tentativa ainda não possui avaliação." />}
      <Alert message="Mudanças de foco, visibilidade e interrupções são condições observadas. Não constituem prova de conduta ou fraude." showIcon type="info" />
    </Space>
  );
}
