import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, Radio, Segmented, Select, Space, Tag, Typography } from "antd";
import { DocumentEvidenceViewer, type EvidenceNavigationTarget, type RegionSelectionResult } from "../components/review/DocumentEvidenceViewer";
import { StructuredReviewPanel } from "../components/review/StructuredReviewPanel";
import type { ProfileReviewWorkspace, StructuredDraft } from "../domain/personIngestion";
import type { ReviewEvidenceAction } from "../domain/spatialEvidence";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileReviewPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId: string;
  reviewId: string;
  onNavigate: (path: string) => void;
}

type NewInformationType = "experience" | "education" | "competency" | "language" | "certification";

export function ProfileReviewPage({ activeMembership, personId, documentId, reviewId, onNavigate }: ProfileReviewPageProps) {
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
  const [newInformationType, setNewInformationType] = useState<NewInformationType>("experience");
  const [mobilePane, setMobilePane] = useState<"document" | "review">("review");

  async function refresh() {
    const result = await personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId);
    if (!result) throw new Error("Revisão não encontrada nesta empresa.");
    setWorkspace(result);
    setDraft(cloneDraft(result.reviewedData));
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
        setWorkspace(result);
        setDraft(cloneDraft(result.reviewedData));
        setSelectedFieldPath(result.reviewedData.experiences.length ? "experiences.0.role" : "summary");
        if (result.documentStoragePath) {
          const url = await personIngestionService.createPrivateDownloadUrl(result.documentStoragePath);
          if (current) setPdfUrl(url);
        }
      })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a revisão."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, reviewId]);

  const dirty = Boolean(workspace && draft && JSON.stringify(workspace.reviewedData) !== JSON.stringify(draft));
  const editable = workspace?.state === "draft";
  const replacementLinkId = useMemo(() => workspace?.evidenceLinks.find((link) => link.state === "active" && link.linkKind === "reviewer" && fieldsOverlap(link.fieldPath, selectedFieldPath))?.id ?? null, [selectedFieldPath, workspace]);

  async function handleSave() {
    if (!workspace || !draft) return;
    if (reason.trim().length < 3) { setError("Explique objetivamente a alteração manual antes de salvar."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      await personIngestionService.saveProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion, draft, reason);
      await refresh(); setReason(""); setSuccess("Rascunho salvo como nova revisão auditável.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho."); }
    finally { setBusy(false); }
  }

  async function handleApprove() {
    if (!workspace || !draft) return;
    if (dirty || pendingSelection) { setError("Conclua ou cancele a seleção e salve as alterações antes de aprovar."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const approved = await personIngestionService.approveProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion);
      await refresh(); setSuccess(`Perfil Prisma v${approved.profileVersion} aprovado sem sobrescrever a versão anterior.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível aprovar a revisão."); }
    finally { setBusy(false); }
  }

  function handleFieldSelect(fieldPath: string) {
    setSelectedFieldPath(fieldPath);
    const target = primaryEvidenceTarget(fieldPath, workspace);
    if (target) {
      setActiveLinkId(target.linkId);
      setNavigationTarget({ ...target, nonce: Date.now() });
    } else setActiveLinkId(null);
  }

  function handleEvidenceNavigate(input: { fieldPath: string; linkId: string; pageNumber: number; regionId: string | null }) {
    setSelectedFieldPath(input.fieldPath);
    setActiveLinkId(input.linkId);
    setNavigationTarget({ pageNumber: input.pageNumber, regionId: input.regionId, linkId: input.linkId, nonce: Date.now() });
    setMobilePane("document");
  }

  function handleSelectionComplete(selection: RegionSelectionResult) {
    setPendingSelection(selection);
    setSelectionValue(selection.selectedText ?? "");
    setSelectionReason("");
    setPendingAction("correct_current_field");
  }

  async function applyPendingSelection() {
    if (!workspace || !draft || !pendingSelection) return;
    const normalizedValue = selectionValue.trim();
    let nextDraft: StructuredDraft | null = null;
    let targetFieldPath = selectedFieldPath;
    if (pendingAction === "correct_current_field") {
      if (!normalizedValue) { setError("Confirme ou informe o valor revisado para corrigir o campo."); return; }
      nextDraft = applyValueAtFieldPath(draft, selectedFieldPath, normalizedValue);
      if (JSON.stringify(nextDraft) === JSON.stringify(draft)) { setError("O valor já é igual ao atual. Use Substituir evidência da revisão para trocar somente a origem."); return; }
    }
    if (pendingAction === "create_new_information") {
      if (!normalizedValue) { setError("Informe o conteúdo da nova informação."); return; }
      const created = addNewInformation(draft, newInformationType, normalizedValue, pendingSelection.pageNumber);
      nextDraft = created.draft;
      targetFieldPath = created.fieldPath;
      if (JSON.stringify(nextDraft) === JSON.stringify(draft)) { setError("A informação selecionada já existe no campo de destino."); return; }
    }
    if (pendingAction === "replace_review_evidence" && !replacementLinkId) { setError("Este campo ainda não possui evidência ativa do revisor para substituir."); return; }
    const changedFromRecognizedText = Boolean(pendingSelection.selectedText && normalizedValue && normalizeComparable(normalizedValue) !== normalizeComparable(pendingSelection.selectedText));
    if ((changedFromRecognizedText || (!pendingSelection.selectedText && nextDraft)) && selectionReason.trim().length < 3) {
      setError("Explique a divergência entre o valor informado e o texto reconhecido da região."); return;
    }

    setBusy(true); setError(null); setSuccess(null);
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
        selectedText: pendingSelection.selectedText,
        extractionMethod: pendingSelection.extractionMethod,
        reviewedData: nextDraft,
        reason: selectionReason.trim() || null,
        replacesLinkId: pendingAction === "replace_review_evidence" ? replacementLinkId : null,
      });
      const refreshed = await refresh();
      setSelectedFieldPath(targetFieldPath);
      const newest = [...refreshed.evidenceLinks].reverse().find((link) => link.fieldPath === targetFieldPath && link.state === "active");
      setActiveLinkId(newest?.id ?? null);
      setPendingSelection(null); setSelectionMode(false); setSelectionValue(""); setSelectionReason("");
      setSuccess(pendingAction === "add_complementary" ? "Evidência complementar vinculada sem remover a original." : pendingAction === "replace_review_evidence" ? "Evidência ativa substituída com histórico preservado." : pendingAction === "create_new_information" ? "Nova informação humana criada e vinculada à região selecionada." : "Campo corrigido com evidência humana rastreável.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível aplicar a seleção."); }
    finally { setBusy(false); }
  }

  if (loading) return <PrismaPage><div className="prisma-review-loading"><Typography.Title level={3}>Preparando a bancada de revisão...</Typography.Title><Typography.Text type="secondary">Carregando documento, extração, evidências e histórico.</Typography.Text></div></PrismaPage>;
  if (!workspace || !draft) return <PrismaPage><Alert title={error ?? "Revisão não encontrada nesta empresa."} showIcon type="error" /></PrismaPage>;

  return (
    <PrismaPage className="prisma-m2c-page prisma-review-page prisma-review-page--workspace">
      <PrismaPageHeader
        title={`Revisão · ${workspace.personName}`}
        description={`${workspace.personName} · ${workspace.documentName} · Base de perfil ${workspace.baseProfileVersion ? `v${workspace.baseProfileVersion}` : "inicial"} · Lock ${workspace.lockVersion}`}
        actions={<Space wrap><Button disabled={!editable || !dirty || busy || Boolean(pendingSelection)} icon={<SaveOutlined />} loading={busy} onClick={() => void handleSave()}>Salvar rascunho</Button><Button disabled={!editable || busy || dirty || Boolean(pendingSelection)} icon={<CheckOutlined />} loading={busy} onClick={() => void handleApprove()} type="primary">Aprovar versão</Button></Space>}
      />
      <Button className="prisma-review-back" icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}`)} type="text">Voltar para o documento</Button>
      <div className="prisma-review-statusbar"><Tag color="blue">Extraído: preservado</Tag><Tag color={dirty ? "gold" : "green"}>{dirty ? "Alterações não salvas" : "Rascunho sincronizado"}</Tag><Typography.Text type="secondary">A ausência de um campo permanece “não identificado”, nunca uma avaliação negativa.</Typography.Text></div>
      {workspace.state === "approved" ? <Alert title={`Revisão aprovada em ${formatDate(workspace.approvedAt)}.`} showIcon type="success" /> : null}
      {error ? <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable title={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}
      <Segmented className="prisma-review-mobile-switch" onChange={(value) => setMobilePane(value as "document" | "review")} options={[{ label: "Currículo", value: "document" }, { label: "Revisão", value: "review" }]} value={mobilePane} />

      <div className={["prisma-review-split", `mobile-pane-${mobilePane}`].join(" ")}>
        <div className="prisma-review-document-pane">
          <DocumentEvidenceViewer
            activeLinkId={activeLinkId} fileName={workspace.documentName} links={workspace.evidenceLinks} navigationTarget={navigationTarget}
            onEvidenceClick={(fieldPath, linkId) => { setSelectedFieldPath(fieldPath); setActiveLinkId(linkId); setMobilePane("review"); }}
            onSelectionCancel={() => { setSelectionMode(false); setPendingSelection(null); }} onSelectionComplete={handleSelectionComplete}
            pageCount={workspace.documentPageCount} pdfUrl={pdfUrl} regions={workspace.spatialRegions} selectedFieldPath={selectedFieldPath} selectionMode={selectionMode}
          />
        </div>
        <div className="prisma-review-structured-pane">
          <StructuredReviewPanel
            activeLinkId={activeLinkId} canStartSelection={!dirty} draft={draft} editable={Boolean(editable)} onDraftChange={setDraft} onEvidenceNavigate={handleEvidenceNavigate}
            onFieldSelect={handleFieldSelect} onReasonChange={setReason}
            onStartSelection={(fieldPath) => { if (dirty) { setError("Salve ou descarte as alterações manuais antes de vincular uma nova evidência."); return; } setSelectedFieldPath(fieldPath); setPendingSelection(null); setSelectionMode(true); setMobilePane("document"); }}
            reason={reason} selectedFieldPath={selectedFieldPath} workspace={workspace}
          />
        </div>
      </div>

      <Modal cancelButtonProps={{ disabled: busy }} cancelText="Cancelar seleção" okButtonProps={{ disabled: busy }} okText="Aplicar seleção" onCancel={() => { setPendingSelection(null); setSelectionMode(false); }} onOk={() => void applyPendingSelection()} open={Boolean(pendingSelection)} title="Usar região selecionada">
        {pendingSelection ? <div className="prisma-selection-dialog">
          <Alert title={`Página ${pendingSelection.pageNumber} · ${pendingSelection.extractionMethod}`} description={pendingSelection.ocrState === "failed" ? "O texto não foi reconhecido. A região continuará rastreável, mas uma correção exige conteúdo e justificativa manual." : "Revise o texto recuperado antes de aplicá-lo."} showIcon type={pendingSelection.ocrState === "failed" ? "warning" : "info"} />
          <Radio.Group onChange={(event) => setPendingAction(event.target.value as ReviewEvidenceAction)} value={pendingAction}><Space orientation="vertical"><Radio value="correct_current_field">Corrigir campo atual</Radio><Radio value="add_complementary">Adicionar como evidência complementar</Radio>{replacementLinkId ? <Radio value="replace_review_evidence">Substituir evidência da revisão</Radio> : null}<Radio value="create_new_information">Criar nova informação</Radio></Space></Radio.Group>
          {pendingAction === "create_new_information" ? <Select aria-label="Tipo da nova informação" onChange={setNewInformationType} options={[{ label: "Experiência", value: "experience" }, { label: "Formação", value: "education" }, { label: "Competência", value: "competency" }, { label: "Idioma", value: "language" }, { label: "Certificação", value: "certification" }]} value={newInformationType} /> : null}
          {pendingAction === "correct_current_field" || pendingAction === "create_new_information" ? <Input.TextArea aria-label="Valor sugerido pela região" onChange={(event) => setSelectionValue(event.target.value)} placeholder="Valor revisado" rows={4} value={selectionValue} /> : null}
          <Input.TextArea aria-label="Justificativa da operação de evidência" onChange={(event) => setSelectionReason(event.target.value)} placeholder="Justificativa, quando houver interpretação ou divergência" rows={3} value={selectionReason} />
        </div> : null}
      </Modal>
    </PrismaPage>
  );
}

