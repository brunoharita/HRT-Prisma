export interface ReviewOperationError {
  code?: string;
  message: string;
}

export function reviewOperationErrorMessage(error: ReviewOperationError, fallback: string): string {
  const technicalMessage = error.message.toLowerCase();

  if (error.code === "40001" || /review_conflict|profile_base_conflict|processing_base_conflict|serialize/.test(technicalMessage)) {
    return "Conflito de revisão: os dados mudaram desde que esta tela foi aberta. Recarregue antes de continuar.";
  }
  if (error.code === "42702" || /column reference.+ambiguous/.test(technicalMessage)) {
    return "Não foi possível concluir a operação por uma inconsistência interna. Suas informações permanecem preservadas. Tente novamente após a atualização do sistema.";
  }
  if (error.code === "28000" || /authenticated session required|authenticated user required/.test(technicalMessage)) {
    return "Sua sessão expirou. Entre novamente e reabra esta revisão para continuar.";
  }
  if (/organization scope is not authorized/.test(technicalMessage)) {
    return "Sua sessão não possui autorização para concluir esta operação. Entre novamente ou solicite acesso à organização ativa.";
  }
  if (/original extraction evidence cannot be retired/.test(technicalMessage)) {
    return "A evidência original da extração não pode ser removida. Adicione ou substitua apenas evidências humanas.";
  }
  if (error.code === "42501") {
    return "Seu perfil não possui permissão para concluir esta operação na organização ativa.";
  }
  if (/review not found/.test(technicalMessage)) {
    return "Esta revisão não foi localizada na organização ativa. Volte ao documento e abra a revisão novamente.";
  }
  if (/active review evidence.+not found/.test(technicalMessage)) {
    return "A evidência já foi alterada ou removida em outra ação. Recarregue a revisão antes de continuar.";
  }
  if (/review is no longer approvable|review is no longer editable/.test(technicalMessage)) {
    return "Esta revisão já foi concluída ou deixou de aceitar alterações. Reabra o documento para carregar o estado atual.";
  }
  if (/material evidence is required/.test(technicalMessage)) {
    return "A versão ainda não possui evidência material suficiente para aprovação. Vincule ao menos uma evidência do documento e tente novamente.";
  }
  if (/full name is required/.test(technicalMessage)) {
    return "Informe o Nome completo antes de salvar a revisão.";
  }
  if (/phone or email is required/.test(technicalMessage)) {
    return "Informe ao menos Telefone ou E-mail antes de salvar a revisão.";
  }
  if (/material professional information is required/.test(technicalMessage)) {
    return "Informe ao menos um conteúdo profissional, como resumo, objetivo, resultado, experiência, formação ou competência.";
  }
  if (/review reason is required|review reason is invalid|manual reason is required|adaptive review reason is required/.test(technicalMessage)) {
    return "Explique objetivamente a alteração manual no campo Justificativa da correção antes de salvar.";
  }
  if (/structured resume summary is invalid|invalid field lifecycle|reviewed phone is invalid/.test(technicalMessage) || error.code === "22023") {
    return "Há um campo inválido ou incompleto na revisão. Verifique os campos destacados antes de continuar.";
  }
  if (error.code === "23505" || /idempotency_conflict|already completed/.test(technicalMessage)) {
    return "A operação já foi processada ou entrou em conflito com outra tentativa. Reabra a revisão para carregar o resultado atual.";
  }

  return `${fallback} Suas informações permanecem nesta tela. Tente novamente; se o problema continuar, reabra a revisão antes de uma nova tentativa.`;
}
