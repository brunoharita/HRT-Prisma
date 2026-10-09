import test from "node:test";
import assert from "node:assert/strict";
import { QuestionMouseTracker, MOUSE_METHOD_VERSION } from "../src/domain/positionAssessmentActivity.js";
import type { QuestionObservationScope } from "../src/domain/positionAssessment.js";

const scope: QuestionObservationScope = { organizationId: "tenant", attemptId: "attempt", questionInstanceId: "q1", questionVersion: "v1" };
const active = { active: true, previouslyAnswered: false };

test("mouse totals count sampled still intervals and stop permanently at first choice", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 0, active);
  tracker.movement(50); tracker.sample(100); // Contains movement; never count as idle.
  tracker.sample(200); tracker.sample(300); // 200ms observed still.
  tracker.movement(350); tracker.sample(400);
  tracker.sample(500); // Another 100ms still.
  const [result] = tracker.firstChoice(550);
  assert.ok(result); assert.equal(result.method, MOUSE_METHOD_VERSION);
  assert.equal(result.totalIdleMs, 300); assert.equal(result.longestIdleMs, 200);
  assert.equal(result.observedActiveMs, 450); assert.equal(result.unobservedActiveMs, 100);
  assert.equal(result.support, "observed_mouse"); assert.equal(result.closedBy, "first_choice");
  tracker.movement(600); tracker.sample(800);
  assert.deepEqual(tracker.firstChoice(900), []);
});

test("hidden intervals and dropped samples never count as stillness", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 0, active);
  tracker.movement(0); tracker.sample(100); tracker.sample(200);
  tracker.setActive(false, 250); tracker.sample(2000); tracker.setActive(true, 3000);
  tracker.sample(3100); // A new active idle interval; cannot bridge the hidden period.
  tracker.sample(5000); // Dropped sample, not 1900ms idle.
  tracker.sample(5100);
  const [result] = tracker.firstChoice(5150);
  assert.ok(result); assert.equal(result.totalIdleMs, 300); assert.equal(result.longestIdleMs, 100);
  assert.equal(result.observedActiveMs, 400); assert.equal(result.unobservedActiveMs, 2000);
  assert.equal(result.limitation, "sampled_movement_does_not_identify_activity");
});

test("keyboard/touch-only interaction is not applicable, never a confirmed zero", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 0, active);
  tracker.sample(100); tracker.sample(200);
  const [result] = tracker.firstChoice(250);
  assert.ok(result); assert.equal(result.support, "not_applicable");
  assert.equal(result.totalIdleMs, null); assert.equal(result.longestIdleMs, null);
  assert.equal(result.observedActiveMs, 0); assert.equal(result.unobservedActiveMs, 250);
});

test("question changes and revisits retain distinct scopes; answered questions do not restart collection", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 0, active);
  tracker.movement(0); tracker.sample(100); tracker.sample(200);
  const [q1] = tracker.activate({ ...scope, questionInstanceId: "q2", questionVersion: "v2" }, 250, active);
  assert.ok(q1); assert.equal(q1.questionInstanceId, "q1"); assert.equal(q1.questionVersion, "v1");
  assert.equal(q1.totalIdleMs, 100); assert.equal(q1.closedBy, "question_changed");
  tracker.movement(300); tracker.sample(350); tracker.sample(450);
  const [q2] = tracker.activate(scope, 500, { active: true, previouslyAnswered: true });
  assert.ok(q2); assert.equal(q2.questionInstanceId, "q2"); assert.equal(q2.questionVersion, "v2");
  tracker.movement(600); tracker.sample(700);
  assert.deepEqual(tracker.firstChoice(800), []); assert.deepEqual(tracker.activate(null, 900, active), []);
});

test("movement outside an active window does not establish mouse support", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 0, { ...active, active: false });
  tracker.movement(100); tracker.sample(200); tracker.setActive(true, 300); tracker.sample(400);
  const [result] = tracker.activate(null, 500, active);
  assert.ok(result); assert.equal(result.support, "not_applicable"); assert.equal(result.unobservedActiveMs, 200);
});

test("invalid clock and empty observation scope fail closed", () => {
  const tracker = new QuestionMouseTracker(); tracker.activate(scope, 100, active);
  assert.throws(() => tracker.sample(99), /CLOCK_INVALID/);
  assert.throws(() => tracker.movement(NaN), /CLOCK_INVALID/);
  assert.throws(() => new QuestionMouseTracker().activate({ ...scope, attemptId: "" }, 0, active), /SCOPE_REQUIRED/);
});

test("mouse discovered only at choice has unknown idle time; repeated focus events do not split observations", () => {
  const late = new QuestionMouseTracker(); late.activate(scope, 0, active);
  late.sample(100); late.movement(200);
  const [unavailable] = late.firstChoice(200);
  assert.ok(unavailable); assert.equal(unavailable.support, "observed_mouse");
  assert.equal(unavailable.totalIdleMs, null); assert.equal(unavailable.longestIdleMs, null);
  assert.equal(unavailable.observedActiveMs, 0); assert.equal(unavailable.unobservedActiveMs, 200);

  const focused = new QuestionMouseTracker(); focused.activate(scope, 0, active);
  focused.movement(0); focused.sample(100); focused.sample(200);
  focused.setActive(true, 220); focused.setActive(true, 240); focused.sample(300);
  const [observed] = focused.firstChoice(300);
  assert.ok(observed); assert.equal(observed.totalIdleMs, 200); assert.equal(observed.longestIdleMs, 200);
  assert.equal(observed.unobservedActiveMs, 0);
});
