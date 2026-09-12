import assert from "node:assert/strict";
import test from "node:test";
import { parserIaSource, structureParserIa, validateParserPayload, parserIaIdentity, preparedParserIa, parserIaMethodVersion, type ParserFact } from "../web/src/domain/parserIa.js";
import type { ExtractedPage } from "../web/src/domain/personIngestion.js";

const page = (pageNumber: number, lines: string[]): ExtractedPage => ({ pageNumber, text: lines.join("\n"), origin: "native_pdf", usefulCharacterCount: 300, method: "pdfjs", methodVersion: "synthetic", layoutLines: lines.map((text, index) => ({ text, x: 0.1, y: 0.05 + index * 0.02, width: 0.7, height: 0.013, fontSize: 10, emphasis: "regular" })) });
const binding = { sourceSha256: "a".repeat(64), organizationId: "local-test", provenance: { model: "synthetic", promptSha256: "b".repeat(64), responseId: "resp_fake", inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 1 } };
const fact = (path: string, value: string, ...sources: string[]): ParserFact => ({ path, value, sources });
const run = (pages: ExtractedPage[], facts: ParserFact[], status: "partial" | "complete" = "complete") => structureParserIa({ status, facts, uncertainties: [] }, pages, binding);

test("M5.7 joins wrapped email with both source spans and retains original geometry", () => {
  const pages = [page(1, ["Pessoa Exemplo", "pessoa@example.co", "m"])];
  const original = JSON.stringify(pages);
  const result = run(pages, [fact("identity.fullName", "Pessoa Exemplo", "p1l1"), fact("contact.email", "pessoa@example.com", "p1l2", "p1l3")]);
  assert.equal(result.draft.contact.email, "pessoa@example.com");
  assert.equal(parserIaIdentity(result).emailPage, 1);
  assert.equal(result.fieldEvidence.filter((e) => e.fieldPath === "contact.email").length, 2);
  assert.equal(JSON.stringify(pages), original);
});
test("M5.7 rejects the truncated email even when its prefix is a real span", () => {
  const result = run([page(1, ["Pessoa Exemplo", "pessoa@example.co", "m"])], [fact("identity.fullName", "Pessoa Exemplo", "p1l1"), fact("contact.email", "pessoa@example.co", "p1l2")]);
  assert.equal(result.draft.contact.email, null); assert.equal(result.status, "partial"); assert.equal(result.rejected.length, 1);
});
test("M5.7 groups distinct roles and preserves description continuation across pages", () => {
  const pages = [page(1, ["Empresa Um", "Gestor", "2023 - Present", "Primeira parte"]), page(2, ["continuação", "Analista", "2020 - 2022"])];
  const result = run(pages, [fact("experiences.a.organization", "Empresa Um", "p1l1"), fact("experiences.a.role", "Gestor", "p1l2"), fact("experiences.a.period", "2023 - Present", "p1l3"), fact("experiences.a.description", "Primeira parte continuação", "p1l4", "p2l1"), fact("experiences.b.organization", "Empresa Um", "p1l1"), fact("experiences.b.role", "Analista", "p2l2"), fact("experiences.b.period", "2020 - 2022", "p2l3")]);
  assert.equal(result.draft.experiences.length, 2);
  assert.notEqual(result.draft.experiences[0]!.id, result.draft.experiences[1]!.id);
  assert.deepEqual(result.fieldEvidence.filter((e) => e.fieldPath.endsWith(".description")).map((e) => e.pageNumber), [1, 2]);
  assert.deepEqual(result.draft.experiences.map((e) => e.organization), ["Empresa Um", "Empresa Um"]);
});
test("M5.7 absent education course and status remain unasserted", () => {
  const result = run([page(1, ["Instituição Um", "2022 - 2023"])], [fact("education.a.institution", "Instituição Um", "p1l1"), fact("education.a.period", "2022 - 2023", "p1l2")]);
  assert.equal(result.draft.education[0]!.course, null);
  assert.equal(result.draft.education[0]!.classifierSnapshot!.course, null);
  assert.equal(result.draft.education[0]!.status, "unknown");
});
test("M5.7 preserves source duplicates for human consolidation", () => {
  const result = run([page(1, ["MBA em Gestão", "MBA em Gestão"])], [fact("education.a.course", "MBA em Gestão", "p1l1"), fact("education.b.course", "MBA em Gestão", "p1l2")]);
  assert.equal(result.draft.education.length, 2); assert.equal(result.status, "partial");
});
test("M5.7 unsupported values and nonexistent references never fill fields", () => {
  const result = run([page(1, ["Pessoa Exemplo", "Brasil"])], [fact("identity.fullName", "Pessoa Exemplo", "p1l1"), fact("contact.city", "Bauru", "p1l2"), fact("contact.state", "SP", "p99l1")]);
  assert.equal(result.draft.contact.city, null); assert.equal(result.draft.contact.state, null); assert.equal(result.rejected.length, 2);
});
test("M5.7 empty or wholly unsupported output is not a valid profile", () => {
  assert.throws(() => run([page(1, ["Brasil"])], []), /NO_SUPPORTED_FACTS/);
  assert.throws(() => run([page(1, ["Brasil"])], [fact("contact.city", "Bauru", "p1l1")]), /NO_SUPPORTED_FACTS/);
});
test("M5.7 rejects injected paths, coordinates, duplicate paths and output authority", () => {
  for (const path of ["approved", "education.a.status", "experiences.__proto__.role", "contact.constructor", "experiences.a.course"]) assert.throws(() => validateParserPayload({ status: "complete", facts: [fact(path, "x", "p1l1")], uncertainties: [] }), /RESPONSE_INVALID/);
  assert.throws(() => validateParserPayload({ status: "complete", facts: [{ ...fact("summary", "x", "p1l1"), x: 0.1 }], uncertainties: [] }), /RESPONSE_INVALID/);
  assert.throws(() => validateParserPayload({ status: "complete", facts: [fact("summary", "x", "p1l1"), fact("summary", "x", "p1l1")], uncertainties: [] }), /RESPONSE_INVALID/);
});
test("M5.7 preserves explicit multiword list entries without inventing proficiency", () => {
  const result = run([page(1, ["Gestão de contas | Corporate Learning", "Inglês"])], [fact("competencies.0", "Gestão de contas", "p1l1"), fact("competencies.1", "Corporate Learning", "p1l1"), fact("languages.0", "Inglês", "p1l2")]);
  assert.deepEqual(result.draft.competencies, ["Gestão de contas", "Corporate Learning"]); assert.deepEqual(result.draft.languages, ["Inglês"]);
});
test("M5.7 explicit partial response cannot become complete", () => { assert.equal(run([page(1, ["Pessoa Exemplo"])], [fact("identity.fullName", "Pessoa Exemplo", "p1l1")], "partial").status, "partial"); });
test("M5.7 rejects unknown source geometry, duplicate pages and missing tenant binding", () => {
  const source = page(1, ["Pessoa Exemplo"]);
  assert.throws(() => parserIaSource([source, source]), /SOURCE_INVALID/);
  source.layoutLines![0]!.x = 3; assert.throws(() => parserIaSource([source]), /GEOMETRY_INVALID/);
  assert.throws(() => structureParserIa({}, [], { ...binding, organizationId: "" }), /BINDING_INVALID/);
});
test("M5.7 retains explicit custom section through existing draft contract", () => {
  const result = run([page(1, ["Publicações", "Artigo declarado"])], [fact("customSections.publications.name", "Publicações", "p1l1"), fact("customSections.publications.items.0", "Artigo declarado", "p1l2")]);
  assert.equal(result.draft.customSections[0]!.items[0]!.value, "Artigo declarado"); assert.equal(result.draft.customSections[0]!.source, "extracted");
});
test("M5.7 restores spaces from full cited spans without turning country into state", () => {
  const result = run([page(1, ["Sócio", "Proprietário", "Brasil"])], [fact("experiences.a.role", "SócioProprietário", "p1l1", "p1l2"), fact("contact.state", "Brasil", "p1l3")]);
  assert.equal(result.draft.experiences[0]!.role, "Sócio Proprietário");
  assert.equal(result.draft.contact.state, null); assert.equal(result.status, "partial");
});
test("M5.7 prepared draft is reused only for the exact source and organization", () => {
  const result = run([page(1, ["Pessoa Exemplo"])], [fact("identity.fullName", "Pessoa Exemplo", "p1l1")]);
  const input = { sha256: binding.sourceSha256, parserIa: result };
  assert.equal(preparedParserIa(input, binding.organizationId), result);
  assert.equal(preparedParserIa({ sha256: input.sha256 }, binding.organizationId), null);
  assert.throws(() => preparedParserIa(input, "other-org"), /BINDING_INVALID/);
  assert.throws(() => preparedParserIa({ ...input, sha256: "c".repeat(64) }, binding.organizationId), /BINDING_INVALID/);
  assert.equal(parserIaMethodVersion(result), `parser-ia-1.0.0/synthetic/${"b".repeat(64)}`);
  assert.throws(() => parserIaMethodVersion({ ...result, provenance: { ...result.provenance, promptSha256: "unknown" } }), /PROVENANCE_INVALID/);
});
