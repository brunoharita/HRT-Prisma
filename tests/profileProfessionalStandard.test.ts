import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPrismaProfileView, groupCompetencies, parseLanguage } from "../web/src/domain/canonicalProfile.js";
import { emptyProfileSearchQuery, searchPublishedProfiles, type PublishedProfileCandidate } from "../web/src/domain/profileDiscovery.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

function draft(overrides: Partial<StructuredDraft> = {}): StructuredDraft {
  return {
    identity: { fullName: "Pessoa Sintética" },
    contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: "Gerente de Processos",
    areasOfExpertise: ["Operações", "Transformação"],
    professionalObjective: null,
    summary: "Profissional com atuação em melhoria de processos.",
    keyResults: [{ id: "result_1", value: "Reduziu o tempo de ciclo com evidência aprovada." }],
    experiences: [{ id: "experience_1", source: "extracted", role: "Gerente de Processos", organization: "Empresa Alfa", period: "2020 - Atual", description: "Liderança de transformação e indicadores.", evidenceText: "", page: 1 }],
    education: [{ id: "education_1", source: "extracted", course: "Administração", institution: "Universidade Alfa", period: "2014 - 2018", description: null, evidenceText: "", page: 2, level: "undergraduate", qualification: "bachelor", status: "completed", classificationOrigin: "human" }],
    certifications: ["PMP"],
    languages: ["Inglês · avançado"],
    competencies: ["Gestão de Processos", "BPM", "Power BI"],
    customSections: [], uncertainties: [], notIdentified: [],
    ...overrides,
  };
}

function candidate(id: string, profileData: StructuredDraft): PublishedProfileCandidate {
  return { personId: id, fullName: profileData.identity.fullName ?? id, lifecycle: "employee", operationalStatus: "active", location: "Bauru, BR", profileId: `profile_${id}`, profileVersion: 1, publishedAt: "2026-09-03T12:00:00Z", profileData, knowledge: [] };
}

test("Padrão Prisma derives one stable presentation without duplicating the Profile", () => {
  const view = buildPrismaProfileView({ fullName: "Pessoa Sintética", profile: draft() });
  assert.equal(view.identity.professionalTitle, "Gerente de Processos");
  assert.deepEqual(view.competencyGroups.map((group) => group.label), ["Competências", "Conhecimentos", "Tecnologias e ferramentas"]);
  assert.equal(view.credentials?.languages[0]?.level, "avançado");
  assert.equal(view.customSections.length, 0);
  assert.equal(view.experiences[0]?.role, "Gerente de Processos");
});

test("canonical Knowledge labels preserve the observed term and collapse equivalent chips", () => {
  const groups = groupCompetencies(["Business Process Management", "BPM", "Power BI"], [
    { originalTerm: "Business Process Management", canonicalLabel: "BPM", state: "resolved" },
  ]);
  const values = groups.flatMap((group) => group.values);
  assert.deepEqual(values.map((item) => item.label), ["BPM", "Power BI"]);
  assert.equal(values[0]?.originalTerm, "Business Process Management");
});

test("historical language values remain human-readable and never become object text", () => {
  assert.deepEqual(parseLanguage("Inglês · avançado"), [{ language: "Inglês", level: "avançado" }]);
  assert.deepEqual(parseLanguage("Espanhol"), [{ language: "Espanhol", level: null }]);
});

test("profile search keeps missing evidence unknown instead of turning it into a negative fact", () => {
  const personA = candidate("a", draft({ identity: { fullName: "Pessoa A" } }));
  const personB = candidate("b", draft({ identity: { fullName: "Pessoa B" }, languages: [], certifications: [] }));
  const query = { ...emptyProfileSearchQuery(), competencies: ["BPM"], language: "Inglês", languageLevel: "avançado" };
  const results = searchPublishedProfiles([personA, personB], query);
  assert.deepEqual(results.map((item) => item.candidate.personId), ["a"]);
  assert.ok(results[0]?.reasons.some((reason) => reason.includes("Inglês")));
  assert.ok(results.every((result) => result.reasons.every((reason) => !/não possui|não sabe/i.test(reason))));
});

