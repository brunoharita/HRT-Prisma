import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  composePreparedAssessment,
  evaluateEvidenceSufficiency,
  M51A_VERSIONS,
  type AssessmentBlueprint,
  type AssessmentItem,
  type AssessmentRubric,
  type VerificationDefinition,
} from "../src/domain/competencyVerification.js";

test("sufficiency engine requires verification when policy requires it", () => {
  const result = evaluateEvidenceSufficiency({
    organizationId: "org-1",
    personId: "person-1",
    competencyKey: "sql",
    targetLevel: "advanced",
    criticality: "critical",
    documentaryEvidenceStrength: "strong",
    hasContextualEvidence: true,
    hasHumanConfirmedEvidence: false,
    hasDemonstratedEvidence: false,
    policyRequirement: "required_by_policy",
    definitionAvailable: true,
  });
  assert.equal(result.status, "verification_required_by_policy");
  assert.equal(result.requirement, "required_by_policy");
  assert.ok(result.reasonCodes.includes("POLICY_REQUIRES_VERIFICATION"));
  assert.ok(result.reasonCodes.includes("NO_DEMONSTRATED_EVIDENCE"));
});

test("sufficiency engine recommends verification for advanced critical evidence that is not demonstrated", () => {
  const result = evaluateEvidenceSufficiency({
    organizationId: "org-1",
    personId: "person-1",
    competencyKey: "sql",
    targetLevel: "advanced",
    criticality: "critical",
    documentaryEvidenceStrength: "strong",
    hasContextualEvidence: true,
    hasHumanConfirmedEvidence: false,
    hasDemonstratedEvidence: false,
    policyRequirement: "recommended",
    definitionAvailable: true,
  });
  assert.equal(result.status, "verification_recommended");
  assert.ok(result.reasonCodes.includes("DOCUMENTARY_EVIDENCE_STRONG_BUT_NOT_DEMONSTRATED"));
  assert.ok(result.reasonCodes.includes("ADVANCED_LEVEL_REQUIRES_DEMONSTRATION"));
});

test("sufficiency engine treats fresh demonstrated evidence as sufficient", () => {
  const result = evaluateEvidenceSufficiency({
    organizationId: "org-1",
    personId: "person-1",
    competencyKey: "sql",
    targetLevel: "advanced",
    criticality: "critical",
    documentaryEvidenceStrength: "limited",
    hasContextualEvidence: true,
    hasHumanConfirmedEvidence: true,
    hasDemonstratedEvidence: true,
    demonstratedEvidenceFresh: true,
    policyRequirement: "required_by_policy",
    definitionAvailable: true,
  });
  assert.equal(result.status, "sufficient");
  assert.deepEqual(result.reasonCodes, ["DEMONSTRATED_EVIDENCE_CONFIRMS_LEVEL"]);
});

test("assessment composer selects only active compatible items and preserves versions", () => {
  const definition: VerificationDefinition = {
    id: "def-sql-advanced",
    organizationId: null,
    key: "sql-advanced-standard",
    name: "SQL Avançado Padrão",
    competencyKey: "sql",
    targetLevel: "advanced",
    domain: "backend",
    version: "v1.2",
    status: "active",
    description: "Avalia SQL avançado.",
  };
  const blueprint: AssessmentBlueprint = {
    id: "bp-sql-advanced",
    key: "BP-SQL-ADV-001",
    version: "v1.3",
    definitionId: definition.id,
    itemCount: 4,
    estimatedMinutes: 45,
    modality: "multiple_choice",
    language: "pt-BR",
    dimensionDistribution: [
      { dimension: "query_modeling", count: 2 },
      { dimension: "performance", count: 2 },
    ],
  };
  const rubric: AssessmentRubric = {
    id: "rb-sql-advanced",
    key: "RB-SQL-ADV-001",
    version: "v1.2",
    definitionId: definition.id,
    passingRules: { minimumCorrectPercentage: 70, requiredDimensions: ["query_modeling", "performance"] },
  };
  const itemBank: AssessmentItem[] = [
    item("item-1", "query_modeling", "active"),
    item("item-2", "query_modeling", "active"),
    item("item-3", "performance", "active"),
    item("item-4", "performance", "active"),
    item("item-5", "performance", "compromised"),
    { ...item("item-6", "performance", "active"), targetLevel: "intermediate" },
  ];
  const result = composePreparedAssessment({
    organizationId: "org-1",
    needId: "need-1",
    definition,
    blueprint,
    rubric,
    itemBank,
    status: "prepared",
  });
  assert.equal(result.ok, true);
  assert.equal(result.selectedItems.length, 4);
  assert.deepEqual(result.selectedItems.map((selected) => selected.id), ["item-1", "item-2", "item-3", "item-4"]);
  assert.equal(result.preparedAssessment?.versions.composerVersion, M51A_VERSIONS.composer);
  assert.equal(result.preparedAssessment?.versions.itemVersions["item-1"], M51A_VERSIONS.item);
});

