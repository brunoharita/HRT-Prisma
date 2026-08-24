export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      organization_groups: Table<{
        id: string;
        name: string;
        slug: string;
        created_at: string;
        updated_at: string;
      }>;
      organizations: Table<{ id: string; name: string; group_id: string; created_at: string; updated_at: string }>;
      organization_memberships: Table<{
        id: string;
        organization_id: string;
        user_id: string;
        role: Database["public"]["Enums"]["membership_role"];
        created_at: string;
      }>;
      platform_users: Table<{
        id: string;
        auth_user_id: string;
        full_name: string;
        username: string;
        email: string;
        phone_e164: string | null;
        phone_country_iso2: string | null;
        phone_country_label: string | null;
        phone_country_code: string | null;
        phone_national_number: string | null;
        access_profile: Database["public"]["Enums"]["membership_role"];
        group_id: string | null;
        status: Database["public"]["Enums"]["platform_user_status"];
        credential_mode: Database["public"]["Enums"]["platform_credential_mode"];
        must_change_password: boolean;
        first_access_completed_at: string | null;
        last_login_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      people: Table<{
        id: string;
        organization_id: string;
        full_name: string;
        lifecycle: string;
        profile_state: Database["public"]["Enums"]["person_profile_state"];
        latest_source_type: Database["public"]["Enums"]["document_source_type"] | null;
        latest_source_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      vacancies: Table<{
        id: string;
        organization_id: string;
        position_id: string | null;
        job_role_id: string;
        title: string;
        status: string;
        context_overrides: Json;
        created_at: string;
        updated_at: string;
      }>;
      professional_profiles: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        source_document_id: string;
        profile_data: Json;
        uncertainties: Json;
        not_identified: Json;
        extraction_version: string;
        inference_version: string;
        embedding_version: string;
        prompt_version: string;
        model_version: string;
        processing_attempt_id: string | null;
        profile_version: number;
        review_status: string;
        created_at: string;
        superseded_at: string | null;
      }>;
      evidence: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        kind: string;
        fact: string;
        source_page: number | null;
        source_block: string;
        quoted_text: string;
        extraction_version: string;
        processing_attempt_id: string | null;
        extraction_origin: Database["public"]["Enums"]["page_extraction_origin"] | null;
        method: string | null;
        method_version: string | null;
        source_offset_start: number | null;
        source_offset_end: number | null;
        created_at: string;
      }>;
      inferences: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        inference_type: string;
        value: string;
        rationale: string;
        inference_version: string;
        created_at: string;
      }>;
      competencies: Table<{
        id: string;
        organization_id: string;
        normalized_name: string;
        competency_type: string;
        created_at: string;
      }>;
      profile_competencies: Table<{
        id: string;
        organization_id: string;
        profile_id: string;
        competency_id: string;
        classification: Database["public"]["Enums"]["knowledge_classification"];
        context: Json;
        created_at: string;
      }>;
      person_private_data: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        email: string | null;
        phone: string | null;
        location: string | null;
        phone_e164: string | null;
        phone_country_iso2: string | null;
        phone_country_label: string | null;
        phone_country_code: string | null;
        phone_national_number: string | null;
        birth_date: string | null;
        city: string | null;
        country_code: string | null;
        notes: string | null;
        additional_data: Json;
        created_at: string;
        updated_at: string;
      }>;
      documents: Table<{
        id: string;
        organization_id: string;
        person_id: string | null;
        filename: string;
        media_type: string;
        storage_path: string | null;
        checksum_sha256: string;
        status: string;
        failure_category: string | null;
        failure_reason: string | null;
        failure_technical_message: string | null;
        can_reprocess: boolean | null;
        extraction_version: string;
        processed_at: string | null;
        created_at: string;
        updated_at: string;
        source_type: Database["public"]["Enums"]["document_source_type"];
        original_filename: string | null;
        declared_mime_type: string | null;
        validated_mime_type: string | null;
        byte_size: number | null;
        page_count: number | null;
        actor_auth_user_id: string | null;
        document_version: number;
        storage_bucket: string | null;
        is_legacy_unstored: boolean;
      }>;
      document_processing_attempts: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        attempt_number: number;
        state: Database["public"]["Enums"]["processing_state"];
        native_extraction_version: string;
        ocr_version: string | null;
        structuring_version: string;
        current_method: string;
        pages_native: number;
        pages_ocr: number;
        useful_character_count: number;
        failure_code: string | null;
        failure_message: string | null;
        can_reprocess: boolean;
        started_at: string;
        completed_at: string | null;
        updated_at: string;
      }>;
      document_page_extractions: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        processing_attempt_id: string;
        page_number: number;
        origin: Database["public"]["Enums"]["page_extraction_origin"];
        text_content: string;
        useful_character_count: number;
        method: string;
        method_version: string;
        created_at: string;
      }>;
      extraction_drafts: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        processing_attempt_id: string;
        draft_version: string;
        validation_status: string;
        identified_fields: Json;
        uncertainties: Json;
        not_identified: Json;
        validated_at: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      persist_person_extraction: {
        Args: {
          p_organization_id: string;
          p_person_id: string;
          p_document_id: string;
          p_pages: Json;
          p_draft: Json;
          p_pages_native: number;
          p_pages_ocr: number;
          p_native_extraction_version: string;
          p_ocr_version: string | null;
          p_structuring_version: string;
          p_draft_version: string;
        };
        Returns: Array<{ processing_attempt_id: string; structured: boolean }>;
      };
    };
    Enums: {
      membership_role: "super_admin" | "owner" | "admin" | "recruiter" | "member";
      knowledge_classification: "explicit" | "inferred";
      platform_credential_mode: "manual_password" | "activation_link";
      platform_user_status: "pending_first_access" | "active" | "inactive" | "blocked";
      person_profile_state: "not_generated" | "building" | "generated" | "requires_attention" | "processing_failed";
      document_source_type: "manual_text" | "resume_pdf";
      processing_state:
        | "uploaded"
        | "validated"
        | "extracting_native"
        | "native_extracted"
        | "ocr_required"
        | "ocr_processing"
        | "extracted"
        | "structuring"
        | "structured"
        | "profile_ready"
        | "completed"
        | "failed_validation"
        | "failed_extraction"
        | "failed_ocr"
        | "failed_structuring";
      page_extraction_origin: "native_pdf" | "ocr" | "manual_text";
    };
    CompositeTypes: Record<string, never>;
  };
}
