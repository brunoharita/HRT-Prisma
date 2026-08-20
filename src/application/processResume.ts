import { createHash, randomUUID } from "node:crypto";
import type { ExtractionProvider } from "../ai/provider.js";
import { ProviderFailure } from "../ai/provider.js";
import { deriveInferences } from "../ai/inference.js";
import type {
  DocumentFailure,
  DocumentStatus,
  Evidence,
  EvidenceKind,
  Person,
  ProcessingEvent,
  ProfessionalProfile,
  ResumeDocument,
} from "../domain/types.js";
import { CURRENT_VERSIONS } from "../domain/versions.js";
import type { TalentRepository } from "../infrastructure/repository.js";

export interface ProcessResumeInput {
  organizationId: string;
  filename: string;
  mediaType: string;
  sourceText: string;
}

export type ProcessResumeResult =
  | {
      ok: true;
      processId: string;
      document: ResumeDocument;
      person: Person;
      profile: ProfessionalProfile;
      evidence: Evidence[];
    }
  | {
      ok: false;
      processId: string;
      document: ResumeDocument;
    };

const SUPPORTED_MEDIA_TYPES = new Set(["text/plain", "text/markdown"]);
const TOOL_NAMES = new Set(["Power BI", "SQL", "Tableau", "Qlik", "SAP", "Python", "ETL", "Excel", "JavaScript"]);

