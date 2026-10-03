import assert from "node:assert/strict";
import test from "node:test";
import { attachFieldEvidence } from "../web/src/domain/adaptiveResumeExtraction.js";
import { importEvidenceIssue, PARSER_EVIDENCE_ADAPTER_VERSION } from "../web/src/domain/importEvidencePersistence.js";
import { structureParserIa, preparedParserIa, parserIaMethodVersion, canResumeFailedAiIntake, importRecoveryNeedsSystemUpdate } from "../web/src/domain/parserIa.js";
import { importEvidenceOperationError, importFailureDiagnostic, supabaseOperationError } from "../web/src/domain/reviewOperationErrors.js";
import { importProcessingPresentation } from "../web/src/domain/importProcessingPresentation.js";
import { reviewFieldPathExists } from "../web/src/domain/reviewFieldLifecycle.js";
import type { ExtractedPage, PersonDocumentTimelineItem } from "../web/src/domain/personIngestion.js";

const pages: ExtractedPage[] = [{ pageNumber: 1, text: "Synthetic Person\nProjects\nDeclared item\nSQL\nRetail", origin: "native_pdf", usefulCharacterCount: 50, method: "pdfjs", methodVersion: "synthetic", layoutLines: ["Synthetic Person", "Projects", "Declared item", "SQL", "Retail"].map((text, index) => ({ text, x: 0.1, y: 0.1 + index * 0.05, width: 0.5, height: 0.02, fontSize: 10, emphasis: "regular" })) }];
const binding = { sourceSha256: "a".repeat(64), organizationId: "synthetic", provenance: { model: "synthetic", promptSha256: "b".repeat(64), responseId: "synthetic", inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 } };
const facts = [
  { path: "identity.fullName", value: "Synthetic Person", sources: ["p1l1"] },
  { path: "customSections.X.name", value: "Projects", sources: ["p1l2"] },
  { path: "customSections.X.items.0", value: "Declared item", sources: ["p1l3"] },
  { path: "keyResults.KPI.value", value: "Declared item", sources: ["p1l3"] },
  { path: "toolsAndTechnologies.0", value: "SQL", sources: ["p1l4"] },
  { path: "professionalContexts.0", value: "Retail", sources: ["p1l5"] },
];
const build = () => structureParserIa({ status: "complete", facts, uncertainties: [] }, pages, binding);

test("v2.0.2 maps existing categories and arbitrary model identifiers without losing source regions", () => {
  const result = build();
  assert.match(result.draft.keyResults[0]!.id, /^result_[a-z0-9]{8,64}$/);
  assert.match(result.draft.customSections[0]!.id, /^[a-z0-9][a-z0-9_-]{7,79}$/);
  assert.equal(result.fieldEvidence.length, facts.length);
  assert.deepEqual(result.acceptedFacts, facts);
  assert.deepEqual(result.draft.toolsAndTechnologies, ["SQL"]);
  assert.deepEqual(result.draft.professionalContexts, ["Retail"]);
  assert.deepEqual(result.draft.competencies, []);
  assert.equal(importEvidenceIssue(attachFieldEvidence(pages, result.fieldEvidence), result.draft), null);
  for (const evidence of result.fieldEvidence) assert.equal(reviewFieldPathExists(result.draft, evidence.fieldPath), true);
  assert.deepEqual(result.fieldEvidence.map(({ text, x, y, width, height }) => ({ text, x, y, width, height })), facts.map((fact) => {
    const line = pages[0]!.layoutLines![Number(fact.sources[0]!.slice(3)) - 1]!;
    return { text: line.text, x: line.x, y: line.y, width: line.width, height: line.height };
  }));
  assert.deepEqual(build(), result);
});

test("v2.0.2 adapts old prepared/cache results without mutation or inference", () => {
  const current = build(); const section = current.draft.customSections[0]!;
  const old = { ...current, draft: { ...current.draft, keyResults: [{ id: "KPI", value: "Declared item" }], customSections: [{ ...section, id: "X", items: [{ id: "X-0", value: "Declared item" }] }] }, fieldEvidence: current.fieldEvidence.map((item) => ({ ...item, fieldPath: item.fieldPath.replace(`customSections.${section.id}.items.${section.items[0]!.id}`, "customSections.X.items.X-0").replace(`customSections.${section.id}`, "customSections.X").replace(`keyResults.${current.draft.keyResults[0]!.id}`, "keyResults.KPI").replace(/^toolsAndTechnologies$/, "toolsAndTechnologies.0").replace(/^professionalContexts$/, "professionalContexts.0") })) };
  delete old.evidenceAdapterVersion;
  const snapshot = JSON.stringify(old);
  const adapted = preparedParserIa({ sha256: binding.sourceSha256, parserIa: old }, binding.organizationId)!;
  assert.equal(JSON.stringify(old), snapshot);
  assert.equal(adapted.fieldEvidence.length, old.fieldEvidence.length);
  assert.deepEqual(adapted.acceptedFacts, old.acceptedFacts);
  assert.equal(importEvidenceIssue(attachFieldEvidence(pages, adapted.fieldEvidence), adapted.draft), null);
  assert.ok(parserIaMethodVersion(adapted).endsWith(`/${PARSER_EVIDENCE_ADAPTER_VERSION}`));
  assert.throws(() => preparedParserIa({ sha256: "c".repeat(64), parserIa: old }, binding.organizationId), /BINDING_INVALID/);
  assert.throws(() => preparedParserIa({ sha256: binding.sourceSha256, parserIa: old }, "other"), /BINDING_INVALID/);
});

