import { randomUUID } from "node:crypto";
import type { VerificationLevel } from "./competencyVerification.js";

export const M51B_VERSIONS = {
  invitation: "m51b-assessment-invitation-1.0.0",
  attempt: "m51b-assessment-attempt-1.0.0",
  questionInstance: "m51b-question-instance-1.0.0",
  response: "m51b-assessment-response-1.0.0",
  event: "m51b-assessment-event-1.0.0",
  metrics: "m51b-question-metrics-1.0.0",
  scoring: "m51b-deterministic-scoring-1.0.0",
  integrity: "m51b-integrity-ruleset-1.0.0",
  confidence: "m51b-evidence-confidence-1.0.0",
  evaluation: "m51b-assessment-evaluation-1.0.0",
  demonstratedEvidence: "m51b-demonstrated-evidence-1.0.0",
  matching: "m51b-explainable-matching-1.0.0",
} as const;

export type ParticipantResultVisibility = "completion_only" | "summary" | "detailed";
export type DemonstratedLevel = VerificationLevel | "insufficient_evidence" | "inconclusive";
export type IntegrityState = "adequate" | "reduced" | "inconclusive";
export type EvidenceConfidenceState = "high" | "adequate" | "reduced" | "inconclusive";
export type MethodologicalQuality = "supported" | "limited" | "insufficient";
export type CoverageState = "sufficient" | "insufficient";
export type QuestionResult = "correct" | "incorrect" | "unanswered";

export type IntegrityFlag =
  | "UNUSUALLY_FAST_RESPONSE"
  | "UNUSUALLY_SLOW_RESPONSE"
  | "EXTENDED_PAGE_ABSENCE"
  | "FREQUENT_CONTEXT_SWITCHING"
  | "DIFFICULTY_CORRELATED_ABSENCE_PATTERN"
  | "POST_ABSENCE_CORRECT_RESPONSE_PATTERN"
  | "SESSION_INTERRUPTION"
  | "SESSION_CHANGE"
  | "ASSESSMENT_TIMEOUT"
  | "INSUFFICIENT_COMPLETION"
  | "TECHNICAL_INCIDENT";

export interface AssessmentQuestionSnapshot {
  questionInstanceId: string;
  itemId: string;
  itemVersion: string;
  dimension: string;
  difficulty: "low" | "medium" | "high";
  expectedTimeMinSeconds: number;
  expectedTimeTypicalSeconds: number;
  expectedTimeMaxSeconds: number;
  selectedOptionId: string | null;
  correctOptionId: string;
}

export interface AssessmentTelemetryEvent {
  type: string;
  questionInstanceId: string | null;
  occurredAt: string;
  durationSeconds?: number;
  sessionId: string;
}

export interface QuestionMetric {
  questionInstanceId: string;
  itemId: string;
  dimension: string;
  difficulty: "low" | "medium" | "high";
  totalElapsedSeconds: number;
  activeSeconds: number;
  hiddenSeconds: number;
  blurredSeconds: number;
  absenceCount: number;
  blurCount: number;
  revisitCount: number;
  answerChangeCount: number;
  expectedTimeMinSeconds: number;
  expectedTimeTypicalSeconds: number;
  expectedTimeMaxSeconds: number;
  actualTimeRatio: number;
  result: QuestionResult;
  technicalIncidentPresent: boolean;
  flags: IntegrityFlag[];
}

export interface RawAssessmentResult {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
  byDimension: Record<string, { total: number; correct: number; percentage: number }>;
}

export interface IntegrityAnalysis {
  state: IntegrityState;
  flags: IntegrityFlag[];
  reasonCodes: string[];
  facts: {
    contextSwitchCount: number;
    hiddenSeconds: number;
    affectedQuestionCount: number;
    sessionCount: number;
    technicalIncidentCount: number;
  };
  rulesetVersion: string;
}

