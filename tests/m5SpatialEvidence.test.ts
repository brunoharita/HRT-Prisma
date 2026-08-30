import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  areSiblingReviewFields,
  boundingPixelRectForTextUnits,
  canonicalizePositionedTextUnits,
  evidenceSelectionRequiresReason,
  fieldPathMatches,
  isNormalizedPageRegion,
  isReviewEvidenceVisibleOnCurrentScreen,
  normalizePointerRegion,
  normalizedRegionStyle,
  textContainedByPixelRegion,
  uniqueTextUnitMatch,
  textUnitsReachedByPixelRegion,
  topLevelReviewField,
} from "../web/src/domain/spatialEvidence.js";

const migrationPath = "supabase/migrations/20260827034147_m5_spatial_cv_evidence.sql";

test("M5 normalizes pointer coordinates independently from zoom and drag direction", () => {
  assert.deepEqual(
    normalizePointerRegion({ x: 500, y: 250 }, { x: 100, y: 50 }, 1000, 500),
    { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
  );
  assert.deepEqual(
    normalizePointerRegion({ x: -20, y: -10 }, { x: 1100, y: 520 }, 1000, 500),
    { x: 0, y: 0, width: 1, height: 1 },
  );
  assert.equal(normalizePointerRegion({ x: 10, y: 10 }, { x: 12, y: 12 }, 1000, 500), null);
  assert.equal(isNormalizedPageRegion({ x: 0.8, y: 0.1, width: 0.3, height: 0.2 }), false);
  assert.deepEqual(normalizedRegionStyle({ x: 0.25, y: 0.5, width: 0.2, height: 0.1 }), {
    left: "25%", top: "50%", width: "20%", height: "10%",
  });
});

test("M5 resolves granular review fields without losing their top-level M2-C contract", () => {
  assert.equal(topLevelReviewField("experiences.2.role"), "experiences");
  assert.equal(fieldPathMatches("experiences.2", "experiences.2.role"), true);
  assert.equal(fieldPathMatches("experiences.1", "experiences.2.role"), false);
  assert.equal(fieldPathMatches("competencies", "competencies"), true);
});

test("M5 shows spatial evidence only for the review screen and entity currently open", () => {
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("experiences.0.organization", "experiences.0.role"), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("experiences.0.period", "experiences.0.role"), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("experiences.1.period", "experiences.0.role"), false);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("education.2.institution", "education.2.course"), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("education.1.period", "education.2.course"), false);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("summary", "summary"), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("competencies", "summary"), false);
});

test("M5 treats all fields rendered together on the Other screen as one visible scope", () => {
  const customField = "customSections.additional.items.item-1.value";
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("certifications", customField), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("uncertainties", customField), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("notIdentified", customField), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("customSections.projects.items.item-2.value", customField), true);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("languages", customField), false);
  assert.equal(isReviewEvidenceVisibleOnCurrentScreen("unknown.path", customField), false);
});

test("M5 locates one exact legacy original value for a visual-only PDF highlight", () => {
  const first = positionedUnits("Fundador & ", 0, 0);
  const second = positionedUnits("Diretor Executivo", 0, 1).map((unit) => ({
    ...unit,
    rect: { ...unit.rect, left: unit.rect.left + 120, right: unit.rect.right + 120 },
  }));
  const units = [...first, ...second];
  assert.equal(uniqueTextUnitMatch(units, "Fundador & Diretor Executivo").map((unit) => unit.text).join(""), "Fundador & Diretor Executivo");
  assert.deepEqual(uniqueTextUnitMatch([...units, ...units], "Fundador & Diretor Executivo"), []);
  assert.deepEqual(uniqueTextUnitMatch(units, "Diretor de Operações"), []);
  assert.deepEqual(uniqueTextUnitMatch(positionedUnits("Cofundador & Diretor Executivo", 0, 2), "Fundador & Diretor Executivo"), []);
});

test("M5 includes only characters visually contained by the selected rectangle", () => {
  const firstLine = positionedUnits("MBA | Universidade", 0, 0);
  const secondLine = positionedUnits("Pós-graduação em Gestão de Processos de TI", 14, 100);
  const selected = textContainedByPixelRegion([...firstLine, ...secondLine], {
    left: 0,
    top: 0,
    right: 35,
    bottom: 16,
  });

  assert.equal(selected, "MBA");
});

test("M5 keeps only the character that visibly starts inside the selection's right edge", () => {
  const line = positionedUnits("TI|", 0, 0);
  const verticallyOutside = positionedUnits("X", 20, 100);
  const selected = textContainedByPixelRegion([...line, ...verticallyOutside], {
    left: 0,
    top: 0,
    right: 11,
    bottom: 10,
  });

  assert.equal(selected, "TI");
});

