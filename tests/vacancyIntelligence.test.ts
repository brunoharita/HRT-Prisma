import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyStructureSuggestions,
  answerVacancyQuestion,
  emptyVacancyDraft,
  matchVacancyCandidate,
  newVacancyRequirement,
  shouldResearchVacancyMarket,
  sortVacancyMatches,
  structureVacancyDescription,
  applyStructuredDescription,
  VACANCY_PROFILE_MATRIX,
  occupationResolutionMessage,
  materializeVacancyFromProfessionalReference,
  sourceKindAfterOccupationReference,
  compareVacancyRequirements,
  validateVacancyReady,
  vacancyRequirementCategoryLabel,
  type VacancyDetail,
} from "../web/src/domain/vacancy.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

function profile(overrides: Partial<StructuredDraft> = {}): StructuredDraft {
  return {
    identity: { fullName: "Pessoa Sintética" },
    contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: "Gerente Comercial",
    areasOfExpertise: ["Comercial"],
    professionalObjective: null,
    summary: "Perfil sintético usado somente em teste.",
    keyResults: [],
    experiences: [],
    education: [],
    certifications: [],
    languages: [],
    competencies: [],
    customSections: [],
    uncertainties: [],
    notIdentified: [],
    ...overrides,
  };
}

function candidate(id: string, fullName: string, profileData: StructuredDraft, knowledge: PublishedProfileCandidate["knowledge"] = []): PublishedProfileCandidate {
  return { personId: id, fullName, lifecycle: "employee", operationalStatus: "active", location: "São Paulo, BR", profileId: `profile-${id}`, profileVersion: 1, publishedAt: "2026-09-04T12:00:00Z", profileData, knowledge };
}

function vacancy(title: string, requirementLabels: string[]): VacancyDetail {
  return {
    ...emptyVacancyDraft(),
    id: `vacancy-${title}`,
    organizationId: "organization-a",
    versionId: `version-${title}`,
    version: 1,
    title,
    area: "Comercial",
    mission: "Estruturar a necessidade profissional específica.",
    requirements: requirementLabels.map((label) => ({ ...newVacancyRequirement(label, "competency"), importance: "required", importanceConfirmed: true })),
    jobRoleName: "Gerente Comercial",
    occupantName: null,
    createdAt: "2026-09-04T12:00:00Z",
    updatedAt: "2026-09-04T12:00:00Z",
  };
}

test("duas Vagas com o mesmo cargo-base preservam descoberta diferente", () => {
  const enterprise = vacancy("Gerente Comercial Enterprise", ["Vendas B2B enterprise", "Gestão de pipeline"]);
  const retail = vacancy("Gerente Comercial Varejo", ["Varejo regional", "Canais indiretos"]);
  const enterprisePerson = candidate("enterprise", "Juliana", profile({ competencies: ["Vendas B2B enterprise", "Gestão de pipeline"] }));
  const retailPerson = candidate("retail", "Rafael", profile({ competencies: ["Varejo regional", "Canais indiretos"] }));
  assert.equal(matchVacancyCandidate(enterprise, enterprisePerson).directCount, 2);
  assert.equal(matchVacancyCandidate(enterprise, retailPerson).directCount, 0);
  assert.equal(matchVacancyCandidate(retail, retailPerson).directCount, 2);
  assert.equal(matchVacancyCandidate(retail, enterprisePerson).directCount, 0);
});

test("equivalência Knowledge publicada satisfaz requisito e preserva o termo observado", () => {
  const need = vacancy("Analista de Processos", ["Gestão de Processos"]);
  const person = candidate("bpm", "Camila", profile({ competencies: ["Business Process Management"] }), [
    { originalTerm: "Business Process Management", canonicalLabel: "Gestão de Processos", state: "resolved" },
  ]);
  const result = matchVacancyCandidate(need, person);
  assert.equal(result.requirements[0]?.status, "met");
  assert.match(result.requirements[0]?.explanation ?? "", /Business Process Management/);
});

test("Figma não comprova UX sem relação específica confirmada", () => {
  const need = vacancy("Designer UX", ["UX"]);
  const person = candidate("figma", "Pessoa Figma", profile({ competencies: ["Figma"] }));
  const withoutRelation = matchVacancyCandidate(need, person);
  assert.equal(withoutRelation.requirements[0]?.status, "no_evidence");
  need.requirements[0]!.relatedSignals = [{ label: "Figma", conceptId: null, origin: "operator" }];
  const withRelation = matchVacancyCandidate(need, person);
  assert.equal(withRelation.requirements[0]?.status, "related_signal");
  assert.doesNotMatch(withRelation.requirements[0]?.explanation ?? "", /atendido/i);
});

