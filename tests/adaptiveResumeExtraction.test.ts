import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ADAPTIVE_REVIEW_METHOD_VERSION,
  buildAdaptiveExtraction,
  isRecordableSiblingScan,
  proposeSiblingBlockCorrections,
  proposeSiblingCertificationCorrections,
  proposeSiblingEducationCorrections,
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

test("professional summary accepts explicit aliases and stops before the next curriculum section", () => {
  const layoutLines = [
    line("Bruno Harita Santos", 0.04, 0.08, 0.5, "strong"),
    line("Síntese profissional", 0.1, 0.08, 0.35, "strong"),
    line("Profissional que conecta negócio, processos e tecnologia.", 0.13),
    line("Expertise técnica", 0.18, 0.08, 0.35, "strong"),
    line("SAP | Scrum | SQL", 0.21),
    line("Experiência profissional", 0.27, 0.08, 0.4, "strong"),
  ];
  const result = buildAdaptiveExtraction([{
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 180,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  }]);

  assert.equal(result.draft.summary, "Profissional que conecta negócio, processos e tecnologia.");
  assert.doesNotMatch(result.draft.summary ?? "", /SAP|Scrum|SQL|Expertise/i);
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "summary" && item.text === result.draft.summary));
});

test("professional summary recovers content merged into a strong PDF heading", () => {
  const layoutLines = [
    line("Bruno Harita Santos", 0.04, 0.08, 0.5, "strong"),
    line("Resumo profissional Profissional com vinte anos de atuação em tecnologia e operações.", 0.1, 0.08, 0.85, "strong"),
    line("Transforma contextos complexos em execução organizada.", 0.13),
    line("Formação acadêmica", 0.2, 0.08, 0.35, "strong"),
  ];
  const result = buildAdaptiveExtraction([{
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 170,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  }]);

  assert.equal(result.draft.summary, "Profissional com vinte anos de atuação em tecnologia e operações.\nTransforma contextos complexos em execução organizada.");
  assert.ok(result.fieldEvidence.some((item) => item.fieldPath === "summary"));
});

