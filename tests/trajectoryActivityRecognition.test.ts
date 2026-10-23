import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { emptyVacancyDraft, matchVacancyCandidate, newVacancyRequirement, type VacancyDetail } from "../web/src/domain/vacancy.js";
import { applySemanticAssessment, semanticTriageDisposition, unavailableSemantic } from "../web/src/domain/semanticMatching.js";
import { restoreStableMatch } from "../web/src/domain/stableMatching.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";

const vacancy: VacancyDetail = { ...emptyVacancyDraft(), title: "Gerente de Estoque", area: "Estoque", experiencePolicy: "required",
  id: "vacancy", versionId: "v1", version: 1, organizationId: "org", createdAt: "", updatedAt: "", jobRoleName: "", occupantName: null,
  responsibilities: ["Gestão do Estoque", "Gestão de Equipe", "Contato com fornecedores"],
  requirements: [newVacancyRequirement("SAP", "technology"), newVacancyRequirement("Gestão de pessoas", "competency")]
    .map(item => ({ ...item, importance: "required" })) };
function person(descriptions: string[], role = "Coordenador de Planejamento e Controle"): PublishedProfileCandidate {
  return { personId: "person", profileId: "p1", profileVersion: 1, fullName: "Pessoa sintética", lifecycle: "candidate", operationalStatus: "active", location: null, publishedAt: "", knowledge: [],
    profileData: { identity: { fullName: "Pessoa sintética" }, contact: { city: null, state: null, phone: null, email: null, linkedin: null },
      professionalTitle: role, summary: null, professionalObjective: null, areasOfExpertise: [], keyResults: [],
      experiences: descriptions.map((description, index) => ({ id: `e${index}`, role, description, evidenceText: "", organization: "Empresa sintética", period: "01/01/2020 - 31/12/2025", page: null, source: "human" })),
      education: [], competencies: [], certifications: [], languages: [], customSections: [], uncertainties: [], notIdentified: [] } };
}
const evaluate = (descriptions: string[], role?: string) => matchVacancyCandidate(vacancy, person(descriptions, role), null, [], [], "2026-10-23");

test("coordenação de estoque com cargo distinto é relacionada; SAP e gestão de pessoas continuam independentes", () => {
  const match = evaluate(["Responsável pela coordenação de Planejamento e Controle de Estoque em portfólio de 12.000 itens. Key user SAP na operação."]);
  assert.equal(match.discoveryGroup, "related_area");
  assert.equal(match.trajectoryAssessment.relation, "related");
  assert.equal(match.functionAssessment.relation, "related_function");
  assert.equal(match.functionAssessment.seniorityRelation, "adjacent_below");
  assert.equal(match.requirements[0]?.status, "met");
  assert.equal(match.requirements[1]?.status, "no_evidence");
  assert.equal(match.score.scoreContractVersion, "matching-score-1.4.0");
  assert.equal(match.score.matchingContractVersion, "vacancy-matching-explainable-5.2.0");
  assert.notEqual(match.score.score, null);
  assert.equal(semanticTriageDisposition(match), "needs_interpretation");
  assert.match(match.trajectoryAssessment.explanation, /verificados separadamente/);
});

test("todas as experiências e trechos pertinentes sustentam a relação, inclusive históricos", () => {
  const match = evaluate(["Atuação administrativa.", "Planejamento e controle de estoques com SAP.", "Gestão de estoque e inventários anuais."]);
  assert.equal(match.discoveryGroup, "related_area");
  assert.deepEqual(match.trajectoryAssessment.activityEvidence?.map(item => item.sourceId), ["experience:e1:description", "experience:e2:description"]);
  assert.ok(match.areaRelation.evidence.length >= 2);
  const failed = applySemanticAssessment(vacancy, match, unavailableSemantic(vacancy, match));
  const { semanticFallback: _fallback, ...preserved } = failed;
  assert.deepEqual(preserved, match);
});

