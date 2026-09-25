import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateMatchingScore,
  MATCHING_SCORE_CONTRACT_VERSION,
  type MatchingScoreInput,
  type VacancyFunctionAssessment,
} from "../web/src/domain/matchingScore.js";
import {
  emptyVacancyDraft,
  buildMatchingScoreShadowReport,
  isVacancyDiscoveryCandidate,
  matchVacancyCandidate,
  newVacancyRequirement,
  sortVacancyMatches,
  VACANCY_MATCHING_VERSION,
  type VacancyDemonstratedEvidence,
  type VacancyDetail,
  type VacancyRequirementDraft,
} from "../web/src/domain/vacancy.js";
import type { PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

function profile(overrides: Partial<StructuredDraft> = {}): StructuredDraft {
  return {
    identity: { fullName: "Pessoa Sintética" },
    contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: null,
    areasOfExpertise: [],
    professionalObjective: null,
    summary: null,
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

function candidate(id: string, profileData: StructuredDraft, extra: Partial<PublishedProfileCandidate> = {}): PublishedProfileCandidate {
  return {
    personId: id,
    fullName: `Pessoa ${id}`,
    lifecycle: "candidate",
    operationalStatus: "active",
    location: null,
    profileId: `profile-${id}`,
    profileVersion: 1,
    publishedAt: "2026-09-13T12:00:00Z",
    profileData,
    knowledge: [],
    ...extra,
  };
}

function requirement(label: string, importance: VacancyRequirementDraft["importance"] = "required", category: VacancyRequirementDraft["category"] = "competency"): VacancyRequirementDraft {
  return { ...newVacancyRequirement(label, category), importance, importanceConfirmed: importance !== "unclassified" };
}

function vacancy(overrides: Partial<VacancyDetail> = {}): VacancyDetail {
  return {
    ...emptyVacancyDraft(),
    id: "vacancy-score",
    organizationId: "organization-a",
    versionId: "vacancy-version-1",
    version: 1,
    title: "Analista de Marketing",
    area: "Marketing",
    requirements: [],
    jobRoleName: "Analista de Marketing",
    occupantName: null,
    createdAt: "2026-09-13T12:00:00Z",
    updatedAt: "2026-09-13T12:00:00Z",
    ...overrides,
  };
}

function experience(role: string, description = ""): StructuredDraft["experiences"][number] {
  return { id: `exp-${role}`, source: "human", role, organization: "Empresa", period: "2024 - atual", description, evidenceText: role, page: 1 };
}

function demonstrated(overrides: Partial<VacancyDemonstratedEvidence> = {}): VacancyDemonstratedEvidence {
  return {
    id: "demonstrated-sql",
    competencyKey: "SQL",
    demonstratedLevel: "advanced",
    confidenceState: "high",
    verificationDefinitionVersion: "m51a-verification-definition-1.0.0",
    evaluationVersion: "m51b-assessment-evaluation-1.0.0",
    integrityRuleVersion: "m51b-integrity-ruleset-1.0.0",
    verifiedAt: "2026-09-13T12:00:00Z",
    ...overrides,
  };
}

test("M6.1 calcula 100 com quatro dimensões totalmente atendidas", () => {
  const need = vacancy({
    referenceConceptId: "occupation-marketing-analyst",
    requirements: [requirement("Campanhas"), requirement("CRM", "desired")],
  });
  const person = candidate("full", profile({
    professionalTitle: "Analista de Marketing",
    experiences: [experience("Analista de Marketing")],
    competencies: ["Campanhas", "CRM"],
  }), { knowledge: [{ originalTerm: "Analista de Marketing", canonicalLabel: "Analista de Marketing", state: "resolved", conceptId: "occupation-marketing-analyst", conceptType: "occupation", sourceVersion: "global:1|organization:none|source:official-1|method:resolution-1" }] });
  const score = matchVacancyCandidate(need, person, { conceptId: "occupation-marketing-analyst", canonicalLabel: need.title, aliases: [], relations: [] }).score;
  assert.equal(score.score, 100);
  assert.equal(score.status, "definitive");
  assert.equal(score.earnedPoints, 100);
  assert.equal(score.applicablePoints, 100);
  assert.equal(score.coveragePercent, 100);
  assert.equal(score.scoreContractVersion, MATCHING_SCORE_CONTRACT_VERSION);
});

test("Analista de Sistemas sem desejáveis usa 85 pontos aplicáveis e arredonda somente o final", () => {
  const need = vacancy({
    title: "Analista de Sistemas",
    area: "Sistemas",
    referenceConceptId: "occupation-systems-analyst",
    requirements: [requirement("SQL", "required", "technology"), requirement("APIs REST seguras", "required", "technology"), requirement("Git", "required", "technology"), requirement("Integrações de sistemas")],
  });
  const person = candidate("systems", profile({
    professionalTitle: "Consultor de Sistemas",
    experiences: [experience("Consultor de Sistemas")],
    competencies: ["Integrações de sistemas"],
    toolsAndTechnologies: ["SQL", "APIs REST", "Git"],
  }), { knowledge: [{ originalTerm: "Consultor de Sistemas", canonicalLabel: "Consultor de Sistemas", state: "resolved", conceptId: "occupation-systems-consultant", conceptType: "occupation" }] });
  const match = matchVacancyCandidate(need, person, { conceptId: "occupation-systems-analyst", canonicalLabel: need.title, aliases: [], relations: [{ conceptId: "occupation-systems-consultant", label: "Consultor de Sistemas", relationType: "equivalent_to" }] });
  assert.equal(match.score.earnedPoints, 77.625);
  assert.equal(match.score.applicablePoints, 85);
  assert.equal(match.score.score, 91);
  assert.equal(match.score.dimensions.find((item) => item.key === "desired")?.applicablePoints, 0);
});

test("categorias ausentes saem do denominador e ausência total retorna indisponível", () => {
  const areaOnly = matchVacancyCandidate(vacancy({ title: "", area: "Marketing" }), candidate("area", profile({ experiences: [experience("Assistente de Marketing")] }))).score;
  assert.equal(areaOnly.applicablePoints, 30);
  assert.equal(areaOnly.score, 100);
  const empty = calculateMatchingScore(baseScoreInput({ areaApplicable: false, functionApplicable: false }));
  assert.equal(empty.applicablePoints, 0);
  assert.equal(empty.score, null);
  assert.equal(empty.status, "unavailable");
  assert.match(empty.unavailableReason ?? "", /critérios aplicáveis/i);
});

test("requisitos dividem 35 e 15 igualmente e aplicam escala 100/50/25/0", () => {
  const need = vacancy({ title: "", area: "", requirements: [
    requirement("Direto"), requirement("Parcial avançado"), requirement("Relacionado"), requirement("Ausente"),
    requirement("Desejável direto", "desired"), requirement("Desejável ausente", "desired"),
  ] });
  need.requirements[2]!.relatedSignals = [{ label: "Sinal", conceptId: null, origin: "operator" }];
  const match = matchVacancyCandidate(need, candidate("requirements", profile({ competencies: ["Direto", "Parcial", "Sinal", "Desejável direto"] })));
  const required = match.score.dimensions.find((item) => item.key === "required")!;
  const desired = match.score.dimensions.find((item) => item.key === "desired")!;
  assert.deepEqual(required.items?.map((item) => item.applicablePoints), [8.75, 8.75, 8.75, 8.75]);
  assert.deepEqual(required.items?.map((item) => item.earnedPoints), [8.75, 4.375, 2.1875, 0]);
  assert.deepEqual(desired.items?.map((item) => item.applicablePoints), [7.5, 7.5]);
  assert.deepEqual(desired.items?.map((item) => item.earnedPoints), [7.5, 0]);
});

test("SAP explícito sem trajetória relacionada permanece sinal contextual sem score comparável", () => {
  const need = vacancy({ title: "", area: "", requirements: [requirement("SAP", "required", "technology")] });
  const person = candidate("bruno-sap-score", profile({ experiences: [experience(
    "Executivo de Transformação & Tecnologia",
    "Participação em transformação tecnológica de grande porte envolvendo migração de ERP para SAP, SAP EWM e automação logística KNAPP.",
  )] }));
  const match = matchVacancyCandidate(need, person);
  assert.equal(match.requirements[0]?.status, "met");
  assert.equal(match.discoveryGroup, "contextual_signals");
  assert.equal(match.score.applicablePoints, 35);
  assert.equal(match.score.earnedPoints, 35);
  assert.equal(match.score.score, null);
  assert.match(match.score.unavailableReason ?? "", /trajetória profissional/i);
});

test("falta de trajetória impede score comparável sem apagar cobertura ou evidência", () => {
  const assessedNoRelation = matchVacancyCandidate(vacancy({ title: "", requirements: [] }), candidate("finance", profile({ professionalTitle: "Analista Financeiro", experiences: [experience("Analista Financeiro")] }))).score;
  assert.equal(assessedNoRelation.score, null);
  assert.equal(assessedNoRelation.coveragePercent, 100);

  const lowCoverage = matchVacancyCandidate(vacancy({ area: "", title: "", requirements: [requirement("Comunicação"), requirement("Liderança")] }), candidate("low", profile({ competencies: ["Comunicação"] }))).score;
  assert.equal(lowCoverage.coveragePercent, 50);
  assert.equal(lowCoverage.score, null);
  assert.equal(lowCoverage.status, "unavailable");
  assert.match(lowCoverage.dimensions.find((item) => item.key === "required")?.items?.[1]?.explanation ?? "", /não possui evidência suficiente/i);
});

test("unclassified fica fora dos pesos, torna o score provisório e não bloqueia descoberta", () => {
  const need = vacancy({ requirements: [requirement("CRM", "unclassified"), requirement("RD Station", "unclassified"), requirement("Office", "unclassified")] });
  const match = matchVacancyCandidate(need, candidate("unclassified", profile({ experiences: [experience("Assistente de Marketing")] })));
  assert.equal(isVacancyDiscoveryCandidate(match), true);
  assert.equal(match.score.status, "provisional");
  assert.equal(match.score.applicablePoints, 50);
  assert.match(match.score.provisionalReasons.join(" "), /aguard(?:a|am) classificação/i);
  assert.match(match.score.dimensions.find((item) => item.key === "required")?.explanation ?? "", /nenhum requisito está confirmado como obrigatório; 3 requisitos aguardam classificação/i);
  assert.doesNotMatch(match.score.dimensions.find((item) => item.key === "required")?.explanation ?? "", /não definiu requisitos obrigatórios/i);
});

test("versão desconhecida falha fechada sem fabricar 0", () => {
  const unknownMatching = calculateMatchingScore(baseScoreInput({ matchingContractVersion: "unknown" }));
  const unknownProfile = calculateMatchingScore(baseScoreInput({ profileVersion: "", profileVersionNumber: 0 }));
  assert.equal(unknownMatching.score, null);
  assert.equal(unknownProfile.score, null);
  assert.match(unknownMatching.unavailableReason ?? "", /matching não é reconhecida/i);
  assert.match(unknownProfile.unavailableReason ?? "", /Perfil é desconhecida/i);
});

test("mesmas entradas são determinísticas e versões diferentes não compartilham identidade", () => {
  const first = calculateMatchingScore(baseScoreInput());
  const replay = calculateMatchingScore(baseScoreInput());
  const nextProfile = calculateMatchingScore(baseScoreInput({ profileVersion: "profile-2", profileVersionNumber: 2 }));
  const nextPosition = calculateMatchingScore(baseScoreInput({ positionVersion: "position-2", positionVersionNumber: 2 }));
  assert.deepEqual(first, replay);
  assert.notEqual(first.inputFingerprint, nextProfile.inputFingerprint);
  assert.notEqual(first.inputFingerprint, nextPosition.inputFingerprint);
});

test("função pura mantém p95 local abaixo de 5 ms em fixture pequena", () => {
  const input = baseScoreInput();
  for (let index = 0; index < 20; index += 1) calculateMatchingScore(input);
  const durations: number[] = [];
  for (let index = 0; index < 300; index += 1) {
    const started = performance.now();
    calculateMatchingScore(input);
    durations.push(performance.now() - started);
  }
  durations.sort((left, right) => left - right);
  assert.ok(durations[Math.floor(durations.length * 0.95)]! < 5);
});

test("Beatriz e Gerente de Marketing permanecem no grupo principal com senioridade explícita", () => {
  const need = vacancy();
  const beatriz = matchVacancyCandidate(need, candidate("beatriz", profile({ experiences: [experience("Assistente de Marketing")] })));
  const manager = matchVacancyCandidate(need, candidate("manager", profile({ experiences: [experience("Gerente de Marketing")] })));
  const unknown = matchVacancyCandidate(need, candidate("unknown", profile({ experiences: [experience("Profissional de Marketing")] })));
  assert.equal(beatriz.discoveryGroup, "main_area");
  assert.equal(beatriz.areaRelation.status, "experience_area");
  assert.equal(beatriz.positionRelation.status, "none");
  assert.equal(beatriz.functionAssessment.basePoints, 17);
  assert.equal(beatriz.functionAssessment.seniorityAdjustment, -1);
  assert.equal(manager.discoveryGroup, "main_area");
  assert.equal(manager.functionAssessment.seniorityAdjustment, -4);
  assert.match(manager.functionAssessment.explanation, /acima da senioridade prevista/i);
  assert.equal(unknown.functionAssessment.seniorityAdjustment, 0);
  assert.equal(unknown.functionAssessment.seniorityRelation, "not_available");
});

test("menção isolada a marketing em Tecnologia não cria área nem pontos", () => {
  const technology = candidate("technology", profile({
    professionalTitle: "Analista de Sistemas",
    experiences: [experience("Analista de Sistemas", "Integração técnica com uma plataforma de marketing digital.")],
  }));
  const match = matchVacancyCandidate(vacancy(), technology);
  assert.equal(match.areaRelation.status, "none");
  assert.equal(match.discoveryGroup, "contextual_signals");
  assert.equal(match.score.score, null);
  assert.equal(match.score.dimensions.find((item) => item.key === "area")?.earnedPoints, 0);
});

test("trajetória separa A, B e C e a exceção de entrada promove potencial ao Grupo B", () => {
  const technologyManager = vacancy({ title: "Gerente de Tecnologia", area: "Tecnologia", requirements: [requirement("SAP", "required", "technology")] });
  const direct = matchVacancyCandidate(technologyManager, candidate("technology-manager", profile({
    experiences: [experience("Gerente de Tecnologia", "Liderança de implantação de SAP.")],
  })));
  const adjacent = matchVacancyCandidate(technologyManager, candidate("adjacent", profile({
    areasOfExpertise: ["Tecnologia"],
    experiences: [experience("Gerente de Projetos")],
  })));
  const commercial = matchVacancyCandidate(technologyManager, candidate("commercial", profile({
    professionalTitle: "Executivo Comercial",
    experiences: [experience("Executivo Comercial", "Gestão comercial e venda consultiva de SAP para clientes de tecnologia.")],
  })));
  assert.equal(direct.discoveryGroup, "main_area");
  assert.equal(adjacent.discoveryGroup, "related_area");
  assert.equal(commercial.discoveryGroup, "contextual_signals");
  assert.equal(commercial.requirements[0]?.status, "met");
  assert.equal(commercial.score.score, null);
  assert.deepEqual(sortVacancyMatches([commercial, adjacent, direct]).map((item) => item.candidate.personId), ["technology-manager", "adjacent", "commercial"]);

  const entry = vacancy({ title: "Assistente de Tecnologia Júnior", area: "Tecnologia", requirements: [requirement("SAP", "required", "technology")] });
  const potential = matchVacancyCandidate(entry, candidate("entry-potential", profile({ competencies: ["SAP"] })));
  assert.equal(potential.trajectoryAssessment.relation, "entry_potential");
  assert.equal(potential.discoveryGroup, "related_area");
  assert.notEqual(potential.score.score, null);
});

test("Evidência Demonstrada fortalece somente o requisito exato e respeita nível e teto", () => {
  const need = vacancy({ title: "", area: "", requirements: [requirement("SQL"), requirement("Git")] });
  need.requirements[0]!.targetLevel = "advanced";
  const direct = matchVacancyCandidate(need, candidate("verified", profile()), null, [demonstrated()]);
  assert.equal(direct.requirements[0]?.status, "met");
  assert.equal(direct.requirements[1]?.status, "no_evidence");
  assert.equal(direct.score.dimensions[2]?.items?.[0]?.earnedPoints, 17.5);
  const below = matchVacancyCandidate(need, candidate("below", profile()), null, [demonstrated({ demonstratedLevel: "basic" })]);
  assert.equal(below.requirements[0]?.status, "partially_met");
  assert.equal(below.score.dimensions[2]?.items?.[0]?.earnedPoints, 8.75);
  const unknownVersion = matchVacancyCandidate(need, candidate("unknown-evidence", profile()), null, [demonstrated({ evaluationVersion: "unknown" })]);
  assert.equal(unknownVersion.requirements[0]?.status, "no_evidence");
});

test("atributos proibidos, nome, volume e repetição não entram no cálculo", () => {
  const need = vacancy({ title: "", area: "", requirements: [requirement("CRM")] });
  const concise = matchVacancyCandidate(need, candidate("concise", profile({ competencies: ["CRM"] }), { fullName: "Nome A", location: "Cidade A" })).score;
  const stuffedProfile = profile({ competencies: ["CRM"], summary: "CRM ".repeat(500) });
  stuffedProfile.identity = { fullName: "Outro Nome", birthDate: "1900-01-01", gender: "não deve entrar" } as StructuredDraft["identity"];
  const stuffed = matchVacancyCandidate(need, candidate("stuffed", stuffedProfile, { fullName: "Nome B", location: "Cidade B" })).score;
  assert.equal(concise.score, stuffed.score);
  assert.deepEqual(concise.dimensions.map((item) => [item.key, item.earnedPoints]), stuffed.dimensions.map((item) => [item.key, item.earnedPoints]));
});

test("ordenação preserva grupos e usa Prisma Score decrescente inclusive para provisórios", () => {
  const main = matchVacancyCandidate(vacancy({ requirements: [requirement("CRM")] }), candidate("main", profile({ experiences: [experience("Assistente de Marketing")], competencies: [] }), { fullName: "Zelda" }));
  const related = matchVacancyCandidate(vacancy({ requirements: [requirement("CRM")] }), candidate("related", profile({ professionalTitle: "Analista de Marketing Digital", competencies: ["CRM"] }), { fullName: "Ana" }));
  assert.ok(related.score.score! > main.score.score!);
  assert.deepEqual(sortVacancyMatches([related, main]).map((item) => item.candidate.personId), ["main", "related"]);

  const need = vacancy({ title: "", area: "Marketing", requirements: [requirement("SQL"), requirement("Git")] });
  const provisionalHigh = matchVacancyCandidate(need, candidate("provisional-high", profile({ experiences: [experience("Assistente de Marketing")], competencies: ["SQL"] }), { fullName: "Zoe" }));
  const provisionalLow = matchVacancyCandidate(need, candidate("provisional-low", profile({ experiences: [experience("Assistente de Marketing")] }), { fullName: "Ana" }));
  assert.ok(provisionalHigh.score.score! > provisionalLow.score.score!);
  assert.deepEqual(sortVacancyMatches([provisionalHigh, provisionalLow]).map((item) => item.candidate.personId), ["provisional-high", "provisional-low"]);
  provisionalLow.positionDecision = "confirmed";
  assert.equal(sortVacancyMatches([provisionalLow, provisionalHigh])[0]?.candidate.personId, "provisional-high");

  const rankingNeed = vacancy({ title: "", requirements: [] });
  const high = matchVacancyCandidate(rankingNeed, candidate("high", profile({ experiences: [experience("Assistente de Marketing")] }), { fullName: "Zoe" }));
  const low = matchVacancyCandidate(rankingNeed, candidate("low-score", profile({ areasOfExpertise: ["Marketing"] }), { fullName: "Ana" }));
  assert.equal(high.score.status, "definitive");
  assert.equal(low.score.status, "definitive");
  assert.deepEqual(sortVacancyMatches([low, high]).map((item) => item.candidate.personId), ["high", "low-score"]);
  low.score.score = null;
  low.score.status = "unavailable";
  assert.equal(sortVacancyMatches([low, high])[1]?.candidate.personId, "low-score");
  const discoveryBefore = isVacancyDiscoveryCandidate(low);
  low.score.score = 0;
  assert.equal(isVacancyDiscoveryCandidate(low), discoveryBefore);
});

test("relatório sombra ordena pelo score, registra decisão sem usá-la como feature e evita PII textual", () => {
  const need = vacancy({ requirements: [requirement("CRM")] });
  const first = matchVacancyCandidate(need, candidate("first", profile({ areasOfExpertise: ["Marketing"], competencies: ["CRM"] })));
  const second = matchVacancyCandidate(need, candidate("second", profile({ areasOfExpertise: ["Marketing"] })));
  second.positionDecision = "confirmed";
  const report = buildMatchingScoreShadowReport([first, second], ["first", "second"]);
  assert.deepEqual(report.map((item) => item.personReference), ["first", "second"]);
  assert.equal(report[1]?.humanDecision, "confirmed");
  assert.equal(report[1]?.score, second.score.score);
  assert.equal("fullName" in report[0]!, false);
  assert.deepEqual(report, buildMatchingScoreShadowReport([first, second], ["first", "second"]));
});

test("UI expõe score, cobertura, grupos, explicação, versões e proteção mobile", async () => {
  const [page, styles, service] = await Promise.all([
    readFile("web/src/pages/VacancyPages.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
    readFile("web/src/infrastructure/supabase/vacancyService.ts", "utf8"),
  ]);
  assert.match(page, /Compatibilidade observada provisória/);
  assert.match(page, /Cobertura das evidências/);
  assert.match(page, /Ver como o score foi calculado/);
  assert.match(page, /Grupo A · trajetória diretamente compatível/);
  assert.match(page, /Grupo B · trajetória relacionada ou potencial de entrada/);
  assert.match(page, /Grupo C · somente sinais contextuais/);
  assert.match(page, /Sem trajetória profissional relacionada/);
  assert.match(page, /prisma-contextual-signals-group/);
  assert.match(page, /maior Prisma Score primeiro/);
  assert.match(page, /Comparação ainda incompleta · sem prioridade segura/);
  assert.doesNotMatch(page, /não participa da ordenação/);
  assert.match(page, /matchingContractVersion/);
  assert.match(styles, /prisma-score-dimensions \.ant-tag[^}]*white-space: normal[^}]*overflow-wrap: anywhere/);
  assert.match(styles, /prisma-match-reasons \.ant-tag[^}]*white-space: normal[^}]*overflow-wrap: anywhere/);
  assert.match(styles, /prisma-vacancy-match-card article > header > \.ant-space \.ant-space-item[^}]*min-width: 0/);
  assert.doesNotMatch(styles, /prisma-matching-score-drawer[^}]*overflow-x: hidden/);
  assert.match(service, /competency_demonstrated_evidence/);
  assert.match(service, /score: match\.score/);
  assert.match(service, /score permanece provisório até nova avaliação/);
  assert.doesNotMatch(service.match(/async function loadDemonstratedEvidence[\s\S]*?async function loadPositionRelationDecisions/)?.[0] ?? "", /person_private_data|birth_date|gender|photo|religion/);
});

function baseScoreInput(overrides: Partial<MatchingScoreInput> = {}): MatchingScoreInput {
  const functionAssessment: VacancyFunctionAssessment = {
    relation: "no_relation",
    basePoints: 0,
    seniorityAdjustment: 0,
    seniorityRelation: "not_available",
    coverageState: "not_applicable",
    evidence: [],
    explanation: "Função não aplicável.",
  };
  return {
    areaApplicable: false,
    functionApplicable: false,
    areaRelation: { status: "none", coverageState: "not_applicable", evidence: [], explanation: "Área não aplicável." },
    functionAssessment,
    requirements: [],
    unclassifiedRequirementCount: 0,
    positionVersion: "position-1",
    positionVersionNumber: 1,
    profileVersion: "profile-1",
    profileVersionNumber: 1,
    matchingContractVersion: VACANCY_MATCHING_VERSION,
    scoreContractVersion: MATCHING_SCORE_CONTRACT_VERSION,
    ...overrides,
  };
}
