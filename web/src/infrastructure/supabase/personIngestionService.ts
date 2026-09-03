import type { Json } from "./database.types";
import { supabase } from "./client";
import type { ResumeIdentity } from "../../../../src/domain/resumeIdentity.js";
import {
  EXTRACTION_DRAFT_VERSION,
  NATIVE_EXTRACTION_VERSION,
  OCR_VERSION,
  STRUCTURING_VERSION,
  processManualText,
  type CurrentProfileSummary,
  type ExtractedPage,
  type DocumentOperationSummary,
  type PersonDocumentTimelineItem,
  type PersonEditorValue,
  type PersonIngestionWorkspace,
  type PersonProfileState,
  type PersonWorkspaceSummary,
  type ProcessedDocumentInput,
  type ProcessingAttemptView,
  type ProcessingAuditEvent,
  type ProfileReviewWorkspace,
  type ProfileVersionView,
  type ProfileBlockDecision,
  type ProfilePublicationMode,
  type ResumeDuplicateCandidate,
  type ResumeIntakeIdentityResult,
  type ResumeIntakeResolutionResult,
  type ResumeProcessingProgress,
  type StructuredDraft,
} from "../../domain/personIngestion";
import { countPendingReviews, isRecoverableReviewAttempt } from "../../domain/documentPresentation";
import { resolveEducationClassification } from "../../../../src/domain/educationClassification";
import type {
  NormalizedPageRegion,
  RegionExtractionMethod,
  ReviewEvidenceAction,
} from "../../domain/spatialEvidence";
import {
  attachFieldEvidence,
  buildAdaptiveExtraction,
  type AdaptiveFieldSuggestion,
  type ExtractionPatternSignal,
} from "../../domain/adaptiveResumeExtraction";
import {
  CUSTOM_PROFILE_SECTION_METHOD_VERSION,
  type LearnedCustomSectionDefinition,
} from "../../domain/customProfileSections";
import { legacyReviewEntityIdFromValue, reviewDraftNeedsContractUpgrade } from "../../domain/reviewFieldLifecycle";
import { reviewOperationError, supabaseFunctionOperationError, supabaseOperationError } from "../../domain/reviewOperationErrors";

const DOCUMENT_BUCKET = "person-documents";