for (const [name, description] of [
  ["ferramenta isolada", "Utilizei SAP na emissão de notas fiscais."],
  ["venda de ferramenta", "Responsável pelas vendas de software de controle de estoque. Utilizei SAP."],
  ["construção de ferramenta", "Desenvolvi sistema de controle de estoque. Utilizei SAP."],
  ["negação", "Nunca executei controle de estoque. Utilizei SAP."],
  ["negação nominal", "Sem experiência em gestão de estoque. Utilizei SAP."],
  ["aspiração", "Tenho interesse em gestão de estoque. Utilizei SAP."],
] as const) test(`${name} não vira trajetória relacionada`, () => {
  const match = evaluate([description], "Assistente administrativo");
  assert.equal(match.discoveryGroup, "contextual_signals");
  assert.equal(match.score.score, null);
  assert.equal(semanticTriageDisposition(match), "contextual_only");
});

test("área ampla não comprova especialização e atividade insuficiente tem dúvida explícita", () => {
  const broad = matchVacancyCandidate({ ...vacancy, title: "Desenvolvedor backend", area: "Tecnologia" }, person(["Gestão de tecnologia com fornecedores."], "Executivo de contas"));
  assert.equal(broad.discoveryGroup, "contextual_signals");
  assert.equal(semanticTriageDisposition(broad), "contextual_only");
  const ambiguous = evaluate(["Atuação integrada com estoque e outras áreas. Utilizei SAP."], "Analista de operações");
  assert.equal(ambiguous.score.score, null);
  assert.equal(ambiguous.trajectoryAssessment.reviewRequired, true);
  assert.match(ambiguous.trajectoryAssessment.explanation, /não permite concluir baixa relevância/);
  assert.equal(semanticTriageDisposition(ambiguous), "needs_interpretation");
});

test("regra geral reconhece atividades em outra profissão sem cargo equivalente", () => {
  const match = matchVacancyCandidate({ ...vacancy, title: "Analista de Marketing", area: "Marketing", requirements: [] }, person(["Planejamento de marketing e controle de campanhas."], "Executivo de contas"));
  assert.equal(match.discoveryGroup, "related_area");
});

test("responsabilidade específica pode recuperar atividade sem repetir o título; gestão genérica não basta", () => {
  const fiscal = { ...vacancy, title: "Analista Fiscal", area: "Fiscal", responsibilities: ["Apuração de impostos"], requirements: [] };
  const match = matchVacancyCandidate(fiscal, person(["Apuração de impostos e fechamento mensal."], "Assistente administrativo"));
  assert.equal(match.trajectoryAssessment.reviewRequired, true);
  assert.equal(semanticTriageDisposition(match), "needs_interpretation");
  const generic = evaluate(["Gestão de equipe e contato com fornecedores."], "Analista financeiro");
  assert.equal(semanticTriageDisposition(generic), "contextual_only");
  const course = matchVacancyCandidate(fiscal, person(["Curso de apuração de impostos."], "Assistente administrativo"));
  assert.equal(semanticTriageDisposition(course), "contextual_only");
});

test("decisões confirmada/desconsiderada preservam precedência e histórico não é reescrito na leitura", () => {
  const match = evaluate(["Controle de estoque e inventários."]);
  assert.equal(semanticTriageDisposition({ ...match, positionDecision: "confirmed" }), "resolved_internal");
  assert.equal(semanticTriageDisposition({ ...match, positionDecision: "dismissed" }), "excluded");
  const historical = { ...match, positionDecision: "dismissed", score: { ...match.score, matchingContractVersion: "vacancy-matching-explainable-5.1.0" } };
  const restored = restoreStableMatch(vacancy, match.candidate, { state: "current", evaluationId: "40000000-0000-0000-0000-000000000001", match: historical });
  assert.equal(restored.positionDecision, "dismissed");
  assert.deepEqual(restored.score, historical.score);
});

test("web e Edge usam exatamente as mesmas regras e evidências de atividades", async () => {
  const runtime = await import(pathToFileURL(resolve("supabase/functions/matching-trajectory/_generated/web/src/domain/vacancy.js")).href);
  const candidate = person(["Coordenação de planejamento e controle de estoque.", "Gestão de estoques e inventários."]);
  assert.deepEqual(runtime.matchVacancyCandidate(vacancy, candidate, null, [], [], "2026-10-23"), matchVacancyCandidate(vacancy, candidate, null, [], [], "2026-10-23"));
});
