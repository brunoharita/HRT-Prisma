import {buildActivityFacts,ACTIVITY_ANALYSIS_VERSION,ACTIVITY_ANALYSIS_METHOD_VERSION,type ActivityEvent} from "../../../src/domain/assessmentActivityAnalysis.js";
import type {AssessmentDifficulty} from '../../../src/domain/positionAssessment.js';
const id=(n:number)=>"25200000-0000-4000-8000-"+String(n).padStart(12,"0");
export const org=id(1),attemptId=id(2);
export const questions=Array.from({length:20},(_,i)=>({id:id(100+i),version:"fixture",organizationId:org,requirementId:id(5),competencyKey:"APIs",difficulty:"easy" as AssessmentDifficulty,language:"pt-BR",stem:"Qual alternativa representa a operação indicada?",options:["A","B","C","D","E"].map(id=>({id,label:"Alternativa "+id})),correctOptionId:"A",explanation:"Explicação sintética.",source:"bank" as const,review:"approved" as const,provenance:{method:"fixture",version:"fixture",authorId:null}}));
const event=(id:number,q:number,kind:string,payload:Record<string,unknown>):ActivityEvent=>({id,question_id:questions[q-1]!.id,question_version:"fixture",kind,client_at_ms:1791894360000+id*1000,received_at:"2026-10-13T12:26:06Z",sequence:id,method:"fixture-1.0.0",payload});
export const events=[event(1,1,"focus_episode",{durationMs:10000,closedBy:"focus_returned"}),event(2,2,"focus_episode",{durationMs:10000,closedBy:"focus_returned"}),event(3,2,"focus_episode",{durationMs:9000,closedBy:"question_changed"}),event(4,3,"focus_episode",{durationMs:9000,closedBy:"focus_returned"}),event(5,4,"focus_episode",{durationMs:6969.5,closedBy:"focus_returned",startedAtClientMs:1791894359699.2998,endedAtClientMs:1791894366668.7998}),event(6,5,"focus_episode",{durationMs:12000,closedBy:"focus_returned"}),event(7,5,"focus_episode",{durationMs:12000,closedBy:"focus_returned"}),...[11000,9000,3000,3184,5000].map((total,n)=>event(8+n,n+1,"mouse_idle_before_first_choice",{totalIdleMs:total,longestIdleMs:n===3?1201:n===0?3000:2000,support:"observed_mouse",closedBy:"first_choice",resolutionMs:100})),event(13,6,"mouse_idle_before_first_choice",{totalIdleMs:null,longestIdleMs:null,support:"not_applicable",closedBy:"collector_stopped"})];
const mode=new URLSearchParams(location.search).get("mode");
if(mode==='timeline'){
 const base=1791894360000;
 events.splice(0);
 const add=(id:number,kind:string,time:number,payload:Record<string,unknown>)=>events.push({...event(id,1,kind,payload),client_at_ms:base+time});
 add(30,'question_displayed',0,{support:'observed_display',limitation:'display_does_not_confirm_reading'});
 add(31,'focus_episode',4000,{startedAtClientMs:base+1000,endedAtClientMs:base+4000,durationMs:3000,closedBy:'focus_returned'});
 add(32,'copy_action_observed',2000,{region:'stem',characterCount:12,trigger:'not_identified',support:'received_copy_event',limitation:'clipboard_result_and_destination_not_observable'});
 add(33,'answer_selected',6000,{optionId:'B',previousOptionId:null,support:'observed_choice',limitation:'choice_does_not_identify_intent'});
 add(34,'answer_changed',8000,{optionId:'A',previousOptionId:'B',support:'observed_choice',limitation:'choice_does_not_identify_intent'});
}
if(mode==='visual'){
 const topics=['APIs','Docker','Azure','Segurança','Banco de dados'],difficulties:AssessmentDifficulty[]=['easy','easy','hard','medium','easy','medium','hard','medium','easy','medium','hard','medium','easy','medium','hard','easy','easy','medium','medium','easy'];
 questions.forEach((q,i)=>{q.requirementId=id(50+Math.floor(i/4));q.competencyKey=topics[Math.floor(i/4)]!;q.difficulty=difficulties[i]!;});
 events.splice(0);let n=200;
 for(const [question,durations] of [[2,[8000]],[3,[10000,10000]],[7,[20000,14000]],[9,[6000]],[14,[10000,8000]],[16,[6000]]] as Array<[number,number[]]>)for(const durationMs of durations)events.push(event(++n,question,'focus_episode',{durationMs,closedBy:'focus_returned'}));
 for(let q=1;q<=20;q++)events.push(event(++n,q,'mouse_idle_before_first_choice',{totalIdleMs:({1:12000,6:20000,10:8000,14:16000,19:14000} as Record<number,number>)[q]??0,longestIdleMs:q===6?12000:0,support:'observed_mouse',closedBy:'first_choice'}));
 for(const q of [7,14])events.push(event(++n,q,'answer_changed',{support:'observed',limitation:'no_intent_inference'}));
}
if(mode==="content")events.push(event(101,2,"text_selection_observed",{region:"stem",characterCount:12,support:"observed_selection",limitation:"selection_does_not_confirm_copy"}),event(102,2,"copy_action_observed",{region:"stem",characterCount:12,trigger:"keyboard_correlated",support:"received_copy_event",limitation:"clipboard_result_and_destination_not_observable"}),event(103,2,"context_menu_observed",{region:"options",characterCount:0,support:"received_context_menu",limitation:"menu_does_not_confirm_copy"}));
export const fixture={calls:[] as Array<{action:string;body:unknown}>,fail:false,deny:false,hold:false,mode,analysis:null as any};
const facts=buildActivityFacts(questions,mode==="empty"?[]:mode==="new-events"?[...events,event(14,2,"focus_episode",{durationMs:1000,closedBy:"focus_returned"})]:events);
function saved(){if(mode==="legacy"){delete facts.copyCount;delete facts.selectionCount;delete facts.contextMenuCount;for(const row of facts.rows){delete row.copyCount;delete row.selectionCount;delete row.contextMenuCount;}}return {id:id(30),organizationId:org,attemptId,attemptStatus:"submitted",status:"succeeded",inputFingerprint:"a".repeat(64),stale:mode==="stale"||mode==="legacy",methodVersion:mode==="legacy"?ACTIVITY_ANALYSIS_VERSION:ACTIVITY_ANALYSIS_METHOD_VERSION,model:"gpt-5.6-luna",createdAt:"2026-10-13T12:30:00Z",completedAt:"2026-10-13T12:30:01Z",facts,selection:{patternIds:facts.patterns.map(p=>p.id),contextIds:mode==="content"?["focus","mouse","missing","copy"]:["focus","mouse","missing"]},errorCategory:null};}
if(mode==="cache"||mode==="stale"||mode==="content"||mode==="legacy"||mode==='visual')fixture.analysis=saved();
(window as any).__activityFixture=fixture;
const gate=async()=>{while(fixture.hold)await new Promise(r=>setTimeout(r,30));};
export const supabase={
 rpc(name:string,args:any){const run=async()=>{
  fixture.calls.push({action:name,body:args});await gate();
  if(fixture.deny)return {data:null,error:{code:"42501",message:"PT_ACCESS_DENIED"}};
  if(name==="assessment_activity_analysis_load")return {data:{contract:ACTIVITY_ANALYSIS_VERSION,organizationId:args.p_organization_id,attemptId:args.p_attempt_id,inputFingerprint:"a".repeat(64),analysis:fixture.analysis,previousAnalysis:null},error:null};
  if(name==="prisma_tokens")return {data:{contract:"prisma-token-quote-1.0.0",organizationId:args.p_organization_id,id:id(40),functionName:"assessment_activity_analysis",quantity:1,tokensPerUnit:1234,amount:1234,available:mode==="balance"?10:1000000,expiresAt:new Date(Date.now()+600000).toISOString()},error:null};
  throw Error("Unexpected RPC "+name);
 };const task=run();return {then:task.then.bind(task),abortSignal:()=>task};
 },
 functions:{async invoke(_name:string,{body}:{body:any}){fixture.calls.push({action:"analyze_activity",body});await gate();if(fixture.fail){fixture.analysis={...saved(),status:"running",facts:null,selection:null};return {data:null,error:Error("Unconfirmed transport")};}fixture.analysis=saved();return {data:{contract:ACTIVITY_ANALYSIS_VERSION,organizationId:body.organizationId,attemptId:body.attemptId,analysis:fixture.analysis},error:null};}}
};
