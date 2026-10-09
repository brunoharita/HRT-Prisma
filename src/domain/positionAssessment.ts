/** Pure contracts for the authorized contextual assessment. No IO, AI or implicit writes. */
export const POSITION_ASSESSMENT_VERSION = "position-assessment-1.0.0";
export const DISTRIBUTION_VERSION = "position-assessment-distribution-1.0.0";
export const FOCUS_METHOD_VERSION = "position-assessment-focus-1.0.0";

export type AssessmentDifficulty = "easy" | "medium" | "hard";
export type AssessmentLevel = 1 | 2 | 3 | 4 | 5;
export type AssessmentCompositionMode = "bank" | "ai" | "mixed";
export type DifficultyCounts = Record<AssessmentDifficulty, number>;
export const difficultyOrder = ["easy", "medium", "hard"] as const;

/** Parameter registry: changing this policy requires a new version, never historical mutation. */
export const assessmentDistributions: Readonly<Record<AssessmentLevel, Readonly<DifficultyCounts>>> = Object.freeze({
  1: Object.freeze({ easy: 60, medium: 30, hard: 10 }),
  2: Object.freeze({ easy: 40, medium: 40, hard: 20 }),
  3: Object.freeze({ easy: 30, medium: 40, hard: 30 }),
  4: Object.freeze({ easy: 20, medium: 40, hard: 40 }),
  5: Object.freeze({ easy: 10, medium: 30, hard: 60 }),
});

export interface DistributionSnapshot {
  version: typeof DISTRIBUTION_VERSION;
  quantity: number;
  level: AssessmentLevel;
  percentages: DifficultyCounts;
  counts: DifficultyCounts;
}

export function createDistributionSnapshot(quantity: number, level: number): DistributionSnapshot {
  if (!Number.isSafeInteger(quantity) || quantity < 10 || quantity % 10 !== 0) {
    throw new Error("ASSESSMENT_QUANTITY_REQUIRES_MULTIPLE_OF_TEN");
  }
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error("ASSESSMENT_UNKNOWN_LEVEL");
  const selectedLevel = level as AssessmentLevel;
  const percentages = { ...assessmentDistributions[selectedLevel] };
  const counts = { easy: quantity * percentages.easy / 100, medium: quantity * percentages.medium / 100, hard: quantity * percentages.hard / 100 };
  if (!difficultyOrder.every(key => Number.isSafeInteger(counts[key]))) throw new Error("ASSESSMENT_INVALID_DISTRIBUTION");
  return { version: DISTRIBUTION_VERSION, quantity, level: selectedLevel, percentages, counts };
}

export interface ContextualAssessmentQuestion {
  organizationId: string;
  id: string;
  version: string;
  requirementId: string;
  competencyKey: string;
  difficulty: AssessmentDifficulty;
  language: string;
  stem: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
  source: "bank" | "ai";
  review: "pending" | "approved";
  provenance: { method: string; version: string; authorId: string | null };
}

export function questionViolations(question: ContextualAssessmentQuestion): string[] {
  const issues: string[] = [];
  if (![question.organizationId, question.id, question.version, question.requirementId, question.competencyKey, question.language, question.stem, question.explanation,
    question.provenance.method, question.provenance.version].every(value => typeof value === "string" && value.trim().length > 0)) issues.push("REQUIRED_QUESTION_METADATA");
  if (!difficultyOrder.includes(question.difficulty)) issues.push("UNKNOWN_QUESTION_DIFFICULTY");
  if (!["bank", "ai"].includes(question.source)) issues.push("UNKNOWN_QUESTION_SOURCE");
  if (!["pending", "approved"].includes(question.review)) issues.push("UNKNOWN_REVIEW_STATE");
  if (question.options.length !== 5) issues.push("EXACTLY_FIVE_OPTIONS_REQUIRED");
  const ids = question.options.map(option => option.id.trim());
  const labels = question.options.map(option => option.label.trim());
  if (ids.some(id => !id) || new Set(ids).size !== ids.length || labels.some(label => !label)
    || new Set(labels.map(label => label.normalize("NFKC").toLocaleLowerCase("pt-BR"))).size !== labels.length) issues.push("INVALID_OR_DUPLICATE_OPTIONS");
  if (ids.filter(id => id === question.correctOptionId).length !== 1) issues.push("EXACTLY_ONE_CORRECT_OPTION_REQUIRED");
  return issues;
}

export interface AssessmentComposition {
  selected: DifficultyCounts;
  deficit: DifficultyCounts;
  totalDeficit: number;
  uncoveredRequirementIds: string[];
  violations: string[];
  readyForInvitation: boolean;
}

