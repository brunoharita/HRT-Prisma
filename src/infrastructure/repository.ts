import type {
  Evidence,
  Inference,
  MatchEvaluation,
  PersistedData,
  Person,
  ProcessingEvent,
  ProfessionalProfile,
  ResumeDocument,
} from "../domain/types.js";

export interface TalentRepository {
  saveDocument(document: ResumeDocument): Promise<void>;
  saveProcessingResult(input: {
    person: Person;
    document: ResumeDocument;
    profile: ProfessionalProfile;
    evidence: Evidence[];
    inferences: Inference[];
  }): Promise<void>;
  saveMatch(match: MatchEvaluation): Promise<void>;
  appendProcessingEvent(event: ProcessingEvent): Promise<void>;
  listProfiles(organizationId: string): Promise<ProfessionalProfile[]>;
  listEvidence(organizationId: string): Promise<Evidence[]>;
  listInferences(organizationId: string): Promise<Inference[]>;
  snapshot(organizationId: string): Promise<PersistedData>;
}