test("Organization or Global Knowledge equivalence can satisfy a competency filter with an explanation", () => {
  const person = candidate("knowledge", draft({ identity: { fullName: "Pessoa Knowledge" }, competencies: ["Business Process Management"] }));
  const query = { ...emptyProfileSearchQuery(), competencies: ["BPM"] };
  const results = searchPublishedProfiles([person], query, { bpm: { knowledge: ["Business Process Management"] } });
  assert.equal(results.length, 1);
  assert.match(results[0]!.reasons.join(" "), /BPM identificado a partir de “Business Process Management”/);
});

test("all and any competency semantics are explicit and deterministic", () => {
  const person = candidate("logic", draft({ competencies: ["BPM"] }));
  const all = searchPublishedProfiles([person], { ...emptyProfileSearchQuery(), competencies: ["BPM", "SQL"], competencyMode: "all" });
  const any = searchPublishedProfiles([person], { ...emptyProfileSearchQuery(), competencies: ["BPM", "SQL"], competencyMode: "any" });
  assert.equal(all.length, 0);
  assert.equal(any.length, 1);
});

test("pilot demonstration covers three synthetic Personas from Profile to discovery and comparison", () => {
  const complete = candidate("complete", draft({
    identity: { fullName: "Ana Operações" },
    experiences: [
      ...draft().experiences,
      { id: "experience_2", source: "extracted", role: "Analista de Processos", organization: "Empresa Beta", period: "2017 - 2020", description: "Mapeamento e melhoria contínua.", evidenceText: "", page: 2 },
    ],
  }));
  const equivalent = candidate("equivalent", draft({
    identity: { fullName: "Caio Transformação" },
    competencies: ["Business Process Management", "Dashboards"],
    certifications: ["Lean Six Sigma Green Belt"],
  }));
  const partial = candidate("partial", draft({
    identity: { fullName: "Lia Perfil Parcial" },
    education: [], competencies: ["Atendimento"], certifications: [], languages: [],
  }));
  const results = searchPublishedProfiles(
    [complete, equivalent, partial],
    { ...emptyProfileSearchQuery(), competencies: ["BPM"] },
    { bpm: { equivalent: ["Business Process Management"] } },
  );
  assert.deepEqual(results.map((item) => item.candidate.personId), ["complete", "equivalent"]);
  assert.match(results[1]!.reasons.join(" "), /identificado a partir/);
  const partialView = buildPrismaProfileView({ fullName: partial.fullName, profile: partial.profileData });
  assert.equal(partialView.credentials, null);
  assert.equal(partialView.education.length, 0);
  assert.ok(results.slice(0, 2).every((item) => item.profile.experiences.length > 0));
});

test("the six product surfaces share the canonical Profile language and responsive layout", async () => {
  const [application, center, profile, versions, search, compare, styles] = await Promise.all([
    readFile("web/src/app/PrismaApplication.tsx", "utf8"),
    readFile("web/src/pages/PersonWorkspacePage.tsx", "utf8"),
    readFile("web/src/pages/PersonProfilePage.tsx", "utf8"),
    readFile("web/src/pages/ProfileVersionsPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileSearchPage.tsx", "utf8"),
    readFile("web/src/pages/ProfileComparePage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);
  assert.match(center, /Ver perfil[\s\S]*Criar nova revisão/);
  assert.match(profile, /CanonicalProfileView/);
  assert.match(versions, /StructuredProfileView/);
  assert.match(search, /Encontrar pessoas/);
  assert.match(search, /Por que apareceu nesta busca/);
  assert.match(search, /Comparar selecionados/);
  assert.match(compare, /Comparar perfis/);
  assert.match(compare, /Destaques objetivos/);
  assert.match(compare, /Ver perfil completo/);
  assert.match(application, /\/profiles\/search/);
  assert.match(application, /profileView: "compare"/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*\.prisma-profile-compare-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(`${profile}\n${search}\n${compare}`, /seniorityScore|skillSeniority|melhor candidato|Top candidate|% match/i);
});
