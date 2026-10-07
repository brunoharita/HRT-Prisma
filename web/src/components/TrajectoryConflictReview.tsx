import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { focusNoticeTarget } from "../ui/noticeActions";
import { useEffect, useId, useRef, useState } from "react";
import { Alert, Button, Modal, Popover, Radio, Skeleton, Tag, Typography } from "antd";
import { BulbOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { TrajectoryActivity, TrajectoryReviewChoice } from "../../../src/domain/semanticTrajectory.js";
import type { VacancyCandidateMatch, VacancyDetail } from "../domain/vacancy.js";
import { vacancyService, type TrajectoryReviewView } from "../infrastructure/supabase/vacancyService.js";

const labels: Record<TrajectoryActivity, string> = {
  direct_function: "Atuação direta", equivalent_function: "Função equivalente", related_function: "Função relacionada",
  entry_potential: "Potencial de entrada", context: "Apenas contexto", other: "Outro domínio", unclear: "Não determinado",
  backend_execution: "Execução backend", software_execution: "Desenvolvimento de software",
  software_analysis: "Análise de sistemas", software_leadership: "Liderança técnica", software_context: "Contexto de software",
};

type ChoiceHelp = { meaning: string; impact: string };
const activityHelp: Record<TrajectoryActivity, ChoiceHelp> = {
  direct_function: { meaning: "Atuação que atende diretamente ao núcleo do trabalho pedido pela Posição.",
    impact: "Quando sustentada por experiência publicada, pode contribuir como atuação direta no matching. O cargo não comprova automaticamente todas as tarefas, ferramentas ou senioridade." },
  equivalent_function: { meaning: "Atuação equivalente ao trabalho pedido, apesar de um nome ou descrição diferente.",
    impact: "Pode contribuir como função equivalente quando atividade, domínio e contexto estiverem sustentados por experiência. Semelhança de palavras ou setor, sozinha, não comprova equivalência." },
  related_function: { meaning: "Atuação próxima ou transferível para a Posição, sem equivalência integral demonstrada.",
    impact: "Pode contribuir para a relação profissional e a pontuação de função quando sustentada por experiência publicada. Não comprova atuação direta, ferramentas ou senioridade; o resultado depende do conjunto das evidências." },
  entry_potential: { meaning: "Formação, prática, projeto ou conhecimento que pode sustentar entrada na função.",
    impact: "Pode contribuir como potencial de entrada quando a Posição permitir. Formação e conhecimento declarado não se tornam experiência profissional, duração ou senioridade." },
  context: { meaning: "Menção a setor, tecnologia ou ambiente, sem atividade suficiente para estabelecer a relação profissional.",
    impact: "Este trecho não sustenta pontuação de função. Outras experiências continuam sendo consideradas; falta de evidência neste trecho não significa incapacidade da Pessoa." },
  other: { meaning: "A atividade descrita pertence a outro domínio em relação a esta Posição.",
    impact: "Este trecho não sustenta relação de função com esta Posição. Isso não significa incapacidade; as demais evidências da trajetória continuam sendo consideradas." },
  unclear: { meaning: "Esta leitura não consegue determinar a natureza da relação com a Posição.",
    impact: "Não sustenta pontuação de função para este trecho. O resultado pode permanecer indeterminado, conforme as demais evidências; informação ausente não vira uma conclusão negativa." },
  backend_execution: { meaning: "Execução pessoal de desenvolvimento backend explicitamente descrita.",
    impact: "Quando sustentada por experiência publicada, pode contribuir como atuação direta em backend. Não comprova automaticamente linguagem, ferramenta, todas as tarefas ou senioridade." },
  software_execution: { meaning: "Desenvolvimento de software descrito, sem especialização backend demonstrada.",
    impact: "Pode contribuir como atuação relacionada quando sustentada por experiência. Programar não comprova, por si só, backend web, APIs ou ferramentas específicas." },
  software_analysis: { meaning: "Análise, desenho ou teste de sistemas de software, sem programação backend demonstrada.",
    impact: "Pode contribuir como função relacionada quando sustentada por experiência. Esta classificação não comprova execução pessoal de programação backend." },
  software_leadership: { meaning: "Liderança de tecnologia ou equipes técnicas, sem execução pessoal de desenvolvimento demonstrada.",
    impact: "Pode contribuir como atuação relacionada no contexto desta leitura. Liderar quem desenvolve não comprova execução pessoal de backend nem domínio de ferramentas." },
  software_context: { meaning: "Menção contextual a software ou tecnologia, sem atuação técnica suficiente demonstrada.",
    impact: "Este trecho não sustenta pontuação de função. As demais experiências continuam sendo consideradas; mencionar tecnologia não comprova execução técnica." },
};
const cannotDetermineHelp: ChoiceHelp = {
  meaning: "Informação insuficiente para escolher com segurança. Mantém o cálculo anterior e a revisão sem conclusão.",
  impact: "A incerteza é registrada ao salvar. Se qualquer item receber esta opção, o Prisma preserva o cálculo interno anterior, sem aplicar uma interpretação semântica concluída. Você pode revisar os itens depois.",
};

function ChoiceInformation({ label, help, id }: { label: string; help: ChoiceHelp; id: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
    };
    document.addEventListener("keydown", dismiss, true);
    return () => document.removeEventListener("keydown", dismiss, true);
  }, [open]);
  return <Popover open={open} onOpenChange={setOpen} trigger={["hover", "focus"]} placement="top"
    content={<div id={id} className="prisma-trajectory-choice-popover">
      <strong>O que significa</strong><p>{help.meaning}</p>
      <strong>Impacto ao salvar</strong><p>{help.impact}</p>
      <Button size="small" onClick={() => setOpen(false)}>Fechar ajuda</Button>
    </div>}>
    <Button type="text" size="small" shape="circle" className="prisma-trajectory-choice-info"
      aria-label={`Entender opção ${label}`} aria-expanded={open} aria-controls={open ? id : undefined}
      icon={<InfoCircleOutlined aria-hidden="true" />} onClick={() => setOpen(true)} />
  </Popover>;
}

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
  useLoadingFeedback({ "Carregando revisão de divergências…": loading, "Salvando revisão de divergências…": saving, "Atualizando avaliação…": refreshing });
  const loadEpoch = useRef(0);
  const helpPrefix = useId();

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
        {error ? <Alert showIcon type="error" title={error} action={view ? <Button disabled={saving || refreshing} onClick={() => focusNoticeTarget(".prisma-trajectory-conflict-item input")}>Rever decisões</Button> : <Button disabled={saving || refreshing} onClick={() => void open()}>Consultar revisão atual</Button>} /> : null}
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
                <div className="prisma-trajectory-choice-option">
                  <div className="prisma-trajectory-choice-heading">
                    <Radio value="first" aria-describedby={`${helpPrefix}-${index}-first-description`}>{labels[conflict.first.activity]}</Radio>
                    <ChoiceInformation label={labels[conflict.first.activity]} help={activityHelp[conflict.first.activity]} id={`${helpPrefix}-${index}-first-help`} />
                  </div>
                  <p id={`${helpPrefix}-${index}-first-description`}>{activityHelp[conflict.first.activity].meaning}</p>
                </div>
                <div className="prisma-trajectory-choice-option">
                  <div className="prisma-trajectory-choice-heading">
                    <Radio value="second" aria-describedby={`${helpPrefix}-${index}-second-description`}>{labels[conflict.second.activity]}</Radio>
                    <ChoiceInformation label={labels[conflict.second.activity]} help={activityHelp[conflict.second.activity]} id={`${helpPrefix}-${index}-second-help`} />
                  </div>
                  <p id={`${helpPrefix}-${index}-second-description`}>{activityHelp[conflict.second.activity].meaning}</p>
                </div>
                <div className="prisma-trajectory-choice-option">
                  <div className="prisma-trajectory-choice-heading">
                    <Radio value="cannot_determine" aria-describedby={`${helpPrefix}-${index}-uncertain-description`}>Não é possível determinar</Radio>
                    <ChoiceInformation label="Não é possível determinar" help={cannotDetermineHelp} id={`${helpPrefix}-${index}-uncertain-help`} />
                  </div>
                  <p id={`${helpPrefix}-${index}-uncertain-description`}>{cannotDetermineHelp.meaning}</p>
                </div>
              </Radio.Group>
              <Typography.Paragraph type="secondary">O efeito no matching depende do conjunto das evidências. Uma declaração não se transforma em experiência profissional por esta classificação.</Typography.Paragraph>
            </div>
          </section>)}
          <Typography.Paragraph type="secondary">A escolha será aplicada ao salvar a revisão. Vale somente para este Perfil e esta versão da Posição; não cria uma regra na Knowledge. Se algum item não puder ser determinado, o cálculo interno anterior é mantido.</Typography.Paragraph>
          {savedUnresolved ? <Alert showIcon type="info" title="Revisão registrada sem conclusão" description="Pelo menos um item não pôde ser determinado. O Prisma manteve o cálculo interno; você pode voltar a revisar os itens depois." /> : null}
        </> : null}
      </div>
    </Modal> : null}
  </>;
}
