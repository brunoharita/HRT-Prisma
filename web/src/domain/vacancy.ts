import type { PublishedProfileCandidate } from "./profileDiscovery.js";
import { groupCompetencies, parseLanguage } from "./canonicalProfile.js";

export const VACANCY_DEFINITION_VERSION = "1.1.0";
export const VACANCY_MATCHING_VERSION = "vacancy-matching-explainable-2.1.0";
export const VACANCY_ASSISTANT_VERSION = "vacancy-assistant-contextual-1.3.0";
export const OCCUPATION_RESOLUTION_CONTRACT = "occupation-resolution-on-demand-2.0.0";
export const VACANCY_STRUCTURE_CONTRACT = "vacancy-structure-profile-aligned-2.1.0";

export type VacancyOccupancy = "occupied" | "vacant";
export type VacancySourceKind = "manual" | "organization_role" | "previous_vacancy" | "knowledge_reference" | "assisted_description";
export type VacancyRequirementCategory = "experience" | "competency" | "knowledge" | "technology" | "education" | "certification" | "language" | "context";
export type VacancyRequirementImportance = "required" | "desired" | "unclassified";
export type VacancyRequirementOrigin = "description" | "human";
export type VacancyRestructureDeltaKind = "maintained" | "new" | "changed" | "not_found";
export type VacancyMatchStatus = "met" | "partially_met" | "related_signal" | "no_evidence";

export interface VacancyRelatedSignal {
  label: string;
  conceptId: string | null;
  origin: "operator" | "knowledge" | "deterministic_assistant" | "external_assistant";
}

export interface VacancyRequirementDraft {
  stableId: string;
  label: string;
  category: VacancyRequirementCategory;
  importance: VacancyRequirementImportance;
  origin?: VacancyRequirementOrigin;
  proposedCategory?: VacancyRequirementCategory;
  categoryConfirmed?: boolean;
  importanceConfirmed?: boolean;
  sourceSuggestionId?: string | null;
  observedTerm: string | null;
  conceptId: string | null;
  conceptLabel?: string | null;
  relationMode: "direct" | "related";
  relatedSignals: VacancyRelatedSignal[];
  targetLevel?: "basic" | "intermediate" | "advanced" | null;
  criticality?: "low" | "medium" | "high" | "critical" | null;
  verificationPolicyRequirement?: "none" | "optional" | "recommended" | "required_by_policy" | null;
}

export interface VacancyDraft {
  id: string | null;
  title: string;
  area: string;
  location: string;
  workArrangement: "onsite" | "hybrid" | "remote" | "flexible" | null;
  employmentType: string;
  occupancy: VacancyOccupancy;
  occupantPersonId: string | null;
  mission: string;
  responsibilities: string[];
  expectedOutcomes: string[];
  requirements: VacancyRequirementDraft[];
  contextItems: string[];
  sourceKind: VacancySourceKind;
  sourceVacancyId: string | null;
  jobRoleId: string | null;
  referenceConceptId: string | null;
  saveAsRole: boolean;
  changeKind: "material" | "editorial";
  structureSource: VacancyStructureSource | null;
}

export interface ProfessionalReferenceRelation { id: string; targetConceptId: string; label: string; conceptType: string; relationType: string; source: string | null; sourceVersion: string | null; externalId: string | null; externalUri: string | null; }
export interface ProfessionalReferenceProposal { conceptId: string; label: string; description: string; aliases: string[]; source: string | null; sourceVersion: string | null; externalId: string | null; externalUri: string | null; relations: ProfessionalReferenceRelation[]; }

export interface VacancyStructureSource { originalDescription: string; contractVersion: string; structuredAt: string; items: Array<{ suggestionId: string; category: string; start: number; end: number; method: "explicit" | "faithful_synthesis" }>; }

export interface VacancySummary {
  id: string;
  title: string;
  area: string | null;
  location: string | null;
  employmentType: string | null;
  occupancy: VacancyOccupancy;
  occupantName: string | null;
  definitionVersion: number;
  updatedAt: string;
}

