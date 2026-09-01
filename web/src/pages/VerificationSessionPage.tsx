import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircleOutlined, ClockCircleOutlined, EyeInvisibleOutlined, FlagOutlined, InfoCircleOutlined, PauseOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, Descriptions, Divider, Modal, Progress, Radio, Result, Space, Steps, Tag, Typography } from "antd";
import type { ParticipantQuestion, ParticipantVerificationWorkspace } from "../domain/competencyVerificationData";
import { labelLevel } from "../domain/competencyVerificationData";
import { competencyVerificationService } from "../infrastructure/supabase/competencyVerificationService";

type Stage = "welcome" | "instructions" | "confirmation" | "running" | "paused" | "finished" | "receipt";

interface Props { token: string; }

export function VerificationSessionPage({ token }: Props) {
  const [workspace, setWorkspace] = useState<ParticipantVerificationWorkspace | null>(null);
  const [stage, setStage] = useState<Stage>("welcome");
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const sequence = useRef(10);
  const questionOpenedAt = useRef(Date.now());
  const hiddenAt = useRef<number | null>(null);
  const blurredAt = useRef<number | null>(null);

  const nextSequence = () => { sequence.current += 1; return sequence.current; };
  const actionPayload = (extra: Record<string, unknown> = {}) => ({ sessionId, sequence: nextSequence(), occurredAtClient: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), ...extra });

  useEffect(() => {
    void competencyVerificationService.participantAction(token, "landing")
      .then((value) => {
        setWorkspace(value);
        if (value.attempt?.status === "paused") setStage("paused");
        else if (["evaluated", "inconclusive", "submitted"].includes(value.attempt?.status ?? "")) setStage("finished");
        else if (value.attempt?.status === "in_progress") setStage("running");
        const current = value.attempt?.questions.findIndex((question) => question.id === value.attempt?.currentQuestionInstanceId) ?? -1;
        if (current >= 0) setActiveIndex(current);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Convite indisponível."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (stage !== "running" || !workspace?.attempt) return;
    const started = Date.parse(workspace.attempt.startedAt);
    const timer = window.setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000))), 1_000);
    return () => window.clearInterval(timer);
  }, [stage, workspace?.attempt]);

  const activeQuestion = workspace?.attempt?.questions[activeIndex] ?? null;
  const recordEvent = async (eventType: string, questionId: string | null, durationSeconds = 0) => {
    if (!workspace?.attempt) return;
    await competencyVerificationService.participantAction<Record<string, unknown>>(token, "record_event", actionPayload({
      attemptId: workspace.attempt.id,
      questionInstanceId: questionId,
      eventType,
      durationSeconds,
      technicalState: { online: navigator.onLine },
    }));
  };

  useEffect(() => {
    if (stage !== "running" || !workspace?.attempt || !activeQuestion) return;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        void recordEvent("page_hidden", activeQuestion.id);
      } else {
        const duration = hiddenAt.current ? Math.round((Date.now() - hiddenAt.current) / 1000) : 0;
        hiddenAt.current = null;
        void recordEvent("page_visible", activeQuestion.id, duration);
      }
    };
    const onBlur = () => { blurredAt.current = Date.now(); void recordEvent("window_blurred", activeQuestion.id); };
    const onFocus = () => {
      const duration = blurredAt.current ? Math.round((Date.now() - blurredAt.current) / 1000) : 0;
      blurredAt.current = null;
      void recordEvent("window_focused", activeQuestion.id, duration);
    };
    const onOffline = () => void recordEvent("connection_lost", activeQuestion.id);
    const onOnline = () => void recordEvent("connection_restored", activeQuestion.id);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [activeQuestion?.id, stage, workspace?.attempt?.id]);

  const refreshFrom = (next: ParticipantVerificationWorkspace) => {
    setWorkspace(next);
    const current = next.attempt?.questions.findIndex((question) => question.id === next.attempt?.currentQuestionInstanceId) ?? -1;
    if (current >= 0) setActiveIndex(current);
  };

  const begin = async () => {
    try {
      setLoading(true);
      const next = await competencyVerificationService.participantAction(token, "start", {
        sessionId,
        instructionsVersion: "m51b-participant-instructions-1.0.0",
      });
      refreshFrom(next);
      setElapsedSeconds(0);
      setStage("running");
      questionOpenedAt.current = Date.now();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Não foi possível iniciar a verificação.");
    } finally { setLoading(false); }
  };

  const saveResponse = async (question: ParticipantQuestion, selectedOptionId: string | null, markedForReview: boolean) => {
    if (!workspace?.attempt) return;
    try {
      setSaving(true);
      const next = await competencyVerificationService.participantAction(token, "save_response", actionPayload({
        attemptId: workspace.attempt.id,
        questionInstanceId: question.id,
        selectedOptionId,
        markedForReview,
        expectedVersion: question.response?.version ?? 0,
      }));
      refreshFrom(next);
      setSavedAt(new Date().toISOString());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "A resposta não foi salva.");
    } finally { setSaving(false); }
  };

  const goToQuestion = async (index: number) => {
    if (!workspace?.attempt || !activeQuestion) return;
    const next = workspace.attempt.questions[index];
    if (!next) return;
    const duration = Math.max(0, Math.round((Date.now() - questionOpenedAt.current) / 1000));
    await recordEvent("question_elapsed", activeQuestion.id, duration).catch(() => undefined);
    await recordEvent("question_opened", next.id).catch(() => undefined);
    questionOpenedAt.current = Date.now();
    setActiveIndex(index);
    setNavigationOpen(false);
  };

  const pause = async () => {
    if (!workspace?.attempt || !activeQuestion) return;
    try {
      const duration = Math.max(0, Math.round((Date.now() - questionOpenedAt.current) / 1000));
      await recordEvent("question_elapsed", activeQuestion.id, duration);
      const next = await competencyVerificationService.participantAction(token, "pause", actionPayload({ attemptId: workspace.attempt.id, questionInstanceId: activeQuestion.id }));
      refreshFrom(next); setStage("paused");
    } catch (pauseError) { setError(pauseError instanceof Error ? pauseError.message : "Não foi possível pausar."); }
  };

  const resume = async () => {
    if (!workspace?.attempt || !activeQuestion) return;
    try {
      const next = await competencyVerificationService.participantAction(token, "resume", actionPayload({ attemptId: workspace.attempt.id, questionInstanceId: activeQuestion.id }));
      refreshFrom(next); setStage("running"); questionOpenedAt.current = Date.now();
    } catch (resumeError) { setError(resumeError instanceof Error ? resumeError.message : "Não foi possível retomar."); }
  };

  const submit = async () => {
    if (!workspace?.attempt || !activeQuestion) return;
    try {
      setLoading(true);
      const duration = Math.max(0, Math.round((Date.now() - questionOpenedAt.current) / 1000));
      await recordEvent("question_elapsed", activeQuestion.id, duration);
      const next = await competencyVerificationService.participantAction(token, "submit", actionPayload({
        attemptId: workspace.attempt.id,
        evaluationVersion: "m51b-assessment-evaluation-1.0.0",
      }));
      refreshFrom(next); setSubmitOpen(false); setStage("finished");
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Não foi possível finalizar."); }
    finally { setLoading(false); }
  };

  if (loading && !workspace) return <PublicShell><Result status="info" title="Carregando verificação" subTitle="Validando convite, escopo e versões." /></PublicShell>;
  if (error && !workspace) return <PublicShell><Result status="error" title="Convite indisponível" subTitle={error} /></PublicShell>;
  if (!workspace) return null;

  if (stage === "paused") return <PublicShell><Result icon={<PauseOutlined />} title="Sessão pausada" subTitle="Suas respostas foram salvas. Você pode retomar antes do prazo final." extra={<><Descriptions column={2} items={[{ key: "expires", label: "Prazo", children: new Date(workspace.expiresAt).toLocaleString("pt-BR") }, { key: "time", label: "Tempo utilizado", children: formatTime(elapsedSeconds) }]} /><Button onClick={() => void resume()} size="large" type="primary">Continuar de onde parou</Button></>} /></PublicShell>;

  if (stage === "finished" || stage === "receipt") {
    const result = workspace.attempt?.result;
    if (stage === "receipt") return <PublicShell><Receipt workspace={workspace} onBack={() => setStage("finished")} /></PublicShell>;
    return <PublicShell>
      <Result status="success" title="Verificação finalizada" subTitle="Suas respostas foram enviadas e preservadas com sucesso." extra={<Space wrap><Button onClick={() => setStage("receipt")}>Ver comprovante</Button>{result?.rawResult ? <Button onClick={() => document.getElementById("participant-summary")?.scrollIntoView({ behavior: "smooth" })} type="primary">Ver resumo</Button> : null}</Space>} />
      <Card className="prisma-m51b-completion-card"><Descriptions column={{ xs: 1, sm: 3 }} items={[{ key: "time", label: "Tempo total", children: formatTime(workspace.attempt?.elapsedTotalSeconds ?? elapsedSeconds) }, { key: "answered", label: "Questões respondidas", children: `${result?.rawResult ? result.rawResult.totalQuestions - result.rawResult.unanswered : workspace.attempt?.questions.filter((question) => question.response?.selectedOptionId).length ?? 0} de ${workspace.verification.itemCount}` }, { key: "code", label: "Código", children: result?.completionCode ?? "Em processamento" }]} /></Card>
      {result?.rawResult ? <Card id="participant-summary" title="Resumo da sua verificação"><Space align="center" size="large" wrap><Progress percent={result.rawResult.percentage} type="circle" /><div><Typography.Title level={4}>{result.rawResult.correct} de {result.rawResult.totalQuestions} corretas</Typography.Title><Typography.Paragraph>Este resultado representa uma evidência específica e será analisado no contexto da necessidade profissional. Não constitui aprovação ou reprovação automática.</Typography.Paragraph></div></Space></Card> : <Alert message="A política desta verificação disponibiliza somente a confirmação de conclusão." showIcon type="info" />}
    </PublicShell>;
  }

  if (stage === "running" && activeQuestion && workspace.attempt) {
    const answered = workspace.attempt.questions.filter((question) => question.response?.selectedOptionId).length;
    const marked = workspace.attempt.questions.filter((question) => question.response?.markedForReview).length;
    return <PublicShell compact>
      {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
      <header className="prisma-m51b-question-header"><Button icon={<PauseOutlined />} onClick={() => void pause()}>Pausar</Button><strong>Questão {activeIndex + 1} de {workspace.attempt.questions.length}</strong><span aria-label={`Tempo total decorrido ${formatTime(elapsedSeconds)}`}><ClockCircleOutlined /> {formatTime(elapsedSeconds)}</span></header>
      <main className="prisma-m51b-question-layout">
        <Card className="prisma-m51b-question-card">
          <Typography.Text type="secondary">Considere a situação e selecione a alternativa mais adequada.</Typography.Text>
          <Typography.Title level={4}>{activeQuestion.stem}</Typography.Title>
          <Radio.Group aria-label={`Alternativas da questão ${activeIndex + 1}`} className="prisma-m51b-options" onChange={(event) => void saveResponse(activeQuestion, event.target.value, activeQuestion.response?.markedForReview ?? false)} value={activeQuestion.response?.selectedOptionId ?? null}>
            {activeQuestion.options.map((option) => <Radio key={option.id} value={option.id}><strong>{option.id}</strong> {option.label}</Radio>)}
          </Radio.Group>
          <div aria-live="polite" className="prisma-m51b-save-state">{saving ? "Salvando resposta..." : savedAt ? `Resposta salva às ${new Date(savedAt).toLocaleTimeString("pt-BR")}` : "Selecione uma alternativa para salvar."}</div>
          <Divider />
          <Space wrap><Button disabled={activeIndex === 0} onClick={() => void goToQuestion(activeIndex - 1)}>Anterior</Button><Button icon={<FlagOutlined />} onClick={() => void saveResponse(activeQuestion, activeQuestion.response?.selectedOptionId ?? null, !(activeQuestion.response?.markedForReview ?? false))}>{activeQuestion.response?.markedForReview ? "Desmarcar revisão" : "Marcar para revisão"}</Button>{activeIndex < workspace.attempt.questions.length - 1 ? <Button onClick={() => void goToQuestion(activeIndex + 1)} type="primary">Próxima</Button> : <Button onClick={() => setSubmitOpen(true)} type="primary">Revisar e finalizar</Button>}</Space>
        </Card>
        <Card className="prisma-m51b-navigation" title="Navegação" extra={<Button onClick={() => setNavigationOpen(true)} size="small">Ver todas</Button>}>
          <QuestionGrid activeIndex={activeIndex} onSelect={(index) => void goToQuestion(index)} questions={workspace.attempt.questions} />
          <Space direction="vertical"><span><Tag color="success">{answered}</Tag> Respondidas</span><span><Tag color="warning">{marked}</Tag> Marcadas</span><span><Tag>{workspace.attempt.questions.length - answered}</Tag> Não respondidas</span></Space>
        </Card>
      </main>
      <Modal footer={<Button onClick={() => setNavigationOpen(false)}>Fechar</Button>} onCancel={() => setNavigationOpen(false)} open={navigationOpen} title="Ir para a questão"><QuestionGrid activeIndex={activeIndex} onSelect={(index) => void goToQuestion(index)} questions={workspace.attempt.questions} /></Modal>
      <Modal cancelText="Continuar revisão" okButtonProps={{ loading }} okText="Submeter definitivamente" onCancel={() => setSubmitOpen(false)} onOk={() => void submit()} open={submitOpen} title="Finalizar verificação">
        <Typography.Paragraph>Você respondeu {answered} de {workspace.attempt.questions.length} questões e marcou {marked} para revisão.</Typography.Paragraph>
        {answered < workspace.attempt.questions.length ? <Alert message={`Ainda existem ${workspace.attempt.questions.length - answered} questões sem resposta.`} showIcon type="warning" /> : <Alert message="Todas as questões possuem resposta salva." showIcon type="success" />}
      </Modal>
    </PublicShell>;
  }

  const step = stage === "welcome" ? 0 : stage === "instructions" ? 1 : 2;
  return <PublicShell>
    {error ? <Alert closable message={error} onClose={() => setError(null)} showIcon type="error" /> : null}
    <Steps current={step} items={[{ title: "Boas-vindas" }, { title: "Instruções" }, { title: "Confirmação" }, { title: "Iniciar" }]} responsive />
    {stage === "welcome" ? <Welcome workspace={workspace} onContinue={() => setStage("instructions")} /> : null}
    {stage === "instructions" ? <Instructions workspace={workspace} onBack={() => setStage("welcome")} onContinue={() => setStage("confirmation")} /> : null}
    {stage === "confirmation" ? <Card title="Antes de iniciar, confirme"><Space direction="vertical" size="large"><Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}>Confirmo que li as instruções e estou ciente das condições de execução e dos registros técnicos descritos.</Checkbox><Alert message="Esta ciência registra as condições apresentadas. Ela não substitui a definição de base legal e privacidade necessária antes de uso com Pessoas reais." showIcon type="info" /><Space><Button onClick={() => setStage("instructions")}>Voltar</Button><Button disabled={!confirmed} loading={loading} onClick={() => void begin()} type="primary">Iniciar verificação</Button></Space></Space></Card> : null}
  </PublicShell>;
}

function PublicShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return <div className={`prisma-m51b-public-shell${compact ? " prisma-m51b-public-shell-compact" : ""}`}><header className="prisma-m51b-public-brand"><span className="prisma-m51b-logo"><SafetyCertificateOutlined /> prisma</span><a href="mailto:suporte@example.invalid">Precisa de ajuda?</a></header><div className="prisma-m51b-public-content">{children}</div></div>;
}

function Welcome({ workspace, onContinue }: { workspace: ParticipantVerificationWorkspace; onContinue: () => void }) {
  return <Card><Typography.Title level={2}>Olá, {workspace.person.name}!</Typography.Title><Typography.Paragraph>Você está prestes a iniciar uma verificação de competências.</Typography.Paragraph><Descriptions bordered column={{ xs: 1, sm: 2 }} items={[{ key: "competency", label: "Competência", children: `${workspace.verification.competency} · ${labelLevel(workspace.verification.targetLevel)}` }, { key: "duration", label: "Duração estimada", children: `${workspace.verification.estimatedMinutes} minutos` }, { key: "format", label: "Formato", children: "Questões de múltipla escolha" }, { key: "items", label: "Número de questões", children: workspace.verification.itemCount }]} /><Alert icon={<InfoCircleOutlined />} message="Importante" description="As respostas são salvas durante a execução. A duração é estimada e não cria limite por questão." showIcon type="info" /><Button onClick={onContinue} type="primary">Continuar</Button></Card>;
}

