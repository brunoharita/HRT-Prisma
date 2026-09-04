import type { PublishedProfileCandidate } from "./profileDiscovery.js";

export const VACANCY_DEFINITION_VERSION = "1.0.0";
export const VACANCY_MATCHING_VERSION = "vacancy-matching-explainable-1.0.0";
export const VACANCY_ASSISTANT_VERSION = "vacancy-structure-deterministic-1.0.0";

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

export function newVacancyRequirement(label = "", category: VacancyRequirementCategory = "competency"): VacancyRequirementDraft {
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
    const searchable = categoryEvidence(candidate, requirement.category);
    const directLabels = unique([requirement.label, requirement.observedTerm ?? "", requirement.conceptLabel ?? ""]);
    const direct = findEvidence(searchable, directLabels);
    const canonical = candidate.knowledge.find((item) =>
      item.state === "resolved" && directLabels.some((label) => normalize(item.canonicalLabel ?? "") === normalize(label)),
    );
    if (direct.length || canonical) {
      const evidence = direct.length ? direct : [{ label: canonical!.originalTerm, source: "Conceito Knowledge publicado" }];
      const observed = evidence[0]!.label;
      return {
        requirement,
        status: "met",
        evidence,
        relatedSignal: null,
        explanation: normalize(observed) === normalize(requirement.label)
          ? `${requirement.label} possui evidência direta no Perfil publicado.`
          : `${requirement.label} foi identificado a partir de “${observed}” com equivalência canônica publicada.`,
      };
    }

    for (const relation of requirement.relatedSignals) {
      const related = findEvidence(allProfileEvidence(candidate), [relation.label]);
      if (related.length) {
        return {
          requirement,
          status: "related_signal",
          evidence: related,
          relatedSignal: relation.label,
          explanation: `${relation.label} é um sinal relacionado confirmado especificamente para esta Vaga. Não comprova ${requirement.label}.`,
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
    [/mercado\s+farmac[eê]utico|ind[uú]stria\s+farmac[eê]utica/, "Mercado farmacêutico", "context", "desired"],
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
    [/\bb2b\b/, "B2B"], [/\benterprise\b/, "Enterprise"], [/\bh[ií]brid[oa]\b/, "Híbrido"],
    [/\bremot[oa]\b/, "Remoto"], [/expans[aã]o\s+regional/, "Expansão regional"], [/mercado\s+farmac[eê]utico/, "Mercado farmacêutico"],
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

function categoryEvidence(candidate: PublishedProfileCandidate, category: VacancyRequirementCategory): VacancyMatchEvidence[] {
  const profile = candidate.profileData;
  if (category === "experience") return profile.experiences.flatMap((item) => [
    item.role ? { label: item.role, source: "Experiência publicada" } : null,
    item.description ? { label: item.description, source: "Descrição da experiência" } : null,
    item.evidenceText ? { label: item.evidenceText, source: "Evidência da experiência" } : null,
  ]).filter(isEvidence);
  if (category === "education") return profile.education.flatMap((item) => [item.course, item.institution, item.level, item.qualification]
    .filter((value): value is string => Boolean(value)).map((label) => ({ label, source: "Formação publicada" })));
  if (category === "certification") return profile.certifications.map((label) => ({ label, source: "Credencial publicada" }));
  if (category === "language") return profile.languages.map((label) => ({ label, source: "Idioma publicado" }));
  if (category === "competency" || category === "knowledge" || category === "technology") {
    return unique([...profile.competencies, ...profile.areasOfExpertise]).map((label) => ({ label, source: "Perfil profissional publicado" }));
  }
  return allProfileEvidence(candidate);
}

function allProfileEvidence(candidate: PublishedProfileCandidate): VacancyMatchEvidence[] {
  const profile = candidate.profileData;
  return [
    ...profile.competencies.map((label) => ({ label, source: "Competência publicada" })),
    ...profile.areasOfExpertise.map((label) => ({ label, source: "Área de atuação publicada" })),
    ...profile.certifications.map((label) => ({ label, source: "Credencial publicada" })),
    ...profile.languages.map((label) => ({ label, source: "Idioma publicado" })),
    ...profile.experiences.flatMap((item) => [item.role, item.organization, item.description, item.evidenceText]
      .filter((value): value is string => Boolean(value)).map((label) => ({ label, source: "Experiência publicada" }))),
    ...profile.education.flatMap((item) => [item.course, item.institution, item.level, item.qualification]
      .filter((value): value is string => Boolean(value)).map((label) => ({ label, source: "Formação publicada" }))),
    ...profile.customSections.flatMap((section) => section.items.map((item) => ({ label: item.value, source: section.name }))),
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

function stripLead(value: string): string {
  return value.replace(/^(a pessoa ser[aá] respons[aá]vel por|ser[aá] respons[aá]vel por|respons[aá]vel por|estamos buscando[^.]*? para)\s*/i, "").replace(/[.]$/, "").trim();
}

function createId(): string { return globalThis.crypto.randomUUID(); }
function isEvidence(value: VacancyMatchEvidence | null): value is VacancyMatchEvidence { return value !== null; }