export interface VacancyDetail extends VacancyDraft {
  organizationId: string;
  versionId: string;
  version: number;
  jobRoleName: string;
  occupantName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VacancyMatchEvidence {
  label: string;
  source: string;
  sourceId?: string;
  fieldPath?: string;
  dimension?: VacancyRequirementCategory | "professionalTitle";
  canonicalLabel?: string | null;
}

export type VacancyPositionRelationStatus = "same_reference" | "equivalent_reference" | "related_reference" | "possible_title_relation" | "none";
export type VacancyPositionRelationDecision = "confirmed" | "dismissed" | null;
export type VacancyDetailedEvaluationStatus = "ready" | "pending_classification" | "no_requirements";

export interface VacancyOccupationReference {
  conceptId: string | null;
  canonicalLabel: string;
  aliases: string[];
  relations: Array<{ conceptId: string; label: string; relationType: "equivalent_to" | "related_to" | "is_a" | "broader_than" | "narrower_than" }>;
}

export interface VacancyPositionRelation {
  status: VacancyPositionRelationStatus;
  explanation: string;
  evidence: VacancyMatchEvidence[];
}

export interface VacancyEvidenceAssessment {
  level: "corroborated" | "supported" | "limited";
  evidenceCount: number;
  independentSourceCount: number;
  professionalContextEvidenceCount: number;
  contradictionReview: "not_automatically_evaluated";
  reasons: string[];
}

export interface VacancyRequirementMatch {
  requirement: VacancyRequirementDraft & { id?: string };
  status: VacancyMatchStatus;
  evidence: VacancyMatchEvidence[];
  explanation: string;
  relatedSignal: string | null;
}

export interface VacancyCandidateMatch {
  candidate: PublishedProfileCandidate;
  positionRelation: VacancyPositionRelation;
  positionDecision: VacancyPositionRelationDecision;
  detailedStatus: VacancyDetailedEvaluationStatus;
  unclassifiedRequirementCount: number;
  evidenceAssessment: VacancyEvidenceAssessment;
  requirements: VacancyRequirementMatch[];
  reasons: string[];
  directCount: number;
  partialCount: number;
  relatedCount: number;
  missingRequiredCount: number;
}

export interface VacancyPeopleDiscovery {
  matches: VacancyCandidateMatch[];
  analyzedProfileCount: number;
  publishedProfileCount: number;
  complete: boolean;
  unclassifiedRequirementCount: number;
}

export interface VacancyStructureSuggestion {
  id: string;
  label: string;
  category: VacancyRequirementCategory | "responsibility" | "outcome" | "context" | "mission";
  importance: VacancyRequirementImportance;
  origin: "explicit" | "derived";
  reason: string;
  selected: boolean;
  sourceStart: number;
  sourceEnd: number;
  method: "explicit" | "faithful_synthesis";
}

export interface VacancyRestructureDelta {
  kind: VacancyRestructureDeltaKind;
  requirement: VacancyRequirementDraft;
  proposed: VacancyRequirementDraft | null;
}

export interface VacancyAdvisorContext {
  otherVacancies: Array<{ title: string; area: string | null }>;
  roles: Array<{ name: string; requirements: string[] }>;
  knowledge: Array<{ label: string; scope: "global" | "organization"; source: string | null; relatedLabels?: string[] }>;
  knowledgeLookupAvailable: boolean;
}

export interface VacancyAdvisorAnswer {
  internal: string;
  internalStatus: "sufficient" | "partial" | "insufficient";
  market: string;
  suggestion: string;
  sources: VacancyAdvisorSource[];
  webSearched: boolean;
  allowKnowledgeReview: boolean;
  suggestedRequirement: { label: string; importance: VacancyRequirementImportance } | null;
}

export interface VacancyAdvisorSource {
  url: string;
  title: string;
  publisher: string;
  sourceClass: string;
  retrievedAt: string;
}

export interface VacancyAdvisorMarketResearch {
  marketSummary: string;
  recommendation: string;
  caveats: string[];
  sources: VacancyAdvisorSource[];
  provider: string;
  model: string;
  promptVersion: string;
  outputSchemaVersion: string;
  sourcePolicyVersion: string;
  reused: boolean;
}

export interface OccupationResolution {
  attemptId: string;
  status: "resolved" | "ambiguous" | "completed" | "service_unavailable" | "failed" | "pending_agent" | "needs_human_review" | "manual_allowed";
  decisionOrigin: "existing_reconciliation" | "deterministic_official_resolution" | "agent_assisted_resolution" | "human_reconciliation" | "no_safe_decision" | "no_official_reference" | "manual_organization_concept";
  canonicalConceptId: string | null;
  canonicalLabel: string | null;
  normalizedTerm: string;
  candidates: Array<{ sourceName: string; sourceVersion: string; externalId: string; externalUri: string | null; label: string; description: string; reasonCode: string }>;
  ambiguityReason: string | null;
  reused: boolean;
}

export function occupationResolutionMessage(resolution: OccupationResolution): string {
  if (resolution.status === "resolved" && resolution.canonicalLabel) return `Referência profissional: ${resolution.canonicalLabel}.`;
  if (resolution.status === "pending_agent") return "O Prisma está validando a referência somente nos snapshots oficiais ESCO e O*NET.";
  if (resolution.status === "needs_human_review") return "O Prisma não tomou uma decisão segura. Escolha uma referência oficial no explorador ou declare explicitamente que ela não existe.";
  if (resolution.status === "manual_allowed") return "A ausência de referência oficial foi registrada. Agora é possível cadastrar um conceito ocupacional interno da empresa.";
  if (resolution.status === "service_unavailable") return "A referência profissional está indisponível agora. O rascunho foi preservado para nova tentativa.";
  return "O Prisma não tomou uma decisão segura. Use o explorador de referências oficiais para continuar.";
}

export function emptyVacancyDraft(): VacancyDraft {
  return {
    id: null,
    title: "",
    area: "",
    location: "",
    workArrangement: null,
    employmentType: "",
    occupancy: "vacant",
    occupantPersonId: null,
    mission: "",
    responsibilities: [],
    expectedOutcomes: [],
    requirements: [],
    contextItems: [],
    sourceKind: "manual",
    sourceVacancyId: null,
    jobRoleId: null,
    referenceConceptId: null,
    saveAsRole: false,
    changeKind: "material",
    structureSource: null,
  };
}

export function sourceKindAfterOccupationReference(draft: Pick<VacancyDraft, "sourceKind" | "structureSource">): VacancySourceKind {
  if (draft.structureSource) return "assisted_description";
  return draft.sourceKind === "manual" ? "knowledge_reference" : draft.sourceKind;
}

export function newVacancyRequirement(label = "", category: VacancyRequirementCategory = inferRequirementCategory(label)): VacancyRequirementDraft {
  return {
    stableId: createId(),
    label,
    category,
    proposedCategory: category,
    importance: "unclassified",
    origin: "human",
    categoryConfirmed: false,
    importanceConfirmed: false,
    observedTerm: label || null,
    conceptId: null,
    relationMode: "direct",
    relatedSignals: [],
  };
}

export function materializeVacancyFromProfessionalReference(draft: VacancyDraft, reference: ProfessionalReferenceProposal): VacancyDraft {
  const requirements = reference.relations.flatMap((relation) => {
    const category = referenceRelationCategory(relation);
    if (!category || !relation.label.trim()) return [];
    return [{ ...newVacancyRequirement(relation.label, category), origin: "description" as const, observedTerm: relation.label, conceptId: relation.targetConceptId,
      sourceSuggestionId: relation.id, proposedCategory: category, categoryConfirmed: false, importance: "unclassified" as const, importanceConfirmed: false }];
  });
  const deduplicated = requirements.filter((item, index, all) => all.findIndex((candidate) => candidate.conceptId === item.conceptId || (candidate.category === item.category && normalize(candidate.label) === normalize(item.label))) === index);
  return {
    ...draft,
    title: reference.label,
    mission: reference.description.trim(),
    responsibilities: [],
    expectedOutcomes: [],
    requirements: deduplicated,
    sourceKind: "knowledge_reference",
    referenceConceptId: reference.conceptId,
  };
}

function referenceRelationCategory(relation: ProfessionalReferenceRelation): VacancyRequirementCategory | null {
  if (!/^(requires|uses)$/i.test(relation.relationType)) return null;
  if (relation.conceptType === "technology" || relation.relationType === "uses") return "technology";
  if (relation.conceptType === "knowledge") return "knowledge";
  if (relation.conceptType === "skill") return "competency";
  if (relation.conceptType === "certification") return "certification";
  return null;
}

export const vacancyRequirementCategories: Array<{ value: VacancyRequirementCategory; label: string }> = [
  { value: "experience", label: "Experiência" },
  { value: "knowledge", label: "Conhecimentos" },
  { value: "competency", label: "Competências" },
  { value: "technology", label: "Tecnologias e ferramentas" },
  { value: "education", label: "Formação" },
  { value: "certification", label: "Certificações" },
  { value: "language", label: "Idiomas" },
];

export function vacancyRequirementCategoryLabel(category: VacancyRequirementCategory): string {
  return vacancyRequirementCategories.find((item) => item.value === category)?.label ?? "Requisitos";
}

export function inferRequirementCategory(label: string): VacancyRequirementCategory {
  const value = normalize(label);
  if (/\b(ingles|espanhol|frances|alemao|idioma)\b/.test(value)) return "language";
  if (/\b(certificacao|certificado|pmp|itil|cpa|cissp)\b/.test(value)) return "certification";
  if (/\b(graduacao|pos graduacao|mestrado|doutorado|ensino superior|formacao)\b/.test(value)) return "education";
  if (/\b(sap|salesforce|figma|excel|power bi|tableau|jira|sql|python|java|react|aws|azure|docker)\b/.test(value)) return "technology";
  if (/\b(experiencia|atuacao|vivencia|anos?)\b/.test(value)) return "experience";
  return "knowledge";
}

export function validateVacancyDraft(draft: VacancyDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Informe o título da Vaga.");
  if (draft.occupancy === "occupied" && !draft.occupantPersonId) errors.push("Selecione a Pessoa que ocupa esta posição.");
  if (draft.requirements.some((item) => !item.label.trim())) errors.push("Preencha ou remova os requisitos vazios.");
  return errors;
}

export function validateVacancyReady(draft: Pick<VacancyDraft, "requirements">): string[] {
  return draft.requirements.some((item) => item.label.trim() && item.importance === "unclassified")
    ? ["A descoberta de Pessoas está disponível. Classifique os requisitos pendentes para concluir a avaliação detalhada de aderência."]
    : [];
}

export function matchVacancyCandidate(
  vacancy: VacancyDetail,
  candidate: PublishedProfileCandidate,
  occupationReference: VacancyOccupationReference | null = null,
): VacancyCandidateMatch {
  const positionRelation = matchVacancyPosition(vacancy, candidate, occupationReference);
  const requirements = vacancy.requirements.map((requirement): VacancyRequirementMatch => {
    const searchable = profileEvidenceForCategory(candidate, requirement.category);
    const directLabels = unique([requirement.label, requirement.observedTerm ?? "", requirement.conceptLabel ?? ""]);
    const direct = findExactEvidence(searchable, directLabels);
    const canonical = candidate.knowledge.find((item) =>
      item.state === "resolved"
      && directLabels.some((label) => normalize(item.canonicalLabel ?? "") === normalize(label))
      && knowledgeSupportsCategory(item, requirement.category, searchable),
    );
    if (direct.length || canonical) {
      const evidence = direct.length ? direct : [{
        label: canonical!.originalTerm,
        canonicalLabel: canonical!.canonicalLabel,
        source: "Knowledge publicada",
        sourceId: canonical!.conceptId ?? `knowledge:${normalize(canonical!.originalTerm)}`,
        fieldPath: canonical!.sourceFieldPath ?? "knowledge",
        dimension: requirement.category,
      }];
      const observed = evidence[0]!.label;
      const sources = joinHumanList(unique(evidence.map((item) => item.source)));
      return {
        requirement,
        status: "met",
        evidence,
        relatedSignal: null,
        explanation: normalize(observed) === normalize(requirement.label)
          ? `${requirement.label} possui evidência direta em ${sources}.`
          : `${requirement.label} foi identificado em ${sources} a partir de “${observed}”, com equivalência canônica publicada.`,
      };
    }

    const partial = findPartialEvidence(searchable, directLabels);
    if (partial.length) {
      const observed = partial[0]!.label;
      const sources = joinHumanList(unique(partial.map((item) => item.source)));
      return {
        requirement,
        status: "partially_met",
        evidence: partial,
        relatedSignal: null,
        explanation: `${observed} foi encontrado em ${sources} como evidência parcial. O trecho se relaciona a ${requirement.label}, mas não comprova atendimento integral sem revisão humana.`,
      };
    }

    for (const relation of requirement.relatedSignals) {
      const related = findRelatedSignalEvidence(candidate, relation.label);
      if (related.length) {
        const sources = joinHumanList(unique(related.map((item) => item.source)));
        return {
          requirement,
          status: "related_signal",
          evidence: related,
          relatedSignal: relation.label,
          explanation: `${relation.label} é uma evidência relacionada encontrada em ${sources}. Não comprova atendimento pleno de ${requirement.label}.`,
        };
      }
    }

    return {
      requirement,
      status: "no_evidence",
      evidence: [],
      relatedSignal: null,
      explanation: `O Prisma não possui evidência suficiente para ${requirement.label} no Perfil atual. Isso não significa que a Pessoa não possua essa experiência ou conhecimento.`,
    };
  });
  const directCount = requirements.filter((item) => item.status === "met").length;
  const partialCount = requirements.filter((item) => item.status === "partially_met").length;
  const relatedCount = requirements.filter((item) => item.status === "related_signal").length;
  const missingRequiredCount = requirements.filter((item) => item.status === "no_evidence" && item.requirement.importance === "required").length;
  const unclassifiedRequirementCount = vacancy.requirements.filter((item) => item.importance === "unclassified").length;
  const detailedStatus: VacancyDetailedEvaluationStatus = !vacancy.requirements.length
    ? "no_requirements"
    : unclassifiedRequirementCount
      ? "pending_classification"
      : "ready";
  const evidenceAssessment = assessVacancyEvidence(positionRelation, requirements);
  const requirementReasons = requirements.filter((item) => item.status !== "no_evidence").map((item) => item.status === "related_signal"
    ? `${item.relatedSignal} é um sinal relacionado a ${item.requirement.label}`
    : item.status === "partially_met" ? `${item.requirement.label} possui evidência parcial para revisão` : `${item.requirement.label} possui evidência no Perfil`);
  return {
    candidate,
    positionRelation,
    positionDecision: null,
    detailedStatus,
    unclassifiedRequirementCount,
    evidenceAssessment,
    requirements,
    reasons: unique([
      ...(positionRelation.status !== "none" ? [positionRelation.explanation] : []),
      ...requirementReasons,
      ...(positionRelation.status === "none" && !requirementReasons.length ? ["Perfil publicado disponível para análise manual"] : []),
    ]),
    directCount,
    partialCount,
    relatedCount,
    missingRequiredCount,
  };
}

export function answerVacancyQuestion(question: string, draft: VacancyDraft, context: VacancyAdvisorContext): VacancyAdvisorAnswer {
  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion) {
    return {
      internal: "Escreva uma pergunta sobre esta Vaga.",
      internalStatus: "insufficient",
      market: "Nenhuma pesquisa externa foi realizada.",
      suggestion: "Você pode perguntar sobre lacunas, exigências, funções semelhantes ou um requisito específico.",
      sources: [],
      webSearched: false,
      allowKnowledgeReview: false,
      suggestedRequirement: null,
    };
  }

