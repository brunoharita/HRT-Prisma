import { useEffect, useMemo, useState } from "react";
import { CopyOutlined, LinkOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, List, Popconfirm, Progress, Radio, Select, Space, Table, Tabs, Typography, message } from "antd";
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
import { useViewState, useUnsavedChanges } from "../ui/PrismaNavigation";
import { PrismaState } from "../ui/PrismaState";
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
  const [search, setSearch] = useViewState("search", "");
  const [tab, setTab] = useViewState("tab", "all");
  const [selected, setSelected] = useState<VerificationMonitoringRow | null>(null);
  const [form] = Form.useForm<InviteFormValues>();
  const [dirty, setDirty] = useState(false);
  const [linkHandled, setLinkHandled] = useState(false);
  const markSaved = useUnsavedChanges((dirty && !issued) || Boolean(issued && !linkHandled));

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
        || (tab === "completed" && item.status === "completed")
        || (tab === "inconclusive" && item.status === "inconclusive")
        || (tab === "expired" && ["expired", "cancelled", "revoked"].includes(item.status));
      return tabMatches && (!normalized || `${item.personName} ${item.vacancyTitle ?? ""} ${item.requirementLabel ?? ""} ${item.competency} ${verificationStatus(item.status).label}`.toLowerCase().includes(normalized));
    });
  }, [search, tab, workspace?.verifications]);

  const emit = async (values: InviteFormValues) => {
    if (!prepared) return;
    try {
      setIssuing(true);
      const result = await competencyVerificationService.issueInvitation({ preparedAssessmentId: prepared.id, ...values });
      setDirty(false); markSaved();
      setLinkHandled(false);
      setIssued(result);
      await load();
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Não foi possível emitir o convite.");
    } finally {
      setIssuing(false);
    }
  };

  const verificationUrl = issued ? `${window.location.origin}${issued.relativePath}` : "";
  const validDays = Form.useWatch("validDays", form) ?? 7;
  const expiryDate = new Date(Date.now() + Number(validDays) * 86400000);
  async function copyInvitationLink() {
    try { await navigator.clipboard.writeText(verificationUrl); setLinkHandled(true); markSaved(); message.success("Link copiado."); }
    catch { message.error("Não foi possível copiar automaticamente. Selecione o endereço no campo e copie manualmente."); }
  }
  if (preparedAssessmentId) {
    return (
      <PrismaPage className="prisma-m51b-operator-page">
        <PrismaPageHeader title="Gerar link de convite" description="Gere um acesso pessoal para a verificação preparada. Nenhuma mensagem externa será enviada automaticamente." />
        <Button onClick={() => onNavigate("/verifications")} type="link">Voltar para verificações</Button>
        {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
        {!prepared && !loading ? <PrismaCard><Empty description="Instrumento preparado não encontrado." /></PrismaCard> : null}
        {prepared ? (
          <>
            <PrismaCard className="prisma-m51b-context-card">
              <Space align="start" size="large" wrap>
                <SafetyCertificateOutlined className="prisma-m51b-context-icon" />
                <div><Typography.Text type="secondary">Verificação a ser aplicada</Typography.Text><Typography.Title level={4}>{prepared.competency} · {labelLevel(prepared.targetLevel)}</Typography.Title><Typography.Text>{prepared.context ?? "Necessidade profissional"} · {prepared.requirementLabel ?? prepared.competency} · {labelCriticality(prepared.criticality)}</Typography.Text></div>
                <div><Typography.Text type="secondary">Pessoa</Typography.Text><Typography.Title level={5}>{prepared.personName}</Typography.Title><Typography.Text>{prepared.email || prepared.phone || "Contato não disponível"}</Typography.Text></div>
                <div><Typography.Text type="secondary">Instrumento</Typography.Text><Typography.Title level={5}>{prepared.itemCount} questões</Typography.Title><Typography.Text>Duração estimada: {prepared.estimatedMinutes} min</Typography.Text></div>
              </Space>
              <Descriptions column={{ xs: 1, md: 3 }} size="small" items={[{ key: "position", label: "Versão da Posição", children: prepared.vacancyVersion ? `Definição v${prepared.vacancyVersion}` : "Histórica" }, { key: "policy", label: "Política", children: policyRequirementLabel(prepared.policyRequirement) }, { key: "instrument", label: "Versões do instrumento", children: `${prepared.definitionVersion ?? "-"} · ${prepared.blueprintVersion ?? "-"} · ${prepared.rubricVersion ?? "-"}` }]} />
            </PrismaCard>
            <PrismaCard title="Convite">
              <Alert message="O Prisma gerará um link seguro para compartilhamento manual. Nenhuma mensagem será enviada automaticamente." showIcon type="info" />
              <Form<InviteFormValues>
                onValuesChange={() => setDirty(true)}
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
                <Form.Item label="Como você pretende compartilhar o link?" name="deliveryChannel" extra="O Prisma apenas registra sua intenção. O envio será manual."><Radio.Group><Radio value="link">Copiar link</Radio><Radio value="email">E-mail, envio manual</Radio><Radio value="whatsapp">WhatsApp, envio manual</Radio></Radio.Group></Form.Item>
                <Form.Item label="Validade" name="validDays" extra={`O convite expirará em ${expiryDate.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}.`}><Select options={[1, 3, 7, 14].map((value) => ({ value, label: `${value} dia${value > 1 ? "s" : ""}` }))} /></Form.Item>
                <Form.Item label="O que a Pessoa verá ao concluir?" name="resultVisibility"><Select options={[{ value: "completion_only", label: "Confirmação de conclusão" }, { value: "summary", label: "Resumo do resultado" }, { value: "detailed", label: "Resultado por dimensão" }]} /></Form.Item>
                <Form.Item label="Prévia da mensagem" name="message"><Input.TextArea maxLength={2000} rows={5} /></Form.Item>
                <Button htmlType="submit" loading={issuing} type="primary">Gerar link de convite</Button>
              </Form>
            </PrismaCard>
            {issued ? (
              <PrismaCard title="Link de convite gerado">
                <Alert message={linkHandled ? "Link pronto para compartilhamento manual." : "Este link pessoal é exibido apenas agora. Copie ou abra o convite antes de sair."} showIcon type="success" />
                <div className="prisma-invitation-link"><Input aria-label="Link da verificação" onFocus={(event) => event.currentTarget.select()} readOnly value={verificationUrl} /><Button icon={<CopyOutlined />} onClick={() => void copyInvitationLink()}>Copiar link</Button><Button icon={<LinkOutlined />} onClick={() => { setLinkHandled(true); markSaved(); window.open(verificationUrl, "_blank", "noopener,noreferrer"); }}>Abrir página do convite</Button></div>
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
    { title: "Posição e requisito", key: "context", ellipsis: true, responsive: ["lg"], width: 190, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text>{row.vacancyTitle ?? "Sem Posição"}</Typography.Text><Typography.Text type="secondary">{row.requirementLabel ?? row.competency}</Typography.Text></Space> },
    { title: "Nível", dataIndex: "targetLevel", key: "targetLevel", render: (value) => labelLevel(value), responsive: ["md"], width: 100 },
    { title: "Status", dataIndex: "status", key: "status", render: (value) => <StatusTag status={value} />, width: 112 },
    { title: "Prazo", dataIndex: "expiresAt", key: "expiresAt", render: (value) => new Date(value).toLocaleDateString("pt-BR"), responsive: ["lg"], width: 112 },
    { title: "Progresso", dataIndex: "progress", key: "progress", render: (value, row) => <VerificationProgress row={row} value={value} />, responsive: ["sm"], width: 160 },
    { title: "Ação", key: "action", render: (_, row) => <Button aria-label={`Abrir verificação de ${row.personName}`} onClick={() => setSelected(row)} size="small">Abrir</Button>, width: 58 },
  ];
  return (
    <PrismaPage className="prisma-m51b-operator-page">
      <PrismaPageHeader title="Verificações" description="Acompanhe convites, andamento, resultados e qualidade das evidências." actions={<Button icon={<PlusOutlined />} onClick={() => onNavigate("/matching")} type="primary">Preparar verificação</Button>} />
      {workspace?.preparedAssessments.length ? <PrismaCard title="Preparações disponíveis"><Select aria-label="Escolher pessoa e verificação para gerar convite" placeholder="Escolha uma preparação para gerar o convite" style={{ width: "100%" }} options={workspace.preparedAssessments.map((item) => ({ value: item.id, label: `${item.personName} · ${item.competency} · ${labelLevel(item.targetLevel)}` }))} onChange={(id) => onNavigate(`/verifications/new/${id}`)} /></PrismaCard> : null}
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <PrismaCard>
        <Tabs activeKey={tab} items={[{ key: "all", label: "Todas" }, { key: "pending", label: "Pendentes" }, { key: "in_progress", label: "Em andamento" }, { key: "completed", label: "Concluídas" }, { key: "inconclusive", label: "Inconclusivas" }, { key: "expired", label: "Encerradas" }]} onChange={setTab} />
        <Input.Search allowClear onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por Pessoa, Posição, requisito, competência ou status" value={search} />
        <Table locale={{ emptyText: <PrismaState compact kind={loading ? "loading" : error ? "error" : search || tab !== "all" ? "filtered" : "empty"} description={error ?? (search || tab !== "all" ? "Ajuste a busca ou as abas para encontrar a verificação." : "Prepare uma verificação para gerar o primeiro convite.")} action={error ? { label: "Tentar novamente", onClick: () => void load() } : search || tab !== "all" ? { label: "Limpar filtros", onClick: () => { setSearch(""); setTab("all"); } } : { label: "Ver necessidades", onClick: () => onNavigate("/matching") }} /> }} className="prisma-responsive-table prisma-verification-table" columns={columns} dataSource={filtered} loading={loading} pagination={{ pageSize: 8 }} rowKey="invitationId" tableLayout="fixed" />
      </PrismaCard>
      <Drawer onClose={() => setSelected(null)} open={Boolean(selected)} title={selected ? `${verificationStatus(selected.status).label}: ${selected.requirementLabel ?? selected.competency}` : "Detalhes da verificação"} size="large">
        {selected ? <VerificationDetail onNavigate={onNavigate} onRefresh={load} value={selected} /> : null}
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

function VerificationDetail({ onNavigate, onRefresh, value }: { onNavigate: (path: string) => void; onRefresh: () => Promise<void>; value: VerificationMonitoringRow }) {
  const terminal = ["completed", "inconclusive", "expired", "cancelled", "revoked"].includes(value.status);
  async function manage(action: "cancel" | "revoke") { await competencyVerificationService.manageInvitation(value.invitationId, action); await onRefresh(); }
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Descriptions bordered column={1} size="small" items={[
        { key: "person", label: "Pessoa", children: value.personName },
        { key: "position", label: "Posição", children: <Button onClick={() => onNavigate(`/vacancies/${value.vacancyId}`)} type="link">{value.vacancyTitle ?? "Abrir Posição"}</Button> },
        { key: "positionVersion", label: "Versão da Posição", children: value.vacancyVersion ? `Definição v${value.vacancyVersion}` : "Histórica" },
        { key: "requirement", label: "Requisito", children: value.requirementLabel ?? value.competency },
        { key: "competency", label: "Competência", children: `${value.competency} · ${labelLevel(value.targetLevel)}` },
        { key: "policy", label: "Política", children: policyRequirementLabel(value.policyRequirement) },
        { key: "status", label: "Status", children: <StatusTag status={value.status} /> },
        { key: "confidence", label: "Confiança da evidência", children: labelConfidence(value.confidenceState) },
        { key: "integrity", label: "Integridade da execução", children: labelIntegrity(value.integrityState) },
      ]} />
      {value.rawResult ? <PrismaCard title="Resultado bruto"><Progress type="circle" percent={value.rawResult.percentage} /><Typography.Paragraph>{value.rawResult.correct} corretas, {value.rawResult.incorrect} incorretas e {value.rawResult.unanswered} não respondidas. O resultado bruto não é alterado por sinais de integridade.</Typography.Paragraph></PrismaCard> : <Empty description="A tentativa ainda não possui avaliação." />}
      {value.status === "completed" ? <Alert showIcon type="success" message={`Evidência Demonstrada registrada${value.demonstratedLevel && !["insufficient_evidence", "inconclusive"].includes(value.demonstratedLevel) ? ` no nível ${labelLevel(value.demonstratedLevel as "basic" | "intermediate" | "advanced")}` : ""}.`} description="Ela fortalece somente este requisito, nesta competência e nas versões registradas. O matching será reavaliado sem bônus genérico." /> : null}
      {value.status === "inconclusive" ? <Alert showIcon type="warning" message="Resultado inconclusivo" description="Nenhum ponto é acrescentado e a ausência de resultado não é tratada como falta de competência." /> : null}
      <PrismaCard title="Versões e método"><Descriptions column={1} size="small" items={Object.entries(value.versions ?? {}).filter(([, item]) => item).map(([key, item]) => ({ key, label: versionLabel(key), children: String(item) }))} /></PrismaCard>
      <PrismaCard title="Linha do tempo"><List dataSource={value.events ?? []} locale={{ emptyText: "Nenhum evento auditável disponível." }} renderItem={(event) => <List.Item><List.Item.Meta title={eventLabel(event.action)} description={`${new Date(event.createdAt).toLocaleString("pt-BR")} · ${event.result === "success" ? "Concluído" : "Falhou"}`} /></List.Item>} /></PrismaCard>
      <Alert message="Mudanças de foco, visibilidade e interrupções são condições observadas. Não constituem prova de conduta ou fraude." showIcon type="info" />
      {!terminal ? <Popconfirm title="Encerrar este convite?" description="A Pessoa não poderá continuar por este link. O histórico será preservado." okText="Encerrar convite" cancelText="Manter ativo" onConfirm={() => void manage(value.status === "pending" ? "cancel" : "revoke")}><Button danger>{value.status === "pending" ? "Cancelar convite" : "Revogar acesso"}</Button></Popconfirm> : null}
    </Space>
  );
}

function policyRequirementLabel(value: string): string { return ({ none: "Sem exigência", optional: "Opcional", recommended: "Recomendada", required_by_policy: "Exigida pela política" } as Record<string, string>)[value] ?? "Não informada"; }
function versionLabel(value: string): string { return ({ definitionVersion: "Definição", blueprintVersion: "Modelo", rubricVersion: "Critérios", matchingVersion: "Matching", sufficiencyEngineVersion: "Suficiência", policyVersion: "Política", assessmentVersion: "Execução", evaluationVersion: "Avaliação", integrityRuleVersion: "Integridade" } as Record<string, string>)[value] ?? value; }
function eventLabel(value: string): string { return ({ m62_contextual_need_created: "Necessidade criada", m62_contextual_need_reused: "Necessidade reutilizada", m51a_assessment_prepared: "Instrumento preparado", invitation_issued: "Convite gerado", invitation_cancelled: "Convite cancelado", invitation_revoked: "Convite revogado", m51b_assessment_evaluated: "Resultado avaliado" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }
