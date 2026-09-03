export interface ReviewOperationError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

export type OperationErrorCategory = "authentication" | "authorization" | "conflict" | "validation" | "stale-state" | "unavailable" | "internal";
export type OperationRecovery = "sign-in" | "reload" | "review-fields" | "retry" | "return-to-review" | "none";
export const OPERATION_ERROR_CONTRACT_VERSION = "2.0.0";

interface ActionableOperationFeedback {
  contract: "operation-feedback-2.0.0";
  reason: string;
  fieldPath: string | null;
  itemNumber: number | null;
}

export class PrismaOperationError extends Error {
  readonly category: OperationErrorCategory;
  readonly recovery: OperationRecovery;
  readonly technicalCode: string | null;
  readonly fieldPath: string | null;

  constructor(message: string, options: { category: OperationErrorCategory; recovery: OperationRecovery; technicalCode?: string | null; fieldPath?: string | null }) {
    super(message);
    this.name = "PrismaOperationError";
    this.category = options.category;
    this.recovery = options.recovery;
    this.technicalCode = options.technicalCode ?? null;
    this.fieldPath = options.fieldPath ?? null;
  }
}

function asOperationError(error: ReviewOperationError, message: string, category: OperationErrorCategory, recovery: OperationRecovery, fieldPath?: string | null): PrismaOperationError {
  return new PrismaOperationError(message, { category, recovery, technicalCode: error.code ?? null, fieldPath: fieldPath ?? null });
}

