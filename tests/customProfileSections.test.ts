import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAdaptiveExtraction, type LayoutTextLine } from "../web/src/domain/adaptiveResumeExtraction.js";
import {
  CUSTOM_PROFILE_SECTION_METHOD_VERSION,
  addCustomSectionItem,
  createCustomSection,
  normalizeCustomSectionName,
  parseCustomSectionItemFieldPath,
  stableCustomSectionKey,
  validateCustomSectionName,
} from "../web/src/domain/customProfileSections.js";
import type { ExtractedPage, StructuredDraft } from "../web/src/domain/personIngestion.js";

function emptyDraft(): StructuredDraft {
  return { summary: null, experiences: [], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
}

function line(text: string, y: number, emphasis: LayoutTextLine["emphasis"] = "regular"): LayoutTextLine {
  return { text, x: 0.08, y, width: 0.72, height: 0.018, fontSize: 11, emphasis };
}

test("custom areas use a bounded structured contract and stable evidence paths", () => {
  assert.equal(normalizeCustomSectionName(" Projetos Relevantes: "), "projetos relevantes");
  assert.match(validateCustomSectionName("Formação acadêmica", []) ?? "", /canônica/);
  const created = createCustomSection({ draft: emptyDraft(), name: "Projetos relevantes", format: "list", source: "human", value: "Implantação do ERP" });
  const parsed = parseCustomSectionItemFieldPath(created.fieldPath);
  assert.equal(parsed?.sectionId, stableCustomSectionKey("Projetos relevantes"));
  assert.equal(created.draft.customSections[0]?.items[0]?.value, "Implantação do ERP");
  const added = addCustomSectionItem(created.draft, created.draft.customSections[0]!.id, "Automação logística");
  assert.equal(added.draft.customSections[0]?.items.length, 2);
  assert.match(added.fieldPath, /^customSections\.[a-z0-9_-]+\.items\.[a-z0-9_-]+\.value$/);
});

test("an approved custom heading is recognized on first extraction with item-level evidence", () => {
  const layoutLines = [
    line("Projetos relevantes", 0.1, "strong"),
    line("• Implantação do ERP corporativo", 0.13),
    line("• Automação do centro logístico", 0.16),
    line("Prêmios", 0.2, "strong"),
    line("Reconhecimento que não pertence à área aprendida", 0.22),
    line("Formação acadêmica", 0.27, "strong"),
    line("MBA em Gestão", 0.3),
  ];
  const page: ExtractedPage = {
    pageNumber: 2,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 150,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  };
  const sectionKey = stableCustomSectionKey("Projetos relevantes");
  const result = buildAdaptiveExtraction([page], [], [{
    sectionKey,
    displayName: "Projetos relevantes",
    normalizedName: "projetos relevantes",
    format: "list",
    confirmationCount: 1,
    methodVersion: CUSTOM_PROFILE_SECTION_METHOD_VERSION,
  }]);
  assert.deepEqual(result.draft.customSections[0]?.items.map((item) => item.value), ["Implantação do ERP corporativo", "Automação do centro logístico"]);
  assert.equal(result.fieldEvidence.filter((evidence) => evidence.fieldPath.startsWith(`customSections.${sectionKey}.items.`)).length, 2);
  assert.ok(result.fieldEvidence.every((evidence) => !evidence.text.includes("Reconhecimento que não pertence")));
  assert.ok(result.fieldEvidence.every((evidence) => !evidence.text.includes("MBA em Gestão")));
});

test("custom area migration validates shape, isolates tenants and learns metadata without profile content", async () => {
  const sql = await readFile("supabase/migrations/20260829021015_custom_profile_sections.sql", "utf8");
  const provenanceSql = await readFile("supabase/migrations/20260829024200_custom_section_learning_provenance.sql", "utf8");
  assert.match(sql, /private\.is_valid_custom_profile_sections/);
  assert.match(sql, /customSections\\\.\[a-z0-9\]/);
  assert.match(sql, /create table public\.organization_custom_section_definitions/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.has_org_role/);
  assert.match(sql, /revoke all on public\.organization_custom_section_definitions from public, anon, authenticated/);
  assert.match(sql, /old\.state = 'draft' and new\.state = 'approved'/);
  const learningFunction = sql.slice(sql.indexOf("create function private.learn_approved_custom_profile_sections"));
  assert.doesNotMatch(learningFunction, /section\s*->\s*'items'|section\s*->>\s*'value'/);
  assert.match(provenanceSql, /create table public\.organization_custom_section_confirmations/);
  assert.match(provenanceSql, /references public\.profile_reviews\(organization_id, id\)/);
  assert.match(provenanceSql, /prevent_review_evidence_history_mutation/);
  assert.match(provenanceSql, /revoke all on public\.organization_custom_section_confirmations from public, anon, authenticated/);
  assert.doesNotMatch(provenanceSql, /selected_text|quoted_text|item_value|profile_content/);
});
