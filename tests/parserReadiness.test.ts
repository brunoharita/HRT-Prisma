import assert from "node:assert/strict";
import test from "node:test";
import { currentParserReadiness, decodeParserReadiness, parserReadinessBlocksImport, PARSER_READINESS_VERSION, PARSER_READINESS_TTL_MS } from "../web/src/domain/parserReadiness.js";

test("readiness accepts only known version and state/reason pairs, stripping provider content", () => {
  for (const [state, reason] of [["available", "ready"], ["busy", "worker_busy"], ["unavailable", "worker_unreachable"], ["unknown", "check_timeout"]]) {
    const result = decodeParserReadiness({ version: PARSER_READINESS_VERSION, state, reason, secret: "private" }, "org", 100);
    assert.equal(result.state, state);
    assert.equal(JSON.stringify(result).includes("private"), false);
  }
  for (const value of [null, {}, { state: "available", reason: "ready" }, { version: PARSER_READINESS_VERSION, state: "available", reason: "check_timeout" }, { version: PARSER_READINESS_VERSION, state: "available", reason: "toString" }]) {
    assert.equal(decodeParserReadiness(value, "org").state, "unknown");
  }
});

test("readiness expires and cannot be carried to another organization or survive clock reversal", () => {
  const result = decodeParserReadiness({ version: PARSER_READINESS_VERSION, state: "available", reason: "ready" }, "org", 100);
  assert.equal(currentParserReadiness(result, "org", 99 + PARSER_READINESS_TTL_MS).state, "available");
  assert.equal(currentParserReadiness(result, "org", 100 + PARSER_READINESS_TTL_MS).state, "unknown");
  assert.equal(currentParserReadiness(result, "other", 101).state, "unknown");
  assert.equal(currentParserReadiness(result, "org", 99).state, "unknown");
});

test("confirmed unavailable, busy and pending checks block intake; advisory uncertainty permits explicit attempt", () => {
  for (const state of ["available", "unknown", "checking", "busy", "unavailable"] as const) {
    assert.equal(parserReadinessBlocksImport({ state, reason: "synthetic", organizationId: "org", observedAt: 100 }), ["checking", "busy", "unavailable"].includes(state));
  }
});