test("M5 resolves the same canonical characters at every viewport zoom", () => {
  const sourceText = "fornecedores e impacto disciplina dos novos fluxos";
  const fullSize = scaledPositionedUnits(sourceText, 1);
  const fitWidth = scaledPositionedUnits(sourceText, 0.57);
  const enlarged = scaledPositionedUnits(sourceText, 1.47);
  const canonicalFull = canonicalizePositionedTextUnits(fullSize, { left: 0, top: 0, right: 1000, bottom: 500 });
  const canonicalFit = canonicalizePositionedTextUnits(fitWidth, { left: 0, top: 0, right: 570, bottom: 285 });
  const canonicalEnlarged = canonicalizePositionedTextUnits(enlarged, { left: 0, top: 0, right: 1470, bottom: 735 });
  const selection = { left: 0.1, top: 0.19, right: 0.65, bottom: 0.23 };

  assert.deepEqual(canonicalFit.map((unit) => unit.rect), canonicalFull.map((unit) => unit.rect));
  assert.deepEqual(canonicalEnlarged.map((unit) => unit.rect), canonicalFull.map((unit) => unit.rect));
  assert.equal(textContainedByPixelRegion(canonicalFull, selection), sourceText);
  assert.equal(textContainedByPixelRegion(canonicalFit, selection), sourceText);
  assert.equal(textContainedByPixelRegion(canonicalEnlarged, selection), sourceText);
});

test("M5 never imports a canonical character whose visual box starts outside the right edge", () => {
  const units = canonicalizePositionedTextUnits(positionedUnits("TI|", 0, 0), {
    left: 0, top: 0, right: 30, bottom: 10,
  });
  const reached = textUnitsReachedByPixelRegion(units, { left: 0, top: 0, right: 2 / 3, bottom: 1 });

  assert.deepEqual(reached.map((unit) => unit.text), ["T", "I"]);
  assert.deepEqual(boundingPixelRectForTextUnits(reached), { left: 0, top: 0, right: 0.666666, bottom: 1 });
});

test("M5 subtracts only characters covered by mapped sibling-field regions", () => {
  const header = positionedUnits("Desenvolvedor | NM Sistemas | Jun/08 - Nov/12", 0, 0);
  const description = positionedUnits("Desenvolvimento de software e bancos de dados", 14, 100);
  const selection = { left: 0, top: 0, right: 500, bottom: 30 };
  const headerRegion = { left: 0, top: 0, right: 460, bottom: 12 };

  assert.equal(
    textContainedByPixelRegion([...header, ...description], selection, [headerRegion]),
    "Desenvolvimento de software e bancos de dados",
  );
  assert.equal(areSiblingReviewFields("experiences.4.description", "experiences.4.role"), true);
  assert.equal(areSiblingReviewFields("experiences.4.description", "experiences.3.role"), false);
  assert.equal(areSiblingReviewFields("experiences.4.description", "experiences.4"), false);
});

test("M5 applies recognized text without a reason and requires one only for a real interpretation", () => {
  assert.equal(evidenceSelectionRequiresReason({
    selectedText: "MBA em Gestão Estratégica de Negócios",
    proposedValue: "MBA em Gestão Estratégica de Negócios",
    valueEdited: false,
    changesDraft: true,
  }), false);
  assert.equal(evidenceSelectionRequiresReason({
    selectedText: "MBA em Gestão Estratégica de Negócios",
    proposedValue: "MBA Executivo",
    valueEdited: true,
    changesDraft: true,
  }), true);
  assert.equal(evidenceSelectionRequiresReason({
    selectedText: null,
    proposedValue: "MBA Executivo",
    valueEdited: true,
    changesDraft: true,
  }), true);
  assert.equal(evidenceSelectionRequiresReason({
    selectedText: "MBA",
    proposedValue: "Outro valor",
    valueEdited: true,
    changesDraft: false,
  }), false);
});

test("M5 migration persists versioned normalized regions and compatible legacy evidence links", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.spatial_evidence_regions/i);
  assert.match(sql, /coordinate_system text not null default 'normalized-page-v1'/i);
  assert.match(sql, /contract_version text not null default '1\.0\.0'/i);
  assert.match(sql, /x double precision not null check \(x between 0 and 1\)/i);
  assert.match(sql, /check \(x \+ width <= 1 and y \+ height <= 1\)/i);
  assert.match(sql, /foreign key \(organization_id, document_id, document_version\)/i);
  assert.match(sql, /create table public\.profile_review_evidence_links/i);
  assert.match(sql, /evidence_id uuid,[\s\S]*spatial_region_id uuid/i);
  assert.match(sql, /legacy evidence remains valid without a spatial region/i);
  assert.doesNotMatch(sql, /update public\.evidence[\s\S]{0,200}(source_page|source_offset)/i);
});

