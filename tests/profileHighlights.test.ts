import assert from "node:assert/strict";
import test from "node:test";
import { profileHighlights, documentedMonths, approximateDuration } from "../web/src/domain/profileHighlights.js";
import type { PrismaProfileView } from "../web/src/domain/canonicalProfile.js";
import type { StructuredEducation, StructuredExperience } from "../web/src/domain/personIngestion.js";
const today = new Date(2026, 9, 6, 12);
const profile = (patch: Partial<PrismaProfileView> = {}): PrismaProfileView => ({ identity: { fullName: "Pessoa sintética", professionalTitle: null, location: null, lifecycleLabel: null, operationalStatusLabel: null }, about: null, experiences: [], education: [], competencyGroups: [], credentials: null, customSections: [], version: null, ...patch });
const experience = (id: string, period: string | null, description = ""): StructuredExperience => ({ id, role: id, organization: "Organização sintética", period, description, source: "human", evidenceText: "", page: null });
const education = (patch: Partial<StructuredEducation>): StructuredEducation => ({ id: "education", source: "human", course: "Curso sintético", institution: null, period: null, evidenceText: "", page: null, level: "undergraduate", qualification: "bachelor", status: "completed", classificationOrigin: "human", ...patch });
const card = (p: PrismaProfileView, id: string) => profileHighlights(p, today).find(x => x.id === id)!;
test("posição recente por datas, não ordem; posição anterior e período/duração visíveis", () => {
  const old = experience("Antiga", "Jan/2015 - Dez/2020"), recent = experience("Recente", "Jan/2022 - Dez/2024");
  const p = profile({ experiences: [recent, old] });
  assert.deepEqual(card(p, "position").values.map(x => x.text), ["Recente"]);
  assert.deepEqual(card(profile({ experiences: [old, recent] }), "position"), card(p, "position"));
  assert.equal(card(p, "position").additional?.title, "Posição anterior");
  assert.match(card(p, "position").values[0]!.detail!, /3 anos/);
  assert.deepEqual(p.experiences, [recent, old]);
});
test("posição vigente priorizada, outro registro sobreposto nunca vira anterior", () => {
  const p = profile({ experiences: [experience("Vigente", "Jan/25 - Atual"), experience("Paralela", "Abr/25 - Mar/26")] });
  assert.equal(card(p, "position").values[0]?.text, "Vigente");
  assert.match(card(p, "position").values[0]!.detail!, /1 ano e 9 meses/);
  assert.equal(card(p, "position").additional?.title, "Outra experiência recente");
  assert.match(card(p, "position").additional!.values[0]!.detail!, /1 ano/);
});
test("duas posições vigentes: início mais recente, outro registro preservado; empates preservados", () => {
  const p = profile({ experiences: [experience("A", "Jun/25 - Atual"), experience("B", "Out/25 - Atual")] });
  assert.deepEqual(card(p, "position").values.map(x => x.text), ["B"]);
  assert.equal(card(p, "position").additional?.title, "Outra posição em andamento");
  assert.equal(card(p, "position").additional?.values[0]?.text, "A");
  assert.equal(card(profile({ experiences: [experience("A", "Out/25 - Atual"), experience("B", "Out/25 - Atual")] }), "position").values.length, 2);
});
test("datas desconhecidas/invalidas/futuras não inventam sequência nem duração", () => {
  for (const period of [null, "31/02/2025 - Atual", "2025 - 2020", "2024", "Jan/2027 - Atual", "Jan/2025 - Dez/2027", "07/10/2026 - Atual", "Jan/2025 - 07/10/2026", "2020 - 2024", "Atual"]) {
    const x = card(profile({ experiences: [experience("A", "Jan/2020 - Dez/2024"), experience("B", period)] }), "position");
    assert.equal(x.values.length, 2); assert.match(x.note, /segurança/);
    assert.equal(documentedMonths([period], today), null);
  }
});
test("união mensal não soma sobreposições nem inclui lacunas; anos sem meses ficam indisponíveis", () => {
  assert.equal(documentedMonths(["Jan/2020 - Dez/2021", "Jan/2021 - Dez/2022"], today), 36);
  assert.equal(documentedMonths(["Jan/2020 - Dez/2020", "Jan/2022 - Dez/2022"], today), 24);
  assert.equal(documentedMonths(["Jan/2020 - Dez/2020", "Jan/2020 - Dez/2020"], today), 12);
  assert.equal(documentedMonths(["2020 - 2024"], today), null);
  assert.equal(documentedMonths([], today), null);
  assert.equal(documentedMonths(["Out/2026 - Atual"], today), 0);
  assert.match(approximateDuration(0), /Menos de 1 mês/);
  assert.match(approximateDuration(null), /não determinada/);
});
test("área vem da experiência recente e soma só experiências com menção explícita", () => {
  const p = profile({ about: { summary: null, professionalObjective: null, areasOfExpertise: ["Operações", "Marketing", "Financeiro"], keyResults: [] }, experiences: [experience("Recente", "Jan/2022 - Atual", "Atuação em Marketing."), experience("Antes", "Jan/2020 - Dez/2022", "Atuação em marketing."), experience("Sem relação", "Jan/2010 - Dez/2019", "Operações administrativas.")] });
  assert.deepEqual(card(p, "areas").values.map(x => x.text), ["Marketing"]);
  assert.match(card(p, "areas").values[0]!.detail!, /6 anos e 9 meses/);
  assert.deepEqual(card(p, "areas").additional?.values.map(x => x.text), ["Operações", "Financeiro"]);
  assert.equal(card(p, "areas").sources.length, 3);
});
test("área geral/empregador não identifica área recente; negação e menção parcial não sustentam tempo", () => {
  const p = profile({ about: { summary: null, professionalObjective: null, areasOfExpertise: ["Marketing", "TI"], keyResults: [] }, experiences: [experience("Cargo", "Jan/2022 - Atual", "Sem atuação em Marketing. Participação no time de atendimento.")] });
  assert.equal(card(p, "areas").values.length, 0);
  assert.match(card(p, "areas").note, /Tempo na área não determinado/);
  assert.ok(card(p, "areas").context);
  assert.equal(card(p, "areas").additional?.values.length, 2);
});
test("maior formação considera conclusão, preserva cursos empatados e qualificações desconhecidas", () => {
  const entries = [education({}), education({ level: "postgraduate", qualification: "doctorate", status: "in_progress" }), education({ level: "postgraduate", qualification: "master", course: "Mestrado concluído" }), education({ level: "postgraduate", qualification: "specialization" })];
  assert.deepEqual(card(profile({ education: entries }), "education").values.map(x => x.text), ["Mestrado concluído"]);
  const mba = education({ level: "postgraduate", qualification: "mba", course: "MBA" }), specialization = education({ level: "postgraduate", qualification: "specialization", course: "Especialização" });
  assert.equal(card(profile({ education: [mba, specialization] }), "education").values.length, 2);
  assert.equal(card(profile({ education: [{ ...mba, qualification: "unknown" }, education({ level: "postgraduate", qualification: "master" })] }), "education").values.length, 2);
});
test("conclusão inferida não confirmada e legado não viram concluídos", () => {
  const inferred = education({ classificationOrigin: "inferred", classificationReviewed: false });
  assert.equal(card(profile({ education: [inferred] }), "education").values.length, 0);
  assert.equal(card(profile({ education: [{ ...inferred, classificationReviewed: true }] }), "education").values.length, 1);
  assert.equal(card(profile({ education: [education({ status: "unknown" }), education({ level: "unknown" })] }), "education").values.length, 0);
  assert.match(card(profile({ education: [education({}), inferred] }), "education").title, /confirmada/);
});
test("organizações deduplicadas, clientes da descrição não contam; nenhuma ausência vira zero ou negativo", () => {
  const a = experience("A", "Jan/2020 - Atual", "Clientes: Outra Empresa");
  const p = profile({ experiences: [a, { ...a, id: "B", organization: "organização sintética" }] });
  assert.equal(card(p, "organizations").headline, "1 organização");
  assert.deepEqual(card(p, "organizations").values.map(x => x.text), ["Organização sintética"]);
  for (const x of profileHighlights()) { assert.equal(x.values.length, 0); assert.ok(x.note); assert.equal(x.headline, undefined); }
});
