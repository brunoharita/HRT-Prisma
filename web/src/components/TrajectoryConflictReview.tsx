import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Radio, Skeleton, Tag, Typography } from "antd";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<TrajectoryReviewView | null>(null);
  const [choices, setChoices] = useState<Record<string, TrajectoryReviewChoice["choice"]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUnresolved, setSavedUnresolved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const loadEpoch = useRef(0);

  useEffect(() => {
    loadEpoch.current += 1;
    setModalOpen(false); setView(null); setChoices({}); setError(null); setRefreshAttempted(false);
  }, [canReview, vacancy.versionId, match.candidate.profileId, match.candidate.profileVersion, match.score.inputFingerprint]);

  if (match.semanticFallback?.status !== "indeterminate" || match.semanticFallback.reasonCode !== "READINGS_DISAGREE") return null;

  async function open() {
    const epoch = ++loadEpoch.current;
    setModalOpen(true); setLoading(true); setError(null); setSavedUnresolved(false); setChoices({}); setView(null);
    try {
      const result = await vacancyService.loadTrajectoryReview(vacancy, match);
      if (loadEpoch.current === epoch) setView(result);
    } catch (caught) {
      if (loadEpoch.current === epoch) setError(caught instanceof Error ? caught.message : "Não foi possível abrir a revisão.");
    } finally { if (loadEpoch.current === epoch) setLoading(false); }
  }

  function close() {
    if (saving || refreshing) return;
    loadEpoch.current += 1;
    setLoading(false);
    setModalOpen(false);
  }

  async function save() {
    if (view?.status !== "review_pending") return;
    setSaving(true); setError(null); setSavedUnresolved(false);
    try {
      const decisions = view.conflicts.map(item => ({ id: item.id, choice: choices[item.id]! }));
      const status = await vacancyService.saveTrajectoryReview(vacancy, match, view.analysisId, decisions);
      if (status === "resolved") { setModalOpen(false); onResolved(); }
      else setSavedUnresolved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A revisão não foi salva."); }
    finally { setSaving(false); }
  }

  async function refreshLegacyPair(analysisId: string) {
    setRefreshing(true); setError(null); setRefreshAttempted(true);
    try {
      const status = await vacancyService.refreshLegacyTrajectoryReview(vacancy, match, analysisId);
      if (status === "complete") { setModalOpen(false); onResolved(); return; }
      setView(await vacancyService.loadTrajectoryReview(vacancy, match));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A nova checagem não foi concluída."); }
    finally { setRefreshing(false); }
  }

  const pending = view?.status === "review_pending";
  const decided = pending ? view.conflicts.filter(item => choices[item.id]).length : 0;

  return <>
    <section className="prisma-vacancy-action-group is-review" aria-label="Revisão das leituras de IA">
      <div className="prisma-vacancy-action-heading"><strong className="prisma-vacancy-action-title"><BulbOutlined aria-hidden="true" /> Revisão da IA</strong><Tag color="warning">Respostas diferentes; cálculo mantido</Tag></div>
      <Typography.Text type="secondary">As respostas da IA divergiram para esta Pessoa. O cálculo interno continua válido.</Typography.Text>
      {canReview ? <Button disabled={refreshing || saving} loading={loading} onClick={() => void open()}>Revisar divergências</Button>
        : <Alert showIcon type="info" title="Revisão humana restrita" description="Um responsável pela análise desta empresa poderá avaliar os trechos divergentes. O cálculo interno foi mantido." />}
    </section>
    {canReview ? <Modal className="prisma-trajectory-review-modal" open={modalOpen} width={860} destroyOnHidden
      title={<span>Revisar divergências <Typography.Text type="secondary">· {match.candidate.fullName}</Typography.Text></span>}
      onCancel={close} closable={!saving && !refreshing} maskClosable={false}
      footer={<div className="prisma-trajectory-review-footer">
        <Typography.Text type="secondary">{pending ? `${decided} de ${view.conflictCount} itens classificados` : "O cálculo interno permanece válido até a conclusão."}</Typography.Text>
        <div><Button disabled={saving || refreshing} onClick={close}>Fechar</Button>
          {pending ? <Button type="primary" loading={saving} disabled={decided !== view.conflictCount}
            onClick={() => void save()}>Salvar revisão</Button> : null}</div>
      </div>}>
      <div className="prisma-trajectory-review-content">
        <Typography.Paragraph>Compare as duas leituras de cada trecho profissional. Elas não são decisões sobre a Pessoa; nenhuma será aplicada sem uma revisão íntegra.</Typography.Paragraph>
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
        {error ? <Alert showIcon type="error" title={error} /> : null}
        {view?.status === "review_unavailable" ? <Alert showIcon type="warning"
          title={view.reasonCode === "PAIR_NOT_STORED" ? "Respostas anteriores indisponíveis" : `${view.conflictCount} itens divergentes`}
          description={view.reasonCode === "TOO_MANY_CONFLICTS"
            ? "Há mais de cinco itens divergentes nesta análise. Não há revisão item a item; grupo, pontos e evidências continuam os do cálculo interno."
            : "Esta checagem ocorreu antes do registro das duas leituras. Não é possível recuperar as respostas antigas. Uma nova checagem fará duas leituras de IA somente para este Perfil; até lá, grupo, pontos e evidências continuam os do cálculo interno."} /> : null}
        {view?.status === "review_unavailable" && view.reasonCode === "PAIR_NOT_STORED" && (!refreshAttempted || refreshing)
          ? <Button loading={refreshing} onClick={() => void refreshLegacyPair(view.analysisId)}>Fazer nova checagem com IA para revisão</Button> : null}
        {pending ? <>
          <Typography.Paragraph>{view.conflictCount} {view.conflictCount === 1 ? "item precisa" : "itens precisam"} de decisão. Escolha uma das classificações sustentadas ou indique que não é possível determinar.</Typography.Paragraph>
          {view.conflicts.map((conflict, index) => <section className="prisma-trajectory-conflict-item" key={conflict.id} aria-label={`Item ${index + 1} para revisão`}>
            <div className="prisma-trajectory-conflict-item-heading"><strong>{index + 1}. {conflict.kind === "experience" ? "Experiência profissional" : conflict.kind === "education" ? "Formação" : "Declaração do Perfil"}</strong><Tag color="warning">Leituras diferentes</Tag></div>
            <Typography.Text strong>Pergunta da revisão</Typography.Text>
            <Typography.Paragraph>O que este trecho demonstra em relação à Posição “{vacancy.title}”?</Typography.Paragraph>
            <Typography.Text strong>Trecho publicado</Typography.Text>
            <blockquote>{conflict.text}</blockquote>
            <div className="prisma-trajectory-reading-pair">
              <div><Typography.Text type="secondary">Leitura 1</Typography.Text><strong>{labels[conflict.first.activity]}</strong><Typography.Text>Evidência: “{conflict.first.quote || "não indicada"}”</Typography.Text></div>
              <div><Typography.Text type="secondary">Leitura 2</Typography.Text><strong>{labels[conflict.second.activity]}</strong><Typography.Text>Evidência: “{conflict.second.quote || "não indicada"}”</Typography.Text></div>
            </div>
            <div className="prisma-trajectory-human-choice"><Typography.Text strong>Sua classificação para este trecho</Typography.Text>
              <Radio.Group aria-label={`Classificação humana do item ${index + 1}`} value={choices[conflict.id]}
                onChange={(event) => setChoices(current => ({ ...current, [conflict.id]: event.target.value as TrajectoryReviewChoice["choice"] }))}>
                <Radio value="first">{labels[conflict.first.activity]}</Radio>
                <Radio value="second">{labels[conflict.second.activity]}</Radio>
                <Radio value="cannot_determine">Não é possível determinar</Radio>
              </Radio.Group>
            </div>
          </section>)}
          <Typography.Paragraph type="secondary">Esta revisão vale somente para este Perfil e esta versão da Posição. Se algum item não puder ser determinado, o cálculo interno permanece; nenhuma regra é criada na Knowledge.</Typography.Paragraph>
          {savedUnresolved ? <Alert showIcon type="info" title="Revisão registrada sem conclusão" description="Pelo menos um item não pôde ser determinado. O Prisma manteve o cálculo interno; você pode voltar a revisar os itens depois." /> : null}
        </> : null}
      </div>
    </Modal> : null}
  </>;
}