export const personIngestionService = {
  async beginResumeIntake(
    organizationId: string,
    input: ProcessedDocumentInput,
    identity: ResumeIdentity,
    idempotencyKey: string,
  ): Promise<ResumeIntakeIdentityResult | ResumeIntakeResolutionResult> {
    const { data, error } = await supabase.rpc("start_resume_intake", {
      p_organization_id: organizationId,
      p_filename: input.file.name,
      p_declared_mime_type: input.file.type || "application/pdf",
      p_validated_mime_type: "application/pdf",
      p_checksum_sha256: input.sha256,
      p_byte_size: input.file.size,
      p_page_count: input.pages.length,
      p_extraction_version: NATIVE_EXTRACTION_VERSION,
      p_idempotency_key: idempotencyKey,
    });
    throwIfError(error, "Não foi possível iniciar a importação do currículo.");
    const intake = data?.[0];
    if (!intake) throw new Error("A importação não retornou um identificador.");

    if (
      intake.resolved_person_id
      && intake.resolved_document_id
      && intake.document_version !== null
      && isResolvedIdentityType(intake.resolution_type ?? "")
    ) {
      const resolvedResult: ResumeIntakeResolutionResult = {
        kind: "resolved",
        intakeId: intake.intake_id,
        personId: intake.resolved_person_id,
        documentId: intake.resolved_document_id,
        documentVersion: intake.document_version,
        resolutionType: intake.resolution_type as "created_new_person" | "linked_existing_person",
        reused: true,
      };
      return intake.intake_status === "ready_for_review" || intake.intake_status === "completed"
        ? resolvedResult
        : processResolvedIntake(organizationId, input, resolvedResult);
    }

    if (!intake.reused || intake.intake_status === "failed") {
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(intake.storage_path, input.file, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false,
      });
      if (uploadError) {
        await failResumeIntake(organizationId, intake.intake_id, "storage_upload_failed", "O upload privado do currículo falhou.");
        throw new Error("O upload privado falhou. Nenhuma Pessoa foi criada.");
      }
    }

    return identifyResumeIntake(organizationId, intake.intake_id, intake.storage_path, identity, intake.reused);
  },

  async identifyResumeIntake(
    organizationId: string,
    intakeId: string,
    storagePath: string,
    identity: ResumeIdentity,
    reused = true,
  ): Promise<ResumeIntakeIdentityResult> {
    return identifyResumeIntake(organizationId, intakeId, storagePath, identity, reused);
  },

  async resolveResumeIntake(
    organizationId: string,
    intakeId: string,
    input: ProcessedDocumentInput,
    action: "create_new_person" | "link_existing_person",
    existingPersonId: string | null,
    idempotencyKey: string,
    onProgress?: (progress: ResumeProcessingProgress) => void,
  ): Promise<ResumeIntakeResolutionResult> {
    const { data, error } = await supabase.rpc("resolve_resume_intake", {
      p_organization_id: organizationId,
      p_intake_id: intakeId,
      p_resolution_action: action,
      p_existing_person_id: existingPersonId,
      p_idempotency_key: idempotencyKey,
    });
    throwResolutionError(error, "Não foi possível resolver a identidade da importação.");
    const resolved = data?.[0];
    if (!resolved || !isResolvedIdentityType(resolved.resolution_type)) {
      throw new Error("A resolução não retornou Pessoa e documento válidos.");
    }

    const result: ResumeIntakeResolutionResult = {
      kind: "resolved",
      intakeId,
      personId: resolved.person_id,
      documentId: resolved.document_id,
      documentVersion: resolved.document_version,
      resolutionType: resolved.resolution_type,
      reused: resolved.reused,
    };
    return processResolvedIntake(organizationId, input, result, onProgress);
  },

  async listPeople(organizationId: string, search: string, includePrivateData = true): Promise<PersonWorkspaceSummary[]> {
    const { data: people, error } = await supabase
      .from("people")
      .select("id, organization_id, full_name, lifecycle, profile_state, latest_source_type, latest_source_at, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });
    throwIfError(error, "Não foi possível carregar as Pessoas.");
    const rows = people ?? [];
    if (rows.length === 0) return [];
    const personIds = rows.map((person) => person.id);
    const [privateResult, documentResult, profileResult] = await Promise.all([
      includePrivateData
        ? supabase.from("person_private_data")
          .select("person_id, email, phone_e164, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, birth_date, city, country_code, notes")
          .eq("organization_id", organizationId).in("person_id", personIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("documents")
        .select("id, person_id, filename, source_type, document_version, byte_size, page_count, status, review_state, created_at, processed_at, is_legacy_unstored")
        .eq("organization_id", organizationId).in("person_id", personIds).order("created_at", { ascending: false }),
      supabase.from("professional_profiles")
        .select("id, person_id, source_document_id, profile_version, approved_at, created_at, superseded_at")
        .eq("organization_id", organizationId).in("person_id", personIds),
    ]);
    const { data: privateRows, error: privateError } = privateResult;
    throwIfError(privateError, "Não foi possível carregar os dados privados permitidos.");
    throwIfError(documentResult.error, "Não foi possível carregar o histórico documental das Pessoas.");
    throwIfError(profileResult.error, "Não foi possível carregar os perfis atuais das Pessoas.");
    const documents = documentResult.data ?? [];
    const documentIds = documents.map((document) => document.id);
    const { data: attemptRows, error: attemptError } = documentIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("document_processing_attempts")
        .select("id, document_id, attempt_number, state, current_method, pages_native, pages_ocr, useful_character_count, failure_code, failure_message, started_at, completed_at")
        .eq("organization_id", organizationId).in("document_id", documentIds).order("attempt_number", { ascending: false });
    throwIfError(attemptError, "Não foi possível carregar as tentativas das importações.");
    const privateByPerson = new Map((privateRows ?? []).map((row) => [row.person_id, row]));
    const latestAttemptByDocument = latestAttemptsByDocument(attemptRows ?? []);
    const reviewAttemptByDocument = reviewAttemptsByDocument(attemptRows ?? []);
    const profileByDocument = new Map((profileResult.data ?? []).flatMap((profile) => profile.source_document_id ? [[profile.source_document_id, profile.profile_version] as const] : []));
    const currentProfileByPerson = new Map((profileResult.data ?? [])
      .filter((profile) => profile.superseded_at === null)
      .map((profile) => [profile.person_id, toCurrentProfileSummary(profile)]));
    const documentsByPerson = new Map<string, PersonDocumentTimelineItem[]>();
    for (const document of documents) {
      if (!document.person_id) continue;
      const timeline = documentsByPerson.get(document.person_id) ?? [];
      timeline.push(toTimelineItem(document, latestAttemptByDocument, reviewAttemptByDocument, profileByDocument));
      documentsByPerson.set(document.person_id, timeline);
    }
    const normalizedSearch = normalizeSearch(search);
    const knowledgeMatches = normalizedSearch
      ? await supabase.rpc("search_people_by_knowledge_concept", { p_organization_id: organizationId, p_query: search })
      : { data: [], error: null };
    throwIfError(knowledgeMatches.error, "Não foi possível pesquisar Pessoas por conceito profissional.");
    const knowledgePersonIds = new Set((knowledgeMatches.data ?? []).map((match) => match.person_id));
    return rows.map((person) => {
      const timeline = documentsByPerson.get(person.id) ?? [];
      return toPersonSummary(person, privateByPerson.get(person.id), {
        currentProfile: currentProfileByPerson.get(person.id) ?? null,
        documents: timeline,
      });
    })
      .filter((person) => !normalizedSearch || knowledgePersonIds.has(person.id) || normalizeSearch([
        person.fullName,
        person.privateData.email,
        person.privateData.phoneE164,
        person.privateData.phoneNationalNumber,
      ].join(" ")).includes(normalizedSearch));
  },

  async loadWorkspace(organizationId: string, personId: string, selectedDocumentId?: string): Promise<PersonIngestionWorkspace | null> {
    const { data: person, error } = await supabase
      .from("people")
      .select("id, organization_id, full_name, lifecycle, profile_state, latest_source_type, latest_source_at, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("id", personId)
      .maybeSingle();
    throwIfError(error, "Não foi possível carregar a Pessoa.");
    if (!person) return null;
    const [privateResult, documentResult, profileResult, reviewResult] = await Promise.all([
      supabase.from("person_private_data")
        .select("person_id, email, phone_e164, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, birth_date, city, country_code, notes")
        .eq("organization_id", organizationId).eq("person_id", personId).maybeSingle(),
      supabase.from("documents")
        .select("id, filename, source_type, document_version, byte_size, page_count, status, review_state, created_at, processed_at, is_legacy_unstored")
        .eq("organization_id", organizationId).eq("person_id", personId).order("created_at", { ascending: false }),
      supabase.from("professional_profiles")
        .select("id, person_id, source_document_id, profile_version, approved_at, created_at, superseded_at")
        .eq("organization_id", organizationId).eq("person_id", personId),
      supabase.from("profile_reviews")
        .select("id, document_id, state, created_at")
        .eq("organization_id", organizationId).eq("person_id", personId).order("created_at", { ascending: false }),
    ]);
    throwIfError(privateResult.error, "Não foi possível carregar os dados básicos da Pessoa.");
    throwIfError(documentResult.error, "Não foi possível carregar a linha do tempo documental.");
    throwIfError(profileResult.error, "Não foi possível carregar as versões de perfil.");
    throwIfError(reviewResult.error, "Não foi possível carregar as verificações dos documentos.");
    const documents = documentResult.data ?? [];
    const documentIds = documents.map((document) => document.id);
    const { data: attemptRows, error: attemptError } = documentIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("document_processing_attempts")
        .select("id, document_id, attempt_number, state, current_method, pages_native, pages_ocr, useful_character_count, failure_code, failure_message, started_at, completed_at")
        .eq("organization_id", organizationId).in("document_id", documentIds).order("attempt_number", { ascending: false });
    throwIfError(attemptError, "Não foi possível carregar as tentativas de processamento.");
    const latestAttemptByDocument = latestAttemptsByDocument(attemptRows ?? []);
    const reviewAttemptByDocument = reviewAttemptsByDocument(attemptRows ?? []);
    const profileByDocument = new Map((profileResult.data ?? []).flatMap((profile) => profile.source_document_id ? [[profile.source_document_id, profile.profile_version] as const] : []));
    const reviewByDocument = new Map<string, string>();
    for (const review of reviewResult.data ?? []) {
      if (!reviewByDocument.has(review.document_id)) reviewByDocument.set(review.document_id, review.id);
    }
    const timeline = documents.map((document) => toTimelineItem(document, latestAttemptByDocument, reviewAttemptByDocument, profileByDocument, reviewByDocument));
    const currentProfileRow = (profileResult.data ?? []).find((profile) => profile.superseded_at === null);
    const selectedDocument = timeline.find((document) => document.id === selectedDocumentId) ?? timeline[0] ?? null;
    const attemptId = selectedDocument?.reviewAttempt?.id ?? selectedDocument?.latestAttempt?.id;
    const [pageResult, draftResult] = attemptId ? await Promise.all([
      supabase.from("document_page_extractions")
        .select("page_number, text_content, origin, useful_character_count, method, method_version")
        .eq("organization_id", organizationId).eq("processing_attempt_id", attemptId).order("page_number"),
      supabase.from("extraction_drafts")
        .select("identified_fields, uncertainties, not_identified")
        .eq("organization_id", organizationId).eq("processing_attempt_id", attemptId).maybeSingle(),
    ]) : [{ data: [], error: null }, { data: null, error: null }];
    throwIfError(pageResult.error, "Não foi possível carregar o texto extraído.");
    throwIfError(draftResult.error, "Não foi possível carregar os dados estruturados.");
    return {
      person: toPersonSummary(person, privateResult.data ?? undefined, {
        currentProfile: currentProfileRow ? toCurrentProfileSummary(currentProfileRow) : null,
        documents: timeline,
      }),
      documents: timeline,
      selectedDocument,
      pages: (pageResult.data ?? []).map((page) => ({
        pageNumber: page.page_number,
        text: page.text_content,
        origin: page.origin,
        usefulCharacterCount: page.useful_character_count,
        method: page.method,
        methodVersion: page.method_version,
      })),
      draft: draftResult.data ? decodeDraft(draftResult.data.identified_fields, draftResult.data.uncertainties, draftResult.data.not_identified) : null,
    };
  },

  async savePerson(organizationId: string, personId: string | null, value: PersonEditorValue): Promise<string> {
    const now = new Date().toISOString();
    let resolvedPersonId = personId;
    if (personId) {
      const { error } = await supabase.from("people").update({ full_name: value.fullName.trim(), updated_at: now })
        .eq("organization_id", organizationId).eq("id", personId);
      throwIfError(error, "Não foi possível atualizar a Pessoa.");
    } else {
      const { data, error } = await supabase.from("people")
        .insert({ organization_id: organizationId, full_name: value.fullName.trim(), lifecycle: "candidate" })
        .select("id").single();
      throwIfError(error, "Não foi possível criar a Pessoa.");
      if (!data) throw new Error("A Pessoa foi criada sem retorno de identificador.");
      resolvedPersonId = data.id;
    }
    if (!resolvedPersonId) throw new Error("A Pessoa não recebeu um identificador válido.");
    const { error: privateError } = await supabase.from("person_private_data").upsert({
      organization_id: organizationId,
      person_id: resolvedPersonId,
      email: emptyToNull(value.email),
      phone: emptyToNull(value.phoneE164),
      location: emptyToNull([value.city, value.countryCode].filter(Boolean).join(", ")),
      phone_e164: emptyToNull(value.phoneE164),
      phone_country_iso2: emptyToNull(value.phoneCountryIso2),
      phone_country_label: emptyToNull(value.phoneCountryLabel),
      phone_country_code: emptyToNull(value.phoneCountryCode),
      phone_national_number: emptyToNull(value.phoneNationalNumber),
      birth_date: value.birthDate,
      city: emptyToNull(value.city),
      country_code: emptyToNull(value.countryCode),
      notes: emptyToNull(value.notes),
      updated_at: now,
    }, { onConflict: "organization_id,person_id" });
    throwIfError(privateError, "A Pessoa foi preservada, mas os dados privados não puderam ser salvos.");
    return resolvedPersonId;
  },

  async processManualSource(organizationId: string, personId: string, text: string): Promise<string> {
    const { page, draft } = processManualText(text);
    const checksum = await sha256Text(text);
    const operationKey = createOperationKey("manual-document");
    const document = await registerDocument({
      organizationId,
      personId,
      sourceType: "manual_text",
      filename: "texto-manual.txt",
      declaredMimeType: "text/plain",
      validatedMimeType: "text/plain",
      checksum,
      byteSize: new TextEncoder().encode(text).byteLength,
      pageCount: 1,
      extractionVersion: STRUCTURING_VERSION,
      idempotencyKey: operationKey,
    });
    await persistExtraction(organizationId, personId, document.documentId, [page], draft, 1, 0, createOperationKey("manual-extraction"), null);
    return document.documentId;
  },

  async processPdf(organizationId: string, personId: string, input: ProcessedDocumentInput): Promise<string> {
    const document = await registerDocument({
      organizationId,
      personId,
      sourceType: "resume_pdf",
      filename: input.file.name,
      declaredMimeType: input.file.type || "application/pdf",
      validatedMimeType: "application/pdf",
      checksum: input.sha256,
      byteSize: input.file.size,
      pageCount: input.pages.length,
      extractionVersion: NATIVE_EXTRACTION_VERSION,
      idempotencyKey: createOperationKey("pdf-document"),
    });
    if (!document.storagePath) throw new Error("O registro do PDF não reservou um caminho privado.");
    const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(document.storagePath, input.file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) {
      await recordFailure(organizationId, personId, document.documentId, "failed_extraction", "storage_upload_failed", "O documento foi registrado, mas o upload privado falhou.");
      throw new Error("O upload privado falhou. Nenhum Perfil Prisma foi gerado.");
    }
    const extraction = await buildOrganizationAdaptiveExtraction(organizationId, input.pages);
    const pages = attachFieldEvidence(input.pages, extraction.fieldEvidence);
    await persistExtraction(organizationId, personId, document.documentId, pages, extraction.draft, input.nativePageCount, input.ocrPageCount, createOperationKey("pdf-extraction"), null);
    return document.documentId;
  },

  async reprocessDocument(organizationId: string, personId: string, documentId: string): Promise<void> {
    const { data: attemptRows, error: attemptError } = await supabase.from("document_processing_attempts")
      .select("id, attempt_number").eq("organization_id", organizationId).eq("document_id", documentId)
      .order("attempt_number", { ascending: false });
    throwIfError(attemptError, "Não foi possível localizar a tentativa anterior.");
    const { data: pageRows, error: pageError } = await supabase.from("document_page_extractions")
      .select("processing_attempt_id, page_number, text_content, origin, useful_character_count, method, method_version, layout_blocks, field_evidence")
      .eq("organization_id", organizationId).eq("document_id", documentId).order("page_number");
    throwIfError(pageError, "Não foi possível recuperar a extração anterior.");
    const pageAttemptIds = new Set((pageRows ?? []).map((page) => page.processing_attempt_id));
    const previousAttempt = (attemptRows ?? []).find((attempt) => pageAttemptIds.has(attempt.id));
    if (!previousAttempt) throw new Error("O documento ainda não possui uma tentativa com páginas extraídas para reprocessar.");
    const pages: ExtractedPage[] = (pageRows ?? []).filter((page) => page.processing_attempt_id === previousAttempt.id).map((page) => ({
      pageNumber: page.page_number,
      text: page.text_content,
      origin: page.origin,
      usefulCharacterCount: page.useful_character_count,
      method: page.method,
      methodVersion: page.method_version,
      ...(Array.isArray(page.layout_blocks) ? { layoutLines: page.layout_blocks as unknown as NonNullable<ExtractedPage["layoutLines"]> } : {}),
      ...(Array.isArray(page.field_evidence) ? { fieldEvidence: page.field_evidence as unknown as NonNullable<ExtractedPage["fieldEvidence"]> } : {}),
    }));
    if (pages.length === 0) throw new Error("Nenhuma tentativa anterior possui páginas extraídas válidas.");
    const extraction = await buildOrganizationAdaptiveExtraction(organizationId, pages);
    await persistExtraction(
      organizationId,
      personId,
      documentId,
      attachFieldEvidence(pages, extraction.fieldEvidence),
      extraction.draft,
      pages.filter((page) => page.origin === "native_pdf").length,
      pages.filter((page) => page.origin === "ocr").length,
      createOperationKey("retry-processing"),
      previousAttempt.id,
    );
  },

  async startProfileReview(organizationId: string, personId: string, documentId: string, processingAttemptId: string): Promise<string> {
    const { data, error } = await supabase.rpc("start_profile_review", {
      p_organization_id: organizationId,
      p_person_id: personId,
      p_document_id: documentId,
      p_processing_attempt_id: processingAttemptId,
      p_idempotency_key: createOperationKey("start-review"),
    });
    throwIfError(error, "Não foi possível iniciar a revisão humana.");
    const reviewId = data?.[0]?.review_id;
    if (!reviewId) throw new Error("A revisão foi iniciada sem identificador.");
    return reviewId;
  },

  async saveProfileReview(
    organizationId: string,
    reviewId: string,
    expectedLockVersion: number,
    reviewedData: StructuredDraft,
  ): Promise<number> {
    const { data, error } = await supabase.rpc("save_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_reviewed_data: reviewedData as unknown as Json,
      p_reason: automaticReviewChangeReason(),
      p_idempotency_key: createOperationKey("save-review"),
    });
    throwReviewError(error, "Não foi possível salvar o rascunho da revisão.");
    const lockVersion = data?.[0]?.lock_version;
    if (!lockVersion) throw new Error("A revisão foi salva sem versão de concorrência.");
    return lockVersion;
  },

  async synchronizeProfileReviewContract(
    organizationId: string,
    reviewId: string,
    expectedLockVersion: number,
    reviewedData: StructuredDraft,
  ): Promise<number> {
    const { data, error } = await supabase.rpc("save_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_reviewed_data: reviewedData as unknown as Json,
      p_reason: "Atualização técnica automática para o contrato vigente; conteúdo e proveniência preservados.",
      p_idempotency_key: createOperationKey("synchronize-review-contract"),
    });
    throwReviewError(error, "Não foi possível atualizar automaticamente esta revisão antiga.");
    const lockVersion = data?.[0]?.lock_version;
    if (!lockVersion) throw new Error("A atualização automática terminou sem confirmar a versão da revisão.");
    return lockVersion;
  },

  async applyAdaptiveSuggestions(input: {
    organizationId: string;
    reviewId: string;
    expectedLockVersion: number;
    reviewedData: StructuredDraft;
    sourceFieldPath: string;
    patternKey: string;
    methodVersion: "prisma-document-learning-v3";
    algorithmVersion: string;
    signatureVersion: string;
    anchorExperienceId: string;
    signatureSummary: Record<string, string | number | boolean | null>;
    candidateSummary: { detected: number; strong: number; possible: number; rejected: number };
    suggestions: AdaptiveFieldSuggestion[];
    reason: string;
  }): Promise<{ lockVersion: number; adaptationEventId: string }> {
    const suggestionMetadata = input.suggestions.map((suggestion) => ({
      candidateId: suggestion.fieldPath.split(".")[1],
      fieldPath: suggestion.fieldPath,
      pageNumber: suggestion.pageNumber,
      evidenceMethod: suggestion.evidence?.method ?? "text-line-v1",
      rationaleCode: suggestion.rationaleCode,
      evidenceRegions: suggestion.evidences.flatMap((evidence) => (
        evidence.x === null || evidence.y === null || evidence.width === null || evidence.height === null ? [] : [{
          pageNumber: evidence.pageNumber,
          x: evidence.x,
          y: evidence.y,
          width: evidence.width,
          height: evidence.height,
          selectedText: evidence.text,
          extractionMethod: evidence.method === "tesseract-layout-v1" ? "tesseract-region-v1" : "pdfjs-text-layer-v1",
        }]
      )),
    })) as unknown as Json;
    const { data, error } = await supabase.rpc("apply_profile_review_adaptive_suggestions_v3", {
      p_organization_id: input.organizationId,
      p_review_id: input.reviewId,
      p_expected_lock_version: input.expectedLockVersion,
      p_reviewed_data: input.reviewedData as unknown as Json,
      p_source_field_path: input.sourceFieldPath,
      p_pattern_key: input.patternKey,
      p_method_version: input.methodVersion,
      p_algorithm_version: input.algorithmVersion,
      p_signature_version: input.signatureVersion,
      p_anchor_experience_id: input.anchorExperienceId,
      p_signature_summary: input.signatureSummary as unknown as Json,
      p_candidate_summary: input.candidateSummary as unknown as Json,
      p_accepted_suggestions: suggestionMetadata,
      p_reason: input.reason,
      p_idempotency_key: createOperationKey("adaptive-review"),
    });
    throwReviewError(error, "Não foi possível aplicar atomicamente as sugestões adaptativas.");
    const result = data?.[0];
    if (!result) throw new Error("O aprendizado adaptativo não retornou confirmação persistida.");
    return { lockVersion: result.lock_version, adaptationEventId: result.adaptation_event_id };
  },

  async recordSiblingScan(input: {
    organizationId: string;
    reviewId: string;
    anchorExperienceId: string;
    methodVersion: "prisma-document-learning-v3";
    algorithmVersion: string;
    signatureVersion: string;
    signatureSummary: Record<string, string | number | boolean | null>;
    candidateSummary: { detected: number; strong: number; possible: number; rejected: number };
    decision: "detected" | "discarded";
  }): Promise<void> {
    const { error } = await supabase.rpc("record_profile_review_sibling_scan", {
      p_organization_id: input.organizationId,
      p_review_id: input.reviewId,
      p_anchor_experience_id: input.anchorExperienceId,
      p_method_version: input.methodVersion,
      p_algorithm_version: input.algorithmVersion,
      p_signature_version: input.signatureVersion,
      p_signature_summary: input.signatureSummary as unknown as Json,
      p_candidate_summary: input.candidateSummary as unknown as Json,
      p_decision: input.decision,
      p_idempotency_key: createOperationKey(`sibling-${input.decision}`),
    });
    throwReviewError(error, "Não foi possível registrar a decisão sobre as sugestões estruturais.");
  },

  async recordProfileReviewEvidence(input: {
    organizationId: string;
    reviewId: string;
    expectedLockVersion: number;
    fieldPath: string;
    action: ReviewEvidenceAction;
    documentVersion: number;
    pageNumber: number;
    region: NormalizedPageRegion;
    rawSelectedText: string | null;
    selectedText: string | null;
    refinementDecisions: Array<{ linkId: string; decision: "excluded" | "included" }>;
    extractionMethod: RegionExtractionMethod;
    reviewedData: StructuredDraft | null;
    replacesLinkId: string | null;
  }): Promise<{ lockVersion: number; regionId: string; linkId: string }> {
    const { data, error } = await supabase.rpc("record_profile_review_evidence_refined", {
      p_organization_id: input.organizationId,
      p_review_id: input.reviewId,
      p_expected_lock_version: input.expectedLockVersion,
      p_field_path: input.fieldPath,
      p_action: input.action,
      p_document_version: input.documentVersion,
      p_page_number: input.pageNumber,
      p_x: input.region.x,
      p_y: input.region.y,
      p_width: input.region.width,
      p_height: input.region.height,
      p_raw_selected_text: input.rawSelectedText,
      p_selected_text: input.selectedText,
      p_refinement_decisions: input.refinementDecisions as unknown as Json,
      p_extraction_method: input.extractionMethod,
      p_reviewed_data: input.reviewedData as unknown as Json | null,
      p_reason: automaticEvidenceReason(input.action, input.pageNumber),
      p_replaces_link_id: input.replacesLinkId,
      p_idempotency_key: createOperationKey("record-review-evidence"),
    });
    throwReviewError(error, "Não foi possível registrar a evidência da revisão.");
    const result = data?.[0];
    if (!result) throw new Error("A evidência foi registrada sem confirmação persistida.");
    return { lockVersion: result.lock_version, regionId: result.region_id, linkId: result.link_id };
  },

  async retireProfileReviewEvidence(input: {
    organizationId: string;
    reviewId: string;
    expectedLockVersion: number;
    linkId: string;
    reason: string;
  }): Promise<number> {
    const { data, error } = await supabase.rpc("retire_profile_review_evidence", {
      p_organization_id: input.organizationId,
      p_review_id: input.reviewId,
      p_expected_lock_version: input.expectedLockVersion,
      p_link_id: input.linkId,
      p_reason: input.reason,
      p_idempotency_key: createOperationKey("retire-review-evidence"),
    });
    throwReviewError(error, "Não foi possível excluir a evidência da revisão.");
    const lockVersion = data?.[0]?.lock_version;
    if (!lockVersion) throw new Error("A exclusão da evidência não retornou a versão da revisão.");
    return lockVersion;
  },

  async approveProfileReview(organizationId: string, reviewId: string, expectedLockVersion: number): Promise<{ profileId: string; profileVersion: number }> {
    const { data, error } = await supabase.rpc("publish_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_publication_mode: "merge",
      p_block_decisions: [] as Json,
      p_idempotency_key: publicationOperationKey(reviewId, "merge", []),
    });
    throwReviewError(error, "Não foi possível publicar a versão revisada.");
    const approved = data?.[0];
    if (!approved) throw new Error("A publicação não retornou a versão persistida.");
    return { profileId: approved.profile_id, profileVersion: approved.profile_version };
  },

  async publishProfileReview(organizationId: string, reviewId: string, expectedLockVersion: number, mode: ProfilePublicationMode, blockDecisions: ProfileBlockDecision[]): Promise<{ profileId: string; profileVersion: number }> {
    const { data, error } = await supabase.rpc("publish_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_publication_mode: mode,
      p_block_decisions: blockDecisions as unknown as Json,
      p_idempotency_key: publicationOperationKey(reviewId, mode, blockDecisions),
    });
    throwReviewError(error, "Não foi possível publicar a nova versão.");
    const approved = data?.[0];
    if (!approved) throw new Error("A publicação não retornou a versão persistida.");
    return { profileId: approved.profile_id, profileVersion: approved.profile_version };
  },

  async listDocumentOperations(organizationId: string): Promise<DocumentOperationSummary[]> {
    const [documentResult, peopleResult, profileResult] = await Promise.all([
      supabase.from("documents")
        .select("id, person_id, filename, source_type, document_version, byte_size, page_count, status, review_state, failure_category, created_at, processed_at, is_legacy_unstored")
        .eq("organization_id", organizationId).not("person_id", "is", null).order("created_at", { ascending: false }),
      supabase.from("people").select("id, full_name").eq("organization_id", organizationId),
      supabase.from("professional_profiles").select("id, person_id, source_document_id, profile_version, approved_at, created_at, superseded_at")
        .eq("organization_id", organizationId),
    ]);
    throwIfError(documentResult.error, "Não foi possível carregar a central de processamento.");
    throwIfError(peopleResult.error, "Não foi possível carregar as Pessoas da central.");
    throwIfError(profileResult.error, "Não foi possível carregar as versões de perfil.");
    const documents = documentResult.data ?? [];
    const documentIds = documents.map((document) => document.id);
    const { data: attempts, error: attemptError } = documentIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("document_processing_attempts")
        .select("id, document_id, attempt_number, state, current_method, pages_native, pages_ocr, useful_character_count, failure_code, failure_message, started_at, completed_at")
        .eq("organization_id", organizationId).in("document_id", documentIds)
        .order("attempt_number", { ascending: false });
    throwIfError(attemptError, "Não foi possível carregar as tentativas da central.");
    const people = new Map((peopleResult.data ?? []).map((person) => [person.id, person.full_name]));
    const profiles = new Map((profileResult.data ?? []).flatMap((profile) => profile.source_document_id ? [[profile.source_document_id, profile.profile_version] as const] : []));
    const currentProfiles = new Map((profileResult.data ?? [])
      .filter((profile) => profile.superseded_at === null)
      .map((profile) => [profile.person_id, toCurrentProfileSummary(profile)]));
    const latestAttempts = latestAttemptsByDocument(attempts ?? []);
    const reviewAttempts = reviewAttemptsByDocument(attempts ?? []);
    return documents.flatMap((document) => document.person_id ? [{
      id: document.id,
      personId: document.person_id,
      personName: people.get(document.person_id) ?? "Pessoa não localizada",
      filename: document.filename,
      sourceType: document.source_type,
      documentVersion: document.document_version,
      byteSize: document.byte_size,
      pageCount: document.page_count,
      status: document.status,
      reviewState: document.review_state,
      failureCode: document.failure_category,
      createdAt: document.created_at,
      processedAt: document.processed_at,
      profileVersion: profiles.get(document.id) ?? null,
      verificationReviewId: null,
      isLegacyUnstored: document.is_legacy_unstored,
      latestAttempt: latestAttempts.get(document.id) ?? null,
      reviewAttempt: reviewAttempts.get(document.id) ?? null,
      currentProfile: currentProfiles.get(document.person_id) ?? null,
    } satisfies DocumentOperationSummary] : []);
  },

  async discardDocumentReview(organizationId: string, documentId: string): Promise<{ reviewId: string | null; reused: boolean }> {
    const { data, error } = await supabase.rpc("invalidate_document_review", {
      p_organization_id: organizationId,
      p_document_id: documentId,
      p_idempotency_key: createOperationKey("invalidate-review"),
    });
    throwReviewError(error, "Não foi possível arquivar a nova importação.");
    const result = data?.[0];
    if (!result) throw new Error("O arquivamento não retornou confirmação.");
    return { reviewId: result.review_id, reused: result.reused };
  },

  async restoreProfileVersion(organizationId: string, personId: string, profileId: string): Promise<{ profileId: string; profileVersion: number }> {
    const operationStorageKey = `prisma.restore-profile.${personId}.${profileId}`;
    const { data, error } = await supabase.rpc("restore_profile_version", {
      p_organization_id: organizationId, p_person_id: personId, p_profile_id: profileId,
      p_idempotency_key: stableSessionOperationKey(operationStorageKey, "restore-profile"),
    });
    throwReviewError(error, "Não foi possível restaurar esta versão.");
    const restored = data?.[0];
    if (!restored) throw new Error("A restauração não retornou a nova versão do perfil.");
    window.sessionStorage.removeItem(operationStorageKey);
    return { profileId: restored.profile_id, profileVersion: restored.profile_version };
  },

  async resetProfile(organizationId: string, personId: string): Promise<void> {
    const operationStorageKey = `prisma.reset-profile.${personId}`;
    const { error } = await supabase.rpc("reset_person_profile", {
      p_organization_id: organizationId, p_person_id: personId,
      p_idempotency_key: stableSessionOperationKey(operationStorageKey, "reset-profile"),
    });
    throwReviewError(error, "Não foi possível reiniciar o Perfil.");
    window.sessionStorage.removeItem(operationStorageKey);
  },

  async deleteDocument(organizationId: string, personId: string, documentId: string): Promise<{ profileRebuilt: boolean; profileVersion: number | null }> {
    const operationStorageKey = `prisma.delete-document.${documentId}`;
    const { data, error } = await supabase.functions.invoke("person-document-lifecycle", { body: {
      action: "delete_document", organizationId, personId, documentId,
      idempotencyKey: stableSessionOperationKey(operationStorageKey, "delete-document"),
    } });
    if (error) throw await supabaseFunctionOperationError(error, "Não foi possível excluir o documento.");
    const result = data as { profile_rebuilt?: boolean; profile_version?: number | null } | null;
    window.sessionStorage.removeItem(operationStorageKey);
    return { profileRebuilt: Boolean(result?.profile_rebuilt), profileVersion: result?.profile_version ?? null };
  },

  async listDocumentAttempts(organizationId: string, documentId: string): Promise<ProcessingAttemptView[]> {
    const { data, error } = await supabase.from("document_processing_attempts")
      .select("id, attempt_number, state, current_method, pages_native, pages_ocr, useful_character_count, failure_code, failure_message, started_at, completed_at")
      .eq("organization_id", organizationId).eq("document_id", documentId).order("attempt_number", { ascending: false });
    throwIfError(error, "Não foi possível carregar o histórico de tentativas.");
    return (data ?? []).map(toAttemptView);
  },

  async listAuditEvents(organizationId: string, documentId: string): Promise<ProcessingAuditEvent[]> {
    const { data, error } = await supabase.from("person_ingestion_events")
      .select("id, event_type, result, error_code, actor_auth_user_id, metadata, created_at")
      .eq("organization_id", organizationId).eq("document_id", documentId).order("created_at", { ascending: false });
    throwIfError(error, "Não foi possível carregar a auditoria do documento.");
    return (data ?? []).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      result: event.result,
      errorCode: event.error_code,
      actorAuthUserId: event.actor_auth_user_id,
      metadata: isRecord(event.metadata) ? event.metadata : {},
      createdAt: event.created_at,
    }));
  },

  async loadProfileReview(organizationId: string, reviewId: string): Promise<ProfileReviewWorkspace | null> {
    const { data: review, error } = await supabase.from("profile_reviews")
      .select("id, person_id, document_id, processing_attempt_id, state, lock_version, extracted_data, reviewed_data, base_profile_version, approved_profile_id, approved_at")
      .eq("organization_id", organizationId).eq("id", reviewId).maybeSingle();
    throwIfError(error, "Não foi possível carregar a revisão.");
    if (!review) return null;
    const [
      personResult,
      personPrivateResult,
      documentResult,
      revisionResult,
      changeResult,
      evidenceResult,
      regionResult,
      linkResult,
      refinementResult,
      evidenceEventResult,
      pageResult,
      adaptationEventResult,
    ] = await Promise.all([
      supabase.from("people").select("full_name").eq("organization_id", organizationId).eq("id", review.person_id).single(),
      supabase.from("person_private_data").select("phone, phone_e164, phone_national_number, email").eq("organization_id", organizationId).eq("person_id", review.person_id).maybeSingle(),
      supabase.from("documents")
        .select("filename, document_version, page_count, storage_path, source_type")
        .eq("organization_id", organizationId).eq("id", review.document_id).single(),
      supabase.from("profile_review_revisions")
        .select("id, revision_number, change_reason, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("revision_number", { ascending: false }),
      supabase.from("profile_review_changes")
        .select("id, field_path, extracted_value, previous_value, reviewed_value, reason, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at", { ascending: false }),
      supabase.from("evidence")
        .select("id, kind, fact, source_page, source_block, quoted_text, extraction_origin, method, method_version, created_at")
        .eq("organization_id", organizationId).eq("processing_attempt_id", review.processing_attempt_id)
        .order("source_page"),
      supabase.from("spatial_evidence_regions")
        .select("id, organization_id, person_id, document_id, document_version, review_id, page_number, x, y, width, height, coordinate_system, raw_selected_text, selected_text, extraction_method, source, contract_version, created_by_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at"),
      supabase.from("profile_review_evidence_links")
        .select("id, review_id, field_path, evidence_id, spatial_region_id, link_kind, state, replaces_link_id, superseded_by_link_id, reason, created_by_auth_user_id, created_at, superseded_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at"),
      supabase.from("profile_review_evidence_refinements")
        .select("id, review_id, region_id, mapped_link_id, mapped_field_path, decision, basis, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at"),
      supabase.from("profile_review_evidence_events")
        .select("id, review_id, review_revision_id, field_path, event_type, previous_link_id, new_link_id, reason, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at", { ascending: false }),
      supabase.from("document_page_extractions")
        .select("page_number, text_content, origin, useful_character_count, method, method_version, layout_blocks, field_evidence")
        .eq("organization_id", organizationId).eq("processing_attempt_id", review.processing_attempt_id).order("page_number"),
      supabase.from("profile_review_adaptation_events")
        .select("id, review_revision_id, source_field_path, pattern_key, method_version, accepted_suggestions, lock_version, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at", { ascending: false }),
    ]);
    throwIfError(personResult.error, "Não foi possível carregar a Pessoa da revisão.");
    throwIfError(personPrivateResult.error, "Não foi possível carregar o contato privado da Pessoa.");
    throwIfError(documentResult.error, "Não foi possível carregar o documento da revisão.");
    throwIfError(revisionResult.error, "Não foi possível carregar as revisões salvas.");
    throwIfError(changeResult.error, "Não foi possível carregar as correções da revisão.");
    throwIfError(evidenceResult.error, "Não foi possível carregar as evidências originais da revisão.");
    throwIfError(regionResult.error, "Não foi possível carregar as regiões espaciais da revisão.");
    throwIfError(linkResult.error, "Não foi possível carregar os vínculos de evidência da revisão.");
    throwIfError(refinementResult.error, "Não foi possível carregar os refinamentos de evidência da revisão.");
    throwIfError(evidenceEventResult.error, "Não foi possível carregar o histórico de evidências da revisão.");
    throwIfError(pageResult.error, "Não foi possível carregar a fonte original para o aprendizado da revisão.");
    throwIfError(adaptationEventResult.error, "Não foi possível carregar o histórico de aprendizado da revisão.");
    if (!personResult.data || !documentResult.data) throw new Error("A revisão perdeu a referência da Pessoa ou do documento.");
    const pages: ExtractedPage[] = (pageResult.data ?? []).map((page) => ({
      pageNumber: page.page_number,
      text: page.text_content,
      origin: page.origin,
      usefulCharacterCount: page.useful_character_count,
      method: page.method,
      methodVersion: page.method_version,
      ...(Array.isArray(page.layout_blocks) ? { layoutLines: page.layout_blocks as unknown as NonNullable<ExtractedPage["layoutLines"]> } : {}),
      ...(Array.isArray(page.field_evidence) ? { fieldEvidence: page.field_evidence as unknown as NonNullable<ExtractedPage["fieldEvidence"]> } : {}),
    }));
    const legacySummaryFallback = buildAdaptiveExtraction(pages).draft;
    return {
      id: review.id,
      personId: review.person_id,
      personName: personResult.data.full_name,
      personPrivateContact: {
        phone: personPrivateResult.data?.phone_e164 ?? personPrivateResult.data?.phone_national_number ?? personPrivateResult.data?.phone ?? null,
        email: personPrivateResult.data?.email ?? null,
      },
      documentId: review.document_id,
      documentName: documentResult.data.filename,
      documentVersion: documentResult.data.document_version,
      documentPageCount: documentResult.data.page_count ?? 0,
      documentStoragePath: documentResult.data.storage_path,
      documentSourceType: documentResult.data.source_type,
      processingAttemptId: review.processing_attempt_id,
      state: review.state,
      lockVersion: review.lock_version,
      requiresContractUpgrade: reviewDraftNeedsContractUpgrade(review.reviewed_data),
      extractedData: decodeReviewDraft(review.extracted_data, legacySummaryFallback, true),
      reviewedData: decodeReviewDraft(review.reviewed_data, legacySummaryFallback),
      baseProfileVersion: review.base_profile_version,
      approvedProfileId: review.approved_profile_id,
      approvedAt: review.approved_at,
      pages,
      revisions: (revisionResult.data ?? []).map((revision) => ({
        id: revision.id,
        revisionNumber: revision.revision_number,
        changeReason: revision.change_reason,
        actorAuthUserId: revision.actor_auth_user_id,
        createdAt: revision.created_at,
      })),
      changes: (changeResult.data ?? []).map((change) => ({
        id: change.id,
        fieldPath: change.field_path as keyof StructuredDraft,
        extractedValue: change.extracted_value,
        previousValue: change.previous_value,
        reviewedValue: change.reviewed_value,
        reason: change.reason,
        actorAuthUserId: change.actor_auth_user_id,
        createdAt: change.created_at,
      })),
      adaptationEvents: (adaptationEventResult.data ?? []).map((event) => ({
        id: event.id,
        reviewRevisionId: event.review_revision_id,
        sourceFieldPath: event.source_field_path,
        patternKey: event.pattern_key,
        methodVersion: event.method_version,
        acceptedSuggestions: decodeAdaptiveSuggestionMetadata(event.accepted_suggestions),
        lockVersion: event.lock_version,
        actorAuthUserId: event.actor_auth_user_id,
        createdAt: event.created_at,
      })),
      originalEvidence: (evidenceResult.data ?? []).map((evidence) => ({
        id: evidence.id,
        kind: evidence.kind,
        fact: evidence.fact,
        sourcePage: evidence.source_page,
        sourceBlock: evidence.source_block,
        quotedText: evidence.quoted_text,
        extractionOrigin: evidence.extraction_origin,
        method: evidence.method,
        methodVersion: evidence.method_version,
        createdAt: evidence.created_at,
      })),
      spatialRegions: (regionResult.data ?? []).map((region) => ({
        id: region.id,
        organizationId: region.organization_id,
        personId: region.person_id,
        documentId: region.document_id,
        documentVersion: region.document_version,
        reviewId: region.review_id,
        pageNumber: region.page_number,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        coordinateSystem: region.coordinate_system,
        rawSelectedText: region.raw_selected_text,
        selectedText: region.selected_text,
        extractionMethod: region.extraction_method,
        source: region.source,
        contractVersion: region.contract_version,
        createdByAuthUserId: region.created_by_auth_user_id,
        createdAt: region.created_at,
      })),
      evidenceLinks: (linkResult.data ?? []).map((link) => ({
        id: link.id,
        reviewId: link.review_id,
        fieldPath: link.field_path,
        evidenceId: link.evidence_id,
        spatialRegionId: link.spatial_region_id,
        linkKind: link.link_kind,
        state: link.state,
        replacesLinkId: link.replaces_link_id,
        supersededByLinkId: link.superseded_by_link_id,
        reason: link.reason,
        createdByAuthUserId: link.created_by_auth_user_id,
        createdAt: link.created_at,
        supersededAt: link.superseded_at,
      })),
      evidenceRefinements: (refinementResult.data ?? []).map((refinement) => ({
        id: refinement.id,
        reviewId: refinement.review_id,
        regionId: refinement.region_id,
        mappedLinkId: refinement.mapped_link_id,
        mappedFieldPath: refinement.mapped_field_path,
        decision: refinement.decision,
        basis: refinement.basis,
        actorAuthUserId: refinement.actor_auth_user_id,
        createdAt: refinement.created_at,
      })),
      evidenceEvents: (evidenceEventResult.data ?? []).map((event) => ({
        id: event.id,
        reviewId: event.review_id,
        reviewRevisionId: event.review_revision_id,
        fieldPath: event.field_path,
        eventType: event.event_type,
        previousLinkId: event.previous_link_id,
        newLinkId: event.new_link_id,
        reason: event.reason,
        actorAuthUserId: event.actor_auth_user_id,
        createdAt: event.created_at,
      })),
    };
  },

  async listProfileVersions(organizationId: string, personId: string): Promise<ProfileVersionView[]> {
    const { data, error } = await supabase.from("professional_profiles")
      .select("id, profile_version, profile_data, review_status, source_document_id, processing_attempt_id, approved_by_auth_user_id, approved_at, created_at, superseded_at, publication_origin, restored_from_profile_id, source_document_snapshot")
      .eq("organization_id", organizationId).eq("person_id", personId).order("profile_version", { ascending: false });
    throwIfError(error, "Não foi possível carregar as versões do Perfil Prisma.");
    return (data ?? []).map((profile) => ({
      id: profile.id,
      profileVersion: profile.profile_version,
      profileData: decodeReviewDraft(profile.profile_data),
      reviewStatus: profile.review_status,
      sourceDocumentId: profile.source_document_id,
      origin: profile.publication_origin,
      restoredFromProfileId: profile.restored_from_profile_id,
      sourceDocumentName: isRecord(profile.source_document_snapshot) && typeof profile.source_document_snapshot.filename === "string" ? profile.source_document_snapshot.filename : null,
      processingAttemptId: profile.processing_attempt_id,
      approvedByAuthUserId: profile.approved_by_auth_user_id,
      approvedAt: profile.approved_at,
      createdAt: profile.created_at,
      supersededAt: profile.superseded_at,
    }));
  },

  async createPrivateDownloadUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 30 * 60);
    throwIfError(error, "Não foi possível autorizar o download temporário.");
    if (!data) throw new Error("O download temporário não recebeu uma URL válida.");
    return data.signedUrl;
  },
};