  const required = draft.requirements.filter((item) => item.importance === "required" && item.label.trim()).length;
  const missing = [
    !draft.title.trim() ? "título" : null,
    !draft.mission.trim() ? "missão" : null,
    !draft.responsibilities.some((item) => item.trim()) ? "responsabilidades" : null,
    !draft.expectedOutcomes.some((item) => item.trim()) ? "resultados esperados" : null,
    !draft.requirements.some((item) => item.label.trim()) ? "requisitos" : null,
    !draft.contextItems.some((item) => item.trim()) ? "contexto da vaga" : null,
  ].filter((item): item is string => Boolean(item));
  const similarVacancies = context.otherVacancies.filter((item) => isSimilarVacancy(item.title, item.area, draft)).slice(0, 4);
  const similarRoles = context.roles.filter((item) => sharesRelevantWord(item.name, draft.title)).slice(0, 4);
  const explicitAddition = extractExplicitRequirementAddition(question);

  let internal: string;
  let internalStatus: VacancyAdvisorAnswer["internalStatus"];
  let suggestion: string;
  if (/figma/.test(normalizedQuestion) && /\bux\b|user experience/.test(normalizedQuestion)) {
    internal = "Figma pode aparecer como evidência relacionada a UX, mas a ferramenta, isoladamente, não comprova experiência em UX. O Prisma só considera atendimento pleno quando encontra evidência direta ou equivalência canônica publicada.";
    internalStatus = "sufficient";
    suggestion = "Se Figma for relevante para a execução, mantenha-o como requisito próprio. Preserve UX como requisito separado e deixe a aderência explicar a evidência encontrada para cada um.";
  } else if (/falt|lacuna|complet|revis/.test(normalizedQuestion)) {
    internal = missing.length
      ? `A definição ainda não informa: ${joinHumanList(missing)}.`
      : `Os seis blocos estão preenchidos. A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}; isso descreve a definição, não uma nota de qualidade.`;
    internalStatus = missing.length ? "partial" : "sufficient";
    suggestion = missing.includes("contexto da vaga")
      ? "Explique o momento da área, o desafio da posição e o ambiente em que a Pessoa irá atuar, sem repetir requisitos profissionais."
      : "Revise se cada requisito obrigatório é realmente indispensável e se os resultados esperados são observáveis.";
  } else if (/compar|semelh|outras? vagas?|fun[cç][oõ]es?/.test(normalizedQuestion)) {
    const references = [...similarVacancies.map((item) => `Vaga ${item.title}`), ...similarRoles.map((item) => `função ${item.name}`)];
    internal = references.length
      ? `Encontrei referências internas semelhantes: ${joinHumanList(references)}.`
      : "Não encontrei outra Vaga ou função interna claramente semelhante pelos dados atualmente disponíveis.";
    internalStatus = references.length ? "sufficient" : "insufficient";
    suggestion = "Use as referências internas para comparar propósito, responsabilidades e requisitos, preservando as diferenças do cenário desta Vaga.";
  } else if (/requisit|exig[eê]ncia|demais|muitos|anos?/.test(normalizedQuestion)) {
    internal = `A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}. O Prisma não conclui que a exigência é adequada apenas pela quantidade ou pelo tempo informado.`;
    internalStatus = "partial";
    suggestion = required > 6
      ? "Revise quais itens são indispensáveis e mova diferenciais para Desejável. Para tempo de experiência, descreva a evidência prática esperada sempre que isso for mais preciso do que um número de anos."
      : "Confirme se cada item obrigatório é indispensável para esta necessidade e se existe uma forma mais direta de descrever a experiência esperada.";
  } else {
    const evidence = advisorInternalEvidence(normalizedQuestion, draft, context);
    internal = evidence.answer;
    internalStatus = evidence.status;
    suggestion = evidence.status === "insufficient"
      ? "Indique o requisito ou bloco da Vaga que deseja avaliar. O Prisma responderá somente com o que estiver representado nas fontes internas autorizadas."
      : "Use esta leitura para revisar a Vaga. Nenhuma resposta altera a definição automaticamente.";
  }

