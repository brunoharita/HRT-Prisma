export interface SemanticFallbackNoticeInput {
  status: "processing" | "indeterminate" | "unavailable" | "complete";
  reasonCode: string;
  retryAvailable?: boolean;
  retryAfter?: string;
  retryExhausted?: boolean;
}

type Cause = "processing" | "disagreement" | "insufficient" | "no_content" | "timeout" | "provider" | "invalid"
  | "changed" | "access" | "disabled" | "not_requested" | "no_position" | "review_input" | "input_limit" | "internal" | "unknown";

const CAUSES: Record<Cause, { title: (count: number) => string; detail: string; badge: string }> = {
  processing: {
    title: count => `A análise ainda está em andamento para ${profiles(count)}`,
    detail: "O Prisma ainda não recebeu uma conclusão para esses perfis.",
    badge: "IA em andamento · resultado interno",
  },
  disagreement: {
    title: count => `A IA deu duas respostas diferentes para ${profiles(count)}`,
    detail: "As duas respostas foram recebidas e verificadas, mas classificaram trechos da trajetória de formas diferentes. Nenhuma foi aplicada automaticamente. Até cinco itens podem ser tratados por uma pessoa autorizada; acima desse limite, permanece o cálculo interno.",
    badge: "IA: respostas diferentes · resultado anterior mantido",
  },
  insufficient: {
    title: count => `As evidências não bastaram para concluir a análise de ${profiles(count)}`,
    detail: "A interpretação não encontrou base suficiente para definir a relação profissional com a posição. Isso não significa falta de capacidade.",
    badge: "IA: evidência insuficiente · resultado interno",
  },
  no_content: {
    title: count => `Não havia conteúdo profissional para analisar em ${profiles(count)}`,
    detail: "Sem experiência ou formação profissional utilizável no perfil publicado, o Prisma não enviou esse perfil à IA. Isso não significa falta de capacidade.",
    badge: "Sem conteúdo profissional · resultado interno",
  },
  timeout: {
    title: count => `A IA não respondeu a tempo para ${profiles(count)}`,
    detail: "O prazo da solicitação terminou antes de uma resposta utilizável.",
    badge: "IA: tempo esgotado · resultado interno",
  },
  provider: {
    title: count => `O serviço de IA não concluiu a solicitação para ${profiles(count)}`,
    detail: "A chamada ao serviço não produziu uma análise utilizável nesta tentativa.",
    badge: "IA indisponível · resultado interno",
  },
  invalid: {
    title: count => `O Prisma não pôde validar a análise de ${profiles(count)}`,
    detail: "O resultado recebido não passou pelas verificações necessárias para ser usado. Ele não foi aplicado.",
    badge: "IA: resposta não validada · resultado interno",
  },
  changed: {
    title: count => `Os dados mudaram durante a análise de ${profiles(count)}`,
    detail: "A versão do perfil ou da posição já não corresponde à usada na tentativa; o Prisma descartou essa interpretação.",
    badge: "Dados mudaram · resultado interno",
  },
  access: {
    title: count => `O acesso à análise não foi confirmado para ${profiles(count)}`,
    detail: "O Prisma não pôde confirmar a autorização necessária para usar essa interpretação.",
    badge: "Acesso não confirmado · resultado interno",
  },
  disabled: {
    title: count => `A análise por IA não está disponível para ${profiles(count)}`,
    detail: "A interpretação externa não está habilitada nesta consulta.",
    badge: "IA não disponível · resultado interno",
  },
  not_requested: {
    title: count => `A análise por IA não se aplicou a ${profiles(count)}`,
    detail: "A triagem interna não confirmou uma relação profissional pendente que justificasse enviar esses perfis à IA.",
    badge: "IA não necessária pela triagem · resultado interno",
  },
  no_position: {
    title: count => `A posição não pôde ser usada na análise de ${profiles(count)}`,
    detail: "A posição não tinha um título profissional utilizável para comparar com esses perfis.",
    badge: "Posição sem título utilizável · resultado interno",
  },
  review_input: {
    title: count => `O conteúdo de ${profiles(count)} precisa de revisão antes da IA`,
    detail: "O Prisma não conseguiu preparar o conteúdo profissional com segurança para essa análise.",
    badge: "Conteúdo precisa de revisão · resultado interno",
  },
  input_limit: {
    title: count => `O conteúdo de ${profiles(count)} excedeu o limite da análise`,
    detail: "O Prisma não enviou à IA um conteúdo que ultrapassou o limite permitido.",
    badge: "Limite de conteúdo · resultado interno",
  },
  internal: {
    title: count => `O Prisma não concluiu a análise de ${profiles(count)}`,
    detail: "Uma etapa interna da análise não pôde ser concluída; não há uma interpretação validada para aplicar.",
    badge: "Análise não concluída · resultado interno",
  },
  unknown: {
    title: count => `A análise não foi concluída para ${profiles(count)}`,
    detail: "O Prisma não dispõe de uma explicação confirmada para esta ocorrência e não atribuiu a falha à IA.",
    badge: "Causa não informada · resultado interno",
  },
};

