import assert from 'node:assert/strict';
import {test} from 'node:test';
import {activityInterval,chronologicalActivity,responseChoice} from '../src/domain/assessmentTimeline.js';
import {buildActivityFacts,type ActivityEvent} from '../src/domain/assessmentActivityAnalysis.js';
const event=(id:number,kind:string,time:number,payload:Record<string,unknown>={}):ActivityEvent=>({id,kind,client_at_ms:time,payload,question_id:'q',question_version:'v',sequence:id,method:'fixture',received_at:'2026-10-14T12:00:00Z'});

test('interval starts determine chronological presentation while facts and original sequence remain unchanged',()=>{
 const events=[event(1,'copy_action_observed',200,{region:'stem'}),event(2,'focus_episode',400,{startedAtClientMs:100,endedAtClientMs:400,durationMs:300}),event(3,'answer_selected',500,{optionId:'B'})];
 const before=structuredClone(events),facts=buildActivityFacts([{id:'q',version:'v'}],events);
 assert.deepEqual(chronologicalActivity(events).map(e=>e.id),[2,1,3]);assert.deepEqual(events,before);
 assert.equal(facts.focusMs,300);assert.deepEqual(facts.rows[0]!.events.map(e=>e.id),[1,2,3]);
 assert.deepEqual(activityInterval(events[1]!),{start:100,end:400});
});
test('legacy or invalid intervals use the observed record time; summaries never invent intervals',()=>{
 for(const payload of [{},{startedAtClientMs:20,endedAtClientMs:10},{startedAtClientMs:-1,endedAtClientMs:20},{startedAtClientMs:NaN,endedAtClientMs:20}])assert.equal(activityInterval(event(1,'focus_episode',30,payload)),null);
 assert.equal(activityInterval(event(2,'mouse_idle_before_first_choice',40,{startedAtClientMs:1,endedAtClientMs:40})),null);
 const a=event(3,'answer_changed',100),b=event(2,'question_displayed',100);a.sequence=b.sequence=1;
 assert.deepEqual(chronologicalActivity([a,b]).map(e=>e.id),[2,3]);
});
test('first choice, changed choice and repeated identical choice preserve explicit option metadata only',()=>{
 assert.deepEqual(responseChoice(undefined,'B'),{kind:'answer_selected',values:{optionId:'B',previousOptionId:null,support:'observed_choice',limitation:'choice_does_not_identify_intent'}});
 assert.deepEqual(responseChoice('B','A'),{kind:'answer_changed',values:{optionId:'A',previousOptionId:'B',support:'observed_choice',limitation:'choice_does_not_identify_intent'}});
 assert.equal(responseChoice('A','A'),null);
});
