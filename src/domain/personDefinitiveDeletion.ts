export const PERSON_DELETION_CONTRACT_VERSION = "person-definitive-deletion-1.0.0";
export const PERSON_SELF_SERVICE_CONTRACT_VERSION = "person-data-self-service-1.0.0";

export type PersonDeletionActor = "super_admin" | "owner" | "admin" | "self";
export type PersonDeletionOperationStatus =
  | "requested"
  | "locked"
  | "purging"
  | "verifying"
  | "completed"
  | "failed_retryable"
  | "blocked";

export type PersonDependencyAction = "delete" | "revoke" | "detach" | "preserve" | "recalculate";

export interface PersonDependencyClassification {
  resource: string;
  relation: "root" | "exclusive" | "individual_provenance" | "shared" | "reference" | "audit";
  action: PersonDependencyAction;
}

export const PERSON_DEPENDENCY_MATRIX: readonly PersonDependencyClassification[] = [
  { resource: "people", relation: "root", action: "delete" },
  { resource: "person_private_data", relation: "exclusive", action: "delete" },
  { resource: "documents_and_storage", relation: "exclusive", action: "delete" },
  { resource: "document_processing_and_extraction", relation: "exclusive", action: "delete" },
  { resource: "profile_reviews_evidence_and_profiles", relation: "exclusive", action: "delete" },
  { resource: "matching", relation: "exclusive", action: "delete" },
  { resource: "assessment_execution", relation: "exclusive", action: "delete" },
  { resource: "assessment_and_self_service_tokens", relation: "exclusive", action: "revoke" },
  { resource: "knowledge_observations", relation: "individual_provenance", action: "delete" },
  { resource: "knowledge_inbox_references", relation: "individual_provenance", action: "detach" },
  { resource: "published_knowledge", relation: "shared", action: "preserve" },
  { resource: "assessment_item_bank_and_rubrics", relation: "shared", action: "preserve" },
  { resource: "vacancies", relation: "shared", action: "preserve" },
  { resource: "positions", relation: "reference", action: "recalculate" },
  { resource: "merge_redirects", relation: "reference", action: "detach" },
  { resource: "person_deletion_operations", relation: "audit", action: "preserve" },
] as const;

const allowedTransitions: Readonly<Record<PersonDeletionOperationStatus, readonly PersonDeletionOperationStatus[]>> = {
  requested: ["locked", "purging", "blocked", "failed_retryable"],
  locked: ["purging", "blocked", "failed_retryable"],
  purging: ["verifying", "failed_retryable", "blocked"],
  verifying: ["completed", "failed_retryable", "blocked"],
  failed_retryable: ["purging", "blocked"],
  blocked: [],
  completed: [],
};

export function canAdministrativelyDeletePerson(role: string): role is Exclude<PersonDeletionActor, "self"> {
  return role === "super_admin" || role === "owner" || role === "admin";
}

export function canTransitionPersonDeletion(from: PersonDeletionOperationStatus, to: PersonDeletionOperationStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function personSelfServiceScope(organizationId: string, personId: string): string {
  return [PERSON_SELF_SERVICE_CONTRACT_VERSION, "person_data_self_service", organizationId, personId].join(":");
}

export function isPersonSelfServiceCapability(input: {
  contractVersion: string;
  purpose: string;
  organizationId: string;
  personId: string;
  expectedOrganizationId: string;
  expectedPersonId: string;
}): boolean {
  return input.contractVersion === PERSON_SELF_SERVICE_CONTRACT_VERSION
    && input.purpose === "person_data_self_service"
    && input.organizationId === input.expectedOrganizationId
    && input.personId === input.expectedPersonId;
}

export function sanitizePersonDeletionError(code: string): string {
  if (/auth|permission|access_denied/i.test(code)) return "Você não tem permissão para excluir esta Pessoa.";
  if (/preflight|conflict|in_progress/i.test(code)) return "Os dados mudaram ou existe outra operação em andamento. Atualize a página e tente novamente.";
  return "Não foi possível concluir a exclusão. Nenhum sucesso foi registrado. Tente novamente para continuar a operação.";
}

export function isFreshRegistration(previousPersonId: string, newPersonId: string, restoredArtifactCount: number): boolean {
  return Boolean(previousPersonId && newPersonId && previousPersonId !== newPersonId && restoredArtifactCount === 0);
}