async function persistExtraction(
  organizationId: string,
  personId: string,
  documentId: string,
  pages: ExtractedPage[],
  draft: StructuredDraft,
  pagesNative: number,
  pagesOcr: number,
  idempotencyKey: string,
  retryOfAttemptId: string | null,
) {
  const pagePayload = pages.map((page) => ({
    page_number: page.pageNumber,
    text_content: page.text,
    origin: page.origin,
    useful_character_count: page.usefulCharacterCount,
    method: page.method,
    method_version: page.methodVersion,
    layout_blocks: page.layoutLines ?? [],
    field_evidence: page.fieldEvidence ?? [],
  })) as unknown as Json;
  const { data, error } = await supabase.rpc("persist_person_extraction", {
    p_organization_id: organizationId,
    p_person_id: personId,
    p_document_id: documentId,
    p_pages: pagePayload,
    p_draft: draft as unknown as Json,
    p_pages_native: pagesNative,
    p_pages_ocr: pagesOcr,
    p_native_extraction_version: NATIVE_EXTRACTION_VERSION,
    p_ocr_version: pagesOcr > 0 ? OCR_VERSION : null,
    p_structuring_version: STRUCTURING_VERSION,
    p_draft_version: EXTRACTION_DRAFT_VERSION,
    p_idempotency_key: idempotencyKey,
    p_retry_of_attempt_id: retryOfAttemptId,
  });
  throwIfError(error, "Não foi possível persistir atomicamente a extração.");
  if (!data?.[0]?.processing_attempt_id) throw new Error("A extração foi persistida sem identificar a tentativa de processamento.");
}