export interface AssessmentEvaluation {
  rawResult: RawAssessmentResult;
  demonstratedLevel: DemonstratedLevel;
  coverageState: CoverageState;
  methodologicalQuality: MethodologicalQuality;
  integrity: IntegrityAnalysis;
  confidenceState: EvidenceConfidenceState;
  reasonCodes: string[];
  versions: typeof M51B_VERSIONS;
}

export interface DemonstratedEvidenceRecord {
  id: string;
  organizationId: string;
  personId: string;
  verificationNeedId: string;
  preparedAssessmentId: string;
  attemptId: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  demonstratedLevel: DemonstratedLevel;
  rawResult: RawAssessmentResult;
  dimensionResults: RawAssessmentResult["byDimension"];
  coverageState: CoverageState;
  methodologicalQuality: MethodologicalQuality;
  integrityState: IntegrityState;
  confidenceState: EvidenceConfidenceState;
  reasonCodes: string[];
  provenance: { method: "multiple_choice"; syntheticQaOnly: true; versions: typeof M51B_VERSIONS };
  createdAt: string;
}

export function scoreMultipleChoice(questions: AssessmentQuestionSnapshot[]): RawAssessmentResult {
  const dimensions: RawAssessmentResult["byDimension"] = {};
  let correct = 0;
  let unanswered = 0;
  for (const question of questions) {
    const dimension = dimensions[question.dimension] ?? { total: 0, correct: 0, percentage: 0 };
    dimension.total += 1;
    if (!question.selectedOptionId) unanswered += 1;
    else if (question.selectedOptionId === question.correctOptionId) {
      correct += 1;
      dimension.correct += 1;
    }
    dimensions[question.dimension] = dimension;
  }
  for (const dimension of Object.values(dimensions)) {
    dimension.percentage = dimension.total === 0 ? 0 : round((dimension.correct / dimension.total) * 100);
  }
  const totalQuestions = questions.length;
  return {
    totalQuestions,
    correct,
    incorrect: totalQuestions - correct - unanswered,
    unanswered,
    percentage: totalQuestions === 0 ? 0 : round((correct / totalQuestions) * 100),
    byDimension: dimensions,
  };
}

export function deriveQuestionMetrics(
  questions: AssessmentQuestionSnapshot[],
  events: AssessmentTelemetryEvent[],
): QuestionMetric[] {
  return questions.map((question) => {
    const relevant = events.filter((event) => event.questionInstanceId === question.questionInstanceId);
    const opened = relevant.filter((event) => event.type === "question_opened");
    const totalElapsedSeconds = sum(relevant, "question_elapsed");
    const hiddenSeconds = sum(relevant, "page_visible");
    const blurredSeconds = sum(relevant, "window_focused");
    const technicalIncidentPresent = relevant.some((event) => ["connection_lost", "technical_error"].includes(event.type));
    const flags: IntegrityFlag[] = [];
    if (!technicalIncidentPresent && totalElapsedSeconds > 0 && totalElapsedSeconds < question.expectedTimeMinSeconds * 0.35) flags.push("UNUSUALLY_FAST_RESPONSE");
    if (!technicalIncidentPresent && totalElapsedSeconds > question.expectedTimeMaxSeconds * 1.75) flags.push("UNUSUALLY_SLOW_RESPONSE");
    if (hiddenSeconds > Math.max(60, question.expectedTimeTypicalSeconds * 0.75)) flags.push("EXTENDED_PAGE_ABSENCE");
    if (technicalIncidentPresent) flags.push("TECHNICAL_INCIDENT");
    return {
      questionInstanceId: question.questionInstanceId,
      itemId: question.itemId,
      dimension: question.dimension,
      difficulty: question.difficulty,
      totalElapsedSeconds,
      activeSeconds: Math.max(0, totalElapsedSeconds - hiddenSeconds - blurredSeconds),
      hiddenSeconds,
      blurredSeconds,
      absenceCount: relevant.filter((event) => event.type === "page_hidden").length,
      blurCount: relevant.filter((event) => event.type === "window_blurred").length,
      revisitCount: Math.max(0, opened.length - 1),
      answerChangeCount: relevant.filter((event) => event.type === "answer_changed").length,
      expectedTimeMinSeconds: question.expectedTimeMinSeconds,
      expectedTimeTypicalSeconds: question.expectedTimeTypicalSeconds,
      expectedTimeMaxSeconds: question.expectedTimeMaxSeconds,
      actualTimeRatio: question.expectedTimeTypicalSeconds === 0 ? 0 : round(totalElapsedSeconds / question.expectedTimeTypicalSeconds, 2),
      result: !question.selectedOptionId ? "unanswered" : question.selectedOptionId === question.correctOptionId ? "correct" : "incorrect",
      technicalIncidentPresent,
      flags,
    };
  });
}

