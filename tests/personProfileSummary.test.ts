import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { personProfileSummary } from "../web/src/domain/personProfileSummary.js";
import { readProfessionalEvidenceProjection } from "../web/src/domain/personProfessionalEvidence.js";
import { m72DeclaredEvidence, m72DemonstratedEvidence, m72Fixture } from "./fixtures/m72PersonEvidence.js";

const pending = (originalIndex: number, normalizedTerm: string) => ({
  originalIndex, originalTerm: normalizedTerm, sourceText: normalizedTerm, normalizedTerm,
  searchTerms: [normalizedTerm], state: "unresolved" as const, reason: "Associação pendente",
});

test("Resumo M7 conta os mesmos itens da curadoria, não termos únicos nem ausências de evidência", () => {
  const base = m72Fixture();
  const projection = m72Fixture({
    normalization: { ...base.normalization, items: [pending(0, "SQL"), pending(1, "SQL"), pending(2, "Python"), { ...pending(3, "Java"), state: "resolved" }] },
  });
  const summary = personProfileSummary(projection)!;
  assert.equal(summary.pendingCount, 3);
  assert.deepEqual(summary.pendingPreview.map((item) => [item.normalizedTerm, item.groupCount]), [["SQL", 2], ["Python", 1]]);
  assert.equal(summary.conceptCount, 1);
  assert.equal(summary.evidenceCount, 2);
});

test("Resumo M7 preserva zero real, vazio neutro e indisponibilidade distinta de zero", () => {
  assert.equal(personProfileSummary(m72Fixture({ associations: [], issues: [] }))?.pendingCount, 0);
  assert.equal(personProfileSummary(m72Fixture({ associations: [] }))?.evidenceCount, 0);
  assert.equal(personProfileSummary(null), null);
  const base = m72Fixture();
  const processing = m72Fixture({ normalization: { ...base.normalization, status: "processing", items: [] } });
  assert.equal(personProfileSummary(processing)?.pendingCount, null);
  const failed = m72Fixture({ normalization: { ...base.normalization, status: "failed", items: [] } });
  assert.equal(personProfileSummary(failed)?.pendingCount, null);
});

test("Resumo M7 conta evidência distinta e ordena recência sem atribuir importância", () => {
  const second = { ...m72DemonstratedEvidence, id: "second-link", evidence: m72DeclaredEvidence.evidence };
  const summary = personProfileSummary(m72Fixture({ associations: [m72DeclaredEvidence, second, m72DemonstratedEvidence] }))!;
  assert.equal(summary.evidenceCount, 2);
  assert.deepEqual(summary.recentEvidence.map((item) => item.id), ["demonstrated:fixture", "observation:declared-fixture"]);
});

test("Resumo M7 só recebe projeção validada para pessoa e empresa solicitadas", () => {
  assert.throws(() => readProfessionalEvidenceProjection(m72Fixture(), "other-org", "person-fixture"), /incompatível/);
  assert.throws(() => readProfessionalEvidenceProjection(m72Fixture(), "org-fixture", "other-person"), /incompatível/);
});

test("Resumo M7 conserva navegação existente e não cria nível ou ranking", async () => {
  const ui = await readFile("web/src/components/profile/PersonProfessionalEvidenceMap.tsx", "utf8");
  const summary = ui.slice(ui.indexOf("function SummarySurface("), ui.indexOf("function CompetencySurface("));
  for (const label of ["Revisar competências", "Ver todas", "Criar nova revisão", "Abrir perfil completo", "Evidências recentes"]) assert.ok(summary.includes(label), label);
  assert.doesNotMatch(summary, /proficiência|senioridade|ranking|score|mais importante|top competências/i);
});