async function registerDocument(input: {
  organizationId: string;
  personId: string;
  sourceType: "manual_text" | "resume_pdf";
  filename: string;
  declaredMimeType: string;
  validatedMimeType: string;
  checksum: string;
  byteSize: number;
  pageCount: number;
  extractionVersion: string;
  idempotencyKey: string;
}): Promise<{ documentId: string; documentVersion: number; storagePath: string | null }> {
  const { data, error } = await supabase.rpc("register_person_document", {
    p_organization_id: input.organizationId,
    p_person_id: input.personId,
    p_source_type: input.sourceType,
    p_filename: input.filename,
    p_declared_mime_type: input.declaredMimeType,
    p_validated_mime_type: input.validatedMimeType,
    p_checksum_sha256: input.checksum,
    p_byte_size: input.byteSize,
    p_page_count: input.pageCount,
    p_extraction_version: input.extractionVersion,
    p_idempotency_key: input.idempotencyKey,
  });
  throwIfError(error, "Não foi possível registrar e versionar o documento.");
  const document = data?.[0];
  if (!document) throw new Error("O registro do documento não retornou identificador.");
  return { documentId: document.document_id, documentVersion: document.document_version, storagePath: document.storage_path };
}

async function recordFailure(
  organizationId: string,
  personId: string,
  documentId: string,
  state: "failed_validation" | "failed_extraction" | "failed_ocr" | "failed_structuring",
  code: string,
  message: string,
  idempotencyKey = createOperationKey("record-failure"),
): Promise<void> {
  const { error } = await supabase.rpc("record_document_failure", {
    p_organization_id: organizationId,
    p_person_id: personId,
    p_document_id: documentId,
    p_failure_state: state,
    p_failure_code: code,
    p_failure_message: message,
    p_idempotency_key: idempotencyKey,
  });
  throwIfError(error, "Não foi possível preservar a falha de processamento.");
}