test("professional summary remains absent without an explicit section", () => {
  const layoutLines = [
    line("Bruno Harita Santos", 0.04, 0.08, 0.5, "strong"),
    line("Profissional com ampla atuação em tecnologia e operações.", 0.1),
    line("Experiência profissional", 0.17, 0.08, 0.4, "strong"),
  ];
  const result = buildAdaptiveExtraction([{
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "native_pdf",
    usefulCharacterCount: 120,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines,
  }]);

  assert.equal(result.draft.summary, null);
  assert.ok(result.draft.notIdentified.includes("resumo profissional"));
  assert.equal(result.fieldEvidence.some((item) => item.fieldPath === "summary"), false);
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

  const legacyWithoutAnchor = structuredClone(reviewed);
  legacyWithoutAnchor.experiences[0] = { ...legacyWithoutAnchor.experiences[0]!, page: null, evidenceText: "" };
  const recoveredFromSpatialEvidence = proposeSiblingBlockCorrections({
    pages: [page],
    draft: legacyWithoutAnchor,
    extracted,
    sourceIndex: 0,
    sourceField: "organization",
    sourceRegion: { pageNumber: 2, x: 0.1, y: 0.005, width: 0.8, height: 0.012 },
  });
  assert.equal(recoveredFromSpatialEvidence.suggestions.length, 3);

  const humanReviewed = structuredClone(reviewed);
  humanReviewed.experiences[1]!.organization = "Bencato Engenharia confirmada manualmente";
  const preserved = proposeSiblingBlockCorrections({ pages: [page], draft: humanReviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(preserved.suggestions[0]?.fields.some((field) => field.field === "organization"), false);

  const alreadyComplete = structuredClone(reviewed);
  for (const suggestion of report.suggestions) {
    const experience = alreadyComplete.experiences[suggestion.experienceIndex]!;
    for (const field of suggestion.fields) {
      if (field.field === "role") experience.role = field.proposedValue;
      if (field.field === "organization") experience.organization = field.proposedValue;
      if (field.field === "period") experience.period = field.proposedValue;
      if (field.field === "description") experience.description = field.proposedValue;
    }
  }
  const noChange = proposeSiblingBlockCorrections({ pages: [page], draft: alreadyComplete, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(noChange.suggestions.length, 0);
  assert.ok(noChange.unresolved.some((item) => item.reasonCode === "no-safe-change"));
  assert.deepEqual(noChange.candidateSummary, { detected: 0, strong: 0, possible: 0, rejected: 0 });
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
  assert.equal(isRecordableSiblingScan(report), false);
});

test("an unlocatable corrected block remains a non-blocking and non-recordable diagnostic", () => {
  const page: ExtractedPage = {
    pageNumber: 2,
    text: "EXPERIÊNCIA PROFISSIONAL\nConteúdo sem o cabeçalho corrigido",
    origin: "native_pdf",
    usefulCharacterCount: 58,
    method: "pdfjs",
    methodVersion: "fixture-layout-v2",
    layoutLines: [line("EXPERIÊNCIA PROFISSIONAL", 0.08, 0.08, 0.45, "strong"), line("Conteúdo sem o cabeçalho corrigido", 0.12)],
  };
  const extracted: StructuredDraft = {
    ...emptyStructuredSummary(),
    experiences: [legacyExperience(0, { role: "Analista", organization: "Organização original", period: "2012 - 2018", description: "Atuação profissional.", evidenceText: "Cabeçalho original", page: 2 })],
    education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
  };
  const reviewed = structuredClone(extracted);
  reviewed.experiences[0]!.organization = "Servimed Comercial";
  const report = proposeSiblingBlockCorrections({ pages: [page], draft: reviewed, extracted, sourceIndex: 0, sourceField: "organization" });
  assert.equal(report.suggestions.length, 0);
  assert.equal(report.unresolved[0]?.reasonCode, "source-block-not-found");
  assert.equal(isRecordableSiblingScan(report), false);
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

  assert.equal(report.methodVersion, "prisma-document-learning-v4");
  assert.equal(report.algorithmVersion, "generic-record-pattern-v1");
  assert.equal(report.signatureVersion, "relative-record-signature-v1");
  assert.equal(isRecordableSiblingScan(report), true);
  assert.equal(report.suggestions.length, 2);
  assert.ok(report.suggestions.every((item) => item.kind === "new" && item.classification === "strong"));
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["HRT Solutions", "Bencato Engenharia"]);
  assert.ok(report.suggestions.flatMap((item) => item.fields).every((field) => field.evidences.length > 0));
  assert.equal(draft.experiences.length, 1, "discovery must not mutate or publish the reviewed draft");
});

test("a human-confirmed same-line pattern recognizes plausible organizations outside the initial marker catalog", () => {
  const layoutLines = [
    line("EXPERIÊNCIA PROFISSIONAL", 0.08, 0.08, 0.5, "strong"),
    line("Gerente de Operacoes, Prisma Labs Jan 2023 - Atual", 0.13, 0.08, 0.82, "strong"),
    line("• Estruturou rotinas operacionais e indicadores.", 0.16, 0.09, 0.76),
    line("Coordenadora de Projetos, Prisma Digital Fev 2020 - Dez 2022", 0.25, 0.08, 0.82, "strong"),
    line("• Planejou cronogramas, riscos e entregas.", 0.28, 0.09, 0.75),
    line("Analista de Processos, Prisma Consultoria Mar 2017 - Jan 2020", 0.37, 0.08, 0.82, "strong"),
    line("• Mapeou processos e oportunidades de automacao.", 0.40, 0.09, 0.78),
    line("FORMAÇÃO", 0.5, 0.08, 0.3, "strong"),
  ];
  const page: ExtractedPage = {
    pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf",
    usefulCharacterCount: 520, method: "pdfjs", methodVersion: "fixture-layout-v2", layoutLines,
  };
  assert.equal(buildAdaptiveExtraction([page]).draft.experiences.length, 0, "initial extraction must remain conservative");
  const anchor = legacyExperience(0, {
    role: "Gerente de Operacoes", organization: "Prisma Labs", period: "Jan 2023 - Atual",
    description: "Estruturou rotinas operacionais e indicadores.", evidenceText: layoutLines[1]!.text, page: 1,
  });
  const draft: StructuredDraft = {
    ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [],
    customSections: [], uncertainties: [], notIdentified: [],
  };
  const report = proposeSiblingBlockCorrections({ pages: [page], draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "role" });
  assert.equal(report.suggestions.length, 2);
  assert.ok(report.suggestions.every((item) => item.classification === "strong"));
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["Prisma Digital", "Prisma Consultoria"]);

  const humanAnchor = { ...anchor, evidenceText: "", page: null };
  const humanDraft = { ...draft, experiences: [humanAnchor] };
  const spatialReport = proposeSiblingBlockCorrections({
    pages: [page], draft: humanDraft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "role",
    sourceRegion: { pageNumber: 1, x: 0.34, y: 0.12, width: 0.16, height: 0.025 },
  });
  assert.equal(spatialReport.suggestions.length, 2, "a human-created anchor must be locatable from its persisted spatial evidence");
  assert.ok(spatialReport.suggestions.every((item) => item.classification === "strong"));
});

test("a selection inside the experience body resolves the complete source block and finds its siblings", () => {
  const layoutLines = [
    line("EXPERIÊNCIA", 0.08, 0.08, 0.3, "strong"),
    line("Desenvolvedora de Software, Movile 06/2021 - 09/2023", 0.14, 0.08, 0.82, "strong"),
    line("• Desenvolveu funcionalidades para um sistema de e-commerce.", 0.18, 0.10, 0.72),
    line("Engenheira de Software Front-End, Vtex 01/2019 - 05/2021", 0.30, 0.58, 0.38, "strong"),
    line("• Desenvolveu componentes em React e melhorou a performance.", 0.34, 0.60, 0.34),
    line("Programadora Web, Catho 01/2018 - 12/2018", 0.46, 0.08, 0.82, "strong"),
    line("• Codificou melhorias em uma plataforma web.", 0.50, 0.10, 0.72),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf", usefulCharacterCount: 500, method: "pdfjs", methodVersion: "fixture-layout-v2", layoutLines };
  const anchor = legacyExperience(0, { role: "Desenvolvedora de Software", organization: "Movile", period: "06/2021 - 09/2023", description: "Desenvolveu funcionalidades para um sistema de e-commerce.", evidenceText: layoutLines[2]!.text, page: 1 });
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const report = proposeSiblingBlockCorrections({ pages: [page], draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "description", sourceRegion: { pageNumber: 1, x: 0.1, y: 0.18, width: 0.72, height: 0.02 } });
  assert.equal(report.suggestions.length, 2);
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["Vtex", "Catho"]);
  assert.ok(report.suggestions.some((item) => item.criteria.includes("relative-topology") && item.proposedExperience?.organization === "Vtex"));
});

test("Paddle-style parallel period and content columns preserve complete experience records", () => {
  const layoutLines = [
    line("EXPERIÊNCIA", 0.34, 0.09, 0.2, "strong"),
    line("06/2021-09/2023", 0.367, 0.09, 0.13),
    line("Desenvolvedora de Software", 0.369, 0.27, 0.35, "strong"),
    line("Movile", 0.385, 0.27, 0.15, "strong"),
    line("• Desenvolveu funcionalidades para e-commerce.", 0.405, 0.27, 0.56),
    { ...line("01/2019-05/2021", 0.512, 0.09, 0.13), blockId: "parallel-header-2", blockType: "paragraph_title" },
    { ...line("Ta", 0.513, 0.252, 0.02, "strong"), blockId: "parallel-header-2", blockType: "paragraph_title" },
    { ...line("Engenheira de Software Front-End", 0.514, 0.27, 0.42, "strong"), blockId: "parallel-header-2", blockType: "paragraph_title" },
    line("Vtex", 0.53, 0.27, 0.12, "strong"),
    line("• Desenvolveu componentes em React.", 0.55, 0.27, 0.5),
    line("01/2018-12/2018", 0.645, 0.09, 0.13),
    line("Programadora Web", 0.647, 0.27, 0.3, "strong"),
    line("Catho", 0.663, 0.27, 0.12, "strong"),
    line("• Codificou melhorias em uma plataforma web.", 0.683, 0.27, 0.52),
    line("EDUCAÇÃO", 0.77, 0.09, 0.2, "strong"),
    line("01/2020-01/2022", 0.80, 0.09, 0.13),
    line("Mestrado em Ciência da Computação", 0.80, 0.27, 0.4, "strong"),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "ocr", usefulCharacterCount: 520, method: "PP-StructureV3", methodVersion: "PP-StructureV3/PP-OCRv6", layoutLines };
  const extraction = buildAdaptiveExtraction([page]);
  assert.deepEqual(extraction.draft.experiences.map((item) => item.organization), ["Movile", "Vtex", "Catho"]);
  assert.deepEqual(extraction.draft.experiences.map((item) => item.role), ["Desenvolvedora de Software", "Engenheira de Software Front-End", "Programadora Web"]);
  assert.deepEqual(extraction.draft.experiences.map((item) => item.period), ["06/2021-09/2023", "01/2019-05/2021", "01/2018-12/2018"]);
  const periodEvidence = extraction.fieldEvidence.find((item) => item.fieldPath.endsWith(".period"));
  assert.equal(periodEvidence?.x, 0.09);
});

test("reviewer geometry learns repeated OCR blocks even when OCR corrupted separators and the corrected company", () => {
  const layoutLines = [
    line("EXPERIÊNCIA", 0.34, 0.142, 0.2, "strong"),
    line("06/2021-09/2023 ? Desenvolvedora de Software", 0.368, 0.142, 0.347),
    line("São Pao, Brasil Movite", 0.385, 0.142, 0.191),
    line("+ Desenvolveu funcionalidades para um sistema de e-commerce.", 0.397, 0.301, 0.53),
    line("+ Implementou uma arquitetura de microsserviços.", 0.416, 0.301, 0.51),
    line("01/2010 -05/2021 ? Engenheira de Software Front-End", 0.491, 0.142, 0.384),
    line("São Pato, Brasil Vtex", 0.508, 0.142, 0.177),
    line("+ Desenvolveu componentes em React.", 0.52, 0.298, 0.55),
    line("+ Implementou ferramentas de monitoramento.", 0.597, 0.298, 0.50),
    line("01/2018 12/2018 * Programadora Web", 0.614, 0.142, 0.275),
    line("São Paulo, Brasil Catho", 0.63, 0.142, 0.184),
    line("+ Codificou melhorias em uma plataforma web.", 0.642, 0.296, 0.56),
    line("+ Atuou na manutenção de front-end.", 0.681, 0.296, 0.53),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "ocr", usefulCharacterCount: 650, method: "tesseract.js", methodVersion: "tesseract-layout-v1", layoutLines };
  const anchor = legacyExperience(0, {
    role: "Desenvolvedora de Software", organization: "Movile", period: "06/2021 - 09/2023",
    description: "Desenvolveu funcionalidades e implementou uma arquitetura de microsserviços.", evidenceText: "", page: 1,
  });
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const report = proposeSiblingBlockCorrections({
    pages: [page], draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "organization",
    sourceRegion: { pageNumber: 1, x: 0.11, y: 0.35, width: 0.75, height: 0.13 },
  });
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["Vtex", "Catho"]);
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.role), ["Engenheira de Software Front-End", "Programadora Web"]);
  assert.equal(report.suggestions[1]?.proposedExperience?.period, "01/2018 12/2018");
});

