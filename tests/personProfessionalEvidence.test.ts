import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  groupProfessionalEvidence,
  readProfessionalEvidenceProjection,
  summarizeProfessionalEvidence,
} from "../web/src/domain/personProfessionalEvidence.js";
import { m72DeclaredEvidence, m72DemonstratedEvidence, m72Fixture } from "./fixtures/m72PersonEvidence.js";

test("M7.2 lê apenas o contrato e o tenant esperados", () => {
  assert.deepEqual(readProfessionalEvidenceProjection(m72Fixture(), "org-fixture", "person-fixture"), m72Fixture());
  assert.throws(() => readProfessionalEvidenceProjection(m72Fixture({ contractVersion: "future" as never }), "org-fixture", "person-fixture"), /incompatível/);
  assert.throws(() => readProfessionalEvidenceProjection(m72Fixture(), "foreign-org", "person-fixture"), /incompatível/);
  assert.throws(() => readProfessionalEvidenceProjection(m72Fixture(), "org-fixture", "foreign-person"), /incompatível/);
});

test("M7.2 preserva múltiplas naturezas e só conta demonstração válida", () => {
  const groups = groupProfessionalEvidence(m72Fixture());
  const java = groups.flatMap((group) => group.concepts).find((concept) => concept.label === "Java");
  assert.deepEqual(java?.natures, ["declared", "demonstrated"]);
  assert.equal(java?.evidences.length, 2);
  assert.equal(java?.hasCurrentDemonstratedEvidence, true);
  assert.deepEqual(summarizeProfessionalEvidence(m72Fixture()), {
    groupCount: 1,
    conceptCount: 1,
    declaredCount: 1,
    contextualCount: 0,
    demonstratedCount: 1,
    evidenceCount: 2,
  });
  const expired = { ...m72DemonstratedEvidence, verification: { ...m72DemonstratedEvidence.verification!, status: "expired", qualifiesAsVerified: false } };
  assert.equal(summarizeProfessionalEvidence(m72Fixture({ associations: [m72DeclaredEvidence, expired] })).demonstratedCount, 0);
});

test("M7.2 mantém ambiguidade explícita sem fabricar conceito", () => {
  const fixture = m72Fixture({ associations: [], issues: [{ code: "ambiguous", observedTerm: "Arquitetura", explanation: "Seleção humana necessária." }] });
  assert.deepEqual(groupProfessionalEvidence(fixture), []);
  assert.equal(fixture.issues[0]?.code, "ambiguous");
});

test("M7.2 rejeita ocupação como evidência pessoal de competência", () => {
  const invalid = m72Fixture({
    associations: [{
      ...m72DeclaredEvidence,
      concept: { ...m72DeclaredEvidence.concept, type: "occupation" },
    }],
  });
  assert.throws(
    () => readProfessionalEvidenceProjection(invalid, "org-fixture", "person-fixture"),
    /incompatível/,
  );
});

test("M7.2 SQL é uma projeção somente leitura, tenant-scoped e sem requisitos de Posição", async () => {
  const sql = await readFile("supabase/migrations/20260918160000_m72_person_professional_evidence.sql", "utf8");
  assert.match(sql, /private\.m72_require_profile_reader/);
  assert.match(sql, /private\.has_org_role/);
  assert.match(sql, /superseded_at is null/);
  assert.match(sql, /review_status = 'approved'/);
  assert.match(sql, /knowledge-normalization-2\.0\.0/);
  assert.match(sql, /competency_demonstrated_evidence/);
  assert.match(sql, /demonstrated\.status = 'active'/);
  assert.match(sql, /resolution\.resolution_state = 'resolved'/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|merge|truncate)\b/i);
  assert.doesNotMatch(sql, /vacancy_requirements|position_taxonomy_relations|from public\.vacancies/i);
  assert.doesNotMatch(sql, /grant execute .* to anon/i);
});

test("M7.2 UI oferece superfícies, filtros, explicação, origem e responsividade", async () => {
  const [ui, css, page, review, release] = await Promise.all([
    readFile("web/src/components/profile/PersonProfessionalEvidenceMap.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
    readFile("web/src/pages/PersonProfilePage.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
    readFile("web/src/config/releaseRegistry.ts", "utf8"),
  ]);
  for (const label of ["Resumo", "Competências", "Evidências", "Por que o Prisma está mostrando isso?", "Abrir origem", "Declaradas", "Contextuais", "Evidência Demonstrada"] ) assert.ok(ui.includes(label), label);
  assert.match(page, /prisma\.review-evidence/);
  assert.match(review, /readStoredEvidenceTarget/);
  assert.match(review, /setNavigationTarget\(\{ pageNumber: evidenceTarget\.pageNumber/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(release, /M7\.2: perfil de competências e evidências/);
  assert.match(ui, /Não representam nível de proficiência, senioridade ou score/);
  const domain = await readFile("web/src/domain/personProfessionalEvidence.ts", "utf8");
  assert.doesNotMatch(domain, /score:|proficiency:|seniority:/i);
});