test("ausência de idioma permanece sem evidência suficiente e nunca vira fato negativo", () => {
  const need = vacancy("Gerente Internacional", ["Inglês avançado"]);
  need.requirements[0]!.category = "language";
  const result = matchVacancyCandidate(need, candidate("language", "Pessoa sem idioma", profile()));
  assert.equal(result.requirements[0]?.status, "no_evidence");
  assert.match(result.requirements[0]?.explanation ?? "", /não possui evidência suficiente/i);
  assert.doesNotMatch(result.requirements[0]?.explanation ?? "", /não possui inglês|não sabe inglês/i);
});

test("requisito consulta somente a dimensão profissional correspondente", () => {
  const need = vacancy("Analista ERP", ["SAP"]);
  need.requirements[0]!.category = "language";
  const person = candidate("sap", "Pessoa SAP", profile({
    competencies: ["SAP"],
    experiences: [{ id: "exp-sap", source: "human", role: "Analista de Sistemas", organization: "Empresa", period: "2024", description: "Implantação do SAP", evidenceText: "Projeto SAP", page: 1 }],
  }));
  assert.equal(matchVacancyCandidate(need, person).requirements[0]?.status, "no_evidence");
  need.requirements[0]!.category = "technology";
  const technology = matchVacancyCandidate(need, person);
  assert.equal(technology.requirements[0]?.status, "met");
  assert.deepEqual(new Set(technology.requirements[0]?.evidence.map((item) => item.source)), new Set(["Tecnologias e ferramentas"]));
});

test("narrativa não comprova requisito e correspondência textual parcial exige revisão humana", () => {
  const need = vacancy("Gerente de Projetos", ["Gestão de projetos"]);
  const narrativeOnly = candidate("narrative", "Pessoa Narrativa", profile({ summary: "Responsável por gestão de projetos", competencies: [] }));
  assert.equal(matchVacancyCandidate(need, narrativeOnly).requirements[0]?.status, "no_evidence");
  const partial = candidate("partial", "Pessoa Parcial", profile({ competencies: ["Gestão de projetos complexos"] }));
  assert.equal(matchVacancyCandidate(need, partial).requirements[0]?.status, "partially_met");
});

test("descoberta ocupacional encontra títulos equivalentes por referência ou experiência sem declarar aderência", () => {
  const need = vacancy("Gerente de projetos de tecnologia da informação", []);
  need.referenceConceptId = "occupation-project-manager";
  const bruno = candidate("bruno", "Bruno Harita Santos", profile({
    professionalTitle: "Executivo de Transformação & Tecnologia",
    experiences: [{ id: "project", source: "human", role: "Trajetória em Customer Success, Projetos, Produto e Liderança de Tecnologia", organization: "Empresa", period: "2020 - 2024", description: "Gestão de projetos", evidenceText: "Projetos e Liderança de Tecnologia", page: 1 }],
  }));
  const relation = matchVacancyCandidate(need, bruno, { conceptId: "occupation-project-manager", canonicalLabel: need.title, aliases: ["Gestor de projetos de TI"], relations: [] });
  assert.equal(relation.positionRelation.status, "possible_title_relation");
  assert.equal(relation.detailedStatus, "no_requirements");
  assert.match(relation.positionRelation.explanation, /Projetos, Produto e Liderança de Tecnologia/);

  const sameReference = candidate("same", "Pessoa Mesma Referência", profile(), [{ originalTerm: "Gestor de projetos de TI", canonicalLabel: need.title, state: "resolved", conceptId: "occupation-project-manager", conceptType: "occupation", sourceFieldPath: "professionalTitle" }]);
  assert.equal(matchVacancyCandidate(need, sameReference, { conceptId: "occupation-project-manager", canonicalLabel: need.title, aliases: [], relations: [] }).positionRelation.status, "same_reference");
});

test("todos os Perfis permanecem visíveis e decisões humanas influenciam apenas a ordem", () => {
  const need = vacancy("Gerente de Projetos", ["Gestão de projetos"]);
  const related = matchVacancyCandidate(need, candidate("related", "Relacionada", profile({ competencies: ["Gestão de projetos"] })));
  const manual = matchVacancyCandidate(need, candidate("manual", "Análise Manual", profile({ professionalTitle: "Analista Financeiro" })));
  manual.positionDecision = "dismissed";
  const ordered = sortVacancyMatches([manual, related]);
  assert.deepEqual(ordered.map((item) => item.candidate.personId), ["related", "manual"]);
  assert.equal(ordered.length, 2);
  assert.match(manual.reasons[0] ?? "", /análise manual/i);

  manual.positionDecision = "confirmed";
  assert.deepEqual(sortVacancyMatches([related, manual]).map((item) => item.candidate.personId), ["manual", "related"]);
});

