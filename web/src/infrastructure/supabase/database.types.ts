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
      organizations: Table<{ id: string; name: string; created_at: string; updated_at: string }>;
      organization_memberships: Table<{
        id: string;
        organization_id: string;
        user_id: string;
        role: Database["public"]["Enums"]["membership_role"];
        created_at: string;
      }>;
      people: Table<{
        id: string;
        organization_id: string;
        full_name: string;
        lifecycle: string;
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
        additional_data: Json;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      membership_role: "admin" | "recruiter" | "hiring_manager";
      knowledge_classification: "explicit" | "inferred";
    };
    CompositeTypes: Record<string, never>;
  };
}
