import { useEffect, useState } from "react";
import { ArrowLeftOutlined, CheckOutlined, HistoryOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Skeleton, Space, Tabs, Tag, Timeline, Typography } from "antd";
import type { StructuredDraft, ProfileReviewWorkspace } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileReviewPageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  documentId: string;
  reviewId: string;
  onNavigate: (path: string) => void;
}

export function ProfileReviewPage({ activeMembership, personId, documentId, reviewId, onNavigate }: ProfileReviewPageProps) {
  const [workspace, setWorkspace] = useState<ProfileReviewWorkspace | null>(null);
  const [draft, setDraft] = useState<StructuredDraft | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    const result = await personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId);
    if (!result) throw new Error("Revisão não encontrada nesta empresa.");
    setWorkspace(result);
    setDraft(cloneDraft(result.reviewedData));
  }

  useEffect(() => {
    let current = true;
    setLoading(true);
    void personIngestionService.loadProfileReview(activeMembership.organizationId, reviewId)
      .then((result) => { if (current) { setWorkspace(result); setDraft(result ? cloneDraft(result.reviewedData) : null); } })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a revisão."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, reviewId]);

  const dirty = Boolean(workspace && draft && JSON.stringify(workspace.reviewedData) !== JSON.stringify(draft));
  async function handleSave() {
    if (!workspace || !draft) return;
    if (reason.trim().length < 3) { setError("Informe o motivo da alteração com pelo menos 3 caracteres."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      await personIngestionService.saveProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion, draft, reason);
      await refresh(); setReason(""); setSuccess("Rascunho salvo como nova revisão auditável.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho."); }
    finally { setBusy(false); }
  }
  async function handleApprove() {
    if (!workspace || !draft) return;
    if (dirty) { setError("Salve as alterações antes de aprovar esta versão."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const approved = await personIngestionService.approveProfileReview(activeMembership.organizationId, workspace.id, workspace.lockVersion);
      await refresh(); setSuccess(`Perfil Prisma v${approved.profileVersion} aprovado sem sobrescrever a versão anterior.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível aprovar a revisão."); }
    finally { setBusy(false); }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 16 }} /></PrismaPage>;
  if (!workspace || !draft) return <PrismaPage><Alert title={error ?? "Revisão não encontrada nesta empresa."} showIcon type="error" /></PrismaPage>;
  const editable = workspace.state === "draft";

  return (
    <PrismaPage className="prisma-m2c-page prisma-review-page">
      <PrismaPageHeader
        title={`Revisão · ${workspace.personName}`}
        description={`${workspace.documentName} · Base de perfil ${workspace.baseProfileVersion ? `v${workspace.baseProfileVersion}` : "inicial"} · Lock ${workspace.lockVersion}`}
        actions={<Space wrap><Button disabled={!editable || !dirty || busy} icon={<SaveOutlined />} loading={busy} onClick={() => void handleSave()}>Salvar rascunho</Button><Button disabled={!editable || busy} icon={<CheckOutlined />} loading={busy} onClick={() => void handleApprove()} type="primary">Aprovar versão</Button></Space>}
      />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}/documents/${documentId}`)} type="text">Voltar para o documento</Button>
      {workspace.state === "approved" ? <Alert title={`Revisão aprovada em ${formatDate(workspace.approvedAt)}.`} showIcon type="success" /> : null}
      {error ? <Alert closable title={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      {success ? <Alert closable title={success} onClose={() => setSuccess(null)} showIcon type="success" /> : null}

      <PrismaCard className="prisma-review-workbench">
        <div className="prisma-review-legend">
          <Tag color="blue">Extraído: preservado</Tag>
          <Tag color={dirty ? "gold" : "green"}>{dirty ? "Alterações não salvas" : "Rascunho sincronizado"}</Tag>
          <Typography.Text type="secondary">A ausência de um campo permanece “não identificado”, nunca uma avaliação negativa.</Typography.Text>
        </div>
        <Tabs items={[
          { key: "summary", label: "Resumo", children: <ReviewTextField editable={editable} extracted={workspace.extractedData.summary ?? ""} label="Resumo profissional" onChange={(summary) => setDraft({ ...draft, summary: summary || null })} value={draft.summary ?? ""} /> },
          { key: "experience", label: `Experiência (${draft.experiences.length})`, children: <ExperienceEditor editable={editable} extracted={workspace.extractedData.experiences} onChange={(experiences) => setDraft({ ...draft, experiences })} value={draft.experiences} /> },
          { key: "education", label: `Formação (${draft.education.length})`, children: <EducationEditor editable={editable} extracted={workspace.extractedData.education} onChange={(education) => setDraft({ ...draft, education })} value={draft.education} /> },
          { key: "skills", label: "Competências", children: <ReviewTags editable={editable} extracted={workspace.extractedData.competencies} label="Competências explícitas" onChange={(competencies) => setDraft({ ...draft, competencies })} value={draft.competencies} /> },
          { key: "languages", label: "Idiomas", children: <ReviewTags editable={editable} extracted={workspace.extractedData.languages} label="Idiomas" onChange={(languages) => setDraft({ ...draft, languages })} value={draft.languages} /> },
          { key: "other", label: "Outros", children: <Space orientation="vertical" size="large" style={{ width: "100%" }}><ReviewTags editable={editable} extracted={workspace.extractedData.certifications} label="Certificações" onChange={(certifications) => setDraft({ ...draft, certifications })} value={draft.certifications} /><ReviewTags editable={editable} extracted={workspace.extractedData.uncertainties} label="Incertezas" onChange={(uncertainties) => setDraft({ ...draft, uncertainties })} value={draft.uncertainties} /><ReviewTags editable={editable} extracted={workspace.extractedData.notIdentified} label="Não identificados" onChange={(notIdentified) => setDraft({ ...draft, notIdentified })} value={draft.notIdentified} /></Space> },
        ]} />
      </PrismaCard>

      {editable ? <PrismaCard title="Justificativa da correção"><Input.TextArea aria-label="Motivo da alteração" onChange={(event) => setReason(event.target.value)} placeholder="Explique objetivamente por que os campos revisados foram alterados." rows={3} value={reason} /><Typography.Text type="secondary">Obrigatória para salvar. A justificativa fica ligada ao ator, horário, revisão e campos alterados.</Typography.Text></PrismaCard> : null}
      <PrismaCard title={<span><HistoryOutlined /> Histórico da revisão</span>}>
        {workspace.revisions.length ? <Timeline items={workspace.revisions.map((revision) => ({ content: <div><strong>Revisão {revision.revisionNumber}</strong><p>{revision.changeReason ?? "Sem justificativa registrada"}</p><small>{formatDate(revision.createdAt)} · ator {revision.actorAuthUserId}</small></div> }))} /> : <Empty description="Nenhum rascunho versionado." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </PrismaCard>
    </PrismaPage>
  );
}

function ReviewTextField({ label, extracted, value, editable, onChange }: { label: string; extracted: string; value: string; editable: boolean; onChange: (value: string) => void }) {
  return <div className="prisma-review-compare"><ExtractedValue label={`${label} extraído`} value={extracted || "Não identificado"} /><div><Typography.Text strong>{label} revisado</Typography.Text><Input.TextArea disabled={!editable} onChange={(event) => onChange(event.target.value)} rows={8} value={value} /></div></div>;
}

function ReviewTags({ label, extracted, value, editable, onChange }: { label: string; extracted: string[]; value: string[]; editable: boolean; onChange: (value: string[]) => void }) {
  return <div className="prisma-review-compare"><ExtractedValue label={`${label} extraídos`} value={extracted.length ? extracted.join(", ") : "Não identificado"} /><div><Typography.Text strong>{label} revisados</Typography.Text><Select disabled={!editable} mode="tags" onChange={onChange} open={false} placeholder="Digite e pressione Enter" tokenSeparators={[","]} value={value} /></div></div>;
}

function ExperienceEditor({ extracted, value, editable, onChange }: { extracted: StructuredDraft["experiences"]; value: StructuredDraft["experiences"]; editable: boolean; onChange: (value: StructuredDraft["experiences"]) => void }) {
  return <div className="prisma-review-compare"><ExtractedValue label="Experiências extraídas" value={formatExperiences(extracted)} /><div><Typography.Text strong>Experiências revisadas</Typography.Text>{value.map((item, index) => <div className="prisma-review-record" key={`${item.page}-${index}`}><Input disabled={!editable} onChange={(event) => updateAt(value, index, { ...item, role: event.target.value }, onChange)} placeholder="Cargo" value={item.role} /><Input disabled={!editable} onChange={(event) => updateAt(value, index, { ...item, organization: event.target.value }, onChange)} placeholder="Organização" value={item.organization} /><Input disabled={!editable} onChange={(event) => updateAt(value, index, { ...item, period: event.target.value || null }, onChange)} placeholder="Período" value={item.period ?? ""} /><small>Evidência original preservada na página {item.page}</small></div>)}{value.length === 0 ? <Empty description="Nenhuma experiência identificada." image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}</div></div>;
}

function EducationEditor({ extracted, value, editable, onChange }: { extracted: StructuredDraft["education"]; value: StructuredDraft["education"]; editable: boolean; onChange: (value: StructuredDraft["education"]) => void }) {
  return <div className="prisma-review-compare"><ExtractedValue label="Formação extraída" value={extracted.map((item) => item.course).join("\n") || "Não identificado"} /><div><Typography.Text strong>Formação revisada</Typography.Text>{value.map((item, index) => <div className="prisma-review-record" key={`${item.page}-${index}`}><Input disabled={!editable} onChange={(event) => updateAt(value, index, { ...item, course: event.target.value }, onChange)} placeholder="Curso" value={item.course} /><Input disabled={!editable} onChange={(event) => updateAt(value, index, { ...item, institution: event.target.value }, onChange)} placeholder="Instituição" value={item.institution} /><small>Evidência original preservada na página {item.page}</small></div>)}{value.length === 0 ? <Empty description="Nenhuma formação identificada." image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}</div></div>;
}

function ExtractedValue({ label, value }: { label: string; value: string }) { return <div className="prisma-extracted-value"><Typography.Text strong>{label}</Typography.Text><pre>{value}</pre></div>; }
function cloneDraft(draft: StructuredDraft): StructuredDraft { return JSON.parse(JSON.stringify(draft)) as StructuredDraft; }
function updateAt<T>(values: T[], index: number, next: T, onChange: (value: T[]) => void) { onChange(values.map((value, current) => current === index ? next : value)); }
function formatExperiences(values: StructuredDraft["experiences"]): string { return values.map((item) => `${item.role} · ${item.organization}${item.period ? ` · ${item.period}` : ""}`).join("\n") || "Não identificado"; }
function formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "data não registrada"; }