async function identifyResumeIntake(
  organizationId: string,
  intakeId: string,
  storagePath: string,
  identity: ResumeIdentity,
  reused: boolean,
): Promise<ResumeIntakeIdentityResult> {
  const { data, error } = await supabase.rpc("identify_resume_intake", {
    p_organization_id: organizationId,
    p_intake_id: intakeId,
    p_detected_name: identity.fullName,
    p_detected_email: identity.email,
    p_detected_phone: identity.phone,
  });
  throwIfError(error, "Não foi possível verificar a identidade do currículo.");
  const identified = data?.[0];
  if (!identified) throw new Error("A verificação de identidade não retornou resultado.");
  return {
    kind: "identity",
    intakeId,
    storagePath,
    status: identified.intake_status,
    identityResult: identified.identity_result,
    candidates: decodeDuplicateCandidates(identified.candidates),
    reused,
  };
}

async function processResolvedIntake(
  organizationId: string,
  input: ProcessedDocumentInput,
  result: ResumeIntakeResolutionResult,
  onProgress?: (progress: ResumeProcessingProgress) => void,
): Promise<ResumeIntakeResolutionResult> {
  try {
    onProgress?.({ stage: "structuring", message: "Estruturando as informações profissionais recuperadas." });
    const extraction = await buildOrganizationAdaptiveExtraction(organizationId, input.pages);
    onProgress?.({ stage: "persisting", message: "Preservando páginas, campos extraídos e evidências para revisão." });
    await persistExtraction(
      organizationId,
      result.personId,
      result.documentId,
      attachFieldEvidence(input.pages, extraction.fieldEvidence),
      extraction.draft,
      input.nativePageCount,
      input.ocrPageCount,
      `resume-intake-extraction:${result.intakeId}`,
      null,
    );
    const { error: completeError } = await supabase.rpc("complete_resume_intake", {
      p_organization_id: organizationId,
      p_intake_id: result.intakeId,
      p_document_id: result.documentId,
    });
    throwIfError(completeError, "O currículo foi processado, mas o intake não pôde ser concluído.");
    onProgress?.({ stage: "ready_for_review", message: "Análise concluída. O documento está pronto para revisão." });
    return result;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha no processamento posterior à resolução de identidade.";
    await recordFailure(
      organizationId,
      result.personId,
      result.documentId,
      "failed_structuring",
      "resume_intake_processing_failed",
      message,
      `resume-intake-failure:${result.intakeId}`,
    ).catch(() => undefined);
    await failResumeIntake(organizationId, result.intakeId, "resume_intake_processing_failed", message).catch(() => undefined);
    throw caught;
  }
}

