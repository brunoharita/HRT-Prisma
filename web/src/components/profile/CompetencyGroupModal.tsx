import { useLoadingFeedback, useLoadingTask } from "../../ui/PrismaLoadingFeedback";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Select, Space } from "antd";
import type { ProfessionalConceptEvidenceView, ProfessionalEvidenceProjection } from "../../domain/personProfessionalEvidence";
import type { CompetencyCurationAdapter, CompetencySubgroupOption } from "../../domain/profileCompetencyCuration";
import { focusNoticeTarget } from "../../ui/noticeActions";

export function CompetencyGroupModal({ concept, adapter, onClose, onProjection }: {
  concept: ProfessionalConceptEvidenceView | null; adapter: CompetencyCurationAdapter | undefined;
  onClose: () => void; onProjection: (value: ProfessionalEvidenceProjection) => void;
}) {
  const [options, setOptions] = useState<CompetencySubgroupOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const refreshActivity = useLoadingTask("Atualizando classificação de competências…", Boolean(concept));
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useLoadingFeedback({ "Carregando grupo de competência…": Boolean(concept) && loading, "Processando grupo de competência…": Boolean(concept) && busy });
  const lock = useRef(false);
  const canClassify = Boolean(adapter && (concept?.scope === "organization" || adapter.canUseGlobal));
  useEffect(() => { setSelected(null); setOptions([]); setError(null); }, [concept?.id]);
  useEffect(() => {
    if (!concept || !adapter || !canClassify) return;
    let current = true; setLoading(true);
    void adapter.loadSubgroups().then((items) => {
      if (current) setOptions(items.filter((item) => concept.scope === "organization" || item.scope === "global"));
    }).catch(() => { if (current) setError("Os grupos não puderam ser consultados. Atualize as opções para escolher um grupo disponível."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [concept?.id, adapter, canClassify, attempt]);
  async function save() {
    if (!concept || !adapter || !selected || lock.current || !canClassify || !options.some((item) => item.id === selected)) return;
    lock.current = true; setBusy(true); setError(null);
    try { const projection = await adapter.classify({ conceptId: concept.id, subgroupId: selected }); onProjection(projection); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível confirmar o grupo. Sua escolha foi preservada."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title={concept ? `Definir grupo de ${concept.label}` : "Definir grupo"} open={Boolean(concept)} onCancel={() => { if (!lock.current) onClose(); }} maskClosable={!busy} closable={!busy} width={600}
    footer={<Space><Button disabled={busy} onClick={onClose}>{canClassify ? "Cancelar" : "Voltar às competências"}</Button>{canClassify ? <Button type="primary" loading={busy} disabled={loading || !selected || !options.some((item) => item.id === selected)} onClick={() => void save()}>Salvar grupo</Button> : null}</Space>}>
    <p>As evidências já vinculadas serão preservadas. Falta definir o grupo que organiza esta competência.</p>
    {canClassify ? <><p>{concept?.scope === "global" ? "Esta alteração vale para a base global e pode aparecer em outras empresas." : "Esta alteração vale para a Knowledge da empresa e pode aparecer em outros perfis dela."}</p>
      {error ? <Alert showIcon type="error" title={error} action={<Space wrap><Button disabled={busy} onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Atualizar opções</Button><Button disabled={busy} onClick={() => { void refreshActivity.run(() => adapter!.refresh()).then((value) => { onProjection(value); onClose(); }).catch(() => setError("A lista não respondeu. Seus vínculos e sua escolha foram preservados. Tente consultar novamente.")); }}>Consultar lista</Button></Space>} /> : null}
      <label htmlFor="prisma-competency-group">Grupo da competência</label>
      <Select id="prisma-competency-group" aria-label="Grupo da competência" style={{ width: "100%" }} value={selected} loading={loading} disabled={busy || loading} showSearch optionFilterProp="label" placeholder="Escolha o grupo" onChange={setSelected}
        options={(["hard", "soft"] as const).map((macro) => ({ label: macro === "hard" ? "Hard Skills" : "Soft Skills", options: options.filter((item) => item.macroGroupCode === macro).map((item) => ({ value: item.id, label: `${item.label}${item.scope === "organization" ? " (empresa)" : ""}` })) }))} />
      {selected ? <p>{options.find((item) => item.id === selected)?.definition}</p> : <Alert type="info" showIcon title="Escolha o grupo que melhor representa o significado da competência." action={<Button disabled={busy || loading} onClick={() => focusNoticeTarget('#prisma-competency-group')}>Escolher grupo</Button>} />}
    </> : <Alert type="info" showIcon title={concept?.scope === "global" ? "O grupo deste conceito global só pode ser definido por um administrador da base global." : "O grupo desta competência só pode ser definido por um administrador autorizado da empresa."} description="Seu acesso permite consultar a competência e suas evidências. Peça a esse responsável que use Definir grupo nesta mesma tela." />}
  </Modal>;
}