/** Reports gaps only. It never fills them or infers that a question covers another requirement. */
export function inspectComposition(snapshot: DistributionSnapshot, requirementIds: readonly string[], questions: readonly ContextualAssessmentQuestion[], mode: AssessmentCompositionMode, organizationId: string): AssessmentComposition {
  const violations: string[] = [];
  if (!organizationId.trim()) violations.push("ORGANIZATION_REQUIRED");
  if (snapshot.version !== DISTRIBUTION_VERSION) violations.push("UNKNOWN_DISTRIBUTION_VERSION");
  const expected = createDistributionSnapshot(snapshot.quantity, snapshot.level);
  if (difficultyOrder.some(key => expected.counts[key] !== snapshot.counts[key] || expected.percentages[key] !== snapshot.percentages[key])) violations.push("DISTRIBUTION_SNAPSHOT_MISMATCH");
  if (!requirementIds.length || requirementIds.some(id => !id.trim()) || new Set(requirementIds).size !== requirementIds.length) violations.push("INVALID_REQUIREMENT_SELECTION");
  if (new Set(questions.map(question => question.id)).size !== questions.length) violations.push("DUPLICATE_QUESTION");
  if (!["bank", "ai", "mixed"].includes(mode)) violations.push("UNKNOWN_COMPOSITION_MODE");
  const selected = { easy: 0, medium: 0, hard: 0 };
  for (const question of questions) {
    if (question.organizationId !== organizationId) violations.push(`${question.id}:ORGANIZATION_MISMATCH`);
    violations.push(...questionViolations(question).map(issue => `${question.id}:${issue}`));
    if (!requirementIds.includes(question.requirementId)) violations.push(`${question.id}:REQUIREMENT_OUTSIDE_SELECTION`);
    if (mode === "bank" && question.source !== "bank" || mode === "ai" && question.source !== "ai") violations.push(`${question.id}:SOURCE_OUTSIDE_MODE`);
    if (difficultyOrder.includes(question.difficulty)) selected[question.difficulty]++;
  }
  const deficit = { easy: 0, medium: 0, hard: 0 };
  for (const key of difficultyOrder) {
    deficit[key] = Math.max(0, expected.counts[key] - selected[key]);
    if (selected[key] > expected.counts[key]) violations.push(`EXCESS_${key.toUpperCase()}_QUESTIONS`);
  }
  const totalDeficit = difficultyOrder.reduce((total, key) => total + deficit[key], 0);
  const uncoveredRequirementIds = requirementIds.filter(id => !questions.some(question => question.requirementId === id));
  return { selected, deficit, totalDeficit, uncoveredRequirementIds, violations,
    readyForInvitation: totalDeficit === 0 && !uncoveredRequirementIds.length && !violations.length && questions.every(question => question.review === "approved") };
}

export interface QuestionObservationScope {
  organizationId: string;
  attemptId: string;
  questionInstanceId: string;
  questionVersion: string;
}
export interface FocusObservation extends QuestionObservationScope {
  method: typeof FOCUS_METHOD_VERSION;
  kind: "focus_episode";
  startedAtClientMs: number;
  endedAtClientMs: number;
  durationMs: number;
  closedBy: "focus_returned" | "question_changed" | "collector_stopped";
  limitation: "destination_not_observable";
}

/** One inactive episode per question, even when blur and visibility fire for the same exit. */
export class QuestionFocusTracker {
  private scope: QuestionObservationScope | null = null;
  private hidden = false;
  private focused = true;
  private inactiveSince: number | null = null;
  private lastTimestamp = -Infinity;

  activate(scope: QuestionObservationScope | null, atMs: number): FocusObservation[] {
    this.assertTime(atMs);
    if (scope && !Object.values(scope).every(value => typeof value === "string" && value.trim())) throw new Error("OBSERVATION_SCOPE_REQUIRED");
    const same = scope && this.scope && Object.keys(scope).every(key => scope[key as keyof QuestionObservationScope] === this.scope![key as keyof QuestionObservationScope]);
    if (same) return [];
    const closed = this.close(atMs, scope ? "question_changed" : "collector_stopped");
    this.scope = scope ? { ...scope } : null;
    if (scope && (this.hidden || !this.focused)) this.inactiveSince = atMs;
    return closed;
  }

  observe(state: { hidden: boolean; focused: boolean }, atMs: number): FocusObservation[] {
    this.assertTime(atMs);
    this.hidden = state.hidden;
    this.focused = state.focused;
    if (!this.scope) return [];
    if (this.hidden || !this.focused) {
      this.inactiveSince ??= atMs;
      return [];
    }
    return this.close(atMs, "focus_returned");
  }

  private close(atMs: number, closedBy: FocusObservation["closedBy"]): FocusObservation[] {
    if (!this.scope || this.inactiveSince === null) return [];
    const result: FocusObservation = { ...this.scope, method: FOCUS_METHOD_VERSION, kind: "focus_episode", startedAtClientMs: this.inactiveSince,
      endedAtClientMs: atMs, durationMs: atMs - this.inactiveSince, closedBy, limitation: "destination_not_observable" };
    this.inactiveSince = null;
    return [result];
  }

  private assertTime(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < this.lastTimestamp) throw new Error("OBSERVATION_CLOCK_INVALID");
    this.lastTimestamp = atMs;
  }
}