export function reviewOperationError(error: ReviewOperationError, fallback: string): PrismaOperationError {
  const technicalMessage = error.message.toLowerCase();
  const actionable = parseActionableFeedback(error.details);

  if (actionable) {
    const item = actionable.itemNumber ? `Formação ${actionable.itemNumber}` : "A formação indicada";
    if (actionable.reason === "education_classification_required") {
      return asOperationError(error, `${item}: confirme a classificação acadêmica apresentada antes de publicar.`, "validation", "review-fields", actionable.fieldPath);
    }
    if (actionable.reason === "education_qualification_incompatible") {
      return asOperationError(error, `${item}: selecione uma qualificação compatível com o nível acadêmico informado.`, "validation", "review-fields", actionable.fieldPath);
    }
    if (actionable.reason === "full_name_required") {
      return asOperationError(error, "Informe o Nome completo antes de continuar.", "validation", "review-fields", actionable.fieldPath ?? "identity.fullName");
    }
    if (actionable.reason === "contact_required") {
      return asOperationError(error, "Informe ao menos Telefone ou E-mail antes de continuar.", "validation", "review-fields", actionable.fieldPath ?? "contact.phone");
    }
    if (actionable.reason === "professional_information_required") {
      return asOperationError(error, "Informe ao menos um conteúdo profissional, como resumo, objetivo, resultado, experiência, formação ou competência.", "validation", "review-fields", actionable.fieldPath ?? "professionalTitle");
    }
    if (actionable.reason === "publication_removal_reason_required") {
      return asOperationError(error, "Explique por que a informação anteriormente aprovada deve ser removida.", "validation", "return-to-review", actionable.fieldPath);
    }
    if (actionable.reason === "review_contract_sync_failed") {
      return asOperationError(error, "O Prisma não conseguiu atualizar automaticamente os dados antigos desta revisão. Nenhum campo precisa ser corrigido manualmente e nenhuma alteração foi perdida. Atualize a página e tente novamente.", "internal", "reload");
    }
    if (actionable.reason === "profile_publication_mode_required") {
      return asOperationError(error, "Escolha Atualizar Perfil ou Substituir Perfil antes de publicar.", "validation", "review-fields");
    }
    if (actionable.reason === "profile_block_target_required") {
      return asOperationError(error, "Escolha qual registro atual deve receber esta alteração.", "validation", "review-fields", actionable.fieldPath);
    }
    if (actionable.reason === "profile_block_target_type_mismatch") {
      return asOperationError(error, "A informação selecionada pertence a outro tipo de conteúdo. Escolha um registro do mesmo grupo.", "validation", "review-fields", actionable.fieldPath);
    }
    if (actionable.reason === "profile_block_target_not_found") {
      return asOperationError(error, "O registro escolhido mudou desde que a tela foi aberta. Atualize a comparação e escolha novamente.", "stale-state", "reload", actionable.fieldPath);
    }
    if (/profile_block_decision/.test(actionable.reason)) {
      return asOperationError(error, "Uma ação da comparação está incompleta. Revise o item destacado e escolha como ele deve ficar no novo Perfil.", "validation", "review-fields", actionable.fieldPath);
    }
    if (/profile_version_not_found/.test(actionable.reason)) {
      return asOperationError(error, "Esta versão não está mais disponível para restauração. Atualize o histórico e escolha outra versão.", "stale-state", "reload");
    }
    if (/document_(?:not_found_for_deletion|changed_before_deletion)/.test(actionable.reason)) {
      return asOperationError(error, "Este documento mudou ou já foi excluído. Atualize a Central da Pessoa para ver o estado atual.", "stale-state", "reload");
    }
    if (actionable.reason === "document_deletion_operation_not_found") {
      return asOperationError(error, "A exclusão anterior não pôde ser retomada. Volte ao documento e tente excluir novamente.", "stale-state", "return-to-review");
    }
  }

  if (error.code === "40001" || /review_conflict|profile_base_conflict|processing_base_conflict|serialize/.test(technicalMessage)) {
    return asOperationError(error, "Conflito de revisão: os dados mudaram desde que esta tela foi aberta. Suas alterações locais continuam aqui; compare-as com o estado mais recente antes de recarregar.", "conflict", "reload");
  }
  if (error.code === "28000" || error.code === "PGRST301" || /authenticated session required|authenticated user required|jwt expired|invalid jwt/.test(technicalMessage)) {
    return asOperationError(error, "Sua sessão expirou. Entre novamente e reabra esta revisão para continuar.", "authentication", "sign-in");
  }
  if (/organization scope is not authorized/.test(technicalMessage)) {
    return asOperationError(error, "Seu perfil não possui autorização para concluir esta operação na organização ativa.", "authorization", "none");
  }
  if (/review not found/.test(technicalMessage)) {
    return asOperationError(error, "Esta revisão não foi localizada na organização ativa. Volte ao documento e abra a revisão novamente.", "stale-state", "return-to-review");
  }
  if (/active review evidence.+not found|evidence link.+not found|replacement evidence.+not found/.test(technicalMessage)) {
    return asOperationError(error, "Esta evidência já foi alterada ou removida em outra ação. Suas alterações locais permanecem na tela; recarregue a revisão antes de tentar novamente.", "stale-state", "reload");
  }
  if (/review is no longer approvable|review is no longer editable/.test(technicalMessage)) {
    return asOperationError(error, "Esta revisão já foi concluída ou deixou de aceitar alterações. Reabra o documento para carregar o estado atual.", "stale-state", "return-to-review");
  }
  if (/original extraction evidence cannot be retired/.test(technicalMessage)) {
    return asOperationError(error, "A evidência original da extração não pode ser removida. Adicione uma evidência humana substituta ou mantenha a evidência original.", "validation", "review-fields");
  }
  if (error.code === "42501") {
    return asOperationError(error, "Seu perfil não possui autorização para concluir esta operação na organização ativa.", "authorization", "none");
  }
  if (/approved document cannot be invalidated/.test(technicalMessage)) {
    return asOperationError(error, "Este documento já originou um perfil aprovado e não pode ser descartado. Para substituí-lo, conclua uma nova revisão e publique uma nova versão.", "validation", "return-to-review");
  }
  if (/review must be started|document is not linked to the person/.test(technicalMessage)) {
    return asOperationError(error, "O documento não está mais pronto para esta ação. Volte à Central da Pessoa e abra o fluxo novamente.", "stale-state", "return-to-review");
  }
  if (/only failed|only reviewable|cannot be reprocessed|cannot be invalidated/.test(technicalMessage)) {
    return asOperationError(error, "O estado atual do documento não permite esta ação. Atualize a página para ver as opções de recuperação disponíveis.", "stale-state", "reload");
  }
  if (/material evidence is required/.test(technicalMessage)) {
    return asOperationError(error, "A versão ainda não possui evidência material suficiente para aprovação. Vincule ao menos uma evidência do documento e tente novamente.", "validation", "review-fields");
  }
  if (/full name is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe o Nome completo antes de salvar a revisão.", "validation", "review-fields", "identity.fullName");
  }
  if (/phone or email is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe ao menos Telefone ou E-mail antes de salvar a revisão.", "validation", "review-fields", "contact.phone");
  }
  if (/material professional information is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe ao menos um conteúdo profissional, como resumo, objetivo, resultado, experiência, formação ou competência.", "validation", "review-fields", "professionalTitle");
  }
  if (/profile contains an unreviewed academic classification/.test(technicalMessage)) {
    return asOperationError(error, "Existe uma formação com classificação acadêmica ainda não confirmada. Volte à revisão; o Prisma destacará exatamente a formação que precisa da sua confirmação.", "validation", "review-fields");
  }
  if (/review reason is required|review reason is invalid|manual reason is required|adaptive review reason is required/.test(technicalMessage)) {
    return asOperationError(error, "Explique objetivamente a alteração manual no campo Justificativa da correção antes de salvar.", "validation", "review-fields");
  }
  if (/(?:raw )?selected evidence text is too long/.test(technicalMessage)) {
    return asOperationError(error, "A seleção contém texto demais para uma única evidência. Selecione apenas o trecho que comprova este campo.", "validation", "review-fields");
  }
  if (/evidence region is too small|selected region is too small/.test(technicalMessage)) {
    return asOperationError(error, "A área selecionada é pequena demais para formar uma evidência. Selecione um trecho completo e tente novamente.", "validation", "review-fields");
  }
  if (/evidence coordinates are invalid|invalid evidence coordinates|page.+does not match|page number is invalid|evidence page is outside the document|document version and page are required/.test(technicalMessage)) {
    return asOperationError(error, "A seleção não corresponde à página exibida. Volte à origem do campo, selecione novamente o trecho e confirme.", "validation", "review-fields");
  }
  if (/refinement contract is invalid|evidence refinement is invalid|refinement decision.+invalid contract|refinement decisions must be a bounded array|refinement decisions contain duplicate links/.test(technicalMessage)) {
    return asOperationError(error, "A evidência ficou inconsistente durante o refinamento. A seleção foi preservada; revise os vínculos deste campo e tente novamente.", "validation", "review-fields");
  }
  if (/unsupported field|unsupported action|unsupported method|unsupported scope|refinement is unsupported for this field scope/.test(technicalMessage)) {
    return asOperationError(error, "Esta alteração não é compatível com o campo selecionado. Reabra o campo e use uma das ações disponíveis na revisão.", "validation", "review-fields");
  }
  if (/value change is required|requires a reviewed value change|replacement target.+required|replacement evidence.+required/.test(technicalMessage)) {
    return asOperationError(error, "A correção precisa alterar o valor atual ou indicar claramente qual evidência será substituída.", "validation", "review-fields");
  }
  if (/adaptive sibling request is invalid|adaptive suggestion.+invalid|adaptive scan metadata.+invalid|adaptive source field path is invalid|adaptive pattern key is invalid|adaptive method version is unsupported|adaptive suggestions must be a bounded array|adaptive field evidence is invalid|adaptive extraction payload exceeds safe limits|layout blocks and field evidence must be arrays/.test(technicalMessage)) {
    return asOperationError(error, "Não foi possível validar as sugestões de aprendizado deste documento. Nenhuma sugestão foi aplicada e sua revisão permanece preservada. Atualize a página e tente novamente.", "internal", "reload");
  }
  if (/publication removal.+invalid|invalid publication removal/.test(technicalMessage)) {
    return asOperationError(error, "Não foi possível validar uma remoção proposta para a nova versão. Volte à revisão e confirme quais dados devem deixar o perfil antes de publicar.", "validation", "return-to-review");
  }
  if (/retirement reason.+(?:invalid|required)/.test(technicalMessage)) {
    return asOperationError(error, "Informe o motivo da substituição da evidência antes de continuar.", "validation", "review-fields");
  }
  if (/reviewed data has an invalid current contract|reviewed data (?:must be|object is) an? object|structured resume summary is invalid|invalid field lifecycle|reviewed data has an invalid field lifecycle contract|reviewed phone is invalid|education classification contract is invalid/.test(technicalMessage)) {
    return asOperationError(error, "O Prisma não conseguiu atualizar automaticamente esta revisão antiga. Nenhum campo precisa ser corrigido manualmente e nenhuma alteração foi perdida. Recarregue a revisão e tente novamente.", "internal", "reload");
  }
  if (/refinement link is not an active overlapping sibling field/.test(technicalMessage)) {
    return asOperationError(error, "Um vínculo de evidência mudou desde que a seleção foi aberta. A seleção atual foi preservada; recarregue a revisão antes de refiná-la novamente.", "stale-state", "reload");
  }
  if (/review evidence history is immutable/.test(technicalMessage)) {
    return asOperationError(error, "O histórico de evidências não pode ser alterado diretamente. Use as ações de adicionar, substituir ou retirar evidência disponíveis na revisão.", "validation", "review-fields");
  }
  if (error.code === "42702" || /column reference.+ambiguous/.test(technicalMessage)) {
    return asOperationError(error, "Não foi possível concluir a operação por uma inconsistência interna. Suas informações permanecem preservadas. Tente novamente após a atualização do sistema.", "internal", "retry");
  }
  if (["PGRST000", "PGRST001", "PGRST002", "PGRST003", "53300", "57014", "57P01", "57P02", "57P03"].includes(error.code ?? "") || /failed to fetch|networkerror|network request failed|connection refused|timeout/.test(technicalMessage)) {
    return asOperationError(error, "O Prisma não conseguiu se comunicar com o serviço agora. Suas informações permanecem nesta tela. Verifique a conexão e tente novamente.", "unavailable", "retry");
  }
  if (["PGRST202", "PGRST204", "PGRST205", "42P01", "42703"].includes(error.code ?? "") || /schema cache|could not find the function|column.+not found/.test(technicalMessage)) {
    return asOperationError(error, "A operação ainda não está disponível nesta versão do ambiente. Seus dados foram preservados. Atualize a página depois que o ambiente for sincronizado.", "internal", "reload");
  }
  if (error.code === "23505" || /idempotency_conflict|already completed/.test(technicalMessage)) {
    return asOperationError(error, "A operação já foi processada ou entrou em conflito com outra tentativa. Reabra a revisão para carregar o resultado atual.", "conflict", "reload");
  }
  if (error.code === "22023") {
    return asOperationError(error, "O Prisma encontrou uma falha interna antes de concluir a operação. Nenhum campo precisa ser corrigido manualmente, nenhuma alteração foi aplicada e os dados desta tela permanecem preservados. Atualize a página e tente novamente.", "internal", "reload");
  }
  if (["22P02", "23502", "23503", "23514"].includes(error.code ?? "")) {
    return asOperationError(error, "A operação encontrou dados incompletos ou incompatíveis com o estado atual. Nenhuma alteração foi aplicada. Reabra o fluxo para revisar os campos antes de continuar.", "validation", "return-to-review");
  }

  return asOperationError(error, `${fallback} O Prisma encontrou uma falha interna, não um campo preenchido incorretamente. Suas informações permanecem nesta tela. Atualize a página e tente novamente.`, "internal", "reload");
}

