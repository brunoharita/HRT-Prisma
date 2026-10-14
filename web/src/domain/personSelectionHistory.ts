import type { FollowUpStage } from "./positionFollowUp";
import type { SelectionOutcome } from "./selectionOutcome";
export interface PersonSelectionTest {
  organizationId:string;personId:string;id:string;vacancyId:string;positionTitle:string;createdAt:string;durationMinutes:number;attemptId:string|null;
  status:string;expiresAt:string|null;startedAt:string|null;submittedAt:string|null;correct:number|null;total:number|null;
}
export interface PersonSelectionParticipation {
  organizationId:string;personId:string;entryId:string;processId:string;processName:string;processStatus:"active"|"closed";
  vacancyId:string;title:string;stage:FollowUpStage;joinedAt:string;processCreatedAt:string;outcome:SelectionOutcome|null;tests:PersonSelectionTest[];
}
export interface PersonSelectionHistory {
  contract:"person-selection-history-1.0.0";organizationId:string;personId:string;participations:PersonSelectionParticipation[];total:number;pageSize:50;legacyTests:PersonSelectionTest[];
}