test("ordenação é determinística e explicável sem score exposto", () => {
  const need = vacancy("Gerente Comercial", ["Negociação", "Salesforce"]);
  const one = candidate("one", "Ana", profile({ competencies: ["Negociação"] }));
  const two = candidate("two", "Bruno", profile({ competencies: ["Negociação", "Salesforce"] }));
  const ordered = sortVacancyMatches([matchVacancyCandidate(need, one), matchVacancyCandidate(need, two)]);
  assert.deepEqual(ordered.map((item) => item.candidate.personId), ["two", "one"]);
  assert.ok(ordered.every((item) => item.reasons.every((reason) => !/%|nota|vencedor/i.test(reason))));
});

test("evidência inclui dimensão, origem observável e nível explicável sem score", () => {
  const need = vacancy("Gerente Comercial", ["Negociação"]);
  const person = candidate("evidence", "Pessoa com Evidência", profile({ competencies: ["Negociação"] }));
  const match = matchVacancyCandidate(need, person);
  assert.equal(match.requirements[0]?.evidence[0]?.dimension, "competency");
  assert.equal(match.evidenceAssessment.level, "corroborated");
  assert.equal(match.evidenceAssessment.contradictionReview, "not_automatically_evaluated");
  assert.ok(match.evidenceAssessment.reasons.some((reason) => /fonte/i.test(reason)));
});

test("tecnologias explícitas e legadas são materializadas na dimensão correta", () => {
  const need = vacancy("Engenheiro Cloud", ["AWS"]);
  need.requirements[0]!.category = "technology";
  const explicit = candidate("explicit-tool", "Ferramenta Explícita", profile({ competencies: [], toolsAndTechnologies: ["AWS"] }));
  const legacy = candidate("legacy-tool", "Ferramenta Legada", profile({ competencies: ["AWS"] }));
  assert.equal(matchVacancyCandidate(need, explicit).requirements[0]?.status, "met");
  assert.equal(matchVacancyCandidate(need, legacy).requirements[0]?.status, "met");
});

