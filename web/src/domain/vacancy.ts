import type { PublishedProfileCandidate } from "./profileDiscovery.js";

export const VACANCY_DEFINITION_VERSION = "1.0.0";
export const VACANCY_MATCHING_VERSION = "vacancy-matching-explainable-1.1.0";
export const VACANCY_ASSISTANT_VERSION = "vacancy-assistant-contextual-1.2.0";

export type VacancyOccupancy = "occupied" | "vacant";
export type VacancySourceKind = "manual" | "organization_role" | "previous_vacancy" | "knowledge_reference" | "assisted_description";
export type VacancyRequirementCategory = "experience" | "competency" | "knowledge" | "technology" | "education" | "certification" | "language" | "context";
export type VacancyRequirementImportance = "required" | "desired";
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
}

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
  requirements: VacancyRequirementMatch[];
  reasons: string[];
  directCount: number;
  partialCount: number;
  relatedCount: number;
  missingRequiredCount: number;
}

export interface VacancyStructureSuggestion {
  id: string;
  label: string;
  category: VacancyRequirementCategory | "responsibility" | "outcome" | "context" | "mission";
  importance: VacancyRequirementImportance;
  origin: "explicit" | "derived";
  reason: string;
  selected: boolean;
}

export interface VacancyAdvisorContext {
  otherVacancies: Array<{ title: string; area: string | null }>;
  roles: Array<{ name: string; requirements: string[] }>;
  knowledge: Array<{ label: string; scope: "global" | "organization"; source: string | null }>;
  knowledgeLookupAvailable: boolean;
}

export interface VacancyAdvisorAnswer {
  internal: string;
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
  };
}

export function newVacancyRequirement(label = "", category: VacancyRequirementCategory = inferRequirementCategory(label)): VacancyRequirementDraft {
  return {
    stableId: createId(),
    label,
    category,
    importance: "required",
    observedTerm: label || null,
    conceptId: null,
    relationMode: "direct",
    relatedSignals: [],
  };
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
  if (!draft.mission.trim()) errors.push("Explique a missão principal da Vaga.");
  if (draft.occupancy === "occupied" && !draft.occupantPersonId) errors.push("Selecione a Pessoa que ocupa esta posição.");
  if (draft.requirements.some((item) => !item.label.trim())) errors.push("Preencha ou remova os requisitos vazios.");
  if (!draft.requirements.length) errors.push("Adicione ao menos um requisito comparável.");
  return errors;
}

