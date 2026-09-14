import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Descriptions, Drawer, Empty, Input, List, Radio, Skeleton, Space, Steps, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  labelCriticality,
  labelAssessmentDimension,
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
import { PrismaState } from "../ui/PrismaState";
import { PrismaDisclosure } from "../ui/PrismaDisclosure";
import { interfaceText, resolveRequestedItem } from "../shared/uxFoundation";
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
        const compatible = result.definitions.filter((definition) => definition.competencyKey === firstNeed?.competencyKey && definition.targetLevel === firstNeed?.targetLevel);
        setDefinitionId(compatible.length === 1 ? compatible[0]!.id : null);
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
      .filter((definition) => definition.competencyKey === selectedNeed?.competencyKey && definition.targetLevel === selectedLevel)
      .filter((definition) => !normalized || `${definition.name} ${definition.description}`.toLowerCase().includes(normalized));
  }, [search, selectedLevel, selectedNeed?.competencyKey, workspace?.definitions]);
  const selectedDefinition = definitions.find((definition) => definition.id === definitionId) ?? null;
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
        <PrismaPageHeader title="Necessidades de verificação" description="Verificação recomendada por evidência e política." />
        <PrismaState kind="error" description="Não foi possível consultar as necessidades desta empresa. Volte ao acompanhamento de verificações para continuar." action={{ label: "Voltar para verificações", onClick: () => onNavigate("/verifications") }} />
        <PrismaDisclosure title="Detalhes do impedimento">{interfaceText(error)}</PrismaDisclosure>
      </PrismaPage>
    );
  }

  if (mode === "matching" && workspace) return renderMatching(workspace.needs, onNavigate, search, setSearch);
  if (!workspace || !selectedNeed) {
    return (
      <PrismaPage className="prisma-m51a-page">
        <PrismaPageHeader title="Necessidades de verificação" description="Verificação recomendada por evidência e política." />
        <PrismaCard><PrismaState kind="unavailable" description="A necessidade solicitada não está disponível nesta empresa." action={{ label: "Ver necessidades disponíveis", onClick: () => onNavigate("/matching") }} /></PrismaCard>
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
  return renderMatching(workspace.needs, onNavigate, search, setSearch);
}

function renderMatching(needs: VerificationNeedView[], onNavigate: (path: string) => void, search: string, onSearch: (value: string) => void) {
  const normalized = normalizeText(search);
  const visibleNeeds = needs.filter((need) => !normalized || `${need.personName} ${need.vacancyTitle} ${need.competencyLabel} ${need.contextSnapshot.requirement_label ?? ""} ${labelSufficiency(need.sufficiencyStatus)}`.toLocaleLowerCase("pt-BR").includes(normalized));
  const documentaryCount = needs.filter((need) => need.evidenceSnapshot.documentary_evidence === "available").length;
  const demonstratedCount = needs.filter(hasDemonstratedEvidence).length;
  const requiredCount = needs.filter((need) => need.sufficiencyStatus === "verification_required_by_policy").length;
  const allDemonstrated = needs.length > 0 && demonstratedCount === needs.length;
  const overallLabel = needs.length === 0 ? "Sem requisitos para análise" : requiredCount > 0 ? "Requer verificação" : allDemonstrated ? "Evidência suficiente" : "Aderência parcial";
  const overallTone: PrismaStatusTone = needs.length === 0 ? "neutral" : requiredCount > 0 ? "danger" : allDemonstrated ? "success" : "warning";
  const columns: ColumnsType<VerificationNeedView> = [
    { title: "Pessoa e posição", key: "context", width: 240, render: (_, need) => <Space direction="vertical" size={2}><Typography.Text strong>{need.personName}</Typography.Text><Typography.Text type="secondary">{need.vacancyTitle ?? "Sem posição vinculada"}</Typography.Text></Space> },
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
      <PrismaPageHeader title="Necessidades de verificação" description="Requisitos com suficiência de evidência e necessidade de verificação." />
      <PrismaCard className="prisma-m51a-profile-card">
        <div className="prisma-m51a-profile-context">
          <Typography.Title level={3}>Necessidades da empresa</Typography.Title>
          <Typography.Text type="secondary">Selecione um requisito para consultar as evidências e preparar a verificação.</Typography.Text>
          <div className="prisma-m51a-overall-state"><PrismaStatusTag label={overallLabel} tone={overallTone} /><Typography.Text type="secondary">Resultado baseado nas evidências atualmente disponíveis.</Typography.Text></div>
        </div>
        <div aria-label="Resumo das evidências" className="prisma-m51a-evidence-summary">
          <span><strong>{needs.length}</strong><small>requisito{needs.length === 1 ? "" : "s"} analisado{needs.length === 1 ? "" : "s"}</small></span>
          <span><strong>{documentaryCount}</strong><small>com evidência documental</small></span>
          <span><strong>{demonstratedCount}</strong><small>com evidência demonstrada</small></span>
        </div>
      </PrismaCard>
      <PrismaCard title="Requisitos a verificar">
        <Input.Search allowClear onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por Pessoa, Posição, requisito ou status" value={search} />
        <Table scroll={{ x: 1000 }} locale={{ emptyText: <PrismaState kind={search ? "filtered" : "empty"} compact description={search ? "Nenhuma necessidade corresponde à busca." : "As necessidades aparecem aqui somente após uma ação explícita sobre um requisito do matching."} action={search ? { label: "Limpar busca", onClick: () => onSearch("") } : { label: "Voltar para verificações", onClick: () => onNavigate("/verifications") }} /> }} className="prisma-responsive-table prisma-matching-table" columns={columns} dataSource={visibleNeeds} pagination={false} rowKey="id" tableLayout="fixed" />
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
      <Space direction="vertical" size={16} className="prisma-m51a-full">
        <PrismaCard title="Contexto preservado" extra={<PrismaStatusTag label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} />}>
          <Descriptions column={{ xs: 1, md: 2 }} size="small">
            <Descriptions.Item label="Pessoa"><Button onClick={() => onNavigate(`/profiles/${need.personId}/profile`)} type="link">{need.personName}</Button></Descriptions.Item>
            <Descriptions.Item label="Posição"><Button onClick={() => onNavigate(`/vacancies/${need.vacancyId}`)} type="link">{need.vacancyTitle}</Button></Descriptions.Item>
            <Descriptions.Item label="Requisito">{String(need.contextSnapshot.requirement_label ?? need.competencyLabel)}</Descriptions.Item>
            <Descriptions.Item label="Importância">{need.contextSnapshot.requirement_importance === "required" ? "Obrigatório" : "Desejável"}</Descriptions.Item>
            <Descriptions.Item label="Nível requerido">{labelLevel(need.targetLevel)}</Descriptions.Item>
            <Descriptions.Item label="Criticidade">{labelCriticality(need.criticality)}</Descriptions.Item>
            <Descriptions.Item label="Política aplicada">{policyLabel(need.sufficiencyRequirement)}</Descriptions.Item>
            <Descriptions.Item label="Versão da Posição">{String(need.contextSnapshot.vacancy_version ?? "Histórica")}</Descriptions.Item>
            <Descriptions.Item label="Preparação">{prepared ? labelPrepared(prepared.status) : "Ainda não preparada"}</Descriptions.Item>
            <Descriptions.Item label="Criada em">{formatDate(need.createdAt)}</Descriptions.Item>
          </Descriptions>
        </PrismaCard>
        <PrismaCard title="Por que verificar"><Typography.Paragraph>{need.explanation}</Typography.Paragraph><ul className="prisma-m51a-reason-list">{need.reasonCodes.map((reason) => <li key={reason}><CheckCircleOutlined />{reasonLabel(reason)}</li>)}</ul></PrismaCard>
        <EvidencePanel need={need} />
        <PrismaCard title="Linha do tempo"><List dataSource={need.events ?? []} locale={{ emptyText: "Nenhum evento posterior registrado." }} renderItem={(event) => <List.Item><List.Item.Meta title={timelineLabel(event.action)} description={`${formatDate(event.createdAt)} · ${event.result === "success" ? "Concluído" : "Falhou"}`} /></List.Item>} /></PrismaCard>
        <Alert message="A verificação gera uma evidência nova e independente. Ela só pode fortalecer este requisito exato; não decide contratação nem apaga evidências anteriores." showIcon type="info" />
      </Space>
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
        <Alert showIcon type="info" message="O contexto veio do requisito selecionado no matching e permanecerá ligado à mesma Pessoa e versão da Posição." />
        <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="Pessoa">{props.need.personName}</Descriptions.Item>
          <Descriptions.Item label="Posição">{props.need.vacancyTitle}</Descriptions.Item>
          <Descriptions.Item label="Requisito">{String(props.need.contextSnapshot.requirement_label ?? props.need.competencyLabel)}</Descriptions.Item>
          <Descriptions.Item label="Competência">{props.need.competencyLabel}</Descriptions.Item>
          <Descriptions.Item label="Nível">{labelLevel(props.need.targetLevel)}</Descriptions.Item>
          <Descriptions.Item label="Criticidade">{labelCriticality(props.need.criticality)}</Descriptions.Item>
          <Descriptions.Item label="Política">{policyLabel(props.need.sufficiencyRequirement)}</Descriptions.Item>
          <Descriptions.Item label="Definição da Posição">v{String(props.need.contextSnapshot.vacancy_version ?? "histórica")}</Descriptions.Item>
        </Descriptions>
        <Button onClick={() => props.onStepChange(1)} type="primary">Avançar</Button>
      </Space>
    </PrismaCard>
  );
}

