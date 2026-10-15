import { useEffect, useState } from "react";
import { Alert, Button, Select, Space, Tag, Typography } from "antd";
import type { StructuredDraft } from "../../domain/personIngestion";
import { professionalAreaService, type ProfessionalArea } from "../../infrastructure/supabase/professionalAreaService";
import type { DirectoryConcept } from "../../domain/peopleDirectory";

export function ProfessionalAreaField({ organizationId, reviewId, draft, editable, onChange }: {
  organizationId: string; reviewId: string; draft: StructuredDraft; editable: boolean; onChange: (draft: StructuredDraft) => void;
}) {
  const [options, setOptions] = useState<ProfessionalArea[]>([]);
  const [suggestion, setSuggestion] = useState<DirectoryConcept[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try { const data = await professionalAreaService.load(organizationId, reviewId); setOptions(data.options); setSuggestion(data.suggestion); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Áreas indisponíveis."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    // Read-only refresh lets asynchronous import classification appear without
    // saving a draft or invoking a provider from the browser.
    const interval = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => clearInterval(interval);
  }, [organizationId, reviewId]);
  const human = draft.professionalAreaIds !== undefined;
  const ids = draft.professionalAreaIds ?? suggestion.map(a => a.id);
  return <div className="prisma-professional-area-field" style={{ marginBlock: 16 }}>
    <Space wrap><Typography.Text strong>Área profissional padronizada</Typography.Text>{human ? <Tag color="green">Escolha do gestor</Tag> : suggestion.length ? <Tag color="blue">{suggestion.some(a => a.method === "ai_grouping") ? "Agrupamento por IA" : "Termo reconhecido no Knowledge"}</Tag> : null}</Space>
    <Typography.Paragraph type="secondary">Selecione na base global ou da empresa. Os termos originais do currículo permanecem no campo abaixo.</Typography.Paragraph>
    {error ? <Alert type="warning" showIcon title="Catálogo de áreas indisponível" description={error} action={<Button onClick={() => void load()}>Tentar novamente</Button>} /> : null}
    <Select mode="multiple" aria-label="Área profissional padronizada" style={{width:"100%"}} placeholder="Selecionar áreas profissionais" allowClear loading={loading} disabled={!editable || Boolean(error)} showSearch optionFilterProp="searchLabel"
      value={ids} maxCount={10} options={options.filter(a => a.active || ids.includes(a.id)).map(a => ({ value:a.id, label:`${a.label}${!a.active ? " (inativa)" : ""}${a.scope === "organization" ? " · Empresa" : ""}`, searchLabel:`${a.label} ${a.aliases.join(" ")}`, disabled:!a.active && !ids.includes(a.id) }))}
      onChange={(selected: string[]) => onChange({ ...draft, professionalAreaIds: selected, professionalAreaLabels: selected.map(id => options.find(a => a.id === id)?.label ?? id) })} />
    {human && !ids.length ? <Typography.Text type="secondary">Sem área selecionada pelo gestor. Sugestões não substituirão esta escolha.</Typography.Text> : null}
    <div><Button type="link" size="small" href="/knowledge?tab=professional-areas" target="_blank" rel="noopener noreferrer">Consultar ou cadastrar áreas no Conhecimento</Button></div>
  </div>;
}
