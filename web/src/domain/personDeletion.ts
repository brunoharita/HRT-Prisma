export const PERSON_DELETION_REQUEST_VERSION = "person-data-deletion-request-1.0.0";

export interface PersonDeletionImpactSummary {
  documents: number;
  profiles: number;
  reviews: number;
  matching: number;
  verifications: number;
  assessmentAttempts: number;
  knowledgeProvenances: number;
  storageObjects: number;
}

export interface PersonDeletionPreview {
  personId: string;
  personName: string;
  preflightFingerprint: string;
  impactSummary: PersonDeletionImpactSummary;
}

export interface PersonSelfServicePreview {
  personName: string;
  preflightFingerprint: string;
  impactSummary: PersonDeletionImpactSummary;
  expiresAt: string;
}

export interface PersonSelfServiceLink {
  relativePath: string;
  expiresAt: string;
  reused: boolean;
}

export function normalizePersonDeletionImpact(value: unknown): PersonDeletionImpactSummary {
  const item = isRecord(value) ? value : {};
  return {
    documents: number(item.documents),
    profiles: number(item.profiles),
    reviews: number(item.reviews),
    matching: number(item.matching),
    verifications: number(item.verifications),
    assessmentAttempts: number(item.assessmentAttempts),
    knowledgeProvenances: number(item.knowledgeProvenances),
    storageObjects: number(item.storageObjects),
  };
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
