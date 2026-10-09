import type { QuestionObservationScope } from "./positionAssessment.js";

export const MOUSE_METHOD_VERSION = "position-assessment-mouse-samples-1.0.0";
/** Browser sampling resolution, not a behavioral threshold or fraud criterion. */
export const MOUSE_SAMPLE_INTERVAL_MS = 100;
export const MOUSE_MAX_SAMPLE_GAP_MS = 1000;

export interface MouseObservation extends QuestionObservationScope {
  kind: "mouse_idle_before_first_choice";
  method: typeof MOUSE_METHOD_VERSION;
  startedAtClientMs: number;
  endedAtClientMs: number;
  totalIdleMs: number | null;
  longestIdleMs: number | null;
  observedActiveMs: number;
  unobservedActiveMs: number;
  support: "observed_mouse" | "not_applicable";
  resolutionMs: typeof MOUSE_SAMPLE_INTERVAL_MS;
  closedBy: "first_choice" | "question_changed" | "collector_stopped";
  limitation: "sampled_movement_does_not_identify_activity";
}

/**
 * Counts only active, sampled intervals with no observed mouse movement.
 * Movement is a boolean per interval: no coordinates, click targets or key history.
 * No mouse observation is not applicable; missing sampling is explicitly a gap.
 * A revisit is a new observation; the caller supplies the persisted first-choice state.
 */
export class QuestionMouseTracker {
  private scope: QuestionObservationScope | null = null;
  private startedAt = 0;
  private previousSampleAt = 0;
  private lastTimestamp = -Infinity;
  private active = false;
  private ended = false;
  private mouseObserved = false;
  private movementPending = false;
  private totalIdleMs = 0;
  private longestIdleMs = 0;
  private currentIdleMs = 0;
  private observedActiveMs = 0;
  private unobservedActiveMs = 0;

  activate(scope: QuestionObservationScope | null, atMs: number, state: { active: boolean; previouslyAnswered: boolean }): MouseObservation[] {
    this.checkTime(atMs);
    if (scope && !Object.values(scope).every(value => typeof value === "string" && value.trim())) throw new Error("OBSERVATION_SCOPE_REQUIRED");
    const closed = this.close(atMs, scope ? "question_changed" : "collector_stopped");
    this.scope = scope ? { ...scope } : null;
    this.startedAt = this.previousSampleAt = atMs;
    this.active = state.active;
    this.ended = state.previouslyAnswered;
    this.mouseObserved = this.movementPending = false;
    this.totalIdleMs = this.longestIdleMs = this.currentIdleMs = this.observedActiveMs = this.unobservedActiveMs = 0;
    return closed;
  }

  /** Called only for a mouse pointer event, never for touch, pen or keyboard. */
  movement(atMs: number): void {
    this.checkTime(atMs);
    if (!this.scope || this.ended || !this.active) return;
    // The unsampled prefix before the first actual mouse event is unavailable.
    if (!this.mouseObserved) {
      this.unobservedActiveMs += atMs - this.previousSampleAt;
      this.previousSampleAt = atMs;
      this.mouseObserved = true;
    }
    this.movementPending = true;
  }

  sample(atMs: number): void {
    this.checkTime(atMs);
    if (!this.scope || this.ended) return;
    this.consumeInterval(atMs);
  }

  setActive(active: boolean, atMs: number): void {
    this.checkTime(atMs);
    if (!this.scope || this.ended) return;
    if (this.active === active) return; // Deduplicate blur/visibility and repeated focus.
    // A focus boundary is not a regular sample. Preserve it as an observation gap.
    if (this.active) this.unobservedActiveMs += atMs - this.previousSampleAt;
    this.previousSampleAt = atMs;
    this.active = active;
    this.currentIdleMs = 0;
    this.movementPending = false;
  }

  firstChoice(atMs: number): MouseObservation[] {
    this.checkTime(atMs);
    return this.close(atMs, "first_choice");
  }

  private consumeInterval(atMs: number): void {
    const elapsed = atMs - this.previousSampleAt;
    this.previousSampleAt = atMs;
    if (!this.active) { this.currentIdleMs = 0; this.movementPending = false; return; }
    if (!this.mouseObserved || elapsed > MOUSE_MAX_SAMPLE_GAP_MS) {
      this.unobservedActiveMs += elapsed;
      this.currentIdleMs = 0;
    } else {
      this.observedActiveMs += elapsed;
      if (this.movementPending) this.currentIdleMs = 0;
      else {
        this.totalIdleMs += elapsed;
        this.currentIdleMs += elapsed;
        this.longestIdleMs = Math.max(this.longestIdleMs, this.currentIdleMs);
      }
    }
    this.movementPending = false;
  }

  private close(atMs: number, closedBy: MouseObservation["closedBy"]): MouseObservation[] {
    if (!this.scope || this.ended) return [];
    // A final partial interval cannot prove absence of movement by itself.
    if (this.active) this.unobservedActiveMs += atMs - this.previousSampleAt;
    this.previousSampleAt = atMs;
    this.ended = true;
    return [{ ...this.scope, kind: "mouse_idle_before_first_choice", method: MOUSE_METHOD_VERSION,
      startedAtClientMs: this.startedAt, endedAtClientMs: atMs,
      totalIdleMs: this.observedActiveMs > 0 ? this.totalIdleMs : null,
      longestIdleMs: this.observedActiveMs > 0 ? this.longestIdleMs : null,
      observedActiveMs: this.observedActiveMs, unobservedActiveMs: this.unobservedActiveMs,
      support: this.mouseObserved ? "observed_mouse" : "not_applicable", resolutionMs: MOUSE_SAMPLE_INTERVAL_MS,
      closedBy, limitation: "sampled_movement_does_not_identify_activity" }];
  }

  private checkTime(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < this.lastTimestamp) throw new Error("OBSERVATION_CLOCK_INVALID");
    this.lastTimestamp = atMs;
  }
}
