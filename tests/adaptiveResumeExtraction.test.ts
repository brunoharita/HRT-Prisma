import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildAdaptiveExtraction,
  proposeSiblingFieldCorrections,
  type LayoutTextLine,
} from "../web/src/domain/adaptiveResumeExtraction.js";
import type { ExtractedPage, StructuredDraft } from "../web/src/domain/personIngestion.js";

function line(text: string, y: number, x = 0.08, width = 0.75, emphasis: LayoutTextLine["emphasis"] = "regular"): LayoutTextLine {
  return { text, x, y, width, height: 0.018, fontSize: 11, emphasis };
}

test("adaptive extraction separates role, descriptor, period and company on the next visual line", () => {
  const layoutLines = [
    line("Experiência profissional", 0.08, 0.08, 0.45, "strong"),
    line("Fundador & Diretor Executivo | Transformação, Tecnologia e Produtos Digitais Jan/25 - Atual", 0.12, 0.08, 0.8, "strong"),
    line("HRT Solutions", 0.145, 0.08, 0.24, "strong"),
    line("• Concepção de sistemas, produtos digitais e soluções de IA.", 0.17),
    line("Diretor de Operações Externo | Transformação Operacional Abr/25 - Mar/26", 0.24, 0.08, 0.8, "strong"),
    line("Bencato Engenharia e Empreendimentos", 0.265, 0.08, 0.5, "strong"),
    line("• Redesenho da operação e gestão de obras.", 0.29),
  ];
  const page: ExtractedPage = {
    pageNumber: 2,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 300,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  };

  const result = buildAdaptiveExtraction([page]);
  assert.equal(result.draft.experiences[0]?.role, "Fundador & Diretor Executivo");
  assert.equal(result.draft.experiences[0]?.organization, "HRT Solutions");
  assert.equal(result.draft.experiences[0]?.period, "Jan/25 - Atual");
  assert.equal(result.draft.experiences[1]?.organization, "Bencato Engenharia e Empreendimentos");
  assert.equal(result.pattern.experienceHeader, "role-period-company-next-line");
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "experiences.0.organization" && item.y === 0.145));
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "experiences.0.period" && item.text === "Jan/25 - Atual"));
});

test("adaptive suggestions never copy the corrected value into sibling records", () => {
  const extracted: StructuredDraft = {
    summary: null,
    experiences: [
      { role: "Diretor", organization: "Transformação Jan/25 - Atual", period: null, evidenceText: "", page: 1 },
      { role: "Gerente", organization: "Acme Ltda Fev/21 - Dez/24", period: null, evidenceText: "", page: 1 },
    ],
    education: [], certifications: [], languages: [], competencies: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0]!.period = "Jan/25 - Atual";
  const suggestions = proposeSiblingFieldCorrections({ draft: reviewed, extracted, sourceIndex: 0, field: "period" });
  assert.equal(suggestions[0]?.fieldPath, "experiences.1.period");
  assert.equal(suggestions[0]?.proposedValue, "Fev/21 - Dez/24");
  assert.notEqual(suggestions[0]?.proposedValue, reviewed.experiences[0]!.period);
});

test("text-only and OCR fallback never invent spatial coordinates", () => {
  const page: ExtractedPage = {
    pageNumber: 1,
    text: "Experiência profissional\nGerente de Operações Jan/20 - Atual\nAcme Ltda",
    origin: "ocr",
    usefulCharacterCount: 70,
    method: "tesseract.js",
    methodVersion: "fixture-ocr-v1",
  };
  const result = buildAdaptiveExtraction([page]);
  assert.ok(result.fieldEvidence.length > 0);
  assert.ok(result.fieldEvidence.every((item) => item.x === null && item.y === null && item.width === null && item.height === null));
});

test("adaptive persistence and reviewer evidence retirement remain tenant-scoped and auditable", async () => {
  const migration = await readFile("supabase/migrations/20260828055309_adaptive_resume_extraction.sql", "utf8");
  const panel = await readFile("web/src/components/review/StructuredReviewPanel.tsx", "utf8");
  const page = await readFile("web/src/pages/ProfileReviewPage.tsx", "utf8");

  assert.match(migration, /add column layout_blocks jsonb/i);
  assert.match(migration, /create table public\.extraction_learning_cases/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(migration, /link\.link_kind = 'original'.*cannot be retired/is);
  assert.match(migration, /review_evidence_removed/i);
  assert.match(panel, /Excluir evidência do revisor/i);
  assert.match(page, /preferredKind.*original.*reviewer/s);
  assert.match(page, /proposeSiblingFieldCorrections/);
});
