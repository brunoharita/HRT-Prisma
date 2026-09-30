import test from "node:test";
import assert from "node:assert/strict";
import { semanticFallbackBadge, semanticFallbackNotice, type SemanticFallbackNoticeInput } from "../web/src/shared/semanticFallbackNotice.js";

function failed(reasonCode: string, other: Partial<SemanticFallbackNoticeInput> = {}): SemanticFallbackNoticeInput {
  return { status: "indeterminate", reasonCode, ...other };
}

test("discordância real informa causa, consequência e revisão sem oferecer repetição", () => {
  const notice = semanticFallbackNotice([failed("READINGS_DISAGREE"), failed("READINGS_DISAGREE")]);
  assert.match(notice?.title ?? "", /IA deu duas respostas diferentes para 2 perfis/);
  assert.match(notice?.description ?? "", /respostas foram recebidas e verificadas/);
  assert.match(notice?.description ?? "", /cálculo interno desta consulta/);
  assert.match(notice?.description ?? "", /nenhuma dessas interpretações foi aplicada/);
  assert.match(notice?.description ?? "", /revisão humana/);
  assert.equal(notice?.canRefresh, false);
  assert.match(semanticFallbackBadge(failed("READINGS_DISAGREE")), /respostas diferentes/);
});

test("indeterminação por evidência insuficiente não é falsamente chamada de divergência", () => {
  const notice = semanticFallbackNotice([failed("INSUFFICIENT_EVIDENCE")]);
  assert.match(notice?.title ?? "", /evidências não bastaram/);
  assert.doesNotMatch(notice?.description ?? "", /leituras discordaram|respostas foram recebidas/);
});

test("prazo, serviço e resposta inválida têm explicações diferentes", () => {
  const timeout = semanticFallbackNotice([failed("PROVIDER_TIMEOUT")]);
  const provider = semanticFallbackNotice([failed("PROVIDER_UNAVAILABLE")]);
  const invalid = semanticFallbackNotice([failed("RESPONSE_INVALID")]);
  assert.match(timeout?.title ?? "", /não respondeu a tempo/);
  assert.match(provider?.title ?? "", /serviço de IA não concluiu/);
  assert.match(invalid?.title ?? "", /não pôde validar/);
  assert.doesNotMatch(invalid?.description ?? "", /leituras discordaram/);
});

test("andamento e causas mistas não inventam uma falha única", () => {
  const notice = semanticFallbackNotice([failed("READINGS_DISAGREE"), failed("PROVIDER_TIMEOUT"), failed("", { status: "processing" })]);
  assert.match(notice?.title ?? "", /motivos diferentes/);
  assert.match(notice?.description ?? "", /duas respostas diferentes/);
  assert.match(notice?.description ?? "", /não respondeu a tempo/);
  assert.match(notice?.description ?? "", /ainda está em andamento/);
  assert.equal(notice?.canRefresh, true);
  assert.equal(notice?.actionLabel, "Atualizar andamento");
});

test("tentativa disponível, espera e limite respeitam o estado recebido", () => {
  const ready = semanticFallbackNotice([failed("PROVIDER_UNAVAILABLE", { retryAvailable: true })]);
  assert.equal(ready?.actionLabel, "Tentar análise novamente");
  assert.equal(ready?.canRefresh, true);
  const waiting = semanticFallbackNotice([failed("PROVIDER_TIMEOUT", { retryAfter: "2026-10-01T12:00:00Z" })], Date.parse("2026-10-01T11:00:00Z"));
  assert.match(waiting?.description ?? "", /poderá ser feita após/);
  const exhausted = semanticFallbackNotice([failed("PROVIDER_TIMEOUT", { retryExhausted: true })]);
  assert.match(exhausted?.description ?? "", /limite de tentativas/);
  assert.equal(exhausted?.canRefresh, false);
});

test("causa desconhecida permanece desconhecida, sem culpar a IA", () => {
  const notice = semanticFallbackNotice([failed("NEW_REASON")]);
  assert.match(notice?.description ?? "", /não dispõe de uma explicação confirmada/);
  assert.match(notice?.description ?? "", /não atribuiu a falha à IA/);
  assert.match(semanticFallbackNotice([failed("SERVICE_UNAVAILABLE")])?.description ?? "", /não dispõe de uma explicação confirmada/);
  assert.equal(semanticFallbackNotice([]), null);
});

test("perfil sem conteúdo e triagem que não pede IA não são descritos como falha do provedor", () => {
  const noContent = semanticFallbackNotice([failed("NO_TRAJECTORY_EVIDENCE")]);
  const triage = semanticFallbackNotice([failed("OUTSIDE_SEMANTIC_TRIAGE")]);
  assert.match(noContent?.title ?? "", /Não havia conteúdo profissional/);
  assert.match(triage?.title ?? "", /não se aplicou/);
  assert.doesNotMatch(`${noContent?.description} ${triage?.description}`, /serviço de IA não concluiu/);
});
