import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ApiOutlined, BarChartOutlined, BranchesOutlined, CheckCircleOutlined, ExperimentOutlined,
  GlobalOutlined, RobotOutlined, SafetyCertificateOutlined, SettingOutlined,
} from "@ant-design/icons";
import { Alert, Button, Descriptions, Divider, Drawer, Empty, Input, InputNumber, Modal, Progress, Radio, Select, Skeleton, Space, Statistic, Steps, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { GenerationProposalView, GovernedItemView, ItemBankGapView, ItemBankGovernanceWorkspace } from "../domain/assessmentItemGovernanceData";
import { labelAssessmentDimension, labelLevel } from "../domain/competencyVerificationData";
import { assessmentItemGovernanceService } from "../infrastructure/supabase/assessmentItemGovernanceService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaStatusTag, type PrismaStatusTone } from "../ui/PrismaStatusTag";

interface Props { activeMembership: OrganizationMembership; }
type Surface = "gaps" | "generation" | "proposals" | "global" | "analytics" | "calibration" | "versions" | "organization" | "settings";

export function AssessmentItemBankPage({ activeMembership }: Props) {
  const [workspace, setWorkspace] = useState<ItemBankGovernanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [surface, setSurface] = useState<Surface>("gaps");
  const [generationGap, setGenerationGap] = useState<ItemBankGapView | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [targetScope, setTargetScope] = useState<"global" | "organization">("organization");
  const [reviewProposal, setReviewProposal] = useState<GenerationProposalView | null>(null);
  const [reviewRationale, setReviewRationale] = useState("Aderente ao modelo de avaliação e pronto para uso sintético controlado.");
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<GovernedItemView | null>(null);

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const nextWorkspace = await assessmentItemGovernanceService.loadWorkspace(activeMembership.organizationId);
      setWorkspace(nextWorkspace);
      setSelectedItem((current) => current ? nextWorkspace.items.find((item) => item.id === current.id) ?? null : null);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar o Banco de Itens."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    setGenerationGap(null);
    setTargetScope("organization");
    setSelectedProposalIds([]);
    setSelectedItem(null);
    void refresh();
  }, [activeMembership.organizationId]);

  async function runFakeGeneration() {
    if (!generationGap) return;
    setSaving(true); setError(null);
    try {
      await assessmentItemGovernanceService.createFakeGeneration({ organizationId: activeMembership.organizationId, blueprintId: generationGap.blueprintId, dimension: generationGap.dimension, quantity, targetScope });
      setGenerationStep(2); setInfo(`${quantity} proposta(s) sintética(s) criada(s), sem modelo externo, sem dados pessoais e sem custo externo.`); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha na geração sintética."); }
    finally { setSaving(false); }
  }

  async function decideProposal(decision: "approve" | "reject" | "request_changes") {
    if (!reviewProposal) return;
    setSaving(true); setError(null);
    try {
      await assessmentItemGovernanceService.reviewProposal(reviewProposal.id, decision, reviewRationale);
      setReviewProposal(null); setInfo("Revisão humana registrada com histórico preservado."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao revisar proposta."); }
    finally { setSaving(false); }
  }

  async function publishSelected() {
    setSaving(true); setError(null);
    try {
      await assessmentItemGovernanceService.publishApproved(activeMembership.organizationId, selectedProposalIds);
      setSelectedProposalIds([]); setInfo("Itens aprovados publicados com proveniência e aprovação humana preservadas."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao publicar propostas."); }
    finally { setSaving(false); }
  }

  async function refreshSyntheticAnalytics(item: GovernedItemView) {
    setSaving(true); setError(null);
    try {
      await assessmentItemGovernanceService.refreshSyntheticAnalytics(activeMembership.organizationId, item.id);
      setInfo("Prévia analítica sintética atualizada. Ela não promove calibração real.");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Falha ao atualizar a prévia analítica."); }
    finally { setSaving(false); }
  }

  if (loading && !workspace) return <PrismaPage className="prisma-m51c-page"><Skeleton active paragraph={{ rows: 12 }} /></PrismaPage>;
  if (!workspace) return <PrismaPage className="prisma-m51c-page"><PrismaPageHeader title="Banco de Itens" description="Governança, escala e calibração." />{error ? <Alert message={error} type="error" showIcon /> : <Empty />}</PrismaPage>;

  const surfaceGroups: Array<{ label: string; items: Array<{ key: Surface; label: string; icon: ReactNode }> }> = [{
    label: "Operação",
    items: [
    { key: "gaps", label: "Lacunas", icon: <BranchesOutlined /> },
    { key: "generation", label: "Geração", icon: <RobotOutlined /> },
    { key: "proposals", label: "Revisão", icon: <SafetyCertificateOutlined /> },
    ],
  }, {
    label: "Governança",
    items: [
    { key: "global", label: "Banco global", icon: <GlobalOutlined /> },
    { key: "analytics", label: "Desempenho", icon: <BarChartOutlined /> },
    { key: "calibration", label: "Calibração", icon: <ExperimentOutlined /> },
    { key: "versions", label: "Versões", icon: <ApiOutlined /> },
    { key: "organization", label: "Banco privado", icon: <GlobalOutlined /> },
    { key: "settings", label: "Configurações", icon: <SettingOutlined /> },
    ],
  }];
  return (
    <PrismaPage className="prisma-m51c-page">
      <PrismaPageHeader title="Banco de Itens" description="IA, escala, governança e calibração com revisão humana obrigatória." actions={<Button onClick={() => void refresh()}>Atualizar</Button>} />
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {info ? <Alert closable message={info} onClose={() => setInfo(null)} showIcon type="success" /> : null}
      <PrismaCard className="prisma-m51c-navigation">
        {surfaceGroups.map((group) => <div className="prisma-m51c-navigation__group" key={group.label}><span>{group.label}</span><div>{group.items.map((item) => <button aria-current={surface === item.key ? "page" : undefined} className={surface === item.key ? "is-active" : ""} key={item.key} onClick={() => setSurface(item.key)} type="button">{item.icon}{item.label}</button>)}</div></div>)}
      </PrismaCard>
      {surface === "gaps" ? <GapSurface gaps={workspace.gaps} onGenerate={(gap) => { setGenerationGap(gap); setQuantity(Math.min(Math.max(gap.deficit, 1), 5)); setGenerationStep(0); setSurface("generation"); }} /> : null}
      {surface === "generation" ? <GenerationSurface canPublishGlobal={activeMembership.role === "super_admin"} gap={generationGap ?? workspace.gaps.find((gap) => gap.deficit > 0) ?? null} onBack={() => setSurface("gaps")} onRun={runFakeGeneration} onStep={setGenerationStep} quantity={quantity} saving={saving} setQuantity={setQuantity} setTargetScope={setTargetScope} step={generationStep} targetScope={targetScope} policy={workspace.policy} requests={workspace.requests} /> : null}
      {surface === "proposals" ? <ProposalSurface proposals={workspace.proposals} selectedIds={selectedProposalIds} onReview={setReviewProposal} onSelection={setSelectedProposalIds} onPublish={() => void publishSelected()} saving={saving} /> : null}
      {surface === "global" ? <BankSurface items={workspace.items.filter((item) => item.scope === "global")} title="Banco de itens global" onSelect={setSelectedItem} /> : null}
      {surface === "analytics" ? <AnalyticsSurface items={workspace.items} onSelect={setSelectedItem} /> : null}
      {surface === "calibration" ? <CalibrationSurface item={selectedItem ?? workspace.items[0] ?? null} onRefresh={(item) => void refreshSyntheticAnalytics(item)} onSelect={setSelectedItem} items={workspace.items} saving={saving} /> : null}
      {surface === "versions" ? <VersionsSurface items={workspace.items} /> : null}
      {surface === "organization" ? <BankSurface items={workspace.items.filter((item) => item.scope === "organization")} notice="Itens da empresa não são compartilhados com outras organizações e não são promovidos automaticamente ao banco global." title="Banco privado da empresa" onSelect={setSelectedItem} /> : null}
      {surface === "settings" ? <SettingsSurface workspace={workspace} /> : null}
      <ProposalReviewModal proposal={reviewProposal} rationale={reviewRationale} saving={saving} onRationale={setReviewRationale} onClose={() => setReviewProposal(null)} onDecision={(decision) => void decideProposal(decision)} />
      <ItemAnalyticsDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </PrismaPage>
  );
}

function GapSurface({ gaps, onGenerate }: { gaps: ItemBankGapView[]; onGenerate: (gap: ItemBankGapView) => void }) {
  const columns: ColumnsType<ItemBankGapView> = [
    { title: "Modelo", dataIndex: "blueprintKey", ellipsis: true, width: 160 }, { title: "Dimensão", dataIndex: "dimension", render: labelAssessmentDimension, width: 170 },
    { title: "Nível", dataIndex: "targetLevel", render: labelLevel, responsive: ["md"], width: 100 }, { title: "Disponíveis", dataIndex: "eligibleItems", responsive: ["lg"], width: 100 },
    { title: "Necessários", dataIndex: "requiredItems", responsive: ["lg"], width: 100 }, { title: "Faltantes", dataIndex: "deficit", render: (value) => <PrismaStatusTag compact label={String(value)} tone={value > 0 ? "danger" : "success"} />, width: 100 },
    { title: "Ação", render: (_, gap) => <Button disabled={gap.deficit === 0} onClick={() => onGenerate(gap)} type="primary">Gerar</Button>, width: 86 },
  ];
  return <PrismaCard title="1. Lacunas do banco de itens" extra={<PrismaStatusTag compact label="Prioriza reutilização" tone="info" />}><Typography.Paragraph type="secondary">A lacuna considera apenas itens ativos, compatíveis e elegíveis. A reserva de diversidade evita montar instrumentos sempre com o mesmo conjunto.</Typography.Paragraph><Table className="prisma-responsive-table" columns={columns} dataSource={gaps} pagination={false} rowKey="key" tableLayout="fixed" /></PrismaCard>;
}

function GenerationSurface(props: { canPublishGlobal: boolean; gap: ItemBankGapView | null; step: number; onStep: (value: number) => void; quantity: number; setQuantity: (value: number) => void; targetScope: "global" | "organization"; setTargetScope: (value: "global" | "organization") => void; saving: boolean; onRun: () => Promise<void>; onBack: () => void; policy: ItemBankGovernanceWorkspace["policy"]; requests: ItemBankGovernanceWorkspace["requests"] }) {
  if (!props.gap) return <PrismaCard title="2. Solicitar geração por IA"><Empty description="Nenhuma lacuna elegível para geração." /></PrismaCard>;
  return <Space direction="vertical" size={16} className="prisma-m51c-full">
    <PrismaCard title="2. Solicitar geração por IA"><Steps current={props.step} items={[{ title: "Definição" }, { title: "Parâmetros" }, { title: "Revisão" }]} /></PrismaCard>
    {props.step === 0 ? <PrismaCard title="Modelo de avaliação e contexto"><Descriptions column={{ xs: 1, md: 2 }} items={[{ key: "blueprint", label: "Modelo", children: props.gap.blueprintKey }, { key: "dimension", label: "Dimensão", children: labelAssessmentDimension(props.gap.dimension) }, { key: "level", label: "Nível", children: labelLevel(props.gap.targetLevel) }, { key: "gap", label: "Itens faltantes", children: props.gap.deficit }]} /><Button onClick={() => props.onStep(1)} type="primary">Próximo</Button></PrismaCard> : null}
    {props.step === 1 ? <PrismaCard title="Parâmetros e política"><Space direction="vertical" size={14}><Typography.Text>Quantidade de itens</Typography.Text><InputNumber min={1} max={Math.min(props.gap.deficit, 5)} value={props.quantity} onChange={(value) => props.setQuantity(Number(value ?? 1))} /><Typography.Text>Escopo de publicação proposto</Typography.Text><Radio.Group value={props.targetScope} onChange={(event) => props.setTargetScope(event.target.value)}><Radio value="organization">Banco privado da empresa</Radio><Radio disabled={!props.canPublishGlobal} value="global">Banco global, somente administração central</Radio></Radio.Group><Alert message="Dados pessoais e pesquisa externa permanecem bloqueados. Toda proposta exige revisão humana." type="info" showIcon /><Space><Button onClick={() => props.onStep(0)}>Voltar</Button><Button onClick={() => props.onStep(2)} type="primary">Revisar</Button></Space></Space></PrismaCard> : null}
    {props.step === 2 ? <PrismaCard title="3. Geração e revisão do pedido"><Descriptions column={{ xs: 1, md: 2 }} items={[{ key: "provider", label: "Modo da demonstração", children: "Simulação determinística" }, { key: "cost", label: "Custo externo", children: "R$ 0,00" }, { key: "quantity", label: "Quantidade", children: props.quantity }, { key: "scope", label: "Destino proposto", children: props.targetScope === "global" ? "Banco global" : "Banco privado da empresa" }]} /><Alert message={props.policy.generationEnabled ? "A geração externa está autorizada, mas esta demonstração continua usando uma simulação sem custo." : "A geração externa está desativada. A simulação permite validar o fluxo sem enviar dados a um modelo externo."} type="warning" showIcon /><Space><Button onClick={() => props.onStep(1)}>Voltar</Button><Button loading={props.saving} onClick={() => void props.onRun()} type="primary">Gerar propostas sintéticas</Button></Space></PrismaCard> : null}
    {props.requests.length ? <PrismaCard title="Gerações recentes"><Table dataSource={props.requests} pagination={false} rowKey="id" columns={[{ title: "Pedido", dataIndex: "id", ellipsis: true }, { title: "Provedor", dataIndex: "provider" }, { title: "Quantidade", dataIndex: "quantity" }, { title: "Status", dataIndex: "status", render: statusTag }]} /></PrismaCard> : null}
  </Space>;
}

function ProposalSurface(props: { proposals: GenerationProposalView[]; selectedIds: string[]; onSelection: (ids: string[]) => void; onReview: (proposal: GenerationProposalView) => void; onPublish: () => void; saving: boolean }) {
  const approved = props.proposals.filter((proposal) => proposal.status === "approved").map((proposal) => proposal.id);
  const columns: ColumnsType<GenerationProposalView> = [
    { title: "Item", render: (_, proposal) => <Space direction="vertical" size={2}><Typography.Text strong>{proposal.item.key}</Typography.Text><Typography.Text ellipsis type="secondary">{proposal.item.stem}</Typography.Text></Space> },
    { title: "Dimensão", dataIndex: ["item", "dimension"], render: labelAssessmentDimension, width: 160 }, { title: "Nível", dataIndex: ["item", "targetLevel"], render: labelLevel, width: 100 },
    { title: "Validação", render: (_, proposal) => <Space wrap><Tag color={proposal.validation.valid ? "green" : "red"}>{proposal.validation.valid ? "Estrutura válida" : "Inválido"}</Tag>{proposal.status === "duplicate_candidate" ? <Tag color="orange">Duplicidade forte</Tag> : proposal.similarity >= 0.65 ? <Tag color="gold">Similaridade possível</Tag> : <Tag>Sem duplicidade forte</Tag>}</Space> },
    { title: "Status", dataIndex: "status", render: statusTag }, { title: "Ações", render: (_, proposal) => <Button onClick={() => props.onReview(proposal)}>Revisar</Button> },
  ];
  return <Space direction="vertical" size={16} className="prisma-m51c-full"><PrismaCard title="4. Itens gerados pela IA" extra={<PrismaStatusTag compact label={`${props.proposals.length} propostas`} tone="info" />}><Alert message="Uma proposta só se torna item ativo depois da aprovação humana e da publicação." type="info" showIcon /><Table className="prisma-responsive-table" columns={columns} dataSource={props.proposals} pagination={false} rowKey="id" rowSelection={{ selectedRowKeys: props.selectedIds, onChange: (keys) => props.onSelection(keys.map(String)), getCheckboxProps: (proposal) => ({ disabled: proposal.status !== "approved" }) }} tableLayout="fixed" /></PrismaCard><PrismaCard title="6. Aprovação e publicação"><Space wrap><Typography.Text>{approved.length} aprovado(s), {props.proposals.filter((proposal) => proposal.status === "proposed").length} aguardando revisão.</Typography.Text><Button disabled={props.selectedIds.length === 0} loading={props.saving} onClick={props.onPublish} type="primary">Publicar aprovados ({props.selectedIds.length})</Button></Space></PrismaCard></Space>;
}

function ProposalReviewModal(props: { proposal: GenerationProposalView | null; rationale: string; saving: boolean; onRationale: (value: string) => void; onClose: () => void; onDecision: (decision: "approve" | "reject" | "request_changes") => void }) {
  return <Modal footer={null} onCancel={props.onClose} open={Boolean(props.proposal)} title="5. Revisão e comparação" width={920}>{props.proposal ? <Space direction="vertical" className="prisma-m51c-full" size={14}><div className="prisma-m51c-compare"><PrismaCard title="Proposta"><Typography.Paragraph strong>{props.proposal.item.stem}</Typography.Paragraph>{props.proposal.item.options.map((option) => <div key={option.id}>{option.id}. {option.label}</div>)}</PrismaCard><PrismaCard title="Controles"><Descriptions column={1} size="small" items={[{ key: "fingerprint", label: "Fingerprint", children: props.proposal.fingerprint.slice(0, 16) }, { key: "similarity", label: "Similaridade máxima", children: `${Math.round(props.proposal.similarity * 100)}%` }, { key: "duplicate", label: "Candidatos similares", children: props.proposal.duplicateCandidates?.length ? props.proposal.duplicateCandidates.map((candidate) => `${candidate.code} (${Math.round(candidate.similarity * 100)}%)`).join(", ") : "Nenhuma duplicidade forte" }, { key: "provider", label: "Provedor", children: props.proposal.provenance.provider }, { key: "schema", label: "Schema", children: props.proposal.provenance.schemaVersion }]} /></PrismaCard></div><Input.TextArea onChange={(event) => props.onRationale(event.target.value)} rows={3} value={props.rationale} /><Space wrap><Button danger loading={props.saving} onClick={() => props.onDecision("reject")}>Rejeitar</Button><Button loading={props.saving} onClick={() => props.onDecision("request_changes")}>Pedir ajustes</Button><Button icon={<CheckCircleOutlined />} loading={props.saving} onClick={() => props.onDecision("approve")} type="primary">Aprovar</Button></Space></Space> : null}</Modal>;
}

function BankSurface({ items, title, notice, onSelect }: { items: GovernedItemView[]; title: string; notice?: string; onSelect: (item: GovernedItemView) => void }) {
  return <PrismaCard title={title}>{notice ? <Alert message={notice} type="info" showIcon /> : null}<div className="prisma-m51c-stat-grid"><Statistic title="Itens" value={items.length} /><Statistic title="Ativos" value={items.filter((item) => item.state === "active").length} /><Statistic title="Em calibração" value={items.filter((item) => item.calibrationState === "collecting_data").length} /><Statistic title="Calibrados" value={items.filter((item) => item.calibrationState === "calibrated").length} /></div><ItemTable items={items} onSelect={onSelect} /></PrismaCard>;
}

function AnalyticsSurface({ items, onSelect }: { items: GovernedItemView[]; onSelect: (item: GovernedItemView) => void }) {
  return <PrismaCard title="8. Desempenho dos itens"><Alert message="Dificuldade definida e observada permanecem separadas. Dados sintéticos nunca promovem calibração real." type="info" showIcon /><ItemTable items={items} onSelect={onSelect} /></PrismaCard>;
}

function CalibrationSurface({ item, items, onSelect, onRefresh, saving }: { item: GovernedItemView | null; items: GovernedItemView[]; onSelect: (item: GovernedItemView) => void; onRefresh: (item: GovernedItemView) => void; saving: boolean }) {
  return <PrismaCard title="9. Calibração: dificuldade e tempo"><Space wrap><Select className="prisma-m51c-item-select" value={item?.id} onChange={(id) => { const selected = items.find((candidate) => candidate.id === id); if (selected) onSelect(selected); }} options={items.map((candidate) => ({ value: candidate.id, label: candidate.key }))} /><Button disabled={!item} loading={saving} onClick={() => item && onRefresh(item)}>Atualizar prévia sintética</Button></Space>{item ? <div className="prisma-m51c-calibration-grid"><Descriptions column={1} title="Definido" items={[{ key: "difficulty", label: "Dificuldade", children: difficultyLabel(item.definedDifficulty) }, { key: "state", label: "Estado", children: calibrationTag(item.calibrationState) }]} /><Descriptions column={1} title="Observado" items={[{ key: "kind", label: "Amostra", children: item.sampleKind === "synthetic_qa" ? "Sintética de teste" : item.sampleKind === "real_anonymized" ? "Real anonimizada" : "Ainda não calculada" }, { key: "applications", label: "Aplicações", children: item.applicationCount }, { key: "correct", label: "Taxa de acerto", children: formatRate(item.correctRate) }, { key: "omission", label: "Taxa de omissão", children: formatRate(item.omissionRate) }, { key: "changes", label: "Mudança de resposta", children: formatRate(item.answerChangeRate) }, { key: "difficulty", label: "Índice observado", children: item.observedDifficulty ?? "Aguardando dados" }, { key: "time", label: "Tempo P25 / mediana / P75", children: item.medianTimeSeconds === null ? "Aguardando dados" : `${item.p25TimeSeconds ?? 0}s / ${item.medianTimeSeconds}s / ${item.p75TimeSeconds ?? 0}s` }, { key: "excluded", label: "Incidentes técnicos excluídos", children: item.excludedTechnicalIncidentCount }]} /></div> : <Empty /> }<Divider /><Alert message={item?.sampleKind === "synthetic_qa" ? "Esta prévia usa somente dados sintéticos de teste, que nunca produzem calibração real." : "Ajuste manual exige nova evidência, justificativa e revisão; ausência de amostra não vira calibração."} type="warning" showIcon /></PrismaCard>;
}

function VersionsSurface({ items }: { items: GovernedItemView[] }) {
  const families = useMemo(() => Object.values(items.reduce<Record<string, GovernedItemView[]>>((groups, item) => { const family = item.key.replace(/-V\d+$/i, ""); (groups[family] ??= []).push(item); return groups; }, {})), [items]);
  return <PrismaCard title="10. Versões e variantes do item"><div className="prisma-m51c-version-grid">{families.slice(0, 8).map((family) => <PrismaCard key={family[0]?.key} title={family[0]?.key}><Typography.Text>{family.length} versão(ões)</Typography.Text>{family.map((item) => <div key={item.id}><Tag color={item.state === "active" ? "green" : "default"}>{item.version}</Tag>{calibrationTag(item.calibrationState)}</div>)}</PrismaCard>)}</div></PrismaCard>;
}

function SettingsSurface({ workspace }: { workspace: ItemBankGovernanceWorkspace }) {
  const policy = workspace.policy; const limit = policy.monthlyLimitCents ?? 0; const percentage = limit > 0 ? Math.min(100, Math.round((policy.spentCents / limit) * 100)) : 0;
  return <Space direction="vertical" size={16} className="prisma-m51c-full"><PrismaCard title="12. Configurações de IA e orçamento"><Descriptions column={{ xs: 1, md: 2 }} items={[{ key: "flag", label: "Geração assistida", children: <PrismaStatusTag compact label={policy.generationEnabled ? "Ativa" : "Desativada"} tone={policy.generationEnabled ? "success" : "neutral"} /> }, { key: "provider", label: "Serviço e modelo", children: policy.provider && policy.model ? `${policy.provider} / ${policy.model}` : "Não aprovados" }, { key: "review", label: "Revisão humana", children: policy.requireHumanReview ? "Obrigatória" : "Configuração inválida" }, { key: "privacy", label: "Privacidade", children: "Dados pessoais e pesquisa externa bloqueados" }, { key: "daily", label: "Limite diário", children: `${policy.maximumRequestsPerDay} pedidos` }, { key: "request", label: "Teto por pedido", children: policy.maximumCostPerRequestCents ? formatMoney(policy.maximumCostPerRequestCents) : "Não aprovado" }, { key: "cooldown", label: "Intervalo entre pedidos", children: `${policy.cooldownSeconds}s` }, { key: "version", label: "Versão da política", children: policy.version }]} /><Divider /><Typography.Text strong>Orçamento mensal</Typography.Text><Progress percent={percentage} status={limit === 0 ? "exception" : percentage >= policy.budgetAlertPercent ? "exception" : "normal"} /><Typography.Text type="secondary">{limit === 0 ? "Sem limite aprovado: chamadas externas permanecem bloqueadas." : `${formatMoney(policy.spentCents)} de ${formatMoney(limit)}`}</Typography.Text></PrismaCard><Alert message="Alterar o serviço, o modelo, a retenção ou o orçamento exige avaliação de qualidade, privacidade e aprovação específica." type="warning" showIcon /></Space>;
}

function ItemTable({ items, onSelect }: { items: GovernedItemView[]; onSelect: (item: GovernedItemView) => void }) {
  return <Table className="prisma-responsive-table prisma-item-bank-table" dataSource={items} pagination={{ pageSize: 10 }} rowKey="id" onRow={(item) => ({ onClick: () => onSelect(item) })} tableLayout="fixed" columns={[{ title: "Código", dataIndex: "key", ellipsis: true, width: 130 }, { title: "Dimensão", dataIndex: "dimension", render: labelAssessmentDimension, width: 170 }, { title: "Dificuldade", dataIndex: "definedDifficulty", render: difficultyLabel, responsive: ["sm"], width: 110 }, { title: "Versão", dataIndex: "version", responsive: ["xl"], width: 80 }, { title: "Uso", dataIndex: "applicationCount", responsive: ["lg"], width: 70 }, { title: "Acerto", dataIndex: "correctRate", render: (value) => value === null ? "-" : `${Math.round(value * 100)}%`, responsive: ["lg"], width: 80 }, { title: "Calibração", dataIndex: "calibrationState", render: calibrationTag, responsive: ["md"], width: 150 }, { title: "Status", dataIndex: "state", render: statusTag, width: 110 }]} />;
}

function ItemAnalyticsDrawer({ item, onClose }: { item: GovernedItemView | null; onClose: () => void }) {
  const correctPercent = item?.correctRate === null || item?.correctRate === undefined ? 0 : Math.round(item.correctRate * 100);
  return <Drawer onClose={onClose} open={Boolean(item)} title="Desempenho do item" width={520}>{item ? <Space direction="vertical" size={16} className="prisma-m51c-full"><Typography.Title level={4}>{item.key}</Typography.Title><Typography.Paragraph>{item.stem}</Typography.Paragraph><div className="prisma-m51c-stat-grid"><Statistic title="Aplicações" value={item.applicationCount} /><Statistic suffix="%" title="Taxa de acerto" value={correctPercent} /><Statistic suffix="s" title="Tempo mediano" value={item.medianTimeSeconds ?? 0} /></div><Progress percent={correctPercent} /><Descriptions column={1} items={[{ key: "defined", label: "Dificuldade definida", children: difficultyLabel(item.definedDifficulty) }, { key: "observed", label: "Dificuldade observada", children: item.observedDifficulty ?? "Sem amostra real suficiente" }, { key: "calibration", label: "Estado de calibração", children: calibrationTag(item.calibrationState) }]} /><Alert message="Métricas apoiam revisão humana. Elas não alteram automaticamente dificuldade, status ou decisão sobre Pessoas." type="info" showIcon /></Space> : null}</Drawer>;
}

function statusTag(value: unknown) { const status = String(value); const success = ["active", "approved", "completed", "published"].includes(status); const danger = ["failed", "rejected", "compromised", "validation_failed"].includes(status); const labels: Record<string, string> = { active: "Ativo", approved: "Aprovado", completed: "Concluído", published: "Publicado", proposed: "Proposto", duplicate_candidate: "Possível duplicidade", validation_failed: "Validação falhou", in_review: "Em revisão", queued: "Na fila", rejected: "Rejeitado", failed: "Falhou", compromised: "Comprometido", superseded: "Substituído", inactive: "Inativo", retired: "Retirado" }; return <PrismaStatusTag compact label={labels[status] ?? status.replaceAll("_", " ")} tone={success ? "success" : danger ? "danger" : "warning"} />; }
function calibrationTag(value: GovernedItemView["calibrationState"]) { const labels = { uncalibrated: "Não calibrada", collecting_data: "Coletando dados", calibration_eligible: "Elegível para calibração", calibrated: "Calibrada", calibration_review_required: "Revisão necessária" }; const tones: Record<GovernedItemView["calibrationState"], PrismaStatusTone> = { uncalibrated: "neutral", collecting_data: "info", calibration_eligible: "purple", calibrated: "success", calibration_review_required: "warning" }; return <PrismaStatusTag compact label={labels[value]} tone={tones[value]} />; }
function difficultyLabel(value: GovernedItemView["definedDifficulty"]) { return ({ low: "Baixa", medium: "Média", high: "Alta" })[value]; }
function formatRate(value: number | null) { return value === null ? "Aguardando dados" : `${Math.round(value * 100)}%`; }
function formatMoney(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
