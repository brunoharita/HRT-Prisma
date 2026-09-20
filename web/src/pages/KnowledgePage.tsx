import { useViewState } from "../ui/PrismaNavigation";
import { useEffect, useMemo, useState } from "react";
import { GlobalOutlined, LinkOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from "antd";
import type { PlatformAccessProfile } from "../shared/platformUsers";
import type { OrganizationMembership } from "../shared/access";
import type { KnowledgeConceptSuggestion, KnowledgeConceptView, KnowledgeDashboard, KnowledgeInboxView, KnowledgeSettingsView, KnowledgeSourceView } from "../domain/knowledgeData";
import { knowledgeService } from "../infrastructure/supabase/knowledgeService";
import type { CompetencySubgroupOption } from "../domain/profileCompetencyCuration";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaCard } from "../ui/PrismaCard";

interface Props { profile: PlatformAccessProfile; activeMembership: OrganizationMembership | null; }

export function KnowledgePage({ profile, activeMembership }: Props) {
  const [activeTab, setActiveTab] = useViewState("tab", "overview");
  const [dashboard, setDashboard] = useState<KnowledgeDashboard | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<KnowledgeConceptView | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<KnowledgeInboxView | null>(null);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSourceView | null>(null);
  const [suggestions, setSuggestions] = useState<KnowledgeConceptSuggestion[]>([]);
  const [decisionReason, setDecisionReason] = useState("");
  const [proposalLabel, setProposalLabel] = useState("");
  const [proposalType, setProposalType] = useState<"occupation" | "competency">("competency");
  const [subgroups, setSubgroups] = useState<CompetencySubgroupOption[]>([]);
  const [proposalSubgroupId, setProposalSubgroupId] = useState<string | null>(null);
  const [approvalSubgroups, setApprovalSubgroups] = useState<Record<string, string>>({});
  const [proposalDecisionReasons, setProposalDecisionReasons] = useState<Record<string, string>>({});
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [conceptSearch, setConceptSearch] = useViewState("conceptSearch", "");
  const [conceptTypeFilter, setConceptTypeFilter] = useViewState("conceptTypeFilter", "all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<KnowledgeSettingsView>({ allowExternalKnowledgeEnrichment: false, reinterpretationPolicy: "off" });
  const organizationId = activeMembership?.organizationId ?? null;
  const isGlobal = profile === "super_admin";

  async function load() {
    setLoading(true); setError(null);
    try {
      const [data, availableSubgroups] = await Promise.all([
        knowledgeService.loadDashboard(profile, organizationId), knowledgeService.listCompetencySubgroups(organizationId),
      ]);
      setDashboard(data); setSettings(data.settings);
      setSubgroups(availableSubgroups);
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
    { key: "overview", label: "Visão Geral", children: overviewPanel() },
    { key: "global", label: "Base global de conhecimento", children: conceptsPanel() },
    { key: "sources", label: "Fontes", children: sourcesPanel() },
    { key: "inbox", label: "Termos para revisar", children: inboxPanel() },
    { key: "proposals", label: "Propostas", children: proposalsPanel() },
    { key: "impacts", label: "Impactos", children: impactsPanel() },
  ] : [
    { key: "overview", label: "Visão Geral", children: overviewPanel() },
    { key: "organization", label: "Conhecimento da empresa", children: conceptsPanel("organization") },
    { key: "global", label: "Base Prisma", children: conceptsPanel("global") },
    { key: "inbox", label: "Termos para revisar", children: inboxPanel() },
    { key: "impacts", label: "Impactos", children: impactsPanel() },
    { key: "settings", label: "Configurações", children: settingsPanel() },
  ];

  return <PrismaPage>
    <PrismaPageHeader title="Conhecimento" description={isGlobal ? "Consulte a base de conhecimento, revise propostas e acompanhe fontes e atualizações." : "Organize o conhecimento da empresa a partir da base Prisma e acompanhe suas contribuições."}
      actions={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Atualizar</Button>} />
    {error ? <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} /> : null}
    <PrismaCard><Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} /></PrismaCard>
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
      <Typography.Title level={5}>Referências profissionais</Typography.Title>{selectedConcept.relations.length ? <Table size="small" rowKey={(relation) => `${relation.type}-${relation.targetLabel}-${relation.source}-${relation.sourceVersion}`} pagination={false} scroll={{ x: 620 }} dataSource={selectedConcept.relations} columns={[
        { title: "Conhecimento ou habilidade", dataIndex: "targetLabel" },
        { title: "Relação", render: (_, relation) => describeRelation(relation.attributes, relation.type) },
        { title: "Nível ou importância", render: (_, relation) => describeMeasures(relation.attributes) },
        { title: "Fonte", render: (_, relation) => `${relation.source} ${relation.sourceVersion}` },
      ]} /> : <Typography.Text type="secondary">Sem relações publicadas.</Typography.Text>}
      <Alert type="info" showIcon style={{ marginTop: 16 }} message="Sobre os níveis" description="Os valores vêm das fontes oficiais e preservam sua escala original. Essencial no ESCO representa relevância para a ocupação. Nível e Importância no O*NET são medidas próprias da fonte e não comprovam senioridade ou competência de uma Pessoa." />
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
        <Select aria-label="Natureza da proposta" value={proposalType} onChange={(value) => { setProposalType(value); setProposalSubgroupId(null); }} options={[{ value: "competency", label: "Competência" }, { value: "occupation", label: "Ocupação" }]} />
        {proposalType === "competency" ? <><Select aria-label="Subagrupador principal" placeholder="Selecione o subagrupador" value={proposalSubgroupId} onChange={setProposalSubgroupId} options={subgroupSelectOptions(subgroups, isGlobal ? "global" : "organization")} /><SubgroupGuide subgroups={subgroups} id={proposalSubgroupId} /></> : null}
        <Button loading={decisionLoading} disabled={!proposalLabel.trim() || decisionReason.trim().length < 5 || (proposalType === "competency" && !proposalSubgroupId)} onClick={async () => { setDecisionLoading(true); try { await knowledgeService.proposeConcept({ inboxId: selectedInbox.id, scope: isGlobal ? "global" : "organization", canonicalLabel: proposalLabel, conceptType: proposalType, subgroupId: proposalType === "competency" ? proposalSubgroupId : null, description: "", reason: decisionReason }); message.success(isGlobal ? "Proposta criada para revisão humana." : "Conhecimento salvo na empresa; contribuição global enviada para revisão."); setSelectedInbox(null); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao criar proposta."); } finally { setDecisionLoading(false); } }}>{isGlobal ? "Criar proposta, sem publicar" : "Salvar na Knowledge da empresa"}</Button>
      </Space> : null}
    </Drawer>
    <Drawer open={Boolean(selectedSource)} onClose={() => setSelectedSource(null)} title={selectedSource ? `Revisar versão · ${selectedSource.name}` : "Revisar versão"} width={560}>
      {selectedSource?.pendingVersion ? <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Alert type="warning" showIcon message="Versão preparada para publicação" description="A checagem já validou e comparou esta versão. Publicá-la substituirá a versão corrente da base global do Prisma." />
        <Descriptions column={1} bordered size="small" items={[
          { key: "version", label: "Versão", children: selectedSource.pendingVersion.externalVersion },
          { key: "status", label: "Estado", children: statusTag(selectedSource.pendingVersion.importStatus) },
          { key: "release", label: "Data da versão", children: selectedSource.pendingVersion.releaseDate ? formatDate(selectedSource.pendingVersion.releaseDate) : "Não informada" },
          { key: "retrieved", label: "Preparada em", children: selectedSource.pendingVersion.retrievalDate ? formatDate(selectedSource.pendingVersion.retrievalDate) : "Não informada" },
          { key: "records", label: "Registros", children: describeCounts(selectedSource.pendingVersion.counts) },
        ]} />
        <Typography.Paragraph type="secondary">A publicação é uma decisão administrativa do Super Admin. O processamento ocorre em lotes e mantém a origem e a versão auditáveis.</Typography.Paragraph>
        <Button type="primary" onClick={async () => { setDecisionLoading(true); try { const result = await knowledgeService.publishSourceVersion(selectedSource.pendingVersion!.id); message.success(`${result.source} ${result.version} publicada como versão corrente.`); setSelectedSource(null); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao publicar a versão."); } finally { setDecisionLoading(false); } }} loading={decisionLoading}>Publicar versão</Button>
      </Space> : <Empty description="Não há uma versão preparada para publicação." />}
    </Drawer>
  </PrismaPage>;

  function overviewPanel() {
    const sources = dashboard?.sources ?? [];
    const featuredSources = ["CBO", "ESCO", "O*NET"].map((name) => sources.find((source) => source.name === name)).filter((source): source is KnowledgeSourceView => Boolean(source));
    const otherSources = sources.filter((source) => !featuredSources.some((featured) => featured.id === source.id));
    return <div className="prisma-m81-knowledge-overview">
      <Alert type="success" showIcon message="Base de conhecimento preservada"
        description="Fontes oficiais e conhecimento institucional permanecem disponíveis. Dados de currículos são tratados por proveniência." />
      <div className="prisma-m81-knowledge-sources">
        {featuredSources.map((source) => <article key={source.id} className="prisma-m81-knowledge-source">
          <span className="prisma-m81-knowledge-source-icon"><SafetyCertificateOutlined /></span>
          <strong>{source.name}</strong>
          <small>{source.domain || source.sourceClass}</small>
          <Tag color={source.currentVersion ? "success" : "default"}>{source.currentVersion ? "Ativa" : "Catalogada"}</Tag>
        </article>)}
        <article className="prisma-m81-knowledge-source">
          <span className="prisma-m81-knowledge-source-icon"><GlobalOutlined /></span>
          <strong>Conceitos da organização</strong>
          <small>Conhecimento institucional da empresa ativa</small>
          <Tag color="success">Empresa ativa</Tag>
        </article>
      </div>
      {otherSources.length ? <details className="prisma-m81-knowledge-more"><summary>Outras fontes catalogadas ({otherSources.length})</summary>
        <ul>{otherSources.map((source) => <li key={source.id}>{source.name} · {source.currentVersion ? "Ativa" : "Catalogada"}</li>)}</ul>
      </details> : null}
      {!loading && !sources.length ? <Empty description="Nenhuma fonte catalogada nesta camada." /> : null}
    </div>;
  }
  function conceptsPanel(scope?: "global" | "organization") {
    const query = conceptSearch.trim().toLocaleLowerCase("pt-BR");
    const rows = (dashboard?.concepts ?? []).filter((concept) => (!scope || concept.scope === scope)
      && (conceptTypeFilter === "all" || concept.conceptType === conceptTypeFilter)
      && (!query || [concept.canonicalLabel, ...concept.aliases].some((value) => value.toLocaleLowerCase("pt-BR").includes(query))));
    return <><Space wrap style={{ marginBottom: 16 }}><Input.Search allowClear placeholder="Buscar conceito ou alias" value={conceptSearch} onChange={(event) => setConceptSearch(event.target.value)} /><Select value={conceptTypeFilter} onChange={setConceptTypeFilter} options={[{ value: "all", label: "Todos os tipos" }, ...["occupation", "skill", "competency", "knowledge", "technology", "methodology", "certification"].map((value) => ({ value, label: describeType(value) }))]} /></Space>
      <Table rowKey="id" loading={loading} dataSource={rows} columns={conceptColumns} locale={{ emptyText: <Empty description="Nenhum conceito publicado nesta camada." /> }} pagination={{ pageSize: 10 }} scroll={{ x: 760 }} /></>;
  }
  function sourcesPanel() {
    return <Table rowKey="id" loading={loading} dataSource={dashboard?.sources ?? []} pagination={{ pageSize: 10 }} scroll={{ x: 850 }} columns={[
      { title: "Fonte", dataIndex: "name", render: (value: string) => <Space><SafetyCertificateOutlined />{value}</Space> },
      { title: "Versão publicada", render: (_, row) => row.currentVersion?.externalVersion ?? "Nenhuma" },
      { title: "Versão preparada", render: (_, row) => row.pendingVersion ? <Space direction="vertical" size={0}><Typography.Text>{row.pendingVersion.externalVersion}</Typography.Text><Button type="link" size="small" onClick={() => setSelectedSource(row)}>Revisar e publicar</Button></Space> : "Nenhuma" },
      { title: "Importação", render: (_, row) => row.currentVersion ? statusTag(row.currentVersion.importStatus) : <Tag>Catalogada</Tag> },
      { title: "Publicada em", render: (_, row) => row.currentVersion?.publishedAt ? formatDate(row.currentVersion.publishedAt) : "Não publicada" },
      { title: "Registros", render: (_, row) => row.currentVersion ? describeCounts(row.currentVersion.counts) : "Ainda sem dados" },
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
      <Space direction="vertical" size="middle" style={{ width: "100%" }}><Space wrap><Tag>{proposal.proposedConcept.concept_type === "occupation" ? "Ocupação" : proposal.proposedConcept.concept_type === "certification" ? "Certificação legada" : "Competência"}</Tag><Tag color={proposal.scope === "global" ? "blue" : "purple"}>{proposal.scope === "organization" ? "Proposta legada · Empresa ativa" : proposal.originOrganizationId ? "Contribuição de empresa" : "Global Prisma"}</Tag>{statusTag(proposal.status)}</Space>
      <Typography.Paragraph>{proposal.proposedConcept.description ?? "Sem descrição."}</Typography.Paragraph>
      {proposal.proposedConcept.concept_type !== "occupation" ? <><Select aria-label={`Subagrupador de ${proposal.proposedConcept.canonical_label ?? "proposta"}`} placeholder="Classifique antes de aprovar" value={approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id ?? null} onChange={(value) => setApprovalSubgroups((current) => ({ ...current, [proposal.id]: value }))} options={subgroupSelectOptions(subgroups, proposal.scope)} /><SubgroupGuide subgroups={subgroups} id={approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id ?? null} /></> : null}
      {proposal.proposedConcept.concept_type === "certification" ? <Alert type="warning" showIcon message="Certificação é credencial, não conceito de competência. Esta proposta legada exige revisão antes da publicação." /> : null}
      {proposal.candidateConcepts.length ? <Alert type="info" showIcon message="Candidatos globais para análise" description={<Space wrap>{proposal.candidateConcepts.map((candidate, index) => <Tag key={candidate.id ?? index}>{candidate.canonical_label ?? "Conceito"} · {candidate.match ?? "candidato"}</Tag>)}</Space>} /> : null}
      <div>{proposal.sources.map((source, index) => <p key={`${proposal.id}-${index}`}><LinkOutlined /> <a href={source.url} target="_blank" rel="noreferrer">{source.title ?? source.url}</a> · {source.publisher} · {source.source_class}</p>)}</div>
      {proposal.status === "awaiting_human_review" ? proposal.scope === "organization" ? <>
        <Alert type="info" showIcon message="Proposta anterior ao fluxo M7.7" description="Aprovar na empresa preserva esta proposta e cria uma contribuição separada, ainda pendente de decisão na Base Global." />
        <Input.TextArea value={proposalDecisionReasons[proposal.id] ?? ""} onChange={(event) => setProposalDecisionReasons((current) => ({ ...current, [proposal.id]: event.target.value }))} placeholder="Motivo auditável da aprovação na empresa" aria-label="Motivo da transição da proposta legada" autoSize={{ minRows: 2, maxRows: 4 }} />
        <Button type="primary" loading={decisionLoading} disabled={!organizationId || proposal.organizationId !== organizationId || (proposalDecisionReasons[proposal.id] ?? "").trim().length < 5 || proposal.proposedConcept.concept_type === "certification" || (proposal.proposedConcept.concept_type !== "occupation" && !validSubgroupChoice(subgroups, approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id, "organization"))} onClick={async () => {
          if (!organizationId || proposal.organizationId !== organizationId) return;
          setDecisionLoading(true);
          try {
            await knowledgeService.transitionLegacyProposal(proposal.id, organizationId, proposal.proposedConcept.concept_type === "occupation" ? null : approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id ?? null, proposalDecisionReasons[proposal.id] ?? "");
            message.success("Conceito aprovado na empresa; contribuição Global enviada para revisão.");
            await load();
          } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na transição da proposta legada."); }
          finally { setDecisionLoading(false); }
        }}>Aprovar na empresa e enviar à revisão Global</Button>
      </> : <><Input.TextArea value={proposalDecisionReasons[proposal.id] ?? ""} onChange={(event) => setProposalDecisionReasons((current) => ({ ...current, [proposal.id]: event.target.value }))} placeholder="Motivo auditável da decisão global" autoSize={{ minRows: 2, maxRows: 4 }} /><Space><Button onClick={async () => { try { await knowledgeService.researchGlobalContribution(proposal.id, proposal.inboxId); message.success("Pesquisa externa por IA enfileirada."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na pesquisa."); } }}>Pesquisar com IA</Button><Button type="primary" disabled={(proposalDecisionReasons[proposal.id] ?? "").trim().length < 5 || proposal.proposedConcept.concept_type === "certification" || (proposal.proposedConcept.concept_type !== "occupation" && !validSubgroupChoice(subgroups, approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id, "global"))} onClick={async () => { try { await knowledgeService.approveProposal(proposal.id, proposal.proposedConcept.concept_type === "occupation" ? null : approvalSubgroups[proposal.id] ?? proposal.proposedConcept.subgroup_id ?? null, proposalDecisionReasons[proposal.id] ?? ""); message.success("Conhecimento aprovado e versionado."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha na aprovação."); } }}>Aprovar</Button>{proposal.originOrganizationId ? <><Button disabled={(proposalDecisionReasons[proposal.id] ?? "").trim().length < 5} onClick={async () => { try { await knowledgeService.decideGlobalContribution(proposal.id, "deferred", proposalDecisionReasons[proposal.id] ?? ""); message.success("Contribuição mantida somente na empresa."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao adiar contribuição."); } }}>Manter somente local</Button><Button danger disabled={(proposalDecisionReasons[proposal.id] ?? "").trim().length < 5} onClick={async () => { try { await knowledgeService.decideGlobalContribution(proposal.id, "rejected", proposalDecisionReasons[proposal.id] ?? ""); message.success("Contribuição global rejeitada; origem local preservada."); await load(); } catch (reason) { message.error(reason instanceof Error ? reason.message : "Falha ao rejeitar contribuição."); } }}>Rejeitar</Button></> : null}</Space></> : null}</Space>
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

function statusTag(value: string) {
  const labels: Record<string, string> = { approved: "Aprovado", published: "Publicado", completed: "Concluído", proposal_ready: "Proposta para revisar", awaiting_human_review: "Pendente de revisão", failed: "Falha", rejected: "Rejeitado", budget_limited: "Limite de orçamento", pending: "Pendente", in_review: "Em revisão", processing: "Processando", queued: "Na fila", imported: "Importado", importing: "Importando", staged: "Aguardando publicação", catalogued: "Catalogado", active: "Ativo", inactive: "Inativo", superseded: "Substituído", draft: "Rascunho", resolved: "Resolvido", unresolved: "Aguardando análise", ambiguous: "Requer esclarecimento", action_required: "Ação necessária" };
  const color = ["approved", "published", "completed", "resolved", "active"].includes(value) ? "green" : ["failed", "rejected", "budget_limited"].includes(value) ? "red" : ["pending", "in_review", "proposal_ready", "awaiting_human_review", "unresolved", "ambiguous", "action_required"].includes(value) ? "gold" : "default";
  return <Tag color={color} title={labels[value] ? undefined : `Código do estado: ${value}`}>{labels[value] ?? "Estado não identificado"}</Tag>;
}
function validSubgroupChoice(subgroups: CompetencySubgroupOption[], id: string | undefined, scope: "global" | "organization") {
  return subgroups.some((item) => item.id === id && (scope === "organization" || item.scope === "global"));
}
function subgroupSelectOptions(subgroups: CompetencySubgroupOption[], scope: "global" | "organization") {
  return (["hard", "soft"] as const).map((macro) => ({ label: macro === "hard" ? "Hard Skills" : "Soft Skills",
    options: subgroups.filter((item) => item.macroGroupCode === macro && (scope === "organization" || item.scope === "global"))
      .map((item) => ({ value: item.id, label: `${item.code} · ${item.label}${item.scope === "organization" ? " (empresa)" : ""}` })) }));
}
function SubgroupGuide({ subgroups, id }: { subgroups: CompetencySubgroupOption[]; id: string | null | undefined }) {
  const item = subgroups.find((candidate) => candidate.id === id);
  if (!item) return null;
  return <Alert type="info" title={`${item.macroGroupCode === "hard" ? "Hard Skills" : "Soft Skills"} > ${item.label}`}
    description={<><p>{item.definition}</p><p>{item.classificationQuestion}</p>{item.examples?.length ? <small>Exemplos: {item.examples.join(", ")}</small> : null}</>} />;
}
function describeType(value: string) { return ({ occupation: "Ocupação", skill: "Habilidade", competency: "Competência", knowledge: "Conhecimento", technology: "Tecnologia", methodology: "Metodologia", certification: "Certificação" } as Record<string, string>)[value] ?? value; }
function describeRelation(attributes: unknown, fallback: string) { const value = isRecord(attributes) ? attributes.relevance : null; return value === "essential" ? "Essencial" : value === "optional" ? "Opcional" : fallback.replaceAll("_", " "); }
function describeMeasures(attributes: unknown) { if (!isRecord(attributes) || !Array.isArray(attributes.measurements)) return "—"; const values = attributes.measurements.flatMap((measure) => isRecord(measure) && typeof measure.scaleId === "string" && typeof measure.rawValue === "string" ? [`${describeScale(measure.scaleId)} ${measure.rawValue}`] : []); return values.length ? values.join(" · ") : "—"; }
function describeScale(scale: string) { return ({ IM: "Importância", LV: "Nível" } as Record<string, string>)[scale] ?? scale; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
function describeCounts(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return "0"; const counts = value as Record<string, unknown>; return `${counts.conceptsPublished ?? counts.conceptRecords ?? 0} conceitos · ${counts.termsPublished ?? 0} termos`; }
