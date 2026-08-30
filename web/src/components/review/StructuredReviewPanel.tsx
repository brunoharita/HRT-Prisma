import { useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Alert, Button, Divider, Drawer, Empty, Input, Popconfirm, Select, Space, Tabs, Tag, Timeline, Typography } from "antd";
import type { ProfileReviewWorkspace, StructuredDraft } from "../../domain/personIngestion";
import { fieldPathMatches, topLevelReviewField } from "../../domain/spatialEvidence";

interface StructuredReviewPanelProps {
  workspace: ProfileReviewWorkspace;
  draft: StructuredDraft;
  editable: boolean;
  canStartSelection: boolean;
  selectedFieldPath: string;
  activeLinkId: string | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onDraftChange: (draft: StructuredDraft) => void;
  onFieldSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onStartSelection: (fieldPath: string) => void;
  onCreateCustomSection: () => void;
  onEvidenceNavigate: (input: { fieldPath: string; linkId: string; pageNumber: number; regionId: string | null }) => void;
  onEvidenceDelete: (input: { fieldPath: string; linkId: string }) => void;
}

export function StructuredReviewPanel({
  workspace,
  draft,
  editable,
  canStartSelection,
  selectedFieldPath,
  activeLinkId,
  reason,
  onReasonChange,
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
  const activeTab = tabForField(selectedFieldPath);

  function selectTab(key: string) {
    const defaults: Record<string, string> = {
      summary: "summary",
      experience: `experiences.${Math.min(experienceIndex, Math.max(draft.experiences.length - 1, 0))}.role`,
      education: `education.${Math.min(educationIndex, Math.max(draft.education.length - 1, 0))}.course`,
      skills: "competencies",
      languages: "languages",
      other: firstOtherFieldPath(draft),
    };
    onFieldSelect(defaults[key] ?? "summary");
  }

  const matchingEvidenceLinks = workspace.evidenceLinks.filter((link) => link.state === "active" && fieldPathMatches(link.fieldPath, selectedFieldPath));
  const hasSpatialOriginal = matchingEvidenceLinks.some((link) => link.linkKind === "original" && Boolean(link.spatialRegionId));
  const evidenceLinks = matchingEvidenceLinks.filter((link) => !(hasSpatialOriginal && link.linkKind === "original" && !link.spatialRegionId));
  const fieldChanges = workspace.changes.filter((change) => topLevelReviewField(selectedFieldPath) === change.fieldPath);
  const evidenceEvents = workspace.evidenceEvents.filter((event) => fieldPathMatches(event.fieldPath, selectedFieldPath));
  const adaptationEvents = workspace.adaptationEvents.filter((event) => event.acceptedSuggestions.some((suggestion) => fieldPathMatches(suggestion.fieldPath, selectedFieldPath)));

  return (
    <section aria-label="Revisão estruturada" className="prisma-structured-review">
      <div className="prisma-review-panel-topline">
        <Typography.Text type="secondary">Modo de edição</Typography.Text>
        <Tag color="blue"><FileSearchOutlined /> Assistida por evidência</Tag>
      </div>
      <Tabs
        activeKey={activeTab}
        className="prisma-review-tabs"
        items={[
          { key: "summary", label: "Resumo", children: <SummaryEditor {...commonProps()} /> },
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
          <Button disabled={!editable || !canStartSelection} icon={<PlusOutlined />} onClick={() => onStartSelection(selectedFieldPath)} size="small">Adicionar evidência</Button>
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
        <Button block className="prisma-add-evidence-card" disabled={!editable || !canStartSelection} icon={<PlusOutlined />} onClick={() => onStartSelection(selectedFieldPath)} type="dashed">
          Selecione uma nova área no documento
        </Button>
      </section>

      {editable ? (
        <section className="prisma-correction-reason">
          <Typography.Text strong>Justificativa da correção</Typography.Text>
          <Input.TextArea
            aria-label="Justificativa da correção"
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Necessária para alterações manuais sem uma operação de evidência autoexplicativa."
            rows={3}
            value={reason}
          />
          <Typography.Text type="secondary">Seleções explícitas registram automaticamente a operação; divergências interpretativas continuam exigindo justificativa.</Typography.Text>
        </section>
      ) : null}

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
    if (draft.experiences.length === 0) return <Empty description="Nenhuma experiência identificada. Use uma região do currículo para criar uma nova informação." />;
    const index = Math.min(experienceIndex, draft.experiences.length - 1);
    const reviewed = draft.experiences[index]!;
    const extracted = workspace.extractedData.experiences[index];
    const update = (patch: Partial<typeof reviewed>) => onDraftChange({ ...draft, experiences: draft.experiences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    return (
      <div className="prisma-entity-review">
        <EntityNavigator count={draft.experiences.length} index={index} label="Experiência" onChange={(next) => { setExperienceIndex(next); onFieldSelect(`experiences.${next}.role`); }} />
        <ReviewField editable={editable} extracted={extracted?.organization ?? "Não identificado"} fieldPath={`experiences.${index}.organization`} label="Empresa" onChange={(value) => update({ organization: value })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `experiences.${index}.organization`)} value={reviewed.organization} />
        <ReviewField editable={editable} extracted={extracted?.role ?? "Não identificado"} fieldPath={`experiences.${index}.role`} label="Cargo" onChange={(value) => update({ role: value })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `experiences.${index}.role`)} value={reviewed.role} />
        <ReviewField editable={editable} extracted={extracted?.period ?? "Não identificado"} fieldPath={`experiences.${index}.period`} label="Período" onChange={(value) => update({ period: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `experiences.${index}.period`)} value={reviewed.period ?? ""} />
        <ReviewField editable={editable} extracted={extracted?.description ?? "Não identificado"} fieldPath={`experiences.${index}.description`} label="Descrição / Principais atividades" multiline onChange={(value) => update({ description: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `experiences.${index}.description`)} value={reviewed.description ?? reviewed.evidenceText} />
      </div>
    );
  }

  function EducationEditor() {
    if (draft.education.length === 0) return <Empty description="Nenhuma formação identificada. Use uma região do currículo para criar uma nova informação." />;
    const index = Math.min(educationIndex, draft.education.length - 1);
    const reviewed = draft.education[index]!;
    const extracted = workspace.extractedData.education[index];
    const update = (patch: Partial<typeof reviewed>) => onDraftChange({ ...draft, education: draft.education.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    return (
      <div className="prisma-entity-review">
        <EntityNavigator count={draft.education.length} index={index} label="Formação" onChange={(next) => { setEducationIndex(next); onFieldSelect(`education.${next}.course`); }} />
        <ReviewField editable={editable} extracted={extracted?.course ?? "Não identificado"} fieldPath={`education.${index}.course`} label="Curso" onChange={(value) => update({ course: value })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `education.${index}.course`)} value={reviewed.course} />
        <ReviewField editable={editable} extracted={extracted?.institution ?? "Não identificado"} fieldPath={`education.${index}.institution`} label="Instituição" onChange={(value) => update({ institution: value })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `education.${index}.institution`)} value={reviewed.institution} />
        <ReviewField editable={editable} extracted={extracted?.period ?? "Não identificado"} fieldPath={`education.${index}.period`} label="Período" onChange={(value) => update({ period: value || null })} onSelect={onFieldSelect} selected={fieldPathMatches(selectedFieldPath, `education.${index}.period`)} value={reviewed.period ?? ""} />
      </div>
    );
  }

  function TagField({ fieldPath, label }: { fieldPath: "certifications" | "languages" | "competencies" | "uncertainties" | "notIdentified"; label: string }) {
    return (
      <div className={["prisma-review-field", selectedFieldPath === fieldPath ? "is-selected" : ""].join(" ")} onClick={() => onFieldSelect(fieldPath)}>
        <Typography.Text strong>{label}</Typography.Text>
        <div className="prisma-review-value-grid">
          <ValueSurface label="Extraído pelo Prisma" onSelect={() => onFieldSelect(fieldPath, "original")} value={workspace.extractedData[fieldPath].join(", ") || "Não identificado"} />
          <div className="prisma-reviewed-surface" onClick={(event) => { event.stopPropagation(); onFieldSelect(fieldPath, "reviewer"); }}><small>Revisado por você</small><Select disabled={!editable} mode="tags" onChange={(values) => onDraftChange({ ...draft, [fieldPath]: values })} open={false} tokenSeparators={[","]} value={draft[fieldPath]} /></div>
        </div>
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
          <Button disabled={!editable || !canStartSelection} icon={<PlusOutlined />} onClick={onCreateCustomSection} size="small" type="primary">Criar área personalizada</Button>
        </div>
        {TagField({ fieldPath: "certifications", label: "Certificações" })}
        {draft.customSections.map((section) => {
          const extractedSection = workspace.extractedData.customSections.find((candidate) => candidate.id === section.id);
          return (
            <section className="prisma-custom-profile-section" key={section.id}>
              <div className="prisma-review-section-title">
                <div>
                  <Typography.Text className="prisma-custom-profile-section__name" strong>{section.name}</Typography.Text>
                  <Typography.Text type="secondary">Área personalizada · {section.format === "list" ? "lista" : "texto"} · origem {section.source === "human" ? "humana" : "extraída"}</Typography.Text>
                </div>
              </div>
              {section.items.map((item, itemIndex) => {
                const fieldPath = `customSections.${section.id}.items.${item.id}.value`;
                const extractedItem = extractedSection?.items.find((candidate) => candidate.id === item.id);
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
                      value={item.value}
                    />
                  </div>
                );
              })}
            </section>
          );
        })}
        {!draft.customSections.length ? <Alert description="Quando um currículo trouxer uma seção própria, crie a área e selecione sua região no documento. Depois de aprovada, essa estrutura poderá ser reconhecida em novas importações da mesma organização." showIcon type="info" /> : null}
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

function SummaryEditor({ workspace, draft, editable, selectedFieldPath, onDraftChange, onFieldSelect }: CommonEditorProps) {
  return <ReviewField editable={editable} extracted={workspace.extractedData.summary ?? "Não identificado"} fieldPath="summary" label="Resumo profissional" multiline onChange={(value) => onDraftChange({ ...draft, summary: value || null })} onSelect={onFieldSelect} selected={selectedFieldPath === "summary"} value={draft.summary ?? ""} />;
}

function ReviewField({ label, fieldPath, extracted, value, editable, multiline = false, selected, onSelect, onChange }: {
  label: string;
  fieldPath: string;
  extracted: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  selected: boolean;
  onSelect: (fieldPath: string, preferredKind?: "original" | "reviewer") => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className={["prisma-review-field", selected ? "is-selected" : ""].join(" ")} onClick={() => onSelect(fieldPath)}>
      <Typography.Text strong>{label}</Typography.Text>
      <div className="prisma-review-value-grid">
        <ValueSurface label="Extraído pelo Prisma" onSelect={() => onSelect(fieldPath, "original")} value={extracted} />
        <div className={["prisma-reviewed-surface", multiline ? "prisma-reviewed-surface--multiline" : ""].filter(Boolean).join(" ")} onClick={(event) => { event.stopPropagation(); onSelect(fieldPath, "reviewer"); }}><small>Revisado por você</small>{multiline ? <Input.TextArea disabled={!editable} onFocus={() => onSelect(fieldPath, "reviewer")} onChange={(event) => onChange(event.target.value)} rows={4} value={value} /> : <Input disabled={!editable} onFocus={() => onSelect(fieldPath, "reviewer")} onChange={(event) => onChange(event.target.value)} value={value} />}</div>
      </div>
    </div>
  );
}

function ValueSurface({ label, value, onSelect }: { label: string; value: string; onSelect?: () => void }) {
  return <div className="prisma-extracted-surface" onClick={(event) => { event.stopPropagation(); onSelect?.(); }}><small>{label}</small><p>{value}</p></div>;
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
  if (fieldPath.startsWith("experiences.")) return "experience";
  if (fieldPath.startsWith("education.")) return "education";
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
