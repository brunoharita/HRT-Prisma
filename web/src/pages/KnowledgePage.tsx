import { useEffect, useMemo, useState } from "react";
import { GlobalOutlined, LinkOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from "antd";
import type { PlatformAccessProfile } from "../shared/platformUsers";
import type { OrganizationMembership } from "../shared/access";
import type { KnowledgeConceptSuggestion, KnowledgeConceptView, KnowledgeDashboard, KnowledgeInboxView, KnowledgeSettingsView } from "../domain/knowledgeData";
import { knowledgeService } from "../infrastructure/supabase/knowledgeService";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaCard } from "../ui/PrismaCard";

interface Props { profile: PlatformAccessProfile; activeMembership: OrganizationMembership | null; }

export function KnowledgePage({ profile, activeMembership }: Props) {
  const [dashboard, setDashboard] = useState<KnowledgeDashboard | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<KnowledgeConceptView | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<KnowledgeInboxView | null>(null);
  const [suggestions, setSuggestions] = useState<KnowledgeConceptSuggestion[]>([]);
  const [decisionReason, setDecisionReason] = useState("");
  const [proposalLabel, setProposalLabel] = useState("");
  const [proposalType, setProposalType] = useState<"occupation" | "skill" | "knowledge" | "technology" | "methodology" | "certification">("skill");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [conceptSearch, setConceptSearch] = useState("");
  const [conceptTypeFilter, setConceptTypeFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<KnowledgeSettingsView>({ allowExternalKnowledgeEnrichment: false, reinterpretationPolicy: "off" });
  const organizationId = activeMembership?.organizationId ?? null;
  const isGlobal = profile === "super_admin";

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await knowledgeService.loadDashboard(profile, organizationId);
      setDashboard(data); setSettings(data.settings);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao carregar Conhecimento."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [profile, organizationId]);

  const conceptColumns = useMemo(() => [
    { title: "Conceito", dataIndex: "canonicalLabel", render: (value: string, row: KnowledgeConceptView) => <Button type="link" onClick={() => setSelectedConcept(row)}>{value}</Button> },
    { title: "Tipo", dataIndex: "conceptType", render: (value: string) => <Tag>{describeType(value)}</Tag> },
    { title: "Camada", dataIndex: "scope", render: (value: string) => <Tag color={value === "global" ? "blue" : "purple"}>{value === "global" ? "Global" : "Empresa"}</Tag> },
    { title: "Versão", dataIndex: "version", render: (value: number) => `v${value}` },
    { title: "Status", dataIndex: "status", render: statusTag },
  ], []);

  if (error && !dashboard) return <PrismaPage><Alert message={error} type="error" showIcon action={<Button onClick={() => void load()}>Tentar novamente</Button>} /></PrismaPage>;
  const tabs = isGlobal ? [
    { key: "global", label: "Knowledge Global", children: conceptsPanel() },
    { key: "sources", label: "Fontes", children: sourcesPanel() },
    { key: "inbox", label: "Inbox", children: inboxPanel() },
    { key: "proposals", label: "Propostas", children: proposalsPanel() },
    { key: "impacts", label: "Impactos", children: impactsPanel() },
  ] : [
    { key: "organization", label: "Knowledge da empresa", children: conceptsPanel("organization") },
    { key: "global", label: "Base Prisma", children: conceptsPanel("global") },
    { key: "inbox", label: "Inbox da empresa", children: inboxPanel() },
    { key: "proposals", label: "Propostas", children: proposalsPanel() },
    { key: "impacts", label: "Impactos", children: impactsPanel() },
    { key: "settings", label: "Configurações", children: settingsPanel() },
  ];

  return <PrismaPage>
    <PrismaPageHeader title="Conhecimento" description={isGlobal ? "Base canônica global, fontes, propostas e impactos versionados." : "Overlay da empresa sobre a base global, sem alterar a definição Prisma."}
      actions={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    {error ? <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} /> : null}
    <PrismaCard><Tabs items={tabs} /></PrismaCard>
    <Drawer open={Boolean(selectedConcept)} onClose={() => setSelectedConcept(null)} title="Detalhe do conceito" width={520}>
      {selectedConcept ? <><Descriptions column={1} bordered size="small" items={[
        { key: "name", label: "Nome canônico", children: selectedConcept.canonicalLabel },
        { key: "type", label: "Tipo", children: describeType(selectedConcept.conceptType) },
        { key: "scope", label: "Camada", children: selectedConcept.scope === "global" ? "Global Prisma" : "Organização" },
        { key: "version", label: "Versão", children: `v${selectedConcept.version}` },
        { key: "status", label: "Status", children: statusTag(selectedConcept.status) },
      ]} /><Typography.Paragraph style={{ marginTop: 20 }}>{selectedConcept.description || "Sem descrição publicada."}</Typography.Paragraph>
      <Typography.Title level={5}>Aliases publicados</Typography.Title><Space wrap>{selectedConcept.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>)}</Space>
      <Typography.Title level={5}>Mapeamentos externos</Typography.Title>{selectedConcept.mappings.length ? selectedConcept.mappings.map((mapping) => <p key={`${mapping.source}-${mapping.externalId}`}>{mapping.source} {mapping.sourceVersion} · {mapping.externalUri ? <a href={mapping.externalUri} target="_blank" rel="noreferrer">{mapping.externalId}</a> : mapping.externalId}</p>) : <Typography.Text type="secondary">Sem autoridade externa vinculada.</Typography.Text>}
      <Typography.Title level={5}>Relações</Typography.Title>{selectedConcept.relations.length ? selectedConcept.relations.map((relation) => <p key={`${relation.type}-${relation.targetLabel}`}>{relation.type.replaceAll("_", " ")} · {relation.targetLabel}</p>) : <Typography.Text type="secondary">Sem relações publicadas.</Typography.Text>}
      <Alert type="info" showIcon message={selectedConcept.scope === "global" ? "Conceito global somente leitura fora da autoridade Super Admin." : "Especialização válida apenas no escopo desta organização."} /></> : null}
    </Drawer>
    <Drawer open={Boolean(selectedInbox)} onClose={() => setSelectedInbox(null)} title="Revisar termo observado" width={600}>
      {selectedInbox ? <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Descriptions column={1} bordered size="small" items={[
          { key: "term", label: "Termo original", children: selectedInbox.originalTerm },
          { key: "occurrences", label: "Ocorrências", children: `${selectedInbox.occurrenceCount} ocorrências · ${selectedInbox.observationCount} observações rastreáveis` },
          { key: "status", label: "Estado", children: statusTag(selectedInbox.status) },
        ]} />
        {selectedInbox.candidateConcepts.length ? <Alert type="warning" showIcon message="Correspondência ambígua" description={selectedInbox.candidateConcepts.map((candidate) => candidate.label).join(", ")} /> : null}
        <Input.Search defaultValue={selectedInbox.originalTerm} enterButton="Buscar candidatos" onSearch={async (query) => { setDecisionLoading(true); try { setSuggestions(await knowledgeService.suggestConcepts(organizationId ?? ZERO_UUID, query)); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na busca."); } finally { setDecisionLoading(false); } }} />
        {suggestions.map((suggestion) => <PrismaCard key={suggestion.id} title={suggestion.canonicalLabel}>
          <Space direction="vertical" style={{ width: "100%" }}><Space wrap><Tag>{describeType(suggestion.conceptType)}</Tag><Tag>{suggestion.scope === "global" ? "Global" : "Empresa"}</Tag><Tag>{suggestion.method}</Tag></Space>
          <Typography.Text type="secondary">{suggestion.sourceName ? `${suggestion.sourceName} ${suggestion.sourceVersion ?? ""} · ${suggestion.externalId ?? ""}` : "Conceito interno aprovado"}</Typography.Text>
          <Button type="primary" loading={decisionLoading} disabled={decisionReason.trim().length < 5} onClick={async () => { setDecisionLoading(true); try { await knowledgeService.resolveInboxAlias({ inboxId: selectedInbox.id, conceptId: suggestion.id, scope: isGlobal ? "global" : "organization", reason: decisionReason }); message.success("Alias aprovado e observações resolvidas."); setSelectedInbox(null); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao aprovar alias."); } finally { setDecisionLoading(false); } }}>Aprovar como alias</Button></Space>
        </PrismaCard>)}
        <Input.TextArea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Motivo auditável da decisão humana" autoSize={{ minRows: 2, maxRows: 4 }} />
        <Typography.Title level={5}>Nenhum conceito existente é adequado</Typography.Title>
        <Input value={proposalLabel} onChange={(event) => setProposalLabel(event.target.value)} placeholder="Nome canônico proposto" />
        <Select value={proposalType} onChange={setProposalType} options={["occupation", "skill", "knowledge", "technology", "methodology", "certification"].map((value) => ({ value, label: describeType(value) }))} />
        <Button loading={decisionLoading} disabled={!proposalLabel.trim() || decisionReason.trim().length < 5} onClick={async () => { setDecisionLoading(true); try { await knowledgeService.proposeConcept({ inboxId: selectedInbox.id, scope: isGlobal ? "global" : "organization", canonicalLabel: proposalLabel, conceptType: proposalType, description: "", reason: decisionReason }); message.success("Proposta criada para revisão humana e pesquisa de fontes."); setSelectedInbox(null); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao criar proposta."); } finally { setDecisionLoading(false); } }}>Criar proposta, sem publicar</Button>
      </Space> : null}
    </Drawer>
  </PrismaPage>;

  function conceptsPanel(scope?: "global" | "organization") {
    const query = conceptSearch.trim().toLocaleLowerCase("pt-BR");
    const rows = (dashboard?.concepts ?? []).filter((concept) => (!scope || concept.scope === scope)
      && (conceptTypeFilter === "all" || concept.conceptType === conceptTypeFilter)
      && (!query || [concept.canonicalLabel, ...concept.aliases].some((value) => value.toLocaleLowerCase("pt-BR").includes(query))));
    return <><Space wrap style={{ marginBottom: 16 }}><Input.Search allowClear placeholder="Buscar conceito ou alias" value={conceptSearch} onChange={(event) => setConceptSearch(event.target.value)} /><Select value={conceptTypeFilter} onChange={setConceptTypeFilter} options={[{ value: "all", label: "Todos os tipos" }, ...["occupation", "skill", "knowledge", "technology", "methodology", "certification"].map((value) => ({ value, label: describeType(value) }))]} /></Space>
      <Table rowKey="id" loading={loading} dataSource={rows} columns={conceptColumns} locale={{ emptyText: <Empty description="Nenhum conceito publicado nesta camada." /> }} pagination={{ pageSize: 10 }} scroll={{ x: 760 }} /></>;
  }
  function sourcesPanel() {
    return <Table rowKey="id" loading={loading} dataSource={dashboard?.sources ?? []} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} columns={[
      { title: "Fonte", dataIndex: "name", render: (value: string) => <Space><SafetyCertificateOutlined />{value}</Space> },
      { title: "Versão publicada", render: (_, row) => row.currentVersion?.externalVersion ?? "Nenhuma" },
      { title: "Importação", render: (_, row) => row.currentVersion ? statusTag(row.currentVersion.importStatus) : <Tag>catalogued</Tag> },
      { title: "Publicada em", render: (_, row) => row.currentVersion?.publishedAt ? formatDate(row.currentVersion.publishedAt) : "Não publicada" },
      { title: "Registros", render: (_, row) => row.currentVersion ? describeCounts(row.currentVersion.counts) : "0" },
      { title: "SHA-256", render: (_, row) => row.currentVersion?.checksumSha256 ? <Typography.Text code copyable>{row.currentVersion.checksumSha256.slice(0, 12)}…</Typography.Text> : "Não disponível" },
      { title: "Licença", dataIndex: "license", render: (value: string | null) => value ?? "Revisão por fonte" },
      { title: "Status da fonte", dataIndex: "status", render: statusTag },
    ]} />;
  }
  function inboxPanel() {
    return <Table rowKey="id" loading={loading} dataSource={dashboard?.inbox ?? []} scroll={{ x: 820 }} columns={[
      { title: "Termo", dataIndex: "originalTerm" }, { title: "Ocorrências", dataIndex: "occurrenceCount" },
      { title: "Primeira vez", dataIndex: "firstSeenAt", render: formatDate }, { title: "Última vez", dataIndex: "lastSeenAt", render: formatDate },
      { title: "Status", dataIndex: "status", render: statusTag },
      { title: "Ação", render: (_, row) => <Space><Button onClick={() => { setSelectedInbox(row); setSuggestions([]); setDecisionReason(""); setProposalLabel(""); }}>Revisar</Button><Button icon={<GlobalOutlined />} onClick={async () => { try { await knowledgeService.research(row.id); message.success("Pesquisa enfileirada."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na pesquisa."); } }}>Pesquisar</Button></Space> },
    ]} />;
  }
  function proposalsPanel() {
    return <div className="prisma-knowledge-proposals">{dashboard?.proposals.length ? dashboard.proposals.map((proposal) => <PrismaCard key={proposal.id} title={proposal.proposedConcept.canonical_label ?? proposal.observedTerm}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}><Space wrap><Tag>{proposal.proposedConcept.concept_type ?? "tipo pendente"}</Tag>{statusTag(proposal.status)}</Space>
      <Typography.Paragraph>{proposal.proposedConcept.description ?? "Sem descrição."}</Typography.Paragraph>
      <div>{proposal.sources.map((source, index) => <p key={`${proposal.id}-${index}`}><LinkOutlined /> <a href={source.url} target="_blank" rel="noreferrer">{source.title ?? source.url}</a> · {source.publisher} · {source.source_class}</p>)}</div>
      {proposal.status === "awaiting_human_review" ? <Button type="primary" onClick={async () => { try { await knowledgeService.approveProposal(proposal.id); message.success("Conhecimento aprovado e versionado."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na aprovação."); } }}>Aprovar</Button> : null}</Space>
    </PrismaCard>) : <Empty description="Nenhuma proposta disponível." />}</div>;
  }
  function impactsPanel() {
    return <Table rowKey="id" loading={loading} dataSource={dashboard?.impacts ?? []} scroll={{ x: 760 }} columns={[
      { title: "Pessoa", dataIndex: "personId" }, { title: "Perfil atual", dataIndex: "profileId" },
      { title: "Política", dataIndex: "policy" }, { title: "Status", dataIndex: "status", render: statusTag },
      { title: "Data", dataIndex: "createdAt", render: formatDate },
      { title: "Ação", render: (_, row) => <Button disabled={!organizationId || row.status !== "pending"} onClick={async () => { if (!organizationId) return; try { await knowledgeService.dispatchReinterpretation(organizationId, row.id); message.success("Reinterpretação manual enfileirada."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao reinterpretar."); } }}>Reinterpretar</Button> },
    ]} />;
  }
  function settingsPanel() {
    return <Form layout="vertical" onFinish={async () => { if (!organizationId) return; try { await knowledgeService.saveSettings(organizationId, settings); message.success("Configurações salvas."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao salvar."); } }}>
      <Form.Item label="Permitir enriquecimento externo de termos internos" extra="Desligado por padrão. Quando ativo, somente o termo sanitizado pode sair do Prisma."><Switch checked={settings.allowExternalKnowledgeEnrichment} onChange={(checked) => setSettings((current) => ({ ...current, allowExternalKnowledgeEnrichment: checked }))} /></Form.Item>
      <Form.Item label="Política de reinterpretação"><Select value={settings.reinterpretationPolicy} onChange={(value) => setSettings((current) => ({ ...current, reinterpretationPolicy: value }))} options={[
        { value: "off", label: "Desligada" }, { value: "manual", label: "Manual" }, { value: "daily", label: "Diária" }, { value: "weekly", label: "Semanal" }, { value: "monthly", label: "Mensal" },
      ]} /></Form.Item><Alert type="info" showIcon message="Uma mudança de Knowledge só marca perfis relacionados. A frequência nunca reprocessa sem impacto relevante." /><Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>Salvar configurações</Button>
    </Form>;
  }
}

function statusTag(value: string) { const color = ["approved", "completed", "proposal_ready"].includes(value) ? "green" : ["failed", "rejected", "budget_limited"].includes(value) ? "red" : "gold"; return <Tag color={color}>{value.replaceAll("_", " ")}</Tag>; }
function describeType(value: string) { return ({ occupation: "Ocupação", skill: "Habilidade", knowledge: "Conhecimento", technology: "Tecnologia", methodology: "Metodologia", certification: "Certificação" } as Record<string, string>)[value] ?? value; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
function describeCounts(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return "0"; const counts = value as Record<string, unknown>; return `${counts.conceptsPublished ?? counts.conceptRecords ?? 0} conceitos · ${counts.termsPublished ?? 0} termos`; }