function primaryEvidenceTarget(fieldPath: string, workspace: ProfileReviewWorkspace | null): Omit<EvidenceNavigationTarget, "nonce"> | null {
  if (!workspace) return null;
  const candidates = workspace.evidenceLinks.filter((link) => link.state === "active" && fieldsOverlap(link.fieldPath, fieldPath)).sort((left, right) => linkPriority(left.linkKind) - linkPriority(right.linkKind));
  for (const link of candidates) {
    const region = link.spatialRegionId ? workspace.spatialRegions.find((item) => item.id === link.spatialRegionId) : null;
    const original = link.evidenceId ? workspace.originalEvidence.find((item) => item.id === link.evidenceId) : null;
    const pageNumber = region?.pageNumber ?? original?.sourcePage;
    if (pageNumber) return { pageNumber, regionId: region?.id ?? null, linkId: link.id };
  }
  return null;
}

function linkPriority(kind: "original" | "reviewer" | "complementary"): number { return kind === "reviewer" ? 0 : kind === "original" ? 1 : 2; }
function fieldsOverlap(left: string, right: string): boolean { return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`); }

function applyValueAtFieldPath(draft: StructuredDraft, fieldPath: string, value: string): StructuredDraft {
  const next = cloneDraft(draft);
  const segments = fieldPath.split(".");
  const root = segments[0];
  if (root === "summary") return { ...next, summary: value };
  if (["certifications", "languages", "competencies", "uncertainties", "notIdentified"].includes(root ?? "")) {
    const key = root as "certifications" | "languages" | "competencies" | "uncertainties" | "notIdentified";
    return { ...next, [key]: value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) };
  }
  const index = Number(segments[1]);
  const field = segments[2];
  if (root === "experiences" && Number.isInteger(index) && next.experiences[index]) next.experiences[index] = { ...next.experiences[index]!, [field ?? "description"]: value };
  if (root === "education" && Number.isInteger(index) && next.education[index]) next.education[index] = { ...next.education[index]!, [field ?? "description"]: value };
  return next;
}

function addNewInformation(draft: StructuredDraft, type: NewInformationType, value: string, page: number): { draft: StructuredDraft; fieldPath: string } {
  const next = cloneDraft(draft);
  if (type === "experience") { const index = next.experiences.length; next.experiences.push({ role: value, organization: "Não identificada", period: null, description: null, evidenceText: value, page }); return { draft: next, fieldPath: `experiences.${index}.role` }; }
  if (type === "education") { const index = next.education.length; next.education.push({ course: value, institution: "Não identificada", period: null, description: null, evidenceText: value, page }); return { draft: next, fieldPath: `education.${index}.course` }; }
  const key = type === "competency" ? "competencies" : type === "language" ? "languages" : "certifications";
  if (!next[key].includes(value)) next[key].push(value);
  return { draft: next, fieldPath: key };
}

function cloneDraft(draft: StructuredDraft): StructuredDraft { return JSON.parse(JSON.stringify(draft)) as StructuredDraft; }
function normalizeComparable(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase(); }
function formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "data não registrada"; }