function profiles(count: number): string { return `${count} ${count === 1 ? "perfil" : "perfis"}`; }

function causeOf(item: SemanticFallbackNoticeInput): Cause {
  if (item.status === "processing") return "processing";
  switch (item.reasonCode) {
    case "READINGS_DISAGREE": return "disagreement";
    case "INSUFFICIENT_EVIDENCE": return "insufficient";
    case "NO_TRAJECTORY_EVIDENCE": return "no_content";
    case "PROVIDER_TIMEOUT": return "timeout";
    case "PROVIDER_UNAVAILABLE": return "provider";
    case "RESPONSE_INVALID": case "INVALID_READING": case "INVALID_ASSESSMENT": return "invalid";
    case "SOURCE_STALE": return "changed";
    case "AUTH_REQUIRED": case "AUTH_REVOKED": case "NOT_AUTHORIZED": return "access";
    case "AI_DISABLED": return "disabled";
    case "OUTSIDE_SEMANTIC_TRIAGE": return "not_requested";
    case "OUTSIDE_PILOT": return "no_position";
    case "INPUT_REQUIRES_REVIEW": return "review_input";
    case "INPUT_LIMIT": return "input_limit";
    case "BACKEND_UNAVAILABLE": case "CACHE_UNAVAILABLE": case "CACHE_INVALID": case "COMPLETION_UNAVAILABLE":
    case "TRIAGE_UNAVAILABLE": case "TRIAGE_SOURCE_INVALID": case "SNAPSHOT_UNAVAILABLE": case "SNAPSHOT_SOURCE_UNAVAILABLE":
    case "SNAPSHOT_SOURCE_INVALID": case "REQUEST_INVALID": return "internal";
    default: return "unknown";
  }
}

export function semanticFallbackBadge(item: SemanticFallbackNoticeInput): string { return CAUSES[causeOf(item)].badge; }

export function semanticFallbackNotice(items: SemanticFallbackNoticeInput[], now = Date.now()): {
  title: string; description: string; canRefresh: boolean; actionLabel: string;
} | null {
  if (!items.length) return null;
  const counts = new Map<Cause, number>();
  for (const item of items) { const cause = causeOf(item); counts.set(cause, (counts.get(cause) ?? 0) + 1); }
  const groups = [...counts].map(([cause, count]) => ({ ...CAUSES[cause], count }));
  const title = groups.length === 1 ? groups[0]!.title(groups[0]!.count) : `Análises não concluídas por motivos diferentes para ${profiles(items.length)}`;
  const reasons = groups.length === 1 ? groups[0]!.detail : groups.map(group => `${group.title(group.count)}. ${group.detail}`).join(" ");
  const consequence = "Os grupos, notas e evidências exibidos vêm do cálculo interno desta consulta, anterior à IA; nenhuma dessas interpretações foi aplicada.";
  const waiting = items.filter(item => causeOf(item) !== "disagreement" && !item.retryExhausted && item.retryAfter && Date.parse(item.retryAfter) > now)
    .map(item => Date.parse(item.retryAfter!));
  const retryable = items.some(item => item.retryAvailable && !item.retryExhausted
    && (!item.retryAfter || Date.parse(item.retryAfter) <= now) && causeOf(item) !== "disagreement");
  const processing = items.some(item => item.status === "processing");
  const guidance = [
    ...(counts.has("disagreement") ? ["Repetir a mesma versão não cria uma nova leitura; abra a revisão no Perfil para ver os itens disponíveis."] : []),
    ...(items.some(item => item.retryExhausted) ? ["O limite de tentativas foi atingido; atualizar não repetirá essa análise."] : []),
    ...(waiting.length ? [`Uma nova tentativa poderá ser feita após ${new Date(Math.min(...waiting)).toLocaleString("pt-BR")}.`] : []),
    ...(retryable ? ["Há uma nova tentativa disponível para os perfis indicados."] : []),
    ...(processing ? ["Atualizar acompanha o andamento, sem reiniciar a análise em curso."] : []),
  ].join(" ");
  return { title, description: `${reasons} ${consequence}${guidance ? ` ${guidance}` : ""}`,
    canRefresh: retryable || processing, actionLabel: retryable ? "Tentar análise novamente" : "Atualizar andamento" };
}
