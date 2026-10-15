import assert from "node:assert/strict";
import test from "node:test";
import { classifyTokenRates } from "../web/src/domain/tokenRateHistory.js";
import type { TokenRate } from "../web/src/domain/prismaTokens.js";
import { profileFixture } from "./fixtures/personFlow.js";
import { normalizeReviewDraft, validateReviewDraftForSave } from "../web/src/domain/reviewFieldLifecycle.js";
import { deriveProfileDelta } from "../web/src/domain/profileDelta.js";

test("rate history mirrors backend temporal ordering and future never replaces current", () => {
  const rate = (id: string, functionName: TokenRate["functionName"], date: string, amount: number, createdAt = date): TokenRate => ({ id, functionName, effectiveAt: date, tokensPerUnit: amount, createdAt });
  const input = [rate("1", "parser_ia", "2026-10-01T00:00:00Z", 101), rate("2", "parser_ia", "2026-10-12T00:00:00Z", 207), rate("3", "parser_ia", "2026-11-01T00:00:00Z", 311), rate("4", "profile_synthesis", "2026-10-12T00:00:00Z", 419), rate("5", "parser_ia", "2026-10-12T00:00:00Z", 503, "2026-10-13T00:00:00Z")];
  const snapshot = JSON.stringify(input), result = classifyTokenRates(input, Date.parse("2026-10-15T00:00:00Z"));
  assert.deepEqual(result.current.map(r => r.id), ["5", "4"]);
  assert.deepEqual(result.history.map(g => [g.effectiveAt, g.scheduled, g.rates.map(r => r.id)]), [["2026-11-01T00:00:00Z", true, ["3"]], ["2026-10-12T00:00:00Z", false, ["2"]], ["2026-10-01T00:00:00Z", false, ["1"]]]);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(classifyTokenRates(input, Date.parse("2026-11-01T00:00:00Z")).current.find(r => r.functionName === "parser_ia")?.id, "3");
  assert.deepEqual(classifyTokenRates([], 0), { current: [], history: [] });
});

test("manual partial draft accepts identity only while existing publication validation still requires contact and facts", () => {
  const input = profileFixture({ contact: { city: null, state: null, phone: null, email: null, linkedin: null }, professionalTitle: null, competencies: [], experiences: [] });
  assert.deepEqual(validateReviewDraftForSave(input, { allowPartialManualDraft: true }), []);
  assert.deepEqual(validateReviewDraftForSave(input).map(i => i.fieldPath), ["contact.phone", "contact.email", "professionalTitle"]);
  input.contact.email = "invalid";
  assert.equal(validateReviewDraftForSave(input, { allowPartialManualDraft: true }).some(i => i.fieldPath === "contact.email"), true);
  input.identity.fullName = "";
  assert.equal(validateReviewDraftForSave(input, { allowPartialManualDraft: true }).some(i => i.fieldPath === "identity.fullName"), true);
});

test("manual structured review retains all lists and exposes omissions for explicit human comparison", () => {
  const input = profileFixture({ experiences: [{ id: "experience_manual0001", source: "human", organization: "Empresa exemplo", role: "Analista", period: "2020 - 2024", description: "Atividades declaradas", evidenceText: "", page: null }], toolsAndTechnologies: ["SQL", "Planilhas"], professionalContexts: ["Varejo"], languages: ["Português", "Inglês"], certifications: ["Certificado"], customSections: [{ id: "manual_projects", name: "Projetos", format: "list", source: "human", items: [{ id: "item_manual0001", value: "Projeto A" }, { id: "item_manual0002", value: "Projeto B" }] }] });
  const normalized = normalizeReviewDraft(input);
  assert.deepEqual(normalized.toolsAndTechnologies, ["SQL", "Planilhas"]);
  assert.deepEqual(normalized.professionalContexts, ["Varejo"]);
  assert.equal(normalized.customSections[0]?.items.length, 2);
  assert.deepEqual(validateReviewDraftForSave(normalized), []);
  const delta = deriveProfileDelta(normalized, { ...normalized, experiences: [] });
  assert.equal(delta.items.some(i => i.section === "experiences" && i.kind === "not_cited"), true);
});