  const marketRelevant = shouldResearchVacancyMarket(question);
  const market = marketRelevant
    ? "Esta pergunta depende de informação atual de mercado. A pesquisa externa ainda não foi concluída."
    : "Esta resposta usou somente o contexto interno disponível. Nenhuma pesquisa externa foi realizada.";
  if (!context.knowledgeLookupAvailable) internal += " A consulta complementar à Knowledge não estava disponível; a resposta preserva somente o contexto interno já carregado.";
  internal += ` ${advisorContextMetadata(context)}`;

  return {
    internal,
    internalStatus,
    market,
    suggestion,
    sources: [],
    webSearched: false,
    allowKnowledgeReview: marketRelevant || /knowledge|conceito|compet[eê]ncia|tecnologia|ferramenta/.test(normalizedQuestion),
    suggestedRequirement: explicitAddition,
  };
}

export function shouldResearchVacancyMarket(question: string): boolean {
  return Boolean(question.trim());
}

export function sortVacancyMatches(matches: VacancyCandidateMatch[]): VacancyCandidateMatch[] {
  return [...matches]
    .sort((left, right) =>
      decisionPriority(right.positionDecision) - decisionPriority(left.positionDecision)
      || positionRelationPriority(right.positionRelation.status) - positionRelationPriority(left.positionRelation.status)
      || right.directCount - left.directCount
      || right.partialCount - left.partialCount
      || right.relatedCount - left.relatedCount
      || left.missingRequiredCount - right.missingRequiredCount
      || left.candidate.fullName.localeCompare(right.candidate.fullName, "pt-BR"),
    );
}

export function isVacancyDiscoveryCandidate(match: VacancyCandidateMatch): boolean {
  return match.positionDecision === "confirmed"
    || match.positionRelation.status !== "none"
    || match.directCount > 0
    || match.partialCount > 0
    || match.relatedCount > 0;
}

export const VACANCY_PROFILE_MATRIX = [
  { category: "professionalTitle", profileDimension: "professionalTitle", matching: true },
  { category: "experience", profileDimension: "experiences", matching: true }, { category: "competency", profileDimension: "competencies", matching: true },
  { category: "knowledge", profileDimension: "competencies", matching: true }, { category: "technology", profileDimension: "toolsAndTechnologies", matching: true },
  { category: "education", profileDimension: "education", matching: true }, { category: "certification", profileDimension: "certifications", matching: true },
  { category: "language", profileDimension: "languages", matching: true }, { category: "mission", profileDimension: "professionalObjective", matching: false },
  { category: "responsibility", profileDimension: "experiences", matching: false }, { category: "outcome", profileDimension: "keyResults", matching: false }, { category: "context", profileDimension: "professionalContexts", matching: false },
] as const;

