import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeItemBankGaps,
  calculateItemAnalytics,
  evaluateAiBudget,
  findPotentialDuplicates,
  generateWithFakeProvider,
  itemFingerprint,
  validateItemProposal,
  type BlueprintCoverageTarget,
  type GovernedAssessmentItem,
} from "../src/domain/assessmentItemGovernance.js";

const target: BlueprintCoverageTarget = {
  blueprintId: "bp-sql-advanced",
  competencyKey: "sql",
  targetLevel: "advanced",
  modality: "multiple_choice",
  language: "pt-BR",
  dimension: "performance",
  requiredItems: 3,
  diversityReserve: 2,
  maximumExposure: 100,
};

function item(id: string, overrides: Partial<GovernedAssessmentItem> = {}): GovernedAssessmentItem {
  return {
    id,
    familyId: `family-${id}`,
    key: id,
    organizationId: null,
    scope: "global",
    competencyKey: "sql",
    targetLevel: "advanced",
    dimension: "performance",
    modality: "multiple_choice",
    language: "pt-BR",
    lifecycleState: "active",
    calibrationState: "uncalibrated",
    definedDifficulty: "high",
    stem: `Como otimizar a consulta SQL do cenário ${id}?`,
    options: [{ id: "A", label: "Plano A" }, { id: "B", label: "Plano B" }],
    correctOptionId: "B",
    explanation: "O plano B atende ao objetivo.",
    exposureCount: 0,
    compromised: false,
    ...overrides,
  };
}

test("M5.1C gap analysis counts only eligible coverage and explains the deficit", () => {
  const gaps = analyzeItemBankGaps([target], [
    item("eligible"),
    item("compromised", { compromised: true, lifecycleState: "compromised" }),
    item("overexposed", { exposureCount: 100 }),
    item("wrong-level", { targetLevel: "intermediate" }),
  ]);
  assert.equal(gaps[0]?.requiredItems, 5);
  assert.equal(gaps[0]?.eligibleItems, 1);
  assert.equal(gaps[0]?.deficit, 4);
  assert.ok(gaps[0]?.reasonCodes.includes("COMPROMISED_ITEMS_EXCLUDED"));
  assert.ok(gaps[0]?.reasonCodes.includes("EXPOSURE_LIMIT_REACHED"));
});

test("M5.1C fake provider is deterministic, schema-valid and PII-free", () => {
  const gap = analyzeItemBankGaps([target], [item("existing")])[0]!;
  const request = { id: "request-1", scope: "global" as const, organizationId: null, gap, quantity: 2, directives: ["cenários práticos"], provider: "fake" as const };
  const first = generateWithFakeProvider(request);
  const second = generateWithFakeProvider(request);
  assert.deepEqual(first, second);
  assert.equal(first.every((proposal) => proposal.validation.valid), true);
  assert.equal(first.every((proposal) => proposal.provenance.synthetic), true);
  assert.doesNotMatch(JSON.stringify(first), /@|cpf|telefone|pessoa-1/i);
});

test("M5.1C fake provider refuses generation without a real gap", () => {
  const gap = { ...analyzeItemBankGaps([target], [item("one"), item("two"), item("three"), item("four"), item("five")])[0]!, deficit: 0 };
  assert.throws(() => generateWithFakeProvider({ id: "request-no-gap", scope: "global", organizationId: null, gap, quantity: 1, directives: [], provider: "fake" }), /M51C_INVALID_GENERATION_QUANTITY/);
});

test("M5.1C rejects PII and answer leakage before human review", () => {
  const withEmail = item("pii", { stem: "Envie o resultado para pessoa@example.com" });
  const withLeakage = item("leak", { stem: "A resposta correta é B. Qual alternativa escolher?" });
  assert.ok(validateItemProposal(withEmail).reasonCodes.includes("POTENTIAL_PII_DETECTED"));
  assert.ok(validateItemProposal(withLeakage).reasonCodes.includes("ANSWER_LEAKAGE_DETECTED"));
});

test("M5.1C deterministic and lexical deduplication identify exact and near duplicates", () => {
  const base = item("base");
  const exact = item("exact", { stem: base.stem, options: base.options });
  const near = item("near", { stem: "Como otimizar a consulta SQL neste cenário base?" });
  assert.equal(itemFingerprint(base), itemFingerprint(exact));
  const matches = findPotentialDuplicates(base, [exact, near], 0.6);
  assert.equal(matches.some((match) => match.exact), true);
  assert.equal(matches.some((match) => match.itemId === "near"), true);
});


