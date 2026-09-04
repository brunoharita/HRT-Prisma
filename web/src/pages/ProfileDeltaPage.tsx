import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckCircleOutlined, FilePdfOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, Radio, Select, Skeleton, Statistic, Tabs, Tag, Typography } from "antd";
import { deriveProfileDelta, isProfileBlockDecisionItem, type ProfileDeltaItem, type ProfileDeltaKind, type ProfileDeltaSection } from "../domain/profileDelta";
import type { ProfileBlockAction, ProfileBlockDecision, ProfilePublicationMode, ProfileReviewWorkspace, ProfileVersionView } from "../domain/personIngestion";
import { normalizeReviewDraft, validateEducationClassificationsForApproval, validateReviewDraftForSave } from "../domain/reviewFieldLifecycle";
import { operationRecovery, PrismaOperationError, type OperationRecovery } from "../domain/reviewOperationErrors";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileDeltaPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId?: string;
  reviewId: string;
  onNavigate: (path: string) => void;
}

const sections: Array<{ key: ProfileDeltaSection; label: string }> = [
  { key: "summary", label: "Resumo" },
  { key: "experiences", label: "Experiências" },
  { key: "competencies", label: "Competências" },
  { key: "education", label: "Formação" },
  { key: "languages", label: "Idiomas" },
  { key: "certifications", label: "Certificações" },
  { key: "others", label: "Outros" },
  { key: "private_contact", label: "Contato" },
];