export function analyzeAssessmentIntegrity(
  metrics: QuestionMetric[],
  events: AssessmentTelemetryEvent[],
  completionRatio: number,
): IntegrityAnalysis {
  const flags = new Set<IntegrityFlag>(metrics.flatMap((metric) => metric.flags));
  const contextSwitchCount = metrics.reduce((total, metric) => total + metric.absenceCount + metric.blurCount, 0);
  const hiddenSeconds = metrics.reduce((total, metric) => total + metric.hiddenSeconds, 0);
  const affectedQuestionCount = metrics.filter((metric) => metric.absenceCount > 0 || metric.blurCount > 0).length;
  const sessions = new Set(events.map((event) => event.sessionId));
  const technicalIncidentCount = events.filter((event) => ["connection_lost", "technical_error"].includes(event.type)).length;
  if (contextSwitchCount >= Math.max(6, metrics.length)) flags.add("FREQUENT_CONTEXT_SWITCHING");
  if (sessions.size > 1) flags.add("SESSION_CHANGE");
  if (events.some((event) => event.type === "assessment_timeout")) flags.add("ASSESSMENT_TIMEOUT");
  if (completionRatio < 0.7) flags.add("INSUFFICIENT_COMPLETION");
  if (technicalIncidentCount > 0) flags.add("TECHNICAL_INCIDENT");

  const highDifficulty = metrics.filter((metric) => metric.difficulty === "high");
  const highWithExtendedAbsence = highDifficulty.filter((metric) => metric.flags.includes("EXTENDED_PAGE_ABSENCE"));
  if (highDifficulty.length >= 3 && highWithExtendedAbsence.length / highDifficulty.length >= 0.6) {
    flags.add("DIFFICULTY_CORRELATED_ABSENCE_PATTERN");
  }
  if (highWithExtendedAbsence.filter((metric) => metric.result === "correct").length >= 3) {
    flags.add("POST_ABSENCE_CORRECT_RESPONSE_PATTERN");
  }

  const materialBehavioralFlags = [...flags].filter((flag) => [
    "FREQUENT_CONTEXT_SWITCHING",
    "DIFFICULTY_CORRELATED_ABSENCE_PATTERN",
    "POST_ABSENCE_CORRECT_RESPONSE_PATTERN",
  ].includes(flag));
  const state: IntegrityState = completionRatio < 0.7 || technicalIncidentCount >= 3
    ? "inconclusive"
    : materialBehavioralFlags.length > 0 || hiddenSeconds > 300
      ? "reduced"
      : "adequate";
  const reasonCodes = [
    state === "adequate" ? "EXECUTION_CONDITIONS_ADEQUATE" : state === "reduced" ? "OBSERVED_PATTERNS_REDUCE_STRENGTH" : "EXECUTION_CONDITIONS_INCONCLUSIVE",
    ...(technicalIncidentCount > 0 ? ["TECHNICAL_INCIDENTS_RECORDED_SEPARATELY"] : []),
    "BROWSER_TELEMETRY_IS_NOT_PROOF_OF_CONDUCT",
  ];
  return {
    state,
    flags: [...flags],
    reasonCodes,
    facts: { contextSwitchCount, hiddenSeconds, affectedQuestionCount, sessionCount: sessions.size, technicalIncidentCount },
    rulesetVersion: M51B_VERSIONS.integrity,
  };
}