async function failResumeIntake(organizationId: string, intakeId: string, code: string, message: string): Promise<void> {
  const { error } = await supabase.rpc("fail_resume_intake", {
    p_organization_id: organizationId,
    p_intake_id: intakeId,
    p_error_code: code,
    p_error_message: message,
  });
  throwIfError(error, "Não foi possível registrar a falha da importação.");
}

function decodeDuplicateCandidates(value: Json): ResumeDuplicateCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.person_id !== "string" || typeof candidate.full_name !== "string") return [];
    const reasons = Array.isArray(candidate.reasons)
      ? candidate.reasons.filter((reason): reason is ResumeDuplicateCandidate["reasons"][number] =>
        reason === "same_email" || reason === "same_phone" || reason === "same_name")
      : [];
    return [{
      personId: candidate.person_id,
      fullName: candidate.full_name,
      email: typeof candidate.email === "string" ? candidate.email : null,
      phone: typeof candidate.phone === "string" ? candidate.phone : null,
      reasons,
      strong: candidate.strong === true,
    }];
  });
}

function isResolvedIdentityType(value: string): value is "created_new_person" | "linked_existing_person" {
  return value === "created_new_person" || value === "linked_existing_person";
}

function toPersonSummary(person: {
  id: string;
  organization_id: string;
  full_name: string;
  lifecycle: string;
  profile_state: PersonProfileState;
  latest_source_type: "manual_text" | "resume_pdf" | null;
  latest_source_at: string | null;
  updated_at: string;
}, privateRow?: Partial<{
  email: string | null;
  phone_e164: string | null;
  phone_country_iso2: string | null;
  phone_country_label: string | null;
  phone_country_code: string | null;
  phone_national_number: string | null;
  birth_date: string | null;
  city: string | null;
  country_code: string | null;
  notes: string | null;
}>, context: { currentProfile: CurrentProfileSummary | null; documents: PersonDocumentTimelineItem[] } = { currentProfile: null, documents: [] }): PersonWorkspaceSummary {
  return {
    id: person.id,
    organizationId: person.organization_id,
    fullName: person.full_name,
    lifecycle: person.lifecycle,
    profileState: person.profile_state,
    latestSourceType: person.latest_source_type,
    latestSourceAt: person.latest_source_at,
    updatedAt: person.updated_at,
    currentProfile: context.currentProfile,
    latestDocument: context.documents[0] ?? null,
    documentCount: context.documents.length,
    pendingReviewCount: countPendingReviews(context.documents),
    privateData: {
      fullName: person.full_name,
      email: privateRow?.email ?? "",
      phoneCountryIso2: privateRow?.phone_country_iso2 ?? "BR",
      phoneCountryLabel: privateRow?.phone_country_label ?? "Brasil",
      phoneCountryCode: privateRow?.phone_country_code ?? "+55",
      phoneNationalNumber: privateRow?.phone_national_number ?? "",
      phoneE164: privateRow?.phone_e164 ?? "",
      birthDate: privateRow?.birth_date ?? null,
      city: privateRow?.city ?? "",
      countryCode: privateRow?.country_code ?? "BR",
      notes: privateRow?.notes ?? "",
    },
  };
}