function Instructions({ workspace, onBack, onContinue }: { workspace: ParticipantVerificationWorkspace; onBack: () => void; onContinue: () => void }) {
  const items = [
    { icon: <CheckCircleOutlined />, title: "Autenticidade", text: "Responda de forma autônoma e conforme as condições apresentadas." },
    { icon: <SafetyCertificateOutlined />, title: "Ambiente", text: "Escolha um ambiente estável. Você poderá pausar e retomar antes do prazo." },
    { icon: <FlagOutlined />, title: "Navegação", text: "Volte, avance, marque questões e revise antes da submissão final." },
    { icon: <EyeInvisibleOutlined />, title: "Privacidade", text: `Registramos ${workspace.privacy.recorded.join(", ")}. Não utilizamos ${workspace.privacy.notRecorded.join(", ")}.` },
  ];
  return <Card title="Instruções importantes"><div className="prisma-m51b-instruction-list">{items.map((item) => <div key={item.title}><span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div><Alert message="Mudanças de foco ou visibilidade são registros técnicos contextuais e não constituem prova de conduta." showIcon type="info" /><Space><Button onClick={onBack}>Voltar</Button><Button onClick={onContinue} type="primary">Continuar</Button></Space></Card>;
}

function QuestionGrid({ questions, activeIndex, onSelect }: { questions: ParticipantQuestion[]; activeIndex: number; onSelect: (index: number) => void }) {
  return <div aria-label="Navegação entre questões" className="prisma-m51b-question-grid">{questions.map((question, index) => <Button aria-current={index === activeIndex ? "step" : undefined} className={question.response?.markedForReview ? "is-marked" : question.response?.selectedOptionId ? "is-answered" : ""} key={question.id} onClick={() => onSelect(index)} type={index === activeIndex ? "primary" : "default"}>{index + 1}</Button>)}</div>;
}

function Receipt({ workspace, onBack }: { workspace: ParticipantVerificationWorkspace; onBack: () => void }) {
  return <Card className="prisma-m51b-receipt"><Result status="success" title="Comprovante de conclusão" subTitle={`${workspace.person.name} concluiu a verificação de competências.`} /><Descriptions bordered column={1} items={[{ key: "competency", label: "Competência", children: workspace.verification.competency }, { key: "level", label: "Nível-alvo", children: labelLevel(workspace.verification.targetLevel) }, { key: "status", label: "Status", children: <Tag color="success">Concluída</Tag> }, { key: "date", label: "Data", children: workspace.attempt?.result?.completedAt ? new Date(workspace.attempt.result.completedAt).toLocaleString("pt-BR") : "" }, { key: "duration", label: "Duração", children: formatTime(workspace.attempt?.elapsedTotalSeconds ?? 0) }, { key: "code", label: "Código", children: workspace.attempt?.result?.completionCode ?? "" }]} /><Alert message="Este documento comprova a conclusão da verificação. Não é certificado profissional ou selo de proficiência." showIcon type="info" /><Space><Button onClick={onBack}>Voltar</Button><Button onClick={() => window.print()} type="primary">Imprimir comprovante</Button></Space></Card>;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
