import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentPerformance,assessmentResultRows,savedAssessmentPrismaScore} from '../web/src/shared/processAssessmentResults.js';
import type {ProcessAssessmentWorkspace} from '../web/src/domain/processAssessmentData.js';
import type {AssessmentAttempt} from '../web/src/domain/positionAssessmentData.js';
import type {FollowUpEntry} from '../web/src/domain/positionFollowUp.js';
function attempt(id:string,correct:number|null,total=20,status='submitted'):AssessmentAttempt&{personId:string}{return {id,personId:id,assessmentId:'assessment',status,expiresAt:'2026-12-01',submittedAt:null,answers:{},result:correct===null?null:{correct,total,requirements:[]},deliveries:[],events:[]};}
function workspace(attempts:ReturnType<typeof attempt>[]):ProcessAssessmentWorkspace{return {assessment:{id:'assessment',questions:Array(20).fill({})},candidates:attempts.map(t=>({personId:t.id,name:t.id})),attempts} as ProcessAssessmentWorkspace;}
test('performance order uses exact assessment proportions, ties by name and preserves zero before unavailable',()=>{
 const input=workspace([attempt('Z',null),attempt('Zero',0),attempt('B',17),attempt('A',17),attempt('High',20),attempt('Partial',20,20,'started')]);
 const before=JSON.stringify(input);assert.deepEqual(assessmentResultRows(input).map(r=>r.name),['High','A','B','Zero','Partial','Z']);assert.equal(JSON.stringify(input),before);
});
test('only concluded persisted valid results belonging to this instrument produce performance',()=>{
 assert.equal(assessmentPerformance(attempt('ok',17),'assessment',20)?.percent,85);
 for(const t of [attempt('missing',null),attempt('negative',-1),attempt('too-many',21),attempt('fraction',0.5),attempt('empty',0,0),attempt('wrong-size',10,10),attempt('nan',NaN),attempt('partial',10,20,'started'),{...attempt('foreign',10),assessmentId:'other'}])assert.equal(assessmentPerformance(t,'assessment',20),null);
});
const entry={score:0,scoreState:'saved',profileId:'p',scoreProfileId:'p',scorePositionId:'v',match:null} as FollowUpEntry;
test('saved Prisma zero is valid; unavailable and malformed scores remain unknown',()=>{
 assert.equal(savedAssessmentPrismaScore(entry,'v')?.value,0);
 for(const score of [null,NaN,Infinity,-1,101,'80'])assert.equal(savedAssessmentPrismaScore({...entry,score} as FollowUpEntry,'v'),null);
 assert.equal(savedAssessmentPrismaScore({...entry,scoreState:'unavailable'},'v'),null);
});
test('Prisma state and provenance warnings remain independent from assessment order',()=>{
 const score=savedAssessmentPrismaScore({...entry,score:72,scoreState:'update_failed',match:{score:{status:'provisional'}}},'changed');
 assert.equal(score?.value,72);assert.equal(score?.notices.length,3);
 assert.match(savedAssessmentPrismaScore({...entry,scoreState:'updating'},'v')!.notices[0]!,/nota anterior/);
 assert.match(savedAssessmentPrismaScore({...entry,scoreProfileId:null},'v')!.notices[0]!,/indisponíveis/);
});