export function structureVacancyDescription(description: string): VacancyStructureSuggestion[] {
  const text = description.trim();
  if (!text) return [];
  const normalized = normalize(text);
  const suggestions: VacancyStructureSuggestion[] = [];
  const add = (label: string, category: VacancyStructureSuggestion["category"], importance: VacancyRequirementImportance, origin: "explicit" | "derived", reason: string, start = text.toLocaleLowerCase("pt-BR").indexOf(label.toLocaleLowerCase("pt-BR")), method: VacancyStructureSuggestion["method"] = "explicit", end = Math.max(0, start) + Math.max(label.length, 1)) => {
    if (suggestions.some((item) => item.category === category && normalize(item.label) === normalize(label))) return;
    suggestions.push({ id: createId(), label, category, importance, origin, reason, selected: origin === "explicit", sourceStart: Math.max(0, start), sourceEnd: end, method });
  };

  const termRules: Array<[RegExp, string, VacancyRequirementCategory, VacancyRequirementImportance]> = [
    [/vendas?\s+b2b(?:\s+enterprise)?/, "Vendas B2B enterprise", "experience", "required"],
    [/gest[aã]o\s+(?:de\s+)?pipeline|gerenciar\s+(?:o\s+)?(?:funil|pipeline)/, "Gestão de pipeline", "experience", "required"],
    [/negocia(?:r|ç[aã]o)/, "Negociação", "competency", "required"],
    [/salesforce/, "Salesforce", "technology", /desej[aá]vel|diferencial/.test(normalized) ? "desired" : "required"],
    [/mercado\s+farmac[eê]utico|ind[uú]stria\s+farmac[eê]utica/, "Mercado farmacêutico", "experience", "desired"],
    [/ingl[eê]s\s+avan[cç]ado/, "Inglês avançado", "language", "required"],
    [/figma/, "Figma", "technology", "desired"],
    [/\bux\b|user\s+experience/, "UX", "competency", "required"],
    [/\bnode\.?(?:js)?\b/i, "Node.js", "technology", "required"], [/\btypescript\b/i, "TypeScript", "technology", "required"], [/\bpython\b/i, "Python", "technology", "required"], [/\bjava\b/i, "Java", "technology", "required"], [/\bgo\b|golang/i, "Go", "technology", "required"],
    [/\bpostgresql\b/i, "PostgreSQL", "technology", "required"], [/\bmongodb\b/i, "MongoDB", "technology", "required"], [/\bredis\b/i, "Redis", "technology", "required"], [/\brabbitmq\b/i, "RabbitMQ", "technology", "required"], [/\bkafka\b/i, "Kafka", "technology", "required"], [/\bdocker\b/i, "Docker", "technology", "required"], [/\bkubernetes\b/i, "Kubernetes", "technology", "required"], [/\baws\b|amazon web services/i, "AWS", "technology", "required"], [/\bgoogle cloud\b/i, "Google Cloud", "technology", "required"], [/\bazure\b/i, "Azure", "technology", "required"], [/\bterraform\b/i, "Terraform", "technology", "required"], [/\bgithub actions\b/i, "GitHub Actions", "technology", "required"], [/\bjest\b/i, "Jest", "technology", "required"], [/\bpytest\b/i, "PyTest", "technology", "required"], [/\bjunit\b/i, "JUnit", "technology", "required"],
    [/clean architecture/i, "Clean Architecture", "knowledge", "required"], [/design patterns?/i, "Design Patterns", "knowledge", "required"], [/arquitetura de software/i, "Arquitetura de software", "knowledge", "required"], [/seguran[cç]a/i, "Segurança de aplicações", "knowledge", "required"], [/apis? rest/i, "Desenvolvimento de APIs REST", "knowledge", "required"],
  ];
  for (const [pattern, label, category, importance] of termRules) {
    if (pattern.test(normalized) && !isExplicitlyNegated(text, pattern)) add(label, category, importance, "explicit", `O termo aparece na descrição fornecida.`);
  }
  if (/liderar|lideran[cç]a/.test(normalized)) {
    const explicit = /lideran[cç]a/.test(normalized);
    add("Liderança de equipes", "competency", "required", explicit ? "explicit" : "derived", explicit
      ? "A competência foi mencionada no texto."
      : "Sugestão derivada do verbo liderar. Precisa de confirmação humana.");
  }

  const sentences = text.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
  const responsibilitySentences = sentences.filter((item) => /\b(liderar|gerenciar|desenvolver|executar|identificar|estruturar|negociar|garantir|projetar|documentar|implementar|integrar|colaborar)\b/i.test(item)).slice(0, 5);
  for (const sentence of responsibilitySentences) {
    const responsibility = operationalResponsibility(sentence);
    if (responsibility) add(responsibility, "responsibility", "unclassified", "explicit", "Atividade descrita explicitamente.");
  }
  for (const sentence of sentences.filter((item) => /\b(meta|resultado|crescimento|receita|expans[aã]o|previsibilidade|reten[cç][aã]o)\b/i.test(item)).slice(0, 4)) {
    add(stripLead(sentence), "outcome", "required", "explicit", "Resultado ou impacto mencionado no texto.");
  }
  const missionSource = sentences.find((item) => /\b(busca|buscamos|respons[aá]vel|atuar|construir|evoluir|desenvolvedor|analista|gerente)\b/i.test(item));
  if (missionSource) {
    const concise = synthesizeMission(missionSource);
    const sourceStart = text.indexOf(missionSource);
    if (concise && normalize(concise) !== normalize(text)) add(concise, "mission", "required", "explicit", "Síntese fiel de propósito presente na descrição.", sourceStart, "faithful_synthesis", sourceStart + missionSource.length);
  }

  const contextRules: Array<[RegExp, string]> = [
    [/(?:equipe|[aá]rea)\s+(?:est[aá]\s+)?(?:em\s+processo\s+de\s+)?estrutura[cç][aã]o/, "Equipe ou área em processo de estruturação"],
    [/empresa\s+crescendo\s+rapidamente|crescimento\s+acelerado/, "Empresa em crescimento acelerado"],
    [/baixa\s+previsibilidade/, "Área com baixa previsibilidade"],
    [/abrir\s+(?:uma\s+)?nova\s+unidade/, "Posição responsável por abrir uma nova unidade"],
    [/produto\s+(?:em\s+)?fase\s+inicial/, "Produto em fase inicial"],
    [/transforma[cç][aã]o\s+digital/, "Operação passando por transformação digital"],
  ];
  for (const [pattern, label] of contextRules) if (pattern.test(normalized)) add(label, "context", "desired", "explicit", "Contexto mencionado na descrição.");
  return suggestions;
}

export function applyStructureSuggestions(base: VacancyDraft, suggestions: VacancyStructureSuggestion[]): VacancyDraft {
  const selected = suggestions.filter((item) => item.selected);
  const mission = selected.find((item) => item.category === "mission")?.label ?? base.mission;
  const responsibilities = unique([...base.responsibilities, ...selected.filter((item) => item.category === "responsibility").map((item) => item.label)]);
  const expectedOutcomes = unique([...base.expectedOutcomes, ...selected.filter((item) => item.category === "outcome").map((item) => item.label)]);
  const contextItems = unique([...base.contextItems, ...selected.filter((item) => item.category === "context").map((item) => item.label)]);
  const requirementCategories: VacancyRequirementCategory[] = ["experience", "competency", "knowledge", "technology", "education", "certification", "language"];
  const requirements = selected.flatMap((item) => requirementCategories.includes(item.category as VacancyRequirementCategory)
    ? [{
      ...newVacancyRequirement(item.label, item.category as VacancyRequirementCategory),
      origin: "description" as const,
      sourceSuggestionId: item.id,
      importance: "unclassified" as const,
      importanceConfirmed: false,
    }]
    : []);
  const items = selected.map((item) => ({ suggestionId: item.id, category: item.category, start: item.sourceStart, end: item.sourceEnd, method: item.method }));
  return { ...base, mission, responsibilities, expectedOutcomes, contextItems, requirements: [...base.requirements, ...requirements], sourceKind: "assisted_description", structureSource: base.structureSource ? { ...base.structureSource, items } : null };
}

