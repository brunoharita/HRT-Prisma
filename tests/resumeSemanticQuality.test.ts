import assert from "node:assert/strict";
import test from "node:test";
import { assessResumeSemanticQuality, RESUME_SEMANTIC_QUALITY_VERSION } from "../web/src/domain/resumeSemanticQuality.js";

const base = {
  pageCount: 1,
  experienceCount: 0,
  hasProfessionalTitle: false,
  hasSummary: false,
  competencyCount: 0,
  areaCount: 0,
  keyResultCount: 0,
};

test("semantic gate keeps a short entry-level resume eligible for the native route", () => {
  assert.deepEqual(assessResumeSemanticQuality(base), {
    version: RESUME_SEMANTIC_QUALITY_VERSION,
    sufficient: true,
    reasons: [],
  });
});

test("semantic gate rejects a multipage extraction with no professional history", () => {
  const result = assessResumeSemanticQuality({ ...base, pageCount: 5 });
  assert.equal(result.sufficient, false);
  assert.deepEqual(result.reasons, ["multipage_resume_without_professional_history"]);
});

test("semantic gate rejects professional content whose history was not structured", () => {
  const result = assessResumeSemanticQuality({ ...base, pageCount: 2, hasSummary: true, competencyCount: 4 });
  assert.equal(result.sufficient, false);
  assert.deepEqual(result.reasons, ["professional_content_without_professional_history"]);
});

test("semantic gate never penalizes a resume merely because it has one page or few fields", () => {
  assert.equal(assessResumeSemanticQuality({ ...base, hasProfessionalTitle: true }).sufficient, true);
  assert.equal(assessResumeSemanticQuality({ ...base, pageCount: 8, experienceCount: 1 }).sufficient, true);
});