test("M5 strict selection migration versions character containment without invalidating historical evidence", async () => {
  const sql = await readFile("supabase/migrations/20260828160707_strict_pdf_character_region.sql", "utf8");
  assert.match(sql, /pdfjs-character-region-v2/i);
  assert.match(sql, /contract_version set default '1\.1\.0'/i);
  assert.match(sql, /contract_version in \('1\.0\.0', '1\.1\.0'\)/i);
  assert.match(sql, /pg_get_functiondef/i);
  assert.match(sql, /unexpected shape/i);
  assert.doesNotMatch(sql, /update public\.spatial_evidence_regions/i);
});

test("M5 migration fails closed for tenant, role, bounds, document version, page and direct DML", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /alter table public\.spatial_evidence_regions enable row level security/i);
  assert.match(sql, /create policy spatial_evidence_regions_select[\s\S]*private\.has_org_role/i);
  assert.match(sql, /array\['super_admin', 'owner', 'admin', 'recruiter'\]/i);
  assert.doesNotMatch(sql, /spatial_evidence_regions_select[\s\S]{0,260}'member'/i);
  assert.match(sql, /revoke all on public\.spatial_evidence_regions from public, anon, authenticated/i);
  assert.match(sql, /revoke all on public\.profile_review_evidence_links from public, anon, authenticated/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /actor_id := private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(sql, /review\.document_id[\s\S]*document_version = p_document_version[\s\S]*source_type = 'resume_pdf'/i);
  assert.match(sql, /p_page_number > document\.page_count/i);
  assert.match(sql, /normalized evidence coordinates are invalid/i);
  assert.match(sql, /review_conflict/i);
});

test("M5 refinement migration preserves raw text and validates immutable same-record geometric decisions", async () => {
  const sql = await readFile("supabase/migrations/20260829111414_spatial_evidence_refinement.sql", "utf8");
  assert.match(sql, /add column raw_selected_text text/i);
  assert.match(sql, /contract_version in \('1\.0\.0', '1\.1\.0', '1\.2\.0'\)/i);
  assert.match(sql, /create table public\.profile_review_evidence_refinements/i);
  assert.match(sql, /decision text not null check \(decision in \('excluded', 'included'\)\)/i);
  assert.match(sql, /profile_review_evidence_refinements_immutable[\s\S]*before update or delete/i);
  assert.match(sql, /create policy profile_review_evidence_refinements_select[\s\S]*private\.has_org_role/i);
  assert.match(sql, /revoke all on public\.profile_review_evidence_refinements from public, anon, authenticated/i);
  assert.match(sql, /private\.review_field_record_scope\(link\.field_path\) = target_scope/i);
  assert.match(sql, /region\.x < p_x \+ p_width[\s\S]*region\.y \+ region\.height > p_y/i);
  assert.match(sql, /refinement link is not an active overlapping sibling field/i);
  assert.match(sql, /from private\.record_profile_review_evidence\(/i);
  assert.match(sql, /contract_version = '1\.2\.0'/i);
  assert.doesNotMatch(sql, /jsonb_build_object\([\s\S]{0,500}p_raw_selected_text/i);
});

test("M5 refinement RPC fix removes output-column ambiguity without silently accepting schema drift", async () => {
  const sql = await readFile("supabase/migrations/20260829113452_spatial_evidence_refinement_rpc_fix.sql", "utf8");
  assert.match(sql, /pg_get_functiondef/i);
  assert.match(sql, /on conflict \(organization_id, region_id, mapped_link_id\) do nothing/i);
  assert.match(sql, /on conflict do nothing/i);
  assert.match(sql, /unexpected shape/i);
});

test("M5 evidence operation versions value and evidence together and keeps history immutable", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create or replace function public\.record_profile_review_evidence/i);
  assert.match(sql, /insert into public\.profile_review_revisions/i);
  assert.match(sql, /insert into public\.profile_review_changes/i);
  assert.match(sql, /insert into public\.spatial_evidence_regions/i);
  assert.match(sql, /insert into public\.profile_review_evidence_links/i);
  assert.match(sql, /insert into public\.profile_review_evidence_events/i);
  assert.match(sql, /profile_review_evidence_events_immutable[\s\S]*before update or delete/i);
  assert.match(sql, /state = 'superseded'[\s\S]*superseded_by_link_id = new_link_id/i);
  assert.match(sql, /event_type[\s\S]*'new_information_created'/i);
  assert.match(sql, /jsonb_build_object\([\s\S]*'coordinate_system', 'normalized-page-v1'/i);
  const auditMetadata = sql.match(/insert into public\.person_ingestion_events[\s\S]*?jsonb_build_object\([\s\S]*?\)\s*\n\s*\);/i)?.[0] ?? "";
  assert.doesNotMatch(auditMetadata, /selected_text|p_selected_text/);
});