export function ProfileDeltaPage({ activeMembership, personId, documentId, reviewId, onNavigate }: ProfileDeltaPageProps) {
  const [workspace, setWorkspace] = useState<ProfileReviewWorkspace | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileVersionView | null>(null);
  const [removalKeys, setRemovalKeys] = useState<Set<string>>(new Set());
  const [publicationMode, setPublicationMode] = useState<ProfilePublicationMode>("merge");
  const [blockActions, setBlockActions] = useState<Map<string, ProfileBlockAction>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFieldPath, setErrorFieldPath] = useState<string | null>(null);
  const [errorRecovery, setErrorRecovery] = useState<OperationRecovery>("retry");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        let [review, versions] = await Promise.all([
          personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId),
          personIngestionService.listProfileVersions(activeMembership.organizationId, personId),
        ]);
        if (!review || review.personId !== personId || (documentId && review.documentId !== documentId)) throw new Error("A proposta não pertence à origem informada.");
        if (review.state !== "draft") throw new Error("Esta proposta não está mais disponível para publicação.");

        if (review.requiresContractUpgrade) {
          const normalizedDraft = normalizeReviewDraft(review.reviewedData);
          const saveIssues = validateReviewDraftForSave(normalizedDraft, {
            existingPhone: review.personPrivateContact.phone,
            existingEmail: review.personPrivateContact.email,
          });
          if (!saveIssues.length) {
            await personIngestionService.synchronizeProfileReviewContract(
              activeMembership.organizationId,
              review.id,
              review.lockVersion,
              normalizedDraft,
            );
            const refreshed = await personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId);
            if (refreshed) review = refreshed;
            versions = await personIngestionService.listProfileVersions(activeMembership.organizationId, personId);
          }
        }

        if (!active) return;
        setWorkspace(review);
        setCurrentProfile(versions.find((version) => version.supersededAt === null) ?? null);
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Não foi possível preparar a comparação.");
        setErrorFieldPath(caught instanceof PrismaOperationError ? caught.fieldPath : null);
        setErrorRecovery(operationRecovery(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [activeMembership.organizationId, documentId, personId, reviewId]);

  const delta = useMemo(() => workspace ? deriveProfileDelta(currentProfile?.profileData ?? null, workspace.reviewedData, {
    currentContact: workspace.personPrivateContact,
    explicitRemovalKeys: removalKeys,
  }) : null, [currentProfile, removalKeys, workspace]);
  const validationIssues = useMemo(() => {
    if (!workspace) return [];
    const normalizedDraft = normalizeReviewDraft(workspace.reviewedData);
    return [
      ...validateReviewDraftForSave(normalizedDraft, {
        existingPhone: workspace.personPrivateContact.phone,
        existingEmail: workspace.personPrivateContact.email,
      }),
      ...validateEducationClassificationsForApproval(normalizedDraft),
    ];
  }, [workspace]);

  function returnToReview(fieldPath?: string | null) {
    if (fieldPath) window.sessionStorage.setItem(reviewFocusStorageKey(reviewId), fieldPath);
    onNavigate(reviewPath(personId, reviewId, documentId));
  }

  function setBlockAction(item: ProfileDeltaItem, action: ProfileBlockAction) {
    setRemovalKeys((current) => {
      const next = new Set(current);
      if (action === "remove") next.add(item.key); else next.delete(item.key);
      return next;
    });
    setBlockActions((current) => new Map(current).set(item.key, action));
  }

  async function publish() {
    if (!workspace || !delta) {
      setError("A comparação ainda não terminou de carregar. Aguarde alguns instantes e tente novamente.");
      return;
    }
    if (validationIssues.length) {
      setError(`Antes de publicar, falta concluir ${validationIssues.length === 1 ? "este item" : "estes itens"}.`);
      setErrorFieldPath(validationIssues[0]!.fieldPath);
      return;
    }
    const decisions: ProfileBlockDecision[] = delta.items.filter(isProfileBlockDecisionItem).map((item) => ({
      fieldPath: item.key,
      action: blockActions.get(item.key) ?? defaultBlockAction(item, publicationMode),
      targetBlockId: item.targetBlockId,
      resolver: item.resolver,
      sourceBlockId: item.sourceBlockId,
      previousValue: parseDeltaValue(item.before),
    }));
    setBusy(true); setError(null); setErrorFieldPath(null);
    try {
      const approved = await personIngestionService.publishProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion, publicationMode, decisions);
      window.sessionStorage.setItem(`prisma.profile-published.${personId}`, `Perfil v${approved.profileVersion} publicado com sucesso.`);
      onNavigate(`/profiles/${personId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível publicar a nova versão.");
      setErrorFieldPath(caught instanceof PrismaOperationError ? caught.fieldPath : null);
      setErrorRecovery(operationRecovery(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 10 }} /></PrismaPage>;
  if (!workspace || !delta) return <PrismaPage><Alert action={<Button onClick={() => onNavigate(`/profiles/${personId}`)}>Voltar à Central da Pessoa</Button>} description="Nenhuma publicação foi realizada. Abra novamente o documento para carregar o estado atual." showIcon title={error ?? "Comparação não encontrada."} type="error" /></PrismaPage>;
  const nextVersion = (currentProfile?.profileVersion ?? 0) + 1;
  return (
    <PrismaPage className="prisma-delta-page">
      <PrismaPageHeader
        title={delta.firstPublication ? "Revisão da primeira versão do perfil" : "Comparação com o perfil atual"}
        description={delta.firstPublication ? "Revise o conhecimento que formará o primeiro Perfil Prisma antes de publicar." : "Veja exatamente o que a nova versão altera e o que permanece preservado antes de publicar."}
        actions={<Card className="prisma-delta-file-card" size="small"><FilePdfOutlined /><span><strong>{workspace.sourceKind === "profile" ? `Perfil v${workspace.sourceProfileVersion ?? workspace.baseProfileVersion}` : workspace.documentName}</strong><small>{workspace.sourceKind === "profile" ? "Versão usada como base" : `Documento v${workspace.documentVersion}`}</small></span></Card>}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => returnToReview()} type="text">Voltar para revisão</Button>
      <Card className="prisma-delta-summary-card">
        {!delta.firstPublication ? <div className="prisma-publication-mode" aria-label="Escolha como o perfil será publicado">
          <Typography.Title level={4}>Como esta revisão deve formar o Perfil?</Typography.Title>
          <Radio.Group buttonStyle="solid" onChange={(event) => { setPublicationMode(event.target.value as ProfilePublicationMode); setBlockActions(new Map()); setRemovalKeys(new Set()); }} value={publicationMode}>
            <Radio.Button value="merge">Atualizar Perfil</Radio.Button>
            <Radio.Button value="replace">Substituir Perfil</Radio.Button>
          </Radio.Group>
          <Typography.Text type="secondary">{publicationMode === "merge" ? "Combina as informações revisadas com o perfil atual e preserva o que não foi citado." : "Usa esta revisão como o novo perfil completo. O que não aparece nela deixa de fazer parte do perfil vigente, sem apagar o histórico."}</Typography.Text>
        </div> : null}
        <div className="prisma-delta-transition">
          <div><Typography.Text type="secondary">Perfil atual</Typography.Text><strong>{currentProfile ? `v${currentProfile.profileVersion} aprovado` : "Nenhum perfil publicado"}</strong><small>{currentProfile?.approvedAt ? formatDate(currentProfile.approvedAt) : "Primeira publicação"}</small></div>
          <span>→</span>
          <div><Typography.Text type="secondary">Proposta nova</Typography.Text><strong>v{nextVersion} {validationIssues.length ? "aguardando revisão" : "pronta para publicação"}</strong><small>{validationIssues.length ? `${validationIssues.length} ${validationIssues.length === 1 ? "item precisa" : "itens precisam"} de confirmação` : "Revisão concluída"}</small></div>
        </div>
        <div className="prisma-delta-stats" aria-label="Impacto geral da publicação">
          <Statistic title="Adições" value={delta.counts.added} />
          <Statistic title="Atualizações" value={delta.counts.updated} />
          <Statistic title="Manutenções" value={delta.counts.maintained + delta.counts.not_cited} />
          <Statistic title="Remoções" value={delta.counts.explicit_removal} />
        </div>
      </Card>

      <Card className="prisma-delta-content-card">
        <Tabs items={sections.map((section) => ({
          key: section.key,
          label: `${section.label} ${delta.items.filter((item) => item.section === section.key).length || ""}`.trim(),
          children: <DeltaSection actions={blockActions} items={delta.items.filter((item) => item.section === section.key)} mode={publicationMode} onAction={setBlockAction} />,
        }))} />
      </Card>

      {validationIssues.length ? <Alert
        action={<Button onClick={() => returnToReview(validationIssues[0]!.fieldPath)}>Revisar o campo</Button>}
        className="prisma-delta-publish-error"
        description={<ul className="prisma-delta-validation-list">{validationIssues.map((issue) => <li key={`${issue.fieldPath}-${issue.message}`}>{issue.message}</li>)}</ul>}
        showIcon
        title={`Antes de publicar, ${validationIssues.length === 1 ? "falta concluir este item" : `faltam concluir ${validationIssues.length} itens`}.`}
        type="warning"
      /> : null}
      {error ? <Alert action={errorAction(errorRecovery, errorFieldPath, returnToReview, onNavigate)} className="prisma-delta-publish-error" closable description="Nada foi publicado e sua comparação permanece preservada nesta tela." onClose={() => { setError(null); setErrorFieldPath(null); }} showIcon title={error} type="error" /> : null}
      <Alert
        className="prisma-delta-preservation-alert"
        description={publicationMode === "merge" ? "Itens não citados permanecem no perfil. Você só precisa agir quando quiser substituir ou remover algo já aprovado." : "Esta revisão será o novo perfil completo. O histórico e os documentos permanecem disponíveis para restauração."}
        icon={<SafetyCertificateOutlined />}
        showIcon
        title={publicationMode === "merge" ? "Atualizar Perfil preserva informações já aprovadas." : "Substituir Perfil remove do perfil vigente o que não estiver nesta revisão."}
        type="info"
      />
      <div className="prisma-delta-footer">
        <Button onClick={() => returnToReview()}>Voltar para revisão</Button>
        <Button danger={publicationMode === "replace"} icon={<CheckCircleOutlined />} loading={busy} onClick={() => validationIssues.length ? returnToReview(validationIssues[0]!.fieldPath) : void publish()} type={publicationMode === "replace" ? "default" : "primary"}>
          {validationIssues.length ? "Revisar pendência" : delta.firstPublication ? `Publicar Perfil v${nextVersion}` : publicationMode === "merge" ? "Atualizar Perfil" : "Substituir Perfil"}
        </Button>
      </div>
    </PrismaPage>
  );
}

function DeltaSection({ actions, items, mode, onAction }: { actions: Map<string, ProfileBlockAction>; items: ProfileDeltaItem[]; mode: ProfilePublicationMode; onAction: (item: ProfileDeltaItem, action: ProfileBlockAction) => void }) {
  if (!items.length) return <Empty description="Nenhuma informação nesta seção" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const order: ProfileDeltaKind[] = ["added", "updated", "maintained", "not_cited", "explicit_removal"];
  return <div className="prisma-delta-groups">{order.map((kind) => {
    const group = items.filter((item) => item.kind === kind);
    if (!group.length) return null;
    return <section key={kind}><Typography.Text className={`prisma-delta-group-title is-${kind}`} strong>{kindLabel(kind)} ({group.length})</Typography.Text>{group.map((item) => <article className={`prisma-delta-item is-${kind}`} key={item.key}>
      <div><strong>{item.label}</strong><Tag>{provenanceLabel(item.provenance)}</Tag>{item.kind === "updated" ? <><small>Antes: {preview(item.before)}</small><small>Depois: {preview(item.after)}</small></> : <small>{preview(item.after ?? item.before)}</small>}</div>
      <div className="prisma-delta-item-action"><Tag color={kindColor(kind)}>{kindBadge(kind)}</Tag>{item.section === "private_contact" ? <Typography.Text type="secondary">Atualizado no cadastro privado</Typography.Text> : <>{item.kind === "not_cited" ? <Typography.Text type="secondary">{mode === "merge" ? "Mantido por já estar aprovado" : "Não fará parte do novo perfil"}</Typography.Text> : null}<Select aria-label={`Ação para ${item.label}`} onChange={(value) => onAction(item, value)} options={blockActionOptions(item, mode)} value={actions.get(item.key) ?? defaultBlockAction(item, mode)} /></>}</div>
    </article>)}</section>;
  })}</div>;
}

function kindLabel(kind: ProfileDeltaKind): string { return ({ added: "ADICIONADO", updated: "ATUALIZADO", maintained: "MANTIDO", not_cited: "NÃO CITADO NO NOVO CURRÍCULO", explicit_removal: "REMOÇÃO EXPLÍCITA" })[kind]; }
function kindBadge(kind: ProfileDeltaKind): string { return ({ added: "Novo registro", updated: "Dados atualizados", maintained: "Mantido", not_cited: "Preservado", explicit_removal: "Será removido" })[kind]; }
function kindColor(kind: ProfileDeltaKind): string { return ({ added: "green", updated: "gold", maintained: "blue", not_cited: "default", explicit_removal: "red" })[kind]; }
function provenanceLabel(value: ProfileDeltaItem["provenance"]): string { return ({ approved: "Já aprovado", explicit: "Explícita no currículo", normalized: "Termo normalizado", human: "Confirmada por pessoa" })[value]; }
function preview(value: string | null): string { if (!value) return "Sem valor"; try { const parsed = JSON.parse(value) as Record<string, unknown>; return Object.entries(parsed).filter(([key]) => !["id", "source", "evidenceText", "page", "items"].includes(key)).map(([, item]) => String(item ?? "")).filter(Boolean).join(" · ") || value; } catch { return value; } }
function parseDeltaValue(value: string | null): unknown { if (!value) return null; try { return JSON.parse(value) as unknown; } catch { return value; } }
function defaultBlockAction(item: ProfileDeltaItem, mode: ProfilePublicationMode): ProfileBlockAction {
  if (item.kind === "added") return "add";
  if (item.kind === "updated") return "update";
  if (item.kind === "explicit_removal" || (mode === "replace" && item.kind === "not_cited")) return "remove";
  return "keep";
}
function blockActionOptions(item: ProfileDeltaItem, mode: ProfilePublicationMode) {
  const options: Array<{ value: ProfileBlockAction; label: string }> = [];
  if (item.after && !item.before) options.push({ value: "add", label: "Adicionar" });
  if (item.after && item.before) options.push({ value: "update", label: "Atualizar" }, { value: "replace", label: "Substituir" });
  if (item.before) options.push({ value: "keep", label: "Manter atual" }, { value: "remove", label: "Remover do novo Perfil" });
  if (mode === "replace" && item.kind === "not_cited") return options.filter((option) => option.value === "remove" || option.value === "keep");
  return options;
}
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)); }
function reviewFocusStorageKey(reviewId: string): string { return `prisma.review-focus.${reviewId}`; }
function errorAction(recovery: OperationRecovery, fieldPath: string | null, returnToReview: (fieldPath?: string | null) => void, onNavigate: (path: string) => void) {
  if (fieldPath) return <Button onClick={() => returnToReview(fieldPath)}>Ir para a correção</Button>;
  if (recovery === "sign-in") return <Button onClick={() => onNavigate("/sign-in")}>Entrar novamente</Button>;
  if (recovery === "return-to-review" || recovery === "review-fields") return <Button onClick={() => returnToReview()}>Voltar para revisão</Button>;
  if (recovery === "reload" || recovery === "retry") return <Button onClick={() => window.location.reload()}>Atualizar e tentar novamente</Button>;
  return null;
}

function reviewPath(personId: string, reviewId: string, documentId?: string): string { return documentId ? `/profiles/${personId}/documents/${documentId}/review/${reviewId}` : `/profiles/${personId}/reviews/${reviewId}`; }