export function evaluateAttempt(input: {
  questions: AssessmentQuestionSnapshot[];
  events: AssessmentTelemetryEvent[];
  requiredDimensions: string[];
  itemsAreCalibrated: boolean;
}): AssessmentEvaluation {
  const rawResult = scoreMultipleChoice(input.questions);
  const metrics = deriveQuestionMetrics(input.questions, input.events);
  const completionRatio = rawResult.totalQuestions === 0 ? 0 : (rawResult.totalQuestions - rawResult.unanswered) / rawResult.totalQuestions;
  const coveredDimensions = new Set(input.questions.filter((question) => question.selectedOptionId).map((question) => question.dimension));
  const coverageState: CoverageState = completionRatio >= 0.7 && input.requiredDimensions.every((dimension) => coveredDimensions.has(dimension))
    ? "sufficient"
    : "insufficient";
  const integrity = analyzeAssessmentIntegrity(metrics, input.events, completionRatio);
  const methodologicalQuality: MethodologicalQuality = coverageState === "insufficient"
    ? "insufficient"
    : input.itemsAreCalibrated ? "supported" : "limited";
  const demonstratedLevel: DemonstratedLevel = coverageState === "insufficient" || integrity.state === "inconclusive"
    ? "inconclusive"
    : rawResult.percentage >= 80 ? "advanced" : rawResult.percentage >= 60 ? "intermediate" : rawResult.percentage >= 40 ? "basic" : "insufficient_evidence";
  const confidenceState: EvidenceConfidenceState = demonstratedLevel === "inconclusive" || methodologicalQuality === "insufficient"
    ? "inconclusive"
    : integrity.state === "reduced" ? "reduced" : methodologicalQuality === "supported" ? "high" : "adequate";
  const reasonCodes = [
    coverageState === "sufficient" ? "BLUEPRINT_COVERAGE_MET" : "BLUEPRINT_COVERAGE_INSUFFICIENT",
    input.itemsAreCalibrated ? "CALIBRATED_ITEMS_USED" : "UNCALIBRATED_QA_ITEMS_USED",
    ...integrity.reasonCodes,
  ];
  return { rawResult, demonstratedLevel, coverageState, methodologicalQuality, integrity, confidenceState, reasonCodes, versions: M51B_VERSIONS };
}

export function createDemonstratedEvidence(input: {
  organizationId: string;
  personId: string;
  verificationNeedId: string;
  preparedAssessmentId: string;
  attemptId: string;
  competencyKey: string;
  targetLevel: VerificationLevel;
  evaluation: AssessmentEvaluation;
}): DemonstratedEvidenceRecord {
  return {
    id: randomUUID(),
    organizationId: input.organizationId,
    personId: input.personId,
    verificationNeedId: input.verificationNeedId,
    preparedAssessmentId: input.preparedAssessmentId,
    attemptId: input.attemptId,
    competencyKey: input.competencyKey,
    targetLevel: input.targetLevel,
    demonstratedLevel: input.evaluation.demonstratedLevel,
    rawResult: input.evaluation.rawResult,
    dimensionResults: input.evaluation.rawResult.byDimension,
    coverageState: input.evaluation.coverageState,
    methodologicalQuality: input.evaluation.methodologicalQuality,
    integrityState: input.evaluation.integrity.state,
    confidenceState: input.evaluation.confidenceState,
    reasonCodes: input.evaluation.reasonCodes,
    provenance: { method: "multiple_choice", syntheticQaOnly: true, versions: M51B_VERSIONS },
    createdAt: new Date().toISOString(),
  };
}

function sum(events: AssessmentTelemetryEvent[], closingEventType: string): number {
  return events
    .filter((event) => event.type === closingEventType)
    .reduce((total, event) => total + Math.max(0, event.durationSeconds ?? 0), 0);
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