function SelectDefinition(props: Parameters<typeof PrepareFlow>[0]) {
  const columns: ColumnsType<VerificationDefinitionView> = [
    { title: "Definição", dataIndex: "name", render: (_, definition) => <Radio value={definition.id}>{definition.name}<br /><Typography.Text type="secondary">{definition.description}</Typography.Text></Radio>, width: 320 },
    { title: "Nível", dataIndex: "targetLevel", render: labelLevel, width: 110 },
    { title: "Área", dataIndex: "domain", render: labelProfessionalDomain, width: 150 },
    { title: "Versão", dataIndex: "version", width: 90 },
    { title: "Uso", dataIndex: "usageCount", width: 70 },
  ];
  return (
    <PrismaCard title="Selecionar Definição de Verificação">
      <Space direction="vertical" className="prisma-m51a-full" size={14}>
        <Input prefix={<SearchOutlined />} onChange={(event) => props.onSearch(event.target.value)} placeholder="Buscar por nome ou descrição..." value={props.search} />
        <Radio.Group className="prisma-m51a-full" onChange={(event) => props.onDefinitionChange(event.target.value as string)} value={props.selectedDefinition?.id ?? null}><Table
          columns={columns}
          dataSource={props.definitions}
          onRow={(record) => ({ onClick: () => props.onDefinitionChange(record.id) })}
          pagination={false}
          rowKey="id"
          className="prisma-responsive-table"
          tableLayout="fixed"
          locale={{ emptyText: <PrismaState compact kind={props.search ? "filtered" : "unavailable"} description={props.search ? "Nenhuma definição corresponde à busca." : `Não há instrumento ativo para ${props.need.competencyLabel} no nível ${labelLevel(props.need.targetLevel)}.`} {...(props.search ? { action: { label: "Limpar busca", onClick: () => props.onSearch("") } } : {})} /> }}
        /></Radio.Group>
        <Space>
          <Button onClick={() => props.onStepChange(0)}>Voltar</Button>
          <Button disabled={!props.selectedDefinition} onClick={() => props.onStepChange(2)} type="primary">Avançar</Button>
        </Space>
      </Space>
    </PrismaCard>
  );
}