export function compareVacancyRequirements(current: VacancyRequirementDraft[], proposed: VacancyRequirementDraft[]): VacancyRestructureDelta[] {
  const unmatched = new Set(proposed.map((item) => item.stableId));
  const result: VacancyRestructureDelta[] = [];
  for (const item of current) {
    if (item.origin === "human") {
      result.push({ kind: "maintained", requirement: item, proposed: null });
      continue;
    }
    const candidate = proposed.find((next) => normalize(next.label) === normalize(item.label));
    if (!candidate) {
      result.push({ kind: "not_found", requirement: item, proposed: null });
      continue;
    }
    unmatched.delete(candidate.stableId);
    const changed = item.category !== candidate.category || normalize(item.label) !== normalize(candidate.label);
    result.push({
      kind: changed ? "changed" : "maintained",
      requirement: { ...candidate, ...item, ...(candidate.sourceSuggestionId ?? item.sourceSuggestionId ? { sourceSuggestionId: candidate.sourceSuggestionId ?? item.sourceSuggestionId } : {}) },
      proposed: candidate,
    });
  }
  for (const item of proposed.filter((candidate) => unmatched.has(candidate.stableId))) result.push({ kind: "new", requirement: item, proposed: item });
  return result;
}

export function applyVacancyRestructureDelta(current: VacancyRequirementDraft[], delta: VacancyRestructureDelta[], removedStableIds: string[] = []): VacancyRequirementDraft[] {
  const removed = new Set(removedStableIds);
  return delta.flatMap((item) => {
    if (removed.has(item.requirement.stableId)) return [];
    if (item.kind === "new") return [item.requirement];
    return [item.requirement];
  });
}

export function applyStructuredDescription(base: VacancyDraft, description: string, suggestions: VacancyStructureSuggestion[]): VacancyDraft {
  return applyStructureSuggestions({ ...base, structureSource: { originalDescription: description, contractVersion: VACANCY_STRUCTURE_CONTRACT, structuredAt: new Date().toISOString(), items: [] } }, suggestions);
}

function synthesizeMission(sentence: string): string {
  const cleaned = stripLead(sentence).replace(/\bde alto nível\b/gi, "").replace(/\s+/g, " ").trim().replace(/[.]$/, "");
  if (cleaned.length > 220) return cleaned.slice(0, 217).replace(/\s+\S*$/, "") + "...";
  return cleaned;
}

function isExplicitlyNegated(text: string, pattern: RegExp): boolean {
  return text.split(/(?<=[.!?])\s+/).some((sentence) => /\b(?:n[aã]o|sem|nunca)\s+(?:h[aá]|exige|requer|possui|tem)?/i.test(sentence) && new RegExp(pattern.source, pattern.flags.replace("g", "")).test(sentence));
}

function profileEvidenceForCategory(candidate: PublishedProfileCandidate, category: VacancyRequirementCategory): VacancyMatchEvidence[] {
  const profile = candidate.profileData;
  const capabilityGroups = groupCompetencies(profile.competencies, candidate.knowledge, profile.toolsAndTechnologies ?? []);
  const capabilities = (key: "competencies" | "knowledge" | "tools", dimension: VacancyRequirementCategory, source: string) =>
    capabilityGroups.find((group) => group.key === key)?.values.map((item, index) => ({
      label: item.originalTerm ?? item.label,
      canonicalLabel: item.label,
      source,
      sourceId: `${key}:${index}:${normalize(item.originalTerm ?? item.label)}`,
      fieldPath: key === "tools" ? "toolsAndTechnologies" : "competencies",
      dimension,
    })) ?? [];

  if (category === "experience") return profile.experiences.flatMap((item) => [
    item.role ? evidence(item.role, "Experiência profissional", `experience:${item.id}:role`, `experiences.${item.id}.role`, category) : null,
    item.description ? evidence(item.description, "Experiência profissional", `experience:${item.id}:description`, `experiences.${item.id}.description`, category) : null,
    item.evidenceText ? evidence(item.evidenceText, "Experiência profissional", `experience:${item.id}:evidence`, `experiences.${item.id}.evidenceText`, category) : null,
  ].filter((item): item is VacancyMatchEvidence => Boolean(item)));
  if (category === "competency") return capabilities("competencies", category, "Competências");
  if (category === "knowledge") return capabilities("knowledge", category, "Conhecimentos");
  if (category === "technology") return capabilities("tools", category, "Tecnologias e ferramentas");
  if (category === "education") return profile.education.flatMap((item) => [item.course, item.level, item.qualification, item.institution]
    .filter((value): value is string => Boolean(value)).map((label, index) => evidence(label, "Formação", `education:${item.id}:${index}`, `education.${item.id}`, category)));
  if (category === "certification") return profile.certifications.map((label, index) => evidence(label, "Certificações", `certification:${index}`, `certifications.${index}`, category));
  if (category === "language") return profile.languages.flatMap((value, index) => parseLanguage(value).map((item) => evidence(
    [item.language, item.level].filter(Boolean).join(" · "), "Idiomas", `language:${index}`, `languages.${index}`, category,
  )));
  return [];
}

function evidence(label: string, source: string, sourceId: string, fieldPath: string, dimension: NonNullable<VacancyMatchEvidence["dimension"]>): VacancyMatchEvidence {
  return { label, source, sourceId, fieldPath, dimension };
}

function findExactEvidence(evidenceItems: VacancyMatchEvidence[], labels: string[]): VacancyMatchEvidence[] {
  return uniqueEvidence(evidenceItems.filter((item) => labels.some((label) => {
    const normalizedLabel = normalize(label);
    return Boolean(normalizedLabel) && [item.label, item.canonicalLabel ?? ""].some((value) => normalize(value) === normalizedLabel);
  }))).slice(0, 3);
}

function findPartialEvidence(evidenceItems: VacancyMatchEvidence[], labels: string[]): VacancyMatchEvidence[] {
  return uniqueEvidence(evidenceItems.filter((item) => labels.some((label) => {
    const observed = normalize(item.canonicalLabel ?? item.label);
    const expected = normalize(label);
    if (observed.length < 4 || expected.length < 4 || observed === expected) return false;
    return observed.includes(expected) || expected.includes(observed);
  }))).slice(0, 3);
}