export function reviewOperationErrorMessage(error: ReviewOperationError, fallback: string): string {
  return reviewOperationError(error, fallback).message;
}

export function supabaseOperationError(error: ReviewOperationError, fallback: string): PrismaOperationError {
  const technicalMessage = error.message.toLowerCase();
  const domainError = knownDomainOperationError(error, technicalMessage);
  if (domainError) return domainError;
  if (/unsupported file type|file type is not supported/.test(technicalMessage)) {
    return asOperationError(error, "Este formato de arquivo não é aceito. Use um currículo em PDF.", "validation", "none");
  }
  if (/file is too large|maximum file size/.test(technicalMessage)) {
    return asOperationError(error, "O arquivo ultrapassa o tamanho permitido. Reduza o arquivo ou envie uma versão em PDF mais leve.", "validation", "none");
  }
  if (/identity resolution.+invalid|identity candidate.+invalid/.test(technicalMessage)) {
    return asOperationError(error, "Não foi possível confirmar com segurança a quem este currículo pertence. Revise os dados de identificação antes de continuar.", "validation", "review-fields");
  }
  if (/resume intake is already resolved|resume intake was already resolved by another decision/.test(technicalMessage)) {
    return asOperationError(error, "Esta importação já foi vinculada por outra ação. Abra a Central da Pessoa para continuar com o resultado atual.", "conflict", "return-to-review");
  }
  if (/intake.+no longer|intake.+invalid state|resume intake identity is not ready for resolution|completed resume intake cannot be failed/.test(technicalMessage)) {
    return asOperationError(error, "Esta importação já mudou de estado. Reabra a Central da Pessoa para continuar pelo ponto correto.", "stale-state", "return-to-review");
  }
  if (/minimum identity is required|existing person is required for link resolution|person and filename are required|detected name is too long/.test(technicalMessage)) {
    return asOperationError(error, "Os dados de identificação estão incompletos ou inválidos. Confira o nome e ao menos um contato antes de continuar.", "validation", "review-fields");
  }
  if (/person not found in organization|document not found in organization|resume intake not found in organization|resolved resume intake document not found/.test(technicalMessage)) {
    return asOperationError(error, "O registro usado por esta tela não foi localizado na organização ativa. Reabra a Central da Pessoa para carregar o estado atual.", "stale-state", "return-to-review");
  }
  if (/document is not ready for review|reviewable processing attempt not found|valid extraction draft not found|reviewable extraction draft not found/.test(technicalMessage)) {
    return asOperationError(error, "O documento ainda não está pronto para revisão. Abra a Central da Pessoa para ver se é possível reprocessar ou substituir o arquivo.", "stale-state", "return-to-review");
  }
  if (/retry base attempt not found/.test(technicalMessage)) {
    return asOperationError(error, "A tentativa anterior não possui uma base recuperável. Substitua o arquivo para iniciar um novo processamento.", "validation", "none");
  }
  if (/at least one extracted page is required|no pages were extracted|extraction produced no pages|no useful text|invalid extracted page contract/.test(technicalMessage)) {
    return asOperationError(error, "Não foi possível extrair conteúdo legível deste arquivo. Envie outra cópia do currículo, preferencialmente em PDF com texto selecionável.", "validation", "none");
  }
  if (/a structured draft object is required|extraction draft has an invalid/.test(technicalMessage)) {
    return asOperationError(error, "O conteúdo foi lido, mas não pôde ser estruturado com segurança. O arquivo permanece preservado; tente reprocessar pela Central da Pessoa.", "internal", "return-to-review");
  }
  if (/invalid sha256 checksum|invalid document size|invalid page count|invalid idempotency key|invalid failure (?:state|code)|invalid intake failure code|invalid identity resolution action|only validated pdf intake is supported|filename is required/.test(technicalMessage)) {
    return asOperationError(error, "A importação contém metadados inválidos e foi interrompida antes de alterar o perfil. Volte ao envio, selecione o arquivo novamente e tente outra vez.", "validation", "none");
  }
  return reviewOperationError(error, fallback);
}