test("descoberta pagina todos os Perfis e persiste confirmação ou descarte sem tabela paralela", async () => {
  const [profileService, vacancyServiceSource, page] = await Promise.all([
    readFile("web/src/infrastructure/supabase/profileDiscoveryService.ts", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
  ]);
  assert.match(profileService, /PROFILE_DISCOVERY_PAGE_SIZE = 200/);
  assert.match(profileService, /while \(true\)[\s\S]*?\.range\(from, from \+ PROFILE_DISCOVERY_PAGE_SIZE - 1\)/);
  assert.doesNotMatch(profileService, /MAX_PILOT_PROFILES/);
  assert.match(vacancyServiceSource, /type: "position_relation_decision"/);
  assert.match(vacancyServiceSource, /recordPositionRelationDecision/);
  assert.match(page, /Confirmar relação/);
  assert.match(page, /Não considerar/);
  assert.match(page, /Perfis publicados analisados/);
});

test("estruturação livre confirma itens explícitos e deixa inferência derivada pendente", () => {
  const suggestions = structureVacancyDescription("Buscamos um Gerente Comercial para liderar o time de vendas B2B enterprise e gerenciar o pipeline. Salesforce é desejável. A área está em processo de estruturação.");
  assert.equal(suggestions.find((item) => item.label === "Salesforce")?.selected, true);
  assert.equal(suggestions.find((item) => item.label === "Salesforce")?.importance, "desired");
  assert.equal(suggestions.find((item) => item.label === "Liderança de equipes")?.origin, "derived");
  assert.equal(suggestions.find((item) => item.label === "Liderança de equipes")?.selected, false);
  const draft = applyStructureSuggestions(emptyVacancyDraft(), suggestions);
  assert.ok(draft.requirements.some((item) => item.label === "Vendas B2B enterprise"));
  assert.ok(!draft.requirements.some((item) => item.label === "Liderança de equipes"));
  assert.ok(draft.contextItems.some((item) => /estruturação/i.test(item)));
});

test("estruturação não expõe contexto profissional como cenário da vaga", () => {
  const suggestions = structureVacancyDescription("Buscamos experiência no mercado farmacêutico. A área está em processo de estruturação e possui baixa previsibilidade.");
  assert.equal(suggestions.find((item) => item.label === "Mercado farmacêutico")?.category, "experience");
  assert.ok(suggestions.some((item) => item.category === "context" && /estruturação/i.test(item.label)));
  assert.ok(suggestions.some((item) => item.category === "context" && /previsibilidade/i.test(item.label)));
});

test("M5.4.5 decompõe descrição backend sem cópia, invenção ou requisito ausente", () => {
  const source = "Buscamos desenvolvedor backend para projetar APIs REST seguras usando Node.js e PostgreSQL. Deve aplicar Clean Architecture e trabalhar com Docker. Não há certificação, idioma ou Kubernetes.";
  const suggestions = structureVacancyDescription(source);
  const draft = applyStructuredDescription(emptyVacancyDraft(), source, suggestions);
  assert.notEqual(draft.mission, source);
  assert.ok(draft.responsibilities.every((item) => item !== source));
  assert.ok(draft.requirements.some((item) => item.label === "Node.js" && item.category === "technology"));
  assert.ok(draft.requirements.some((item) => item.label === "PostgreSQL" && item.category === "technology"));
  assert.ok(draft.requirements.some((item) => item.label === "Clean Architecture" && item.category === "knowledge"));
  assert.ok(draft.requirements.every((item) => item.importance === "unclassified"));
  assert.ok(!draft.requirements.some((item) => item.label === "Kubernetes"));
  assert.ok(!draft.requirements.some((item) => item.category === "language" || item.category === "certification"));
  assert.equal(draft.structureSource?.originalDescription, source);
  assert.ok((draft.structureSource?.items.length ?? 0) > 0);
  assert.ok(VACANCY_PROFILE_MATRIX.filter((item) => item.matching).every((item) => ["professionalTitle", "experience", "competency", "knowledge", "technology", "education", "certification", "language"].includes(item.category)));
});

test("M5.4.6 exige decisão humana de importância e mantém dimensões canônicas", () => {
  const requirement = newVacancyRequirement("Node.js", "technology");
  assert.equal(requirement.importance, "unclassified");
  assert.match(validateVacancyReady({ requirements: [requirement] })[0] ?? "", /descoberta.*disponível/i);
  requirement.importance = "desired";
  assert.deepEqual(validateVacancyReady({ requirements: [requirement] }), []);
  assert.equal(vacancyRequirementCategoryLabel("technology"), "Tecnologias e ferramentas");
});

test("M5.4.6 não promove stack isolada a responsabilidade e preserva decisão humana no delta", () => {
  const suggestions = structureVacancyDescription("Desenvolver aplicações usando Node.js e Docker. Implementar APIs REST.");
  const responsibilities = suggestions.filter((item) => item.category === "responsibility").map((item) => item.label);
  assert.ok(responsibilities.every((item) => !/^(node\.?js|docker)$/i.test(item)));
  const human = { ...newVacancyRequirement("Inglês avançado", "language"), origin: "human" as const, importance: "desired" as const, importanceConfirmed: true };
  const described = { ...newVacancyRequirement("Node.js", "technology"), origin: "description" as const, importance: "required" as const, importanceConfirmed: true };
  const delta = compareVacancyRequirements([human, described], [{ ...newVacancyRequirement("Kafka", "technology"), origin: "description" as const }]);
  assert.equal(delta.find((item) => item.requirement.stableId === human.stableId)?.kind, "maintained");
  assert.equal(delta.find((item) => item.requirement.stableId === described.stableId)?.kind, "not_found");
  assert.equal(delta.find((item) => item.requirement.label === "Kafka")?.kind, "new");
});

test("M5.4.6 projeta a Vaga pronta sem agrupadores removidos e usa o Inbox organizacional", async () => {
  const [page, migration, service] = await Promise.all([
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
    readFile("supabase/migrations/20260907130000_m546_vacancy_canonical_review.sql", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
  ]);
  assert.match(page, /title="Sobre a posição"/);
  assert.match(page, /title="Requisitos obrigatórios"/);
  assert.match(page, /title="Requisitos desejáveis"/);
  assert.match(page, /Todos obrigatórios/);
  assert.match(page, /Todos desejáveis/);
  assert.match(page, /Quero classificar/);
  assert.match(page, /vacancyRequirementCategories/);
  assert.doesNotMatch(page.match(/export function VacancyDetailPage[\s\S]*?export function VacancyPeoplePage/)?.[0] ?? "", /Missão da vaga|O que procuramos|Contexto da vaga/);
  assert.match(migration, /unclassified/);
  assert.match(migration, /vacancy_requirement_dimension_feedback/);
  assert.match(migration, /insert into public\.knowledge_inbox/);
  assert.match(migration, /scope.*organization/);
  assert.match(migration, /revoke all on function public\.save_vacancy_definition/);
  assert.doesNotMatch(service.match(/async findPeople[\s\S]*?async loadPeopleByIds/)?.[0] ?? "", /Classifique cada requisito ativo/);
  assert.match(page, /Requisitos para classificar/);
});

test("referência ocupacional complementa a descrição estruturada sem substituir sua origem", async () => {
  const structured = applyStructuredDescription(emptyVacancyDraft(), "Buscamos uma pessoa para desenvolver APIs em Node.js.", structureVacancyDescription("Buscamos uma pessoa para desenvolver APIs em Node.js."));
  assert.equal(sourceKindAfterOccupationReference(structured), "assisted_description");
  assert.equal(sourceKindAfterOccupationReference(emptyVacancyDraft()), "knowledge_reference");
  const hotfix = await readFile("supabase/migrations/20260907110000_m545_preserve_assisted_description_origin.sql", "utf8");
  assert.match(hotfix, /source_kind = 'assisted_description'/);
  assert.match(hotfix, /source_kind in \('assisted_description', 'knowledge_reference'\)/);
});

test("referência profissional materializa proposta canônica sem inventar dados da empresa", () => {
  const proposal = materializeVacancyFromProfessionalReference(emptyVacancyDraft(), {
    conceptId: "occupation-project-manager", label: "Gerente de projetos de tecnologia da informação", description: "Planeja e coordena projetos de tecnologia da informação.", aliases: ["Gerente de projetos TI"], source: "O*NET", sourceVersion: "31.0", externalId: "O*NET:occupation:15-1299.09", externalUri: "https://www.onetonline.org/", relations: [
      { id: "11111111-1111-4111-8111-111111111111", targetConceptId: "knowledge-project", label: "Administração de projetos", conceptType: "knowledge", relationType: "requires", source: "O*NET", sourceVersion: "31.0", externalId: null, externalUri: null },
      { id: "22222222-2222-4222-8222-222222222222", targetConceptId: "technology-jira", label: "Jira", conceptType: "technology", relationType: "uses", source: "O*NET", sourceVersion: "31.0", externalId: null, externalUri: null },
      { id: "33333333-3333-4333-8333-333333333333", targetConceptId: "related-occupation", label: "Analista de projetos", conceptType: "occupation", relationType: "related_to", source: "O*NET", sourceVersion: "31.0", externalId: null, externalUri: null },
    ],
  });
  assert.equal(proposal.sourceKind, "knowledge_reference");
  assert.equal(proposal.title, "Gerente de projetos de tecnologia da informação");
  assert.match(proposal.mission, /coordena projetos/i);
  assert.deepEqual(proposal.responsibilities, []);
  assert.deepEqual(proposal.expectedOutcomes, []);
  assert.equal(proposal.location, ""); assert.equal(proposal.workArrangement, null); assert.equal(proposal.employmentType, "");
  assert.deepEqual(proposal.requirements.map((item) => [item.label, item.category, item.importance]), [["Administração de projetos", "knowledge", "unclassified"], ["Jira", "technology", "unclassified"]]);
  assert.equal(proposal.requirements.every((item) => item.conceptId && item.sourceSuggestionId && !item.importanceConfirmed), true);
});

test("M5.4.5 preserva proveniência no snapshot sem reescrever versões históricas", async () => {
  const migration = await readFile("supabase/migrations/20260907020000_m545_vacancy_structure_provenance.sql", "utf8");
  assert.match(migration, /add column if not exists structure_source/i);
  assert.match(migration, /record_vacancy_structure_source/i);
  assert.match(migration, /VACANCY_STRUCTURE_SOURCE_INVALID/);
  assert.match(migration, /private\.has_org_role/);
  assert.match(migration, /revoke all on function/i);
  assert.doesNotMatch(migration, /professional_profiles|web_search/i);
});

test("Assistente Prisma separa contexto interno, mercado e sugestão sem fingir pesquisa externa", () => {
  const draft = vacancy("Product Owner", ["Discovery de produto"]);
  draft.contextItems = [];
  const answer = answerVacancyQuestion("O que está faltando nesta vaga de Product Owner?", draft, {
    otherVacancies: [{ title: "Product Manager", area: "Produto" }],
    roles: [{ name: "Product Owner", requirements: ["Discovery de produto"] }],
    knowledge: [{ label: "Product Owner", scope: "global", source: "CBO" }],
    knowledgeLookupAvailable: true,
  });
  assert.match(answer.internal, /contexto da vaga/i);
  assert.match(answer.market, /pesquisa externa ainda não foi concluída/i);
  assert.match(answer.suggestion, /momento da área/i);
});

test("Assistente Prisma encaminha qualquer pergunta preenchida para pesquisa de mercado por padrão", () => {
  const question = "Quais são as linguagens mais utilizadas atualmente no desenvolvimento de sistemas em cloud?";
  const answer = answerVacancyQuestion(question, vacancy("Engenheiro Cloud", ["Desenvolvimento cloud"]), {
    otherVacancies: [], roles: [], knowledge: [], knowledgeLookupAvailable: true,
  });
  assert.equal(shouldResearchVacancyMarket(question), true);
  assert.equal(answer.webSearched, false);
  assert.match(answer.market, /depende de informação atual de mercado/i);
  assert.equal(shouldResearchVacancyMarket("Explique este requisito da Vaga."), true);
  assert.equal(shouldResearchVacancyMarket("   "), false);
});

test("Assistente Prisma encaminha requisitos comuns em vagas do mercado", () => {
  assert.equal(shouldResearchVacancyMarket("Quais são os requisitos mais comuns para gerente de projetos de TI? Traga os 5 mais requisitados em vagas de grandes empresas."), true);
});

test("Assistente Prisma responde semanticamente com Knowledge interna, relações publicadas e metadados secundários", () => {
  const draft = vacancy("Engenheiro Cloud", ["Kubernetes", "Azure"]);
  const sufficient = answerVacancyQuestion("Como Kubernetes e Azure se relacionam nesta empresa?", draft, {
    otherVacancies: [{ title: "SRE", area: "Tecnologia" }],
    roles: [{ name: "Engenheiro Cloud", requirements: ["Kubernetes", "Azure"] }],
    knowledge: [
      { label: "Kubernetes", scope: "global", source: "CNCF", relatedLabels: ["Azure", "Orquestração de contêineres"] },
      { label: "Azure", scope: "global", source: "Microsoft Learn", relatedLabels: ["Kubernetes"] },
    ],
    knowledgeLookupAvailable: true,
  });
  assert.equal(sufficient.internalStatus, "sufficient");
  assert.match(sufficient.internal, /Vaga atual.*Kubernetes.*Azure/i);
  assert.match(sufficient.internal, /relações publicadas.*Kubernetes.*Azure/i);
  assert.match(sufficient.internal, /Contexto considerado:/i);
  assert.doesNotMatch(sufficient.internal, /^Considerei a Vaga atual/i);

  const partial = answerVacancyQuestion("O que a empresa registra sobre Kubernetes?", draft, {
    otherVacancies: [], roles: [],
    knowledge: [{ label: "Kubernetes", scope: "global", source: "CNCF" }], knowledgeLookupAvailable: true,
  });
  assert.equal(partial.internalStatus, "partial");
  assert.match(partial.internal, /Kubernetes/i);

  const insufficient = answerVacancyQuestion("A empresa usa Rust?", draft, {
    otherVacancies: [], roles: [], knowledge: [], knowledgeLookupAvailable: true,
  });
  assert.equal(insufficient.internalStatus, "insufficient");
  assert.match(insufficient.internal, /Não há informação suficiente na empresa para responder com segurança\./);
  assert.match(insufficient.internal, /Contexto considerado:/);
});

test("Assistente Prisma preserva a análise interna quando a pesquisa externa falha e não usa Web para compô-la", async () => {
  const question = "Quais tecnologias cloud são mais utilizadas atualmente?";
  const internal = answerVacancyQuestion(question, vacancy("Engenheiro Cloud", ["Kubernetes"]), {
    otherVacancies: [], roles: [], knowledge: [{ label: "Kubernetes", scope: "global", source: "CNCF", relatedLabels: ["Orquestração"] }], knowledgeLookupAvailable: true,
  });
  assert.equal(shouldResearchVacancyMarket(question), true);
  const externalFailure = { ...internal, market: "Não foi possível consultar o mercado agora. A análise interna foi preservada.", sources: [], webSearched: false };
  assert.equal(externalFailure.internal, internal.internal);
  assert.match(externalFailure.market, /análise interna foi preservada/i);

  const [page, service, relations] = await Promise.all([
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
    readFile("supabase/migrations/20260826201154_m4_knowledge_foundation.sql", "utf8"),
  ]);
  assert.match(page, /const answer = answerVacancyQuestion\(/);
  assert.match(page, /\.\.\.answer, market: errorMessage/);
  assert.match(service, /suggest_knowledge_concepts", \{ p_organization_id: organizationId/);
  assert.match(service, /from\("knowledge_relations"\)\.select/);
  assert.doesNotMatch(service.match(/async suggestAdvisorKnowledge[\s\S]*?async researchAdvisorMarket/)?.[0] ?? "", /\.insert\(|\.update\(|\.delete\(/);
  assert.match(relations, /knowledge_relations_read.*private\.has_org_role/i);
});

test("Web Search da Vaga reutiliza Knowledge Agent com contrato, fontes e auditoria fail-closed", async () => {
  const [agent, migration, actorIndex, page] = await Promise.all([
    readFile("supabase/functions/knowledge-agent/index.ts", "utf8"),
    readFile("supabase/migrations/20260904235900_m54_vacancy_advisor_web_search.sql", "utf8"),
    readFile("supabase/migrations/20260905023000_m54_vacancy_advisor_actor_index.sql", "utf8"),
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
  ]);
  assert.match(agent, /payload\?\.mode === "vacancy_advisor"/);
  assert.match(agent, /vacancy-advisor-request-1\.0\.0/);
  assert.match(agent, /store: false/);
  assert.match(agent, /tool_choice: "required"/);
  assert.match(agent, /include: \["web_search_call\.action\.sources"\]/);
  assert.match(agent, /rejectObviousPii\(\[input\.question, input\.roleTitle, input\.area\]/);
  assert.match(agent, /requireVacancyAdvisorAuthority/);
  assert.match(agent, /filters: \{ allowed_domains: allowedDomains \}/);
  assert.match(agent, /market_summary: answer\.market_summary\.trim\(\)\.slice\(0, 1_200\)\.trim\(\)/);
  assert.match(agent, /recommendation: answer\.recommendation\.trim\(\)\.slice\(0, 800\)\.trim\(\)/);
  assert.match(agent, /caveats: answer\.caveats\.map\(\(item\) => item\.trim\(\)\)\.filter\(Boolean\)\.slice\(0, 4\)/);
  assert.match(agent, /sources: answer\.sources\.slice\(0, 6\)/);
  assert.doesNotMatch(agent, /Market answer exceeds safe limits/);
  assert.match(migration, /create table public\.vacancy_advisor_research_runs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.vacancy_advisor_research_runs from public, anon, authenticated/i);
  assert.match(migration, /github\.blog/i);
  assert.match(migration, /survey\.stackoverflow\.co/i);
  assert.match(actorIndex, /on public\.vacancy_advisor_research_runs \(actor_auth_user_id\)/i);
  assert.match(page, /Web pesquisada agora/);
  assert.match(page, /Fontes consultadas/);
  assert.match(page, /useState<"market" \| "internal">\("market"\)/);
  assert.match(page, /advisorScope === "market"/);
  assert.match(page, /Somente fontes internas/);
  assert.match(page, /Como o Assistente Prisma pesquisa/);
});

test("resolução ocupacional explica segurança sem score e nunca deriva evidência da Pessoa", () => {
  assert.match(occupationResolutionMessage({ attemptId: "attempt", status: "resolved", decisionOrigin: "existing_reconciliation", canonicalConceptId: "occupation", canonicalLabel: "Desenvolvedor de sistemas de tecnologia da informação (técnico)", normalizedTerm: "programador de sistemas de informação", candidates: [], ambiguityReason: null, reused: false }), /Referência profissional/);
  assert.match(occupationResolutionMessage({ attemptId: "attempt", status: "needs_human_review", decisionOrigin: "no_safe_decision", canonicalConceptId: null, canonicalLabel: null, normalizedTerm: "programador", candidates: [], ambiguityReason: "agent_no_safe_decision", reused: false }), /Explorador/i);
  const developer = vacancy("Desenvolvedor de Software", ["Java"]);
  const withoutJava = candidate("without-java", "Pessoa sem Java", profile({ professionalTitle: "Desenvolvedor de Software" }));
  assert.equal(matchVacancyCandidate(developer, withoutJava).requirements[0]?.status, "no_evidence");
});

test("validação de Vaga destaca o campo acionável que bloqueia o salvamento", async () => {
  const [page, styles, adr, contracts] = await Promise.all([
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
    readFile("docs/decisions/ADR-042-actionable-field-validation-feedback.md", "utf8"),
    readFile("docs/architecture/contracts.md", "utf8"),
  ]);
  assert.match(page, /focusValidationTarget\("occupation"\)/);
  assert.match(page, /prisma-vacancy-reference-field has-validation-error/);
  assert.match(page, /validationTarget === "title" \? \{ help: "Informe o título da Vaga\.", validateStatus: "error"/);
  assert.match(page, /aria-invalid=\{invalid\}/);
  assert.match(styles, /prisma-vacancy-reference-field\.has-validation-error/);
  assert.match(styles, /prisma-requirement-editor\.has-validation-error/);
  assert.match(adr, /destacar visualmente o campo ou bloco exato/i);
  assert.match(contracts, /operation-feedback.*2\.1\.0.*destaque acionável/i);
});

test("M5.4.4 ordena empresa, Global, Agent, explorador e manual sem contaminar Pessoas", async () => {
  const [migration, agent, service, page] = await Promise.all([
    readFile("supabase/migrations/20260907010000_m544_occupation_resolution_ai_explorer.sql", "utf8"),
    readFile("supabase/functions/knowledge-agent/index.ts", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
  ]);
  assert.match(migration, /resolve_occupation_on_demand_v2/i);
  assert.match(migration, /organization_knowledge/i);
  assert.match(migration, /global_knowledge/i);
  assert.match(migration, /pending_agent/i);
  assert.match(migration, /needs_human_review/i);
  assert.match(migration, /declare_no_official_occupation_reference/i);
  assert.match(migration, /create_manual_organization_occupation/i);
  assert.match(migration, /grant execute on function public\.complete_occupation_resolution_agent.*service_role/i);
  assert.doesNotMatch(migration, /professional_profiles|person_id/);
  assert.match(agent, /mode === "occupation_resolution"/);
  assert.match(agent, /No web_search tool is present here/);
  assert.match(agent, /Software Engineer versus Software Developer/);
  assert.match(agent, /complete_occupation_resolution_agent/);
  assert.match(service, /resolveOccupationV2/);
  assert.match(page, /Explorador de Referências Oficiais/);
  assert.match(page, /Não existe referência oficial/);
});

test("resolver ocupacional consulta snapshots seletivamente, é idempotente e mantém RLS", async () => {
  const [migration, service, page] = await Promise.all([
    readFile("supabase/migrations/20260906233411_occupation_resolution_on_demand.sql", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
  ]);
  assert.match(migration, /create table public\.occupation_resolution_attempts/i);
  assert.match(migration, /unique \(organization_id, idempotency_key\)/i);
  assert.match(migration, /knowledge_occupation_reconciliations/i);
  assert.match(migration, /knowledge_source_stage_records/i);
  assert.match(migration, /limit 12/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /OCCUPATION_RESOLUTION_UNAUTHORIZED/i);
  assert.match(migration, /revoke all on function public\.resolve_occupation_on_demand/i);
  assert.doesNotMatch(migration, /person_id|professional_profiles/i);
  assert.match(service, /resolve_occupation_on_demand/);
  assert.match(page, /Consultando referências profissionais oficiais/);
  assert.match(page, /onBlur=\{\(\) => void resolveOccupation\(\)\}/);
});

test("migration M5.4 mantém tenant, versões e escrita autorizada fail-closed", async () => {
  const sql = await readFile("supabase/migrations/20260904222624_m54_vacancy_intelligence.sql", "utf8");
  const hardening = await readFile("supabase/migrations/20260904225612_m54_vacancy_policy_hardening.sql", "utf8");
  const indexes = await readFile("supabase/migrations/20260904230234_m54_vacancy_fk_indexes.sql", "utf8");
  const positionGuard = await readFile("supabase/migrations/20260904230903_m54_vacancy_position_status_guard.sql", "utf8");
  assert.match(sql, /create table public\.vacancy_versions/i);
  assert.match(sql, /create table public\.vacancy_requirement_relations/i);
  assert.match(sql, /vacancy_version_id uuid/i);
  assert.match(sql, /private\.has_org_role\(p_organization_id/i);
  assert.match(sql, /revoke all on function public\.save_vacancy_definition/i);
  assert.match(sql, /grant execute on function public\.save_vacancy_definition/i);
  assert.match(sql, /confirmed_by_auth_user_id/i);
  assert.doesNotMatch(sql, /grant .* to anon/i);
  assert.match(hardening, /drop policy if exists vacancies_manage/i);
  assert.match(hardening, /revoke insert, update, delete on public\.positions from authenticated/i);
  assert.match(indexes, /vacancies_current_version_fk_idx/i);
  assert.match(indexes, /match_evaluations_person_fk_idx/i);
  assert.match(positionGuard, /VACANCY_POSITION_STATUS_INVALID/i);
  assert.match(positionGuard, /revoke all on function private\.enforce_vacancy_position_status/i);
});

test("exclusão de Vaga é cancelamento auditável e a lista oferece edição e exclusão", async () => {
  const [migration, service, page] = await Promise.all([
    readFile("supabase/migrations/20260907000000_m54_vacancy_cancellation.sql", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
  ]);
  assert.match(migration, /create or replace function public\.cancel_vacancy/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /private\.has_org_role\(p_organization_id/i);
  assert.match(migration, /VACANCY_UNAUTHORIZED/i);
  assert.match(migration, /'cancelled'/i);
  assert.match(migration, /revoke all on function public\.cancel_vacancy/i);
  assert.doesNotMatch(migration, /delete from public\.vacancies/i);
  assert.match(service, /rpc\("cancel_vacancy"/);
  assert.match(page, /Editar/);
  assert.match(page, /Excluir esta Vaga/);
  assert.match(page, /posição, versões e avaliações anteriores serão preservadas/i);
});
