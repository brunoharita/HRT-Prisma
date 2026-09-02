import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  LockOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Alert, Button, Divider, Drawer, Empty, Input, Popconfirm, Select, Space, Tabs, Tag, Timeline, Tooltip, Typography } from "antd";
import type { RefSelectProps } from "antd";
import type { ProfileReviewWorkspace, StructuredDraft } from "../../domain/personIngestion";
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_ORIGIN_LABELS,
  EDUCATION_QUALIFICATION_LABELS,
  EDUCATION_STATUSES,
  EDUCATION_STATUS_LABELS,
  confirmEducationClassification,
  educationClassificationNeedsReview,
  qualificationOptionsForLevel,
  resolveEducationClassification,
  withHumanEducationClassification,
  type EducationClassificationOrigin,
  type EducationLevel,
  type EducationQualification,
  type EducationStatus,
} from "../../../../src/domain/educationClassification";
import { fieldPathMatches, topLevelReviewField } from "../../domain/spatialEvidence";
import {
  createReviewEntityId,
  isEducationEmpty,
  isExperienceEmpty,
  reviewEntityFieldPath,
  reviewFieldPathExists,
  type ReviewDraftIssue,
} from "../../domain/reviewFieldLifecycle";

interface StructuredReviewPanelProps {
  workspace: ProfileReviewWorkspace;
  draft: StructuredDraft;
  editable: boolean;
  viewOnly?: boolean;
  busy: boolean;
  hasUnsavedChanges: boolean;
  hasTransientChanges: boolean;
  deferredActionLabel: string | null;
  selectedFieldPath: string;
  activeLinkId: string | null;
  validationIssues: ReviewDraftIssue[];
  onSaveAndContinue: () => void;
  onDiscardAndContinue: () => void;
  onDraftChange: (draft: StructuredDraft) => void;
  onFieldSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onStartSelection: (fieldPath: string) => void;
  onCreateCustomSection: () => void;
  onEvidenceNavigate: (input: { fieldPath: string; linkId: string; pageNumber: number; regionId: string | null }) => void;
  onEvidenceDelete: (input: { fieldPath: string; linkId: string }) => void;
}

type RemovedDraftEntry =
  | { key: string; kind: "experience"; index: number; item: StructuredDraft["experiences"][number]; label: string }
  | { key: string; kind: "education"; index: number; item: StructuredDraft["education"][number]; label: string }
  | { key: string; kind: "result"; index: number; item: StructuredDraft["keyResults"][number]; label: string }
  | { key: string; kind: "custom-section"; index: number; item: StructuredDraft["customSections"][number]; label: string }
  | { key: string; kind: "custom-item"; sectionId: string; index: number; item: StructuredDraft["customSections"][number]["items"][number]; label: string };