export function matchVacancyCandidate(vacancy: VacancyDetail, candidate: PublishedProfileCandidate): VacancyCandidateMatch {
  const requirements = vacancy.requirements.map((requirement): VacancyRequirementMatch => {
    const searchable = allProfileEvidence(candidate);
    const directLabels = unique([requirement.label, requirement.observedTerm ?? "", requirement.conceptLabel ?? ""]);
    const direct = findEvidence(searchable, directLabels);
    const canonical = candidate.knowledge.find((item) =>
      item.state === "resolved" && directLabels.some((label) => normalize(item.canonicalLabel ?? "") === normalize(label)),
    );
    if (direct.length || canonical) {
      const evidence = direct.length ? direct : [{ label: canonical!.originalTerm, source: "Knowledge publicada" }];
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

    for (const relation of requirement.relatedSignals) {
      const related = findEvidence(allProfileEvidence(candidate), [relation.label]);
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
  return {
    candidate,
    requirements,
    reasons: requirements.filter((item) => item.status !== "no_evidence").map((item) => item.status === "related_signal"
      ? `${item.relatedSignal} é um sinal relacionado a ${item.requirement.label}`
      : `${item.requirement.label} possui evidência no Perfil`),
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
  const knowledgeLabels = unique(context.knowledge.map((item) => item.label)).slice(0, 5);
  const explicitAddition = extractExplicitRequirementAddition(question);

  let internal: string;
  let suggestion: string;
  if (/figma/.test(normalizedQuestion) && /\bux\b|user experience/.test(normalizedQuestion)) {
    internal = "Figma pode aparecer como evidência relacionada a UX, mas a ferramenta, isoladamente, não comprova experiência em UX. O Prisma só considera atendimento pleno quando encontra evidência direta ou equivalência canônica publicada.";
    suggestion = "Se Figma for relevante para a execução, mantenha-o como requisito próprio. Preserve UX como requisito separado e deixe a aderência explicar a evidência encontrada para cada um.";
  } else if (/falt|lacuna|complet|revis/.test(normalizedQuestion)) {
    internal = missing.length
      ? `A definição ainda não informa: ${joinHumanList(missing)}.`
      : `Os seis blocos estão preenchidos. A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}; isso descreve a definição, não uma nota de qualidade.`;
    suggestion = missing.includes("contexto da vaga")
      ? "Explique o momento da área, o desafio da posição e o ambiente em que a Pessoa irá atuar, sem repetir requisitos profissionais."
      : "Revise se cada requisito obrigatório é realmente indispensável e se os resultados esperados são observáveis.";
  } else if (/compar|semelh|outras? vagas?|fun[cç][oõ]es?/.test(normalizedQuestion)) {
    const references = [...similarVacancies.map((item) => `Vaga ${item.title}`), ...similarRoles.map((item) => `função ${item.name}`)];
    internal = references.length
      ? `Encontrei referências internas semelhantes: ${joinHumanList(references)}.`
      : "Não encontrei outra Vaga ou função interna claramente semelhante pelos dados atualmente disponíveis.";
    suggestion = "Use as referências internas para comparar propósito, responsabilidades e requisitos, preservando as diferenças do cenário desta Vaga.";
  } else if (/requisit|exig[eê]ncia|demais|muitos|anos?/.test(normalizedQuestion)) {
    internal = `A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}. O Prisma não conclui que a exigência é adequada apenas pela quantidade ou pelo tempo informado.`;
    suggestion = required > 6
      ? "Revise quais itens são indispensáveis e mova diferenciais para Desejável. Para tempo de experiência, descreva a evidência prática esperada sempre que isso for mais preciso do que um número de anos."
      : "Confirme se cada item obrigatório é indispensável para esta necessidade e se existe uma forma mais direta de descrever a experiência esperada.";
  } else {
    const knowledgeText = knowledgeLabels.length ? ` A Knowledge reconheceu referências relacionadas à pergunta: ${joinHumanList(knowledgeLabels)}.` : "";
    internal = `Considerei a Vaga atual, ${context.otherVacancies.length} outras Vagas e ${context.roles.length} funções acessíveis nesta empresa.${knowledgeText}`;
    suggestion = "Formule a decisão que você quer tomar e indique o requisito ou bloco da Vaga envolvido. O Prisma responderá sem alterar a definição automaticamente.";
  }

  const marketRelevant = shouldResearchVacancyMarket(question);
  const market = marketRelevant
    ? "Esta pergunta depende de informação atual de mercado. A pesquisa externa ainda não foi concluída."
    : "Esta resposta usou somente o contexto interno disponível. Nenhuma pesquisa externa foi realizada.";
  if (!context.knowledgeLookupAvailable) internal += " A consulta complementar à Knowledge não estava disponível, então a resposta preservou apenas o contexto já carregado.";

  return {
    internal,
    market,
    suggestion,
    sources: [],
    webSearched: false,
    allowKnowledgeReview: marketRelevant || /knowledge|conceito|compet[eê]ncia|tecnologia|ferramenta/.test(normalizedQuestion),
    suggestedRequirement: explicitAddition,
  };
}

export function shouldResearchVacancyMarket(question: string): boolean {
  const normalizedQuestion = normalize(question);
  return /\b(?:mercado|costum\w*|diferenc\w*|excessiv\w*|anos?|benchmark|tendencia\w*|atual\w*|recent\w*|hoje|popular\w*|demanda|escassez|salario\w*|faixa|remot\w*|setor|industria|cloud|nuvem)\b/.test(normalizedQuestion)
    || /\bmais\s+(?:usad|utilizad)\w*/.test(normalizedQuestion);
}

export function sortVacancyMatches(matches: VacancyCandidateMatch[]): VacancyCandidateMatch[] {
  return [...matches]
    .filter((item) => item.directCount + item.partialCount + item.relatedCount > 0)
    .sort((left, right) =>
      right.directCount - left.directCount
      || right.partialCount - left.partialCount
      || right.relatedCount - left.relatedCount
      || left.missingRequiredCount - right.missingRequiredCount
      || left.candidate.fullName.localeCompare(right.candidate.fullName, "pt-BR"),
    );
}

export function structureVacancyDescription(description: string): VacancyStructureSuggestion[] {
  const text = description.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const normalized = normalize(text);
  const suggestions: VacancyStructureSuggestion[] = [];
  const add = (label: string, category: VacancyStructureSuggestion["category"], importance: VacancyRequirementImportance, origin: "explicit" | "derived", reason: string) => {
    if (suggestions.some((item) => item.category === category && normalize(item.label) === normalize(label))) return;
    suggestions.push({ id: createId(), label, category, importance, origin, reason, selected: origin === "explicit" });
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
  ];
  for (const [pattern, label, category, importance] of termRules) {
    if (pattern.test(normalized)) add(label, category, importance, "explicit", `O termo aparece na descrição fornecida.`);
  }
  if (/liderar|lideran[cç]a/.test(normalized)) {
    const explicit = /lideran[cç]a/.test(normalized);
    add("Liderança de equipes", "competency", "required", explicit ? "explicit" : "derived", explicit
      ? "A competência foi mencionada no texto."
      : "Sugestão derivada do verbo liderar. Precisa de confirmação humana.");
  }

  const sentences = text.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
  const responsibilitySentences = sentences.filter((item) => /\b(liderar|gerenciar|desenvolver|executar|identificar|estruturar|negociar|garantir)\b/i.test(item)).slice(0, 5);
  for (const sentence of responsibilitySentences) add(stripLead(sentence), "responsibility", "required", "explicit", "Atividade descrita explicitamente.");
  for (const sentence of sentences.filter((item) => /\b(meta|resultado|crescimento|receita|expans[aã]o|previsibilidade|reten[cç][aã]o)\b/i.test(item)).slice(0, 4)) {
    add(stripLead(sentence), "outcome", "required", "explicit", "Resultado ou impacto mencionado no texto.");
  }
  if (sentences[0]) add(sentences[0].replace(/[.]$/, ""), "mission", "required", "explicit", "Primeira afirmação usada apenas como proposta de missão.");

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
    ? [{ ...newVacancyRequirement(item.label, item.category as VacancyRequirementCategory), importance: item.importance }]
    : []);
  return { ...base, mission, responsibilities, expectedOutcomes, contextItems, requirements: [...base.requirements, ...requirements], sourceKind: "assisted_description" };
}

function allProfileEvidence(candidate: PublishedProfileCandidate): VacancyMatchEvidence[] {
  const profile = candidate.profileData;
  return [
    ...(profile.professionalTitle ? [{ label: profile.professionalTitle, source: "Título profissional" }] : []),
    ...(profile.summary ? [{ label: profile.summary, source: "Resumo profissional" }] : []),
    ...(profile.professionalObjective ? [{ label: profile.professionalObjective, source: "Objetivo profissional" }] : []),
    ...profile.keyResults.map((item) => ({ label: item.value, source: "Resultados profissionais" })),
    ...profile.competencies.map((label) => ({ label, source: "Competências, conhecimentos e ferramentas" })),
    ...profile.areasOfExpertise.map((label) => ({ label, source: "Áreas de atuação" })),
    ...profile.certifications.map((label) => ({ label, source: "Certificações" })),
    ...profile.languages.map((label) => ({ label, source: "Idiomas" })),
    ...profile.experiences.flatMap((item) => [item.role, item.organization, item.description, item.evidenceText]
      .filter((value): value is string => Boolean(value)).map((label) => ({ label, source: "Experiência profissional" }))),
    ...profile.education.flatMap((item) => [item.course, item.institution, item.level, item.qualification]
      .filter((value): value is string => Boolean(value)).map((label) => ({ label, source: "Formação" }))),
    ...profile.customSections.flatMap((section) => section.items.map((item) => ({ label: item.value, source: section.name }))),
    ...candidate.knowledge.filter((item) => item.state === "resolved").map((item) => ({ label: item.originalTerm, source: "Knowledge publicada" })),
  ];
}

function findEvidence(evidence: VacancyMatchEvidence[], labels: string[]): VacancyMatchEvidence[] {
  return evidence.filter((item) => labels.some((label) => matchesPhrase(item.label, label))).slice(0, 3);
}

function matchesPhrase(value: string, query: string): boolean {
  const normalizedValue = normalize(value);
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return false;
  return normalizedValue === normalizedQuery || normalizedValue.includes(normalizedQuery);
}

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

function createId(): string { return globalThis.crypto.randomUUID(); }
function isEvidence(value: VacancyMatchEvidence | null): value is VacancyMatchEvidence { return value !== null; }