function findRelatedSignalEvidence(candidate: PublishedProfileCandidate, label: string): VacancyMatchEvidence[] {
  const normalizedLabel = normalize(label);
  if (!normalizedLabel) return [];
  return uniqueEvidence((["experience", "competency", "knowledge", "technology", "education", "certification", "language"] as VacancyRequirementCategory[])
    .flatMap((category) => profileEvidenceForCategory(candidate, category))
    .filter((item) => [item.label, item.canonicalLabel ?? ""].some((value) => normalize(value) === normalizedLabel || normalize(value).includes(normalizedLabel))))
    .slice(0, 3);
}

function knowledgeSupportsCategory(
  item: PublishedProfileCandidate["knowledge"][number],
  category: VacancyRequirementCategory,
  categoryEvidence: VacancyMatchEvidence[],
): boolean {
  const expectedTypes: Partial<Record<VacancyRequirementCategory, string[]>> = {
    competency: ["skill"], knowledge: ["knowledge", "methodology"], technology: ["technology"], certification: ["certification"],
  };
  if (item.conceptType) return Boolean(expectedTypes[category]?.includes(item.conceptType));
  return categoryEvidence.some((candidate) => normalize(candidate.label) === normalize(item.originalTerm));
}

function matchVacancyPosition(
  vacancy: Pick<VacancyDetail, "title" | "referenceConceptId">,
  candidate: PublishedProfileCandidate,
  reference: VacancyOccupationReference | null,
): VacancyPositionRelation {
  const titleEvidence: VacancyMatchEvidence[] = [
    ...(candidate.profileData.professionalTitle ? [evidence(candidate.profileData.professionalTitle, "Título profissional", "professionalTitle", "professionalTitle", "professionalTitle")] : []),
    ...candidate.profileData.experiences.flatMap((item) => item.role
      ? [evidence(item.role, "Experiência profissional", `experience:${item.id}:role`, `experiences.${item.id}.role`, "professionalTitle")]
      : []),
  ];
  const occupationKnowledge = candidate.knowledge.filter((item) => item.state === "resolved" && item.conceptType === "occupation" && item.conceptId);
  const referenceConceptId = reference?.conceptId ?? vacancy.referenceConceptId;
  const sameReference = referenceConceptId ? occupationKnowledge.find((item) => item.conceptId === referenceConceptId) : null;
  if (sameReference) return {
    status: "same_reference",
    explanation: `Mesma referência ocupacional identificada a partir de “${sameReference.originalTerm}”.`,
    evidence: [{ label: sameReference.originalTerm, canonicalLabel: sameReference.canonicalLabel, source: "Knowledge publicada", sourceId: sameReference.conceptId!, fieldPath: sameReference.sourceFieldPath ?? "knowledge", dimension: "professionalTitle" }],
  };

  const equivalent = reference?.relations.find((relation) => relation.relationType === "equivalent_to" && occupationKnowledge.some((item) => item.conceptId === relation.conceptId));
  if (equivalent) return {
    status: "equivalent_reference",
    explanation: `A Knowledge publicada reconhece ${equivalent.label} como referência ocupacional equivalente.`,
    evidence: occupationKnowledge.filter((item) => item.conceptId === equivalent.conceptId).slice(0, 2).map((item) => ({ label: item.originalTerm, canonicalLabel: item.canonicalLabel, source: "Knowledge publicada", sourceId: item.conceptId!, fieldPath: item.sourceFieldPath ?? "knowledge", dimension: "professionalTitle" })),
  };

  const related = reference?.relations.find((relation) => relation.relationType !== "equivalent_to" && occupationKnowledge.some((item) => item.conceptId === relation.conceptId));
  if (related) return {
    status: "related_reference",
    explanation: `A Knowledge publicada relaciona a posição com ${related.label}; isso não comprova equivalência.`,
    evidence: occupationKnowledge.filter((item) => item.conceptId === related.conceptId).slice(0, 2).map((item) => ({ label: item.originalTerm, canonicalLabel: item.canonicalLabel, source: "Knowledge publicada", sourceId: item.conceptId!, fieldPath: item.sourceFieldPath ?? "knowledge", dimension: "professionalTitle" })),
  };

  const referenceLabels = unique([vacancy.title, reference?.canonicalLabel ?? "", ...(reference?.aliases ?? [])]);
  const titleRelation = titleEvidence.find((item) => referenceLabels.some((label) => occupationalTitlesRelate(label, item.label)));
  if (titleRelation) return {
    status: "possible_title_relation",
    explanation: `Possível relação com a posição identificada em “${titleRelation.label}”. Revise antes de confirmar.`,
    evidence: [titleRelation],
  };
  return { status: "none", explanation: "Nenhuma relação ocupacional automática foi identificada; o Perfil permanece disponível para análise manual.", evidence: [] };
}

function occupationalTitlesRelate(left: string, right: string): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  const leftTokens = occupationalTokens(normalizedLeft);
  const rightTokens = occupationalTokens(normalizedRight);
  return [...leftTokens].filter((token) => rightTokens.has(token)).length >= 2;
}

function occupationalTokens(value: string): Set<string> {
  const stopWords = new Set(["de", "da", "do", "das", "dos", "em", "para", "com", "senior", "pleno", "junior", "especialista"]);
  const aliases: Record<string, string> = {
    gerente: "lideranca", gestor: "lideranca", gestora: "lideranca", coordenador: "lideranca", coordenadora: "lideranca", manager: "lideranca", coordinator: "lideranca", lider: "lideranca", head: "lideranca",
    projeto: "projeto", projetos: "projeto", project: "projeto", pm: "projeto", pmo: "projeto",
    ti: "tecnologia", it: "tecnologia", tecnologia: "tecnologia", tecnologias: "tecnologia", informacao: "tecnologia", informatica: "tecnologia",
  };
  return new Set(value.split(" ").filter((token) => token.length > 1 && !stopWords.has(token)).map((token) => aliases[token] ?? token));
}

