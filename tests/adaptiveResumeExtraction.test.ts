import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ADAPTIVE_REVIEW_METHOD_VERSION,
  buildAdaptiveExtraction,
  proposeSiblingBlockCorrections,
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

test("first extraction keeps a company tenure with subordinate roles as one semantic block", () => {
  const layoutLines = [
    line("Experiência profissional", 0.08, 0.08, 0.45, "strong"),
    line("Trajetória em Customer Success, Projetos, Produto e Liderança de Tecnologia Nov/18 - Jan/25", 0.12, 0.08, 0.82, "strong"),
    line("Scaffold Education", 0.145, 0.08, 0.3, "strong"),
    line("Progressão interna de projetos para coordenação de TI.", 0.17),
    line("Coordenador de TI | PM | Desenvolvimento, Produto e Governança | Out/20 - Jan/25", 0.195, 0.08, 0.82, "strong"),
    line("• Liderança de estrutura multidisciplinar.", 0.22),
    line("Customer Success Project Executive | Nov/18 - Set/20", 0.245, 0.08, 0.7, "strong"),
    line("• Estruturação da operação de Customer Success.", 0.27),
    line("Analista de Sistemas Sênior Nov/12 - Abr/18", 0.32, 0.08, 0.6, "strong"),
    line("Servimed Comercial Ltda.", 0.345, 0.08, 0.35, "strong"),
    line("• Integração entre logística e sistemas.", 0.37),
  ];
  const result = buildAdaptiveExtraction([{
    pageNumber: 2,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 600,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  }]);
  assert.equal(result.draft.experiences.length, 2);
  assert.equal(result.draft.experiences[0]?.organization, "Scaffold Education");
  assert.match(result.draft.experiences[0]?.description ?? "", /Coordenador de TI/);
  assert.match(result.draft.experiences[0]?.description ?? "", /Customer Success Project Executive/);
  assert.equal(result.draft.experiences[1]?.organization, "Servimed Comercial Ltda.");
});

test("an approved organization pattern can expand first extraction without becoming an executable template", () => {
  const layoutLines = [
    line("Experiência profissional", 0.08, 0.08, 0.45, "strong"),
    line("Jornada de transformação Jan/20 - Atual", 0.12, 0.08, 0.65, "regular"),
    line("Acme Ltda.", 0.145, 0.08, 0.25, "regular"),
    line("• Estruturação da operação.", 0.17),
  ];
  const page: ExtractedPage = {
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 180,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  };
  assert.equal(buildAdaptiveExtraction([page]).draft.experiences.length, 0);
  const learned = buildAdaptiveExtraction([page], [{
    patternKey: "experience:block-v2:company-next-line:period-header:description-following",
    confirmationCount: 1,
    methodVersion: ADAPTIVE_REVIEW_METHOD_VERSION,
  }]);
  assert.equal(learned.draft.experiences[0]?.organization, "Acme Ltda.");
  assert.deepEqual(learned.pattern.learnedSignalsUsed, ["experience:block-v2:company-next-line:period-header:description-following"]);
});

test("adaptive suggestions never copy the corrected value into sibling records", () => {
  const extracted: StructuredDraft = {
    summary: null,
    experiences: [
      { role: "Diretor", organization: "Transformação Jan/25 - Atual", period: null, evidenceText: "", page: 1 },
      { role: "Gerente", organization: "Acme Ltda Fev/21 - Dez/24", period: null, evidenceText: "", page: 1 },
    ],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0]!.period = "Jan/25 - Atual";
  const suggestions = proposeSiblingFieldCorrections({ draft: reviewed, extracted, sourceIndex: 0, field: "period" });
  assert.equal(suggestions[0]?.fieldPath, "experiences.1.period");
  assert.equal(suggestions[0]?.proposedValue, "Fev/21 - Dez/24");
  assert.notEqual(suggestions[0]?.proposedValue, reviewed.experiences[0]!.period);
});

