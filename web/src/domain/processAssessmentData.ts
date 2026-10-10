import type { AssessmentAttempt, PositionAssessment } from './positionAssessmentData';
export interface ProcessAssessmentWorkspace {
 contract:'process-assessment-1.0.0'; organizationId:string; vacancyId:string; positionVersionId:string; positionTitle:string;
 process:{id:string;name:string;status:'active'|'closed';revision:number;isCurrent:boolean}; assessment:PositionAssessment|null;
 requirements:PositionAssessment['requirements']; candidates:Array<{personId:string;name:string;email:string|null;stage:string;active:boolean}>;
 attempts:Array<AssessmentAttempt & {personId:string}>;
 reusable:Array<{id:string;processName:string;quantity:number;durationMinutes:number}>;
 legacy:Array<{id:string;personId:string;status:string;createdAt:string}>;
}