function assessVacancyEvidence(position: VacancyPositionRelation, requirements: VacancyRequirementMatch[]): VacancyEvidenceAssessment {
  const evidenceItems = uniqueEvidence([...position.evidence, ...requirements.flatMap((item) => item.evidence)]);
  const independentSourceCount = new Set(evidenceItems.map((item) => item.sourceId ?? `${item.fieldPath}:${normalize(item.label)}`)).size;
  const professionalContextEvidenceCount = evidenceItems.filter((item) => item.fieldPath === "professionalTitle" || item.fieldPath?.startsWith("experiences.")).length;
  const level = independentSourceCount >= 2 && professionalContextEvidenceCount > 0
    ? "corroborated"
    : professionalContextEvidenceCount > 0 || independentSourceCount >= 2
      ? "supported"
      : "limited";
  return {
    level,
    evidenceCount: evidenceItems.length,
    independentSourceCount,
    professionalContextEvidenceCount,
    contradictionReview: "not_automatically_evaluated",
    reasons: [
      `${evidenceItems.length} evidência${evidenceItems.length === 1 ? "" : "s"} rastreável${evidenceItems.length === 1 ? "" : "is"}.`,
      `${independentSourceCount} fonte${independentSourceCount === 1 ? "" : "s"} independente${independentSourceCount === 1 ? "" : "s"}.`,
      professionalContextEvidenceCount ? `${professionalContextEvidenceCount} evidência${professionalContextEvidenceCount === 1 ? "" : "s"} em título ou experiência profissional.` : "Nenhuma evidência contextual em título ou experiência profissional.",
      "Contradições não são concluídas automaticamente; permanecem para revisão humana.",
    ],
  };
}

function uniqueEvidence(items: VacancyMatchEvidence[]): VacancyMatchEvidence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceId ?? item.fieldPath ?? item.source}:${normalize(item.label)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function positionRelationPriority(status: VacancyPositionRelationStatus): number {
  return ({ same_reference: 4, equivalent_reference: 3, related_reference: 2, possible_title_relation: 1, none: 0 } as const)[status];
}

function decisionPriority(decision: VacancyPositionRelationDecision): number {
  return decision === "confirmed" ? 1 : decision === "dismissed" ? -1 : 0;
}

function advisorInternalEvidence(question: string, draft: VacancyDraft, context: VacancyAdvisorContext): { answer: string; status: VacancyAdvisorAnswer["internalStatus"] } {
  const queryWords = new Set(question.split(" ").filter((word) => word.length > 2 && !advisorStopWords.has(word)));
  const questionIncludes = (value: string) => {
    const normalizedValue = normalize(value);
    return normalizedValue.length > 2 && (question.includes(normalizedValue) || normalizedValue.split(" ").some((word) => queryWords.has(word)));
  };
  const knowledge = context.knowledge
    .map((item) => ({ ...item, relatedLabels: unique(item.relatedLabels ?? []) }))
    .filter((item) => questionIncludes(item.label) || item.relatedLabels.some(questionIncludes));
  const vacancyTerms = [draft.title, draft.mission, ...draft.responsibilities, ...draft.expectedOutcomes, ...draft.contextItems, ...draft.requirements.map((item) => item.label)]
    .filter(Boolean)
    .filter(questionIncludes);
  const roleTerms = context.roles.flatMap((role) => [role.name, ...role.requirements]).filter(questionIncludes);
  const knowledgeLabels = unique(knowledge.map((item) => item.label));
  const related = knowledge.flatMap((item) => item.relatedLabels.map((label) => `${item.label} → ${label}`));
  const statements: string[] = [];
  if (vacancyTerms.length) statements.push(`Na Vaga atual, ${joinHumanList(unique(vacancyTerms).slice(0, 4))} aparece ${vacancyTerms.length === 1 ? "como informação relacionada" : "como informações relacionadas"}.`);
  if (roleTerms.length) statements.push(`Nas funções acessíveis, há referência a ${joinHumanList(unique(roleTerms).slice(0, 4))}.`);
  if (knowledgeLabels.length) {
    const provenance = unique(knowledge.map((item) => item.scope === "organization" ? "Knowledge da empresa" : item.source ? `Knowledge Global (${item.source})` : "Knowledge Global"));
    statements.push(`${joinHumanList(provenance)} reconhece ${joinHumanList(knowledgeLabels)}.`);
  }
  if (related.length) statements.push(`As relações publicadas disponíveis conectam ${joinHumanList(unique(related).slice(0, 6))}.`);

  if (!statements.length) return { answer: "Não há informação suficiente na empresa para responder com segurança.", status: "insufficient" };
  if (knowledgeLabels.length && related.length && vacancyTerms.length) return { answer: statements.join(" "), status: "sufficient" };
  return { answer: statements.join(" "), status: "partial" };
}

function advisorContextMetadata(context: VacancyAdvisorContext): string {
  return `Contexto considerado: Vaga atual, ${context.otherVacancies.length} ${context.otherVacancies.length === 1 ? "outra Vaga" : "outras Vagas"} e ${context.roles.length} ${context.roles.length === 1 ? "função acessível" : "funções acessíveis"}.`;
}

const advisorStopWords = new Set([
  "como", "qual", "quais", "porque", "para", "esta", "esse", "isso", "sobre", "entre", "com", "sem", "uma", "uns", "das", "dos", "que", "sao", "são", "tem", "temos", "vaga", "empresa", "prisma", "atual", "relacionam", "relaciona", "relacao", "relação",
]);

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => { const key = normalize(value); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}

function joinHumanList(values: string[]): string {
  if (values.length < 2) return values[0] ?? "nenhuma fonte identificada";
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}

function sharesRelevantWord(left: string, right: string): boolean {
  const leftWords = new Set(normalize(left).split(" ").filter((word) => word.length > 3));
  return normalize(right).split(" ").some((word) => word.length > 3 && leftWords.has(word));
}

function isSimilarVacancy(title: string, area: string | null, draft: VacancyDraft): boolean {
  return Boolean(draft.area.trim() && area && normalize(area) === normalize(draft.area)) || sharesRelevantWord(title, draft.title);
}

function extractExplicitRequirementAddition(question: string): VacancyAdvisorAnswer["suggestedRequirement"] {
  const match = question.match(/(?:adicionar|incluir)[^“\"]{0,40}[“\"]([^”\"]{2,80})[”\"]/i);
  if (!match?.[1]?.trim()) return null;
  return { label: match[1].trim(), importance: /desej[aá]vel/i.test(question) ? "desired" : "required" };
}

function stripLead(value: string): string {
  return value.replace(/^(a pessoa ser[aá] respons[aá]vel por|ser[aá] respons[aá]vel por|respons[aá]vel por|estamos buscando[^.]*? para)\s*/i, "").replace(/[.]$/, "").trim();
}

function operationalResponsibility(value: string): string {
  const cleaned = stripLead(value)
    .replace(/\b(usando|com conhecimento em|com experiência em|utilizando)\s+(?:node\.?js|php|laravel|docker|java|python|kafka|aws|azure)(?:\s*(?:,|e|ou)\s*(?:node\.?js|php|laravel|docker|java|python|kafka|aws|azure))*\b/ig, "")
    .replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/[,:;\-\s]+$/, "").trim();
  if (!cleaned || /^(node\.?js|php|laravel|docker|java|python|kafka|aws|azure)$/i.test(cleaned)) return "";
  return cleaned;
}

function createId(): string { return globalThis.crypto.randomUUID(); }
function isEvidence(value: VacancyMatchEvidence | null): value is VacancyMatchEvidence { return value !== null; }
