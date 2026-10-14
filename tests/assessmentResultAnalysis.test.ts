import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildActivityFacts} from '../src/domain/assessmentActivityAnalysis.js';
import {attemptElapsed,filterResultRows,resultGroups,resultMeasure,resultRows} from '../web/src/shared/assessmentResultAnalysis.js';
import type {ContextualAssessmentQuestion} from '../src/domain/positionAssessment.js';
const questions:ContextualAssessmentQuestion[]=Array.from({length:5},(_,n)=>({organizationId:'org',id:'q'+n,version:'v1',requirementId:n<3?'topic-a':'topic-b',competencyKey:'Mesmo rótulo',difficulty:n<2?'easy':'hard',language:'pt-BR',stem:'Questão de fixture',options:['A','B','C','D','E'].map(id=>({id,label:id})),correctOptionId:'A',explanation:'Fixture',source:'bank',review:'approved',provenance:{method:'fixture',version:'v1',authorId:null}}));
const answers={q0:'A',q1:'B',q2:'A',q3:'B',q4:'A'};
const events=[{id:1,question_id:'q4',question_version:'v1',kind:'focus_episode',method:'fixture',client_at_ms:1000,received_at:'2026-10-13T12:00:00Z',sequence:1,payload:{durationMs:12000}},{id:2,question_id:'q4',question_version:'other',kind:'focus_episode',method:'fixture',client_at_ms:2000,received_at:'2026-10-13T12:00:00Z',sequence:2,payload:{durationMs:999999}}];
const facts=buildActivityFacts(questions,events);
test('groups by official requirement identity and assigned difficulty, preserves unequal denominators',()=>{
 const rows=resultRows(questions,answers,true,[],facts),byTopic=resultGroups(rows,'topic'),byDifficulty=resultGroups(rows,'difficulty');
 assert.deepEqual(byTopic.map(g=>[g.key,g.rows.length,resultMeasure(g.rows,'correct')]),[['topic-a',3,2],['topic-b',2,1]]);
 assert.deepEqual(byDifficulty.map(g=>[g.key,g.rows.length,resultMeasure(g.rows,'correct')]),[['easy',2,1],['hard',3,2]]);
});
test('combined filters preserve original numbers and immutable results/events; foreign version excluded',()=>{
 const before=JSON.stringify({questions,answers,events,facts}),rows=resultRows(questions,answers,true,[],facts);
 const selected=filterResultRows(rows,{topic:'topic-b',difficulty:'hard',outcome:'correct'});
 assert.deepEqual(selected.map(r=>r.number),[5]);assert.equal(resultMeasure(selected,'focusTime'),12000);assert.equal(resultMeasure(selected,'focus'),1);
 assert.equal(resultMeasure(rows,'correct'),3);assert.equal(JSON.stringify({questions,answers,events,facts}),before);
});
test('unknown answers, incomplete attempts, no focus duration and response time stay unavailable',()=>{
 const rows=resultRows(questions,{},true,[],facts);assert.equal(resultMeasure(rows,'correct'),null);
 assert.equal(filterResultRows(rows,{topic:'',difficulty:'',outcome:'incorrect'}).length,0);
 assert.equal(resultMeasure(resultRows(questions,answers,false,[],facts),'correct'),null);
 assert.equal(resultMeasure(rows.slice(0,3),'focusTime'),null);assert.equal(resultMeasure(rows,'responseTime'),null);assert.equal(resultMeasure([],'correct'),null);
 const missing=buildActivityFacts(questions,[{...events[0]!,payload:{}}]);assert.equal(resultMeasure(resultRows(questions,answers,true,[],missing),'focusTime'),null);
 const zero=buildActivityFacts(questions,[{...events[0]!,payload:{durationMs:0}}]);assert.equal(resultMeasure(resultRows(questions,answers,true,[],zero),'focusTime'),0);
});
test('elapsed requires valid persisted boundaries and never divides the whole attempt into response times',()=>{
 assert.equal(attemptElapsed('2026-10-13T12:00:00Z','2026-10-13T12:18:40Z'),1120000);
 assert.equal(attemptElapsed(undefined,'2026-10-13T12:18:40Z'),null);assert.equal(attemptElapsed('invalid','invalid'),null);assert.equal(attemptElapsed('2026-10-13T12:18:40Z','2026-10-13T12:00:00Z'),null);
});