test("assessment composer fails closed when item bank coverage is insufficient", () => {
  const definition: VerificationDefinition = {
    id: "def-sql-advanced",
    organizationId: null,
    key: "sql-advanced-standard",
    name: "SQL Avançado Padrão",
    competencyKey: "sql",
    targetLevel: "advanced",
    domain: "backend",
    version: "v1.2",
    status: "active",
    description: "Avalia SQL avançado.",
  };
  const blueprint: AssessmentBlueprint = {
    id: "bp-sql-advanced",
    key: "BP-SQL-ADV-001",
    version: "v1.3",
    definitionId: definition.id,
    itemCount: 2,
    estimatedMinutes: 45,
    modality: "multiple_choice",
    language: "pt-BR",
    dimensionDistribution: [{ dimension: "performance", count: 2 }],
  };
  const rubric: AssessmentRubric = {
    id: "rb-sql-advanced",
    key: "RB-SQL-ADV-001",
    version: "v1.2",
    definitionId: definition.id,
    passingRules: { minimumCorrectPercentage: 70, requiredDimensions: ["performance"] },
  };
  const result = composePreparedAssessment({
    organizationId: "org-1",
    needId: "need-1",
    definition,
    blueprint,
    rubric,
    itemBank: [item("item-1", "performance", "compromised")],
    status: "draft",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "INSUFFICIENT_ITEM_BANK_COVERAGE");
  assert.equal(result.selectedItems.length, 0);
});

test("M5.1A migration keeps RLS, grants and security-definer boundaries explicit", async () => {
  const sql = await readFile("supabase/migrations/20260901082542_m51a_verification_intelligence.sql", "utf8");
  const hardeningSql = await readFile("supabase/migrations/20260901111841_m51a_grant_hardening.sql", "utf8");
  const completeSql = `${sql}\n${hardeningSql}`;
  for (const tableName of [
    "verification_definitions",
    "verification_policies",
    "verification_needs",
    "assessment_blueprints",
    "assessment_rubrics",
    "assessment_item_families",
    "assessment_items",
    "prepared_assessments",
    "verification_audit_events",
  ]) {
    assert.match(completeSql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
    assert.match(completeSql, new RegExp(`grant select on public\\.${tableName} to authenticated`, "i"));
  }
  assert.doesNotMatch(completeSql, /auth\.role\(\)/i);
  assert.doesNotMatch(completeSql, /grant insert, update, delete on public\.verification_needs to authenticated/i);
  assert.doesNotMatch(completeSql, /grant insert, update, delete on public\.prepared_assessments to authenticated/i);
  assert.match(hardeningSql, /revoke all on function public\.prepare_m51a_assessment\(uuid, uuid, uuid, text, text\) from public, anon, authenticated/i);
  assert.match(completeSql, /set search_path = ''/i);
});

function item(id: string, dimension: string, state: AssessmentItem["state"]): AssessmentItem {
  return {
    id,
    familyId: `family-${id}`,
    key: id,
    version: M51A_VERSIONS.item,
    competencyKey: "sql",
    targetLevel: "advanced",
    dimension,
    state,
    source: "global",
    language: "pt-BR",
    modality: "multiple_choice",
    stem: `Item sintético ${id}`,
  };
}
