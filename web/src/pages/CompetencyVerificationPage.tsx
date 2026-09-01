import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Descriptions, Empty, Input, Radio, Select, Skeleton, Space, Steps, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  labelCriticality,
  labelLevel,
  labelSufficiency,
  type AssessmentBlueprintView,
  type AssessmentRubricView,
  type ItemBankSummaryView,
  type PreparedAssessmentStatus,
  type VerificationDefinitionView,
  type VerificationLevel,
  type VerificationNeedView,
  type VerificationWorkspaceView,
} from "../domain/competencyVerificationData";
import { competencyVerificationService } from "../infrastructure/supabase/competencyVerificationService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaStatusTag, type PrismaStatusTone } from "../ui/PrismaStatusTag";

interface CompetencyVerificationPageProps {
  activeMembership: OrganizationMembership;
  needId?: string;
  mode: "matching" | "detail" | "prepare";
  onNavigate: (path: string) => void;
}

type PrepareStep = 0 | 1 | 2 | 3;

export function CompetencyVerificationPage({ activeMembership, needId, mode, onNavigate }: CompetencyVerificationPageProps) {
  const [workspace, setWorkspace] = useState<VerificationWorkspaceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<PrepareStep>(0);
  const [selectedLevel, setSelectedLevel] = useState<VerificationLevel>("advanced");
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  const [saving, setSaving] = useState<PreparedAssessmentStatus | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void competencyVerificationService.loadWorkspace(activeMembership.organizationId)
      .then((result) => {
        if (!active) return;
        setWorkspace(result);
        const firstNeed = resolveNeed(result, needId);
        setSelectedLevel(firstNeed?.targetLevel ?? "advanced");
        setDefinitionId(result.definitions.find((definition) => definition.competencyKey === (firstNeed?.competencyKey ?? "sql"))?.id ?? null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar verificação de competências.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [activeMembership.organizationId, needId]);

  const selectedNeed = resolveNeed(workspace, needId);
  const definitions = useMemo(() => {
    const items = workspace?.definitions ?? [];
    const normalized = search.trim().toLowerCase();
    return items
      .filter((definition) => definition.targetLevel === selectedLevel)
      .filter((definition) => !normalized || `${definition.name} ${definition.description}`.toLowerCase().includes(normalized));
  }, [search, selectedLevel, workspace?.definitions]);
  const selectedDefinition = definitions.find((definition) => definition.id === definitionId)
    ?? workspace?.definitions.find((definition) => definition.id === definitionId)
    ?? definitions[0]
    ?? null;
  const selectedBlueprint = selectedDefinition ? workspace?.blueprints.find((blueprint) => blueprint.definitionId === selectedDefinition.id) ?? null : null;
  const selectedRubric = selectedDefinition ? workspace?.rubrics.find((rubric) => rubric.definitionId === selectedDefinition.id) ?? null : null;
  const itemBank = workspace?.itemBankSummary ?? [];
  const prepared = selectedNeed ? workspace?.preparedAssessments.find((item) => item.needId === selectedNeed.id) ?? null : null;

  async function handlePrepare(status: PreparedAssessmentStatus) {
    if (!selectedNeed || !selectedDefinition || !selectedBlueprint) return;
    setSaving(status);
    setError(null);
    try {
      const result = await competencyVerificationService.prepareAssessment({
        needId: selectedNeed.id,
        definitionId: selectedDefinition.id,
        blueprintId: selectedBlueprint.id,
        status,
      });
      setInfo(status === "prepared"
        ? `Verificação preparada com ${result.itemCount} itens. Agora o convite pode ser emitido.`
        : `Rascunho salvo com ${result.itemCount} itens versionados.`);
      const refreshed = await competencyVerificationService.loadWorkspace(activeMembership.organizationId);
      setWorkspace(refreshed);
      if (status === "prepared") onNavigate(`/verifications/new/${result.preparedAssessmentId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a preparação.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <PrismaPage className="prisma-m51a-page"><Skeleton active paragraph={{ rows: 10 }} /></PrismaPage>;
  }

  if (error && !workspace) {
    return (
      <PrismaPage className="prisma-m51a-page">
        <PrismaPageHeader title="Matching" description="Verificação recomendada por evidência e política." />
        <Alert message={error} showIcon type="error" />
      </PrismaPage>
    );
  }

  if (!workspace || !selectedNeed) {
    return (
      <PrismaPage className="prisma-m51a-page">
        <PrismaPageHeader title="Matching" description="Verificação recomendada por evidência e política." />
        <PrismaCard><Empty description="Nenhuma necessidade de verificação disponível para a organização ativa." /></PrismaCard>
      </PrismaPage>
    );
  }

  if (mode === "detail") {
    return renderDetail(selectedNeed, prepared, onNavigate);
  }
  if (mode === "prepare") {
    return (
      <PrepareFlow
        blueprints={workspace.blueprints}
        definitions={definitions}
        error={error}
        info={info}
        itemBank={itemBank}
        need={selectedNeed}
        onBack={() => onNavigate(`/matching/verification-needs/${selectedNeed.id}`)}
        onDefinitionChange={setDefinitionId}
        onLevelChange={setSelectedLevel}
        onPrepare={handlePrepare}
        onSearch={setSearch}
        onStepChange={setStep}
        rubrics={workspace.rubrics}
        saving={saving}
        search={search}
        selectedBlueprint={selectedBlueprint}
        selectedDefinition={selectedDefinition}
        selectedLevel={selectedLevel}
        selectedRubric={selectedRubric}
        step={step}
      />
    );
  }
  return renderMatching(workspace.needs, onNavigate);
}

function renderMatching(needs: VerificationNeedView[], onNavigate: (path: string) => void) {
  const documentaryCount = needs.filter((need) => need.evidenceSnapshot.documentary_evidence === "available").length;
  const demonstratedCount = needs.filter(hasDemonstratedEvidence).length;
  const requiredCount = needs.filter((need) => need.sufficiencyStatus === "verification_required_by_policy").length;
  const allDemonstrated = needs.length > 0 && demonstratedCount === needs.length;
  const overallLabel = needs.length === 0 ? "Sem requisitos para análise" : requiredCount > 0 ? "Requer verificação" : allDemonstrated ? "Evidência suficiente" : "Aderência parcial";
  const overallTone: PrismaStatusTone = needs.length === 0 ? "neutral" : requiredCount > 0 ? "danger" : allDemonstrated ? "success" : "warning";
  const columns: ColumnsType<VerificationNeedView> = [
    {
      title: "Requisito",
      dataIndex: "competencyLabel",
      render: (_, need) => (
        <Space direction="vertical" size={2}>
          <Space><Typography.Text strong>{need.competencyLabel}</Typography.Text><PrismaStatusTag compact label={labelCriticality(need.criticality)} tone={need.criticality === "critical" ? "danger" : "warning"} /></Space>
          <Typography.Text type="secondary">{need.contextSnapshot.requirement_label as string ?? need.vacancyTitle}</Typography.Text>
          <span className="prisma-mobile-only"><PrismaStatusTag compact label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} /></span>
        </Space>
      ),
    },
    { title: "Nível requerido", dataIndex: "targetLevel", width: 130, render: (level: VerificationLevel) => labelLevel(level), responsive: ["md"] },
    { title: "Aderência atual", width: 130, render: () => <PrismaStatusTag compact label="Parcial" tone="warning" />, responsive: ["lg"] },
    {
      title: "Evidências encontradas",
      render: (_, need) => (
        <Space direction="vertical" size={4}>
          <PrismaStatusTag compact label={need.evidenceSnapshot.documentary_evidence === "available" ? "Documental disponível" : "Sem documento"} tone={need.evidenceSnapshot.documentary_evidence === "available" ? "success" : "neutral"} />
          <PrismaStatusTag compact label={hasDemonstratedEvidence(need) ? "Demonstração disponível" : "Demonstração pendente"} tone={hasDemonstratedEvidence(need) ? "success" : "warning"} />
        </Space>
      ),
      responsive: ["xl"],
    },
    {
      title: "Suficiência",
      width: 210,
      render: (_, need) => <PrismaStatusTag compact label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} />,
      responsive: ["sm"],
    },
    {
      title: "",
      width: 52,
      align: "right",
      render: (_, need) => <Button aria-label={`Abrir detalhes de ${need.competencyLabel}`} icon={<RightOutlined />} onClick={() => onNavigate(`/matching/verification-needs/${need.id}`)} type="text" />,
    },
  ];
  return (
    <PrismaPage className="prisma-m51a-page">
      <PrismaPageHeader title="Matching" description="Requisitos com suficiência de evidência e necessidade de verificação." />
      <PrismaCard className="prisma-m51a-profile-card">
        <div className="prisma-m51a-profile-context">
          <Typography.Title level={3}>{needs[0]?.personName ?? "Pessoa"}</Typography.Title>
          <Typography.Text type="secondary">{needs[0]?.vacancyTitle ?? "Vaga em avaliação"}</Typography.Text>
          <div className="prisma-m51a-overall-state"><PrismaStatusTag label={overallLabel} tone={overallTone} /><Typography.Text type="secondary">Resultado baseado nas evidências atualmente disponíveis.</Typography.Text></div>
        </div>
        <div aria-label="Resumo das evidências" className="prisma-m51a-evidence-summary">
          <span><strong>{needs.length}</strong><small>requisito{needs.length === 1 ? "" : "s"} analisado{needs.length === 1 ? "" : "s"}</small></span>
          <span><strong>{documentaryCount}</strong><small>com evidência documental</small></span>
          <span><strong>{demonstratedCount}</strong><small>com evidência demonstrada</small></span>
        </div>
      </PrismaCard>
      <PrismaCard title="Requisitos da Vaga">
        <Table className="prisma-responsive-table prisma-matching-table" columns={columns} dataSource={needs} pagination={false} rowKey="id" tableLayout="fixed" />
        <div className="prisma-m51a-legend">
          <span><i className="is-green" />Suficiente</span>
          <span><i className="is-gold" />Verificação recomendada</span>
          <span><i className="is-red" />Verificação exigida por política</span>
          <span><i />Informação insuficiente</span>
        </div>
      </PrismaCard>
    </PrismaPage>
  );
}

function renderDetail(
  need: VerificationNeedView,
  prepared: { status: PreparedAssessmentStatus } | null,
  onNavigate: (path: string) => void,
) {
  return (
    <PrismaPage className="prisma-m51a-page">
      <PrismaPageHeader
        title={`${need.competencyLabel} - ${labelLevel(need.targetLevel)}`}
        description="Detalhes da necessidade de verificação."
        actions={<Button icon={<FileProtectOutlined />} onClick={() => onNavigate(`/matching/verification-needs/${need.id}/prepare`)} type="primary">Preparar verificação</Button>}
      />
      <Tabs
        items={[
          {
            key: "overview",
            label: "Visão geral",
            children: (
              <Space direction="vertical" size={16} className="prisma-m51a-full">
                <PrismaCard
                  title="Necessidade de Verificação"
                  extra={<PrismaStatusTag label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} />}
                >
                  <Typography.Paragraph>{need.explanation}</Typography.Paragraph>
                  <Typography.Text strong>Motivos</Typography.Text>
                  <ul className="prisma-m51a-reason-list">
                    {need.reasonCodes.map((reason) => <li key={reason}><CheckCircleOutlined />{reasonLabel(reason)}</li>)}
                  </ul>
                </PrismaCard>
                <PrismaCard title="Resumo da Necessidade">
                  <Descriptions column={{ xs: 1, md: 2 }} size="small">
                    <Descriptions.Item label="Competência">{need.competencyLabel}</Descriptions.Item>
                    <Descriptions.Item label="Status"><PrismaStatusTag compact label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} /></Descriptions.Item>
                    <Descriptions.Item label="Nível requerido">{labelLevel(need.targetLevel)}</Descriptions.Item>
                    <Descriptions.Item label="Última avaliação">{formatDate(need.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="Criticidade">{labelCriticality(need.criticality)}</Descriptions.Item>
                    <Descriptions.Item label="Origem da análise">Análise automatizada baseada em evidências</Descriptions.Item>
                    <Descriptions.Item label="Contexto">{need.vacancyTitle}</Descriptions.Item>
                    <Descriptions.Item label="Preparação">{prepared ? labelPrepared(prepared.status) : "Ainda não preparada"}</Descriptions.Item>
                  </Descriptions>
                </PrismaCard>
                <Alert message="O Prisma não toma decisões de contratação. Esta verificação é uma recomendação para gerar nova evidência." showIcon type="info" />
              </Space>
            ),
          },
          { key: "evidence", label: "Evidências", children: <EvidencePanel need={need} /> },
          { key: "verification", label: "Verificação", children: <PrismaCard><Typography.Text>{prepared ? "Instrumento preparado para execução futura." : "Nenhum instrumento preparado."}</Typography.Text></PrismaCard> },
          { key: "history", label: "Histórico", children: <PrismaCard><Typography.Text>Criada em {formatDate(need.createdAt)}.</Typography.Text></PrismaCard> },
        ]}
      />
    </PrismaPage>
  );
}

function PrepareFlow(props: {
  blueprints: AssessmentBlueprintView[];
  definitions: VerificationDefinitionView[];
  error: string | null;
  info: string | null;
  itemBank: ItemBankSummaryView[];
  need: VerificationNeedView;
  onBack: () => void;
  onDefinitionChange: (id: string) => void;
  onLevelChange: (level: VerificationLevel) => void;
  onPrepare: (status: PreparedAssessmentStatus) => Promise<void>;
  onSearch: (search: string) => void;
  onStepChange: (step: PrepareStep) => void;
  rubrics: AssessmentRubricView[];
  saving: PreparedAssessmentStatus | null;
  search: string;
  selectedBlueprint: AssessmentBlueprintView | null;
  selectedDefinition: VerificationDefinitionView | null;
  selectedLevel: VerificationLevel;
  selectedRubric: AssessmentRubricView | null;
  step: PrepareStep;
}) {
  return (
    <PrismaPage className="prisma-m51a-page">
      <PrismaPageHeader
        title="Preparar Verificação"
        description="Defina como a verificação será construída."
        actions={<Button icon={<ArrowLeftOutlined />} onClick={props.onBack}>Voltar para detalhes</Button>}
      />
      {props.error ? <Alert message={props.error} showIcon type="error" /> : null}
      {props.info ? <Alert message={props.info} showIcon type="success" /> : null}
      <PrismaCard>
        <Steps
          current={props.step}
          items={[
            { title: "Competência e nível" },
            { title: "Definição da verificação" },
            { title: "Instrumento de avaliação" },
            { title: "Revisão" },
          ]}
        />
      </PrismaCard>
      {props.step === 0 ? <PrepareCompetency {...props} /> : null}
      {props.step === 1 ? <SelectDefinition {...props} /> : null}
      {props.step === 2 ? <InstrumentPreview {...props} /> : null}
      {props.step === 3 ? <VerificationSummary {...props} /> : null}
    </PrismaPage>
  );
}

function PrepareCompetency(props: Parameters<typeof PrepareFlow>[0]) {
  return (
    <PrismaCard title="Competência e nível">
      <Space direction="vertical" size={18} className="prisma-m51a-full">
        <Radio checked>{props.need.competencyLabel}<br /><Typography.Text type="secondary">Banco de dados</Typography.Text></Radio>
        <Radio.Group onChange={(event) => props.onLevelChange(event.target.value as VerificationLevel)} value={props.selectedLevel}>
          <Space direction="vertical">
            {(["basic", "intermediate", "advanced"] as const).map((level) => (
              <Radio key={level} value={level}>{labelLevel(level)}</Radio>
            ))}
          </Space>
        </Radio.Group>
        <Space wrap>
          <Select value={props.need.vacancyTitle} options={[{ value: props.need.vacancyTitle, label: props.need.vacancyTitle }]} />
          <Select value={props.need.criticality} options={[{ value: props.need.criticality, label: labelCriticality(props.need.criticality) }]} />
        </Space>
        <Button onClick={() => props.onStepChange(1)} type="primary">Avançar</Button>
      </Space>
    </PrismaCard>
  );
}

function SelectDefinition(props: Parameters<typeof PrepareFlow>[0]) {
  const columns: ColumnsType<VerificationDefinitionView> = [
    { title: "Definição", dataIndex: "name", render: (_, definition) => <Radio checked={props.selectedDefinition?.id === definition.id}>{definition.name}<br /><Typography.Text type="secondary">{definition.description}</Typography.Text></Radio>, width: 320 },
    { title: "Nível", dataIndex: "targetLevel", render: labelLevel, width: 110 },
    { title: "Área", dataIndex: "domain", render: labelProfessionalDomain, width: 150 },
    { title: "Versão", dataIndex: "version", width: 90 },
    { title: "Uso", dataIndex: "usageCount", width: 70 },
  ];
  return (
    <PrismaCard title="Selecionar Definição de Verificação">
      <Space direction="vertical" className="prisma-m51a-full" size={14}>
        <Input prefix={<SearchOutlined />} onChange={(event) => props.onSearch(event.target.value)} placeholder="Buscar por nome ou descrição..." value={props.search} />
        <Table
          columns={columns}
          dataSource={props.definitions}
          onRow={(record) => ({ onClick: () => props.onDefinitionChange(record.id) })}
          pagination={false}
          rowKey="id"
          className="prisma-responsive-table"
          tableLayout="fixed"
        />
        <Space>
          <Button onClick={() => props.onStepChange(0)}>Voltar</Button>
          <Button disabled={!props.selectedDefinition} onClick={() => props.onStepChange(2)} type="primary">Avançar</Button>
        </Space>
      </Space>
    </PrismaCard>
  );
}

function InstrumentPreview(props: Parameters<typeof PrepareFlow>[0]) {
  const bank = props.itemBank.find((item) => item.competencyKey === props.need.competencyKey && item.targetLevel === props.selectedLevel);
  return (
    <Space direction="vertical" size={16} className="prisma-m51a-full">
      <PrismaCard title="Definição selecionada">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Definição">{props.selectedDefinition?.name}</Descriptions.Item>
          <Descriptions.Item label="Versão">{props.selectedDefinition?.version}</Descriptions.Item>
          <Descriptions.Item label="Nível">{props.selectedDefinition ? labelLevel(props.selectedDefinition.targetLevel) : ""}</Descriptions.Item>
          <Descriptions.Item label="Área">{labelProfessionalDomain(props.selectedDefinition?.domain)}</Descriptions.Item>
          <Descriptions.Item label="Descrição">{props.selectedDefinition?.description}</Descriptions.Item>
        </Descriptions>
      </PrismaCard>
      <div className="prisma-m51a-three-grid">
        <PrismaCard title="Modelo de avaliação"><Typography.Title level={5}>{props.selectedBlueprint?.key}</Typography.Title><Typography.Text>Versão {props.selectedBlueprint?.version}</Typography.Text><br /><Button>Visualizar modelo</Button></PrismaCard>
        <PrismaCard title="Critérios de correção"><Typography.Title level={5}>{props.selectedRubric?.key}</Typography.Title><Typography.Text>Versão {props.selectedRubric?.version}</Typography.Text><br /><Button>Visualizar critérios</Button></PrismaCard>
        <PrismaCard title="Banco de itens"><Typography.Title level={5}>{bank?.source === "global" ? "Global Prisma" : "Privado da empresa"}</Typography.Title><Typography.Text>Itens disponíveis: {bank?.availableItems ?? 0}</Typography.Text><br /><Button>Ver itens disponíveis</Button></PrismaCard>
      </div>
      <Space>
        <Button onClick={() => props.onStepChange(1)}>Voltar</Button>
        <Button disabled={!props.selectedBlueprint || !props.selectedRubric} onClick={() => props.onStepChange(3)} type="primary">Avançar</Button>
      </Space>
    </Space>
  );
}

function VerificationSummary(props: Parameters<typeof PrepareFlow>[0]) {
  const itemCount = props.selectedBlueprint?.itemCount ?? 0;
  return (
    <Space direction="vertical" size={16} className="prisma-m51a-full">
      <div className="prisma-m51a-two-grid">
        <PrismaCard title="Verificação">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Competência">{props.need.competencyLabel}</Descriptions.Item>
            <Descriptions.Item label="Nível">{labelLevel(props.selectedLevel)}</Descriptions.Item>
            <Descriptions.Item label="Definição">{props.selectedDefinition?.name} ({props.selectedDefinition?.version})</Descriptions.Item>
            <Descriptions.Item label="Modelo de avaliação">{props.selectedBlueprint?.key} ({props.selectedBlueprint?.version})</Descriptions.Item>
            <Descriptions.Item label="Critérios de correção">{props.selectedRubric?.key} ({props.selectedRubric?.version})</Descriptions.Item>
            <Descriptions.Item label="Quantidade de questões">{itemCount}</Descriptions.Item>
            <Descriptions.Item label="Tempo estimado">{props.selectedBlueprint?.estimatedMinutes ?? 0} minutos</Descriptions.Item>
            <Descriptions.Item label="Formato">Múltipla escolha</Descriptions.Item>
            <Descriptions.Item label="Fonte dos itens">Global (Prisma)</Descriptions.Item>
            <Descriptions.Item label="Criticidade">{labelCriticality(props.need.criticality)}</Descriptions.Item>
            <Descriptions.Item label="Contexto">{props.need.vacancyTitle}</Descriptions.Item>
          </Descriptions>
        </PrismaCard>
        <PrismaCard title="O que será verificado">
          <Typography.Paragraph>{props.selectedDefinition?.content.what_is_verified as string ?? props.selectedDefinition?.description}</Typography.Paragraph>
          <Typography.Title level={5}>Próximos passos</Typography.Title>
          <ol>
            <li>Confirmar a preparação versionada do instrumento.</li>
            <li>Emitir um convite pessoal e copiar o link seguro.</li>
            <li>Acompanhar execução, telemetria factual e resultado.</li>
            <li>Gerar Evidência Demonstrada sem sobrescrever evidências anteriores.</li>
          </ol>
        </PrismaCard>
      </div>
      <Alert message="Após a execução, o Prisma cria uma Evidência Demonstrada independente e reavalia a suficiência sem decisão automática de contratação." showIcon type="info" />
      <Space>
        <Button onClick={() => props.onStepChange(2)}>Voltar</Button>
        <Button loading={props.saving === "draft"} onClick={() => void props.onPrepare("draft")}>Salvar como rascunho</Button>
        <Button loading={props.saving === "prepared"} onClick={() => void props.onPrepare("prepared")} type="primary">Confirmar e avançar</Button>
      </Space>
    </Space>
  );
}

function resolveNeed(workspace: VerificationWorkspaceView | null, needId?: string): VerificationNeedView | null {
  if (!workspace) return null;
  return workspace.needs.find((need) => need.id === needId) ?? workspace.needs[0] ?? null;
}

function sufficiencyTone(status: VerificationNeedView["sufficiencyStatus"]): PrismaStatusTone {
  if (status === "sufficient") return "success";
  if (status === "verification_required_by_policy") return "danger";
  if (status === "verification_recommended" || status === "verification_optional") return "warning";
  return "neutral";
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    policy_requires_verification: "A política da empresa exige verificação",
    documentary_evidence_strong_but_not_demonstrated: "Há evidência documental relevante, ainda não demonstrada",
    no_demonstrated_evidence: "Nenhuma evidência demonstrada foi registrada",
    critical_need_requires_human_confirmation: "A necessidade é crítica e requer confirmação humana",
    advanced_level_requires_demonstration: "O nível avançado requer demonstração prática",
  };
  const normalized = reason.toLowerCase().trim().replaceAll(" ", "_");
  return labels[normalized] ?? normalized.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function labelProfessionalDomain(domain: string | null | undefined): string {
  if (!domain) return "Não informada";
  const labels: Record<string, string> = {
    backend: "Engenharia de software",
    data: "Dados",
    cloud: "Nuvem",
    product: "Produto",
    business: "Negócios",
  };
  return labels[domain.toLowerCase()] ?? domain.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function EvidencePanel({ need }: { need: VerificationNeedView }) {
  const documentaryAvailable = need.evidenceSnapshot.documentary_evidence === "available";
  const demonstratedAvailable = hasDemonstratedEvidence(need);
  return (
    <PrismaCard title="Evidências consideradas">
      <div className="prisma-m51a-evidence-panel">
        <div><span>Documento aprovado</span><PrismaStatusTag compact label={documentaryAvailable ? "Disponível" : "Não localizado"} tone={documentaryAvailable ? "success" : "neutral"} /></div>
        <div><span>Demonstração prática</span><PrismaStatusTag compact label={demonstratedAvailable ? "Disponível" : "Pendente"} tone={demonstratedAvailable ? "success" : "warning"} /></div>
        <div><span>Necessidade de confirmação</span><PrismaStatusTag compact label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} /></div>
      </div>
      <details className="prisma-technical-details">
        <summary>Ver dados técnicos preservados</summary>
        <pre>{JSON.stringify(need.evidenceSnapshot, null, 2)}</pre>
      </details>
    </PrismaCard>
  );
}

function hasDemonstratedEvidence(need: VerificationNeedView): boolean {
  return need.evidenceSnapshot.demonstrated_evidence === "available"
    || (typeof need.evidenceSnapshot.demonstratedEvidenceId === "string" && need.evidenceSnapshot.demonstratedEvidenceId.length > 0);
}

function labelPrepared(status: PreparedAssessmentStatus): string {
  return status === "prepared" ? "Preparada" : "Rascunho";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
