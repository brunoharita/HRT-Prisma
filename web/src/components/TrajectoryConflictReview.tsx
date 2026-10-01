import { useEffect, useState } from "react";
import { Alert, Button, Select, Space, Tag, Typography } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import type { TrajectoryActivity, TrajectoryReviewChoice } from "../../../src/domain/semanticTrajectory.js";
import type { VacancyCandidateMatch, VacancyDetail } from "../domain/vacancy.js";
import { vacancyService, type TrajectoryReviewView } from "../infrastructure/supabase/vacancyService.js";

const labels: Record<TrajectoryActivity, string> = {
  direct_function: "Atuação direta", equivalent_function: "Função equivalente", related_function: "Função relacionada",
  entry_potential: "Potencial de entrada", context: "Apenas contexto", other: "Outro domínio", unclear: "Não determinado",
  backend_execution: "Execução backend", software_execution: "Desenvolvimento de software",
  software_analysis: "Análise de sistemas", software_leadership: "Liderança técnica", software_context: "Contexto de software",
};

export function TrajectoryConflictReview({ vacancy, match, canReview, onResolved }: {
  vacancy: VacancyDetail; match: VacancyCandidateMatch; canReview: boolean; onResolved: () => void;
}) {
  const [view, setView] = useState<TrajectoryReviewView | null>(null);
  const [choices, setChoices] = useState<Record<string, TrajectoryReviewChoice["choice"]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUnresolved, setSavedUnresolved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  useEffect(() => {
    setView(null); setChoices({}); setError(null); setRefreshAttempted(false);
  }, [vacancy.versionId, match.candidate.profileId, match.candidate.profileVersion, match.score.inputFingerprint]);

  if (match.semanticFallback?.status !== "indeterminate" || match.semanticFallback.reasonCode !== "READINGS_DISAGREE") return null;

  async function open() {
    setLoading(true); setError(null); setSavedUnresolved(false); setChoices({});
    try { setView(await vacancyService.loadTrajectoryReview(vacancy, match)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível abrir a revisão."); }
    finally { setLoading(false); }
  }

  async function save() {
    if (view?.status !== "review_pending") return;
    setSaving(true); setError(null); setSavedUnresolved(false);
    try {
      const decisions = view.conflicts.map(item => ({ id: item.id, choice: choices[item.id]! }));
      const status = await vacancyService.saveTrajectoryReview(vacancy, match, view.analysisId, decisions);
      if (status === "resolved") onResolved();
      else setSavedUnresolved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A revisão não foi salva."); }
    finally { setSaving(false); }
  }

  async function refreshLegacyPair(analysisId: string) {
    setRefreshing(true); setError(null); setRefreshAttempted(true);
    try {
      const status = await vacancyService.refreshLegacyTrajectoryReview(vacancy, match, analysisId);
      if (status === "complete") { onResolved(); return; }
      setView(await vacancyService.loadTrajectoryReview(vacancy, match));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A nova checagem não foi concluída."); }
    finally { setRefreshing(false); }
  }

  return <>
    <section className="prisma-vacancy-action-group is-review" aria-label="Revisão das leituras de IA">
      <div className="prisma-vacancy-action-heading"><strong className="prisma-vacancy-action-title"><BulbOutlined aria-hidden="true" /> Revisão da IA</strong><Tag color="warning">Respostas diferentes; cálculo mantido</Tag></div>
      <Typography.Text type="secondary">As respostas da IA divergiram para esta Pessoa. O cálculo interno continua válido.</Typography.Text>
      {canReview ? <Button disabled={refreshing || saving} loading={loading} onClick={() => void open()}>{view ? "Atualizar divergências" : "Ver se há itens para revisão"}</Button>
        : <Alert showIcon type="info" title="Revisão humana restrita" description="Um responsável pela análise desta empresa poderá avaliar os trechos divergentes. O cálculo interno foi mantido." />}
    </section>
    {error || view || savedUnresolved ? <section className="prisma-trajectory-conflict-details" aria-label="Detalhes da revisão da IA">
      <Typography.Paragraph>As duas respostas da IA não são decisões sobre a Pessoa. O cálculo interno continua válido até uma revisão íntegra.</Typography.Paragraph>
      {error ? <Alert showIcon type="error" title={error} /> : null}
      {view?.status === "review_unavailable" ? <Alert showIcon type="warning" title={view.reasonCode === "PAIR_NOT_STORED" ? "Respostas antigas não registradas" : `${view.conflictCount} itens divergentes`}
        description={view.reasonCode === "TOO_MANY_CONFLICTS"
          ? "O limite de cinco itens para revisão nesta análise foi excedido. Nenhuma resposta da IA foi aplicada; grupo, pontos e evidências continuam os do cálculo interno."
          : "Esta discordância é de uma checagem anterior ao registro das duas respostas. Os itens antigos não podem ser recuperados. Se você pedir uma nova checagem, serão feitas duas leituras de IA somente para este Perfil; até lá, grupo, pontos e evidências continuam os do cálculo interno."} /> : null}
      {view?.status === "review_unavailable" && view.reasonCode === "PAIR_NOT_STORED" && (!refreshAttempted || refreshing)
        ? <Button loading={refreshing} onClick={() => void refreshLegacyPair(view.analysisId)}>Fazer nova checagem com IA para revisão</Button> : null}
      {view?.status === "review_pending" ? <>
        <Typography.Paragraph>{view.conflictCount} {view.conflictCount === 1 ? "item precisa" : "itens precisam"} de decisão. Escolha a classificação sustentada pelo trecho ou indique que não é possível determinar.</Typography.Paragraph>
        {view.conflicts.map((conflict, index) => <div className="prisma-trajectory-conflict-item" key={conflict.id}>
          <Typography.Text strong>{index + 1}. {conflict.kind === "experience" ? "Experiência profissional" : conflict.kind === "education" ? "Formação" : "Declaração do Perfil"}</Typography.Text>
          <details><summary>Ver trecho publicado</summary><Typography.Paragraph>{conflict.text}</Typography.Paragraph></details>
          <Typography.Paragraph>Primeira leitura: <strong>{labels[conflict.first.activity]}</strong>. Evidência: “{conflict.first.quote || "não indicada"}”.</Typography.Paragraph>
          <Typography.Paragraph>Segunda leitura: <strong>{labels[conflict.second.activity]}</strong>. Evidência: “{conflict.second.quote || "não indicada"}”.</Typography.Paragraph>
          <Space wrap><label htmlFor={`trajectory-choice-${conflict.id}`}>Sua decisão</label><Select
            id={`trajectory-choice-${conflict.id}`} style={{ minWidth: 230 }} value={choices[conflict.id] ?? null}
            onChange={(choice: TrajectoryReviewChoice["choice"]) => setChoices(current => ({ ...current, [conflict.id]: choice }))}
            placeholder="Escolha uma opção" options={[
              { value: "first", label: labels[conflict.first.activity] },
              { value: "second", label: labels[conflict.second.activity] },
              { value: "cannot_determine", label: "Não é possível determinar" },
            ]} /></Space>
        </div>)}
        <Typography.Paragraph type="secondary">A revisão vale somente para este Perfil e esta versão da Posição. Se algum item não puder ser determinado, o cálculo interno permanece; nenhuma regra é criada na Knowledge.</Typography.Paragraph>
        <Button type="primary" loading={saving} disabled={view.conflicts.some(item => !choices[item.id])} onClick={() => void save()}>Salvar revisão e recalcular</Button>
        {savedUnresolved ? <Alert showIcon type="info" title="Revisão registrada sem conclusão" description="Pelo menos um item não pôde ser determinado. O Prisma manteve o cálculo interno; você pode voltar a revisar os itens depois." /> : null}
      </> : null}
    </section> : null}
  </>;
}
