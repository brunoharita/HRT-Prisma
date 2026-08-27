import type { Json } from "./database.types";
import { supabase } from "./client";
import type { ResumeIdentity } from "../../../../src/domain/resumeIdentity.js";
import {
  EXTRACTION_DRAFT_VERSION,
  NATIVE_EXTRACTION_VERSION,
  OCR_VERSION,
  STRUCTURING_VERSION,
  buildDeterministicDraft,
  processManualText,
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
  type ResumeDuplicateCandidate,
  type ResumeIntakeIdentityResult,
  type ResumeIntakeResolutionResult,
  type StructuredDraft,
} from "../../domain/personIngestion";
import type {
  NormalizedPageRegion,
  RegionExtractionMethod,
  ReviewEvidenceAction,
} from "../../domain/spatialEvidence";

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
    return processResolvedIntake(organizationId, input, result);
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
    const { data: privateRows, error: privateError } = includePrivateData
      ? await supabase
        .from("person_private_data")
        .select("person_id, email, phone_e164, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, birth_date, city, country_code, notes")
        .eq("organization_id", organizationId)
        .in("person_id", rows.map((person) => person.id))
      : { data: [], error: null };
    throwIfError(privateError, "Não foi possível carregar os dados privados permitidos.");
    const privateByPerson = new Map((privateRows ?? []).map((row) => [row.person_id, row]));
    const normalizedSearch = normalizeSearch(search);
    return rows.map((person) => toPersonSummary(person, privateByPerson.get(person.id)))
      .filter((person) => !normalizedSearch || normalizeSearch([
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
    const [privateResult, documentResult, profileResult] = await Promise.all([
      supabase.from("person_private_data")
        .select("person_id, email, phone_e164, phone_country_iso2, phone_country_label, phone_country_code, phone_national_number, birth_date, city, country_code, notes")
        .eq("organization_id", organizationId).eq("person_id", personId).maybeSingle(),
      supabase.from("documents")
        .select("id, filename, source_type, document_version, byte_size, page_count, status, review_state, created_at, processed_at, is_legacy_unstored")
        .eq("organization_id", organizationId).eq("person_id", personId).order("created_at", { ascending: false }),
      supabase.from("professional_profiles")
        .select("source_document_id, profile_version")
        .eq("organization_id", organizationId).eq("person_id", personId),
    ]);
    throwIfError(privateResult.error, "Não foi possível carregar os dados básicos da Pessoa.");
    throwIfError(documentResult.error, "Não foi possível carregar a linha do tempo documental.");
    throwIfError(profileResult.error, "Não foi possível carregar as versões de perfil.");
    const documents = documentResult.data ?? [];
    const documentIds = documents.map((document) => document.id);
    const { data: attemptRows, error: attemptError } = documentIds.length === 0
      ? { data: [], error: null }
      : await supabase.from("document_processing_attempts")
        .select("id, document_id, attempt_number, state, current_method, pages_native, pages_ocr, useful_character_count, failure_code, failure_message, started_at, completed_at")
        .eq("organization_id", organizationId).in("document_id", documentIds).order("attempt_number", { ascending: false });
    throwIfError(attemptError, "Não foi possível carregar as tentativas de processamento.");
    const latestAttemptByDocument = new Map<string, ProcessingAttemptView>();
    for (const attempt of attemptRows ?? []) {
      if (!latestAttemptByDocument.has(attempt.document_id)) latestAttemptByDocument.set(attempt.document_id, toAttemptView(attempt));
    }
    const profileByDocument = new Map((profileResult.data ?? []).map((profile) => [profile.source_document_id, profile.profile_version]));
    const timeline = documents.map((document) => ({
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
      profileVersion: profileByDocument.get(document.id) ?? null,
      isLegacyUnstored: document.is_legacy_unstored,
      latestAttempt: latestAttemptByDocument.get(document.id) ?? null,
    } satisfies PersonDocumentTimelineItem));
    const selectedDocument = timeline.find((document) => document.id === selectedDocumentId) ?? timeline[0] ?? null;
    const attemptId = selectedDocument?.latestAttempt?.id;
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
      person: toPersonSummary(person, privateResult.data ?? undefined),
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
    const draft = buildDeterministicDraft(input.pages);
    await persistExtraction(organizationId, personId, document.documentId, input.pages, draft, input.nativePageCount, input.ocrPageCount, createOperationKey("pdf-extraction"), null);
    return document.documentId;
  },

  async reprocessDocument(organizationId: string, personId: string, documentId: string): Promise<void> {
    const { data: previousAttempt, error: attemptError } = await supabase.from("document_processing_attempts")
      .select("id").eq("organization_id", organizationId).eq("document_id", documentId)
      .order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    throwIfError(attemptError, "Não foi possível localizar a tentativa anterior.");
    if (!previousAttempt) throw new Error("O documento ainda não possui extração preservada para reprocessar.");
    const { data: pageRows, error: pageError } = await supabase.from("document_page_extractions")
      .select("page_number, text_content, origin, useful_character_count, method, method_version")
      .eq("organization_id", organizationId).eq("processing_attempt_id", previousAttempt.id).order("page_number");
    throwIfError(pageError, "Não foi possível recuperar a extração anterior.");
    const pages: ExtractedPage[] = (pageRows ?? []).map((page) => ({
      pageNumber: page.page_number,
      text: page.text_content,
      origin: page.origin,
      usefulCharacterCount: page.useful_character_count,
      method: page.method,
      methodVersion: page.method_version,
    }));
    if (pages.length === 0) throw new Error("A tentativa anterior não possui páginas extraídas válidas.");
    await persistExtraction(
      organizationId,
      personId,
      documentId,
      pages,
      buildDeterministicDraft(pages),
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
    reason: string,
  ): Promise<number> {
    const { data, error } = await supabase.rpc("save_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_reviewed_data: reviewedData as unknown as Json,
      p_reason: reason,
      p_idempotency_key: createOperationKey("save-review"),
    });
    throwReviewError(error, "Não foi possível salvar o rascunho da revisão.");
    const lockVersion = data?.[0]?.lock_version;
    if (!lockVersion) throw new Error("A revisão foi salva sem versão de concorrência.");
    return lockVersion;
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
    selectedText: string | null;
    extractionMethod: RegionExtractionMethod;
    reviewedData: StructuredDraft | null;
    reason: string | null;
    replacesLinkId: string | null;
  }): Promise<{ lockVersion: number; regionId: string; linkId: string }> {
    const { data, error } = await supabase.rpc("record_profile_review_evidence", {
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
      p_selected_text: input.selectedText,
      p_extraction_method: input.extractionMethod,
      p_reviewed_data: input.reviewedData as unknown as Json | null,
      p_reason: input.reason,
      p_replaces_link_id: input.replacesLinkId,
      p_idempotency_key: createOperationKey("record-review-evidence"),
    });
    throwReviewError(error, "Não foi possível registrar a evidência da revisão.");
    const result = data?.[0];
    if (!result) throw new Error("A evidência foi registrada sem confirmação persistida.");
    return { lockVersion: result.lock_version, regionId: result.region_id, linkId: result.link_id };
  },

  async approveProfileReview(organizationId: string, reviewId: string, expectedLockVersion: number): Promise<{ profileId: string; profileVersion: number }> {
    const { data, error } = await supabase.rpc("approve_profile_review", {
      p_organization_id: organizationId,
      p_review_id: reviewId,
      p_expected_lock_version: expectedLockVersion,
      p_idempotency_key: createOperationKey("approve-review"),
    });
    throwReviewError(error, "Não foi possível aprovar a versão revisada.");
    const approved = data?.[0];
    if (!approved) throw new Error("A aprovação não retornou a versão persistida.");
    return { profileId: approved.profile_id, profileVersion: approved.profile_version };
  },

  async listDocumentOperations(organizationId: string): Promise<DocumentOperationSummary[]> {
    const [documentResult, peopleResult, profileResult] = await Promise.all([
      supabase.from("documents")
        .select("id, person_id, filename, source_type, document_version, byte_size, page_count, status, review_state, failure_category, created_at, processed_at, is_legacy_unstored")
        .eq("organization_id", organizationId).not("person_id", "is", null).order("created_at", { ascending: false }),
      supabase.from("people").select("id, full_name").eq("organization_id", organizationId),
      supabase.from("professional_profiles").select("source_document_id, profile_version")
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
    const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.source_document_id, profile.profile_version]));
    const latestAttempts = new Map<string, ProcessingAttemptView>();
    for (const attempt of attempts ?? []) {
      if (!latestAttempts.has(attempt.document_id)) latestAttempts.set(attempt.document_id, toAttemptView(attempt));
    }
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
      isLegacyUnstored: document.is_legacy_unstored,
      latestAttempt: latestAttempts.get(document.id) ?? null,
    } satisfies DocumentOperationSummary] : []);
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
      documentResult,
      revisionResult,
      changeResult,
      evidenceResult,
      regionResult,
      linkResult,
      evidenceEventResult,
    ] = await Promise.all([
      supabase.from("people").select("full_name").eq("organization_id", organizationId).eq("id", review.person_id).single(),
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
        .select("id, organization_id, person_id, document_id, document_version, review_id, page_number, x, y, width, height, coordinate_system, selected_text, extraction_method, source, contract_version, created_by_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at"),
      supabase.from("profile_review_evidence_links")
        .select("id, review_id, field_path, evidence_id, spatial_region_id, link_kind, state, replaces_link_id, superseded_by_link_id, reason, created_by_auth_user_id, created_at, superseded_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at"),
      supabase.from("profile_review_evidence_events")
        .select("id, review_id, review_revision_id, field_path, event_type, previous_link_id, new_link_id, reason, actor_auth_user_id, created_at")
        .eq("organization_id", organizationId).eq("review_id", reviewId).order("created_at", { ascending: false }),
    ]);
    throwIfError(personResult.error, "Não foi possível carregar a Pessoa da revisão.");
    throwIfError(documentResult.error, "Não foi possível carregar o documento da revisão.");
    throwIfError(revisionResult.error, "Não foi possível carregar as revisões salvas.");
    throwIfError(changeResult.error, "Não foi possível carregar as correções da revisão.");
    throwIfError(evidenceResult.error, "Não foi possível carregar as evidências originais da revisão.");
    throwIfError(regionResult.error, "Não foi possível carregar as regiões espaciais da revisão.");
    throwIfError(linkResult.error, "Não foi possível carregar os vínculos de evidência da revisão.");
    throwIfError(evidenceEventResult.error, "Não foi possível carregar o histórico de evidências da revisão.");
    if (!personResult.data || !documentResult.data) throw new Error("A revisão perdeu a referência da Pessoa ou do documento.");
    return {
      id: review.id,
      personId: review.person_id,
      personName: personResult.data.full_name,
      documentId: review.document_id,
      documentName: documentResult.data.filename,
      documentVersion: documentResult.data.document_version,
      documentPageCount: documentResult.data.page_count ?? 0,
      documentStoragePath: documentResult.data.storage_path,
      documentSourceType: documentResult.data.source_type,
      processingAttemptId: review.processing_attempt_id,
      state: review.state,
      lockVersion: review.lock_version,
      extractedData: decodeReviewDraft(review.extracted_data),
      reviewedData: decodeReviewDraft(review.reviewed_data),
      baseProfileVersion: review.base_profile_version,
      approvedProfileId: review.approved_profile_id,
      approvedAt: review.approved_at,
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
      .select("id, profile_version, profile_data, review_status, source_document_id, processing_attempt_id, approved_by_auth_user_id, approved_at, created_at, superseded_at")
      .eq("organization_id", organizationId).eq("person_id", personId).order("profile_version", { ascending: false });
    throwIfError(error, "Não foi possível carregar as versões do Perfil Prisma.");
    return (data ?? []).map((profile) => ({
      id: profile.id,
      profileVersion: profile.profile_version,
      profileData: decodeReviewDraft(profile.profile_data),
      reviewStatus: profile.review_status,
      sourceDocumentId: profile.source_document_id,
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
  })) as Json;
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
  if (!data?.[0]?.structured) {
    throw new Error("A fonte foi preservada, mas os dados são insuficientes para gerar um Perfil Prisma.");
  }
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
): Promise<ResumeIntakeResolutionResult> {
  try {
    const draft = buildDeterministicDraft(input.pages);
    await persistExtraction(
      organizationId,
      result.personId,
      result.documentId,
      input.pages,
      draft,
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
}>): PersonWorkspaceSummary {
  return {
    id: person.id,
    organizationId: person.organization_id,
    fullName: person.full_name,
    lifecycle: person.lifecycle,
    profileState: person.profile_state,
    latestSourceType: person.latest_source_type,
    latestSourceAt: person.latest_source_at,
    updatedAt: person.updated_at,
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

function decodeDraft(identifiedFields: Json, uncertainties: Json, notIdentified: Json): StructuredDraft {
  const value = identifiedFields as unknown as Partial<StructuredDraft>;
  return {
    summary: typeof value.summary === "string" ? value.summary : null,
    experiences: Array.isArray(value.experiences) ? value.experiences : [],
    education: Array.isArray(value.education) ? value.education : [],
    certifications: Array.isArray(value.certifications) ? value.certifications : [],
    languages: Array.isArray(value.languages) ? value.languages : [],
    competencies: Array.isArray(value.competencies) ? value.competencies : [],
    uncertainties: Array.isArray(uncertainties) ? uncertainties.filter((item): item is string => typeof item === "string") : [],
    notIdentified: Array.isArray(notIdentified) ? notIdentified.filter((item): item is string => typeof item === "string") : [],
  };
}

function decodeReviewDraft(value: Json): StructuredDraft {
  const record = isRecord(value) ? value : {};
  return decodeDraft(
    record as Json,
    Array.isArray(record.uncertainties) ? record.uncertainties as Json : [],
    Array.isArray(record.notIdentified) ? record.notIdentified as Json : [],
  );
}

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createOperationKey(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
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

function throwIfError(error: { message: string } | null, message: string): void {
  if (error) throw new Error(`${message} ${error.message}`);
}

function throwReviewError(error: { message: string; code?: string } | null, message: string): void {
  if (!error) return;
  if (error.code === "40001" || /review_conflict|profile_base_conflict|processing_base_conflict|serialize/i.test(error.message)) {
    throw new Error("Conflito de revisão: os dados mudaram desde que esta tela foi aberta. Recarregue antes de continuar.");
  }
  throw new Error(`${message} ${error.message}`);
}

function throwResolutionError(error: { message: string; code?: string } | null, message: string): void {
  if (!error) return;
  if (error.code === "23505" || /already resolved|another decision|idempotency/i.test(error.message)) {
    throw new Error("A importação já foi resolvida por outra ação. Atualize a tela antes de continuar.");
  }
  throw new Error(`${message} ${error.message}`);
}
