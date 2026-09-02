import { presentDocument, type PresentationTone } from "./documentPresentation.js";
import type {
  PersonDocumentTimelineItem,
  PersonIngestionWorkspace,
  ProfileVersionView,
  StructuredDraft,
} from "./personIngestion.js";

export const PERSON_ACTION_CENTER_VERSION = "1.0.0";

export type PersonPendingActionType = "review_document" | "reprocess_document";
export type PersonPendingActionPriority = "blocking" | "human_action" | "informational";
export type PersonActionKind = "review" | "reprocess" | "open_document" | "open_details" | "discard";

export interface PersonActionTarget {
  kind: PersonActionKind;
  label: string;
  available: boolean;
}

export interface PersonPendingAction {
  id: string;
  type: PersonPendingActionType;
  priority: PersonPendingActionPriority;
  tone: "warning" | "danger";
  title: string;
  description: string;
  createdAt: string;
  document: PersonDocumentTimelineItem;
  primaryAction: PersonActionTarget | null;
  secondaryActions: PersonActionTarget[];
}

export interface PersonCenterSummary {
  documents: {
    total: number;
    published: number;
    awaitingReview: number;
    processing: number;
  };
  experiences: number;
  education: number;
  competencies: number;
}

export interface PersonRecentActivity {
  id: string;
  kind: "profile" | "document";
  title: string;
  description: string;
  occurredAt: string;
  tone: PresentationTone;
}

export interface PersonCenterViewModel {
  identity: {
    fullName: string;
    professionalTitle: string | null;
    location: string | null;
    updatedAt: string;
    documentCount: number;
  };
  currentProfile: {
    id: string;
    version: number;
    publishedAt: string;
    sourceDocumentName: string | null;
  } | null;
  pendingActions: PersonPendingAction[];
  summary: PersonCenterSummary;
  professionalKnowledge: StructuredDraft | null;
  documents: PersonDocumentTimelineItem[];
  recentDocuments: PersonDocumentTimelineItem[];
  recentActivity: PersonRecentActivity[];
}

export function derivePersonPendingActions(documents: PersonDocumentTimelineItem[]): PersonPendingAction[] {
  return documents
    .flatMap((document): PersonPendingAction[] => {
      const presentation = presentDocument(document);
      const commonSecondary: PersonActionTarget[] = [
        { kind: document.verificationReviewId ? "open_document" : "open_details", label: document.verificationReviewId ? "Ver documento" : "Detalhes técnicos", available: true },
        { kind: "discard", label: "Descartar importação", available: true },
      ];

      if (presentation.state === "requires_review") {
        const reviewAvailable = Boolean(document.reviewAttempt);
        return [{
          id: `review:${document.id}`,
          type: "review_document",
          priority: "human_action",
          tone: "warning",
          title: "Nova importação requer revisão",
          description: "O Prisma recuperou informações deste documento, mas alguns pontos precisam de revisão humana antes da publicação de uma nova versão do Perfil.",
          createdAt: document.processedAt ?? document.createdAt,
          document,
          primaryAction: { kind: "review", label: "Revisar documento agora", available: reviewAvailable },
          secondaryActions: commonSecondary,
        }];
      }

      if (presentation.state === "technical_failure") {
        const attempt = document.latestAttempt;
        const reprocessAvailable = Boolean(attempt && attempt.pagesNative + attempt.pagesOcr > 0);
        return [{
          id: `technical:${document.id}`,
          type: "reprocess_document",
          priority: "blocking",
          tone: "danger",
          title: "Importação interrompida por falha técnica",
          description: "O documento e o Perfil vigente permanecem preservados. Consulte os detalhes e reprocese somente quando houver uma fonte recuperável.",
          createdAt: document.processedAt ?? document.createdAt,
          document,
          primaryAction: reprocessAvailable ? { kind: "reprocess", label: "Reprocessar documento", available: true } : null,
          secondaryActions: commonSecondary,
        }];
      }

      return [];
    })
    .sort((left, right) => {
      const priority = { blocking: 0, human_action: 1, informational: 2 } as const;
      return priority[left.priority] - priority[right.priority] || right.createdAt.localeCompare(left.createdAt);
    });
}

export function buildPersonCenterViewModel(
  workspace: PersonIngestionWorkspace,
  currentProfileVersion: ProfileVersionView | null,
): PersonCenterViewModel {
  const knowledge = currentProfileVersion?.profileData ?? null;
  const pendingActions = derivePersonPendingActions(workspace.documents);
  const location = [workspace.person.privateData.city, workspace.person.privateData.countryCode]
    .filter(Boolean)
    .join(", ") || null;
  const profile = workspace.person.currentProfile;

  return {
    identity: {
      fullName: workspace.person.fullName,
      professionalTitle: knowledge?.professionalTitle?.trim() || null,
      location,
      updatedAt: profile?.approvedAt ?? profile?.createdAt ?? workspace.person.updatedAt,
      documentCount: workspace.documents.length,
    },
    currentProfile: profile ? {
      id: profile.id,
      version: profile.profileVersion,
      publishedAt: profile.approvedAt ?? profile.createdAt,
      sourceDocumentName: workspace.documents.find((document) => document.id === profile.sourceDocumentId)?.filename ?? null,
    } : null,
    pendingActions,
    summary: {
      documents: {
        total: workspace.documents.length,
        published: workspace.documents.filter((document) => document.profileVersion !== null).length,
        awaitingReview: pendingActions.filter((action) => action.type === "review_document").length,
        processing: workspace.documents.filter((document) => presentDocument(document).state === "processing").length,
      },
      experiences: knowledge?.experiences.length ?? 0,
      education: knowledge?.education.length ?? 0,
      competencies: knowledge?.competencies.length ?? 0,
    },
    professionalKnowledge: knowledge,
    documents: workspace.documents,
    recentDocuments: workspace.documents.slice(0, 4),
    recentActivity: deriveRecentActivity(workspace).slice(0, 5),
  };
}

function deriveRecentActivity(workspace: PersonIngestionWorkspace): PersonRecentActivity[] {
  const profileActivity: PersonRecentActivity[] = workspace.person.currentProfile ? [{
    id: `profile:${workspace.person.currentProfile.id}`,
    kind: "profile",
    title: `Perfil v${workspace.person.currentProfile.profileVersion} publicado`,
    description: "Esta versão permanece vigente até que outra publicação seja concluída.",
    occurredAt: workspace.person.currentProfile.approvedAt ?? workspace.person.currentProfile.createdAt,
    tone: "success",
  }] : [];
  const documentActivity: PersonRecentActivity[] = workspace.documents.map((document) => {
    const presentation = presentDocument(document);
    return {
      id: `document:${document.id}`,
      kind: "document" as const,
      title: `${document.filename} · ${presentation.label}`,
      description: presentation.description,
      occurredAt: document.processedAt ?? document.createdAt,
      tone: presentation.tone,
    };
  });
  return [...profileActivity, ...documentActivity].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
