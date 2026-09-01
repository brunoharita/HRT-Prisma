import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckOutlined, EyeOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Input, Modal, Popconfirm, Radio, Segmented, Select, Space, Tag, Tooltip, Typography } from "antd";
import { DocumentEvidenceViewer, refinedSelectionText, type EvidenceNavigationTarget, type RegionSelectionResult } from "../components/review/DocumentEvidenceViewer";
import { StructuredReviewPanel } from "../components/review/StructuredReviewPanel";
import { AdaptiveSuggestionPanel } from "../components/review/AdaptiveSuggestionPanel";
import type { CustomProfileSectionFormat, ProfileReviewWorkspace, StructuredDraft } from "../domain/personIngestion";
import { evidenceSelectionRequiresReason, fieldPathMatches, type ReviewEvidenceAction } from "../domain/spatialEvidence";
import {
  ADAPTIVE_REVIEW_METHOD_VERSION,
  proposeSiblingBlockCorrections,
  type AdaptiveFieldSuggestion,
  type AdaptiveSuggestionReport,
  type ExperienceFieldName,
} from "../domain/adaptiveResumeExtraction";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import {
  addCustomSectionItem,
  createCustomSection,
  updateCustomSectionItemValue,
  validateCustomSectionName,
} from "../domain/customProfileSections";
import {
  createReviewEntityId,
  normalizeReviewDraft,
  reviewDraftChangeState,
  reviewEntityFieldPath,
  reviewEntityPathSegment,
  reviewFieldPathExists,
  validateReviewDraftForSave,
  type ReviewDraftIssue,
} from "../domain/reviewFieldLifecycle";
import type { OrganizationMembership } from "../shared/access";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileReviewPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId: string;
  reviewId: string;
  mode?: "review" | "view";
  onNavigate: (path: string) => void;
}

type NewInformationType = "experience" | "education" | "competency" | "language" | "certification" | "key_result" | "custom_section" | "custom_item";
type DeferredReviewAction =
  | { type: "start_evidence_selection"; fieldPath: string }
  | { type: "create_custom_section" };