export function StructuredReviewPanel({
  workspace,
  draft,
  editable,
  viewOnly = false,
  busy,
  hasUnsavedChanges,
  hasTransientChanges,
  deferredActionLabel,
  selectedFieldPath,
  activeLinkId,
  validationIssues,
  onSaveAndContinue,
  onDiscardAndContinue,
  onDraftChange,
  onFieldSelect,
  onStartSelection,
  onCreateCustomSection,
  onEvidenceNavigate,
  onEvidenceDelete,
}: StructuredReviewPanelProps) {
  const [experienceIndex, setExperienceIndex] = useState(0);
  const [educationIndex, setEducationIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [removedEntries, setRemovedEntries] = useState<RemovedDraftEntry[]>([]);
  const activeTab = tabForField(selectedFieldPath);
  useEffect(() => setRemovedEntries([]), [workspace.lockVersion]);

  function validationMessage(fieldPath: string): string | null {
    return validationIssues.find((issue) => fieldPathMatches(issue.fieldPath, fieldPath))?.message ?? null;
  }

  function selectTab(key: string) {
    const defaults: Record<string, string> = {
      summary: "identity.fullName",
      experience: draft.experiences[experienceIndex] ? reviewEntityFieldPath("experience", draft.experiences[experienceIndex], "role") : "experiences",
      education: draft.education[educationIndex] ? reviewEntityFieldPath("education", draft.education[educationIndex], "course") : "education",
      skills: "competencies",
      languages: "languages",
      other: firstOtherFieldPath(draft),
    };
    onFieldSelect(defaults[key] ?? "summary");
  }

  function rememberRemoval(entry: RemovedDraftEntry) {
    setRemovedEntries((current) => [...current.filter((item) => item.key !== entry.key), entry]);
  }

  function undoRemoval(entry: RemovedDraftEntry) {
    if (entry.kind === "experience") {
      const experiences = [...draft.experiences]; experiences.splice(entry.index, 0, entry.item);
      onDraftChange({ ...draft, experiences }); setExperienceIndex(entry.index);
      onFieldSelect(reviewEntityFieldPath("experience", entry.item, "role"));
    } else if (entry.kind === "education") {
      const education = [...draft.education]; education.splice(entry.index, 0, entry.item);
      onDraftChange({ ...draft, education }); setEducationIndex(entry.index);
      onFieldSelect(reviewEntityFieldPath("education", entry.item, "course"));
    } else if (entry.kind === "result") {
      const keyResults = [...draft.keyResults]; keyResults.splice(entry.index, 0, entry.item);
      onDraftChange({ ...draft, keyResults });
      onFieldSelect(`keyResults.${entry.item.id}.value`);
    } else if (entry.kind === "custom-section") {
      const customSections = [...draft.customSections]; customSections.splice(entry.index, 0, entry.item);
      onDraftChange({ ...draft, customSections });
      const restoredItem = entry.item.items[0];
      onFieldSelect(restoredItem ? `customSections.${entry.item.id}.items.${restoredItem.id}.value` : "certifications");
    } else {
      onDraftChange({
        ...draft,
        customSections: draft.customSections.map((section) => {
          if (section.id !== entry.sectionId) return section;
          const items = [...section.items]; items.splice(entry.index, 0, entry.item);
          return { ...section, items };
        }),
      });
      onFieldSelect(`customSections.${entry.sectionId}.items.${entry.item.id}.value`);
    }
    setRemovedEntries((current) => current.filter((item) => item.key !== entry.key));
  }

  function removalNotice(entry: RemovedDraftEntry) {
    return <Alert action={<Button onClick={() => undoRemoval(entry)} size="small">Desfazer</Button>} key={entry.key} showIcon title={`${entry.label} ao salvar.`} type="warning" />;
  }

  function addResult() {
    const existingIndex = draft.keyResults.findIndex((item) => !workspace.reviewedData.keyResults.some((persisted) => persisted.id === item.id) && !item.value.trim());
    if (existingIndex >= 0) {
      onFieldSelect(`keyResults.${draft.keyResults[existingIndex]!.id}.value`);
      return;
    }
    const item = { id: `result_${crypto.randomUUID().replaceAll("-", "")}`, value: "" };
    onDraftChange({ ...draft, keyResults: [...draft.keyResults, item] });
    onFieldSelect(`keyResults.${item.id}.value`);
  }

  function removeResult(resultId: string) {
    const index = draft.keyResults.findIndex((item) => item.id === resultId);
    const item = draft.keyResults[index];
    if (!item) return;
    if (workspace.reviewedData.keyResults.some((candidate) => candidate.id === item.id)) {
      rememberRemoval({ key: `result:${item.id}`, kind: "result", index, item, label: `O resultado ${index + 1} será removido` });
    }
    const keyResults = draft.keyResults.filter((candidate) => candidate.id !== resultId);
    onDraftChange({ ...draft, keyResults });
    const next = keyResults[Math.min(index, keyResults.length - 1)];
    onFieldSelect(next ? `keyResults.${next.id}.value` : "summary");
  }

  const matchingEvidenceLinks = workspace.evidenceLinks.filter((link) => link.state === "active" && fieldPathMatches(link.fieldPath, selectedFieldPath));
  const hasSpatialOriginal = matchingEvidenceLinks.some((link) => link.linkKind === "original" && Boolean(link.spatialRegionId));
  const evidenceLinks = matchingEvidenceLinks.filter((link) => !(hasSpatialOriginal && link.linkKind === "original" && !link.spatialRegionId));
  const fieldChanges = workspace.changes.filter((change) => topLevelReviewField(selectedFieldPath) === change.fieldPath);
  const evidenceEvents = workspace.evidenceEvents.filter((event) => fieldPathMatches(event.fieldPath, selectedFieldPath));
  const adaptationEvents = workspace.adaptationEvents.filter((event) => event.acceptedSuggestions.some((suggestion) => fieldPathMatches(suggestion.fieldPath, selectedFieldPath)));
  const canSelectEvidence = reviewFieldPathExists(draft, selectedFieldPath);
  const evidenceBlockedReason = hasUnsavedChanges
    ? "Salve as alterações atuais para continuar."
    : !canSelectEvidence
      ? "Adicione ou selecione um campo antes de escolher uma evidência."
      : null;

  return (
    <section aria-label="Revisão estruturada" className="prisma-structured-review">
      <div className="prisma-review-panel-topline">
        <Typography.Text type="secondary">{viewOnly ? "Modo de visualização" : "Modo de edição"}</Typography.Text>
        <Tag color="blue"><FileSearchOutlined /> {viewOnly ? "Somente leitura" : "Assistida por evidência"}</Tag>
      </div>
      {editable && hasUnsavedChanges ? (
        <Alert
          action={<Space wrap>
            <Popconfirm
              cancelText="Manter alterações"
              description={deferredActionLabel
                ? `As alterações não salvas serão perdidas e o Prisma voltará a ${deferredActionLabel}.`
                : "As alterações não salvas serão perdidas."}
              okText={deferredActionLabel ? "Descartar e continuar" : "Descartar alterações"}
              onConfirm={onDiscardAndContinue}
              title="Descartar as alterações atuais?"
            >
              <Button disabled={busy} size="small">{deferredActionLabel ? "Descartar e continuar" : "Descartar alterações"}</Button>
            </Popconfirm>
            <Button loading={busy} onClick={onSaveAndContinue} size="small" type="primary">
              {deferredActionLabel ? "Salvar rascunho e continuar" : "Salvar rascunho"}
            </Button>
          </Space>}
          className="prisma-review-unsaved-alert"
          data-review-unsaved-alert
          description={deferredActionLabel
            ? `Salve o rascunho para ${deferredActionLabel}. Depois do salvamento, o Prisma retomará essa ação automaticamente.`
            : "Para manter evidências e áreas vinculadas à versão correta, salve o rascunho antes de iniciar uma dessas ações."}
          id="prisma-review-unsaved-alert"
          showIcon
          title="Há alterações não salvas"
          type="warning"
        />
      ) : null}
      {editable && hasTransientChanges && !hasUnsavedChanges ? <Alert description="Preencha o campo manualmente ou selecione sua área no documento. Um formulário vazio pode ser cancelado e não exige salvamento nem justificativa." showIcon title="Novo campo aguardando conteúdo" type="info" /> : null}
      <Tabs
        activeKey={activeTab}
        className="prisma-review-tabs"
        items={[
          { key: "summary", label: "Resumo", children: <SummaryEditor {...commonProps()} onAddResult={addResult} onRemoveResult={removeResult} removedResults={removedEntries.filter((entry) => entry.kind === "result")} validationIssues={validationIssues} onUndoRemoval={undoRemoval} /> },
          { key: "experience", label: `Experiência (${draft.experiences.length})`, children: ExperienceEditor() },
          { key: "education", label: `Formação (${draft.education.length})`, children: EducationEditor() },
          { key: "skills", label: "Competências", children: TagField({ fieldPath: "competencies", label: "Competências explícitas" }) },
          { key: "languages", label: "Idiomas", children: TagField({ fieldPath: "languages", label: "Idiomas" }) },
          { key: "other", label: "Outros", children: OtherEditor() },
        ]}
        onChange={selectTab}
      />

      <section className="prisma-linked-evidence" aria-labelledby="linked-evidence-title">
        <div className="prisma-review-section-title">
          <div><Typography.Text id="linked-evidence-title" strong>Evidências vinculadas</Typography.Text><small>{selectedFieldPath}</small></div>
          {editable ? <Tooltip title={evidenceBlockedReason}>
            <Button aria-describedby={hasUnsavedChanges ? "prisma-review-unsaved-alert" : undefined} aria-label={evidenceBlockedReason ? `Adicionar evidência. ${evidenceBlockedReason}` : undefined} className={evidenceBlockedReason ? "prisma-review-action--blocked" : ""} disabled={!editable || busy || !canSelectEvidence} icon={hasUnsavedChanges || !canSelectEvidence ? <LockOutlined /> : <PlusOutlined />} onClick={() => onStartSelection(selectedFieldPath)} size="small">Adicionar evidência</Button>
          </Tooltip> : null}
        </div>
        {evidenceLinks.length ? (
          <div className="prisma-evidence-card-grid">
            {evidenceLinks.map((link) => {
              const original = link.evidenceId ? workspace.originalEvidence.find((item) => item.id === link.evidenceId) : null;
              const region = link.spatialRegionId ? workspace.spatialRegions.find((item) => item.id === link.spatialRegionId) : null;
              const excludedRefinements = region ? workspace.evidenceRefinements.filter((item) => item.regionId === region.id && item.decision === "excluded") : [];
              const pageNumber = region?.pageNumber ?? original?.sourcePage;
              return (
                <div
                  className={[
                    "prisma-evidence-card",
                    `prisma-evidence-card--${link.linkKind}`,
                    activeLinkId === link.id ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                  key={link.id}
                >
                  <button className="prisma-evidence-card__navigate" disabled={!pageNumber} onClick={() => pageNumber && onEvidenceNavigate({ fieldPath: link.fieldPath, linkId: link.id, pageNumber, regionId: region?.id ?? null })} type="button">
                    <span>{link.linkKind === "original" ? "Original (extração)" : link.linkKind === "reviewer" ? "Revisor (selecionada)" : "Complementar"}</span>
                    <strong>{pageNumber ? `Página ${pageNumber}` : "Página não identificada"}</strong>
                    <p>{region?.selectedText ?? original?.quotedText ?? "Evidência espacial sem texto reconhecido."}</p>
                    {excludedRefinements.length ? <small>{excludedRefinements.length} {excludedRefinements.length === 1 ? "área previamente mapeada foi descontada" : "áreas previamente mapeadas foram descontadas"} desta evidência.</small> : null}
                    {!region && original ? <small>Sem região espacial; coordenadas não foram inferidas.</small> : null}
                  </button>
                  {link.linkKind !== "original" && editable ? (
                    <Popconfirm cancelText="Manter" description="O vínculo será retirado da revisão, mas permanecerá no histórico auditável." okText="Excluir evidência" onConfirm={() => onEvidenceDelete({ fieldPath: link.fieldPath, linkId: link.id })} title="Excluir esta evidência do revisor?">
                      <Button aria-label="Excluir evidência do revisor" className="prisma-evidence-card__delete" danger icon={<DeleteOutlined />} size="small" type="text" />
                    </Popconfirm>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : <Empty description="Sem evidência vinculada" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        {editable ? <Tooltip title={evidenceBlockedReason}>
        <Button aria-describedby={hasUnsavedChanges ? "prisma-review-unsaved-alert" : undefined} aria-label={evidenceBlockedReason ? `Selecionar uma nova área. ${evidenceBlockedReason}` : undefined} block className={["prisma-add-evidence-card", evidenceBlockedReason ? "prisma-review-action--blocked" : ""].filter(Boolean).join(" ")} disabled={!editable || busy || !canSelectEvidence} icon={hasUnsavedChanges || !canSelectEvidence ? <LockOutlined /> : <PlusOutlined />} onClick={() => onStartSelection(selectedFieldPath)} type="dashed">
          Selecione uma nova área no documento
        </Button>
        </Tooltip> : null}
      </section>

      <section className="prisma-field-history">
        <div className="prisma-review-section-title">
          <Typography.Text strong><HistoryOutlined /> Histórico do campo</Typography.Text>
          <Button onClick={() => setHistoryOpen(true)} size="small" type="link">Histórico completo</Button>
        </div>
        {fieldChanges.length || evidenceEvents.length || adaptationEvents.length ? (
          <Timeline items={compactHistory(fieldChanges, evidenceEvents, adaptationEvents).slice(0, 4)} />
        ) : <Empty description="Nenhuma intervenção humana neste campo." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </section>

      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} placement="right" size="large" title="Histórico completo da revisão">
        <Timeline items={fullHistory(workspace)} />
      </Drawer>
    </section>
  );

  function commonProps() {
    return { workspace, draft, editable, selectedFieldPath, onDraftChange, onFieldSelect };
  }

  function ExperienceEditor() {
    const addExperience = () => {
      const existingIndex = draft.experiences.findIndex((item) => !workspace.reviewedData.experiences.some((persisted) => persisted.id === item.id) && isExperienceEmpty(item));
      if (existingIndex >= 0) {
        setExperienceIndex(existingIndex);
        onFieldSelect(reviewEntityFieldPath("experience", draft.experiences[existingIndex]!, "organization"));
        return;
      }
      const item: StructuredDraft["experiences"][number] = {
        id: createReviewEntityId("experience"), source: "human", role: null, organization: null,
        period: null, description: null, evidenceText: "", page: null,
      };
      const index = draft.experiences.length;
      onDraftChange({ ...draft, experiences: [...draft.experiences, item] });
      setExperienceIndex(index);
      onFieldSelect(reviewEntityFieldPath("experience", item, "organization"));
    };
    if (draft.experiences.length === 0) return <div className="prisma-entity-review"><Empty description="Nenhuma experiência mantida neste perfil." />{editable ? <Button icon={<PlusOutlined />} onClick={addExperience} type="dashed">Adicionar experiência</Button> : null}{removedEntries.filter((entry) => entry.kind === "experience").map(removalNotice)}</div>;
    const index = Math.min(experienceIndex, draft.experiences.length - 1);
    const reviewed = draft.experiences[index]!;
    const extracted = workspace.extractedData.experiences.find((item) => item.id === reviewed.id);
    const update = (patch: Partial<typeof reviewed>) => onDraftChange({ ...draft, experiences: draft.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    const organizationPath = reviewEntityFieldPath("experience", reviewed, "organization");
    const rolePath = reviewEntityFieldPath("experience", reviewed, "role");
    const periodPath = reviewEntityFieldPath("experience", reviewed, "period");
    const descriptionPath = reviewEntityFieldPath("experience", reviewed, "description");
    const persisted = workspace.reviewedData.experiences.some((item) => item.id === reviewed.id);
    const removeExperience = () => {
      if (persisted) rememberRemoval({ key: `experience:${reviewed.id}`, kind: "experience", index, item: reviewed, label: `A experiência ${index + 1} será removida` });
      const experiences = draft.experiences.filter((item) => item.id !== reviewed.id);
      onDraftChange({ ...draft, experiences });
      const nextIndex = Math.max(0, Math.min(index, experiences.length - 1));
      setExperienceIndex(nextIndex);
      const next = experiences[nextIndex];
      onFieldSelect(next ? reviewEntityFieldPath("experience", next, "role") : "experiences");
    };
    return (
      <div className="prisma-entity-review">
        <div className="prisma-entity-review__toolbar"><EntityNavigator count={draft.experiences.length} index={index} label="Experiência" onChange={(next) => { setExperienceIndex(next); const item = draft.experiences[next]; if (item) onFieldSelect(reviewEntityFieldPath("experience", item, "role")); }} />{editable ? <Space wrap><Button icon={<PlusOutlined />} onClick={addExperience} size="small">Adicionar experiência</Button><Popconfirm onConfirm={removeExperience} title={persisted ? "Não incluir esta experiência no perfil?" : "Cancelar a inclusão desta experiência?"}><Button danger={persisted} icon={<DeleteOutlined />} size="small">{persisted ? "Remover experiência" : "Cancelar inclusão"}</Button></Popconfirm></Space> : null}</div>
        <Typography.Text type="secondary">{persisted ? `Origem ${reviewed.source === "human" ? "humana" : "extraída"}. Informe ao menos Empresa ou Cargo.` : "Nova experiência. Preencha Empresa ou Cargo manualmente, ou selecione uma área no documento sem salvar antes."}</Typography.Text>
        <ReviewField editable={editable} extracted={extracted?.organization ?? "Não identificado"} fieldPath={organizationPath} label="Empresa" onChange={(value) => update({ organization: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, organizationPath)} validationMessage={validationMessage(organizationPath)} value={reviewed.organization ?? ""} />
        <ReviewField editable={editable} extracted={extracted?.role ?? "Não identificado"} fieldPath={rolePath} label="Cargo" onChange={(value) => update({ role: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, rolePath)} validationMessage={validationMessage(rolePath)} value={reviewed.role ?? ""} />
        <ReviewField editable={editable} extracted={extracted?.period ?? "Não identificado"} fieldPath={periodPath} label="Período" onChange={(value) => update({ period: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, periodPath)} validationMessage={validationMessage(periodPath)} value={reviewed.period ?? ""} />
        <ReviewField editable={editable} extracted={extracted?.description ?? "Não identificado"} fieldPath={descriptionPath} label="Descrição / Principais atividades" multiline onChange={(value) => update({ description: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, descriptionPath)} validationMessage={validationMessage(descriptionPath)} value={reviewed.description ?? ""} />
        {removedEntries.filter((entry) => entry.kind === "experience").map(removalNotice)}
      </div>
    );
  }

  function EducationEditor() {
    const addEducation = () => {
      const existingIndex = draft.education.findIndex((item) => !workspace.reviewedData.education.some((persisted) => persisted.id === item.id) && isEducationEmpty(item));
      if (existingIndex >= 0) {
        setEducationIndex(existingIndex);
        onFieldSelect(reviewEntityFieldPath("education", draft.education[existingIndex]!, "course"));
        return;
      }
      const item: StructuredDraft["education"][number] = {
        id: createReviewEntityId("education"), source: "human", course: null, institution: null,
        period: null, description: null, evidenceText: "", page: null, originalText: "",
        level: "unknown", qualification: "unknown", status: "unknown", classificationOrigin: "human",
        classificationSources: { level: "human", qualification: "human", status: "human" },
        classificationReasons: ["human_record_created"], classificationMethodVersion: "human-review-1.0.0", classificationReviewed: false,
      };
      const index = draft.education.length;
      onDraftChange({ ...draft, education: [...draft.education, item] });
      setEducationIndex(index);
      onFieldSelect(reviewEntityFieldPath("education", item, "course"));
    };
    if (draft.education.length === 0) return <div className="prisma-entity-review"><Empty description="Nenhuma formação mantida neste perfil." />{editable ? <Button icon={<PlusOutlined />} onClick={addEducation} type="dashed">Adicionar formação</Button> : null}{removedEntries.filter((entry) => entry.kind === "education").map(removalNotice)}</div>;
    const index = Math.min(educationIndex, draft.education.length - 1);
    const reviewed = draft.education[index]!;
    const classification = resolveEducationClassification(reviewed);
    const extracted = workspace.extractedData.education.find((item) => item.id === reviewed.id);
    const update = (patch: Partial<typeof reviewed>) => onDraftChange({ ...draft, education: draft.education.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    const updateClassification = (patch: Partial<{ level: EducationLevel; qualification: EducationQualification; status: EducationStatus }>) => update(withHumanEducationClassification(reviewed, patch));
    const requiresClassificationReview = educationClassificationNeedsReview(classification);
    const coursePath = reviewEntityFieldPath("education", reviewed, "course");
    const institutionPath = reviewEntityFieldPath("education", reviewed, "institution");
    const periodPath = reviewEntityFieldPath("education", reviewed, "period");
    const persisted = workspace.reviewedData.education.some((item) => item.id === reviewed.id);
    const removeEducation = () => {
      if (persisted) rememberRemoval({ key: `education:${reviewed.id}`, kind: "education", index, item: reviewed, label: `A formação ${index + 1} será removida` });
      const education = draft.education.filter((item) => item.id !== reviewed.id);
      onDraftChange({ ...draft, education });
      const nextIndex = Math.max(0, Math.min(index, education.length - 1));
      setEducationIndex(nextIndex);
      const next = education[nextIndex];
      onFieldSelect(next ? reviewEntityFieldPath("education", next, "course") : "education");
    };
    return (
      <div className="prisma-entity-review">
        <Alert description="Revise o nível, a qualificação e a situação sugeridos. O texto original e a regra aplicada permanecem preservados para auditoria." showIcon title="Classificação acadêmica estruturada" type="info" />
        <div className="prisma-entity-review__toolbar"><EntityNavigator count={draft.education.length} index={index} label="Formação" onChange={(next) => { setEducationIndex(next); const item = draft.education[next]; if (item) onFieldSelect(reviewEntityFieldPath("education", item, "course")); }} />{editable ? <Space wrap><Button icon={<PlusOutlined />} onClick={addEducation} size="small">Adicionar formação</Button><Popconfirm onConfirm={removeEducation} title={persisted ? "Não incluir esta formação no perfil?" : "Cancelar a inclusão desta formação?"}><Button danger={persisted} icon={<DeleteOutlined />} size="small">{persisted ? "Remover formação" : "Cancelar inclusão"}</Button></Popconfirm></Space> : null}</div>
        <div className={["prisma-education-classification-card", requiresClassificationReview ? "requires-review" : "is-confirmed"].join(" ")}>
          <div className="prisma-education-classification-card__header"><div><strong>{reviewed.course || `Formação ${index + 1}`}</strong><span>{reviewed.institution || "Instituição não identificada"}{reviewed.period ? ` · ${reviewed.period}` : ""}</span></div><Tag color={requiresClassificationReview ? "gold" : "green"}>{requiresClassificationReview ? "Requer revisão" : "Classificação confirmada"}</Tag></div>
          <Typography.Text type="secondary">O Prisma separa curso, nível, qualificação e situação acadêmica. Inferências e campos não identificados precisam da sua confirmação.</Typography.Text>
          <ReviewField editable={editable} extracted={extracted?.course ?? "Não identificado"} fieldPath={coursePath} label="Curso" onChange={(value) => update({ course: value || null, classificationReviewed: false })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, coursePath)} validationMessage={validationMessage(coursePath)} value={reviewed.course ?? ""} />
          <ReviewField editable={editable} extracted={extracted?.institution ?? "Não identificado"} fieldPath={institutionPath} label="Instituição" onChange={(value) => update({ institution: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, institutionPath)} validationMessage={validationMessage(institutionPath)} value={reviewed.institution ?? ""} />
          <ReviewField editable={editable} extracted={extracted?.period ?? "Não identificado"} fieldPath={periodPath} label="Período" onChange={(value) => update({ period: value || null, classificationReviewed: false })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, periodPath)} validationMessage={validationMessage(periodPath)} value={reviewed.period ?? ""} />
          <div className="prisma-education-classification-grid">
            <AcademicSelect editable={editable} fieldPath={`${reviewEntityFieldPath("education", reviewed)}.status`} label="Situação" onChange={(value) => updateClassification({ status: value as EducationStatus })} onSelect={onFieldSelect} options={EDUCATION_STATUSES.map((value) => ({ value, label: EDUCATION_STATUS_LABELS[value] }))} origin={classification.classificationSources.status} selectedFieldPath={selectedFieldPath} value={classification.status} />
            <AcademicSelect editable={editable} fieldPath={`${reviewEntityFieldPath("education", reviewed)}.level`} label="Nível acadêmico" onChange={(value) => updateClassification({ level: value as EducationLevel })} onSelect={onFieldSelect} options={EDUCATION_LEVELS.map((value) => ({ value, label: EDUCATION_LEVEL_LABELS[value] }))} origin={classification.classificationSources.level} selectedFieldPath={selectedFieldPath} value={classification.level} />
            <AcademicSelect editable={editable} fieldPath={`${reviewEntityFieldPath("education", reviewed)}.qualification`} label="Qualificação" onChange={(value) => updateClassification({ qualification: value as EducationQualification })} onSelect={onFieldSelect} options={qualificationOptionsForLevel(classification.level).map((value) => ({ value, label: EDUCATION_QUALIFICATION_LABELS[value] }))} origin={classification.classificationSources.qualification} selectedFieldPath={selectedFieldPath} value={classification.qualification} />
          </div>
          <div className="prisma-education-classification-card__footer" data-review-field-path={`${reviewEntityFieldPath("education", reviewed)}.classificationOrigin`}><div><small>Origem da classificação</small><strong>{EDUCATION_ORIGIN_LABELS[classification.classificationOrigin]}</strong><span>{classification.classificationMethodVersion === "legacy-unclassified" ? "Registro histórico preservado sem reclassificação retroativa." : classification.classificationReasons.map(classificationReasonLabel).join(" · ")}</span></div>{editable ? <Button icon={<CheckCircleOutlined />} onClick={() => update(confirmEducationClassification(reviewed))} type={requiresClassificationReview ? "primary" : "default"}>{requiresClassificationReview ? "Confirmar classificação" : "Confirmada"}</Button> : null}</div>
        </div>
        {removedEntries.filter((entry) => entry.kind === "education").map(removalNotice)}
      </div>
    );
  }

  function TagField({ fieldPath, label }: { fieldPath: "certifications" | "languages" | "competencies" | "uncertainties" | "notIdentified"; label: string }) {
    const message = validationMessage(fieldPath);
    return (
      <div className={["prisma-review-field", selectedFieldPath === fieldPath ? "is-selected" : "", message ? "has-validation-error" : ""].filter(Boolean).join(" ")} data-review-field-path={fieldPath} onClick={() => onFieldSelect(fieldPath)}>
        <Typography.Text strong>{label}</Typography.Text>
        <div className="prisma-review-value-grid">
          <ValueSurface label="Extraído pelo Prisma" onSelect={() => onFieldSelect(fieldPath, "original")} value={workspace.extractedData[fieldPath].join(", ") || "Não identificado"} />
          <EditableTagSurface editable={editable} fieldPath={fieldPath} onChange={(values) => onDraftChange({ ...draft, [fieldPath]: values })} onSelect={onFieldSelect} value={draft[fieldPath]} />
        </div>
        {message ? <Typography.Text type="danger">{message}</Typography.Text> : null}
      </div>
    );
  }

  function OtherEditor() {
    return (
      <div className="prisma-review-field-stack">
        <div className="prisma-review-section-title prisma-custom-section-heading">
          <div>
            <Typography.Title level={5}>Informações do currículo</Typography.Title>
            <Typography.Text type="secondary">Áreas confirmadas como conteúdo do perfil, inclusive estruturas próprias deste currículo.</Typography.Text>
          </div>
          {editable ? (
            <Tooltip title={hasUnsavedChanges ? "Salve as alterações atuais para criar uma área personalizada." : null}>
              <Button aria-describedby={hasUnsavedChanges ? "prisma-review-unsaved-alert" : undefined} aria-label={hasUnsavedChanges ? "Criar área personalizada. Salve as alterações atuais para continuar." : undefined} className={hasUnsavedChanges ? "prisma-review-action--blocked" : ""} disabled={busy} icon={hasUnsavedChanges ? <LockOutlined /> : <PlusOutlined />} onClick={onCreateCustomSection} size="small" type="primary">Criar área personalizada</Button>
            </Tooltip>
          ) : null}
        </div>
        {TagField({ fieldPath: "certifications", label: "Certificações" })}
        {draft.customSections.map((section) => {
          const extractedSection = workspace.extractedData.customSections.find((candidate) => candidate.id === section.id);
          const sectionIndex = draft.customSections.findIndex((candidate) => candidate.id === section.id);
          const sectionPersisted = workspace.reviewedData.customSections.some((candidate) => candidate.id === section.id);
          const removeSection = () => {
            if (sectionPersisted) rememberRemoval({ key: `custom-section:${section.id}`, kind: "custom-section", index: sectionIndex, item: section, label: `A área ${section.name} será removida` });
            const customSections = draft.customSections.filter((candidate) => candidate.id !== section.id);
            const nextDraft = { ...draft, customSections };
            onDraftChange(nextDraft);
            onFieldSelect(firstOtherFieldPath(nextDraft));
          };
          const addItem = () => {
            const existing = section.items.find((item) => !workspace.reviewedData.customSections.find((candidate) => candidate.id === section.id)?.items.some((persisted) => persisted.id === item.id) && !item.value.trim());
            if (existing) {
              onFieldSelect(`customSections.${section.id}.items.${existing.id}.value`);
              return;
            }
            const item = { id: `item_${crypto.randomUUID().replaceAll("-", "")}`, value: "" };
            onDraftChange({ ...draft, customSections: draft.customSections.map((candidate) => candidate.id === section.id ? { ...candidate, items: [...candidate.items, item] } : candidate) });
            onFieldSelect(`customSections.${section.id}.items.${item.id}.value`);
          };
          return (
            <section className="prisma-custom-profile-section" key={section.id}>
              <div className="prisma-review-section-title">
                <div>
                  <Typography.Text className="prisma-custom-profile-section__name" strong>{section.name}</Typography.Text>
                  <Typography.Text type="secondary">Área personalizada · {section.format === "list" ? "lista" : "texto"} · origem {section.source === "human" ? "humana" : "extraída"}</Typography.Text>
                </div>
                {editable ? <Space wrap>{section.format === "list" ? <Button icon={<PlusOutlined />} onClick={addItem} size="small">Adicionar item</Button> : null}<Popconfirm onConfirm={removeSection} title={sectionPersisted ? "Remover esta área personalizada do perfil?" : "Cancelar a inclusão desta área?"}><Button danger={sectionPersisted} icon={<DeleteOutlined />} size="small">{sectionPersisted ? "Remover área" : "Cancelar inclusão"}</Button></Popconfirm></Space> : null}
              </div>
              {section.items.map((item, itemIndex) => {
                const fieldPath = `customSections.${section.id}.items.${item.id}.value`;
                const extractedItem = extractedSection?.items.find((candidate) => candidate.id === item.id);
                const itemPersisted = workspace.reviewedData.customSections.find((candidate) => candidate.id === section.id)?.items.some((candidate) => candidate.id === item.id) ?? false;
                const removeItem = () => {
                  if (itemPersisted) rememberRemoval({ key: `custom-item:${section.id}:${item.id}`, kind: "custom-item", sectionId: section.id, index: itemIndex, item, label: `O item ${itemIndex + 1} de ${section.name} será removido` });
                  const customSections = draft.customSections.map((candidate) => candidate.id === section.id ? { ...candidate, items: candidate.items.filter((candidateItem) => candidateItem.id !== item.id) } : candidate);
                  const nextDraft = { ...draft, customSections };
                  onDraftChange(nextDraft);
                  onFieldSelect(firstOtherFieldPath(nextDraft));
                };
                return (
                  <div className="prisma-custom-profile-section__item" key={item.id}>
                    <ReviewField
                      editable={editable}
                      extracted={extractedItem?.value ?? "Não identificado na extração original"}
                      fieldPath={fieldPath}
                      label={section.format === "list" ? `Item ${itemIndex + 1}` : "Conteúdo"}
                      multiline={section.format === "text"}
                      onChange={(value) => onDraftChange({
                        ...draft,
                        customSections: draft.customSections.map((candidate) => candidate.id === section.id
                          ? { ...candidate, items: candidate.items.map((candidateItem) => candidateItem.id === item.id ? { ...candidateItem, value } : candidateItem) }
                          : candidate),
                      })}
                      onSelect={onFieldSelect}
                      selected={fieldPathMatches(selectedFieldPath, fieldPath)}
                      validationMessage={validationMessage(fieldPath)}
                      value={item.value}
                    />
                    {editable && section.format === "list" ? <Popconfirm onConfirm={removeItem} title={itemPersisted ? "Remover este item da área?" : "Cancelar a inclusão deste item?"}><Button danger={itemPersisted} icon={<DeleteOutlined />} size="small">{itemPersisted ? "Remover item" : "Cancelar inclusão"}</Button></Popconfirm> : null}
                    {editable && !item.value.trim() ? <Typography.Text type="secondary">Novo item. Preencha-o ou cancele a inclusão; não é necessário salvar enquanto estiver vazio.</Typography.Text> : null}
                  </div>
                );
              })}
            </section>
          );
        })}
        {!draft.customSections.length ? <Alert description={editable ? "Quando um currículo trouxer uma seção própria, crie a área e selecione sua região no documento. Depois de aprovada, essa estrutura poderá ser reconhecida em novas importações da mesma organização." : "Este currículo não possui áreas personalizadas aprovadas."} showIcon type="info" /> : null}
        {removedEntries.filter((entry) => entry.kind === "custom-section" || entry.kind === "custom-item").map(removalNotice)}
        <Divider />
        <div>
          <Typography.Title level={5}>Pendências da extração</Typography.Title>
          <Typography.Text type="secondary">Estes registros explicam limites da importação. Não são fatos do perfil e não representam avaliação negativa da pessoa.</Typography.Text>
        </div>
        {TagField({ fieldPath: "uncertainties", label: "Pendências de interpretação" })}
        {TagField({ fieldPath: "notIdentified", label: "Informações não localizadas" })}
      </div>
    );
  }
}

interface CommonEditorProps {
  workspace: ProfileReviewWorkspace;
  draft: StructuredDraft;
  editable: boolean;
  selectedFieldPath: string;
  onDraftChange: (draft: StructuredDraft) => void;
  onFieldSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
}

interface SummaryEditorProps extends CommonEditorProps {
  validationIssues: ReviewDraftIssue[];
  removedResults: Extract<RemovedDraftEntry, { kind: "result" }>[];
  onAddResult: () => void;
  onRemoveResult: (resultId: string) => void;
  onUndoRemoval: (entry: RemovedDraftEntry) => void;
}

function SummaryEditor({ workspace, draft, editable, selectedFieldPath, onDraftChange, onFieldSelect, validationIssues, removedResults, onAddResult, onRemoveResult, onUndoRemoval }: SummaryEditorProps) {
  const validationMessage = (fieldPath: string) => validationIssues.find((issue) => fieldPathMatches(issue.fieldPath, fieldPath))?.message ?? null;
  const fields = [
    { path: "identity.fullName", label: "Nome completo", required: true, extracted: workspace.extractedData.identity.fullName, value: draft.identity.fullName, update: (value: string) => onDraftChange({ ...draft, identity: { fullName: value || null } }) },
    { path: "contact.city", label: "Cidade", extracted: workspace.extractedData.contact.city, value: draft.contact.city, update: (value: string) => onDraftChange({ ...draft, contact: { ...draft.contact, city: value || null } }) },
    { path: "contact.state", label: "Estado", extracted: workspace.extractedData.contact.state, value: draft.contact.state, update: (value: string) => onDraftChange({ ...draft, contact: { ...draft.contact, state: value || null } }) },
    { path: "contact.phone", label: "Telefone", extracted: workspace.extractedData.contact.phone, value: draft.contact.phone, update: (value: string) => onDraftChange({ ...draft, contact: { ...draft.contact, phone: value || null } }) },
    { path: "contact.email", label: "E-mail", extracted: workspace.extractedData.contact.email, value: draft.contact.email, update: (value: string) => onDraftChange({ ...draft, contact: { ...draft.contact, email: value || null } }) },
    { path: "contact.linkedin", label: "Perfil do LinkedIn", extracted: workspace.extractedData.contact.linkedin, value: draft.contact.linkedin, update: (value: string) => onDraftChange({ ...draft, contact: { ...draft.contact, linkedin: value || null } }) },
  ];
  return (
    <div className="prisma-review-field-stack prisma-summary-review">
      <div className="prisma-summary-section-heading">
        <Typography.Title level={5}>Identificação e contato</Typography.Title>
        <Typography.Text type="secondary">Dados privados, visíveis somente para perfis autorizados.</Typography.Text>
      </div>
      {fields.map((field) => (
        <ReviewField editable={editable} extracted={field.extracted ?? "Não identificado"} fieldPath={field.path} key={field.path} label={field.label} onChange={field.update} onSelect={onFieldSelect} required={"required" in field && field.required} selected={fieldPathMatches(selectedFieldPath, field.path)} validationMessage={validationMessage(field.path)} value={field.value ?? ""} />
      ))}

      <Divider />
      <div className="prisma-summary-section-heading">
        <Typography.Title level={5}>Posicionamento profissional</Typography.Title>
        <Typography.Text type="secondary">Título e áreas declaradas no currículo, sem inferir objetivo ou senioridade ausentes.</Typography.Text>
      </div>
      <ReviewField editable={editable} extracted={workspace.extractedData.professionalTitle ?? "Não identificado"} fieldPath="professionalTitle" label="Cargo ou título profissional" onChange={(value) => onDraftChange({ ...draft, professionalTitle: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, "professionalTitle")} validationMessage={validationMessage("professionalTitle")} value={draft.professionalTitle ?? ""} />
      <SummaryTagField editable={editable} extracted={workspace.extractedData.areasOfExpertise} fieldPath="areasOfExpertise" label="Áreas de atuação" onChange={(values) => onDraftChange({ ...draft, areasOfExpertise: values })} onSelect={onFieldSelect} selectedFieldPath={selectedFieldPath} validationMessage={validationMessage("areasOfExpertise")} value={draft.areasOfExpertise} />

      <Divider />
      <ReviewField editable={editable} extracted={workspace.extractedData.professionalObjective ?? "Não identificado"} fieldPath="professionalObjective" label="Objetivo profissional" multiline onChange={(value) => onDraftChange({ ...draft, professionalObjective: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, "professionalObjective")} validationMessage={validationMessage("professionalObjective")} value={draft.professionalObjective ?? ""} />
      <ReviewField editable={editable} extracted={workspace.extractedData.summary ?? "Não identificado"} fieldPath="summary" label="Resumo profissional" multiline onChange={(value) => onDraftChange({ ...draft, summary: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, "summary")} validationMessage={validationMessage("summary")} value={draft.summary ?? ""} />

      <Divider />
      <div className="prisma-summary-section-heading prisma-review-section-title">
        <div><Typography.Title level={5}>Principais resultados</Typography.Title><Typography.Text type="secondary">Cada resultado possui revisão e evidência independentes.</Typography.Text></div>
        {editable ? <Button icon={<PlusOutlined />} onClick={onAddResult} size="small">Adicionar resultado</Button> : null}
      </div>
      {draft.keyResults.length ? draft.keyResults.map((result, index) => {
        const fieldPath = `keyResults.${result.id}.value`;
        const extracted = workspace.extractedData.keyResults.find((item) => item.id === result.id);
        const persisted = workspace.reviewedData.keyResults.some((item) => item.id === result.id);
        return <div className="prisma-repeatable-review-item" key={result.id}><ReviewField editable={editable} extracted={extracted?.value ?? "Não identificado na extração original"} fieldPath={fieldPath} label={`Resultado ${index + 1}`} multiline onChange={(value) => onDraftChange({ ...draft, keyResults: draft.keyResults.map((item) => item.id === result.id ? { ...item, value } : item) })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, fieldPath)} validationMessage={validationMessage(fieldPath)} value={result.value} />{editable ? <Popconfirm onConfirm={() => onRemoveResult(result.id)} title={persisted ? "Não incluir este resultado no perfil?" : "Cancelar a inclusão deste resultado?"}><Button danger={persisted} icon={<DeleteOutlined />} size="small">{persisted ? "Remover resultado" : "Cancelar inclusão"}</Button></Popconfirm> : null}{editable && !result.value.trim() ? <Typography.Text type="secondary">Novo resultado. Preencha-o ou cancele a inclusão; não é necessário salvar enquanto estiver vazio.</Typography.Text> : null}</div>;
      }) : <Empty description={editable ? "Nenhum resultado principal identificado. Selecione uma região do currículo para criar um resultado com evidência." : "Nenhum resultado principal foi aprovado para este currículo."} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {removedResults.map((entry) => <Alert action={<Button onClick={() => onUndoRemoval(entry)} size="small">Desfazer</Button>} key={entry.key} showIcon title={`${entry.label} ao salvar.`} type="warning" />)}
    </div>
  );
}

function SummaryTagField({ fieldPath, label, extracted, value, editable, selectedFieldPath, validationMessage, onSelect, onChange }: {
  fieldPath: "areasOfExpertise";
  label: string;
  extracted: string[];
  value: string[];
  editable: boolean;
  selectedFieldPath: string;
  validationMessage?: string | null;
  onSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className={["prisma-review-field", fieldPathMatches(selectedFieldPath, fieldPath) ? "is-selected" : "", validationMessage ? "has-validation-error" : ""].filter(Boolean).join(" ")} data-review-field-path={fieldPath} onClick={() => onSelect(fieldPath)}>
      <Typography.Text strong>{label}</Typography.Text>
      <div className="prisma-review-value-grid">
        <ValueSurface label="Extraído pelo Prisma" onSelect={() => onSelect(fieldPath, "original")} value={extracted.join(", ") || "Não identificado"} />
        <EditableTagSurface editable={editable} fieldPath={fieldPath} onChange={onChange} onSelect={onSelect} value={value} />
      </div>
      {validationMessage ? <Typography.Text type="danger">{validationMessage}</Typography.Text> : null}
    </div>
  );
}

function EditableTagSurface({ fieldPath, value, editable, onSelect, onChange }: {
  fieldPath: string;
  value: string[];
  editable: boolean;
  onSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onChange: (values: string[]) => void;
}) {
  const selectRef = useRef<RefSelectProps | null>(null);
  return <div className="prisma-reviewed-surface prisma-tag-editor" onClick={(event) => { event.stopPropagation(); onSelect(fieldPath, "reviewer"); }}><small>{editable ? "Revisado por você" : "Valor aprovado"}</small><Select disabled={!editable} mode="tags" onChange={onChange} open={false} ref={selectRef} tokenSeparators={[","]} value={value} />{editable ? <><Button icon={<PlusOutlined />} onClick={() => selectRef.current?.focus()} size="small">Adicionar</Button><Typography.Text type="secondary">Digite a informação e pressione Enter.</Typography.Text></> : null}</div>;
}

function ReviewField({ label, fieldPath, extracted, value, editable, multiline = false, required = false, selected, validationMessage = null, onSelect, onChange }: {
  label: string;
  fieldPath: string;
  extracted: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  required?: boolean;
  selected: boolean;
  validationMessage?: string | null;
  onSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className={["prisma-review-field", selected ? "is-selected" : "", validationMessage ? "has-validation-error" : ""].filter(Boolean).join(" ")} data-review-field-path={fieldPath} onClick={() => onSelect(fieldPath)}>
      <Typography.Text strong>{label}{required ? <span aria-label="obrigatório" className="prisma-required-marker"> *</span> : null}</Typography.Text>
      <div className="prisma-review-value-grid">
        <ValueSurface label="Extraído pelo Prisma" onSelect={() => onSelect(fieldPath, "original")} value={extracted} />
        <div className={["prisma-reviewed-surface", multiline ? "prisma-reviewed-surface--multiline" : ""].filter(Boolean).join(" ")} onClick={(event) => { event.stopPropagation(); onSelect(fieldPath, "reviewer"); }}><small>{editable ? "Revisado por você" : "Valor aprovado"}</small>{multiline ? <Input.TextArea aria-invalid={Boolean(validationMessage)} disabled={!editable} onFocus={() => onSelect(fieldPath, "reviewer")} onChange={(event) => onChange(event.target.value)} rows={4} value={value} /> : <Input aria-invalid={Boolean(validationMessage)} disabled={!editable} onFocus={() => onSelect(fieldPath, "reviewer")} onChange={(event) => onChange(event.target.value)} value={value} />}</div>
      </div>
      {validationMessage ? <Typography.Text type="danger">{validationMessage}</Typography.Text> : null}
    </div>
  );
}

function ValueSurface({ label, value, onSelect }: { label: string; value: string; onSelect?: () => void }) {
  return <div className="prisma-extracted-surface" onClick={(event) => { event.stopPropagation(); onSelect?.(); }}><small>{label}</small><p>{value}</p></div>;
}

function AcademicSelect({ editable, fieldPath, label, onChange, onSelect, options, origin, selectedFieldPath, value }: {
  editable: boolean;
  fieldPath: string;
  label: string;
  onChange: (value: string) => void;
  onSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  options: Array<{ value: string; label: string }>;
  origin: EducationClassificationOrigin;
  selectedFieldPath: string;
  value: string;
}) {
  return (
    <label className={["prisma-academic-select", fieldPathMatches(selectedFieldPath, fieldPath) ? "is-selected" : ""].filter(Boolean).join(" ")} data-review-field-path={fieldPath} onClick={() => onSelect(fieldPath)}>
      <span>{label}</span>
      <Select disabled={!editable} onChange={onChange} onFocus={() => onSelect(fieldPath, "reviewer")} options={options} value={value} />
      <small>{EDUCATION_ORIGIN_LABELS[origin]}</small>
    </label>
  );
}

function classificationReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    explicit_postdoctorate_marker: "Pós-doutorado informado no documento",
    explicit_doctorate_marker: "Doutorado informado no documento",
    explicit_master_marker: "Mestrado informado no documento",
    explicit_mba_marker: "MBA informado no documento",
    explicit_specialization_marker: "Especialização informada no documento",
    explicit_postgraduate_level_without_qualification: "Nível informado; qualificação insuficiente",
    explicit_licentiate_marker: "Licenciatura informada no documento",
    explicit_bachelor_marker: "Bacharelado informado no documento",
    explicit_technologist_marker: "Tecnólogo informado no documento",
    explicit_technical_course_marker: "Curso técnico informado no documento",
    explicit_undergraduate_level_marker: "Graduação informada no documento",
    explicit_secondary_level_marker: "Ensino médio informado no documento",
    explicit_completed_status: "Conclusão informada no documento",
    explicit_in_progress_status: "Andamento informado no documento",
    explicit_interrupted_status: "Interrupção informada no documento",
    explicit_suspended_status: "Trancamento informado no documento",
    current_period_suggests_in_progress: "Período atual sugere andamento",
    insufficient_explicit_academic_evidence: "Evidência insuficiente para classificar",
    historical_record_without_classification: "Registro anterior ao classificador acadêmico",
    human_classification_changed: "Classificação ajustada por pessoa",
    human_classification_confirmed: "Classificação confirmada por pessoa",
    human_record_created: "Formação adicionada por pessoa",
  };
  return labels[reason] ?? "Regra acadêmica registrada";
}

function EntityNavigator({ label, index, count, onChange }: { label: string; index: number; count: number; onChange: (index: number) => void }) {
  return (
    <div className="prisma-entity-navigator">
      <Button aria-label={`${label} anterior`} disabled={index <= 0} icon={<ArrowLeftOutlined />} onClick={() => onChange(index - 1)} size="small" />
      <Typography.Text>{label} {index + 1} de {count}</Typography.Text>
      <Button aria-label={`Próxima ${label.toLowerCase()}`} disabled={index >= count - 1} icon={<ArrowRightOutlined />} onClick={() => onChange(index + 1)} size="small" />
    </div>
  );
}

function tabForField(fieldPath: string): string {
  if (fieldPath === "experiences" || fieldPath.startsWith("experiences.")) return "experience";
  if (fieldPath === "education" || fieldPath.startsWith("education.")) return "education";
  if (fieldPath === "competencies") return "skills";
  if (fieldPath === "languages") return "languages";
  if (["certifications", "uncertainties", "notIdentified"].includes(fieldPath) || fieldPath.startsWith("customSections.")) return "other";
  return "summary";
}

function firstOtherFieldPath(draft: StructuredDraft): string {
  const firstCustom = draft.customSections[0]?.items[0];
  return firstCustom ? `customSections.${draft.customSections[0]!.id}.items.${firstCustom.id}.value` : "certifications";
}

function compactHistory(changes: ProfileReviewWorkspace["changes"], events: ProfileReviewWorkspace["evidenceEvents"], adaptations: ProfileReviewWorkspace["adaptationEvents"]) {
  return [
    ...changes.map((change) => ({ createdAt: change.createdAt, content: <HistoryEntry actor={change.actorAuthUserId} date={change.createdAt} description={change.reason} title="Valor alterado" /> })),
    ...events.map((event) => ({ createdAt: event.createdAt, content: <HistoryEntry actor={event.actorAuthUserId} date={event.createdAt} description={event.reason} title={eventLabel(event.eventType)} /> })),
    ...adaptations.map((event) => ({ createdAt: event.createdAt, content: <HistoryEntry actor={event.actorAuthUserId} date={event.createdAt} description={`Padrão ${event.patternKey} confirmado a partir de ${event.sourceFieldPath}.`} title="Sugestão adaptativa aceita" /> })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((item) => ({ content: item.content }));
}

function fullHistory(workspace: ProfileReviewWorkspace) {
  return [
    ...workspace.changes.map((change) => ({ createdAt: change.createdAt, content: <HistoryEntry actor={change.actorAuthUserId} date={change.createdAt} description={`${change.reason}\nDe: ${formatHistoryValue(change.previousValue)}\nPara: ${formatHistoryValue(change.reviewedValue)}`} title={`Valor alterado · ${change.fieldPath}`} /> })),
    ...workspace.evidenceEvents.map((event) => ({ createdAt: event.createdAt, content: <HistoryEntry actor={event.actorAuthUserId} date={event.createdAt} description={event.reason} title={`${eventLabel(event.eventType)} · ${event.fieldPath}`} /> })),
    ...workspace.adaptationEvents.map((event) => ({ createdAt: event.createdAt, content: <HistoryEntry actor={event.actorAuthUserId} date={event.createdAt} description={`Origem: ${event.sourceFieldPath}\nPadrão: ${event.patternKey}\nCampos aceitos: ${event.acceptedSuggestions.map((item) => item.fieldPath).join(", ")}`} title="Aprendizado adaptativo aplicado" /> })),
    ...workspace.revisions.map((revision) => ({ createdAt: revision.createdAt, content: <HistoryEntry actor={revision.actorAuthUserId} date={revision.createdAt} description={revision.changeReason ?? "Revisão versionada."} title={`Revisão ${revision.revisionNumber}`} /> })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((item) => ({ content: item.content }));
}

function HistoryEntry({ title, date, actor, description }: { title: string; date: string; actor: string; description: string }) {
  return <div className="prisma-history-entry"><strong>{title}</strong><small>{formatDate(date)} · {actor}</small><p>{description}</p></div>;
}

function eventLabel(event: ProfileReviewWorkspace["evidenceEvents"][number]["eventType"]): string {
  return ({ human_region_added: "Evidência humana adicionada", review_evidence_replaced: "Evidência substituída", complementary_evidence_added: "Evidência complementar adicionada", new_information_created: "Nova informação criada", review_evidence_removed: "Evidência do revisor excluída" })[event];
}

function formatHistoryValue(value: unknown): string {
  const rendered = typeof value === "string" ? value : JSON.stringify(value);
  return rendered && rendered.length > 180 ? `${rendered.slice(0, 177)}...` : rendered ?? "Não identificado";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
