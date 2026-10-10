import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("web/src/pages/VacancyPages.tsx", "utf8");
const description = "Requisitos da posição para os quais não foi encontrada evidência no Perfil publicado.";

test("missing requirements bucket uses the approved compact title and preserved description with dynamic count", () => {
  const missingBucket = source.split('<MatchBucket color="error"')[1]?.split("/>")[0] ?? "";
  assert.ok(missingBucket.includes('items={missing.map((item) => item.requirement.label)}'));
  assert.ok(missingBucket.includes('title={"Sem evidência (" + missing.length + ")"}'));
  assert.ok(missingBucket.includes('description="' + description + '"'));
  assert.ok(source.includes('const missing = match.requirements.filter((item) => item.status === "no_evidence")'));
  assert.ok(!source.includes('title={`Sem evidência suficiente (${missing.length})`}'));
});

test("description is optional and supplied only to the missing requirements bucket", () => {
  const calls = source.split("<MatchBucket ").slice(1).map(part => part.split("/>")[0]!);
  assert.equal(calls.length, 5); // four categories plus contextual alternative
  assert.equal(calls.filter(call => call.includes("description=")).length, 1);
  assert.equal(source.split(description).length - 1, 1);
  assert.match(source, /description\?: string/);
  assert.ok(source.includes('{description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}'));
});

test("other categories and the context-only branch retain their meaning in the compact layout", () => {
  for (const label of ['"Atendidos (" + met.length', '"Parciais para revisão (" + partial.length', '"Sinais relacionados (" + related.length', '"Sinais encontrados (" + contextualSignals.length']) {
    assert.ok(source.includes(label));
  }
  assert.ok(source.includes('match.discoveryGroup === "contextual_signals" ? <div className="prisma-candidate-buckets is-contextual">'));
});