function publicationOperationKey(reviewId: string, mode: ProfilePublicationMode, decisions: ProfileBlockDecision[]): string {
  const fingerprint = decisions.map((item) => `${item.fieldPath}:${item.action}:${item.targetBlockId ?? ""}`).sort().join("|") || "automatic";
  const storageKey = `prisma.profile-publication.${reviewId}.${mode}.${fingerprint}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `publish-review:${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function stableSessionOperationKey(storageKey: string, scope: string): string {
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = `${scope}:${crypto.randomUUID()}`;
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function toCurrentProfileSummary(profile: {
  id: string;
  profile_version: number;
  source_document_id: string | null;
  approved_at: string | null;
  created_at: string;
}): CurrentProfileSummary {
  return {
    id: profile.id,
    profileVersion: profile.profile_version,
    sourceDocumentId: profile.source_document_id,
    approvedAt: profile.approved_at,
    createdAt: profile.created_at,
  };
}

type ProcessingAttemptRow = {
  id: string;
  document_id: string;
  attempt_number: number;
  state: ProcessingAttemptView["state"];
  current_method: string;
  pages_native: number;
  pages_ocr: number;
  useful_character_count: number;
  failure_code: string | null;
  failure_message: string | null;
  started_at: string;
  completed_at: string | null;
};

function latestAttemptsByDocument(attempts: ProcessingAttemptRow[]): Map<string, ProcessingAttemptView> {
  const latest = new Map<string, ProcessingAttemptView>();
  for (const attempt of attempts) {
    if (!latest.has(attempt.document_id)) latest.set(attempt.document_id, toAttemptView(attempt));
  }
  return latest;
}

function reviewAttemptsByDocument(attempts: ProcessingAttemptRow[]): Map<string, ProcessingAttemptView> {
  const reviewable = new Map<string, ProcessingAttemptView>();
  for (const attempt of attempts) {
    if (reviewable.has(attempt.document_id)) continue;
    const candidate = toAttemptView(attempt);
    if (isRecoverableReviewAttempt(candidate)) reviewable.set(attempt.document_id, candidate);
  }
  return reviewable;
}

function toTimelineItem(document: {
  id: string;
  filename: string;
  source_type: PersonDocumentTimelineItem["sourceType"];
  document_version: number;
  byte_size: number | null;
  page_count: number | null;
  status: string;
  review_state: PersonDocumentTimelineItem["reviewState"];
  created_at: string;
  processed_at: string | null;
  is_legacy_unstored: boolean;
}, latestAttempts: Map<string, ProcessingAttemptView>, reviewAttempts: Map<string, ProcessingAttemptView>, profiles: Map<string, number>, reviews: Map<string, string> = new Map()): PersonDocumentTimelineItem {
  return {
    id: document.id,
    filename: document.filename,
    sourceType: document.source_type,
    documentVersion: document.document_version,
    byteSize: document.byte_size,
    pageCount: document.page_count,
    status: document.status,
    reviewState: document.review_state,
    createdAt: document.created_at,
    processedAt: document.processed_at,
    profileVersion: profiles.get(document.id) ?? null,
    verificationReviewId: reviews.get(document.id) ?? null,
    isLegacyUnstored: document.is_legacy_unstored,
    latestAttempt: latestAttempts.get(document.id) ?? null,
    reviewAttempt: reviewAttempts.get(document.id) ?? null,
  };
}

function toAttemptView(attempt: {
  id: string;
  attempt_number: number;
  state: ProcessingAttemptView["state"];
  current_method: string;
  pages_native: number;
  pages_ocr: number;
  useful_character_count: number;
  failure_code: string | null;
  failure_message: string | null;
  started_at: string;
  completed_at: string | null;
}): ProcessingAttemptView {
  return {
    id: attempt.id,
    attemptNumber: attempt.attempt_number,
    state: attempt.state,
    currentMethod: attempt.current_method,
    pagesNative: attempt.pages_native,
    pagesOcr: attempt.pages_ocr,
    usefulCharacterCount: attempt.useful_character_count,
    failureCode: attempt.failure_code,
    failureMessage: attempt.failure_message,
    startedAt: attempt.started_at,
    completedAt: attempt.completed_at,
  };
}

async function loadOrganizationExtractionPatterns(organizationId: string): Promise<ExtractionPatternSignal[]> {
  const { data, error } = await supabase.from("organization_extraction_patterns")
    .select("pattern_key, method_version, confirmation_count")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("confirmation_count", { ascending: false })
    .limit(100);
  throwIfError(error, "Não foi possível carregar os padrões de extração aprovados desta organização.");
  return (data ?? []).map((pattern) => ({
    patternKey: pattern.pattern_key,
    methodVersion: pattern.method_version,
    confirmationCount: pattern.confirmation_count,
  }));
}

async function loadOrganizationCustomSections(organizationId: string): Promise<LearnedCustomSectionDefinition[]> {
  const { data, error } = await supabase.from("organization_custom_section_definitions")
    .select("section_key, display_name, normalized_name, format, confirmation_count, method_version")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("confirmation_count", { ascending: false })
    .limit(100);
  throwIfError(error, "Não foi possível carregar as áreas personalizadas aprendidas desta organização.");
  return (data ?? []).flatMap((definition) => {
    if ((definition.format !== "text" && definition.format !== "list")
      || definition.method_version !== CUSTOM_PROFILE_SECTION_METHOD_VERSION) return [];
    return [{
      sectionKey: definition.section_key,
      displayName: definition.display_name,
      normalizedName: definition.normalized_name,
      format: definition.format,
      confirmationCount: definition.confirmation_count,
      methodVersion: definition.method_version,
    }];
  });
}

async function buildOrganizationAdaptiveExtraction(organizationId: string, pages: ExtractedPage[]) {
  const [patterns, customSections] = await Promise.all([
    loadOrganizationExtractionPatterns(organizationId),
    loadOrganizationCustomSections(organizationId),
  ]);
  return buildAdaptiveExtraction(pages, patterns, customSections);
}

function decodeAdaptiveSuggestionMetadata(value: Json): ProfileReviewWorkspace["adaptationEvents"][number]["acceptedSuggestions"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)
      || typeof item.fieldPath !== "string"
      || typeof item.pageNumber !== "number"
      || (item.evidenceMethod !== "pdfjs-layout-v1" && item.evidenceMethod !== "tesseract-layout-v1" && item.evidenceMethod !== "text-line-v1")
      || item.rationaleCode !== "same-document-block-pattern") return [];
    return [{
      fieldPath: item.fieldPath,
      pageNumber: item.pageNumber,
      evidenceMethod: item.evidenceMethod,
      rationaleCode: item.rationaleCode,
    }];
  });
}