export async function supabaseFunctionOperationError(error: ReviewOperationError & { context?: unknown }, fallback: string): Promise<PrismaOperationError> {
  const response = error.context;
  if (isReadableResponse(response)) {
    try {
      const payload = await response.clone().json() as unknown;
      if (isErrorPayload(payload)) {
        return supabaseOperationError({ ...error, message: payload.error }, fallback);
      }
    } catch {
      // A resposta sem JSON segue pelo tradutor seguro e nunca chega bruta à interface.
    }
  }
  return supabaseOperationError(error, fallback);
}

function knownDomainOperationError(error: ReviewOperationError, technicalMessage: string): PrismaOperationError | null {
  if (/origem não autorizada|acesso não autorizado|operação não autorizada/.test(technicalMessage)) {
    return asOperationError(error, "Seu perfil ou este endereço de acesso não possui permissão para realizar a ação.", "authorization", "none");
  }
  if (/sessão (?:do operador )?inválida/.test(technicalMessage)) {
    return asOperationError(error, "Sua sessão expirou. Entre novamente para continuar.", "authentication", "sign-in");
  }
  if (/requisição excede o limite permitido/.test(technicalMessage)) {
    return asOperationError(error, "A solicitação contém informações demais para uma única operação. Reduza a seleção e tente novamente.", "validation", "review-fields");
  }
  if (/convite indisponível/.test(technicalMessage)) {
    return asOperationError(error, "Este convite expirou, foi cancelado ou já não está disponível. Solicite um novo convite ao responsável.", "stale-state", "none");
  }
  if (/muitas tentativas/.test(technicalMessage)) {
    return asOperationError(error, "Foram feitas muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.", "unavailable", "retry");
  }
  if (/a resposta mudou em outra sessão/.test(technicalMessage)) {
    return asOperationError(error, "Esta resposta foi atualizada em outra sessão. Recarregue a questão antes de responder novamente.", "conflict", "reload");
  }
  if (/versão (?:de requisição |desta verificação )?não (?:é )?suportada/.test(technicalMessage)) {
    return asOperationError(error, "Esta etapa não está disponível na versão atual do ambiente. Nenhuma informação foi perdida. Atualize a página e tente novamente.", "internal", "reload");
  }
  if (/esta tentativa já foi finalizada ou não pode mais ser alterada/.test(technicalMessage)) {
    return asOperationError(error, "Esta verificação já foi finalizada e não aceita novas respostas. Abra o convite para consultar o resultado disponível.", "stale-state", "reload");
  }
  if (/geração externa indisponível por política ou orçamento/.test(technicalMessage)) {
    return asOperationError(error, "A geração por IA está indisponível porque a política está desativada ou o orçamento foi atingido. Confira as configurações de IA e orçamento.", "validation", "none");
  }
  if (/m51a_requires_person_and_vacancy/.test(technicalMessage)) {
    return asOperationError(error, "Selecione a pessoa e a vaga antes de preparar a verificação.", "validation", "review-fields");
  }
  if (/m51a_requires_vacancy_requirement/.test(technicalMessage)) {
    return asOperationError(error, "Selecione uma competência exigida pela vaga antes de preparar a verificação.", "validation", "review-fields");
  }
  if (/m51a_invalid_prepared_status/.test(technicalMessage)) {
    return asOperationError(error, "Escolha se a verificação deve ficar como rascunho ou pronta para envio.", "validation", "review-fields");
  }
  if (/m51a_need_not_found/.test(technicalMessage)) {
    return asOperationError(error, "A necessidade de verificação não foi localizada. Volte ao matching e abra a recomendação novamente.", "stale-state", "return-to-review");
  }
  if (/m51a_instrument_contract_not_found/.test(technicalMessage)) {
    return asOperationError(error, "A definição selecionada não possui um instrumento de avaliação disponível. Escolha outra definição ou solicite sua configuração.", "validation", "review-fields");
  }
  if (/m51a_insufficient_item_bank_coverage/.test(technicalMessage)) {
    return asOperationError(error, "O banco de itens ainda não possui perguntas suficientes para esta competência e nível. Complete o banco de itens antes de preparar a verificação.", "validation", "none");
  }

  if (/m51b_invalid_delivery_channel/.test(technicalMessage)) {
    return asOperationError(error, "Escolha um canal de envio disponível para emitir o convite.", "validation", "review-fields");
  }
  if (/m51b_invalid_expiry/.test(technicalMessage)) {
    return asOperationError(error, "Informe por quantos dias o convite deve permanecer válido.", "validation", "review-fields");
  }
  if (/m51b_invalid_result_visibility/.test(technicalMessage)) {
    return asOperationError(error, "Escolha quando o resultado poderá ser mostrado à pessoa avaliada.", "validation", "review-fields");
  }
  if (/m51b_(?:prepared_assessment|verification_need|invitation|attempt|question)_not_found/.test(technicalMessage)) {
    return asOperationError(error, "Esta verificação mudou ou não está mais disponível. Reabra a lista de verificações para carregar o estado atual.", "stale-state", "reload");
  }
  if (/m51b_operator_auth_required|m51c_auth_required/.test(technicalMessage)) {
    return asOperationError(error, "Sua sessão expirou. Entre novamente para continuar.", "authentication", "sign-in");
  }
  if (/m51b_access_denied|m51c_active_operator_required|m51c_global_scope_requires_super_admin|m51c_governance_role_required/.test(technicalMessage)) {
    return asOperationError(error, "Seu perfil não possui permissão para realizar esta ação.", "authorization", "none");
  }
  if (/m51b_invitation_unavailable|m51b_attempt_locked/.test(technicalMessage)) {
    return asOperationError(error, "Esta verificação já foi encerrada, cancelada ou atingiu o prazo limite. Abra o convite novamente para consultar o estado atual.", "stale-state", "reload");
  }
  if (/m51b_rate_limited/.test(technicalMessage)) {
    return asOperationError(error, "Foram feitas muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.", "unavailable", "retry");
  }
  if (/m51b_invalid_option/.test(technicalMessage)) {
    return asOperationError(error, "Selecione uma das alternativas disponíveis antes de continuar.", "validation", "review-fields");
  }
  if (/m51b_active_question_required/.test(technicalMessage)) {
    return asOperationError(error, "Abra a questão atual antes de registrar esta ação.", "validation", "reload");
  }
  if (/m51b_attempt_not_active/.test(technicalMessage)) {
    return asOperationError(error, "A verificação não está em andamento. Retome a sessão antes de responder ou finalizar.", "validation", "reload");
  }
  if (/m51b_attempt_not_paused/.test(technicalMessage)) {
    return asOperationError(error, "A verificação já está em andamento e não precisa ser retomada.", "stale-state", "reload");
  }
  if (/m51b_stale_response_version/.test(technicalMessage)) {
    return asOperationError(error, "Esta resposta foi atualizada em outra ação. Recarregue a questão antes de responder novamente.", "conflict", "reload");
  }
  if (/m51b_invalid_token_hash|m51b_invalid_session/.test(technicalMessage)) {
    return asOperationError(error, "Este link de verificação é inválido. Abra novamente o convite recebido.", "validation", "none");
  }
  if (/m51b_unknown_(?:action|assessment_version|instructions_version|evaluation_version)|m51b_invalid_(?:invitation_action|event)|m51b_boundary_configuration_error|m51b_public_access_function_not_found|m51b_dimension_coverage_source_not_found/.test(technicalMessage)) {
    return asOperationError(error, "Esta etapa da verificação não está disponível nesta versão do ambiente. Nenhuma resposta foi perdida. Atualize a página e tente novamente.", "internal", "reload");
  }

  if (/m51c_invalid_request/.test(technicalMessage)) {
    return asOperationError(error, "Revise a quantidade, o domínio e o destino dos itens antes de solicitar a geração.", "validation", "review-fields");
  }
  if (/m51c_blueprint_not_found|m51c_dimension_not_in_blueprint/.test(technicalMessage)) {
    return asOperationError(error, "O blueprint ou a dimensão selecionada não está mais disponível. Atualize a página e faça uma nova seleção.", "stale-state", "reload");
  }
  if (/m51c_no_gap_to_generate/.test(technicalMessage)) {
    return asOperationError(error, "Este recorte já possui a quantidade de itens necessária; não há lacuna para gerar agora.", "validation", "none");
  }
  if (/m51c_quantity_exceeds_gap/.test(technicalMessage)) {
    return asOperationError(error, "A quantidade solicitada é maior que a lacuna identificada. Reduza a quantidade para o limite mostrado na tela.", "validation", "review-fields");
  }
  if (/m51c_generation_need_not_available/.test(technicalMessage)) {
    return asOperationError(error, "Esta lacuna já foi atendida ou está sendo processada. Atualize a lista antes de criar outro pedido.", "stale-state", "reload");
  }
  if (/m51c_ai_generation_disabled/.test(technicalMessage)) {
    return asOperationError(error, "A geração por IA está desativada para esta organização. Ative-a nas configurações antes de criar o pedido.", "validation", "none");
  }
  if (/m51c_competency_not_allowed/.test(technicalMessage)) {
    return asOperationError(error, "A competência selecionada não está autorizada pela política de geração desta organização.", "authorization", "none");
  }
  if (/m51c_request_cost_ceiling_exceeded/.test(technicalMessage)) {
    return asOperationError(error, "O custo estimado deste pedido supera o limite permitido. Reduza a quantidade de itens.", "validation", "review-fields");
  }
  if (/m51c_(?:daily_)?request_limit_exceeded/.test(technicalMessage)) {
    return asOperationError(error, "O limite de pedidos de geração foi atingido. Aguarde a renovação do limite antes de tentar novamente.", "validation", "none");
  }
  if (/m51c_generation_cooldown_active/.test(technicalMessage)) {
    return asOperationError(error, "É necessário aguardar o intervalo entre pedidos de geração. Tente novamente após o período informado na tela.", "validation", "retry");
  }
  if (/m51c_budget_exceeded/.test(technicalMessage)) {
    return asOperationError(error, "O orçamento disponível para geração por IA foi atingido. Ajuste o orçamento ou aguarde sua renovação.", "validation", "none");
  }
  if (/m51c_unknown_(?:actual_)?cost/.test(technicalMessage)) {
    return asOperationError(error, "O custo da geração não pôde ser calculado com segurança. Revise a configuração do modelo antes de continuar.", "internal", "none");
  }
  if (/m51c_human_review_required/.test(technicalMessage)) {
    return asOperationError(error, "Existem itens selecionados que ainda precisam de revisão humana antes da publicação.", "validation", "review-fields");
  }
  if (/m51c_no_proposals_selected/.test(technicalMessage)) {
    return asOperationError(error, "Selecione ao menos um item aprovado para publicar.", "validation", "review-fields");
  }
  if (/m51c_invalid_review/.test(technicalMessage)) {
    return asOperationError(error, "Escolha aprovar, rejeitar ou solicitar ajustes e registre a decisão antes de continuar.", "validation", "review-fields");
  }
  if (/m51c_proposal_not_found|m51c_published_item_not_found|m51c_item_not_available/.test(technicalMessage)) {
    return asOperationError(error, "O item selecionado não está mais disponível. Atualize o banco de itens para carregar o estado atual.", "stale-state", "reload");
  }
  if (/m51c_published_proposal_locked|m51c_append_only_ledger/.test(technicalMessage)) {
    return asOperationError(error, "Este item já foi publicado e seu histórico não pode ser alterado. Crie uma nova versão para propor mudanças.", "validation", "none");
  }
  if (/m51c_item_version_conflict|m51c_idempotency_conflict/.test(technicalMessage)) {
    return asOperationError(error, "O item foi atualizado em outra ação. Atualize a página antes de tentar novamente.", "conflict", "reload");
  }
  if (/m51c_proposal_scope_mismatch/.test(technicalMessage)) {
    return asOperationError(error, "Os itens selecionados pertencem a destinos diferentes. Publique separadamente os itens globais e os itens da organização.", "validation", "review-fields");
  }
  if (/m51c_request_not_(?:completable|failable)|m51c_invalid_provider_output/.test(technicalMessage)) {
    return asOperationError(error, "O pedido de geração não pode avançar no estado atual. Atualize a página para consultar o resultado mais recente.", "stale-state", "reload");
  }

  if (/canonical label is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe o nome padronizado do conceito antes de aprovar a proposta.", "validation", "review-fields");
  }
  if (/proposal is not approvable/.test(technicalMessage)) {
    return asOperationError(error, "Esta proposta já foi decidida ou ainda não está pronta para aprovação. Atualize a lista para consultar o estado atual.", "stale-state", "reload");
  }
  if (/evidence reference not found/.test(technicalMessage)) {
    return asOperationError(error, "A evidência vinculada a esta proposta não foi localizada. Atualize a proposta antes de decidir.", "stale-state", "reload");
  }
  if (/reinterpretation impact not found|profile for reinterpretation not found|no reviewable processing attempt/.test(technicalMessage)) {
    return asOperationError(error, "O perfil selecionado não possui uma revisão disponível para reanálise. Atualize a lista de impactos.", "stale-state", "reload");
  }
  return null;
}

function isReadableResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

function isErrorPayload(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as { error?: unknown }).error === "string";
}

export function operationRecovery(error: unknown): OperationRecovery {
  return error instanceof PrismaOperationError ? error.recovery : "retry";
}

function parseActionableFeedback(details: string | null | undefined): ActionableOperationFeedback | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as Partial<ActionableOperationFeedback>;
    if (parsed.contract !== "operation-feedback-2.0.0" || typeof parsed.reason !== "string") return null;
    return {
      contract: parsed.contract,
      reason: parsed.reason,
      fieldPath: typeof parsed.fieldPath === "string" ? parsed.fieldPath : null,
      itemNumber: typeof parsed.itemNumber === "number" && Number.isInteger(parsed.itemNumber) && parsed.itemNumber > 0 ? parsed.itemNumber : null,
    };
  } catch {
    return null;
  }
}
