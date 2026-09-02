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
import { buildOcrLayoutLines } from "../web/src/domain/personIngestion.js";

function line(text: string, y: number, x = 0.08, width = 0.75, emphasis: LayoutTextLine["emphasis"] = "regular"): LayoutTextLine {
  return { text, x, y, width, height: 0.018, fontSize: 11, emphasis };
}

function emptyStructuredSummary(): Pick<StructuredDraft, "identity" | "contact" | "professionalTitle" | "areasOfExpertise" | "professionalObjective" | "summary" | "keyResults"> {
  return {
    identity: { fullName: null },
    contact: { city: null, state: null, phone: null, email: null, linkedin: null },
    professionalTitle: null,
    areasOfExpertise: [],
    professionalObjective: null,
    summary: null,
    keyResults: [],
  };
}

function legacyExperience(index: number, input: Omit<StructuredDraft["experiences"][number], "id" | "source">): StructuredDraft["experiences"][number] {
  return { id: `experience_legacy${String(index).padStart(8, "0")}`, source: "extracted", ...input };
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
  const firstId = result.draft.experiences[0]!.id;
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === `experiences.${firstId}.organization` && item.y === 0.145));
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === `experiences.${firstId}.period` && item.text === "Jan/25 - Atual"));
});

test("structured summary extracts only explicit identity, contact, positioning, summary and item-level results", () => {
  const layoutLines = [
    line("Bruno Harita Santos", 0.04, 0.08, 0.5, "strong"),
    line("COO | Operações | Processos | Tecnologia", 0.07, 0.08, 0.7, "strong"),
    line("Bauru, SP | bruno@example.com | +55 14 99999-0000 | linkedin.com/in/bruno-harita", 0.1, 0.08, 0.82),
    line("Objetivo profissional | Liderar operações complexas com previsibilidade.", 0.14, 0.08, 0.75, "strong"),
    line("Resumo profissional", 0.21, 0.08, 0.4, "strong"),
    line("Executivo com experiência em transformação operacional.", 0.24),
    line("Principais resultados", 0.28, 0.08, 0.4, "strong"),
    line("• Redução de 90% no tempo de processamento", 0.31),
    line("com automação e IA aplicada.", 0.33),
    line("• Melhoria de 65% na previsibilidade de prazos.", 0.36),
    line("Problemas empresariais que está preparado para assumir", 0.4, 0.08, 0.65, "strong"),
    line("• Este conteúdo não pertence aos principais resultados.", 0.43),
    line("Experiência profissional", 0.47, 0.08, 0.45, "strong"),
  ];
  const result = buildAdaptiveExtraction([{
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 420,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  }]);

  assert.equal(result.draft.identity.fullName, "Bruno Harita Santos");
  assert.deepEqual(result.draft.contact, {
    city: "Bauru", state: "SP", phone: "+5514999990000", email: "bruno@example.com",
    linkedin: "https://linkedin.com/in/bruno-harita",
  });
  assert.equal(result.draft.professionalTitle, "COO");
  assert.deepEqual(result.draft.areasOfExpertise, ["Operações", "Processos", "Tecnologia"]);
  assert.equal(result.draft.professionalObjective, "Liderar operações complexas com previsibilidade.");
  assert.equal(result.draft.summary, "Executivo com experiência em transformação operacional.");
  assert.deepEqual(result.draft.keyResults.map((item) => item.value), [
    "Redução de 90% no tempo de processamento com automação e IA aplicada.",
    "Melhoria de 65% na previsibilidade de prazos.",
  ]);
  assert.ok(result.draft.keyResults.every((item) => /^result_[a-z0-9]{8,64}$/.test(item.id)));
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "identity.fullName"));
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "contact.linkedin"));
  assert.equal(result.fieldEvidence.filter((item) => item.fieldPath.startsWith("keyResults.")).length, 2);
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
    ...emptyStructuredSummary(),
    experiences: [
      legacyExperience(0, { role: "Diretor", organization: "Transformação Jan/25 - Atual", period: null, evidenceText: "", page: 1 }),
      legacyExperience(1, { role: "Gerente", organization: "Acme Ltda Fev/21 - Dez/24", period: null, evidenceText: "", page: 1 }),
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
    ...emptyStructuredSummary(),
    experiences: [
      legacyExperience(0, { role: "Fundador & Diretor Executivo", organization: "Transformação, Tecnologia e Produtos Digitais Jan/25 - Atual", period: null, evidenceText: sourceLines[1]!, page: 2 }),
      legacyExperience(1, { role: "Diretor de Operações Externo", organization: "Transformação Operacional Abr/25 - Mar/26", period: null, evidenceText: sourceLines[5]!, page: 2 }),
      legacyExperience(2, { role: "Analista de Sistemas e Inteligência de Negócios Sênior Nov/12", organization: "Abr/18", period: null, evidenceText: sourceLines[9]!, page: 2 }),
      legacyExperience(3, { role: "Desenvolvedor de Software", organization: "NM Sistemas Ltda. | Jun/08 - Nov/12 | Desenvolvimento de software e bancos de dados.", period: null, evidenceText: sourceLines[13]!, page: 2 }),
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
    ...emptyStructuredSummary(),
    experiences: [
      legacyExperience(0, { role: "Diretor", organization: "Jan/25 - Atual", period: null, evidenceText: "Diretor Jan/25 - Atual", page: 1 }),
      legacyExperience(1, { role: "Gerente", organization: "Não identificada", period: null, evidenceText: "linha inexistente", page: 1 }),
    ],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0]!.organization = "HRT Solutions";
  const report = proposeSiblingBlockCorrections({ pages: [page], draft: reviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(report.suggestions.length, 0);
  assert.equal(report.unresolved[0]?.reasonCode, "source-incomplete");
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

test("a complete human anchor discovers missing comma-header sibling experiences without publishing them", () => {
  const layoutLines = [
    line("EXPERIÊNCIA PROFISSIONAL", 0.08, 0.08, 0.5, "strong"),
    line("TI Mgmt - PM/PO, Scaffold Education Abr 2018 - Jan 2025", 0.13, 0.08, 0.82, "strong"),
    line("• Atuação na interface entre negócio, tecnologia e operação.", 0.16, 0.09, 0.76),
    line("• Liderança de squads multidisciplinares.", 0.185, 0.09, 0.7),
    line("Fundador & Diretor Executivo, HRT Solutions Jan 2025 - Atual", 0.25, 0.08, 0.82, "strong"),
    line("• Condução de projetos de estruturação operacional.", 0.28, 0.09, 0.75),
    line("• Tradução de necessidades de negócio em soluções práticas.", 0.305, 0.09, 0.78),
    line("Diretor de Operações, Bencato Engenharia Jan 2025 - Abr 2026", 0.37, 0.08, 0.82, "strong"),
    line("• Condução da estruturação operacional da empresa.", 0.40, 0.09, 0.75),
    line("• Implantação de indicadores e práticas de monitoramento.", 0.425, 0.09, 0.78),
    line("FORMAÇÃO", 0.5, 0.08, 0.3, "strong"),
  ];
  const page: ExtractedPage = {
    pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf",
    usefulCharacterCount: 650, method: "pdfjs", methodVersion: "fixture-layout-v2", layoutLines,
  };
  const anchor = legacyExperience(0, {
    role: "TI Mgmt - PM/PO", organization: "Scaffold Education", period: "Abr 2018 - Jan 2025",
    description: "Atuação na interface entre negócio, tecnologia e operação.\nLiderança de squads multidisciplinares.",
    evidenceText: layoutLines[1]!.text, page: 1,
  });
  const draft: StructuredDraft = {
    ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [],
    customSections: [], uncertainties: [], notIdentified: [],
  };
  const extracted: StructuredDraft = { ...draft, experiences: [] };
  const report = proposeSiblingBlockCorrections({ pages: [page], draft, extracted, sourceIndex: 0, sourceField: "role" });

  assert.equal(report.methodVersion, "prisma-document-learning-v3");
  assert.equal(report.algorithmVersion, "adaptive-sibling-block-v1");
  assert.equal(report.signatureVersion, "experience-sibling-signature-v1");
  assert.equal(report.suggestions.length, 2);
  assert.ok(report.suggestions.every((item) => item.kind === "new" && item.classification === "strong"));
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["HRT Solutions", "Bencato Engenharia"]);
  assert.ok(report.suggestions.flatMap((item) => item.fields).every((field) => field.evidences.length > 0));
  assert.equal(draft.experiences.length, 1, "discovery must not mutate or publish the reviewed draft");
});

test("new sibling discovery rejects text-only sources and a visually separate column", () => {
  const textPage: ExtractedPage = {
    pageNumber: 1,
    text: "Experiência profissional\nDiretor, HRT Solutions Jan 2025 - Atual\n• Estruturação da operação.\nGerente, Acme Ltda Jan 2020 - Dez 2024\n• Gestão da operação.",
    origin: "ocr", usefulCharacterCount: 180, method: "tesseract.js", methodVersion: "legacy-flat-v1",
  };
  const anchor = legacyExperience(0, { role: "Diretor", organization: "HRT Solutions", period: "Jan 2025 - Atual", description: "Estruturação da operação.", evidenceText: "Diretor, HRT Solutions Jan 2025 - Atual", page: 1 });
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const flatReport = proposeSiblingBlockCorrections({ pages: [textPage], draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "role" });
  assert.equal(flatReport.suggestions.length, 0);
  assert.ok(flatReport.unresolved.some((item) => item.reasonCode === "ambiguous-candidate"));

  const positioned = [
    line("Experiência profissional", 0.05, 0.08, 0.4, "strong"),
    line("Diretor, HRT Solutions Jan 2025 - Atual", 0.1, 0.08, 0.38, "strong"),
    line("• Estruturação da operação.", 0.13, 0.09, 0.35),
    line("Gerente, Acme Ltda Jan 2020 - Dez 2024", 0.1, 0.58, 0.35, "strong"),
    line("• Gestão da operação.", 0.13, 0.59, 0.32),
  ];
  const columnReport = proposeSiblingBlockCorrections({
    pages: [{ ...textPage, origin: "native_pdf", layoutLines: positioned, text: positioned.map((item) => item.text).join("\n") }],
    draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "role",
  });
  assert.equal(columnReport.suggestions.length, 0);
  assert.ok(columnReport.unresolved.some((item) => item.reasonCode === "column-mismatch"));
});

test("OCR blocks are normalized into positioned lines for deterministic sibling analysis", () => {
  const lines = buildOcrLayoutLines([{ paragraphs: [{ lines: [{ text: "Diretor, HRT Solutions", bbox: { x0: 100, y0: 200, x1: 700, y1: 240 } }] }] }], 1000, 2000);
  assert.deepEqual(lines[0], {
    text: "Diretor, HRT Solutions", x: 0.1, y: 0.1, width: 0.6, height: 0.02, fontSize: 40, emphasis: "regular",
  });
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

test("adaptive v3 persists structural audit metadata and field evidence without leaking selected text into learning events", async () => {
  const migration = await readFile("supabase/migrations/20260902003617_m5_sibling_block_learning.sql", "utf8");
  const service = await readFile("web/src/infrastructure/supabase/personIngestionService.ts", "utf8");
  const page = await readFile("web/src/pages/ProfileReviewPage.tsx", "utf8");
  assert.match(migration, /create or replace function public\.apply_profile_review_adaptive_suggestions_v3/i);
  assert.match(migration, /private\.require_document_reviewer\(p_organization_id\)/i);
  assert.match(migration, /adaptive-sibling-block-v1/);
  assert.match(migration, /experience-sibling-signature-v1/);
  assert.match(migration, /insert into public\.spatial_evidence_regions/i);
  assert.match(migration, /insert into public\.profile_review_evidence_links/i);
  assert.match(migration, /'complementary'/i);
  assert.match(migration, /safe_suggestions/);
  const adaptationInsert = migration.match(/insert into public\.profile_review_adaptation_events[\s\S]*?returning id into new_event_id;/i)?.[0] ?? "";
  assert.doesNotMatch(adaptationInsert, /selectedText|raw_selected_text/);
  assert.match(migration, /record_profile_review_sibling_scan/);
  assert.match(migration, /sibling_blocks_detected/);
  assert.match(migration, /sibling_suggestions_discarded/);
  assert.match(service, /apply_profile_review_adaptive_suggestions_v3/);
  assert.match(service, /recordSiblingScan/);
  assert.match(page, /hasSpatialAnchorEvidence/);
  assert.match(page, /dismissAdaptiveSuggestions/);
});

test("adaptive v3 hardening rejects metadata-only and mismatched sibling suggestions at the RPC boundary", async () => {
  const migration = await readFile("supabase/migrations/20260902011222_m5_sibling_block_learning_hardening.sql", "utf8");
  assert.match(migration, /private\.is_valid_sibling_signature_summary/);
  assert.match(migration, /private\.is_valid_sibling_candidate_summary/);
  assert.match(migration, /private\.is_valid_sibling_suggestion/);
  assert.match(migration, /split_part\(p_suggestion ->> 'fieldPath', '\.', 2\) <> p_suggestion ->> 'candidateId'/i);
  assert.match(migration, /jsonb_array_length\(p_suggestion -> 'evidenceRegions'\) not between 1 and 8/i);
  assert.doesNotMatch(migration, /'text-line-v1'/);
  assert.match(migration, /record_profile_review_sibling_scan_v3_impl/);
  assert.match(migration, /apply_profile_review_adaptive_suggestions_v3_impl/);
  assert.match(migration, /from public, anon, authenticated/i);
});

test("structured summary migration keeps contact private and rejects PII promotion", async () => {
  const migration = await readFile("supabase/migrations/20260830160132_structured_resume_summary.sql", "utf8");
  assert.match(migration, /private\.is_valid_structured_resume_summary/);
  assert.match(migration, /not \(profile_data \?\| array\['identity', 'contact'\]/);
  assert.match(migration, /profile_payload := review\.reviewed_data - 'identity' - 'contact'/);
  assert.match(migration, /insert into public\.person_private_data/);
  assert.match(migration, /on conflict \(organization_id, person_id\) do update/);
  assert.match(migration, /coalesce\(excluded\.email, public\.person_private_data\.email\)/);
  assert.match(migration, /private\.require_document_reviewer\(p_organization_id\)/);
  assert.doesNotMatch(migration, /grant select on public\.person_private_data to authenticated/);
  assert.match(migration, /keyResults\\\.result_/);
});