function decodeDraft(identifiedFields: Json, uncertainties: Json, notIdentified: Json): StructuredDraft {
  const value = identifiedFields as unknown as Partial<StructuredDraft>;
  const identity: Record<string, Json> = isRecord(value.identity) ? value.identity : {};
  const contact: Record<string, Json> = isRecord(value.contact) ? value.contact : {};
  return {
    identity: { fullName: typeof identity.fullName === "string" ? identity.fullName : null },
    contact: {
      city: typeof contact.city === "string" ? contact.city : null,
      state: typeof contact.state === "string" ? contact.state : null,
      phone: typeof contact.phone === "string" ? contact.phone : null,
      email: typeof contact.email === "string" ? contact.email : null,
      linkedin: typeof contact.linkedin === "string" ? contact.linkedin : null,
    },
    professionalTitle: typeof value.professionalTitle === "string" ? value.professionalTitle : null,
    areasOfExpertise: Array.isArray(value.areasOfExpertise) ? value.areasOfExpertise.filter((item): item is string => typeof item === "string") : [],
    professionalObjective: typeof value.professionalObjective === "string" ? value.professionalObjective : null,
    summary: typeof value.summary === "string" ? value.summary : null,
    keyResults: Array.isArray(value.keyResults) ? value.keyResults.flatMap((item) => (
      item && typeof item === "object" && "id" in item && "value" in item
        && typeof item.id === "string" && typeof item.value === "string"
        ? [{ id: item.id, value: item.value }]
        : []
    )) : [],
    experiences: Array.isArray(value.experiences) ? value.experiences.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<StructuredDraft["experiences"][number]>;
      return [{
        id: typeof candidate.id === "string" ? candidate.id : legacyReviewEntityIdFromValue("experience", index, {
          role: candidate.role, organization: candidate.organization, period: candidate.period,
        }),
        source: candidate.source === "human" ? "human" : "extracted",
        role: typeof candidate.role === "string" ? candidate.role : null,
        organization: typeof candidate.organization === "string" ? candidate.organization : null,
        period: typeof candidate.period === "string" ? candidate.period : null,
        description: typeof candidate.description === "string" ? candidate.description : null,
        evidenceText: typeof candidate.evidenceText === "string" ? candidate.evidenceText : "",
        page: typeof candidate.page === "number" ? candidate.page : null,
      }];
    }) : [],
    education: Array.isArray(value.education) ? value.education.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<StructuredDraft["education"][number]>;
      const classification = resolveEducationClassification(candidate);
      return [{
        id: typeof candidate.id === "string" ? candidate.id : legacyReviewEntityIdFromValue("education", index, {
          course: candidate.course, institution: candidate.institution, period: candidate.period,
        }),
        source: candidate.source === "human" ? "human" : "extracted",
        course: typeof candidate.course === "string" ? candidate.course : null,
        institution: typeof candidate.institution === "string" ? candidate.institution : null,
        period: typeof candidate.period === "string" ? candidate.period : null,
        description: typeof candidate.description === "string" ? candidate.description : null,
        evidenceText: typeof candidate.evidenceText === "string" ? candidate.evidenceText : "",
        page: typeof candidate.page === "number" ? candidate.page : null,
        ...classification,
      }];
    }) : [],
    certifications: Array.isArray(value.certifications) ? value.certifications : [],
    languages: Array.isArray(value.languages) ? value.languages : [],
    competencies: Array.isArray(value.competencies) ? value.competencies : [],
    customSections: Array.isArray(value.customSections) ? value.customSections : [],
    uncertainties: Array.isArray(uncertainties) ? uncertainties.filter((item): item is string => typeof item === "string") : [],
    notIdentified: Array.isArray(notIdentified) ? notIdentified.filter((item): item is string => typeof item === "string") : [],
  };
}

function decodeReviewDraft(value: Json, legacyFallback?: StructuredDraft, replaceLegacyGeneratedSummary = false): StructuredDraft {
  const record = isRecord(value) ? value : {};
  const decoded = decodeDraft(
    record as Json,
    Array.isArray(record.uncertainties) ? record.uncertainties as Json : [],
    Array.isArray(record.notIdentified) ? record.notIdentified as Json : [],
  );
  if (!legacyFallback || record.identity || record.contact || "professionalTitle" in record) return decoded;
  return {
    ...decoded,
    identity: legacyFallback.identity,
    contact: legacyFallback.contact,
    professionalTitle: legacyFallback.professionalTitle,
    areasOfExpertise: legacyFallback.areasOfExpertise,
    professionalObjective: legacyFallback.professionalObjective,
    summary: replaceLegacyGeneratedSummary ? legacyFallback.summary : decoded.summary,
    keyResults: legacyFallback.keyResults,
  };
}

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createOperationKey(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}

function automaticReviewChangeReason(): string {
  return "Alteração registrada pelo operador; valores anterior e novo preservados no histórico.";
}

function automaticEvidenceReason(action: ReviewEvidenceAction, pageNumber: number): string {
  switch (action) {
    case "correct_current_field":
      return `Campo corrigido com evidência da página ${pageNumber}; valores anterior e novo preservados.`;
    case "add_complementary":
      return `Evidência complementar adicionada a partir da página ${pageNumber}.`;
    case "replace_review_evidence":
      return `Evidência ativa substituída por região da página ${pageNumber}.`;
    case "create_new_information":
      return `Nova informação criada com evidência da página ${pageNumber}.`;
  }
}

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function throwIfError(error: { message: string; code?: string; details?: string | null; hint?: string | null } | null, message: string): void {
  if (error) throw supabaseOperationError(error, message);
}

function throwReviewError(error: { message: string; code?: string; details?: string | null; hint?: string | null } | null, message: string): void {
  if (!error) return;
  throw reviewOperationError(error, message);
}

function throwResolutionError(error: { message: string; code?: string } | null, message: string): void {
  if (!error) return;
  if (error.code === "23505" || /already resolved|another decision|idempotency/i.test(error.message)) {
    throw reviewOperationError({ ...error, message: "idempotency_conflict" }, message);
  }
  throw supabaseOperationError(error, message);
}
