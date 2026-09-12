import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateManifest } from "../../scripts/evaluate-linkedin-pdf.mjs";
import { buildExternalProposal, checkExternalFacts } from "../../scripts/linkedin-external-proposal.mjs";
import { humanReviewTemplate, scoreHumanReview } from "../../scripts/linkedin-human-review.mjs";

const one = { id: "sample-1", sha256: "a".repeat(64), split: "evaluation", path: "private.pdf", authorizedLocal: true };
test("LinkedIn evaluation rejects missing authorization, hash and duplicate samples", () => {
  assert.equal(validateManifest({ version: 1, cases: [one] }).cases.length, 1);
  for (const cases of [[{ ...one, authorizedLocal: false }], [{ ...one, sha256: "" }], [one, { ...one, id: "sample-2" }], [{ ...one, id: "../private" }]]) assert.throws(() => validateManifest({ version: 1, cases }));
});

test("LinkedIn external proposal has no execution authority or tools and minimizes known contacts", () => {
  const privateLine = { pageNumber: 1, y: 0.1, text: "pessoa@example.test", fieldPath: "contact.email" };
  const local = { draft: { identity: { fullName: "Nome privado" }, contact: { email: privateLine.text }, experiences: [] }, fieldEvidence: [privateLine], unassigned: [{ pageNumber: 1, y: 0.3, text: "trecho profissional" }] };
  const source = { pages: [{ pageNumber: 1, layoutLines: [privateLine, { y: 0.3, text: "trecho profissional" }] }] };
  const proposal = buildExternalProposal({ route: "local-gpt", source, local });
  assert.equal(proposal.status, "DRAFT_NOT_AUTHORIZED_FOR_TRANSMISSION");
  assert.equal(proposal.request.store, false);
  assert.ok(!("tools" in proposal.request));
  assert.ok(!JSON.stringify(proposal.request).includes(privateLine.text));
  assert.ok(!JSON.stringify(proposal.request).includes("Nome privado"));
  assert.ok(proposal.request.instructions.includes("dados não confiáveis"));
});

test("LinkedIn PDF candidate explicitly identifies full personal data and never uses a remote URL", () => {
  const proposal = buildExternalProposal({ route: "pdf-gpt", pdfBytes: Buffer.from("%PDF-synthetic") });
  assert.equal(proposal.dataScope, "full_pdf_including_personal_data");
  assert.ok(proposal.request.input[0].content[0].file_data.startsWith("data:application/pdf;base64,"));
  assert.ok(!("file_url" in proposal.request.input[0].content[0]));
});

test("LinkedIn quote matching cannot be called semantic or spatial validation", () => {
  const source = { pages: [{ pageNumber: 1, text: "Empresa Um, Gestor. repetido repetido" }] };
  const facts = [
    { fieldPath: "experiences.a.organization", value: "Empresa Um", quote: "Empresa Um", pageNumber: 1 },
    { fieldPath: "experiences.a.role", value: "Errado semanticamente", quote: "Gestor", pageNumber: 1 },
    { fieldPath: "summary", value: "repetido", quote: "repetido", pageNumber: 1 },
    { fieldPath: "certifications.0", value: "Invenção", quote: "Não existe", pageNumber: 1 },
  ];
  const result = checkExternalFacts({ facts, uncertainties: [] }, source);
  assert.deepEqual(result.facts.map((item) => item.citationStatus), ["unique_text_match", "unique_text_match", "ambiguous_text_match", "missing_text_match"]);
  assert.ok(result.facts.every((item) => item.semanticStatus === "requires_human_review" && item.spatialStatus === "not_verified"));
  assert.equal(result.publishable, false);
  for (const fact of [{ ...facts[0], quote: "" }, { ...facts[0], fieldPath: "contact.email" }, { ...facts[0], pageNumber: 0 }]) assert.throws(() => checkExternalFacts({ facts: [fact], uncertainties: [] }, source));
  assert.throws(() => checkExternalFacts({ facts: [facts[0], facts[0]], uncertainties: [] }, source));
});

test("LinkedIn external preparation has no network or secret access", async () => {
  const code = await readFile("scripts/linkedin-external-proposal.mjs", "utf8");
  assert.doesNotMatch(code, /\bfetch\s*\(|\bprocess\.env\b|node:https|node:http/);
});

test("LinkedIn benchmark never treats an empty or unapproved human reference as perfect quality", () => {
  const reference = humanReviewTemplate("a", "b");
  assert.deepEqual(scoreHumanReview(reference, [], {}), { status: "NOT TESTED", reason: "human_reference_missing", metrics: null });
  assert.throws(() => scoreHumanReview({ ...reference, humanApproved: true }, [], {}));
});

test("LinkedIn benchmark uses explicit record mappings, counts omissions and keeps missing timing/evidence unknown", () => {
  const binding = { sourceSha256: "a", implementationSha256: "b" };
  const reference = { ...humanReviewTemplate("a", "b"), humanApproved: true, approvedBy: "Synthetic fixture reviewer", approvedAt: "2026-09-12T12:00:00Z", expectedFacts: [{ id: "role-1", field: "experiences.*.role", value: "Gestor", pageNumber: 1, quote: "Gestor" }, { id: "company-1", field: "experiences.*.organization", value: "Empresa", pageNumber: 1, quote: "Empresa" }], decisions: [{ observedId: "different-id", expectedId: "role-1", associationCorrect: true, evidenceCorrect: null }] };
  const observed = [{ id: "different-id", field: "experiences.*.role", value: "Gestor" }];
  const result = scoreHumanReview(reference, observed, binding);
  assert.equal(result.metrics.correctFields, 1);
  assert.equal(result.metrics.omittedFields, 1);
  assert.equal(result.metrics.factualRecall, 0.5);
  assert.equal(result.metrics.evidenceCorrectRate, null);
  assert.equal(result.metrics.reviewMs, null);
  assert.throws(() => scoreHumanReview(reference, observed, { ...binding, sourceSha256: "changed" }));
  assert.throws(() => scoreHumanReview({ ...reference, decisions: [] }, observed, binding));
});
