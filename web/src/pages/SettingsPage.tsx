import { useEffect, useState } from "react";
import { Alert, Button, Empty, Tabs, Tag, Typography } from "antd";
import { DatabaseOutlined, SettingOutlined } from "@ant-design/icons";
import type { CompetencySubgroupOption } from "../domain/profileCompetencyCuration";
import { knowledgeService } from "../infrastructure/supabase/knowledgeService";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

type MacroGroup = { code: "hard" | "soft"; label: string; definition: string; sortOrder: number };

export function SettingsPage({ organizationId }: { organizationId: string | null }) {
  const [macroGroups, setMacroGroups] = useState<MacroGroup[]>([]);
  const [subgroups, setSubgroups] = useState<CompetencySubgroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    void Promise.all([
      knowledgeService.listCompetencyMacroGroups(), knowledgeService.listCompetencySubgroups(organizationId),
    ]).then(([macros, subgroupRows]) => { if (active) { setMacroGroups(macros); setSubgroups(subgroupRows); } })
      .catch(() => { if (active) setError("Não foi possível consultar a estrutura de competências."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, retry]);

  return <PrismaPage className="prisma-m81-settings">
    <PrismaPageHeader title="Configurações" description="Gerencie taxonomias e parâmetros do sistema." />
    <Tabs defaultActiveKey="competencies" items={[
      { key: "general", label: "Geral", children: <Empty description="Configurações gerais ainda não estão disponíveis nesta área." /> },
      { key: "competencies", label: "Competências", children: <>
        <PrismaCard title="Estrutura de Competências" extra={<Button disabled icon={<SettingOutlined />} title="Cadastro e edição de subagrupadores serão disponibilizados em movimento futuro.">Editar estrutura</Button>}>
          <Typography.Paragraph type="secondary">Definição global dos macrogrupos e subagrupadores utilizados no Prisma. Subagrupadores próprios de uma organização são visíveis somente dentro dela.</Typography.Paragraph>
          {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>} /> : null}
          {loading ? <Typography.Text type="secondary">Carregando estrutura...</Typography.Text> : null}
          {!loading && !error && !macroGroups.length ? <Empty description="Estrutura de competências indisponível." /> : null}
          {!loading && !error ? <div className="prisma-m81-settings-grid">{macroGroups.map((macro) => <section className={`prisma-m81-settings-group is-${macro.code}`} key={macro.code} aria-label={macro.label}>
            <header><DatabaseOutlined /><h2>{macro.label}</h2></header>
            <ul>{subgroups.filter((item) => item.macroGroupCode === macro.code).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((item) => <li key={item.id}>
              <details><summary><strong>{item.label}</strong>{item.scope === "organization" ? <Tag>Empresa</Tag> : null}</summary>
                <p>{item.definition}</p>
                {item.classificationQuestion ? <p><b>Pergunta de classificação:</b> {item.classificationQuestion}</p> : null}
                {item.examples?.length ? <p><b>Exemplos:</b> {item.examples.join(", ")}</p> : null}
              </details>
            </li>)}</ul>
          </section>)}</div> : null}
        </PrismaCard>
      </> },
      { key: "import", label: "Importação", children: <Empty description="Parâmetros de importação não estão disponíveis nesta área." /> },
      { key: "security", label: "Segurança", children: <Empty description="Parâmetros de segurança não estão disponíveis nesta área." /> },
      { key: "organization", label: "Organização", children: <Empty description="Parâmetros da organização não estão disponíveis nesta área." /> },
    ]} />
  </PrismaPage>;
}
