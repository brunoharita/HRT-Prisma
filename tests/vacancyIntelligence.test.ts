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
    requirements: requirementLabels.map((label) => newVacancyRequirement(label, "competency")),
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

test("requisito procura evidência em todo o Perfil e explica as fontes sem depender da categoria interna", () => {
  const need = vacancy("Analista ERP", ["SAP"]);
  need.requirements[0]!.category = "language";
  const person = candidate("sap", "Pessoa SAP", profile({
    competencies: ["SAP"],
    experiences: [{ id: "exp-sap", source: "human", role: "Analista de Sistemas", organization: "Empresa", period: "2024", description: "Implantação do SAP", evidenceText: "Projeto SAP", page: 1 }],
  }));
  const result = matchVacancyCandidate(need, person);
  assert.equal(result.requirements[0]?.status, "met");
  assert.deepEqual(new Set(result.requirements[0]?.evidence.map((item) => item.source)), new Set(["Competências, conhecimentos e ferramentas", "Experiência profissional"]));
  assert.match(result.requirements[0]?.explanation ?? "", /Competências, conhecimentos e ferramentas/);
  assert.match(result.requirements[0]?.explanation ?? "", /Experiência profissional/);
});

test("ordenação é determinística e explicável sem score exposto", () => {
  const need = vacancy("Gerente Comercial", ["Negociação", "Salesforce"]);
  const one = candidate("one", "Ana", profile({ competencies: ["Negociação"] }));
  const two = candidate("two", "Bruno", profile({ competencies: ["Negociação", "Salesforce"] }));
  const ordered = sortVacancyMatches([matchVacancyCandidate(need, one), matchVacancyCandidate(need, two)]);
  assert.deepEqual(ordered.map((item) => item.candidate.personId), ["two", "one"]);
  assert.ok(ordered.every((item) => item.reasons.every((reason) => !/%|nota|vencedor/i.test(reason))));
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
  assert.match(answer.market, /nenhuma pesquisa externa/i);
  assert.match(answer.suggestion, /momento da área/i);
});

test("Assistente Prisma identifica pergunta atual de mercado para Web Search", () => {
  const question = "Quais são as linguagens mais utilizadas atualmente no desenvolvimento de sistemas em cloud?";
  const answer = answerVacancyQuestion(question, vacancy("Engenheiro Cloud", ["Desenvolvimento cloud"]), {
    otherVacancies: [], roles: [], knowledge: [], knowledgeLookupAvailable: true,
  });
  assert.equal(shouldResearchVacancyMarket(question), true);
  assert.equal(answer.webSearched, false);
  assert.match(answer.market, /depende de informação atual de mercado/i);
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
  assert.match(migration, /create table public\.vacancy_advisor_research_runs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.vacancy_advisor_research_runs from public, anon, authenticated/i);
  assert.match(migration, /github\.blog/i);
  assert.match(migration, /survey\.stackoverflow\.co/i);
  assert.match(actorIndex, /on public\.vacancy_advisor_research_runs \(actor_auth_user_id\)/i);
  assert.match(page, /Web pesquisada agora/);
  assert.match(page, /Fontes consultadas/);
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
