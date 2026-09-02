export interface ReviewOperationError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

export type OperationErrorCategory = "authentication" | "authorization" | "conflict" | "validation" | "stale-state" | "unavailable" | "internal";
export type OperationRecovery = "sign-in" | "reload" | "review-fields" | "retry" | "return-to-review" | "none";
export const OPERATION_ERROR_CONTRACT_VERSION = "1.0.0";

export class PrismaOperationError extends Error {
  readonly category: OperationErrorCategory;
  readonly recovery: OperationRecovery;
  readonly technicalCode: string | null;

  constructor(message: string, options: { category: OperationErrorCategory; recovery: OperationRecovery; technicalCode?: string | null }) {
    super(message);
    this.name = "PrismaOperationError";
    this.category = options.category;
    this.recovery = options.recovery;
    this.technicalCode = options.technicalCode ?? null;
  }
}

function asOperationError(error: ReviewOperationError, message: string, category: OperationErrorCategory, recovery: OperationRecovery): PrismaOperationError {
  return new PrismaOperationError(message, { category, recovery, technicalCode: error.code ?? null });
}

export function reviewOperationError(error: ReviewOperationError, fallback: string): PrismaOperationError {
  const technicalMessage = error.message.toLowerCase();

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
    return asOperationError(error, "Informe o Nome completo antes de salvar a revisão.", "validation", "review-fields");
  }
  if (/phone or email is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe ao menos Telefone ou E-mail antes de salvar a revisão.", "validation", "review-fields");
  }
  if (/material professional information is required/.test(technicalMessage)) {
    return asOperationError(error, "Informe ao menos um conteúdo profissional, como resumo, objetivo, resultado, experiência, formação ou competência.", "validation", "review-fields");
  }
  if (/profile contains an unreviewed academic classification/.test(technicalMessage)) {
    return asOperationError(error, "Existe uma formação com classificação acadêmica ainda não revisada. Confira os campos destacados e confirme a classificação antes de aprovar.", "validation", "review-fields");
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
    return asOperationError(error, "A revisão contém dados que não correspondem ao contrato atual do Prisma. Nenhuma alteração foi perdida. Reabra a revisão para atualizar os campos antes de continuar.", "internal", "return-to-review");
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
    return asOperationError(error, "Não foi possível validar esta operação por uma inconsistência interna. Nenhuma alteração foi aplicada e os dados desta tela permanecem preservados.", "internal", "retry");
  }
  if (["22P02", "23502", "23503", "23514"].includes(error.code ?? "")) {
    return asOperationError(error, "A operação encontrou dados incompletos ou incompatíveis com o estado atual. Nenhuma alteração foi aplicada. Reabra o fluxo para revisar os campos antes de continuar.", "validation", "return-to-review");
  }

  return asOperationError(error, `${fallback} Suas informações permanecem nesta tela. Tente novamente; se o problema continuar, reabra o fluxo antes de uma nova tentativa.`, "internal", "retry");
}

export function reviewOperationErrorMessage(error: ReviewOperationError, fallback: string): string {
  return reviewOperationError(error, fallback).message;
}

export function supabaseOperationError(error: ReviewOperationError, fallback: string): PrismaOperationError {
  const technicalMessage = error.message.toLowerCase();
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

export function operationRecovery(error: unknown): OperationRecovery {
  return error instanceof PrismaOperationError ? error.recovery : "retry";
}