test("v2.0.2 rejects missing targets, invalid geometry, origin and payload limits before persistence", () => {
  const result = build(); const base = attachFieldEvidence(pages, result.fieldEvidence);
  const changed = (change: Record<string, unknown>) => [{ ...base[0]!, fieldEvidence: [{ ...base[0]!.fieldEvidence![0]!, ...change }] }] as ExtractedPage[];
  const cases = [
    [{ fieldPath: "contact.secret@example.invalid" }, "field_path_invalid"],
    [{ fieldPath: "experiences.experience_12345678.role" }, "field_target_missing"],
    [{ fieldPath: "customSections.section_12345678.name" }, "field_target_missing"],
    [{ pageNumber: 2 }, "evidence_page_invalid"],
    [{ text: " " }, "evidence_text_invalid"],
    [{ x: 0.9, width: 0.2 }, "geometry_invalid"],
    [{ width: 0 }, "geometry_invalid"],
    [{ x: null }, "geometry_invalid"],
    [{ x: Number.NaN }, "geometry_invalid"],
    [{ method: "tesseract-layout-v1" }, "method_origin_invalid"],
  ] as const;
  for (const [change, reason] of cases) assert.equal(importEvidenceIssue(changed(change), result.draft)?.reason, reason);
  assert.equal(importEvidenceIssue([{ ...base[0]!, fieldEvidence: Array(1001).fill(base[0]!.fieldEvidence![0]) }], result.draft)?.reason, "payload_limit");
  assert.equal(importEvidenceIssue([{ ...base[0]!, fieldEvidence: {} as never }], result.draft)?.reason, "arrays_invalid");
  assert.equal(importEvidenceIssue([], result.draft)?.reason, "pages_invalid");
  assert.equal(importEvidenceIssue([base[0]!, base[0]!], result.draft)?.reason, "page_invalid");
});

test("v2.0.2 structured failure metadata is sanitized and separates permanent failure from retry", () => {
  const result = build(); const source = attachFieldEvidence(pages, result.fieldEvidence);
  source[0]!.fieldEvidence![1]!.width = 2;
  const issue = importEvidenceIssue(source, result.draft)!;
  assert.equal(issue.fieldPath, "customSections.*.name");
  const error = importEvidenceOperationError(issue);
  assert.equal(error.recovery, "await-system-update");
  const diagnostic = importFailureDiagnostic(error, "persisting", parserIaMethodVersion(result));
  assert.equal(diagnostic.reason, "geometry_invalid");
  assert.doesNotMatch(JSON.stringify(diagnostic), /Synthetic Person|Declared item|Projects|sourceSha256|responseId/);
  const remote = supabaseOperationError({ code: "22023", message: "prisma_import_evidence_invalid", details: JSON.stringify({ ...diagnostic, fieldPath: "private-person@example.invalid" }) }, "fallback");
  assert.equal(remote.importIssue!.fieldPath, null);
  assert.doesNotMatch(remote.message, /private-person|geometry_invalid|22023/);
  assert.equal(importFailureDiagnostic(supabaseOperationError({ code: "PGRST000", message: "timeout" }, "fallback"), "persisting", parserIaMethodVersion(result)).reason, "unavailable");
});

test("v2.0.2 progress never marks review reached while persistence is pending or failed", () => {
  for (const stage of ["structuring", "persisting"] as const) {
    assert.equal(importProcessingPresentation({ stage, message: "working" }, null, "none").currentStep, 2);
    const failed = importProcessingPresentation({ stage, message: "working" }, "failure", "await-system-update");
    assert.equal(failed.currentStep, 2); assert.equal(failed.status, "error");
    assert.doesNotMatch(failed.detail, /instantes/);
    assert.match(failed.detail, /correção do sistema/);
  }
  assert.equal(importProcessingPresentation({ stage: "ready_for_review", message: "ready" }, null, "none").currentStep, 3);
});

test("v2.0.2 recovery permits legacy failed intake but blocks repeating current contract failure", () => {
  const document = { sourceType: "resume_pdf", extractionVersion: "pdfjs-5.4.296/parser-ia-spans-v1", isLegacyUnstored: false, status: "failed", reviewState: "not_ready", reviewAttempt: null, latestAttempt: { state: "failed_structuring", failureCode: "resume_intake_processing_failed", usefulCharacterCount: 0 } } as PersonDocumentTimelineItem;
  assert.equal(canResumeFailedAiIntake(document), true);
  const permanent = { ...document, latestAttempt: { ...document.latestAttempt!, failureCode: "import_evidence_contract_invalid", structuringVersion: parserIaMethodVersion(build()) } };
  assert.equal(canResumeFailedAiIntake(permanent), false);
  assert.equal(importRecoveryNeedsSystemUpdate(permanent), true);
  const newerAdapter = { ...permanent, latestAttempt: { ...permanent.latestAttempt, structuringVersion: permanent.latestAttempt.structuringVersion.replace(PARSER_EVIDENCE_ADAPTER_VERSION, "evidence-adapter-0.9.0") } };
  assert.equal(canResumeFailedAiIntake(newerAdapter), true);
});