function InstrumentPreview(props: Parameters<typeof PrepareFlow>[0]) {
  const [preview, setPreview] = useState<"blueprint" | "rubric" | "items" | null>(null);
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
        <PrismaCard title="Modelo de avaliação"><Typography.Title level={5}>{props.selectedBlueprint?.key}</Typography.Title><Typography.Text>Versão {props.selectedBlueprint?.version}</Typography.Text><br /><Button onClick={() => setPreview("blueprint")}>Visualizar modelo</Button></PrismaCard>
        <PrismaCard title="Critérios de correção"><Typography.Title level={5}>{props.selectedRubric?.key}</Typography.Title><Typography.Text>Versão {props.selectedRubric?.version}</Typography.Text><br /><Button onClick={() => setPreview("rubric")}>Visualizar critérios</Button></PrismaCard>
        <PrismaCard title="Banco de itens"><Typography.Title level={5}>{bank?.source === "global" ? "Global Prisma" : "Privado da empresa"}</Typography.Title><Typography.Text>Itens disponíveis: {bank?.availableItems ?? 0}</Typography.Text><br /><Button onClick={() => setPreview("items")}>Ver cobertura disponível</Button></PrismaCard>
      </div>
      <Space>
        <Button onClick={() => props.onStepChange(1)}>Voltar</Button>
        <Button disabled={!props.selectedBlueprint || !props.selectedRubric} onClick={() => props.onStepChange(3)} type="primary">Avançar</Button>
      </Space>
      <Drawer onClose={() => setPreview(null)} open={Boolean(preview)} title={preview === "blueprint" ? "Modelo de avaliação" : preview === "rubric" ? "Critérios de correção" : "Cobertura do Banco de Itens"} size="large">{preview === "blueprint" ? <Descriptions column={1} bordered size="small" items={[{ key: "items", label: "Questões", children: props.selectedBlueprint?.itemCount }, { key: "time", label: "Tempo estimado", children: `${props.selectedBlueprint?.estimatedMinutes ?? 0} min` }, { key: "mode", label: "Formato", children: "Múltipla escolha" }, { key: "dimensions", label: "Dimensões", children: props.selectedBlueprint?.dimensionDistribution.map((item) => `${labelAssessmentDimension(item.dimension)} (${item.count})`).join(", ") }]} /> : preview === "rubric" ? <><Typography.Text strong>Dimensões de correção</Typography.Text><ul>{props.selectedRubric?.correctionDimensions.map((item) => <li key={item}>{labelAssessmentDimension(item)}</li>)}</ul><PrismaDisclosure title="Regras técnicas versionadas"><pre>{JSON.stringify(props.selectedRubric?.passingRules ?? {}, null, 2)}</pre></PrismaDisclosure></> : <><Alert showIcon type="info" message="Os enunciados permanecem protegidos. Esta prévia mostra somente cobertura e origem." /><Descriptions column={1} bordered size="small" items={[{ key: "source", label: "Origem", children: bank?.source === "global" ? "Global Prisma" : "Privado da empresa" }, { key: "available", label: "Itens ativos", children: bank?.availableItems ?? 0 }, { key: "required", label: "Itens necessários", children: props.selectedBlueprint?.itemCount ?? 0 }]} /></>}</Drawer>
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
            <Descriptions.Item label="Pessoa">{props.need.personName}</Descriptions.Item>
            <Descriptions.Item label="Posição">{props.need.vacancyTitle} · definição v{String(props.need.contextSnapshot.vacancy_version ?? "histórica")}</Descriptions.Item>
            <Descriptions.Item label="Requisito">{String(props.need.contextSnapshot.requirement_label ?? props.need.competencyLabel)}</Descriptions.Item>
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
        <Button loading={props.saving === "prepared"} onClick={() => void props.onPrepare("prepared")} type="primary">Preparar e gerar link de convite</Button>
      </Space>
    </Space>
  );
}

