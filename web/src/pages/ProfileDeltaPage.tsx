import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckCircleOutlined, DeleteOutlined, FilePdfOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, Empty, Input, Modal, Skeleton, Space, Statistic, Tabs, Tag, Typography } from "antd";
import { deriveProfileDelta, type ProfileDeltaItem, type ProfileDeltaKind, type ProfileDeltaSection } from "../domain/profileDelta";
import type { ProfileReviewWorkspace, ProfileVersionView, PublicationRemovalDecision } from "../domain/personIngestion";
import { normalizeReviewDraft, validateEducationClassificationsForApproval, validateReviewDraftForSave } from "../domain/reviewFieldLifecycle";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileDeltaPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId: string;
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
  const [removalReason, setRemovalReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId),
      personIngestionService.listProfileVersions(activeMembership.organizationId, personId),
    ]).then(([review, versions]) => {
      if (!active) return;
      if (!review || review.personId !== personId || review.documentId !== documentId) throw new Error("A proposta não pertence à Pessoa e ao documento informados.");
      if (review.state !== "draft") throw new Error("Esta proposta não está mais disponível para publicação.");
      setWorkspace(review);
      setCurrentProfile(versions.find((version) => version.supersededAt === null) ?? null);
    }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Não foi possível preparar a comparação."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeMembership.organizationId, documentId, personId, reviewId]);

  const delta = useMemo(() => workspace ? deriveProfileDelta(currentProfile?.profileData ?? null, workspace.reviewedData, {
    currentContact: workspace.personPrivateContact,
    explicitRemovalKeys: removalKeys,
  }) : null, [currentProfile, removalKeys, workspace]);

  function toggleRemoval(item: ProfileDeltaItem, checked: boolean) {
    setRemovalKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(item.key); else next.delete(item.key);
      return next;
    });
  }

  async function publish() {
    if (!workspace || !delta) {
      setError("A comparação ainda não terminou de carregar. Aguarde alguns instantes e tente novamente.");
      return;
    }
    const normalizedDraft = normalizeReviewDraft(workspace.reviewedData);
    const reviewIssues = [
      ...validateReviewDraftForSave(normalizedDraft, {
        existingPhone: workspace.personPrivateContact.phone,
        existingEmail: workspace.personPrivateContact.email,
      }),
      ...validateEducationClassificationsForApproval(normalizedDraft),
    ];
    if (reviewIssues.length) {
      setError(`A publicação foi interrompida antes de qualquer alteração: ${reviewIssues[0]!.message} Volte à revisão para corrigir o campo indicado.`);
      return;
    }
    const removedItems = delta.items.filter((item) => item.kind === "explicit_removal");
    if (removedItems.length && removalReason.trim().length < 5) {
      setError("Explique por que as informações anteriormente aprovadas serão removidas.");
      return;
    }
    const removals: PublicationRemovalDecision[] = removedItems.map((item) => ({
      fieldPath: item.key,
      previousValue: parseDeltaValue(item.before),
      reason: removalReason.trim(),
    }));
    setBusy(true); setError(null);
    try {
      const approved = await personIngestionService.publishProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion, removals);
      window.sessionStorage.setItem(`prisma.profile-published.${personId}`, `Perfil v${approved.profileVersion} publicado com sucesso.`);
      setConfirmOpen(false);
      onNavigate(`/profiles/${personId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível publicar a nova versão.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 10 }} /></PrismaPage>;
  if (!workspace || !delta) return <PrismaPage><Alert action={<Button onClick={() => onNavigate(`/profiles/${personId}`)}>Voltar à Central da Pessoa</Button>} description="Nenhuma publicação foi realizada. Abra novamente o documento para carregar o estado atual." showIcon title={error ?? "Comparação não encontrada."} type="error" /></PrismaPage>;
  const nextVersion = (currentProfile?.profileVersion ?? 0) + 1;
  const removalItems = delta.items.filter((item) => item.kind === "explicit_removal");

  return (
    <PrismaPage className="prisma-delta-page">
      <PrismaPageHeader
        title={delta.firstPublication ? "Revisão da primeira versão do perfil" : "Comparação com o perfil atual"}
        description={delta.firstPublication ? "Revise o conhecimento que formará o primeiro Perfil Prisma antes de publicar." : "Veja exatamente o que a nova versão altera e o que permanece preservado antes de publicar."}
        actions={<Card className="prisma-delta-file-card" size="small"><FilePdfOutlined /><span><strong>{workspace.documentName}</strong><small>Documento v{workspace.documentVersion}</small></span></Card>}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}/review/${reviewId}`)} type="text">Voltar para revisão</Button>
      <Card className="prisma-delta-summary-card">
        <div className="prisma-delta-transition">
          <div><Typography.Text type="secondary">Perfil atual</Typography.Text><strong>{currentProfile ? `v${currentProfile.profileVersion} aprovado` : "Nenhum perfil publicado"}</strong><small>{currentProfile?.approvedAt ? formatDate(currentProfile.approvedAt) : "Primeira publicação"}</small></div>
          <span>→</span>
          <div><Typography.Text type="secondary">Proposta nova</Typography.Text><strong>v{nextVersion} pronta para publicação</strong><small>Revisão concluída</small></div>
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
          children: <DeltaSection items={delta.items.filter((item) => item.section === section.key)} onToggleRemoval={toggleRemoval} />,
        }))} />
      </Card>

      {error ? <Alert action={<Button onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}/review/${reviewId}`)}>Voltar para revisão</Button>} className="prisma-delta-publish-error" closable description="Nada foi publicado e sua comparação permanece preservada nesta tela." onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
      <Alert
        className="prisma-delta-preservation-alert"
        description="Itens não citados aparecem como mantidos. Uma remoção só acontece quando você a marca explicitamente e confirma sua justificativa."
        icon={<SafetyCertificateOutlined />}
        showIcon
        title="A omissão de informações no novo currículo não remove dados já aprovados."
        type="info"
      />
      <div className="prisma-delta-footer">
        <Button onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}/review/${reviewId}`)}>Voltar para revisão</Button>
        <Button icon={<CheckCircleOutlined />} loading={busy} onClick={() => removalItems.length ? setConfirmOpen(true) : void publish()} type="primary">
          {delta.firstPublication ? `Publicar Perfil v${nextVersion}` : "Publicar nova versão"}
        </Button>
      </div>

      <Modal cancelText="Voltar à comparação" confirmLoading={busy} okText={`Confirmar ${removalItems.length} ${removalItems.length === 1 ? "remoção" : "remoções"}`} onCancel={() => setConfirmOpen(false)} onOk={() => void publish()} open={confirmOpen} title={`Esta publicação removerá ${removalItems.length} ${removalItems.length === 1 ? "informação anteriormente aprovada" : "informações anteriormente aprovadas"}.`}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? <Alert description="A janela continuará aberta para você corrigir a justificativa ou voltar à revisão." showIcon title={error} type="error" /> : null}
          {removalItems.map((item) => <Tag color="red" icon={<DeleteOutlined />} key={item.key}>{item.label}: {preview(item.before)}</Tag>)}
          <Input.TextArea aria-label="Justificativa das remoções" onChange={(event) => setRemovalReason(event.target.value)} placeholder="Explique por que estas informações devem deixar o perfil vigente" rows={4} value={removalReason} />
        </Space>
      </Modal>
    </PrismaPage>
  );
}

