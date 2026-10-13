import {test} from "node:test";
import assert from "node:assert/strict";
import {buildActivityFacts,activityDuration,validateActivitySelection,type ActivityEvent} from "../src/domain/assessmentActivityAnalysis.js";
const questions=Array.from({length:20},(_,i)=>({id:"q"+(i+1),version:"v1"}));
function event(id:number,n:number,kind:string,payload:Record<string,unknown>):ActivityEvent{return {id,question_id:"q"+n,question_version:"v1",kind,client_at_ms:1791894360000+id,received_at:"2026-10-13T12:26:00Z",sequence:id,method:"fixture",payload};}
test("same screenshot pattern over full twenty-question scope has exact totals and references, not fraud or intent",()=>{
 const events=[event(1,1,"focus_episode",{durationMs:10000}),event(2,2,"focus_episode",{durationMs:10000}),event(3,2,"focus_episode",{durationMs:9000}),event(4,3,"focus_episode",{durationMs:9000}),event(5,4,"focus_episode",{durationMs:7000}),event(6,5,"focus_episode",{durationMs:12000}),event(7,5,"focus_episode",{durationMs:12000}),...[11000,9000,3000,3000,5000].map((total,i)=>event(8+i,i+1,"mouse_idle_before_first_choice",{totalIdleMs:total,longestIdleMs:i?2000:3000,support:"observed_mouse"}))];
 const facts=buildActivityFacts(questions,events);
 assert.equal(facts.questionCount,20);assert.equal(facts.questionsWithEvents,5);assert.equal(facts.focusCount,7);assert.equal(facts.focusMs,69000);assert.equal(facts.mouseMs,31000);assert.equal(facts.longestMouseMs,3000);
 assert.deepEqual(facts.patterns.find(p=>p.id==="focus_same_question")?.questionNumbers,[2,5]);assert.deepEqual(facts.patterns.find(p=>p.id==="focus_largest_total")?.eventIds,[6,7]);
 assert.equal(activityDuration(69000),"1 minuto e 9 segundos");assert.equal(facts.captureCount,0);
 assert.ok(!facts.patterns.some(p=>/suspeit|fraude|consultou|trapaça/.test(p.title+p.description)));
});
test("missing, zero, not applicable and invalid durations cannot become invented observations",()=>{
 assert.equal(activityDuration(null),"Informação indisponível");assert.equal(activityDuration(0),"0 segundos");assert.equal(activityDuration(200),"menos de 1 segundo");
 const missing=buildActivityFacts(questions,[]);assert.equal(missing.focusMs,null);assert.equal(missing.mouseMs,null);assert.equal(missing.questionsWithEvents,0);
 const facts=buildActivityFacts(questions,[event(1,1,"focus_episode",{}),event(2,2,"mouse_idle_before_first_choice",{support:"not_applicable",totalIdleMs:0}),event(3,3,"mouse_idle_before_first_choice",{support:"observed_mouse",totalIdleMs:0,longestIdleMs:0})]);
 assert.equal(facts.focusMs,null);assert.equal(facts.rows[1]?.mouseNotApplicable,true);assert.equal(facts.rows[1]?.mouseMs,null);assert.equal(facts.rows[2]?.mouseMs,0);
 assert.equal(buildActivityFacts(questions,[event(1,1,"focus_episode",{durationMs:-1})]).focusMs,null);
});
test("foreign version, detached event, duplicates and invalid timestamps are excluded explicitly",()=>{
 const e=event(1,1,"focus_episode",{durationMs:1000});const facts=buildActivityFacts(questions,[e,e,{...event(2,2,"focus_episode",{durationMs:99000}),question_version:"other"},{...event(3,3,"focus_episode",{}),client_at_ms:Infinity},event(4,99,"focus_episode",{durationMs:88888})]);
 assert.equal(facts.focusMs,1000);assert.equal(facts.unmatchedEventCount,2);assert.equal(facts.invalidEventCount,2);assert.equal(facts.eventCount,1);
});
test("AI can organize only supported patterns and approved neutral contexts, never free text or invented evidence",()=>{
 const facts=buildActivityFacts(questions,[event(1,1,"focus_episode",{durationMs:1000})]);
 assert.deepEqual(validateActivitySelection({patternIds:["focus_occurrences"],contextIds:["focus","missing"]},facts),{patternIds:["focus_occurrences"],contextIds:["focus","missing"]});
 for(const value of [{patternIds:["capture_shortcuts"],contextIds:["focus"]},{patternIds:["focus_occurrences","focus_occurrences"],contextIds:["focus"]},{patternIds:["focus_occurrences"],contextIds:["fraud"]},{patternIds:[],contextIds:["focus"]},{patternIds:["focus_occurrences"],contextIds:[]},{patternIds:["focus_occurrences"],contextIds:["focus"],summary:"suspeito"}])assert.throws(()=>validateActivitySelection(value,facts));
 assert.deepEqual(validateActivitySelection({patternIds:[],contextIds:["missing"]},buildActivityFacts(questions,[])),{patternIds:[],contextIds:["missing"]});
 const repeated=buildActivityFacts(questions,[event(1,1,"focus_episode",{durationMs:1000}),event(2,1,"focus_episode",{durationMs:1000})]);
 assert.throws(()=>validateActivitySelection({patternIds:["focus_occurrences"],contextIds:["focus"]},repeated));
});