test("organization-first grouped blocks are learned across columns without a date range", () => {
  let sequence = 0;
  const grouped = (text: string, y: number, x: number, blockId: string): LayoutTextLine => ({
    ...line(text, y, x, 0.4), blockId, blockType: "text", blockReadingOrder: sequence++,
  });
  const layoutLines = [
    { ...line("EXPERIENCIA PROFISSIONAL", 0.551, 0.37, 0.25, "strong"), blockId: "heading", blockType: "paragraph_title", blockReadingOrder: sequence++ },
    grouped("JAD ZOGHEIB & CIA LTDA", 0.58, 0.057, "left-1"),
    grouped("Cargo: Operador de empilhadeira, conferencia, logistica", 0.594, 0.057, "left-1"),
    grouped("e expedição", 0.609, 0.057, "left-1"),
    grouped("Periodo: 5 anos", 0.622, 0.057, "left-1"),
    grouped("T-GESTIONA", 0.648, 0.057, "left-2"),
    grouped("Cargo: Operador de empilhadeira e logistica", 0.69, 0.057, "left-2"),
    grouped("Periodo: 2021 (Temporario)", 0.703, 0.057, "left-2"),
    { ...line("INFORMAÇOES ADICIONAIS", 0.854, 0.065, 0.24, "strong"), blockId: "next-heading", blockType: "paragraph_title", blockReadingOrder: sequence++ },
    grouped("ORIGEM DO BRASIL LTDA", 0.594, 0.51, "right-1"),
    grouped("Cargo: Auxiliar de mecânico de campo de máquinas", 0.609, 0.51, "right-1"),
    grouped("agricolas II", 0.62, 0.51, "right-1"),
    grouped("Periodo: 14/02/2022 - 2 anos e 6 meses", 0.634, 0.51, "right-1"),
    grouped("DURATEX", 0.715, 0.51, "right-2"),
    grouped("Cargo: Limpador de vidros", 0.745, 0.51, "right-2"),
    grouped("Periodo: 21/06/2014 (1 ano e 6 meses)", 0.757, 0.51, "right-2"),
    grouped("BATERIAS TUDOR", 0.78, 0.51, "right-3"),
    grouped("Cargo: Auxiliar de produção", 0.795, 0.51, "right-3"),
    grouped("Atuação na linha de produção e apoio logístico", 0.81, 0.51, "right-3"),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf", usefulCharacterCount: 620, method: "pdfjs", methodVersion: "pdfjs-layout-v1", layoutLines };
  const initial = buildAdaptiveExtraction([page]);
  assert.deepEqual(initial.draft.experiences.map((item) => item.organization), ["JAD ZOGHEIB & CIA LTDA", "T-GESTIONA", "ORIGEM DO BRASIL LTDA", "DURATEX", "BATERIAS TUDOR"]);
  const anchor = { ...initial.draft.experiences[0]!, source: "human" as const, description: "Operador de empilhadeira, conferencia, logistica e expedição" };
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [anchor], education: [], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const report = proposeSiblingBlockCorrections({ pages: [page], draft, extracted: { ...draft, experiences: [] }, sourceIndex: 0, sourceField: "organization", sourceRegion: { pageNumber: 1, x: 0.05, y: 0.57, width: 0.43, height: 0.07 } });
  assert.deepEqual(report.suggestions.map((item) => item.proposedExperience?.organization), ["T-GESTIONA", "ORIGEM DO BRASIL LTDA", "DURATEX", "BATERIAS TUDOR"]);
  assert.ok(report.suggestions.slice(0, 3).every((item) => item.proposedExperience?.period));
  assert.equal(report.suggestions[3]?.classification, "possible");
  assert.equal(report.suggestions[3]?.proposedExperience?.period, null);
  assert.match(report.suggestions[3]?.explanation ?? "", /revisão individual/i);
});

test("an organization-first grouped block with explicit durations remains a partial experience", () => {
  const layoutLines: LayoutTextLine[] = [
    { ...line("EXPERIÊNCIA PROFISSIONAL", 0.55, 0.06, 0.3, "strong"), blockId: "heading", blockType: "paragraph_title", blockReadingOrder: 0 },
    { ...line("AUTÔNOMO", 0.81, 0.06, 0.2), blockId: "self-employed", blockType: "text", blockReadingOrder: 1 },
    { ...line("MOTORISTA - Caminhão - Trabalho autônomo (2 anos)", 0.826, 0.06, 0.42), blockId: "self-employed", blockType: "text", blockReadingOrder: 1 },
    { ...line("SEGURANÇA PATRIMONIAL - Trabalho autônomo (1 ano)", 0.84, 0.06, 0.44), blockId: "self-employed", blockType: "text", blockReadingOrder: 1 },
    { ...line("INFORMAÇÕES ADICIONAIS", 0.854, 0.06, 0.3, "strong"), blockId: "next", blockType: "paragraph_title", blockReadingOrder: 2 },
    { ...line("Facilidade de comunicação", 0.88, 0.06, 0.3), blockId: "next-body", blockType: "text", blockReadingOrder: 3 },
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf", usefulCharacterCount: 280, method: "PP-StructureV3", methodVersion: "PP-StructureV3/PP-OCRv6", layoutLines };
  const extraction = buildAdaptiveExtraction([page]);
  assert.equal(extraction.draft.experiences.length, 1);
  assert.equal(extraction.draft.experiences[0]?.organization, "AUTÔNOMO");
  assert.equal(extraction.draft.experiences[0]?.role, "MOTORISTA - Caminhão / SEGURANÇA PATRIMONIAL");
  assert.equal(extraction.draft.experiences[0]?.period, null);
  assert.doesNotMatch(extraction.draft.experiences[0]?.description ?? "", /INFORMAÇÕES ADICIONAIS|Facilidade/);
});

test("human-confirmed education pattern finds academic siblings across columns", () => {
  const layoutLines = [
    line("FORMAÇÃO", 0.06, 0.08, 0.3, "strong"),
    line("Mestrado em Ciência da Computação 2020 - 2022", 0.12, 0.08, 0.42, "strong"),
    line("Universidade de São Paulo", 0.15, 0.08, 0.36),
    line("Pesquisa em sistemas distribuídos.", 0.18, 0.09, 0.38),
    line("Bacharelado em Engenharia de Software 2014 - 2018", 0.30, 0.58, 0.38, "strong"),
    line("Universidade Estadual de Campinas", 0.33, 0.58, 0.36),
    line("Projeto final em arquitetura de software.", 0.36, 0.59, 0.35),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf", usefulCharacterCount: 420, method: "pdfjs", methodVersion: "fixture-layout-v2", layoutLines };
  const education = {
    id: "education_human000001", source: "human" as const, course: "Mestrado em Ciência da Computação", institution: "Universidade de São Paulo", period: "2020 - 2022", description: "Pesquisa em sistemas distribuídos.", evidenceText: layoutLines[3]!.text, page: 1,
  };
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [], education: [education], certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const report = proposeSiblingEducationCorrections({ pages: [page], draft, extracted: { ...draft, education: [] }, sourceIndex: 0, sourceField: "course", sourceRegion: { pageNumber: 1, x: 0.09, y: 0.18, width: 0.38, height: 0.02 } });
  assert.equal(report.recordKind, "education");
  assert.equal(report.suggestions.length, 1);
  assert.equal(report.suggestions[0]?.proposedEducation?.institution, "Universidade Estadual de Campinas");
  assert.ok(report.suggestions[0]?.criteria.includes("relative-topology"));
});

test("human-confirmed course or certification pattern keeps each sibling value and evidence", () => {
  const layoutLines = [
    line("CERTIFICAÇÕES", 0.08, 0.08, 0.3, "strong"),
    line("AWS Certified Cloud Practitioner", 0.14, 0.10, 0.42),
    line("Scrum Foundation Certificate", 0.20, 0.60, 0.34),
  ];
  const page: ExtractedPage = { pageNumber: 1, text: layoutLines.map((item) => item.text).join("\n"), origin: "native_pdf", usefulCharacterCount: 120, method: "pdfjs", methodVersion: "fixture-layout-v2", layoutLines };
  const draft: StructuredDraft = { ...emptyStructuredSummary(), experiences: [], education: [], certifications: ["AWS Certified Cloud Practitioner"], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [] };
  const report = proposeSiblingCertificationCorrections({ pages: [page], draft, extracted: { ...draft, certifications: [] }, sourceIndex: 0, sourceRegion: { pageNumber: 1, x: 0.10, y: 0.14, width: 0.42, height: 0.02 } });
  assert.equal(report.recordKind, "certification");
  assert.equal(report.suggestions.length, 1);
  assert.equal(report.suggestions[0]?.proposedCertification, "Scrum Foundation Certificate");
  assert.equal(report.suggestions[0]?.fields[0]?.evidenceText, "Scrum Foundation Certificate");
  assert.notEqual(report.suggestions[0]?.fields[0]?.proposedValue, draft.certifications[0]);
});

test("new sibling discovery rejects text-only sources but recognizes the same relative pattern in another column", () => {
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
  assert.equal(columnReport.suggestions.length, 1);
  assert.ok(columnReport.suggestions[0]?.criteria.includes("relative-topology"));
});

test("OCR blocks are normalized into positioned lines for deterministic sibling analysis", () => {
  const lines = buildOcrLayoutLines([{ paragraphs: [{ lines: [{ text: "Diretor, HRT Solutions", bbox: { x0: 100, y0: 200, x1: 700, y1: 240 } }] }] }], 1000, 2000);
  assert.deepEqual(lines[0], {
    text: "Diretor, HRT Solutions", x: 0.1, y: 0.1, width: 0.6, height: 0.02, fontSize: 40, emphasis: "regular",
  });
});

test("OCR field evidence keeps spatial coordinates with the Tesseract method", () => {
  const layoutLines = [
    line("TAINÁ MARQUES", 0.05, 0.08, 0.25, "strong"),
    line("Desenvolvedora Júnior", 0.08, 0.08, 0.3, "strong"),
    line("RESUMO", 0.14, 0.08, 0.15, "strong"),
    line("Desenvolvedora com experiência em Javascript, Node.js e React.", 0.17, 0.08, 0.7),
  ];
  const page: ExtractedPage = {
    pageNumber: 1,
    text: layoutLines.map((item) => item.text).join("\n"),
    origin: "ocr",
    usefulCharacterCount: 100,
    method: "tesseract.js",
    methodVersion: "fixture-ocr-v1",
    layoutLines,
  };

  const extraction = buildAdaptiveExtraction([page]);
  const spatialEvidence = extraction.fieldEvidence.filter((descriptor) => descriptor.x !== null);

  assert.ok(spatialEvidence.length > 0);
  assert.ok(spatialEvidence.every((descriptor) => descriptor.method === "tesseract-layout-v1"));
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

test("adaptive v4 generalizes structural audit metadata without leaking selected text into learning events", async () => {
  const migration = await readFile("supabase/migrations/20260902003617_m5_sibling_block_learning.sql", "utf8");
  const genericMigration = await readFile("supabase/migrations/20260910193000_generic_record_pattern_learning.sql", "utf8");
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
  assert.match(genericMigration, /apply_profile_review_adaptive_suggestions_v4/);
  assert.match(genericMigration, /private\.is_valid_record_pattern_signature/);
  assert.match(genericMigration, /record_profile_review_record_scan/);
  assert.match(genericMigration, /p_anchor_record_kind = 'education'/);
  assert.match(genericMigration, /p_anchor_record_kind = 'certification'/);
  assert.doesNotMatch(genericMigration.match(/insert into public\.profile_review_adaptation_events[\s\S]*?returning id into new_event_id;/i)?.[0] ?? "", /selectedText|raw_selected_text/);
  assert.match(service, /apply_profile_review_adaptive_suggestions_v4/);
  assert.match(service, /recordSiblingScan/);
  assert.match(page, /spatialAnchorRegion/);
  assert.match(page, /dismissAdaptiveSuggestions/);
  assert.match(page, /setAdaptiveReport\(null\)[\s\S]*report\.suggestions\.length === 0[\s\S]*isRecordableSiblingScan\(report\)/);
  assert.match(page, /void personIngestionService\.recordSiblingScan/);
  const panel = await readFile("web/src/components/review/AdaptiveSuggestionPanel.tsx", "utf8");
  assert.match(panel, /Nenhuma ação necessária/);
  assert.match(panel, /Fechar aviso/);
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

test("partial recovery preserves adaptive page geometry behind the public RPC boundary", async () => {
  const migration = await readFile("supabase/migrations/20260902021134_restore_adaptive_page_geometry.sql", "utf8");
  assert.match(migration, /alter function public\.persist_person_extraction[\s\S]*set schema private/i);
  assert.match(migration, /revoke all on function private\.persist_person_extraction[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /create function public\.persist_person_extraction/i);
  assert.match(migration, /jsonb_typeof\(coalesce\(page\.value -> 'layout_blocks'/i);
  assert.match(migration, /adaptive extraction payload exceeds safe limits/i);
  assert.match(migration, /select \* into result from private\.persist_person_extraction/i);
  assert.match(migration, /set layout_blocks = coalesce\(payload\.value -> 'layout_blocks'/i);
  assert.match(migration, /field_evidence = coalesce\(payload\.value -> 'field_evidence'/i);
  assert.match(migration, /where page\.organization_id = p_organization_id[\s\S]*page\.processing_attempt_id = result\.processing_attempt_id/i);
  assert.match(migration, /grant execute on function public\.persist_person_extraction[\s\S]*to authenticated/i);
});

test("adaptive page evidence accepts canonical stable field paths and rejects arbitrary paths", async () => {
  const migration = await readFile("supabase/migrations/20260902022059_accept_current_adaptive_field_paths.sql", "utf8");
  assert.match(migration, /create or replace function public\.persist_person_extraction/i);
  assert.match(migration, /identity\\\.fullName/);
  assert.match(migration, /keyResults\\\.result_\[a-z0-9\]\{8,64\}\\\.value/);
  assert.match(migration, /experiences\\\.\(\[0-9\]\+\|experience_\[a-z0-9\]\{8,64\}\)/);
  assert.match(migration, /education\\\.\(\[0-9\]\+\|education_\[a-z0-9\]\{8,64\}\)/);
  assert.match(migration, /customSections\\\./);
  assert.match(migration, /adaptive field evidence is invalid/i);
  assert.match(migration, /select \* into result from private\.persist_person_extraction/i);
  assert.doesNotMatch(migration, /\|[^']*arbitrary/i);
});

test("adaptive persistence accepts matched OCR geometry and rejects cross-origin spatial methods", async () => {
  const migration = await readFile("supabase/migrations/20260910104122_allow_ocr_spatial_field_evidence.sql", "utf8");
  assert.match(migration, /page\.value ->> 'origin' = 'native_pdf'[\s\S]*descriptor\.value ->> 'method' = 'pdfjs-layout-v1'/i);
  assert.match(migration, /page\.value ->> 'origin' = 'ocr'[\s\S]*descriptor\.value ->> 'method' = 'tesseract-layout-v1'/i);
  assert.match(migration, /and not \([\s\S]*native_pdf[\s\S]*pdfjs-layout-v1[\s\S]*ocr[\s\S]*tesseract-layout-v1[\s\S]*\)\)/i);
  assert.doesNotMatch(migration, /page\.value ->> 'origin' <> 'native_pdf'/i);
  assert.match(migration, /from public, anon/i);
  assert.match(migration, /to authenticated/i);
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