function DeltaSection({ items, onToggleRemoval }: { items: ProfileDeltaItem[]; onToggleRemoval: (item: ProfileDeltaItem, checked: boolean) => void }) {
  if (!items.length) return <Empty description="Nenhuma informação nesta seção" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const order: ProfileDeltaKind[] = ["added", "updated", "maintained", "not_cited", "explicit_removal"];
  return <div className="prisma-delta-groups">{order.map((kind) => {
    const group = items.filter((item) => item.kind === kind);
    if (!group.length) return null;
    return <section key={kind}><Typography.Text className={`prisma-delta-group-title is-${kind}`} strong>{kindLabel(kind)} ({group.length})</Typography.Text>{group.map((item) => <article className={`prisma-delta-item is-${kind}`} key={item.key}>
      <div><strong>{item.label}</strong><Tag>{provenanceLabel(item.provenance)}</Tag>{item.kind === "updated" ? <><small>Antes: {preview(item.before)}</small><small>Depois: {preview(item.after)}</small></> : <small>{preview(item.after ?? item.before)}</small>}</div>
      <div className="prisma-delta-item-action"><Tag color={kindColor(kind)}>{kindBadge(kind)}</Tag>{item.kind === "not_cited" ? <Typography.Text type="secondary">Mantido por já estar aprovado</Typography.Text> : null}{item.removable ? <Checkbox checked={item.kind === "explicit_removal"} onChange={(event) => onToggleRemoval(item, event.target.checked)}>Remover desta versão</Checkbox> : null}</div>
    </article>)}</section>;
  })}</div>;
}

function kindLabel(kind: ProfileDeltaKind): string { return ({ added: "ADICIONADO", updated: "ATUALIZADO", maintained: "MANTIDO", not_cited: "NÃO CITADO NO NOVO CURRÍCULO", explicit_removal: "REMOÇÃO EXPLÍCITA" })[kind]; }
function kindBadge(kind: ProfileDeltaKind): string { return ({ added: "Novo registro", updated: "Dados atualizados", maintained: "Mantido", not_cited: "Preservado", explicit_removal: "Será removido" })[kind]; }
function kindColor(kind: ProfileDeltaKind): string { return ({ added: "green", updated: "gold", maintained: "blue", not_cited: "default", explicit_removal: "red" })[kind]; }
function provenanceLabel(value: ProfileDeltaItem["provenance"]): string { return ({ approved: "Já aprovado", explicit: "Explícita no currículo", normalized: "Termo normalizado", human: "Confirmada por pessoa" })[value]; }
function preview(value: string | null): string { if (!value) return "Sem valor"; try { const parsed = JSON.parse(value) as Record<string, unknown>; return Object.entries(parsed).filter(([key]) => !["id", "source", "evidenceText", "page", "items"].includes(key)).map(([, item]) => String(item ?? "")).filter(Boolean).join(" · ") || value; } catch { return value; } }
function parseDeltaValue(value: string | null): unknown { if (!value) return null; try { return JSON.parse(value) as unknown; } catch { return value; } }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)); }
