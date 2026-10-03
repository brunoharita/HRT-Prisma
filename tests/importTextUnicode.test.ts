import assert from "node:assert/strict";
import test from "node:test";
import { containsInvalidImportUnicode, prepareImportText, representImportText } from "../web/src/domain/importTextUnicode.js";
import { importEvidenceIssue } from "../web/src/domain/importEvidencePersistence.js";
import { importFailureDiagnostic, supabaseOperationError } from "../web/src/domain/reviewOperationErrors.js";
import type { ExtractedPage, StructuredDraft, PersonDocumentTimelineItem } from "../web/src/domain/personIngestion.js";
import { canResumeFailedAiIntake, parserIaIdentity, structureParserIa } from "../web/src/domain/parserIa.js";

const draft = { identity: { fullName: "Synthetic Person" }, contact: {}, uncertainties: [], notIdentified: [], keyResults: [], experiences: [], education: [], customSections: [] } as unknown as StructuredDraft;
const page = { pageNumber: 1, text: "\0\nItem composto", origin: "native_pdf", method: "pdfjs", methodVersion: "synthetic", usefulCharacterCount: 13, layoutLines: [{ text: "\0", x: 0.1, y: 0.2, width: 0.02, height: 0.01 }, { text: "Item composto", x: 0.2, y: 0.2, width: 0.3, height: 0.01 }] } as ExtractedPage;

test("Unicode preserves accents, emojis, delimiters, TAB and LF while representing only invalid units", () => {
  for (const text of ["São Paulo • C++ / SQL\tPython\nItem composto 😀𐐀", "\u0001\uFFFD\uFFFF"]) assert.deepEqual(representImportText(text), { text, replacements: { nul: 0, unpairedSurrogates: 0 } });
  assert.deepEqual(representImportText("a\0b\uD800c\uDC00d😀"), { text: "a�b�c�d😀", replacements: { nul: 1, unpairedSurrogates: 2 } });
});

test("whole payload validation rejects invalid page, layout, evidence, draft and keys", () => {
  assert.equal(importEvidenceIssue([page], draft)?.reason, "unicode_invalid");
  const clean = prepareImportText([page], draft);
  assert.equal(importEvidenceIssue(clean.pages, clean.draft), null);
  for (const corrupted of [{ ...clean.pages[0]!, layoutLines: [{ text: "x\0", x: 0, y: 0, width: 0.1, height: 0.1 }] }, { ...clean.pages[0]!, fieldEvidence: [{ text: "x\uD800" }] }]) assert.equal(importEvidenceIssue([corrupted as ExtractedPage], draft)?.reason, "unicode_invalid");
  assert.equal(importEvidenceIssue(clean.pages, { ...draft, summary: "x\0" })?.reason, "unicode_invalid");
  assert.throws(() => prepareImportText(clean.pages, { ...draft, "bad\0key": true } as StructuredDraft), /UNICODE_KEY_INVALID/);
});

test("derived text retains every row, geometry, raw source, line order and explicit review warnings", () => {
  const snapshot = JSON.stringify({ page, draft });
  const prepared = prepareImportText([page], { ...draft, summary: "Original\uDC00" });
  assert.equal(JSON.stringify({ page, draft }), snapshot);
  assert.equal(prepared.pages[0]!.text, "�\nItem composto");
  assert.deepEqual(prepared.pages[0]!.layoutLines!.map(({ text: _text, ...geometry }) => geometry), page.layoutLines!.map(({ text: _text, ...geometry }) => geometry));
  assert.match(prepared.pages[0]!.methodVersion, /unicode-text-1\.0\.0:nul=2:surrogate=0/);
  assert.equal(prepared.draft.summary, "Original�");
  assert.equal(prepared.draft.uncertainties.length, 2);
  assert.equal(containsInvalidImportUnicode(prepared), false);
  assert.deepEqual(prepareImportText(prepared.pages, prepared.draft), prepared);
  assert.equal(prepareImportText([{ ...page, text: "valid", layoutLines: [] }], draft).draft, draft);
});

test("22P05 has a Unicode cause and old adapter failure can be retried after correction", () => {
  const diagnostic = importFailureDiagnostic(supabaseOperationError({ code: "22P05", message: "unsupported Unicode escape sequence private-resume-content" }, "fallback"), "persisting", "synthetic");
  assert.equal(diagnostic.reason, "unicode_invalid");
  assert.doesNotMatch(JSON.stringify(diagnostic), /private-resume-content/);
  const failed = { sourceType: "resume_pdf", extractionVersion: "pdfjs-5.4.296/parser-ia-spans-v1", isLegacyUnstored: false, status: "failed", reviewState: "not_ready", reviewAttempt: null, latestAttempt: { state: "failed_structuring", failureCode: "import_evidence_contract_invalid", usefulCharacterCount: 0, structuringVersion: "parser-ia-1.0.0/synthetic/" + "a".repeat(64) + "/evidence-adapter-1.0.0" } } as PersonDocumentTimelineItem;
  assert.equal(canResumeFailedAiIntake(failed), true);
  assert.equal(canResumeFailedAiIntake({ ...failed, latestAttempt: { ...failed.latestAttempt!, structuringVersion: failed.latestAttempt!.structuringVersion!.replace("adapter-1.0.0", "adapter-1.0.1") } }), false);
});

test("invalid name units are explicit before identity lookup, without changing facts or cited text", () => {
  const source = [{ ...page, text: "Synthetic\0Person", layoutLines: [{ ...page.layoutLines![0]!, text: "Synthetic\0Person" }] }];
  const result = structureParserIa({ status: "complete", facts: [{ path: "identity.fullName", value: "Synthetic\0Person", sources: ["p1l1"] }], uncertainties: [] }, source, { organizationId: "synthetic", sourceSha256: "a".repeat(64), provenance: { model: "synthetic", promptSha256: "b".repeat(64), responseId: "synthetic", inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 } });
  assert.equal(parserIaIdentity(result).fullName, "Synthetic�Person");
  assert.equal(result.status, "partial");
  assert.equal(result.acceptedFacts[0]!.value, "Synthetic\0Person");
  assert.equal(result.fieldEvidence[0]!.text, "Synthetic\0Person");
  assert.ok(result.draft.uncertainties.some(value => value.includes("símbolo não identificado")));
});