test("a correction relearns complete sibling blocks from the original document and recovers a previously split period", () => {
  const sourceLines = [
    "Experiência profissional",
    "Fundador & Diretor Executivo | Transformação, Tecnologia e Produtos Digitais Jan/25 - Atual",
    "HRT Solutions",
    "Atuação executiva em transformação operacional.",
    "• Condução de diagnósticos organizacionais.",
    "Diretor de Operações Externo | Transformação Operacional Abr/25 - Mar/26",
    "Bencato Engenharia e Empreendimentos",
    "Atuação executiva externa na reorganização da gestão.",
    "• Redesenho da lógica de planejamento das obras.",
    "Analista de Sistemas e Inteligência de Negócios Sênior Nov/12 - Abr/18",
    "Servimed Comercial Ltda.",
    "Atuação transversal em operação logística.",
    "• Integração entre logística e sistemas.",
    "Desenvolvedor de Software - NM Sistemas Ltda. | Jun/08 - Nov/12 | Desenvolvimento de software e bancos de dados.",
    "Competências-chave",
  ];
  const page: ExtractedPage = {
    pageNumber: 2,
    text: sourceLines.join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 700,
    method: "pdfjs",
    methodVersion: "legacy-text-v1",
  };
  const extracted: StructuredDraft = {
    summary: null,
    experiences: [
      { role: "Fundador & Diretor Executivo", organization: "Transformação, Tecnologia e Produtos Digitais Jan/25 - Atual", period: null, evidenceText: sourceLines[1]!, page: 2 },
      { role: "Diretor de Operações Externo", organization: "Transformação Operacional Abr/25 - Mar/26", period: null, evidenceText: sourceLines[5]!, page: 2 },
      { role: "Analista de Sistemas e Inteligência de Negócios Sênior Nov/12", organization: "Abr/18", period: null, evidenceText: sourceLines[9]!, page: 2 },
      { role: "Desenvolvedor de Software", organization: "NM Sistemas Ltda. | Jun/08 - Nov/12 | Desenvolvimento de software e bancos de dados.", period: null, evidenceText: sourceLines[13]!, page: 2 },
    ],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0] = {
    ...reviewed.experiences[0]!,
    organization: "HRT Solutions",
    period: "Jan/25 - Atual",
    description: "Atuação executiva em transformação operacional.\nCondução de diagnósticos organizacionais.",
  };

  const report = proposeSiblingBlockCorrections({ pages: [page], draft: reviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(report.methodVersion, ADAPTIVE_REVIEW_METHOD_VERSION);
  assert.equal(report.suggestions.length, 3);
  assert.equal(report.unresolved.length, 0);
  assert.equal(report.suggestions[0]?.fields.find((field) => field.field === "organization")?.proposedValue, "Bencato Engenharia e Empreendimentos");
  assert.equal(report.suggestions[1]?.fields.find((field) => field.field === "organization")?.proposedValue, "Servimed Comercial Ltda.");
  assert.equal(report.suggestions[1]?.fields.find((field) => field.field === "period")?.proposedValue, "Nov/12 - Abr/18");
  assert.equal(report.suggestions[2]?.fields.find((field) => field.field === "organization")?.proposedValue, "NM Sistemas Ltda.");
  assert.ok(report.suggestions.every((suggestion) => suggestion.fields.some((field) => field.field === "description")));
  assert.ok(report.suggestions.flatMap((suggestion) => suggestion.fields).every((field) => field.evidenceText.length > 0));

  const humanReviewed = structuredClone(reviewed);
  humanReviewed.experiences[1]!.organization = "Bencato Engenharia confirmada manualmente";
  const preserved = proposeSiblingBlockCorrections({ pages: [page], draft: humanReviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(preserved.suggestions[0]?.fields.some((field) => field.field === "organization"), false);
});

test("document learning reports an unresolved sibling instead of inventing a block", () => {
  const page: ExtractedPage = {
    pageNumber: 1,
    text: "Experiência profissional\nDiretor Jan/25 - Atual\nHRT Solutions",
    origin: "ocr",
    usefulCharacterCount: 70,
    method: "tesseract.js",
    methodVersion: "fixture-ocr-v1",
  };
  const extracted: StructuredDraft = {
    summary: null,
    experiences: [
      { role: "Diretor", organization: "Jan/25 - Atual", period: null, evidenceText: "Diretor Jan/25 - Atual", page: 1 },
      { role: "Gerente", organization: "Não identificada", period: null, evidenceText: "linha inexistente", page: 1 },
    ],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0]!.organization = "HRT Solutions";
  const report = proposeSiblingBlockCorrections({ pages: [page], draft: reviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(report.suggestions.length, 0);
  assert.equal(report.unresolved[0]?.reasonCode, "source-block-not-found");
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
  assert.match(page, /proposeSiblingBlockCorrections/);
});

test("adaptive v2 persistence is tenant-scoped, metadata-only and promotes patterns only after review approval", async () => {
  const migration = await readFile("supabase/migrations/20260828111135_adaptive_review_learning_v2.sql", "utf8");
  const indexMigration = await readFile("supabase/migrations/20260828115300_adaptive_review_learning_v2_fk_indexes.sql", "utf8");
  const page = await readFile("web/src/pages/ProfileReviewPage.tsx", "utf8");
  assert.match(migration, /create table public\.profile_review_adaptation_events/i);
  assert.match(migration, /create table public\.organization_extraction_patterns/i);
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(migration, /suggestion - array\['fieldPath', 'pageNumber', 'evidenceMethod', 'rationaleCode'\]/i);
  assert.match(migration, /old\.state = 'draft' and new\.state = 'approved'/i);
  assert.match(migration, /on conflict \(organization_id, pattern_key, method_version\)/i);
  assert.doesNotMatch(migration, /proposedValue|currentValue|evidenceText/);
  assert.match(indexMigration, /profile_review_adaptation_events \(organization_id, review_revision_id\)/i);
  assert.match(indexMigration, /profile_review_adaptation_events \(actor_auth_user_id\)/i);
  assert.match(page, /applyAdaptiveSuggestions/);
  assert.match(page, /proposeSiblingBlockCorrections/);
});