function resolveNeed(workspace: VerificationWorkspaceView | null, needId?: string): VerificationNeedView | null {
  if (!workspace) return null;
  return resolveRequestedItem(workspace.needs, needId);
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
  const matchingRequirement = isRecord(need.evidenceSnapshot.matching_requirement) ? need.evidenceSnapshot.matching_requirement : {};
  const matchingEvidence = Array.isArray(matchingRequirement.evidence) ? matchingRequirement.evidence.filter(isRecord) : [];
  return (
    <PrismaCard title="Evidências consideradas">
      <div className="prisma-m51a-evidence-panel">
        <div><span>Documento aprovado</span><PrismaStatusTag compact label={documentaryAvailable ? "Disponível" : "Não localizado"} tone={documentaryAvailable ? "success" : "neutral"} /></div>
        <div><span>Demonstração prática</span><PrismaStatusTag compact label={demonstratedAvailable ? "Disponível" : "Pendente"} tone={demonstratedAvailable ? "success" : "warning"} /></div>
        <div><span>Necessidade de confirmação</span><PrismaStatusTag compact label={labelSufficiency(need.sufficiencyStatus)} tone={sufficiencyTone(need.sufficiencyStatus)} /></div>
      </div>
      <Typography.Title level={5}>Evidências do matching</Typography.Title>
      <List dataSource={matchingEvidence} locale={{ emptyText: "Nenhuma evidência suficiente foi localizada para este requisito." }} renderItem={(item) => <List.Item><List.Item.Meta title={String(item.label ?? "Evidência profissional")} description={`${String(item.source ?? "Perfil publicado")}${item.fieldPath ? ` · ${String(item.fieldPath)}` : ""}`} /></List.Item>} />
      <details className="prisma-technical-details">
        <summary>Ver dados técnicos preservados</summary>
        <pre>{JSON.stringify(need.evidenceSnapshot, null, 2)}</pre>
      </details>
    </PrismaCard>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function normalizeText(value: string): string { return value.trim().toLocaleLowerCase("pt-BR"); }
function policyLabel(value: VerificationNeedView["sufficiencyRequirement"]): string { return ({ none: "Sem exigência", optional: "Opcional", recommended: "Recomendada", required_by_policy: "Exigida pela política" } as const)[value]; }
function timelineLabel(action: string): string { return ({ m62_contextual_need_created: "Necessidade criada a partir do requisito", m62_contextual_need_reused: "Necessidade existente reaberta", m51a_assessment_draft_saved: "Rascunho do instrumento salvo", m51a_assessment_prepared: "Instrumento preparado", invitation_issued: "Link de convite gerado", invitation_cancelled: "Convite cancelado", invitation_revoked: "Convite revogado", m51b_assessment_evaluated: "Verificação avaliada" } as Record<string, string>)[action] ?? action.replaceAll("_", " "); }

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