function checksum(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function createFailure(
  category: DocumentFailure["category"],
  reason: string,
  technicalMessage: string,
  canReprocess: boolean,
): DocumentFailure {
  return {
    category,
    reason,
    technicalMessage,
    occurredAt: new Date().toISOString(),
    pipelineVersion: CURRENT_VERSIONS.extractionVersion,
    canReprocess,
  };
}

function lineForBlock(sourceText: string, blockId: string): string {
  const lineNumber = Number.parseInt(blockId.replace("line-", ""), 10);
  return sourceText.split(/\r?\n/)[lineNumber - 1]?.trim() ?? "";
}

function evidenceFactory(input: {
  organizationId: string;
  personId: string;
  documentId: string;
  sourceText: string;
}) {
  const unique = new Map<string, Evidence>();
  return {
    create(kind: EvidenceKind, fact: string, blockId: string): string {
      const key = `${kind}:${fact}:${blockId}`;
      const existing = unique.get(key);
      if (existing) return existing.id;
      const evidence: Evidence = {
        id: randomUUID(),
        organizationId: input.organizationId,
        personId: input.personId,
        documentId: input.documentId,
        kind,
        fact,
        locator: {
          documentId: input.documentId,
          blockId,
          page: null,
          quotedText: lineForBlock(input.sourceText, blockId),
        },
        extractionVersion: CURRENT_VERSIONS.extractionVersion,
        createdAt: new Date().toISOString(),
      };
      unique.set(key, evidence);
      return evidence.id;
    },
    all(): Evidence[] {
      return [...unique.values()];
    },
  };
}

function processingEvent(input: {
  processId: string;
  organizationId: string;
  documentId: string;
  durationMs: number;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number;
  result: "success" | "failure";
  errorCategory: ProcessingEvent["errorCategory"];
}): ProcessingEvent {
  return {
    processId: input.processId,
    organizationId: input.organizationId,
    documentId: input.documentId,
    stage: "extraction",
    durationMs: input.durationMs,
    provider: input.provider,
    model: input.model,
    version: CURRENT_VERSIONS.extractionVersion,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCostUsd: input.estimatedCostUsd,
    result: input.result,
    errorCategory: input.errorCategory,
    createdAt: new Date().toISOString(),
  };
}

export async function processResume(
  repository: TalentRepository,
  provider: ExtractionProvider,
  input: ProcessResumeInput,
): Promise<ProcessResumeResult> {
  const startedAt = performance.now();
  const processId = randomUUID();
  const now = new Date().toISOString();
  let document: ResumeDocument = {
    id: randomUUID(),
    organizationId: input.organizationId,
    personId: null,
    filename: input.filename,
    mediaType: input.mediaType,
    checksum: checksum(input.sourceText),
    status: "pending",
    sourceText: input.sourceText,
    failure: null,
    extractionVersion: CURRENT_VERSIONS.extractionVersion,
    createdAt: now,
    updatedAt: now,
  };
  await repository.saveDocument(document);

  const fail = async (status: Extract<DocumentStatus, "extraction_failed" | "needs_manual_review" | "unsupported_format">, failure: DocumentFailure): Promise<ProcessResumeResult> => {
    document = { ...document, status, failure, updatedAt: new Date().toISOString() };
    await repository.saveDocument(document);
    await repository.appendProcessingEvent(processingEvent({
      processId,
      organizationId: input.organizationId,
      documentId: document.id,
      durationMs: Math.round(performance.now() - startedAt),
      provider: provider.name,
      model: provider.model,
      inputTokens: null,
      outputTokens: null,
      estimatedCostUsd: 0,
      result: "failure",
      errorCategory: failure.category,
    }));
    return { ok: false, processId, document };
  };

  if (!SUPPORTED_MEDIA_TYPES.has(input.mediaType)) {
    return fail("unsupported_format", createFailure(
      "unsupported_format",
      `Formato ${input.mediaType} não suportado pelo parser local.`,
      "Use texto UTF-8 ou conecte um parser PDF/OCR validado.",
      true,
    ));
  }
  if (input.sourceText.trim().length < 20) {
    return fail("needs_manual_review", createFailure(
      "no_usable_text",
      "O documento não contém texto utilizável suficiente.",
      "Conteúdo abaixo do limite mínimo de 20 caracteres.",
      true,
    ));
  }

  document = { ...document, status: "processing", updatedAt: new Date().toISOString() };
  await repository.saveDocument(document);

  try {
    const response = await provider.extract(input);
    const draft = response.draft;
    if (!draft.fullName || draft.experiences.length === 0) {
      return fail("needs_manual_review", createFailure(
        "schema_incompatible",
        "Identidade ou experiências não puderam ser estruturadas com segurança.",
        `identity=${Boolean(draft.fullName)} experiences=${draft.experiences.length}`,
        true,
      ));
    }

    const person: Person = {
      id: randomUUID(),
      organizationId: input.organizationId,
      fullName: draft.fullName,
      createdAt: new Date().toISOString(),
    };
    const evidenceBuilder = evidenceFactory({
      organizationId: input.organizationId,
      personId: person.id,
      documentId: document.id,
      sourceText: input.sourceText,
    });

    const nameLine = input.sourceText.split(/\r?\n/).findIndex((line) => /^(nome|name)\s*:/i.test(line.trim()));
    if (nameLine >= 0) evidenceBuilder.create("identity", person.fullName, `line-${nameLine + 1}`);

    const experiences = draft.experiences.map(({ sourceBlockId, ...experience }) => ({
      ...experience,
      evidenceIds: [evidenceBuilder.create(
        "experience",
        `${experience.role} at ${experience.organization}: ${experience.description}`,
        sourceBlockId,
      )],
    }));
    const education = draft.education.map(({ sourceBlockId, ...item }) => ({
      ...item,
      evidenceIds: [evidenceBuilder.create("education", `${item.course} at ${item.institution}`, sourceBlockId)],
    }));
    const languages = draft.languages.map(({ sourceBlockId, ...item }) => ({
      ...item,
      evidenceIds: [evidenceBuilder.create("language", `${item.language}: ${item.proficiency ?? "nível não identificado"}`, sourceBlockId)],
    }));
    for (const item of draft.certifications) evidenceBuilder.create("certification", item.value, item.sourceBlockId);

    const explicitCompetencies = draft.explicitCompetencies.map((item) => ({
      normalizedName: item.value,
      classification: "explicit" as const,
      evidenceIds: [evidenceBuilder.create("competency_explicit", item.value, item.sourceBlockId)],
      contexts: item.context ? [item.context] : [],
    }));
    const groupedExplicit = [...new Set(explicitCompetencies.map((item) => item.normalizedName))].map((name) => ({
      normalizedName: name,
      classification: "explicit" as const,
      evidenceIds: [...new Set(explicitCompetencies.filter((item) => item.normalizedName === name).flatMap((item) => item.evidenceIds))],
      contexts: [...new Set(explicitCompetencies.filter((item) => item.normalizedName === name).flatMap((item) => item.contexts))],
    }));
    for (const item of draft.professionalContexts) {
      evidenceBuilder.create("professional_context", item.value, item.sourceBlockId);
    }

    const evidence = evidenceBuilder.all();
    const inferences = deriveInferences({
      organizationId: input.organizationId,
      personId: person.id,
      explicitCompetencies: groupedExplicit,
      evidence,
    });
    const inferredCompetencies = inferences.map((item) => ({
      normalizedName: item.value,
      classification: "inferred" as const,
      evidenceIds: item.evidenceIds,
      contexts: [],
    }));

    const profile: ProfessionalProfile = {
      id: randomUUID(),
      organizationId: input.organizationId,
      personId: person.id,
      fullName: person.fullName,
      experiences,
      education,
      certifications: draft.certifications.map((item) => item.value),
      languages,
      toolsAndTechnologies: groupedExplicit.map((item) => item.normalizedName).filter((name) => TOOL_NAMES.has(name)),
      competencies: [...groupedExplicit, ...inferredCompetencies],
      professionalContexts: [...new Set(draft.professionalContexts.map((item) => item.value))],
      evidenceIds: evidence.map((item) => item.id),
      inferenceIds: inferences.map((item) => item.id),
      uncertainties: draft.uncertainties,
      notIdentified: draft.notIdentified,
      versions: CURRENT_VERSIONS,
      createdAt: new Date().toISOString(),
    };
    document = {
      ...document,
      personId: person.id,
      status: "processed",
      failure: null,
      updatedAt: new Date().toISOString(),
    };
    await repository.saveProcessingResult({ person, document, profile, evidence, inferences });
    await repository.appendProcessingEvent(processingEvent({
      processId,
      organizationId: input.organizationId,
      documentId: document.id,
      durationMs: Math.round(performance.now() - startedAt),
      provider: response.usage.provider,
      model: response.usage.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      estimatedCostUsd: response.usage.estimatedCostUsd,
      result: "success",
      errorCategory: null,
    }));
    return { ok: true, processId, document, person, profile, evidence };
  } catch (error) {
    const category = error instanceof ProviderFailure ? error.category : "provider_failure";
    return fail("extraction_failed", createFailure(
      category,
      "O provider de extração falhou.",
      error instanceof Error ? error.message : "Erro desconhecido do provider.",
      category !== "schema_incompatible",
    ));
  }
}
