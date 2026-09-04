import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, HistoryOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Modal, Skeleton, Space, Tag, Timeline, Typography } from "antd";
import { StructuredProfileView } from "../components/profile/StructuredProfileView";
import type { ProfileVersionView } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileVersionsPageProps { activeMembership: OrganizationMembership; personId: string; onNavigate: (path: string) => void; }

export function ProfileVersionsPage({ activeMembership, personId, onNavigate }: ProfileVersionsPageProps) {
  const [versions, setVersions] = useState<ProfileVersionView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(preferredId?: string) {
    const result = await personIngestionService.listProfileVersions(activeMembership.organizationId, personId);
    setVersions(result);
    setSelectedId(preferredId && result.some((item) => item.id === preferredId) ? preferredId : result[0]?.id ?? null);
  }
  useEffect(() => {
    let current = true;
    setLoading(true);
    void personIngestionService.listProfileVersions(activeMembership.organizationId, personId)
      .then((result) => { if (current) { setVersions(result); setSelectedId(result[0]?.id ?? null); setCompareId(result[1]?.id ?? null); } })
      .catch((caught: unknown) => { if (current) setError(messageOf(caught)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, personId]);

  const selected = versions.find((item) => item.id === selectedId) ?? null;
  const compared = versions.find((item) => item.id === compareId) ?? null;
  const current = versions.find((item) => !item.supersededAt) ?? null;
  const timelineItems = useMemo(() => versions.map((version) => ({
    color: version.supersededAt ? "#b8c1cc" : "#6d4aff",
    children: <button className={`prisma-version-list-item${selectedId === version.id ? " is-selected" : ""}`} onClick={() => setSelectedId(version.id)} type="button"><span><strong>v{version.profileVersion}</strong>{!version.supersededAt ? <Tag color="purple">Vigente</Tag> : null}</span><small>{originLabel(version.origin)}</small><time>{formatDate(version.approvedAt ?? version.createdAt)}</time></button>,
  })), [selectedId, versions]);

  async function createReview(version: ProfileVersionView) {
    setBusy(true); setError(null);
    try {
      const reviewId = await personIngestionService.startProfileVersionReview(activeMembership.organizationId, personId, version.id);
      onNavigate(`/profiles/${personId}/reviews/${reviewId}`);
    } catch (caught) { setError(messageOf(caught)); setBusy(false); }
  }

  function confirmRestore(version: ProfileVersionView) {
    Modal.confirm({
      title: `Restaurar o conteúdo da versão v${version.profileVersion}?`,
      content: <div><p>O Prisma criará uma nova versão vigente com exatamente este conteúdo.</p><p>Nenhuma versão anterior será apagada ou alterada e nenhum documento será reprocessado.</p></div>,
      okText: "Restaurar como nova versão", cancelText: "Cancelar", icon: <HistoryOutlined />,
      onOk: async () => {
        setBusy(true); setError(null);
        try {
          const result = await personIngestionService.restoreProfileVersion(activeMembership.organizationId, personId, version.id);
          setNotice(`Versão v${version.profileVersion} restaurada como v${result.profileVersion}. Todo o histórico foi preservado.`);
          await refresh(result.profileId);
        } catch (caught) { setError(messageOf(caught)); } finally { setBusy(false); }
      },
    });
  }

  function confirmReset() {
    Modal.confirm({
      title: "Reiniciar Perfil publicado?",
      content: <div><p>A Central ficará sem um Perfil atual até que uma nova revisão seja publicada.</p><p>Todas as versões, documentos, extrações e evidências continuarão disponíveis para consulta ou reutilização.</p></div>,
      okText: "Reiniciar Perfil", okButtonProps: { danger: true }, cancelText: "Cancelar", icon: <DeleteOutlined />,
      onOk: async () => {
        setBusy(true); setError(null);
        try {
          await personIngestionService.resetProfile(activeMembership.organizationId, personId);
          setNotice("Perfil reiniciado. As versões e os documentos continuam disponíveis para criar uma nova revisão.");
          await refresh();
        } catch (caught) { setError(messageOf(caught)); } finally { setBusy(false); }
      },
    });
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 12 }} /></PrismaPage>;
  return <PrismaPage className="prisma-m53-page prisma-version-history-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}`)} type="text">Voltar para a Central da Pessoa</Button>
    <PrismaPageHeader title="Versões do Perfil" description="Consulte o conteúdo completo, compare versões ou recupere qualquer momento do histórico." actions={<Space wrap>{current ? <Button icon={<EditOutlined />} loading={busy} onClick={() => void createReview(current)} type="primary">Criar nova revisão</Button> : null}{current ? <Button danger icon={<DeleteOutlined />} loading={busy} onClick={confirmReset}>Reiniciar Perfil</Button> : null}</Space>} />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {notice ? <Alert closable onClose={() => setNotice(null)} showIcon title={notice} type="success" /> : null}
    {!versions.length ? <PrismaCard><Empty description="Ainda não existe uma versão publicada para esta Pessoa." /></PrismaCard> : <div className="prisma-version-history-layout">
      <PrismaCard className="prisma-version-timeline-card" title="Histórico completo"><Timeline items={timelineItems} /></PrismaCard>
      <PrismaCard className="prisma-version-preview-card" title={selected ? `Visualização da versão v${selected.profileVersion}` : "Visualização"} extra={selected ? <Tag color={selected.supersededAt ? "default" : "purple"}>{selected.supersededAt ? "Histórica" : "Vigente"}</Tag> : null}>
        {selected ? <>
          <div className="prisma-version-metadata"><span><strong>Publicada em</strong>{formatDate(selected.approvedAt ?? selected.createdAt)}</span><span><strong>Origem</strong>{originLabel(selected.origin)}</span><span><strong>Fonte</strong>{selected.sourceDocumentName ?? (selected.sourceDocumentId ? "Documento associado" : "Fonte documental não disponível")}</span>{selected.restoredFromProfileId ? <span><strong>Relação</strong>Restaurada de uma versão anterior</span> : null}</div>
          {!selected.sourceDocumentId && selected.sourceDocumentName ? <Alert showIcon title="O documento original foi excluído, mas este Perfil continua completo e restaurável." type="info" /> : null}
          <StructuredProfileView profile={selected.profileData} />
          <div className="prisma-version-actions"><Button icon={<SwapOutlined />} onClick={() => { setCompareId(current?.id === selected.id ? versions.find((item) => item.id !== selected.id)?.id ?? null : current?.id ?? null); setCompareOpen(true); }}>Comparar</Button><Button icon={<EditOutlined />} loading={busy} onClick={() => void createReview(selected)}>Usar como base para nova revisão</Button>{selected.supersededAt ? <Button icon={<HistoryOutlined />} loading={busy} onClick={() => confirmRestore(selected)} type="primary">Restaurar versão</Button> : null}</div>
        </> : <Empty description="Selecione uma versão." />}
      </PrismaCard>
    </div>}
    <Drawer className="prisma-version-compare-drawer" open={compareOpen} onClose={() => setCompareOpen(false)} title="Comparar versões" width="min(1120px, 96vw)">
      {selected && compared ? <div className="prisma-version-compare"><VersionColumn version={selected} /><VersionColumn version={compared} /></div> : <Empty description="Escolha duas versões diferentes para comparar." />}
      {selected ? <div className="prisma-version-compare-picker"><Typography.Text>Comparar a versão v{selected.profileVersion} com:</Typography.Text><Space wrap>{versions.filter((item) => item.id !== selected.id).map((item) => <Button key={item.id} onClick={() => setCompareId(item.id)} type={compareId === item.id ? "primary" : "default"}>v{item.profileVersion}</Button>)}</Space></div> : null}
    </Drawer>
  </PrismaPage>;
}

function VersionColumn({ version }: { version: ProfileVersionView }) { return <section><header><EyeOutlined /><strong>Versão v{version.profileVersion}</strong><Tag>{originLabel(version.origin)}</Tag></header><StructuredProfileView compact profile={version.profileData} /></section>; }
function originLabel(origin: ProfileVersionView["origin"]): string { return ({ legacy: "Versão histórica", review_merge: "Atualização do Perfil", review_replace: "Substituição do Perfil", restored: "Versão restaurada", document_deletion_rebuild: "Perfil recomposto", merged_person_profile: "Perfil preservado em mesclagem" })[origin ?? "legacy"]; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function messageOf(value: unknown): string { return value instanceof Error ? value.message : "Não foi possível concluir esta ação."; }
