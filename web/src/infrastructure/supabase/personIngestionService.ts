import type { Json } from "./database.types";
import { supabase } from "./client";
import {
  EXTRACTION_DRAFT_VERSION,
  NATIVE_EXTRACTION_VERSION,
  OCR_VERSION,
  STRUCTURING_VERSION,
  buildDeterministicDraft,
  processManualText,
  type ExtractedPage,
  type PersonDocumentTimelineItem,
  type PersonEditorValue,
  type PersonIngestionWorkspace,
  type PersonProfileState,
  type PersonWorkspaceSummary,
  type ProcessedDocumentInput,
  type ProcessingAttemptView,
  type StructuredDraft,
} from "../../domain/personIngestion";

const DOCUMENT_BUCKET = "person-documents";

export const personIngestionService = {
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
        .select("id, filename, source_type, document_version, byte_size, page_count, status, created_at, processed_at, is_legacy_unstored")
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
    const { data: claims } = await supabase.auth.getClaims();
    const actorAuthUserId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!actorAuthUserId) throw new Error("A sessão expirou antes do processamento.");
    const { page, draft } = processManualText(text);
    const checksum = await sha256Text(text);
    const documentVersion = await nextDocumentVersion(organizationId, personId);
    const { data: document, error } = await supabase.from("documents").insert({
      organization_id: organizationId,
      person_id: personId,
      filename: `texto-manual-v${documentVersion}.txt`,
      media_type: "text/plain",
      storage_path: null,
      checksum_sha256: checksum,
      status: "processing",
      extraction_version: STRUCTURING_VERSION,
      source_type: "manual_text",
      original_filename: null,
      declared_mime_type: "text/plain",
      validated_mime_type: "text/plain",
      byte_size: new TextEncoder().encode(text).byteLength,
      page_count: 1,
      actor_auth_user_id: actorAuthUserId,
      document_version: documentVersion,
      storage_bucket: null,
    }).select("id").single();
    throwIfError(error, "Não foi possível registrar a fonte manual.");
    if (!document) throw new Error("A fonte manual foi registrada sem identificador.");
    await persistExtraction(organizationId, personId, document.id, [page], draft, 1, 0);
    return document.id;
  },

  async processPdf(organizationId: string, personId: string, input: ProcessedDocumentInput): Promise<string> {
    const { data: claims } = await supabase.auth.getClaims();
    const actorAuthUserId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
    if (!actorAuthUserId) throw new Error("A sessão expirou antes do upload.");
    const documentVersion = await nextDocumentVersion(organizationId, personId);
    const internalFilename = `${crypto.randomUUID()}.pdf`;
    const storagePath = `${organizationId}/${personId}/${internalFilename}`;
    const { data: document, error } = await supabase.from("documents").insert({
      organization_id: organizationId,
      person_id: personId,
      filename: input.file.name,
      original_filename: input.file.name,
      media_type: "application/pdf",
      declared_mime_type: input.file.type || "application/pdf",
      validated_mime_type: "application/pdf",
      storage_path: storagePath,
      storage_bucket: DOCUMENT_BUCKET,
      checksum_sha256: input.sha256,
      byte_size: input.file.size,
      page_count: input.pages.length,
      status: "pending",
      extraction_version: NATIVE_EXTRACTION_VERSION,
      source_type: "resume_pdf",
      actor_auth_user_id: actorAuthUserId,
      document_version: documentVersion,
      can_reprocess: true,
    }).select("id").single();
    throwIfError(error, "Não foi possível registrar o PDF validado.");
    if (!document) throw new Error("O PDF foi registrado sem identificador.");
    const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, input.file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) {
      await supabase.from("documents").update({
        status: "extraction_failed",
        failure_category: "storage_upload_failed",
        failure_reason: "O documento foi registrado, mas o upload privado falhou.",
        failure_technical_message: "storage_upload_failed",
        can_reprocess: true,
      }).eq("organization_id", organizationId).eq("id", document.id);
      throw new Error("O upload privado falhou. Nenhum Perfil Prisma foi gerado.");
    }
    const draft = buildDeterministicDraft(input.pages);
    await persistExtraction(organizationId, personId, document.id, input.pages, draft, input.nativePageCount, input.ocrPageCount);
    return document.id;
  },

  async generateProfile(organizationId: string, personId: string, documentId: string): Promise<void> {
    const { data: attempt, error } = await supabase.from("document_processing_attempts")
      .select("id, state").eq("organization_id", organizationId).eq("document_id", documentId)
      .order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    throwIfError(error, "Não foi possível validar a tentativa de processamento.");
    if (!attempt || !["structured", "profile_ready", "completed"].includes(attempt.state)) {
      throw new Error("O processamento ainda não possui um rascunho estrutural válido.");
    }
    const [{ data: draft, error: draftError }, { count, error: countError }] = await Promise.all([
      supabase.from("extraction_drafts").select("identified_fields, uncertainties, not_identified, validation_status")
        .eq("organization_id", organizationId).eq("processing_attempt_id", attempt.id).maybeSingle(),
      supabase.from("professional_profiles").select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId).eq("person_id", personId),
    ]);
    throwIfError(draftError, "Não foi possível validar o Extraction Draft.");
    throwIfError(countError, "Não foi possível definir a versão do Perfil Prisma.");
    if (!draft || draft.validation_status !== "valid") throw new Error("O Extraction Draft é insuficiente ou inválido.");
    const { count: evidenceCount, error: evidenceError } = await supabase.from("evidence")
      .select("id", { count: "exact", head: true }).eq("organization_id", organizationId)
      .eq("document_id", documentId).eq("processing_attempt_id", attempt.id);
    throwIfError(evidenceError, "Não foi possível validar as evidências.");
    if (!evidenceCount) throw new Error("Nenhum fato material possui evidência rastreável.");
    await supabase.from("professional_profiles").update({ superseded_at: new Date().toISOString() })
      .eq("organization_id", organizationId).eq("person_id", personId).is("superseded_at", null);
    const { error: profileError } = await supabase.from("professional_profiles").insert({
      organization_id: organizationId,
      person_id: personId,
      source_document_id: documentId,
      profile_data: draft.identified_fields,
      uncertainties: draft.uncertainties,
      not_identified: draft.not_identified,
      extraction_version: NATIVE_EXTRACTION_VERSION,
      inference_version: "none",
      embedding_version: "none",
      prompt_version: "none",
      model_version: "deterministic",
      processing_attempt_id: attempt.id,
      profile_version: (count ?? 0) + 1,
      review_status: "generated",
    });
    throwIfError(profileError, "Não foi possível persistir a nova versão do Perfil Prisma.");
    await Promise.all([
      supabase.from("document_processing_attempts").update({ state: "completed", current_method: "completed", completed_at: new Date().toISOString() })
        .eq("organization_id", organizationId).eq("id", attempt.id),
      supabase.from("documents").update({ status: "processed", processed_at: new Date().toISOString(), can_reprocess: true })
        .eq("organization_id", organizationId).eq("id", documentId),
      supabase.from("people").update({ profile_state: "generated", updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId).eq("id", personId),
    ]);
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
    );
  },

  async createPrivateDownloadUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 60);
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
  });
  throwIfError(error, "Não foi possível persistir atomicamente a extração.");
  if (!data?.[0]?.structured) {
    throw new Error("A fonte foi preservada, mas os dados são insuficientes para gerar um Perfil Prisma.");
  }
}

async function nextDocumentVersion(organizationId: string, personId: string): Promise<number> {
  const { count, error } = await supabase.from("documents").select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId).eq("person_id", personId);
  throwIfError(error, "Não foi possível versionar a fonte documental.");
  return (count ?? 0) + 1;
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
