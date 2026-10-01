import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = "web/src/components/TrajectoryConflictReview.tsx";

test("revisão da trajetória usa modal e mantém a escolha humana fechada", async () => {
  const [component, styles] = await Promise.all([
    readFile(componentPath, "utf8"), readFile("web/src/styles.css", "utf8"),
  ]);
  assert.match(component, /canReview \? <Modal/);
  assert.match(component, /Revisar divergências/);
  assert.match(component, /Pergunta da revisão/);
  assert.match(component, /Trecho publicado/);
  assert.match(component, /Leitura 1/);
  assert.match(component, /Leitura 2/);
  assert.match(component, /conflict\.first\.quote/);
  assert.match(component, /conflict\.second\.quote/);
  assert.match(component, /<Radio\.Group[\s\S]*?<Radio value="first">[\s\S]*?<Radio value="second">[\s\S]*?<Radio value="cannot_determine">/);
  assert.match(component, /disabled=\{decided !== view\.conflictCount\}/);
  assert.doesNotMatch(component, /<Input|<TextArea|<Select/);
  assert.doesNotMatch(component, /prisma-trajectory-conflict-details/);
  assert.match(styles, /\.prisma-trajectory-reading-pair \{[^}]*grid-template-columns: repeat\(2/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.prisma-trajectory-reading-pair \{ grid-template-columns: 1fr/);
});

test("par antigo só inicia nova checagem por ação explícita e não cria respostas", async () => {
  const component = await readFile(componentPath, "utf8");
  assert.match(component, /Respostas anteriores indisponíveis/);
  assert.match(component, /Não é possível recuperar as respostas antigas/);
  assert.match(component, /view\.reasonCode === "PAIR_NOT_STORED"/);
  assert.match(component, /onClick=\{\(\) => void refreshLegacyPair\(view\.analysisId\)\}/);
  assert.doesNotMatch(component.match(/async function open\(\)[\s\S]*?async function save/)?.[0] ?? "", /refreshLegacyTrajectoryReview/);
  assert.match(component, /view\.reasonCode === "TOO_MANY_CONFLICTS"/);
});