test("M5 replays a completed correction before checking whether its value is already current", async () => {
  const migration = await readFile("supabase/migrations/20260827042829_m5_spatial_evidence_idempotent_replay.sql", "utf8");
  const replayPosition = migration.indexOf("operation.status = 'completed'");
  const coreCallPosition = migration.indexOf("from private.record_profile_review_evidence(");
  assert.ok(replayPosition > 0);
  assert.ok(coreCallPosition > replayPosition);
  assert.match(migration, /request_fingerprint|fingerprint/);
  assert.match(migration, /private\.claim_document_operation/);
  assert.match(migration, /reused boolean/);
});

test("M5 workspace uses the pinned local PDF and OCR stack with mobile fallback", async () => {
  const [viewer, page, styles] = await Promise.all([
    readFile("web/src/components/review/DocumentEvidenceViewer.tsx", "utf8"),
    readFile("web/src/pages/ProfileReviewPage.tsx", "utf8"),
    readFile("web/src/styles.css", "utf8"),
  ]);
  assert.match(viewer, /import\("pdfjs-dist"\)/);
  assert.match(viewer, /new pdfjs\.TextLayer/);
  assert.match(viewer, /import\("tesseract\.js"\)/);
  assert.match(viewer, /normalizePointerRegion/);
  assert.match(viewer, /PDFJS_CHARACTER_REGION_METHOD/);
  assert.match(viewer, /--total-scale-factor/);
  assert.match(viewer, /canonicalTextUnits/);
  assert.match(viewer, /canonicalizePositionedTextUnits/);
  assert.match(viewer, /textContainedByPixelRegion/);
  assert.match(viewer, /refinementCandidates/);
  assert.match(viewer, /positionedOcrTextUnits/);
  assert.match(viewer, /pendingCharacterRegions/);
  assert.match(viewer, /prisma-evidence-character-highlight/);
  assert.match(viewer, /selectedTextUnits/);
  assert.match(viewer, /isReviewEvidenceVisibleOnCurrentScreen\(link\.fieldPath, selectedFieldPath\)/);
  assert.match(viewer, /data-visual-fallback="exact-pdf-text"/);
  assert.doesNotMatch(viewer, /rectanglesIntersect/);
  assert.match(viewer, /ocrVersionRef/);
  assert.doesNotMatch(viewer, /openai|anthropic|embedding/i);
  assert.match(page, /Currículo[\s\S]*Revisão/);
  assert.match(page, /recordProfileReviewEvidence/);
  assert.match(page, /fieldPathMatches\(item\.fieldPath, selectedFieldPath\)/);
  assert.match(page, /selectionError \? <Alert title=\{selectionError\} showIcon type="error"/);
  assert.match(page, /setSelectionValueEdited\(false\)/);
  assert.match(page, /confirmLoading=\{busy\}/);
  assert.match(page, /Conteúdos já mapeados dentro da seleção/);
  assert.match(page, /refinementDecisions/);
  assert.match(styles, /grid-template-columns: minmax\(410px, 44fr\) minmax\(520px, 56fr\)/);
  assert.match(styles, /\.prisma-review-mobile-switch/);
  assert.match(styles, /\.prisma-evidence-character-highlight/);
  assert.match(styles, /\.mobile-pane-document/);
});

function positionedUnits(text: string, top: number, sourceIndex: number) {
  let offset = 0;
  return Array.from(text).map((character) => {
    const unit = {
      unitId: `native:${sourceIndex}:${offset}`,
      text: character,
      sourceIndex,
      sourceOffset: offset,
      lineIndex: sourceIndex,
      source: "native" as const,
      confidence: 1,
      rect: { left: offset * 10, top, right: offset * 10 + 10, bottom: top + 10 },
    };
    offset += character.length;
    return unit;
  });
}

function scaledPositionedUnits(text: string, scale: number) {
  return positionedUnits(text, 100, 0).map((unit) => ({
    ...unit,
    rect: {
      left: (100 + unit.rect.left) * scale,
      top: unit.rect.top * scale,
      right: (100 + unit.rect.right) * scale,
      bottom: unit.rect.bottom * scale,
    },
  }));
}