export function ProfileReviewPage({ activeMembership, personId, documentId, reviewId, mode = "review", onNavigate }: ProfileReviewPageProps) {
  const [workspace, setWorkspace] = useState<ProfileReviewWorkspace | null>(null);
  const [draft, setDraft] = useState<StructuredDraft | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFieldPath, setSelectedFieldPath] = useState("summary");
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<EvidenceNavigationTarget | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<RegionSelectionResult | null>(null);
  const [pendingAction, setPendingAction] = useState<ReviewEvidenceAction>("correct_current_field");
  const [selectionValue, setSelectionValue] = useState("");
  const [selectionReason, setSelectionReason] = useState("");
  const [selectionValueEdited, setSelectionValueEdited] = useState(false);
  const [excludedRefinementLinkIds, setExcludedRefinementLinkIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [newInformationType, setNewInformationType] = useState<NewInformationType>("experience");
  const [customSectionName, setCustomSectionName] = useState("");
  const [customSectionFormat, setCustomSectionFormat] = useState<CustomProfileSectionFormat>("list");
  const [customTargetSectionId, setCustomTargetSectionId] = useState("");
  const [createCustomAfterSelection, setCreateCustomAfterSelection] = useState(false);
  const [mobilePane, setMobilePane] = useState<"document" | "review">("review");
  const [adaptiveReport, setAdaptiveReport] = useState<AdaptiveSuggestionReport | null>(null);
  const [deferredReviewAction, setDeferredReviewAction] = useState<DeferredReviewAction | null>(null);
  const [validationIssues, setValidationIssues] = useState<ReviewDraftIssue[]>([]);

  async function refresh() {
    const result = await personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId);
    if (!result) throw new Error("Revisão não encontrada nesta empresa.");
    if (result.personId !== personId || result.documentId !== documentId) throw new Error("A revisão não pertence à Pessoa e ao documento informados.");
    setWorkspace(result);
    setDraft(cloneDraft(result.reviewedData));
    setValidationIssues([]);
    return result;
  }

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId)
      .then(async (result) => {
        if (!current) return;
        if (!result) throw new Error("Revisão não encontrada nesta empresa.");
        if (result.personId !== personId || result.documentId !== documentId) throw new Error("A revisão não pertence à Pessoa e ao documento informados.");
        setWorkspace(result);
        setDraft(cloneDraft(result.reviewedData));
        setSelectedFieldPath(result.reviewedData.experiences[0]
          ? reviewEntityFieldPath("experience", result.reviewedData.experiences[0], "role")
          : "identity.fullName");
        if (result.documentStoragePath) {
          const url = await personIngestionService.createPrivateDownloadUrl(result.documentStoragePath);
          if (current) setPdfUrl(url);
        }
      })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a revisão."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, documentId, personId, reviewId]);

  const changeState = useMemo(
    () => workspace && draft ? reviewDraftChangeState(workspace.reviewedData, draft) : { rawChanged: false, meaningfulChanged: false, transientOnly: false },
    [draft, workspace],
  );
  const dirty = changeState.meaningfulChanged;
  const transientOnly = changeState.transientOnly;
  const viewOnly = mode === "view";
  const editable = !viewOnly && workspace?.state === "draft";
  const replacementLinkId = useMemo(() => workspace?.evidenceLinks.find((link) => link.state === "active" && link.linkKind === "reviewer" && fieldsOverlap(link.fieldPath, selectedFieldPath))?.id ?? null, [selectedFieldPath, workspace]);
  const fallbackOriginalEvidence = useMemo(() => {
    if (!workspace) return null;
    const candidates = workspace.evidenceLinks.filter((item) => item.state === "active"
      && item.linkKind === "original"
      && !item.spatialRegionId
      && fieldPathMatches(item.fieldPath, selectedFieldPath));
    const link = candidates.find((item) => item.fieldPath === selectedFieldPath) ?? candidates[0];
    const original = link?.evidenceId ? workspace.originalEvidence.find((item) => item.id === link.evidenceId) : null;
    const text = extractedTextAtFieldPath(workspace.extractedData, selectedFieldPath);
    if (!link || !original?.sourcePage || !text) return null;
    return { linkId: link.id, fieldPath: selectedFieldPath, pageNumber: original.sourcePage, text };
  }, [selectedFieldPath, workspace]);

  async function handleSave(continuation: DeferredReviewAction | null = deferredReviewAction) {
    if (!workspace || !draft) return;
    const normalizedDraft = normalizeReviewDraft(draft);
    const normalizedBaseline = normalizeReviewDraft(workspace.reviewedData);
    if (JSON.stringify(normalizedDraft) === JSON.stringify(normalizedBaseline)) {
      setDraft(cloneDraft(workspace.reviewedData));
      setReason("");
      setValidationIssues([]);
      setError(null);
      setDeferredReviewAction(null);
      if (continuation) {
        resumeDeferredReviewAction(continuation);
        setSuccess("O formulário vazio foi descartado. A ação solicitada foi retomada sem criar uma revisão desnecessária.");
      } else setSuccess("Nenhuma alteração real precisava ser salva. Formulários vazios foram descartados.");
      return;
    }
    const issues = validateReviewDraftForSave(normalizedDraft, {
      existingPhone: workspace.personPrivateContact.phone,
      existingEmail: workspace.personPrivateContact.email,
    });
    const customSectionError = validateCustomSections(normalizedDraft);
    if (issues.length || customSectionError) {
      const nextIssues = customSectionError ? [...issues, { fieldPath: "customSections", message: customSectionError }] : issues;
      setDraft(normalizedDraft);
      setValidationIssues(nextIssues);
      setError(nextIssues[0]!.message);
      setSelectedFieldPath(nextIssues[0]!.fieldPath);
      window.requestAnimationFrame(() => {
        const field = document.querySelector(`[data-review-field-path="${nextIssues[0]!.fieldPath}"]`);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.querySelector<HTMLElement>("input, textarea, [role=combobox]")?.focus();
      });
      return;
    }
    if (reason.trim().length < 3) {
      setError("Explique objetivamente a alteração manual antes de salvar.");
      window.requestAnimationFrame(() => {
        const reasonInput = document.getElementById("prisma-review-correction-reason");
        reasonInput?.scrollIntoView({ behavior: "smooth", block: "center" });
        reasonInput?.focus();
      });
      return;
    }
    setBusy(true); setError(null); setSuccess(null);
    try {
      await personIngestionService.saveProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion, normalizedDraft, reason);
      await refresh();
      setReason("");
      setDeferredReviewAction(null);
      if (continuation) {
        resumeDeferredReviewAction(continuation);
        setSuccess(continuation.type === "create_custom_section"
          ? "Rascunho salvo. Agora selecione no documento a área personalizada."
          : "Rascunho salvo. Agora selecione no documento a evidência desejada.");
      } else setSuccess("Rascunho salvo como nova revisão auditável.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho."); }
    finally { setBusy(false); }
  }

  function handleContinueToDelta() {
    if (!workspace || !draft) return;
    if (transientOnly) { setError("Preencha ou cancele o novo campo antes de aprovar a versão."); return; }
    if (dirty || pendingSelection) { setError("Conclua ou cancele a seleção e salve as alterações antes de aprovar."); return; }
    const issues = validateReviewDraftForSave(normalizeReviewDraft(draft), {
      existingPhone: workspace.personPrivateContact.phone,
      existingEmail: workspace.personPrivateContact.email,
    });
    if (issues.length) {
      setValidationIssues(issues);
      setError(issues[0]!.message);
      setSelectedFieldPath(issues[0]!.fieldPath);
      return;
    }
    setError(null);
    onNavigate(`/profiles/${personId}/documents/${documentId}/review/${reviewId}/delta`);
  }

  async function handleApplyAdaptiveSuggestions(suggestions: AdaptiveFieldSuggestion[]) {
    if (!workspace || !draft || !adaptiveReport || suggestions.length === 0) return;
    const nextDraft = suggestions.reduce(
      (current, suggestion) => applyValueAtFieldPath(current, suggestion.fieldPath, suggestion.proposedValue),
      draft,
    );
    setBusy(true); setError(null); setSuccess(null);
    try {
      await personIngestionService.applyAdaptiveSuggestions({
        organizationId: activeMembership.organizationId,
        reviewId: workspace.id,
        expectedLockVersion: workspace.lockVersion,
        reviewedData: nextDraft,
        sourceFieldPath: reviewEntityFieldPath("experience", draft.experiences[adaptiveReport.sourceIndex]!, adaptiveReport.sourceField),
        patternKey: adaptiveReport.patternKey,
        methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
        suggestions,
        reason: "Sugestões adaptativas confirmadas pelo revisor após releitura dos blocos na fonte original.",
      });
      await refresh();
      setAdaptiveReport(null);
      setReason("");
      setSuccess(`${suggestions.length} ${suggestions.length === 1 ? "correção adaptativa foi aplicada" : "correções adaptativas foram aplicadas"}, salvas e versionadas. A revisão por evidência permanece disponível.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível aplicar as sugestões adaptativas."); }
    finally { setBusy(false); }
  }

  function handleFieldSelect(fieldPath: string, preferredKind?: "original" | "reviewer") {
    setSelectedFieldPath(fieldPath);
    const target = primaryEvidenceTarget(fieldPath, workspace, preferredKind);
    if (target) {
      setActiveLinkId(target.linkId);
      setNavigationTarget({ ...target, nonce: Date.now() });
    } else setActiveLinkId(null);
  }

  function startEvidenceSelection(fieldPath: string) {
    if (!draft || !reviewFieldPathExists(draft, fieldPath)) {
      setError("Selecione um campo existente ou adicione um novo campo antes de escolher sua evidência.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSelectionError(null);
    setCreateCustomAfterSelection(false);
    setSelectedFieldPath(fieldPath);
    setPendingSelection(null);
    setSelectionMode(true);
    setMobilePane("document");
  }

  function startCustomSectionSelection() {
    setError(null);
    setSuccess(null);
    setSelectionError(null);
    setNewInformationType("custom_section");
    setCustomSectionName("");
    setCustomSectionFormat("list");
    setCustomTargetSectionId("");
    setPendingSelection(null);
    setCreateCustomAfterSelection(true);
    setSelectionMode(true);
    setMobilePane("document");
  }

  function addMissingExperience(selectArea: boolean) {
    if (!draft) return;
    const existing = draft.experiences.find((item) => !workspace?.reviewedData.experiences.some((persisted) => persisted.id === item.id));
    const experience = existing ?? {
      id: createReviewEntityId("experience"),
      source: "human" as const,
      role: null,
      organization: null,
      period: null,
      description: null,
      evidenceText: "",
      page: null,
    };
    const fieldPath = reviewEntityFieldPath("experience", experience, "organization");
    if (!existing) setDraft({ ...draft, experiences: [...draft.experiences, experience] });
    setSelectedFieldPath(fieldPath);
    setActiveLinkId(null);
    setError(null);
    setSuccess(null);
    setMobilePane(selectArea ? "document" : "review");
    if (selectArea) {
      setSelectionError(null);
      setCreateCustomAfterSelection(false);
      setPendingSelection(null);
      setSelectionMode(true);
    }
  }

  function resumeDeferredReviewAction(action: DeferredReviewAction) {
    setDeferredReviewAction(null);
    if (action.type === "create_custom_section") startCustomSectionSelection();
    else startEvidenceSelection(action.fieldPath);
  }

  function deferReviewAction(action: DeferredReviewAction) {
    setDeferredReviewAction(action);
    setError(null);
    setSuccess(null);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-review-unsaved-alert]")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function discardUnsavedChangesAndContinue() {
    if (!workspace) return;
    const continuation = deferredReviewAction;
    setDraft(cloneDraft(workspace.reviewedData));
    setReason("");
    setError(null);
    setDeferredReviewAction(null);
    if (continuation) {
      resumeDeferredReviewAction(continuation);
      setSuccess("Alterações descartadas. A ação solicitada foi retomada.");
    } else setSuccess("Alterações não salvas foram descartadas.");
  }

  async function handleEvidenceDelete(input: { fieldPath: string; linkId: string }) {
    if (!workspace) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      await personIngestionService.retireProfileReviewEvidence({
        organizationId: activeMembership.organizationId,
        reviewId: workspace.id,
        expectedLockVersion: workspace.lockVersion,
        linkId: input.linkId,
        reason: "Evidência retirada pelo revisor durante a conferência do campo.",
      });
      await refresh();
      setActiveLinkId(null);
      setSuccess("Evidência excluída da revisão. A região e o evento permanecem preservados no histórico.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível excluir a evidência."); }
    finally { setBusy(false); }
  }

  function handleEvidenceNavigate(input: { fieldPath: string; linkId: string; pageNumber: number; regionId: string | null }) {
    setSelectedFieldPath(input.fieldPath);
    setActiveLinkId(input.linkId);
    setNavigationTarget({ pageNumber: input.pageNumber, regionId: input.regionId, linkId: input.linkId, nonce: Date.now() });
    setMobilePane("document");
  }

  function handleSelectionComplete(selection: RegionSelectionResult) {
    setError(null);
    setSuccess(null);
    setPendingSelection(selection);
    setSelectionValue(selection.selectedText ?? "");
    setExcludedRefinementLinkIds(selection.refinementCandidates.filter((candidate) => candidate.defaultExcluded).map((candidate) => candidate.linkId));
    setSelectionReason("");
    setSelectionValueEdited(false);
    setSelectionError(null);
    setPendingAction(createCustomAfterSelection ? "create_new_information" : "correct_current_field");
  }

  function closePendingSelection() {
    setPendingSelection(null);
    setSelectionMode(false);
    setSelectionValue("");
    setSelectionReason("");
    setSelectionValueEdited(false);
    setExcludedRefinementLinkIds([]);
    setSelectionError(null);
    setCreateCustomAfterSelection(false);
  }

  async function applyPendingSelection() {
    if (!workspace || !draft || !pendingSelection) return;
    setSelectionError(null);
    const normalizedValue = selectionValue.trim();
    const effectiveSelectedText = refinedSelectionText(pendingSelection, excludedRefinementLinkIds);
    let nextDraft: StructuredDraft | null = null;
    let targetFieldPath = selectedFieldPath;
    if (pendingAction === "correct_current_field") {
      if (!normalizedValue) { setSelectionError("Confirme ou informe o valor revisado para corrigir o campo."); return; }
      nextDraft = applyValueAtFieldPath(draft, selectedFieldPath, normalizedValue);
      if (JSON.stringify(nextDraft) === JSON.stringify(draft)) { setSelectionError("O valor já é igual ao atual. Use Substituir evidência da revisão para trocar somente a origem."); return; }
    }
    if (pendingAction === "create_new_information") {
      if (!normalizedValue) { setSelectionError("Informe o conteúdo da nova informação."); return; }
      if (newInformationType === "custom_section") {
        const nameError = validateCustomSectionName(customSectionName, draft.customSections);
        if (nameError) { setSelectionError(nameError); return; }
      }
      if (newInformationType === "custom_item" && !customTargetSectionId) {
        setSelectionError("Selecione a área personalizada que receberá o novo item."); return;
      }
      let created: { draft: StructuredDraft; fieldPath: string };
      try {
        created = addNewInformation(draft, newInformationType, normalizedValue, pendingSelection.pageNumber, {
          customSectionName,
          customSectionFormat,
          customTargetSectionId,
        });
      } catch (caught) {
        setSelectionError(caught instanceof Error ? caught.message : "Não foi possível criar a informação personalizada.");
        return;
      }
      nextDraft = created.draft;
      targetFieldPath = created.fieldPath;
      if (JSON.stringify(nextDraft) === JSON.stringify(draft)) { setSelectionError("A informação selecionada já existe no campo de destino."); return; }
    }
    if (pendingAction === "replace_review_evidence" && !replacementLinkId) { setSelectionError("Este campo ainda não possui evidência ativa do revisor para substituir."); return; }
    if (nextDraft) {
      nextDraft = normalizeReviewDraft(nextDraft);
      const issues = validateReviewDraftForSave(nextDraft, {
        existingPhone: workspace.personPrivateContact.phone,
        existingEmail: workspace.personPrivateContact.email,
      });
      if (issues.length) { setSelectionError(issues[0]!.message); return; }
    }
    if (evidenceSelectionRequiresReason({
      selectedText: effectiveSelectedText,
      proposedValue: normalizedValue,
      valueEdited: selectionValueEdited,
      changesDraft: Boolean(nextDraft),
    }) && selectionReason.trim().length < 3) {
      setSelectionError("Explique a divergência entre o valor informado e o texto reconhecido da região."); return;
    }

    setBusy(true); setError(null); setSuccess(null); setSelectionError(null);
    try {
      await personIngestionService.recordProfileReviewEvidence({
        organizationId: activeMembership.organizationId,
        reviewId: workspace.id,
        expectedLockVersion: workspace.lockVersion,
        fieldPath: targetFieldPath,
        action: pendingAction,
        documentVersion: workspace.documentVersion,
        pageNumber: pendingSelection.pageNumber,
        region: pendingSelection.region,
        rawSelectedText: pendingSelection.rawSelectedText,
        selectedText: effectiveSelectedText,
        refinementDecisions: pendingSelection.refinementCandidates.map((candidate) => ({
          linkId: candidate.linkId,
          decision: excludedRefinementLinkIds.includes(candidate.linkId) ? "excluded" as const : "included" as const,
        })),
        extractionMethod: pendingSelection.extractionMethod,
        reviewedData: nextDraft,
        reason: selectionReason.trim() || null,
        replacesLinkId: pendingAction === "replace_review_evidence" ? replacementLinkId : null,
      });
      const refreshed = await refresh();
      if (pendingAction === "correct_current_field" && nextDraft) {
        const match = /^experiences\.([a-z0-9_]+)\.(role|organization|period|description)$/.exec(targetFieldPath);
        if (match) {
          const sourceIndex = findReviewEntityIndex(refreshed.reviewedData.experiences, "experience", match[1]!);
          if (sourceIndex >= 0) {
            const report = proposeSiblingBlockCorrections({
              pages: refreshed.pages,
              draft: refreshed.reviewedData,
              extracted: refreshed.extractedData,
              sourceIndex,
              sourceField: match[2] as ExperienceFieldName,
            });
            setAdaptiveReport(report.suggestions.length || report.unresolved.length ? report : null);
          }
        }
      }
      setSelectedFieldPath(targetFieldPath);
      const newest = [...refreshed.evidenceLinks].reverse().find((link) => link.fieldPath === targetFieldPath && link.state === "active");
      setActiveLinkId(newest?.id ?? null);
      closePendingSelection();
      setSuccess(pendingAction === "add_complementary" ? "Evidência complementar vinculada sem remover a original." : pendingAction === "replace_review_evidence" ? "Evidência ativa substituída com histórico preservado." : pendingAction === "create_new_information" ? "Nova informação humana criada e vinculada à região selecionada." : "Campo corrigido com evidência humana rastreável.");
    } catch (caught) { setSelectionError(caught instanceof Error ? caught.message : "Não foi possível aplicar a seleção."); }
    finally { setBusy(false); }
  }

  if (loading) return <PrismaPage><div className="prisma-review-loading"><Typography.Title level={3}>Preparando a bancada de revisão...</Typography.Title><Typography.Text type="secondary">Carregando documento, extração, evidências e histórico.</Typography.Text></div></PrismaPage>;
  if (!workspace || !draft) return <PrismaPage><Alert title={error ?? "Revisão não encontrada nesta empresa."} showIcon type="error" /></PrismaPage>;

  const saveBlockedReason = !editable
    ? "Esta revisão não está mais disponível para edição."
    : pendingSelection
      ? "Conclua ou cancele a seleção atual antes de salvar."
      : !dirty
        ? transientOnly
          ? "Preencha o novo campo ou selecione uma área no documento. Formulários vazios não precisam ser salvos."
          : "Não há alterações para salvar."
        : null;
  const approvalBlockedReason = !editable
    ? "Esta revisão já foi concluída."
    : pendingSelection
        ? "Conclua ou cancele a seleção atual antes de comparar."
      : dirty
        ? "Salve o rascunho antes de comparar esta proposta."
        : transientOnly
          ? "Preencha ou cancele o novo campo antes de comparar esta proposta."
        : null;
  const selectedFieldIsTransient = reviewFieldPathExists(draft, selectedFieldPath)
    && !reviewFieldPathExists(workspace.reviewedData, selectedFieldPath);
  const deferredReviewActionLabel = deferredReviewAction?.type === "create_custom_section"
    ? "criar a área personalizada"
    : deferredReviewAction?.type === "start_evidence_selection"
      ? "adicionar a evidência"
      : null;

  return (
    <PrismaPage className="prisma-m2c-page prisma-review-page prisma-review-page--workspace">
      <PrismaPageHeader
        title={viewOnly ? "Verificação do currículo" : "Revisão da nova importação"}
        description={viewOnly
          ? `Consulte o currículo original de ${workspace.personName} e os campos extraídos de ${workspace.documentName}, sem alterar a versão aprovada.`
          : `Revise e estruture o conteúdo de ${workspace.documentName} para ${workspace.personName}. A versão atual permanece válida até a aprovação.`}
        actions={viewOnly
          ? <Button icon={<EyeOutlined />} onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}`)}>Detalhes técnicos</Button>
          : <Space wrap>
            <Tooltip title={saveBlockedReason}><span className="prisma-disabled-action-tooltip"><Button disabled={Boolean(saveBlockedReason) || busy} icon={<SaveOutlined />} loading={busy} onClick={() => void handleSave()}>Salvar revisão</Button></span></Tooltip>
            <Tooltip title={approvalBlockedReason}><span className="prisma-disabled-action-tooltip"><Button disabled={Boolean(approvalBlockedReason) || busy} icon={<CheckOutlined />} loading={busy} onClick={handleContinueToDelta} type="primary">Comparar com o perfil atual</Button></span></Tooltip>
          </Space>}
      />
      {changeState.rawChanged ? <Popconfirm cancelText="Continuar revisando" description="Formulários temporários e alterações não salvas serão perdidos." okText="Sair sem salvar" onConfirm={() => onNavigate(`/profiles/${personId}`)} title="Voltar para a Central da Pessoa?"><Button className="prisma-review-back" icon={<ArrowLeftOutlined />} type="text">Voltar para a Central da Pessoa</Button></Popconfirm> : <Button className="prisma-review-back" icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}`)} type="text">Voltar para a Central da Pessoa</Button>}
      {!viewOnly && workspace.state === "draft" && draft.experiences.length === 0 ? (
        <Alert
          action={<Space wrap><Button onClick={() => addMissingExperience(true)} type="primary">Selecionar área no currículo</Button><Button icon={<PlusOutlined />} onClick={() => addMissingExperience(false)}>Adicionar experiência manualmente</Button></Space>}
          className="prisma-review-recovery-alert"
          description="O conteúdo foi preservado. Selecione a área correspondente no documento ou adicione a experiência manualmente para estruturar esta seção."
          showIcon
          title="Não identificamos automaticamente uma experiência profissional neste currículo."
          type="warning"
        />
      ) : null}
      {viewOnly ? (
        <div className="prisma-review-statusbar prisma-review-statusbar--view"><Tag color="blue">Documento v{workspace.documentVersion}</Tag><Tag color="blue">Currículo original</Tag><Tag color={workspace.state === "approved" ? "green" : workspace.state === "invalidated" ? "default" : "gold"}>{workspace.state === "approved" ? "Perfil aprovado" : workspace.state === "invalidated" ? "Importação arquivada" : "Revisão em andamento"}</Tag><Tag icon={<EyeOutlined />}>Somente leitura</Tag><Typography.Text type="secondary">Nenhuma informação pode ser alterada neste modo.</Typography.Text></div>
      ) : <div className="prisma-review-statusbar"><Tag color="blue">Documento v{workspace.documentVersion}</Tag><Tag color="blue">Extraído: preservado</Tag><Tag color={dirty || transientOnly ? "gold" : "cyan"}>{dirty || transientOnly ? "Requer revisão" : "Pronto para comparação"}</Tag><Tag color="green">Perfil atual {workspace.baseProfileVersion ? `v${workspace.baseProfileVersion}` : "ainda não aprovado"} preservado</Tag><Tag color={dirty || transientOnly ? "gold" : "green"}>{dirty ? "Alterações não salvas" : transientOnly ? "Novo campo aguardando conteúdo" : "Rascunho sincronizado"}</Tag><Typography.Text type="secondary">A nova versão será criada somente depois da comparação e publicação.</Typography.Text></div>}
      {workspace.state === "approved" ? <Alert title={`Revisão aprovada em ${formatDate(workspace.approvedAt)}.`} showIcon type="success" /> : null}
      {error ? <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable title={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}
      {!viewOnly && adaptiveReport ? <AdaptiveSuggestionPanel
        busy={busy}
        onApply={(suggestions) => void handleApplyAdaptiveSuggestions(suggestions)}
        onDismiss={() => setAdaptiveReport(null)}
        onNavigate={(suggestion) => {
          setSelectedFieldPath(suggestion.fieldPath);
          setActiveLinkId(null);
          setNavigationTarget({ pageNumber: suggestion.pageNumber, regionId: null, linkId: null, nonce: Date.now() });
          setMobilePane("document");
        }}
        report={adaptiveReport}
      /> : null}
      <Segmented className="prisma-review-mobile-switch" onChange={(value) => setMobilePane(value as "document" | "review")} options={[{ label: "Currículo", value: "document" }, { label: "Revisão", value: "review" }]} value={mobilePane} />

      <div className={["prisma-review-split", `mobile-pane-${mobilePane}`].join(" ")}>
        <div className="prisma-review-document-pane">
          <DocumentEvidenceViewer
            activeLinkId={activeLinkId} fileName={workspace.documentName} links={workspace.evidenceLinks} navigationTarget={navigationTarget}
            fallbackOriginalEvidence={fallbackOriginalEvidence}
            onEvidenceClick={(fieldPath, linkId) => { setSelectedFieldPath(fieldPath); setActiveLinkId(linkId); setMobilePane("review"); }}
            onSelectionCancel={closePendingSelection} onSelectionComplete={handleSelectionComplete}
            pageCount={workspace.documentPageCount} pdfUrl={pdfUrl} refinementExcludedLinkIds={excludedRefinementLinkIds} regions={workspace.spatialRegions} selectedFieldPath={selectedFieldPath} selectionMode={selectionMode}
          />
        </div>
        <div className="prisma-review-structured-pane">
          <StructuredReviewPanel
            activeLinkId={activeLinkId} busy={busy} deferredActionLabel={deferredReviewActionLabel} draft={draft} editable={Boolean(editable)} hasTransientChanges={transientOnly} hasUnsavedChanges={dirty} onDiscardAndContinue={discardUnsavedChangesAndContinue} onDraftChange={(nextDraft) => { setDraft(nextDraft); setValidationIssues([]); setError(null); }} onEvidenceDelete={(input) => void handleEvidenceDelete(input)} onEvidenceNavigate={handleEvidenceNavigate}
            onCreateCustomSection={() => {
              if (dirty) { deferReviewAction({ type: "create_custom_section" }); return; }
              startCustomSectionSelection();
            }}
            onFieldSelect={handleFieldSelect} onReasonChange={setReason}
            onSaveAndContinue={() => void handleSave()}
            onStartSelection={(fieldPath) => { if (dirty) { deferReviewAction({ type: "start_evidence_selection", fieldPath }); return; } startEvidenceSelection(fieldPath); }}
            reason={reason} selectedFieldPath={selectedFieldPath} validationIssues={validationIssues} viewOnly={viewOnly} workspace={workspace}
          />
        </div>
      </div>

      <Modal cancelButtonProps={{ disabled: busy }} cancelText="Cancelar seleção" confirmLoading={busy} okButtonProps={{ disabled: busy }} okText="Aplicar seleção" onCancel={closePendingSelection} onOk={() => void applyPendingSelection()} open={!viewOnly && Boolean(pendingSelection)} title="Usar região selecionada">
        {pendingSelection ? <div className="prisma-selection-dialog">
          {selectionError ? <Alert title={selectionError} showIcon type="error" /> : null}
          <Alert title={`Página ${pendingSelection.pageNumber} · ${pendingSelection.extractionMethod}`} description={selectedFieldIsTransient ? "Este é um novo campo. A seleção preencherá seu conteúdo e salvará a evidência em uma única operação." : pendingSelection.ocrState === "failed" ? "O texto não foi reconhecido. A região continuará rastreável, mas uma correção exige conteúdo e justificativa manual." : pendingSelection.selectedTextUnits.length ? "Os caracteres destacados no documento são exatamente os usados no texto recuperado." : "O texto foi recuperado sem caixas individuais de caracteres. Revise-o antes de aplicá-lo."} showIcon type={pendingSelection.ocrState === "failed" ? "warning" : "info"} />
          {pendingSelection.refinementCandidates.length ? <section className="prisma-selection-refinement" aria-labelledby="selection-refinement-title">
            <div>
              <Typography.Text id="selection-refinement-title" strong>Conteúdos já mapeados dentro da seleção</Typography.Text>
              <Typography.Paragraph type="secondary">O Prisma desconta por padrão somente áreas confirmadas por uma pessoa. Desmarque uma área para reincluir seu conteúdo.</Typography.Paragraph>
            </div>
            <div className="prisma-selection-refinement__list">
              {pendingSelection.refinementCandidates.map((candidate) => {
                const excluded = excludedRefinementLinkIds.includes(candidate.linkId);
                return <Checkbox checked={excluded} key={candidate.linkId} onChange={(event) => {
                  const next = event.target.checked
                    ? [...new Set([...excludedRefinementLinkIds, candidate.linkId])]
                    : excludedRefinementLinkIds.filter((linkId) => linkId !== candidate.linkId);
                  setExcludedRefinementLinkIds(next);
                  if (!selectionValueEdited) setSelectionValue(refinedSelectionText(pendingSelection, next) ?? "");
                  setSelectionError(null);
                }}>
                  <span><strong>{reviewFieldLabel(candidate.fieldPath)}</strong> · {candidate.overlapText}</span>
                  <Tag color={candidate.source === "human" ? "green" : "blue"}>{candidate.source === "human" ? "Confirmada por pessoa" : "Extração automática"}</Tag>
                </Checkbox>;
              })}
            </div>
            {selectionValueEdited ? <Button onClick={() => {
              setSelectionValue(refinedSelectionText(pendingSelection, excludedRefinementLinkIds) ?? "");
              setSelectionValueEdited(false);
              setSelectionError(null);
            }} size="small">Restaurar texto refinado</Button> : null}
          </section> : null}
          <Radio.Group onChange={(event) => { setPendingAction(event.target.value as ReviewEvidenceAction); setSelectionError(null); }} value={pendingAction}><Space orientation="vertical"><Radio value="correct_current_field">{selectedFieldIsTransient ? "Preencher novo campo" : "Corrigir campo atual"}</Radio>{!selectedFieldIsTransient ? <Radio value="add_complementary">Adicionar como evidência complementar</Radio> : null}{replacementLinkId && !selectedFieldIsTransient ? <Radio value="replace_review_evidence">Substituir evidência da revisão</Radio> : null}<Radio value="create_new_information">Criar nova informação</Radio></Space></Radio.Group>
          {pendingAction === "create_new_information" ? <Select aria-label="Tipo da nova informação" onChange={(value) => {
            setNewInformationType(value);
            if (value === "custom_item") setCustomTargetSectionId(draft.customSections.find((section) => section.format === "list")?.id ?? "");
            setSelectionError(null);
          }} options={[
            { label: "Experiência", value: "experience" },
            { label: "Formação", value: "education" },
            { label: "Competência", value: "competency" },
            { label: "Idioma", value: "language" },
            { label: "Certificação", value: "certification" },
            { label: "Principal resultado", value: "key_result" },
            { label: "Nova área personalizada", value: "custom_section" },
            ...(draft.customSections.some((section) => section.format === "list") ? [{ label: "Novo item em área personalizada", value: "custom_item" as const }] : []),
          ]} value={newInformationType} /> : null}
          {pendingAction === "create_new_information" && newInformationType === "custom_section" ? <Space className="prisma-custom-section-dialog" orientation="vertical" size="middle">
            <Input aria-label="Nome da área personalizada" maxLength={80} onChange={(event) => { setCustomSectionName(event.target.value); setSelectionError(null); }} placeholder="Ex.: Publicações, Projetos relevantes, Trabalho voluntário" value={customSectionName} />
            <Select aria-label="Formato da área personalizada" onChange={setCustomSectionFormat} options={[{ label: "Lista de itens", value: "list" }, { label: "Texto", value: "text" }]} value={customSectionFormat} />
            <Typography.Text type="secondary">Após a aprovação, o Prisma aprenderá o título e a estrutura desta área para futuras importações da mesma organização. O conteúdo pessoal não será reutilizado.</Typography.Text>
          </Space> : null}
          {pendingAction === "create_new_information" && newInformationType === "custom_item" ? <Select aria-label="Área personalizada de destino" onChange={setCustomTargetSectionId} options={draft.customSections.filter((section) => section.format === "list").map((section) => ({ label: section.name, value: section.id }))} placeholder="Selecione a área" value={customTargetSectionId || null} /> : null}
          {pendingAction === "correct_current_field" || pendingAction === "create_new_information" ? <Input.TextArea aria-label="Valor sugerido pela região" onChange={(event) => { setSelectionValue(event.target.value); setSelectionValueEdited(true); setSelectionError(null); }} placeholder="Valor revisado" rows={4} value={selectionValue} /> : null}
          <Input.TextArea aria-label="Justificativa da operação de evidência" onChange={(event) => { setSelectionReason(event.target.value); setSelectionError(null); }} placeholder="Justificativa, quando houver interpretação ou divergência" rows={3} value={selectionReason} />
        </div> : null}
      </Modal>
    </PrismaPage>
  );
}

function primaryEvidenceTarget(fieldPath: string, workspace: ProfileReviewWorkspace | null, preferredKind?: "original" | "reviewer"): Omit<EvidenceNavigationTarget, "nonce"> | null {
  if (!workspace) return null;
  const candidates = workspace.evidenceLinks.filter((link) => link.state === "active" && fieldsOverlap(link.fieldPath, fieldPath)).sort((left, right) => linkPriority(left.linkKind, preferredKind, Boolean(left.spatialRegionId)) - linkPriority(right.linkKind, preferredKind, Boolean(right.spatialRegionId)));
  for (const link of candidates) {
    const region = link.spatialRegionId ? workspace.spatialRegions.find((item) => item.id === link.spatialRegionId) : null;
    const original = link.evidenceId ? workspace.originalEvidence.find((item) => item.id === link.evidenceId) : null;
    const pageNumber = region?.pageNumber ?? original?.sourcePage;
    if (pageNumber) return { pageNumber, regionId: region?.id ?? null, linkId: link.id };
  }
  return null;
}

function linkPriority(kind: "original" | "reviewer" | "complementary", preferredKind?: "original" | "reviewer", spatial = false): number {
  if (preferredKind && kind === preferredKind) return spatial ? 0 : 1;
  if (!preferredKind && kind === "reviewer") return 2;
  if (kind === "original") return spatial ? 3 : 4;
  return 5;
}
function fieldsOverlap(left: string, right: string): boolean { return fieldPathMatches(left, right); }

function extractedTextAtFieldPath(source: unknown, fieldPath: string): string | null {
  let value = source;
  for (const segment of fieldPath.split(".")) {
    if (Array.isArray(value)) {
      const index = Number(segment);
      value = Number.isInteger(index)
        ? value[index]
        : value.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).id === segment);
    } else if (value && typeof value === "object") {
      value = (value as Record<string, unknown>)[segment];
    } else return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized && normalized !== "Não identificado" ? normalized : null;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    const normalized = value.join(", ").trim();
    return normalized || null;
  }
  return null;
}

function reviewFieldLabel(fieldPath: string): string {
  const labels: Record<string, string> = {
    "identity.fullName": "Nome completo",
    "contact.city": "Cidade",
    "contact.state": "Estado",
    "contact.phone": "Telefone",
    "contact.email": "E-mail",
    "contact.linkedin": "Perfil do LinkedIn",
    professionalTitle: "Cargo ou título profissional",
    areasOfExpertise: "Áreas de atuação",
    professionalObjective: "Objetivo profissional",
    summary: "Resumo profissional",
  };
  if (labels[fieldPath]) return labels[fieldPath];
  if (/^keyResults\.[a-z0-9_]+\.value$/.test(fieldPath)) return "Principal resultado";
  const field = fieldPath.split(".").at(-1);
  return ({ role: "Cargo", organization: "Empresa", period: "Período", description: "Descrição", course: "Curso", institution: "Instituição" })[field ?? ""] ?? fieldPath;
}

function applyValueAtFieldPath(draft: StructuredDraft, fieldPath: string, value: string): StructuredDraft {
  const next = cloneDraft(draft);
  const segments = fieldPath.split(".");
  const root = segments[0];
  if (root === "identity" && segments[1] === "fullName") return { ...next, identity: { fullName: value || null } };
  if (root === "contact" && ["city", "state", "phone", "email", "linkedin"].includes(segments[1] ?? "")) {
    return { ...next, contact: { ...next.contact, [segments[1]!]: value || null } };
  }
  if (root === "professionalTitle") return { ...next, professionalTitle: value || null };
  if (root === "professionalObjective") return { ...next, professionalObjective: value || null };
  if (root === "summary") return { ...next, summary: value };
  if (root === "areasOfExpertise") return { ...next, areasOfExpertise: splitList(value) };
  if (root === "keyResults") {
    const resultId = segments[1];
    return { ...next, keyResults: next.keyResults.map((result) => result.id === resultId ? { ...result, value } : result) };
  }
  if (root === "customSections") return updateCustomSectionItemValue(next, fieldPath, value);
  if (["certifications", "languages", "competencies", "uncertainties", "notIdentified"].includes(root ?? "")) {
    const key = root as "certifications" | "languages" | "competencies" | "uncertainties" | "notIdentified";
    return { ...next, [key]: value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) };
  }
  const entitySegment = segments[1] ?? "";
  const field = segments[2];
  const experienceIndex = root === "experiences" ? findReviewEntityIndex(next.experiences, "experience", entitySegment) : -1;
  const educationIndex = root === "education" ? findReviewEntityIndex(next.education, "education", entitySegment) : -1;
  if (experienceIndex >= 0 && next.experiences[experienceIndex]) {
    next.experiences[experienceIndex] = { ...next.experiences[experienceIndex]!, [field ?? "description"]: value || null };
  }
  if (educationIndex >= 0 && next.education[educationIndex]) {
    next.education[educationIndex] = { ...next.education[educationIndex]!, [field ?? "description"]: value || null };
  }
  return next;
}

function addNewInformation(
  draft: StructuredDraft,
  type: NewInformationType,
  value: string,
  page: number,
  custom: { customSectionName: string; customSectionFormat: CustomProfileSectionFormat; customTargetSectionId: string },
): { draft: StructuredDraft; fieldPath: string } {
  const next = cloneDraft(draft);
  if (type === "experience") {
    const item = { id: createReviewEntityId("experience"), source: "human" as const, role: value, organization: null, period: null, description: null, evidenceText: value, page };
    next.experiences.push(item);
    return { draft: next, fieldPath: reviewEntityFieldPath("experience", item, "role") };
  }
  if (type === "education") {
    const item = { id: createReviewEntityId("education"), source: "human" as const, course: value, institution: null, period: null, description: null, evidenceText: value, page };
    next.education.push(item);
    return { draft: next, fieldPath: reviewEntityFieldPath("education", item, "course") };
  }
  if (type === "key_result") {
    const id = `result_${crypto.randomUUID().replaceAll("-", "")}`;
    next.keyResults.push({ id, value });
    return { draft: next, fieldPath: `keyResults.${id}.value` };
  }
  if (type === "custom_section") return createCustomSection({ draft: next, name: custom.customSectionName, format: custom.customSectionFormat, value, source: "human" });
  if (type === "custom_item") return addCustomSectionItem(next, custom.customTargetSectionId, value);
  const key = type === "competency" ? "competencies" : type === "language" ? "languages" : "certifications";
  if (!next[key].includes(value)) next[key].push(value);
  return { draft: next, fieldPath: key };
}

function splitList(value: string): string[] {
  return [...new Set(value.split(/[,;|\n]/).map((item) => item.trim()).filter(Boolean))];
}

function findReviewEntityIndex(
  items: Array<{ id: string }>,
  kind: "experience" | "education",
  segment: string,
): number {
  const direct = items.findIndex((item) => item.id === segment || reviewEntityPathSegment(kind, item.id) === segment);
  if (direct >= 0) return direct;
  const legacyIndex = Number(segment);
  return Number.isInteger(legacyIndex) ? legacyIndex : -1;
}

function validateCustomSections(draft: StructuredDraft): string | null {
  for (const section of draft.customSections) {
    const nameError = validateCustomSectionName(section.name, draft.customSections, section.id);
    if (nameError) return `${section.name || "Área personalizada"}: ${nameError}`;
    if (!section.items.length) return `A área “${section.name}” precisa ter ao menos um conteúdo.`;
    if (section.format === "text" && section.items.length !== 1) return `A área “${section.name}” aceita apenas um conteúdo de texto.`;
    if (section.items.some((item) => !item.value.trim())) return `A área “${section.name}” possui um item vazio.`;
  }
  return null;
}

function cloneDraft(draft: StructuredDraft): StructuredDraft { return JSON.parse(JSON.stringify(draft)) as StructuredDraft; }
function formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "data não registrada"; }
