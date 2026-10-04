import type { OperationErrorCategory, OperationRecovery } from "./reviewOperationErrors.js";

// Client presentation only; persisted operation-feedback remains 2.0.0.
export const OPERATOR_FEEDBACK_VERSION = "1.0.0";
export const PHONE_CORRECTION_MESSAGE = "Telefone: informe apenas um número com DDD, por exemplo (11) 98888-7777. Se houver vários números, escolha qual usar neste campo. Você também pode deixá-lo vazio se houver um e-mail informado.";

interface OperatorFeedback {
  message: string;
  category: OperationErrorCategory;
  recovery: OperationRecovery;
  fieldPath?: string;
}

export const OPERATOR_FEEDBACK: Readonly<Record<string, OperatorFeedback>> = {
  reviewed_phone_invalid: { message: PHONE_CORRECTION_MESSAGE, category: "validation", recovery: "review-fields", fieldPath: "contact.phone" },
  "reviewed phone is invalid": { message: PHONE_CORRECTION_MESSAGE, category: "validation", recovery: "review-fields", fieldPath: "contact.phone" },
  full_name_required: { message: "Nome completo: preencha o nome da pessoa antes de continuar.", category: "validation", recovery: "review-fields", fieldPath: "identity.fullName" },
  contact_required: { message: "Contato: informe ao menos um telefone com DDD ou um e-mail antes de continuar.", category: "validation", recovery: "review-fields", fieldPath: "contact.phone" },
  professional_information_required: { message: "Informe ao menos um conteúdo profissional, como resumo, objetivo, experiência, formação ou competência.", category: "validation", recovery: "review-fields", fieldPath: "professionalTitle" },
  publication_removal_reason_required: { message: "Motivo da remoção: escreva pelo menos 5 caracteres explicando por que essa informação deve sair do Perfil.", category: "validation", recovery: "return-to-review" },
  "decision reason must contain at least five characters": { message: "Justificativa: escreva pelo menos 5 caracteres explicando sua decisão antes de continuar.", category: "validation", recovery: "review-fields" },
  profile_publication_mode_required: { message: "Escolha Atualizar Perfil ou Substituir Perfil antes de publicar.", category: "validation", recovery: "review-fields" },
  profile_block_target_required: { message: "Na comparação, escolha qual registro do Perfil atual deve receber esta alteração.", category: "validation", recovery: "review-fields" },
  profile_block_target_type_mismatch: { message: "Na comparação, escolha um registro do mesmo grupo: uma experiência deve alterar outra experiência, por exemplo.", category: "validation", recovery: "review-fields" },
  profile_block_target_not_found: { message: "O registro escolhido mudou desde que a tela foi aberta. Atualize a comparação e escolha novamente.", category: "stale-state", recovery: "reload" },
  profile_block_source_not_found: { message: "A informação escolhida já não está nesta proposta. Reabra a revisão e compare novamente antes de publicar.", category: "stale-state", recovery: "return-to-review" },
  review_not_found: { message: "Esta revisão não está mais disponível. Volte ao documento e abra a revisão atual.", category: "stale-state", recovery: "return-to-review" },
  review_not_approvable: { message: "Esta revisão já foi concluída ou arquivada. Abra a Central da Pessoa e crie uma nova revisão para alterar o Perfil.", category: "stale-state", recovery: "return-to-review" },
  profile_source_not_found: { message: "A versão escolhida não está mais disponível. Atualize o histórico e escolha outra versão.", category: "stale-state", recovery: "reload" },
  profile_version_not_found: { message: "Esta versão não está mais disponível para restauração. Atualize o histórico e escolha outra versão.", category: "stale-state", recovery: "reload" },
  document_source_not_found: { message: "O documento escolhido não está mais disponível. Volte à Central da Pessoa e escolha outro documento ou envie um novo currículo.", category: "stale-state", recovery: "return-to-review" },
  document_source_not_reusable: { message: "O processamento deste documento ainda precisa ser concluído. Abra o documento na Central da Pessoa e retome a etapa pendente.", category: "stale-state", recovery: "return-to-review" },
  document_draft_not_reusable: { message: "Este documento não tem uma leitura disponível para revisão. Abra o documento na Central da Pessoa e processe-o novamente.", category: "stale-state", recovery: "return-to-review" },
  document_not_found: { message: "Este documento não está mais disponível. Atualize a Central da Pessoa e escolha um documento existente.", category: "stale-state", recovery: "reload" },
  document_not_found_for_deletion: { message: "Este documento mudou ou já foi excluído. Atualize a Central da Pessoa para ver o estado atual.", category: "stale-state", recovery: "reload" },
  document_changed_before_deletion: { message: "O documento mudou depois da confirmação. Abra a exclusão novamente e confira o impacto antes de confirmar.", category: "stale-state", recovery: "reload" },
  document_deletion_operation_not_found: { message: "A confirmação de exclusão expirou. Abra a exclusão novamente e confira o impacto antes de confirmar.", category: "stale-state", recovery: "return-to-review" },
  material_evidence_required: { message: "A evidência do documento não está disponível para publicação. Abra o documento na Central da Pessoa e processe-o novamente, ou crie uma revisão a partir do Perfil vigente.", category: "validation", recovery: "return-to-review" },
  target_person_not_available: { message: "A pessoa escolhida não está disponível para receber o documento. Atualize a busca e escolha uma pessoa ativa.", category: "stale-state", recovery: "reload" },
  person_not_available: { message: "Este cadastro não está disponível para a alteração. Atualize a Central da Pessoa; se ele foi mesclado, abra o cadastro principal indicado.", category: "stale-state", recovery: "reload" },
  person_state_conflict: { message: "Este cadastro mudou em outra tela. Atualize a Central da Pessoa e confira os dados antes de continuar.", category: "conflict", recovery: "reload" },
  person_lifecycle_invalid: { message: "Vínculo: escolha uma das opções disponíveis antes de salvar.", category: "validation", recovery: "review-fields" },
  merge_same_person: { message: "Para mesclar, escolha dois cadastros diferentes: o duplicado e o cadastro que deve permanecer.", category: "validation", recovery: "review-fields" },
  merge_person_not_available: { message: "Um dos cadastros escolhidos não está mais disponível. Atualize a busca e escolha dois cadastros ativos.", category: "stale-state", recovery: "reload" },
  merge_contact_choice_required: { message: "Na mesclagem, escolha qual valor manter em cada contato marcado como diferente entre os dois cadastros.", category: "validation", recovery: "review-fields" },
  merge_profile_choice_required: { message: "Os dois cadastros possuem um Perfil publicado. Escolha qual Perfil deve permanecer como base antes de confirmar a mesclagem.", category: "validation", recovery: "review-fields" },
};

export function operatorFeedback(reason: string): OperatorFeedback | null {
  return Object.hasOwn(OPERATOR_FEEDBACK, reason) ? OPERATOR_FEEDBACK[reason]! : null;
}
