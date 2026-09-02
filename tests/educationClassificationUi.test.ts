import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync("web/src/components/review/StructuredReviewPanel.tsx", "utf8");
const center = readFileSync("web/src/pages/PersonWorkspacePage.tsx", "utf8");
const styles = readFileSync("web/src/styles.css", "utf8");

test("M5 review exposes the four academic dimensions and an explicit confirmation", () => {
  for (const label of ["Curso", "Instituição", "Período", "Situação", "Nível acadêmico", "Qualificação", "Origem da classificação"]) assert.match(review, new RegExp(label));
  assert.match(review, /Confirmar classificação/);
  assert.match(review, /Inferências e campos não identificados precisam da sua confirmação/);
});

test("person center and document context present structured education without a confidence score", () => {
  assert.match(center, /DocumentEducationSummary/);
  assert.match(center, /Formação acadêmica identificada/);
  assert.match(center, /Explícita: informada diretamente no documento/);
  assert.doesNotMatch(center, /Confiança da extração/);
});

test("academic cards reflow to one column on mobile", () => {
  assert.match(styles, /\.prisma-education-classification-grid[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.prisma-education-classification-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /\.prisma-document-education-summary__list article \{ grid-template-columns: minmax\(0, 1fr\)/);
});

test("academic dimensions participate in evidence navigation", () => {
  assert.match(review, /AcademicSelect[\s\S]*onSelect=\{onFieldSelect\}/);
  assert.match(review, /onFocus=\{\(\) => onSelect\(fieldPath, "reviewer"\)\}/);
});
