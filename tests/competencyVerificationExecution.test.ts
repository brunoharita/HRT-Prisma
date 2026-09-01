import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createDemonstratedEvidence,
  deriveQuestionMetrics,
  evaluateAttempt,
  M51B_VERSIONS,
  scoreMultipleChoice,
  type AssessmentQuestionSnapshot,
  type AssessmentTelemetryEvent,
} from "../src/domain/competencyVerificationExecution.js";

const questions: AssessmentQuestionSnapshot[] = Array.from({ length: 6 }, (_, index) => ({
  questionInstanceId: `question-${index + 1}`,
  itemId: `item-${index + 1}`,
  itemVersion: "m51a-assessment-item-1.0.0",
  dimension: index < 2 ? "query_modeling" : index < 4 ? "performance" : "troubleshooting",
  difficulty: index % 2 === 0 ? "high" : "medium",
  expectedTimeMinSeconds: 60,
  expectedTimeTypicalSeconds: 120,
  expectedTimeMaxSeconds: 240,
  selectedOptionId: index < 5 ? "B" : null,
  correctOptionId: index < 4 ? "B" : "C",
}));

function event(type: string, questionInstanceId: string | null, durationSeconds?: number, sessionId = "session-1"): AssessmentTelemetryEvent {
  return {
    type,
    questionInstanceId,
    sessionId,
    occurredAt: "2026-09-01T12:00:00.000Z",
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
  };
}

test("M5.1B preserves raw multiple-choice scoring independently from integrity", () => {
  const result = scoreMultipleChoice(questions);
  assert.deepEqual({ correct: result.correct, incorrect: result.incorrect, unanswered: result.unanswered }, { correct: 4, incorrect: 1, unanswered: 1 });
  assert.equal(result.percentage, 66.7);
  assert.equal(result.byDimension.query_modeling?.percentage, 100);
});

test("M5.1B associates visibility and focus telemetry with the active question", () => {
  const metrics = deriveQuestionMetrics(questions.slice(0, 1), [
    event("question_opened", "question-1"),
    event("question_elapsed", "question-1", 180),
    event("page_hidden", "question-1"),
    event("page_visible", "question-1", 100),
    event("window_blurred", "question-1"),
    event("window_focused", "question-1", 10),
  ]);
  assert.equal(metrics[0]?.hiddenSeconds, 100);
  assert.equal(metrics[0]?.blurredSeconds, 10);
  assert.equal(metrics[0]?.absenceCount, 1);
  assert.ok(metrics[0]?.flags.includes("EXTENDED_PAGE_ABSENCE"));
});

test("M5.1B normal execution produces limited QA methodology without inventing calibration", () => {
  const events = questions.flatMap((question) => [
    event("question_opened", question.questionInstanceId),
    event("question_elapsed", question.questionInstanceId, 120),
  ]);
  const evaluation = evaluateAttempt({
    questions: questions.map((question) => ({ ...question, selectedOptionId: "B", correctOptionId: "B" })),
    events,
    requiredDimensions: ["query_modeling", "performance", "troubleshooting"],
    itemsAreCalibrated: false,
  });
  assert.equal(evaluation.demonstratedLevel, "advanced");
  assert.equal(evaluation.integrity.state, "adequate");
  assert.equal(evaluation.methodologicalQuality, "limited");
  assert.equal(evaluation.confidenceState, "adequate");
  assert.ok(evaluation.reasonCodes.includes("UNCALIBRATED_QA_ITEMS_USED"));
});

test("M5.1B technical incidents remain separate and never rewrite the raw result", () => {
  const fullyCorrect = questions.map((question) => ({ ...question, selectedOptionId: "B", correctOptionId: "B" }));
  const events = fullyCorrect.flatMap((question) => [
    event("question_elapsed", question.questionInstanceId, 120),
    event("connection_lost", question.questionInstanceId),
  ]);
  const evaluation = evaluateAttempt({ questions: fullyCorrect, events, requiredDimensions: ["query_modeling", "performance", "troubleshooting"], itemsAreCalibrated: false });
  assert.equal(evaluation.rawResult.percentage, 100);
  assert.equal(evaluation.integrity.state, "inconclusive");
  assert.equal(evaluation.demonstratedLevel, "inconclusive");
  assert.ok(evaluation.integrity.flags.includes("TECHNICAL_INCIDENT"));
});

test("M5.1B creates independent demonstrated evidence with complete provenance", () => {
  const evaluation = evaluateAttempt({
    questions,
    events: questions.map((question) => event("question_elapsed", question.questionInstanceId, 120)),
    requiredDimensions: ["query_modeling", "performance", "troubleshooting"],
    itemsAreCalibrated: false,
  });
  const evidence = createDemonstratedEvidence({
    organizationId: "org-1",
    personId: "person-1",
    verificationNeedId: "need-1",
    preparedAssessmentId: "prepared-1",
    attemptId: "attempt-1",
    competencyKey: "sql",
    targetLevel: "advanced",
    evaluation,
  });
  assert.equal(evidence.personId, "person-1");
  assert.equal(evidence.provenance.syntheticQaOnly, true);
  assert.equal(evidence.provenance.versions.demonstratedEvidence, M51B_VERSIONS.demonstratedEvidence);
  assert.equal("professionalProfile" in evidence, false);
});

test("M5.1B migration keeps anon off tables and routes public access through service-role RPCs", async () => {
  const migration = await readFile("supabase/migrations/20260901115938_m51b_verification_execution.sql", "utf8");
  const tables = [
    "assessment_invitations", "assessment_attempts", "assessment_question_instances", "assessment_responses",
    "assessment_events", "assessment_question_metrics", "assessment_integrity_analyses", "assessment_evaluations",
    "competency_demonstrated_evidence", "assessment_access_requests",
  ];
  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon(?:, authenticated)?`, "i"));
  }
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete)[^;]+to\s+anon/i);
  assert.match(migration, /grant execute on function public\.m51b_public_access\(text, text, jsonb\) to service_role/i);
  assert.doesNotMatch(migration, /auth\.role\s*\(/i);
  assert.match(migration, /set search_path = ''/i);
});

test("M5.1B coverage compatibility fix is narrow, fail-closed, and preserves the service-only grant", async () => {
  const migration = await readFile("supabase/migrations/20260901124012_m51b_submission_dimension_coverage_fix.sql", "utf8");
  assert.match(migration, /M51B_PUBLIC_ACCESS_FUNCTION_NOT_FOUND/);
  assert.match(migration, /M51B_DIMENSION_COVERAGE_SOURCE_NOT_FOUND/);
  assert.match(migration, /select count\(\*\)::integer from jsonb_object_keys\(v_dimension_results\)/);
  assert.match(migration, /revoke all on function public\.m51b_public_access\(text, text, jsonb\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.m51b_public_access\(text, text, jsonb\) to service_role/i);
});

test("M5.1B entry workspace aggregates item-bank counts before building its JSON array", async () => {
  const migration = await readFile("supabase/migrations/20260901124345_m51a_workspace_item_bank_summary_fix.sql", "utf8");
  assert.match(migration, /count\(\*\)::integer as available_items/i);
  assert.match(migration, /from \([\s\S]+\) item_summary/i);
  assert.match(migration, /'availableItems', item_summary\.available_items/i);
  assert.doesNotMatch(migration, /'availableItems', count\(\*\)/i);
  assert.match(migration, /grant execute on function public\.load_m51a_verification_workspace\(uuid\) to authenticated/i);
});
