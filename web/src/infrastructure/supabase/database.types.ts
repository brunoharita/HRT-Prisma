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
        review_id: string | null;
        approved_by_auth_user_id: string | null;
        approved_at: string | null;
        base_profile_id: string | null;
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
        state_code: string | null;
        country_code: string | null;
        linkedin_url: string | null;
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
        review_state: Database["public"]["Enums"]["document_review_state"];
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
        retry_of_attempt_id: string | null;
        actor_auth_user_id: string | null;
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
        layout_blocks: Json;
        field_evidence: Json;
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
      person_ingestion_events: Table<{
        id: number;
        organization_id: string;
        person_id: string | null;
        document_id: string | null;
        processing_attempt_id: string | null;
        actor_auth_user_id: string | null;
        event_type: string;
        result: "success" | "failure" | "denied";
        error_code: string | null;
        duration_ms: number | null;
        metadata: Json;
        created_at: string;
      }>;
      document_operations: Table<{
        id: string;
        organization_id: string;
        person_id: string | null;
        document_id: string | null;
        processing_attempt_id: string | null;
        review_id: string | null;
        profile_id: string | null;
        operation_type: string;
        idempotency_key: string;
        request_fingerprint: string;
        status: Database["public"]["Enums"]["document_operation_status"];
        result: Json;
        error_code: string | null;
        actor_auth_user_id: string;
        started_at: string;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      profile_reviews: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        processing_attempt_id: string;
        base_profile_id: string | null;
        base_profile_version: number | null;
        approved_profile_id: string | null;
        state: Database["public"]["Enums"]["profile_review_state"];
        extracted_data: Json;
        reviewed_data: Json;
        lock_version: number;
        started_by_auth_user_id: string;
        last_edited_by_auth_user_id: string;
        approved_by_auth_user_id: string | null;
        approved_at: string | null;
        invalidated_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      profile_review_revisions: Table<{
        id: string;
        organization_id: string;
        review_id: string;
        revision_number: number;
        reviewed_data: Json;
        change_reason: string | null;
        actor_auth_user_id: string;
        created_at: string;
      }>;
      profile_review_changes: Table<{
        id: number;
        organization_id: string;
        review_id: string;
        review_revision_id: string;
        field_path: string;
        extracted_value: Json;
        previous_value: Json;
        reviewed_value: Json;
        reason: string;
        actor_auth_user_id: string;
        created_at: string;
      }>;
      spatial_evidence_regions: Table<{
        id: string;
        organization_id: string;
        person_id: string;
        document_id: string;
        document_version: number;
        review_id: string;
        page_number: number;
        x: number;
        y: number;
        width: number;
        height: number;
        coordinate_system: "normalized-page-v1";
        raw_selected_text: string | null;
        selected_text: string | null;
        extraction_method: "pdfjs-text-layer-v1" | "pdfjs-character-region-v2" | "tesseract-region-v1" | "manual-region-v1";
        source: "system" | "human";
        contract_version: "1.0.0" | "1.1.0" | "1.2.0";
        created_by_auth_user_id: string | null;
        created_at: string;
      }>;
      profile_review_evidence_links: Table<{
        id: string;
        organization_id: string;
        review_id: string;
        field_path: string;
        evidence_id: string | null;
        spatial_region_id: string | null;
        link_kind: "original" | "reviewer" | "complementary";
        state: "active" | "superseded";
        replaces_link_id: string | null;
        superseded_by_link_id: string | null;
        reason: string | null;
        created_by_auth_user_id: string;
        created_at: string;
        superseded_at: string | null;
      }>;
      profile_review_evidence_refinements: Table<{
        id: number;
        organization_id: string;
        review_id: string;
        region_id: string;
        mapped_link_id: string;
        mapped_field_path: string;
        decision: "excluded" | "included";
        basis: "same-record-spatial-overlap";
        actor_auth_user_id: string;
        created_at: string;
      }>;
      profile_review_evidence_events: Table<{
        id: number;
        organization_id: string;
        review_id: string;
        review_revision_id: string;
        field_path: string;
        event_type: "human_region_added" | "review_evidence_replaced" | "complementary_evidence_added" | "new_information_created" | "review_evidence_removed";
        previous_link_id: string | null;
        new_link_id: string | null;
        reason: string;
        actor_auth_user_id: string;
        created_at: string;
      }>;
      profile_review_adaptation_events: Table<{
        id: string;
        organization_id: string;
        review_id: string;
        review_revision_id: string;
        source_field_path: string;
        pattern_key: string;
        method_version: "prisma-document-learning-v2" | "prisma-document-learning-v3";
        algorithm_version: string;
        signature_version: string | null;
        anchor_experience_id: string | null;
        signature_summary: Json;
        candidate_summary: Json;
        accepted_suggestions: Json;
        idempotency_key: string;
        request_fingerprint: string;
        lock_version: number;
        actor_auth_user_id: string;
        created_at: string;
      }>;
      extraction_learning_cases: Table<{
        id: string;
        organization_id: string;
        review_id: string;
        evidence_event_id: number | null;
        adaptation_event_id: string | null;
        field_path: string;
        learning_scope: "document_local" | "evaluation_candidate";
        status: "candidate" | "approved" | "rejected";
        source_contract_version: string;
        reviewed_contract_version: string;
        pattern_key: string | null;
        source_method_version: string | null;
        approved_at: string | null;
        created_at: string;
      }>;
      organization_extraction_patterns: Table<{
        id: string;
        organization_id: string;
        pattern_key: string;
        method_version: "prisma-document-learning-v2" | "prisma-document-learning-v3";
        status: "active" | "retired";
        confirmation_count: number;
        first_confirmed_at: string;
        last_confirmed_at: string;
        created_at: string;
        updated_at: string;
      }>;
      organization_custom_section_definitions: Table<{
        id: string;
        organization_id: string;
        section_key: string;
        display_name: string;
        normalized_name: string;
        format: "text" | "list";
        method_version: "prisma-custom-section-learning-v1";
        contract_version: "1.0.0";
        status: "active" | "retired";
        confirmation_count: number;
        first_confirmed_at: string;
        last_confirmed_at: string;
        created_at: string;
        updated_at: string;
      }>;
      organization_custom_section_confirmations: Table<{
        id: string;
        organization_id: string;
        definition_id: string;
        review_id: string;
        section_key: string;
        method_version: "prisma-custom-section-learning-v1";
        contract_version: "1.0.0";
        confirmed_at: string;
      }>;
      resume_intakes: Table<{
        id: string;
        organization_id: string;
        idempotency_key: string;
        request_fingerprint: string;
        identity_fingerprint: string | null;
        resolution_idempotency_key: string | null;
        resolution_fingerprint: string | null;
        status: Database["public"]["Enums"]["resume_intake_status"];
        source_type: Database["public"]["Enums"]["document_source_type"];
        filename: string;
        declared_mime_type: string;
        validated_mime_type: string;
        storage_bucket: string;
        storage_path: string;
        checksum_sha256: string;
        byte_size: number;
        page_count: number;
        extraction_version: string;
        detected_name: string | null;
        detected_email: string | null;
        detected_phone: string | null;
        normalized_name: string | null;
        normalized_email: string | null;
        normalized_phone: string | null;
        resolved_person_id: string | null;
        resolved_document_id: string | null;
        resolution_type: Database["public"]["Enums"]["resume_identity_resolution"] | null;
        actor_auth_user_id: string;
        resolved_by_auth_user_id: string | null;
        resolved_at: string | null;
        error_code: string | null;
        error_message: string | null;
        created_at: string;
        updated_at: string;
      }>;
      knowledge_sources: Table<{
        id: string; name: string; domain: string; source_class: Database["public"]["Enums"]["knowledge_source_class"];
        publisher: string; method: string; allowed_scope: Database["public"]["Enums"]["knowledge_scope"];
        status: Database["public"]["Enums"]["knowledge_status"]; license: string | null;
        attribution_requirements: string | null; last_verified_at: string | null;
        monitoring_enabled: boolean; monitor_strategy: string | null; monitor_url: string | null;
        monitor_status: string; detected_version: string | null; detected_release_date: string | null;
        detected_fingerprint: string | null; last_checked_at: string | null; last_successful_check_at: string | null;
        next_check_at: string | null; consecutive_check_failures: number; last_check_error_code: string | null;
        approved_by_auth_user_id: string | null; created_at: string; updated_at: string;
      }>;
      knowledge_source_checks: Table<{
        id: string; source_id: string; invocation_type: string; attempt: number; status: string;
        detected_version: string | null; detected_release_date: string | null; detected_fingerprint: string | null;
        artifacts: Json; error_code: string | null; monitor_version: string; idempotency_key: string;
        started_at: string; completed_at: string; created_at: string;
      }>;
      knowledge_source_versions: Table<{
        id: string; source_id: string; external_version: string; release_date: string | null; retrieval_date: string | null;
        checksum_sha256: string | null; format: string; license: string | null; import_status: string;
        counts: Json; warnings: Json; previous_version_id: string | null; raw_storage_path: string | null;
        created_at: string; published_at: string | null; official_url: string | null; manifest: Json;
        validation_summary: Json; is_current: boolean; validated_at: string | null; staged_at: string | null;
      }>;
      knowledge_concepts: Table<{
        id: string; scope: Database["public"]["Enums"]["knowledge_scope"]; organization_id: string | null;
        concept_type: Database["public"]["Enums"]["knowledge_concept_type"]; canonical_label: string;
        description: string; language: string; status: Database["public"]["Enums"]["knowledge_status"];
        version: number; change_set_id: string | null; provenance: Json; created_by_auth_user_id: string | null;
        approved_by_auth_user_id: string | null; created_at: string; updated_at: string;
      }>;
      knowledge_inbox: Table<{
        id: string; scope: Database["public"]["Enums"]["knowledge_scope"]; organization_id: string | null;
        fingerprint: string; original_term: string; normalized_search_term: string; language: string;
        first_seen_at: string; last_seen_at: string; occurrence_count: number;
        status: Database["public"]["Enums"]["knowledge_inbox_status"];
        candidate_concept_ids: string[]; evidence_reference_ids: string[]; cooldown_until: string | null;
        created_by_auth_user_id: string | null; observation_ids: string[];
      }>;
      knowledge_terms: Table<{
        id: string; concept_id: string; scope: Database["public"]["Enums"]["knowledge_scope"];
        organization_id: string | null; term: string; normalized_term: string; language: string;
        term_type: string; source_id: string | null; source_version_id: string | null;
        status: Database["public"]["Enums"]["knowledge_status"]; ambiguous: boolean; version: number;
        approved_by_auth_user_id: string | null; created_at: string;
      }>;
      knowledge_relations: Table<{
        id: string; source_concept_id: string; target_concept_id: string;
        relation_type: Database["public"]["Enums"]["knowledge_relation_type"];
        scope: Database["public"]["Enums"]["knowledge_scope"]; organization_id: string | null;
        source_id: string | null; source_version_id: string | null; provenance: Json;
        status: Database["public"]["Enums"]["knowledge_status"]; version: number;
        approved_by_auth_user_id: string | null; created_at: string;
      }>;
      knowledge_external_mappings: Table<{
        id: string; concept_id: string; source_id: string; source_version_id: string;
        external_id: string; external_uri: string | null;
        mapping_type: Database["public"]["Enums"]["knowledge_mapping_type"]; provenance: Json; created_at: string;
      }>;
      knowledge_observations: Table<{
        id: string; organization_id: string; person_id: string; evidence_id: string | null;
        profile_id: string | null; review_id: string | null; evidence_link_id: string | null;
        source_field_path: string | null; original_term: string; normalized_term: string; language: string;
        resolution_state: string; concept_id: string | null; candidate_concept_ids: string[];
        normalization_method: string; knowledge_global_version: number; knowledge_organization_version: number | null;
        resolution_source_version_id: string | null; resolution_method_version: string;
        resolved_at: string | null; resolved_by_auth_user_id: string | null; created_at: string;
      }>;
      knowledge_proposals: Table<{
        id: string; inbox_id: string; research_run_id: string | null; scope: Database["public"]["Enums"]["knowledge_scope"];
        organization_id: string | null; proposal_type: string; target_concept_id: string | null;
        original_proposal: Json; human_edited_proposal: Json | null; status: string; provider: string | null;
        model: string | null; prompt_version: string | null; output_schema_version: string | null;
        source_policy_version: string | null; created_at: string; decided_at: string | null;
        decided_by_auth_user_id: string | null; decision_reason: string | null; published_concept_id: string | null;
      }>;
      organization_knowledge_settings: Table<{
        organization_id: string; allow_external_knowledge_enrichment: boolean;
        reinterpretation_policy: Database["public"]["Enums"]["knowledge_reinterpretation_policy"];
        custom_interval: string | null; inherit_global: boolean; source_check_frequency: string;
        updated_by_auth_user_id: string | null; updated_at: string;
      }>;
      knowledge_reinterpretation_impacts: Table<{
        id: string; organization_id: string; person_id: string; profile_id: string; change_set_id: string;
        concept_id: string; policy: Database["public"]["Enums"]["knowledge_reinterpretation_policy"];
        status: string; created_at: string; updated_at: string;
      }>;
    };
      assessment_ai_budget_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_auth_user_id: string
          entry_type: string
          generation_request_id: string | null
          id: number
          model: string | null
          organization_id: string
          provider: string | null
          usage_metadata: Json
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_auth_user_id: string
          entry_type: string
          generation_request_id?: string | null
          id?: never
          model?: string | null
          organization_id: string
          provider?: string | null
          usage_metadata?: Json
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_auth_user_id?: string
          entry_type?: string
          generation_request_id?: string | null
          id?: never
          model?: string | null
          organization_id?: string
          provider?: string | null
          usage_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_ai_budget_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_ai_budget_ledger_organization_id_generation_req_fkey"
            columns: ["organization_id", "generation_request_id"]
            isOneToOne: false
            referencedRelation: "assessment_item_generation_requests"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      assessment_ai_policies: {
        Row: {
          allow_pii: boolean
          allow_web_search: boolean
          allowed_competencies: Json
          budget_alert_percent: number
          cooldown_seconds: number
          generation_enabled: boolean
          id: string
          maximum_cost_per_request_cents: number | null
          maximum_items_per_request: number
          maximum_requests_per_day: number
          model: string | null
          monthly_limit_cents: number | null
          organization_id: string
          policy_version: string
          provider: string | null
          require_human_review: boolean
          updated_at: string
          updated_by_auth_user_id: string | null
        }
        Insert: {
          allow_pii?: boolean
          allow_web_search?: boolean
          allowed_competencies?: Json
          budget_alert_percent?: number
          cooldown_seconds?: number
          generation_enabled?: boolean
          id?: string
          maximum_cost_per_request_cents?: number | null
          maximum_items_per_request?: number
          maximum_requests_per_day?: number
          model?: string | null
          monthly_limit_cents?: number | null
          organization_id: string
          policy_version?: string
          provider?: string | null
          require_human_review?: boolean
          updated_at?: string
          updated_by_auth_user_id?: string | null
        }
        Update: {
          allow_pii?: boolean
          allow_web_search?: boolean
          allowed_competencies?: Json
          budget_alert_percent?: number
          cooldown_seconds?: number
          generation_enabled?: boolean
          id?: string
          maximum_cost_per_request_cents?: number | null
          maximum_items_per_request?: number
          maximum_requests_per_day?: number
          model?: string | null
          monthly_limit_cents?: number | null
          organization_id?: string
          policy_version?: string
          provider?: string | null
          require_human_review?: boolean
          updated_at?: string
          updated_by_auth_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_ai_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_calibration_snapshots: {
        Row: {
          analytics_version: string
          answer_change_rate: number | null
          application_count: number
          assessment_item_id: string
          calculated_at: string
          calibration_state: string
          correct_rate: number | null
          created_at: string
          excluded_technical_incident_count: number
          id: string
          median_time_seconds: number | null
          observed_difficulty: number | null
          omission_rate: number | null
          organization_id: string | null
          p25_time_seconds: number | null
          p75_time_seconds: number | null
          reason_codes: Json
          sample_kind: string
        }
        Insert: {
          analytics_version?: string
          answer_change_rate?: number | null
          application_count?: number
          assessment_item_id: string
          calculated_at?: string
          calibration_state: string
          correct_rate?: number | null
          created_at?: string
          excluded_technical_incident_count?: number
          id?: string
          median_time_seconds?: number | null
          observed_difficulty?: number | null
          omission_rate?: number | null
          organization_id?: string | null
          p25_time_seconds?: number | null
          p75_time_seconds?: number | null
          reason_codes: Json
          sample_kind: string
        }
        Update: {
          analytics_version?: string
          answer_change_rate?: number | null
          application_count?: number
          assessment_item_id?: string
          calculated_at?: string
          calibration_state?: string
          correct_rate?: number | null
          created_at?: string
          excluded_technical_incident_count?: number
          id?: string
          median_time_seconds?: number | null
          observed_difficulty?: number | null
          omission_rate?: number | null
          organization_id?: string | null
          p25_time_seconds?: number | null
          p75_time_seconds?: number | null
          reason_codes?: Json
          sample_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_calibration_snapshots_assessment_item_id_fkey"
            columns: ["assessment_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_item_calibration_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_generation_needs: {
        Row: {
          analysis_version: string
          blueprint_id: string
          competency_key: string
          created_at: string
          created_by_auth_user_id: string
          deficit: number
          dimension: string
          eligible_items: number
          id: string
          language: string
          modality: string
          organization_id: string
          reason_codes: Json
          required_items: number
          status: string
          target_level: string
          updated_at: string
        }
        Insert: {
          analysis_version?: string
          blueprint_id: string
          competency_key: string
          created_at?: string
          created_by_auth_user_id: string
          deficit: number
          dimension: string
          eligible_items: number
          id?: string
          language?: string
          modality?: string
          organization_id: string
          reason_codes: Json
          required_items: number
          status?: string
          target_level: string
          updated_at?: string
        }
        Update: {
          analysis_version?: string
          blueprint_id?: string
          competency_key?: string
          created_at?: string
          created_by_auth_user_id?: string
          deficit?: number
          dimension?: string
          eligible_items?: number
          id?: string
          language?: string
          modality?: string
          organization_id?: string
          reason_codes?: Json
          required_items?: number
          status?: string
          target_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_generation_needs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_item_generation_needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_generation_proposals: {
        Row: {
          content_fingerprint: string
          created_at: string
          duplicate_candidates: Json
          generation_request_id: string
          id: string
          maximum_lexical_similarity: number
          organization_id: string
          proposal_sequence: number
          proposed_item: Json
          provider_provenance: Json
          status: string
          updated_at: string
          validation_result: Json
        }
        Insert: {
          content_fingerprint: string
          created_at?: string
          duplicate_candidates?: Json
          generation_request_id: string
          id?: string
          maximum_lexical_similarity?: number
          organization_id: string
          proposal_sequence: number
          proposed_item: Json
          provider_provenance: Json
          status?: string
          updated_at?: string
          validation_result: Json
        }
        Update: {
          content_fingerprint?: string
          created_at?: string
          duplicate_candidates?: Json
          generation_request_id?: string
          id?: string
          maximum_lexical_similarity?: number
          organization_id?: string
          proposal_sequence?: number
          proposed_item?: Json
          provider_provenance?: Json
          status?: string
          updated_at?: string
          validation_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_generation_pr_organization_id_generation_r_fkey"
            columns: ["organization_id", "generation_request_id"]
            isOneToOne: false
            referencedRelation: "assessment_item_generation_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "assessment_item_generation_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_generation_requests: {
        Row: {
          actual_cost_cents: number | null
          completed_at: string | null
          created_at: string
          created_by_auth_user_id: string
          directives: Json
          estimated_cost_cents: number | null
          generation_need_id: string
          id: string
          idempotency_key: string
          model: string | null
          organization_id: string
          prompt_version: string
          provider: string
          requested_quantity: number
          schema_version: string
          status: string
          target_scope: string
        }
        Insert: {
          actual_cost_cents?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_auth_user_id: string
          directives?: Json
          estimated_cost_cents?: number | null
          generation_need_id: string
          id?: string
          idempotency_key: string
          model?: string | null
          organization_id: string
          prompt_version: string
          provider: string
          requested_quantity: number
          schema_version?: string
          status?: string
          target_scope: string
        }
        Update: {
          actual_cost_cents?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_auth_user_id?: string
          directives?: Json
          estimated_cost_cents?: number | null
          generation_need_id?: string
          id?: string
          idempotency_key?: string
          model?: string | null
          organization_id?: string
          prompt_version?: string
          provider?: string
          requested_quantity?: number
          schema_version?: string
          status?: string
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_generation_re_organization_id_generation_n_fkey"
            columns: ["organization_id", "generation_need_id"]
            isOneToOne: false
            referencedRelation: "assessment_item_generation_needs"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "assessment_item_generation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_generation_reviews: {
        Row: {
          created_at: string
          decision: string
          id: number
          organization_id: string
          proposal_id: string
          rationale: string
          review_version: string
          reviewed_snapshot: Json
          reviewer_auth_user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: never
          organization_id: string
          proposal_id: string
          rationale: string
          review_version?: string
          reviewed_snapshot: Json
          reviewer_auth_user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: never
          organization_id?: string
          proposal_id?: string
          rationale?: string
          review_version?: string
          reviewed_snapshot?: Json
          reviewer_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_generation_rev_organization_id_proposal_id_fkey"
            columns: ["organization_id", "proposal_id"]
            isOneToOne: false
            referencedRelation: "assessment_item_generation_proposals"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "assessment_item_generation_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_quality_flags: {
        Row: {
          assessment_item_id: string
          created_at: string
          evidence: Json
          flag_code: string
          id: string
          organization_id: string | null
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          assessment_item_id: string
          created_at?: string
          evidence?: Json
          flag_code: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
        }
        Update: {
          assessment_item_id?: string
          created_at?: string
          evidence?: Json
          flag_code?: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_quality_flags_assessment_item_id_fkey"
            columns: ["assessment_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_item_quality_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    Views: Record<string, never>;
    Functions: {
      start_resume_intake: {
        Args: {
          p_organization_id: string;
          p_filename: string;
          p_declared_mime_type: string;
          p_validated_mime_type: string;
          p_checksum_sha256: string;
          p_byte_size: number;
          p_page_count: number;
          p_extraction_version: string;
          p_idempotency_key: string;
        };
        Returns: Array<{
          intake_id: string;
          storage_path: string;
          intake_status: Database["public"]["Enums"]["resume_intake_status"];
          resolved_person_id: string | null;
          resolved_document_id: string | null;
          document_version: number | null;
          resolution_type: Database["public"]["Enums"]["resume_identity_resolution"] | null;
          reused: boolean;
        }>;
      };
      identify_resume_intake: {
        Args: { p_organization_id: string; p_intake_id: string; p_detected_name: string | null; p_detected_email: string | null; p_detected_phone: string | null };
        Returns: Array<{ intake_status: Database["public"]["Enums"]["resume_intake_status"]; identity_result: Database["public"]["Enums"]["resume_identity_resolution"] | null; candidates: Json }>;
      };
      resolve_resume_intake: {
        Args: { p_organization_id: string; p_intake_id: string; p_resolution_action: string; p_existing_person_id: string | null; p_idempotency_key: string };
        Returns: Array<{ person_id: string; document_id: string; document_version: number; resolution_type: Database["public"]["Enums"]["resume_identity_resolution"]; reused: boolean }>;
      };
      complete_resume_intake: {
        Args: { p_organization_id: string; p_intake_id: string; p_document_id: string };
        Returns: Database["public"]["Enums"]["resume_intake_status"];
      };
      fail_resume_intake: {
        Args: { p_organization_id: string; p_intake_id: string; p_error_code: string; p_error_message: string };
        Returns: Database["public"]["Enums"]["resume_intake_status"];
      };
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
          p_idempotency_key: string;
          p_retry_of_attempt_id: string | null;
        };
        Returns: Array<{ processing_attempt_id: string; structured: boolean; attempt_number: number; reused: boolean }>;
      };
      register_person_document: {
        Args: {
          p_organization_id: string;
          p_person_id: string;
          p_source_type: Database["public"]["Enums"]["document_source_type"];
          p_filename: string;
          p_declared_mime_type: string;
          p_validated_mime_type: string;
          p_checksum_sha256: string;
          p_byte_size: number;
          p_page_count: number;
          p_extraction_version: string;
          p_idempotency_key: string;
        };
        Returns: Array<{ document_id: string; document_version: number; storage_path: string | null; reused: boolean }>;
      };
      record_document_failure: {
        Args: {
          p_organization_id: string;
          p_person_id: string;
          p_document_id: string;
          p_failure_state: Database["public"]["Enums"]["processing_state"];
          p_failure_code: string;
          p_failure_message: string;
          p_idempotency_key: string;
        };
        Returns: Array<{ processing_attempt_id: string; attempt_number: number; reused: boolean }>;
      };
      start_profile_review: {
        Args: { p_organization_id: string; p_person_id: string; p_document_id: string; p_processing_attempt_id: string; p_idempotency_key: string };
        Returns: Array<{ review_id: string; lock_version: number; reused: boolean }>;
      };
      save_profile_review: {
        Args: { p_organization_id: string; p_review_id: string; p_expected_lock_version: number; p_reviewed_data: Json; p_reason: string; p_idempotency_key: string };
        Returns: Array<{ review_id: string; lock_version: number; reused: boolean }>;
      };
      approve_profile_review: {
        Args: { p_organization_id: string; p_review_id: string; p_expected_lock_version: number; p_idempotency_key: string };
        Returns: Array<{ review_id: string; profile_id: string; profile_version: number; reused: boolean }>;
      };
      publish_profile_review: {
        Args: { p_organization_id: string; p_review_id: string; p_expected_lock_version: number; p_explicit_removals: Json; p_idempotency_key: string };
        Returns: Array<{ review_id: string; profile_id: string; profile_version: number; reused: boolean }>;
      };
      invalidate_document_review: {
        Args: { p_organization_id: string; p_document_id: string; p_idempotency_key: string };
        Returns: Array<{ document_id: string; review_id: string | null; reused: boolean }>;
      };
      record_profile_review_evidence: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_expected_lock_version: number;
          p_field_path: string;
          p_action: "correct_current_field" | "add_complementary" | "replace_review_evidence" | "create_new_information";
          p_document_version: number;
          p_page_number: number;
          p_x: number;
          p_y: number;
          p_width: number;
          p_height: number;
          p_selected_text: string | null;
          p_extraction_method: "pdfjs-text-layer-v1" | "pdfjs-character-region-v2" | "tesseract-region-v1" | "manual-region-v1";
          p_reviewed_data: Json | null;
          p_reason: string | null;
          p_replaces_link_id: string | null;
          p_idempotency_key: string;
        };
        Returns: Array<{ review_id: string; lock_version: number; region_id: string; link_id: string; reused: boolean }>;
      };
      record_profile_review_evidence_refined: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_expected_lock_version: number;
          p_field_path: string;
          p_action: "correct_current_field" | "add_complementary" | "replace_review_evidence" | "create_new_information";
          p_document_version: number;
          p_page_number: number;
          p_x: number;
          p_y: number;
          p_width: number;
          p_height: number;
          p_raw_selected_text: string | null;
          p_selected_text: string | null;
          p_extraction_method: "pdfjs-text-layer-v1" | "pdfjs-character-region-v2" | "tesseract-region-v1" | "manual-region-v1";
          p_refinement_decisions: Json;
          p_reviewed_data: Json | null;
          p_reason: string | null;
          p_replaces_link_id: string | null;
          p_idempotency_key: string;
        };
        Returns: Array<{ review_id: string; lock_version: number; region_id: string; link_id: string; reused: boolean }>;
      };
      retire_profile_review_evidence: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_expected_lock_version: number;
          p_link_id: string;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Array<{ review_id: string; lock_version: number; reused: boolean }>;
      };
      apply_profile_review_adaptive_suggestions: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_expected_lock_version: number;
          p_reviewed_data: Json;
          p_source_field_path: string;
          p_pattern_key: string;
          p_method_version: "prisma-document-learning-v2";
          p_accepted_suggestions: Json;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Array<{ review_id: string; lock_version: number; adaptation_event_id: string; reused: boolean }>;
      };
      apply_profile_review_adaptive_suggestions_v3: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_expected_lock_version: number;
          p_reviewed_data: Json;
          p_source_field_path: string;
          p_pattern_key: string;
          p_method_version: "prisma-document-learning-v3";
          p_algorithm_version: string;
          p_signature_version: string;
          p_anchor_experience_id: string;
          p_signature_summary: Json;
          p_candidate_summary: Json;
          p_accepted_suggestions: Json;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Array<{ review_id: string; lock_version: number; adaptation_event_id: string; reused: boolean }>;
      };
      record_profile_review_sibling_scan: {
        Args: {
          p_organization_id: string;
          p_review_id: string;
          p_anchor_experience_id: string;
          p_method_version: "prisma-document-learning-v3";
          p_algorithm_version: string;
          p_signature_version: string;
          p_signature_summary: Json;
          p_candidate_summary: Json;
          p_decision: "detected" | "discarded";
          p_idempotency_key: string;
        };
        Returns: Array<{ event_id: number; reused: boolean }>;
      };
      approve_knowledge_proposal: {
        Args: { p_proposal_id: string; p_human_edited_proposal?: Json | null; p_decision_reason?: string | null };
        Returns: Array<{ proposal_id: string; concept_id: string; knowledge_version: number; reused: boolean }>;
      };
      dispatch_knowledge_reinterpretation: {
        Args: { p_organization_id: string; p_impact_id: string; p_idempotency_key: string };
        Returns: Array<{ job_id: string; status: string; reused: boolean }>;
      };
      suggest_knowledge_concepts: {
        Args: { p_organization_id: string; p_query: string; p_limit?: number };
        Returns: Array<{ concept_id: string; canonical_label: string; concept_type: Database["public"]["Enums"]["knowledge_concept_type"];
          concept_scope: Database["public"]["Enums"]["knowledge_scope"]; description: string; aliases: string[];
          source_name: string | null; source_version: string | null; external_id: string | null; external_uri: string | null; suggestion_method: string }>;
      };
      resolve_knowledge_inbox_alias: {
        Args: { p_inbox_id: string; p_concept_id: string; p_scope: Database["public"]["Enums"]["knowledge_scope"]; p_reason: string };
        Returns: Array<{ inbox_id: string; concept_id: string; knowledge_version: number; observations_updated: number }>;
      };
      propose_knowledge_concept_from_inbox: {
        Args: { p_inbox_id: string; p_scope: Database["public"]["Enums"]["knowledge_scope"]; p_canonical_label: string;
          p_concept_type: Database["public"]["Enums"]["knowledge_concept_type"]; p_description: string; p_reason: string };
        Returns: string;
      };
      search_people_by_knowledge_concept: {
        Args: { p_organization_id: string; p_query: string };
        Returns: Array<{ person_id: string; profile_id: string; full_name: string; concept_id: string; canonical_label: string;
          observed_terms: string[]; source_name: string | null; source_version: string | null; external_id: string | null; external_uri: string | null }>;
      };
    };
      complete_m51c_external_generation: {
        Args: { p_proposals: Json; p_request_id: string; p_usage: Json }
        Returns: Json
      }
      create_m51c_fake_generation_request: {
        Args: {
          p_blueprint_id: string
          p_dimension: string
          p_idempotency_key: string
          p_organization_id: string
          p_quantity: number
          p_target_scope: string
        }
        Returns: Json
      }
      fail_m51c_external_generation: {
        Args: { p_error_class: string; p_request_id: string }
        Returns: Json
      }
      load_m51c_item_bank_workspace: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      publish_m51c_approved_proposals: {
        Args: { p_organization_id: string; p_proposal_ids: string[] }
        Returns: Json
      }
      refresh_m51c_synthetic_item_analytics: {
        Args: { p_assessment_item_id: string; p_organization_id: string }
        Returns: Json
      }
      request_m51c_item_generation: {
        Args: {
          p_estimated_cost_cents: number
          p_generation_need_id: string
          p_idempotency_key: string
          p_organization_id: string
          p_quantity: number
          p_target_scope: string
        }
        Returns: Json
      }
      review_m51c_item_proposal: {
        Args: { p_decision: string; p_proposal_id: string; p_rationale: string }
        Returns: Json
      }
    Enums: {
      membership_role: "super_admin" | "owner" | "admin" | "recruiter" | "member";
      knowledge_classification: "explicit" | "inferred";
      knowledge_scope: "global" | "organization";
      knowledge_status: "draft" | "approved" | "deprecated" | "rejected";
      knowledge_concept_type: "occupation" | "skill" | "knowledge" | "technology" | "methodology" | "certification";
      knowledge_relation_type: "is_a" | "part_of" | "related_to" | "requires" | "uses" | "applies_to" | "supports" | "equivalent_to" | "broader_than" | "narrower_than";
      knowledge_mapping_type: "exact" | "close" | "broader" | "narrower" | "related";
      knowledge_source_class: "official_occupational_taxonomy" | "official_vendor_documentation" | "official_certification_issuer" | "official_standard_body" | "official_government_or_public_body" | "recognized_nonprofit_foundation" | "secondary_recognized_source";
      knowledge_inbox_status: "unresolved" | "research_queued" | "researching" | "proposal_ready" | "awaiting_human_review" | "approved" | "rejected" | "ambiguous" | "deferred" | "failed" | "budget_limited";
      knowledge_reinterpretation_policy: "off" | "manual" | "daily" | "weekly" | "monthly" | "custom";
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
      document_status: "pending" | "processing" | "processed" | "extraction_failed" | "needs_manual_review" | "unsupported_format" | "received" | "ready_for_review" | "in_review" | "approved" | "failed";
      document_review_state: "not_ready" | "ready_for_review" | "in_review" | "approved" | "invalidated";
      document_operation_status: "started" | "completed" | "failed";
      profile_review_state: "draft" | "approved" | "invalidated";
      resume_intake_status:
        | "file_received"
        | "extracting_identity"
        | "needs_human_identity"
        | "needs_duplicate_resolution"
        | "ready_to_resolve"
        | "processing"
        | "ready_for_review"
        | "completed"
        | "failed";
      resume_identity_resolution:
        | "created_new_person"
        | "linked_existing_person"
        | "needs_human_identity"
        | "needs_duplicate_resolution"
        | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
}
