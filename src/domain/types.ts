export type UUID = string;

export type DocumentStatus =
  | "pending"
  | "processing"
  | "processed"
  | "extraction_failed"
  | "needs_manual_review"
  | "unsupported_format";

export type FailureCategory =
  | "corrupted_file"
  | "no_usable_text"
  | "ocr_required"
  | "unsupported_format"
  | "provider_failure"
  | "invalid_provider_response"
  | "schema_incompatible"
  | "timeout";

export interface ProcessingVersions {
  extractionVersion: string;
  inferenceVersion: string;
  embeddingVersion: string;
  matchingVersion: string;
  promptVersion: string;
  modelVersion: string;
}

export interface SourceLocator {
  documentId: UUID;
  blockId: string;
  page: number | null;
  quotedText: string;
}

export type EvidenceKind =
  | "identity"
  | "experience"
  | "education"
  | "certification"
  | "language"
  | "competency_explicit"
  | "professional_context";

export interface Evidence {
  id: UUID;
  organizationId: UUID;
  personId: UUID;
  documentId: UUID;
  kind: EvidenceKind;
  fact: string;
  locator: SourceLocator;
  extractionVersion: string;
  createdAt: string;
}

export interface Inference {
  id: UUID;
  organizationId: UUID;
  personId: UUID;
  type: "competency" | "professional_context";
  value: string;
  rationale: string;
  evidenceIds: UUID[];
  inferenceVersion: string;
  createdAt: string;
}

export interface Experience {
  organization: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  evidenceIds: UUID[];
}

export interface EducationItem {
  institution: string;
  course: string;
  status: string | null;
  evidenceIds: UUID[];
}

export interface LanguageItem {
  language: string;
  proficiency: string | null;
  evidenceIds: UUID[];
}

export interface CompetencySignal {
  normalizedName: string;
  classification: "explicit" | "inferred";
  evidenceIds: UUID[];
  contexts: string[];
}

export interface CustomProfileSection {
  id: string;
  name: string;
  format: "text" | "list";
  source: "extracted" | "human";
  items: Array<{ id: string; value: string }>;
}

export interface ProfessionalProfile {
  id: UUID;
  organizationId: UUID;
  personId: UUID;
  fullName: string;
  experiences: Experience[];
  education: EducationItem[];
  certifications: string[];
  languages: LanguageItem[];
  toolsAndTechnologies: string[];
  competencies: CompetencySignal[];
  professionalContexts: string[];
  customSections: CustomProfileSection[];
  evidenceIds: UUID[];
  inferenceIds: UUID[];
  uncertainties: string[];
  notIdentified: string[];
  versions: ProcessingVersions;
  createdAt: string;
}

export interface Person {
  id: UUID;
  organizationId: UUID;
  fullName: string;
  createdAt: string;
}

export interface DocumentFailure {
  category: FailureCategory;
  reason: string;
  technicalMessage: string;
  occurredAt: string;
  pipelineVersion: string;
  canReprocess: boolean;
}

export interface ResumeDocument {
  id: UUID;
  organizationId: UUID;
  personId: UUID | null;
  filename: string;
  mediaType: string;
  checksum: string;
  status: DocumentStatus;
  sourceText: string | null;
  failure: DocumentFailure | null;
  extractionVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionDraft {
  fullName: string | null;
  experiences: Array<Omit<Experience, "evidenceIds"> & { sourceBlockId: string }>;
  education: Array<Omit<EducationItem, "evidenceIds"> & { sourceBlockId: string }>;
  certifications: Array<{ value: string; sourceBlockId: string }>;
  languages: Array<Omit<LanguageItem, "evidenceIds"> & { sourceBlockId: string }>;
  explicitCompetencies: Array<{ value: string; sourceBlockId: string; context: string | null }>;
  professionalContexts: Array<{ value: string; sourceBlockId: string }>;
  customSections: CustomProfileSection[];
  uncertainties: string[];
  notIdentified: string[];
}

export type ConfidenceLevel = "corroborated" | "supported" | "limited";

export interface ConfidenceExplanation {
  level: ConfidenceLevel;
  independentEvidenceCount: number;
  contextualEvidenceCount: number;
  contradictionCount: number;
  reasons: string[];
}

export interface SearchResult {
  personId: UUID;
  profileId: UUID;
  fullName: string;
  matchedConcepts: string[];
  missingConcepts: string[];
  evidence: Evidence[];
  inferences: Inference[];
  explanation: string;
  confidence: ConfidenceExplanation;
}

export interface VacancyRequirement {
  id: string;
  label: string;
  competency: string;
  importance: "required" | "desired";
  transferableCompetencies: string[];
  targetLevel?: "basic" | "intermediate" | "advanced";
  criticality?: "low" | "medium" | "high" | "critical";
  verificationPolicyRequirement?: "none" | "optional" | "recommended" | "required_by_policy";
}

export interface Vacancy {
  id: UUID;
  organizationId: UUID;
  roleName: string;
  requirements: VacancyRequirement[];
}

export type RequirementAssessmentStatus = "met" | "partially_met" | "no_evidence";

export interface RequirementAssessment {
  requirementId: string;
  label: string;
  importance: "required" | "desired";
  status: RequirementAssessmentStatus;
  evidence: Evidence[];
  inferences: Inference[];
  explanation: string;
  confidence: ConfidenceExplanation;
  verificationSufficiency?: {
    status:
      | "sufficient"
      | "verification_optional"
      | "verification_recommended"
      | "verification_required_by_policy"
      | "insufficient_information";
    reasonCodes: string[];
    requirement: "none" | "optional" | "recommended" | "required_by_policy";
    engineVersion: string;
    evaluatedAt: string;
    explanation: string;
  };
}

export interface MatchEvaluation {
  id: UUID;
  organizationId: UUID;
  personId: UUID;
  vacancyId: UUID;
  requirements: RequirementAssessment[];
  metRequirements: string[];
  partiallyMetRequirements: string[];
  requirementsWithoutEvidence: string[];
  gaps: string[];
  transferableCompetencies: string[];
  uncertainties: string[];
  sufficiency: "sufficient_evidence" | "insufficient_evidence";
  matchingVersion: string;
  createdAt: string;
}

export interface ProcessingEvent {
  processId: UUID;
  organizationId: UUID;
  documentId: UUID | null;
  stage: string;
  durationMs: number;
  provider: string;
  model: string;
  version: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number;
  result: "success" | "failure";
  errorCategory: FailureCategory | null;
  createdAt: string;
}

export interface PersistedData {
  people: Person[];
  documents: ResumeDocument[];
  profiles: ProfessionalProfile[];
  evidence: Evidence[];
  inferences: Inference[];
  matches: MatchEvaluation[];
  processingEvents: ProcessingEvent[];
}