test("M5.1C never calibrates from synthetic observations", () => {
  const analytics = calculateItemAnalytics("item-1", Array.from({ length: 150 }, () => ({ itemId: "item-1", correct: true, elapsedSeconds: 60, synthetic: true })));
  assert.equal(analytics.applicationCount, 150);
  assert.equal(analytics.realApplicationCount, 0);
  assert.equal(analytics.correctRate, null);
  assert.equal(analytics.calibrationState, "uncalibrated");
  assert.ok(analytics.reasonCodes.includes("SYNTHETIC_OBSERVATIONS_EXCLUDED"));
});

test("M5.1C separates provisional and calibrated observed difficulty", () => {
  const provisional = calculateItemAnalytics("item-1", Array.from({ length: 30 }, (_, index) => ({ itemId: "item-1", correct: index < 21, elapsedSeconds: 60 + index, synthetic: false })));
  const calibrated = calculateItemAnalytics("item-1", Array.from({ length: 100 }, (_, index) => ({ itemId: "item-1", correct: index < 70, elapsedSeconds: 60 + index, synthetic: false })));
  assert.equal(provisional.calibrationState, "calibration_eligible");
  assert.equal(calibrated.calibrationState, "calibrated");
  assert.equal(calibrated.observedDifficulty, 0.3);
});

test("M5.1C AI budget fails closed for flag, unknown configuration, cost and exhausted cap", () => {
  assert.equal(evaluateAiBudget({ enabled: false, monthlyLimitCents: 1000, spentCents: 0, estimatedCostCents: 10 }).reasonCode, "FEATURE_DISABLED");
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: null, spentCents: 0, estimatedCostCents: 10 }).reasonCode, "BUDGET_NOT_CONFIGURED");
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: 1000, spentCents: 0, estimatedCostCents: null }).reasonCode, "UNKNOWN_COST");
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: 1000, spentCents: 990, estimatedCostCents: 20 }).reasonCode, "BUDGET_EXCEEDED");
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: 1000, spentCents: 900, estimatedCostCents: 20 }).allowed, true);
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: 1000, spentCents: 790, estimatedCostCents: 20 }).state, "warning");
  assert.equal(evaluateAiBudget({ enabled: true, monthlyLimitCents: 1000, spentCents: 100, estimatedCostCents: 20 }).state, "available");
});

test("M5.1C migration exposes no table to anon and requires human publication", async () => {
  const migration = await readFile("supabase/migrations/20260901145444_m51c_item_bank_governance.sql", "utf8");
  const hardening = await readFile("supabase/migrations/20260901150902_m51c_generation_transaction_hardening.sql", "utf8");
  const analytics = await readFile("supabase/migrations/20260901152207_m51c_analytics_budget_and_state_contract.sql", "utf8");
  const budget = await readFile("supabase/migrations/20260901152216_m51c_budget_reservation_and_request_lifecycle.sql", "utf8");
  const deduplication = await readFile("supabase/migrations/20260901152451_m51c_deduplication_and_need_backfill.sql", "utf8");
  const failureAuditFix = await readFile("supabase/migrations/20260901153011_m51c_generation_failure_audit_result_fix.sql", "utf8");
  const tables = [
    "assessment_item_generation_needs", "assessment_item_generation_requests", "assessment_item_generation_proposals",
    "assessment_item_generation_reviews", "assessment_item_calibration_snapshots", "assessment_item_quality_flags",
    "assessment_ai_policies", "assessment_ai_budget_ledger",
  ];
  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`, "i"));
  }
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete)[^;]+to\s+anon/i);
  assert.match(migration, /M51C_HUMAN_REVIEW_REQUIRED/);
  assert.match(migration, /M51C_PUBLISHED_PROPOSAL_LOCKED/);
  assert.match(migration, /'replayed', true/);
  assert.match(migration, /M51C_AI_GENERATION_DISABLED/);
  assert.match(migration, /grant execute on function public\.publish_m51c_approved_proposals\(uuid, uuid\[\]\) to authenticated/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(hardening, /pg_advisory_xact_lock/i);
  assert.match(hardening, /M51C_IDEMPOTENCY_CONFLICT/);
  assert.match(hardening, /M51C_PUBLISHED_PROPOSAL_LOCKED/);
  assert.match(hardening, /for update of candidate/i);
  assert.match(analytics, /SYNTHETIC_OBSERVATIONS_EXCLUDED_FROM_REAL_CALIBRATION/);
  assert.match(analytics, /snapshot\.organization_id = p_organization_id/);
  assert.match(budget, /'reservation'/);
  assert.match(budget, /M51C_REQUEST_COST_CEILING_EXCEEDED/);
  assert.match(budget, /grant execute on function public\.fail_m51c_external_generation\(uuid, text\) to service_role/i);
  assert.match(deduplication, /m51c_lexical_similarity/i);
  assert.match(deduplication, /EXACT_DUPLICATE_REVIEW_REQUIRED/);
  assert.match(deduplication, /POTENTIAL_PII_DETECTED/);
  assert.match(failureAuditFix, /'m51c_generation_failed', 'failure'/);
});
