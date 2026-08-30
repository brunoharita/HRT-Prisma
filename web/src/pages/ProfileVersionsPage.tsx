import { useEffect, useState } from "react";
import { ArrowLeftOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Select, Skeleton, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ProfileVersionView, StructuredDraft } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface ProfileVersionsPageProps { activeMembership: OrganizationMembership; personId: string; onNavigate: (path: string) => void; }
interface DifferenceRow { key: keyof StructuredDraft; field: string; left: string; right: string; changed: boolean; }

export function ProfileVersionsPage({ activeMembership, personId, onNavigate }: ProfileVersionsPageProps) {
  const [versions, setVersions] = useState<ProfileVersionView[]>([]);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void personIngestionService.listProfileVersions(activeMembership.organizationId, personId)
      .then((result) => { if (!current) return; setVersions(result); setRightId(result[0]?.id ?? null); setLeftId(result[1]?.id ?? result[0]?.id ?? null); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar as versões."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, personId]);

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 12 }} /></PrismaPage>;
  const left = versions.find((version) => version.id === leftId) ?? null;
  const right = versions.find((version) => version.id === rightId) ?? null;
  const options = versions.map((version) => ({ value: version.id, label: `Perfil v${version.profileVersion}${version.supersededAt ? "" : " · atual"}` }));
  const rows = left && right ? buildDifferences(left.profileData, right.profileData).filter((row) => !differencesOnly || row.changed) : [];
  const columns: ColumnsType<DifferenceRow> = [
    { title: "Campo", dataIndex: "field", width: 180 },
    { title: left ? `Versão ${left.profileVersion}` : "Versão anterior", dataIndex: "left", render: renderValue },
    { title: right ? `Versão ${right.profileVersion}` : "Versão atual", dataIndex: "right", render: renderValue },
    { title: "Diferença", dataIndex: "changed", width: 120, render: (changed: boolean) => <Tag color={changed ? "gold" : "default"}>{changed ? "Alterado" : "Igual"}</Tag> },
  ];

  return (
    <PrismaPage className="prisma-m2c-page prisma-version-page">
      <PrismaPageHeader title="Comparar versões do Perfil Prisma" description="Compare versões aprovadas sem apagar fatos, evidências ou decisões anteriores." actions={<Button onClick={() => setDifferencesOnly((value) => !value)}>{differencesOnly ? "Mostrar todos os campos" : "Mostrar apenas diferenças"}</Button>} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}`)} type="text">Voltar para a Pessoa</Button>
      {error ? <Alert title={error} showIcon type="error" /> : null}
      {versions.length === 0 ? <PrismaCard><Empty description="Nenhuma versão de perfil foi aprovada para esta Pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard> : (
        <>
          <PrismaCard className="prisma-version-selectors">
            <div><Typography.Text strong>Versão de referência</Typography.Text><Select onChange={setLeftId} options={options} value={leftId} /></div>
            <SwapOutlined />
            <div><Typography.Text strong>Versão comparada</Typography.Text><Select onChange={setRightId} options={options} value={rightId} /></div>
          </PrismaCard>
          <PrismaCard>
            <Tabs items={[
              { key: "data", label: "Dados estruturados", children: <Table columns={columns} dataSource={rows} pagination={false} rowKey="key" scroll={{ x: 900 }} /> },
              { key: "provenance", label: "Proveniência", children: <div className="prisma-version-provenance"><VersionProvenance version={left} /><VersionProvenance version={right} /></div> },
            ]} />
          </PrismaCard>
        </>
      )}
    </PrismaPage>
  );
}

function buildDifferences(left: StructuredDraft, right: StructuredDraft): DifferenceRow[] {
  const fields: Array<[keyof StructuredDraft, string]> = [["professionalTitle", "Cargo ou título profissional"], ["areasOfExpertise", "Áreas de atuação"], ["professionalObjective", "Objetivo profissional"], ["summary", "Resumo profissional"], ["keyResults", "Principais resultados"], ["experiences", "Experiências"], ["education", "Formação"], ["competencies", "Competências"], ["languages", "Idiomas"], ["certifications", "Certificações"], ["customSections", "Áreas personalizadas"], ["uncertainties", "Pendências de interpretação"], ["notIdentified", "Informações não localizadas"]];
  return fields.map(([key, field]) => {
    const leftValue = formatValue(left[key]); const rightValue = formatValue(right[key]);
    return { key, field, left: leftValue, right: rightValue, changed: leftValue !== rightValue };
  });
}
function VersionProvenance({ version }: { version: ProfileVersionView | null }) { return version ? <div><Tag color={version.supersededAt ? "default" : "green"}>v{version.profileVersion}{version.supersededAt ? "" : " · atual"}</Tag><p>Status: {version.reviewStatus}</p><p>Documento: {version.sourceDocumentId}</p><p>Tentativa: {version.processingAttemptId ?? "legada"}</p><p>Aprovado em: {version.approvedAt ? formatDate(version.approvedAt) : "sem aprovação M2-C"}</p><p>Ator: {version.approvedByAuthUserId ?? "não registrado na versão legada"}</p></div> : <Empty description="Selecione uma versão." image={Empty.PRESENTED_IMAGE_SIMPLE} />; }
function formatValue(value: StructuredDraft[keyof StructuredDraft]): string {
  if (value === null) return "Não identificado";
  if (typeof value === "string") return value || "Não identificado";
  if (!Array.isArray(value)) return Object.values(value).filter((item): item is string => typeof item === "string" && Boolean(item)).join(" · ") || "Não identificado";
  if (!value.length) return "Não identificado";
  return value.map((item) => {
    if (typeof item === "string") return item;
    if ("role" in item) return `${item.role} · ${item.organization}${item.period ? ` · ${item.period}` : ""}`;
    if ("items" in item) return `${item.name}: ${item.items.map((entry) => entry.value).join("; ")}`;
    if ("course" in item) return `${item.course} · ${item.institution}`;
    return item.value;
  }).join("\n");
}
function renderValue(value: string) { return <pre className="prisma-version-value">{value}</pre>; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
